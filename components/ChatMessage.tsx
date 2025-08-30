
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingProcess from './ThinkingProcess';
import { LoaderCircle, X, Copy, Check, RefreshCw, Pencil, Volume2, StopCircle, ThumbsUp, ThumbsDown, File, FileText, Presentation, Brain } from 'lucide-react';
import ImageModal from './ImageModal';
import GeneratedImage from './GeneratedImage';
import ConfirmationModal from './ConfirmationModal';

const stripMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/^#+\s/gm, '') // Remove heading markers
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
    .replace(/^\s*[-*]\s+/gm, '') // Remove unordered list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove ordered list markers
    .replace(/\[\d+\]/g, '') // Remove citations
    .trim();
};

interface ChatMessageProps extends ChatMessageType {
  isStreaming?: boolean;
  isThinking?: boolean;
  isSearchingWeb?: boolean;
  onRetry?: () => void;
  index?: number;
  onEditMessage?: (index: number, newContent: string) => void;
  isSpeaking?: boolean;
  onToggleAudio?: (id: string, text: string) => void;
}

const FileIcon: React.FC<{ mimeType: string }> = ({ mimeType }) => {
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        return <Presentation className="h-5 w-5 flex-shrink-0" />;
    }
    if (mimeType.includes('pdf') || mimeType.includes('plain')) {
        return <FileText className="h-5 w-5 flex-shrink-0" />;
    }
    return <File className="h-5 w-5 flex-shrink-0" />;
};

const SkeletonLoader: React.FC = () => (
    <div className="space-y-3 py-2">
        <div className="h-4 blue-shimmer-bg rounded w-5/6"></div>
        <div className="h-4 blue-shimmer-bg rounded w-full"></div>
        <div className="h-4 blue-shimmer-bg rounded w-4/6"></div>
        <style>{`
            .blue-shimmer-bg {
                background-color: #e5e7eb; /* gray-200 */
                background-image: linear-gradient(110deg, #e5e7eb 8%, #dbeafe 18%, #e5e7eb 33%); /* gray-200, blue-200, gray-200 */
                background-size: 200% 100%;
                animation: blue-shimmer 1.5s linear infinite;
            }
            .dark .blue-shimmer-bg {
                background-color: #374151; /* gray-700 */
                background-image: linear-gradient(110deg, #374151 8%, #1e40af 18%, #374151 33%); /* gray-700, blue-800, gray-700 */
                background-size: 200% 100%;
            }
            @keyframes blue-shimmer {
                to {
                    background-position-x: -200%;
                }
            }
        `}</style>
    </div>
);

const WebSearchIndicator: React.FC = () => (
    <div className="flex items-center space-x-2 py-2">
        <LoaderCircle className="h-5 w-5 text-blue-500 dark:text-blue-400 animate-spin" />
        <span className="text-gray-500 dark:text-gray-400">Searching the web...</span>
    </div>
);

const MemoryUpdateNotification: React.FC = () => (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
        <Brain className="h-3.5 w-3.5" />
        <span>Memory updated</span>
    </div>
);

const ImageGenerationLoader: React.FC<{ count: number; aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | number; isEditing?: boolean; }> = ({ count = 1, aspectRatio = "1:1", isEditing = false }) => {
    const getAspectRatioClass = (ratio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4") => {
        switch (ratio) {
            case "16:9": return "aspect-[16/9]";
            case "9:16": return "aspect-[9/16]";
            case "4:3": return "aspect-[4/3]";
            case "3:4": return "aspect-[3/4]";
            case "1:1":
            default:
                return "aspect-square";
        }
    };
    
    const loaderText = isEditing ? 'Editing image...' : `Generating ${count} image${count > 1 ? 's' : ''}...`;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-2 py-2">
                <LoaderCircle className="h-5 w-5 text-indigo-500 dark:text-indigo-400 animate-spin" />
                <span className="text-gray-500 dark:text-gray-400">{loaderText}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-[420px]">
              {Array.from({ length: count }).map((_, index) => {
                const isNumericRatio = typeof aspectRatio === 'number';
                const className = `w-full ${!isNumericRatio ? getAspectRatioClass(aspectRatio as "1:1" || '1:1') : ''} bg-gray-200 dark:bg-gray-800 rounded-lg shimmer-bg`;
                const style = isNumericRatio ? { aspectRatio: `${aspectRatio}` } : {};
                
                return <div key={index} className={className} style={style}></div>
              })}
            </div>
            <style>{`.shimmer-bg { background: linear-gradient(110deg, #e0e0e0 8%, #f8f8f8 18%, #e0e0e0 33%); background-size: 200% 100%; animation: 1.5s shimmer linear infinite; } .dark .shimmer-bg { background: linear-gradient(110deg, #2E2F33 8%, #4a4b50 18%, #2E2F33 33%); } @keyframes shimmer { to { background-position-x: -200%; } }`}</style>
        </div>
    );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ 
    id,
    role, 
    content, 
    image, 
    file,
    isStreaming, 
    isThinking, 
    isSearchingWeb,
    isGeneratingImage,
    isEditingImage,
    generatedImagesBase64,
    imageGenerationCount,
    aspectRatio,
    isPlanning,
    sources,
    thoughts,
    thinkingDuration,
    memoryUpdated,
    onRetry,
    index,
    onEditMessage,
    isSpeaking,
    onToggleAudio,
    inputTokens,
    outputTokens,
}) => {
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [imageToDownload, setImageToDownload] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const isUser = role === 'user';
  
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleConfirmDownload = () => {
    if (!imageToDownload) return;
    const imageUrl = `data:image/png;base64,${imageToDownload}`;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `kalina-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (isMenuVisible) {
        setIsMenuVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuVisible]);

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    pressTimer.current = setTimeout(() => {
        if ('vibrate' in navigator) {
            navigator.vibrate(20);
        }
        setIsMenuVisible(true);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
        clearTimeout(pressTimer.current);
    }
  };
  
  const handleCopy = () => {
    if (content) {
      const plainText = stripMarkdown(content);
      navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
    setIsMenuVisible(false);
  };

  const handleEdit = () => {
      setIsEditing(true);
      setIsMenuVisible(false);
  };

  const handleCancelEdit = () => {
      setIsEditing(false);
      setEditedContent(content);
  };

  const handleSaveEdit = () => {
      if (typeof index === 'number' && onEditMessage && editedContent.trim()) {
          onEditMessage(index, editedContent);
          setIsEditing(false);
      }
  };
  
  if (isUser) {
    if (isEditing) {
        return (
            <div className="flex justify-end">
                <div className="w-full max-w-2xl p-4 rounded-2xl bg-indigo-500 text-white rounded-br-none">
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full bg-transparent text-white placeholder-indigo-200 resize-none focus:outline-none leading-relaxed whitespace-pre-wrap"
                        rows={Math.max(2, editedContent.split('\n').length)}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={handleCancelEdit} className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors">Cancel</button>
                        <button onClick={handleSaveEdit} className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-white text-indigo-500 hover:bg-gray-200 transition-colors">Save & Submit</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
      <>
        {modalImage && <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />}
        <div className="flex justify-end">
            <div 
                className="flex flex-col items-end gap-2"
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            >
                {image && (
                    <div className="max-w-[150px]">
                        <img 
                            src={`data:${image.mimeType};base64,${image.base64}`} 
                            alt="User upload" 
                            className="rounded-lg w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setModalImage(`data:${image.mimeType};base64,${image.base64}`)}
                        />
                    </div>
                )}
                {file && (
                     <div className="max-w-xs p-3 rounded-2xl bg-indigo-400 flex items-center gap-3 text-white">
                        <FileIcon mimeType={file.mimeType} />
                        <span className="font-medium truncate">{file.name}</span>
                    </div>
                )}
                {content && (
                    <div className="max-w-2xl p-4 rounded-2xl bg-indigo-500 text-white rounded-br-none">
                        <p className="leading-relaxed whitespace-pre-wrap break-all">
                            {content}
                        </p>
                    </div>
                )}
                {isMenuVisible && (
                    <div 
                        className="flex items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={handleEdit} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors" aria-label="Edit">
                            <Pencil className="h-5 w-5" />
                        </button>
                        <button onClick={handleCopy} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors" aria-label="Copy">
                           {isCopied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </>
    );
  }
  
  const showThinkingProcess = isThinking || (thoughts && thoughts.length > 0);

  return (
    <>
      {modalImage && <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />}
      <ConfirmationModal
        isOpen={imageToDownload !== null}
        onClose={() => setImageToDownload(null)}
        onConfirm={handleConfirmDownload}
        title="Confirm Download"
        message="Do you want to download this image?"
        confirmButtonText="Download"
      />
      <div className="w-full">
          {memoryUpdated && <MemoryUpdateNotification />}

          {isPlanning && <SkeletonLoader />}

          {!isPlanning && showThinkingProcess && (
            <ThinkingProcess 
                thoughts={thoughts || []} 
                duration={thinkingDuration} 
                isThinking={!!isThinking} 
            />
          )}

          {!isPlanning && isGeneratingImage && <ImageGenerationLoader count={imageGenerationCount || 1} aspectRatio={aspectRatio} isEditing={isEditingImage} />}
          
          {!isPlanning && !showThinkingProcess && !isGeneratingImage && isStreaming && !content && (!generatedImagesBase64 || generatedImagesBase64.length === 0) && (
            isSearchingWeb ? <WebSearchIndicator /> : <SkeletonLoader />
          )}

          {(content || (generatedImagesBase64 && generatedImagesBase64.length > 0)) && (
            <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
              
              {generatedImagesBase64 && generatedImagesBase64.length > 0 && (
                <div className="mb-2 grid grid-cols-2 gap-2 max-w-[420px]">
                    {generatedImagesBase64.map((base64, index) => (
                        <GeneratedImage 
                            key={index} 
                            base64={base64} 
                            onExpandClick={setModalImage}
                            onDownloadClick={setImageToDownload}
                        />
                    ))}
                </div>
              )}

              {content ? <MarkdownRenderer content={content} sources={sources} /> : null}
              
              {!isStreaming && (content || (generatedImagesBase64 && generatedImagesBase64.length > 0)) && (
                  <>
                      <div className="mt-3 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        {content && (
                          <>
                           <button onClick={handleCopy} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Copy message">
                            {isCopied ? (
                              <Check className="h-5 w-5 text-green-500 dark:text-green-400" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                           <button 
                            onClick={() => onToggleAudio?.(id, stripMarkdown(content))} 
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            aria-label={isSpeaking ? "Stop reading aloud" : "Read message aloud"}
                          >
                              {isSpeaking ? (
                                  <StopCircle className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                              ) : (
                                  <Volume2 className="h-5 w-5" />
                              )}
                          </button>
                          </>
                        )}
                        {onRetry && (
                           <button onClick={onRetry} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Retry">
                              <RefreshCw className="h-5 w-5" />
                           </button>
                        )}
                        {content && (
                          <>
                            <button 
                              onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
                              className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors ${feedback === 'up' ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
                              aria-label="Thumbs up"
                            >
                              <ThumbsUp className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
                              className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors ${feedback === 'down' ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
                              aria-label="Thumbs down"
                            >
                              <ThumbsDown className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                      {(typeof inputTokens === 'number' || typeof outputTokens === 'number') && (
                        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {typeof inputTokens === 'number' && typeof outputTokens === 'number'
                                ? `Input: ${inputTokens} tokens / Output: ${outputTokens} tokens`
                                : typeof outputTokens === 'number'
                                    ? `Total: ${outputTokens} tokens`
                                    : typeof inputTokens === 'number'
                                        ? `Input: ${inputTokens} tokens`
                                        : ''
                            }
                        </div>
                      )}
                  </>
              )}

              {isStreaming && content ? <span className="inline-block w-2 h-4 bg-gray-800 dark:bg-white animate-pulse ml-1" /> : null}
            </div>
          )}
      </div>
    </>
  );
};

export default ChatMessage;
