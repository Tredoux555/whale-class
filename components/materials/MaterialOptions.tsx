'use client';

import React, { useRef, useState } from 'react';
import { MaterialType, CardSize, GeneratorOptions, SeriesColor } from './MaterialGenerator';

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

const SERIES_COLORS: { value: SeriesColor; label: string; color: string }[] = [
  { value: 'pink', label: 'Pink Series', color: '#EC4899' },
  { value: 'blue', label: 'Blue Series', color: '#3B82F6' },
  { value: 'green', label: 'Green Series', color: '#22C55E' },
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const update = (key: keyof GeneratorOptions, value: unknown) => {
    onChange({ ...options, [key]: value });
  };

  const handleImageFiles = async (files: FileList | null) => {
    if (!files) return;
    
    // Read all files and collect results
    const readPromises = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });
    
    try {
      const newImages = await Promise.all(readPromises);
      // Add all new images at once
      update('images', [...(options.images || []), ...newImages]);
    } catch (err) {
      console.error('Error reading images:', err);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...(options.images || [])];
    newImages.splice(index, 1);
    update('images', newImages);
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

        {type === 'picture-cards' && (
          <div className="space-y-4">
            {/* Series Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Border Color (match your series)
              </label>
              <div className="flex gap-2">
                {SERIES_COLORS.map((sc) => (
                  <button
                    key={sc.value}
                    onClick={() => update('seriesColor', sc.value)}
                    className={`flex-1 p-2 rounded-lg border-2 text-center transition-all ${
                      (options.seriesColor || 'pink') === sc.value
                        ? 'border-gray-800 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ 
                      backgroundColor: (options.seriesColor || 'pink') === sc.value ? sc.color + '20' : 'transparent'
                    }}
                  >
                    <div 
                      className="w-6 h-6 rounded-full mx-auto mb-1"
                      style={{ backgroundColor: sc.color }}
                    />
                    <div className="text-xs font-medium">{sc.label.replace(' Series', '')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleImageFiles(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-3xl mb-2">📷</div>
              <div className="text-sm text-gray-600">
                <span className="text-indigo-600 font-medium">Drop images here</span>
                <br />or click to select
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageFiles(e.target.files)}
              />
            </div>

            {/* Image Preview Grid */}
            {options.images && options.images.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {options.images.length} image{options.images.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => update('images', [])}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Clear all
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {options.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img}
                        alt={`Image ${i + 1}`}
                        className="w-full h-16 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

