// /montree/dashboard/layout.tsx
// Shared layout with persistent header on ALL dashboard screens
// Initializes onboarding state for teacher/homeschool_parent users
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
    if (!session?.teacher?.role) return;

    const role = session.teacher.role; // 'teacher' | 'homeschool_parent'

    // Fetch onboarding settings (is it enabled for this role?)
    fetch('/api/montree/onboarding/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) {
          // If settings API fails or 401, still init with enabled=true (default)
          initialize(role, true);
          return;
        }
        const roleKey = role === 'homeschool_parent' ? 'homeschool_parent_enabled' : `${role}_enabled`;
        const enabled = data.settings?.[roleKey] ?? true;
        initialize(role, enabled);
      })
      .catch(() => {
        initialize(role, true); // Default to enabled on error
      });

    // Fetch existing progress from DB
    fetch('/api/montree/onboarding/progress')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.progress) {
          loadProgressFromDB(data.progress);
        }
      })
      .catch(() => {
        // Non-blocking — localStorage fallback still works
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
