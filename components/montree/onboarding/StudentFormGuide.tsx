'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

// ============================================================
// StudentFormGuide — Cartoon speech-bubble guided tour
// for the bulk student add form. 12 steps with green pulsating
// borders and auto-advance on input/change events.
// ============================================================

interface StudentFormGuideProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  isHomeschoolParent: boolean;
  childName?: string;
}

interface GuideStep {
  key: string;
  selector: string;
  getMessage: (isParent: boolean, childName?: string) => string;
  position: 'top' | 'bottom' | 'left' | 'right';
  autoAdvance?: 'input' | 'change';
  autoAdvanceDebounce?: number;
  actionLabel?: string; // Manual button text (null = no button)
}

const STEPS: GuideStep[] = [
  {
    key: 'name',
    selector: '[data-guide="name"]',
    getMessage: (p) => `Let's start with a name! Type your ${p ? "child's" : "student's"} name here.`,
    position: 'right',
    autoAdvance: 'input',
    autoAdvanceDebounce: 800,
  },
  {
    key: 'age',
    selector: '[data-guide="age"]',
    getMessage: () => 'How old is this little one? Select their age here.',
    position: 'right',
    autoAdvance: 'change',
    actionLabel: 'Next →',
  },
  {
    key: 'gender',
    selector: '[data-guide="gender"]',
    getMessage: () => 'Boy or girl?',
    position: 'right',
    autoAdvance: 'change',
    actionLabel: 'Next →',
  },
  {
    key: 'tenure',
    selector: '[data-guide="tenure"]',
    getMessage: (p) => `How long has this ${p ? 'child' : 'student'} been in your ${p ? 'home program' : 'classroom'}?`,
    position: 'right',
    autoAdvance: 'change',
    actionLabel: 'Next →',
  },
  {
    key: 'curriculum-section',
    selector: '[data-guide="curriculum-section"]',
    getMessage: (p) =>
      `Set your ${p ? "child's" : "student's"} current work in each area. Everything before it gets marked as mastered automatically — your progress reports are instantly up to date!`,
    position: 'bottom',
    actionLabel: 'Got it!',
  },
  {
    key: 'area-practical_life',
    selector: '[data-guide="area-practical_life"]',
    getMessage: (p) => `What's this ${p ? 'child' : 'student'} working on in Practical Life?`,
    position: 'bottom',
    actionLabel: 'Next →',
  },
  {
    key: 'area-sensorial',
    selector: '[data-guide="area-sensorial"]',
    getMessage: () => 'How about Sensorial?',
    position: 'bottom',
    actionLabel: 'Next →',
  },
  {
    key: 'area-mathematics',
    selector: '[data-guide="area-mathematics"]',
    getMessage: () => 'And Math?',
    position: 'bottom',
    actionLabel: 'Next →',
  },
  {
    key: 'area-language',
    selector: '[data-guide="area-language"]',
    getMessage: () => 'What about Language?',
    position: 'bottom',
    actionLabel: 'Next →',
  },
  {
    key: 'area-cultural',
    selector: '[data-guide="area-cultural"]',
    getMessage: () => 'And finally Culture?',
    position: 'bottom',
    actionLabel: 'Next →',
  },
  {
    key: 'profile-notes',
    selector: '[data-guide="profile-notes"]',
    getMessage: (_p, childName) => {
      const name = childName?.trim() ? childName.split(' ')[0] : 'this child';
      return `Now for something special! Tell Guru about ${name} — personality, strengths, challenges, interests. Every note you record shapes their profile, and Guru uses all of it when giving advice or generating reports.`;
    },
    position: 'top',
    actionLabel: 'Got it!',
  },
  {
    key: 'add-another',
    selector: '[data-guide="add-another"]',
    getMessage: (p) =>
      `Got more ${p ? 'children' : 'students'}? Add them all here and save everyone at once. Hit Save All when you're ready!`,
    position: 'top',
    actionLabel: 'Next →',
  },
  {
    key: 'save-all',
    selector: '[data-guide="save-all"]',
    getMessage: (p) =>
      `Hit Save All and let's head to your ${p ? 'home' : 'classroom'} — the best part is coming up!`,
    position: 'top',
  },
];

// ============================================================
// Bubble position calculator
// ============================================================
const BUBBLE_WIDTH = 280;
const BUBBLE_HEIGHT_EST = 120;
const OFFSET = 16;
const POINTER_SIZE = 12;

function calculateBubblePosition(
  rect: DOMRect,
  preferred: 'top' | 'bottom' | 'left' | 'right'
): { x: number; y: number; actual: 'top' | 'bottom' | 'left' | 'right' } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Try preferred position, fall back if not enough space
  let actual = preferred;

  if (preferred === 'bottom' && rect.bottom + OFFSET + BUBBLE_HEIGHT_EST > vh) actual = 'top';
  if (preferred === 'top' && rect.top - OFFSET - BUBBLE_HEIGHT_EST < 0) actual = 'bottom';
  if (preferred === 'right' && rect.right + OFFSET + BUBBLE_WIDTH > vw) actual = 'left';
  if (preferred === 'left' && rect.left - OFFSET - BUBBLE_WIDTH < 0) actual = 'right';

  let x: number, y: number;

  switch (actual) {
    case 'bottom':
      x = rect.left + rect.width / 2 - BUBBLE_WIDTH / 2;
      y = rect.bottom + OFFSET + POINTER_SIZE;
      break;
    case 'top':
      x = rect.left + rect.width / 2 - BUBBLE_WIDTH / 2;
      y = rect.top - OFFSET - BUBBLE_HEIGHT_EST - POINTER_SIZE;
      break;
    case 'right':
      x = rect.right + OFFSET + POINTER_SIZE;
      y = rect.top + rect.height / 2 - BUBBLE_HEIGHT_EST / 2;
      break;
    case 'left':
      x = rect.left - OFFSET - BUBBLE_WIDTH - POINTER_SIZE;
      y = rect.top + rect.height / 2 - BUBBLE_HEIGHT_EST / 2;
      break;
  }

  // Clamp to viewport
  x = Math.max(12, Math.min(x, vw - BUBBLE_WIDTH - 12));
  y = Math.max(12, Math.min(y, vh - BUBBLE_HEIGHT_EST - 12));

  return { x, y, actual };
}

// ============================================================
// Pointer (triangle tail) CSS for each direction
// ============================================================
function getPointerStyle(direction: 'top' | 'bottom' | 'left' | 'right', rect: DOMRect, bubbleX: number, bubbleY: number): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
  };

  // Point TOWARD the target, so if bubble is below target, pointer is at top of bubble pointing up
  switch (direction) {
    case 'bottom': // bubble below target → pointer at top pointing up
      return {
        ...base,
        top: -POINTER_SIZE,
        left: Math.min(Math.max(rect.left + rect.width / 2 - bubbleX - POINTER_SIZE / 2, 16), BUBBLE_WIDTH - 32),
        borderLeft: `${POINTER_SIZE}px solid transparent`,
        borderRight: `${POINTER_SIZE}px solid transparent`,
        borderBottom: `${POINTER_SIZE}px solid #059669`,
      };
    case 'top': // bubble above target → pointer at bottom pointing down
      return {
        ...base,
        bottom: -POINTER_SIZE,
        left: Math.min(Math.max(rect.left + rect.width / 2 - bubbleX - POINTER_SIZE / 2, 16), BUBBLE_WIDTH - 32),
        borderLeft: `${POINTER_SIZE}px solid transparent`,
        borderRight: `${POINTER_SIZE}px solid transparent`,
        borderTop: `${POINTER_SIZE}px solid #059669`,
      };
    case 'right': // bubble right of target → pointer at left pointing left
      return {
        ...base,
        left: -POINTER_SIZE,
        top: Math.min(Math.max(rect.top + rect.height / 2 - bubbleY - POINTER_SIZE / 2, 16), BUBBLE_HEIGHT_EST - 32),
        borderTop: `${POINTER_SIZE}px solid transparent`,
        borderBottom: `${POINTER_SIZE}px solid transparent`,
        borderRight: `${POINTER_SIZE}px solid #059669`,
      };
    case 'left': // bubble left of target → pointer at right pointing right
      return {
        ...base,
        right: -POINTER_SIZE,
        top: Math.min(Math.max(rect.top + rect.height / 2 - bubbleY - POINTER_SIZE / 2, 16), BUBBLE_HEIGHT_EST - 32),
        borderTop: `${POINTER_SIZE}px solid transparent`,
        borderBottom: `${POINTER_SIZE}px solid transparent`,
        borderLeft: `${POINTER_SIZE}px solid #059669`,
      };
  }
}

// ============================================================
// Main Component
// ============================================================
export default function StudentFormGuide({
  isVisible,
  onComplete,
  onSkip,
  isHomeschoolParent: isParent,
  childName,
}: StudentFormGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(currentStep);
  stepRef.current = currentStep;

  const step = STEPS[currentStep];

  // ---- Advance to next step ----
  const advance = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= STEPS.length) {
        onComplete();
        return prev;
      }
      return next;
    });
  }, [onComplete]);

  // ---- Go back to previous step ----
  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  // ---- Measure target element ----
  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll into view if off-screen
      const isVisible =
        rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!isVisible) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Re-measure after scroll
        setTimeout(() => {
          setTargetRect(el.getBoundingClientRect());
        }, 400);
      }
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // ---- Measure on step change, scroll, resize ----
  useEffect(() => {
    if (!isVisible || dismissed) return;

    // Delay initial measurement for DOM to settle
    const initTimer = setTimeout(measureTarget, 150);

    const handleScroll = () => measureTarget();
    const handleResize = () => measureTarget();

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible, dismissed, currentStep, measureTarget]);

  // ---- Auto-advance event listeners ----
  useEffect(() => {
    if (!isVisible || dismissed || !step?.autoAdvance) return;

    const el = document.querySelector(step.selector);
    if (!el) return;

    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const delay = step.autoAdvanceDebounce || 0;
      if (delay > 0) {
        debounceRef.current = setTimeout(() => {
          // Only advance if we're still on the same step
          if (stepRef.current === currentStep) {
            advance();
          }
        }, delay);
      } else {
        advance();
      }
    };

    const eventType = step.autoAdvance; // 'input' or 'change'
    el.addEventListener(eventType, handler);

    return () => {
      el.removeEventListener(eventType, handler);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isVisible, dismissed, currentStep, step, advance]);

  // ---- Escape key to dismiss ----
  useEffect(() => {
    if (!isVisible || dismissed) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDismissed(true);
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isVisible, dismissed, onSkip]);

  // ---- Don't render if not visible or dismissed ----
  if (!isVisible || dismissed || !step) return null;

  const message = step.getMessage(isParent, childName);
  const bubblePos = targetRect
    ? calculateBubblePosition(targetRect, step.position)
    : null;

  return createPortal(
    <>
      {/* Pulsating green border overlay */}
      {targetRect && (
        <div
          className="sfg-pulse-border"
          style={{
            position: 'fixed',
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 12,
            pointerEvents: 'none',
            zIndex: 9997,
          }}
        />
      )}

      {/* Speech bubble */}
      {bubblePos && targetRect && (
        <div
          className="sfg-bubble"
          style={{
            position: 'fixed',
            left: bubblePos.x,
            top: bubblePos.y,
            width: BUBBLE_WIDTH,
            zIndex: 9999,
            backgroundColor: '#059669',
            color: 'white',
            borderRadius: 16,
            padding: '16px 18px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Triangular pointer */}
          <div style={getPointerStyle(bubblePos.actual, targetRect, bubblePos.x, bubblePos.y)} />

          {/* Message */}
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
            {message}
          </p>

          {/* Actions row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 8 }}>
            {/* Back button */}
            {currentStep > 0 ? (
              <button
                onClick={goBack}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '5px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {/* Right side: Skip + Next */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { setDismissed(true); onSkip(); }}
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

              {currentStep < STEPS.length - 1 && (
                <button
                  onClick={advance}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '5px 14px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                >
                  {step.actionLabel || 'Next →'}
                </button>
              )}
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 10 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentStep ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === currentStep ? 'white' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fallback centered bubble when target not found */}
      {!targetRect && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
            width: BUBBLE_WIDTH,
            zIndex: 9999,
            backgroundColor: '#059669',
            color: 'white',
            borderRadius: 16,
            padding: '16px 18px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
          }}
        >
          <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
            {message}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 8 }}>
            {currentStep > 0 ? (
              <button
                onClick={goBack}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 8, cursor: 'pointer' }}
              >
                ← Back
              </button>
            ) : <div />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { setDismissed(true); onSkip(); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Skip tour
              </button>
              {currentStep < STEPS.length - 1 && (
                <button
                  onClick={advance}
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', fontSize: 13, fontWeight: 600, padding: '5px 14px', borderRadius: 8, cursor: 'pointer' }}
                >
                  {step.actionLabel || 'Next →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sfg-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7),
                        0 0 0 4px rgba(16, 185, 129, 0.3);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.4),
                        0 0 0 12px rgba(16, 185, 129, 0);
          }
        }
        .sfg-pulse-border {
          animation: sfg-pulse 2s ease-in-out infinite;
        }
        .sfg-bubble {
          animation: sfg-bubble-in 0.25s ease-out;
        }
        @keyframes sfg-bubble-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </>,
    document.body
  );
}
