// app/montree/dashboard/montage-tracker/page.tsx
//
// Montage Manager — a three-path montage creator with a photo picker, above
// the "who has been photographed?" coverage boards. ZERO AI: a photo counts
// for a child the moment it is captured and tagged, with no teacher-
// confirmation step. The AI identification / confirmation pipeline runs
// untouched in parallel and is not referenced here.
//
//   Creator       — Children / Class / Events tabs (FIRST thing on the page),
//                   then a range, then a THUMBNAIL GRID of the photos that
//                   montage would use. Tap a thumb to OPEN IT BIG; the corner
//                   ✕ badge drops it from the film. Posts the kept ids as
//                   `media_ids` (with bypass_confirmation) so the worker
//                   renders exactly what the teacher saw — WYSIWYG.
//   Daily board   — today, school-wide, grouped by classroom. Covered = tagged
//                   in >= 1 photo captured today.
//   Weekly board  — current calendar week Mon–Sun against an 8-photos-per-child
//                   target, children needing the most photos first, plus a
//                   team-wide "needs more photos" list.
//
// 🚨 The picker grid and the child-tile counts are parent_visible-only, on
// purpose: the grid, the badge and the finished film must agree. The COVERAGE
// BOARDS below them deliberately ignore parent_visible — they answer "did
// anyone photograph this child?", not "what can go in a film?". Do not align
// them; the divergence is the design.
//
// 🚨 Removing a thumbnail (the corner ✕ badge) is SELECTION ONLY. Nothing
// there mutates a media row, a confirmation state, or anything else — it just
// shortens the list posted. The ONE real delete on this page is the 🗑 inside
// the full-screen lightbox, and it is behind DeleteConfirmDialog. Do not add a
// delete affordance anywhere else.
//
// 🚨 The "tracker montages" job list + its player used to live at the bottom
// of this page. Removed Jul 2026 — Montage Studio (/montree/dashboard/montage)
// already lists every job including the manager's (it applies no
// require_confirmed filter), so nothing was lost. The API and lib are
// untouched.
//
// It came back Jul 2026 as the 🎬 header button → MontagesSheet, and it is
// deliberately NOT the old inline list: a slide-over, dynamically imported,
// mounted only while open, that exists for the three things you do with a
// FINISHED film — play it, download it, send it to parents. The creator and
// the coverage boards below are untouched by it.
//
// 🚨 TIMEZONE: every date here is the BROWSER's local calendar date, via
// lib/montree/montage-tracker/weekRange (never toISOString — that would shift
// the day in Asia/Shanghai). Same rule as MontageStudio.
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import {
  currentMonthRange,
  currentWeekRange,
  formatLocalDate,
  localDate,
  shortRangeLabel,
  todayRange,
  type DateRange,
} from '@/lib/montree/montage-tracker/weekRange';
import {
  WEEKLY_PHOTO_TARGET,
  type TrackerChild,
  type TrackerClassroom,
} from '@/lib/montree/montage-tracker/coverage';

// Code-split the overlays — none is needed on first paint. MontagesSheet is
// additionally gated behind its own open flag below, so its chunk (and the
// <video> elements inside it) only downloads when a teacher taps 🎬.
const PhotoLightbox = dynamic(() => import('@/components/montree/media/PhotoLightbox'), { ssr: false });
const DeleteConfirmDialog = dynamic(() => import('@/components/montree/media/DeleteConfirmDialog'), { ssr: false });
const MontagesSheet = dynamic(() => import('@/components/montree/montage/MontagesSheet'), { ssr: false });

// Dark-forest tokens, inline per component (house style — see MontageStudio).
const T = {
  emerald: '#34d399',
  emeraldBorder: 'rgba(52,211,153,0.55)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  amber: '#f59e0b',
  amberBorder: 'rgba(245,158,11,0.45)',
  amberSoft: 'rgba(245,158,11,0.10)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.12)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

type BoardView = 'daily' | 'weekly';
/** Creator paths. 'class' and 'child' map to scope_type classroom/child. */
type CreatePath = 'class' | 'child' | 'event';
/** 'all' is child-path only — every photo she has ever appeared in. */
type RangePreset = 'all' | 'day' | 'week' | 'month' | 'custom';

/** Scope floors, mirroring MIN_SCOPED_PHOTOS / MIN_EVENT_PHOTOS in enqueue.ts. */
const MIN_PHOTOS_SCOPED = 8;
const MIN_PHOTOS_EVENT = 4;

interface CoverageResponse {
  date_start: string;
  date_end: string;
  classrooms: TrackerClassroom[];
  totals: { children: number; covered: number; total_photos: number };
}

interface PickerPhoto {
  id: string;
  storage_path: string;
  captured_at: string | null;
  child_id: string | null;
}

interface EventOption {
  id: string;
  name: string;
  event_date: string | null;
}

function ChildAvatar({ name, photoUrl, size = 26 }: { name: string; photoUrl: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getProxyUrl(photoUrl)}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(52,211,153,0.25)', color: T.textPrimary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.45), fontWeight: 700,
      }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * Avatar chip — green when covered, amber when still waiting.
 *
 * With `onSelect` it becomes a button: tapping a child on a coverage board
 * jumps straight to her picker grid in the Children tab. Without it the chip
 * stays a plain, non-interactive span (unchanged behaviour).
 */
function ChildChip({
  child, tone, suffix, onSelect,
}: {
  child: TrackerChild;
  tone: 'ok' | 'warn';
  suffix?: string;
  onSelect?: () => void;
}) {
  const fg = tone === 'ok' ? T.emerald : T.amber;
  const bg = tone === 'ok' ? T.emeraldSoft : T.amberSoft;
  const border = tone === 'ok' ? T.emeraldBorder : T.amberBorder;
  const shell: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '5px 10px 5px 5px', borderRadius: 999,
    background: bg, border: `1px solid ${border}`, maxWidth: '100%',
  };
  const inner = (
    <>
      <ChildAvatar name={child.name} photoUrl={child.photo_url} />
      <span style={{ fontSize: 12.5, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {child.name}
      </span>
      {suffix && <span style={{ fontSize: 11.5, fontWeight: 700, color: fg, whiteSpace: 'nowrap' }}>{suffix}</span>}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={`btn btn-sm btn-pill ${tone === 'ok' ? 'btn-primary' : 'btn-gold'}`} style={{ maxWidth: '100%', textAlign: 'left' }}>
        {inner}
      </button>
    );
  }
  return <span style={shell}>{inner}</span>;
}

function ProgressBar({ value, max, tone = 'ok' }: { value: number; max: number; tone?: 'ok' | 'warn' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%', width: `${pct}%`, borderRadius: 999,
          background: tone === 'ok' ? T.emerald : T.amber,
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );
}

/**
 * One tile in the child-picker grid — the dashboard's StudentAvatarCard look
 * (58px circular photo-or-initial) with two count pills:
 *   top-LEFT  green  — total parent-visible photos she appears in (all-time)
 *   top-RIGHT amber  — how many MORE she needs to reach the montage floor,
 *                      hidden once she's there.
 * The whole tile (avatar + name) is one button, so tapping the NAME opens her
 * grid just as tapping the face does.
 */
function ChildTile({
  child, total, selected, onSelect,
}: {
  child: TrackerChild;
  total: number | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const size = 58;
  const shortfall = total === null ? 0 : Math.max(0, MIN_PHOTOS_SCOPED - total);
  const firstName = (child.name || '').trim().split(/\s+/)[0] || child.name;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '8px 4px', borderRadius: 12, width: '100%',
        background: selected ? T.emeraldSoft : 'transparent',
        border: `1px solid ${selected ? T.emeraldBorder : 'transparent'}`,
        cursor: 'pointer', transition: 'all 120ms ease',
      }}
    >
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'rgba(16,185,129,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: selected ? '0 0 18px 5px rgba(52,211,153,0.35)' : 'none',
        }}>
          <ChildAvatar name={child.name} photoUrl={child.photo_url} size={size} />
        </div>
        {total !== null && (
          <span style={{
            position: 'absolute', top: -2, left: -2, minWidth: 20, height: 20,
            padding: '0 5px', borderRadius: 999,
            background: '#0a1a0f', border: `1px solid ${T.emeraldBorder}`,
            color: T.emerald, fontSize: 11, fontWeight: 700, lineHeight: '18px',
            textAlign: 'center',
          }}>
            {total}
          </span>
        )}
        {shortfall > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20,
            padding: '0 5px', borderRadius: 999,
            background: '#0a1a0f', border: `1px solid ${T.amberBorder}`,
            color: T.amber, fontSize: 11, fontWeight: 700, lineHeight: '18px',
            textAlign: 'center',
          }}>
            +{shortfall}
          </span>
        )}
      </div>
      <span style={{
        fontSize: 11.5, color: selected ? T.emerald : T.textSecondary,
        maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {firstName}
      </span>
    </button>
  );
}

/**
 * One square thumbnail in the picker grid. TWO gestures, deliberately split:
 *   • tile body  → onOpen   — opens the full-screen viewer at this index
 *   • corner ✕   → onToggle — drops it from / restores it to the film
 * "Removed" is purely a local selection state — no media row is ever touched
 * here. (The only real delete lives inside the lightbox, behind a confirm.)
 */
function PhotoThumb({
  src, removed, onOpen, onToggle, removeLabel, restoreLabel, openLabel,
}: {
  /** Display URL, resolved by the page's photoUrl() so the grid and the
   *  lightbox can never disagree after a crop. */
  src: string;
  removed: boolean;
  onOpen: () => void;
  onToggle: () => void;
  removeLabel: string;
  restoreLabel: string;
  /** Locale-derived capture date — no i18n key. Empty string ⇒ no label. */
  openLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  // A crop swaps this tile's URL while the component stays mounted (the key is
  // the media id), so a stale failure must not outlive the old URL.
  useEffect(() => { setFailed(false); }, [src]);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={openLabel || undefined}
        title={openLabel || undefined}
        style={{
          position: 'relative', display: 'block', width: '100%', aspectRatio: '1 / 1',
          borderRadius: 10, overflow: 'hidden', padding: 0,
          border: `1px solid ${removed ? T.cardBorder : T.emeraldBorder}`,
          background: 'rgba(0,0,0,0.30)', cursor: 'pointer',
          opacity: removed ? 0.35 : 1, transition: 'opacity 120ms ease',
        }}
      >
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: 20, color: T.textMuted }}>🖼</span>
        )}
        {removed && (
          <span
            aria-hidden
            style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(2,8,5,0.45)', color: '#fff',
              fontSize: 22, fontWeight: 700,
            }}
          >
            ✕
          </span>
        )}
      </button>

      {/* selection-only exclude badge — never calls an API */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-pressed={removed}
        aria-label={removed ? restoreLabel : removeLabel}
        title={removed ? restoreLabel : removeLabel}
        className={`btn btn-icon btn-sm btn-round ${removed ? 'btn-primary' : 'btn-secondary'}`}
        style={{ position: 'absolute', top: 4, right: 4, zIndex: 2 }}
      >
        {removed ? '↺' : '✕'}
      </button>
    </div>
  );
}

export default function MontageManagerPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [ready, setReady] = useState(false);
  const [sessionClassroomId, setSessionClassroomId] = useState<string | null>(null);

  const [view, setView] = useState<BoardView>('daily');
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // --- creator state ------------------------------------------------------
  // Children is the default tab, so the default preset must be the child
  // default ('all') that choosePath would have set.
  const [path, setPath] = useState<CreatePath>('child');
  const [preset, setPreset] = useState<RangePreset>('all');
  const [customStart, setCustomStart] = useState(() => localDate(-6));
  const [customEnd, setCustomEnd] = useState(() => localDate(0));
  const [childId, setChildId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [eventId, setEventId] = useState('');
  const [events, setEvents] = useState<EventOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [shortfall, setShortfall] = useState<{ count: number; min: number } | null>(null);

  // --- picker state -------------------------------------------------------
  const [photos, setPhotos] = useState<PickerPhoto[]>([]);
  const [photoTotal, setPhotoTotal] = useState(0);
  const [photoTruncated, setPhotoTruncated] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [childTotals, setChildTotals] = useState<Record<string, number> | null>(null);

  // --- viewer / delete state ---------------------------------------------
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [photoToDelete, setPhotoToDelete] = useState<PickerPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- crop state ---------------------------------------------------------
  // The crop route repoints the row (replace_original), so the URL it hands
  // back is the truth from here on. Keyed by media id, so it stays correct if
  // the same photo turns up under another path/range — deliberately NOT
  // cleared by choosePath.
  const [cropUrlOverrides, setCropUrlOverrides] = useState<Record<string, string>>({});
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  // --- finished-montages sheet -------------------------------------------
  // Closed = unmounted = zero requests. See MontagesSheet's polling note.
  const [montagesOpen, setMontagesOpen] = useState(false);

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

  // --- coverage -----------------------------------------------------------
  const boardRange: DateRange = useMemo(
    () => (view === 'daily' ? todayRange() : currentWeekRange()),
    [view]
  );

  const loadCoverage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await montreeApi(
        `/api/montree/montage-tracker/coverage?date_start=${boardRange.start}&date_end=${boardRange.end}&mode=${view}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as CoverageResponse;
      setCoverage(data);
      setLoadError(false);
    } catch (err) {
      console.error('[MontageManager] coverage load failed:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [boardRange.start, boardRange.end, view]);

  useEffect(() => {
    if (ready) loadCoverage();
  }, [ready, loadCoverage]);

  // --- events (same source Montage Studio uses) ---------------------------
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
        console.error('[MontageManager] events load failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, path, events.length]);

  // --- all-time per-child photo totals (child-grid badges) ----------------
  useEffect(() => {
    if (!ready || path !== 'child' || childTotals !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await montreeApi('/api/montree/montage-tracker/media?mode=totals');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.totals) setChildTotals(data.totals as Record<string, number>);
      } catch (err) {
        console.error('[MontageManager] totals load failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, path, childTotals]);

  // --- derived board data -------------------------------------------------
  const allChildren = useMemo(() => {
    const out: Array<TrackerChild & { classroomName: string }> = [];
    for (const room of coverage?.classrooms || []) {
      for (const c of room.children) out.push({ ...c, classroomName: room.name });
    }
    return out;
  }, [coverage]);

  const weeklyDone = useMemo(
    () => allChildren.filter((c) => c.photo_count >= WEEKLY_PHOTO_TARGET).length,
    [allChildren]
  );

  const needsMore = useMemo(
    () =>
      allChildren
        .filter((c) => c.photo_count < WEEKLY_PHOTO_TARGET)
        .sort((a, b) => a.photo_count - b.photo_count || a.name.localeCompare(b.name)),
    [allChildren]
  );

  const childOptions = useMemo(
    () => [...allChildren].sort((a, b) => a.name.localeCompare(b.name)),
    [allChildren]
  );

  const selectedChild = useMemo(
    () => childOptions.find((c) => c.id === childId) || null,
    [childOptions, childId]
  );

  // --- creator range ------------------------------------------------------
  // 'all' has no calendar bounds — the picker asks for every photo and the
  // job's dates are derived from what the teacher actually keeps.
  const creatorRange: DateRange | null = useMemo(() => {
    if (preset === 'all') return null;
    if (preset === 'day') return todayRange();
    if (preset === 'week') return currentWeekRange();
    if (preset === 'month') return currentMonthRange();
    return { start: customStart, end: customEnd };
  }, [preset, customStart, customEnd]);

  /** Range presets offered per path. Events ARE their own range. */
  const rangeOptions: RangePreset[] = useMemo(
    () => (path === 'child' ? ['all', 'day', 'week', 'month', 'custom'] : ['day', 'week', 'month', 'custom']),
    [path]
  );

  const minPhotos = path === 'event' ? MIN_PHOTOS_EVENT : MIN_PHOTOS_SCOPED;

  // --- picker: load the photos this montage would use ---------------------
  // The query key is everything that changes the set. Whenever it changes the
  // grid reloads and the removal set is cleared (a removal only ever refers to
  // the list it was made against).
  const pickerKey = useMemo(() => {
    if (path === 'event') return eventId ? `event:${eventId}` : '';
    const scopeId = path === 'child' ? childId : classroomId;
    if (!scopeId) return '';
    if (preset === 'all') return `${path}:${scopeId}:all`;
    if (!creatorRange?.start || !creatorRange?.end) return '';
    if (creatorRange.start > creatorRange.end) return '';
    return `${path}:${scopeId}:${creatorRange.start}:${creatorRange.end}`;
  }, [path, eventId, childId, classroomId, preset, creatorRange]);

  useEffect(() => {
    if (!ready || !pickerKey) {
      setPhotos([]);
      setPhotoTotal(0);
      setPhotoTruncated(false);
      setPhotosError(false);
      setRemoved(new Set());
      return;
    }

    let cancelled = false;
    setPhotosLoading(true);
    setPhotosError(false);
    setShortfall(null);

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
    // 'all' (and every event) sends no bounds — the server reads that as
    // all-time / the whole event.
    if (path !== 'event' && preset !== 'all' && creatorRange) {
      params.set('start', creatorRange.start);
      params.set('end', creatorRange.end);
    }

    (async () => {
      try {
        const res = await montreeApi(`/api/montree/montage-tracker/media?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const rows = Array.isArray(data?.photos) ? (data.photos as PickerPhoto[]) : [];
        setPhotos(rows);
        setPhotoTotal(typeof data?.total === 'number' ? data.total : rows.length);
        setPhotoTruncated(data?.truncated === true);
        setRemoved(new Set());
      } catch (err) {
        if (cancelled) return;
        console.error('[MontageManager] photo list failed:', err);
        setPhotos([]);
        setPhotoTotal(0);
        setPhotoTruncated(false);
        setPhotosError(true);
      } finally {
        if (!cancelled) setPhotosLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // pickerKey encodes every input; the raw values are read inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pickerKey]);

  const keptPhotos = useMemo(
    () => photos.filter((p) => !removed.has(p.id)),
    [photos, removed]
  );

  const toggleRemoved = useCallback((id: string) => {
    setShortfall(null);
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const restoreAll = useCallback(() => {
    setShortfall(null);
    setRemoved(new Set());
  }, []);

  /** Switching path resets everything downstream of it. */
  const choosePath = useCallback((next: CreatePath) => {
    setPath(next);
    setShortfall(null);
    setRemoved(new Set());
    setPhotos([]);
    setPhotoTotal(0);
    setPhotoTruncated(false);
    setLightboxOpen(false);
    setLightboxIndex(0);
    // A child montage defaults to her whole story; the others to this week.
    setPreset(next === 'child' ? 'all' : 'week');
  }, []);

  /** A coverage-board chip jumps to that child's grid at the top of the page. */
  const selectChildFromBoard = useCallback((id: string) => {
    choosePath('child');
    setChildId(id);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [choosePath]);

  // --- viewer -------------------------------------------------------------
  /** The ONE place a picker photo becomes a URL — grid and lightbox both read
   *  it, so a fresh crop can never show in one and not the other. */
  const photoUrl = useCallback(
    (p: PickerPhoto) => cropUrlOverrides[p.id] || getProxyUrl(p.storage_path),
    [cropUrlOverrides]
  );

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  /** Keep the index inside the (possibly just-shortened) list. */
  useEffect(() => {
    if (!lightboxOpen) return;
    if (photos.length === 0) {
      setLightboxOpen(false);
      setLightboxIndex(0);
    } else if (lightboxIndex >= photos.length) {
      setLightboxIndex(photos.length - 1);
    }
  }, [lightboxOpen, lightboxIndex, photos.length]);

  const lightboxPhotos = useMemo(
    () => photos.map((p) => ({
      url: photoUrl(p),
      caption: null,
      date: p.captured_at ?? undefined,
    })),
    [photos, photoUrl]
  );

  /**
   * The ONLY destructive action on this page. Permanent: the endpoint removes
   * the storage object, the montree_media_children junction rows and the media
   * row. Always behind DeleteConfirmDialog (whose copy warns it can't be
   * undone) — same call the child gallery makes.
   */
  const confirmDelete = async () => {
    if (!photoToDelete || isDeleting) return;
    const id = photoToDelete.id;
    setIsDeleting(true);
    try {
      const res = await montreeApi(`/api/montree/media?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      setRemoved((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setPhotoTotal((prev) => Math.max(0, prev - 1));
      setShortfall(null);
      toast.success(t('gallery.photoDeletedSuccessfully'));
    } catch (err) {
      console.error('[MontageManager] delete failed:', err);
      toast.error(t('gallery.deletePhotoError'));
    } finally {
      setPhotoToDelete(null);
      setIsDeleting(false);
    }
  };

  /**
   * Crop-to-viewport, straight from the lightbox: the teacher pinch-zooms and
   * pans until the frame holds what she wants, taps ✂, and the rectangle she
   * is looking at (already in ORIGINAL image pixels) becomes the photo.
   *
   * 🚨 A crop is NOT a curation act: photos.length, `removed` and `keptPhotos`
   * are all untouched, so `media_ids` and the kept-count are unaffected. The
   * picker is deliberately NOT reloaded either — that would reset `removed`
   * via the pickerKey effect and throw away her exclusions.
   *
   * The route replaces the original (replace_original), so the row now points
   * at the cropped object and a reload — plus the rendered film — shows the
   * crop. Only the display URL is patched here; `storage_path` in memory stays
   * the pre-crop path, which is harmless because every remaining consumer
   * (create, delete) works off the media id.
   */
  const handleCrop = async (index: number, crop: { x: number; y: number; width: number; height: number }) => {
    const target = photos[index];
    if (!target || isSavingCrop) return;
    setIsSavingCrop(true);
    try {
      const res = await montreeApi('/api/montree/media/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: target.id, crop, replace_original: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success !== true || !data?.media?.url) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      // New storage path ⇒ a new URL, so no cache-busting is needed. The
      // lightbox resets to 1× by itself: its src prop changes.
      setCropUrlOverrides((prev) => ({ ...prev, [target.id]: data.media.url }));
      // Belt-and-braces: if the route also reports the row's post-crop path,
      // keep the in-memory row honest so the override and storage_path agree.
      const newPath = data?.media?.storage_path;
      if (typeof newPath === 'string' && newPath) {
        setPhotos((prev) => prev.map((p) => (p.id === target.id ? { ...p, storage_path: newPath } : p)));
      }
      toast.success(t('gallery.crop'));
    } catch (err) {
      console.error('[MontageManager] crop failed:', err);
      toast.error(t('common.error'));
    } finally {
      setIsSavingCrop(false);
    }
  };

  /**
   * The job's date_start / date_end for an ALL-range child montage: the span
   * the kept photos actually cover.
   *
   * 🚨 formatLocalDate, never toISOString — captured_at is a timestamptz and
   * toISOString would hand Asia/Shanghai the previous calendar day. The dates
   * are labelling only here (media_ids is what the worker renders), but a
   * wrong subtitle on the film is still a wrong subtitle.
   */
  const derivedRangeFromPhotos = useCallback((rows: PickerPhoto[]): DateRange => {
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

  const handleCreate = async () => {
    if (creating) return;
    setShortfall(null);

    if (path === 'child' && !childId) { toast.error(t('montageTracker.create.pickChild')); return; }
    if (path === 'class' && !classroomId) { toast.error(t('montageTracker.create.pickClass')); return; }
    if (path === 'event' && !eventId) { toast.error(t('montageTracker.create.pickEvent')); return; }

    if (keptPhotos.length < minPhotos) {
      setShortfall({ count: keptPhotos.length, min: minPhotos });
      return;
    }

    // Month has no montage_kind of its own (no schema change) — it is just a
    // custom range covering the calendar month. So is 'all'. An EVENT is
    // always 'custom': it carries no range at all, and 'daily'/'weekly' would
    // put a wrong eyebrow ("Weekly Montage") on the finished film.
    const kind =
      path === 'event' ? 'custom'
        : preset === 'day' ? 'daily'
          : preset === 'week' ? 'weekly'
            : 'custom';

    // Events carry no range (the route nulls it for that scope anyway).
    const range =
      path === 'event'
        ? null
        : preset === 'all'
          ? derivedRangeFromPhotos(keptPhotos)
          : creatorRange;

    if (path !== 'event' && (!range?.start || !range?.end || range.start > range.end)) {
      toast.error(t('montageTracker.create.failed'));
      return;
    }

    setCreating(true);
    try {
      const res = await montreeApi('/api/montree/montage', {
        method: 'POST',
        body: JSON.stringify({
          scope_type: path === 'child' ? 'child' : path === 'event' ? 'event' : 'classroom',
          kind,
          child_id: path === 'child' ? childId : undefined,
          classroom_id: path === 'class' ? classroomId : undefined,
          event_id: path === 'event' ? eventId : undefined,
          date_start: range?.start,
          date_end: range?.end,
          bypass_confirmation: true,
          // WYSIWYG: exactly the thumbnails still showing in the grid.
          media_ids: keptPhotos.map((p) => p.id),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 503) { toast.error(t('montageTracker.create.notMigrated')); return; }
      if (!res.ok) { toast.error(data?.error || t('montageTracker.create.failed')); return; }

      if (data?.ok === false && data?.reason === 'insufficient_photos') {
        setShortfall({ count: data.photo_count ?? 0, min: data.min_photos ?? minPhotos });
        return;
      }
      if (!data?.ok) { toast.error(data?.error || t('montageTracker.create.failed')); return; }

      toast.success(data?.duplicate ? t('montageTracker.create.duplicate') : t('montageTracker.create.queued'));
    } catch (err) {
      console.error('[MontageManager] create failed:', err);
      toast.error(t('montageTracker.create.failed'));
    } finally {
      setCreating(false);
    }
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

  const pill = (active: boolean): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 999,
    background: active ? T.emeraldSoft : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? T.emeraldBorder : T.cardBorder}`,
    color: active ? T.emerald : T.textSecondary,
    fontFamily: T.sans, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 120ms ease',
  });

  const linkButton: CSSProperties = {
    background: 'transparent', border: 'none', padding: 0,
    color: T.emerald, fontSize: 12, fontFamily: T.sans,
    textDecoration: 'underline', cursor: 'pointer',
  };

  const sectionCard: CSSProperties = {
    background: T.card,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 14,
    padding: 14,
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const totals = coverage?.totals ?? { children: 0, covered: 0, total_photos: 0 };
  const scopeChosen =
    path === 'event' ? !!eventId : path === 'child' ? !!childId : !!classroomId;
  const safeLightboxIndex = Math.min(lightboxIndex, Math.max(photos.length - 1, 0));
  const lightboxCurrent = photos[safeLightboxIndex];

  return (
    <div className="min-h-screen bg-[#0a1a0f] pb-24 relative" style={{ fontFamily: T.sans }}>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
      />
      <Toaster position="top-center" />

      {/* Header */}
      <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-ghost btn-icon btn-sm text-xl" aria-label="Back">←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="text-lg font-bold text-white/95" style={{ fontFamily: T.serif }}>
            📸 {t('montageTracker.title')}
          </h1>
          <p className="text-xs text-white/40">{t('montageTracker.subtitle')}</p>
        </div>
        {/* Finished films — play / download / send to parents. */}
        <button
          type="button"
          onClick={() => setMontagesOpen(true)}
          aria-label={t('montageTracker.jobs.title')}
          title={t('montageTracker.jobs.title')}
          className="btn btn-secondary btn-icon btn-md text-lg"
          style={{ flexShrink: 0 }}
        >
          🎬
        </button>
      </div>

      <div className="relative px-4 py-4" style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* =================== TABS — first thing on the page =============== */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => choosePath('child')} className={`btn btn-sm btn-pill ${path === 'child' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={path === 'child'}>
            🧒 {t('montageTracker.create.child')}
          </button>
          <button type="button" onClick={() => choosePath('class')} className={`btn btn-sm btn-pill ${path === 'class' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={path === 'class'}>
            🏫 {t('montageTracker.create.class')}
          </button>
          <button type="button" onClick={() => choosePath('event')} className={`btn btn-sm btn-pill ${path === 'event' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={path === 'event'}>
            🎉 {t('montageTracker.create.event')}
          </button>
        </div>

        {/* =================== CREATOR =================== */}
        <div style={{ ...sectionCard, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontFamily: T.serif, fontSize: 16, color: T.textPrimary }}>
              🎬 {t('montageTracker.create.title')}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
              {t('montageTracker.create.hint')}
            </div>
          </div>

          {/* ---------------- WHOLE CLASS: classroom select ---------------- */}
          {path === 'class' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
                {t('montageTracker.create.selectClass')}
              </label>
              <select
                value={classroomId}
                onChange={(e) => { setClassroomId(e.target.value); setShortfall(null); }}
                style={selectStyle}
                // A teacher's token pins her to her own classroom — the API
                // rejects any other, so don't offer the choice.
                disabled={!!sessionClassroomId}
              >
                <option value="">{t('montageTracker.create.chooseOne')}</option>
                {(coverage?.classrooms || [])
                  .filter((r) => r.id !== '__unassigned__')
                  .map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}

          {/* ---------------- ONE CHILD: avatar grid, then range ----------- */}
          {path === 'child' && !selectedChild && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 8 }}>
                {t('montageTracker.create.selectChild')}
              </label>
              {childOptions.length === 0 ? (
                <div style={{ fontSize: 13, color: T.textMuted }}>{t('montageTracker.noChildren')}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 4 }}>
                  {childOptions.map((c) => (
                    <ChildTile
                      key={c.id}
                      child={c}
                      total={childTotals ? (childTotals[c.id] ?? 0) : null}
                      selected={false}
                      onSelect={() => { setChildId(c.id); setShortfall(null); }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {path === 'child' && selectedChild && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* easy exit — straight back to the child list for the next one */}
              <button
                type="button"
                onClick={() => { setChildId(''); setShortfall(null); setLightboxOpen(false); }}
                aria-label={t('montageTracker.create.backToChildren')}
                title={t('montageTracker.create.backToChildren')}
                className="btn btn-secondary btn-icon btn-sm btn-round"
                style={{ flexShrink: 0 }}
              >
                ✕
              </button>
              <ChildAvatar name={selectedChild.name} photoUrl={selectedChild.photo_url} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedChild.name}
                </div>
                <div style={{ fontSize: 11.5, color: T.textMuted }}>{selectedChild.classroomName}</div>
              </div>
              <button
                type="button"
                onClick={() => { setChildId(''); setShortfall(null); setLightboxOpen(false); }}
                className="btn btn-ghost btn-sm"
              >
                {t('montageTracker.create.backToChildren')}
              </button>
            </div>
          )}

          {/* ---------------- SPECIAL EVENT: event select ------------------ */}
          {path === 'event' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
                {t('montageTracker.create.selectEvent')}
              </label>
              {events.length > 0 ? (
                <select
                  value={eventId}
                  onChange={(e) => { setEventId(e.target.value); setShortfall(null); }}
                  style={selectStyle}
                >
                  <option value="">{t('montageTracker.create.chooseOne')}</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}{ev.event_date ? ` (${ev.event_date})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: T.textMuted }}>{t('montageTracker.create.noEvents')}</div>
              )}
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 6 }}>
                {t('montageTracker.create.eventIsRange')}
              </div>
              {/* "Did my Art Camp photos land?" — the media page is the only
                  surface that shows EVERY photo on an event (parent_visible
                  -blind) with the server's honest total. */}
              {eventId && (
                <div style={{ marginTop: 8 }}>
                  <Link
                    href={`/montree/dashboard/media?event=${eventId}`}
                    style={{ ...linkButton, display: 'inline-block' }}
                  >
                    🖼️ {t('media.photo_gallery')} →
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ---------------- range presets (never for events) ------------- */}
          {path !== 'event' && (path !== 'child' || !!selectedChild) && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {rangeOptions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setPreset(p); setShortfall(null); }}
                    className={`btn btn-sm btn-pill ${preset === p ? 'btn-primary' : 'btn-secondary'}`}
                    aria-pressed={preset === p}
                  >
                    {t(`montageTracker.range.${p}` as 'montageTracker.range.day')}
                  </button>
                ))}
              </div>

              {preset === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
                      {t('montageTracker.dateFrom')}
                    </label>
                    <input type="date" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setShortfall(null); }} style={{ ...selectStyle, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
                      {t('montageTracker.dateTo')}
                    </label>
                    <input type="date" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setShortfall(null); }} style={{ ...selectStyle, colorScheme: 'dark' }} />
                  </div>
                </div>
              )}

              <div style={{ fontSize: 12, color: T.textMuted }}>
                {creatorRange ? shortRangeLabel(creatorRange) : t('montageTracker.range.allHint')}
              </div>
            </>
          )}

          {/* ---------------- the picker grid ------------------------------ */}
          {scopeChosen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {photosLoading && (
                <div style={{ fontSize: 13, color: T.textMuted }}>{t('montageTracker.picker.loading')}</div>
              )}

              {!photosLoading && photosError && (
                <div style={{ fontSize: 13, color: T.red }}>{t('montageTracker.picker.loadFailed')}</div>
              )}

              {!photosLoading && !photosError && photos.length === 0 && (
                <div style={{ fontSize: 13, color: T.textMuted }}>{t('montageTracker.picker.empty')}</div>
              )}

              {!photosLoading && !photosError && photos.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, fontSize: 12.5, color: T.textSecondary }}>
                      {t('montageTracker.picker.kept', { kept: keptPhotos.length, total: photos.length })}
                    </div>
                    {removed.size > 0 && (
                      <button type="button" onClick={restoreAll} className="btn btn-ghost btn-sm">
                        {t('montageTracker.picker.restoreAll')}
                      </button>
                    )}
                  </div>

                  {photoTruncated && (
                    <div style={{ fontSize: 11.5, color: T.amber }}>
                      {t('montageTracker.picker.truncated', { shown: photos.length, total: photoTotal })}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))', gap: 6 }}>
                    {photos.map((p, i) => (
                      <PhotoThumb
                        key={p.id}
                        src={photoUrl(p)}
                        removed={removed.has(p.id)}
                        onOpen={() => openLightbox(i)}
                        onToggle={() => toggleRemoved(p.id)}
                        removeLabel={t('montageTracker.picker.remove')}
                        restoreLabel={t('montageTracker.picker.restore')}
                        openLabel={p.captured_at ? new Date(p.captured_at).toLocaleDateString() : ''}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {shortfall && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: T.amberSoft, border: `1px solid ${T.amberBorder}`, color: T.amber, fontSize: 13 }}>
              {t('montageTracker.create.needMore', { min: shortfall.min, count: shortfall.count })}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || photosLoading || keptPhotos.length < minPhotos}
            className="btn btn-primary btn-lg btn-full"
          >
            {creating
              ? t('montageTracker.create.creating')
              : keptPhotos.length < minPhotos && scopeChosen && !photosLoading
                ? t('montageTracker.create.needMoreShort', { min: minPhotos, count: keptPhotos.length })
                : `🎬 ${t('montageTracker.create.button')}`}
          </button>
        </div>

        {/* =================== COVERAGE BOARDS (secondary) ================== */}
        <div aria-hidden style={{ height: 1, background: T.cardBorder, marginTop: 4 }} />

        {/* --- view toggle --- */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setView('daily')} className={`btn btn-sm btn-pill ${view === 'daily' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={view === 'daily'}>
            {t('montageTracker.tab.daily')}
          </button>
          <button type="button" onClick={() => setView('weekly')} className={`btn btn-sm btn-pill ${view === 'weekly' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={view === 'weekly'}>
            {t('montageTracker.tab.weekly')}
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={loadCoverage}
            className="btn btn-secondary btn-icon btn-sm"
            aria-label={t('montageTracker.refresh')}
          >
            ↻
          </button>
        </div>

        {/* --- school-wide summary --- */}
        <div style={sectionCard}>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>
            {shortRangeLabel(boardRange)}
            {totals.total_photos > 0 && ` · ${t('montageTracker.photosInRange', { count: totals.total_photos })}`}
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 18, color: T.textPrimary, marginBottom: 10 }}>
            {view === 'daily'
              ? t('montageTracker.summaryDaily', { covered: totals.covered, total: totals.children })
              : t('montageTracker.summaryWeekly', { covered: weeklyDone, total: totals.children, target: WEEKLY_PHOTO_TARGET })}
          </div>
          <ProgressBar
            value={view === 'daily' ? totals.covered : weeklyDone}
            max={totals.children}
          />
        </div>

        {loading && !coverage && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {loadError && (
          <div style={{ ...sectionCard, borderColor: 'rgba(239,68,68,0.3)', background: T.redSoft, textAlign: 'center' }}>
            <div style={{ color: T.red, fontSize: 13, marginBottom: 8 }}>{t('montageTracker.loadFailed')}</div>
            <button type="button" onClick={loadCoverage} style={{ ...pill(false), border: 'none', background: 'transparent', color: T.red, textDecoration: 'underline' }}>
              {t('montageTracker.retry')}
            </button>
          </div>
        )}

        {/* --- WEEKLY: needs-more, team-wide --- */}
        {view === 'weekly' && coverage && needsMore.length > 0 && (
          <div style={{ ...sectionCard, borderColor: T.amberBorder, background: T.amberSoft }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.amber, marginBottom: 4 }}>
              ⚠ {t('montageTracker.needsMore')} ({needsMore.length})
            </div>
            <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 10 }}>
              {t('montageTracker.needsMoreHint', { target: WEEKLY_PHOTO_TARGET })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {needsMore.map((c) => (
                <ChildChip
                  key={c.id}
                  child={c}
                  tone="warn"
                  suffix={`${c.photo_count}/${WEEKLY_PHOTO_TARGET}`}
                  onSelect={() => selectChildFromBoard(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* --- per-classroom boards --- */}
        {coverage?.classrooms.map((room) => {
          const covered = room.children.filter((c) => c.photo_count > 0);
          const notYet = room.children.filter((c) => c.photo_count === 0);
          const sortedWeekly = [...room.children].sort(
            (a, b) => a.photo_count - b.photo_count || a.name.localeCompare(b.name)
          );
          return (
            <div key={room.id} style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <div style={{ fontFamily: T.serif, fontSize: 16, color: T.textPrimary }}>{room.name}</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>
                  {view === 'daily'
                    ? `${covered.length}/${room.children.length}`
                    : `${room.children.filter((c) => c.photo_count >= WEEKLY_PHOTO_TARGET).length}/${room.children.length}`}
                </div>
              </div>

              {room.children.length === 0 && (
                <div style={{ fontSize: 13, color: T.textMuted }}>{t('montageTracker.noChildren')}</div>
              )}

              {/* DAILY — covered vs not-yet chips */}
              {view === 'daily' && room.children.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {notYet.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.amber, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 7 }}>
                        {t('montageTracker.notYet')} ({notYet.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {notYet.map((c) => (
                          <ChildChip key={c.id} child={c} tone="warn" onSelect={() => selectChildFromBoard(c.id)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {covered.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.emerald, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 7 }}>
                        {t('montageTracker.covered')} ({covered.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {covered.map((c) => (
                          <ChildChip
                            key={c.id}
                            child={c}
                            tone="ok"
                            suffix={`×${c.photo_count}`}
                            onSelect={() => selectChildFromBoard(c.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {notYet.length === 0 && covered.length > 0 && (
                    <div style={{ fontSize: 12.5, color: T.emerald }}>🎉 {t('montageTracker.allCovered')}</div>
                  )}
                </div>
              )}

              {/* WEEKLY — per child progress toward the 8-photo target */}
              {view === 'weekly' && room.children.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {sortedWeekly.map((c) => {
                    const done = c.photo_count >= WEEKLY_PHOTO_TARGET;
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ChildAvatar name={c.name} photoUrl={c.photo_url} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.name}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <ProgressBar value={c.photo_count} max={WEEKLY_PHOTO_TARGET} tone={done ? 'ok' : 'warn'} />
                          </div>
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: done ? T.emerald : T.amber, whiteSpace: 'nowrap' }}>
                          {c.photo_count}/{WEEKLY_PHOTO_TARGET}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- full-screen viewer --- */}
      <PhotoLightbox
        isOpen={lightboxOpen && photos.length > 0}
        onClose={() => setLightboxOpen(false)}
        src={lightboxCurrent ? photoUrl(lightboxCurrent) : ''}
        photos={lightboxPhotos}
        currentIndex={safeLightboxIndex}
        onNavigate={(idx) => setLightboxIndex(idx)}
        onDelete={(idx) => setPhotoToDelete(photos[idx] ?? null)}
        deleteLabel={t('gallery.deletePhoto')}
        deleting={isDeleting}
        onCrop={handleCrop}
        cropLabel={t('gallery.cropPhoto')}
        cropping={isSavingCrop}
        onPrimaryAction={() => { setLightboxOpen(false); handleCreate(); }}
        primaryActionLabel={`🎬 ${t('montageTracker.create.button')}`}
        primaryActionDisabled={creating || photosLoading || keptPhotos.length < minPhotos}
      />

      {/* --- finished montages: play / download / send to parents ---
          Rendered only while open so the dynamic chunk (and its <video>
          elements) never load for a teacher who does not ask for them. */}
      {montagesOpen && <MontagesSheet onClose={() => setMontagesOpen(false)} />}

      {/* --- delete confirmation ---
          DeleteConfirmDialog is z-50 and the lightbox is z-[100]; the bin lives
          INSIDE the lightbox, so the dialog needs its own stacking context
          above it or it would confirm invisibly behind the viewer. */}
      <div style={{ position: 'relative', zIndex: 200 }}>
        <DeleteConfirmDialog
          isOpen={!!photoToDelete}
          count={1}
          onConfirm={confirmDelete}
          onCancel={() => { if (!isDeleting) setPhotoToDelete(null); }}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
