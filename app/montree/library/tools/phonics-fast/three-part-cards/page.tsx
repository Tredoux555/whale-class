// /montree/library/tools/phonics-fast/three-part-cards/page.tsx
// Auto 3-Part Card Generator — Generates Montessori nomenclature cards from phonics word lists
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_PHASES, getPhaseWords, type PhonicsWord, type PhonicsPhase } from '@/lib/montree/phonics/phonics-data';

type PrintMode = 'full' | 'picture-only' | 'label-only';

export default function ThreePartCardsPage() {
  const searchParams = useSearchParams();
  const initialPhase = searchParams.get('phase') || 'initial';
  const [selectedPhase, setSelectedPhase] = useState(initialPhase);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<PrintMode>('full');
  const [borderColor, setBorderColor] = useState('#10b981');
  const [borderWidth, setBorderWidth] = useState(2);
  const [fontSize, setFontSize] = useState(24);
  const [showMiniature, setShowMiniature] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const currentPhase = ALL_PHASES.find(p => p.id === selectedPhase);

  // Select all groups by default
  useEffect(() => {
    if (currentPhase) {
      setSelectedGroups(currentPhase.groups.map(g => g.id));
    }
  }, [selectedPhase]);

  const selectedWords = currentPhase
    ? currentPhase.groups
        .filter(g => selectedGroups.includes(g.id))
        .flatMap(g => g.words)
    : [];

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>3-Part Cards — ${currentPhase?.name || 'Phonics'}</title>
      <style>
        @page { margin: 10mm; size: A4 portrait; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; }
        .card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
        .card {
          width: 90mm; height: 90mm;
          border: ${borderWidth}px solid ${borderColor};
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          page-break-inside: avoid;
          padding: 8mm;
        }
        .card-emoji { font-size: 48px; margin-bottom: 8px; }
        .card-word {
          font-size: ${fontSize}px; font-weight: bold;
          font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
          letter-spacing: 2px;
        }
        .card-miniature { font-size: 10px; color: #999; margin-top: 4px; }
        .label-card { height: 30mm; }
        .picture-card .card-emoji { font-size: 64px; }
        @media print { .no-print { display: none; } }
      </style>
    </head><body>`);
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Link href="/montree/library/tools/phonics-fast" className="text-emerald-300 text-sm hover:underline">
            ← Phonics Fast
          </Link>
          <h1 className="text-2xl font-bold mt-2">🃏 Auto 3-Part Cards</h1>
          <p className="text-emerald-200 mt-1">Generate Montessori nomenclature cards from phonics word lists</p>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Phase selector */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <label className="font-bold text-gray-700 text-sm block mb-2">Phase</label>
          <div className="flex flex-wrap gap-2">
            {ALL_PHASES.map(phase => (
              <button
                key={phase.id}
                onClick={() => setSelectedPhase(phase.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  selectedPhase === phase.id
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedPhase === phase.id ? { backgroundColor: phase.color } : undefined}
              >
                {phase.name} ({phase.groups.flatMap(g => g.words).length})
              </button>
            ))}
          </div>
        </div>

        {/* Group selector */}
        {currentPhase && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <label className="font-bold text-gray-700 text-sm block mb-2">Word Groups</label>
            <div className="flex flex-wrap gap-2">
              {currentPhase.groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => {
                    setSelectedGroups(prev =>
                      prev.includes(group.id)
                        ? prev.filter(id => id !== group.id)
                        : [...prev, group.id]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedGroups.includes(group.id)
                      ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                  }`}
                >
                  {group.label} ({group.words.length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Print options */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
          <div>
            <label className="font-bold text-gray-700 text-sm block mb-1">Print Mode</label>
            <select
              value={printMode}
              onChange={e => setPrintMode(e.target.value as PrintMode)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="full">Full Cards (Picture + Word)</option>
              <option value="picture-only">Picture Only</option>
              <option value="label-only">Label Only</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-gray-700 text-sm block mb-1">Border</label>
            <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
          </div>
          <div>
            <label className="font-bold text-gray-700 text-sm block mb-1">Border Width</label>
            <select value={borderWidth} onChange={e => setBorderWidth(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
              <option value={1}>Thin</option>
              <option value={2}>Medium</option>
              <option value={3}>Thick</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-gray-700 text-sm block mb-1">Font Size</label>
            <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
              <option value={18}>Small</option>
              <option value={24}>Medium</option>
              <option value={32}>Large</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showMiniature} onChange={e => setShowMiniature(e.target.checked)} />
            Show miniature note
          </label>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 ml-auto"
          >
            🖨️ Print ({selectedWords.length} cards)
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div ref={printRef}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
            {selectedWords.map((word, idx) => (
              <div
                key={`${word.word}-${idx}`}
                style={{
                  width: '100%',
                  aspectRatio: printMode === 'label-only' ? '3/1' : '1/1',
                  border: `${borderWidth}px solid ${borderColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  fontFamily: "'Comic Sans MS', cursive",
                  pageBreakInside: 'avoid',
                }}
              >
                {printMode !== 'label-only' && (
                  <div style={{ fontSize: printMode === 'picture-only' ? '64px' : '48px', marginBottom: '8px' }}>
                    {word.image}
                  </div>
                )}
                {printMode !== 'picture-only' && (
                  <div style={{ fontSize: `${fontSize}px`, fontWeight: 'bold', letterSpacing: '2px' }}>
                    {word.word}
                  </div>
                )}
                {showMiniature && word.isNoun && (
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                    {word.miniature}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
