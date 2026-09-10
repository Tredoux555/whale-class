// app/montree/library/tools/cvc-bingo/page.tsx
// ============================================================================
// CVC BINGO — the tracker prints the paper.
// ============================================================================
// A teacher should never have to type the words her class has been reading.
// This screen asks the Dark Phonics tracker which books the room has actually
// worked in the last few weeks (/api/montree/dark-phonics/recent-words), turns
// those books into their own decodable word lists, and lays a board out per
// child on A4 — two to a page, with a calling sheet of cut-out cards behind.
//
// 🚨 THE PICTURES ARE THE OWNER'S DARK PHONICS PHOTOGRAPHY OR THERE ARE NO
// PICTURES. A word with no photo in the writing-shelf bank prints as a big
// clear word instead. No emoji, no substitute picture bank, ever — see
// lib/montree/journey/dark-bank.ts and book-word-pool.ts.
//
// 🚨 THE EMBLEM IS READ, NEVER COPIED. Same law as the Reading Log: the brand
// route is asked about THIS classroom and its already-resolved `kit` is used.
// Change the emblem on Class Documents and the next load prints the new one.
//
// 🚨 BOARDS ARE SEEDED, NOT RANDOM. A re-render (a checkbox, a resize, a
// re-fetch) must not reshuffle paper the teacher is already looking at, so
// every board is drawn from one integer seed and only "Shuffle" moves it.
//
// 🚨 `@page` CANNOT BE SCOPED — hence the one <style> tag on this page rather
// than a rule in globals.css, which would hijack every other print in the repo.
'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import type { TranslationKey } from '@/lib/montree/i18n/en';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import MontreeLogo from '@/components/montree/MonteeLogo';
import { isBrandKitActive, type BrandKit } from '@/lib/montree/brand-kit/types';
import {
  ALL_POOL_BOOKS,
  poolWordsForLetters,
  type PoolBook,
  type PoolWord,
} from '@/lib/montree/dark-phonics/book-word-pool';

/**
 * 🚨 LOCAL COPY, THE CLASS DOCUMENTS / DAILY SCHEDULE PATTERN. Montree's i18n
 * hook is strict across all twelve locales, so this screen's own strings ship
 * their English here and go through `t()` anyway (see `tx`): the moment the
 * locale files gain them, every string translates with no code change. The
 * catalogue keys this tool is LISTED under (`tools.cvc_bingo`,
 * `tools.cvc_bingo_desc`, `classDocs.tools.cvcBingo`) are real translated keys
 * in every locale — only the in-screen copy lives here.
 */
const COPY: Record<string, string> = {
  'cvcBingo.title': 'CVC Bingo',
  'cvcBingo.subtitle':
    'Boards built from the Dark Phonics books your class has worked recently.',
  'cvcBingo.loading': 'Reading your tracker…',
  'cvcBingo.weeks': 'Look back',
  'cvcBingo.weeksValue': 'weeks',
  'cvcBingo.booksFound': 'Books worked in this window',
  'cvcBingo.noBooks':
    'No Dark Phonics work is recorded for this class in that window — widen it, or pick books by hand below.',
  'cvcBingo.thin':
    'Not enough words for a full board yet — add a book or two by hand below.',
  'cvcBingo.pool': 'Words on the boards',
  'cvcBingo.poolHint': 'Untick any word you would rather leave off.',
  'cvcBingo.allOn': 'All',
  'cvcBingo.allOff': 'None',
  'cvcBingo.manual': 'Add books by hand',
  'cvcBingo.manualHint':
    'Every Dark Phonics book. Tick one to fold its words into the pool.',
  'cvcBingo.boardSize': 'Board size',
  'cvcBingo.boards': 'How many boards',
  'cvcBingo.rosterNote': 'One per child in your class',
  'cvcBingo.freeCentre': 'Free centre square',
  'cvcBingo.shuffle': 'Shuffle',
  'cvcBingo.print': 'Print',
  'cvcBingo.callingSheet': 'Calling cards',
  'cvcBingo.callingSheetHint': 'One small card per word, to cut up and call from.',
  'cvcBingo.free': 'FREE',
  'cvcBingo.noEmblem': 'No class emblem yet',
  'cvcBingo.addEmblem': 'Add one on Class Documents',
  'cvcBingo.loadFailed': 'Could not read the tracker — pick books by hand below.',
};

/* -------------------------------------------------------------------------- */
/* The paper. Millimetres of real A4, once, here.                              */
/* -------------------------------------------------------------------------- */

const PAGE_W = 210;
const PAGE_H = 297;
const PAGE_PAD = 8;
/** Two boards to a portrait page, so a board owns half the printable height. */
const BOARD_H = (PAGE_H - PAGE_PAD * 2) / 2; // 140.5mm
const BOARD_PAD = 4;
const HEAD_H = 12;
const GRID_MM = 120;
/** Calling cards: four to a row across the printable width. */
const CALL_COLS = 4;
const CALL_CARD_MM = (PAGE_W - PAGE_PAD * 2) / CALL_COLS; // 48.5mm
const CALL_ROWS = Math.floor((PAGE_H - PAGE_PAD * 2) / CALL_CARD_MM); // 5
const CALL_PER_PAGE = CALL_COLS * CALL_ROWS;

const DEFAULT_TOKENS = { ink: '#123b2a', accent: '#2f8f63', border: '#cfe0d6' };
const WEEK_CHOICES = [2, 4, 6, 8] as const;
const MAX_BOARDS = 40;

function safeColor(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/* -------------------------------------------------------------------------- */
/* Seeded shuffle — the whole reason a re-render does not move the paper.      */
/* -------------------------------------------------------------------------- */

/** mulberry32: tiny, deterministic, no dependency. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  const next = rng(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* -------------------------------------------------------------------------- */
/* Print stylesheet — geometry only. Colours arrive as CSS variables.          */
/* -------------------------------------------------------------------------- */

function bingoCss(boardSize: number): string {
  const cell = GRID_MM / boardSize;
  // Type is sized from the CELL, not from the string: a 4x4 board's squares are
  // three-quarters the width of a 3x3's and must not print the same 28pt word.
  const wordPt = boardSize === 3 ? 26 : 19;
  return `
.cb-page {
  width: ${PAGE_W}mm;
  height: ${PAGE_H}mm;
  box-sizing: border-box;
  padding: ${PAGE_PAD}mm;
  background: #fff;
  color: var(--cb-ink);
  margin: 0 auto 6mm;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 0 0 0.3mm rgba(19, 32, 25, 0.12);
}
.cb-board {
  height: ${BOARD_H}mm;
  box-sizing: border-box;
  padding: ${BOARD_PAD}mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
/* One dashed guide between the two boards. Nothing on the outside edge — the
   page's own trim is the outer cut and no printer reaches it anyway. */
.cb-board + .cb-board { border-top: 0.3mm dashed var(--cb-border); }

.cb-head {
  height: ${HEAD_H}mm;
  width: ${GRID_MM}mm;
  display: flex;
  align-items: center;
  gap: 3mm;
  flex: 0 0 auto;
}
/* 🚨 EXPLICIT WIDTH, HEIGHT AND flex-shrink ON EVERY PRINTED IMAGE — the house
   law. No element on this sheet may depend on flex leftover. */
.cb-emblem {
  width: ${HEAD_H}mm;
  height: ${HEAD_H}mm;
  flex: 0 0 auto;
  object-fit: contain;
}
.cb-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13pt;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cb-name-blank {
  flex: 1 1 auto;
  border-bottom: 0.4mm solid var(--cb-border);
  height: 6mm;
  margin-top: 4mm;
}
.cb-kicker {
  flex: 0 0 auto;
  font-size: 10pt;
  font-weight: 700;
  letter-spacing: 0.4mm;
  text-transform: uppercase;
  color: var(--cb-accent);
}

.cb-grid {
  width: ${GRID_MM}mm;
  height: ${GRID_MM}mm;
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(${boardSize}, ${cell}mm);
  grid-template-rows: repeat(${boardSize}, ${cell}mm);
  border: 0.5mm solid var(--cb-ink);
  box-sizing: border-box;
}
.cb-cell {
  box-sizing: border-box;
  border: 0.3mm solid var(--cb-border);
  padding: 1.5mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1mm;
  overflow: hidden;
  text-align: center;
}
.cb-cell img {
  width: 100%;
  height: ${cell * 0.55}mm;
  flex: 0 0 auto;
  object-fit: contain;
}
.cb-word {
  font-size: ${wordPt}pt;
  font-weight: 700;
  line-height: 1;
  text-transform: lowercase;
  flex: 0 0 auto;
}
.cb-cell.cb-has-photo .cb-word { font-size: ${Math.round(wordPt * 0.62)}pt; }
.cb-free {
  font-size: ${Math.round(wordPt * 0.6)}pt;
  font-weight: 700;
  color: var(--cb-accent);
  letter-spacing: 0.3mm;
}

/* The calling sheet. */
.cb-call-head {
  height: 10mm;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 3mm;
  font-size: 11pt;
  font-weight: 700;
}
.cb-call-grid {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: repeat(${CALL_COLS}, ${CALL_CARD_MM}mm);
  grid-auto-rows: ${CALL_CARD_MM}mm;
  align-content: start;
}
.cb-call-card {
  box-sizing: border-box;
  border: 0.3mm dashed var(--cb-border);
  padding: 2mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1mm;
  overflow: hidden;
  text-align: center;
}
.cb-call-card img {
  width: 100%;
  height: ${CALL_CARD_MM * 0.5}mm;
  flex: 0 0 auto;
  object-fit: contain;
}
.cb-call-word { font-size: 14pt; font-weight: 700; text-transform: lowercase; line-height: 1; }

@media print {
  /* 🚨 MARGIN ZERO. Chrome, Edge and Safari draw their own header and footer —
     date, tab title, URL, "1/2" — inside the @page margin box, and every one of
     them suppresses that furniture when the margin is zero. */
  @page { size: A4 portrait; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .cb-page {
    box-shadow: none;
    margin: 0 auto;
    break-inside: avoid;
    page-break-inside: avoid;
    break-after: page;
    page-break-after: always;
  }
  .cb-page:last-child { break-after: auto; page-break-after: auto; }
}
`.trim();
}

/* -------------------------------------------------------------------------- */

interface RecentWordsResponse {
  weeks: number;
  books: PoolBook[];
  words: PoolWord[];
}

interface RosterChild {
  id: string;
  name: string;
}

export default function CvcBingoPage() {
  const router = useRouter();
  const { t } = useI18n();

  const tx = useCallback(
    (key: string): string => {
      const value = t(key as TranslationKey);
      if (!value || value === key) return COPY[key] ?? key;
      return value;
    },
    [t]
  );

  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<number>(4);
  const [recent, setRecent] = useState<RecentWordsResponse | null>(null);
  const [recentFailed, setRecentFailed] = useState(false);
  const [roster, setRoster] = useState<RosterChild[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [classroomName, setClassroomName] = useState('');

  const [manualLetters, setManualLetters] = useState<Set<string>>(new Set());
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [boardSize, setBoardSize] = useState<3 | 4>(3);
  const [boardCount, setBoardCount] = useState<number>(6);
  const [boardCountTouched, setBoardCountTouched] = useState(false);
  const [freeCentre, setFreeCentre] = useState(true);
  const [seed, setSeed] = useState(1);

  /* ── the room, its roster and its emblem ──────────────────────────────── */
  useEffect(() => {
    const sess = getSession();
    if (!sess?.classroom?.id) {
      router.push('/montree/login');
      return;
    }
    const roomId = sess.classroom.id;
    setClassroomName(sess.classroom.name || '');

    let cancelled = false;

    const init = async () => {
      const q = `classroom_id=${encodeURIComponent(roomId)}`;

      const [childrenRes, brandRes] = await Promise.all([
        montreeApi(`/api/montree/children?${q}`).catch(() => null),
        montreeApi(`/api/montree/brand-kit?classroomId=${encodeURIComponent(roomId)}`).catch(
          () => null
        ),
      ]);

      if (cancelled) return;

      if (childrenRes?.ok) {
        try {
          const body = (await childrenRes.json()) as { children?: RosterChild[] };
          if (!cancelled) setRoster(body.children || []);
        } catch {
          /* a roster that will not load prints blank name lines. */
        }
      }

      if (brandRes?.ok) {
        try {
          const body = (await brandRes.json()) as {
            kit?: BrandKit | null;
            brandKit?: BrandKit | null;
          };
          // The room is named, so the room's own emblem wins: `kit` is the
          // already-resolved answer. `brandKit` is the school's raw kit and is
          // only a fallback for an older API build.
          if (!cancelled) setBrandKit(body.kit !== undefined ? body.kit : body.brandKit ?? null);
        } catch {
          /* a theme that will not load prints the plain board. */
        }
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /* ── the tracker, re-asked whenever the window moves ──────────────────── */
  useEffect(() => {
    const roomId = getSession()?.classroom?.id;
    if (!roomId) return;

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const res = await montreeApi(
          `/api/montree/dark-phonics/recent-words?classroom_id=${encodeURIComponent(
            roomId
          )}&weeks=${weeks}`
        );
        if (!res.ok) throw new Error(`recent-words: ${res.status}`);
        const body = (await res.json()) as RecentWordsResponse;
        if (cancelled) return;
        setRecent(body);
        setRecentFailed(false);
      } catch (err) {
        console.error('[cvc-bingo] recent-words failed:', err);
        if (!cancelled) {
          setRecent(null);
          setRecentFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [weeks]);

  /** The roster sets the default board count, until the teacher says otherwise. */
  useEffect(() => {
    if (!boardCountTouched && roster.length > 0) {
      setBoardCount(clamp(roster.length, 1, MAX_BOARDS));
    }
  }, [roster.length, boardCountTouched]);

  /* ── the pool ─────────────────────────────────────────────────────────── */

  const manualWords = useMemo(
    () => poolWordsForLetters(ALL_POOL_BOOKS.filter((b) => manualLetters.has(b.letter)).map((b) => b.letter)),
    [manualLetters]
  );

  /** Tracker words first, in book-recency order, then anything added by hand. */
  const pool = useMemo(() => {
    const seen = new Set<string>();
    const out: PoolWord[] = [];
    for (const w of [...(recent?.words || []), ...manualWords]) {
      if (seen.has(w.word)) continue;
      seen.add(w.word);
      out.push(w);
    }
    return out;
  }, [recent, manualWords]);

  const selected = useMemo(() => pool.filter((w) => !dropped.has(w.word)), [pool, dropped]);

  const cellsPerBoard = boardSize * boardSize - (boardSize === 3 && freeCentre ? 1 : 0);
  const thin = selected.length > 0 && selected.length < cellsPerBoard;

  const boards = useMemo(() => {
    if (selected.length === 0) return [];
    const count = clamp(Math.round(boardCount), 1, MAX_BOARDS);
    return Array.from({ length: count }, (_, i) => {
      const shuffled = seededShuffle(selected, seed * 7919 + i * 104729 + 1);
      return shuffled.slice(0, Math.min(cellsPerBoard, shuffled.length));
    });
  }, [selected, boardCount, cellsPerBoard, seed]);

  /* ── the theme ────────────────────────────────────────────────────────── */

  // `isBrandKitActive` also rejects a kit that is switched on but paints
  // nothing, so "configured but empty" behaves like off.
  const kit = isBrandKitActive(brandKit) ? brandKit : null;
  const emblemUrl = kit?.logoUrl || null;
  const tokens = kit ? kit.tokens : null;

  const pageVars = {
    '--cb-ink': safeColor(tokens?.ink, DEFAULT_TOKENS.ink),
    '--cb-accent': safeColor(tokens?.accent, DEFAULT_TOKENS.accent),
    '--cb-border': safeColor(tokens?.border, DEFAULT_TOKENS.border),
  } as CSSProperties;

  const toggleWord = useCallback((word: string) => {
    setDropped((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  }, []);

  const toggleBook = useCallback((letter: string) => {
    setManualLetters((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  }, []);

  /* ── the paper ────────────────────────────────────────────────────────── */

  const boardPages: (typeof boards)[] = [];
  for (let i = 0; i < boards.length; i += 2) boardPages.push(boards.slice(i, i + 2));

  const callPages: PoolWord[][] = [];
  for (let i = 0; i < selected.length; i += CALL_PER_PAGE) {
    callPages.push(selected.slice(i, i + CALL_PER_PAGE));
  }

  const centreIndex = Math.floor((boardSize * boardSize) / 2);

  const renderCell = (w: PoolWord | null, key: number) => {
    if (!w) {
      return (
        <div className="cb-cell" key={key}>
          <span className="cb-free">{tx('cvcBingo.free')}</span>
        </div>
      );
    }
    return (
      <div className={`cb-cell${w.hasPhoto ? ' cb-has-photo' : ''}`} key={key}>
        {w.hasPhoto && w.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={w.photoUrl} alt="" />
        ) : null}
        <span className="cb-word">{w.word}</span>
      </div>
    );
  };

  return (
    <>
      {/* 🚨 ONE TOP-LEVEL <style> TAG, never nested inside a conditional and
          never in globals.css, because @page cannot be scoped. */}
      <style dangerouslySetInnerHTML={{ __html: bingoCss(boardSize) }} />

      <div className="print:hidden relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/montree/library/tools')}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={t('common.back')}
          >
            ←
          </button>
          <span className="text-xl">🎯</span>
          <h1 className="font-bold text-white/95">{tx('cvcBingo.title')}</h1>
          <Link
            href="/montree/library"
            className="ml-auto flex items-center gap-2 no-underline shrink-0"
          >
            <MontreeLogo size={26} />
            <span className="text-sm font-semibold text-white/80">Library</span>
          </Link>
        </div>
      </div>

      <div className="min-h-screen bg-[#0a1a0f] print:hidden">
        <main className="p-4 max-w-3xl mx-auto space-y-6 pb-24">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-white/60">{tx('cvcBingo.subtitle')}</p>
            <button
              onClick={() => window.print()}
              disabled={boards.length === 0}
              className="btn btn-primary btn-sm shrink-0 disabled:opacity-40"
            >
              🖨️ {tx('cvcBingo.print')}
            </button>
          </div>

          {/* The window */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">
              {tx('cvcBingo.weeks')}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {WEEK_CHOICES.map((w) => (
                <button
                  key={w}
                  onClick={() => setWeeks(w)}
                  aria-pressed={weeks === w}
                  className={`btn btn-sm ${weeks === w ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {w} {tx('cvcBingo.weeksValue')}
                </button>
              ))}
            </div>
          </section>

          {/* What the tracker found */}
          <section className="rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-4">
            <h2 className="text-[13px] font-semibold text-white/80 mb-2">
              {tx('cvcBingo.booksFound')}
            </h2>
            {loading ? (
              <p className="text-[13px] text-white/50">{tx('cvcBingo.loading')}</p>
            ) : recentFailed ? (
              <p className="text-[13px] text-amber-300/80">{tx('cvcBingo.loadFailed')}</p>
            ) : (recent?.books.length || 0) === 0 ? (
              <p className="text-[13px] text-white/50">{tx('cvcBingo.noBooks')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {recent!.books.map((b) => (
                  <li
                    key={b.letter}
                    className="rounded-lg border border-[rgba(52,211,153,0.2)] bg-white/[0.05] px-2.5 py-1 text-[12.5px] text-white/85"
                  >
                    <span className="text-emerald-300/90 font-semibold mr-1.5">{b.letter}</span>
                    {b.title}
                  </li>
                ))}
              </ul>
            )}
            {thin ? (
              <p className="text-[12.5px] text-amber-300/80 mt-2">{tx('cvcBingo.thin')}</p>
            ) : null}
          </section>

          {/* The pool */}
          {pool.length > 0 ? (
            <section>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">
                  {tx('cvcBingo.pool')} ({selected.length})
                </h2>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={() => setDropped(new Set())}>
                    {tx('cvcBingo.allOn')}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDropped(new Set(pool.map((w) => w.word)))}
                  >
                    {tx('cvcBingo.allOff')}
                  </button>
                </div>
              </div>
              <p className="text-[12px] text-white/45 mb-2">{tx('cvcBingo.poolHint')}</p>
              <div className="flex flex-wrap gap-2">
                {pool.map((w) => {
                  const on = !dropped.has(w.word);
                  return (
                    <button
                      key={w.word}
                      onClick={() => toggleWord(w.word)}
                      aria-pressed={on}
                      className={`rounded-lg border px-2.5 py-1 text-[13px] transition ${
                        on
                          ? 'border-emerald-400/40 bg-emerald-400/15 text-white/95'
                          : 'border-white/10 bg-white/[0.03] text-white/35 line-through'
                      }`}
                    >
                      {w.word}
                      {w.hasPhoto ? <span className="ml-1 opacity-60">📷</span> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* The manual fallback */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-1">
              {tx('cvcBingo.manual')}
            </h2>
            <p className="text-[12px] text-white/45 mb-2">{tx('cvcBingo.manualHint')}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_POOL_BOOKS.map((b) => {
                const on = manualLetters.has(b.letter);
                return (
                  <button
                    key={b.letter}
                    onClick={() => toggleBook(b.letter)}
                    aria-pressed={on}
                    className={`rounded-lg border px-2.5 py-1 text-[12.5px] transition ${
                      on
                        ? 'border-emerald-400/40 bg-emerald-400/15 text-white/95'
                        : 'border-white/10 bg-white/[0.03] text-white/60'
                    }`}
                  >
                    <span className="text-emerald-300/90 font-semibold mr-1.5">{b.letter}</span>
                    {b.title}
                  </button>
                );
              })}
            </div>
          </section>

          {/* The board */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-2">
                {tx('cvcBingo.boardSize')}
              </h2>
              <div className="flex gap-2">
                {([3, 4] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setBoardSize(s)}
                    aria-pressed={boardSize === s}
                    className={`btn btn-sm ${boardSize === s ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {s}×{s}
                  </button>
                ))}
              </div>
              {boardSize === 3 ? (
                <label className="flex items-center gap-2 mt-3 text-[13px] text-white/70">
                  <input
                    type="checkbox"
                    checked={freeCentre}
                    onChange={(e) => setFreeCentre(e.target.checked)}
                  />
                  {tx('cvcBingo.freeCentre')}
                </label>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="cb-count"
                className="block text-sm font-semibold text-white/50 uppercase tracking-wide mb-2"
              >
                {tx('cvcBingo.boards')}
              </label>
              <input
                id="cb-count"
                type="number"
                min={1}
                max={MAX_BOARDS}
                value={boardCount}
                onChange={(e) => {
                  setBoardCountTouched(true);
                  setBoardCount(clamp(Number(e.target.value) || 1, 1, MAX_BOARDS));
                }}
                className="w-24 rounded-lg bg-white/[0.06] border border-white/15 px-3 py-1.5 text-white/90"
              />
              {roster.length > 0 ? (
                <p className="text-[12px] text-white/45 mt-1">
                  {tx('cvcBingo.rosterNote')} ({roster.length})
                </p>
              ) : null}
              <button className="btn btn-ghost btn-sm mt-3" onClick={() => setSeed((s) => s + 1)}>
                🔀 {tx('cvcBingo.shuffle')}
              </button>
            </div>
          </section>

          {/* The emblem, and the one honest thing to say about it. */}
          {!emblemUrl ? (
            <section className="rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-4 flex items-center gap-3 flex-wrap">
              <div className="w-11 h-11 shrink-0 rounded-lg border border-dashed border-white/25 flex items-center justify-center text-lg opacity-70">
                🎯
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white/85">{tx('cvcBingo.noEmblem')}</p>
              </div>
              <Link
                href="/montree/dashboard/class-documents#class-emblem"
                className="btn btn-secondary btn-sm shrink-0"
              >
                {tx('cvcBingo.addEmblem')}
              </Link>
            </section>
          ) : null}
        </main>
      </div>

      {/* ── THE PAPER ───────────────────────────────────────────────────── */}
      <div style={pageVars}>
        {boardPages.map((pageBoards, pageIdx) => (
          <div className="cb-page" key={`board-${pageIdx}`}>
            {pageBoards.map((cells, boardIdx) => {
              const globalIdx = pageIdx * 2 + boardIdx;
              const childName = roster[globalIdx]?.name || '';
              let cursor = 0;
              return (
                <div className="cb-board" key={boardIdx}>
                  <div className="cb-head">
                    {emblemUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="cb-emblem" src={emblemUrl} alt="" />
                    ) : null}
                    {childName ? (
                      <span className="cb-name">{childName}</span>
                    ) : (
                      <span className="cb-name-blank" />
                    )}
                    <span className="cb-kicker">{tx('cvcBingo.title')}</span>
                  </div>
                  <div className="cb-grid">
                    {Array.from({ length: boardSize * boardSize }, (_, i) => {
                      const isFree = boardSize === 3 && freeCentre && i === centreIndex;
                      if (isFree) return renderCell(null, i);
                      const w = cells[cursor] ?? null;
                      cursor += 1;
                      return w ? renderCell(w, i) : <div className="cb-cell" key={i} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {callPages.map((cards, pageIdx) => (
          <div className="cb-page" key={`call-${pageIdx}`}>
            <div className="cb-call-head">
              {emblemUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="cb-emblem" src={emblemUrl} alt="" style={{ width: '10mm', height: '10mm' }} />
              ) : null}
              <span>
                {tx('cvcBingo.callingSheet')}
                {classroomName ? ` · ${classroomName}` : ''}
              </span>
            </div>
            <div className="cb-call-grid">
              {cards.map((w) => (
                <div className="cb-call-card" key={w.word}>
                  {w.hasPhoto && w.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.photoUrl} alt="" />
                  ) : null}
                  <span className="cb-call-word">{w.word}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
