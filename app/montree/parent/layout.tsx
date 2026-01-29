'use client';

// app/montree/parent/layout.tsx
// Parent portal layout with PWA install banner

import InstallBanner from '@/components/montree/InstallBanner';

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
