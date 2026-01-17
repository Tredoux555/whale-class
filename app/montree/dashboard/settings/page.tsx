// /montree/dashboard/settings/page.tsx
// Settings - Teacher profile, preferences
'use client';

import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-500 text-sm">Manage your preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl">
            👨‍🏫
          </div>
          <div className="flex-1">
            <div className="text-white font-medium">Tredoux</div>
            <div className="text-slate-500 text-sm">Lead Teacher • Whale Class</div>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="space-y-2">
        {[
          { emoji: '🏫', title: 'School Settings', desc: 'Beijing International', href: '#' },
          { emoji: '👥', title: 'Manage Students', desc: '18 students', href: '#' },
          { emoji: '👩‍🏫', title: 'Teacher Team', desc: 'Vanessa, Dana, Jenny', href: '#' },
          { emoji: '🔔', title: 'Notifications', desc: 'Push & email settings', href: '#' },
          { emoji: '🎨', title: 'Appearance', desc: 'Dark theme', href: '#' },
          { emoji: '📤', title: 'Export Data', desc: 'Download reports', href: '#' },
        ].map((item, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-4 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-slate-700/50 rounded-xl p-4 transition-all group"
          >
            <span className="text-2xl">{item.emoji}</span>
            <div className="flex-1 text-left">
              <div className="text-white font-medium">{item.title}</div>
              <div className="text-slate-500 text-sm">{item.desc}</div>
            </div>
            <span className="text-slate-600 group-hover:text-slate-400">→</span>
          </button>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="pt-4 border-t border-slate-800">
        <h3 className="text-red-400/70 text-sm font-medium mb-3">Danger Zone</h3>
        <button className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm hover:bg-red-500/20 transition-all">
          🚪 Sign Out
        </button>
      </div>

      {/* Version */}
      <div className="text-center text-slate-600 text-xs pt-4">
        Montree v1.0.0 • Built with ❤️
      </div>
    </div>
  );
}
