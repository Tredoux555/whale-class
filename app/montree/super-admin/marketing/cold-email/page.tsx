// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================
// COLD EMAIL SEQUENCES — INK MASTER v2.0
// ============================================
// Strategy: Version C (ultra-short) opens the door.
// Version A (objection-handling) closes it.
// Version B (stadium pitch) is for LinkedIn/content.
// ============================================

const EMAILS = {
  touch1: {
    name: 'Touch 1 — The Opener (Version C)',
    subject: '5 Montessori schools — free pilot, honest question',
    timing: 'Day 1 — First contact',
    notes: 'Under 100 words. Ziglar question technique. Prize frame. One-word CTA.',
    body: `[Principal's Name] —

Quick question: how many hours per week do your teachers spend on progress reports and parent updates?

I built a tool that cuts that to about 2 minutes per child. It generates bilingual reports automatically, tracks curriculum progress across all 5 areas, and gives teachers an AI advisor trained on AMI methodology.

I'm giving 5 schools free access through the end of this year in exchange for feedback.

Worth a 3-minute video walkthrough?

Reply "yes" and I'll send it over.

— Tredoux
montree.xyz`,
  },

  touch2: {
    name: 'Touch 2 — The Objection Killer',
    subject: 'Re: 5 Montessori schools — free pilot, honest question',
    timing: 'Day 4 — If no reply to Touch 1',
    notes: 'Voss accusation audit. Handles the 3 objections they\'re thinking but not saying. Same thread (Re:) so it shows context.',
    body: `[Principal's Name] —

I sent a note a few days ago about Montree — figured I'd follow up with the three things you're probably thinking:

"This sounds like another EdTech tool that'll gather dust."
Fair. Most EdTech is built by engineers who've never set foot in a classroom. I built Montree inside mine — I run a Montessori classroom in Qingdao. Every feature exists because a real teacher needed it.

"AI and Montessori don't mix."
I thought that too. Then I watched a teacher ask our AI advisor how to re-engage a 4-year-old who'd lost interest in Practical Life. The response cited Grace and Courtesy exercises cross-referenced with the child's actual progress data. It was what an experienced AMI guide would say — except available at 11pm on a Sunday.

"Free always has strings."
No strings. I'm selecting 5 founding partner schools to use Montree through the end of this academic year. All I ask is honest feedback — what works, what doesn't, what's missing.

If any of that changes things, reply "interested" and I'll send a 3-minute video walkthrough.

No contracts. No credit card. No calls unless you want them.

— Tredoux
montree.xyz`,
  },

  touch3: {
    name: 'Touch 3 — The Value Drop',
    subject: 'Something your teachers might find useful (no pitch)',
    timing: 'Day 8 — If no reply to Touch 2',
    notes: 'Holmes stadium pitch. Pure value, no ask. Positions you as helpful, not salesy. Cialdini reciprocity.',
    body: `[Principal's Name] —

No pitch today — just something I thought your teachers might find useful.

I put together a one-page guide on the 5 most common Montessori documentation bottlenecks and how schools are solving them. It's based on conversations with about 30 teachers across 8 schools.

Quick highlights:
• The "observation pile-up" problem (and the 2-tap fix that cut one teacher's evening work by 70%)
• Why bilingual reports don't need to be twice the work
• The curriculum tracking approach that lets you see a child's full journey in under 10 seconds

Want me to send it over? Just reply "send it" and I'll drop it in your inbox.

— Tredoux`,
  },

  touch4: {
    name: 'Touch 4 — The Breakup',
    subject: 'Should I close your file?',
    timing: 'Day 14 — Final touch',
    notes: 'Voss loss framing. The "breakup email" — highest reply rates in cold email. Scarcity reinforced. Clean exit.',
    body: `[Principal's Name] —

I've reached out a few times about giving your school free access to Montree — the tool that handles Montessori progress tracking, bilingual reports, and AI-powered curriculum guidance.

I haven't heard back, which is totally fine. Principals are busy people.

I'm closing out my founding partner list this week (3 of 5 spots are taken). If this isn't for you, no worries at all — I'll stop emailing.

But if the timing just wasn't right before and you'd like to take a look, reply "still interested" and I'll hold a spot.

Either way, I wish you and your teachers a great rest of the year.

— Tredoux
montree.xyz`,
  },
};

// ============================================
// SCHOOL TARGET LIST
// Pulled from existing Prospect HQ + Sales Playbook
// ============================================
const SCHOOL_TARGETS = [
  // Qingdao — Tier 1 (local)
  { name: 'HD Qingdao Wanda School', chinese: '赫德青岛万达学校', city: 'Qingdao', region: 'china', tier: 1, contact: 'HR + Admissions', email: 'admissions@hdschools.org', notes: 'WARM LEAD — ELITE K12 group, Montessori KG with AMI director. Mr. Taljaard (SA connection).', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'QAIS (Qingdao Amerasia)', chinese: '青岛美亚国际学校', city: 'Qingdao', region: 'china', tier: 1, contact: 'EC Director', email: 'info@qais.org', notes: 'Asia\'s only AMS-accredited school. LinkedIn EC director search.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'Hongwen Montessori QD', chinese: '宏文蒙特梭利青岛', city: 'Qingdao', region: 'china', tier: 1, contact: 'Both campuses', email: '—', notes: 'Both Qingdao campuses. Hongwen Group HQ in Shanghai.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'Baishan School', chinese: '白珊学校', city: 'Qingdao', region: 'china', tier: 2, contact: 'Website contact', email: '—', notes: 'Qingdao local.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'Weiming KG West Coast', chinese: '为明幼儿园', city: 'Qingdao', region: 'china', tier: 2, contact: 'Website contact', email: '—', notes: 'Qingdao local.', sent: { t1: false, t2: false, t3: false, t4: false } },

  // Beijing / Shanghai — Tier 2
  { name: 'MSB Beijing', chinese: '北京蒙特梭利国际学校', city: 'Beijing', region: 'china', tier: 1, contact: 'Admissions', email: 'admissions@msb.edu.cn', notes: 'Longest-running Montessori in China. 400 students, 21 countries. AMS member.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'Etonkids HQ', chinese: '伊顿国际教育', city: 'Beijing', region: 'china', tier: 1, contact: 'HQ Chain Pitch', email: '—', notes: '20+ campuses. Chain — if one adopts, all could follow. Template B.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'Kidtopia (AMI Training)', chinese: '', city: 'Beijing', region: 'china', tier: 1, contact: 'Director', email: '—', notes: 'AMI training center. Get trainers on board = every graduate learns Montree.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'Blossom Montessori', chinese: '', city: 'Beijing', region: 'china', tier: 2, contact: 'Founder', email: '—', notes: 'Small bilingual EN/CN. Easier meeting with founder.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'BIBA (Beijing International Bilingual Academy)', chinese: '', city: 'Beijing', region: 'china', tier: 2, contact: 'EY Head', email: 'admissions@bibachina.org', notes: 'EY uses Montessori with IB PYP. ~500 students.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'Hongwen Group HQ', chinese: '宏文教育集团', city: 'Shanghai', region: 'china', tier: 1, contact: 'HQ Chain Pitch', email: '—', notes: 'Parent company of all Hongwen campuses. Template B.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'Nebula Schools Shanghai', chinese: '', city: 'Shanghai', region: 'china', tier: 2, contact: 'Admissions', email: '—', notes: 'Shanghai target.', sent: { t1: false, t2: false, t3: false, t4: false } },

  // Hong Kong
  { name: 'Guidepost Montessori HK', chinese: '', city: 'Hong Kong', region: 'china', tier: 1, contact: 'HQ', email: '—', notes: '11 campuses in HK. Network school — if one adopts, all follow. AMI affiliated.', sent: { t1: false, t2: false, t3: false, t4: false } },

  // South Africa — Tier 2
  { name: 'Village Montessori School', chinese: '', city: 'SA', region: 'sa', tier: 2, contact: 'Principal', email: '—', notes: 'SAMA member. Your SA story resonates strongest here.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'MELF (Montessori Education Learning Foundation)', chinese: '', city: 'National SA', region: 'sa', tier: 1, contact: 'Director', email: '—', notes: 'National training center. 20 years. If MELF teaches Montree = becomes standard.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'SAMA (South African Montessori Association)', chinese: '', city: 'National SA', region: 'sa', tier: 1, contact: 'Board', email: '—', notes: 'Association endorsement = instant credibility with every member school.', sent: { t1: false, t2: false, t3: false, t4: false } },
  { name: 'Montessori Academy & College SA', chinese: '', city: 'SA', region: 'sa', tier: 1, contact: 'Director', email: '—', notes: 'Training institution. Same strategy as Kidtopia.', sent: { t1: false, t2: false, t3: false, t4: false } },
];

// ============================================
// COMPONENT
// ============================================
export default function ColdEmailPage() {
  const [activeEmail, setActiveEmail] = useState('touch1');
  const [copied, setCopied] = useState('');
  const [schools, setSchools] = useState(SCHOOL_TARGETS);
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterTier, setFilterTier] = useState('all');

  // Load checkbox state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('montree_cold_email_sent');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSchools(prev => prev.map(s => ({
          ...s,
          sent: parsed[s.name] || s.sent,
        })));
      } catch {}
    }
  }, []);

  const toggleSent = (schoolName, touch) => {
    setSchools(prev => {
      const updated = prev.map(s =>
        s.name === schoolName
          ? { ...s, sent: { ...s.sent, [touch]: !s.sent[touch] } }
          : s
      );
      // Persist
      const toSave = {};
      updated.forEach(s => { toSave[s.name] = s.sent; });
      localStorage.setItem('montree_cold_email_sent', JSON.stringify(toSave));
      return updated;
    });
  };

  const copyEmail = (key) => {
    const email = EMAILS[key];
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const filteredSchools = schools.filter(s => {
    if (filterRegion !== 'all' && s.region !== filterRegion) return false;
    if (filterTier !== 'all' && s.tier !== Number(filterTier)) return false;
    return true;
  });

  const emailKeys = Object.keys(EMAILS);
  const currentEmail = EMAILS[activeEmail];

  // Stats
  const totalSent = schools.reduce((acc, s) => acc + (s.sent.t1 ? 1 : 0), 0);
  const totalReplied = 0; // Manual tracking — update as replies come in

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/montree/super-admin/marketing" className="text-slate-400 hover:text-white transition-colors text-sm">
          ← Marketing Hub
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span>✉️</span> Cold Email HQ
        </h1>
        <p className="text-slate-400 mt-2">
          4-touch sequence by The Ink Master. C opens the door, A closes it.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
          <div className="text-3xl font-bold text-emerald-400">{totalSent}</div>
          <div className="text-slate-400 text-sm">Touch 1 Sent</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
          <div className="text-3xl font-bold text-amber-400">{schools.length}</div>
          <div className="text-slate-400 text-sm">Total Targets</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
          <div className="text-3xl font-bold text-blue-400">{schools.filter(s => s.tier === 1).length}</div>
          <div className="text-slate-400 text-sm">Tier 1 (Priority)</div>
        </div>
      </div>

      {/* ======== EMAIL SEQUENCE SECTION ======== */}
      <div className="mb-12">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          📧 THE 4-TOUCH SEQUENCE
        </h2>

        {/* Email tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {emailKeys.map((key, i) => (
            <button
              key={key}
              onClick={() => setActiveEmail(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeEmail === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              Touch {i + 1}
            </button>
          ))}
        </div>

        {/* Current email display */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">{currentEmail.name}</h3>
              <p className="text-slate-400 text-sm mt-1">{currentEmail.timing}</p>
            </div>
            <button
              onClick={() => copyEmail(activeEmail)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                copied === activeEmail
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {copied === activeEmail ? '✓ Copied!' : 'Copy Email'}
            </button>
          </div>

          {/* Strategy note */}
          <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700">
            <p className="text-amber-400 text-xs font-medium">
              💡 {currentEmail.notes}
            </p>
          </div>

          {/* Subject */}
          <div className="px-4 py-3 border-b border-slate-700">
            <span className="text-slate-500 text-sm">Subject: </span>
            <span className="text-white text-sm font-medium">{currentEmail.subject}</span>
          </div>

          {/* Body */}
          <div className="p-4">
            <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {currentEmail.body}
            </pre>
          </div>
        </div>
      </div>

      {/* ======== SCHOOL TARGET LIST ======== */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          🎯 SCHOOL TARGETS — SEND TRACKER
        </h2>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="bg-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 border border-slate-700"
          >
            <option value="all">All Regions</option>
            <option value="china">🇨🇳 China</option>
            <option value="sa">🇿🇦 South Africa</option>
          </select>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="bg-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 border border-slate-700"
          >
            <option value="all">All Tiers</option>
            <option value="1">Tier 1 (Priority)</option>
            <option value="2">Tier 2</option>
          </select>
        </div>

        {/* School cards */}
        <div className="space-y-3">
          {filteredSchools.map((school) => (
            <div
              key={school.name}
              className={`bg-slate-800 rounded-xl border p-4 ${
                school.tier === 1 ? 'border-emerald-700/50' : 'border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-semibold">{school.name}</h3>
                    {school.chinese && (
                      <span className="text-slate-500 text-sm">{school.chinese}</span>
                    )}
                    {school.tier === 1 && (
                      <span className="bg-emerald-900/50 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                        PRIORITY
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                    <span>{school.city}</span>
                    {school.email !== '—' && (
                      <span className="text-blue-400">{school.email}</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-1">{school.notes}</p>
                </div>

                {/* Touch checkboxes */}
                <div className="flex gap-2 shrink-0">
                  {['t1', 't2', 't3', 't4'].map((t, i) => (
                    <button
                      key={t}
                      onClick={() => toggleSent(school.name, t)}
                      className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                        school.sent[t]
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                      }`}
                      title={`Touch ${i + 1} ${school.sent[t] ? 'sent' : 'not sent'}`}
                    >
                      T{i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ink Master credit */}
      <div className="mt-12 text-center text-slate-600 text-xs">
        Sequence by The Ink Master — Copywriting Brain v2.0
        <br />
        Schwartz · Kennedy · Collier · Voss · Klaff · Halbert · Sugarman · Hopkins · Bly · Cialdini · Holmes · Ziglar
      </div>
    </div>
  );
}
