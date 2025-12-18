'use client';

import { useState } from 'react';
import { FlashcardMaker } from '@/components/flashcard-maker/FlashcardMaker';

export default function FlashcardMakerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎵 Song Flashcard Maker
          </h1>
          <p className="text-gray-600">
            Automatically generate flashcards from YouTube song videos for your kindergarten class
          </p>
        </div>
        
        <FlashcardMaker />
      </div>
    </div>
  );
}

