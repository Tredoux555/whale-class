// PrincipalAdminGuide.tsx
// Multi-page guide for the principal admin dashboard.
// Renders in admin layout, persists step in localStorage so it survives page navigations.
// Steps span: /montree/admin (overview) → /montree/admin/classrooms/[id] (detail) → guru tab → farewell.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';

interface PrincipalAdminGuideProps {
  principalName?: string;
}

const STORAGE_KEY = 'montree_guide_admin_step';
const DONE_KEY = 'montree_guide_admin_done';
const BUBBLE_COLOR = '#34d399';
const BUBBLE_WIDTH = 300;
const POINTER_SIZE = 12;

interface StepConfig {
  key: string;
  target: string | null; // CSS selector or null for centered
  message: string;
  buttonText: string;
  showGPB: boolean;
  delayMs?: number;
  page: 'overview' | 'classroom' | 'any'; // which page this step appears on
  onAdvance?: 'navigate-first-classroom' | 'navigate-back' | 'navigate-guru' | 'complete';
}

export default function PrincipalAdminGuide({ principalName }: PrincipalAdminGuideProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [step, setStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const firstName = principalName ? principalName.split(' ')[0] : '';

  const steps: StepConfig[] = [
    // === Step 0: Overview intro ===
    {
      key: 'overview-intro',
      target: '[data-guide="first-classroom"]',
      message: 'This is an overview of your school. Tap on a classroom to look inside.',
      buttonText: 'Got it!',
      showGPB: true,
      page: 'overview',
      onAdvance: 'navigate-first-classroom',
    },
    // === Step 1: Classroom detail — students ===
    {
      key: 'classroom-students',
      target: '[data-guide="first-student"]',
      message: 'Tap on a student to see their overview and generate a report for the parent.',
      buttonText: 'Got it!',
      showGPB: true,
      page: 'classroom',
      delayMs: 500,
      onAdvance: 'navigate-back',
    },
    // === Step 2: Guru tab ===
    {
      key: 'guru-tab',
      target: '[data-guide="nav-guru"]',
      message: 'Ask the Guru anything a parent might ask you. It looks through the child\'s history, progress, and teacher notes — and gives you the best parent-friendly answer on the spot.',
      buttonText: 'Got it!',
      showGPB: true,
      page: 'overview',
      delayMs: 400,
    },
    // === Step 3: Farewell ===
    {
      key: 'farewell',
      target: null,
      message: `That's it${firstName ? `, Principal ${firstName}` : ''}! I left all the technical stuff to the teachers and gave you just what you need. Best of luck with your upgrade — don't hesitate to reach out if you have any questions or requests!`,
      buttonText: 'Done!',
      showGPB: false,
      page: 'any',
      onAdvance: 'complete',
    },
  ];

  // Determine which page we're on
  const currentPageType = (): 'overview' | 'classroom' | 'student' | 'guru' | 'other' => {
    if (pathname === '/montree/admin') return 'overview';
    if (/\/montree\/admin\/classrooms\/[^/]+\/students\//.test(pathname)) return 'student';
    if (/\/montree\/admin\/classrooms\/[^/]+$/.test(pathname)) return 'classroom';
    if (pathname === '/montree/admin/guru') return 'guru';
    return 'other';
  };

  const pageType = currentPageType();
  const currentStep = steps[step];

  // Check if this step should show on this page
  const shouldShow = (() => {
    if (!currentStep) return false;
    if (currentStep.page === 'any') return true;
    if (currentStep.page === 'overview' && pageType === 'overview') return true;
    if (currentStep.page === 'classroom' && pageType === 'classroom') return true;
    return false;
  })();

  const measure = useCallback(() => {
    if (!currentStep || !shouldShow) return;
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
  }, [currentStep, shouldShow]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !shouldShow) return;
    const delay = currentStep?.delayMs || 300;
    const timer = setTimeout(measure, delay);
    window.addEventListener('scroll', measure, { capture: true, passive: true });
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', measure, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', measure);
    };
  }, [measure, mounted, step, shouldShow, pathname]);

  // Persist step
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(step));
    }
  }, [step]);

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

  // Check if guide is done
  const isDone = typeof window !== 'undefined' && !!localStorage.getItem(DONE_KEY);
  if (isDone || !mounted || !currentStep || !shouldShow) return null;

  const isCentered = !currentStep.target;
  if (!isCentered && !targetRect) return null;

  const handleNext = () => {
    const action = currentStep.onAdvance;

    if (action === 'navigate-first-classroom') {
      // Find the first classroom tile's href from the DOM
      const tile = document.querySelector('[data-guide="first-classroom"]');
      const href = tile?.getAttribute('data-href');
      setStep(step + 1);
      if (href) {
        router.push(href);
      }
      return;
    }

    if (action === 'navigate-back') {
      setStep(step + 1);
      router.push('/montree/admin');
      return;
    }

    if (action === 'navigate-guru') {
      setStep(step + 1);
      router.push('/montree/admin/guru');
      return;
    }

    if (action === 'complete') {
      localStorage.setItem(DONE_KEY, '1');
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (step < steps.length - 1) {
      setTargetRect(null);
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(DONE_KEY, '1');
    localStorage.removeItem(STORAGE_KEY);
  };

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
      ? targetRect.top - POINTER_SIZE - 180
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
      {/* Pulsating green border around target */}
      {currentStep.showGPB && targetRect && (
        <div
          className="pag-pulse-border"
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
          <button
            onClick={handleSkip}
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
        @keyframes pag-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.6), inset 0 0 0 3px rgba(52, 211, 153, 0.8);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(52, 211, 153, 0), inset 0 0 0 3px rgba(52, 211, 153, 0.8);
          }
        }
        .pag-pulse-border {
          animation: pag-pulse 1.8s ease-in-out infinite;
        }
      `}</style>
    </>,
    document.body
  );
}
