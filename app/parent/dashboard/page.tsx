// app/parent/dashboard/page.tsx
// Parent dashboard page

import ParentDashboard from '@/components/parent/ParentDashboard';

export const metadata = {
  title: 'Parent Dashboard | Whale Montessori',
  description: 'Track your child\'s Montessori curriculum progress',
};

export default function ParentDashboardPage() {
  return <ParentDashboard />;
}


