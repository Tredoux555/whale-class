// /montree/calendar/layout.tsx
//
// Session 129 follow-up — the Calendar page was shipped with a custom
// standalone header (Montree sprout + wordmark → /montree public landing),
// which broke uniformity with every other authenticated page in the app AND
// pulled signed-in users out of their session when they tapped the logo.
//
// User flagged it directly: "the whale class top left should be uniform the
// same as the main student page and it should always revert back to the main
// student front page. also the three dot menu should be on all the pages in
// uniform."
//
// Fix: wrap /montree/calendar in the same layout chrome the dashboard pages
// use — FeaturesProvider context, the shared DashboardHeader (which carries
// the school name, user pill, language toggle, camera/mic icons, and the
// 3-dot More menu), NetworkStatusBanner, and BackgroundTaskBanner. The Home
// link inside DashboardHeader already points at /montree/dashboard (not the
// public landing), so authenticated users stay inside their session.
//
// Mirrors app/montree/dashboard/layout.tsx exactly — adding a third surface
// to this pattern will be one more sibling layout.tsx file.
'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/montree/DashboardHeader';
import NetworkStatusBanner from '@/components/montree/NetworkStatusBanner';
import BackgroundTaskBanner from '@/components/montree/BackgroundTaskBanner';
import { registerSyncTriggers } from '@/lib/montree/offline/sync-triggers';
import { FeaturesProvider } from '@/lib/montree/features';
import { getSession } from '@/lib/montree/auth';

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // Register offline photo queue sync triggers (app resume, network change).
  // Idempotent — safe to call on every layout mount.
  useEffect(() => {
    const cleanup = registerSyncTriggers();
    return cleanup;
  }, []);

  // Get schoolId for FeaturesProvider — DashboardHeader's More menu reads
  // feature flags via useFeatures(), so the provider has to be in place
  // before the header renders.
  // (Mirrors app/montree/dashboard/layout.tsx — both trip the same
  // react-hooks/set-state-in-effect warning. Canonical pattern; getSession()
  // is client-side only so we can't seed state synchronously.)
  useEffect(() => {
    const sess = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sess?.school?.id) setSchoolId(sess.school.id);
  }, []);

  return (
    <FeaturesProvider schoolId={schoolId}>
      <div className="min-h-screen">
        <NetworkStatusBanner />
        <DashboardHeader />
        {children}
        <BackgroundTaskBanner />
      </div>
    </FeaturesProvider>
  );
}
