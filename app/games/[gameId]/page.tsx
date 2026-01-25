// app/games/[gameId]/page.tsx
// Server component wrapper for static export compatibility

import GamePage from './GamePageClient';

// Known game slugs for static export
export function generateStaticParams() {
  return [
    { gameId: 'letter-trace' },
    { gameId: 'letter-sound' },
    { gameId: 'word-building' },
    { gameId: 'sentence-match' },
    { gameId: 'sentence-build' },
    { gameId: 'letter-match' },
    { gameId: 'picture-match' },
    { gameId: 'missing-letter' },
    { gameId: 'sight-flash' },
    { gameId: 'vocabulary-builder' },
  ];
}

export default function Page() {
  return <GamePage />;
}
