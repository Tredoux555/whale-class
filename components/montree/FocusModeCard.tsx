// components/montree/FocusModeCard.tsx
// Single area card for focus mode dashboard
// Shows one work per area, long-press emoji to switch

'use client';

import React, { useState, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export interface FocusWork {
  id: string;
  name: string;
  status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  area: string;
}

interface FocusModeCardProps {
  area: string;
  areaIcon: string;
  areaLabel: string;
  work: FocusWork | null;
  onStatusChange: (workId: string, newStatus: FocusWork['status']) => void;
  onLongPressEmoji: () => void;
  onTapCard: () => void;
  color: string; // Tailwind color class like 'emerald', 'blue', etc.
}

// ============================================
// STATUS HELPERS
// ============================================

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  not_started: { label: '—', bg: 'bg-gray-200', text: 'text-gray-600' },
  presented: { label: 'P', bg: 'bg-amber-100', text: 'text-amber-700' },
  practicing: { label: 'Pr', bg: 'bg-blue-100', text: 'text-blue-700' },
  mastered: { label: 'M', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  completed: { label: 'M', bg: 'bg-emerald-100', text: 'text-emerald-700' }, // alias
};

const STATUS_ORDER: FocusWork['status'][] = ['not_started', 'presented', 'practicing', 'mastered'];

function getNextStatus(current: FocusWork['status']): FocusWork['status'] {
  const currentIndex = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
}

// ============================================
// COMPONENT
// ============================================

export default function FocusModeCard({
  area,
  areaIcon,
  areaLabel,
  work,
  onStatusChange,
  onLongPressEmoji,
  onTapCard,
  color,
}: FocusModeCardProps) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Long press handlers for emoji
  const handleEmojiTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
      onLongPressEmoji();
    }, 500); // 500ms for long press
  }, [onLongPressEmoji]);

  const handleEmojiTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  }, []);

  const handleEmojiTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  }, []);

  // Status badge tap
  const handleStatusTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (work) {
      const newStatus = getNextStatus(work.status);
      onStatusChange(work.id, newStatus);
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  }, [work, onStatusChange]);

  // Card body tap
  const handleCardTap = useCallback(() => {
    if (work) {
      onTapCard();
    }
  }, [work, onTapCard]);

  const statusConfig = work ? (STATUS_CONFIG[work.status] || STATUS_CONFIG.not_started) : STATUS_CONFIG.not_started;

  return (
    <div 
      className={`
        relative rounded-2xl p-3 min-h-[100px]
        bg-gradient-to-br from-${color}-50 to-${color}-100
        border border-${color}-200
        shadow-sm hover:shadow-md transition-shadow
        ${!work ? 'opacity-60' : ''}
      `}
      onClick={handleCardTap}
    >
      {/* Area emoji - long press to switch work */}
      <div
        className={`
          absolute top-2 left-2 w-10 h-10 
          flex items-center justify-center 
          rounded-xl bg-white/80 backdrop-blur-sm
          shadow-sm cursor-pointer
          transition-transform
          ${isLongPressing ? 'scale-110' : 'hover:scale-105'}
        `}
        onTouchStart={handleEmojiTouchStart}
        onTouchEnd={handleEmojiTouchEnd}
        onTouchCancel={handleEmojiTouchCancel}
        onMouseDown={handleEmojiTouchStart}
        onMouseUp={handleEmojiTouchEnd}
        onMouseLeave={handleEmojiTouchCancel}
      >
        <span className="text-2xl">{areaIcon}</span>
      </div>

      {/* Status badge - tap to cycle */}
      {work && (
        <div
          className={`
            absolute top-2 right-2
            w-8 h-8 rounded-full
            flex items-center justify-center
            font-bold text-sm
            cursor-pointer
            transition-transform hover:scale-110 active:scale-95
            ${statusConfig.bg} ${statusConfig.text}
          `}
          onClick={handleStatusTap}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleStatusTap(e);
          }}
        >
          {statusConfig.label}
        </div>
      )}

      {/* Content */}
      <div className="mt-12 px-1">
        {work ? (
          <>
            <p className="text-sm font-medium text-gray-800 line-clamp-2">
              {work.name}
            </p>
            <p className={`text-xs text-${color}-600 mt-1`}>
              {areaLabel}
            </p>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-gray-500">{areaLabel}</p>
            <p className="text-lg text-gray-400 mt-1">+ Add</p>
          </div>
        )}
      </div>

      {/* Long press hint (subtle) */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
        <p className="text-[10px] text-gray-400">
          {work ? 'Hold icon to switch' : 'Tap to add'}
        </p>
      </div>
    </div>
  );
}
