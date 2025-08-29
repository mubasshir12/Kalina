
import React from 'react';
import { Plus, Sun, Moon, KeyRound } from 'lucide-react';

interface HeaderProps {
    onNewChat: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    onChangeApiKey: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewChat, theme, onToggleTheme, onChangeApiKey }) => {
  return (
    <header className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Kalina AI</h1>
        </div>
        <div className="flex items-center gap-2">
            <button
              onClick={onChangeApiKey}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-300 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-300/50 dark:hover:bg-gray-700/70 transition-colors"
              aria-label="Change API Key"
            >
                <KeyRound className="h-5 w-5" />
                <span className="hidden sm:inline">API Key</span>
            </button>
            <button
              onClick={onToggleTheme}
              className="relative flex items-center justify-center h-9 w-9 overflow-hidden text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-300/50 dark:hover:bg-gray-700/70 transition-colors"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
                <Sun className={`h-5 w-5 transition-all duration-300 transform ${theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
                <Moon className={`absolute h-5 w-5 transition-all duration-300 transform ${theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
            </button>
            <button
              onClick={onNewChat}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 dark:text-gray-300 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-300/50 dark:hover:bg-gray-700/70 transition-colors"
              aria-label="Start new chat"
            >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">New Chat</span>
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
