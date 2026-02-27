// /montree/home/[childId]/page.tsx
// The Montree Home Experience — two-tab interface for home parents
// Portal (AI chat) + Shelf (visual works display)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import PortalChat from '@/components/montree/home/PortalChat';
import ShelfView from '@/components/montree/home/ShelfView';
import BottomTabs from '@/components/montree/home/BottomTabs';
import AmbientParticles from '@/components/montree/home/AmbientParticles';

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
  const [activeTab, setActiveTab] = useState<'portal' | 'shelf'>('portal');
  const [shelfBadge, setShelfBadge] = useState(false);
  const [shelfRefreshTrigger, setShelfRefreshTrigger] = useState(0);
  const [portalPrefill, setPortalPrefill] = useState('');

  // Auth check
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.replace('/montree/login');
      return;
    }
    if (!isHomeschoolParent(sess)) {
      router.replace('/montree/dashboard');
      return;
    }
    setSession(sess);

    // Fetch children for selector
    if (sess.classroom?.id) {
      fetch(`/api/montree/children?classroom_id=${sess.classroom.id}`)
        .then(r => r.json())
        .then(data => {
          const kids = data.children || [];
          setChildren(kids);
          setLoading(false);

          // If the childId in URL doesn't exist, redirect to first child
          if (kids.length > 0 && !kids.find((c: Child) => c.id === childId)) {
            router.replace(`/montree/home/${kids[0].id}`);
          }
          // If no children at all, go to setup
          if (kids.length === 0) {
            router.replace('/montree/home/setup');
          }
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [router, childId]);

  // When Guru updates shelf via tools
  const handleShelfUpdated = useCallback(() => {
    setShelfRefreshTrigger(prev => prev + 1);
    setShelfBadge(true);
    setTimeout(() => setShelfBadge(false), 3000);
  }, []);

  // When user taps empty shelf slot or "Ask Guru" in work detail
  const handleAskGuide = useCallback((message: string) => {
    setPortalPrefill(message);
    setActiveTab('portal');
  }, []);

  const selectedChild = children.find(c => c.id === childId) || children[0] || null;

  // Loading state — also wait for selectedChild when children are loaded
  if (loading || !session || (!selectedChild && children.length > 0)) {
    return (
      <div className={`h-screen flex items-center justify-center ${BIO.bg.deep}`}>
        <AmbientParticles />
        <div className="relative z-10 text-center">
          <div className="animate-pulse text-5xl mb-4">🌿</div>
          <p className={`text-sm ${BIO.text.secondary}`}>Preparing your space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${BIO.bg.deep}`}>
      <AmbientParticles />

      {/* Minimal header */}
      <header className={`relative z-10 ${BIO.bg.surface} border-b ${BIO.border.subtle} px-4 py-3 flex items-center shrink-0`}>
        {/* Child avatar + name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#4ADE80]/15 flex items-center justify-center shrink-0"
               style={{ boxShadow: BIO.glow.soft }}>
            {selectedChild?.photo_url ? (
              <img src={selectedChild.photo_url} className="w-full h-full object-cover rounded-full" alt={`${selectedChild.name}'s photo`} />
            ) : (
              <span className={`text-sm font-bold ${BIO.text.mint}`}>
                {selectedChild?.name?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <h1 className={`font-semibold ${BIO.text.primary} truncate`}>
            {selectedChild?.name?.split(' ')[0] || 'Loading...'}
          </h1>

          {/* Child selector for multiple children */}
          {children.length > 1 && (
            <div className="flex gap-1.5 ml-2 overflow-x-auto shrink-0">
              {children.map(c => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/montree/home/${c.id}`)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    c.id === childId
                      ? `${BIO.bg.mintSubtle} ${BIO.text.mint}`
                      : `${BIO.text.muted} hover:text-white/50`
                  }`}
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add child button */}
        <button
          onClick={() => router.push('/montree/home/setup')}
          className={`p-2 rounded-full ${BIO.btn.ghost} ml-2 shrink-0`}
          title="Add a child"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-hidden">
        {activeTab === 'portal' ? (
          <PortalChat
            childId={childId}
            childName={selectedChild?.name || ''}
            classroomId={session?.classroom?.id}
            onShelfUpdated={handleShelfUpdated}
            prefillMessage={portalPrefill}
            onPrefillConsumed={() => setPortalPrefill('')}
          />
        ) : (
          <ShelfView
            childId={childId}
            classroomId={session?.classroom?.id}
            onAskGuide={handleAskGuide}
            refreshTrigger={shelfRefreshTrigger}
          />
        )}
      </main>

      {/* Bottom tabs */}
      <div className="relative z-10 shrink-0">
        <BottomTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          shelfBadge={shelfBadge}
        />
      </div>
    </div>
  );
}
