// /montree/dashboard/layout.tsx
// Shared layout with persistent header on ALL dashboard screens
'use client';

import DashboardHeader from '@/components/montree/DashboardHeader';
import FeedbackButton from '@/components/montree/FeedbackButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <DashboardHeader />
      {children}
      <FeedbackButton />
    </div>
  );
}
