// /montree/dashboard/[childId]/page.tsx
// Session 112: Week view - child's weekly works
// Session 115: Added Focus Mode view toggle
// Layout handles auth + header + tabs
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { AREA_CONFIG } from '@/lib/montree/types';
import InviteParentModal from '@/components/montree/InviteParentModal';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';

interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean; // true = priority work for area, false = extra work child chose
}

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  area_id?: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  not_started: { label: '○', bg: 'bg-gray-200', text: 'text-gray-600' },
  presented: { label: 'P', bg: 'bg-amber-300', text: 'text-amber-800' },
  practicing: { label: 'Pr', bg: 'bg-blue-400', text: 'text-blue-800' },
  mastered: { label: 'M', bg: 'bg-emerald-400', text: 'text-emerald-800' },
  completed: { label: 'M', bg: 'bg-emerald-400', text: 'text-emerald-800' }, // Legacy alias
};

const STATUS_FLOW = ['not_started', 'presented', 'practicing', 'mastered'];

// Fuzzy matching for intelligent work placement
const fuzzyScore = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  // Word-level matching
  const words1 = s1.split(/[\s\-_]+/).filter(w => w.length > 2);
  const words2 = s2.split(/[\s\-_]+/).filter(w => w.length > 2);

  let matchScore = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2) matchScore += 0.3;
      else if (w1.includes(w2) || w2.includes(w1)) matchScore += 0.2;
      else if (w1.slice(0, 4) === w2.slice(0, 4)) matchScore += 0.1; // Same prefix
    }
  }

  return Math.min(matchScore, 0.8);
};

// Find best insertion position for a work based on fuzzy matching
const findBestPosition = (workName: string, curriculumWorks: any[]): number => {
  if (curriculumWorks.length === 0) return 0;

  let bestScore = 0;
  let bestIndex = curriculumWorks.length; // Default: end of list

  for (let i = 0; i < curriculumWorks.length; i++) {
    const score = fuzzyScore(workName, curriculumWorks[i].name);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i + 1; // Insert after the match
    }
  }

  // If very low score, try to group by keywords
  if (bestScore < 0.2) {
    const lowerName = workName.toLowerCase();
    // Common Montessori groupings
    const keywords = [
      { terms: ['pour', 'transfer', 'spoon', 'tong', 'scoop'], range: [0, 10] },
      { terms: ['button', 'zip', 'snap', 'lace', 'bow', 'dress'], range: [10, 20] },
      { terms: ['wash', 'clean', 'polish', 'fold', 'sweep'], range: [20, 35] },
      { terms: ['food', 'cut', 'slice', 'peel', 'prepare', 'cook'], range: [35, 50] },
      { terms: ['count', 'number', 'bead', 'rod'], range: [0, 30] },
      { terms: ['add', 'subtract', 'plus', 'minus'], range: [30, 60] },
      { terms: ['multiply', 'divide', 'stamp'], range: [60, 90] },
      { terms: ['letter', 'sound', 'phonetic', 'alphabet'], range: [0, 20] },
      { terms: ['word', 'read', 'sentence', 'story'], range: [40, 80] },
      { terms: ['cylinder', 'block', 'tower', 'stair'], range: [0, 15] },
      { terms: ['color', 'tablet', 'shade'], range: [15, 25] },
      { terms: ['geometry', 'shape', 'triangle', 'square'], range: [25, 50] },
    ];

    for (const group of keywords) {
      if (group.terms.some(t => lowerName.includes(t))) {
        // Place within the range, or at start of range if curriculum is shorter
        bestIndex = Math.min(group.range[0], curriculumWorks.length);
        break;
      }
    }
  }

  return bestIndex;
};

// Merge imported works into curriculum with intelligent positioning
const mergeWorksWithCurriculum = (
  curriculumWorks: any[],
  assignedWorks: Assignment[],
  areaKey: string
): any[] => {
  // Start with curriculum works
  const merged = [...curriculumWorks];

  // Find assigned works in this area that aren't in curriculum
  const areaAssignments = assignedWorks.filter(a => {
    const assignedArea = a.area === 'math' ? 'mathematics' : a.area;
    const checkArea = areaKey === 'math' ? 'mathematics' : areaKey;
    return assignedArea === checkArea || a.area === areaKey;
  });

  const missingWorks = areaAssignments.filter(a =>
    !curriculumWorks.find(c => c.name?.toLowerCase() === a.work_name?.toLowerCase())
  );

  // Insert each missing work at its best position
  for (const missing of missingWorks) {
    const position = findBestPosition(missing.work_name, merged);
    const newWork = {
      id: `imported-${missing.work_name}`,
      name: missing.work_name,
      status: missing.status || 'presented',
      sequence: 0, // Will be recalculated
      isImported: true,
    };
    merged.splice(position, 0, newWork);
  }

  // Recalculate sequences
  return merged.map((w, idx) => ({
    ...w,
    sequence: idx + 1,
  }));
};

export default function WeekPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;
  const session = getSession();
  
  // Invite parent modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  
  const [focusWorks, setFocusWorks] = useState<Assignment[]>([]); // One per area, always visible
  const [extraWorks, setExtraWorks] = useState<Assignment[]>([]); // Ad-hoc works child chose
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null); // Use work_name as key
  const [notes, setNotes] = useState<Record<string, string>>({}); // keyed by work_name
  const [savingNote, setSavingNote] = useState<string | null>(null); // work_name being saved
  
  // Work picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [curriculum, setCurriculum] = useState<Record<string, CurriculumWork[]>>({});
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  // All works combined (for checking if already added)
  const allWorks = [...focusWorks, ...extraWorks];

  // CRITICAL: Block refetch while saving to prevent race conditions
  const [isSaving, setIsSaving] = useState(false);
  
  // Next work suggestion state (removed modal - using wheel picker now)

  // Wheel picker state
  const [wheelPickerOpen, setWheelPickerOpen] = useState(false);
  const [wheelPickerArea, setWheelPickerArea] = useState<string>('');
  const [wheelPickerWorks, setWheelPickerWorks] = useState<any[]>([]);
  const [wheelPickerCurrentWork, setWheelPickerCurrentWork] = useState<string>('');

  // Quick Guide modal state
  const [quickGuideOpen, setQuickGuideOpen] = useState(false);
  const [quickGuideWork, setQuickGuideWork] = useState<string>('');
  const [quickGuideData, setQuickGuideData] = useState<any>(null);
  const [quickGuideLoading, setQuickGuideLoading] = useState(false);

  // Fetch quick guide for a work
  const openQuickGuide = async (workName: string) => {
    setQuickGuideWork(workName);
    setQuickGuideOpen(true);
    setQuickGuideLoading(true);
    setQuickGuideData(null);

    try {
      const classroomId = session?.classroom?.id;
      const url = classroomId
        ? `/api/montree/works/guide?name=${encodeURIComponent(workName)}&classroom_id=${classroomId}`
        : `/api/montree/works/guide?name=${encodeURIComponent(workName)}`;
      const res = await fetch(url);
      const data = await res.json();
      setQuickGuideData(data);
    } catch (err) {
      console.error('Failed to fetch guide:', err);
      setQuickGuideData({ error: true });
    }
    setQuickGuideLoading(false);
  };

  // Fetch progress and separate into focus works (1 per area) and extras
  const fetchAssignments = () => {
    // Don't refetch while a save is in progress (prevents race conditions)
    if (isSaving) return;

    fetch(`/api/montree/progress?child_id=${childId}`)
      .then(r => {
        if (!r.ok) {
          console.error('Progress API returned:', r.status);
          throw new Error('API error');
        }
        return r.json();
      })
      .then(data => {
        if (data.debug) {
          console.warn('Progress API debug:', data.debug);
        }

        const allProgress: Assignment[] = data.progress || [];
        const areaOrder = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
        const focus: Assignment[] = [];
        const extras: Assignment[] = [];
        const usedWorkNames = new Set<string>();

        // First pass: pick ONE focus work per area
        for (const area of areaOrder) {
          const areaWorks = allProgress.filter((p: Assignment) => {
            const pArea = p.area === 'math' ? 'mathematics' : p.area;
            return pArea === area;
          });

          if (areaWorks.length === 0) continue;

          // Priority: is_focus flag first, then practicing > presented > not_started > completed
          const statusPriority: Record<string, number> = {
            practicing: 1,
            presented: 2,
            not_started: 3,
            completed: 4,
            mastered: 4,
          };

          areaWorks.sort((a: Assignment, b: Assignment) => {
            // Focus flag takes priority
            if (a.is_focus && !b.is_focus) return -1;
            if (!a.is_focus && b.is_focus) return 1;
            // Then by status
            const aPriority = statusPriority[a.status] || 5;
            const bPriority = statusPriority[b.status] || 5;
            return aPriority - bPriority;
          });

          // Take the best one as focus work
          const focusWork = { ...areaWorks[0], is_focus: true };
          focus.push(focusWork);
          usedWorkNames.add(focusWork.work_name.toLowerCase());
        }

        // Second pass: everything else is an extra
        for (const p of allProgress) {
          if (!usedWorkNames.has(p.work_name.toLowerCase())) {
            // Only show non-completed extras (child is still working on them)
            if (p.status !== 'completed' && p.status !== 'mastered') {
              extras.push({ ...p, is_focus: false });
            }
          }
        }

        setFocusWorks(focus);
        setExtraWorks(extras);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch progress:', err);
        setFocusWorks([]);
        setExtraWorks([]);
        setLoading(false);
      });
  };

  // Fetch on mount and when childId changes
  useEffect(() => {
    if (childId) {
      setLoading(true);
      fetchAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // Also re-fetch when returning to this page (handles tab navigation)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && childId) {
        fetchAssignments();
      }
    };

    // Re-fetch on focus (when switching tabs or returning to page)
    const handleFocus = () => {
      if (childId) fetchAssignments();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [childId]);

  // PRE-CACHE curriculum for all areas (runs once on mount)
  useEffect(() => {
    const classroomId = session?.classroom?.id;
    const areas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

    // Load all areas in parallel in the background
    areas.forEach(async (areaKey) => {
      if (curriculum[areaKey]) return; // Skip if already cached
      try {
        const url = classroomId
          ? `/api/montree/works/search?area=${encodeURIComponent(areaKey)}&classroom_id=${classroomId}`
          : `/api/montree/works/search?area=${encodeURIComponent(areaKey)}`;
        const res = await fetch(url);
        const data = await res.json();
        const works = (data.works || []).map((w: any, idx: number) => ({
          id: w.id,
          name: w.name,
          name_chinese: w.chinese_name,
          status: 'not_started',
          sequence: idx + 1,
        }));
        setCurriculum(prev => ({ ...prev, [areaKey]: works }));
      } catch (err) {
        console.error(`Failed to pre-cache ${areaKey}:`, err);
      }
    });
  }, [session?.classroom?.id]); // Only re-run if classroom changes

  // Open wheel picker for a specific area - INSTANT with cached data
  const openWheelPicker = (area: string, currentWorkName?: string) => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);

    const areaKey = area === 'math' ? 'mathematics' : area;
    const cachedCurriculum = curriculum[areaKey] || curriculum[area] || [];

    // Set state and open immediately
    setWheelPickerArea(area);
    setWheelPickerCurrentWork(currentWorkName || '');

    if (cachedCurriculum.length > 0) {
      // INSTANT - use cached data with current progress
      const currentWorks = [...focusWorks, ...extraWorks];
      const updatedCurriculum = cachedCurriculum.map((w: any) => {
        const progress = currentWorks.find(a =>
          a.work_name?.toLowerCase() === w.name?.toLowerCase()
        );
        return { ...w, status: progress?.status || w.status || 'not_started' };
      });
      const mergedWorks = mergeWorksWithCurriculum(updatedCurriculum, currentWorks, areaKey);
      setWheelPickerWorks(mergedWorks);
    } else {
      // No cache yet - show empty and load in background
      setWheelPickerWorks([]);
      loadCurriculumForArea(areaKey);
    }

    setWheelPickerOpen(true);
  };

  // Background load curriculum for an area
  const loadCurriculumForArea = async (areaKey: string) => {
    const classroomId = session?.classroom?.id;
    try {
      const url = classroomId
        ? `/api/montree/works/search?area=${encodeURIComponent(areaKey)}&classroom_id=${classroomId}`
        : `/api/montree/works/search?area=${encodeURIComponent(areaKey)}`;
      const res = await fetch(url);
      const data = await res.json();

      const curriculumWorks = (data.works || []).map((w: any, idx: number) => {
        const progress = allWorks.find(a =>
          a.work_name?.toLowerCase() === w.name?.toLowerCase()
        );
        return {
          id: w.id,
          name: w.name,
          name_chinese: w.chinese_name,
          status: progress?.status || 'not_started',
          sequence: idx + 1,
        };
      });

      const mergedWorks = mergeWorksWithCurriculum(curriculumWorks, allWorks, areaKey);
      setWheelPickerWorks(mergedWorks);
      setCurriculum(prev => ({ ...prev, [areaKey]: curriculumWorks }));
    } catch (err) {
      console.error('Failed to load works:', err);
      toast.error('Failed to load works');
    }
  };

  // Refresh wheel picker works (after adding a new work)
  const refreshWheelPickerWorks = async () => {
    const areaKey = wheelPickerArea === 'math' ? 'mathematics' : wheelPickerArea;
    const classroomId = session?.classroom?.id;

    // Clear cache for this area
    setCurriculum(prev => {
      const updated = { ...prev };
      delete updated[areaKey];
      delete updated[wheelPickerArea];
      return updated;
    });

    // Re-fetch with classroom_id
    try {
      const url = classroomId
        ? `/api/montree/works/search?area=${encodeURIComponent(areaKey)}&classroom_id=${classroomId}`
        : `/api/montree/works/search?area=${encodeURIComponent(areaKey)}`;
      const res = await fetch(url);
      const data = await res.json();

      const currentWorks = [...focusWorks, ...extraWorks];
      const worksWithStatus = (data.works || []).map((w: any, idx: number) => {
        const progress = currentWorks.find(a =>
          a.work_name?.toLowerCase() === w.name?.toLowerCase()
        );
        return {
          id: w.id,
          name: w.name,
          name_chinese: w.chinese_name,
          status: progress?.status || 'not_started',
          sequence: idx + 1,
        };
      });

      setWheelPickerWorks(worksWithStatus);
      setCurriculum(prev => ({ ...prev, [areaKey]: worksWithStatus }));
      toast.success('Work added!');
    } catch (err) {
      console.error('Failed to refresh works:', err);
    }
  };

  // Handle work selection from wheel picker - sets as new FOCUS work for area
  const handleWheelPickerSelect = async (work: any, status: string) => {
    const area = wheelPickerArea === 'math' ? 'mathematics' : wheelPickerArea;
    const newStatus = status; // Use status as-is (mastered, not completed)

    // CRITICAL: Block refetch while saving
    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
    }
  };

  // Handle adding a work as an EXTRA (not focus) from wheel picker
  const handleWheelPickerAddExtra = async (work: any) => {
    const area = wheelPickerArea === 'math' ? 'mathematics' : wheelPickerArea;

    // Check if already exists
    const existing = allWorks.find(w => w.work_name?.toLowerCase() === work.name?.toLowerCase());
    if (existing) {
      toast.error('Already added');
      return;
    }

    // CRITICAL: Block refetch while saving
    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
    }
  };

  // Cycle status on tap (works for both focus and extras)
  const cycleStatus = async (work: Assignment, isFocus: boolean) => {
    const currentIdx = STATUS_FLOW.indexOf(work.status || 'not_started');
    const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];

    // CRITICAL: Block refetch while saving
    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
    }
  };

  // Remove an extra work (not for focus works) - OPTIMISTIC
  const removeExtra = async (work: Assignment) => {
    // CRITICAL: Block refetch while saving
    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
    }
  };

  // Open picker and fetch curriculum
  const openPicker = async () => {
    setPickerOpen(true);
    if (Object.keys(curriculum).length === 0) {
      setLoadingCurriculum(true);
      try {
        // Load all works at once
        const res = await fetch(`/api/montree/works/search`);
        const data = await res.json();
        
        // Group by area
        const byArea: Record<string, CurriculumWork[]> = {};
        for (const w of data.works || []) {
          const areaKey = w.area?.area_key || 'unknown';
          if (!byArea[areaKey]) byArea[areaKey] = [];
          byArea[areaKey].push({
            id: w.id,
            name: w.name,
            name_chinese: w.chinese_name,
            area_id: areaKey,
          });
        }
        setCurriculum(byArea);
      } catch {}
      setLoadingCurriculum(false);
    }
  };

  // Add work as an EXTRA (not focus)
  const addWork = async (work: CurriculumWork) => {
    // Check if already exists in focus or extras
    const allWorks = [...focusWorks, ...extraWorks];
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
      setPickerOpen(false);
      setSelectedArea(null);
      fetchAssignments();
    } catch {
      toast.error('Failed to add');
    }
  };

  // Save note (uses work_name as key)
  const saveNote = async (work: Assignment) => {
    const noteText = notes[work.work_name];
    if (!noteText?.trim()) return;

    setSavingNote(work.work_name);

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
        setNotes(prev => ({ ...prev, [work.work_name]: '' }));
      }
    } catch {
      toast.error('Error saving');
    }
    setSavingNote(null);
  };

  // Get area config
  const getAreaConfig = (area: string) => {
    return AREA_CONFIG[area] || AREA_CONFIG[area.replace('mathematics', 'math')] || { name: area, icon: '📋', color: '#888' };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-pulse text-3xl mb-2">📋</div>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Toaster position="top-center" richColors />
      
      {/* Invite Parent Modal */}
      <InviteParentModal
        childId={childId}
        childName={session?.classroom?.children?.find((c: any) => c.id === childId)?.name || 'Child'}
        teacherId={session?.teacher?.id}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
      
      {/* Invite Button - subtle, right-aligned */}
      <div className="flex justify-end">
        <button
          onClick={() => setInviteModalOpen(true)}
          className="px-3 py-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm transition-colors"
        >
          👨‍👩‍👧 Invite Parent
        </button>
      </div>

      {/* FOCUS WORKS - One per area, with extras grouped underneath */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">This Week's Focus</h2>
        {focusWorks.length > 0 ? (
          <div className="space-y-3">
            {focusWorks.map((work) => {
              const status = STATUS_CONFIG[work.status] || STATUS_CONFIG.not_started;
              const areaConfig = getAreaConfig(work.area);
              const isExpanded = expandedIndex === work.work_name;
              // Get extras for this area
              const areaExtras = extraWorks.filter(e => {
                const eArea = e.area === 'math' ? 'mathematics' : e.area;
                const wArea = work.area === 'math' ? 'mathematics' : work.area;
                return eArea === wArea;
              });

              return (
                <div key={work.work_name} className="space-y-1">
                  {/* Focus work row */}
                  <div className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${isExpanded ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    {/* Area icon - tap or long-press to swap focus work */}
                    <button
                      className="text-xl active:scale-90 transition-transform"
                      onClick={() => openWheelPicker(work.area, work.work_name)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openWheelPicker(work.area, work.work_name);
                      }}
                      onTouchStart={(e) => {
                        const timer = setTimeout(() => {
                          openWheelPicker(work.area, work.work_name);
                        }, 500);
                        const clear = () => clearTimeout(timer);
                        e.currentTarget.addEventListener('touchend', clear, { once: true });
                        e.currentTarget.addEventListener('touchmove', clear, { once: true });
                      }}
                      title="Tap to change work"
                    >
                      {areaConfig.icon}
                    </button>

                    {/* Work name - tap to expand */}
                    <button onClick={() => setExpandedIndex(isExpanded ? null : work.work_name)} className="flex-1 text-left">
                      <p className="font-medium text-gray-800 text-sm">{work.work_name}</p>
                    </button>

                    {/* Status badge - tap to cycle */}
                    <button
                      onClick={() => cycleStatus(work, true)}
                      className={`w-9 h-9 rounded-full ${status.bg} ${status.text} font-bold text-xs flex items-center justify-center shadow-sm active:scale-90 transition-transform`}
                    >
                      {status.label}
                    </button>

                    {/* Expand arrow */}
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : work.work_name)}
                      className={`text-gray-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      ▼
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-1 ml-7 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openQuickGuide(work.work_name)}
                          className="flex-[1] py-2.5 bg-amber-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-amber-600 active:scale-95"
                        >
                          📖
                        </button>
                        <button
                          onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(work.work_name + ' Montessori presentation')}`, '_blank')}
                          className="flex-[2] py-2.5 bg-red-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-red-600 active:scale-95"
                        >
                          ▶️ Demo
                        </button>
                        <button
                          onClick={() => window.location.href = `/montree/dashboard/capture?child=${childId}`}
                          className="flex-[2] py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-emerald-600 active:scale-95"
                        >
                          📸 Capture
                        </button>
                      </div>

                      {/* Notes */}
                      <div className="relative">
                        <textarea
                          value={notes[work.work_name] || ''}
                          onChange={(e) => setNotes(prev => ({ ...prev, [work.work_name]: e.target.value }))}
                          placeholder="Add observation..."
                          className="w-full p-3 rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-400 focus:outline-none
                            bg-gradient-to-b from-amber-100 to-amber-50 border-0 shadow-md
                            text-amber-900 placeholder-amber-400"
                          rows={2}
                        />
                        <button
                          onClick={() => saveNote(work)}
                          disabled={!notes[work.work_name]?.trim() || savingNote === work.work_name}
                          className="absolute bottom-2 right-2 px-2.5 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg
                            disabled:opacity-50 hover:bg-amber-600 active:scale-95 shadow-sm"
                        >
                          {savingNote === work.work_name ? '...' : '📌 Save'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Extra works for this area - grouped under the focus work */}
                  {areaExtras.length > 0 && (
                    <div className="ml-8 space-y-1">
                      {areaExtras.map((extra) => {
                        const extraStatus = STATUS_CONFIG[extra.status] || STATUS_CONFIG.not_started;
                        return (
                          <div key={extra.work_name} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50/60">
                            <span className="text-xs text-gray-400">└</span>
                            <span className="flex-1 text-sm text-gray-600">{extra.work_name}</span>
                            <button
                              onClick={() => cycleStatus(extra, false)}
                              className={`w-7 h-7 rounded-full ${extraStatus.bg} ${extraStatus.text} font-bold text-xs flex items-center justify-center shadow-sm active:scale-90`}
                            >
                              {extraStatus.label}
                            </button>
                            <button
                              onClick={() => removeExtra(extra)}
                              className="text-gray-400 hover:text-red-500 text-xs p-1"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Tap an area icon below to set focus works.</p>
        )}
      </div>

      {/* Add Work Button */}
      <button
        onClick={openPicker}
        className="w-full py-4 bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 
          hover:border-emerald-400 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <span className="text-2xl text-emerald-600">+</span>
        </div>
        <span className="font-medium text-gray-600">Add Work</span>
      </button>

      {/* Browse All Works */}
      <button
        onClick={openPicker}
        className="w-full py-4 bg-white rounded-2xl shadow-sm hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
      >
        <span className="text-emerald-600">🔍</span>
        <span className="font-medium text-emerald-600">Find Work</span>
        <span className="text-emerald-600">Browse all works</span>
      </button>

      {/* Wheel Picker for browsing works in an area */}
      <WorkWheelPicker
        isOpen={wheelPickerOpen}
        onClose={() => setWheelPickerOpen(false)}
        area={wheelPickerArea}
        works={wheelPickerWorks}
        currentWorkName={wheelPickerCurrentWork}
        onSelectWork={handleWheelPickerSelect}
        onAddExtra={handleWheelPickerAddExtra}
        onWorkAdded={refreshWheelPickerWorks}
      />

      {/* Work Picker Modal (for Add Work button) */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => { setPickerOpen(false); setSelectedArea(null); }}
        >
          <div
            className="bg-white w-full max-w-lg max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">
                  {selectedArea ? getAreaConfig(selectedArea).name : 'Add Extra Work'}
                </h3>
                <button
                  onClick={() => { setPickerOpen(false); setSelectedArea(null); }}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {loadingCurriculum ? (
                <div className="text-center py-8">
                  <div className="animate-bounce text-3xl mb-2">📚</div>
                  <p className="text-gray-500">Loading curriculum...</p>
                </div>
              ) : !selectedArea ? (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(AREA_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedArea(key)}
                      className="p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-all text-left"
                    >
                      <span className="text-3xl block mb-2">{config.icon}</span>
                      <span className="font-medium text-gray-800">{config.name}</span>
                      <span className="text-xs text-gray-500 block">
                        {curriculum[key]?.length || curriculum[key === 'mathematics' ? 'math' : key]?.length || 0} works
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <button onClick={() => setSelectedArea(null)} className="text-emerald-600 text-sm mb-2">
                    ← Back to areas
                  </button>
                  {(curriculum[selectedArea] || curriculum[selectedArea === 'mathematics' ? 'math' : selectedArea] || []).map((work, i) => {
                    const isAdded = allWorks.some(a => a.work_name?.toLowerCase() === work.name?.toLowerCase());
                    return (
                      <button
                        key={i}
                        onClick={() => !isAdded && addWork(work)}
                        disabled={isAdded}
                        className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3
                          ${isAdded ? 'bg-gray-100 opacity-50' : 'bg-gray-50 hover:bg-emerald-50 active:scale-98'}`}
                      >
                        <span className="text-xl">{getAreaConfig(selectedArea).icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{work.name}</p>
                        </div>
                        {isAdded ? (
                          <span className="text-xs text-gray-400">Added ✓</span>
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg">+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Guide Modal */}
      {quickGuideOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setQuickGuideOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">📖 Quick Guide</h3>
                <button
                  onClick={() => setQuickGuideOpen(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-amber-100 text-sm">{quickGuideWork}</p>
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {quickGuideLoading ? (
                <div className="text-center py-8">
                  <div className="animate-bounce text-3xl mb-2">📖</div>
                  <p className="text-gray-500">Loading guide...</p>
                </div>
              ) : quickGuideData?.quick_guide ? (
                <div className="space-y-4">
                  {/* Quick Guide Content */}
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                    <p className="font-bold text-amber-800 mb-2">⚡ 10-Second Guide</p>
                    <div className="text-sm text-amber-900 space-y-2">
                      {quickGuideData.quick_guide.split('\n').map((line: string, i: number) => (
                        <p key={i} className="leading-relaxed">{line}</p>
                      ))}
                    </div>
                  </div>

                  {/* Materials if available */}
                  {quickGuideData.materials?.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="font-semibold text-gray-700 text-sm mb-1">🧰 Materials</p>
                      <ul className="text-sm text-gray-600">
                        {quickGuideData.materials.map((m: string, i: number) => (
                          <li key={i}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No quick guide available yet for this work.</p>
                  <p className="text-sm text-gray-400">Check the curriculum page for more details.</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={() => window.open(`https://youtube.com/results?search_query=${encodeURIComponent(quickGuideData?.video_search_term || quickGuideWork + ' Montessori presentation')}`, '_blank')}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600"
              >
                🎬 Watch Video
              </button>
              <button
                onClick={() => {
                  setQuickGuideOpen(false);
                  router.push('/montree/dashboard/curriculum');
                }}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600"
              >
                📚 Full Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
