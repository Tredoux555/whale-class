# Montree Home Aesthetic Overhaul — Plan v1

**Date:** Feb 20, 2026
**Goal:** Apply Montree's "Tender Cartography" botanical aesthetic to all homeschool parent pages. Teachers see ZERO changes.

---

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Warmth level | Moderate — `#FFF8E7` primary, `#FFFDF8` cards | Visible warmth without being overwhelming |
| Home icon | Keep 🌳 — show "My Home" text instead of classroom name | Brand consistency; the classroom name already says "My Home" |
| Font | Stay with Inter | Adding Poppins adds weight for minimal gain right now |
| Guru icon | `🌿` for home parents, keep `🔮` for teachers | Botanical feel vs mystical — matches Tender Cartography |
| Try page button | Warm cream `#FFF8E7` bg with dark teal `#0D3330` text | High contrast, visually distinct from teacher/principal buttons |

---

## Brand Palette (Home Parent)

```
Dark Teal:    #0D3330  (headers, primary buttons, text emphasis)
Emerald:      #4ADE80  (accents, highlights, success states)
Warm Cream:   #FFF8E7  (page backgrounds)
Soft Cream:   #F5E6D3  (secondary backgrounds, cards)
Near-White:   #FFFDF8  (card surfaces)
Deep Emerald: #164340  (hover states for dark teal)
```

---

## New File (1)

### `lib/montree/home-theme.ts` — Centralized theme constants

Exports a `HOME_THEME` object with all branded class strings:
- `headerBg` — dark teal for header
- `pageBg` — warm cream page background
- `cardBg` — near-white card surface
- `primaryBtn` — dark teal button with hover
- `accentText` — emerald accent
- `guruIcon` — 🌿
- `inputFocus` — dark teal focus ring
- `sectionBg` — soft cream for sections

Plus a `useHomeTheme()` hook or simple helper that checks `isHomeschoolParent()` once and returns either `HOME_THEME` or `null`.

---

## Files Modified (6)

### 1. `components/montree/DashboardHeader.tsx` (75 lines)

**Current:** `bg-gradient-to-r from-emerald-500 to-teal-600` hardcoded for all users.

**Change:**
- Import `isHomeschoolParent` from auth
- Read session in existing `useEffect` (already does this)
- Conditionally apply `bg-[#0D3330]` when homeschool parent, else keep current gradient
- Button hover states: `hover:bg-white/20` works for both (already in place)

**Impact:** ~5 lines changed. Header becomes deep forest teal for home parents.

### 2. `app/montree/try/page.tsx` (386 lines)

**Current:** Three role buttons all use bright gradient buttons. "Parent at Home" is `from-emerald-500 to-teal-500`.

**Changes:**
- "Parent at Home" button: cream background `bg-[#FFF8E7]` with dark teal text `text-[#0D3330]`, subtle border `border border-[#0D3330]/20`
- Add a small 🌿 leaf before the emoji to hint at botanical feel
- When `selectedRole === 'homeschool_parent'` on the details step:
  - Form labels: dark teal `text-[#0D3330]` instead of `text-emerald-300/70`
  - Input borders: `border-[#0D3330]/20` focus ring `focus:border-[#0D3330]/50`
  - Submit button: `bg-[#0D3330]` instead of emerald gradient
- Code reveal step: Dark teal accent instead of emerald

**Impact:** ~20 lines changed. Home parent signup feels warm and botanical.

### 3. `app/montree/dashboard/guru/page.tsx` (657 lines)

**Current:** Violet/indigo theme for everyone. `🔮` emoji. `from-violet-50 via-indigo-50 to-purple-50`.

**Changes (all gated behind `isHomeschoolParent()`):**
- Page background: `bg-[#FFF8E7]` instead of violet gradient
- Loading state: `🌿` bounce instead of `🔮`
- Sub-header: stays `bg-white` but emoji changes to `🌿`
- Subtitle: Already different ("AI-powered insights for your homeschool")
- Ask button: `bg-[#0D3330] hover:bg-[#164340]` instead of violet gradient
- Quick questions: `hover:bg-[#F5E6D3]` instead of `hover:bg-violet-50`
- Response cards: Keep white but accent colors shift (teal instead of violet for headers)
- Paywall modal: Dark teal primary button, cream background section, `🌿` icon
- Free trial banner: `bg-[#F5E6D3] border-[#0D3330]/20 text-[#0D3330]` instead of violet

**Impact:** ~40 lines changed. Guru page feels like a wise garden guide for home parents.

### 4. `app/montree/dashboard/curriculum/browse/page.tsx` (515 lines)

**Current:** Clinical `bg-slate-50`, white cards, slate borders.

**Changes (gated behind `isParent` state which already exists):**
- Page background: `bg-[#FFF8E7]` instead of `bg-slate-50`
- Sticky header: `bg-[#0D3330] text-white` instead of `bg-white`
- Area tabs bar: `bg-[#FFFDF8]` instead of `bg-white`
- Search input focus: `focus:ring-[#0D3330]` instead of emerald
- Category headers: warmer card styling
- Work cards: `bg-[#FFFDF8]` instead of plain white

**Impact:** ~15 lines changed. Curriculum browser feels like a botanical catalogue.

### 5. `app/montree/dashboard/page.tsx` (~150 lines)

**Current:** Need to confirm exact structure, but likely gradient backgrounds.

**Changes:**
- If there's a welcome section, apply warm cream background
- "X children" label area: warmer styling for home parents
- Empty state: botanical feel ("Welcome home! Add your first child...")

**Impact:** ~8 lines changed.

### 6. `app/montree/dashboard/layout.tsx` (57 lines)

**Current:** Wraps all dashboard pages with DashboardHeader + FeedbackButton.

**Change:** No structural changes needed — DashboardHeader handles its own theming. But if the layout has a background color class, conditionally warm it for home parents.

**Impact:** ~3 lines changed.

---

## What Does NOT Change

- **Teacher experience** — Zero visual changes for teachers or principals
- **Area colors** (AREA_CONFIG) — P/S/M/L/C colors stay the same
- **Functionality** — No API changes, no logic changes
- **Dependencies** — No new npm packages
- **Landing page** (`/montree/page.tsx`) — Stays as-is for now (both roles see it pre-login)
- **Child week view** (`/montree/dashboard/[childId]`) — Stays as-is (functional page, not a branding surface)

---

## Implementation Order

1. Create `lib/montree/home-theme.ts` (new file — theme constants)
2. Modify `DashboardHeader.tsx` (quick win — sets the tone)
3. Modify `try/page.tsx` (first impression for new signups)
4. Modify `guru/page.tsx` (biggest visual impact)
5. Modify `curriculum/browse/page.tsx` (botanical catalogue feel)
6. Modify `dashboard/page.tsx` (warm welcome)
7. Review all changes holistically

**Estimated time:** ~1 hour total. All changes are CSS/Tailwind only.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking teacher UI | Every change gated behind `isHomeschoolParent()` |
| Hardcoded hex colors hard to maintain | Centralized in `home-theme.ts` |
| Area colors clashing with warm cream | Area colors tested against `#FFF8E7` — good contrast |
| Migrations not run (features don't work) | Aesthetic changes are visual only — work regardless of DB state |
