// /montree/dashboard/student/[id]/page.tsx
// PORTED FROM WORKING: /admin/classroom/student/[id]/page.tsx
// Uses the same APIs as admin classroom for unified data
'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import WorkNavigator from '@/components/montree/WorkNavigator';
import AIInsightsTab from '@/components/montree/AIInsightsTab';

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
  { id: 'ai', label: 'AI Insights', icon: '🧠' },
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
  cultural: { letter: 'C', color: 'text-orange-700', bg: 'bg-orange-100' },
};

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-50' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'from-purple-500 to-violet-500', bgColor: 'bg-purple-50' },
  { id: 'mathematics', name: 'Mathematics', icon: '🔢', color: 'from-blue-500 to-indigo-500', bgColor: 'bg-blue-50' },
  { id: 'language', name: 'Language', icon: '📖', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'from-orange-500 to-amber-500', bgColor: 'bg-orange-50' },
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

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);
  
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
      // Use the WORKING admin classroom API
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-bounce">🌳</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Student not found</h2>
          <Link href="/montree/dashboard" className="text-emerald-600 hover:underline">
            ← Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className={`bg-gradient-to-r ${getGradient()} text-white sticky top-0 z-50`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/montree/dashboard"
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
                    ? 'bg-emerald-100 text-emerald-700'
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
        {activeTab === 'ai' && (
          <AIInsightsTab 
            childId={studentId} 
            childName={student.name}
          />
        )}
      </main>
    </div>
  );
}

// ============================================
// THIS WEEK TAB - Swipe through ALL weekly works
// ============================================
function ThisWeekTab({ childId, childName, onMediaUploaded }: { 
  childId: string; 
  childName: string;
  onMediaUploaded?: () => void;
}) {
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekInfo, setWeekInfo] = useState<{ week: number; year: number } | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [classroomId, setClassroomId] = useState<string | null>(null);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    fetchAssignments();
  }, [childId]);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`/api/classroom/child/${childId}/week`);
      const data = await res.json();
      setAssignments(data.assignments || []);
      setWeekInfo(data.weekInfo);
      if (data.classroomId) {
        setClassroomId(data.classroomId);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedNotes = () => {
    if (expandedIndex === null) return false;
    const currentNotes = assignments[expandedIndex]?.notes || '';
    return editingNotes !== currentNotes;
  };

  // TAP to expand/collapse a work
  const handleRowClick = (index: number) => {
    if (expandedIndex === index) {
      if (hasUnsavedNotes() && !confirm('You have unsaved notes. Discard changes?')) return;
      setExpandedIndex(null);
      setEditingNotes('');
    } else {
      if (hasUnsavedNotes() && !confirm('You have unsaved notes. Discard changes?')) return;
      setExpandedIndex(index);
      setEditingNotes(assignments[index]?.notes || '');
    }
  };

  // Navigate to prev/next work
  const navigateWork = (direction: 'prev' | 'next') => {
    if (expandedIndex === null) return;
    if (hasUnsavedNotes() && !confirm('You have unsaved notes. Discard changes?')) return;
    
    const newIndex = direction === 'next' 
      ? Math.min(expandedIndex + 1, assignments.length - 1)
      : Math.max(expandedIndex - 1, 0);
    
    if (newIndex !== expandedIndex) {
      setExpandedIndex(newIndex);
      setEditingNotes(assignments[newIndex]?.notes || '');
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    setSwipeOffset(Math.max(-100, Math.min(100, diff * 0.5)));
  };

  const handleTouchEnd = () => {
    const threshold = 60;
    if (swipeOffset > threshold) {
      navigateWork('prev');
    } else if (swipeOffset < -threshold) {
      navigateWork('next');
    }
    setSwipeOffset(0);
  };

  const handleStatusTap = async (e: React.MouseEvent, assignment: WorkAssignment, index: number) => {
    e.stopPropagation();
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    
    setAssignments(prev => prev.map((a, i) => 
      i === index ? { ...a, progress_status: nextStatus as any } : a
    ));

    try {
      // Update progress status
      await fetch('/api/weekly-planning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id, status: nextStatus }),
      });
      
      // Log session for history tracking
      await fetch('/api/montree/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_id: assignment.work_id,
          assignment_id: assignment.id,
          session_type: nextStatus === 'presented' ? 'presentation' : 'practice',
        }),
      });
      
      toast.success(`${assignment.work_name} → ${nextStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Failed to update:', error);
      fetchAssignments();
    }
  };

  const handleSaveNotes = async () => {
    if (expandedIndex === null) return;
    const assignment = assignments[expandedIndex];
    
    setSavingNotes(true);
    try {
      await fetch('/api/weekly-planning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id, notes: editingNotes }),
      });
      setAssignments(prev => prev.map((a, i) => 
        i === expandedIndex ? { ...a, notes: editingNotes } : a
      ));
      toast.success('Notes saved!');
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || expandedIndex === null) return;
    const assignment = assignments[expandedIndex];

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error(`File too large! Max ${isVideo ? '50MB' : '10MB'}`);
      fileInputRef.current!.value = '';
      return;
    }

    toast.info(`📤 Saving to ${childName}...`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('childId', childId);
    formData.append('assignmentId', assignment.id);
    formData.append('workId', assignment.work_id || '');
    formData.append('workName', assignment.work_name);
    if (weekInfo) {
      formData.append('weekNumber', weekInfo.week.toString());
      formData.append('year', weekInfo.year.toString());
    }

    fileInputRef.current!.value = '';

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`✅ Saved!`);
        setAssignments(prev => prev.map((a, i) => 
          i === expandedIndex 
            ? { ...a, mediaCount: (a.mediaCount || 0) + 1 } 
            : a
        ));
        
        // Log session with media
        await fetch('/api/montree/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: childId,
            work_id: assignment.work_id,
            assignment_id: assignment.id,
            session_type: 'practice',
            media_urls: [data.url || data.media_url],
          }),
        });
        
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
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
              <div className="text-2xl font-bold text-emerald-600">{stats.percent}%</div>
              <p className="text-xs text-gray-500">{stats.mastered}/{stats.total} complete</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Work Navigator - Browse ALL 316 works and update progress */}
      <WorkNavigator
        classroomId={classroomId}
        childId={childId}
        childName={childName}
        onProgressUpdated={fetchAssignments}
      />

      {/* Legend - only show when collapsed */}
      {expandedIndex === null && (
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
      )}

      <div className="space-y-2">
        {assignments.map((assignment, index) => {
          const area = AREA_CONFIG[assignment.area] || { letter: '?', color: 'text-gray-600', bg: 'bg-gray-100' };
          const status = STATUS_CONFIG[assignment.progress_status];
          const isExpanded = expandedIndex === index;
          
          return (
            <div 
              key={assignment.id} 
              className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-emerald-500' : ''}`}
            >
              {/* Main Row - clickable */}
              <div 
                className="flex items-center p-3 gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleRowClick(index)}
              >
                <div className={`w-8 h-8 rounded-lg ${area.bg} flex items-center justify-center ${area.color} font-bold text-sm`}>
                  {area.letter}
                </div>

                <button
                  onClick={(e) => handleStatusTap(e, assignment, index)}
                  className={`w-10 h-10 rounded-full ${status.color} flex items-center justify-center font-bold text-sm transition-transform active:scale-90`}
                >
                  {status.label}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{assignment.work_name}</p>
                  {!isExpanded && assignment.notes && (
                    <p className="text-xs text-gray-500 truncate">📝 {assignment.notes}</p>
                  )}
                </div>

                {assignment.mediaCount && assignment.mediaCount > 0 && (
                  <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                    📷 {assignment.mediaCount}
                  </div>
                )}

                <svg 
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded Detail Panel - Swipeable */}
              {isExpanded && (
                <div 
                  className="border-t bg-gradient-to-r from-emerald-50 to-teal-50 p-4 transition-transform duration-150"
                  style={{ transform: `translateX(${swipeOffset}px)` }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Navigation Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigateWork('prev'); }}
                      disabled={index === 0}
                      className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center text-lg font-bold text-emerald-600 disabled:opacity-30 disabled:text-gray-400 hover:bg-emerald-50 active:scale-95 transition-all"
                    >
                      ←
                    </button>
                    
                    <div className="flex-1 text-center px-2">
                      <p className="text-sm font-bold text-emerald-700">
                        {index + 1} of {assignments.length}
                      </p>
                      <p className="text-xs text-gray-500">Swipe or tap arrows</p>
                    </div>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); navigateWork('next'); }}
                      disabled={index === assignments.length - 1}
                      className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center text-lg font-bold text-emerald-600 disabled:opacity-30 disabled:text-gray-400 hover:bg-emerald-50 active:scale-95 transition-all"
                    >
                      →
                    </button>
                  </div>

                  {/* Notes Section */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📝 Notes
                    </label>
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Add observation notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      rows={3}
                    />
                    {editingNotes !== (assignment.notes || '') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveNotes(); }}
                        disabled={savingNotes}
                        className="mt-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {savingNotes ? 'Saving...' : '💾 Save Notes'}
                      </button>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex gap-3 mb-3">
                    {/* Demo Button */}
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        const searchQuery = encodeURIComponent(`${assignment.work_name} Montessori presentation`);
                        window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
                      }}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <span className="text-xl">▶️</span>
                      <span>Demo</span>
                    </button>

                    {/* Capture Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCapture(); }}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <span className="text-xl">📸</span>
                      <span>Capture</span>
                    </button>
                  </div>
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
// PROGRESS TAB - Uses WORKING admin API + SYNC
// ============================================
function ProgressTab({ childId, childName }: { childId: string; childName: string }) {
  const [areaProgress, setAreaProgress] = useState<AreaProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
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

  const handleWorkClick = async (work: any) => {
    // Toggle mastered: if mastered → not started, else → mastered
    const newStatus = work.status === 3 ? 0 : 3;
    try {
      await fetch(`/api/classroom/child/${childId}/progress/${work.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchProgress();
    } catch (error) {
      console.error('Update error:', error);
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

  // Count works with ANY progress (not just mastered)
  const worksInProgress = overallStats.presented + overallStats.practicing + overallStats.mastered;
  const progressPercent = overallStats.total > 0 
    ? Math.round((worksInProgress / overallStats.total) * 100) 
    : 0;

  return (
    <div>
      {/* Quick Actions Row */}
      <div className="flex gap-3 mb-4">
        {/* SYNC BUTTON */}
        <div className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
                🔄
              </div>
              <div>
                <h3 className="font-bold">Sync from This Week</h3>
                <p className="text-sm text-white/80 hidden sm:block">Link & backfill works</p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 disabled:opacity-50 shadow text-sm"
            >
              {syncing ? '⏳' : '🚀 Sync'}
            </button>
          </div>
          {syncResult && (
            <p className="mt-3 text-sm text-white/90 bg-white/10 rounded-lg px-3 py-2">
              {syncResult}
            </p>
          )}
        </div>

        {/* EDIT CURRICULUM BUTTON */}
        <Link
          href="/admin/curriculum-editor"
          className="bg-white rounded-2xl p-4 shadow-sm border-2 border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-2 min-w-[100px]"
        >
          <span className="text-2xl">📚</span>
          <span className="text-xs font-medium text-gray-600">Edit Curriculum</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Overall Progress</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{worksInProgress}/{overallStats.total}</div>
            <p className="text-xs text-gray-500">works started</p>
          </div>
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

      {/* Tip */}
      <p className="text-xs text-gray-400 text-center mb-3">💡 Tap works to toggle mastered</p>

      <div className="space-y-3">
        {areaProgress.map(area => {
          const isExpanded = expandedArea === area.id;
          const areaWorksStarted = area.stats.presented + area.stats.practicing + area.stats.mastered;

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
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    areaWorksStarted > 0 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {areaWorksStarted}/{area.stats.total}
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
                      <button
                        key={work.id}
                        onClick={() => handleWorkClick(work)}
                        className={`p-2.5 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                          work.status === 3 
                            ? 'bg-green-500 text-white shadow-md' 
                            : work.status === 2 
                              ? 'bg-blue-100 border-2 border-blue-300' 
                              : work.status === 1 
                                ? 'bg-yellow-50 border border-yellow-300' 
                                : 'bg-white border border-gray-200'
                        }`}
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
// PORTFOLIO TAB - Uses WORKING admin API
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
      // Use the WORKING admin classroom API
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
