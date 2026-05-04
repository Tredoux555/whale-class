// /montree/dashboard/page.tsx
// Clean, modern child picker with responsive grid
// Redesigned: search above students, compact classroom pulse, tools drawer at bottom
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, recoverSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { HOME_THEME } from '@/lib/montree/home-theme';
import { useI18n } from '@/lib/montree/i18n';
import { toast, Toaster } from 'sonner';
import { montreeApi } from '@/lib/montree/api';
import { useMontreeData, setCacheData } from '@/lib/montree/cache';
import { useFeatures } from '@/hooks/useFeatures';
import { DashboardSkeleton } from '@/components/montree/Skeletons';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import dynamic from 'next/dynamic';

// Lazy-load heavy components — only loaded when actually rendered
const WelcomeModal = dynamic(() => import('@/components/montree/WelcomeModal'), { ssr: false });
const GuruDashboardCards = dynamic(() => import('@/components/montree/guru/GuruDashboardCards'), { ssr: false });
const ConcernCardsGrid = dynamic(() => import('@/components/montree/guru/ConcernCardsGrid'), { ssr: false });
const QuickGuruFAB = dynamic(() => import('@/components/montree/guru/QuickGuruFAB'), { ssr: false });
const DashboardGuide = dynamic(() => import('@/components/montree/onboarding/DashboardGuide'), { ssr: false });
const GuruFAQSection = dynamic(() => import('@/components/montree/guru/GuruFAQSection'), { ssr: false });
const GuruContextBubble = dynamic(() => import('@/components/montree/guru/GuruContextBubble'), { ssr: false });
const GuruChatThread = dynamic(() => import('@/components/montree/guru/GuruChatThread'), { ssr: false });
const WeeklyAdminCard = dynamic(() => import('@/components/montree/voice-notes/WeeklyAdminCard'), { ssr: false });
// BatchReportsCard and BatchNarrativesCard removed — consolidated into Weekly Wrap
const BulkPasteImport = dynamic(() => import('@/components/montree/BulkPasteImport'), { ssr: false });

const ShelfAutopilotCard = dynamic(() => import('@/components/montree/ShelfAutopilotCard'), { ssr: false });
const AttendanceWidget = dynamic(() => import('@/components/montree/AttendanceWidget'), { ssr: false });
const StaleWorksPanel = dynamic(() => import('@/components/montree/StaleWorksPanel'), { ssr: false });
const ConferenceNotesPanel = dynamic(() => import('@/components/montree/ConferenceNotesPanel'), { ssr: false });
const PulsePanel = dynamic(() => import('@/components/montree/PulsePanel'), { ssr: false });
const EvidencePanel = dynamic(() => import('@/components/montree/EvidencePanel'), { ssr: false });
const PaperworkPanel = dynamic(() => import('@/components/montree/PaperworkPanel'), { ssr: false });
const DailyBriefPanel = dynamic(() => import('@/components/montree/DailyBriefPanel'), { ssr: false });
const BirthdayBanner = dynamic(() => import('@/components/montree/BirthdayBanner'), { ssr: false });
const TodaysFocusStrip = dynamic(() => import('@/components/montree/focus/TodaysFocusStrip'), { ssr: false });
const OnboardingPathChoice = dynamic(() => import('@/components/montree/onboarding/OnboardingPathChoice'), { ssr: false });


interface Child {
  id: string;
  name: string;
  photo_url?: string;
}

// ── High-water-mark for children count (chronic empty-state-flash defense) ──
// This bug has been chased four times: Sessions 70 (9db1f142), 81 (d0c56992 +
// 6c6fe885), and 86 (3d9969da + 7c5e5724). Each fix targeted ONE specific race
// (POST resolves before GET / GET clobbers setCacheData / etc). But the
// underlying architectural issue is that ANY single empty API response — for
// ANY reason (auth refresh hiccup, transient backend, Railway cold-start
// returning [], LRU eviction + bad response) — wipes the user's cache and
// shows them the "Bulk Import Students" empty state when their classroom
// genuinely has children. After they just imported. That's a brutal trust
// failure for a new school.
//
// The defense: track per-classroom highest-known children count in
// localStorage. On render, if the API currently shows 0 children but we've
// previously seen >0 for this classroom, render a "Refreshing..." skeleton
// instead of the bulk-import empty state, and force a refetch. The watermark
// only ever increases — it gets reset to 0 only on explicit deletion (which
// today happens only via DB; UI delete-all isn't yet a flow).
const CHILDREN_WATERMARK_KEY = 'montree.classroomChildrenWatermark.v1';
type ChildrenWatermark = Record<string, { count: number; ts: number }>;

function readChildrenWatermark(classroomId: string): { count: number; ts: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CHILDREN_WATERMARK_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as ChildrenWatermark;
    return all[classroomId] || null;
  } catch {
    return null;
  }
}

function writeChildrenWatermark(classroomId: string, count: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(CHILDREN_WATERMARK_KEY);
    const all = (raw ? JSON.parse(raw) : {}) as ChildrenWatermark;
    const existing = all[classroomId];
    // Only ever raise the watermark — never lower it from a transient empty
    // response. A genuine zero will be written by an explicit-delete handler
    // (not yet wired up; if we add one, call writeChildrenWatermark with the
    // post-delete count and skip this max-guard for that one call).
    const newCount = Math.max(existing?.count ?? 0, count);
    all[classroomId] = { count: newCount, ts: Date.now() };
    localStorage.setItem(CHILDREN_WATERMARK_KEY, JSON.stringify(all));
  } catch {
    // private browsing / disabled storage — non-fatal
  }
}

// ─── Avatar Components ───
function StudentAvatarIcon({ child, isSelected }: { child: Child; isSelected: boolean }) {
  const [showFallback, setShowFallback] = useState(!child.photo_url);

  if (!showFallback && child.photo_url) {
    return (
      <div className={`w-6 h-6 rounded-full ${isSelected ? 'bg-white/20' : 'bg-[#0D3330]/10'} flex items-center justify-center text-xs font-bold overflow-hidden`}>
        <img
          src={getProxyUrl(child.photo_url)}
          className="w-full h-full object-cover"
          alt=""
          loading="lazy"
          onError={() => setShowFallback(true)}
        />
      </div>
    );
  }

  return (
    <div className={`w-6 h-6 rounded-full ${isSelected ? 'bg-white/20' : 'bg-[#0D3330]/10'} flex items-center justify-center text-xs font-bold overflow-hidden`}>
      {child.name.charAt(0)}
    </div>
  );
}

function StudentAvatarCard({ child }: { child: Child }) {
  const [showFallback, setShowFallback] = useState(!child.photo_url);
  const size = 58;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      position: 'relative', flexShrink: 0,
      background: 'rgba(16,185,129,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'visible',
      boxShadow: '0 0 20px 6px rgba(52,211,153,0.30)',
    }}>
      {!showFallback && child.photo_url ? (
        <img
          src={getProxyUrl(child.photo_url)}
          alt=""
          loading="lazy"
          onError={() => setShowFallback(true)}
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{
          fontFamily: "'Lora', Georgia, serif", fontWeight: 500,
          fontSize: size * 0.46, color: '#fff', lineHeight: 1,
          textShadow: '0 0 14px rgba(167,243,208,0.35)',
        }}>
          {child.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { isEnabled } = useFeatures();
  const [session, setSession] = useState<MontreeSession | null>(() => {
    if (typeof window === 'undefined') return null;
    return getSession();
  });
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDashboardGuide, setShowDashboardGuide] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [guruFirstView, setGuruFirstView] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // ─── Inline search + section collapse state (must be before early returns) ───
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Collapsible section states — persist in localStorage
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { intelligence: true, tools: false };
    try {
      const saved = localStorage.getItem('montree_dashboard_sections');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { intelligence: true, tools: false };
  });

  const toggleSection = useCallback((key: string) => {
    setSectionsOpen(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('montree_dashboard_sections', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Listen for DailyBriefPanel action item clicks to auto-expand intelligence section
  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent).detail;
      if (key && typeof key === 'string') {
        setSectionsOpen(prev => {
          if (prev[key]) return prev; // already open
          const next = { ...prev, [key]: true };
          try { localStorage.setItem('montree_dashboard_sections', JSON.stringify(next)); } catch {}
          return next;
        });
      }
    };
    window.addEventListener('montree:expand-section', handler);
    return () => window.removeEventListener('montree:expand-section', handler);
  }, []);

  // SWR-cached children fetch — instant on revisit, background refresh if stale
  const childrenUrl = session?.classroom?.id
    ? `/api/montree/children?classroom_id=${session.classroom.id}`
    : null;
  const { data: childrenData, loading, error: childrenError, refetch: refetchChildren } =
    useMontreeData<{ children: Child[] }>(childrenUrl);
  const children = childrenData?.children || [];

  // ── High-water-mark watch on children count ──
  // Update the watermark whenever the API gives us a positive count, AND log
  // a warning if we observe a regression from positive → zero (suggests the
  // API returned empty when it shouldn't have — exactly the chronic bug).
  // The visible suppression of the bulk-import empty state is enforced below
  // in the render guard.
  useEffect(() => {
    const cid = session?.classroom?.id;
    if (!cid) return;
    if (childrenData === null) return; // still loading — don't touch

    const currentCount = children.length;
    const watermark = readChildrenWatermark(cid);
    const previousCount = watermark?.count ?? 0;

    if (currentCount > 0) {
      // Successful read with children — update watermark to max(prev, current).
      writeChildrenWatermark(cid, currentCount);
    } else if (previousCount > 0) {
      // Suspicious: API said 0 but we've previously seen > 0. Log so we can
      // catch this in browser console / Railway client error logs. Then the
      // render guard below will keep the user on a skeleton instead of the
      // bulk-import empty state, AND we trigger a refetch.
      console.warn(
        `[dashboard] Suspicious children count regression: classroom=${cid} ` +
        `prev=${previousCount} now=0 cacheTs=${watermark?.ts} url=${childrenUrl}`
      );
    }
  }, [childrenData, session?.classroom?.id, childrenUrl, children.length]);

  // Boolean: should we suppress the empty state because we believe this
  // classroom has children? True iff API currently shows 0 AND watermark
  // shows >0. Used in the render guard below.
  const suspectFalseEmpty = useMemo(() => {
    const cid = session?.classroom?.id;
    if (!cid) return false;
    if (children.length > 0) return false;
    const w = readChildrenWatermark(cid);
    return (w?.count ?? 0) > 0;
  }, [session?.classroom?.id, children.length]);

  // When we suspect a false empty, force a refetch (which puts us in loading
  // state, hence into the skeleton render path), AND start a give-up timer.
  // If 6 seconds pass and we're STILL suspect-empty, it's not a transient API
  // hiccup — the watermark is misleading us (e.g. children genuinely deleted
  // outside this client). Clear the watermark and let the empty state render
  // normally so the user isn't trapped in skeleton-land forever.
  const [giveUpOnSuspect, setGiveUpOnSuspect] = useState(false);
  useEffect(() => {
    if (!suspectFalseEmpty) {
      setGiveUpOnSuspect(false);
      return;
    }
    // Trigger a single refetch — refetchChildren() clears the cache entry
    // and sets loading=true, which routes through the existing skeleton.
    refetchChildren();
    const timer = setTimeout(() => {
      const cid = session?.classroom?.id;
      if (cid) {
        // Clear the watermark so we don't keep flagging this classroom.
        try {
          const raw = localStorage.getItem(CHILDREN_WATERMARK_KEY);
          if (raw) {
            const all = JSON.parse(raw) as ChildrenWatermark;
            delete all[cid];
            localStorage.setItem(CHILDREN_WATERMARK_KEY, JSON.stringify(all));
          }
        } catch {}
      }
      setGiveUpOnSuspect(true);
      console.warn('[dashboard] Suspect-empty give-up timer fired — letting empty state render.');
    }, 6000);
    return () => clearTimeout(timer);
  }, [suspectFalseEmpty, refetchChildren, session?.classroom?.id]);

  // Filtered children for search (MUST be after children declaration)
  const filteredChildren = useMemo(() => {
    if (!searchQuery.trim()) return children;
    const q = searchQuery.toLowerCase();
    return children.filter(c => c.name.toLowerCase().includes(q));
  }, [searchQuery, children]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!session) {
      // Try recovering session from httpOnly cookie before redirecting to login
      recoverSession().then(recovered => {
        if (recovered) {
          setSession(recovered);
        } else {
          router.push('/montree/login');
        }
      });
      return;
    }

    // Show welcome modal only once per device (localStorage) AND only if tutorial not completed
    if (!session.teacher.has_completed_tutorial && !localStorage.getItem('montree_welcome_done')) {
      setShowWelcome(true);
    }
  }, [router, session]);

  // Extract searchParams value once (avoids object reference in deps)
  const justOnboarded = searchParams.get('onboarded') === '1';

  // Handle guide triggers + auto-select first child
  useEffect(() => {
    if (loading || children.length === 0) return;

    // Auto-select first child for teachers
    if (!selectedChildId) {
      setSelectedChildId(children[0].id);
    }

    // Show dashboard guide once — on first onboard or first visit with children
    const guideDone = !!localStorage.getItem('montree_guide_dashboard_done');
    if (!guideDone && (justOnboarded || !session?.teacher?.has_completed_tutorial)) {
      setShowDashboardGuide(true);
      if (justOnboarded) {
        window.history.replaceState({}, '', '/montree/dashboard');
      }
    }
  }, [loading, children, session, justOnboarded]);

  // Handle API errors — 401 means cookie expired, force re-login
  useEffect(() => {
    if (childrenError) {
      if (childrenError === '401') {
        // Cookie expired — clear stale localStorage session and redirect to login
        localStorage.removeItem('montree_session');
        router.push('/montree/login');
      } else {
        toast.error(t('dashboard.failedToLoad'));
      }
    }
  }, [childrenError, router, t]);

  const isParent = session ? isHomeschoolParent(session) : false;

  // ─── Onboarding path choice ───
  // When a teacher first lands here with un-onboarded children, show a
  // two-path choice screen instead of force-redirecting them into voice
  // onboarding. Path A = voice flow. Path B = "I'll just take photos" —
  // dismisses the gate and lets the photo-capture pipeline drive shelves
  // organically. The dismiss decision is persisted per-classroom in
  // localStorage so the gate doesn't reappear on every refresh.
  const [pendingOnboardingCount, setPendingOnboardingCount] = useState<number | null>(null);
  const [photoPathChosen, setPhotoPathChosen] = useState(false);

  // Read the per-classroom skip flag once we know the classroom id.
  useEffect(() => {
    const cid = session?.classroom?.id;
    if (!cid || typeof window === 'undefined') return;
    try {
      const flag = window.localStorage.getItem(`montree.onboardingChoice.${cid}`);
      if (flag === 'photo') setPhotoPathChosen(true);
    } catch {
      // private browsing / disabled storage — non-fatal
    }
  }, [session?.classroom?.id]);

  // Pending-children probe — runs once per session+classroom. Replaces the
  // old auto-redirect. We only count; we don't navigate.
  useEffect(() => {
    if (loading || !session || isParent) return;
    if (children.length === 0) { setPendingOnboardingCount(0); return; }
    if (!isEnabled('tell_guru_onboarding')) { setPendingOnboardingCount(0); return; }
    if (searchParams.get('skipOnboarding') === '1') { setPendingOnboardingCount(0); return; }

    const ctrl = new AbortController();
    fetch('/api/montree/onboarding/voice/status', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.success) { setPendingOnboardingCount(0); return; }
        const pending: Array<{ id: string }> = data.pending || [];
        setPendingOnboardingCount(pending.length);
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.error('[Dashboard] Voice onboarding status check failed:', err);
        }
        setPendingOnboardingCount(0);
      });
    return () => ctrl.abort();
  }, [loading, session, isParent, children.length, isEnabled, searchParams]);

  // Should we show the choice screen? Only when there are real pending
  // children, the teacher hasn't already chosen the photo path for this
  // classroom, and this is a teacher (not a parent).
  const showOnboardingChoice =
    !isParent &&
    !loading &&
    !!session &&
    pendingOnboardingCount !== null &&
    pendingOnboardingCount > 0 &&
    !photoPathChosen;

  if (!session || loading) {
    return <DashboardSkeleton />;
  }

  // Trust gate: never show the "Bulk Import Students" empty state until we
  // have an explicit, confirmed response for the current classroom. If the
  // session loaded but the classroom id is somehow missing, or the children
  // fetch hasn't yielded a real response yet (childrenData still null), hold
  // the skeleton instead of flashing the import prompt at a teacher who just
  // imported students.
  //
  // Extended in this commit (Session 88): also hold the skeleton when we
  // SUSPECT a false-empty. The watermark in localStorage tells us this
  // classroom previously had children, so an API response of [] is suspicious.
  // The give-up timer (6s) above will eventually flip giveUpOnSuspect to true
  // and let the empty state render if the suspicion proves wrong.
  if (
    !isParent &&
    (
      childrenUrl === null ||
      (childrenData === null && !childrenError) ||
      (suspectFalseEmpty && !giveUpOnSuspect)
    )
  ) {
    return <DashboardSkeleton />;
  }

  // Homeschool parents get redirected — show skeleton while redirect fires
  if (isParent && children.length > 0) {
    return <DashboardSkeleton />;
  }

  // Hold the skeleton while the pending-children probe is in flight.
  // Without this, teachers with un-onboarded children would see the
  // dashboard flicker into view for ~100-300ms before the choice screen
  // takes over. Only applies when we're actually going to probe (teacher,
  // children present, feature enabled, no skip param).
  const willProbe =
    !isParent &&
    children.length > 0 &&
    isEnabled('tell_guru_onboarding') &&
    searchParams.get('skipOnboarding') !== '1';
  if (willProbe && pendingOnboardingCount === null) {
    return <DashboardSkeleton />;
  }

  // Two-path onboarding gate. When pending children exist and the teacher
  // hasn't already chosen the photo path, present the choice as a clean
  // full-screen takeover. They go either to voice onboarding (router.push)
  // or dismiss to the dashboard (setPhotoPathChosen + localStorage write).
  if (showOnboardingChoice) {
    return (
      <OnboardingPathChoice
        classroomId={session?.classroom?.id}
        onSkipPhoto={() => setPhotoPathChosen(true)}
      />
    );
  }

  // Guru-first full-screen view for home parents
  if (isParent && children.length >= 1 && guruFirstView) {
    const selectedChild = children.find(c => c.id === selectedChildId) || children[0];
    return (
      <div className="flex flex-col h-dvh">
        {/* Mini header with child tabs + back button */}
        <div className="bg-gradient-to-r from-[#0D3330] to-[#164340] px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => setGuruFirstView(false)}
            className="text-white/70 hover:text-white text-sm"
          >
            {t('common.back')}
          </button>
          {children.length > 1 && (
            <div className="flex gap-2 flex-1 overflow-x-auto">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    c.id === selectedChild.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/15 text-white/70 hover:bg-white/25'
                  }`}
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>
        <GuruChatThread
          key={selectedChild.id}
          childId={selectedChild.id}
          childName={selectedChild.name}
          classroomId={session?.classroom?.id}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isParent ? HOME_THEME.pageBgGradient : ''}`}
      style={!isParent ? { background: '#0a1a0f', color: '#fff' } : {}}>
      {/* Off-centre radial glow — matches landing page */}
      {!isParent && <>
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), rgba(39,129,90,0.18) 30%, transparent 60%)' }}/>
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.04, backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/></filter><rect width=\'160\' height=\'160\' filter=\'url(%23n)\' opacity=\'0.7\'/></svg>")' }}/>
      </>}
      <Toaster position="top-center" />

      {/* HOME PARENT "TODAY" VIEW — concern-first dashboard */}
      {isParent && children.length > 0 && (() => {
        const selectedChild = children.find(c => c.id === selectedChildId) || children[0];
        const childName = selectedChild.name.split(' ')[0];
        return (
          <div className="max-w-xl mx-auto px-4 pt-4 pb-4">
            {children.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0 ${
                      child.id === selectedChild.id
                        ? `${HOME_THEME.primaryBtn} shadow-md`
                        : `${HOME_THEME.cardBg} border ${HOME_THEME.border} ${HOME_THEME.headingText} hover:border-[#0D3330]/25`
                    }`}
                  >
                    <StudentAvatarIcon child={child} isSelected={child.id === selectedChild.id} />
                    {child.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
            <div className="mb-4">
              <GuruDashboardCards childId={selectedChild.id} childName={childName} />
            </div>
            <div className="mb-6">
              <ConcernCardsGrid childId={selectedChild.id} childName={childName} />
            </div>
            <div className="mb-6">
              <GuruFAQSection childAge={undefined} />
            </div>
            <div className="mb-4">
              <button
                onClick={() => setGuruFirstView(true)}
                className={`w-full ${HOME_THEME.primaryBtn} rounded-2xl p-4 text-center transition-all hover:shadow-md active:scale-[0.98]`}
              >
                <span className="text-2xl mb-1 block">🌿</span>
                <span className="text-sm font-semibold text-white">
                  {t('dashboard.chatWithGuide').replace('{childName}', childName)}
                </span>
                <span className="text-xs text-white/70 block mt-0.5">
                  {t('dashboard.fullscreenCoaching')}
                </span>
              </button>
            </div>
            <div className="mb-4">
              <a
                href={`/montree/dashboard/${selectedChild.id}`}
                className={`block ${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl p-4 text-center transition-all hover:shadow-md active:scale-[0.98]`}
              >
                <span className="text-2xl mb-1 block">📋</span>
                <span className={`text-sm font-semibold ${HOME_THEME.headingText}`}>
                  {t('dashboard.viewFullWeek').replace('{childName}', childName)}
                </span>
                <span className={`text-xs ${HOME_THEME.subtleText} block mt-0.5`}>
                  {t('dashboard.seeWorksProgress')}
                </span>
              </a>
            </div>
          </div>
        );
      })()}

      {/* Contextual Tip Bubble — home parents only */}
      {isParent && children.length > 0 && (
        <GuruContextBubble pageKey="dashboard" role="parent" />
      )}

      {/* Quick Guru FAB — home parents only */}
      {isParent && children.length > 0 && (() => {
        const selectedChild = children.find(c => c.id === selectedChildId) || children[0];
        return (
          <QuickGuruFAB
            childId={selectedChild.id}
            childName={selectedChild.name.split(' ')[0]}
          />
        );
      })()}

      {/* ═══════════════════════════════════════════════════
          TEACHER DASHBOARD — Search → Students → Pulse → Tools
          ═══════════════════════════════════════════════════ */}
      {!isParent && (
        <main className="max-w-6xl mx-auto px-4 pt-3 pb-2 flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}>

          {children.length === 0 ? (
            /* Empty state — classroom has no students yet (dark forest) */
            <button
              onClick={() => setShowBulkImport(true)}
              data-tutorial="student-grid"
              style={{
                display: 'block',
                width: '100%',
                padding: 40,
                textAlign: 'center',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(52,211,153,0.20)',
                borderRadius: 22,
                backdropFilter: 'blur(18px) saturate(140%)',
                WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                color: 'rgba(255,255,255,0.95)',
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0,0,0,0.30)',
                transition: 'all 160ms ease',
                fontFamily: '"Inter", -apple-system, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(52,211,153,0.10)';
                e.currentTarget.style.borderColor = 'rgba(52,211,153,0.40)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(52,211,153,0.20)';
              }}
            >
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(52,211,153,0.18)',
                border: '1px solid rgba(52,211,153,0.40)',
                color: '#34d399',
                marginBottom: 16,
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11H1l8-8 8 8h-8v8a4 4 0 0 0 4 4h6"/><path d="M16 8h6"/></svg>
              </div>
              <p style={{
                margin: '0 0 6px',
                fontFamily: '"Lora", Georgia, serif',
                fontSize: 22,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.95)',
                letterSpacing: -0.3,
              }}>
                {t('bulkImport.title')}
              </p>
              <p style={{
                margin: 0,
                fontFamily: '"Inter", sans-serif',
                fontSize: 13,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.5,
              }}>
                {t('bulkImport.subtitle')}
              </p>
            </button>
          ) : (
            <>
              {/* ── Today's Focus strip — hidden until teacher picks children ── */}
              <div className="mb-2">
                <TodaysFocusStrip compact />
              </div>

              {/* ── Search Bar ── */}
              <div className="mb-2">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.20)', borderRadius: 999, backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)', position: 'relative' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('nav.searchStudents') || 'Jump to student...'}
                    autoComplete="off"
                    style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 }}
                  />
                  {searchQuery && (
                    <button
                      onClick={handleSearchClear}
                      style={{ background: 'none', border: 0, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* Student count */}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6, marginLeft: 4 }}>
                  {searchQuery
                    ? `${filteredChildren.length} of ${children.length} ${t('common.students')}`
                    : `${children.length} ${t('common.students')}`
                  }
                </p>
              </div>

              {/* Birthday Banner, Daily Brief, Teacher Notes — moved out of main grid view */}

              {/* ── Student Grid — fills viewport height ── */}
              {(() => {
                const items = filteredChildren.length;
                const cols = items <= 16 ? 4 : items <= 25 ? 5 : 6;
                const rows = Math.ceil(items / cols);
                return (
                  <div
                    data-tutorial="student-grid"
                    className="flex-1 grid"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, 1fr)`,
                      gridTemplateRows: `repeat(${rows}, 1fr)`,
                      rowGap: 28, columnGap: 8,
                    }}
                  >
                    {filteredChildren.map((child, index) => (
                      <Link
                        key={child.id}
                        href={`/montree/dashboard/${child.id}`}
                        data-tutorial="student-card"
                        {...(index === 0 ? { 'data-guide': 'first-child' } : {})}
                        className="active:scale-95 transition-all flex flex-col items-center justify-center min-h-0"
                        style={{ background: 'transparent', border: 0, gap: 10, padding: '8px 4px', borderRadius: 12 }}
                      >
                        <StudentAvatarCard child={child} />
                        <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.78)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', margin: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {child.name.split(' ')[0]}
                        </p>
                      </Link>
                    ))}

                    {/* Add students via Classroom Builder in ··· menu */}
                  </div>
                );
              })()}

              {/* Intelligence + Paperwork + Teacher Tools accessible via ··· menu */}
            </>
          )}
        </main>
      )}

      {/* Welcome Modal for first-time users — HIDDEN: onboarding guides disabled */}
      {false && showWelcome && session && (
        <WelcomeModal
          teacherName={session.teacher.name}
          isOpen={showWelcome}
          onClose={() => { localStorage.setItem('montree_welcome_done', '1'); setShowWelcome(false); }}
        />
      )}

      {/* Post-onboarding guide — HIDDEN: onboarding guides disabled */}
      {false && showDashboardGuide && children.length > 0 && (
        <DashboardGuide
          childName={children[0].name}
          isHomeschoolParent={isParent}
          onDismiss={() => { localStorage.setItem('montree_guide_dashboard_done', '1'); setShowDashboardGuide(false); }}
        />
      )}

      {/* Bulk Paste Import Modal */}
      {showBulkImport && session?.classroom?.id && (
        <BulkPasteImport
          classroomId={session.classroom.id}
          existingCount={children.length}
          onImported={(importedChildren) => {
            setShowBulkImport(false);
            // Inject imported students directly into the cache — instant render, no reload needed.
            // The bulk import API returns the full list of created children synchronously,
            // so we can trust this data is already committed to the DB.
            if (childrenUrl && importedChildren.length > 0) {
              setCacheData(childrenUrl, {
                children: [...children, ...importedChildren],
              });
            }
            // After bulk import, refresh the pending-onboarding probe so the
            // two-path choice screen surfaces. We DON'T auto-redirect anymore —
            // the teacher chooses voice or photos for themselves. If the teacher
            // had previously chosen 'photo' on this classroom, the per-classroom
            // localStorage flag keeps them on the dashboard and the new children
            // simply appear in the grid for photo-driven onboarding.
            if (importedChildren.length > 0 && isEnabled('tell_guru_onboarding')) {
              setPendingOnboardingCount(prev => (prev ?? 0) + importedChildren.length);
            }
          }}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      {/* Custom pulsing ring animation */}
      <style jsx>{`
        @keyframes pulse-ring {
          0%, 100% {
            box-shadow: 0 0 0 0 ${isParent ? 'rgba(13, 51, 48, 0.5)' : 'rgba(16, 185, 129, 0.7)'};
          }
          50% {
            box-shadow: 0 0 0 20px ${isParent ? 'rgba(13, 51, 48, 0)' : 'rgba(16, 185, 129, 0)'};
          }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }
      `}</style>
    </div>
  );
}
