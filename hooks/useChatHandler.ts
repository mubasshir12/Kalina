import React, { useState, useRef, useCallback } from 'react';
import { Content, Part } from '@google/genai';
import { ChatMessage as ChatMessageType, Suggestion, ChatModel, LTM, CodeSnippet, GroundingChunk } from '../types';
import { initializeAiClient } from '../services/aiClient';
import { startChatSession } from '../services/chatService';
import { planResponse } from '../services/geminiService';
import { generateImage, editImage } from '../services/imageService';
import { updateMemory, summarizeConversation } from '../services/memoryService';
import { processAndSaveCode, findRelevantCode } from '../services/codeService';
import { ImageGenerationOptions } from '../components/ImageOptionsModal';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

const models = [
    { id: 'gemini-2.5-flash', name: 'Kalina 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Kalina 2.5 Pro' },
];

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

export const useChatHandler = ({
    apiKey,
    conversations,
    activeConversationId,
    ltm,
    codeMemory,
    selectedTool,
    selectedChatModel,
    imageGenerationPrompt,
    updateConversation,
    updateConversationMessages,
    setConversations,
    setActiveConversationId,
    setLtm,
    setCodeMemory,
    setAllGeneratedImages,
    setIsImageOptionsOpen,
    setImageGenerationPrompt,
    setActiveSuggestion
}) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isThinking, setIsThinking] = useState<boolean>(false);
    const [isSearchingWeb, setIsSearchingWeb] = useState<boolean>(false);
    const [error, setError] = useState(null);

    const thinkingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const thinkingTimeRef = useRef(0);

    const clearThinkingIntervals = useCallback(() => {
        if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
        if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
        thinkingIntervalRef.current = null;
        thinkingTimerRef.current = null;
        setIsThinking(false);
    }, []);

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
                updateConversation(activeConversationId, c => ({ ...c, title: "Image Generation" }));
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
    }, [apiKey, imageGenerationPrompt, activeConversationId, conversations, updateConversation, updateConversationMessages, setAllGeneratedImages, setIsImageOptionsOpen, setIsLoading, setError]);

    const handleSendMessage = useCallback(async (prompt: string, image?: { base64: string; mimeType: string; }, file?: { base64: string; mimeType: string; name: string; }) => {
        const fullPrompt = prompt;
        if ((!fullPrompt.trim() && !image && !file) || isLoading || !apiKey) return;

        let currentConversationId = activeConversationId;
        let isFirstTurnInConversation = false;

        if (!currentConversationId) {
            const newId = crypto.randomUUID();
            setConversations(prev => [{ id: newId, title: "New Chat", messages: [] }, ...prev]);
            setActiveConversationId(newId);
            currentConversationId = newId;
            isFirstTurnInConversation = true;
        } else {
            const currentConvo = conversations.find(c => c.id === currentConversationId);
            isFirstTurnInConversation = currentConvo?.messages.length === 0;
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
                updateConversation(currentConversationId, c => ({ ...c, title: "Image Generation" }));
            }

            if (isImageEdit && image) {
                updateConversationMessages(currentConversationId, prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], isPlanning: false, isEditingImage: true, imageGenerationCount: 1 };
                    return updated;
                });

                const result = await editImage(fullPrompt, image);
                updateConversationMessages(currentConversationId, prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], isEditingImage: false, content: result.textResponse, generatedImagesBase64: result.editedImageBase64 ? [result.editedImageBase64] : undefined, inputTokens: result.usageMetadata?.promptTokenCount, outputTokens: result.usageMetadata?.candidatesTokenCount };
                    return updated;
                });
                if (result.editedImageBase64) setAllGeneratedImages(prev => [...prev, result.editedImageBase64!]);
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
                if (newMessages[newMessages.length - 1]?.isPlanning) {
                    newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], isPlanning: false, thoughts: plan.thoughts };
                }
                return newMessages;
            });
            
            if (isThinkingEnabled && plan.thoughts.length > 0) {
                setIsThinking(true);
                thinkingTimeRef.current = 0;
                thinkingTimerRef.current = setInterval(() => {
                    thinkingTimeRef.current += 0.1;
                    updateConversationMessages(currentConversationId, prev => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last?.role === 'model') {
                            updated[updated.length-1] = {...last, thinkingDuration: thinkingTimeRef.current };
                        }
                        return updated;
                    });
                }, 100);
            }

            if (isWebSearchEnabled) setIsSearchingWeb(true);

            const currentConversationState = conversations.find(c => c.id === currentConversationId);
            const summary = currentConversationState?.summary;
            const lastFourMessages = currentConversationState ? currentConversationState.messages.slice(-5, -1) : [];
            
            let retrievedCodeSnippets: CodeSnippet[] = [];
            if (plan.needsCodeContext && codeMemory.length > 0) {
                const codeDescriptions = codeMemory.map(({ id, description }) => ({ id, description }));
                const relevantIds = await findRelevantCode(fullPrompt, codeDescriptions);
                retrievedCodeSnippets = codeMemory.filter(snippet => relevantIds.includes(snippet.id));
            }

            const modelName = models.find(m => m.id === selectedChatModel)?.name || 'Kalina AI';
            const chat = startChatSession(selectedChatModel, isThinkingEnabled, isWebSearchEnabled, modelName, ltm, isFirstTurnInConversation, transformMessagesToHistory(lastFourMessages), summary, retrievedCodeSnippets);

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
            let thinkingCleared = false;

            for await (const chunk of stream) {
                if (!thinkingCleared && chunk.text) {
                    if (isThinking) {
                        clearThinkingIntervals();
                    }
                    if (isSearchingWeb) {
                        setIsSearchingWeb(false);
                    }
                    thinkingCleared = true;
                }

                if (chunk.usageMetadata) usageMetadata = chunk.usageMetadata;
                finalModelResponse += chunk.text;
                
                let displayContent = finalModelResponse;
                if (isFirstTurnInConversation) {
                    const titleMatch = displayContent.match(/^\s*TITLE:\s*([^\n]+)/);
                    if (titleMatch && titleMatch[1] && !titleExtracted) {
                        updateConversation(currentConversationId, c => ({ ...c, title: titleMatch[1].trim(), isGeneratingTitle: false }));
                        titleExtracted = true;
                    } else if (displayContent.length > 50 && !displayContent.includes('TITLE:')) {
                        if(!titleExtracted) updateConversation(currentConversationId, c => ({ ...c, isGeneratingTitle: false }));
                        titleExtracted = true;
                    }
                    displayContent = displayContent.replace(/^\s*TITLE:\s*[^\n]*\n?/, '');
                }

                const sources: GroundingChunk[] | undefined = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c);

                updateConversationMessages(currentConversationId, prevMessages => {
                    const lastMessage = prevMessages[prevMessages.length - 1];
                    if (lastMessage?.role === 'model') {
                        const updatedMessages = [...prevMessages];
                        updatedMessages[prevMessages.length - 1] = { ...lastMessage, content: displayContent, sources, isPlanning: false, isGeneratingImage: false };
                        return updatedMessages;
                    }
                    // This case handles adding the very first model message chunk
                    return [...prevMessages, { id: crypto.randomUUID(), role: 'model', content: displayContent, sources }];
                });
            }

            if (usageMetadata) {
                updateConversationMessages(currentConversationId, prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.role === 'model') {
                        return [...prev.slice(0, -1), { ...lastMessage, inputTokens: usageMetadata.promptTokenCount, outputTokens: usageMetadata.candidatesTokenCount }];
                    }
                    return prev;
                });
            }

            const finalCleanedResponse = finalModelResponse.replace(/^\s*TITLE:\s*[^\n]*\n?/, '');
            const finalConversationState = conversations.find(c => c.id === currentConversationId);
            if (finalConversationState) {
                if (finalConversationState.messages.length > 1 && finalConversationState.messages.length % 6 === 0) {
                    summarizeConversation(transformMessagesToHistory(finalConversationState.messages.slice(-6)), finalConversationState.summary)
                        .then(newSummary => updateConversation(currentConversationId, c => ({...c, summary: newSummary })));
                }

                const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
                let match;
                const codeContextForSaving = transformMessagesToHistory(finalConversationState.messages.slice(-2));
                while ((match = codeBlockRegex.exec(finalCleanedResponse)) !== null) {
                    const capturedMatch = match;
                    processAndSaveCode({ language: capturedMatch[1] || 'text', code: capturedMatch[2] }, codeContextForSaving)
                        .then(result => setCodeMemory(prev => [...prev, { id: crypto.randomUUID(), ...result, language: capturedMatch[1] || 'text', code: capturedMatch[2] }]));
                }

                if (finalCleanedResponse.trim()) {
                    updateMemory([{ role: 'user', parts: [{ text: fullPrompt }] }, { role: 'model', parts: [{ text: finalCleanedResponse }] }], ltm, selectedChatModel)
                        .then(newMemories => {
                            if (newMemories.length > 0) {
                                const uniqueNewMemories = newMemories.filter(mem => !ltm.includes(mem));
                                if (uniqueNewMemories.length > 0) {
                                    setLtm(prev => [...prev, ...uniqueNewMemories]);
                                    updateConversationMessages(currentConversationId, prev => {
                                        const last = prev[prev.length - 1];
                                        return last?.role === 'model' ? [...prev.slice(0, -1), { ...last, memoryUpdated: true }] : prev;
                                    });
                                }
                            }
                        });
                }
            }
        } catch (e: any) {
            const friendlyError = getFriendlyErrorMessage(e);
            setError(friendlyError);
            updateConversationMessages(currentConversationId, prev => {
                if (prev.length === 0) return prev;
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                newMessages[newMessages.length - 1] = { ...lastMessage, isPlanning: false, isGeneratingImage: false, isEditingImage: false, content: `Sorry, I encountered an error: ${friendlyError.message}` };
                if (lastMessage.role === 'user') {
                    newMessages.push({ id: crypto.randomUUID(), role: 'model', content: `Sorry, I encountered an error: ${friendlyError.message}` });
                }
                return newMessages;
            });
        } finally {
            setIsLoading(false);
            clearThinkingIntervals();
            setIsSearchingWeb(false);
            setActiveSuggestion(null);
        }
    }, [
        apiKey, isLoading, activeConversationId, conversations, selectedChatModel, selectedTool, ltm, codeMemory,
        setConversations, setActiveConversationId, setError, setIsLoading, updateConversationMessages, 
        updateConversation, setAllGeneratedImages, setImageGenerationPrompt, setIsImageOptionsOpen, 
        setIsThinking, setIsSearchingWeb, setCodeMemory, setLtm, setActiveSuggestion, clearThinkingIntervals
    ]);

    const handleRetry = useCallback(() => {
        const activeConversation = conversations.find(c => c.id === activeConversationId);
        if (!activeConversation || activeConversation.messages.length === 0) return;

        const lastModelMessageIndex = activeConversation.messages.findLastIndex(m => m.role === 'model');
        if (lastModelMessageIndex !== -1) {
            const lastUserMessage = activeConversation.messages[lastModelMessageIndex - 1];
            if (lastUserMessage?.role === 'user') {
                updateConversationMessages(activeConversation.id, prev => prev.slice(0, lastModelMessageIndex));
                handleSendMessage(lastUserMessage.content, lastUserMessage.image, lastUserMessage.file);
            }
        }
    }, [activeConversationId, conversations, updateConversationMessages, handleSendMessage]);

    const handleEditMessage = (index: number, newContent: string) => {
        const activeConversation = conversations.find(c => c.id === activeConversationId);
        if (!activeConversation) return;
        
        const messageToEdit = activeConversation.messages[index];
        if (messageToEdit.role !== 'user') return;
        
        updateConversationMessages(activeConversation.id, prev => prev.slice(0, index));
        handleSendMessage(newContent, messageToEdit.image, messageToEdit.file);
    };

    return {
        isLoading,
        isThinking,
        isSearchingWeb,
        error,
        setError,
        setIsLoading,
        setIsThinking,
        setIsSearchingWeb,
        clearThinkingIntervals,
        handleSendMessage,
        handleExecuteImageGeneration,
        handleRetry,
        handleEditMessage,
    };
};
