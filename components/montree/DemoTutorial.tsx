// /components/montree/DemoTutorial.tsx
// Session 84: Self-contained demo tutorial that wraps useSearchParams
// Just drop this component anywhere to add demo mode support

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Step {
  id: string;
  message: string;
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
  
  // Initialize on client after hydration
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

  const handleNext = () => {
    if (isLastStep) {
      setShowTutorial(false);
      onComplete?.();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setShowTutorial(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {/* Sticky note style bubble */}
        <div className="bg-amber-100 rounded-2xl shadow-xl border-2 border-amber-200 p-5 relative">
          {/* Folded corner effect */}
          <div 
            className="absolute top-0 right-0 w-8 h-8 bg-amber-200 rounded-bl-2xl" 
            style={{ 
              clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
              boxShadow: 'inset -2px 2px 4px rgba(0,0,0,0.1)'
            }} 
          />
          
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
            
            <div className="flex items-center gap-3">
              {/* Progress dots */}
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

// Pre-defined step sets for easy use
export const CLASSROOM_STEPS: Step[] = [
  { id: 'welcome', message: "👋 Welcome! This is your classroom. Each card is a student." },
  { id: 'select-student', message: "👆 Tap a student's card to see their weekly work." },
];

export const STUDENT_STEPS: Step[] = [
  { id: 'works-intro', message: "📋 Here are this week's assigned works. Each row is one activity." },
  { id: 'status-tap', message: '🎯 Tap the status badge (○/P/Pr/M) to cycle through progress levels.' },
  { id: 'expand-work', message: '📖 Tap a work name to expand it and see more options.' },
  { id: 'notes', message: "✏️ Add notes - they'll appear in parent reports!" },
  { id: 'demo-video', message: '▶️ Tap Demo to see the Montessori presentation on YouTube.' },
  { id: 'camera', message: "📸 Capture photos - they go straight to the child's portfolio!" },
  { id: 'wheel', message: '😮 Hold the colored area letter to browse ALL works in that area.' },
  { id: 'progress-tab', message: '📊 The Progress tab shows mastery across the entire curriculum.' },
  { id: 'reports', message: '📄 Generate beautiful parent reports with one tap!' },
  { id: 'done', message: '🏆 30% effort → 150% output. Teachers freed, parents delighted.' },
];
