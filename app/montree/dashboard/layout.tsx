// /montree/dashboard/layout.tsx
// Clean layout - no bottom nav, just the content
// Includes feedback button for teachers
'use client';

import FeedbackButton from '@/components/montree/FeedbackButton';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {children}
      <FeedbackButton />
    </div>
  );
}
