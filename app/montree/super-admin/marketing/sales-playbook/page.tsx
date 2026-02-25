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
      { day: 'Day 11', action: 'Demo offer emails to all Qingdao schools that opened/read emails', school: 'QD Schools', done: false },
      { day: 'Day 12', action: 'Direct ask to HD Qingdao — "selecting 5 pilot schools"', school: 'HD Qingdao', done: false },
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
    email: `Subject: Montessori Curriculum Technology — Partnership for HD Qingdao Kindergarten

Dear HD Qingdao Kindergarten Leadership,

I hope this finds you well. I'm reaching out as a Montessori educator based in the Qingdao region — I had the pleasure of visiting HD Qingdao recently and was genuinely impressed by how deeply your kindergarten integrates authentic Montessori methodology with your bilingual curriculum.

I've been building something I think your KG team would find useful: Montree — a digital curriculum and progress tracking platform designed for bilingual Montessori classrooms like yours.

As a working Montessori teacher in a bilingual environment, I built it to solve problems I face every day:
— Tracking each child's journey across 316 Montessori works is overwhelming on paper
— New teachers struggle with the correct presentation sequence
— Parents want to see their child's Montessori journey, but writing reports takes hours
— Keeping curriculum delivery consistent across classrooms requires a shared system

Montree maps the full Montessori curriculum (Practical Life through Cultural), tracks sensitive periods, generates parent-ready reports in English and Chinese, and gives teachers guided recommendations for each child's next work.

I'd love to give Renee and your KG team a quick walkthrough. Happy to set up a free 30-day pilot for one classroom — zero commitment, just try it and see.

I'm also still very interested in contributing to HD Qingdao as a Montessori teacher, and would welcome a conversation about how my skills and this technology could work together.

Warm regards,
Tredoux
AMS-Credentialed Montessori Educator
montree.xyz`,
    wechatMsg: `Hi! Fellow South African here — I saw you're at HD Qingdao. Small world! I'm a Montessori teacher in the area and I've been building a digital curriculum platform for Montessori classrooms (montree.xyz). Would love to connect with the KG team to demo it. Any chance you could point me in the right direction? Also just great to meet another SA in Qingdao 🇿🇦`,
    followUp: `Subject: Quick follow-up — Free Montessori resource for HD Qingdao

Hi there,

Following up on my earlier email about Montree. Rather than just describe it, I've put together a Montessori Curriculum Mapping Guide aligned to your bilingual KG approach — covering how the five areas can be systematically tracked across your age groups.

[Attach: Curriculum alignment PDF]

This is the kind of thing Montree automates for every child, every day. Would 15 minutes work to show you how?

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
    email: `Subject: A tool built by a Montessori teacher, for the only AMS-accredited school in Asia

Dear Early Childhood Leadership,

QAIS holds a distinction no other school in Asia has — full AMS accreditation for both Toddler and Early Childhood programs. That commitment to authentic Montessori practice is exactly why I'm writing.

I'm an AMS-credentialed Montessori teacher working in a bilingual classroom in China. I've built Montree — a digital platform that maps all 316 Montessori works, tracks sensitive periods, and generates parent reports in English and Chinese.

With 400+ students from 50+ countries, I imagine your team manages a complex web of observation records across mixed-age classrooms. Montree turns that complexity into a clean dashboard — each child's progress visible at a glance, with guided recommendations for their next work based on their developmental stage.

I'm selecting 5 schools for a free 30-day pilot this semester. Given QAIS's position as Asia's Montessori standard-bearer, you'd be an ideal partner.

Would you be open to a 15-minute walkthrough? I can visit in person or do a video call.

Warm regards,
Tredoux
AMS-Credentialed Montessori Educator
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
    email: `Subject: Keeping Montessori practice consistent across your campuses

Dear Hongwen Montessori Qingdao Team,

Running authentic Montessori classrooms across multiple campuses is something very few organizations in China do as well as Hongwen. The challenge — and I say this from experience — is making sure the quality of observation and curriculum delivery stays consistent when you have teams in different cities.

I'm a Montessori teacher who built Montree to solve exactly this. It's a digital platform that gives every teacher the same curriculum framework (316 works, all five areas), tracks each child's progress in real-time, and lets campus directors see how curriculum delivery looks across classrooms.

For your Qingdao campuses, I'd love to offer a free 30-day trial. Your teachers try it with one classroom — if it doesn't save them time and improve consistency, you walk away.

Would your campus director be open to a quick look?

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
    email: `Subject: Montessori curriculum consistency across 60+ campuses — a digital solution

Dear Etonkids Education Leadership,

Managing authentic Montessori practice across 60+ campuses in 17 cities is something no other organization in China has attempted at your scale. The question every multi-campus Montessori operator faces: how do you ensure every classroom delivers consistent, quality experiences while giving teachers the flexibility the method requires?

I'm a practicing AMS-credentialed Montessori teacher in China, and I've built Montree — a platform designed specifically for this challenge.

Montree provides:
— A standardized curriculum framework (316 works, 11 sensitive periods) shared across all campuses
— Real-time child progress tracking that teachers update with simple taps
— Automated parent reports in both English and Chinese
— A director dashboard showing curriculum delivery across all classrooms
— Guided work recommendations so even newly trained teachers follow proper sequencing

For a group like Etonkids, Montree offers something paper systems never can: visibility across your entire network. You can see which campuses are strong in Practical Life but behind in Sensorial. You can spot training needs before they become parent complaints.

I'd welcome the chance to demonstrate this to your education leadership. Happy to start with a single campus pilot — prove the value before discussing anything broader.

Would a 20-minute video walkthrough work sometime this month?

Respectfully,
Tredoux
AMS-Credentialed Montessori Educator
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
    email: `Subject: Digital tools for the school that started Montessori in China

Dear MSB Leadership,

There's something special about writing to the school that brought Montessori to China. From 10 children at the Norwegian Embassy in 1990 to 400+ students across ages 0-18 — MSB's journey is the story of Montessori in this country.

I'm a Montessori teacher who has built Montree, a digital platform that I think your team would find genuinely useful. It maps all 316 Montessori works, tracks each child's progress and sensitive periods, and generates parent reports in English and Chinese.

With MSB's unique position serving 40+ nationalities from toddlers through teenagers, the observation and tracking workload must be immense. Montree is designed to make that lighter — teachers track with taps instead of paperwork, and directors get real-time visibility across classrooms.

I'd be honored to show your team how it works. Free 30-day pilot, one classroom, zero commitment.

With great respect,
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
    email: `Subject: A platform built for schools that also train teachers

Dear Nebula Schools Leadership,

Running 3 Montessori campuses with 500+ students while simultaneously operating the Trinity Montessori Education Center is a rare dual mission. Not many organizations manage both the practice and the training of Montessori education.

I'm a Montessori teacher who built Montree — a curriculum and progress tracking platform. For Nebula, I think the value is particularly strong: your school needs consistent observation tracking across 3 campuses, and your training center needs to demonstrate authentic Montessori practice to trainees.

Montree maps all 316 works, tracks sensitive periods, and gives directors real-time visibility. It's the kind of tool that shows trainees what systematic curriculum tracking looks like in practice.

Would your team be open to a brief walkthrough? I'm offering a free 30-day pilot.

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
    { id: 'templates', label: '✉️ Templates', emoji: '✉️' },
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
            <h2 className="text-xl font-bold text-white mb-4">The 6 Psychological Principles</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: '1. Authority + Insider Status', desc: "You're not a salesman — you're an AMS-trained Montessori teacher who built this because you needed it. Every email leads with this." },
                { title: '2. Pain-First, Not Feature-First', desc: 'Never lead with what Montree does. Lead with the pain: hours lost to paper tracking, inconsistent curriculum, parents wanting visibility.' },
                { title: '3. Social Proof (Pre-Revenue)', desc: "You have 316 works mapped, 11 sensitive periods coded, a working demo. Frame it: 'built in a real classroom with real children.'" },
                { title: '4. Free Pilot = Zero Risk', desc: 'Once teachers use it for 30 days, switching back to paper feels like regression. The tool sells itself.' },
                { title: '5. Reciprocity Through Value', desc: 'Before asking for anything, give something useful: a curriculum guide, a printable. Creates obligation to reciprocate.' },
                { title: '6. Urgency Without Pressure', desc: "\"We're onboarding our first 5 partner schools this semester.\" Real, believable, motivating." },
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
              <p className="text-orange-400 text-sm font-semibold">Always contact the KG Director first. They're your internal champion. If they love it, they sell it upward for you.</p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">5-Touch Sequence</h2>
            <div className="space-y-4 border-l-2 border-slate-600 ml-3 pl-6">
              {[
                { touch: 'Touch 1: Warm Intro', day: 'Day 1', desc: 'Personalized email referencing something specific about their school.' },
                { touch: 'Touch 2: Value Drop', day: '+3 days', desc: 'Send something genuinely useful: curriculum checklist, printable, observation template.' },
                { touch: 'Touch 3: WeChat Connect', day: '+5 days', desc: 'Connect on WeChat or LinkedIn with a personal message referencing your email.' },
                { touch: 'Touch 4: Demo Offer', day: '+7 days', desc: '"I recorded a 3-min walkthrough of how your curriculum would look in Montree."' },
                { touch: 'Touch 5: Direct Ask', day: '+10 days', desc: '"I\'m selecting 5 schools for a free pilot. Can we schedule 15 minutes?"' },
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
                { obj: '"We already use paper tracking"', resp: '"That\'s exactly why I built Montree — I was drowning in paper too. It doesn\'t replace your method, it digitizes it. Would a side-by-side comparison help?"' },
                { obj: '"We can\'t afford new technology"', resp: '"That\'s why the pilot is free — 30 days, zero commitment. If it doesn\'t save 5 hours/week, walk away. The question isn\'t cost — it\'s whether you can afford to keep losing those hours."' },
                { obj: '"Our teachers aren\'t tech-savvy"', resp: '"If they can use WeChat, they can use Montree. It\'s tap-based, and I provide onboarding training in both Chinese and English."' },
                { obj: '"We need to discuss internally"', resp: '"Absolutely. Want me to put together an overview document for your team? I can also record a 3-min walkthrough customized for your school."' },
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

      {/* ===== TEMPLATES TAB ===== */}
      {tab === 'templates' && (
        <div className="space-y-6">
          {[
            {
              title: 'Template A: Pure Montessori Schools',
              use: 'AMI/AMS certified schools — Hongwen, Alpha, Amber, Kidtopia, MSB, etc.',
              body: `Subject: A digital tool built by a Montessori teacher, for Montessori classrooms

Dear [KG Director / Head of Early Years],

I'm an AMS-credentialed Montessori teacher working with 2-6 year olds in a bilingual classroom in China. I'm reaching out because I've built something I think your team at [School Name] would find genuinely useful.

Montree is a curriculum and progress tracking platform built specifically for Montessori classrooms. It maps all 316 works across the five areas, tracks each child's sensitive periods, and generates parent-ready reports — in both English and Chinese.

I built it because I was spending hours every week on paper tracking and handwritten reports. What I ended up creating goes further — it provides guided curriculum recommendations for each child based on their developmental stage.

I'm selecting 5 schools for a free 30-day pilot this term. Given [School Name]'s commitment to authentic Montessori practice, I think you'd be an ideal fit.

Would you be open to a 15-minute walkthrough?

Warm regards,
Tredoux
montree.xyz`,
            },
            {
              title: 'Template B: Chain Headquarters',
              use: 'Etonkids, Hongwen Group, MAIS, HD Schools — one deal = many campuses',
              body: `Subject: Montessori curriculum consistency across [X] campuses

Dear [Curriculum Director / Head of Education],

Managing Montessori curriculum quality across [number] campuses presents a unique challenge: how do you ensure consistent, authentic experiences while giving teachers the flexibility the method requires?

I'm an AMS-credentialed Montessori teacher in China, and I've built Montree — a platform that solves exactly this.

Montree provides:
— A standardized curriculum framework (316 works, 11 sensitive periods) across all campuses
— Real-time child progress tracking
— Automated parent reports in English and Chinese
— A director dashboard showing curriculum delivery across all classrooms
— Guided recommendations so even new teachers follow proper sequencing

For [Group Name], Montree offers visibility paper systems never can: which campuses are strong in Practical Life but behind in Sensorial, where training needs exist before they become parent complaints.

Happy to start with a single-campus pilot. Would [date range] work for a 20-minute walkthrough?

Best regards,
Tredoux
montree.xyz`,
            },
            {
              title: 'Template C: Bilingual K-12 with Montessori KG',
              use: 'HD Schools, international schools where Montessori is the KG approach',
              body: `Subject: Strengthening [School Name]'s Montessori kindergarten

Dear [KG Director / Early Years Coordinator],

Your Montessori KG is one of the things that sets [School Name] apart. Parents choose you partly because of that foundation — which means its quality directly impacts enrollment and retention.

I'm a Montessori educator who built Montree — a platform that makes your Montessori program more visible, more trackable, and more impressive to parents, while saving teachers significant time.

What changes:
— Teachers track progress with taps, not paperwork
— Parents receive detailed reports showing their child's Montessori journey
— Your KG Director gets real-time oversight of every child across all classrooms
— New teachers get guided recommendations instead of guessing the sequence

Free 30-day pilot — one classroom, zero commitment. If it doesn't save time and impress parents, you owe nothing.

Could I schedule a brief walkthrough?

Best,
Tredoux
montree.xyz`,
            },
          ].map((tmpl, i) => (
            <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-white font-bold">{tmpl.title}</h2>
                <p className="text-slate-400 text-xs mt-1">Use for: {tmpl.use}</p>
              </div>
              <div className="p-4 relative">
                <div className="absolute top-2 right-2"><CopyButton text={tmpl.body} /></div>
                <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">{tmpl.body}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
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
