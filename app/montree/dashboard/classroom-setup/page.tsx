// Classroom Setup — REDIRECTS to Photo Audit
// The "Teach the AI" functionality is now merged into Photo Audit.
// Teachers crop existing classroom photos to teach the AI — no extra photos needed.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClassroomSetupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/montree/dashboard/photo-audit');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Redirecting...</p>
    </div>
  );
}
