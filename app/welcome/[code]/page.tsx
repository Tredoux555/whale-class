// app/welcome/[code]/page.tsx
// Personalized outreach landing page (China cold-email campaign, Jul 2026).
//
// Cold emails carry a link like https://montree.xyz/welcome/CN-ETON-001.
// This page looks the code up in montree_outreach_schools, greets the school
// by name, records the visit (atomic RPC — increments visit_count, stamps
// first_visited_at, promotes status to 'visited'), drops a `montree_ref`
// cookie (90 days, via <RefCookie/>), and sends the visitor to the existing
// principal registration flow.
//
// HARD RULES (from the outreach handoff):
// - An invalid/garbage code NEVER errors — render the generic welcome with
//   the same CTA and write nothing.
// - Codes are opaque strings. Look them up; never parse meaning from them.
// - One page, existing brand styles (dark forest + emerald + gold). Do not
//   redesign the homepage.
//
// Server component: queries Supabase directly with the service-role client —
// no internal HTTP hop (architectural rule from Session 138).

import type { Metadata } from 'next';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase-client';
import MontreeLogo from '@/components/montree/MonteeLogo';
import RefCookie from './RefCookie';

// Every render records a visit — this must never be statically cached.
export const dynamic = 'force-dynamic';

// 95 unique per-school URLs — keep them out of search indexes.
export const metadata: Metadata = {
  title: 'Welcome — Montree',
  robots: { index: false, follow: false },
};

// Opaque code shape guard: letters/digits/hyphens only, sane length. Anything
// else skips the DB entirely (bots probing /welcome/<junk> write nothing).
const CODE_SHAPE = /^[A-Za-z0-9-]{4,32}$/;

interface OutreachMatch {
  school_name: string;
  city: string | null;
}

async function recordVisit(rawCode: string): Promise<OutreachMatch | null> {
  const code = decodeURIComponent(rawCode || '').trim();
  if (!CODE_SHAPE.test(code)) return null;

  try {
    const supabase = getSupabase();
    // Atomic: one UPDATE ... RETURNING inside the function — no
    // read-then-write race, refreshes count correctly on every load.
    const { data, error } = await supabase.rpc('montree_outreach_record_visit', {
      p_code: code,
    });
    if (error) {
      // Migration 279 not run yet (42883/42P01) or transient failure —
      // degrade to the generic page, never crash the landing.
      console.error('[welcome] record_visit failed:', error.message);
      return null;
    }
    const row = Array.isArray(data) ? (data[0] as OutreachMatch | undefined) : undefined;
    return row?.school_name ? row : null;
  } catch (err) {
    console.error('[welcome] record_visit threw:', err);
    return null;
  }
}

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const match = await recordVisit(code);
  const normalizedCode = decodeURIComponent(code || '').trim().toUpperCase();

  const serif = 'var(--font-lora), Lora, Georgia, serif';

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background:
          'radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.14), rgba(39,129,90,0) 60%), linear-gradient(168deg, #071510 0%, #051009 45%, #030b08 100%)',
        color: 'rgba(255,250,240,0.7)',
        textAlign: 'center',
      }}
    >
      {/* Persist the code for the registration form (valid codes only) */}
      {match && <RefCookie code={normalizedCode} />}

      {/* Brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
        <MontreeLogo size={34} />
        <span style={{ fontSize: 18, fontWeight: 500, letterSpacing: '0.2px', color: 'rgba(232,201,106,0.85)' }}>
          Montree
        </span>
      </div>

      <div style={{ maxWidth: 640 }}>
        {match ? (
          <>
            <p
              style={{
                fontSize: 11,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: 'rgba(232,201,106,0.55)',
                marginBottom: 18,
              }}
            >
              A personal invitation
            </p>
            <h1
              style={{
                fontFamily: serif,
                fontSize: 'clamp(30px, 6vw, 42px)',
                fontWeight: 400,
                lineHeight: 1.15,
                letterSpacing: '-0.5px',
                color: 'rgba(255,250,240,0.92)',
                margin: '0 0 20px',
              }}
            >
              Welcome, {match.school_name}.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(255,250,240,0.58)', margin: '0 0 10px' }}>
              Montree was built by a Montessori teacher, for schools like yours
              {match.city ? ` in ${match.city}` : ''}. A teacher takes a photo of a child working —
              Montree does the rest.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,250,240,0.34)', margin: '0 0 34px' }}>
              由一线蒙特梭利老师亲手打造：老师拍一张照片，系统完成观察记录、进度追踪和家长报告。
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily: serif,
                fontSize: 'clamp(30px, 6vw, 42px)',
                fontWeight: 400,
                lineHeight: 1.15,
                letterSpacing: '-0.5px',
                color: 'rgba(255,250,240,0.92)',
                margin: '0 0 20px',
              }}
            >
              Welcome to Montree.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(255,250,240,0.58)', margin: '0 0 34px' }}>
              Built by a Montessori teacher, for Montessori schools. A teacher takes a photo of a
              child working — Montree does the rest.
            </p>
          </>
        )}

        {/* CTA → existing principal flow. Do not change this destination
            without reading the principal-flow handoff first. */}
        <Link
          href="/montree/principal/register"
          style={{
            display: 'inline-block',
            padding: '15px 30px',
            borderRadius: 10,
            background: '#1D5C41',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 500,
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          See Montree for your school →
        </Link>

        <p style={{ fontSize: 13, color: 'rgba(255,250,240,0.4)', marginTop: 18 }}>
          30 days free · No credit card
          {match ? (
            <>
              {' '}
              · Your code: <span style={{ color: '#E8C96A', fontWeight: 600 }}>{normalizedCode}</span>
            </>
          ) : null}
        </p>
      </div>

      <p style={{ position: 'absolute', bottom: 22, fontSize: 12, color: 'rgba(255,250,240,0.3)' }}>
        Montree · montree.xyz
      </p>
    </div>
  );
}
