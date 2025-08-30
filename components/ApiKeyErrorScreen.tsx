
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ApiKeyErrorScreen: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#131314] text-gray-900 dark:text-white items-center justify-center p-4 text-center">
      <div className="max-w-md">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">API Key Not Configured</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          The Gemini API key is missing. Please add your API key to the <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded-md text-sm">.env</code> file in the project root.
        </p>
        <div className="mt-6 text-left bg-gray-100 dark:bg-[#1e1f22] p-4 rounded-lg">
          <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
            <span className="select-none"># .env</span><br />
            API_KEY=your_gemini_api_key_here
          </p>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          After adding the key, you may need to restart the application.
        </p>
         <div className="mt-4">
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline">
                Get your API key from Google AI Studio
            </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyErrorScreen;
