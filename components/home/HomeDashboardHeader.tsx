// components/home/HomeDashboardHeader.tsx
// Persistent top header — CLONED from montree/DashboardHeader.tsx
// Same gradient, same glassmorphic buttons, adapted for Home context
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getHomeSession, clearHomeSession, type HomeSession } from '@/lib/home/auth';

export default function HomeDashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<HomeSession | null>(null);

  useEffect(() => {
    const sess = getHomeSession();
    if (!sess) return;
    setSession(sess);
  }, []);

  // Don't render until we have a session (avoid flash)
  if (!session?.family?.id) return null;

  const navItems = [
    { href: '/home/dashboard/curriculum', icon: '📚', label: 'Curriculum' },
    { href: '/home/dashboard/games', icon: '🎮', label: 'Games' },
    { href: '/home/dashboard/gallery', icon: '📷', label: 'Gallery' },
    { href: '/home/dashboard/guru', icon: '🧠', label: 'Advisor' },
    { href: '/home/settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg sticky top-0 z-50 pt-[env(safe-area-inset-top)] print:hidden">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + family name */}
        <Link href="/home/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <span className="text-2xl">🏠</span>
          <span className="font-bold text-lg">{session.family.name || 'Montree Home'}</span>
        </Link>

        {/* Right: Nav icons */}
        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-lg transition-colors font-medium ${
                pathname?.startsWith(item.href)
                  ? 'bg-white/30'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title={item.label}
            >
              {item.icon}
            </Link>
          ))}
          <button
            onClick={() => { clearHomeSession(); router.push('/home/login'); }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
