// src/app/tree/page.tsx
// Page component for the Montessori Tree visualization

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

export const metadata = {
  title: 'Montessori Curriculum Tree',
  description: 'Interactive visualization of the complete Montessori curriculum',
};

export default function TreePage() {
  return <MontessoriTree />;
}

