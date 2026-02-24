// /montree/library/tools/flashcard-maker/page.tsx
'use client';

import Link from 'next/link';
import { FlashcardMaker } from '@/components/flashcard-maker/FlashcardMaker';

export default function LibraryFlashcardMakerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/montree/library/tools" className="text-emerald-600 text-sm hover:underline">
          ← Back to Tools
        </Link>
        <div className="mb-8 mt-2">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎵 Song Flashcard Maker
          </h1>
          <p className="text-gray-600">
            Automatically generate flashcards from YouTube song videos for your class
          </p>
        </div>
        <FlashcardMaker />
      </div>
    </div>
  );
}
