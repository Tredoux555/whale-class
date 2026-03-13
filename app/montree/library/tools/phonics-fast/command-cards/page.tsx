'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_PHASES, getCommands } from '@/lib/montree/phonics/phonics-data';
import { escapeHtml } from '@/lib/sanitize';

// ============================================
// PHONICS COMMAND CARDS GENERATOR
// ============================================
// Generates A4 print-ready command cards for
// phonics learning. Cards highlight phonics
// words in bold green with professional borders.
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
    const printWindow = window.open('', '', 'width=900,height=1200');
    if (!printWindow) return;

    const gridConfig = GRID_LAYOUTS[cardsPerPage];
    const borderPx = BORDER_WIDTHS[borderWidth];
    const fontPx = FONT_SIZES[fontSize];
    const gapPx = borderPx * 1.5; // Gap = 1.5x border width for grid-background effect

    // Build HTML with decorative headers and professional A4 layout
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Phonics Command Cards - ${phase?.name || 'All Phases'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          @page {
            size: A4;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Comic Sans MS', cursive, sans-serif;
            line-height: 1.4;
            background: white;
            margin: 0;
            padding: 0;
          }

          .page {
            width: 210mm;
            height: 297mm;
            padding: 15mm 10mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            background: white;
          }

          .page-header {
            margin-bottom: 10mm;
            padding-bottom: 8mm;
            border-bottom: 3px solid ${borderColor};
            text-align: center;
          }

          .page-header h1 {
            font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 20px;
            font-weight: 700;
            color: ${borderColor};
            margin-bottom: 4px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .page-header p {
            font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 11px;
            color: #666;
            margin: 0;
          }

          .cards-container {
            flex: 1;
            display: grid;
            grid-template-columns: repeat(${gridConfig.cols}, 1fr);
            grid-template-rows: repeat(${gridConfig.rows}, 1fr);
            gap: ${gapPx}px;
            background-color: ${borderColor};
            padding: ${gapPx}px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .card {
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .card-text {
            font-size: ${fontPx}px;
            line-height: 1.5;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          strong {
            color: #10b981;
            font-weight: bold;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @media print {
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            .page {
              margin: 0;
              padding: 15mm 10mm;
              page-break-after: always;
              width: 100%;
              height: 100%;
            }
          }

          @media screen {
            body { padding: 20px; background: #f5f5f5; }
            .page { margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          }
        </style>
      </head>
      <body>
    `;

    // Generate pages with headers
    let currentPage = '';
    let cardsOnCurrentPage = 0;
    let pageCount = 1;

    const addPageHeader = () => `
      <div class="page-header">
        <h1>✏️ Command Cards</h1>
        <p>${phase?.name || 'All Phases'} • Page ${pageCount}</p>
      </div>
    `;

    htmlContent += `<div class="page">${addPageHeader()}<div class="cards-container">`;

    commands.forEach((command, idx) => {
      // Build highlighted card content
      const parts: string[] = [];
      let lastIndex = 0;
      const regex = new RegExp(
        `\\b(${command.phonicsWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
        'gi'
      );

      let match;
      while ((match = regex.exec(command.text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(escapeHtml(command.text.substring(lastIndex, match.index)));
        }
        parts.push(`<strong>${escapeHtml(match[0])}</strong>`);
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < command.text.length) {
        parts.push(escapeHtml(command.text.substring(lastIndex)));
      }

      const cardHtml = `
        <div class="card">
          <div class="card-text">${parts.join('')}</div>
        </div>
      `;

      currentPage += cardHtml;
      cardsOnCurrentPage++;

      // Check if page is full
      if (cardsOnCurrentPage === cardsPerPage) {
        htmlContent += currentPage + `</div></div>`;
        pageCount++;
        if (idx < commands.length - 1) {
          htmlContent += `<div class="page">${addPageHeader()}<div class="cards-container">`;
        }
        currentPage = '';
        cardsOnCurrentPage = 0;
      }
    });

    // Add remaining cards on last page
    if (cardsOnCurrentPage > 0) {
      htmlContent += currentPage + `</div></div>`;
    }

    htmlContent += '</body></html>';

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger print dialog
    setTimeout(() => {
      printWindow.print();
    }, 300);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">✏️ Command Cards Generator</h1>
              <p className="text-teal-100">Create printable action-based phonics cards for any phase</p>
            </div>
            <Link
              href="/montree/library/tools/phonics-fast"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-sm font-semibold transition"
            >
              ← Back to Phonics Fast
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Phase & Level Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Phase Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4">Select Phase</label>
              <div className="flex flex-wrap gap-2">
                {ALL_PHASES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPhase(p.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                      selectedPhase === p.id
                        ? 'bg-teal-700 text-white shadow-md'
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
              <label className="block text-sm font-semibold text-gray-700 mb-4">Filter by Level</label>
              <div className="flex flex-wrap gap-2">
                {['all', 'level1', 'level2', 'level3'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl as CardLevel)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                      selectedLevel === lvl
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {lvl === 'all' ? 'All Levels' : `Level ${lvl.replace('level', '')}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <span className="text-teal-700 font-bold">{commands.length}</span>
              </div>
              <div>
                <p className="text-xs text-gray-600">Cards</p>
                <p className="text-sm font-semibold text-gray-800">in this filter</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-700 font-bold">{uniquePhonicsWords.length}</span>
              </div>
              <div>
                <p className="text-xs text-gray-600">Phonics Words</p>
                <p className="text-sm font-semibold text-gray-800">to practice</p>
              </div>
            </div>
          </div>
        </div>

        {/* Print Options */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Print Settings</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Cards Per Page */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Cards Per Page</label>
              <select
                value={cardsPerPage}
                onChange={e => setCardsPerPage(parseInt(e.target.value) as 4 | 6 | 8)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={4}>4 Cards (2×2)</option>
                <option value={6}>6 Cards (3×2)</option>
                <option value={8}>8 Cards (4×2)</option>
              </select>
            </div>

            {/* Border Width */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Border Width</label>
              <select
                value={borderWidth}
                onChange={e => setBorderWidth(e.target.value as PrintOptions['borderWidth'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="thin">Thin (2px)</option>
                <option value="medium">Medium (3px)</option>
                <option value="thick">Thick (4px)</option>
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Font Size</label>
              <select
                value={fontSize}
                onChange={e => setFontSize(e.target.value as PrintOptions['fontSize'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="small">Small (18px)</option>
                <option value="normal">Normal (22px)</option>
                <option value="large">Large (26px)</option>
              </select>
            </div>

            {/* Border Color */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Border Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={borderColor}
                  onChange={e => setBorderColor(e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono text-gray-600">{borderColor}</span>
              </div>
            </div>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={commands.length === 0}
            className={`w-full mt-6 px-6 py-3 rounded-lg font-semibold text-white transition duration-200 flex items-center justify-center gap-2 ${
              commands.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-600 shadow-lg hover:shadow-xl'
            }`}
          >
            <span>🖨️</span>
            <span>{commands.length === 0 ? 'No cards to print' : `Print ${commands.length} Cards`}</span>
          </button>
        </div>

        {/* Live Preview */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Live Preview</h2>
            <p className="text-sm text-gray-600">{commands.length} cards</p>
          </div>

          {commands.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {commands.map((command, idx) => (
                <div
                  key={`cmd-${idx}-${command.text.slice(0, 20)}`}
                  className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition border-2 duration-200"
                  style={{ borderColor: borderColor }}
                >
                  <div
                    className="text-center min-h-24 flex items-center justify-center"
                    style={{ fontSize: `${FONT_SIZES[fontSize] - 4}px` }}
                  >
                    <div className="font-sans leading-tight">
                      {highlightPhonicsWords(command.text, command.phonicsWords)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">No commands match your filter selections</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
