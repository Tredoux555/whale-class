'use client';

// /home/dashboard/layout.tsx
// Shared dashboard layout with persistent header and navigation

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getHomeSession, clearHomeSession, type HomeSession } from '@/lib/home/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<HomeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sess = getHomeSession();
    if (!sess) {
      router.push('/home/login');
      return;
    }
    setSession(sess);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    clearHomeSession();
    router.push('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-5xl">🏠</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const navLinks = [
    { label: '👨‍👩‍👧 Dashboard', href: '/home/dashboard' },
    { label: '📚 Curriculum', href: '/home/dashboard/curriculum' },
    { label: '🎮 Games', href: '/home/dashboard/games' },
    { label: '🖼️ Gallery', href: '/home/dashboard/gallery' },
    { label: '🧙 Advisor', href: '/home/dashboard/guru' },
    { label: '⚙️ Settings', href: '/home/settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/home/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            <div>
              <h1 className="font-bold text-gray-800">Montree Home</h1>
              <p className="text-xs text-gray-500">{session.family.name}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ☰
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
          >
            🚪
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-gray-600 hover:bg-emerald-50 border-b border-gray-100 last:border-b-0"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>🏠 Montree Home • Track your child's Montessori journey</p>
        </div>
      </footer>
    </div>
  );
}
