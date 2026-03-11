'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { getDictionaryWords, ALL_PHASES } from '@/lib/montree/phonics/phonics-data';

interface DictionaryEntry {
  word: string;
  image: string;
  phase: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const PHASE_CONFIG: Record<string, { name: string; color: string; bgColor: string }> = {
  initial: { name: 'Initial', color: '#10b981', bgColor: '#ecfdf5' },
  phase2: { name: 'Phase 2', color: '#3b82f6', bgColor: '#eff6ff' },
  blue1: { name: 'Blue 1', color: '#6366f1', bgColor: '#eef2ff' },
  blue2: { name: 'Blue 2', color: '#8b5cf6', bgColor: '#faf5ff' },
};

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#0D3330] to-[#0a2928] text-white shadow-lg">
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
            <button
              onClick={() => setIsPrintMode(!isPrintMode)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              {isPrintMode ? '← View' : '🖨️ Print'}
            </button>
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
          <div className="sticky top-20 z-40 bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3">
              <div className="flex flex-wrap gap-1 justify-center">
                {ALPHABET.map(letter => {
                  const hasWords = groupedByLetter[letter].length > 0;
                  return (
                    <button
                      key={letter}
                      onClick={() => scrollToLetter(letter)}
                      disabled={!hasWords}
                      className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                        hasWords
                          ? 'bg-teal-100 text-[#0D3330] hover:bg-teal-200 cursor-pointer'
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
                  <div key={letter} id={`letter-${letter}`} className="mb-12">
                    {/* Letter Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <h2 className="text-5xl font-black text-[#0D3330]">
                        {letter}
                      </h2>
                      <div className="h-1 flex-grow bg-gradient-to-r from-teal-400 to-transparent rounded-full" />
                    </div>

                    {/* Word Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {letterWords.map(entry => (
                        <div
                          key={`${entry.phase}-${entry.word}`}
                          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          {/* Emoji/Image */}
                          <div className="bg-slate-50 aspect-square flex items-center justify-center text-4xl">
                            {entry.image}
                          </div>

                          {/* Word & Phase */}
                          <div className="p-3">
                            <p
                              style={{ fontFamily: 'Comic Sans MS, cursive' }}
                              className="text-lg font-bold text-slate-900 mb-2 lowercase"
                            >
                              {entry.word}
                            </p>
                            <div
                              className="inline-block px-2 py-1 rounded-full text-xs font-semibold text-white"
                              style={{
                                backgroundColor: PHASE_CONFIG[entry.phase]?.color ?? '#666',
                              }}
                            >
                              {PHASE_CONFIG[entry.phase]?.name ?? entry.phase}
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
}: {
  groupedByLetter: Record<string, DictionaryEntry[]>;
  ALPHABET: string[];
  PHASE_CONFIG: Record<string, { name: string; color: string; bgColor: string }>;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 print:px-0 print:py-0">
      {/* Title Page */}
      <div className="page-break mb-12 text-center py-12 print:py-24">
        <h1
          className="text-5xl font-black text-[#0D3330] mb-4"
          style={{ fontFamily: 'Comic Sans MS, cursive' }}
        >
          My First Phonics Dictionary
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          An alphabetically organized dictionary of phonics words
        </p>
        <div className="flex justify-center gap-4 flex-wrap print:gap-6">
          {Object.entries(PHASE_CONFIG).map(([_, config]) => (
            <div key={config.name} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-sm font-medium">{config.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dictionary Pages */}
      {ALPHABET.map(letter => {
        const letterWords = groupedByLetter[letter];
        if (letterWords.length === 0) return null;

        // Split words into chunks (e.g., 8 words per page)
        const wordsPerPage = 8;
        const pages = [];
        for (let i = 0; i < letterWords.length; i += wordsPerPage) {
          pages.push(letterWords.slice(i, i + wordsPerPage));
        }

        return pages.map((pageWords, pageIndex) => (
          <div
            key={`${letter}-${pageIndex}`}
            className="page-break mb-8 print:mb-0 print:page-break-after-always"
            style={{ pageBreakAfter: 'always' }}
          >
            {/* Page Header */}
            <div className="border-b-2 border-[#0D3330] pb-4 mb-6">
              <h2 className="text-4xl font-black text-[#0D3330]">{letter}</h2>
            </div>

            {/* Word Cards Grid */}
            <div className="grid grid-cols-2 gap-6 print:gap-8">
              {pageWords.map(entry => (
                <div key={entry.word} className="border-2 border-slate-300 rounded-lg p-4">
                  {/* Large Emoji */}
                  <div className="text-6xl mb-3 text-center">{entry.image}</div>

                  {/* Word */}
                  <p
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}
                    className="text-2xl font-bold text-slate-900 text-center mb-3 lowercase"
                  >
                    {entry.word}
                  </p>

                  {/* Phase Badge */}
                  <div className="flex justify-center">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{
                        backgroundColor: PHASE_CONFIG[entry.phase]?.color,
                      }}
                    >
                      {PHASE_CONFIG[entry.phase]?.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ));
      })}

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .page-break {
            page-break-after: always;
          }
          button,
          input {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
