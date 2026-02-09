// components/home/HomeTutorial.tsx
// Parent onboarding tutorial with sticky-note style steps
// Guided walkthrough of dashboard, status tracking, and curriculum

'use client';

import React from 'react';

interface HomeTutorialProps {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

const TUTORIAL_STEPS = [
  {
    step: 1,
    title: 'Welcome to Montree Home! 👋',
    message:
      "This is your dashboard. Here you'll see your child's current focus work across all learning areas.",
    emoji: '🏠',
  },
  {
    step: 2,
    title: 'Tap Any Card',
    message:
      'Tap a card to see more details about the work, materials needed, and helpful tips for presenting at home.',
    emoji: '👆',
  },
  {
    step: 3,
    title: 'Track Progress',
    message:
      'Tap the status badge to cycle through: Not Started → Presented → Practicing → Mastered.',
    emoji: '📊',
  },
  {
    step: 4,
    title: 'Change Focus Work',
    message:
      'Long-press (hold) the area emoji to switch to a different work in that area. Perfect for following your child\'s interests!',
    emoji: '🔄',
  },
  {
    step: 5,
    title: 'Explore the Curriculum',
    message:
      'Visit the Curriculum tab to see all 66 Montessori activities and find inspiration for extended work at home.',
    emoji: '📚',
  },
];

export default function HomeTutorial({
  step,
  totalSteps,
  onNext,
  onSkip,
}: HomeTutorialProps) {
  const currentStep = TUTORIAL_STEPS[step - 1] || TUTORIAL_STEPS[0];

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        {/* Sticky note style bubble */}
        <div className="bg-amber-50 rounded-2xl shadow-xl border-2 border-amber-200 p-5 relative">
          {/* Folded corner effect */}
          <div
            className="absolute top-0 right-0 w-8 h-8 bg-amber-200 rounded-bl-2xl"
            style={{
              clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
              boxShadow: 'inset -2px 2px 4px rgba(0,0,0,0.1)',
            }}
          />

          {/* Step number indicator */}
          <div className="absolute top-4 left-4 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
            {step}
          </div>

          {/* Emoji */}
          <div className="text-4xl mb-3 text-center">{currentStep.emoji}</div>

          {/* Message */}
          <h3 className="text-lg font-bold text-amber-900 mb-2 text-center">
            {currentStep.title}
          </h3>
          <p className="text-amber-900 text-base leading-relaxed text-center pr-2">
            {currentStep.message}
          </p>

          {/* Progress & Actions */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t-2 border-amber-200">
            <button
              onClick={onSkip}
              className="text-amber-600 hover:text-amber-800 text-sm font-medium"
            >
              Skip
            </button>

            <div className="flex items-center gap-3">
              {/* Progress dots */}
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < step ? 'bg-amber-500' : 'bg-amber-300'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={onNext}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {step === totalSteps ? 'Done ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </div>

        {/* Speech bubble tail */}
        <div className="flex justify-center -mt-1">
          <div
            className="w-6 h-6 bg-amber-50 border-l-2 border-b-2 border-amber-200 rotate-[-45deg]"
            style={{ marginTop: '-12px' }}
          />
        </div>
      </div>
    </div>
  );
}
