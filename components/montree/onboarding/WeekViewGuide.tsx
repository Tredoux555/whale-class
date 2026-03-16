// WeekViewGuide.tsx
// 20-step onboarding guide for the child week view + full platform tour.
// Each step can have onAdvance (fires going forward) and onReverse (fires going backward).
// This ensures Back button properly undoes actions like opening/closing modals.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/lib/montree/i18n';

interface WeekViewGuideProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  isHomeschoolParent: boolean;
  onExpandFirstWork: () => void;
  onCollapseFirstWork: () => void;
  onOpenQuickGuide: () => void;
  onCloseQuickGuide: () => void;
  onOpenYouTube: () => void;
  onOpenFullDetails: () => void;
  onCloseFullDetails: () => void;
  onOpenCapture: () => void;
  onOpenWheelPicker: () => void;
  onCloseWheelPicker: () => void;
  onNavigateHome: () => void;
}

// Fresh, upbeat green
const BUBBLE_COLOR = '#34d399';
const BUBBLE_WIDTH = 300;
const POINTER_SIZE = 12;

interface StepConfig {
  key: string;
  target: string | null;
  message: string;
  buttonText: string;
  onAdvance?: () => void;
  onReverse?: () => void; // fires when going BACK from the NEXT step to THIS step
  showGPB: boolean;
  delayMs?: number;
  insideModal?: boolean;
}

export default function WeekViewGuide({
  isVisible,
  onComplete,
  onSkip,
  isHomeschoolParent: isParent,
  onExpandFirstWork,
  onCollapseFirstWork,
  onOpenQuickGuide,
  onCloseQuickGuide,
  onOpenYouTube,
  onOpenFullDetails,
  onCloseFullDetails,
  onOpenCapture,
  onOpenWheelPicker,
  onCloseWheelPicker,
  onNavigateHome,
}: WeekViewGuideProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const label = isParent ? 'child' : 'student';

  const steps: StepConfig[] = [
    // Step 0: Focus block overview
    {
      key: 'focus-block',
      target: '[data-tutorial="focus-section"]',
      message: t('guide.weekView.focusBlock'),
      buttonText: t('guide.weekView.letsGo'),
      onAdvance: onExpandFirstWork,
      showGPB: true,
    },
    // Step 1: Work name (expanded)
    {
      key: 'work-name',
      target: '[data-guide="first-work-name"]',
      message: t('guide.weekView.workName'),
      buttonText: t('guide.common.gotIt'),
      onReverse: onCollapseFirstWork,
      showGPB: true,
      delayMs: 400,
    },
    // Step 2: Quick Guide button
    {
      key: 'quick-guide-btn',
      target: '[data-guide="quick-guide-btn"]',
      message: t('guide.weekView.quickGuideBtn'),
      buttonText: t('guide.common.gotIt'),
      onAdvance: onOpenQuickGuide,
      showGPB: true,
    },
    // Step 3: Quick Guide modal content
    {
      key: 'quick-guide-content',
      target: '[data-guide="quick-guide-content"]',
      message: t('guide.weekView.quickGuideContent'),
      buttonText: t('guide.common.gotIt'),
      onReverse: onCloseQuickGuide,
      showGPB: false,
      delayMs: 500,
      insideModal: true,
    },
    // Step 4: Watch Video button
    {
      key: 'watch-video',
      target: '[data-guide="watch-video-btn"]',
      message: t('guide.weekView.watchVideo'),
      buttonText: t('guide.common.gotIt'),
      onAdvance: onCloseQuickGuide,
      showGPB: true,
      insideModal: true,
    },
    // Step 5: Capture button
    {
      key: 'capture',
      target: '[data-guide="capture-btn"]',
      message: t('guide.weekView.capture'),
      buttonText: t('guide.common.gotIt'),
      showGPB: true,
      delayMs: 400,
    },
    // Step 6: Capture explanation
    {
      key: 'capture-info',
      target: null,
      message: t('guide.weekView.captureInfo'),
      buttonText: t('guide.common.gotIt'),
      showGPB: false,
      delayMs: 300,
    },
    // Step 7: Area badge (wheel picker)
    {
      key: 'area-badge',
      target: '[data-guide="area-badge-first"]',
      message: t('guide.weekView.areaBadge'),
      buttonText: t('guide.common.gotIt'),
      showGPB: true,
    },
    // Step 8: Notes area
    {
      key: 'notes',
      target: '[data-guide="notes-area"]',
      message: t('guide.weekView.notes'),
      buttonText: t('guide.common.gotIt'),
      showGPB: true,
    },
    // Step 9: Status badge
    {
      key: 'status-badge',
      target: '[data-tutorial="status-badge-first"]',
      message: t('guide.weekView.statusBadge'),
      buttonText: t('guide.common.gotIt'),
      showGPB: true,
    },
    // Step 10: Progress tab (consolidated — includes gallery + progress + reports)
    {
      key: 'tab-progress',
      target: '[data-guide="tab-progress"]',
      message: t('guide.weekView.tabProgress'),
      buttonText: t('guide.common.gotIt'),
      showGPB: true,
    },
    // Step 11: Guru (header nav)
    {
      key: 'nav-guru',
      target: '[data-guide="nav-guru"]',
      message: t('guide.weekView.navGuru'),
      buttonText: t('guide.common.gotIt'),
      showGPB: true,
    },
    // Step 14: Curriculum (header nav)
    {
      key: 'nav-curriculum',
      target: '[data-guide="nav-curriculum"]',
      message: t('guide.weekView.navCurriculum'),
      buttonText: t('guide.common.gotIt'),
      showGPB: true,
    },
    // Step 15: Inbox (envelope icon)
    {
      key: 'nav-inbox',
      target: '[data-guide="nav-inbox"]',
      message: t('guide.weekView.navInbox'),
      buttonText: t('guide.common.gotIt'),
      showGPB: true,
    },
    // Step 16: Feedback button
    {
      key: 'feedback-btn',
      target: '[data-guide="feedback-btn"]',
      message: t('guide.weekView.feedbackBtn'),
      buttonText: t('guide.common.gotIt'),
      showGPB: true,
    },
    // Step 17: Student faces intro
    {
      key: 'student-faces-intro',
      target: null,
      message: t('guide.weekView.studentFacesIntro'),
      buttonText: t('guide.weekView.showMe'),
      showGPB: false,
    },
    // Step 18: Home link — navigate to classroom and explain faces + labels
    {
      key: 'nav-home',
      target: '[data-guide="nav-home"]',
      message: t('guide.weekView.navHome'),
      buttonText: t('guide.weekView.done'),
      onAdvance: onNavigateHome,
      showGPB: true,
    },
  ];

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

  // Reset drag offset when step changes
  useEffect(() => {
    setDragOffset(null);
  }, [step]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from the bubble header area (not buttons)
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

  const isCentered = !currentStep.target;
  if (!isCentered && !targetRect) return null;

  const handleNext = () => {
    if (currentStep.onAdvance) {
      currentStep.onAdvance();
    }
    if (step < steps.length - 1) {
      setTargetRect(null);
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      // Fire the CURRENT step's onReverse to undo its setup
      if (currentStep.onReverse) {
        currentStep.onReverse();
      }
      setTargetRect(null);
      setStep(step - 1);
    }
  };

  // Z-index: modal steps render well above modal backdrop (z-50 = 50)
  // Using very high values to guarantee visibility above any modal/backdrop-blur stacking contexts
  const gpbZ = currentStep.insideModal ? 99998 : 9997;
  const bubbleZ = currentStep.insideModal ? 99999 : 9999;

  // Calculate bubble position
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

  return createPortal(
    <>
      {/* For centered insideModal steps, add a subtle backdrop to ensure bubble visibility */}
      {isCentered && currentStep.insideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: bubbleZ - 1,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Pulsating green border around target */}
      {currentStep.showGPB && targetRect && (
        <div
          className="wvg-pulse-border"
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

        {/* Navigation: ← Back | Skip tour | Button → */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          {step > 0 ? (
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
              ← {t('guide.common.back')}
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
            {t('guide.common.skipTour')}
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

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: i === step ? 'white' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Pulsating animation */}
      <style>{`
        @keyframes wvg-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6), inset 0 0 0 3px rgba(52, 211, 153, 0.8);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(52, 211, 153, 0), inset 0 0 0 3px rgba(52, 211, 153, 0.8);
          }
        }
        .wvg-pulse-border {
          animation: wvg-pulse 1.8s ease-in-out infinite;
        }
      `}</style>
    </>,
    document.body
  );
}
