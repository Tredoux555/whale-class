// /montree/dashboard/layout.tsx
// Shared layout with persistent header on ALL dashboard screens
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DashboardHeader from '@/components/montree/DashboardHeader';
import NetworkStatusBanner from '@/components/montree/NetworkStatusBanner';
import BackgroundTaskBanner from '@/components/montree/BackgroundTaskBanner';
import PushRegistrar from '@/components/montree/PushRegistrar';
import ActingPrincipalBanner from '@/components/montree/dashboard/ActingPrincipalBanner';
import { registerSyncTriggers } from '@/lib/montree/offline/sync-triggers';
import { FeaturesProvider } from '@/lib/montree/features';
import { getSession, recoverSession } from '@/lib/montree/auth';

// Onboarding Copilot ("The Guide") — floating pill → guide card, ssr:false
// (house pattern). Its own /state route is the sole gate; it renders nothing
// until the school + role qualify, and retires itself once the journey is done.
const CopilotDock = dynamic(
  () => import('@/components/montree/onboarding-copilot/CopilotDock'),
  { ssr: false, loading: () => null }
);
// PERF: Removed 2 onboarding API calls that fired on EVERY page navigation.
// Onboarding guides are HIDDEN (Feb 27) — all renders wrapped with `false &&`.
// To re-enable: search for "HIDDEN: onboarding guides disabled" and restore API calls here.
// FeedbackButton removed Mar 10 — users can email feedback directly

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Register offline photo queue sync triggers (app resume, network change)
  // Idempotent — safe to call on every layout mount
  useEffect(() => {
    const cleanup = registerSyncTriggers();
    return cleanup;
  }, []);

  // Get schoolId for FeaturesProvider
  useEffect(() => {
    let cancelled = false;
    const sess = getSession();
    if (sess?.school?.id) {
      setSchoolId(sess.school.id);
      return;
    }
    // Cookie-only session — no localStorage mirror yet. Two ways to land here: a principal who
    // just stepped into this classroom (the cookie was swapped server-side and the stale mirror
    // cleared), or iOS wiping localStorage on a PWA relaunch. This effect runs ONCE, so without
    // the rebuild schoolId would stay null for the whole visit and FeaturesProvider would
    // fail closed — a borrowed teacher seat would show a stripped-down app that doesn't match
    // what the teacher actually sees, which is the one thing this view must get right.
    recoverSession()
      .then((recovered) => {
        if (!cancelled && recovered?.school?.id) setSchoolId(recovered.school.id);
      })
      .catch(() => { /* features stay closed for this visit — never crash the shell */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <FeaturesProvider schoolId={schoolId}>
      <div className="min-h-screen">
        <NetworkStatusBanner />
        <PushRegistrar />
        {/* Above the sticky header, in flow — a frame around the borrowed surface rather than
            a notification inside it (same placement as the organisation-view banner in the
            admin shell). Renders nothing at all for an ordinary teacher. */}
        <ActingPrincipalBanner />
        <DashboardHeader />
        {children}
        <BackgroundTaskBanner />
        <CopilotDock surface="teacher" />
      </div>
    </FeaturesProvider>
  );
}
