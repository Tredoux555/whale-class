// app/games/page.tsx
// Games hub — landing page for all game categories.
// Accessible from the Whale Class root page header "Games" button.

'use client';

import Link from 'next/link';

const GAME_CATEGORIES = [
  {
    title: 'Sound Games',
    subtitle: 'Phonemic Awareness',
    description: 'Train the ear — identify beginning, middle, and ending sounds in words. No letters shown.',
    icon: '👂',
    color: 'from-amber-400 to-orange-500',
    href: '/games/sound-games',
    games: ['I Spy Beginning', 'Ending Sounds', 'Middle Vowels', 'Blending', 'Segmenting'],
  },
];

export default function GamesHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/70 hover:text-white transition text-sm">
              ← Back
            </Link>
            <div className="w-px h-6 bg-white/30" />
            <div>
              <h1 className="text-xl font-bold">Whale Class Games</h1>
              <p className="text-sm text-blue-100">Learn through play</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          {GAME_CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
            >
              <div className={`bg-gradient-to-r ${cat.color} px-6 py-5 flex items-center gap-4`}>
                <span className="text-5xl">{cat.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{cat.title}</h2>
                  <p className="text-white/80 text-sm">{cat.subtitle}</p>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-600 mb-3">{cat.description}</p>
                <div className="flex flex-wrap gap-2">
                  {cat.games.map((g) => (
                    <span key={g} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {GAME_CATEGORIES.length === 1 && (
          <p className="text-center text-gray-400 text-sm mt-8">
            More games coming soon!
          </p>
        )}
      </main>
    </div>
  );
}
