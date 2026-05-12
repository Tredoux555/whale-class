// /montree/changelog/page.tsx
// Public changelog. Renders CHANGELOG_ENTRIES grouped by date in dark forest
// aesthetic matching the public marketing pages.

import type { Metadata } from 'next';
import Link from 'next/link';
import { CHANGELOG_ENTRIES } from '@/lib/montree/changelog';

export const metadata: Metadata = {
  title: "What's new on Montree",
  description: 'Recent updates to Montree — features, fixes, and changes.',
};

export default function ChangelogPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#06140e',
        color: 'rgba(255,255,255,0.92)',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
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
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '48px 24px 96px' }}>
        <nav style={{ marginBottom: 24 }}>
          <Link
            href="/montree"
            style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}
          >
            ← Back to Montree
          </Link>
        </nav>

        <header style={{ marginBottom: 40 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 40,
              fontFamily: 'var(--font-lora), Georgia, serif',
              fontWeight: 700,
              letterSpacing: -0.5,
              lineHeight: 1.1,
            }}
          >
            What&rsquo;s new
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>
            Recent updates to Montree.
          </p>
        </header>

        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {CHANGELOG_ENTRIES.map((entry) => (
            <li
              key={entry.id}
              style={{
                padding: '24px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(52,211,153,0.85)',
                  fontWeight: 600,
                }}
              >
                {new Date(entry.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <h2
                style={{
                  margin: '6px 0 12px',
                  fontSize: 22,
                  fontFamily: 'var(--font-lora), Georgia, serif',
                  fontWeight: 700,
                  letterSpacing: -0.3,
                  color: '#fff',
                }}
              >
                {entry.title}
              </h2>
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.78)',
                }}
              >
                {entry.summary}
              </p>
              {entry.highlights && entry.highlights.length > 0 && (
                <ul style={{ margin: '12px 0 0', paddingLeft: 22, color: 'rgba(255,255,255,0.68)' }}>
                  {entry.highlights.map((h, idx) => (
                    <li key={idx} style={{ fontSize: 14, lineHeight: 1.7 }}>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
