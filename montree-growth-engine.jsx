import { useState } from "react";

// ============================================
// MONTREE GROWTH ENGINE
// ============================================

function CopyBtn({ text, label }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
      style={{ background: c ? "rgba(46,204,113,0.2)" : "rgba(46,204,113,0.08)", border: `1px solid ${c ? "rgba(46,204,113,0.4)" : "rgba(46,204,113,0.15)"}`, color: c ? "#2ecc71" : "#8aaa9a" }}>
      {c ? "✓" : label || "📋"}
    </button>
  );
}

// ============================================
// INFLUENCER TARGETS
// ============================================
const INFLUENCERS = [
  { name: "@montessorifromtheheart", platform: "IG", followers: "653K", type: "Macro", niche: "Montessori at home, 0-6 years", approach: "DM her: 'As a fellow Montessori educator, I built a tool that solves the record-keeping problem every guide complains about. Would you be open to trying it or sharing it with your teacher followers?' Offer: free pilot + affiliate deal (she earns per school that signs up through her link).", priority: "🔴" },
  { name: "@ohhappyplayday", platform: "IG", followers: "697K", type: "Macro", niche: "Montessori-inspired play-based learning", approach: "Parent angle: 'Imagine getting a visual progress report showing exactly what your child is working on in every Montessori area. That's what Montree does for parents.' Offer: let her show the parent report to her audience.", priority: "🟡" },
  { name: "@missymontessori", platform: "IG", followers: "41K", type: "Micro", niche: "AMS 3-6 certified teacher, classroom resources", approach: "Teacher-to-teacher: 'I'm a working guide who built this during naptime. Would love your honest feedback.' Micro-influencers convert better than mega ones. She's in the trenches — she'll GET IT.", priority: "🔴" },
  { name: "@trilliummontessori", platform: "IG", followers: "38K+", type: "Micro", niche: "Montessori pro courses & printables", approach: "Professional partnership: 'I think Montree could complement your training courses — teachers learn curriculum while Montree tracks implementation.' She's already monetizing education content.", priority: "🔴" },
  { name: "@mommy.montessori", platform: "IG", followers: "40K", type: "Micro", niche: "Helping parents raise independent learners", approach: "Parent pull: share the parent report feature. 'Your followers would love seeing what a modern Montessori progress report looks like.' She makes content about making Montessori accessible.", priority: "🟡" },
  { name: "@livingmontessorinow", platform: "IG", followers: "40K", type: "Micro", niche: "Affordable Montessori, former teacher, MA Early Childhood", approach: "Academic credibility: she has an MA and was a teacher. Lead with the curriculum mapping (213 works) and AI Guru feature. She'll appreciate the depth.", priority: "🟡" },
  { name: "@angelamomtessori", platform: "IG", followers: "6K", type: "Nano", niche: "AMS certified parent educator, homeschooler, former teacher", approach: "Easy win. Small audience but highly engaged AMS community. Offer free pilot + 'would you review it on your stories?' Nano influencers have highest engagement rates.", priority: "🟢" },
  { name: "@ogretmen.baba", platform: "IG", followers: "2.6M", type: "Mega", niche: "Math teacher, Turkey", approach: "Hail Mary. 2.6M followers. Not pure Montessori but education mega-influencer. If he even mentions Montree once, it's thousands of eyes. Long shot but worth a DM.", priority: "🟢" },
  { name: "@beginnersdigitalmontessori", platform: "IG", followers: "315K", type: "Macro", niche: "Toddler English fluency, digital Montessori", approach: "ESL angle matches YOUR expertise. Lead with: 'Montree was built specifically for bilingual Montessori classrooms — Chinese ESL learners.' The niche overlap is perfect.", priority: "🔴" },
  { name: "Busy Toddler (Susie Allison)", platform: "IG/Blog", followers: "2.4M", type: "Mega", niche: "Former kindergarten teacher, toddler activities", approach: "Dream target. MA in Early Childhood Ed. If she posts about Montree, game changes overnight. Approach via email (professional), not DM. Include the pitch video link.", priority: "🟢" },
];

const INFLUENCER_DM_TEMPLATE = `Hey [Name]! 👋

I'm a working Montessori guide in Beijing and I wanted to reach out because I genuinely respect your content.

I built something I think your audience would find interesting — it's called Montree, and it solves a problem every Montessori teacher knows too well: spending 8+ hours a week on handwritten record-keeping.

Here's the quick version:
📋 One-tap tracking during the work period
📊 Auto-generated parent reports  
🧠 AI curriculum guidance
📱 Works on any device

I'm offering free 3-month pilots to schools and I'd love your honest take on it. Would you be open to checking it out?

Here's a 60-second demo: montree.xyz

No pressure at all — just thought it might resonate with your community! 🌳`;

// ============================================
// CONFERENCE PROPOSALS
// ============================================
const CONFERENCES = [
  {
    name: "AMS Annual Conference",
    org: "American Montessori Society",
    typical: "March (varies)",
    attendees: "4,000+",
    url: "amshq.org",
    deadline: "Usually September for following year",
  },
  {
    name: "AMI Congress / Meetings",
    org: "Association Montessori Internationale",
    typical: "Varies by region",
    attendees: "1,000+",
    url: "montessori-ami.org",
    deadline: "Varies",
  },
  {
    name: "Montessori For Social Justice Conference",
    org: "MFSJ",
    typical: "Annually",
    attendees: "500+",
    url: "montessoriforsocialjustice.org",
    deadline: "Varies",
  },
  {
    name: "NAMTA Conference",
    org: "North American Montessori Teachers' Association",
    typical: "Biannual",
    attendees: "500+",
    url: "montessori-namta.org",
    deadline: "Varies",
  },
];

const TALK_PROPOSAL = `TITLE: The QuickBooks Moment for Montessori: How One Teacher Built the Future of Classroom Record-Keeping

PRESENTER: Tredoux — AMS-certified Montessori guide, Beijing International School, Founder of Montree

FORMAT: 45-minute presentation + 15-minute Q&A / live demo

ABSTRACT:
Every Montessori classroom in the world still tracks student progress the same way: by hand, in a ledger, row by row. 24 children × 213 works = 5,112 data points per year — recorded manually. Teachers lose 8+ hours weekly to paperwork that accountants automated thirty years ago.

This session tells the story of how a working Montessori guide in Beijing built Montree — a digital curriculum tracking system designed from inside the classroom, between circle time and snack. Attendees will see:

• The scale of the "ledger problem" and why it persists
• A live demonstration of one-tap progress tracking during a simulated work period
• How auto-generated parent reports transform school-family communication
• The role of AI in Montessori curriculum guidance (the "Montessori Guru" feature)
• Real results from pilot classrooms: time saved, data quality, teacher satisfaction

This is not a technology sales pitch. This is a teacher sharing a tool he wished existed — and built because nobody else did. Attendees will leave with a free 3-month pilot for their school and a new perspective on how technology can serve (not replace) the prepared environment.

AUDIENCE: Teachers, administrators, school heads, and technology coordinators at Montessori schools of all levels.

BIO: Tredoux is an AMS-certified Montessori guide currently teaching PreK in Beijing. He has worked in Montessori education across multiple continents and built Montree to solve the record-keeping problem he experienced daily in his own classroom. His family previously operated a school for farm workers' children in South Africa — an experience that drives his mission to use technology profits to fund free, merit-based schools.`;

// ============================================
// SEO BLOG STRATEGY
// ============================================
const BLOG_POSTS = [
  {
    title: "The Best Montessori Record-Keeping Software in 2026 (Honest Comparison)",
    keyword: "Montessori record keeping software",
    volume: "High intent, low competition",
    outline: "Compare Transparent Classroom, Montessori Compass, MRX, Montessori Workspace, and Montree. Be honest about ALL of them. End with Montree's advantages (mobile, AI, free trial). This will rank because nobody has written a comprehensive, honest comparison.",
    cta: "Free 3-month pilot → montree.xyz",
  },
  {
    title: "How I Track 24 Children During a 3-Hour Montessori Work Period",
    keyword: "Montessori classroom management",
    volume: "Medium volume, practical",
    outline: "Step-by-step guide for new Montessori teachers. Explain the observation cycle, tracking methods (old vs new), and how digital tools fit into the flow. Naturally demo Montree as your tool. This is evergreen content that ranks forever.",
    cta: "Download the tracking checklist + try Montree free",
  },
  {
    title: "Transparent Classroom vs Montree: Which Is Right for Your School?",
    keyword: "Transparent Classroom alternative",
    volume: "Direct competitor keyword",
    outline: "Acknowledge TC's strengths (large install base, standards alignment). Then compare: mobile experience (1.2★ vs PWA), AI features (none vs Guru), pricing, ESL support, trial terms. Fair but honest. People searching this are READY to switch.",
    cta: "Try Montree free for 3 months",
  },
  {
    title: "How to Write Montessori Parent Reports That Parents Actually Read",
    keyword: "Montessori parent report template",
    volume: "High search, practical",
    outline: "The 5:1 ratio (5 positive for every constructive). Visual progress over text walls. Include real report screenshots. End with: 'Or generate them automatically with Montree.' This captures parents AND teachers searching for report help.",
    cta: "See an auto-generated report example",
  },
  {
    title: "Why Every Montessori School Needs Digital Record-Keeping in 2026",
    keyword: "Montessori digital tools",
    volume: "Thought leadership",
    outline: "The argument for modernization without losing Montessori values. Address common objections ('screens don't belong in Montessori'). Cite research on teacher burnout and parent communication. Position Montree as the respectful technology solution.",
    cta: "Free 3-month pilot",
  },
];

// ============================================
// PILOT ONBOARDING EMAIL SEQUENCE
// ============================================
const EMAIL_SEQUENCE = [
  {
    day: 0,
    subject: "Welcome to Montree 🌳 — Your 3-month pilot starts now",
    body: `Hi [Name],

Welcome to Montree! You've just taken the first step toward eliminating 8+ hours of weekly paperwork from your classroom.

Here's what happens next:

1. Log in at montree.xyz with your school credentials
2. Your curriculum is already mapped — 213 Montessori works, ready to go
3. Add your children (or I can do it for you — just reply with a class list)

Your first week goal: Track just ONE work period using Montree. That's it. Open the app, tap when a child starts a work, tap again when they finish.

I'm personally available for any questions — reply to this email anytime.

Welcome to the future of Montessori record-keeping. 🌳

Tredoux
Montessori Teacher & Founder, Montree`,
  },
  {
    day: 3,
    subject: "Quick tip: the fastest way to track during the work period",
    body: `Hi [Name],

Quick tip that saved me 20 minutes on Day 1:

Instead of trying to track every child, start with just 5-6 children per work period. The goal isn't perfection — it's building the habit of tapping as you observe.

By Week 2, you'll naturally track 15-20 children without thinking about it.

Pro tip: Keep your device on the Progress tab with children sorted by "This Week" — it shows who you haven't tracked yet.

How's it going so far? Any hiccups?

Tredoux`,
  },
  {
    day: 7,
    subject: "Your first week in numbers 📊",
    body: `Hi [Name],

You've been using Montree for a week!

Quick question: How many hours did you spend on record-keeping this week compared to last week?

I ask because our pilot teachers typically report saving 4-6 hours in their FIRST week. Some say it felt "weird" going home on time.

If you haven't tried generating a parent report yet, now is a great time:
→ Go to Reports tab → Select a child → Click "Generate"

The first time you see a full progress report appear in 3 seconds — that's the moment teachers tell me they can't go back.

Let me know how Week 1 went!

Tredoux`,
  },
  {
    day: 14,
    subject: "Have you tried the Montessori Guru yet? 🧠",
    body: `Hi [Name],

Two weeks in — you're building great data!

Have you tried asking the Guru yet? It's our AI feature that analyzes a child's progress and suggests what to present next.

Try this:
→ Open any child's profile → Tap "Ask Guru" → See what it recommends

Teachers tell me this is the feature that moves Montree from "useful" to "can't live without." It's like having a master teacher whispering suggestions during your work period.

How are things going? I'd love to hear what's working and what's not.

Tredoux`,
  },
  {
    day: 30,
    subject: "Month 1 done! 🎉 Quick favor?",
    body: `Hi [Name],

One month of Montree! How does it feel?

I have a quick favor to ask. Could you answer these 3 questions? (Just reply to this email)

1. How many hours per week did you save compared to before Montree?
2. What's your favorite feature?
3. Would you recommend Montree to a colleague? Why or why not?

Your honest feedback helps me make Montree better for every teacher. And if you're comfortable sharing a short testimonial, I'll feature your school (anonymously if you prefer) on our website.

Two months left in your pilot — let's make them count!

Tredoux`,
  },
  {
    day: 60,
    subject: "Your data is growing — here's what it means",
    body: `Hi [Name],

Two months of tracking data! You now have rich progress records for every child in your classroom.

Here's what you can do with 60 days of data:
📊 Generate comprehensive semester reports for parents
📈 Spot patterns: which children need more presentation in which areas
🧠 Guru recommendations are now much smarter with 2 months of history
📋 Conference prep: pull up any child's full progress in seconds

Remember: all of this data was created by simple taps during the work period. No late nights. No weekend paperwork.

One month left in your pilot. Let's talk about what happens next — reply when you have a minute?

Tredoux`,
  },
  {
    day: 80,
    subject: "Your pilot ends in 10 days — let's talk",
    body: `Hi [Name],

Your 3-month pilot wraps up in 10 days. Here's what I want you to know:

Your data stays. Nothing disappears. Whether you continue or not, your records are yours.

But I'd love to keep you. Here's what continuing looks like:
→ Flat monthly rate (I'll share pricing that works for your school)
→ All features stay unlocked
→ Priority support from me personally
→ Your feedback shapes what we build next

Can we find 15 minutes to chat this week? I'd love to hear your experience and figure out the best path forward.

No pressure — just a conversation between two Montessori educators.

Tredoux`,
  },
];

// ============================================
// TESTIMONIAL COLLECTION
// ============================================
const TESTIMONIAL_QUESTIONS = [
  "How many hours per week do you save with Montree compared to handwritten records?",
  "What was the moment you realized you couldn't go back to the old way?",
  "What do parents say when they see the auto-generated progress reports?",
  "Would you recommend Montree to other Montessori teachers? Why?",
  "What's the one feature you use most?",
  "If Montree disappeared tomorrow, what would you miss most?",
  "In one sentence, how would you describe Montree to a fellow teacher?",
];

// ============================================
// MAIN APP
// ============================================
export default function GrowthEngine() {
  const [tab, setTab] = useState("influencers");
  const [selectedInfluencer, setSelectedInfluencer] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState(0);

  const TABS = [
    { id: "influencers", label: "🌟 Influencer Targets", count: INFLUENCERS.length },
    { id: "conferences", label: "🎤 Conference Talks" },
    { id: "seo", label: "📝 SEO Blog Strategy", count: BLOG_POSTS.length },
    { id: "onboarding", label: "📧 Pilot Email Sequence", count: EMAIL_SEQUENCE.length },
    { id: "testimonials", label: "⭐ Testimonial System" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0a0f0d", color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">⚡</span>
          <h1 className="text-lg font-bold" style={{ color: "#e8f5e9" }}>Montree Growth Engine</h1>
        </div>
        <p className="text-xs" style={{ color: "#5a7a6a" }}>Influencer outreach, conference proposals, SEO strategy, onboarding emails, and testimonial collection.</p>
      </div>

      <div className="flex border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-3 text-xs font-medium whitespace-nowrap"
            style={{ color: tab === t.id ? "#2ecc71" : "#5a7a6a", borderBottom: tab === t.id ? "2px solid #2ecc71" : "2px solid transparent" }}>
            {t.label} {t.count && <span className="opacity-50">({t.count})</span>}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* INFLUENCERS */}
        {tab === "influencers" && (
          <div className="space-y-4">
            <div className="text-xs mb-2" style={{ color: "#5a7a6a" }}>
              10 real Montessori influencers with follower counts, niches, and custom approach strategies. DM template at bottom.
            </div>
            {INFLUENCERS.map((inf, i) => (
              <div key={i} className="rounded-xl p-4" style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${inf.priority === "🔴" ? "rgba(231,76,60,0.12)" : "rgba(255,255,255,0.04)"}`,
              }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{inf.priority}</span>
                      <span className="text-sm font-bold" style={{ color: "#e8f5e9" }}>{inf.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(228,64,95,0.1)", color: "#E4405F" }}>{inf.platform}</span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(46,204,113,0.1)", color: "#2ecc71" }}>{inf.followers}</span>
                      <span className="text-xs" style={{ color: "#5a7a6a" }}>{inf.type}</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#5a7a6a" }}>{inf.niche}</div>
                  </div>
                </div>
                <div className="text-xs mt-2 p-3 rounded-lg" style={{ background: "rgba(46,204,113,0.03)", border: "1px solid rgba(46,204,113,0.06)", color: "#a8c8b8", lineHeight: 1.7 }}>
                  <strong style={{ color: "#2ecc71" }}>Approach:</strong> {inf.approach}
                </div>
              </div>
            ))}

            <div className="mt-6 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold" style={{ color: "#e8f5e9" }}>Universal DM Template</span>
                <CopyBtn text={INFLUENCER_DM_TEMPLATE} />
              </div>
              <pre className="text-xs whitespace-pre-wrap" style={{ color: "#8aaa9a", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}>
                {INFLUENCER_DM_TEMPLATE}
              </pre>
            </div>
          </div>
        )}

        {/* CONFERENCES */}
        {tab === "conferences" && (
          <div className="space-y-5">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              Target these conferences for speaking slots. Your talk = live demo to hundreds of decision-makers.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CONFERENCES.map((c) => (
                <div key={c.name} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="text-sm font-bold" style={{ color: "#e8f5e9" }}>{c.name}</div>
                  <div className="text-xs mt-1 space-y-1" style={{ color: "#5a7a6a" }}>
                    <div>📍 {c.org}</div>
                    <div>📅 {c.typical}</div>
                    <div>👥 {c.attendees} attendees</div>
                    <div>⏰ Deadline: {c.deadline}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold" style={{ color: "#e8f5e9" }}>Ready-to-Submit Talk Proposal</span>
                <CopyBtn text={TALK_PROPOSAL} />
              </div>
              <pre className="text-xs whitespace-pre-wrap" style={{ color: "#a8c8b8", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8 }}>
                {TALK_PROPOSAL}
              </pre>
            </div>
          </div>
        )}

        {/* SEO */}
        {tab === "seo" && (
          <div className="space-y-4">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              5 blog posts that will rank on Google and bring organic traffic to montree.xyz forever. Write one per month.
            </div>
            {BLOG_POSTS.map((post, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="text-sm font-bold mb-2" style={{ color: "#e8f5e9" }}>
                  {i + 1}. {post.title}
                </div>
                <div className="flex gap-2 mb-3 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(52,152,219,0.1)", color: "#3498db" }}>🔍 {post.keyword}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(46,204,113,0.1)", color: "#2ecc71" }}>{post.volume}</span>
                </div>
                <div className="text-xs" style={{ color: "#a8c8b8", lineHeight: 1.7 }}>{post.outline}</div>
                <div className="text-xs mt-2 font-semibold" style={{ color: "#2ecc71" }}>CTA: {post.cta}</div>
              </div>
            ))}
          </div>
        )}

        {/* ONBOARDING */}
        {tab === "onboarding" && (
          <div className="space-y-4">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              7-email sequence over 80 days. This is how you turn a free pilot into a paying customer. Each email is timed to a milestone in their usage journey.
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {EMAIL_SEQUENCE.map((e, i) => (
                <button key={i} onClick={() => setSelectedEmail(i)}
                  className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                  style={{
                    background: selectedEmail === i ? "rgba(46,204,113,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedEmail === i ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.04)"}`,
                    color: selectedEmail === i ? "#2ecc71" : "#5a7a6a",
                  }}>
                  Day {e.day}
                </button>
              ))}
            </div>
            {(() => {
              const e = EMAIL_SEQUENCE[selectedEmail];
              return (
                <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="text-xs" style={{ color: "#5a7a6a" }}>Day {e.day}</div>
                      <div className="text-sm font-bold" style={{ color: "#e8f5e9" }}>{e.subject}</div>
                    </div>
                    <CopyBtn text={`Subject: ${e.subject}\n\n${e.body}`} />
                  </div>
                  <pre className="text-xs whitespace-pre-wrap" style={{ color: "#a8c8b8", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8 }}>
                    {e.body}
                  </pre>
                </div>
              );
            })()}
          </div>
        )}

        {/* TESTIMONIALS */}
        {tab === "testimonials" && (
          <div className="space-y-5">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              Testimonials are the most powerful conversion tool. Here's how to collect them systematically.
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(46,204,113,0.04)", border: "1px solid rgba(46,204,113,0.1)" }}>
              <div className="text-sm font-bold mb-3" style={{ color: "#2ecc71" }}>The System</div>
              <div className="text-xs space-y-2" style={{ color: "#a8c8b8", lineHeight: 1.7 }}>
                <p><strong>When:</strong> Day 30 of pilot (email #5 triggers it), again at Day 60, and at conversion</p>
                <p><strong>How:</strong> Reply-to-email (lowest friction) or quick voice note on WhatsApp</p>
                <p><strong>Format:</strong> "[Quote]" — [Name], [Role], [School] (anonymous if preferred)</p>
                <p><strong>Where to use:</strong> Landing page, social cards, pitch deck, cold emails, conference talk</p>
                <p><strong>Goal:</strong> Collect 5 testimonials from your first 5 pilot schools. That's all you need to 10x conversions.</p>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="text-sm font-bold mb-3" style={{ color: "#e8f5e9" }}>Questions That Get Great Quotes</div>
              <div className="space-y-2">
                {TESTIMONIAL_QUESTIONS.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs" style={{ color: "#a8c8b8" }}>
                    <span style={{ color: "#2ecc71", fontWeight: 700 }}>{i + 1}.</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="text-sm font-bold mb-3" style={{ color: "#e8f5e9" }}>Dream Testimonials (write these now, earn them later)</div>
              <div className="text-xs italic space-y-3" style={{ color: "#a8c8b8", lineHeight: 1.7 }}>
                <p>"I save 6 hours every week. I used to stay until 5pm doing records — now I leave at 3 with everything tracked."<br /><span style={{ color: "#5a7a6a", fontStyle: "normal" }}>— Montessori Guide, Beijing</span></p>
                <p>"The parent reports are incredible. Parents used to ask 'what did my child do today?' Now they already know."<br /><span style={{ color: "#5a7a6a", fontStyle: "normal" }}>— School Director, South Africa</span></p>
                <p>"The Guru feature is like having a master teacher in my pocket. It sees patterns I miss."<br /><span style={{ color: "#5a7a6a", fontStyle: "normal" }}>— Assistant Teacher, Year 1</span></p>
                <p>"We tried Transparent Classroom for 2 years. Montree does everything better and the mobile experience is night and day."<br /><span style={{ color: "#5a7a6a", fontStyle: "normal" }}>— Head of School, Hong Kong</span></p>
                <p>"I can't believe this was built by a teacher. It actually understands how Montessori classrooms work."<br /><span style={{ color: "#5a7a6a", fontStyle: "normal" }}>— AMS-certified Guide, USA</span></p>
              </div>
              <div className="mt-3 text-xs" style={{ color: "#5a7a6a" }}>
                These are aspirational. Your goal: earn real versions of these quotes from your first 5 pilot schools.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
