// components/home/HomeFocusModeCard.tsx
// Home-adapted Focus Mode Card for parent dashboard
// Shows area emoji, current work name, status, materials needed, and home tips
// Tap to cycle status (not_started → presented → practicing → mastered)
// Long-press emoji to change work

'use client';

import React, { useState, useCallback } from 'react';

export interface HomeFocusWork {
  id: string;
  name: string;
  status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  area: string;
  materialsNeeded?: string[];
  homeTip?: string;
}

interface HomeFocusModeCardProps {
  area: string;
  areaIcon: string;
  areaLabel: string;
  areaColor: string; // e.g. 'emerald', 'orange', 'blue', 'pink', 'purple'
  work: HomeFocusWork | null;
  onStatusChange: (workId: string, newStatus: HomeFocusWork['status']) => void;
  onLongPressEmoji: () => void;
  onTapCard: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; emoji: string }> = {
  not_started: { label: 'Not Started', bg: 'bg-gray-100', text: 'text-gray-600', emoji: '○' },
  presented: { label: 'Presented', bg: 'bg-amber-100', text: 'text-amber-700', emoji: '🟡' },
  practicing: { label: 'Practicing', bg: 'bg-blue-100', text: 'text-blue-700', emoji: '🔵' },
  mastered: { label: 'Mastered', bg: 'bg-emerald-100', text: 'text-emerald-700', emoji: '🟢' },
};

const STATUS_ORDER: HomeFocusWork['status'][] = ['not_started', 'presented', 'practicing', 'mastered'];

function getNextStatus(current: HomeFocusWork['status']): HomeFocusWork['status'] {
  const currentIndex = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
}

const AREA_COLORS = {
  practical_life: 'from-emerald-50 to-emerald-100 border-emerald-200',
  sensorial: 'from-orange-50 to-orange-100 border-orange-200',
  mathematics: 'from-blue-50 to-blue-100 border-blue-200',
  language: 'from-pink-50 to-pink-100 border-pink-200',
  cultural: 'from-purple-50 to-purple-100 border-purple-200',
};

export default function HomeFocusModeCard({
  area,
  areaIcon,
  areaLabel,
  areaColor,
  work,
  onStatusChange,
  onLongPressEmoji,
  onTapCard,
}: HomeFocusModeCardProps) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Long press handlers for emoji
  const handleEmojiTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      if (navigator.vibrate) navigator.vibrate(20);
      onLongPressEmoji();
    }, 500);
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
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }, [work, onStatusChange]);

  // Card body tap
  const handleCardTap = useCallback(() => {
    if (work) {
      onTapCard();
    }
  }, [work, onTapCard]);

  const statusConfig = work ? (STATUS_CONFIG[work.status] || STATUS_CONFIG.not_started) : STATUS_CONFIG.not_started;
  const colorClass = AREA_COLORS[area as keyof typeof AREA_COLORS] || AREA_COLORS.practical_life;

  return (
    <div
      className={`
        relative rounded-2xl p-4 min-h-[140px]
        bg-gradient-to-br ${colorClass}
        border shadow-sm hover:shadow-md transition-shadow
        cursor-pointer
        ${!work ? 'opacity-60' : ''}
      `}
      onClick={handleCardTap}
    >
      {/* Area emoji - long press to switch work */}
      <div
        className={`
          absolute top-3 left-3 w-12 h-12
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
            absolute top-3 right-3
            px-3 py-1.5 rounded-full
            flex items-center gap-1
            font-semibold text-sm
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
          <span>{statusConfig.emoji}</span>
          <span>{statusConfig.label.split(' ')[0]}</span>
        </div>
      )}

      {/* Content */}
      <div className="mt-14 px-1">
        {work ? (
          <>
            <p className="text-base font-semibold text-gray-800 line-clamp-2 mb-2">
              {work.name}
            </p>
            <p className={`text-xs font-medium text-${areaColor}-600 mb-3`}>
              {areaLabel}
            </p>

            {/* Home Tip */}
            {work.homeTip && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">💡 Tip: </span>
                  {work.homeTip}
                </p>
              </div>
            )}

            {/* Materials Needed */}
            {work.materialsNeeded && work.materialsNeeded.length > 0 && (
              <div className="bg-white/60 border border-white/80 rounded-lg p-2">
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  🧰 Materials needed:
                </p>
                <p className="text-xs text-gray-600 line-clamp-1">
                  {work.materialsNeeded.slice(0, 2).join(', ')}
                  {work.materialsNeeded.length > 2 ? '...' : ''}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500 mb-1">{areaLabel}</p>
            <p className="text-base text-gray-400">+ Add Work</p>
          </div>
        )}
      </div>

      {/* Long press hint */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
        <p className="text-[10px] text-gray-400">
          {work ? 'Hold icon to change' : 'Tap to add'}
        </p>
      </div>
    </div>
  );
}
