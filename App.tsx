
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Chat, Content, Part } from '@google/genai';
import { ChatMessage as ChatMessageType, GroundingChunk, Tool, AppError, Suggestion, Conversation, ChatModel, ModelInfo, LTM, CodeSnippet } from './types';
import { initializeAiClient, startChatSession, planResponse, generateImage, editImage, updateMemory, summarizeConversation, processAndSaveCode, findRelevantCode } from './services/geminiService';
import Header from './components/Header';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';
import WelcomeScreen from './components/WelcomeScreen';
import ImageOptionsModal, { ImageGenerationOptions } from './components/ImageOptionsModal';
import ApiKeyModal from './components/ApiKeyModal';
import Gallery from './components/Gallery';
import ChatHistorySheet from './components/ChatHistorySheet';
import ImagePromptSuggestions from './components/ImagePromptSuggestions';
import MemoryManagement from './components/MemoryManagement';
import Translator from './components/Translator';

const getFriendlyErrorMessage = (error: any): AppError => {
    const message = error.message || String(error);

    if (message.includes('API key not valid') || message.toLowerCase().includes('permission denied') || message.includes('API_KEY')) {
        return { 
            message: 'Your API key is invalid or not configured correctly. Please check your .env file.', 
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

const getImageDimensions = (base64: string, mimeType: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            return resolve({ width: 1, height: 1 });
        }
        const img = new window.Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = (err) => {
            console.error("Failed to load image for dimension check:", err);
            resolve({ width: 1, height: 1 });
        };
        img.src = `data:${mimeType};base64,${base64}`;
    });
};

const models: ModelInfo[] = [
    { id: 'gemini-2.5-flash', name: 'Kalina 2.5 Flash', description: 'Optimized for speed and efficiency.' },
    { id: 'gemini-2.5-pro', name: 'Kalina 2.5 Pro', description: 'Advanced capabilities for complex tasks.' },
];

const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('smart');
  const [selectedChatModel, setSelectedChatModel] = useState<ChatModel>('gemini-2.5-flash');
  const [isImageOptionsOpen, setIsImageOptionsOpen] = useState(false);
  const [imageGenerationPrompt, setImageGenerationPrompt] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [allGeneratedImages, setAllGeneratedImages] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'chat' | 'gallery' | 'memory'>('chat');
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
  const [ltm, setLtm] = useState<LTM>([]);
  const [codeMemory, setCodeMemory] = useState<CodeSnippet[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  const thinkingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingStepRef = useRef(0);
  const thinkingTimeRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const activeConversation = useMemo(() => 
    conversations.find(c => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
    });
  }, [conversations]);
  
  const showWelcomeScreen = !activeConversation || activeConversation.messages.length === 0;

  useEffect(() => {
    const storedApiKey = localStorage.getItem('kalina_api_key');
    if (storedApiKey) {
        try {
            initializeAiClient(storedApiKey);
            setApiKey(storedApiKey);
        } catch (e) {
            console.error("Failed to initialize with stored API key:", e);
            localStorage.removeItem('kalina_api_key'); // Clear bad key
        }
    }
  }, []);
  
  useEffect(() => {
    try {
        const storedLtm = localStorage.getItem('kalina_ltm');
        if (storedLtm) setLtm(JSON.parse(storedLtm));

        const storedCodeMemory = localStorage.getItem('kalina_code_memory');
        if (storedCodeMemory) setCodeMemory(JSON.parse(storedCodeMemory));
    } catch (e) {
        console.error("Failed to parse memory from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('kalina_ltm', JSON.stringify(ltm));
    } catch (e) {
        console.error("Failed to save LTM to localStorage", e);
    }
  }, [ltm]);

  useEffect(() => {
    try {
        localStorage.setItem('kalina_code_memory', JSON.stringify(codeMemory));
    } catch (e) {
        console.error("Failed to save Code Memory to localStorage", e);
    }
    }, [codeMemory]);

  const updateConversation = (conversationId: string, updater: (convo: Conversation) => Conversation) => {
      setConversations(prev =>
          prev.map(c =>
              c.id === conversationId ? updater(c) : c
          )
      );
  };

  const updateConversationMessages = (conversationId: string, updater: (messages: ChatMessageType[]) => ChatMessageType[]) => {
      updateConversation(conversationId, c => ({ ...c, messages: updater(c.messages) }));
  };
  
  useEffect(() => {
    const cleanup = () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    };
    window.addEventListener('beforeunload', cleanup);
    return () => {
        cleanup();
        window.removeEventListener('beforeunload', cleanup);
    };
  }, []);

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
          if (msg.file) {
              parts.push({ inlineData: { data: msg.file.base64, mimeType: msg.file.mimeType } });
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
  
  const handleNewChat = useCallback(() => {
    const newConversationId = crypto.randomUUID();
    const newConversation: Conversation = {
        id: newConversationId,
        title: "New Chat",
        messages: [],
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversationId);

    setError(null);
    clearThinkingIntervals();
    setIsLoading(false);
    setIsThinking(false);
    setIsSearchingWeb(false);
    setSelectedTool('smart');
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
    setActiveSuggestion(null);
    setCurrentView('chat');
    setIsHistorySheetOpen(false);
  }, [clearThinkingIntervals]);

  const handleExecuteImageGeneration = useCallback(async (options: ImageGenerationOptions) => {
    if (!apiKey || !activeConversationId) return;

    const conversationForTitle = conversations.find(c => c.id === activeConversationId);
    const shouldGenerateTitle = conversationForTitle?.messages.length === 0;

    setIsImageOptionsOpen(false);
    setIsLoading(true);
    setError(null);
    
    updateConversationMessages(activeConversationId, prev => [...prev, { id: crypto.randomUUID(), role: 'model', content: '', isGeneratingImage: true, imageGenerationCount: options.count, aspectRatio: options.aspectRatio }]);
    
    try {
      const { images: generatedImagesBase64 } = await generateImage(imageGenerationPrompt, options.count, options.aspectRatio);
      setAllGeneratedImages(prev => [...prev, ...generatedImagesBase64]);
      updateConversationMessages(activeConversationId, prev => {
        const newMessages = [...prev];
        const lastMessageIndex = newMessages.length - 1;
        newMessages[lastMessageIndex] = {
          ...newMessages[lastMessageIndex],
          isGeneratingImage: false,
          generatedImagesBase64: generatedImagesBase64,
        };
        return newMessages;
      });

      if (shouldGenerateTitle) {
         setConversations(prev => prev.map(c => c.id === activeConversationId ? {...c, title: "Image Generation" } : c));
      }

    } catch (e: any) {
      const friendlyError = getFriendlyErrorMessage(e);
      setError(friendlyError);
      updateConversationMessages(activeConversationId, prev => {
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
  }, [apiKey, imageGenerationPrompt, activeConversationId, conversations]);
  
  const handleSendMessage = useCallback(async (prompt: string, image?: { base64: string; mimeType: string; }, file?: { base64: string; mimeType: string; name: string; }) => {
    const fullPrompt = prompt;
    if ((!fullPrompt.trim() && !image && !file) || isLoading || !apiKey) return;
    
    let currentConversationId = activeConversationId;
    let isFirstTurnInConversation = false;
    
    if (!currentConversationId) {
        const newId = crypto.randomUUID();
        const newConversation: Conversation = { id: newId, title: "New Chat", messages: [] };
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newId);
        currentConversationId = newId;
        isFirstTurnInConversation = true;
    } else {
        const currentConvo = conversations.find(c => c.id === currentConversationId);
        if (currentConvo && currentConvo.messages.length === 0) {
            isFirstTurnInConversation = true;
        }
    }

    setError(null);
    setIsLoading(true);

    const newUserMessage: ChatMessageType = { id: crypto.randomUUID(), role: 'user', content: fullPrompt, image: image, file: file };
    const planningMessage: ChatMessageType = { id: crypto.randomUUID(), role: 'model', content: '', isPlanning: true };
    updateConversationMessages(currentConversationId, prev => [...prev, newUserMessage, planningMessage]);

    try {
        const plan = await planResponse(fullPrompt, image, file, selectedChatModel);
        
        let isThinkingEnabled = plan.needsThinking;
        let isWebSearchEnabled = plan.needsWebSearch;
        let isImageGeneration = !image && plan.isImageGenerationRequest;
        let isImageEdit = !!image && plan.isImageEditRequest;

        if (selectedTool === 'imageGeneration') {
            isImageGeneration = !image;
            isImageEdit = !!image;
            isWebSearchEnabled = false;
            isThinkingEnabled = false;
        } else if (selectedTool === 'thinking') {
            isThinkingEnabled = true;
            isWebSearchEnabled = false;
            isImageGeneration = false;
            isImageEdit = false;
        } else if (selectedTool === 'webSearch') {
            isWebSearchEnabled = true;
            isImageGeneration = false;
            isImageEdit = false;
            isThinkingEnabled = false;
        }

        if (isFirstTurnInConversation && isImageGeneration) {
             setConversations(prev => prev.map(c => c.id === currentConversationId ? {...c, title: "Image Generation" } : c));
        }

        if (isImageEdit && image) {
            updateConversationMessages(currentConversationId, prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    isPlanning: false,
                    isEditingImage: true,
                    imageGenerationCount: 1
                };
                return updated;
            });

            try {
                const result = await editImage(fullPrompt, image);
                updateConversationMessages(currentConversationId, prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        isEditingImage: false,
                        content: result.textResponse,
                        generatedImagesBase64: result.editedImageBase64 ? [result.editedImageBase64] : undefined,
                        inputTokens: result.usageMetadata?.promptTokenCount,
                        outputTokens: result.usageMetadata?.candidatesTokenCount,
                    };
                    return updated;
                });
                if (result.editedImageBase64) {
                    setAllGeneratedImages(prev => [...prev, result.editedImageBase64!]);
                }
            } catch(editError: any) {
                const friendlyError = getFriendlyErrorMessage(editError);
                setError(friendlyError);
                 updateConversationMessages(currentConversationId, prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        isEditingImage: false,
                        content: `Sorry, I couldn't edit the image: ${friendlyError.message}`,
                    };
                    return updated;
                });
            }
            setIsLoading(false);
            return;
        } else if (isImageGeneration) {
            updateConversationMessages(currentConversationId, prev => prev.slice(0, -1)); 
            setImageGenerationPrompt(fullPrompt);
            setIsImageOptionsOpen(true);
            return;
        }
        
        updateConversationMessages(currentConversationId, prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.isPlanning) {
                 newMessages[newMessages.length - 1] = { ...lastMessage, isPlanning: false, thoughts: plan.thoughts, thinkingDuration: 0 };
            }
            return newMessages;
        });

        if (isThinkingEnabled && plan.thoughts.length > 0) {
            setIsThinking(true);
            thinkingStepRef.current = 0;
            thinkingTimeRef.current = 0;
            
            thinkingTimerRef.current = setInterval(() => {
                thinkingTimeRef.current += 0.1;
                 updateConversationMessages(currentConversationId, prev => {
                    const updated = [...prev];
                    if (updated.length > 0) {
                        const last = updated[updated.length - 1];
                        if(last?.role === 'model') {
                           updated[updated.length-1] = {...last, thinkingDuration: thinkingTimeRef.current };
                        }
                    }
                    return updated;
                });
            }, 100);

            const totalSteps = plan.thoughts.length;
            const avgTimePerStep = Math.max(500, 3000 / totalSteps);

            const runThinkingStep = () => {
                if (thinkingStepRef.current < totalSteps) {
                     updateConversationMessages(currentConversationId, prev => {
                        const updated = [...prev];
                        if (updated.length > 0) {
                            const last = updated[updated.length - 1];
                            if(last?.role === 'model') {
                                updated[updated.length-1] = { ...last, thoughts: plan.thoughts.slice(0, thinkingStepRef.current + 1) };
                            }
                        }
                        return updated;
                    });
                    thinkingStepRef.current++;
                    thinkingIntervalRef.current = setTimeout(runThinkingStep, avgTimePerStep);
                }
            };
            runThinkingStep();
        }

        if (isWebSearchEnabled) {
            setIsSearchingWeb(true);
        }
        
        const currentConversationState = conversations.find(c => c.id === currentConversationId);
        const summary = currentConversationState?.summary;
        const lastFourMessages = currentConversationState ? currentConversationState.messages.slice(-5, -1) : [];
        
        let retrievedCodeSnippets: CodeSnippet[] = [];
        if (plan.needsCodeContext && codeMemory.length > 0) {
            const codeDescriptions = codeMemory.map(({ id, description }) => ({ id, description }));
            const relevantIds = await findRelevantCode(fullPrompt, codeDescriptions);
            retrievedCodeSnippets = codeMemory.filter(snippet => relevantIds.includes(snippet.id));
        }

        const historyForChat = transformMessagesToHistory(lastFourMessages);
        
        const contextMessages: Content[] = [];
        if (summary) {
            contextMessages.push({ role: 'user', parts: [{ text: `[START OF CONTEXT]\nHere is a summary of our conversation so far:\n${summary}\n[END OF CONTEXT]` }] });
            contextMessages.push({ role: 'model', parts: [{ text: "Understood. I will use this summary for context." }] });
        }
        if (retrievedCodeSnippets.length > 0) {
            const codeContext = retrievedCodeSnippets.map(s => `Language: ${s.language}\nDescription: ${s.description}\nCode:\n\`\`\`${s.language}\n${s.code}\n\`\`\``).join('\n---\n');
            contextMessages.push({ role: 'user', parts: [{ text: `[START OF CONTEXT]\nI have retrieved the following saved code snippets that might be relevant:\n${codeContext}\n[END OF CONTEXT]` }] });
            contextMessages.push({ role: 'model', parts: [{ text: "Understood. I will use these code snippets if they are relevant to the user's request." }] });
        }
        
        const modelName = models.find(m => m.id === selectedChatModel)?.name || 'Kalina AI';
        const chat = startChatSession(selectedChatModel, isThinkingEnabled, isWebSearchEnabled, modelName, ltm, isFirstTurnInConversation, [...contextMessages, ...historyForChat]);

        const parts: Part[] = [
            ...(image ? [{ inlineData: { data: image.base64, mimeType: image.mimeType } }] : []),
            ...(file ? [{ inlineData: { data: file.base64, mimeType: file.mimeType } }] : []),
            ...(fullPrompt ? [{ text: fullPrompt }] : []),
        ];

        if (parts.length === 0) throw new Error("Cannot send an empty message.");
        
        const stream = await chat.sendMessageStream({ message: parts });
        
        let finalModelResponse = '';
        let titleExtracted = false;
        let usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number; } | undefined = undefined;

        for await (const chunk of stream) {
            if (thinkingIntervalRef.current) {
                clearThinkingIntervals();
                setIsThinking(false);
            }
            setIsSearchingWeb(false);
            
            if (chunk.usageMetadata) usageMetadata = chunk.usageMetadata;

            finalModelResponse += chunk.text;
            let displayContent = finalModelResponse;

            if (isFirstTurnInConversation && !titleExtracted) {
                const titleMatch = displayContent.match(/^TITLE:\s*(.*)\n?/);
                if (titleMatch && titleMatch[1]) {
                    const extractedTitle = titleMatch[1].trim();
                    updateConversation(currentConversationId, c => ({ ...c, title: extractedTitle, isGeneratingTitle: false }));
                    displayContent = displayContent.replace(/^TITLE:\s*.*\n?/, '');
                    titleExtracted = true;
                } else if (displayContent.length > 50 && !displayContent.includes('TITLE:')) {
                    updateConversation(currentConversationId, c => ({ ...c, isGeneratingTitle: false }));
                    titleExtracted = true;
                }
            }

            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
            const sources: GroundingChunk[] | undefined = groundingMetadata?.groundingChunks?.map((c: any) => c);

            updateConversationMessages(currentConversationId, prevMessages => {
                const lastMessage = prevMessages[prevMessages.length - 1];
                if (lastMessage && lastMessage.role === 'model') {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[prevMessages.length - 1] = {
                        ...lastMessage,
                        content: displayContent,
                        sources: sources,
                        isPlanning: false,
                        isGeneratingImage: false,
                    };
                    return updatedMessages;
                }
                return prevMessages;
            });
        }
        
        if (usageMetadata) {
             updateConversationMessages(currentConversationId, prevMessages => {
                const lastMessage = prevMessages[prevMessages.length - 1];
                if (lastMessage && lastMessage.role === 'model') {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[prevMessages.length - 1] = {
                        ...lastMessage,
                        inputTokens: usageMetadata.promptTokenCount,
                        outputTokens: usageMetadata.candidatesTokenCount,
                    };
                    return updatedMessages;
                }
                return prevMessages;
            });
        }

        const finalCleanedResponse = finalModelResponse.replace(/^\s*TITLE:\s*[^\n]*\n?/, '');

        const finalConversationState = conversations.find(c => c.id === currentConversationId);
        if (finalConversationState) {
            const messageCount = finalConversationState.messages.length;
            if (messageCount > 1 && messageCount % 6 === 0) {
                const messagesToSummarize = finalConversationState.messages.slice(-6);
                summarizeConversation(transformMessagesToHistory(messagesToSummarize), finalConversationState.summary).then(newSummary => {
                    updateConversation(currentConversationId, c => ({...c, summary: newSummary }));
                }).catch(err => console.error("Background summarization failed:", err));
            }

            const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
            let match;
            const codeContextForSaving = transformMessagesToHistory(finalConversationState.messages.slice(-2));
            while ((match = codeBlockRegex.exec(finalCleanedResponse)) !== null) {
                const language = match[1] || 'text';
                const code = match[2];
                processAndSaveCode({ language, code }, codeContextForSaving).then(result => {
                    const newSnippet: CodeSnippet = { id: crypto.randomUUID(), ...result, language, code };
                    setCodeMemory(prev => [...prev, newSnippet]);
                }).catch(err => console.error("Background code processing failed:", err));
            }

            if (finalCleanedResponse.trim()) {
                const messagesForMemory: Content[] = [
                    { role: 'user', parts: [{ text: fullPrompt }] },
                    { role: 'model', parts: [{ text: finalCleanedResponse }] }
                ];
                updateMemory(messagesForMemory, ltm, selectedChatModel).then(newMemories => {
                    if (newMemories.length > 0) {
                        const uniqueNewMemories = newMemories.filter(mem => !ltm.includes(mem));
                        if (uniqueNewMemories.length > 0) {
                            setLtm(prev => [...prev, ...uniqueNewMemories]);
                            updateConversationMessages(currentConversationId, prev => {
                                const last = prev[prev.length - 1];
                                if (last?.role === 'model') {
                                    return [...prev.slice(0, -1), { ...last, memoryUpdated: true }];
                                }
                                return prev;
                            });
                        }
                    }
                }).catch(err => console.error("Background memory update failed:", err));
            }
        }

    } catch (e: any) {
        const friendlyError = getFriendlyErrorMessage(e);
        setError(friendlyError);
        updateConversationMessages(currentConversationId, prev => {
            if (prev.length === 0) return prev;
            const newMessages = [...prev];
            const lastMessageIndex = newMessages.length - 1;
            const lastMessage = newMessages[lastMessageIndex];
            
            newMessages[lastMessageIndex] = {
                ...lastMessage,
                isPlanning: false,
                isGeneratingImage: false,
                isEditingImage: false,
                content: `Sorry, I encountered an error: ${friendlyError.message}`,
            };
            
            if (lastMessage.role === 'user') {
                newMessages.push({
                    id: crypto.randomUUID(),
                    role: 'model',
                    content: `Sorry, I encountered an error: ${friendlyError.message}`,
                });
            }
            return newMessages;
        });
    } finally {
        setIsLoading(false);
        clearThinkingIntervals();
        setIsSearchingWeb(false);
        setActiveSuggestion(null);
    }
  }, [isLoading, selectedTool, clearThinkingIntervals, apiKey, activeConversationId, conversations, selectedChatModel, ltm, codeMemory]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setError(null);
    setIsLoading(false);
    setIsThinking(false);
    setIsSearchingWeb(false);
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
    setCurrentView('chat');
    setIsHistorySheetOpen(false);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    updateConversation(id, c => ({ ...c, title: newTitle }));
  };

  const handleDeleteConversation = (id: string) => {
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
          setActiveConversationId(null);
      }
  };

  const handlePinConversation = (id: string) => {
    updateConversation(id, c => ({ ...c, isPinned: !c.isPinned }));
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    if (suggestion.prompt) {
      handleSendMessage(suggestion.prompt);
    }
    setActiveSuggestion(null);
  };
  
  const handleRetry = useCallback(() => {
    if (!activeConversation || activeConversation.messages.length === 0) return;

    let lastModelMessageIndex = -1;
    for (let i = activeConversation.messages.length - 1; i >= 0; i--) {
        if (activeConversation.messages[i].role === 'model') {
            lastModelMessageIndex = i;
            break;
        }
    }

    if (lastModelMessageIndex !== -1) {
      const lastUserMessage = activeConversation.messages[lastModelMessageIndex -1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        updateConversationMessages(activeConversation.id, prev => prev.slice(0, lastModelMessageIndex));
        handleSendMessage(lastUserMessage.content, lastUserMessage.image, lastUserMessage.file);
      }
    }
  }, [activeConversation, handleSendMessage]);

  const handleEditMessage = (index: number, newContent: string) => {
    if (!activeConversation) return;
    const messageToEdit = activeConversation.messages[index];
    if (messageToEdit.role !== 'user') return;
    
    const truncatedMessages = activeConversation.messages.slice(0, index);
    updateConversation(activeConversation.id, c => ({...c, messages: truncatedMessages}));
    handleSendMessage(newContent, messageToEdit.image, messageToEdit.file);
  };

  const handleToggleAudio = (id: string, text: string) => {
    if (speakingMessageId === id) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
    } else {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        if (utteranceRef.current) {
            utteranceRef.current.onend = null;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setSpeakingMessageId(null);
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setSpeakingMessageId(id);
    }
  };

    const handleSetApiKey = (key: string) => {
      try {
          initializeAiClient(key);
          localStorage.setItem('kalina_api_key', key);
          setApiKey(key);
      } catch (e) {
          console.error("Failed to set API key:", e);
          // Here you might want to show an error in the modal
      }
  };
  
  if (!apiKey) {
    return <ApiKeyModal onSetApiKey={handleSetApiKey} />;
  }
  
  const renderCurrentView = () => {
    switch (currentView) {
      case 'gallery':
        return (
          <Gallery
            images={allGeneratedImages}
            onBack={() => setCurrentView('chat')}
            onDeleteImage={(index: number) => {
              setAllGeneratedImages(prev => prev.filter((_, i) => i !== index));
            }}
          />
        );
      case 'memory':
        return (
          <MemoryManagement
            memory={ltm}
            setMemory={setLtm}
            onBack={() => setCurrentView('chat')}
          />
        );
      case 'chat':
      default:
        return (
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-4xl mx-auto h-full">
                {showWelcomeScreen ? (
                  <WelcomeScreen onSelectSuggestion={handleSelectSuggestion} />
                ) : (
                  activeConversation && (
                    <ChatHistory
                      messages={activeConversation.messages}
                      isLoading={isLoading}
                      isThinking={isThinking}
                      isSearchingWeb={isSearchingWeb}
                      onRetry={handleRetry}
                      onEditMessage={handleEditMessage}
                      speakingMessageId={speakingMessageId}
                      onToggleAudio={handleToggleAudio}
                    />
                  )
                )}
              </div>
            </div>
            <div className="p-4 md:p-6 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
              <div className="max-w-4xl mx-auto">
                {selectedTool === 'translator' && <Translator />}
                {selectedTool === 'imageGeneration' && <ImagePromptSuggestions onSelectPrompt={(p) => handleSendMessage(p)} />}
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  selectedTool={selectedTool}
                  onToolChange={setSelectedTool}
                  activeSuggestion={activeSuggestion}
                  onClearSuggestion={() => setActiveSuggestion(null)}
                  onOpenHistory={() => setIsHistorySheetOpen(true)}
                  conversationCount={conversations.length}
                />
              </div>
            </div>
          </main>
        );
    }
  };
  
  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-[#131314] text-gray-900 dark:text-white transition-colors duration-300">
        <Header
            onShowGallery={() => setCurrentView('gallery')}
            onShowMemory={() => setCurrentView('memory')}
            isChatView={currentView === 'chat'}
            models={models}
            selectedChatModel={selectedChatModel}
            onSelectChatModel={setSelectedChatModel}
        />
        
        {renderCurrentView()}
        
        <ImageOptionsModal
            isOpen={isImageOptionsOpen}
            onClose={() => setIsImageOptionsOpen(false)}
            onGenerate={handleExecuteImageGeneration}
            prompt={imageGenerationPrompt}
        />
        <ChatHistorySheet
            isOpen={isHistorySheetOpen}
            onClose={() => setIsHistorySheetOpen(false)}
            conversations={sortedConversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={handleDeleteConversation}
            onPinConversation={handlePinConversation}
        />
    </div>
  );
};

export default App;
