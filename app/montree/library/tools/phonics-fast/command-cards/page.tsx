'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_PHASES, PHONICS_COMMANDS, getCommands, type CommandSentence } from '@/lib/montree/phonics/phonics-data';
import { escapeHtml } from '@/lib/sanitize';

// ============================================
// PHONICS COMMAND CARDS GENERATOR
// ============================================
// Generates printable command cards for
// phonics learning. Cards highlight the
// phonics words in the sentences.
// ============================================

type CardLevel = 'level1' | 'level2' | 'level3' | 'all';

interface PrintOptions {
  cardsPerPage: 4 | 6 | 8;
  borderColor: string;
  borderWidth: 'thin' | 'medium' | 'thick';
  fontSize: 'small' | 'normal' | 'large';
}

const BORDER_WIDTHS: Record<PrintOptions['borderWidth'], number> = {
  thin: 2,
  medium: 3,
  thick: 4,
};

const FONT_SIZES: Record<PrintOptions['fontSize'], number> = {
  small: 18,
  normal: 22,
  large: 26,
};

const GRID_LAYOUTS: Record<PrintOptions['cardsPerPage'], { cols: number; rows: number }> = {
  4: { cols: 2, rows: 2 },
  6: { cols: 3, rows: 2 },
  8: { cols: 4, rows: 2 },
};

export default function PhonicsCommandCardsGenerator() {
  const searchParams = useSearchParams();
  const initialPhase = searchParams.get('phase') || 'pink1';

  const [selectedPhase, setSelectedPhase] = useState(initialPhase);
  const [selectedLevel, setSelectedLevel] = useState<CardLevel>('all');
  const [borderColor, setBorderColor] = useState('#0D3330');
  const [borderWidth, setBorderWidth] = useState<PrintOptions['borderWidth']>('medium');
  const [fontSize, setFontSize] = useState<PrintOptions['fontSize']>('normal');
  const [cardsPerPage, setCardsPerPage] = useState<4 | 6 | 8>(6);

  // Get phase config
  const phase = ALL_PHASES.find(p => p.id === selectedPhase);

  // Get commands based on filters
  const commands = useMemo(() => {
    const allPhaseCommands = getCommands(selectedPhase);
    if (selectedLevel === 'all') {
      return allPhaseCommands;
    }
    const levelNum = parseInt(selectedLevel.replace('level', '')) as 1 | 2 | 3;
    return allPhaseCommands.filter(c => c.level === levelNum);
  }, [selectedPhase, selectedLevel]);

  // Get unique phonics words from filtered commands
  const uniquePhonicsWords = useMemo(() => {
    const words = new Set<string>();
    commands.forEach(cmd => {
      cmd.phonicsWords.forEach(w => words.add(w));
    });
    return Array.from(words).sort();
  }, [commands]);

  // Extract and bold phonics words in command text
  // Highlight phonics words in bold for React rendering (no escapeHtml — React auto-escapes)
  const highlightPhonicsWords = (text: string, phonicsWords: string[]): React.ReactNode => {
    if (!phonicsWords || phonicsWords.length === 0) return text;

    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = new RegExp(`\\b(${phonicsWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push(text.substring(lastIndex, match.index));
      }
      result.push(
        <strong key={`${match.index}-${match[0]}`} className="font-bold text-emerald-700">
          {match[0]}
        </strong>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }

    return result;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=1000');
    if (!printWindow) return;

    const gridConfig = GRID_LAYOUTS[cardsPerPage];
    const borderPx = BORDER_WIDTHS[borderWidth];
    const fontPx = FONT_SIZES[fontSize];
    const cardWidth = 100 / gridConfig.cols;
    const cardHeight = 100 / gridConfig.rows;

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Phonics Command Cards</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Comic Sans MS', cursive, sans-serif;
            line-height: 1.4;
          }
          .page {
            width: 210mm;
            height: 297mm;
            padding: 10mm;
            display: grid;
            grid-template-columns: repeat(${gridConfig.cols}, 1fr);
            grid-template-rows: repeat(${gridConfig.rows}, 1fr);
            gap: 8mm;
            page-break-after: always;
            background: white;
          }
          .card {
            border: ${borderPx}px solid ${borderColor};
            padding: 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            background: white;
            min-height: 100%;
          }
          .card-text {
            font-size: ${fontPx}px;
            line-height: 1.6;
            word-wrap: break-word;
          }
          strong {
            color: #0D3330;
            font-weight: bold;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .page { margin: 0; padding: 10mm; }
          }
        </style>
      </head>
      <body>
    `;

    // Generate pages
    let currentPage = '';
    let cardsOnCurrentPage = 0;

    commands.forEach((command, idx) => {
      const cardHtml = `
        <div class="card">
          <div class="card-text">${command.text.split(/\b/).map((part: string, i: number) => {
            const word = part.trim();
            if (command.phonicsWords.some(pw => pw.toLowerCase() === word.toLowerCase())) {
              return `<strong>${escapeHtml(part)}</strong>`;
            }
            return escapeHtml(part);
          }).join('')}</div>
        </div>
      `;

      currentPage += cardHtml;
      cardsOnCurrentPage++;

      // Check if page is full
      if (cardsOnCurrentPage === cardsPerPage) {
        htmlContent += `<div class="page">${currentPage}</div>`;
        currentPage = '';
        cardsOnCurrentPage = 0;
      }
    });

    // Add remaining cards on last page
    if (cardsOnCurrentPage > 0) {
      htmlContent += `<div class="page">${currentPage}</div>`;
    }

    htmlContent += '</body></html>';

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger print dialog
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (!phase) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-red-600">Phase not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-[#0D3330] text-white rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">📋 Phonics Command Cards</h1>
              <p className="text-emerald-200 text-sm">Practice phonics through action-based commands</p>
            </div>
            <Link
              href="/montree/library/tools/phonics-fast"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-medium transition"
            >
              ← Back
            </Link>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-emerald-200">Cards:</span>
              <span className="font-bold ml-2">{commands.length}</span>
            </div>
            <div>
              <span className="text-emerald-200">Words:</span>
              <span className="font-bold ml-2">{uniquePhonicsWords.length}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Phase Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Phase</label>
              <div className="flex flex-wrap gap-2">
                {ALL_PHASES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPhase(p.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      selectedPhase === p.id
                        ? 'bg-[#0D3330] text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {p.name.split(' — ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Level Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Level</label>
              <div className="flex flex-wrap gap-2">
                {['all', 'level1', 'level2', 'level3'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl as CardLevel)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                      selectedLevel === lvl
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {lvl === 'all' ? 'All' : `Level ${lvl.replace('level', '')}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Print Options */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Cards Per Page</label>
              <select
                value={cardsPerPage}
                onChange={e => setCardsPerPage(parseInt(e.target.value) as 4 | 6 | 8)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={4}>4 Cards</option>
                <option value={6}>6 Cards</option>
                <option value={8}>8 Cards</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Border Width</label>
              <select
                value={borderWidth}
                onChange={e => setBorderWidth(e.target.value as PrintOptions['borderWidth'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="thin">Thin</option>
                <option value="medium">Medium</option>
                <option value="thick">Thick</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Font Size</label>
              <select
                value={fontSize}
                onChange={e => setFontSize(e.target.value as PrintOptions['fontSize'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Border Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={borderColor}
                  onChange={e => setBorderColor(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={commands.length === 0}
            className={`w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white transition ${
              commands.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#0D3330] hover:bg-[#1a4a47] shadow-md'
            }`}
          >
            {commands.length === 0 ? 'No cards to print' : `🖨️ Print ${commands.length} Cards`}
          </button>
        </div>
      </div>

      {/* Preview Grid */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Preview ({commands.length} cards)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {commands.map((command, idx) => (
            <div
              key={`cmd-${idx}-${command.text.slice(0,20)}`}
              className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition border-2"
              style={{ borderColor: borderColor }}
            >
              <div
                className="text-center min-h-24 flex items-center justify-center"
                style={{ fontSize: `${FONT_SIZES[fontSize] - 4}px` }}
              >
                <div className="font-sans">
                  {highlightPhonicsWords(command.text, command.phonicsWords)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {commands.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">No commands match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
