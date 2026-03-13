'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ALL_PHASES,
  SENTENCE_TEMPLATES,
  getPhaseWords,
  type SentenceTemplate,
} from '@/lib/montree/phonics/phonics-data';

interface GeneratedSentence {
  text: string;
  template: SentenceTemplate;
  phonicsWords: { word: string; image: string }[];
}

type PrintMode = 'cards' | 'strips' | 'worksheet' | 'matching';
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
  const initialPhaseId = searchParams.get('phase') || 'pink1';

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

      // requiredWords contains VERBS (e.g., "get", "put") — these are the
      // action words in the template, NOT nouns to filter by.
      // All phase nouns are valid substitutes for {word} placeholders.
      const applicableWords = phaseWords;

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

  // Inline HTML-escape for print output (no external dependency)
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Build highlighted sentence HTML: phonics words in bold green, rest in dark gray
  const buildSentenceHTML = (
    sentence: GeneratedSentence,
    mode: 'card' | 'strip' | 'worksheet'
  ): string => {
    if (sentence.phonicsWords.length === 0) {
      return `<span class="regular-word">${esc(sentence.text)}</span>`;
    }
    const pattern = new RegExp(
      `(${sentence.phonicsWords.map((p) => p.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`
    );
    const parts = sentence.text.split(pattern);

    if (mode === 'card') {
      // Cards: phonics words stacked with emoji above
      return parts
        .map((part) => {
          const pw = sentence.phonicsWords.find((p) => p.word === part);
          if (pw) {
            return `<span class="word-group"><span class="emoji">${pw.image}</span><span class="phonics-word">${esc(part)}</span></span>`;
          }
          return part.trim() ? `<span class="regular-word">${esc(part)}</span>` : '';
        })
        .join('');
    }
    // Strips & worksheet: inline highlight only
    return parts
      .map((part) => {
        const isPhonics = sentence.phonicsWords.some((p) => p.word === part);
        return isPhonics
          ? `<span class="phonics-highlight">${esc(part)}</span>`
          : `<span>${esc(part)}</span>`;
      })
      .join('');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=1000');
    if (!printWindow) return;

    // --- Grid config for cards mode ---
    const GRID_CONFIGS: Record<CardsPerPage, { cols: number; rows: number }> = {
      4: { cols: 2, rows: 2 },
      6: { cols: 3, rows: 2 },
      8: { cols: 4, rows: 2 },
    };
    const gridCfg = GRID_CONFIGS[cardsPerPage];
    const phaseLabel = selectedPhase.name;
    const modeLabel = printMode === 'cards' ? 'Cards' : printMode === 'strips' ? 'Strips' : printMode === 'worksheet' ? 'Worksheet' : 'Matching';

    // --- Build full HTML document ---
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentence Cards - ${phaseLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800&family=Comic+Sans+MS:wght@400;700&display=swap');

    @page {
      size: A4;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      width: 100%;
      height: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Comic Sans MS', cursive, sans-serif;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* === PAGE CONTAINER === */
    .page {
      width: 210mm;
      height: 297mm;
      padding: 12mm;
      page-break-after: always;
      position: relative;
      background: white;
      display: flex;
      flex-direction: column;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page:last-child { page-break-after: avoid; }

    /* === PAGE HEADER === */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10mm;
      padding-bottom: 6mm;
      border-bottom: 3px solid ${borderColor};
      font-family: 'Nunito', sans-serif;
    }
    .page-title {
      font-size: 18pt;
      font-weight: 800;
      color: #0D3330;
      letter-spacing: 0.5px;
    }
    .page-label {
      font-size: 11pt;
      color: #6b7280;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* === CARDS MODE === */
    .card-grid {
      display: grid;
      grid-template-columns: repeat(${gridCfg.cols}, 1fr);
      grid-template-rows: repeat(${gridCfg.rows}, 1fr);
      gap: 5mm;
      flex: 1;
      align-content: stretch;
    }

    .card {
      background: linear-gradient(135deg, #FFFDF8 0%, #FFF9F0 100%);
      border: 3px solid ${borderColor};
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .card-words {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
      width: 100%;
    }

    .word-group {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
    }

    .emoji {
      font-size: ${cardsPerPage === 4 ? '1.6rem' : cardsPerPage === 6 ? '1.4rem' : '1.2rem'};
      line-height: 1;
    }

    .phonics-word {
      font-weight: bold;
      color: #10b981;
      font-family: 'Comic Sans MS', cursive;
      font-size: ${cardsPerPage === 4 ? '1.15rem' : cardsPerPage === 6 ? '0.95rem' : '0.85rem'};
      line-height: 1;
    }

    .regular-word {
      color: #1f2937;
      font-family: 'Comic Sans MS', cursive;
      font-size: ${cardsPerPage === 4 ? '1rem' : cardsPerPage === 6 ? '0.85rem' : '0.75rem'};
      line-height: 1;
    }

    .card-footer {
      display: flex;
      gap: 5px;
      justify-content: center;
      font-size: ${cardsPerPage === 4 ? '1.3rem' : cardsPerPage === 6 ? '1.1rem' : '0.9rem'};
      margin-top: 4px;
    }

    /* === STRIPS MODE === */
    .strips-container {
      flex: 1;
      overflow: hidden;
    }

    .strip {
      border: 3px solid ${borderColor};
      border-radius: 6px;
      background: linear-gradient(135deg, #FFFDF8 0%, #FFF9F0 100%);
      padding: 10mm 12mm;
      display: flex;
      align-items: center;
      gap: 12mm;
      margin-bottom: 4mm;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .strip:last-child {
      margin-bottom: 0;
    }

    .strip-icon {
      font-size: 2.2rem;
      flex-shrink: 0;
      line-height: 1;
    }

    .strip-text {
      flex: 1;
      font-size: 12pt;
      line-height: 1.4;
      font-family: 'Comic Sans MS', cursive;
      color: #1f2937;
    }

    .strip-number {
      flex-shrink: 0;
      font-size: 9pt;
      color: #9ca3af;
      font-family: monospace;
      font-weight: bold;
    }

    .phonics-highlight {
      font-weight: bold;
      color: #10b981;
    }

    /* === WORKSHEET MODE === */
    .ws-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8mm;
      padding-bottom: 4mm;
      border-bottom: 3px solid ${borderColor};
      font-family: 'Nunito', sans-serif;
    }

    .ws-title {
      font-size: 16pt;
      font-weight: 800;
      color: #0D3330;
      letter-spacing: 0.5px;
    }

    .ws-page-num {
      font-size: 10pt;
      color: #6b7280;
      font-weight: 700;
    }

    .ws-rows {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6mm;
    }

    .ws-row {
      display: flex;
      align-items: flex-start;
      gap: 8mm;
      page-break-inside: avoid;
      min-height: 18mm;
    }

    .ws-picture {
      width: 18mm;
      height: 18mm;
      border: 3px solid ${borderColor};
      border-radius: 6px;
      background: linear-gradient(135deg, #F5E6D3 0%, #EFD9BD 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      flex-shrink: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .ws-text {
      flex: 1;
      border-bottom: 2.5px solid #9ca3af;
      padding-bottom: 2mm;
      display: flex;
      align-items: center;
      font-size: 11pt;
      min-height: 18mm;
      color: #1f2937;
      font-family: 'Comic Sans MS', cursive;
      line-height: 1.4;
    }

    .ws-footer {
      margin-top: 10mm;
      text-align: center;
      font-size: 9pt;
      color: #6b7280;
      font-family: 'Comic Sans MS', cursive;
      page-break-inside: avoid;
    }

    @media print {
      html, body {
        width: 100%;
        margin: 0;
        padding: 0;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>`;

    // --- Generate content by mode ---
    if (printMode === 'cards') {
      paginatedSentences.forEach((page, pageNum) => {
        html += `<div class="page">
          <div class="page-header">
            <div class="page-title">${phaseLabel}</div>
            <div class="page-label">${modeLabel} • Page ${pageNum + 1}</div>
          </div>
          <div class="card-grid">`;
        page.forEach((sentence) => {
          const wordsHtml = buildSentenceHTML(sentence, 'card');
          const footerEmojis = sentence.phonicsWords
            .slice(0, 2)
            .map((pw) => `<span>${pw.image}</span>`)
            .join('');
          html += `<div class="card">
            <div class="card-words">${wordsHtml}</div>
            ${footerEmojis ? `<div class="card-footer">${footerEmojis}</div>` : ''}
          </div>`;
        });
        // Fill empty grid cells if page not full
        const remaining = cardsPerPage - page.length;
        for (let i = 0; i < remaining; i++) {
          html += '<div></div>';
        }
        html += '</div></div>';
      });
    } else if (printMode === 'strips') {
      // Paginate strips: ~8 per A4 page
      const STRIPS_PER_PAGE = 8;
      for (let i = 0; i < allSentences.length; i += STRIPS_PER_PAGE) {
        const pageNum = Math.floor(i / STRIPS_PER_PAGE);
        const pageStrips = allSentences.slice(i, i + STRIPS_PER_PAGE);
        html += `<div class="page">
          <div class="page-header">
            <div class="page-title">${phaseLabel}</div>
            <div class="page-label">${modeLabel} • Page ${pageNum + 1}</div>
          </div>
          <div class="strips-container">`;
        pageStrips.forEach((sentence, idx) => {
          const iconEmoji =
            sentence.phonicsWords.length > 0 ? sentence.phonicsWords[0].image : '';
          const textHtml = buildSentenceHTML(sentence, 'strip');
          html += `<div class="strip">
            ${iconEmoji ? `<div class="strip-icon">${iconEmoji}</div>` : ''}
            <div class="strip-text">${textHtml}</div>
            <div class="strip-number">${i + idx + 1}</div>
          </div>`;
        });
        html += '</div></div>';
      }
    } else if (printMode === 'worksheet') {
      // Worksheet mode: 5 sentences per page
      const WS_PER_PAGE = 5;
      let pageNum = 0;
      for (let i = 0; i < allSentences.length; i += WS_PER_PAGE) {
        pageNum++;
        const pageRows = allSentences.slice(i, i + WS_PER_PAGE);
        html += `<div class="page">
          <div class="ws-header">
            <div>
              <div class="ws-title">Reading Practice</div>
              <div class="ws-page-num">${phaseLabel}</div>
            </div>
            <div class="ws-page-num">Page ${pageNum}</div>
          </div>
          <div class="ws-rows">`;
        pageRows.forEach((sentence) => {
          const emoji =
            sentence.phonicsWords.length > 0 ? sentence.phonicsWords[0].image : '📖';
          html += `<div class="ws-row">
            <div class="ws-picture">${emoji}</div>
            <div class="ws-text">${esc(sentence.text)}</div>
          </div>`;
        });
        html += `</div>
          <div class="ws-footer">Name: _________________________ Date: _____________</div>
        </div>`;
      }
    } else if (printMode === 'matching') {
      // Matching mode: sentences on left, shuffled pictures on right
      // Only use sentences that have at least one phonics word (pictures needed)
      const matchable = allSentences.filter((s) => s.phonicsWords.length > 0);
      const MATCH_PER_PAGE = 6;
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let pageNum = 0;

      for (let i = 0; i < matchable.length; i += MATCH_PER_PAGE) {
        pageNum++;
        const pageSentences = matchable.slice(i, i + MATCH_PER_PAGE);

        // Create shuffled picture order using Fisher-Yates
        const pictureOrder = pageSentences.map((_, idx) => idx);
        for (let j = pictureOrder.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [pictureOrder[j], pictureOrder[k]] = [pictureOrder[k], pictureOrder[j]];
        }

        html += `<div class="page" style="padding:12mm 15mm;">
          <div class="ws-header">
            <div>
              <div class="ws-title">Sentence-Picture Matching</div>
              <div class="ws-page-num">${phaseLabel}</div>
            </div>
            <div class="ws-page-num">Page ${pageNum}</div>
          </div>
          <p style="font-size:10pt;color:#6b7280;margin:0 0 6mm;font-family:'Comic Sans MS',cursive;">Draw a line from each sentence to its matching picture.</p>
          <div style="display:flex;gap:10mm;">
            <div style="flex:1;">
              <div style="font-weight:800;font-size:11pt;color:${borderColor};margin-bottom:4mm;font-family:'Nunito',sans-serif;">Sentences</div>`;

        pageSentences.forEach((sentence, idx) => {
          html += `<div style="display:flex;align-items:center;gap:3mm;margin-bottom:5mm;padding:3mm 4mm;border:2px solid ${borderColor};border-radius:6px;background:#FFFDF8;min-height:14mm;">
            <span style="font-weight:800;font-size:14pt;color:${borderColor};font-family:'Nunito',sans-serif;min-width:8mm;">${idx + 1}.</span>
            <span style="font-size:11pt;font-family:'Comic Sans MS',cursive;color:#1f2937;">${esc(sentence.text)}</span>
          </div>`;
        });

        html += `</div>
            <div style="flex:0 0 auto;display:flex;flex-direction:column;justify-content:center;padding:0 2mm;">`;

        // Draw connection dots
        for (let d = 0; d < pageSentences.length; d++) {
          html += `<div style="height:19mm;display:flex;align-items:center;"><span style="font-size:20pt;color:#d1d5db;">•</span></div>`;
        }

        html += `</div>
            <div style="flex:1;">
              <div style="font-weight:800;font-size:11pt;color:${borderColor};margin-bottom:4mm;font-family:'Nunito',sans-serif;">Pictures</div>`;

        pictureOrder.forEach((origIdx, displayIdx) => {
          const sentence = pageSentences[origIdx];
          const pw = sentence.phonicsWords[0];
          html += `<div style="display:flex;align-items:center;gap:3mm;margin-bottom:5mm;padding:3mm 4mm;border:2px solid ${borderColor};border-radius:6px;background:#F5E6D3;min-height:14mm;">
            <span style="font-weight:800;font-size:14pt;color:${borderColor};font-family:'Nunito',sans-serif;min-width:8mm;">${letters[displayIdx]}.</span>
            <span style="font-size:28pt;line-height:1;">${pw.image}</span>
            <span style="font-size:12pt;font-weight:700;color:#10b981;font-family:'Nunito',sans-serif;">${esc(pw.word)}</span>
          </div>`;
        });

        html += `</div>
          </div>
          <div class="ws-footer" style="margin-top:8mm;">Name: _________________________ Date: _____________</div>
        </div>`;
      }
    }

    html += `
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-700 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link
            href="/montree/library/tools/phonics-fast"
            className="text-white hover:text-teal-100 transition-colors font-medium text-lg"
            title="Back to Phonics Fast Hub"
          >
            ← Back
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight">Sentence Card Generator</h1>
            <p className="text-teal-100 text-sm mt-1">Professional print-ready materials for phonics instruction</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Control Panel */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-10 no-print">
          {/* Phase Selector */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎯 Select Phase</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {ALL_PHASES.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhaseId(phase.id)}
                  className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                    selectedPhaseId === phase.id
                      ? 'text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{selectedPhase.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Print Mode */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📋 Print Mode</span>
              </h2>
              <div className="space-y-3">
                {(['cards', 'strips', 'worksheet', 'matching'] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="printMode"
                      value={mode}
                      checked={printMode === mode}
                      onChange={(e) => setPrintMode(e.target.value as PrintMode)}
                      className="w-5 h-5 accent-teal-600"
                    />
                    <span className="text-gray-700 font-medium">
                      {mode === 'cards'
                        ? '🎫 Cards (grid layout)'
                        : mode === 'strips'
                          ? '📄 Strips (horizontal rows)'
                          : mode === 'worksheet'
                            ? '📋 Worksheet (write-in lines)'
                            : '🔗 Matching (sentence ↔ picture)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cards Per Page */}
            {printMode === 'cards' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📐 Cards Per Page</span>
                </h2>
                <div className="space-y-3">
                  {([4, 6, 8] as const).map((num) => (
                    <label key={num} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="cardsPerPage"
                        value={num}
                        checked={cardsPerPage === num}
                        onChange={(e) => setCardsPerPage(parseInt(e.target.value) as CardsPerPage)}
                        className="w-5 h-5 accent-teal-600"
                      />
                      <span className="text-gray-700 font-medium">{num} cards (optimal for {num === 4 ? 'large' : num === 6 ? 'standard' : 'small'} print)</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Border Color */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎨 Border Color</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {BORDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBorderColor(color.value)}
                  className="px-5 py-2.5 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-md"
                  style={{
                    backgroundColor: color.value,
                    border: borderColor === color.value ? '3px solid #000' : '2px solid transparent',
                    transform: borderColor === color.value ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Sentences */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>✏️ Custom Sentences (Optional)</span>
            </h2>
            <p className="text-sm text-gray-600 mb-3">Enter one sentence per line — these will be added to the generated sentences:</p>
            <textarea
              value={customSentences}
              onChange={(e) => setCustomSentences(e.target.value)}
              placeholder="Examples:&#10;The cat is big.&#10;I see a dog."
              className="w-full h-24 p-4 border-2 border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-colors"
            />
          </div>

          {/* Statistics */}
          <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-lg border-l-4 border-emerald-500">
            <p className="text-gray-800 font-medium">
              📊 <strong>{allSentences.length}</strong> total sentences • <strong>{totalPages}</strong> pages • {cardsPerPage} per page
            </p>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="mt-8 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 text-lg"
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
          {printMode === 'matching' && (
            <PrintableMatching sentences={allSentences} borderColor={borderColor} />
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
        <div key={pageIdx} className="mb-10 print:mb-0 print:page-break-after-always bg-white rounded-xl shadow-lg overflow-hidden print:rounded-none print:shadow-none">
          <div className="p-6 print:p-10">
            <div className="flex justify-between items-center mb-6 print:mb-8">
              <h3 className="text-2xl font-bold text-gray-800 print:text-3xl print:font-black">Card Set #{pageIdx + 1}</h3>
              <span className="text-sm font-semibold text-gray-500 print:text-gray-700 print:text-base">{cardsPerPage} cards per page</span>
            </div>
            <div className={`grid ${gridClass} print:gap-4`}>
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
      className={`${className} p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-center border-4 bg-gradient-to-br from-white to-gray-50 print:shadow-none print:hover:shadow-none print:rounded-none print:border-2`}
      style={{ borderColor, backgroundColor: '#FFFDF8' }}
    >
      {/* Text with highlighted phonics words */}
      <div className="flex flex-wrap gap-1 items-center justify-center mb-3 print:mb-2">
        {parts.map((part, idx) => {
          const isPhonicsWord = sentence.phonicsWords.some((p) => p.word === part);
          if (isPhonicsWord) {
            const wordData = sentence.phonicsWords.find((p) => p.word === part);
            return (
              <div key={idx} className="flex flex-col items-center gap-0.5 print:gap-0">
                <div className="text-3xl print:text-2xl leading-none">{wordData?.image}</div>
                <span
                  className="font-bold font-sans print:font-serif"
                  style={{ color: '#10b981', fontSize: 'clamp(0.9rem, 5vw, 1.4rem)' }}
                >
                  {part}
                </span>
              </div>
            );
          }
          return (
            <span
              key={idx}
              style={{ fontSize: 'clamp(0.85rem, 5vw, 1.15rem)' }}
              className="text-gray-700 print:text-gray-800"
            >
              {part}
            </span>
          );
        })}
      </div>

      {/* Additional context icons */}
      {sentence.phonicsWords.length > 0 && (
        <div className="flex gap-1.5 justify-center print:gap-1">
          {sentence.phonicsWords.slice(0, 2).map((word) => (
            <span key={word.word} className="text-2xl print:text-xl leading-none">
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
  const STRIPS_PER_PAGE = 8;
  const pages: GeneratedSentence[][] = [];
  for (let i = 0; i < sentences.length; i += STRIPS_PER_PAGE) {
    pages.push(sentences.slice(i, i + STRIPS_PER_PAGE));
  }

  return (
    <>
      {pages.map((pageStrips, pageIdx) => (
        <div key={pageIdx} className="mb-10 print:mb-0 print:page-break-after-always bg-white rounded-xl shadow-lg overflow-hidden print:rounded-none print:shadow-none">
          <div className="p-6 print:p-10">
            <div className="flex justify-between items-center mb-6 print:mb-8">
              <h3 className="text-2xl font-bold text-gray-800 print:text-3xl print:font-black">Reading Strips - Page {pageIdx + 1}</h3>
              <span className="text-sm font-semibold text-gray-500 print:text-gray-700 print:text-base">{pageStrips.length} strips</span>
            </div>
            <div className="space-y-3 print:space-y-3">
              {pageStrips.map((sentence, idx) => (
                <div
                  key={pageIdx * STRIPS_PER_PAGE + idx}
                  className="border-4 p-4 print:p-3 rounded-lg print:rounded-md flex items-center gap-4 print:gap-3 bg-gradient-to-br from-white to-gray-50 print:from-white print:to-white hover:shadow-md transition-shadow print:hover:shadow-none print:shadow-none"
                  style={{ borderColor, backgroundColor: '#FFFDF8' }}
                >
                  {/* Icon */}
                  {sentence.phonicsWords.length > 0 && (
                    <div className="text-4xl print:text-3xl flex-shrink-0 leading-none">{sentence.phonicsWords[0].image}</div>
                  )}

                  {/* Text */}
                  <div className="flex-1" style={{ fontSize: '1rem' }}>
                    {sentence.phonicsWords.length > 0 ? (
                      <span className="print:text-sm">
                        {sentence.text.split(new RegExp(`(${sentence.phonicsWords.map((p) => p.word).join('|')})`)).map((part, idx) => {
                          const isPhonicsWord = sentence.phonicsWords.some((p) => p.word === part);
                          return (
                            <span
                              key={idx}
                              className={isPhonicsWord ? 'font-bold' : ''}
                              style={{ color: isPhonicsWord ? '#10b981' : '#1f2937' }}
                            >
                              {part}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-800 print:text-gray-800 print:text-sm">{sentence.text}</span>
                    )}
                  </div>

                  {/* Number */}
                  <div className="flex-shrink-0 text-sm print:text-xs text-gray-500 print:text-gray-600 font-mono font-bold">{pageIdx * STRIPS_PER_PAGE + idx + 1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
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
        <div key={pageIdx} className="mb-10 print:mb-0 print:page-break-after-always bg-white rounded-xl shadow-lg overflow-hidden print:rounded-none print:shadow-none">
          <div className="p-8 print:p-10">
            <div className="flex justify-between items-start mb-8 print:mb-10">
              <div>
                <h2 className="text-3xl print:text-4xl font-black text-gray-900 mb-2">Reading Practice</h2>
                <p className="text-sm font-semibold text-gray-500 print:text-gray-700" style={{ color: borderColor }}>Sentence Reading Worksheet</p>
              </div>
              <div className="text-right">
                <p className="text-2xl print:text-3xl font-bold text-gray-400 print:text-gray-600">Page {pageIdx + 1}</p>
              </div>
            </div>

            <div className="space-y-7 print:space-y-8">
              {page.map((sentence, lineIdx) => (
                <div key={lineIdx} className="flex items-start gap-6 print:gap-8 min-h-20 print:min-h-24 page-break-inside-avoid">
                  {/* Picture area */}
                  <div
                    className="w-24 h-24 print:w-28 print:h-28 rounded-lg print:rounded-md border-4 print:border-2 flex items-center justify-center text-6xl print:text-7xl flex-shrink-0 bg-gradient-to-br print:from-white print:to-white hover:shadow-md transition-shadow print:shadow-none print:hover:shadow-none"
                    style={{ borderColor, backgroundColor: '#F5E6D3' }}
                  >
                    {sentence.phonicsWords.length > 0
                      ? sentence.phonicsWords[0].image
                      : '📖'}
                  </div>

                  {/* Text area with line for writing */}
                  <div className="flex-1 border-b-3 print:border-b-2 pb-3 print:pb-2 flex items-center" style={{ borderBottomColor: borderColor }}>
                    <p style={{ fontSize: '1.15rem', fontFamily: "'Comic Sans MS', cursive" }} className="text-gray-800 print:text-gray-900 font-medium">
                      {sentence.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-12 print:mt-16 pt-8 print:pt-10 border-t-2 border-gray-300 text-center">
              <div className="flex justify-between print:justify-around text-sm print:text-base font-semibold text-gray-700">
                <div>Name: _________________________</div>
                <div>Date: _________________________</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// =====================================================================
// PRINTABLE MATCHING COMPONENT
// =====================================================================

function PrintableMatching({
  sentences,
  borderColor,
}: {
  sentences: GeneratedSentence[];
  borderColor: string;
}) {
  const MATCH_PER_PAGE = 6;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Stable key for memoization — only re-shuffle when actual sentences change
  const sentenceKey = sentences.map(s => s.text).join('|');

  const pages = useMemo(() => {
    const matchable = sentences.filter((s) => s.phonicsWords.length > 0);
    const result: { sentences: GeneratedSentence[]; pictureOrder: number[] }[] = [];
    for (let i = 0; i < matchable.length; i += MATCH_PER_PAGE) {
      const pageSentences = matchable.slice(i, i + MATCH_PER_PAGE);
      // Create shuffled picture order (Fisher-Yates)
      const pictureOrder = pageSentences.map((_, idx) => idx);
      for (let j = pictureOrder.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [pictureOrder[j], pictureOrder[k]] = [pictureOrder[k], pictureOrder[j]];
      }
      result.push({ sentences: pageSentences, pictureOrder });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentenceKey]);

  return (
    <>
      {pages.map((page, pageIdx) => (
        <div key={pageIdx} className="mb-10 print:mb-0 print:page-break-after-always bg-white rounded-xl shadow-lg overflow-hidden print:rounded-none print:shadow-none">
          <div className="p-8 print:p-10">
            <div className="flex justify-between items-start mb-4 print:mb-6">
              <div>
                <h2 className="text-3xl print:text-4xl font-black text-gray-900 mb-1">Sentence-Picture Matching</h2>
                <p className="text-sm text-gray-500">Draw a line from each sentence to its matching picture.</p>
              </div>
              <p className="text-2xl print:text-3xl font-bold text-gray-400 print:text-gray-600">Page {pageIdx + 1}</p>
            </div>

            <div className="flex gap-6 print:gap-8">
              {/* Sentences column */}
              <div className="flex-1">
                <div className="font-extrabold text-sm mb-3" style={{ color: borderColor }}>Sentences</div>
                <div className="space-y-3 print:space-y-4">
                  {page.sentences.map((sentence, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-3 rounded-lg border-2"
                      style={{ borderColor, backgroundColor: '#FFFDF8', minHeight: '3.5rem' }}
                    >
                      <span className="font-extrabold text-lg" style={{ color: borderColor, minWidth: '1.5rem' }}>{idx + 1}.</span>
                      <span style={{ fontFamily: "'Comic Sans MS', cursive", fontSize: '0.95rem' }} className="text-gray-800">{sentence.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connection dots */}
              <div className="flex flex-col justify-center items-center px-1">
                {page.sentences.map((_, idx) => (
                  <div key={idx} style={{ height: '3.75rem' }} className="flex items-center">
                    <span className="text-2xl text-gray-300">•</span>
                  </div>
                ))}
              </div>

              {/* Pictures column (shuffled) */}
              <div className="flex-1">
                <div className="font-extrabold text-sm mb-3" style={{ color: borderColor }}>Pictures</div>
                <div className="space-y-3 print:space-y-4">
                  {page.pictureOrder.map((origIdx, displayIdx) => {
                    const sentence = page.sentences[origIdx];
                    const pw = sentence.phonicsWords[0];
                    return (
                      <div
                        key={displayIdx}
                        className="flex items-center gap-2 p-3 rounded-lg border-2"
                        style={{ borderColor, backgroundColor: '#F5E6D3', minHeight: '3.5rem' }}
                      >
                        <span className="font-extrabold text-lg" style={{ color: borderColor, minWidth: '1.5rem' }}>{letters[displayIdx]}.</span>
                        <span className="text-3xl leading-none">{pw.image}</span>
                        <span className="font-bold text-emerald-500" style={{ fontFamily: "'Nunito', sans-serif" }}>{pw.word}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 print:mt-12 pt-6 print:pt-8 border-t-2 border-gray-300 text-center">
              <div className="flex justify-between print:justify-around text-sm print:text-base font-semibold text-gray-700">
                <div>Name: _________________________</div>
                <div>Date: _________________________</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
