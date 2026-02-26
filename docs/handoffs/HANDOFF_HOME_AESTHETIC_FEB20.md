# Handoff: Montree Home Botanical Aesthetic + 3D Montessori Folder

**Date:** February 20, 2026
**Session:** Home program visual branding + 3D printing project setup

---

## What Was Done

### 1. Montree Home Botanical Theme — COMPLETE

Applied "Tender Cartography" botanical aesthetic to all homeschool parent pages. Teachers see ZERO changes — every visual modification is gated behind `isHomeschoolParent()`.

**Design Philosophy:** Warm, naturalist field-guide aesthetic. Dark teal (#0D3330) replaces emerald/violet as primary. Warm cream (#FFF8E7) backgrounds instead of cool slate/emerald gradients. Botanical emoji (🌿🌱) replaces generic icons (🔮👶).

**Files Created (1):**
- `lib/montree/home-theme.ts` — Centralized theme constants (`HOME_COLORS` hex values + `HOME_THEME` Tailwind class strings). Single source of truth for all botanical styling.

**Files Modified (5):**

| File | What Changed |
|------|-------------|
| `components/montree/DashboardHeader.tsx` | Header bg → dark teal for home parents (was emerald gradient) |
| `app/montree/try/page.tsx` | "Parent at Home" button → warm cream with dark teal text. Form labels, submit button, "Enter my home 🌿" all themed. |
| `app/montree/dashboard/guru/page.tsx` | Most extensive changes. All 🔮→🌿, violet→dark teal buttons, cream backgrounds, themed paywall modal, trial banner, response cards, quick questions. Uses local `isParent` var to avoid repeated function calls. |
| `app/montree/dashboard/curriculum/browse/page.tsx` | Dark teal sticky header, warm card backgrounds, themed search/filter, category headers. |
| `app/montree/dashboard/page.tsx` | Cream page bg, dark teal child avatars, themed count bar, botanical empty state (🌱), warm add-child card, dark teal pulse animation. |

**Color Palette Used:**
- Dark Teal: `#0D3330` (primary buttons, headers, text)
- Dark Teal Hover: `#164340` (button hover states)
- Emerald: `#4ADE80` (accent, kept minimal)
- Warm Cream: `#FFF8E7` (page backgrounds)
- Soft Cream: `#F5E6D3` (section backgrounds, hover states)
- Near-White: `#FFFDF8` (card backgrounds)

**Review Status:** Full holistic audit completed via sub-agent. All 30+ conditionals verified: no broken template literals, no ungated styles, consistent color usage, teachers unaffected.

**Plan File:** `.claude/plans/home-aesthetic-v1.md`

### 2. 3D Printable Montessori Classroom — Folder Structure Created

Created `whale/3d-montessori/` with full folder tree matching the concept doc architecture:

```
3d-montessori/
├── README.md                    (concept doc — mission, schema, cost estimates, print schedule)
├── language/                    (sandpaper-letters, moveable-alphabet, object-boxes, grammar-symbols, tracing-boards)
├── mathematics/                 (number-rods, spindle-box, golden-beads, stamp-game, fraction-circles, bead-stairs, teen-ten-boards, cards-counters, strip-boards)
├── sensorial/                   (pink-tower, brown-stair, knobbed/knobless-cylinders, color-tablets, geometric-solids/cabinet, binomial/trinomial-cube, constructive-triangles)
├── practical-life/              (dressing-frames, pouring-sets, transfer-tools, lacing-boards, cutting-strips)
├── culture/                     (puzzle-maps, land-water-forms, botany-cabinet, zoology)
└── guides/                      (empty — for printer setup, filament guide, presentation guides, cost calculator)
```

**Concept doc also saved at:** `docs/CONCEPT_3D_PRINTABLE_CLASSROOM.md`

**Trilingual scope:** English + Afrikaans + Arabic (sandpaper letters, moveable alphabet, object boxes all have per-language subfolders)

**Status:** Folder structure ready. No STL files yet — user has been designing with web Claude separately and will add files when drag-and-drop is working.

---

## Known Issues

- **Drag-and-drop not working** in current session — user couldn't upload 3D design files
- **Migrations 126, 127, 131 STILL not run** — homeschool system can't function until these are applied
- **Zero Stripe env vars** — billing still non-functional

---

## Next Session Priorities

### Feb 21 — Onboarding Process Guide + Guru Home Integration
1. **Onboarding process guide** — Go through the app screen by screen, complete the onboarding flow documentation
2. **Guru-Guided Home Parent Experience** — Build contextual Guru components (GuruContextBubble, GuruInlinePrompt, GuruSuggestionCard) per `docs/HANDOFF_GURU_HOME_INTEGRATION_FEB19.md`

### Feb 22 — Hone the Home System
- Dedicated session to polish and refine the entire homeschool parent experience
- Test end-to-end flows (requires migrations to be run first)
- Fix any visual issues found during onboarding walkthrough
- Potentially add voice notes system (`react-media-recorder` + Whisper)

---

## Files Reference

| File | Purpose |
|------|---------|
| `lib/montree/home-theme.ts` | Centralized botanical theme constants |
| `.claude/plans/home-aesthetic-v1.md` | Implementation plan for this work |
| `docs/CONCEPT_3D_PRINTABLE_CLASSROOM.md` | 3D printing concept doc |
| `3d-montessori/README.md` | Same concept doc, lives in the project folder |
| `docs/HANDOFF_GURU_HOME_INTEGRATION_FEB19.md` | Guru integration design (for tomorrow) |
| `docs/HANDOFF_ONBOARDING_SYSTEM_FEB17.md` | Onboarding system handoff (for tomorrow) |
