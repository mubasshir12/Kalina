

import React from 'react';
import { Info, ChevronDown, CheckCircle2, LoaderCircle, ChevronUp } from 'lucide-react';
import { ThoughtStep } from '../types';

interface ThinkingProcessProps {
    thoughts: ThoughtStep[];
    duration?: number;
    isThinking: boolean;
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ thoughts, duration, isThinking }) => {
    // Sanitize thoughts to prevent crashes from malformed API responses.
    const safeThoughts = (thoughts || []).filter(t => t && t.phase && t.step);

    // When the AI is actively thinking, show a dynamic status bar.
    if (isThinking) {
        const currentPhase = safeThoughts.length > 0 ? safeThoughts[safeThoughts.length - 1].phase : 'Thinking';
        return (
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg mb-4 border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-300">
                <LoaderCircle className="h-4 w-4 text-gray-500 dark:text-gray-400 animate-spin" />
                <span>{currentPhase}...</span>
                <span className="ml-auto text-gray-500 dark:text-gray-400">{(duration || 0).toFixed(1)}s</span>
            </div>
        );
    }

    // After thinking is complete, only render if there are valid thoughts.
    if (safeThoughts.length === 0) {
        return null;
    }

    return (
        <details className="bg-gray-100 dark:bg-gray-800/50 rounded-lg mb-4 border border-gray-200 dark:border-gray-700 group">
            <summary className="p-3 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 hover:bg-gray-200/60 dark:hover:bg-gray-700/50 rounded-t-lg transition-colors list-none [&::-webkit-details-marker]:hidden">
                <Info className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span>Thought about</span>
                <span className="ml-1 text-gray-500 dark:text-gray-400">({(duration || 0).toFixed(1)}s)</span>
                <div className="ml-auto text-gray-500 dark:text-gray-400">
                    <ChevronDown className="w-5 h-5 block group-open:hidden" />
                    <ChevronUp className="w-5 h-5 hidden group-open:block" />
                </div>
            </summary>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <ul className="space-y-2">
                    {safeThoughts.map((thought, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                           <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <span>{thought.step}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </details>
    );
};

export default ThinkingProcess;
