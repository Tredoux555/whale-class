'use client';

// /home/dashboard/curriculum/page.tsx
// CLONED from montree/dashboard/curriculum/page.tsx
// Area cards grid → click to expand → work list with details
// Uses Home API + 68-work curated curriculum

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeSession } from '@/lib/home/auth';
import { Toaster, toast } from 'sonner';

interface CurriculumWork {
  id: string;
  work_name: string;
  area: string;
  category?: string;
  sequence: number;
  is_active: boolean;
  description?: string;
  home_tip?: string;
  buy_or_make?: string;
  estimated_cost?: string;
  home_age_start?: string;
  home_priority?: string;
  direct_aims?: string[];
  indirect_aims?: string[];
  materials?: string[];
  control_of_error?: string;
  why_it_matters?: string;
  quick_guide?: string;
  video_search_term?: string;
}

interface AreaGroup {
  meta: { name: string; icon: string; color: string };
  works: CurriculumWork[];
}

const AREA_ICONS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📚',
  cultural: '🌍',
};

const AREA_COLORS: Record<string, string> = {
  practical_life: 'from-green-400 to-emerald-500',
  sensorial: 'from-orange-400 to-amber-500',
  mathematics: 'from-blue-400 to-indigo-500',
  language: 'from-pink-400 to-rose-500',
  cultural: 'from-purple-400 to-violet-500',
};

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  essential: { label: 'Essential', color: 'text-emerald-700 bg-emerald-100' },
  recommended: { label: 'Recommended', color: 'text-blue-700 bg-blue-100' },
  enrichment: { label: 'Enrichment', color: 'text-purple-700 bg-purple-100' },
};

export default function CurriculumPage() {
  const router = useRouter();
  const [byArea, setByArea] = useState<Record<string, AreaGroup>>({});
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [expandedWork, setExpandedWork] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadCurriculum = useCallback((fid: string, includeInactive = false) => {
    const url = `/api/home/curriculum?family_id=${fid}${includeInactive ? '&include_inactive=true' : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) toast.error(data.error);
        if (data.seedError) toast.error(data.seedError);
        setByArea(data.byArea || {});
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load curriculum');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const session = getHomeSession();
    if (!session) { router.push('/home/login'); return; }
    setFamilyId(session.family.id);
    loadCurriculum(session.family.id);
  }, [router, loadCurriculum]);

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
      if (data.success && familyId) loadCurriculum(familyId, true);
      else toast.error(data.error || 'Failed to update');
    } catch { toast.error('Connection error'); }
    finally { setBusy(false); }
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
      await Promise.all([
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
      if (familyId) loadCurriculum(familyId, true);
    } catch { toast.error('Failed to reorder'); }
    finally { setBusy(false); }
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
      } else toast.error(data.error || 'Failed to delete');
    } catch { toast.error('Connection error'); }
    finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-5xl">📚</div>
      </div>
    );
  }

  const totalWorks = Object.values(byArea).reduce((sum, g) => sum + g.works.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <Toaster position="top-center" richColors />

      {/* Page sub-header — matches Montree */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">📚 Curriculum</h1>
            <p className="text-gray-500 text-sm">{totalWorks} works available</p>
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
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-gray-600 shadow-sm hover:shadow-md border border-gray-200'
              }`}
            >
              {editMode ? '✓ Done' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Empty state */}
        {totalWorks === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <span className="text-5xl mb-4 block">📚</span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Setting up curriculum...</h2>
            <p className="text-gray-500 mb-6">Your Montessori curriculum is being prepared.</p>
            <button
              onClick={() => familyId && loadCurriculum(familyId)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Refresh
            </button>
          </div>
        )}

        {totalWorks > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-4">Tap an area to browse works.</p>

            {/* Area Cards — Montree pattern */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {Object.entries(byArea).map(([area, group]) => (
                <button
                  key={area}
                  onClick={() => setSelectedArea(selectedArea === area ? null : area)}
                  className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all text-left
                    ${selectedArea === area ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${AREA_COLORS[area] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-2xl mb-2`}>
                    {AREA_ICONS[area] || '📖'}
                  </div>
                  <p className="font-semibold text-gray-800 capitalize">{area.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">{group.works.length} works</p>
                </button>
              ))}
            </div>

            {/* Selected Area Work List — Montree pattern */}
            {selectedArea && byArea[selectedArea] && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 capitalize flex items-center gap-2">
                    {AREA_ICONS[selectedArea]} {selectedArea.replace('_', ' ')}
                  </h3>
                  <span className="text-xs text-gray-400">{byArea[selectedArea].works.length} works</span>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto scroll-smooth">
                  {byArea[selectedArea].works.map((work, idx) => {
                    const isExpanded = expandedWork === work.id;
                    const priority = PRIORITY_BADGES[work.home_priority || 'recommended'] || PRIORITY_BADGES.recommended;

                    return (
                      <div key={work.id} className="bg-gray-50 rounded-xl overflow-hidden transition-all">
                        {/* Work Header */}
                        <div className="flex items-center gap-2 p-3">
                          {editMode && (
                            <div className="flex flex-col items-center gap-0.5">
                              <button onClick={() => moveWork(work.id, selectedArea, 'up')}
                                disabled={idx === 0 || busy}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-sm px-1">▲</button>
                              <button onClick={() => moveWork(work.id, selectedArea, 'down')}
                                disabled={idx === byArea[selectedArea].works.length - 1 || busy}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-sm px-1">▼</button>
                            </div>
                          )}

                          <button
                            onClick={() => setExpandedWork(isExpanded ? null : work.id)}
                            className="flex-1 flex items-center gap-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${AREA_COLORS[selectedArea]}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800">{work.work_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${priority.color}`}>{priority.label}</span>
                                {work.home_age_start && <span className="text-xs text-gray-400">Age {work.home_age_start}+</span>}
                              </div>
                            </div>
                            <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                          </button>

                          {editMode && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => toggleWorkActive(work.id, work.is_active)}
                                disabled={busy}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm disabled:opacity-40 ${
                                  work.is_active ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}>
                                {work.is_active ? '✓' : '○'}
                              </button>
                              <button onClick={() => deleteWork(work.id, work.work_name)}
                                disabled={busy}
                                className="w-8 h-8 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600 disabled:opacity-40">
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && !editMode && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-200 space-y-3">
                            {work.description && <p className="text-sm text-gray-600">{work.description}</p>}

                            {work.home_tip && (
                              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                                <p className="font-bold text-amber-800 flex items-center gap-2 mb-1">💡 Home Tip</p>
                                <p className="text-sm text-amber-900">{work.home_tip}</p>
                              </div>
                            )}

                            {work.quick_guide && (
                              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
                                <p className="font-bold text-emerald-800 flex items-center gap-2 mb-1">⚡ Quick Guide</p>
                                <div className="text-sm text-emerald-900 space-y-1">
                                  {work.quick_guide.split('\n').map((line: string, i: number) => (
                                    <p key={i} className="leading-relaxed">{line}</p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {work.video_search_term && (
                              <a href={`https://youtube.com/results?search_query=${encodeURIComponent(work.video_search_term)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">
                                🎬 Watch Presentation Video
                              </a>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              {work.direct_aims && work.direct_aims.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">🎯 Direct Aims</p>
                                  <ul className="text-gray-600 space-y-0.5">
                                    {work.direct_aims.map((aim: string, i: number) => <li key={i} className="text-xs">• {aim}</li>)}
                                  </ul>
                                </div>
                              )}
                              {work.indirect_aims && work.indirect_aims.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">🌱 Indirect Aims</p>
                                  <ul className="text-gray-600 space-y-0.5">
                                    {work.indirect_aims.map((aim: string, i: number) => <li key={i} className="text-xs">• {aim}</li>)}
                                  </ul>
                                </div>
                              )}
                              {work.materials && work.materials.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-700 mb-1">🧰 Materials</p>
                                  <ul className="text-gray-600 space-y-0.5">
                                    {work.materials.map((item: string, i: number) => <li key={i} className="text-xs">• {item}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {work.why_it_matters && (
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="font-semibold text-blue-700 text-xs mb-1">💡 Why It Matters</p>
                                <p className="text-sm text-blue-800">{work.why_it_matters}</p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              {work.buy_or_make && (
                                <span className="px-2 py-1 bg-gray-100 rounded-full">
                                  {work.buy_or_make === 'buy' ? '🛒 Buy' : '✂️ Make at home'}
                                </span>
                              )}
                              {work.estimated_cost && (
                                <span className="px-2 py-1 bg-gray-100 rounded-full">💰 {work.estimated_cost}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
