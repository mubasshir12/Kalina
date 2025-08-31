
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Suggestion, Tool, ChatModel, ModelInfo } from './types';
import { initializeAiClient } from './services/aiClient';
import Header from './components/Header';
import ChatInput from './components/ChatInput';
import ImageOptionsModal from './components/ImageOptionsModal';
import ApiKeyModal from './components/ApiKeyModal';
import ChatHistorySheet from './components/ChatHistorySheet';
import ImagePromptSuggestions from './components/ImagePromptSuggestions';
import Translator from './components/Translator';
import ViewRenderer from './components/ViewRenderer';
import { useConversations } from './hooks/useConversations';
import { useMemory } from './hooks/useMemory';
import { useAudio } from './hooks/useAudio';
import { useChatHandler } from './hooks/useChatHandler';
import ConfirmationModal from './components/ConfirmationModal';
import { X } from 'lucide-react';

const models: ModelInfo[] = [
    { id: 'gemini-2.5-flash', name: 'Kalina 2.5 Flash', description: 'Optimized for speed and efficiency.' },
    { id: 'gemini-2.5-pro', name: 'Kalina 2.5 Pro', description: 'Advanced capabilities for complex tasks.' },
];

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
    const [selectedTool, setSelectedTool] = useState<Tool>('smart');
    const [selectedChatModel, setSelectedChatModel] = useState<ChatModel>('gemini-2.5-flash');
    const [isImageOptionsOpen, setIsImageOptionsOpen] = useState(false);
    const [imageGenerationPrompt, setImageGenerationPrompt] = useState('');
    const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
    const [allGeneratedImages, setAllGeneratedImages] = useState<string[]>([]);
    const [currentView, setCurrentView] = useState<'chat' | 'gallery' | 'memory'>('chat');
    const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
    const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const conversationManager = useConversations();
    const { ltm, setLtm, codeMemory, setCodeMemory } = useMemory();
    const { speakingMessageId, handleToggleAudio, stopAudio, setSpeakingMessageId } = useAudio();
    
    const chatHandler = useChatHandler({
        apiKey,
        conversations: conversationManager.conversations,
        activeConversationId: conversationManager.activeConversationId,
        ltm,
        codeMemory,
        selectedTool,
        selectedChatModel,
        imageGenerationPrompt,
        updateConversation: conversationManager.updateConversation,
        updateConversationMessages: conversationManager.updateConversationMessages,
        setConversations: conversationManager.setConversations,
        setActiveConversationId: conversationManager.setActiveConversationId,
        setLtm,
        setCodeMemory,
        setAllGeneratedImages,
        setIsImageOptionsOpen,
        setImageGenerationPrompt,
        setActiveSuggestion
    });

    const { activeConversation, sortedConversations, handleNewChat, handleSelectConversation } = conversationManager;
    const { handleSendMessage, handleRetry, handleEditMessage, handleUpdateMessageContent, handleCancelStream, elapsedTime } = chatHandler;

    const showWelcomeScreen = !activeConversation || activeConversation.messages.length === 0;

    useEffect(() => {
        const storedApiKey = localStorage.getItem('kalina_api_key');
        if (storedApiKey) {
            try {
                initializeAiClient(storedApiKey);
                setApiKey(storedApiKey);
            } catch (e) {
                console.error("Failed to initialize with stored API key:", e);
                localStorage.removeItem('kalina_api_key');
                setIsApiKeyModalOpen(true);
            }
        } else {
            setIsApiKeyModalOpen(true);
        }
    }, []);

    const resetStateForNewChat = useCallback(() => {
        chatHandler.setError(null);
        chatHandler.clearThinkingIntervals();
        chatHandler.setIsLoading(false);
        chatHandler.setIsThinking(false);
        chatHandler.setIsSearchingWeb(false);
        setSelectedTool('smart');
        stopAudio();
        setActiveSuggestion(null);
        setCurrentView('chat');
        setIsHistorySheetOpen(false);
    }, [chatHandler, stopAudio]);

    const onNewChat = useCallback(() => {
        handleNewChat();
        resetStateForNewChat();
    }, [handleNewChat, resetStateForNewChat]);

    const onSelectConversation = (id: string) => {
        handleSelectConversation(id);
        resetStateForNewChat();
    };

    const handleSelectSuggestion = (suggestion: Suggestion) => {
        if (suggestion.prompt) {
            setActiveSuggestion(suggestion);
        }
    };

    const handleSetApiKey = (key: string) => {
        try {
            initializeAiClient(key);
            localStorage.setItem('kalina_api_key', key);
            setApiKey(key);
            setIsApiKeyModalOpen(false);
        } catch (e) {
            console.error("Failed to set API key:", e);
        }
    };

    const handleSendMessageWrapper = (prompt: string, image?: { base64: string; mimeType: string; }, file?: { base64: string; mimeType: string; name: string; }) => {
        handleSendMessage(prompt, image, file);
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth',
                });
            }
        }, 100);
    };
    
    const onConfirmCancelStream = () => {
        handleCancelStream();
        setIsStopConfirmOpen(false);
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
                apiKey={apiKey}
                onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />

            <ViewRenderer
                currentView={currentView}
                showWelcomeScreen={showWelcomeScreen}
                activeConversation={activeConversation}
                isLoading={chatHandler.isLoading}
                isThinking={chatHandler.isThinking}
                isSearchingWeb={chatHandler.isSearchingWeb}
                speakingMessageId={speakingMessageId}
                allGeneratedImages={allGeneratedImages}
                ltm={ltm}
                handleRetry={handleRetry}
                handleEditMessage={handleEditMessage}
                handleUpdateMessageContent={handleUpdateMessageContent}
                handleToggleAudio={handleToggleAudio}
                handleSelectSuggestion={handleSelectSuggestion}
                handleCancelStream={handleCancelStream}
                setCurrentView={setCurrentView}
                setAllGeneratedImages={setAllGeneratedImages}
                setLtm={setLtm}
                scrollContainerRef={scrollContainerRef}
            />

            {currentView === 'chat' && (
                <div className="p-4 md:p-6 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
                    <div className="max-w-4xl mx-auto relative">
                        {(selectedTool === 'translator' || selectedTool === 'imageGeneration') && (
                            <button
                                onClick={() => setSelectedTool('smart')}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors z-10 mb-4"
                                aria-label="Close tool"
                                title="Return to Smart Mode"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}

                        {selectedTool === 'translator' && <Translator />}
                        {selectedTool === 'imageGeneration' && <ImagePromptSuggestions onSelectPrompt={(p) => handleSendMessageWrapper(p)} />}
                        
                        {selectedTool !== 'translator' && (
                            <ChatInput
                                onSendMessage={handleSendMessageWrapper}
                                isLoading={chatHandler.isLoading}
                                elapsedTime={elapsedTime}
                                selectedTool={selectedTool}
                                onToolChange={setSelectedTool}
                                activeSuggestion={activeSuggestion}
                                onClearSuggestion={() => setActiveSuggestion(null)}
                                onOpenHistory={() => setIsHistorySheetOpen(true)}
                                conversationCount={conversationManager.conversations.length}
                                onCancelStream={() => setIsStopConfirmOpen(true)}
                            />
                        )}
                    </div>
                </div>
            )}

            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onSetApiKey={handleSetApiKey}
                onClose={() => { if (apiKey) setIsApiKeyModalOpen(false); }}
                currentApiKey={apiKey}
            />

            <ImageOptionsModal
                isOpen={isImageOptionsOpen}
                onClose={() => setIsImageOptionsOpen(false)}
                onGenerate={chatHandler.handleExecuteImageGeneration}
                prompt={imageGenerationPrompt}
            />
            <ChatHistorySheet
                isOpen={isHistorySheetOpen}
                onClose={() => setIsHistorySheetOpen(false)}
                conversations={sortedConversations}
                activeConversationId={conversationManager.activeConversationId}
                onSelectConversation={onSelectConversation}
                onNewChat={onNewChat}
                onRenameConversation={conversationManager.handleRenameConversation}
                onDeleteConversation={conversationManager.handleDeleteConversation}
                onPinConversation={conversationManager.handlePinConversation}
            />
            <ConfirmationModal
                isOpen={isStopConfirmOpen}
                onClose={() => setIsStopConfirmOpen(false)}
                onConfirm={onConfirmCancelStream}
                title="Stop Generation"
                message="Are you sure you want to stop generating the response?"
                confirmButtonText="Stop"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

export default App;
