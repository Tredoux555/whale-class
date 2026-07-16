// app/support/page.tsx
// Public support page — App Store requirement (montree.xyz/support).
// Style follows the /privacy + /terms public-page conventions (light,
// no client JS, deep-forest palette accents). /montree/support redirects here.
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support — Montree',
  description: 'Get help with Montree — the Montessori classroom companion for teachers, schools, and parents.',
};

const SUPPORT_EMAIL = 'support@montree.xyz';

export default function SupportPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 900px 700px at 50% -8%, rgba(39,129,90,0.14), rgba(39,129,90,0) 60%), linear-gradient(168deg, #071510 0%, #051009 45%, #030b08 100%)' }}>
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: 'rgba(255,250,240,0.72)' }}>
      <h1 style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontSize: 30, fontWeight: 400, color: 'rgba(255,250,240,0.92)', margin: 0 }}>Support</h1>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,250,240,0.72)', marginTop: 16 }}>
        Montree is a Montessori classroom companion that helps teachers record observations, track
        each child&rsquo;s progress, and share it with parents.
      </p>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontSize: 20, fontWeight: 400, color: 'rgba(232,201,106,0.85)', margin: '0 0 10px' }}>Contact us</h2>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,250,240,0.72)', margin: 0 }}>
          For help with your account, classroom setup, billing, or anything else, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'rgba(232,201,106,0.8)', fontWeight: 600 }}>{SUPPORT_EMAIL}</a>.
          We reply to every message, usually within 2 business days.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontSize: 20, fontWeight: 400, color: 'rgba(232,201,106,0.85)', margin: '0 0 10px' }}>Helpful links</h2>
        <ul style={{ fontSize: 16, lineHeight: 2, color: 'rgba(255,250,240,0.72)', margin: 0, paddingLeft: 20 }}>
          <li><Link href="/montree" style={{ color: 'rgba(232,201,106,0.8)' }}>montree.xyz</Link> — about Montree</li>
          <li><Link href="/privacy" style={{ color: 'rgba(232,201,106,0.8)' }}>Privacy policy</Link></li>
        </ul>
      </section>
    </main>
    </div>
  );
}
