import React, { useState, useEffect } from 'react';

// Simplified interface for our sampler images
interface SamplerImage {
    id: string;
    src: string;
}

interface ImageSamplerProps {
  onSelectImage: (imageUrl: string) => void;
}

// A diverse set of predefined prompts for Pollinations API
const samplePrompts = [
    "a beautiful landscape, photorealistic",
    "a futuristic cyborg warrior, concept art",
    "colorful abstract art, vibrant",
    "a cute kitten playing with yarn, detailed",
    "a majestic mountain range at sunrise, epic",
    "a fantasy castle in the clouds",
    "a steampunk airship flying through a storm",
    "a robot in a zen garden, tranquil",
    "an underwater city glowing with bioluminescent light, cinematic"
];

const ImageSampler: React.FC<ImageSamplerProps> = ({ onSelectImage }) => {
    const [visibleImages, setVisibleImages] = useState<SamplerImage[]>([]);

    useEffect(() => {
        // Generate image URLs from the predefined prompts
        const allImages: SamplerImage[] = samplePrompts.map(prompt => ({
            id: prompt,
            src: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
        }));
        
        // Shuffle the images and select the first 6 to display
        const shuffled = [...allImages].sort(() => 0.5 - Math.random());
        setVisibleImages(shuffled.slice(0, 6));
    }, []); // Empty dependency array ensures this effect runs only once on mount

    // If there are no images to display, render nothing.
    if (visibleImages.length === 0) {
        return null;
    }

    return (
        <div className="mb-3 px-1 flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
            {visibleImages.map((image) => (
                <button
                    key={image.id}
                    onClick={() => onSelectImage(image.src)}
                    className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden group focus:outline-none focus:ring-2 focus:ring-indigo-500 ring-offset-2 dark:ring-offset-[#131314]"
                    title={image.id} // The prompt is used as a tooltip
                >
                    <img
                        src={image.src}
                        alt={image.id} // And as alt text
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        crossOrigin="anonymous"
                        loading="lazy" // Native lazy loading for performance
                    />
                </button>
            ))}
        </div>
    );
};

export default ImageSampler;