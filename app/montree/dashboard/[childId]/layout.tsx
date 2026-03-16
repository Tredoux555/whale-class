// /montree/dashboard/[childId]/layout.tsx
// Session 112: Shared layout - FAST loading, parallel fetches
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';

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

  const { t } = useI18n();
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
    if (childId && sess.school?.id) {
      fetch(`/api/montree/children/${childId}`, {
        headers: {
          'x-school-id': sess.school.id,
        }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.child) setChild(data.child);
        })
        .catch(() => {}); // Silently fail - we have fallbacks
    }
  }, [childId, router]);

  // Determine active tab
  const getActiveTab = () => {
    if (pathname.endsWith('/gallery')) return 'gallery';
    if (pathname.endsWith('/reports')) return 'reports';
    if (pathname.endsWith('/progress')) return 'progress';
    if (pathname.endsWith('/profile')) return 'profile';
    if (pathname.endsWith('/observations')) return 'observations';
    return 'week';
  };
  const activeTab = getActiveTab();

  const tabs = [
    { id: 'week', label: `📋 ${t('nav.week' as any)}`, href: `/montree/dashboard/${childId}` },
    { id: 'gallery', label: `📸 ${t('nav.gallery' as any) || 'Gallery'}`, href: `/montree/dashboard/${childId}/gallery` },
    { id: 'reports', label: `📄 ${t('nav.reports' as any) || 'Reports'}`, href: `/montree/dashboard/${childId}/reports` },
  ];

  // Don't show loading spinner - render immediately with fallbacks
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">🌳</div>
      </div>
    );
  }

  const displayName = child?.name || t('common.student' as any);
  const displayInitial = child?.name?.charAt(0) || '👤';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Child sub-header — main nav is in DashboardHeader above */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white z-40">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center gap-3">
            <Link
              href="/montree/dashboard"
              className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30"
            >
              ←
            </Link>

            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-base font-bold overflow-hidden">
              {child?.photo_url ? (
                <img src={child.photo_url} className="w-full h-full object-cover" alt="" />
              ) : displayInitial}
            </div>

            <div>
              <h1 className="text-base font-bold">{displayName}</h1>
              <p className="text-emerald-100 text-xs">{session.classroom?.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Bar - Full width */}
      <div className="bg-white border-b z-30 shadow-sm">
        <div className="flex w-full">
          {tabs.map(tab => (
            <Link
              key={tab.id}
              href={tab.href}
              data-guide={`tab-${tab.id}`}
              className={`flex-1 py-3 font-medium text-center text-xs sm:text-sm truncate px-1 ${
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
