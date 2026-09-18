// app/dark-phonics/opengraph-image.tsx
//
// The hub's social card. 1200×630, drawn by next/og.
//
// RUNTIME IS NODEJS, NOT EDGE, ON PURPOSE. This app is deployed as a Next
// standalone server in a Docker image on Railway — there is no edge runtime
// there, and `export const runtime = 'edge'` in that deployment is a build-time
// surprise rather than a speed-up. nodejs also lets the lesson card read its
// cover art straight off the filesystem (see l/[n]/opengraph-image.tsx).

import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Dark Phonics — phonics your child can touch';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 88px',
          background: 'linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)',
          color: '#fffaf0',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 34 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: 'linear-gradient(135deg, #1D6B48 0%, #0c2419 100%)',
              border: '2px solid rgba(130,217,174,0.4)',
            }}
          />
          <div style={{ fontSize: 26, letterSpacing: 6, color: 'rgba(255,250,240,0.55)' }}>
            MONTREE · DARK PHONICS
          </div>
        </div>

        <div style={{ fontSize: 76, lineHeight: 1.08, fontWeight: 700, letterSpacing: -2 }}>
          Phonics your child can touch.
        </div>

        <div style={{ fontSize: 34, lineHeight: 1.45, marginTop: 28, color: 'rgba(255,250,240,0.62)' }}>
          21 little books. Tap, match, build, trace.
        </div>

        <div
          style={{
            marginTop: 44,
            display: 'flex',
            alignSelf: 'flex-start',
            padding: '16px 30px',
            borderRadius: 999,
            background: 'rgba(130,217,174,0.16)',
            border: '2px solid rgba(130,217,174,0.45)',
            color: '#d6f5e6',
            fontSize: 28,
          }}
        >
          Free to start — no signup · montree.xyz/dark-phonics
        </div>
      </div>
    ),
    size,
  );
}
