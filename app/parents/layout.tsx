/**
 * /parents — the PWA seam, and nothing else.
 *
 * A PASS-THROUGH layout: it renders its children unchanged and adds no markup,
 * no chrome and no client JavaScript. It exists for one reason — Next merges
 * metadata down the segment tree, so declaring the manifest HERE scopes the
 * installable app to /parents, where the root layout would have declared it
 * across the whole teacherpotato.xyz host.
 *
 * 🚨 THAT SCOPING IS THE POINT (owner's call, 2026-09-15). The Whale Class
 * video homepage must NOT become a standalone app called "Phonics"; the Dark
 * Phonics shelf is the only surface anyone asked to install.
 *
 * WHY INSTALL IT AT ALL: on a home-screen launch there is no Safari toolbar, so
 * there is no 100vh-vs-100dvh gap to scroll the shelf's top bar out of sight
 * (the iPad bug written out in v2-shelf/ShelfPlayer.tsx), and a four-year-old
 * gets the whole screen to reach a card on. `statusBarStyle: "default"` keeps
 * the clock legible over our near-black chrome rather than painting under it.
 *
 * 🚨 `appleWebApp.capable` renders as <meta name="mobile-web-app-capable"> in
 * Next 16, and Safari only began honouring THAT spelling in iOS 17.4. The
 * classroom iPads are not all on 17.4, so the legacy apple- spelling rides
 * along in `other` — harmless where both are understood, and the difference
 * between standalone and a toolbar where only the old one is.
 *
 * This layout is served on montree.xyz/parents too, which is the same shelf;
 * it changes nothing about montree.xyz's own /montree-scoped manifest.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  manifest: '/parents.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Phonics',
    statusBarStyle: 'default',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export default function ParentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
