// /montree/library/tools/phonics-fast/blue-box/page.tsx
// Blue Phonics Box — Complete AMI-standard material preparation system
// Everything a teacher needs to build a full Blue Series from scratch
// Printables: 3-Part Cards, Word Cards, Labels, Blend Chart, Shopping List,
//             Presentation Guide, Command Cards, Blend Sorting Mat
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_PHASES, getCommands } from '@/lib/montree/phonics/phonics-data';
import { resolvePhotoBankImages } from '@/lib/montree/phonics/photo-bank-resolver';
import { escapeHtml } from '@/lib/sanitize';

// =====================================================================
// TYPES & CONSTANTS
// =====================================================================

type PrintMode =
  | 'full-set'
  | 'shopping-list'
  | 'control-cards'
  | 'picture-cards'
  | 'word-cards'
  | 'object-labels'
  | 'command-cards'
  | 'blend-chart'
  | 'sorting-mat'
  | 'presentation-guide';

const BLUE_PHASES = ALL_PHASES.filter(p => p.id.startsWith('blue'));

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

// Extract blend from group label: "bl- blends" → "bl", "-nd endings" → "nd"
function getBlendFromLabel(label: string): string {
  const initial = label.match(/^(\w+)-\s/);
  if (initial) return initial[1];
  const final = label.match(/^-(\w+)/);
  if (final) return final[1];
  return label.split(' ')[0].replace(/^-/, '');
}

// Highlight blend portion of a word
function highlightBlend(word: string, blend: string, color: string): string {
  const lower = word.toLowerCase();
  const blendLower = blend.toLowerCase();
  if (blendLower && lower.startsWith(blendLower)) {
    return `<span style="color:${color};font-weight:900;">${escapeHtml(word.slice(0, blend.length))}</span>${escapeHtml(word.slice(blend.length))}`;
  }
  if (blendLower && lower.endsWith(blendLower)) {
    const base = word.length - blend.length;
    return `${escapeHtml(word.slice(0, base))}<span style="color:${color};font-weight:900;">${escapeHtml(word.slice(base))}</span>`;
  }
  return escapeHtml(word);
}

// =====================================================================
// AMI PRESENTATION GUIDE DATA
// =====================================================================

const BLUE_AMI_GUIDE = {
  prerequisites: [
    'Child can read CVC words fluently (Pink Series mastered)',
    'Child can build CVC words with Movable Alphabet',
    'Child understands that letters represent individual sounds',
  ],
  keyRule: 'The Blue Series contains ONLY words where every letter still makes its own sound. No digraphs (sh, ch, th), no silent letters, no phonograms. Every consonant in a blend is sounded individually: "s-t-o-p" not "sh-i-p."',
  materials: [
    { item: 'Blue box or basket', purpose: 'Container for Blue Series materials', printable: false },
    { item: 'Miniature objects (3-5 per lesson)', purpose: 'Concrete objects for matching', printable: false, alt: 'Use Picture Cards as substitute' },
    { item: 'Word cards', purpose: 'Child reads by sounding out each letter', printable: true },
    { item: 'Control cards (picture + word)', purpose: 'Self-correction', printable: true },
    { item: 'Blend chart (wall poster)', purpose: 'Reference chart of all blends in this phase', printable: true },
    { item: 'Movable Alphabet', purpose: 'Building 4-5 letter words', printable: false, alt: 'Use letter tiles or sandpaper letters' },
    { item: 'Sorting mat', purpose: 'Child sorts words by blend type', printable: true },
  ],
  exercises: [
    {
      name: 'Exercise 1: Object Box — Same as Pink, Longer Words',
      steps: [
        'Place 3-4 objects on the mat (e.g., drum, flag, crab, plug).',
        'Child names each object. Discuss if needed — some may be new vocabulary.',
        'Place matching word cards face-down.',
        'Child takes a card and sounds out EVERY letter: "d-r-u-m... drum!"',
        'Child matches to object. Emphasize: every letter has a sound.',
        'Self-check with control cards.',
      ],
      notes: 'The key difference from Pink: child must track 4-5 sounds instead of 3. If they struggle, don\'t correct — ask them to try again slowly. "Can you hear each sound?" The extra sounds are the challenge, not the concept.',
    },
    {
      name: 'Exercise 2: Blend Sorting',
      steps: [
        'Print the Sorting Mat. Choose 2-3 blend categories.',
        'Place the mat on the table with blend headers visible.',
        'Spread 10-15 word cards face-up.',
        'Child reads each word, then places it under the correct blend column.',
        'Discuss: "What sound does every word in this column start with?"',
        'Extension: child thinks of NEW words that belong in each column.',
      ],
      notes: 'Sorting builds phonological awareness — the child must decode the word AND analyze its structure. This is higher-order than simple matching. Works especially well with initial blends (Blue 1).',
    },
    {
      name: 'Exercise 3: Command Cards — Reading for Action',
      steps: [
        'Same format as Pink command cards, but sentences are longer.',
        'Child reads silently, then performs the action.',
        '"Clap and then stop." "Grab the drum and tap it."',
        'Progress to multi-step commands: "Stand up, then skip to the shelf."',
      ],
      notes: 'Blue command cards contain blend words that the child must read fluently in context. If they can perform the action correctly, they understand what they read.',
    },
  ],
  sequence: [
    { phase: 'Blue 1 — Initial Blends', description: 'CCVC/CCCVC words. Consonant clusters at the start: bl, br, cl, cr, dr, fl, fr, gl, gr, pl, pr, sc/sk, sl, sm/sn, sp, st, sw, tr. Child learns that consonants can sit together without a vowel between them.', words: 69 },
    { phase: 'Blue 2 — Final Blends', description: 'Words ending in consonant clusters: -nd, -nk, -nt, -mp, -ft/-ct/-pt, -st/-sk, -ld/-lf/-lt, -ng. Same principle, at the end of words.', words: 68 },
    { phase: 'Blue 3 — Double Consonants & CK', description: 'Words with doubled letters (-ll, -ss, -ff, -zz) and -ck ending. Key insight: two letters, one sound. Still "phonetically regular" because the child can hear the single sound.', words: 36 },
  ],
  errorControl: 'Same as Pink: control cards (picture + word) for self-checking. Additionally, the blend chart on the wall serves as a reference — if a child can\'t decode a blend, they can look it up.',
  parallelWork: 'During Blue Series, the child also works on: Green Series introduction (if digraphs emerge in their writing), Grammar boxes (noun/verb awareness from command cards), Creative writing with Movable Alphabet (child now has enough phonics to write simple sentences).',
};

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export default function BlueBoxPage() {
  const searchParams = useSearchParams();
  const initialPhase = searchParams.get('phase') || 'blue1';

  const [selectedPhase, setSelectedPhase] = useState(initialPhase.startsWith('blue') ? initialPhase : 'blue1');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<PrintMode>('full-set');
  const [borderColor, setBorderColor] = useState('#3B82F6');
  const [borderColorHex, setBorderColorHex] = useState('#3B82F6');
  const [fontSize, setFontSize] = useState(22);
  const [highlightBlends, setHighlightBlends] = useState(true);
  const [printing, setPrinting] = useState(false);

  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const controller = new AbortController();
    resolvePhotoBankImages(controller.signal).then((map) => {
      if (!controller.signal.aborted) setPhotoMap(map);
    });
    return () => { controller.abort(); };
  }, []);

  const currentPhase = BLUE_PHASES.find(p => p.id === selectedPhase) || BLUE_PHASES[0];

  useEffect(() => {
    if (currentPhase) {
      setSelectedGroups(currentPhase.groups.map(g => g.id || g.label));
    }
  }, [selectedPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedWords = useMemo(() => {
    if (!currentPhase) return [];
    return currentPhase.groups
      .filter(g => selectedGroups.includes(g.id || g.label))
      .flatMap(g => g.words);
  }, [currentPhase, selectedGroups]);

  const nounWords = useMemo(() => selectedWords.filter(w => w.isNoun), [selectedWords]);
  const commands = useMemo(() => getCommands(currentPhase?.id || 'blue1'), [currentPhase]);

  // Build word→group lookup
  const wordToGroup = useMemo(() => {
    const map = new Map<string, string>();
    if (!currentPhase) return map;
    for (const g of currentPhase.groups) {
      if (selectedGroups.includes(g.id || g.label)) {
        for (const w of g.words) map.set(w.word, g.label);
      }
    }
    return map;
  }, [currentPhase, selectedGroups]);

  const handlePrint = useCallback(() => {
    if (selectedWords.length === 0) return;
    setPrinting(true);

    setTimeout(() => {
      try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { setPrinting(false); return; }

        const phaseName = currentPhase?.name || 'Blue Box';
        const phaseColor = currentPhase?.color || '#3B82F6';
        const bc = borderColor;
        const ff = "'Comic Sans MS', 'Chalkboard SE', cursive";

        const cardData = nounWords.map(w => ({
          word: w.word,
          image: w.image,
          miniature: w.miniature,
          imageUrl: photoMap.get(w.word.toLowerCase()) || w.customImageUrl || emojiToDataUrl(w.image),
          groupLabel: wordToGroup.get(w.word) || '',
        }));

        const phaseWordSet = new Set(selectedWords.map(w => w.word.toLowerCase()));

        const isFull = printMode === 'full-set';
        const sections = {
          shoppingList: isFull || printMode === 'shopping-list',
          controlCards: isFull || printMode === 'control-cards',
          pictureCards: isFull || printMode === 'picture-cards',
          wordCards: isFull || printMode === 'word-cards',
          objectLabels: isFull || printMode === 'object-labels',
          commandCards: (isFull || printMode === 'command-cards') && commands.length > 0,
          blendChart: isFull || printMode === 'blend-chart',
          sortingMat: isFull || printMode === 'sorting-mat',
          presentationGuide: isFull || printMode === 'presentation-guide',
        };

        const A4W = 21, A4H = 29.7;
        const CARD_W = 6.5, CARD_H = 6.5, LABEL_H = 2;
        const CONTROL_H = CARD_H + LABEL_H + 0.3;
        const PAD = 0.3, cols = 3;
        const gridML = (A4W - CARD_W * cols) / 2;

        const hlWord = (word: string) => {
          const gl = wordToGroup.get(word) || '';
          const blend = getBlendFromLabel(gl);
          return highlightBlends ? highlightBlend(word, blend, phaseColor) : escapeHtml(word);
        };

        let bodyHTML = '';

        // ========== COVER ==========
        if (isFull) {
          bodyHTML += `<div class="page cover">
            <div class="cover-inner">
              <div class="cover-emoji">💙</div>
              <h1>${escapeHtml(phaseName)}</h1>
              <p class="cover-sub">Complete AMI Material Set — Blends &amp; Consonant Clusters</p>
              <div class="cover-stats">
                <div class="stat"><span class="stat-n">${nounWords.length}</span><span class="stat-l">Object Cards</span></div>
                <div class="stat"><span class="stat-n">${selectedWords.length}</span><span class="stat-l">Word Cards</span></div>
                <div class="stat"><span class="stat-n">${commands.length}</span><span class="stat-l">Commands</span></div>
                <div class="stat"><span class="stat-n">${currentPhase.groups.length}</span><span class="stat-l">Blend Groups</span></div>
              </div>
              <p class="cover-foot">Print • Cut • Laminate • Teach</p>
            </div>
          </div>`;
        }

        // ========== PRESENTATION GUIDE ==========
        if (sections.presentationGuide) {
          bodyHTML += `<div class="page guide-page">
            <h2 class="guide-title">📖 AMI Presentation Guide — Blue Series</h2>
            <div class="guide-section">
              <h3>Prerequisites:</h3>
              <ul>${BLUE_AMI_GUIDE.prerequisites.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
            </div>
            <div class="guide-section" style="background:#eff6ff;border-left:3px solid ${phaseColor};padding:3mm 4mm;">
              <h3 style="color:${phaseColor};">⚡ The Key Rule:</h3>
              <p>${escapeHtml(BLUE_AMI_GUIDE.keyRule)}</p>
            </div>
            <div class="guide-section">
              <h3>Materials Needed:</h3>
              <table class="guide-table">
                <thead><tr><th>Material</th><th>Purpose</th><th>Printable?</th></tr></thead>
                <tbody>${BLUE_AMI_GUIDE.materials.map(m => `
                  <tr>
                    <td><strong>${escapeHtml(m.item)}</strong></td>
                    <td>${escapeHtml(m.purpose)}</td>
                    <td>${m.printable ? '✅ Yes' : `❌ No${m.alt ? ` — ${escapeHtml(m.alt)}` : ''}`}</td>
                  </tr>
                `).join('')}</tbody>
              </table>
            </div>
            <div class="guide-section">
              <h3>Sequence:</h3>
              ${BLUE_AMI_GUIDE.sequence.map(s => `
                <p><strong>${escapeHtml(s.phase)}</strong> (${s.words} words) — ${escapeHtml(s.description)}</p>
              `).join('')}
            </div>
          </div>`;

          BLUE_AMI_GUIDE.exercises.forEach(ex => {
            bodyHTML += `<div class="page guide-page">
              <h2 class="guide-title">${escapeHtml(ex.name)}</h2>
              <div class="guide-section">
                <h3>Steps:</h3>
                <ol class="exercise-steps">${ex.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
              </div>
              <div class="guide-note"><strong>Teacher Notes:</strong> ${escapeHtml(ex.notes)}</div>
            </div>`;
          });
        }

        // ========== BLEND CHART (wall poster) ==========
        if (sections.blendChart) {
          const groups = currentPhase.groups.filter(g => selectedGroups.includes(g.id || g.label));
          const chartCols = groups.length <= 6 ? 3 : groups.length <= 9 ? 3 : 4;
          bodyHTML += `<div class="page">
            <div class="section-label" style="background:${phaseColor};">Blend Chart — ${escapeHtml(phaseName)} (Display on Wall)</div>
            <div class="blend-chart" style="grid-template-columns: repeat(${chartCols}, 1fr);">
              ${groups.map(g => {
                const blend = getBlendFromLabel(g.label);
                const examples = g.words.slice(0, 3);
                return `<div class="blend-card">
                  <div class="blend-header" style="color:${phaseColor};border-bottom-color:${phaseColor}33;">${escapeHtml(blend || g.label.split(' ')[0])}</div>
                  <div class="blend-examples">${examples.map(w => `
                    <div class="be-row"><span class="be-emoji">${w.image}</span><span class="be-word">${hlWord(w.word)}</span></div>
                  `).join('')}</div>
                  <div class="blend-count">${g.words.length} words</div>
                </div>`;
              }).join('')}
            </div>
          </div>`;

          // If many groups, overflow to second page
          if (groups.length > 12) {
            bodyHTML += `<div class="page">
              <div class="section-label" style="background:${phaseColor};">Blend Chart (continued)</div>
              <div class="blend-chart" style="grid-template-columns: repeat(${chartCols}, 1fr);">
                ${groups.slice(12).map(g => {
                  const blend = getBlendFromLabel(g.label);
                  const examples = g.words.slice(0, 3);
                  return `<div class="blend-card">
                    <div class="blend-header" style="color:${phaseColor};">${escapeHtml(blend || g.label.split(' ')[0])}</div>
                    <div class="blend-examples">${examples.map(w => `
                      <div class="be-row"><span class="be-emoji">${w.image}</span><span class="be-word">${hlWord(w.word)}</span></div>
                    `).join('')}</div>
                    <div class="blend-count">${g.words.length} words</div>
                  </div>`;
                }).join('')}
              </div>
            </div>`;
          }
        }

        // ========== SHOPPING LIST ==========
        if (sections.shoppingList) {
          const groupedWords = currentPhase.groups
            .filter(g => selectedGroups.includes(g.id || g.label))
            .map(g => ({ label: g.label, words: g.words.filter(w => w.isNoun) }))
            .filter(g => g.words.length > 0);

          bodyHTML += `<div class="page shopping-page">
            <h2 style="color:${phaseColor};font-size:18px;margin-bottom:3mm;">🛒 Object Shopping List — ${escapeHtml(phaseName)}</h2>
            <p style="color:#666;font-size:10px;margin-bottom:4mm;">Miniature objects for blend boxes. No objects? Use Picture Cards instead.</p>
            ${groupedWords.map(g => `
              <div style="margin-bottom:3mm;">
                <h3 style="color:${phaseColor};font-size:12px;border-bottom:1px solid ${phaseColor}44;padding-bottom:1mm;margin-bottom:1mm;">${escapeHtml(g.label)}</h3>
                <table class="shop-table">
                  <thead><tr><th style="width:7mm;">☐</th><th style="width:25mm;">Word</th><th>Object</th><th style="width:12mm;">Pic</th></tr></thead>
                  <tbody>${g.words.map(w => `<tr>
                    <td style="text-align:center;">☐</td>
                    <td style="font-weight:bold;font-family:${ff};">${hlWord(w.word)}</td>
                    <td style="font-size:10px;color:#555;">${escapeHtml(w.miniature)}</td>
                    <td style="text-align:center;font-size:18px;">${w.image}</td>
                  </tr>`).join('')}</tbody>
                </table>
              </div>
            `).join('')}
            <div style="margin-top:4mm;border-top:1px solid #ddd;padding-top:2mm;color:#999;font-size:9px;">Total: ${nounWords.length} objects</div>
          </div>`;
        }

        // ========== CONTROL CARDS ==========
        if (sections.controlCards && cardData.length > 0) {
          const perPage = cols * 3;
          for (let i = 0; i < cardData.length; i += perPage) {
            const batch = cardData.slice(i, i + perPage);
            bodyHTML += `<div class="page">${i === 0 ? `<div class="section-label" style="background:${phaseColor};">Control Cards — Image + Word</div>` : ''}
              <div class="card-grid" style="grid-template-columns:repeat(${cols},${CARD_W}cm);margin-left:${gridML}cm;margin-top:5mm;">
              ${batch.map(c => `<div class="card control-card" style="width:${CARD_W}cm;height:${CONTROL_H}cm;">
                <div class="card-img"><img src="${c.imageUrl}" alt="${escapeHtml(c.word)}"/></div>
                <div class="card-lbl">${hlWord(c.word)}</div>
              </div>`).join('')}
              </div></div>`;
          }
        }

        // ========== PICTURE CARDS ==========
        if (sections.pictureCards && cardData.length > 0) {
          const perPage = cols * 3;
          for (let i = 0; i < cardData.length; i += perPage) {
            const batch = cardData.slice(i, i + perPage);
            bodyHTML += `<div class="page">${i === 0 ? `<div class="section-label" style="background:${phaseColor};">Picture Cards — Image Only</div>` : ''}
              <div class="card-grid" style="grid-template-columns:repeat(${cols},${CARD_W}cm);margin-left:${gridML}cm;margin-top:5mm;">
              ${batch.map(c => `<div class="card pic-card" style="width:${CARD_W}cm;height:${CARD_H}cm;">
                <div class="card-img"><img src="${c.imageUrl}" alt="${escapeHtml(c.word)}"/></div>
              </div>`).join('')}
              </div></div>`;
          }
        }

        // ========== WORD CARDS ==========
        if (sections.wordCards) {
          const perPage = 16;
          for (let i = 0; i < selectedWords.length; i += perPage) {
            const batch = selectedWords.slice(i, i + perPage);
            bodyHTML += `<div class="page">${i === 0 ? `<div class="section-label" style="background:${phaseColor};">Word Cards — For Reading &amp; Matching</div>` : ''}
              <div class="card-grid" style="grid-template-columns:repeat(4,1fr);margin:5mm 8mm 0 8mm;">
              ${batch.map(w => `<div class="card word-card" style="height:${LABEL_H + 1.5}cm;">
                <div class="card-lbl" style="height:100%;font-size:${fontSize}px;">${hlWord(w.word)}</div>
              </div>`).join('')}
              </div></div>`;
          }
        }

        // ========== OBJECT LABELS ==========
        if (sections.objectLabels && nounWords.length > 0) {
          const perPage = 30;
          for (let i = 0; i < nounWords.length; i += perPage) {
            const batch = nounWords.slice(i, i + perPage);
            bodyHTML += `<div class="page">${i === 0 ? `<div class="section-label" style="background:${phaseColor};">Object Labels</div>` : ''}
              <div class="card-grid" style="grid-template-columns:repeat(6,1fr);margin:5mm 6mm 0 6mm;">
              ${batch.map(w => `<div class="card label-card" style="height:25mm;">
                <span style="font-size:16px;">${w.image}</span>
                <span style="font-size:12px;font-weight:bold;font-family:${ff};">${hlWord(w.word)}</span>
              </div>`).join('')}
              </div></div>`;
          }
        }

        // ========== COMMAND CARDS ==========
        if (sections.commandCards && commands.length > 0) {
          for (let i = 0; i < commands.length; i += 6) {
            const batch = commands.slice(i, i + 6);
            bodyHTML += `<div class="page">${i === 0 ? `<div class="section-label" style="background:${phaseColor};">Command Cards — Reading for Meaning</div>` : ''}
              <div class="cmd-grid">
              ${batch.map(cmd => {
                const textHtml = cmd.text.split(/\b/).map((part: string) => {
                  const w = part.trim().toLowerCase();
                  if (w && phaseWordSet.has(w)) return `<strong style="color:${phaseColor};">${escapeHtml(part)}</strong>`;
                  return escapeHtml(part);
                }).join('');
                return `<div class="cmd-card">${textHtml}</div>`;
              }).join('')}
              </div></div>`;
          }
        }

        // ========== SORTING MAT ==========
        if (sections.sortingMat) {
          const groups = currentPhase.groups.filter(g => selectedGroups.includes(g.id || g.label));
          const matGroups = groups.slice(0, 6); // Max 6 columns per mat page
          bodyHTML += `<div class="page sort-page">
            <div class="section-label" style="background:${phaseColor};">Blend Sorting Mat — Place Word Cards Under the Correct Blend</div>
            <div class="sort-grid" style="grid-template-columns:repeat(${Math.min(matGroups.length, 6)}, 1fr);">
              ${matGroups.map(g => {
                const blend = getBlendFromLabel(g.label);
                return `<div class="sort-col">
                  <div class="sort-header" style="background:${phaseColor};color:white;">${escapeHtml(blend)}</div>
                  <div class="sort-slot"></div>
                  <div class="sort-slot"></div>
                  <div class="sort-slot"></div>
                  <div class="sort-slot"></div>
                  <div class="sort-slot"></div>
                </div>`;
              }).join('')}
            </div>
          </div>`;

          // Extra pages if more than 6 groups
          if (groups.length > 6) {
            const extraGroups = groups.slice(6, 12);
            bodyHTML += `<div class="page sort-page">
              <div class="section-label" style="background:${phaseColor};">Blend Sorting Mat (continued)</div>
              <div class="sort-grid" style="grid-template-columns:repeat(${Math.min(extraGroups.length, 6)}, 1fr);">
                ${extraGroups.map(g => {
                  const blend = getBlendFromLabel(g.label);
                  return `<div class="sort-col">
                    <div class="sort-header" style="background:${phaseColor};color:white;">${escapeHtml(blend)}</div>
                    <div class="sort-slot"></div><div class="sort-slot"></div><div class="sort-slot"></div><div class="sort-slot"></div><div class="sort-slot"></div>
                  </div>`;
                }).join('')}
              </div>
            </div>`;
          }
        }

        const printHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Blue Box — ${escapeHtml(phaseName)}</title>
<style>
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', system-ui, sans-serif; background: white; color: #222; }
.page { page-break-after: always; width: 21cm; min-height: 29.7cm; position: relative; overflow: hidden; padding: 8mm; }
.page:last-child { page-break-after: auto; }

.cover { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%); }
.cover-inner { text-align: center; }
.cover-emoji { font-size: 80px; margin-bottom: 10mm; }
.cover h1 { font-size: 32px; color: ${phaseColor}; font-weight: 800; }
.cover-sub { font-size: 16px; color: #666; margin-top: 3mm; }
.cover-stats { display: flex; gap: 12mm; justify-content: center; margin-top: 10mm; }
.stat { text-align: center; }
.stat-n { display: block; font-size: 36px; font-weight: 900; color: ${phaseColor}; }
.stat-l { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
.cover-foot { margin-top: 15mm; color: #aaa; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }

.section-label { color: white; font-size: 11px; font-weight: 700; padding: 2mm 4mm; margin-bottom: 3mm; letter-spacing: 0.5px; text-transform: uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

.card-grid { display: grid; gap: 0; }
.card { border: 2px solid ${bc}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.control-card { padding: ${PAD}cm; }
.pic-card { padding: ${PAD}cm; }
.word-card { padding: 2mm; }
.label-card { padding: 2mm; gap: 1mm; }
.card-img { flex: 1; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.card-img img { width: 100%; height: 100%; object-fit: contain; }
.card-lbl { width: 100%; text-align: center; font-family: ${ff}; font-size: ${fontSize}px; font-weight: bold; display: flex; align-items: center; justify-content: center; }

.cmd-grid { display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); gap: 6mm; padding: 5mm 8mm; flex: 1; }
.cmd-card { border: 3px solid ${bc}; padding: 15px; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-align: center; font-family: ${ff}; font-size: 20px; line-height: 1.6; }

.guide-page { padding: 10mm; font-size: 12px; line-height: 1.6; }
.guide-title { font-size: 18px; color: ${phaseColor}; border-bottom: 2px solid ${phaseColor}; padding-bottom: 3mm; margin-bottom: 5mm; }
.guide-section { margin-bottom: 5mm; }
.guide-section h3 { font-size: 13px; color: #333; margin-bottom: 2mm; }
.guide-section ul, .guide-section ol { padding-left: 6mm; }
.guide-section li { margin-bottom: 1.5mm; }
.guide-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 2mm; }
.guide-table th, .guide-table td { border: 1px solid #e5e7eb; padding: 2mm 3mm; text-align: left; }
.guide-table th { background: ${phaseColor}11; font-weight: 600; }
.exercise-steps li { margin-bottom: 2mm; padding-left: 1mm; }
.guide-note { background: #fef3c7; border-left: 3px solid #f59e0b; padding: 3mm 4mm; margin-top: 4mm; font-size: 11px; }

.shopping-page { font-size: 11px; }
.shop-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.shop-table th, .shop-table td { border: 1px solid #e5e7eb; padding: 1.5mm 2mm; text-align: left; }
.shop-table th { background: ${phaseColor}11; font-size: 9px; text-transform: uppercase; color: #666; }

.blend-chart { display: grid; gap: 3mm; padding: 3mm 0; }
.blend-card { border: 2px solid ${phaseColor}; border-radius: 3mm; padding: 3mm; page-break-inside: avoid; }
.blend-header { font-size: 24px; font-weight: 900; text-align: center; padding: 1mm 0; border-bottom: 1px solid; font-family: ${ff}; letter-spacing: 2px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.blend-examples { padding: 2mm 0; }
.be-row { display: flex; align-items: center; gap: 2mm; padding: 0.5mm 0; }
.be-emoji { font-size: 16px; width: 22px; text-align: center; }
.be-word { font-size: 13px; font-weight: bold; font-family: ${ff}; }
.blend-count { text-align: center; font-size: 9px; color: #999; padding-top: 1mm; border-top: 1px solid #eee; }

.sort-page { padding: 8mm; }
.sort-grid { display: grid; gap: 3mm; height: calc(29.7cm - 22mm); }
.sort-col { display: flex; flex-direction: column; gap: 2mm; }
.sort-header { font-size: 20px; font-weight: 900; text-align: center; padding: 3mm; border-radius: 3mm; font-family: ${ff}; letter-spacing: 2px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sort-slot { flex: 1; border: 2px dashed ${phaseColor}44; border-radius: 2mm; min-height: 30mm; }

@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { margin: 0; padding: 0; }
}
@media screen {
  body { padding: 20px; background: #f5f5f5; }
  .page { background: white; margin: 0 auto 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-radius: 4px; }
}
</style></head><body>${bodyHTML}</body></html>`;

        printWindow.document.write(printHTML);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      } catch (err) {
        console.error('Print error:', err);
      }
      setPrinting(false);
    }, 100);
  }, [selectedWords, nounWords, commands, currentPhase, borderColor, fontSize, printMode, photoMap, selectedGroups, highlightBlends, wordToGroup]);

  // =====================================================================
  // UI
  // =====================================================================

  const modeLabels: Record<PrintMode, { icon: string; label: string; desc: string }> = {
    'full-set': { icon: '📦', label: 'Print EVERYTHING', desc: `Guide + blend chart + ${nounWords.length} object cards + ${selectedWords.length} word cards + ${commands.length} commands + sorting mat` },
    'presentation-guide': { icon: '📖', label: 'Presentation Guide', desc: 'AMI exercises, materials list, sequence, the key rule' },
    'blend-chart': { icon: '📊', label: 'Blend Chart (Wall Poster)', desc: `${currentPhase?.groups.length || 0} blends with example words — display on wall` },
    'shopping-list': { icon: '🛒', label: 'Shopping List', desc: `${nounWords.length} miniature objects checklist` },
    'control-cards': { icon: '🃏', label: 'Control Cards (3-Part)', desc: `${nounWords.length} image + word reference cards` },
    'picture-cards': { icon: '🖼️', label: 'Picture Cards', desc: `${nounWords.length} image-only matching cards` },
    'word-cards': { icon: '📝', label: 'Word Cards', desc: `${selectedWords.length} reading cards with blend highlighting` },
    'object-labels': { icon: '🏷️', label: 'Object Labels', desc: `${nounWords.length} small labels for shelf` },
    'command-cards': { icon: '📋', label: 'Command Cards', desc: `${commands.length} action sentences` },
    'sorting-mat': { icon: '🔀', label: 'Blend Sorting Mat', desc: 'Workspace for sorting word cards by blend type' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/montree/library/tools/phonics-fast" className="inline-flex items-center text-blue-200 text-sm font-medium hover:text-white transition-colors mb-3">
            <span className="mr-2">←</span> Back to Phonics Fast
          </Link>
          <div>
            <h1 className="text-3xl font-bold">💙 Blue Phonics Box</h1>
            <p className="text-blue-100 mt-2 text-sm max-w-xl">
              Complete AMI-standard material set for consonant blends, final clusters, and double consonants. Every letter still makes its own sound.
            </p>
            <div className="flex gap-3 mt-3 flex-wrap">
              {BLUE_PHASES.map(p => (
                <span key={p.id} className="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-medium">
                  {p.name.split('—')[0].trim()}: {p.groups.flatMap(g => g.words).length} words
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <details className="group">
            <summary className="cursor-pointer font-semibold text-blue-800 text-sm flex items-center gap-2">
              <span>📖</span> AMI Blue Series Overview
              <span className="text-xs text-blue-400 group-open:hidden ml-1">(tap to expand)</span>
            </summary>
            <div className="mt-3 text-sm text-blue-900 space-y-2 leading-relaxed max-w-3xl">
              <p><strong>The Blue Series</strong> extends reading to 4+ letter words where every letter still makes its own sound. Consonant blends sit together without a vowel: &quot;s-t-o-p&quot; has four distinct sounds.</p>
              <p><strong>Key Rule:</strong> No digraphs here (sh, ch, th go in Green). No phonograms. No silent letters. Every letter is sounded individually.</p>
              <p><strong>Three sub-phases:</strong> Blue 1 = initial blends (bl-, cr-, str-). Blue 2 = final blends (-mp, -nk, -ft). Blue 3 = double consonants (-ll, -ss, -ck).</p>
              <p><strong>New material:</strong> The Blend Chart and Sorting Mat. The chart goes on the wall as reference. The sorting mat is a hands-on exercise where children read words and classify them by blend.</p>
            </div>
          </details>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
              <h2 className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-3">💙 Select Phase</h2>
              <div className="flex flex-col gap-2">
                {BLUE_PHASES.map(phase => (
                  <button key={phase.id} onClick={() => setSelectedPhase(phase.id)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${selectedPhase === phase.id ? 'text-white shadow-md ring-2 ring-offset-2' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                    style={selectedPhase === phase.id ? { backgroundColor: phase.color } : undefined}>
                    <span className="font-bold block">{phase.name}</span>
                    <span className="text-xs opacity-90">{phase.groups.flatMap(g => g.words).length} words • {phase.groups.length} blend groups</span>
                  </button>
                ))}
              </div>
            </div>

            {currentPhase && (
              <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
                <h2 className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-3">🔤 Blend Groups</h2>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {currentPhase.groups.map(group => {
                    const gKey = group.id || group.label;
                    return (
                      <label key={gKey} className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-2"
                        style={{ borderColor: selectedGroups.includes(gKey) ? currentPhase.color : '#e5e7eb', backgroundColor: selectedGroups.includes(gKey) ? currentPhase.color + '08' : 'transparent' }}>
                        <input type="checkbox" checked={selectedGroups.includes(gKey)}
                          onChange={() => setSelectedGroups(prev => prev.includes(gKey) ? prev.filter(id => id !== gKey) : [...prev, gKey])}
                          className="w-4 h-4 rounded cursor-pointer" />
                        <span className="ml-2 flex-1">
                          <span className="font-medium text-gray-800 text-sm">{group.label}</span>
                          <span className="text-xs text-gray-500 block">{group.words.length} words</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
              <h2 className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-3">🖨️ What to Print</h2>
              <div className="space-y-2">
                {(Object.entries(modeLabels) as [PrintMode, typeof modeLabels[PrintMode]][]).map(([value, mode]) => (
                  <button key={value} onClick={() => setPrintMode(value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${printMode === value ? 'bg-blue-50 border-2 border-blue-400 text-blue-800 font-bold' : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                    <span className="mr-2">{mode.icon}</span>{mode.label}
                    <span className="block text-xs mt-0.5 opacity-60 font-normal">{mode.desc}</span>
                  </button>
                ))}
              </div>

              {!['presentation-guide', 'shopping-list'].includes(printMode) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div>
                    <label className="font-semibold text-gray-700 text-xs block mb-2 uppercase">Border Color</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={borderColorHex} onChange={e => { setBorderColor(e.target.value); setBorderColorHex(e.target.value); }}
                        className="w-10 h-8 rounded cursor-pointer border border-gray-300" />
                      <div className="flex gap-1">
                        {['#3B82F6', '#2563eb', '#1D4ED8', '#0D3330', '#000000'].map(c => (
                          <button key={c} onClick={() => { setBorderColor(c); setBorderColorHex(c); }}
                            className="w-6 h-6 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={highlightBlends} onChange={e => setHighlightBlends(e.target.checked)} className="w-4 h-4 rounded" />
                    Highlight blend in color
                  </label>
                </div>
              )}

              <button onClick={handlePrint} disabled={selectedWords.length === 0 || printing}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold text-sm hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                {printing ? '⏳ Generating...' : `🖨️ ${printMode === 'full-set' ? 'Print EVERYTHING' : `Print ${modeLabels[printMode].label}`}`}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="mb-4 pb-4 border-b border-gray-200 flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-blue-700">{selectedWords.length}</span>
                <span className="text-gray-600">words selected</span>
                <span className="text-sm text-gray-400">({nounWords.length} nouns • {currentPhase?.groups.length || 0} blend groups • {commands.length} commands)</span>
              </div>

              {selectedWords.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-4">💙</div>
                  <p className="text-lg font-medium">Select blend groups to preview</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentPhase.groups
                    .filter(g => selectedGroups.includes(g.id || g.label))
                    .map(group => {
                      const blend = getBlendFromLabel(group.label);
                      return (
                        <div key={group.id || group.label}>
                          <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: currentPhase.color }} />
                            {group.label}
                            {group.description && <span className="text-xs text-gray-400 font-normal">{group.description}</span>}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {group.words.map(w => (
                              <div key={w.word} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 transition-colors">
                                <span className="text-lg">{w.image}</span>
                                <span className="font-bold text-gray-800" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
                                  {blend && w.word.toLowerCase().startsWith(blend.toLowerCase()) ? (
                                    <><span className="text-blue-600">{w.word.slice(0, blend.length)}</span>{w.word.slice(blend.length)}</>
                                  ) : blend && w.word.toLowerCase().endsWith(blend.toLowerCase()) ? (
                                    <>{w.word.slice(0, w.word.length - blend.length)}<span className="text-blue-600">{w.word.slice(w.word.length - blend.length)}</span></>
                                  ) : w.word}
                                </span>
                                {w.isNoun && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">object</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                  {commands.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0 bg-amber-500" />
                        Command Cards ({commands.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {commands.map((cmd, i) => (
                          <span key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1.5 rounded-lg font-medium">{cmd.text}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
