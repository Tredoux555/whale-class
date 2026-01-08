import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth-multi';
import TeacherNav from './components/TeacherNav';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getUserSession();
  
  // Redirect to login if not authenticated
  if (!session) {
    redirect('/auth/teacher');
  }
  
  // Only allow teachers and above
  if (!['super_admin', 'school_admin', 'teacher'].includes(session.role)) {
    redirect('/parent');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherNav user={session} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
