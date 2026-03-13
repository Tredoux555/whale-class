// /montree/dashboard/[childId]/page.tsx
// Session 112: Week view - child's weekly works
// Session 115: Added Focus Mode view toggle
// Layout handles auth + header + tabs
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { AREA_CONFIG } from '@/lib/montree/types';
import { useI18n } from '@/lib/montree/i18n';
import { mergeWorksWithCurriculum } from '@/lib/montree/work-matching';
import { WeekViewSkeleton } from '@/components/montree/Skeletons';
import { AreaConfig, QuickGuideData, MergedWork } from '@/components/montree/curriculum/types';
import InviteParentModal from '@/components/montree/InviteParentModal';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';
import FocusWorksSection from '@/components/montree/child/FocusWorksSection';
import QuickGuideModal from '@/components/montree/child/QuickGuideModal';
import FullDetailsModal from '@/components/montree/child/FullDetailsModal';
import WorkPickerModal from '@/components/montree/child/WorkPickerModal';
import WorkSearchBar from '@/components/montree/shared/WorkSearchBar';
import { useWorkOperations } from '@/hooks/useWorkOperations';
import WeekViewGuide from '@/components/montree/onboarding/WeekViewGuide';
import GuruContextBubble from '@/components/montree/guru/GuruContextBubble';
import ChildWeeklyAdmin from '@/components/montree/child/ChildWeeklyAdmin';
import PrintButton from '@/components/montree/child/PrintButton';
// ChildVoiceNote now lives inline in FocusWorksSection (next to Save button)


interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean;
  is_extra?: boolean;
  chineseName?: string;
}

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  area_id?: string;
}

interface Child {
  id: string;
  name: string;
}

export default function WeekPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
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

  // Guru weekly summary state
  // Weekly admin settings (all from child settings JSONB)
  const [guruPlanRow, setGuruPlanRow] = useState<Record<string, string> | null>(null);
  const [guruAreaDetails, setGuruAreaDetails] = useState<Record<string, { work: string; this_week: string; next_week: string }> | null>(null);
  const [guruFullSummary, setGuruFullSummary] = useState<string | null>(null);
  const [guruThisWeek, setGuruThisWeek] = useState<string | null>(null);
  const [guruNextWeek, setGuruNextWeek] = useState<string | null>(null);
  const [guruOneLiner, setGuruOneLiner] = useState<string | null>(null);
  const [guruAdvice, setGuruAdvice] = useState<string | null>(null);
  const [guruSummaryUpdatedAt, setGuruSummaryUpdatedAt] = useState<string | null>(null);

  // Fetch guru weekly settings from child settings JSONB
  const fetchGuruSettings = () => {
    if (!childId) return;
    fetch(`/api/montree/children/${childId}?fields=settings`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const settings = data?.child?.settings || data?.settings || {};
        setGuruPlanRow(settings.guru_weekly_plan_row || null);
        setGuruAreaDetails(settings.guru_weekly_area_details || null);
        setGuruFullSummary(settings.guru_weekly_full_summary || null);
        setGuruThisWeek(settings.guru_weekly_this_week || null);
        setGuruNextWeek(settings.guru_weekly_next_week || null);
        setGuruOneLiner(settings.guru_weekly_one_liner || null);
        setGuruAdvice(settings.guru_weekly_advice || null);
        setGuruSummaryUpdatedAt(settings.guru_weekly_summary_updated_at || null);
      })
      .catch(() => {});
  };

  // All works combined (for checking if already added)
  const allWorks = [...focusWorks, ...extraWorks];

  // CRITICAL: Block refetch while saving to prevent race conditions
  const [isSaving, setIsSaving] = useState(false);

  // Wheel picker state
  const [wheelPickerOpen, setWheelPickerOpen] = useState(false);
  const [wheelPickerArea, setWheelPickerArea] = useState<string>('');
  const [wheelPickerWorks, setWheelPickerWorks] = useState<MergedWork[]>([]);
  const [wheelPickerCurrentWork, setWheelPickerCurrentWork] = useState<string>('');

  // Quick Guide modal state
  const [quickGuideOpen, setQuickGuideOpen] = useState(false);
  const [quickGuideWork, setQuickGuideWork] = useState<string>('');
  const [quickGuideDisplayName, setQuickGuideDisplayName] = useState<string>('');
  const [quickGuideData, setQuickGuideData] = useState<QuickGuideData | null>(null);
  const [quickGuideLoading, setQuickGuideLoading] = useState(false);
  const [fullDetailsOpen, setFullDetailsOpen] = useState(false);

  // Week view guide state — only show once per device
  const [showWeekViewGuide, setShowWeekViewGuide] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('montree_guide_weekview_done')) {
      setShowWeekViewGuide(true);
    }
  }, []);

  // Fetch quick guide for a work (accepts optional chineseName for display)
  const openQuickGuide = async (workName: string, chineseName?: string) => {
    setQuickGuideWork(workName);
    // Display Chinese name when locale is zh and chineseName is available
    setQuickGuideDisplayName(locale === 'zh' && chineseName ? chineseName : workName);
    setQuickGuideOpen(true);
    setQuickGuideLoading(true);
    setQuickGuideData(null);

    try {
      const classroomId = session?.classroom?.id;
      let url = classroomId
        ? `/api/montree/works/guide?name=${encodeURIComponent(workName)}&classroom_id=${classroomId}`
        : `/api/montree/works/guide?name=${encodeURIComponent(workName)}`;
      // Pass locale for Chinese translation of guide content
      if (locale === 'zh') {
        url += '&locale=zh';
      }
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
          // Auth expired or server error — redirect to login with return URL
          router.push(`/montree/login?redirect=${encodeURIComponent(`/montree/dashboard/${childId}`)}`);
          return { progress: [] };
        }
        return r.json();
      })
      .then(data => {
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

        // Second pass: only explicitly-added extras (from montree_child_extras table)
        for (const p of allProgress) {
          if (p.is_extra && !usedWorkNames.has(p.work_name.toLowerCase())) {
            extras.push({ ...p, is_focus: false });
          }
        }

        setFocusWorks(focus);
        setExtraWorks(extras);
        setLoading(false);
      })
      .catch(() => {
        // Network error or parsing error — show empty state, don't crash
        setFocusWorks([]);
        setExtraWorks([]);
        setLoading(false);
      });
  };

  // Fetch guru weekly summary from child settings
  useEffect(() => {
    if (!childId) return;
    fetchGuruSettings();
  }, [childId]);

  // Fetch on mount and when childId changes
  useEffect(() => {
    if (childId) {
      setLoading(true);
      fetchAssignments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // Also re-fetch when returning to this page (handles tab navigation)
  // Skip refetch if currently saving to prevent overwriting optimistic updates
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && childId && !isSaving) {
        fetchAssignments();
      }
    };

    // Re-fetch on focus (when switching tabs or returning to page)
    const handleFocus = () => {
      if (childId && !isSaving) fetchAssignments();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [childId]);

  // PRE-CACHE curriculum for all areas — SINGLE fetch, split client-side
  // PERF: Was 5 separate API calls (one per area). Now 1 call returning all 329 works.
  useEffect(() => {
    const classroomId = session?.classroom?.id;
    if (Object.keys(curriculum).length >= 5) return; // Already cached all areas

    const url = classroomId
      ? `/api/montree/works/search?classroom_id=${classroomId}`
      : `/api/montree/works/search`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const allCurrWorks = data.works || [];
        const byArea: Record<string, CurriculumWork[]> = {};
        for (const w of allCurrWorks) {
          const areaKey = w.area?.area_key || 'unknown';
          if (!byArea[areaKey]) byArea[areaKey] = [];
          byArea[areaKey].push({
            id: String(w.id),
            name: String(w.name),
            name_chinese: w.chinese_name ? String(w.chinese_name) : undefined,
            status: 'not_started',
            sequence: typeof w.sequence === 'number' ? w.sequence : byArea[areaKey].length + 1,
            dbSequence: typeof w.sequence === 'number' ? w.sequence : byArea[areaKey].length + 1,
          } as CurriculumWork & { status: string; sequence: number; dbSequence: number });
        }
        setCurriculum(byArea);
      })
      .catch(() => {});
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
      const updatedCurriculum = cachedCurriculum.map((w: CurriculumWork) => {
        const progress = currentWorks.find(a =>
          a.work_name?.toLowerCase() === w.name?.toLowerCase()
        );
        return { ...w, status: progress?.status || 'not_started' };
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

      const curriculumWorks = (data.works || []).map((w: Record<string, unknown>, idx: number) => {
        const progress = allWorks.find(a =>
          a.work_name?.toLowerCase() === String(w.name).toLowerCase()
        );
        return {
          id: String(w.id),
          name: String(w.name),
          name_chinese: w.chinese_name ? String(w.chinese_name) : undefined,
          status: progress?.status || 'not_started',
          sequence: typeof w.sequence === 'number' ? w.sequence : idx + 1,
          dbSequence: typeof w.sequence === 'number' ? w.sequence : idx + 1,
        };
      });

      const mergedWorks = mergeWorksWithCurriculum(curriculumWorks, allWorks, areaKey);
      setWheelPickerWorks(mergedWorks);
      setCurriculum(prev => ({ ...prev, [areaKey]: curriculumWorks }));
    } catch (err) {
      console.error('Failed to load works:', err);
      toast.error(t('weekview.failedToLoad'));
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
      const worksWithStatus = (data.works || []).map((w: Record<string, unknown>, idx: number) => {
        const progress = currentWorks.find(a =>
          a.work_name?.toLowerCase() === String(w.name).toLowerCase()
        );
        return {
          id: String(w.id),
          name: String(w.name),
          name_chinese: w.chinese_name ? String(w.chinese_name) : undefined,
          status: progress?.status || 'not_started',
          sequence: typeof w.sequence === 'number' ? w.sequence : idx + 1,
          dbSequence: typeof w.sequence === 'number' ? w.sequence : idx + 1,
        };
      });

      setWheelPickerWorks(worksWithStatus);
      setCurriculum(prev => ({ ...prev, [areaKey]: worksWithStatus }));
      toast.success(t('weekview.workAdded'));
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
    wheelPickerWorks,
    session,
    allWorks,
    setWheelPickerOpen,
    fetchAssignments,
  });

  // Smart note processing indicator (🧠 on save button while Haiku parses)
  const [smartNoteProcessing, setSmartNoteProcessing] = useState<string | null>(null);

  // Wrapper for saveNote — saves note AND fires smart-note AI in parallel
  const onSaveNote = async (work: Assignment) => {
    const noteText = notes[work.work_name];
    if (!noteText?.trim()) return;

    setSavingNote(work.work_name);

    // 1. Save the raw note (existing flow)
    const success = await saveNoteFromHook(work, noteText);
    if (success) {
      setNotes(prev => ({ ...prev, [work.work_name]: '' }));
    }
    setSavingNote(null);

    // 2. Fire smart-note AI in parallel (non-blocking)
    setSmartNoteProcessing(work.work_name);
    try {
      const res = await fetch('/api/montree/guru/smart-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          area: work.area,
          note_text: noteText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const actions = data.actions || [];
        for (const action of actions) {
          if (action.success) {
            toast.success(`🧠 ${action.message}`);
          }
        }
        // Refresh works display if any actions were taken
        if (actions.some((a: { success: boolean }) => a.success)) {
          fetchAssignments();
        }
      }
    } catch {
      // Smart-note failure is silent — note already saved
    }
    setSmartNoteProcessing(null);
  };

  // Wrapper for addWork to handle picker state
  const onAddWork = async (work: CurriculumWork) => {
    await addWorkFromHook(work, selectedArea);
    setPickerOpen(false);
    setSelectedArea(null);
  };

  // Handle wheel picker select with isSaving flag
  const onWheelPickerSelect = async (work: MergedWork, status: string) => {
    setIsSaving(true);
    try {
      await handleWheelPickerSelect(work, status);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle wheel picker add extra with isSaving flag
  const onWheelPickerAddExtra = async (work: MergedWork) => {
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
  const getAreaConfig = (area: string): AreaConfig => {
    return AREA_CONFIG[area] || AREA_CONFIG[area.replace('mathematics', 'math')] || { name: area, icon: '📋', color: '#888' };
  };

  if (loading) {
    return <WeekViewSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Toaster position="top-center" richColors />

      {/* Contextual Tip Bubble */}
      {isHomeschoolParent(session) && (
        <GuruContextBubble pageKey="weekView" role="parent" />
      )}

      {/* Invite Parent Modal — hidden for homeschool parents (they ARE the parent) */}
      {!isHomeschoolParent(session) && (
        <InviteParentModal
          childId={childId}
          childName={session?.classroom?.children?.find((c: Child) => c.id === childId)?.name || 'Child'}
          teacherId={session?.teacher?.id}
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
        />
      )}

      {/* Jump to Student Selector + Find Work Search Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Student selector — left side */}
        <div className="flex-shrink-0">
          <select
            value={childId}
            onChange={(e) => router.push(`/montree/dashboard/${e.target.value}`)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 hover:border-emerald-400 transition-colors"
          >
            {session?.classroom?.children?.map((child: Child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>

        {/* Find Work search — center */}
        <div data-tutorial="work-search-bar" className="flex-1">
          <WorkSearchBar
            curriculum={curriculum}
            onSelectWork={(work, areaKey) => {
              setSelectedArea(areaKey);
              setPickerOpen(true);
            }}
            onFocus={async () => {
              // Pre-load curriculum if not yet cached (normally loads on picker open)
              if (Object.keys(curriculum).length === 0) {
                try {
                  const res = await fetch(`/api/montree/works/search`);
                  const data = await res.json();
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
              }
            }}
            placeholder={t('weekview.findWork')}
          />
        </div>

        {/* Action buttons — right side */}
        {!isHomeschoolParent(session) && (
          <>
            <Link
              href={`/montree/dashboard/${childId}/weekly-review`}
              className="px-3 py-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm transition-colors flex-shrink-0"
            >
              📝 {t('weeklyReview.navLabel' as any) || 'Weekly Review'}
            </Link>
            <PrintButton childId={childId} schoolId={session?.school?.id} />
            <button
              data-tutorial="invite-parent-button"
              onClick={() => setInviteModalOpen(true)}
              className="px-3 py-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm transition-colors flex-shrink-0"
            >
              👨‍👩‍👧 {t('weekview.inviteParent')}
            </button>
          </>
        )}
      </div>

      {/* Guru Chat Icon — directly above Focus Works */}
      <div className="flex justify-end">
        <Link
          href={`/montree/dashboard/guru`}
          className="px-3 py-2 text-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors"
          title="Ask Guru for advice"
        >
          🎓 {t('nav.guru' as any) || 'Guru'}
        </Link>
      </div>

      {/* FOCUS WORKS — Unified area view with inline Guru advice */}
      <div data-tutorial="focus-section">
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
        isHomeschoolParent={isHomeschoolParent(session)}
        guruAreaDetails={guruAreaDetails}
        smartNoteProcessing={smartNoteProcessing}
      />
      </div>

      {/* Weekly Admin — collapsed by default, for government doc copy-paste */}
      {!isHomeschoolParent(session) && (
        <WeeklyAdminCollapsible
          childId={childId}
          childName={session?.classroom?.children?.find((c: Child) => c.id === childId)?.name || 'Child'}
          planRow={guruPlanRow}
          areaDetails={guruAreaDetails}
          fullSummary={guruFullSummary}
          thisWeek={guruThisWeek}
          nextWeek={guruNextWeek}
          oneLiner={guruOneLiner}
          advice={guruAdvice}
          updatedAt={guruSummaryUpdatedAt}
          onGenerated={fetchGuruSettings}
        />
      )}

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
        workName={quickGuideDisplayName || quickGuideWork}
        guideData={quickGuideData}
        loading={quickGuideLoading}
        onOpenFullDetails={() => { setQuickGuideOpen(false); setFullDetailsOpen(true); }}
      />

      <FullDetailsModal
        isOpen={fullDetailsOpen}
        onClose={() => setFullDetailsOpen(false)}
        workName={quickGuideDisplayName || quickGuideWork}
        guideData={quickGuideData}
        loading={quickGuideLoading}
      />
      {/* Week View Guide — HIDDEN: onboarding guides disabled */}
      {false && showWeekViewGuide && focusWorks.length > 0 && (
        <WeekViewGuide
          isVisible={true}
          onComplete={() => { localStorage.setItem('montree_guide_weekview_done', '1'); setShowWeekViewGuide(false); }}
          onSkip={() => { localStorage.setItem('montree_guide_weekview_done', '1'); setShowWeekViewGuide(false); }}
          isHomeschoolParent={isHomeschoolParent(session)}
          onExpandFirstWork={() => {
            if (focusWorks.length > 0) {
              setExpandedIndex(focusWorks[0].work_name);
            }
          }}
          onCollapseFirstWork={() => {
            setExpandedIndex(null);
          }}
          onOpenQuickGuide={() => {
            if (focusWorks.length > 0) {
              openQuickGuide(focusWorks[0].work_name, focusWorks[0].chineseName);
            }
          }}
          onCloseQuickGuide={() => {
            setQuickGuideOpen(false);
          }}
          onOpenYouTube={() => {
            // Open YouTube search for the first focus work
            const workName = focusWorks[0]?.work_name || '';
            window.open(`https://youtube.com/results?search_query=${encodeURIComponent(workName + ' Montessori presentation')}`, '_blank');
          }}
          onOpenFullDetails={() => {
            setFullDetailsOpen(true);
          }}
          onCloseFullDetails={() => {
            setFullDetailsOpen(false);
          }}
          onOpenCapture={() => {
            router.push(`/montree/dashboard/capture?childId=${childId}`);
          }}
          onOpenWheelPicker={() => {
            if (focusWorks.length > 0) {
              openWheelPicker(focusWorks[0].area, focusWorks[0].work_name);
            }
          }}
          onCloseWheelPicker={() => {
            setWheelPickerOpen(false);
          }}
          onNavigateHome={() => {
            router.push('/montree/dashboard');
          }}
        />
      )}
    </div>
  );
}

// Collapsible wrapper for ChildWeeklyAdmin — collapsed by default at bottom of page
function WeeklyAdminCollapsible(props: React.ComponentProps<typeof ChildWeeklyAdmin>) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-violet-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="font-semibold text-violet-800 text-sm">{t('childAdmin.title')}</span>
        </div>
        <span className="text-violet-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="px-0">
          <ChildWeeklyAdmin {...props} />
        </div>
      )}
    </div>
  );
}
