// DashboardGuide.tsx
// Post-onboarding speech bubble on dashboard — highlights the first child card
// and invites the user to tap on it to explore the child week view.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/lib/montree/i18n';

interface DashboardGuideProps {
  childName: string;
  isHomeschoolParent: boolean;
  onDismiss: () => void;
}

const BUBBLE_WIDTH = 300;
const POINTER_SIZE = 12;

export default function DashboardGuide({ childName, isHomeschoolParent: isParent, onDismiss }: DashboardGuideProps) {
  const { t } = useI18n();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const firstName = childName?.trim() ? childName.split(' ')[0] : (isParent ? 'your child' : 'your student');

  // Measure the first child card
  const measure = useCallback(() => {
    const el = document.querySelector('[data-guide="first-child"]');
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    // Wait for DOM to settle after redirect
    const timer = setTimeout(measure, 300);
    window.addEventListener('scroll', measure, { capture: true, passive: true });
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', measure, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  if (!mounted || !targetRect) return null;

  // Position bubble below the card
  const bubbleY = targetRect.bottom + POINTER_SIZE + 12;
  const bubbleX = Math.max(12, Math.min(
    targetRect.left + targetRect.width / 2 - BUBBLE_WIDTH / 2,
    window.innerWidth - BUBBLE_WIDTH - 12
  ));

  // Pointer position (points up toward the card)
  const pointerLeft = Math.min(
    Math.max(targetRect.left + targetRect.width / 2 - bubbleX - POINTER_SIZE / 2, 16),
    BUBBLE_WIDTH - 32
  );

  const message = t('guide.dashboard.message').replace('{name}', firstName);

  return createPortal(
    <>
      {/* Pulsating green border around the first child card */}
      <div
        className="dbg-pulse-border"
        style={{
          position: 'fixed',
          left: targetRect.left - 4,
          top: targetRect.top - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          borderRadius: 20,
          pointerEvents: 'none',
          zIndex: 9997,
        }}
      />

      {/* Speech bubble */}
      <div
        style={{
          position: 'fixed',
          left: bubbleX,
          top: bubbleY,
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
        {/* Triangle pointer pointing up */}
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            top: -POINTER_SIZE,
            left: pointerLeft,
            borderLeft: `${POINTER_SIZE}px solid transparent`,
            borderRight: `${POINTER_SIZE}px solid transparent`,
            borderBottom: `${POINTER_SIZE}px solid #059669`,
          }}
        />

        {/* Message */}
        <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
          {message}
        </p>

        {/* Dismiss */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button
            onClick={onDismiss}
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
            {t('guide.common.dismiss')}
          </button>
        </div>
      </div>

      {/* Pulsating animation */}
      <style>{`
        @keyframes dbg-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.6), inset 0 0 0 2px rgba(5, 150, 105, 0.8);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(5, 150, 105, 0), inset 0 0 0 2px rgba(5, 150, 105, 0.8);
          }
        }
        .dbg-pulse-border {
          animation: dbg-pulse 1.8s ease-in-out infinite;
        }
      `}</style>
    </>,
    document.body
  );
}
