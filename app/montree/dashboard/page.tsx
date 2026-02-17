// /montree/dashboard/page.tsx
// Clean, modern child picker with responsive grid
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { toast, Toaster } from 'sonner';
import WelcomeModal from '@/components/montree/WelcomeModal';
import FeatureWrapper from '@/components/montree/onboarding/FeatureWrapper';

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
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);

    // Show welcome modal if tutorial not completed
    if (!sess.teacher.has_completed_tutorial) {
      setShowWelcome(true);
    }
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
        toast.error('Failed to load');
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
    <FeatureWrapper featureModule="student_management" autoStart={!session.teacher.has_completed_tutorial}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <Toaster position="top-center" />

      {/* Student/child count subtitle */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-center text-sm text-emerald-700 font-medium">
        {children.length} {isHomeschoolParent(session) ? 'children' : 'students'}
      </div>

      {/* Student Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children.length === 0 ? (
          <Link
            href="/montree/dashboard/students"
            data-tutorial="student-grid"
            className="block bg-white rounded-2xl shadow-md p-12 text-center hover:shadow-lg transition-shadow animate-pulse-ring"
          >
            <span className="text-6xl mb-4 block">👶</span>
            <p className="text-gray-600 font-medium text-lg">
              {isHomeschoolParent(session) ? 'Tap to add your first child' : 'Tap to add your first student'}
            </p>
          </Link>
        ) : (
          <div data-tutorial="student-grid" className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/montree/dashboard/${child.id}`}
                data-tutorial="student-card"
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
              data-tutorial="add-student-button"
              className="bg-white/60 border-2 border-dashed border-gray-300 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all p-4 flex flex-col items-center justify-center min-h-[120px]"
            >
              <span className="text-3xl text-gray-400 mb-1">+</span>
              <span className="text-xs text-gray-400">Add</span>
            </Link>
          </div>
        )}
      </main>

      {/* Welcome Modal for first-time users */}
      {showWelcome && session && (
        <WelcomeModal
          teacherName={session.teacher.name}
          isOpen={showWelcome}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* Custom pulsing ring animation */}
      <style jsx>{`
        @keyframes pulse-ring {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% {
            box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
          }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }
      `}</style>
    </div>
    </FeatureWrapper>
  );
}
