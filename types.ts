
export type ControlState = 'auto' | 'on' | 'off';
export type Tool = 'smart' | 'webSearch' | 'thinking' | 'imageGeneration';

export type MessageRole = 'user' | 'model';

export interface Web {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: Web;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  image?: {
      base64: string;
      mimeType: string;
  };
  sources?: GroundingChunk[];
  thoughts?: string[];
  thinkingDuration?: number;
  isGeneratingImage?: boolean;
  generatedImagesBase64?: string[];
  imageGenerationCount?: number;
}

export interface AppError {
    message: string;
    isApiKeyError?: boolean;
}
