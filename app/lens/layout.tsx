// app/lens/layout.tsx
// The Montree Lens shell. Server component: it injects the stylesheet and the
// manifest link once, and gets out of the way.
//
// 🚨 NO MONTREE NAV CHROME. Lens is served on montree.xyz at /lens* but it is a
// separate product with a separate audience — the visiting observer, who has no
// classroom in Montree and no reason to see Montree's dashboard header. Nothing
// under app/lens imports a Montree layout, header or nav component.
//
// 🚨 The stylesheet is injected with <style dangerouslySetInnerHTML>, never
// <style jsx>. Turbopack rejects a styled-jsx tag that is not the direct child
// of a component's outermost return element, and that rule cost this repo twelve
// consecutive failed deploys. Same note as app/potato/layout.tsx.
//
// 🚨 Hardcoded English throughout this route group — no i18n import anywhere
// under app/lens. Nothing here touches lib/montree/i18n/*, so the strict
// 12-locale pre-commit gate stays dormant for these commits (the same sanctioned
// escape hatch app/potato and the satpin/dark-phonics pages use). The REPORTS
// are bilingual; the app chrome is not, because the app has one user.

import type { Metadata, Viewport } from 'next';
import { LENS_CSS } from '@/lib/lens/ui';

export const metadata: Metadata = {
  title: 'Montree Lens',
  description: 'Observe a classroom. Walk out with the report.',
  manifest: '/lens/manifest.json',
  // A consultant's client list has no business in a search index.
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: 'Lens',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/lens/icon-192.png',
    apple: '/lens/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A1A0F',
};

export default function LensLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LENS_CSS }} />
      <div className="ln-root">{children}</div>
    </>
  );
}
