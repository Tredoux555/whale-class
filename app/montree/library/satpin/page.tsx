// /montree/library/satpin/page.tsx
// Montree Library — SATPIN initial-sound materials.
//
// A content bucket, not a print shop: one block per letter/week holding the
// canonical basket words, the live basket pictures out of the Picture Bank,
// and a hand-off into the Picture Library hub where the teacher actually
// builds the materials. Hardcoded English, same as language-area/page.tsx.
//
// Canonical word list = docs/picture-bank/SATPIN-Object-Baskets.docx
// (30 words, 5 per letter), served from /satpin-materials/.
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
}

type LetterBook = {
  title: string;
  blurb: string;
  downloads: Array<{ href: string; label: string }>;
  /** Exact photo-bank labels of the book's scene pictures. */
  pictureLabels: string[];
};

type WeekBlock = {
  week: number;
  letter: string;
  slug: string;
  words: string[];
  /** rgb triple — 400-level accent: the big letter, icons, borders */
  accent: string;
  /** rgb triple — 200-level tint: secondary text */
  tint: string;
  /** One book per letter. Omit for the "coming soon" slot — adding a future
   *  book is a single entry here, nothing else changes. */
  book?: LetterBook;
};

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
    words: ['turtle', 'tiger', 'toothbrush', 'tomato', 'taxi'],
    accent: '167,139,250', tint: '221,214,254',
  },
  {
    week: 4, letter: 'P', slug: 'p',
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
    words: ['igloo', 'iguana', 'inchworm', 'insect', 'infant'],
    accent: '96,165,250', tint: '191,219,254',
  },
  {
    week: 6, letter: 'N', slug: 'n',
    words: ['nut', 'nest', 'net', 'napkin', 'nail'],
    accent: '74,222,128', tint: '187,247,208',
  },
];

/** Every letter also has ready-made three-part-card sheets on disk. */
const printables = (slug: string) => [
  { href: `/satpin-materials/${slug}/three-part-cards-control.pdf`, label: 'Control' },
  { href: `/satpin-materials/${slug}/three-part-cards-pictures.pdf`, label: 'Pictures' },
  { href: `/satpin-materials/${slug}/three-part-cards-labels.pdf`, label: 'Labels' },
];

/**
 * Look one word up in the Picture Bank and return the first photo whose label
 * matches exactly. Duplicate labels exist (7 socks, 5 nails) — first exact
 * match is the intended pick.
 */
async function fetchByLabel(word: string): Promise<BankPhoto | null> {
  try {
    const params = new URLSearchParams({ page: '1', limit: '5', kind: 'pictures', q: word });
    const res = await fetch(`/api/montree/photo-bank?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const photos: BankPhoto[] = data.photos || [];
    const target = word.trim().toLowerCase();
    return photos.find(p => (p.label || '').trim().toLowerCase() === target) || null;
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
  // Photo-bank rows keyed by lowercase label. Every basket word and every book
  // scene label is unique across the six weeks, so one flat map is enough.
  const [pictures, setPictures] = useState<Record<string, BankPhoto>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const labels = [
      ...WEEKS.flatMap(w => w.words),
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

  /** Thumbnail strip + the hand-off button. Shared by baskets and book scenes. */
  const PictureRow = ({ labels, accent, caption }: { labels: string[]; accent: string; caption?: string }) => {
    const photos = photosFor(labels);
    return (
      <div className="mt-4">
        {caption && (
          <div className="text-white/30 text-xs mb-2 text-left">{caption}</div>
        )}
        <div className="grid grid-cols-5 gap-2">
          {labels.map((label) => {
            const photo = pictures[label.toLowerCase()];
            return (
              <div
                key={label}
                className="rounded-lg overflow-hidden border"
                style={{ borderColor: `rgba(${accent},0.16)`, background: 'rgba(255,255,255,0.04)' }}
                title={label}
              >
                <div className="aspect-square flex items-center justify-center">
                  {photo ? (
                    <img
                      src={photoSrc(photo, 240)}
                      srcSet={photo.storage_path ? getThumbnailSrcSet(photo.storage_path, 120, 70, 'photo-bank') : undefined}
                      sizes="(max-width: 640px) 18vw, 120px"
                      alt={label}
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
            Initial-sound materials — object baskets, pictures, books, week by week.
          </p>

          {/* Canonical word list */}
          <div className="mt-12">
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
                <div className="text-white font-semibold text-lg">Object Baskets</div>
                <div className="text-sm mt-0.5" style={{ color: 'rgba(232,201,106,0.55)' }}>
                  Canonical word list, sizing &amp; buy notes &middot; 30 words &middot; 5 per letter
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 group-hover:translate-x-1 transition-all shrink-0" style={{ color: 'rgba(232,201,106,0.4)' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* One block per week */}
          <div className="mt-4 space-y-4">
            {WEEKS.map((block) => (
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
                  {block.words.map((word) => (
                    <span
                      key={word}
                      className="px-3 py-1.5 rounded-full text-sm"
                      style={{
                        background: `rgba(${block.accent},0.12)`,
                        border: `1px solid rgba(${block.accent},0.22)`,
                        color: `rgba(${block.tint},0.85)`,
                      }}
                    >
                      {word}
                    </span>
                  ))}
                </div>

                {/* Basket pictures + hand-off */}
                <PictureRow labels={block.words} accent={block.accent} />

                {/* Ready-made three-part-card sheets already on disk */}
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
                      labels={block.book.pictureLabels}
                      accent={block.accent}
                      caption="Sentence pictures — from the book"
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-white/[0.06] px-4 py-3 text-center">
                    <span className="text-white/20 text-xs">Book — coming soon</span>
                  </div>
                )}
              </div>
            ))}
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
