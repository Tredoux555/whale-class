'use client';

import { useEffect } from 'react';

// Redirect-only page. The CSP header on montree.xyz blocks all iframes
// (frame-ancestors 'none'), so the admin page can't iframe the static
// HTML. Instead we redirect straight to the static file.
export default function ReadingFrameworkGuidePage() {
  useEffect(() => {
    window.location.replace('/whale-reading-framework-guide.html');
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a1a0f',
      color: '#e8e8d8',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📗</div>
        <div style={{ fontSize: 18, marginBottom: 8 }}>Opening Reading Framework making guide…</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>If this doesn&rsquo;t redirect automatically:</div>
        <a
          href="/whale-reading-framework-guide.html"
          style={{
            color: '#10b981',
            textDecoration: 'underline',
            fontSize: 14,
          }}
        >
          Open the making guide directly →
        </a>
      </div>
    </div>
  );
}
