# Montree Dark Forest Redesign — Session Handoff
*Written Apr 29, 2026. Start next session by reading this.*

---

## The Workflow

**Claude Design** (separate Claude instance) does visual design → exports JSX bundles as .md files → user brings them back → **this Claude** implements into the real codebase.

Design tokens are locked:
- bg `#0a1a0f`, glow `radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)`
- Glass card: `rgba(255,255,255,0.06)`, border `rgba(52,211,153,0.15)`, radius `18px`, blur `18px saturate(140%)`
- Emerald `#34d399`, Lora 500 for headings, Inter for body
- Status badges: Presented = amber `rgba(245,158,11,0.18)` / `#f59e0b`, Practicing = emerald `rgba(52,211,153,0.15)` / `#34d399`, Mastered = white glass `rgba(255,255,255,0.10)` / `rgba(255,255,255,0.85)`
- Area dots (new, no emoji): practical_life=`236,72,153` pink, sensorial=`20,184,166` teal, math=`168,85,247` purple, language=`74,222,128` green, cultural=`249,115,22` orange
- Inline styles only — no Tailwind in redesigned components
- All icons: Lucide React at `strokeWidth={1.75}`

---

## What's Done ✅

### Phase 1 — Core Shell
| File | Status |
|------|--------|
| `components/montree/DashboardHeader.tsx` | ✅ Full dark glass redesign (sticky, frosted, sprout logo, voice mic, More menu) |
| `app/montree/dashboard/layout.tsx` | ✅ Dark bg, `DashboardHeader` mounted, sub-header for child pages |
| `app/montree/dashboard/[childId]/layout.tsx` | ✅ Dark glass sub-header, bioluminescent avatar, ArrowLeft back button |
| `components/montree/child/FocusWorksSection.tsx` | ✅ Full dark forest conversion — AreaDot circles, status badges, dark glass rows |
| `app/montree/dashboard/[childId]/page.tsx` | ✅ Dark glass action bar, stats tiles (Mastered/Practicing), `progressStats` computed from full progress API |

### Phase 2 — Inner Screens
| File | Status |
|------|--------|
| `app/montree/dashboard/photo-audit/page.tsx` | ✅ Full dark forest redesign — commit `4f89c0ad` |
| `app/montree/dashboard/guru/page.tsx` | ⏳ Needs Claude Design bundle |
| `app/montree/dashboard/curriculum/page.tsx` | ⏳ Needs Claude Design bundle |
| `app/montree/dashboard/[childId]/gallery/page.tsx` | ⏳ Needs Claude Design bundle |

### Photo Audit dark forest details (commit `4f89c0ad`)
- Page wrapper: dark `#0a1a0f` + radial emerald glow, `backgroundAttachment: fixed`
- Sticky header: frosted `rgba(7,18,12,0.97)` + emerald bottom border + `backdropFilter: blur(20px)`
- Zone tabs: emerald active state, ghost inactive
- Photo grid cards (`AuditPhotoCard`): glass `rgba(255,255,255,0.06)` + `borderRadius: 18` + `backdropFilter: blur(18px) saturate(140%)` + **zone accent top border** (2px colored strip: green=emerald, amber=amber, red=red, untagged=white/15%)
- Sonnet draft section: dark violet glass `rgba(139,92,246,0.08)`
- Haiku draft section: dark cyan glass `rgba(20,184,166,0.07)`
- Haiku auto-match section: dark amber glass `rgba(245,158,11,0.07)`
- Confirm button: emerald gradient `linear-gradient(180deg, #34d399, #10b981)`, dark text `#06281a`
- All modals (AreaPicker, crop, child tagger, teach AI, describe result): dark `rgba(7,18,12,0.95)` + `backdropFilter: blur(20px)` + emerald border
- Floating action bar: frosted dark + emerald top border + blur
- GetAdviceTab: dark glass child cards

### Recent commits
- `2a52240c` — layout.tsx + [childId]/layout.tsx dark theme
- `81cba5ce` — FocusWorksSection full dark forest conversion
- `46b2a6fa` — Fix MontreeLogo import typo (was breaking Railway build)
- `bcd0c4e4` — AreaDot colored circles + stats tiles on child page
- `4f89c0ad` — Photo audit dark forest redesign — dark glass cards, tabs, modals

---

## 🚨 IMMEDIATE NEXT TASK — Child Detail v2 + Next Phase 2 Screen

### A. Child Detail v2 (bundle already in hand — `child-detail-bundle (1).md`)

**Key structural differences vs what's currently in the codebase:**

#### 1. Multi-expand (BREAKING CHANGE to FocusWorksSection props)
The mock uses `Set<number>` to track open rows — multiple rows can be open simultaneously.
Currently the codebase uses `expandedIndex: string | null` (accordion — one at a time).

**Required changes:**
- `FocusWorksSection.tsx` prop `expandedIndex: string | null` → `expandedAreas: Set<string>`
- `FocusWorksSection.tsx` prop `setExpandedIndex` → `toggleArea: (area: string) => void`
- `app/montree/dashboard/[childId]/page.tsx`: change state from `useState<string | null>(null)` to `useState<Set<string>>(new Set())`
- Update the `isExpanded` check inside FocusWorksSection: `expandedAreas.has(area)` instead of `expandedIndex === area`
- Update the toggle: `toggleArea(area)` adds/removes from Set instead of replacing

#### 2. Each work row = its own glass card (VISUAL CHANGE)
- The outer wrapper loses its glass styling → becomes just a flex column with gap 12
- Each area row gets its own glass card wrapper: `background: isExpanded ? C.cardHover : C.glass`, border, borderRadius 18, overflow hidden, backdropFilter

#### 3. Section heading moves OUTSIDE the card
- Remove `<h2>` from inside FocusWorksSection
- Add above `<FocusWorksSection>` in page.tsx: Lora 500, 30px, with "{focusWorks.length} works in rotation" subtitle

#### 4. Stats tiles — third tile (Photos)
- Change grid to `gridTemplateColumns: 'repeat(3, 1fr)'`
- Add amber Camera tile for this week's photo count
- Import `Camera` from lucide-react

### B. Next Phase 2 Screen — Send to Claude Design

Use this prompt for **Guru Chat**:

---
```
You are Claude Design. I need a dark forest redesign of the Montree Guru Chat screen.

DESIGN SYSTEM (locked — do not deviate):
- bg: #0a1a0f, glow: radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)
- Glass card: rgba(255,255,255,0.06), border: 1px solid rgba(52,211,153,0.15), borderRadius: 18px, backdropFilter: blur(18px) saturate(140%)
- Emerald accent: #34d399
- Headings: Lora 500 (serif), Body: Inter
- Inline styles only — no Tailwind
- All icons: Lucide React strokeWidth={1.75}

SCREEN: Guru Chat
The Guru Chat screen is an AI advisor chat interface for Montessori teachers. It has:
- A sticky header with "Ask the Guru" title and child context (child name, avatar)
- A scrollable message thread: user messages (right-aligned, emerald bubble) and AI messages (left-aligned, glass card with subtle emerald left border)
- A bottom input bar: textarea + send button, frosted glass, sticky to bottom
- Optional "Quick prompt" suggestion chips above the input (e.g. "What should I introduce next?", "Write a progress note")
- AI messages may contain structured content (bold headings, bullet lists) — style these elegantly in dark forest
- Loading state: pulsing emerald dots while AI responds

Output a self-contained JSX component `GuruChat` showing the full visual design. Use realistic placeholder content. Export design tokens as a `T` object at the top.
```
---

## Phase 3 Screens (Future)
Notes, Classroom Overview, Focus List, Capture, Progress, Language Semester, Weekly Admin Docs, Classroom Setup

## Phase 4 Modals (Future)
Quick Guide, Full Details, Welcome, BulkPasteImport

---

## Phase 2 Screens Status

| Screen | File | Status |
|--------|------|--------|
| Photo Audit | `app/montree/dashboard/photo-audit/page.tsx` | ✅ Done — `4f89c0ad` |
| Guru Chat | `app/montree/dashboard/guru/page.tsx` | ⏳ Send prompt above to Claude Design |
| Curriculum | `app/montree/dashboard/curriculum/page.tsx` | ⏳ Needs Claude Design bundle |
| Gallery | `app/montree/dashboard/[childId]/gallery/page.tsx` | ⏳ Needs Claude Design bundle |

---

## Phase 3 Screens (Future)
Notes, Classroom Overview, Focus List, Capture, Progress, Language Semester, Weekly Admin Docs, Classroom Setup

## Phase 4 Modals (Future)
Quick Guide, Full Details, Welcome, BulkPasteImport

---

## Key File Locations

```
components/montree/
  DashboardHeader.tsx       ← global header (done)
  MonteeLogo.tsx            ← sprout SVG (one 'e' in filename — NOT MontreeLogo)
  child/
    FocusWorksSection.tsx   ← work rows (done, needs v2 changes above)

app/montree/dashboard/
  layout.tsx                ← mounts DashboardHeader (done)
  [childId]/
    layout.tsx              ← sub-header + avatar (done)
    page.tsx                ← child detail page (done, needs v2 heading + 3rd stat tile)
```

---

## Git Push Rule
**ALWAYS use Desktop Commander:** `mcp__Desktop_Commander__start_process` with:
```
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "..." && git push origin main 2>&1
```
`timeout_ms: 30000`. Never use the Cowork VM bash shell for git push.

---

## Other Session 74+ Priorities (not design-related)

1. **🚨 Railway deploy** — hit "Relaunch to update" to deploy commits `2e94aadc`, `0dfbdd04`, `c8b46ad6` (photo-audit crash fix, replan Stage 0, streaming event fix)
2. **Ukrainian + Russian languages** — full instructions in `CLAUDE.md` Session 73 section
3. **Welcome Тамі** (kiverova_tamila@ukr.net) — Ukrainian organic signup
4. **Send 3 hot Gmail drafts** — Copenhagen (`r5875732429643975187`), Paint Pots UK (`r-8134738077301193428`), Ardtona House UK (`r6746566790609932769`)
5. **FAMM Argentina follow-up** — past Apr 28 deadline, draft now
6. **Disable `tell_guru_onboarding` for Whale Class**: `UPDATE montree_school_features SET enabled=false WHERE school_id='c6280fae-567c-45ed-ad4d-934eae79aabc' AND feature_key='tell_guru_onboarding';`
7. **Fix Resend domain** — verify montree.xyz, update `RESEND_FROM_EMAIL` in Railway
8. **Gate the 6 Sonnet-hardcoded routes** with `resolveReportModel()`
9. **Complete follow-up batch** — 248 remaining `status='sent'` contacts need follow-up template
