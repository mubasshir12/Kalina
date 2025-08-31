import React, { useState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSetApiKey: (key: string) => void;
  onClose: () => void;
  currentApiKey?: string | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSetApiKey, onClose, currentApiKey }) => {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKeyInput(currentApiKey || '');
      setError('');
    }
  }, [isOpen, currentApiKey]);

  const handleSubmit = () => {
    if (!keyInput.trim()) {
      setError('API key cannot be empty.');
      return;
    }
    setError('');
    onSetApiKey(keyInput.trim());
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-[#131314] flex items-center justify-center z-50 p-4" onClick={!currentApiKey ? undefined : onClose}>
      <div className="w-full max-w-md bg-white dark:bg-[#1e1f22] rounded-2xl shadow-xl p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{currentApiKey ? 'Update' : 'Enter'} Your API Key</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                To use Kalina AI, please provide your Google Gemini API key. It will be stored locally in your browser.
            </p>
        </div>
        <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your Gemini API key"
                className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
            />
        </div>
        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        <div className="flex items-center gap-3">
             {currentApiKey && (
                 <button
                    onClick={onClose}
                    className="w-full px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    Cancel
                </button>
            )}
            <button
                onClick={handleSubmit}
                className="w-full px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-[#1e1f22]"
            >
                {currentApiKey ? 'Update Key' : 'Continue'}
            </button>
        </div>
         <div className="text-center">
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 underline">
                Get your API key from Google AI Studio
            </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
