'use client';

import { useState, useEffect, useCallback } from 'react';
import { OnboardingStep } from '@/lib/montree/onboarding/configs';

interface OnboardingOverlayProps {
  step: OnboardingStep;
  currentStepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  onDismiss: () => void;
  isActive: boolean;
}

export default function OnboardingOverlay({
  step,
  currentStepNumber,
  totalSteps,
  onNext,
  onSkip,
  onDismiss,
  isActive,
}: OnboardingOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetRect = useCallback(() => {
    if (!isActive) return;

    const targetEl = document.querySelector(step.targetSelector);
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll target into view if off-screen
      const isVisible =
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight;
      if (!isVisible) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetRect(null);
    }
  }, [isActive, step.targetSelector]);

  useEffect(() => {
    if (!isActive) return;

    // Initial measurement (slight delay for DOM to settle)
    const initTimer = setTimeout(updateTargetRect, 100);

    // Re-measure on scroll/resize
    window.addEventListener('scroll', updateTargetRect, { passive: true });
    window.addEventListener('resize', updateTargetRect, { passive: true });

    // ESC to dismiss
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('scroll', updateTargetRect);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, updateTargetRect, onDismiss]);

  if (!isActive || !targetRect) return null;

  // Calculate modal position based on step.position (where modal sits relative to target)
  const modalPos = calculateModalPosition(targetRect, step.position);

  // Clamp modal to viewport
  const clampedX = Math.max(16, Math.min(modalPos.x, window.innerWidth - 336));
  const clampedY = Math.max(16, Math.min(modalPos.y, window.innerHeight - 220));

  return (
    <>
      {/* Backdrop with spotlight cutout */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onDismiss}
        aria-hidden="true"
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="onboarding-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.65)"
            mask="url(#onboarding-spotlight-mask)"
          />
        </svg>
      </div>

      {/* Target highlight ring */}
      <div
        className="fixed z-[9997] pointer-events-none rounded-xl"
        style={{
          left: `${targetRect.left - 6}px`,
          top: `${targetRect.top - 6}px`,
          width: `${targetRect.width + 12}px`,
          height: `${targetRect.height + 12}px`,
          boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.7), 0 0 20px rgba(16, 185, 129, 0.3)',
        }}
      />

      {/* Tutorial Modal */}
      <div
        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl p-5 w-80"
        style={{
          left: `${clampedX}px`,
          top: `${clampedY}px`,
          animation: 'onboarding-fade-in 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            Step {currentStepNumber} of {totalSteps}
          </span>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
            aria-label="Close tutorial"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-800 mb-1.5">{step.title}</h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">{step.description}</p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Skip Tour
          </button>
          <button
            onClick={onNext}
            className="flex-1 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
          >
            {currentStepNumber === totalSteps ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Animation keyframe (inline style tag — works in all React/Next.js setups) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes onboarding-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </>
  );
}

function calculateModalPosition(
  targetRect: DOMRect,
  position: 'top' | 'bottom' | 'left' | 'right'
): { x: number; y: number } {
  const OFFSET = 20;
  const MODAL_WIDTH = 320;
  const MODAL_HEIGHT = 200;

  switch (position) {
    case 'bottom':
      return {
        x: targetRect.left + targetRect.width / 2 - MODAL_WIDTH / 2,
        y: targetRect.bottom + OFFSET,
      };
    case 'top':
      return {
        x: targetRect.left + targetRect.width / 2 - MODAL_WIDTH / 2,
        y: targetRect.top - MODAL_HEIGHT - OFFSET,
      };
    case 'right':
      return {
        x: targetRect.right + OFFSET,
        y: targetRect.top + targetRect.height / 2 - MODAL_HEIGHT / 2,
      };
    case 'left':
      return {
        x: targetRect.left - MODAL_WIDTH - OFFSET,
        y: targetRect.top + targetRect.height / 2 - MODAL_HEIGHT / 2,
      };
  }
}
