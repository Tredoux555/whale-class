'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ALL_PHASES, type PhonicsWord } from '@/lib/montree/phonics/phonics-data';
import { getLessonScope } from '@/lib/montree/english-sequence/lesson-materials';
import { resolvePhotoBankImages } from '@/lib/montree/phonics/photo-bank-resolver';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

// =====================================================================
// TYPES
// =====================================================================

interface BingoBoard {
  id: number;
  cells: PhonicsWord[];
  hasFreeSpace: boolean;
}

// =====================================================================
// CONSTANTS
// =====================================================================

const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];
const BINGO_COLORS = ['#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800'];

// =====================================================================
// UTILITIES
// =====================================================================

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateMultipleBoards(
  allWords: PhonicsWord[],
  boardSize: number,
  numBoards: number,
  hasFreeSpace: boolean
): BingoBoard[] {
  const boards: BingoBoard[] = [];
  const cellsPerBoard = boardSize * boardSize - (hasFreeSpace ? 1 : 0);

  for (let i = 0; i < numBoards; i++) {
    const shuffled = shuffleArray(allWords);
    const cells = shuffled.slice(0, cellsPerBoard);
    boards.push({ id: i, cells, hasFreeSpace });
  }
  return boards;
}

function getSelectedWords(
  phaseId: string,
  selectedGroups: Set<string>
): PhonicsWord[] {
  const phase = ALL_PHASES.find(p => p.id === phaseId);
  if (!phase) return [];

  const words: PhonicsWord[] = [];
  const seen = new Set<string>();

  for (const group of phase.groups) {
    if (selectedGroups.has(group.id)) {
      for (const word of group.words) {
        if (!seen.has(word.word)) {
          words.push(word);
          seen.add(word.word);
        }
      }
    }
  }
  return words;
}

// =====================================================================
// CALLING CARD SIZE VARIANTS (Small / Medium / Large — group-game sizing)
// =====================================================================
// Small  = today's card, unchanged (46mm-ish, 4x4 grid, 16/page).
// Medium = 2x the AREA of Small   -> linear scale = sqrt(2) ≈ 1.4142.
// Large  = 4x the AREA of Small   -> linear scale = 2 (2x every dimension).
//
// Card size is expressed in mm and used to derive an EXACT cols x rows
// rectangle for print pagination. Keeping every size a clean rectangle
// matters: the "reverse each row" duplex-mirror logic in handlePrint maps
// front column i -> back column (cols-1-i), which is the correct geometry
// for FLIP ON THE LONG EDGE duplex for ANY cols/rows, real card or blank
// padding — as long as pageItems is padded out to the FULL cols*rows
// rectangle before either side is drawn (it is, below). So every size here
// stays provably correct, including a partially-filled final page.

type CallingCardSize = 'small' | 'medium' | 'large';

const CARD_SIZE_LABEL: Record<CallingCardSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

// Same physical budget the print stylesheet gives the calling-card grid:
// the 210mm-wide, 297mm-tall page, minus 8mm padding on every side, minus
// the fixed 18mm header + 4mm header margin-bottom that both front and back
// pages share (see .calling-header — its height is locked so front/back
// grids always start at the same Y).
const GRID_MAX_W_MM = 190; // 210 - 2*8mm padding - 4mm cut margin
const GRID_MAX_H_MM = 297 - 8 - 8 - 18 - 4 - 4; // page - 2*8mm padding - 18mm header - 4mm header margin - 4mm cut margin (mirrors GRID_MAX_W_MM's cut margin) = 255mm

const SMALL_COLS = 4;
const SMALL_ROWS = 4;
const SMALL_CARD_MM = GRID_MAX_W_MM / SMALL_COLS; // 47.5mm — today's size, unchanged

const CARD_SIZE_SCALE: Record<CallingCardSize, number> = {
  small: 1,
  medium: Math.SQRT2, // 2x area
  large: 2,           // 4x area
};

interface CallingCardGeometry {
  cardMm: number;
  cols: number;
  rows: number;
  cardsPerPage: number;
  scale: number; // linear scale relative to Small — drives font/border/radius
}

function getCallingCardGeometry(size: CallingCardSize): CallingCardGeometry {
  const scale = CARD_SIZE_SCALE[size];
  const cardMm = SMALL_CARD_MM * scale;

  if (size === 'small') {
    // Pin Small to today's exact PAGINATION (16/page, 4x4, same card mm
    // size) rather than re-deriving it from the formula below — that
    // formula would actually fit a 5th row (255 / 47.5 ≈ 5.4) and would
    // change how many cards land on a page for anyone who never touches
    // the new size control.
    // NOTE this is NOT byte-for-byte identical printed output to before
    // this change, despite the grid dimensions being untouched: the Part 1
    // registration fix moves every page's content ~6mm up/left (@page's
    // margin dropped from 6mm to 0 while .page's own 8mm padding is
    // unchanged — see the DUPLEX REGISTRATION FIX comment in handlePrint),
    // and the printed header now appends the size label ("· Small"). Only
    // the CARD GRID ITSELF — its size, count per page, and pagination — is
    // preserved exactly.
    return { cardMm, cols: SMALL_COLS, rows: SMALL_ROWS, cardsPerPage: SMALL_COLS * SMALL_ROWS, scale };
  }

  const cols = Math.max(1, Math.floor(GRID_MAX_W_MM / cardMm));
  const rows = Math.max(1, Math.floor(GRID_MAX_H_MM / cardMm));
  return { cardMm, cols, rows, cardsPerPage: cols * rows, scale };
}

function clampDuplexOffset(mm: number): number {
  const clamped = Math.min(3, Math.max(-3, mm));
  return Math.round(clamped * 2) / 2; // snap to the 0.5mm step the UI uses
}

const DUPLEX_CALIBRATION_STORAGE_KEY = 'montree.phonicsFast.callingCards.duplexCalibration.v1';

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export default function PhonicsBingoPage() {
  const searchParams = useSearchParams();
  const lessonParam = searchParams.get('lesson');
  const lessonNum = lessonParam ? parseInt(lessonParam, 10) : NaN;
  const lessonScope = Number.isInteger(lessonNum) ? getLessonScope(lessonNum) : null;
  const initialPhaseId = lessonScope?.phaseId || searchParams.get('phase') || 'pink1';

  const [selectedPhaseId, setSelectedPhaseId] = useState(initialPhaseId);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(lessonScope?.groupIds ?? []));
  const [boardSize, setBoardSize] = useState<3 | 4 | 5>(4);
  const [numBoards, setNumBoards] = useState(6);
  const [hasFreeSpace, setHasFreeSpace] = useState(false);
  const [borderColor, setBorderColor] = useState('#2D5A27');
  const [borderWidth, setBorderWidth] = useState<number>(2.5);
  const [cornerRadius, setCornerRadius] = useState(8);
  const [mode, setMode] = useState<'editor' | 'boards' | 'calling'>('editor');
  const [boards, setBoards] = useState<BingoBoard[]>([]);

  // Calling card size (Small/Medium/Large — Part 2). Not persisted, same as
  // every other print option on this page except the duplex calibration.
  const [cardSize, setCardSize] = useState<CallingCardSize>('small');

  // 🎯 Duplex calibration (Part 1) — a small X/Y nudge, in mm, applied to
  // BACK pages of the calling cards ONLY, to absorb whatever mechanical
  // duplex offset a specific printer still has after the CSS-level fix.
  // This is per-PRINTER, not per-print-job, so — unlike every other option
  // on this page — it persists across sessions in localStorage.
  const [duplexOffsetX, setDuplexOffsetX] = useState(0);
  const [duplexOffsetY, setDuplexOffsetY] = useState(0);

  // Hydration guard for the localStorage read/write pair below. This is
  // deliberately STATE, not a plain ref: within ONE React effect flush
  // (which is what happens on initial mount, and again on EVERY pass of
  // React StrictMode's dev-only double-invoke of effects), a ref mutated
  // by the read effect is already visible to the write effect that runs
  // immediately after it in the SAME synchronous flush — so a ref guard
  // would NOT actually block that first, premature write, which would
  // still fire with the write effect's STALE pre-hydration closure values
  // (duplexOffsetX/Y still 0) and clobber whatever the read effect just
  // loaded. A state flag doesn't have this problem: its `false` value is
  // captured by the write effect's closure for this render and stays
  // `false` for the write effect's very first invocation no matter what
  // the read effect does in the same flush — the write effect only sees
  // `true`, and the freshly loaded duplexOffsetX/Y, once a genuine new
  // render has happened (i.e. after the read effect's setState calls are
  // actually applied).
  const [duplexHydrated, setDuplexHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DUPLEX_CALIBRATION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { x?: number; y?: number };
        if (typeof parsed.x === 'number') setDuplexOffsetX(clampDuplexOffset(parsed.x));
        if (typeof parsed.y === 'number') setDuplexOffsetY(clampDuplexOffset(parsed.y));
      }
    } catch {
      // Corrupt or unavailable storage — safe to ignore, defaults to 0mm.
    } finally {
      setDuplexHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!duplexHydrated) return; // don't persist until the read above has actually landed
    try {
      window.localStorage.setItem(
        DUPLEX_CALIBRATION_STORAGE_KEY,
        JSON.stringify({ x: duplexOffsetX, y: duplexOffsetY })
      );
    } catch {
      // Ignore write failures (private browsing / storage quota, etc).
    }
  }, [duplexOffsetX, duplexOffsetY, duplexHydrated]);

  // Photo Bank
  const [photoMap, setPhotoMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const controller = new AbortController();
    resolvePhotoBankImages(controller.signal).then((map) => {
      if (!controller.signal.aborted) setPhotoMap(map);
    });
    return () => { controller.abort(); };
  }, []);

  const phase = ALL_PHASES.find(p => p.id === selectedPhaseId);

  const handlePhaseChange = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
    setSelectedGroups(new Set());
  };

  const toggleGroup = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const selectAllGroups = useCallback(() => {
    if (!phase) return;
    setSelectedGroups(new Set(phase.groups.map(g => g.id)));
  }, [phase]);

  const handleGenerateBoards = useCallback(() => {
    const selectedWords = getSelectedWords(selectedPhaseId, selectedGroups);

    if (selectedWords.length === 0) {
      alert('Please select at least one word group');
      return;
    }

    const cellsNeeded = boardSize * boardSize - (hasFreeSpace ? 1 : 0);
    if (selectedWords.length < cellsNeeded) {
      alert(`Not enough words. Need ${cellsNeeded}, have ${selectedWords.length}`);
      return;
    }

    const generatedBoards = generateMultipleBoards(
      selectedWords, boardSize, numBoards, hasFreeSpace
    );
    setBoards(generatedBoards);
    setMode('boards');
  }, [selectedPhaseId, selectedGroups, boardSize, numBoards, hasFreeSpace]);

  const callingWords = useMemo(() => {
    return getSelectedWords(selectedPhaseId, selectedGroups);
  }, [selectedPhaseId, selectedGroups]);

  // Live "N per page · M pages" readout for the Calling Cards tab's own
  // size selector (item 6) — same pure geometry fn the print pipeline and
  // the Board Settings select already use, just memoized here since this
  // one gets read from JSX in a couple of places.
  const callingGeometry = useMemo(() => getCallingCardGeometry(cardSize), [cardSize]);

  // ---------------------------------------------------------------
  // PRINT — opens a new window with A4 print-ready pages
  // ---------------------------------------------------------------
  const handlePrint = useCallback((type: 'boards' | 'calling') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const bw = borderWidth * 2; // boards get 2x border like old generator
    const phaseLabel = phase?.name || 'Phonics';

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Phonics Bingo — ${type === 'boards' ? 'Boards' : 'Calling Cards'}</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  /* 🔒 DUPLEX REGISTRATION FIX — @page margin MUST be 0 here.
     The true root cause was NOT the base ".page{margin:0 auto}" rule below
     — per CSS 2.1 §10.3.3, when BOTH margin-left and margin-right are auto
     (which "0 auto" sets), an over-wide box is still CENTERED: any excess
     is split EQUALLY left/right. That alone wouldn't produce an asymmetric,
     one-edge offset.
     The actual culprit was the @media print rule further down this
     stylesheet (".page{margin:0}", same selector specificity, so it wins
     at print time via normal cascade order): that set ALL FOUR margins to
     a fixed 0 — none left auto. With width/border/padding also fixed, the
     box became truly over-constrained per §10.3.3's OTHER clause: in LTR,
     the browser silently recalculates (ignores) margin-right to satisfy
     the box equation, so the box's LEFT edge stayed pinned at the exact
     old @page's 6mm content-box origin while the full 210mm width still
     extended rightward from there — overflowing ~12mm off the physical
     sheet's right edge. THAT is the source of the ~12mm-class
     misregistration: front and back pages, laid out as separate boxes,
     don't reliably clip that overflow at bit-identical positions.
     Fix: @page's margin is 0 and .page is sized to the FULL physical A4
     sheet (210mm x 297mm) — the box now exactly equals its printable area,
     so there is no excess width for either the base rule's auto-centering
     OR the @media print override to distribute, and the two rules agree
     trivially (both produce 0mm of margin either way).
     ⚠️ KEEP THESE IN SYNC: @page's margin here and the @media print
     ".page{margin:0}" rule below (search "box-shadow: none; margin: 0")
     must both stay "0 relative to the full sheet" — changing one without
     the other reintroduces this exact bug.
     Every mm of spacing from the true paper edge is now controlled ONLY by
     .page's own padding below, so front and back pages share one identical
     geometric skeleton, in mm, end to end. */
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: white; }

  .page {
    width: 210mm; height: 297mm; margin: 0 auto;
    background: white; padding: 8mm;
    page-break-after: always; overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  .page-header { text-align: center; margin-bottom: 6mm; }

  .page-title {
    font-size: 36px; font-weight: 800; letter-spacing: 8px;
    font-family: 'Nunito', system-ui, sans-serif; margin-bottom: 4px;
  }
  .page-title span {
    display: inline-block; padding: 4px 10px; border-radius: 8px;
    margin: 0 2px; color: white; font-weight: 700;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .page-subtitle { font-size: 12px; color: #999; margin-top: 4px; font-weight: 500; }
  .page-name {
    margin-top: 4mm; font-size: 13px; color: #666;
    border-bottom: 2px solid #d1d5db; display: inline-block;
    width: 56mm; padding-bottom: 4px; font-weight: 500;
  }

  .bingo-grid {
    display: grid; margin: 0 auto; max-width: 190mm;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .bingo-grid.size-3 { grid-template-columns: repeat(3, 1fr); }
  .bingo-grid.size-4 { grid-template-columns: repeat(4, 1fr); }
  .bingo-grid.size-5 { grid-template-columns: repeat(5, 1fr); }

  .bingo-cell {
    aspect-ratio: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; overflow: hidden;
    background: white;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .bingo-cell img {
    width: 100%; flex: 1; object-fit: cover; display: block; min-height: 0;
  }
  .bingo-cell .cell-word {
    font-size: 14px; font-weight: 700;
    font-family: 'Comic Sans MS', cursive; color: #1f2937;
    padding: 2px 0; text-align: center; flex-shrink: 0; line-height: 1.2;
  }
  .bingo-cell .cell-emoji {
    font-size: 2.5rem; flex: 1; display: flex; align-items: center; justify-content: center;
  }
  .free-star { font-size: 2.5rem; }
  .free-label {
    font-size: 14px; font-weight: 700; color: #0D3330;
    font-family: 'Comic Sans MS', cursive;
  }

  /* Calling cards — 3-Part Card style.
     grid-template-columns / width / grid-auto-rows are set INLINE per print
     job (see handlePrint / getCallingCardGeometry) because they depend on
     the selected card size (Small/Medium/Large) — always expressed in mm,
     never left to implicit 1fr stretching, so the chosen size is exact and
     identical between the front and back page of a given print run. */
  .calling-cards-grid {
    display: grid; margin: 0 auto; gap: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .calling-card {
    display: flex; flex-direction: column; align-items: stretch;
    justify-content: center; text-align: center; aspect-ratio: 1;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .card-inner {
    background: white; flex: 1; display: flex; align-items: center;
    justify-content: center; overflow: hidden;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .card-inner img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card-word {
    /* font-size set inline per print job — grows with the card, Part 2.
       (.card-emoji's font-size is also set inline, same reason — it has no
       rule of its own here since inline is the ONLY thing it needs.) */
    font-weight: 700;
    font-family: 'Comic Sans MS', cursive; color: #1f2937;
  }

  /* Locked dimensions so FRONT and BACK pages have identical layout —
     critical for duplex alignment. The grid below it starts at exactly the
     same Y on both sides regardless of header text length. */
  .calling-header {
    text-align: center;
    height: 18mm;
    margin-bottom: 4mm;
    overflow: hidden;
    box-sizing: border-box;
  }
  .calling-header h2 { font-size: 26px; color: #1f2937; font-family: 'Nunito', system-ui, sans-serif; font-weight: 700; line-height: 1.1; white-space: nowrap; }
  .calling-header p { font-size: 12px; color: #999; margin-top: 3px; line-height: 1.2; white-space: nowrap; }

  @media print {
    body { background: white; }
    /* ⚠️ This margin:0 must stay in sync with @page's margin (top of this
       stylesheet) — see the DUPLEX REGISTRATION FIX comment there. Both are
       "0 relative to the full sheet" today; if @page ever gets a nonzero
       margin again without updating this rule (or vice versa), .page
       becomes over-constrained again and reintroduces the left-pinned
       overflow this fix removed. */
    .page { box-shadow: none; margin: 0; border-radius: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  }
</style></head><body>`);

    const bingoHeader = BINGO_LETTERS.map((ch, i) =>
      `<span style="background:${BINGO_COLORS[i]}">${ch}</span>`
    ).join('');

    if (type === 'boards') {
      boards.forEach((board, bIdx) => {
        const cellCount = boardSize * boardSize;
        let cellIdx = 0;

        let html = `<div class="page">
          <div class="page-header">
            <div class="page-title">${bingoHeader}</div>
            <div class="page-subtitle">${phaseLabel} · Board #${bIdx + 1}</div>
            <div class="page-name">Name: _________________</div>
          </div>
          <div class="bingo-grid size-${boardSize}" style="background:${borderColor};padding:${bw}mm;gap:${bw}mm;border-radius:${cornerRadius}px;">`;

        for (let i = 0; i < cellCount; i++) {
          const isCenterFree = board.hasFreeSpace && boardSize % 2 === 1 && i === Math.floor(cellCount / 2);
          const cellR = `border-radius:${cornerRadius}px;`;

          if (isCenterFree) {
            html += `<div class="bingo-cell" style="${cellR}"><div class="free-star">⭐</div><div class="free-label">FREE</div></div>`;
          } else {
            const w = board.cells[cellIdx];
            if (w) {
              const photoUrl = photoMap.get(w.word.toLowerCase());
              if (photoUrl) {
                html += `<div class="bingo-cell" style="${cellR}"><img src="${photoUrl}" alt="${w.word}" style="${cellR}"><div class="cell-word">${w.word}</div></div>`;
              } else {
                html += `<div class="bingo-cell" style="${cellR}"><div class="cell-emoji">${w.image}</div><div class="cell-word">${w.word}</div></div>`;
              }
              cellIdx++;
            } else {
              html += `<div class="bingo-cell" style="${cellR}"></div>`;
              cellIdx++;
            }
          }
        }

        html += '</div></div>';
        printWindow.document.write(html);
      });
    } else {
      // Calling cards — duplex: picture front, word back.
      // Grid geometry (cols/rows/cardsPerPage/scale) comes from the chosen
      // card size (Small/Medium/Large — Part 2). Every size is still an
      // EXACT cols x rows rectangle, and pageItems below is always padded
      // out to fill that exact rectangle (cardsPerPage) before either side
      // is drawn — that is what keeps the "reverse each row" mirror below
      // correct even on the last, partially-filled page: front column i and
      // back column (cols-1-i) always refer to the SAME array slot, whether
      // it holds a real card or blank padding.
      const geometry = getCallingCardGeometry(cardSize);
      const { cols, rows, cardsPerPage, scale } = geometry;
      const pages = Math.ceil(callingWords.length / cardsPerPage);

      // Border, corner radius and both font sizes scale WITH the card so a
      // Large card doesn't end up thinner-bordered or under-labelled than a
      // Small one, and the word on the back stays legible at every size.
      // (bw matches boards' historical bw=borderWidth*2 exactly at scale=1.)
      // Capped at 8mm: uncapped, Large (scale=2) + Thick (borderWidth=4)
      // would reach 4*2*2=16mm of solid-color padding on a 95mm card —
      // over half the card would print as ink instead of picture/word.
      const bw = Math.min(8, borderWidth * 2 * scale);
      const scaledCorner = Math.round(cornerRadius * scale);
      const cardStyle = `background:${borderColor};padding:${bw}mm;border-radius:${scaledCorner}px;`;
      const innerR = `border-radius:${Math.max(0, scaledCorner - 1)}px;`;
      const wordFontPx = Math.round(28 * scale); // 28px was the old fixed .card-word size
      const emojiPx = Math.round(64 * scale);    // 4rem (16px base) was the old fixed .card-emoji size

      // width is deliberately cols*cardMm (not a fixed 190mm) so Medium and
      // Large grids — which don't divide 190mm evenly — stay centered via
      // margin:0 auto instead of stretching cards via 1fr, which would have
      // blurred the Medium/Large size distinction into one another.
      const gridStyle = `grid-template-columns:repeat(${cols}, ${geometry.cardMm}mm);grid-auto-rows:${geometry.cardMm}mm;width:${cols * geometry.cardMm}mm;`;
      const sizeLabel = CARD_SIZE_LABEL[cardSize];

      // 🎯 Duplex calibration nudge — defined in the TEACHER's frame: +X
      // moves the printed word RIGHT and +Y moves it DOWN, as seen holding
      // the PICTURE (front) side up (see the on-screen hint under the
      // sliders). duplexOffsetX/Y themselves ALWAYS keep that meaning —
      // they are never negated, including in what gets persisted to
      // localStorage. Physically, this is applied to the BACK page's own
      // (pre-flip) draw coordinates, and under LONG-EDGE duplex the
      // physical flip mirrors the horizontal axis but NOT the vertical
      // one — so translating the back's own X by +1mm actually lands the
      // word 1mm further LEFT once the sheet is flipped and compared to
      // the front (the mirror inverts it), while Y carries straight
      // through unmirrored. The fix is to negate ONLY X in this one CSS
      // string, right at the point of use — never in the stored state.
      // Also: only emit the transform at all when there's an actual nudge,
      // so the back page stays exactly as fragmentable (no forced single
      // stacking-context box) as the front page at the 0/0 default —
      // matching Part 1's "identical geometric skeleton" front/back.
      const hasDuplexNudge = duplexOffsetX !== 0 || duplexOffsetY !== 0;
      const backPageStyle = hasDuplexNudge
        ? ` style="transform:translate(${-duplexOffsetX}mm, ${duplexOffsetY}mm);"`
        : '';

      for (let p = 0; p < pages; p++) {
        const start = p * cardsPerPage;
        const pageItems: (PhonicsWord | null)[] = callingWords.slice(start, start + cardsPerPage);
        while (pageItems.length < cardsPerPage) pageItems.push(null);

        // FRONT — pictures.
        // Header text is INTENTIONALLY the same shape as the back header so
        // both pages render at identical heights — critical for duplex
        // alignment. Print duplex, FLIP ON THE LONG EDGE.
        let frontHtml = `<div class="page"><div class="calling-header">
          <h2>✂️ Calling Cards — ${phaseLabel}</h2>
          <p>Picture Side · Page ${p + 1} of ${pages} · ${sizeLabel}</p>
        </div><div class="calling-cards-grid" style="${gridStyle}">`;

        for (const item of pageItems) {
          if (item) {
            const photoUrl = photoMap.get(item.word.toLowerCase());
            const imgContent = photoUrl
              ? `<img src="${photoUrl}" alt="${item.word}">`
              : `<div class="card-emoji" style="font-size:${emojiPx}px;">${item.image}</div>`;
            frontHtml += `<div class="calling-card" style="${cardStyle}"><div class="card-inner" style="${innerR}">${imgContent}</div></div>`;
          } else {
            frontHtml += `<div class="calling-card" style="background:transparent;"></div>`;
          }
        }
        frontHtml += '</div></div>';
        printWindow.document.write(frontHtml);

        // BACK — words. Columns within each row are mirrored, which is the
        // correct geometry for LONG-EDGE flip on portrait paper (mirror the
        // horizontal axis per row, keep the vertical/row axis as-is). DO NOT
        // change this to a row-reverse (top-bottom) — that is the SHORT-edge
        // geometry and would put every word behind the wrong picture.
        // The optional translate() nudge below is the Duplex Calibration
        // control — a manual, per-printer correction, separate from this
        // mirror math (which is exact regardless of the printer's own
        // mechanical registration).
        // backPageStyle already carries its own leading space + full
        // `style="..."` attribute (or is '' when there's no nudge) — see
        // where it's built above. Don't wrap it in another style="" here.
        let backHtml = `<div class="page"${backPageStyle}><div class="calling-header">
          <h2>✂️ Calling Cards — ${phaseLabel}</h2>
          <p>Word Side · Page ${p + 1} of ${pages} · ${sizeLabel}</p>
        </div><div class="calling-cards-grid" style="${gridStyle}">`;

        for (let r = 0; r < rows; r++) {
          const rowItems = pageItems.slice(r * cols, (r + 1) * cols);
          while (rowItems.length < cols) rowItems.push(null);
          const mirrored = [...rowItems].reverse();
          for (const item of mirrored) {
            if (item) {
              backHtml += `<div class="calling-card" style="${cardStyle}"><div class="card-inner" style="${innerR}"><div class="card-word" style="font-size:${wordFontPx}px;">${item.word}</div></div></div>`;
            } else {
              backHtml += `<div class="calling-card" style="background:transparent;"></div>`;
            }
          }
        }
        backHtml += '</div></div>';
        printWindow.document.write(backHtml);
      }
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }, [boards, boardSize, borderColor, borderWidth, cornerRadius, callingWords, photoMap, phase, cardSize, duplexOffsetX, duplexOffsetY]);

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 pt-3 flex items-center justify-between">
          <Link href="/montree/library" className="flex items-center gap-2 group">
            <MontreeLogo size={26} />
            <span className="text-white font-semibold text-sm group-hover:text-teal-200 transition-colors">Library</span>
          </Link>
          <LanguageToggle />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Link
              href="/montree/library/tools/phonics-fast"
              className="inline-flex items-center text-teal-100 hover:text-white mb-2 transition"
            >
              ← Back to Phonics Tools
            </Link>
            <h1 className="text-4xl font-bold">Phonics Bingo Generator</h1>
            <p className="text-teal-100 mt-1">
              Print-ready A4 bingo boards with pictures + words
            </p>
          </div>
          <div className="text-5xl">🎲</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-8 border-b-2 border-gray-200">
          <button
            onClick={() => setMode('editor')}
            className={`px-6 py-3 font-semibold transition ${
              mode === 'editor' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => { if (boards.length > 0) setMode('boards'); }}
            className={`px-6 py-3 font-semibold transition ${
              mode === 'boards' ? 'text-teal-700 border-b-2 border-teal-700'
                : boards.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Boards ({boards.length})
          </button>
          <button
            onClick={() => { if (callingWords.length > 0) setMode('calling'); }}
            className={`px-6 py-3 font-semibold transition ${
              mode === 'calling' ? 'text-teal-700 border-b-2 border-teal-700'
                : callingWords.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Calling Cards
          </button>
        </div>

        {/* =================== EDITOR MODE =================== */}
        {mode === 'editor' && (
          <div className="space-y-8">
            {/* Phase Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Phonics Phase</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {ALL_PHASES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePhaseChange(p.id)}
                    className={`p-4 rounded-lg border-2 transition font-semibold ${
                      selectedPhaseId === p.id
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-teal-400'
                    }`}
                  >
                    <div className="text-sm">{p.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {p.groups.reduce((sum, g) => sum + g.words.length, 0)} words
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Group Selection */}
            {phase && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Select Word Groups</h2>
                  <button
                    onClick={selectAllGroups}
                    className="btn btn-primary btn-md on-light"
                  >
                    Select All
                  </button>
                </div>
                <p className="text-gray-600 mb-4">{phase.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {phase.groups.map(group => (
                    <label
                      key={group.id}
                      className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        className="w-5 h-5 mt-1 rounded border-gray-300 text-teal-600 accent-teal-600"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">{group.label}</div>
                        <div className="text-sm text-gray-600">
                          {group.description} ({group.words.length} words)
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Board Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Board Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Grid Size</label>
                  <select
                    value={boardSize}
                    onChange={e => setBoardSize(parseInt(e.target.value) as 3 | 4 | 5)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="3">3×3 (9 pictures)</option>
                    <option value="4">4×4 (16 pictures)</option>
                    <option value="5">5×5 (25 pictures)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Boards</label>
                  <select
                    value={numBoards}
                    onChange={e => setNumBoards(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(n => (
                      <option key={n} value={n}>{n} board{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Free Space</label>
                  <label className="flex items-center gap-2 p-3 border-2 border-gray-300 rounded-lg hover:bg-teal-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={hasFreeSpace}
                      onChange={e => setHasFreeSpace(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-teal-600 accent-teal-600"
                    />
                    <span className="text-gray-700">Add center FREE space</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Border Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={borderColor}
                      onChange={e => setBorderColor(e.target.value)}
                      className="w-16 h-10 rounded border-2 border-gray-300 cursor-pointer"
                    />
                    <span className="text-gray-600 font-mono text-sm">{borderColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Border Width</label>
                  <select
                    value={borderWidth}
                    onChange={e => setBorderWidth(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="1.5">Thin</option>
                    <option value="2.5">Medium</option>
                    <option value="4">Thick</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Corners</label>
                  <select
                    value={cornerRadius}
                    onChange={e => setCornerRadius(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="0">Square</option>
                    <option value="4">Slight</option>
                    <option value="8">Rounded</option>
                    <option value="14">Very Round</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Calling Card Size <span className="text-gray-400 font-normal">(cards only)</span>
                  </label>
                  <select
                    value={cardSize}
                    onChange={e => setCardSize(e.target.value as CallingCardSize)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold"
                  >
                    <option value="small">Small (today&apos;s size, {getCallingCardGeometry('small').cardsPerPage}/page)</option>
                    <option value="medium">Medium (2× bigger, {getCallingCardGeometry('medium').cardsPerPage}/page)</option>
                    <option value="large">Large (4× bigger — group games, {getCallingCardGeometry('large').cardsPerPage}/page)</option>
                  </select>
                </div>
              </div>

              {/* How to play */}
              <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg text-sm text-gray-700">
                <strong className="text-amber-700">How to play:</strong>{' '}
                1) Print the <strong>Bingo Boards</strong> — each board has pictures with words (single-sided, one page per board).{' '}
                2) Print the <strong>Calling Cards</strong> duplex, <strong>flip on the long edge</strong>, at <strong>100% scale</strong> (no &quot;fit to page&quot;) — picture on front, word on back. Cut along borders. If your printer&apos;s registration is off by a mm or two, use the Duplex Calibration nudge on the Calling Cards tab.{' '}
                3) The caller draws a card, shows the picture. Players find and cover the matching picture on their board.
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleGenerateBoards}
                  className="btn btn-primary btn-lg on-light"
                >
                  Generate Bingo Boards
                </button>
                <button
                  onClick={() => {
                    handleGenerateBoards();
                    setTimeout(() => setMode('calling'), 50);
                  }}
                  className="btn btn-gold btn-lg on-light"
                >
                  Generate Calling Cards
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================== BOARDS MODE =================== */}
        {mode === 'boards' && boards.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {boards.length} Bingo Board{boards.length > 1 ? 's' : ''}
                </h2>
                <p className="text-gray-600">
                  {boardSize}×{boardSize} · {phase?.name || 'Phonics'}
                  {hasFreeSpace ? ' · FREE center' : ''}
                </p>
              </div>
              <button
                onClick={() => handlePrint('boards')}
                className="btn btn-primary btn-md on-light"
              >
                🖨️ Print All Boards
              </button>
            </div>

            {/* Board Preview — show A4-style preview with BINGO header */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {boards.map((board, bIdx) => (
                <BingoBoardPreview
                  key={board.id}
                  board={board}
                  boardNum={bIdx + 1}
                  boardSize={boardSize}
                  borderColor={borderColor}
                  borderWidth={borderWidth * 2}
                  cornerRadius={cornerRadius}
                  photoMap={photoMap}
                  phaseLabel={phase?.name || 'Phonics'}
                />
              ))}
            </div>
          </div>
        )}

        {/* =================== CALLING CARDS MODE =================== */}
        {mode === 'calling' && callingWords.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Calling Cards</h2>
                <p className="text-gray-600">
                  {callingWords.length} words · {CARD_SIZE_LABEL[cardSize]} cards · print duplex (picture front, word back, flip on the long edge)
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Duplicate of the Board Settings size select (item 6) —
                    same cardSize/setCardSize state, so the two always agree.
                    Kept here too so a teacher who only visits this tab never
                    has to hunt for it. */}
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-semibold">Card Size</span>
                  <select
                    value={cardSize}
                    onChange={e => setCardSize(e.target.value as CallingCardSize)}
                    className="px-3 py-1.5 border-2 border-gray-300 rounded-lg focus:border-teal-600 focus:outline-none font-semibold text-sm"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {callingGeometry.cardsPerPage} per page · {Math.ceil(callingWords.length / callingGeometry.cardsPerPage)} page{Math.ceil(callingWords.length / callingGeometry.cardsPerPage) === 1 ? '' : 's'}
                </span>
                <button
                  onClick={() => handlePrint('calling')}
                  className="btn btn-gold btn-md on-light"
                >
                  🖨️ Print Calling Cards
                </button>
              </div>
            </div>

            {/* 🎯 Duplex calibration — per-printer X/Y nudge, BACK pages only.
                Persisted to localStorage since it's a property of the
                printer, not of any particular print job. */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700">🎯 Duplex Calibration</div>
                  <div className="text-xs text-gray-500">
                    Nudges the WORD side only — use if fronts and backs don&apos;t quite line up on your printer.
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold w-4">X</span>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    step={0.5}
                    value={duplexOffsetX}
                    onChange={e => setDuplexOffsetX(clampDuplexOffset(parseFloat(e.target.value)))}
                    className="accent-teal-600"
                  />
                  <span className="font-mono text-xs w-14 text-right">{duplexOffsetX.toFixed(1)}mm</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold w-4">Y</span>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    step={0.5}
                    value={duplexOffsetY}
                    onChange={e => setDuplexOffsetY(clampDuplexOffset(parseFloat(e.target.value)))}
                    className="accent-teal-600"
                  />
                  <span className="font-mono text-xs w-14 text-right">{duplexOffsetY.toFixed(1)}mm</span>
                </label>
                {(duplexOffsetX !== 0 || duplexOffsetY !== 0) && (
                  <button
                    type="button"
                    onClick={() => { setDuplexOffsetX(0); setDuplexOffsetY(0); }}
                    className="text-xs text-gray-500 underline hover:text-gray-700"
                  >
                    Reset
                  </button>
                )}
              </div>
              {/* Item 5 — spell out the frame these sliders are in, since
                  it's the opposite of what the raw CSS transform ends up
                  doing to the back page (see the comment on backPageStyle
                  in handlePrint for why). */}
              <div className="text-xs text-gray-400 mt-2">
                +X moves the words right, +Y moves them down — as seen holding the picture side up.
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {callingWords.map((word, idx) => {
                const photoUrl = photoMap.get(word.word.toLowerCase());
                return (
                  <div
                    key={`${word.word}-${idx}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden border-4 flex flex-col"
                    style={{ borderColor }}
                  >
                    <div className="aspect-square flex items-center justify-center bg-gray-50 overflow-hidden">
                      {photoUrl ? (
                        <img src={photoUrl} alt={word.word} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-6xl">{word.image}</span>
                      )}
                    </div>
                    <div
                      className="py-2 text-center font-bold text-xl text-gray-800"
                      style={{ fontFamily: 'Comic Sans MS, cursive' }}
                    >
                      {word.word}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// BINGO BOARD PREVIEW — A4-style with BINGO header + uniform borders
// =====================================================================

interface BingoBoardPreviewProps {
  board: BingoBoard;
  boardNum: number;
  boardSize: number;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  photoMap: Map<string, string>;
  phaseLabel: string;
}

function BingoBoardPreview({
  board, boardNum, boardSize, borderColor, borderWidth, cornerRadius, photoMap, phaseLabel,
}: BingoBoardPreviewProps) {
  const cellCount = boardSize * boardSize;
  const gridCells: (PhonicsWord | 'FREE' | null)[] = [];
  let cellIdx = 0;

  for (let i = 0; i < cellCount; i++) {
    const isCenterFree = board.hasFreeSpace && boardSize % 2 === 1 && i === Math.floor(cellCount / 2);
    if (isCenterFree) {
      gridCells.push('FREE');
    } else {
      gridCells.push(board.cells[cellIdx] || null);
      if (board.cells[cellIdx]) cellIdx++;
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* BINGO Header */}
      <div className="text-center pt-4 pb-2">
        <div className="flex items-center justify-center gap-1 mb-1">
          {BINGO_LETTERS.map((ch, i) => (
            <span
              key={ch}
              className="inline-block text-white font-extrabold text-2xl px-3 py-1 rounded-lg shadow-md"
              style={{ background: BINGO_COLORS[i], fontFamily: 'Nunito, system-ui, sans-serif' }}
            >
              {ch}
            </span>
          ))}
        </div>
        <div className="text-xs text-gray-400 mt-1">{phaseLabel} · Board #{boardNum}</div>
        <div className="mt-1 text-sm text-gray-500">
          Name: <span className="inline-block border-b-2 border-gray-300 w-40">&nbsp;</span>
        </div>
      </div>

      {/* Grid — uniform border approach: grid bg = border color, gap = border width */}
      <div className="px-4 pb-4">
        <div
          className="grid mx-auto"
          style={{
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
            background: borderColor,
            padding: `${borderWidth}px`,
            gap: `${borderWidth}px`,
            borderRadius: `${cornerRadius}px`,
            aspectRatio: '1 / 1',
          }}
        >
          {gridCells.map((cell, idx) => (
            <div
              key={idx}
              className="bg-white flex flex-col items-center justify-center overflow-hidden"
              style={{ borderRadius: `${cornerRadius}px` }}
            >
              {cell === 'FREE' ? (
                <div className="text-center">
                  <div className="text-2xl">⭐</div>
                  <div className="text-xs font-bold text-teal-700" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                    FREE
                  </div>
                </div>
              ) : cell ? (
                <>
                  {photoMap.get(cell.word.toLowerCase()) ? (
                    <img
                      src={photoMap.get(cell.word.toLowerCase())}
                      alt={cell.word}
                      className="w-full flex-1 object-cover min-h-0"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-2xl min-h-0">
                      {cell.image}
                    </div>
                  )}
                  <div
                    className="text-xs font-bold text-gray-800 text-center py-0.5 flex-shrink-0 w-full"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}
                  >
                    {cell.word}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
