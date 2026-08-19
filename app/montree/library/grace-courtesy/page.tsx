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
// Song + song-card media live in the public `grace-courtesy` Supabase bucket
// (allowlisted in app/api/montree/media/proxy/[...path]/route.ts), served
// through /api/montree/media/proxy/<path>?bucket=grace-courtesy:
//   songs/lesson-NN.mp3          the song
//   pictures/lesson-NN.png       the song card
//
// Storybooks follow the Dark Phonics pattern instead — NOT the Supabase
// bucket: two static A5 print PDFs + a static cover in public/, plus each
// page's scene picture uploaded into the shared Picture Bank
// (montree_photo_bank table / photo-bank bucket) tagged
// 'grace-courtesy-book-<slug>' so the "Book pictures" grid + "Create
// materials" hand-off works exactly like the Dark Phonics library page:
//   public/grace-courtesy-books/print/<slug>-A5-reading.pdf
//   public/grace-courtesy-books/print/<slug>-A5-booklet-print.pdf
//   public/grace-courtesy-books/covers/<slug>.png
//   scripts/curriculum/upload-grace-courtesy-book-art.mjs        → Picture Bank ingest
//   scripts/curriculum/grace-courtesy-books/build_a5_readers.py  → PDF build
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

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { getProxyUrl, getThumbnailUrl, getThumbnailSrcSet } from '@/lib/montree/media/proxy-url';

/** Zero-padded lesson number — every media object is named lesson-NN.<ext>. */
const nn = (n: number) => String(n).padStart(2, '0');

/** Media-proxy URL for a path inside the public `grace-courtesy` bucket. */
const media = (path: string, v?: number) =>
  `/api/montree/media/proxy/${path}?bucket=grace-courtesy${v ? `&v=${v}` : ''}`;

/**
 * Cache-buster for the storybook print PDFs served straight out of
 * public/grace-courtesy-books/print/ — NOT proxied, so they carry no
 * built-in versioning of their own and are served with a long
 * Cache-Control by both the browser and Cloudflare. Bump this whenever a
 * book's print PDF is rebuilt. Mirrors Dark Phonics' STORYBOOK_PRINT_VERSION.
 */
const STORYBOOK_PRINT_VERSION = 3; // bumped 2026-08-14: gentle-hands page-08 re-rolled to full-cast finale (adds Apple)
const printPdf = (path: string) => `${path}?v=${STORYBOOK_PRINT_VERSION}`;

/**
 * Cache-buster for the song mp3s in the `grace-courtesy` bucket, same
 * mechanism as STORYBOOK_PRINT_VERSION but a separate constant so songs and
 * print PDFs bust independently. The media proxy sets a 7-day Cloudflare
 * edge cache (CDN-Cache-Control max-age=604800) keyed on the full request
 * URL, so replacing a bucket object in place (same storage path) does NOT
 * bust the edge HIT on its own — bump this whenever a songs/lesson-NN.mp3
 * file is replaced in place.
 */
const SONG_VERSION = 2; // bumped 2026-08-14: lesson-02 (Indoor Voice) + lesson-03 (Gentle Hands) re-recorded

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
 * A book's scene pictures — searched by slug, kept if tagged
 * 'grace-courtesy-book-<slug>', sorted p1→pN by the page number embedded
 * in the label ("<slug> p1-cover"). Mirrors Dark Phonics' fetchBookPictures
 * — same tag-only resolution rule: a book with no tagged art renders the
 * "no pictures yet" placeholder instead of leaking unrelated photos.
 */
async function fetchBookPictures(slug: string): Promise<BankPhoto[]> {
  try {
    const params = new URLSearchParams({ page: '1', limit: '20', kind: 'pictures', q: slug });
    const res = await fetch(`/api/montree/photo-bank?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    const photos: BankPhoto[] = data.photos || [];
    const tag = `grace-courtesy-book-${slug}`;
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

type Book = {
  /** Filename stem for the print PDFs / cover in public/grace-courtesy-books/,
   *  and the Picture Bank tag suffix 'grace-courtesy-book-<slug>'. */
  slug: string;
  title: string;
  /** Row description under the title. Defaults to the standard blurb. */
  description?: string;
  /** Cover image — a local /public path
   *  (/grace-courtesy-books/covers/<slug>.png). */
  cover?: string;
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
 *
 * The one sanctioned exception is the `UPCOMING` roadmap strip below
 * (founder-approved Aug 17 2026) — planned rule titles rendered as muted,
 * non-clickable placeholder slots, never as real lesson cards. Shipping a
 * rule means moving its entry OUT of `UPCOMING` and INTO this array for real.
 */
const RAW: RawLesson[] = [
  {
    n: 1,
    title: 'Walking Feet',
    why: 'So we don’t CRASH.',
    cast: ['Cat', 'Ant', 'Apple', 'Star', 'Snake', 'Potato'],
    book: {
      slug: 'walking-feet',
      title: 'Walking Feet',
      cover: '/grace-courtesy-books/covers/walking-feet.png',
    },
    song: true,
  },
  {
    n: 2,
    title: 'Indoor Voice',
    why: 'So friends can think.',
    cast: ['Cat', 'Ant', 'Apple', 'Star', 'Snake', 'Potato'],
    book: {
      slug: 'indoor-voice',
      title: 'Indoor Voice',
      cover: '/grace-courtesy-books/covers/indoor-voice.png',
    },
    song: true,
  },
  {
    n: 3,
    title: 'Gentle Hands',
    why: 'So friends feel safe.',
    cast: ['Cat', 'Ant', 'Apple', 'Star', 'Snake', 'Potato'],
    book: {
      slug: 'gentle-hands',
      title: 'Gentle Hands',
      cover: '/grace-courtesy-books/covers/gentle-hands.png',
    },
    song: true,
  },
  {
    n: 4,
    title: 'Wash Your Hands',
    why: 'So germs wash away.',
    cast: ['Cat', 'Ant', 'Apple', 'Star', 'Snake', 'Potato'],
    book: {
      slug: 'wash-your-hands',
      title: 'Wash Your Hands',
      cover: '/grace-courtesy-books/covers/wash-your-hands.png',
    },
    // No song — format dropped songs starting Book 4 (2026-08-18 pivot,
    // see HANDOFF §2e). `song` omitted, not `false`; same rendering either way.
  },
];

// ─── THE ROAD AHEAD (founder-approved spine, locked Aug 17 2026) ───────────
// These are PLACEHOLDERS ONLY — approved future rules in production order.
// They render as muted "coming next" slots, never as lesson cards. When a
// rule ships (book made — no song required from Book 4 onward, see HANDOFF
// §2e), move it OUT of UPCOMING into RAW as a real entry. The one-at-a-time
// / nothing-fake rule for RAW still stands.
const UPCOMING: { n: number; title: string; why: string }[] = [
  { n: 5, title: 'Roll the Mat', why: "So it's ready for a friend." },
  { n: 6, title: 'Push In Your Chair', why: 'So nobody bumps.' },
  { n: 7, title: 'May I Watch?', why: 'Eyes watch. Hands wait.' },
  { n: 8, title: 'Everything Has a Home', why: 'So friends can find it.' },
  { n: 9, title: 'Hello, Hello!', why: 'So friends feel seen.' },
  { n: 10, title: 'Please and Thank You', why: 'Magic words open doors.' },
  { n: 11, title: 'My Turn, Your Turn', why: 'Waiting makes it fair.' },
  { n: 12, title: 'Excuse Me', why: 'The polite way in.' },
  { n: 13, title: 'Kind Words', why: 'Words can hug.' },
  { n: 14, title: 'Helping Hands', why: 'We help our friends.' },
  { n: 15, title: 'Sorry', why: 'Sorry mends it.' },
  { n: 16, title: 'Cover Your Cough', why: 'Catch it in your elbow.' },
  { n: 17, title: 'Line Up', why: 'One behind one.' },
  { n: 18, title: 'Walk Around the Mat', why: 'Work needs space.' },
  { n: 19, title: 'Careful Carrying', why: 'Two hands, slow feet.' },
  { n: 20, title: 'The Whale Class Way', why: 'All the rules, one song.' },
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
      className="btn btn-secondary btn-sm"
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
  const router = useRouter();

  const songUrl = lesson.song ? media(`songs/lesson-${nn(lesson.n)}.mp3`, SONG_VERSION) : null;
  const pictureUrl = media(`pictures/lesson-${nn(lesson.n)}.png`);

  const song = useAssetPresence(songUrl);
  const picture = useAssetPresence(pictureUrl);

  // Book scene pictures — fetched from the shared Picture Bank, tagged
  // 'grace-courtesy-book-<slug>'. Own effect per card, same reasoning as
  // useAssetPresence above: hooks can't live inside a .map().
  const [bookPictures, setBookPictures] = useState<BankPhoto[]>([]);
  const [picturesLoading, setPicturesLoading] = useState(true);
  const bookSlug = lesson.book?.slug;

  useEffect(() => {
    if (!bookSlug) { setPicturesLoading(false); return; }
    let cancelled = false;
    setPicturesLoading(true);
    (async () => {
      const photos = await fetchBookPictures(bookSlug);
      if (!cancelled) { setBookPictures(photos); setPicturesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [bookSlug]);

  /**
   * Hand a set of pictures to the Picture Library hub. Uses the
   * `photoBankPreselect` key — deliberately NOT `photoBankExport`, which
   * the creation tools consume-and-delete on mount. Copied verbatim from
   * Dark Phonics / SATPIN.
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
      console.error('Failed to stage Grace & Courtesy pictures:', err);
      return;
    }
    router.push('/montree/library/photo-bank');
  }, [router]);

  /** 5-col thumbnail grid + hand-off for this book's scene pictures. */
  const BookPictureRow = () => (
    <div className="mt-4">
      <div className="text-white/30 text-xs mb-2 text-left">Book pictures — from the book</div>
      <div className="grid grid-cols-5 gap-2">
        {bookPictures.length > 0 ? bookPictures.map((photo) => (
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
        onClick={() => createMaterials(bookPictures)}
        disabled={bookPictures.length === 0}
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

      {/* STORY BOOK — two print PDFs (static /public files, Dark Phonics
          format) + the Picture Bank scene-picture grid. Renders
          unconditionally once a lesson declares a book: unlike the
          Supabase-bucket song/song-card assets above, these are static
          repo files, always present the moment the entry lands here. */}
      {lesson.book && (
        <Row accent={accent} label="Story book">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lesson.book.cover ?? media(`books/covers/${lesson.book.slug}.png`)}
              alt={lesson.book.title}
              loading="lazy"
              className="w-16 rounded-md shrink-0"
              style={{ background: '#0e0e16' }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-white/90 font-medium text-sm">{lesson.book.title}</div>
              <div className="text-white/35 text-xs mt-0.5 leading-relaxed">
                {lesson.book.description ?? 'The rule as a story — the cast get it wrong first, then get it right.'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill href={printPdf(`/grace-courtesy-books/print/${lesson.book.slug}-A5-reading.pdf`)}>Read-along</Pill>
                <Pill href={printPdf(`/grace-courtesy-books/print/${lesson.book.slug}-A5-booklet-print.pdf`)}>Print booklet A5</Pill>
              </div>
            </div>
          </div>

          {/* Book scene pictures + their own hand-off */}
          <BookPictureRow />
        </Row>
      )}
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
            One rule, one why, one book. Built one book at a time &mdash;
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

          {/* THE ROAD AHEAD — founder-approved roadmap, placeholders only.
              Every slot here is planned, not made: no cover art, no player,
              not clickable. See the UPCOMING const above for the rule. */}
          <div className="mt-10 text-left">
            <div className="text-white/25 text-[10px] tracking-wider uppercase text-center sm:text-left">
              The road ahead
            </div>
            <p className="text-white/20 text-xs mt-1.5 mb-4 text-center sm:text-left">
              Planned and in order &mdash; each one goes up only when its book
              is real.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {UPCOMING.map((item) => (
                <div
                  key={item.n}
                  className="rounded-xl border border-dashed border-white/[0.06] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/20 text-[10px] tracking-wider uppercase">
                      Book {item.n}
                    </span>
                    {item.n === UPCOMING[0].n && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] tracking-wider uppercase"
                        style={{ background: 'rgba(62,142,101,0.14)', color: 'rgba(154,214,178,0.7)' }}
                      >
                        in production
                      </span>
                    )}
                  </div>
                  <div className="text-white/35 text-sm font-medium mt-1">{item.title}</div>
                  <div className="text-white/15 text-xs mt-0.5">{item.why}</div>
                </div>
              ))}
            </div>
          </div>

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
