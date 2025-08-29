
import React from 'react';
import { GroundingChunk } from '../types';

// Renders a single source citation as a clickable favicon.
const Citation: React.FC<{ source: GroundingChunk; index: number }> = ({ source, index }) => {
    // Return a fallback if the source or its URI is missing.
    if (!source?.web?.uri) {
        return <sup className="text-xs font-semibold text-red-500 dark:text-red-400 mx-0.5" title="Source URI is missing">[{index + 1}]?</sup>;
    }

    try {
        const hostname = new URL(source.web.uri).hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?sz=16&domain_url=${hostname}`;
        const title = source.web.title ? `${source.web.title}\n${source.web.uri}` : source.web.uri;

        return (
            <a
                href={source.web.uri}
                target="_blank"
                rel="noopener noreferrer"
                title={title}
                className="inline-flex items-center justify-center align-middle w-5 h-5 mx-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <img
                    src={faviconUrl}
                    alt={`Source: ${hostname}`}
                    className="w-3 h-3 object-contain"
                    onError={(e) => {
                        // If the favicon fails to load, replace it with the citation number.
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                            const span = document.createElement('span');
                            span.className = "text-xs font-bold leading-5 text-gray-500 dark:text-gray-400";
                            span.textContent = `${index + 1}`;
                            parent.innerHTML = '';
                            parent.appendChild(span);
                        }
                    }}
                />
            </a>
        );
    } catch (e) {
        // Fallback for invalid URLs that throw an error in the URL constructor.
        return <sup className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 mx-0.5" title={`Invalid URL: ${source.web.uri}`}>[{index + 1}]</sup>;
    }
};

// Parses inline markdown: **bold**, *italic*, citations [1], and links.
const parseInline = (text: string, sources?: GroundingChunk[]): React.ReactNode => {
    const regex = /(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|\[\d+\]|https?:\/\/\S+|www\.\S+)/g;
    const urlRegex = /^(https?:\/\/\S+|www\.\S+)$/;

    return text.split(regex).filter(Boolean).map((part, i) => {
        const citationMatch = part.match(/^\[(\d+)\]$/);
        if (citationMatch && sources) {
            const index = parseInt(citationMatch[1], 10) - 1;
            if (index >= 0 && index < sources.length) {
                return <Citation key={i} source={sources[index]} index={index} />;
            }
        }

        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        
        if (urlRegex.test(part)) {
            const href = part.startsWith('www.') ? `https://${part}` : part;
            return (
                <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 dark:text-indigo-400 hover:underline break-all"
                >
                    {part}
                </a>
            );
        }

        return part;
    });
};

const MarkdownRenderer: React.FC<{ content: string; sources?: GroundingChunk[] }> = ({ content, sources }) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;

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

    lines.forEach((line, index) => {
        if (line.startsWith('# ')) {
            flushList(`list-before-h1-${index}`);
            elements.push(<h1 key={index} className="text-2xl font-bold mt-5 mb-2">{parseInline(line.substring(2), sources)}</h1>);
            return;
        }
        if (line.startsWith('## ')) {
            flushList(`list-before-h2-${index}`);
            elements.push(<h2 key={index} className="text-xl font-bold mt-4 mb-1">{parseInline(line.substring(3), sources)}</h2>);
            return;
        }
        if (line.startsWith('### ')) {
            flushList(`list-before-h3-${index}`);
            elements.push(<h3 key={index} className="text-lg font-bold mt-3 mb-1">{parseInline(line.substring(4), sources)}</h3>);
            return;
        }
        
        const ulMatch = line.match(/^(\s*)(\*|-)\s+(.*)/);
        if (ulMatch) {
            if (currentList?.type !== 'ul') {
                flushList(`list-before-ul-${index}`);
                currentList = { type: 'ul', items: [] };
            }
            currentList.items.push(parseInline(ulMatch[3], sources));
            return;
        }

        const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
        if (olMatch) {
            if (currentList?.type !== 'ol') {
                flushList(`list-before-ol-${index}`);
                currentList = { type: 'ol', items: [] };
            }
            currentList.items.push(parseInline(olMatch[3], sources));
            return;
        }

        flushList(`list-before-p-${index}`);
        if (line.trim() !== '') {
            elements.push(<p key={index}>{parseInline(line, sources)}</p>);
        } else if (elements.length > 0 && lines[index-1]?.trim() !== '') {
            elements.push(<div key={`spacer-${index}`} className="h-4"></div>);
        }
    });

    flushList('list-at-end');

    return <>{elements}</>;
};

export default MarkdownRenderer;
