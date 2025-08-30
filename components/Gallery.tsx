
import React, { useState } from 'react';
import { ArrowLeft, ImageOff } from 'lucide-react';
import GeneratedImage from './GeneratedImage';
import ImageModal from './ImageModal';
import ConfirmationModal from './ConfirmationModal';

interface GalleryProps {
    images: string[];
    onBack: () => void;
    onDeleteImage: (index: number) => void;
}

const Gallery: React.FC<GalleryProps> = ({ images, onBack, onDeleteImage }) => {
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [imageToDeleteIndex, setImageToDeleteIndex] = useState<number | null>(null);
    const [imageToDownload, setImageToDownload] = useState<string | null>(null);

    const handleConfirmDownload = () => {
        if (!imageToDownload) return;
        const imageUrl = `data:image/png;base64,${imageToDownload}`;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `kalina-ai-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleConfirmDelete = () => {
        if (imageToDeleteIndex !== null) {
            onDeleteImage(imageToDeleteIndex);
        }
    };

    // Show a placeholder when no images have been generated yet.
    if (images.length === 0) {
        return (
            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 text-center">
                <ImageOff className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Your Gallery is Empty</h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                    Start by generating some images in the chat!
                </p>
                <button
                    onClick={onBack}
                    className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                    Back to Chat
                </button>
            </main>
        );
    }

    // Render the gallery grid with all generated images.
    return (
        <>
            {modalImage && <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />}
            <ConfirmationModal
                isOpen={imageToDownload !== null}
                onClose={() => setImageToDownload(null)}
                onConfirm={handleConfirmDownload}
                title="Confirm Download"
                message="Do you want to download this image?"
                confirmButtonText="Download"
            />
            <ConfirmationModal
                isOpen={imageToDeleteIndex !== null}
                onClose={() => setImageToDeleteIndex(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Image"
                message="Are you sure you want to permanently delete this image? This action cannot be undone."
                confirmButtonText="Delete"
                confirmButtonVariant="danger"
            />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center mb-6">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors mr-2 md:mr-4"
                            aria-label="Back to chat"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">Image Gallery</h1>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                        {images.map((base64, index) => (
                           <div className="aspect-square" key={index}>
                               <GeneratedImage
                                   base64={base64}
                                   onExpandClick={setModalImage}
                                   onDownloadClick={setImageToDownload}
                                   onDeleteClick={() => setImageToDeleteIndex(index)}
                               />
                           </div>
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
};

export default Gallery;
