
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chat, Content, Part } from '@google/genai';
import { ChatMessage as ChatMessageType, GroundingChunk, Tool, AppError } from './types';
import { startChatSession, planResponse, generateImage } from './services/geminiService';
import Header from './components/Header';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';
import WelcomeScreen from './components/WelcomeScreen';
import ImageOptionsModal, { ImageGenerationOptions } from './components/ImageOptionsModal';
import ImagePromptSuggestions from './components/ImagePromptSuggestions';
import ApiKeyModal from './components/ApiKeyModal';

const getFriendlyErrorMessage = (error: any): AppError => {
    const message = error.message || String(error);

    if (message.includes('API key not valid') || message.toLowerCase().includes('permission denied')) {
        return { 
            message: 'Your API key is invalid or lacks the necessary permissions.', 
            isApiKeyError: true 
        };
    }
    if (message.includes('429')) {
        return { message: 'You have exceeded your API quota. Please check your Google AI Studio account.' };
    }
    if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
         return { message: 'Could not connect to the service. Please check your internet connection and try again.' };
    }
    if (message.includes('timed out')) {
        return { message: 'The request timed out. Please try again.' };
    }

    return { message: 'An unexpected error occurred. Please try again later.' };
};


const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('smart');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme') as 'light' | 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });
  const [isImageOptionsOpen, setIsImageOptionsOpen] = useState(false);
  const [imageGenerationPrompt, setImageGenerationPrompt] = useState('');
  const [prefilledInput, setPrefilledInput] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(() => sessionStorage.getItem('gemini-api-key'));

  const chatRef = useRef<Chat | null>(null);
  const lastChatConfig = useRef<{ model: string; isThinkingEnabled: boolean; isWebSearchEnabled: boolean } | null>(null);
  const thinkingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingStepRef = useRef(0);
  const thinkingTimeRef = useRef(0);

  const model = 'gemini-2.5-flash';

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleSetApiKey = (key: string) => {
    sessionStorage.setItem('gemini-api-key', key);
    setApiKey(key);
  };
  
  const handleChangeApiKey = () => {
    sessionStorage.removeItem('gemini-api-key');
    setApiKey(null);
    handleNewChat();
  };

  const transformMessagesToHistory = (msgs: ChatMessageType[]): Content[] => {
      const validMessages = msgs.filter(m => !(m.role === 'model' && !m.content?.trim() && !m.image && !m.generatedImagesBase64));
      return validMessages.map(msg => {
          const parts: Part[] = [];
          if (msg.content) {
              parts.push({ text: msg.content });
          }
          if (msg.image) {
              parts.push({ inlineData: { data: msg.image.base64, mimeType: msg.image.mimeType } });
          }
          return {
              role: msg.role,
              parts: parts,
          };
      }).filter(msg => msg.parts.length > 0);
  };

  const clearThinkingIntervals = useCallback(() => {
    if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
    if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    thinkingIntervalRef.current = null;
    thinkingTimerRef.current = null;
    setIsThinking(false);
  }, []);

  const handleExecuteImageGeneration = useCallback(async (options: ImageGenerationOptions) => {
    if (!apiKey) return;
    setIsImageOptionsOpen(false);
    setIsLoading(true);
    setError(null);
    
    setMessages(prev => [...prev, { role: 'model', content: '', isGeneratingImage: true, imageGenerationCount: options.count }]);
    
    try {
      const generatedImagesBase64 = await generateImage(apiKey, imageGenerationPrompt, options.count, options.aspectRatio);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessageIndex = newMessages.length - 1;
        newMessages[lastMessageIndex] = {
          ...newMessages[lastMessageIndex],
          isGeneratingImage: false,
          generatedImagesBase64: generatedImagesBase64,
        };
        return newMessages;
      });
    } catch (e: any) {
      const friendlyError = getFriendlyErrorMessage(e);
      setError(friendlyError);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessageIndex = newMessages.length - 1;
        newMessages[lastMessageIndex] = {
          ...newMessages[lastMessageIndex],
          isGeneratingImage: false,
          content: `Sorry, I encountered an error: ${friendlyError.message}`,
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setImageGenerationPrompt('');
    }
  }, [apiKey, imageGenerationPrompt]);
  
  const handleSendMessage = useCallback(async (prompt: string, image?: { base64: string; mimeType: string; }) => {
    if ((!prompt.trim() && !image) || isLoading || !apiKey) return;

    setError(null);

    const newUserMessage: ChatMessageType = { role: 'user', content: prompt, image: image };
    setMessages(prev => [...prev, newUserMessage]);
    
    if (selectedTool === 'imageGeneration') {
        setImageGenerationPrompt(prompt);
        setIsImageOptionsOpen(true);
        return;
    }
    
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'model', content: '', thoughts: [], thinkingDuration: 0 }]);

    thinkingStepRef.current = 0;
    thinkingTimeRef.current = 0;

    try {
      const plan = await planResponse(apiKey, prompt);
      
      let finalIsThinkingEnabled = plan.needsThinking;
      let finalIsWebSearchEnabled = plan.needsWebSearch;

      if (selectedTool === 'thinking') {
          finalIsThinkingEnabled = true;
          finalIsWebSearchEnabled = false;
      } else if (selectedTool === 'webSearch') {
          finalIsWebSearchEnabled = true;
      }

      setIsSearchingWeb(finalIsWebSearchEnabled);
      if (finalIsThinkingEnabled) {
          setIsThinking(true);
          const startTime = Date.now();
          const thinkingProcess = plan.thoughts.length > 0 ? plan.thoughts : ["Analyzing the request..."];

          thinkingTimerRef.current = setInterval(() => {
            thinkingTimeRef.current = (Date.now() - startTime) / 1000;
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model') {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { ...last, thinkingDuration: thinkingTimeRef.current };
                    return newMessages;
                }
                return prev;
            });
          }, 100);

          thinkingIntervalRef.current = setInterval(() => {
            if (thinkingStepRef.current < thinkingProcess.length) {
                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'model') {
                        const newMessages = [...prev];
                        const currentThoughts = last.thoughts || [];
                        newMessages[newMessages.length - 1] = { ...last, thoughts: [...currentThoughts, thinkingProcess[thinkingStepRef.current]] };
                        return newMessages;
                    }
                    return prev;
                });
                thinkingStepRef.current++;
            } else {
                if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
            }
          }, 1500);

      } else {
          setIsThinking(false);
      }

      const currentConfig = lastChatConfig.current;
      if (!chatRef.current || !currentConfig || currentConfig.model !== model || currentConfig.isThinkingEnabled !== finalIsThinkingEnabled || currentConfig.isWebSearchEnabled !== finalIsWebSearchEnabled) {
        const history = transformMessagesToHistory(messages);
        chatRef.current = startChatSession(apiKey, model, finalIsThinkingEnabled, finalIsWebSearchEnabled, history);
        lastChatConfig.current = { model, isThinkingEnabled: finalIsThinkingEnabled, isWebSearchEnabled: finalIsWebSearchEnabled };
      }
      
      const parts: Part[] = [
          ...(image ? [{ inlineData: { data: image.base64, mimeType: image.mimeType } }] : []),
          ...(prompt ? [{ text: prompt }] : []),
      ];

      if (parts.length === 0) throw new Error("Cannot send an empty message.");
      
      const stream = await chatRef.current.sendMessageStream({ message: parts });

      let isFirstChunk = true;
      let accumulatedSources: GroundingChunk[] = [];
      for await (const chunk of stream) {
        if (isFirstChunk) {
            clearThinkingIntervals();
            setIsSearchingWeb(false);
            isFirstChunk = false;
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model' && last.thoughts && last.thoughts.length > 0) {
                     const newMessages = [...prev];
                     newMessages[newMessages.length - 1] = { ...last, thinkingDuration: thinkingTimeRef.current };
                     return newMessages;
                }
                return prev;
            });
        }

        const chunkSources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunkSources) {
          chunkSources.forEach((source: GroundingChunk) => {
            if (!accumulatedSources.some(s => s.web.uri === source.web.uri)) {
                accumulatedSources.push(source);
            }
          });
        }

        const chunkText = chunk.text;
        setMessages(prevMessages => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            const updatedMessages = [...prevMessages];
            updatedMessages[prevMessages.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + chunkText,
              sources: accumulatedSources.length > 0 ? [...accumulatedSources] : undefined,
            };
            return updatedMessages;
          }
          return prevMessages;
        });
      }
    } catch (e: any) {
       const friendlyError = getFriendlyErrorMessage(e);
       setError(friendlyError);
       console.error(e);
       setMessages(prev => {
          const updated = prev.slice(0, -1);
          return [...updated, {role: 'model', content: `Sorry, I encountered an error: ${friendlyError.message}`}]
        });
    } finally {
      setIsLoading(false);
      clearThinkingIntervals();
      setIsSearchingWeb(false);
    }
  }, [isLoading, selectedTool, messages, clearThinkingIntervals, apiKey]);
  
  const handleNewChat = useCallback(() => {
    setMessages([]);
    chatRef.current = null;
    lastChatConfig.current = null;
    setError(null);
    clearThinkingIntervals();
    setIsLoading(false);
    setIsThinking(false);
    setIsSearchingWeb(false);
    setSelectedTool('smart');
  }, [clearThinkingIntervals]);
  
  const handleRetry = useCallback(async () => {
    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
            lastUserMessageIndex = i;
            break;
        }
    }
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[lastUserMessageIndex];
    setMessages(messages.slice(0, lastUserMessageIndex));
    await handleSendMessage(lastUserMessage.content, lastUserMessage.image);

  }, [messages, handleSendMessage]);

  const handleSelectImagePrompt = (prompt: string) => {
    setSelectedTool('imageGeneration');
    setPrefilledInput(prompt);
  };
  
  if (!apiKey) {
    return <ApiKeyModal onSetApiKey={handleSetApiKey} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#131314] text-gray-900 dark:text-white transition-colors duration-300">
      <Header onNewChat={handleNewChat} theme={theme} onToggleTheme={toggleTheme} onChangeApiKey={handleChangeApiKey} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-40">
        <div className="max-w-4xl mx-auto h-full">
           {messages.length === 0 ? (
            <WelcomeScreen onSendMessage={handleSendMessage} />
          ) : (
            <ChatHistory 
              messages={messages} 
              isLoading={isLoading} 
              isThinking={isThinking} 
              isSearchingWeb={isSearchingWeb} 
              onRetry={handleRetry}
            />
          )}
        </div>
      </main>
      <footer className="bg-white/80 dark:bg-[#131314]/80 backdrop-blur-sm p-4 md:p-6 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          {error && (
             <div className="text-red-500 text-center text-sm mb-2 flex items-center justify-center gap-2">
                <span>{error.message}</span>
                {error.isApiKeyError && (
                    <button onClick={handleChangeApiKey} className="px-2 py-0.5 border border-red-500 rounded-md hover:bg-red-500 hover:text-white transition-colors">
                        Change API Key
                    </button>
                )}
            </div>
          )}
          {selectedTool === 'imageGeneration' && (
            <ImagePromptSuggestions 
              messages={messages}
              onSelectPrompt={handleSelectImagePrompt} 
              apiKey={apiKey}
            />
          )}
          <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading}
            selectedTool={selectedTool}
            onToolChange={setSelectedTool}
            prefilledInput={prefilledInput}
            onPrefillConsumed={() => setPrefilledInput('')}
          />
        </div>
      </footer>
      <ImageOptionsModal
        isOpen={isImageOptionsOpen}
        onClose={() => setIsImageOptionsOpen(false)}
        onGenerate={handleExecuteImageGeneration}
        prompt={imageGenerationPrompt}
      />
    </div>
  );
};

export default App;
