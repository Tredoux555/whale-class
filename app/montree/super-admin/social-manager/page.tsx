'use client';

import Link from 'next/link';

// Session 97 — culled stub modules (vault, credentials, tracker, calendar)
// from the visible hub. Routes still exist but aren't surfaced. Bring them
// back when they're actually built.
const MODULES = [
  {
    name: 'Social Media Guru',
    icon: '🧠',
    desc: 'AI advisor trained on social media strategy',
    href: '/montree/super-admin/social-manager/guru',
    color: 'purple',
  },
  {
    name: 'Posting Playbook',
    icon: '🎬',
    desc: '8 feature videos · per-platform copy + hashtags · WebClaude command protocol',
    href: '/montree/super-admin/social-playbook',
    color: 'blue',
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

        <p className="mt-8 text-xs text-slate-600 italic max-w-md">
          The vault / credentials / tracker / calendar modules are reserved for
          future build. Routes exist but aren&apos;t surfaced from this hub yet.
        </p>
      </div>
    </div>
  );
}
