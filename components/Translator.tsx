
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRightLeft, LoaderCircle, Copy, Check, X } from 'lucide-react';
import { translateText } from '../services/translationService';

const sourceLanguages = [
    { code: 'auto', name: 'Auto Detect' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'hi', name: 'Hindi' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
];

const targetLanguages = sourceLanguages.filter(lang => lang.code !== 'auto');

const Translator: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [sourceLang, setSourceLang] = useState('auto');
    const [targetLang, setTargetLang] = useState('en');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const debounceTimeout = useRef<number | null>(null);

    const handleTranslate = async (text: string, source: string, target: string) => {
        if (!text.trim()) {
            setOutputText('');
            return;
        }
        setIsLoading(true);
        const result = await translateText(text, targetLanguages.find(l=>l.code===target)?.name || 'English', sourceLanguages.find(l=>l.code===source)?.name || 'Auto Detect');
        setOutputText(result);
        setIsLoading(false);
    };
    
    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        if (inputText.trim()) {
            debounceTimeout.current = window.setTimeout(() => {
                handleTranslate(inputText, sourceLang, targetLang);
            }, 500); // 500ms debounce
        } else {
            setOutputText('');
        }
        
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };

    }, [inputText, sourceLang, targetLang]);


    const handleSwapLanguages = () => {
        if (sourceLang === 'auto') return;
        const newSourceLang = targetLang;
        const newTargetLang = sourceLang;
        setSourceLang(newSourceLang);
        setTargetLang(newTargetLang);
        setInputText(outputText); // Also swap text
    };
    
    const handleCopy = () => {
        if (outputText) {
            navigator.clipboard.writeText(outputText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="mb-3 p-4 bg-gray-100 dark:bg-[#1e1f22] border border-gray-300 dark:border-gray-600 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <div className="relative w-full">
                    <select
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                        className="w-full bg-white dark:bg-[#2E2F33] border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                    >
                        {sourceLanguages.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleSwapLanguages}
                    disabled={sourceLang === 'auto'}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Swap languages"
                >
                    <ArrowRightLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>

                <div className="relative w-full">
                     <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="w-full bg-white dark:bg-[#2E2F33] border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                    >
                        {targetLanguages.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="relative">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Enter text..."
                        className="w-full h-28 p-3 bg-white dark:bg-[#2E2F33] rounded-lg border border-gray-300 dark:border-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                     {inputText && (
                        <button
                            onClick={() => setInputText('')}
                            className="absolute top-2 right-2 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            aria-label="Clear input text"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
                <div className="relative h-28 p-3 bg-white dark:bg-[#2E2F33] rounded-lg border border-gray-300 dark:border-gray-600 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <LoaderCircle className="h-6 w-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : (
                        <p className={`whitespace-pre-wrap ${!outputText ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                            {outputText || 'Translation'}
                        </p>
                    )}
                    {outputText && !isLoading && (
                         <button
                            onClick={handleCopy}
                            className="absolute top-2 right-2 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                            aria-label="Copy translation"
                        >
                            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Translator;
