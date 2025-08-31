
import { Chat, Content } from "@google/genai";
import { LTM, CodeSnippet } from "../types";
import { getAiClient } from "./aiClient";

export const startChatSession = (
  model: string, 
  isThinkingEnabled: boolean, 
  isWebSearchEnabled: boolean,
  modelName: string = 'Kalina AI',
  ltm: LTM | undefined,
  isFirstMessage: boolean = false,
  history?: Content[],
  summary?: string,
  codeSnippets?: CodeSnippet[]
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
4.  **Operational Excellence:** Use markdown for clarity. Cite web sources smoothly without saying "I searched Google."`,
  };
  
  if (isFirstMessage) {
    config.systemInstruction += `\n5. **Conversation Title:** This is the first turn of a new conversation. Your response MUST begin with "TITLE: <Your 3-5 word, professional, English-language title here>" on a single line. The title should summarize the user's initial prompt. After the title line, add a newline, then proceed with your actual response. DO NOT include a title in any subsequent responses for this conversation.`;
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

  let contextInstruction = '';
  if (summary) {
    contextInstruction += `\n\n---
[Conversation Summary]
The following is a summary of the conversation so far. Use it for context to inform your response, but do not mention the summary or the fact you are using it unless the user explicitly asks about it.
---
${summary}
---`;
  }
  if (codeSnippets && codeSnippets.length > 0) {
    const codeContext = codeSnippets.map(s => `Language: ${s.language}\nDescription: ${s.description}\nCode:\n\`\`\`${s.language}\n${s.code}\n\`\`\``).join('\n---\n');
    contextInstruction += `\n\n---
[Retrieved Code Snippets]
The following code snippets might be relevant to the user's request. Use them for context to inform your response, but do not mention them unless the user explicitly asks about them.
---
${codeContext}
---`;
  }
  config.systemInstruction += contextInstruction;

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
