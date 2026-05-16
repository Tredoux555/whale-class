// app/montree/agent/layout.tsx
//
// Phase 7c — Shared shell for the agent dashboard. Dark forest gradient
// (matches /montree, /montree/try, /montree/login-select). Top nav with
// agent name + sign-out. Individual pages plug into {children}.
//
// Session 97 — MiraFloat injected here so every /montree/agent/* page has
// Mira one click away from the top-right corner. The float hides itself
// on /montree/agent/mira (the dedicated chat page IS Mira there) and
// stays inert if no agent session is active.
//
// /montree/agent/onboarding (Stripe return URL — Phase 3) is purposefully
// excluded from the global nav — it's a one-off landing page reached via
// Stripe's hosted form, the agent isn't logged in there yet.

import type { Metadata } from 'next';
import AgentNav from '@/components/montree/agent/AgentNav';
import MiraFloat from '@/components/montree/agent/MiraFloat';

export const metadata: Metadata = {
  title: 'Ambassador — Montree',
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh relative overflow-hidden" style={{ background: '#06140e' }}>
      {/* Dark forest gradient matches /montree public surfaces. Fixed background
          so it doesn't scroll with content. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
            radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
            linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
          `,
        }}
      />
      <div className="relative z-10 flex flex-col min-h-dvh">
        <AgentNav />
        <main className="flex-1">{children}</main>
      </div>

      {/* Mira — agent's chief-of-staff float. Visible top-right on every
          agent page except /montree/agent/mira itself (the float hides
          there since that page IS Mira in full). */}
      <MiraFloat />
    </div>
  );
}
