// /montree/dashboard/layout.tsx
// Shared layout with persistent header on ALL dashboard screens
'use client';

import { useEffect } from 'react';
import DashboardHeader from '@/components/montree/DashboardHeader';
import NetworkStatusBanner from '@/components/montree/NetworkStatusBanner';
import { registerSyncTriggers } from '@/lib/montree/offline/sync-triggers';
// PERF: Removed 2 onboarding API calls that fired on EVERY page navigation.
// Onboarding guides are HIDDEN (Feb 27) — all renders wrapped with `false &&`.
// To re-enable: search for "HIDDEN: onboarding guides disabled" and restore API calls here.
// FeedbackButton removed Mar 10 — users can email feedback directly

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Register offline photo queue sync triggers (app resume, network change)
  // Idempotent — safe to call on every layout mount
  useEffect(() => {
    const cleanup = registerSyncTriggers();
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen">
      <NetworkStatusBanner />
      <DashboardHeader />
      {children}
    </div>
  );
}
