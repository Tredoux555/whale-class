// /montree/demo/setup/page.tsx
// Redirect to onboarding page
// This route exists for URL consistency with demo flow

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SetupRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get('name');
  
  useEffect(() => {
    // Redirect to onboarding, preserve name if present
    const url = name ? `/montree/onboarding?name=${name}` : '/montree/onboarding';
    router.replace(url);
  }, [router, name]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-bounce text-6xl mb-4">🐋</div>
        <p className="text-emerald-300">Loading setup...</p>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center">
        <div className="animate-bounce text-6xl">🐋</div>
      </div>
    }>
      <SetupRedirect />
    </Suspense>
  );
}
