// /montree/demo/tutorial/page.tsx
// Interactive Tutorial - walks through the REAL system
// Session 80: Zohan Demo Experience
// Session 81: Fixed Suspense boundary for Next.js 16.1
// Session 82: Refactored into focused components
// Uses REAL data, REAL APIs - the only "demo" part is the guided overlay

'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Student, TutorialStep } from './types';
import { TUTORIAL_STEPS, DEMO_STUDENTS } from './data';
import { TutorialOverlay } from './components/TutorialOverlay';
import { ClassroomView } from './components/ClassroomView';
import { StudentDetailView } from './components/StudentDetailView';
import { ConclusionView } from './components/ConclusionView';

// ============================================
// MAIN COMPONENT
// ============================================

function TutorialContent() {
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
  // FETCH STUDENTS (with demo fallback)
  // ============================================

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch('/api/montree/children');
        const data = await res.json();
        const children = data.children || [];
        // Use demo students if no real data
        setStudents(children.length > 0 ? children : DEMO_STUDENTS);
      } catch (err) {
        console.error('Failed to fetch students:', err);
        // Fallback to demo students on error
        setStudents(DEMO_STUDENTS);
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
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
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
            <span className="text-3xl">🌳</span>
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
    return <ConclusionView viewerName={viewerName} />;
  }

  // ============================================
  // RENDER: CLASSROOM VIEW (TILES)
  // ============================================

  if (!selectedStudent) {
    return (
      <div>
        <ClassroomView
          students={students}
          step={step}
          onStudentClick={handleStudentClick}
          onSkipTutorial={skipTutorial}
          showOverlay={showOverlay}
        />

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
    <div>
      <StudentDetailView
        selectedStudent={selectedStudent}
        step={step}
        activeTab={activeTab}
        onTabClick={handleTabClick}
        onBack={() => setSelectedStudent(null)}
        onSkipTutorial={skipTutorial}
        showOverlay={showOverlay}
        onNext={nextStep}
      />

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

// Wrap with Suspense for useSearchParams
export default function TutorialPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-3xl">🌳</span>
            </div>
            <p className="text-slate-500">Loading tutorial...</p>
          </div>
        </div>
      }
    >
      <TutorialContent />
    </Suspense>
  );
}
