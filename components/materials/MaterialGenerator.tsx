'use client';

import React, { useState } from 'react';
import MaterialTypeSelector from './MaterialTypeSelector';
import MaterialOptions from './MaterialOptions';
import MaterialPreview from './MaterialPreview';

export type MaterialType = 
  | 'sandpaper-letters'
  | 'vowel-cards'
  | 'consonant-cards'
  | 'pink-series'
  | 'blue-series'
  | 'green-series'
  | 'sight-words'
  | 'sentence-strips'
  | 'phonograms';

export type CardSize = 'small' | 'medium' | 'large' | 'jumbo';

export interface GeneratorOptions {
  size: CardSize;
  lowercase?: boolean;
  uppercase?: boolean;
  separateVowels?: boolean;
  vowel?: string;
  blend?: string;
  pattern?: string;
  level?: string;
  group?: string;
  categories?: string[];
}

export default function MaterialGenerator() {
  const [selectedType, setSelectedType] = useState<MaterialType | null>(null);
  const [options, setOptions] = useState<GeneratorOptions>({
    size: 'medium',
    lowercase: true,
    uppercase: true,
  });
  const [generating, setGenerating] = useState(false);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedType) return;

    setGenerating(true);
    setError(null);
    setPdfData(null);

    try {
      const res = await fetch('/api/whale/materials/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          size: options.size,
          options: {
            lowercase: options.lowercase,
            uppercase: options.uppercase,
            separateVowels: options.separateVowels,
            vowel: options.vowel,
            blend: options.blend,
            pattern: options.pattern,
            level: options.level,
            group: options.group,
            categories: options.categories,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to generate');

      const data = await res.json();
      setPdfData(data.pdf);
      setFilename(data.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfData) return;
    
    const link = document.createElement('a');
    link.href = pdfData;
    link.download = filename;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            📚 Montessori Material Generator
          </h1>
          <p className="text-sm text-gray-500">
            Create print-ready language materials
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Type Selection */}
          <div className="lg:col-span-1">
            <MaterialTypeSelector
              selected={selectedType}
              onSelect={setSelectedType}
            />
          </div>

          {/* Middle: Options */}
          <div className="lg:col-span-1">
            {selectedType && (
              <MaterialOptions
                type={selectedType}
                options={options}
                onChange={setOptions}
                onGenerate={handleGenerate}
                generating={generating}
              />
            )}
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-1">
            {(pdfData || generating || error) && (
              <MaterialPreview
                pdfData={pdfData}
                filename={filename}
                loading={generating}
                error={error}
                onDownload={handleDownload}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

