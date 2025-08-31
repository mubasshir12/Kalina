import React, { useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { Image as ImageIcon, File, MessageSquareText } from 'lucide-react';

interface HorizontalNavigatorProps {
    messages: ChatMessageType[];
    userMessageIndices: number[];
    activeMessageIndex: number | null;
    onItemClick: (index: number) => void;
}

const PreviewContent: React.FC<{ message: ChatMessageType }> = ({ message }) => {
    if (message.image) {
        return (
            <img
                src={`data:${message.image.mimeType};base64,${message.image.base64}`}
                alt="Image preview"
                className="w-full h-full object-cover"
                loading="lazy"
            />
        );
    }
    if (message.file) {
        return <File className="w-6 h-6 text-gray-500 dark:text-gray-400" />;
    }
    return <MessageSquareText className="w-6 h-6 text-gray-500 dark:text-gray-400" />;
};


const HorizontalNavigator: React.FC<HorizontalNavigatorProps> = ({
    messages,
    userMessageIndices,
    activeMessageIndex,
    onItemClick,
}) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());

    useEffect(() => {
        const activeItem = itemRefs.current.get(activeMessageIndex ?? -1);
        if (activeItem) {
            activeItem.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
            });
        }
    }, [activeMessageIndex]);

    return (
        <div
            ref={scrollerRef}
            className="flex items-center gap-3 overflow-x-auto pb-2 horizontal-navigator scrollbar-hide"
            role="navigation"
            aria-label="Horizontal conversation timeline"
        >
            {userMessageIndices.map(index => {
                const msg = messages[index];
                const isActive = activeMessageIndex === index;
                return (
                    <button
                        key={index}
                        ref={el => { itemRefs.current.set(index, el); }}
                        onClick={() => onItemClick(index)}
                        className={`
                            relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden 
                            flex items-center justify-center 
                            bg-white dark:bg-gray-800/50 
                            border-2 transition-all duration-300
                            shadow-md hover:shadow-lg hover:border-indigo-400
                            ${isActive ? 'border-indigo-500 scale-105' : 'border-gray-200 dark:border-gray-700'}
                        `}
                        aria-label={`Go to message by ${msg.role} with content: ${msg.content?.substring(0, 30)}`}
                        aria-current={isActive}
                    >
                        <PreviewContent message={msg} />
                    </button>
                );
            })}
        </div>
    );
};

export default HorizontalNavigator;