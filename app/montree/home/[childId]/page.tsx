// /montree/home/[childId]/page.tsx
// The Montree Home Experience — camera-first (vision plan, Jul 2 2026).
// Three calm surfaces:
//   Today   — the capture surface IS the front door ("show me what Marina is
//             doing"); Ivy's conversation is the response surface underneath.
//   Journey — moments, milestones, and Ivy's insight. Never a report card.
//   Plan    — the family's week (Shop folded in behind a sub-toggle).
// First visit for a child with no profile → the First Meeting placement chat.
//
// ARCHITECTURAL RULES (do not break):
// - IvyChat stays MOUNTED (hidden, not unmounted) while other tabs show, so
//   the conversation never resets on tab switches or camera↔chat toggles.
// - Tapping the ACTIVE Today tab returns to the capture surface.
// - New home copy is jargon-free: no areas, no statuses, no shelf language.
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import { getSession, recoverSession, isHomeschoolContext, setSession as persistSession, type MontreeSession } from '@/lib/montree/auth';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import BottomTabs, { type HomeTab } from '@/components/montree/home/BottomTabs';
import AmbientParticles from '@/components/montree/home/AmbientParticles';
import ErrorBoundary from '@/components/montree/ErrorBoundary';
import { useI18n } from '@/lib/montree/i18n';
import StepCard, { type StepCardData } from '@/components/montree/home/StepCard';

// Only what's needed renders. Defer the heavy surfaces.
const IvyChat = dynamic(() => import('@/components/montree/home/IvyChat'), { ssr: false });
const TodayCapture = dynamic(() => import('@/components/montree/home/TodayCapture'), { ssr: false });
const JourneyView = dynamic(() => import('@/components/montree/home/JourneyView'), { ssr: false });
const FirstMeeting = dynamic(() => import('@/components/montree/home/FirstMeeting'), { ssr: false });
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
  const [activeTab, setActiveTab] = useState<HomeTab>('today');
  const [captureMode, setCaptureMode] = useState(true);
  const [journeyBadge, setJourneyBadge] = useState(false);
  const [shelfRefreshTrigger, setShelfRefreshTrigger] = useState(0);
  const [planRefreshTrigger, setPlanRefreshTrigger] = useState(0);
  const [journeyRefreshTrigger, setJourneyRefreshTrigger] = useState(0);
  const [ivyPrefill, setIvyPrefill] = useState('');
  const [planSurface, setPlanSurface] = useState<'week' | 'shop'>('week');
  // First Meeting gate: null = checking, false = needs placement, true = met.
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  // A capture handed to Ivy (from TodayCapture or the First Meeting's photo).
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const { t } = useI18n();

  // Auth — localStorage first, then httpOnly-cookie recovery.
  useEffect(() => {
    let cancelled = false;
    async function initAuth() {
      let sess = getSession();
      if (!sess) sess = await recoverSession();
      if (cancelled) return;
      if (!sess) { router.replace('/montree/login'); return; }

      // Allow homeschool parents AND homeschool founders (a teacher/principal
      // whose school is a homeschool). Older localStorage sessions may not carry
      // plan_type, so confirm via auth/me before redirecting a non-parent away.
      let homeOk = isHomeschoolContext(sess);
      if (!homeOk) {
        try {
          const meRes = await fetch('/api/montree/auth/me', { credentials: 'include' });
          if (meRes.ok) {
            const me = await meRes.json();
            if (me?.school?.plan_type === 'homeschool') {
              homeOk = true;
              if (me.teacher && me.school) {
                const enriched: MontreeSession = { teacher: me.teacher, school: me.school, classroom: me.classroom || null, loginAt: new Date().toISOString() };
                persistSession(enriched);
                sess = enriched;
              }
            }
          }
        } catch { /* fall through to redirect */ }
      }
      if (cancelled) return;
      if (!homeOk) { router.replace('/montree/dashboard'); return; }
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

  // First Meeting gate — has Ivy met this child yet?
  useEffect(() => {
    let cancelled = false;
    setHasProfile(null);
    (async () => {
      try {
        const r = await fetch(`/api/montree/companion/placement?child_id=${childId}`);
        if (cancelled) return;
        if (!r.ok) { setHasProfile(true); return; } // fail open — never trap the family
        const d = await r.json();
        setHasProfile(d.has_profile !== false);
      } catch {
        if (!cancelled) setHasProfile(true);
      }
    })();
    return () => { cancelled = true; };
  }, [childId]);

  const handleShelfUpdated = useCallback(() => {
    setShelfRefreshTrigger((p) => p + 1);
    setJourneyRefreshTrigger((p) => p + 1);
    setJourneyBadge(true);
    setTimeout(() => setJourneyBadge(false), 3000);
  }, []);

  const handleScheduleUpdated = useCallback(() => {
    setPlanRefreshTrigger((p) => p + 1);
  }, []);

  // Journey "the map", Plan "ask Ivy" — everything routes into the conversation.
  const handleAskIvy = useCallback((message: string) => {
    setIvyPrefill(message);
    setActiveTab('today');
    setCaptureMode(false);
  }, []);

  // Tab logic: tapping the ACTIVE Today tab returns to the capture surface.
  const handleTabChange = useCallback((tab: HomeTab) => {
    if (tab === 'today' && activeTab === 'today') {
      setCaptureMode(true);
      return;
    }
    setActiveTab(tab);
    if (tab === 'journey') setJourneyRefreshTrigger((p) => p + 1);
  }, [activeTab]);

  // Capture → conversation handoffs.
  const handlePhoto = useCallback((file: File) => {
    setPendingImage(file);
    setCaptureMode(false);
  }, []);
  const handleWords = useCallback((text: string) => {
    setPendingText(text);
    setCaptureMode(false);
  }, []);
  const handleKeyboard = useCallback(() => setCaptureMode(false), []);
  const handleAutoSendConsumed = useCallback(() => { setPendingImage(null); setPendingText(null); }, []);

  // Tapping the Today chip (or a Journey work) → the hand-held how-to card.
  const [card, setCard] = useState<StepCardData | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardTitle, setCardTitle] = useState('');
  const handlePresentWork = useCallback(async (work: { work_name: string; area: string }) => {
    setCardTitle(work.work_name);
    setCard(null);
    setCardLoading(true);
    try {
      const r = await fetch('/api/montree/companion/step-card', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, work_name: work.work_name, area: work.area }),
      });
      if (r.ok) { const d = await r.json(); if (d.card) setCard(d.card as StepCardData); }
    } catch { /* ignore */ }
    finally { setCardLoading(false); }
  }, [childId]);
  const closeCard = useCallback(() => { setCard(null); setCardLoading(false); setCardTitle(''); }, []);

  // First Meeting complete → straight into the loop (photo goes to Ivy).
  const handleFirstMeetingComplete = useCallback((firstPhoto?: File) => {
    setHasProfile(true);
    if (firstPhoto) {
      setPendingImage(firstPhoto);
      setCaptureMode(false);
    } else {
      setCaptureMode(true);
    }
  }, []);

  const selectedChild = children.find((c) => c.id === childId) || children[0] || null;
  // Home is a family, not a classroom. Only offer a sibling switcher for a realistic
  // family-sized set; when this is pointed at a full class (e.g. a founder testing on
  // their school roster), show ONLY the active child — never a class list.
  const HOME_SIBLING_MAX = 4;
  const siblings = children.length <= HOME_SIBLING_MAX ? children : [];

  if (loading || !session || (!selectedChild && children.length > 0) || hasProfile === null) {
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

  const childName = selectedChild?.name || '';

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

          {siblings.length > 1 && (
            <div className="flex gap-1.5 ml-2 overflow-x-auto shrink-0">
              {siblings.map((c) => (
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
        {hasProfile === false ? (
          <ErrorBoundary title={t('home.error.title')} fallbackMessage={t('home.error.chatFailed')} retryLabel={t('home.error.tryAgain')}>
            <FirstMeeting
              key={childId}
              childId={childId}
              childName={childName}
              classroomId={session?.classroom?.id}
              onComplete={handleFirstMeetingComplete}
            />
          </ErrorBoundary>
        ) : (
          <>
            {/* Today: IvyChat stays mounted underneath; the capture surface overlays it. */}
            <div className={activeTab === 'today' ? 'h-full relative' : 'hidden'}>
              <ErrorBoundary title={t('home.error.title')} fallbackMessage={t('home.error.chatFailed')} retryLabel={t('home.error.tryAgain')}>
                <IvyChat
                  key={childId}
                  childId={childId}
                  childName={childName}
                  classroomId={session?.classroom?.id}
                  onShelfUpdated={handleShelfUpdated}
                  onScheduleUpdated={handleScheduleUpdated}
                  prefillMessage={ivyPrefill}
                  onPrefillConsumed={() => setIvyPrefill('')}
                  autoSendImage={pendingImage}
                  autoSendText={pendingText}
                  onAutoSendConsumed={handleAutoSendConsumed}
                />
                {captureMode && (
                  <div className="absolute inset-0 z-20">
                    <TodayCapture
                      childId={childId}
                      childName={childName}
                      onPhoto={handlePhoto}
                      onWords={handleWords}
                      onKeyboard={handleKeyboard}
                      onSpotlightTap={handlePresentWork}
                      refreshTrigger={shelfRefreshTrigger}
                    />
                  </div>
                )}
              </ErrorBoundary>
            </div>

            {activeTab === 'journey' && (
              <ErrorBoundary title={t('home.error.title')} fallbackMessage={t('home.error.shelfFailed')} retryLabel={t('home.error.tryAgain')}>
                <JourneyView childId={childId} childName={childName} onAskIvy={handleAskIvy} refreshTrigger={journeyRefreshTrigger} />
              </ErrorBoundary>
            )}

            {activeTab === 'plan' && (
              <ErrorBoundary title={t('home.error.title')} fallbackMessage={t('home.error.chatFailed')} retryLabel={t('home.error.tryAgain')}>
                <div className="h-full flex flex-col">
                  <div className="flex justify-center gap-2 pt-3 pb-1 shrink-0">
                    {(['week', 'shop'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setPlanSurface(s)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${planSurface === s ? `${BIO.bg.mintSubtle} ${BIO.text.mint}` : `${BIO.text.muted} hover:text-white/50`}`}
                      >
                        {s === 'week' ? 'The week' : 'Shop'}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 min-h-0">
                    {planSurface === 'week'
                      ? <FamilyPlan childId={childId} refreshTrigger={planRefreshTrigger} onAskIvy={handleAskIvy} />
                      : <Shop childId={childId} onAskIvy={handleAskIvy} />}
                  </div>
                </div>
              </ErrorBoundary>
            )}
          </>
        )}
      </main>

      {/* How-to card for the Today chip / a tapped work */}
      {(cardLoading || card) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={closeCard}>
          <div className="w-full sm:max-w-lg max-h-[85dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2">
              <span className={`text-xs uppercase tracking-wider ${BIO.text.muted}`}>
                How to do it with {selectedChild?.name?.split(' ')[0] || 'your child'}
              </span>
              <button onClick={closeCard} className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${BIO.btn.ghost}`} aria-label="Close">✕</button>
            </div>
            {card ? (
              <StepCard
                card={card}
                childName={selectedChild?.name?.split(' ')[0]}
                onDidIt={() => {
                  const first = selectedChild?.name?.split(' ')[0] || 'my child';
                  const work = cardTitle;
                  closeCard();
                  handleAskIvy(`I just did "${work}" with ${first} — here's how it went: `);
                }}
              />
            ) : (
              <div className={`rounded-2xl border ${BIO.border.glow} ${BIO.bg.cardSolid} px-5 py-8 text-center`} style={{ boxShadow: BIO.glow.medium }}>
                <div className="animate-pulse text-3xl mb-2">🌿</div>
                <p className={`text-sm ${BIO.text.secondary}`}>Ivy is getting the how-to for {cardTitle}…</p>
              </div>
            )}
          </div>
        </div>
      )}

      {hasProfile !== false && (
        <div className="relative z-10 shrink-0">
          <BottomTabs activeTab={activeTab} onTabChange={handleTabChange} journeyBadge={journeyBadge} />
        </div>
      )}
    </div>
  );
}
