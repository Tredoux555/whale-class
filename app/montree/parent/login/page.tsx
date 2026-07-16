'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const T = {
  bg: '#030b08',
  glow: 'radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.14), rgba(39,129,90,0) 60%)',
  card: 'rgba(255,255,255,0.028)',
  blur: 'blur(18px)',
  emerald: '#E8C96A',
  textPrimary: 'rgba(255,250,240,0.92)',
  textSecondary: 'rgba(255,250,240,0.58)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function ParentLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to parent portal (code-only access)
    router.push('/montree/parent');
  }, [router]);

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: T.sans,
    }}>
      <div style={{
        background: T.card,
        backdropFilter: T.blur,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
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
      <style>{`
        @keyframes cg-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
