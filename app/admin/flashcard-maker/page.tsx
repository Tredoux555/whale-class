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
        
        {/* Vercel Limitation Notice */}
        {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1') && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  ⚠️ Production Limitation
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This feature requires system tools (ffmpeg, yt-dlp) that are not available on Vercel's serverless functions.
                  </p>
                  <p className="mt-2">
                    <strong>To use this feature:</strong> Run the app locally with <code className="bg-yellow-100 px-1 rounded">npm run dev</code> and access at <code className="bg-yellow-100 px-1 rounded">http://localhost:3000/admin/flashcard-maker</code>
                  </p>
                  <p className="mt-2 text-xs">
                    See <code>FLASHCARD-MAKER-SETUP.md</code> for deployment alternatives.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <FlashcardMaker />
      </div>
    </div>
  );
}

