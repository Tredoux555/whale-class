'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { School } from './types';
import { getCountryFlag, formatLocation } from '@/lib/ip-geolocation';

interface SchoolsTabProps {
  schools: School[];
  loading: boolean;
  editingSchool: string | null;
  setEditingSchool: (id: string | null) => void;
  onUpdateStatus: (schoolId: string, tier: string) => void;
  onDeleteSchool: (school: School) => void;
  onBatchDelete: (schoolIds: string[]) => void;
  onLoginAs: (schoolId: string) => void;
  trialSchools: School[];
  freeSchools: School[];
  paidSchools: School[];
  batchDeleting: boolean;
  batchDeleteProgress: { completed: number; total: number; results: Array<{ name: string; success: boolean }> } | null;
  onClearBatchProgress: () => void;
}

type SortField = 'name' | 'students' | 'last_active' | 'cost' | 'created';
type SortDir = 'asc' | 'desc';

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'free': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    case 'paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    default: return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
  }
};

function getActivityBadge(lastActiveAt: string | null): { color: string; label: string; dot: string } {
  if (!lastActiveAt) return { color: 'text-red-400', label: 'Never', dot: 'bg-red-500' };

  const hoursAgo = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 24) return { color: 'text-emerald-400', label: formatTimeAgo(lastActiveAt), dot: 'bg-emerald-500' };
  if (hoursAgo <= 168) return { color: 'text-amber-400', label: formatTimeAgo(lastActiveAt), dot: 'bg-amber-500' };
  if (hoursAgo <= 720) return { color: 'text-slate-400', label: formatTimeAgo(lastActiveAt), dot: 'bg-slate-500' };
  return { color: 'text-red-400', label: formatTimeAgo(lastActiveAt), dot: 'bg-red-500' };
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function SchoolsTab({
  schools,
  loading,
  editingSchool,
  setEditingSchool,
  onUpdateStatus,
  onDeleteSchool,
  onBatchDelete,
  onLoginAs,
  trialSchools,
  freeSchools,
  paidSchools,
  batchDeleting,
  batchDeleteProgress,
  onClearBatchProgress,
}: SchoolsTabProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Filter + sort
  const filteredSchools = useMemo(() => {
    let result = schools;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.owner_name || '').toLowerCase().includes(q) ||
        (s.owner_email || '').toLowerCase().includes(q) ||
        (s.slug || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'students':
          cmp = (a.student_count || 0) - (b.student_count || 0);
          break;
        case 'last_active':
          cmp = (a.last_active_at || '').localeCompare(b.last_active_at || '');
          break;
        case 'cost':
          cmp = (a.estimated_monthly_cost || 0) - (b.estimated_monthly_cost || 0);
          break;
        case 'created':
          cmp = a.created_at.localeCompare(b.created_at);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [schools, search, sortField, sortDir]);

  const emptySchools = useMemo(() => schools.filter(s => (s.student_count || 0) === 0), [schools]);
  const inactiveSchools = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return schools.filter(s => !s.last_active_at || s.last_active_at < thirtyDaysAgo);
  }, [schools]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filteredSchools.map(s => s.id)));
  const selectNone = () => setSelected(new Set());
  const selectEmpty = () => setSelected(new Set(emptySchools.map(s => s.id)));
  const selectInactive = () => setSelected(new Set(inactiveSchools.map(s => s.id)));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  const handleBatchDelete = () => {
    if (selected.size === 0) return;
    setShowConfirm(true);
    setConfirmText('');
  };

  const confirmBatchDelete = () => {
    if (confirmText !== 'DELETE') return;
    setShowConfirm(false);
    setConfirmText('');
    onBatchDelete(Array.from(selected));
    setSelected(new Set());
  };

  const selectedSchools = schools.filter(s => selected.has(s.id));
  const totalStudentsSelected = selectedSchools.reduce((sum, s) => sum + (s.student_count || 0), 0);

  return (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Schools</p>
          <p className="text-2xl font-bold text-white">{schools.length}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-400 text-sm">Trial</p>
          <p className="text-2xl font-bold text-amber-400">{trialSchools.length}</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <p className="text-purple-400 text-sm">Free (NPO)</p>
          <p className="text-2xl font-bold text-purple-400">{freeSchools.length}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 text-sm">Paid</p>
          <p className="text-2xl font-bold text-emerald-400">{paidSchools.length}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">Empty (0 students)</p>
          <p className="text-2xl font-bold text-red-400">{emptySchools.length}</p>
        </div>
      </div>

      {/* Search + Quick Select + Batch Delete */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search schools, owners..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 outline-none text-sm"
        />
        <div className="flex gap-1">
          <button onClick={selectAll} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600">All</button>
          <button onClick={selectNone} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600">None</button>
          <button onClick={selectEmpty} className="px-3 py-1.5 bg-red-900/40 text-red-400 rounded-lg text-xs hover:bg-red-900/60 border border-red-800/50">
            Empty ({emptySchools.length})
          </button>
          <button onClick={selectInactive} className="px-3 py-1.5 bg-amber-900/40 text-amber-400 rounded-lg text-xs hover:bg-amber-900/60 border border-amber-800/50">
            Inactive 30d+ ({inactiveSchools.length})
          </button>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleBatchDelete}
            disabled={batchDeleting}
            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {batchDeleting ? 'Deleting...' : `Delete Selected (${selected.size})`}
          </button>
        )}
      </div>

      {/* Batch Delete Progress */}
      {batchDeleteProgress && (
        <div className="mb-4 bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">
              {batchDeleteProgress.completed < batchDeleteProgress.total
                ? `Deleting ${batchDeleteProgress.completed}/${batchDeleteProgress.total}...`
                : `Done — ${batchDeleteProgress.results.filter(r => r.success).length} deleted`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">
                {Math.round((batchDeleteProgress.completed / batchDeleteProgress.total) * 100)}%
              </span>
              {batchDeleteProgress.completed >= batchDeleteProgress.total && (
                <button onClick={onClearBatchProgress} className="text-slate-400 hover:text-white text-xs">✕</button>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(batchDeleteProgress.completed / batchDeleteProgress.total) * 100}%` }}
            />
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {batchDeleteProgress.results.map((r) => (
              <div key={r.name} className="flex items-center gap-2 text-xs">
                <span>{r.success ? '✅' : '❌'}</span>
                <span className={r.success ? 'text-slate-400' : 'text-red-400'}>{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-red-500/50 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-red-400 mb-4">
              Delete {selected.size} School{selected.size > 1 ? 's' : ''}?
            </h3>
            <div className="mb-4 space-y-1 max-h-48 overflow-y-auto">
              {selectedSchools.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm py-1 px-2 bg-slate-700/50 rounded">
                  <span className="text-white">{s.name}</span>
                  <span className="text-slate-400">{s.student_count || 0} students</span>
                </div>
              ))}
            </div>
            <p className="text-red-300 text-sm mb-4">
              This will permanently delete {totalStudentsSelected} students, all classrooms, teachers, progress data, photos, and AI interactions.
            </p>
            <div className="mb-4">
              <label className="text-slate-400 text-xs block mb-1">Type DELETE to confirm</label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-red-500 outline-none"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && confirmBatchDelete()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={confirmText !== 'DELETE'}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
              >
                Delete {selected.size} Schools
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schools Table */}
      {loading ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <div className="animate-pulse">
            <div className="h-6 w-48 bg-slate-700 rounded mx-auto mb-4"></div>
            <div className="h-4 w-32 bg-slate-700 rounded mx-auto"></div>
          </div>
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          {search ? (
            <>
              <span className="text-5xl block mb-4">🔍</span>
              <h2 className="text-xl font-semibold text-white mb-2">No schools match &ldquo;{search}&rdquo;</h2>
              <button onClick={() => setSearch('')} className="text-emerald-400 hover:underline">Clear search</button>
            </>
          ) : (
            <>
              <span className="text-5xl block mb-4">📭</span>
              <h2 className="text-xl font-semibold text-white mb-2">No schools registered yet</h2>
              <Link
                href="/montree/onboarding"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
              >
                Register First School
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={filteredSchools.length > 0 && filteredSchools.every(s => selected.has(s.id))}
                      onChange={e => {
                        if (e.target.checked) setSelected(new Set([...selected, ...filteredSchools.map(s => s.id)]));
                        else setSelected(new Set([...selected].filter(id => !filteredSchools.find(s => s.id === id))));
                      }}
                      className="w-4 h-4 rounded bg-slate-600 border-slate-500"
                    />
                  </th>
                  <th className="text-left p-3 text-slate-400 font-medium text-sm cursor-pointer select-none" onClick={() => handleSort('name')}>
                    School {sortIcon('name')}
                  </th>
                  <th className="text-left p-3 text-slate-400 font-medium text-sm">Location</th>
                  <th className="text-left p-3 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-center p-3 text-slate-400 font-medium text-sm cursor-pointer select-none" onClick={() => handleSort('students')}>
                    Students {sortIcon('students')}
                  </th>
                  <th className="text-left p-3 text-slate-400 font-medium text-sm cursor-pointer select-none" onClick={() => handleSort('last_active')}>
                    Last Active {sortIcon('last_active')}
                  </th>
                  <th className="text-right p-3 text-slate-400 font-medium text-sm cursor-pointer select-none" onClick={() => handleSort('cost')}>
                    Est. Cost/mo {sortIcon('cost')}
                  </th>
                  <th className="text-right p-3 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredSchools.map((school) => {
                  const activity = getActivityBadge(school.last_active_at || null);
                  const isSelected = selected.has(school.id);

                  return (
                    <tr key={school.id} className={`hover:bg-slate-800/50 ${isSelected ? 'bg-red-500/5' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(school.id)}
                          className="w-4 h-4 rounded bg-slate-600 border-slate-500"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {school.subscription_tier === 'free' ? '🌍' :
                             school.subscription_tier === 'paid' ? '⭐' : '🎓'}
                          </span>
                          <div>
                            <p className="font-medium text-white text-sm">{school.name}</p>
                            <p className="text-slate-500 text-xs">{school.owner_name || school.owner_email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">
                            {getCountryFlag(school.signup_country_code || null)}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {school.signup_city || school.signup_country || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {editingSchool === school.id ? (
                          <div className="flex gap-1">
                            {['trial', 'free', 'paid'].map(tier => (
                              <button
                                key={tier}
                                onClick={() => onUpdateStatus(school.id, tier)}
                                className={`px-2 py-0.5 text-xs rounded ${getTierColor(tier)} hover:opacity-80`}
                              >
                                {tier === 'free' ? 'Free' : tier === 'paid' ? 'Paid' : 'Trial'}
                              </button>
                            ))}
                            <button onClick={() => setEditingSchool(null)} className="px-1.5 py-0.5 text-xs rounded bg-slate-700 text-slate-400">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingSchool(school.id)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTierColor(school.subscription_tier || 'trial')} hover:opacity-80`}
                          >
                            {school.subscription_tier === 'free' ? 'Free' :
                             school.subscription_tier === 'paid' ? 'Paid' : 'Trial'}
                            <span className="ml-1 opacity-50">✎</span>
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-sm font-medium ${(school.student_count || 0) === 0 ? 'text-red-400' : 'text-white'}`}>
                          {school.student_count || 0}
                        </span>
                        <span className="text-slate-500 text-xs ml-1">
                          ({school.classroom_count || 0}c / {school.teacher_count || 0}t)
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${activity.dot}`} />
                          <span className={`text-xs ${activity.color}`}>{activity.label}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-xs font-mono ${(school.estimated_monthly_cost || 0) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          ${(school.estimated_monthly_cost || 0).toFixed(2)}
                        </span>
                        {(school.interaction_count_30d || 0) > 0 && (
                          <span className="text-slate-500 text-xs ml-1">
                            ({school.interaction_count_30d} calls)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onLoginAs(school.id)}
                            className="px-2 py-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded text-xs font-medium"
                          >
                            Login →
                          </button>
                          <button
                            onClick={() => onDeleteSchool(school)}
                            className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
