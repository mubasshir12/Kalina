
import React from 'react';
import { Info, ChevronDown, CheckCircle2 } from 'lucide-react';

interface ThinkingProcessProps {
    thoughts: string[];
    duration?: number;
    isThinking: boolean;
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ thoughts, duration, isThinking }) => {
    // When the AI is actively thinking, show a simple, non-interactive status bar.
    if (isThinking) {
        return (
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg mb-4 border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-300">
                <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"></div>
                </div>
                <span>Thinking...</span>
                <span className="ml-auto text-gray-500 dark:text-gray-400">{(duration || 0).toFixed(1)}s</span>
            </div>
        );
    }

    // After thinking is complete, render the collapsible thought process history.
    return (
        <details className="bg-gray-100 dark:bg-gray-800/50 rounded-lg mb-4 border border-gray-200 dark:border-gray-700 group">
            <summary className="p-3 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 hover:bg-gray-200/60 dark:hover:bg-gray-700/50 rounded-t-lg transition-colors list-none [&::-webkit-details-marker]:hidden">
                <Info className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span>Thought Process</span>
                <span className="ml-1 text-gray-500 dark:text-gray-400">({(duration || 0).toFixed(1)}s)</span>
                <ChevronDown className="w-5 h-5 ml-auto transition-transform duration-200 transform group-open:rotate-180 text-gray-500" />
            </summary>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <ul className="space-y-2">
                    {thoughts.map((thought, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                           <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <span>{thought}</span>
                        </li>
                    ))}
                </ul>
            </div>
             <style>{`
                .group-open\\:rotate-180 {
                    transform: rotate(180deg);
                }
            `}</style>
        </details>
    );
};

export default ThinkingProcess;
