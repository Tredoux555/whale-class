'use client';

import { useEffect } from 'react';

interface VaultImageViewerProps {
  imageUrl: string;
  filename: string;
  onClose: () => void;
}

export function VaultImageViewer({ imageUrl, filename, onClose }: VaultImageViewerProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl max-h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with filename and close button */}
        <div className="flex items-center justify-between mb-4 px-4 py-2 bg-black bg-opacity-50 rounded-t-lg">
          <p className="text-white font-medium text-sm truncate max-w-md">
            {filename}
          </p>
          <button
            onClick={onClose}
            className="ml-4 text-white hover:text-gray-300 transition-colors text-2xl font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Image */}
        <div className="flex items-center justify-center">
          <img
            src={imageUrl}
            alt={filename}
            className="max-w-full max-h-[calc(100vh-120px)] object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Footer hint */}
        <div className="mt-4 text-center text-gray-300 text-sm">
          Press ESC or click outside to close
        </div>
      </div>
    </div>
  );
}
