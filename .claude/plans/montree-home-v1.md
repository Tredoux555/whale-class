# Montree Home — Build Plan v1

**Date:** Feb 14, 2026
**Status:** APPROVED STRATEGY — awaiting implementation start
**Goal:** Add a homeschool parent product to Montree — free activity tracking, paid Guru ($5/month per child)

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

## Architecture Decision: Shared Codebase

**Decision:** Extend existing codebase with `homeschool_parent` role. NOT a separate copy.

**Rationale:**
- Child tracking (`montree_child_progress`, `montree_child_focus_works`, `montree_child_extras`) only needs `child_id` — no school/classroom coupling
- Guru system has zero school dependency — fully reusable
- Dashboard components are loosely coupled — just hide school-specific features per role
- The old Home product was a separate copy and ended up as dead code (deleted in cleanup). Don't repeat that mistake.

**How it works:**
- Homeschool signup creates a `montree_schools` record with `plan_type: 'homeschool'` (reuse tenant model)
- No `montree_classrooms` row created (implicit "home")
- New `montree_homeschool_parents` table (mirrors `montree_teachers` structure)
- Children stored in existing `montree_children` table (linked to the homeschool "school")
- All tracking tables (`montree_child_progress`, etc.) work unchanged
- JWT token carries `role: 'homeschool_parent'` — UI conditionally hides school features

---

## Phase 1 — Foundation (Auth + Database + Signup)

### 1A. Database Migration (`migrations/126_homeschool_tables.sql`)

**New table: `montree_homeschool_parents`**
```sql
CREATE TABLE montree_homeschool_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  login_code TEXT UNIQUE,
  password_hash TEXT,
  password_set_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  guru_plan TEXT DEFAULT 'free',  -- 'free' | 'paid'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_homeschool_parents_school ON montree_homeschool_parents(school_id);
CREATE INDEX idx_homeschool_parents_login_code ON montree_homeschool_parents(login_code);
CREATE INDEX idx_homeschool_parents_email ON montree_homeschool_parents(email);
```

**No new children table needed** — reuse `montree_children` (already has `school_id` FK). Homeschool children belong to the homeschool "school" record.

### 1B. Auth System Changes

**Files to modify:**
- `lib/montree/server-auth.ts` — Add `'homeschool_parent'` to `MontreeTokenPayload.role` union type. Add `createHomeschoolToken()` function (same pattern as `createMontreeToken()`, 30-day expiry instead of 7).
- `lib/montree/verify-request.ts` — Accept `'homeschool_parent'` in role validation. `verifySchoolRequest()` returns same shape.
- `lib/montree/types.ts` — Add `HomeschoolParent` interface, add `'homeschool'` to plan types.

### 1C. Signup Flow

**Modify:** `app/montree/try/page.tsx`
- Add 3rd role button: "👨‍👩‍👧 Parent at Home" alongside "Teacher" and "Principal"
- When selected, step 2 asks: parent name + email (optional) + first child's name + child's age
- Submits to same `/api/montree/try/instant` endpoint with `role: 'homeschool_parent'`

**Modify:** `app/api/montree/try/instant/route.ts`
- Add `homeschool_parent` branch:
  1. Create `montree_schools` record with `plan_type: 'homeschool'`, `name: "{Parent}'s Home"`
  2. **Skip** classroom creation
  3. Create `montree_homeschool_parents` record with login code + bcrypt hash
  4. Create first child in `montree_children` (linked to homeschool school)
  5. Seed lite curriculum for child's age range (subset of full curriculum — age-appropriate works only)
  6. Issue JWT with `role: 'homeschool_parent'`, set httpOnly cookie
  7. Create lead record for tracking

### 1D. Login Flow

**Create:** `app/api/montree/auth/homeschool/route.ts`
- Accept login code → lookup in `montree_homeschool_parents` → verify bcrypt → issue JWT → set cookie
- Same pattern as teacher login but queries different table

**Modify:** `app/montree/login/page.tsx`
- Add "Homeschool Parent" tab/toggle alongside existing teacher login
- Or: detect from code lookup (try teachers table first, then homeschool_parents)

---

## Phase 2 — Dashboard (Reuse + Trim)

### 2A. Homeschool Dashboard Shell

**Create:** `app/montree/home/page.tsx` (or reuse `/montree/dashboard` with role-based rendering)

**Decision needed:** Separate route (`/montree/home/*`) vs shared route (`/montree/dashboard/*` with role checks).

**Recommendation:** Separate route `/montree/home/*` for clean separation. Share components via imports, not page-level code.

**Homeschool parent lands on:** List of their children (same grid layout as teacher's class list).
- Each child card shows: name, age, mastered/practicing/presented counts, last activity date
- Tap child → goes to child detail view (Phase 2B)
- "Add Child" button in corner

### 2B. Child Detail View (Week View)

**Reuse:** `app/montree/dashboard/[childId]/page.tsx` — the 1,115-line week view.

**Create:** `app/montree/home/[childId]/page.tsx` — imports same components but:
- **Keep:** FocusWorksSection, WorkWheelPicker, QuickGuideModal, WorkPickerModal, AreaBadge, progress tracking, observations, notes
- **Remove/hide:** Classroom selector, teacher-specific nav, "Share with parents" button, report generation triggers
- **Add:** "Add Child" / "Switch Child" navigation in header

### 2C. Child Progress View

**Reuse:** `app/montree/dashboard/[childId]/progress/page.tsx` — the portfolio view.
- Hero stats, area bars, photo strip, timeline — all work unchanged
- Just render at `/montree/home/[childId]/progress`

### 2D. Features to Strip (NOT shown for homeschool)

- Parent invite system (they ARE the parent)
- Parent reports / weekly summaries (they see progress directly)
- Classroom management (no classrooms)
- Teacher management (no other teachers)
- School admin panel
- Student transfer between classrooms

### 2E. Add/Remove Children

**Create:** `app/api/montree/home/children/route.ts`
- GET: List parent's children (query `montree_children` by school_id)
- POST: Add new child (name, age, optional birthday)
- DELETE: Remove child (soft delete via `is_active` flag)

---

## Phase 3 — Guru (Onboarding + Freemium Gate)

### 3A. Guru Onboarding Flow

**Create:** `app/montree/home/[childId]/guru-setup/page.tsx`

Multi-step guided setup (runs once per child, can be re-run):
1. **Child info** — confirm name, age (pre-filled from signup)
2. **Space** — "Describe your learning space" (living room corner / dedicated room / outdoor area / mixed)
3. **Materials budget** — "Monthly budget for materials" ($0-20 / $20-50 / $50-100 / $100+)
4. **Existing materials** — checklist of common Montessori materials they already have (practical life tools, sensorial materials, math manipulatives, language materials, cultural materials)
5. **Goals** — "What matters most?" (independence / academic readiness / concentration / social skills / all-round development)
6. **Submit** → Guru generates personalized curriculum plan

**API:** POST to `/api/montree/guru/home-setup` → calls Claude with all context → returns structured curriculum plan:
- Recommended works per area (filtered by age + space + budget + existing materials)
- Materials shopping list (what to buy/make)
- Weekly schedule suggestion (how many works per day, which areas to rotate)
- First 2 weeks: specific works to present (step-by-step getting started)

**Store:** Save plan in new `montree_homeschool_curriculum_plans` table (child_id, plan_json, created_at).

### 3B. Ongoing Guru Chat

**Reuse:** Existing Guru system entirely.
- `lib/montree/guru/context-builder.ts` — works unchanged (queries by child_id)
- `lib/montree/guru/knowledge-retrieval.ts` — works unchanged
- `app/api/montree/guru/stream/route.ts` — works unchanged

**Modify system prompt** for homeschool context:
- Add to `prompt-builder.ts`: if role is `homeschool_parent`, adjust persona to address a parent (not teacher)
- Replace "classroom" language with "home learning environment"
- Add home-specific advice patterns (limited materials, mixed-age siblings, parent as guide)

**Create:** `app/montree/home/[childId]/guru/page.tsx` — same chat UI, rendered at homeschool route.

### 3C. Freemium Gate

**3 free prompts, then hard gate:**
- New signups get 3 free Guru interactions to experience the value
- After 3 prompts: paywall overlay with "Unlock Guru — $5/month per child"
- Track usage in `montree_guru_interactions` (count per parent)

**Check logic:**
```typescript
// In Guru page/API
const parent = await getHomeschoolParent(userId);
const usageCount = await getGuruUsageCount(parent.id);
if (parent.guru_plan !== 'paid' && usageCount >= 3) {
  // Show upgrade prompt with pricing
  return;
}
// Proceed with Guru call
```

**Upgrade flow:**
- "Unlock Guru — $5/month per child" button
- Stripe Checkout session → redirect to Stripe → webhook confirms → update `guru_plan` to 'paid'
- Per-child billing: each child is a separate Stripe subscription item (or use metered billing)

### 3D. Stripe Integration for Homeschool

**Modify:** `lib/montree/stripe.ts`
- Add plan: `homeschool_guru: { name: 'Guru Access', price: 500 }` ($5/month)
- New env var: `STRIPE_PRICE_HOMESCHOOL_GURU`

**Create:** `app/api/montree/home/billing/checkout/route.ts`
- Creates Stripe Checkout session for Guru subscription
- Metadata includes `parent_id` + `child_id`

**Modify:** `app/api/montree/billing/webhook/route.ts`
- Handle homeschool Guru subscription events
- On `checkout.session.completed`: update `montree_homeschool_parents.guru_plan = 'paid'`
- On `customer.subscription.deleted`: revert to `'free'`

---

## Phase 4 — Curriculum Browser

### 4A. Browse Works by Area

**Create:** `app/montree/home/curriculum/page.tsx`
- 5 area cards (same design as teacher curriculum page)
- Tap area → see works filtered by child's age range
- Each work shows: name, description, materials needed, age range, prerequisites

**Reuse:** Curriculum JSON files in `lib/curriculum/data/` (language.json, practical_life.json, sensorial.json, mathematics.json, cultural.json)

### 4B. Age-Filtered Recommendations

- Based on child's age, highlight "recommended" works (green badge)
- Grey out works above age range (still visible, just marked as "coming later")
- Show prerequisite chains: "Learn X before Y"

### 4C. Materials List

- Per-work materials list (already in curriculum JSON: `materials` field)
- Aggregate "Shopping List" view: all materials needed for recommended works, deduplicated
- Filter by area, sort by priority (most-used materials first)

### 4D. Add Works to Child

- "Add to my child's plan" button on each work
- Uses existing `montree_child_work_progress` table (status: 'presented')
- Same mechanism as teacher adding works via WorkPickerModal

---

## Implementation Order

| Step | What | Depends On | Est. Hours |
|------|------|-----------|-----------|
| 1A | Database migration | Nothing | 1 |
| 1B | Auth changes | 1A | 1-2 |
| 1C | Signup flow | 1A, 1B | 2-3 |
| 1D | Login flow | 1A, 1B | 1-2 |
| 2A | Dashboard shell | 1C | 2 |
| 2B | Child detail (week view) | 2A | 2-3 |
| 2C | Progress view | 2A | 1 |
| 2D | Feature stripping | 2B | 1 |
| 2E | Add/remove children | 1A | 1 |
| 3A | Guru onboarding | 2B | 3-4 |
| 3B | Ongoing Guru chat | 2B | 1-2 |
| 3C | Freemium gate | 3B | 1-2 |
| 3D | Stripe billing | 3C | 2-3 |
| 4A | Curriculum browser | 2A | 2 |
| 4B | Age filtering | 4A | 1 |
| 4C | Materials list | 4A | 1-2 |
| 4D | Add works to child | 4A, 2B | 1 |

**Total estimate:** ~25-35 hours across 4 phases

---

## Files Summary

### New Files (~15-20)
- `migrations/126_homeschool_tables.sql`
- `app/api/montree/auth/homeschool/route.ts`
- `app/api/montree/home/children/route.ts`
- `app/api/montree/home/billing/checkout/route.ts`
- `app/api/montree/guru/home-setup/route.ts`
- `app/montree/home/page.tsx` (dashboard shell)
- `app/montree/home/[childId]/page.tsx` (child detail)
- `app/montree/home/[childId]/progress/page.tsx`
- `app/montree/home/[childId]/guru/page.tsx`
- `app/montree/home/[childId]/guru-setup/page.tsx`
- `app/montree/home/curriculum/page.tsx`

### Modified Files (~8-10)
- `lib/montree/server-auth.ts` (add role)
- `lib/montree/verify-request.ts` (accept role)
- `lib/montree/types.ts` (add types)
- `lib/montree/stripe.ts` (add plan)
- `lib/montree/guru/prompt-builder.ts` (homeschool persona)
- `app/montree/try/page.tsx` (add 3rd role)
- `app/api/montree/try/instant/route.ts` (homeschool branch)
- `app/api/montree/billing/webhook/route.ts` (handle homeschool subs)
- `app/montree/login/page.tsx` (homeschool login option)
- `middleware.ts` (add `/montree/home/*` to routes)

### Reused Unchanged (~20+)
- All tracking APIs (`/api/montree/progress/*`)
- All Guru infrastructure (`lib/montree/guru/*`)
- All shared components (FocusWorksSection, WorkWheelPicker, AreaBadge, etc.)
- Curriculum JSON data files
- Stripe webhook handler (extended, not replaced)

---

## Key Risks & Mitigations

1. **Risk:** Homeschool parents hitting Guru API hard (cost)
   **Mitigation:** Hard paywall — no free Guru calls. $5/child/month covers API costs with margin.

2. **Risk:** Shared codebase complexity (role checks everywhere)
   **Mitigation:** Separate route tree (`/montree/home/*`). Shared at component level, not page level. Role checks only at page boundaries, not deep in components.

3. **Risk:** Curriculum too school-oriented for home use
   **Mitigation:** Guru onboarding filters by space/budget/materials. Curriculum browser shows age-appropriate subset. Phase 4 can add home-specific work variants later.

4. **Risk:** Parent confuses Montree Home with parent portal
   **Mitigation:** Completely separate entry point (`/montree/home`), different branding/messaging, separate signup flow.

---

## Open Questions — ALL RESOLVED ✅

1. **Branding:** ✅ Same as classroom. Same Mercedes, different driver.
2. **Landing page:** ✅ Add to existing montree.xyz signup flow. "I'm a teacher / I'm a principal / I'm a parent" — third option.
3. **Trial period:** ✅ 3 free Guru prompts for new signups, then hard paywall.
4. **Curriculum customization:** ✅ Yes — parents can create custom works. Same UI as teachers (WorkPickerModal). No changes needed.
5. **Observations/notes:** ✅ Yes — full behavioral observation system available. Same as classroom. No changes.

## CRITICAL DESIGN PRINCIPLE

**This is the existing Montree system with a homeschool parent role bolted on. We do NOT rebuild anything.**

The classroom product is excellent. Homeschool parents get the same excellent product. The only new code is:
- Auth layer (new role + new table + signup/login)
- Route shell (`/montree/home/*` pages that import existing components)
- Guru gate (3 free prompts + Stripe paywall)
- Guru onboarding (the one genuinely new feature — space/budget/materials questionnaire)

Everything else — tracking, progress, curriculum, observations, notes, focus works, extras, work picker, area badges — is **imported and reused unchanged**.
