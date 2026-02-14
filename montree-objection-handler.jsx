import { useState } from "react";

const OBJECTIONS = [
  {
    category: "Trust & Security",
    color: "#3498db",
    questions: [
      {
        q: "Is our children's data safe?",
        short: "Yes. Enterprise-grade security, no photos leave the school, you own your data.",
        full: `Montree uses Supabase (built on PostgreSQL) with Row Level Security — the same database technology used by banks. Every school's data is completely isolated. No other school can see your records.

Children's names and progress data are encrypted in transit and at rest. We don't sell data, we don't share data, we don't use it for advertising. You own your data — if you leave, you can export everything.

For schools with strict privacy policies: Montree works without photos. You can track progress using names only. No images of children are required at any point.`,
      },
      {
        q: "What happens to our data if Montree shuts down?",
        short: "You can export everything as CSV/PDF at any time. Your data is always yours.",
        full: `You can export your complete data set at any time — every child's progress history, every observation, every parent report — as CSV files or PDFs. 

This isn't a trap. If a better tool comes along, or if you decide to go back to paper, your years of data come with you. That's a promise.

For context: Montree is built by a working Montessori teacher. This isn't a VC-funded startup that might pivot to something else. This is a tool I built because I needed it, and I'm going to keep building it because I still need it.`,
      },
    ],
  },
  {
    category: "Practical Concerns",
    color: "#2ecc71",
    questions: [
      {
        q: "Does it work without WiFi?",
        short: "It works on any device with a browser. WiFi is needed, but it uses very little data — a phone hotspot works fine.",
        full: `Montree is a web app that runs in any browser — phone, tablet, laptop, desktop. It does need an internet connection, but the data usage is minimal. A mobile hotspot is more than enough.

If your school has WiFi in the classroom (even slow WiFi), Montree works perfectly. Each tap sends about 1KB of data — less than a single text message.

For schools with no connectivity at all: this is an edge case we're actively working on. Offline mode with sync-when-connected is on the roadmap.`,
      },
      {
        q: "Can I use it on a tablet during the work period? Won't it be distracting?",
        short: "One tap takes less than 2 seconds. Less disruptive than writing in a ledger.",
        full: `This is the most common concern, and it's a good one. Here's the reality:

Writing an observation in a ledger takes 15-30 seconds. Opening a page, finding the child's row, writing the date, the work, the status. During that time, your attention is fully on the paper.

A Montree tap takes under 2 seconds. Tap the child. Tap the work. Done. Your eyes leave the classroom for less time than it takes to check the clock.

Most teachers keep a tablet or phone on a small shelf near their observation spot. The children don't even notice it — it's less visible than a large open ledger.

After the first week, teachers tell us it feels more natural than paper because they can record observations in the moment instead of trying to remember everything at the end of the day.`,
      },
      {
        q: "Our teachers aren't tech-savvy. Will they be able to use it?",
        short: "If they can tap a phone screen, they can use Montree. It's simpler than WhatsApp.",
        full: `Montree was designed by a teacher, for teachers. The entire interface is built around one interaction: tap to cycle status. That's it.

There are no complex menus, no settings to configure, no file management. The children are already there. The works are already there. You just tap.

During your free pilot, I personally walk your teachers through the first session. It takes about 10 minutes. After that, they don't need help.

We've had teachers who describe themselves as "terrible with technology" become the biggest advocates because it's genuinely simpler than their paper system.`,
      },
    ],
  },
  {
    category: "Montessori Philosophy",
    color: "#f39c12",
    questions: [
      {
        q: "Does digital tracking replace real observation?",
        short: "No. Montree records what you observe. It doesn't change HOW you observe.",
        full: `This is important: Montree does not change your observation practice. You still watch the child. You still notice the concentration, the repetition, the breakthrough. You still know your children.

What Montree replaces is the RECORDING step — the part where you transfer what you observed into a ledger, a spreadsheet, or a piece of paper. That recording step is where teachers lose hours every week.

Think of it this way: a stethoscope doesn't replace a doctor's clinical judgment. It just makes the information clearer. Montree doesn't replace your trained Montessori eye. It just makes sure none of your observations get lost.

The Montessori Guru feature actually deepens your practice — it can suggest follow-up works based on a child's progress patterns, drawing from the full AMI/AMS curriculum. It's like having a mentor teacher available 24/7.`,
      },
      {
        q: "Is this aligned with AMI/AMS standards?",
        short: "Yes. Built on the full Montessori curriculum with 213 works across all areas, following AMI/AMS progression.",
        full: `Montree's curriculum database contains 213 works organized by the standard Montessori areas: Practical Life, Sensorial, Language, Mathematics, and Culture. The progression follows both AMI and AMS guidelines.

The system was built by an AMS-certified teacher working in an active Montessori classroom. Every work, every progression sequence, and every sensitive period mapping has been verified against standard Montessori training materials.

If your school follows a modified curriculum or has additional works specific to your program, these can be added. The system is flexible enough to accommodate different Montessori approaches while maintaining the core structure.`,
      },
    ],
  },
  {
    category: "Business & Pricing",
    color: "#9b59b6",
    questions: [
      {
        q: "What happens after the free 3 months?",
        short: "We have a conversation. If Montree is saving you time, we agree on a fair price. If it's not, you walk away with your data. No pressure.",
        full: `The 3-month pilot is genuinely free. No credit card required. Full access to every feature. No limitations.

At the end of 3 months, we have an honest conversation. If Montree is saving your teachers time and making your classroom better, we agree on a subscription that works for your school. If it's not, you export your data and we part as friends.

There is no auto-billing. There is no surprise charge. There is no "gotcha" hidden in the terms.

Why do I do this? Because I'm confident that once teachers use Montree for 3 months, they won't want to go back to paper. The product sells itself. I just need you to try it.`,
      },
      {
        q: "How much does it cost after the pilot?",
        short: "We'll discuss pricing that works for your school. It will be significantly less than the time your teachers currently spend on paperwork.",
        full: `Pricing depends on your school's size and needs. I work with each school individually to find a number that makes sense.

Here's the math that matters: if Montree saves each teacher 6 hours per week (conservative estimate), and your school has 5 teachers, that's 30 hours per week — over 1,000 hours per year — of teacher time recovered. 

What's an hour of teacher time worth? Even at a modest rate, Montree pays for itself many times over in recovered productivity alone. And that's before counting the value of better parent communication, fewer errors, and comprehensive progress data.

I'm not trying to maximize revenue. I'm trying to get Montree into as many classrooms as possible. The pricing will reflect that.`,
      },
      {
        q: "Why should we switch from Transparent Classroom / our current system?",
        short: "Montree is faster (one tap vs multiple clicks), includes AI curriculum guidance, auto-generates parent reports, and was built inside a real classroom.",
        full: `If your current system works well for you, don't switch. Seriously.

But if you're finding that your teachers avoid using it because it's too slow, or parents still ask "what did my child do today?", or you're still supplementing digital records with paper notes — that's where Montree is different.

Key differences from Transparent Classroom:
• One-tap tracking during the work period (TC requires multiple clicks and screens)
• AI-powered Montessori Guru for curriculum guidance
• Auto-generated parent reports (TC requires manual report writing)
• Built for bilingual classrooms (Chinese/English native support)
• Designed by a teacher actively using it every day in a real classroom

Transparent Classroom has been around longer and has more schools. That's true. But they also have a 1.2-star rating on the iOS App Store, and teacher feedback consistently mentions complexity and slowness.

Montree is simpler. Faster. And free to try for 3 months.`,
      },
    ],
  },
];

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="px-2 py-1 rounded text-xs flex-shrink-0"
      style={{
        background: c ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.04)",
        color: c ? "#2ecc71" : "#5a7a6a",
        border: `1px solid ${c ? "rgba(46,204,113,0.3)" : "rgba(255,255,255,0.06)"}`,
      }}>{c ? "✓ Copied" : "Copy"}</button>
  );
}

export default function ObjectionHandler() {
  const [expanded, setExpanded] = useState({});

  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="min-h-screen" style={{ background: "#080f0b", color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">🛡️</span>
          <h1 className="text-lg font-bold" style={{ color: "#e8f5e9" }}>Objection Handler</h1>
        </div>
        <p className="text-xs" style={{ color: "#5a7a6a" }}>
          The 10 questions every principal will ask. Your answers, ready to copy-paste into any DM, email, or conversation.
        </p>
      </div>

      <div className="p-5 space-y-6">
        {OBJECTIONS.map((cat) => (
          <div key={cat.category}>
            <div className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: cat.color }}>
              <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
              {cat.category}
            </div>
            <div className="space-y-2">
              {cat.questions.map((q, i) => {
                const key = `${cat.category}-${i}`;
                const isOpen = expanded[key];
                return (
                  <div key={key} className="rounded-xl overflow-hidden" style={{
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${isOpen ? `${cat.color}20` : "rgba(255,255,255,0.04)"}`,
                  }}>
                    <button onClick={() => toggle(key)}
                      className="w-full text-left p-4"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#c8e0d0" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-sm font-bold mb-1" style={{ color: "#e8f5e9" }}>"{q.q}"</div>
                          <div className="text-xs" style={{ color: "#8aaa9a", lineHeight: 1.6 }}>{q.short}</div>
                        </div>
                        <span className="text-xs flex-shrink-0" style={{ color: "#5a7a6a" }}>
                          {isOpen ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold" style={{ color: cat.color }}>Full answer (copy-paste ready)</span>
                          <CopyBtn text={q.full} />
                        </div>
                        <div className="rounded-lg p-4" style={{
                          background: `${cat.color}05`,
                          border: `1px solid ${cat.color}10`,
                        }}>
                          <pre className="text-xs whitespace-pre-wrap" style={{
                            color: "#a8c8b8", lineHeight: 1.8,
                            fontFamily: "'DM Sans', sans-serif",
                          }}>{q.full}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
