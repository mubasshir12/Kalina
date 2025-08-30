
import React, { useState, KeyboardEvent, useRef, ChangeEvent, useEffect } from 'react';
import { Suggestion, Tool } from '../types';
// FIX: Import the 'Expand' icon from lucide-react
import { Sparkles, ChevronDown, X, Paperclip, ArrowUp, Globe, BrainCircuit, Image, History, Expand, File, Presentation, FileText, Camera, Languages } from 'lucide-react';
import ImageModal from './ImageModal';

interface ChatInputProps {
  onSendMessage: (message: string, image?: { base64: string; mimeType: string; }, file?: { base64: string; mimeType: string; name: string; }) => void;
  isLoading: boolean;
  selectedTool: Tool;
  onToolChange: (tool: Tool) => void;
  activeSuggestion: Suggestion | null;
  onClearSuggestion: () => void;
  onOpenHistory: () => void;
  conversationCount: number;
}

const tools: { id: Tool; name: string; description: string; icon: React.ElementType }[] = [
    { id: 'smart', name: 'Smart Mode', description: 'Automatically uses the best tool for the job.', icon: Sparkles },
    { id: 'webSearch', name: 'Web Search', description: 'Searches the web for real-time info.', icon: Globe },
    { id: 'thinking', name: 'Thinking', description: 'Shows the AI\'s step-by-step thought process.', icon: BrainCircuit },
    { id: 'imageGeneration', name: 'Image Generation', description: 'Creates or edits an image from a prompt.', icon: Image },
    { id: 'translator', name: 'Translator', description: 'Translates text between languages.', icon: Languages },
];

const descriptionsToAnimate = [
    "Detects the web through automatic detection",
    "Makes decisions through automatic thinking",
    "Creates images through automatic decisions"
];

const FileIcon: React.FC<{ mimeType: string; className?: string; }> = ({ mimeType, className = "h-6 w-6" }) => {
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        return <Presentation className={`${className} text-orange-500 dark:text-orange-400`} />;
    }
    if (mimeType.includes('pdf')) {
        return <FileText className={`${className} text-red-500 dark:text-red-400`} />;
    }
    if (mimeType.includes('plain')) {
        return <FileText className={`${className} text-blue-500 dark:text-blue-400`} />;
    }
    return <File className={`${className} text-gray-500 dark:text-gray-400`} />;
};

const ChatInput: React.FC<ChatInputProps> = ({ 
    onSendMessage, 
    isLoading,
    selectedTool,
    onToolChange,
    activeSuggestion,
    onClearSuggestion,
    onOpenHistory,
    conversationCount
}) => {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<{ base64: string; mimeType: string; } | null>(null);
  const [file, setFile] = useState<{ base64: string; mimeType: string; name: string; } | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [animatedDescription, setAnimatedDescription] = useState(descriptionsToAnimate[0]);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height to recalculate
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${scrollHeight}px`; // Set to new scroll height
    }
  }, [input]);

  useEffect(() => {
    if (activeSuggestion) {
        setInput(activeSuggestion.prompt);
    }
  }, [activeSuggestion]);
  
  useEffect(() => {
    if (selectedTool !== 'smart' || isToolsOpen) {
      return; // Do nothing if not in smart mode or if menu is open
    }

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      setIsFading(true);

      setTimeout(() => {
        currentIndex = (currentIndex + 1) % descriptionsToAnimate.length;
        setAnimatedDescription(descriptionsToAnimate[currentIndex]);
        setIsFading(false);
      }, 300); // fade out duration
    }, 2000); // 2 second interval

    return () => {
      clearInterval(intervalId);
      setIsFading(false);
      setAnimatedDescription(descriptionsToAnimate[0]);
    };
  }, [selectedTool, isToolsOpen]);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        if (selectedFile.type.startsWith('image/')) {
            setImage({
                base64: base64String,
                mimeType: selectedFile.type,
            });
            setFile(null); // Allow only one attachment type via button
        } else {
            setFile({
                base64: base64String,
                mimeType: selectedFile.type,
                name: selectedFile.name,
            });
            setImage(null); // Allow only one attachment type via button
        }
      };
      reader.readAsDataURL(selectedFile);
    }
    // Reset file input value to allow selecting the same file again
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleSend = () => {
    if ((input.trim() || image || file) && !isLoading) {
      onSendMessage(input, image ?? undefined, file ?? undefined);
      setInput('');
      setImage(null);
      setFile(null);
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
    }
  };

  const removeImage = () => {
      setImage(null);
  }
  
  const removeFile = () => {
      setFile(null);
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFile = Array.from(event.clipboardData.files).find(f => f.type.startsWith('image/'));
    if (pastedFile) {
      event.preventDefault(); // prevent pasting file path as text
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImage({
            base64: base64String,
            mimeType: pastedFile.type,
        });
      };
      reader.readAsDataURL(pastedFile);
    }
  }
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setIsAttachmentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const selectedToolObject = tools.find(t => t.id === selectedTool) || tools[0];
  const SelectedIcon = selectedToolObject.icon;
  
  const placeholderText = () => {
      if (selectedTool === 'imageGeneration') {
          return image ? "Describe the edits you want to make..." : "Enter a prompt to generate an image...";
      }
      if (image) return "Describe the image or ask a question...";
      if (file) return `Ask a question about ${file.name}...`;
      return "Ask me anything...";
  }

  const handleClearSuggestionWithInput = () => {
    onClearSuggestion();
    setInput('');
  }
  
  const handleTriggerInput = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
    setIsAttachmentMenuOpen(false);
  };

  return (
    <>
      {isPreviewModalOpen && image && (
          <ImageModal 
              imageUrl={`data:${image.mimeType};base64,${image.base64}`} 
              onClose={() => setIsPreviewModalOpen(false)}
          />
      )}
      <div className="flex flex-col">
          <div className="flex items-stretch justify-between mb-3 px-1 gap-2">
              <div className="relative" ref={toolsMenuRef}>
                   <button 
                      onClick={() => setIsToolsOpen(!isToolsOpen)}
                      className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2E2F33] border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700/70 transition-colors h-full"
                   >
                      <SelectedIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                       <div className="text-left">
                          <p className="text-sm font-medium leading-none">{selectedToolObject.name}</p>
                          <p className={`text-[12px] text-gray-500 dark:text-gray-400 transition-opacity duration-300 h-4 mt-0.5 ${selectedTool === 'smart' && isFading ? 'opacity-0' : 'opacity-100'}`}>
                              {selectedTool === 'smart' ? animatedDescription : selectedToolObject.description}
                          </p>
                      </div>
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
              <div className="relative">
                <button
                  onClick={onOpenHistory}
                  className="p-3 bg-gray-100 dark:bg-[#2E2F33] border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/70 transition-colors h-full"
                  aria-label="Open chat history"
                  title="History"
                >
                    <History className="h-5 w-5" />
                </button>
                {conversationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white pointer-events-none">
                        {conversationCount}
                    </span>
                )}
              </div>
          </div>
          
          {activeSuggestion && (
            <div className="mb-2 p-2 pl-3 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-2 text-sm">
              {activeSuggestion.icon}
              <span className="text-indigo-800 dark:text-indigo-200 line-clamp-1 flex-1 font-medium">
                  {activeSuggestion.text}
              </span>
              <button
                  onClick={handleClearSuggestionWithInput}
                  className="p-1.5 rounded-full text-indigo-500 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/60 transition-colors flex-shrink-0"
                  aria-label="Clear suggestion"
              >
                  <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-3">
              <div className="relative flex items-end gap-2">
                  {!image && !file && (
                      <div ref={attachmentMenuRef} className="flex items-center h-14">
                          <button
                              onClick={() => setIsAttachmentMenuOpen(prev => !prev)}
                              disabled={isLoading}
                              className="p-3 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2E2F33] hover:text-gray-800 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Attach file"
                          >
                              <Paperclip className="h-7 w-7" />
                          </button>
                          {isAttachmentMenuOpen && (
                            <div className="absolute bottom-full mb-2 w-48 bg-white dark:bg-[#2E2F33] border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden z-10">
                                <button onClick={() => handleTriggerInput(cameraInputRef)} className="w-full flex items-center gap-3 p-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors">
                                    <Camera className="w-4 h-4" /> Take Photo
                                </button>
                                <button onClick={() => handleTriggerInput(imageInputRef)} className="w-full flex items-center gap-3 p-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors">
                                    <Image className="w-4 h-4" /> Upload Image
                                </button>
                                <button onClick={() => handleTriggerInput(fileInputRef)} className="w-full flex items-center gap-3 p-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors">
                                    <File className="w-4 h-4" /> Upload File
                                </button>
                            </div>
                          )}
                      </div>
                  )}
                  
                  {/* Hidden file inputs */}
                  <input ref={cameraInputRef} type="file" capture="user" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <input ref={imageInputRef} type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} className="hidden" />
                  <input ref={fileInputRef} type="file" accept="application/pdf, text/plain" onChange={handleFileChange} className="hidden" />

                  {image && (
                      <div className="relative flex-shrink-0">
                          <div className="w-14 h-14 rounded-xl relative group bg-gray-200 dark:bg-gray-800 ring-2 ring-indigo-500">
                              <img
                                  src={`data:${image.mimeType};base64,${image.base64}`}
                                  alt="Image preview"
                                  className="w-full h-full object-cover rounded-xl"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                  <button
                                      onClick={() => setIsPreviewModalOpen(true)}
                                      className="p-1.5 bg-white/20 text-white rounded-full backdrop-blur-sm hover:bg-white/30"
                                      aria-label="Zoom image"
                                  >
                                      <Expand className="h-5 w-5" />
                                  </button>
                              </div>
                          </div>
                          <button
                              onClick={removeImage}
                              className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors z-10"
                              aria-label="Remove image"
                          >
                              <X className="h-3 w-3" />
                          </button>
                      </div>
                  )}

                  {file && (
                     <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center p-1 text-center bg-gray-200 dark:bg-gray-800 ring-2 ring-indigo-500">
                           <FileIcon mimeType={file.mimeType} className="h-5 w-5" />
                           <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full mt-1">{file.name}</p>
                        </div>
                         <button
                              onClick={removeFile}
                              className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors z-10"
                              aria-label="Remove file"
                          >
                              <X className="h-3 w-3" />
                          </button>
                     </div>
                  )}
              </div>
              <div className="relative flex-1">
                  <textarea
                      ref={textareaRef}
                      rows={1}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      onPaste={handlePaste}
                      placeholder={placeholderText()}
                      disabled={isLoading}
                      className="w-full bg-gray-100 dark:bg-[#1e1f22] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-2xl py-2.5 pl-5 pr-14 min-h-[3.5rem] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 disabled:opacity-50 resize-none max-h-[8rem] overflow-y-auto scrollbar-hide"
                  />
                  <button
                      onClick={handleSend}
                      disabled={isLoading || (!input.trim() && !image && !file)}
                      className="absolute right-2 bottom-2 p-2 mb-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                      aria-label="Send message"
                  >
                      <ArrowUp className="h-6 w-6" />
                  </button>
              </div>
          </div>
      </div>
    </>
  );
};

export default ChatInput;
