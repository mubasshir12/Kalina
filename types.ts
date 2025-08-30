

import React from 'react';

export type ChatModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';
export type ControlState = 'auto' | 'on' | 'off';
export type Tool = 'smart' | 'webSearch' | 'thinking' | 'imageGeneration' | 'translator';

export type MessageRole = 'user' | 'model';

export interface ModelInfo {
  id: ChatModel;
  name: string;
  description: string;
}

export interface Web {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: Web;
}

export interface ThoughtStep {
  phase: string;
  step: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  image?: {
      base64: string;
      mimeType: string;
  };
  file?: {
      base64: string;
      mimeType: string;
      name: string;
  };
  sources?: GroundingChunk[];
  thoughts?: ThoughtStep[];
  thinkingDuration?: number;
  isGeneratingImage?: boolean;
  isEditingImage?: boolean;
  generatedImagesBase64?: string[];
  imageGenerationCount?: number;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | number;
  isPlanning?: boolean;
  memoryUpdated?: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AppError {
    message: string;
}

export interface Suggestion {
  text: string;
  prompt: string;
  icon?: React.ReactNode;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  isPinned?: boolean;
  isGeneratingTitle?: boolean;
  summary?: string;
}

// Long-Term Memory: A global list of important facts.
export type LTM = string[];

export interface CodeSnippet {
  id: string;
  description: string;
  language: string;
  code: string;
}
