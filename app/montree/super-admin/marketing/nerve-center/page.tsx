// @ts-nocheck
'use client';

import Link from 'next/link';
import { useState } from 'react';

// ==================== THE NERVE CENTER — Marketing Intelligence Brain ====================
// Last updated: March 2026
// Sources: Hootsuite, Sprout Social, Buffer, VidIQ, Agorapulse, InfluenceFlow, Opus.pro

const TABS = [
  { id: 'smart-capture', label: '📸 Smart Capture', emoji: '📸' },
  { id: 'algorithms', label: '🧠 Algorithms', emoji: '🧠' },
  { id: 'hooks', label: '🎣 Hooks & Virality', emoji: '🎣' },
  { id: 'playbook', label: '🎯 Montree Playbook', emoji: '🎯' },
  { id: 'calendar', label: '📅 Content Calendar', emoji: '📅' },
] as const;

// ==================== SMART CAPTURE — COMPETITIVE ADVANTAGE ====================

const SMART_CAPTURE_HEADLINES = [
  {
    line: 'Smart Capture is the world\'s first self-learning Montessori observation system. Snap a photo of a child working — the AI identifies the material, matches it to the AMI curriculum, and updates their progress automatically. When a teacher corrects it, the system learns what that specific material looks like in their classroom and never makes the same mistake again. Every correction makes it smarter. Every photo makes it faster. Within weeks, it knows your classroom better than any software ever could.',
    label: 'Full Description',
    context: 'Website hero, pitch decks, investor materials',
  },
  {
    line: 'Traditional Montessori software digitises paperwork. Montree eliminates it.',
    label: 'The Killer One-Liner',
    context: 'Social media bios, email signatures, ads, first line of any pitch',
  },
  {
    line: 'Other platforms ask you to log everything by hand. Smart Capture watches, learns, and remembers.',
    label: 'Comparison Hook',
    context: 'Competitor comparison pages, sales emails, social posts',
  },
  {
    line: 'The first AI that learns YOUR classroom — not just the Montessori curriculum, but the actual materials on your actual shelves.',
    label: 'Personalisation Angle',
    context: 'Demo scripts, feature deep-dives, teacher-facing content',
  },
  {
    line: 'One correction is all it takes. The AI remembers what your materials look like and never makes the same mistake again.',
    label: 'Self-Learning Hook',
    context: 'Onboarding UX copy, tooltip text, teacher training materials',
  },
  {
    line: 'What used to take a teacher 30 minutes of manual logging per child per week now takes a photo and 2 seconds.',
    label: 'Time-Saving Angle',
    context: 'ROI conversations, principal/admin pitches, pricing justification',
  },
];

const SMART_CAPTURE_HOW_IT_WORKS = [
  { step: '1', title: 'Snap', desc: 'Teacher takes a photo of a child working with materials. That\'s it.' },
  { step: '2', title: 'Identify', desc: 'AI vision identifies the material from a 329-work AMI curriculum + any custom works added by the school.' },
  { step: '3', title: 'Match', desc: 'Fuzzy matching with confidence scoring. GREEN (≥95%): auto-updates progress silently. AMBER (50-95%): shows "Is this correct?" for teacher confirmation. RED (<50%): asks teacher to identify.' },
  { step: '4', title: 'Learn', desc: 'If the teacher corrects it, Haiku AI generates a visual description of what that material actually looks like. Stored permanently for that classroom. Injected into every future prompt.' },
  { step: '5', title: 'Remember', desc: 'The system literally cannot make the same mistake twice. Each correction builds a per-classroom visual memory that gets smarter over time.' },
];

const COMPETITORS = [
  {
    name: 'Transparent Classroom',
    status: 'Market Leader',
    observation: 'Manual checkbox logging. Photos are documentation only — uploaded, attached to a child, shared with parents. Zero AI. Zero automatic identification.',
    aiCapability: 'None',
    website: 'transparentclassroom.com',
  },
  {
    name: 'Montessori Compass',
    status: 'Established',
    observation: 'Manual progress tracking. Photo documentation. Their "AI" features are in marketing and admissions (ad optimisation), not classroom intelligence.',
    aiCapability: 'None (marketing/ads only)',
    website: 'montessoricompass.com',
  },
  {
    name: 'Brightwheel',
    status: 'Large (not Montessori-specific)',
    observation: 'Pre-loaded Montessori materials bank. Manual observation logging with photos/videos/notes. No recognition, no automation.',
    aiCapability: 'None',
    website: 'mybrightwheel.com',
  },
  {
    name: 'iCare Software',
    status: 'Mid-market',
    observation: 'Claims "AI-powered insights" but it\'s analytics on manually entered data. Pattern detection on progress records, not photo recognition.',
    aiCapability: 'Analytics on manual data only',
    website: 'icaresoftware.com',
  },
  {
    name: 'Montessorium',
    status: 'Child learning app',
    observation: 'AI-enabled flashcards with image recognition and augmented reality. But this is a children\'s learning app, not a classroom management tool. It recognises flashcard images for kids, not classroom materials for teachers.',
    aiCapability: 'Flashcard recognition (child-facing)',
    website: 'montessorium.com',
  },
  {
    name: 'Onespot',
    status: 'Growing',
    observation: 'Recently partnered with Transparent Classroom. Admin and enrolment tools. No AI photo recognition. No automatic progress tracking.',
    aiCapability: 'None',
    website: 'onespotapps.com',
  },
];

const SMART_CAPTURE_PITCH = {
  // The full pitch — written for principals, school owners, and decision-makers
  // Tone: confident, vivid, human. Not salesy. Let the product speak.
  opening: `Imagine this. A child sits down with the Pink Tower. The teacher takes a photo. That's it. That's all she has to do.`,
  body: [
    `The AI identifies the work — Pink Tower, Sensorial area, Block 1 of the cylinder sequence. It updates the child's progress records automatically. It prepares a beautiful, personalised update for the parents explaining what their child is working on and why it matters developmentally. And it does all of this in seconds, silently, in the background — so the teacher can stay where she belongs: with the children.`,
    `But that's just the beginning.`,
    `Montree keeps every record, every observation, every photo — organised by child, by area, by week. It analyses each child's journey through the curriculum and advises on the best path forward, grounded in pure AMI Montessori methodology. Not guesswork. Not templates. Personalised guidance based on what this specific child has mastered, what they're practicing, and what they're ready for next.`,
    `It goes deeper. The Guru — Montree's built-in AI advisor — draws on 13 developmental psychologists, from Piaget to Bowlby to Stern. It can help a teacher understand why a child is struggling with transitions, how to support a child going through a sensitive period for order, or what to do when a four-year-old suddenly starts testing boundaries. It's the world's foremost Montessori expert with a child psychologist built in — available to every teacher, every day, in under 30 seconds.`,
    `And the system teaches itself. If the AI makes a mistake matching a work — maybe your classroom has a custom material, or your Knobless Cylinders look different from the standard set — the teacher corrects it once. Just once. The system generates a visual memory of what that material actually looks like in your classroom, stores it permanently, and never makes the same mistake again. Every correction makes it smarter. Every photo makes it faster. Within weeks, it knows your classroom better than any software on earth.`,
    `No other Montessori platform does this. We checked. Transparent Classroom, Montessori Compass, Brightwheel, iCare, Montessorium, Onespot — none of them have AI photo recognition. None of them have automatic progress tracking. None of them learn. They digitise paperwork. Montree eliminates it.`,
    `This is not a budget tool. The AI costs real money to run. But for a school that takes excellence seriously — a school that wants to give every teacher the equivalent of a senior AMI consultant and a developmental psychologist on call — this is what the cutting edge looks like.`,
  ],
  closing: `And there's so much more. Weekly admin reports generated in seconds. Voice note observations transcribed and auto-matched to children. A parent portal that keeps families connected to their child's journey. Batch reports for an entire classroom at the push of a button. This is just the base. This is where Montessori meets what's possible.`,
  // Short versions for different contexts
  thirtySecondVersion: `Take a photo of a child working. That's it.\n\nThe AI identifies the Montessori material, updates the child's records, and sends the parents a beautiful update explaining what their child is doing and why it matters — all automatically.\n\nIt knows 329 works across the full AMI curriculum. It has 13 developmental psychologists built in. It can tell you why a child is struggling and what to do about it. And if it ever gets something wrong, correct it once — it teaches itself and never makes that mistake again.\n\nNo other Montessori software on the planet does any of this. We checked.\n\nThis isn't a tool that digitises your paperwork. This is a tool that eliminates it — so your teachers can get back to the teaching.\n\nYour school is already excellent. This is how you stay ahead.`,
  oneLineVersion: `The world's first self-learning AI for Montessori classrooms — take a photo, and everything else happens automatically.`,
  coldEmail: `Hi [Name],

Imagine if your teachers could take a photo of a child working — and everything else happened automatically.

This is Montree. The AI identifies the Montessori material, updates the child's progress records, and sends the parents a personalised update explaining what their child is working on and why it matters. The teacher doesn't type a thing.

It covers all 329 works across the full AMI curriculum. It analyses each child's journey and advises your teachers on the best path forward — grounded in pure Montessori methodology. If a child is struggling emotionally or behaviourally, it draws on 13 developmental psychologists to help your teachers respond with real expertise. And if it ever misidentifies a material, your teacher corrects it once — it learns and never makes that mistake again.

No other Montessori platform does any of this. Not Transparent Classroom. Not Montessori Compass. Not Brightwheel. We checked every one of them.

This is what gives your school the competitive edge. Your parents see richer, more detailed updates than any other school can provide. Your teachers spend their time teaching, not logging. Your curriculum decisions are backed by real data and developmental science. Schools that adopt this aren't just keeping up — they're setting the pace.

Let me know if you would like more information and it would be my pleasure to answer any questions you may have.

Tredoux
Founder, Montree
montree.xyz`,
};

const SMART_CAPTURE_ECONOMICS = [
  { metric: 'Cost per photo (Sonnet)', value: '~$0.06', note: 'Current production model — highest accuracy' },
  { metric: 'Cost per photo (Haiku)', value: '~$0.016', note: 'With visual memory, accuracy approaches Sonnet over time' },
  { metric: 'Cost per Guru question (Sonnet)', value: '~$0.08', note: '12 tools, full psychology, 4 tool rounds' },
  { metric: 'Monthly API cost / 250 students (Sonnet)', value: '~$300-$330', note: '1 photo/day + 1 Guru question/day per teacher' },
  { metric: 'Monthly API cost / 250 students (Haiku)', value: '~$80-$95', note: 'Same usage, 75% cheaper with self-learning' },
  { metric: 'Suggested pricing (Sonnet)', value: '$15-25/student/month', note: 'API costs = 20-30% of revenue at this price' },
  { metric: 'Suggested pricing (Haiku + memory)', value: '$10-15/student/month', note: 'Healthy 70%+ margins after visual memory matures' },
];

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

      {/* ===== SMART CAPTURE TAB ===== */}
      {tab === 'smart-capture' && (
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 border border-emerald-500/40 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📸</span>
              <h2 className="text-xl font-bold text-white">Smart Capture</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-semibold">WORLD FIRST</span>
            </div>
            <p className="text-emerald-100/90 text-sm leading-relaxed">The world{"'"}s first self-learning Montessori observation system. No other Montessori platform on the planet has AI photo recognition with automatic progress tracking and per-classroom visual memory. This is Montree{"'"}s defining competitive advantage.</p>
          </div>

          {/* The Pitch */}
          <Section title="The Pitch — For Principals & School Owners">
            <div className="space-y-4">
              <p className="text-white text-base font-semibold italic leading-relaxed">{SMART_CAPTURE_PITCH.opening}</p>
              {SMART_CAPTURE_PITCH.body.map((para, i) => (
                <p key={i} className={`text-sm leading-relaxed ${para === 'But that\'s just the beginning.' ? 'text-emerald-400 font-semibold text-base' : 'text-slate-300'}`}>{para}</p>
              ))}
              <p className="text-slate-300 text-sm leading-relaxed">{SMART_CAPTURE_PITCH.closing}</p>
              <div className="border-t border-slate-700 pt-4 mt-4 space-y-3">
                <div className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-amber-500">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">30-Second Version</span>
                  <p className="text-white text-sm mt-2 leading-relaxed">{SMART_CAPTURE_PITCH.thirtySecondVersion}</p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-cyan-500">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold">One-Liner</span>
                  <p className="text-white text-sm mt-2 font-semibold">{SMART_CAPTURE_PITCH.oneLineVersion}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Cold Email */}
          <Section title="Cold Email — Ready to Send">
            <div className="bg-slate-700/30 rounded-lg p-5">
              <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{SMART_CAPTURE_PITCH.coldEmail}</pre>
            </div>
            <p className="text-slate-500 text-xs mt-2">Replace [Name] with the school owner/principal name. Replace [School Name] if referenced.</p>
          </Section>

          {/* Marketing Lines */}
          <Section title="Marketing Lines — Copy These Everywhere">
            <div className="space-y-3">
              {SMART_CAPTURE_HEADLINES.map((h, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-emerald-500">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">{h.label}</span>
                    <span className="text-xs text-slate-500">Use for: {h.context}</span>
                  </div>
                  <p className="text-white text-sm leading-relaxed">{h.line}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* How It Works */}
          <Section title="How Smart Capture Works — The 5-Step Loop">
            <div className="space-y-2">
              {SMART_CAPTURE_HOW_IT_WORKS.map((s, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4 flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <span className="text-emerald-400 font-bold text-sm">{s.step}</span>
                  </div>
                  <div>
                    <h4 className="text-emerald-400 font-bold text-sm">{s.title}</h4>
                    <p className="text-slate-300 text-sm mt-1">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-amber-300 text-sm">The self-learning flywheel: Week 1 accuracy ~70% → Week 3 accuracy ~85%+ → Month 2 accuracy ~95%. Every teacher correction permanently improves the system for that entire classroom. Custom works that don{"'"}t exist in any curriculum get learned on first photo.</p>
            </div>
          </Section>

          {/* Competitive Landscape */}
          <Section title="Competitive Landscape — Nobody Else Has This">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm font-semibold">Researched March 2026: Zero competitors offer AI photo recognition for Montessori materials. Not one.</p>
            </div>
            <div className="space-y-3">
              {COMPETITORS.map((c, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h4 className="text-white font-bold text-sm">{c.name}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-300">{c.status}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.aiCapability === 'None' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>AI: {c.aiCapability}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{c.observation}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <p className="text-emerald-400 text-sm font-semibold mb-2">What This Means for Montree</p>
              <p className="text-emerald-300/80 text-sm">Every competitor requires teachers to manually log every observation, every presentation, every progress update — by hand, every day. Montree is the only platform where you can take a photo and everything else happens automatically. This isn{"'"}t a feature advantage. It{"'"}s a category of one.</p>
            </div>
          </Section>

          {/* Economics */}
          <Section title="Unit Economics — API Costs vs Revenue">
            <div className="space-y-2">
              {SMART_CAPTURE_ECONOMICS.map((e, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-3 grid grid-cols-[200px_120px_1fr] gap-3 items-center">
                  <span className="text-slate-300 text-sm">{e.metric}</span>
                  <span className="text-emerald-400 text-sm font-mono font-bold">{e.value}</span>
                  <span className="text-slate-500 text-xs">{e.note}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-300 text-sm"><strong>The play:</strong> Launch with Sonnet (maximum accuracy, premium pricing). As visual memory builds per classroom, the system can migrate to Haiku-first with Sonnet escalation — cutting API costs by 75% while maintaining accuracy. Margins improve every month the system runs.</p>
            </div>
          </Section>

          {/* Architecture Summary */}
          <Section title="Technical Architecture (For Pitch Decks)">
            <div className="space-y-3">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-cyan-400 font-semibold text-sm">Vision Layer</h4>
                <p className="text-slate-400 text-sm mt-1">Claude Sonnet 4 vision API with tool_use for structured extraction. 262-line visual identification guide covering 200+ works with confusion pair disambiguation (Red Rods vs Number Rods, Cylinder Blocks vs Knobless Cylinders, etc.).</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-cyan-400 font-semibold text-sm">Self-Learning Memory</h4>
                <p className="text-slate-400 text-sm mt-1">Per-classroom visual memory table. Three learning sources: teacher corrections (confidence 0.9), first-capture for custom works (confidence 0.7), and teacher manual entries (future). Haiku generates visual descriptions from photos. Injected into every future Smart Capture prompt.</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-cyan-400 font-semibold text-sm">Confidence Zones</h4>
                <p className="text-slate-400 text-sm mt-1">GREEN (≥95%): auto-update progress silently. AMBER (50-95%): teacher confirms or rejects. RED ({"<"}50%): unknown work, teacher identifies. Every confirmation and correction feeds the learning loop.</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-cyan-400 font-semibold text-sm">Accuracy Tracking</h4>
                <p className="text-slate-400 text-sm mt-1">Exponential Moving Average (EMA) per work per classroom. tracks times_used and times_correct per visual memory entry. System knows exactly how accurate it is and improves measurably over time.</p>
              </div>
            </div>
          </Section>
        </div>
      )}

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

          <Section title="Killer Quotes — Use These Everywhere">
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-300 text-sm italic">{'"'}A teacher wanting this kind of developmental insight would normally need to book time with a senior AMI trainer or educational psychologist. The Guru delivers that in under half a minute, for fractions of a cent. Teachers can absolutely wait for that.{'"'}</p>
                <p className="text-amber-500/60 text-xs mt-2">— Guru value proposition (speed vs expert consultation)</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-300 text-sm italic">{'"'}What used to require a 30-minute consultation with a senior AMI trainer now takes 15 seconds and costs less than a penny.{'"'}</p>
                <p className="text-amber-500/60 text-xs mt-2">— Short-form version for social media</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-300 text-sm italic">{'"'}The Guru knows 13 developmental psychologists, 329 Montessori works, every sensitive period for your child{"\'"}s age, and your child{"\'"}s complete learning history. It gives you personalised expert guidance in seconds — not days.{'"'}</p>
                <p className="text-amber-500/60 text-xs mt-2">— Feature depth angle (for parents who want to know what{"\'"}s under the hood)</p>
              </div>
            </div>
          </Section>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-400 text-sm font-semibold">The #1 Rule for Montree Marketing</p>
            <p className="text-emerald-300/80 text-sm mt-1">Authenticity + community beats polish + perfection. Raw classroom moments, real student progress, genuine teacher stories will outperform highly produced content in 2026. You ARE a Montessori teacher — that{"\'"}s your unfair advantage. Nobody else in EdTech has that.</p>
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
                <h3 className="text-emerald-400 font-semibold text-sm">Consistency &gt; Perfection</h3>
                <p className="text-slate-400 text-sm mt-1">Accounts that post regularly from the same time windows see 34% higher reach than sporadic posters. The algorithm rewards predictability. Pick your schedule and stick to it for at least 8 weeks before judging results.</p>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
