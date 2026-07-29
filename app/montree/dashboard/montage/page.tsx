// app/montree/dashboard/montage/page.tsx
// Montage Studio — RETIRED. This route gated photos on teacher_confirmed,
// which was the recurring "my photos don't show up" confusion (Studio vs.
// Montage Manager). Studio is gone; every visit — old bookmarks and deep
// links included — now redirects straight to Montage Manager
// (/montree/dashboard/montage-tracker), which has no confirmation gate.
// Route file stays on disk (hide-don't-delete) purely so the old URL still
// resolves to something instead of a 404.
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MontageRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/montree/dashboard/montage-tracker${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
    </div>
  );
}

// useSearchParams() requires a Suspense boundary (same convention as
// media/page.tsx and capture/page.tsx).
export default function MontagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a1a0f]" />}>
      <MontageRedirect />
    </Suspense>
  );
}
