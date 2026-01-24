// /montree/demo/tutorial/page.tsx
// Interactive Tutorial - walks through the REAL system
// Session 80: Zohan Demo Experience
// Uses REAL data, REAL APIs - the only "demo" part is the guided overlay

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ============================================
// TYPES
// ============================================

interface Student {
  id: string;
  name: string;
  photo_url?: string;
  progress?: {
    presented: number;
    practicing: number;
    mastered: number;
    total: number;
  };
}

interface TutorialStep {
  id: string;
  title: string;
  message: string;
  target?: string; // CSS selector or 'none'
  action?: 'tap' | 'hold' | 'scroll' | 'wait' | 'navigate';
  nextOn?: 'click' | 'auto' | 'manual';
  delay?: number;
  emoji?: string;
  highlight?: boolean;
  position?: 'top' | 'bottom' | 'center';
}

// ============================================
// TUTORIAL STEPS DEFINITION
// ============================================

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Classroom',
    message: "This is your classroom overview. Each tile represents a student. Let's explore!",
    target: 'none',
    nextOn: 'manual',
    emoji: '👋',
    position: 'center',
  },
  {
    id: 'select-student',
    title: "Let's Start with Rachel",
    message: 'Tap on Rachel to see her progress and weekly works.',
    target: '[data-student="Rachel"]',
    action: 'tap',
    nextOn: 'click',
    emoji: '👆',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'student-view',
    title: "Rachel's Work View",
    message: "Here you can see Rachel's assigned works for the week. Each row is a Montessori activity.",
    target: 'none',
    nextOn: 'manual',
    emoji: '📋',
    position: 'top',
  },
  {
    id: 'tap-status',
    title: 'Update Progress',
    message: 'Tap the status badge to cycle through: Not Started → Presented → Practicing → Mastered',
    target: '[data-status-badge]',
    action: 'tap',
    nextOn: 'click',
    emoji: '🎯',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'expand-work',
    title: 'See More Details',
    message: 'Tap the work name to expand and see notes, video, and photo options.',
    target: '[data-work-row]',
    action: 'tap',
    nextOn: 'click',
    emoji: '📝',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'add-note',
    title: 'Add a Note',
    message: 'Notes you add here will appear in the weekly parent report. Try typing something!',
    target: '[data-notes-input]',
    nextOn: 'manual',
    emoji: '✍️',
    position: 'top',
  },
  {
    id: 'watch-video',
    title: 'Quick Refresher',
    message: 'Tap "Demo" to watch a presentation video on YouTube. Great for training or review!',
    target: '[data-demo-button]',
    nextOn: 'manual',
    emoji: '🎬',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'take-photo',
    title: 'Capture the Moment',
    message: "Photos are proof of work. They appear in reports so parents see what their child actually did.",
    target: '[data-capture-button]',
    nextOn: 'manual',
    emoji: '📸',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'random-work',
    title: '😮 Child Chose a Random Work!',
    message: "This happens all the time! The child picked something not on this week's plan...",
    target: 'none',
    nextOn: 'auto',
    delay: 2000,
    emoji: '😮',
    position: 'center',
  },
  {
    id: 'open-wheel',
    title: 'The Selection Wheel',
    message: 'Hold the area icon (P, S, M, L, or C) to open a wheel of ALL works in that area.',
    target: '[data-area-icon]',
    action: 'hold',
    nextOn: 'manual',
    emoji: '🎡',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'progress-tab',
    title: 'Progress Overview',
    message: "Now let's check the Progress tab. Get a bird's eye view of where each child stands.",
    target: '[data-tab="progress"]',
    action: 'tap',
    nextOn: 'click',
    emoji: '📊',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'progress-view',
    title: 'At a Glance',
    message: 'See which areas need attention. Green = mastered, Blue = practicing, Yellow = presented.',
    target: 'none',
    nextOn: 'manual',
    emoji: '👁️',
    position: 'top',
  },
  {
    id: 'grand-finale-intro',
    title: '🎉 The Grand Finale',
    message: "Now for the magic. Where all this data becomes something beautiful...",
    target: 'none',
    nextOn: 'auto',
    delay: 2500,
    emoji: '✨',
    position: 'center',
  },
  {
    id: 'reports-tab',
    title: 'Weekly Reports',
    message: "Tap the Reports tab to see the culmination of everything.",
    target: '[data-tab="reports"]',
    action: 'tap',
    nextOn: 'click',
    emoji: '📄',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'generate-report',
    title: 'Generate a Report',
    message: "With one tap, all the week's work, notes, and photos become a beautiful parent report.",
    target: '[data-generate-report]',
    nextOn: 'manual',
    emoji: '✨',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'preview-report',
    title: 'Preview the Magic',
    message: 'Click to preview what parents will see. Professional, beautiful, effortless.',
    target: '[data-report-card]',
    nextOn: 'manual',
    emoji: '👀',
    highlight: true,
    position: 'bottom',
  },
  {
    id: 'conclusion',
    title: 'There We Have It',
    message: '',
    target: 'none',
    nextOn: 'manual',
    emoji: '🏆',
    position: 'center',
  },
];

// ============================================
// AVATAR COLORS
// ============================================

const AVATAR_GRADIENTS = [
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-indigo-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-cyan-500 to-sky-500',
];

function getGradient(index: number) {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TutorialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewerName = searchParams.get('name') || 'Zohan';

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'week' | 'progress' | 'reports'>('week');

  // Refs for auto-advance
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Current step data
  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  // ============================================
  // FETCH STUDENTS (REAL DATA)
  // ============================================

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch('/api/montree/children');
        const data = await res.json();
        setStudents(data.children || []);
      } catch (err) {
        console.error('Failed to fetch students:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  // ============================================
  // AUTO-ADVANCE FOR 'auto' STEPS
  // ============================================

  useEffect(() => {
    if (step?.nextOn === 'auto' && step?.delay) {
      autoAdvanceTimer.current = setTimeout(() => {
        nextStep();
      }, step.delay);
    }

    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, [currentStep, step]);

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

  const skipTutorial = () => {
    setShowOverlay(false);
  };

  // ============================================
  // HANDLE STUDENT CLICK
  // ============================================

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    
    // If we're on the "select-student" step, advance
    if (step?.id === 'select-student') {
      nextStep();
    }
  };

  // ============================================
  // HANDLE TAB CLICK
  // ============================================

  const handleTabClick = (tab: 'week' | 'progress' | 'reports') => {
    setActiveTab(tab);
    
    // Advance if clicking expected tab
    if (step?.id === 'progress-tab' && tab === 'progress') {
      nextStep();
    }
    if (step?.id === 'reports-tab' && tab === 'reports') {
      nextStep();
    }
  };

  // ============================================
  // RENDER: LOADING
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🐋</span>
          </div>
          <p className="text-slate-500">Loading classroom...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: CONCLUSION STEP
  // ============================================

  if (isLastStep && step?.id === 'conclusion') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <div className="text-6xl mb-6">🏆</div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            There we have it, {viewerName}.
          </h1>
          
          <div className="text-xl text-emerald-300 mb-8 space-y-1">
            <p className="font-bold text-2xl text-white">30% effort → 150% output.</p>
          </div>

          <div className="text-left bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 space-y-3">
            <p className="flex items-center gap-3 text-white">
              <span className="text-emerald-400">✓</span>
              <span>Teachers freed from busy work</span>
            </p>
            <p className="flex items-center gap-3 text-white">
              <span className="text-emerald-400">✓</span>
              <span>Records more accurate than ever</span>
            </p>
            <p className="flex items-center gap-3 text-white">
              <span className="text-emerald-400">✓</span>
              <span>Parents see real proof of learning</span>
            </p>
            <p className="flex items-center gap-3 text-white">
              <span className="text-emerald-400">✓</span>
              <span>Questions answered before they're asked</span>
            </p>
            <p className="flex items-center gap-3 text-white">
              <span className="text-emerald-400">✓</span>
              <span>Everyone happier.</span>
            </p>
          </div>

          <p className="text-emerald-300 text-lg mb-8 italic">
            What more could you ask for?<br />
            Tell me and I'll make it happen.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/montree/demo/setup"
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              🏫 Set Up My School Now
            </Link>
            <a
              href="https://wa.me/8613811111111"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white/10 border-2 border-white/30 text-white rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all"
            >
              💬 Message Tredoux
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: CLASSROOM VIEW (TILES)
  // ============================================

  if (!selectedStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🐋</span>
                <div>
                  <h1 className="text-xl font-bold">Whale Class</h1>
                  <p className="text-emerald-100 text-sm">{students.length} students</p>
                </div>
              </div>
              
              {showOverlay && (
                <button
                  onClick={skipTutorial}
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Skip Tutorial
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Student Tiles Grid */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {students.map((student, index) => (
              <button
                key={student.id}
                data-student={student.name}
                onClick={() => handleStudentClick(student)}
                className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-center ${
                  step?.target === `[data-student="${student.name}"]` && step?.highlight
                    ? 'ring-4 ring-emerald-400 ring-offset-2 animate-pulse'
                    : ''
                }`}
              >
                {/* Avatar */}
                <div 
                  className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${getGradient(index)} flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3`}
                >
                  {student.photo_url ? (
                    <img src={student.photo_url} alt={student.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    student.name.charAt(0)
                  )}
                </div>
                
                {/* Name */}
                <p className="font-semibold text-gray-800">{student.name}</p>
                
                {/* Progress indicator */}
                {student.progress && (
                  <div className="flex justify-center gap-1 mt-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                      {student.progress.presented}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      {student.progress.practicing}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                      {student.progress.mastered}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </main>

        {/* Tutorial Overlay */}
        {showOverlay && step && (
          <TutorialOverlay
            step={step}
            stepNumber={currentStep + 1}
            totalSteps={TUTORIAL_STEPS.length}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTutorial}
          />
        )}
      </div>
    );
  }

  // ============================================
  // RENDER: STUDENT DETAIL VIEW
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
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
            
            <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center font-bold text-lg">
              {selectedStudent.name.charAt(0)}
            </div>
            
            <div className="flex-1">
              <h1 className="text-xl font-bold">{selectedStudent.name}</h1>
            </div>

            {showOverlay && (
              <button
                onClick={skipTutorial}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Skip
              </button>
            )}
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
                data-tab={tab.id}
                onClick={() => handleTabClick(tab.id as any)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100'
                } ${
                  step?.target === `[data-tab="${tab.id}"]` && step?.highlight
                    ? 'ring-2 ring-emerald-400 animate-pulse'
                    : ''
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
          <WeekTabDemo 
            student={selectedStudent} 
            step={step}
            onNext={nextStep}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressTabDemo 
            student={selectedStudent}
            step={step}
            onNext={nextStep}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsTabDemo 
            student={selectedStudent}
            step={step}
            onNext={nextStep}
          />
        )}
      </main>

      {/* Tutorial Overlay */}
      {showOverlay && step && step.id !== 'conclusion' && (
        <TutorialOverlay
          step={step}
          stepNumber={currentStep + 1}
          totalSteps={TUTORIAL_STEPS.length}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTutorial}
        />
      )}
    </div>
  );
}

// ============================================
// TUTORIAL OVERLAY COMPONENT
// ============================================

function TutorialOverlay({
  step,
  stepNumber,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: {
  step: TutorialStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const positionClasses = {
    top: 'top-24',
    bottom: 'bottom-24',
    center: 'top-1/2 -translate-y-1/2',
  };

  return (
    <div className="fixed inset-x-0 z-50 px-4 pointer-events-none" style={{ [step.position === 'center' ? 'top' : step.position || 'bottom']: step.position === 'center' ? '50%' : '6rem' }}>
      <div className={`max-w-md mx-auto pointer-events-auto ${step.position === 'center' ? '-translate-y-1/2' : ''}`}>
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
            />
          </div>

          <div className="p-5">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl">{step.emoji}</span>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{step.title}</h3>
                <p className="text-xs text-gray-400">Step {stepNumber} of {totalSteps}</p>
              </div>
            </div>

            {/* Message */}
            {step.message && (
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                {step.message}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={onPrev}
                disabled={stepNumber === 1}
                className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>

              {step.nextOn === 'manual' && (
                <button
                  onClick={onNext}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium text-sm shadow-sm hover:shadow-md transition-all"
                >
                  {stepNumber === totalSteps - 1 ? 'Finish' : 'Next →'}
                </button>
              )}

              {step.nextOn === 'click' && (
                <span className="text-xs text-emerald-600 font-medium">
                  👆 Tap the highlighted element
                </span>
              )}

              {step.nextOn === 'auto' && (
                <span className="text-xs text-gray-400">
                  ⏳ Please wait...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// WEEK TAB DEMO (Simplified for tutorial)
// ============================================

function WeekTabDemo({ 
  student, 
  step,
  onNext 
}: { 
  student: Student;
  step: TutorialStep | null;
  onNext: () => void;
}) {
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  // Mock works for demo
  const works = [
    { id: '1', name: 'Pouring Water', area: 'practical_life', status: 'practicing' },
    { id: '2', name: 'Pink Tower', area: 'sensorial', status: 'mastered' },
    { id: '3', name: 'Sandpaper Letters', area: 'language', status: 'presented' },
    { id: '4', name: 'Number Rods', area: 'mathematics', status: 'not_started' },
    { id: '5', name: 'Land & Water Forms', area: 'cultural', status: 'practicing' },
  ];

  const AREA_CONFIG: Record<string, { letter: string; bg: string; color: string }> = {
    practical_life: { letter: 'P', bg: 'bg-pink-100', color: 'text-pink-700' },
    sensorial: { letter: 'S', bg: 'bg-purple-100', color: 'text-purple-700' },
    mathematics: { letter: 'M', bg: 'bg-blue-100', color: 'text-blue-700' },
    language: { letter: 'L', bg: 'bg-green-100', color: 'text-green-700' },
    cultural: { letter: 'C', bg: 'bg-orange-100', color: 'text-orange-700' },
  };

  const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    not_started: { label: '○', bg: 'bg-gray-200', color: 'text-gray-600' },
    presented: { label: 'P', bg: 'bg-amber-200', color: 'text-amber-800' },
    practicing: { label: 'Pr', bg: 'bg-blue-200', color: 'text-blue-800' },
    mastered: { label: 'M', bg: 'bg-green-200', color: 'text-green-800' },
  };

  const handleStatusClick = () => {
    if (step?.id === 'tap-status') {
      onNext();
    }
  };

  const handleWorkClick = (workId: string) => {
    setExpandedWork(expandedWork === workId ? null : workId);
    if (step?.id === 'expand-work') {
      onNext();
    }
  };

  return (
    <div className="space-y-2">
      {/* Week header */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Week 4, 2026</h3>
            <p className="text-sm text-gray-500">{works.length} works assigned</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">40%</div>
            <p className="text-xs text-gray-500">2/5 complete</p>
          </div>
        </div>
      </div>

      {/* Works list */}
      {works.map((work, index) => {
        const area = AREA_CONFIG[work.area];
        const status = STATUS_CONFIG[work.status];
        const isExpanded = expandedWork === work.id;
        const isFirstWork = index === 0;

        return (
          <div 
            key={work.id}
            className={`bg-white rounded-xl shadow-sm overflow-hidden ${
              isExpanded ? 'ring-2 ring-emerald-500' : ''
            }`}
          >
            <div 
              data-work-row={isFirstWork ? true : undefined}
              className={`flex items-center p-3 gap-3 ${
                step?.target === '[data-work-row]' && step?.highlight && isFirstWork
                  ? 'ring-2 ring-inset ring-emerald-400'
                  : ''
              }`}
            >
              {/* Area icon */}
              <div
                data-area-icon={isFirstWork ? true : undefined}
                className={`w-10 h-10 rounded-xl ${area.bg} flex items-center justify-center ${area.color} font-bold ${
                  step?.target === '[data-area-icon]' && step?.highlight && isFirstWork
                    ? 'ring-2 ring-emerald-400 animate-pulse'
                    : ''
                }`}
              >
                {area.letter}
              </div>

              {/* Status badge */}
              <button
                data-status-badge={isFirstWork ? true : undefined}
                onClick={handleStatusClick}
                className={`w-10 h-10 rounded-full ${status.bg} ${status.color} flex items-center justify-center font-bold text-sm ${
                  step?.target === '[data-status-badge]' && step?.highlight && isFirstWork
                    ? 'ring-2 ring-emerald-400 animate-pulse'
                    : ''
                }`}
              >
                {status.label}
              </button>

              {/* Work name */}
              <button 
                onClick={() => handleWorkClick(work.id)}
                className="flex-1 text-left"
              >
                <p className="font-medium text-gray-900">{work.name}</p>
              </button>

              {/* Expand arrow */}
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">📝 Notes</label>
                  <textarea
                    data-notes-input
                    placeholder="Add observation notes..."
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white ${
                      step?.target === '[data-notes-input]' && step?.highlight
                        ? 'ring-2 ring-emerald-400'
                        : ''
                    }`}
                    rows={2}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    data-demo-button
                    className={`flex-1 py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 ${
                      step?.target === '[data-demo-button]' && step?.highlight
                        ? 'ring-2 ring-emerald-400 animate-pulse'
                        : ''
                    }`}
                  >
                    <span>▶️</span>
                    <span>Demo</span>
                  </button>

                  <button
                    data-capture-button
                    className={`flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 ${
                      step?.target === '[data-capture-button]' && step?.highlight
                        ? 'ring-2 ring-white ring-offset-2 animate-pulse'
                        : ''
                    }`}
                  >
                    <span>📸</span>
                    <span>Capture</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// PROGRESS TAB DEMO
// ============================================

function ProgressTabDemo({ 
  student,
  step,
  onNext 
}: { 
  student: Student;
  step: TutorialStep | null;
  onNext: () => void;
}) {
  const areas = [
    { name: 'Practical Life', icon: '🧹', color: 'from-pink-500 to-rose-500', stats: { total: 20, mastered: 8, practicing: 5, presented: 3 } },
    { name: 'Sensorial', icon: '👁️', color: 'from-purple-500 to-violet-500', stats: { total: 15, mastered: 6, practicing: 4, presented: 2 } },
    { name: 'Mathematics', icon: '🔢', color: 'from-blue-500 to-indigo-500', stats: { total: 25, mastered: 3, practicing: 7, presented: 5 } },
    { name: 'Language', icon: '📖', color: 'from-green-500 to-emerald-500', stats: { total: 30, mastered: 10, practicing: 8, presented: 4 } },
    { name: 'Cultural', icon: '🌍', color: 'from-orange-500 to-amber-500', stats: { total: 18, mastered: 4, practicing: 3, presented: 2 } },
  ];

  const overallStats = areas.reduce(
    (acc, area) => ({
      total: acc.total + area.stats.total,
      mastered: acc.mastered + area.stats.mastered,
      practicing: acc.practicing + area.stats.practicing,
      presented: acc.presented + area.stats.presented,
    }),
    { total: 0, mastered: 0, practicing: 0, presented: 0 }
  );

  const progressPercent = Math.round(((overallStats.mastered + overallStats.practicing + overallStats.presented) / overallStats.total) * 100);

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Overall Progress</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{progressPercent}%</div>
            <p className="text-xs text-gray-500">works started</p>
          </div>
        </div>
        
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full flex">
            <div className="bg-green-500" style={{ width: `${(overallStats.mastered / overallStats.total) * 100}%` }} />
            <div className="bg-blue-500" style={{ width: `${(overallStats.practicing / overallStats.total) * 100}%` }} />
            <div className="bg-yellow-400" style={{ width: `${(overallStats.presented / overallStats.total) * 100}%` }} />
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

      {/* Areas */}
      {areas.map(area => {
        const started = area.stats.mastered + area.stats.practicing + area.stats.presented;
        return (
          <div key={area.name} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${area.color} rounded-xl flex items-center justify-center text-2xl shadow`}>
                {area.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{area.name}</h4>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div className="h-full flex">
                    <div className="bg-green-500" style={{ width: `${(area.stats.mastered / area.stats.total) * 100}%` }} />
                    <div className="bg-blue-500" style={{ width: `${(area.stats.practicing / area.stats.total) * 100}%` }} />
                    <div className="bg-yellow-400" style={{ width: `${(area.stats.presented / area.stats.total) * 100}%` }} />
                  </div>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-600">{started}/{area.stats.total}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// REPORTS TAB DEMO
// ============================================

function ReportsTabDemo({ 
  student,
  step,
  onNext 
}: { 
  student: Student;
  step: TutorialStep | null;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Generate Report Card */}
      <div 
        data-generate-report
        className={`bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg text-white ${
          step?.target === '[data-generate-report]' && step?.highlight
            ? 'ring-4 ring-white ring-offset-2 animate-pulse'
            : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
            📄
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Parent Report</h3>
            <p className="text-white/80 text-sm">Jan 20 - Jan 26</p>
          </div>
        </div>

        <button className="mt-4 w-full py-4 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-lg">
          <span>✨</span>
          <span>Generate Report</span>
        </button>
      </div>

      {/* Previous Reports */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold text-gray-900">Previous Reports</h3>
        </div>
        
        <div className="divide-y">
          {[
            { week: 'Jan 13 - 19', status: 'sent' },
            { week: 'Jan 6 - 12', status: 'sent' },
            { week: 'Dec 30 - Jan 5', status: 'sent' },
          ].map((report, i) => (
            <div 
              key={i}
              data-report-card={i === 0 ? true : undefined}
              className={`p-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer ${
                step?.target === '[data-report-card]' && step?.highlight && i === 0
                  ? 'ring-2 ring-inset ring-emerald-400'
                  : ''
              }`}
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                📄
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Week of {report.week}</p>
                <p className="text-sm text-gray-500">Parent Report</p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {report.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
