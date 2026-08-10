// app/montree/dashboard/capture/page.tsx
// Native-feeling capture flow: Camera opens instantly → Take photo → Tag child → Upload
// Dark forest visual treatment — all wiring intact
'use client';

import React, { useState, useEffect, useRef, Suspense, CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { ArrowLeft, Check, PartyPopper } from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import CameraCapture from '@/components/montree/media/CameraCapture';
import PhotoQueueBanner from '@/components/montree/media/PhotoQueueBanner';
import { compressImage } from '@/lib/montree/media/compression';
import { uploadVideo } from '@/lib/montree/media/upload';
import { enqueuePhoto, syncQueue } from '@/lib/montree/offline';
import {
  addTask,
  getTaskSignal,
  completeTask,
  failTask,
} from '@/lib/montree/background-task-store';
import type { MontreeChild, MontreeEvent, CapturedPhoto, CapturedVideo, CapturedMedia } from '@/lib/montree/media/types';
import DailyLanguageSix from '@/components/montree/capture/DailyLanguageSix';
import TodaysFocusStrip from '@/components/montree/focus/TodaysFocusStrip';
import { useFeatures } from '@/hooks/useFeatures';

// Tier 5 perf: EventPicker is modal-gated, code-split it.
const EventPicker = dynamic(() => import('@/components/montree/media/EventPicker'), { ssr: false });

// Dark forest tokens
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// ============================================
// TYPES
// ============================================

type FlowStep = 'camera' | 'tag-child';

// C2: sessionStorage key for the sticky selected-event pick. Session-scoped
// (not localStorage) so it clears itself when the teacher closes the tab.
const CAPTURE_EVENT_STORAGE_KEY = 'montree_capture_event';

// ============================================
// AVATAR BUTTON COMPONENT
// ============================================

function ChildAvatarButton({ child, isSelected }: { child: MontreeChild; isSelected: boolean }) {
  const [showFallback, setShowFallback] = useState(!child.photo_url);

  const wrapperStyle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontFamily: T.sans,
    fontSize: 14,
    fontWeight: 700,
    background: isSelected ? T.emerald : 'rgba(255,255,255,0.18)',
    color: isSelected ? '#06281a' : 'rgba(255,255,255,0.85)',
    transition: 'all 120ms ease',
    overflow: 'hidden',
  };

  if (!showFallback && child.photo_url) {
    return (
      <div style={wrapperStyle}>
        <img
          src={getProxyUrl(child.photo_url)}
          alt={child.name}
          onError={() => setShowFallback(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      {child.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ============================================
// LOADING FALLBACK
// ============================================

function CaptureLoading() {
  const { t } = useI18n();
  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: T.sans,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 36,
          height: 36,
          border: `4px solid ${T.emeraldDim}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'cap-spin 0.9s linear infinite',
          marginBottom: 14,
        }} />
        <p style={{ margin: 0, color: T.textSecondary, fontSize: 13 }}>
          {t('common.loading')}
        </p>
      </div>
      <style>{`@keyframes cap-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ============================================
// MAIN CONTENT COMPONENT
// ============================================

function CaptureContent() {
  const router = useRouter();
  const { t } = useI18n();
  const { isEnabled } = useFeatures();
  const searchParams = useSearchParams();

  // Pre-selected child from URL (e.g. from week view capture button)
  const preSelectedChildId = searchParams.get('child');
  const isClassMode = searchParams.get('class') === 'true';

  // Work context from URL (passed from Week view Capture button)
  const workName = searchParams.get('workName');
  const workArea = searchParams.get('area');
  const workIdFromUrl = searchParams.get('workId');

  // State
  const [step, setStep] = useState<FlowStep>('camera');
  const [children, setChildren] = useState<MontreeChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(
    preSelectedChildId ? [preSelectedChildId] : []
  );
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null);
  const [schoolId, setSchoolId] = useState<string>('');
  const [classroomId, setClassroomId] = useState<string>('');
  const [workId, setWorkId] = useState<string | null>(workIdFromUrl);
  const [selectedEvent, setSelectedEvent] = useState<MontreeEvent | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);
  // PATH B (event session) never leaves the camera, so CameraCapture has to be
  // handed back a live viewfinder after each shot. Bumping this key remounts it.
  const [cameraKey, setCameraKey] = useState(0);
  // ...but a remount also wipes CameraCapture's internal zoom, and SPEC2 §2.2
  // requires the zoom to SURVIVE consecutive shots (the teacher stands back and
  // takes several frames of the same scene). Hold the last level here and hand
  // it back to the fresh instance. A ref, not state: it must not re-render the
  // page on every pinch frame.
  const cameraZoomRef = useRef(1);
  // Class-mode race (ANALYSIS3 §4): a shot taken before the roster resolves is
  // parked here instead of enqueueing with an empty child list.
  const [pendingClassMedia, setPendingClassMedia] = useState<CapturedMedia | null>(null);

  // ============================================
  // INIT: Session + Children + Work lookup
  // ============================================

  useEffect(() => {
    const session = getSession();
    if (session) {
      if (session.school?.id) setSchoolId(session.school.id);
      if (session.classroom?.id) setClassroomId(session.classroom.id);
    }
  }, []);

  // C2: sticky event across shots. navigateAfterCapture() router.pushes after
  // EVERY saved photo, which unmounts this page and resets `selectedEvent` to
  // null — the teacher had to re-pick "Art Camp" before every single shot.
  // Persist the pick to sessionStorage (survives the per-shot remount, cleared
  // on tab close) and restore it here on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(CAPTURE_EVENT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: string; name?: string };
      if (parsed && parsed.id && parsed.name) {
        setSelectedEvent({
          id: parsed.id,
          name: parsed.name,
          school_id: '',
          classroom_id: null,
          description: null,
          event_date: '',
          event_type: '',
          created_by: null,
          created_at: '',
          updated_at: '',
        });
      }
    } catch (err) {
      console.error('[CAPTURE] Failed to restore sticky event:', err);
    }
  }, []);

  // P1-1/P1-2 (SPEC2 §1.2-D4): validate the restored sticky event against the
  // server, once, on mount.
  //  • D4 — an event deleted in another surface leaves a dead id in
  //    sessionStorage. Every subsequent shot then carries an event_id that no
  //    longer resolves, and the teacher shoots all morning into nothing while
  //    the chip cheerfully names the dead event. If the id is gone, clear both
  //    the chip and the stored key.
  //  • P1-2 — the hydration effect above can only rebuild a two-field stub
  //    (id + name) with a fabricated `event_date: ''`. When the fetch resolves,
  //    swap in the REAL row so the chip and every downstream consumer hold a
  //    truthful record.
  // Non-fatal by design: a network failure KEEPS the optimistic pick. An
  // offline teacher must never be punished by losing their event.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readStoredId = (): string | null => {
      try {
        const raw = sessionStorage.getItem(CAPTURE_EVENT_STORAGE_KEY);
        if (!raw) return null;
        return (JSON.parse(raw) as { id?: string }).id ?? null;
      } catch {
        return null;
      }
    };

    const storedId = readStoredId();
    if (!storedId) return;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/montree/events', { signal: controller.signal });
        if (!res.ok) {
          console.warn('[CAPTURE] Could not validate sticky event (HTTP', res.status, ') — keeping the pick');
          return;
        }
        const data = await res.json();
        if (controller.signal.aborted) return;

        const events: MontreeEvent[] = Array.isArray(data?.events) ? data.events : [];

        // Never clobber a pick the teacher made while this was in flight.
        if (readStoredId() !== storedId) return;

        const match = events.find(e => e.id === storedId);
        if (match) {
          setSelectedEvent(match);
          // Refresh the cached name too — the event may have been renamed.
          try {
            sessionStorage.setItem(
              CAPTURE_EVENT_STORAGE_KEY,
              JSON.stringify({ id: match.id, name: match.name })
            );
          } catch { /* non-fatal — the in-memory pick still works */ }
        } else {
          console.warn('[CAPTURE] Sticky event', storedId, 'no longer exists — clearing it');
          setSelectedEvent(null);
          try {
            sessionStorage.removeItem(CAPTURE_EVENT_STORAGE_KEY);
          } catch { /* non-fatal */ }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn('[CAPTURE] Sticky event validation failed — keeping the pick:', err);
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await fetch('/api/montree/children');
        if (!response.ok) {
          console.error('Children API error:', response.status);
          return;
        }
        const data = await response.json();
        if (data.children) setChildren(data.children);
      } catch (err) {
        console.error('Failed to fetch children:', err);
      } finally {
        setLoadingChildren(false);
      }
    };
    fetchChildren();
  }, []);

  useEffect(() => {
    if (workIdFromUrl || !workName || !classroomId) return;
    const lookupWorkId = async () => {
      try {
        const res = await fetch(`/api/montree/works/search?q=${encodeURIComponent(workName)}&classroom_id=${classroomId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.works?.length > 0) {
          const exactMatch = data.works.find((w: Record<string, unknown>) =>
            (w.name as string)?.toLowerCase() === workName.toLowerCase()
          );
          const match = exactMatch || data.works[0];
          if (match?.id) setWorkId(match.id as string);
        }
      } catch (err) {
        console.error('Failed to lookup work_id:', err);
      }
    };
    lookupWorkId();
  }, [workName, classroomId, workIdFromUrl]);

  // ============================================
  // UPLOAD + SMART CAPTURE
  // ============================================

  // ── TWO CLEAN PHOTO PATHS ───────────────────────────────────────────────
  // The child/event decision is made HERE and nowhere else, from the EXPLICIT
  // `eventForShot` argument — never from `selectedEvent` state. Every caller
  // states its intent, so a late-arriving/stale event pick can never silently
  // convert a child save (or the reverse).
  //
  //   eventForShot != null → PATH B (event photo): ZERO child ids, event_id set,
  //     lands in the event bucket, permanently outside the AI/Wrap-Up pipeline.
  //   eventForShot == null → PATH A (child photo): child ids only, NO event_id
  //     under any circumstance, eligible for AI Wrap Up.
  // ─────────────────────────────────────────────────────────────────────────
  const doUploadAndAnalyze = async (
    media: CapturedMedia,
    childIds: string[],
    eventForShot: MontreeEvent | null,
  ) => {
    const isEventShot = !!eventForShot;
    // Mutual exclusivity, enforcement point #1: an event shot carries no
    // children at all — not the class roster, not a preselected child.
    const idsToTag = isEventShot ? [] : (isClassMode ? children.map(c => c.id) : childIds);
    const isVideo = media.type === 'video';
    const label = isVideo ? 'Video' : 'Photo';
    // Name the event in the save confirmation. "Photo saved!" left teachers
    // unable to tell whether the shot actually landed on the event they picked.
    // ZERO new i18n keys (SPEC2 hard rule): the event name is appended to the
    // EXISTING saved toast rather than introducing a `capture.savedToEvent`
    // string that no locale file defines (that renders the raw key).
    const baseSaved = t('offline.photoSaved') || `${label} saved!`;
    const savedMessage = isEventShot
      ? `${baseSaved} · ${eventForShot!.name}`
      : baseSaved;

    // Guard: school_id is required for upload — if missing, session is broken
    if (!schoolId) {
      console.error('Upload failed: no school_id in session');
      toast.error('Session error — please log in again', { duration: 5000 });
      router.push('/montree/login');
      return;
    }

    if (isVideo) {
      const videoBlob = 'blob' in (media.data as CapturedVideo)
        ? (media.data as CapturedVideo).blob
        : media.data as Blob;

      toast.success(savedMessage, { duration: 2000 });
      finishShot(isEventShot, childIds);

      const taskId = addTask({
        type: 'video_upload',
        label: t('bgTask.uploadingVideo'),
      });

      const signal = getTaskSignal(taskId);

      (async () => {
        try {
          const result = await uploadVideo(media.data as CapturedVideo, {
            school_id: schoolId,
            classroom_id: classroomId || undefined,
            child_id: idsToTag.length === 1 ? idsToTag[0] : undefined,
            child_ids: idsToTag.length > 1 ? idsToTag : undefined,
            is_class_photo: isEventShot ? false : isClassMode,
            work_id: workId || undefined,
            caption: workName || undefined,
            tags: workArea ? [workArea] : undefined,
            // Enforcement point #2: event_id only ever rides along on a PATH B
            // shot, and PATH B has already emptied idsToTag above.
            event_id: isEventShot ? eventForShot!.id : undefined,
          });

          if (signal?.aborted) return;

          if (result.success) {
            completeTask(taskId, { message: `✓ ${t('bgTask.videoComplete')}` });
          } else {
            failTask(taskId, result.error || t('bgTask.videoFailed'));
          }
        } catch (err) {
          if (signal?.aborted) return;
          console.error('Video upload error:', err);
          failTask(taskId, t('bgTask.videoFailed'));
        }
      })();

      return;
    }

    const photo = media.data as CapturedPhoto;
    let compressedBlob: Blob;
    let compressedWidth = photo.width;
    let compressedHeight = photo.height;

    console.log('[CAPTURE] Starting compression. Blob size:', photo.blob.size, 'type:', photo.blob.type, 'dimensions:', photo.width, 'x', photo.height);

    try {
      const compressed = await Promise.race([
        compressImage(photo.blob),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Compression timed out after 10s')), 10_000)
        ),
      ]);
      compressedBlob = compressed.blob;
      compressedWidth = compressed.width;
      compressedHeight = compressed.height;
      console.log('[CAPTURE] Compression complete. New size:', compressedBlob.size, 'dimensions:', compressedWidth, 'x', compressedHeight);
    } catch (err) {
      console.error('[CAPTURE] Compression failed, using original:', err);
      compressedBlob = photo.blob;
    }

    // P1-3: the event id is the whole point of the "photo never landed on the
    // event" investigation — log what we actually enqueue, and the queue entry
    // id it lands under, so a device log can be walked end to end.
    console.log('[CAPTURE] Enqueueing photo. path:', isEventShot ? 'EVENT' : 'CHILD', 'child_id:', idsToTag[0] || '(none)', 'school_id:', schoolId, 'event_id:', eventForShot?.id ?? '(none)', 'blob size:', compressedBlob.size);
    try {
      const entry = await enqueuePhoto(compressedBlob, {
        child_id: idsToTag[0] || '',
        child_ids: idsToTag.length > 1 ? idsToTag : undefined,
        classroom_id: classroomId,
        school_id: schoolId,
        work_id: workId || undefined,
        work_name: workName || undefined,
        work_area: workArea || undefined,
        // Enforcement point #2 (photo queue): a PATH A entry NEVER carries
        // event_id, even if a sticky event pick lingers in state/sessionStorage.
        is_class_photo: isEventShot ? false : isClassMode,
        event_id: isEventShot ? eventForShot!.id : undefined,
        width: compressedWidth,
        height: compressedHeight,
      });
      console.log('[CAPTURE] Enqueued as queue entry:', entry.id, 'event_id:', entry.event_id ?? '(none)');
    } catch (err) {
      console.error('Failed to enqueue photo:', err);
      // DIAGNOSABILITY: only show "queue full" when the queue is actually full.
      // This catch used to blanket-label EVERY enqueue failure (IndexedDB
      // unavailable, storage quota, private browsing...) as "Photo queue full",
      // which sent debugging in the wrong direction. Surface the real error.
      // Guard against a bare null/undefined/object err rendering as the literal
      // string "null"/"undefined"/"[object Object]" in the toast. queue-store.ts
      // now always rejects a real Error with a useful message, so this fallback
      // should rarely fire — but it must never surface raw "null" again.
      const rawMsg = err instanceof Error ? err.message : (err == null ? '' : String(err));
      const msg = rawMsg && rawMsg !== 'null' && rawMsg !== 'undefined' && rawMsg !== '[object Object]'
        ? rawMsg
        : 'Unknown error — please try again or check device storage';
      if (/queue is full/i.test(msg)) {
        toast.error(t('offline.queueFull') || 'Photo queue full', { duration: 5000 });
      } else {
        toast.error(`Photo could not be saved: ${msg}`, { duration: 8000 });
      }
      return;
    }

    console.log('[CAPTURE] Photo enqueued successfully, showing toast and navigating');
    toast.success(savedMessage, { duration: 2000 });
    finishShot(isEventShot, childIds);

    syncQueue().catch(e => console.error('[CAPTURE] Background sync failed:', e));
  };

  const navigateAfterCapture = (childIds: string[]) => {
    if (preSelectedChildId) {
      router.push(`/montree/dashboard/${preSelectedChildId}`);
    } else if (childIds.length === 1) {
      router.push(`/montree/dashboard/${childIds[0]}`);
    } else {
      router.push('/montree/dashboard');
    }
  };

  // PATH B is a shooting session: the toast IS the whole wrap-up and the
  // teacher goes straight back to the viewfinder for the next shot. PATH A
  // keeps the existing navigate-to-the-child behaviour untouched.
  const finishShot = (isEventShot: boolean, childIds: string[]) => {
    if (!isEventShot) {
      navigateAfterCapture(childIds);
      return;
    }
    setCapturedMedia(null);
    setSelectedChildIds(preSelectedChildId ? [preSelectedChildId] : []);
    setStep('camera');
    // CameraCapture sits on its captured-preview state after onCapture (web)
    // and has already dismissed the OS sheet (native). Remounting it restarts
    // a live camera immediately.
    setCameraKey(k => k + 1);
  };

  // Class-mode race guard (ANALYSIS3 §4): fire the parked shot the moment the
  // roster resolves. If the roster fetch failed, `children` stays empty and the
  // photo is still saved (untagged) rather than lost.
  useEffect(() => {
    if (!pendingClassMedia || loadingChildren) return;
    const media = pendingClassMedia;
    setPendingClassMedia(null);
    doUploadAndAnalyze(media, [], selectedEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingClassMedia, loadingChildren]);

  // ============================================
  // CAMERA HANDLERS
  // ============================================

  const handleMediaCapture = (media: CapturedMedia) => {
    console.log('[CAPTURE] handleMediaCapture called. type:', media.type, 'preSelectedChildId:', preSelectedChildId, 'isClassMode:', isClassMode, 'children:', children.length);
    // PATH B short-circuit. MUST be first so EVERY capture entry path
    // (preselected child, class mode, single child, multi-child) honours the
    // event session: while the sticky chip is set there is no child tagging at
    // all — the shot saves straight to the event bucket.
    if (selectedEvent) {
      doUploadAndAnalyze(media, [], selectedEvent);
      return;
    }

    if (preSelectedChildId) {
      doUploadAndAnalyze(media, [preSelectedChildId], null);
      return;
    }

    // Class mode tags the WHOLE roster. Taken before `fetchChildren` resolved,
    // the first shot of a class session used to enqueue with zero children
    // (ANALYSIS3 §4). Park it and let the effect above fire it once loaded.
    if (isClassMode) {
      if (loadingChildren) {
        setPendingClassMedia(media);
        return;
      }
      doUploadAndAnalyze(media, [], null);
      return;
    }

    if (loadingChildren) {
      setCapturedMedia(media);
      setStep('tag-child');
      return;
    }

    if (children.length === 1) {
      doUploadAndAnalyze(media, [children[0].id], null);
      return;
    }

    setCapturedMedia(media);
    setStep('tag-child');
  };

  // Safe exit: router.back() is a silent no-op when there's no history entry
  // (opened in a new tab, deep link, PWA cold-start, or after the error screen).
  // That left the fullscreen camera stuck with a dead Cancel button. Fall back to
  // a known destination if back() doesn't actually navigate away.
  const safeExit = () => {
    const before = window.location.pathname;
    const fallback = preSelectedChildId
      ? `/montree/dashboard/${preSelectedChildId}`
      : '/montree/dashboard';
    router.back();
    window.setTimeout(() => {
      if (window.location.pathname === before) {
        router.push(fallback);
      }
    }, 350);
  };

  const handleCameraCancel = () => {
    safeExit();
  };

  // ============================================
  // TAG CHILD HANDLERS
  // ============================================

  // C2: writes through to sessionStorage so the pick survives the per-shot
  // remount. "No event" (EventPicker's onSelect(null)) clears the key.
  const handleEventSelect = (event: MontreeEvent | null) => {
    setSelectedEvent(event);
    if (typeof window !== 'undefined') {
      try {
        if (event) {
          sessionStorage.setItem(CAPTURE_EVENT_STORAGE_KEY, JSON.stringify({ id: event.id, name: event.name }));
        } else {
          sessionStorage.removeItem(CAPTURE_EVENT_STORAGE_KEY);
        }
      } catch (err) {
        console.error('[CAPTURE] Failed to persist sticky event:', err);
      }
    }

    // "Event INSTEAD of child": picking an event from the tag-child step is not
    // a modifier on a child save — it converts the pending shot into an event
    // photo and drops the tagging step entirely. The event is passed explicitly
    // because `selectedEvent` has not re-rendered yet in this tick.
    if (event && step === 'tag-child' && capturedMedia) {
      setShowEventPicker(false);
      doUploadAndAnalyze(capturedMedia, [], event);
    }
  };

  const toggleChild = (childId: string) => {
    setSelectedChildIds(prev =>
      prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  // Enforcement point #3: saves that come out of the tag-child step are PATH A
  // by definition — `null` is passed literally so no lingering/late sticky event
  // pick can stamp event_id onto a child-tagged photo.
  const handleSaveWithTags = () => {
    if (!capturedMedia || selectedChildIds.length === 0) return;
    doUploadAndAnalyze(capturedMedia, selectedChildIds, null);
  };

  const handleSkipTagging = () => {
    if (!capturedMedia) return;
    doUploadAndAnalyze(capturedMedia, [], null);
  };

  // ============================================
  // RENDER
  // ============================================

  // Step 1: Camera (opens immediately)
  if (step === 'camera') {
    return (
      <>
        <Toaster position="top-center" />
        {/* C3: event selector reachable from the camera step itself. The
            preselected-child / class-mode / single-child flows call
            doUploadAndAnalyze directly from handleMediaCapture and never
            reach the tag-child step, so without this chip there was no way
            to attach an event on those paths at all. `pointerEvents: none`
            on the row keeps the rest of the camera surface (and the shutter)
            fully tappable — only the chip itself is interactive. */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            // 🚨 order matters: the shorthand must come FIRST or it wipes the
            // safe-area inset and the chip lands under the notch.
            padding: '12px',
            paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
            display: 'flex',
            justifyContent: 'flex-start',
            pointerEvents: 'none',
          }}
        >
          <button
            onClick={() => setShowEventPicker(true)}
            className={`btn btn-sm btn-pill ${selectedEvent ? 'btn-gold' : 'btn-secondary'}`}
            style={{
              pointerEvents: 'auto',
              // leave the top-RIGHT clear: CameraCapture's own back/close
              // button sits at right:16 (44px wide) inside a lower stacking
              // context, so a long event name would swallow its taps.
              maxWidth: 'calc(100vw - 96px)',
            }}
          >
            <PartyPopper size={13} strokeWidth={1.75} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedEvent
                ? t('capture.eventBanner').replace('{eventName}', selectedEvent.name)
                : t('events.selectEvent')}
            </span>
          </button>
        </div>

        {/* P1: photos that exhaust their 5 upload retries become
            'permanent_failure' — syncQueue() never retries those, and until now
            NOTHING in the capture flow said so, which is how a morning's photos
            died silently. PhotoQueueBanner shows pending/failed counts and its
            "Retry all" covers permanent_failure entries. It renders null on an
            empty queue, so mounting it unconditionally is free.
            Position: a band UNDER the event chip — it never reaches the
            shutter, the mode toggle, the album/cancel row (all bottom in
            portrait) and the landscape rule keeps it clear of CameraCapture's
            140px right-edge control rail. Hidden while the EventPicker modal is
            open (that overlay is z-50; this band is above it). */}
        <style
          dangerouslySetInnerHTML={{
            __html: `.capture-queue-band{position:fixed;left:0;right:0;top:calc(64px + env(safe-area-inset-top, 0px));z-index:60}@media (orientation: landscape){.capture-queue-band{right:148px}}`,
          }}
        />
        {!showEventPicker && (
          <div className="capture-queue-band">
            <PhotoQueueBanner />
          </div>
        )}

        <CameraCapture
          key={cameraKey}
          onCapture={handleMediaCapture}
          onCancel={handleCameraCancel}
          allowVideo={true}
          initialZoom={cameraZoomRef.current}
          onZoomChange={(z) => { cameraZoomRef.current = z; }}
        />
        {showEventPicker && (
          <EventPicker
            schoolId={schoolId}
            selectedEventId={selectedEvent?.id || null}
            onSelect={handleEventSelect}
            onClose={() => setShowEventPicker(false)}
          />
        )}
      </>
    );
  }

  // Step 2: Tag child(ren) after photo is taken
  const photoPreview = capturedMedia?.type === 'photo'
    ? (capturedMedia.data as CapturedPhoto).dataUrl
    : null;

  const hasChildren = children.length > 0;
  const allSelected = selectedChildIds.length === children.length && hasChildren;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      background: T.bg,
      backgroundImage: T.glow,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      <Toaster position="top-center" />

      {/* Photo preview as background */}
      {photoPreview && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}>
          <img
            src={photoPreview}
            alt="Captured"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.18,
            }}
          />
          {/* Vignette overlay so glass surfaces stay legible over preview */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(10,26,15,0.55), rgba(10,26,15,0.85))',
          }} />
        </div>
      )}

      {/* NOTE: the "Capturing for: <event>" banner used to live here. It can no
          longer be true on this step — reaching the tag-child step means the shot
          is a CHILD photo (an active event session short-circuits straight to an
          event save in handleMediaCapture), so a banner claiming otherwise was
          the exact ambiguity this round removes. The "Select event" affordance
          below stays, and now means "save this shot to an event INSTEAD of
          tagging children". */}

      {/* Header */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '40px 16px 8px',
        paddingTop: 'calc(40px + env(safe-area-inset-top, 0px))',
      }}>
        <button
          onClick={safeExit}
          aria-label="Cancel"
          className="btn btn-secondary btn-icon btn-md"
          style={{ position: 'absolute', left: 12, top: 38 }}
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </button>
        <h2 style={{
          margin: 0,
          fontFamily: T.serif,
          fontSize: 20,
          fontWeight: 500,
          color: T.textPrimary,
          letterSpacing: -0.2,
          textAlign: 'center',
        }}>
          {t('capture.whoIsThis')}
        </h2>
        <p style={{
          margin: '4px 0 0',
          fontFamily: T.sans,
          fontSize: 12,
          color: T.textMuted,
          textAlign: 'center',
        }}>
          {t('capture.tagChildHint')}
        </p>
      </div>

      {/* P1: same queue banner on the tagging step — the surface a teacher
          lands on right after a shot. Normal flow (below the event banner and
          the header, above Select All), so it can't cover any control;
          relative + zIndex 10 matches its siblings so it sits above the dimmed
          photo-preview backdrop. Self-hides when the queue is empty. */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <PhotoQueueBanner />
      </div>

      {/* Select All + Event picker row */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button
          onClick={() => {
            if (selectedChildIds.length === children.length) {
              setSelectedChildIds([]);
            } else {
              setSelectedChildIds(children.map(c => c.id));
            }
          }}
          className="btn btn-ghost btn-sm"
        >
          {allSelected ? t('capture.deselectAll') : t('capture.selectAll')}
        </button>
        {/* "Event INSTEAD of child": picking an event here saves THIS shot to
            the event bucket and skips tagging altogether (handleEventSelect).
            Always available — it is the escape hatch from child mode, so it must
            not be conditioned on the (now always-null-here) sticky event. */}
        <button
          onClick={() => setShowEventPicker(true)}
          className="btn btn-ghost btn-sm"
        >
          <PartyPopper size={13} strokeWidth={1.75} />
          {t('events.selectEvent')}
        </button>
      </div>

      {/* Today's Focus strip */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '8px 12px 0',
      }}>
        <TodaysFocusStrip compact />
      </div>

      {/* Daily Language 6 */}
      {isEnabled('daily_language_6') && (
        <DailyLanguageSix
          selectedChildIds={selectedChildIds}
          onToggleChild={toggleChild}
        />
      )}

      {/* Child grid */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        overflow: 'hidden',
        padding: '4px 12px',
      }}>
        {loadingChildren ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}>
            <div style={{
              width: 32,
              height: 32,
              border: `4px solid ${T.emeraldDim}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'cap-spin 0.9s linear infinite',
            }} />
            <style>{`@keyframes cap-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (() => {
          const count = children.length;
          const cols = count <= 24 ? 4 : 5;
          const rows = Math.ceil(count / cols);
          return (
            <div style={{
              height: '100%',
              display: 'grid',
              gap: 8,
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}>
              {children.map(child => {
                const isSelected = selectedChildIds.includes(child.id);
                return (
                  <button
                    key={child.id}
                    onClick={() => toggleChild(child.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 14,
                      background: isSelected
                        ? 'rgba(52,211,153,0.20)'
                        : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${isSelected ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.10)'}`,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      color: isSelected ? T.emerald : T.textSecondary,
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                      minHeight: 0,
                      padding: 4,
                    }}
                  >
                    <ChildAvatarButton child={child} isSelected={isSelected} />
                    <span style={{
                      marginTop: 4,
                      fontFamily: T.sans,
                      fontSize: 12,
                      fontWeight: 500,
                      color: isSelected ? T.emerald : 'rgba(255,255,255,0.70)',
                      lineHeight: 1.2,
                      textAlign: 'center',
                    }}>
                      {child.name}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Bottom actions */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '8px 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <button
          onClick={handleSaveWithTags}
          disabled={selectedChildIds.length === 0}
          className={`btn btn-lg btn-full ${selectedChildIds.length > 0 ? 'btn-primary' : 'btn-secondary'}`}
        >
          {selectedChildIds.length === 0 ? (
            <>{t('capture.selectChild')}</>
          ) : (
            <>
              <Check size={16} strokeWidth={2.5} />
              {selectedChildIds.length === 1
                ? t('capture.save')
                : t('capture.saveForCount').replace('{count}', String(selectedChildIds.length))}
            </>
          )}
        </button>
        <button
          onClick={handleSkipTagging}
          className="btn btn-ghost btn-sm btn-full"
        >
          {t('capture.skipTagging')}
        </button>
      </div>

      {/* Event Picker Modal */}
      {showEventPicker && (
        <EventPicker
          schoolId={schoolId}
          selectedEventId={selectedEvent?.id || null}
          onSelect={handleEventSelect}
          onClose={() => setShowEventPicker(false)}
        />
      )}

    </div>
  );
}

// ============================================
// PAGE EXPORT WITH SUSPENSE
// ============================================

export default function CapturePage() {
  return (
    <Suspense fallback={<CaptureLoading />}>
      <CaptureContent />
    </Suspense>
  );
}
