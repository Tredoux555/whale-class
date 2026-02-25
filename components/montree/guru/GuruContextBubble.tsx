'use client';

import { useState, useEffect } from 'react';
import { getNextTip, advanceTip, TipConfig } from '@/lib/montree/guru/page-tips';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface GuruContextBubbleProps {
  pageKey: string;
  role: 'parent' | 'teacher';
}

export default function GuruContextBubble({ pageKey, role }: GuruContextBubbleProps) {
  const [tip, setTip] = useState<TipConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Small delay for slide-in effect
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
    // After animation, fully remove
    setTimeout(() => setDismissed(true), 300);
  };

  if (!tip || dismissed) return null;

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className={`${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl shadow-lg p-4 relative`}>
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-xs transition-colors"
          aria-label="Dismiss tip"
        >
          ✕
        </button>

        <div className="flex items-start gap-3 pr-4">
          <span className="text-xl flex-shrink-0 mt-0.5">🌿</span>
          <p className={`text-sm leading-relaxed ${HOME_THEME.textPrimary}`}>
            {tip.text}
          </p>
        </div>
      </div>
    </div>
  );
}
