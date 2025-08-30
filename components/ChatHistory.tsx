import React, { useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import ChatMessage from './ChatMessage';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isThinking: boolean;
  isSearchingWeb: boolean;
  onRetry: () => void;
  onEditMessage: (index: number, newContent: string) => void;
  speakingMessageId: string | null;
  onToggleAudio: (id: string, text: string) => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading, isThinking, isSearchingWeb, onRetry, onEditMessage, speakingMessageId, onToggleAudio }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isThinking, isSearchingWeb]);

  return (
    <div className="space-y-6">
      {messages.map((msg, index) => {
        const isLastMessage = index === messages.length - 1;
        const canRetry = isLastMessage && msg.role === 'model' && !isLoading && !isThinking && !msg.isGeneratingImage && !msg.isPlanning;

        return (
          <ChatMessage 
            key={msg.id} 
            {...msg}
            isStreaming={isLoading && index === messages.length - 1 && !msg.isGeneratingImage && !msg.isPlanning}
            isThinking={isThinking && index === messages.length - 1}
            isSearchingWeb={isSearchingWeb && index === messages.length - 1}
            onRetry={canRetry ? onRetry : undefined}
            index={index}
            onEditMessage={msg.role === 'user' ? onEditMessage : undefined}
            isSpeaking={msg.id === speakingMessageId}
            onToggleAudio={onToggleAudio}
          />
        );
      })}
      <div ref={messagesEndRef} className="h-1" />
    </div>
  );
};

export default ChatHistory;