// /home/dashboard/layout.tsx
// Clean layout — CLONED from montree/dashboard/layout.tsx
// Header + content + feedback button, nothing else
'use client';

import HomeDashboardHeader from '@/components/home/HomeDashboardHeader';
import HomeFeedbackButton from '@/components/home/HomeFeedbackButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <HomeDashboardHeader />
      {children}
      <div className="print:hidden">
        <HomeFeedbackButton />
      </div>
    </div>
  );
}
