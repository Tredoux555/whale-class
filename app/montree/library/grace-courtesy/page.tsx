// /montree/library/grace-courtesy/page.tsx
// Montree Library — Grace & Courtesy, one classroom rule per book.
//
// The sibling series to Dark Phonics: same card-per-lesson shape, different
// subject. Dark Phonics teaches a SOUND; this teaches a RULE — one rule, the
// one-line WHY behind it, the cast who learn it the hard way, the song, and the
// storybook. Nothing here is phonics, so there is no `sound`, no decodable
// ledger and no heart words.
//
// NUMBERING: unlike Dark Phonics (whose internal numbers run 5–53 and are shown
// minus four), this series starts at 1 and shows `n` as-is. Media objects are
// named lesson-01 … lesson-NN, straight from the same `n`. No offset — do not
// add one.
//
// Hardcoded English, deliberately bypassing i18n — the same sanctioned
// exception as app/montree/library/dark-phonics/page.tsx and
// app/montree/library/satpin/page.tsx: the content itself IS English (the rule
// names, the whys, the book titles), so translating the chrome around it would
// only make the page disagree with its own assets.
//
// Public: no auth. middleware.ts exempts everything under /montree/library.
//
// Media lives in the public `grace-courtesy` Supabase bucket (allowlisted in
// app/api/montree/media/proxy/[...path]/route.ts) and is served through
// /api/montree/media/proxy/<path>?bucket=grace-courtesy by filename convention:
//   songs/lesson-NN.mp3          the song
//   pictures/lesson-NN.png       the song card
//   books/<slug>.pdf             the storybook
//   books/covers/<slug>.png      its cover
//
// EXISTENCE CHECKS: Dark Phonics asks /api/montree/phonics-videos once on mount
// for which lesson numbers have media. That route is hardcoded to the
// dark-phonics bucket and to its videos/pictures/flashcards folders, so it does
// not generalise to this series' songs/books layout without a real refactor —
// which this first pass deliberately does not attempt. Instead each asset is
// probed with a single HEAD request against the proxy (which already answers
// HEAD and 404s cleanly for a missing object), and anything absent renders the
// same dashed "coming soon" placeholder rather than a broken player. That is
// fine at one lesson; once this series passes ~10 lessons, replace the per-asset
// probes with one bucket-listing endpoint modelled on /api/montree/phonics-videos.
'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import LanguageToggle from '@/components/montree/LanguageToggle';

/** Zero-padded lesson number — every media object is named lesson-NN.<ext>. */
const nn = (n: number) => String(n).padStart(2, '0');

/** Media-proxy URL for a path inside the public `grace-courtesy` bucket. */
const media = (path: string, v?: number) =>
  `/api/montree/media/proxy/${path}?bucket=grace-courtesy${v ? `&v=${v}` : ''}`;

type Book = {
  /** Filename stem in the bucket: books/<slug>.pdf, books/covers/<slug>.png. */
  slug: string;
  title: string;
};

type RawLesson = {
  /** 1, 2, 3 … — shown as-is AND used as the lesson-NN media key. No offset. */
  n: number;
  /** The rule itself, as a child would say it. */
  title: string;
  /** The one-line reason for the rule — this series' answer to Dark Phonics'
   *  catchphrase. Always a WHY, never a restatement of the rule. */
  why: string;
  /** Tag chips for the characters who appear in this rule's book. */
  cast?: string[];
  /** Present once the storybook PDF has been produced. */
  book?: Book;
  /** Whether a song is expected for this lesson. False/absent skips the audio
   *  row entirely; true renders it once the mp3 actually lands in the bucket. */
  song?: boolean;
};

type Lesson = RawLesson & { accent: string; tint: string };

/**
 * Card colours — the locked Grace & Courtesy palette: deep forest greens and
 * their neighbours, walked round a narrow slice of the hue wheel so the series
 * reads as one set (unlike Dark Phonics, which cycles the whole wheel).
 * Format matches Dark Phonics: [accent (400-level), tint (200-level)] as bare
 * `r,g,b` triples so they can be dropped into rgba() at any alpha.
 */
const PALETTE: Array<[string, string]> = [
  ['62,142,101', '154,214,178'],   // forest
  ['122,168,88', '199,226,166'],   // moss
  ['84,150,134', '167,215,203'],   // pine
  ['166,158,80', '224,217,160'],   // olive
];

/**
 * The series, in teaching order.
 *
 * ➕ ADD LESSONS 2+ HERE, ONE AT A TIME, as each book is actually produced.
 * Do not batch-invent future entries — the page's honesty (the "1 book so far"
 * badge, the placeholders) depends on this array describing only real work.
 * A new entry needs nothing but its own object: colour, media URLs and the
 * placeholder gating all follow from `n`.
 */
const RAW: RawLesson[] = [
  {
    n: 1,
    title: 'Walking Feet',
    why: 'So we don’t CRASH.',
    cast: ['Cat', 'Ant', 'Apple', 'Star', 'Snake', 'Potato'],
    book: { slug: 'walking-feet', title: 'Walking Feet' },
    song: true,
  },
];

/** Same list, with a colour stamped on each card. */
const LESSONS: Lesson[] = RAW.map((l, i) => ({
  ...l,
  accent: PALETTE[i % PALETTE.length][0],
  tint: PALETTE[i % PALETTE.length][1],
}));

/** Slim dashed row — every "not made yet" slot on the page. */
function EmptySlot({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-white/[0.06] px-4 py-2.5 text-center">
      <span className="text-white/20 text-xs">{children}</span>
    </div>
  );
}

/** Standard sub-row: accent-tinted shell with an uppercase eyebrow label. */
function Row({ accent, label, right, children }: {
  accent: string;
  label: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
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
}

/** Neutral pill link — downloads, PDFs. */
function Pill({ href, children }: { href: string; children: ReactNode }) {
  return (
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
}

/** Tri-state so a card can show '…' while probing instead of flashing "coming soon". */
type Presence = 'checking' | 'present' | 'missing';

/**
 * One HEAD request against the media proxy. `url === null` means the lesson
 * doesn't declare the asset at all, so it's 'missing' without a network call.
 * Any failure — 404, 502, offline, blocked — resolves to 'missing', which is
 * always safe: the caller renders a placeholder instead of a broken player.
 */
function useAssetPresence(url: string | null): Presence {
  const [presence, setPresence] = useState<Presence>(url ? 'checking' : 'missing');

  useEffect(() => {
    if (!url) {
      setPresence('missing');
      return;
    }
    let cancelled = false;
    setPresence('checking');
    (async () => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!cancelled) setPresence(res.ok ? 'present' : 'missing');
      } catch {
        if (!cancelled) setPresence('missing');
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return presence;
}

/**
 * One rule per card: the tile, the rule, the why, the cast, then every asset
 * that exists for it. Its own component so each card can run its own asset
 * probes — hooks can't live inside a .map().
 */
function LessonCard({ lesson }: { lesson: Lesson }) {
  const { accent, tint } = lesson;

  const songUrl = lesson.song ? media(`songs/lesson-${nn(lesson.n)}.mp3`) : null;
  const pictureUrl = media(`pictures/lesson-${nn(lesson.n)}.png`);
  const bookUrl = lesson.book ? media(`books/${lesson.book.slug}.pdf`) : null;
  const coverUrl = lesson.book ? media(`books/covers/${lesson.book.slug}.png`) : null;

  const song = useAssetPresence(songUrl);
  const picture = useAssetPresence(pictureUrl);
  const book = useAssetPresence(bookUrl);
  const cover = useAssetPresence(coverUrl);

  return (
    <div
      className="rounded-2xl border p-4 sm:p-6"
      style={{
        background: `linear-gradient(135deg, rgba(${accent},0.09), rgba(${accent},0.02))`,
        borderColor: `rgba(${accent},0.18)`,
      }}
    >
      {/* Number tile + rule line + why */}
      <div className="flex items-center gap-4 sm:gap-5">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 px-1"
          style={{ background: `rgba(${accent},0.16)` }}
        >
          <span className="text-2xl font-bold leading-none tabular-nums" style={{ color: `rgb(${accent})` }}>
            {nn(lesson.n)}
          </span>
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-white font-semibold text-base sm:text-lg">
            Rule {lesson.n} &mdash; {lesson.title}
          </div>
          <div className="text-sm mt-0.5" style={{ color: `rgba(${tint},0.5)` }}>
            {lesson.why}
          </div>
        </div>
      </div>

      {/* Cast chips — who's in this rule's book */}
      {lesson.cast && lesson.cast.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lesson.cast.map((name) => (
            <span
              key={name}
              className="px-3 py-1.5 rounded-full text-sm"
              style={{
                background: `rgba(${accent},0.12)`,
                border: `1px solid rgba(${accent},0.22)`,
                color: `rgba(${tint},0.85)`,
              }}
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {/* SONG — only where the lesson declares one AND the mp3 is uploaded */}
      {songUrl && song === 'present' ? (
        <Row accent={accent} label="Song" right={<Pill href={songUrl}>Download</Pill>}>
          <audio
            controls
            preload="none"
            src={songUrl}
            className="w-full h-9"
            style={{ colorScheme: 'dark' }}
          />
        </Row>
      ) : songUrl ? (
        <EmptySlot>{song === 'checking' ? '…' : 'Song — coming soon'}</EmptySlot>
      ) : null}

      {/* SONG CARD — the picture that goes with the song */}
      {picture === 'present' ? (
        <Row accent={accent} label="Song card" right={<Pill href={pictureUrl}>Full size</Pill>}>
          <a href={pictureUrl} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pictureUrl}
              alt={`Rule ${lesson.n} song card`}
              loading="lazy"
              className="rounded-lg w-full max-w-[240px]"
              style={{ background: '#0e0e16' }}
            />
          </a>
        </Row>
      ) : (
        <EmptySlot>{picture === 'checking' ? '…' : 'Song card — coming soon'}</EmptySlot>
      )}

      {/* STORY BOOK — the rule as a story, once the PDF exists */}
      {lesson.book && bookUrl && book === 'present' ? (
        <Row accent={accent} label="Story book">
          <div className="flex items-start gap-3">
            {cover === 'present' && coverUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={coverUrl}
                alt={lesson.book.title}
                loading="lazy"
                className="w-16 rounded-md shrink-0"
                style={{ background: '#0e0e16' }}
              />
            ) : (
              <div
                className="w-16 h-20 rounded-md shrink-0 flex items-center justify-center text-center text-[9px] leading-tight px-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px dashed rgba(${accent},0.2)`, color: 'rgba(255,255,255,0.2)' }}
              >
                {cover === 'checking' ? '…' : 'cover soon'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-white/90 font-medium text-sm">{lesson.book.title}</div>
              <div className="text-white/35 text-xs mt-0.5 leading-relaxed">
                The rule as a story — the cast get it wrong first, then get it right.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill href={bookUrl}>📗 Read the book</Pill>
              </div>
            </div>
          </div>
        </Row>
      ) : lesson.book ? (
        <EmptySlot>{book === 'checking' ? '…' : 'Story book — coming soon'}</EmptySlot>
      ) : null}
    </div>
  );
}

export default function GraceAndCourtesyPage() {
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
        <LanguageToggle />
      </nav>

      <div className="relative z-10 flex-1 flex justify-center px-4 sm:px-6 pb-8">
        <div className="max-w-3xl w-full text-center">

          {/* Honest count — this badge says how many books EXIST, not how many
              are planned. Bump it only when a book actually lands. */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-8">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(62,142,101)' }} />
            <span className="text-white/50 text-xs tracking-wide uppercase">
              {LESSONS.length === 1 ? '1 book so far' : `${LESSONS.length} books so far`}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            <span style={{ background: 'linear-gradient(135deg, #9ad6b2, #3e8e65, #c7e2a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Grace &amp; Courtesy
            </span>
          </h1>

          <p className="text-white/40 mt-5 text-lg max-w-lg mx-auto leading-relaxed">
            One rule, one why, one song. Built one book at a time &mdash;
            Book {LESSONS.length} of an ongoing series.
          </p>

          <p className="text-white/25 mt-3 text-sm max-w-md mx-auto leading-relaxed">
            A rule a child can say back to you &middot; and a reason they actually believe.
          </p>

          {/* One card per rule */}
          <div className="mt-8 space-y-4">
            {LESSONS.map((lesson) => (
              <LessonCard key={lesson.n} lesson={lesson} />
            ))}
          </div>

          <p className="text-white/30 mt-12 text-sm leading-relaxed max-w-md mx-auto">
            More rules are on the way, one book at a time. Nothing goes up here
            until it&rsquo;s actually been made.
          </p>

        </div>
      </div>

      <div className="relative z-10 px-6 py-5 text-center">
        <p className="text-white/20 text-xs tracking-wider uppercase">
          The rule &middot; and the why
        </p>
      </div>
    </div>
  );
}
