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
import { useMontreeData } from '@/lib/montree/cache';
import { useFeatures } from '@/hooks/useFeatures';
import { DashboardSkeleton } from '@/components/montree/Skeletons';
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
const BatchReportsCard = dynamic(() => import('@/components/montree/reports/BatchReportsCard'), { ssr: false });
const BulkPasteImport = dynamic(() => import('@/components/montree/BulkPasteImport'), { ssr: false });
const TeacherNotes = dynamic(() => import('@/components/montree/TeacherNotes'), { ssr: false });


interface Child {
  id: string;
  name: string;
  photo_url?: string;
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

  // ─── Inline search + tools state (must be before early returns) ───
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  // SWR-cached children fetch — instant on revisit, background refresh if stale
  const childrenUrl = session?.classroom?.id
    ? `/api/montree/children?classroom_id=${session.classroom.id}`
    : null;
  const { data: childrenData, loading, error: childrenError, refetch: refetchChildren } = useMontreeData<{ children: Child[] }>(childrenUrl);
  const children = childrenData?.children || [];

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

  if (!session || loading) {
    return <DashboardSkeleton />;
  }

  // Homeschool parents get redirected — show skeleton while redirect fires
  if (isParent && children.length > 0) {
    return <DashboardSkeleton />;
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
    <div className={`min-h-screen ${isParent ? HOME_THEME.pageBgGradient : 'bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50'}`}>
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
                    <div className={`w-6 h-6 rounded-full ${child.id === selectedChild.id ? 'bg-white/20' : 'bg-[#0D3330]/10'} flex items-center justify-center text-xs font-bold overflow-hidden`}>
                      {child.photo_url ? (
                        <img src={child.photo_url} className="w-full h-full object-cover" alt="" loading="lazy" />
                      ) : (
                        child.name.charAt(0)
                      )}
                    </div>
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
        <main className="max-w-6xl mx-auto px-4 pt-5 pb-8">

          {children.length === 0 ? (
            /* Empty state — bulk import or add manually */
            <div className="space-y-4">
              <button
                onClick={() => setShowBulkImport(true)}
                data-tutorial="student-grid"
                className="block w-full bg-white rounded-2xl shadow-md p-10 text-center hover:shadow-lg transition-shadow animate-pulse-ring"
              >
                <span className="text-5xl mb-3 block">📋</span>
                <p className="text-gray-700 font-semibold text-lg mb-1">
                  {t('bulkImport.title')}
                </p>
                <p className="text-gray-400 text-sm">
                  {t('bulkImport.subtitle')}
                </p>
              </button>
              <Link
                href="/montree/dashboard/students"
                className="block bg-white/60 border-2 border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl transition-all p-6 text-center"
              >
                <span className="text-2xl text-gray-400 mb-1 block">+</span>
                <p className="text-gray-400 text-sm">
                  {t('dashboard.tapAddFirstStudent')}
                </p>
              </Link>
            </div>
          ) : (
            <>
              {/* ── Search Bar ── */}
              <div className="mb-4">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('nav.searchStudents') || 'Jump to student...'}
                    className="w-full bg-white rounded-xl border border-gray-200 shadow-sm pl-10 pr-9 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      onClick={handleSearchClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* Student count */}
                <p className="text-xs text-gray-400 mt-1.5 ml-1">
                  {searchQuery
                    ? `${filteredChildren.length} of ${children.length} ${t('common.students')}`
                    : `${children.length} ${t('common.students')}`
                  }
                </p>
              </div>

              {/* ── Student Grid ── */}
              <div data-tutorial="student-grid" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6">
                {filteredChildren.map((child, index) => (
                  <Link
                    key={child.id}
                    href={`/montree/dashboard/${child.id}`}
                    data-tutorial="student-card"
                    {...(index === 0 ? { 'data-guide': 'first-child' } : {})}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-lg active:scale-95 transition-all p-3 flex flex-col items-center border border-gray-100"
                  >
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xl sm:text-2xl overflow-hidden mb-2 shadow-md">
                      {child.photo_url ? (
                        <img src={child.photo_url} className="w-full h-full object-cover" alt="" loading="lazy" />
                      ) : (
                        child.name.charAt(0)
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-700 truncate w-full text-center">
                      {child.name.split(' ')[0]}
                    </p>
                  </Link>
                ))}

                {/* Add Student Card — only show when not searching */}
                {!searchQuery && (
                  <Link
                    href="/montree/dashboard/students"
                    data-tutorial="add-student-button"
                    className="bg-white/60 border-2 border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl transition-all p-3 flex flex-col items-center justify-center min-h-[100px]"
                  >
                    <span className="text-2xl text-gray-400 mb-1">+</span>
                    <span className="text-xs text-gray-400">{t('common.add')}</span>
                  </Link>
                )}
              </div>


              {/* ── Teacher Tools (collapsible) ── */}
              {session?.classroom?.id && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setToolsOpen(!toolsOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🛠️</span>
                      {t('dashboard.teacherTools') || 'Teacher Tools'}
                    </span>
                    <span className={`text-gray-400 transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {toolsOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      <WeeklyAdminCard classroomId={session.classroom.id} children={children} />
                      <BatchReportsCard classroomId={session.classroom.id} children={children} />
                      <TeacherNotes classroomId={session.classroom.id} teacherId={session.teacher?.id || ''} teacherName={session.teacher?.name || ''} />
                    </div>
                  )}
                </div>
              )}
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
          onImported={() => {
            setShowBulkImport(false);
            refetchChildren();
            // Clear student search cache so header search picks up new students
            try { sessionStorage.removeItem(`montree_students_${session.classroom?.id}`); } catch {}
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
