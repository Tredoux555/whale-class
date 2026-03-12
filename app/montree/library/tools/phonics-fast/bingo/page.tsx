'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_PHASES, getPhaseWords, type PhonicsWord } from '@/lib/montree/phonics/phonics-data';
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
// UTILITIES
// =====================================================================

/** Fisher-Yates shuffle algorithm */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Generate unique random selections for multiple boards */
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
    boards.push({
      id: i,
      cells,
      hasFreeSpace,
    });
  }

  return boards;
}

/** Get all unique words from selected groups */
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
  const initialPhaseId = searchParams.get('phase') || 'initial';

  const [selectedPhaseId, setSelectedPhaseId] = useState(initialPhaseId);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [boardSize, setBoardSize] = useState<3 | 4 | 5>(3);
  const [numBoards, setNumBoards] = useState(1);
  const [hasFreeSpace, setHasFreeSpace] = useState(true);
  const [borderColor, setBorderColor] = useState('#1f2937'); // dark teal
  const [borderWidth, setBorderWidth] = useState(2);
  const [mode, setMode] = useState<'editor' | 'boards' | 'calling'>('editor');
  const [boards, setBoards] = useState<BingoBoard[]>([]);
  const callingCardsRef = useRef<HTMLDivElement>(null);
  const boardsRef = useRef<HTMLDivElement>(null);

  // Photo Bank: resolved on mount
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const controller = new AbortController();
    resolvePhotoBankImages(controller.signal).then((map) => {
      if (!controller.signal.aborted) setPhotoMap(map);
    });
    return () => { controller.abort(); };
  }, []);

  const phase = ALL_PHASES.find(p => p.id === selectedPhaseId);

  // Initialize groups when phase changes
  const handlePhaseChange = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
    setSelectedGroups(new Set());
  };

  // Toggle group selection
  const toggleGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  // Select all groups in current phase
  const selectAllGroups = useCallback(() => {
    if (!phase) return;
    const allGroupIds = new Set(phase.groups.map(g => g.id));
    setSelectedGroups(allGroupIds);
  }, [phase]);

  // Generate boards
  const handleGenerateBoards = useCallback(() => {
    const selectedWords = getSelectedWords(selectedPhaseId, selectedGroups);

    if (selectedWords.length === 0) {
      alert('Please select at least one word group');
      return;
    }

    const cellsNeeded = boardSize * boardSize - (hasFreeSpace ? 1 : 0);
    if (selectedWords.length < cellsNeeded) {
      alert(
        `Not enough words selected. Need ${cellsNeeded}, have ${selectedWords.length}`
      );
      return;
    }

    const generatedBoards = generateMultipleBoards(
      selectedWords,
      boardSize,
      numBoards,
      hasFreeSpace
    );
    setBoards(generatedBoards);
    setMode('boards');
  }, [selectedPhaseId, selectedGroups, boardSize, numBoards, hasFreeSpace]);

  // Get all unique words from all selected groups for calling cards
  const callingWords = useMemo(() => {
    return getSelectedWords(selectedPhaseId, selectedGroups);
  }, [selectedPhaseId, selectedGroups]);

  // Print helper — opens clean window with just the content
  const handlePrintContent = useCallback((contentRef: React.RefObject<HTMLDivElement | null>, title: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !contentRef.current) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Comic Sans MS', cursive, sans-serif; background: white; padding: 20mm; }
        .grid { display: grid; gap: 0; }
        .grid-3 { grid-template-columns: repeat(3, 1fr); }
        .grid-4 { grid-template-columns: repeat(4, 1fr); }
        .grid-5 { grid-template-columns: repeat(5, 1fr); }
        .cell { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; background: white; }
        .cell .emoji { font-size: 2rem; margin-bottom: 4px; }
        .cell .word { font-size: 0.9rem; font-weight: bold; text-align: center; }
        .cell .free { font-size: 2rem; }
        .board { page-break-inside: avoid; margin-bottom: 20mm; aspect-ratio: 1/1; }
        .calling-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .calling-card { border: 3px solid #0D3330; border-radius: 8px; padding: 24px; text-align: center; page-break-inside: avoid; }
        .calling-card .emoji { font-size: 3rem; margin-bottom: 8px; }
        .calling-card .word { font-size: 1.5rem; font-weight: bold; color: #0D3330; }
        @media print { body { padding: 10mm; } .board { page-break-after: always; } }
      </style></head><body>
    `);

    if (title.includes('Board')) {
      // Print boards
      boards.forEach((board, bIdx) => {
        const gridCls = `grid grid-${boardSize}`;
        let html = `<div class="board"><div class="${gridCls}" style="display:grid;grid-template-columns:repeat(${boardSize},1fr);aspect-ratio:1/1;">`;
        const cellCount = boardSize * boardSize;
        let cellIdx = 0;
        for (let i = 0; i < cellCount; i++) {
          const isCenterCell = board.hasFreeSpace && boardSize % 2 === 1 && i === Math.floor(cellCount / 2);
          if (isCenterCell) {
            html += `<div class="cell" style="border:${borderWidth}px solid ${borderColor}"><div class="free">⭐</div><div class="word" style="color:#0D3330">FREE</div></div>`;
          } else {
            const w = board.cells[cellIdx];
            if (w) {
              const wPhotoUrl = photoMap.get(w.word.toLowerCase());
              const imgHtml = wPhotoUrl
                ? `<img src="${wPhotoUrl}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;margin-bottom:4px;" />`
                : `<div class="emoji">${w.image}</div>`;
              html += `<div class="cell" style="border:${borderWidth}px solid ${borderColor}">${imgHtml}<div class="word">${w.word}</div></div>`;
              cellIdx++;
            } else {
              html += `<div class="cell" style="border:${borderWidth}px solid ${borderColor}"></div>`;
              cellIdx++;
            }
          }
        }
        html += '</div></div>';
        printWindow.document.write(html);
      });
    } else {
      // Print calling cards
      printWindow.document.write('<div class="calling-grid">');
      callingWords.forEach(w => {
        const cPhotoUrl = photoMap.get(w.word.toLowerCase());
        const cImgHtml = cPhotoUrl
          ? `<img src="${cPhotoUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />`
          : `<div class="emoji">${w.image}</div>`;
        printWindow.document.write(`<div class="calling-card">${cImgHtml}<div class="word">${w.word}</div></div>`);
      });
      printWindow.document.write('</div>');
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }, [boards, boardSize, borderColor, borderWidth, callingWords, photoMap]);

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
              Create printable picture + word bingo boards
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
              mode === 'editor'
                ? 'text-teal-700 border-b-2 border-teal-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setMode('boards')}
            disabled={boards.length === 0}
            className={`px-6 py-3 font-semibold transition ${
              mode === 'boards' && boards.length > 0
                ? 'text-teal-700 border-b-2 border-teal-700'
                : boards.length === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Boards ({boards.length})
          </button>
          <button
            onClick={() => setMode('calling')}
            disabled={callingWords.length === 0}
            className={`px-6 py-3 font-semibold transition ${
              mode === 'calling' && callingWords.length > 0
                ? 'text-teal-700 border-b-2 border-teal-700'
                : callingWords.length === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Calling Cards
          </button>
        </div>

        {/* EDITOR MODE */}
        {mode === 'editor' && (
          <div className="space-y-8">
            {/* Phase Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Select Phonics Phase
              </h2>
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
                  <h2 className="text-2xl font-bold text-gray-800">
                    Select Word Groups
                  </h2>
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
                        <div className="font-semibold text-gray-800">
                          {group.label}
                        </div>
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
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Board Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Board Size */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Board Size
                  </label>
                  <select
                    value={boardSize}
                    onChange={e => setBoardSize(parseInt(e.target.value) as 3 | 4 | 5)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="3">3×3 (9 words)</option>
                    <option value="4">4×4 (16 words)</option>
                    <option value="5">5×5 (25 words)</option>
                  </select>
                </div>

                {/* Number of Boards */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of Boards
                  </label>
                  <select
                    value={numBoards}
                    onChange={e => setNumBoards(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>
                        {n} board{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Free Space */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Free Space
                  </label>
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

                {/* Border Width */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Border Width
                  </label>
                  <select
                    value={borderWidth}
                    onChange={e => setBorderWidth(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="1">Thin (1px)</option>
                    <option value="2">Medium (2px)</option>
                    <option value="3">Thick (3px)</option>
                  </select>
                </div>
              </div>

              {/* Border Color */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Border Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={e => setBorderColor(e.target.value)}
                    className="w-16 h-10 rounded border-2 border-gray-300 cursor-pointer"
                  />
                  <span className="text-gray-600">{borderColor}</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateBoards}
                className="mt-8 w-full px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition font-bold text-lg shadow-md hover:shadow-lg"
              >
                Generate Bingo Boards
              </button>
            </div>
          </div>
        )}

        {/* BOARDS MODE */}
        {mode === 'boards' && boards.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {boards.length} Bingo Board{boards.length > 1 ? 's' : ''}
                </h2>
                <p className="text-gray-600">
                  {boardSize}×{boardSize} board
                  {hasFreeSpace ? ' with FREE center' : ''}
                </p>
              </div>
              <button
                onClick={() => handlePrintContent(boardsRef, 'Bingo Boards')}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-semibold flex items-center gap-2"
              >
                🖨️ Print All Boards
              </button>
            </div>

            <div ref={boardsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {boards.map(board => (
                <BingoBoardDisplay
                  key={board.id}
                  board={board}
                  boardSize={boardSize}
                  borderColor={borderColor}
                  borderWidth={borderWidth}
                  photoMap={photoMap}
                />
              ))}
            </div>
          </div>
        )}

        {/* CALLING CARDS MODE */}
        {mode === 'calling' && callingWords.length > 0 && (
          <div className="space-y-6" ref={callingCardsRef}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Calling Cards</h2>
                <p className="text-gray-600">
                  {callingWords.length} words - print for the caller
                </p>
              </div>
              <button
                onClick={() => handlePrintContent(callingCardsRef, 'Calling Cards')}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-semibold flex items-center gap-2"
              >
                🖨️ Print Calling Cards
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2">
              {callingWords.map((word, idx) => (
                <CallingCard key={`${word.word}-${idx}`} word={word} photoMap={photoMap} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// BINGO BOARD DISPLAY
// =====================================================================

interface BingoBoardDisplayProps {
  board: BingoBoard;
  boardSize: number;
  borderColor: string;
  borderWidth: number;
  photoMap: Map<string, string>;
}

function BingoBoardDisplay({
  board,
  boardSize,
  borderColor,
  borderWidth,
  photoMap,
}: BingoBoardDisplayProps) {
  const cellCount = boardSize * boardSize;
  const gridClass =
    boardSize === 3
      ? 'grid-cols-3'
      : boardSize === 4
      ? 'grid-cols-4'
      : 'grid-cols-5';

  // Arrange cells into grid
  const gridCells: (PhonicsWord | null)[] = [];
  let cellIdx = 0;

  for (let i = 0; i < cellCount; i++) {
    // Center cell for FREE space (only for odd board sizes with FREE enabled)
    const isCenterCell =
      board.hasFreeSpace &&
      boardSize % 2 === 1 &&
      i === Math.floor(cellCount / 2);

    if (isCenterCell) {
      gridCells.push(null); // null = FREE space
    } else {
      gridCells.push(board.cells[cellIdx] || null);
      if (board.cells[cellIdx]) cellIdx++;
    }
  }

  const borderStyle = {
    border: `${borderWidth}px solid ${borderColor}`,
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 print:shadow-none print:p-4 print:rounded-none">
      <div
        className={`grid ${gridClass} gap-0`}
        style={{ aspectRatio: '1 / 1' }}
      >
        {gridCells.map((word, idx) => (
          <div
            key={idx}
            style={borderStyle}
            className="flex flex-col items-center justify-center bg-white p-3 print:p-2"
          >
            {word === null ? (
              // FREE space
              <div className="text-center">
                <div className="text-3xl mb-1 print:text-2xl">⭐</div>
                <div
                  className="font-bold text-teal-700 print:text-sm"
                  style={{ fontFamily: 'Comic Sans MS, sans-serif' }}
                >
                  FREE
                </div>
              </div>
            ) : (
              // Regular cell — Photo Bank image if available, emoji fallback
              <>
                {photoMap.get(word.word.toLowerCase()) ? (
                  <img
                    src={photoMap.get(word.word.toLowerCase())}
                    alt={word.word}
                    className="mb-2 print:mb-1"
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                ) : (
                  <div className="text-3xl mb-2 print:text-2xl print:mb-1">
                    {word.image}
                  </div>
                )}
                <div
                  className="text-sm font-bold text-gray-800 text-center break-words print:text-xs"
                  style={{ fontFamily: 'Comic Sans MS, sans-serif' }}
                >
                  {word.word}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// CALLING CARD
// =====================================================================

interface CallingCardProps {
  word: PhonicsWord;
  photoMap: Map<string, string>;
}

function CallingCard({ word, photoMap }: CallingCardProps) {
  const photoUrl = photoMap.get(word.word.toLowerCase());
  return (
    <div className="bg-white rounded-lg shadow-md p-8 print:shadow-none print:rounded-none print:p-6 border-4 border-teal-600 flex flex-col items-center justify-center min-h-64 print:min-h-48">
      {photoUrl ? (
        <img src={photoUrl} alt={word.word} className="mb-4" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
      ) : (
        <div className="text-6xl mb-4 print:text-5xl">{word.image}</div>
      )}
      <div
        className="text-4xl font-bold text-teal-700 text-center print:text-3xl"
        style={{ fontFamily: 'Comic Sans MS, sans-serif' }}
      >
        {word.word}
      </div>
    </div>
  );
}

