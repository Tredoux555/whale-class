// app/games/sound-games/segmenting/page.tsx
// MAINTENANCE MODE - Redirect to hub

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const MAINTENANCE_MODE = true;

export default function SegmentingGame() {
  const router = useRouter();
  
  useEffect(() => {
    if (MAINTENANCE_MODE) {
      router.replace('/games/sound-games');
    }
  }, [router]);

  if (MAINTENANCE_MODE) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🔧</div>
          <p className="text-xl">Redirecting...</p>
        </div>
      </div>
    );
  }

  return null;
}
