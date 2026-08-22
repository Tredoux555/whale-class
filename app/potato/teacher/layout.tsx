// app/potato/teacher/layout.tsx
// PWA install metadata for the teacher side only: manifest link, icons, and
// Apple's "Add to Home Screen" meta tags. Nests inside app/potato/layout.tsx,
// which already owns the CSS injection and the shared viewport (including
// themeColor) for the whole /potato subtree — this file adds nothing but
// <head> metadata, no service worker, no styling.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Potato Snaps — Teacher',
  manifest: '/potato-teacher/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Potato Snaps',
  },
  icons: {
    icon: [
      { url: '/potato-app-icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/potato-app-icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/potato-app-icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function PotatoTeacherLayout({ children }: { children: React.ReactNode }) {
  return children;
}
