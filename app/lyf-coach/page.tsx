import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/story/lyf-coach/PublicShell';
import AuthForm from '@/components/story/lyf-coach/AuthForm';
import { T } from '@/lib/story/personal-theme';

export const metadata: Metadata = {
  title: 'Lyf Coach — a coach in your corner',
  description:
    'A private life coach that actually knows you. Start your 7-day free trial — no card.',
};

const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 420,
  background: T.card, border: `1px solid ${T.border}`, borderRadius: 18,
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
  padding: '30px 26px',
};

export default function LyfCoachLandingPage() {
  return (
    <PublicShell>
      <div style={cardStyle}>
        <h1 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, lineHeight: 1.25, margin: '0 0 10px', color: T.text }}>
          A coach in your corner.
        </h1>
        <p style={{ margin: '0 0 6px', color: T.textMid, fontSize: 15, lineHeight: 1.6 }}>
          Talk it through, plan the week with rest built in, and get honest, grounded guidance —
          a coach that remembers you, kept private.
        </p>
        <p style={{ margin: '0 0 20px', color: T.gold, fontSize: 14, fontWeight: 600 }}>
          Start your 7-day free trial — no card.
        </p>

        <AuthForm endpoint="/api/lyf-coach/signup" submitLabel="Start free" />

        <p style={{ marginTop: 18, marginBottom: 0, fontSize: 13.5, color: T.textMid, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/lyf-coach/login" style={{ color: T.emerald, textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
      <p style={{ marginTop: 18, fontSize: 12, color: T.textDim, textAlign: 'center', maxWidth: 420 }}>
        7 days free, then $14.99/month. Cancel anytime.
      </p>
    </PublicShell>
  );
}
