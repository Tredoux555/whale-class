// /montree/dashboard/present/page.tsx
// SESSION 113 V2 — Parent-night album presentation view.
//
// Tredoux is showing parents their child's photos in person. He needs a
// clean slideshow:
//   - pick a child
//   - photos appear ONE AT A TIME, full-bleed
//   - NO dates, NO captions, NO work names rendered anywhere on the photo
//   - left/right arrow keys, on-screen prev/next buttons, click photo to advance
//   - ESC to exit back to picker
//   - "Next child" wraps back to picker so he can pick whoever's parents are next
//
// This is SEPARATE from /montree/dashboard/[childId]/gallery (the teacher
// editing workspace). Do not consolidate.
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

interface Child {
  id: string;
  name: string;
  photo_url?: string;
}

interface AlbumPhoto {
  id: string;
  storage_path: string;
}

const FOREST_BG = '#0a1a0f';
const EMERALD = '#34d399';

function ChildAvatar({ child, size = 96 }: { child: Child; size?: number }) {
  const [fallback, setFallback] = useState(!child.photo_url);
  if (!fallback && child.photo_url) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'rgba(52,211,153,0.15)',
          boxShadow: 'none',
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- proxy URL via Cloudflare, not next/image-compatible */}
        <img
          src={getProxyUrl(child.photo_url)}
          alt=""
          loading="lazy"
          onError={() => setFallback(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(52,211,153,0.18)',
        border: '1px solid rgba(52,211,153,0.40)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'var(--font-lora), Georgia, serif',
        fontSize: size * 0.42,
        flexShrink: 0,
      }}
    >
      {child.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function PresentAlbumPage() {
  const router = useRouter();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);

  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  // In-session hide/unhide. Hiding fires a PATCH to montree_media setting
  // parent_visible=false — that persists across sessions (server filters it
  // out on next album load). The "Hidden N" pill + tray lets the teacher
  // un-hide within this session if it was a mis-tap.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showHiddenTray, setShowHiddenTray] = useState(false);

  const viewable = useMemo(
    () => photos.filter((p) => !hiddenIds.has(p.id)),
    [photos, hiddenIds]
  );
  const hiddenPhotos = useMemo(
    () => photos.filter((p) => hiddenIds.has(p.id)),
    [photos, hiddenIds]
  );

  const patchVisibility = useCallback((id: string, parent_visible: boolean) => {
    fetch('/api/montree/media', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, parent_visible }),
    }).catch((err) => console.error('[present] visibility patch error:', err));
  }, []);

  const hidePhoto = useCallback(
    (id: string) => {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      patchVisibility(id, false);
    },
    [patchVisibility]
  );

  const unhidePhoto = useCallback(
    (id: string) => {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      patchVisibility(id, true);
    },
    [patchVisibility]
  );

  // ── Auth + redirect-on-fail ──
  useEffect(() => {
    const s = getSession();
    if (!s || !s.classroom?.id) {
      router.replace('/montree/login-select');
      return;
    }
    setSession(s);
    setAuthChecked(true);
  }, [router]);

  // ── Load children for the classroom (server enforces cross-school scoping) ──
  const classroomId = session?.classroom?.id;
  useEffect(() => {
    if (!authChecked || !classroomId) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingChildren(true);
        const res = await fetch(
          `/api/montree/children?classroom_id=${classroomId}`,
          { signal: ctrl.signal, credentials: 'include' }
        );
        if (!res.ok) {
          setChildren([]);
          return;
        }
        const data = await res.json();
        setChildren(Array.isArray(data?.children) ? data.children : []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[present] children load error:', err);
        }
      } finally {
        setLoadingChildren(false);
      }
    })();
    return () => ctrl.abort();
  }, [authChecked, classroomId]);

  // Clamp index when viewable shrinks (e.g. after hiding the last photo).
  useEffect(() => {
    if (index > 0 && index >= viewable.length) {
      setIndex(Math.max(0, viewable.length - 1));
    }
  }, [viewable.length, index]);

  // ── Load album when child selected ──
  useEffect(() => {
    if (!selectedChild) {
      setPhotos([]);
      setIndex(0);
      setHiddenIds(new Set());
      setShowHiddenTray(false);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingPhotos(true);
        setPhotoError(null);
        setIndex(0);
        const res = await fetch(
          `/api/montree/present/album?child_id=${selectedChild.id}`,
          { signal: ctrl.signal, credentials: 'include' }
        );
        if (!res.ok) {
          setPhotoError('Could not load album');
          setPhotos([]);
          return;
        }
        const data = await res.json();
        setPhotos(Array.isArray(data?.photos) ? data.photos : []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[present] album load error:', err);
          setPhotoError('Could not load album');
        }
      } finally {
        setLoadingPhotos(false);
      }
    })();
    return () => ctrl.abort();
  }, [selectedChild]);

  const childrenSorted = useMemo(
    () => [...children].sort((a, b) => a.name.localeCompare(b.name)),
    [children]
  );

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, Math.max(0, viewable.length - 1)));
  }, [viewable.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const closeAlbum = useCallback(() => {
    setSelectedChild(null);
  }, []);

  // ── Keyboard nav (only when an album is active) ──
  useEffect(() => {
    if (!selectedChild) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeAlbum();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedChild, goNext, goPrev, closeAlbum]);

  // Lock body scroll while presenting
  useEffect(() => {
    if (selectedChild) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedChild]);

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: FOREST_BG }} />
    );
  }

  // ─────────────────────────────────────────────────────────
  // PRESENTATION VIEW — full-bleed, no chrome on the photo
  // ─────────────────────────────────────────────────────────
  if (selectedChild) {
    const total = viewable.length;
    const current = viewable[index];
    const hiddenCount = hiddenIds.size;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Inter", system-ui, sans-serif',
          zIndex: 9999,
        }}
      >
        {/* Top strip — child name + counter + close. Minimal. NO DATES. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-lora), Georgia, serif',
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: -0.2,
              textShadow: '0 1px 4px rgba(0,0,0,0.55)',
            }}
          >
            {selectedChild.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowHiddenTray((v) => !v)}
                aria-label={`Show ${hiddenCount} hidden photo${hiddenCount === 1 ? '' : 's'}`}
                style={{
                  minHeight: 36,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(232,201,106,0.45)',
                  background: showHiddenTray ? 'rgba(232,201,106,0.22)' : 'rgba(232,201,106,0.12)',
                  color: '#E8C96A',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                ↺ {hiddenCount} hidden
              </button>
            )}
            {current && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  hidePhoto(current.id);
                }}
                aria-label="Hide this photo"
                style={{
                  minHeight: 36,
                  padding: '0 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.30)',
                  background: 'rgba(0,0,0,0.40)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: 0.3,
                  cursor: 'pointer',
                }}
              >
                Hide
              </button>
            )}
            {total > 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.75)',
                  letterSpacing: 0.4,
                }}
              >
                {index + 1} / {total}
              </div>
            )}
            <button
              type="button"
              onClick={closeAlbum}
              aria-label="Close"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(0,0,0,0.35)',
                color: '#fff',
                fontSize: 20,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Hidden-photos revert tray. Slides down from top. Tap a thumbnail
            to bring that photo back into the slideshow. */}
        {showHiddenTray && hiddenCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 76,
              right: 14,
              maxWidth: 'min(92vw, 520px)',
              maxHeight: '60vh',
              overflowY: 'auto',
              padding: 14,
              borderRadius: 16,
              background: 'rgba(10,26,15,0.96)',
              border: '1px solid rgba(232,201,106,0.35)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              zIndex: 5,
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div style={{ color: '#E8C96A', fontSize: 12, fontWeight: 600, letterSpacing: 0.4 }}>
                Tap to bring back
              </div>
              <button
                type="button"
                onClick={() => setShowHiddenTray(false)}
                aria-label="Close hidden tray"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.20)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: 8,
              }}
            >
              {hiddenPhotos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => unhidePhoto(p.id)}
                  aria-label="Bring this photo back"
                  style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    padding: 0,
                    border: '1px solid rgba(232,201,106,0.35)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: '#000',
                    cursor: 'pointer',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getProxyUrl(p.storage_path)}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      opacity: 0.55,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0.4,
                      textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                    }}
                  >
                    Show
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photo stage */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
          onClick={goNext}
        >
          {loadingPhotos ? (
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>Loading…</div>
          ) : photoError ? (
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>{photoError}</div>
          ) : total === 0 ? (
            <div
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 16,
                textAlign: 'center',
                maxWidth: 360,
                padding: 20,
              }}
            >
              No confirmed photos yet for {selectedChild.name}.
            </div>
          ) : current ? (
            // eslint-disable-next-line @next/next/no-img-element -- proxy URL via Cloudflare, full-bleed presentation; next/image would constrain layout
            <img
              key={current.id}
              src={getProxyUrl(current.storage_path)}
              alt=""
              draggable={false}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            />
          ) : null}

          {/* Preload next photo so it pops in instantly on tap */}
          {viewable[index + 1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getProxyUrl(viewable[index + 1].storage_path)}
              alt=""
              style={{ display: 'none' }}
            />
          )}
        </div>

        {/* Prev / Next side hot-zones (in addition to keyboard + click). 44pt tap targets. */}
        {total > 0 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous photo"
              disabled={index === 0}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(0,0,0,0.35)',
                color: index === 0 ? 'rgba(255,255,255,0.25)' : '#fff',
                fontSize: 26,
                cursor: index === 0 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
                opacity: index === 0 ? 0.4 : 1,
              }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next photo"
              disabled={index >= total - 1}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(0,0,0,0.35)',
                color: index >= total - 1 ? 'rgba(255,255,255,0.25)' : '#fff',
                fontSize: 26,
                cursor: index >= total - 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
                opacity: index >= total - 1 ? 0.4 : 1,
              }}
            >
              ›
            </button>
          </>
        )}

        {/* Bottom strip — "Next child" when at end */}
        {total > 0 && index >= total - 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px 20px 22px',
              display: 'flex',
              justifyContent: 'center',
              background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))',
              zIndex: 2,
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeAlbum();
              }}
              style={{
                minHeight: 44,
                padding: '10px 22px',
                borderRadius: 999,
                border: `1px solid ${EMERALD}`,
                background: 'rgba(52,211,153,0.18)',
                color: '#fff',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: 0.2,
                cursor: 'pointer',
              }}
            >
              ← Pick next child
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // PICKER VIEW — child selector
  // ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: FOREST_BG,
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '32px 20px 60px',
      }}
    >
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/montree/dashboard')}
            style={{
              minHeight: 44,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ← Dashboard
          </button>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-lora), Georgia, serif',
            fontSize: 34,
            letterSpacing: -0.4,
            margin: '0 0 6px',
            fontWeight: 500,
          }}
        >
          Present an album
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            margin: '0 0 28px',
            maxWidth: 560,
            lineHeight: 1.55,
          }}
        >
          Pick a child to walk through their photos. Tap, click, or use the arrow
          keys to move through. Press Esc to come back here.
        </p>

        {loadingChildren ? (
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>Loading children…</div>
        ) : childrenSorted.length === 0 ? (
          <div
            style={{
              padding: 28,
              borderRadius: 16,
              border: '1px solid rgba(52,211,153,0.20)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.65)',
              fontSize: 14,
            }}
          >
            No children in this classroom yet.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 16,
            }}
          >
            {childrenSorted.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelectedChild(child)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: '20px 12px',
                  minHeight: 180,
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(52,211,153,0.18)',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 140ms ease',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(52,211,153,0.10)';
                  e.currentTarget.style.borderColor = 'rgba(52,211,153,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(52,211,153,0.18)';
                }}
              >
                <ChildAvatar child={child} size={92} />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.92)',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                >
                  {child.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
