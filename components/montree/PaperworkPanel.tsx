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
          fetchData(); // Refetch to get clean state
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

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-48 bg-gray-50 rounded animate-pulse mt-1" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { target_week, max_week, on_track, total, children } = data;
  const behind = children.filter(c => c.status === 'behind');
  const slightlyBehind = children.filter(c => c.status === 'slightly_behind');
  const onTrackList = children.filter(c => c.status === 'on_track');

  const statusColor = behind.length > 0
    ? 'text-red-600 bg-red-50'
    : slightlyBehind.length > 0
    ? 'text-amber-600 bg-amber-50'
    : 'text-emerald-600 bg-emerald-50';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📝</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-800">{t('paperwork.title')}</div>
            <div className="text-xs text-gray-500">
              {t('paperwork.targetWeek')}: {target_week} / {max_week}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
            {on_track}/{total} {t('paperwork.onTrack')}
          </span>
          <span className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Behind section */}
          {behind.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                🔴 {t('paperwork.behind')} ({behind.length})
              </div>
              <div className="space-y-1.5">
                {behind.map(child => (
                  <ChildRow
                    key={child.id}
                    child={child}
                    maxWeek={max_week}
                    advancing={advancing}
                    editingChild={editingChild}
                    editWeek={editWeek}
                    onAdvance={handleAdvance}
                    onStartEdit={(id, week) => { setEditingChild(id); setEditWeek(week); }}
                    onCancelEdit={() => setEditingChild(null)}
                    onSetWeek={handleSetWeek}
                    onEditWeekChange={setEditWeek}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Slightly behind section */}
          {slightlyBehind.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                🟡 {t('paperwork.slightlyBehind')} ({slightlyBehind.length})
              </div>
              <div className="space-y-1.5">
                {slightlyBehind.map(child => (
                  <ChildRow
                    key={child.id}
                    child={child}
                    maxWeek={max_week}
                    advancing={advancing}
                    editingChild={editingChild}
                    editWeek={editWeek}
                    onAdvance={handleAdvance}
                    onStartEdit={(id, week) => { setEditingChild(id); setEditWeek(week); }}
                    onCancelEdit={() => setEditingChild(null)}
                    onSetWeek={handleSetWeek}
                    onEditWeekChange={setEditWeek}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* On track section */}
          {onTrackList.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">
                🟢 {t('paperwork.onTrackLabel')} ({onTrackList.length})
              </div>
              <div className="space-y-1.5">
                {onTrackList.map(child => (
                  <ChildRow
                    key={child.id}
                    child={child}
                    maxWeek={max_week}
                    advancing={advancing}
                    editingChild={editingChild}
                    editWeek={editWeek}
                    onAdvance={handleAdvance}
                    onStartEdit={(id, week) => { setEditingChild(id); setEditWeek(week); }}
                    onCancelEdit={() => setEditingChild(null)}
                    onSetWeek={handleSetWeek}
                    onEditWeekChange={setEditWeek}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Individual child row
function ChildRow({
  child,
  maxWeek,
  advancing,
  editingChild,
  editWeek,
  onAdvance,
  onStartEdit,
  onCancelEdit,
  onSetWeek,
  onEditWeekChange,
  t,
}: {
  child: PaperworkChild;
  maxWeek: number;
  advancing: string | null;
  editingChild: string | null;
  editWeek: number;
  onAdvance: (id: string) => void;
  onStartEdit: (id: string, week: number) => void;
  onCancelEdit: () => void;
  onSetWeek: (id: string, week: number) => void;
  onEditWeekChange: (week: number) => void;
  t: (key: string) => string;
}) {
  const isEditing = editingChild === child.id;
  const isAdvancing = advancing === child.id;
  const progressPct = Math.round((child.current_week / maxWeek) * 100);

  const statusBg = child.status === 'behind'
    ? 'bg-red-50 border-red-100'
    : child.status === 'slightly_behind'
    ? 'bg-amber-50 border-amber-100'
    : 'bg-emerald-50 border-emerald-100';

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${statusBg}`}>
      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">{child.name}</div>
        <div className="flex items-center gap-2 mt-1">
          {/* Progress bar */}
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                child.status === 'behind' ? 'bg-red-400' :
                child.status === 'slightly_behind' ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 tabular-nums whitespace-nowrap">
            {child.current_week}/{maxWeek}
          </span>
        </div>
      </div>

      {/* Week display + actions */}
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={maxWeek}
            value={editWeek}
            onChange={e => onEditWeekChange(Math.max(1, Math.min(maxWeek, parseInt(e.target.value) || 1)))}
            className="w-14 text-center text-sm border border-gray-300 rounded-lg px-1 py-1"
            autoFocus
          />
          <button
            onClick={() => onSetWeek(child.id, editWeek)}
            className="text-xs bg-violet-600 text-white px-2 py-1 rounded-lg hover:bg-violet-700"
          >
            ✓
          </button>
          <button
            onClick={onCancelEdit}
            className="text-xs text-gray-400 px-1.5 py-1 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {/* Week badge — tap to edit */}
          <button
            onClick={() => onStartEdit(child.id, child.current_week)}
            className="text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg px-2.5 py-1 hover:border-violet-300 hover:text-violet-600 transition-colors tabular-nums"
            title={t('paperwork.tapToEdit')}
          >
            W{child.current_week}
          </button>
          {/* Advance button */}
          {child.current_week < maxWeek && (
            <button
              onClick={() => onAdvance(child.id)}
              disabled={!!isAdvancing}
              className="text-lg leading-none text-violet-600 hover:text-violet-800 disabled:opacity-40 transition-colors px-1"
              title={t('paperwork.advanceWeek')}
            >
              {isAdvancing ? '⏳' : '→'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
