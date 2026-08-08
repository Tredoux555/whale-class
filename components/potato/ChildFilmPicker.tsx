// components/potato/ChildFilmPicker.tsx
// The child film mini-picker — design spec tab 12.
//
// 🚨 DESELECT MODEL, and it is the inverse of the class picker on purpose.
// Founder's words: "all the pictures are selected and we just click on the ones
// we don't want." A child's week is already curated by being that child's week,
// so everything starts IN and the teacher only has to remove. That is the
// fastest possible version of this job. (The class picker stays opt-in, because
// a class film is a curated object assembled from everyone's photos.)
//
// Removal is calm: grayscale, 50% opacity, flat shadow, no tilt, a paper "Out"
// pill. Nothing red, nothing shakes, nothing warns. It reads as *set aside*,
// because it is reversible with one more tap.
//
// Nudge, then floor: below 8 the CTA stays live with a butter nudge (advice);
// below 4 it disables and says exactly what to do.

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { IconX, IconFilm, IconStar, IconStarOutline, IconSun } from '@/components/potato/PotatoBits';
import { getJson, messageFrom } from '@/lib/potato/client';

/** Below this there is no film to speak of. Mirrors CHILD_FILM_MIN server-side. */
const FLOOR = 4;
/** Below this we nudge, but never block. */
const ENCOURAGED = 8;
/** Three seconds of film per photo. */
const SECONDS_PER_PHOTO = 3;

interface PickerPhoto {
  id: string;
  url: string | null;
  dayLabel: string;
}

interface PhotosResponse {
  child: { id: string; name: string };
  weekLabel: string;
  photos: PickerPhoto[];
}

interface ChildFilmPickerProps {
  childId: string;
  childName: string;
  weekStart: string;
  /** restored when the teacher comes back via Remake, so nothing is retyped */
  initialExcluded?: string[];
  onCancel: () => void;
  onMake: (excludedMediaIds: string[]) => void;
  busy?: boolean;
}

export default function ChildFilmPicker({
  childId,
  childName,
  weekStart,
  initialExcluded,
  onCancel,
  onMake,
  busy = false,
}: ChildFilmPickerProps) {
  const [data, setData] = useState<PhotosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set(initialExcluded ?? []));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getJson<PhotosResponse>(
          `/api/potato/photos?childId=${encodeURIComponent(childId)}&week=${encodeURIComponent(weekStart)}`,
        );
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(messageFrom(err, 'Could not load those photos.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId, weekStart]);

  // Escape closes, the way every overlay in this product does.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const photos = useMemo(() => data?.photos ?? [], [data]);
  const kept = photos.filter((p) => !excluded.has(p.id)).length;
  const seconds = kept * SECONDS_PER_PHOTO;
  const belowFloor = kept < FLOOR;
  const belowEncouraged = kept < ENCOURAGED;

  const toggle = useCallback((id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="pt-sheet" role="dialog" aria-modal="true" aria-label={`${childName}’s film`}>
      <div className="pt-grab" />
      <div className="pt-sheetbar">
        <button type="button" className="pt-iconbtn pt-iconbtn--sm" onClick={onCancel} aria-label="Close">
          <IconX size={20} />
        </button>
        <div className="pt-sheetbar__t">
          <h1>{`${childName}’s film`}</h1>
          <p>
            {`${kept} ${kept === 1 ? 'photo' : 'photos'}`}
            <span className="pt-sep">·</span>
            {`≈${seconds}s`}
            <span className="pt-sep">·</span>
            {data?.weekLabel ?? ''}
          </p>
        </div>
      </div>

      <div className="pt-scroll" style={{ paddingTop: 16 }}>
        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : error ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{error}</div>
        ) : photos.length === 0 ? (
          <div className="pt-empty">No photos this week yet.</div>
        ) : (
          <>
            <p className="pt-foothint" style={{ margin: '0 0 14px', textAlign: 'left', paddingLeft: 2 }}>
              {'Everything’s in. Tap any photo to leave it out.'}
            </p>
            <div className="pt-pick">
              {photos.map((photo) => {
                const out = excluded.has(photo.id);
                return (
                  <button
                    type="button"
                    key={photo.id}
                    className={`pt-pol ${out ? 'pt-pol--out' : ''}`.trim()}
                    onClick={() => toggle(photo.id)}
                    aria-pressed={!out}
                    aria-label={out ? 'Put this photo back in the film' : 'Leave this photo out'}
                  >
                    <span className={`pt-pol__star ${out ? 'pt-pol__star--off' : ''}`.trim()}>
                      {out ? <IconStarOutline size={14} /> : <IconStar size={15} color="#23395B" filled />}
                    </span>
                    <span className="pt-pol__i">
                      {photo.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.url} alt="" loading="lazy" />
                      ) : null}
                    </span>
                    {out ? <span className="pt-pol__out">Out</span> : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="pt-footbar" style={{ flexDirection: 'column', gap: 0 }}>
        {belowFloor ? (
          <div className="pt-nudge pt-nudge--stop">
            <span className="pt-nudge__ic">
              <IconX size={18} color="#FFFDF6" />
            </span>
            <span className="pt-nudge__t">
              {`Keep at least ${FLOOR}`}
              <small>A film needs {FLOOR} photos</small>
            </span>
          </div>
        ) : belowEncouraged ? (
          <div className="pt-nudge">
            <span className="pt-nudge__ic">
              <IconSun size={18} color="#FFFDF6" />
            </span>
            <span className="pt-nudge__t">
              Films feel best with 8+
              <small>{`${kept} picked — that’s still fine`}</small>
            </span>
          </div>
        ) : null}

        {belowFloor ? (
          <button type="button" className="pt-btn pt-btn--lg" disabled>
            {`Keep at least ${FLOOR}`}
          </button>
        ) : (
          <button
            type="button"
            className={`pt-btn pt-btn--primary pt-btn--lg ${belowEncouraged ? '' : 'pt-btn--glow'}`.trim()}
            disabled={busy || loading || photos.length === 0}
            onClick={() => onMake(Array.from(excluded))}
          >
            <IconFilm size={21} /> {busy ? 'Starting…' : `Make film · ${kept}`}
          </button>
        )}
      </div>
    </div>
  );
}
