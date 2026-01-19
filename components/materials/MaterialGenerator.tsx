'use client';

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
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
  | 'phonograms'
  | 'picture-cards';

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
  images?: string[];  // For picture cards - base64 image data
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

  // Size mapping in mm
  const SIZE_MAP: Record<CardSize, number> = {
    small: 50,
    medium: 75,
    large: 100,
    jumbo: 150,
  };

  // Generate picture cards PDF client-side
  const generatePictureCardsPDF = async (images: string[], size: CardSize): Promise<string> => {
    const cardSize = SIZE_MAP[size];
    const margin = 10; // mm
    const gap = 5; // mm between cards
    
    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;
    
    // Calculate how many cards fit per row/column
    const cardsPerRow = Math.floor((pageWidth - 2 * margin + gap) / (cardSize + gap));
    const cardsPerCol = Math.floor((pageHeight - 2 * margin + gap) / (cardSize + gap));
    const cardsPerPage = cardsPerRow * cardsPerCol;
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    for (let i = 0; i < images.length; i++) {
      if (i > 0 && i % cardsPerPage === 0) {
        doc.addPage();
      }
      
      const pageIndex = i % cardsPerPage;
      const row = Math.floor(pageIndex / cardsPerRow);
      const col = pageIndex % cardsPerRow;
      
      const x = margin + col * (cardSize + gap);
      const y = margin + row * (cardSize + gap);
      
      // Draw border
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, cardSize, cardSize);
      
      // Add image
      try {
        doc.addImage(images[i], 'JPEG', x + 1, y + 1, cardSize - 2, cardSize - 2);
      } catch {
        // If image fails, try as PNG
        try {
          doc.addImage(images[i], 'PNG', x + 1, y + 1, cardSize - 2, cardSize - 2);
        } catch {
          // Draw placeholder
          doc.setFillColor(240, 240, 240);
          doc.rect(x + 1, y + 1, cardSize - 2, cardSize - 2, 'F');
        }
      }
    }
    
    return doc.output('datauristring');
  };

  const handleGenerate = async () => {
    if (!selectedType) return;

    setGenerating(true);
    setError(null);
    setPdfData(null);

    try {
      // Handle picture cards client-side
      if (selectedType === 'picture-cards') {
        if (!options.images || options.images.length === 0) {
          throw new Error('Please add some images first');
        }
        const pdf = await generatePictureCardsPDF(options.images, options.size);
        setPdfData(pdf);
        setFilename(`picture-cards-${options.size}.pdf`);
        setGenerating(false);
        return;
      }

      // All other types use the API
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

