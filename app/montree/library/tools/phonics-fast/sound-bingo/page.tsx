// /montree/library/tools/phonics-fast/sound-bingo/page.tsx
// Sound Bingo — Beginning / Ending / Middle sound identification game
// Three modes: Letter Sounds (a-z), Short Vowels (CVC), Blends (blue series)
// Calling cards show sound position visually: K _ _ / _ _ T / _ A _
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { SOUND_BINGO_ANCHORS } from '@/lib/montree/phonics/phonics-data';

// =====================================================================
// TYPES
// =====================================================================

type GameMode = 'beginning' | 'ending' | 'middle';
type ViewMode = 'setup' | 'boards' | 'calling' | 'progression';

interface BingoCell {
  word: string;
  image: string;
  letter: string;
  sound: string;
}

interface CallingCard {
  sound: string;
  display: string;    // e.g. "K _ _" or "_ _ T" or "_ A _"
  answer: string;     // e.g. "cat, can, cup"
  matchingWords: string[];
}

// =====================================================================
// CONSTANTS
// =====================================================================

const SHORT_VOWELS = ['a', 'e', 'i', 'o', 'u'];

// CVC words grouped by ending sound for ending-sound bingo
const CVC_BY_ENDING: Record<string, { word: string; image: string }[]> = {
  t: [
    { word: 'cat', image: '\uD83D\uDC31' }, { word: 'mat', image: '\uD83E\uDDF6' },
    { word: 'bat', image: '\uD83E\uDD87' }, { word: 'hat', image: '\uD83C\uDFA9' },
    { word: 'rat', image: '\uD83D\uDC00' }, { word: 'net', image: '\uD83E\uDD45' },
    { word: 'nut', image: '\uD83E\uDD5C' }, { word: 'hot', image: '\uD83D\uDD25' },
    { word: 'pot', image: '\uD83C\uDF72' }, { word: 'sit', image: '\uD83E\uDE91' },
    { word: 'hit', image: '\uD83D\uDCA5' }, { word: 'bit', image: '\uD83E\uDE99' },
    { word: 'cut', image: '\u2702\uFE0F' }, { word: 'hut', image: '\uD83D\uDED6' },
    { word: 'got', image: '\u2705' }, { word: 'pet', image: '\uD83D\uDC15' },
  ],
  n: [
    { word: 'can', image: '\uD83E\uDD6B' }, { word: 'fan', image: '\uD83E\uDEAD' },
    { word: 'man', image: '\uD83D\uDC68' }, { word: 'pan', image: '\uD83C\uDF73' },
    { word: 'van', image: '\uD83D\uDE90' }, { word: 'hen', image: '\uD83D\uDC14' },
    { word: 'pen', image: '\uD83D\uDD8A\uFE0F' }, { word: 'ten', image: '\uD83D\uDD1F' },
    { word: 'sun', image: '\u2600\uFE0F' }, { word: 'run', image: '\uD83C\uDFC3' },
    { word: 'pin', image: '\uD83D\uDCCC' }, { word: 'bin', image: '\uD83D\uDDD1\uFE0F' },
    { word: 'bun', image: '\uD83C\uDF5E' }, { word: 'fun', image: '\uD83C\uDF89' },
    { word: 'nun', image: '\uD83D\uDE4F' }, { word: 'win', image: '\uD83C\uDFC6' },
  ],
  g: [
    { word: 'bag', image: '\uD83D\uDC5C' }, { word: 'tag', image: '\uD83C\uDFF7\uFE0F' },
    { word: 'rag', image: '\uD83E\uDDF9' }, { word: 'pig', image: '\uD83D\uDC37' },
    { word: 'big', image: '\uD83D\uDC18' }, { word: 'dig', image: '\u26CF\uFE0F' },
    { word: 'jig', image: '\uD83D\uDC83' }, { word: 'wig', image: '\uD83D\uDC69' },
    { word: 'bug', image: '\uD83D\uDC1B' }, { word: 'mug', image: '\u2615' },
    { word: 'rug', image: '\uD83E\uDEA7' }, { word: 'jug', image: '\uD83E\uDED7' },
    { word: 'dog', image: '\uD83D\uDC15' }, { word: 'log', image: '\uD83E\uDEB5' },
    { word: 'fog', image: '\uD83C\uDF2B\uFE0F' }, { word: 'hog', image: '\uD83D\uDC16' },
  ],
  p: [
    { word: 'cap', image: '\uD83E\uDDE2' }, { word: 'map', image: '\uD83D\uDDFA\uFE0F' },
    { word: 'tap', image: '\uD83D\uDEB0' }, { word: 'nap', image: '\uD83D\uDE34' },
    { word: 'lap', image: '\uD83E\uDDCE' }, { word: 'gap', image: '\u2B1C' },
    { word: 'hip', image: '\uD83E\uDDB4' }, { word: 'rip', image: '\uD83D\uDCC3' },
    { word: 'sip', image: '\uD83E\uDD64' }, { word: 'tip', image: '\uD83D\uDCA1' },
    { word: 'zip', image: '\uD83E\uDD10' }, { word: 'cup', image: '\uD83E\uDD64' },
    { word: 'pup', image: '\uD83D\uDC36' }, { word: 'top', image: '\uD83D\uDD1D' },
    { word: 'mop', image: '\uD83E\uDDF9' }, { word: 'hop', image: '\uD83D\uDC07' },
  ],
  d: [
    { word: 'dad', image: '\uD83D\uDC68' }, { word: 'bad', image: '\uD83D\uDE21' },
    { word: 'sad', image: '\uD83D\uDE22' }, { word: 'mad', image: '\uD83D\uDE20' },
    { word: 'bed', image: '\uD83D\uDECF\uFE0F' }, { word: 'red', image: '\uD83D\uDD34' },
    { word: 'led', image: '\uD83D\uDCA1' }, { word: 'bid', image: '\uD83D\uDCB0' },
    { word: 'hid', image: '\uD83D\uDE48' }, { word: 'kid', image: '\uD83D\uDC66' },
    { word: 'lid', image: '\uD83E\uDEA3' }, { word: 'mud', image: '\uD83D\uDFE4' },
    { word: 'bud', image: '\uD83C\uDF3A' }, { word: 'rod', image: '\uD83C\uDFA3' },
    { word: 'nod', image: '\uD83D\uDE42' }, { word: 'cod', image: '\uD83D\uDC1F' },
  ],
  b: [
    { word: 'cab', image: '\uD83D\uDE95' }, { word: 'tab', image: '\uD83D\uDCCB' },
    { word: 'dab', image: '\uD83D\uDCA7' }, { word: 'jab', image: '\uD83E\uDD4A' },
    { word: 'web', image: '\uD83D\uDD78\uFE0F' }, { word: 'rib', image: '\uD83C\uDF56' },
    { word: 'bib', image: '\uD83D\uDC76' }, { word: 'cob', image: '\uD83C\uDF3D' },
    { word: 'job', image: '\uD83D\uDCBC' }, { word: 'rob', image: '\uD83E\uDD78' },
    { word: 'tub', image: '\uD83D\uDEC1' }, { word: 'hub', image: '\uD83D\uDD17' },
    { word: 'rub', image: '\uD83E\uDDF9' }, { word: 'sub', image: '\uD83E\uDD6A' },
    { word: 'cub', image: '\uD83D\uDC3B' }, { word: 'pub', image: '\uD83C\uDF7A' },
  ],
  m: [
    { word: 'ham', image: '\uD83C\uDF56' }, { word: 'jam', image: '\uD83C\uDF6F' },
    { word: 'ram', image: '\uD83D\uDC0F' }, { word: 'yam', image: '\uD83C\uDF60' },
    { word: 'dam', image: '\uD83C\uDF0A' }, { word: 'gum', image: '\uD83D\uDCAD' },
    { word: 'hum', image: '\uD83C\uDFB5' }, { word: 'sum', image: '\u2795' },
    { word: 'gym', image: '\uD83C\uDFCB\uFE0F' }, { word: 'hem', image: '\uD83E\uDEA1' },
    { word: 'dim', image: '\uD83D\uDD6F\uFE0F' }, { word: 'rim', image: '\u2B55' },
    { word: 'him', image: '\uD83D\uDC68' }, { word: 'tom', image: '\uD83D\uDC31' },
    { word: 'mom', image: '\uD83D\uDC69' },
  ],
  x: [
    { word: 'box', image: '\uD83D\uDCE6' }, { word: 'fox', image: '\uD83E\uDD8A' },
    { word: 'mix', image: '\uD83E\uDD63' }, { word: 'six', image: '\u0036\uFE0F\u20E3' },
    { word: 'fix', image: '\uD83D\uDD27' }, { word: 'wax', image: '\uD83D\uDD6F\uFE0F' },
    { word: 'tax', image: '\uD83D\uDCB5' }, { word: 'max', image: '\uD83D\uDCC8' },
  ],
};

// CVC words grouped by middle vowel sound
const CVC_BY_MIDDLE: Record<string, { word: string; image: string }[]> = {
  a: [
    { word: 'cat', image: '\uD83D\uDC31' }, { word: 'mat', image: '\uD83E\uDDF6' },
    { word: 'bat', image: '\uD83E\uDD87' }, { word: 'hat', image: '\uD83C\uDFA9' },
    { word: 'rat', image: '\uD83D\uDC00' }, { word: 'bag', image: '\uD83D\uDC5C' },
    { word: 'fan', image: '\uD83E\uDEAD' }, { word: 'can', image: '\uD83E\uDD6B' },
    { word: 'man', image: '\uD83D\uDC68' }, { word: 'pan', image: '\uD83C\uDF73' },
    { word: 'van', image: '\uD83D\uDE90' }, { word: 'cap', image: '\uD83E\uDDE2' },
    { word: 'map', image: '\uD83D\uDDFA\uFE0F' }, { word: 'tap', image: '\uD83D\uDEB0' },
    { word: 'nap', image: '\uD83D\uDE34' }, { word: 'jam', image: '\uD83C\uDF6F' },
    { word: 'ham', image: '\uD83C\uDF56' }, { word: 'ram', image: '\uD83D\uDC0F' },
    { word: 'cab', image: '\uD83D\uDE95' }, { word: 'dad', image: '\uD83D\uDC68' },
  ],
  e: [
    { word: 'net', image: '\uD83E\uDD45' }, { word: 'bed', image: '\uD83D\uDECF\uFE0F' },
    { word: 'red', image: '\uD83D\uDD34' }, { word: 'hen', image: '\uD83D\uDC14' },
    { word: 'pen', image: '\uD83D\uDD8A\uFE0F' }, { word: 'ten', image: '\uD83D\uDD1F' },
    { word: 'leg', image: '\uD83E\uDDB5' }, { word: 'web', image: '\uD83D\uDD78\uFE0F' },
    { word: 'pet', image: '\uD83D\uDC15' }, { word: 'vet', image: '\uD83D\uDC69\u200D\u2695\uFE0F' },
    { word: 'jet', image: '\u2708\uFE0F' }, { word: 'set', image: '\uD83D\uDCE6' },
    { word: 'wet', image: '\uD83D\uDCA6' }, { word: 'get', image: '\u2705' },
    { word: 'peg', image: '\uD83D\uDCCC' }, { word: 'beg', image: '\uD83D\uDE4F' },
  ],
  i: [
    { word: 'sit', image: '\uD83E\uDE91' }, { word: 'hit', image: '\uD83D\uDCA5' },
    { word: 'bit', image: '\uD83E\uDE99' }, { word: 'pig', image: '\uD83D\uDC37' },
    { word: 'big', image: '\uD83D\uDC18' }, { word: 'dig', image: '\u26CF\uFE0F' },
    { word: 'pin', image: '\uD83D\uDCCC' }, { word: 'bin', image: '\uD83D\uDDD1\uFE0F' },
    { word: 'win', image: '\uD83C\uDFC6' }, { word: 'fin', image: '\uD83D\uDC1F' },
    { word: 'tip', image: '\uD83D\uDCA1' }, { word: 'rip', image: '\uD83D\uDCC3' },
    { word: 'sip', image: '\uD83E\uDD64' }, { word: 'zip', image: '\uD83E\uDD10' },
    { word: 'hip', image: '\uD83E\uDDB4' }, { word: 'kid', image: '\uD83D\uDC66' },
    { word: 'lid', image: '\uD83E\uDEA3' }, { word: 'rib', image: '\uD83C\uDF56' },
    { word: 'bib', image: '\uD83D\uDC76' }, { word: 'mix', image: '\uD83E\uDD63' },
  ],
  o: [
    { word: 'top', image: '\uD83D\uDD1D' }, { word: 'mop', image: '\uD83E\uDDF9' },
    { word: 'hop', image: '\uD83D\uDC07' }, { word: 'dog', image: '\uD83D\uDC15' },
    { word: 'log', image: '\uD83E\uDEB5' }, { word: 'fog', image: '\uD83C\uDF2B\uFE0F' },
    { word: 'hog', image: '\uD83D\uDC16' }, { word: 'pot', image: '\uD83C\uDF72' },
    { word: 'hot', image: '\uD83D\uDD25' }, { word: 'got', image: '\u2705' },
    { word: 'cot', image: '\uD83D\uDECF\uFE0F' }, { word: 'box', image: '\uD83D\uDCE6' },
    { word: 'fox', image: '\uD83E\uDD8A' }, { word: 'rod', image: '\uD83C\uDFA3' },
    { word: 'nod', image: '\uD83D\uDE42' }, { word: 'cob', image: '\uD83C\uDF3D' },
    { word: 'job', image: '\uD83D\uDCBC' }, { word: 'rob', image: '\uD83E\uDD78' },
  ],
  u: [
    { word: 'sun', image: '\u2600\uFE0F' }, { word: 'run', image: '\uD83C\uDFC3' },
    { word: 'fun', image: '\uD83C\uDF89' }, { word: 'bun', image: '\uD83C\uDF5E' },
    { word: 'nun', image: '\uD83D\uDE4F' }, { word: 'cup', image: '\uD83E\uDD64' },
    { word: 'pup', image: '\uD83D\uDC36' }, { word: 'bug', image: '\uD83D\uDC1B' },
    { word: 'mug', image: '\u2615' }, { word: 'rug', image: '\uD83E\uDEA7' },
    { word: 'jug', image: '\uD83E\uDED7' }, { word: 'tub', image: '\uD83D\uDEC1' },
    { word: 'hub', image: '\uD83D\uDD17' }, { word: 'cub', image: '\uD83D\uDC3B' },
    { word: 'mud', image: '\uD83D\uDFE4' }, { word: 'bud', image: '\uD83C\uDF3A' },
    { word: 'hut', image: '\uD83D\uDED6' }, { word: 'nut', image: '\uD83E\uDD5C' },
    { word: 'cut', image: '\u2702\uFE0F' }, { word: 'gum', image: '\uD83D\uDCAD' },
  ],
};

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

// Build calling cards for beginning sounds (only anchors with 'beginning' in appearsIn)
function buildBeginningCallingCards(): CallingCard[] {
  return SOUND_BINGO_ANCHORS
    .filter(a => a.appearsIn.includes('beginning'))
    .map(a => ({
      sound: a.sound,
      display: `${a.letter.toUpperCase()} _ _`,
      answer: a.word,
      matchingWords: [a.word],
    }));
}

// Build calling cards for ending sounds
function buildEndingCallingCards(): CallingCard[] {
  return Object.entries(CVC_BY_ENDING).map(([letter, words]) => ({
    sound: `/${letter}/`,
    display: `_ _ ${letter.toUpperCase()}`,
    answer: words.slice(0, 3).map(w => w.word).join(', '),
    matchingWords: words.map(w => w.word),
  }));
}

// Build calling cards for middle sounds
function buildMiddleCallingCards(): CallingCard[] {
  return SHORT_VOWELS.map(v => ({
    sound: `/${v}/`,
    display: `_ ${v.toUpperCase()} _`,
    answer: CVC_BY_MIDDLE[v]?.slice(0, 4).map(w => w.word).join(', ') || '',
    matchingWords: CVC_BY_MIDDLE[v]?.map(w => w.word) || [],
  }));
}

// =====================================================================
// COMPONENTS
// =====================================================================

function ProgressionMap() {
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-lg font-bold text-amber-800 mb-1">The Journey: How Sounds Become Reading</h3>
        <p className="text-sm text-amber-700 mb-4">
          Each anchor word is introduced as a SOUND, then becomes a word the child can DECODE.
          Start with cat and mat. The same pictures follow the child from beginning sounds through to green series.
        </p>

        <div className="flex items-center gap-2 mb-4 text-xs font-medium">
          <span className="px-2 py-1 rounded bg-amber-200 text-amber-800">Beginning Sounds</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2 py-1 rounded bg-pink-200 text-pink-800">Pink CVC</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2 py-1 rounded bg-blue-200 text-blue-800">Blue Blends</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2 py-1 rounded bg-green-200 text-green-800">Green Phonograms</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {SOUND_BINGO_ANCHORS.map(a => (
          <div key={a.letter} className="bg-white rounded-lg border p-3 text-center shadow-sm">
            <div className="text-3xl mb-1">{a.image}</div>
            <div className="font-bold text-lg">{a.letter.toUpperCase()}</div>
            <div className="text-sm text-gray-700 font-medium">{a.word}</div>
            <div className="text-xs text-gray-500 mt-1">{a.sound}</div>
            <div className="flex flex-wrap justify-center gap-1 mt-2">
              {a.appearsIn.map(phase => {
                const color = phase === 'beginning' ? 'bg-amber-100 text-amber-700'
                  : phase === 'ending' ? 'bg-rose-100 text-rose-700'
                  : phase.startsWith('pink') ? 'bg-pink-100 text-pink-700'
                  : phase.startsWith('blue') ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700';
                return <span key={phase} className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>{phase}</span>;
              })}
            </div>
            {a.isCVC && <span className="text-[10px] text-emerald-600 font-medium mt-1 block">CVC</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// MAIN PAGE
// =====================================================================

export default function SoundBingoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [gameMode, setGameMode] = useState<GameMode>('beginning');
  const [boardSize, setBoardSize] = useState<3 | 4>(3);
  const [numBoards, setNumBoards] = useState(6);
  const [borderColor, setBorderColor] = useState('#0D3330');

  // Calling card state
  const [callingCards, setCallingCards] = useState<CallingCard[]>([]);
  const [currentCallIndex, setCurrentCallIndex] = useState(0);
  // Board state
  const [boards, setBoards] = useState<BingoCell[][]>([]);

  // Build word pool based on mode
  const wordPool = useMemo((): BingoCell[] => {
    if (gameMode === 'beginning') {
      return SOUND_BINGO_ANCHORS
        .filter(a => a.appearsIn.includes('beginning'))
        .map(a => ({
          word: a.word, image: a.image, letter: a.letter, sound: a.sound,
        }));
    }
    if (gameMode === 'ending') {
      const allWords: BingoCell[] = [];
      const seen = new Set<string>();
      for (const [letter, words] of Object.entries(CVC_BY_ENDING)) {
        for (const w of words) {
          if (!seen.has(w.word)) {
            allWords.push({ word: w.word, image: w.image, letter, sound: `/${letter}/` });
            seen.add(w.word);
          }
        }
      }
      return allWords;
    }
    // middle
    const allWords: BingoCell[] = [];
    const seen = new Set<string>();
    for (const [vowel, words] of Object.entries(CVC_BY_MIDDLE)) {
      for (const w of words) {
        if (!seen.has(w.word)) {
          allWords.push({ word: w.word, image: w.image, letter: vowel, sound: `/${vowel}/` });
          seen.add(w.word);
        }
      }
    }
    return allWords;
  }, [gameMode]);

  const handleGenerate = useCallback(() => {
    const cellsNeeded = boardSize * boardSize;
    if (wordPool.length < cellsNeeded) {
      alert(`Need at least ${cellsNeeded} words, have ${wordPool.length}`);
      return;
    }

    const generatedBoards: BingoCell[][] = [];
    for (let i = 0; i < numBoards; i++) {
      generatedBoards.push(shuffleArray(wordPool).slice(0, cellsNeeded));
    }
    setBoards(generatedBoards);

    // Build calling cards
    let cards: CallingCard[] = [];
    if (gameMode === 'beginning') cards = buildBeginningCallingCards();
    else if (gameMode === 'ending') cards = buildEndingCallingCards();
    else cards = buildMiddleCallingCards();
    setCallingCards(shuffleArray(cards));
    setCurrentCallIndex(0);
    setViewMode('boards');
  }, [wordPool, boardSize, numBoards, gameMode]);

  const handleNextCall = () => {
    if (currentCallIndex < callingCards.length - 1) {
      setCurrentCallIndex(prev => prev + 1);
    }
  };

  const handlePrevCall = () => {
    if (currentCallIndex > 0) {
      setCurrentCallIndex(prev => prev - 1);
    }
  };

  // ── RENDER ──

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link href="/montree/library/tools/phonics-fast" className="text-emerald-300 text-sm hover:underline">
            &larr; Fast Phonics Hub
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">Sound Bingo</h1>
          <p className="text-emerald-200 mt-1 text-sm">
            Beginning, ending, and middle sound identification. Kids teach each other through play.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* View mode tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['setup', 'progression'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                viewMode === mode ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {mode === 'setup' ? 'Game Setup' : 'Progression Map'}
            </button>
          ))}
          {boards.length > 0 && (
            <>
              <button
                onClick={() => setViewMode('boards')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  viewMode === 'boards' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}
              >
                Boards ({boards.length})
              </button>
              <button
                onClick={() => setViewMode('calling')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  viewMode === 'calling' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}
              >
                Calling Cards
              </button>
            </>
          )}
        </div>

        {/* ══════ PROGRESSION MAP ══════ */}
        {viewMode === 'progression' && <ProgressionMap />}

        {/* ══════ SETUP ══════ */}
        {viewMode === 'setup' && (
          <div className="space-y-6">
            {/* How it works */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-bold text-gray-800 mb-2">How Sound Bingo Works</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>Teacher calls a SOUND</strong> (not a word). Students look at their picture cards
                  and identify which pictures match that sound position.
                </p>
                <p>
                  <strong>Beginning:</strong> "I'm looking for words that START with /k/" &mdash;
                  students find pictures of things starting with /k/ (cat, cup, can).
                </p>
                <p>
                  <strong>Ending:</strong> "I'm looking for words that END with /t/" &mdash;
                  calling card shows <span className="font-mono bg-gray-100 px-1 rounded">_ _ T</span>.
                  Students find cat, hat, net, etc.
                </p>
                <p>
                  <strong>Middle:</strong> "I'm looking for words with /a/ in the middle" &mdash;
                  calling card shows <span className="font-mono bg-gray-100 px-1 rounded">_ A _</span>.
                  Students find cat, bat, fan, etc.
                </p>
                <p className="italic text-amber-700">
                  Why bingo? Kids teach each other. When one child spots the match, others learn by watching.
                  Much more effective than teacher-led instruction.
                </p>
              </div>
            </div>

            {/* Game mode */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-bold text-gray-800 mb-3">Sound Position</h3>
              <div className="flex gap-2 flex-wrap">
                {([
                  { id: 'beginning' as const, label: 'Beginning Sound', example: 'K _ _', activeBg: '#FFF7ED', activeBorder: '#F59E0B', activeText: '#92400E' },
                  { id: 'ending' as const, label: 'Ending Sound', example: '_ _ T', activeBg: '#FFF1F2', activeBorder: '#FB7185', activeText: '#9F1239' },
                  { id: 'middle' as const, label: 'Middle Sound', example: '_ A _', activeBg: '#F5F3FF', activeBorder: '#8B5CF6', activeText: '#5B21B6' },
                ]).map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setGameMode(mode.id)}
                    className={`flex-1 min-w-[120px] px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                      gameMode !== mode.id ? 'bg-white border-gray-200 text-gray-600 hover:border-gray-300' : ''
                    }`}
                    style={gameMode === mode.id ? {
                      backgroundColor: mode.activeBg,
                      borderColor: mode.activeBorder,
                      color: mode.activeText,
                    } : undefined}
                  >
                    <div className="font-mono text-lg mb-1">{mode.example}</div>
                    <div>{mode.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Board settings */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-bold text-gray-800 mb-3">Board Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Grid Size</label>
                  <div className="flex gap-2">
                    {([3, 4] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => setBoardSize(size)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          boardSize === size ? 'bg-[#0D3330] text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {size}x{size}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Number of Boards</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={numBoards}
                    onChange={e => setNumBoards(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                    className="w-20 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Border Color</label>
                  <input
                    type="color"
                    value={borderColor}
                    onChange={e => setBorderColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Word pool preview */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-bold text-gray-800 mb-2">
                Word Pool ({wordPool.length} words)
              </h3>
              <div className="flex flex-wrap gap-2">
                {wordPool.slice(0, 40).map(w => (
                  <span key={w.word} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-sm">
                    <span>{w.image}</span>
                    <span className="text-gray-700">{w.word}</span>
                  </span>
                ))}
                {wordPool.length > 40 && (
                  <span className="text-sm text-gray-400">+{wordPool.length - 40} more</span>
                )}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              className="w-full py-4 rounded-xl text-lg font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Generate {numBoards} Bingo Boards + Calling Cards
            </button>
          </div>
        )}

        {/* ══════ BOARDS ══════ */}
        {viewMode === 'boards' && boards.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">
                {numBoards} Bingo Board{numBoards > 1 ? 's' : ''} ({boardSize}x{boardSize})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('calling')}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700"
                >
                  View Calling Cards
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0D3330] text-white hover:bg-[#1a4a46]"
                >
                  Print Boards
                </button>
              </div>
            </div>

            <div className="space-y-8 print:space-y-0">
              {boards.map((board, boardIdx) => (
                <div key={boardIdx} className="bg-white rounded-xl overflow-hidden shadow-sm print:shadow-none print:break-after-page print:rounded-none">
                  <div className="text-center py-2 text-sm font-medium text-gray-500 print:text-xs">
                    Sound Bingo &mdash; Board {boardIdx + 1}
                    <span className="ml-2 text-xs text-gray-400">
                      ({gameMode === 'beginning' ? 'Beginning' : gameMode === 'ending' ? 'Ending' : 'Middle'} Sounds)
                    </span>
                  </div>
                  <div
                    className="grid p-4 print:p-2"
                    style={{
                      gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
                      gap: '3px',
                      backgroundColor: borderColor,
                      borderRadius: '8px',
                      border: `3px solid ${borderColor}`,
                    }}
                  >
                    {board.map((cell, cellIdx) => (
                      <div
                        key={cellIdx}
                        className="bg-white flex flex-col items-center justify-center p-2 aspect-square"
                        style={{ borderRadius: '4px' }}
                      >
                        <div className="text-3xl sm:text-4xl print:text-3xl">{cell.image}</div>
                        <div className="text-xs text-gray-400 mt-1 print:text-[9px]">{cell.word}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ CALLING CARDS ══════ */}
        {viewMode === 'calling' && callingCards.length > 0 && (
          <div className="space-y-6">
            {/* Current card - large display */}
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="text-sm text-gray-400 mb-2">
                Card {currentCallIndex + 1} of {callingCards.length}
              </div>
              <div
                className="text-6xl sm:text-8xl font-mono font-bold tracking-[0.3em] my-8"
                style={{ color: borderColor }}
              >
                {callingCards[currentCallIndex]?.display}
              </div>
              <div className="text-xl text-gray-600 mb-2">
                Sound: <strong>{callingCards[currentCallIndex]?.sound}</strong>
              </div>
              <div className="text-sm text-gray-400">
                Examples: {callingCards[currentCallIndex]?.answer}
              </div>

              <div className="flex justify-center gap-4 mt-8">
                <button
                  onClick={handlePrevCall}
                  disabled={currentCallIndex === 0}
                  className="px-6 py-3 rounded-xl text-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                >
                  &larr; Previous
                </button>
                <button
                  onClick={handleNextCall}
                  disabled={currentCallIndex === callingCards.length - 1}
                  className="px-6 py-3 rounded-xl text-lg font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-30 transition-colors"
                >
                  Next Call &rarr;
                </button>
              </div>
            </div>

            {/* All calling cards for print */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">All Calling Cards</h3>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0D3330] text-white hover:bg-[#1a4a46]"
              >
                Print Calling Cards
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              {callingCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg border-2 p-4 text-center"
                  style={{ borderColor }}
                >
                  <div className="text-2xl font-mono font-bold tracking-widest" style={{ color: borderColor }}>
                    {card.display}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{card.sound}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
