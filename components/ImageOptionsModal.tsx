
import React, { useState, Fragment } from 'react';
import { X } from 'lucide-react';

export interface ImageGenerationOptions {
    count: number;
    aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
}

interface ImageOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (options: ImageGenerationOptions) => void;
    prompt: string;
}

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;
const imageCounts = [1, 2, 3, 4];

const ImageOptionsModal: React.FC<ImageOptionsModalProps> = ({ isOpen, onClose, onGenerate, prompt }) => {
    const [options, setOptions] = useState<ImageGenerationOptions>({
        count: 1,
        aspectRatio: "1:1",
    });

    const handleGenerate = () => {
        onGenerate(options);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" aria-modal="true">
            <div className="bg-white dark:bg-[#1e1f22] rounded-2xl shadow-xl w-full max-w-md transform transition-all" role="dialog">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Image Generation Options</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prompt</label>
                        <p className="text-sm p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-gray-600 dark:text-gray-400 italic">
                            "{prompt}"
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Images</label>
                        <div className="grid grid-cols-4 gap-2">
                            {imageCounts.map(count => (
                                <button
                                    key={count}
                                    onClick={() => setOptions(prev => ({ ...prev, count }))}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                        options.count === count 
                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aspect Ratio</label>
                        <div className="grid grid-cols-5 gap-2">
                            {aspectRatios.map(ratio => (
                                <button
                                    key={ratio}
                                    onClick={() => setOptions(prev => ({ ...prev, aspectRatio: ratio }))}
                                    className={`px-2 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center ${
                                        options.aspectRatio === ratio 
                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl flex justify-end">
                    <button
                        onClick={handleGenerate}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-50 dark:focus:ring-offset-[#1e1f22]"
                    >
                        Generate
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageOptionsModal;
