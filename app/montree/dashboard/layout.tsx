// /montree/dashboard/layout.tsx
// THE PRODUCT LAYOUT - Dark theme, mobile-first, bottom navigation
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/montree/dashboard', icon: '🏠', label: 'Dashboard', exact: true },
    { href: '/montree/dashboard/reports', icon: '📊', label: 'Reports' },
    { href: '/montree/dashboard/games', icon: '🎮', label: 'Games' },
    { href: '/montree/dashboard/settings', icon: '⚙️', label: 'Settings' },
  ];
  
  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Status Bar */}
      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between text-xs text-slate-500 safe-area-top">
        <span>Whale Class</span>
        <span className="font-semibold text-teal-400">MONTREE</span>
        <span>•••</span>
      </div>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation - Fixed */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 safe-area-bottom">
        <div className="max-w-lg mx-auto flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${
                isActive(item.href, item.exact)
                  ? 'text-teal-400'
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
