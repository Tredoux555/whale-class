import { useState } from "react";

// ============================================
// MONTREE MISSION CONTROL
// The ONE file that ties everything together.
// ============================================

const FILES = {
  pitch: { name: "montree-pitch-v2.html", desc: "3-Scene animated pitch deck", icon: "🎬" },
  playbook: { name: "montree-playbook.html", desc: "Full business strategy bible", icon: "📖" },
  landing: { name: "montree-landing.html", desc: "Conversion landing page", icon: "🌐" },
  links: { name: "montree-links.html", desc: "Linktree-style link hub", icon: "🔗" },
  outreach: { name: "montree-outreach.jsx", desc: "Email templates + school directories", icon: "📧" },
  content: { name: "montree-content-factory.jsx", desc: "Social cards + WeChat + captions", icon: "🎨" },
  warroom: { name: "montree-platform-warroom.jsx", desc: "TikTok scripts + IG + FB + 30-day plan", icon: "🎵" },
  prospects: { name: "montree-prospect-hq.jsx", desc: "School hit list + WhatsApp templates", icon: "🎯" },
  growth: { name: "montree-growth-engine.jsx", desc: "Influencers + SEO + onboarding emails", icon: "⚡" },
};

// ============================================
// THE MASTER PLAN: 5 PHASES
// ============================================
const PHASES = [
  {
    id: "video",
    name: "Phase 0: The Personal Video",
    subtitle: "Record ONE video. Everything else follows from this.",
    color: "#e74c3c",
    duration: "Day 1",
    description: "This is your hard launch. One authentic video, filmed on your phone, in your classroom or at your desk. This single video becomes the seed for EVERYTHING — TikTok, Instagram, Facebook, WeChat, cold emails, your landing page. Record it first, distribute it everywhere.",
    steps: [
      {
        task: "Choose your script",
        detail: "Pick Episode 1 (The Ledger Problem) or Episode 7 (Teacher Who Coded During Naptime). Episode 1 is safer. Episode 7 has more viral potential.",
        file: "warroom",
        tab: "TikTok Scripts → Ep 1 or Ep 7",
        time: "5 min",
      },
      {
        task: "Film the video",
        detail: "Phone on selfie mode. Real desk. Real ledger if you have one. No editing needed — raw is better. Follow the beat-by-beat script. Under 60 seconds.",
        file: null,
        tab: null,
        time: "15 min",
      },
      {
        task: "Add text overlay + music",
        detail: "Use CapCut (free). Add the on-screen text from the script. Optional: add trending sound or just use your voice. Export at 9:16 vertical.",
        file: null,
        tab: null,
        time: "20 min",
      },
      {
        task: "Post to TikTok",
        detail: "Upload. Use the hashtags from the script. Add 'Link in bio → montree.xyz'. Done.",
        file: "warroom",
        tab: "TikTok Scripts → copy hashtags",
        time: "5 min",
      },
      {
        task: "Cross-post to Instagram Reels",
        detail: "Same video, same caption. Instagram rewards Reels from other platforms less, but it still works for your first post.",
        file: "warroom",
        tab: "Bios & Tags → copy IG hashtags",
        time: "5 min",
      },
      {
        task: "Share to Facebook",
        detail: "Post natively on your Montree Facebook page. Do NOT share a TikTok link — upload the video file directly.",
        file: null,
        tab: null,
        time: "5 min",
      },
      {
        task: "Share to WeChat Moments",
        detail: "Post with Chinese caption from the caption bank.",
        file: "content",
        tab: "Caption Bank → 小红书/WeChat captions",
        time: "5 min",
      },
    ],
  },
  {
    id: "foundation",
    name: "Phase 1: Set Up Your Channels",
    subtitle: "Get all platforms ready so every link works before you send traffic.",
    color: "#3498db",
    duration: "Day 1-2",
    description: "Before you send a single DM or email, make sure every touchpoint is polished. Someone clicks your bio link — it should work. Someone visits montree.xyz — it should convert. This takes 1-2 hours total.",
    steps: [
      {
        task: "Set up TikTok bio",
        detail: "Copy the TikTok bio. Set profile pic to 🌳 or a classroom photo. Link: montree.xyz",
        file: "warroom",
        tab: "Bios & Tags → TikTok bio → Copy",
        time: "5 min",
      },
      {
        task: "Set up Instagram bio",
        detail: "Copy the Instagram bio. Same profile pic. Link: montree.xyz",
        file: "warroom",
        tab: "Bios & Tags → Instagram bio → Copy",
        time: "5 min",
      },
      {
        task: "Set up Facebook page",
        detail: "Create page 'Montree — Modern Montessori Tools'. Copy bio. Add cover photo.",
        file: "warroom",
        tab: "Bios & Tags → Facebook bio → Copy",
        time: "15 min",
      },
      {
        task: "Set up WeChat public account",
        detail: "Copy the WeChat bio. This is your Chinese-language channel.",
        file: "warroom",
        tab: "Bios & Tags → WeChat bio → Copy",
        time: "15 min",
      },
      {
        task: "Deploy landing page to montree.xyz",
        detail: "Give montree-landing.html to Desktop Claude with instruction: 'Save this as the landing page at montree.xyz'. Or manually put it in public/ folder.",
        file: "landing",
        tab: "Full HTML file",
        time: "15 min",
      },
      {
        task: "Deploy links page",
        detail: "Save montree-links.html to montree.xyz/links. This is your universal bio link.",
        file: "links",
        tab: "Full HTML file",
        time: "5 min",
      },
      {
        task: "Update all bio links to montree.xyz/links",
        detail: "Every platform bio should link to the same place. One link to rule them all.",
        file: null,
        tab: null,
        time: "5 min",
      },
    ],
  },
  {
    id: "warmcircle",
    name: "Phase 2: Warm Circle",
    subtitle: "Message the people who already know you. This is where your first pilot schools come from.",
    color: "#2ecc71",
    duration: "Day 2-7",
    description: "Your first 3 pilot schools won't come from strangers on the internet. They'll come from teachers and principals you already know. WhatsApp messages, personal DMs, face-to-face conversations. Use the warm templates — they're casual, not salesy.",
    steps: [
      {
        task: "Message 5 teacher friends on WhatsApp",
        detail: "Use the 'Teacher Friend' template. Personalize each one. Ask for honest feedback, not sales.",
        file: "prospects",
        tab: "WhatsApp Templates → Teacher Friends",
        time: "15 min",
      },
      {
        task: "Message 3 teachers from AMS training",
        detail: "Anyone you met during certification. Use same template but mention the shared AMS connection.",
        file: "prospects",
        tab: "WhatsApp Templates → Teacher Friends",
        time: "10 min",
      },
      {
        task: "Send to your school's parent WeChat group",
        detail: "Use the parent network template. Show the auto-generated report feature.",
        file: "prospects",
        tab: "WhatsApp Templates → Parent Network",
        time: "5 min",
      },
      {
        task: "DM principals you know personally",
        detail: "If you know ANY school heads directly, use the principal template. Personal > cold.",
        file: "prospects",
        tab: "WhatsApp Templates → Direct to Principals",
        time: "10 min",
      },
      {
        task: "Post 2nd TikTok (Episode 2: The Solution)",
        detail: "Screen-record the actual Montree app working. Show the tap animation.",
        file: "warroom",
        tab: "TikTok Scripts → Ep 2",
        time: "30 min",
      },
      {
        task: "Post first Instagram carousel",
        detail: "Use 'The Ledger Problem' carousel. Create in Canva using the slide specs.",
        file: "warroom",
        tab: "IG Carousels → The Ledger Problem",
        time: "20 min",
      },
      {
        task: "Follow up on any replies within 24 hours",
        detail: "If ANYONE responds, reply immediately. Offer a 15-min video call to walk them through it.",
        file: null,
        tab: null,
        time: "ongoing",
      },
    ],
  },
  {
    id: "coldoutreach",
    name: "Phase 3: Cold Outreach",
    subtitle: "Now go find strangers. Email principals. DM influencers. Join Facebook groups.",
    color: "#f39c12",
    duration: "Week 2-3",
    description: "Your warm circle gives you your first 1-3 pilot schools. Cold outreach gets you to 10. This is where the email templates, school hit list, Facebook groups, and influencer targets come in. Do a little every day — 30 minutes max.",
    steps: [
      {
        task: "Email MSB Beijing (admissions@msb.edu.cn)",
        detail: "Your #1 target. Same city as you. Use the cold principal email template. Personalize it with MSB-specific details.",
        file: "outreach",
        tab: "Email Templates → Cold Principal",
        time: "10 min",
      },
      {
        task: "Email 4 more schools from the hit list",
        detail: "Pick the 🔴 priority schools from your region. Personalize each email.",
        file: "prospects",
        tab: "School Hit List → China",
        time: "20 min",
      },
      {
        task: "Join 3 Facebook Montessori groups",
        detail: "Join, observe for 3 days, comment helpfully, THEN post content. Golden Rule.",
        file: "warroom",
        tab: "FB Groups → all 7 targets",
        time: "10 min/day",
      },
      {
        task: "DM 3 influencers",
        detail: "Start with 🔴 priority: @missymontessori, @trilliummontessori, @beginnersdigitalmontessori. Use the DM template.",
        file: "growth",
        tab: "Influencer Targets → DM template",
        time: "15 min",
      },
      {
        task: "Post TikTok episodes 3-6 (one every 2 days)",
        detail: "Keep the series momentum going. The algorithm rewards consistent posting.",
        file: "warroom",
        tab: "TikTok Scripts → Ep 3-6",
        time: "30 min each",
      },
      {
        task: "Post social cards on Instagram",
        detail: "The 5,112 stat card and Before/After card are your strongest performers.",
        file: "content",
        tab: "Social Cards → cards 1-3",
        time: "10 min each",
      },
      {
        task: "Publish WeChat article",
        detail: "The full Chinese-language article is pre-written. Format and publish on 公众号.",
        file: "content",
        tab: "WeChat Article → full article",
        time: "20 min",
      },
      {
        task: "Follow up on all cold emails (Day 7)",
        detail: "Use the follow-up email template. Mention the AI Guru feature.",
        file: "outreach",
        tab: "Email Templates → Follow-Up",
        time: "15 min",
      },
      {
        task: "Contact SAMA (South Africa Montessori Association)",
        detail: "Propose partnership. Your SA story is your greatest weapon here.",
        file: "prospects",
        tab: "School Hit List → South Africa → SAMA",
        time: "15 min",
      },
    ],
  },
  {
    id: "scale",
    name: "Phase 4: Scale & Convert",
    subtitle: "Pilot schools are using Montree. Now convert them and build proof.",
    color: "#9b59b6",
    duration: "Month 2-3",
    description: "By now you should have 3-10 pilot schools. The onboarding email sequence keeps them engaged. Testimonials start coming in. Blog posts start ranking. Conference applications go out. This is the snowball phase.",
    steps: [
      {
        task: "Send onboarding emails to all pilot schools",
        detail: "7-email sequence over 80 days. Set calendar reminders for each send date.",
        file: "growth",
        tab: "Pilot Email Sequence → all 7 emails",
        time: "5 min each",
      },
      {
        task: "Collect testimonials at Day 30",
        detail: "Email #5 asks for feedback. Use the 7 testimonial questions.",
        file: "growth",
        tab: "Testimonial System → Questions",
        time: "5 min to ask",
      },
      {
        task: "Post Episode 10 (The Mission)",
        detail: "Your SA farm story. Save this for when you have 500+ followers. This is the emotional bomb.",
        file: "warroom",
        tab: "TikTok Scripts → Ep 10",
        time: "30 min",
      },
      {
        task: "Write first SEO blog post",
        detail: "Start with 'Best Montessori Record-Keeping Software 2026'. It'll rank fastest.",
        file: "growth",
        tab: "SEO Blog Strategy → Post 1",
        time: "2 hours",
      },
      {
        task: "Submit conference talk proposal",
        detail: "The proposal is pre-written. Submit to AMS first (largest conference).",
        file: "growth",
        tab: "Conference Talks → proposal",
        time: "15 min",
      },
      {
        task: "Send conversion email at Day 80",
        detail: "The pilot-to-paid conversation. Personal, not pushy.",
        file: "growth",
        tab: "Pilot Email Sequence → Day 80",
        time: "5 min per school",
      },
      {
        task: "Add real testimonials to landing page",
        detail: "Replace the placeholder quotes with real ones from pilot schools.",
        file: "landing",
        tab: "Update testimonial section",
        time: "30 min",
      },
      {
        task: "Start second round of cold emails (10 new schools)",
        detail: "Now you have proof. Include testimonials in your outreach.",
        file: "outreach",
        tab: "Email Templates + School Directories",
        time: "30 min",
      },
    ],
  },
];

// ============================================
// FILE MAP (for reference tab)
// ============================================
const FILE_MAP = [
  { file: "montree-pitch-v2.html", purpose: "Show to principals. Embed on landing page. Play at conferences.", phase: "All" },
  { file: "montree-playbook.html", purpose: "Your strategy bible. Read this when you feel lost.", phase: "Reference" },
  { file: "montree-landing.html", purpose: "Deploy to montree.xyz. Where all traffic goes.", phase: "Phase 1" },
  { file: "montree-links.html", purpose: "Deploy to montree.xyz/links. Bio link for all platforms.", phase: "Phase 1" },
  { file: "montree-outreach.jsx", purpose: "Copy email templates. Find school directories.", phase: "Phase 3" },
  { file: "montree-content-factory.jsx", purpose: "Copy social cards, captions, WeChat article.", phase: "Phase 2-3" },
  { file: "montree-platform-warroom.jsx", purpose: "TikTok scripts, IG carousels, FB groups, bios, 30-day plan.", phase: "Phase 0-3" },
  { file: "montree-prospect-hq.jsx", purpose: "Real school names, WhatsApp templates, outreach playbook.", phase: "Phase 2-3" },
  { file: "montree-growth-engine.jsx", purpose: "Influencers, conferences, SEO, onboarding emails, testimonials.", phase: "Phase 3-4" },
];

// ============================================
// COMPONENTS
// ============================================
function Checkbox({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
      style={{
        borderColor: checked ? "#2ecc71" : "rgba(255,255,255,0.15)",
        background: checked ? "rgba(46,204,113,0.2)" : "transparent",
      }}
    >
      {checked && <span style={{ color: "#2ecc71", fontSize: 12, fontWeight: 900 }}>✓</span>}
    </button>
  );
}

// ============================================
// MAIN
// ============================================
export default function MissionControl() {
  const [activePhase, setActivePhase] = useState("video");
  const [tab, setTab] = useState("plan");
  const [checks, setChecks] = useState({});

  const toggle = (key) => setChecks((p) => ({ ...p, [key]: !p[key] }));

  const phase = PHASES.find((p) => p.id === activePhase);
  const totalSteps = PHASES.reduce((a, p) => a + p.steps.length, 0);
  const completedSteps = Object.values(checks).filter(Boolean).length;
  const pct = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="min-h-screen" style={{ background: "#080f0b", color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="p-5 pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🌳</span>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#e8f5e9" }}>Montree Mission Control</h1>
            <p className="text-xs" style={{ color: "#5a7a6a" }}>One dashboard. Every step. From first video to first paying school.</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 mb-1">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "#5a7a6a" }}>Overall Progress</span>
            <span style={{ color: "#2ecc71" }}>{completedSteps}/{totalSteps} steps ({pct}%)</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #1a9c5a, #2ecc71)" }} />
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {[
          { id: "plan", label: "📋 Step-by-Step Plan" },
          { id: "files", label: "📁 File Map" },
          { id: "quickref", label: "⚡ Quick Reference" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-3 text-xs font-medium"
            style={{ color: tab === t.id ? "#2ecc71" : "#5a7a6a", borderBottom: tab === t.id ? "2px solid #2ecc71" : "2px solid transparent" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* STEP-BY-STEP PLAN */}
        {tab === "plan" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Phase selector */}
            <div className="space-y-2">
              {PHASES.map((p) => {
                const phaseChecked = p.steps.filter((_, i) => checks[`${p.id}-${i}`]).length;
                const phasePct = Math.round((phaseChecked / p.steps.length) * 100);
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePhase(p.id)}
                    className="w-full text-left px-3 py-3 rounded-xl transition-all"
                    style={{
                      background: activePhase === p.id ? `${p.color}10` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${activePhase === p.id ? `${p.color}30` : "rgba(255,255,255,0.04)"}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: activePhase === p.id ? p.color : "#8aaa9a" }}>
                        {p.name}
                      </span>
                      <span className="text-xs" style={{ color: "#5a7a6a" }}>{phasePct}%</span>
                    </div>
                    <div className="text-xs" style={{ color: "#5a7a6a" }}>{p.duration}</div>
                    <div className="w-full h-1 rounded-full mt-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${phasePct}%`, background: p.color }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active phase detail */}
            <div className="lg:col-span-3">
              <div className="mb-5">
                <h2 className="text-base font-bold mb-1" style={{ color: phase.color }}>{phase.name}</h2>
                <p className="text-xs" style={{ color: "#5a7a6a" }}>{phase.subtitle}</p>
                <p className="text-xs mt-2" style={{ color: "#8aaa9a", lineHeight: 1.7 }}>{phase.description}</p>
              </div>

              <div className="space-y-3">
                {phase.steps.map((step, i) => {
                  const key = `${phase.id}-${i}`;
                  const done = checks[key];
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-4 transition-all"
                      style={{
                        background: done ? "rgba(46,204,113,0.03)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${done ? "rgba(46,204,113,0.12)" : "rgba(255,255,255,0.04)"}`,
                        opacity: done ? 0.6 : 1,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox checked={done} onChange={() => toggle(key)} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold" style={{
                              color: done ? "#5a7a6a" : "#e8f5e9",
                              textDecoration: done ? "line-through" : "none",
                            }}>
                              {step.task}
                            </span>
                            {step.time && (
                              <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "#5a7a6a" }}>
                                ~{step.time}
                              </span>
                            )}
                          </div>
                          <div className="text-xs" style={{ color: "#8aaa9a", lineHeight: 1.6 }}>{step.detail}</div>
                          {step.file && (
                            <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs" style={{
                              background: `${phase.color}08`,
                              border: `1px solid ${phase.color}15`,
                              color: phase.color,
                            }}>
                              <span>{FILES[step.file]?.icon}</span>
                              <span className="font-semibold">{FILES[step.file]?.name}</span>
                              <span style={{ color: "#5a7a6a" }}>→ {step.tab}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* FILE MAP */}
        {tab === "files" && (
          <div className="space-y-3">
            <div className="text-xs mb-4" style={{ color: "#5a7a6a" }}>
              All 9 files, what they do, and when to use them. Keep all of them — none overlap.
            </div>
            {FILE_MAP.map((f, i) => (
              <div key={i} className="flex items-start gap-4 rounded-xl p-4" style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: "#e8f5e9" }}>{f.file}</div>
                  <div className="text-xs mt-1" style={{ color: "#8aaa9a", lineHeight: 1.6 }}>{f.purpose}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded flex-shrink-0" style={{
                  background: "rgba(46,204,113,0.08)",
                  color: "#2ecc71",
                }}>
                  {f.phase}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* QUICK REFERENCE */}
        {tab === "quickref" && (
          <div className="space-y-5">
            <div className="rounded-xl p-5" style={{ background: "rgba(231,76,60,0.04)", border: "1px solid rgba(231,76,60,0.1)" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#e74c3c" }}>🎥 THE FIRST VIDEO</h3>
              <div className="text-xs space-y-2" style={{ color: "#a8c8b8", lineHeight: 1.7 }}>
                <p><strong>Script:</strong> Open montree-platform-warroom.jsx → TikTok Scripts → Episode 1 or 7</p>
                <p><strong>Gear:</strong> Phone (selfie mode). That's it.</p>
                <p><strong>Length:</strong> Under 60 seconds</p>
                <p><strong>Editing:</strong> CapCut (free). Add text overlay per script. Trending sound optional.</p>
                <p><strong>Where:</strong> Your desk, your classroom, or at home with the ledger</p>
                <p><strong>Post to:</strong> TikTok first → then Instagram Reel → Facebook → WeChat moment</p>
                <p><strong>Key rule:</strong> RAW beats polished. Authentic beats professional. One take is fine.</p>
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: "rgba(46,204,113,0.04)", border: "1px solid rgba(46,204,113,0.1)" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#2ecc71" }}>📊 KEY NUMBERS</h3>
              <div className="grid grid-cols-2 gap-3 text-xs" style={{ color: "#a8c8b8" }}>
                <div><strong>Pain stat:</strong> 5,112 data points/year by hand</div>
                <div><strong>Time lost:</strong> 8+ hours/week on paperwork</div>
                <div><strong>Competitor:</strong> TC has 1.2★ iOS rating</div>
                <div><strong>Market:</strong> 15,763 Montessori schools globally</div>
                <div><strong>Free pilot:</strong> 3 months, no credit card</div>
                <div><strong>Tagline:</strong> QuickBooks moment for Montessori</div>
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: "rgba(52,152,219,0.04)", border: "1px solid rgba(52,152,219,0.1)" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#3498db" }}>🎯 DAILY MINIMUMS (30 min/day)</h3>
              <div className="text-xs space-y-1" style={{ color: "#a8c8b8" }}>
                <div>☐ Post 1 piece of content (any platform)</div>
                <div>☐ Reply to every comment and DM</div>
                <div>☐ Send 1 personalized outreach message</div>
                <div>☐ Engage in 1 Facebook group (comment, not promote)</div>
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: "rgba(155,89,182,0.04)", border: "1px solid rgba(155,89,182,0.1)" }}>
              <h3 className="text-sm font-bold mb-2" style={{ color: "#9b59b6" }}>🔥 IF YOU ONLY DO 3 THINGS</h3>
              <div className="text-xs space-y-2" style={{ color: "#a8c8b8", lineHeight: 1.7 }}>
                <p><strong>1.</strong> Film Episode 1 and post it everywhere</p>
                <p><strong>2.</strong> WhatsApp 5 teacher friends with the demo link</p>
                <p><strong>3.</strong> Email admissions@msb.edu.cn (your biggest local target)</p>
                <p style={{ color: "#9b59b6", marginTop: 8 }}>That's 1 hour of work. And it could land your first pilot school.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
