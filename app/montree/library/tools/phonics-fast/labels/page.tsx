// /montree/library/tools/phonics-fast/labels/page.tsx
// Phonics Fast Label Generator — Professional A4 print-ready label generator
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_PHASES, getPhaseWords, type PhonicsWord, type PhonicsPhase } from '@/lib/montree/phonics/phonics-data';
import { resolvePhotoBankImages } from '@/lib/montree/phonics/photo-bank-resolver';
import { escapeHtml } from '@/lib/sanitize';

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
  const initialPhase = searchParams.get('phase') || 'pink1';

  const [selectedPhase, setSelectedPhase] = useState(initialPhase);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [borderColor, setBorderColor] = useState('#10b981');
  const [borderColorHex, setBorderColorHex] = useState('#10b981');
  const [borderWidth, setBorderWidth] = useState<BorderWidth>('medium');
  const [cornerRadius, setCornerRadius] = useState<'none' | 'slight' | 'medium'>('slight');
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
  const cornerRadiusValue = cornerRadius === 'none' ? '0' : cornerRadius === 'slight' ? '2px' : '4px';

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setBorderColor(color);
    setBorderColorHex(color);
  };

  const handlePrint = () => {
    if (selectedWords.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const borderPx = BORDER_WIDTHS[borderWidth];
    const phaseColor = currentPhase?.color || '#10b981';
    const phaseName = currentPhase?.name || 'Phonics';

    // Calculate image sizes based on label size
    const imageSizes = {
      small: { emoji: '18px', photo: '20px' },
      medium: { emoji: '28px', photo: '32px' },
      large: { emoji: '42px', photo: '48px' },
    };
    const imgSize = imageSizes[labelSize];

    // Paginate labels
    const pages: typeof selectedWords[][] = [];
    for (let i = 0; i < selectedWords.length; i += sizeConfig.labelsPerPage) {
      pages.push(selectedWords.slice(i, i + sizeConfig.labelsPerPage));
    }

    // Generate page HTML from data
    const pageHTML = pages
      .map((pageWords, pageIndex) => {
        // Page header
        const headerHTML = `
        <div class="page-header">
          <div class="page-title">${escapeHtml(phaseName)} — Label Set</div>
          <div class="page-number">Page ${pageIndex + 1}</div>
        </div>`;

        // Labels grid for this page
        const gridHTML = `
        <div class="labels-grid">
          ${pageWords
            .map((word) => {
              const photoUrl = photoMap.get(word.word.toLowerCase());
              const labelHTML = photoUrl
                ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(word.word)}" class="label-photo" />`
                : `<div class="label-image">${word.image}</div>`;

              return `
            <div class="label">
              ${labelHTML}
              <div class="label-word">${escapeHtml(word.word)}</div>
            </div>`;
            })
            .join('')}
        </div>`;

        // Page break (not on last page)
        const pageBreakHTML = pageIndex < pages.length - 1 ? '<div class="page-break"></div>' : '';

        return headerHTML + gridHTML + pageBreakHTML;
      })
      .join('');

    const printHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Label Generator — ${escapeHtml(phaseName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Comic+Sans+MS:wght@400;700&family=Nunito:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 5mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
      background: white;
      color: #000;
      line-height: 1.2;
    }
    .page-header {
      font-family: 'Nunito', 'Segoe UI', sans-serif;
      margin: 0 0 8mm 0;
      padding: 5mm 0;
      border-bottom: 2px solid ${phaseColor};
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .page-title {
      font-family: 'Nunito', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: ${phaseColor};
      letter-spacing: 0.5px;
    }
    .page-number {
      font-family: 'Nunito', sans-serif;
      font-size: 11px;
      color: #999;
      font-weight: 400;
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
      aspect-ratio: ${sizeConfig.width} / ${sizeConfig.height};
      border: ${borderPx}px solid ${borderColor};
      border-radius: ${cornerRadiusValue};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      page-break-inside: avoid;
      padding: 3mm;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label-image {
      font-size: ${imgSize.emoji};
      line-height: 1;
      margin-bottom: 2mm;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: ${imgSize.emoji};
    }
    .label-photo {
      width: ${imgSize.photo};
      height: ${imgSize.photo};
      object-fit: cover;
      border-radius: 2px;
      margin-bottom: 2mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label-word {
      font-size: ${fontSize}px;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-align: center;
      line-height: 1.1;
      word-break: break-word;
      font-family: 'Comic Sans MS', cursive;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-break {
      page-break-after: always;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: white;
      }
      .page-header {
        margin: 0 0 8mm 0;
      }
      .labels-grid {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  ${pageHTML}
</body>
</html>`;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header with Gradient */}
      <header className="bg-gradient-to-r from-teal-800 to-teal-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link
            href="/montree/library/tools/phonics-fast"
            className="inline-flex items-center text-teal-100 text-sm font-medium hover:text-white transition-colors mb-3"
          >
            <span className="mr-2">←</span> Back to Phonics Fast
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">🏷️ Label Generator</h1>
              <p className="text-teal-100 mt-2">Print professional, customizable labels for Montessori movable alphabet activities</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Phase Selector */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
              <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-3 flex items-center">
                <span className="text-lg mr-2">📚</span> Phase
              </h2>
              <div className="flex flex-col gap-2">
                {ALL_PHASES.map(phase => (
                  <button
                    key={phase.id}
                    onClick={() => setSelectedPhase(phase.id)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      selectedPhase === phase.id
                        ? 'text-white shadow-md scale-105 ring-2 ring-offset-2'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                    style={selectedPhase === phase.id ? {
                      backgroundColor: phase.color,
                      ringColor: phase.color + '33'
                    } : undefined}
                  >
                    <span className="block text-left">
                      <span className="font-bold">{phase.name}</span>
                      <span className="text-xs opacity-90 block">{phase.groups.flatMap(g => g.words).length} words</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Group Selector */}
            {currentPhase && (
              <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
                <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-3 flex items-center">
                  <span className="text-lg mr-2">🔤</span> Word Groups
                </h2>
                <div className="space-y-2">
                  {currentPhase.groups.map(group => (
                    <label key={group.id} className="flex items-center p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-2"
                      style={{
                        borderColor: selectedGroups.includes(group.id) ? currentPhase.color : '#e5e7eb',
                        backgroundColor: selectedGroups.includes(group.id) ? currentPhase.color + '08' : 'transparent'
                      }}>
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => {
                          setSelectedGroups(prev =>
                            prev.includes(group.id)
                              ? prev.filter(id => id !== group.id)
                              : [...prev, group.id]
                          );
                        }}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <span className="ml-2 flex-1">
                        <span className="font-medium text-gray-800">{group.label}</span>
                        <span className="text-xs text-gray-500 block">{group.words.length} words</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Print Options */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
              <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center">
                <span className="text-lg mr-2">⚙️</span> Options
              </h2>
              <div className="space-y-4">
                {/* Label Size */}
                <div>
                  <label className="font-semibold text-gray-700 text-xs block mb-2 uppercase">Size</label>
                  <select
                    value={labelSize}
                    onChange={e => setLabelSize(e.target.value as LabelSize)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="small">Small (36 per page)</option>
                    <option value="medium">Medium (16 per page)</option>
                    <option value="large">Large (12 per page)</option>
                  </select>
                </div>

                {/* Border Color */}
                <div>
                  <label className="font-semibold text-gray-700 text-xs block mb-2 uppercase">Border Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={borderColorHex}
                      onChange={handleColorChange}
                      className="w-12 h-10 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <input
                      type="text"
                      value={borderColorHex}
                      onChange={e => {
                        setBorderColorHex(e.target.value);
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                          setBorderColor(e.target.value);
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="#10b981"
                    />
                  </div>
                </div>

                {/* Border Width */}
                <div>
                  <label className="font-semibold text-gray-700 text-xs block mb-2 uppercase">Border Width</label>
                  <select
                    value={borderWidth}
                    onChange={e => setBorderWidth(e.target.value as BorderWidth)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="thin">Thin (1px)</option>
                    <option value="medium">Medium (2px)</option>
                    <option value="thick">Thick (3px)</option>
                  </select>
                </div>

                {/* Corner Radius */}
                <div>
                  <label className="font-semibold text-gray-700 text-xs block mb-2 uppercase">Corners</label>
                  <select
                    value={cornerRadius}
                    onChange={e => setCornerRadius(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="none">Square</option>
                    <option value="slight">Slight Radius</option>
                    <option value="medium">Medium Radius</option>
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <label className="font-semibold text-gray-700 text-xs block mb-2 uppercase">Font Size</label>
                  <select
                    value={fontSize}
                    onChange={e => setFontSize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value={14}>Small (14px)</option>
                    <option value={18}>Medium (18px)</option>
                    <option value={24}>Large (24px)</option>
                  </select>
                </div>

                {/* Print Button */}
                <button
                  onClick={handlePrint}
                  disabled={selectedWords.length === 0}
                  className="w-full px-4 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg font-bold text-sm hover:from-teal-700 hover:to-teal-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  🖨️ Print {selectedWords.length > 0 ? `(${selectedWords.length})` : ''}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              {/* Stats */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                {selectedWords.length > 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-teal-700">{selectedWords.length}</span>
                    <span className="text-gray-600">labels</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {Math.ceil(selectedWords.length / sizeConfig.labelsPerPage)} page{Math.ceil(selectedWords.length / sizeConfig.labelsPerPage) > 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400 italic">Select word groups to preview labels</span>
                )}
              </div>

              {/* Grid Preview */}
              {selectedWords.length > 0 ? (
                <div
                  ref={printRef}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${sizeConfig.columns}, 1fr)`,
                    gap: 0,
                    borderCollapse: 'collapse',
                  }}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {selectedWords.map((word, idx) => {
                    const photoUrl = photoMap.get(word.word.toLowerCase());
                    const imgSize = labelSize === 'small' ? '20px' : labelSize === 'medium' ? '32px' : '48px';
                    return (
                      <div
                        key={`${word.word}-${idx}`}
                        style={{
                          width: '100%',
                          aspectRatio: `${sizeConfig.width} / ${sizeConfig.height}`,
                          border: `${BORDER_WIDTHS[borderWidth]}px solid ${borderColor}`,
                          borderRadius: cornerRadiusValue,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px',
                          fontFamily: "'Comic Sans MS', cursive",
                          pageBreakInside: 'avoid',
                          backgroundColor: 'white',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      >
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={word.word}
                            style={{
                              width: imgSize,
                              height: imgSize,
                              objectFit: 'cover',
                              borderRadius: '2px',
                              marginBottom: '4px',
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              fontSize: labelSize === 'small' ? '18px' : labelSize === 'medium' ? '28px' : '42px',
                              lineHeight: '1',
                              marginBottom: '4px',
                            }}
                          >
                            {word.image}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: `${fontSize}px`,
                            fontWeight: 'bold',
                            letterSpacing: '0.5px',
                            textAlign: 'center',
                            lineHeight: '1.1',
                            wordBreak: 'break-word',
                            fontFamily: "'Comic Sans MS', cursive",
                            color: '#000',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                          }}
                        >
                          {word.word}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-lg">👈 Select word groups from the left panel to preview labels</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
