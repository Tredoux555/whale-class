'use client';

import { useState, useEffect, useRef } from 'react';
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

// Status wheel component - beautiful radial picker
function StatusWheel({ 
  currentStatus, 
  onSelect, 
  onClose,
  position 
}: { 
  currentStatus: string;
  onSelect: (status: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}) {
  const statuses = [
    { key: 'not_started', label: '○', name: 'Not Started', color: 'bg-gray-200', ring: 'ring-gray-400' },
    { key: 'presented', label: 'P', name: 'Presented', color: 'bg-amber-300', ring: 'ring-amber-500' },
    { key: 'practicing', label: 'Pr', name: 'Practicing', color: 'bg-blue-400', ring: 'ring-blue-500' },
    { key: 'completed', label: 'M', name: 'Mastered', color: 'bg-emerald-400', ring: 'ring-emerald-500' },
  ];

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div 
        className="absolute"
        style={{ 
          left: Math.min(position.x - 80, window.innerWidth - 180),
          top: Math.min(position.y - 80, window.innerHeight - 200)
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Wheel container */}
        <div className="relative w-40 h-40">
          {statuses.map((status, i) => {
            const angle = (i * 90) - 45; // Position in circle
            const rad = (angle * Math.PI) / 180;
            const radius = 50;
            const x = 70 + radius * Math.cos(rad);
            const y = 70 + radius * Math.sin(rad);
            const isActive = currentStatus === status.key;
            
            return (
              <button
                key={status.key}
                onClick={() => onSelect(status.key)}
                className={`absolute w-14 h-14 rounded-full flex flex-col items-center justify-center 
                  shadow-lg transform transition-all duration-200 active:scale-90
                  ${status.color} ${isActive ? `ring-4 ${status.ring} scale-110` : 'hover:scale-105'}
                `}
                style={{ left: x, top: y }}
              >
                <span className="text-lg font-bold">{status.label}</span>
                <span className="text-[8px] font-medium opacity-80">{status.name.split(' ')[0]}</span>
              </button>
            );
          })}
          {/* Center label */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
            w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500">Status</span>
          </div>
        </div>
      </div>
    </div>
  );
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
      setSession(JSON.parse(stored));
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
    return <ChildDetailView child={selectedChild} session={session} onBack={() => setSelectedChild(null)} />;
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
                <h1 className="text-xl font-bold">{session.classroom?.name || 'My Classroom'}</h1>
                <p className="text-emerald-100 text-sm">{children.length} students • {session.school.name}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-sm text-white/70 hover:text-white">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {children.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <span className="text-5xl mb-4 block">👶</span>
            <p className="text-gray-500">No students in this classroom yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {children.map((child, i) => {
              const colors = ['from-emerald-400 to-teal-500', 'from-blue-400 to-indigo-500', 
                'from-amber-400 to-orange-500', 'from-pink-400 to-rose-500',
                'from-purple-400 to-violet-500', 'from-cyan-400 to-sky-500'];
              return (
                <button key={child.id} onClick={() => setSelectedChild(child)}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all text-center active:scale-95">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colors[i % 6]} mx-auto mb-3 flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                    {child.photo_url ? <img src={child.photo_url} className="w-full h-full rounded-full object-cover" alt="" /> : child.name.charAt(0)}
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
            <span className="text-xl">🏠</span><span className="text-xs font-medium">Home</span>
          </button>
          <button onClick={() => router.push('/montree/dashboard/progress')} className="flex flex-col items-center text-gray-400">
            <span className="text-xl">📊</span><span className="text-xs">Progress</span>
          </button>
          <button className="flex flex-col items-center text-gray-400">
            <span className="text-xl">📄</span><span className="text-xs">Reports</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// Child Detail View
function ChildDetailView({ child, session, onBack }: { child: Child; session: Session; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'week' | 'progress' | 'reports'>('week');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 pb-20">
      <Toaster position="top-center" richColors />
      
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

      <div className="bg-white border-b sticky top-[72px] z-30">
        <div className="max-w-4xl mx-auto px-4 py-2 flex gap-2">
          {[{ id: 'week', label: '📋 Week' }, { id: 'progress', label: '📊 Progress' }, { id: 'reports', label: '📄 Reports' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'}`}>
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

// Weekly Works Tab with STATUS WHEEL and YELLOW NOTES
function WeeklyWorksTab({ child, session }: { child: Child; session: Session }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [WorkNavigator, setWorkNavigator] = useState<any>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [savingNote, setSavingNote] = useState<number | null>(null);
  
  // Status wheel state
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelPosition, setWheelPosition] = useState({ x: 0, y: 0 });
  const [wheelWorkIndex, setWheelWorkIndex] = useState<number | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    import('@/components/montree/WorkNavigator').then(mod => setWorkNavigator(() => mod.default));
  }, []);

  useEffect(() => {
    fetch(`/api/montree/weekly-assignments?child_id=${child.id}&week=4&year=2026`)
      .then(r => r.json())
      .then(data => {
        setAssignments(data.assignments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [child.id]);

  const openDemo = (workName: string) => {
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(workName + ' Montessori presentation')}`, '_blank');
  };

  // Long press to open wheel
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, index: number) => {
    const touch = 'touches' in e ? e.touches[0] : e;
    longPressTimer.current = setTimeout(() => {
      setWheelPosition({ x: touch.clientX, y: touch.clientY });
      setWheelWorkIndex(index);
      setWheelOpen(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Quick tap to cycle status
  const cycleStatus = async (index: number) => {
    const a = assignments[index];
    const flow = ['not_started', 'presented', 'practicing', 'completed'];
    const currentIdx = flow.indexOf(a.status || 'not_started');
    const nextStatus = flow[(currentIdx + 1) % flow.length];
    
    // Update local state immediately
    const updated = [...assignments];
    updated[index] = { ...a, status: nextStatus };
    setAssignments(updated);
    
    // Save to API
    try {
      await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: child.id, work_name: a.work_name, status: nextStatus }),
      });
      toast.success(`→ ${nextStatus === 'completed' ? 'Mastered' : nextStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  // Wheel selection
  const handleWheelSelect = async (newStatus: string) => {
    if (wheelWorkIndex === null) return;
    
    const updated = [...assignments];
    updated[wheelWorkIndex] = { ...updated[wheelWorkIndex], status: newStatus };
    setAssignments(updated);
    setWheelOpen(false);
    
    const a = assignments[wheelWorkIndex];
    try {
      await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: child.id, work_name: a.work_name, status: newStatus }),
      });
      toast.success(`→ ${newStatus === 'completed' ? 'Mastered' : newStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update');
    }
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
          child_id: child.id, work_name: assignment.work_name, area: assignment.area,
          notes: noteText, teacher_id: session.teacher.id,
        }),
      });
      if (res.ok) {
        toast.success('Note saved!');
        setNotes(prev => ({ ...prev, [index]: '' }));
      }
    } catch { toast.error('Error saving'); }
    setSavingNote(null);
  };

  const areaConfig: Record<string, { icon: string; name: string }> = {
    practical_life: { icon: '🧹', name: 'Practical Life' },
    sensorial: { icon: '👁️', name: 'Sensorial' },
    math: { icon: '🔢', name: 'Math' },
    language: { icon: '📚', name: 'Language' },
    cultural: { icon: '🌍', name: 'Cultural' },
  };

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    not_started: { label: '○', bg: 'bg-gray-200', text: 'text-gray-600' },
    presented: { label: 'P', bg: 'bg-amber-300', text: 'text-amber-800' },
    practicing: { label: 'Pr', bg: 'bg-blue-400', text: 'text-blue-800' },
    completed: { label: 'M', bg: 'bg-emerald-400', text: 'text-emerald-800' },
  };

  return (
    <div className="space-y-4">
      {/* Status Wheel Modal */}
      {wheelOpen && wheelWorkIndex !== null && (
        <StatusWheel
          currentStatus={assignments[wheelWorkIndex]?.status || 'not_started'}
          onSelect={handleWheelSelect}
          onClose={() => setWheelOpen(false)}
          position={wheelPosition}
        />
      )}

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
              const config = areaConfig[a.area] || { icon: '📋', name: a.area };
              const status = statusConfig[a.status] || statusConfig.not_started;
              const isExpanded = expandedIndex === i;
              
              return (
                <div key={i}>
                  <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isExpanded ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    {/* Area icon - tap to expand */}
                    <button onClick={() => setExpandedIndex(isExpanded ? null : i)} className="text-2xl">
                      {config.icon}
                    </button>
                    
                    {/* Work name - tap to expand */}
                    <button onClick={() => setExpandedIndex(isExpanded ? null : i)} className="flex-1 text-left">
                      <p className="font-medium text-gray-800">{a.work_name}</p>
                      <p className="text-xs text-gray-500">{config.name}</p>
                    </button>
                    
                    {/* Status badge - TAP to cycle, LONG PRESS for wheel */}
                    <button
                      onClick={() => cycleStatus(i)}
                      onMouseDown={(e) => handleTouchStart(e, i)}
                      onMouseUp={handleTouchEnd}
                      onMouseLeave={handleTouchEnd}
                      onTouchStart={(e) => handleTouchStart(e, i)}
                      onTouchEnd={handleTouchEnd}
                      className={`w-10 h-10 rounded-full ${status.bg} ${status.text} font-bold text-sm flex items-center justify-center shadow-sm active:scale-90 transition-transform`}
                    >
                      {status.label}
                    </button>
                    
                    {/* Expand arrow */}
                    <button onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </button>
                  </div>

                  {/* Expanded Panel */}
                  {isExpanded && (
                    <div className="mt-1 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 space-y-3">
                      {/* Action buttons */}
                      <div className="flex gap-3">
                        <button onClick={() => openDemo(a.work_name)}
                          className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 active:scale-95">
                          ▶️ Demo
                        </button>
                        <button onClick={() => toast.info('Camera coming soon!')}
                          className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-95">
                          📸 Capture
                        </button>
                      </div>
                      
                      {/* YELLOW STICKY NOTES */}
                      <div className="relative">
                        <div className="absolute -top-1 left-4 w-8 h-3 bg-amber-400/50 rounded-b-sm" /> {/* Tape effect */}
                        <textarea
                          value={notes[i] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [i]: e.target.value }))}
                          placeholder="Add observation, progress note..."
                          className="w-full p-4 pt-5 rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none
                            bg-gradient-to-b from-amber-100 to-amber-50 border-0 shadow-md
                            font-['Caveat',_cursive] text-amber-900 placeholder-amber-400 text-base leading-relaxed"
                          style={{ 
                            backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #fcd34d40 28px)',
                            minHeight: '80px'
                          }}
                          rows={3}
                        />
                        <button
                          onClick={() => saveNote(i, a)}
                          disabled={!notes[i]?.trim() || savingNote === i}
                          className="absolute bottom-2 right-2 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg 
                            disabled:opacity-50 hover:bg-amber-600 active:scale-95 shadow-sm"
                        >
                          {savingNote === i ? '...' : '📌 Save'}
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
        <WorkNavigator classroomId={session.classroom?.id} childId={child.id} childName={child.name} schoolId={session.school.id} />
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">💡 Tip:</span> Tap status badge to cycle (○ → P → Pr → M). Long-press for wheel picker!
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
    fetch(`/api/montree/sessions?child_id=${child.id}`)
      .then(r => r.json())
      .then(data => {
        setSessions(data.sessions || []);
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
    return <div className="bg-white rounded-2xl p-8 text-center"><div className="animate-pulse text-3xl mb-2">📊</div><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{stats.presented}</p>
          <p className="text-xs text-amber-800">Presented</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{stats.practicing}</p>
          <p className="text-xs text-blue-800">Practicing</p>
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
          <p className="text-gray-500 text-sm">No observations recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 10).map((sess, i) => {
              const config = areaConfig[sess.area] || { icon: '📋', name: sess.area, color: 'bg-gray-100 text-gray-800' };
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-2xl">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{sess.work_name}</p>
                    {sess.notes && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{sess.notes}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(sess.created_at || sess.observed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
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
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{count} works</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Reports Tab - Generates with parent descriptions
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
      const worksRes = await fetch('/api/montree/works/search?limit=500');
      const worksData = await worksRes.json();
      const worksMap = new Map((worksData.works || []).map((w: any) => [w.name, w]));

      const reportData = {
        child_name: child.name,
        classroom: session.classroom?.name,
        generated_at: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        activities: sessions.slice(0, 20).map(sess => {
          const work = worksMap.get(sess.work_name);
          return {
            work_name: sess.work_name,
            area: sess.area,
            notes: sess.notes,
            date: new Date(sess.created_at || sess.observed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            parent_explanation: work?.parent_explanation_simple || `${child.name} worked on ${sess.work_name}.`,
            why_it_matters: work?.parent_why_it_matters || '',
          };
        }),
      };
      setReport(reportData);
      toast.success('Report generated!');
    } catch { toast.error('Failed to generate'); }
    setGenerating(false);
  };

  const areaEmojis: Record<string, string> = { practical_life: '🧹', sensorial: '👁️', math: '🔢', language: '📚', cultural: '🌍' };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">📄</div>
          <div>
            <h3 className="font-bold text-lg">Weekly Report</h3>
            <p className="text-white/80 text-sm">{sessions.length} activities recorded</p>
          </div>
        </div>
        <button onClick={generateReport} disabled={generating || sessions.length === 0}
          className="w-full py-4 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 disabled:opacity-50 text-lg">
          {generating ? '⏳ Generating...' : '✨ Generate Report'}
        </button>
      </div>

      {report && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Weekly Progress Report</h2>
            <p className="text-emerald-600 font-medium">{report.child_name}</p>
            <p className="text-sm text-gray-500">{report.classroom} • {report.generated_at}</p>
          </div>
          <div className="space-y-4">
            <p className="text-gray-700">Dear Parent, here's what <strong>{report.child_name}</strong> has been exploring:</p>
            {report.activities.map((act: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{areaEmojis[act.area] || '📋'}</span>
                  <span className="font-semibold text-gray-800">{act.work_name}</span>
                  <span className="text-xs text-gray-400 ml-auto">{act.date}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{act.parent_explanation}</p>
                {act.why_it_matters && <p className="text-xs text-emerald-700 italic">💡 {act.why_it_matters}</p>}
                {act.notes && <p className="text-sm text-blue-700 mt-2 bg-blue-50 p-2 rounded-lg">📝 {act.notes}</p>}
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t text-center">
            <button className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600">📤 Share with Parents</button>
          </div>
        </div>
      )}

      {!report && sessions.length === 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">Previous Reports</h3>
          <p className="text-gray-500 text-sm">Add notes in the Week tab to generate your first report!</p>
        </div>
      )}
    </div>
  );
}
