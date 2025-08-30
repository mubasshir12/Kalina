

import React, { useState, useRef, useEffect } from 'react';
import { Image as GalleryIcon, ChevronDown, BrainCircuit } from 'lucide-react';
import { ChatModel, ModelInfo } from '../types';

interface HeaderProps {
    onShowGallery: () => void;
    onShowMemory: () => void;
    isChatView: boolean;
    models: ModelInfo[];
    selectedChatModel: ChatModel;
    onSelectChatModel: (model: ChatModel) => void;
}

const Header: React.FC<HeaderProps> = ({ onShowGallery, onShowMemory, isChatView, models, selectedChatModel, onSelectChatModel }) => {
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedModelObject = models.find(m => m.id === selectedChatModel) || models[0];

  return (
    <header className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between relative">
        <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Kalina AI</h1>
        </div>
        {isChatView && (
            <div ref={modelSelectorRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <button
                    onClick={() => setIsModelSelectorOpen(prev => !prev)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-200/50 dark:bg-gray-800/50 rounded-xl text-gray-800 dark:text-gray-200 hover:bg-gray-300/50 dark:hover:bg-gray-700/70 transition-colors"
                >
                    <span className="font-semibold text-sm whitespace-nowrap">{selectedModelObject.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
                </button>
                {isModelSelectorOpen && (
                    <div className="absolute top-full mt-2 w-64 bg-white dark:bg-[#2E2F33] border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden z-20">
                        {models.map(model => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    onSelectChatModel(model.id);
                                    setIsModelSelectorOpen(false);
                                }}
                                className={`w-full text-left p-3 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors ${
                                    selectedChatModel === model.id ? 'bg-gray-100 dark:bg-gray-700/70' : ''
                                }`}
                            >
                                <p className="font-semibold text-sm">{model.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{model.description}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}
        <div className="flex items-center gap-2">
            {isChatView && (
                <>
                    <button
                      onClick={onShowMemory}
                      className="relative flex items-center justify-center h-9 w-9 overflow-hidden text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-300/50 dark:hover:bg-gray-700/70 transition-colors"
                      aria-label="Open memory management"
                      title="Memory Management"
                    >
                        <BrainCircuit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={onShowGallery}
                      className="relative flex items-center justify-center h-9 w-9 overflow-hidden text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-300/50 dark:hover:bg-gray-700/70 transition-colors"
                      aria-label="Open image gallery"
                      title="Image Gallery"
                    >
                        <GalleryIcon className="h-5 w-5" />
                    </button>
                </>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;