// /montree/library/dark-phonics/page.tsx
// Montree Library — Dark Phonics, the whole programme on one page.
//
// One card per lesson (49 lessons): the song, the music video, the song card
// picture, the letter book, the easy reader and the printables — every asset
// that exists for that sound, in teaching order. This is the all-in-one
// replacement for the multi-tab hub at public/dark-phonics.html; the old hub
// stays put and now carries a banner pointing here.
//
// NUMBERING: the curriculum's own lesson numbers are 5–53 and every media
// object is still named lesson-05 … lesson-53. The PAGE shows 1–49 — see
// displayN() below. Internal n and every media key stay untouched.
//
// Hardcoded English, deliberately bypassing i18n — the same sanctioned
// exception as app/montree/library/satpin/page.tsx: the content itself IS
// English (the sounds, the catchphrases, the book titles), so translating the
// chrome around it would only make the page disagree with its own assets.
//
// Public: no auth. middleware.ts exempts /montree/library/*.
//
// Data sources, merged into LESSONS below — keep them in step:
//   public/dark-phonics-playlist.html                                n / sound / title / catchphrase (canonical)
//   lib/montree/english-curriculum/spec/dark-phonics-hardcards.json  vocab words (46 of 49 — 33/34/46 are review/abstract)
//   public/dark-phonics-books/                                       the four "THE ___" letter books (covers + print PDFs)
//   public/dark-phonics-readers.html                                 the 11 easy readers + their gate lessons
//   scripts/curriculum/flashcards/books_def.py (weeks 3–6) +
//   scripts/curriculum/dark-phonics-readers/book07.py–book27.py      decodable words + heart words per lesson's
//   (weeks 7–27; book/week N = lesson N + 4)                         reader (RawLesson.decodable / .heartWords)
//
// Media lives in the public `dark-phonics` Supabase bucket and is served
// through /api/montree/media/proxy/<path>?bucket=dark-phonics. WHICH lessons
// actually have a video / picture / flashcard is asked once on mount from
// /api/montree/phonics-videos (the same source the playlist page gates on) —
// anything missing shows a dashed placeholder instead of a broken player.
// Every player is preload="none" and every image loading="lazy": 49 cards must
// never pull a hundred media files on load.
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/montree/LanguageToggle';
import DecodableLedger from '@/components/montree/satpin/DecodableLedger';
import { getProxyUrl, getThumbnailUrl, getThumbnailSrcSet } from '@/lib/montree/media/proxy-url';
// The curriculum data itself (the 49 lessons + the numbering helpers) lives in
// lib/montree/dark-phonics/lessons.ts so the Online Classes live classroom can
// teach from exactly the same list this page renders. Data only — no React.
import { RAW, nn, displayN, type RawLesson, type Book, type Reader } from '@/lib/montree/dark-phonics/lessons';

/** Media-proxy URL for a path inside the public `dark-phonics` bucket. */
const media = (path: string, v?: number) =>
  `/api/montree/media/proxy/${path}?bucket=dark-phonics${v ? `&v=${v}` : ''}`;

/**
 * Cache-buster for the storybook print PDFs served straight out of
 * public/dark-phonics-books/print/ and public/dark-phonics-materials/ — NOT
 * proxied, so they carry no built-in versioning of their own and are served
 * with a several-hour Cache-Control by both the browser and Cloudflare. Bump
 * this whenever ANY book's print PDF or materials are rebuilt (the curated
 * rebuild project touches every book eventually); a stale value here is
 * exactly the "book still shows the old art" bug filed 2026-08-02.
 */
const STORYBOOK_PRINT_VERSION = 15; // bumped 2026-08-22: build-it-sheet.pdf (word-card grid merged in) and tracing-workbook.pdf (real A5 reader rebuild) republished for the-spat
const printPdf = (path: string) => `${path}?v=${STORYBOOK_PRINT_VERSION}`;

// NOTE: the 16 sat-cast letter books each also have a word-level A5 tracing
// booklet (public/dark-phonics-books/print/<slug>-A5-tracing-booklet-print.pdf,
// built via scripts/curriculum/flashcards/build_tracing_booklet.py --all) and
// many books/readers have a 4-piece "book-works" pack
// (public/dark-phonics-books/works/<slug>/). 2026-08-22 per Tredoux: neither
// is linked from this page — archived, not deleted, so the Printables row
// stays the same clean set (Letter card PDF / Read-along / Print booklet A5
// / Paperwork pack / Build-it sheet / Tracing workbook) on every book. The
// old TRACING_BOOKLET_SLUGS gate that used to surface the tracing booklet
// pill was removed along with it.

/** Trimmed-down photo-bank row — only the fields this page renders/forwards. */
interface BankPhoto {
  id: string;
  label: string;
  filename: string;
  storage_path: string;
  public_url: string;
  tags?: string[] | null;
}

/**
 * 🚨 STYLE SEPARATION (locked): this page is Dark Phonics and shows the Seuss
 * pen-and-ink ILLUSTRATIONS ONLY. The real Montessori photographs belong to
 * the Montree Phonics page and must never appear here. Image resolution is
 * therefore TAG-ONLY — a picture is used if and only if it carries this
 * book's own 'dark-phonics-book-<slug>' tag. Never reintroduce a
 * first-exact-match or SATPIN-basket fallback: both leaked real photographs
 * onto this page. A book with no tagged art renders the "no pictures yet"
 * placeholder instead.
 */

/**
 * A book's scene pictures — searched by slug, kept if tagged
 * 'dark-phonics-book-<slug>', sorted p1→pN by the page number embedded in
 * the label ("<slug> p1-ant").
 */
async function fetchBookPictures(slug: string): Promise<BankPhoto[]> {
  try {
    const params = new URLSearchParams({ page: '1', limit: '20', kind: 'pictures', q: slug });
    const res = await fetch(`/api/montree/photo-bank?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    const photos: BankPhoto[] = data.photos || [];
    const tag = `dark-phonics-book-${slug}`;
    const matches = photos.filter(p => (p.tags || []).some(t => String(t || '').trim().toLowerCase() === tag));
    const pageNum = (label: string) => {
      const m = /p(\d+)-/.exec(label || '');
      return m ? parseInt(m[1], 10) : 999;
    };
    return matches.sort((a, b) => pageNum(a.label) - pageNum(b.label));
  } catch {
    return [];
  }
}

/** Photo-bank rows are rendered through the Cloudflare-cached proxy, never public_url. */
function photoSrc(photo: BankPhoto, width: number): string {
  if (!photo.storage_path) return photo.public_url || '';
  return getThumbnailUrl(photo.storage_path, width, 70, 'photo-bank');
}

type Lesson = RawLesson & { accent: string; tint: string };

/**
 * Card colours: Tailwind 400-level accent / 200-level tint, walked round the
 * hue wheel and cycled per lesson so no two neighbouring cards share a colour.
 */
const PALETTE: Array<[string, string]> = [
  ['52,211,153', '167,243,208'],   // emerald
  ['244,114,182', '251,207,232'],  // pink
  ['167,139,250', '221,214,254'],  // violet
  ['252,211,77', '253,230,138'],   // amber
  ['96,165,250', '191,219,254'],   // blue
  ['232,121,249', '245,208,254'],  // fuchsia
  ['74,222,128', '187,247,208'],   // green
  ['251,113,133', '254,205,211'],  // rose
  ['34,211,238', '165,243,252'],   // cyan
  ['251,146,60', '254,215,170'],   // orange
  ['129,140,248', '199,210,254'],  // indigo
  ['163,230,53', '217,249,157'],   // lime
];

/** Same list, with a colour stamped on each card. */
const LESSONS: Lesson[] = RAW.map((l, i) => ({
  ...l,
  accent: PALETTE[i % PALETTE.length][0],
  tint: PALETTE[i % PALETTE.length][1],
}));

/** The tile holds anything from 's' to 'tw / dw blends' — shrink to fit. */
function soundClass(sound: string): string {
  if (sound.length <= 2) return 'text-3xl font-bold leading-none';
  if (sound.length <= 6) return 'text-base font-bold leading-tight text-center';
  return 'text-[9px] font-bold leading-tight text-center uppercase tracking-wide';
}

/** What /api/montree/phonics-videos hands back: lesson numbers per asset kind. */
type MediaIndex = { uploaded: number[]; pictures: number[]; flashcards: number[] };

export default function DarkPhonicsPage() {
  const router = useRouter();
  /** null until the existence check returns — nothing media-gated renders before then. */
  const [index, setIndex] = useState<MediaIndex | null>(null);
  /** Book scene pictures, keyed by slug — one fetch per letter book. */
  const [bookPictures, setBookPictures] = useState<Record<string, BankPhoto[]>>({});
  /** False once the book-picture fetch has settled — until then a book with no
   *  rows shows '…' rather than the "no pictures yet" placeholder. */
  const [picturesLoading, setPicturesLoading] = useState(true);

  /** "Jump to" box — type a letter or sound label ('b', 'sh', 'th (voiced)')
   *  and the matching lesson card scrolls into view. No filtering, no hiding
   *  other cards: just a fast way to skip the scroll on a 49-card page. */
  const [jumpTerm, setJumpTerm] = useState('');
  const [jumpHighlight, setJumpHighlight] = useState<number | null>(null);
  const jumpHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const jumpToTerm = useCallback((raw: string) => {
    const term = raw.trim().toLowerCase();
    if (!term) return;
    // Exact match on the sound label first (handles 'sh', 'ch', 'qu' and the
    // longer review labels), then fall back to "starts with" for a single
    // letter or the first few letters of a label.
    const target =
      LESSONS.find(l => l.sound.toLowerCase() === term) ??
      LESSONS.find(l => l.sound.toLowerCase().startsWith(term));
    if (!target) return;
    // Scroll the window directly rather than el.scrollIntoView(): on this
    // page scrollIntoView's nearest-scrollable-ancestor walk can land on the
    // 'overflow-hidden' background wrapper instead of the document, which
    // silently no-ops the scroll. Compute the absolute offset and drive
    // window.scrollTo ourselves — unambiguous, and re-asserted one frame
    // later in case media (video posters, images) still reflowing the layout
    // shortens the first pass.
    //
    // Instant, not smooth: the page is ~50,000px of 49 cards' worth of
    // audio/video/img elements, and an animated multi-second scroll across
    // that distance was observed getting cut short — likely the main thread
    // getting busy with lazy-loading media as it scrolls past dozens of
    // cards, which starves/cancels the smooth-scroll animation partway. A
    // single instant jump sidesteps that entirely and matches "jump to"
    // better than a multi-second animated scroll would anyway.
    const scrollToCard = () => {
      const el = document.getElementById(`lesson-${target.n}`);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top, behavior: 'auto' });
    };
    scrollToCard();
    requestAnimationFrame(() => requestAnimationFrame(scrollToCard));
    setJumpHighlight(target.n);
    if (jumpHighlightTimer.current) clearTimeout(jumpHighlightTimer.current);
    jumpHighlightTimer.current = setTimeout(() => setJumpHighlight(null), 1600);
  }, []);

  useEffect(() => {
    jumpToTerm(jumpTerm);
  }, [jumpTerm, jumpToTerm]);

  useEffect(() => () => {
    if (jumpHighlightTimer.current) clearTimeout(jumpHighlightTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/phonics-videos');
        if (!res.ok) return;
        const j = await res.json();
        if (cancelled) return;
        setIndex({
          uploaded: Array.isArray(j?.uploaded) ? j.uploaded : [],
          pictures: Array.isArray(j?.pictures) ? j.pictures : [],
          flashcards: Array.isArray(j?.flashcards) ? j.flashcards : [],
        });
      } catch {
        /* endpoint unreachable — the gated rows just stay as placeholders */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Book scene pictures — one fetch per letter-book slug, batched.
  useEffect(() => {
    let cancelled = false;
    const slugs = Array.from(new Set(LESSONS.flatMap(l => (l.books ?? []).map(b => b.slug))));
    (async () => {
      const found = await Promise.all(slugs.map(async (slug) => [slug, await fetchBookPictures(slug)] as const));
      if (cancelled) return;
      const map: Record<string, BankPhoto[]> = {};
      for (const [slug, photos] of found) map[slug] = photos;
      setBookPictures(map);
      setPicturesLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * Hand a set of pictures to the Picture Library hub. Uses the
   * `photoBankPreselect` key — deliberately NOT `photoBankExport`, which the
   * creation tools consume-and-delete on mount. Copied verbatim from
   * app/montree/library/satpin/page.tsx.
   */
  const createMaterials = useCallback((photos: BankPhoto[]) => {
    if (photos.length === 0) return;
    const payload = photos.map(p => ({
      id: p.id,
      label: p.label,
      public_url: p.storage_path ? getProxyUrl(p.storage_path, 'photo-bank') : p.public_url,
      filename: p.filename,
    }));
    try {
      sessionStorage.setItem('photoBankPreselect', JSON.stringify({ photos: payload }));
    } catch (err) {
      console.error('Failed to stage Dark Phonics pictures:', err);
      return;
    }
    router.push('/montree/library/photo-bank');
  }, [router]);

  const has = (kind: keyof MediaIndex, n: number) => !!index && index[kind].includes(n);

  /** Slim dashed row — every "not made yet" slot on the page. */
  const EmptySlot = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-3 rounded-xl border border-dashed border-white/[0.06] px-4 py-2.5 text-center">
      <span className="text-white/20 text-xs">{children}</span>
    </div>
  );

  /** Standard sub-row: accent-tinted shell with an uppercase eyebrow label. */
  const Row = ({ accent, label, right, children }: {
    accent: string;
    label: string;
    right?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div
      className="mt-3 rounded-xl border px-4 py-3 text-left"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: `rgba(${accent},0.16)` }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-white/25 text-[10px] tracking-wider uppercase">{label}</div>
        {right}
      </div>
      {children}
    </div>
  );

  /** Neutral pill link — downloads, PDFs, readers. */
  const Pill = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-2 rounded-lg border text-xs transition-all hover:bg-white/[0.06]"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
    >
      {children}
    </a>
  );

  /** 5-col thumbnail grid + hand-off for a book's scene pictures. */
  const BookPictureRow = ({ slug, accent }: { slug: string; accent: string }) => {
    const photos = bookPictures[slug] || [];
    return (
      <div className="mt-4">
        <div className="text-white/30 text-xs mb-2 text-left">Book pictures — from the book</div>
        <div className="grid grid-cols-5 gap-2">
          {photos.length > 0 ? photos.map((photo) => (
            <div
              key={photo.id}
              className="rounded-lg overflow-hidden border"
              style={{ borderColor: `rgba(${accent},0.16)`, background: 'rgba(255,255,255,0.04)' }}
              title={photo.label}
            >
              <div className="aspect-square flex items-center justify-center">
                <img
                  src={photoSrc(photo, 240)}
                  srcSet={photo.storage_path ? getThumbnailSrcSet(photo.storage_path, 120, 70, 'photo-bank') : undefined}
                  sizes="(max-width: 640px) 18vw, 120px"
                  alt={photo.label}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )) : (
            <span className="col-span-5 text-white/15 text-[10px] text-center py-3">
              {picturesLoading ? '…' : 'no pictures yet'}
            </span>
          )}
        </div>
        <button
          onClick={() => createMaterials(photos)}
          disabled={photos.length === 0}
          className="mt-3 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: `rgba(${accent},0.35)`,
            background: `rgba(${accent},0.10)`,
            color: `rgb(${accent})`,
          }}
        >
          Create materials with these pictures →
        </button>
      </div>
    );
  };

  /** The clean 6-pill Printables set for ONE book: Read-along, Print booklet
   *  A5, and (where book.materials !== false) Paperwork pack / Build-it
   *  sheet / Tracing workbook. Letter card PDF is lesson-level, not book-
   *  level, so it is NOT included here — callers add it separately. Shared
   *  between the single-book case (no label needed) and the multi-book case
   *  (n=7 the-sat+the-tall, n=8 the-spat+the-pat — labelled per book so it is
   *  never ambiguous which pill belongs to which book, 2026-08-22 per
   *  Tredoux). */
  const BookPrintablePills = ({ book }: { book: Book }) => (
    <>
      <Pill href={printPdf(`/dark-phonics-books/print/${book.slug}-A5-reading.pdf`)}>Read-along</Pill>
      <Pill href={printPdf(`/dark-phonics-books/print/${book.slug}-A5-booklet-print.pdf`)}>Print booklet A5</Pill>
      {book.materials !== false && (
        <>
          <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/paperwork-pack.pdf`)}>Paperwork pack</Pill>
          <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/build-it-sheet.pdf`)}>Build-it sheet</Pill>
          <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/tracing-workbook.pdf`)}>Tracing workbook</Pill>
        </>
      )}
    </>
  );

  /**
   * The decodable ledger — what the child can actually READ by this lesson.
   * NEW words (this lesson's reader) are highlighted in the reader red;
   * everything decodable from earlier lessons follows muted, newest first
   * (same order as the books' REVIEW lists). Lessons 5–6 are sounds only;
   * lessons 32–53 add no new reader, so they carry the running total forward.
   * Shared styling with app/montree/library/satpin/page.tsx.
   */
  const DecodableRow = ({ lesson, index }: { lesson: Lesson; index: number }) => {
    const newWords = lesson.decodable ?? [];
    // Newest-first, mirroring how the books stack their REVIEW lines.
    const prior = LESSONS.slice(0, index).reverse().flatMap(l => l.decodable ?? []);
    const hearts = LESSONS.slice(0, index + 1).flatMap(l => l.heartWords ?? []);
    return <DecodableLedger newWords={newWords} prior={prior} hearts={hearts} />;
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ background: '#06140e' }}>

      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
          radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
          linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
        `,
      }} />

      <nav
        className="relative z-10 px-6 pb-5 flex items-center justify-between gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
      >
        <Link href="/montree/library" className="text-white/40 text-sm hover:text-white/70 transition-colors shrink-0">
          ← Library
        </Link>
        <div className="flex items-center gap-3 shrink-0">
          {/* The star of the nav: every song, back to back, no tapping. */}
          <a
            href="/dark-phonics-playlist.html"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(167,139,250,0.28), rgba(124,58,237,0.16))',
              borderColor: 'rgba(167,139,250,0.45)',
              color: 'rgb(221,214,254)',
            }}
          >
            ▶ Full Playlist
          </a>
          <LanguageToggle />
        </div>
      </nav>

      {/* Jump to a letter/sound — fixed top-left so it stays reachable while
          scrolling through 49 cards. Typing scrolls the matching card into
          view; it never hides or filters the rest of the page. Green glow
          ring makes it read as a live "utility" control, distinct from the
          violet brand chrome. */}
      <div
        className="fixed left-4 z-20"
        style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }}
      >
        <div className="relative">
          <div
            className="absolute -inset-1.5 rounded-full blur-md animate-pulse pointer-events-none"
            style={{ background: 'rgba(52,211,153,0.55)' }}
            aria-hidden="true"
          />
          <div
            className="relative flex items-center gap-2 pl-4 pr-2 py-2 rounded-full border backdrop-blur-md"
            style={{
              background: 'rgba(6,20,14,0.9)',
              borderColor: 'rgba(52,211,153,0.8)',
              boxShadow: '0 0 18px 3px rgba(52,211,153,0.55), 0 8px 24px rgba(0,0,0,0.45)',
            }}
          >
            <span className="text-emerald-200/60 text-xs whitespace-nowrap">Jump to</span>
            <input
              type="text"
              value={jumpTerm}
              onChange={(e) => setJumpTerm(e.target.value)}
              placeholder="b, sh, th…"
              maxLength={16}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Jump to a letter or sound"
              className="w-24 bg-transparent outline-none text-white text-sm placeholder-white/25"
            />
            {jumpTerm && (
              <button
                type="button"
                onClick={() => setJumpTerm('')}
                aria-label="Clear"
                className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.08] text-sm leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex justify-center px-4 sm:px-6 pb-8">
        <div className="max-w-3xl w-full text-center">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-white/50 text-xs tracking-wide uppercase">49 Sound-Songs</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            <span style={{ background: 'linear-gradient(135deg, #c4b5fd, #a78bfa, #ddd6fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Dark Phonics
            </span>
          </h1>

          <p className="text-white/40 mt-5 text-lg max-w-lg mx-auto leading-relaxed">
            The whole programme on one page — lessons 1 to 49, in teaching order.
            Song, music video, song card, letter book, easy reader and printables,
            all in the one card per sound.
          </p>

          <p className="text-white/25 mt-3 text-sm max-w-md mx-auto leading-relaxed">
            Daily rhythm, ten minutes: sing the song &middot; flash the cards &middot; done.
          </p>

          {/* One card per lesson */}
          <div className="mt-8 space-y-4">
            {LESSONS.map((l, index) => {
              const song = media(`songs/lesson-${nn(l.n)}.mp3`);
              const video = media(`videos/lesson-${nn(l.n)}.mp4`);
              const picture = media(`pictures/lesson-${nn(l.n)}.png`);

              const jumped = jumpHighlight === l.n;
              return (
                <div
                  key={l.n}
                  id={`lesson-${l.n}`}
                  className="rounded-2xl border p-4 sm:p-6 scroll-mt-6"
                  style={{
                    background: `linear-gradient(135deg, rgba(${l.accent},0.09), rgba(${l.accent},0.02))`,
                    borderColor: jumped ? `rgb(${l.accent})` : `rgba(${l.accent},0.18)`,
                    boxShadow: jumped ? `0 0 0 3px rgba(${l.accent},0.45)` : 'none',
                    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                  }}
                >
                  {/* Sound tile + lesson line + catchphrase */}
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 px-1"
                      style={{ background: `rgba(${l.accent},0.16)` }}
                    >
                      <span className={soundClass(l.sound)} style={{ color: `rgb(${l.accent})` }}>
                        {l.sound}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white font-semibold text-base sm:text-lg">
                        Lesson {displayN(l.n)} — {l.title}
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: `rgba(${l.tint},0.5)` }}>
                        {l.catchphrase}
                      </div>
                    </div>
                  </div>

                  {/* Word chips — the lesson's hard-card vocab, every lesson.
                      (Book-specific chips + the vocab photo grid were retired
                      with the 27 pattern storybooks on 2026-08-03.) */}
                  {(() => {
                    const chipWords = l.words ?? [];
                    return chipWords.length > 0 ? (
                      <>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {chipWords.map((w) => (
                            <span
                              key={w}
                              className="px-3 py-1.5 rounded-full text-sm"
                              style={{
                                background: `rgba(${l.accent},0.12)`,
                                border: `1px solid rgba(${l.accent},0.22)`,
                                color: `rgba(${l.tint},0.85)`,
                              }}
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 text-left text-[11px] text-white/20">
                        Review lesson &middot; no new vocab words
                      </div>
                    );
                  })()}

                  {/* Decodable ledger — what the child can READ by this lesson */}
                  <DecodableRow lesson={l} index={index} />

                  {/* SONG — every lesson has one */}
                  <Row
                    accent={l.accent}
                    label="Song"
                    right={<Pill href={song}>Download</Pill>}
                  >
                    <audio
                      controls
                      preload="none"
                      src={song}
                      className="w-full h-9"
                      style={{ colorScheme: 'dark' }}
                    />
                  </Row>

                  {/* MUSIC VIDEO — only where the mp4 is actually uploaded */}
                  {has('uploaded', l.n) ? (
                    <Row
                      accent={l.accent}
                      label="Music video"
                      right={<Pill href={video}>Download</Pill>}
                    >
                      <video
                        controls
                        playsInline
                        preload="none"
                        src={video}
                        poster={has('pictures', l.n) ? picture : undefined}
                        className="w-full rounded-lg"
                        style={{ aspectRatio: '1 / 1', background: '#000', objectFit: 'contain' }}
                      />
                    </Row>
                  ) : (
                    <EmptySlot>Music video — coming soon</EmptySlot>
                  )}

                  {/* SONG CARD — the picture the flashcards are cut from */}
                  {has('pictures', l.n) ? (
                    <Row
                      accent={l.accent}
                      label="Song card"
                      right={<Pill href={picture}>Full size</Pill>}
                    >
                      <a href={picture} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={picture}
                          alt={`Lesson ${displayN(l.n)} song card`}
                          loading="lazy"
                          className="rounded-lg w-full max-w-[240px]"
                          style={{ background: '#0e0e16' }}
                        />
                      </a>
                    </Row>
                  ) : (
                    <EmptySlot>Song card — coming soon</EmptySlot>
                  )}

                  {/* LETTER BOOK(S) — only lessons 7 (the-sat, the-tall), 8
                      (the-spat) and 9 (the-pit) carry one today; a lesson can
                      carry more than one (target: up to ~5 per lesson). */}
                  {l.books?.map((book, bi) => (
                    <Row
                      key={book.slug}
                      accent={l.accent}
                      label={l.books!.length > 1 ? `Story book ${bi + 1}` : 'Story book'}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={book.cover ?? media(`books/covers/${book.slug}.png`, 4)}
                          alt={book.title}
                          loading="lazy"
                          className="w-16 rounded-md shrink-0"
                          style={{ background: '#0e0e16' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 font-medium text-sm">{book.title}</div>
                          <div className="text-white/35 text-xs mt-0.5 leading-relaxed">
                            {book.description ?? 'Initial-sound pattern book — the child shouts the picture word.'}
                          </div>
                          {/* Tracing booklet A5 (word-level) and every other
                              download for this book now live in the single
                              Printables row below — 2026-08-22 per Tredoux,
                              one row per book, no split/duplicate pills. */}
                        </div>
                      </div>

                      {/* Book scene pictures + their own hand-off */}
                      <BookPictureRow slug={book.slug} accent={l.accent} />

                    </Row>
                  ))}

                  {/* EASY READER — only on the 11 gate lessons */}
                  {l.reader && (
                    <Row accent={l.accent} label="Easy reader · 100% decodable">
                      <div className="flex flex-wrap gap-2">
                        <Pill href={media(`readers/${l.reader.slug}.pdf`, 3)}>
                          📗 {l.reader.title}
                        </Pill>
                      </div>
                    </Row>
                  )}

                  {/* PRINTABLES — every download for this lesson's book(s)
                      and/or reader in ONE row: flashcard deck, read-along,
                      print booklet, and the paperwork/build-it/tracing-
                      workbook family (public/dark-phonics-materials/<slug>/).
                      2026-08-22 per Tredoux: kept to exactly this clean set on
                      every book, matching ant-on-my-apple. The word-level
                      tracing booklet (public/dark-phonics-books/print/
                      <slug>-A5-tracing-booklet-print.pdf, sat-cast books only)
                      and the 4 manipulative book-works
                      (public/dark-phonics-books/works/<slug>/, `works: true`
                      books) are intentionally NOT rendered here — archived,
                      not deleted: the files stay put, just no longer linked
                      from the page. Vocab cards and three-part cards stay
                      dropped from the set; sentence strips are the trailing
                      page(s) of build-it-sheet.pdf, not their own pill. */}
                  {has('flashcards', l.n) || (l.books && l.books.length > 0) || l.reader?.materials ? (
                    <Row accent={l.accent} label="Printables">
                      <div className="flex flex-wrap gap-2">
                        {has('flashcards', l.n) && (
                          <Pill href={media(`flashcards/lesson-${nn(l.n)}.pdf`)}>Letter card PDF</Pill>
                        )}
                        {l.books?.map(book => (
                          l.books!.length > 1 ? (
                            // Multiple books this lesson (n=7 the-sat + the-tall,
                            // n=8 the-spat + the-pat) — label each book's group so
                            // it is never ambiguous which pill belongs to which
                            // book. w-full forces its own line in the flex-wrap row.
                            <div key={book.slug} className="w-full flex flex-wrap items-center gap-2">
                              <span className="text-white/30 text-[11px] font-medium shrink-0">{book.title}</span>
                              <BookPrintablePills book={book} />
                            </div>
                          ) : (
                            <React.Fragment key={book.slug}>
                              <BookPrintablePills book={book} />
                            </React.Fragment>
                          )
                        ))}
                        {l.reader?.materials && (
                          <React.Fragment key={l.reader.materialsSlug ?? l.reader.slug}>
                            <Pill href={printPdf(`/dark-phonics-materials/${l.reader.materialsSlug ?? l.reader.slug}/paperwork-pack.pdf`)}>Paperwork pack</Pill>
                            <Pill href={printPdf(`/dark-phonics-materials/${l.reader.materialsSlug ?? l.reader.slug}/build-it-sheet.pdf`)}>Build-it sheet</Pill>
                            <Pill href={printPdf(`/dark-phonics-materials/${l.reader.materialsSlug ?? l.reader.slug}/tracing-workbook.pdf`)}>Tracing workbook</Pill>
                          </React.Fragment>
                        )}
                      </div>
                    </Row>
                  ) : (
                    <EmptySlot>Printables — coming soon</EmptySlot>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-white/30 mt-12 text-sm leading-relaxed max-w-md mx-auto">
            One silly song per sound, in teaching order. Sing it every day for a week —
            the repetition is the whole trick.
          </p>

        </div>
      </div>

      <div className="relative z-10 px-6 py-5 text-center">
        <p className="text-white/20 text-xs tracking-wider uppercase">
          Sound first &middot; Letters follow
        </p>
      </div>
    </div>
  );
}
