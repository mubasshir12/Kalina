import React, { useState, useMemo, useEffect } from 'react';
import { Conversation, LTM, Suggestion, ChatMessage as ChatMessageType } from '../types';
import ChatHistory from './ChatHistory';
import WelcomeScreen from './WelcomeScreen';
import Gallery from './Gallery';
import MemoryManagement from './MemoryManagement';
import ConversationNavigator from './ConversationNavigator';

interface ViewRendererProps {
    currentView: 'chat' | 'gallery' | 'memory';
    showWelcomeScreen: boolean;
    activeConversation: Conversation | undefined;
    isLoading: boolean;
    isThinking: boolean;
    isSearchingWeb: boolean;
    speakingMessageId: string | null;
    allGeneratedImages: string[];
    ltm: LTM;
    handleRetry: () => void;
    handleEditMessage: (index: number, newContent: string) => void;
    handleUpdateMessageContent: (messageId: string, newContent: string) => void;
    handleToggleAudio: (id: string, text: string) => void;
    handleSelectSuggestion: (suggestion: Suggestion) => void;
    handleCancelStream: () => void;
    setCurrentView: (view: 'chat' | 'gallery' | 'memory') => void;
    setAllGeneratedImages: React.Dispatch<React.SetStateAction<string[]>>;
    setLtm: React.Dispatch<React.SetStateAction<LTM>>;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
}

const ViewRenderer: React.FC<ViewRendererProps> = ({
    currentView,
    showWelcomeScreen,
    activeConversation,
    isLoading,
    isThinking,
    isSearchingWeb,
    speakingMessageId,
    allGeneratedImages,
    ltm,
    handleRetry,
    handleEditMessage,
    handleUpdateMessageContent,
    handleToggleAudio,
    handleSelectSuggestion,
    handleCancelStream,
    setCurrentView,
    setAllGeneratedImages,
    setLtm,
    scrollContainerRef
}) => {
    const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(null);

    const userMessageIndices = useMemo(() => {
        if (!activeConversation) return [];
        const indices: number[] = [];
        activeConversation.messages.forEach((msg, index) => {
            if (msg.role === 'user') {
                indices.push(index);
            }
        });
        return indices;
    }, [activeConversation]);

    useEffect(() => {
        if (!scrollContainerRef.current || userMessageIndices.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter(entry => entry.isIntersecting);
                if (visibleEntries.length > 0) {
                    const topmostEntry = visibleEntries.reduce((topmost, current) => 
                        current.boundingClientRect.top < topmost.boundingClientRect.top ? current : topmost
                    );
                    const index = parseInt(topmostEntry.target.id.split('-')[1], 10);
                    setActiveMessageIndex(index);
                }
            },
            {
                root: scrollContainerRef.current,
                rootMargin: '0px 0px -50% 0px',
                threshold: 0,
            }
        );

        const elements = userMessageIndices
            .map(index => document.getElementById(`message-${index}`))
            .filter((el): el is HTMLElement => el !== null);

        elements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [userMessageIndices, scrollContainerRef]);

    const handleNavigateToMessage = (index: number) => {
        const element = document.getElementById(`message-${index}`);
        element?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

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
            const showNavigators = !showWelcomeScreen && activeConversation && userMessageIndices.length > 1;
            return (
                <main className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 relative">
                        <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto p-4 md:p-6">
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
                                            onUpdateMessageContent={handleUpdateMessageContent}
                                            speakingMessageId={speakingMessageId}
                                            onToggleAudio={handleToggleAudio}
                                            onCancelStream={handleCancelStream}
                                            scrollContainerRef={scrollContainerRef}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                        {showNavigators && (
                            <ConversationNavigator
                                userMessageIndices={userMessageIndices}
                                activeMessageIndex={activeMessageIndex}
                                onDotClick={handleNavigateToMessage}
                            />
                        )}
                    </div>
                </main>
            );
    }
};

export default ViewRenderer;