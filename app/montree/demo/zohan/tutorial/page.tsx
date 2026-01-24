// /montree/demo/zohan/tutorial/page.tsx
// Interactive guided demo for Zohan - FULL EMBEDDED EXPERIENCE
// Session 81 - Complete tutorial with REAL data
// - Demo button opens real YouTube
// - Selection wheel with real works
// - Progress tab with real data

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface Student {
  id: string;
  name: string;
  photo_url?: string;
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
  area?: { area_key: string; name: string };
  status?: string;
}

interface AreaProgress {
  id: string;
  name: string;
  icon: string;
  color: string;
  works: { id: string; name: string; status: number }[];
  stats: { total: number; presented: number; practicing: number; mastered: number };
}

interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  emoji: string;
  targetType: 'student' | 'status' | 'work' | 'notes' | 'demo' | 'camera' | 'wheel' | 'tab' | 'report' | 'preview' | 'none';
  targetId?: string;
  autoAdvance?: boolean;
  celebratory?: boolean;
}

// ============================================
// TUTORIAL STEPS - 14 TOTAL
// ============================================

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Your Classroom',
    instruction: 'Here are your students. Each tile shows a child ready for work tracking.',
    emoji: '👋',
    targetType: 'none',
    autoAdvance: false,
  },
  {
    id: 'select-student',
    title: "Let's Start with Rachel",
    instruction: "Tap Rachel's card to see her work this week.",
    emoji: '👆',
    targetType: 'student',
    targetId: 'Rachel',
  },
  {
    id: 'status-tap',
    title: 'Update Progress',
    instruction: 'Tap the status badge to cycle: Not Started → Presented → Practicing → Mastered',
    emoji: '🎯',
    targetType: 'status',
  },
  {
    id: 'expand-work',
    title: 'See Details',
    instruction: 'Tap the work name to expand and see more options.',
    emoji: '📖',
    targetType: 'work',
  },
  {
    id: 'add-note',
    title: 'Add an Observation',
    instruction: 'Notes appear in weekly parent reports. Try typing something! Hit enter to save.',
    emoji: '✏️',
    targetType: 'notes',
  },
  {
    id: 'watch-demo',
    title: 'Need a Refresher?',
    instruction: 'Tap Demo to watch a YouTube video of how to present this work.',
    emoji: '▶️',
    targetType: 'demo',
  },
  {
    id: 'take-photo',
    title: 'Capture the Moment',
    instruction: 'Photos are the proof that goes into parent reports!',
    emoji: '📸',
    targetType: 'camera',
  },
  {
    id: 'random-work-intro',
    title: '😮 Child Chose a Random Work!',
    instruction: 'This happens all the time. A child picks up something not on their weekly plan.',
    emoji: '😮',
    targetType: 'none',
    autoAdvance: false,
    celebratory: true,
  },
  {
    id: 'selection-wheel',
    title: 'The Selection Wheel',
    instruction: 'Press and HOLD the area icon to open the work selection wheel.',
    emoji: '🎡',
    targetType: 'wheel',
  },
  {
    id: 'progress-tab',
    title: 'Progress Overview',
    instruction: 'The Progress tab shows mastery across all curriculum areas.',
    emoji: '📊',
    targetType: 'tab',
    targetId: 'progress',
  },
  {
    id: 'grand-finale-intro',
    title: '🎉 THE GRAND FINALE 🎉',
    instruction: 'Now for the magic. Where all this data becomes something beautiful for parents...',
    emoji: '✨',
    targetType: 'none',
    autoAdvance: false,
    celebratory: true,
  },
  {
    id: 'generate-report',
    title: 'Generate a Report',
    instruction: 'Tap "Generate Report" to create a beautiful weekly summary.',
    emoji: '📄',
    targetType: 'report',
  },
  {
    id: 'preview-report',
    title: 'Preview the Magic',
    instruction: 'See how it looks to parents. Photos, observations, developmental insights!',
    emoji: '👁️',
    targetType: 'preview',
  },
  {
    id: 'conclusion',
    title: "That's It!",
    instruction: '',
    emoji: '🏆',
    targetType: 'none',
    celebratory: true,
  },
];

// ============================================
// CONSTANTS
// ============================================

const AVATAR_COLORS = [
  ['#10b981', '#14b8a6'],
  ['#3b82f6', '#6366f1'],
  ['#f59e0b', '#f97316'],
  ['#ec4899', '#f43f5e'],
  ['#8b5cf6', '#a855f7'],
  ['#06b6d4', '#0ea5e9'],
];

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', next: 'presented' },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800', next: 'practicing' },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800', next: 'mastered' },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800', next: 'not_started' },
};

const AREA_CONFIG: Record<string, { letter: string; color: string; bg: string; name: string }> = {
  practical_life: { letter: 'P', color: 'text-pink-700', bg: 'bg-pink-100', name: 'Practical Life' },
  sensorial: { letter: 'S', color: 'text-purple-700', bg: 'bg-purple-100', name: 'Sensorial' },
  math: { letter: 'M', color: 'text-blue-700', bg: 'bg-blue-100', name: 'Mathematics' },
  mathematics: { letter: 'M', color: 'text-blue-700', bg: 'bg-blue-100', name: 'Mathematics' },
  language: { letter: 'L', color: 'text-green-700', bg: 'bg-green-100', name: 'Language' },
  culture: { letter: 'C', color: 'text-orange-700', bg: 'bg-orange-100', name: 'Cultural' },
  cultural: { letter: 'C', color: 'text-orange-700', bg: 'bg-orange-100', name: 'Cultural' },
};

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'from-pink-500 to-rose-500' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'from-purple-500 to-violet-500' },
  { id: 'mathematics', name: 'Mathematics', icon: '🔢', color: 'from-blue-500 to-indigo-500' },
  { id: 'language', name: 'Language', icon: '📖', color: 'from-green-500 to-emerald-500' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'from-orange-500 to-amber-500' },
];

function getAvatarColor(index: number): [string, string] {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ZohanTutorialPage() {
  const router = useRouter();
  
  // Core state
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  
  // Student detail state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [activeTab, setActiveTab] = useState('week');
  const [weekInfo, setWeekInfo] = useState<{ week: number; year: number } | null>(null);
  
  // Wheel state - REAL works
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelArea, setWheelArea] = useState('');
  const [allWorks, setAllWorks] = useState<CurriculumWork[]>([]);
  const [wheelLoading, setWheelLoading] = useState(false);
  const [selectedWheelIndex, setSelectedWheelIndex] = useState(0);
  
  // Progress state - REAL data
  const [areaProgress, setAreaProgress] = useState<AreaProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  
  // Report state
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

  const fetchWorksForArea = async (area: string) => {
    if (!selectedStudent) return;
    setWheelLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('child_id', selectedStudent.id);
      params.set('limit', '100');
      if (area && area !== 'all') params.set('area', area);

      const res = await fetch(`/api/montree/works/search?${params.toString()}`);
      const data = await res.json();
      setAllWorks(data.works || []);
      setSelectedWheelIndex(0);
    } catch (err) {
      console.error('Failed to fetch works:', err);
      setAllWorks([]);
    } finally {
      setWheelLoading(false);
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

  // ============================================
  // NAVIGATION
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
  // ACTION HANDLERS
  // ============================================

  const handleStudentClick = (student: Student) => {
    if (step.targetType === 'student') {
      if (step.targetId && student.name.toLowerCase() !== step.targetId.toLowerCase()) {
        toast.error(`Please tap on ${step.targetId}`);
        return;
      }
      setSelectedStudent(student);
      fetchAssignments(student.id);
      nextStep();
    }
  };

  const handleStatusTap = async (index: number) => {
    const assignment = assignments[index];
    const nextStatus = STATUS_CONFIG[assignment.progress_status].next;
    
    setAssignments(prev => prev.map((a, i) => 
      i === index ? { ...a, progress_status: nextStatus as any } : a
    ));

    // Actually update the progress
    try {
      await fetch('/api/weekly-planning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id, status: nextStatus }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
    
    if (step.targetType === 'status') {
      toast.success(`→ ${nextStatus.replace('_', ' ')}`);
      nextStep();
    }
  };

  const handleWorkExpand = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
    setEditingNotes(assignments[index]?.notes || '');
    
    if (step.targetType === 'work' && expandedIndex !== index) {
      nextStep();
    }
  };

  const handleNotesChange = (value: string) => {
    setEditingNotes(value);
    if (step.targetType === 'notes' && value.length > 5) {
      nextStep();
    }
  };

  // REAL YouTube demo
  const handleDemoClick = (workName: string) => {
    const searchQuery = encodeURIComponent(`${workName} Montessori presentation`);
    window.open(`https://www.youtube.com/results?search_query=${searchQuery}`, '_blank');
    
    if (step.targetType === 'demo') {
      toast.success('Opening YouTube...');
      nextStep();
    }
  };

  const handleCameraClick = () => {
    if (step.targetType === 'camera') {
      toast.success('📸 Photo captured! (Demo)');
      nextStep();
    }
  };

  // REAL wheel with area
  const handleWheelOpen = (area: string) => {
    setWheelArea(area);
    setWheelOpen(true);
    fetchWorksForArea(area);
    
    if (step.targetType === 'wheel') {
      // Don't auto-close, let user interact
    }
  };

  const handleWheelSelect = async (work: CurriculumWork) => {
    if (!selectedStudent || !weekInfo) {
      toast.error('Missing data');
      return;
    }

    try {
      toast.loading(`Adding ${work.name}...`);
      
      const res = await fetch('/api/weekly-planning/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: weekInfo.week,
          year: weekInfo.year,
          child_id: selectedStudent.id,
          work_id: work.id,
          work_name: work.name,
          area: work.area?.area_key || wheelArea,
        }),
      });
      
      if (!res.ok) throw new Error('Failed');
      
      toast.dismiss();
      toast.success(`Added: ${work.name}`);
      
      // Refresh assignments
      fetchAssignments(selectedStudent.id);
      setWheelOpen(false);
      
      if (step.targetType === 'wheel') {
        nextStep();
      }
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to add work');
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    if (tab === 'progress' && selectedStudent) {
      fetchProgress(selectedStudent.id);
    }
    
    if (step.targetType === 'tab' && tab === step.targetId) {
      nextStep();
    }
  };

  const handleGenerateReport = () => {
    if (step.targetType === 'report') {
      setReportGenerated(true);
      toast.success('Report generated! 🎉');
      nextStep();
    }
  };

  const handlePreviewReport = () => {
    if (step.targetType === 'preview') {
      setReportPreviewOpen(true);
    }
  };

  const handleCloseReportPreview = () => {
    setReportPreviewOpen(false);
    nextStep();
  };

  // ============================================
  // RENDER: LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl shadow-lg mb-4 animate-pulse">
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            There we have it, Zohan.
          </h1>
          
          <p className="text-2xl text-emerald-300 font-semibold mb-8">
            30% effort → 150% output
          </p>

          <div className="text-left bg-white/10 rounded-2xl p-6 mb-8 text-white/90 space-y-3">
            <p className="flex items-center gap-3"><span>✓</span> Teachers freed from busy work</p>
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
  // RENDER: STUDENT DETAIL VIEW
  // ============================================

  if (selectedStudent) {
    const studentIndex = students.findIndex(s => s.id === selectedStudent.id);
    const gradient = AVATAR_COLORS[studentIndex % AVATAR_COLORS.length];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        {/* Header */}
        <header 
          className="text-white sticky top-0 z-40"
          style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
        >
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
                <span className="text-white text-2xl font-bold">{selectedStudent.name.charAt(0)}</span>
              </div>
              
              <div className="flex-1">
                <h1 className="text-xl font-bold">{selectedStudent.name}</h1>
                <p className="text-white/80 text-sm">Age 4.5</p>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="bg-white border-b shadow-sm sticky top-[88px] z-30">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex gap-1 py-2">
              {[
                { id: 'week', label: 'This Week', icon: '📋' },
                { id: 'progress', label: 'Progress', icon: '📊' },
                { id: 'reports', label: 'Reports', icon: '📄' },
              ].map(tab => (
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
            <div className="space-y-2">
              {assignments.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-gray-500">No assignments this week</p>
                </div>
              ) : (
                assignments.map((assignment, index) => {
                  const area = AREA_CONFIG[assignment.area] || { letter: '?', color: 'text-gray-600', bg: 'bg-gray-100', name: 'Unknown' };
                  const status = STATUS_CONFIG[assignment.progress_status];
                  const isExpanded = expandedIndex === index;
                  const isFirstWork = index === 0;

                  const highlightStatus = step.targetType === 'status' && isFirstWork;
                  const highlightWork = step.targetType === 'work' && isFirstWork;
                  const highlightWheel = step.targetType === 'wheel' && isFirstWork;

                  return (
                    <div 
                      key={assignment.id} 
                      className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <div className="flex items-center p-3 gap-3">
                        {/* Area Icon - HOLD for wheel */}
                        <div 
                          className={`w-10 h-10 rounded-xl ${area.bg} flex items-center justify-center ${area.color} font-bold text-base cursor-pointer select-none active:scale-90 transition-transform shadow-sm ${highlightWheel ? 'ring-2 ring-orange-500 ring-offset-2 animate-pulse' : ''}`}
                          onClick={() => handleWheelOpen(assignment.area)}
                        >
                          {area.letter}
                        </div>

                        {/* Status Badge */}
                        <button
                          onClick={() => handleStatusTap(index)}
                          className={`w-10 h-10 rounded-full ${status.color} flex items-center justify-center font-bold text-sm transition-transform active:scale-90 shadow-sm ${highlightStatus ? 'ring-2 ring-emerald-500 ring-offset-2 animate-pulse scale-110' : ''}`}
                        >
                          {status.label}
                        </button>

                        {/* Work Name */}
                        <div 
                          className={`flex-1 min-w-0 cursor-pointer ${highlightWork ? 'bg-emerald-50 rounded-lg px-2 py-1 ring-2 ring-emerald-500' : ''}`}
                          onClick={() => handleWorkExpand(index)}
                        >
                          <p className="font-medium text-gray-900 truncate">{assignment.work_name}</p>
                        </div>

                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      {/* Expanded Panel */}
                      {isExpanded && (
                        <div className="border-t bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                          {/* Notes */}
                          <div className={`mb-4 ${step.targetType === 'notes' ? 'ring-2 ring-emerald-500 rounded-lg p-2' : ''}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">📝 Notes</label>
                            <textarea
                              value={editingNotes}
                              onChange={(e) => handleNotesChange(e.target.value)}
                              placeholder="Add observation notes..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                              rows={3}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleDemoClick(assignment.work_name)}
                              className={`flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 ${step.targetType === 'demo' ? 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse scale-105' : ''}`}
                            >
                              <span className="text-xl">▶️</span>
                              <span>Demo</span>
                            </button>

                            <button
                              onClick={handleCameraClick}
                              className={`flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 ${step.targetType === 'camera' ? 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse scale-105' : ''}`}
                            >
                              <span className="text-xl">📸</span>
                              <span>Capture</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* PROGRESS TAB - REAL DATA */}
          {activeTab === 'progress' && (
            <div className="space-y-4">
              {progressLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin text-4xl mb-3">📊</div>
                  <p className="text-gray-500">Loading progress...</p>
                </div>
              ) : (
                <>
                  {/* Overall Stats */}
                  {areaProgress.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
                      <h3 className="font-bold text-gray-900 mb-3">Overall Progress</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-amber-600">
                            {areaProgress.reduce((sum, a) => sum + a.stats.presented, 0)}
                          </div>
                          <p className="text-xs text-gray-500">Presented</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {areaProgress.reduce((sum, a) => sum + a.stats.practicing, 0)}
                          </div>
                          <p className="text-xs text-gray-500">Practicing</p>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {areaProgress.reduce((sum, a) => sum + a.stats.mastered, 0)}
                          </div>
                          <p className="text-xs text-gray-500">Mastered</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Area Breakdown */}
                  {areaProgress.map(area => {
                    const total = area.stats.total || 1;
                    const progressPercent = Math.round(
                      ((area.stats.presented + area.stats.practicing + area.stats.mastered) / total) * 100
                    );

                    return (
                      <div key={area.id} className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${area.color} rounded-xl flex items-center justify-center text-xl`}>
                            {area.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{area.name}</h4>
                            <p className="text-xs text-gray-500">
                              {area.stats.mastered}/{area.stats.total} mastered
                            </p>
                          </div>
                          <span className="text-lg font-bold text-emerald-600">{progressPercent}%</span>
                        </div>
                        
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full flex">
                            <div className="bg-green-500" style={{ width: `${(area.stats.mastered / total) * 100}%` }} />
                            <div className="bg-blue-500" style={{ width: `${(area.stats.practicing / total) * 100}%` }} />
                            <div className="bg-amber-400" style={{ width: `${(area.stats.presented / total) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {areaProgress.length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                      <div className="text-4xl mb-3">📊</div>
                      <p className="text-gray-500">No progress data yet</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* REPORTS TAB */}
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
                    className={`w-full py-4 bg-white text-emerald-600 font-bold rounded-xl text-lg flex items-center justify-center gap-2 ${step.targetType === 'report' ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                  >
                    <span>✨</span>
                    <span>Generate Report</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePreviewReport}
                    className={`w-full py-4 bg-white text-emerald-600 font-bold rounded-xl text-lg flex items-center justify-center gap-2 ${step.targetType === 'preview' ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                  >
                    <span>👁️</span>
                    <span>Preview Report</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </main>

        {/* REAL Work Selection Wheel */}
        {wheelOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setWheelOpen(false)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4">
                <h3 className="text-xl font-bold text-center">Work Selection Wheel</h3>
                <p className="text-center text-white/80 text-sm">
                  {AREA_CONFIG[wheelArea]?.name || 'All Areas'} • {allWorks.length} works
                </p>
              </div>

              {/* Works List */}
              <div className="max-h-80 overflow-y-auto">
                {wheelLoading ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin text-3xl mb-2">🎡</div>
                    <p className="text-gray-500">Loading works...</p>
                  </div>
                ) : allWorks.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-500">No works found</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {allWorks.map((work, index) => (
                      <button
                        key={work.id}
                        onClick={() => handleWheelSelect(work)}
                        className={`w-full p-3 rounded-xl text-left transition-all hover:bg-emerald-50 flex items-center gap-3 ${
                          index === selectedWheelIndex ? 'bg-emerald-100 ring-2 ring-emerald-500' : ''
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${AREA_CONFIG[work.area?.area_key || '']?.bg || 'bg-gray-100'} flex items-center justify-center text-sm font-bold ${AREA_CONFIG[work.area?.area_key || '']?.color || 'text-gray-600'}`}>
                          {AREA_CONFIG[work.area?.area_key || '']?.letter || '?'}
                        </div>
                        <span className="font-medium text-gray-800">{work.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={() => setWheelOpen(false)}
                  className="w-full py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Preview */}
        {reportPreviewOpen && selectedStudent && (
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
      {/* Header */}
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

      {/* Student Grid */}
      <main className="px-4 py-6 max-w-4xl mx-auto pb-40">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {students.map((student, index) => {
            const colors = getAvatarColor(index);
            const isHighlighted = step.targetType === 'student' && 
                                 step.targetId?.toLowerCase() === student.name.toLowerCase();

            return (
              <button
                key={student.id}
                onClick={() => handleStudentClick(student)}
                className={`
                  relative flex flex-col items-center p-4 rounded-2xl transition-all
                  ${isHighlighted 
                    ? 'bg-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500 scale-105' 
                    : 'bg-white/70 hover:bg-white hover:shadow-md'
                  }
                  ${showTutorial && step.targetType === 'student' && !isHighlighted ? 'opacity-40' : ''}
                `}
              >
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md mb-2"
                  style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                >
                  {student.name.charAt(0)}
                </div>
                
                <p className="font-medium text-slate-800 text-sm text-center truncate w-full">
                  {student.name}
                </p>

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

      {/* Tutorial Overlay */}
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

function BeautifulReportPreview({ 
  studentName, 
  onClose 
}: { 
  studentName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-50 to-white z-50 overflow-auto">
      <button
        onClick={onClose}
        className="fixed top-4 right-4 z-50 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-100"
      >
        ✕
      </button>

      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              🐋
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Whale Class</h1>
              <p className="text-sm text-gray-500">Weekly Learning Report</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-20">
        {/* Child Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {studentName.charAt(0)}
            </div>
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

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📝</span> Weekly Summary
          </h3>
          <p className="text-gray-700 leading-relaxed">
            {studentName} had a wonderful week of exploration and discovery! She showed great focus during her Sensorial work, 
            especially with the Pink Tower. Her concentration has improved significantly, and she's beginning to self-correct 
            when placing the cubes. In Mathematics, she was introduced to the Number Rods and is developing a strong 
            understanding of quantity.
          </p>
        </div>

        {/* Highlights */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 px-2">
            <span>✨</span> Learning Highlights
          </h3>
          
          {/* Highlight 1 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">🗼</div>
                <p className="text-gray-500 text-sm">Photo: Pink Tower work</p>
              </div>
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 shadow-sm">
                Sensorial
              </div>
            </div>
            <div className="p-5 space-y-3">
              <h4 className="font-semibold text-gray-800">Pink Tower</h4>
              <p className="text-gray-700">
                {studentName} built the Pink Tower independently, carefully placing each cube from largest to smallest. 
                She noticed when one cube was out of order and self-corrected!
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Why it matters: </span>
                  The Pink Tower develops visual discrimination of size, fine motor control, and concentration.
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">💡 Try at home: </span>
                  Stack household items by size and let your child arrange them biggest to smallest.
                </p>
              </div>
            </div>
          </div>

          {/* Highlight 2 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">📏</div>
                <p className="text-gray-500 text-sm">Photo: Number Rods</p>
              </div>
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 shadow-sm">
                Mathematics
              </div>
            </div>
            <div className="p-5 space-y-3">
              <h4 className="font-semibold text-gray-800">Number Rods</h4>
              <p className="text-gray-700">
                {studentName} received her first presentation of the Number Rods. She was fascinated by how the rods 
                increase in length and counted aloud as we named each one.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Why it matters: </span>
                  Number Rods provide a concrete experience of quantity - children literally feel that 10 is longer than 1.
                </p>
              </div>
            </div>
          </div>

          {/* Highlight 3 - Mastered */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">🫗</div>
                <p className="text-gray-500 text-sm">Photo: Pouring water</p>
              </div>
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700 shadow-sm">
                Practical Life
              </div>
            </div>
            <div className="p-5 space-y-3">
              <h4 className="font-semibold text-gray-800">Pouring Water</h4>
              <p className="text-gray-700">
                {studentName} has mastered pouring water between two pitchers! She pours slowly and steadily with no spills.
              </p>
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                  <span>🎉</span> MASTERED! {studentName} can now move on to more challenging exercises.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Parent Message */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <span>💝</span> A Note for You
          </h3>
          <p className="text-blue-900 leading-relaxed italic">
            "Thank you for sharing {studentName} with us this week. Her curiosity and gentle nature make her a 
            wonderful member of our classroom community. We're excited to see her continue to grow!"
          </p>
          <p className="text-blue-700 mt-3 font-medium text-right">— Teacher Tredoux</p>
        </div>

        <footer className="text-center py-8 text-gray-400 text-sm">
          <p>Generated with care by Whale Class</p>
          <p className="mt-1 text-xs">✨ Enhanced with AI</p>
        </footer>

        <div className="fixed bottom-6 left-0 right-0 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-full shadow-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <span>✓</span>
            <span>Continue Tutorial</span>
          </button>
        </div>
      </main>
    </div>
  );
}

// ============================================
// TUTORIAL OVERLAY
// ============================================

function TutorialOverlay({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: {
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
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-slate-500 text-xs mt-1">
          Step {currentIndex + 1} of {totalSteps}
        </p>
      </div>

      <div className={`
        max-w-md mx-auto rounded-2xl shadow-2xl pointer-events-auto overflow-hidden
        ${step.celebratory ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-white'}
      `}>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`
              w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0
              ${step.celebratory ? 'bg-white/20' : 'bg-gradient-to-br from-emerald-100 to-teal-100'}
            `}>
              {step.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-lg mb-1 ${step.celebratory ? 'text-white' : 'text-slate-800'}`}>
                {step.title}
              </h3>
              <p className={`text-sm leading-relaxed ${step.celebratory ? 'text-white/90' : 'text-slate-600'}`}>
                {step.instruction}
              </p>
            </div>
          </div>
        </div>

        <div className={`
          px-5 py-3 flex items-center justify-between border-t
          ${step.celebratory ? 'border-white/20 bg-white/10' : 'border-slate-100 bg-slate-50'}
        `}>
          <button
            onClick={onSkip}
            className={`text-sm ${step.celebratory ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Skip tutorial
          </button>

          <div className="flex gap-2">
            {currentIndex > 0 && (
              <button
                onClick={onPrev}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium
                  ${step.celebratory 
                    ? 'bg-white/20 text-white hover:bg-white/30' 
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }
                `}
              >
                ← Back
              </button>
            )}
            
            {(step.autoAdvance === false || step.celebratory) && (
              <button
                onClick={onNext}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium
                  ${step.celebratory 
                    ? 'bg-white text-orange-600 hover:bg-white/90' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }
                `}
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
