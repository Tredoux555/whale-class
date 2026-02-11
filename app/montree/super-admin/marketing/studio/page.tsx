// @ts-nocheck
'use client';
import { useState } from "react";
import Link from 'next/link';

// ============================================
// MONTREE CREATIVE STUDIO
// Voiceover script, social card PNGs, Canva specs
// ============================================

function CopyBtn({ text, label }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="px-3 py-1.5 rounded text-xs font-semibold" style={{
        background: c ? "rgba(46,204,113,0.2)" : "rgba(46,204,113,0.08)",
        border: `1px solid ${c ? "rgba(46,204,113,0.4)" : "rgba(46,204,113,0.15)"}`,
        color: c ? "#2ecc71" : "#8aaa9a",
      }}>{c ? "✓" : label || "📋"}</button>
  );
}

// ============================================
// VOICEOVER SCRIPTS
// ============================================
const VOICEOVERS = [
  {
    name: "60-Second Pitch (matches pitch deck)",
    duration: "60 sec",
    use: "Record over montree-pitch-v2.html playing on screen. Screen record + voiceover = your YouTube/TikTok video.",
    script: `[0-5 sec — SCENE 1 OPENS: Sepia ledger fading in]
"This is how Montessori teachers track children's progress. By hand. In a ledger. In 2026."

[5-12 sec — Stats appear on screen]
"24 children. 213 individual works. That's over 5,000 data points — every single year — written by hand."

[12-18 sec — Hours counter]
"Teachers lose more than 8 hours every week to this paperwork. Hours that should be spent with children."

[18-22 sec — SCENE 2 OPENS: Montree interface appears]
"So I built Montree."

[22-30 sec — Tap animation cycling through statuses]
"One tap. That's all it takes. Not started. Presented. Practicing. Mastered. Real-time. During the work period."

[30-38 sec — Dashboard filling up]
"Your dashboard fills itself. Every child. Every area. You see your entire classroom at a glance."

[38-44 sec — Parent report generating]
"Parent reports? Auto-generated. One click to send. What used to take an entire weekend now takes three seconds."

[44-50 sec — SCENE 3 OPENS: Free pilot CTA]
"Montree is free for 3 months. No credit card. No commitment. Just a better way to run your classroom."

[50-57 sec — Mission text]
"Built by a Montessori teacher. Inside a real classroom. Because we deserve better tools."

[57-60 sec — Logo + URL]
"Montree. montree.xyz."`,
  },
  {
    name: "15-Second Hook (for TikTok/Reels)",
    duration: "15 sec",
    use: "Quick cut video for social media. Film yourself saying this, then cut to app screen recording.",
    script: `"Montessori teachers track over 5,000 data points a year — by hand."

[BEAT — hold up ledger book]

"What if it took one tap instead?"

[CUT TO: Screen recording of Montree tap animation]

"Montree. Free for 3 months. Link in bio."`,
  },
  {
    name: "30-Second DM Voice Note",
    duration: "30 sec",
    use: "Send as a WhatsApp/WeChat voice message to principals and teachers. More personal than text.",
    script: `"Hey! I'm a Montessori teacher in Beijing and I built something I think you'd find interesting. 

You know how we all spend hours after school filling in those records? I built a digital tool called Montree that lets you track everything with one tap during the work period. Parent reports generate automatically too.

I'm offering it free for 3 months to a few schools. Would you be open to taking a look? I can send you the link — it's montree.xyz."`,
  },
  {
    name: "Chinese Voiceover (WeChat/Bilibili)",
    duration: "45 sec",
    use: "For Chinese-language video content. WeChat moments, 小红书, Bilibili.",
    script: `"蒙氏老师每年需要手写记录超过5000个数据点。每周花8个多小时在这些文书工作上。"

"所以我做了Montree。"

"一键追踪。在工作时间内，点一下就记录了。已展示、练习中、已掌握。"

"家长报告？自动生成。3秒钟。"

"免费试用3个月。不需要信用卡。"

"Montree。由蒙氏老师打造，为蒙氏老师服务。montree.xyz"`,
  },
];

// ============================================
// SOCIAL CARDS (screenshot-ready designs)
// ============================================
const CARDS = [
  {
    id: "stat",
    name: "5,112 Stat Card",
    size: "1080×1080 (IG square)",
    platform: "Instagram, Facebook, 小红书",
  },
  {
    id: "before-after",
    name: "Before vs After",
    size: "1080×1080 (IG square)",
    platform: "Instagram, Facebook",
  },
  {
    id: "quickbooks",
    name: "QuickBooks Quote",
    size: "1080×1080 (IG square)",
    platform: "Instagram, Facebook, LinkedIn",
  },
  {
    id: "parent-report",
    name: "Parent Report Preview",
    size: "1080×1350 (IG portrait)",
    platform: "Instagram, 小红书",
  },
  {
    id: "tiktok-cover",
    name: "TikTok Series Cover",
    size: "1080×1920 (9:16)",
    platform: "TikTok thumbnail",
  },
];

// ============================================
// CANVA DESIGN SPECS
// ============================================
const CANVA_SPECS = {
  colors: {
    primary: "#2ecc71",
    dark: "#080f0b",
    darkCard: "#0d1a14",
    text: "#e8f5e9",
    muted: "#5a7a6a",
    accent: "#1a9c5a",
    sepia: "#c9b88a",
    danger: "#e74c3c",
  },
  fonts: {
    heading: "Playfair Display (Bold)",
    body: "DM Sans (Regular/Medium)",
    accent: "DM Sans (Bold)",
  },
  rules: [
    "Always use dark background (#080f0b or #0d1a14)",
    "Green (#2ecc71) for CTAs, highlights, and key stats",
    "Sepia (#c9b88a) for 'old world' / ledger references",
    "Red (#e74c3c) only for pain points and competitor weaknesses",
    "🌳 emoji as logo mark — always include on every card",
    "montree.xyz in small text at bottom of every card",
    "Max 30 words of text per card — less is more",
    "High contrast: white/green text on dark backgrounds",
  ],
};

// ============================================
// MAIN
// ============================================
export default function CreativeStudio() {
  const [tab, setTab] = useState("voiceover");
  const [selectedVO, setSelectedVO] = useState(0);
  const [selectedCard, setSelectedCard] = useState(0);

  return (
    <div className="min-h-screen" style={{ background: "#0a0f0d", color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-4 border-b border-slate-700"><Link href="/montree/super-admin/marketing" className="text-emerald-400 hover:text-emerald-300 text-sm">← Back to Marketing Hub</Link></div>
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">🎙️</span>
          <h1 className="text-lg font-bold" style={{ color: "#e8f5e9" }}>Montree Creative Studio</h1>
        </div>
        <p className="text-xs" style={{ color: "#5a7a6a" }}>Voiceover scripts, social card designs, and Canva design specs.</p>
      </div>

      <div className="flex border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {[
          { id: "voiceover", label: "🎙️ Voiceover Scripts" },
          { id: "cards", label: "🎨 Social Cards" },
          { id: "canva", label: "🎨 Canva Specs" },
          { id: "demo", label: "📱 Demo Instructions" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-3 text-xs font-medium whitespace-nowrap"
            style={{ color: tab === t.id ? "#2ecc71" : "#5a7a6a", borderBottom: tab === t.id ? "2px solid #2ecc71" : "2px solid transparent" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* VOICEOVER */}
        {tab === "voiceover" && (
          <div className="space-y-4">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              4 voiceover scripts for different formats. Read them while screen-recording the pitch deck or app demo.
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {VOICEOVERS.map((v, i) => (
                <button key={i} onClick={() => setSelectedVO(i)}
                  className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                  style={{
                    background: selectedVO === i ? "rgba(46,204,113,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedVO === i ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.04)"}`,
                    color: selectedVO === i ? "#2ecc71" : "#5a7a6a",
                  }}>
                  {v.name}
                </button>
              ))}
            </div>
            {(() => {
              const v = VOICEOVERS[selectedVO];
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold" style={{ color: "#e8f5e9" }}>{v.name}</div>
                      <div className="text-xs" style={{ color: "#5a7a6a" }}>Duration: {v.duration}</div>
                    </div>
                    <CopyBtn text={v.script} />
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(46,204,113,0.03)", border: "1px solid rgba(46,204,113,0.08)" }}>
                    <div className="text-xs mb-1 font-semibold" style={{ color: "#2ecc71" }}>HOW TO USE</div>
                    <div className="text-xs" style={{ color: "#8aaa9a" }}>{v.use}</div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <pre className="text-xs whitespace-pre-wrap" style={{ color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif", lineHeight: 2 }}>
                      {v.script}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* SOCIAL CARDS */}
        {tab === "cards" && (
          <div className="space-y-5">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              5 screenshot-ready card designs. Each renders below at the right dimensions. Screenshot them directly or recreate in Canva.
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {CARDS.map((c, i) => (
                <button key={c.id} onClick={() => setSelectedCard(i)}
                  className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                  style={{
                    background: selectedCard === i ? "rgba(46,204,113,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedCard === i ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.04)"}`,
                    color: selectedCard === i ? "#2ecc71" : "#5a7a6a",
                  }}>
                  {c.name}
                </button>
              ))}
            </div>

            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              {CARDS[selectedCard].size} — {CARDS[selectedCard].platform}
            </div>

            {/* Rendered Cards */}
            <div className="flex justify-center">
              {selectedCard === 0 && (
                <div style={{
                  width: 340, height: 340, background: "linear-gradient(145deg, #0a0f0d, #0d1a14)",
                  borderRadius: 16, padding: 32, display: "flex", flexDirection: "column",
                  justifyContent: "center", alignItems: "center", textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.06)",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "radial-gradient(circle, rgba(231,76,60,0.06), transparent 70%)", borderRadius: "50%" }} />
                  <div style={{ fontSize: 10, letterSpacing: 3, color: "#5a7a6a", textTransform: "uppercase", marginBottom: 16 }}>Every year, Montessori teachers record</div>
                  <div style={{ fontSize: 56, fontWeight: 900, color: "#e74c3c", lineHeight: 1, marginBottom: 8 }}>5,112</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8f5e9", marginBottom: 4 }}>data points by hand</div>
                  <div style={{ fontSize: 10, color: "#5a7a6a", marginBottom: 24 }}>24 children × 213 works</div>
                  <div style={{ fontSize: 13, color: "#2ecc71", fontWeight: 700 }}>What if it took one tap instead?</div>
                  <div style={{ position: "absolute", bottom: 16, fontSize: 10, color: "#3a5a4a" }}>🌳 montree.xyz</div>
                </div>
              )}

              {selectedCard === 1 && (
                <div style={{
                  width: 340, height: 340, display: "grid", gridTemplateColumns: "1fr 1fr",
                  borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ background: "linear-gradient(145deg, #1a1408, #2a1f0a)", padding: 20, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 10, color: "#c9b88a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Before</div>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>📒</div>
                    <div style={{ fontSize: 11, color: "#c9b88a", lineHeight: 1.6 }}>Handwritten ledger<br />8+ hrs/week<br />No parent access<br />Error-prone<br />Data trapped</div>
                  </div>
                  <div style={{ background: "linear-gradient(145deg, #0d1f17, #0a1610)", padding: 20, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 10, color: "#2ecc71", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>After</div>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>🌳</div>
                    <div style={{ fontSize: 11, color: "#a8c8b8", lineHeight: 1.6 }}>One-tap tracking<br />Real-time<br />Auto reports<br />AI guidance<br />Any device</div>
                  </div>
                </div>
              )}

              {selectedCard === 2 && (
                <div style={{
                  width: 340, height: 340, background: "linear-gradient(145deg, #080f0b, #0d1a14)",
                  borderRadius: 16, padding: 32, display: "flex", flexDirection: "column",
                  justifyContent: "center", alignItems: "center", textAlign: "center",
                  border: "1px solid rgba(46,204,113,0.1)",
                }}>
                  <div style={{ fontSize: 36, marginBottom: 20 }}>🌳</div>
                  <div style={{ fontSize: 9, letterSpacing: 3, color: "#5a7a6a", textTransform: "uppercase", marginBottom: 20 }}>Montree is</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e8f5e9", lineHeight: 1.5, marginBottom: 20, maxWidth: 260 }}>
                    "The QuickBooks moment<br />for Montessori"
                  </div>
                  <div style={{ fontSize: 11, color: "#5a7a6a", marginBottom: 20, maxWidth: 240, lineHeight: 1.5 }}>
                    Accountants stopped using ledgers 30 years ago. It's time for teachers to do the same.
                  </div>
                  <div style={{ fontSize: 11, color: "#2ecc71", fontWeight: 700 }}>Free 3-month pilot → montree.xyz</div>
                </div>
              )}

              {selectedCard === 3 && (
                <div style={{
                  width: 270, height: 340, background: "linear-gradient(145deg, #0d1a14, #0a1610)",
                  borderRadius: 16, padding: 20, overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 10, color: "#2ecc71", fontWeight: 700, marginBottom: 8 }}>🌳 Montree Progress Report</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e8f5e9", marginBottom: 2 }}>👦🏻 Li Wei</div>
                  <div style={{ fontSize: 9, color: "#5a7a6a", marginBottom: 12 }}>Whale Class · Feb 2026</div>
                  {[
                    { area: "Sensorial", pct: 75, color: "#e74c3c" },
                    { area: "Language", pct: 45, color: "#3498db" },
                    { area: "Math", pct: 60, color: "#f1c40f" },
                    { area: "Practical Life", pct: 90, color: "#2ecc71" },
                    { area: "Culture", pct: 30, color: "#9b59b6" },
                  ].map((a) => (
                    <div key={a.area} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 3 }}>
                        <span style={{ color: a.color, fontWeight: 600 }}>{a.area}</span>
                        <span style={{ color: "#5a7a6a" }}>{a.pct}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${a.pct}%`, background: a.color }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 9, color: "#3a5a4a", marginTop: 12, textAlign: "center" }}>
                    Auto-generated in 3 seconds · montree.xyz
                  </div>
                </div>
              )}

              {selectedCard === 4 && (
                <div style={{
                  width: 200, height: 340, background: "linear-gradient(180deg, #0a0f0d, #0d1a14 40%, rgba(46,204,113,0.05) 100%)",
                  borderRadius: 16, padding: 24, display: "flex", flexDirection: "column",
                  justifyContent: "space-between", alignItems: "center", textAlign: "center",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "#e74c3c", textTransform: "uppercase", fontWeight: 700 }}>The Ledger Problem</div>
                  <div>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📒→📱</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e8f5e9", marginBottom: 4 }}>Montree</div>
                    <div style={{ fontSize: 9, color: "#5a7a6a" }}>Episode 1 of 10</div>
                  </div>
                  <div style={{ fontSize: 10, color: "#2ecc71", fontWeight: 600 }}>🌳 montree.xyz</div>
                </div>
              )}
            </div>

            <div className="text-xs text-center" style={{ color: "#3a5a4a" }}>
              Right-click (or long-press on mobile) → Save Image. Or screenshot at exact dimensions.
            </div>
          </div>
        )}

        {/* CANVA SPECS */}
        {tab === "canva" && (
          <div className="space-y-5">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              If you want to recreate or customize these cards in Canva, here are the exact design specs.
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="text-sm font-bold mb-3" style={{ color: "#e8f5e9" }}>Color Palette</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CANVA_SPECS.colors).map(([name, hex]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ background: hex, border: "1px solid rgba(255,255,255,0.1)" }} />
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "#e8f5e9" }}>{name}</div>
                      <div className="text-xs" style={{ color: "#5a7a6a" }}>{hex}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="text-sm font-bold mb-3" style={{ color: "#e8f5e9" }}>Typography</div>
              {Object.entries(CANVA_SPECS.fonts).map(([use, font]) => (
                <div key={use} className="flex items-center justify-between text-xs mb-2">
                  <span style={{ color: "#5a7a6a", textTransform: "capitalize" }}>{use}:</span>
                  <span className="font-semibold" style={{ color: "#e8f5e9" }}>{font}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="text-sm font-bold mb-3" style={{ color: "#e8f5e9" }}>Design Rules</div>
              <div className="space-y-2">
                {CANVA_SPECS.rules.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "#a8c8b8" }}>
                    <span style={{ color: "#2ecc71" }}>•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="text-sm font-bold mb-3" style={{ color: "#e8f5e9" }}>Canvas Sizes</div>
              <div className="space-y-2 text-xs" style={{ color: "#a8c8b8" }}>
                <div>Instagram Square: <strong>1080 × 1080px</strong></div>
                <div>Instagram Portrait: <strong>1080 × 1350px</strong></div>
                <div>Instagram Story / TikTok: <strong>1080 × 1920px</strong></div>
                <div>Facebook Post: <strong>1200 × 630px</strong></div>
                <div>LinkedIn Post: <strong>1200 × 627px</strong></div>
                <div>OG Image: <strong>1200 × 630px</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* DEMO INSTRUCTIONS */}
        {tab === "demo" && (
          <div className="space-y-5">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              The interactive demo (montree-demo.jsx) is a standalone product experience. Here's how to use it everywhere.
            </div>

            {[
              {
                title: "Embed on Landing Page",
                detail: "Save montree-demo.jsx as a route in your Next.js app at /montree/demo. Link to it from the landing page CTA. People can try Montree without signing up.",
                color: "#2ecc71",
              },
              {
                title: "Share in DMs",
                detail: "Send the demo link directly to teachers and principals: 'Try it yourself — montree.xyz/demo'. No signup required. They tap around, experience the product, then sign up.",
                color: "#3498db",
              },
              {
                title: "Screen Record for TikTok",
                detail: "Open the demo on your phone. Screen record yourself tapping through it: classroom → child → tap tap tap → dashboard → report generates. Add voiceover from the 15-second script. Post as Episode 2.",
                color: "#ff0050",
              },
              {
                title: "Use in Cold Emails",
                detail: "Add to your email signature: 'Try the interactive demo → montree.xyz/demo'. Every cold email now has a low-friction way for people to experience the product.",
                color: "#f39c12",
              },
              {
                title: "Conference Booth / Presentation",
                detail: "Open the demo on a tablet at a conference booth. Let people tap through it themselves. The physical 'tap' interaction is memorable and shows how simple it is.",
                color: "#9b59b6",
              },
              {
                title: "Parent Groups",
                detail: "Share the demo in parent WeChat/WhatsApp groups. They'll naturally tap through to the parent report screen and see what they've been missing.",
                color: "#e74c3c",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl p-4" style={{
                background: `${item.color}05`,
                border: `1px solid ${item.color}15`,
              }}>
                <div className="text-sm font-bold mb-1" style={{ color: item.color }}>{item.title}</div>
                <div className="text-xs" style={{ color: "#a8c8b8", lineHeight: 1.7 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
