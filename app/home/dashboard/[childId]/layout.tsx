'use client';

// /home/dashboard/[childId]/layout.tsx — Session 155
// Shared layout for child detail pages — header + 2 tabs

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { getHomeSession, type HomeSession } from '@/lib/home/auth';

interface ChildInfo {
  id: string;
  name: string;
  age: number;
}

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const childId = params.childId as string;

  const [session, setSession] = useState<HomeSession | null>(null);
  const [child, setChild] = useState<ChildInfo | null>(null);

  useEffect(() => {
    const sess = getHomeSession();
    if (!sess) {
      router.push('/home/login');
      return;
    }
    setSession(sess);

    // Fetch child info
    if (childId) {
      fetch(`/api/home/children/${childId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.child) setChild(data.child);
        })
        .catch(() => {});
    }
  }, [childId, router]);

  const activeTab = pathname.endsWith('/progress') ? 'progress' : 'works';

  const tabs = [
    { id: 'works', label: '📋 Works', href: `/home/dashboard/${childId}` },
    { id: 'progress', label: '📊 Progress', href: `/home/dashboard/${childId}/progress` },
  ];

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">🏠</div>
      </div>
    );
  }

  const displayName = child?.name || 'Child';
  const displayInitial = child?.name?.charAt(0)?.toUpperCase() || '👤';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Child Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/home/dashboard"
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              ←
            </Link>

            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
              {displayInitial}
            </div>

            <div>
              <h1 className="text-lg font-bold">{displayName}</h1>
              <p className="text-emerald-100 text-xs">
                {child ? `Age ${child.age}` : ''} • {session.family.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-white border-b sticky top-[52px] z-30 shadow-sm">
        <div className="flex w-full">
          {tabs.map((tab) => (
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
      <main className="max-w-4xl mx-auto px-4 py-4">{children}</main>
    </div>
  );
}
