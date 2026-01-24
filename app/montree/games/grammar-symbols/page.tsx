'use client';

import { useRouter } from 'next/navigation';
import GrammarSymbolsGame from '@/components/games/GrammarSymbolsGame';

export default function GrammarSymbolsPage() {
  const router = useRouter();

  return (
    <GrammarSymbolsGame
      onComplete={() => {
        // Optionally track completion
      }}
      onBack={() => router.push('/games')}
    />
  );
}
