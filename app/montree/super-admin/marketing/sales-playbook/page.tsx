// @ts-nocheck
'use client';

import Link from 'next/link';
import { useState } from 'react';

// ==================== DATA ====================

const SCHEDULE = [
  {
    week: 'Week 1 (Days 1-7)',
    title: 'Qingdao — Your Backyard',
    tasks: [
      { day: 'Day 1', action: 'Email HD Qingdao (HR + Admissions)', school: 'HD Qingdao', done: false },
      { day: 'Day 1', action: 'Find Mr. Taljaard on LinkedIn / WeChat — send SA connection msg', school: 'HD Qingdao', done: false },
      { day: 'Day 2', action: 'Email QAIS (website contact form + LinkedIn EC director search)', school: 'QAIS', done: false },
      { day: 'Day 3', action: 'Email Hongwen Montessori Qingdao (both campuses)', school: 'Hongwen QD', done: false },
      { day: 'Day 4', action: 'Email Baishan School (website contact)', school: 'Baishan', done: false },
      { day: 'Day 4', action: 'Email Weiming KG West Coast', school: 'Weiming QD', done: false },
      { day: 'Day 5', action: 'Email Montessori Academy QD campus', school: 'MAIS QD', done: false },
      { day: 'Day 6', action: 'Follow-up: HD Qingdao value drop (curriculum resource PDF)', school: 'HD Qingdao', done: false },
      { day: 'Day 7', action: 'Follow-up: QAIS value drop', school: 'QAIS', done: false },
    ],
  },
  {
    week: 'Week 2 (Days 8-14)',
    title: 'Follow-ups + Chain HQ Outreach',
    tasks: [
      { day: 'Day 8', action: 'WeChat/LinkedIn connect — HD Qingdao (Renee or whoever responded)', school: 'HD Qingdao', done: false },
      { day: 'Day 8', action: 'Follow-up: Hongwen QD + Baishan value drops', school: 'Multiple', done: false },
      { day: 'Day 9', action: 'Email Etonkids HQ Beijing (Template B — chain pitch)', school: 'Etonkids', done: false },
      { day: 'Day 10', action: 'Email Hongwen Group HQ Shanghai (Template B)', school: 'Hongwen Group', done: false },
      { day: 'Day 10', action: 'Email MAIS China HQ Shanghai (Template B)', school: 'MAIS China', done: false },
      { day: 'Day 11', action: 'Follow-up with walkthrough video to Qingdao schools that opened/read emails', school: 'QD Schools', done: false },
      { day: 'Day 12', action: 'Gentle follow-up to HD Qingdao — "just checking if you had a chance to look"', school: 'HD Qingdao', done: false },
      { day: 'Day 13', action: 'Follow-up Etonkids + Hongwen Group', school: 'Chains', done: false },
      { day: 'Day 14', action: 'Review: Which schools responded? Adjust strategy.', school: 'All', done: false },
    ],
  },
  {
    week: 'Week 3-4 (Days 15-28)',
    title: 'City Expansion + Demos',
    tasks: [
      { day: 'Day 15', action: 'Email MSB Beijing (Template A — oldest Montessori in China)', school: 'MSB Beijing', done: false },
      { day: 'Day 15', action: 'Email Children\'s House Beijing (Template A)', school: "Children's House", done: false },
      { day: 'Day 16', action: 'Email Kidtopia Beijing + Alpha Shanghai', school: 'Multiple', done: false },
      { day: 'Day 17', action: 'Email Nebula Schools Shanghai + JJB Guangzhou', school: 'Multiple', done: false },
      { day: 'Day 18-20', action: 'Run demos for any Qingdao schools that agreed', school: 'QD Schools', done: false },
      { day: 'Day 21', action: 'Follow-up all Tier 3 schools with value drops', school: 'Tier 3', done: false },
      { day: 'Day 22-25', action: 'Chase chain HQ responses — try different contacts if needed', school: 'Chains', done: false },
      { day: 'Day 26-28', action: 'Week 4 review: Pipeline status, adjust next month', school: 'All', done: false },
    ],
  },
];

const SCHOOLS = [
  {
    name: 'HD Qingdao Wanda School',
    chinese: '赫德青岛万达学校',
    tier: 1,
    badge: 'WARM LEAD',
    badgeColor: 'orange',
    city: 'Qingdao',
    website: 'https://www.hdschools.org/en/qingdao',
    contacts: {
      admissions: 'qd.admissions@hdschools.org',
      hr: 'QD.HR@hdschools.org',
      phone: '0532-66029316 / 66029303',
    },
    keyPeople: [
      { name: 'Renee', role: 'KG Director (AMI 3-6)', note: '#1 TARGET — understands Montessori deeply' },
      { name: 'Warren Johnston', role: 'CAO, ELITE K12', note: 'If he buys in, ALL HD schools adopt' },
      { name: 'Mr. Taljaard', role: 'PE Teacher', note: 'Fellow South African — informal bridge' },
    ],
    intel: 'Flagship K-12 bilingual school of ELITE K12 group. Montessori KG with AMI-certified director. You interviewed here — this is a warm re-engagement, not a cold lead. The KG integrates Montessori with British International Curriculum across mixed-age bilingual classrooms.',
    hook: 'Your Montessori KG uses authentic AMI methodology across mixed-age bilingual classrooms — Montree could help track work progression as you scale to your Nanjing campus.',
    painPoints: ['Mixed-age class management at scale', 'Bilingual observation record-keeping', 'Montessori-IPC curriculum integration'],
    email: `Subject: Something I built for my own classroom — thought your KG team might like it

Dear HD Qingdao Kindergarten Leadership,

I hope this finds you well. I visited HD Qingdao recently and came away genuinely impressed by how your kindergarten runs — it's clear Renee and the team care deeply about doing Montessori right.

I'm writing because I built something for my own classroom that turned out better than I expected, and I think your KG team might find it useful.

I'm a Montessori teacher working in a bilingual classroom here in Qingdao. I was struggling with the usual things — tracking each child's progress across hundreds of works on paper, spending my evenings writing reports instead of preparing materials. So I started building a tool to help myself. That tool became Montree.

Then I added an AI advisor — a "Guru" that teachers and parents can talk to about child development, curriculum questions, next steps for a specific child. That part honestly surprised me. It turned out to be far more helpful than I imagined it could be.

People started telling me this could help other schools too, and I realized they might be right. So I've made it available commercially. But here's where I need to be honest with you: it's new. It works well in my classroom, but before any established school should rely on it, it needs to be tested and validated by real teams in real environments.

So I'm offering a full year's free subscription to schools that are willing to try it alongside me — use it with your students, tell me what works, tell me what doesn't, and help me make it into something truly reliable.

I'd love to show Renee and your KG team what it looks like. No pitch, just a walkthrough of what I've built.

I'm also still very interested in contributing to HD Qingdao as a Montessori teacher, and would welcome that conversation too.

Warm regards,
Tredoux
Montessori Educator, Qingdao
montree.xyz`,
    wechatMsg: `Hi! Fellow South African here — saw you're at HD Qingdao. Small world! I'm a Montessori teacher in the area. I built a classroom tool for myself that's turned into something bigger (montree.xyz) — would love to show it to the KG team. Any chance you could point me to the right person? Also just great to know there's another SA in Qingdao 🇿🇦`,
    followUp: `Subject: Quick follow-up — and a resource for your KG team either way

Hi there,

Following up on my earlier note. I put together a Montessori Curriculum Mapping Guide that your bilingual KG team might find useful regardless of whether Montree interests you — it covers how the five areas can be tracked across your age groups.

[Attach: Curriculum alignment PDF]

If you'd like to see the tool itself, I'm happy to do a quick walkthrough whenever works for you. No pressure at all.

Best,
Tredoux`,
  },
  {
    name: 'Qingdao Amerasia International School',
    chinese: '青岛美亚国际学校',
    tier: 1,
    badge: 'FLAGSHIP TARGET',
    badgeColor: 'blue',
    city: 'Qingdao',
    website: 'https://www.qingdaoamerasia.org',
    contacts: {
      admissions: 'Contact via website',
      phone: 'Via website',
    },
    keyPeople: [
      { name: 'Christopher Vicari', role: 'CEO, Baishan Education Group (Ed.D.)', note: 'Founded the group — strategic decision maker' },
    ],
    intel: 'Asia\'s only AMS-accredited school (Toddler + Early Childhood). Also first IB World School in Shandong. 400+ students from 50+ countries. 75% of staff have Master\'s degrees. Part of Baishan Education Group (which also runs Baishan School and a Montessori Teacher Institute).',
    hook: 'QAIS is Asia\'s only AMS-accredited Montessori school — with 400+ students from 50+ nationalities, a unified observation system could replace scattered paper records across your mixed-age early childhood program.',
    painPoints: ['Tracking multilingual observations across 50+ nationalities', 'Montessori-IB curriculum alignment documentation', 'Teacher collaboration across departments'],
    email: `Subject: A classroom tool I built — would love QAIS's perspective on it

Dear Early Childhood Leadership,

I'm a Montessori teacher working in a bilingual classroom here in Qingdao. I know QAIS holds AMS accreditation for both your Toddler and Early Childhood programs — that kind of commitment to authentic practice is rare, and it's why I wanted to reach out to you specifically.

A while back I started building a tool to help me in my own classroom — tracking children's progress, managing the curriculum, generating reports. It started simple but it grew. I added an AI advisor that teachers and parents can consult about child development and next steps for individual children. That part turned out to be remarkably good — better than I ever expected.

The tool is called Montree. I've realized it could genuinely help other schools, so I've made it commercially available. But I want to be straightforward: it's early. It works well for me, but it hasn't been tested across different school environments yet. Before any school should depend on it, it needs real validation.

So I'm offering a free year to schools willing to be testing partners — use it with your team, give me honest feedback, and help me build something that lives up to the standard schools like QAIS set.

I'd love to show you what I've built. I'm local and happy to visit in person, or we can do a video call — whatever's easier.

Warm regards,
Tredoux
Montessori Educator, Qingdao
montree.xyz`,
  },
  {
    name: 'Qingdao Hongwen Montessori',
    chinese: '宏文蒙特梭利幼儿园青岛',
    tier: 1,
    badge: '2 CAMPUSES',
    badgeColor: 'green',
    city: 'Qingdao',
    website: 'https://en.hongwenfeh.com/',
    contacts: {
      admissions: 'Search: 宏文蒙特梭利 青岛',
    },
    intel: 'Part of Hongwen Education Group (Far East Horizon subsidiary) with 10+ campuses across China. Qingdao has Laoshan + Shibei campuses. Small-class bilingual teaching with mixed-age Montessori groupings. Winning this local campus could open the door to all 10+ locations.',
    hook: 'Your Hongwen Montessori operates 10+ campuses with mixed-age bilingual classrooms — a unified tracking platform could help your curriculum teams stay aligned from Shanghai to Qingdao.',
    painPoints: ['Multi-campus curriculum standardization', 'Mixed-age work tracking across 10+ locations', 'Teacher training consistency'],
    email: `Subject: Something I built for my classroom — might be useful across your campuses

Dear Hongwen Montessori Qingdao Team,

I'm a Montessori teacher working in a bilingual classroom here in China. I built a tool for my own classroom to help me track children's progress and manage the curriculum — the kind of thing I wished existed but couldn't find anywhere.

It turned out better than I expected. Then I added an AI advisor that helps teachers and parents with child development questions, and that turned out to be something I genuinely rely on now. The tool is called Montree.

I know Hongwen runs authentic Montessori classrooms across multiple campuses, which is something I really respect. It also made me think — if this tool is helpful for one classroom, it could be even more useful for keeping things consistent across locations.

I'll be honest: Montree is new. It works well for me, but it needs to be tested in different environments before schools should depend on it. I'm looking for partners who'd be willing to try it for a year — completely free — and help me validate it through real use.

Would your campus director be open to taking a look? I'd love to just show you what I've built and get your honest reaction.

Best,
Tredoux
montree.xyz`,
  },
  {
    name: 'Etonkids International Education Group',
    chinese: '伊顿国际教育集团',
    tier: 2,
    badge: '~60 CAMPUSES',
    badgeColor: 'yellow',
    city: 'Beijing (HQ)',
    website: 'https://www.etonkids.com',
    contacts: {
      linkedin: 'Search "Etonkids" — find curriculum/education leadership',
    },
    keyPeople: [
      { name: 'Vivien Wang', role: 'Chairman/CEO', note: 'Harvard + Northwestern alumna — strategic leader' },
    ],
    intel: 'China\'s largest Montessori chain. 60+ campuses across 17 cities + Sydney. 200,000+ families served since 2002. Three brands (International, Bilingual, Huizhi). Founded by Harvard and Northwestern alumni. This is the whale — one deal could mean 60 schools.',
    hook: 'Etonkids manages 60+ Montessori kindergartens across 17 Chinese cities — at that scale, ensuring observation consistency and curriculum tracking must require enormous coordination. What if there was a single platform for all of it?',
    painPoints: ['Managing observations across 60+ campuses', 'Standardizing Montessori practice quality at scale', 'Teacher training consistency across 17 cities'],
    email: `Subject: A classroom tool that outgrew my classroom — thought Etonkids might want to see it

Dear Etonkids Education Leadership,

I'm a Montessori teacher working in a bilingual classroom in China. I want to share something with you, and I want to be genuine about where it is.

I built a tool called Montree to help me in my own classroom — tracking each child's progress across the curriculum, managing observations, generating parent reports. It started as a personal project. Then I added an AI advisor that helps with child development questions and curriculum guidance, and that feature turned out to be far better than I could have imagined.

People around me started saying this could help other schools. I realized they were right — especially for organizations like Etonkids that run Montessori classrooms across many locations. The consistency challenge at your scale must be enormous.

So I've made Montree commercially available. But I want to be upfront: it's early. It works well in my classroom, but a tool like this needs to be tested and validated across different environments before any established school should depend on it.

That's why I'm reaching out. I'm offering a full year's free subscription to schools willing to be testing partners. Use it with a classroom, tell me what works and what doesn't, and help me make it into something that could genuinely serve Montessori education at scale.

I'd be grateful for 20 minutes to show you what I've built. Even if Etonkids isn't the right fit right now, I'd value your perspective.

Respectfully,
Tredoux
Montessori Educator
montree.xyz`,
  },
  {
    name: 'MSB Beijing',
    chinese: '北京蒙台梭利国际学校',
    tier: 3,
    badge: 'OLDEST IN CHINA',
    badgeColor: 'purple',
    city: 'Beijing',
    website: 'https://msb.edu.cn',
    intel: 'China\'s first Montessori school (1990). Started as 10 children at the Norwegian Embassy. Now serves 400+ students ages 0-18 from 40+ nationalities — Asia\'s only Montessori school spanning the full age range. AMS affiliate, pursuing IB accreditation.',
    hook: 'MSB pioneered Montessori in China 35 years ago. With 400+ students across 0-18 and 40+ nationalities, digital tracking could replace the paper records that have grown increasingly complex as you\'ve scaled.',
    painPoints: ['Managing observation systems across 0-18 age span', 'IB-Montessori alignment documentation', 'Multilingual progress tracking for 40+ nationalities'],
    email: `Subject: Something I built for my classroom — would be honored to get MSB's take

Dear MSB Leadership,

I know MSB's story — from 10 children at the Norwegian Embassy in 1990 to where you are today. There's something humbling about writing to the school that started Montessori in China, so I'll keep this honest.

I'm a Montessori teacher working in a bilingual classroom. I built a tool for myself because I was drowning in paper tracking and spending my evenings writing reports instead of preparing materials. That tool grew into something called Montree — it tracks children's progress across the full curriculum, helps with observation management, and generates bilingual reports.

Then I built an AI advisor into it — something teachers and parents can talk to about child development, curriculum questions, what to present next. That part genuinely surprised me. It turned out to be the most useful thing I've ever made.

I've realized this could help other schools, so I'm making it available. But I need to be honest: it's new. It works well in my environment, but it hasn't been tested across different schools yet. Before anyone should rely on it, it needs real-world validation.

I'm looking for schools willing to try it for a year — completely free — in exchange for honest feedback. Given MSB's depth of experience, your team's perspective would mean a great deal to me.

I'd be honored to show you what I've built, whenever it's convenient.

With respect,
Tredoux
montree.xyz`,
  },
  {
    name: 'Nebula Schools Shanghai',
    chinese: '星云学校（原蒙特梭利学校）',
    tier: 3,
    badge: 'AMS + MSA ACCREDITED',
    badgeColor: 'blue',
    city: 'Shanghai',
    website: 'https://www.nebulaschool.com',
    intel: 'Formerly Montessori School of Shanghai (2005). 3 campuses, 500+ students ages 6mo-6yr. Dual AMS + MSA accreditation. Also houses Trinity Montessori Education Center (TMEC) — an AMI teacher training program. Recently rebranded to Nebula Schools.',
    hook: 'Nebula runs both a 500-student Montessori school AND the Trinity teacher training center across 3 campuses — a platform handling both student progress and educator development could streamline your dual mission.',
    painPoints: ['Scaling teacher development while managing 500+ students', 'Maintaining AMS-MSA compliance across 3 campuses', 'Coordinating AMI training alongside daily school operations'],
    email: `Subject: A tool I built for my own classroom — thought your team (and trainees) might find it interesting

Dear Nebula Schools Leadership,

I'm a Montessori teacher in a bilingual classroom in China. I built a tool for myself to track children's progress and manage the curriculum — it started as a way to stop drowning in paperwork. Then I added an AI advisor for child development questions, and that part honestly exceeded anything I expected.

The tool is called Montree. I've made it commercially available because people kept telling me it could help other schools. They're probably right — but I want to be upfront about where things stand: it's new, it works well for me, and it needs to be tested in other environments before schools should depend on it.

I know Nebula runs both a school and the Trinity training center. That's part of why I'm writing — I think a tool like this could be useful not just for your teachers managing 3 campuses, but also for showing trainees what systematic curriculum tracking actually looks like in practice.

I'm offering a full year free to schools willing to be testing partners. Use it, break it, tell me what's missing — and help me make it into something the Montessori community can genuinely rely on.

Would your team be open to a quick look?

Best,
Tredoux
montree.xyz`,
  },
];

// ==================== COMPONENTS ====================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="px-3 py-1 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-emerald-600 hover:text-white transition-all"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function BadgeTag({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-500/15 text-orange-400',
    blue: 'bg-blue-500/15 text-blue-400',
    green: 'bg-emerald-500/15 text-emerald-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    purple: 'bg-purple-500/15 text-purple-400',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${colors[color] || colors.green}`}>
      {children}
    </span>
  );
}

// ==================== MAIN PAGE ====================

export default function SalesPlaybookPage() {
  const [tab, setTab] = useState<'schedule' | 'schools' | 'psychology' | 'templates'>('schedule');
  const [tasksDone, setTasksDone] = useState<Record<string, boolean>>({});

  // Load saved progress
  useState(() => {
    try {
      const saved = localStorage.getItem('montree-sales-tasks');
      if (saved) setTasksDone(JSON.parse(saved));
    } catch {}
  });

  const toggleTask = (weekIdx: number, taskIdx: number) => {
    const key = `${weekIdx}-${taskIdx}`;
    const next = { ...tasksDone, [key]: !tasksDone[key] };
    setTasksDone(next);
    try { localStorage.setItem('montree-sales-tasks', JSON.stringify(next)); } catch {}
  };

  const totalTasks = SCHEDULE.reduce((sum, w) => sum + w.tasks.length, 0);
  const doneTasks = Object.values(tasksDone).filter(Boolean).length;

  const TABS = [
    { id: 'schedule', label: '📅 Outreach Schedule', emoji: '📅' },
    { id: 'schools', label: '🏫 School Intel', emoji: '🏫' },
    { id: 'psychology', label: '🧠 Psychology', emoji: '🧠' },
    { id: 'templates', label: '✉️ The Letter', emoji: '✉️' },
  ] as const;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <Link href="/montree/super-admin/marketing" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">
        ← Back to Marketing Hub
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <span>🎯</span> Sales Playbook
        </h1>
        <p className="text-slate-400 mt-1">Personalized outreach for {SCHOOLS.length} target schools • {doneTasks}/{totalTasks} tasks done</p>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== SCHEDULE TAB ===== */}
      {tab === 'schedule' && (
        <div className="space-y-6">
          {SCHEDULE.map((week, wi) => (
            <div key={wi} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 bg-slate-800/80">
                <h2 className="text-lg font-bold text-white">{week.week}</h2>
                <p className="text-emerald-400 text-sm">{week.title}</p>
              </div>
              <div className="divide-y divide-slate-700/50">
                {week.tasks.map((task, ti) => {
                  const key = `${wi}-${ti}`;
                  const done = tasksDone[key];
                  return (
                    <div
                      key={ti}
                      onClick={() => toggleTask(wi, ti)}
                      className={`flex items-start gap-3 p-4 cursor-pointer transition-all hover:bg-slate-700/30 ${done ? 'opacity-50' : ''}`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'
                      }`}>
                        {done && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-500 uppercase">{task.day}</span>
                          <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">{task.school}</span>
                        </div>
                        <p className={`text-sm mt-1 ${done ? 'line-through text-slate-500' : 'text-white'}`}>
                          {task.action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== SCHOOLS TAB ===== */}
      {tab === 'schools' && (
        <div className="space-y-6">
          {[1, 2, 3].map((tier) => (
            <div key={tier}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {tier === 1 ? '🔥 Tier 1 — Qingdao (Contact First)' : tier === 2 ? '⭐ Tier 2 — Chain Headquarters' : '💎 Tier 3 — Major Cities'}
              </h2>
              {SCHOOLS.filter((s) => s.tier === tier).map((school, si) => (
                <SchoolCard key={si} school={school} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ===== PSYCHOLOGY TAB ===== */}
      {tab === 'psychology' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">The Honest Approach — 6 Reminders</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: '1. You\'re a Teacher, Not a Salesman', desc: "You built this because you needed it. That's your most powerful truth. Don't dress it up — just tell the story of why you made it." },
                { title: '2. Tell Your Real Story', desc: 'Built it for yourself → Guru turned out amazing → realized it could help others → made it available → but it needs testing. That sequence IS the pitch.' },
                { title: '3. Be Honest About Where It Is', desc: "It's new. It works for you. It hasn't been battle-tested across different schools. Say that upfront — people respect transparency more than polish." },
                { title: '4. A Year Free Is Generous, Not Desperate', desc: "You're asking them to help you build something great. Frame it as partnership, not charity. Their feedback is the payment." },
                { title: '5. Give Value Regardless', desc: 'Send curriculum resources, guides, printables — things that help them even if they never use Montree. Generosity builds trust.' },
                { title: '6. Let the Tool Speak for Itself', desc: "If you can get 15 minutes to show it, the product does the rest. Focus on getting the walkthrough, not on convincing them in the email." },
              ].map((p, i) => (
                <div key={i} className="bg-slate-700/50 rounded-lg p-4 border-l-4 border-emerald-500">
                  <h3 className="text-white font-semibold text-sm">{p.title}</h3>
                  <p className="text-slate-400 text-sm mt-1">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Who Makes the Decision?</h2>
            <div className="space-y-3">
              {[
                { role: 'KG Director / Head of Early Years', cares: 'Curriculum quality, teacher workload, Montessori authenticity', angle: 'Lead with curriculum depth. This person GETS Montessori.' },
                { role: 'Principal / Head of School', cares: 'Reputation, parent retention, measurable outcomes', angle: 'Lead with data: reports, parent portal, standardization.' },
                { role: 'Owner / Board', cares: 'Cost, scalability, competitive advantage', angle: '"The only school in the city with AI-powered Montessori tracking."' },
              ].map((r, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                  <h3 className="text-emerald-400 font-semibold text-sm">{r.role}</h3>
                  <p className="text-slate-400 text-xs mt-1"><strong className="text-slate-300">Cares about:</strong> {r.cares}</p>
                  <p className="text-slate-400 text-xs mt-1"><strong className="text-slate-300">Your angle:</strong> {r.angle}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-400 text-sm font-semibold">Always reach out to the KG Director first. They understand Montessori and can tell immediately if this is useful. If they see the value, they'll bring it to leadership themselves.</p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">5-Touch Sequence</h2>
            <div className="space-y-4 border-l-2 border-slate-600 ml-3 pl-6">
              {[
                { touch: 'Touch 1: Honest Introduction', day: 'Day 1', desc: 'Personalized email telling your real story — built it for yourself, it outgrew your classroom, looking for testing partners.' },
                { touch: 'Touch 2: Give Something Useful', day: '+3 days', desc: 'Send a curriculum checklist, printable, or observation template. Helpful whether they use Montree or not.' },
                { touch: 'Touch 3: Personal Connect', day: '+5 days', desc: 'Connect on WeChat or LinkedIn with a short personal message. Teacher to teacher.' },
                { touch: 'Touch 4: Show, Don\'t Tell', day: '+7 days', desc: '"I recorded a 3-min walkthrough — easier to show than explain. No commitment, just thought you might find it interesting."' },
                { touch: 'Touch 5: Gentle Follow-Up', day: '+10 days', desc: '"I know you\'re busy — just wanted to check if you had a chance to look. Either way, the curriculum guide is yours to keep."' },
              ].map((t, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-800" />
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-sm">{t.touch}</h3>
                    <span className="text-xs text-slate-500">{t.day}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Objection Handling</h2>
            <div className="space-y-3">
              {[
                { obj: '"We already use paper tracking"', resp: '"So did I — that\'s literally why I built this. I\'m not asking you to change your approach, just wondering if you\'d be willing to try a digital version alongside it and tell me if it actually saves time."' },
                { obj: '"We can\'t afford new technology"', resp: '"Totally understand. That\'s actually why I\'m offering a full year free — I need testing partners more than I need revenue right now. There\'s genuinely no cost and no catch."' },
                { obj: '"Our teachers aren\'t tech-savvy"', resp: '"Mine aren\'t either, honestly. If they can use WeChat, they can use this. But that\'s exactly the kind of feedback I need — if your teachers struggle with it, I need to know so I can make it simpler."' },
                { obj: '"We need to discuss internally"', resp: '"Of course. I can put together a short overview for your team, or record a 3-minute walkthrough if that\'s easier to share around. No rush at all."' },
              ].map((o, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                  <p className="text-orange-400 text-sm font-semibold">{o.obj}</p>
                  <p className="text-slate-300 text-sm mt-2">{o.resp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== MASTER LETTER TAB ===== */}
      {tab === 'templates' && (() => {
        const masterLetter = `Hi,

My name is Tredoux, and I'm a Montessori teacher who started building a system to help manage my classroom. What I built ended up surpassing my every expectation.

However, it hasn't been properly tested and validated yet, so I can't ask any school to take the system on — not in good conscience.

This is one of those early adopter moments. No one really knows what it is yet, but once it takes off, everyone will be asking themselves why it wasn't done earlier.

The software is AI-driven. It has read all of Montessori's original books, which gives it a stunningly clear, pure and grounded Montessori thinking system to support teachers, parents and principals.

I believe it's the first AI-driven Montessori management system, and it genuinely changes what's possible.

It gives the principal the ability to answer any question a parent might have about their child — on the spot, accurately — without even needing to speak to the teacher first.

It gives teachers the equivalent of having the most experienced and qualified Montessori expert you could imagine walking with them hand in hand throughout the day, every day.

It provides parents with personal updates on their children, complete with beautiful visuals and carefully written explanations of what their child is doing and why it matters. The writing never sounds generic — I made sure of that.

It has also absorbed the major developmental and behavioral psychology theorists, which means it offers real behavioral expertise at the touch of a button. No more needing to bring in outside specialists for every difficult situation.

It's a powerful system. In my classroom, it works like a charm. But like the first large commercial plane to take flight, it needs to be tested and validated before anyone is willing to climb aboard.

So I'm running a pilot program. I'll be offering five schools a full year of free use should they decide to adopt the system.

After careful consideration, your school was selected as one of the top six leading Montessori schools in China. As I'm based here, I'm reaching out to local schools first.

The system is also fully bilingual — 100% English/Chinese interchangeable — to help with the language barrier.

Thank you so much for taking the time to read this. I'm really looking forward to hearing from you.

Kindest regards,
Tredoux Willemse
montree.xyz`;
        return (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">The Letter</h2>
                <p className="text-slate-400 text-xs mt-1">Universal outreach — send to any Montessori school</p>
              </div>
              <CopyButton text={masterLetter} />
            </div>
            <div className="p-6">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">{masterLetter}</pre>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Personalization Notes</h3>
            <p className="text-slate-500 text-sm">Swap "your school was selected as one of the top six leading Montessori schools in China" with school-specific language when needed. See the School Intel tab for details on each school. The rest of the letter stays exactly as written.</p>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

// ===== School Card Component =====

function SchoolCard({ school }: { school: typeof SCHOOLS[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 mb-4 overflow-hidden">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer hover:bg-slate-700/30 transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-bold">{school.name}</h3>
              <BadgeTag color={school.badgeColor}>{school.badge}</BadgeTag>
            </div>
            <p className="text-slate-500 text-xs mt-1">{school.chinese} • {school.city}</p>
          </div>
          <span className="text-slate-500 text-lg">{expanded ? '▾' : '▸'}</span>
        </div>
        <p className="text-slate-400 text-sm mt-2">{school.hook}</p>
      </div>

      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-4">
          {/* Intel */}
          <div>
            <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-2">Intelligence</h4>
            <p className="text-slate-300 text-sm">{school.intel}</p>
          </div>

          {/* Pain Points */}
          {school.painPoints && (
            <div>
              <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-2">Pain Points</h4>
              <div className="flex flex-wrap gap-2">
                {school.painPoints.map((p, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded-full">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          {school.contacts && (
            <div>
              <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-2">Contacts</h4>
              <div className="grid grid-cols-[100px_1fr] gap-1 text-sm">
                {Object.entries(school.contacts).map(([k, v]) => (
                  <div key={k} className="contents">
                    <span className="text-slate-500 capitalize">{k}</span>
                    <span className="text-slate-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key People */}
          {school.keyPeople && (
            <div>
              <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-2">Key People</h4>
              {school.keyPeople.map((p, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">{p.name}</span>
                    <span className="text-slate-400 text-xs">— {p.role}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">{p.note}</p>
                </div>
              ))}
            </div>
          )}

          {/* Website */}
          {school.website && (
            <div>
              <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-sm hover:underline">
                {school.website} →
              </a>
            </div>
          )}

          {/* Email */}
          {school.email && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">Personalized Email</h4>
                <CopyButton text={school.email} />
              </div>
              <pre className="bg-slate-900/50 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans border border-slate-700">
                {school.email}
              </pre>
            </div>
          )}

          {/* WeChat */}
          {school.wechatMsg && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wide">WeChat Message</h4>
                <CopyButton text={school.wechatMsg} />
              </div>
              <pre className="bg-slate-900/50 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans border border-slate-700">
                {school.wechatMsg}
              </pre>
            </div>
          )}

          {/* Follow-up */}
          {school.followUp && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-orange-400 text-xs font-semibold uppercase tracking-wide">Follow-up (if no reply in 5 days)</h4>
                <CopyButton text={school.followUp} />
              </div>
              <pre className="bg-slate-900/50 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans border border-slate-700">
                {school.followUp}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
