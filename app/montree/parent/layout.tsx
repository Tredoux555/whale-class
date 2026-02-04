'use client';

// app/montree/parent/layout.tsx
// Parent portal layout with PWA install banner and feedback button

import InstallBanner from '@/components/montree/InstallBanner';
import FeedbackButton from '@/components/montree/FeedbackButton';

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <InstallBanner />
      <FeedbackButton userType="parent" />
    </>
  );
}
