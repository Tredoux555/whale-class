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
import CameraCapture, { type PotatoCapturedMedia } from '@/components/potato/CameraCapture';
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
  IconDownload,
  IconPeople,
  IconX,
  tintFor,
} from '@/components/potato/PotatoBits';
import { getJson, postJson, messageFrom, PotatoApiError, downloadMedia, mediaFilename } from '@/lib/potato/client';
import { enqueueMedia } from '@/lib/potato/offline/sync-manager';
import {
  saveBlobToDevice,
  getSaveToDevicePreference,
  setSaveToDevicePreference,
  potatoMediaFilename,
} from '@/lib/potato/save-to-device';
import { usePotatoQueue } from '@/lib/potato/offline/usePotatoQueue';
import ChildFilmPicker from '@/components/potato/ChildFilmPicker';
import PreviewSendSheet, { type PreviewFilm } from '@/components/potato/PreviewSendSheet';
import { currentWeekStartLocal, addDays, weekLabel } from '@/lib/potato/week';
import { STAFF_NAMES } from '@/lib/potato/staff';

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
  /** Who new photos are currently attributed to. Null on an unnamed session
   * (the old code-door fallback never sets a name). */
  teacher: { name: string | null };
  /** v1.1 — null until migration 319 has run; every surface falls back cleanly */
  branding: Branding | null;
  classFilm: ClassFilmState | null;
  weekStart: string;
  weekLabel: string;
  isCurrentWeek: boolean;
  threshold: number;
  children: BoardChild[];
}

/** One EVENT — "Music class", "Outdoor time". Called a scene everywhere in the
 * code and the API; the teacher only ever reads the word "event". */
interface EventOption {
  id: string;
  name: string;
  isActive: boolean;
  photoCount: number;
}

interface ScenesResponse {
  scenes: EventOption[];
}

type Stage = 'board' | 'camera' | 'event' | 'tag';

/** Poll while anything is rendering, so a finished film appears on its own. */
const COOKING_POLL_MS = 12_000;

/**
 * The event the teacher last tagged, remembered across reloads so a morning of
 * "Outdoor time" shots does not mean twenty identical taps. `''` is a real
 * value meaning "Just class time" — distinct from "nothing remembered yet".
 */
const LAST_SCENE_KEY = 'potato_last_scene';

export default function CaptureBoardPage() {
  const router = useRouter();

  const [weekStart, setWeekStart] = useState<string>(() => currentWeekStartLocal());
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // v1.5 — in-app teacher switcher. `switching` names the roster pick that's
  // in flight, so the tapped button can say "Switching…" without a spinner.
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  // v1.7 — keep a copy of every shot on the teacher's own phone.
  //
  // 🚨 SEEDED false AND CORRECTED IN AN EFFECT, NEVER READ IN THE INITIALISER.
  // localStorage does not exist during the server render, and a useState
  // initialiser that touches it hands React a different first paint on the
  // client — the hydration mismatch this codebase has been bitten by before.
  // The real default (ON) lives in getSaveToDevicePreference.
  const [saveToDevice, setSaveToDevice] = useState(false);
  useEffect(() => {
    setSaveToDevice(getSaveToDevicePreference());
  }, []);

  const [stage, setStage] = useState<Stage>('board');
  const [pendingPhoto, setPendingPhoto] = useState<PotatoCapturedMedia | null>(null);
  const [tagged, setTagged] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // ── events ("scenes" in the API) ───────────────────────────────────────
  // A photo carries at most one event. The whole layer is optional: if the
  // migration has not run, or the fetch simply fails, `scenesUnavailable` goes
  // true and the flow is byte-for-byte the old camera → tag → save.
  const [scenes, setScenes] = useState<EventOption[]>([]);
  const [scenesReady, setScenesReady] = useState(false);
  const [scenesUnavailable, setScenesUnavailable] = useState(false);
  const [selectedScene, setSelectedScene] = useState<{ id: string; name: string } | null>(null);
  const [lastSceneId, setLastSceneId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(LAST_SCENE_KEY);
    } catch {
      // Server render, or a browser with storage switched off. The sticky
      // "Last used" hint is a nicety; nothing else depends on it.
      return null;
    }
  });
  const [addingEvent, setAddingEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [makingFor, setMakingFor] = useState<string | null>(null);
  const [watching, setWatching] = useState<{ name: string; url: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

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

  const handleDownloadWatching = useCallback(async () => {
    if (!watching || downloading) return;
    setDownloading(true);
    try {
      await downloadMedia(watching.url, mediaFilename(watching.name, weekStart));
    } catch (err) {
      showToast(messageFrom(err, 'Could not download that film.'), true);
    } finally {
      setDownloading(false);
    }
  }, [watching, downloading, weekStart, showToast]);

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

  /**
   * Events, fetched once on its own clock — never awaited by the board and
   * never in front of the camera. A 503 (migration not run), a 500 or a dead
   * network all land in the same place: the event step disappears and capture
   * behaves exactly as it did before this feature existed.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getJson<ScenesResponse>('/api/potato/scenes');
        if (cancelled) return;
        setScenes((data.scenes ?? []).filter((scene) => scene.isActive));
        setScenesUnavailable(false);
      } catch (err) {
        if (cancelled) return;
        // 401 is the board's job to act on — here it is just one more reason
        // to leave the event step out of the way.
        setScenesUnavailable(true);
        console.error('[potato] events unavailable:', err);
      } finally {
        if (!cancelled) setScenesReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** The event step only exists once we actually know what the events are. */
  const eventStepAvailable = scenesReady && !scenesUnavailable;

  /** `''` records "Just class time" — an answer, not an absence. */
  const rememberScene = useCallback((id: string) => {
    setLastSceneId(id);
    try {
      window.localStorage.setItem(LAST_SCENE_KEY, id);
    } catch {
      // Private mode. The pick still applies to this photo.
    }
  }, []);

  /** One tap: choose, remember, and move straight on to the faces. */
  const chooseScene = useCallback(
    (scene: { id: string; name: string } | null) => {
      setSelectedScene(scene);
      rememberScene(scene?.id ?? '');
      setAddingEvent(false);
      setNewEventName('');
      setStage('tag');
    },
    [rememberScene],
  );

  const addEvent = useCallback(async () => {
    const name = newEventName.trim();
    if (!name || addBusy) return;
    setAddBusy(true);
    try {
      const data = await postJson<{ scene?: EventOption }>('/api/potato/scenes', { name });
      const scene = data.scene;
      if (!scene) throw new Error('That event did not come back.');
      setScenes((prev) => (prev.some((s) => s.id === scene.id) ? prev : [...prev, { ...scene, isActive: true }]));
      chooseScene({ id: scene.id, name: scene.name });
    } catch (err) {
      // 409 = she already has an event by that name. That is the event she
      // meant, so use it rather than making her hunt for it in the grid.
      if (err instanceof PotatoApiError && err.status === 409) {
        const existing = scenes.find((s) => s.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          chooseScene({ id: existing.id, name: existing.name });
          return;
        }
      }
      showToast(messageFrom(err, 'Could not add that event.'), true);
    } finally {
      setAddBusy(false);
    }
  }, [newEventName, addBusy, scenes, chooseScene, showToast]);

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

  /**
   * Drop the pending capture, releasing its preview first.
   *
   * 🚨 v1.6 — A PICKED VIDEO'S PREVIEW IS AN OBJECT URL, NOT A DATA URL, and
   * an object URL pins the whole blob in memory until it is revoked. A teacher
   * who saves eight clips in a morning would otherwise be holding every one of
   * them alive behind a `pendingPhoto` that has long since been replaced. A
   * photo's data: URL is an ordinary string and revoking it is a harmless
   * no-op, so this runs for both rather than branching.
   */
  const clearPending = useCallback(() => {
    setPendingPhoto((current) => {
      if (current?.mediaType === 'video') {
        try {
          URL.revokeObjectURL(current.previewUrl);
        } catch {
          /* non-fatal */
        }
      }
      return null;
    });
  }, []);

  const onCaptured = useCallback(
    (media: PotatoCapturedMedia) => {
      setPendingPhoto(media);
      setTagged(new Set());
      setStage(eventStepAvailable ? 'event' : 'tag');
    },
    [eventStepAvailable],
  );

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
   *
   * `asGroup` is the one door through which a photo with nobody tagged may be
   * saved: the whole-class shot. It has to be asked for explicitly, so a
   * mis-tap on the ordinary Save can never file an untagged photo by accident.
   */
  const savePhoto = useCallback(async (asGroup = false) => {
    if (!pendingPhoto || saving) return;
    if (tagged.size === 0 && !asGroup) return;
    const classId = board?.class.id;
    if (!classId) return;
    setSaving(true);
    try {
      const isVideo = pendingPhoto.mediaType === 'video';
      // Held in locals because `clearPending()` below drops the state object,
      // and the copy-to-phone hand-off outlives this function.
      const shotBlob = pendingPhoto.blob;
      const shotAt = pendingPhoto.timestamp;
      const shotKind = pendingPhoto.mediaType;
      const fromShutter = pendingPhoto.source === 'camera';
      await enqueueMedia(pendingPhoto.blob, {
        classId,
        childIds: Array.from(tagged),
        capturedAt: pendingPhoto.timestamp,
        width: pendingPhoto.width,
        height: pendingPhoto.height,
        sceneId: selectedScene?.id ?? null,
        isGroup: tagged.size === 0,
        // v1.6 — both ride the same queue and the same upload; only these two
        // fields say which kind of thing just went into it.
        mediaType: pendingPhoto.mediaType,
        durationSeconds: pendingPhoto.durationSeconds,
      });

      /**
       * v1.7 — and now a copy for her own phone.
       *
       * 🚨 ORDER, AND WHY IT IS THIS ORDER. The class copy is written to the
       * device queue FIRST and is already final by the time we get here, so
       * nothing below can lose a photo: a share sheet she ignores, a browser
       * that refuses, an exception — the shot is saved either way. It runs
       * immediately AFTER that write rather than later, because
       * navigator.share() needs the tap that started this still to count as a
       * user gesture, and one IndexedDB write is milliseconds inside a
       * multi-second activation window.
       *
       * 🚨 SHUTTER SHOTS ONLY. A photo she picked out of her library is
       * already in her library.
       */
      if (fromShutter && saveToDevice) {
        void saveBlobToDevice(shotBlob, potatoMediaFilename(shotKind, shotAt))
          .then((result) => {
            if (result !== 'unsupported') return;
            // Self-healing: a browser that can do neither is told once and
            // then stops being asked, rather than failing silently forever.
            setSaveToDevicePreference(false);
            setSaveToDevice(false);
            showToast('Saved ✓ — but this browser can’t copy to your phone, so I turned that off.', true);
          })
          .catch((err) => console.error('[potato] copy to phone failed:', err));
      }

      clearPending();
      setTagged(new Set());
      setStage('board');
      // A video takes minutes, not seconds, on classroom wifi — say so, or she
      // will assume it failed and pick it again.
      showToast(isVideo ? 'Saved ✓ — the video will upload in the background…' : 'Saved ✓ — uploading…');
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
    // 🚨 `selectedScene` is deliberately NOT cleared. Music class does not stop
    // being music class after one photo; the next shot starts on the same event
    // and she re-picks only when the room changes.
  }, [pendingPhoto, tagged, saving, board, selectedScene, showToast, load, weekStart, queue, clearPending, saveToDevice]);

  /** The board's one switch for "…and keep a copy on my phone". */
  const toggleSaveToDevice = useCallback(() => {
    setSaveToDevice((on) => {
      const next = !on;
      setSaveToDevicePreference(next);
      return next;
    });
  }, []);

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

  /**
   * v1.5 — switch which staff member new photos are attributed to, without
   * leaving the board. Every photo lands in the same class bucket no matter
   * who's "signed in" — `staffName` only ever labels the shot afterwards —
   * so this hits the same door the login screen posts to
   * (POST /api/potato/auth/teacher) and re-mints the cookie in place. No
   * logout, no redirect, no re-navigating to /potato/teacher/login.
   */
  const switchTeacher = useCallback(
    async (name: string) => {
      if (switching) return;
      if (name === board?.teacher.name) {
        setSwitcherOpen(false);
        return;
      }
      setSwitching(name);
      try {
        await postJson('/api/potato/auth/teacher', { name });
        setBoard((prev) => (prev ? { ...prev, teacher: { name } } : prev));
        setSwitcherOpen(false);
        showToast(`Now capturing as ${name} ✓`);
      } catch (err) {
        showToast(messageFrom(err, 'Could not switch teacher.'), true);
      } finally {
        setSwitching(null);
      }
    },
    [switching, board?.teacher.name, showToast],
  );

  // ── camera ─────────────────────────────────────────────────────────────
  if (stage === 'camera') {
    return <CameraCapture onCapture={onCaptured} onCancel={() => setStage('board')} />;
  }

  // v1.6 — the event and tag screens are shared by both kinds of capture and
  // differ only in a preview element and three words of copy.
  const isPendingVideo = pendingPhoto?.mediaType === 'video';

  // ── event screen ───────────────────────────────────────────────────────
  // One tap, no footer, no Next button: the card IS the answer, and choosing
  // it walks straight on to the faces. The photo is already on the device by
  // the time this renders, so nothing here can lose it.
  if (stage === 'event' && pendingPhoto) {
    return (
      <div className="pt-app">
        <div className="pt-topbar">
          <button
            type="button"
            className="pt-iconbtn"
            aria-label="Back"
            onClick={() => {
              setStage('camera');
              clearPending();
            }}
          >
            <IconBack size={20} />
          </button>
          <div className="pt-topbar__txt">
            <h1 className="pt-topbar__title">{isPendingVideo ? 'New video' : 'New photo'}</h1>
          </div>
        </div>

        <div className="pt-scroll" style={{ paddingBottom: 12 }}>
          <div className="pt-photocard">
            <div className="pt-photocard__chip">
              <IconCamera size={14} color="#C9860B" /> Just now
            </div>
            {isPendingVideo ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={pendingPhoto.previewUrl}
                controls
                playsInline
                preload="metadata"
                style={{ maxHeight: '28vh', width: '100%', borderRadius: 14, background: '#0d1b2a', display: 'block' }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pendingPhoto.previewUrl} alt="The photo you just took" style={{ maxHeight: '28vh' }} />
            )}
          </div>

          <h2 className="pt-q">{'What’s happening?'}</h2>
          <p className="pt-qsub">{'Tap the event — or just class time.'}</p>

          <div className="pt-eventgrid">
            <button type="button" className="pt-eventcard pt-eventcard--quiet" onClick={() => chooseScene(null)}>
              Just class time
              {lastSceneId === '' ? <span className="pt-eventcard__hint">Last used</span> : null}
            </button>

            {scenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                className="pt-eventcard"
                onClick={() => chooseScene({ id: scene.id, name: scene.name })}
              >
                {scene.name}
                {lastSceneId === scene.id ? <span className="pt-eventcard__hint">Last used</span> : null}
              </button>
            ))}

            <button
              type="button"
              className="pt-eventcard pt-eventcard--new"
              onClick={() => {
                setAddingEvent((v) => !v);
                setNewEventName('');
              }}
            >
              ＋ New event
            </button>
          </div>

          {addingEvent ? (
            <div className="pt-lrow" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <input
                className="pt-input"
                style={{ flex: 1, minWidth: 140, height: 42 }}
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Music class"
                aria-label="New event name"
                autoFocus
                maxLength={60}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addEvent();
                }}
              />
              <button
                type="button"
                className="pt-btn pt-btn--primary pt-btn--sm"
                disabled={addBusy || !newEventName.trim()}
                onClick={addEvent}
              >
                {addBusy ? 'Adding…' : 'Add'}
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--ghost pt-btn--sm"
                onClick={() => {
                  setAddingEvent(false);
                  setNewEventName('');
                }}
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>

        {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
      </div>
    );
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
              // Back steps one screen, it does not throw the photo away — that
              // is Retake's job, and it says so on the button.
              if (eventStepAvailable) {
                setStage('event');
                return;
              }
              setStage('camera');
              clearPending();
            }}
          >
            <IconBack size={20} />
          </button>
          <div className="pt-topbar__txt">
            <h1 className="pt-topbar__title">{isPendingVideo ? 'New video' : 'New photo'}</h1>
          </div>
        </div>

        <div className="pt-scroll" style={{ paddingBottom: 12 }}>
          <div className="pt-photocard">
            <div className="pt-photocard__chip">
              <IconCamera size={14} color="#C9860B" /> Just now
            </div>
            {isPendingVideo ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={pendingPhoto.previewUrl}
                controls
                playsInline
                preload="metadata"
                style={{ width: '100%', borderRadius: 14, background: '#0d1b2a', display: 'block' }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pendingPhoto.previewUrl} alt="The photo you just took" />
            )}
          </div>

          <h2 className="pt-q">{isPendingVideo ? 'Who’s in this video?' : 'Who’s in this photo?'}</h2>
          {eventStepAvailable ? (
            <button
              type="button"
              className={`pt-chip ${selectedScene ? 'pt-chip--gold' : ''}`.trim()}
              style={{ border: 'none', cursor: 'pointer', margin: '0 2px 10px' }}
              onClick={() => setStage('event')}
            >
              {selectedScene ? selectedScene.name : 'Just class time'}
            </button>
          ) : null}
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
              clearPending();
            }}
          >
            {isPendingVideo ? 'Choose another' : 'Retake'}
          </button>
          {/* Nobody tagged is no longer a dead end. A whole-class shot is a
              real photo — it belongs to the class film, not to one child — so
              the button changes meaning rather than greying out. Blue, not
              honey: one honey fill per screen. */}
          {tagged.size === 0 ? (
            <button
              type="button"
              className="pt-btn pt-btn--blue pt-btn--lg"
              disabled={saving}
              onClick={() => savePhoto(true)}
            >
              <IconPeople size={19} />
              {saving ? 'Saving…' : isPendingVideo ? 'Save group video' : 'Save group photo'}
            </button>
          ) : (
            <button
              type="button"
              className="pt-btn pt-btn--primary pt-btn--lg"
              disabled={saving}
              onClick={() => savePhoto(false)}
            >
              <IconCheck size={19} color="#23395B" weight={3.4} />
              {saving ? 'Saving…' : `Save · ${tagged.size} tagged`}
            </button>
          )}
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
          <button
            type="button"
            className="pt-btn pt-btn--ghost pt-btn--md"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={() => {
              setMenuOpen(false);
              setSwitcherOpen(true);
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconPeople size={17} />
              Switch teacher
            </span>
            <span style={{ opacity: 0.6, fontWeight: 700 }}>{board?.teacher.name ?? 'Not set'}</span>
          </button>
          {/* v1.7 — a photo she takes here should land in her own camera roll
              too, the way it would have if she had used the camera app. On an
              iPhone that means one extra tap on the share sheet ("Save Image"),
              which is the only route the web has into Photos; everywhere else
              it saves silently. */}
          <button
            type="button"
            className="pt-btn pt-btn--ghost pt-btn--md"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={toggleSaveToDevice}
            aria-pressed={saveToDevice}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconDownload size={17} />
              Save to phone
            </span>
            <span
              className={`pt-chip ${saveToDevice ? 'pt-chip--gold' : ''}`.trim()}
              style={{ fontWeight: 800 }}
            >
              {saveToDevice ? 'On' : 'Off'}
            </span>
          </button>
          <Link href="/potato/teacher/children" className="pt-btn pt-btn--ghost pt-btn--md" style={{ textDecoration: 'none' }}>
            Children
          </Link>
          <Link href="/potato/teacher/events" className="pt-btn pt-btn--ghost pt-btn--md" style={{ textDecoration: 'none' }}>
            Events
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

      {switcherOpen ? (
        <div className="pt-sheet" role="dialog" aria-modal="true" aria-label="Switch teacher">
          <div className="pt-grab" />
          <div className="pt-sheetbar">
            <button
              type="button"
              className="pt-iconbtn pt-iconbtn--sm"
              onClick={() => setSwitcherOpen(false)}
              aria-label="Close"
            >
              <IconX size={20} />
            </button>
            <div className="pt-sheetbar__t">
              <h1>{'Who’s taking photos?'}</h1>
              <p>Everyone shares the same board — this just labels who shot each photo.</p>
            </div>
          </div>

          <div className="pt-scroll" style={{ paddingTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {STAFF_NAMES.map((name) => {
                const isCurrent = name === board?.teacher.name;
                const isBusy = switching === name;
                const disabled = switching !== null;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={disabled}
                    onClick={() => switchTeacher(name)}
                    aria-pressed={isCurrent}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      height: 116,
                      border: isCurrent ? '2px solid #C9860B' : 'none',
                      borderRadius: 'var(--pt-r-card)',
                      background: 'var(--pt-paper)',
                      boxShadow: 'var(--pt-sh-card)',
                      cursor: disabled ? 'default' : 'pointer',
                      opacity: disabled && !isBusy ? 0.5 : 1,
                      transition: '.15s',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 999,
                          display: 'grid',
                          placeItems: 'center',
                          background: tintFor(name),
                          fontFamily: 'var(--pt-disp)',
                          fontWeight: 800,
                          fontSize: 20,
                          color: 'var(--pt-ink)',
                        }}
                      >
                        {name.charAt(0)}
                      </div>
                      {isCurrent ? (
                        <div className="pt-face__badge" style={{ position: 'absolute', bottom: -2, right: -2 }}>
                          <IconCheck size={12} color="#23395B" weight={3.6} />
                        </div>
                      ) : null}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--pt-disp)',
                        fontWeight: 800,
                        fontSize: 15,
                        color: 'var(--pt-ink)',
                      }}
                    >
                      {isBusy ? 'Switching…' : name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
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
                weekStart,
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
                  weekStart,
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
            <button
              type="button"
              className="pt-btn pt-btn--primary pt-btn--md"
              onClick={handleDownloadWatching}
              disabled={downloading}
            >
              <IconDownload size={16} />
              {downloading ? 'Downloading…' : 'Download'}
            </button>
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

  /**
   * v1.7 — tapping a child opens that child's photos, ALWAYS.
   *
   * 🚨 IT IS NOT GATED ON HAVING PHOTOS ANY MORE. The old "See photos" link
   * only appeared once a child already had a shot this week, which meant the
   * one child a teacher most wants to look at — the empty one — was the one
   * child she could not tap. The page she lands on can say "none yet" and
   * offer her every other week; a dead card cannot say anything.
   */
  const photosHref = `/potato/teacher/photos/${child.id}?week=${encodeURIComponent(weekStart)}`;

  return (
    <div className={rowClass}>
      {/* The face is the biggest target on the row, so it is the primary one.
          `display:block` keeps it the 56px grid column it has always been. */}
      <Link
        href={photosHref}
        aria-label={`Open ${child.name}’s photos`}
        style={{ display: 'block', width: 56, height: 56, textDecoration: 'none' }}
      >
        <Avatar name={child.name} seed={child.id} url={child.faceUrl} empty={!child.faceUrl} />
      </Link>

      <div className="pt-row__body">
        <div className="pt-row__head">
          <h3 className="pt-row__name">
            <Link
              href={photosHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                maxWidth: '100%',
                minWidth: 0,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {child.name}
              </span>
              <IconChevron size={12} color="rgba(35,57,91,.38)" />
            </Link>
          </h3>
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

        <div style={{ marginTop: 9 }}>
          <Link
            href={photosHref}
            style={{ fontSize: 12, fontWeight: 800, color: 'rgba(35,57,91,.5)', textDecoration: 'none' }}
          >
            {isEmpty ? `See ${child.name}’s other weeks →` : `See ${child.name}’s photos →`}
          </Link>
        </div>
      </div>
    </div>
  );
}
