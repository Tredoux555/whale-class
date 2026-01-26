'use client';

// ============================================
// MONTREE DASHBOARD - Session 102 REBUILD
// Full functionality: expandable works, notes, Demo, Capture, Progress, Reports
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface Session {
  teacher: { id: string; name: string; role: string };
  school: { id: string; name: string; slug: string };
  classroom: { id: string; name: string; age_group: string } | null;
}

interface Child {
  id: string;
  name: string;
  age?: number;
  photo_url?: string;
}

interface WorkAssignment {
  id: string;
  work_id?: string;
  work_name: string;
  area: string;
  status: 'not_started' | 'presented' | 'practicing' | 'completed';
  notes?: string;
}

interface AreaProgress {
  id: string;
  name: string;
  icon: string;
  works: { id: string; name: string; status: number }[];
  stats: { total: number; presented: number; practicing: number; mastered: number };
}

// ============================================
// CONSTANTS
// ============================================

const AREA_CONFIG: Record<string, { icon: string; bgColor: string; color: string; name: string; letter: string }> = {
  practical_life: { icon: '🧹', bgColor: 'bg-pink-100', color: 'text-pink-700', name: 'Practical Life', letter: 'P' },
  sensorial: { icon: '👁️', bgColor: 'bg-purple-100', color: 'text-purple-700', name: 'Sensorial', letter: 'S' },
  math: { icon: '🔢', bgColor: 'bg-blue-100', color: 'text-blue-700', name: 'Math', letter: 'M' },
  mathematics: { icon: '🔢', bgColor: 'bg-blue-100', color: 'text-blue-700', name: 'Math', letter: 'M' },
  language: { icon: '📚', bgColor: 'bg-green-100', color: 'text-green-700', name: 'Language', letter: 'L' },
  cultural: { icon: '🌍', bgColor: 'bg-orange-100', color: 'text-orange-700', name: 'Cultural', letter: 'C' },
  culture: { icon: '🌍', bgColor: 'bg-orange-100', color: 'text-orange-700', name: 'Cultural', letter: 'C' },
};

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; color: string; next: string }> = {
  not_started: { label: '○', bgColor: 'bg-gray-200', color: 'text-gray-600', next: 'presented' },
  presented: { label: 'P', bgColor: 'bg-amber-200', color: 'text-amber-800', next: 'practicing' },
  practicing: { label: 'Pr', bgColor: 'bg-blue-200', color: 'text-blue-800', next: 'completed' },
  completed: { label: 'M', bgColor: 'bg-green-200', color: 'text-green-800', next: 'not_started' },
  mastered: { label: 'M', bgColor: 'bg-green-200', color: 'text-green-800', next: 'not_started' },
};

const AREAS_LIST = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', gradient: 'from-pink-500 to-rose-500' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', gradient: 'from-purple-500 to-violet-500' },
  { id: 'mathematics', name: 'Math', icon: '🔢', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'language', name: 'Language', icon: '📖', gradient: 'from-green-500 to-emerald-500' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', gradient: 'from-orange-500 to-amber-500' },
];

// Helper: get current week number
function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / 604800000);
}


// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('montree_session');
    if (!stored) { router.push('/montree/login'); return; }
    try { setSession(JSON.parse(stored)); } 
    catch { router.push('/montree/login'); }
  }, [router]);

  useEffect(() => {
    if (!session?.classroom?.id) { setLoading(false); return; }
    fetch(`/api/montree/children?classroom_id=${session.classroom.id}`)
      .then(r => r.json())
      .then(data => { setChildren(data.children || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session?.classroom?.id]);

  if (!session || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-5xl mb-4">🐋</div>
          <p className="text-emerald-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (selectedChild) {
    return <ChildDetailView child={selectedChild} session={session} onBack={() => setSelectedChild(null)} />;
  }

  const colors = ['from-emerald-400 to-teal-500', 'from-blue-400 to-indigo-500', 'from-amber-400 to-orange-500', 
                  'from-pink-400 to-rose-500', 'from-purple-400 to-violet-500', 'from-cyan-400 to-sky-500'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <Toaster position="top-center" richColors />
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐋</span>
            <div>
              <h1 className="text-xl font-bold">{session.classroom?.name || 'My Classroom'}</h1>
              <p className="text-emerald-100 text-sm">{children.length} students</p>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('montree_session'); router.push('/montree/login'); }} 
                  className="text-sm text-white/70 hover:text-white">Logout</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {children.map((child, i) => (
            <button key={child.id} onClick={() => setSelectedChild(child)}
                    className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all text-center active:scale-95">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colors[i % 6]} mx-auto mb-3 flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                {child.name.charAt(0)}
              </div>
              <p className="font-semibold text-gray-800">{child.name}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}


// ============================================
// CHILD DETAIL VIEW - Main container with tabs
// ============================================

function ChildDetailView({ child, session, onBack }: { child: Child; session: Session; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'week' | 'progress' | 'reports'>('week');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 pb-20">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30">←</button>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">{child.name.charAt(0)}</div>
            <div>
              <h1 className="text-xl font-bold">{child.name}</h1>
              <p className="text-emerald-100 text-sm">{session.classroom?.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-[72px] z-30">
        <div className="max-w-4xl mx-auto px-4 py-2 flex gap-2">
          {[
            { id: 'week', label: '📋 Week' },
            { id: 'progress', label: '📊 Progress' },
            { id: 'reports', label: '📄 Reports' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'week' && <WeeklyWorksTab child={child} session={session} />}
        {activeTab === 'progress' && <ProgressTab child={child} />}
        {activeTab === 'reports' && <ReportsTab child={child} />}
      </main>
    </div>
  );
}


// ============================================
// WEEKLY WORKS TAB - Shows assigned works with expandable details
// ============================================

function WeeklyWorksTab({ child, session }: { child: Child; session: Session }) {
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // WorkNavigator dynamic import - MUST be before any early returns!
  const [WorkNavigator, setWorkNavigator] = useState<any>(null);
  
  useEffect(() => {
    import('@/components/montree/WorkNavigator').then(mod => setWorkNavigator(() => mod.default)).catch(() => {});
  }, []);

  // Fetch assignments
  useEffect(() => {
    const week = getCurrentWeek();
    const year = new Date().getFullYear();
    fetch(`/api/montree/weekly-assignments?child_id=${child.id}&week=${week}&year=${year}`)
      .then(r => r.json())
      .then(data => { setAssignments(data.assignments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [child.id]);

  // Handle row click to expand/collapse
  const handleRowClick = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
      setEditingNotes('');
    } else {
      setExpandedIndex(index);
      setEditingNotes(assignments[index]?.notes || '');
    }
  };

  // Cycle status when badge is tapped
  const cycleStatus = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const assignment = assignments[index];
    if (!assignment || updatingStatus) return;
    
    const current = assignment.status || 'not_started';
    const next = STATUS_CONFIG[current]?.next || 'presented';
    setUpdatingStatus(assignment.id);

    try {
      // Update via API if work_id exists
      if (assignment.work_id) {
        await fetch(`/api/montree/progress/${child.id}/${assignment.work_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        });
      }
      
      // Update local state
      setAssignments(prev => prev.map((a, i) => 
        i === index ? { ...a, status: next as any } : a
      ));
      toast.success(`→ ${next.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdatingStatus(null);
    }
  };


  // Save notes
  const handleSaveNotes = async () => {
    if (expandedIndex === null) return;
    const assignment = assignments[expandedIndex];
    if (!assignment) return;
    
    setSavingNotes(true);
    try {
      // Save to API (you may need to create this endpoint)
      await fetch('/api/montree/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          work_id: assignment.work_id,
          session_type: 'observation',
          notes: editingNotes,
        }),
      });
      
      // Update local state
      setAssignments(prev => prev.map((a, i) => 
        i === expandedIndex ? { ...a, notes: editingNotes } : a
      ));
      toast.success('Notes saved! 📝');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // Open YouTube demo
  const openDemo = (e: React.MouseEvent, workName: string) => {
    e.stopPropagation();
    const q = encodeURIComponent(`${workName} Montessori presentation`);
    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank');
  };

  // Open camera (placeholder - uses WorkNavigator)
  const handleCapture = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info('Use "Find Work" below to capture photos with work linking');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-pulse text-3xl mb-2">📋</div>
        <p className="text-gray-500">Loading assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Assigned Works */}
      {assignments.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-bold text-gray-800">This Week's Focus ({assignments.length})</h2>
            <p className="text-xs text-gray-500 mt-1">Tap a work to expand • Tap status badge to cycle</p>
          </div>
          
          <div className="divide-y">
            {assignments.map((assignment, index) => {
              const isExpanded = expandedIndex === index;
              const areaConf = AREA_CONFIG[assignment.area] || AREA_CONFIG.practical_life;
              const statusConf = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.not_started;

              return (
                <div key={assignment.id || index}>
                  {/* Work Row - Clickable */}
                  <button
                    onClick={() => handleRowClick(index)}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                      isExpanded ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Area Icon */}
                    <div className={`w-10 h-10 rounded-xl ${areaConf.bgColor} flex items-center justify-center text-xl`}>
                      {areaConf.icon}
                    </div>
                    
                    {/* Work Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{assignment.work_name}</p>
                      <p className="text-xs text-gray-500">{areaConf.name}</p>
                    </div>
                    
                    {/* Status Badge - Tappable */}
                    <button
                      onClick={(e) => cycleStatus(e, index)}
                      disabled={updatingStatus === assignment.id}
                      className={`w-10 h-10 rounded-full ${statusConf.bgColor} ${statusConf.color} font-bold flex items-center justify-center text-sm shadow transition-transform active:scale-90 ${
                        updatingStatus === assignment.id ? 'animate-pulse' : ''
                      }`}
                    >
                      {statusConf.label}
                    </button>
                    
                    {/* Expand indicator */}
                    <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  
                  {/* Expanded Panel */}
                  {isExpanded && (
                    <div className="border-t bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                      {/* Notes */}
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                        <textarea
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          placeholder="Add observations about this work..."
                          className="w-full border border-gray-200 rounded-xl p-3 h-20 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                        />
                        {editingNotes !== (assignment.notes || '') && (
                          <button
                            onClick={handleSaveNotes}
                            disabled={savingNotes}
                            className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 text-sm"
                          >
                            {savingNotes ? 'Saving...' : '💾 Save Notes'}
                          </button>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => openDemo(e, assignment.work_name)}
                          className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 active:scale-95 transition-all"
                        >
                          <span>▶️</span><span>Demo</span>
                        </button>
                        <button
                          onClick={handleCapture}
                          className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 active:scale-95 transition-all"
                        >
                          <span>📸</span><span>Capture</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <span className="text-3xl mb-2 block">📋</span>
          <p className="text-gray-500">No assignments for this week yet.</p>
        </div>
      )}

      {/* WorkNavigator for browsing all works */}
      {WorkNavigator && (
        <WorkNavigator
          classroomId={session.classroom?.id}
          childId={child.id}
          childName={child.name}
          schoolId={session.school.id}
        />
      )}

      {/* Tip */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <p className="text-sm text-emerald-800">
          <span className="font-semibold">💡 Tip:</span> Tap status badge to cycle: ○ → P → Pr → M
        </p>
      </div>
    </div>
  );
}


// ============================================
// PROGRESS TAB - Curriculum overview by area
// ============================================

function ProgressTab({ child }: { child: Child }) {
  const [areaProgress, setAreaProgress] = useState<AreaProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  useEffect(() => {
    // Try to fetch from progress API, fall back to empty if not available
    fetch(`/api/classroom/child/${child.id}/progress`)
      .then(r => r.json())
      .then(data => {
        if (data.works) {
          // Process works into areas
          const byArea: Record<string, AreaProgress> = {};
          
          AREAS_LIST.forEach(area => {
            byArea[area.id] = {
              id: area.id,
              name: area.name,
              icon: area.icon,
              works: [],
              stats: { total: 0, presented: 0, practicing: 0, mastered: 0 }
            };
          });
          
          (data.works || []).forEach((w: any) => {
            const areaKey = w.area?.replace('_', '') === 'practicallife' ? 'practical_life' : w.area;
            if (byArea[areaKey]) {
              byArea[areaKey].works.push(w);
              byArea[areaKey].stats.total++;
              if (w.status === 1) byArea[areaKey].stats.presented++;
              if (w.status === 2) byArea[areaKey].stats.practicing++;
              if (w.status >= 3) byArea[areaKey].stats.mastered++;
            }
          });
          
          setAreaProgress(Object.values(byArea));
        }
        setLoading(false);
      })
      .catch(() => {
        // No progress API - show placeholder
        setAreaProgress(AREAS_LIST.map(a => ({
          id: a.id, name: a.name, icon: a.icon, works: [],
          stats: { total: 0, presented: 0, practicing: 0, mastered: 0 }
        })));
        setLoading(false);
      });
  }, [child.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-pulse text-3xl mb-2">📊</div>
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  // Calculate overall stats
  const overall = areaProgress.reduce((acc, a) => ({
    total: acc.total + a.stats.total,
    presented: acc.presented + a.stats.presented,
    practicing: acc.practicing + a.stats.practicing,
    mastered: acc.mastered + a.stats.mastered,
  }), { total: 0, presented: 0, practicing: 0, mastered: 0 });

  const overallPercent = overall.total > 0 ? Math.round((overall.mastered / overall.total) * 100) : 0;


  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Overall Progress</h3>
          <div className="text-2xl font-bold text-emerald-600">{overallPercent}%</div>
        </div>
        
        {/* Progress bar */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full flex">
            <div className="bg-green-500 transition-all" style={{ width: `${overall.total > 0 ? (overall.mastered / overall.total) * 100 : 0}%` }} />
            <div className="bg-blue-500 transition-all" style={{ width: `${overall.total > 0 ? (overall.practicing / overall.total) * 100 : 0}%` }} />
            <div className="bg-yellow-400 transition-all" style={{ width: `${overall.total > 0 ? (overall.presented / overall.total) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{overall.total} works tracked</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />{overall.presented}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{overall.practicing}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{overall.mastered}</span>
          </div>
        </div>
      </div>

      {/* Area Cards */}
      <div className="space-y-3">
        {areaProgress.map(area => {
          const isExpanded = expandedArea === area.id;
          const areaPercent = area.stats.total > 0 ? Math.round((area.stats.mastered / area.stats.total) * 100) : 0;
          const areaConf = AREAS_LIST.find(a => a.id === area.id);

          return (
            <div key={area.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedArea(isExpanded ? null : area.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${areaConf?.gradient || 'from-gray-400 to-gray-500'} flex items-center justify-center text-2xl text-white shadow`}>
                  {area.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{area.name}</p>
                  <p className="text-xs text-gray-500">{area.stats.total} works • {areaPercent}% mastered</p>
                </div>
                <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {isExpanded && area.works.length > 0 && (
                <div className="border-t bg-gray-50 p-3 max-h-60 overflow-y-auto">
                  {area.works.map((work, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-2 text-sm">
                      <span className="text-gray-700 truncate flex-1">{work.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        work.status >= 3 ? 'bg-green-100 text-green-700' :
                        work.status === 2 ? 'bg-blue-100 text-blue-700' :
                        work.status === 1 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {work.status >= 3 ? 'Mastered' : work.status === 2 ? 'Practicing' : work.status === 1 ? 'Presented' : '○'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ============================================
// REPORTS TAB - Generate and share parent reports
// ============================================

function ReportsTab({ child }: { child: Child }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Get current week dates
  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      week_start: monday.toISOString().split('T')[0],
      week_end: sunday.toISOString().split('T')[0],
      display: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    };
  };

  const weekDates = getWeekDates();

  useEffect(() => {
    // Fetch previous reports
    fetch(`/api/montree/reports?child_id=${child.id}&limit=10`)
      .then(r => r.json())
      .then(data => { setReports(data.reports || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [child.id]);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/montree/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          week_start: weekDates.week_start,
          week_end: weekDates.week_end,
          report_type: 'parent',
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Report generated! 🎉');
        // Refresh reports list
        fetch(`/api/montree/reports?child_id=${child.id}&limit=10`)
          .then(r => r.json())
          .then(d => setReports(d.reports || []));
        if (data.share_url) setShareUrl(data.share_url);
      } else {
        toast.error(data.error || 'Failed to generate report');
      }
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const copyShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied! 📋');
    } catch {
      toast.error('Failed to copy');
    }
  };


  return (
    <div className="space-y-4">
      {/* Generate Report Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">📄</div>
          <div>
            <h3 className="font-bold text-lg">Weekly Report</h3>
            <p className="text-white/80 text-sm">{weekDates.display}</p>
          </div>
        </div>
        
        <button
          onClick={generateReport}
          disabled={generating}
          className="w-full py-4 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-lg disabled:opacity-70"
        >
          {generating ? (
            <><span className="animate-spin">⏳</span> Generating...</>
          ) : (
            <><span>✨</span> Generate Report</>
          )}
        </button>
      </div>

      {/* Share Link (if available) */}
      {shareUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">📤 Share with parents:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm text-gray-600"
            />
            <button
              onClick={() => copyShareLink(shareUrl)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Previous Reports */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-800">Previous Reports</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : reports.length > 0 ? (
          <div className="divide-y">
            {reports.map((report, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Week of {report.week_start}</p>
                  <p className="text-xs text-gray-500">Generated {new Date(report.created_at).toLocaleDateString()}</p>
                </div>
                {report.share_url && (
                  <button
                    onClick={() => copyShareLink(report.share_url)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
                  >
                    📋 Copy Link
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <p>No reports generated yet.</p>
            <p className="text-sm mt-1">Take photos and update progress to create your first report!</p>
          </div>
        )}
      </div>
    </div>
  );
}
