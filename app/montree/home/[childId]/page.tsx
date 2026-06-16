// /montree/home/[childId]/page.tsx
// The Montree Home Experience — Ivy is the front door. Three calm surfaces:
//   Ivy   — the companion (chat, photos, the Step Card, the whole loop)
//   Shelf — the child's works at a glance
//   Plan  — the family's week (calendar + routines)
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import { getSession, recoverSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import BottomTabs, { type HomeTab } from '@/components/montree/home/BottomTabs';
import AmbientParticles from '@/components/montree/home/AmbientParticles';
import ErrorBoundary from '@/components/montree/ErrorBoundary';
import { useI18n } from '@/lib/montree/i18n';

// Only the active surface renders. Defer the heavy ones.
const IvyChat = dynamic(() => import('@/components/montree/home/IvyChat'), { ssr: false });
const ShelfView = dynamic(() => import('@/components/montree/home/ShelfView'), { ssr: false });
const FamilyPlan = dynamic(() => import('@/components/montree/home/FamilyPlan'), { ssr: false });
const Shop = dynamic(() => import('@/components/montree/home/Shop'), { ssr: false });

interface Child {
  id: string;
  name: string;
  photo_url?: string;
}

export default function HomePage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;

  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HomeTab>('ivy');
  const [shelfBadge, setShelfBadge] = useState(false);
  const [shelfRefreshTrigger, setShelfRefreshTrigger] = useState(0);
  const [planRefreshTrigger, setPlanRefreshTrigger] = useState(0);
  const [ivyPrefill, setIvyPrefill] = useState('');
  const { t } = useI18n();

  // Auth — localStorage first, then httpOnly-cookie recovery.
  useEffect(() => {
    let cancelled = false;
    async function initAuth() {
      let sess = getSession();
      if (!sess) sess = await recoverSession();
      if (cancelled) return;
      if (!sess) { router.replace('/montree/login'); return; }
      if (!isHomeschoolParent(sess)) { router.replace('/montree/dashboard'); return; }
      setSession(sess);

      if (sess.classroom?.id) {
        try {
          const r = await fetch(`/api/montree/children?classroom_id=${sess.classroom.id}`);
          if (!r.ok) throw new Error(`Children fetch failed: ${r.status}`);
          const data = await r.json();
          if (cancelled) return;
          const kids = data.children || [];
          setChildren(kids);
          setLoading(false);
          if (kids.length > 0 && !kids.find((c: Child) => c.id === childId)) router.replace(`/montree/home/${kids[0].id}`);
          if (kids.length === 0) router.replace('/montree/home/setup');
        } catch (err) {
          if (cancelled) return;
          console.error('Children fetch failed:', err);
          setLoading(false);
        }
      } else if (!cancelled) {
        setLoading(false);
      }
    }
    initAuth();
    return () => { cancelled = true; };
  }, [router, childId]);

  const handleShelfUpdated = useCallback(() => {
    setShelfRefreshTrigger((p) => p + 1);
    setShelfBadge(true);
    setTimeout(() => setShelfBadge(false), 3000);
  }, []);

  const handleScheduleUpdated = useCallback(() => {
    setPlanRefreshTrigger((p) => p + 1);
  }, []);

  // Shelf "ask the guide" and Plan "ask Ivy" both route into the conversation.
  const handleAskIvy = useCallback((message: string) => {
    setIvyPrefill(message);
    setActiveTab('ivy');
  }, []);

  const selectedChild = children.find((c) => c.id === childId) || children[0] || null;

  if (loading || !session || (!selectedChild && children.length > 0)) {
    return (
      <div className={`h-dvh flex items-center justify-center ${BIO.bg.deep}`}>
        <AmbientParticles />
        <div className="relative z-10 text-center">
          <div className="animate-pulse text-5xl mb-4">🌿</div>
          <p className={`text-sm ${BIO.text.secondary}`}>{t('home.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-dvh flex flex-col ${BIO.bg.deep}`}>
      <AmbientParticles />

      <header className={`relative z-10 ${BIO.bg.surface} border-b ${BIO.border.subtle} px-4 py-3 flex items-center shrink-0`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#4ADE80]/15 flex items-center justify-center shrink-0" style={{ boxShadow: BIO.glow.soft }}>
            {selectedChild?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- small avatar from a direct storage URL
              <img src={selectedChild.photo_url} className="w-full h-full object-cover rounded-full" alt={`${selectedChild.name}'s photo`} />
            ) : (
              <span className={`text-sm font-bold ${BIO.text.mint}`}>{selectedChild?.name?.charAt(0) || '?'}</span>
            )}
          </div>
          <h1 className={`font-semibold ${BIO.text.primary} truncate`}>{selectedChild?.name?.split(' ')[0] || t('home.loading')}</h1>

          {children.length > 1 && (
            <div className="flex gap-1.5 ml-2 overflow-x-auto shrink-0">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/montree/home/${c.id}`)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${c.id === childId ? `${BIO.bg.mintSubtle} ${BIO.text.mint}` : `${BIO.text.muted} hover:text-white/50`}`}
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => router.push('/montree/home/setup')} className={`p-2 rounded-full ${BIO.btn.ghost} ml-2 shrink-0`} title={t('home.header.addChild')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      <main className="relative z-10 flex-1 overflow-hidden">
        {activeTab === 'ivy' && (
          <ErrorBoundary title={t('home.error.title')} fallbackMessage={t('home.error.chatFailed')} retryLabel={t('home.error.tryAgain')}>
            <IvyChat
              key={childId}
              childId={childId}
              childName={selectedChild?.name || ''}
              classroomId={session?.classroom?.id}
              onShelfUpdated={handleShelfUpdated}
              onScheduleUpdated={handleScheduleUpdated}
              prefillMessage={ivyPrefill}
              onPrefillConsumed={() => setIvyPrefill('')}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'shelf' && (
          <ErrorBoundary title={t('home.error.title')} fallbackMessage={t('home.error.shelfFailed')} retryLabel={t('home.error.tryAgain')}>
            <ShelfView childId={childId} classroomId={session?.classroom?.id} onAskGuide={handleAskIvy} refreshTrigger={shelfRefreshTrigger} />
          </ErrorBoundary>
        )}
        {activeTab === 'plan' && (
          <ErrorBoundary title={t('home.error.title')} fallbackMessage={t('home.error.chatFailed')} retryLabel={t('home.error.tryAgain')}>
            <FamilyPlan childId={childId} refreshTrigger={planRefreshTrigger} onAskIvy={handleAskIvy} />
          </ErrorBoundary>
        )}
        {activeTab === 'shop' && (
          <ErrorBoundary title={t('home.error.title')} fallbackMessage={t('home.error.chatFailed')} retryLabel={t('home.error.tryAgain')}>
            <Shop childId={childId} onAskIvy={handleAskIvy} />
          </ErrorBoundary>
        )}
      </main>

      <div className="relative z-10 shrink-0">
        <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} shelfBadge={shelfBadge} />
      </div>
    </div>
  );
}
