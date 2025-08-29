
import React, { useState, useEffect } from 'react';
import { ChatMessage } from '../types';
import { generateImagePromptSuggestions } from '../services/geminiService';

interface ImagePromptSuggestionsProps {
  messages: ChatMessage[];
  onSelectPrompt: (prompt: string) => void;
  apiKey: string | null;
}

const defaultSuggestions = [
  "A cyberpunk cityscape at night, glowing with neon lights, detailed",
  "An astronaut riding a unicorn on the moon, photorealistic, 4K",
  "A magical forest with glowing mushrooms and whimsical creatures, fantasy art",
  "A majestic dragon perched on a mountain peak, epic, digital painting",
  "A vintage robot serving tea in a Victorian-era room, steampunk style",
  "Abstract art representing the feeling of joy, vibrant colors, swirling patterns"
];

const SuggestionSkeleton: React.FC = () => (
    <div className="px-3 py-1.5 h-[30px] w-64 bg-gray-200 dark:bg-gray-700/70 rounded-full animate-pulse flex-shrink-0" />
);


const ImagePromptSuggestions: React.FC<ImagePromptSuggestionsProps> = ({ messages, onSelectPrompt, apiKey }) => {
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestions);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchSuggestions = async (prompt: string) => {
        if (!apiKey) return;
        setIsLoading(true);
        try {
            const newSuggestions = await generateImagePromptSuggestions(apiKey, prompt);
            if (newSuggestions && newSuggestions.length > 0) {
                setSuggestions(newSuggestions);
            } else {
                // If API returns empty, fall back to default but don't show loading forever
                setSuggestions(defaultSuggestions);
            }
        } catch (error) {
            console.error("Failed to fetch image prompt suggestions:", error);
            // Fall back to default on error
            setSuggestions(defaultSuggestions);
        } finally {
            setIsLoading(false);
        }
    };

    const lastMessage = messages[messages.length - 1];

    if (lastMessage?.role === 'model' && lastMessage.generatedImagesBase64 && lastMessage.generatedImagesBase64.length > 0) {
        let lastUserPrompt = '';
        for (let i = messages.length - 2; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserPrompt = messages[i].content;
                break;
            }
        }

        if (lastUserPrompt) {
            fetchSuggestions(lastUserPrompt);
        }
    } else if (messages.length === 0 && suggestions !== defaultSuggestions) {
        // Reset to default if chat is cleared
        setSuggestions(defaultSuggestions);
    }

  }, [messages, apiKey]);

  return (
    <div className="mb-3 w-full overflow-hidden">
      <div className="flex items-center gap-2 pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
        {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SuggestionSkeleton key={i} />)
        ) : (
          suggestions.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSelectPrompt(prompt)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-[#2E2F33] text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/70 transition-colors flex-shrink-0"
            >
              {prompt}
            </button>
          ))
        )}
      </div>
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
};

export default ImagePromptSuggestions;
