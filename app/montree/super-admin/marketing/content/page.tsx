// @ts-nocheck
'use client';
import { useState, useRef, useCallback } from "react";
import Link from 'next/link';

// ============================================
// SOCIAL MEDIA CONTENT PACK FOR MONTREE
// ============================================

// Shareable card designs as inline SVG-like components
function LedgerProblemCard() {
  return (
    <div style={{
      width: "100%", aspectRatio: "1/1", background: "linear-gradient(135deg, #1a1408, #2a1f0a)",
      borderRadius: 16, padding: 40, display: "flex", flexDirection: "column",
      justifyContent: "space-between", position: "relative", overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Faint ledger lines background */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.06 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            height: 1, background: "#c9b88a", marginTop: 28,
            marginLeft: 60, marginRight: 20,
          }} />
        ))}
        <div style={{
          position: "absolute", left: 56, top: 0, bottom: 0,
          width: 2, background: "#c44",
        }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          fontSize: 13, letterSpacing: 3, textTransform: "uppercase",
          color: "#c44", marginBottom: 16, fontWeight: 600,
        }}>
          The Ledger Problem
        </div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 36,
          fontWeight: 700, color: "#f5f0e8", lineHeight: 1.2, marginBottom: 24,
        }}>
          This is still how most Montessori classrooms track progress.
          <span style={{ color: "#c44" }}> In 2026.</span>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          {[
            { val: "24", desc: "children" },
            { val: "213", desc: "works" },
            { val: "8+hrs", desc: "lost/week" },
          ].map((s) => (
            <div key={s.desc} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 28,
                fontWeight: 600, color: "#c44",
              }}>{s.val}</div>
              <div style={{
                fontSize: 10, color: "#8a7a50", textTransform: "uppercase",
                letterSpacing: 1,
              }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "linear-gradient(135deg, #2ecc71, #1a9c5a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>🌳</div>
          <span style={{ fontSize: 14, color: "#c9b88a", fontWeight: 600 }}>
            montree.xyz — There's a better way.
          </span>
        </div>
      </div>
    </div>
  );
}

function BeforeAfterCard() {
  return (
    <div style={{
      width: "100%", aspectRatio: "1/1", background: "#0a0f0d",
      borderRadius: 16, display: "flex", flexDirection: "column",
      overflow: "hidden", fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* BEFORE */}
      <div style={{
        flex: 1, background: "linear-gradient(135deg, #1a1408, #2a1f0a)",
        padding: "24px 28px", display: "flex", flexDirection: "column",
        justifyContent: "center", position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 16, left: 20, fontSize: 10,
          letterSpacing: 3, textTransform: "uppercase", color: "#c44",
          fontWeight: 700, background: "rgba(204,68,68,0.1)",
          padding: "4px 10px", borderRadius: 4,
        }}>Before</div>
        <div style={{
          fontFamily: "'Special Elite', monospace", fontSize: 13,
          color: "#5a4f30", lineHeight: 2.2, marginTop: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>01 Li Wei — Pink Tower</span><span>Intro ✓</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>02 Mei Chen — Sandpaper Letters</span><span>Pract.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ textDecoration: "line-through", color: "#9a8a60" }}>03 Yuki — Movable Alph</span>
            <span style={{ color: "#8b2020", fontSize: 11 }}>Wrong entry</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>04 Amir — Bead Stair 1-9</span><span>Mast. ✓✓</span>
          </div>
        </div>
        <div style={{
          position: "absolute", bottom: 12, right: 20, fontSize: 22,
          color: "#c44", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
        }}>8+ hrs/week</div>
      </div>

      {/* Divider */}
      <div style={{
        height: 3, background: "linear-gradient(90deg, #c44, transparent 30%, transparent 70%, #2ecc71)",
      }} />

      {/* AFTER */}
      <div style={{
        flex: 1, background: "linear-gradient(135deg, #0d1f17, #0a1610)",
        padding: "24px 28px", display: "flex", flexDirection: "column",
        justifyContent: "center", position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 16, left: 20, fontSize: 10,
          letterSpacing: 3, textTransform: "uppercase", color: "#2ecc71",
          fontWeight: 700, background: "rgba(46,204,113,0.1)",
          padding: "4px 10px", borderRadius: 4,
        }}>After — Montree</div>
        <div style={{ marginTop: 16 }}>
          {[
            { name: "Li Wei", area: "Sensorial", pct: 88, w: "88%" },
            { name: "Mei Chen", area: "Language", pct: 65, w: "65%" },
            { name: "Yuki T.", area: "Math", pct: 92, w: "92%" },
            { name: "Amir K.", area: "Practical", pct: 41, w: "41%" },
          ].map((c) => (
            <div key={c.name} style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 12, color: "#a8d8b8", width: 80 }}>
                {c.name}
              </div>
              <div style={{
                flex: 1, height: 6, background: "rgba(255,255,255,0.06)",
                borderRadius: 3, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: c.w, borderRadius: 3,
                  background: "linear-gradient(90deg, #1a9c5a, #2ecc71)",
                }} />
              </div>
              <div style={{
                fontSize: 12, color: "#2ecc71", fontWeight: 600, width: 32,
                textAlign: "right",
              }}>{c.pct}%</div>
            </div>
          ))}
        </div>
        <div style={{
          position: "absolute", bottom: 12, right: 20, fontSize: 22,
          color: "#2ecc71", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
        }}>One tap.</div>
      </div>
    </div>
  );
}

function StatCard() {
  return (
    <div style={{
      width: "100%", aspectRatio: "1/1",
      background: "linear-gradient(135deg, #0d1f17, #0a1610)",
      borderRadius: 16, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: 40, fontFamily: "'DM Sans', sans-serif", position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: 16,
        border: "1px solid rgba(46,204,113,0.1)",
      }} />
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 80,
        fontWeight: 700, color: "#2ecc71", lineHeight: 1,
        marginBottom: 8,
      }}>5,112</div>
      <div style={{
        fontSize: 16, color: "#8aaa9a", marginBottom: 32,
        lineHeight: 1.6,
      }}>
        data points tracked per classroom, per year.
        <br />By hand. In a ledger.
      </div>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: 22,
        fontStyle: "italic", color: "#e8f5e9",
      }}>
        What if it took <span style={{ color: "#2ecc71" }}>one tap</span> instead?
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 28,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "linear-gradient(135deg, #2ecc71, #1a9c5a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12,
        }}>🌳</div>
        <span style={{ fontSize: 13, color: "#5a7a6a", fontWeight: 500 }}>
          montree.xyz
        </span>
      </div>
    </div>
  );
}

function QuoteCard() {
  return (
    <div style={{
      width: "100%", aspectRatio: "1/1",
      background: "linear-gradient(135deg, #080f0b, #0d1f17)",
      borderRadius: 16, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: 48, fontFamily: "'DM Sans', sans-serif", position: "relative",
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: 72,
        color: "rgba(46,204,113,0.12)", lineHeight: 1, marginBottom: -20,
      }}>"</div>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontSize: 24,
        fontStyle: "italic", color: "#e8f5e9", lineHeight: 1.6,
        marginBottom: 28, maxWidth: 360,
      }}>
        Montree is the <span style={{ color: "#2ecc71" }}>QuickBooks moment</span> for Montessori.
      </div>
      <div style={{ fontSize: 13, color: "#5a7a6a" }}>
        Modern tools for the classroom that deserves them.
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 28,
        background: "rgba(46,204,113,0.08)",
        border: "1px solid rgba(46,204,113,0.15)",
        borderRadius: 24, padding: "8px 18px",
      }}>
        <span style={{ fontSize: 14 }}>🌳</span>
        <span style={{ fontSize: 13, color: "#2ecc71", fontWeight: 600 }}>
          montree.xyz — Free 3-month pilot
        </span>
      </div>
    </div>
  );
}

function ParentReportCard() {
  return (
    <div style={{
      width: "100%", aspectRatio: "1/1",
      background: "linear-gradient(135deg, #0d1f17, #0a1610)",
      borderRadius: 16, padding: 32, fontFamily: "'DM Sans', sans-serif",
      display: "flex", flexDirection: "column", position: "relative",
    }}>
      <div style={{
        fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
        color: "#2ecc71", marginBottom: 16, fontWeight: 600,
      }}>Parent Report — Auto-Generated</div>

      <div style={{
        background: "rgba(255,255,255,0.03)", borderRadius: 12,
        padding: 20, border: "1px solid rgba(46,204,113,0.08)",
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(46,204,113,0.1)", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>👧</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e8f5e9" }}>Li Wei's Progress</div>
              <div style={{ fontSize: 11, color: "#5a7a6a" }}>September 2025 · Whale Class</div>
            </div>
          </div>

          {[
            { area: "🟠 Sensorial", pct: 78, color: "#e67e22" },
            { area: "🔵 Language", pct: 55, color: "#3498db" },
            { area: "🟢 Mathematics", pct: 90, color: "#2ecc71" },
            { area: "🟣 Practical Life", pct: 68, color: "#9b59b6" },
            { area: "🌍 Culture", pct: 42, color: "#f39c12" },
          ].map((a) => (
            <div key={a.area} style={{ marginBottom: 10 }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 11, marginBottom: 4,
              }}>
                <span style={{ color: "#8aaa9a" }}>{a.area}</span>
                <span style={{ color: a.color, fontWeight: 600 }}>{a.pct}%</span>
              </div>
              <div style={{
                height: 5, background: "rgba(255,255,255,0.06)",
                borderRadius: 3, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${a.pct}%`, borderRadius: 3,
                  background: a.color,
                }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginTop: 12,
          paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1a9c5a, #2ecc71)",
            borderRadius: 6, padding: "5px 14px", fontSize: 11,
            color: "white", fontWeight: 600,
          }}>📤 Send to Parents</div>
          <span style={{ fontSize: 10, color: "#4a6a5a" }}>Auto-generated by Montree</span>
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 16,
      }}>
        <span style={{ fontSize: 14 }}>🌳</span>
        <span style={{ fontSize: 12, color: "#5a7a6a" }}>
          montree.xyz — Reports that write themselves
        </span>
      </div>
    </div>
  );
}

// ============================================
// WECHAT ARTICLE (Chinese)
// ============================================
function WeChatArticle() {
  return (
    <div style={{
      background: "#fff", color: "#333", borderRadius: 12,
      maxWidth: 420, margin: "0 auto", fontFamily: "-apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif",
      overflow: "hidden",
    }}>
      {/* WeChat header bar */}
      <div style={{
        background: "#ededed", padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 12, color: "#666",
      }}>
        <span>🌳 Montree 蒙特利</span>
        <span>公众号文章预览</span>
      </div>

      {/* Hero image area */}
      <div style={{
        background: "linear-gradient(135deg, #1a1408, #2a1f0a)",
        padding: "40px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>📒 → 📱</div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 22,
          color: "#f5f0e8", fontWeight: 700, lineHeight: 1.4,
        }}>
          蒙氏老师每周浪费8小时<br/>在手写记录上
        </div>
        <div style={{ fontSize: 13, color: "#c9b88a", marginTop: 8 }}>
          是时候改变了。
        </div>
      </div>

      {/* Article body */}
      <div style={{ padding: "24px 20px", lineHeight: 2, fontSize: 15 }}>
        <p style={{ marginBottom: 20 }}>
          你还记得会计用那本厚厚的账本吗？一行行的数字，花几个小时才能记完，很容易出错。后来QuickBooks出现了，一切都变了。
        </p>

        <p style={{ marginBottom: 20 }}>
          <strong>蒙台梭利教室的记录工作，到今天还停留在"账本时代"。</strong>
        </p>

        <p style={{ marginBottom: 20 }}>
          每个孩子、每项工作、每次观察——全靠手写。24个孩子，213项教具工作，每年超过5000个数据点。老师们每周要花<span style={{ color: "#c44", fontWeight: 700 }}>8个小时以上</span>在文书工作上。
        </p>

        <div style={{
          background: "#f8f8f8", borderRadius: 8, padding: 16,
          margin: "24px 0", borderLeft: "3px solid #2ecc71",
        }}>
          <div style={{ fontSize: 13, color: "#2ecc71", fontWeight: 600, marginBottom: 8 }}>
            💡 Montree 是什么？
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8 }}>
            Montree是一个专为蒙台梭利教室设计的现代化管理系统。轻轻一点就能记录孩子的进步，家长报告自动生成，完整的蒙氏课程体系已经映射好了。
          </p>
        </div>

        <h3 style={{ fontSize: 17, marginBottom: 12, color: "#1a1a1a" }}>
          ✅ Montree 能做什么？
        </h3>

        <div style={{ marginBottom: 20 }}>
          {[
            { icon: "📋", title: "一键追踪", desc: "上课期间就能记录，不用加班" },
            { icon: "📊", title: "自动家长报告", desc: "一键发送，家长实时了解孩子进展" },
            { icon: "🧠", title: "AI蒙氏顾问", desc: "智能推荐每个孩子下一步该做什么" },
            { icon: "📱", title: "任何设备", desc: "手机、平板、电脑都能用，无需下载App" },
          ].map((f) => (
            <div key={f.title} style={{
              display: "flex", gap: 12, padding: "10px 0",
              borderBottom: "1px solid #f0f0f0",
            }}>
              <span style={{ fontSize: 24 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#666" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 17, marginBottom: 12, color: "#1a1a1a" }}>
          🏫 为什么选择 Montree？
        </h3>

        <p style={{ marginBottom: 20 }}>
          Montree不是硅谷公司做的，<strong>而是一位在北京国际学校工作的蒙氏老师</strong>亲手打造的。每个功能都来自真实教室的真实需求。
        </p>

        <p style={{ marginBottom: 20 }}>
          尤其适合中国的国际学校——<strong>双语支持</strong>，理解家长期望频繁沟通的文化，解决ESL教室特有的挑战。
        </p>

        <div style={{
          background: "linear-gradient(135deg, #0d1f17, #0a1610)",
          borderRadius: 12, padding: 24, textAlign: "center",
          margin: "24px 0",
        }}>
          <div style={{
            fontSize: 20, fontWeight: 700, color: "#e8f5e9",
            marginBottom: 8,
          }}>
            🎁 免费试用3个月
          </div>
          <div style={{ fontSize: 13, color: "#8aaa9a", marginBottom: 16 }}>
            无需信用卡 · 完整功能 · 随时取消
          </div>
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #1a9c5a, #2ecc71)",
            borderRadius: 8, padding: "10px 28px",
            color: "white", fontWeight: 700, fontSize: 15,
          }}>
            访问 montree.xyz →
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#999", textAlign: "center" }}>
          🌳 Montree — 蒙台梭利的"QuickBooks时刻"
        </p>
      </div>
    </div>
  );
}

// ============================================
// CONTENT CALENDAR
// ============================================
const CALENDAR_DATA = [
  {
    week: "Week 1", theme: "The Ledger Problem",
    posts: [
      { day: "Mon", platform: "Facebook", type: "Video", content: "Post 15-sec ledger scroll video. Caption: 'This is still how most Montessori classrooms track progress. In 2026.'" },
      { day: "Wed", platform: "Instagram", type: "Image", content: "Before/After carousel (ledger vs dashboard). Caption: 'From hours of paperwork → one tap.'" },
      { day: "Wed", platform: "小红书", type: "Image", content: "Same carousel adapted for Chinese audience. 从手写账本到一键追踪" },
      { day: "Fri", platform: "WeChat", type: "Article", content: "Publish the full WeChat article: '蒙氏老师每周浪费8小时在手写记录上'" },
      { day: "Sun", platform: "DMs", type: "Personal", content: "Message 5 teachers you know: 'I built this thing and need guinea pigs...'" },
    ],
  },
  {
    week: "Week 2", theme: "The Solution",
    posts: [
      { day: "Mon", platform: "Facebook", type: "Video", content: "Full 60-sec pitch video with voiceover. Post in Montessori Teachers group." },
      { day: "Wed", platform: "Instagram", type: "Image", content: "Parent Report preview card. Caption: 'Reports that write themselves. 📊'" },
      { day: "Wed", platform: "小红书", type: "Image", content: "Dashboard screenshot + 'how I track 24 children's progress'" },
      { day: "Fri", platform: "YouTube", type: "Video", content: "Upload full pitch video: 'Why Montessori record-keeping is stuck in the 1800s'" },
      { day: "Sun", platform: "Email", type: "Outreach", content: "Send 5 cold emails to principals from AMS directory" },
    ],
  },
  {
    week: "Week 3", theme: "Social Proof",
    posts: [
      { day: "Mon", platform: "Facebook", type: "Text", content: "'Started piloting Montree with 3 schools this week. Day 1 feedback: teachers can't believe how fast tracking is now.'" },
      { day: "Wed", platform: "Instagram", type: "Image", content: "5,112 stat card. Caption: 'Every year. By hand. There has to be a better way.'" },
      { day: "Wed", platform: "小红书", type: "Image", content: "每年5112个数据点，全部手写 — 应该有更好的方法" },
      { day: "Fri", platform: "WeChat", type: "Update", content: "Share pilot school early results (anonymized). Time saved, teacher reactions." },
      { day: "Sun", platform: "Email", type: "Follow-up", content: "Follow up on Week 2 emails + send 5 new ones" },
    ],
  },
  {
    week: "Week 4", theme: "The QuickBooks Moment",
    posts: [
      { day: "Mon", platform: "Facebook", type: "Image", content: "QuickBooks quote card. 'Montree is the QuickBooks moment for Montessori.'" },
      { day: "Wed", platform: "Instagram", type: "Carousel", content: "Full story: Ledger Problem → Stats → Dashboard → Parent Report → CTA" },
      { day: "Wed", platform: "小红书", type: "Article", content: "Full case study from pilot school (anonymized results)" },
      { day: "Fri", platform: "LinkedIn", type: "Post", content: "Professional pitch: 'I'm a teacher who built the tool I wished existed...'" },
      { day: "Sun", platform: "Email", type: "Outreach", content: "Send 5 new cold emails + first case study attachment" },
    ],
  },
];

const PLATFORM_COLORS = {
  Facebook: "#1877F2",
  Instagram: "#E4405F",
  "小红书": "#FE2C55",
  WeChat: "#07C160",
  YouTube: "#FF0000",
  LinkedIn: "#0A66C2",
  DMs: "#9b59b6",
  Email: "#f39c12",
  Bilibili: "#00A1D6",
};

// ============================================
// MAIN APP
// ============================================
export default function ContentPack() {
  const [activeTab, setActiveTab] = useState("cards");
  const [selectedCard, setSelectedCard] = useState(0);

  const CARDS = [
    { name: "The Ledger Problem", desc: "Hook — stop the scroll", component: <LedgerProblemCard /> },
    { name: "Before vs After", desc: "Side-by-side comparison", component: <BeforeAfterCard /> },
    { name: "5,112 Stat", desc: "Shocking number", component: <StatCard /> },
    { name: "QuickBooks Quote", desc: "Tagline card", component: <QuoteCard /> },
    { name: "Parent Report", desc: "Feature preview", component: <ParentReportCard /> },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0a0f0d", color: "#c8e0d0", fontFamily: "'DM Sans', sans-serif" }}>
      <div className="p-4 border-b border-slate-700"><Link href="/montree/super-admin/marketing" className="text-emerald-400 hover:text-emerald-300 text-sm">← Back to Marketing Hub</Link></div>
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xl">🎨</span>
          <h1 className="text-lg font-bold" style={{ color: "#e8f5e9" }}>
            Montree Content Factory
          </h1>
        </div>
        <p className="text-xs" style={{ color: "#5a7a6a" }}>
          Social cards, WeChat article, and 4-week content calendar. Screenshot cards or save to post.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {[
          { id: "cards", label: "📸 Social Cards", count: 5 },
          { id: "wechat", label: "💬 WeChat Article" },
          { id: "calendar", label: "📅 Content Calendar" },
          { id: "captions", label: "✍️ Caption Bank" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 text-xs font-medium transition-all whitespace-nowrap"
            style={{
              color: activeTab === tab.id ? "#2ecc71" : "#5a7a6a",
              borderBottom: activeTab === tab.id ? "2px solid #2ecc71" : "2px solid transparent",
              background: activeTab === tab.id ? "rgba(46,204,113,0.04)" : "transparent",
            }}
          >
            {tab.label} {tab.count && <span className="opacity-50">({tab.count})</span>}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* SOCIAL CARDS TAB */}
        {activeTab === "cards" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card selector */}
            <div>
              <div className="space-y-2 mb-4">
                {CARDS.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCard(i)}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm transition-all"
                    style={{
                      background: selectedCard === i ? "rgba(46,204,113,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${selectedCard === i ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.04)"}`,
                      color: selectedCard === i ? "#e8f5e9" : "#8aaa9a",
                    }}
                  >
                    <div className="font-semibold">{card.name}</div>
                    <div className="text-xs opacity-60">{card.desc}</div>
                  </button>
                ))}
              </div>
              <div className="rounded-lg p-4 text-xs" style={{
                background: "rgba(46,204,113,0.04)",
                border: "1px solid rgba(46,204,113,0.1)",
                color: "#8aaa9a",
              }}>
                <strong style={{ color: "#2ecc71" }}>💡 How to use:</strong>
                <br />Screenshot these cards at 1:1 ratio for Instagram/Facebook/小红书.
                <br />Right-click → Save image, or use your phone's screenshot tool.
                <br />Each card has the montree.xyz branding built in.
              </div>
            </div>

            {/* Card preview */}
            <div>
              <div style={{ maxWidth: 400 }}>
                {CARDS[selectedCard].component}
              </div>
            </div>
          </div>
        )}

        {/* WECHAT TAB */}
        {activeTab === "wechat" && (
          <div>
            <div className="mb-4 text-xs" style={{ color: "#5a7a6a" }}>
              Preview of the WeChat 公众号 article. Copy the text and images to your WeChat editor.
              Formatted for mobile reading with proper spacing.
            </div>
            <WeChatArticle />
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <div className="text-xs" style={{ color: "#5a7a6a" }}>
              4-week content plan. ~30 min/day. Each week has a theme that builds on the last.
            </div>
            {CALENDAR_DATA.map((week) => (
              <div key={week.week} className="rounded-xl overflow-hidden" style={{
                border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div className="px-5 py-3 flex items-center justify-between" style={{
                  background: "rgba(46,204,113,0.06)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <span className="text-sm font-semibold" style={{ color: "#e8f5e9" }}>
                    {week.week}
                  </span>
                  <span className="text-xs" style={{ color: "#2ecc71" }}>
                    Theme: {week.theme}
                  </span>
                </div>
                <div>
                  {week.posts.map((post, i) => (
                    <div key={i} className="px-5 py-3 flex items-start gap-3 text-xs" style={{
                      borderBottom: i < week.posts.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                      background: "rgba(255,255,255,0.01)",
                    }}>
                      <span style={{ color: "#5a7a6a", width: 32, flexShrink: 0 }}>{post.day}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                        background: `${PLATFORM_COLORS[post.platform]}20`,
                        color: PLATFORM_COLORS[post.platform],
                        flexShrink: 0,
                        minWidth: 70,
                        textAlign: "center",
                      }}>
                        {post.platform}
                      </span>
                      <span style={{ color: "#b8d0c0" }}>{post.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CAPTION BANK TAB */}
        {activeTab === "captions" && (
          <div className="space-y-4">
            <div className="text-xs mb-4" style={{ color: "#5a7a6a" }}>
              Ready-to-use captions. Click to copy. Mix and match with the social cards.
            </div>
            {[
              {
                platform: "Facebook / Instagram",
                captions: [
                  "This is still how most Montessori classrooms track progress. In 2026. 📒\n\n24 children. 213 works. 5,112 data points per year. All by hand.\n\nThere has to be a better way.\n\n🌳 montree.xyz",
                  "From 8 hours of paperwork → one tap. That's the Montree difference.\n\nWe built what QuickBooks did for accounting — but for Montessori record-keeping.\n\nFree 3-month pilot for schools ready to ditch the ledger.\n\n🌳 montree.xyz",
                  "\"I used to spend my evenings filling in records. Now I track everything during the work period and go home on time.\"\n\n— Montessori guide, pilot school\n\nIf this sounds like your life, try Montree free for 3 months.\n\n🌳 montree.xyz",
                  "Parents ask: \"What did my child do today?\"\n\nYou could spend 45 minutes writing a report. Or you could let Montree generate it automatically from your one-tap tracking.\n\n📊 Auto parent reports. 🧠 AI curriculum guidance. 📱 Works on any device.\n\n🌳 montree.xyz — free 3-month pilot",
                ],
              },
              {
                platform: "小红书 / WeChat Moments",
                captions: [
                  "蒙氏老师每周花8小时手写记录 📒\n\n24个孩子 × 213项工作 = 每年5112个数据点\n\n全部手写。\n\nMontree让这一切变成一键操作 ✨\n\n🌳 montree.xyz 免费试用3个月",
                  "从手写账本到一键追踪 📒→📱\n\n作为北京国际学校的蒙氏老师，我亲手打造了这个工具。\n\n家长报告自动生成，课程体系完整映射，AI顾问智能推荐。\n\n🌳 montree.xyz",
                  "老师们问我：\"你是怎么做到准时下班的？\" 😅\n\n秘密就是Montree。上课时顺手一点就记录好了，不用加班赶报告。\n\n免费试用3个月，无需信用卡\n\n🌳 montree.xyz",
                ],
              },
              {
                platform: "LinkedIn / Professional",
                captions: [
                  "I'm a Montessori teacher who built the tool I wished existed.\n\nEvery Montessori classroom in the world still tracks student progress by hand — the same system accountants abandoned decades ago.\n\nSo I built Montree: one-tap tracking, auto-generated parent reports, AI curriculum guidance. All designed inside a real classroom, between circle time and snack.\n\nWe're calling it the QuickBooks moment for Montessori.\n\nNow offering free 3-month pilots to schools. No investors, no VC money — just a teacher solving a problem for teachers.\n\nmontree.xyz",
                ],
              },
            ].map((group) => (
              <div key={group.platform}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "#e8f5e9" }}>
                  {group.platform}
                </h3>
                <div className="space-y-3">
                  {group.captions.map((cap, i) => (
                    <div key={i} className="rounded-lg p-4 relative group" style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}>
                      <pre className="text-xs whitespace-pre-wrap" style={{
                        color: "#a8c8b8", fontFamily: "'DM Sans', sans-serif",
                        lineHeight: 1.7,
                      }}>{cap}</pre>
                      <div className="mt-3">
                        <CopyButton text={cap} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
