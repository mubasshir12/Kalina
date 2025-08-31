import { Modality, Type } from "@google/genai";
import { getAiClient } from "./aiClient";

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
