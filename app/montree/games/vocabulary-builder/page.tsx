'use client';

import { useRouter } from 'next/navigation';
import VocabularyBuilderGame from '@/components/games/VocabularyBuilderGame';

export default function VocabularyBuilderPage() {
  const router = useRouter();

  return (
    <VocabularyBuilderGame
      onComplete={() => {
        // Optionally track completion
      }}
      onBack={() => router.push('/games')}
    />
  );
}
