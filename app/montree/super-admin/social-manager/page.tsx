'use client';

import Link from 'next/link';

const MODULES = [
  {
    name: 'Content Vault',
    icon: '🎬',
    desc: 'Final videos with captions & hashtags',
    href: '/montree/super-admin/social-manager/vault',
    color: 'emerald',
  },
  {
    name: 'Account Credentials',
    icon: '🔐',
    desc: 'Encrypted passwords for all platforms',
    href: '/montree/super-admin/social-manager/credentials',
    color: 'blue',
  },
  {
    name: 'Social Media Guru',
    icon: '🧠',
    desc: 'AI advisor trained on social media strategy',
    href: '/montree/super-admin/social-manager/guru',
    color: 'purple',
  },
  {
    name: 'Post Tracker',
    icon: '📊',
    desc: 'Log what was posted where & when',
    href: '/montree/super-admin/social-manager/tracker',
    color: 'amber',
  },
  {
    name: 'Content Calendar',
    icon: '📅',
    desc: 'Plan upcoming posts (coming soon)',
    href: '/montree/super-admin/social-manager/calendar',
    color: 'rose',
  },
];

const colorClasses = {
  emerald: {
    border: 'border-emerald-500/50',
    hover: 'hover:border-emerald-500 hover:bg-emerald-500/10',
    text: 'group-hover:text-emerald-400',
  },
  blue: {
    border: 'border-blue-500/50',
    hover: 'hover:border-blue-500 hover:bg-blue-500/10',
    text: 'group-hover:text-blue-400',
  },
  purple: {
    border: 'border-purple-500/50',
    hover: 'hover:border-purple-500 hover:bg-purple-500/10',
    text: 'group-hover:text-purple-400',
  },
  amber: {
    border: 'border-amber-500/50',
    hover: 'hover:border-amber-500 hover:bg-amber-500/10',
    text: 'group-hover:text-amber-400',
  },
  rose: {
    border: 'border-rose-500/50',
    hover: 'hover:border-rose-500 hover:bg-rose-500/10',
    text: 'group-hover:text-rose-400',
  },
};

export default function SocialManagerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/montree/super-admin"
            className="text-slate-400 hover:text-white transition-colors text-sm inline-flex items-center gap-2 mb-4"
          >
            ← Back to Admin
          </Link>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <span>📱</span> Social Media Manager
          </h1>
          <p className="text-slate-400 mt-2">
            Manage content, credentials, and social strategy for @montreexyz
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {MODULES.map((module) => {
            const colors = colorClasses[module.color as keyof typeof colorClasses];
            return (
              <Link
                key={module.href}
                href={module.href}
                className={`bg-slate-800 rounded-2xl p-6 border ${colors.border} ${colors.hover} transition-all group`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{module.icon}</span>
                  <div className="flex-1">
                    <h3 className={`text-xl font-semibold text-white ${colors.text} transition-colors`}>
                      {module.name}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">{module.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Stats (Placeholder) */}
        <div className="mt-8 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">📈 Recent Activity</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-emerald-400">17</div>
              <div className="text-slate-400 text-sm mt-1">FB Groups Posted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">815K</div>
              <div className="text-slate-400 text-sm mt-1">Combined Reach</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">3</div>
              <div className="text-slate-400 text-sm mt-1">Videos Uploaded</div>
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div className="mt-6 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">🌐 Connected Platforms</h2>
          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg text-white text-sm font-medium">
              Instagram @montreexyz
            </div>
            <div className="px-4 py-2 bg-black rounded-lg text-white text-sm font-medium">
              TikTok @montreexyz
            </div>
            <div className="px-4 py-2 bg-blue-600 rounded-lg text-white text-sm font-medium">
              Facebook /montreexyz
            </div>
            <div className="px-4 py-2 bg-blue-700 rounded-lg text-white text-sm font-medium">
              LinkedIn
            </div>
            <div className="px-4 py-2 bg-red-600 rounded-lg text-white text-sm font-medium">
              YouTube
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
