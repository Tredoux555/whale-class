// /montree/home/layout.tsx
// Minimal layout for the home parent experience
// No DashboardHeader, no FeedbackButton — clean slate for Bioluminescent UI
import { Toaster } from 'sonner';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-center" theme="dark" />
      {children}
    </>
  );
}
