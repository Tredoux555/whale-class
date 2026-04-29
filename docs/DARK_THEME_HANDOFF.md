# Montree — Full Dark Forest Theme Implementation Plan

**Goal:** Convert every teacher-facing screen to the dark forest aesthetic.  
**Reference:** The landing page (`/montree/page.tsx`) and the dashboard grid (done Apr 29) are the north star.  
**Design workflow:** Claude Design mocks up each screen → exports source MD → I implement into the real codebase.

---

## The Design System (canonical tokens)

```
Background:   #0a1a0f  (deep dark forest)
BgDeep:       #07120c  (header/nav, deeper)
Glass:        rgba(255,255,255,0.06)   — card surfaces
Border:       rgba(52,211,153,0.15)    — default
BorderStrong: rgba(52,211,153,0.32)    — focus/active
TextPrimary:  #ffffff
TextSecondary:rgba(255,255,255,0.60)
TextMuted:    rgba(255,255,255,0.40)
Emerald:      #34d399
Teal:         #14b8a6
Amber:        #f59e0b  (warnings — "to audit", status badges)
AmberSoft:    rgba(245,158,11,0.18)

Off-centre glow (landing page, fixed):
  radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), rgba(39,129,90,0.18) 30%, transparent 60%)

Glass card:
  background: rgba(255,255,255,0.06)
  border: 1px solid rgba(52,211,153,0.15)
  border-radius: 18px
  backdrop-filter: blur(18px) saturate(140%)

Sticky header surface:
  background: linear-gradient(180deg, rgba(10,26,15,0.92) 0%, rgba(10,26,15,0.72) 100%)
  border-bottom: 1px solid rgba(52,211,153,0.15)
  backdrop-filter: blur(20px) saturate(140%)

Avatar (bioluminescent):
  background: rgba(16,185,129,0.15)
  box-shadow: 0 0 20px 6px rgba(52,211,153,0.30)
  overflow: visible  ← NEVER clip this

Typography:
  Headings: Lora serif, weight 500-600
  Body:     Inter, system-ui
```

---

## Status Tracker

| # | Component / Screen | File | Status | Claude Design needed? |
|---|---|---|---|---|
| 1 | **DashboardHeader** | `components/montree/DashboardHeader.tsx` | ⬜ TODO | Yes — screenshot + spec |
| 2 | **··· More Menu dropdown** | Inside DashboardHeader | ⬜ TODO | Bundled with #1 |
| 3 | **Child Detail page** | `app/montree/dashboard/[childId]/page.tsx` | ⬜ TODO | Yes — most complex |
| 4 | **Child Detail layout** | `app/montree/dashboard/[childId]/layout.tsx` | ⬜ TODO | Bundled with #3 |
| 5 | **Photo Audit** | `app/montree/dashboard/photo-audit/page.tsx` | ⬜ TODO | Yes |
| 6 | **Guru Chat** | `app/montree/dashboard/guru/page.tsx` | ⬜ TODO | Yes |
| 7 | **Curriculum** | `app/montree/dashboard/curriculum/page.tsx` | ⬜ TODO | Yes |
| 8 | **Gallery** | `app/montree/dashboard/[childId]/gallery/page.tsx` | ⬜ TODO | Yes |
| 9 | **Weekly Wrap** | `app/montree/dashboard/weekly-wrap/page.tsx` | ⬜ TODO | Yes |
| 10 | **Notes** | `app/montree/dashboard/notes/page.tsx` | ⬜ TODO | No — simple |
| 11 | **Classroom Overview** | `app/montree/dashboard/classroom-overview/page.tsx` | ⬜ TODO | No |
| 12 | **Focus List** | `app/montree/dashboard/focus/page.tsx` | ⬜ TODO | No |
| 13 | **Capture** | `app/montree/dashboard/capture/page.tsx` | ⬜ TODO | No |
| 14 | **Progress (child)** | `app/montree/dashboard/[childId]/progress/page.tsx` | ⬜ TODO | No |
| 15 | **Language Semester** | `app/montree/dashboard/language-semester/page.tsx` | ⬜ TODO | No |
| 16 | **Weekly Admin Docs** | `app/montree/dashboard/weekly-admin-docs/page.tsx` | ⬜ TODO | No |
| 17 | **Classroom Setup** | `app/montree/dashboard/classroom-setup/page.tsx` | ⬜ TODO | No |
| 18 | **Quick Guide modal** | `components/montree/child/FocusWorksSection.tsx` | ⬜ TODO | Bundled with #3 |
| 19 | **Login/Select** | `app/montree/login-select/page.tsx` | ✅ DONE | — |
| 20 | **Landing page** | `app/montree/page.tsx` | ✅ DONE | — |
| 21 | **For Teachers** | `app/montree/for-teachers/page.tsx` | ✅ DONE | — |
| 22 | **Dashboard grid** | `app/montree/dashboard/page.tsx` | ✅ DONE | — |

---

## Execution Order (prioritised by impact)

### Phase 1 — Global (kills the bright green strip everywhere) ← START HERE
**1. DashboardHeader + More Menu**

The header renders on EVERY screen. This is the single highest-leverage change.

**Claude Design prompt:**
> Redesign the Montree DashboardHeader for the dark forest aesthetic. It's a sticky top bar that appears on every teacher screen. Currently: bright emerald gradient `from-emerald-500 to-teal-600`. Redesign as: dark glass `linear-gradient(180deg, rgba(7,18,12,0.96) 0%, rgba(7,18,12,0.90) 100%)`, `border-bottom: 1px solid rgba(52,211,153,0.15)`, `backdrop-filter: blur(20px) saturate(140%)`. Contents left-to-right: sprout logo + "Whale Class" in Lora serif + teacher name pill. Right side: Language toggle pill, camera icon button, mic icon button, ··· menu button — all in dark glass style, emerald accent on active/hover.
>
> Also redesign the ··· dropdown panel: currently white with gray text. New: dark glass `rgba(8,20,12,0.95)` background, `border: 1px solid rgba(52,211,153,0.15)`, `backdrop-filter: blur(24px)`. Menu items: `rgba(255,255,255,0.75)` text, hover state `rgba(52,211,153,0.08)` background. Active item: emerald text `#34d399`.
>
> Export full source as markdown bundle.

**What I change in code:**
- Line 315 in `DashboardHeader.tsx`: replace `bg-gradient-to-r from-emerald-500 to-teal-600` with inline dark glass styles
- The more menu panel: replace `bg-white` with dark glass
- Menu item hover/active states: replace `bg-emerald-50 text-emerald-700` with dark glass variants

---

### Phase 2 — Core Screens (most-used teacher screens)

**2. Child Detail page** (`[childId]/page.tsx`)
This is where teachers spend 80% of their time. Most complex screen.

**Claude Design prompt:**
> Design the Montree child detail screen in dark forest aesthetic. It shows: back arrow + child name + "Whale Class" sub-label in the sub-header. Below: a search bar "Find a work...", then Gallery/Present/print buttons. Then "This Week's Focus" section with 5 work rows — each has a coloured circle (area colour: pink=Practical Life, teal=Sensorial, purple=Math, green=Language, orange=Cultural), work name, status badge ("Presented" in amber glass), expand chevron. Expanded row shows: Quick Guide button (emerald), observation text area (dark glass), mic + Save buttons.
>
> Dark forest system: bg `#0a1a0f`, cards = dark glass `rgba(255,255,255,0.06)` with emerald borders. Status badges: amber glass for Presented, emerald glass for Practicing, white glass for Mastered. Area circles keep their colour identity but muted — `rgba(color, 0.25)` background. Work name in white. Export full source MD.

**3. Photo Audit** — grid of photo cards, AI guess pills, Confirm/Fix buttons
**4. Guru Chat** — already dark-ish, mainly background + input bar
**5. Curriculum** — 5 area cards

---

### Phase 3 — Secondary Screens (no Claude Design needed — simpler pages)

For these I apply the pattern directly:
- Page bg → `#0a1a0f` + fixed glow
- White cards → dark glass
- Gray text → `rgba(255,255,255,0.6)`
- White inputs → dark glass pill
- `border-gray-*` → `rgba(52,211,153,0.15)`

Screens: Notes, Classroom Overview, Focus List, Capture, Progress, Language Semester, Weekly Admin Docs, Classroom Setup.

---

### Phase 4 — Modals & Shared Components

- Quick Guide modal (orange header → dark glass + emerald accent)
- Full Details modal
- Welcome modal
- BulkPasteImport modal

---

## Claude Design screenshot workflow

For each screen needing Design:
1. Screenshot the current screen on production
2. Send Design: current screenshot + dark forest spec + what the screen contains
3. Design exports source MD
4. Bring source MD here → I implement into the real file

**Key instruction to always include in Design prompts:**
> Export full source as markdown bundle. Self-contained JSX only — no Tailwind, inline styles only. Dark forest system: bg #0a1a0f, glass rgba(255,255,255,0.06), border rgba(52,211,153,0.15), emerald #34d399, Lora serif headings, Inter body. Off-centre glow fixed at 88% 8%.

---

## What NOT to touch (scope boundary)

- Parent portal screens (HOME_THEME — separate aesthetic, cream/botanical, leave alone)
- Whale Class admin tools (`/admin/*`)
- Super admin panel
- Story system
- Games

---

## Session log

| Date | Session | What was done |
|------|---------|---------------|
| Apr 29 | Session 74+ | Dashboard grid dark, off-centre glow, bioluminescent avatars, mobile nav fix |
| — | Next | DashboardHeader + more menu (Phase 1) |
