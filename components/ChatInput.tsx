
import React, { useState, KeyboardEvent, useRef, ChangeEvent, useEffect } from 'react';
import { Tool } from '../types';
import { Sparkles, ChevronDown, X, ImagePlus, ArrowUp, Globe, BrainCircuit, Image } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string, image?: { base64: string; mimeType: string; }) => void;
  isLoading: boolean;
  selectedTool: Tool;
  onToolChange: (tool: Tool) => void;
  prefilledInput?: string;
  onPrefillConsumed?: () => void;
}

const tools: { id: Tool; name: string; description: string; icon: React.ElementType }[] = [
    { id: 'smart', name: 'Smart Mode', description: 'Automatically uses the best tool for the job.', icon: Sparkles },
    { id: 'webSearch', name: 'Web Search', description: 'Searches the web for real-time info.', icon: Globe },
    { id: 'thinking', name: 'Thinking', description: 'Shows the AI\'s step-by-step thought process.', icon: BrainCircuit },
    { id: 'imageGeneration', name: 'Image Generation', description: 'Creates an image from a text prompt.', icon: Image },
];

const ChatInput: React.FC<ChatInputProps> = ({ 
    onSendMessage, 
    isLoading,
    selectedTool,
    onToolChange,
    prefilledInput,
    onPrefillConsumed
}) => {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<{ base64: string; mimeType: string; file: File } | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefilledInput) {
        setInput(prefilledInput);
        inputRef.current?.focus();
        onPrefillConsumed?.();
    }
  }, [prefilledInput, onPrefillConsumed]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImage({
            base64: base64String,
            mimeType: file.type,
            file: file,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    if ((input.trim() || image) && !isLoading) {
      onSendMessage(input, image ? { base64: image.base64, mimeType: image.mimeType } : undefined);
      setInput('');
      setImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
    }
  };

  const removeImage = () => {
      setImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const file = Array.from(event.clipboardData.files).find(f => f.type.startsWith('image/'));
    if (file && selectedTool !== 'imageGeneration') {
      event.preventDefault(); // prevent pasting file path as text
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImage({
            base64: base64String,
            mimeType: file.type,
            file: file,
        });
      };
      reader.readAsDataURL(file);
    }
  }
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const selectedToolObject = tools.find(t => t.id === selectedTool) || tools[0];
  const SelectedIcon = selectedToolObject.icon;
  
  const placeholderText = () => {
      if (selectedTool === 'imageGeneration') return "Enter a prompt to generate an image...";
      if (image) return "Describe the image or ask a question...";
      return "Ask me anything...";
  }

  return (
    <div className="flex flex-col">
        <div className="flex items-start mb-3 px-1">
            <div className="relative" ref={toolsMenuRef}>
                 <button 
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2E2F33] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/70 transition-colors"
                 >
                    <SelectedIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                    <span>{selectedToolObject.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
                </button>
                {isToolsOpen && (
                    <div className="absolute bottom-full mb-2 w-72 bg-white dark:bg-[#2E2F33] border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden z-10">
                       {tools.map(tool => {
                           const ToolIcon = tool.icon;
                           return (
                               <button 
                                    key={tool.id}
                                    onClick={() => { onToolChange(tool.id); setIsToolsOpen(false); }}
                                    className="w-full text-left p-3 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors flex items-center gap-3"
                               >
                                    <ToolIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-sm">{tool.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</p>
                                    </div>
                               </button>
                           )
                        })}
                    </div>
                )}
            </div>
        </div>
        
        {image && (
            <div className="mb-3 p-2 bg-gray-100 dark:bg-[#1e1f22] rounded-lg relative w-fit">
                <img src={URL.createObjectURL(image.file)} alt="Upload preview" className="max-h-24 rounded-md" />
                <button 
                    onClick={removeImage} 
                    className="absolute -top-2 -right-2 bg-gray-600 dark:bg-gray-700 text-white rounded-full h-6 w-6 flex items-center justify-center hover:bg-red-500 transition-colors"
                    aria-label="Remove image"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        )}

        <div className="relative flex items-center">
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || selectedTool === 'imageGeneration'}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2E2F33] hover:text-gray-800 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors mr-3"
                aria-label="Attach image"
            >
                <ImagePlus className="h-6 w-6" />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                />
            </button>
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onPaste={handlePaste}
                placeholder={placeholderText()}
                disabled={isLoading}
                className="w-full bg-gray-100 dark:bg-[#1e1f22] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-full py-3 pl-5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 disabled:opacity-50"
            />
            <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !image)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
            >
                <ArrowUp className="h-6 w-6" />
            </button>
        </div>
    </div>
  );
};

export default ChatInput;
