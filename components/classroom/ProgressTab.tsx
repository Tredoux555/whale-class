'use client';

import { useState, useEffect } from 'react';

interface WorkProgress {
  id: string;
  name: string;
  status: number; // 0=not started, 1=presented, 2=practicing, 3=mastered
  category?: string;
  area?: string;
  linked?: boolean;
  orphaned?: boolean;
  source?: string;
}

interface CurriculumWork {
  id: string;
  name: string;
  area: string;
}

interface AreaProgress {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  works: WorkProgress[];
  stats: {
    total: number;
    presented: number;
    practicing: number;
    mastered: number;
  };
}

interface ProgressTabProps {
  childId: string;
  childName: string;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-50' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'from-purple-500 to-violet-500', bgColor: 'bg-purple-50' },
  { id: 'mathematics', name: 'Math', icon: '🔢', color: 'from-blue-500 to-indigo-500', bgColor: 'bg-blue-50' },
  { id: 'language', name: 'Language', icon: '📖', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50' },
  { id: 'culture', name: 'Cultural', icon: '🌍', color: 'from-orange-500 to-amber-500', bgColor: 'bg-orange-50' },
];

const STATUS_LABELS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];

export default function ProgressTab({ childId, childName }: ProgressTabProps) {
  const [areaProgress, setAreaProgress] = useState<AreaProgress[]>([]);
  const [orphanedWorks, setOrphanedWorks] = useState<WorkProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkProgress | null>(null);
  const [curriculumWorks, setCurriculumWorks] = useState<CurriculumWork[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
    fetchCurriculum();
  }, [childId]);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/classroom/child/${childId}/progress`);
      const data = await res.json();
      
      setOrphanedWorks(data.orphanedWorks || []);
      
      const progressByArea = AREAS.map(area => {
        const areaWorks = (data.works || []).filter((w: any) => 
          w.area === area.id || w.area === area.name.toLowerCase().replace(' ', '_')
        );
        
        return {
          ...area,
          works: areaWorks,
          stats: {
            total: areaWorks.length,
            presented: areaWorks.filter((w: WorkProgress) => w.status === 1).length,
            practicing: areaWorks.filter((w: WorkProgress) => w.status === 2).length,
            mastered: areaWorks.filter((w: WorkProgress) => w.status === 3).length,
          }
        };
      });

      setAreaProgress(progressByArea);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurriculum = async () => {
    try {
      const res = await fetch('/api/classroom/curriculum');
      const data = await res.json();
      setCurriculumWorks(data.works || []);
    } catch (error) {
      console.error('Failed to fetch curriculum:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/classroom/child/${childId}/progress/sync`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        setSyncResult(`✅ ${data.message}`);
        // Refresh progress data
        fetchProgress();
      } else {
        setSyncResult(`❌ ${data.error || 'Sync failed'}`);
      }
    } catch (error) {
      setSyncResult('❌ Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const toggleArea = (areaId: string) => {
    setExpandedArea(prev => prev === areaId ? null : areaId);
  };

  const handleWorkClick = async (work: WorkProgress) => {
    // Cycle through statuses: 0 → 3 → 2 → 1 → 0
    // Or simpler: click = toggle between current and mastered
    const newStatus = work.status === 3 ? 0 : 3;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/classroom/child/${childId}/progress/${work.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        fetchProgress();
      }
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLongPress = (work: WorkProgress, e: React.MouseEvent) => {
    e.preventDefault();
    setEditingWork(work);
    setSearchQuery(work.name);
  };

  const handleDeleteWork = async (work: WorkProgress, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove "${work.name}" progress?`)) return;
    
    try {
      const res = await fetch(`/api/classroom/child/${childId}/progress/${work.id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        fetchProgress();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleLinkToCurriculum = async (curriculumWorkId: string) => {
    if (!editingWork) return;
    setSaving(true);
    
    try {
      const res = await fetch(`/api/classroom/child/${childId}/progress/${editingWork.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          work_id: curriculumWorkId,
          status: editingWork.status 
        })
      });
      
      if (res.ok) {
        setEditingWork(null);
        setSearchQuery('');
        fetchProgress();
      }
    } catch (error) {
      console.error('Link error:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredCurriculum = curriculumWorks.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl animate-pulse">📊</span>
        </div>
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  const overallStats = areaProgress.reduce(
    (acc, area) => ({
      total: acc.total + area.stats.total,
      presented: acc.presented + area.stats.presented,
      practicing: acc.practicing + area.stats.practicing,
      mastered: acc.mastered + area.stats.mastered,
    }),
    { total: 0, presented: 0, practicing: 0, mastered: 0 }
  );

  const overallPercent = overallStats.total > 0 
    ? Math.round((overallStats.mastered / overallStats.total) * 100) 
    : 0;

  return (
    <div>
      {/* Link Modal */}
      {editingWork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Link to Curriculum</h3>
              <button 
                onClick={() => { setEditingWork(null); setSearchQuery(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-3">
              <span className="font-medium text-gray-800">{editingWork.name}</span>
            </p>
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search curriculum..."
              className="w-full px-4 py-3 border rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredCurriculum.map(work => (
                <button
                  key={work.id}
                  onClick={() => handleLinkToCurriculum(work.id)}
                  disabled={saving}
                  className="w-full p-3 text-left rounded-lg hover:bg-blue-50 border border-gray-200 transition-colors disabled:opacity-50"
                >
                  <p className="font-medium text-gray-800">{work.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{work.area.replace('_', ' ')}</p>
                </button>
              ))}
              {filteredCurriculum.length === 0 && (
                <p className="text-center text-gray-500 py-4">No matches found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Button - Always visible */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-4 mb-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              🔄
            </div>
            <div>
              <h3 className="font-bold">Sync from This Week</h3>
              <p className="text-sm text-white/80">Link assignments & backfill progress</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-5 py-2.5 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 disabled:opacity-50 shadow"
          >
            {syncing ? '⏳ Syncing...' : '🚀 Sync Now'}
          </button>
        </div>
        {syncResult && (
          <p className="mt-3 text-sm text-white/90 bg-white/10 rounded-lg px-3 py-2">
            {syncResult}
          </p>
        )}
      </div>

      {/* Orphaned Works Banner */}
      {orphanedWorks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-amber-800">{orphanedWorks.length} Unlinked</h3>
                <p className="text-sm text-amber-600">Need manual linking</p>
              </div>
            </div>
            <button
              onClick={() => setShowOrphaned(!showOrphaned)}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600"
            >
              {showOrphaned ? 'Hide' : 'Fix'}
            </button>
          </div>
          
          {showOrphaned && (
            <div className="mt-4 pt-4 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {orphanedWorks.map(work => (
                <div key={work.id} className="p-3 rounded-lg bg-white shadow-sm border-l-4 border-amber-400 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{work.name}</p>
                    <p className="text-xs text-amber-600">{work.area}</p>
                  </div>
                  <button
                    onClick={() => { setEditingWork(work); setSearchQuery(work.name); }}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium"
                  >
                    Link
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overall Summary */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Overall Progress</h3>
          <div className="text-2xl font-bold text-blue-600">{overallPercent}%</div>
        </div>
        
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full flex">
            <div className="bg-green-500 transition-all" style={{ width: `${(overallStats.mastered / Math.max(overallStats.total, 1)) * 100}%` }} />
            <div className="bg-blue-500 transition-all" style={{ width: `${(overallStats.practicing / Math.max(overallStats.total, 1)) * 100}%` }} />
            <div className="bg-yellow-400 transition-all" style={{ width: `${(overallStats.presented / Math.max(overallStats.total, 1)) * 100}%` }} />
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{overallStats.total} total</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />{overallStats.presented}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{overallStats.practicing}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{overallStats.mastered}</span>
          </div>
        </div>
      </div>

      {/* Tip */}
      <p className="text-xs text-gray-400 text-center mb-3">
        💡 Tap work = toggle mastered • Long press = link/edit
      </p>

      {/* Area Cards */}
      <div className="space-y-3">
        {areaProgress.map(area => {
          const isExpanded = expandedArea === area.id;
          const areaPercent = area.stats.total > 0 
            ? Math.round((area.stats.mastered / area.stats.total) * 100) 
            : 0;

          return (
            <div key={area.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggleArea(area.id)}
                className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${area.color} rounded-xl flex items-center justify-center text-2xl shadow`}>
                  {area.icon}
                </div>
                
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-gray-900">{area.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[200px]">
                      <div className="h-full flex">
                        <div className="bg-green-500" style={{ width: `${(area.stats.mastered / Math.max(area.stats.total, 1)) * 100}%` }} />
                        <div className="bg-blue-500" style={{ width: `${(area.stats.practicing / Math.max(area.stats.total, 1)) * 100}%` }} />
                        <div className="bg-yellow-400" style={{ width: `${(area.stats.presented / Math.max(area.stats.total, 1)) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{areaPercent}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    {area.stats.mastered}/{area.stats.total}
                  </span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && area.works.length > 0 && (
                <div className={`border-t ${area.bgColor} p-3`}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {area.works.map(work => (
                      <button
                        key={work.id}
                        onClick={() => handleWorkClick(work)}
                        onContextMenu={(e) => handleLongPress(work, e)}
                        disabled={saving}
                        className={`p-2.5 rounded-lg text-left transition-all ${
                          work.status === 3 
                            ? 'bg-green-500 text-white shadow-md' 
                            : work.status === 2 
                              ? 'bg-blue-100 border-2 border-blue-300' 
                              : work.status === 1 
                                ? 'bg-yellow-50 border border-yellow-300' 
                                : 'bg-white border border-gray-200'
                        } disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]`}
                      >
                        <p className={`text-xs font-medium truncate ${work.status === 3 ? 'text-white' : 'text-gray-800'}`}>
                          {work.name}
                        </p>
                        <p className={`text-[10px] ${work.status === 3 ? 'text-green-100' : 'text-gray-500'}`}>
                          {STATUS_LABELS[work.status]}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isExpanded && area.works.length === 0 && (
                <div className="border-t p-4 text-center text-gray-500 text-sm">
                  No works in this area
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
