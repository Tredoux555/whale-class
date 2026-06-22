'use client';

// Single soft upsell shown once at the quieter-mode transition (MONETISATION
// SPEC v1.0). Exact copy — do not improvise. No model names. Links to the
// upgrade surface, path-aware: the public Lyf Coach coach (/montree/lyf-coach/*)
// lands on /montree/lyf-coach/upgrade; the Sanctuary coach keeps /story/admin/upgrade.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CoachUpgradeButton() {
  const pathname = usePathname();
  const href = (pathname ?? '').startsWith('/montree/lyf-coach') ? '/montree/lyf-coach/upgrade' : '/story/admin/upgrade';

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>
        Want the full depth back? $14.99/month, cancel anytime.
      </span>
      <Link
        href={href}
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          color: '#06140c',
          background: 'linear-gradient(135deg, #34d399, #1D6B48)',
          textDecoration: 'none',
        }}
      >
        Upgrade
      </Link>
    </div>
  );
}
