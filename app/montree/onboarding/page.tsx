// /montree/onboarding/page.tsx
// RETIRED (Jul 16 2026 dark-register sweep). The old white/blue onboarding
// wizard (welcome → add students → celebration) is superseded by the dark
// Students page (/montree/dashboard/students), which is where all student
// management now lives. Curriculum seeding — the only load-bearing thing this
// page ever did — already happens at signup in every classroom-creation path
// (try/instant teacher + homeschool branches, principal/setup, and
// admin/classrooms POST), so retiring this page loses nothing.
//
// This module now immediately redirects to the students page.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/montree/dashboard/students');
  }, [router]);

  // Minimal dark splash while the redirect resolves — matches the app shell.
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a1a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="animate-bounce" style={{ fontSize: 40 }}>🌳</div>
    </div>
  );
}
