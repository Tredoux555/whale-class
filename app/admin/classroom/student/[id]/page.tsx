'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

interface Child {
  id: string;
  name: string;
  display_order: number;
  date_of_birth?: string;
  age?: number;
  photo_url?: string;
  progress: {
    presented: number;
    practicing: number;
    mastered: number;
    total: number;
  };
  mediaCount: number;
}

interface WorkAssignment {
  id: string;
  work_name: string;
  work_id?: string;
  area: string;
  progress_status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  notes?: string;
  mediaCount?: number;
}

interface AreaProgress {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  works: { id: string; name: string; status: number }[];
  stats: { total: number; presented: number; practicing: number; mastered: number };
}

const TABS = [
  { id: 'week', label: 'This Week', icon: '📋' },
  { id: 'progress', label: 'Progress', icon: '📊' },
  { id: 'portfolio', label: 'Portfolio', icon: '📷' },
];

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', next: 'presented' },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800', next: 'practicing' },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800', next: 'mastered' },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800', next: 'not_started' },
};

const AREA_CONFIG: Record<string, { letter: string; color: string; bg: string }> = {
  practical_life: { letter: 'P', color: 'text-pink-700', bg: 'bg-pink-100' },
  sensorial: { letter: 'S', color: 'text-purple-700', bg: 'bg-purple-100' },
  math: { letter: 'M', color: 'text-blue-700', bg: 'bg-blue-100' },
  mathematics: { letter: 'M', color: 'text-blue-700', bg: 'bg-blue-100' },
  language: { letter: 'L', color: 'text-green-700', bg: 'bg-green-100' },
  culture: { letter: 'C', color: 'text-orange-700', bg: 'bg-orange-100' },
};

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-50' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'from-purple-500 to-violet-500', bgColor: 'bg-purple-50' },
  { id: 'math', name: 'Math', icon: '🔢', color: 'from-blue-500 to-indigo-500', bgColor: 'bg-blue-50' },
  { id: 'language', name: 'Language', icon: '📖', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50' },
  { id: 'culture', name: 'Cultural', icon: '🌍', color: 'from-orange-500 to-amber-500', bgColor: 'bg-orange-50' },
];

const STATUS_LABELS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-blue-500 to-indigo-500',
  'from-cyan-500 to-teal-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
];

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  
  const [student, setStudent] = useState<Child | null>(null);
  const [activeTab, setActiveTab] = useState('week');
  const [loading, setLoading] = useState(true);
  const [mediaRefreshKey, setMediaRefreshKey] = useState(0);

  useEffect(() => {
    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  async function fetchStudent() {
    try {
      const res = await fetch(`/api/classroom/child/${studentId}`);
      const data = await res.json();
      setStudent(data.child);
    } catch (err) {
      console.error('Failed to fetch student:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleMediaUploaded = () => {
    setMediaRefreshKey(prev => prev + 1);
    if (student) {
      setStudent({ ...student, mediaCount: student.mediaCount + 1 });
    }
  };

  const getGradient = () => {
    if (!student) return AVATAR_GRADIENTS[0];
    const index = student.name.charCodeAt(0) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-bounce">👶</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Student not found</h2>
          <Link href="/admin/classroom" className="text-blue-600 hover:underline">
            ← Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className={`bg-gradient-to-r ${getGradient()} text-white sticky top-0 z-50`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/classroom"
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            
            <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
              {student.photo_url ? (
                <img src={student.photo_url} alt={student.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">{student.name.charAt(0)}</span>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold">{student.name}</h1>
              <div className="flex items-center gap-3 text-white/80 text-sm">
                {student.age && <span>Age {student.age.toFixed(1)}</span>}
                {student.mediaCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span>📷</span> {student.mediaCount}
                  </span>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
              <span className="text-xs">🟡 {student.progress?.presented || 0}</span>
              <span className="text-xs">🔵 {student.progress?.practicing || 0}</span>
              <span className="text-xs">🟢 {student.progress?.mastered || 0}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b shadow-sm sticky top-[88px] z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'week' && (
          <ThisWeekTab 
            childId={studentId} 
            childName={student.name}
            onMediaUploaded={handleMediaUploaded}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressTab 
            childId={studentId} 
            childName={student.name}
          />
        )}
        {activeTab === 'portfolio' && (
          <PortfolioTab 
            key={mediaRefreshKey}
            childId={studentId} 
            childName={student.name}
          />
        )}
      </main>
    </div>
  );
}

// ============================================
// THIS WEEK TAB
// ============================================
function ThisWeekTab({ childId, childName, onMediaUploaded }: { 
  childId: string; 
  childName: string;
  onMediaUploaded?: () => void;
}) {
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekInfo, setWeekInfo] = useState<{ week: number; year: number } | null>(null);
  const [activeCapture, setActiveCapture] = useState<WorkAssignment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssignments();
  }, [childId]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`/api/classroom/child/${childId}/week`);
      const data = await res.json();
      setAssignments(data.assignments || []);
      setWeekInfo(data.weekInfo);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTap = async (assignment: WorkAssignment) => {
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    
    setAssignments(prev => prev.map(a => 
      a.id === assignment.id ? { ...a, progress_status: nextStatus as any } : a
    ));

    try {
      await fetch('/api/weekly-planning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id, status: nextStatus }),
      });
      toast.success(`${assignment.work_name} → ${nextStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Failed to update:', error);
      fetchAssignments();
    }
  };

  const handleCaptureTap = (assignment: WorkAssignment) => {
    setActiveCapture(assignment);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCapture) return;

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error(`File too large! Max ${isVideo ? '50MB' : '10MB'}`);
      fileInputRef.current!.value = '';
      setActiveCapture(null);
      return;
    }

    toast.info(`📤 Saving to ${childName}...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);
    formData.append('assignmentId', activeCapture.id);
    formData.append('workId', activeCapture.work_id || '');
    formData.append('workName', activeCapture.work_name);
    if (weekInfo) {
      formData.append('weekNumber', weekInfo.week.toString());
      formData.append('year', weekInfo.year.toString());
    }

    fileInputRef.current!.value = '';
    setActiveCapture(null);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`✅ Saved!`);
        setAssignments(prev => prev.map(a => 
          a.id === activeCapture.id 
            ? { ...a, mediaCount: (a.mediaCount || 0) + 1 } 
            : a
        ));
        onMediaUploaded?.();
      } else {
        toast.error('❌ ' + (data.error || 'Upload failed'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('❌ Upload failed');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl animate-pulse">📋</span>
        </div>
        <p className="text-gray-500">Loading this week...</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📋</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No assignments this week</h3>
        <p className="text-gray-500 text-sm mb-4">
          Upload a weekly plan to see {childName}'s assigned works
        </p>
        <Link 
          href="/admin/weekly-planning"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          📄 Upload Weekly Plan
        </Link>
      </div>
    );
  }

  const stats = {
    total: assignments.length,
    mastered: assignments.filter(a => a.progress_status === 'mastered').length,
    percent: Math.round((assignments.filter(a => a.progress_status === 'mastered').length / assignments.length) * 100)
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {weekInfo && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Week {weekInfo.week}, {weekInfo.year}</h3>
              <p className="text-sm text-gray-500">{assignments.length} works assigned</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{stats.percent}%</div>
              <p className="text-xs text-gray-500">{stats.mastered}/{stats.total} complete</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 mb-4 text-xs text-gray-500 overflow-x-auto">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">○</span>
          Not Started
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs">P</span>
          Presented
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-xs">Pr</span>
          Practicing
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold text-xs">M</span>
          Mastered
        </span>
      </div>

      <div className="space-y-2">
        {assignments.map(assignment => {
          const area = AREA_CONFIG[assignment.area] || { letter: '?', color: 'text-gray-600', bg: 'bg-gray-100' };
          const status = STATUS_CONFIG[assignment.progress_status];
          
          return (
            <div key={assignment.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center p-3 gap-3">
                <div className={`w-8 h-8 rounded-lg ${area.bg} flex items-center justify-center ${area.color} font-bold text-sm`}>
                  {area.letter}
                </div>

                <button
                  onClick={() => handleStatusTap(assignment)}
                  className={`w-10 h-10 rounded-full ${status.color} flex items-center justify-center font-bold text-sm transition-transform active:scale-90`}
                >
                  {status.label}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{assignment.work_name}</p>
                  {assignment.notes && (
                    <p className="text-xs text-gray-500 truncate">{assignment.notes}</p>
                  )}
                </div>

                {assignment.mediaCount && assignment.mediaCount > 0 && (
                  <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                    📷 {assignment.mediaCount}
                  </div>
                )}

                <button
                  onClick={() => handleCaptureTap(assignment)}
                  className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  📸
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// PROGRESS TAB
// ============================================
function ProgressTab({ childId, childName }: { childId: string; childName: string }) {
  const [areaProgress, setAreaProgress] = useState<AreaProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, [childId]);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/classroom/child/${childId}/progress`);
      const data = await res.json();
      
      const progressByArea = AREAS.map(area => {
        const areaWorks = (data.works || []).filter((w: any) => 
          w.area === area.id || w.area === area.name.toLowerCase().replace(' ', '_')
        );
        
        return {
          ...area,
          works: areaWorks,
          stats: {
            total: areaWorks.length,
            presented: areaWorks.filter((w: any) => w.status === 1).length,
            practicing: areaWorks.filter((w: any) => w.status === 2).length,
            mastered: areaWorks.filter((w: any) => w.status === 3).length,
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

  const toggleArea = (areaId: string) => {
    setExpandedArea(prev => prev === areaId ? null : areaId);
  };

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
          <span className="text-gray-500">{overallStats.total} total works</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              {overallStats.presented}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {overallStats.practicing}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {overallStats.mastered}
            </span>
          </div>
        </div>
      </div>

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
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && area.works.length > 0 && (
                <div className={`border-t ${area.bgColor} p-3`}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {area.works.map((work: any) => (
                      <div
                        key={work.id}
                        className={`p-2 rounded-lg bg-white shadow-sm border-l-4 ${
                          work.status === 3 ? 'border-green-500' :
                          work.status === 2 ? 'border-blue-500' :
                          work.status === 1 ? 'border-yellow-400' :
                          'border-gray-200'
                        }`}
                      >
                        <p className="text-xs font-medium text-gray-800 truncate">{work.name}</p>
                        <p className="text-[10px] text-gray-500">{STATUS_LABELS[work.status]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isExpanded && area.works.length === 0 && (
                <div className="border-t p-4 text-center text-gray-500 text-sm">
                  No works tracked in this area yet
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
// PORTFOLIO TAB
// ============================================
function PortfolioTab({ childId, childName }: { childId: string; childName: string }) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  useEffect(() => {
    fetchMedia();
  }, [childId]);

  const fetchMedia = async () => {
    try {
      const res = await fetch(`/api/classroom/child/${childId}/media`);
      const data = await res.json();
      setMedia(data.media || []);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl animate-pulse">📷</span>
        </div>
        <p className="text-gray-500">Loading portfolio...</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📷</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No media yet</h3>
        <p className="text-gray-500 text-sm">
          Capture photos and videos of {childName}'s work
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {media.map(item => (
          <button
            key={item.id}
            onClick={() => setSelectedMedia(item)}
            className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group"
          >
            {item.media_type === 'video' ? (
              <>
                <video src={item.media_url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="text-white text-2xl">▶</span>
                </div>
              </>
            ) : (
              <img src={item.media_url} alt={item.work_name} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setSelectedMedia(null)}
        >
          <button 
            onClick={() => setSelectedMedia(null)} 
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-xl z-10"
          >
            ✕
          </button>

          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {selectedMedia.media_type === 'video' ? (
              <video 
                src={selectedMedia.media_url} 
                controls 
                autoPlay
                className="max-w-full max-h-[70vh] rounded-xl"
              />
            ) : (
              <img 
                src={selectedMedia.media_url} 
                alt={selectedMedia.work_name} 
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
            )}
          </div>

          <div className="bg-black/50 p-4 text-white text-center" onClick={e => e.stopPropagation()}>
            <p className="font-semibold">{selectedMedia.work_name}</p>
            <p className="text-sm text-white/70">
              {new Date(selectedMedia.taken_at).toLocaleDateString('en-US', { 
                weekday: 'short', month: 'short', day: 'numeric'
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
