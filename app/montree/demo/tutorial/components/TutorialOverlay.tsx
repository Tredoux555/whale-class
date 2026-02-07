'use client';

import { TutorialStep } from '../types';

export function TutorialOverlay({
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
