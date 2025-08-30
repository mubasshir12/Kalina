

import React, { useState, useRef, useEffect } from 'react';
import { LTM } from '../types';
import { ArrowLeft, Trash2, BrainCircuit } from 'lucide-react';

interface MemoryManagementProps {
    memory: LTM;
    setMemory: React.Dispatch<React.SetStateAction<LTM>>;
    onBack: () => void;
}

interface MemoryItemProps {
    memoryText: string;
    onDelete: () => void;
}

const MemoryItem: React.FC<MemoryItemProps> = ({ memoryText, onDelete }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        timerRef.current = setTimeout(() => {
            setIsDeleting(true);
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        }, 500); // 500ms for long press
    };

    const handlePressEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    };

    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        // If click is not on the delete button itself, hide it
        if (!target.closest('.delete-button')) {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (isDeleting) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDeleting]);
    

    return (
        <li
            className="relative p-4 flex items-center justify-between transition-colors duration-200"
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            style={{ touchAction: 'pan-y', WebkitUserSelect: 'none', userSelect: 'none' }}
        >
            <p className={`flex-1 text-sm text-gray-700 dark:text-gray-300 transition-transform duration-300 ease-in-out ${isDeleting ? '-translate-x-12' : 'translate-x-0'}`}>
                {memoryText}
            </p>
            <div className={`absolute top-0 right-0 h-full flex items-center transition-opacity duration-300 ease-in-out ${isDeleting ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <button
                    onClick={onDelete}
                    className="delete-button h-full w-14 flex items-center justify-center bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
                    aria-label="Delete memory"
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>
        </li>
    );
};

const MemoryManagement: React.FC<MemoryManagementProps> = ({ memory, setMemory, onBack }) => {

    const handleDelete = (indexToDelete: number) => {
        setMemory(prevMemory => prevMemory.filter((_, index) => index !== indexToDelete));
    };

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-[#131314]">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center mb-6">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors mr-2 md:mr-4"
                        aria-label="Back to chat"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">Long-Term Memory</h1>
                </div>
                
                <div className="bg-white dark:bg-[#1e1f22] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Saved Facts</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Long-press on an item to delete it.</p>
                    </div>
                    
                    {memory.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-12 px-4">
                            <BrainCircuit className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Memory is empty.</h3>
                            <p className="text-sm">Important facts from your conversations will be saved here.</p>
                        </div>
                    ) : (
                       <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {memory.map((mem, index) => (
                                <MemoryItem
                                    key={index}
                                    memoryText={mem}
                                    onDelete={() => handleDelete(index)}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </main>
    );
};

export default MemoryManagement;
