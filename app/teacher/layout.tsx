import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getUserSession } from '@/lib/auth-multi';
import TeacherNav from './components/TeacherNav';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get pathname from middleware header
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Skip auth for login page - render without nav
  if (pathname === '/teacher/login') {
    return <>{children}</>;
  }
  
  const session = await getUserSession();
  
  // Redirect to login if not authenticated
  if (!session) {
    redirect('/teacher/login');
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
