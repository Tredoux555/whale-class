// app/montree/library/feedback/layout.tsx
//
// The mount point in the Montree library. Two jobs only: load the module's own
// stylesheet, and set the tab title.
//
// /montree/library/* is already whitelisted on BOTH hosts in middleware.ts
// (montree.xyz and teacherpotato.xyz), which is why the board lives here and
// not under /montree/feedback — no middleware change was needed, and none was
// made.

import type { Metadata } from 'next';
import '@/components/montree/feedback/feedback.css';

export const metadata: Metadata = {
  title: 'Feedback · Montree',
  description:
    'Tell us what is broken, what you wish existed, or just ask. Everything here is read by the team.',
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Source Sans 3 with a full system fallback stack in feedback.css, so a
          blocked Google Fonts request (which is the normal case on a mainland
          connection) costs the board nothing but the typeface. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font --
          deliberate: this module is meant to be mounted in other products, so
          it carries its own font here rather than requiring the host app to
          add one to its root layout. The cost is one extra stylesheet on the
          feedback routes only, and feedback.css names a full system fallback
          stack so a blocked request costs nothing but the typeface. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap"
      />
      {children}
    </>
  );
}
