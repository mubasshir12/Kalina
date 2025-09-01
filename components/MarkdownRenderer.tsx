
import React, { useState, useEffect } from 'react';
import { GroundingChunk } from '../types';
import { Copy, Check, Play } from 'lucide-react';
import CodePreviewModal from './CodePreviewModal';

interface CodeBlockProps {
    language: string;
    code: string;
    onPersistUpdate: (oldCode: string, newCode: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code: initialCode, onPersistUpdate }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [currentCode, setCurrentCode] = useState(initialCode);

    useEffect(() => {
        // If the parent's code changes (e.g., from a re-render), update the local state.
        setCurrentCode(initialCode);
    }, [initialCode]);

    const handleCodeFixed = (newCode: string) => {
        setCurrentCode(newCode);
        onPersistUpdate(initialCode, newCode);
    };

    const isRunnable = ['html', 'htmlbars', 'javascript', 'css'].includes(language.toLowerCase());

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(currentCode);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code: ', err);
        }
    };

    return (
        <>
            {isRunnable && isPreviewOpen && (
                <CodePreviewModal 
                    initialCode={currentCode}
                    language={language}
                    onClose={() => setIsPreviewOpen(false)}
                    onCodeFixed={handleCodeFixed}
                />
            )}
            <div className="bg-gray-100 dark:bg-[#1e1f22] rounded-lg my-4 border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2 bg-gray-200 dark:bg-gray-800/50">
                    <span className="text-xs font-sans text-gray-500 dark:text-gray-400 uppercase font-semibold">
                        {language || 'code'}
                    </span>
                    <div className="flex items-center gap-4">
                        {isRunnable && (
                             <button
                                onClick={() => setIsPreviewOpen(true)}
                                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                                aria-label="Run code"
                            >
                                <Play className="h-3.5 w-3.5" />
                                <span>Run</span>
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                            aria-label={isCopied ? 'Copied' : 'Copy code'}
                        >
                            {isCopied ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
                <pre className="p-4 text-sm whitespace-pre overflow-x-auto code-scrollbar">
                    <code className={`font-mono language-${language}`}>
                        {currentCode}
                    </code>
                </pre>
            </div>
        </>
    );
};

// Renders a single source citation as a clickable text-based tag.
const Citation: React.FC<{ source: GroundingChunk; index: number }> = ({ source, index }) => {
    // Return a fallback if the source or its URI is missing.
    if (!source?.web?.uri) {
        return <sup className="text-xs font-semibold text-red-500 dark:text-red-400 mx-0.5" title="Source URI is missing">[{index + 1}]?</sup>;
    }

    try {
        const hostname = new URL(source.web.uri).hostname.replace(/^www\./, '');
        // Use the title if available, otherwise fallback to the hostname.
        const displayName = source.web.title || hostname;
        const fullTitle = source.web.title ? `${source.web.title}\n${source.web.uri}` : source.web.uri;

        return (
            <a
                href={source.web.uri}
                target="_blank"
                rel="noopener noreferrer"
                title={fullTitle}
                className="inline-block align-baseline ml-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium no-underline hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                {displayName}
            </a>
        );
    } catch (e) {
        // Fallback for invalid URLs that throw an error in the URL constructor.
        return <sup className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 mx-0.5" title={`Invalid URL: ${source.web.uri}`}>[{index + 1}]</sup>;
    }
};


// Parses inline markdown: **bold**, *italic*, `code`, citations [1], and links.
const parseInline = (text: string, sources?: GroundingChunk[]): React.ReactNode => {
    const regex = /(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|\`.+?\`|\[\d+\]|https?:\/\/\S+|www\.\S+)/g;
    const urlRegex = /^(https?:\/\/\S+|www\.\S+)$/;

    return text.split(regex).filter(Boolean).map((part, i) => {
        const citationMatch = part.match(/^\[(\d+)\]$/);
        if (citationMatch) {
            if (sources) {
                const index = parseInt(citationMatch[1], 10) - 1;
                if (index >= 0 && index < sources.length) {
                    return <Citation key={i} source={sources[index]} index={index} />;
                }
            }
            // If no sources or index out of bounds, render nothing for the citation.
            return null;
        }

        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-gray-200 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 font-mono text-sm px-1.5 py-1 rounded-md mx-0.5">{part.slice(1, -1)}</code>;
        }
        
        if (urlRegex.test(part)) {
            const href = part.startsWith('www.') ? `https://${part}` : part;
            return (
                <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 bg-indigo-100/80 dark:bg-indigo-900/50 hover:bg-indigo-200/80 dark:hover:bg-indigo-800/60 font-medium px-2 py-0.5 rounded-full no-underline hover:underline break-all"
                >
                    {part}
                </a>
            );
        }

        return part;
    });
};

interface MarkdownRendererProps {
    content: string;
    sources?: GroundingChunk[];
    onContentUpdate: (newContent: string) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, sources, onContentUpdate }) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
    
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage = '';

    const flushList = (key: string | number) => {
        if (currentList) {
            const ListTag = currentList.type;
            const className = `${
                ListTag === 'ul' ? 'list-disc' : 'list-decimal'
            } list-inside space-y-1 my-3 pl-5`;
            elements.push(
                <ListTag key={key} className={className}>
                    {currentList.items.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ListTag>
            );
            currentList = null;
        }
    };

    const handlePersistCodeUpdate = (oldCode: string, newCode: string, language: string) => {
        const oldCodeBlock = `\`\`\`${language}\n${oldCode}\n\`\`\``;
        const newCodeBlock = `\`\`\`${language}\n${newCode}\n\`\`\``;
        // A simple replace is generally safe as the same code block is unlikely to appear twice in one message.
        // For more complex scenarios, a more robust replacement strategy would be needed.
        onContentUpdate(content.replace(oldCodeBlock, newCodeBlock));
    };

    lines.forEach((line, index) => {
        // Code blocks
        if (line.trim().startsWith('```')) {
            flushList(`list-before-code-${index}`);
            if (inCodeBlock) {
                const code = codeBlockContent.join('\n');
                const lang = codeBlockLanguage;
                elements.push(<CodeBlock 
                    key={`code-${index}`} 
                    language={lang} 
                    code={code}
                    onPersistUpdate={(old, newC) => handlePersistCodeUpdate(old, newC, lang)}
                />);
                inCodeBlock = false;
                codeBlockContent = [];
                codeBlockLanguage = '';
            } else {
                inCodeBlock = true;
                codeBlockLanguage = line.trim().substring(3).trim();
            }
            return;
        }

        if (inCodeBlock) {
            codeBlockContent.push(line);
            return;
        }

        // Horizontal Rules
        if (line.match(/^(---|___|\*\*\*)\s*$/)) {
            flushList(`list-before-hr-${index}`);
            elements.push(<hr key={index} className="my-4 border-gray-200 dark:border-gray-700" />);
            return;
        }
        
        // Headings (h1-h6)
        const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
            flushList(`list-before-h-${index}`);
            const level = headingMatch[1].length;
            const Tag = `h${level}` as keyof JSX.IntrinsicElements;
            const text = headingMatch[2];
            const classNames = [
                "font-bold",
                level === 1 ? "text-2xl mt-5 mb-2" : "",
                level === 2 ? "text-xl mt-4 mb-1" : "",
                level === 3 ? "text-lg mt-3 mb-1" : "",
                level >= 4 ? "text-base mt-2 mb-1" : ""
            ].join(" ");
            elements.push(<Tag key={index} className={classNames}>{parseInline(text, sources)}</Tag>);
            return;
        }
        
        // Unordered lists
        const ulMatch = line.match(/^(\s*)(\*|-)\s+(.*)/);
        if (ulMatch) {
            if (currentList?.type !== 'ul') {
                flushList(`list-before-ul-${index}`);
                currentList = { type: 'ul', items: [] };
            }
            currentList.items.push(parseInline(ulMatch[3], sources));
            return;
        }

        // Ordered lists
        const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
        if (olMatch) {
            if (currentList?.type !== 'ol') {
                flushList(`list-before-ol-${index}`);
                currentList = { type: 'ol', items: [] };
            }
            currentList.items.push(parseInline(olMatch[3], sources));
            return;
        }

        // Paragraphs and empty lines
        flushList(`list-before-p-${index}`);
        if (line.trim() !== '') {
            elements.push(<p key={index}>{parseInline(line, sources)}</p>);
        } else if (elements.length > 0 && lines[index-1]?.trim() !== '') {
            // Add a spacer for intentional line breaks, but not for multiple empty lines
            elements.push(<div key={`spacer-${index}`} className="h-4"></div>);
        }
    });

    flushList('list-at-end');

    if (inCodeBlock) {
        const code = codeBlockContent.join('\n');
        const lang = codeBlockLanguage;
        elements.push(<CodeBlock 
            key="code-at-end" 
            language={lang} 
            code={code}
            onPersistUpdate={(old, newC) => handlePersistCodeUpdate(old, newC, lang)}
        />);
    }

    return <>{elements}</>;
};

export default MarkdownRenderer;
