'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';

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

  // Check session on mount
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

  // Fetch children when session is ready
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

  // Child detail view
  if (selectedChild) {
    return (
      <ChildDetailView
        child={selectedChild}
        session={session}
        onBack={() => setSelectedChild(null)}
      />
    );
  }

  // Main classroom view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
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
            
            <button
              onClick={handleLogout}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Student Grid */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <span className="text-5xl mb-4 block">👶</span>
            <p className="text-gray-500 mb-4">No students in this classroom yet</p>
            <p className="text-sm text-gray-400">
              Add students in the admin panel or run the database migration
            </p>
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
                  {child.age && (
                    <p className="text-sm text-gray-500">Age {child.age}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-around">
          <button className="flex flex-col items-center text-emerald-600">
            <span className="text-xl">🏠</span>
            <span className="text-xs font-medium">Home</span>
          </button>
          <button 
            onClick={() => router.push('/montree/dashboard/progress')}
            className="flex flex-col items-center text-gray-400"
          >
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

// Child Detail View - uses real WorkNavigator
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
      
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              ←
            </button>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
              {child.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{child.name}</h1>
              <p className="text-emerald-100 text-sm">
                {session.classroom?.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-[72px] z-30">
        <div className="max-w-4xl mx-auto px-4 py-2 flex gap-2">
          {[
            { id: 'week', label: '📋 Week', icon: '📋' },
            { id: 'progress', label: '📊 Progress', icon: '📊' },
            { id: 'reports', label: '📄 Reports', icon: '📄' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'week' && (
          <WeeklyWorksTab child={child} session={session} />
        )}
        {activeTab === 'progress' && (
          <ProgressTab child={child} session={session} />
        )}
        {activeTab === 'reports' && (
          <ReportsTab child={child} session={session} />
        )}
      </main>
    </div>
  );
}

// Weekly Works Tab - shows assigned works from database
function WeeklyWorksTab({ child, session }: { child: Child; session: Session }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [WorkNavigator, setWorkNavigator] = useState<any>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    import('@/components/montree/WorkNavigator').then(mod => {
      setWorkNavigator(() => mod.default);
    });
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
      {/* Assigned works */}
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
                  
                  {/* Expanded Panel */}
                  {isExpanded && (
                    <div className="mt-1 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openDemo(a.work_name)}
                          className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 active:scale-95"
                        >
                          ▶️ Demo
                        </button>
                        <button
                          onClick={() => alert('Use "Find Work" below to capture photos')}
                          className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-95"
                        >
                          📸 Capture
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

      {/* Find Work button */}
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
          <span className="font-semibold">💡 Tip:</span> Tap a status badge to cycle through: 
          Not Started → Presented → Practicing → Mastered
        </p>
      </div>
    </div>
  );
}

// Progress Tab
function ProgressTab({ child, session }: { child: Child; session: Session }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
      <span className="text-4xl mb-4 block">📊</span>
      <h3 className="font-bold text-gray-800 mb-2">Progress Overview</h3>
      <p className="text-gray-500 mb-4">
        View {child.name}'s progress across all Montessori areas
      </p>
      <a
        href={`/montree/dashboard/progress?child=${child.id}`}
        className="inline-block px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
      >
        View Full Progress →
      </a>
    </div>
  );
}

// Reports Tab
function ReportsTab({ child, session }: { child: Child; session: Session }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
            📄
          </div>
          <div>
            <h3 className="font-bold text-lg">Weekly Report</h3>
            <p className="text-white/80 text-sm">Generate parent report</p>
          </div>
        </div>
        
        <button className="w-full py-4 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-lg">
          <span>✨</span>
          <span>Generate Report</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">Previous Reports</h3>
        <p className="text-gray-500 text-sm">
          No reports generated yet. Take photos and update progress to create your first report!
        </p>
      </div>
    </div>
  );
}
