import React from 'react';
import { X } from 'lucide-react';

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <h2 id="image-modal-title" className="sr-only">Enlarged image view</h2>
        <img src={imageUrl} alt="Enlarged view" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        <button 
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-gray-800 text-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close image view"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
);

export default ImageModal;
