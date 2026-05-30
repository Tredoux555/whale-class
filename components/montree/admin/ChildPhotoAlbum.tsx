// components/montree/admin/ChildPhotoAlbum.tsx
//
// Session 153 — renders a child's photos (from Astra's get_child_photos tool,
// delivered via the `child_photos` SSE event) as a filterable, full-screen
// swipeable album inside the principal chat. Replaces the old inline markdown
// thumbnails that opened each photo in a cumbersome new browser tab.
//
//   • Category chips: "All" + the curriculum areas present (Practical Life,
//     Sensorial, Language, Mathematics, Cultural) + "Observations" (photos not
//     tied to a lesson). Tap to filter.
//   • Square thumbnail grid.
//   • Tap a photo → full-screen PhotoLightbox (swipe / arrow-key / pinch-zoom),
//     scoped to the CURRENTLY FILTERED set so paging stays within the album.
'use client';

import { useMemo, useState } from 'react';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';

export interface ChildPhotoItem {
  url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  captured_at?: string | null;
  work?: string | null;
  area_key: string;
  area_label: string;
}

// Canonical Montessori area order; 'observations' (un-worked photos) last.
const AREA_ORDER = ['practical_life', 'sensorial', 'language', 'mathematics', 'cultural', 'observations'];

// Ask the media proxy for a small, fast thumbnail.
function thumb(url: string): string {
  return url + (url.includes('?') ? '&' : '?') + 'w=240&q=72';
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        color: active ? '#0b1f17' : 'rgba(255,255,255,0.78)',
        background: active ? '#7fd1a8' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${active ? '#7fd1a8' : 'rgba(255,255,255,0.14)'}`,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  );
}

export default function ChildPhotoAlbum({ photos }: { photos: ChildPhotoItem[] }) {
  const [active, setActive] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Categories actually present among these photos, in canonical order.
  const categories = useMemo(() => {
    const labelByKey = new Map<string, string>();
    for (const p of photos) if (!labelByKey.has(p.area_key)) labelByKey.set(p.area_key, p.area_label);
    return [...labelByKey.entries()].sort((a, b) => {
      const ia = AREA_ORDER.indexOf(a[0]);
      const ib = AREA_ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [photos]);

  const filtered = useMemo(
    () => (active === 'all' ? photos : photos.filter((p) => p.area_key === active)),
    [photos, active]
  );

  const lightboxPhotos = useMemo(
    () =>
      filtered.map((p) => ({
        url: p.url,
        caption: p.caption || p.work || undefined,
        date: p.captured_at || undefined,
      })),
    [filtered]
  );

  const selectCategory = (key: string) => {
    setActive(key);
    setLightboxIndex(null); // indices are into the filtered set — reset on filter change
  };

  return (
    <div style={{ marginTop: 14 }}>
      {/* Category chips — only when there's more than one album to choose. */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
          <Chip label={`All (${photos.length})`} active={active === 'all'} onClick={() => selectCategory('all')} />
          {categories.map(([key, label]) => (
            <Chip
              key={key}
              label={`${label} (${photos.filter((p) => p.area_key === key).length})`}
              active={active === key}
              onClick={() => selectCategory(key)}
            />
          ))}
        </div>
      )}

      {/* Thumbnail grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
          gap: 8,
        }}
      >
        {filtered.map((p, i) => (
          <button
            key={`${p.url}-${i}`}
            type="button"
            onClick={() => setLightboxIndex(i)}
            title={p.work || p.area_label}
            style={{
              position: 'relative',
              aspectRatio: '1 / 1',
              padding: 0,
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              overflow: 'hidden',
              cursor: 'zoom-in',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb(p.thumbnail_url || p.url)}
              alt={p.work || p.area_label}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <PhotoLightbox
          isOpen
          onClose={() => setLightboxIndex(null)}
          src={filtered[lightboxIndex].url}
          alt={filtered[lightboxIndex].work || filtered[lightboxIndex].area_label}
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}
    </div>
  );
}
