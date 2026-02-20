// /montree/dashboard/layout.tsx
// Shared layout with persistent header on ALL dashboard screens
'use client';

import { useEffect } from 'react';
import DashboardHeader from '@/components/montree/DashboardHeader';
import FeedbackButton from '@/components/montree/FeedbackButton';
import { getSession } from '@/lib/montree/auth';
import { useOnboardingStore } from '@/hooks/useOnboarding';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const initialize = useOnboardingStore(s => s.initialize);
  const loadProgressFromDB = useOnboardingStore(s => s.loadProgressFromDB);

  useEffect(() => {
    const session = getSession();
    if (!session) return;

    const role = session.teacher.role || 'teacher';

    // 1. Fetch onboarding settings (is it enabled for this role?)
    fetch('/api/montree/onboarding/settings')
      .then(r => r.json())
      .then(settings => {
        const roleKey = `enabled_for_${role}s` as keyof typeof settings;
        const enabled = settings[roleKey] ?? true;
        initialize(role, enabled);
      })
      .catch(() => {
        // Default: enabled
        initialize(role, true);
      });

    // 2. Fetch user's completed steps from DB
    fetch('/api/montree/onboarding/progress')
      .then(r => r.json())
      .then(data => {
        if (data.progress) {
          loadProgressFromDB(data.progress);
        }
      })
      .catch(() => {
        // Non-blocking — localStorage will still have local state
      });
  }, [initialize, loadProgressFromDB]);

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
