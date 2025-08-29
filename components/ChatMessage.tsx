
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChatMessage as ChatMessageType } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingProcess from './ThinkingProcess';
import { LoaderCircle, X, Copy, Check, RefreshCw, Expand, Download, ThumbsUp, ThumbsDown, Link as LinkIcon } from 'lucide-react';

interface ChatMessageProps extends ChatMessageType {
  isStreaming?: boolean;
  isThinking?: boolean;
  isSearchingWeb?: boolean;
  onRetry?: () => void;
}

const SkeletonLoader: React.FC = () => (
    <div className="space-y-3 animate-pulse py-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
    </div>
);

const WebSearchIndicator: React.FC = () => (
    <div className="flex items-center space-x-2 py-2">
        <LoaderCircle className="h-5 w-5 text-blue-500 dark:text-blue-400 animate-spin" />
        <span className="text-gray-500 dark:text-gray-400">Searching the web...</span>
    </div>
);

const ImageGenerationLoader: React.FC<{ count: number }> = ({ count = 1 }) => (
    <div className="flex flex-col gap-3">
        <div className="flex items-center space-x-2 py-2">
            <LoaderCircle className="h-5 w-5 text-indigo-500 dark:text-indigo-400 animate-spin" />
            <span className="text-gray-500 dark:text-gray-400">Generating {count} image{count > 1 ? 's' : ''}...</span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-w-[420px]">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg shimmer-bg"></div>
          ))}
        </div>
        <style>{`.shimmer-bg { background: linear-gradient(110deg, #e0e0e0 8%, #f8f8f8 18%, #e0e0e0 33%); background-size: 200% 100%; animation: 1.5s shimmer linear infinite; } .dark .shimmer-bg { background: linear-gradient(110deg, #2E2F33 8%, #4a4b50 18%, #2E2F33 33%); } @keyframes shimmer { to { background-position-x: -200%; } }`}</style>
    </div>
);

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <h2 id="image-modal-title" className="sr-only">Enlarged image view</h2>
        <img src={imageUrl} alt="Enlarged view" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        <button 
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-gray-800 text-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close image view"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
);

const SourceList: React.FC<{ sources: ChatMessageType['sources'] }> = ({ sources }) => {
    const [activeSource, setActiveSource] = useState<{ index: number; rect: DOMRect } | null>(null);

    const handleSourceClick = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
        event.stopPropagation();
        if (activeSource?.index === index) {
            setActiveSource(null);
            return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        setActiveSource({ index, rect });
    };

    const handleClose = useCallback(() => {
        setActiveSource(null);
    }, []);

    useEffect(() => {
        if (!activeSource) return;
        document.addEventListener('click', handleClose);
        window.addEventListener('scroll', handleClose, true);
        return () => {
            document.removeEventListener('click', handleClose);
            window.removeEventListener('scroll', handleClose, true);
        };
    }, [activeSource, handleClose]);

    if (!sources || sources.length === 0) return null;
    
    const activeSourceData = activeSource ? sources[activeSource.index] : null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700/60">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Sources</h4>
            <div className="flex items-center gap-2 flex-wrap">
                {sources.map((source, index) => {
                    if (!source?.web?.uri) return null;
                    try {
                        const hostname = new URL(source.web.uri).hostname;
                        const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${hostname}`;
                        return (
                           <button
                                key={index}
                                onClick={(e) => handleSourceClick(e, index)}
                                title={source.web.title || hostname}
                                className="flex items-center justify-center h-8 w-8 bg-gray-100 dark:bg-gray-800/50 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                            >
                                <img
                                    src={faviconUrl}
                                    alt={hostname}
                                    className="w-4 h-4 object-contain"
                                />
                            </button>
                        );
                    } catch (e) {
                        return null; // Ignore invalid URLs
                    }
                })}
            </div>
             {activeSource && activeSourceData?.web?.uri && document.body && ReactDOM.createPortal(
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-50 w-72 rounded-lg bg-white dark:bg-[#2E2F33] shadow-2xl border border-gray-200 dark:border-gray-700"
                    style={{
                        top: activeSource.rect.bottom + window.scrollY + 8,
                        left: activeSource.rect.left + window.scrollX,
                    }}
                >
                    <a href={activeSourceData.web.uri} target="_blank" rel="noopener noreferrer" className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{activeSourceData.web.title || new URL(activeSourceData.web.uri).hostname}</p>
                        <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 flex items-center gap-1.5 truncate">
                            <LinkIcon className="w-3 h-3 flex-shrink-0"/>
                            {activeSourceData.web.uri}
                        </p>
                    </a>
                </div>,
                document.body
            )}
        </div>
    );
};


const GeneratedImage: React.FC<{ base64: string, onExpand: (url: string) => void }> = ({ base64, onExpand }) => {
    const imageUrl = `data:image/png;base64,${base64}`;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'kalina-ai-generated-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
      <div className="relative group">
        <img 
            src={imageUrl} 
            alt="AI generated image" 
            className="rounded-lg w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
          <button onClick={() => onExpand(imageUrl)} className="p-1.5 bg-white/20 text-white rounded-full backdrop-blur-sm hover:bg-white/30" aria-label="View full image">
            <Expand className="h-4 w-4" />
          </button>
          <button onClick={handleDownload} className="p-1.5 bg-white/20 text-white rounded-full backdrop-blur-sm hover:bg-white/30" aria-label="Download image">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
    role, 
    content, 
    image, 
    isStreaming, 
    isThinking, 
    isSearchingWeb,
    isGeneratingImage,
    generatedImagesBase64,
    imageGenerationCount,
    sources,
    thoughts,
    thinkingDuration,
    onRetry,
}) => {
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  if (isUser) {
    return (
      <div className="flex items-start gap-4 justify-end">
        <div className="max-w-2xl p-4 rounded-2xl bg-indigo-500 text-white rounded-br-none">
          {image && (
            <img 
              src={`data:${image.mimeType};base64,${image.base64}`} 
              alt="User upload" 
              className="rounded-lg mb-2 max-w-[150px]"
            />
          )}
          {content && (
            <p className="leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  const showThinkingProcess = isThinking || (thoughts && thoughts.length > 0);

  return (
    <>
      {modalImage && <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />}
      <div className="w-full">
          {showThinkingProcess && (
            <ThinkingProcess 
                thoughts={thoughts || []} 
                duration={thinkingDuration} 
                isThinking={!!isThinking} 
            />
          )}

          {isGeneratingImage && <ImageGenerationLoader count={imageGenerationCount || 1} />}
          
          {!showThinkingProcess && !isGeneratingImage && isStreaming && !content && (!generatedImagesBase64 || generatedImagesBase64.length === 0) && (
            isSearchingWeb ? <WebSearchIndicator /> : <SkeletonLoader />
          )}

          {(content || (generatedImagesBase64 && generatedImagesBase64.length > 0)) && (
            <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
              
              {generatedImagesBase64 && generatedImagesBase64.length > 0 && (
                <div className="mb-2 grid grid-cols-2 gap-2 max-w-[420px]">
                    {generatedImagesBase64.map((base64, index) => (
                        <GeneratedImage key={index} base64={base64} onExpand={setModalImage} />
                    ))}
                </div>
              )}

              {content ? <MarkdownRenderer content={content} sources={sources} /> : null}
              
              {!isStreaming && (content || (generatedImagesBase64 && generatedImagesBase64.length > 0)) && (
                  <div className="mt-3 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    {content && (
                       <button onClick={handleCopy} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Copy message">
                        {isCopied ? (
                          <Check className="h-5 w-5 text-green-500 dark:text-green-400" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
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
              )}

              <SourceList sources={sources} />

              {isStreaming && content ? <span className="inline-block w-2 h-4 bg-gray-800 dark:bg-white animate-pulse ml-1" /> : null}
            </div>
          )}
      </div>
    </>
  );
};

export default ChatMessage;
