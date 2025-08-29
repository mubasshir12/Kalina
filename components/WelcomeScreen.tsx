
import React from 'react';

interface WelcomeScreenProps {
  onSendMessage: (prompt: string, image?: { base64: string; mimeType: string; }) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSendMessage }) => {
    const examplePrompts = [
        "Explain quantum computing in simple terms",
        "Write a short story about a robot who discovers music",
        "What are the best practices for learning a new programming language?",
        "Give me some ideas for a healthy weeknight dinner"
    ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="mb-8">
         <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-500 mb-2">
            Hello, I'm Kalina
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">How can I help you today?</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {examplePrompts.map((prompt, index) => (
            <button
                key={index}
                onClick={() => onSendMessage(prompt)}
                className="bg-white dark:bg-[#2E2F33] p-4 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
            >
                <p className="font-semibold text-gray-800 dark:text-gray-200">{prompt}</p>
            </button>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;
