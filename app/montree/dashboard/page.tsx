'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';

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

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('montree_session');
    if (!stored) {
      router.push('/montree/login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setSession(parsed);
    } catch {
      router.push('/montree/login');
    }
  }, [router]);

  useEffect(() => {
    if (!session?.classroom?.id) {
      setLoading(false);
      return;
    }

    fetch(`/api/montree/children?classroom_id=${session.classroom.id}`)
      .then(r => r.json())
      .then(data => {
        setChildren(data.children || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session?.classroom?.id]);

  const handleLogout = () => {
    localStorage.removeItem('montree_session');
    router.push('/montree/login');
  };

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
    return (
      <ChildDetailView
        child={selectedChild}
        session={session}
        onBack={() => setSelectedChild(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <Toaster position="top-center" richColors />
      
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🐋</span>
              <div>
                <h1 className="text-xl font-bold">
                  {session.classroom?.name || 'My Classroom'}
                </h1>
                <p className="text-emerald-100 text-sm">
                  {children.length} students • {session.school.name}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-sm text-white/70 hover:text-white">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {children.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <span className="text-5xl mb-4 block">👶</span>
            <p className="text-gray-500 mb-4">No students in this classroom yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {children.map((child, i) => {
              const colors = [
                'from-emerald-400 to-teal-500',
                'from-blue-400 to-indigo-500',
                'from-amber-400 to-orange-500',
                'from-pink-400 to-rose-500',
                'from-purple-400 to-violet-500',
                'from-cyan-400 to-sky-500',
              ];
              const gradient = colors[i % colors.length];

              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all text-center active:scale-95"
                >
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} mx-auto mb-3 flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                    {child.photo_url ? (
                      <img src={child.photo_url} className="w-full h-full rounded-full object-cover" alt={child.name} />
                    ) : (
                      child.name.charAt(0)
                    )}
                  </div>
                  <p className="font-semibold text-gray-800">{child.name}</p>
                  {child.age && <p className="text-sm text-gray-500">Age {child.age}</p>}
                </button>
              );
            })}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-around">
          <button className="flex flex-col items-center text-emerald-600">
            <span className="text-xl">🏠</span>
            <span className="text-xs font-medium">Home</span>
          </button>
          <button onClick={() => router.push('/montree/dashboard/progress')} className="flex flex-col items-center text-gray-400">
            <span className="text-xl">📊</span>
            <span className="text-xs">Progress</span>
          </button>
          <button className="flex flex-col items-center text-gray-400">
            <span className="text-xl">📄</span>
            <span className="text-xs">Reports</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// Child Detail View
function ChildDetailView({ 
  child, 
  session,
  onBack 
}: { 
  child: Child;
  session: Session;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'week' | 'progress' | 'reports'>('week');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 pb-20">
      <Toaster position="top-center" richColors />
      
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30">
              ←
            </button>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
              {child.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{child.name}</h1>
              <p className="text-emerald-100 text-sm">{session.classroom?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b sticky top-[72px] z-30">
        <div className="max-w-4xl mx-auto px-4 py-2 flex gap-2">
          {[
            { id: 'week', label: '📋 Week' },
            { id: 'progress', label: '📊 Progress' },
            { id: 'reports', label: '📄 Reports' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'week' && <WeeklyWorksTab child={child} session={session} />}
        {activeTab === 'progress' && <ProgressTab child={child} />}
        {activeTab === 'reports' && <ReportsTab child={child} session={session} />}
      </main>
    </div>
  );
}

// Weekly Works Tab with NOTES
function WeeklyWorksTab({ child, session }: { child: Child; session: Session }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [WorkNavigator, setWorkNavigator] = useState<any>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [savingNote, setSavingNote] = useState<number | null>(null);

  useEffect(() => {
    import('@/components/montree/WorkNavigator').then(mod => setWorkNavigator(() => mod.default));
  }, []);

  useEffect(() => {
    fetch(`/api/montree/weekly-assignments?child_id=${child.id}&week=2&year=2026`)
      .then(r => r.json())
      .then(data => {
        setAssignments(data.assignments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [child.id]);

  const handleRowClick = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const openDemo = (workName: string) => {
    const q = encodeURIComponent(`${workName} Montessori presentation`);
    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank');
  };

  const saveNote = async (index: number, assignment: any) => {
    const noteText = notes[index];
    if (!noteText?.trim()) return;
    
    setSavingNote(index);
    try {
      const res = await fetch('/api/montree/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          work_name: assignment.work_name,
          area: assignment.area,
          notes: noteText,
          teacher_id: session.teacher.id,
        }),
      });
      if (res.ok) {
        toast.success('Note saved!');
        setNotes(prev => ({ ...prev, [index]: '' }));
      } else {
        toast.error('Failed to save note');
      }
    } catch {
      toast.error('Error saving note');
    }
    setSavingNote(null);
  };

  const areaConfig: Record<string, { icon: string; color: string; name: string }> = {
    practical_life: { icon: '🧹', color: '#22c55e', name: 'Practical Life' },
    sensorial: { icon: '👁️', color: '#f97316', name: 'Sensorial' },
    math: { icon: '🔢', color: '#3b82f6', name: 'Math' },
    language: { icon: '📚', color: '#ec4899', name: 'Language' },
    cultural: { icon: '🌍', color: '#8b5cf6', name: 'Cultural' },
  };

  const statusColors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-600',
    presented: 'bg-blue-100 text-blue-700',
    practicing: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-pulse text-3xl mb-2">📋</div>
          <p className="text-gray-500">Loading assignments...</p>
        </div>
      ) : assignments.length > 0 ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">This Week's Focus</h2>
          <div className="space-y-2">
            {assignments.map((a, i) => {
              const config = areaConfig[a.area] || { icon: '📋', color: '#666', name: a.area };
              const isExpanded = expandedIndex === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => handleRowClick(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                      isExpanded ? 'bg-emerald-50' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-2xl">{config.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{a.work_name}</p>
                      <p className="text-xs text-gray-500">{config.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status] || statusColors.not_started}`}>
                      {a.status === 'presented' ? 'P' : a.status === 'practicing' ? 'Pr' : a.status === 'completed' ? 'M' : '○'}
                    </span>
                    <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  {/* Expanded Panel with NOTES */}
                  {isExpanded && (
                    <div className="mt-1 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 space-y-3">
                      {/* Action buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => openDemo(a.work_name)}
                          className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 active:scale-95"
                        >
                          ▶️ Demo
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Open camera
                            toast.info('Camera coming soon!');
                          }}
                          className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-95"
                        >
                          📸 Capture
                        </button>
                      </div>
                      
                      {/* NOTES textarea */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Quick Note</label>
                        <textarea
                          value={notes[i] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [i]: e.target.value }))}
                          placeholder="Add observation, progress note, or reminder..."
                          className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          rows={2}
                        />
                        <button
                          onClick={() => saveNote(i, a)}
                          disabled={!notes[i]?.trim() || savingNote === i}
                          className="mt-2 w-full py-2 bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 active:scale-95"
                        >
                          {savingNote === i ? 'Saving...' : '💾 Save Note'}
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
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-2">This Week's Focus</h2>
          <p className="text-sm text-gray-500">No assignments for this week yet.</p>
        </div>
      )}

      {WorkNavigator && (
        <WorkNavigator
          classroomId={session.classroom?.id}
          childId={child.id}
          childName={child.name}
          schoolId={session.school.id}
        />
      )}

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <p className="text-sm text-emerald-800">
          <span className="font-semibold">💡 Tip:</span> Add notes for each work to track observations and progress.
        </p>
      </div>
    </div>
  );
}

// Progress Tab - Shows data DIRECTLY
function ProgressTab({ child }: { child: Child }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ presented: 0, practicing: 0, mastered: 0 });

  useEffect(() => {
    // Fetch child's session history
    fetch(`/api/montree/sessions?child_id=${child.id}`)
      .then(r => r.json())
      .then(data => {
        setSessions(data.sessions || []);
        // Calculate stats from sessions
        const s = { presented: 0, practicing: 0, mastered: 0 };
        (data.sessions || []).forEach((sess: any) => {
          if (sess.status === 'presented') s.presented++;
          else if (sess.status === 'practicing') s.practicing++;
          else if (sess.status === 'completed' || sess.status === 'mastered') s.mastered++;
        });
        setStats(s);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [child.id]);

  const areaConfig: Record<string, { icon: string; name: string; color: string }> = {
    practical_life: { icon: '🧹', name: 'Practical Life', color: 'bg-green-100 text-green-800' },
    sensorial: { icon: '👁️', name: 'Sensorial', color: 'bg-orange-100 text-orange-800' },
    math: { icon: '🔢', name: 'Math', color: 'bg-blue-100 text-blue-800' },
    language: { icon: '📚', name: 'Language', color: 'bg-pink-100 text-pink-800' },
    cultural: { icon: '🌍', name: 'Cultural', color: 'bg-purple-100 text-purple-800' },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-pulse text-3xl mb-2">📊</div>
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.presented}</p>
          <p className="text-xs text-blue-800">Presented</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{stats.practicing}</p>
          <p className="text-xs text-amber-800">Practicing</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{stats.mastered}</p>
          <p className="text-xs text-emerald-800">Mastered</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">Recent Activity</h3>
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No observations recorded yet. Add notes in the Week tab!</p>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 10).map((sess, i) => {
              const config = areaConfig[sess.area] || { icon: '📋', name: sess.area, color: 'bg-gray-100 text-gray-800' };
              const date = new Date(sess.created_at).toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric' 
              });
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-2xl">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{sess.work_name}</p>
                    {sess.notes && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{sess.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress by Area */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">Progress by Area</h3>
        <div className="space-y-2">
          {Object.entries(areaConfig).map(([key, config]) => {
            const count = sessions.filter(s => s.area === key).length;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xl">{config.icon}</span>
                <span className="flex-1 text-sm text-gray-700">{config.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  {count} works
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Reports Tab - Generates actual reports with parent descriptions
function ReportsTab({ child, session }: { child: Child; session: Session }) {
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/montree/sessions?child_id=${child.id}`)
      .then(r => r.json())
      .then(data => setSessions(data.sessions || []))
      .catch(() => {});
  }, [child.id]);

  const generateReport = async () => {
    setGenerating(true);
    try {
      // Fetch parent-friendly descriptions from montessori_works
      const worksRes = await fetch('/api/montree/works/search?limit=500');
      const worksData = await worksRes.json();
      const worksMap = new Map(
        (worksData.works || []).map((w: any) => [w.name, w])
      );

      // Build report data
      const reportData = {
        child_name: child.name,
        classroom: session.classroom?.name,
        generated_at: new Date().toLocaleDateString('en-US', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        }),
        activities: sessions.slice(0, 20).map(sess => {
          const work = worksMap.get(sess.work_name);
          return {
            work_name: sess.work_name,
            area: sess.area,
            notes: sess.notes,
            date: new Date(sess.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            parent_explanation: work?.parent_explanation_simple || 
              `${child.name} worked on ${sess.work_name} in the ${sess.area?.replace('_', ' ')} area.`,
            why_it_matters: work?.parent_why_it_matters || '',
          };
        }),
      };
      
      setReport(reportData);
      toast.success('Report generated!');
    } catch (err) {
      toast.error('Failed to generate report');
    }
    setGenerating(false);
  };

  const areaEmojis: Record<string, string> = {
    practical_life: '🧹',
    sensorial: '👁️',
    math: '🔢',
    language: '📚',
    cultural: '🌍',
  };

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">📄</div>
          <div>
            <h3 className="font-bold text-lg">Weekly Report</h3>
            <p className="text-white/80 text-sm">
              {sessions.length} activities recorded
            </p>
          </div>
        </div>
        
        <button 
          onClick={generateReport}
          disabled={generating || sessions.length === 0}
          className="w-full py-4 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-lg disabled:opacity-50"
        >
          {generating ? (
            <>⏳ Generating...</>
          ) : (
            <>✨ Generate Report</>
          )}
        </button>
      </div>

      {/* Generated Report Preview */}
      {report && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Weekly Progress Report</h2>
            <p className="text-emerald-600 font-medium">{report.child_name}</p>
            <p className="text-sm text-gray-500">{report.classroom} • {report.generated_at}</p>
          </div>

          <div className="space-y-4">
            <p className="text-gray-700">
              Dear Parent, here's what <strong>{report.child_name}</strong> has been exploring this week:
            </p>

            {report.activities.map((act: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{areaEmojis[act.area] || '📋'}</span>
                  <span className="font-semibold text-gray-800">{act.work_name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{act.date}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{act.parent_explanation}</p>
                {act.why_it_matters && (
                  <p className="text-xs text-emerald-700 italic">💡 {act.why_it_matters}</p>
                )}
                {act.notes && (
                  <p className="text-sm text-blue-700 mt-2 bg-blue-50 p-2 rounded-lg">
                    📝 Teacher note: {act.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t text-center">
            <button className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600">
              📤 Share with Parents
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && sessions.length === 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">Previous Reports</h3>
          <p className="text-gray-500 text-sm">
            No activities recorded yet. Add notes and observations in the Week tab to generate your first report!
          </p>
        </div>
      )}
    </div>
  );
}
