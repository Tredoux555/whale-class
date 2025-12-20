// app/admin/montree-progress/page.tsx
// Page with progress tracking enabled

'use client';

import dynamic from 'next/dynamic';

const MontessoriTreeWithProgress = dynamic(
  () => import('@/components/tree/MontessoriTreeWithProgress'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🌳</div>
          <p className="text-gray-500">Loading Montessori Tree...</p>
        </div>
      </div>
    )
  }
);

export default function MontreeProgressPage() {
  return <MontessoriTreeWithProgress />;
}

