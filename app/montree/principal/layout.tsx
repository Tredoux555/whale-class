'use client';

// app/montree/principal/layout.tsx
// Principal pages layout with onboarding initialization

import { useEffect } from 'react';
import { useOnboardingStore } from '@/hooks/useOnboarding';

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialize = useOnboardingStore(s => s.initialize);
  const loadProgressFromDB = useOnboardingStore(s => s.loadProgressFromDB);

  useEffect(() => {
    // Initialize onboarding for principal role
    fetch('/api/montree/onboarding/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const enabled = data?.enabled_for_principals ?? true;
        initialize('principal', enabled);
      })
      .catch(() => {
        initialize('principal', true);
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

  return <>{children}</>;
}
