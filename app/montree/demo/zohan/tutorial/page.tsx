// /montree/demo/zohan/tutorial/page.tsx
// Interactive guided demo for Zohan - MATCHES REAL PAGE EXACTLY
// Session 81 - Audit: Copied from real /montree/dashboard/student/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

// ============================================
// TYPES - Copied from real page
// ============================================

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

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  sequence: number;
  area?: {
    area_key: string;
    name: string;
  };
  status?: 'not_started' | 'presented' | 'practicing' | 'mastered';
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

interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  emoji: string;
  targetType: 'student' | 'status' | 'work' | 'notes' | 'demo' | 'camera' | 'wheel' | 'tab' | 'report' | 'preview' | 'findwork' | 'none';
  targetId?: string;
  autoAdvance?: boolean;
  celebratory?: boolean;
}

// ============================================
// CONSTANTS - Copied from real page
// ============================================

const TABS = [
  { id: 'week', label: 'This Week', icon: '📋' },
  { id: 'progress', label: 'Progress', icon: '📊' },
  { id: 'portfolio', label: 'Portfolio', icon: '📷' },
  { id: 'reports', label: 'Reports', icon: '📄' },
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

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-blue-500 to-indigo-500',
  'from-cyan-500 to-teal-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
];

const STATUS_LABELS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];

// ============================================
// TUTORIAL STEPS
// ============================================

const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'welcome', title: 'Your Classroom', instruction: 'Here are your students. Each card shows a child ready for tracking.', emoji: '👋', targetType: 'none', autoAdvance: false },
  { id: 'select-student', title: "Let's Start with Rachel", instruction: "Tap Rachel's card to see her weekly work.", emoji: '👆', targetType: 'student', targetId: 'Rachel' },
  { id: 'status-tap', title: 'Update Progress', instruction: 'Tap the status badge to cycle: ○ → P → Pr → M', emoji: '🎯', targetType: 'status' },
  { id: 'expand-work', title: 'See More Details', instruction: 'Tap the work name to expand and see all options.', emoji: '📖', targetType: 'work' },
  { id: 'add-note', title: 'Add an Observation', instruction: 'Notes appear in parent reports. Try typing something! Hit enter to save.', emoji: '✏️', targetType: 'notes' },
  { id: 'watch-demo', title: 'Need a Refresher?', instruction: 'Tap Demo to open YouTube and see how to present this work.', emoji: '▶️', targetType: 'demo' },
  { id: 'take-photo', title: 'Capture the Moment', instruction: 'Photos go directly into parent reports!', emoji: '📸', targetType: 'camera' },
  { id: 'random-work-intro', title: '😮 Child Chose a Random Work!', instruction: 'This happens constantly. A child picks up something not on their plan.', emoji: '😮', targetType: 'none', autoAdvance: false, celebratory: true },
  { id: 'find-work', title: 'Find Any Work', instruction: 'Tap "Find Work" to search the entire curriculum. Try it!', emoji: '🔍', targetType: 'findwork' },
  { id: 'progress-tab', title: 'Progress Overview', instruction: 'The Progress tab shows mastery across all curriculum areas.', emoji: '📊', targetType: 'tab', targetId: 'progress' },
  { id: 'grand-finale-intro', title: '🎉 THE GRAND FINALE 🎉', instruction: 'Now for the magic—where all this data becomes a beautiful report...', emoji: '✨', targetType: 'none', autoAdvance: false, celebratory: true },
  { id: 'generate-report', title: 'Generate a Report', instruction: 'Tap "Generate Report" to create a weekly summary for parents.', emoji: '📄', targetType: 'report' },
  { id: 'preview-report', title: 'Preview the Magic', instruction: 'See how parents experience it: photos, notes, developmental insights!', emoji: '👁️', targetType: 'preview' },
  { id: 'conclusion', title: "That's It!", instruction: '', emoji: '🏆', targetType: 'none', celebratory: true },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ZohanTutorialPage() {
  const router = useRouter();
  
  // Tutorial state
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  
  // Data state
  const [students, setStudents] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Child | null>(null);
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [weekInfo, setWeekInfo] = useState<{ week: number; year: number } | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState('week');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Work Navigator state
  const [workNavOpen, setWorkNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [allWorks, setAllWorks] = useState<CurriculumWork[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(false);
  const [selectedWork, setSelectedWork] = useState<CurriculumWork | null>(null);
  
  // Wheel state (for long-press)
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelArea, setWheelArea] = useState('');
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Progress tab state
  const [areaProgress, setAreaProgress] = useState<AreaProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
  
  // Reports state
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);

  const step = TUTORIAL_STEPS[currentStep];

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/montree/children');
      const data = await res.json();
      setStudents(data.children || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (studentId: string) => {
    try {
      const res = await fetch(`/api/classroom/child/${studentId}/week`);
      const data = await res.json();
      setAssignments(data.assignments || []);
      setWeekInfo(data.weekInfo || null);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  const fetchProgress = async (studentId: string) => {
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/classroom/child/${studentId}/progress`);
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
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  const fetchWorksForNav = useCallback(async () => {
    if (!selectedStudent || !workNavOpen) return;
    setLoadingWorks(true);
    try {
      const params = new URLSearchParams();
      params.set('child_id', selectedStudent.id);
      params.set('limit', '400');
      if (selectedArea !== 'all') params.set('area', selectedArea);

      const res = await fetch(`/api/montree/works/search?${params.toString()}`);
      const data = await res.json();
      setAllWorks(data.works || []);
      setSelectedWork(null);
    } catch (err) {
      console.error('Failed to fetch works:', err);
      setAllWorks([]);
    } finally {
      setLoadingWorks(false);
    }
  }, [selectedStudent, workNavOpen, selectedArea]);

  useEffect(() => {
    if (workNavOpen) fetchWorksForNav();
  }, [workNavOpen, selectedArea, fetchWorksForNav]);

  // ============================================
  // TUTORIAL NAVIGATION
  // ============================================

  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleStudentClick = (student: Child) => {
    if (step.targetType === 'student') {
      if (step.targetId && student.name.toLowerCase() !== step.targetId.toLowerCase()) {
        toast.error(`Please tap on ${step.targetId}`);
        return;
      }
    }
    setSelectedStudent(student);
    fetchAssignments(student.id);
    if (step.targetType === 'student') nextStep();
  };

  const handleStatusTap = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const assignment = assignments[index];
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    
    setAssignments(prev => prev.map((a, i) => 
      i === index ? { ...a, progress_status: nextStatus as any } : a
    ));

    try {
      await fetch('/api/weekly-planning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id, status: nextStatus }),
      });
      toast.success(`${assignment.work_name} → ${nextStatus.replace('_', ' ')}`);
    } catch (err) {
      console.error('Failed to update:', err);
    }
    
    if (step.targetType === 'status') nextStep();
  };

  const handleWorkExpand = (index: number) => {
    const wasExpanded = expandedIndex === index;
    setExpandedIndex(wasExpanded ? null : index);
    setEditingNotes(assignments[index]?.notes || '');
    if (step.targetType === 'work' && !wasExpanded) nextStep();
  };

  const handleNotesChange = (value: string) => {
    setEditingNotes(value);
    if (step.targetType === 'notes' && value.length > 5) nextStep();
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
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDemoClick = (workName: string) => {
    const q = encodeURIComponent(`${workName} Montessori presentation`);
    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank');
    if (step.targetType === 'demo') {
      toast.success('Opening YouTube...');
      nextStep();
    }
  };

  const handleCameraClick = () => {
    toast.success('📸 Photo captured! (Demo)');
    if (step.targetType === 'camera') nextStep();
  };

  const handleFindWorkClick = () => {
    setWorkNavOpen(true);
    if (step.targetType === 'findwork') nextStep();
  };

  const handleLongPressStart = (area: string) => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setWheelArea(area);
      setWheelOpen(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'progress' && selectedStudent) {
      fetchProgress(selectedStudent.id);
    }
    if (step.targetType === 'tab' && tab === step.targetId) nextStep();
  };

  const handleGenerateReport = () => {
    setReportGenerated(true);
    toast.success('Report generated! 🎉');
    if (step.targetType === 'report') nextStep();
  };

  const handlePreviewReport = () => {
    setReportPreviewOpen(true);
    if (step.targetType === 'preview') {
      // Don't auto-advance - will advance on close
    }
  };

  const handleCloseReportPreview = () => {
    setReportPreviewOpen(false);
    if (step.targetType === 'preview') nextStep();
  };

  // ============================================
  // RENDER: LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 animate-pulse">
            <span className="text-4xl">🐋</span>
          </div>
          <p className="text-gray-500">Loading classroom...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: CONCLUSION
  // ============================================

  if (step.id === 'conclusion') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/95 to-teal-900/95 backdrop-blur-sm flex items-center justify-center p-6 z-50">
        <div className="max-w-lg text-center">
          <div className="text-7xl mb-6">🏆</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">There we have it, Zohan.</h1>
          <p className="text-2xl text-emerald-300 font-semibold mb-8">30% effort → 150% output</p>

          <div className="text-left bg-white/10 rounded-2xl p-6 mb-8 text-white/90 space-y-3">
            <p className="flex items-center gap-3"><span>✓</span> Teachers freed from busywork</p>
            <p className="flex items-center gap-3"><span>✓</span> Records more accurate than ever</p>
            <p className="flex items-center gap-3"><span>✓</span> Parents see real proof of learning</p>
            <p className="flex items-center gap-3"><span>✓</span> Questions answered before they're asked</p>
            <p className="flex items-center gap-3"><span>✓</span> Everyone happier</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/montree/demo/zohan/setup')}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-2xl hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <span className="text-xl">🏫</span>
              <span>Set Up My School Now</span>
            </button>
            
            <a
              href="https://wa.me/8613552416329?text=Hey%20Tredoux%2C%20I%20just%20saw%20the%20Montree%20demo..."
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3"
            >
              <span className="text-xl">💬</span>
              <span>Message Tredoux</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: STUDENT DETAIL (Matches real page!)
  // ============================================

  if (selectedStudent) {
    const studentIndex = students.findIndex(s => s.id === selectedStudent.id);
    const gradient = AVATAR_GRADIENTS[studentIndex % AVATAR_GRADIENTS.length];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        {/* Header - MATCHES REAL */}
        <header className={`bg-gradient-to-r ${gradient} text-white sticky top-0 z-40`}>
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                {selectedStudent.photo_url ? (
                  <img src={selectedStudent.photo_url} alt={selectedStudent.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-white text-2xl font-bold">{selectedStudent.name.charAt(0)}</span>
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-xl font-bold">{selectedStudent.name}</h1>
                <div className="flex items-center gap-3 text-white/80 text-sm">
                  {selectedStudent.age && <span>Age {selectedStudent.age.toFixed(1)}</span>}
                  {selectedStudent.mediaCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span>📷</span> {selectedStudent.mediaCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick stats - MATCHES REAL */}
              <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
                <span className="text-xs">🟡 {selectedStudent.progress?.presented || 0}</span>
                <span className="text-xs">🔵 {selectedStudent.progress?.practicing || 0}</span>
                <span className="text-xs">🟢 {selectedStudent.progress?.mastered || 0}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation - MATCHES REAL (4 tabs!) */}
        <div className="bg-white border-b shadow-sm sticky top-[88px] z-30">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex gap-1 py-2">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  } ${step.targetType === 'tab' && step.targetId === tab.id ? 'ring-2 ring-emerald-500 ring-offset-2 animate-pulse' : ''}`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <main className="max-w-4xl mx-auto px-4 py-4 pb-40">
          {/* THIS WEEK TAB */}
          {activeTab === 'week' && (
            <div>
              {/* Week Info Card - MATCHES REAL */}
              {weekInfo && (
                <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">Week {weekInfo.week}, {weekInfo.year}</h3>
                      <p className="text-sm text-gray-500">{assignments.length} works assigned</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-600">
                        {Math.round((assignments.filter(a => a.progress_status === 'mastered').length / Math.max(assignments.length, 1)) * 100)}%
                      </div>
                      <p className="text-xs text-gray-500">complete</p>
                    </div>
                  </div>
                </div>
              )}

              {/* WORK NAVIGATOR - MATCHES REAL */}
              <div className="mb-4">
                <button
                  onClick={handleFindWorkClick}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all w-full justify-center ${
                    workNavOpen
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-sm'
                  } ${step.targetType === 'findwork' ? 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse' : ''}`}
                >
                  <span className="text-xl">{workNavOpen ? '✕' : '🔍'}</span>
                  <span className="font-semibold">{workNavOpen ? 'Close' : 'Find Work'}</span>
                  {!workNavOpen && <span className="text-sm text-emerald-500 ml-1">Browse all works</span>}
                </button>

                {/* Expanded Work Navigator */}
                {workNavOpen && (
                  <div className="mt-3 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 border-b p-3">
                      <div className="relative mb-3">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search works..."
                          className="w-full px-4 py-3 pl-10 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {[
                          { key: 'all', label: 'All', icon: '📋' },
                          { key: 'practical_life', label: 'Practical', icon: '🧹' },
                          { key: 'sensorial', label: 'Sensorial', icon: '👁️' },
                          { key: 'math', label: 'Math', icon: '🔢' },
                          { key: 'language', label: 'Language', icon: '📖' },
                          { key: 'cultural', label: 'Cultural', icon: '🌍' },
                        ].map(area => (
                          <button
                            key={area.key}
                            onClick={() => setSelectedArea(area.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                              selectedArea === area.key
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            <span>{area.icon}</span>
                            <span>{area.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected Work Panel */}
                    {selectedWork && (
                      <div className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                        <div className="flex items-center gap-2">
                          <button
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg ${
                              STATUS_CONFIG[selectedWork.status || 'not_started'].color
                            }`}
                          >
                            {STATUS_CONFIG[selectedWork.status || 'not_started'].label}
                          </button>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">{selectedWork.name}</h3>
                          </div>
                          <button className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xl">📷</button>
                        </div>
                      </div>
                    )}

                    {/* Works List */}
                    <div className="max-h-64 overflow-y-auto">
                      {loadingWorks ? (
                        <div className="text-center py-8 text-gray-500">
                          <span className="animate-bounce text-2xl block mb-2">🐋</span>
                          <p className="text-sm">Loading...</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {allWorks
                            .filter(w => !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .slice(0, 50)
                            .map(work => (
                              <button
                                key={work.id}
                                onClick={() => setSelectedWork(selectedWork?.id === work.id ? null : work)}
                                className={`w-full flex items-center gap-3 p-3 text-left ${
                                  selectedWork?.id === work.id
                                    ? 'bg-emerald-100 border-l-4 border-emerald-500'
                                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                                  STATUS_CONFIG[work.status || 'not_started'].color
                                }`}>
                                  {STATUS_CONFIG[work.status || 'not_started'].label}
                                </div>
                                <span className="flex-1 text-sm truncate text-gray-900">{work.name}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t bg-gray-50 px-4 py-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{allWorks.length} works</span>
                      <button onClick={() => { setWorkNavOpen(false); setSelectedWork(null); }} className="text-sm text-emerald-600 font-medium">Done</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend - MATCHES REAL */}
              {expandedIndex === null && !workNavOpen && (
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

              {/* Work Assignments - MATCHES REAL */}
              <div className="space-y-2">
                {assignments.map((assignment, index) => {
                  const area = AREA_CONFIG[assignment.area] || { letter: '?', color: 'text-gray-600', bg: 'bg-gray-100' };
                  const status = STATUS_CONFIG[assignment.progress_status];
                  const isExpanded = expandedIndex === index;
                  const isFirst = index === 0;

                  return (
                    <div 
                      key={assignment.id} 
                      className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <div className="flex items-center p-3 gap-3">
                        {/* Area Icon - LONG PRESS for wheel */}
                        <div 
                          className={`w-10 h-10 rounded-xl ${area.bg} flex items-center justify-center ${area.color} font-bold text-base cursor-pointer select-none active:scale-90 transition-transform shadow-sm border-2 border-dashed border-transparent active:border-gray-300`}
                          onTouchStart={() => handleLongPressStart(assignment.area)}
                          onTouchEnd={handleLongPressEnd}
                          onMouseDown={() => handleLongPressStart(assignment.area)}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                        >
                          {area.letter}
                        </div>

                        {/* Status Badge - TAP to cycle */}
                        <button
                          onClick={(e) => handleStatusTap(index, e)}
                          className={`w-10 h-10 rounded-full ${status.color} flex items-center justify-center font-bold text-sm transition-transform active:scale-90 shadow-sm ${
                            step.targetType === 'status' && isFirst ? 'ring-2 ring-emerald-500 ring-offset-2 animate-pulse scale-110' : ''
                          }`}
                        >
                          {status.label}
                        </button>

                        {/* Work Name - TAP to expand */}
                        <div 
                          className={`flex-1 min-w-0 flex items-center gap-2 cursor-pointer ${
                            step.targetType === 'work' && isFirst ? 'bg-emerald-50 rounded-lg px-2 py-1 ring-2 ring-emerald-500' : ''
                          }`}
                          onClick={() => handleWorkExpand(index)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{assignment.work_name}</p>
                            {!isExpanded && assignment.notes && (
                              <p className="text-xs text-gray-500 truncate">📝 {assignment.notes}</p>
                            )}
                          </div>

                          {assignment.mediaCount && assignment.mediaCount > 0 && (
                            <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium shrink-0">
                              📷 {assignment.mediaCount}
                            </div>
                          )}

                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Panel - MATCHES REAL */}
                      {isExpanded && (
                        <div className="border-t bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                          <div className={`mb-4 ${step.targetType === 'notes' ? 'ring-2 ring-emerald-500 rounded-lg p-2' : ''}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">📝 Notes</label>
                            <textarea
                              value={editingNotes}
                              onChange={(e) => handleNotesChange(e.target.value)}
                              placeholder="Add observation notes..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none bg-white text-gray-900"
                              rows={3}
                            />
                            {editingNotes !== (assignment.notes || '') && (
                              <button
                                onClick={handleSaveNotes}
                                disabled={savingNotes}
                                className="mt-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {savingNotes ? 'Saving...' : '💾 Save Notes'}
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-center text-gray-400 mb-3">
                            💡 Hold the <span className="font-bold">{area.letter}</span> icon to browse other {AREA_CONFIG[assignment.area]?.bg ? 'works' : 'works'}
                          </p>

                          <div className="flex gap-3">
                            <button
                              onClick={() => handleDemoClick(assignment.work_name)}
                              className={`flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 ${
                                step.targetType === 'demo' ? 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse scale-105' : ''
                              }`}
                            >
                              <span className="text-xl">▶️</span>
                              <span>Demo</span>
                            </button>

                            <button
                              onClick={handleCameraClick}
                              className={`flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 ${
                                step.targetType === 'camera' ? 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse scale-105' : ''
                              }`}
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
          )}

          {/* PROGRESS TAB - MATCHES REAL */}
          {activeTab === 'progress' && (
            <div>
              {progressLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin text-4xl mb-3">📊</div>
                  <p className="text-gray-500">Loading progress...</p>
                </div>
              ) : (
                <>
                  {/* Overall Stats */}
                  <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">Overall Progress</h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-600">
                          {areaProgress.reduce((s, a) => s + a.stats.presented + a.stats.practicing + a.stats.mastered, 0)}/
                          {areaProgress.reduce((s, a) => s + a.stats.total, 0)}
                        </div>
                        <p className="text-xs text-gray-500">works started</p>
                      </div>
                    </div>
                    
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full flex">
                        <div className="bg-green-500" style={{ width: `${(areaProgress.reduce((s,a) => s + a.stats.mastered, 0) / Math.max(areaProgress.reduce((s,a) => s + a.stats.total, 0), 1)) * 100}%` }} />
                        <div className="bg-blue-500" style={{ width: `${(areaProgress.reduce((s,a) => s + a.stats.practicing, 0) / Math.max(areaProgress.reduce((s,a) => s + a.stats.total, 0), 1)) * 100}%` }} />
                        <div className="bg-yellow-400" style={{ width: `${(areaProgress.reduce((s,a) => s + a.stats.presented, 0) / Math.max(areaProgress.reduce((s,a) => s + a.stats.total, 0), 1)) * 100}%` }} />
                      </div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{areaProgress.reduce((s,a) => s + a.stats.total, 0)} total works</span>
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />{areaProgress.reduce((s,a) => s + a.stats.presented, 0)}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{areaProgress.reduce((s,a) => s + a.stats.practicing, 0)}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{areaProgress.reduce((s,a) => s + a.stats.mastered, 0)}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-center mb-3">💡 Tap works to toggle mastered</p>

                  {/* Area Cards */}
                  <div className="space-y-3">
                    {areaProgress.map(area => {
                      const isExpanded = expandedAreaId === area.id;
                      const started = area.stats.presented + area.stats.practicing + area.stats.mastered;

                      return (
                        <div key={area.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                          <button
                            onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
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
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              started > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {started}/{area.stats.total}
                            </span>
                            <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isExpanded && area.works.length > 0 && (
                            <div className={`border-t ${area.bgColor} p-3`}>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {area.works.map((work: any) => (
                                  <button
                                    key={work.id}
                                    className={`p-2.5 rounded-lg text-left transition-all hover:scale-[1.02] ${
                                      work.status === 3 ? 'bg-green-500 text-white shadow-md' 
                                      : work.status === 2 ? 'bg-blue-100 border-2 border-blue-300' 
                                      : work.status === 1 ? 'bg-yellow-50 border border-yellow-300' 
                                      : 'bg-white border border-gray-200'
                                    }`}
                                  >
                                    <p className={`text-xs font-medium truncate ${work.status === 3 ? 'text-white' : 'text-gray-800'}`}>{work.name}</p>
                                    <p className={`text-[10px] ${work.status === 3 ? 'text-green-100' : 'text-gray-500'}`}>{STATUS_LABELS[work.status]}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* PORTFOLIO TAB - MATCHES REAL */}
          {activeTab === 'portfolio' && (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📷</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Portfolio Coming Soon</h3>
              <p className="text-gray-500 text-sm">
                All photos captured during work sessions will appear here.
              </p>
            </div>
          )}

          {/* REPORTS TAB - MATCHES REAL */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">📄</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">Parent Report</h3>
                    <p className="text-white/80 text-sm">Jan 20 - Jan 26</p>
                  </div>
                </div>

                {!reportGenerated ? (
                  <button
                    onClick={handleGenerateReport}
                    className={`w-full py-4 bg-white text-emerald-600 font-bold rounded-xl text-lg flex items-center justify-center gap-2 ${
                      step.targetType === 'report' ? 'ring-4 ring-yellow-400 animate-pulse' : ''
                    }`}
                  >
                    <span>✨</span>
                    <span>Generate Report</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePreviewReport}
                    className={`w-full py-4 bg-white text-emerald-600 font-bold rounded-xl text-lg flex items-center justify-center gap-2 ${
                      step.targetType === 'preview' ? 'ring-4 ring-yellow-400 animate-pulse' : ''
                    }`}
                  >
                    <span>👁️</span>
                    <span>Preview Report</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Floating Parent Share Button - MATCHES REAL */}
        <button
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-30"
          title="Share with Parent"
        >
          <span className="text-2xl">👨‍👩‍👧</span>
        </button>

        {/* Report Preview */}
        {reportPreviewOpen && (
          <BeautifulReportPreview 
            studentName={selectedStudent.name}
            onClose={handleCloseReportPreview}
          />
        )}

        {/* Tutorial Overlay */}
        {showTutorial && !reportPreviewOpen && !wheelOpen && (
          <TutorialOverlay
            step={step}
            currentIndex={currentStep}
            totalSteps={TUTORIAL_STEPS.length}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={() => setShowTutorial(false)}
          />
        )}
      </div>
    );
  }

  // ============================================
  // RENDER: CLASSROOM GRID
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐋</span>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Whale Class</h1>
              <p className="text-xs text-slate-400">{students.length} students</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto pb-40">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {students.map((student, index) => {
            const gradient = AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
            const isHighlighted = step.targetType === 'student' && step.targetId?.toLowerCase() === student.name.toLowerCase();

            return (
              <button
                key={student.id}
                onClick={() => handleStudentClick(student)}
                className={`relative flex flex-col items-center p-4 rounded-2xl transition-all ${
                  isHighlighted 
                    ? 'bg-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500 scale-105' 
                    : 'bg-white/70 hover:bg-white hover:shadow-md'
                } ${showTutorial && step.targetType === 'student' && !isHighlighted ? 'opacity-40' : ''}`}
              >
                <div 
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl shadow-md mb-2`}
                >
                  {student.name.charAt(0)}
                </div>
                <p className="font-medium text-slate-800 text-sm text-center truncate w-full">{student.name}</p>
                {isHighlighted && showTutorial && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <span className="text-2xl animate-bounce">👆</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {showTutorial && (
        <TutorialOverlay
          step={step}
          currentIndex={currentStep}
          totalSteps={TUTORIAL_STEPS.length}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
}

// ============================================
// BEAUTIFUL REPORT PREVIEW
// ============================================

function BeautifulReportPreview({ studentName, onClose }: { studentName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-50 to-white z-50 overflow-auto">
      <button onClick={onClose} className="fixed top-4 right-4 z-50 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-100">✕</button>

      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">🐋</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Whale Class</h1>
              <p className="text-sm text-gray-500">Weekly Learning Report</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-20">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">{studentName.charAt(0)}</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{studentName}</h2>
              <p className="text-gray-500">January 20 - 26, 2026</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-pink-100 text-pink-700">Practical Life</span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">Sensorial</span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">Mathematics</span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Language</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><span>📝</span> Weekly Summary</h3>
          <p className="text-gray-700 leading-relaxed">
            {studentName} had a wonderful week of exploration and discovery! She showed great focus during her Sensorial work, especially with the Pink Tower. Her concentration has improved significantly.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 px-2"><span>✨</span> Learning Highlights</h3>
          
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <div className="text-center"><div className="text-6xl mb-2">🗼</div><p className="text-gray-500 text-sm">Photo: Pink Tower</p></div>
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 shadow-sm">Sensorial</div>
            </div>
            <div className="p-5 space-y-3">
              <h4 className="font-semibold text-gray-800">Pink Tower</h4>
              <p className="text-gray-700">{studentName} built the Pink Tower independently. She noticed when one cube was out of order and self-corrected!</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600"><span className="font-medium text-gray-700">Why it matters: </span>Develops visual discrimination, fine motor control, and concentration.</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-sm text-amber-800"><span className="font-medium">💡 Try at home: </span>Stack household items by size.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <div className="text-center"><div className="text-6xl mb-2">📏</div><p className="text-gray-500 text-sm">Photo: Number Rods</p></div>
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 shadow-sm">Mathematics</div>
            </div>
            <div className="p-5 space-y-3">
              <h4 className="font-semibold text-gray-800">Number Rods</h4>
              <p className="text-gray-700">{studentName} received her first presentation of the Number Rods. She was fascinated by how the rods increase in length.</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600"><span className="font-medium text-gray-700">Why it matters: </span>Children literally feel that 10 is longer than 1.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2"><span>💝</span> A Note for You</h3>
          <p className="text-blue-900 leading-relaxed italic">"Thank you for sharing {studentName} with us this week. Her curiosity makes her a wonderful member of our classroom community!"</p>
          <p className="text-blue-700 mt-3 font-medium text-right">— Teacher Tredoux</p>
        </div>

        <footer className="text-center py-8 text-gray-400 text-sm">
          <p>Generated with care by Whale Class</p>
          <p className="mt-1 text-xs">✨ Enhanced with AI</p>
        </footer>

        <div className="fixed bottom-6 left-0 right-0 flex justify-center">
          <button onClick={onClose} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-full shadow-lg hover:bg-emerald-700 flex items-center gap-2">
            <span>✓</span><span>Continue Tutorial</span>
          </button>
        </div>
      </main>
    </div>
  );
}

// ============================================
// TUTORIAL OVERLAY
// ============================================

function TutorialOverlay({ step, currentIndex, totalSteps, onNext, onPrev, onSkip }: {
  step: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const progress = ((currentIndex + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pointer-events-none">
      <div className="max-w-md mx-auto mb-3">
        <div className="h-1.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-slate-500 text-xs mt-1">Step {currentIndex + 1} of {totalSteps}</p>
      </div>

      <div className={`max-w-md mx-auto rounded-2xl shadow-2xl pointer-events-auto overflow-hidden ${step.celebratory ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-white'}`}>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${step.celebratory ? 'bg-white/20' : 'bg-gradient-to-br from-emerald-100 to-teal-100'}`}>
              {step.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-lg mb-1 ${step.celebratory ? 'text-white' : 'text-slate-800'}`}>{step.title}</h3>
              <p className={`text-sm leading-relaxed ${step.celebratory ? 'text-white/90' : 'text-slate-600'}`}>{step.instruction}</p>
            </div>
          </div>
        </div>

        <div className={`px-5 py-3 flex items-center justify-between border-t ${step.celebratory ? 'border-white/20 bg-white/10' : 'border-slate-100 bg-slate-50'}`}>
          <button onClick={onSkip} className={`text-sm ${step.celebratory ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Skip tutorial</button>
          <div className="flex gap-2">
            {currentIndex > 0 && (
              <button onClick={onPrev} className={`px-4 py-2 rounded-lg text-sm font-medium ${step.celebratory ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>← Back</button>
            )}
            {(step.autoAdvance === false || step.celebratory) && (
              <button onClick={onNext} className={`px-4 py-2 rounded-lg text-sm font-medium ${step.celebratory ? 'bg-white text-orange-600 hover:bg-white/90' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Continue →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
