// /montree/dashboard/tools/page.tsx
// Tools page - Videos, Reports, Admin
// Polished Session 64 - Consistent with Montree theme
'use client';

import Link from 'next/link';

const TOOLS = [
  {
    href: '/montree/dashboard/videos/preview',
    icon: '🎬',
    title: 'Weekly Videos',
    description: 'Generate AI-powered parent updates',
    gradient: 'from-purple-500 to-violet-600',
    hoverGradient: 'hover:from-purple-600 hover:to-violet-700',
  },
  {
    href: '/montree/dashboard/reports',
    icon: '📊',
    title: 'Weekly Reports',
    description: 'Progress summaries for parents',
    gradient: 'from-blue-500 to-indigo-600',
    hoverGradient: 'hover:from-blue-600 hover:to-indigo-700',
  },
  {
    href: '/montree/dashboard/games',
    icon: '🎮',
    title: 'English Games',
    description: 'Interactive learning activities',
    gradient: 'from-emerald-500 to-teal-600',
    hoverGradient: 'hover:from-emerald-600 hover:to-teal-700',
  },
  {
    href: '/admin/curriculum-editor',
    icon: '📚',
    title: 'Curriculum Editor',
    description: 'Manage works & sequences',
    gradient: 'from-amber-500 to-orange-600',
    hoverGradient: 'hover:from-amber-600 hover:to-orange-700',
  },
  {
    href: '/admin/weekly-planning',
    icon: '📅',
    title: 'Weekly Planning',
    description: 'Upload & manage weekly plans',
    gradient: 'from-pink-500 to-rose-600',
    hoverGradient: 'hover:from-pink-600 hover:to-rose-700',
  },
  {
    href: '/montree/admin',
    icon: '⚙️',
    title: 'School Admin',
    description: 'Manage students & settings',
    gradient: 'from-gray-500 to-slate-600',
    hoverGradient: 'hover:from-gray-600 hover:to-slate-700',
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 py-4 px-4 flex items-center gap-3 sticky top-0 z-10">
        <Link 
          href="/montree/dashboard" 
          className="w-10 h-10 bg-emerald-100 hover:bg-emerald-200 rounded-xl flex items-center justify-center transition-colors"
        >
          <span className="text-lg">←</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          <h1 className="text-xl font-bold text-gray-800">Teacher Tools</h1>
        </div>
      </header>

      {/* Tools Grid */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`flex items-center gap-4 p-5 bg-gradient-to-br ${tool.gradient} ${tool.hoverGradient} rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">{tool.icon}</span>
              </div>
              <div className="flex-1">
                <div className="text-white font-bold text-lg">{tool.title}</div>
                <div className="text-white/80 text-sm">{tool.description}</div>
              </div>
              <span className="text-white/60 text-xl">→</span>
            </Link>
          ))}
        </div>

        {/* Quick tip */}
        <div className="max-w-2xl mx-auto mt-6 p-4 bg-emerald-100 rounded-xl border border-emerald-200">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-sm text-emerald-800">
              <strong>Tip:</strong> Upload your weekly plan in Weekly Planning to automatically sync children's progress with the curriculum.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
