import React from 'react';
import { Wand2, Lightbulb, BarChart3 } from 'lucide-react';
import { Suggestion } from '../types';

interface WelcomeScreenProps {
  onSelectSuggestion: (suggestion: Suggestion) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectSuggestion }) => {
    const suggestions: Suggestion[] = [
        { 
            text: "Create image", 
            icon: <Wand2 className="h-5 w-5 text-green-500" />,
            prompt: "Create an image of a majestic lion in a field of stars, digital art"
        },
        { 
            text: "Make a plan", 
            icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
            prompt: "Make a plan for a 3-day trip to Paris, including budget-friendly options"
        },
        { 
            text: "Analyze data", 
            icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
            prompt: "Here is some sample sales data: [Product A: 100 units, Product B: 150 units, Product C: 80 units]. Analyze it and provide insights."
        },
        { 
            text: "Brainstorm", 
            icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
            prompt: "Brainstorm 5 catchy slogans for a new eco-friendly water bottle brand."
        },
    ];

    const moreSuggestion: Suggestion = {
      text: "More",
      prompt: "What are some other things you can do?",
    };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800 dark:text-gray-200">
            What can I help with?
        </h1>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-3 w-full max-w-xl">
        {suggestions.map((suggestion, index) => (
            <button
                key={index}
                onClick={() => onSelectSuggestion(suggestion)}
                className="flex items-center gap-2 bg-white dark:bg-[#1e1f22] p-2 pl-3 pr-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200 border border-gray-200 dark:border-gray-700 shadow-sm"
                aria-label={suggestion.text}
            >
                {suggestion.icon}
                <span className="font-medium text-gray-700 dark:text-gray-300">{suggestion.text}</span>
            </button>
        ))}
        <button
          onClick={() => onSelectSuggestion(moreSuggestion)}
          className="bg-white dark:bg-[#1e1f22] p-2 px-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200 border border-gray-200 dark:border-gray-700 shadow-sm"
          aria-label={moreSuggestion.text}
        >
            <span className="font-medium text-gray-700 dark:text-gray-300">{moreSuggestion.text}</span>
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
