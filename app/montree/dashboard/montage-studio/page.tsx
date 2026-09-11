// app/montree/dashboard/montage-studio/page.tsx
//
// Montage Studio — the HAND-CURATED montage (migration 355).
//
// Montage Manager (/montree/dashboard/montage-tracker) answers "who still
// needs photos?" and builds a film from everything in a range. This page
// answers the other half: "I know exactly which eleven moments I want, in
// this order, with that clip trimmed and that photo cropped." It is a
// deliberate, slower, WYSIWYG tool and it does NOT replace the Manager.
//
//   Scope        child / class / event + Today / This week / This month / All
//   Filmstrip    every photo AND clip in the range, mixed by captured_at
//   Preview      one item BIG inside the 9:16 montage frame —
//                  video → play/pause + an in/out trim
//                  photo → a draggable 9:16 crop box + "Apply crop"
//   Tray         the kept items in ORDER (drag on desktop, ▲▼ on touch)
//   Save         POST /api/montree/montage with media_ids in tray order and
//                media_edits carrying the trims.
//
// 🚨 THE ORDER IS THE TEACHER'S. media_ids is posted in tray order and the
// worker renders it with ORDER BY array_position (montage-worker/src/db.ts).
// Nothing here may re-sort the tray behind her back.
//
// 🚨 A PHOTO CROP IS APPLIED IMMEDIATELY, server-side, through the existing
// /api/montree/media/crop (replace_original) — exactly as the Manager's
// lightbox does. It repoints montree_media.storage_path, so every surface
// (and the film) sees the crop with zero worker change. A VIDEO trim is NOT
// destructive: it travels on the job as media_edits and the original clip is
// untouched.
//
// 🚨 A clip with no playback_path cannot be rendered (the worker will not
// feed ffmpeg a VP9/Opus WebM). Those are shown greyed and are NOT selectable
// until "Convert now" or the cron has produced the H.264 copy.
//
// 🚨 TIMEZONE: every date is the BROWSER's local calendar date, via
// lib/montree/montage-tracker/weekRange — never toISOString, which would hand
// Asia/Shanghai the previous day. Same rule as Montage Manager.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import {
  getProxyUrl,
  getThumbnailUrl,
  getVideoProxyUrl,
  formatMediaDuration,
} from '@/lib/montree/media/proxy-url';
import {
  currentMonthRange,
  currentWeekRange,
  formatLocalDate,
  localDate,
  todayRange,
  type DateRange,
} from '@/lib/montree/montage-tracker/weekRange';
import type { TrackerChild, TrackerClassroom } from '@/lib/montree/montage-tracker/coverage';
// The iPhone-Photos clip trimmer: filmstrip + yellow window + playhead.
// It owns no state — `trim` in, `onChange` out, so Save and the worker
// mapping below are exactly as they were.
import ClipTrimmer from '@/components/montree/montage/ClipTrimmer';

// Dark-forest tokens — inline per component, house style (see Montage Manager).
const T = {
  emerald: '#34d399',
  emeraldBorder: 'rgba(52,211,153,0.55)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  amber: '#f59e0b',
  amberBorder: 'rgba(245,158,11,0.45)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

type ScopePath = 'child' | 'class' | 'event';
type RangePreset = 'day' | 'week' | 'month' | 'all';

/** Mirrors MIN_SCOPED_PHOTOS / MIN_EVENT_PHOTOS in lib/.../montage/enqueue.ts. */
const MIN_ITEMS_SCOPED = 8;
const MIN_ITEMS_EVENT = 4;
/** The montage's own aspect ratio — the preview frame and every crop box. */
const FRAME_RATIO = 9 / 16;
/** Ken Burns photo segment length, for the runtime estimate only. */
const PHOTO_SECONDS = 3;
/** Default trim window for a clip the teacher has not touched. */
const DEFAULT_CLIP_SECONDS = 8;
/** Mirrors MAX_EDIT_SECONDS in lib/montree/montage/media-edits.ts. */
const MAX_CLIP_SECONDS = 30;
/** Mirrors MAX_PER_CALL in app/api/montree/media/transcode-now/route.ts. */
const CONVERT_BATCH = 5;
/**
 * 🚨 montreeApi aborts at 30s by default — five sequential ffmpeg passes take
 * MINUTES, so the browser was killing the request before the server could
 * answer (and, having disconnected, it looked like the POST never happened).
 * Matches the route's `maxDuration = 300`, plus slack for the response.
 */
const CONVERT_TIMEOUT_MS = 320_000;
/** Belt and braces: the loop can never run away, even if the feed lies. */
const CONVERT_MAX_ROUNDS = 40;

interface StudioItem {
  id: string;
  storage_path: string;
  captured_at: string | null;
  child_id: string | null;
  media_type?: string | null;
  thumbnail_path?: string | null;
  playback_path?: string | null;
  duration_seconds?: number | null;
  /** 'pending' | 'done' | 'failed' | null — null on a clip never picked up. */
  transcode_status?: string | null;
}

interface EventOption {
  id: string;
  name: string;
  event_date: string | null;
}

interface Trim {
  in: number;
  out: number;
}

function isVideo(item: StudioItem): boolean {
  return item.media_type === 'video';
}

/**
 * A clip with no transcoded copy: shown, but never selectable — and the ONE
 * predicate behind the banner count, the button label and the POST body.
 * 🚨 transcode_status === 'failed' is INCLUDED: a failed pass is retryable
 * (the endpoint's own scan takes null/pending/failed), it is just labelled
 * differently in the grid.
 */
function isConverting(item: StudioItem): boolean {
  return isVideo(item) && !item.playback_path;
}

/** A clip whose last ffmpeg pass errored — convertible, but shown as a retry. */
function isFailedConvert(item: StudioItem): boolean {
  return isConverting(item) && item.transcode_status === 'failed';
}

/** Source duration we trust enough to seed a trim window. */
function sourceSeconds(item: StudioItem): number {
  const n = Number(item.duration_seconds);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CLIP_SECONDS;
}

function defaultTrim(item: StudioItem): Trim {
  return { in: 0, out: Math.min(sourceSeconds(item), DEFAULT_CLIP_SECONDS) };
}

/** The still image for a row — a video's poster, never its movie file. */
function thumbFor(item: StudioItem, override: string | undefined, width: number): string {
  if (override) return override;
  if (isVideo(item)) return item.thumbnail_path ? getThumbnailUrl(item.thumbnail_path, width) : '';
  return getThumbnailUrl(item.storage_path, width);
}

// =========================================================================
// PhotoCropper — a 9:16 box the teacher drags over the photo
// =========================================================================
// Pointer events (not mouse events) so one code path serves finger, pen and
// mouse; `touch-action: none` on the draggable surfaces is what stops iOS
// Safari scrolling the page instead of moving the box.
//
// The box lives in DISPLAYED pixels relative to the rendered <img>. It is
// converted to SOURCE pixels only at the moment "Apply crop" is pressed,
// using naturalWidth/naturalHeight — the same coordinate space
// /api/montree/media/crop expects.

interface Box {
  x: number;
  y: number;
  w: number;
}

function PhotoCropper({
  src,
  onApply,
  applying,
  applyLabel,
  hint,
}: {
  src: string;
  onApply: (crop: { x: number; y: number; width: number; height: number }) => void;
  applying: boolean;
  applyLabel: string;
  hint: string;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const drag = useRef<{ mode: 'move' | 'resize'; px: number; py: number; box: Box } | null>(null);

  const boxH = (w: number) => w / FRAME_RATIO;

  /** Re-seed the box whenever the rendered image changes size (or photo). */
  const measure = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    setSize({ w: rect.width, h: rect.height });
    setBox((prev) => {
      if (prev) return prev;
      // Start with the tallest 9:16 box that fits, centred.
      const w = Math.min(rect.width, rect.height * FRAME_RATIO);
      return { x: (rect.width - w) / 2, y: (rect.height - boxH(w)) / 2, w };
    });
  }, []);

  // NOTE: there is deliberately no "reset the box when src changes" effect —
  // the parent mounts this component with key={item.id}, so a new photo is a
  // fresh instance with a fresh box. (An effect here would be a cascading
  // setState, and would also race the <img> onLoad that seeds the box.)

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const clampBox = useCallback((next: Box, bounds: { w: number; h: number }): Box => {
    const maxW = Math.min(bounds.w, bounds.h * FRAME_RATIO);
    const w = Math.max(40, Math.min(next.w, maxW));
    const h = boxH(w);
    return {
      w,
      x: Math.max(0, Math.min(next.x, bounds.w - w)),
      y: Math.max(0, Math.min(next.y, bounds.h - h)),
    };
  }, []);

  const onPointerDown = (mode: 'move' | 'resize') => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, px: e.clientX, py: e.clientY, box };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !size) return;
    e.preventDefault();
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    setBox(
      clampBox(
        d.mode === 'move'
          ? { ...d.box, x: d.box.x + dx, y: d.box.y + dy }
          // Resize from the bottom-right corner: the larger of the two drags
          // wins, so a diagonal drag feels natural and the ratio stays locked.
          : { ...d.box, w: d.box.w + Math.max(dx, dy * FRAME_RATIO) },
        size
      )
    );
  };

  const endDrag = () => {
    drag.current = null;
  };

  const apply = () => {
    const el = imgRef.current;
    if (!el || !box || !size) return;
    const scaleX = (el.naturalWidth || size.w) / size.w;
    const scaleY = (el.naturalHeight || size.h) / size.h;
    onApply({
      x: Math.round(box.x * scaleX),
      y: Math.round(box.y * scaleY),
      width: Math.round(box.w * scaleX),
      height: Math.round(boxH(box.w) * scaleY),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div
        style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', touchAction: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt=""
          onLoad={measure}
          draggable={false}
          style={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: '52vh',
            borderRadius: 10,
            userSelect: 'none',
          }}
        />
        {box && size && (
          <div
            onPointerDown={onPointerDown('move')}
            style={{
              position: 'absolute',
              left: box.x,
              top: box.y,
              width: box.w,
              height: boxH(box.w),
              border: `2px solid ${T.emerald}`,
              borderRadius: 4,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              cursor: 'move',
              touchAction: 'none',
            }}
          >
            <div
              onPointerDown={onPointerDown('resize')}
              aria-hidden
              style={{
                position: 'absolute',
                right: -13,
                bottom: -13,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: T.emerald,
                border: '2px solid #0a1a0f',
                cursor: 'nwse-resize',
                touchAction: 'none',
              }}
            />
          </div>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: T.textMuted, textAlign: 'center' }}>{hint}</div>
      <button
        type="button"
        onClick={apply}
        disabled={applying || !box}
        className="btn btn-primary btn-sm btn-pill"
      >
        ✂ {applyLabel}
      </button>
    </div>
  );
}

// =========================================================================
// The page
// =========================================================================

/** Saved work is keyed on the scope, so two children never share a draft. */
const DRAFT_PREFIX = 'montree.montageStudio.draft.';

interface Draft {
  selected: string[];
  trims: Record<string, Trim>;
}

export default function MontageStudioPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [ready, setReady] = useState(false);
  const [sessionClassroomId, setSessionClassroomId] = useState<string | null>(null);

  // --- scope -------------------------------------------------------------
  const [path, setPath] = useState<ScopePath>('child');
  const [preset, setPreset] = useState<RangePreset>('week');
  const [childId, setChildId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [eventId, setEventId] = useState('');
  const [classrooms, setClassrooms] = useState<TrackerClassroom[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);

  // --- feed --------------------------------------------------------------
  const [items, setItems] = useState<StudioItem[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState(false);

  // --- selection + edits -------------------------------------------------
  // `selected` is an ORDERED list — it IS the film's running order.
  const [selected, setSelected] = useState<string[]>([]);
  const [trims, setTrims] = useState<Record<string, Trim>>({});
  const [cropUrls, setCropUrls] = useState<Record<string, string>>({});
  const [savingCrop, setSavingCrop] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // --- conversion + save -------------------------------------------------
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<{ done: number; total: number } | null>(null);
  /** Shown IN the banner — never an alert(), which iOS Safari eats silently. */
  const [convertError, setConvertError] = useState<string | null>(null);
  /** Guards the loop against a double-click racing the `converting` state. */
  const convertRunning = useRef(false);
  /** Scope key the auto-start already fired for, so it runs once per scope. */
  const autoConverted = useRef<string>('');
  const [saving, setSaving] = useState(false);
  const [jobStatus, setJobStatus] = useState<{ id: string; status: string } | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session?.school?.id) {
      router.push('/montree/login');
      return;
    }
    const room = session.classroom?.id || null;
    setSessionClassroomId(room);
    if (room) setClassroomId(room);
    setReady(true);
  }, [router]);

  // --- children / classrooms (same source the Manager's boards use) ------
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const range = todayRange();
        const res = await montreeApi(
          `/api/montree/montage-tracker/coverage?date_start=${range.start}&date_end=${range.end}&mode=daily`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.classrooms)) {
          setClassrooms(data.classrooms as TrackerClassroom[]);
        }
      } catch (err) {
        console.error('[MontageStudio] roster load failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [ready]);

  useEffect(() => {
    if (!ready || path !== 'event' || events.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await montreeApi('/api/montree/events');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.events)) setEvents(data.events as EventOption[]);
      } catch (err) {
        console.error('[MontageStudio] events load failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, path, events.length]);

  const allChildren = useMemo(() => {
    const out: Array<TrackerChild & { classroomName: string }> = [];
    for (const room of classrooms) {
      for (const c of room.children) out.push({ ...c, classroomName: room.name });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [classrooms]);

  // --- range -------------------------------------------------------------
  const range: DateRange | null = useMemo(() => {
    if (preset === 'all') return null;
    if (preset === 'day') return todayRange();
    if (preset === 'week') return currentWeekRange();
    return currentMonthRange();
  }, [preset]);

  const scopeId = path === 'child' ? childId : path === 'event' ? eventId : classroomId;
  const scopeChosen = !!scopeId;
  const minItems = path === 'event' ? MIN_ITEMS_EVENT : MIN_ITEMS_SCOPED;

  /** Everything that changes the feed AND the draft bucket. */
  const scopeKey = useMemo(() => {
    if (!scopeChosen) return '';
    if (path === 'event') return `event:${eventId}`;
    return `${path}:${scopeId}:${preset}`;
  }, [path, eventId, scopeId, preset, scopeChosen]);

  // --- the mixed feed ----------------------------------------------------
  /** The one place the feed's query string is built (initial load AND reload). */
  const feedParams = useCallback((): string => {
    const params = new URLSearchParams();
    if (path === 'event') {
      params.set('scope', 'event');
      params.set('event_id', eventId);
    } else if (path === 'child') {
      params.set('scope', 'child');
      params.set('child_id', childId);
    } else {
      params.set('scope', 'classroom');
      params.set('classroom_id', classroomId);
    }
    // 'all' (and every event) sends no bounds — all-time / the whole event.
    if (path !== 'event' && preset !== 'all' && range) {
      params.set('start', range.start);
      params.set('end', range.end);
    }
    return params.toString();
  }, [path, eventId, childId, classroomId, preset, range]);

  /**
   * Re-read the feed mid-session and hand the rows back, so the convert loop
   * can recompute what is still pending from the SERVER's truth rather than
   * from its own bookkeeping. Returns null when the read failed.
   */
  const reloadFeed = useCallback(async (): Promise<StudioItem[] | null> => {
    if (!scopeKey) return null;
    try {
      const res = await montreeApi(`/api/montree/montage-tracker/media?${feedParams()}`);
      if (!res.ok) return null;
      const data = await res.json();
      const rows = Array.isArray(data?.photos) ? (data.photos as StudioItem[]) : [];
      rows.sort((a, b) => (a.captured_at || '').localeCompare(b.captured_at || ''));
      setItems(rows);
      return rows;
    } catch {
      return null; // the feed simply stays as it was
    }
  }, [scopeKey, feedParams]);

  useEffect(() => {
    if (!ready || !scopeKey) {
      setItems([]);
      setTotal(0);
      setTruncated(false);
      return;
    }
    let cancelled = false;
    setLoadingItems(true);
    setItemsError(false);

    const query = feedParams();

    (async () => {
      try {
        const res = await montreeApi(`/api/montree/montage-tracker/media?${query}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const rows = Array.isArray(data?.photos) ? (data.photos as StudioItem[]) : [];
        // Date order is the STARTING order of the feed — the tray is where she
        // rearranges it, and the tray is never re-sorted from here.
        rows.sort((a, b) => (a.captured_at || '').localeCompare(b.captured_at || ''));
        setItems(rows);
        setTotal(typeof data?.total === 'number' ? data.total : rows.length);
        setTruncated(data?.truncated === true);
      } catch (err) {
        if (cancelled) return;
        console.error('[MontageStudio] feed load failed:', err);
        setItems([]);
        setItemsError(true);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();

    return () => { cancelled = true; };
    // scopeKey encodes every input; the raw values are read inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, scopeKey]);

  // --- draft persistence -------------------------------------------------
  // 🚨 An accidental refresh (or iOS reclaiming the tab) must not cost the
  // teacher twenty minutes of curation. The draft is per-scope, so switching
  // child and back restores HER selection for that child, not a global blob.
  // Every read/write is wrapped: Safari private mode throws on localStorage.
  const draftLoaded = useRef<string>('');
  useEffect(() => {
    if (!scopeKey) {
      setSelected([]);
      setTrims({});
      setPreviewId(null);
      return;
    }
    if (draftLoaded.current === scopeKey) return;
    draftLoaded.current = scopeKey;
    setPreviewId(null);
    try {
      const raw = window.localStorage.getItem(DRAFT_PREFIX + scopeKey);
      if (!raw) {
        setSelected([]);
        setTrims({});
        return;
      }
      const draft = JSON.parse(raw) as Draft;
      setSelected(Array.isArray(draft?.selected) ? draft.selected : []);
      setTrims(draft?.trims && typeof draft.trims === 'object' ? draft.trims : {});
      if (Array.isArray(draft?.selected) && draft.selected.length > 0) {
        toast.success(t('montageStudio.restored'));
      }
    } catch {
      setSelected([]);
      setTrims({});
    }
    // t is stable enough for a toast; re-running on locale change would
    // re-announce the restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  useEffect(() => {
    if (!scopeKey || draftLoaded.current !== scopeKey) return;
    try {
      if (selected.length === 0) {
        window.localStorage.removeItem(DRAFT_PREFIX + scopeKey);
      } else {
        window.localStorage.setItem(
          DRAFT_PREFIX + scopeKey,
          JSON.stringify({ selected, trims } satisfies Draft)
        );
      }
    } catch {
      /* private mode / quota — the draft is a convenience, never a blocker */
    }
  }, [scopeKey, selected, trims]);

  /** Drop ids the feed no longer has (deleted, or now out of range). */
  useEffect(() => {
    if (items.length === 0) return;
    const live = new Set(items.filter((i) => !isConverting(i)).map((i) => i.id));
    setSelected((prev) => {
      const next = prev.filter((id) => live.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [items]);

  // --- derived -----------------------------------------------------------
  const byId = useMemo(() => {
    const map = new Map<string, StudioItem>();
    for (const i of items) map.set(i.id, i);
    return map;
  }, [items]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const convertingItems = useMemo(() => items.filter(isConverting), [items]);

  const trayItems = useMemo(
    () => selected.map((id) => byId.get(id)).filter((i): i is StudioItem => !!i),
    [selected, byId]
  );

  const trimFor = useCallback(
    (item: StudioItem): Trim => trims[item.id] ?? defaultTrim(item),
    [trims]
  );

  /** Photos ≈ 3s of Ken Burns each; clips contribute their trimmed window. */
  const runtimeSeconds = useMemo(() => {
    let total = 0;
    for (const item of trayItems) {
      if (isVideo(item)) {
        const trim = trimFor(item);
        total += Math.max(0, trim.out - trim.in);
      } else {
        total += PHOTO_SECONDS;
      }
    }
    return Math.round(total);
  }, [trayItems, trimFor]);

  const previewItem = previewId ? byId.get(previewId) ?? null : null;
  const previewIndex = previewItem ? items.findIndex((i) => i.id === previewItem.id) : -1;

  // --- selection actions -------------------------------------------------
  const toggleKeep = useCallback((item: StudioItem) => {
    if (isConverting(item)) return;
    setJobStatus(null);
    setSelected((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
  }, []);

  const move = useCallback((id: string, delta: number) => {
    setSelected((prev) => {
      const from = prev.indexOf(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }, []);

  /** Desktop drag-and-drop: drop `dragId` where `overId` currently sits. */
  const dropOn = useCallback((overId: string) => {
    setSelected((prev) => {
      if (!dragId || dragId === overId) return prev;
      const from = prev.indexOf(dragId);
      const to = prev.indexOf(overId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
    setDragId(null);
  }, [dragId]);

  const resetEdit = useCallback((item: StudioItem) => {
    setTrims((prev) => {
      if (!(item.id in prev)) return prev;
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      const from = previewIndex < 0 ? 0 : previewIndex;
      const to = Math.max(0, Math.min(items.length - 1, from + delta));
      setPreviewId(items[to].id);
    },
    [items, previewIndex]
  );

  // --- photo crop (server-side, immediate) --------------------------------
  // 🚨 Identical to the Manager's lightbox crop: replace_original repoints
  // montree_media.storage_path, so the crop reaches the grid, the parent
  // report AND the rendered film with zero worker change. The selection is
  // deliberately NOT touched and the feed is deliberately NOT reloaded — a
  // reload would throw away the tray.
  const applyCrop = useCallback(
    async (item: StudioItem, crop: { x: number; y: number; width: number; height: number }) => {
      if (savingCrop) return;
      setSavingCrop(true);
      try {
        const res = await montreeApi('/api/montree/media/crop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_id: item.id, crop, replace_original: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success !== true || !data?.media?.url) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        setCropUrls((prev) => ({ ...prev, [item.id]: data.media.url }));
        const newPath = data?.media?.storage_path;
        if (typeof newPath === 'string' && newPath) {
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, storage_path: newPath } : p))
          );
        }
        toast.success(t('montageStudio.preview.cropSaved'));
      } catch (err) {
        console.error('[MontageStudio] crop failed:', err);
        toast.error(t('montageStudio.preview.cropFailed'));
      } finally {
        setSavingCrop(false);
      }
    },
    [savingCrop, t]
  );

  // --- "Convert N clips now" ---------------------------------------------
  // 🚨 `convertingItems` is the SINGLE source of truth: the banner count, the
  // button label and this request body all read it. They used to be computed
  // separately, so the label could promise 15 clips while the request body was
  // built from a different list.
  //
  // The endpoint does at most CONVERT_BATCH per call, so this sends 5 ids,
  // re-reads the feed, recomputes what is still pending, and sends the next 5
  // — until nothing is pending, the server says `remaining: 0`, or a round
  // converts nothing (every clip in it failed, or the call errored).
  const convertNow = useCallback(async () => {
    if (convertRunning.current) return;
    let queue = convertingItems.map((i) => i.id);
    const total = queue.length;
    if (total === 0) return;

    convertRunning.current = true;
    setConverting(true);
    setConvertError(null);
    setConvertProgress({ done: 0, total });

    // Ids this run has already handed to the server. A clip that fails keeps
    // playback_path NULL, so without this it would come straight back out of
    // the reloaded feed and be retried forever.
    const attempted = new Set<string>();
    let done = 0;

    try {
      for (let round = 0; round < CONVERT_MAX_ROUNDS && queue.length > 0; round++) {
        const batch = queue.slice(0, CONVERT_BATCH);
        batch.forEach((id) => attempted.add(id));

        const res = await montreeApi('/api/montree/media/transcode-now', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media_ids: batch }),
          timeout: CONVERT_TIMEOUT_MS,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

        const transcoded = Number(data?.counts?.transcoded) || 0;
        done = Math.min(total, done + transcoded);
        setConvertProgress({ done, total });

        if (transcoded === 0) {
          // Nothing moved. Either every clip in this batch failed or the
          // server found none eligible — stop rather than hammer the dyno.
          const firstError = Array.isArray(data?.results)
            ? (data.results as Array<{ ok?: boolean; error?: string }>)
                .find((r) => r && r.ok === false && r.error)?.error
            : null;
          setConvertError(firstError || t('montageStudio.convert.failed'));
          break;
        }

        // The server's own count of this school's clips still without a
        // playback copy: when it hits zero there is nothing left to ask for.
        if (Number(data?.counts?.remaining) === 0) {
          queue = [];
          break;
        }

        const rows = await reloadFeed();
        queue = rows
          ? rows.filter(isConverting).map((i) => i.id).filter((id) => !attempted.has(id))
          : queue.filter((id) => !attempted.has(id));
      }
      if (done > 0) toast.success(t('montageStudio.convert.done'));
    } catch (err) {
      console.error('[MontageStudio] convert failed:', err);
      setConvertError(err instanceof Error && err.message ? err.message : t('montageStudio.convert.failed'));
    } finally {
      setConverting(false);
      setConvertProgress(null);
      convertRunning.current = false;
      // Re-read the feed so the newly playable clips lose their grey state.
      await reloadFeed();
    }
  }, [convertingItems, reloadFeed, t]);

  // Auto-start once per scope: a teacher should not have to find the button
  // for work the page already knows needs doing. The ref makes this fire once
  // per scope change, never on every feed reload the loop itself triggers.
  useEffect(() => {
    if (!scopeKey || loadingItems || convertRunning.current) return;
    if (autoConverted.current === scopeKey) return;
    if (convertingItems.length === 0) return;
    autoConverted.current = scopeKey;
    void convertNow();
  }, [scopeKey, loadingItems, convertingItems, convertNow]);

  // --- save --------------------------------------------------------------
  /** All-time montages take their label dates from what she actually kept. */
  const derivedRange = useCallback((rows: StudioItem[]): DateRange => {
    let min: Date | null = null;
    let max: Date | null = null;
    for (const p of rows) {
      if (!p.captured_at) continue;
      const d = new Date(p.captured_at);
      if (Number.isNaN(d.getTime())) continue;
      if (!min || d < min) min = d;
      if (!max || d > max) max = d;
    }
    if (!min || !max) {
      const today = localDate(0);
      return { start: today, end: today };
    }
    return { start: formatLocalDate(min), end: formatLocalDate(max) };
  }, []);

  const save = useCallback(async () => {
    if (saving) return;
    if (!scopeChosen) {
      toast.error(t('montageStudio.scope.pickFirst'));
      return;
    }
    if (trayItems.length < minItems) {
      toast.error(
        t('montageStudio.save.needMore')
          .replace('{min}', String(minItems))
          .replace('{count}', String(trayItems.length))
      );
      return;
    }

    const kind =
      path === 'event' ? 'custom' : preset === 'day' ? 'daily' : preset === 'week' ? 'weekly' : 'custom';
    const jobRange =
      path === 'event' ? null : preset === 'all' ? derivedRange(trayItems) : range;

    // 🚨 media_edits carries VIDEO trims only. A photo crop was already
    // applied to the row itself by /api/montree/media/crop above.
    const mediaEdits = trayItems
      .filter(isVideo)
      .map((item) => ({ item, trim: trimFor(item) }))
      .filter(({ item, trim }) => {
        const d = defaultTrim(item);
        return Math.abs(trim.in - d.in) > 0.05 || Math.abs(trim.out - d.out) > 0.05;
      })
      .map(({ item, trim }) => ({
        media_id: item.id,
        in_sec: Math.round(trim.in * 1000) / 1000,
        out_sec: Math.round(trim.out * 1000) / 1000,
      }))
      .filter((e) => e.out_sec - e.in_sec >= 1 && e.out_sec <= MAX_CLIP_SECONDS);

    setSaving(true);
    try {
      const res = await montreeApi('/api/montree/montage', {
        method: 'POST',
        body: JSON.stringify({
          scope_type: path === 'child' ? 'child' : path === 'event' ? 'event' : 'classroom',
          kind,
          child_id: path === 'child' ? childId : undefined,
          classroom_id: path === 'class' ? classroomId : undefined,
          event_id: path === 'event' ? eventId : undefined,
          date_start: jobRange?.start,
          date_end: jobRange?.end,
          bypass_confirmation: true,
          // WYSIWYG, in HER order.
          media_ids: trayItems.map((i) => i.id),
          media_edits: mediaEdits.length > 0 ? mediaEdits : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 503) { toast.error(t('montageStudio.save.notMigrated')); return; }
      if (!res.ok) { toast.error(data?.error || t('montageStudio.save.failed')); return; }
      if (data?.ok === false && data?.reason === 'insufficient_photos') {
        toast.error(
          t('montageStudio.save.needMore')
            .replace('{min}', String(data.min_photos ?? minItems))
            .replace('{count}', String(data.photo_count ?? trayItems.length))
        );
        return;
      }
      if (!data?.ok) { toast.error(data?.error || t('montageStudio.save.failed')); return; }

      toast.success(data?.duplicate ? t('montageStudio.save.duplicate') : t('montageStudio.save.queued'));
      if (data?.job?.id) setJobStatus({ id: data.job.id, status: data.job.status || 'queued' });
    } catch (err) {
      console.error('[MontageStudio] save failed:', err);
      toast.error(t('montageStudio.save.failed'));
    } finally {
      setSaving(false);
    }
  }, [
    saving, scopeChosen, trayItems, minItems, path, preset, range, derivedRange,
    childId, classroomId, eventId, trimFor, t,
  ]);

  // --- job status polling -------------------------------------------------
  // Same list the Manager's 🎬 sheet reads; we just watch our own row until
  // it stops moving, then leave it on screen.
  useEffect(() => {
    if (!jobStatus || jobStatus.status === 'done' || jobStatus.status === 'failed') return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await montreeApi('/api/montree/montage?limit=20');
        if (!res.ok) return;
        const data = await res.json();
        const row = (data?.montages || []).find((m: { id: string }) => m.id === jobStatus.id);
        if (!cancelled && row?.status && row.status !== jobStatus.status) {
          setJobStatus({ id: jobStatus.id, status: row.status });
        }
      } catch {
        /* transient — the next tick tries again */
      }
    }, 8000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [jobStatus]);

  // --- shared inline styles ----------------------------------------------
  const sectionCard: CSSProperties = {
    background: T.card,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 14,
    padding: 14,
  };

  const selectStyle: CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(0,0,0,0.30)',
    border: `1px solid ${T.cardBorder}`,
    color: T.textPrimary,
    fontFamily: T.sans,
    fontSize: 14,
    outline: 'none',
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const rangeOptions: RangePreset[] = ['day', 'week', 'month', 'all'];
  const rangeLabel: Record<RangePreset, string> = {
    day: t('montageStudio.range.today'),
    week: t('montageStudio.range.week'),
    month: t('montageStudio.range.month'),
    all: t('montageStudio.range.all'),
  };

  return (
    <div className="min-h-screen bg-[#0a1a0f] pb-32 relative" style={{ fontFamily: T.sans }}>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
      />
      <Toaster position="top-center" />

      {/* ---------------------------- Header ---------------------------- */}
      <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-ghost btn-icon btn-sm text-xl" aria-label="Back">←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="text-lg font-bold text-white/95" style={{ fontFamily: T.serif }}>
            🎬 {t('montageStudio.title')}
          </h1>
          <p className="text-xs text-white/40">{t('montageStudio.subtitle')}</p>
        </div>
      </div>

      <div
        className="relative px-4 py-4"
        style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* ------------------------- Scope picker ------------------------ */}
        <div style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['child', 'class', 'event'] as ScopePath[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setPath(p); setPreviewId(null); setJobStatus(null); }}
                aria-pressed={path === p}
                className={`btn btn-sm btn-pill ${path === p ? 'btn-primary' : 'btn-secondary'}`}
              >
                {p === 'child' ? '🧒' : p === 'class' ? '🏫' : '🎉'} {t(`montageStudio.scope.${p}`)}
              </button>
            ))}
          </div>

          {path === 'class' && (
            <label style={{ display: 'block' }}>
              <span style={{ fontSize: 12, color: T.textSecondary }}>{t('montageStudio.scope.selectClass')}</span>
              <select
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                style={{ ...selectStyle, marginTop: 6 }}
                disabled={!!sessionClassroomId}
              >
                <option value="">{t('montageStudio.scope.chooseOne')}</option>
                {classrooms.filter((r) => r.id !== '__unassigned__').map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
          )}

          {path === 'child' && (
            <label style={{ display: 'block' }}>
              <span style={{ fontSize: 12, color: T.textSecondary }}>{t('montageStudio.scope.selectChild')}</span>
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                style={{ ...selectStyle, marginTop: 6 }}
              >
                <option value="">{t('montageStudio.scope.chooseOne')}</option>
                {allChildren.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.classroomName}</option>
                ))}
              </select>
            </label>
          )}

          {path === 'event' && (
            <label style={{ display: 'block' }}>
              <span style={{ fontSize: 12, color: T.textSecondary }}>{t('montageStudio.scope.selectEvent')}</span>
              {events.length > 0 ? (
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  style={{ ...selectStyle, marginTop: 6 }}
                >
                  <option value="">{t('montageStudio.scope.chooseOne')}</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}{ev.event_date ? ` (${ev.event_date})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>
                  {t('montageStudio.scope.noEvents')}
                </div>
              )}
            </label>
          )}

          {/* An event IS its own range — no date pills for that scope. */}
          {path !== 'event' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {rangeOptions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  aria-pressed={preset === p}
                  className={`btn btn-sm btn-pill ${preset === p ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {rangeLabel[p]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------ Preview stage ------------------------ */}
        {scopeChosen && (
          <div style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!previewItem ? (
              <div style={{ fontSize: 13, color: T.textMuted, textAlign: 'center', padding: '24px 0' }}>
                {t('montageStudio.preview.empty')}
              </div>
            ) : (
              <>
                {/* The 9:16 outline is what the film keeps — drawn around the
                    media so she can see the framing before she commits. */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    padding: 6,
                    borderRadius: 12,
                    border: `1px dashed ${T.emeraldBorder}`,
                    background: 'rgba(0,0,0,0.25)',
                  }}
                >
                  {isVideo(previewItem) ? (
                    <ClipTrimmer
                      // Keyed on the clip: a fresh mount is what resets the
                      // playhead and seeds the filmstrip from the cache.
                      key={previewItem.id}
                      mediaId={previewItem.id}
                      src={getVideoProxyUrl(previewItem.playback_path || previewItem.storage_path)}
                      poster={previewItem.thumbnail_path ? getProxyUrl(previewItem.thumbnail_path) : ''}
                      trim={trimFor(previewItem)}
                      maxSeconds={sourceSeconds(previewItem)}
                      onChange={(next) => {
                        setJobStatus(null);
                        setTrims((prev) => ({ ...prev, [previewItem.id]: next }));
                      }}
                      labels={{
                        play: t('montageStudio.preview.play'),
                        pause: t('montageStudio.preview.pause'),
                        in: t('montageStudio.preview.trimIn'),
                        out: t('montageStudio.preview.trimOut'),
                        selected: t('montageStudio.preview.selected').replace(
                          '{seconds}',
                          (trimFor(previewItem).out - trimFor(previewItem).in).toFixed(1)
                        ),
                        max: t('montageStudio.preview.trimMax').replace(
                          '{seconds}',
                          String(MAX_CLIP_SECONDS)
                        ),
                      }}
                    />
                  ) : (
                    <PhotoCropper
                      // A new photo (or a just-applied crop) is a FRESH box —
                      // keying the component is what resets it, not an effect.
                      key={`${previewItem.id}:${cropUrls[previewItem.id] || ''}`}
                      src={cropUrls[previewItem.id] || getProxyUrl(previewItem.storage_path)}
                      onApply={(crop) => applyCrop(previewItem, crop)}
                      applying={savingCrop}
                      applyLabel={savingCrop ? t('montageStudio.preview.cropping') : t('montageStudio.preview.applyCrop')}
                      hint={t('montageStudio.preview.cropHint')}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" onClick={() => step(-1)} className="btn btn-secondary btn-sm btn-pill">
                    ← {t('montageStudio.preview.prev')}
                  </button>
                  <button type="button" onClick={() => step(1)} className="btn btn-secondary btn-sm btn-pill">
                    {t('montageStudio.preview.next')} →
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleKeep(previewItem)}
                    aria-pressed={selectedSet.has(previewItem.id)}
                    className={`btn btn-sm btn-pill ${selectedSet.has(previewItem.id) ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ marginLeft: 'auto' }}
                  >
                    {selectedSet.has(previewItem.id)
                      ? `✓ ${t('montageStudio.preview.kept')}`
                      : t('montageStudio.preview.keep')}
                  </button>
                  {isVideo(previewItem) && trims[previewItem.id] && (
                    <button type="button" onClick={() => resetEdit(previewItem)} className="btn btn-ghost btn-sm">
                      ↺ {t('montageStudio.preview.reset')}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted }}>
                  {t('montageStudio.preview.frameHint')}
                </div>
              </>
            )}
          </div>
        )}

        {/* -------------------------- Filmstrip -------------------------- */}
        {scopeChosen && (
          <div style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: T.serif, fontSize: 15, color: T.textPrimary }}>
                {t('montageStudio.feed.title')}
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted }}>{t('montageStudio.feed.hint')}</div>
            </div>

            {convertingItems.length > 0 && (
              <div
                style={{
                  border: `1px solid ${T.amberBorder}`,
                  background: 'rgba(245,158,11,0.10)',
                  borderRadius: 10,
                  padding: 10,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 12, color: T.textSecondary, flex: 1, minWidth: 180 }}>
                  {convertProgress
                    ? t('montageStudio.convert.progress')
                        .replace('{done}', String(convertProgress.done + 1 > convertProgress.total
                          ? convertProgress.total
                          : convertProgress.done + 1))
                        .replace('{total}', String(convertProgress.total))
                    : t('montageStudio.convert.pending').replace('{count}', String(convertingItems.length))}
                </span>
                <button
                  type="button"
                  onClick={convertNow}
                  disabled={converting}
                  className="btn btn-gold btn-sm btn-pill"
                >
                  {converting
                    ? t('montageStudio.convert.running')
                    : t('montageStudio.convert.button').replace('{count}', String(convertingItems.length))}
                </button>
                {convertError && (
                  <div
                    role="alert"
                    style={{ flexBasis: '100%', fontSize: 11.5, color: T.amber }}
                  >
                    {t('montageStudio.convert.errorPrefix')} {convertError}
                  </div>
                )}
              </div>
            )}

            {loadingItems ? (
              <div style={{ fontSize: 13, color: T.textMuted }}>{t('montageStudio.feed.loading')}</div>
            ) : itemsError ? (
              <div style={{ fontSize: 13, color: T.amber }}>{t('montageStudio.feed.loadFailed')}</div>
            ) : items.length === 0 ? (
              <div style={{ fontSize: 13, color: T.textMuted }}>{t('montageStudio.feed.empty')}</div>
            ) : (
              <>
                {/* Horizontal filmstrip on a phone, a wrapped grid from md up. */}
                <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-6 md:overflow-x-visible">
                  {items.map((item) => {
                    const pending = isConverting(item);
                    const failed = isFailedConvert(item);
                    const kept = selectedSet.has(item.id);
                    const order = selected.indexOf(item.id) + 1;
                    const thumb = thumbFor(item, cropUrls[item.id], 240);
                    return (
                      <div
                        key={item.id}
                        style={{
                          position: 'relative',
                          flex: '0 0 92px',
                          width: 92,
                          aspectRatio: '1 / 1',
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: `2px solid ${kept ? T.emerald : 'transparent'}`,
                          background: 'rgba(0,0,0,0.35)',
                          opacity: pending ? 0.45 : 1,
                        }}
                        className="md:w-full md:flex-none"
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewId(item.id)}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            padding: 0,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                          aria-label={item.captured_at || item.id}
                        >
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.06)' }} />
                          )}
                        </button>

                        {isVideo(item) && (
                          <span
                            style={{
                              position: 'absolute', left: 4, bottom: 4,
                              padding: '1px 6px', borderRadius: 999,
                              background: 'rgba(0,0,0,0.65)', color: '#fff',
                              fontSize: 10, fontWeight: 600, pointerEvents: 'none',
                            }}
                          >
                            ▶ {formatMediaDuration(item.duration_seconds) || ''}
                          </span>
                        )}

                        {pending ? (
                          <span
                            style={{
                              position: 'absolute', right: 4, top: 4,
                              padding: '1px 6px', borderRadius: 999,
                              background: 'rgba(0,0,0,0.7)', color: T.amber,
                              fontSize: 9.5, fontWeight: 600, pointerEvents: 'none',
                            }}
                          >
                            {failed ? t('montageStudio.feed.convertFailed') : t('montageStudio.feed.converting')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleKeep(item)}
                            aria-pressed={kept}
                            aria-label={t('montageStudio.preview.keep')}
                            style={{
                              position: 'absolute', right: 3, top: 3,
                              width: 24, height: 24, borderRadius: '50%',
                              border: `1px solid ${kept ? T.emerald : 'rgba(255,255,255,0.5)'}`,
                              background: kept ? T.emerald : 'rgba(0,0,0,0.55)',
                              color: kept ? '#04210f' : '#fff',
                              fontSize: 11, fontWeight: 800, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {kept ? order : ''}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {truncated && (
                  <div style={{ fontSize: 11, color: T.textMuted }}>
                    {t('montageStudio.feed.truncated')
                      .replace('{shown}', String(items.length))
                      .replace('{total}', String(total))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ------------------------ Selection tray ----------------------- */}
        {scopeChosen && (
          <div style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: T.serif, fontSize: 15, color: T.textPrimary }}>
                {t('montageStudio.tray.title')} · {trayItems.length}
              </div>
              {trayItems.length > 0 && (
                <div style={{ fontSize: 11.5, color: T.emerald }}>
                  {t('montageStudio.tray.runtime').replace('{seconds}', String(runtimeSeconds))}
                </div>
              )}
            </div>

            {trayItems.length === 0 ? (
              <div style={{ fontSize: 13, color: T.textMuted }}>{t('montageStudio.tray.empty')}</div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: T.textMuted }}>{t('montageStudio.tray.reorderHint')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {trayItems.map((item, index) => {
                    const trim = isVideo(item) ? trimFor(item) : null;
                    const thumb = thumbFor(item, cropUrls[item.id], 120);
                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => setDragId(item.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => dropOn(item.id)}
                        onDragEnd={() => setDragId(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: 6, borderRadius: 10,
                          background: dragId === item.id ? T.emeraldSoft : 'rgba(0,0,0,0.25)',
                          border: `1px solid ${T.cardBorder}`,
                        }}
                      >
                        <span style={{ fontSize: 11.5, color: T.emerald, width: 18, textAlign: 'center', fontWeight: 700 }}>
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewId(item.id)}
                          style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
                          aria-label={t('montageStudio.preview.play')}
                        >
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              loading="lazy"
                              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                            />
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.08)' }} />
                          )}
                        </button>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: T.textSecondary }}>
                          {isVideo(item)
                            ? `▶ ${trim ? (trim.out - trim.in).toFixed(1) : '—'}s`
                            : `🖼 ${PHOTO_SECONDS}s`}
                        </span>
                        <button
                          type="button"
                          onClick={() => move(item.id, -1)}
                          disabled={index === 0}
                          aria-label={t('montageStudio.tray.moveUp')}
                          className="btn btn-secondary btn-icon btn-sm btn-round"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => move(item.id, 1)}
                          disabled={index === trayItems.length - 1}
                          aria-label={t('montageStudio.tray.moveDown')}
                          className="btn btn-secondary btn-icon btn-sm btn-round"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleKeep(item)}
                          aria-label={t('montageStudio.tray.remove')}
                          className="btn btn-ghost btn-icon btn-sm btn-round"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {jobStatus && (
              <div style={{ fontSize: 12, color: T.emerald }}>
                {t('montageStudio.save.status').replace('{status}', jobStatus.status)}{' '}
                <button
                  type="button"
                  onClick={() => router.push('/montree/dashboard/montage-tracker')}
                  style={{
                    background: 'transparent', border: 'none', padding: 0,
                    color: T.emerald, fontSize: 12, textDecoration: 'underline', cursor: 'pointer',
                  }}
                >
                  {t('montageStudio.save.viewFilms')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --------------------------- Save bar --------------------------- */}
      {/* Sticky, thumb-height, and above the iPhone home indicator. */}
      {scopeChosen && trayItems.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-20 border-t border-[rgba(52,211,153,0.2)] bg-[rgba(7,18,12,0.95)] px-4 py-3"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: T.textSecondary, flex: 1, minWidth: 0 }}>
              {trayItems.length} · {t('montageStudio.tray.runtime').replace('{seconds}', String(runtimeSeconds))}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={saving || trayItems.length < minItems}
              className="btn btn-primary btn-md btn-pill"
            >
              {saving ? t('montageStudio.save.saving') : `🎬 ${t('montageStudio.save.button')}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
