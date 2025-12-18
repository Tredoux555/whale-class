'use client';

import { useState } from 'react';

interface ExtractedFrame {
  timestamp: number;
  imageData: string;
  lyric?: string;
}

interface FlashcardPreviewProps {
  frames: ExtractedFrame[];
  songTitle: string;
  onRemove: (index: number) => void;
  onUpdateLyric: (index: number, lyric: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function FlashcardPreview({ 
  frames, 
  songTitle, 
  onRemove, 
  onUpdateLyric,
  onReorder 
}: FlashcardPreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorder(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">🖼️ Preview Flashcards</h2>
          <p className="text-sm text-gray-500 mt-1">
            {frames.length} cards from "{songTitle}" • Drag to reorder • Click to edit lyrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {frames.map((frame, index) => (
          <div
            key={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`relative group cursor-move rounded-xl overflow-hidden border-4 border-cyan-400 shadow-md transition-all hover:shadow-xl hover:scale-[1.02] ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
          >
            {/* Card Number Badge */}
            <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center font-bold text-cyan-600 shadow-sm">
              {index + 1}
            </div>

            {/* Timestamp Badge */}
            <div className="absolute top-2 right-2 z-10 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              {formatTimestamp(frame.timestamp)}
            </div>

            {/* Remove Button */}
            <button
              onClick={() => onRemove(index)}
              className="absolute top-2 right-12 z-10 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>

            {/* Image */}
            <div className="aspect-video bg-gray-100">
              <img
                src={frame.imageData}
                alt={`Frame ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Lyric Section */}
            <div 
              className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 min-h-[60px] cursor-text"
              onClick={() => setEditingIndex(index)}
            >
              {editingIndex === index ? (
                <textarea
                  value={frame.lyric || ''}
                  onChange={(e) => onUpdateLyric(index, e.target.value)}
                  onBlur={() => setEditingIndex(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      setEditingIndex(null);
                    }
                  }}
                  autoFocus
                  className="w-full bg-white border border-cyan-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  rows={2}
                  placeholder="Add lyrics..."
                />
              ) : (
                <p className="text-sm text-gray-700 font-medium text-center">
                  {frame.lyric || (
                    <span className="text-gray-400 italic">Click to add lyrics...</span>
                  )}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {frames.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🎬</p>
          <p>No frames extracted yet</p>
        </div>
      )}
    </div>
  );
}

