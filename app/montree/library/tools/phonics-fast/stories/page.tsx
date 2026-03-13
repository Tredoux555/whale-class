'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SHORT_STORIES,
  ALL_PHASES,
  SIGHT_WORDS,
  type ShortStory,
} from '@/lib/montree/phonics/phonics-data';

type PrintMode = 'book' | 'cards' | 'comprehension';
type FontSize = 'large' | 'xlarge';

// Get phase badge color
const getPhaseColor = (phaseId: string): string => {
  if (phaseId.startsWith('pink')) return '#ec4899'; // pink
  if (phaseId.startsWith('blue')) return '#3b82f6'; // blue
  if (phaseId.startsWith('green')) return '#10b981'; // green
  return '#0d3330'; // default teal
};

const getPhaseColorBg = (phaseId: string): string => {
  if (phaseId.startsWith('pink')) return 'bg-pink-100';
  if (phaseId.startsWith('blue')) return 'bg-blue-100';
  if (phaseId.startsWith('green')) return 'bg-green-100';
  return 'bg-teal-100';
};

export default function PhonicsStoriesPage() {
  const searchParams = useSearchParams();
  const [selectedPhase, setSelectedPhase] = useState(searchParams.get('phase') || 'pink1');
  const [selectedStory, setSelectedStory] = useState<ShortStory | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('book');
  const [fontSize, setFontSize] = useState<FontSize>('large');
  const [borderColor, setBorderColor] = useState('#0d3330');
  const [borderWidth, setBorderWidth] = useState(3);
  const printRef = useRef<HTMLDivElement>(null);

  const availableStories = useMemo(
    () => SHORT_STORIES.filter(s => s.phase === selectedPhase),
    [selectedPhase]
  );

  useEffect(() => {
    setSelectedStory(prev => {
      if (!prev || prev.phase !== selectedPhase) {
        return availableStories[0] || null;
      }
      return prev;
    });
  }, [selectedPhase, availableStories]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${selectedStory?.title || 'Phonics Story'}</title>
          <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Comic+Neue:wght@400;700&display=swap" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            html, body {
              width: 100%;
              height: 100%;
              background: white;
            }

            body {
              font-family: 'Comic Neue', cursive, sans-serif;
              line-height: 1.65;
              color: #333;
            }

            @page {
              size: A4;
              margin: 0;
              padding: 0;
            }

            .print-page {
              width: 210mm;
              height: 297mm;
              display: flex;
              flex-direction: column;
              page-break-after: always;
              position: relative;
              background: white;
            }

            .page-break {
              page-break-before: always;
            }

            h1 {
              font-family: 'Nunito', sans-serif;
              font-weight: 800;
              font-size: 2.5rem;
              color: #0d3330;
            }

            h2 {
              font-family: 'Nunito', sans-serif;
              font-weight: 700;
              font-size: 1.75rem;
              color: #0d3330;
            }

            h3 {
              font-family: 'Nunito', sans-serif;
              font-weight: 700;
              font-size: 1.25rem;
              color: #0d3330;
            }

            strong, .phonics-word {
              font-weight: bold;
              color: #10b981;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .text-center {
              text-align: center;
            }

            .text-left {
              text-align: left;
            }

            /* Book Mode */
            .cover-page {
              min-height: 297mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 3rem 2rem;
              border-width: 1px;
              border-style: solid;
              page-break-after: always;
            }

            .story-page {
              min-height: 297mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              padding: 3rem 2rem;
              border-width: 1px;
              border-style: solid;
              page-break-after: always;
              text-align: center;
            }

            .story-emoji {
              font-size: 5rem;
              margin-bottom: 2rem;
              -webkit-print-color-adjust: exact;
            }

            .story-text {
              font-size: 1.5rem;
              line-height: 1.8;
              margin-bottom: 2rem;
              word-spacing: 0.15em;
            }

            .page-number {
              font-size: 0.9rem;
              color: #999;
              -webkit-print-color-adjust: exact;
            }

            .word-bank-page {
              min-height: 297mm;
              display: flex;
              flex-direction: column;
              padding: 3rem 2rem;
              border-width: 1px;
              border-style: solid;
              page-break-after: always;
              text-align: left;
            }

            .word-bank-section {
              margin-bottom: 2rem;
            }

            .word-bank-title {
              font-size: 1.5rem;
              margin-bottom: 1.5rem;
            }

            .word-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 0.75rem;
            }

            .word-box {
              padding: 0.75rem;
              text-align: center;
              font-weight: bold;
              border: 2px solid;
              border-radius: 0.25rem;
              min-height: 50px;
              display: flex;
              align-items: center;
              justify-content: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            /* Cards Mode */
            .cards-title {
              margin-bottom: 2rem;
              padding: 1.5rem;
              border-width: 1px;
              border-style: solid;
              text-align: center;
            }

            .card-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 1rem;
              margin-bottom: 2rem;
              page-break-inside: avoid;
            }

            .story-card {
              aspect-ratio: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 2px solid;
              border-radius: 0.25rem;
              padding: 1rem;
              text-align: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .card-emoji {
              font-size: 3rem;
              margin-bottom: 0.5rem;
              -webkit-print-color-adjust: exact;
            }

            .card-number {
              font-weight: bold;
              font-size: 0.8rem;
              color: #0d3330;
            }

            .cards-text-section {
              padding-top: 2rem;
              margin-top: 2rem;
              border-top: 2px solid #ddd;
            }

            .card-text-item {
              margin-bottom: 1.5rem;
              padding-bottom: 1.5rem;
              border-bottom: 1px solid #eee;
            }

            .card-text-label {
              font-weight: bold;
              color: #0d3330;
              margin-bottom: 0.5rem;
              font-size: 0.95rem;
            }

            .card-text-content {
              font-size: 1rem;
              line-height: 1.6;
              word-spacing: 0.1em;
            }

            /* Comprehension Mode */
            .comprehension-title {
              margin-bottom: 2rem;
              padding: 1.5rem;
              border-width: 1px;
              border-style: solid;
              text-align: center;
            }

            .comprehension-instruction {
              text-align: center;
              color: #666;
              font-size: 0.95rem;
              margin-top: 0.5rem;
            }

            .comprehension-items {
              margin-bottom: 3rem;
              page-break-inside: avoid;
            }

            .comprehension-item {
              display: flex;
              align-items: center;
              gap: 2rem;
              margin-bottom: 2.5rem;
              -webkit-print-color-adjust: exact;
            }

            .number-blank {
              flex-shrink: 0;
              width: 80px;
              height: 80px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px dashed;
              border-radius: 0.25rem;
              font-size: 2rem;
              color: #999;
              background: #f9f5f0;
              -webkit-print-color-adjust: exact;
            }

            .scene-image {
              flex: 0 0 150px;
              width: 150px;
              height: 150px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid;
              border-radius: 0.25rem;
              font-size: 4rem;
              background: #f9f5f0;
              -webkit-print-color-adjust: exact;
            }

            .reference-section {
              margin-top: 2rem;
              padding-top: 2rem;
              border-top: 3px solid;
            }

            .reference-title {
              font-weight: bold;
              margin-bottom: 1.5rem;
              font-size: 1.1rem;
            }

            .reference-list {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }

            .reference-item {
              font-size: 1rem;
              line-height: 1.6;
              word-spacing: 0.1em;
            }

            .reference-number {
              font-weight: bold;
              color: #0d3330;
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const getPhonicsWords = (story: ShortStory): string[] => {
    return story.words.filter(w => !SIGHT_WORDS.includes(w.toLowerCase()));
  };

  const fontSize_px = fontSize === 'xlarge' ? '24px' : '20px';
  const currentPhase = ALL_PHASES.find(p => p.id === selectedPhase);
  const phaseColor = getPhaseColor(selectedPhase);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-teal-100 p-4 md:p-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-700 text-white rounded-xl shadow-lg mb-8 overflow-hidden">
        <div className="p-6 md:p-8">
          <Link
            href="/montree/library/tools/phonics-fast"
            className="inline-flex items-center gap-2 text-teal-100 hover:text-white mb-4 text-sm font-medium transition-colors"
          >
            ← Back to Phonics Fast Hub
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">📖 Story Book Generator</h1>
              <p className="text-teal-100 text-lg">Create beautiful, print-ready decodable stories for phonics practice</p>
            </div>
            {currentPhase && (
              <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg ${getPhaseColorBg(selectedPhase)}`}>
                <span className="text-sm font-semibold text-teal-900">{currentPhase.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 space-y-5">
          {/* Phase Selector */}
          <div className="bg-white rounded-lg shadow-md border-l-4 border-teal-600 p-5">
            <h2 className="text-xs font-bold uppercase text-teal-900 mb-4 tracking-wider">Reading Level</h2>
            <div className="space-y-2">
              {ALL_PHASES.map(phase => (
                <button
                  key={phase.id}
                  onClick={() => {
                    setSelectedPhase(phase.id);
                    setSelectedStory(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    selectedPhase === phase.id
                      ? 'bg-teal-600 text-white shadow-md transform scale-105'
                      : 'bg-teal-50 text-teal-900 hover:bg-white border border-teal-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{phase.id.includes('pink') ? '🎀' : phase.id.includes('blue') ? '🔵' : '💚'}</span>
                    {phase.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Story Selector */}
          <div className="bg-white rounded-lg shadow-md border-l-4 border-emerald-500 p-5">
            <h2 className="text-xs font-bold uppercase text-teal-900 mb-4 tracking-wider">Choose Story</h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {availableStories.length > 0 ? (
                availableStories.map(story => (
                  <button
                    key={story.id}
                    onClick={() => setSelectedStory(story)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      selectedStory?.id === story.id
                        ? 'bg-emerald-500 text-white shadow-md transform scale-105'
                        : 'bg-emerald-50 text-teal-900 hover:bg-white border border-emerald-200'
                    }`}
                  >
                    {story.title}
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-400 text-sm italic py-4">No stories available</p>
              )}
            </div>
          </div>

          {/* Print Mode */}
          <div className="bg-white rounded-lg shadow-md border-l-4 border-indigo-500 p-5">
            <h2 className="text-xs font-bold uppercase text-teal-900 mb-4 tracking-wider">Print Format</h2>
            <div className="space-y-3">
              {[
                { mode: 'book', label: '📖 Story Book', desc: 'Cover + pages + word bank' },
                { mode: 'cards', label: '📇 Story Cards', desc: 'Grid cards with text' },
                { mode: 'comprehension', label: '🎨 Comprehension', desc: 'Ordering exercise' },
              ].map(({ mode, label, desc }) => (
                <label key={mode} className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="printMode"
                    value={mode}
                    checked={printMode === mode}
                    onChange={() => setPrintMode(mode as PrintMode)}
                    className="w-5 h-5 mt-0.5 accent-indigo-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-teal-900">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Print Settings */}
          <div className="bg-white rounded-lg shadow-md border-l-4 border-purple-500 p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase text-teal-900 tracking-wider">Print Settings</h2>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Text Size</label>
              <div className="flex gap-2">
                {[
                  { size: 'large', label: 'Large' },
                  { size: 'xlarge', label: 'Extra Large' },
                ].map(({ size, label }) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size as FontSize)}
                    className={`flex-1 px-3 py-2 rounded text-xs font-semibold transition-all ${
                      fontSize === size
                        ? 'bg-purple-500 text-white shadow'
                        : 'bg-purple-50 text-purple-900 hover:bg-white border border-purple-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-3">Border Color</label>
              <div className="flex gap-3">
                {[
                  { color: '#0d3330', name: 'Teal', icon: '🔷' },
                  { color: '#10b981', name: 'Emerald', icon: '💚' },
                  { color: '#3b82f6', name: 'Blue', icon: '🔵' },
                  { color: '#ec4899', name: 'Pink', icon: '🎀' },
                ].map(({ color, name, icon }) => (
                  <button
                    key={color}
                    onClick={() => setBorderColor(color)}
                    title={name}
                    className={`w-10 h-10 rounded-lg border-3 transition-all flex items-center justify-center text-lg ${
                      borderColor === color
                        ? 'ring-4 ring-offset-2 ring-gray-300 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {borderColor === color && '✓'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Border Width: <span className="text-purple-600">{borderWidth}px</span>
              </label>
              <input
                type="range"
                min="1"
                max="6"
                value={borderWidth}
                onChange={e => setBorderWidth(parseInt(e.target.value))}
                className="w-full cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Thin</span>
                <span>Bold</span>
              </div>
            </div>

            {selectedStory && (
              <button
                onClick={handlePrint}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 duration-200"
              >
                🖨️ Print Now
              </button>
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-3">
          {selectedStory ? (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Preview Header */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-50 p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">{selectedStory.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {printMode === 'book' && `Cover + ${selectedStory.pages.length} story pages + word bank`}
                  {printMode === 'cards' && `${selectedStory.pages.length} story cards with text`}
                  {printMode === 'comprehension' && `Ordering exercise with ${selectedStory.pages.length} scenes`}
                </p>
              </div>

              {/* Preview Content */}
              <div
                ref={printRef}
                className="p-8 bg-white"
                style={{ fontFamily: '"Comic Neue", cursive, sans-serif', minHeight: '600px' }}
              >
                {printMode === 'book' && (
                  <div className="space-y-8">
                    {/* Cover */}
                    <div
                      className="flex flex-col items-center justify-center text-center p-12 rounded-lg"
                      style={{
                        border: `${borderWidth}px solid ${borderColor}`,
                        backgroundColor: '#f9f5f0',
                        minHeight: '400px',
                        WebkitPrintColorAdjust: 'exact',
                      }}
                    >
                      <div style={{ fontSize: '5rem' }}>{selectedStory.pages[0]?.sceneEmoji}</div>
                      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0d3330', marginTop: '1.5rem' }}>
                        {selectedStory.title}
                      </h1>
                      <p style={{ color: '#666', fontStyle: 'italic', marginTop: '1rem' }}>A Phonics Story</p>
                    </div>

                    {/* Story Pages */}
                    {selectedStory.pages.map((page, idx) => (
                      <div key={idx} style={{ pageBreakAfter: 'always' }}>
                        <div
                          className="flex flex-col items-center justify-between text-center p-8 rounded-lg"
                          style={{
                            border: `${borderWidth}px solid ${borderColor}`,
                            fontSize: fontSize_px,
                            minHeight: '400px',
                            WebkitPrintColorAdjust: 'exact',
                          }}
                        >
                          <div style={{ fontSize: '4rem' }}>{page.sceneEmoji}</div>

                          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                            {page.text.split(' ').map((word, widx) => {
                              const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
                              const isPhonics = selectedStory.words.includes(cleanWord);
                              return (
                                <span key={widx} style={{ marginRight: '0.5rem' }}>
                                  {isPhonics ? (
                                    <span style={{ fontWeight: 'bold', color: '#10b981', WebkitPrintColorAdjust: 'exact' }}>
                                      {word}
                                    </span>
                                  ) : (
                                    word
                                  )}
                                </span>
                              );
                            })}
                          </div>

                          <p style={{ color: '#999', fontSize: '0.85rem', WebkitPrintColorAdjust: 'exact' }}>
                            Page {idx + 1}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Word Bank */}
                    <div style={{ pageBreakAfter: 'always' }}>
                      <div
                        className="p-8 rounded-lg"
                        style={{
                          border: `${borderWidth}px solid ${borderColor}`,
                          minHeight: '400px',
                          WebkitPrintColorAdjust: 'exact',
                        }}
                      >
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0d3330', marginBottom: '1.5rem' }}>
                          Word Bank
                        </h2>

                        <div style={{ marginBottom: '2rem' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981', marginBottom: '1rem', WebkitPrintColorAdjust: 'exact' }}>
                            Phonics Words
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            {getPhonicsWords(selectedStory).map((word, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '0.75rem',
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  border: '2px solid #10b981',
                                  borderRadius: '0.25rem',
                                  backgroundColor: '#e0f7f4',
                                  WebkitPrintColorAdjust: 'exact',
                                }}
                              >
                                {word}
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedStory.sightWords.length > 0 && (
                          <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#6366f1', marginBottom: '1rem', WebkitPrintColorAdjust: 'exact' }}>
                              Sight Words
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                              {selectedStory.sightWords.map((word, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    border: '2px solid #6366f1',
                                    borderRadius: '0.25rem',
                                    backgroundColor: '#eef2ff',
                                    WebkitPrintColorAdjust: 'exact',
                                  }}
                                >
                                  {word}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {printMode === 'cards' && (
                  <div>
                    <div
                      style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        textAlign: 'center',
                        border: `${borderWidth}px solid ${borderColor}`,
                        borderRadius: '0.5rem',
                        WebkitPrintColorAdjust: 'exact',
                      }}
                    >
                      <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0d3330' }}>
                        {selectedStory.title}
                      </h2>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '1rem',
                        marginBottom: '2rem',
                        pageBreakInside: 'avoid',
                      }}
                    >
                      {selectedStory.pages.map((page, idx) => (
                        <div
                          key={idx}
                          style={{
                            aspectRatio: '1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                            border: `${borderWidth}px solid ${borderColor}`,
                            borderRadius: '0.25rem',
                            textAlign: 'center',
                            backgroundColor: '#f9f5f0',
                            WebkitPrintColorAdjust: 'exact',
                          }}
                        >
                          <div style={{ fontSize: '2.5rem' }}>{page.sceneEmoji}</div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0d3330', marginTop: '0.5rem' }}>
                            {idx + 1}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
                      {selectedStory.pages.map((page, idx) => (
                        <div key={idx} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #eee' }}>
                          <p style={{ fontWeight: 'bold', color: '#0d3330', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                            Page {idx + 1}:
                          </p>
                          <p style={{ fontSize: fontSize_px }}>
                            {page.text.split(' ').map((word, widx) => {
                              const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
                              const isPhonics = selectedStory.words.includes(cleanWord);
                              return (
                                <span key={widx} style={{ marginRight: '0.5rem' }}>
                                  {isPhonics ? (
                                    <span style={{ fontWeight: 'bold', color: '#10b981', WebkitPrintColorAdjust: 'exact' }}>
                                      {word}
                                    </span>
                                  ) : (
                                    word
                                  )}
                                </span>
                              );
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {printMode === 'comprehension' && (
                  <div>
                    <div
                      style={{
                        marginBottom: '2rem',
                        padding: '1.5rem',
                        textAlign: 'center',
                        border: `${borderWidth}px solid ${borderColor}`,
                        borderRadius: '0.5rem',
                        WebkitPrintColorAdjust: 'exact',
                      }}
                    >
                      <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0d3330', marginBottom: '0.5rem' }}>
                        {selectedStory.title}
                      </h2>
                      <p style={{ color: '#666', fontSize: '0.95rem' }}>
                        Put the pictures in order. Write the numbers 1, 2, 3, 4.
                      </p>
                    </div>

                    <div style={{ marginBottom: '3rem' }}>
                      {selectedStory.pages.map((page, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                          <div
                            style={{
                              width: '80px',
                              height: '80px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: `${borderWidth}px dashed ${borderColor}`,
                              borderRadius: '0.25rem',
                              fontSize: '2rem',
                              color: '#999',
                              backgroundColor: '#f9f5f0',
                              flexShrink: 0,
                              WebkitPrintColorAdjust: 'exact',
                            }}
                          >
                            ___
                          </div>

                          <div
                            style={{
                              flex: 1,
                              minHeight: '150px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: `${borderWidth}px solid ${borderColor}`,
                              borderRadius: '0.25rem',
                              fontSize: '4rem',
                              backgroundColor: '#f9f5f0',
                              WebkitPrintColorAdjust: 'exact',
                            }}
                          >
                            {page.sceneEmoji}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: '2rem',
                        paddingTop: '1.5rem',
                        borderTop: `3px solid ${borderColor}`,
                        WebkitPrintColorAdjust: 'exact',
                      }}
                    >
                      <h3 style={{ fontWeight: 'bold', marginBottom: '1rem', fontSize: '1.1rem', color: '#0d3330' }}>
                        Read the sentences:
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {selectedStory.pages.map((page, idx) => (
                          <p key={idx} style={{ fontSize: fontSize_px, color: '#0d3330' }}>
                            <span style={{ fontWeight: 'bold' }}>{idx + 1}.</span> {page.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-5xl mb-4">📖</div>
              <p className="text-gray-500 text-lg font-medium">Select a story to preview</p>
              <p className="text-gray-400 text-sm mt-2">Choose a reading level and story from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
