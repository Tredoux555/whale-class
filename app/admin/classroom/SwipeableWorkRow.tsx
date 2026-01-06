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

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  area: string;
}

interface SwipeableWorkRowProps {
  assignment: WorkAssignment;
  childId: string;
  areaConfig: { letter: string; color: string };
  statusConfig: { label: string; color: string; next: string };
  onStatusTap: (e: React.MouseEvent) => void;
  onCapture: () => void;
  onWatchVideo: () => void;
  onWorkChanged: (assignmentId: string, newWorkId: string, newWorkName: string) => void;
}

const SWIPE_THRESHOLD = 60;

export default function SwipeableWorkRow({
  assignment,
  childId,
  areaConfig,
  statusConfig,
  onStatusTap,
  onCapture,
  onWatchVideo,
  onWorkChanged,
}: SwipeableWorkRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [curriculumWorks, setCurriculumWorks] = useState<CurriculumWork[]>([]);
  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const hasFetchedCurriculum = useRef(false);

  // Fetch curriculum works for this area on first swipe attempt
  const fetchCurriculumWorks = async () => {
    if (hasFetchedCurriculum.current) return;
    hasFetchedCurriculum.current = true;
    
    try {
      const res = await fetch(`/api/curriculum/works-by-area?area=${encodeURIComponent(assignment.area)}`);
      const data = await res.json();
      if (data.works) {
        setCurriculumWorks(data.works);
        // Find current work's position
        const idx = data.works.findIndex((w: CurriculumWork) => 
          w.name === assignment.work_name || w.id === assignment.work_id
        );
        setCurrentWorkIndex(idx >= 0 ? idx : 0);
      }
    } catch (err) {
      console.error('Failed to fetch curriculum works:', err);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
    
    // Pre-fetch curriculum on touch start
    fetchCurriculumWorks();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isAnimating) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

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
      const canGoNext = currentWorkIndex < curriculumWorks.length - 1;
      const canGoPrev = currentWorkIndex > 0;
      
      let resistance = 1;
      if ((diffX > 0 && !canGoPrev) || (diffX < 0 && !canGoNext)) {
        resistance = 0.2;
      }
      
      setTranslateX(diffX * resistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging || isAnimating) return;
    setIsDragging(false);

    const swipedLeft = translateX < -SWIPE_THRESHOLD;
    const swipedRight = translateX > SWIPE_THRESHOLD;
    
    if (swipedLeft && currentWorkIndex < curriculumWorks.length - 1) {
      // Go to next work in curriculum
      setIsAnimating(true);
      setTranslateX(-300);
      
      const nextWork = curriculumWorks[currentWorkIndex + 1];
      
      setTimeout(async () => {
        // Update the assignment
        await updateAssignment(nextWork);
        setCurrentWorkIndex(currentWorkIndex + 1);
        setTranslateX(0);
        setIsAnimating(false);
      }, 150);
      
    } else if (swipedRight && currentWorkIndex > 0) {
      // Go to previous work in curriculum
      setIsAnimating(true);
      setTranslateX(300);
      
      const prevWork = curriculumWorks[currentWorkIndex - 1];
      
      setTimeout(async () => {
        await updateAssignment(prevWork);
        setCurrentWorkIndex(currentWorkIndex - 1);
        setTranslateX(0);
        setIsAnimating(false);
      }, 150);
      
    } else {
      // Snap back
      setTranslateX(0);
    }
    
    isHorizontalSwipe.current = null;
  };

  const updateAssignment = async (newWork: CurriculumWork) => {
    try {
      await fetch(`/api/weekly-planning/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: newWork.id,
          work_name: newWork.name,
          work_name_chinese: newWork.name_chinese,
        }),
      });
      onWorkChanged(assignment.id, newWork.id, newWork.name);
    } catch (err) {
      console.error('Failed to update assignment:', err);
    }
  };

  // Show position indicator if we have curriculum data
  const showPosition = curriculumWorks.length > 0 && currentWorkIndex >= 0;

  return (
    <div 
      className="relative overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Main row content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex items-center gap-2 px-3 py-2 bg-white
          ${isDragging ? '' : 'transition-transform duration-150 ease-out'}`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {/* Area Badge */}
        <span className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center shrink-0 ${areaConfig.color}`}>
          {areaConfig.letter}
        </span>
        
        {/* Status Button */}
        <button
          onClick={onStatusTap}
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
            ${statusConfig.color} active:scale-95 transition-transform`}
        >
          {statusConfig.label}
        </button>
        
        {/* Work Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{assignment.work_name}</p>
          {showPosition && (
            <p className="text-xs text-gray-400">{currentWorkIndex + 1}/{curriculumWorks.length} in {assignment.area.replace('_', ' ')}</p>
          )}
        </div>
        
        {/* Capture Button */}
        <button
          onClick={onCapture}
          className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center hover:bg-green-200 active:scale-95 transition-all shrink-0"
          title="Take photo or video"
        >
          📷
        </button>
        
        {/* Watch Video Button */}
        <button
          onClick={onWatchVideo}
          className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center hover:bg-red-200 active:scale-95 transition-all shrink-0"
          title="Watch presentation video"
        >
          ▶️
        </button>
      </div>
    </div>
  );
}
