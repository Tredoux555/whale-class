'use client';

import { useRouter } from 'next/navigation';
import CombinedISpy from '@/components/games/CombinedISpy';

export default function CombinedISpyPage() {
  const router = useRouter();

  return (
    <CombinedISpy
      roundCount={10}
      onComplete={() => {
        // Optionally track completion
      }}
      onBack={() => router.push('/games')}
    />
  );
}
