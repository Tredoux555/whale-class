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
import { mergeWorksWithCurriculum } from '@/lib/montree/work-matching';
import InviteParentModal from '@/components/montree/InviteParentModal';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';
import FocusWorksSection from '@/components/montree/child/FocusWorksSection';
import QuickGuideModal from '@/components/montree/child/QuickGuideModal';
import WorkPickerModal from '@/components/montree/child/WorkPickerModal';
import { useWorkOperations } from '@/hooks/useWorkOperations';

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

export default function WeekPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;
  const session = getSession();

  // Invite parent modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const [focusWorks, setFocusWorks] = useState<Assignment[]>([]);
  const [extraWorks, setExtraWorks] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  // Work picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [curriculum, setCurriculum] = useState<Record<string, CurriculumWork[]>>({});
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  // All works combined (for checking if already added)
  const allWorks = [...focusWorks, ...extraWorks];

  // CRITICAL: Block refetch while saving to prevent race conditions
  const [isSaving, setIsSaving] = useState(false);

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
          sequence: w.sequence || idx + 1,
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
          sequence: w.sequence || idx + 1,
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
          sequence: w.sequence || idx + 1,
        };
      });

      setWheelPickerWorks(worksWithStatus);
      setCurriculum(prev => ({ ...prev, [areaKey]: worksWithStatus }));
      toast.success('Work added!');
    } catch (err) {
      console.error('Failed to refresh works:', err);
    }
  };

  // Use work operations hook
  const {
    cycleStatus,
    removeExtra,
    handleWheelPickerSelect,
    handleWheelPickerAddExtra,
    addWork: addWorkFromHook,
    saveNote: saveNoteFromHook,
  } = useWorkOperations({
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
  });

  // Wrapper for saveNote to update local notes state
  const onSaveNote = async (work: Assignment) => {
    const noteText = notes[work.work_name];
    if (!noteText?.trim()) return;

    setSavingNote(work.work_name);
    const success = await saveNoteFromHook(work, noteText);
    if (success) {
      setNotes(prev => ({ ...prev, [work.work_name]: '' }));
    }
    setSavingNote(null);
  };

  // Wrapper for addWork to handle picker state
  const onAddWork = async (work: CurriculumWork) => {
    await addWorkFromHook(work, selectedArea);
    setPickerOpen(false);
    setSelectedArea(null);
  };

  // Handle wheel picker select with isSaving flag
  const onWheelPickerSelect = async (work: any, status: string) => {
    setIsSaving(true);
    try {
      await handleWheelPickerSelect(work, status);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle wheel picker add extra with isSaving flag
  const onWheelPickerAddExtra = async (work: any) => {
    setIsSaving(true);
    try {
      await handleWheelPickerAddExtra(work);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cycle status with isSaving flag
  const onCycleStatus = async (work: Assignment, isFocus: boolean) => {
    setIsSaving(true);
    try {
      await cycleStatus(work, isFocus);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle remove extra with isSaving flag
  const onRemoveExtra = async (work: Assignment) => {
    setIsSaving(true);
    try {
      await removeExtra(work);
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
      <FocusWorksSection
        focusWorks={focusWorks}
        extraWorks={extraWorks}
        expandedIndex={expandedIndex}
        setExpandedIndex={setExpandedIndex}
        notes={notes}
        setNotes={setNotes}
        savingNote={savingNote}
        onSaveNote={onSaveNote}
        onCycleStatus={onCycleStatus}
        onRemoveExtra={onRemoveExtra}
        onOpenWheelPicker={openWheelPicker}
        onOpenQuickGuide={openQuickGuide}
        childId={childId}
        getAreaConfig={getAreaConfig}
      />

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
        onSelectWork={onWheelPickerSelect}
        onAddExtra={onWheelPickerAddExtra}
        onWorkAdded={refreshWheelPickerWorks}
      />

      {/* Work Picker Modal (for Add Work button) */}
      <WorkPickerModal
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); setSelectedArea(null); }}
        curriculum={curriculum}
        selectedArea={selectedArea}
        setSelectedArea={setSelectedArea}
        loadingCurriculum={loadingCurriculum}
        allWorks={allWorks}
        onAddWork={onAddWork}
        getAreaConfig={getAreaConfig}
      />

      {/* Quick Guide Modal */}
      <QuickGuideModal
        isOpen={quickGuideOpen}
        onClose={() => setQuickGuideOpen(false)}
        workName={quickGuideWork}
        guideData={quickGuideData}
        loading={quickGuideLoading}
      />
    </div>
  );
}
