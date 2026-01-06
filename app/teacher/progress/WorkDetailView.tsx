'use client';

import { useState, useRef, useEffect } from 'react';

interface Work {
  id: string;
  name: string;
  area: string;
  category: string;
  subcategory: string | null;
  sequence_order: number;
  status: number;
  presented_date: string | null;
  practicing_date: string | null;
  mastered_date: string | null;
}

interface WorkDetailViewProps {
  works: Work[];
  initialIndex: number;
  onClose: () => void;
  onUpdateStatus: (workId: string, newStatus: number) => Promise<void>;
  areaColor: string;
}

const STATUS_LABELS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];
const STATUS_COLORS = [
  'bg-gray-200 border-gray-300',
  'bg-yellow-200 border-yellow-400',
  'bg-blue-200 border-blue-400',
  'bg-green-200 border-green-400',
];
const STATUS_TEXT_COLORS = [
  'text-gray-700',
  'text-yellow-800',
  'text-blue-800',
  'text-green-800',
];

export default function WorkDetailView({
  works,
  initialIndex,
  onClose,
  onUpdateStatus,
  areaColor,
}: WorkDetailViewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [updating, setUpdating] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentWork = works[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < works.length - 1;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) navigateTo(currentIndex - 1);
      if (e.key === 'ArrowRight' && hasNext) navigateTo(currentIndex + 1);
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        cycleStatus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasPrev, hasNext]);

  const navigateTo = (index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    const direction = index > currentIndex ? -1 : 1;
    setSwipeOffset(direction * window.innerWidth);
    
    setTimeout(() => {
      setCurrentIndex(index);
      setSwipeOffset(direction * -window.innerWidth);
      
      requestAnimationFrame(() => {
        setSwipeOffset(0);
        setTimeout(() => setIsAnimating(false), 300);
      });
    }, 10);
  };

  const cycleStatus = async () => {
    if (updating) return;
    setUpdating(true);
    
    const newStatus = (currentWork.status + 1) % 4;
    await onUpdateStatus(currentWork.id, newStatus);
    
    // Update local state
    works[currentIndex].status = newStatus;
    setUpdating(false);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isAnimating) return;
    
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    // Only swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Limit swipe if at boundaries
      if ((!hasPrev && deltaX > 0) || (!hasNext && deltaX < 0)) {
        setSwipeOffset(deltaX * 0.2); // Resistance at edges
      } else {
        setSwipeOffset(deltaX);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isAnimating) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = window.innerWidth * 0.25; // 25% of screen width
    
    if (deltaX > threshold && hasPrev) {
      navigateTo(currentIndex - 1);
    } else if (deltaX < -threshold && hasNext) {
      navigateTo(currentIndex + 1);
    } else {
      // Snap back
      setSwipeOffset(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center text-2xl hover:bg-white/30 transition-colors"
      >
        ×
      </button>

      {/* Progress indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
        {currentIndex + 1} / {works.length}
      </div>

      {/* Navigation arrows (desktop) */}
      {hasPrev && (
        <button
          onClick={() => navigateTo(currentIndex - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center text-3xl hover:bg-white/30 transition-colors hidden md:flex"
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => navigateTo(currentIndex + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center text-3xl hover:bg-white/30 transition-colors hidden md:flex"
        >
          ›
        </button>
      )}

      {/* Swipe hint (mobile) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm md:hidden">
        ← Swipe to navigate →
      </div>

      {/* Card container */}
      <div
        ref={containerRef}
        className="w-full max-w-lg mx-4 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* The card */}
        <div
          className={`bg-white rounded-3xl shadow-2xl overflow-hidden transition-transform ${
            isAnimating ? 'duration-300' : 'duration-0'
          }`}
          style={{
            transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.02}deg)`,
          }}
        >
          {/* Area header */}
          <div className={`${areaColor} px-6 py-4 text-white`}>
            <div className="text-sm opacity-80">{currentWork.category}</div>
            {currentWork.subcategory && (
              <div className="text-xs opacity-60">{currentWork.subcategory}</div>
            )}
          </div>

          {/* Work content */}
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {currentWork.name}
            </h2>

            {/* Status button - TAP TO CYCLE */}
            <button
              onClick={cycleStatus}
              disabled={updating}
              className={`w-full py-6 rounded-2xl border-4 transition-all active:scale-95 ${
                STATUS_COLORS[currentWork.status]
              } ${updating ? 'opacity-50' : ''}`}
            >
              <div className={`text-3xl font-bold ${STATUS_TEXT_COLORS[currentWork.status]}`}>
                {STATUS_LABELS[currentWork.status]}
              </div>
              <div className={`text-sm mt-2 ${STATUS_TEXT_COLORS[currentWork.status]} opacity-70`}>
                Tap to change status
              </div>
            </button>

            {/* Dates */}
            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
              <div className={`p-2 rounded-lg ${currentWork.presented_date ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                <div className="text-gray-500">Presented</div>
                <div className="font-medium text-gray-700">
                  {currentWork.presented_date || '—'}
                </div>
              </div>
              <div className={`p-2 rounded-lg ${currentWork.practicing_date ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <div className="text-gray-500">Practicing</div>
                <div className="font-medium text-gray-700">
                  {currentWork.practicing_date || '—'}
                </div>
              </div>
              <div className={`p-2 rounded-lg ${currentWork.mastered_date ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="text-gray-500">Mastered</div>
                <div className="font-medium text-gray-700">
                  {currentWork.mastered_date || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom navigation dots */}
          <div className="px-6 pb-6">
            <div className="flex justify-center gap-1.5">
              {works.slice(
                Math.max(0, currentIndex - 4),
                Math.min(works.length, currentIndex + 5)
              ).map((_, idx) => {
                const actualIdx = Math.max(0, currentIndex - 4) + idx;
                return (
                  <div
                    key={actualIdx}
                    className={`h-1.5 rounded-full transition-all ${
                      actualIdx === currentIndex
                        ? 'w-6 bg-gray-800'
                        : 'w-1.5 bg-gray-300'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
