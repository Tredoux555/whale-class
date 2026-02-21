// PrincipalSetupGuide.tsx
// 8-step onboarding guide for the principal school setup wizard.
// Spans all 3 wizard steps: classrooms → teachers → success.
// Same speech-bubble + green-pulsating-border pattern as WeekViewGuide.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PrincipalSetupGuideProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  wizardStep: number; // 1 = classrooms, 2 = teachers, 3 = success
  hasClassrooms: boolean; // whether at least one classroom has been added
  hasTeachers: boolean; // whether teacher codes exist (step 3)
}

const BUBBLE_COLOR = '#34d399';
const BUBBLE_WIDTH = 300;
const POINTER_SIZE = 12;

interface StepConfig {
  key: string;
  target: string | null;
  message: string;
  buttonText: string;
  showGPB: boolean;
  delayMs?: number;
  wizardStep: number; // which wizard step this guide step belongs to
}

export default function PrincipalSetupGuide({
  isVisible,
  onComplete,
  onSkip,
  wizardStep,
  hasClassrooms,
  hasTeachers,
}: PrincipalSetupGuideProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const steps: StepConfig[] = [
    // === Wizard Step 1: Classrooms ===
    {
      key: 'welcome-setup',
      target: null,
      message: "Let's set up your school! Add your classrooms first — you can always add more later.",
      buttonText: "Let's go!",
      showGPB: false,
      wizardStep: 1,
    },
    {
      key: 'add-classroom',
      target: '[data-guide="add-classroom-btn"]',
      message: 'Tap here to add a classroom. Give it a name, pick an icon and a colour!',
      buttonText: 'Got it!',
      showGPB: true,
      wizardStep: 1,
    },
    {
      key: 'continue-teachers',
      target: '[data-guide="continue-teachers-btn"]',
      message: "Once you've added your classrooms, tap here to assign teachers.",
      buttonText: 'Got it!',
      showGPB: true,
      wizardStep: 1,
    },
    // === Wizard Step 2: Teachers ===
    {
      key: 'teachers-intro',
      target: null,
      message: 'Now assign a teacher to each classroom.',
      buttonText: 'Got it!',
      showGPB: false,
      wizardStep: 2,
    },
    {
      key: 'teacher-name',
      target: '[data-guide="teacher-name-first"]',
      message: "Type their name — email is optional.",
      buttonText: 'Got it!',
      showGPB: true,
      delayMs: 400,
      wizardStep: 2,
    },
    {
      key: 'complete-setup',
      target: '[data-guide="complete-setup-btn"]',
      message: "Ready? Tap here and we'll create everything — classrooms, 329 Montessori activities, and login codes for every teacher.",
      buttonText: 'Got it!',
      showGPB: true,
      wizardStep: 2,
    },
    // === Wizard Step 3: Success ===
    {
      key: 'setup-complete',
      target: '[data-guide="setup-overview"]',
      message: "You're live! Copy these codes and share them in your teachers' group chat.",
      buttonText: 'Amazing!',
      showGPB: true,
      delayMs: 600,
      wizardStep: 3,
    },
    {
      key: 'go-dashboard',
      target: '[data-guide="go-dashboard-btn"]',
      message: "Let's head to your dashboard — I'll show you around.",
      buttonText: "Let's go!",
      showGPB: true,
      wizardStep: 3,
    },
  ];

  // When wizardStep changes, jump to the first guide step for that wizard step
  const prevWizardStep = useRef(wizardStep);
  useEffect(() => {
    if (wizardStep !== prevWizardStep.current) {
      prevWizardStep.current = wizardStep;
      const firstStepForWizard = steps.findIndex(s => s.wizardStep === wizardStep);
      if (firstStepForWizard >= 0) {
        setStep(firstStepForWizard);
      }
    }
  }, [wizardStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = steps[step];

  const measure = useCallback(() => {
    if (!currentStep) return;
    if (!currentStep.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isVisible || !mounted) return;
    const delay = currentStep?.delayMs || 300;
    const timer = setTimeout(measure, delay);
    window.addEventListener('scroll', measure, { capture: true, passive: true });
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', measure, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', measure);
    };
  }, [measure, isVisible, mounted, step, currentStep]);

  // --- Draggable speech bubble ---
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; bx: number; by: number }>({ x: 0, y: 0, bx: 0, by: 0 });

  useEffect(() => {
    setDragOffset(null);
  }, [step]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, bx: dragOffset?.x || 0, by: dragOffset?.y || 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [dragOffset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setDragOffset({
      x: dragStart.current.bx + (e.clientX - dragStart.current.x),
      y: dragStart.current.by + (e.clientY - dragStart.current.y),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  if (!isVisible || !mounted || !currentStep) return null;

  // Don't show steps that belong to a different wizard step
  if (currentStep.wizardStep !== wizardStep) return null;

  const isCentered = !currentStep.target;
  if (!isCentered && !targetRect) return null;

  const handleNext = () => {
    if (step < steps.length - 1) {
      const nextStep = steps[step + 1];
      // If the next step belongs to a different wizard step, pause the guide
      // (it will resume when wizardStep changes)
      if (nextStep.wizardStep !== wizardStep) {
        // Guide pauses until wizard step advances
        setStep(step + 1);
        return;
      }
      setTargetRect(null);
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      const prevStep = steps[step - 1];
      // Don't go back to a previous wizard step's guide steps
      if (prevStep.wizardStep !== wizardStep) return;
      setTargetRect(null);
      setStep(step - 1);
    }
  };

  // Find first step index for current wizard step (for back button logic)
  const firstStepForCurrentWizard = steps.findIndex(s => s.wizardStep === wizardStep);
  const canGoBack = step > firstStepForCurrentWizard;

  const gpbZ = 9997;
  const bubbleZ = 9999;

  let bubbleY: number;
  let bubbleX: number;
  let pointerLeft: number;
  let placeAbove = false;

  if (isCentered) {
    bubbleX = (window.innerWidth - BUBBLE_WIDTH) / 2;
    bubbleY = window.innerHeight / 2 - 60;
    pointerLeft = 0;
  } else if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;
    placeAbove = spaceBelow < 200 && spaceAbove > 200;

    bubbleY = placeAbove
      ? targetRect.top - POINTER_SIZE - 160
      : targetRect.bottom + POINTER_SIZE + 12;

    bubbleX = Math.max(12, Math.min(
      targetRect.left + targetRect.width / 2 - BUBBLE_WIDTH / 2,
      window.innerWidth - BUBBLE_WIDTH - 12
    ));

    pointerLeft = Math.min(
      Math.max(targetRect.left + targetRect.width / 2 - bubbleX - POINTER_SIZE / 2, 16),
      BUBBLE_WIDTH - 32
    );
  } else {
    return null;
  }

  // Filter steps for current wizard step for dot indicators
  const currentWizardSteps = steps.filter(s => s.wizardStep === wizardStep);
  const currentWizardStepIndex = currentWizardSteps.findIndex(s => s.key === currentStep.key);

  return createPortal(
    <>
      {/* Pulsating green border around target */}
      {currentStep.showGPB && targetRect && (
        <div
          className="psg-pulse-border"
          style={{
            position: 'fixed',
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: 16,
            pointerEvents: 'none',
            zIndex: gpbZ,
          }}
        />
      )}

      {/* Speech bubble — draggable */}
      <div
        style={{
          position: 'fixed',
          left: bubbleX + (dragOffset?.x || 0),
          top: bubbleY + (dragOffset?.y || 0),
          width: BUBBLE_WIDTH,
          zIndex: bubbleZ,
          backgroundColor: BUBBLE_COLOR,
          color: 'white',
          borderRadius: 16,
          padding: '16px 18px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          cursor: isDragging.current ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Triangle pointer (only for targeted steps) */}
        {!isCentered && (
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              left: pointerLeft,
              ...(placeAbove
                ? {
                    bottom: -POINTER_SIZE,
                    borderLeft: `${POINTER_SIZE}px solid transparent`,
                    borderRight: `${POINTER_SIZE}px solid transparent`,
                    borderTop: `${POINTER_SIZE}px solid ${BUBBLE_COLOR}`,
                  }
                : {
                    top: -POINTER_SIZE,
                    borderLeft: `${POINTER_SIZE}px solid transparent`,
                    borderRight: `${POINTER_SIZE}px solid transparent`,
                    borderBottom: `${POINTER_SIZE}px solid ${BUBBLE_COLOR}`,
                  }),
            }}
          />
        )}

        {/* Message */}
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
          {currentStep.message}
        </p>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          {canGoBack ? (
            <button
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 13,
                cursor: 'pointer',
                padding: 0,
                fontWeight: 500,
              }}
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Skip tour
          </button>

          <button
            onClick={handleNext}
            style={{
              background: 'white',
              color: '#059669',
              border: 'none',
              borderRadius: 8,
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {currentStep.buttonText} →
          </button>
        </div>

        {/* Step dots (scoped to current wizard step) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10 }}>
          {currentWizardSteps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: i === currentWizardStepIndex ? 'white' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Pulsating animation */}
      <style>{`
        @keyframes psg-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6), inset 0 0 0 3px rgba(52, 211, 153, 0.8);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(52, 211, 153, 0), inset 0 0 0 3px rgba(52, 211, 153, 0.8);
          }
        }
        .psg-pulse-border {
          animation: psg-pulse 1.8s ease-in-out infinite;
        }
      `}</style>
    </>,
    document.body
  );
}
