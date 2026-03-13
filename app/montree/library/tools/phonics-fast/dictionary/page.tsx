'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { getDictionaryWords, ALL_PHASES } from '@/lib/montree/phonics/phonics-data';
import { escapeHtml } from '@/lib/sanitize';

type DictionaryEntry = ReturnType<typeof getDictionaryWords>[number];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Build phase config dynamically from ALL_PHASES
const PHASE_CONFIG: Record<string, { name: string; color: string; bgColor: string }> =
  Object.fromEntries(
    ALL_PHASES.map(p => [p.id, { name: p.name, color: p.color, bgColor: `${p.color}15` }])
  );

export default function PhonicsDictionaryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhases, setSelectedPhases] = useState<string[]>(
    Object.keys(PHASE_CONFIG)
  );
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Get all dictionary words
  const allWords = getDictionaryWords();

  // Filter by search and phase
  const filteredWords = useMemo(() => {
    return allWords.filter(entry => {
      const matchesSearch = entry.word
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesPhase = selectedPhases.includes(entry.phase);
      return matchesSearch && matchesPhase;
    });
  }, [searchQuery, selectedPhases]);

  // Group by first letter
  const groupedByLetter = useMemo(() => {
    const groups: Record<string, DictionaryEntry[]> = {};
    ALPHABET.forEach(letter => {
      groups[letter] = [];
    });
    filteredWords.forEach(word => {
      const firstLetter = word.word.charAt(0).toUpperCase();
      if (groups[firstLetter]) {
        groups[firstLetter].push(word);
      }
    });
    return groups;
  }, [filteredWords]);

  // Handle alphabet navigation
  const scrollToLetter = (letter: string) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Toggle phase filter
  const togglePhase = (phaseId: string) => {
    setSelectedPhases(prev =>
      prev.includes(phaseId)
        ? prev.filter(p => p !== phaseId)
        : [...prev, phaseId]
    );
  };

  // Count words in each phase
  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(PHASE_CONFIG).forEach(phase => {
      counts[phase] = filteredWords.filter(w => w.phase === phase).length;
    });
    return counts;
  }, [filteredWords]);

  // Handle auto-print
  const handlePrint = () => {
    // Filter grouped words by selected phases
    const filteredGrouped: Record<string, DictionaryEntry[]> = {};
    ALPHABET.forEach(letter => {
      filteredGrouped[letter] = groupedByLetter[letter].filter(w =>
        selectedPhases.includes(w.phase)
      );
    });

    // Generate print HTML
    const printHTML = generatePrintHTML(filteredGrouped, ALPHABET, PHASE_CONFIG, selectedPhases);

    // Open in new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  // Generate print HTML
  const generatePrintHTML = (
    groupedByLetter: Record<string, DictionaryEntry[]>,
    alphabet: string[],
    phaseConfig: Record<string, { name: string; color: string; bgColor: string }>,
    selectedPhases: string[]
  ): string => {
    const phaseColorMap: Record<string, string> = {};
    Object.entries(phaseConfig).forEach(([phaseId, config]) => {
      phaseColorMap[phaseId] = config.color;
    });
    const phaseNameMap: Record<string, string> = {};
    Object.entries(phaseConfig).forEach(([phaseId, config]) => {
      phaseNameMap[phaseId] = config.name;
    });

    // Title page
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My First Phonics Dictionary</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700&family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: white;
      font-family: Poppins, sans-serif;
    }
    .print-page {
      page-break-after: always;
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 15mm;
      box-sizing: border-box;
      background: white;
      display: flex;
      flex-direction: column;
    }
    .print-page:last-child {
      page-break-after: avoid;
    }
    .title-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .decorative-border {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 32px;
    }
    .decorative-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #0d7377;
    }
    .title-page h1 {
      margin: 0;
      font-size: 48px;
      font-weight: 900;
      font-family: 'Comic Sans MS', cursive;
      color: #0D3330;
      line-height: 1.2;
    }
    .title-page h1.subtitle {
      color: #0D7377;
      margin-bottom: 32px;
    }
    .title-page p {
      margin: 0 0 48px 0;
      font-size: 18px;
      color: #4a5568;
      line-height: 1.6;
    }
    .phase-legend {
      border: 2px solid #a2d5c6;
      border-radius: 8px;
      padding: 32px;
      background-color: #f0fdf4;
      display: inline-block;
      margin-bottom: 32px;
    }
    .phase-legend-title {
      font-size: 12px;
      font-weight: 600;
      color: #0D3330;
      margin-bottom: 16px;
    }
    .legend-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .legend-dot {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .legend-text {
      font-size: 13px;
      font-weight: 500;
      color: #2d3748;
    }
    .letter-page {
      display: flex;
      flex-direction: column;
    }
    .letter-header {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 4px solid #0d7377;
    }
    .letter-header h2 {
      font-size: 72px;
      font-weight: 900;
      font-family: 'Nunito', sans-serif;
      color: #0D3330;
      margin: 0 0 8px 0;
    }
    .letter-header p {
      font-size: 12px;
      color: #718096;
      margin: 0;
    }
    .word-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      flex-grow: 1;
    }
    .word-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px;
      border-radius: 8px;
      border: 2px solid #e2e8f0;
      background-color: #fafbfc;
    }
    .word-emoji {
      font-size: 64px;
      margin-bottom: 24px;
      line-height: 1;
    }
    .word-text {
      font-family: 'Comic Sans MS', cursive;
      font-size: 28px;
      font-weight: bold;
      color: #0D3330;
      text-align: center;
      margin-bottom: 20px;
      margin-top: 0;
      text-transform: lowercase;
    }
    .word-phase {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: bold;
      color: white;
    }
    .page-footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #a0aec0;
    }
  </style>
</head>
<body>
`;

    // Title Page
    html += `
  <div class="print-page title-page">
    <div class="decorative-border">
      ${[...Array(8)].map(() => '<div class="decorative-dot"></div>').join('')}
    </div>
    <h1>My First</h1>
    <h1 class="subtitle">Phonics Dictionary</h1>
    <p>An alphabetically organized collection<br>of phonics learning words</p>
    <div class="phase-legend">
      <div class="phase-legend-title">PHONICS PHASES:</div>
      <div class="legend-grid">
        ${Object.entries(phaseConfig)
          .map(
            ([_, config]) => `
          <div class="legend-item">
            <div class="legend-dot" style="background-color: ${config.color};"></div>
            <span class="legend-text">${escapeHtml(config.name)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
    <div class="decorative-border" style="margin-bottom: 0;">
      ${[...Array(8)].map(() => '<div class="decorative-dot"></div>').join('')}
    </div>
  </div>
`;

    // Letter pages
    alphabet.forEach(letter => {
      const letterWords = groupedByLetter[letter];
      if (!letterWords || letterWords.length === 0) return;

      // Split into pages of 6 words (2 columns × 3 rows)
      const wordsPerPage = 6;
      for (let i = 0; i < letterWords.length; i += wordsPerPage) {
        const pageWords = letterWords.slice(i, i + wordsPerPage);
        const pageIndex = Math.floor(i / wordsPerPage);
        const totalPages = Math.ceil(letterWords.length / wordsPerPage);

        html += `
  <div class="print-page letter-page">
    <div class="letter-header">
      <h2>${escapeHtml(letter)}</h2>
      <p>${pageIndex + 1} of ${totalPages}</p>
    </div>
    <div class="word-grid">
      ${pageWords
        .map(
          entry => `
      <div class="word-card">
        <div class="word-emoji">${entry.image}</div>
        <p class="word-text">${escapeHtml(entry.word)}</p>
        <div class="word-phase" style="background-color: ${phaseColorMap[entry.phase] || '#666'};">
          ${escapeHtml(phaseNameMap[entry.phase] || entry.phase)}
        </div>
      </div>
      `
        )
        .join('')}
    </div>
    <div class="page-footer">
      <p>My First Phonics Dictionary</p>
    </div>
  </div>
`;
      }
    });

    html += `
</body>
</html>
`;
    return html;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-teal-800 to-teal-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link
                href="/montree/library/tools/phonics-fast"
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Back to Phonics Fast"
              >
                ←
              </Link>
              <div>
                <h1 className="text-2xl font-bold">My First Phonics Dictionary</h1>
                <p className="text-sm text-teal-100">
                  {filteredWords.length} word{filteredWords.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                title="Print dictionary"
              >
                🖨️ Print
              </button>
              <button
                onClick={() => setIsPrintMode(!isPrintMode)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                {isPrintMode ? '← View' : '👁️ Preview'}
              </button>
            </div>
          </div>

          {!isPrintMode && (
            <>
              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search words..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Phase Filters */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(PHASE_CONFIG).map(([phaseId, config]) => (
                  <button
                    key={phaseId}
                    onClick={() => togglePhase(phaseId)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      selectedPhases.includes(phaseId)
                        ? 'text-white ring-2 ring-white'
                        : 'text-white/50'
                    }`}
                    style={{
                      backgroundColor: selectedPhases.includes(phaseId)
                        ? config.color
                        : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {config.name} ({phaseCounts[phaseId]})
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {!isPrintMode && (
        <>
          {/* Alphabet Navigation Bar */}
          <div className="sticky top-20 z-40 bg-white border-b-2 border-teal-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3">
              <div className="flex flex-wrap gap-1 justify-center">
                {ALPHABET.map(letter => {
                  const hasWords = groupedByLetter[letter].length > 0;
                  return (
                    <button
                      key={letter}
                      onClick={() => scrollToLetter(letter)}
                      disabled={!hasWords}
                      className={`w-8 h-8 rounded font-bold text-xs transition-all ${
                        hasWords
                          ? 'bg-teal-100 text-teal-800 hover:bg-teal-200 cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dictionary Content */}
          <div className="max-w-6xl mx-auto px-4 py-8">
            {filteredWords.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-lg">No words found.</p>
              </div>
            ) : (
              ALPHABET.map(letter => {
                const letterWords = groupedByLetter[letter];
                if (letterWords.length === 0) return null;

                return (
                  <div key={letter} id={`letter-${letter}`} className="mb-12 scroll-mt-40">
                    {/* Letter Header */}
                    <div className="flex items-center gap-4 mb-8">
                      <h2 className="text-6xl font-black text-teal-800" style={{ fontFamily: 'Nunito, sans-serif' }}>
                        {letter}
                      </h2>
                      <div className="h-1 flex-grow bg-gradient-to-r from-teal-400 via-teal-300 to-transparent rounded-full" />
                    </div>

                    {/* Word Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {letterWords.map(entry => (
                        <div
                          key={`${entry.phase}-${entry.word}`}
                          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-slate-100"
                        >
                          {/* Image/Emoji Container */}
                          <div className="bg-gradient-to-br from-teal-50 to-slate-50 aspect-square flex items-center justify-center text-5xl border-b-2 border-teal-100">
                            {entry.image}
                          </div>

                          {/* Word & Phase */}
                          <div className="p-4">
                            <p
                              style={{ fontFamily: 'Comic Sans MS, cursive' }}
                              className="text-base font-bold text-teal-900 mb-3 lowercase text-center"
                            >
                              {entry.word}
                            </p>
                            <div className="flex justify-center">
                              <span
                                className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white"
                                style={{
                                  backgroundColor: PHASE_CONFIG[entry.phase]?.color ?? '#666',
                                  WebkitPrintColorAdjust: 'exact',
                                }}
                              >
                                {PHASE_CONFIG[entry.phase]?.name ?? entry.phase}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {isPrintMode && (
        <PrintView
          groupedByLetter={groupedByLetter}
          ALPHABET={ALPHABET}
          PHASE_CONFIG={PHASE_CONFIG}
          selectedPhases={selectedPhases}
        />
      )}
    </div>
  );
}

// Print View Component
function PrintView({
  groupedByLetter,
  ALPHABET,
  PHASE_CONFIG,
  selectedPhases,
}: {
  groupedByLetter: Record<string, DictionaryEntry[]>;
  ALPHABET: string[];
  PHASE_CONFIG: Record<string, { name: string; color: string; bgColor: string }>;
  selectedPhases: string[];
}) {
  // Only show words from selected phases
  const filteredGroupedByLetter = useMemo(() => {
    const filtered: Record<string, DictionaryEntry[]> = {};
    Object.entries(groupedByLetter).forEach(([letter, words]) => {
      filtered[letter] = words.filter(w => selectedPhases.includes(w.phase));
    });
    return filtered;
  }, [groupedByLetter, selectedPhases]);

  return (
    <div className="bg-white">
      <style>{`
        @page {
          size: A4;
          margin: 20mm;
          padding: 0;
        }
        @media print {
          html, body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .print-page {
            page-break-after: always;
            margin: 0;
            padding: 20mm;
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            background: white;
          }
          .print-page:last-child {
            page-break-after: avoid;
          }
          button, input, .no-print {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          h1, h2, h3, p, span {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Title Page */}
      <div className="print-page flex flex-col items-center justify-center">
        <div className="text-center">
          {/* Decorative Top Border */}
          <div className="mb-8 flex justify-center gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0d7377' }} />
            ))}
          </div>

          {/* Main Title */}
          <h1 className="text-6xl font-black mb-6" style={{
            fontFamily: 'Comic Sans MS, cursive',
            color: '#0D3330',
          }}>
            My First
          </h1>
          <h1 className="text-5xl font-black mb-8" style={{
            fontFamily: 'Comic Sans MS, cursive',
            color: '#0D7377',
          }}>
            Phonics Dictionary
          </h1>

          {/* Subtitle */}
          <p className="text-xl mb-12" style={{ color: '#4a5568' }}>
            An alphabetically organized collection<br />of phonics learning words
          </p>

          {/* Phase Legend */}
          <div className="mb-12 inline-block border-2 border-teal-200 rounded-lg p-8 bg-teal-50">
            <p className="text-sm font-semibold mb-4" style={{ color: '#0D3330' }}>PHONICS PHASES:</p>
            <div className="grid grid-cols-2 gap-6">
              {Object.entries(PHASE_CONFIG).map(([_, config]) => (
                <div key={config.name} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded"
                    style={{
                      backgroundColor: config.color,
                      WebkitPrintColorAdjust: 'exact',
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#2d3748' }}>
                    {config.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative Bottom Border */}
          <div className="mt-12 flex justify-center gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0d7377' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Dictionary Letter Pages */}
      {ALPHABET.map(letter => {
        const letterWords = filteredGroupedByLetter[letter];
        if (!letterWords || letterWords.length === 0) return null;

        // Split words into chunks of 6 per page (2 columns × 3 rows fits well on A4)
        const wordsPerPage = 6;
        const pages = [];
        for (let i = 0; i < letterWords.length; i += wordsPerPage) {
          pages.push(letterWords.slice(i, i + wordsPerPage));
        }

        return pages.map((pageWords, pageIndex) => (
          <div key={`${letter}-${pageIndex}`} className="print-page flex flex-col">
            {/* Page Header with Letter */}
            <div className="mb-8 pb-6 border-b-4" style={{ borderColor: '#0d7377' }}>
              <h2 className="text-7xl font-black" style={{
                fontFamily: 'Nunito, sans-serif',
                color: '#0D3330',
                WebkitPrintColorAdjust: 'exact',
              }}>
                {letter}
              </h2>
              <p className="text-sm mt-2" style={{ color: '#718096' }}>
                {pageIndex + 1} of {pages.length}
              </p>
            </div>

            {/* Word Cards Grid - 2 columns */}
            <div className="grid grid-cols-2 gap-8 flex-grow">
              {pageWords.map(entry => (
                <div
                  key={entry.word}
                  className="flex flex-col items-center p-6 rounded-lg border-2 bg-white"
                  style={{
                    borderColor: '#e2e8f0',
                    backgroundColor: '#fafbfc',
                  }}
                >
                  {/* Large Image/Emoji */}
                  <div className="text-8xl mb-6">{entry.image}</div>

                  {/* Word Text */}
                  <p
                    style={{
                      fontFamily: 'Comic Sans MS, cursive',
                      color: '#0D3330',
                      WebkitPrintColorAdjust: 'exact',
                    }}
                    className="text-3xl font-bold text-center mb-5 lowercase"
                  >
                    {entry.word}
                  </p>

                  {/* Phase Badge */}
                  <span
                    className="inline-block px-4 py-2 rounded-full text-sm font-bold text-white"
                    style={{
                      backgroundColor: PHASE_CONFIG[entry.phase]?.color ?? '#666',
                      WebkitPrintColorAdjust: 'exact',
                    }}
                  >
                    {PHASE_CONFIG[entry.phase]?.name ?? entry.phase}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t-2 text-center text-xs" style={{ borderColor: '#e2e8f0', color: '#a0aec0' }}>
              <p>My First Phonics Dictionary</p>
            </div>
          </div>
        ));
      })}
    </div>
  );
}
