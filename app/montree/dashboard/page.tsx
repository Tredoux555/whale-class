// /montree/dashboard/page.tsx
// Clean, modern child picker with responsive grid
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { HOME_THEME } from '@/lib/montree/home-theme';
import { toast, Toaster } from 'sonner';
import WelcomeModal from '@/components/montree/WelcomeModal';
import GuruDailyBriefing from '@/components/montree/guru/GuruDailyBriefing';
import ConcernCardsGrid from '@/components/montree/guru/ConcernCardsGrid';
import QuickGuruFAB from '@/components/montree/guru/QuickGuruFAB';
import WeeklyReview from '@/components/montree/guru/WeeklyReview';
import DashboardGuide from '@/components/montree/onboarding/DashboardGuide';


interface Child {
  id: string;
  name: string;
  photo_url?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDashboardGuide, setShowDashboardGuide] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);

    // Show welcome modal only once per device (localStorage) AND only if tutorial not completed
    if (!sess.teacher.has_completed_tutorial && !localStorage.getItem('montree_welcome_done')) {
      setShowWelcome(true);
    }
  }, [router]);

  useEffect(() => {
    if (!session?.classroom?.id) {
      setLoading(false);
      return;
    }

    fetch(`/api/montree/children?classroom_id=${session.classroom.id}`)
      .then(r => r.json())
      .then(data => {
        const kids = data.children || [];
        setChildren(kids);
        // Auto-select first child for home parents
        if (kids.length > 0 && !selectedChildId) {
          setSelectedChildId(kids[0].id);
        }
        setLoading(false);
        // Show dashboard guide once — on first onboard or first visit with children
        const justOnboarded = searchParams.get('onboarded') === '1';
        const guideDone = !!localStorage.getItem('montree_guide_dashboard_done');
        if (kids.length > 0 && !guideDone && (justOnboarded || !session?.teacher?.has_completed_tutorial)) {
          setShowDashboardGuide(true);
          if (justOnboarded) {
            window.history.replaceState({}, '', '/montree/dashboard');
          }
        }
      })
      .catch(() => {
        toast.error('Failed to load');
        setLoading(false);
      });
  }, [session?.classroom?.id, searchParams]);

  const isParent = session ? isHomeschoolParent(session) : false;

  if (!session || loading) {
    return (
      <div className={`min-h-screen ${isParent ? HOME_THEME.pageBgGradient : 'bg-gradient-to-br from-emerald-50 to-teal-50'} flex items-center justify-center`}>
        <div className="animate-bounce text-5xl">{isParent ? '🌿' : '🌳'}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isParent ? HOME_THEME.pageBgGradient : 'bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50'}`}>
      <Toaster position="top-center" />

      {/* Student/child count subtitle — teachers only */}
      {!isParent && (
        <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 px-4 py-2 text-center text-sm font-medium">
          {children.length} students
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

            {/* Morning Briefing — auto-fetch daily plan */}
            <div className="mb-4">
              <GuruDailyBriefing childId={selectedChild.id} childName={childName} />
            </div>

            {/* Weekly Review — collapsible banner */}
            <div className="mb-4">
              <WeeklyReview childId={selectedChild.id} childName={childName} />
            </div>

            {/* Concern Cards Grid — "I'm worried about..." */}
            <div className="mb-6">
              <ConcernCardsGrid childId={selectedChild.id} childName={childName} />
            </div>

            {/* Quick link to child's week view */}
            <div className="mb-4">
              <a
                href={`/montree/dashboard/${selectedChild.id}`}
                className={`block ${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl p-4 text-center transition-all hover:shadow-md active:scale-[0.98]`}
              >
                <span className="text-2xl mb-1 block">📋</span>
                <span className={`text-sm font-semibold ${HOME_THEME.headingText}`}>
                  View {childName}&apos;s Full Week
                </span>
                <span className={`text-xs ${HOME_THEME.subtleText} block mt-0.5`}>
                  See works, progress, and gallery
                </span>
              </a>
            </div>
          </div>
        );
      })()}

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
              {isParent ? 'Tap to add your first child' : 'Tap to add your first student'}
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
              <span className={`text-xs ${isParent ? 'text-[#0D3330]/40' : 'text-gray-400'}`}>Add</span>
            </Link>
          </div>
        )}
      </main>

      {/* Welcome Modal for first-time users */}
      {showWelcome && session && (
        <WelcomeModal
          teacherName={session.teacher.name}
          isOpen={showWelcome}
          onClose={() => { localStorage.setItem('montree_welcome_done', '1'); setShowWelcome(false); }}
        />
      )}

      {/* Post-onboarding guide — highlights first child card */}
      {showDashboardGuide && children.length > 0 && (
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
