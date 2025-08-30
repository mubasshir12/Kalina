
import React from 'react';

interface ImagePromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
}

const defaultSuggestions = [
  "A cyberpunk cityscape at night, glowing with neon lights, detailed",
  "An astronaut riding a unicorn on the moon, photorealistic, 4K",
  "A magical forest with glowing mushrooms and whimsical creatures, fantasy art",
  "A majestic dragon perched on a mountain peak, epic, digital painting",
  "A vintage robot serving tea in a Victorian-era room, steampunk style",
  "Abstract art representing the feeling of joy, vibrant colors, swirling patterns",
  "A tranquil zen garden with a cherry blossom tree, minimalist",
  "A bustling medieval marketplace, full of life and detail",
  "A futuristic high-speed train traveling through a mountain pass",
  "An enchanted library with floating books and ancient scrolls"
];

const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength - 1) + '…';
};

const MarqueeRow: React.FC<{
    prompts: string[];
    onSelectPrompt: (prompt: string) => void;
    direction?: 'left' | 'right';
}> = ({ prompts, onSelectPrompt, direction = 'left' }) => {
    const animationDuration = prompts.length * 8; // Adjust speed based on number of items
    return (
        <div className="marquee">
            <div 
                className="marquee-content"
                style={{ 
                    animationDuration: `${animationDuration}s`,
                    animationDirection: direction === 'right' ? 'reverse' : 'normal'
                }}
            >
                {[...prompts, ...prompts].map((prompt, i) => (
                    <button
                        key={`${prompt}-${i}`}
                        onClick={() => onSelectPrompt(prompt)}
                        className="relative w-48 h-20 rounded-lg overflow-hidden flex-shrink-0 group text-white text-left p-2.5"
                        title={prompt}
                    >
                        <img
                            src={`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=200&height=100&seed=${i}`}
                            alt={prompt}
                            className="absolute inset-0 w-full h-full object-cover transition-all duration-300 ease-in-out group-hover:scale-110 filter brightness-[.55] group-hover:brightness-[.7]"
                            crossOrigin="anonymous"
                            loading="lazy"
                        />
                        <span className="relative z-10 text-xs font-semibold drop-shadow-md">
                            {truncateText(prompt, 65)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};


const ImagePromptSuggestions: React.FC<ImagePromptSuggestionsProps> = ({ onSelectPrompt }) => {
  const suggestions = defaultSuggestions;
  const firstRowSuggestions = suggestions.slice(0, Math.ceil(suggestions.length / 2));
  const secondRowSuggestions = suggestions.slice(Math.ceil(suggestions.length / 2));

  return (
    <div className="mb-4 space-y-3 w-full overflow-hidden">
        <style>{`
            .marquee {
                position: relative;
                overflow: hidden;
                -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
                mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
            }
            .marquee-content {
                display: flex;
                gap: 0.75rem; /* 12px */
                animation-name: marquee;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
            }
            .marquee:hover .marquee-content {
                animation-play-state: paused;
            }
            @keyframes marquee {
                from { transform: translateX(0); }
                to { transform: translateX(calc(-100% - 0.75rem)); }
            }
        `}</style>
        <>
            <MarqueeRow prompts={firstRowSuggestions} onSelectPrompt={onSelectPrompt} direction="left" />
            <MarqueeRow prompts={secondRowSuggestions} onSelectPrompt={onSelectPrompt} direction="right" />
        </>
    </div>
  );
};

export default ImagePromptSuggestions;