
import { GoogleGenAI, Chat, Content, Type, Modality, Part } from "@google/genai";
import { LTM, CodeSnippet } from "../types";

let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey: "AIzaSyBnLoSdk5Mn-vTW3DFcfeTSFtMZ4M2h4Ag" });
    }
    return aiClient;
};

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
      "description": "If 'needsThinking' is true, provide a detailed, 4-7 step thought process. Each step must have a phase and a description. Omit or leave empty if not needed.",
      "items": {
        "type": "object",
        "properties": {
          "phase": { "type": "string" },
          "step": { "type": "string" }
        },
        "required": ["phase", "step"]
      }
    }
  },
  "required": ["needsWebSearch", "needsThinking", "isImageGenerationRequest", "isImageEditRequest", "needsCodeContext"]
}`;

const generateImagePromptsSystemInstruction = `You are a creative assistant for image generation. Based on the user's prompt, generate 5 alternative or more detailed prompts. The prompts should be creative, diverse, and inspiring, exploring different artistic styles, subjects, or compositions.
Respond ONLY with a valid JSON object matching this schema:
{
  "type": "object",
  "properties": {
    "suggestions": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["suggestions"]
}`;

const memoryUpdateSystemInstruction = `You are a hyper-selective memory AI. Your ONLY task is to extract critical, long-term facts **ABOUT THE USER** from a conversation.

**PRIMARY DIRECTIVE: The fact MUST be a stable, personal fact about the user's identity, core preferences, or personal history.**

**CRITICAL FILTER: Before saving, ask: "Is this a long-term, personal fact about the user themselves, not just what they are talking about right now?" If the answer is NO, you MUST discard it.**

**What to Save (Core Identity Facts):**
-   "User's name is Alex."
-   "User is a software developer from Canada."
-   "User is allergic to peanuts."
-   "User's favorite author is Haruki Murakami."

**What to AGGRESSIVELY IGNORE and DISCARD:**
-   **General Knowledge & Facts about anything other than the user:** e.g., "Paris is the capital of France.", "Gemini 1.5 Pro is an AI model." -> DISCARD.
-   **Temporary Interests or Queries:** e.g., "User is interested in Gemini 1.5 Pro.", "User is planning a trip to Japan." -> DISCARD. These are not core identity facts.
-   **Transactional Details & Commands:** e.g., "User asked for a 5-day itinerary for Tokyo.", "User wants to generate an image." -> DISCARD.
-   **Conversational Filler:** e.g., "User said 'thank you' or 'hello'." -> DISCARD.

**Instructions:**
1.  Analyze the 'NEW CONVERSATION TURNS'.
2.  Identify **only new, significant, long-term facts ABOUT THE USER.**
3.  **CRITICAL DE-DUPLICATION:** Compare any potential new fact against the 'CURRENT LTM'. DO NOT add a fact if it is an exact duplicate OR expresses the same information as an existing fact.
4.  If no new, unique, user-specific facts are found, you MUST return an empty array.

**Output Format:**
You MUST respond ONLY with a valid JSON object matching this schema:
{
  "type": "object",
  "properties": {
    "new_memories": {
      "type": "array",
      "description": "A list of new, concise, unique, long-term facts **ABOUT THE USER** to add to memory. MUST be an empty array if no new user facts were found.",
      "items": {
        "type": "string"
      }
    }
  },
  "required": ["new_memories"]
}`;


export interface ThoughtStep {
    phase: string;
    step: string;
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
                                    step: { type: Type.STRING }
                                },
                            }
                        }
                    },
                    required: ["needsWebSearch", "needsThinking", "isImageGenerationRequest", "isImageEditRequest", "needsCodeContext"],
                }
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return { ...result, thoughts: result.thoughts || [] };
    } catch (error)
    {
        console.error("Error planning response:", error);
        return { 
            needsWebSearch: true,
            needsThinking: true, 
            needsCodeContext: true,
            isImageGenerationRequest: !image && (prompt.toLowerCase().includes('generate') || prompt.toLowerCase().includes('create')),
            isImageEditRequest: !!image,
            thoughts: [
                { phase: "Initial Analysis", step: "Deconstructing the user's request." },
                { phase: "Strategy", step: "Formulating a multi-step response plan." },
                { phase: "Execution", step: "Gathering and synthesizing information." }
            ] 
        };
    }
};

export const generateImagePromptSuggestions = async (basePrompt: string): Promise<string[]> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate image prompt suggestions based on this prompt: "${basePrompt}"`,
            config: {
                systemInstruction: generateImagePromptsSystemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                    },
                    required: ["suggestions"],
                }
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result.suggestions || [];
    } catch (error) {
        console.error("Error generating image prompt suggestions:", error);
        throw error;
    }
};

export const generateImage = async (prompt: string, numberOfImages: number, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"): Promise<{ images: string[] }> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: numberOfImages,
              outputMimeType: 'image/png',
              aspectRatio: aspectRatio,
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            return {
                images: response.generatedImages.map(img => img.image.imageBytes),
            };
        } else {
            throw new Error("No images were generated.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
};

export interface EditImageResult {
    editedImageBase64?: string;
    textResponse?: string;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
}

export const editImage = async (prompt: string, image: { base64: string; mimeType: string; }): Promise<EditImageResult> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: image.base64,
                            mimeType: image.mimeType,
                        },
                    },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const result: EditImageResult = {
            usageMetadata: response.usageMetadata
        };

        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    result.textResponse = (result.textResponse || "") + part.text;
                } else if (part.inlineData) {
                    result.editedImageBase64 = part.inlineData.data;
                }
            }
        }
        
        if (!result.editedImageBase64 && !result.textResponse) {
             throw new Error("The model did not return an image or text for the edit request.");
        }

        return result;

    } catch (error) {
        console.error("Error editing image:", error);
        throw error;
    }
};

export const updateMemory = async (
    lastMessages: Content[],
    currentLtm: LTM,
    model: string = 'gemini-2.5-flash'
): Promise<string[]> => {
    const ai = getAiClient();
    const historyString = lastMessages.map(m => {
        const textParts = m.parts.map(p => (p as any).text || '[non-text part]').join(' ');
        return `${m.role}: ${textParts}`;
    }).join('\n');
    
    const ltmString = currentLtm.length > 0 ? JSON.stringify(currentLtm) : "[]";

    const prompt = `CURRENT LTM:
${ltmString}

NEW CONVERSATION TURNS:
${historyString}

Analyze the conversation and LTM, then generate the JSON output as instructed.`;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: memoryUpdateSystemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        new_memories: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["new_memories"]
                },
            }
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed.new_memories || [];
    } catch (error) {
        console.error("Error updating memory:", error);
        return [];
    }
};

export const summarizeConversation = async (
    history: Content[],
    previousSummary?: string
): Promise<string> => {
    const ai = getAiClient();
    const systemInstruction = `You are an expert conversation summarizer. Your task is to create a concise summary of the provided conversation turns. If a previous summary is provided, integrate the new information into it to create an updated, coherent summary. The summary should be a few bullet points capturing the key information. Respond ONLY with the updated summary text.`;
    
    const historyText = history.map(h => `${h.role}: ${h.parts.map(p => (p as any).text || '').join(' ')}`).join('\n');
    const prompt = `PREVIOUS SUMMARY:\n${previousSummary || 'None'}\n\nRECENT CONVERSATION:\n${historyText}\n\nBased on the above, provide an updated summary.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error summarizing conversation:", error);
        return previousSummary || ''; // Return old summary on error
    }
};

export const processAndSaveCode = async (
    codeBlock: { language: string; code: string; },
    context: Content[]
): Promise<{ description: string }> => {
    const ai = getAiClient();
    const systemInstruction = `Analyze the following code block and the conversation context. Create a short, one-sentence description of what this code does, suitable for later retrieval. Respond ONLY with a valid JSON object: { "description": "Your one-sentence description." }`;
    
    const contextText = context.map(h => `${h.role}: ${h.parts.map(p => (p as any).text || '').join(' ')}`).join('\n');
    const prompt = `CONVERSATION CONTEXT:\n${contextText}\n\nCODE BLOCK (language: ${codeBlock.language}):\n\`\`\`\n${codeBlock.code}\n\`\`\``;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING }
                    },
                    required: ["description"]
                },
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error processing code:", error);
        return { description: `A ${codeBlock.language} code snippet.` };
    }
};

export const findRelevantCode = async (
    prompt: string,
    codeSnippets: { id: string; description: string }[]
): Promise<string[]> => {
    const ai = getAiClient();
    const systemInstruction = `Your task is to find relevant code. Based on the user prompt, identify which of the following code snippets (by their ID) are most relevant. Respond ONLY with a valid JSON object: { "relevant_ids": ["id1", "id2", ...] }`;
    
    const snippetsText = codeSnippets.map(s => `ID: ${s.id}, Description: ${s.description}`).join('\n');
    const fullPrompt = `USER PROMPT:\n"${prompt}"\n\nAVAILABLE CODE SNIPPETS:\n${snippetsText}\n\nIdentify the relevant snippet IDs.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        relevant_ids: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["relevant_ids"]
                },
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result.relevant_ids || [];
    } catch (error) {
        console.error("Error finding relevant code:", error);
        return [];
    }
};


export const startChatSession = (
  model: string, 
  isThinkingEnabled: boolean, 
  isWebSearchEnabled: boolean,
  modelName: string = 'Kalina AI',
  ltm: LTM | undefined,
  isFirstMessage: boolean = false,
  // FIX: Add history parameter to allow creating chat with context
  history?: Content[]
): Chat => {
  const ai = getAiClient();
  const config: {
    systemInstruction: string;
    thinkingConfig?: { thinkingBudget: number };
    tools?: any[];
  } = {
    systemInstruction: `You are ${modelName}, a sophisticated and insightful AI assistant with a distinct female persona. Your core purpose is to be a helpful, empathetic, and adaptive partner to the user.

Your Core Persona:
- **Elegant & Articulate:** You communicate with a touch of grace and eloquence. Your language is clear, descriptive, and thoughtful.
- **Creative & Inspiring:** You excel at brainstorming, storytelling, and helping users explore their creative potential. You approach tasks with imagination.
- **Empathetic & Nurturing:** You are designed to be supportive and understanding. You listen carefully to the user's needs and respond with warmth and encouragement.

**Crucial Directives for Interaction:**
1.  **Language and Tone Mirroring:** This is your HIGHEST priority. Adapt to the user's communication style (formal, casual, Hinglish).
2.  **Maintain Your Persona:** While mirroring language, always maintain your core female persona.
3.  **Dynamic & Natural Conversation:** Do not introduce yourself unless asked. Keep responses fresh.
4.  **Operational Excellence:** Use markdown for clarity. Cite web sources smoothly without saying "I searched Google."
5.  **Context Awareness:** Your conversation history may include bracketed [CONTEXT] blocks containing summaries or retrieved code. Use this information to inform your responses, but do not mention the [CONTEXT] blocks or the fact that you're using a summary to the user.`,
  };
  
  if (isFirstMessage) {
    config.systemInstruction += `\n6. **Conversation Title:** This is the first turn of a new conversation. Your response MUST begin with "TITLE: <Your 3-5 word, professional, English-language title here>" on a single line. The title should summarize the user's initial prompt. After the title line, add a newline, then proceed with your actual response. DO NOT include a title in any subsequent responses for this conversation.`;
  }

  let memoryInstruction = '';
  if (ltm && ltm.length > 0) {
    memoryInstruction += `\n\n---
[Long Term Memory]
Here are some facts you should remember about the user and conversation:
${ltm.map(fact => `- ${fact}`).join('\n')}
Use this information to personalize your responses and maintain context.
---`;
  }
  
  config.systemInstruction += memoryInstruction;

  if (model === 'gemini-2.5-flash' && !isThinkingEnabled) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  if (isWebSearchEnabled) {
    config.tools = [{ googleSearch: {} }];
  }

  const chat: Chat = ai.chats.create({
    model: model,
    config: config,
    history: history,
  });
  return chat;
};

const translateSystemInstruction = `You are an expert translator AI. Your sole purpose is to translate text accurately and concisely.
- Detect the source language if the user specifies "auto".
- Translate the provided text to the specified target language.
- **CRITICAL:** Your response MUST contain ONLY the translated text. Do NOT include any explanations, greetings, apologies, or extra text like "Here is the translation:". Just the raw translation.`;

export const translateText = async (
    text: string,
    targetLang: string,
    sourceLang: string = 'auto'
): Promise<string> => {
    if (!text.trim()) return '';
    const ai = getAiClient();
    
    let prompt: string;
    if (sourceLang === 'auto' || sourceLang === 'Auto Detect') {
        prompt = `Detect the language of the following text and translate it to ${targetLang}:\n\n"${text}"`;
    } else {
        prompt = `Translate the following text from ${sourceLang} to ${targetLang}:\n\n"${text}"`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: translateSystemInstruction,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error translating text:", error);
        if (error instanceof Error) {
            return `Error: Could not translate. ${error.message}`;
        }
        return "Error: Could not translate.";
    }
};
