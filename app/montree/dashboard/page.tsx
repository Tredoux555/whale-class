// /montree/dashboard/page.tsx
// Session 112: Child picker - tiles FILL the entire screen
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession, type MontreeSession } from '@/lib/montree/auth';

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
      .catch(() => setLoading(false));
  }, [session?.classroom?.id]);

  // Calculate optimal grid layout
  const gridLayout = useMemo(() => {
    const count = children.length;
    if (count === 0) return { cols: 1, rows: 1 };
    
    // Find the best rectangle that fits all children
    // Aim for slightly more columns than rows (landscape bias)
    const sqrt = Math.sqrt(count);
    const cols = Math.ceil(sqrt * 1.2); // Slightly wider
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
      {/* Compact Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐋</span>
          <span className="font-bold text-sm truncate max-w-[150px]">{session.classroom?.name}</span>
        </div>
        <button 
          onClick={() => { clearSession(); router.push('/montree/login'); }}
          className="text-xs px-2 py-1 bg-white/20 rounded-lg"
        >
          Logout
        </button>
      </header>

      {/* Student Grid - FILLS the screen */}
      <main className="flex-1 p-2 min-h-0">
        {children.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <span className="text-4xl mb-2">👶</span>
            <p className="text-sm">No students yet</p>
          </div>
        ) : (
          <div 
            className="grid gap-2 h-full w-full"
            style={{
              gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
            }}
          >
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/montree/dashboard/${child.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col items-center justify-center overflow-hidden"
              >
                {/* Avatar - scales with container */}
                <div className="w-[40%] max-w-16 aspect-square rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden mb-1">
                  {child.photo_url ? (
                    <img src={child.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    child.name.charAt(0)
                  )}
                </div>
                {/* Name */}
                <p className="text-xs sm:text-sm font-medium text-gray-700 truncate w-full text-center px-1">
                  {child.name.split(' ')[0]}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer Tools */}
      <footer className="bg-white border-t px-2 py-1 flex justify-around shrink-0">
        <Link href="/montree/dashboard/curriculum" className="p-2 text-xl hover:scale-110 transition-transform" title="Curriculum">📚</Link>
        <Link href="/montree/dashboard/games" className="p-2 text-xl hover:scale-110 transition-transform" title="Games">🎮</Link>
        <Link href="/montree/dashboard/tools" className="p-2 text-xl hover:scale-110 transition-transform" title="Tools">🛠️</Link>
        <Link href="/montree/dashboard/settings" className="p-2 text-xl hover:scale-110 transition-transform" title="Settings">⚙️</Link>
      </footer>
    </div>
  );
}
