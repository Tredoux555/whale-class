'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Check, X, ArrowRight, Pencil } from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface PaperworkChild {
  id: string;
  name: string;
  photo_url: string | null;
  current_week: number;
  target_week: number;
  weeks_behind: number;
  status: 'on_track' | 'slightly_behind' | 'behind';
}

interface PaperworkData {
  target_week: number;
  max_week: number;
  on_track: number;
  total: number;
  children: PaperworkChild[];
}

// Dark forest tokens
const T = {
  card: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.09)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 16,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.10)',
  amberStrong: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redStrong: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.40)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: 'rgba(52,211,153,0.25)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function PaperworkPanel() {
  const { t } = useI18n();
  const [data, setData] = useState<PaperworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [editingChild, setEditingChild] = useState<string | null>(null);
  const [editWeek, setEditWeek] = useState<number>(1);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState<number>(1);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/intelligence/paperwork');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      if (json.success) setData(json);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[PaperworkPanel] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  const handleAdvance = useCallback(async (childId: string) => {
    if (advancing) return;
    setAdvancing(childId);
    try {
      const res = await montreeApi('/api/montree/intelligence/paperwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, action: 'advance' }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        const result = await res.json();
        if (result.success && data) {
          setData({
            ...data,
            children: data.children.map(c =>
              c.id === childId
                ? {
                    ...c,
                    current_week: result.new_week,
                    weeks_behind: Math.max(0, data.target_week - result.new_week),
                    status: (data.target_week - result.new_week) <= 0 ? 'on_track' as const
                      : (data.target_week - result.new_week) <= 2 ? 'slightly_behind' as const
                      : 'behind' as const,
                  }
                : c
            ),
            on_track: data.children.filter(c =>
              c.id === childId
                ? (data.target_week - result.new_week) <= 0
                : c.status === 'on_track'
            ).length,
          });
        }
      } else {
        toast.error(t('paperwork.updateFailed'));
      }
    } catch {
      toast.error(t('paperwork.updateFailed'));
    } finally {
      if (mountedRef.current) setAdvancing(null);
    }
  }, [advancing, data, t]);

  const handleSetWeek = useCallback(async (childId: string, week: number) => {
    if (advancing) return;
    setAdvancing(childId);
    try {
      const res = await montreeApi('/api/montree/intelligence/paperwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, action: 'set', week }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          fetchData();
        }
      } else {
        toast.error(t('paperwork.updateFailed'));
      }
    } catch {
      toast.error(t('paperwork.updateFailed'));
    } finally {
      if (mountedRef.current) {
        setAdvancing(null);
        setEditingChild(null);
      }
    }
  }, [advancing, fetchData, t]);

  const handleSetTargetWeek = useCallback(async (week: number) => {
    try {
      const res = await montreeApi('/api/montree/intelligence/paperwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_target', week }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        setEditingTarget(false);
        fetchData();
      } else {
        toast.error(t('paperwork.updateFailed'));
      }
    } catch {
      toast.error(t('paperwork.updateFailed'));
    }
  }, [fetchData, t]);

  // Loading skeleton
  if (loading) {
    return (
      <div style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(52,211,153,0.10)',
          animation: 'pp-pulse 1.6s ease-in-out infinite',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            height: 14, width: 120, borderRadius: 6,
            background: 'rgba(52,211,153,0.10)',
            animation: 'pp-pulse 1.6s ease-in-out infinite',
          }} />
          <div style={{
            height: 10, width: 180, borderRadius: 4, marginTop: 6,
            background: 'rgba(52,211,153,0.08)',
            animation: 'pp-pulse 1.6s ease-in-out infinite',
          }} />
        </div>
        <style>{`
          @keyframes pp-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.55; }
          }
        `}</style>
      </div>
    );
  }

  if (!data) return null;

  const { target_week, max_week, on_track, total, children } = data;
  const behind = children.filter(c => c.status === 'behind').sort((a, b) => b.weeks_behind - a.weeks_behind);
  const needsAttention = children.filter(c => c.status === 'slightly_behind').sort((a, b) => b.weeks_behind - a.weeks_behind);
  const upToDate = children.filter(c => c.status === 'on_track');
  const progressPct = Math.round((on_track / Math.max(total, 1)) * 100);

  return (
    <div style={{
      background: T.card,
      border: T.cardBorder,
      borderRadius: T.cardRadius,
      backdropFilter: T.blur,
      WebkitBackdropFilter: T.blur,
      overflow: 'hidden',
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      {/* ── Summary Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: T.textPrimary,
          transition: 'background 140ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.06)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Circular progress ring */}
          <div style={{ position: 'relative', width: 40, height: 40 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="3.5" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke={progressPct >= 80 ? T.emerald : progressPct >= 50 ? T.amber : T.red}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${progressPct * 1.005} 100.5`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            </svg>
            <span style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              color: T.textPrimary,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {on_track}
            </span>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 15,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('paperwork.title')}
            </div>
            <div style={{
              fontFamily: T.sans,
              fontSize: 12,
              color: T.textMuted,
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>Week {target_week} of {max_week}</span>
              {upToDate.length === total && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  color: T.emerald,
                  background: T.emeraldStrong,
                  border: '1px solid rgba(52,211,153,0.35)',
                  padding: '1px 8px',
                  borderRadius: 999,
                }}>
                  All up to date
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {upToDate.length < total && (
            <span style={{
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.2,
              color: behind.length > 0 ? T.red : T.amber,
              background: behind.length > 0 ? T.redStrong : T.amberStrong,
              border: `1px solid ${behind.length > 0 ? T.redBorder : T.amberBorder}`,
              padding: '3px 10px',
              borderRadius: 999,
            }}>
              {total - on_track} need{total - on_track === 1 ? 's' : ''} a catch-up
            </span>
          )}
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            color={T.textMuted}
            style={{
              transition: 'transform 220ms ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div style={{
          padding: '0 18px 18px',
          borderTop: `1px solid ${T.cardBorder}`,
        }}>
          {/* Target week adjuster */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0 14px',
          }}>
            <span style={{
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              color: T.textMuted,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}>
              School week
            </span>
            {editingTarget ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min={1}
                  max={max_week}
                  value={targetInput}
                  onChange={e => setTargetInput(Math.max(1, Math.min(max_week, parseInt(e.target.value) || 1)))}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSetTargetWeek(targetInput);
                    if (e.key === 'Escape') setEditingTarget(false);
                  }}
                  style={{
                    width: 56,
                    textAlign: 'center',
                    fontFamily: T.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    border: `1.5px solid ${T.inputBorder}`,
                    borderRadius: 8,
                    padding: '5px 6px',
                    background: T.inputBg,
                    color: T.textPrimary,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => handleSetTargetWeek(targetInput)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: T.sans,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#06281a',
                    background: 'linear-gradient(180deg, #34d399, #10b981)',
                    border: '1px solid rgba(52,211,153,0.55)',
                    borderRadius: 8,
                    padding: '5px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <Check size={11} strokeWidth={2.5} />
                  Set
                </button>
                <button
                  onClick={() => setEditingTarget(false)}
                  style={{
                    fontFamily: T.sans,
                    fontSize: 12,
                    color: T.textMuted,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingTarget(true); setTargetInput(target_week); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: T.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.textPrimary,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                Week {target_week}
                <Pencil size={10} strokeWidth={1.75} color={T.textMuted} />
              </button>
            )}
          </div>

          {/* ── Needs Catch-Up ── */}
          {behind.length > 0 && (
            <Section
              label={`Needs catch-up (${behind.length})`}
              dotColor={T.red}
              bgColor={T.redSoft}
              defaultOpen
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {behind.map(child => (
                  <ChildRow
                    key={child.id}
                    child={child}
                    maxWeek={max_week}
                    targetWeek={target_week}
                    advancing={advancing}
                    editingChild={editingChild}
                    editWeek={editWeek}
                    onAdvance={handleAdvance}
                    onStartEdit={(id, week) => { setEditingChild(id); setEditWeek(week); }}
                    onCancelEdit={() => setEditingChild(null)}
                    onSetWeek={handleSetWeek}
                    onEditWeekChange={setEditWeek}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ── Almost There ── */}
          {needsAttention.length > 0 && (
            <Section
              label={`Almost there (${needsAttention.length})`}
              dotColor={T.amber}
              bgColor={T.amberSoft}
              defaultOpen
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {needsAttention.map(child => (
                  <ChildRow
                    key={child.id}
                    child={child}
                    maxWeek={max_week}
                    targetWeek={target_week}
                    advancing={advancing}
                    editingChild={editingChild}
                    editWeek={editWeek}
                    onAdvance={handleAdvance}
                    onStartEdit={(id, week) => { setEditingChild(id); setEditWeek(week); }}
                    onCancelEdit={() => setEditingChild(null)}
                    onSetWeek={handleSetWeek}
                    onEditWeekChange={setEditWeek}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ── Up to Date — collapsed by default ── */}
          {upToDate.length > 0 && (
            <Section
              label={`Up to date (${upToDate.length})`}
              dotColor={T.emerald}
              bgColor={T.emeraldSoft}
              defaultOpen={false}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
                {upToDate.map(child => (
                  <CompactChildCard
                    key={child.id}
                    child={child}
                    maxWeek={max_week}
                    targetWeek={target_week}
                    advancing={advancing}
                    editingChild={editingChild}
                    editWeek={editWeek}
                    onAdvance={handleAdvance}
                    onStartEdit={(id, week) => { setEditingChild(id); setEditWeek(week); }}
                    onCancelEdit={() => setEditingChild(null)}
                    onSetWeek={handleSetWeek}
                    onEditWeekChange={setEditWeek}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Collapsible Section ── */
function Section({ label, dotColor, bgColor, defaultOpen, children }: {
  label: string;
  dotColor: string;
  bgColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: T.sans,
          fontSize: 11,
          fontWeight: 700,
          color: T.textSecondary,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 0',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          width: '100%',
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dotColor, flexShrink: 0,
          boxShadow: `0 0 0 2px rgba(${dotColor === T.red ? '239,68,68' : dotColor === T.amber ? '245,158,11' : '52,211,153'},0.18)`,
        }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        <ChevronDown
          size={11}
          strokeWidth={2}
          color={T.textMuted}
          style={{
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open && (
        <div style={{
          marginTop: 6,
          background: bgColor,
          borderRadius: 12,
          padding: 8,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Compact card for up-to-date children (grid layout) ── */
function CompactChildCard({ child, maxWeek, advancing, editingChild, editWeek, onAdvance, onStartEdit, onCancelEdit, onSetWeek, onEditWeekChange }: {
  child: PaperworkChild;
  maxWeek: number;
  targetWeek: number;
  advancing: string | null;
  editingChild: string | null;
  editWeek: number;
  onAdvance: (id: string) => void;
  onStartEdit: (id: string, week: number) => void;
  onCancelEdit: () => void;
  onSetWeek: (id: string, week: number) => void;
  onEditWeekChange: (week: number) => void;
}) {
  const isEditing = editingChild === child.id;
  const isAdvancing = advancing === child.id;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 10px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      border: '1px solid rgba(52,211,153,0.18)',
    }}>
      <span style={{
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: 500,
        color: T.textPrimary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        marginRight: 8,
      }}>
        {child.name}
      </span>
      {isEditing ? (
        <InlineEditor
          week={editWeek}
          maxWeek={maxWeek}
          onChange={onEditWeekChange}
          onConfirm={() => onSetWeek(child.id, editWeek)}
          onCancel={onCancelEdit}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => onStartEdit(child.id, child.current_week)}
            style={{
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              color: T.emerald,
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.30)',
              borderRadius: 6,
              padding: '2px 8px',
              cursor: 'pointer',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            W{child.current_week}
          </button>
          {child.current_week < maxWeek && (
            <button
              onClick={() => onAdvance(child.id)}
              disabled={!!isAdvancing}
              aria-label="Advance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 22,
                color: T.emerald,
                background: 'transparent',
                border: 'none',
                cursor: isAdvancing ? 'default' : 'pointer',
                opacity: isAdvancing ? 0.4 : 1,
              }}
            >
              {isAdvancing ? '...' : <ArrowRight size={13} strokeWidth={2} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Full child row for behind/slightly behind ── */
function ChildRow({ child, maxWeek, targetWeek, advancing, editingChild, editWeek, onAdvance, onStartEdit, onCancelEdit, onSetWeek, onEditWeekChange }: {
  child: PaperworkChild;
  maxWeek: number;
  targetWeek: number;
  advancing: string | null;
  editingChild: string | null;
  editWeek: number;
  onAdvance: (id: string) => void;
  onStartEdit: (id: string, week: number) => void;
  onCancelEdit: () => void;
  onSetWeek: (id: string, week: number) => void;
  onEditWeekChange: (week: number) => void;
}) {
  const isEditing = editingChild === child.id;
  const isAdvancing = advancing === child.id;
  const progressPct = Math.round((child.current_week / targetWeek) * 100);
  const weeksToGo = targetWeek - child.current_week;

  const isSlightly = child.status === 'slightly_behind';
  const barColor = isSlightly ? T.amber : T.red;
  const borderColor = isSlightly ? 'rgba(245,158,11,0.30)' : 'rgba(239,68,68,0.30)';
  const trackBg = isSlightly ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      border: `1px solid ${borderColor}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 500,
            color: T.textPrimary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {child.name}
          </span>
          <span style={{
            fontFamily: T.sans,
            fontSize: 10,
            color: T.textMuted,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {weeksToGo} week{weeksToGo !== 1 ? 's' : ''} to go
          </span>
        </div>
        <div style={{
          marginTop: 6,
          height: 5,
          background: trackBg,
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(progressPct, 100)}%`,
            background: barColor,
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {isEditing ? (
        <InlineEditor
          week={editWeek}
          maxWeek={maxWeek}
          onChange={onEditWeekChange}
          onConfirm={() => onSetWeek(child.id, editWeek)}
          onCancel={onCancelEdit}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onStartEdit(child.id, child.current_week)}
            style={{
              fontFamily: T.sans,
              fontSize: 12,
              fontWeight: 700,
              color: T.textPrimary,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: 'pointer',
              fontVariantNumeric: 'tabular-nums',
              transition: 'all 120ms ease',
            }}
          >
            W{child.current_week}
          </button>
          {child.current_week < maxWeek && (
            <button
              onClick={() => onAdvance(child.id)}
              disabled={!!isAdvancing}
              aria-label="Advance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 26,
                color: T.textSecondary,
                background: 'transparent',
                border: 'none',
                cursor: isAdvancing ? 'default' : 'pointer',
                opacity: isAdvancing ? 0.4 : 1,
                transition: 'color 120ms ease',
              }}
              onMouseEnter={e => { if (!isAdvancing) e.currentTarget.style.color = T.textPrimary; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.textSecondary; }}
            >
              {isAdvancing ? '...' : <ArrowRight size={15} strokeWidth={2} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Shared inline week editor ── */
function InlineEditor({ week, maxWeek, onChange, onConfirm, onCancel }: {
  week: number;
  maxWeek: number;
  onChange: (w: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <input
        type="number"
        min={1}
        max={maxWeek}
        value={week}
        onChange={e => onChange(Math.max(1, Math.min(maxWeek, parseInt(e.target.value) || 1)))}
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') onConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        style={{
          width: 50,
          textAlign: 'center',
          fontFamily: T.sans,
          fontSize: 12,
          fontWeight: 600,
          border: `1.5px solid ${T.inputBorder}`,
          borderRadius: 8,
          padding: '4px',
          background: T.inputBg,
          color: T.textPrimary,
          outline: 'none',
        }}
      />
      <button
        onClick={onConfirm}
        aria-label="Confirm"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          fontFamily: T.sans,
          color: '#06281a',
          background: 'linear-gradient(180deg, #34d399, #10b981)',
          border: '1px solid rgba(52,211,153,0.55)',
          borderRadius: 6,
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <Check size={12} strokeWidth={2.5} />
      </button>
      <button
        onClick={onCancel}
        aria-label="Cancel"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          color: T.textMuted,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <X size={12} strokeWidth={1.75} />
      </button>
    </div>
  );
}
