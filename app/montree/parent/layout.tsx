'use client';

// app/montree/parent/layout.tsx
// Parent portal layout with PWA install banner, feedback button, and onboarding init

import { useEffect } from 'react';
import InstallBanner from '@/components/montree/InstallBanner';
import FeedbackButton from '@/components/montree/FeedbackButton';
import { useOnboardingStore } from '@/hooks/useOnboarding';

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialize = useOnboardingStore(s => s.initialize);
  const loadProgressFromDB = useOnboardingStore(s => s.loadProgressFromDB);

  useEffect(() => {
    // Initialize onboarding for parent role
    fetch('/api/montree/onboarding/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const enabled = data?.enabled_for_parents ?? true;
        initialize('parent', enabled);
      })
      .catch(() => {
        initialize('parent', true);
      });

    fetch('/api/montree/onboarding/progress')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.progress) {
          loadProgressFromDB(data.progress);
        }
      })
      .catch(() => {});
  }, [initialize, loadProgressFromDB]);

  return (
    <>
      {children}
      <InstallBanner />
      <FeedbackButton userType="parent" />
    </>
  );
}
