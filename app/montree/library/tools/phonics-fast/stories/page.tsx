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

interface BorderStyle {
  color: string;
  width: number;
}

export default function PhonicsStoriesPage() {
  const searchParams = useSearchParams();
  const [selectedPhase, setSelectedPhase] = useState(searchParams.get('phase') || 'pink1');
  const [selectedStory, setSelectedStory] = useState<ShortStory | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('book');
  const [fontSize, setFontSize] = useState<FontSize>('large');
  const [borderColor, setBorderColor] = useState('#0d3330'); // dark teal
  const [borderWidth, setBorderWidth] = useState(3);
  const printRef = useRef<HTMLDivElement>(null);

  // Filter stories by selected phase (memoized to prevent infinite useEffect loop)
  const availableStories = useMemo(
    () => SHORT_STORIES.filter(s => s.phase === selectedPhase),
    [selectedPhase]
  );

  // Auto-select first story of new phase
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
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Comic Sans MS', cursive, sans-serif; line-height: 1.6; background: white; padding: 20px; }
            strong, .font-bold { font-weight: bold; }
            .text-center { text-align: center; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mt-2 { margin-top: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .p-8 { padding: 2rem; }
            .grid { display: grid; gap: 1rem; }
            .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
            .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
            .rounded { border-radius: 0.5rem; }
            .min-h-\\[600px\\] { min-height: 600px; }
            @media print {
              .page-break { page-break-before: always; }
              body { padding: 0; }
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

  // Extract phonics words from story (excluding sight words)
  const getPhonicsWords = (story: ShortStory): string[] => {
    return story.words.filter(w => !SIGHT_WORDS.includes(w.toLowerCase()));
  };

  const fontSizeClass = fontSize === 'xlarge' ? 'text-2xl' : 'text-xl';
  const fontSize_px = fontSize === 'xlarge' ? '24px' : '20px';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8E7] to-[#F5E6D3] p-4 md:p-8">
      {/* Header */}
      <div className="bg-[#0D3330] text-white rounded-lg shadow-lg mb-8">
        <div className="p-6">
          <Link
            href="/montree/library/tools/phonics-fast"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm"
          >
            ← Back to Phonics Fast
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">📖 Short Story Generator</h1>
          <p className="text-[#F5E6D3] mt-2">
            Decodable stories for phonics practice with comprehension sequences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Controls Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Phase Selector */}
          <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-[#0D3330]">
            <h2 className="text-sm font-bold text-[#0D3330] mb-3">PHASE</h2>
            <div className="space-y-2">
              {ALL_PHASES.map(phase => (
                <button
                  key={phase.id}
                  onClick={() => {
                    setSelectedPhase(phase.id);
                    setSelectedStory(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-all ${
                    selectedPhase === phase.id
                      ? 'bg-[#0D3330] text-white shadow'
                      : 'bg-[#F5E6D3] text-[#0D3330] hover:bg-white'
                  }`}
                >
                  {phase.name}
                </button>
              ))}
            </div>
          </div>

          {/* Story Selector */}
          <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-[#10b981]">
            <h2 className="text-sm font-bold text-[#0D3330] mb-3">STORY</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableStories.length > 0 ? (
                availableStories.map(story => (
                  <button
                    key={story.id}
                    onClick={() => setSelectedStory(story)}
                    className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-all ${
                      selectedStory?.id === story.id
                        ? 'bg-[#10b981] text-white shadow'
                        : 'bg-[#F5E6D3] text-[#0D3330] hover:bg-white'
                    }`}
                  >
                    {story.title}
                  </button>
                ))
              ) : (
                <p className="text-[#666] text-sm italic">No stories for this phase</p>
              )}
            </div>
          </div>

          {/* Print Mode Selector */}
          <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-[#6366f1]">
            <h2 className="text-sm font-bold text-[#0D3330] mb-3">PRINT MODE</h2>
            <div className="space-y-2">
              {[
                { mode: 'book', label: '📖 Story Book' },
                { mode: 'cards', label: '📇 Story Cards' },
                { mode: 'comprehension', label: '🎨 Comprehension Check' },
              ].map(({ mode, label }) => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="printMode"
                    value={mode}
                    checked={printMode === mode}
                    onChange={() => setPrintMode(mode as PrintMode)}
                    className="w-4 h-4 accent-[#6366f1]"
                  />
                  <span className="text-sm font-medium text-[#0D3330]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Print Options */}
          <div className="bg-white rounded-lg p-4 shadow-md border-l-4 border-[#8b5cf6]">
            <h2 className="text-sm font-bold text-[#0D3330] mb-3">PRINT OPTIONS</h2>

            {/* Font Size */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#666] mb-2">Font Size</label>
              <div className="flex gap-2">
                {[
                  { size: 'large', label: 'Large' },
                  { size: 'xlarge', label: 'XL' },
                ].map(({ size, label }) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size as FontSize)}
                    className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                      fontSize === size
                        ? 'bg-[#8b5cf6] text-white'
                        : 'bg-[#F5E6D3] text-[#0D3330] hover:bg-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Border Color */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#666] mb-2">Border Color</label>
              <div className="flex gap-2">
                {[
                  { color: '#0d3330', name: 'Teal' },
                  { color: '#10b981', name: 'Green' },
                  { color: '#6366f1', name: 'Blue' },
                  { color: '#ec4899', name: 'Pink' },
                ].map(({ color, name }) => (
                  <button
                    key={color}
                    onClick={() => setBorderColor(color)}
                    title={name}
                    className={`w-8 h-8 rounded border-2 transition-all ${
                      borderColor === color ? 'ring-2 ring-offset-1 ring-[#666]' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Border Width */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#666] mb-2">
                Border Width: {borderWidth}px
              </label>
              <input
                type="range"
                min="1"
                max="6"
                value={borderWidth}
                onChange={e => setBorderWidth(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Print Button */}
            {selectedStory && (
              <button
                onClick={handlePrint}
                className="w-full bg-[#0D3330] hover:bg-[#1a4a47] text-white font-bold py-2 px-4 rounded transition-all"
              >
                🖨️ Print
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {selectedStory ? (
            <div
              ref={printRef}
              className="bg-white rounded-lg shadow-lg p-8"
              style={{ fontFamily: '"Comic Sans MS", cursive' }}
            >
              {printMode === 'book' && (
                <div className="space-y-12 print:page-break-after-always">
                  {/* Cover Page */}
                  <div
                    className="min-h-[600px] flex flex-col items-center justify-center text-center p-8 rounded"
                    style={{
                      border: `${borderWidth}px solid ${borderColor}`,
                      backgroundColor: '#f9f5f0',
                    }}
                  >
                    <div className="text-6xl mb-6">{selectedStory.pages[0]?.sceneEmoji}</div>
                    <h1 className="text-4xl font-bold text-[#0D3330] mb-4">{selectedStory.title}</h1>
                    <p className="text-[#666] italic">A Phonics Story</p>
                  </div>

                  {/* Story Pages */}
                  {selectedStory.pages.map((page, idx) => (
                    <div
                      key={idx}
                      className="min-h-[600px] flex flex-col items-center justify-between p-8 rounded break-inside-avoid"
                      style={{
                        border: `${borderWidth}px solid ${borderColor}`,
                        fontSize: fontSize_px,
                      }}
                    >
                      {/* Scene Emoji */}
                      <div className="text-7xl mb-8">{page.sceneEmoji}</div>

                      {/* Story Text with Phonics Highlighting */}
                      <div className="text-center mb-8">
                        {page.text.split(' ').map((word, idx) => {
                          const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
                          const isPhonice = selectedStory.words.includes(cleanWord);
                          return (
                            <span key={idx} className="mr-2">
                              {isPhonice ? (
                                <span className="font-bold text-[#10b981]">{word}</span>
                              ) : (
                                word
                              )}
                            </span>
                          );
                        })}
                      </div>

                      {/* Page Number */}
                      <p className="text-[#999] text-sm">Page {idx + 1}</p>
                    </div>
                  ))}

                  {/* Word Bank Page */}
                  <div
                    className="min-h-[600px] p-8 rounded flex flex-col justify-start"
                    style={{
                      border: `${borderWidth}px solid ${borderColor}`,
                      fontSize: fontSize_px,
                    }}
                  >
                    <h2 className="text-3xl font-bold text-[#0D3330] mb-6">Word Bank</h2>

                    {/* Phonics Words */}
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-[#10b981] mb-4">Phonics Words</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {getPhonicsWords(selectedStory).map((word, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded"
                            style={{
                              backgroundColor: '#e0f7f4',
                              border: `2px solid #10b981`,
                              textAlign: 'center',
                              fontWeight: 'bold',
                            }}
                          >
                            {word}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sight Words */}
                    {selectedStory.sightWords.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-[#6366f1] mb-4">Sight Words</h3>
                        <div className="grid grid-cols-4 gap-4">
                          {selectedStory.sightWords.map((word, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded"
                              style={{
                                backgroundColor: '#eef2ff',
                                border: `2px solid #6366f1`,
                                textAlign: 'center',
                                fontWeight: 'bold',
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
              )}

              {printMode === 'cards' && (
                <div>
                  {/* Title */}
                  <div className="mb-8 p-6 rounded" style={{ border: `${borderWidth}px solid ${borderColor}` }}>
                    <h2 className="text-3xl font-bold text-[#0D3330] text-center">{selectedStory.title}</h2>
                  </div>

                  {/* Story Cards Strip */}
                  <div
                    className="grid grid-cols-4 gap-4"
                    style={{ fontSize: fontSize_px, pageBreakInside: 'avoid' }}
                  >
                    {selectedStory.pages.map((page, idx) => (
                      <div
                        key={idx}
                        className="aspect-square flex flex-col items-center justify-center p-4 rounded text-center"
                        style={{
                          border: `${borderWidth}px solid ${borderColor}`,
                          backgroundColor: '#f9f5f0',
                        }}
                      >
                        <div className="text-4xl mb-2">{page.sceneEmoji}</div>
                        <p className="text-xs font-bold text-[#0D3330]">{idx + 1}</p>
                      </div>
                    ))}
                  </div>

                  {/* Text Below Cards */}
                  <div className="mt-8 p-6 space-y-4" style={{ fontSize: fontSize_px }}>
                    {selectedStory.pages.map((page, idx) => (
                      <div key={idx} className="mb-6 pb-6 border-b border-[#ddd]">
                        <p className="font-bold text-[#0D3330] mb-2">Page {idx + 1}:</p>
                        <p>
                          {page.text.split(' ').map((word, widx) => {
                            const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
                            const isPhonice = selectedStory.words.includes(cleanWord);
                            return (
                              <span key={widx} className="mr-2">
                                {isPhonice ? (
                                  <span className="font-bold text-[#10b981]">{word}</span>
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
                  {/* Title */}
                  <div className="mb-8 p-6 rounded" style={{ border: `${borderWidth}px solid ${borderColor}` }}>
                    <h2 className="text-3xl font-bold text-[#0D3330] text-center mb-2">
                      {selectedStory.title}
                    </h2>
                    <p className="text-center text-[#666] text-sm">
                      Put the pictures in order. Write the numbers 1, 2, 3, 4.
                    </p>
                  </div>

                  {/* Picture Boxes for Ordering */}
                  <div className="space-y-8">
                    {selectedStory.pages.map((page, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-6"
                        style={{ fontSize: fontSize_px }}
                      >
                        {/* Number Box */}
                        <div
                          className="w-20 h-20 flex items-center justify-center rounded text-3xl font-bold text-[#999]"
                          style={{
                            border: `${borderWidth}px dashed ${borderColor}`,
                            backgroundColor: '#f9f5f0',
                          }}
                        >
                          ___
                        </div>

                        {/* Scene Box */}
                        <div
                          className="flex-1 min-h-32 flex items-center justify-center rounded text-6xl"
                          style={{
                            border: `${borderWidth}px solid ${borderColor}`,
                            backgroundColor: '#f9f5f0',
                          }}
                        >
                          {page.sceneEmoji}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Story Sentences Below for Reference */}
                  <div className="mt-12 pt-8 border-t-4" style={{ borderColor }}>
                    <h3 className="text-lg font-bold text-[#0D3330] mb-6">Read the sentences:</h3>
                    <div className="space-y-3">
                      {selectedStory.pages.map((page, idx) => (
                        <p key={idx} style={{ fontSize: fontSize_px }} className="text-[#0D3330]">
                          {idx + 1}. {page.text}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-[#999] text-lg">Select a story to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
