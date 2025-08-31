import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import ChatMessage from './ChatMessage';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isThinking: boolean;
  isSearchingWeb: boolean;
  onRetry: () => void;
  onEditMessage: (index: number, newContent: string) => void;
  onUpdateMessageContent: (messageId: string, newContent: string) => void;
  speakingMessageId: string | null;
  onToggleAudio: (id: string, text: string) => void;
  onCancelStream: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading, isThinking, isSearchingWeb, onRetry, onEditMessage, onUpdateMessageContent, speakingMessageId, onToggleAudio, onCancelStream, scrollContainerRef }) => {
  const [isLockedToBottom, setIsLockedToBottom] = useState(true);

  // Effect to auto-scroll when new messages stream in, if the user is already at the bottom.
  useEffect(() => {
    if (isLockedToBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading, isThinking, isSearchingWeb, isLockedToBottom, scrollContainerRef]);

  // Effect to track user scrolling and determine if we should lock to the bottom.
  useEffect(() => {
    const scrollableElement = scrollContainerRef.current;
    if (!scrollableElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
      // A small threshold ensures that the user is truly at the bottom before locking.
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsLockedToBottom(atBottom);
    };

    scrollableElement.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => scrollableElement.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  return (
    <div className="space-y-6 pb-2">
      {messages.map((msg, index) => {
        const isLastMessage = index === messages.length - 1;
        const canRetry = isLastMessage && msg.role === 'model' && !isLoading && !isThinking && !msg.isGeneratingImage && !msg.isPlanning;
        const isStreamingNow = isLoading && isLastMessage && !msg.isGeneratingImage && !msg.isPlanning && !msg.isEditingImage;

        return (
          <ChatMessage 
            key={msg.id} 
            {...msg}
            isStreaming={isStreamingNow}
            isThinking={isThinking && index === messages.length - 1}
            isSearchingWeb={isSearchingWeb && index === messages.length - 1}
            onRetry={canRetry ? onRetry : undefined}
            index={index}
            onEditMessage={msg.role === 'user' ? onEditMessage : undefined}
            onUpdateMessageContent={onUpdateMessageContent}
            isSpeaking={msg.id === speakingMessageId}
            onToggleAudio={onToggleAudio}
            onCancelStream={isStreamingNow ? onCancelStream : undefined}
          />
        );
      })}
      <div className="h-2" />
    </div>
  );
};

export default ChatHistory;