import React from 'react';
import { X } from 'lucide-react';

interface CodePreviewModalProps {
    htmlContent: string;
    onClose: () => void;
}

const CodePreviewModal: React.FC<CodePreviewModalProps> = ({ htmlContent, onClose }) => {
    const iframeContent = `
        <!DOCTYPE html>
        <html>
            <head>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
                        padding: 1rem;
                        color: #111827; 
                    }
                    body.dark {
                        background-color: #111827;
                        color: #f9fafb;
                    }
                </style>
                <script>
                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        document.body.classList.add('dark');
                    }
                </script>
            </head>
            <body>
                ${htmlContent}
            </body>
        </html>
    `;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e1f22] rounded-2xl shadow-xl w-full max-w-3xl h-[80vh] flex flex-col transform transition-all" role="dialog" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Preview</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-grow p-2 bg-gray-100 dark:bg-gray-900 rounded-b-2xl">
                     <iframe
                        srcDoc={iframeContent}
                        title="Code Preview"
                        sandbox="allow-scripts allow-modals"
                        className="w-full h-full border-0 rounded-lg bg-white"
                    />
                </div>
            </div>
        </div>
    );
};

export default CodePreviewModal;
