'use client';

import { useState, useEffect } from 'react';
import { Sprout, X } from 'lucide-react';
import { getNextTip, advanceTip, TipConfig } from '@/lib/montree/guru/page-tips';

interface GuruContextBubbleProps {
  pageKey: string;
  role: 'parent' | 'teacher';
}

export default function GuruContextBubble({ pageKey, role }: GuruContextBubbleProps) {
  const [tip, setTip] = useState<TipConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const nextTip = getNextTip(pageKey, role);
    if (nextTip) {
      setTip(nextTip);
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [pageKey, role]);

  const handleDismiss = () => {
    setVisible(false);
    advanceTip(pageKey);
    setTimeout(() => setDismissed(true), 300);
  };

  if (!tip || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 80,
        zIndex: 40,
        maxWidth: 380,
        margin: '0 auto',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        pointerEvents: visible ? 'auto' : 'none',
        fontFamily: '"Inter", -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: '14px 16px 14px 16px',
          background: 'rgba(7,18,12,0.94)',
          border: '1px solid rgba(52,211,153,0.30)',
          borderRadius: 18,
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          boxShadow: '0 14px 36px rgba(0,0,0,0.45)',
          color: 'rgba(255,255,255,0.95)',
        }}
      >
        <button
          onClick={handleDismiss}
          aria-label="Dismiss tip"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.55)',
            cursor: 'pointer',
            transition: 'all 120ms ease',
          }}
        >
          <X size={11} strokeWidth={1.75} />
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          paddingRight: 22,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 9,
            background: 'rgba(52,211,153,0.16)',
            border: '1px solid rgba(52,211,153,0.30)',
            color: '#34d399',
            flexShrink: 0,
            marginTop: 2,
          }}>
            <Sprout size={14} strokeWidth={1.75} />
          </div>
          <p style={{
            margin: 0,
            fontFamily: '"Inter", -apple-system, sans-serif',
            fontSize: 13,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.92)',
          }}>
            {tip.text}
          </p>
        </div>
      </div>
    </div>
  );
}
