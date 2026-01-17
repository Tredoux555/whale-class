// /montree/dashboard/layout.tsx
// Clean layout - no bottom nav, just the content
'use client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {children}
    </div>
  );
}
