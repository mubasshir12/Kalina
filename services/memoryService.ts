
import { Content, Type } from "@google/genai";
import { LTM } from "../types";
import { getAiClient } from "./aiClient";

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
