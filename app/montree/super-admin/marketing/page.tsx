'use client';

import Link from 'next/link';

const SECTIONS = [
  {
    title: '🎯 LAUNCH TOOLS',
    tools: [
      { name: 'Launch HQ', desc: '14-day checklist + file finder', href: '/montree/super-admin/marketing/launch-hq', icon: '🚀' },
      { name: 'Objection Handler', desc: 'FAQ answers for principals', href: '/montree/super-admin/marketing/objections', icon: '🛡️' },
    ],
  },
  {
    title: '📝 CONTENT TOOLS',
    tools: [
      { name: 'Platform Warroom', desc: 'TikTok scripts, IG carousels, FB groups, bios, hashtags', href: '/montree/super-admin/marketing/warroom', icon: '📱' },
      { name: 'Content Factory', desc: 'Social cards, WeChat article, captions', href: '/montree/super-admin/marketing/content', icon: '🏭' },
      { name: 'Creative Studio', desc: 'Voiceover scripts, Canva specs', href: '/montree/super-admin/marketing/studio', icon: '🎨' },
    ],
  },
  {
    title: '📨 OUTREACH TOOLS',
    tools: [
      { name: 'Sales Playbook', desc: 'School intel, scheduled outreach plan, personalized emails for 16 targets', href: '/montree/super-admin/marketing/sales-playbook', icon: '🎯' },
      { name: 'Prospect HQ', desc: 'School hit list, WhatsApp templates', href: '/montree/super-admin/marketing/prospects', icon: '📋' },
      { name: 'Outreach', desc: 'Cold email templates', href: '/montree/super-admin/marketing/outreach', icon: '✉️' },
      { name: 'Growth Engine', desc: 'Influencers, SEO, onboarding emails, testimonials', href: '/montree/super-admin/marketing/growth', icon: '📈' },
    ],
  },
  {
    title: '🌐 WEB PAGES',
    tools: [
      { name: 'Landing Page', desc: 'HTML landing page for montree.xyz', href: '/montree/super-admin/marketing/landing', icon: '🌐' },
      { name: 'Links Page', desc: 'Bio link page for social profiles', href: '/montree/super-admin/marketing/links', icon: '🔗' },
      { name: 'Pitch Deck', desc: 'Animated 60-second pitch', href: '/montree/super-admin/marketing/pitch', icon: '🎬' },
    ],
  },
  {
    title: '📖 REFERENCE',
    tools: [
      { name: 'Playbook', desc: 'Strategy bible — the full marketing plan', href: '/montree/super-admin/marketing/playbook', icon: '📖' },
    ],
  },
];

export default function MarketingHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/montree/super-admin"
          className="text-slate-400 hover:text-white transition-colors text-sm"
        >
          ← Back to Admin
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span>🚀</span> Marketing Hub
        </h1>
        <p className="text-slate-400 mt-2">13 tools to launch, grow, and market Montree</p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-750 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{tool.icon}</span>
                    <div>
                      <h3 className="text-white font-semibold group-hover:text-emerald-400 transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-slate-400 text-sm mt-1">{tool.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
