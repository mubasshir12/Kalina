
import React from 'react';

const ThinkingAnimation: React.FC = () => {
    return (
        <div className="flex items-center justify-center gap-1 w-6 h-5">
            <style>
                {`
                .thinking-bar {
                    display: inline-block;
                    width: 4px;
                    background-color: #8b5cf6; /* violet-500 */
                    border-radius: 2px;
                    animation: pulse-bar 1.2s ease-in-out infinite;
                }
                .dark .thinking-bar {
                    background-color: #a78bfa; /* violet-400 */
                }
                .thinking-bar-1 {
                    animation-delay: 0s;
                }
                .thinking-bar-2 {
                    animation-delay: 0.15s;
                }
                .thinking-bar-3 {
                    animation-delay: 0.3s;
                }
                @keyframes pulse-bar {
                    0%, 100% {
                        height: 6px;
                    }
                    50% {
                        height: 20px;
                    }
                }
                `}
            </style>
            <div className="thinking-bar thinking-bar-1"></div>
            <div className="thinking-bar thinking-bar-2"></div>
            <div className="thinking-bar thinking-bar-3"></div>
        </div>
    );
};

export default ThinkingAnimation;
