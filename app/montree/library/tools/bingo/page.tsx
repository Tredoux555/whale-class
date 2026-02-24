// /montree/library/tools/bingo/page.tsx
// Bingo Game Generator - embedded from static HTML tool
'use client';

import Link from 'next/link';

export default function BingoToolPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <header className="bg-[#0D3330] text-white px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/montree/library/tools" className="text-emerald-300 text-sm hover:underline">
            ← Back to Tools
          </Link>
          <h1 className="text-2xl font-bold mt-2">🎯 Bingo Game Generator</h1>
          <p className="text-emerald-200 mt-1">Create unique bingo boards for phonics, CVC words, and more</p>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <p className="text-gray-600 mb-4">
            The Bingo Game Generator opens in a new window for the best printing experience.
          </p>
          <a
            href="/tools/bingo-generator.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-gradient-to-br from-red-500 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all hover:scale-[1.02]"
          >
            🎯 Open Bingo Generator
          </a>
        </div>
      </div>
    </div>
  );
}
