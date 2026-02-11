// @ts-nocheck
'use client';
import { useState, useCallback } from "react";
import Link from 'next/link';

const SCHOOL_DIRECTORIES = [
  { name: "AMS School Directory", url: "https://amshq.org/schools/", count: "5,000+", region: "USA / International" },
  { name: "International Montessori Society", url: "https://imsmontessori.org/membership/montessori-schools/list-of-montessori-schools/", count: "200+", region: "USA" },
  { name: "NAMTA School Directory", url: "https://montessori-namta.org/school-directory/", count: "1,000+", region: "North America" },
  { name: "Montessori Foundation", url: "https://www.montessori.org/montessori-school-directory/", count: "Global", region: "International" },
  { name: "Montessori Global Education", url: "https://montessori-globaleducation.org/looking-for-a-school/", count: "500+", region: "UK / International" },
  { name: "AMI Directory", url: "https://montessori-ami.org/", count: "Global", region: "International" },
];

const EMAIL_TEMPLATES = [
  {
    id: "cold-principal",
    name: "Cold Email — Principal",
    subject: "Montessori record-keeping shouldn't take 8 hours a week",
    body: `Hi {name},

I'm a Montessori teacher who built something I think {school} would find valuable.

You know that massive ledger we all use to track every child's work? Rows and columns, hours of tedious effort, easy to make mistakes? We call it "the ledger problem."

Montree is a modern tracking system built specifically for Montessori. Teachers tap to record progress. Parent reports generate automatically. The entire curriculum — 213 works — is mapped and ready.

We're offering a free 3-month pilot to schools who want to try it. No credit card, no commitment — just modern tools for the classroom.

Here's a 60-second demo: https://montree.xyz

Would you be open to a quick look?

Best,
Tredoux
Montessori Teacher & Founder, Montree
montree.xyz`,
  },
  {
    id: "cold-teacher",
    name: "Facebook/DM — Fellow Teacher",
    subject: "",
    body: `Hey {name}! 👋

Fellow Montessori guide here. Quick question — how many hours a week do you spend on record-keeping and parent reports?

I was losing 8+ hours a week to it, so I built a tool that lets me track everything with one tap during the work period. Parent reports generate automatically.

I'm looking for a few teachers to try it free for 3 months and give me honest feedback. Interested?

Here's what it looks like: https://montree.xyz

No strings — just trying to make our lives easier! 🌳`,
  },
  {
    id: "china-wechat",
    name: "WeChat — China Schools",
    subject: "",
    body: `Hi {name},

I'm a Montessori teacher at an international school in Beijing. I built a classroom management tool that I think {school} would benefit from.

The problem: Montessori teachers spend hours tracking each child's progress by hand, then more hours creating parent reports — especially challenging when parents expect frequent updates in both English and Chinese.

Montree solves this:
✅ One-tap progress tracking (during the work period, not after)
✅ Auto-generated parent reports
✅ Full Montessori curriculum mapped (213 works)
✅ Built for bilingual classrooms

I'm offering a free 3-month pilot. No cost, no commitment. I just need honest feedback from real classrooms.

Would you like to see a quick demo?

Best regards,
Tredoux
montree.xyz`,
  },
  {
    id: "followup",
    name: "Follow-Up (1 week later)",
    subject: "Re: Montessori record-keeping shouldn't take 8 hours a week",
    body: `Hi {name},

Just following up on my note last week. I know how busy things get in a Montessori school!

One thing I didn't mention — Montree includes an AI "Montessori Guru" that can recommend what each child should work on next based on their progress. Teachers in our pilot schools are calling it a game-changer for lesson planning.

Happy to do a quick 10-minute screen share if you'd like to see it in action. Or you can explore the demo yourself at montree.xyz.

No pressure either way — just wanted to make sure this landed!

Best,
Tredoux`,
  },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
      style={{
        background: copied ? "rgba(46,204,113,0.2)" : "rgba(46,204,113,0.1)",
        border: `1px solid ${copied ? "rgba(46,204,113,0.4)" : "rgba(46,204,113,0.2)"}`,
        color: copied ? "#2ecc71" : "#a8d8b8",
      }}
    >
      {copied ? "✓ Copied!" : "📋 Copy"}
    </button>
  );
}

export default function MontreeOutreach() {
  const [schoolName, setSchoolName] = useState("");
  const [contactName, setContactName] = useState("");
  const [activeTemplate, setActiveTemplate] = useState("cold-principal");
  const [activeTab, setActiveTab] = useState("emails");

  const template = EMAIL_TEMPLATES.find((t) => t.id === activeTemplate);
  const personalizedBody = template.body
    .replace(/{name}/g, contactName || "[Name]")
    .replace(/{school}/g, schoolName || "[School Name]");
  const personalizedSubject = template.subject
    .replace(/{name}/g, contactName || "[Name]")
    .replace(/{school}/g, schoolName || "[School Name]");

  return (
    <div className="min-h-screen" style={{ background: "#0a0f0d", color: "#c8e0d0" }}>
      <div className="p-4 border-b border-slate-700"><Link href="/montree/super-admin/marketing" className="text-emerald-400 hover:text-emerald-300 text-sm">← Back to Marketing Hub</Link></div>
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🌳</span>
          <h1 className="text-xl font-bold" style={{ color: "#e8f5e9" }}>
            Montree Outreach Command Center
          </h1>
        </div>
        <p className="text-sm" style={{ color: "#5a7a6a" }}>
          Find schools, personalize emails, track outreach. Your sales pipeline in one place.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {[
          { id: "emails", label: "📧 Email Templates", count: EMAIL_TEMPLATES.length },
          { id: "directories", label: "🔍 School Directories", count: SCHOOL_DIRECTORIES.length },
          { id: "tracker", label: "📊 Outreach Tracker" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-3 text-sm font-medium transition-all"
            style={{
              color: activeTab === tab.id ? "#2ecc71" : "#5a7a6a",
              borderBottom: activeTab === tab.id ? "2px solid #2ecc71" : "2px solid transparent",
              background: activeTab === tab.id ? "rgba(46,204,113,0.04)" : "transparent",
            }}
          >
            {tab.label} {tab.count && <span className="ml-1 opacity-60">({tab.count})</span>}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* EMAIL TEMPLATES TAB */}
        {activeTab === "emails" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Template selector + personalization */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#5a7a6a" }}>
                  Template
                </label>
                <div className="space-y-2">
                  {EMAIL_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTemplate(t.id)}
                      className="w-full text-left px-4 py-3 rounded-lg text-sm transition-all"
                      style={{
                        background: activeTemplate === t.id ? "rgba(46,204,113,0.08)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${activeTemplate === t.id ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.04)"}`,
                        color: activeTemplate === t.id ? "#e8f5e9" : "#8aaa9a",
                      }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: "#5a7a6a" }}>
                  Personalize
                </label>
                <input
                  type="text"
                  placeholder="Contact name..."
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm mb-2"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#e8f5e9",
                    outline: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="School name..."
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#e8f5e9",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Right: Preview */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest" style={{ color: "#5a7a6a" }}>
                  Preview
                </span>
                <div className="flex gap-2">
                  <CopyButton text={personalizedSubject ? `Subject: ${personalizedSubject}\n\n${personalizedBody}` : personalizedBody} />
                </div>
              </div>

              <div
                className="rounded-xl p-6"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(46,204,113,0.08)",
                }}
              >
                {personalizedSubject && (
                  <div className="mb-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-xs" style={{ color: "#5a7a6a" }}>
                      Subject:{" "}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "#e8f5e9" }}>
                      {personalizedSubject}
                    </span>
                  </div>
                )}
                <pre
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ color: "#b8d0c0", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {personalizedBody}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* DIRECTORIES TAB */}
        {activeTab === "directories" && (
          <div>
            <p className="text-sm mb-6" style={{ color: "#5a7a6a" }}>
              These directories contain contact info for thousands of Montessori schools worldwide. Open each one,
              find schools in your target region, and use the email templates to reach out.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SCHOOL_DIRECTORIES.map((dir) => (
                <a
                  key={dir.name}
                  href={dir.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl p-5 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(46,204,113,0.08)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm mb-1" style={{ color: "#e8f5e9" }}>
                        {dir.name}
                      </h3>
                      <p className="text-xs" style={{ color: "#5a7a6a" }}>
                        {dir.region}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{ background: "rgba(46,204,113,0.1)", color: "#2ecc71" }}
                    >
                      {dir.count} schools
                    </span>
                  </div>
                  <div className="mt-3 text-xs truncate" style={{ color: "#4a6a5a" }}>
                    🔗 {dir.url}
                  </div>
                </a>
              ))}
            </div>

            <div
              className="mt-6 rounded-xl p-5"
              style={{ background: "rgba(46,204,113,0.04)", border: "1px solid rgba(46,204,113,0.1)" }}
            >
              <h4 className="text-sm font-semibold mb-2" style={{ color: "#2ecc71" }}>
                🎯 Outreach Strategy
              </h4>
              <div className="text-sm space-y-2" style={{ color: "#8aaa9a" }}>
                <p>
                  <strong style={{ color: "#b8d8c0" }}>Phase 1 (China):</strong> Start with international Montessori
                  schools in Beijing, Shanghai, Guangzhou, Shenzhen. You know the market, you speak the language
                  (literally).
                </p>
                <p>
                  <strong style={{ color: "#b8d8c0" }}>Phase 2 (South Africa):</strong> Target SA Montessori
                  Association schools. The mission connection makes your story compelling.
                </p>
                <p>
                  <strong style={{ color: "#b8d8c0" }}>Phase 3 (International):</strong> AMS and AMI directories for
                  US/Europe. Transparent Classroom's 1.2★ mobile app is your opening.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TRACKER TAB */}
        {activeTab === "tracker" && (
          <div>
            <p className="text-sm mb-6" style={{ color: "#5a7a6a" }}>
              Track your outreach progress. Goal: 5 emails per week. Target: 3-5 pilot schools in first month.
            </p>

            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: "Emails Sent", val: "0", color: "#3498db" },
                { label: "Responses", val: "0", color: "#f39c12" },
                { label: "Demos Given", val: "0", color: "#9b59b6" },
                { label: "Pilots Started", val: "0", color: "#2ecc71" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-4 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div className="text-3xl font-bold" style={{ color: s.color }}>
                    {s.val}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#5a7a6a" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-xl p-6"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#e8f5e9" }}>
                Weekly Targets
              </h3>
              <div className="space-y-3">
                {[
                  "Send 5 personalized cold emails to principals",
                  "Post 1 'Ledger Problem' video in a Facebook group",
                  "Share 1 before/after image on 小红书",
                  "DM 3 Montessori teachers you know personally",
                  "Follow up on any replies within 24 hours",
                ].map((task, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer text-sm" style={{ color: "#8aaa9a" }}>
                    <input type="checkbox" className="w-4 h-4 rounded accent-emerald-500" />
                    <span>{task}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
