// /montree/dashboard/layout.tsx
// Shared layout with persistent header on ALL dashboard screens
'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/montree/DashboardHeader';
import NetworkStatusBanner from '@/components/montree/NetworkStatusBanner';
import { registerSyncTriggers } from '@/lib/montree/offline/sync-triggers';
import { FeaturesProvider } from '@/lib/montree/features';
import { getSession } from '@/lib/montree/auth';
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
    const sess = getSession();
    if (sess?.school?.id) setSchoolId(sess.school.id);
  }, []);

  return (
    <FeaturesProvider schoolId={schoolId}>
      <div className="min-h-screen">
        <NetworkStatusBanner />
        <DashboardHeader />
        {children}
      </div>
    </FeaturesProvider>
  );
}
