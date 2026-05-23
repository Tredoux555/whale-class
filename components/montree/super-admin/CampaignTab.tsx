'use client';

// components/montree/super-admin/CampaignTab.tsx
// Campaign Command Center — the video-marketing rollout war room.
//
// The push, the record, the motivation:
//   - "Next up" card tells you the one thing to do now.
//   - Overdue flags in red.
//   - Progress bar across the whole 13-video campaign.
//   - A status pipeline (idea → scripted → filmed → scheduled → posted).
//   - List view to edit every video (script, platforms, schedule).
//   - Calendar view mirroring the Montree calendar — scheduled posts on a grid.
//
// Internal super-admin tool — English only by design.

import { useCallback, useEffect, useMemo, useState } from 'react';

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  red: '#fca5a5',
  redSoft: 'rgba(239,68,68,0.12)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.75)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface CampaignItem {
  id: string;
  title: string;
  feature_key: string | null;
  video_type: string;
  tier: number | null;
  script: string | null;
  status: string;
  platforms: string[];
  scheduled_for: string | null;
  posted_at: string | null;
  sort_order: number;
  notes: string | null;
}

interface Stats {
  total: number;
  posted: number;
  progress_pct: number;
  status_counts: Record<string, number>;
  next_up: CampaignItem | null;
  overdue: CampaignItem[];
  overdue_count: number;
}

const STATUS_ORDER = ['idea', 'scripted', 'filmed', 'scheduled', 'posted'] as const;
type Status = (typeof STATUS_ORDER)[number];

const STATUS_META: Record<Status, { label: string; color: string; nextAction: string }> = {
  idea:      { label: 'Idea',      color: 'rgba(255,255,255,0.45)', nextAction: 'Write the script' },
  scripted:  { label: 'Scripted',  color: '#60a5fa',                nextAction: 'Film it in HeyGen' },
  filmed:    { label: 'Filmed',    color: T.gold,                   nextAction: 'Schedule the post' },
  scheduled: { label: 'Scheduled', color: T.emeraldDim,             nextAction: 'Post it natively to each platform' },
  posted:    { label: 'Posted',    color: T.emerald,                nextAction: 'Done' },
};

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok', reels: 'Reels', shorts: 'Shorts', linkedin: 'LinkedIn',
};
const ALL_PLATFORMS = ['tiktok', 'reels', 'shorts', 'linkedin'];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Main ───────────────────────────────────────────────────────────
export default function CampaignTab({ sessionToken }: { sessionToken: string }) {
  const [items, setItems] = useState<CampaignItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/super-admin/campaign', {
        headers: { 'x-super-admin-token': sessionToken },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not load the campaign.');
        return;
      }
      if (data.migration_pending) setMigrationPending(true);
      setItems(data.items || []);
      setStats(data.stats || null);
      setError(null);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => { void load(); }, [load]);

  const patchItem = useCallback(async (id: string, updates: Partial<CampaignItem>) => {
    const res = await fetch('/api/montree/super-admin/campaign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-super-admin-token': sessionToken },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) await load();
    return res.ok;
  }, [sessionToken, load]);

  const deleteItem = useCallback(async (id: string) => {
    if (!confirm('Delete this video from the campaign?')) return;
    const res = await fetch(`/api/montree/super-admin/campaign?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-super-admin-token': sessionToken },
    });
    if (res.ok) await load();
  }, [sessionToken, load]);

  if (loading) {
    return <div style={{ padding: 40, color: T.textSecondary, fontFamily: T.sans }}>Loading the campaign…</div>;
  }

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: -0.3 }}>
          📣 Campaign Command Center
        </h2>
        <p style={{ color: T.textSecondary, fontSize: 13, margin: '6px 0 0' }}>
          The video rollout — your war room. Write it, film it, schedule it, post it.
        </p>
      </div>

      {migrationPending && (
        <div style={{ padding: 14, borderRadius: 12, marginBottom: 16, background: 'rgba(232,201,106,0.10)', border: '1px solid rgba(232,201,106,0.40)', color: T.gold, fontSize: 13 }}>
          ⚠️ The campaign table isn&apos;t set up yet. Run <code>migrations/231_campaign_command_center.sql</code> in Supabase — it creates the table and seeds all 13 videos.
        </div>
      )}

      {error && (
        <div style={{ padding: 12, borderRadius: 10, marginBottom: 14, background: T.redSoft, border: '1px solid rgba(239,68,68,0.32)', color: T.red, fontSize: 13 }}>
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* The push — next-up + overdue */}
          <div style={{ display: 'grid', gridTemplateColumns: stats.overdue_count > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: T.cardBgStrong, border: `1px solid ${T.emerald}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, color: T.emeraldDim, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600, marginBottom: 6 }}>
                Next up
              </div>
              {stats.next_up ? (
                <>
                  <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 500 }}>{stats.next_up.title}</div>
                  <div style={{ fontSize: 13, color: T.emerald, marginTop: 4 }}>
                    → {STATUS_META[(stats.next_up.status as Status)] ? STATUS_META[stats.next_up.status as Status].nextAction : 'Move it forward'}
                  </div>
                </>
              ) : (
                <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 500, color: T.emerald }}>
                  🎉 Every video is posted. Campaign complete.
                </div>
              )}
            </div>
            {stats.overdue_count > 0 && (
              <div style={{ background: T.redSoft, border: '1px solid rgba(239,68,68,0.45)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, color: T.red, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600, marginBottom: 6 }}>
                  Overdue · {stats.overdue_count}
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary }}>
                  {stats.overdue.map((o) => o.title).join(' · ')}
                </div>
              </div>
            )}
          </div>

          {/* Progress + pipeline */}
          <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: 14, padding: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: T.textSecondary }}>
                {stats.posted} of {stats.total} videos posted
              </span>
              <span style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.emerald }}>
                {stats.progress_pct}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(0,0,0,0.35)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.progress_pct}%`, background: T.emerald, transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {STATUS_ORDER.map((s) => (
                <span key={s} style={{ fontSize: 12, color: T.textMuted }}>
                  <span style={{ color: STATUS_META[s].color, fontWeight: 600 }}>{stats.status_counts[s] || 0}</span>{' '}
                  {STATUS_META[s].label}
                </span>
              ))}
            </div>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['list', 'calendar'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '7px 14px', borderRadius: 999,
                  background: view === v ? T.emerald : T.cardBg,
                  color: view === v ? '#0a1a0f' : T.textSecondary,
                  border: view === v ? 'none' : T.cardBorder,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {v === 'list' ? '☰ List' : '🗓 Calendar'}
              </button>
            ))}
          </div>

          {view === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onPatch={patchItem}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          ) : (
            <CalendarView items={items} />
          )}
        </>
      )}
    </div>
  );
}

// ── Item row ───────────────────────────────────────────────────────
function ItemRow({
  item,
  expanded,
  onToggle,
  onPatch,
  onDelete,
}: {
  item: CampaignItem;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (id: string, updates: Partial<CampaignItem>) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [script, setScript] = useState(item.script || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [platforms, setPlatforms] = useState<string[]>(item.platforms || []);
  const [scheduledFor, setScheduledFor] = useState(item.scheduled_for || '');
  const [saving, setSaving] = useState(false);

  const meta = STATUS_META[(item.status as Status)] || STATUS_META.idea;

  async function save() {
    setSaving(true);
    await onPatch(item.id, { script, notes, platforms, scheduled_for: scheduledFor || null });
    setSaving(false);
  }

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  return (
    <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: 12, overflow: 'hidden' }}>
      {/* Collapsed row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <button
          onClick={onToggle}
          style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: T.textPrimary, fontFamily: T.sans }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {item.video_type === 'hero' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: T.gold, background: 'rgba(232,201,106,0.15)', padding: '2px 6px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Hero
              </span>
            )}
            {item.tier != null && (
              <span style={{ fontSize: 10, color: T.textMuted }}>Tier {item.tier}</span>
            )}
            <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 500 }}>{item.title}</span>
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>
            {item.platforms.length > 0 ? item.platforms.map((p) => PLATFORM_LABELS[p] || p).join(' · ') : 'no platforms set'}
            {item.scheduled_for ? `  ·  ${fmtDate(item.scheduled_for)}` : ''}
          </div>
        </button>
        {/* Quick status advance */}
        <select
          value={item.status}
          onChange={(e) => onPatch(item.id, { status: e.target.value })}
          style={{
            background: T.inputBg, color: meta.color, border: `1px solid ${meta.color}`,
            borderRadius: 8, padding: '6px 8px', fontSize: 12, fontWeight: 600, fontFamily: T.sans, cursor: 'pointer',
          }}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} style={{ color: '#000' }}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <button
          onClick={onToggle}
          style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 12, padding: 4 }}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div style={{ padding: '4px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '12px 0' }}>
            <label style={{ fontSize: 12, color: T.emeraldDim }}>
              Post date{' '}
              <input
                type="date"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                style={{ background: T.inputBg, color: T.textPrimary, border: T.cardBorder, borderRadius: 8, padding: '6px 8px', fontSize: 13, fontFamily: T.sans }}
              />
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {ALL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  style={{
                    padding: '5px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', fontFamily: T.sans,
                    background: platforms.includes(p) ? T.emeraldSoft : 'transparent',
                    color: platforms.includes(p) ? T.emerald : T.textMuted,
                    border: platforms.includes(p) ? `1px solid ${T.emerald}` : T.cardBorder,
                  }}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <label style={{ fontSize: 12, color: T.emeraldDim, display: 'block', marginBottom: 4 }}>Script</label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={8}
            placeholder="The script for this video lives here — the system of record."
            style={{
              width: '100%', background: T.inputBg, color: T.textPrimary, border: T.cardBorder,
              borderRadius: 8, padding: 10, fontSize: 13, fontFamily: T.sans, resize: 'vertical', outline: 'none',
            }}
          />

          <label style={{ fontSize: 12, color: T.emeraldDim, display: 'block', margin: '10px 0 4px' }}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Hooks, caption variants, anything per-platform."
            style={{
              width: '100%', background: T.inputBg, color: T.textPrimary, border: T.cardBorder,
              borderRadius: 8, padding: 10, fontSize: 13, fontFamily: T.sans, resize: 'vertical', outline: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button
              onClick={() => onDelete(item.id)}
              style={{ background: 'none', border: '1px solid rgba(239,68,68,0.4)', color: T.red, borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}
            >
              Delete
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              style={{ background: T.emerald, border: 'none', color: '#0a1a0f', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Calendar view ──────────────────────────────────────────────────
function CalendarView({ items }: { items: CampaignItem[] }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const { cells, monthLabel } = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDate: Record<string, CampaignItem[]> = {};
    for (const it of items) {
      if (it.scheduled_for) {
        (byDate[it.scheduled_for] ||= []).push(it);
      }
    }

    const grid: Array<{ day: number; iso: string; items: CampaignItem[] } | null> = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({ day: d, iso, items: byDate[iso] || [] });
    }
    return {
      cells: grid,
      monthLabel: base.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    };
  }, [items, monthOffset]);

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => setMonthOffset((m) => m - 1)} style={navBtn()}>‹</button>
        <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 500 }}>{monthLabel}</span>
        <button onClick={() => setMonthOffset((m) => m + 1)} style={navBtn()}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, color: T.textMuted, padding: 4 }}>{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            style={{
              minHeight: 64, borderRadius: 8, padding: 4,
              background: cell ? (cell.iso === todayISO ? 'rgba(52,211,153,0.12)' : 'rgba(0,0,0,0.20)') : 'transparent',
              border: cell?.iso === todayISO ? `1px solid ${T.emerald}` : '1px solid transparent',
            }}
          >
            {cell && (
              <>
                <div style={{ fontSize: 11, color: cell.iso === todayISO ? T.emerald : T.textMuted, fontWeight: 600 }}>
                  {cell.day}
                </div>
                {cell.items.map((it) => (
                  <div
                    key={it.id}
                    title={it.title}
                    style={{
                      fontSize: 9, marginTop: 2, padding: '2px 4px', borderRadius: 4,
                      background: it.status === 'posted' ? T.emeraldSoft : 'rgba(232,201,106,0.15)',
                      color: it.status === 'posted' ? T.emerald : T.gold,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {it.title}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: T.textMuted, marginTop: 10 }}>
        Set a post date on any video in the List view and it lands here.
      </p>
    </div>
  );
}

function navBtn(): React.CSSProperties {
  return {
    background: T.cardBg, border: T.cardBorder, color: T.textPrimary,
    borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer',
  };
}
