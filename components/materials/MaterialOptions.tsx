'use client';

import React from 'react';
import { MaterialType, CardSize, GeneratorOptions } from './MaterialGenerator';

interface Props {
  type: MaterialType;
  options: GeneratorOptions;
  onChange: (options: GeneratorOptions) => void;
  onGenerate: () => void;
  generating: boolean;
}

const SIZES: { value: CardSize; label: string; desc: string }[] = [
  { value: 'small', label: 'Small', desc: '50×50mm' },
  { value: 'medium', label: 'Medium', desc: '75×75mm' },
  { value: 'large', label: 'Large', desc: '100×100mm' },
  { value: 'jumbo', label: 'Jumbo', desc: '150×150mm' },
];

const VOWELS = ['a', 'i', 'o', 'e', 'u'];

const BLENDS = [
  'bl', 'cl', 'fl', 'gl', 'pl', 'sl',
  'br', 'cr', 'dr', 'gr', 'tr',
  'st', 'sp', 'sm', 'sn', 'sw',
  'nd', 'nk', 'mp', 'nt',
];

const PATTERNS = [
  'a-e', 'ai', 'ay',
  'i-e', 'igh', 'y-as-i',
  'o-e', 'oa', 'ow-long',
  'u-e', 'oo-long', 'ew',
  'ee', 'ea',
  'ch', 'sh', 'th', 'wh', 'ck',
  'oo-short',
];

const SIGHT_LEVELS = ['pre-primer', 'primer', 'first-grade', 'all'];
const SENTENCE_LEVELS = ['pink-level', 'blue-level', 'green-level', 'all'];
const PHONOGRAM_GROUPS = ['long-a', 'long-i', 'long-o', 'long-u', 'long-e', 'digraphs'];

export default function MaterialOptions({ type, options, onChange, onGenerate, generating }: Props) {
  const update = (key: keyof GeneratorOptions, value: any) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Options</h2>
      
      <div className="space-y-4">
        {/* Card Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Size
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SIZES.map((size) => (
              <button
                key={size.value}
                onClick={() => update('size', size.value)}
                className={`p-2 rounded-lg border text-center ${
                  options.size === size.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{size.label}</div>
                <div className="text-xs text-gray-500">{size.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Type-specific options */}
        {type === 'sandpaper-letters' && (
          <>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.lowercase}
                  onChange={(e) => update('lowercase', e.target.checked)}
                  className="rounded text-indigo-500"
                />
                <span className="text-sm">Lowercase</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.uppercase}
                  onChange={(e) => update('uppercase', e.target.checked)}
                  className="rounded text-indigo-500"
                />
                <span className="text-sm">Uppercase</span>
              </label>
            </div>
          </>
        )}

        {type === 'pink-series' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Vowel (optional)
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => update('vowel', undefined)}
                className={`px-3 py-1.5 rounded-lg ${
                  !options.vowel ? 'bg-pink-500 text-white' : 'bg-gray-100'
                }`}
              >
                All
              </button>
              {VOWELS.map((v) => (
                <button
                  key={v}
                  onClick={() => update('vowel', v)}
                  className={`px-3 py-1.5 rounded-lg uppercase ${
                    options.vowel === v ? 'bg-pink-500 text-white' : 'bg-gray-100'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'blue-series' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Blend (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => update('blend', undefined)}
                className={`px-3 py-1.5 rounded-lg ${
                  !options.blend ? 'bg-blue-500 text-white' : 'bg-gray-100'
                }`}
              >
                All
              </button>
              {BLENDS.map((b) => (
                <button
                  key={b}
                  onClick={() => update('blend', b)}
                  className={`px-3 py-1.5 rounded-lg uppercase ${
                    options.blend === b ? 'bg-blue-500 text-white' : 'bg-gray-100'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'green-series' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Pattern (optional)
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              <button
                onClick={() => update('pattern', undefined)}
                className={`px-3 py-1.5 rounded-lg ${
                  !options.pattern ? 'bg-green-500 text-white' : 'bg-gray-100'
                }`}
              >
                All
              </button>
              {PATTERNS.map((p) => (
                <button
                  key={p}
                  onClick={() => update('pattern', p)}
                  className={`px-3 py-1.5 rounded-lg ${
                    options.pattern === p ? 'bg-green-500 text-white' : 'bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'sight-words' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              value={options.level || 'all'}
              onChange={(e) => update('level', e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              {SIGHT_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'sentence-strips' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              value={options.level || 'all'}
              onChange={(e) => update('level', e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              {SENTENCE_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {type === 'phonograms' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group
            </label>
            <select
              value={options.group || ''}
              onChange={(e) => update('group', e.target.value || undefined)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">All Phonograms</option>
              {PHONOGRAM_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={onGenerate}
          disabled={generating}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <span>📄</span>
              Generate PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}

