// /montree/library/tools/phonics-fast/pink-box/page.tsx
// Pink Phonics Box — Complete AMI-standard material preparation system
// Everything a teacher needs to build a full Pink Series from scratch
// Printables: 3-Part Cards, Object Cards, Word Cards, Labels, Shopping List,
//             Presentation Sequence Guide, Command Cards, Movable Alphabet Mat
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
  | 'full-set'           // EVERYTHING for the phase — the "Print All" button
  | 'shopping-list'      // Miniature object checklist
  | 'control-cards'      // 3-part: image + word (the reference card)
  | 'picture-cards'      // 3-part: image only
  | 'word-cards'         // 3-part: word only (for matching to objects/pictures)
  | 'object-labels'      // Small labels to place beside miniature objects
  | 'command-cards'      // Action sentences using phase words
  | 'movable-alpha-mat'  // Workspace mat for movable alphabet exercise
  | 'presentation-guide'; // Step-by-step AMI presentation sequence

const PINK_PHASES = ALL_PHASES.filter(p => p.id.startsWith('pink'));

// Emoji→canvas for reliable print rendering
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
// AMI PRESENTATION GUIDE DATA
// =====================================================================

const PINK_AMI_GUIDE = {
  prerequisites: [
    'Child knows letter sounds (not names) through Sandpaper Letters',
    'Child can identify beginning sounds in spoken words (I Spy game mastery)',
    'Child shows interest in combining sounds — often spontaneous',
  ],
  materials: [
    { item: 'Pink box or basket', purpose: 'Container for all Pink Series materials', printable: false },
    { item: 'Miniature objects (3-5 per tray)', purpose: 'Concrete objects the child can name and touch', printable: false, alt: 'Print Picture Cards as substitute' },
    { item: 'Word cards (matching each object)', purpose: 'Child reads by sounding out and matches to object', printable: true },
    { item: 'Control cards (picture + word)', purpose: 'Self-correction: child checks their own matching', printable: true },
    { item: 'Movable Alphabet', purpose: 'Child builds words before reading them', printable: false, alt: 'Print letter tiles or use sandpaper letters' },
    { item: 'Mat or felt square', purpose: 'Defines workspace, left-to-right orientation', printable: true },
  ],
  exercises: [
    {
      name: 'Exercise 1: Object Box — Reading',
      steps: [
        'Invite child: "I have something special to show you."',
        'Place 3 objects on the mat. Child names each one aloud.',
        'Place matching word cards face-down in a pile.',
        'Child takes top card, sounds out each letter: "c... a... t — cat!"',
        'Child places word card beside matching object.',
        'Repeat until all cards matched.',
        'Self-check: Child uses control cards (picture+word) to verify.',
      ],
      notes: 'Start with 3 objects. Increase to 5 when child shows confidence. Always use objects the child can NAME — never introduce an unfamiliar object.',
    },
    {
      name: 'Exercise 2: Object Box — Writing (Encoding)',
      steps: [
        'Place 3 objects on the mat. No word cards this time.',
        'Child picks an object and says the word slowly.',
        'Using Movable Alphabet, child builds the word sound by sound.',
        'Child reads back what they built.',
        'Repeat for remaining objects.',
        'Optional: Child writes the word on paper after building with MA.',
      ],
      notes: 'Writing before reading is the AMI sequence. The child "writes" (encodes) with the Movable Alphabet, then "reads" (decodes) word cards. Both exercises should run in parallel.',
    },
    {
      name: 'Exercise 3: Command Cards — Reading for Meaning',
      steps: [
        'Place a command card face-down.',
        'Child reads the card silently, then performs the action.',
        'Other children (or teacher) guess what the card said.',
        'Child reveals the card to confirm.',
      ],
      notes: 'Command cards prove the child reads for MEANING, not just decoding. Start with single-action commands ("Sit on the mat"), progress to two-action ("Get the cup and put it on the mat").',
    },
  ],
  sequence: [
    { phase: 'Pink 1 (CMAT Trays)', description: 'Letters introduced in optimized order: c,m,a,t → d,n,e,k → s,r,i,p → h,u,j,l → b,f,o,g → v,w,x,y,z,q. Only 18 words. Child succeeds immediately.', words: 18 },
    { phase: 'Pink 2 (Full CVC)', description: 'All short vowel CVC words organized by vowel sound. 99 words across 5 groups. Child works through one vowel group at a time.', words: 99 },
  ],
  errorControl: 'The control cards (picture + word together) serve as self-correction. The child matches their word cards to objects, then checks against control cards independently. The teacher does NOT correct — the material does.',
  parallelWork: 'While working through Pink Series, the child simultaneously continues: Sandpaper Letters (any not yet mastered), I Spy games (middle/end sounds), Metal Insets (hand preparation for writing), Sand Tray (letter formation practice).',
};

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export default function PinkBoxPage() {
  const searchParams = useSearchParams();
  const initialPhase = searchParams.get('phase') || 'pink1';

  const [selectedPhase, setSelectedPhase] = useState(initialPhase.startsWith('pink') ? initialPhase : 'pink1');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<PrintMode>('full-set');
  const [borderColor, setBorderColor] = useState('#ec4899');
  const [borderColorHex, setBorderColorHex] = useState('#ec4899');
  const [fontSize, setFontSize] = useState(24);
  const [printing, setPrinting] = useState(false);

  // Photo Bank
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const controller = new AbortController();
    resolvePhotoBankImages(controller.signal).then((map) => {
      if (!controller.signal.aborted) setPhotoMap(map);
    });
    return () => { controller.abort(); };
  }, []);

  const currentPhase = PINK_PHASES.find(p => p.id === selectedPhase) || PINK_PHASES[0];

  // Select all groups by default
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
  const commands = useMemo(() => getCommands(currentPhase?.id || 'pink1'), [currentPhase]);

  // =====================================================================
  // PRINT GENERATION
  // =====================================================================

  const handlePrint = useCallback(() => {
    if (selectedWords.length === 0) return;
    setPrinting(true);

    setTimeout(() => {
      try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { setPrinting(false); return; }

        const phaseName = currentPhase?.name || 'Pink Box';
        const phaseColor = currentPhase?.color || '#ec4899';
        const bc = borderColor;
        const ff = "'Comic Sans MS', 'Chalkboard SE', cursive";

        // Build card data with photo > emoji fallback
        const cardData = nounWords.map(w => ({
          word: w.word,
          image: w.image,
          miniature: w.miniature,
          imageUrl: photoMap.get(w.word.toLowerCase()) || w.customImageUrl || emojiToDataUrl(w.image),
        }));

        // Phase word set for command highlighting
        const phaseWordSet = new Set(selectedWords.map(w => w.word.toLowerCase()));

        // Determine which sections to include
        const isFull = printMode === 'full-set';
        const sections = {
          shoppingList: isFull || printMode === 'shopping-list',
          controlCards: isFull || printMode === 'control-cards',
          pictureCards: isFull || printMode === 'picture-cards',
          wordCards: isFull || printMode === 'word-cards',
          objectLabels: isFull || printMode === 'object-labels',
          commandCards: (isFull || printMode === 'command-cards') && commands.length > 0,
          movableAlphaMat: isFull || printMode === 'movable-alpha-mat',
          presentationGuide: isFull || printMode === 'presentation-guide',
        };

        // Card dimensions (cm)
        const A4W = 21, A4H = 29.7;
        const CARD_W = 6.5, CARD_H = 6.5, LABEL_H = 2;
        const CONTROL_H = CARD_H + LABEL_H + 0.3;
        const PAD = 0.3, RAD = 0.3;
        const cols = 3;
        const gridML = (A4W - CARD_W * cols) / 2;

        let bodyHTML = '';

        // ========== COVER PAGE ==========
        if (isFull) {
          bodyHTML += `<div class="page cover">
            <div class="cover-inner">
              <div class="cover-emoji">🩷</div>
              <h1>${escapeHtml(phaseName)}</h1>
              <p class="cover-sub">Complete AMI Material Set</p>
              <div class="cover-stats">
                <div class="stat"><span class="stat-n">${nounWords.length}</span><span class="stat-l">Object Cards</span></div>
                <div class="stat"><span class="stat-n">${selectedWords.length}</span><span class="stat-l">Word Cards</span></div>
                <div class="stat"><span class="stat-n">${commands.length}</span><span class="stat-l">Commands</span></div>
              </div>
              <p class="cover-foot">Print • Cut • Laminate • Teach</p>
            </div>
          </div>`;
        }

        // ========== PRESENTATION GUIDE ==========
        if (sections.presentationGuide) {
          bodyHTML += `<div class="page guide-page">
            <h2 class="guide-title">📖 AMI Presentation Guide — Pink Series</h2>
            <div class="guide-section">
              <h3>Prerequisites (child should demonstrate):</h3>
              <ul>${PINK_AMI_GUIDE.prerequisites.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
            </div>
            <div class="guide-section">
              <h3>Materials Needed:</h3>
              <table class="guide-table">
                <thead><tr><th>Material</th><th>Purpose</th><th>Printable?</th></tr></thead>
                <tbody>${PINK_AMI_GUIDE.materials.map(m => `
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
              ${PINK_AMI_GUIDE.sequence.map(s => `
                <p><strong>${escapeHtml(s.phase)}</strong> (${s.words} words) — ${escapeHtml(s.description)}</p>
              `).join('')}
            </div>
            <div class="guide-section" style="margin-top:3mm;">
              <h3>Error Control:</h3>
              <p>${escapeHtml(PINK_AMI_GUIDE.errorControl)}</p>
            </div>
          </div>`;

          // Exercises pages
          PINK_AMI_GUIDE.exercises.forEach(ex => {
            bodyHTML += `<div class="page guide-page">
              <h2 class="guide-title">${escapeHtml(ex.name)}</h2>
              <div class="guide-section">
                <h3>Steps:</h3>
                <ol class="exercise-steps">${ex.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
              </div>
              <div class="guide-note">
                <strong>Teacher Notes:</strong> ${escapeHtml(ex.notes)}
              </div>
            </div>`;
          });

          // Parallel work page
          bodyHTML += `<div class="page guide-page">
            <h2 class="guide-title">🔄 Parallel Work During Pink Series</h2>
            <div class="guide-section">
              <p style="font-size: 13px; line-height: 1.8;">${escapeHtml(PINK_AMI_GUIDE.parallelWork)}</p>
            </div>
            <div class="guide-section">
              <h3>Materials You Already Have (No Printing Needed):</h3>
              <ul>
                <li><strong>Sandpaper Letters</strong> — Continue any letters not yet mastered</li>
                <li><strong>Sand Tray</strong> — Letter formation practice (pairs with Sandpaper Letters)</li>
                <li><strong>Metal Insets</strong> — Hand control preparation for writing</li>
                <li><strong>I Spy Game</strong> — Advance to middle and ending sounds</li>
              </ul>
            </div>
            <div class="guide-section">
              <h3>What to Print from This Set:</h3>
              <ul>
                <li>✅ <strong>Control Cards</strong> (picture + word) — for self-correction</li>
                <li>✅ <strong>Picture Cards</strong> (image only) — matching exercise</li>
                <li>✅ <strong>Word Cards</strong> (text only) — the reading cards</li>
                <li>✅ <strong>Object Labels</strong> — place beside miniatures on shelf</li>
                <li>✅ <strong>Command Cards</strong> — reading for meaning</li>
                <li>✅ <strong>Movable Alphabet Mat</strong> — workspace for word building</li>
                <li>📋 <strong>Shopping List</strong> — guide for buying miniature objects</li>
              </ul>
            </div>
          </div>`;
        }

        // ========== SHOPPING LIST ==========
        if (sections.shoppingList) {
          const groupedWords = currentPhase.groups
            .filter(g => selectedGroups.includes(g.id || g.label))
            .map(g => ({ label: g.label, description: g.description, words: g.words.filter(w => w.isNoun) }))
            .filter(g => g.words.length > 0);

          bodyHTML += `<div class="page shopping-page">
            <h2 style="color: ${phaseColor}; font-size: 18px; margin-bottom: 3mm;">🛒 Object Shopping List — ${escapeHtml(phaseName)}</h2>
            <p style="color: #666; font-size: 10px; margin-bottom: 4mm;">Miniature objects for sound boxes. Tip: Check 1688.com, AliExpress, or dollar stores. "仿真迷你小摆件" is a great search term.</p>
            ${groupedWords.map(g => `
              <div style="margin-bottom: 4mm;">
                <h3 style="color: ${phaseColor}; font-size: 12px; border-bottom: 1px solid ${phaseColor}44; padding-bottom: 1mm; margin-bottom: 2mm;">${escapeHtml(g.label)}</h3>
                <table class="shop-table">
                  <thead><tr><th style="width:7mm;">☐</th><th style="width:22mm;">Word</th><th>Object to Buy</th><th style="width:12mm;">Pic</th></tr></thead>
                  <tbody>${g.words.map(w => `<tr>
                    <td style="text-align:center;">☐</td>
                    <td style="font-weight:bold;font-family:${ff};">${escapeHtml(w.word)}</td>
                    <td style="font-size:10px;color:#555;">${escapeHtml(w.miniature)}</td>
                    <td style="text-align:center;font-size:18px;">${w.image}</td>
                  </tr>`).join('')}</tbody>
                </table>
              </div>
            `).join('')}
            <div style="margin-top: 4mm; border-top: 1px solid #ddd; padding-top: 2mm; color: #999; font-size: 9px;">
              Total: ${nounWords.length} objects • ${escapeHtml(phaseName)} • No objects? Use the Picture Cards as substitutes.
            </div>
          </div>`;
        }

        // ========== CONTROL CARDS (3-Part: Image + Word) ==========
        if (sections.controlCards && cardData.length > 0) {
          const perPage = cols * 3;
          for (let i = 0; i < cardData.length; i += perPage) {
            const batch = cardData.slice(i, i + perPage);
            if (i === 0) {
              bodyHTML += `<div class="page"><div class="section-label" style="background:${phaseColor};">Control Cards — Image + Word (self-correction reference)</div>`;
            } else {
              bodyHTML += '<div class="page">';
            }
            bodyHTML += `<div class="card-grid" style="grid-template-columns: repeat(${cols}, ${CARD_W}cm); margin-left: ${gridML}cm; margin-top: 5mm;">`;
            batch.forEach(c => {
              bodyHTML += `<div class="card control-card" style="width:${CARD_W}cm;height:${CONTROL_H}cm;">
                <div class="card-img"><img src="${c.imageUrl}" alt="${escapeHtml(c.word)}" /></div>
                <div class="card-lbl">${escapeHtml(c.word)}</div>
              </div>`;
            });
            bodyHTML += '</div></div>';
          }
        }

        // ========== PICTURE CARDS (Image Only) ==========
        if (sections.pictureCards && cardData.length > 0) {
          const perPage = cols * 3;
          for (let i = 0; i < cardData.length; i += perPage) {
            const batch = cardData.slice(i, i + perPage);
            if (i === 0) {
              bodyHTML += `<div class="page"><div class="section-label" style="background:${phaseColor};">Picture Cards — Image Only (for matching to word cards)</div>`;
            } else {
              bodyHTML += '<div class="page">';
            }
            bodyHTML += `<div class="card-grid" style="grid-template-columns: repeat(${cols}, ${CARD_W}cm); margin-left: ${gridML}cm; margin-top: 5mm;">`;
            batch.forEach(c => {
              bodyHTML += `<div class="card pic-card" style="width:${CARD_W}cm;height:${CARD_H}cm;">
                <div class="card-img"><img src="${c.imageUrl}" alt="${escapeHtml(c.word)}" /></div>
              </div>`;
            });
            bodyHTML += '</div></div>';
          }
        }

        // ========== WORD CARDS (Text Only) ==========
        if (sections.wordCards) {
          const allWordCards = selectedWords; // ALL words, not just nouns
          const perPage = 4 * 4; // 4 cols × 4 rows
          for (let i = 0; i < allWordCards.length; i += perPage) {
            const batch = allWordCards.slice(i, i + perPage);
            if (i === 0) {
              bodyHTML += `<div class="page"><div class="section-label" style="background:${phaseColor};">Word Cards — For Reading & Matching to Objects</div>`;
            } else {
              bodyHTML += '<div class="page">';
            }
            bodyHTML += `<div class="card-grid" style="grid-template-columns: repeat(4, 1fr); margin: 5mm 8mm 0 8mm;">`;
            batch.forEach(w => {
              bodyHTML += `<div class="card word-card" style="height:${LABEL_H + 1.5}cm;">
                <div class="card-lbl" style="height:100%;font-size:${fontSize}px;">${escapeHtml(w.word)}</div>
              </div>`;
            });
            bodyHTML += '</div></div>';
          }
        }

        // ========== OBJECT LABELS ==========
        if (sections.objectLabels && nounWords.length > 0) {
          const perPage = 6 * 5; // 6 cols × 5 rows
          for (let i = 0; i < nounWords.length; i += perPage) {
            const batch = nounWords.slice(i, i + perPage);
            if (i === 0) {
              bodyHTML += `<div class="page"><div class="section-label" style="background:${phaseColor};">Object Labels — Place Beside Miniatures on Shelf</div>`;
            } else {
              bodyHTML += '<div class="page">';
            }
            bodyHTML += `<div class="card-grid" style="grid-template-columns: repeat(6, 1fr); margin: 5mm 6mm 0 6mm;">`;
            batch.forEach(w => {
              bodyHTML += `<div class="card label-card" style="height:25mm;">
                <span style="font-size:16px;">${w.image}</span>
                <span style="font-size:12px;font-weight:bold;font-family:${ff};">${escapeHtml(w.word)}</span>
              </div>`;
            });
            bodyHTML += '</div></div>';
          }
        }

        // ========== COMMAND CARDS ==========
        if (sections.commandCards && commands.length > 0) {
          for (let i = 0; i < commands.length; i += 6) {
            const batch = commands.slice(i, i + 6);
            if (i === 0) {
              bodyHTML += `<div class="page"><div class="section-label" style="background:${phaseColor};">Command Cards — Reading for Meaning</div>`;
            } else {
              bodyHTML += '<div class="page">';
            }
            bodyHTML += '<div class="cmd-grid">';
            batch.forEach(cmd => {
              const textHtml = cmd.text.split(/\b/).map((part: string) => {
                const w = part.trim().toLowerCase();
                if (w && phaseWordSet.has(w)) return `<strong style="color:${phaseColor};">${escapeHtml(part)}</strong>`;
                return escapeHtml(part);
              }).join('');
              bodyHTML += `<div class="cmd-card">${textHtml}</div>`;
            });
            bodyHTML += '</div></div>';
          }
        }

        // ========== MOVABLE ALPHABET MAT ==========
        if (sections.movableAlphaMat) {
          bodyHTML += `<div class="page mat-page">
            <div class="mat-header">Movable Alphabet Workspace — ${escapeHtml(phaseName)}</div>
            <div class="mat-area">
              <div class="mat-row">
                <div class="mat-box"></div>
                <div class="mat-box"></div>
                <div class="mat-box"></div>
              </div>
              <div class="mat-arrow">→</div>
              <div class="mat-word-line"></div>
              <div class="mat-label">Build the word here, then read it back</div>
              <div class="mat-row" style="margin-top: 15mm;">
                <div class="mat-box"></div>
                <div class="mat-box"></div>
                <div class="mat-box"></div>
              </div>
              <div class="mat-arrow">→</div>
              <div class="mat-word-line"></div>
              <div class="mat-label">Build the word here, then read it back</div>
              <div class="mat-row" style="margin-top: 15mm;">
                <div class="mat-box"></div>
                <div class="mat-box"></div>
                <div class="mat-box"></div>
              </div>
              <div class="mat-arrow">→</div>
              <div class="mat-word-line"></div>
              <div class="mat-label">Build the word here, then read it back</div>
            </div>
            <div class="mat-footer">CVC = Consonant • Vowel • Consonant — Sound out each letter, then blend</div>
          </div>`;
        }

        // ========== ASSEMBLE DOCUMENT ==========
        const printHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Pink Box — ${escapeHtml(phaseName)}</title>
<style>
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', system-ui, sans-serif; background: white; color: #222; }
.page { page-break-after: always; width: 21cm; min-height: 29.7cm; position: relative; overflow: hidden; padding: 8mm; }
.page:last-child { page-break-after: auto; }

/* Cover */
.cover { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%); }
.cover-inner { text-align: center; }
.cover-emoji { font-size: 80px; margin-bottom: 10mm; }
.cover h1 { font-size: 32px; color: ${phaseColor}; font-weight: 800; }
.cover-sub { font-size: 16px; color: #666; margin-top: 3mm; }
.cover-stats { display: flex; gap: 15mm; justify-content: center; margin-top: 10mm; }
.stat { text-align: center; }
.stat-n { display: block; font-size: 36px; font-weight: 900; color: ${phaseColor}; }
.stat-l { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
.cover-foot { margin-top: 15mm; color: #aaa; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }

/* Section Labels */
.section-label { color: white; font-size: 11px; font-weight: 700; padding: 2mm 4mm; margin-bottom: 3mm; letter-spacing: 0.5px; text-transform: uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* Card Grid */
.card-grid { display: grid; gap: 0; }
.card { border: 2px solid ${bc}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.control-card { padding: ${PAD}cm; }
.pic-card { padding: ${PAD}cm; }
.word-card { padding: 2mm; }
.label-card { padding: 2mm; gap: 1mm; }
.card-img { flex: 1; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.card-img img { width: 100%; height: 100%; object-fit: contain; }
.card-lbl { width: 100%; text-align: center; font-family: ${ff}; font-size: ${fontSize}px; font-weight: bold; display: flex; align-items: center; justify-content: center; }

/* Command Cards */
.cmd-grid { display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); gap: 6mm; padding: 5mm 8mm; width: 100%; flex: 1; }
.cmd-card { border: 3px solid ${bc}; padding: 15px; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-align: center; font-family: ${ff}; font-size: 20px; line-height: 1.6; }

/* Guide Pages */
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

/* Shopping List */
.shopping-page { font-size: 11px; }
.shop-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.shop-table th, .shop-table td { border: 1px solid #e5e7eb; padding: 1.5mm 2mm; text-align: left; }
.shop-table th { background: ${phaseColor}11; font-size: 9px; text-transform: uppercase; color: #666; }

/* Movable Alphabet Mat */
.mat-page { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 12mm; }
.mat-header { font-size: 16px; font-weight: 800; color: ${phaseColor}; margin-bottom: 8mm; text-align: center; }
.mat-area { width: 18cm; }
.mat-row { display: flex; gap: 4mm; justify-content: center; }
.mat-box { width: 40mm; height: 40mm; border: 3px dashed ${bc}; border-radius: 4mm; }
.mat-arrow { text-align: center; font-size: 28px; color: ${phaseColor}; margin: 3mm 0; }
.mat-word-line { width: 100%; height: 1px; border-bottom: 2px solid #ccc; margin-bottom: 2mm; }
.mat-label { text-align: center; font-size: 10px; color: #999; margin-bottom: 4mm; }
.mat-footer { text-align: center; font-size: 11px; color: #666; margin-top: auto; padding-bottom: 10mm; border-top: 1px solid #eee; padding-top: 4mm; width: 100%; }

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
  }, [selectedWords, nounWords, commands, currentPhase, borderColor, fontSize, printMode, photoMap, selectedGroups]);

  // =====================================================================
  // UI
  // =====================================================================

  const modeLabels: Record<PrintMode, { icon: string; label: string; desc: string }> = {
    'full-set': { icon: '📦', label: 'Print EVERYTHING', desc: `Complete set: guide + ${nounWords.length} object cards + ${selectedWords.length} word cards + ${commands.length} commands + mat + shopping list` },
    'presentation-guide': { icon: '📖', label: 'Presentation Guide', desc: 'AMI step-by-step exercises, materials list, prerequisites, sequence' },
    'shopping-list': { icon: '🛒', label: 'Shopping List', desc: `Checklist of ${nounWords.length} miniature objects to buy` },
    'control-cards': { icon: '🃏', label: 'Control Cards (3-Part)', desc: `${nounWords.length} cards with image + word — self-correction reference` },
    'picture-cards': { icon: '🖼️', label: 'Picture Cards', desc: `${nounWords.length} image-only cards for matching exercise` },
    'word-cards': { icon: '📝', label: 'Word Cards', desc: `${selectedWords.length} text-only cards — the reading cards children sound out` },
    'object-labels': { icon: '🏷️', label: 'Object Labels', desc: `${nounWords.length} small labels to place beside miniatures on shelf` },
    'command-cards': { icon: '📋', label: 'Command Cards', desc: `${commands.length} action sentences for reading-for-meaning` },
    'movable-alpha-mat': { icon: '🔤', label: 'Movable Alphabet Mat', desc: 'Printable workspace for building CVC words with letter tiles' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-800 to-pink-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/montree/library/tools/phonics-fast" className="inline-flex items-center text-pink-200 text-sm font-medium hover:text-white transition-colors mb-3">
            <span className="mr-2">←</span> Back to Phonics Fast
          </Link>
          <div>
            <h1 className="text-3xl font-bold">🩷 Pink Phonics Box</h1>
            <p className="text-pink-100 mt-2 text-sm max-w-xl">
              Complete AMI-standard material set for CVC words. Print everything you need to build a full Pink Series — guide, cards, labels, commands, and workspace mats.
            </p>
            <div className="flex gap-3 mt-3">
              {PINK_PHASES.map(p => (
                <span key={p.id} className="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-medium">
                  {p.name.split('—')[0].trim()}: {p.groups.flatMap(g => g.words).length} words
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* AMI Quick Reference */}
      <div className="bg-pink-50 border-b border-pink-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <details className="group">
            <summary className="cursor-pointer font-semibold text-pink-800 text-sm flex items-center gap-2">
              <span>📖</span> AMI Pink Series Overview
              <span className="text-xs text-pink-400 group-open:hidden ml-1">(tap to expand)</span>
            </summary>
            <div className="mt-3 text-sm text-pink-900 space-y-2 leading-relaxed max-w-3xl">
              <p><strong>The Pink Series</strong> introduces CVC (consonant-vowel-consonant) words — the first words children read. It follows the AMI principle that <em>writing comes before reading</em>: children first build words with the Movable Alphabet (encoding), then read word cards (decoding).</p>
              <p><strong>You need 3 things you cannot print:</strong> Sandpaper Letters, a Sand Tray, and Metal Insets. Everything else — word cards, picture cards, control cards, command cards, labels, and workspace mats — is printable from this page.</p>
              <p><strong>If you don&apos;t have miniature objects:</strong> Use the Picture Cards as stand-ins. The child matches word cards to pictures instead of objects. Not as tactile, but effective.</p>
              <p><strong>Sequence:</strong> Pink 1 (CMAT Trays, 18 words) introduces letters in an optimized order so children succeed immediately. Pink 2 (99 words) covers all short vowels systematically.</p>
            </div>
          </details>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Phase */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
              <h2 className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-3">🩷 Select Phase</h2>
              <div className="flex flex-col gap-2">
                {PINK_PHASES.map(phase => (
                  <button key={phase.id} onClick={() => setSelectedPhase(phase.id)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${selectedPhase === phase.id ? 'text-white shadow-md ring-2 ring-offset-2' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                    style={selectedPhase === phase.id ? { backgroundColor: phase.color, ringColor: phase.color } : undefined}>
                    <span className="font-bold block">{phase.name}</span>
                    <span className="text-xs opacity-90">{phase.groups.flatMap(g => g.words).length} words • {phase.groups.flatMap(g => g.words).filter(w => w.isNoun).length} objects</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Groups */}
            {currentPhase && (
              <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
                <h2 className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-3">🔤 Word Groups</h2>
                <div className="space-y-2">
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
                          <span className="text-xs text-gray-500 block">{group.words.length} words • {group.words.filter(w => w.isNoun).length} objects</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Print Mode */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100">
              <h2 className="font-bold text-gray-800 text-xs uppercase tracking-wide mb-3">🖨️ What to Print</h2>
              <div className="space-y-2">
                {(Object.entries(modeLabels) as [PrintMode, typeof modeLabels[PrintMode]][]).map(([value, mode]) => (
                  <button key={value} onClick={() => setPrintMode(value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${printMode === value ? 'bg-pink-50 border-2 border-pink-400 text-pink-800 font-bold' : 'bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                    <span className="mr-2">{mode.icon}</span>{mode.label}
                    <span className="block text-xs mt-0.5 opacity-60 font-normal">{mode.desc}</span>
                  </button>
                ))}
              </div>

              {/* Border color for card modes */}
              {!['presentation-guide', 'shopping-list'].includes(printMode) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="font-semibold text-gray-700 text-xs block mb-2 uppercase">Border Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={borderColorHex} onChange={e => { setBorderColor(e.target.value); setBorderColorHex(e.target.value); }}
                      className="w-10 h-8 rounded cursor-pointer border border-gray-300" />
                    <div className="flex gap-1">
                      {['#ec4899', '#f472b6', '#0D3330', '#10b981', '#000000'].map(c => (
                        <button key={c} onClick={() => { setBorderColor(c); setBorderColorHex(c); }}
                          className="w-6 h-6 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handlePrint} disabled={selectedWords.length === 0 || printing}
                className="w-full px-4 py-3 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg font-bold text-sm hover:from-pink-700 hover:to-pink-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                {printing ? '⏳ Generating...' : `🖨️ ${printMode === 'full-set' ? 'Print EVERYTHING' : `Print ${modeLabels[printMode].label}`}`}
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="mb-4 pb-4 border-b border-gray-200 flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-pink-700">{selectedWords.length}</span>
                <span className="text-gray-600">words selected</span>
                <span className="text-sm text-gray-400">({nounWords.length} nouns with objects • {commands.length} commands)</span>
              </div>

              {selectedWords.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-4">🩷</div>
                  <p className="text-lg font-medium">Select word groups to preview</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentPhase.groups
                    .filter(g => selectedGroups.includes(g.id || g.label))
                    .map(group => (
                      <div key={group.id || group.label}>
                        <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: currentPhase.color }} />
                          {group.label}
                          {group.description && <span className="text-xs text-gray-400 font-normal">{group.description}</span>}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {group.words.map(w => (
                            <div key={w.word} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-pink-50 transition-colors">
                              <span className="text-lg">{w.image}</span>
                              <span className="font-bold text-gray-800" style={{ fontFamily: "'Comic Sans MS', cursive" }}>{w.word}</span>
                              {w.isNoun && <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full font-medium">object</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                  {/* Commands preview */}
                  {commands.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0 bg-amber-500" />
                        Command Cards ({commands.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {commands.map((cmd, i) => (
                          <span key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1.5 rounded-lg font-medium">
                            {cmd.text}
                          </span>
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
