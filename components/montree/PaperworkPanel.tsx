'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
        background: 'white',
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4' }} className="animate-pulse" />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: 120, background: '#f0fdf4', borderRadius: 6 }} className="animate-pulse" />
            <div style={{ height: 10, width: 180, background: '#f0fdf4', borderRadius: 4, marginTop: 6 }} className="animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { target_week, max_week, on_track, total, children } = data;
  const behind = children.filter(c => c.status === 'behind');
  const needsAttention = children.filter(c => c.status === 'slightly_behind');
  const upToDate = children.filter(c => c.status === 'on_track');
  const progressPct = Math.round((on_track / Math.max(total, 1)) * 100);

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      {/* ── Summary Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Circular progress ring */}
          <div style={{ position: 'relative', width: 40, height: 40 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
              <circle
                cx="20" cy="20" r="16" fill="none"
                stroke={progressPct >= 80 ? '#4ade80' : progressPct >= 50 ? '#fbbf24' : '#F5B7B1'}
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
              fontSize: 11,
              fontWeight: 700,
              color: '#374151',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {on_track}
            </span>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', letterSpacing: -0.2 }}>
              {t('paperwork.title')}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Week {target_week} of {max_week}</span>
              {upToDate.length === total && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#2E7D32',
                  background: 'rgba(76, 175, 80, 0.1)',
                  padding: '1px 8px',
                  borderRadius: 10,
                }}>
                  All up to date
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Friendly summary pill */}
          {upToDate.length < total && (
            <span style={{
              fontSize: 12,
              fontWeight: 500,
              color: behind.length > 0 ? '#BF360C' : '#F57F17',
              background: behind.length > 0 ? 'rgba(255, 138, 101, 0.12)' : 'rgba(255, 183, 77, 0.15)',
              padding: '3px 10px',
              borderRadius: 10,
            }}>
              {total - on_track} need{total - on_track === 1 ? 's' : ''} a catch-up
            </span>
          )}
          <span style={{
            color: '#9ca3af',
            transition: 'transform 0.25s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            fontSize: 12,
          }}>
            ▼
          </span>
        </div>
      </button>

      {/* ── Expanded Detail ── */}
      {expanded && (
        <div style={{
          padding: '0 20px 20px',
          borderTop: '1px solid #f3f4f6',
        }}>
          {/* Target week adjuster */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0 16px',
          }}>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
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
                  style={{
                    width: 52,
                    textAlign: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    border: '1.5px solid #d1d5db',
                    borderRadius: 8,
                    padding: '4px 6px',
                    background: 'white',
                    color: '#1f2937',
                    outline: 'none',
                  }}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSetTargetWeek(targetInput);
                    if (e.key === 'Escape') setEditingTarget(false);
                  }}
                />
                <button
                  onClick={() => handleSetTargetWeek(targetInput)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'white',
                    background: '#059669',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 10px',
                    cursor: 'pointer',
                  }}
                >
                  Set
                </button>
                <button
                  onClick={() => setEditingTarget(false)}
                  style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    background: 'none',
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
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '4px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; }}
              >
                Week {target_week}
                <span style={{ fontSize: 10, color: '#A1887F' }}>Edit</span>
              </button>
            )}
          </div>

          {/* ── Up to Date ── */}
          {upToDate.length > 0 && (
            <Section
              label={`Up to date (${upToDate.length})`}
              color="#2E7D32"
              bgColor="rgba(76, 175, 80, 0.06)"
              defaultOpen={upToDate.length < total}
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

          {/* ── Needs Attention (slightly behind — 1-2 weeks) ── */}
          {needsAttention.length > 0 && (
            <Section
              label={`Almost there (${needsAttention.length})`}
              color="#E65100"
              bgColor="rgba(255, 167, 38, 0.06)"
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

          {/* ── Needs Catch-Up (3+ weeks behind) ── */}
          {behind.length > 0 && (
            <Section
              label={`Needs catch-up (${behind.length})`}
              color="#BF360C"
              bgColor="rgba(255, 138, 101, 0.06)"
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
        </div>
      )}
    </div>
  );
}

/* ── Collapsible Section ── */
function Section({ label, color, bgColor, defaultOpen, children }: {
  label: string;
  color: string;
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
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          color,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          width: '100%',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color, opacity: 0.7, flexShrink: 0,
        }} />
        {label}
        <span style={{
          fontSize: 9,
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          marginLeft: 2,
        }}>▼</span>
      </button>
      {open && (
        <div style={{
          marginTop: 6,
          background: bgColor,
          borderRadius: 12,
          padding: 8,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Compact card for up-to-date children (grid layout) ── */
function CompactChildCard({ child, maxWeek, targetWeek, advancing, editingChild, editWeek, onAdvance, onStartEdit, onCancelEdit, onSetWeek, onEditWeekChange }: {
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
      background: 'white',
      borderRadius: 10,
      border: '1px solid rgba(76, 175, 80, 0.12)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: 8 }}>
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
              fontSize: 11,
              fontWeight: 600,
              color: '#2E7D32',
              background: 'rgba(76, 175, 80, 0.1)',
              border: 'none',
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
              style={{
                fontSize: 14,
                color: '#81C784',
                background: 'none',
                border: 'none',
                cursor: isAdvancing ? 'default' : 'pointer',
                opacity: isAdvancing ? 0.4 : 1,
                padding: '0 2px',
                lineHeight: 1,
              }}
            >
              {isAdvancing ? '...' : '→'}
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
  const barColor = isSlightly ? '#FFB74D' : '#EF9A9A';
  const borderColor = isSlightly ? 'rgba(255, 167, 38, 0.15)' : 'rgba(239, 154, 154, 0.2)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      background: 'white',
      borderRadius: 10,
      border: `1px solid ${borderColor}`,
    }}>
      {/* Name + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {child.name}
          </span>
          <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {weeksToGo} week{weeksToGo !== 1 ? 's' : ''} to go
          </span>
        </div>
        {/* Progress bar */}
        <div style={{
          marginTop: 6,
          height: 5,
          background: '#f3f4f6',
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

      {/* Week + actions */}
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
              fontSize: 12,
              fontWeight: 700,
              color: '#374151',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '3px 10px',
              cursor: 'pointer',
              fontVariantNumeric: 'tabular-nums',
              transition: 'all 0.15s',
            }}
          >
            W{child.current_week}
          </button>
          {child.current_week < maxWeek && (
            <button
              onClick={() => onAdvance(child.id)}
              disabled={!!isAdvancing}
              style={{
                fontSize: 16,
                color: '#6b7280',
                background: 'none',
                border: 'none',
                cursor: isAdvancing ? 'default' : 'pointer',
                opacity: isAdvancing ? 0.4 : 1,
                padding: '0 2px',
                lineHeight: 1,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (!isAdvancing) e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; }}
            >
              {isAdvancing ? '...' : '→'}
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
        style={{
          width: 48,
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 600,
          border: '1.5px solid #d1d5db',
          borderRadius: 8,
          padding: '3px 4px',
          background: 'white',
          color: '#1f2937',
          outline: 'none',
        }}
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') onConfirm();
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        onClick={onConfirm}
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'white',
          background: '#059669',
          border: 'none',
          borderRadius: 6,
          padding: '3px 8px',
          cursor: 'pointer',
        }}
      >
        ✓
      </button>
      <button
        onClick={onCancel}
        style={{
          fontSize: 11,
          color: '#9ca3af',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '3px 4px',
        }}
      >
        ✕
      </button>
    </div>
  );
}
