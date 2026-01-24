// /components/montree/DemoTutorial.tsx
// Session 84: Sticky note tutorial with visual indicators for EVERY step
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Step {
  id: string;
  message: string;
  visual?: React.ReactNode;
}

interface DemoTutorialProps {
  steps: Step[];
  onComplete?: () => void;
}

export default function DemoTutorial({ steps, onComplete }: DemoTutorialProps) {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'zohan';
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  
  useEffect(() => {
    if (isDemo) {
      setShowTutorial(true);
    }
  }, [isDemo]);

  if (!showTutorial || currentStep >= steps.length) {
    return null;
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      setShowTutorial(false);
      onComplete?.();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setShowTutorial(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-amber-100 rounded-2xl shadow-xl border-2 border-amber-200 p-5 relative">
          {/* Folded corner */}
          <div 
            className="absolute top-0 right-0 w-8 h-8 bg-amber-200 rounded-bl-2xl" 
            style={{ 
              clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
              boxShadow: 'inset -2px 2px 4px rgba(0,0,0,0.1)'
            }} 
          />
          
          {/* Visual indicator */}
          {step.visual && (
            <div className="flex justify-center mb-3">
              {step.visual}
            </div>
          )}
          
          {/* Message */}
          <p className="text-gray-800 text-lg leading-relaxed pr-6 font-medium">
            {step.message}
          </p>
          
          {/* Progress & Actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-200">
            <button 
              onClick={handleSkip}
              className="text-amber-600 hover:text-amber-800 text-sm font-medium"
            >
              Skip tutorial
            </button>
            
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button 
                  onClick={handleBack}
                  className="px-3 py-2 text-amber-600 hover:text-amber-800 font-medium text-sm"
                >
                  ← Back
                </button>
              )}
              
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i <= currentStep ? 'bg-amber-500' : 'bg-amber-300'
                    }`}
                  />
                ))}
              </div>
              
              <button 
                onClick={handleNext}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {isLastStep ? 'Done! ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// VISUAL COMPONENTS - What to tap/click
// ============================================

const StudentCardVisual = () => (
  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
    <span className="text-xs text-gray-500">Tap:</span>
    <div className="flex flex-col items-center p-2 bg-gray-50 rounded-xl">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold">R</div>
      <span className="text-xs text-gray-600 mt-1">Rachel</span>
    </div>
  </div>
);

const WorkRowsVisual = () => (
  <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
    <div className="flex items-center gap-2 text-sm">
      <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs">C</div>
      <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold text-xs">M</div>
      <span className="text-gray-700 text-xs">Globe - Land and Water</span>
    </div>
    <div className="flex items-center gap-2 text-sm mt-1 opacity-60">
      <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs">C</div>
      <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-xs">Pr</div>
      <span className="text-gray-700 text-xs">Color Mixing</span>
    </div>
  </div>
);

const StatusBadgeVisual = () => (
  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
    <span className="text-xs text-gray-500">Tap:</span>
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">○</div>
    <span className="text-gray-400">→</span>
    <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-sm">P</div>
    <span className="text-gray-400">→</span>
    <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold text-sm">Pr</div>
    <span className="text-gray-400">→</span>
    <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold text-sm">M</div>
  </div>
);

const WorkRowVisual = () => (
  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
    <span className="text-xs text-gray-500">Tap:</span>
    <div className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1">
      <span className="font-medium text-gray-800 text-sm">Globe - Land and Water</span>
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

const NotesVisual = () => (
  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
    <span className="text-xs text-gray-500">Type in:</span>
    <div className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 border border-gray-200">
      <span className="text-base">📝</span>
      <span className="text-gray-400 text-sm">Notes</span>
    </div>
  </div>
);

const DemoButtonVisual = () => (
  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
    <span className="text-xs text-gray-500">Tap:</span>
    <div className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl text-sm flex items-center gap-2">
      <span>▶️</span>
      <span>Demo</span>
    </div>
  </div>
);

const CaptureButtonVisual = () => (
  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
    <span className="text-xs text-gray-500">Tap:</span>
    <div className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl text-sm flex items-center gap-2">
      <span>📸</span>
      <span>Capture</span>
    </div>
  </div>
);

const AreaLetterVisual = () => (
  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
    <span className="text-xs text-gray-500">Hold:</span>
    <div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-sm">P</div>
    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">S</div>
    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">M</div>
    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">L</div>
    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">C</div>
  </div>
);

const ProgressTabVisual = () => (
  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
    <span className="text-xs text-gray-500">Tap:</span>
    <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center gap-1 font-medium">
      <span>📊</span>
      <span>Progress</span>
    </div>
  </div>
);

const ReportsTabVisual = () => (
  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm">
    <span className="text-xs text-gray-500">Tap:</span>
    <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm flex items-center gap-1 font-medium">
      <span>📄</span>
      <span>Reports</span>
    </div>
  </div>
);

const DoneVisual = () => (
  <div className="flex items-center justify-center bg-white rounded-lg px-4 py-3 shadow-sm">
    <span className="text-3xl">🏆</span>
  </div>
);

// ============================================
// PRE-DEFINED STEP SETS
// ============================================

export const CLASSROOM_STEPS: Step[] = [
  { 
    id: 'welcome', 
    message: "👋 Welcome! This is your classroom. Each card is a student.",
  },
  { 
    id: 'select-student', 
    message: "Tap a student's card to see their weekly work.",
    visual: <StudentCardVisual />
  },
];

export const STUDENT_STEPS: Step[] = [
  { 
    id: 'works-intro', 
    message: "Each row is one activity assigned this week.",
    visual: <WorkRowsVisual />
  },
  { 
    id: 'status-tap', 
    message: 'Tap the status badge to cycle progress.',
    visual: <StatusBadgeVisual />
  },
  { 
    id: 'expand-work', 
    message: 'Tap a work name to expand options.',
    visual: <WorkRowVisual />
  },
  { 
    id: 'notes', 
    message: "Add observation notes for your records.",
    visual: <NotesVisual />
  },
  { 
    id: 'demo-video', 
    message: 'Tap Demo to watch the Montessori presentation.',
    visual: <DemoButtonVisual />
  },
  { 
    id: 'camera', 
    message: "Try taking a picture - see it in the report!",
    visual: <CaptureButtonVisual />
  },
  { 
    id: 'wheel', 
    message: 'Hold a colored letter to browse all works in that area.',
    visual: <AreaLetterVisual />
  },
  { 
    id: 'progress-tab', 
    message: 'See mastery across the entire curriculum.',
    visual: <ProgressTabVisual />
  },
  { 
    id: 'reports', 
    message: 'Generate beautiful parent reports with one tap!',
    visual: <ReportsTabVisual />
  },
  { 
    id: 'done', 
    message: '30% effort → 100% output. You\'re ready!',
    visual: <DoneVisual />
  },
];
