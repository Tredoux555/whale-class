'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ALL_PHASES,
  SENTENCE_TEMPLATES,
  SIGHT_WORDS,
  getPhaseWords,
  type SentenceTemplate,
  type PhonicsWord,
} from '@/lib/montree/phonics/phonics-data';

interface GeneratedSentence {
  text: string;
  template: SentenceTemplate;
  phonicsWords: { word: string; image: string }[];
}

type PrintMode = 'cards' | 'strips' | 'worksheet';
type CardsPerPage = 4 | 6 | 8;

const BORDER_COLORS = [
  { name: 'Teal', value: '#0D3330' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Orange', value: '#f97316' },
];

export default function SentenceCardsPage() {
  const searchParams = useSearchParams();
  const initialPhaseId = searchParams.get('phase') || 'initial';

  const [selectedPhaseId, setSelectedPhaseId] = useState(initialPhaseId);
  const [printMode, setPrintMode] = useState<PrintMode>('cards');
  const [cardsPerPage, setCardsPerPage] = useState<CardsPerPage>(6);
  const [borderColor, setBorderColor] = useState('#0D3330');
  const [customSentences, setCustomSentences] = useState<string>('');

  const selectedPhase = useMemo(
    () => ALL_PHASES.find((p) => p.id === selectedPhaseId) || ALL_PHASES[0],
    [selectedPhaseId]
  );

  // Get all words from the selected phase
  const phaseWords = useMemo(() => {
    const words = getPhaseWords(selectedPhaseId);
    return words.filter((w) => w.isNoun).slice(0, 30); // Filter to nouns only, limit to 30
  }, [selectedPhaseId]);

  // Generate sentences by substituting {word} and {word2} placeholders
  const generatedSentences = useMemo(() => {
    const sentences: GeneratedSentence[] = [];
    const templates = SENTENCE_TEMPLATES.filter((t) => t.phase === selectedPhaseId);

    templates.forEach((template) => {
      // Check if template has {word2} placeholder
      const hasWord2 = template.pattern.includes('{word2}');

      // Generate sentences by substituting words
      const applicableWords = phaseWords.filter((w) =>
        template.requiredWords.includes(w.word)
      );

      applicableWords.forEach((word, idx) => {
        // Find second word if needed
        let text = template.pattern.replace('{word}', word.word);
        const phonicsWordsInSentence = [word];

        if (hasWord2) {
          // Pick a different word from the applicable list
          const word2Idx = (idx + 1) % applicableWords.length;
          const word2 = applicableWords[word2Idx];
          text = text.replace('{word2}', word2.word);
          phonicsWordsInSentence.push(word2);
        }

        sentences.push({
          text,
          template,
          phonicsWords: phonicsWordsInSentence.map((w) => ({
            word: w.word,
            image: w.image,
          })),
        });
      });
    });

    return sentences;
  }, [selectedPhaseId, phaseWords]);

  // Parse custom sentences
  const allSentences = useMemo(() => {
    const custom = customSentences
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((text) => ({
        text,
        template: { pattern: text, requiredWords: [], phase: selectedPhaseId } as SentenceTemplate,
        phonicsWords: [] as { word: string; image: string }[],
      }));

    return [...generatedSentences, ...custom];
  }, [generatedSentences, customSentences, selectedPhaseId]);

  // Paginate sentences
  const totalPages = Math.ceil(allSentences.length / cardsPerPage);
  const paginatedSentences = useMemo(() => {
    const pages: GeneratedSentence[][] = [];
    for (let i = 0; i < allSentences.length; i += cardsPerPage) {
      pages.push(allSentences.slice(i, i + cardsPerPage));
    }
    return pages;
  }, [allSentences, cardsPerPage]);

  const printAreaRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !printAreaRef.current) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sentence Cards</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Comic Sans MS', cursive, sans-serif; background: white; padding: 15mm; }
        .page-break { page-break-after: always; }
        .grid { display: grid; gap: 1rem; }
        .grid-2 { grid-template-columns: repeat(2, 1fr); }
        .grid-3 { grid-template-columns: repeat(3, 1fr); }
        .grid-4 { grid-template-columns: repeat(4, 1fr); }
        @media print { body { padding: 10mm; } }
      </style></head><body>
        ${printAreaRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50">
      {/* Header */}
      <div
        className="text-white shadow-md sticky top-0 z-10"
        style={{ backgroundColor: '#0D3330' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/montree/library/tools/phonics-fast"
            className="text-white hover:text-emerald-200 transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-bold">Sentence Card Generator</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 no-print">
          {/* Phase Selector */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Select Phase</h2>
            <div className="flex flex-wrap gap-2">
              {ALL_PHASES.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhaseId(phase.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedPhaseId === phase.id
                      ? 'text-white shadow-lg'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={
                    selectedPhaseId === phase.id
                      ? { backgroundColor: phase.color }
                      : undefined
                  }
                >
                  {phase.name}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">{selectedPhase.description}</p>
          </div>

          {/* Print Mode */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Print Mode</h2>
            <div className="flex gap-4">
              {(['cards', 'strips', 'worksheet'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="printMode"
                    value={mode}
                    checked={printMode === mode}
                    onChange={(e) => setPrintMode(e.target.value as PrintMode)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 capitalize font-medium">
                    {mode === 'cards'
                      ? '🎫 Cards'
                      : mode === 'strips'
                        ? '📄 Strips'
                        : '📋 Worksheet'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Cards Per Page (only for cards mode) */}
          {printMode === 'cards' && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 text-gray-800">Cards Per Page</h2>
              <div className="flex gap-4">
                {([4, 6, 8] as const).map((num) => (
                  <label key={num} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cardsPerPage"
                      value={num}
                      checked={cardsPerPage === num}
                      onChange={(e) => setCardsPerPage(parseInt(e.target.value) as CardsPerPage)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700 font-medium">{num}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Border Color */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">Border Color</h2>
            <div className="flex flex-wrap gap-3">
              {BORDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBorderColor(color.value)}
                  className="px-4 py-2 rounded-lg font-medium text-white transition-all"
                  style={{
                    backgroundColor: color.value,
                    border:
                      borderColor === color.value ? '3px solid #000' : '2px solid transparent',
                  }}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Sentences */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">
              Custom Sentences (Optional)
            </h2>
            <p className="text-sm text-gray-600 mb-2">Enter one sentence per line:</p>
            <textarea
              value={customSentences}
              onChange={(e) => setCustomSentences(e.target.value)}
              placeholder="E.g.&#10;The cat is big.&#10;I see a dog."
              className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Statistics */}
          <div className="bg-emerald-50 p-4 rounded-lg mb-6 border-l-4 border-emerald-500">
            <p className="text-gray-700">
              <strong>{allSentences.length}</strong> total sentences •{' '}
              <strong>{totalPages}</strong> pages ({cardsPerPage} per page)
            </p>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
          >
            🖨️ Print / Save as PDF
          </button>
        </div>

        {/* Print Area */}
        <div ref={printAreaRef} className="print:p-0">
          {printMode === 'cards' && (
            <PrintableCards
              pages={paginatedSentences}
              borderColor={borderColor}
              cardsPerPage={cardsPerPage}
            />
          )}
          {printMode === 'strips' && (
            <PrintableStrips sentences={allSentences} borderColor={borderColor} />
          )}
          {printMode === 'worksheet' && (
            <PrintableWorksheet sentences={allSentences} borderColor={borderColor} />
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// PRINTABLE CARDS COMPONENT
// =====================================================================

function PrintableCards({
  pages,
  borderColor,
  cardsPerPage,
}: {
  pages: GeneratedSentence[][];
  borderColor: string;
  cardsPerPage: CardsPerPage;
}) {
  const cardHeight = cardsPerPage === 4 ? 'h-56' : cardsPerPage === 6 ? 'h-40' : 'h-32';
  const gridClass =
    cardsPerPage === 4
      ? 'grid-cols-2 gap-4'
      : cardsPerPage === 6
        ? 'grid-cols-3 gap-3'
        : 'grid-cols-4 gap-2';

  return (
    <>
      {pages.map((page, pageIdx) => (
        <div key={pageIdx} className="print:page-break-after-always mb-8">
          <div className={`grid ${gridClass}`}>
            {page.map((sentence, cardIdx) => (
              <SentenceCard
                key={`${pageIdx}-${cardIdx}`}
                sentence={sentence}
                borderColor={borderColor}
                className={cardHeight}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// =====================================================================
// SENTENCE CARD COMPONENT
// =====================================================================

function SentenceCard({
  sentence,
  borderColor,
  className = 'h-48',
}: {
  sentence: GeneratedSentence;
  borderColor: string;
  className?: string;
}) {
  const parts = sentence.text.split(new RegExp(`(${sentence.phonicsWords.map((p) => p.word).join('|')})`));

  return (
    <div
      className={`${className} p-4 rounded-lg shadow-md flex flex-col items-center justify-center text-center border-4`}
      style={{ borderColor, backgroundColor: '#FFFDF8' }}
    >
      {/* Text with highlighted phonics words */}
      <div className="flex flex-wrap gap-1 items-center justify-center mb-3">
        {parts.map((part, idx) => {
          const isPhonicsWord = sentence.phonicsWords.some((p) => p.word === part);
          if (isPhonicsWord) {
            const wordData = sentence.phonicsWords.find((p) => p.word === part);
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div className="text-3xl">{wordData?.image}</div>
                <span
                  className="font-bold"
                  style={{ color: '#10b981', fontSize: 'clamp(1rem, 5vw, 1.5rem)' }}
                >
                  {part}
                </span>
              </div>
            );
          }
          return (
            <span
              key={idx}
              style={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)' }}
              className="text-gray-800"
            >
              {part}
            </span>
          );
        })}
      </div>

      {/* Additional context icons */}
      {sentence.phonicsWords.length > 0 && (
        <div className="flex gap-2 justify-center">
          {sentence.phonicsWords.slice(0, 2).map((word) => (
            <span key={word.word} className="text-2xl">
              {word.image}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// PRINTABLE STRIPS COMPONENT
// =====================================================================

function PrintableStrips({
  sentences,
  borderColor,
}: {
  sentences: GeneratedSentence[];
  borderColor: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg space-y-3">
      {sentences.map((sentence, idx) => (
        <div
          key={idx}
          className="border-4 p-4 rounded-lg flex items-center gap-4"
          style={{ borderColor, backgroundColor: '#FFFDF8' }}
        >
          {/* Icon */}
          {sentence.phonicsWords.length > 0 && (
            <div className="text-4xl flex-shrink-0">{sentence.phonicsWords[0].image}</div>
          )}

          {/* Text */}
          <div className="flex-1 font-serif" style={{ fontSize: '1.5rem' }}>
            {sentence.phonicsWords.length > 0 ? (
              <span>
                {sentence.text.split(new RegExp(`(${sentence.phonicsWords.map((p) => p.word).join('|')})`)).map((part, idx) => {
                  const isPhonicsWord = sentence.phonicsWords.some((p) => p.word === part);
                  return (
                    <span
                      key={idx}
                      className={isPhonicsWord ? 'font-bold' : ''}
                      style={{ color: isPhonicsWord ? '#10b981' : '#000' }}
                    >
                      {part}
                    </span>
                  );
                })}
              </span>
            ) : (
              sentence.text
            )}
          </div>

          {/* Number */}
          <div className="flex-shrink-0 text-sm text-gray-500 font-mono">{idx + 1}</div>
        </div>
      ))}
    </div>
  );
}

// =====================================================================
// PRINTABLE WORKSHEET COMPONENT
// =====================================================================

function PrintableWorksheet({
  sentences,
  borderColor,
}: {
  sentences: GeneratedSentence[];
  borderColor: string;
}) {
  // Group sentences into chunks of 5 for worksheets
  const worksheetPages: GeneratedSentence[][] = [];
  for (let i = 0; i < sentences.length; i += 5) {
    worksheetPages.push(sentences.slice(i, i + 5));
  }

  return (
    <>
      {worksheetPages.map((page, pageIdx) => (
        <div key={pageIdx} className="print:page-break-after-always bg-white p-8 mb-8">
          <h2
            className="text-2xl font-bold mb-6 pb-3 border-b-4"
            style={{ borderColor }}
          >
            Reading Practice — Page {pageIdx + 1}
          </h2>

          <div className="space-y-6">
            {page.map((sentence, lineIdx) => (
              <div key={lineIdx} className="flex items-start gap-6 min-h-16">
                {/* Picture area */}
                <div
                  className="w-20 h-20 rounded-lg border-4 flex items-center justify-center text-5xl flex-shrink-0"
                  style={{ borderColor, backgroundColor: '#F5E6D3' }}
                >
                  {sentence.phonicsWords.length > 0
                    ? sentence.phonicsWords[0].image
                    : '📖'}
                </div>

                {/* Text area with line for writing */}
                <div className="flex-1 border-b-2 border-gray-400 pb-2 flex items-center">
                  <p style={{ fontSize: '1.25rem', fontFamily: 'Comic Sans MS' }} className="text-gray-800">
                    {sentence.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-gray-500">
            Name: _________________________ Date: _____________
          </div>
        </div>
      ))}
    </>
  );
}
