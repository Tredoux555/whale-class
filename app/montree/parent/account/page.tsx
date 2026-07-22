// app/montree/parent/account/page.tsx
//
// Parent account management: push-notification preferences (Tier 2 push
// polish, Jun 2026) + in-app account deletion (Apple App Store Guideline
// 5.1.1(v)) for parent (portal) sessions.
//
// Dark-register (matches the rest of the parent portal) as of Jul 2026 —
// the old light theme was the last white parent surface.
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DeleteAccountSection from '@/components/montree/DeleteAccountSection';
import ParentNotificationPrefs from '@/components/montree/ParentNotificationPrefs';

// Dark forest tokens (copied verbatim from the parent report page)
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  textPrimary: 'rgba(255,255,255,0.95)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function ParentAccountPage() {
  const clearParentSession = () => {
    try {
      localStorage.removeItem('montree_parent_session');
      localStorage.removeItem('montree_selected_child');
    } catch { /* ignore */ }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: T.card,
        backdropFilter: T.blur,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        paddingTop: 'env(safe-area-inset-top)', // clear the iOS status bar
      }}>
        <div style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Link
            href="/montree/parent/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: T.emerald,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
            Back
          </Link>
          <h1 style={{
            fontFamily: T.serif,
            fontSize: 17,
            fontWeight: 600,
            color: T.textPrimary,
            margin: 0,
          }}>
            Account
          </h1>
        </div>
      </header>

      <main style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <ParentNotificationPrefs dark />
        <DeleteAccountSection
          endpoint="/api/montree/parent/auth/delete-account"
          redirectTo="/montree/parent"
          onDeleted={clearParentSession}
          dark
        />
      </main>
    </div>
  );
}
