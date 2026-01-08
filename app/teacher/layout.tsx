import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getUserSession } from '@/lib/auth-multi';
import TeacherNav from './components/TeacherNav';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get current path to skip auth check on login page
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '';
  
  // Skip auth check for login page
  if (pathname === '/teacher/login' || pathname.startsWith('/teacher/login')) {
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
