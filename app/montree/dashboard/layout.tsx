// /montree/dashboard/layout.tsx
// Shared layout with persistent header on ALL dashboard screens
'use client';

import DashboardHeader from '@/components/montree/DashboardHeader';
import FeedbackButton from '@/components/montree/FeedbackButton';

// PERF: Removed 2 onboarding API calls that fired on EVERY page navigation.
// Onboarding guides are HIDDEN (Feb 27) — all renders wrapped with `false &&`.
// To re-enable: search for "HIDDEN: onboarding guides disabled" and restore API calls here.

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <DashboardHeader />
      {children}
      <div className="print:hidden">
        <FeedbackButton />
      </div>
    </div>
  );
}
