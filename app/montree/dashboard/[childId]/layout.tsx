// /montree/dashboard/[childId]/layout.tsx
// Session 112: Shared layout - FAST loading, parallel fetches
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, type MontreeSession } from '@/lib/montree/auth';

interface ChildInfo {
  id: string;
  name: string;
  photo_url?: string;
}

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const childId = params.childId as string;

  const [session, setSession] = useState<MontreeSession | null>(null);
  const [child, setChild] = useState<ChildInfo | null>(null);

  // Check auth + fetch child in parallel
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);

    // Fetch child info immediately (don't wait for state update)
    if (childId) {
      fetch(`/api/montree/children/${childId}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.child) setChild(data.child);
        })
        .catch(() => {}); // Silently fail - we have fallbacks
    }
  }, [childId, router]);

  // Determine active tab
  const getActiveTab = () => {
    if (pathname.endsWith('/progress')) return 'progress';
    if (pathname.endsWith('/profile')) return 'profile';
    if (pathname.endsWith('/observations')) return 'observations';
    if (pathname.endsWith('/gallery')) return 'gallery';
    if (pathname.endsWith('/reports')) return 'reports';
    return 'week';
  };
  const activeTab = getActiveTab();

  // Visible tabs - Profile & Observations hidden but routes still work
  const tabs = [
    { id: 'week', label: '📋 Week', href: `/montree/dashboard/${childId}` },
    { id: 'progress', label: '📊 Progress', href: `/montree/dashboard/${childId}/progress` },
    { id: 'gallery', label: '📷 Gallery', href: `/montree/dashboard/${childId}/gallery` },
    { id: 'reports', label: '📄 Reports', href: `/montree/dashboard/${childId}/reports` },
  ];
  // Hidden but functional: /profile, /observations

  // Don't show loading spinner - render immediately with fallbacks
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">🌳</div>
      </div>
    );
  }

  const displayName = child?.name || 'Student';
  const displayInitial = child?.name?.charAt(0) || '👤';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header - with safe area for notch */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href="/montree/dashboard"
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30"
              >
                ←
              </Link>
              
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold overflow-hidden">
                {child?.photo_url ? (
                  <img src={child.photo_url} className="w-full h-full object-cover" alt="" />
                ) : displayInitial}
              </div>
              
              <div>
                <h1 className="text-lg font-bold">{displayName}</h1>
                <p className="text-emerald-100 text-xs">{session.classroom?.name}</p>
              </div>
            </div>
            
            {/* Guru button */}
            <Link
              href={`/montree/dashboard/guru?child=${childId}`}
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 text-lg"
              title="Ask Guru"
            >
              🧠
            </Link>
          </div>
        </div>
      </header>

      {/* Tab Bar - Full width */}
      <div className="bg-white border-b sticky top-[64px] z-30 shadow-sm">
        <div className="flex w-full">
          {tabs.map(tab => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex-1 py-3 font-medium text-center text-sm ${
                activeTab === tab.id 
                  ? 'bg-emerald-100 text-emerald-700 border-b-2 border-emerald-500' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {children}
      </main>
    </div>
  );
}
