
import React, { useState, useEffect, useMemo } from 'react';
import { Info, ChevronDown, CheckCircle2, ChevronUp } from 'lucide-react';
import { ThoughtStep } from '../types';
import ThinkingAnimation from './ThinkingAnimation';

interface ThinkingProcessProps {
    thoughts: ThoughtStep[];
    duration?: number;
    isThinking: boolean;
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ thoughts, duration, isThinking }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFadingOut, setIsFadingOut] = useState(false);
    
    // Memoize the filtered thoughts to prevent the animation useEffect from re-running unnecessarily
    // when the parent component re-renders (e.g., to update the duration timer).
    const safeThoughts = useMemo(() => 
        (thoughts || []).filter(t => t && t.phase && t.step && t.concise_step),
        [thoughts]
    );
    
    // This effect resets the animation index when a new set of thoughts is provided.
    useEffect(() => {
        setCurrentIndex(0);
    }, [safeThoughts]);

    // This effect handles the timer for advancing through the thought steps.
    useEffect(() => {
        if (!isThinking || safeThoughts.length <= 1 || currentIndex >= safeThoughts.length - 1) {
            // Stop if not thinking, if there's only one thought, or if we're at the last thought.
            return;
        }

        const timer = setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                setIsFadingOut(false);
            }, 300); // Fade duration
        }, 1000); // Display duration for each thought

        return () => clearTimeout(timer);
    }, [isThinking, safeThoughts, currentIndex]); // Reactivate on index change.
    
    // When the AI is actively thinking, show the dynamic status bar.
    if (isThinking && safeThoughts.length > 0) {
        const currentThought = safeThoughts[currentIndex];
        return (
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg mb-4 border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-300">
                <ThinkingAnimation />
                <div className="flex-grow overflow-hidden">
                     <span
                        key={currentIndex}
                        className={`transition-opacity duration-300 inline-block ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
                    >
                        {currentThought?.concise_step || 'Analyzing...'}
                    </span>
                </div>
                <span className="ml-auto text-gray-500 dark:text-gray-400 flex-shrink-0">{(duration || 0).toFixed(1)}s</span>
            </div>
        );
    }

    // After thinking is complete, only render the collapsible summary if there were thoughts.
    if (!isThinking && safeThoughts.length > 0) {
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
    }
    
    return null; // Render nothing if there are no thoughts or not in a thinking state
};

export default ThinkingProcess;
