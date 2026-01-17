// /montree/dashboard/tools/page.tsx
// Tools page - Videos, Reports, Admin
'use client';

import Link from 'next/link';

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="py-3 flex items-center justify-center border-b border-gray-800 relative">
        <Link href="/montree/dashboard" className="absolute left-4 text-gray-400 hover:text-white text-lg">
          ←
        </Link>
        <span className="text-xl">🔧</span>
        <h1 className="text-lg font-bold text-white ml-2">Tools</h1>
      </header>

      {/* Tools Grid */}
      <main className="flex-1 p-4 flex flex-col gap-3">
        <Link
          href="/montree/dashboard/videos/preview"
          className="flex items-center gap-4 p-4 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors active:scale-98"
        >
          <span className="text-3xl">🎬</span>
          <div>
            <div className="text-white font-bold">Weekly Videos</div>
            <div className="text-purple-200 text-sm">Generate AI-powered parent updates</div>
          </div>
        </Link>
        
        <Link
          href="/montree/dashboard/reports"
          className="flex items-center gap-4 p-4 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors active:scale-98"
        >
          <span className="text-3xl">📊</span>
          <div>
            <div className="text-white font-bold">Weekly Reports</div>
            <div className="text-blue-200 text-sm">Progress summaries for parents</div>
          </div>
        </Link>

        <Link
          href="/montree/dashboard/games"
          className="flex items-center gap-4 p-4 bg-green-600 hover:bg-green-700 rounded-xl transition-colors active:scale-98"
        >
          <span className="text-3xl">🎮</span>
          <div>
            <div className="text-white font-bold">English Games</div>
            <div className="text-green-200 text-sm">Interactive learning activities</div>
          </div>
        </Link>

        <Link
          href="/montree/admin"
          className="flex items-center gap-4 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors active:scale-98"
        >
          <span className="text-3xl">⚙️</span>
          <div>
            <div className="text-white font-bold">Admin</div>
            <div className="text-gray-400 text-sm">Manage students & school settings</div>
          </div>
        </Link>
      </main>
    </div>
  );
}
