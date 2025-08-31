import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, AlertTriangle, Terminal, RefreshCw, Wand2, LoaderCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ConsoleLog } from '../types';
import { autoFixCode } from '../services/codeService';

interface CodePreviewModalProps {
    initialCode: string;
    language: string;
    onClose: () => void;
    onCodeFixed: (newCode: string) => void;
}

const CodePreviewModal: React.FC<CodePreviewModalProps> = ({ initialCode, language, onClose, onCodeFixed }) => {
    const [code, setCode] = useState(initialCode);
    const [logs, setLogs] = useState<ConsoleLog[]>([]);
    const [isFixing, setIsFixing] = useState(false);
    const [fixerFeedback, setFixerFeedback] = useState<string[]>([]);
    const [isConsoleOpen, setIsConsoleOpen] = useState(true);
    const [iframeKey, setIframeKey] = useState(0);
    const consoleEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, level, message } = event.data;
            if (type === 'log' || type === 'error') {
                 setLogs(prevLogs => [...prevLogs, {
                    level: level || (type === 'error' ? 'error' : 'log'),
                    message,
                    timestamp: new Date().toLocaleTimeString()
                }]);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        // Automatically scroll to the latest log message.
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleAutoFix = async () => {
        const errorLog = logs.find(log => log.level === 'error');
        if (!errorLog) return;

        setIsFixing(true);
        setIsConsoleOpen(true); // Keep console open to show progress.
        setFixerFeedback([]);
        setLogs(prev => [...prev, { level: 'log', message: `[AI Fixer] Starting to fix code...`, timestamp: new Date().toLocaleTimeString() }]);
        
        try {
            const fixedCode = await autoFixCode(code, errorLog.message, (feedback) => {
                setFixerFeedback(prev => [...prev, feedback]);
                setLogs(prev => [...prev, { level: 'log', message: `[AI] ${feedback}`, timestamp: new Date().toLocaleTimeString() }]);
            });
            setCode(fixedCode);
            onCodeFixed(fixedCode);
            setLogs([{ level: 'log', message: '[AI Fixer] Code fixed successfully. Reloading preview.', timestamp: new Date().toLocaleTimeString() }]);
            setIframeKey(Date.now()); // Automatically reload iframe with new code
        } catch (error) {
            console.error("Auto-fix failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setLogs(prev => [...prev, { level: 'error', message: `[AI Fixer] Auto-fix failed: ${errorMessage}`, timestamp: new Date().toLocaleTimeString() }]);
        } finally {
            setIsFixing(false);
        }
    };

    const iframeContent = useMemo(() => {
        const headInject = language.toLowerCase() === 'css' ? `<style>${code}</style>` : '';
        let bodyInject = '';

        switch (language.toLowerCase()) {
            case 'javascript':
                bodyInject = `<script>${code}<\/script>`;
                break;
            case 'html':
            case 'htmlbars':
                bodyInject = code;
                break;
            default:
                bodyInject = ``; // CSS is in head, nothing to inject here
        }

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    ${headInject}
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            padding: 1rem; color: #111827; 
                        }
                        body.dark { background-color: #111827; color: #f9fafb; }
                    </style>
                    <script>
                        // Theme sync
                        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                            document.body.classList.add('dark');
                        }
                        // Capture console logs
                        const originalConsole = {};
                        ['log', 'warn', 'error'].forEach(level => {
                            originalConsole[level] = console[level];
                            console[level] = (...args) => {
                                const message = args.map(arg => {
                                    try {
                                        if (arg === undefined) return 'undefined';
                                        if (arg === null) return 'null';
                                        if (arg instanceof Error) return arg.stack || arg.toString();
                                        if (typeof arg === 'object') {
                                            // A simple serializer to avoid circular reference errors
                                            try {
                                                return JSON.stringify(arg, null, 2);
                                            } catch (e) {
                                                return 'Unserializable Object';
                                            }
                                        }
                                        return String(arg);
                                    } catch (e) {
                                        return 'Error formatting log message';
                                    }
                                }).join(' ');
                                window.parent.postMessage({ type: 'log', level, message }, '*');
                                originalConsole[level].apply(console, args);
                            };
                        });
                        // Capture runtime errors
                        window.onerror = (message, source, lineno, colno, error) => {
                            const errorMsg = error ? error.stack : \`\${message} (\${source}:\${lineno}:\${colno})\`;
                            window.parent.postMessage({ type: 'error', level: 'error', message: errorMsg }, '*');
                            return true;
                        };
                    <\/script>
                </head>
                <body>
                    ${bodyInject}
                </body>
            </html>
        `;
    }, [code, language]);
    
    const errorCount = logs.filter(log => log.level === 'error').length;
    const hasError = errorCount > 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e1f22] rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" role="dialog" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Preview</h2>
                         {!isFixing && (
                            <button onClick={() => { setIframeKey(Date.now()); setLogs([]); }} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Refresh preview">
                                <RefreshCw className="h-4 w-4" />
                            </button>
                        )}
                        {hasError && !isFixing && <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Error Detected</span>
                        </div>}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className="flex-1 p-2 bg-gray-100 dark:bg-gray-900">
                        {isFixing ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-[#1e1f22] rounded-lg">
                                <LoaderCircle className="h-8 w-8 text-indigo-500 animate-spin" />
                                <p className="mt-4 text-gray-600 dark:text-gray-400">AI is fixing the code...</p>
                            </div>
                        ) : (
                            <iframe
                                key={iframeKey}
                                srcDoc={iframeContent}
                                title="Code Preview"
                                sandbox="allow-scripts allow-modals"
                                className="w-full h-full border-0 rounded-lg bg-white"
                            />
                        )}
                    </div>
                    <div className={`flex flex-col border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ${isConsoleOpen ? 'h-1/3 md:h-full md:w-1/3' : 'h-auto flex-shrink-0'}`}>
                        <div className="flex-shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <Terminal className="h-4 w-4" />
                                <span>Console</span>
                                {errorCount > 0 && (
                                    <span className="ml-1 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full h-5 w-5">
                                        {errorCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                               {hasError && (
                                    <button onClick={handleAutoFix} disabled={isFixing} className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed">
                                        <Wand2 className="h-3.5 w-3.5" /> Auto-Fix
                                    </button>
                                )}
                                <button onClick={() => setIsConsoleOpen(prev => !prev)} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800" aria-label={isConsoleOpen ? 'Collapse console' : 'Expand console'}>
                                    {isConsoleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {isConsoleOpen && (
                            <div className="flex-1 p-2 overflow-y-auto text-xs font-mono bg-white dark:bg-[#131314]">
                                {logs.length === 0 && <div className="text-gray-400 dark:text-gray-500 p-2">Console is empty.</div>}
                                {logs.map((log, index) => (
                                    <div key={index} className={`p-1.5 border-b border-gray-100 dark:border-gray-800 ${log.level === 'error' ? 'text-red-600 dark:text-red-400' : log.level === 'warn' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        <div>
                                            <div className="text-gray-400 dark:text-gray-600 select-none mb-1">{log.timestamp}</div>
                                            <pre className="whitespace-pre-wrap break-words flex-1">{log.message}</pre>
                                        </div>
                                    </div>
                                ))}
                                <div ref={consoleEndRef} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CodePreviewModal;