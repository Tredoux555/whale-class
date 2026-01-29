// /montree/dashboard/page.tsx
// Session 112: Child picker - tiles FILL the entire screen
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession, type MontreeSession } from '@/lib/montree/auth';
import { toast, Toaster } from 'sonner';

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

  // Calculate optimal grid layout - prefer wider/square tiles
  const gridLayout = useMemo(() => {
    const count = children.length;
    if (count === 0) return { cols: 3, rows: 1 };
    
    // For 20 students: 4 cols x 5 rows = nice square-ish tiles
    // For mobile, 3-4 columns works best
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 4, rows: 3 };
    if (count <= 16) return { cols: 4, rows: 4 };
    if (count <= 20) return { cols: 4, rows: 5 };
    if (count <= 25) return { cols: 5, rows: 5 };
    
    // Fallback for larger classes
    const cols = 5;
    const rows = Math.ceil(count / cols);
    return { cols, rows };
  }, [children.length]);

  if (!session || loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">🐋</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 overflow-hidden">
      <Toaster position="top-center" />
      {/* Compact Header - with safe area for notch/dynamic island */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐋</span>
          <span className="font-bold text-sm truncate max-w-[150px]">{session.classroom?.name}</span>
        </div>
        <button 
          onClick={() => { clearSession(); router.push('/montree/login'); }}
          className="text-xs px-3 py-1.5 bg-white/20 rounded-lg active:bg-white/30"
        >
          Logout
        </button>
      </header>

      {/* Student Grid - scrollable with square-ish tiles */}
      <main className="flex-1 px-4 py-3 overflow-y-auto">
        {children.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <span className="text-4xl mb-2">👶</span>
            <p className="text-sm">No students yet</p>
          </div>
        ) : (
          <div 
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
            }}
          >
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/montree/dashboard/${child.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center p-3 aspect-square"
              >
                {/* Avatar */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xl overflow-hidden mb-2">
                  {child.photo_url ? (
                    <img src={child.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    child.name.charAt(0)
                  )}
                </div>
                {/* Name */}
                <p className="text-xs sm:text-sm font-medium text-gray-700 truncate w-full text-center">
                  {child.name.split(' ')[0]}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer Tools - with safe area for home bar */}
      <footer className="bg-white border-t px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] flex justify-around shrink-0">
        <Link href="/montree/dashboard/capture?class=true" className="p-2 text-xl hover:scale-110 transition-transform" title="Class Photo">📷</Link>
        <Link href="/montree/dashboard/curriculum" className="p-2 text-xl hover:scale-110 transition-transform" title="Curriculum">📚</Link>
        <Link href="/montree/dashboard/games" className="p-2 text-xl hover:scale-110 transition-transform" title="Games">🎮</Link>
        <Link href="/montree/dashboard/tools" className="p-2 text-xl hover:scale-110 transition-transform" title="Tools">🛠️</Link>
        <Link href="/montree/dashboard/settings" className="p-2 text-xl hover:scale-110 transition-transform" title="Settings">⚙️</Link>
      </footer>
    </div>
  );
}
