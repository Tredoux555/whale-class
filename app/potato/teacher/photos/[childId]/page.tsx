// app/potato/teacher/photos/[childId]/page.tsx — review and delete.
//
// Deleting a bad shot IS the curation in this product: there is no AI, no
// confirm queue, no parent-visible flag. What survives here is what goes into
// the film.
//
// 🚨 The week comes off window.location.search inside an effect rather than
// useSearchParams(), which would force this page to sit inside a Suspense
// boundary to prerender.

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, IconBack, IconTrash, IconPlay } from '@/components/potato/PotatoBits';
import Lightbox, { type LightboxPhoto } from '@/components/potato/Lightbox';
import { getJson, deleteJson, patchJson, messageFrom, PotatoApiError } from '@/lib/potato/client';
import { currentWeekStartLocal, addDays, weekLabel as labelForWeek } from '@/lib/potato/week';

/**
 * v1.7 — which slice of this child's life is on screen.
 *
 * 'week' is the film's window and the board's window. 'all' is the scroll-back
 * through everything, which is what a teacher wants when she taps a child's
 * face rather than a week's bar.
 */
type Scope = 'week' | 'all';

interface Photo {
  id: string;
  url: string | null;
  capturedAt: string;
  /** v1.1 — the lightbox shows and fixes these */
  dayLabel: string;
  childIds: string[];
  /** v1.6 — 'photo' unless she picked a video out of her library */
  mediaType?: 'photo' | 'video';
  durationSeconds?: number | null;
}

/** "0:07", "1:24", "12:03". Never "0:7". */
function clockOf(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

interface RosterChild {
  id: string;
  name: string;
  faceUrl: string | null;
}

interface PhotosResponse {
  child: { id: string; name: string; faceUrl: string | null };
  weekStart: string;
  weekLabel: string;
  threshold: number;
  children: RosterChild[];
  photos: Photo[];
  /** v1.7 — which question the server actually answered */
  scope?: Scope;
  /** v1.7 — all-time only: there is more history than this list holds */
  truncated?: boolean;
}

export default function ChildPhotosPage() {
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const childId = typeof params?.childId === 'string' ? params.childId : '';

  const [week, setWeek] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [data, setData] = useState<PhotosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightboxAt, setLightboxAt] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // Client-only read of ?week= — no useSearchParams, no Suspense requirement.
  //
  // 🚨 THE ABSENCE OF ?week= IS ITSELF THE INSTRUCTION. Arriving from the
  // board means arriving from a week, and she wants that week. Arriving from
  // the roster — a plain /photos/<id> with nothing on it — means she was
  // thinking about the CHILD, not about a Tuesday, so that opens on
  // everything. A week is still held in hand either way, so the segmented
  // control has somewhere to go back to.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('week');
    const valid = !!raw && /^\d{4}-\d{2}-\d{2}$/.test(raw);
    setWeek(valid ? (raw as string) : currentWeekStartLocal());
    setScope(valid ? 'week' : 'all');
  }, []);

  const load = useCallback(async () => {
    if (!childId || !week || !scope) return;
    try {
      // 🚨 `media=all` is what makes video visible AT ALL. The route defaults
      // to photos-only because its other caller — the child film picker —
      // feeds a stills renderer that must never be handed a video. This is the
      // review screen: everything she saved belongs here.
      const next = await getJson<PhotosResponse>(
        `/api/potato/photos?childId=${encodeURIComponent(childId)}&week=${encodeURIComponent(week)}&media=all` +
          // v1.7 — the week is still sent in all-time mode so the response can
          // keep labelling the week she will land back on.
          (scope === 'all' ? '&all=1' : ''),
      );
      setData(next);
      setFatal(null);
    } catch (err) {
      if (err instanceof PotatoApiError && err.status === 401) {
        router.replace('/potato/teacher/login');
        return;
      }
      setFatal(messageFrom(err, 'Could not load those photos.'));
    } finally {
      setLoading(false);
    }
  }, [childId, week, scope, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Takes the minimum it needs, so the grid (Photo) and the lightbox
  // (LightboxPhoto) can both hand it a row.
  const remove = useCallback(
    async (photo: { id: string; mediaType?: 'photo' | 'video' }) => {
      if (deleting) return;
      if (!window.confirm(photo.mediaType === 'video' ? 'Delete this video?' : 'Delete this photo?')) return;
      setDeleting(photo.id);
      // Optimistic: the grid should feel instant. A failure puts it back.
      const before = data;
      setData((current) =>
        current ? { ...current, photos: current.photos.filter((p) => p.id !== photo.id) } : current,
      );
      try {
        await deleteJson(`/api/potato/photos/${photo.id}`);
        showToast('Deleted.');
      } catch (err) {
        setData(before);
        showToast(messageFrom(err, 'Could not delete that photo.'), true);
      } finally {
        setDeleting(null);
      }
      // Keep the viewer pointed at something real: deleting the last photo
      // closes it, deleting any other steps back rather than off the end.
      setLightboxAt((at) => {
        if (at === null) return null;
        const remaining = (before?.photos.length ?? 1) - 1;
        if (remaining <= 0) return null;
        return Math.min(at, remaining - 1);
      });
    },
    [deleting, data, showToast],
  );

  const retag = useCallback(
    async (photo: LightboxPhoto, childIds: string[]) => {
      const before = data;
      // Optimistic — a tag fix should feel like flicking a switch.
      setData((current) =>
        current
          ? {
              ...current,
              photos: current.photos.map((p) => (p.id === photo.id ? { ...p, childIds } : p)),
            }
          : current,
      );
      try {
        await patchJson(`/api/potato/photos/${photo.id}`, { childIds });
      } catch (err) {
        setData(before);
        showToast(messageFrom(err, 'Could not save those tags.'), true);
      }
    },
    [data, showToast],
  );

  /**
   * Point the screen at a different slice.
   *
   * 🚨 IT CLOSES THE VIEWER FIRST. The lightbox is an INDEX into the list that
   * is about to be replaced — leaving it open across a scope or week change is
   * how a teacher ends up looking at whatever photo happens to land in slot 4
   * of a completely different week.
   */
  const changeView = useCallback((next: { scope?: Scope; week?: string }) => {
    setLightboxAt(null);
    setLoading(true);
    if (next.scope) setScope(next.scope);
    if (next.week) setWeek(next.week);
  }, []);

  const items = data?.photos ?? [];
  const count = items.length;
  const threshold = data?.threshold ?? 8;
  // 🚨 THE HEADLINE COUNTS PHOTOS, NOT ITEMS. The number next to the threshold
  // is "how close is this child to a film", and a video does not move a child
  // toward a film — the renderer is stills-only. Counting clips into it would
  // tell a teacher she is done when she is not, which is the one thing this
  // screen must never do. Videos get their own quiet line instead.
  const photoCount = items.filter((item) => item.mediaType !== 'video').length;
  const videoCount = count - photoCount;
  const isAll = scope === 'all';
  const childName = data?.child.name ?? 'this child';
  const thisWeek = currentWeekStartLocal();

  return (
    <div className="pt-app">
      <div className="pt-topbar">
        {/* The way back to the board, and the only chrome on this screen. */}
        <Link href="/potato/teacher" className="pt-iconbtn" aria-label="Back to the board">
          <IconBack size={20} />
        </Link>
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">{data ? `${data.child.name}’s photos` : 'Photos'}</h1>
          {isAll ? (
            <div className="pt-weekpill">Every week</div>
          ) : (
            // Same week walker the board uses, so paging back through a term
            // is the same two taps in both places.
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="pt-weekpill"
                aria-label="Previous week"
                onClick={() => week && changeView({ week: addDays(week, -7) })}
              >
                ‹
              </button>
              <span className="pt-weekpill" style={{ background: 'transparent', padding: '3px 2px' }}>
                {data?.weekLabel ?? (week ? labelForWeek(week) : '')}
              </span>
              {week && week !== thisWeek ? (
                <button
                  type="button"
                  className="pt-weekpill"
                  aria-label="Back to this week"
                  onClick={() => changeView({ week: thisWeek })}
                >
                  Today
                </button>
              ) : null}
              <button
                type="button"
                className="pt-weekpill"
                aria-label="Next week"
                onClick={() => week && changeView({ week: addDays(week, 7) })}
              >
                ›
              </button>
            </div>
          )}
        </div>
        {data ? <Avatar name={data.child.name} seed={data.child.id} url={data.child.faceUrl} size="xs" empty={!data.child.faceUrl} /> : null}
      </div>

      <div className="pt-scroll">
        {/* v1.7 — the week is the film's window; everything else is the child's
            whole time in the room. Both are real questions, so both get a tab
            rather than one hiding behind a link. */}
        <div className="pt-segment">
          <button
            type="button"
            className={!isAll ? 'pt-on' : undefined}
            onClick={() => changeView({ scope: 'week' })}
          >
            This week
          </button>
          <button
            type="button"
            className={isAll ? 'pt-on' : undefined}
            onClick={() => changeView({ scope: 'all' })}
          >
            All photos
          </button>
        </div>

        <div className="pt-seclabel">
          <h2>
            {isAll
              ? `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'} altogether`
              : `${photoCount} of ${threshold} this week`}
            {videoCount > 0 ? ` · ${videoCount} ${videoCount === 1 ? 'video' : 'videos'}` : ''}
          </h2>
          <span>{videoCount > 0 ? 'TAP ANYTHING TO OPEN IT' : 'TAP A PHOTO TO OPEN IT'}</span>
        </div>

        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : fatal ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        ) : count === 0 ? (
          <div className="pt-empty">
            {isAll ? (
              `No photos of ${childName} yet.`
            ) : (
              <>
                {'No photos this week.'}
                <br />
                <button
                  type="button"
                  onClick={() => changeView({ scope: 'all' })}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0 0',
                    cursor: 'pointer',
                    color: '#C9860B',
                    font: 'inherit',
                    fontWeight: 800,
                  }}
                >
                  {`Look at every week →`}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="pt-photogrid">
            {data!.photos.map((photo, i) => {
              const isVideo = photo.mediaType === 'video';
              const clock = isVideo ? clockOf(photo.durationSeconds) : null;
              return (
                <div className="pt-thumb" key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setLightboxAt(i)}
                    aria-label={`Open ${isVideo ? 'this video' : photo.dayLabel || 'this photo'}`}
                    style={{ display: 'block', width: '100%', height: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    {photo.url ? (
                      isVideo ? (
                        // `preload="metadata"` fetches the header and the first
                        // frame and stops — a poster image for the cost of a
                        // Range request, not the whole clip. `muted` +
                        // `playsInline` stop iOS from taking the tile over.
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video src={photo.url} preload="metadata" muted playsInline />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo.url} alt="" loading="lazy" />
                      )
                    ) : null}
                  </button>
                  {/* v1.6 — what tells a teacher at a glance that this tile is
                      a clip and not a still. The length rides along when it is
                      known; the badge alone is the answer when it is not. */}
                  {isVideo ? (
                    <span className="pt-thumb__play" aria-hidden="true">
                      <IconPlay size={13} color="#23395B" />
                      {clock}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="pt-thumb__x"
                    aria-label={isVideo ? 'Delete this video' : 'Delete this photo'}
                    disabled={deleting === photo.id}
                    onClick={() => remove(photo)}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(35,57,91,.35)', textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
          {/* 🚨 This sentence stopped being true for everything on the screen
              the moment video landed here. Films are made of photos; a video is
              kept and watched and downloaded, and it is never cut into a
              montage. Saying so plainly here is cheaper than a teacher
              wondering why her clip is missing from the film. */}
          {/* 🚨 And it stops being true again in all-time mode: a film is made
              from ONE WEEK, so nothing on an every-week screen is "what goes
              into the film". Saying it there would teach a teacher that
              deleting an October photo changes this Friday's montage. */}
          {isAll
            ? `Everything ever taken of ${childName}. Films are made a week at a time — switch to This week to change one.`
            : videoCount > 0
              ? 'Every photo here goes into the film. Videos are kept for you to watch and download — they don’t go into films.'
              : 'Whatever is here is what goes into the film.'}
          {isAll && data?.truncated ? (
            <>
              <br />
              {'Showing the most recent 500 — older ones are still safe.'}
            </>
          ) : null}
        </p>
      </div>

      {lightboxAt !== null && data && data.photos[lightboxAt] ? (
        <Lightbox
          photos={data.photos}
          index={lightboxAt}
          roster={data.children}
          ownerName={data.child.name}
          onIndexChange={setLightboxAt}
          onClose={() => setLightboxAt(null)}
          onDelete={remove}
          onRetag={retag}
          busy={deleting !== null}
        />
      ) : null}

      {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
    </div>
  );
}
