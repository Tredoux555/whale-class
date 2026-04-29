'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  serif: '"Lora", Georgia, serif',
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
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: T.sans,
    }}>
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
      <style>{`
        @keyframes cg-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
