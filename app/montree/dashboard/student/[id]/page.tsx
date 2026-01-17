// /montree/dashboard/student/[id]/page.tsx
// Student detail page - shows ASSIGNED works with swipeable rows
// Blue theme, uses SwipeableWorkRow from admin classroom pattern
'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  photo_url?: string;
}

interface WorkAssignment {
  id: string;
  work_id?: string;
  work_name: string;
  work_name_chinese?: string;
  area: string;
  progress_status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  notes?: string;
}

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  area: string;
}

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-700', next: 'presented' as const },
  presented: { label: 'P', color: 'bg-amber-300 text-amber-900', next: 'practicing' as const },
  practicing: { label: 'Pr', color: 'bg-blue-300 text-blue-900', next: 'mastered' as const },
  mastered: { label: 'M', color: 'bg-green-400 text-white', next: 'not_started' as const },
};

const AREA_CONFIG: Record<string, { letter: string; color: string; name: string }> = {
  practical_life: { letter: 'P', color: 'bg-green-500 text-white', name: 'Practical Life' },
  sensorial: { letter: 'S', color: 'bg-orange-500 text-white', name: 'Sensorial' },
  math: { letter: 'M', color: 'bg-blue-500 text-white', name: 'Math' },
  mathematics: { letter: 'M', color: 'bg-blue-500 text-white', name: 'Math' },
  language: { letter: 'L', color: 'bg-pink-500 text-white', name: 'Language' },
  culture: { letter: 'C', color: 'bg-purple-500 text-white', name: 'Culture' },
  cultural: { letter: 'C', color: 'bg-purple-500 text-white', name: 'Culture' },
};

// Get current week number
function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

// ============ SWIPEABLE WORK ROW COMPONENT ============
function SwipeableWorkRow({
  assignment,
  onStatusChange,
  onWorkChange,
  onCapture,
}: {
  assignment: WorkAssignment;
  onStatusChange: (assignmentId: string, newStatus: string) => void;
  onWorkChange: (assignmentId: string, newWorkId: string, newWorkName: string, newWorkChinese?: string) => void;
  onCapture: (assignment: WorkAssignment) => void;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [notes, setNotes] = useState(assignment.notes || '');
  
  // Curriculum navigation
  const [curriculumWorks, setCurriculumWorks] = useState<CurriculumWork[]>([]);
  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  const hasFetchedCurriculum = useRef(false);
  
  // Touch tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);

  const SWIPE_THRESHOLD = 50;

  // Fetch curriculum works for this area
  const fetchCurriculumWorks = async () => {
    if (hasFetchedCurriculum.current) return;
    hasFetchedCurriculum.current = true;
    
    try {
      const res = await fetch(`/api/curriculum/works-by-area?area=${encodeURIComponent(assignment.area)}`);
      const data = await res.json();
      if (data.works) {
        setCurriculumWorks(data.works);
        const idx = data.works.findIndex((w: CurriculumWork) => 
          w.name === assignment.work_name || w.id === assignment.work_id
        );
        setCurrentWorkIndex(idx >= 0 ? idx : 0);
      }
    } catch (err) {
      console.error('Failed to fetch curriculum:', err);
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = false;
    setIsDragging(true);
    fetchCurriculumWorks();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isAnimating) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    if (!isHorizontalSwipe.current && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      if (Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        isHorizontalSwipe.current = true;
      } else {
        setIsDragging(false);
        return;
      }
    }

    if (isHorizontalSwipe.current) {
      e.preventDefault();
      const canGoNext = currentWorkIndex < curriculumWorks.length - 1;
      const canGoPrev = currentWorkIndex > 0;
      let resistance = 1;
      if ((diffX > 0 && !canGoPrev) || (diffX < 0 && !canGoNext)) {
        resistance = 0.2;
      }
      setTranslateX(diffX * resistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!isHorizontalSwipe.current) {
      setTranslateX(0);
      return;
    }

    const swipedLeft = translateX < -SWIPE_THRESHOLD;
    const swipedRight = translateX > SWIPE_THRESHOLD;

    if (swipedLeft && currentWorkIndex < curriculumWorks.length - 1) {
      setIsAnimating(true);
      setTranslateX(-300);
      const nextWork = curriculumWorks[currentWorkIndex + 1];
      setTimeout(() => {
        onWorkChange(assignment.id, nextWork.id, nextWork.name, nextWork.name_chinese);
        setCurrentWorkIndex(currentWorkIndex + 1);
        setTranslateX(0);
        setIsAnimating(false);
      }, 150);
    } else if (swipedRight && currentWorkIndex > 0) {
      setIsAnimating(true);
      setTranslateX(300);
      const prevWork = curriculumWorks[currentWorkIndex - 1];
      setTimeout(() => {
        onWorkChange(assignment.id, prevWork.id, prevWork.name, prevWork.name_chinese);
        setCurrentWorkIndex(currentWorkIndex - 1);
        setTranslateX(0);
        setIsAnimating(false);
      }, 150);
    } else {
      setTranslateX(0);
    }
    isHorizontalSwipe.current = false;
  };

  const handleStatusTap = () => {
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    onStatusChange(assignment.id, nextStatus);
  };

  const areaConfig = AREA_CONFIG[assignment.area] || { letter: '?', color: 'bg-gray-500 text-white', name: 'Unknown' };
  const statusConfig = STATUS_CONFIG[assignment.progress_status];
  const showPosition = curriculumWorks.length > 0 && currentWorkIndex >= 0;

  return (
    <div className="bg-white">
      {/* Main swipeable row */}
      <div className="overflow-hidden">
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex items-center gap-2 px-3 py-2.5"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? 'none' : 'transform 150ms ease-out',
            touchAction: 'pan-y',
          }}
        >
          {/* Area Badge */}
          <span className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center shrink-0 ${areaConfig.color}`}>
            {areaConfig.letter}
          </span>

          {/* Status Button */}
          <button
            onClick={handleStatusTap}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${statusConfig.color} active:scale-90 transition-transform`}
          >
            {statusConfig.label}
          </button>

          {/* Work Name - tap to toggle panel */}
          <div
            className="flex-1 min-w-0 cursor-pointer active:bg-gray-50 rounded px-1 -mx-1"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
          >
            <p className="text-sm font-medium truncate">{assignment.work_name}</p>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              {showPosition && <span>{currentWorkIndex + 1}/{curriculumWorks.length}</span>}
              <span className="text-gray-300">← swipe →</span>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="w-8 h-8 flex items-center justify-center text-gray-400 active:bg-gray-100 rounded-full"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isPanelOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Action Panel */}
      <div className={`transition-all duration-200 ease-out ${isPanelOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="bg-gray-50 border-t border-gray-100 px-3 py-3 space-y-3">
          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500">📝 Notes</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add observation notes..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { onCapture(assignment); setIsPanelOpen(false); }}
              className="flex-1 py-2.5 bg-green-100 text-green-700 rounded-lg active:scale-95 transition-transform text-sm font-medium"
            >
              📷 Capture
            </button>
            <button
              className="flex-1 py-2.5 bg-red-100 text-red-700 rounded-lg active:scale-95 transition-transform text-sm font-medium"
            >
              ▶️ Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN PAGE COMPONENT ============
export default function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCapture, setShowCapture] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<WorkAssignment | null>(null);

  const week = getCurrentWeek();
  const year = new Date().getFullYear();

  // Load student data and assignments
  useEffect(() => {
    Promise.all([
      fetch(`/api/montree/students/${id}`).then(r => r.json()),
      fetch(`/api/weekly-planning/child-detail?childId=${id}&week=${week}&year=${year}`).then(r => r.json())
    ]).then(([studentData, assignmentData]) => {
      setStudent(studentData.student);
      setAssignments(assignmentData.child?.assignments || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, week, year]);

  // Handle status change
  const handleStatusChange = async (assignmentId: string, newStatus: string) => {
    setAssignments(prev => prev.map(a =>
      a.id === assignmentId ? { ...a, progress_status: newStatus as any } : a
    ));

    try {
      await fetch('/api/weekly-planning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Handle work change (from swipe)
  const handleWorkChange = async (assignmentId: string, newWorkId: string, newWorkName: string, newWorkChinese?: string) => {
    setAssignments(prev => prev.map(a =>
      a.id === assignmentId ? { ...a, work_id: newWorkId, work_name: newWorkName, work_name_chinese: newWorkChinese } : a
    ));

    try {
      await fetch(`/api/weekly-planning/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: newWorkId,
          work_name: newWorkName,
          work_name_chinese: newWorkChinese,
        }),
      });
    } catch (err) {
      console.error('Failed to update work:', err);
    }
  };

  // Handle capture
  const handleCapture = (assignment: WorkAssignment) => {
    setActiveAssignment(assignment);
    setShowCapture(true);
  };

  // Calculate stats
  const stats = {
    total: assignments.length,
    mastered: assignments.filter(a => a.progress_status === 'mastered').length,
    practicing: assignments.filter(a => a.progress_status === 'practicing').length,
    presented: assignments.filter(a => a.progress_status === 'presented').length,
  };
  const progressPercent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-gray-600 mb-4">Student not found</p>
          <Link href="/montree/dashboard" className="text-blue-600">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/montree/dashboard" className="text-gray-500 hover:text-gray-700 text-xl">
            ←
          </Link>
          <span className="text-2xl">🐋</span>
          <span className="text-gray-400">|</span>
          <h1 className="text-lg font-bold text-gray-800 flex-1">{student.name}</h1>
        </div>
      </header>

      {/* Blue Progress Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 mx-4 mt-4 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {student.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{student.name}</h2>
            <p className="text-blue-100 text-sm">Week {week}, {year}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-3 bg-blue-400/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white/20 rounded-lg py-2">
            <div className="text-lg font-bold">{stats.total - stats.mastered - stats.practicing - stats.presented}</div>
            <div className="text-[10px] text-blue-100">To Do</div>
          </div>
          <div className="bg-white/20 rounded-lg py-2">
            <div className="text-lg font-bold">{stats.presented}</div>
            <div className="text-[10px] text-blue-100">Presented</div>
          </div>
          <div className="bg-white/20 rounded-lg py-2">
            <div className="text-lg font-bold">{stats.practicing}</div>
            <div className="text-[10px] text-blue-100">Practicing</div>
          </div>
          <div className="bg-white/20 rounded-lg py-2">
            <div className="text-lg font-bold">{stats.mastered}</div>
            <div className="text-[10px] text-blue-100">Mastered</div>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="px-4 py-3 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-5 h-5 rounded-full bg-amber-300 flex items-center justify-center text-amber-900 font-bold text-[10px]">P</span>
          Presented
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-5 rounded-full bg-blue-300 flex items-center justify-center text-blue-900 font-bold text-[10px]">Pr</span>
          Practicing
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center text-white font-bold text-[10px]">M</span>
          Mastered
        </span>
      </div>

      {/* Works List */}
      <main className="px-4 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">This Week's Works</h3>
          <span className="text-sm text-gray-400">{assignments.length} works</span>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-600 mb-2">No works assigned yet</p>
            <p className="text-sm text-gray-400">Works will appear here when assigned</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl divide-y overflow-hidden shadow">
            {assignments.map(assignment => (
              <SwipeableWorkRow
                key={assignment.id}
                assignment={assignment}
                onStatusChange={handleStatusChange}
                onWorkChange={handleWorkChange}
                onCapture={handleCapture}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex gap-3">
        <button
          onClick={() => setShowCapture(true)}
          className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 active:scale-98 transition-all rounded-xl text-white font-bold flex items-center justify-center gap-2"
        >
          📷 Quick Capture
        </button>
        <Link
          href={`/montree/dashboard/student/${id}/add-work`}
          className="px-5 py-3 bg-gray-100 hover:bg-gray-200 active:scale-98 transition-all rounded-xl text-gray-700 font-medium flex items-center gap-2"
        >
          + Add Work
        </Link>
      </div>

      {/* Capture Modal */}
      {showCapture && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="text-center mb-6">
            <h3 className="text-white text-xl font-bold mb-2">📷 Capture Progress</h3>
            <p className="text-gray-400">
              {activeAssignment
                ? `Documenting: ${activeAssignment.work_name}`
                : `Take a photo or video of ${student.name}'s work`
              }
            </p>
          </div>

          <div className="w-full max-w-md aspect-[4/3] bg-gray-800 rounded-xl mb-6 flex items-center justify-center">
            <span className="text-gray-500">Camera preview</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => { setShowCapture(false); setActiveAssignment(null); }}
              className="px-6 py-3 bg-gray-700 text-white rounded-xl"
            >
              Cancel
            </button>
            <button className="w-20 h-20 bg-white rounded-full border-4 border-gray-400 active:scale-90 transition-transform" />
          </div>
        </div>
      )}
    </div>
  );
}
