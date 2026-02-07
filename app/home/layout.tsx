'use client';

// /home/layout.tsx — Session 155
// Root layout for all /home/* pages
// Conditional nav: shows nav only when logged in

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Toaster } from 'sonner';
import { getHomeSession, clearHomeSession } from '@/lib/home/auth';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    setHasSession(!!getHomeSession());
  }, [pathname]);

  const handleLogout = () => {
    clearHomeSession();
    window.location.href = '/home';
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <>
      <Toaster position="top-center" />
      {hasSession && (
        <nav className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/home/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <span className="font-bold text-lg hidden sm:inline">Montree Home</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/home/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/home/dashboard') && !isActive('/home/dashboard/curriculum')
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/home/dashboard/curriculum"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/home/dashboard/curriculum') ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                Curriculum
              </Link>
              <Link
                href="/home/settings"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/home/settings') ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors ml-1"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      {children}
    </>
  );
}
