// /montree/dashboard/[childId]/page.tsx
// Session 112: Week view - child's weekly works
// Session 115: Added Focus Mode view toggle
// Layout handles auth + header + tabs
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Images, ChevronDown, ClipboardList } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { AREA_CONFIG } from '@/lib/montree/types';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { mergeWorksWithCurriculum } from '@/lib/montree/work-matching';
import { WeekViewSkeleton } from '@/components/montree/Skeletons';
import { AreaConfig, QuickGuideData, MergedWork } from '@/components/montree/curriculum/types';
import FocusWorksSection from '@/components/montree/child/FocusWorksSection';
import WorkSearchBar from '@/components/montree/shared/WorkSearchBar';
import { useWorkOperations } from '@/hooks/useWorkOperations';
import GuruContextBubble from '@/components/montree/guru/GuruContextBubble';
import type { GamePlan } from '@/components/montree/child/GamePlanCard';
import WeeklyActivitySummary from '@/components/montree/child/WeeklyActivitySummary';
import { useFeatures } from '@/hooks/useFeatures';

// Tier 4 perf: code-split modal/onboarding/conditional components (~2.6k lines)
// — only downloaded when user actually opens a modal or triggers onboarding.
const WorkWheelPicker = dynamic(() => import('@/components/montree/WorkWheelPicker'), { ssr: false });
const QuickGuideModal = dynamic(() => import('@/components/montree/child/QuickGuideModal'), { ssr: false });
const FullDetailsModal = dynamic(() => import('@/components/montree/child/FullDetailsModal'), { ssr: false });
const WorkPickerModal = dynamic(() => import('@/components/montree/child/WorkPickerModal'), { ssr: false });
const WeekViewGuide = dynamic(() => import('@/components/montree/onboarding/WeekViewGuide'), { ssr: false });
const ChildWeeklyAdmin = dynamic(() => import('@/components/montree/child/ChildWeeklyAdmin'), { ssr: false });
// PrintButton removed Session 78 — print moved to three-dot menu as feature-gated item
const TellGuruCard = dynamic(() => import('@/components/montree/onboarding/TellGuruCard'), { ssr: false });
// ChildVoiceNote now lives inline in FocusWorksSection (next to Save button)


interface Assignment {
  work_name: string;
  area: string;
  status: string;
  notes?: string;
  is_focus?: boolean;
  is_extra?: boolean;
  chineseName?: string;
  spanishName?: string;
  deName?: string;
  frName?: string;
  ptName?: string;
  nlName?: string;
  itName?: string;
  jaName?: string;
  koName?: string;
  ukName?: string;
  ruName?: string;
}

interface CurriculumWork {
  id: string;
  name: string;
  name_chinese?: string;
  name_es?: string;
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
  const { isEnabled } = useFeatures();
  const childId = params.childId as string;
  const session = getSession();

  const [focusWorks, setFocusWorks] = useState<Assignment[]>([]);
  const [extraWorks, setExtraWorks] = useState<Assignment[]>([]);
  // Stats row removed Apr 30 2026 — keeping the useState here would warn unused.
  // (mastered/practicing counts are still derived for the focus list itself.)
  const [loading, setLoading] = useState(true);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const toggleArea = useCallback((area: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area); else next.add(area);
      return next;
    });
  }, []);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  // Work picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [curriculum, setCurriculum] = useState<Record<string, CurriculumWork[]>>({});
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  // "Tell Guru" onboarding — show card when system doesn't know child well
  // Condition: no mental profile AND fewer than 5 confirmed photos (i.e. limited data)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null); // null = loading
  const [childDataRich, setChildDataRich] = useState(false); // true if enough photos exist to skip onboarding
  const [onboardingChildName, setOnboardingChildName] = useState<string>('');
  // Game plan — stored in child.settings.game_plan
  const [gamePlan, setGamePlan] = useState<GamePlan | null>(null);

  // Guru weekly summary state — single object instead of 7 individual useState calls
  const [guruSettings, setGuruSettings] = useState<{
    planRow: Record<string, string> | null;
    areaDetails: Record<string, { work: string; this_week: string; next_week: string }> | null;
    fullSummary: string | null;
    thisWeek: string | null;
    nextWeek: string | null;
    oneLiner: string | null;
    advice: string | null;
    updatedAt: string | null;
  }>({ planRow: null, areaDetails: null, fullSummary: null, thisWeek: null, nextWeek: null, oneLiner: null, advice: null, updatedAt: null });

  // Staleness tracking — prevents redundant refetches
  const lastFetchTimeRef = useRef<number>(0);
  const STALE_THRESHOLD_MS = 30_000; // 30s — don't refetch if data is fresh

  // Fetch guru weekly settings from child settings JSONB
  const fetchGuruSettings = useCallback(() => {
    if (!childId) return;
    montreeApi(`/api/montree/children/${childId}?fields=settings`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const s = data?.child?.settings || data?.settings || {};
        setGuruSettings({
          planRow: s.guru_weekly_plan_row || null,
          areaDetails: s.guru_weekly_area_details || null,
          fullSummary: s.guru_weekly_full_summary || null,
          thisWeek: s.guru_weekly_this_week || null,
          nextWeek: s.guru_weekly_next_week || null,
          oneLiner: s.guru_weekly_one_liner || null,
          advice: s.guru_weekly_advice || null,
          updatedAt: s.guru_weekly_summary_updated_at || null,
        });
      })
      .catch(() => {});
  }, [childId]);

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

  // Fetch quick guide for a work — resolves localized display name from all supported locales
  const openQuickGuide = async (workName: string, localizedNames?: Record<string, string | undefined>) => {
    setQuickGuideWork(workName);
    const displayName = (localizedNames && localizedNames[locale]) || workName;
    setQuickGuideDisplayName(displayName);
    setQuickGuideOpen(true);
    setQuickGuideLoading(true);
    setQuickGuideData(null);

    try {
      const classroomId = session?.classroom?.id;
      let url = classroomId
        ? `/api/montree/works/guide?name=${encodeURIComponent(workName)}&classroom_id=${classroomId}`
        : `/api/montree/works/guide?name=${encodeURIComponent(workName)}`;
      // Pass locale for translated guide content
      if (locale === 'zh' || locale === 'es') {
        url += `&locale=${locale}`;
      }
      const res = await montreeApi(url);
      if (!res.ok) {
        console.error('Guide fetch failed:', res.status);
        setQuickGuideData({ error: true });
        setQuickGuideLoading(false);
        return;
      }
      const data = await res.json();
      setQuickGuideData(data);
    } catch (err) {
      console.error('Failed to fetch guide:', err);
      setQuickGuideData({ error: true });
    }
    setQuickGuideLoading(false);
  };

  // Fetch progress and separate into focus works (1 per area) and extras
  const fetchAssignments = useCallback(() => {
    // Don't refetch while a save is in progress (prevents race conditions)
    if (isSaving) return;

    lastFetchTimeRef.current = Date.now();
    montreeApi(`/api/montree/progress?child_id=${childId}`)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, router]); // isSaving checked at runtime inside the callback, not as dependency

  // Fetch guru weekly summary from child settings
  useEffect(() => {
    if (!childId) return;
    fetchGuruSettings();
  }, [childId, fetchGuruSettings]);

  // Check if child has a mental profile (for Tell Guru onboarding) + fetch game plan
  useEffect(() => {
    if (!childId) return;

    // Always try to fetch child data + game plan (game plan shows regardless of feature flag)
    const fetchChild = montreeApi(`/api/montree/children/${childId}`).then(r => r.ok ? r.json() : null);

    // Only check profile if feature is enabled
    const fetchProfile = isEnabled('tell_guru_onboarding')
      ? montreeApi(`/api/montree/children/${childId}/profile`).then(r => r.ok ? r.json() : null)
      : Promise.resolve(null);

    if (isEnabled('tell_guru_onboarding')) {
      setHasProfile(null); // reset while loading
      setChildDataRich(false);
    }

    Promise.all([fetchProfile, fetchChild]).then(([profileData, childData]) => {
      if (isEnabled('tell_guru_onboarding')) {
        setHasProfile(!!profileData?.profile);
        // childDataRich is no longer used for TellGuruCard visibility — profile presence is the
        // only signal. Left here as it still gates BigMicPanel display.
        const photoCount = childData?.photos?.length ?? 0;
        setChildDataRich(photoCount >= 5);
      }
      if (childData?.child?.name) setOnboardingChildName(childData.child.name);
      else if (childData?.name) setOnboardingChildName(childData.name);

      // Extract game plan from child settings
      const settings = childData?.child?.settings || childData?.settings;
      if (settings?.game_plan) {
        setGamePlan(settings.game_plan as GamePlan);
      }
    }).catch(() => {
      if (isEnabled('tell_guru_onboarding')) setHasProfile(true);
    });
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
  // Skip refetch if data is fresh (<30s old) or currently saving
  useEffect(() => {
    const isStale = () => Date.now() - lastFetchTimeRef.current > STALE_THRESHOLD_MS;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && childId && !isSaving && isStale()) {
        fetchAssignments();
      }
    };

    // Re-fetch on focus (when switching tabs or returning to page)
    const handleFocus = () => {
      if (childId && !isSaving && isStale()) fetchAssignments();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [childId, isSaving, fetchAssignments]);

  // LAZY curriculum cache — fetches all 329 works when first needed (wheel picker or search)
  // Moved from eager useEffect to on-demand to cut page load by ~200-500ms
  const curriculumLoadedRef = useRef(false);
  const loadCurriculumCache = useCallback(async () => {
    if (curriculumLoadedRef.current || Object.keys(curriculum).length >= 5) return;
    curriculumLoadedRef.current = true; // Prevent concurrent loads

    const classroomId = session?.classroom?.id;
    const url = classroomId
      ? `/api/montree/works/search?classroom_id=${classroomId}`
      : `/api/montree/works/search`;

    try {
      const res = await montreeApi(url);
      if (!res.ok) throw new Error(`Curriculum cache failed: ${res.status}`);
      const data = await res.json();
      const allCurrWorks = data.works || [];
      const byArea: Record<string, CurriculumWork[]> = {};
      for (const w of allCurrWorks) {
        const areaKey = w.area?.area_key || 'unknown';
        if (!byArea[areaKey]) byArea[areaKey] = [];
        byArea[areaKey].push({
          id: String(w.id),
          name: String(w.name),
          name_chinese: w.chinese_name ? String(w.chinese_name) : undefined,
          name_es: w.spanish_name ? String(w.spanish_name) : undefined,
          status: 'not_started',
          sequence: typeof w.sequence === 'number' ? w.sequence : byArea[areaKey].length + 1,
          dbSequence: typeof w.sequence === 'number' ? w.sequence : byArea[areaKey].length + 1,
        } as CurriculumWork & { status: string; sequence: number; dbSequence: number });
      }
      setCurriculum(byArea);
    } catch {
      curriculumLoadedRef.current = false; // Allow retry on failure
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.classroom?.id]); // Don't include `curriculum` — would cause infinite re-creation loop. curriculumLoadedRef guards redundant loads.

  // Open wheel picker for a specific area - INSTANT with cached data
  const openWheelPicker = async (area: string, currentWorkName?: string) => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
    // Ensure curriculum is loaded
    await loadCurriculumCache();

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
      const res = await montreeApi(url);
      if (!res.ok) throw new Error(`Curriculum fetch failed: ${res.status}`);
      const data = await res.json();

      const curriculumWorks = (data.works || []).map((w: Record<string, unknown>, idx: number) => {
        const progress = allWorks.find(a =>
          a.work_name?.toLowerCase() === String(w.name).toLowerCase()
        );
        return {
          id: String(w.id),
          name: String(w.name),
          name_chinese: w.chinese_name ? String(w.chinese_name) : undefined,
          name_es: w.spanish_name ? String(w.spanish_name) : undefined,
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
      const res = await montreeApi(url);
      if (!res.ok) throw new Error(`Refresh fetch failed: ${res.status}`);
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
          name_es: w.spanish_name ? String(w.spanish_name) : undefined,
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
      const res = await montreeApi('/api/montree/guru/smart-note', {
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
      await loadCurriculumCache();
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

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 10, border: '1px solid rgba(52,211,153,0.15)',
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none',
    transition: 'background 140ms ease, color 140ms ease',
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toaster position="top-center" richColors />

      {/* Contextual Tip Bubble */}
      {isHomeschoolParent(session) && (
        <GuruContextBubble pageKey="weekView" role="parent" />
      )}

      {/* Student selector + Find Work search row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Student selector */}
        <div style={{ flexShrink: 0 }}>
          <select
            value={childId}
            onChange={(e) => router.push(`/montree/dashboard/${e.target.value}`)}
            style={{
              padding: '7px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(52,211,153,0.15)',
              color: 'rgba(255,255,255,0.85)', fontSize: 13,
              fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
              cursor: 'pointer', outline: 'none',
            }}
          >
            {session?.classroom?.children?.map((child: Child) => (
              <option key={child.id} value={child.id} style={{ background: '#0a1a0f' }}>
                {child.name}
              </option>
            ))}
          </select>
        </div>

        {/* Find Work search — fills remaining space */}
        <div data-tutorial="work-search-bar" style={{ flex: 1 }}>
          <WorkSearchBar
            curriculum={curriculum}
            onSelectWork={(work, areaKey) => {
              setSelectedArea(areaKey);
              setPickerOpen(true);
            }}
            onFocus={() => loadCurriculumCache()}
            placeholder={t('weekview.findWork')}
          />
        </div>
      </div>

      {/* Action bar — Gallery (teacher only) */}
      {!isHomeschoolParent(session) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
          <Link
            href={`/montree/dashboard/${childId}/gallery`}
            style={btnBase}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.08)'; (e.currentTarget as HTMLElement).style.color = '#34d399'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; }}
          >
            <Images size={15} strokeWidth={1.75} />
            {t('childPage.gallery')}
          </Link>
        </div>
      )}

      {/* Tell Guru onboarding — shown once, for brand-new students with no mental profile.
          Once the teacher submits the intro, hasProfile flips to true and this never shows again. */}
      {isEnabled('tell_guru_onboarding') && hasProfile === false && (
        <TellGuruCard
          childId={childId}
          childName={onboardingChildName || 'this child'}
          classroomId={session?.classroom?.id || ''}
          onComplete={(newGamePlan) => {
            setHasProfile(true);
            if (newGamePlan) setGamePlan(newGamePlan);
          }}
        />
      )}

      {/* Weekly Activity Summary — only when NO game plan (game plan replaces this) */}
      {!gamePlan && isEnabled('weekly_activity_summary') && (
        <WeeklyActivitySummary childId={childId} />
      )}

      {/* FOCUS WORKS — Unified area view, merged with Game Plan when available */}
      <div data-tutorial="focus-section">
      <div style={{ marginBottom: 22, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <h2 style={{ margin: 0, fontFamily: "'Lora', Georgia, serif", fontSize: 30, fontWeight: 500, color: 'rgba(255,255,255,0.95)', letterSpacing: -0.4 }}>
          {t('focusWorks.title')}
        </h2>
        <span style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.65)', flexShrink: 0 }}>
          {focusWorks.length} works in rotation
        </span>
      </div>
      <FocusWorksSection
        focusWorks={focusWorks}
        extraWorks={extraWorks}
        expandedAreas={expandedAreas}
        toggleArea={toggleArea}
        notes={notes}
        setNotes={setNotes}
        savingNote={savingNote}
        onSaveNote={onSaveNote}
        onCycleStatus={onCycleStatus}
        onRemoveExtra={onRemoveExtra}
        onOpenWheelPicker={openWheelPicker}
        onOpenQuickGuide={openQuickGuide}
        childId={childId}
        childName={session?.classroom?.children?.find((c: Child) => c.id === childId)?.name}
        getAreaConfig={getAreaConfig}
        isHomeschoolParent={isHomeschoolParent(session)}
        guruAreaDetails={guruSettings.areaDetails}
        smartNoteProcessing={smartNoteProcessing}
        gamePlan={gamePlan}
        onRefreshGamePlan={(updatedPlan) => setGamePlan(updatedPlan)}
        onShelfFilled={fetchAssignments}
      />
      </div>

      {/* Stats row removed Apr 30 2026 — user feedback: redundant, the focus list
          and ◐/✓ status badges already convey mastered/practicing/photos counts. */}

      {/* Weekly Admin — collapsed by default, Whale Class only (government doc copy-paste) */}
      {!isHomeschoolParent(session) && session?.classroom?.id === '945c846d-fb33-4370-8a95-a29b7767af54' && (
        <WeeklyAdminCollapsible
          childId={childId}
          childName={session?.classroom?.children?.find((c: Child) => c.id === childId)?.name || 'Child'}
          planRow={guruSettings.planRow}
          areaDetails={guruSettings.areaDetails}
          fullSummary={guruSettings.fullSummary}
          thisWeek={guruSettings.thisWeek}
          nextWeek={guruSettings.nextWeek}
          oneLiner={guruSettings.oneLiner}
          advice={guruSettings.advice}
          updatedAt={guruSettings.updatedAt}
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
              setExpandedAreas(new Set([focusWorks[0].area]));
            }
          }}
          onCollapseFirstWork={() => {
            setExpandedAreas(new Set());
          }}
          onOpenQuickGuide={() => {
            if (focusWorks.length > 0) {
              const w = focusWorks[0];
              openQuickGuide(w.work_name, { zh: w.chineseName, es: w.spanishName, de: w.deName, fr: w.frName, pt: w.ptName, nl: w.nlName, it: w.itName, ja: w.jaName, ko: w.koName, uk: w.ukName, ru: w.ruName });
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

      {/* Floating ChildGuruChat removed — BigMicPanel above the shelf is the primary voice control. */}
    </div>
  );
}

// Collapsible wrapper for ChildWeeklyAdmin — collapsed by default at bottom of page
function WeeklyAdminCollapsible(props: React.ComponentProps<typeof ChildWeeklyAdmin>) {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { t } = useI18n();

  const SANS = "'Inter', -apple-system, system-ui, sans-serif";

  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(52,211,153,0.15)',
      borderRadius: 18,
      overflow: 'hidden',
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: hovered ? 'rgba(52,211,153,0.08)' : 'transparent',
          border: 0,
          cursor: 'pointer',
          transition: 'background 140ms ease',
          fontFamily: SANS,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={16} strokeWidth={1.75} style={{ color: '#34d399', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
            {t('childAdmin.title')}
          </span>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          style={{
            color: 'rgba(255,255,255,0.40)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        />
      </button>
      {isOpen && (
        <div>
          <ChildWeeklyAdmin {...props} />
        </div>
      )}
    </div>
  );
}
