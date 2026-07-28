// app/montree/dashboard/montage-tracker/page.tsx
//
// Montage Tracker — "who has been photographed?" boards + a two-path montage
// creator. ZERO AI: a photo counts for a child the moment it is captured and
// tagged, with no teacher-confirmation step. The AI identification /
// confirmation pipeline runs untouched in parallel and is not referenced here.
//
//   Daily board   — today, school-wide, grouped by classroom. Covered = tagged
//                   in >= 1 photo captured today.
//   Weekly board  — current calendar week Mon–Sun against an 8-photos-per-child
//                   target, children needing the most photos first, plus a
//                   team-wide "needs more photos" list.
//   Creator       — Child or Class + Day / Week / Month / Custom range. Posts to
//                   the EXISTING montage job API with bypass_confirmation, so
//                   the film may use unconfirmed (but parent-visible) photos.
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
type CreatePath = 'child' | 'class';
type RangePreset = 'day' | 'week' | 'month' | 'custom';

interface CoverageResponse {
  date_start: string;
  date_end: string;
  classrooms: TrackerClassroom[];
  totals: { children: number; covered: number; total_photos: number };
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
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
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

export default function MontageTrackerPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [ready, setReady] = useState(false);
  const [sessionClassroomId, setSessionClassroomId] = useState<string | null>(null);

  const [view, setView] = useState<BoardView>('daily');
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // --- creator state ------------------------------------------------------
  const [path, setPath] = useState<CreatePath>('child');
  const [preset, setPreset] = useState<RangePreset>('week');
  const [customStart, setCustomStart] = useState(() => localDate(-6));
  const [customEnd, setCustomEnd] = useState(() => localDate(0));
  const [childId, setChildId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [creating, setCreating] = useState(false);
  const [shortfall, setShortfall] = useState<{ count: number; min: number } | null>(null);

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
      console.error('[MontageTracker] coverage load failed:', err);
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
      // Tracker jobs only — Montage Studio's own films stay on its page.
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

  // --- creator ------------------------------------------------------------
  const creatorRange: DateRange = useMemo(() => {
    if (preset === 'day') return todayRange();
    if (preset === 'week') return currentWeekRange();
    if (preset === 'month') return currentMonthRange();
    return { start: customStart, end: customEnd };
  }, [preset, customStart, customEnd]);

  const handleCreate = async () => {
    if (creating) return;
    setShortfall(null);

    if (path === 'child' && !childId) { toast.error(t('montageTracker.create.pickChild')); return; }
    if (path === 'class' && !classroomId) { toast.error(t('montageTracker.create.pickClass')); return; }
    if (!creatorRange.start || !creatorRange.end || creatorRange.start > creatorRange.end) {
      toast.error(t('montageTracker.create.failed'));
      return;
    }

    // Month has no montage_kind of its own (no schema change) — it is just a
    // custom range covering the calendar month.
    const kind = preset === 'day' ? 'daily' : preset === 'week' ? 'weekly' : 'custom';

    setCreating(true);
    try {
      const res = await montreeApi('/api/montree/montage', {
        method: 'POST',
        body: JSON.stringify({
          scope_type: path === 'child' ? 'child' : 'classroom',
          kind,
          child_id: path === 'child' ? childId : undefined,
          classroom_id: path === 'class' ? classroomId : undefined,
          date_start: creatorRange.start,
          date_end: creatorRange.end,
          bypass_confirmation: true,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 503) { toast.error(t('montageTracker.create.notMigrated')); return; }
      if (!res.ok) { toast.error(data?.error || t('montageTracker.create.failed')); return; }

      if (data?.ok === false && data?.reason === 'insufficient_photos') {
        setShortfall({ count: data.photo_count ?? 0, min: data.min_photos ?? 8 });
        return;
      }
      if (!data?.ok) { toast.error(data?.error || t('montageTracker.create.failed')); return; }

      toast.success(data?.duplicate ? t('montageTracker.create.duplicate') : t('montageTracker.create.queued'));
      loadJobs();
    } catch (err) {
      console.error('[MontageTracker] create failed:', err);
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

          {/* two paths only: child or class */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => { setPath('child'); setShortfall(null); }} style={pill(path === 'child')} aria-pressed={path === 'child'}>
              🧒 {t('montageTracker.create.child')}
            </button>
            <button type="button" onClick={() => { setPath('class'); setShortfall(null); }} style={pill(path === 'class')} aria-pressed={path === 'class'}>
              🏫 {t('montageTracker.create.class')}
            </button>
          </div>

          {path === 'child' ? (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
                {t('montageTracker.create.selectChild')}
              </label>
              <select value={childId} onChange={(e) => { setChildId(e.target.value); setShortfall(null); }} style={selectStyle}>
                <option value="">{t('montageTracker.create.chooseOne')}</option>
                {childOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.classroomName}</option>
                ))}
              </select>
            </div>
          ) : (
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

          {/* range presets */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['day', 'week', 'month', 'custom'] as RangePreset[]).map((p) => (
              <button key={p} type="button" onClick={() => { setPreset(p); setShortfall(null); }} style={pill(preset === p)} aria-pressed={preset === p}>
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

          <div style={{ fontSize: 12, color: T.textMuted }}>{shortRangeLabel(creatorRange)}</div>

          {shortfall && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: T.amberSoft, border: `1px solid ${T.amberBorder}`, color: T.amber, fontSize: 13 }}>
              {t('montageTracker.create.needMore', { min: shortfall.min, count: shortfall.count })}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12,
              background: creating ? 'rgba(52,211,153,0.30)' : T.emerald,
              border: 'none', color: '#062015', fontSize: 16, fontWeight: 700,
              cursor: creating ? 'wait' : 'pointer', transition: 'all 120ms ease',
            }}
          >
            {creating ? t('montageTracker.create.creating') : `🎬 ${t('montageTracker.create.button')}`}
          </button>
        </div>

        {/* --- tracker montage jobs --- */}
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
