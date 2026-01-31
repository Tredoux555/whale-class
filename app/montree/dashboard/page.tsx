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

  // Calculate optimal grid layout - include +1 for the "add student" tile
  const gridLayout = useMemo(() => {
    const count = children.length + 1; // +1 for add button
    if (count <= 1) return { cols: 3, rows: 1 };

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
        <div className="animate-bounce text-4xl">🌳</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 overflow-hidden">
      <Toaster position="top-center" />
      {/* Compact Header - with safe area for notch/dynamic island */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌳</span>
          <span className="font-bold text-sm truncate max-w-[150px]">{session.classroom?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/montree/dashboard/capture?class=true"
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 active:scale-95 transition-all"
            title="Class Photo"
          >
            <span className="text-lg">📷</span>
          </Link>
          <button
            onClick={() => { clearSession(); router.push('/montree/login'); }}
            className="text-xs px-3 py-1.5 bg-white/20 rounded-lg active:bg-white/30"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Student Grid - fills entire screen, no footer clutter */}
      <main className="flex-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-hidden">
        {children.length === 0 ? (
          <Link href="/montree/dashboard/students" className="h-full flex flex-col items-center justify-center text-gray-500 hover:text-emerald-600 transition-colors">
            <span className="text-4xl mb-2">👶</span>
            <p className="text-sm font-medium">Tap to add students</p>
          </Link>
        ) : (
          <div
            className="h-full grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
            }}
          >
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/montree/dashboard/${child.id}`}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center p-1 min-h-0"
              >
                {/* Avatar - scales with container */}
                <div className="w-[45%] aspect-square max-w-[70px] rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xl overflow-hidden mb-1">
                  {child.photo_url ? (
                    <img src={child.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>{child.name.charAt(0)}</span>
                  )}
                </div>
                {/* Name */}
                <p className="text-xs font-medium text-gray-700 truncate w-full text-center px-1" style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.875rem)' }}>
                  {child.name.split(' ')[0]}
                </p>
              </Link>
            ))}
            {/* Add Student tile - always at the end */}
            <Link
              href="/montree/dashboard/students"
              className="bg-white/50 border-2 border-dashed border-gray-300 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 active:scale-95 transition-all flex flex-col items-center justify-center p-1 min-h-0"
            >
              <span className="text-2xl text-gray-400">+</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
