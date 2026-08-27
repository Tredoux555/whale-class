// components/montree/tools/ReadingLogTool.tsx
// ============================================================================
// THE READING LOG — a printable home-reading record, in the class's own mark.
// ============================================================================
// A child takes one home, a parent writes the book down and initials it, and
// it comes back. That is the whole ritual, and the sheet exists to be cheap to
// produce: two to an A4 with one cut down the middle, or six for the small
// ones. Nothing here is saved — a reading log is a piece of paper, not a
// record the app keeps, so every option below is client state that lives
// exactly as long as the tab does. No migration, no settings write.
//
// 🚨 THE EMBLEM IS NOT COPIED INTO THIS TOOL. It is read at load time from the
// brand route as the ALREADY-RESOLVED answer (`kit`) — an active classroom
// emblem, else the school's, the rule that lives in
// lib/montree/brand-kit/resolve.ts and ONLY there. This file never re-derives
// it and never stores it: change the emblem on the Class Documents brand card
// and the next load of this tool prints the new one, with nothing to migrate.
//
// 🚨 A SCHOOL'S COLOURS NEVER REACH RAW CSS TEXT. Every themed value is a CSS
// custom property set through React's `style` prop on the sheet root (see
// `pageVars`), re-gated by `safeColor` at that point of injection. The
// stylesheet this file injects carries geometry only, and geometry is ours.
//
// 🚨 `@page` CANNOT BE SCOPED TO A SELECTOR — hence the <style> tag on the
// page rather than a rule in globals.css, which would hijack every other
// print in the repo. Same law, same reason, as
// components/cms/documents/print-css.ts and the Classroom Jobs poster.
'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Quicksand } from 'next/font/google';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { isBrandKitActive, type BrandKit } from '@/lib/montree/brand-kit/types';
// Type only — the RESOLUTION itself is done once, server-side, by
// resolveBrandKit() inside app/api/montree/brand-kit/route.ts. This screen
// reads the answer (`kit` + `scope`); it must never re-decide it.
import type { BrandScope } from '@/lib/montree/brand-kit/resolve';

/** The display face. Quicksand is ALREADY a dependency of this repo (Helper
 *  Name Strips uses it) — deliberately reused instead of pulling two new
 *  Google families in for one sheet, because every added font is one more
 *  build-time fetch that can 404 a deploy. Same rounded, friendly register as
 *  the approved design. */
const quicksand = Quicksand({ subsets: ['latin'], weight: ['500', '600', '700'] });

type Layout = '2up' | '6up';

// ── the paper ───────────────────────────────────────────────────────────────
// Every number below is millimetres of real paper. They were read off the
// approved design (A4 at 96dpi: 1123×794 CSS px = 297×210mm) and converted
// once, here, so nothing downstream has to know about pixels.

interface Geometry {
  /** The printed page. */
  pageW: number;
  pageH: number;
  /** How the cards tile it. */
  cols: number;
  bands: number;
  /** One log card. */
  cardW: number;
  cardH: number;
  padX: number;
  padTop: number;
  padBottom: number;
  /** Head block: the emblem is the tallest thing in it, so it sets the height. */
  emblem: number;
  headGap: number;
  headH: number;
  headGapBelow: number;
  titlePt: number;
  titleMaxChars: number;
  titleFloorPt: number;
  metaPt: number;
  /** Table. */
  tableBorder: number;
  radius: number;
  theadH: number;
  theadPt: number;
  colNo: number;
  colDate: number;
  colInit: number;
  rowMin: number;
  rowMax: number;
  rowNoPt: number;
  /** Footer. */
  footPt: number;
  footBlock: number;
  /** The ghosted mark, as a share of the card's width. */
  watermarkW: number;
  /** Lines-per-sheet control. */
  minRows: number;
  maxRows: number;
  defaultRows: number;
}

const GEO: Record<Layout, Geometry> = {
  // Two logs on an A4 laid sideways, guillotined once down the middle.
  '2up': {
    pageW: 296,
    pageH: 209,
    cols: 2,
    bands: 1,
    cardW: 148,
    cardH: 209,
    padX: 9,
    padTop: 9.5,
    padBottom: 8,
    emblem: 22.8,
    headGap: 3.7,
    headH: 26,
    headGapBelow: 4.8,
    titlePt: 20,
    titleMaxChars: 22,
    titleFloorPt: 12,
    metaPt: 9,
    tableBorder: 0.55,
    radius: 2.6,
    theadH: 10.6,
    theadPt: 10,
    colNo: 11.6,
    colDate: 28.6,
    colInit: 31.2,
    rowMin: 7,
    rowMax: 12,
    rowNoPt: 11,
    footPt: 8,
    footBlock: 5.5,
    watermarkW: 78,
    minRows: 8,
    maxRows: 18,
    defaultRows: 14,
  },
  // Six on an upright A4, cut twice across and once down.
  '6up': {
    pageW: 209,
    pageH: 296,
    cols: 2,
    bands: 3,
    cardW: 104.5,
    cardH: 98.6,
    padX: 6,
    padTop: 6,
    padBottom: 5,
    emblem: 11,
    headGap: 2,
    headH: 13,
    headGapBelow: 2.4,
    titlePt: 11,
    titleMaxChars: 20,
    titleFloorPt: 7,
    metaPt: 6.5,
    tableBorder: 0.4,
    radius: 1.6,
    theadH: 6.6,
    theadPt: 6.5,
    colNo: 5.5,
    colDate: 13.5,
    colInit: 12,
    rowMin: 3.6,
    rowMax: 7,
    rowNoPt: 6.5,
    footPt: 5.5,
    footBlock: 3.4,
    watermarkW: 82,
    minRows: 6,
    maxRows: 12,
    defaultRows: 10,
  },
};

/** The palette a school with no brand kit prints in — the approved design's
 *  own blues, so an unthemed sheet is still a finished-looking sheet rather
 *  than a grey wireframe. */
const DEFAULT_TOKENS = {
  ink: '#0f3d63',
  accent: '#2a8fd8',
  border: '#c9d6e2',
  wash: 'transparent',
};

/** What a kit whose intensity is `whisper` (watermarkOpacity 0) prints when
 *  the teacher has explicitly ticked "faint emblem behind the lines" on THIS
 *  sheet. The stored zero is a default for the official documents; a tick box
 *  on one tool is a deliberate answer for one tool, and honouring the zero
 *  would make the toggle look broken. */
const FALLBACK_WATERMARK_OPACITY = 0.07;

/** 6-digit hex or `transparent` only — the same narrow gate brand-kit/css.ts
 *  applies at ITS point of injection. These values arrive over JSON and end up
 *  as CSS custom property values, so they are re-checked here rather than
 *  trusted because a parser upstream once looked at them. */
function safeColor(value: string | undefined, fallback: string): string {
  return value && (value === 'transparent' || /^#[0-9a-fA-F]{6}$/.test(value))
    ? value
    : fallback;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * 🚨 TYPE ON A PRINT CARD IS SIZED FROM THE STRING, NOT FROM THE CARD (the
 * house law the Classroom Jobs poster learned the hard way). A teacher who
 * names her sheet "Sunflower Room Home Reading Record" must get a smaller
 * title, not a clipped one.
 */
function fontFor(len: number, base: number, maxChars: number, floor: number): number {
  if (len <= maxChars) return base;
  return Math.max(floor, Math.round(((base * maxChars) / len) * 10) / 10);
}

/**
 * The height of one ruled line, solved from what the card actually has left
 * after the head, the footer and the table's own heading band. Solving it
 * (rather than pinning it) is what lets "lines per sheet" be an option at all:
 * ten fat lines and eighteen thin ones both fill the same piece of paper.
 */
function rowHeightMm(g: Geometry, rows: number): number {
  const inner = g.cardH - g.padTop - g.padBottom;
  const available =
    inner - g.headH - g.headGapBelow - g.footBlock - g.theadH - 2 * g.tableBorder;
  return clamp(available / Math.max(1, rows), g.rowMin, g.rowMax);
}

/**
 * The sheet's geometry and its `@page` rule, as one string.
 *
 * 🚨 IT CARRIES NO COLOURS — see the file header. Only the layout it is built
 * for: a landscape page and a portrait page cannot both own `@page`, and only
 * one layout is ever mounted, so the rule is rebuilt when the toggle moves.
 */
function readingLogCss(layout: Layout): string {
  const g = GEO[layout];
  // Every card except those in the last band gets a horizontal cut guide.
  const bottomCut = g.bands > 1 ? (g.bands - 1) * g.cols : 0;

  return `
.rl-page {
  width: ${g.pageW}mm;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(${g.cols}, ${g.cardW}mm);
  grid-template-rows: repeat(${g.bands}, ${g.cardH}mm);
  background: #fff;
  color: var(--rl-ink);
  margin: 0 auto;
}
.rl-card {
  position: relative;
  box-sizing: border-box;
  padding: ${g.padTop}mm ${g.padX}mm ${g.padBottom}mm;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* The cut guides. A dashed hairline between neighbouring cards and NOTHING on
   the outside edge: the page's own trim is the outer cut, and a printed line
   there would only sit inside a margin no printer can reach anyway. */
.rl-page > .rl-card:nth-child(odd) { border-right: 0.3mm dashed var(--rl-border); }
${
  bottomCut > 0
    ? `.rl-page > .rl-card:nth-child(-n+${bottomCut}) { border-bottom: 0.3mm dashed var(--rl-border); }`
    : ''
}

/* The ghosted mark. Absolutely positioned, so it is the one image on this
   sheet that is not a flex child and cannot be squeezed by one. */
.rl-watermark {
  position: absolute;
  left: 50%;
  top: 58%;
  width: ${g.watermarkW}%;
  height: auto;
  transform: translate(-50%, -50%);
  opacity: var(--rl-watermark);
  z-index: 0;
  pointer-events: none;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.rl-card > .rl-head,
.rl-card > .rl-table,
.rl-card > .rl-foot { position: relative; z-index: 1; }

.rl-head {
  display: flex;
  align-items: center;
  gap: ${g.headGap}mm;
  height: ${g.headH}mm;
  margin-bottom: ${g.headGapBelow}mm;
  flex: 0 0 auto;
}
/* 🚨 EXPLICIT WIDTH, HEIGHT AND flex-shrink ON EVERY PRINTED IMAGE — the law
   the jobs poster wrote after a flex child collapsed a column on paper. No
   element on this sheet may depend on flex leftover. */
.rl-emblem {
  width: ${g.emblem}mm;
  height: ${g.emblem}mm;
  aspect-ratio: 1 / 1;
  flex: 0 0 auto;
  object-fit: contain;
}
/* The stand-in a school with no emblem sees while it decides — SCREEN ONLY
   (see @media print below). Paper prints the title flush left rather than a
   dashed box where a mark should be. */
.rl-emblem-ph {
  width: ${g.emblem}mm;
  height: ${g.emblem}mm;
  flex: 0 0 auto;
  border: 0.4mm dashed var(--rl-border);
  border-radius: ${g.radius}mm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${g.emblem * 0.42}mm;
  line-height: 1;
  opacity: 0.65;
}
.rl-headtext {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.6mm;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}
.rl-title {
  font-weight: 700;
  line-height: 1.12;
  color: var(--rl-ink);
  letter-spacing: 0.01em;
  overflow: hidden;
}
.rl-meta {
  display: flex;
  align-items: flex-end;
  gap: 1.4mm;
  font-size: ${g.metaPt}pt;
  line-height: 1.2;
  color: var(--rl-accent);
  opacity: 0.85;
  min-width: 0;
}
.rl-nameline {
  flex: 1 1 auto;
  min-width: 12mm;
  border-bottom: 0.25mm solid var(--rl-border);
  height: ${g.metaPt * 0.4}mm;
}

.rl-table {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  border: ${g.tableBorder}mm solid var(--rl-accent);
  border-radius: ${g.radius}mm;
  overflow: hidden;
  background: var(--rl-wash);
}
.rl-thead,
.rl-row {
  display: grid;
  grid-template-columns: ${g.colNo}mm 1fr ${g.colDate}mm ${g.colInit}mm;
  align-items: center;
}
.rl-thead {
  height: ${g.theadH}mm;
  background: var(--rl-accent);
  color: #ffffff;
  font-weight: 600;
  font-size: ${g.theadPt}pt;
  line-height: 1.05;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.rl-thead > div {
  padding: 0 1mm;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rl-thead > .rl-c-no,
.rl-thead > .rl-c-init { text-align: center; padding: 0; }

.rl-row {
  height: var(--rl-row-h);
  border-bottom: 0.25mm solid var(--rl-border);
}
.rl-row:last-child { border-bottom: none; }
.rl-row > div { height: 100%; border-right: 0.25mm solid var(--rl-border); }
.rl-row > div:last-child { border-right: none; }
.rl-row > .rl-c-no {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: ${g.rowNoPt}pt;
  color: var(--rl-accent);
}

.rl-foot {
  flex: 0 0 auto;
  margin-top: auto;
  padding-top: ${Math.max(1.2, g.footBlock - g.footPt * 0.35)}mm;
  text-align: center;
  font-size: ${g.footPt}pt;
  line-height: 1.2;
  color: var(--rl-accent);
  opacity: 0.6;
}

/* Screen only — a hairline so white paper on a white preview card still reads
   as a sheet. Undone in print, where it would actually print. */
.rl-page { box-shadow: 0 0 0 0.3mm rgba(19, 32, 25, 0.1); }

@media print {
  /* 🚨 MARGIN ZERO, AND THE WHITE BORDER COMES FROM THE CARD'S OWN PADDING.
     Chrome, Edge and Safari draw their own header and footer — date, tab
     title, URL, "1/2" — inside the @page margin box, on by default, and every
     one of them suppresses that furniture when the margin is zero. Do not put
     a non-zero margin back: it would both double the border and bring the
     browser's furniture back. */
  @page { size: A4 ${layout === '2up' ? 'landscape' : 'portrait'}; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .rl-page {
    box-shadow: none;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  /* A dashed box where an emblem is missing is a note to the teacher, not
     something a parent should receive. */
  .rl-emblem-ph { display: none !important; }
}
`.trim();
}

// ── the screen ──────────────────────────────────────────────────────────────

export default function ReadingLogTool() {
  const { t } = useI18n();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [classroomName, setClassroomName] = useState('');
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [scope, setScope] = useState<BrandScope>('none');

  const [layout, setLayout] = useState<Layout>('2up');
  const [rows, setRows] = useState<number>(GEO['2up'].defaultRows);
  const [title, setTitle] = useState('');
  const [watermark, setWatermark] = useState(true);

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
      try {
        // 🚨 THE ROOM IS NAMED, SO THE ROOM'S OWN EMBLEM WINS. The brand route
        // is asked about this classroom and `kit` is read — the ALREADY-RESOLVED
        // answer (an active classroom emblem, else the school's). `brandKit` on
        // that response is the SCHOOL's raw kit and would silently ignore a room
        // that has its own; the fallback below only exists for an older build.
        const res = await montreeApi(
          `/api/montree/brand-kit?classroomId=${encodeURIComponent(roomId)}`
        ).catch(() => null);

        if (cancelled || !res || !res.ok) return;

        const body = (await res.json()) as {
          kit?: BrandKit | null;
          brandKit?: BrandKit | null;
          scope?: BrandScope;
        };
        if (cancelled) return;
        setBrandKit(body.kit !== undefined ? body.kit : body.brandKit ?? null);
        if (body.scope === 'classroom' || body.scope === 'school' || body.scope === 'none') {
          setScope(body.scope);
        }
      } catch {
        // A theme that will not load prints the plain sheet. It never takes
        // the tool down with it.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /** Switching layout re-seeds the line count, because "fourteen" is the right
   *  answer on a half-A4 and a silly one on a sixth of one. */
  const changeLayout = useCallback((next: Layout) => {
    setLayout(next);
    setRows(GEO[next].defaultRows);
  }, []);

  const g = GEO[layout];
  const effRows = clamp(Math.round(rows), g.minRows, g.maxRows);
  const rowH = rowHeightMm(g, effRows);

  // `isBrandKitActive` also rejects a kit that is switched on but paints
  // nothing, so "configured but empty" behaves like off rather than like a
  // theme made of default greys.
  const kit = isBrandKitActive(brandKit) ? brandKit : null;
  const emblemUrl = kit?.logoUrl || null;

  const tokens = kit ? kit.tokens : null;
  const watermarkOpacity =
    watermark && emblemUrl
      ? clamp(tokens?.watermarkOpacity || FALLBACK_WATERMARK_OPACITY, 0, 0.2)
      : 0;

  const pageVars = {
    '--rl-ink': safeColor(tokens?.ink, DEFAULT_TOKENS.ink),
    '--rl-accent': safeColor(tokens?.accent, DEFAULT_TOKENS.accent),
    '--rl-border': safeColor(tokens?.border, DEFAULT_TOKENS.border),
    '--rl-wash': safeColor(tokens?.wash, DEFAULT_TOKENS.wash),
    '--rl-watermark': String(watermarkOpacity),
    '--rl-row-h': `${rowH}mm`,
  } as CSSProperties;

  // The title that actually prints. A blank or whitespace-only edit reads as
  // "nobody chose one" rather than as a sheet deliberately headed with
  // nothing — the same rule the jobs poster applies to its own title.
  const defaultTitle = `${classroomName} ${t('readingLog.defaultTitle')}`.trim();
  const effectiveTitle = title.trim() || defaultTitle;

  const cards = Array.from({ length: g.cols * g.bands }, (_, i) => i);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">📖</div>
          <p className="text-white/40">{t('labels.loading')}</p>
        </div>
      </div>
    );
  }

  const sheet = (
    <div className={`rl-page ${quicksand.className}`} style={pageVars}>
      {cards.map((i) => (
        <div className="rl-card" key={i}>
          {emblemUrl && watermarkOpacity > 0 ? (
            <img className="rl-watermark" src={emblemUrl} alt="" aria-hidden />
          ) : null}
          <div className="rl-head">
            {emblemUrl ? (
              <img className="rl-emblem" src={emblemUrl} alt="" />
            ) : (
              <div className="rl-emblem-ph" aria-hidden>
                📖
              </div>
            )}
            <div className="rl-headtext">
              <div
                className="rl-title"
                style={{
                  fontSize: `${fontFor(
                    effectiveTitle.length,
                    g.titlePt,
                    g.titleMaxChars,
                    g.titleFloorPt
                  )}pt`,
                }}
              >
                {effectiveTitle}
              </div>
              <div className="rl-meta">
                <span>{t('readingLog.paper.name')}</span>
                <span className="rl-nameline" />
              </div>
            </div>
          </div>

          <div className="rl-table">
            <div className="rl-thead">
              <div className="rl-c-no">{t('readingLog.paper.colNo')}</div>
              <div className="rl-c-title">{t('readingLog.paper.colBook')}</div>
              <div className="rl-c-date">{t('readingLog.paper.colDate')}</div>
              <div className="rl-c-init">{t('readingLog.paper.colInitials')}</div>
            </div>
            {Array.from({ length: effRows }, (_, r) => (
              <div className="rl-row" key={r}>
                <div className="rl-c-no">{r + 1}</div>
                <div className="rl-c-title" />
                <div className="rl-c-date" />
                <div className="rl-c-init" />
              </div>
            ))}
          </div>

          <div className="rl-foot">{t('readingLog.paper.footer')}</div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-[#0a1a0f] print:hidden relative">
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)',
          }}
        />

        <main className="relative p-4 max-w-3xl mx-auto space-y-6 pb-24">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-white/60">{t('readingLog.subtitle')}</p>
            <button onClick={() => window.print()} className="btn btn-primary btn-sm shrink-0">
              🖨️ {t('common.print')}
            </button>
          </div>

          {/* The emblem, and the one honest thing to say about it. */}
          <section className="rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-4">
            {emblemUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={emblemUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="w-11 h-11 object-contain shrink-0 rounded-lg bg-white/90 p-1"
                />
                <div className="min-w-0">
                  <p className="text-[13px] text-white/85">
                    {scope === 'classroom'
                      ? t('readingLog.emblemScopeClassroom')
                      : t('readingLog.emblemScopeSchool')}
                  </p>
                  <Link
                    href="/montree/dashboard/class-documents#class-emblem"
                    className="text-[12px] text-emerald-300/80 underline underline-offset-2"
                  >
                    {t('readingLog.changeEmblem')}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-11 h-11 shrink-0 rounded-lg border border-dashed border-white/25 flex items-center justify-center text-lg opacity-70">
                  📖
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white/85">
                    {t('readingLog.noEmblem')}
                  </p>
                  <p className="text-[12px] text-white/50 leading-snug">
                    {t('readingLog.noEmblemHint')}
                  </p>
                </div>
                <Link
                  href="/montree/dashboard/class-documents#class-emblem"
                  className="btn btn-secondary btn-sm shrink-0"
                >
                  {t('readingLog.addEmblem')}
                </Link>
              </div>
            )}
          </section>

          {/* Layout */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">
              {t('readingLog.layoutLabel')}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {(['2up', '6up'] as Layout[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => changeLayout(opt)}
                  aria-pressed={layout === opt}
                  className={`btn btn-sm ${layout === opt ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {opt === '2up' ? t('readingLog.layout2up') : t('readingLog.layout6up')}
                </button>
              ))}
            </div>
          </section>

          {/* Title */}
          <section>
            <label
              htmlFor="rl-title"
              className="block text-sm font-semibold text-white/50 uppercase tracking-wide mb-2"
            >
              {t('readingLog.titleLabel')}
            </label>
            <input
              id="rl-title"
              type="text"
              value={title}
              maxLength={60}
              placeholder={defaultTitle}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[rgba(52,211,153,0.2)] bg-white/[0.06] px-3 py-2.5 text-sm text-white/90 placeholder:text-white/30 outline-none focus:border-[#34d399]"
            />
          </section>

          {/* Lines per sheet */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">
                {t('readingLog.rowsLabel')}
              </h2>
              <span className="text-sm font-semibold text-emerald-300/90">{effRows}</span>
            </div>
            <input
              type="range"
              min={g.minRows}
              max={g.maxRows}
              step={1}
              value={effRows}
              onChange={(e) => setRows(Number(e.target.value))}
              aria-label={t('readingLog.rowsLabel')}
              className="w-full accent-[#34d399]"
            />
          </section>

          {/* Watermark */}
          <section>
            <button
              onClick={() => setWatermark((w) => !w)}
              disabled={!emblemUrl}
              aria-pressed={watermark && !!emblemUrl}
              className={`btn btn-sm ${watermark && emblemUrl ? 'btn-primary' : 'btn-ghost'}`}
            >
              {watermark && emblemUrl ? '☑' : '☐'} {t('readingLog.watermarkLabel')}
            </button>
          </section>

          {/* Preview */}
          <section>
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3">
              {t('labels.preview')}
            </h2>
            <p className="text-[12px] text-white/40 mb-2">{t('readingLog.previewHint')}</p>
            <div className="bg-white rounded-xl border border-[rgba(52,211,153,0.15)] p-4 shadow-sm overflow-x-auto">
              {sheet}
            </div>
          </section>
        </main>
      </div>

      {/* Print-only copy — the screen chrome above is display:none in print,
          so nothing of it survives to take up a page. */}
      <div className="hidden print:block">{sheet}</div>

      {/* 🚨 ONE TOP-LEVEL <style> TAG, never nested inside a conditional
          branch — the locked Turbopack rule (see CLAUDE.md, May 29 2026) —
          and never in globals.css, because @page cannot be scoped. */}
      <style dangerouslySetInnerHTML={{ __html: readingLogCss(layout) }} />
    </>
  );
}
