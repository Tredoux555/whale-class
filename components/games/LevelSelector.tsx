// components/games/LevelSelector.tsx
// Select sub-level within a phase (e.g., short-a, short-i for Pink Series)

'use client';

import React from 'react';
import { GamePhase } from '@/lib/games/types';

interface Props {
  phase: GamePhase;
  currentLevel: string;
  onLevelChange: (level: string) => void;
}

const LEVEL_OPTIONS: Record<GamePhase, { value: string; label: string; icon: string }[]> = {
  'letters': [
    { value: 'vowels', label: 'Vowels', icon: '🔴' },
    { value: 'consonants', label: 'Consonants', icon: '🔵' },
    { value: 'all', label: 'All Letters', icon: '🔤' },
  ],
  'pink-series': [
    { value: 'short-a', label: 'Short A (cat, hat)', icon: '🐱' },
    { value: 'short-i', label: 'Short I (pig, sit)', icon: '🐷' },
    { value: 'short-o', label: 'Short O (dog, pot)', icon: '🐕' },
    { value: 'short-e', label: 'Short E (bed, pet)', icon: '🛏️' },
    { value: 'short-u', label: 'Short U (bug, sun)', icon: '🐛' },
  ],
  'blue-series': [
    { value: 'bl-cl-fl', label: 'BL, CL, FL blends', icon: '🔵' },
    { value: 'br-cr-dr', label: 'BR, CR, DR blends', icon: '🟣' },
    { value: 'st-sp-sn', label: 'ST, SP, SN blends', icon: '⭐' },
    { value: 'all', label: 'All Blends', icon: '🔤' },
  ],
  'green-series': [
    { value: 'ee-ea', label: 'EE & EA (tree, sea)', icon: '🌳' },
    { value: 'ai-ay', label: 'AI & AY (rain, play)', icon: '🌧️' },
    { value: 'oa-oo', label: 'OA & OO (boat, moon)', icon: '⛵' },
    { value: 'sh-ch-th', label: 'SH, CH, TH', icon: '🦈' },
    { value: 'all', label: 'All Phonograms', icon: '🔤' },
  ],
  'sight-words': [
    { value: 'level-1', label: 'Level 1 (the, a, I)', icon: '1️⃣' },
    { value: 'level-2', label: 'Level 2 (have, this)', icon: '2️⃣' },
    { value: 'level-3', label: 'Level 3 (other, about)', icon: '3️⃣' },
  ],
  'sentences': [
    { value: 'level-1', label: 'Simple (3-4 words)', icon: '1️⃣' },
    { value: 'level-2', label: 'Medium (4-5 words)', icon: '2️⃣' },
    { value: 'level-3', label: 'Longer (5-7 words)', icon: '3️⃣' },
  ],
};

export default function LevelSelector({ phase, currentLevel, onLevelChange }: Props) {
  const options = LEVEL_OPTIONS[phase] || [];

  if (options.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-white font-bold mb-3 text-lg">Choose Level:</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onLevelChange(option.value)}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              currentLevel === option.value
                ? 'bg-white text-gray-800 shadow-lg scale-105'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}


