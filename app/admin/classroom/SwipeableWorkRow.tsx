'use client';

import { useState, useRef, useEffect } from 'react';
import WorkDescription from './WorkDescription';

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

interface WorkLevel {
  level: number;
  name: string;
  description: string;
}

interface WorkDescriptionData {
  id: string;
  name: string;
  description: string;
  chineseName?: string;
  materials: string[];
  directAims: string[];
  indirectAims: string[];
  controlOfError: string;
  levels: WorkLevel[];
  ageRange?: string;
}

interface SwipeableWorkRowProps {
  assignment: WorkAssignment;
  childId: string;
  areaConfig: { letter: string; color: string };
  statusConfig: { label: string; color: string; next: string };
  onStatusTap: (e: React.MouseEvent) => void;
  onCapture: () => void;
  onRecordVideo?: () => void;
  onWatchVideo: () => void;
  onWorkChanged: (assignmentId: string, newWorkId: string, newWorkName: string) => void;
  onNotesChanged?: (assignmentId: string, notes: string) => void;
}

const SWIPE_THRESHOLD = 50;

export default function SwipeableWorkRow({
  assignment,
  areaConfig,
  statusConfig,
  onStatusTap,
  onCapture,
  onRecordVideo,
  onWatchVideo,
  onWorkChanged,
  onNotesChanged,
}: SwipeableWorkRowProps) {
  // Swipe state
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Curriculum navigation
  const [curriculumWorks, setCurriculumWorks] = useState<CurriculumWork[]>([]);
  const [currentWorkIndex, setCurrentWorkIndex] = useState(-1);
  const hasFetchedCurriculum = useRef(false);
  
  // Panel state - simple toggle, no gesture needed
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Work description state
  const [workDescription, setWorkDescription] = useState<WorkDescriptionData | null>(null);
  const [descriptionArea, setDescriptionArea] = useState<string>('');
  const [descriptionCategory, setDescriptionCategory] = useState<string>('');
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string>('');
  const hasFetchedDescription = useRef(false);
  
  // Touch tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  
  // Notes state
  const [notes, setNotes] = useState(assignment.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync notes when assignment changes
  useEffect(() => {
    setNotes(assignment.notes || '');
  }, [assignment.id, assignment.notes]);

  // Reset description fetch flag when work changes
  useEffect(() => {
    hasFetchedDescription.current = false;
    setWorkDescription(null);
    setDescriptionError('');
  }, [assignment.work_name]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    };
  }, []);

  // Fetch curriculum works
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
      console.error('Failed to fetch curriculum:', err);
    }
  };

  // Fetch work description when panel opens
  const fetchWorkDescription = async () => {
    if (hasFetchedDescription.current) return;
    hasFetchedDescription.current = true;
    
    setLoadingDescription(true);
    setDescriptionError('');
    
    try {
      const res = await fetch(`/api/curriculum/work-description?name=${encodeURIComponent(assignment.work_name)}`);
      const data = await res.json();
      
      if (data.found && data.work) {
        setWorkDescription(data.work);
        setDescriptionArea(data.area || '');
        setDescriptionCategory(data.category || '');
      } else {
        setDescriptionError('No activity guide available for this work yet');
      }
    } catch (err) {
      console.error('Failed to fetch work description:', err);
      setDescriptionError('Could not load activity guide');
    } finally {
      setLoadingDescription(false);
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
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(() => saveNotes(newNotes), 800);
  };

  // Touch handlers for horizontal swipe only
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = false;
    setIsDragging(true);
    fetchCurriculumWorks();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isAnimating) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Determine if this is a horizontal swipe (only on first significant movement)
    if (!isHorizontalSwipe.current && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      // If mostly horizontal, lock to horizontal swipe
      if (Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        isHorizontalSwipe.current = true;
      } else {
        // Vertical scroll - let browser handle it
        setIsDragging(false);
        return;
      }
    }

    if (isHorizontalSwipe.current) {
      // Prevent page scroll during horizontal swipe
      e.preventDefault();
      e.stopPropagation();
      
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

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!isHorizontalSwipe.current) {
      setTranslateX(0);
      return;
    }

    const swipedLeft = translateX < -SWIPE_THRESHOLD;
    const swipedRight = translateX > SWIPE_THRESHOLD;
    
    if (swipedLeft && currentWorkIndex < curriculumWorks.length - 1) {
      // Animate out to left, then snap to new work
      setIsAnimating(true);
      setTranslateX(-300);
      
      const nextWork = curriculumWorks[currentWorkIndex + 1];
      setTimeout(async () => {
        await updateAssignment(nextWork);
        setCurrentWorkIndex(currentWorkIndex + 1);
        setTranslateX(0);
        setIsAnimating(false);
        // Reset description for new work
        hasFetchedDescription.current = false;
        setWorkDescription(null);
      }, 150);
      
    } else if (swipedRight && currentWorkIndex > 0) {
      // Animate out to right, then snap to new work
      setIsAnimating(true);
      setTranslateX(300);
      
      const prevWork = curriculumWorks[currentWorkIndex - 1];
      setTimeout(async () => {
        await updateAssignment(prevWork);
        setCurrentWorkIndex(currentWorkIndex - 1);
        setTranslateX(0);
        setIsAnimating(false);
        // Reset description for new work
        hasFetchedDescription.current = false;
        setWorkDescription(null);
      }, 150);
      
    } else {
      // Snap back
      setTranslateX(0);
    }
    
    isHorizontalSwipe.current = false;
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

  // Toggle panel - simple click handler
  const togglePanel = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willOpen = !isPanelOpen;
    setIsPanelOpen(willOpen);
    
    // Fetch description when opening panel
    if (willOpen) {
      fetchWorkDescription();
    }
  };

  const closePanel = () => setIsPanelOpen(false);

  const handleRecordVideo = () => {
    if (onRecordVideo) onRecordVideo();
    else onCapture();
    closePanel();
  };

  const showPosition = curriculumWorks.length > 0 && currentWorkIndex >= 0;
  const hasNotes = notes && notes.trim().length > 0;

  return (
    <div className="relative overflow-hidden bg-white">
      {/* Main swipeable row */}
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 150ms ease-out',
          touchAction: 'pan-y', // Allow vertical scroll, we handle horizontal
        }}
      >
        {/* Area Badge */}
        <span className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center shrink-0 ${areaConfig.color}`}>
          {areaConfig.letter}
        </span>
        
        {/* Status Button */}
        <button
          onClick={onStatusTap}
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${statusConfig.color} active:scale-90 transition-transform`}
        >
          {statusConfig.label}
        </button>
        
        {/* Work Name - tap to toggle panel */}
        <div 
          className="flex-1 min-w-0 cursor-pointer active:bg-gray-50 rounded px-1 -mx-1"
          onClick={togglePanel}
        >
          <p className="text-sm font-medium truncate">{assignment.work_name}</p>
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {showPosition && <span>{currentWorkIndex + 1}/{curriculumWorks.length}</span>}
            {hasNotes && <span className="text-blue-500">📝</span>}
            <span className="text-gray-300">← swipe →</span>
          </div>
        </div>
        
        {/* Expand/Collapse Button */}
        <button
          onClick={togglePanel}
          className="w-8 h-8 flex items-center justify-center text-gray-400 active:bg-gray-100 rounded-full"
        >
          <svg 
            className={`w-5 h-5 transition-transform duration-200 ${isPanelOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Action Panel - animates open/closed */}
      <div 
        className={`overflow-hidden transition-all duration-200 ease-out ${isPanelOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-gray-50 border-t border-gray-100 px-3 py-3 space-y-3">
          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500">📝 Notes</span>
              {isSavingNotes && <span className="text-[10px] text-blue-500">saving...</span>}
            </div>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Add observation notes..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { onCapture(); closePanel(); }}
              className="flex-1 py-2.5 bg-green-100 text-green-700 rounded-lg active:scale-95 transition-transform text-sm font-medium"
            >
              📷 Photo
            </button>
            <button
              onClick={handleRecordVideo}
              className="flex-1 py-2.5 bg-purple-100 text-purple-700 rounded-lg active:scale-95 transition-transform text-sm font-medium"
            >
              🎥 Video
            </button>
            <button
              onClick={() => { onWatchVideo(); closePanel(); }}
              className="flex-1 py-2.5 bg-red-100 text-red-700 rounded-lg active:scale-95 transition-transform text-sm font-medium"
            >
              ▶️ Demo
            </button>
          </div>
        </div>
        
        {/* Work Description / Activity Guide */}
        <WorkDescription 
          data={workDescription}
          area={descriptionArea}
          category={descriptionCategory}
          loading={loadingDescription}
          error={descriptionError}
        />
      </div>
    </div>
  );
}
