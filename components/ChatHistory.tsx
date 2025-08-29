
import React, { useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import ChatMessage from './ChatMessage';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isThinking: boolean;
  isSearchingWeb: boolean;
  onRetry: () => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading, isThinking, isSearchingWeb, onRetry }) => {
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
        const canRetry = isLastMessage && msg.role === 'model' && !isLoading && !isThinking && !msg.isGeneratingImage;

        return (
          <ChatMessage 
            key={index} 
            role={msg.role} 
            content={msg.content}
            image={msg.image}
            sources={msg.sources}
            thoughts={msg.thoughts}
            thinkingDuration={msg.thinkingDuration}
            isStreaming={isLoading && index === messages.length - 1 && !msg.isGeneratingImage}
            isThinking={isThinking && index === messages.length - 1}
            isSearchingWeb={isSearchingWeb && index === messages.length - 1}
            isGeneratingImage={msg.isGeneratingImage}
            generatedImagesBase64={msg.generatedImagesBase64}
            imageGenerationCount={msg.imageGenerationCount}
            onRetry={canRetry ? onRetry : undefined}
          />
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatHistory;
