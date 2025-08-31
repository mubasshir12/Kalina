
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export const initializeAiClient = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("API key is required to initialize the AI client.");
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey });
};

export const getAiClient = (): GoogleGenAI => {
    if (!aiClient) {
        throw new Error("AI Client not initialized. Please set your API key.");
    }
    return aiClient;
};
