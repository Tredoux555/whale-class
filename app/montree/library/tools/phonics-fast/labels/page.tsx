// /montree/library/tools/phonics-fast/labels/page.tsx
// Phonics Fast Label Generator — Generate printable labels for movable alphabet matching
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_PHASES, getPhaseWords, type PhonicsWord, type PhonicsPhase } from '@/lib/montree/phonics/phonics-data';
import { resolvePhotoBankImages } from '@/lib/montree/phonics/photo-bank-resolver';

type LabelSize = 'small' | 'medium' | 'large';

const LABEL_SIZES = {
  small: { columns: 6, labelsPerPage: 36, width: 45, height: 29 },  // 45mm × 29mm, 6 cols × 6 rows
  medium: { columns: 4, labelsPerPage: 16, width: 69, height: 44 }, // 69mm × 44mm, 4 cols × 4 rows
  large: { columns: 3, labelsPerPage: 12, width: 92, height: 59 },  // 92mm × 59mm, 3 cols × 4 rows
};

type BorderWidth = 'thin' | 'medium' | 'thick';

const BORDER_WIDTHS = {
  thin: 1,
  medium: 2,
  thick: 3,
};

export default function LabelsPage() {
  const searchParams = useSearchParams();
  const initialPhase = searchParams.get('phase') || 'initial';

  const [selectedPhase, setSelectedPhase] = useState(initialPhase);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [borderColor, setBorderColor] = useState('#10b981');
  const [borderWidth, setBorderWidth] = useState<BorderWidth>('medium');
  const [fontSize, setFontSize] = useState(18);

  const printRef = useRef<HTMLDivElement>(null);

  // Photo Bank: resolved on mount
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const controller = new AbortController();
    resolvePhotoBankImages(controller.signal).then((map) => {
      if (!controller.signal.aborted) setPhotoMap(map);
    });
    return () => { controller.abort(); };
  }, []);

  const currentPhase = ALL_PHASES.find(p => p.id === selectedPhase);

  // Select all groups by default
  useEffect(() => {
    if (currentPhase) {
      setSelectedGroups(currentPhase.groups.map(g => g.id));
    }
  }, [selectedPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedWords = currentPhase
    ? currentPhase.groups
        .filter(g => selectedGroups.includes(g.id))
        .flatMap(g => g.words)
    : [];

  const sizeConfig = LABEL_SIZES[labelSize];

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const borderPx = BORDER_WIDTHS[borderWidth];

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Labels — ${currentPhase?.name || 'Phonics'}</title>
      <style>
        @page { margin: 5mm; size: A4 portrait; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
          background: white;
          padding: 0;
        }
        .labels-grid {
          display: grid;
          grid-template-columns: repeat(${sizeConfig.columns}, 1fr);
          gap: 0;
          width: 100%;
        }
        .label {
          width: ${sizeConfig.width}mm;
          height: ${sizeConfig.height}mm;
          border: ${borderPx}px solid ${borderColor};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          page-break-inside: avoid;
          padding: 3mm;
          aspect-ratio: ${sizeConfig.width} / ${sizeConfig.height};
        }
        .label-emoji {
          font-size: ${sizeConfig === LABEL_SIZES.small ? '20px' : sizeConfig === LABEL_SIZES.medium ? '32px' : '48px'};
          line-height: 1;
          margin-bottom: 2mm;
        }
        .label-photo {
          width: ${sizeConfig === LABEL_SIZES.small ? '20px' : sizeConfig === LABEL_SIZES.medium ? '36px' : '52px'};
          height: ${sizeConfig === LABEL_SIZES.small ? '20px' : sizeConfig === LABEL_SIZES.medium ? '36px' : '52px'};
          object-fit: cover;
          border-radius: 4px;
          margin-bottom: 2mm;
        }
        .label-word {
          font-size: ${fontSize}px;
          font-weight: bold;
          letter-spacing: 1px;
          text-align: center;
          line-height: 1.1;
          word-break: break-word;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .labels-grid { margin: 0; }
        }
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
          <h1 className="text-2xl font-bold mt-2">🏷️ Label Generator</h1>
          <p className="text-emerald-200 mt-1">Print labels for movable alphabet matching activities</p>
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
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <label className="font-bold text-gray-700 text-sm block mb-3">Print Options</label>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1 uppercase">Label Size</label>
              <select
                value={labelSize}
                onChange={e => setLabelSize(e.target.value as LabelSize)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
              >
                <option value="small">Small (36/page in 6 cols)</option>
                <option value="medium">Medium (16/page in 4 cols)</option>
                <option value="large">Large (12/page in 3 cols)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1 uppercase">Border Color</label>
              <input
                type="color"
                value={borderColor}
                onChange={e => setBorderColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-gray-300"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1 uppercase">Border Width</label>
              <select
                value={borderWidth}
                onChange={e => setBorderWidth(e.target.value as BorderWidth)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
              >
                <option value="thin">Thin</option>
                <option value="medium">Medium</option>
                <option value="thick">Thick</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1 uppercase">Font Size</label>
              <select
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
              >
                <option value={14}>Small (14px)</option>
                <option value={18}>Medium (18px)</option>
                <option value={24}>Large (24px)</option>
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 ml-auto transition-colors"
            >
              🖨️ Print ({selectedWords.length} labels)
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-3 text-sm text-gray-600">
          {selectedWords.length > 0 ? (
            <span>
              Showing {selectedWords.length} labels ({Math.ceil(selectedWords.length / sizeConfig.labelsPerPage)} page{selectedWords.length > sizeConfig.labelsPerPage ? 's' : ''})
            </span>
          ) : (
            <span className="text-gray-400">Select a group to preview labels</span>
          )}
        </div>

        <div
          ref={printRef}
          className="bg-white rounded-lg shadow-sm overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${sizeConfig.columns}, 1fr)`,
            gap: 0,
            borderCollapse: 'collapse',
          }}
        >
          {selectedWords.map((word, idx) => {
            const photoUrl = photoMap.get(word.word.toLowerCase());
            const imgSize = labelSize === 'small' ? '20px' : labelSize === 'medium' ? '36px' : '52px';
            return (
              <div
                key={`${word.word}-${idx}`}
                className="label"
                style={{
                  width: '100%',
                  aspectRatio: `${sizeConfig.width} / ${sizeConfig.height}`,
                  border: `${BORDER_WIDTHS[borderWidth]}px solid ${borderColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  fontFamily: "'Comic Sans MS', cursive",
                  pageBreakInside: 'avoid',
                }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={word.word}
                    className="label-photo"
                    style={{
                      width: imgSize,
                      height: imgSize,
                      objectFit: 'cover',
                      borderRadius: '4px',
                      marginBottom: '6px',
                    }}
                  />
                ) : (
                  <div
                    className="label-emoji"
                    style={{
                      fontSize: labelSize === 'small' ? '20px' : labelSize === 'medium' ? '32px' : '48px',
                      lineHeight: '1',
                      marginBottom: '6px',
                    }}
                  >
                    {word.image}
                  </div>
                )}
                <div
                  className="label-word"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    textAlign: 'center',
                    lineHeight: '1.1',
                    wordBreak: 'break-word',
                  }}
                >
                  {word.word}
                </div>
              </div>
            );
          })}
        </div>

        {selectedWords.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">Select word groups above to see a preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
