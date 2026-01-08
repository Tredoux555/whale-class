// app/debug/audio-test/page.tsx
// Audio Debug Page - Test all letter sounds
// Click any letter to hear it. Verify the sound matches the letter.

'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const PHONEMES = ['sh', 'ch', 'th'];

export default function AudioTestPage() {
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [playHistory, setPlayHistory] = useState<string[]>([]);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const playSound = (type: 'letter' | 'phoneme', sound: string) => {
    // Stop any currently playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    const path = type === 'letter' 
      ? `/audio-new/letters/${sound}.mp3`
      : `/audio-new/phonemes/${sound}.mp3`;

    const audio = new Audio(path);
    setAudioElement(audio);
    setCurrentPlaying(sound);
    
    // Add to history
    const timestamp = new Date().toLocaleTimeString();
    setPlayHistory(prev => [`${timestamp}: ${sound.toUpperCase()} (${path})`, ...prev.slice(0, 19)]);

    audio.onended = () => setCurrentPlaying(null);
    audio.onerror = () => {
      setCurrentPlaying(null);
      setPlayHistory(prev => [`ERROR: ${path} failed to load`, ...prev.slice(0, 19)]);
    };

    audio.play().catch(err => {
      console.error('Play failed:', err);
      setCurrentPlaying(null);
    });
  };

  const stopAll = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setCurrentPlaying(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">🔊 Audio Debug Page</h1>
          <p className="text-gray-400">Click any letter to test. Verify the sound matches.</p>
        </div>
        <Link href="/games/sound-games" className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600">
          Back to Games
        </Link>
      </header>

      {/* Letters Grid */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Letters (26)</h2>
        <div className="grid grid-cols-9 gap-2">
          {LETTERS.map(letter => (
            <button
              key={letter}
              onClick={() => playSound('letter', letter)}
              className={`
                p-4 text-2xl font-bold rounded-lg transition-all
                ${currentPlaying === letter 
                  ? 'bg-green-500 scale-110' 
                  : 'bg-blue-600 hover:bg-blue-500 hover:scale-105'
                }
              `}
            >
              {letter.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Phonemes */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Phonemes (3)</h2>
        <div className="flex gap-2">
          {PHONEMES.map(phoneme => (
            <button
              key={phoneme}
              onClick={() => playSound('phoneme', phoneme)}
              className={`
                px-6 py-4 text-xl font-bold rounded-lg transition-all
                ${currentPlaying === phoneme 
                  ? 'bg-green-500 scale-110' 
                  : 'bg-purple-600 hover:bg-purple-500 hover:scale-105'
                }
              `}
            >
              {phoneme.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Controls */}
      <section className="mb-8">
        <button
          onClick={stopAll}
          className="bg-red-600 px-6 py-3 rounded-lg hover:bg-red-500 mr-4"
        >
          ⏹️ Stop All
        </button>
        <button
          onClick={() => setPlayHistory([])}
          className="bg-gray-600 px-6 py-3 rounded-lg hover:bg-gray-500"
        >
          🗑️ Clear History
        </button>
      </section>

      {/* Play History */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">Play History (last 20)</h2>
        {playHistory.length === 0 ? (
          <p className="text-gray-500">Click a letter to start testing...</p>
        ) : (
          <ul className="font-mono text-sm space-y-1">
            {playHistory.map((entry, i) => (
              <li key={i} className={entry.startsWith('ERROR') ? 'text-red-400' : 'text-green-400'}>
                {entry}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Verification Checklist */}
      <section className="mt-8 bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">⚠️ Verification Checklist</h2>
        <p className="text-yellow-200 mb-2">Click through ALL letters and verify:</p>
        <ul className="list-disc list-inside text-yellow-200 space-y-1">
          <li>Does A sound like "ah" (short a)?</li>
          <li>Does E sound like "eh" (short e)?</li>
          <li>Does each consonant make the correct phonetic sound?</li>
          <li>Are any sounds clearly wrong or swapped?</li>
        </ul>
      </section>
    </div>
  );
}
