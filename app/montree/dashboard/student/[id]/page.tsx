// /montree/dashboard/student/[id]/page.tsx
// PORTED FROM WORKING: /admin/classroom/student/[id]/page.tsx
// Uses the same APIs as admin classroom for unified data
'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import AIInsightsTab from '@/components/montree/AIInsightsTab';

// Interface for ALL curriculum works (from search API)
interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  category_name?: string;
  sequence: number;
  area?: {
    area_key: string;
    name: string;
    color?: string;
    icon?: string;
  };
  status?: 'not_started' | 'presented' | 'practicing' | 'mastered';
}

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
// THIS WEEK TAB - Now with VERTICAL swipe through ALL works!
// Session 73: Merged WorkNavigator into this component
// ============================================
function ThisWeekTab({ childId, childName, onMediaUploaded }: { 
  childId: string; 
  childName: string;
  onMediaUploaded?: () => void;
}) {
  // Weekly assignments (original)
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekInfo, setWeekInfo] = useState<{ week: number; year: number } | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [classroomId, setClassroomId] = useState<string | null>(null);

  // NEW: Scroll wheel for browsing works in same area
  const [wheelOpen, setWheelOpen] = useState(false);
  const [allWorks, setAllWorks] = useState<CurriculumWork[]>([]);
  const [currentWorkIndex, setCurrentWorkIndex] = useState(0);
  const [selectedArea, setSelectedArea] = useState('all');
  const [loadingAllWorks, setLoadingAllWorks] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);

  // iOS-style wheel physics state
  const wheelPhysics = useRef({
    offset: 0,           // Current scroll offset in pixels
    velocity: 0,         // Current velocity px/s
    amplitude: 0,        // Momentum launch amplitude
    target: 0,           // Target snap position
    timestamp: 0,        // For velocity tracking
    frame: 0,            // Last frame offset
    reference: 0,        // Touch start Y position
    animationId: null as number | null,
    ticker: null as NodeJS.Timeout | null,
  });
  const [wheelDisplayOffset, setWheelDisplayOffset] = useState(0);

  const [swipeOffset, setSwipeOffset] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // iOS physics constants
  const ITEM_HEIGHT = 44;        // iOS standard row height
  const TIME_CONSTANT = 325;     // iOS momentum decay constant
  const VELOCITY_THRESHOLD = 10; // Min velocity to trigger momentum
  const VISIBLE_ITEMS = 5;       // Items visible in wheel

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

  // NEW: Fetch ALL curriculum works for browse mode
  const fetchAllWorks = useCallback(async () => {
    setLoadingAllWorks(true);
    try {
      const params = new URLSearchParams();
      params.set('child_id', childId);
      params.set('limit', '400');
      if (classroomId) params.set('classroom_id', classroomId);
      if (selectedArea !== 'all') params.set('area', selectedArea);

      const res = await fetch(`/api/montree/works/search?${params.toString()}`);
      const data = await res.json();

      if (data.works?.length > 0) {
        setAllWorks(data.works);
      } else {
        setAllWorks([]);
      }
    } catch (err) {
      console.error('Failed to fetch all works:', err);
      setAllWorks([]);
    } finally {
      setLoadingAllWorks(false);
    }
  }, [childId, classroomId, selectedArea]);

  // Fetch all works when wheel opens
  useEffect(() => {
    if (wheelOpen) {
      fetchAllWorks();
    } else {
      // Cleanup physics when wheel closes
      if (wheelPhysics.current.animationId) {
        cancelAnimationFrame(wheelPhysics.current.animationId);
        wheelPhysics.current.animationId = null;
      }
      if (wheelPhysics.current.ticker) {
        clearInterval(wheelPhysics.current.ticker);
        wheelPhysics.current.ticker = null;
      }
    }
  }, [wheelOpen, selectedArea, fetchAllWorks]);

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

  // Navigate to prev/next work (for weekly list)
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

  // VERTICAL Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.touches[0].clientY; // Positive = swipe up
    setSwipeOffset(Math.max(-80, Math.min(80, diff * 0.4)));
  };

  const handleTouchEnd = () => {
    const threshold = 40;
    if (expandedIndex !== null && !wheelOpen) {
      // Weekly mode swipe navigation
      if (swipeOffset > threshold) navigateWork('next');
      if (swipeOffset < -threshold) navigateWork('prev');
    }
    setSwipeOffset(0);
  };

  // WHEEL touch handlers - iOS-style physics
  const wheelScroll = useCallback((newOffset: number) => {
    // Clamp to bounds with rubber band effect at edges
    const maxOffset = (allWorks.length - 1) * ITEM_HEIGHT;
    const clampedOffset = Math.max(-ITEM_HEIGHT * 0.3, Math.min(maxOffset + ITEM_HEIGHT * 0.3, newOffset));
    
    wheelPhysics.current.offset = clampedOffset;
    setWheelDisplayOffset(clampedOffset);
    
    // Update current index based on offset
    const newIndex = Math.round(clampedOffset / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(allWorks.length - 1, newIndex));
    if (clampedIndex !== currentWorkIndex) {
      setCurrentWorkIndex(clampedIndex);
      // Haptic feedback on item change
      if (navigator.vibrate) navigator.vibrate(1);
    }
  }, [allWorks.length, currentWorkIndex, ITEM_HEIGHT]);

  // Track velocity every 100ms (iOS style)
  const trackVelocity = useCallback(() => {
    const now = Date.now();
    const elapsed = now - wheelPhysics.current.timestamp;
    const delta = wheelPhysics.current.offset - wheelPhysics.current.frame;
    
    wheelPhysics.current.timestamp = now;
    wheelPhysics.current.frame = wheelPhysics.current.offset;
    
    // Moving average: 80% new, 20% old
    const instantVelocity = (1000 * delta) / (1 + elapsed);
    wheelPhysics.current.velocity = 0.8 * instantVelocity + 0.2 * wheelPhysics.current.velocity;
  }, []);

  // Momentum animation with exponential decay
  const autoScroll = useCallback(() => {
    const { amplitude, target, timestamp } = wheelPhysics.current;
    const elapsed = Date.now() - timestamp;
    const delta = -amplitude * Math.exp(-elapsed / TIME_CONSTANT);
    
    if (Math.abs(delta) > 0.5) {
      wheelScroll(target + delta);
      wheelPhysics.current.animationId = requestAnimationFrame(autoScroll);
    } else {
      // Snap to final position
      wheelScroll(target);
      wheelPhysics.current.animationId = null;
    }
  }, [wheelScroll, TIME_CONSTANT]);

  const handleWheelTouchStart = useCallback((e: React.TouchEvent) => {
    // Cancel any running animation
    if (wheelPhysics.current.animationId) {
      cancelAnimationFrame(wheelPhysics.current.animationId);
      wheelPhysics.current.animationId = null;
    }
    if (wheelPhysics.current.ticker) {
      clearInterval(wheelPhysics.current.ticker);
    }
    
    wheelPhysics.current.reference = e.touches[0].clientY;
    wheelPhysics.current.velocity = 0;
    wheelPhysics.current.frame = wheelPhysics.current.offset;
    wheelPhysics.current.timestamp = Date.now();
    
    // Start velocity tracking at 100ms intervals
    wheelPhysics.current.ticker = setInterval(trackVelocity, 100);
  }, [trackVelocity]);

  const handleWheelTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent page scroll
    const y = e.touches[0].clientY;
    const delta = wheelPhysics.current.reference - y;
    wheelPhysics.current.reference = y;
    wheelScroll(wheelPhysics.current.offset + delta);
  }, [wheelScroll]);

  const handleWheelTouchEnd = useCallback(() => {
    // Stop velocity tracking
    if (wheelPhysics.current.ticker) {
      clearInterval(wheelPhysics.current.ticker);
      wheelPhysics.current.ticker = null;
    }
    
    const maxOffset = (allWorks.length - 1) * ITEM_HEIGHT;
    
    if (Math.abs(wheelPhysics.current.velocity) > VELOCITY_THRESHOLD) {
      // Launch momentum
      wheelPhysics.current.amplitude = 0.8 * wheelPhysics.current.velocity;
      wheelPhysics.current.target = wheelPhysics.current.offset + wheelPhysics.current.amplitude;
      
      // Snap target to item grid
      wheelPhysics.current.target = Math.round(wheelPhysics.current.target / ITEM_HEIGHT) * ITEM_HEIGHT;
      
      // Clamp to bounds
      wheelPhysics.current.target = Math.max(0, Math.min(maxOffset, wheelPhysics.current.target));
      
      wheelPhysics.current.timestamp = Date.now();
      wheelPhysics.current.animationId = requestAnimationFrame(autoScroll);
    } else {
      // No momentum - just snap to nearest
      const nearestIndex = Math.round(wheelPhysics.current.offset / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(allWorks.length - 1, nearestIndex));
      const snapOffset = clampedIndex * ITEM_HEIGHT;
      wheelScroll(snapOffset);
    }
  }, [allWorks.length, autoScroll, wheelScroll, ITEM_HEIGHT, VELOCITY_THRESHOLD]);

  // LONG PRESS handlers - to open wheel from expanded card
  const handleLongPressStart = (area: string) => {
    setLongPressTriggered(false);
    longPressTimer.current = setTimeout(() => {
      setLongPressTriggered(true);
      // Vibration feedback if available
      if (navigator.vibrate) navigator.vibrate(50);
      // Set area filter based on expanded work's area
      setSelectedArea(area);
      setCurrentWorkIndex(0);
      // Reset physics state
      wheelPhysics.current.offset = 0;
      wheelPhysics.current.velocity = 0;
      setWheelDisplayOffset(0);
      setWheelOpen(true);
    }, 500); // 500ms long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Cycle status for wheel-selected work
  const cycleWheelWorkStatus = async () => {
    if (allWorks.length === 0 || updatingStatus) return;
    
    const currentWork = allWorks[currentWorkIndex];
    const current = currentWork.status || 'not_started';
    const nextMap: Record<string, string> = {
      'not_started': 'presented',
      'presented': 'practicing',
      'practicing': 'mastered',
      'mastered': 'not_started'
    };
    const next = nextMap[current];

    setUpdatingStatus(true);

    try {
      const apiStatus = next === 'mastered' ? 'completed'
                      : next === 'not_started' ? 'not_started'
                      : 'in_progress';

      const res = await fetch(`/api/montree/progress/${childId}/${currentWork.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: next === 'not_started' ? 'reset' : 'update',
          status: apiStatus,
          currentLevel: next === 'mastered' ? 3 : next === 'practicing' ? 2 : next === 'presented' ? 1 : 0,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      setAllWorks(prev => prev.map((w, i) => 
        i === currentWorkIndex ? { ...w, status: next as any } : w
      ));
      toast.success(`→ ${next.replace('_', ' ')}`);
      fetchAssignments();
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // When user selects a work from wheel, update the expanded card
  const setSelectedWorkFromWheel = (work: CurriculumWork) => {
    // Find if this work is in assignments, if so expand it
    const assignmentIndex = assignments.findIndex(a => a.work_id === work.id || a.work_name === work.name);
    if (assignmentIndex >= 0) {
      setExpandedIndex(assignmentIndex);
      setEditingNotes(assignments[assignmentIndex]?.notes || '');
    }
    toast.success(`Selected: ${work.name}`);
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

      {/* Legend - only show when collapsed */}
      {expandedIndex === null && !wheelOpen && (
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

      {/* SCROLL WHEEL OVERLAY - iOS-style picker */}
      {wheelOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setWheelOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 text-center">
              <p className="text-sm opacity-80">Browsing {AREA_CONFIG[selectedArea]?.letter || 'All'} Area Works</p>
              <p className="font-bold text-lg">{currentWorkIndex + 1} of {allWorks.length}</p>
            </div>

            {/* Wheel Container - iOS style with 3D perspective */}
            {loadingAllWorks ? (
              <div className="py-16 text-center">
                <span className="animate-bounce text-3xl block mb-2">🎡</span>
                <p className="text-gray-500">Loading works...</p>
              </div>
            ) : (
              <div 
                className="relative overflow-hidden touch-none select-none"
                style={{ 
                  height: ITEM_HEIGHT * VISIBLE_ITEMS,
                  perspective: '1000px',
                  perspectiveOrigin: 'center center',
                }}
                onTouchStart={handleWheelTouchStart}
                onTouchMove={handleWheelTouchMove}
                onTouchEnd={handleWheelTouchEnd}
              >
                {/* Gradient overlays for fade effect */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white via-white/80 to-transparent z-20 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent z-20 pointer-events-none" />
                
                {/* Center selection indicator - glass effect */}
                <div 
                  className="absolute inset-x-3 z-10 pointer-events-none rounded-xl"
                  style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: ITEM_HEIGHT,
                    background: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.15), rgba(20, 184, 166, 0.15))',
                    border: '2px solid rgba(16, 185, 129, 0.4)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                />

                {/* 3D Wheel with items */}
                <div 
                  className="absolute inset-0"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {allWorks.map((work, idx) => {
                    // Calculate position relative to current selection
                    const itemOffset = idx * ITEM_HEIGHT - wheelDisplayOffset;
                    const centerY = (ITEM_HEIGHT * VISIBLE_ITEMS) / 2 - ITEM_HEIGHT / 2;
                    const y = centerY + itemOffset;
                    
                    // Skip items too far from view
                    if (Math.abs(itemOffset) > ITEM_HEIGHT * 3) return null;
                    
                    // Calculate 3D rotation for barrel effect
                    const rotation = (itemOffset / ITEM_HEIGHT) * 18; // 18 degrees per item
                    const radius = 120; // Barrel radius
                    const translateZ = Math.cos(rotation * Math.PI / 180) * 10 - 10;
                    
                    // Opacity and scale based on distance from center
                    const normalizedDistance = Math.abs(itemOffset) / (ITEM_HEIGHT * 2.5);
                    const opacity = Math.max(0.2, 1 - normalizedDistance * 0.8);
                    const scale = Math.max(0.8, 1 - normalizedDistance * 0.15);
                    
                    const isSelected = idx === currentWorkIndex;
                    
                    return (
                      <div
                        key={work.id}
                        className="absolute left-0 right-0 flex items-center px-4"
                        style={{ 
                          height: ITEM_HEIGHT,
                          top: y,
                          opacity,
                          transform: `
                            scale(${scale})
                            rotateX(${-rotation}deg)
                            translateZ(${translateZ}px)
                          `,
                          transformOrigin: 'center center',
                          transition: 'none', // No CSS transition - handled by JS physics
                          willChange: 'transform, opacity',
                        }}
                        onClick={() => {
                          // Animate to clicked item
                          const targetOffset = idx * ITEM_HEIGHT;
                          wheelPhysics.current.target = targetOffset;
                          wheelPhysics.current.amplitude = targetOffset - wheelPhysics.current.offset;
                          wheelPhysics.current.timestamp = Date.now();
                          if (wheelPhysics.current.animationId) {
                            cancelAnimationFrame(wheelPhysics.current.animationId);
                          }
                          wheelPhysics.current.animationId = requestAnimationFrame(autoScroll);
                        }}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${
                            STATUS_CONFIG[work.status || 'not_started'].color
                          }`}>
                            {STATUS_CONFIG[work.status || 'not_started'].label}
                          </span>
                          <span className={`truncate transition-all ${
                            isSelected 
                              ? 'font-semibold text-gray-900 text-base' 
                              : 'font-medium text-gray-500 text-sm'
                          }`}>
                            {work.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Single Select Button - Clean and Simple */}
            <div className="p-4 bg-gray-50 border-t">
              <button
                onClick={() => {
                  const work = allWorks[currentWorkIndex];
                  if (work) {
                    setSelectedWorkFromWheel(work);
                  }
                  setWheelOpen(false);
                }}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-transform text-lg"
              >
                ✓ Select This Work
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">v75 • iOS-style wheel</p>
            </div>
          </div>
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
              {/* Main Row - TAP to expand, HOLD to open wheel */}
              <div 
                className="flex items-center p-3 gap-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                onTouchStart={() => handleLongPressStart(assignment.area)}
                onTouchEnd={() => {
                  handleLongPressEnd();
                  // Only trigger click if long press didn't fire
                  if (!longPressTriggered) {
                    handleRowClick(index);
                  }
                }}
                onTouchCancel={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(assignment.area)}
                onMouseUp={() => {
                  handleLongPressEnd();
                  if (!longPressTriggered) {
                    handleRowClick(index);
                  }
                }}
                onMouseLeave={handleLongPressEnd}
              >
                <div className={`w-8 h-8 rounded-lg ${area.bg} flex items-center justify-center ${area.color} font-bold text-sm`}>
                  {area.letter}
                </div>

                <button
                  onClick={(e) => handleStatusTap(e, assignment, index)}
                  onTouchStart={(e) => e.stopPropagation()}
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

              {/* Expanded Detail Panel */}
              {isExpanded && (
                <div className="border-t bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                  {/* Notes Section */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📝 Notes
                    </label>
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      placeholder="Add observation notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none bg-white text-gray-900"
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

                  {/* Hint for scroll wheel */}
                  <p className="text-xs text-center text-gray-400 mb-3">
                    💡 Hold the row above to browse all {AREA_CONFIG[assignment.area]?.letter || ''} works
                  </p>

                  {/* Action Buttons Row */}
                  <div className="flex gap-3">
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
