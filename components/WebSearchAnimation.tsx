import React, { useState, useEffect } from 'react';
import { ThoughtStep } from '../types';

const staticMessages = [
    "Searching the web for real-time information...",
    "Analyzing top search results...",
    "Cross-referencing sources for accuracy...",
    "Synthesizing findings into a response...",
    "Fact-checking against multiple sources..."
];

interface WebSearchAnimationProps {
    plan?: ThoughtStep[];
}

const WebSearchAnimation: React.FC<WebSearchAnimationProps> = ({ plan }) => {
    const messages = plan && plan.length > 0 ? plan.map(p => p.concise_step) : staticMessages;
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // Reset animation when a new plan is provided
        setCurrentMessageIndex(0);
    }, [plan]);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
                setIsFading(false);
            }, 500); // Corresponds to fade out duration
        }, 2500);
        return () => clearInterval(interval);
    }, [messages]);

    return (
        <div className="flex flex-col items-center justify-center my-4 p-4 gap-6">
            <style>
                {`
                .globe-container {
                    width: 100px;
                    height: 100px;
                    perspective: 1000px;
                }
                .globe {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    transform-style: preserve-3d;
                    animation: rotateGlobe 20s linear infinite;
                }
                .globe-ring {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border: 1px solid;
                    border-color: #60a5fa; /* blue-400 */
                    border-radius: 50%;
                    transform-style: preserve-3d;
                    box-shadow: 0 0 10px #60a5fa, inset 0 0 10px #60a5fa;
                }
                .dark .globe-ring {
                    border-color: #93c5fd; /* blue-300 */
                    box-shadow: 0 0 10px #93c5fd, inset 0 0 10px #93c5fd;
                }
                .globe-node {
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: #3b82f6; /* blue-500 */
                    border-radius: 50%;
                    box-shadow: 0 0 8px 2px #3b82f6;
                    animation: pulseNode 2s ease-in-out infinite;
                }
                .dark .globe-node {
                     background: #60a5fa; /* blue-400 */
                     box-shadow: 0 0 8px 2px #60a5fa;
                }

                /* Node Positions */
                .globe-node:nth-child(1) { top: 20%; left: 20%; animation-delay: 0.1s; transform: translateZ(48px); }
                .globe-node:nth-child(2) { top: 50%; left: 80%; animation-delay: 0.5s; transform: rotateY(90deg) translateZ(48px); }
                .globe-node:nth-child(3) { top: 80%; left: 30%; animation-delay: 1.0s; transform: rotateY(180deg) translateZ(48px); }
                .globe-node:nth-child(4) { top: 30%; left: 90%; animation-delay: 1.5s; transform: rotateY(-90deg) translateZ(48px); }
                .globe-node:nth-child(5) { top: 65%; left: 10%; animation-delay: 0.3s; transform: rotateX(70deg) translateZ(48px); }
                .globe-node:nth-child(6) { top: 15%; left: 70%; animation-delay: 0.8s; transform: rotateX(-70deg) translateZ(48px); }
                
                @keyframes rotateGlobe {
                    from { transform: rotateY(0deg) rotateX(10deg); }
                    to { transform: rotateY(360deg) rotateX(10deg); }
                }
                @keyframes pulseNode {
                    0%, 100% { transform: scale(1) translateZ(var(--tz)); opacity: 1; }
                    50% { transform: scale(1.5) translateZ(var(--tz)); opacity: 0.7; }
                }
                .globe-node:nth-child(1) { --tz: 48px; transform: translateZ(48px); }
                .globe-node:nth-child(2) { --tz: 48px; transform: rotateY(90deg) translateZ(48px); }
                .globe-node:nth-child(3) { --tz: 48px; transform: rotateY(180deg) translateZ(48px); }
                .globe-node:nth-child(4) { --tz: 48px; transform: rotateY(-90deg) translateZ(48px); }
                .globe-node:nth-child(5) { --tz: 48px; transform: rotateX(70deg) translateZ(48px); }
                .globe-node:nth-child(6) { --tz: 48px; transform: rotateX(-70deg) translateZ(48px); }
                
                .message-container {
                    min-height: 20px; /* Prevent layout shift */
                }
                `}
            </style>
            <div className="globe-container">
                <div className="globe">
                    {/* Rings */}
                    <div className="globe-ring" style={{ transform: 'rotateY(0deg)' }}></div>
                    <div className="globe-ring" style={{ transform: 'rotateY(60deg)' }}></div>
                    <div className="globe-ring" style={{ transform: 'rotateY(120deg)' }}></div>
                    <div className="globe-ring" style={{ transform: 'rotateX(90deg)' }}></div>
                    {/* Nodes */}
                    <div className="globe-node"></div>
                    <div className="globe-node"></div>
                    <div className="globe-node"></div>
                    <div className="globe-node"></div>
                    <div className="globe-node"></div>
                    <div className="globe-node"></div>
                </div>
            </div>
            <div className="message-container">
                <p className={`text-center text-sm text-gray-500 dark:text-gray-400 transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                    {messages[currentMessageIndex]}
                </p>
            </div>
        </div>
    );
};

export default WebSearchAnimation;