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
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0B2D2A', margin: 0 }}>Support</h1>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: '#1f2937', marginTop: 16 }}>
        Montree is a Montessori classroom companion that helps teachers record observations, track
        each child&rsquo;s progress, and share it with parents.
      </p>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0B2D2A', margin: '0 0 10px' }}>Contact us</h2>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: '#1f2937', margin: 0 }}>
          For help with your account, classroom setup, billing, or anything else, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#0F6E56', fontWeight: 600 }}>{SUPPORT_EMAIL}</a>.
          We reply to every message, usually within 2 business days.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0B2D2A', margin: '0 0 10px' }}>Helpful links</h2>
        <ul style={{ fontSize: 16, lineHeight: 2, color: '#1f2937', margin: 0, paddingLeft: 20 }}>
          <li><Link href="/montree" style={{ color: '#0F6E56' }}>montree.xyz</Link> — about Montree</li>
          <li><Link href="/privacy" style={{ color: '#0F6E56' }}>Privacy policy</Link></li>
        </ul>
      </section>
    </main>
  );
}
