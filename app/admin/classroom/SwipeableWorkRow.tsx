'use client';

import { useState, useRef, useEffect } from 'react';

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

interface SwipeableWorkRowProps {
  assignment: WorkAssignment;
  areaConfig: { letter: string; color: string };
  statusConfig: { label: string; color: string; next: string };
  onStatusTap: (e: React.MouseEvent) => void;
  onCapture: () => void;
  onWatchVideo: () => void;
  isOpen: boolean;
  onSwipeOpen: (id: string | null) => void;
}

const SWIPE_THRESHOLD = 60; // pixels to trigger action reveal
const VELOCITY_THRESHOLD = 0.5; // px/ms for fast swipe

export default function SwipeableWorkRow({
  assignment,
  areaConfig,
  statusConfig,
  onStatusTap,
  onCapture,
  onWatchVideo,
  isOpen,
  onSwipeOpen,
}: SwipeableWorkRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const currentTranslate = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  // Reset position when another row opens
  useEffect(() => {
    if (!isOpen && translateX !== 0) {
      setTranslateX(0);
      currentTranslate.current = 0;
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

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

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current === false) {
      setIsDragging(false);
      return;
    }

    if (isHorizontalSwipe.current === true) {
      e.preventDefault(); // Prevent vertical scroll during horizontal swipe
      
      let newTranslate = currentTranslate.current + diffX;
      
      // Rubber band effect at edges
      const maxLeft = -120; // Max swipe left (reveals right actions)
      const maxRight = 80;  // Max swipe right (reveals left action)
      
      if (newTranslate < maxLeft) {
        newTranslate = maxLeft - (maxLeft - newTranslate) * 0.3;
      } else if (newTranslate > maxRight) {
        newTranslate = maxRight + (newTranslate - maxRight) * 0.3;
      }
      
      setTranslateX(newTranslate);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const elapsed = Date.now() - touchStartTime.current;
    const velocity = Math.abs(translateX - currentTranslate.current) / elapsed;
    const fastSwipe = velocity > VELOCITY_THRESHOLD;

    let finalPosition = 0;

    // Determine final position based on threshold or velocity
    if (translateX < -SWIPE_THRESHOLD || (translateX < 0 && fastSwipe)) {
      // Swiped left - show right actions (camera, video)
      finalPosition = -120;
      onSwipeOpen(assignment.id);
    } else if (translateX > SWIPE_THRESHOLD || (translateX > 0 && fastSwipe)) {
      // Swiped right - show left action (quick status)
      finalPosition = 80;
      onSwipeOpen(assignment.id);
    } else {
      // Snap back
      finalPosition = 0;
      onSwipeOpen(null);
    }

    setTranslateX(finalPosition);
    currentTranslate.current = finalPosition;
    isHorizontalSwipe.current = null;
  };

  const handleActionClick = (action: 'status' | 'capture' | 'video') => {
    // Close the row after action
    setTranslateX(0);
    currentTranslate.current = 0;
    onSwipeOpen(null);
    
    // Small delay to let animation complete
    setTimeout(() => {
      if (action === 'capture') onCapture();
      if (action === 'video') onWatchVideo();
    }, 100);
  };

  const handleRowTap = () => {
    if (Math.abs(translateX) > 5) {
      // If row is open, close it
      setTranslateX(0);
      currentTranslate.current = 0;
      onSwipeOpen(null);
    }
  };

  return (
    <div 
      className="relative overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Left action (revealed on swipe right) - Quick Status */}
      <div className="absolute inset-y-0 left-0 flex items-center">
        <button
          onClick={(e) => {
            handleActionClick('status');
            onStatusTap(e);
          }}
          className="h-full px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold flex items-center gap-2"
        >
          <span className="text-xl">✓</span>
          <span className="text-sm">Next</span>
        </button>
      </div>

      {/* Right actions (revealed on swipe left) - Camera & Video */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          onClick={() => handleActionClick('capture')}
          className="h-full px-5 bg-gradient-to-r from-green-500 to-green-600 text-white flex flex-col items-center justify-center"
        >
          <span className="text-xl">📷</span>
          <span className="text-xs mt-0.5">Photo</span>
        </button>
        <button
          onClick={() => handleActionClick('video')}
          className="h-full px-5 bg-gradient-to-r from-red-500 to-red-600 text-white flex flex-col items-center justify-center"
        >
          <span className="text-xl">▶️</span>
          <span className="text-xs mt-0.5">Video</span>
        </button>
      </div>

      {/* Main row content */}
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleRowTap}
        className={`flex items-center gap-2 px-3 py-2 bg-white relative z-10
          ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {/* Area Badge */}
        <span className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center shrink-0 ${areaConfig.color}`}>
          {areaConfig.letter}
        </span>
        
        {/* Status Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusTap(e);
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
            ${statusConfig.color} active:scale-95 transition-transform`}
        >
          {statusConfig.label}
        </button>
        
        {/* Work Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{assignment.work_name}</p>
        </div>
        
        {/* Hint indicator when closed */}
        {translateX === 0 && (
          <div className="text-gray-300 text-xs select-none">⟨</div>
        )}
      </div>
    </div>
  );
}
