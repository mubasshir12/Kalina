
import React from 'react';
import { Expand, Download, Trash2 } from 'lucide-react';

interface GeneratedImageProps {
    base64: string;
    onExpandClick: (url: string) => void;
    onDownloadClick: (base64: string) => void;
    onDeleteClick?: () => void;
    alt?: string;
}

const GeneratedImage: React.FC<GeneratedImageProps> = ({ base64, onExpandClick, onDownloadClick, onDeleteClick, alt = "AI generated image" }) => {
    const imageUrl = `data:image/png;base64,${base64}`;

    return (
      <div className="relative group w-full h-full">
        <img 
            src={imageUrl} 
            alt={alt}
            className="rounded-lg w-full h-full object-cover cursor-pointer"
            onClick={() => onExpandClick(imageUrl)}
        />
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onExpandClick(imageUrl); }} 
            className="p-1.5 bg-black/40 text-white rounded-full backdrop-blur-sm hover:bg-black/60" 
            aria-label="View full image"
          >
            <Expand className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDownloadClick(base64); }} 
            className="p-1.5 bg-black/40 text-white rounded-full backdrop-blur-sm hover:bg-black/60" 
            aria-label="Download image"
          >
            <Download className="h-4 w-4" />
          </button>
          {onDeleteClick && (
            <button 
                onClick={(e) => { e.stopPropagation(); onDeleteClick(); }} 
                className="p-1.5 bg-black/40 text-white rounded-full backdrop-blur-sm hover:bg-black/60" 
                aria-label="Delete image"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
}

export default GeneratedImage;
