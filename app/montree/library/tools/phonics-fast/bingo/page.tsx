'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_PHASES, type PhonicsWord } from '@/lib/montree/phonics/phonics-data';
import { resolvePhotoBankImages } from '@/lib/montree/phonics/photo-bank-resolver';

// =====================================================================
// TYPES
// =====================================================================

interface BingoBoard {
  id: number;
  cells: PhonicsWord[];
  hasFreeSpace: boolean;
}

// =====================================================================
// CONSTANTS
// =====================================================================

const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];
const BINGO_COLORS = ['#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800'];

// =====================================================================
// UTILITIES
// =====================================================================

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateMultipleBoards(
  allWords: PhonicsWord[],
  boardSize: number,
  numBoards: number,
  hasFreeSpace: boolean
): BingoBoard[] {
  const boards: BingoBoard[] = [];
  const cellsPerBoard = boardSize * boardSize - (hasFreeSpace ? 1 : 0);

  for (let i = 0; i < numBoards; i++) {
    const shuffled = shuffleArray(allWords);
    const cells = shuffled.slice(0, cellsPerBoard);
    boards.push({ id: i, cells, hasFreeSpace });
  }
  return boards;
}

function getSelectedWords(
  phaseId: string,
  selectedGroups: Set<string>
): PhonicsWord[] {
  const phase = ALL_PHASES.find(p => p.id === phaseId);
  if (!phase) return [];

  const words: PhonicsWord[] = [];
  const seen = new Set<string>();

  for (const group of phase.groups) {
    if (selectedGroups.has(group.id)) {
      for (const word of group.words) {
        if (!seen.has(word.word)) {
          words.push(word);
          seen.add(word.word);
        }
      }
    }
  }
  return words;
}

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export default function PhonicsBingoPage() {
  const searchParams = useSearchParams();
  const initialPhaseId = searchParams.get('phase') || 'pink1';

  const [selectedPhaseId, setSelectedPhaseId] = useState(initialPhaseId);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [boardSize, setBoardSize] = useState<3 | 4 | 5>(4);
  const [numBoards, setNumBoards] = useState(6);
  const [hasFreeSpace, setHasFreeSpace] = useState(false);
  const [borderColor, setBorderColor] = useState('#2D5A27');
  const [borderWidth, setBorderWidth] = useState<number>(2.5);
  const [cornerRadius, setCornerRadius] = useState(8);
  const [mode, setMode] = useState<'editor' | 'boards' | 'calling'>('editor');
  const [boards, setBoards] = useState<BingoBoard[]>([]);

  // Photo Bank
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const controller = new AbortController();
    resolvePhotoBankImages(controller.signal).then((map) => {
      if (!controller.signal.aborted) setPhotoMap(map);
    });
    return () => { controller.abort(); };
  }, []);

  const phase = ALL_PHASES.find(p => p.id === selectedPhaseId);

  const handlePhaseChange = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
    setSelectedGroups(new Set());
  };

  const toggleGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const selectAllGroups = useCallback(() => {
    if (!phase) return;
    setSelectedGroups(new Set(phase.groups.map(g => g.id)));
  }, [phase]);

  const handleGenerateBoards = useCallback(() => {
    const selectedWords = getSelectedWords(selectedPhaseId, selectedGroups);

    if (selectedWords.length === 0) {
      alert('Please select at least one word group');
      return;
    }

    const cellsNeeded = boardSize * boardSize - (hasFreeSpace ? 1 : 0);
    if (selectedWords.length < cellsNeeded) {
      alert(`Not enough words. Need ${cellsNeeded}, have ${selectedWords.length}`);
      return;
    }

    const generatedBoards = generateMultipleBoards(
      selectedWords, boardSize, numBoards, hasFreeSpace
    );
    setBoards(generatedBoards);
    setMode('boards');
  }, [selectedPhaseId, selectedGroups, boardSize, numBoards, hasFreeSpace]);

  const callingWords = useMemo(() => {
    return getSelectedWords(selectedPhaseId, selectedGroups);
  }, [selectedPhaseId, selectedGroups]);

  // ---------------------------------------------------------------
  // PRINT — opens a new window with A4 print-ready pages
  // ---------------------------------------------------------------
  const handlePrint = useCallback((type: 'boards' | 'calling') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const bw = borderWidth * 2; // boards get 2x border like old generator
    const phaseLabel = phase?.name || 'Phonics';

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Phonics Bingo — ${type === 'boards' ? 'Boards' : 'Calling Cards'}</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 6mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: white; }

  .page {
    width: 210mm; min-height: 280mm; margin: 0 auto;
    background: white; padding: 8mm;
    page-break-after: always; overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  .page-header { text-align: center; margin-bottom: 6mm; }

  .page-title {
    font-size: 36px; font-weight: 800; letter-spacing: 8px;
    font-family: 'Nunito', system-ui, sans-serif; margin-bottom: 4px;
  }
  .page-title span {
    display: inline-block; padding: 4px 10px; border-radius: 8px;
    margin: 0 2px; color: white; font-weight: 700;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .page-subtitle { font-size: 12px; color: #999; margin-top: 4px; font-weight: 500; }
  .page-name {
    margin-top: 4mm; font-size: 13px; color: #666;
    border-bottom: 2px solid #d1d5db; display: inline-block;
    width: 56mm; padding-bottom: 4px; font-weight: 500;
  }

  .bingo-grid {
    display: grid; margin: 0 auto; max-width: 190mm;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .bingo-grid.size-3 { grid-template-columns: repeat(3, 1fr); }
  .bingo-grid.size-4 { grid-template-columns: repeat(4, 1fr); }
  .bingo-grid.size-5 { grid-template-columns: repeat(5, 1fr); }

  .bingo-cell {
    aspect-ratio: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; overflow: hidden;
    background: white;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .bingo-cell img {
    width: 100%; flex: 1; object-fit: cover; display: block; min-height: 0;
  }
  .bingo-cell .cell-word {
    font-size: 14px; font-weight: 700;
    font-family: 'Comic Sans MS', cursive; color: #1f2937;
    padding: 2px 0; text-align: center; flex-shrink: 0; line-height: 1.2;
  }
  .bingo-cell .cell-emoji {
    font-size: 2.5rem; flex: 1; display: flex; align-items: center; justify-content: center;
  }
  .free-star { font-size: 2.5rem; }
  .free-label {
    font-size: 14px; font-weight: 700; color: #0D3330;
    font-family: 'Comic Sans MS', cursive;
  }

  /* Calling cards — 3-Part Card style */
  .calling-cards-grid {
    display: grid; margin: 0 auto; max-width: 190mm;
    grid-template-columns: repeat(4, 1fr); gap: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .calling-card {
    display: flex; flex-direction: column; align-items: stretch;
    justify-content: center; text-align: center; aspect-ratio: 1;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .card-inner {
    background: white; flex: 1; display: flex; align-items: center;
    justify-content: center; overflow: hidden;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .card-inner img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card-word {
    font-size: 28px; font-weight: 700;
    font-family: 'Comic Sans MS', cursive; color: #1f2937;
  }
  .card-emoji { font-size: 4rem; }

  .calling-header { text-align: center; margin-bottom: 6mm; }
  .calling-header h2 { font-size: 26px; color: #1f2937; font-family: 'Nunito', system-ui, sans-serif; font-weight: 700; }
  .calling-header p { font-size: 12px; color: #999; margin-top: 3px; }

  @media print {
    body { background: white; }
    .page { box-shadow: none; margin: 0; border-radius: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  }
</style></head><body>`);

    const bingoHeader = BINGO_LETTERS.map((ch, i) =>
      `<span style="background:${BINGO_COLORS[i]}">${ch}</span>`
    ).join('');

    if (type === 'boards') {
      boards.forEach((board, bIdx) => {
        const cellCount = boardSize * boardSize;
        let cellIdx = 0;

        let html = `<div class="page">
          <div class="page-header">
            <div class="page-title">${bingoHeader}</div>
            <div class="page-subtitle">${phaseLabel} · Board #${bIdx + 1}</div>
            <div class="page-name">Name: _________________</div>
          </div>
          <div class="bingo-grid size-${boardSize}" style="background:${borderColor};padding:${bw}mm;gap:${bw}mm;border-radius:${cornerRadius}px;">`;

        for (let i = 0; i < cellCount; i++) {
          const isCenterFree = board.hasFreeSpace && boardSize % 2 === 1 && i === Math.floor(cellCount / 2);
          const cellR = `border-radius:${cornerRadius}px;`;

          if (isCenterFree) {
            html += `<div class="bingo-cell" style="${cellR}"><div class="free-star">⭐</div><div class="free-label">FREE</div></div>`;
          } else {
            const w = board.cells[cellIdx];
            if (w) {
              const photoUrl = photoMap.get(w.word.toLowerCase());
              if (photoUrl) {
                html += `<div class="bingo-cell" style="${cellR}"><img src="${photoUrl}" alt="${w.word}" style="${cellR}"><div class="cell-word">${w.word}</div></div>`;
              } else {
                html += `<div class="bingo-cell" style="${cellR}"><div class="cell-emoji">${w.image}</div><div class="cell-word">${w.word}</div></div>`;
              }
              cellIdx++;
            } else {
              html += `<div class="bingo-cell" style="${cellR}"></div>`;
              cellIdx++;
            }
          }
        }

        html += '</div></div>';
        printWindow.document.write(html);
      });
    } else {
      // Calling cards — duplex: picture front, word back
      const cardsPerPage = 16;
      const cols = 4;
      const pages = Math.ceil(callingWords.length / cardsPerPage);
      // Double borderWidth for calling cards to match board padding (boards use bw = borderWidth * 2)
      const bw = borderWidth * 2;
      const cardStyle = `background:${borderColor};padding:${bw}mm;border-radius:${cornerRadius}px;`;
      const innerR = `border-radius:${Math.max(0, cornerRadius - 1)}px;`;

      for (let p = 0; p < pages; p++) {
        const start = p * cardsPerPage;
        const pageItems: (PhonicsWord | null)[] = callingWords.slice(start, start + cardsPerPage);
        while (pageItems.length < cardsPerPage) pageItems.push(null);

        // FRONT — pictures
        let frontHtml = `<div class="page"><div class="calling-header">
          <h2>✂️ Calling Cards — ${phaseLabel}</h2>
          <p>Picture Side · Page ${p + 1} of ${pages} · Print duplex, flip on short edge</p>
        </div><div class="calling-cards-grid">`;

        for (const item of pageItems) {
          if (item) {
            const photoUrl = photoMap.get(item.word.toLowerCase());
            const imgContent = photoUrl
              ? `<img src="${photoUrl}" alt="${item.word}">`
              : `<div class="card-emoji">${item.image}</div>`;
            frontHtml += `<div class="calling-card" style="${cardStyle}"><div class="card-inner" style="${innerR}">${imgContent}</div></div>`;
          } else {
            frontHtml += `<div class="calling-card" style="background:transparent;"></div>`;
          }
        }
        frontHtml += '</div></div>';
        printWindow.document.write(frontHtml);

        // BACK — words (mirrored rows for duplex)
        let backHtml = `<div class="page"><div class="calling-header">
          <h2>✂️ Calling Cards — ${phaseLabel}</h2>
          <p>Word Side (mirror-printed for duplex) · Page ${p + 1} of ${pages}</p>
        </div><div class="calling-cards-grid">`;

        const rows = Math.ceil(pageItems.length / cols);
        for (let r = 0; r < rows; r++) {
          const rowItems = pageItems.slice(r * cols, (r + 1) * cols);
          while (rowItems.length < cols) rowItems.push(null);
          const mirrored = [...rowItems].reverse();
          for (const item of mirrored) {
            if (item) {
              backHtml += `<div class="calling-card" style="${cardStyle}"><div class="card-inner" style="${innerR}"><div class="card-word">${item.word}</div></div></div>`;
            } else {
              backHtml += `<div class="calling-card" style="background:transparent;"></div>`;
            }
          }
        }
        backHtml += '</div></div>';
        printWindow.document.write(backHtml);
      }
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }, [boards, boardSize, borderColor, borderWidth, cornerRadius, callingWords, photoMap, phase]);

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Link
              href="/montree/library/tools/phonics-fast"
              className="inline-flex items-center text-teal-100 hover:text-white mb-2 transition"
            >
              ← Back to Phonics Tools
            </Link>
            <h1 className="text-4xl font-bold">Phonics Bingo Generator</h1>
            <p className="text-teal-100 mt-1">
              Print-ready A4 bingo boards with pictures + words
            </p>
          </div>
          <div className="text-5xl">🎲</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-8 border-b-2 border-gray-200">
          <button
            onClick={() => setMode('editor')}
            className={`px-6 py-3 font-semibold transition ${
              mode === 'editor' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => { if (boards.length > 0) setMode('boards'); }}
            className={`px-6 py-3 font-semibold transition ${
              mode === 'boards' ? 'text-teal-700 border-b-2 border-teal-700'
                : boards.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Boards ({boards.length})
          </button>
          <button
            onClick={() => { if (callingWords.length > 0) setMode('calling'); }}
            className={`px-6 py-3 font-semibold transition ${
              mode === 'calling' ? 'text-teal-700 border-b-2 border-teal-700'
                : callingWords.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Calling Cards
          </button>
        </div>

        {/* =================== EDITOR MODE =================== */}
        {mode === 'editor' && (
          <div className="space-y-8">
            {/* Phase Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Phonics Phase</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {ALL_PHASES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePhaseChange(p.id)}
                    className={`p-4 rounded-lg border-2 transition font-semibold ${
                      selectedPhaseId === p.id
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-teal-400'
                    }`}
                  >
                    <div className="text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {p.groups.reduce((sum, g) => sum + g.words.length, 0)} words
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Group Selection */}
            {phase && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Select Word Groups</h2>
                  <button
                    onClick={selectAllGroups}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-semibold text-sm"
                  >
                    Select All
                  </button>
                </div>
                <p className="text-gray-600 mb-4">{phase.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {phase.groups.map(group => (
                    <label
                      key={group.id}
                      className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        className="w-5 h-5 mt-1 rounded border-gray-300 text-teal-600 accent-teal-600"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">{group.label}</div>
                        <div className="text-sm text-gray-600">
                          {group.description} ({group.words.length} words)
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Board Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Board Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Grid Size</label>
                  <select
                    value={boardSize}
                    onChange={e => setBoardSize(parseInt(e.target.value) as 3 | 4 | 5)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="3">3×3 (9 pictures)</option>
                    <option value="4">4×4 (16 pictures)</option>
                    <option value="5">5×5 (25 pictures)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Boards</label>
                  <select
                    value={numBoards}
                    onChange={e => setNumBoards(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => (
                      <option key={n} value={n}>{n} board{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Free Space</label>
                  <label className="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg hover:bg-teal-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={hasFreeSpace}
                      onChange={e => setHasFreeSpace(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-teal-600 accent-teal-600"
                    />
                    <span className="text-gray-700">Add center FREE space</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Border Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={borderColor}
                      onChange={e => setBorderColor(e.target.value)}
                      className="w-16 h-10 rounded border-2 border-gray-300 cursor-pointer"
                    />
                    <span className="text-gray-600 font-mono text-sm">{borderColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Border Width</label>
                  <select
                    value={borderWidth}
                    onChange={e => setBorderWidth(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="1.5">Thin</option>
                    <option value="2.5">Medium</option>
                    <option value="4">Thick</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Corners</label>
                  <select
                    value={cornerRadius}
                    onChange={e => setCornerRadius(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="0">Square</option>
                    <option value="4">Slight</option>
                    <option value="8">Rounded</option>
                    <option value="14">Very Round</option>
                  </select>
                </div>
              </div>

              {/* How to play */}
              <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg text-sm text-gray-700">
                <strong className="text-amber-700">How to play:</strong>{' '}
                1) Print the <strong>Bingo Boards</strong> — each board has pictures with words (single-sided, one page per board).{' '}
                2) Print the <strong>Calling Cards</strong> duplex (flip on short edge) — picture on front, word on back. Cut along borders.{' '}
                3) The caller draws a card, shows the picture. Players find and cover the matching picture on their board.
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleGenerateBoards}
                  className="px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition font-bold text-lg shadow-md hover:shadow-lg"
                >
                  Generate Bingo Boards
                </button>
                <button
                  onClick={() => {
                    handleGenerateBoards();
                    setTimeout(() => setMode('calling'), 50);
                  }}
                  className="px-6 py-4 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-lg hover:from-amber-500 hover:to-amber-600 transition font-bold text-lg shadow-md"
                >
                  Generate Calling Cards
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================== BOARDS MODE =================== */}
        {mode === 'boards' && boards.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {boards.length} Bingo Board{boards.length > 1 ? 's' : ''}
                </h2>
                <p className="text-gray-600">
                  {boardSize}×{boardSize} · {phase?.name || 'Phonics'}
                  {hasFreeSpace ? ' · FREE center' : ''}
                </p>
              </div>
              <button
                onClick={() => handlePrint('boards')}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-semibold flex items-center gap-2 shadow-md"
              >
                🖨️ Print All Boards
              </button>
            </div>

            {/* Board Preview — show A4-style preview with BINGO header */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {boards.map((board, bIdx) => (
                <BingoBoardPreview
                  key={board.id}
                  board={board}
                  boardNum={bIdx + 1}
                  boardSize={boardSize}
                  borderColor={borderColor}
                  borderWidth={borderWidth * 2}
                  cornerRadius={cornerRadius}
                  photoMap={photoMap}
                  phaseLabel={phase?.name || 'Phonics'}
                />
              ))}
            </div>
          </div>
        )}

        {/* =================== CALLING CARDS MODE =================== */}
        {mode === 'calling' && callingWords.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Calling Cards</h2>
                <p className="text-gray-600">
                  {callingWords.length} words — print duplex (picture front, word back)
                </p>
              </div>
              <button
                onClick={() => handlePrint('calling')}
                className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-semibold flex items-center gap-2 shadow-md"
              >
                🖨️ Print Calling Cards
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {callingWords.map((word, idx) => {
                const photoUrl = photoMap.get(word.word.toLowerCase());
                return (
                  <div
                    key={`${word.word}-${idx}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden border-4 flex flex-col"
                    style={{ borderColor }}
                  >
                    <div className="aspect-square flex items-center justify-center bg-gray-50 overflow-hidden">
                      {photoUrl ? (
                        <img src={photoUrl} alt={word.word} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-6xl">{word.image}</span>
                      )}
                    </div>
                    <div
                      className="py-2 text-center font-bold text-xl text-gray-800"
                      style={{ fontFamily: 'Comic Sans MS, cursive' }}
                    >
                      {word.word}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// BINGO BOARD PREVIEW — A4-style with BINGO header + uniform borders
// =====================================================================

interface BingoBoardPreviewProps {
  board: BingoBoard;
  boardNum: number;
  boardSize: number;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  photoMap: Map<string, string>;
  phaseLabel: string;
}

function BingoBoardPreview({
  board, boardNum, boardSize, borderColor, borderWidth, cornerRadius, photoMap, phaseLabel,
}: BingoBoardPreviewProps) {
  const cellCount = boardSize * boardSize;
  const gridCells: (PhonicsWord | 'FREE' | null)[] = [];
  let cellIdx = 0;

  for (let i = 0; i < cellCount; i++) {
    const isCenterFree = board.hasFreeSpace && boardSize % 2 === 1 && i === Math.floor(cellCount / 2);
    if (isCenterFree) {
      gridCells.push('FREE');
    } else {
      gridCells.push(board.cells[cellIdx] || null);
      if (board.cells[cellIdx]) cellIdx++;
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* BINGO Header */}
      <div className="text-center pt-4 pb-2">
        <div className="flex items-center justify-center gap-1 mb-1">
          {BINGO_LETTERS.map((ch, i) => (
            <span
              key={ch}
              className="inline-block text-white font-extrabold text-2xl px-3 py-1 rounded-lg shadow-md"
              style={{ background: BINGO_COLORS[i], fontFamily: 'Nunito, system-ui, sans-serif' }}
            >
              {ch}
            </span>
          ))}
        </div>
        <div className="text-xs text-gray-400 mt-1">{phaseLabel} · Board #{boardNum}</div>
        <div className="mt-1 text-sm text-gray-500">
          Name: <span className="inline-block border-b-2 border-gray-300 w-40">&nbsp;</span>
        </div>
      </div>

      {/* Grid — uniform border approach: grid bg = border color, gap = border width */}
      <div className="px-4 pb-4">
        <div
          className="grid mx-auto"
          style={{
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
            background: borderColor,
            padding: `${borderWidth}px`,
            gap: `${borderWidth}px`,
            borderRadius: `${cornerRadius}px`,
            aspectRatio: '1 / 1',
          }}
        >
          {gridCells.map((cell, idx) => (
            <div
              key={idx}
              className="bg-white flex flex-col items-center justify-center overflow-hidden"
              style={{ borderRadius: `${cornerRadius}px` }}
            >
              {cell === 'FREE' ? (
                <div className="text-center">
                  <div className="text-2xl">⭐</div>
                  <div className="text-xs font-bold text-teal-700" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                    FREE
                  </div>
                </div>
              ) : cell ? (
                <>
                  {photoMap.get(cell.word.toLowerCase()) ? (
                    <img
                      src={photoMap.get(cell.word.toLowerCase())}
                      alt={cell.word}
                      className="w-full flex-1 object-cover min-h-0"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-2xl min-h-0">
                      {cell.image}
                    </div>
                  )}
                  <div
                    className="text-xs font-bold text-gray-800 text-center py-0.5 flex-shrink-0 w-full"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}
                  >
                    {cell.word}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
