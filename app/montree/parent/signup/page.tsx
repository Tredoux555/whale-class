'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

function SignupRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to parent portal with code if provided
    const code = searchParams.get('code');
    if (code) {
      router.push(`/montree/parent?code=${code}`);
    } else {
      router.push('/montree/parent');
    }
  }, [router, searchParams]);

  return (
    <div style={{
      background: T.card,
      backdropFilter: T.blur,
      borderRadius: 20,
      border: '1px solid rgba(52,211,153,0.15)',
      padding: '32px',
      width: '100%',
      maxWidth: 384,
      textAlign: 'center',
    }}>
      <div style={{
        animation: 'cg-pulse 1.6s ease-in-out infinite',
        fontSize: 32,
        marginBottom: 16,
      }}>
        <Sparkles size={32} color={T.emerald} strokeWidth={1.75} />
      </div>
      <p style={{ color: T.textSecondary, fontSize: 14, margin: 0 }}>Redirecting...</p>
    </div>
  );
}

export default function ParentSignupPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: T.sans,
    }}>
      <Suspense fallback={
        <div style={{
          background: T.card,
          backdropFilter: T.blur,
          borderRadius: 20,
          border: '1px solid rgba(52,211,153,0.15)',
          padding: '32px',
          width: '100%',
          maxWidth: 384,
          textAlign: 'center',
        }}>
          <div style={{
            animation: 'cg-pulse 1.6s ease-in-out infinite',
            fontSize: 32,
            marginBottom: 16,
          }}>
            <Sparkles size={32} color={T.emerald} strokeWidth={1.75} />
          </div>
          <p style={{ color: T.textSecondary, fontSize: 14, margin: 0 }}>Loading...</p>
        </div>
      }>
        <SignupRedirect />
      </Suspense>
      <style>{`
        @keyframes cg-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
