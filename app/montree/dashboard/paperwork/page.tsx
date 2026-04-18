// Standalone Paperwork Tracker page
// Moved out of the main dashboard (Session 18 removed it from the grid)
// into its own route so the menu link works.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import dynamic from 'next/dynamic';

const PaperworkPanel = dynamic(() => import('@/components/montree/PaperworkPanel'), { ssr: false });

export default function PaperworkPage() {
  const router = useRouter();

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    if (isHomeschoolParent(sess)) { router.push('/montree/dashboard'); return; }
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-20 pb-24">
      <PaperworkPanel />
    </div>
  );
}
