// components/montree/montage/MontageStudio.tsx
//
// Montage Studio — the teacher surface for migration 304's scoped montages.
//
//   three pill tabs   Daily | Weekly | Custom            (montage_kind)
//   three scopes      Whole classroom | One child | Special event
//
// Creating one POSTs /api/montree/montage; the Railway worker renders it and
// stamps montree_montage_jobs.output_path. The "Recent montages" list polls
// GET /api/montree/montage every 10s while anything is queued/rendering, and
// plays finished films through the same Cloudflare-cached video proxy the
// parent report page uses (getVideoProxyUrl → /api/montree/media/proxy/...,
// a public bucket route, so no teacher-specific signing is needed).
//
// 🚨 TIMEZONE: date_start/date_end are computed HERE, from the browser's local
// calendar date, and sent to the server. Schools have no stored timezone, and
// "today" must mean the teacher's today — so the client owns the calendar and
// the server only validates the YYYY-MM-DD shape.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { toast } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getVideoProxyUrl } from '@/lib/montree/media/proxy-url';

// Dark-forest tokens, inline per component (house style — see WeeklyWrapTab).
const T = {
  emerald: '#34d399',
  emeraldBorder: 'rgba(52,211,153,0.55)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  panel: 'rgba(7,18,12,0.92)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.10)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.12)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: "var(--font-lora), Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

type Kind = 'daily' | 'weekly' | 'custom';
type Scope = 'classroom' | 'child' | 'event';

interface ChildOption { id: string; name: string }
interface EventOption { id: string; name: string; event_date: string; classroom_id?: string | null }

interface MontageRow {
  id: string;
  scope_type: string;
  montage_kind: string;
  status: string;
  title: string;
  child_name: string | null;
  event_name: string | null;
  output_path: string | null;
  date_start: string | null;
  date_end: string | null;
  created_at: string | null;
  finished_at: string | null;
  error: string | null;
}

const ACTIVE_STATUSES = new Set(['queued', 'rendering']);

/** Browser-local YYYY-MM-DD (NOT toISOString — that would shift the day in
 *  Asia/Shanghai and hand the teacher yesterday's photos). */
function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function MontageStudio() {
  const { t } = useI18n();

  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('daily');
  const [scope, setScope] = useState<Scope>('classroom');
  const [childId, setChildId] = useState('');
  const [eventId, setEventId] = useState('');
  const [customStart, setCustomStart] = useState(() => localDate(-6));
  const [customEnd, setCustomEnd] = useState(() => localDate(0));

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [montages, setMontages] = useState<MontageRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [shortfall, setShortfall] = useState<{ count: number; min: number } | null>(null);
  const [watching, setWatching] = useState<MontageRow | null>(null);

  useEffect(() => {
    setClassroomId(getSession()?.classroom?.id || null);
  }, []);

  // --- reference data -----------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await montreeApi('/api/montree/children');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.children)) setChildren(data.children);
      } catch { /* offline — the dropdown just stays empty */ }
    })();
    (async () => {
      try {
        const res = await montreeApi('/api/montree/events');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.events)) setEvents(data.events);
      } catch { /* offline */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // --- recent montages + polling -----------------------------------------
  const loadMontages = useCallback(async () => {
    try {
      const res = await montreeApi('/api/montree/montage?limit=20');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.montages)) setMontages(data.montages as MontageRow[]);
    } catch { /* transient — the next poll picks it up */ } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadMontages(); }, [loadMontages]);

  const hasActive = useMemo(
    () => montages.some(m => ACTIVE_STATUSES.has(m.status)),
    [montages]
  );

  // Poll only while a render is in flight — an idle Studio makes no requests.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!hasActive) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(loadMontages, 10000);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [hasActive, loadMontages]);

  // --- create -------------------------------------------------------------
  const handleCreate = async () => {
    if (creating) return;
    setShortfall(null);

    if (scope === 'child' && !childId) { toast.error(t('montage.selectChildFirst')); return; }
    if (scope === 'event' && !eventId) { toast.error(t('montage.selectEventFirst')); return; }
    if (scope === 'classroom' && !classroomId) { toast.error(t('montage.noClassroom')); return; }

    // Client owns the calendar (see the timezone note at the top).
    let dateStart: string | null = null;
    let dateEnd: string | null = null;
    if (kind === 'daily') {
      dateStart = localDate(0);
      dateEnd = dateStart;
    } else if (kind === 'weekly') {
      dateStart = localDate(-6);
      dateEnd = localDate(0);
    } else if (scope !== 'event') {
      if (!customStart || !customEnd) { toast.error(t('montage.failedToQueue')); return; }
      if (customStart > customEnd) { toast.error(t('montage.failedToQueue')); return; }
      dateStart = customStart;
      dateEnd = customEnd;
    }

    setCreating(true);
    try {
      const res = await montreeApi('/api/montree/montage', {
        method: 'POST',
        body: JSON.stringify({
          scope_type: scope,
          kind,
          classroom_id: scope === 'classroom' ? classroomId : undefined,
          child_id: scope === 'child' ? childId : undefined,
          event_id: scope === 'event' ? eventId : undefined,
          date_start: dateStart,
          date_end: dateEnd,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 503) { toast.error(t('montage.notMigrated')); return; }
      if (!res.ok) { toast.error(data?.error || t('montage.failedToQueue')); return; }

      if (data?.ok === false && data?.reason === 'insufficient_photos') {
        setShortfall({ count: data.photo_count ?? 0, min: data.min_photos ?? 8 });
        return;
      }
      if (!data?.ok) { toast.error(data?.error || t('montage.failedToQueue')); return; }

      toast.success(data?.duplicate ? t('montage.alreadyQueued') : t('montage.queued'));
      loadMontages();
    } catch (err) {
      console.error('[MontageStudio] create failed:', err);
      toast.error(t('montage.failedToQueue'));
    } finally {
      setCreating(false);
    }
  };

  // --- rendering helpers --------------------------------------------------
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

  const kindLabel = (k: string): string => {
    if (k === 'daily') return t('montage.kind.daily');
    if (k === 'weekly') return t('montage.kind.weekly');
    if (k === 'custom') return t('montage.kind.custom');
    return t('montage.kind.report');
  };

  const rangeLabel = (m: MontageRow): string => {
    if (!m.date_start && !m.date_end) return '';
    if (m.date_start && m.date_end && m.date_start === m.date_end) return m.date_start;
    return `${m.date_start || '…'} → ${m.date_end || '…'}`;
  };

  const KINDS: { key: Kind; label: string }[] = [
    { key: 'daily', label: t('montage.tab.daily') },
    { key: 'weekly', label: t('montage.tab.weekly') },
    { key: 'custom', label: t('montage.tab.custom') },
  ];

  const SCOPES: { key: Scope; label: string; icon: string }[] = [
    { key: 'classroom', label: t('montage.scope.classroom'), icon: '🏫' },
    { key: 'child', label: t('montage.scope.child'), icon: '🧒' },
    { key: 'event', label: t('montage.scope.event'), icon: '🎉' },
  ];

  const rangeHint =
    scope === 'event'
      ? t('montage.rangeEvent')
      : kind === 'daily'
        ? t('montage.rangeToday')
        : kind === 'weekly'
          ? t('montage.rangeWeek')
          : `${customStart} → ${customEnd}`;

  // Narrowed once so the player block doesn't lean on optional-chain narrowing.
  const watchingPath = watching?.output_path || '';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: T.sans }}>
      {/* --- kind pills (ZONE_TABS pattern) --- */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {KINDS.map(k => {
          const active = kind === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => { setKind(k.key); setShortfall(null); }}
              className={`btn btn-sm btn-pill ${active ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={active}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      {/* --- scope selector --- */}
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, color: T.textSecondary }}>{t('montage.scope.label')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SCOPES.map(s => {
            const active = scope === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => { setScope(s.key); setShortfall(null); }}
                className={`btn btn-sm btn-pill ${active ? 'btn-primary' : 'btn-secondary'}`}
                aria-pressed={active}
              >
                <span>{s.icon}</span>{s.label}
              </button>
            );
          })}
        </div>

        {scope === 'child' && (
          <div>
            <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
              {t('montage.selectChild')}
            </label>
            <select value={childId} onChange={e => { setChildId(e.target.value); setShortfall(null); }} style={selectStyle}>
              <option value="">{t('montage.chooseOne')}</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {scope === 'event' && (
          <div>
            <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
              {t('montage.selectEvent')}
            </label>
            {events.length > 0 ? (
              <select value={eventId} onChange={e => { setEventId(e.target.value); setShortfall(null); }} style={selectStyle}>
                <option value="">{t('montage.chooseOne')}</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.event_date})</option>
                ))}
              </select>
            ) : (
              <div style={{ fontSize: 13, color: T.textMuted }}>{t('montage.noEvents')}</div>
            )}
          </div>
        )}

        {/* Custom range — hidden for event scope, where the event IS the range. */}
        {kind === 'custom' && scope !== 'event' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
                {t('montage.dateFrom')}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={e => { setCustomStart(e.target.value); setShortfall(null); }}
                style={{ ...selectStyle, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: T.textSecondary, marginBottom: 6 }}>
                {t('montage.dateTo')}
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={e => { setCustomEnd(e.target.value); setShortfall(null); }}
                style={{ ...selectStyle, colorScheme: 'dark' }}
              />
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, color: T.textMuted }}>{rangeHint}</div>

        {shortfall && (
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: T.amberSoft, border: '1px solid rgba(245,158,11,0.30)',
            color: T.amber, fontSize: 13,
          }}>
            {t('montage.needMorePhotos', { min: shortfall.min, count: shortfall.count })}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="btn btn-primary btn-lg btn-full"
        >
          {creating ? t('montage.creating') : `🎬 ${t('montage.create')}`}
        </button>
      </div>

      {/* --- recent montages --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: T.serif, fontSize: 16, color: T.textPrimary }}>
          {t('montage.recent')}
        </div>

        {loadingList && montages.length === 0 && (
          <div style={{ fontSize: 13, color: T.textMuted }}>{t('common.loading')}</div>
        )}

        {!loadingList && montages.length === 0 && (
          <div style={{
            padding: 18, borderRadius: 14, textAlign: 'center',
            background: T.card, border: `1px solid ${T.cardBorder}`,
            color: T.textMuted, fontSize: 13,
          }}>
            {t('montage.empty')}
          </div>
        )}

        {montages.map(m => {
          const c = statusColor(m.status);
          const range = rangeLabel(m);
          return (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: 14,
                background: T.card, border: `1px solid ${T.cardBorder}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.title}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  {kindLabel(m.montage_kind)}{range ? ` · ${range}` : ''}
                </div>
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
                    style={{
                      width: 10, height: 10, borderRadius: '50%',
                      border: `2px solid ${c.fg}`, borderTopColor: 'transparent',
                      display: 'inline-block',
                    }}
                  />
                )}
                {statusLabel(m.status)}
              </span>

              {m.status === 'done' && m.output_path && (
                <button
                  type="button"
                  onClick={() => setWatching(m)}
                  className="btn btn-primary btn-sm"
                >
                  ▶ {t('montage.watch')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* --- player --- */}
      {watchingPath && watching && (
        <div
          onClick={() => setWatching(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(2,8,5,0.90)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460 }}>
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
              className="btn btn-secondary btn-md btn-full"
              style={{ marginTop: 12 }}
            >
              {t('montage.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
