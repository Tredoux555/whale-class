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

### Recent commits
- `2a52240c` — layout.tsx + [childId]/layout.tsx dark theme
- `81cba5ce` — FocusWorksSection full dark forest conversion
- `46b2a6fa` — Fix MontreeLogo import typo (was breaking Railway build)
- `bcd0c4e4` — AreaDot colored circles + stats tiles on child page

---

## 🚨 IMMEDIATE NEXT TASK — Bundle v2 Implementation

The user uploaded `child-detail-bundle (1).md` — this is v2 of the Child Detail mock from Claude Design. It supersedes the v1 bundle.

**Key structural differences vs what's currently in the codebase:**

### 1. Multi-expand (BREAKING CHANGE to FocusWorksSection props)
The mock uses `Set<number>` to track open rows — multiple rows can be open simultaneously.
Currently the codebase uses `expandedIndex: string | null` (accordion — one at a time).

**Required changes:**
- `FocusWorksSection.tsx` prop `expandedIndex: string | null` → `expandedAreas: Set<string>`
- `FocusWorksSection.tsx` prop `setExpandedIndex` → `toggleArea: (area: string) => void`
- `app/montree/dashboard/[childId]/page.tsx`: change state from `useState<string | null>(null)` to `useState<Set<string>>(new Set())`
- Update the `isExpanded` check inside FocusWorksSection: `expandedAreas.has(area)` instead of `expandedIndex === area`
- Update the toggle: `toggleArea(area)` adds/removes from Set instead of replacing

### 2. Each work row = its own glass card (VISUAL CHANGE)
The mock renders each row as a separate `<Glass>` card with `borderRadius: 18` and `overflow: hidden`.
Currently all rows live inside ONE shared glass container.

**Required changes in `FocusWorksSection.tsx`:**
- The outer `<div style={{ background: C.glass, border: ..., borderRadius: 18 }}>` wrapper becomes just a `<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>` (no glass styling)
- Each area row gets wrapped in its own `<div style={{ background: isExpanded ? C.cardHover : C.glass, border: T.cardBorder, borderRadius: 18, overflow: 'hidden', backdropFilter: T.blur }}>`

### 3. Section heading moves OUTSIDE the card (VISUAL CHANGE)
The mock has "This Week's Focus" heading as a standalone `<h2>` ABOVE the row cards, not inside a container card.

**Required changes:**
- In `FocusWorksSection.tsx`: remove the section title `<h2>` from inside the component (it currently lives in the game plan header block)
- In `app/montree/dashboard/[childId]/page.tsx`: add the heading above `<FocusWorksSection>`:
  ```tsx
  <div style={{ marginBottom: 22, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
    <h2 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 30, fontWeight: 500, color: 'rgba(255,255,255,0.95)', letterSpacing: -0.4, margin: 0 }}>
      {t('focusWorks.title')}
    </h2>
    <span style={{ fontFamily: "'Inter', ...", fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
      {focusWorks.length} works in rotation
    </span>
  </div>
  ```

### 4. Stats tiles — third tile (Photos) not yet wired
The v2 mock has 3 stat tiles: Mastered / Practicing / **This Week's Photos**.
Currently only Mastered + Practicing are implemented (2-col grid).

To add Photos tile:
- Need a photo count — either fetch `/api/montree/children/${childId}/photo-count?week=current` (check if this endpoint exists) or add a `photoCount` to the progress API response.
- Import `Camera` from lucide-react in page.tsx
- Change the grid to `gridTemplateColumns: 'repeat(3, 1fr)'`
- Add the amber tile with Camera icon

---

## Phase 2 Screens (Not Started)

After the child detail fixes above, these screens need the same dark forest treatment:

| Screen | File |
|--------|------|
| Photo Audit | `app/montree/dashboard/photo-audit/page.tsx` |
| Guru Chat | `app/montree/dashboard/guru/page.tsx` |
| Curriculum | `app/montree/dashboard/curriculum/page.tsx` |
| Gallery | `app/montree/dashboard/[childId]/gallery/page.tsx` |

**Process for each:** Send `Child-Detail-brief.md` (already in codebase uploads) + relevant screen brief to Claude Design → get JSX bundle → implement here.

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
