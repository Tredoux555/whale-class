// /montree/admin/layout.tsx
// Admin layout with navigation
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/montree/admin', label: 'Overview', icon: '📊' },
    { href: '/montree/admin/activity', label: 'Activity', icon: '⚡' },
    { href: '/montree/admin/students', label: 'Students', icon: '👧' },
    { href: '/montree/admin/teachers', label: 'Teachers', icon: '👩‍🏫' },
    { href: '/montree/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/montree/dashboard" className="text-gray-400 hover:text-white">
              ← Dashboard
            </Link>
            <span className="text-gray-600">|</span>
            <h1 className="text-lg font-bold text-emerald-400">Admin</h1>
          </div>
        </div>
      </header>

      {/* Sub-nav */}
      <nav className="bg-gray-900/50 border-b border-gray-800 px-4">
        <div className="flex gap-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="p-4">
        {children}
      </main>
    </div>
  );
}
