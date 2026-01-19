'use client';

import React from 'react';
import { MaterialType } from './MaterialGenerator';

interface Props {
  selected: MaterialType | null;
  onSelect: (type: MaterialType) => void;
}

const MATERIAL_TYPES = [
  {
    category: 'Letters',
    items: [
      { type: 'sandpaper-letters', name: 'Sandpaper Letters', icon: '✋', desc: 'Full alphabet A-Z' },
      { type: 'vowel-cards', name: 'Vowel Cards', icon: '🔴', desc: 'A, E, I, O, U in red' },
      { type: 'consonant-cards', name: 'Consonant Cards', icon: '🔵', desc: 'All consonants in blue' },
    ],
  },
  {
    category: 'Pink Series (CVC)',
    items: [
      { type: 'pink-series', name: 'Pink Series', icon: '🩷', desc: '200+ CVC words' },
    ],
  },
  {
    category: 'Blue Series (Blends)',
    items: [
      { type: 'blue-series', name: 'Blue Series', icon: '💙', desc: 'Consonant blends' },
    ],
  },
  {
    category: 'Green Series (Phonograms)',
    items: [
      { type: 'green-series', name: 'Green Series', icon: '💚', desc: 'Long vowels & digraphs' },
      { type: 'phonograms', name: 'Phonogram Cards', icon: '🔤', desc: 'Spelling patterns' },
    ],
  },
  {
    category: 'Reading',
    items: [
      { type: 'sight-words', name: 'Sight Words', icon: '👁️', desc: 'Dolch word list' },
      { type: 'sentence-strips', name: 'Sentence Strips', icon: '📝', desc: 'Reading practice' },
      { type: 'picture-cards', name: 'Picture Cards', icon: '🖼️', desc: 'Match with sentences' },
    ],
  },
];

export default function MaterialTypeSelector({ selected, onSelect }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Material Type</h2>
      
      <div className="space-y-4">
        {MATERIAL_TYPES.map((category) => (
          <div key={category.category}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {category.category}
            </h3>
            <div className="space-y-2">
              {category.items.map((item) => (
                <button
                  key={item.type}
                  onClick={() => onSelect(item.type as MaterialType)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selected === item.type
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

