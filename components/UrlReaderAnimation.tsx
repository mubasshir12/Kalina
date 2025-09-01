import React, { useState, useEffect } from 'react';

const messages = [
    "Accessing the provided URL...",
    "Fetching page content securely...",
    "Analyzing the page layout...",
    "Extracting key information...",
    "Ignoring ads and navigation...",
    "Preparing the content for AI analysis...",
];

interface UrlReaderAnimationProps {
    isLongUrlRead?: boolean;
}

const UrlReaderAnimation: React.FC<UrlReaderAnimationProps> = ({ isLongUrlRead }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
                setIsFading(false);
            }, 500);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const animationMarkup = (
        <>
            <style>
                {`
                .scanner-container {
                    width: 100px;
                    height: 100px;
                    position: relative;
                    overflow: hidden;
                }
                .document-icon {
                    width: 60px;
                    height: 70px;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: #e5e7eb; /* gray-200 */
                    border-radius: 8px;
                    border: 2px solid #9ca3af; /* gray-400 */
                }
                .dark .document-icon {
                    background-color: #374151; /* gray-700 */
                    border-color: #6b7280; /* gray-500 */
                }
                .document-line {
                    position: absolute;
                    left: 10px;
                    right: 10px;
                    height: 3px;
                    background-color: #9ca3af; /* gray-400 */
                    border-radius: 2px;
                }
                .dark .document-line {
                     background-color: #6b7280; /* gray-500 */
                }
                .document-line:nth-child(1) { top: 15px; }
                .document-line:nth-child(2) { top: 25px; width: 80%; }
                .document-line:nth-child(3) { top: 35px; width: 90%; }
                .document-line:nth-child(4) { top: 45px; }
                .scanner-beam {
                    position: absolute;
                    top: -10%;
                    left: 0;
                    right: 0;
                    height: 5px;
                    background-color: #60a5fa; /* blue-400 */
                    box-shadow: 0 0 10px 2px #60a5fa;
                    border-radius: 5px;
                    animation: scan 3s ease-in-out infinite;
                }
                .dark .scanner-beam {
                     background-color: #93c5fd; /* blue-300 */
                     box-shadow: 0 0 10px 2px #93c5fd;
                }
                @keyframes scan {
                    0%, 100% { transform: translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(100px); }
                }
                .message-container {
                    min-height: 20px; /* Prevent layout shift */
                }
                `}
            </style>
            <div className="scanner-container">
                <div className="document-icon">
                    <div className="document-line"></div>
                    <div className="document-line"></div>
                    <div className="document-line"></div>
                    <div className="document-line"></div>
                </div>
                <div className="scanner-beam"></div>
            </div>
        </>
    );

    return (
        <div className="flex flex-col items-center justify-center my-4 p-4 gap-6">
            {animationMarkup}
            <div className="message-container">
                <p className={`text-center text-sm text-gray-500 dark:text-gray-400 transition-opacity duration-500 ${isFading && !isLongUrlRead ? 'opacity-0' : 'opacity-100'}`}>
                    {isLongUrlRead
                        ? "This page is quite large, analysis is taking a bit longer than usual. Thanks for your patience!"
                        : messages[currentMessageIndex]}
                </p>
            </div>
        </div>
    );
};

export default UrlReaderAnimation;