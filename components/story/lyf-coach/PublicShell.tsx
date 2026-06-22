// components/story/lyf-coach/PublicShell.tsx
//
// Shared brand shell for the PUBLIC Lyf Coach pages (landing/signup, login,
// upgrade). Dark-forest, calm, centred. This is the word-of-mouth front door —
// branded "Lyf Coach", NOT the "Sanctuary" / /story/admin owner shell.

import type { ReactNode } from 'react';
import { T } from '@/lib/story/personal-theme';

export function LyfCoachMark({ size = 30 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
      <span
        style={{
          width: size, height: size, borderRadius: size * 0.3,
          background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.56, boxShadow: '0 0 18px rgba(52,211,153,0.3)',
        }}
      >
        🌿
      </span>
      <span style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px', color: T.text }}>
        Lyf Coach
      </span>
    </span>
  );
}

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: T.bg, position: 'relative', fontFamily: T.sans, color: T.text }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: T.glow, zIndex: 0 }} />
      <div
        style={{
          position: 'relative', zIndex: 1, minHeight: '100dvh',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '32px 20px',
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <LyfCoachMark size={32} />
        </div>
        {children}
      </div>
    </div>
  );
}
