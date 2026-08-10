// app/potato/teacher/page.tsx — THE CAPTURE BOARD.
//
// Faces on the left spine, one bar per child filling toward eight, the whole
// week readable in one glance from across a busy room.
//
// Row states, exactly as drawn in the approved spec:
//   empty      0 photos          dashed bar, "No photos yet this week"
//   collecting 1–7               baby-blue fill on warm sand
//   ready      8+, no job        gold fill, gold chip, sparkles, Make montage
//   cooking    queued/processing candy-stripe bar, bouncing dots
//   sent       done              blue tick, Watch
//   failed     failed            coral note + Try again
//
// Sorted least-photos-first so the children who need attention rise to the top.
//
// 🚨 The week key is the BROWSER's local Monday, computed from calendar fields —
// never toISOString(). See lib/potato/week.ts for why.

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CameraCapture, { type PotatoCapturedPhoto } from '@/components/potato/CameraCapture';
import {
  Mascot,
  Avatar,
  EmblemMark,
  IconCamera,
  IconMenu,
  IconCheck,
  IconFilm,
  IconPlay,
  IconBack,
  IconChevron,
  IconEye,
} from '@/components/potato/PotatoBits';
import { getJson, postJson, messageFrom, PotatoApiError } from '@/lib/potato/client';
import { enqueuePhoto } from '@/lib/potato/offline/sync-manager';
import { usePotatoQueue } from '@/lib/potato/offline/usePotatoQueue';
import ChildFilmPicker from '@/components/potato/ChildFilmPicker';
import PreviewSendSheet, { type PreviewFilm } from '@/components/potato/PreviewSendSheet';
import { currentWeekStartLocal, addDays, weekLabel } from '@/lib/potato/week';

interface BoardChild {
  id: string;
  name: string;
  faceUrl: string | null;
  photoCount: number;
  latestJob: { id: string; status: string; videoUrl: string | null; isSent: boolean; sentAt: string | null } | null;
}

interface Branding {
  schoolName: string | null;
  schoolLogoUrl: string | null;
  emblemUrl: string | null;
  initials: string;
}

interface ClassFilmState {
  available: boolean;
  min: number;
  max: number;
  poolCount: number;
  job: {
    id: string;
    status: string;
    photoCount: number;
    videoUrl: string | null;
    excused: string[];
    isSent: boolean;
    sentAt: string | null;
  } | null;
}

interface BoardResponse {
  class: { id: string; name: string; tz: string };
  /** v1.1 — null until migration 319 has run; every surface falls back cleanly */
  branding: Branding | null;
  classFilm: ClassFilmState | null;
  weekStart: string;
  weekLabel: string;
  isCurrentWeek: boolean;
  threshold: number;
  children: BoardChild[];
}

type Stage = 'board' | 'camera' | 'tag';

/** Poll while anything is rendering, so a finished film appears on its own. */
const COOKING_POLL_MS = 12_000;

export default function CaptureBoardPage() {
  const router = useRouter();

  const [weekStart, setWeekStart] = useState<string>(() => currentWeekStartLocal());
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [stage, setStage] = useState<Stage>('board');
  const [pendingPhoto, setPendingPhoto] = useState<PotatoCapturedPhoto | null>(null);
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [makingFor, setMakingFor] = useState<string | null>(null);
  const [watching, setWatching] = useState<{ name: string; url: string } | null>(null);

  // The offline capture queue. Photos live on the device first; this reports
  // what is still owed to the server and surfaces anything it refused.
  const queue = usePotatoQueue(board?.class.id ?? null);

  // v1.3 — make and send are separate acts, so the board drives two sheets:
  // the mini-picker (choose what goes in) and preview+send (decide to publish).
  const [picking, setPicking] = useState<{ id: string; name: string } | null>(null);
  // Remembered per child so "Remake" returns to the picker with the selection
  // the teacher already made, rather than making her start again.
  const [excludedByChild, setExcludedByChild] = useState<Record<string, string[]>>({});
  const [previewing, setPreviewing] = useState<PreviewFilm | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const load = useCallback(
    async (week: string, quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const data = await getJson<BoardResponse>(`/api/potato/board?week=${encodeURIComponent(week)}`);
        setBoard(data);
        setFatal(null);
      } catch (err) {
        if (err instanceof PotatoApiError && err.status === 401) {
          router.replace('/potato/teacher/login');
          return;
        }
        if (!quiet) setFatal(messageFrom(err, 'Could not load the board.'));
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    load(weekStart);
  }, [weekStart, load]);

  // While a montage is cooking, refresh quietly until it lands.
  const classFilmStatus = board?.classFilm?.job?.status;
  const cooking =
    !!board?.children.some(
      (child) => child.latestJob?.status === 'queued' || child.latestJob?.status === 'processing',
    ) || classFilmStatus === 'queued' || classFilmStatus === 'processing';
  useEffect(() => {
    if (!cooking) return;
    const timer = setInterval(() => load(weekStart, true), COOKING_POLL_MS);
    return () => clearInterval(timer);
  }, [cooking, weekStart, load]);

  // ── capture → tag → save ───────────────────────────────────────────────
  const onCaptured = useCallback((photo: PotatoCapturedPhoto) => {
    setPendingPhoto(photo);
    setTagged(new Set());
    setStage('tag');
  }, []);

  const toggleChild = useCallback((childId: string) => {
    setTagged((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  }, []);

  /**
   * 🚨 THE FOUNDER'S RULE, IN ONE FUNCTION.
   * The photo is written to the device BEFORE any network is touched. By the
   * time the teacher reads "Saved", the shot survives a dead spot, a locked
   * screen, a flat battery and a browser restart. The upload happens after, on
   * its own time, and retries until it lands.
   *
   * `capturedAt` is the shutter instant the camera stamped — not now, and
   * certainly not whenever the upload eventually succeeds.
   */
  const savePhoto = useCallback(async () => {
    if (!pendingPhoto || tagged.size === 0 || saving) return;
    const classId = board?.class.id;
    if (!classId) return;
    setSaving(true);
    try {
      await enqueuePhoto(pendingPhoto.blob, {
        classId,
        childIds: Array.from(tagged),
        capturedAt: pendingPhoto.timestamp,
        width: pendingPhoto.width,
        height: pendingPhoto.height,
      });
      setPendingPhoto(null);
      setTagged(new Set());
      setStage('board');
      showToast('Saved ✓ — uploading…');
      // Kick a sync but never wait on it: the save is already final.
      queue.retry();
      // The board's counts come from the server, so they catch up as uploads
      // land; refresh quietly in case this one is already through.
      load(weekStart, true).catch((err) => console.error('[potato] board refresh failed:', err));
    } catch (err) {
      // Only a genuine device-storage failure reaches here.
      showToast(messageFrom(err, 'That photo didn’t save to this device.'), true);
    } finally {
      setSaving(false);
    }
  }, [pendingPhoto, tagged, saving, board, showToast, load, weekStart, queue]);

  const makeMontage = useCallback(
    async (child: { id: string; name: string }, excludedMediaIds: string[]) => {
      if (makingFor) return;
      setMakingFor(child.id);
      try {
        await postJson('/api/potato/montage', {
          childId: child.id,
          weekStart,
          excludedMediaIds,
        });
        setExcludedByChild((prev) => ({ ...prev, [child.id]: excludedMediaIds }));
        setPicking(null);
        showToast(`Making ${child.name}’s film…`);
        await load(weekStart, true);
      } catch (err) {
        showToast(messageFrom(err, 'Could not start that film.'), true);
      } finally {
        setMakingFor(null);
      }
    },
    [makingFor, weekStart, showToast, load],
  );

  const logout = useCallback(async () => {
    try {
      await postJson('/api/potato/auth/logout', {});
    } catch (err) {
      console.error('[potato] logout failed:', err);
    }
    router.replace('/potato');
  }, [router]);

  // ── camera ─────────────────────────────────────────────────────────────
  if (stage === 'camera') {
    return <CameraCapture onCapture={onCaptured} onCancel={() => setStage('board')} />;
  }

  // ── tag screen ─────────────────────────────────────────────────────────
  if (stage === 'tag' && pendingPhoto) {
    const roster = board?.children ?? [];
    return (
      <div className="pt-app">
        <div className="pt-topbar">
          <button
            type="button"
            className="pt-iconbtn"
            aria-label="Back"
            onClick={() => {
              setStage('camera');
              setPendingPhoto(null);
            }}
          >
            <IconBack size={20} />
          </button>
          <div className="pt-topbar__txt">
            <h1 className="pt-topbar__title">New photo</h1>
          </div>
        </div>

        <div className="pt-scroll" style={{ paddingBottom: 12 }}>
          <div className="pt-photocard">
            <div className="pt-photocard__chip">
              <IconCamera size={14} color="#C9860B" /> Just now
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingPhoto.dataUrl} alt="The photo you just took" />
          </div>

          <h2 className="pt-q">{'Who’s in this photo?'}</h2>
          <p className="pt-qsub">Tap everyone you can see.</p>

          <div className="pt-facegrid">
            {roster.map((child) => {
              const on = tagged.has(child.id);
              return (
                <button
                  type="button"
                  key={child.id}
                  className={`pt-face ${on ? 'pt-face--on' : ''}`.trim()}
                  onClick={() => toggleChild(child.id)}
                  aria-pressed={on}
                >
                  <div className="pt-face__av">
                    <Avatar name={child.name} seed={child.id} url={child.faceUrl} size="lg" />
                    {on ? (
                      <div className="pt-face__badge">
                        <IconCheck size={13} color="#23395B" weight={3.6} />
                      </div>
                    ) : null}
                  </div>
                  <div className="pt-face__n">{child.name}</div>
                </button>
              );
            })}
          </div>

          {roster.length === 0 ? (
            <div className="pt-empty">
              No children yet.
              <br />
              <Link href="/potato/teacher/children" style={{ color: '#C9860B', fontWeight: 800 }}>
                Add your class first
              </Link>
            </div>
          ) : null}
        </div>

        <div className="pt-footbar">
          <button
            type="button"
            className="pt-btn pt-btn--ghost pt-btn--lg"
            style={{ width: 112 }}
            disabled={saving}
            onClick={() => {
              setStage('camera');
              setPendingPhoto(null);
            }}
          >
            Retake
          </button>
          <button
            type="button"
            className="pt-btn pt-btn--primary pt-btn--lg"
            disabled={saving || tagged.size === 0}
            onClick={savePhoto}
          >
            <IconCheck size={19} color="#23395B" weight={3.4} />
            {saving ? 'Saving…' : `Save · ${tagged.size} tagged`}
          </button>
        </div>

        {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
      </div>
    );
  }

  // ── the board ──────────────────────────────────────────────────────────
  const threshold = board?.threshold ?? 8;

  return (
    <div className="pt-app">
      <div className="pt-topbar">
        {/* v1.1: the class emblem takes the mascot's place — the app advertises
            the school, not itself. Pre-migration there is no branding, so the
            mascot stays. */}
        {board?.branding ? (
          <EmblemMark
            url={board.branding.emblemUrl}
            initials={board.branding.initials}
            size={40}
          />
        ) : (
          <Mascot size={40} shadow={false} />
        )}
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">{board?.class.name ?? 'PSS'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="pt-weekpill"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              aria-label="Previous week"
            >
              ‹
            </button>
            <span className="pt-weekpill" style={{ background: 'transparent', padding: '3px 2px' }}>
              {board?.isCurrentWeek ? 'This week · ' : ''}
              {board?.weekLabel ?? weekLabel(weekStart)}
            </span>
            {!board?.isCurrentWeek ? (
              <button
                type="button"
                className="pt-weekpill"
                onClick={() => setWeekStart(currentWeekStartLocal())}
                aria-label="Back to this week"
              >
                Today
              </button>
            ) : null}
            <button
              type="button"
              className="pt-weekpill"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              aria-label="Next week"
            >
              ›
            </button>
          </div>
        </div>
        <button type="button" className="pt-iconbtn" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
          <IconMenu size={20} />
        </button>
      </div>

      {menuOpen ? (
        <div style={{ padding: '12px 16px 0', display: 'grid', gap: 8 }}>
          <Link href="/potato/teacher/children" className="pt-btn pt-btn--ghost pt-btn--md" style={{ textDecoration: 'none' }}>
            Children
          </Link>
          <Link href="/potato/teacher/codes" className="pt-btn pt-btn--ghost pt-btn--md" style={{ textDecoration: 'none' }}>
            Parent codes
          </Link>
          <Link href="/potato/teacher/onboarding" className="pt-btn pt-btn--ghost pt-btn--md" style={{ textDecoration: 'none' }}>
            Child profiles
          </Link>
          <Link href="/potato/teacher/branding" className="pt-btn pt-btn--ghost pt-btn--md" style={{ textDecoration: 'none' }}>
            Branding
          </Link>
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--md" onClick={logout}>
            Log out
          </button>
        </div>
      ) : null}

      <div className="pt-scroll">
        <button type="button" className="pt-camerabtn" onClick={() => setStage('camera')}>
          <div className="pt-camerabtn__ic">
            <IconCamera size={27} color="#C9860B" />
          </div>
          <div>
            <div className="pt-camerabtn__t">Take a photo</div>
            <div className="pt-camerabtn__s">{'Then tap who’s in it'}</div>
          </div>
        </button>

        {queue.waiting > 0 ? (
          <button type="button" className="pt-pending" onClick={queue.retry} disabled={queue.syncing}>
            <span className="pt-pending__dot" aria-hidden="true" />
            <span className="pt-pending__t">
              {queue.waiting === 1 ? '1 photo waiting to upload' : `${queue.waiting} photos waiting to upload`}
              <small>{queue.syncing ? 'Uploading now…' : 'Saved on this device · tap to try now'}</small>
            </span>
          </button>
        ) : null}

        {queue.rejected.length > 0 ? (
          <div className="pt-rejected">
            <div className="pt-rejected__h">
              {queue.rejected.length === 1
                ? '1 photo couldn’t be saved'
                : `${queue.rejected.length} photos couldn’t be saved`}
            </div>
            {queue.rejected.slice(0, 4).map((entry) => (
              <div className="pt-rejected__row" key={entry.id}>
                <span className="pt-rejected__msg">{entry.errorMessage || 'The server refused it.'}</span>
                <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => queue.retryOne(entry.id)}>
                  Try again
                </button>
                <button type="button" className="pt-btn pt-btn--danger pt-btn--sm" onClick={() => queue.discardOne(entry.id)}>
                  Discard
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {board?.classFilm?.available ? (
          <ClassFilmCard
            state={board.classFilm}
            weekStart={weekStart}
            onWatch={(url) => setWatching({ name: `${board.class.name} · class film`, url })}
            onPreview={() =>
              setPreviewing({
                jobId: board.classFilm!.job!.id,
                kind: 'class',
                childId: null,
                title: board.class.name,
                weekLabel: board.weekLabel,
                photoCount: board.classFilm!.job!.photoCount,
                videoUrl: board.classFilm!.job!.videoUrl,
                familyCount: board.children.length,
              })
            }
          />
        ) : null}

        <div className="pt-seclabel">
          <h2>Your children</h2>
          <span>{`${threshold} PHOTOS = 1 FILM`}</span>
        </div>

        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : fatal ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        ) : (board?.children.length ?? 0) === 0 ? (
          <div className="pt-empty">
            No children yet.
            <br />
            <Link href="/potato/teacher/children" style={{ color: '#C9860B', fontWeight: 800 }}>
              Add your class
            </Link>
          </div>
        ) : (
          board!.children.map((child) => (
            <ChildRow
              key={child.id}
              child={child}
              threshold={threshold}
              busy={makingFor === child.id}
              onPick={() => setPicking({ id: child.id, name: child.name })}
              onPreview={() =>
                setPreviewing({
                  jobId: child.latestJob!.id,
                  kind: 'child',
                  childId: child.id,
                  title: child.name,
                  weekLabel: board?.weekLabel ?? '',
                  photoCount: child.photoCount,
                  videoUrl: child.latestJob!.videoUrl,
                })
              }
              onWatch={(url) => setWatching({ name: child.name, url })}
              weekStart={weekStart}
            />
          ))
        )}
      </div>

      {watching ? (
        <div
          role="presentation"
          onClick={() => setWatching(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(35,57,91,.72)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, display: 'grid', gap: 12 }}
          >
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={watching.url}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', borderRadius: 18, background: '#0d1b2a', display: 'block' }}
            />
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--md" onClick={() => setWatching(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {picking ? (
        <ChildFilmPicker
          childId={picking.id}
          childName={picking.name}
          weekStart={weekStart}
          initialExcluded={excludedByChild[picking.id]}
          busy={makingFor === picking.id}
          onCancel={() => setPicking(null)}
          onMake={(excludedMediaIds) => makeMontage(picking, excludedMediaIds)}
        />
      ) : null}

      {previewing ? (
        <PreviewSendSheet
          film={previewing}
          onClose={() => setPreviewing(null)}
          onRemake={() => {
            // Back to the picker with the selection intact. Only a child film
            // can be remade here; a class film is rebuilt in its own picker.
            const film = previewing;
            setPreviewing(null);
            if (film.kind === 'child' && film.childId) {
              // By id. Two children with the same name is an ordinary week in a
              // kindergarten, and a name match would reopen the wrong picker.
              const child = board?.children.find((c) => c.id === film.childId);
              if (child) setPicking({ id: child.id, name: child.name });
            } else if (film.kind === 'child') {
              console.error('[potato] preview had no childId — cannot remake');
            } else {
              router.push(`/potato/teacher/class-film?week=${encodeURIComponent(weekStart)}`);
            }
          }}
          onSent={() => {
            load(weekStart, true).catch((err) => console.error('[potato] board refresh failed:', err));
          }}
        />
      ) : null}

      {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
    </div>
  );
}

// -------------------------------------------------------- class film card ---

/**
 * One 70px slot under the camera and above the roster.
 *
 * Capture happens twenty times a day and keeps the top slot and the only honey
 * fill on the screen; the class film happens once a week, so this card is warm
 * paper with a blue emblem tile — deliberately NOT a second primary button.
 * One honey fill per screen is a system law.
 */
function ClassFilmCard({
  state,
  weekStart,
  onWatch,
  onPreview,
}: {
  state: ClassFilmState;
  weekStart: string;
  onWatch: (url: string) => void;
  onPreview: () => void;
}) {
  const job = state.job;
  const status = job?.status;

  if (status === 'queued' || status === 'processing') {
    return (
      <div className="pt-filmcard pt-filmcard--cook">
        <div className="pt-filmcard__ic">
          <IconFilm size={22} color="#C9860B" />
        </div>
        <div>
          <div className="pt-filmcard__t">Cooking the class film…</div>
          <div className="pt-filmcard__s">{`${job?.photoCount ?? 0} photos · every child is in it`}</div>
        </div>
        <div className="pt-filmcard__cta">~4 min</div>
        <div className="pt-filmcard__stripe" />
      </div>
    );
  }

  // Same law as a child film: made is not sent.
  if (status === 'done' && job?.isSent === false) {
    return (
      <div className="pt-filmcard pt-filmcard--send">
        <div className="pt-filmcard__ic">
          <IconFilm size={22} color="#23395B" />
        </div>
        <div>
          <div className="pt-filmcard__t">Class film ready</div>
          <div className="pt-filmcard__s">{`${job.photoCount} photos · only you can see it`}</div>
        </div>
        <button
          type="button"
          className="pt-btn pt-btn--primary pt-btn--glow pt-btn--sm"
          onClick={onPreview}
        >
          <IconEye size={17} /> Preview
        </button>
      </div>
    );
  }

  if (status === 'done') {
    const excused = job?.excused ?? [];
    return (
      <div className="pt-filmcard pt-filmcard--sent">
        <div className="pt-filmcard__ic">
          <IconCheck size={20} color="#3E93C4" weight={3.4} />
        </div>
        <div>
          <div className="pt-filmcard__t">Class film sent to all parents</div>
          <div className="pt-filmcard__s">
            {`${job?.photoCount ?? 0} photos`}
            {excused.length > 0 ? ` · ${excused.join(', ')} excused` : ''}
          </div>
        </div>
        {job?.videoUrl ? (
          <button type="button" className="pt-filmcard__cta" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => onWatch(job.videoUrl as string)}>
            <IconPlay size={13} color="#C9860B" /> Watch
          </button>
        ) : (
          <div className="pt-filmcard__cta">Sent</div>
        )}
      </div>
    );
  }

  // Not started (and the failed case, which also invites another go).
  return (
    <Link
      href={`/potato/teacher/class-film?week=${encodeURIComponent(weekStart)}`}
      className="pt-filmcard"
      style={{ textDecoration: 'none' }}
    >
      <div className="pt-filmcard__ic">
        <IconFilm size={22} color="#3E93C4" />
      </div>
      <div>
        <div className="pt-filmcard__t">
          {status === 'failed' ? 'The class film did not finish' : 'This week’s class film'}
        </div>
        <div className="pt-filmcard__s">
          {state.poolCount === 0
            ? 'Take some photos first'
            : `${state.poolCount} ${state.poolCount === 1 ? 'photo' : 'photos'} to choose from`}
        </div>
      </div>
      <div className="pt-filmcard__cta">
        {status === 'failed' ? 'Try again' : 'Pick favorites'} <IconChevron size={13} color="#C9860B" />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- the row ---

function ChildRow({
  child,
  threshold,
  busy,
  onPick,
  onPreview,
  onWatch,
  weekStart,
}: {
  child: BoardChild;
  threshold: number;
  busy: boolean;
  /** open the mini-picker — making a film is no longer one tap */
  onPick: () => void;
  /** open preview & send for an already-rendered, unsent film */
  onPreview: () => void;
  onWatch: (url: string) => void;
  weekStart: string;
}) {
  const count = child.photoCount;
  const status = child.latestJob?.status;
  const isEmpty = count === 0;
  const isCooking = status === 'queued' || status === 'processing';
  // 🚨 v1.3: 'done' now splits in two. A rendered film is READY TO SEND until
  // the teacher has previewed it and tapped Send; only then is it Sent.
  const isDone = status === 'done';
  const isReadyToSend = isDone && child.latestJob?.isSent === false;
  const isSent = isDone && child.latestJob?.isSent !== false;
  const isFailed = status === 'failed';
  const isReady = count >= threshold && !isCooking && !isDone;

  const pct = Math.max(0, Math.min(1, count / threshold)) * 100;
  const gold = count >= threshold;

  const barClass = [
    'pt-bar',
    isEmpty ? 'pt-bar--empty' : '',
    gold ? 'pt-bar--gold' : '',
    isCooking ? 'pt-bar--cooking' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rowClass = [
    'pt-row',
    isReady ? 'pt-row--ready' : '',
    // The warmest card on the board, because it is the only one waiting on her.
    isReadyToSend ? 'pt-row--send' : '',
    isEmpty ? 'pt-row--empty' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rowClass}>
      <Avatar name={child.name} seed={child.id} url={child.faceUrl} empty={!child.faceUrl} />

      <div className="pt-row__body">
        <div className="pt-row__head">
          <h3 className="pt-row__name">{child.name}</h3>
          {isReady ? (
            <div className="pt-sparks">
              <i />
              <i />
              <i />
            </div>
          ) : null}
          {isEmpty ? (
            <div className="pt-chip pt-chip--zero">{`0/${threshold}`}</div>
          ) : count < threshold ? (
            <div className="pt-chip">{`${count}/${threshold}`}</div>
          ) : (
            <div className="pt-chip pt-chip--gold">
              <IconCheck size={11} color="#23395B" weight={3.6} />
              {count}
            </div>
          )}
        </div>

        <div className={barClass}>
          {isEmpty ? null : <div className="pt-bar__fill" style={{ width: `${pct}%` }} />}
          <div className="pt-bar__ticks">
            {Array.from({ length: threshold }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>

        {isEmpty ? (
          <p className="pt-row__hint">No photos yet this week</p>
        ) : isCooking ? (
          <div className="pt-status pt-status--gold">
            <div className="pt-status__t">Cooking the film…</div>
            <div className="pt-dots">
              <i />
              <i />
              <i />
            </div>
            <div className="pt-status__m">~2 min</div>
          </div>
        ) : isReadyToSend ? (
          <>
            <div className="pt-status pt-status--gold" style={{ marginBottom: 10 }}>
              <div className="pt-tick pt-tick--gold">
                <IconCheck size={13} color="#23395B" weight={3.6} />
              </div>
              <div className="pt-status__t">Film ready</div>
            </div>
            <button
              type="button"
              className="pt-btn pt-btn--primary pt-btn--glow pt-btn--md"
              style={{ width: '100%' }}
              onClick={onPreview}
            >
              <IconEye size={19} /> Preview &amp; send
            </button>
          </>
        ) : isSent ? (
          <div className="pt-status">
            <div className="pt-tick">
              <IconCheck size={12} color="#23395B" weight={3.6} />
            </div>
            <div className="pt-status__t">Sent to parents</div>
            {child.latestJob?.videoUrl ? (
              <button type="button" className="pt-watch" onClick={() => onWatch(child.latestJob!.videoUrl!)}>
                <IconPlay size={13} color="#C9860B" /> Watch
              </button>
            ) : null}
          </div>
        ) : isFailed ? (
          <>
            <div className="pt-status pt-status--warn">
              <div className="pt-status__t" style={{ color: '#D6503F' }}>
                That film did not finish
              </div>
            </div>
            <div className="pt-rowact">
              <button type="button" className="pt-btn pt-btn--primary pt-btn--md" style={{ width: '100%' }} disabled={busy} onClick={onPick}>
                <IconFilm size={19} /> {busy ? 'Starting…' : 'Try again'}
              </button>
            </div>
          </>
        ) : isReady ? (
          <div className="pt-rowact">
            <button type="button" className="pt-btn pt-btn--primary pt-btn--md" style={{ width: '100%' }} disabled={busy} onClick={onPick}>
              <IconFilm size={19} /> {busy ? 'Starting…' : 'Make film'}
            </button>
          </div>
        ) : null}

        {!isEmpty ? (
          <div style={{ marginTop: 9 }}>
            <Link
              href={`/potato/teacher/photos/${child.id}?week=${encodeURIComponent(weekStart)}`}
              style={{ fontSize: 12, fontWeight: 800, color: 'rgba(35,57,91,.5)', textDecoration: 'none' }}
            >
              {`See ${child.name}’s photos →`}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
