'use client';

// app/montree/parent/layout.tsx
// Parent portal layout with PWA install banner and feedback button

import InstallBanner from '@/components/montree/InstallBanner';
// FeedbackButton removed Mar 10 — users can email feedback directly

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <InstallBanner />
    </>
  );
}
