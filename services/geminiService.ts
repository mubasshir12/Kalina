
import { GoogleGenAI, Chat, Content, Type } from "@google/genai";

// Cache the client instance to ensure the correct API key is used and for performance.
let aiClient: GoogleGenAI | null = null;
let currentApiKey: string | null = null;

const getAiClient = (apiKey: string): GoogleGenAI => {
    if (!apiKey) {
        throw new Error("API key is missing.");
    }
    // If the key has changed or client doesn't exist, create a new one.
    if (!aiClient || currentApiKey !== apiKey) {
        aiClient = new GoogleGenAI({ apiKey });
        currentApiKey = apiKey;
    }
    return aiClient;
};

const planAndThinkSystemInstruction = `You are an intelligent router and planner that analyzes user prompts. Your task is to determine if the prompt requires real-time web information, if it involves complex reasoning that would benefit from a "thinking" process, and to generate that thinking process if needed.

Respond ONLY with a valid JSON object matching this schema:
{
  "type": "object",
  "properties": {
    "needsWebSearch": { "type": "boolean", "description": "True if the user is asking about something current, specific, or outside of general knowledge." },
    "needsThinking": { "type": "boolean", "description": "True for prompts that require deep analysis, creativity, or multi-step reasoning. False for simple questions." },
    "thoughts": {
      "type": "array",
      "items": { "type": "string" },
      "description": "A concise, 2-5 step thought process if 'needsThinking' is true. Omit or leave empty otherwise."
    }
  },
  "required": ["needsWebSearch", "needsThinking"]
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


export interface ResponsePlan {
    needsWebSearch: boolean;
    needsThinking: boolean;
    thoughts: string[];
}

export const planResponse = async (apiKey: string, prompt: string): Promise<ResponsePlan> => {
    const ai = getAiClient(apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: planAndThinkSystemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        needsWebSearch: { type: Type.BOOLEAN },
                        needsThinking: { type: Type.BOOLEAN },
                        thoughts: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["needsWebSearch", "needsThinking"],
                }
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        // Ensure thoughts is an array even if omitted
        return { ...result, thoughts: result.thoughts || [] };
    } catch (error)
    {
        console.error("Error planning response:", error);
        // Fallback to a safe default if analysis fails
        return { needsWebSearch: false, needsThinking: true, thoughts: ["Analyzing the request..."] };
    }
};

export const generateImagePromptSuggestions = async (apiKey: string, basePrompt: string): Promise<string[]> => {
    const ai = getAiClient(apiKey);
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

export const generateImage = async (apiKey: string, prompt: string, numberOfImages: number, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"): Promise<string[]> => {
    const ai = getAiClient(apiKey);
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
            return response.generatedImages.map(img => img.image.imageBytes);
        } else {
            throw new Error("No images were generated.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw error; // re-throw to be caught in App.tsx
    }
};

export const startChatSession = (
  apiKey: string,
  model: string, 
  isThinkingEnabled: boolean, 
  isWebSearchEnabled: boolean,
  history?: Content[]
): Chat => {
  const ai = getAiClient(apiKey);
  const config: {
    systemInstruction: string;
    thinkingConfig?: { thinkingBudget: number };
    tools?: any[];
  } = {
    systemInstruction: 'You are Kalina AI, a helpful and creative AI assistant. Your responses should be informative and engaging, especially when analyzing images. If you use web search, provide concise and accurate answers based on the search results.',
  };

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
