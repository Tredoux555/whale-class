# Handoff: Montree Home — Phase 1 Complete (Feb 15, 2026)

## What is Montree Home?

A Montessori homeschool product for families educating children at home. Parents track works, monitor progress across 5 areas, and optionally pay for AI-powered guidance from the Montree Guru.

**Target user:** Homeschool families doing Montessori at home (NOT parents of enrolled school children — that's the existing parent portal).

**Pricing model:**
- **Free tier:** Full activity tracking, curriculum browsing, progress monitoring, observations — everything the classroom version does
- **Paid tier ($5/month per child):** Guru onboarding (personalized curriculum plan based on age/space/budget) + unlimited ongoing Guru chat advisor
- New signups get **3 free Guru prompts** (trial), then hard paywall

---

## CRITICAL DESIGN PRINCIPLE

**This is the existing Montree system with a `homeschool_parent` role bolted on. We do NOT rebuild anything.**

The classroom product is excellent. Homeschool parents get the SAME product. Same table (`montree_teachers`), same classroom, same curriculum seeding, same dashboard, same onboarding. The only difference is `role='homeschool_parent'` in the DB and a 30-day cookie instead of 7.

Previous attempts to build a separate Home product failed because they duplicated code. This time: **identical flow, role flag only**.

---

## Architecture — CORRECTED (Feb 15)

**Initial design (WRONG):** Separate `montree_homeschool_parents` table, skip classroom creation, create first child at signup.

**Corrected design (CURRENT):** Homeschool parents stored in `montree_teachers` with `role='homeschool_parent'`. They get a classroom ("My Home"), curriculum is seeded, and they add children from the dashboard — exactly like a teacher.

### How it works:
1. Signup creates `montree_schools` record with `plan_type: 'homeschool'`
2. Creates `montree_classrooms` record named "My Home" (same as teacher gets "My Classroom")
3. Seeds curriculum into classroom (same as teacher)
4. Creates record in `montree_teachers` with `role: 'homeschool_parent'`
5. Issues JWT with `role: 'homeschool_parent'` (30-day TTL vs 7 for teachers)
6. Parent lands on standard dashboard → adds children through normal onboarding
7. All tracking, observations, focus works, extras, work picker — unchanged

### Why this works:
- `montree_teachers.role` column already exists (TEXT, defaults to 'teacher')
- Teacher auth route reads role from DB → issues correct JWT
- All tracking tables only need `child_id` — no coupling to teacher type
- Dashboard components don't check teacher role — they just render child data

---

## What Was Built (Phase 1)

### Commits:
- `9378007e` — Initial Phase 1 push (had separate homeschool_parents table — WRONG approach)
- `cb5bfd24` — Corrected: identical flow as teacher, no separate table

### Files Modified:

| File | Change |
|------|--------|
| `migrations/126_homeschool_tables.sql` | **Simplified:** Only adds `school_id` column to `montree_children` + backfill. No new tables. |
| `lib/montree/server-auth.ts` | Added `'homeschool_parent'` to role union, 30-day TTL, optional role param on `setMontreeAuthCookie()` |
| `lib/montree/verify-request.ts` | Accept `'homeschool_parent'` role |
| `lib/montree/types.ts` | Added `MontreeRole` type union |
| `app/montree/try/page.tsx` | 3rd role button "Parent at Home", same form as teacher (name + homeschool name + email) |
| `app/api/montree/try/instant/route.ts` | Homeschool branch: creates classroom "My Home", seeds curriculum, stores in `montree_teachers` with role |
| `app/api/montree/auth/teacher/route.ts` | Reads `role` from DB, issues correct JWT/cookie TTL for homeschool parents |
| `app/montree/login/page.tsx` | Simplified — single auth call handles both teachers and homeschool parents |

### Dead File (can delete when FUSE allows):
- `app/api/montree/auth/homeschool/route.ts` — Created in first push, no longer needed. Nothing calls it.

### Migration Required:
```sql
-- Run against Supabase before testing:
-- migrations/126_homeschool_tables.sql
ALTER TABLE montree_children ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE;
UPDATE montree_children c SET school_id = cl.school_id FROM montree_classrooms cl WHERE c.classroom_id = cl.id AND c.school_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_children_school_id ON montree_children(school_id);
```

---

## Full 4-Phase Gameplan

| Phase | What | Status |
|-------|------|--------|
| 1 | Foundation — auth + DB + signup/login (identical to teacher flow) | ✅ Done |
| 2 | Dashboard — parent lands on `/montree/dashboard`, adds children, tracks works | ⬜ Next |
| 3 | Guru — onboarding flow (age/space/budget→curriculum) + freemium gate + Stripe | ⬜ Not started |
| 4 | Curriculum browser — browse works by area, age filtering, materials list | ⬜ Not started |

### Phase 2 — Dashboard (Reuse + Trim)

Since homeschool parents use the SAME `montree_teachers` table and SAME dashboard, Phase 2 is about:

1. **Role-based UI trimming** — Hide school-specific features when `role='homeschool_parent'`:
   - Hide: Parent invite system, parent reports, classroom management, teacher management, school admin
   - Keep: Everything else (child list, week view, progress, observations, focus works, extras, work picker, curriculum)

2. **Dashboard route decision:** Use SAME `/montree/dashboard` (role checks in components) OR separate `/montree/home/*` route tree that imports shared components. Recommendation: same dashboard, role-based hiding.

3. **Add/remove children API** (may already work via existing endpoints)

### Phase 3 — Guru (Onboarding + Freemium)

1. **Guru onboarding** — Multi-step questionnaire: child age, learning space, materials budget, existing materials, goals → Claude generates personalized curriculum plan
2. **Ongoing Guru chat** — Reuse existing Guru system entirely (context-builder, knowledge-retrieval, stream API). Modify system prompt for homeschool context.
3. **Freemium gate** — Track `guru_prompts_used` (add column to `montree_teachers` for homeschool parents). After 3 free prompts → paywall.
4. **Stripe billing** — $5/month per child. Checkout session → webhook → update plan status.

### Phase 4 — Curriculum Browser

1. **Browse works by area** — 5 area cards, tap to see works filtered by child's age
2. **Age-filtered recommendations** — Highlight age-appropriate works, grey out advanced ones
3. **Materials list** — Aggregate shopping list for recommended works
4. **Add works to child** — Same mechanism as teacher (WorkPickerModal → `montree_child_work_progress`)

---

## Key Decisions (All Resolved)

| Decision | Answer |
|----------|--------|
| Architecture | Shared codebase, role flag in `montree_teachers.role` |
| Branding | Same as classroom (same Mercedes, different driver) |
| Signup | Third option on existing try flow ("I'm a parent") |
| Onboarding | Identical to teacher — create "school", create "classroom", add children from dashboard |
| Custom works | Yes, same WorkPickerModal UI |
| Observations | Yes, full system, same as classroom |
| Free tier | Full tracking (everything except Guru) |
| Paid tier | $5/child/month for Guru access |
| Free trial | 3 free Guru prompts, then hard paywall |
| Multi-child | Standard class list UI — parent sees kids like teacher sees students |
| Login | Same login page, same auth endpoint — teacher auth handles both roles |

---

## Git Push Method

Normal `git push` is broken (repo is 1.8GB, SSH/HTTPS both fail). Use GitHub REST API:
- Script: `/sessions/dreamy-great-wright/push-phase1.py` (create blob → create tree → create commit → update ref)
- PAT embedded in git remote URL
- GitHub HEAD after Phase 1: `cb5bfd24`
