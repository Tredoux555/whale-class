// /montree/dashboard/page.tsx
// Clean, modern child picker with responsive grid
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession, type MontreeSession } from '@/lib/montree/auth';
import { toast, Toaster } from 'sonner';
import InboxButton from '@/components/montree/InboxButton';

interface Child {
  id: string;
  name: string;
  photo_url?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);
  }, [router]);

  useEffect(() => {
    if (!session?.classroom?.id) {
      setLoading(false);
      return;
    }

    fetch(`/api/montree/children?classroom_id=${session.classroom.id}`)
      .then(r => r.json())
      .then(data => {
        setChildren(data.children || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load students');
        setLoading(false);
      });
  }, [session?.classroom?.id]);

  if (!session || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-5xl">🌳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌳</span>
            <div>
              <h1 className="text-xl font-bold">{session.classroom?.name || 'My Classroom'}</h1>
              <p className="text-emerald-100 text-sm">{children.length} students</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/montree/dashboard/curriculum"
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
              title="Curriculum"
            >
              📚
            </Link>
            <Link
              href="/montree/dashboard/guru"
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
              title="Montessori Guru"
            >
              🧠
            </Link>
            <Link
              href="/montree/dashboard/print"
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
            >
              🖨️
            </Link>
            {session?.teacher?.id && (
              <InboxButton
                conversationId={session.teacher.id}
                userName={session.teacher.name || 'Teacher'}
              />
            )}
            <button
              onClick={() => { clearSession(); router.push('/montree/login'); }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Student Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children.length === 0 ? (
          <Link
            href="/montree/dashboard/students"
            className="block bg-white rounded-2xl shadow-md p-12 text-center hover:shadow-lg transition-shadow"
          >
            <span className="text-6xl mb-4 block">👶</span>
            <p className="text-gray-600 font-medium text-lg">Tap to add your first student</p>
          </Link>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/montree/dashboard/${child.id}`}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl active:scale-95 transition-all p-4 flex flex-col items-center"
              >
                {/* Avatar */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl overflow-hidden mb-3 shadow-md">
                  {child.photo_url ? (
                    <img src={child.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    child.name.charAt(0)
                  )}
                </div>
                {/* Name */}
                <p className="text-sm font-semibold text-gray-700 truncate w-full text-center">
                  {child.name.split(' ')[0]}
                </p>
              </Link>
            ))}

            {/* Add Student Card */}
            <Link
              href="/montree/dashboard/students"
              className="bg-white/60 border-2 border-dashed border-gray-300 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all p-4 flex flex-col items-center justify-center min-h-[120px]"
            >
              <span className="text-3xl text-gray-400 mb-1">+</span>
              <span className="text-xs text-gray-400">Add</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
