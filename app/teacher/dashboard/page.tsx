// app/teacher/dashboard/page.tsx
// Teacher dashboard page

import TeacherDashboard from '@/components/teacher/TeacherDashboard';

export const metadata = {
  title: 'Teacher Dashboard | Whale Montessori',
  description: 'Manage your class and track student progress',
};

export default function TeacherDashboardPage() {
  return <TeacherDashboard />;
}
