// Classroom Setup — REDIRECTS to Photo Audit
// The "Teach the AI" functionality is now merged into Photo Audit.
// Teachers crop existing classroom photos to teach the AI — no extra photos needed.
// Dark forest visual treatment — all wiring intact
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClassroomSetupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/montree/dashboard/photo-audit');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1a0f',
      backgroundImage: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
      backgroundAttachment: 'fixed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 14,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{
        width: 28,
        height: 28,
        border: '3px solid rgba(52,211,153,0.65)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'cs-spin 0.9s linear infinite',
      }} />
      <p style={{
        margin: 0,
        color: 'rgba(255,255,255,0.40)',
        fontSize: 13,
      }}>
        Redirecting…
      </p>
      <style>{`@keyframes cs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
