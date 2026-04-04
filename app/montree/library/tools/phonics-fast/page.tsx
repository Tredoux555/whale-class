// /montree/library/tools/phonics-fast/page.tsx
// Fast Phonics — Master Hub for all phonics word lists + generators
// Tabs are DYNAMICALLY generated from ALL_PHASES — no hardcoded phase IDs
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n/context';
import { ALL_PHASES, SIGHT_WORDS, getCommands, type PhonicsPhase, type PhonicsWord, type PhonicsWordGroup } from '@/lib/montree/phonics/phonics-data';
import { resolvePhotoBankImages } from '@/lib/montree/phonics/photo-bank-resolver';
import { escapeHtml } from '@/lib/sanitize';

// Derive series color from phase ID prefix
function getSeriesInfo(phaseId: string): { series: string; color: string; bgClass: string } {
  if (phaseId === 'beginning') return { series: 'Beginning', color: '#F59E0B', bgClass: 'bg-amber-600' };
  if (phaseId.startsWith('pink')) return { series: 'Pink', color: '#10b981', bgClass: 'bg-emerald-700' };
  if (phaseId.startsWith('blue')) return { series: 'Blue', color: '#6366f1', bgClass: 'bg-indigo-700' };
  if (phaseId.startsWith('green')) return { series: 'Green', color: '#16a34a', bgClass: 'bg-green-700' };
  return { series: '?', color: '#666', bgClass: 'bg-gray-700' };
}

function getGenerators(t: any) {
  return [
    { href: '/montree/library/tools/phonics-fast/sound-bingo', icon: '🔊', label: t('library.phonicsSoundBingo'), desc: t('library.phonicsSoundBingoDesc') },
    { href: '/montree/library/tools/phonics-fast/pink-box', icon: '🩷', label: t('library.phonicsPinkBox'), desc: t('library.phonicsPinkBoxDesc') },
    { href: '/montree/library/tools/phonics-fast/blue-box', icon: '💙', label: t('library.phonicsBlueBox'), desc: t('library.phonicsBlueBoxDesc') },
    { href: '/montree/library/tools/phonics-fast/three-part-cards', icon: '🃏', label: t('library.phonics3PartCards'), desc: t('library.phonics3PartCardsDesc') },
    { href: '/montree/library/tools/phonics-fast/labels', icon: '🏷️', label: t('library.phonicsLabels'), desc: t('library.phonicsLabelsDesc') },
    { href: '/montree/library/tools/phonics-fast/command-cards', icon: '📋', label: t('library.phonicsCommandCards'), desc: t('library.phonicsCommandCardsDesc') },
    { href: '/montree/library/tools/phonics-fast/dictionary', icon: '📖', label: t('library.phonicsDictionary'), desc: t('library.phonicsDictionaryDesc') },
    { href: '/montree/library/tools/phonics-fast/bingo', icon: '🎯', label: t('library.phonicsBingo'), desc: t('library.phonicsBingoDesc') },
    { href: '/montree/library/tools/phonics-fast/reverse-bingo', icon: '🔄', label: t('library.phonicsReverseBingo'), desc: t('library.phonicsReverseBingoDesc') },
    { href: '/montree/library/tools/phonics-fast/sentence-cards', icon: '📝', label: t('library.phonicsSentenceCards'), desc: t('library.phonicsSentenceCardsDesc') },
    { href: '/montree/library/tools/phonics-fast/stories', icon: '📚', label: t('library.phonicsShortStories'), desc: t('library.phonicsShortStoriesDesc') },
  ];
}

export default function PhonicsHubPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string>(ALL_PHASES[0]?.id || 'pink1');
  const [exportBanner, setExportBanner] = useState<number>(0);

  // Detect photos exported from Picture Bank — Phonics Fast already resolves photos
  // from the Photo Bank API via resolvePhotoBankImages(), so we just show a confirmation
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('photoBankExport');
      if (!raw) return;
      sessionStorage.removeItem('photoBankExport');
      const { photos } = JSON.parse(raw) as { photos: Array<{ id: string; label: string; public_url: string; filename: string }> };
      if (photos && photos.length > 0) {
        setExportBanner(photos.length);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Compute word counts dynamically from ALL_PHASES
  const { totalWords, phaseCounts } = useMemo(() => {
    let total = 0;
    const counts: Record<string, number> = {};
    for (const phase of ALL_PHASES) {
      const count = phase.groups.reduce((sum, g) => sum + g.words.length, 0);
      counts[phase.id] = count;
      total += count;
    }
    return { totalWords: total, phaseCounts: counts };
  }, []);

  const currentPhase = ALL_PHASES.find(p => p.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link href="/montree/library/tools" className="text-emerald-300 text-sm hover:underline">
            {t('library.contentCreationToolsBack')}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">
            {t('library.phonicsFastTitle')}
          </h1>
          <p className="text-emerald-200 mt-1">
            {totalWords} {t('library.phonicsWordsAcross')} {ALL_PHASES.length} {t('library.phonicsPhases')}
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-sm">
            {ALL_PHASES.map(phase => {
              const { bgClass } = getSeriesInfo(phase.id);
              return (
                <span key={phase.id} className={`${bgClass} px-3 py-1 rounded-full`}>
                  {phase.name.split('—')[0].trim()}: {phaseCounts[phase.id]}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      {/* Tabs — dynamically generated from ALL_PHASES + Tools */}
      <div className="bg-[#0a2624] overflow-x-auto">
        <div className="max-w-5xl mx-auto px-4 flex gap-0">
          {ALL_PHASES.map(phase => {
            const isActive = activeTab === phase.id;
            const { series } = getSeriesInfo(phase.id);
            // Short label: "Pink 1", "Blue 2", etc.
            const shortLabel = phase.name.split('—')[0].trim();
            return (
              <button
                key={phase.id}
                onClick={() => setActiveTab(phase.id)}
                className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-emerald-300 border-emerald-400'
                    : 'text-gray-400 border-transparent hover:text-gray-200'
                }`}
                style={{ borderBottomWidth: '3px', borderBottomStyle: 'solid', borderBottomColor: isActive ? phase.color : 'transparent' }}
              >
                {shortLabel}
              </button>
            );
          })}
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
              activeTab === 'tools'
                ? 'text-emerald-300 border-emerald-400'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
            style={{ borderBottomWidth: '3px', borderBottomStyle: 'solid', borderBottomColor: activeTab === 'tools' ? '#10b981' : 'transparent' }}
          >
            🛠️ {t('library.phonicsGenerators')}
          </button>
        </div>
      </div>

      {/* Export banner — shown when arriving from Picture Bank export */}
      {exportBanner > 0 && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-emerald-600 text-lg">✅</span>
              <span className="text-emerald-800 text-sm font-medium">
                {exportBanner} photo{exportBanner !== 1 ? 's' : ''} from the Picture Bank will automatically appear in your phonics materials below.
              </span>
            </div>
            <button
              onClick={() => setExportBanner(0)}
              className="text-emerald-400 hover:text-emerald-600 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'tools' ? (
          <ToolsTab />
        ) : currentPhase ? (
          <PhaseTab phase={currentPhase} />
        ) : null}
      </div>
    </div>
  );
}

// =====================================================================
// PHASE TAB — Shows word groups with cards
// =====================================================================

// =====================================================================
// EMOJI TO DATA URL — Renders emoji on canvas for print compatibility
// =====================================================================

function emojiToDataUrl(emoji: string, size = 400): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(size * 0.6)}px serif`;
  ctx.fillText(emoji, size / 2, size / 2);
  return canvas.toDataURL('image/png');
}

// =====================================================================
// PRINT ALL MATERIALS — Combined print document for a phase
// =====================================================================

function generateAllMaterialsHTML(phase: PhonicsPhase, photoMap: Map<string, string>): string {
  const allWords = phase.groups.flatMap(g => g.words);
  const nounWords = allWords.filter(w => w.isNoun);
  const commands = getCommands(phase.id);
  // Build set of all phonics words in this phase for bold highlighting in commands
  const phaseWordSet = new Set(allWords.map(w => w.word.toLowerCase()));

  // Card dimensions
  const A4W = 21, A4H = 29.7;
  const CARD_SIZE = 7.5, LABEL_H = 2.4, BORDER_R = 0.4, PAD = 0.5;
  const CONTROL_H = CARD_SIZE + LABEL_H;
  const gridML = (A4W - CARD_SIZE * 2) / 2;

  const borderColor = '#0D3330';
  const fontFamily = 'Comic Sans MS';

  // Convert words to card image data — Photo Bank > customImageUrl > emoji
  const cardData = nounWords.map(w => {
    const photoUrl = photoMap.get(w.word.toLowerCase());
    return {
      label: w.word,
      imageUrl: photoUrl || w.customImageUrl || emojiToDataUrl(w.image),
    };
  });

  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Phonics Materials — ${escapeHtml(phase.name)}</title>
<style>
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: white; }
.page { page-break-after: always; width: ${A4W}cm; height: ${A4H}cm; position: relative; overflow: hidden; }
.page:last-child { page-break-after: auto; }
.section-cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.section-cover h1 { font-size: 28pt; color: ${borderColor}; margin-bottom: 0.5cm; }
.section-cover p { font-size: 14pt; color: #666; }
.grid-cards { display: grid; grid-template-columns: ${CARD_SIZE}cm ${CARD_SIZE}cm; gap: 0; margin-left: ${gridML}cm; }
.card { background: ${borderColor}; padding: ${PAD}cm; display: flex; flex-direction: column; gap: 0.5cm; border-radius: ${BORDER_R}cm; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.card-control { height: ${CONTROL_H}cm; width: ${CARD_SIZE}cm; }
.card-picture { height: ${CARD_SIZE}cm; width: ${CARD_SIZE}cm; }
.card-label { height: ${LABEL_H}cm; width: ${CARD_SIZE}cm; }
.card .img-area { background: white; flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: ${BORDER_R}cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.card .img-area img { width: 100%; height: 100%; object-fit: cover; }
.card .lbl-area { background: white; height: 1.8cm; display: flex; align-items: center; justify-content: center; font-family: "${fontFamily}", cursive; font-size: 24pt; font-weight: bold; text-align: center; padding: 0.2cm 0.3cm; border-radius: ${BORDER_R}cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.card-label .lbl-area { flex: 1; height: auto; }
.cmd-grid { display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); gap: 8mm; padding: 10mm; width: ${A4W}cm; height: ${A4H}cm; }
.cmd-card { border: 3px solid ${borderColor}; padding: 20px; border-radius: 8px; display: flex; align-items: center; justify-content: center; text-align: center; font-family: "${fontFamily}", cursive; font-size: 22px; line-height: 1.6; }
.cmd-card strong { color: ${borderColor}; font-weight: bold; }
@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  body { margin: 0; padding: 0; }
  .card { background: ${borderColor} !important; }
}
@media screen {
  body { padding: 20px; background: #f0f0f0; }
  .page { background: white; margin: 0 auto 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
}
</style></head><body>`;

  // ===== SECTION 1: COVER =====
  html += `<div class="page section-cover">
    <h1>📚 ${escapeHtml(phase.name)}</h1>
    <p>${nounWords.length} noun cards • ${allWords.length} total words • ${commands.length} command cards</p>
    <p style="margin-top:1cm;color:#999;font-size:11pt;">Generated by Fast Phonics</p>
  </div>`;

  // ===== SECTION 2: CONTROL CARDS (image + label) =====
  const controlMT = (A4H - CONTROL_H * 3) / 2;
  for (let i = 0; i < cardData.length; i += 6) {
    const batch = cardData.slice(i, i + 6);
    html += `<div class="page"><div class="grid-cards" style="grid-template-rows: repeat(3, ${CONTROL_H}cm); margin-top: ${controlMT}cm;">`;
    batch.forEach(c => {
      html += `<div class="card card-control"><div class="img-area"><img src="${c.imageUrl}" alt="${escapeHtml(c.label)}"></div><div class="lbl-area">${escapeHtml(c.label)}</div></div>`;
    });
    if (batch.length < 6) html += '<div></div>'.repeat(6 - batch.length);
    html += '</div></div>';
  }

  // ===== SECTION 3: PICTURE CARDS (image only) =====
  const picMT = (A4H - CARD_SIZE * 3) / 2;
  for (let i = 0; i < cardData.length; i += 6) {
    const batch = cardData.slice(i, i + 6);
    html += `<div class="page"><div class="grid-cards" style="grid-template-rows: repeat(3, ${CARD_SIZE}cm); margin-top: ${picMT}cm;">`;
    batch.forEach(c => {
      html += `<div class="card card-picture"><div class="img-area"><img src="${c.imageUrl}" alt="${escapeHtml(c.label)}"></div></div>`;
    });
    if (batch.length < 6) html += '<div></div>'.repeat(6 - batch.length);
    html += '</div></div>';
  }

  // ===== SECTION 4: LABEL CARDS =====
  const lblMT = (A4H - LABEL_H * 8) / 2;
  for (let i = 0; i < cardData.length; i += 16) {
    const batch = cardData.slice(i, i + 16);
    html += `<div class="page"><div class="grid-cards" style="grid-template-rows: repeat(8, ${LABEL_H}cm); margin-top: ${lblMT}cm;">`;
    batch.forEach(c => {
      html += `<div class="card card-label"><div class="lbl-area">${escapeHtml(c.label)}</div></div>`;
    });
    if (batch.length < 16) html += '<div></div>'.repeat(16 - batch.length);
    html += '</div></div>';
  }

  // ===== SECTION 5: COMMAND CARDS =====
  if (commands.length > 0) {
    for (let i = 0; i < commands.length; i += 6) {
      const batch = commands.slice(i, i + 6);
      html += '<div class="page"><div class="cmd-grid">';
      batch.forEach(cmd => {
        const textHtml = cmd.text.split(/\b/).map((part: string) => {
          const w = part.trim().toLowerCase();
          if (w && phaseWordSet.has(w)) {
            return `<strong>${escapeHtml(part)}</strong>`;
          }
          return escapeHtml(part);
        }).join('');
        html += `<div class="cmd-card">${textHtml}</div>`;
      });
      if (batch.length < 6) html += '<div></div>'.repeat(6 - batch.length);
      html += '</div></div>';
    }
  }

  html += `<script>window.onload=function(){setTimeout(()=>{window.print();},500);};</script></body></html>`;
  return html;
}

function PhaseTab({ phase }: { phase: PhonicsPhase }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  // Photo Bank: resolved on mount
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const controller = new AbortController();
    resolvePhotoBankImages(controller.signal).then((map) => {
      if (!controller.signal.aborted) setPhotoMap(map);
    });
    return () => { controller.abort(); };
  }, []);

  const handlePrintAll = useCallback(() => {
    setPrinting(true);
    // Small delay so the button shows loading state
    setTimeout(() => {
      try {
        const html = generateAllMaterialsHTML(phase, photoMap);
        const printWindow = window.open('', '', 'width=800,height=1000');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
        }
      } catch (err) {
        console.error('Print all error:', err);
      }
      setPrinting(false);
    }, 100);
  }, [phase, photoMap]);

  return (
    <div>
      {/* Phase header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: phase.color }}>
              {phase.name}
            </h2>
            <p className="text-gray-600 mt-1">{phase.description}</p>
            <p className="text-sm text-gray-500 mt-1">
              {phase.groups.flatMap(g => g.words).length} words total
            </p>
          </div>
          <button
            onClick={handlePrintAll}
            disabled={printing}
            className="px-6 py-3 bg-[#0D3330] text-white rounded-xl font-bold text-sm shadow-lg hover:bg-[#1a4a47] transition-all disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
          >
            {printing ? (
              <>⏳ Generating...</>
            ) : (
              <>🖨️ Print All Materials</>
            )}
          </button>
        </div>
      </div>

      {/* Word groups */}
      <div className="space-y-4">
        {phase.groups.map(group => (
          <WordGroupCard
            key={group.id}
            group={group}
            phaseColor={phase.color}
            isExpanded={expandedGroup === group.id}
            onToggle={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
            photoMap={photoMap}
          />
        ))}
      </div>

      {/* Copyable word list */}
      <CopyableWordList phase={phase} />
    </div>
  );
}

// =====================================================================
// COPYABLE WORD LIST — Vertical word list with copy button
// =====================================================================

function CopyableWordList({ phase }: { phase: PhonicsPhase }) {
  const [copied, setCopied] = useState(false);
  const allWords = useMemo(() => phase.groups.flatMap(g => g.words.map(w => w.word)), [phase]);
  const wordText = useMemo(() => allWords.join('\n'), [allWords]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(wordText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = wordText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [wordText]);

  return (
    <div className="mt-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-700">Word List — {allWords.length} words</h3>
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0D3330] text-white hover:bg-[#1a4a47]'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy All'}
        </button>
      </div>
      <pre
        className="bg-white border border-gray-200 rounded-lg p-4 text-base leading-relaxed font-mono text-gray-800 max-h-80 overflow-y-auto select-all cursor-text"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {wordText}
      </pre>
    </div>
  );
}

// =====================================================================
// WORD GROUP CARD
// =====================================================================

function WordGroupCard({ group, phaseColor, isExpanded, onToggle, photoMap }: {
  group: PhonicsWordGroup;
  phaseColor: string;
  isExpanded: boolean;
  onToggle: () => void;
  photoMap: Map<string, string>;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: phaseColor }}
          />
          <div className="text-left">
            <div className="font-bold text-gray-800">{group.label}</div>
            <div className="text-sm text-gray-500">{group.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{group.words.length} words</span>
          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Word preview — always show */}
      <div className="px-5 pb-3 flex flex-wrap gap-2">
        {group.words.map(w => {
          const photoUrl = photoMap.get(w.word.toLowerCase());
          return (
            <span key={w.word} className="text-sm bg-gray-100 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
              {photoUrl ? (
                <img src={photoUrl} alt={w.word} style={{ width: '18px', height: '18px', objectFit: 'cover', borderRadius: '3px' }} />
              ) : (
                <span>{w.image}</span>
              )}
              {w.word}
            </span>
          );
        })}
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {group.words.map(w => (
              <WordCard key={w.word} word={w} photoMap={photoMap} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// INDIVIDUAL WORD CARD
// =====================================================================

function WordCard({ word, photoMap }: { word: PhonicsWord; photoMap: Map<string, string> }) {
  const photoUrl = photoMap.get(word.word.toLowerCase());
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
      {photoUrl ? (
        <img src={photoUrl} alt={word.word} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', margin: '0 auto 4px' }} />
      ) : (
        <div className="text-3xl mb-1">{word.image}</div>
      )}
      <div className="font-bold text-lg" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        {word.word}
      </div>
      {word.isNoun && (
        <div className="text-xs text-gray-400 mt-1">
          {word.miniature}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// TOOLS TAB — Generator links
// =====================================================================

function ToolsTab() {
  const { t } = useI18n();
  const generators = getGenerators(t);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">{t('library.phonicsContentGenerators')}</h2>
      <p className="text-gray-600 mb-6">{t('library.phonicsGenerateDescription')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {generators.map(gen => (
          <Link
            key={gen.href}
            href={gen.href}
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-2xl">{gen.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800">{gen.label}</div>
              <div className="text-sm text-gray-500">{gen.desc}</div>
            </div>
            <span className="text-gray-400 shrink-0">→</span>
          </Link>
        ))}
      </div>

      {/* Sight words reference */}
      <div className="mt-8 p-5 bg-amber-50 rounded-xl border border-amber-200">
        <h3 className="font-bold text-amber-800 mb-2">{t('library.phonicsSightWordsReference')}</h3>
        <p className="text-sm text-amber-700 mb-3">{t('library.phonicsSightWordsDescription')}</p>
        <div className="flex flex-wrap gap-2">
          {SIGHT_WORDS.map(w => (
            <span key={w} className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
