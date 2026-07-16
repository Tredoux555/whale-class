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

  // Chat fills the viewport MINUS the sticky DashboardHeader (which lives above
  // {children} in the shared dashboard layout). Without this, the page is a full
  // 100dvh block starting BELOW the header → the composer falls off the bottom of
  // the screen and Guru looks broken (Tredoux, Jul 3 2026). We measure the header
  // live so it stays correct across safe-area insets, the 2-row teacher header,
  // and orientation changes.
  const [chatHeight, setChatHeight] = useState('100dvh');
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('[data-dashboard-header]') as HTMLElement | null;
      const h = header?.offsetHeight ?? 0;
      setChatHeight(h > 0 ? `calc(100dvh - ${h}px)` : '100dvh');
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    const header = document.querySelector('[data-dashboard-header]');
    let ro: ResizeObserver | undefined;
    if (header && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(header);
    }
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      ro?.disconnect();
    };
  }, []);

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

    // PARALLEL: Fetch children + guru status together
    const isParentUser = isHomeschoolParent(sess);
    const fetches: Promise<void>[] = [];

    // Fetch children — ONLY when we have a real classroom id. A pure principal
    // (no classroomId on the session) was interpolating the literal string
    // "undefined" → GET /api/montree/children?classroom_id=undefined → 404 →
    // "failed to load" toast and an empty Guru. (Session 140.)
    const classroomId = sess.classroom?.id;
    if (classroomId) {
      fetches.push(
        fetch(`/api/montree/children?classroom_id=${classroomId}`)
          .then(r => { if (!r.ok) throw new Error(`Children fetch: ${r.status}`); return r.json(); })
          .then(data => {
            const kids = data.children || [];
            setChildren(kids);
            if (preselectedChildId) {
              if (preselectedChildId === 'whole_class') {
                setSelectedChild({ id: 'whole_class', name: t('guru.wholeClass') });
              } else {
                const preselected = kids.find((c: Child) => c.id === preselectedChildId);
                if (preselected) setSelectedChild(preselected);
              }
            }
          })
          .catch(() => {
            toast.error(t('dashboard.failedToLoad'));
          })
      );
    } else {
      setChildren([]);
    }

    // Fetch guru status for homeschool parents (billing/trial)
    if (isParentUser) {
      fetches.push(
        fetch('/api/montree/guru/status')
          .then(r => { if (!r.ok) throw new Error(`Guru status: ${r.status}`); return r.json(); })
          .then(data => {
            if (data.success) {
              setGuruStatus(data);
              if (data.is_locked) setShowPaywall(true);
            }
          })
          .catch(() => { /* Non-critical */ })
      );
    }

    Promise.all(fetches).finally(() => setPageLoading(false));
  }, [router, preselectedChildId, upgradeResult]);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/montree/guru/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Checkout failed: ${res.status}`);
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
    if (!isParent) {
      return (
        <div style={{ height: chatHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1a0f', backgroundImage: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="animate-pulse" style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            </div>
            <p style={{ fontFamily: '"Inter", -apple-system, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Loading Guru…</p>
          </div>
        </div>
      );
    }
    return (
      <div className={`flex items-center justify-center ${HOME_THEME.pageBg}`} style={{ height: chatHeight }}>
        <div className="animate-bounce text-4xl">{guruEmoji}</div>
      </div>
    );
  }

  // Auto-select first child (or use preselected)
  const activeChild = selectedChild || children[0];

  return (
    <div className="flex flex-col" style={{ height: chatHeight }}>
      <Toaster position="top-center" />

      {/* Paywall Modal (homeschool parents only) */}
      {showPaywall && guruStatus?.is_locked && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="rounded-2xl border border-[rgba(52,211,153,0.15)] max-w-sm w-full p-6 text-center" style={{ background: '#0c1f14' }}>
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="text-xl font-bold text-white/95 mb-2" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>{t('guru.unlockGuru')}</h2>
            <p className="text-white/70 mb-4">
              {t('guru.usedFreeSessions')}
            </p>
            <div className="rounded-xl p-4 mb-5 border border-[rgba(52,211,153,0.15)]" style={{ background: 'rgba(52,211,153,0.06)' }}>
              <div className="text-3xl font-bold text-white/95">$5<span className="text-base font-normal text-white/50">{t('guru.pricePerChild')}</span></div>
              <div className="text-sm mt-1 text-white/60">{t('guru.unlimitedCancel')}</div>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className={`w-full py-3 text-white font-semibold rounded-xl active:scale-95 transition-all disabled:opacity-50 ${HOME_THEME.primaryBtn}`}
            >
              {checkoutLoading ? t('guru.openingCheckout') : t('guru.upgradeNow')}
            </button>
            <button onClick={() => setShowPaywall(false)} className="mt-3 text-sm text-white/40 hover:text-white/70">
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
        <div
          className={isParent ? `border-b px-4 py-2 bg-white border-[#0D3330]/10` : undefined}
          style={!isParent ? {
            borderBottom: '1px solid rgba(52,211,153,0.12)',
            padding: '8px 16px',
            background: 'rgba(7,18,12,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          } : undefined}
        >
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
            className={isParent ? `w-full p-2 rounded-lg border text-sm border-[#0D3330]/15 bg-[#FFFDF8] text-[#0D3330] focus:ring-1 focus:ring-[#0D3330]/20` : undefined}
            style={!isParent ? {
              width: '100%', padding: '8px 10px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(52,211,153,0.20)',
              color: 'rgba(255,255,255,0.85)',
              fontFamily: '"Inter", -apple-system, sans-serif',
              fontSize: 13,
              outline: 'none',
            } : undefined}
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
          <p className={isParent ? HOME_THEME.subtleText : 'text-[#3E2723]/60'}>{t('guru.noChildren')}</p>
        </div>
      )}
    </div>
  );
}

export default function GuruPage() {
  return (
    <Suspense fallback={
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1a0f' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
      </div>
    }>
      <GuruContent />
    </Suspense>
  );
}
