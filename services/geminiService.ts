import { Part, Type } from "@google/genai";
import { getAiClient } from "./aiClient";

const planAndThinkSystemInstruction = `You are a highly intelligent router and planner. Your task is to analyze the user's prompt and determine the most effective strategy to respond.

**CRITICAL: Your primary goal is to distinguish between web search, URL reads, complex, simple, and special case prompts.**

**1. Web Search Triggers (needsWebSearch: true):**
Set 'needsWebSearch' to true for any query that:
- Requires up-to-the-minute information (e.g., "latest news", "today's weather", "who won the game").
- Involves current events, trending topics, or live data (e.g., sports scores, stock prices).
- Asks about specific people, companies, or products where recent information is critical.
- **Crucial Rule: If you are even slightly unsure whether your internal knowledge is up-to-date, it is ALWAYS better to perform a web search to provide the most accurate and current response.**

**2. URL Read Triggers (isUrlReadRequest: true):**
Set 'isUrlReadRequest' to true if the prompt contains a valid URL (e.g., http://, https://, www.) AND the user is asking a question ABOUT that URL (e.g., "summarize this page", "what are the key points of this article?").

**3. Image & File Analysis:**
- If an image is provided, determine the user's INTENT. If they ask to modify, change, or add to it, classify it as 'image edit'. Otherwise, it is not an 'edit' request.
- If a file is provided (e.g., PDF, TXT), your primary task is to analyze its content. Always set 'needsThinking' to true for file analysis.

**4. Complex Prompts (needsThinking: true):**
Set 'needsThinking' to true for any prompt that requires:
- Analysis, creativity, or brainstorming.
- Detailed explanations or multi-step reasoning.
- Writing code, creating a plan, or summarizing a long text.
- Analysis of a provided file (PDF, TXT, etc.).
- Any task that is not a simple conversational turn or a direct web search/URL read query.

**5. Simple Prompts (needsThinking: false):**
Set 'needsThinking' to false for low-complexity conversational prompts.

Based on the prompt, you must respond ONLY with a valid JSON object.

**JSON Schema:**
- **\`needsWebSearch\` (boolean):** True if the query requires up-to-date information.
- **\`isUrlReadRequest\` (boolean):** True if the prompt contains a URL to be read and analyzed.
- **\`needsThinking\` (boolean):** True for complex tasks, false for simple ones.
- **\`needsCodeContext\` (boolean):** True if prompt relates to previous code.
- **\`isImageGenerationRequest\` (boolean):** True if user asks to create an image (and no image is provided).
- **\`isImageEditRequest\` (boolean):** True if user provides an image and asks to modify it.
- **\`thoughts\` (array, optional):** If 'needsThinking' is true, provide a step-by-step thought process.
- **\`searchPlan\` (array, optional):** If 'needsWebSearch' is true, provide a step-by-step research plan.

**Structure for 'thoughts' and 'searchPlan' items:**
- Each item in the array is an object with 'phase', 'step', and 'concise_step' (3-5 words, ending in '-ing' for animations). The final 'concise_step' for 'thoughts' must be dynamic and end in '-ing' (e.g., 'Generating response...').`;

export interface ThoughtStep {
    phase: string;
    step: string;
    concise_step: string;
}
export interface ResponsePlan {
    needsWebSearch: boolean;
    isUrlReadRequest: boolean;
    needsThinking: boolean;
    needsCodeContext: boolean;
    isImageGenerationRequest: boolean;
    isImageEditRequest: boolean;
    thoughts: ThoughtStep[];
    searchPlan?: ThoughtStep[];
}

export const planResponse = async (prompt: string, image?: { base64: string; mimeType: string; }, file?: { base64: string; mimeType: string; name: string; }, model: string = 'gemini-2.5-flash'): Promise<ResponsePlan> => {
    const ai = getAiClient();
    try {
        const contentParts: Part[] = [{ text: prompt }];
        if (image) {
            contentParts.unshift({ text: `[User has attached an image]` });
        }
        if (file) {
            contentParts.push({ text: `[User has attached a file named: ${file.name}]` });
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: contentParts },
            config: {
                systemInstruction: planAndThinkSystemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        needsWebSearch: { type: Type.BOOLEAN },
                        isUrlReadRequest: { type: Type.BOOLEAN },
                        needsThinking: { type: Type.BOOLEAN },
                        needsCodeContext: { type: Type.BOOLEAN },
                        isImageGenerationRequest: { type: Type.BOOLEAN },
                        isImageEditRequest: { type: Type.BOOLEAN },
                        thoughts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    phase: { type: Type.STRING },
                                    step: { type: Type.STRING },
                                    concise_step: { type: Type.STRING }
                                },
                                required: ["phase", "step", "concise_step"]
                            }
                        },
                        searchPlan: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    phase: { type: Type.STRING },
                                    step: { type: Type.STRING },
                                    concise_step: { type: Type.STRING }
                                },
                                required: ["phase", "step", "concise_step"]
                            }
                        }
                    },
                    required: ["needsWebSearch", "isUrlReadRequest", "needsThinking", "isImageGenerationRequest", "isImageEditRequest", "needsCodeContext"],
                }
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        // If web search or URL read is needed, disable thinking to go straight to the task.
        if (result.needsWebSearch || result.isUrlReadRequest) {
            result.needsThinking = false;
            result.thoughts = [];
        }

        return { ...result, thoughts: result.thoughts || [], searchPlan: result.searchPlan || [] };
    } catch (error)
    {
        console.error("Error planning response:", error);
        // Fallback: If planning fails, assume web search is needed but disable thinking.
        const needsWebSearch = true;
        return { 
            needsWebSearch: needsWebSearch,
            isUrlReadRequest: false,
            needsThinking: !needsWebSearch, // Ensures thinking is false if web search is true
            needsCodeContext: false, // <-- Changed from true to false for token efficiency on error
            isImageGenerationRequest: !image && (prompt.toLowerCase().includes('generate') || prompt.toLowerCase().includes('create')),
            isImageEditRequest: !!image,
            thoughts: [], // No thoughts when thinking is disabled
            searchPlan: []
        };
    }
};