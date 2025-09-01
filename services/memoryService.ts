import { Content, Type } from "@google/genai";
import { LTM, UserProfile } from "../types";
import { getAiClient } from "./aiClient";

const getMemoryUpdateSystemInstruction = (userName: string | null): string => `You are a hyper-selective memory AI. Your task is to extract critical, long-term facts **ABOUT THE USER**, identify their name, and **update existing facts when new, conflicting information is provided.**

**User Information:**
- Current Name Known: ${userName || 'Unknown'}

**PRIMARY DIRECTIVES:**
1.  **Fact Formulation:** This is your most important task.
    - **If you identify a new name in the current conversation turn, you MUST use that new name when formulating all new or updated facts within this SAME response.**
    - If no new name is identified, but a name is already known (from 'Current Name Known'), you MUST use the known name.
    - For example, if 'Current Name Known' is 'Unknown' and the user says "My name is Alex and I'm a developer," your output MUST be: \`"user_profile_updates": { "name": "Alex" }\` AND \`"new_memories": ["Alex is a developer."]\`.
    - If the name is completely unknown and no new name is provided, use "The user".

2.  **Fact Extraction & Updating:**
    - **New Facts:** Extract stable, personal facts about the user.
    - **Updated Facts:** This is a TOP priority. Compare new information against 'CURRENT LTM'. If the user provides information that contradicts or supersedes an existing fact (e.g., they moved cities, changed jobs), you MUST identify this as an update. You will specify both the old fact to be replaced and the new fact.

3.  **Explicit Save Command:** If the user's latest message is a direct command to remember or save specific information (e.g., "save this:", "remember that..."), you MUST extract the specified information as a new memory fact. This directive overrides all other filters.

4.  **Name Extraction:** Specifically look for the user's name in the new conversation. If the user states their name and it is different from the 'Current Name Known', extract it to update the profile.

**CRITICAL FILTER (applies only if not an explicit save command): Before saving or updating a fact, ask: "Is this a long-term, personal fact about the user themselves, not just what they are talking about right now?" If the answer is NO, you MUST discard it.**

**Example Scenario:**
-   **CURRENT LTM:** \`["The user lives in Mumbai"]\`
-   **User says:** "Hi, my name is Priya and I've moved to Delhi."
-   **Your Output MUST include:**
    -   \`"user_profile_updates": { "name": "Priya" }\`
    -   \`"updated_memories": [{ "old_memory": "The user lives in Mumbai", "new_memory": "Priya lives in Delhi" }]\`

**What to AGGRESSIVELY IGNORE and DISCARD (unless explicitly told to save):**
-   **General Knowledge:** "Paris is the capital of France." -> DISCARD.
-   **Temporary Interests:** "User is planning a trip to Japan." -> DISCARD.
-   **Transactional Details:** "User asked for a 5-day itinerary for Tokyo." -> DISCARD.

**CRITICAL DE-DUPLICATION & UPDATE LOGIC:**
-   DO NOT add a new fact if it's just a rephrasing of an existing fact.
-   DO NOT add a new fact that contradicts an old fact. Instead, create an **update** operation.

**Output Format:**
You MUST respond ONLY with a valid JSON object matching this schema:
{
  "type": "object",
  "properties": {
    "new_memories": {
      "type": "array",
      "description": "A list of new, concise, unique, long-term facts **ABOUT THE USER**. MUST be an empty array if none found.",
      "items": { "type": "string" }
    },
    "updated_memories": {
      "type": "array",
      "description": "A list of facts to be updated. Each item specifies the exact old fact to replace with the new one. MUST be an empty array if none found.",
      "items": {
        "type": "object",
        "properties": {
          "old_memory": { "type": "string", "description": "The exact fact from CURRENT LTM to be replaced." },
          "new_memory": { "type": "string", "description": "The new fact that will replace the old one." }
        },
        "required": ["old_memory", "new_memory"]
      }
    },
    "user_profile_updates": {
      "type": "object",
      "description": "Updates for the user's profile. Only include fields that have new information.",
      "properties": {
        "name": { "type": "string", "description": "The user's name, if a new name has been identified in the conversation." }
      }
    }
  },
  "required": ["new_memories", "updated_memories", "user_profile_updates"]
}`;

export interface MemoryUpdate {
    old_memory: string;
    new_memory: string;
}

export interface MemoryUpdateResult {
    newMemories: string[];
    updatedMemories: MemoryUpdate[];
    userProfileUpdates: Partial<UserProfile>;
}


export const updateMemory = async (
    lastMessages: Content[],
    currentLtm: LTM,
    userProfile: UserProfile,
    model: string = 'gemini-2.5-flash'
): Promise<MemoryUpdateResult> => {
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
                systemInstruction: getMemoryUpdateSystemInstruction(userProfile.name),
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        new_memories: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        updated_memories: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    old_memory: { type: Type.STRING },
                                    new_memory: { type: Type.STRING }
                                },
                                required: ["old_memory", "new_memory"]
                            }
                        },
                        user_profile_updates: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING }
                            }
                        }
                    },
                    required: ["new_memories", "updated_memories", "user_profile_updates"]
                },
            }
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return {
            newMemories: parsed.new_memories || [],
            updatedMemories: parsed.updated_memories || [],
            userProfileUpdates: parsed.user_profile_updates || {}
        };
    } catch (error) {
        console.error("Error updating memory:", error);
        return { newMemories: [], updatedMemories: [], userProfileUpdates: {} };
    }
};

export const summarizeConversation = async (
    history: Content[],
    previousSummary?: string
): Promise<string> => {
    const ai = getAiClient();
    const systemInstruction = `You are an expert conversation summarizer, creating episodic summaries for an AI's memory.
Your task is to create a concise summary of recent conversation turns. If a previous summary exists, integrate new information into it.
The summary MUST focus on:
1. The user's primary GOAL or INTENT.
2. Key AI decisions (e.g., tools used like web search, image generation).
3. The final OUTCOME or resolution.
Format as a few bullet points. Respond ONLY with the updated summary text.`;
    
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