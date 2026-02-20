import { useState } from "react";

// ============================================
// REAL PROSPECT DATABASE
// ============================================

const PROSPECTS = {
  china: {
    label: "🇨🇳 China — Phase 1 (Your Home Market)",
    schools: [
      { name: "International Montessori School of Beijing (MSB)", city: "Beijing", type: "Pure Montessori", students: "400", fee: "¥240-329k/yr", website: "msb.edu.cn", email: "admissions@msb.edu.cn", notes: "Longest-running Montessori in China. AMS member. Dual language EN/CN. 400 students, 21 countries. Your FIRST target — you're in the same city.", priority: "🔴" },
      { name: "Blossom Montessori", city: "Beijing", type: "Pure Montessori", students: "~50", fee: "Private", website: "—", email: "—", notes: "Bilingual EN/CN for ages 6-12. Small school = easier to get a meeting with founder. Personal connection possible.", priority: "🔴" },
      { name: "Beijing International Bilingual Academy (BIBA)", city: "Beijing", type: "Montessori+IB", students: "~500", fee: "¥168-318k/yr", website: "bibachina.org", email: "admissions@bibachina.org", notes: "Early Years uses Montessori with IB PYP. Shunyi district. Their EY teachers would benefit most.", priority: "🟡" },
      { name: "Beijing New Talent Academy", city: "Beijing", type: "Montessori elements", students: "2,300", fee: "¥168-318k/yr", website: "bnt.com.cn", email: "—", notes: "Bilingual kindergarten uses Montessori elements. Massive school — harder to penetrate but huge prize.", priority: "🟡" },
      { name: "Kidtopia Montessori (AMI Training Center)", city: "Beijing", type: "AMI Training + School", students: "—", fee: "—", website: "—", email: "—", notes: "AMI-accredited TRAINING center in Beijing. If you get THEM on board, every teacher they train learns about Montree.", priority: "🔴" },
      { name: "Shanghai Singapore International School", city: "Shanghai", type: "Montessori EY", students: "1,400", fee: "¥130k+/yr", website: "ssis.asia", email: "—", notes: "Bilingual early-years model. 1,400 students. Shanghai market opener.", priority: "🟡" },
      { name: "Guidepost Montessori Hong Kong", city: "Hong Kong", type: "Pure Montessori", students: "—", fee: "—", website: "guidepostmontessori.com.hk", email: "—", notes: "11 CAMPUSES in HK. Network school = if one adopts, all could follow. AMI affiliated.", priority: "🔴" },
      { name: "Discovery Montessori School HK", city: "Hong Kong", type: "Pure Montessori", students: "—", fee: "—", website: "discovery.edu.hk", email: "—", notes: "First IB-accredited Montessori in HK/SEA. Premium market. Perfect fit.", priority: "🟡" },
      { name: "International Montessori School HK (IMS)", city: "Hong Kong", type: "Pure Montessori", students: "—", fee: "—", website: "ims.edu.hk", email: "—", notes: "6 Toddler + 14 Primary environments. Large operation. AMI affiliated.", priority: "🟡" },
    ],
  },
  southafrica: {
    label: "🇿🇦 South Africa — Phase 2 (The Mission Market)",
    schools: [
      { name: "Village Montessori School", city: "—", type: "Pure Montessori", students: "—", fee: "—", website: "—", email: "—", notes: "SAMA member. Your story resonates strongest with SA schools — farm, school that was shut down, building back.", priority: "🔴" },
      { name: "The Cotswold Montessori Country School", city: "—", type: "Pure Montessori", students: "—", fee: "—", website: "—", email: "—", notes: "Country school. Montessori values. Your background will connect instantly.", priority: "🟡" },
      { name: "Rainbow Montessori School", city: "—", type: "Pure Montessori", students: "—", fee: "—", website: "—", email: "—", notes: "SAMA member.", priority: "🟡" },
      { name: "Knysna Montessori School", city: "Knysna", type: "Pure Montessori", students: "—", fee: "—", website: "—", email: "—", notes: "Garden Route. Beautiful community school.", priority: "🟡" },
      { name: "Centurion Montessori School", city: "Centurion", type: "Pure Montessori", students: "—", fee: "—", website: "—", email: "—", notes: "Gauteng. Urban market.", priority: "🟡" },
      { name: "Hilton Montessori", city: "Hilton", type: "Pure Montessori", students: "—", fee: "—", website: "—", email: "—", notes: "KZN. Well-established.", priority: "🟡" },
      { name: "Auburn House School", city: "—", type: "Montessori", students: "—", fee: "—", website: "—", email: "—", notes: "SAMA member school.", priority: "🟡" },
      { name: "Modderfontein Montessori", city: "Johannesburg", type: "Pure Montessori", students: "—", fee: "—", website: "—", email: "—", notes: "JHB market.", priority: "🟡" },
      { name: "Melville Montessori", city: "Johannesburg", type: "Pure Montessori", students: "—", fee: "—", website: "—", email: "—", notes: "JHB market.", priority: "🟡" },
      { name: "Montessori Academy and College", city: "—", type: "Training + School", students: "—", fee: "—", website: "—", email: "—", notes: "TRAINING institution. Same strategy as Kidtopia — get trainers on board, every graduate learns Montree.", priority: "🔴" },
      { name: "MELF (Montessori Education Learning Foundation)", city: "National", type: "Training Center", students: "—", fee: "—", website: "melf.co.za", email: "—", notes: "National training center with facilities across SA. SAMA member. 20 years experience. If MELF teaches Montree to their students, it becomes standard.", priority: "🔴" },
      { name: "Wonderkids Montessori", city: "—", type: "Preschool + Primary + Training", students: "—", fee: "—", website: "—", email: "—", notes: "School AND training center. Double opportunity.", priority: "🟡" },
      { name: "SAMA Member Schools (all)", city: "National", type: "Association", students: "—", fee: "—", website: "samontessori.org.za", email: "—", notes: "The South African Montessori Association. Getting SAMA endorsement = instant credibility with every member school. Contact them about a partnership.", priority: "🔴" },
    ],
  },
  international: {
    label: "🌍 International — Phase 3 (Scale)",
    schools: [
      { name: "AMS Member Schools", city: "USA / Global", type: "5,000+ schools", students: "—", fee: "—", website: "amshq.org/schools", email: "—", notes: "AMS directory has 5,000+ schools. Search by region. Start with schools that list email addresses.", priority: "🟢" },
      { name: "AMI Affiliated Schools", city: "Global", type: "Global network", students: "—", fee: "—", website: "montessori-ami.org", email: "—", notes: "AMI is the 'original' Montessori organization. More traditional. Country-by-country directories.", priority: "🟢" },
      { name: "NAMTA Schools", city: "North America", type: "1,000+ schools", students: "—", fee: "—", website: "montessori-namta.org/school-directory", email: "—", notes: "North American focus. Searchable by state/province.", priority: "🟢" },
      { name: "Montessori Foundation", city: "Global", type: "Global directory", students: "—", fee: "—", website: "montessori.org/montessori-school-directory", email: "—", notes: "Global directory. Good for finding schools outside US.", priority: "🟢" },
      { name: "Montessori Global Education / STAR Schools", city: "UK / International", type: "500+ schools", students: "—", fee: "—", website: "montessori-globaleducation.org", email: "—", notes: "UK-focused but international. STAR-recognised schools = quality schools = ideal targets.", priority: "🟢" },
    ],
  },
};

// ============================================
// WHATSAPP BROADCAST MESSAGES
// ============================================
const WHATSAPP_MESSAGES = [
  {
    id: "teacher-friend",
    name: "To Teacher Friends (Personal)",
    message: `Hey! 👋 Quick question — how many hours a week do you spend on record-keeping?

I built something that completely changed my workflow. Instead of filling in records after school, I track everything during the work period with one tap on my phone.

Parent reports generate automatically too 😅

I'm looking for a few teachers to try it free for 3 months. Honest feedback only — no strings.

Want me to send you the link?

🌳 montree.xyz`,
  },
  {
    id: "teacher-group",
    name: "To Teacher WhatsApp Groups",
    message: `Has anyone else calculated how many hours they spend on Montessori record-keeping? 🤔

I did the math:
📒 24 children × 213 works = 5,112 data points per year
⏰ That's 8+ hours lost EVERY week

I'm a Montessori teacher in Beijing and I built a tool that replaces the entire ledger with one-tap digital tracking. Auto parent reports too.

Free for any teacher who wants to try it → montree.xyz

Would love to hear what you think! 🌳`,
  },
  {
    id: "parent-network",
    name: "To Parent Network (Beijing)",
    message: `Hi! I'm a Montessori teacher and I wanted to share something I've been building 😊

You know how most Montessori schools send pretty basic progress updates? "Your child had a good week" etc.

I built a system where parents can see exactly what their child is working on — which curriculum areas, which specific materials, visual progress bars for each area.

The reports look like this: [SCREENSHOT]

If your school is interested in trying it, I'm offering free 3-month pilots.

montree.xyz 🌳`,
  },
  {
    id: "principal-direct",
    name: "Direct to Principals (WeChat/WhatsApp)",
    message: `Hi [Name],

I'm a fellow Montessori educator — I teach at [school] in Beijing.

I noticed a problem in every Montessori classroom I've worked in: teachers spend 8+ hours a week on handwritten records. So I built a digital solution specifically for Montessori.

Would you be open to a quick look? It's called Montree — one-tap tracking, auto parent reports, full curriculum mapped.

I'm offering free 3-month pilots to schools. No cost, no commitment.

montree.xyz

Would love to chat if you're interested! 🌳`,
  },
  {
    id: "followup-warm",
    name: "Follow-Up (after no response)",
    message: `Hey [Name]! Just following up — totally understand if the timing isn't right.

One teacher told me she saved 6 hours her first week using Montree. Just thought you'd want to know 😊

The offer still stands — montree.xyz

No pressure at all! 🌳`,
  },
  {
    id: "wechat-cn",
    name: "WeChat — Chinese Version",
    message: `您好！我是一名在北京国际学校工作的蒙氏老师 👋

我发现了一个问题：蒙氏老师每周要花8个多小时手写教学记录。所以我自己做了一个工具。

🌳 Montree — 一键追踪教学进度，家长报告自动生成

我正在为学校提供3个月免费试用。

有兴趣了解一下吗？可以先看看 montree.xyz

谢谢！🙏`,
  },
];

// ============================================
// OG IMAGE SPEC
// ============================================
const OG_SPEC = {
  dimensions: "1200×630px",
  format: "PNG",
  design: `
    Background: Dark gradient (#080f0b → #0d1f17)
    Left side: Faded sepia ledger texture (30% opacity)
    Right side: Green glow from Montree dashboard
    Center text:
      "Montree 🌳" — Playfair Display, 42px, white
      "The QuickBooks moment for Montessori" — DM Sans, 20px, #2ecc71
      "One-tap tracking · Auto reports · AI guidance" — DM Sans, 14px, #8aaa9a
    Bottom: "montree.xyz — Free 3-month pilot" — DM Sans, 12px, #5a7a6a
    Top-left corner: 🌳 logo mark (32px)
  `,
};

// ============================================
// COPY BUTTON
// ============================================
function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
      style={{
        background: copied ? "rgba(46,204,113,0.2)" : "rgba(46,204,113,0.08)",
        border: `1px solid ${copied ? "rgba(46,204,113,0.4)" : "rgba(46,204,113,0.15)"}`,
        color: copied ? "#2ecc71" : "#8aaa9a",
      }}
    >
      {copied ? "✓" : label || "📋"}
    </button>
  );
}

// ============================================
// MAIN
// ============================================
export default function ProspectHQ() {
  const [tab, setTab] = useState("prospects");
  const [region, setRegion] = useState("china");
  const [selectedMsg, setSelectedMsg] = useState(0);

  return (
    <div className="min-h-screen" style={{ background: "#0a0f0d", color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">🎯</span>
          <h1 className="text-lg font-bold" style={{ color: "#e8f5e9" }}>Montree Prospect HQ</h1>
        </div>
        <p className="text-xs" style={{ color: "#5a7a6a" }}>
          Real schools. Real contacts. Real messages. Go hunt.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {[
          { id: "prospects", label: "🏫 School Hit List" },
          { id: "whatsapp", label: "💬 WhatsApp Templates" },
          { id: "playbook", label: "📖 Outreach Playbook" },
          { id: "ogimage", label: "🖼 OG Image Spec" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-3 text-xs font-medium whitespace-nowrap transition-all"
            style={{
              color: tab === t.id ? "#2ecc71" : "#5a7a6a",
              borderBottom: tab === t.id ? "2px solid #2ecc71" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* PROSPECTS */}
        {tab === "prospects" && (
          <div>
            {/* Region selector */}
            <div className="flex gap-2 mb-5">
              {Object.entries(PROSPECTS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setRegion(key)}
                  className="px-4 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: region === key ? "rgba(46,204,113,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${region === key ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.04)"}`,
                    color: region === key ? "#2ecc71" : "#5a7a6a",
                  }}
                >
                  {val.label.split(" — ")[0]}
                </button>
              ))}
            </div>

            <h2 className="text-sm font-semibold mb-4" style={{ color: "#e8f5e9" }}>
              {PROSPECTS[region].label}
            </h2>

            {/* Priority legend */}
            <div className="flex gap-4 mb-4 text-xs" style={{ color: "#5a7a6a" }}>
              <span>🔴 High priority — contact FIRST</span>
              <span>🟡 Medium — Week 2-3</span>
              <span>🟢 Phase 3 — after proof</span>
            </div>

            <div className="space-y-3">
              {PROSPECTS[region].schools.map((s, i) => (
                <div key={i} className="rounded-xl p-4" style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${s.priority === "🔴" ? "rgba(231,76,60,0.12)" : "rgba(255,255,255,0.04)"}`,
                }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{s.priority}</span>
                        <span className="text-sm font-bold" style={{ color: "#e8f5e9" }}>{s.name}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs" style={{ color: "#5a7a6a" }}>
                        {s.city !== "—" && <span>📍 {s.city}</span>}
                        <span>{s.type}</span>
                        {s.students !== "—" && <span>👥 {s.students}</span>}
                        {s.fee !== "—" && <span>💰 {s.fee}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs mt-2" style={{ color: "#a8c8b8", lineHeight: 1.7 }}>{s.notes}</div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {s.website !== "—" && (
                      <a
                        href={`https://${s.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded text-xs"
                        style={{ background: "rgba(255,255,255,0.04)", color: "#8aaa9a", textDecoration: "none", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        🔗 {s.website}
                      </a>
                    )}
                    {s.email !== "—" && (
                      <a
                        href={`mailto:${s.email}`}
                        className="px-3 py-1 rounded text-xs"
                        style={{ background: "rgba(46,204,113,0.06)", color: "#2ecc71", textDecoration: "none", border: "1px solid rgba(46,204,113,0.12)" }}
                      >
                        📧 {s.email}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WHATSAPP TEMPLATES */}
        {tab === "whatsapp" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              <div className="text-xs mb-3" style={{ color: "#5a7a6a" }}>
                6 message templates for different audiences. Copy, personalize, send.
              </div>
              {WHATSAPP_MESSAGES.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMsg(i)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all"
                  style={{
                    background: selectedMsg === i ? "rgba(7,193,96,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedMsg === i ? "rgba(7,193,96,0.2)" : "rgba(255,255,255,0.04)"}`,
                    color: selectedMsg === i ? "#07C160" : "#8aaa9a",
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "#e8f5e9" }}>
                  {WHATSAPP_MESSAGES[selectedMsg].name}
                </span>
                <CopyBtn text={WHATSAPP_MESSAGES[selectedMsg].message} label="📋 Copy" />
              </div>
              <div className="rounded-xl p-5" style={{
                background: "rgba(7,193,96,0.03)",
                border: "1px solid rgba(7,193,96,0.1)",
              }}>
                <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{
                  color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif",
                }}>
                  {WHATSAPP_MESSAGES[selectedMsg].message}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* OUTREACH PLAYBOOK */}
        {tab === "playbook" && (
          <div className="space-y-6">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              Step-by-step outreach execution. Follow this order.
            </div>

            {[
              {
                phase: "Phase 1: Warm Circle (Week 1)",
                color: "#2ecc71",
                steps: [
                  "Message 5 teacher friends on WhatsApp with the 'Teacher Friend' template",
                  "Post in your school's parent WeChat group (use 'Parent Network' template)",
                  "DM 3 teachers you met at AMS training events",
                  "Share demo link with your school's admin team",
                  "Ask your head teacher if they'd be open to a pilot",
                ],
              },
              {
                phase: "Phase 2: Beijing Schools (Week 2-3)",
                color: "#3498db",
                steps: [
                  "Email MSB admissions (admissions@msb.edu.cn) — use cold principal template",
                  "Find Blossom Montessori founder on WeChat — personal message",
                  "Email BIBA early years coordinator — mention their Montessori+IB approach",
                  "Contact Kidtopia training center — offer Montree as training resource",
                  "Visit MSB open day (they had one recently) — demo Montree in person",
                  "Search '蒙特梭利' + '北京' on 小红书 for parent communities to post in",
                ],
              },
              {
                phase: "Phase 3: South Africa (Week 3-4)",
                color: "#f39c12",
                steps: [
                  "Contact SAMA (samontessori.org.za) — propose partnership/endorsement",
                  "Email MELF training center (melf.co.za) — offer as training tool",
                  "Message Village Montessori and Cotswold Montessori — lead with your SA story",
                  "Search SAMA 'Find a School' directory for all member school contacts",
                  "Post in SA Montessori Facebook groups",
                  "Share your founder story — the farm, the school that was shut down, the mission",
                ],
              },
              {
                phase: "Phase 4: Hong Kong + International (Month 2+)",
                color: "#9b59b6",
                steps: [
                  "Contact Guidepost Montessori HK (11 campuses — network effect)",
                  "Email Discovery Montessori School HK",
                  "Begin AMS directory cold emails (5 per week)",
                  "Upload full pitch video to YouTube — target 'Montessori software' SEO",
                  "Start LinkedIn outreach to Montessori school heads internationally",
                  "Apply to speak at next AMS or AMI conference (use pitch deck)",
                ],
              },
            ].map((phase) => (
              <div key={phase.phase} className="rounded-xl overflow-hidden" style={{
                border: `1px solid ${phase.color}20`,
              }}>
                <div className="px-5 py-3" style={{
                  background: `${phase.color}10`,
                  borderBottom: `1px solid ${phase.color}15`,
                }}>
                  <span className="text-sm font-semibold" style={{ color: phase.color }}>
                    {phase.phase}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  {phase.steps.map((step, i) => (
                    <label key={i} className="flex items-start gap-3 text-xs cursor-pointer" style={{ color: "#a8c8b8" }}>
                      <input type="checkbox" className="mt-0.5 accent-emerald-500" />
                      <span style={{ lineHeight: 1.6 }}>{step}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* OG IMAGE SPEC */}
        {tab === "ogimage" && (
          <div className="space-y-5">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              When anyone shares montree.xyz on Facebook, WhatsApp, LinkedIn, Slack, or any platform — this image appears.
              It's the first thing people see. Make it count.
            </div>

            {/* Visual preview */}
            <div className="rounded-xl overflow-hidden" style={{
              border: "1px solid rgba(255,255,255,0.06)",
              aspectRatio: "1200/630",
              background: "linear-gradient(135deg, #1a1408 0%, #0d1f17 50%, #0a1610 100%)",
              padding: 40, display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "center", textAlign: "center",
              position: "relative",
            }}>
              {/* Faint ledger texture left side */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: "40%",
                opacity: 0.04,
              }}>
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} style={{ height: 1, background: "#c9b88a", marginTop: 24, marginLeft: 30, marginRight: 10 }} />
                ))}
              </div>

              {/* Green glow right */}
              <div style={{
                position: "absolute", right: -50, top: -50, width: 300, height: 300,
                background: "radial-gradient(circle, rgba(46,204,113,0.08) 0%, transparent 70%)",
                borderRadius: "50%",
              }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🌳</div>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 28,
                  fontWeight: 700, color: "#e8f5e9", marginBottom: 8,
                }}>Montree</div>
                <div style={{
                  fontSize: 16, color: "#2ecc71", fontWeight: 600, marginBottom: 12,
                }}>The QuickBooks moment for Montessori</div>
                <div style={{ fontSize: 12, color: "#8aaa9a" }}>
                  One-tap tracking · Auto parent reports · AI curriculum guidance
                </div>
                <div style={{
                  marginTop: 20, display: "inline-block",
                  background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.2)",
                  borderRadius: 6, padding: "6px 16px",
                  fontSize: 11, color: "#2ecc71",
                }}>
                  montree.xyz — Free 3-month pilot
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "#e8f5e9" }}>Technical Spec</div>
              <div className="text-xs space-y-1" style={{ color: "#8aaa9a" }}>
                <div><strong>Dimensions:</strong> 1200 × 630px (standard OG image)</div>
                <div><strong>Format:</strong> PNG, &lt;1MB</div>
                <div><strong>Save as:</strong> <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 3 }}>public/og-image.png</code></div>
                <div><strong>Reference in:</strong> Landing page meta tags (already added)</div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(46,204,113,0.04)", border: "1px solid rgba(46,204,113,0.1)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "#2ecc71" }}>💡 How to create</div>
              <div className="text-xs" style={{ color: "#8aaa9a", lineHeight: 1.8 }}>
                Option 1: Screenshot the preview above at exactly 1200×630px<br />
                Option 2: Recreate in Canva using these specs<br />
                Option 3: Ask Desktop Claude to generate it as a PNG using canvas<br /><br />
                Save to: <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 3 }}>~/Desktop/ACTIVE/whale/public/og-image.png</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
