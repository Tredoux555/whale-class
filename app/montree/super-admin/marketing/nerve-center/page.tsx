// @ts-nocheck
'use client';

import Link from 'next/link';
import { useState } from 'react';

// ==================== THE NERVE CENTER — Marketing Intelligence Brain ====================
// Last updated: March 2026
// Sources: Hootsuite, Sprout Social, Buffer, VidIQ, Agorapulse, InfluenceFlow, Opus.pro

const TABS = [
  { id: 'algorithms', label: '🧠 Algorithms', emoji: '🧠' },
  { id: 'hooks', label: '🎣 Hooks & Virality', emoji: '🎣' },
  { id: 'playbook', label: '🎯 Montree Playbook', emoji: '🎯' },
  { id: 'calendar', label: '📅 Content Calendar', emoji: '📅' },
] as const;

// ==================== ALGORITHM DATA ====================

const PLATFORMS = [
  {
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    accentBorder: 'border-pink-500',
    updated: 'March 2026',
    tldr: 'Completion rate is king. Saves & shares outweigh likes 5-10x. First 3 seconds decide everything.',
    signals: [
      { signal: 'Watch Completion Rate', weight: '~45% of ranking', note: 'Virality threshold: 70% completion (up from 50% in 2024)' },
      { signal: 'Saves & Shares', weight: 'Heavy', note: '1 save ≈ 5-10 likes in algorithm weight. This is the #1 shift of 2025.' },
      { signal: 'Comment Quality', weight: 'Medium', note: 'One thoughtful 50-word comment > twenty fire emojis' },
      { signal: 'Search Match', weight: 'Rising', note: '2026: TikTok treats search as a direct ranking metric. Keyword-rich captions get boosted.' },
    ],
    specs: [
      { label: 'Sweet Spot Length', value: '60-90 seconds (2x completion vs longer)' },
      { label: 'Discovery Length', value: 'Sub-60s for maximum non-follower reach' },
      { label: 'Hashtags', value: '3-5 tags (down from 10+ in 2024). Mix branded + niche.' },
      { label: 'Post Frequency', value: '3-5x per week. Daily if quality holds.' },
      { label: 'Best Times', value: '5 PM - 9 PM weekdays. Tue-Thu peak.' },
      { label: 'Hook Window', value: '3 seconds. 65% of viewers decide here.' },
    ],
    keyInsight: 'TikTok now shows your video to followers FIRST (2026 change), then expands if it performs. Your existing followers are your launchpad — treat them well.',
  },
  {
    name: 'Instagram',
    icon: '📸',
    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    accentBorder: 'border-purple-500',
    updated: 'March 2026',
    tldr: 'DM shares (Sends) are now THE most powerful signal. 55% of Reel views come from non-followers. Views replaced likes as the primary metric.',
    signals: [
      { signal: 'Watch Time', weight: 'Highest', note: 'Must hold viewers past 3 seconds. Algorithm heavily weights this.' },
      { signal: 'Sends (DM Shares)', weight: 'Critical', note: 'THE most powerful signal for reaching new audiences. Each send = strong recommendation.' },
      { signal: 'Saves', weight: 'High', note: 'Signals intent to revisit. Drives recommendation engine.' },
      { signal: 'Views (unified metric)', weight: 'Primary', note: '2026: Instagram unified all formats around "Views" as primary metric. Not likes, not comments.' },
    ],
    specs: [
      { label: 'Reel Sweet Spot', value: '7-30 seconds (highest completion). 30-90s for storytelling.' },
      { label: 'Sound-Off Viewing', value: '50% watch without sound. Always use captions/on-screen text.' },
      { label: 'Non-Follower Reach', value: '55% of Reel views from non-followers. Reels Tab = audition platform.' },
      { label: 'Hashtags', value: '5-10 tags. Still relevant but secondary to content quality.' },
      { label: 'Post Frequency', value: '3-5 feed/week + 2-4 Reels/week + Stories daily' },
      { label: 'Best Times', value: '11 AM - 2 PM Tue-Thu' },
    ],
    keyInsight: 'Post in the day or two AFTER a viral Reel — Instagram\'s algorithm ranks your next few videos higher because you have momentum. Ride the wave.',
  },
  {
    name: 'YouTube',
    icon: '▶️',
    color: 'bg-red-500/15 text-red-400 border-red-500/30',
    accentBorder: 'border-red-500',
    updated: 'March 2026',
    tldr: 'Shorts and long-form work in synergy. Shorts drive subscribers, long-form builds authority. Consistency > frequency.',
    signals: [
      { signal: 'Watch Time / Completion', weight: 'Highest', note: 'Viewers watching all the way through or rewatching = massive boost.' },
      { signal: 'Engagement Actions', weight: 'High', note: 'Comments, shares, subscriptions from the video.' },
      { signal: 'Click-Through Rate', weight: 'High (long-form)', note: 'Thumbnail + title = your 2-second pitch.' },
      { signal: 'Consistent Upload', weight: 'Medium', note: 'Regular schedule trains YouTube to promote your channel.' },
    ],
    specs: [
      { label: 'Shorts Sweet Spot', value: '13 seconds OR 60 seconds (bimodal: quick hits or full storytelling)' },
      { label: 'Long-Form Sweet Spot', value: '8-12 minutes for education content' },
      { label: 'View Counting (Mar 2025)', value: 'Any play/replay = 1 view. But only "Engaged Views" count for revenue.' },
      { label: 'Post Frequency', value: '1-2 Shorts/week + 1 long-form/week (ideal)' },
      { label: 'Best Strategy', value: 'Consistency > specific time. Pick a schedule and stick to it.' },
      { label: 'Shorts → Long-Form', value: 'Use Shorts as teasers. YouTube displays both side-by-side on channel pages.' },
    ],
    keyInsight: 'Trending audio on Shorts is a primary discovery tool. Leverage it. Also: 60-second Shorts allow full storytelling while staying in the Shorts feed.',
  },
  {
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    accentBorder: 'border-blue-500',
    updated: 'March 2026',
    tldr: 'Company pages are dead (1.6% reach). Personal profiles dominate. Employee reshares reach 561% further. Newsletters go straight to email inboxes.',
    signals: [
      { signal: 'Creator Credibility', weight: 'High', note: 'Your expertise signals and profile strength matter.' },
      { signal: 'Content Depth', weight: 'High', note: 'Helpful, relevant, professional content wins.' },
      { signal: 'Meaningful Comments', weight: 'Critical', note: 'One 150-word expert exchange = 5x more reach than 50 shallow reactions.' },
      { signal: 'Dwell Time', weight: 'Medium', note: 'How long people spend reading/watching your content.' },
    ],
    specs: [
      { label: 'Best Format', value: 'Carousels (6.60% engagement rate — highest of any format)' },
      { label: 'Video Length', value: 'Under 30 seconds (200% higher completion vs longer)' },
      { label: 'Organic Reach Drop', value: '60% decline from 2024 to 2026. Company pages hit hardest.' },
      { label: 'Company Page Reach', value: '1.6% of followers. Essentially broken for organic.' },
      { label: 'External Links', value: 'Deprioritized 60%. Algorithm wants users on-platform.' },
      { label: 'Post Frequency', value: '2-3x per week. Quality > quantity.' },
      { label: 'Best Times', value: '8 AM - 12 PM Tue-Wed' },
      { label: 'Newsletter Feature', value: 'Delivers directly to inboxes + personal email. Game-changer.' },
    ],
    keyInsight: 'Employee advocacy is 5.6x more effective than company posts. YOUR personal profile posting about Montree > the Montree company page. Always.',
  },
];

// ==================== HOOK FORMULAS ====================

const HOOK_FORMULAS = [
  { name: 'Bold Statement', example: '"Nobody talks about this, but most Montessori schools are tracking progress on paper in 2026."', why: 'Creates immediate tension. Viewer needs to know what comes next.' },
  { name: 'Curiosity Gap', example: '"I built something for my classroom that accidentally turned into something much bigger..."', why: 'The most powerful hook mechanism. Presents intrigue, withholds the payoff. Brain seeks closure.' },
  { name: 'Pattern Interrupt', example: '[Show a child quietly working] "This 4-year-old is teaching herself to read. Here\'s the part nobody explains..."', why: 'Breaks expected flow. Triggers evolutionary orientation response. 300% engagement boost.' },
  { name: 'Question Hook', example: '"What if your child\'s teacher had access to the world\'s best Montessori expert... every single day?"', why: 'Forces the viewer to mentally engage. They can\'t NOT think about the answer.' },
  { name: 'Transformation', example: '"Before Montree: 3 hours writing reports. After: 5 minutes. Same quality."', why: 'Before/after taps into curiosity + satisfaction from contrast. Clear, immediate value.' },
  { name: 'Story Hook', example: '"Last year I was drowning in paperwork every evening instead of preparing materials. So I built something..."', why: 'Your actual story. Authentic narrative creates emotional investment.' },
];

const VIRAL_PSYCHOLOGY = [
  { principle: 'High-Arousal Emotions', stat: '80% more likely to be shared', detail: 'Content triggering awe, excitement, or amusement activates dopamine. Neutral content dies.' },
  { principle: 'Pattern Interrupts', stat: '300% engagement boost', detail: 'Start with something visually or verbally unexpected. Reverse storytelling. Dramatic moments.' },
  { principle: 'The 3-Second Rule', stat: '65% decide in 3 seconds', detail: '65% of viewers decide whether to keep watching in the first 3 seconds. Your opening IS your content.' },
  { principle: 'Saves > Likes', stat: '5-10x algorithm weight', detail: 'Across TikTok and Instagram, saves signal deep value. Create content worth saving (tips, guides, frameworks).' },
  { principle: 'DM Shares (Instagram)', stat: '#1 signal for new reach', detail: 'When someone sends your video via DM, Instagram treats it as the strongest possible recommendation.' },
  { principle: 'UGC Trust Factor', stat: '9.8x more impactful', detail: 'User-generated content is 9.8x more impactful than influencer content for purchase decisions.' },
];

// ==================== MONTREE-SPECIFIC PLAYBOOK ====================

const CONTENT_PILLARS = [
  { pillar: 'Learning Moments', format: 'POV / Day-in-Life', freq: '2x/week', desc: 'Children mastering works, progress celebrations, quiet concentration moments. Real classroom footage. This is your GOLD — nobody else has this content.' },
  { pillar: 'Teacher/Parent Tips', format: 'Educational / List', freq: '1-2x/week', desc: '"3 signs your child is in a sensitive period for order" or "Why your toddler keeps lining things up." Practical, shareable, saveable.' },
  { pillar: 'Transformations', format: 'Before/After', freq: '1x/week', desc: 'Student progress over time. Paper tracking vs Montree. Hours spent on reports before vs after. Visual proof.' },
  { pillar: 'Behind the Scenes', format: 'Story / GRWM', freq: '1x/week', desc: 'Building Montree, your classroom setup, how the AI works, design decisions. People follow PEOPLE.' },
  { pillar: 'Guru in Action', format: 'Screen Recording', freq: '1x/week', desc: 'Show the AI answering real questions. "Watch what happens when I ask about sensitive periods for a 3-year-old." Let the product sell itself.' },
];

const GROWTH_TACTICS = [
  {
    tactic: 'Nano-Influencer Partnerships',
    cost: '$100-500 per post',
    roi: '5-8% conversion rate (vs 2-3% for mega-influencers)',
    how: 'Find 10-15 Montessori/homeschool creators with 1K-100K followers. Offer free Montree access + small fee. Their audiences are hyper-loyal and trust their recommendations. 72% of consumers trust nano-influencer recommendations over ads.',
  },
  {
    tactic: 'UGC Campaign: #MontreeWin',
    cost: 'Free (organic)',
    roi: '161% higher conversion for shoppers who see UGC',
    how: 'Encourage teachers to share student progress screenshots, parents to share report highlights. Feature the best weekly. Community builds itself. UGC market hit $7.6B in 2025 — a 69% surge.',
  },
  {
    tactic: 'Cross-Platform Repurposing',
    cost: 'Time only',
    roi: '35% reach increase + 3x ROI multiplication',
    how: 'Create one quality video → TikTok version (3-5 hashtags, searchable caption) → Instagram Reel (5-10 hashtags, longer caption) → YouTube Short (trending audio) → LinkedIn clip (professional angle). 60% time reduction vs creating unique content per platform.',
  },
  {
    tactic: 'LinkedIn Newsletter',
    cost: 'Free',
    roi: 'Direct inbox delivery to every subscriber',
    how: 'Launch "The Montessori Pulse" newsletter on LinkedIn. Goes straight to subscribers\' email inboxes — bypasses the broken feed algorithm entirely. Write about Montessori philosophy + child development + tech in education. Position yourself as the thought leader.',
  },
  {
    tactic: 'Facebook Group Infiltration',
    cost: 'Free (organic)',
    roi: 'Direct access to 800K+ Montessori parents/teachers',
    how: 'Join the top 10 Montessori Facebook groups (50K-150K members each). Don\'t sell — provide value. Answer questions, share tips, become a trusted voice. Mention Montree naturally when relevant. Facebook groups are still the #1 hub for Montessori community.',
  },
];

// ==================== CONTENT CALENDAR ====================

const WEEKLY_SCHEDULE = [
  { day: 'Monday', task: 'BATCH CREATE: Record 6-8 short videos for the week (4-5 hours focused)', platforms: 'Prep', type: 'Production' },
  { day: 'Tuesday', task: 'Post: Learning Moment video + LinkedIn carousel/article', platforms: 'TikTok, IG, LinkedIn', type: 'Learning Moments' },
  { day: 'Wednesday', task: 'Post: Teacher/Parent Tip + polish Thursday content', platforms: 'TikTok, IG, YT Short', type: 'Educational' },
  { day: 'Thursday', task: 'Post: Transformation or Guru Demo + engage in FB groups', platforms: 'TikTok, IG, LinkedIn', type: 'Proof' },
  { day: 'Friday', task: 'Post: Behind-the-Scenes + repost best UGC of the week', platforms: 'TikTok, IG, Stories', type: 'Personal' },
  { day: 'Saturday', task: 'Engage: Reply to all comments, DM new followers, community building', platforms: 'All', type: 'Community' },
  { day: 'Sunday', task: 'Plan: Review analytics, plan next week, batch content ideas', platforms: 'Analytics', type: 'Strategy' },
];

const POSTING_TIMES = [
  { platform: 'TikTok', time: '5 PM - 9 PM', days: 'Tue-Thu peak', freq: '3-5x/week' },
  { platform: 'Instagram Reels', time: '11 AM - 2 PM', days: 'Tue-Thu peak', freq: '2-4x/week' },
  { platform: 'Instagram Stories', time: 'Morning + Evening', days: 'Daily', freq: 'Daily' },
  { platform: 'YouTube Shorts', time: 'Consistent schedule', days: 'Any (consistency matters)', freq: '1-2x/week' },
  { platform: 'LinkedIn', time: '8 AM - 12 PM', days: 'Tue-Wed peak', freq: '2-3x/week' },
  { platform: 'Facebook Groups', time: 'Evenings', days: 'Daily engagement', freq: 'Comments daily, posts 2-3x/week' },
];

// ==================== COMPONENTS ====================

function Section({ title, children, accent = 'emerald' }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function NerveCenterPage() {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('algorithms');
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href="/montree/super-admin/marketing" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">
        ← Back to Marketing Hub
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <span>⚡</span> The Nerve Center
        </h1>
        <p className="text-slate-400 mt-1">Marketing intelligence brain — algorithms, hooks, and viral playbook • Updated March 2026</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== ALGORITHMS TAB ===== */}
      {tab === 'algorithms' && (
        <div className="space-y-4">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
            <p className="text-orange-400 text-sm font-semibold">The Big Shift of 2025-2026</p>
            <p className="text-orange-300/80 text-sm mt-1">Every platform moved away from vanity metrics (followers, likes) toward distribution metrics (watches, sends, shares, saves). Content that gets saved and shared wins — regardless of follower count. This is your advantage as a small creator.</p>
          </div>

          {PLATFORMS.map((p) => (
            <div key={p.name} className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden`}>
              <div
                onClick={() => setExpandedPlatform(expandedPlatform === p.name ? null : p.name)}
                className="p-4 cursor-pointer hover:bg-slate-700/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{p.icon}</span>
                      <h3 className="text-white font-bold text-lg">{p.name}</h3>
                      <span className="text-xs text-slate-500">Updated {p.updated}</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-2">{p.tldr}</p>
                  </div>
                  <span className="text-slate-500 text-lg mt-1">{expandedPlatform === p.name ? '▾' : '▸'}</span>
                </div>
              </div>

              {expandedPlatform === p.name && (
                <div className="border-t border-slate-700 p-4 space-y-5">
                  {/* Ranking Signals */}
                  <div>
                    <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-3">Algorithm Ranking Signals</h4>
                    <div className="space-y-2">
                      {p.signals.map((s, i) => (
                        <div key={i} className="bg-slate-700/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold text-sm">{s.signal}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.color}`}>{s.weight}</span>
                          </div>
                          <p className="text-slate-400 text-xs">{s.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Specs */}
                  <div>
                    <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-3">Optimal Specs</h4>
                    <div className="grid grid-cols-[140px_1fr] gap-y-2 gap-x-3">
                      {p.specs.map((s, i) => (
                        <div key={i} className="contents">
                          <span className="text-slate-500 text-xs font-medium">{s.label}</span>
                          <span className="text-slate-300 text-xs">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Insight */}
                  <div className={`p-3 rounded-lg border-l-4 ${p.accentBorder} bg-slate-700/20`}>
                    <p className="text-slate-300 text-sm">💡 {p.keyInsight}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== HOOKS & VIRALITY TAB ===== */}
      {tab === 'hooks' && (
        <div className="space-y-6">
          <Section title="Hook Formulas That Work (2026)">
            <div className="space-y-3">
              {HOOK_FORMULAS.map((h, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                  <h3 className="text-emerald-400 font-semibold text-sm">{h.name}</h3>
                  <p className="text-white text-sm mt-2 italic">"{h.example.replace(/"/g, '')}"</p>
                  <p className="text-slate-400 text-xs mt-2">{h.why}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="The Psychology of Virality">
            <div className="grid md:grid-cols-2 gap-3">
              {VIRAL_PSYCHOLOGY.map((v, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-emerald-500">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-semibold text-sm">{v.principle}</h3>
                    <span className="text-emerald-400 text-xs font-bold">{v.stat}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">{v.detail}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Formats That Perform (Education Niche)">
            <div className="space-y-3">
              {[
                { format: 'POV (Point-of-View)', desc: 'Natural lighting, on-screen text, emotional storytelling. "POV: You realize your 3-year-old just read her first word." Montessori classroom POVs are untapped gold.', performance: 'High engagement + shares' },
                { format: 'Day-in-the-Life', desc: '"A day in my Montessori classroom" — most accessible format. Shows real children, real learning, real moments. Parents eat this up.', performance: 'High reach + follows' },
                { format: 'Before/After Transformation', desc: 'Paper tracking → Montree. Stressed teacher → calm teacher. Child struggling → child thriving. Clear, visual contrast.', performance: 'High saves + shares' },
                { format: 'Screen Recording Demo', desc: 'Show the Guru answering a real question. Show a report being generated in seconds. Let the product speak.', performance: 'High saves (intent to revisit)' },
                { format: 'GRWM (Get Ready With Me)', desc: '"Get ready with me for a Montessori morning" — prep materials, set up the classroom, talk through your thinking. Intimate and relatable.', performance: 'High watch time + comments' },
              ].map((f, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-semibold text-sm">{f.format}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">{f.performance}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ===== MONTREE PLAYBOOK TAB ===== */}
      {tab === 'playbook' && (
        <div className="space-y-6">
          <Section title="Content Pillars — What to Post">
            <div className="space-y-3">
              {CONTENT_PILLARS.map((c, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-white font-semibold text-sm">{c.pillar}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">{c.format}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">{c.freq}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{c.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Growth Tactics — How to Scale">
            <div className="space-y-4">
              {GROWTH_TACTICS.map((g, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                  <h3 className="text-white font-bold text-sm mb-2">{g.tactic}</h3>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <span className="text-slate-500 text-xs">Cost</span>
                      <p className="text-emerald-400 text-xs font-semibold">{g.cost}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Expected ROI</span>
                      <p className="text-emerald-400 text-xs font-semibold">{g.roi}</p>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">{g.how}</p>
                </div>
              ))}
            </div>
          </Section>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-400 text-sm font-semibold">The #1 Rule for Montree Marketing</p>
            <p className="text-emerald-300/80 text-sm mt-1">Authenticity + community beats polish + perfection. Raw classroom moments, real student progress, genuine teacher stories will outperform highly produced content in 2026. You ARE a Montessori teacher — that's your unfair advantage. Nobody else in EdTech has that.</p>
          </div>
        </div>
      )}

      {/* ===== CONTENT CALENDAR TAB ===== */}
      {tab === 'calendar' && (
        <div className="space-y-6">
          <Section title="Weekly Content Schedule">
            <div className="space-y-2">
              {WEEKLY_SCHEDULE.map((w, i) => (
                <div key={i} className={`rounded-lg p-3 ${w.type === 'Production' ? 'bg-orange-500/10 border border-orange-500/20' : w.type === 'Strategy' ? 'bg-blue-500/10 border border-blue-500/20' : w.type === 'Community' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-slate-700/30'}`}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-bold text-sm w-24">{w.day}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-300">{w.platforms}</span>
                  </div>
                  <p className="text-slate-300 text-sm">{w.task}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Optimal Posting Times by Platform">
            <div className="space-y-2">
              {POSTING_TIMES.map((p, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-3 grid grid-cols-[120px_120px_1fr_100px] gap-2 items-center">
                  <span className="text-white font-semibold text-sm">{p.platform}</span>
                  <span className="text-emerald-400 text-xs font-mono">{p.time}</span>
                  <span className="text-slate-400 text-xs">{p.days}</span>
                  <span className="text-slate-500 text-xs text-right">{p.freq}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="The Batching System">
            <div className="space-y-3">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-orange-400 font-semibold text-sm">Monday: Batch Production Day</h3>
                <p className="text-slate-400 text-sm mt-1">4-5 focused hours. Record 6-8 short videos for the entire week. Set up one location, one lighting setup, change outfits if needed. Film everything. This one day fuels your entire week.</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-blue-400 font-semibold text-sm">Hub-and-Spoke Repurposing</h3>
                <p className="text-slate-400 text-sm mt-1">One quality video becomes: TikTok (3-5 hashtags, keyword caption) → Instagram Reel (5-10 hashtags, longer caption) → YouTube Short (trending audio) → LinkedIn clip (professional angle) → Instagram Story (behind-the-scenes of making it). 35% more reach, 60% less time.</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h3 className="text-emerald-400 font-semibold text-sm">Consistency > Perfection</h3>
                <p className="text-slate-400 text-sm mt-1">Accounts that post regularly from the same time windows see 34% higher reach than sporadic posters. The algorithm rewards predictability. Pick your schedule and stick to it for at least 8 weeks before judging results.</p>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
