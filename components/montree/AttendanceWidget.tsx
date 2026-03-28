'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface AttendanceChild {
  id: string;
  name: string;
  photo_url: string | null;
  present: boolean;
  has_photos: boolean;
  manually_marked: boolean;
}

interface AttendanceData {
  date: string;
  children: AttendanceChild[];
  present_count: number;
  total_count: number;
}

export default function AttendanceWidget() {
  const { t } = useI18n();
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null); // child_id being marked
  const [expanded, setExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const markingRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAttendance = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/attendance');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setData(json);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[AttendanceWidget] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    return () => { abortRef.current?.abort(); };
  }, [fetchAttendance]);

  const handleMarkPresent = useCallback(async (childId: string) => {
    // Use ref for stale-closure-safe guard
    if (markingRef.current) return;
    markingRef.current = childId;
    setMarking(childId);
    try {
      const res = await montreeApi('/api/montree/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        // Optimistic update
        setData(prev => {
          if (!prev) return prev;
          const updated = prev.children.map(c =>
            c.id === childId ? { ...c, present: true, manually_marked: true } : c
          );
          // Re-sort: absent first, then alphabetical
          updated.sort((a, b) => {
            if (a.present === b.present) return a.name.localeCompare(b.name);
            return a.present ? 1 : -1;
          });
          return {
            ...prev,
            children: updated,
            present_count: updated.filter(c => c.present).length,
          };
        });
        toast.success(t('attendance.markedPresent'));
      } else {
        toast.error(t('attendance.markFailed'));
      }
    } catch (err) {
      console.error('[AttendanceWidget] Mark present error:', err);
      if (mountedRef.current) toast.error(t('attendance.markFailed'));
    } finally {
      markingRef.current = null;
      if (mountedRef.current) setMarking(null);
    }
  }, [t]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-32 mb-2" />
        <div className="h-8 bg-gray-50 rounded w-full" />
      </div>
    );
  }

  if (!data || data.total_count === 0) return null;

  const absentChildren = data.children.filter(c => !c.present);
  const presentChildren = data.children.filter(c => c.present);
  const allPresent = absentChildren.length === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Summary bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('attendance.title')}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📋</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-700">
              {t('attendance.title')}
            </div>
            <div className="text-xs text-gray-500">
              {allPresent
                ? t('attendance.allPresent')
                : t('attendance.summary')
                    .replace('{present}', String(data.present_count))
                    .replace('{total}', String(data.total_count))
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Attendance fraction badge */}
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            allPresent
              ? 'bg-emerald-100 text-emerald-700'
              : data.present_count >= data.total_count * 0.8
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
          }`}>
            {data.present_count}/{data.total_count}
          </span>
          <span className={`text-gray-400 transition-transform duration-200 text-xs ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Absent children — actionable */}
          {absentChildren.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                {t('attendance.notYetSeen')} ({absentChildren.length})
              </div>
              <div className="space-y-1.5">
                {absentChildren.map(child => (
                  <div key={child.id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      {child.photo_url ? (
                        <img src={child.photo_url} alt={child.name} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                          {child.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm text-gray-700">{child.name}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkPresent(child.id); }}
                      disabled={marking === child.id}
                      className="text-xs px-2.5 py-1 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors font-medium"
                    >
                      {marking === child.id ? '...' : t('attendance.markPresent')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Present children — compact */}
          {presentChildren.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {t('attendance.present')} ({presentChildren.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presentChildren.map(child => (
                  <div key={child.id} className="flex items-center gap-1 bg-emerald-50 rounded-full px-2 py-1">
                    {child.photo_url ? (
                      <img src={child.photo_url} alt={child.name} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                        {child.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs text-emerald-700">{child.name}</span>
                    {child.has_photos && <span className="text-[10px]">📸</span>}
                    {child.manually_marked && !child.has_photos && <span className="text-[10px]">✋</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {allPresent && (
            <div className="text-center py-2">
              <span className="text-2xl">🎉</span>
              <p className="text-sm text-emerald-600 font-medium mt-1">{t('attendance.everyoneHere')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
