// /montree/dashboard/guru/page.tsx
// Montessori Guru - AI Assistant for Teachers & Homeschool Parents
// Both roles get WhatsApp-style conversational chat with role-specific personas
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { HOME_THEME } from '@/lib/montree/home-theme';
import { useI18n } from '@/lib/montree/i18n';
import GuruChatThread from '@/components/montree/guru/GuruChatThread';


interface Child {
  id: string;
  name: string;
  photo_url?: string;
}

interface GuruStatus {
  guru_access: 'unlimited' | 'paid' | 'free_trial';
  prompts_used?: number;
  prompts_limit?: number;
  prompts_remaining?: number | null;
  is_locked?: boolean;
}

function GuruContent() {
  const router = useRouter();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const preselectedChildId = searchParams.get('child');
  const upgradeResult = searchParams.get('upgrade');

  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [guruStatus, setGuruStatus] = useState<GuruStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Load session, children, and guru status
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);

    // Show upgrade result toast
    if (upgradeResult === 'success') {
      toast.success(t('guru.welcomeUpgrade'));
    } else if (upgradeResult === 'cancel') {
      toast(t('guru.upgradeCancelled'));
    }

    // Fetch children
    fetch(`/api/montree/children?classroom_id=${sess.classroom?.id}`)
      .then(r => r.json())
      .then(data => {
        const kids = data.children || [];
        setChildren(kids);

        if (preselectedChildId) {
          if (preselectedChildId === 'whole_class') {
            setSelectedChild({ id: 'whole_class', name: t('guru.wholeClass') });
          } else {
            const preselected = kids.find((c: Child) => c.id === preselectedChildId);
            if (preselected) {
              setSelectedChild(preselected);
            }
          }
        }

        setPageLoading(false);
      })
      .catch(() => {
        toast.error(t('dashboard.failedToLoad'));
        setPageLoading(false);
      });

    // Fetch guru status for homeschool parents (billing/trial)
    if (isHomeschoolParent(sess)) {
      fetch('/api/montree/guru/status')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setGuruStatus(data);
            if (data.is_locked) {
              setShowPaywall(true);
            }
          }
        })
        .catch(() => {
          // Non-critical — allow usage
        });
    }
  }, [router, preselectedChildId, upgradeResult]);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/montree/guru/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error(t('guru.couldNotCheckout'));
      }
    } catch {
      toast.error(t('common.connectionError'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isParent = isHomeschoolParent(session);
  const guruEmoji = isParent ? HOME_THEME.guruIcon : HOME_THEME.guruIconTeacher;

  if (pageLoading) {
    return (
      <div className={`h-screen flex items-center justify-center ${isParent ? HOME_THEME.pageBg : 'bg-gradient-to-br from-violet-50 to-indigo-50'}`}>
        <div className="animate-bounce text-4xl">{guruEmoji}</div>
      </div>
    );
  }

  // Auto-select first child (or use preselected)
  const activeChild = selectedChild || children[0];

  return (
    <div className="h-screen flex flex-col">
      <Toaster position="top-center" />

      {/* Paywall Modal (homeschool parents only) */}
      {showPaywall && guruStatus?.is_locked && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{t('guru.unlockGuru')}</h2>
            <p className="text-gray-600 mb-4">
              {t('guru.usedFreeSessions')}
            </p>
            <div className="rounded-xl p-4 mb-5 bg-[#F5E6D3]/60">
              <div className="text-3xl font-bold text-[#0D3330]">$5<span className="text-base font-normal text-[#0D3330]/60">{t('guru.pricePerChild')}</span></div>
              <div className="text-sm mt-1 text-[#0D3330]/70">{t('guru.unlimitedCancel')}</div>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className={`w-full py-3 text-white font-semibold rounded-xl active:scale-95 transition-all disabled:opacity-50 ${HOME_THEME.primaryBtn}`}
            >
              {checkoutLoading ? t('guru.openingCheckout') : t('guru.upgradeNow')}
            </button>
            <button onClick={() => setShowPaywall(false)} className="mt-3 text-sm text-gray-400 hover:text-gray-600">
              {t('guru.maybeLater')}
            </button>
          </div>
        </div>
      )}

      {/* Free trial banner (homeschool parents only) */}
      {guruStatus && guruStatus.guru_access === 'free_trial' && !guruStatus.is_locked && (
        <div className="bg-[#F5E6D3] border-b border-[#0D3330]/10 px-4 py-2 text-center text-sm text-[#0D3330]">
          <span className="font-medium">{guruStatus.prompts_remaining} {guruStatus.prompts_remaining === 1 ? t('guru.freeSessionRemaining') : t('guru.freeSessionsRemaining')}</span>
          <span className="mx-2">&bull;</span>
          <button onClick={() => setShowPaywall(true)} className="underline font-medium hover:text-[#164340]">{t('guru.upgradeUnlimited')}</button>
        </div>
      )}

      {/* Child selector (show if multiple children) */}
      {children.length > 1 && (
        <div className={`border-b px-4 py-2 ${isParent ? 'bg-white border-[#0D3330]/10' : 'bg-white border-gray-200'}`}>
          <select
            value={activeChild?.id || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'whole_class') {
                setSelectedChild({ id: 'whole_class', name: t('guru.wholeClass') });
                window.history.replaceState(null, '', '/montree/dashboard/guru?child=whole_class');
              } else {
                const child = children.find(c => c.id === val);
                setSelectedChild(child || null);
                if (child) {
                  window.history.replaceState(null, '', `/montree/dashboard/guru?child=${child.id}`);
                }
              }
            }}
            className={`w-full p-2 rounded-lg border text-sm ${
              isParent
                ? 'border-[#0D3330]/15 bg-[#FFFDF8] text-[#0D3330] focus:ring-1 focus:ring-[#0D3330]/20'
                : 'border-gray-200 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-violet-500'
            }`}
          >
            {!isParent && (
              <option value="whole_class">👥 {t('guru.wholeClass')}</option>
            )}
            {children.map(child => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Chat thread — same component for both teachers and parents */}
      {activeChild ? (
        <GuruChatThread
          childId={activeChild.id}
          childName={activeChild.name}
          classroomId={session?.classroom?.id}
          isTeacher={!isParent}
          isWholeClassMode={activeChild.id === 'whole_class'}
          onGuruLimitReached={() => {
            setShowPaywall(true);
            if (guruStatus) {
              setGuruStatus({ ...guruStatus, is_locked: true, prompts_remaining: 0 });
            }
          }}
        />
      ) : (
        <div className={`flex-1 flex items-center justify-center ${isParent ? HOME_THEME.pageBg : 'bg-gradient-to-br from-violet-50 to-indigo-50'}`}>
          <p className={isParent ? HOME_THEME.subtleText : 'text-gray-500'}>{t('guru.noChildren')}</p>
        </div>
      )}
    </div>
  );
}

export default function GuruPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">🌿</div>
      </div>
    }>
      <GuruContent />
    </Suspense>
  );
}
