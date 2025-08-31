
import { Part, Type } from "@google/genai";
import { getAiClient } from "./aiClient";

const planAndThinkSystemInstruction = `You are a highly intelligent router and planner. Your task is to analyze the user's prompt and determine the most effective strategy to respond.

**CRITICAL: Your primary goal is to distinguish between complex, simple, and special case prompts.**

If an image is provided, your primary task is to determine the user's INTENT.
- If the user asks to modify, change, add something to, or alter the image, classify it as an 'image edit' request.
- If the user is asking questions about the image, describing it, or requesting analysis, it is NOT an 'edit' request.

If a file is provided (e.g., PDF, TXT), your primary task is to analyze its content. Always set 'needsThinking' to true for file analysis.

**Complex Prompts (needsThinking: true):**
Set 'needsThinking' to true for any prompt that requires:
- Analysis, creativity, or brainstorming.
- Detailed explanations or multi-step reasoning.
- Writing code, creating a plan, or summarizing a long text.
- Analysis of a provided file (PDF, TXT, etc.).
- Any task that is not a simple, direct conversational turn.

**Simple Prompts (needsThinking: false):**
Set 'needsThinking' to false for low-complexity conversational prompts. These include, but are not limited to:
- Greetings: "Hello", "Hi", "How are you?"
- Simple questions: "What's your name?"
- Expressions of gratitude: "Thanks", "Thank you"
- Short follow-ups: "Okay", "Sounds good", "Got it"
- Simple commands that don't require planning: "Tell me a joke."

Based on the prompt (and image/file, if present), you must respond ONLY with a valid JSON object matching this schema:
{
  "type": "object",
  "properties": {
    "needsWebSearch": { "type": "boolean", "description": "Set to true if the query requires up-to-date information, seeks facts about recent events, or asks about specific people, places, or things where the latest details are important. Use it to verify facts or find information that is likely not in your training data. When in doubt, it is better to search." },
    "needsThinking": { "type": "boolean", "description": "Set to true for complex tasks or false for simple conversational turns." },
    "needsCodeContext": { "type": "boolean", "description": "Set to true if the user's prompt is asking to modify, explain, or reference code that was discussed earlier." },
    "isImageGenerationRequest": { "type": "boolean", "description": "True if the user's prompt explicitly asks to create, generate, or draw an image, AND no image was provided." },
    "isImageEditRequest": { "type": "boolean", "description": "True ONLY if an image IS provided AND the user explicitly asks to modify, add to, or change it." },
    "thoughts": {
      "type": "array",
      "description": "If 'needsThinking' is true, provide a thorough, step-by-step thought process. The steps must describe your internal reasoning and plan. For each step, provide TWO versions: a 'concise_step' (3-5 words for a loading animation) and a 'step' (a full sentence). The steps must NOT be conversational. CRITICAL: The final 'concise_step' in the array MUST be dynamic, based on the user's prompt, and end in '-ing' to describe the final action (e.g., 'Generating response...', 'Finalizing plan...', 'Writing code...'). Omit or leave empty if not needed.",
      "items": {
        "type": "object",
        "properties": {
          "phase": { "type": "string", "description": "The phase of the process (e.g., 'Analysis', 'Planning', 'Finalizing')." },
          "step": { "type": "string", "description": "The detailed description of the thought process step." },
          "concise_step": { "type": "string", "description": "A very short summary (3-5 words) of the step for display in an animation. The final concise_step must end with '-ing'." }
        },
        "required": ["phase", "step", "concise_step"]
      }
    }
  },
  "required": ["needsWebSearch", "needsThinking", "isImageGenerationRequest", "isImageEditRequest", "needsCodeContext"]
}`;

export interface ThoughtStep {
    phase: string;
    step: string;
    concise_step: string;
}
export interface ResponsePlan {
    needsWebSearch: boolean;
    needsThinking: boolean;
    needsCodeContext: boolean;
    isImageGenerationRequest: boolean;
    isImageEditRequest: boolean;
    thoughts: ThoughtStep[];
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
                        }
                    },
                    required: ["needsWebSearch", "needsThinking", "isImageGenerationRequest", "isImageEditRequest", "needsCodeContext"],
                }
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        // If web search is needed, disable thinking to go straight to search.
        if (result.needsWebSearch) {
            result.needsThinking = false;
            result.thoughts = [];
        }

        return { ...result, thoughts: result.thoughts || [] };
    } catch (error)
    {
        console.error("Error planning response:", error);
        // Fallback: If planning fails, assume web search is needed but disable thinking.
        const needsWebSearch = true;
        return { 
            needsWebSearch: needsWebSearch,
            needsThinking: !needsWebSearch, // Ensures thinking is false if web search is true
            needsCodeContext: true,
            isImageGenerationRequest: !image && (prompt.toLowerCase().includes('generate') || prompt.toLowerCase().includes('create')),
            isImageEditRequest: !!image,
            thoughts: [] // No thoughts when thinking is disabled
        };
    }
};
