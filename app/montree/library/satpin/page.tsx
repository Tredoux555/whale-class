// /montree/library/satpin/page.tsx
// Montree Library — the full initial-sound series (27 weeks, A–Z).
//
// A content bucket, not a print shop: one block per letter/week holding the
// canonical basket words, the live basket pictures out of the Picture Bank,
// and a hand-off into the Picture Library hub where the teacher actually
// builds the materials. Hardcoded English, same as language-area/page.tsx.
//
// The route keeps its /satpin slug — SATPIN is the opening stretch of the
// series, not the whole of it: S A T P I N are weeks 1–6, then weeks 7–27
// follow the in-house readers order (M D G O C K ck E U R H B F L J V W X Y
// Z Qu). Week 13 (ck) is a digraph — a sound-only week with no basket.
//
// Word lists: S/A/T/P/I/N come from docs/picture-bank/SATPIN-Object-Baskets.docx
// (30 words), the other twenty letters from docs/picture-bank/AZ-Object-Baskets.docx
// — adopted for THOSE LETTERS ONLY; where the two disagree, SATPIN's list wins.
// Both docs are served from /satpin-materials/.
//
// Photos: all 130 basket pictures are ingested by
// scripts/curriculum/upload-satpin-basket-photos.mjs — keep WEEKS below in
// step with that script's SERIES manifest.
//
// Songs: uploaded straight from the page — every empty song slot is a drop
// zone (drag an mp3 on, or click). Files land in the public `dark-phonics`
// Supabase bucket via /api/montree/satpin-media; no deploy, no repo copy.
// The old public/satpin-materials/<slug>/song.mp3 drop-in still plays if
// present, but an uploaded song wins.
//
// Readers are DROP-INS, not code: put reader.pdf / reader-booklet.pdf into
// public/satpin-materials/<slug>/ and the slot fills itself on the next load
// (HEAD probe on mount). See `mediaPaths` below.
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { getProxyUrl, getThumbnailUrl, getThumbnailSrcSet } from '@/lib/montree/media/proxy-url';

/** Trimmed-down photo-bank row — only the fields this page renders/forwards. */
interface BankPhoto {
  id: string;
  label: string;
  filename: string;
  storage_path: string;
  public_url: string;
  /** Present on every row the photo-bank API returns; used to spot the clean basket set. */
  tags?: string[] | null;
}

type LetterBook = {
  title: string;
  blurb: string;
  downloads: Array<{ href: string; label: string }>;
  /** Exact photo-bank labels of the book's scene pictures. */
  pictureLabels: string[];
};

/**
 * A basket word. Usually the displayed word IS the photo-bank label, so a
 * plain string is enough. The object form is for the handful where the two
 * come apart — letter X is taught with "six", but the picture is filed and
 * labelled 'dice'.
 */
type WeekWord = string | { word: string; photoLabel: string };

/** What the child sees on the chip. */
const wordText = (w: WeekWord): string => (typeof w === 'string' ? w : w.word);
/** What we look the picture up by in the photo bank. */
const wordPhotoLabel = (w: WeekWord): string => (typeof w === 'string' ? w : w.photoLabel);

type WeekBlock = {
  week: number;
  letter: string;
  slug: string;
  /** Omit (or leave empty) for a sound-only week — a digraph like `ck` that is
   *  taught without an object basket. Those render as a slim, muted row: no
   *  words, no pictures, no printables, no book slot. */
  words?: WeekWord[];
  /** Sub-line for a sound-only week. Ignored when `words` is present. */
  note?: string;
  /** rgb triple — 400-level accent: the big letter, icons, borders */
  accent: string;
  /** rgb triple — 200-level tint: secondary text */
  tint: string;
  /** One book per letter. Omit for the "coming soon" slot — adding a future
   *  book is a single entry here, nothing else changes. */
  book?: LetterBook;
  /** Reader override for readers that do NOT live at the drop-in convention
   *  path (/satpin-materials/<slug>/reader.pdf). Takes precedence over the
   *  probe — set this and the HEAD result for the block is ignored. */
  reader?: { title: string; downloads: Array<{ href: string; label: string }> };
  /** Decodable words INTRODUCED by this week's reader — mirrors the NEW list
   *  at the back of the book (books_def.py weeks 3–6, book07–27.py weeks
   *  7–27). The crux of the decodable series: the cumulative "so far" list a
   *  child can actually read at this point is computed at render from every
   *  earlier week's entry. Weeks 1–2 have none — sounds only. */
  decodable?: string[];
  /** Heart words introduced this week (read by sight, not decoded). */
  heartWords?: string[];
};

/**
 * The established 27-week series, in curriculum order: SATPIN takes weeks 1–6
 * in its original order, then weeks 7–27 follow the in-house readers order —
 * docs/curriculum/dark-phonics-readers/HANDOFF_DARK_PHONICS_READERS_Jul25.md.
 * Same order and words as the SERIES manifest in
 * scripts/curriculum/upload-satpin-basket-photos.mjs — keep the two in step.
 *
 * Accents are Tailwind 400-level / tints 200-level, rotated round the hue wheel
 * so no two neighbouring weeks share a colour.
 */
const WEEKS: WeekBlock[] = [
  {
    week: 1, letter: 'S', slug: 's',
    words: ['sock', 'snake', 'star', 'soap', 'seal'],
    accent: '52,211,153', tint: '167,243,208',
  },
  {
    week: 2, letter: 'A', slug: 'a',
    words: ['apple', 'ant', 'anchor', 'alligator', 'ambulance'],
    accent: '244,114,182', tint: '251,207,232',
  },
  {
    week: 3, letter: 'T', slug: 't',
    decodable: ['sat', 'at'], heartWords: ['a'],
    words: ['turtle', 'tiger', 'toothbrush', 'tomato', 'taxi'],
    accent: '167,139,250', tint: '221,214,254',
  },
  {
    week: 4, letter: 'P', slug: 'p',
    decodable: ['sap', 'pat', 'tap', 'spat'],
    words: ['pig', 'pen', 'penguin', 'pumpkin', 'panda'],
    accent: '252,211,77', tint: '253,230,138',
    book: {
      title: 'The Pig Ate a Pineapple',
      blurb: 'Initial-sound book — the child shouts the picture word, it is not decoded.',
      downloads: [
        { href: '/satpin-books/print/the-pig-ate-a-pineapple-A5-reading.pdf', label: 'Read-along' },
        { href: '/satpin-books/print/the-pig-ate-a-pineapple-A5-booklet-print.pdf', label: 'Print booklet A5' },
      ],
      pictureLabels: ['pig ate a pineapple', 'pig ate a pen', 'pig ate a pencil', 'pig ate a pan', 'pig was sick'],
    },
  },
  {
    week: 5, letter: 'I', slug: 'i',
    decodable: ['sit', 'it', 'is', 'sip', 'pit', 'spit'],
    words: ['igloo', 'iguana', 'inchworm', 'insect', 'infant'],
    accent: '96,165,250', tint: '191,219,254',
    // Book slot, same shape as the letter-P book. Was wired as a hand-set
    // `reader` while the scene pictures were missing; the legacy "Sit, Sit,
    // Sit" reader is unwired but kept — do not delete
    // public/satpin-books/print/sit-sit-sit-*.
    book: {
      title: 'Into the Igloo',
      blurb: 'Initial-sound book — the child shouts the picture word, it is not decoded.',
      downloads: [
        { href: '/satpin-books/print/into-the-igloo-A5-reading.pdf', label: 'Read-along' },
        { href: '/satpin-books/print/into-the-igloo-A5-booklet-print.pdf', label: 'Print booklet A5' },
      ],
      pictureLabels: ['iguana went into the igloo', 'inchworm went into the igloo', 'infant went into the igloo', 'insect went into the igloo', 'warm inside the igloo'],
    },
  },
  {
    week: 6, letter: 'N', slug: 'n',
    decodable: ['an', 'ant', 'in', 'nap', 'naps', 'pan', 'tin', 'nip', 'snap'], heartWords: ['I'],
    words: ['nut', 'nest', 'net', 'napkin', 'nail'],
    accent: '74,222,128', tint: '187,247,208',
    // Book slot, same shape as the letter-P and letter-I books.
    book: {
      title: 'The Nest is in the Nest',
      blurb: 'Initial-sound book — the child shouts the picture word, it is not decoded.',
      downloads: [
        { href: '/satpin-books/print/the-nest-is-in-the-nest-A5-reading.pdf', label: 'Read-along' },
        { href: '/satpin-books/print/the-nest-is-in-the-nest-A5-booklet-print.pdf', label: 'Print booklet A5' },
      ],
      pictureLabels: ['nut is in the nest', 'net is in the nest', 'napkin is in the nest', 'nail is in the nest', 'nest is in the nest'],
    },
  },
  {
    week: 7, letter: 'M', slug: 'm',
    decodable: ['mat', 'Sam'],
    words: ['mug', 'mouse', 'mushroom', 'magnet', 'monkey'],
    accent: '192,132,252', tint: '233,213,255',
  },
  {
    week: 8, letter: 'D', slug: 'd',
    decodable: ['pad'],
    words: ['dog', 'duck', 'doll', 'drum', 'dinosaur'],
    accent: '56,189,248', tint: '186,230,253',
  },
  {
    week: 9, letter: 'G', slug: 'g',
    decodable: ['pig'],
    words: ['goat', 'guitar', 'glove', 'grapes', 'gift'],
    accent: '163,230,53', tint: '217,249,157',
  },
  {
    week: 10, letter: 'O', slug: 'o',
    decodable: ['pot', 'dog'],
    words: ['octopus', 'orange', 'owl', 'otter', 'ostrich'],
    accent: '232,121,249', tint: '245,208,254',
  },
  {
    week: 11, letter: 'C', slug: 'c',
    decodable: ['cot', 'cat'],
    words: ['cat', 'cup', 'car', 'comb', 'cow'],
    accent: '251,146,60', tint: '254,215,170',
  },
  {
    week: 12, letter: 'K', slug: 'k',
    decodable: ['kit', 'Kim'],
    words: ['key', 'kite', 'koala', 'kangaroo', 'kettle'],
    accent: '56,189,248', tint: '186,230,253',
  },
  {
    // Digraph week: the sound is taught, there is no object basket. No words
    // ⇒ the block renders slim and muted. Do not invent five 'ck' objects.
    week: 13, letter: 'ck', slug: 'ck',
    decodable: ['sock', 'sick'], heartWords: ['ate'],
    note: 'Digraph week · no object basket',
    accent: '148,163,184', tint: '203,213,225',
  },
  {
    week: 14, letter: 'E', slug: 'e',
    decodable: ['egg'],
    words: ['egg', 'elephant', 'envelope', 'eraser', 'eagle'],
    accent: '250,204,21', tint: '254,240,138',
  },
  {
    week: 15, letter: 'U', slug: 'u',
    decodable: ['duck', 'mud', 'stuck'],
    words: ['umbrella', 'unicorn', 'ukulele', 'unicycle', 'sea urchin'],
    accent: '34,211,238', tint: '165,243,252',
  },
  {
    week: 16, letter: 'R', slug: 'r',
    decodable: ['rug', 'rat', 'under'],
    words: ['ring', 'rabbit', 'rocket', 'robot', 'rose'],
    accent: '192,132,252', tint: '233,213,255',
  },
  {
    week: 17, letter: 'H', slug: 'h',
    decodable: ['hat', 'hen'],
    words: ['hat', 'horse', 'hammer', 'hen', 'heart'],
    accent: '251,113,133', tint: '254,205,211',
  },
  {
    week: 18, letter: 'B', slug: 'b',
    decodable: ['bed', 'bug'],
    words: ['ball', 'banana', 'bell', 'boat', 'bear'],
    accent: '129,140,248', tint: '199,210,254',
  },
  {
    week: 19, letter: 'F', slug: 'f',
    decodable: ['fan', 'off'],
    words: ['fish', 'fork', 'frog', 'feather', 'fan'],
    accent: '248,113,113', tint: '254,202,202',
  },
  {
    week: 20, letter: 'L', slug: 'l',
    decodable: ['log', 'run', 'croc'],
    words: ['leaf', 'lion', 'ladder', 'lemon', 'lizard'],
    accent: '45,212,191', tint: '153,246,228',
  },
  {
    week: 21, letter: 'J', slug: 'j',
    decodable: ['jug', 'jam'],
    words: ['jar', 'jet', 'jug', 'jacket', 'jellyfish'],
    accent: '244,114,182', tint: '251,207,232',
  },
  {
    week: 22, letter: 'V', slug: 'v',
    decodable: ['van'],
    words: ['van', 'violin', 'vase', 'volcano', 'vest'],
    accent: '251,191,36', tint: '253,230,138',
  },
  {
    week: 23, letter: 'W', slug: 'w',
    decodable: ['wig'],
    words: ['watch', 'whale', 'wagon', 'worm', 'wolf'],
    accent: '96,165,250', tint: '191,219,254',
  },
  {
    // "six" is the letter-X word the child says; the picture of it is filed
    // and labelled 'dice' in the bank, hence the photoLabel override.
    week: 24, letter: 'X', slug: 'x',
    decodable: ['box', 'fox'],
    words: ['xylophone', 'fox', 'box', 'ox', { word: 'six', photoLabel: 'dice' }],
    accent: '52,211,153', tint: '167,243,208',
  },
  {
    week: 25, letter: 'Y', slug: 'y',
    decodable: ['yam', 'big'],
    words: ['yo-yo', 'yak', 'yarn', 'yacht', 'yam'],
    accent: '232,121,249', tint: '245,208,254',
  },
  {
    week: 26, letter: 'Z', slug: 'z',
    decodable: ['zip', 'bag'],
    words: ['zebra', 'zipper', 'zucchini', 'zero', 'zeppelin'],
    accent: '163,230,53', tint: '217,249,157',
  },
  {
    week: 27, letter: 'Qu', slug: 'qu',
    decodable: ['quilt', 'squid'],
    words: ['queen', 'quill', 'quilt', 'quarter', 'quail'],
    accent: '129,140,248', tint: '199,210,254',
  },
];

/**
 * Letters whose ready-made three-part-card sheets actually exist on disk under
 * public/satpin-materials/<slug>/. Only SATPIN has them so far — every later
 * week hides the row rather than link to a 404. Drop a slug in here the moment
 * its PDFs land.
 */
const PRINTABLE_SLUGS = new Set(['s', 'a', 't', 'p', 'i', 'n']);

/**
 * Drop-in media convention. Songs and readers are produced outside this repo
 * and dropped straight into `public/satpin-materials/<slug>/` — no code edit
 * per drop. Every slug folder already exists (with a .gitkeep), so a drop is
 * literally copying a file in:
 *
 *   song.mp3           → the week's song, rendered as an inline player
 *   reader.pdf         → read-along reader
 *   reader-booklet.pdf → optional print-booklet version of the same reader
 *
 * Presence is probed client-side with a HEAD request per path on mount; a
 * non-2xx (404 for a folder holding only .gitkeep) means "not dropped yet" and
 * the slot shows its muted placeholder. A reader wired into the WEEKS manifest
 * wins over the probe — see WeekBlock.reader.
 */
const mediaPaths = (slug: string) => ({
  song: `/satpin-materials/${slug}/song.mp3`,
  reader: `/satpin-materials/${slug}/reader.pdf`,
  readerBooklet: `/satpin-materials/${slug}/reader-booklet.pdf`,
  paperworkPack: `/satpin-materials/${slug}/paperwork-pack.pdf`,
  tracingWorkbook: `/satpin-materials/${slug}/tracing-workbook.pdf`,
  sentenceStrips: `/satpin-materials/${slug}/sentence-strips.pdf`,
});

type MediaFlags = {
  song: boolean;
  reader: boolean;
  readerBooklet: boolean;
  paperworkPack: boolean;
  tracingWorkbook: boolean;
  sentenceStrips: boolean;
};

/** HEAD probe — 2xx means the file is on disk. Network errors read as absent. */
async function fileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

const printables = (slug: string) => [
  { href: `/satpin-materials/${slug}/three-part-cards-control.pdf`, label: 'Control' },
  { href: `/satpin-materials/${slug}/three-part-cards-pictures.pdf`, label: 'Pictures' },
  { href: `/satpin-materials/${slug}/three-part-cards-labels.pdf`, label: 'Labels' },
];

/**
 * Is this row from the clean Montessori basket set — one object, plain white
 * background — ingested by scripts/curriculum/upload-satpin-basket-photos.mjs?
 * Those rows are tagged 'satpin-basket' and live at `picture-bank/<word>.jpg`
 * in the photo-bank bucket; the storage-path check is the belt-and-braces
 * fallback in case a row's tags were edited away in the picker UI.
 */
function isBasketPhoto(photo: BankPhoto): boolean {
  const tagged = (photo.tags || []).some(
    t => String(t || '').trim().toLowerCase() === 'satpin-basket'
  );
  return tagged || (photo.storage_path || '').startsWith('picture-bank/');
}

/**
 * Look one word up in the Picture Bank and return the best photo whose label
 * matches exactly. Duplicate labels exist (several socks, nails, tomatoes), so
 * among the exact matches we PREFER the clean basket photo; if the word has no
 * basket row we fall back to the first exact match, exactly as before.
 *
 * 🚨 The book scene pictures ('pig ate a …', 'pig was sick') carry no
 * 'satpin-basket' tag and are NOT part of that set — they resolve through the
 * unchanged fallback path and are deliberately left alone.
 */
async function fetchByLabel(word: string): Promise<BankPhoto | null> {
  try {
    // limit 20 (was 5): some basket words have more than five exact-label
    // duplicates, and the preferred basket row is not guaranteed to sort first
    // among them — it has to be inside the fetched window to be selectable.
    const params = new URLSearchParams({ page: '1', limit: '20', kind: 'pictures', q: word });
    const res = await fetch(`/api/montree/photo-bank?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const photos: BankPhoto[] = data.photos || [];
    const target = word.trim().toLowerCase();
    const exact = photos.filter(p => (p.label || '').trim().toLowerCase() === target);
    return exact.find(isBasketPhoto) || exact[0] || null;
  } catch {
    return null;
  }
}

/** Photo-bank rows are rendered through the Cloudflare-cached proxy, never public_url. */
function photoSrc(photo: BankPhoto, width: number): string {
  if (!photo.storage_path) return photo.public_url || '';
  return getThumbnailUrl(photo.storage_path, width, 70, 'photo-bank');
}

export default function SatpinPage() {
  const router = useRouter();
  // Photo-bank rows keyed by lowercase label. Every basket label and every book
  // scene label is unique across the 27 weeks, so one flat map is enough.
  const [pictures, setPictures] = useState<Record<string, BankPhoto>>({});
  const [loading, setLoading] = useState(true);
  /** Which drop-in files exist, keyed by slug. Empty until the probe returns. */
  const [media, setMedia] = useState<Record<string, MediaFlags>>({});
  /** Uploaded songs (Supabase-stored, via /api/montree/satpin-media), keyed by
   *  slug. These win over a legacy /satpin-materials/<slug>/song.mp3 drop-in. */
  const [songs, setSongs] = useState<Record<string, string>>({});
  /** Music videos (mvgen pipeline output, satpin-videos/ in the bucket). */
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [songUploading, setSongUploading] = useState<Record<string, boolean>>({});
  const [songErrors, setSongErrors] = useState<Record<string, string>>({});

  // Uploaded songs + videos — one fetch on mount, same freshness model as the probe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/satpin-media');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.songs) setSongs(data.songs);
        if (data?.videos) setVideos(data.videos);
      } catch { /* endpoint unreachable — slots just show the drop zone */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const uploadSong = useCallback(async (slug: string, file: File) => {
    setSongErrors(prev => ({ ...prev, [slug]: '' }));
    setSongUploading(prev => ({ ...prev, [slug]: true }));
    try {
      const fd = new FormData();
      fd.append('slug', slug);
      fd.append('file', file);
      const res = await fetch('/api/montree/satpin-media', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Upload failed');
      setSongs(prev => ({ ...prev, [slug]: data.url }));
    } catch (err) {
      setSongErrors(prev => ({
        ...prev,
        [slug]: err instanceof Error ? err.message : 'Upload failed',
      }));
    } finally {
      setSongUploading(prev => ({ ...prev, [slug]: false }));
    }
  }, []);

  // Probe the drop-in song/reader files for all 27 weeks in one batch. Cheap
  // (HEAD only) and re-runs on every mount, so a freshly dropped file appears
  // on the next page load with no deploy and no code change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await Promise.all(WEEKS.map(async (w) => {
        const p = mediaPaths(w.slug);
        const [song, reader, readerBooklet, paperworkPack, tracingWorkbook, sentenceStrips] = await Promise.all([
          fileExists(p.song), fileExists(p.reader), fileExists(p.readerBooklet),
          fileExists(p.paperworkPack), fileExists(p.tracingWorkbook), fileExists(p.sentenceStrips),
        ]);
        return [w.slug, { song, reader, readerBooklet, paperworkPack, tracingWorkbook, sentenceStrips }] as const;
      }));
      if (cancelled) return;
      setMedia(Object.fromEntries(found));
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const labels = [
      ...WEEKS.flatMap(w => (w.words ?? []).map(wordPhotoLabel)),
      ...WEEKS.flatMap(w => w.book?.pictureLabels ?? []),
    ];
    (async () => {
      const found = await Promise.all(labels.map(async (label) => [label, await fetchByLabel(label)] as const));
      if (cancelled) return;
      const map: Record<string, BankPhoto> = {};
      for (const [label, photo] of found) {
        if (photo) map[label.toLowerCase()] = photo;
      }
      setPictures(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const photosFor = useCallback(
    (labels: string[]): BankPhoto[] =>
      labels.map(l => pictures[l.toLowerCase()]).filter(Boolean) as BankPhoto[],
    [pictures]
  );

  /**
   * Hand a set of pictures to the Picture Library hub. Uses the
   * `photoBankPreselect` key — deliberately NOT `photoBankExport`, which the
   * creation tools consume-and-delete on mount.
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
      console.error('Failed to stage SATPIN pictures:', err);
      return;
    }
    router.push('/montree/library/photo-bank');
  }, [router]);

  /**
   * Thumbnail strip + the hand-off button. Shared by baskets and book scenes.
   * `label` is what we fetched the photo by, `display` is what the teacher
   * reads — the two differ only where a word is pictured under another name
   * (X week: the word is "six", the picture is labelled 'dice').
   */
  const PictureRow = ({ items, accent, caption }: {
    items: Array<{ label: string; display: string }>;
    accent: string;
    caption?: string;
  }) => {
    const photos = photosFor(items.map(i => i.label));
    return (
      <div className="mt-4">
        {caption && (
          <div className="text-white/30 text-xs mb-2 text-left">{caption}</div>
        )}
        <div className="grid grid-cols-5 gap-2">
          {items.map((item) => {
            const photo = pictures[item.label.toLowerCase()];
            return (
              <div
                key={item.display}
                className="rounded-lg overflow-hidden border"
                style={{ borderColor: `rgba(${accent},0.16)`, background: 'rgba(255,255,255,0.04)' }}
                title={item.display}
              >
                <div className="aspect-square flex items-center justify-center">
                  {photo ? (
                    <img
                      src={photoSrc(photo, 240)}
                      srcSet={photo.storage_path ? getThumbnailSrcSet(photo.storage_path, 120, 70, 'photo-bank') : undefined}
                      sizes="(max-width: 640px) 18vw, 120px"
                      alt={item.display}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white/15 text-[10px] px-1 text-center leading-tight">
                      {loading ? '…' : 'no picture'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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

  /** Slim dashed row used by both empty slots. */
  const EmptySlot = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-3 rounded-xl border border-dashed border-white/[0.06] px-4 py-2.5 text-center">
      <span className="text-white/20 text-xs">{children}</span>
    </div>
  );

  /**
   * The decodable ledger — the crux of the reader series, surfaced in the
   * sequence so it can be scanned week by week. NEW words (this week's book)
   * are highlighted in the reader red; everything decodable from earlier
   * weeks follows muted, newest first (same order as the book REVIEW lists).
   * Weeks before the first decode (1–2) state that plainly.
   */
  const DecodableRow = ({ block, index }: { block: WeekBlock; index: number }) => {
    const newWords = block.decodable ?? [];
    // Newest-first, mirroring how the books stack their REVIEW lines.
    const prior = WEEKS.slice(0, index).reverse().flatMap(w => w.decodable ?? []);
    const hearts = WEEKS.slice(0, index + 1).flatMap(w => w.heartWords ?? []);
    const total = newWords.length + prior.length;

    if (total === 0) {
      return (
        <div className="mt-3 text-left text-[11px] text-white/20">
          Decodable words — none yet · sounds only
        </div>
      );
    }

    return (
      <div
        className="mt-3 rounded-xl border px-4 py-3 text-left"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="text-white/25 text-[10px] tracking-wider uppercase mb-1.5">
          Decodable so far · {total} {total === 1 ? 'word' : 'words'}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
          {newWords.map((w) => (
            <span
              key={w}
              className="px-2 py-0.5 rounded-md text-sm font-semibold"
              style={{
                background: 'rgba(198,40,40,0.16)',
                border: '1px solid rgba(248,113,113,0.35)',
                color: 'rgb(252,165,165)',
              }}
            >
              {w}
            </span>
          ))}
          {prior.length > 0 && (
            <span className="text-sm text-white/45 leading-relaxed">{prior.join(' · ')}</span>
          )}
        </div>
        {hearts.length > 0 && (
          <div className="mt-1.5 text-xs" style={{ color: 'rgba(252,165,165,0.55)' }}>
            ♥ heart {hearts.length === 1 ? 'word' : 'words'} — {hearts.join(' · ')}
          </div>
        )}
      </div>
    );
  };

  /**
   * Week song. Upload-first: an empty slot IS the drop zone — drag a file on,
   * or click to pick. Uploads land in Supabase storage via
   * /api/montree/satpin-media (no deploy, no repo copy). A legacy
   * public/satpin-materials/<slug>/song.mp3 drop-in still plays, but an
   * uploaded song wins over it.
   */
  const SongRow = ({ block }: { block: WeekBlock }) => {
    const uploaded = songs[block.slug];
    const legacy = media[block.slug]?.song ? mediaPaths(block.slug).song : null;
    const src = uploaded || legacy;
    const busy = !!songUploading[block.slug];
    const err = songErrors[block.slug];

    const onFiles = (files: FileList | null) => {
      const file = files?.[0];
      if (file && !busy) uploadSong(block.slug, file);
    };

    if (!src) {
      return (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
          className="mt-3 block rounded-xl border border-dashed px-4 py-3 text-center cursor-pointer transition-colors hover:bg-white/[0.03]"
          style={{ borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg"
            className="hidden"
            disabled={busy}
            onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ''; }}
          />
          <span className="text-white/25 text-xs">
            {busy ? 'Uploading song…' : (
              <>Song — drop an <span className="font-mono">mp3</span> here, or click to choose</>
            )}
          </span>
          {err && <div className="text-red-300/70 text-[11px] mt-1">{err}</div>}
        </label>
      );
    }

    return (
      <div
        className="mt-3 rounded-xl border px-4 py-3 text-left"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: `rgba(${block.accent},0.16)` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-white/25 text-[10px] tracking-wider uppercase">Song</div>
          <label className="text-white/25 text-[10px] cursor-pointer underline underline-offset-2 transition-colors hover:text-white/60">
            {busy ? 'uploading…' : 'replace'}
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.ogg"
              className="hidden"
              disabled={busy}
              onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ''; }}
            />
          </label>
        </div>
        <audio
          controls
          preload="none"
          src={src}
          className="w-full h-9"
          style={{ colorScheme: 'dark' }}
        />
        {err && <div className="text-red-300/70 text-[11px] mt-1">{err}</div>}
      </div>
    );
  };

  /**
   * Week music video — the mvgen lyric-synced video, discovered from the
   * bucket's satpin-videos/ prefix. Poster is the week's Montree Phonics
   * letter card (the video's own opening frame), served via the media proxy.
   */
  const VideoRow = ({ block }: { block: WeekBlock }) => {
    const src = videos[block.slug];
    if (!src) return <EmptySlot>Music video — coming soon</EmptySlot>;
    const poster = `/api/montree/media/proxy/letter-cards/letter-card-${String(block.week).padStart(2, '0')}-${block.slug}.png?bucket=dark-phonics`;
    // `src` is a Supabase Storage public object URL (satpin-media's GET hands
    // back `getPublicUrl()` output). Supabase honours a `download` query
    // param on those URLs by setting Content-Disposition: attachment on the
    // response — a plain cross-origin `<a download>` would be ignored by the
    // browser and just play the video, so the param is what actually
    // triggers Save-as. Zero new server code: same public URL the <video>
    // tag already streams, just with one query param appended.
    const downloadHref = `${src}${src.includes('?') ? '&' : '?'}download=satpin-${block.slug}-music-video.mp4`;
    return (
      <div
        className="mt-3 rounded-xl border px-4 py-3 text-left"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: `rgba(${block.accent},0.16)` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-white/25 text-[10px] tracking-wider uppercase">Music video</div>
          <a
            href={downloadHref}
            download
            className="px-2 py-1 rounded-md border text-[10px] transition-all hover:bg-white/[0.06]"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
          >
            Download
          </a>
        </div>
        <video
          controls
          preload="none"
          playsInline
          src={src}
          poster={poster}
          className="w-full rounded-lg"
          style={{ aspectRatio: '16 / 9', background: '#000' }}
        />
      </div>
    );
  };

  /**
   * Week reader. A manifest `reader` wins outright; otherwise the drop-in
   * reader.pdf (+ optional reader-booklet.pdf) is offered as it appears.
   */
  const ReaderRow = ({ block }: { block: WeekBlock }) => {
    const flags = media[block.slug];
    const paths = mediaPaths(block.slug);
    const downloads = block.reader?.downloads ?? [
      ...(flags?.reader ? [{ href: paths.reader, label: 'Read-along' }] : []),
      ...(flags?.readerBooklet ? [{ href: paths.readerBooklet, label: 'Print booklet A5' }] : []),
    ];

    if (downloads.length === 0) return <EmptySlot>Reader — coming soon</EmptySlot>;

    return (
      <div
        className="mt-3 rounded-xl border px-4 py-3 text-left"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: `rgba(${block.accent},0.16)` }}
      >
        <div className="text-white/25 text-[10px] tracking-wider uppercase mb-1">Reader</div>
        {block.reader?.title && (
          <div className="text-white/90 font-medium text-sm">{block.reader.title}</div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {downloads.map((d) => (
            <a
              key={d.href}
              href={d.href}
              download
              className="px-3 py-2 rounded-lg border text-xs transition-all hover:bg-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
            >
              {d.label}
            </a>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Week paperwork. Same drop-in convention as ReaderRow — no manifest
   * override, just a HEAD probe per path — but always at the fixed paths
   * below (worksheet pack + two tracing-book variants). Only ever invoked
   * for a full basket week; sound-only weeks skip it entirely, the same way
   * they skip ReaderRow.
   */
  const PaperworkRow = ({ block }: { block: WeekBlock }) => {
    const flags = media[block.slug];
    const paths = mediaPaths(block.slug);
    const downloads = [
      ...(flags?.paperworkPack ? [{ href: paths.paperworkPack, label: 'Worksheet pack · A4' }] : []),
      ...(flags?.tracingWorkbook ? [{ href: paths.tracingWorkbook, label: 'Tracing workbook · A4' }] : []),
      ...(flags?.sentenceStrips ? [{ href: paths.sentenceStrips, label: 'Sentence strips · cut-outs' }] : []),
    ];

    if (downloads.length === 0) return <EmptySlot>Workbook material — coming soon</EmptySlot>;

    return (
      <div
        className="mt-3 rounded-xl border px-4 py-3 text-left"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: `rgba(${block.accent},0.16)` }}
      >
        <div className="text-white/25 text-[10px] tracking-wider uppercase mb-1">Workbook material</div>
        <div className="text-white/35 text-xs mb-2">Story order &middot; matching &middot; yes/no &middot; trace &amp; build</div>
        <div className="flex flex-wrap gap-2">
          {downloads.map((d) => (
            <a
              key={d.href}
              href={d.href}
              download
              className="px-3 py-2 rounded-lg border text-xs transition-all hover:bg-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
            >
              {d.label}
            </a>
          ))}
        </div>
      </div>
    );
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
        className="relative z-10 px-6 pb-5 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
      >
        <Link href="/montree/library" className="text-white/40 text-sm hover:text-white/70 transition-colors">
          ← Library
        </Link>
        <LanguageToggle />
      </nav>

      <div className="relative z-10 flex-1 flex justify-center px-6 pb-8">
        <div className="max-w-3xl w-full text-center">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/50 text-xs tracking-wide uppercase">Initial Sounds</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            <span style={{ background: 'linear-gradient(135deg, #6ee7b7, #34d399, #a7f3d0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SATPIN
            </span>
          </h1>

          <p className="text-white/40 mt-5 text-lg max-w-lg mx-auto leading-relaxed">
            The full initial-sound series — 27 weeks, every letter A–Z. Object baskets,
            pictures and books, week by week, starting with SATPIN.
          </p>

          {/* Canonical word lists */}
          <div className="mt-12 space-y-3">
            <a
              href="/satpin-materials/SATPIN-Object-Baskets.docx"
              download
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(232,201,106,0.10), rgba(180,140,40,0.04))',
                borderColor: 'rgba(232,201,106,0.20)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(232,201,106,0.14), rgba(180,140,40,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(232,201,106,0.16)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#E8C96A' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">SATPIN Object Baskets</div>
                <div className="text-sm mt-0.5" style={{ color: 'rgba(232,201,106,0.55)' }}>
                  Canonical word list, sizing &amp; buy notes &middot; 30 words &middot; 5 per letter
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 group-hover:translate-x-1 transition-all shrink-0" style={{ color: 'rgba(232,201,106,0.4)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

            {/* Full-series list. Adopted for the twenty non-SATPIN letters only —
                S/A/T/P/I/N keep the words in the SATPIN doc above. */}
            <a
              href="/satpin-materials/AZ-Object-Baskets.docx"
              download
              className="group relative flex items-center gap-5 w-full p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, rgba(130,217,174,0.10), rgba(39,129,90,0.04))',
                borderColor: 'rgba(130,217,174,0.20)',
              }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(130,217,174,0.14), rgba(39,129,90,0.06))' }} />

              <div className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(130,217,174,0.16)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#82D9AE' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-white font-semibold text-lg">A–Z Object Baskets</div>
                <div className="text-sm mt-0.5" style={{ color: 'rgba(130,217,174,0.55)' }}>
                  Full-series word list &middot; 27 weeks &middot; 130 words &middot; 5 per letter
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 group-hover:translate-x-1 transition-all shrink-0" style={{ color: 'rgba(130,217,174,0.4)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* One block per week */}
          <div className="mt-4 space-y-4">
            {WEEKS.map((block, index) => {
              const words = block.words ?? [];

              // Sound-only week (a digraph such as ck): nothing to put in a
              // basket, so no words, pictures, printables or reader/book slots
              // — just a slim muted marker keeping the week numbering visibly
              // intact. It still gets a song slot: a digraph can have a song.
              if (words.length === 0) {
                return (
                  <div
                    key={block.slug}
                    className="rounded-2xl border border-dashed px-5 py-4"
                    style={{
                      background: `linear-gradient(135deg, rgba(${block.accent},0.05), rgba(${block.accent},0.015))`,
                      borderColor: `rgba(${block.accent},0.14)`,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `rgba(${block.accent},0.10)` }}
                      >
                        <span className="text-xl font-bold leading-none" style={{ color: `rgba(${block.accent},0.7)` }}>
                          {block.letter}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white/55 font-medium text-sm">
                          Week {block.week} — {block.letter}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: `rgba(${block.tint},0.35)` }}>
                          {block.note ?? 'Sound-only week · no object basket'}
                        </div>
                      </div>
                    </div>
                    {/* A sound-only week still moves the decode gate — ck
                        unlocks sock/sick — so the ledger renders here too. */}
                    <DecodableRow block={block} index={index} />
                    <SongRow block={block} />
                    <VideoRow block={block} />
                  </div>
                );
              }

              return (
              <div
                key={block.slug}
                className="rounded-2xl border p-6"
                style={{
                  background: `linear-gradient(135deg, rgba(${block.accent},0.09), rgba(${block.accent},0.02))`,
                  borderColor: `rgba(${block.accent},0.18)`,
                }}
              >
                {/* Big letter + week label */}
                <div className="flex items-center gap-5">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `rgba(${block.accent},0.16)` }}
                  >
                    <span className="text-3xl font-bold leading-none" style={{ color: `rgb(${block.accent})` }}>
                      {block.letter}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold text-lg">
                      Week {block.week} — {block.letter}
                    </div>
                    <div className="text-sm mt-0.5" style={{ color: `rgba(${block.tint},0.5)` }}>
                      Object basket &middot; 5 words
                    </div>
                  </div>
                </div>

                {/* Word chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {words.map((w) => (
                    <span
                      key={wordText(w)}
                      className="px-3 py-1.5 rounded-full text-sm"
                      style={{
                        background: `rgba(${block.accent},0.12)`,
                        border: `1px solid rgba(${block.accent},0.22)`,
                        color: `rgba(${block.tint},0.85)`,
                      }}
                    >
                      {wordText(w)}
                    </span>
                  ))}
                </div>

                {/* Decodable ledger — what the child can READ by this week */}
                <DecodableRow block={block} index={index} />

                {/* Basket pictures + hand-off */}
                <PictureRow
                  items={words.map(w => ({ label: wordPhotoLabel(w), display: wordText(w) }))}
                  accent={block.accent}
                />

                {/* Ready-made three-part-card sheets — only where the PDFs exist */}
                {PRINTABLE_SLUGS.has(block.slug) && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-left">
                    <span className="text-white/25 text-xs">Ready-made three-part cards:</span>
                    {printables(block.slug).map((p) => (
                      <a
                        key={p.href}
                        href={p.href}
                        download
                        className="text-xs underline underline-offset-2 transition-colors hover:text-white/80"
                        style={{ color: `rgba(${block.tint},0.55)` }}
                      >
                        {p.label}
                      </a>
                    ))}
                  </div>
                )}

                {/* Song → Music video → Reader → Book, slim rows */}
                <SongRow block={block} />
                <VideoRow block={block} />
                <ReaderRow block={block} />

                {/* Book */}
                {block.book ? (
                  <div
                    className="mt-4 rounded-xl border p-4 text-left"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: `rgba(${block.accent},0.16)` }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `rgba(${block.accent},0.14)` }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: `rgb(${block.accent})` }}>
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-white/25 text-[10px] tracking-wider uppercase mb-1">Book</div>
                        <div className="text-white/90 font-medium text-sm">{block.book.title}</div>
                        <div className="text-white/35 text-xs mt-0.5 leading-relaxed">{block.book.blurb}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {block.book.downloads.map((d) => (
                            <a
                              key={d.href}
                              href={d.href}
                              download
                              className="px-3 py-2 rounded-lg border text-xs transition-all hover:bg-white/[0.06]"
                              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
                            >
                              {d.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Book scene pictures + their own hand-off */}
                    <PictureRow
                      items={block.book.pictureLabels.map(l => ({ label: l, display: l }))}
                      accent={block.accent}
                      caption="Sentence pictures — from the book"
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-white/[0.06] px-4 py-3 text-center">
                    <span className="text-white/20 text-xs">Book — coming soon</span>
                  </div>
                )}

                {/* Workbook material — last row in the card */}
                <PaperworkRow block={block} />
              </div>
              );
            })}
          </div>

          <p className="text-white/30 mt-12 text-sm leading-relaxed max-w-md mx-auto">
            The child hears the sound first and shouts the picture word &mdash; these are initial-sound
            materials, not decodable readers.
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
