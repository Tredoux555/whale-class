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

  // Series colors (RGB) - vibrant Montessori colors for borders
  const SERIES_COLORS: Record<string, [number, number, number]> = {
    pink: [236, 72, 153],    // #EC4899 - vibrant pink
    blue: [59, 130, 246],    // #3B82F6 - vibrant blue
    green: [34, 197, 94],    // #22C55E - vibrant green
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

  // Generate picture cards PDF client-side - matches three-part card format
  const generatePictureCardsPDF = async (images: string[], size: CardSize, seriesColor: string = 'pink'): Promise<string> => {
    const cardSize = SIZE_MAP[size];
    const cornerRadius = 4; // mm - matches three-part cards
    const borderWidth = 5; // mm - thick border like three-part cards (0.5cm)
    
    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;
    
    // Dynamically calculate grid based on card size (cards touch - no gap)
    // Leave small margin for printer tolerance
    const margin = 10; // mm margin on each side
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);
    
    const cardsPerRow = Math.max(1, Math.floor(usableWidth / cardSize));
    const cardsPerCol = Math.max(1, Math.floor(usableHeight / cardSize));
    const cardsPerPage = cardsPerRow * cardsPerCol;
    
    // Center the grid on the page
    const gridWidth = cardSize * cardsPerRow;
    const gridHeight = cardSize * cardsPerCol;
    const marginLeft = (pageWidth - gridWidth) / 2;
    const marginTop = (pageHeight - gridHeight) / 2;
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    // Get border color - using vibrant Montessori series colors
    const [r, g, b] = SERIES_COLORS[seriesColor] || SERIES_COLORS.pink;
    
    // Process images - crop to square with rounded corners
    const croppedImages: string[] = [];
    for (const img of images) {
      try {
        const cropped = await loadAndCropImage(img);
        croppedImages.push(cropped);
      } catch {
        croppedImages.push(img);
      }
    }
    
    for (let i = 0; i < croppedImages.length; i++) {
      if (i > 0 && i % cardsPerPage === 0) {
        doc.addPage();
      }
      
      const pageIndex = i % cardsPerPage;
      const row = Math.floor(pageIndex / cardsPerRow);
      const col = pageIndex % cardsPerRow;
      
      // Cards touch each other - no gap
      const x = marginLeft + col * cardSize;
      const y = marginTop + row * cardSize;
      
      // Card with thick colored border and white background
      doc.setFillColor(r, g, b); // Colored background (border)
      doc.roundedRect(x, y, cardSize, cardSize, cornerRadius, cornerRadius, 'F');
      
      // White inner area for image
      const innerOffset = borderWidth;
      const innerSize = cardSize - (borderWidth * 2);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x + innerOffset, y + innerOffset, innerSize, innerSize, cornerRadius, cornerRadius, 'F');
      
      // Add image filling the entire white area
      try {
        doc.addImage(croppedImages[i], 'JPEG', x + innerOffset, y + innerOffset, innerSize, innerSize);
      } catch {
        try {
          doc.addImage(croppedImages[i], 'PNG', x + innerOffset, y + innerOffset, innerSize, innerSize);
        } catch {
          // placeholder
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

