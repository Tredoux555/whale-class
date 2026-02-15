# Montree Home — Build Plan v1 (CORRECTED Feb 15, 2026)

**Date:** Feb 14, 2026 (corrected Feb 15)
**Status:** Phase 1 COMPLETE, Phase 2 next
**Goal:** Add a homeschool parent product to Montree — free activity tracking, paid Guru ($5/month per child)

---

## CRITICAL DESIGN PRINCIPLE

**This is the existing Montree system with a `homeschool_parent` role in `montree_teachers`. We do NOT rebuild anything.**

Homeschool parents are stored in the SAME `montree_teachers` table with `role='homeschool_parent'`. They get a classroom ("My Home"), seeded curriculum, and go through identical onboarding. Same dashboard, same components, same everything.

Previous attempts failed because they created separate tables/routes/systems. Never again.

---

## Product Definition

**What is Montree Home?**
A standalone Montessori homeschool management system for families educating children at home. Parents track works, monitor progress across 5 areas, and optionally pay for AI-powered guidance from the Montree Guru.

**Target user:** Homeschool families doing Montessori at home (NOT parents of enrolled school children — that's the existing parent portal).

**Pricing model:**
- **Free tier:** Full activity tracking, curriculum browsing, progress monitoring, observations — everything the classroom version does
- **Paid tier ($5/month per child):** Guru onboarding (personalized curriculum plan based on age/space/budget) + unlimited ongoing Guru chat advisor
- New signups get **3 free Guru prompts** (trial), then hard paywall kicks in.

**Multi-child:** One parent account manages multiple children (uses standard class list UI — parent sees their kids like a teacher sees their class).

**Auth:** Code-based login (same 6-char pattern as teachers). Self-registration via try/instant flow.

---

## Architecture: Shared Table, Role Flag

**Decision:** Homeschool parents go in `montree_teachers` with `role='homeschool_parent'`. NOT a separate table.

**How it works:**
1. Signup creates `montree_schools` record with `plan_type: 'homeschool'`
2. Creates `montree_classrooms` record named "My Home"
3. Seeds curriculum (same as teacher)
4. Creates `montree_teachers` record with `role: 'homeschool_parent'`
5. Issues JWT with `role: 'homeschool_parent'` (30-day TTL vs 7 for teachers)
6. Parent lands on standard dashboard → adds children through normal onboarding
7. All tracking tables work unchanged — they only need `child_id`

**Why this works:**
- `montree_teachers` already has a `role` column (TEXT, defaults to 'teacher')
- Teacher auth reads role from DB → issues correct JWT
- Dashboard components don't check teacher role — they just render child data
- Child tracking tables only need `child_id` — no coupling to teacher type

---

## Phase 1 — Foundation ✅ COMPLETE (Feb 15, 2026)

**Commits:** `9378007e` (initial), `cb5bfd24` (corrected to identical teacher flow)

### What was built:

| File | Change |
|------|--------|
| `migrations/126_homeschool_tables.sql` | Adds `school_id` to `montree_children` + backfill. No new tables. |
| `lib/montree/server-auth.ts` | `'homeschool_parent'` role, 30-day TTL, optional role on `setMontreeAuthCookie()` |
| `lib/montree/verify-request.ts` | Accept `'homeschool_parent'` role |
| `lib/montree/types.ts` | `MontreeRole` type union |
| `app/montree/try/page.tsx` | 3rd button "Parent at Home", same form (name + homeschool name + email) |
| `app/api/montree/try/instant/route.ts` | Homeschool branch: classroom "My Home", seed curriculum, `montree_teachers` with role |
| `app/api/montree/auth/teacher/route.ts` | Reads `role` from DB, correct JWT/cookie TTL |
| `app/montree/login/page.tsx` | Simplified — single auth call handles both |

**Migration required:** Run `migrations/126_homeschool_tables.sql` against Supabase.

**Dead file:** `app/api/montree/auth/homeschool/route.ts` — unused, delete when FUSE allows.

---

## Phase 2 — Dashboard (Role-Based Trimming) ⬜ NEXT

Since homeschool parents use the SAME dashboard, Phase 2 is about hiding school-specific features.

### 2A. Role-Based UI Hiding

In dashboard pages, check session role and conditionally hide:
- Parent invite system (they ARE the parent)
- Parent reports / weekly summaries (they see progress directly)
- Classroom management UI (they have one "classroom" = their home)
- Teacher management (no other teachers)
- School admin panel link
- Student transfer between classrooms

Keep everything else unchanged.

### 2B. Session Handling

The `montree_session` localStorage already stores the teacher object. Need to ensure the dashboard reads it correctly for homeschool parents (it should — same shape).

### 2C. Verify Child Operations

Verify these work for homeschool parents (they should — they use classroom_id):
- Add child to classroom
- Remove child
- View child week view
- Track progress, add focus works, extras, observations

### 2D. Possible: Custom welcome/empty state

When a homeschool parent first lands with no children, show a friendly "Welcome! Add your first child to get started" instead of teacher-oriented messaging.

---

## Phase 3 — Guru (Onboarding + Freemium Gate) ⬜

### 3A. Guru Onboarding Flow

Multi-step guided setup (runs once per child, can be re-run):
1. **Child info** — confirm name, age
2. **Space** — "Describe your learning space" (living room corner / dedicated room / outdoor / mixed)
3. **Materials budget** — Monthly budget ($0-20 / $20-50 / $50-100 / $100+)
4. **Existing materials** — Checklist of common Montessori materials
5. **Goals** — What matters most? (independence / academic readiness / concentration / social skills / all-round)
6. **Submit** → Claude generates personalized curriculum plan

### 3B. Ongoing Guru Chat

Reuse existing Guru system entirely. Modify system prompt for homeschool context:
- Address parent (not teacher)
- Replace "classroom" language with "home learning environment"
- Add home-specific advice patterns

### 3C. Freemium Gate

- Add `guru_prompts_used` tracking (column on `montree_teachers` or separate counter)
- After 3 free prompts → paywall overlay
- "Unlock Guru — $5/month per child"

### 3D. Stripe Integration

- Stripe Checkout session → redirect → webhook → update plan status
- Per-child billing: $5/month per child
- New env var: `STRIPE_PRICE_HOMESCHOOL_GURU`

---

## Phase 4 — Curriculum Browser ⬜

### 4A. Browse Works by Area
- 5 area cards (same design as teacher curriculum page)
- Tap area → see works filtered by child's age range

### 4B. Age-Filtered Recommendations
- Highlight age-appropriate works, grey out advanced ones
- Show prerequisite chains

### 4C. Materials List
- Aggregate shopping list for recommended works, deduplicated
- Filter by area, sort by priority

### 4D. Add Works to Child
- "Add to my child's plan" → existing `montree_child_work_progress` mechanism
- Same as teacher adding works via WorkPickerModal

---

## Key Decisions (All Resolved)

| Decision | Answer |
|----------|--------|
| Architecture | `montree_teachers` table, `role='homeschool_parent'` |
| Branding | Same as classroom (same Mercedes, different driver) |
| Signup | Third option on try flow ("I'm a parent") |
| Onboarding | IDENTICAL to teacher — school + classroom + add children |
| Custom works | Yes, same WorkPickerModal UI |
| Observations | Yes, full system, same as classroom |
| Free tier | Full tracking (everything except Guru) |
| Paid tier | $5/child/month for Guru access |
| Free trial | 3 free Guru prompts, then hard paywall |
| Multi-child | Standard class list UI |
| Login | Same page, same auth endpoint |
