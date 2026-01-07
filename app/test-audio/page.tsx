'use client';

import React from 'react';

const TEST_FILES = [
  { name: 'Charlotte (High Stability)', file: '/audio-new/TEST_bat_charlotte_high.mp3' },
  { name: 'Rachel (High Stability)', file: '/audio-new/TEST_bat_rachel_high.mp3' },
  { name: 'Rachel (Low Stability - Original)', file: '/audio-new/TEST_bat_rachel_low.mp3' },
  { name: 'Charlotte + Period', file: '/audio-new/TEST_bat_charlotte_period.mp3' },
  { name: 'Current (Original)', file: '/audio-new/words/pink/bat.mp3' },
];

export default function AudioTestPage() {
  const playAudio = (src: string) => {
    const audio = new Audio(src);
    audio.play();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">🔊 Audio Quality Test</h1>
      <p className="text-gray-400 mb-8">Compare different voice settings for &quot;bat&quot;</p>
      
      <div className="space-y-4 max-w-md">
        {TEST_FILES.map((test, i) => (
          <button
            key={i}
            onClick={() => playAudio(test.file)}
            className="w-full p-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-left flex items-center gap-4"
          >
            <span className="text-2xl">▶️</span>
            <div>
              <div className="font-bold">{test.name}</div>
              <div className="text-sm text-blue-200">{test.file}</div>
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="font-bold mb-2">Which sounds best?</h2>
        <p className="text-gray-400 text-sm">
          Tell me which one has the cleanest &quot;bat&quot; without the &quot;n&quot; sound at the end.
          I&apos;ll regenerate all words with those settings.
        </p>
      </div>
    </div>
  );
}
