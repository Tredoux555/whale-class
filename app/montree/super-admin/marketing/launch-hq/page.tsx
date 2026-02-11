// @ts-nocheck
'use client';
import { useState, useEffect } from "react";
import Link from 'next/link';

// ============================================
// MONTREE LAUNCH HQ
// The ONLY file you need to open.
// Everything else is referenced from here.
// ============================================

// ============================================
// ALL 13 FILES — ORGANIZED
// ============================================
const VAULT = [
  {
    category: "🚀 DEPLOY THESE (put on your website)",
    files: [
      { name: "montree-landing.html", job: "Your main website page. People land here from links and ads.", deploy: "montree.xyz", icon: "🌐" },
      { name: "montree-links.html", job: "Bio link page for TikTok/IG/FB bios. One link → everything.", deploy: "montree.xyz/links", icon: "🔗" },
      { name: "montree-pitch-v2.html", job: "Animated 60-second pitch. Embed on landing page or send directly.", deploy: "montree.xyz/pitch", icon: "🎬" },
    ],
  },
  {
    category: "📋 OPEN DAILY (your workflow tools)",
    files: [
      { name: "montree-mission-control.jsx", job: "Step-by-step checklist. Open this → do the next unchecked thing → close.", deploy: null, icon: "🎯" },
      { name: "montree-objection-handler.jsx", job: "Someone asks a hard question? Open this. Copy the answer. Paste it.", deploy: null, icon: "🛡️" },
    ],
  },
  {
    category: "📝 COPY FROM (content to post)",
    files: [
      { name: "montree-platform-warroom.jsx", job: "TikTok scripts, Instagram carousels, Facebook group targets, bios, hashtags, 30-day posting schedule.", deploy: null, icon: "🎵" },
      { name: "montree-content-factory.jsx", job: "Social card designs, WeChat article, caption bank for every platform.", deploy: null, icon: "🎨" },
      { name: "montree-creative-studio.jsx", job: "Voiceover scripts (EN + CN), Canva design specs, social card screenshots.", deploy: null, icon: "🎙️" },
    ],
  },
  {
    category: "📨 COPY FROM (outreach messages)",
    files: [
      { name: "montree-prospect-hq.jsx", job: "Real school names + contacts, WhatsApp message templates, 4-phase outreach playbook.", deploy: null, icon: "🎯" },
      { name: "montree-outreach.jsx", job: "Cold email templates, follow-up emails, school directory links.", deploy: null, icon: "📧" },
      { name: "montree-growth-engine.jsx", job: "Influencer DM targets, conference proposals, SEO blog outlines, pilot onboarding emails, testimonial questions.", deploy: null, icon: "⚡" },
    ],
  },
  {
    category: "📖 READ ONCE (strategy reference)",
    files: [
      { name: "montree-playbook.html", job: "The full business strategy. Read this once to understand the big picture. Come back when you feel lost.", deploy: null, icon: "📖" },
      { name: "montree-demo.jsx", job: "Interactive product simulation. NOT needed (your real product IS the demo). Skip this.", deploy: null, icon: "📱", skip: true },
    ],
  },
];

// ============================================
// THE 14-DAY LAUNCH — DEAD SIMPLE
// ============================================
const DAYS = [
  {
    day: 1,
    title: "Set up + Film",
    color: "#e74c3c",
    tasks: [
      { do: "Set up TikTok account", open: "montree-platform-warroom.jsx", tab: "Bios & Tags tab → copy TikTok bio", time: "5 min" },
      { do: "Set up Instagram account", open: "montree-platform-warroom.jsx", tab: "Bios & Tags tab → copy IG bio", time: "5 min" },
      { do: "Set up Facebook page", open: "montree-platform-warroom.jsx", tab: "Bios & Tags tab → copy FB bio", time: "10 min" },
      { do: "Set all bio links to montree.xyz/links", open: null, tab: null, time: "2 min" },
      { do: "Film your first video (Episode 1 or 7)", open: "montree-platform-warroom.jsx", tab: "TikTok Scripts tab → read the script → film on phone", time: "30 min" },
      { do: "Edit in CapCut (add text overlay)", open: null, tab: "Follow the on-screen text from the script", time: "20 min" },
      { do: "Post to TikTok + Instagram Reels + Facebook", open: "montree-platform-warroom.jsx", tab: "Copy hashtags from Bios & Tags tab", time: "10 min" },
    ],
  },
  {
    day: 2,
    title: "Warm outreach begins",
    color: "#f39c12",
    tasks: [
      { do: "WhatsApp 5 teacher friends", open: "montree-prospect-hq.jsx", tab: "WhatsApp Templates tab → Teacher Friends template → personalize each", time: "15 min" },
      { do: "WhatsApp 3 AMS training contacts", open: "montree-prospect-hq.jsx", tab: "Same template, mention shared AMS connection", time: "10 min" },
      { do: "Share in parent WeChat group", open: "montree-prospect-hq.jsx", tab: "WhatsApp Templates tab → Parent Network", time: "5 min" },
    ],
  },
  {
    day: 3,
    title: "Content + DM principals",
    color: "#3498db",
    tasks: [
      { do: "DM any principals you know personally", open: "montree-prospect-hq.jsx", tab: "WhatsApp Templates → Direct to Principals", time: "10 min" },
      { do: "Post second TikTok (Episode 2: screen record the real app)", open: "montree-platform-warroom.jsx", tab: "TikTok Scripts → Ep 2", time: "30 min" },
      { do: "Reply to ALL comments and DMs from Day 1-2", open: null, tab: null, time: "10 min" },
    ],
  },
  {
    day: 4,
    title: "Instagram carousel",
    color: "#2ecc71",
    tasks: [
      { do: "Create 'The Ledger Problem' carousel in Canva", open: "montree-platform-warroom.jsx", tab: "IG Carousels tab → slide-by-slide specs", time: "30 min" },
      { do: "Use the Canva specs for colors/fonts", open: "montree-creative-studio.jsx", tab: "Canva Specs tab → colors + fonts", time: "reference" },
      { do: "Post to Instagram", open: "montree-platform-warroom.jsx", tab: "Copy IG hashtags from Bios & Tags", time: "5 min" },
    ],
  },
  {
    day: 5,
    title: "Join Facebook groups",
    color: "#9b59b6",
    tasks: [
      { do: "Join 3 Montessori Facebook groups", open: "montree-platform-warroom.jsx", tab: "FB Groups tab → pick top 3", time: "5 min" },
      { do: "Comment helpfully on 3 posts in each group (DO NOT promote yet)", open: null, tab: "Just be helpful. Answer questions. Build presence.", time: "15 min" },
      { do: "Post TikTok Episode 3", open: "montree-platform-warroom.jsx", tab: "TikTok Scripts → Ep 3", time: "30 min" },
    ],
  },
  {
    day: 6,
    title: "Follow up + WeChat",
    color: "#e67e22",
    tasks: [
      { do: "Follow up with anyone who hasn't replied from Day 2", open: "montree-prospect-hq.jsx", tab: "WhatsApp Templates → Follow-Up Warm", time: "10 min" },
      { do: "Post WeChat article (pre-written in Chinese)", open: "montree-content-factory.jsx", tab: "WeChat Article tab → copy entire article", time: "20 min" },
      { do: "Engage in Facebook groups (comment, don't promote)", open: null, tab: null, time: "10 min" },
    ],
  },
  {
    day: 7,
    title: "REST DAY",
    color: "#5a7a6a",
    tasks: [
      { do: "Reply to any DMs or comments only. No new content.", open: null, tab: null, time: "10 min" },
    ],
  },
  {
    day: 8,
    title: "Cold emails begin",
    color: "#e74c3c",
    tasks: [
      { do: "Email MSB Beijing (admissions@msb.edu.cn)", open: "montree-outreach.jsx", tab: "Email Templates → Cold Principal email → personalize for MSB", time: "10 min" },
      { do: "Email 4 more 🔴 priority schools", open: "montree-prospect-hq.jsx", tab: "School Hit List tab → pick 4 red-flagged schools from your region", time: "20 min" },
      { do: "Post TikTok Episode 4 or 5", open: "montree-platform-warroom.jsx", tab: "TikTok Scripts → Ep 4 or 5", time: "30 min" },
    ],
  },
  {
    day: 9,
    title: "Influencer outreach",
    color: "#ff6b9d",
    tasks: [
      { do: "DM @missymontessori (41K, AMS teacher)", open: "montree-growth-engine.jsx", tab: "Influencer Targets tab → DM template at bottom", time: "5 min" },
      { do: "DM @trilliummontessori (38K, sells courses)", open: "montree-growth-engine.jsx", tab: "Same DM template, personalize", time: "5 min" },
      { do: "DM @angelamomtessori (6K, easy win)", open: "montree-growth-engine.jsx", tab: "Same template", time: "5 min" },
      { do: "Post Instagram social card", open: "montree-creative-studio.jsx", tab: "Social Cards tab → screenshot '5,112 Stat Card' → post", time: "10 min" },
    ],
  },
  {
    day: 10,
    title: "Facebook group posting (earned it)",
    color: "#2ecc71",
    tasks: [
      { do: "Post value content in Facebook groups (you've been engaging for 5 days now)", open: "montree-platform-warroom.jsx", tab: "FB Groups tab → posting strategy at bottom", time: "15 min" },
      { do: "Post TikTok Episode 6", open: "montree-platform-warroom.jsx", tab: "TikTok Scripts → Ep 6 (QuickBooks analogy)", time: "30 min" },
      { do: "Engage with all comments and DMs", open: null, tab: null, time: "10 min" },
    ],
  },
  {
    day: 11,
    title: "South Africa push",
    color: "#f1c40f",
    tasks: [
      { do: "Email SAMA (SA Montessori Association)", open: "montree-prospect-hq.jsx", tab: "School Hit List → South Africa → SAMA details", time: "10 min" },
      { do: "Email MELF Training Center", open: "montree-prospect-hq.jsx", tab: "School Hit List → South Africa → MELF", time: "10 min" },
      { do: "Email 3 more SA schools (lead with farm story)", open: "montree-outreach.jsx", tab: "Email Templates → personalize with SA angle", time: "15 min" },
    ],
  },
  {
    day: 12,
    title: "Content batch day",
    color: "#3498db",
    tasks: [
      { do: "Film TikTok Episodes 7-8 back to back", open: "montree-platform-warroom.jsx", tab: "TikTok Scripts → Ep 7 (naptime coding) + Ep 8 (parent POV)", time: "45 min" },
      { do: "Create 'Before vs After' Instagram carousel", open: "montree-platform-warroom.jsx", tab: "IG Carousels → Before vs After specs", time: "20 min" },
      { do: "Schedule posts for next 3 days", open: null, tab: null, time: "15 min" },
    ],
  },
  {
    day: 13,
    title: "Follow up on everything",
    color: "#e67e22",
    tasks: [
      { do: "Follow up on all cold emails from Day 8", open: "montree-outreach.jsx", tab: "Email Templates → Follow-Up email", time: "15 min" },
      { do: "Follow up on influencer DMs", open: null, tab: "If no reply, try a comment on their latest post instead", time: "10 min" },
      { do: "Check Facebook group engagement", open: null, tab: null, time: "10 min" },
    ],
  },
  {
    day: 14,
    title: "REST + REVIEW",
    color: "#5a7a6a",
    tasks: [
      { do: "Reply to DMs and comments only", open: null, tab: null, time: "10 min" },
      { do: "Count: How many pilot signups? How many conversations open?", open: null, tab: null, time: "5 min" },
      { do: "Plan Week 3 based on what's working", open: null, tab: "If TikTok is getting views → more TikTok. If emails are getting replies → more emails.", time: "15 min" },
    ],
  },
];

// ============================================
// QUICK FINDER: "I need to ___"
// ============================================
const FINDER = [
  { need: "Post on TikTok", open: "montree-platform-warroom.jsx", tab: "TikTok Scripts tab" },
  { need: "Post on Instagram", open: "montree-platform-warroom.jsx", tab: "IG Carousels tab + Bios & Tags for hashtags" },
  { need: "Post on Facebook", open: "montree-platform-warroom.jsx", tab: "FB Groups tab" },
  { need: "Post on WeChat", open: "montree-content-factory.jsx", tab: "WeChat Article tab" },
  { need: "Set up my bio on any platform", open: "montree-platform-warroom.jsx", tab: "Bios & Tags tab" },
  { need: "Send a WhatsApp to a teacher", open: "montree-prospect-hq.jsx", tab: "WhatsApp Templates tab" },
  { need: "Send a cold email to a school", open: "montree-outreach.jsx", tab: "Email Templates" },
  { need: "Find schools to contact", open: "montree-prospect-hq.jsx", tab: "School Hit List tab" },
  { need: "DM an influencer", open: "montree-growth-engine.jsx", tab: "Influencer Targets tab" },
  { need: "Answer a principal's tough question", open: "montree-objection-handler.jsx", tab: "Find the question → copy the answer" },
  { need: "Record a voiceover for a video", open: "montree-creative-studio.jsx", tab: "Voiceover Scripts tab" },
  { need: "Make a Canva graphic", open: "montree-creative-studio.jsx", tab: "Canva Specs tab for colors/fonts" },
  { need: "Screenshot a social card", open: "montree-creative-studio.jsx", tab: "Social Cards tab → screenshot the card" },
  { need: "Send a pilot onboarding email", open: "montree-growth-engine.jsx", tab: "Pilot Email Sequence tab" },
  { need: "Ask a pilot school for a testimonial", open: "montree-growth-engine.jsx", tab: "Testimonial System tab" },
  { need: "Submit a conference talk", open: "montree-growth-engine.jsx", tab: "Conference Talks tab" },
  { need: "Write an SEO blog post", open: "montree-growth-engine.jsx", tab: "SEO Blog Strategy tab" },
  { need: "Understand the big picture strategy", open: "montree-playbook.html", tab: "Read the whole thing once" },
  { need: "Deploy my landing page", open: "montree-landing.html", tab: "Give to Desktop Claude → save to montree.xyz" },
  { need: "Deploy my links page", open: "montree-links.html", tab: "Save to montree.xyz/links" },
];

// ============================================
// COMPONENTS
// ============================================
function Checkbox({ checked, onChange }) {
  return (
    <button onClick={onChange} className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all"
      style={{
        background: checked ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.03)",
        border: `2px solid ${checked ? "#2ecc71" : "rgba(255,255,255,0.12)"}`,
      }}>
      {checked && <span style={{ color: "#2ecc71", fontSize: 11, fontWeight: 900 }}>✓</span>}
    </button>
  );
}

// Map original JSX/HTML filenames to marketing hub routes
const FILE_ROUTE_MAP = {
  "montree-platform-warroom.jsx": "/montree/super-admin/marketing/warroom",
  "montree-objection-handler.jsx": "/montree/super-admin/marketing/objections",
  "montree-content-factory.jsx": "/montree/super-admin/marketing/content",
  "montree-creative-studio.jsx": "/montree/super-admin/marketing/studio",
  "montree-prospect-hq.jsx": "/montree/super-admin/marketing/prospects",
  "montree-outreach.jsx": "/montree/super-admin/marketing/outreach",
  "montree-growth-engine.jsx": "/montree/super-admin/marketing/growth",
  "montree-landing.html": "/montree/super-admin/marketing/landing",
  "montree-links.html": "/montree/super-admin/marketing/links",
  "montree-pitch-v2.html": "/montree/super-admin/marketing/pitch",
  "montree-playbook.html": "/montree/super-admin/marketing/playbook",
  "montree-mission-control.jsx": "/montree/super-admin/marketing/launch-hq",
};

function FileTag({ name, tab }) {
  const route = FILE_ROUTE_MAP[name];
  return (
    <div className="mt-2 text-xs rounded-lg px-3 py-2" style={{ background: "rgba(46,204,113,0.04)", border: "1px solid rgba(46,204,113,0.1)" }}>
      <span className="font-bold" style={{ color: "#2ecc71" }}>📂 Open: </span>
      {route ? (
        <Link href={route} className="underline hover:text-emerald-300 transition-colors" style={{ color: "#e8f5e9" }}>{name}</Link>
      ) : (
        <span style={{ color: "#e8f5e9" }}>{name}</span>
      )}
      {tab && <span style={{ color: "#5a7a6a" }}> → {tab}</span>}
    </div>
  );
}

// ============================================
// MAIN
// ============================================
export default function LaunchHQ() {
  const [tab, setTab] = useState("daily");
  const [checks, setChecks] = useState({});
  const [finderSearch, setFinderSearch] = useState("");

  // Load saved checkbox state from localStorage after mount (not during SSR)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("montree-launch-checks");
      if (saved) setChecks(JSON.parse(saved));
    } catch {}
  }, []);

  const toggle = (key) => setChecks((p) => {
    const updated = { ...p, [key]: !p[key] };
    try { localStorage.setItem("montree-launch-checks", JSON.stringify(updated)); } catch {}
    return updated;
  });

  const totalTasks = DAYS.reduce((a, d) => a + d.tasks.length, 0);
  const doneTasks = Object.values(checks).filter(Boolean).length;
  const pct = Math.round((doneTasks / totalTasks) * 100);

  const filteredFinder = finderSearch
    ? FINDER.filter((f) => f.need.toLowerCase().includes(finderSearch.toLowerCase()))
    : FINDER;

  return (
    <div className="min-h-screen" style={{ background: "#070c09", color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-4 border-b border-slate-700"><Link href="/montree/super-admin/marketing" className="text-emerald-400 hover:text-emerald-300 text-sm">← Back to Marketing Hub</Link></div>
      {/* Header */}
      <div className="p-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
            background: "linear-gradient(135deg, #1a9c5a, #2ecc71)",
            boxShadow: "0 4px 15px rgba(46,204,113,0.25)",
            fontSize: 20,
          }}>🌳</div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#e8f5e9" }}>Montree Launch HQ</h1>
            <p className="text-xs" style={{ color: "#5a7a6a" }}>13 files. 14 days. One checklist.</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span style={{ color: "#5a7a6a" }}>Launch Progress</span>
          <span style={{ color: "#2ecc71" }}>{doneTasks}/{totalTasks} tasks · {pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #1a9c5a, #2ecc71)",
          }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {[
          { id: "daily", label: "📅 14-Day Plan" },
          { id: "finder", label: "🔍 I Need To..." },
          { id: "vault", label: "📁 All 13 Files" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-5 py-3 text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              color: tab === t.id ? "#2ecc71" : "#5a7a6a",
              borderBottom: tab === t.id ? "2px solid #2ecc71" : "2px solid transparent",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">

        {/* ========== 14-DAY PLAN ========== */}
        {tab === "daily" && (
          <div className="space-y-5">
            <div className="text-xs" style={{ color: "#5a7a6a", lineHeight: 1.7 }}>
              Do one day at a time. Check off tasks as you go. Each task tells you exactly which file to open and which tab to look at.
            </div>
            {DAYS.map((day) => {
              const dayDone = day.tasks.filter((_, i) => checks[`d${day.day}-${i}`]).length;
              const allDone = dayDone === day.tasks.length;
              return (
                <div key={day.day} className="rounded-2xl overflow-hidden" style={{
                  border: `1px solid ${allDone ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.04)"}`,
                  opacity: allDone ? 0.5 : 1,
                }}>
                  {/* Day header */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{
                    background: allDone ? "rgba(46,204,113,0.03)" : `${day.color}08`,
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                        style={{ background: `${day.color}15`, color: day.color }}>
                        {day.day}
                      </div>
                      <div>
                        <div className="text-sm font-bold" style={{ color: allDone ? "#2ecc71" : "#e8f5e9" }}>
                          {allDone ? "✓ " : ""}Day {day.day}: {day.title}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: "#5a7a6a" }}>{dayDone}/{day.tasks.length}</span>
                  </div>
                  {/* Tasks */}
                  <div className="divide-y" style={{ divideColor: "rgba(255,255,255,0.03)" }}>
                    {day.tasks.map((task, i) => {
                      const key = `d${day.day}-${i}`;
                      const done = checks[key];
                      return (
                        <div key={i} className="px-4 py-3 transition-all" style={{ background: done ? "rgba(46,204,113,0.02)" : "rgba(255,255,255,0.01)" }}>
                          <div className="flex items-start gap-3">
                            <Checkbox checked={done} onChange={() => toggle(key)} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm" style={{
                                  color: done ? "#5a7a6a" : "#e8f5e9",
                                  textDecoration: done ? "line-through" : "none",
                                  fontWeight: 600,
                                }}>
                                  {task.do}
                                </span>
                                {task.time && (
                                  <span className="text-xs ml-2 flex-shrink-0" style={{ color: "#3a5a4a" }}>
                                    {task.time}
                                  </span>
                                )}
                              </div>
                              {task.open && <FileTag name={task.open} tab={task.tab} />}
                              {!task.open && task.tab && (
                                <div className="text-xs mt-1" style={{ color: "#5a7a6a" }}>{task.tab}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========== QUICK FINDER ========== */}
        {tab === "finder" && (
          <div className="space-y-4">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              Don't know which file to open? Just find what you need to do.
            </div>
            <input
              type="text"
              placeholder="Type what you need... (email, TikTok, WhatsApp, etc.)"
              value={finderSearch}
              onChange={(e) => setFinderSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#e8f5e9",
                outline: "none",
              }}
            />
            <div className="space-y-2">
              {filteredFinder.map((f, i) => (
                <div key={i} className="rounded-xl p-4" style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div className="text-sm font-semibold mb-1" style={{ color: "#e8f5e9" }}>
                    "I need to {f.need.toLowerCase()}"
                  </div>
                  <FileTag name={f.open} tab={f.tab} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========== FILE VAULT ========== */}
        {tab === "vault" && (
          <div className="space-y-6">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              All 13 files organized by how you'll use them. You don't need to open all of them — the daily plan tells you which one to open each day.
            </div>
            {VAULT.map((cat) => (
              <div key={cat.category}>
                <div className="text-xs font-bold mb-3" style={{ color: "#8aaa9a" }}>{cat.category}</div>
                <div className="space-y-2">
                  {cat.files.map((f) => (
                    <div key={f.name} className="rounded-xl p-4" style={{
                      background: f.skip ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${f.skip ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)"}`,
                      opacity: f.skip ? 0.4 : 1,
                    }}>
                      <div className="flex items-start gap-3">
                        <span style={{ fontSize: 18 }}>{f.icon}</span>
                        <div className="flex-1">
                          {FILE_ROUTE_MAP[f.name] ? (
                            <Link href={FILE_ROUTE_MAP[f.name]} className="text-sm font-bold underline hover:text-emerald-300 transition-colors" style={{ color: "#e8f5e9" }}>{f.name}</Link>
                          ) : (
                            <div className="text-sm font-bold" style={{ color: "#e8f5e9" }}>{f.name}</div>
                          )}
                          <div className="text-xs mt-1" style={{ color: "#8aaa9a", lineHeight: 1.6 }}>{f.job}</div>
                          {f.deploy && (
                            <div className="text-xs mt-1.5 inline-block px-2 py-0.5 rounded" style={{
                              background: "rgba(46,204,113,0.08)", color: "#2ecc71",
                            }}>
                              Deploy to: {f.deploy}
                            </div>
                          )}
                          {f.skip && (
                            <div className="text-xs mt-1.5 inline-block px-2 py-0.5 rounded" style={{
                              background: "rgba(255,255,255,0.03)", color: "#5a7a6a",
                            }}>
                              Skip — your real product is the demo
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Quick summary */}
            <div className="rounded-2xl p-5" style={{
              background: "linear-gradient(145deg, rgba(46,204,113,0.04), rgba(26,156,90,0.02))",
              border: "1px solid rgba(46,204,113,0.1)",
            }}>
              <div className="text-sm font-bold mb-3" style={{ color: "#2ecc71" }}>🧠 Remember</div>
              <div className="text-xs space-y-2" style={{ color: "#a8c8b8", lineHeight: 1.7 }}>
                <p>You don't need to memorize any of this.</p>
                <p>Open the <strong>14-Day Plan</strong> tab every morning. Do the next unchecked task. It tells you which file to open and which tab to look at.</p>
                <p>If someone asks you a question you don't know how to answer, open the <strong>"I Need To..."</strong> tab and search for it.</p>
                <p>That's it. That's the whole system.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
