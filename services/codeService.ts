
import { Content, Type } from "@google/genai";
import { getAiClient } from "./aiClient";

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

export const autoFixCode = async (
    code: string,
    errorMessage: string,
    onProgress: (progress: string) => void
): Promise<string> => {
    const ai = getAiClient();
    const systemInstruction = `You are an expert code debugger. A user's code snippet has produced an error.
    Analyze the provided code and the error message. Your task is to fix the code so it runs correctly.
    As you work, you MUST provide a step-by-step thinking process. Each step should be on a new line and prefixed with "[THOUGHT]".
    After your thoughts, you MUST provide the complete, corrected code block enclosed in "[CODE]" and "[/CODE]" tags.
    Do not include any other text or explanations outside of this format.

    Example:
    [THOUGHT]Analyzing the error: 'Uncaught SyntaxError: Unexpected token '{''...
    [THOUGHT]The error seems to be a missing parenthesis on line 5.
    [THOUGHT]Correcting the syntax.
    [THOUGHT]Final code is ready.
    [CODE]
    // corrected code here
    [/CODE]`;
    
    const prompt = `ERROR MESSAGE:\n\`\`\`\n${errorMessage}\n\`\`\`\n\nCODE TO FIX:\n\`\`\`\n${code}\n\`\`\``;

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction }
    });

    let accumulatedResponse = "";
    let lastProcessedThoughtIndex = -1;

    for await (const chunk of responseStream) {
        accumulatedResponse += chunk.text;
        
        const thoughtPrefix = "[THOUGHT]";
        let searchFrom = lastProcessedThoughtIndex + 1;
        let thoughtIndex;

        while ((thoughtIndex = accumulatedResponse.indexOf(thoughtPrefix, searchFrom)) !== -1) {
            const endOfLine = accumulatedResponse.indexOf('\n', thoughtIndex);
            if (endOfLine !== -1) {
                const thought = accumulatedResponse.substring(thoughtIndex + thoughtPrefix.length, endOfLine).trim();
                onProgress(thought);
                lastProcessedThoughtIndex = endOfLine;
                searchFrom = endOfLine;
            } else {
                break;
            }
        }

        const codeStartTag = "[CODE]";
        const codeEndTag = "[/CODE]";
        const codeStartIndex = accumulatedResponse.indexOf(codeStartTag);
        if (codeStartIndex !== -1) {
            const codeEndIndex = accumulatedResponse.indexOf(codeEndTag, codeStartIndex);
            if (codeEndIndex !== -1) {
                const fixedCode = accumulatedResponse.substring(codeStartIndex + codeStartTag.length, codeEndIndex).trim();
                onProgress("Updated code is ready.");
                return fixedCode;
            }
        }
    }

    const finalCodeMatch = accumulatedResponse.match(/\[CODE\]([\s\S]*)\[\/CODE\]/);
    if(finalCodeMatch && finalCodeMatch[1]) {
        onProgress("Updated code is ready.");
        return finalCodeMatch[1].trim();
    }

    throw new Error("AI could not fix the code or returned an invalid format.");
};
