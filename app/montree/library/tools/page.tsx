// /montree/library/tools/page.tsx
// Content Creation Tools - Montree Library
'use client';

import Link from 'next/link';

const TOOLS = [
  {
    href: '/montree/library/tools/card-generator',
    icon: '🃏',
    title: '3-Part Card Generator',
    description: 'Create beautiful Montessori nomenclature cards with images and labels',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    href: '/montree/library/tools/flashcard-maker',
    icon: '🎬',
    title: 'Video Flashcard Generator',
    description: 'Upload a video, pick the best frames, and print flashcards',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    href: '/montree/library/tools/label-maker',
    icon: '🏷️',
    title: 'Label Generator',
    description: 'Create printable word labels for objects, works, and classroom materials',
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    href: '/montree/library/tools/vocabulary-flashcards',
    icon: '📸',
    title: 'Vocabulary Flashcard Generator',
    description: 'Generate vocabulary flashcards with images and words',
    gradient: 'from-amber-500 to-orange-600',
  },
  // Material Generator hidden — subpar quality, code preserved in /montree/library/tools/material-generator
  {
    href: '/montree/library/tools/bingo',
    icon: '🎯',
    title: 'Word Bingo Generator',
    description: 'Create unique bingo boards for phonics, CVC words, and more',
    gradient: 'from-red-500 to-pink-600',
  },
  {
    href: '/montree/library/tools/picture-bingo',
    icon: '🖼️',
    title: 'Picture Bingo Generator',
    description: 'Real photo bingo — duplex print with pictures on front, words on back',
    gradient: 'from-teal-500 to-emerald-600',
  },
];

export default function LibraryToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/montree/library" className="text-emerald-300 text-sm hover:underline">
            ← Back to Library
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">
            Content Creation Tools
          </h1>
          <p className="text-emerald-200 mt-1">
            Save yourself a ton of time and effort. Create professional materials in minutes.
          </p>
        </div>
      </header>

      {/* Tools Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`flex items-center gap-4 p-5 bg-gradient-to-br ${tool.gradient} rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-3xl">{tool.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-lg">{tool.title}</div>
                <div className="text-white/80 text-sm">{tool.description}</div>
              </div>
              <span className="text-white/60 text-xl shrink-0">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
