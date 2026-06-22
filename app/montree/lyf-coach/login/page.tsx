import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/story/lyf-coach/PublicShell';
import AuthForm from '@/components/story/lyf-coach/AuthForm';
import { T } from '@/lib/story/personal-theme';

export const metadata: Metadata = {
  title: 'Sign in — Lyf Coach',
};

const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 420,
  background: T.card, border: `1px solid ${T.border}`, borderRadius: 18,
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
  padding: '30px 26px',
};

export default function LyfCoachLoginPage() {
  return (
    <PublicShell>
      <div style={cardStyle}>
        <h1 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 600, margin: '0 0 18px', color: T.text }}>
          Welcome back.
        </h1>

        <AuthForm endpoint="/api/lyf-coach/login" submitLabel="Sign in" />

        <p style={{ marginTop: 18, marginBottom: 0, fontSize: 13.5, color: T.textMid, textAlign: 'center' }}>
          New here?{' '}
          <Link href="/montree/lyf-coach" style={{ color: T.emerald, textDecoration: 'none', fontWeight: 600 }}>
            Start your free trial
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
