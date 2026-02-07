import { useCallback } from 'react';
import { toast } from 'sonner';
import { MergedWork } from '@/components/montree/curriculum/types';

interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean;
}

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  area_id?: string;
}

interface Session {
  teacher?: {
    id: string;
  };
  classroom?: {
    id: string;
  };
}

const STATUS_FLOW = ['not_started', 'presented', 'practicing', 'mastered'];

interface UseWorkOperationsParams {
  childId: string;
  focusWorks: Assignment[];
  setFocusWorks: (works: Assignment[] | ((prev: Assignment[]) => Assignment[])) => void;
  extraWorks: Assignment[];
  setExtraWorks: (works: Assignment[] | ((prev: Assignment[]) => Assignment[])) => void;
  wheelPickerArea: string;
  session: Session | null;
  allWorks: Assignment[];
  setWheelPickerOpen: (open: boolean) => void;
  fetchAssignments: () => void;
}

export function useWorkOperations({
  childId,
  focusWorks,
  setFocusWorks,
  extraWorks,
  setExtraWorks,
  wheelPickerArea,
  session,
  allWorks,
  setWheelPickerOpen,
  fetchAssignments,
}: UseWorkOperationsParams) {
  // Cycle status on tap (works for both focus and extras)
  const cycleStatus = useCallback(async (work: Assignment, isFocus: boolean) => {
    const currentIdx = STATUS_FLOW.indexOf(work.status || 'not_started');
    const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];

    // Optimistic update
    if (isFocus) {
      setFocusWorks(prev => prev.map(w =>
        w.work_name === work.work_name ? { ...w, status: nextStatus } : w
      ));
    } else {
      setExtraWorks(prev => prev.map(w =>
        w.work_name === work.work_name ? { ...w, status: nextStatus } : w
      ));
    }

    try {
      const res = await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.work_name,
          area: work.area,
          status: nextStatus
        }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      toast.error('Failed to update');
      // Revert optimistic update
      if (isFocus) {
        setFocusWorks(prev => prev.map(w =>
          w.work_name === work.work_name ? { ...w, status: work.status } : w
        ));
      } else {
        setExtraWorks(prev => prev.map(w =>
          w.work_name === work.work_name ? { ...w, status: work.status } : w
        ));
      }
    }
  }, [childId, setFocusWorks, setExtraWorks]);

  // Remove an extra work (not for focus works)
  const removeExtra = useCallback(async (work: Assignment) => {
    // OPTIMISTIC - remove from UI immediately
    const removedWork = work;
    setExtraWorks(prev => prev.filter(w => w.work_name !== work.work_name));
    toast.success('Removed');

    // Background API call
    try {
      const res = await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.work_name,
          area: work.area,
          status: 'mastered'  // Mark as mastered (not completed) to hide from extras
        }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      // Revert on failure
      setExtraWorks(prev => [...prev, removedWork]);
      toast.error('Failed to remove');
    }
  }, [childId, setExtraWorks]);

  // Handle work selection from wheel picker - sets as new FOCUS work for area
  const handleWheelPickerSelect = useCallback(async (work: MergedWork, status: string) => {
    const area = wheelPickerArea === 'math' ? 'mathematics' : wheelPickerArea;
    const newStatus = status;

    // Store old focus work for revert
    const oldFocusWork = focusWorks.find(w => {
      const wArea = w.area === 'math' ? 'mathematics' : w.area;
      return wArea === area;
    });

    // OPTIMISTIC UPDATE - update UI immediately
    setFocusWorks(prev => prev.map(w => {
      const wArea = w.area === 'math' ? 'mathematics' : w.area;
      if (wArea === area) {
        return { work_name: work.name, area: area, status: newStatus, is_focus: true };
      }
      return w;
    }));
    setWheelPickerOpen(false);
    toast.success(`Focus: ${work.name}`);

    // Background API call
    try {
      const res = await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.name,
          area: area,
          status: newStatus,
          is_focus: true,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      // Revert on failure
      if (oldFocusWork) {
        setFocusWorks(prev => prev.map(w => {
          const wArea = w.area === 'math' ? 'mathematics' : w.area;
          if (wArea === area) return oldFocusWork;
          return w;
        }));
      }
      toast.error('Failed to update');
    }
  }, [childId, wheelPickerArea, focusWorks, setFocusWorks, setWheelPickerOpen]);

  // Handle adding a work as an EXTRA (not focus) from wheel picker
  const handleWheelPickerAddExtra = useCallback(async (work: MergedWork) => {
    const area = wheelPickerArea === 'math' ? 'mathematics' : wheelPickerArea;

    // Check if already exists
    const existing = allWorks.find(w => w.work_name?.toLowerCase() === work.name?.toLowerCase());
    if (existing) {
      toast.error('Already added');
      return;
    }

    // OPTIMISTIC UPDATE - add to UI immediately
    const newExtra: Assignment = {
      work_name: work.name,
      area: area,
      status: 'presented',
      is_focus: false,
    };
    setExtraWorks(prev => [...prev, newExtra]);
    setWheelPickerOpen(false);
    toast.success(`Added: ${work.name}`);

    // Background API call
    try {
      const res = await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.name,
          area: area,
          status: 'presented',
          is_focus: false,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      // Revert on failure
      setExtraWorks(prev => prev.filter(w => w.work_name !== work.name));
      toast.error('Failed to add');
    }
  }, [childId, wheelPickerArea, allWorks, setExtraWorks, setWheelPickerOpen]);

  // Add work as an EXTRA (not focus)
  const addWork = useCallback(async (work: CurriculumWork, selectedArea: string | null) => {
    // Check if already exists in focus or extras
    const existing = allWorks.find(a => a.work_name?.toLowerCase() === work.name?.toLowerCase());
    if (existing) {
      toast.error('Already added');
      return;
    }

    try {
      // Add the new work as an extra (presented status)
      await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.name,
          area: work.area_id || selectedArea,
          status: 'presented'
        }),
      });

      toast.success(`Added: ${work.name}`);
      fetchAssignments();
    } catch {
      toast.error('Failed to add');
    }
  }, [childId, allWorks, fetchAssignments]);

  // Save note (uses work_name as key)
  const saveNote = useCallback(async (work: Assignment, noteText: string) => {
    if (!noteText?.trim()) return;

    try {
      const res = await fetch('/api/montree/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.work_name,
          area: work.area,
          notes: noteText,
          teacher_id: session?.teacher?.id,
        }),
      });
      if (res.ok) {
        toast.success('Note saved!');
        return true;
      }
    } catch {
      toast.error('Error saving');
    }
    return false;
  }, [childId, session?.teacher?.id]);

  return {
    cycleStatus,
    removeExtra,
    handleWheelPickerSelect,
    handleWheelPickerAddExtra,
    addWork,
    saveNote,
  };
}
