'use client';

import Link from 'next/link';

const SECTIONS = [
  {
    title: '⚡ INTELLIGENCE',
    tools: [
      { name: 'The Nerve Center', desc: 'Marketing brain — algorithms, hooks, viral playbook, content calendar', href: '/montree/super-admin/marketing/nerve-center', icon: '🧠', featured: true },
      { name: 'Outreach Campaign', desc: 'Global sales — 9 personalized emails, 50 schools ranked, 4-week game plan', href: '/montree/super-admin/marketing/outreach-campaign', icon: '🎯', featured: true },
      { name: 'Sales Playbook', desc: 'School intel, outreach schedule, the letter', href: '/montree/super-admin/marketing/sales-playbook', icon: '🎯', featured: true },
    ],
  },
  {
    title: '📝 CONTENT & CREATIVE',
    tools: [
      { name: 'Platform Warroom', desc: 'TikTok scripts, IG carousels, FB groups, bios, hashtags', href: '/montree/super-admin/marketing/warroom', icon: '📱' },
      { name: 'Content Factory', desc: 'Social cards, WeChat article, captions', href: '/montree/super-admin/marketing/content', icon: '🏭' },
      { name: 'Creative Studio', desc: 'Voiceover scripts, Canva specs', href: '/montree/super-admin/marketing/studio', icon: '🎨' },
    ],
  },
  {
    title: '📨 OUTREACH',
    tools: [
      { name: 'Prospect HQ', desc: 'School hit list, WhatsApp templates', href: '/montree/super-admin/marketing/prospects', icon: '📋' },
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
    title: '📖 ARCHIVE',
    tools: [
      { name: 'Launch HQ', desc: '14-day launch checklist', href: '/montree/super-admin/marketing/launch-hq', icon: '🚀' },
      { name: 'Objection Handler', desc: 'FAQ answers for principals', href: '/montree/super-admin/marketing/objections', icon: '🛡️' },
      { name: 'Cold Email HQ', desc: 'Legacy 4-touch email sequence', href: '/montree/super-admin/marketing/cold-email', icon: '✉️' },
      { name: 'Outreach (Legacy)', desc: 'Old cold email templates', href: '/montree/super-admin/marketing/outreach', icon: '📝' },
      { name: 'Full Playbook', desc: 'Original strategy bible', href: '/montree/super-admin/marketing/playbook', icon: '📖' },
    ],
  },
];

export default function MarketingHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/montree/super-admin" className="text-slate-400 hover:text-white transition-colors text-sm">
          ← Back to Admin
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span>🚀</span> Marketing Hub
        </h1>
        <p className="text-slate-400 mt-2">Strategy, intelligence, and content tools</p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {section.title}
            </h2>
            <div className={`grid grid-cols-1 ${section.tools.some(t => t.featured) ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
              {section.tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`rounded-xl p-5 border transition-all group ${
                    tool.featured
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/15'
                      : 'bg-slate-800 border-slate-700 hover:border-emerald-500/50 hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{tool.icon}</span>
                    <div>
                      <h3 className={`font-semibold transition-colors ${
                        tool.featured ? 'text-emerald-400 group-hover:text-emerald-300' : 'text-white group-hover:text-emerald-400'
                      }`}>
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
