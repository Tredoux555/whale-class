import { useState, useEffect, useRef } from "react";

// ============================================
// MONTREE INTERACTIVE DEMO
// Experience the product without signing up.
// ============================================

const CHILDREN = [
  { name: "Li Wei", nameZh: "李伟", age: "4y 3m", avatar: "👦🏻" },
  { name: "Sophia", nameZh: "", age: "4y 8m", avatar: "👧🏼" },
  { name: "Amir", nameZh: "", age: "3y 11m", avatar: "👦🏽" },
  { name: "Yuki", nameZh: "結衣", age: "4y 1m", avatar: "👧🏻" },
  { name: "Noah", nameZh: "", age: "5y 2m", avatar: "👦🏼" },
  { name: "Mei Lin", nameZh: "美林", age: "4y 6m", avatar: "👧🏻" },
];

const WORKS = [
  { name: "Pink Tower", area: "Sensorial", color: "#e74c3c", icon: "🔺" },
  { name: "Sandpaper Letters", area: "Language", color: "#3498db", icon: "✋" },
  { name: "Golden Beads", area: "Math", color: "#f1c40f", icon: "🟡" },
  { name: "Pouring Water", area: "Practical Life", color: "#2ecc71", icon: "🫗" },
  { name: "Puzzle Maps", area: "Culture", color: "#9b59b6", icon: "🗺️" },
  { name: "Metal Insets", area: "Language", color: "#3498db", icon: "✏️" },
  { name: "Number Rods", area: "Math", color: "#f1c40f", icon: "📏" },
  { name: "Dressing Frames", area: "Practical Life", color: "#2ecc71", icon: "👔" },
];

const STATUSES = [
  { label: "Not Started", short: "—", color: "#444", bg: "rgba(255,255,255,0.03)" },
  { label: "Presented", short: "P", color: "#f39c12", bg: "rgba(243,156,18,0.12)" },
  { label: "Practicing", short: "●", color: "#3498db", bg: "rgba(52,152,219,0.12)" },
  { label: "Mastered", short: "★", color: "#2ecc71", bg: "rgba(46,204,113,0.15)" },
];

const AREA_COLORS = {
  "Sensorial": "#e74c3c",
  "Language": "#3498db",
  "Math": "#f1c40f",
  "Practical Life": "#2ecc71",
  "Culture": "#9b59b6",
};

// ============================================
// DEMO STEPS (guided walkthrough)
// ============================================
const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Montree 🌳",
    subtitle: "See how one-tap tracking replaces 8+ hours of weekly paperwork",
    instruction: "Tap 'Start Demo' to begin",
  },
  {
    id: "classroom",
    title: "Your Classroom",
    subtitle: "Every child. Every work. At a glance.",
    instruction: "Tap any child to see their progress",
  },
  {
    id: "child",
    title: "Track Progress",
    subtitle: "One tap to cycle: Not Started → Presented → Practicing → Mastered",
    instruction: "Tap any work to change its status",
  },
  {
    id: "dashboard",
    title: "Real-Time Dashboard",
    subtitle: "Your entire classroom, visualized instantly",
    instruction: "See how data builds automatically",
  },
  {
    id: "report",
    title: "Auto Parent Report",
    subtitle: "Generated in 3 seconds. Not 3 hours.",
    instruction: "This is what parents receive",
  },
];

// ============================================
// MAIN
// ============================================
export default function MontreeDemo() {
  const [step, setStep] = useState(0);
  const [selectedChild, setSelectedChild] = useState(null);
  const [progress, setProgress] = useState(() => {
    const p = {};
    CHILDREN.forEach((c) => {
      p[c.name] = {};
      WORKS.forEach((w) => {
        p[c.name][w.name] = Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0;
      });
    });
    return p;
  });
  const [tapCount, setTapCount] = useState(0);
  const [showRipple, setShowRipple] = useState(null);
  const [animateReport, setAnimateReport] = useState(false);

  const cycleStatus = (child, work) => {
    setProgress((p) => {
      const next = { ...p, [child]: { ...p[child] } };
      next[child][work] = (next[child][work] + 1) % 4;
      return next;
    });
    setTapCount((c) => c + 1);
    setShowRipple(work);
    setTimeout(() => setShowRipple(null), 400);
  };

  const currentStep = STEPS[step];

  // Calculate stats for dashboard
  const stats = {};
  Object.keys(AREA_COLORS).forEach((area) => {
    stats[area] = { total: 0, mastered: 0, practicing: 0, presented: 0 };
  });
  CHILDREN.forEach((c) => {
    WORKS.forEach((w) => {
      const s = progress[c.name]?.[w.name] || 0;
      if (stats[w.area]) {
        stats[w.area].total++;
        if (s === 3) stats[w.area].mastered++;
        else if (s === 2) stats[w.area].practicing++;
        else if (s === 1) stats[w.area].presented++;
      }
    });
  });

  useEffect(() => {
    if (step === 4) {
      setAnimateReport(false);
      setTimeout(() => setAnimateReport(true), 300);
    }
  }, [step]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: "linear-gradient(145deg, #060d09 0%, #0a1610 50%, #080f0b 100%)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Phone frame */}
      <div className="w-full max-w-sm" style={{
        background: "#0d1a14",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(46,204,113,0.03)",
        overflow: "hidden",
        minHeight: 650,
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1" style={{ color: "#5a7a6a", fontSize: 10 }}>
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        {/* App header */}
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 20 }}>🌳</span>
            <span className="text-sm font-bold" style={{ color: "#e8f5e9" }}>Montree</span>
          </div>
          <div className="flex gap-2">
            {step > 0 && step < 5 && (
              <>
                {["classroom", "child", "dashboard", "report"].map((s, i) => (
                  <button
                    key={s}
                    onClick={() => { if (s === "classroom") { setStep(1); setSelectedChild(null); } else if (s === "dashboard") setStep(3); else if (s === "report") setStep(4); }}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      background: (step === i + 1) ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.04)",
                      color: (step === i + 1) ? "#2ecc71" : "#5a7a6a",
                      fontSize: 9,
                    }}
                  >
                    {s === "classroom" ? "👥" : s === "child" ? "📋" : s === "dashboard" ? "📊" : "📄"}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Step indicator */}
        {step > 0 && (
          <div className="px-5 pb-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex-1 h-0.5 rounded-full" style={{
                  background: step >= s ? "#2ecc71" : "rgba(255,255,255,0.06)",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 px-5 pb-5 overflow-y-auto" style={{ color: "#c8e0d0" }}>

          {/* WELCOME */}
          {step === 0 && (
            <div className="flex flex-col items-center justify-center text-center h-full" style={{ minHeight: 450 }}>
              <div style={{
                fontSize: 56, marginBottom: 20,
                filter: "drop-shadow(0 4px 20px rgba(46,204,113,0.3))",
              }}>🌳</div>
              <h1 className="text-xl font-bold mb-2" style={{ color: "#e8f5e9" }}>Montree</h1>
              <p className="text-sm mb-1" style={{ color: "#2ecc71" }}>The QuickBooks moment for Montessori</p>
              <p className="text-xs mb-8" style={{ color: "#5a7a6a", maxWidth: 260, lineHeight: 1.6 }}>
                See how one-tap tracking replaces 8+ hours of weekly paperwork. This interactive demo takes 60 seconds.
              </p>
              <button
                onClick={() => setStep(1)}
                className="px-8 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, #1a9c5a, #2ecc71)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(46,204,113,0.3)",
                  border: "none", cursor: "pointer",
                }}
              >
                Start Demo →
              </button>
              <p className="text-xs mt-4" style={{ color: "#3a5a4a" }}>No signup required</p>
            </div>
          )}

          {/* CLASSROOM VIEW */}
          {step === 1 && (
            <div>
              <div className="mb-4">
                <h2 className="text-sm font-bold" style={{ color: "#e8f5e9" }}>Whale Class — PreK 4</h2>
                <p className="text-xs" style={{ color: "#5a7a6a" }}>{CHILDREN.length} children · Work period in progress</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CHILDREN.map((child) => {
                  const childProgress = progress[child.name] || {};
                  const total = WORKS.length;
                  const mastered = Object.values(childProgress).filter((s) => s === 3).length;
                  const practicing = Object.values(childProgress).filter((s) => s === 2).length;
                  const presented = Object.values(childProgress).filter((s) => s === 1).length;
                  return (
                    <button
                      key={child.name}
                      onClick={() => { setSelectedChild(child); setStep(2); }}
                      className="text-left p-3 rounded-xl transition-all"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        cursor: "pointer",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ fontSize: 22 }}>{child.avatar}</span>
                        <div>
                          <div className="text-xs font-bold" style={{ color: "#e8f5e9" }}>{child.name}</div>
                          {child.nameZh && <div className="text-xs" style={{ color: "#5a7a6a" }}>{child.nameZh}</div>}
                        </div>
                      </div>
                      {/* Mini progress bar */}
                      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div style={{ width: `${(mastered / total) * 100}%`, background: "#2ecc71", transition: "width 0.5s" }} />
                        <div style={{ width: `${(practicing / total) * 100}%`, background: "#3498db", transition: "width 0.5s" }} />
                        <div style={{ width: `${(presented / total) * 100}%`, background: "#f39c12", transition: "width 0.5s" }} />
                      </div>
                      <div className="flex justify-between mt-1.5 text-xs" style={{ color: "#5a7a6a", fontSize: 9 }}>
                        <span>★{mastered} ●{practicing} P{presented}</span>
                        <span>{child.age}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-center mt-4" style={{ color: "#3a5a4a" }}>
                ↑ Tap a child to track their work
              </p>
            </div>
          )}

          {/* CHILD PROGRESS VIEW */}
          {step === 2 && selectedChild && (
            <div>
              <button onClick={() => setStep(1)} className="text-xs mb-3 flex items-center gap-1" style={{ color: "#5a7a6a", background: "none", border: "none", cursor: "pointer" }}>
                ← Back to classroom
              </button>
              <div className="flex items-center gap-3 mb-4">
                <span style={{ fontSize: 32 }}>{selectedChild.avatar}</span>
                <div>
                  <div className="text-sm font-bold" style={{ color: "#e8f5e9" }}>
                    {selectedChild.name} {selectedChild.nameZh && <span style={{ color: "#5a7a6a" }}>{selectedChild.nameZh}</span>}
                  </div>
                  <div className="text-xs" style={{ color: "#5a7a6a" }}>{selectedChild.age} · Tap to cycle status</div>
                </div>
              </div>
              {tapCount > 0 && (
                <div className="text-xs mb-3 px-3 py-1.5 rounded-lg inline-block" style={{ background: "rgba(46,204,113,0.08)", color: "#2ecc71" }}>
                  {tapCount} tap{tapCount !== 1 ? "s" : ""} recorded ✓
                </div>
              )}
              <div className="space-y-1.5">
                {WORKS.map((work) => {
                  const s = progress[selectedChild.name]?.[work.name] || 0;
                  const status = STATUSES[s];
                  const isRipple = showRipple === work.name;
                  return (
                    <button
                      key={work.name}
                      onClick={() => cycleStatus(selectedChild.name, work.name)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg transition-all"
                      style={{
                        background: status.bg,
                        border: `1px solid ${isRipple ? status.color : "rgba(255,255,255,0.03)"}`,
                        cursor: "pointer",
                        transform: isRipple ? "scale(1.02)" : "scale(1)",
                        transition: "all 0.2s",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span style={{ fontSize: 16 }}>{work.icon}</span>
                        <div className="text-left">
                          <div className="text-xs font-semibold" style={{ color: "#e8f5e9" }}>{work.name}</div>
                          <div className="text-xs" style={{ color: work.color, fontSize: 9 }}>{work.area}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{
                          color: status.color,
                          transition: "all 0.2s",
                          transform: isRipple ? "scale(1.3)" : "scale(1)",
                        }}>
                          {status.short}
                        </span>
                        <span className="text-xs" style={{ color: "#5a7a6a", fontSize: 9 }}>{status.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setStep(3)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: "rgba(52,152,219,0.1)", color: "#3498db", border: "1px solid rgba(52,152,219,0.2)", cursor: "pointer" }}>
                  📊 View Dashboard
                </button>
                <button onClick={() => setStep(4)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: "rgba(46,204,113,0.1)", color: "#2ecc71", border: "1px solid rgba(46,204,113,0.2)", cursor: "pointer" }}>
                  📄 Generate Report
                </button>
              </div>
            </div>
          )}

          {/* DASHBOARD */}
          {step === 3 && (
            <div>
              <button onClick={() => { setStep(selectedChild ? 2 : 1); }} className="text-xs mb-3 flex items-center gap-1" style={{ color: "#5a7a6a", background: "none", border: "none", cursor: "pointer" }}>
                ← Back
              </button>
              <h2 className="text-sm font-bold mb-1" style={{ color: "#e8f5e9" }}>Classroom Dashboard</h2>
              <p className="text-xs mb-4" style={{ color: "#5a7a6a" }}>Real-time progress across all {CHILDREN.length} children</p>

              {Object.entries(stats).map(([area, data]) => {
                const pctMastered = Math.round((data.mastered / data.total) * 100);
                const pctPracticing = Math.round((data.practicing / data.total) * 100);
                const pctPresented = Math.round((data.presented / data.total) * 100);
                return (
                  <div key={area} className="mb-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ color: AREA_COLORS[area] }}>{area}</span>
                      <span className="text-xs" style={{ color: "#5a7a6a" }}>{pctMastered}% mastered</span>
                    </div>
                    <div className="flex gap-0.5 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="rounded-l-full transition-all duration-700" style={{ width: `${pctMastered}%`, background: "#2ecc71" }} />
                      <div className="transition-all duration-700" style={{ width: `${pctPracticing}%`, background: "#3498db" }} />
                      <div className="transition-all duration-700" style={{ width: `${pctPresented}%`, background: "#f39c12" }} />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs" style={{ fontSize: 9, color: "#5a7a6a" }}>
                      <span><span style={{ color: "#2ecc71" }}>★</span> {data.mastered} mastered</span>
                      <span><span style={{ color: "#3498db" }}>●</span> {data.practicing} practicing</span>
                      <span><span style={{ color: "#f39c12" }}>P</span> {data.presented} presented</span>
                    </div>
                  </div>
                );
              })}

              <button onClick={() => setStep(4)}
                className="w-full py-2.5 rounded-xl text-xs font-bold mt-2"
                style={{ background: "linear-gradient(135deg, #1a9c5a, #2ecc71)", color: "#fff", border: "none", cursor: "pointer" }}>
                📄 Generate Parent Report →
              </button>
            </div>
          )}

          {/* PARENT REPORT */}
          {step === 4 && (
            <div>
              <button onClick={() => setStep(3)} className="text-xs mb-3 flex items-center gap-1" style={{ color: "#5a7a6a", background: "none", border: "none", cursor: "pointer" }}>
                ← Back to dashboard
              </button>

              <div className="rounded-xl overflow-hidden" style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                border: "1px solid rgba(255,255,255,0.06)",
                opacity: animateReport ? 1 : 0,
                transform: animateReport ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.6s ease-out",
              }}>
                <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold" style={{ color: "#2ecc71" }}>🌳 Montree Progress Report</span>
                    <span className="text-xs" style={{ color: "#5a7a6a" }}>Feb 2026</span>
                  </div>
                  <div className="text-sm font-bold" style={{ color: "#e8f5e9" }}>
                    {selectedChild ? `${selectedChild.avatar} ${selectedChild.name}` : `${CHILDREN[0].avatar} ${CHILDREN[0].name}`}
                  </div>
                  <div className="text-xs" style={{ color: "#5a7a6a" }}>
                    Whale Class · PreK 4 · {selectedChild?.age || CHILDREN[0].age}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {Object.entries(AREA_COLORS).map(([area, color]) => {
                    const child = selectedChild?.name || CHILDREN[0].name;
                    const areaWorks = WORKS.filter((w) => w.area === area);
                    const childData = areaWorks.map((w) => ({
                      name: w.name,
                      status: progress[child]?.[w.name] || 0,
                    }));
                    const mastered = childData.filter((d) => d.status === 3).length;
                    const pct = areaWorks.length > 0 ? Math.round((mastered / areaWorks.length) * 100) : 0;

                    return (
                      <div key={area}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold" style={{ color }}>{area}</span>
                          <span className="text-xs" style={{ color: "#5a7a6a" }}>{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div className="h-full rounded-full" style={{
                            width: `${pct}%`, background: color,
                            transition: "width 1s ease-out",
                          }} />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {childData.map((d) => (
                            <span key={d.name} className="text-xs px-1.5 py-0.5 rounded" style={{
                              fontSize: 8,
                              background: STATUSES[d.status].bg,
                              color: STATUSES[d.status].color,
                            }}>
                              {d.name} {STATUSES[d.status].short}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4" style={{ background: "rgba(46,204,113,0.03)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="text-xs" style={{ color: "#8aaa9a", lineHeight: 1.6 }}>
                    This report was generated automatically by Montree based on classroom observations.
                    No manual writing required.
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-5 text-center">
                <div className="text-xs mb-3" style={{ color: "#5a7a6a", lineHeight: 1.6 }}>
                  That entire report took <strong style={{ color: "#2ecc71" }}>3 seconds</strong>.<br />
                  Not 3 hours. Not 3 days. 3 seconds.
                </div>
                <a
                  href="https://montree.xyz/montree/principal/register"
                  className="inline-block px-8 py-3 rounded-xl text-sm font-bold"
                  style={{
                    background: "linear-gradient(135deg, #1a9c5a, #2ecc71)",
                    color: "#fff",
                    textDecoration: "none",
                    boxShadow: "0 4px 20px rgba(46,204,113,0.3)",
                  }}
                >
                  Start Your Free 3-Month Pilot
                </a>
                <div className="text-xs mt-2" style={{ color: "#3a5a4a" }}>
                  No credit card · Full access · montree.xyz
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom instruction bar */}
        {step > 0 && step < 5 && (
          <div className="px-5 py-3" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="text-xs text-center" style={{ color: "#5a7a6a" }}>
              {currentStep.instruction}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
