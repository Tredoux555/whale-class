import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Work } from '@/components/montree/curriculum/types';

interface UseCurriculumDragDropProps {
  selectedArea: string | null;
  byArea: Record<string, Work[]>;
  setByArea: (update: Record<string, Work[]> | ((prev: Record<string, Work[]>) => Record<string, Work[]>)) => void;
  session: { classroom: { id: string } };
  fetchCurriculum: () => Promise<void>;
}

export function useCurriculumDragDrop({
  selectedArea,
  byArea,
  setByArea,
  session,
  fetchCurriculum,
}: UseCurriculumDragDropProps) {
  const [draggedWork, setDraggedWork] = useState<Work | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback((direction: 'up' | 'down', speed: number) => {
    const scroll = () => {
      if (scrollContainerRef.current) {
        const scrollAmount = direction === 'up' ? -speed : speed;
        scrollContainerRef.current.scrollTop += scrollAmount;
      }
      autoScrollRef.current = requestAnimationFrame(scroll);
    };
    stopAutoScroll();
    autoScrollRef.current = requestAnimationFrame(scroll);
  }, [stopAutoScroll]);

  const handleDragStart = (e: React.DragEvent, work: Work) => {
    setDraggedWork(work);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', work.id);
  };

  const handleDragOver = (e: React.DragEvent, workId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedWork && workId !== draggedWork.id) {
      setDragOverId(workId);
    }

    // Auto-scroll when near edges
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY;
      const edgeThreshold = 60;
      const scrollSpeed = 8;

      if (mouseY < rect.top + edgeThreshold) {
        const proximity = 1 - (mouseY - rect.top) / edgeThreshold;
        startAutoScroll('up', scrollSpeed * Math.max(0.5, proximity));
      } else if (mouseY > rect.bottom - edgeThreshold) {
        const proximity = 1 - (rect.bottom - mouseY) / edgeThreshold;
        startAutoScroll('down', scrollSpeed * Math.max(0.5, proximity));
      } else {
        stopAutoScroll();
      }
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetWork: Work) => {
    e.preventDefault();
    setDragOverId(null);
    stopAutoScroll();

    if (!draggedWork || !selectedArea || draggedWork.id === targetWork.id) {
      setDraggedWork(null);
      return;
    }

    // Get current works list for this area
    const areaWorks = [...(byArea[selectedArea] || [])];
    const draggedIndex = areaWorks.findIndex(w => w.id === draggedWork.id);
    const targetIndex = areaWorks.findIndex(w => w.id === targetWork.id);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWork(null);
      return;
    }

    // Reorder locally
    const [removed] = areaWorks.splice(draggedIndex, 1);
    areaWorks.splice(targetIndex, 0, removed);

    // Update local state immediately for responsive UI
    setByArea(prev => ({
      ...prev,
      [selectedArea]: areaWorks
    }));

    // Save to database
    setReordering(true);
    try {
      const items = areaWorks.map((w, idx) => ({ id: w.id, sequence: idx + 1 }));
      const res = await fetch('/api/montree/curriculum/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroom.id,
          area_id: selectedArea,
          items
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Order saved!');
      } else {
        toast.error('Failed to save order');
        fetchCurriculum();
      }
    } catch (err) {
      toast.error('Failed to save order');
      fetchCurriculum();
    }
    setReordering(false);
    setDraggedWork(null);
  };

  const handleDragEnd = () => {
    setDraggedWork(null);
    setDragOverId(null);
    stopAutoScroll();
  };

  return {
    // State
    draggedWork,
    dragOverId,
    reordering,
    scrollContainerRef,
    // Handlers
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    // Utilities
    startAutoScroll,
    stopAutoScroll,
  };
}
