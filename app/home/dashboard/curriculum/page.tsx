'use client';

// /home/dashboard/curriculum/page.tsx
// Editable curriculum browser — toggle, reorder, delete works

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface CurriculumWork {
  id: string;
  work_name: string;
  area: string;
  sequence: number;
  is_active: boolean;
  description: string;
  home_tip: string;
  buy_or_make: string;
  estimated_cost: string;
  home_age_start: string;
  home_priority: string;
}

interface AreaGroup {
  meta: { name: string; icon: string; color: string };
  works: CurriculumWork[];
}

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  essential: { label: 'Essential', color: 'text-emerald-600 bg-emerald-50' },
  recommended: { label: 'Recommended', color: 'text-blue-600 bg-blue-50' },
  enrichment: { label: 'Enrichment', color: 'text-purple-600 bg-purple-50' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export default function CurriculumBrowserPage() {
  const router = useRouter();
  const [byArea, setByArea] = useState<Record<string, AreaGroup>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set(['practical_life']));
  const [expandedWork, setExpandedWork] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState(false); // prevents double-clicks during edit ops

  const loadCurriculum = useCallback((fid: string, includeInactive = false) => {
    const url = `/api/home/curriculum?family_id=${fid}${includeInactive ? '&include_inactive=true' : ''}`;
    setErrorMsg(null);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          const msg = `${data.error}${data.debug?.message ? ` — ${data.debug.message}` : ''}`;
          toast.error(`API error: ${msg}`);
          setErrorMsg(msg);
          console.error('Curriculum API error:', data);
        }
        if (data.seedError) {
          toast.error(data.seedError);
          console.error('Seed error:', data.seedError);
        }
        setByArea(data.byArea || {});
        setLoading(false);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Network error';
        toast.error('Failed to load curriculum');
        setErrorMsg(msg);
        console.error('Curriculum fetch error:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const session = getHomeSession();
    if (!session) {
      router.push('/home/login');
      return;
    }
    setFamilyId(session.family.id);
    loadCurriculum(session.family.id);
  }, [router, loadCurriculum]);

  const toggleArea = (area: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const toggleWorkActive = async (workId: string, currentlyActive: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/home/curriculum/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_id: workId, is_active: !currentlyActive }),
      });
      const data = await res.json();
      if (data.success && familyId) {
        loadCurriculum(familyId, true);
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setBusy(false);
    }
  };

  const moveWork = async (workId: string, areaKey: string, direction: 'up' | 'down') => {
    if (busy) return;
    const group = byArea[areaKey];
    if (!group) return;

    const works = [...group.works];
    const idx = works.findIndex((w) => w.id === workId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === works.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

    setBusy(true);
    try {
      // Swap sequences — verify both updates succeed
      const [res1, res2] = await Promise.all([
        fetch('/api/home/curriculum/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ work_id: works[idx].id, sequence: works[swapIdx].sequence }),
        }),
        fetch('/api/home/curriculum/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ work_id: works[swapIdx].id, sequence: works[idx].sequence }),
        }),
      ]);
      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
      if (!data1.success || !data2.success) {
        toast.error('Reorder partially failed — refreshing');
        console.error('Reorder results:', { data1, data2 });
      }
      if (familyId) loadCurriculum(familyId, true);
    } catch {
      toast.error('Failed to reorder');
    } finally {
      setBusy(false);
    }
  };

  const deleteWork = async (workId: string, workName: string) => {
    if (busy) return;
    if (!confirm(`Remove "${workName}" from your curriculum?`)) return;

    setBusy(true);
    try {
      const res = await fetch('/api/home/curriculum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_id: workId }),
      });
      const data = await res.json();
      if (data.success && familyId) {
        toast.success(`Removed ${workName}`);
        loadCurriculum(familyId, true);
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">📚</div>
      </div>
    );
  }

  const totalWorks = Object.values(byArea).reduce((sum, g) => sum + g.works.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Home Curriculum</h1>
            <p className="text-gray-500">{totalWorks} Montessori activities</p>
          </div>
          {totalWorks > 0 && (
            <button
              onClick={() => {
                const nextMode = !editMode;
                setEditMode(nextMode);
                if (familyId) loadCurriculum(familyId, nextMode);
              }}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                editMode
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
              }`}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          )}
        </div>

        {/* Error state */}
        {errorMsg && totalWorks === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center mb-6 border border-red-100">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Curriculum failed to load</h2>
            <p className="text-gray-500 mb-4">{errorMsg}</p>
            <button
              onClick={() => familyId && loadCurriculum(familyId)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state (no error — still loading/seeding) */}
        {!errorMsg && totalWorks === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center mb-6">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Setting up curriculum...</h2>
            <p className="text-gray-500 mb-4">Your Montessori curriculum is being prepared. This usually takes a few seconds.</p>
            <button
              onClick={() => familyId && loadCurriculum(familyId)}
              className="px-4 py-2 bg-white text-gray-600 border rounded-xl hover:bg-gray-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        )}

        {/* Area Sections */}
        <div className="space-y-4">
          {AREA_ORDER.map((areaKey) => {
            const group = byArea[areaKey];
            if (!group) return null;
            const isExpanded = expandedAreas.has(areaKey);

            return (
              <div key={areaKey} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Area Header */}
                <button
                  onClick={() => toggleArea(areaKey)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{group.meta.icon}</span>
                    <span className="font-bold text-gray-800">{group.meta.name}</span>
                    <span className="text-gray-400 text-sm">({group.works.length})</span>
                  </div>
                  <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {/* Works */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100 border-t">
                    {group.works.map((work, idx) => {
                      const priority = PRIORITY_BADGES[work.home_priority] || PRIORITY_BADGES.recommended;
                      const isWorkExpanded = expandedWork === work.id;

                      return (
                        <div key={work.id}>
                          <div className="flex items-center">
                            {/* Edit controls */}
                            {editMode && (
                              <div className="flex flex-col items-center pl-2 gap-0.5">
                                <button
                                  onClick={() => moveWork(work.id, areaKey, 'up')}
                                  disabled={idx === 0 || busy}
                                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs p-0.5"
                                  title="Move up"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() => moveWork(work.id, areaKey, 'down')}
                                  disabled={idx === group.works.length - 1 || busy}
                                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs p-0.5"
                                  title="Move down"
                                >
                                  ▼
                                </button>
                              </div>
                            )}

                            {/* Work content */}
                            <button
                              onClick={() => setExpandedWork(isWorkExpanded ? null : work.id)}
                              className="flex-1 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-gray-800 text-sm">
                                    {work.work_name}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${priority.color}`}>
                                      {priority.label}
                                    </span>
                                    {work.home_age_start && (
                                      <span className="text-xs text-gray-400">
                                        Age {work.home_age_start}+
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!editMode && (
                                  <span className="text-gray-300 text-sm">{isWorkExpanded ? '−' : '+'}</span>
                                )}
                              </div>
                            </button>

                            {/* Edit actions */}
                            {editMode && (
                              <div className="flex items-center gap-1 pr-3">
                                <button
                                  onClick={() => toggleWorkActive(work.id, work.is_active)}
                                  disabled={busy}
                                  className={`text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-40 ${
                                    work.is_active
                                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                  title={work.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  {work.is_active ? 'On' : 'Off'}
                                </button>
                                <button
                                  onClick={() => deleteWork(work.id, work.work_name)}
                                  disabled={busy}
                                  className="text-xs px-2 py-1 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Expanded details */}
                          {isWorkExpanded && !editMode && (
                            <div className="px-4 pb-4 space-y-2">
                              {work.description && (
                                <p className="text-sm text-gray-600">{work.description}</p>
                              )}
                              {work.home_tip && (
                                <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-800">
                                  <span className="font-medium">💡 Home Tip:</span> {work.home_tip}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                {work.buy_or_make && (
                                  <span>
                                    {work.buy_or_make === 'buy' ? '🛒 Buy' : '✂️ Make at home'}
                                  </span>
                                )}
                                {work.estimated_cost && (
                                  <span>💰 {work.estimated_cost}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
