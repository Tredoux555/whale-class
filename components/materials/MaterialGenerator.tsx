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

export type SeriesColor = 'pink' | 'blue' | 'green';

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
  seriesColor?: SeriesColor;  // Border color for picture cards
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

  // Series colors (RGB)
  const SERIES_COLORS: Record<string, [number, number, number]> = {
    pink: [236, 72, 153],
    blue: [59, 130, 246],
    green: [34, 197, 94],
  };

  // Crop image to square from center with rounded corners
  const cropToSquare = (img: HTMLImageElement, addRoundedCorners: boolean = true): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const size = Math.min(img.width, img.height);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    if (addRoundedCorners) {
      // Draw rounded rectangle clip path
      const radius = size * 0.06; // 6% corner radius
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();
    }
    
    const offsetX = (img.width - size) / 2;
    const offsetY = (img.height - size) / 2;
    ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
    return canvas;
  };

  // Load image and return cropped base64 with rounded corners
  const loadAndCropImage = (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const cropped = cropToSquare(img, true);
        resolve(cropped.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  // Generate picture cards PDF client-side
  const generatePictureCardsPDF = async (images: string[], size: CardSize, seriesColor: string = 'pink'): Promise<string> => {
    const cardSize = SIZE_MAP[size];
    const margin = 10; // mm
    const gap = 5; // mm between cards
    const borderWidth = 3; // mm
    const cornerRadius = 4; // mm - rounded corners
    
    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;
    
    // Calculate how many cards fit per row/column
    const cardsPerRow = Math.floor((pageWidth - 2 * margin + gap) / (cardSize + gap));
    const cardsPerCol = Math.floor((pageHeight - 2 * margin + gap) / (cardSize + gap));
    const cardsPerPage = cardsPerRow * cardsPerCol;
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Get border color
    const [r, g, b] = SERIES_COLORS[seriesColor] || SERIES_COLORS.pink;
    
    // Process images - crop to square
    const croppedImages: string[] = [];
    for (const img of images) {
      try {
        const cropped = await loadAndCropImage(img);
        croppedImages.push(cropped);
      } catch {
        croppedImages.push(img); // Use original if cropping fails
      }
    }
    
    for (let i = 0; i < croppedImages.length; i++) {
      if (i > 0 && i % cardsPerPage === 0) {
        doc.addPage();
      }
      
      const pageIndex = i % cardsPerPage;
      const row = Math.floor(pageIndex / cardsPerRow);
      const col = pageIndex % cardsPerRow;
      
      const x = margin + col * (cardSize + gap);
      const y = margin + row * (cardSize + gap);
      
      // Draw colored rounded border
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(borderWidth);
      doc.roundedRect(x + borderWidth/2, y + borderWidth/2, cardSize - borderWidth, cardSize - borderWidth, cornerRadius, cornerRadius, 'S');
      
      // Add image filling inner area (already has rounded corners baked in)
      const innerOffset = borderWidth;
      const innerSize = cardSize - 2 * borderWidth;
      
      try {
        doc.addImage(croppedImages[i], 'JPEG', x + innerOffset, y + innerOffset, innerSize, innerSize);
      } catch {
        try {
          doc.addImage(croppedImages[i], 'PNG', x + innerOffset, y + innerOffset, innerSize, innerSize);
        } catch {
          // Draw placeholder
          doc.setFillColor(240, 240, 240);
          doc.roundedRect(x + innerOffset, y + innerOffset, innerSize, innerSize, cornerRadius - 1, cornerRadius - 1, 'F');
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
        const pdf = await generatePictureCardsPDF(options.images, options.size, options.seriesColor || 'pink');
        setPdfData(pdf);
        setFilename(`picture-cards-${options.seriesColor || 'pink'}-${options.size}.pdf`);
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

