import React, { useState, useEffect } from 'react';
import { Wand2, Lightbulb, BarChart3, Code2, BugPlay, DatabaseZap, HelpCircle } from 'lucide-react';
import { Suggestion } from '../types';

interface WelcomeScreenProps {
  onSelectSuggestion: (suggestion: Suggestion) => void;
}

const allSuggestions: Suggestion[] = [
    { 
        text: "Create an image", 
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
    {
        text: "Write a script",
        icon: <Code2 className="h-5 w-5 text-purple-500" />,
        prompt: "Write a short python script to organize my downloads folder by file type."
    },
    {
        text: "Debug this code",
        icon: <BugPlay className="h-5 w-5 text-red-500" />,
        prompt: "My React component isn't updating its state correctly. Here's the code, can you help me find the bug?"
    },
    {
        text: "Explain a concept",
        icon: <HelpCircle className="h-5 w-5 text-teal-500" />,
        prompt: "Explain the concept of 'async/await' in JavaScript with a code example."
    },
    {
        text: "Optimize a query",
        icon: <DatabaseZap className="h-5 w-5 text-orange-500" />,
        prompt: "How can I optimize this SQL query for better performance on a large dataset? `SELECT u.id, p.product_name FROM users u JOIN purchases p ON u.id = p.user_id WHERE u.signup_date > '2023-01-01';`"
    },
];


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectSuggestion }) => {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [firstSet, setFirstSet] = useState<Suggestion[]>([]);
    const [secondSet, setSecondSet] = useState<Suggestion[]>([]);
    const [isFirstSetShown, setIsFirstSetShown] = useState(true);

    useEffect(() => {
        const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
        const set1 = shuffled.slice(0, 4);
        const set2 = shuffled.slice(4, 8);
        
        setFirstSet(set1);
        setSecondSet(set2);
        setSuggestions(set1);
    }, []);

    const handleMoreClick = () => {
        if (isFirstSetShown) {
            setSuggestions(secondSet);
        } else {
            setSuggestions(firstSet);
        }
        setIsFirstSetShown(!isFirstSetShown);
    };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-800 dark:text-gray-200">
            What can I help with?
        </h1>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-3 w-full max-w-3xl">
        {suggestions.map((suggestion) => (
            <button
                key={suggestion.prompt}
                onClick={() => onSelectSuggestion(suggestion)}
                className="flex items-center gap-2.5 bg-white dark:bg-[#1e1f22] p-3 pl-4 pr-5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200 border border-gray-200 dark:border-gray-700 shadow-sm"
                aria-label={suggestion.text}
            >
                {suggestion.icon}
                <span className="font-medium text-gray-700 dark:text-gray-300">{suggestion.text}</span>
            </button>
        ))}
        <button
          onClick={handleMoreClick}
          className="bg-white dark:bg-[#1e1f22] p-3 px-5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200 border border-gray-200 dark:border-gray-700 shadow-sm"
          aria-label="Show more suggestions"
        >
            <span className="font-medium text-gray-700 dark:text-gray-300">More</span>
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;