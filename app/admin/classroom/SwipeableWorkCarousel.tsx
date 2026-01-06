'use client';

import { useState, useRef } from 'react';

interface WorkAssignment {
  id: string;
  work_name: string;
  work_name_chinese?: string;
  area: string;
  progress_status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  work_id?: string;
  video_url?: string;
  notes?: string;
}

interface SwipeableWorkCarouselProps {
  assignments: WorkAssignment[];
  areaConfig: Record<string, { letter: string; color: string }>;
  statusConfig: Record<string, { label: string; color: string; next: string }>;
  onStatusTap: (assignment: WorkAssignment) => void;
  onCapture: (assignment: WorkAssignment) => void;
  onWatchVideo: (assignment: WorkAssignment) => void;
}

const SWIPE_THRESHOLD = 50;

export default function SwipeableWorkCarousel({
  assignments,
  areaConfig,
  statusConfig,
  onStatusTap,
  onCapture,
  onWatchVideo,
}: SwipeableWorkCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  if (assignments.length === 0) return null;

  const currentAssignment = assignments[currentIndex];
  const area = areaConfig[currentAssignment.area] || { letter: '?', color: 'bg-gray-100 text-gray-600' };
  const status = statusConfig[currentAssignment.progress_status];

  const goToNext = () => {
    if (currentIndex < assignments.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setTranslateX(-300);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setTranslateX(0);
        setIsAnimating(false);
      }, 200);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      setTranslateX(300);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setTranslateX(0);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isAnimating) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipe.current === false) {
      setIsDragging(false);
      return;
    }

    if (isHorizontalSwipe.current === true) {
      e.preventDefault();
      
      // Add resistance at edges
      let resistance = 1;
      if ((diffX > 0 && currentIndex === 0) || (diffX < 0 && currentIndex === assignments.length - 1)) {
        resistance = 0.3;
      }
      
      setTranslateX(diffX * resistance);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || isAnimating) return;
    setIsDragging(false);

    if (translateX < -SWIPE_THRESHOLD && currentIndex < assignments.length - 1) {
      goToNext();
    } else if (translateX > SWIPE_THRESHOLD && currentIndex > 0) {
      goToPrev();
    } else {
      // Snap back
      setTranslateX(0);
    }
    
    isHorizontalSwipe.current = null;
  };

  return (
    <div 
      className="relative overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Main content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex items-center gap-2 px-3 py-2 bg-white
          ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {/* Area Badge */}
        <span className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center shrink-0 ${area.color}`}>
          {area.letter}
        </span>
        
        {/* Status Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusTap(currentAssignment);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
            ${status.color} active:scale-95 transition-transform`}
        >
          {status.label}
        </button>
        
        {/* Work Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentAssignment.work_name}</p>
        </div>
        
        {/* Capture Button */}
        <button
          onClick={() => onCapture(currentAssignment)}
          className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 active:scale-95 transition-all shrink-0"
          title="Take photo or video"
        >
          📷
        </button>
        
        {/* Watch Video Button */}
        <button
          onClick={() => onWatchVideo(currentAssignment)}
          className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center hover:bg-red-200 active:scale-95 transition-all shrink-0"
          title="Watch presentation video"
        >
          ▶️
        </button>
      </div>

      {/* Position indicator (only if multiple works) */}
      {assignments.length > 1 && (
        <div className="flex items-center justify-center gap-1 py-1 bg-gray-50">
          {assignments.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!isAnimating) {
                  setCurrentIndex(idx);
                }
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'bg-blue-500 w-4' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
