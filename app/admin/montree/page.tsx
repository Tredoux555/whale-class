// app/admin/montree/page.tsx
// Page component for the Montessori Tree visualization in admin section

'use client';

import dynamic from 'next/dynamic';

// Import MontessoriTree with no SSR (React Flow requires client-side rendering)
const MontessoriTree = dynamic(
  () => import('@/components/tree/MontessoriTree'),
  { 
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
      }}>
        <div style={{
          textAlign: 'center',
          color: '#666',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌳</div>
          <p>Loading Montessori Tree...</p>
        </div>
      </div>
    )
  }
);

export default function MontreeAdminPage() {
  return <MontessoriTree />;
}

