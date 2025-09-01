

import React from 'react';

const ThinkingAnimation: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center">
            <style>
                {`
                .thinking-animation-container {
                    width: 100px;
                    height: 100px;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .orbit {
                    position: absolute;
                    border-radius: 50%;
                    border: 1px solid;
                    animation: rotate 20s linear infinite;
                }
                .orbit-1 {
                    width: 60px;
                    height: 60px;
                    border-color: #c4b5fd22; /* violet-300 with opacity */
                    animation-duration: 10s;
                }
                .orbit-2 {
                    width: 90px;
                    height: 90px;
                    border-color: #c4b5fd33;
                    animation-duration: 15s;
                    animation-direction: reverse;
                }
                .dark .orbit-1 { border-color: #a78bfa44; }
                .dark .orbit-2 { border-color: #a78bfa55; }
                .node {
                    width: 8px;
                    height: 8px;
                    background-color: #8b5cf6; /* violet-500 */
                    border-radius: 50%;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 8px 1px #8b5cf6;
                }
                .dark .node {
                    background-color: #a78bfa; /* violet-400 */
                    box-shadow: 0 0 8px 1px #a78bfa;
                }
                .node-1 { animation: orbit-path-1 10s linear infinite; }
                .node-2 { animation: orbit-path-2 15s linear infinite reverse; }
                .node-3 { animation: pulse-core 2s ease-in-out infinite; } /* Center node */
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes orbit-path-1 {
                    from { transform: rotate(0deg) translateX(30px) rotate(0deg); }
                    to { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
                }
                @keyframes orbit-path-2 {
                    from { transform: rotate(0deg) translateX(45px) rotate(0deg); }
                    to { transform: rotate(360deg) translateX(45px) rotate(-360deg); }
                }
                @keyframes pulse-core {
                    0%, 100% { transform: scale(1.2); box-shadow: 0 0 12px 2px #8b5cf6; }
                    50% { transform: scale(1); box-shadow: 0 0 8px 1px #8b5cf6; }
                }
                .dark @keyframes pulse-core {
                    0%, 100% { transform: scale(1.2); box-shadow: 0 0 12px 2px #a78bfa; }
                    50% { transform: scale(1); box-shadow: 0 0 8px 1px #a78bfa; }
                }
                `}
            </style>
            <div className="thinking-animation-container">
                <div className="orbit orbit-1"></div>
                <div className="orbit orbit-2"></div>
                <div className="node node-1"></div>
                <div className="node node-2"></div>
                <div className="node node-3"></div>
            </div>
        </div>
    );
};

export default ThinkingAnimation;