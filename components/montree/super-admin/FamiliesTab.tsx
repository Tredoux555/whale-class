'use client';

// Session 155: Super-admin Families tab for Montree Home
// Shows all Home families, children counts, progress stats, drill-down + delete

import { useState, useEffect, useCallback } from 'react';

interface FamilyProgress {
  total: number;
  mastered: number;
  practicing: number;
  presented: number;
  not_started: number;
  percent: number;
  areas: Record<string, { total: number; mastered: number }>;
}

interface ChildDetail {
  id: string;
  name: string;
  age: number;
  created_at: string;
  progress: FamilyProgress;
}

interface FamilyStat {
  id: string;
  name: string;
  email: string;
  plan: string;
  created_at: string;
  children_count: number;
  total_works: number;
  mastered_works: number;
  avg_progress: number;
}

interface GlobalStats {
  total_families: number;
  total_children: number;
  avg_progress: number;
  signups_this_week: number;
}

interface FamiliesTabProps {
  password: string;
}

const AREA_DISPLAY: Record<string, { name: string; icon: string; color: string }> = {
  practical_life: { name: 'Practical Life', icon: '🌱', color: '#4CAF50' },
  sensorial: { name: 'Sensorial', icon: '🎨', color: '#9C27B0' },
  mathematics: { name: 'Mathematics', icon: '🔢', color: '#2196F3' },
  language: { name: 'Language', icon: '📝', color: '#FF9800' },
  cultural: { name: 'Cultural', icon: '🌍', color: '#00BCD4' },
};

export default function FamiliesTab({ password }: FamiliesTabProps) {
  const [families, setFamilies] = useState<FamilyStat[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [familyDetail, setFamilyDetail] = useState<{
    family: FamilyStat;
    children: ChildDetail[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchFamilies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/montree/super-admin/home', {
        headers: { 'x-super-admin-password': password },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFamilies(data.families || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Failed to fetch families:', err);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handleExpand = async (familyId: string) => {
    if (expandedFamily === familyId) {
      setExpandedFamily(null);
      setFamilyDetail(null);
      return;
    }

    setExpandedFamily(familyId);
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/montree/super-admin/home?family_id=${familyId}`,
        { headers: { 'x-super-admin-password': password } }
      );
      if (res.ok) {
        const data = await res.json();
        setFamilyDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch family detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (familyId: string, familyName: string) => {
    if (!confirm(`Delete "${familyName}" and all their data?\n\nThis removes:\n• Family account\n• All children\n• All progress records\n• Curriculum data\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/montree/super-admin/home?family_id=${familyId}&password=${password}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setFamilies((prev) => prev.filter((f) => f.id !== familyId));
        if (expandedFamily === familyId) {
          setExpandedFamily(null);
          setFamilyDetail(null);
        }
        if (stats) {
          setStats({ ...stats, total_families: stats.total_families - 1 });
        }
      }
    } catch (err) {
      console.error('Failed to delete family:', err);
      alert('Failed to delete family');
    }
  };

  return (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Families</p>
          <p className="text-2xl font-bold text-white">{stats?.total_families ?? '-'}</p>
        </div>
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4">
          <p className="text-teal-400 text-sm">Total Children</p>
          <p className="text-2xl font-bold text-teal-400">{stats?.total_children ?? '-'}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 text-sm">Avg Progress</p>
          <p className="text-2xl font-bold text-emerald-400">{stats?.avg_progress ?? 0}%</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 text-sm">This Week</p>
          <p className="text-2xl font-bold text-blue-400">{stats?.signups_this_week ?? 0}</p>
        </div>
      </div>

      {/* Families Table */}
      {loading ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <div className="animate-pulse">
            <div className="h-6 w-48 bg-slate-700 rounded mx-auto mb-4"></div>
            <div className="h-4 w-32 bg-slate-700 rounded mx-auto"></div>
          </div>
        </div>
      ) : families.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <span className="text-5xl block mb-4">🏠</span>
          <h2 className="text-xl font-semibold text-white mb-2">No families yet</h2>
          <p className="text-slate-400">Families will appear here when they register at /home</p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Family</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Email</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Plan</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Children</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Progress</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Signed Up</th>
                <th className="text-right p-4 text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {families.map((family) => (
                <tr key={family.id}>
                  {/* Main row */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏠</span>
                      <p className="font-medium text-white">{family.name}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-300 text-sm">{family.email}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium border bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                      {family.plan || 'free'}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-white font-medium">{family.children_count}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${family.avg_progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-300">{family.avg_progress}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-400 text-sm">
                      {new Date(family.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleExpand(family.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          expandedFamily === family.id
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        }`}
                      >
                        {expandedFamily === family.id ? '▼' : '👁'}
                      </button>
                      <button
                        onClick={() => handleDelete(family.id, family.name)}
                        className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expanded detail panel */}
          {expandedFamily && (
            <div className="border-t border-slate-700 bg-slate-900/50 p-6">
              {detailLoading ? (
                <div className="text-center py-4">
                  <div className="animate-pulse text-slate-400">Loading family details...</div>
                </div>
              ) : familyDetail ? (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">
                    {familyDetail.family.name} — {familyDetail.children.length} child
                    {familyDetail.children.length !== 1 ? 'ren' : ''}
                  </h3>

                  {familyDetail.children.length === 0 ? (
                    <p className="text-slate-400">No children added yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {familyDetail.children.map((child) => (
                        <div
                          key={child.id}
                          className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-white">{child.name}</p>
                              <p className="text-slate-400 text-sm">Age {child.age}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-emerald-400">
                                {child.progress.percent}%
                              </p>
                              <p className="text-xs text-slate-500">
                                {child.progress.mastered}/{child.progress.total} mastered
                              </p>
                            </div>
                          </div>

                          {/* Status breakdown */}
                          <div className="grid grid-cols-4 gap-1 mb-3">
                            <div className="bg-gray-500/10 rounded p-1 text-center">
                              <p className="text-xs text-gray-400">{child.progress.not_started}</p>
                              <p className="text-[10px] text-gray-500">New</p>
                            </div>
                            <div className="bg-blue-500/10 rounded p-1 text-center">
                              <p className="text-xs text-blue-400">{child.progress.presented}</p>
                              <p className="text-[10px] text-blue-500">Shown</p>
                            </div>
                            <div className="bg-amber-500/10 rounded p-1 text-center">
                              <p className="text-xs text-amber-400">{child.progress.practicing}</p>
                              <p className="text-[10px] text-amber-500">Pract.</p>
                            </div>
                            <div className="bg-emerald-500/10 rounded p-1 text-center">
                              <p className="text-xs text-emerald-400">{child.progress.mastered}</p>
                              <p className="text-[10px] text-emerald-500">Done</p>
                            </div>
                          </div>

                          {/* Per-area bars */}
                          <div className="space-y-1">
                            {Object.entries(child.progress.areas).map(([areaKey, areaStat]) => {
                              const display = AREA_DISPLAY[areaKey];
                              if (!display) return null;
                              const pct =
                                areaStat.total > 0
                                  ? Math.round((areaStat.mastered / areaStat.total) * 100)
                                  : 0;
                              return (
                                <div key={areaKey} className="flex items-center gap-2">
                                  <span className="text-xs w-4">{display.icon}</span>
                                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: display.color,
                                      }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-slate-500 w-8 text-right">
                                    {areaStat.mastered}/{areaStat.total}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-400">Failed to load details.</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
