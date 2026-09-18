// app/dark-phonics/layout.tsx
//
// The public Dark Phonics hub's own metadata root.
//
// Everything under /dark-phonics is opened cold — from a QR code, a WeChat
// share, a bio link or a search result — so the title, the description and the
// social card are part of the product, not decoration. The lesson deep links
// override `title` and the OG image with their own; this layout is the floor.
//
// PUBLIC: middleware.ts lists '/dark-phonics' in publicPaths. No auth anywhere
// under this route, by design.

import type { Metadata, Viewport } from 'next';

const TITLE = 'Dark Phonics · Montree';
const DESCRIPTION =
  '21 little phonics books your child can touch. Tap, match, build, trace — free to start, no signup. Printable classroom materials for every sound.';

/** The absolute origin, for canonical + OG urls. Railway sets the first one. */
function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '') ||
    'https://montree.xyz';
  return raw.replace(/\/+$/, '');
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/dark-phonics' },
  openGraph: {
    type: 'website',
    siteName: 'Montree',
    title: TITLE,
    description: DESCRIPTION,
    url: '/dark-phonics',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#06140e',
  width: 'device-width',
  initialScale: 1,
  // The shelf is a drag-and-drop material on a shared tablet; a double-tap
  // zoom in the middle of a drag is a bug, not a feature. Pinch zoom stays on
  // (maximumScale is not set), so this does not trap anyone.
  viewportFit: 'cover',
};

export default function DarkPhonicsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
