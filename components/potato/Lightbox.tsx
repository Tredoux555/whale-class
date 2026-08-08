// components/potato/Lightbox.tsx
// Full-screen flip-through viewer for the per-child photo review screen.
//
// THE ONE DARK SURFACE IN THE PRODUCT. A photo viewer needs its surround to
// disappear, so this is the single screen allowed a dark ground — and it is ink
// navy #1B2C47, the brand text colour, not a neutral black. Butter and coral
// still read against it.
//
// Swipe left/right through the week; the chevrons are affordances for a
// first-time user, not the primary control. Every control is 48px.

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Avatar, IconX, IconTrash, IconChevron, IconPlus, IconCheck } from '@/components/potato/PotatoBits';

export interface LightboxPhoto {
  id: string;
  url: string | null;
  dayLabel: string;
  childIds: string[];
}

export interface LightboxChild {
  id: string;
  name: string;
  faceUrl: string | null;
}

interface LightboxProps {
  photos: LightboxPhoto[];
  index: number;
  roster: LightboxChild[];
  onIndexChange: (next: number) => void;
  onClose: () => void;
  onDelete: (photo: LightboxPhoto) => void;
  onRetag: (photo: LightboxPhoto, childIds: string[]) => void;
  busy?: boolean;
}

/** Below this, a horizontal drag is a scroll, not a page turn. */
const SWIPE_PX = 48;

export default function Lightbox({
  photos,
  index,
  roster,
  onIndexChange,
  onClose,
  onDelete,
  onRetag,
  busy = false,
}: LightboxProps) {
  const [picking, setPicking] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const photo = photos[index];
  const nameOf = new Map(roster.map((c) => [c.id, c]));

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= photos.length) return;
      setPicking(false);
      onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  // Keyboard is not the primary control, but a teacher on a laptop should not
  // be stuck — and Escape closing an overlay is a reflex everyone has.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // The page behind must not scroll while the viewer owns the screen.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!photo) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Only a decisively horizontal drag turns the page.
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    go(dx < 0 ? 1 : -1);
  };

  const toggleTag = (childId: string) => {
    const next = photo.childIds.includes(childId)
      ? photo.childIds.filter((id) => id !== childId)
      : [...photo.childIds, childId];
    if (next.length === 0) return; // a photo always belongs to somebody
    onRetag(photo, next);
  };

  const tagged = photo.childIds.map((id) => nameOf.get(id)).filter((c): c is LightboxChild => !!c);

  return (
    <div className="pt-lb" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div className="pt-lb__bar">
        <button type="button" className="pt-lb__ic" onClick={onClose} aria-label="Close">
          <IconX size={16} color="#FFFDF6" />
        </button>
        <div className="pt-lb__t">
          <b>{photo.dayLabel}</b>
          <small>{`${index + 1} OF ${photos.length}`}</small>
        </div>
        <button
          type="button"
          className="pt-lb__ic pt-lb__ic--danger"
          onClick={() => onDelete(photo)}
          disabled={busy}
          aria-label="Delete this photo"
        >
          <IconTrash size={17} color="#FFA79A" />
        </button>
      </div>

      <div className="pt-lb__stage" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="pt-lb__photo">
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" />
          ) : null}
        </div>
        <button
          type="button"
          className="pt-lb__nav"
          style={{ left: 22 }}
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Previous photo"
        >
          <span style={{ display: 'grid', transform: 'rotate(180deg)' }}>
            <IconChevron size={16} color="#FFFDF6" />
          </span>
        </button>
        <button
          type="button"
          className="pt-lb__nav"
          style={{ right: 22 }}
          onClick={() => go(1)}
          disabled={index >= photos.length - 1}
          aria-label="Next photo"
        >
          <IconChevron size={16} color="#FFFDF6" />
        </button>
      </div>

      {photos.length > 1 && photos.length <= 40 ? (
        <div className="pt-lbdots">
          {photos.map((p, i) => (
            <i key={p.id} className={i === index ? 'pt-on' : undefined} />
          ))}
        </div>
      ) : null}

      <div className="pt-lb__foot">
        <div className="pt-lb__who">
          <p className="pt-lb__lbl">{picking ? 'Tap to add or remove' : 'In this photo'}</p>
          <div className="pt-lb__faces">
            {picking
              ? roster.map((child) => {
                  const on = photo.childIds.includes(child.id);
                  return (
                    <button
                      type="button"
                      key={child.id}
                      className="pt-lb__face"
                      onClick={() => toggleTag(child.id)}
                      disabled={busy}
                      aria-pressed={on}
                      style={{ opacity: on ? 1 : 0.55 }}
                    >
                      <span style={{ position: 'relative', display: 'block' }}>
                        <Avatar name={child.name} seed={child.id} url={child.faceUrl} size="xs" />
                        {on ? (
                          <span
                            style={{
                              position: 'absolute',
                              right: -4,
                              bottom: -4,
                              width: 18,
                              height: 18,
                              borderRadius: 999,
                              background: '#FFD466',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <IconCheck size={10} color="#23395B" weight={3.6} />
                          </span>
                        ) : null}
                      </span>
                      <span>{child.name}</span>
                    </button>
                  );
                })
              : (
                <>
                  {tagged.map((child) => (
                    <div className="pt-lb__face" key={child.id}>
                      <Avatar name={child.name} seed={child.id} url={child.faceUrl} size="xs" />
                      <span>{child.name}</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="pt-lb__face"
                    onClick={() => setPicking(true)}
                    aria-label="Fix who is in this photo"
                  >
                    <span className="pt-lb__add">
                      <IconPlus size={15} color="rgba(255,253,246,.55)" />
                    </span>
                    <span style={{ opacity: 0.55 }}>Add</span>
                  </button>
                </>
              )}
          </div>
          {picking ? (
            <button
              type="button"
              className="pt-btn pt-btn--ghost pt-btn--sm"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => setPicking(false)}
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
