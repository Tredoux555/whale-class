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
  onRecordVideo?: () => void; // Separate handler for video recording
  onWatchVideo: () => void;
  onWorkChanged: (assignmentId: string, newWorkId: string, newWorkName: string) => void;
  onNotesChanged?: (assignmentId: string, notes: string) => void;
}

const SWIPE_THRESHOLD_X = 50;

export default function SwipeableWorkRow({
  assignment,
  childId,
  areaConfig,
  statusConfig,
  onStatusTap,
  onCapture,
  onRecordVideo,
  onWatchVideo,
  onWorkChanged,
  onNotesChanged,
}: SwipeableWorkRowProps) {
  // Horizontal swipe state (changing works)
  const [translateX, setTranslateX] = useState(0);
  const [curriculumWorks, setCurriculumWorks] = useState<CurriculumWork[]>([]);
  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  
  // Vertical swipe state (action panel)
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Touch tracking
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeDirection = useRef<'horizontal' | 'vertical' | null>(null);
  const hasFetchedCurriculum = useRef(false);
  
  // Notes state
  const [notes, setNotes] = useState(assignment.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync notes when assignment changes
  useEffect(() => {
    setNotes(assignment.notes || '');
  }, [assignment.id, assignment.notes]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (notesTimeoutRef.current) {
        clearTimeout(notesTimeoutRef.current);
      }
    };
  }, []);

  // Fetch curriculum works for this area on first swipe attempt
  const fetchCurriculumWorks = async () => {
    if (hasFetchedCurriculum.current) return;
    hasFetchedCurriculum.current = true;
    
    try {
      const res = await fetch(`/api/curriculum/works-by-area?area=${encodeURIComponent(assignment.area)}`);
      const data = await res.json();
      if (data.works) {
        setCurriculumWorks(data.works);
        const idx = data.works.findIndex((w: CurriculumWork) => 
          w.name === assignment.work_name || w.id === assignment.work_id
        );
        setCurrentWorkIndex(idx >= 0 ? idx : 0);
      }
    } catch (err) {
      console.error('Failed to fetch curriculum works:', err);
    }
  };

  // Save notes with debounce
  const saveNotes = async (newNotes: string) => {
    setIsSavingNotes(true);
    try {
      await fetch(`/api/weekly-planning/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });
      onNotesChanged?.(assignment.id, newNotes);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    
    // Debounce save
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }
    notesTimeoutRef.current = setTimeout(() => {
      saveNotes(newNotes);
    }, 800);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeDirection.current = null;
    setIsDragging(true);
    fetchCurriculumWorks();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isAnimating) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Determine swipe direction on first significant movement
    if (swipeDirection.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        if (Math.abs(diffY) > Math.abs(diffX) && diffY > 0) {
          // Swiping down
          swipeDirection.current = 'vertical';
        } else if (Math.abs(diffX) > Math.abs(diffY)) {
          // Swiping horizontally
          swipeDirection.current = 'horizontal';
        } else {
          // Swiping up or unclear - cancel
          setIsDragging(false);
          return;
        }
      }
    }

    if (swipeDirection.current === 'horizontal') {
      e.preventDefault();
      
      // Add resistance at edges
      const canGoNext = currentWorkIndex < curriculumWorks.length - 1;
      const canGoPrev = currentWorkIndex > 0;
      
      let resistance = 1;
      if ((diffX > 0 && !canGoPrev) || (diffX < 0 && !canGoNext)) {
        resistance = 0.15;
      }
      
      setTranslateX(diffX * resistance);
    } else if (swipeDirection.current === 'vertical') {
      // For vertical, we just track if it's a valid downward swipe
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging || isAnimating) return;
    setIsDragging(false);

    const endX = translateX;

    if (swipeDirection.current === 'horizontal') {
      const swipedLeft = endX < -SWIPE_THRESHOLD_X;
      const swipedRight = endX > SWIPE_THRESHOLD_X;
      
      if (swipedLeft && currentWorkIndex < curriculumWorks.length - 1) {
        // Go to next work
        setIsAnimating(true);
        setTranslateX(-280);
        
        const nextWork = curriculumWorks[currentWorkIndex + 1];
        
        setTimeout(async () => {
          await updateAssignment(nextWork);
          setCurrentWorkIndex(currentWorkIndex + 1);
          setTranslateX(0);
          setIsAnimating(false);
        }, 180);
        
      } else if (swipedRight && currentWorkIndex > 0) {
        // Go to previous work
        setIsAnimating(true);
        setTranslateX(280);
        
        const prevWork = curriculumWorks[currentWorkIndex - 1];
        
        setTimeout(async () => {
          await updateAssignment(prevWork);
          setCurrentWorkIndex(currentWorkIndex - 1);
          setTranslateX(0);
          setIsAnimating(false);
        }, 180);
        
      } else {
        // Snap back with spring effect
        setTranslateX(0);
      }
    } else if (swipeDirection.current === 'vertical') {
      // Toggle panel
      setIsPanelOpen(prev => !prev);
    }
    
    swipeDirection.current = null;
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

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  // Handle video capture - use separate handler if provided, otherwise fall back to photo capture
  const handleRecordVideo = () => {
    if (onRecordVideo) {
      onRecordVideo();
    } else {
      onCapture(); // Fallback to same handler
    }
    closePanel();
  };

  // Show position indicator if we have curriculum data
  const showPosition = curriculumWorks.length > 0 && currentWorkIndex >= 0;
  const hasNotes = notes && notes.trim().length > 0;

  return (
    <div className="relative overflow-hidden">
      {/* Main row content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex items-center gap-2 px-3 py-2.5 bg-white cursor-grab active:cursor-grabbing
          ${isDragging && swipeDirection.current === 'horizontal' ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ 
          transform: `translateX(${translateX}px)`,
          willChange: isDragging ? 'transform' : 'auto',
        }}
      >
        {/* Area Badge */}
        <span className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center shrink-0 ${areaConfig.color}`}>
          {areaConfig.letter}
        </span>
        
        {/* Status Button */}
        <button
          onClick={onStatusTap}
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0
            ${statusConfig.color} active:scale-90 transition-transform duration-100`}
        >
          {statusConfig.label}
        </button>
        
        {/* Work Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{assignment.work_name}</p>
          <div className="flex items-center gap-2">
            {showPosition && (
              <p className="text-[10px] text-gray-400">{currentWorkIndex + 1}/{curriculumWorks.length}</p>
            )}
            {hasNotes && (
              <span className="text-[10px] text-blue-500">📝</span>
            )}
          </div>
        </div>
        
        {/* Swipe down indicator */}
        <div className="w-6 h-6 flex items-center justify-center text-gray-300">
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isPanelOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Swipe-down Action Panel */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-out ${isPanelOpen ? 'max-h-64' : 'max-h-0'}`}
      >
        <div className="bg-gray-50 border-t border-gray-100 px-3 py-3 space-y-3">
          {/* Notes Input */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1">
              📝 Notes
              {isSavingNotes && <span className="text-blue-500 text-[10px]">saving...</span>}
            </label>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Add observation notes for this work..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { onCapture(); closePanel(); }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 active:scale-95 transition-all text-sm font-medium"
            >
              📷 Photo
            </button>
            <button
              onClick={handleRecordVideo}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 active:scale-95 transition-all text-sm font-medium"
            >
              🎥 Video
            </button>
            <button
              onClick={() => { onWatchVideo(); closePanel(); }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 active:scale-95 transition-all text-sm font-medium"
            >
              ▶️ Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
