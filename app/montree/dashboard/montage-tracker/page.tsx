// app/montree/dashboard/montage-tracker/page.tsx
//
// Montage Manager — "who has been photographed?" boards + a three-path
// montage creator with a photo picker. ZERO AI: a photo counts for a child the
// moment it is captured and tagged, with no teacher-confirmation step. The AI
// identification / confirmation pipeline runs untouched in parallel and is not
// referenced here.
//
//   Daily board   — today, school-wide, grouped by classroom. Covered = tagged
//                   in >= 1 photo captured today.
//   Weekly board  — current calendar week Mon–Sun against an 8-photos-per-child
//                   target, children needing the most photos first, plus a
//                   team-wide "needs more photos" list.
//   Creator       — Whole class / One child / Special event, then a range, then
//                   a THUMBNAIL GRID of the photos that montage would use. Tap
//                   a thumb to drop it. Posts the kept ids as `media_ids` (with
//                   bypass_confirmation) so the worker renders exactly what the
//                   teacher saw — WYSIWYG.
//
// 🚨 The picker grid and the child-tile counts are parent_visible-only, on
// purpose: the grid, the badge and the finished film must agree. The COVERAGE
// BOARDS above them deliberately ignore parent_visible — they answer "did
// anyone photograph this child?", not "what can go in a film?". Do not align
// them; the divergence is the design.
//
// 🚨 Removing a thumbnail is SELECTION ONLY. Nothing here mutates a media row,
// a confirmation state, or anything else — it just shortens the list posted.
//
// 🚨 TIMEZONE: every date here is the BROWSER's local calendar date, via
// lib/montree/montage-tracker/weekRange (never toISOString — that would shift
// the day in Asia/Shanghai). Same rule as MontageStudio.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getProxyUrl, getVideoProxyUrl } from '@/lib/montree/media/proxy-url';
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

interface MontageRow {
  id: string;
  scope_type: string;
  montage_kind: string;
  status: string;
  title: string;
  output_path: string | null;
  date_start: string | null;
  date_end: string | null;
  error: string | null;
  require_confirmed?: boolean;
}

const ACTIVE_STATUSES = new Set(['queued', 'rendering']);

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

/** Avatar chip — green when covered, amber when still waiting. */
function ChildChip({ child, tone, suffix }: { child: TrackerChild; tone: 'ok' | 'warn'; suffix?: string }) {
  const fg = tone === 'ok' ? T.emerald : T.amber;
  const bg = tone === 'ok' ? T.emeraldSoft : T.amberSoft;
  const border = tone === 'ok' ? T.emeraldBorder : T.amberBorder;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '5px 10px 5px 5px', borderRadius: 999,
        background: bg, border: `1px solid ${border}`, maxWidth: '100%',
      }}
    >
      <ChildAvatar name={child.name} photoUrl={child.photo_url} />
      <span style={{ fontSize: 12.5, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {child.name}
      </span>
      {suffix && <span style={{ fontSize: 11.5, fontWeight: 700, color: fg, whiteSpace: 'nowrap' }}>{suffix}</span>}
    </span>
  );
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
 * One square thumbnail in the picker grid. "Removed" is purely a local
 * selection state — no media row is ever touched.
 */
function PhotoThumb({
  photo, removed, onToggle, removeLabel, restoreLabel,
}: {
  photo: PickerPhoto;
  removed: boolean;
  onToggle: () => void;
  removeLabel: string;
  restoreLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={removed}
      aria-label={removed ? restoreLabel : removeLabel}
      title={removed ? restoreLabel : removeLabel}
      style={{
        position: 'relative', width: '100%', aspectRatio: '1 / 1',
        borderRadius: 10, overflow: 'hidden', padding: 0,
        border: `1px solid ${removed ? T.cardBorder : T.emeraldBorder}`,
        background: 'rgba(0,0,0,0.30)', cursor: 'pointer',
        opacity: removed ? 0.35 : 1, transition: 'opacity 120ms ease',
      }}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getProxyUrl(photo.storage_path)}
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
  const [path, setPath] = useState<CreatePath>('class');
  const [preset, setPreset] = useState<RangePreset>('week');
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

  const [jobs, setJobs] = useState<MontageRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [watching, setWatching] = useState<MontageRow | null>(null);

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

  // --- tracker montage jobs (poll like MontageStudio) ---------------------
  const loadJobs = useCallback(async () => {
    try {
      const res = await montreeApi('/api/montree/montage?limit=20');
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data?.montages) ? (data.montages as MontageRow[]) : [];
      // Manager jobs only — Montage Studio's own films stay on its page.
      setJobs(rows.filter((m) => m.require_confirmed === false));
    } catch {
      /* transient — the next poll picks it up */
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) loadJobs();
  }, [ready, loadJobs]);

  const hasActiveJob = useMemo(() => jobs.some((j) => ACTIVE_STATUSES.has(j.status)), [jobs]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!hasActiveJob) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(loadJobs, 10000);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [hasActiveJob, loadJobs]);

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
    // A child montage defaults to her whole story; the others to this week.
    setPreset(next === 'child' ? 'all' : 'week');
  }, []);

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
      loadJobs();
    } catch (err) {
      console.error('[MontageManager] create failed:', err);
      toast.error(t('montageTracker.create.failed'));
    } finally {
      setCreating(false);
    }
  };

  const statusLabel = (status: string): string => {
    switch (status) {
      case 'queued': return t('montage.status.queued');
      case 'rendering': return t('montage.status.rendering');
      case 'done': return t('montage.status.done');
      case 'failed': return t('montage.status.failed');
      case 'skipped_insufficient_photos': return t('montage.status.skipped_insufficient_photos');
      default: return status;
    }
  };

  const statusColor = (status: string): { fg: string; bg: string } => {
    if (status === 'done') return { fg: T.emerald, bg: T.emeraldSoft };
    if (status === 'failed') return { fg: T.red, bg: T.redSoft };
    if (status === 'skipped_insufficient_photos') return { fg: T.textMuted, bg: 'rgba(255,255,255,0.05)' };
    return { fg: T.amber, bg: T.amberSoft };
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
  const watchingPath = watching?.output_path || '';
  const scopeChosen =
    path === 'event' ? !!eventId : path === 'child' ? !!childId : !!classroomId;

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
        <button onClick={() => router.back()} className="text-white/50 text-xl" aria-label="Back">←</button>
        <div>
          <h1 className="text-lg font-bold text-white/95" style={{ fontFamily: T.serif }}>
            📸 {t('montageTracker.title')}
          </h1>
          <p className="text-xs text-white/40">{t('montageTracker.subtitle')}</p>
        </div>
      </div>

      <div className="relative px-4 py-4" style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* --- view toggle --- */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setView('daily')} style={pill(view === 'daily')} aria-pressed={view === 'daily'}>
            {t('montageTracker.tab.daily')}
          </button>
          <button type="button" onClick={() => setView('weekly')} style={pill(view === 'weekly')} aria-pressed={view === 'weekly'}>
            {t('montageTracker.tab.weekly')}
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={loadCoverage}
            style={{ ...pill(false), padding: '7px 12px' }}
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
                        {notYet.map((c) => <ChildChip key={c.id} child={c} tone="warn" />)}
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
                          <ChildChip key={c.id} child={c} tone="ok" suffix={`×${c.photo_count}`} />
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

          {/* three paths: whole class, one child, special event */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => choosePath('class')} style={pill(path === 'class')} aria-pressed={path === 'class'}>
              🏫 {t('montageTracker.create.class')}
            </button>
            <button type="button" onClick={() => choosePath('child')} style={pill(path === 'child')} aria-pressed={path === 'child'}>
              🧒 {t('montageTracker.create.child')}
            </button>
            <button type="button" onClick={() => choosePath('event')} style={pill(path === 'event')} aria-pressed={path === 'event'}>
              🎉 {t('montageTracker.create.event')}
            </button>
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
              <ChildAvatar name={selectedChild.name} photoUrl={selectedChild.photo_url} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedChild.name}
                </div>
                <div style={{ fontSize: 11.5, color: T.textMuted }}>{selectedChild.classroomName}</div>
              </div>
              <button
                type="button"
                onClick={() => { setChildId(''); setShortfall(null); }}
                style={linkButton}
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
                    style={pill(preset === p)}
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
                      <button type="button" onClick={restoreAll} style={linkButton}>
                        {t('montageTracker.picker.restoreAll')}
                      </button>
                    )}
                  </div>

                  <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: -4 }}>
                    {t('montageTracker.picker.tapToRemove')}
                  </div>

                  {photoTruncated && (
                    <div style={{ fontSize: 11.5, color: T.amber }}>
                      {t('montageTracker.picker.truncated', { shown: photos.length, total: photoTotal })}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))', gap: 6 }}>
                    {photos.map((p) => (
                      <PhotoThumb
                        key={p.id}
                        photo={p}
                        removed={removed.has(p.id)}
                        onToggle={() => toggleRemoved(p.id)}
                        removeLabel={t('montageTracker.picker.remove')}
                        restoreLabel={t('montageTracker.picker.restore')}
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
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12,
              background: creating || photosLoading || keptPhotos.length < minPhotos
                ? 'rgba(52,211,153,0.30)'
                : T.emerald,
              border: 'none', color: '#062015', fontSize: 16, fontWeight: 700,
              cursor: creating ? 'wait' : keptPhotos.length < minPhotos ? 'not-allowed' : 'pointer',
              transition: 'all 120ms ease',
            }}
          >
            {creating
              ? t('montageTracker.create.creating')
              : keptPhotos.length < minPhotos && scopeChosen && !photosLoading
                ? t('montageTracker.create.needMoreShort', { min: minPhotos, count: keptPhotos.length })
                : `🎬 ${t('montageTracker.create.button')}`}
          </button>
        </div>

        {/* --- manager montage jobs --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: T.serif, fontSize: 16, color: T.textPrimary }}>
            {t('montageTracker.jobs.title')}
          </div>

          {jobsLoading && jobs.length === 0 && (
            <div style={{ fontSize: 13, color: T.textMuted }}>{t('common.loading')}</div>
          )}

          {!jobsLoading && jobs.length === 0 && (
            <div style={{ ...sectionCard, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
              {t('montageTracker.jobs.empty')}
            </div>
          )}

          {jobs.map((m) => {
            const c = statusColor(m.status);
            const range =
              m.date_start && m.date_end
                ? (m.date_start === m.date_end ? m.date_start : `${m.date_start} → ${m.date_end}`)
                : '';
            return (
              <div key={m.id} style={{ ...sectionCard, display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{range}</div>
                  {m.status === 'failed' && m.error && (
                    <div style={{ fontSize: 11, color: T.red, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.error}
                    </div>
                  )}
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999,
                  background: c.bg, border: `1px solid ${c.fg}40`,
                  color: c.fg, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  {ACTIVE_STATUSES.has(m.status) && (
                    <span
                      className="animate-spin"
                      style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${c.fg}`, borderTopColor: 'transparent', display: 'inline-block' }}
                    />
                  )}
                  {statusLabel(m.status)}
                </span>
                {m.status === 'done' && m.output_path && (
                  <button
                    type="button"
                    onClick={() => setWatching(m)}
                    style={{
                      padding: '7px 12px', borderRadius: 10,
                      background: T.emeraldSoft, border: `1px solid ${T.emeraldBorder}`,
                      color: T.emerald, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    ▶ {t('montage.watch')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- player --- */}
      {watchingPath && watching && (
        <div
          onClick={() => setWatching(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(2,8,5,0.90)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460 }}>
            <div style={{ fontSize: 14, color: T.textSecondary, marginBottom: 10, textAlign: 'center' }}>
              {watching.title}
            </div>
            <video
              src={getVideoProxyUrl(watchingPath)}
              controls
              autoPlay
              playsInline
              preload="metadata"
              style={{ width: '100%', borderRadius: 14, background: '#000' }}
            />
            <button
              type="button"
              onClick={() => setWatching(null)}
              style={{
                width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 12,
                background: 'rgba(255,255,255,0.08)', border: `1px solid ${T.cardBorder}`,
                color: T.textPrimary, fontSize: 14, cursor: 'pointer',
              }}
            >
              {t('montage.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
