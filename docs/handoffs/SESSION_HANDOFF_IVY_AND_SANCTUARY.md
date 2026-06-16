# HANDOFF — Sanctuary (shipped) + Ivy the family companion (in build)

**Date:** 2026-06-16 · **Repo:** `~/Desktop/Master Brain/ACTIVE/montree` (remote `whale-class.git`,
branch `main`). **Push only via Desktop Commander** on the Mac (sandbox SSH keys are stale).

Read order for a fresh session: this file → `docs/handoffs/MONTREE_HOME_COMPANION_PLAN.md` (the Ivy
design) → the two source files already built (below).

---

## PART A — Sanctuary work SHIPPED this session (commit `6291bdfe`, pushed to main)

The Story sanctuary is now genuinely multi-user. What shipped + audited (eslint clean, full isolation
sweep — 32/32 per-space queries scoped, zero leaks):

1. **Per-space coach profiles** — `lib/story/coach/{profile,system-prompt,consolidation,memory,tool-definitions,knowledge-loader}.ts` + `app/api/story/coach/route.ts`. Coach is now name-driven: loads `about-<space>.md`; consolidation/memory/tools/wisdom no longer hardcode "Tredoux". Fixed a LIVE bug: Riddick's coach was impersonating Tredoux. New `lib/story/coach/about-riddick.md`.
2. **Owner member-creation** — `/api/story/admin/{whoami,members}` + `app/story/admin/(personal)/people/page.tsx` + `isOwner`/`OWNER_SPACE` in `lib/story-db.ts`. Owner (space `tredoux`) adds Temba/Bayan/Gloria from the People tab, no SQL. Space-uniqueness enforced.
3. **Shared emergency board** — `migrations/263_emergency_board.sql` (`story_board_messages` + `story_member_push_subscriptions`) + `app/api/story/board/route.ts` + `app/story/admin/(personal)/board/page.tsx` + `sendBoardPush` in `lib/story/push.ts` + `/api/story/push/member-subscribe` + `public/story-sw.js` (honors a generic `url`). One kept room; web-push fan-out to other members.

### 🚨 Tredoux must still do (Part A):
- **Run `migrations/263_emergency_board.sql`** in Supabase (MONTREE project `dmfncjjtsoxrnvcdnvjq`). Until then the Board tab 500s; everything else works.
- **Verify on `www.teacherpotato.xyz`** (sanctuary lives there, NOT montree.xyz) after Railway deploys: Riddick (`R`/`iddick`) coach no longer says "Tredoux"; owner sees People + Board tabs; post to Board; check from another space. Enable alerts on the Board (iOS needs installed PWA).
- **NOT runtime-tested** from the sandbox (no live deploy/DB there). Static + visual audit only.

### Gloria PDFs (side task, done)
`Gloria_Letter.pdf` (1pg) + `Montree_Partnership_Agreement_Gloria.pdf` (2pg, formal) — in the outputs
folder, print-ready, Montree-themed (weasyprint, local Lora + Liberation Sans, `@page:first` for the
full-bleed header + top margin on continuation pages). HTML sources alongside.

---

## PART B — IVY: the family companion (THE BIG BUILD — in progress)

### The vision (Tredoux, converged 2026-06-16)
**One** warm AI companion per family — **Ivy** — that the parent talks to like a trusted person.
Three hats, switched naturally:
1. **Life coach for the parent** — plan their life + protect their wellbeing (the Sanctuary Coach
   pattern, for parents).
2. **Montessori educator for the child** — start from a single photo of what the child loves, then
   guide the child **work by work, step by step**, hand-holding a zero-experience parent every step.
3. **Family manager** — children's routines, the parent's **calendar**, the kids' wellbeing.

Plus **transparency with Guru**: Ivy can see the child's school side (progress, teacher observations)
so home + school are ONE honest picture. The parent has one relationship; it quietly talks to school.
For one child, or two siblings treated as individuals (never a class).

### Decisions LOCKED (carte blanche from Tredoux)
- **Name: Ivy** (`COMPANION_NAME` constant — rename is one line).
- **Voice: confirmed** ("yes, that's it") — warm, plain, hand-holds a nervous parent, ONE step at a time, follows the child, protects the parent.
- **Age scope: start 3–6** (where curriculum + skill graph exist). Toddler 0–3 is a later track.
- **ONE companion, not three** — Ivy IS the Coach extended with educator + family-manager hats + Guru-awareness, running in Montree for parents. The teacher still uses Guru. Don't make parents juggle multiple AIs.
- **Build now.**

### What's BUILT this session (local, eslint-clean, NOT yet committed/wired — safe, nothing imports them yet)
1. `lib/montree/companion/next-step.ts` — **the spine.** `pickNextStep(supabase, childId)` →
   THE one next work + reason. Wraps the real **V3 8-factor engine** and collapses the ranked list to
   one step. Returns `NextStep { work_name, work_key, area, area_label, reason, reasons[], tier, score,
   confidence, is_bridge, bridge_from_area, current_work, current_work_status }`.
2. `lib/montree/companion/system-prompt.ts` — **Ivy's brain.** `buildCompanionSystemPrompt(opts)` +
   `COMPANION_NAME='Ivy'`. Encodes all three hats + Guru transparency + the iron rules (one step at a
   time, hand-hold, follow the child, protect the parent, plain language). Opts include
   `currentStepSection`, `schoolContextSection`, `memorySection`, `isFirstSession`.

### What's NEXT (ordered — Phase 1 finish, then 2–5)
1. **Step Card generator** — `lib/montree/companion/present.ts`. `generateStepCard(supabase, {childId, classroomId, schoolId, step, locale})`: fetch the work's curriculum guide content from `montree_classroom_curriculum_works` (see `app/api/montree/works/guide/route.ts` for the exact columns), then AI (tier-aware) → structured card: `{ why_now, what_you_need[], set_it_up[], show_it[], say[], dont_say[], yes_looks_like[], not_yet_looks_like[] }`. Grounded in curriculum, warm plain-parent language.
2. **Per-child SSE route** — `app/api/montree/companion/route.ts`. Mirror the SSE + tool-loop of `app/api/montree/guru/route.ts` (or `app/api/story/coach/route.ts`). On each turn: load child context, call `pickNextStep`, build the system prompt (inject step + school context + memory), stream. Tools = reuse Guru's `executeTool` (`set_focus_work`, `update_progress`, `save_observation`) + companion tools (`present_step`, `advance_step`) + family tools (calendar/routine) + later life-coach tools.
3. **School-context (Guru bridge)** — a helper that builds `schoolContextSection` from the child's `montree_child_progress` + recent `montree_behavioral_observations` + teacher notes, so Ivy can speak to "what's happening at school." (Same DB — it's a read, not a cross-service call.)
4. **Per-family memory** — mirror `lib/story/coach/memory.ts` + consolidation, scoped per child/family. Start in `montree_children.settings.companion` JSONB; promote to a table if it grows.
5. **Family-manager tools** — calendar + routines. **Reuse Montree's existing calendar/appointments** (`lib/montree/calendar/*`, the events/appointments routes — Sessions 117–129) for "write to the parent's calendar." Routines = lightweight (settings JSONB or a small table).
6. **Life-coach hat** — the parent's own planning + wellbeing. Either reuse the Coach's planner/diary/wellbeing ideas implemented against Montree data, or a lighter parent-planner. (This is the "Coach for parents" half of the premium vision.)
7. **Phase 2 — photo-interest intake** — a NEW vision call that reads the child's INTEREST from a single photo (not "which curriculum work is this"), infers area/sensitive-period, seeds the first step. Distinct from the existing two-pass identifier.
8. **Phase 3 — home UI** — the Step Card is the centerpiece (present → "how did it go?" → next step) under `/montree/home`, reusing `PortalChat` (chat) + `ShelfView`. Two-sibling toggle (Phase 5).

### Integration contracts / gotchas (verified this session)
- **V3 engine** = `generateShelfProposals(childId, childName, progress[], focusWorks[], v3Data?)` in
  `lib/montree/guru/work-sequencer.ts` → `{ proposals, bridge_proposals, v3_active }`. **There are TWO
  skill graphs** — use the Guru one (`lib/montree/guru/skill-graph.ts` + `work-sequencer.ts`), NOT the
  older `lib/montree/skill-graph.ts`.
- **Guru tools** = `executeTool(toolName, input, childId, classroomIdOverride?)` in
  `lib/montree/guru/tool-executor.ts`. Writes `montree_child_focus_works`, `montree_child_progress`,
  `montree_behavioral_observations`, `montree_children.settings`.
- **Curriculum guide content** = `montree_classroom_curriculum_works` (columns: `name, quick_guide,
  parent_description, direct_aims, materials, presentation_steps, control_of_error, why_it_matters,
  guide_content_<locale>`). Reference: `app/api/montree/works/guide/route.ts`.
- **Tier gate** = `resolveReportModel(supabase, schoolId)` → `{ tier, model }` (`lib/montree/reports/resolve-model.ts`). Free tier should degrade gracefully; gate paid AI.
- **AI client** = `lib/ai/anthropic.ts` (`anthropic, AI_MODEL, HAIKU_MODEL`, etc.).
- **Home container** = `plan_type='homeschool'`, `role='homeschool_parent'` (migration 126), classroom "My Home", `montree_children.school_id`. Existing home surfaces: `app/montree/home/*` (`PortalChat`, `ShelfView`, `setup`), `app/api/montree/onboarding/students`, `app/api/montree/children/[childId]/onboard`.
- **Coach brain pattern to mirror** = `lib/story/coach/*` (system-prompt + memory + consolidation + SSE route `app/api/story/coach/route.ts`).
- **Child `settings` JSONB** already holds: `game_plan, developmental_insights, parent_emotional_state, guru_area_reasons`. Add `journey` + `companion` (memory) here to start (no migration).

### Deploy state for Ivy
- The two Ivy files are **local + uncommitted**. They import nothing new that runs at module load and
  are not imported anywhere yet → cannot break the build. Commit when a working slice exists (or commit
  WIP). The Sanctuary work (`6291bdfe`) is already pushed.

---

## PART C — FUTURE (premium, now the active spine via Ivy)
Premium Montree tier = the Coach-for-parents + the 360° child view. It's no longer "someday": Ivy's
Guru bridge (school read) + the life-coach hat (parent planning/wellbeing) + the educator loop together
ARE the 360° companion. Build the home educator loop first; the parent-life + school-transparency hats
layer on as tools.

## Open questions for Tredoux (non-blocking)
- Routines: a real recurring structure, or gentle nudges in chat to start?
- Life-coach hat for parents: full planner/diary/wellbeing (like the Sanctuary) or a lighter version?
- Is there an existing Montree calendar a parent already sees that Ivy should write into, or a new
  parent calendar surface?
