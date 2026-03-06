// /montree/dashboard/page.tsx
// Clean, modern child picker with responsive grid
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { HOME_THEME } from '@/lib/montree/home-theme';
import { useI18n } from '@/lib/montree/i18n';
import { toast, Toaster } from 'sonner';
import { useMontreeData } from '@/lib/montree/cache';
import { DashboardSkeleton } from '@/components/montree/Skeletons';
import WelcomeModal from '@/components/montree/WelcomeModal';
import GuruDashboardCards from '@/components/montree/guru/GuruDashboardCards';
import ConcernCardsGrid from '@/components/montree/guru/ConcernCardsGrid';
import QuickGuruFAB from '@/components/montree/guru/QuickGuruFAB';
import DashboardGuide from '@/components/montree/onboarding/DashboardGuide';
import GuruFAQSection from '@/components/montree/guru/GuruFAQSection';
import GuruContextBubble from '@/components/montree/guru/GuruContextBubble';
import GuruChatThread from '@/components/montree/guru/GuruChatThread';
import WeeklyAdminCard from '@/components/montree/voice-notes/WeeklyAdminCard';


interface Child {
  id: string;
  name: string;
  photo_url?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(() => {
    if (typeof window === 'undefined') return null;
    return getSession();
  });
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDashboardGuide, setShowDashboardGuide] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [guruFirstView, setGuruFirstView] = useState(false);

  // SWR-cached children fetch — instant on revisit, background refresh if stale
  const childrenUrl = session?.classroom?.id
    ? `/api/montree/children?classroom_id=${session.classroom.id}`
    : null;
  const { data: childrenData, loading, error: childrenError } = useMontreeData<{ children: Child[] }>(childrenUrl);
  const children = childrenData?.children || [];

  useEffect(() => {
    if (!session) {
      router.push('/montree/login');
      return;
    }

    // Show welcome modal only once per device (localStorage) AND only if tutorial not completed
    if (!session.teacher.has_completed_tutorial && !localStorage.getItem('montree_welcome_done')) {
      setShowWelcome(true);
    }
  }, [router, session]);

  // Extract searchParams value once (avoids object reference in deps)
  const justOnboarded = searchParams.get('onboarded') === '1';

  // Handle homeschool redirect + guide triggers
  useEffect(() => {
    if (loading || children.length === 0) return;

    // Redirect home parents to the new Portal + Shelf experience
    if (session && isHomeschoolParent(session)) {
      router.replace(`/montree/home/${children[0].id}`);
      return;
    }

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

  // Show error toast
  useEffect(() => {
    if (childrenError) toast.error(t('dashboard.failedToLoad'));
  }, [childrenError]);

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
      <div className="flex flex-col h-screen">
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

      {/* Student/child count subtitle — teachers only */}
      {!isParent && (
        <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 px-4 py-2 text-center text-sm font-medium">
          {children.length} {t('common.students')}
        </div>
      )}

      {/* HOME PARENT "TODAY" VIEW — concern-first dashboard */}
      {isParent && children.length > 0 && (() => {
        const selectedChild = children.find(c => c.id === selectedChildId) || children[0];
        const childName = selectedChild.name.split(' ')[0];
        return (
          <div className="max-w-xl mx-auto px-4 pt-4 pb-4">
            {/* Child selector — only show if multiple children */}
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
                        <img src={child.photo_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        child.name.charAt(0)
                      )}
                    </div>
                    {child.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}

            {/* Guru Dashboard — single API call for all cards */}
            <div className="mb-4">
              <GuruDashboardCards childId={selectedChild.id} childName={childName} />
            </div>

            {/* Concern Cards Grid — "I'm worried about..." */}
            <div className="mb-6">
              <ConcernCardsGrid childId={selectedChild.id} childName={childName} />
            </div>

            {/* FAQ Section — instant answers, no API calls */}
            <div className="mb-6">
              <GuruFAQSection childAge={undefined} />
            </div>

            {/* Guru full-screen chat button */}
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

            {/* Quick link to child's week view */}
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
                  {t('dashboard.seeWorksProgressGallery')}
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

      {/* Weekly Admin Card — teachers only */}
      {!isParent && session?.classroom?.id && children.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <WeeklyAdminCard classroomId={session.classroom.id} />
        </div>
      )}

      {/* Student Grid — teachers always see this; home parents only see empty state (add first child) */}
      <main className={`max-w-6xl mx-auto px-4 py-8 ${isParent && children.length > 0 ? 'hidden' : ''}`}>
        {children.length === 0 ? (
          <Link
            href="/montree/dashboard/students"
            data-tutorial="student-grid"
            className={`block ${isParent ? `${HOME_THEME.cardBg} border ${HOME_THEME.border}` : 'bg-white'} rounded-2xl shadow-md p-12 text-center hover:shadow-lg transition-shadow animate-pulse-ring`}
          >
            <span className="text-6xl mb-4 block">{isParent ? '🌱' : '👶'}</span>
            <p className={`${isParent ? HOME_THEME.headingText : 'text-gray-600'} font-medium text-lg`}>
              {isParent ? t('dashboard.tapAddFirstChild') : t('dashboard.tapAddFirstStudent')}
            </p>
          </Link>
        ) : (
          <div data-tutorial="student-grid" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {children.map((child, index) => (
              <Link
                key={child.id}
                href={`/montree/dashboard/${child.id}`}
                data-tutorial="student-card"
                {...(index === 0 ? { 'data-guide': 'first-child' } : {})}
                className={`${isParent ? `${HOME_THEME.cardBg} border ${HOME_THEME.border}` : 'bg-white'} rounded-2xl shadow-md hover:shadow-xl active:scale-95 transition-all p-4 flex flex-col items-center`}
              >
                {/* Avatar */}
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full ${isParent ? 'bg-gradient-to-br from-[#0D3330] to-[#164340]' : 'bg-gradient-to-br from-emerald-400 to-teal-500'} flex items-center justify-center text-white font-bold text-2xl sm:text-3xl overflow-hidden mb-3 shadow-md`}>
                  {child.photo_url ? (
                    <img src={child.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    child.name.charAt(0)
                  )}
                </div>
                {/* Name */}
                <p className="text-sm font-semibold text-gray-700 truncate w-full text-center">
                  {child.name.split(' ')[0]}
                </p>
              </Link>
            ))}

            {/* Add Student Card */}
            <Link
              href="/montree/dashboard/students"
              data-tutorial="add-student-button"
              className={`${isParent ? 'bg-[#FFFDF8]/60 border-2 border-dashed border-[#0D3330]/20 hover:border-[#0D3330]/40 hover:bg-[#F5E6D3]/50' : 'bg-white/60 border-2 border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'} rounded-2xl transition-all p-4 flex flex-col items-center justify-center min-h-[120px]`}
            >
              <span className={`text-3xl ${isParent ? 'text-[#0D3330]/40' : 'text-gray-400'} mb-1`}>+</span>
              <span className={`text-xs ${isParent ? 'text-[#0D3330]/40' : 'text-gray-400'}`}>{t('common.add')}</span>
            </Link>
          </div>
        )}
      </main>

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
