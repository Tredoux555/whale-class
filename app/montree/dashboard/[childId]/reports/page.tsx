// /montree/dashboard/[childId]/reports/page.tsx
// Reports consolidated into Gallery — this page redirects to Gallery
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReportsPage() {
  const params = useParams();
  const childId = params.childId as string;
  const router = useRouter();

  useEffect(() => {
    // Reports functionality is now in Gallery — redirect there
    router.replace(`/montree/dashboard/${childId}/gallery`);
  }, [childId, router]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}
