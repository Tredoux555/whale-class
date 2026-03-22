# HANDOFF: Super-Admin 10x Health Check Audit — Mar 22, 2026

## Status: AUDIT COMPLETE, FIXES NOT YET APPLIED

---

## Context

User reported issues with the super-admin panel:
1. Couldn't find their schools (Whale Class V8F8V9, Marina's school X4RAT5)
2. Had to re-login for every function/sub-page
3. Student count showed 17 instead of 19 for Whale Class
4. Marina's school showed 0 students instead of 1

## Root Cause: Children Created with Null school_id

**Architecture flaw:** The `montree_children` table has NO `school_id` column in the original migration (`080_montree_children_complete.sql`). The column was added later (likely via ALTER TABLE) but with **NO NOT NULL constraint**.

**All 7 child insertion points in the codebase insert WITHOUT school_id:**

| # | Route | Sets school_id? |
|---|-------|----------------|
| 1 | `/api/montree/children/bulk` | ❌ NO — inserts classroom_id, name, age, notes only |
| 2 | `/api/montree/onboarding/students` | ❌ NO — fetches classroom.school_id but never uses it. Comment says "school_id column doesn't exist" |
| 3 | `/api/montree/admin/import` | ❌ NO — name, classroom_id, age, is_active only |
| 4 | `/api/montree/admin/import-students` | ❌ NO — progress records only |
| 5 | `/api/montree/try/instant` | N/A — inserts into montree_teachers, not children |
| 6 | `/dashboard/students` (UI) | ❌ NO — calls /api/montree/children/bulk |
| 7 | `migrations/099_seed_demo_school.sql` | ❌ NO — seed data has no school_id |

**Why 4 children had null school_id:** They were created through these routes without school_id being set. The dashboard shows them because it queries by `classroom_id`, but the super-admin counts by `school_id` and misses orphans.

**Immediate DB fix applied this session:** Updated school_id for Ryan, Yo-yo (→ Tredoux's school), Marina × 2 (→ their respective schools). Counts now correct.

---

## Fixes Applied This Session

### 1. Login Code Search + Display (SchoolsTab.tsx + schools/route.ts + types.ts)
- Schools API now fetches teacher login codes and includes them in response
- SchoolsTab search filters by login codes
- Login codes displayed under school name in table

### 2. Session Persistence (page.tsx + marketing/layout.tsx)
- Super-admin password stored in sessionStorage on successful login
- Restored on page load (checks timestamp < 15min timeout)
- Shared between super-admin page and marketing hub via same sessionStorage key
- Activity tracking updates timestamp on mouse/keyboard events

### 3. Null school_id Fix (DB only)
- 4 orphan children updated with correct school_id derived from their classroom's school_id
- Ryan + Yo-yo → Tredoux's school (c6280fae)
- Marina → Bayan's school (d0676608)
- Marina → Home school (ee2c50ab)

### 4. 3-Part Card Generator Drag-to-Reposition (4 files, from earlier in session)
- Unmount memory leak fixed in CardPreview.tsx (cleanupRef pattern for window event listeners)
- 3 consecutive clean audit passes achieved

---

## 🔴 NEXT SESSION: CALL TO ACTION #1 — Super-Admin 10x Deep Audit Fix Cycle

### Phase 1: Data Integrity (CRITICAL, 1-2 hours)

**1A. Fix ALL child insertion routes to include school_id:**
Every route that creates a child must derive school_id from classroom:
```typescript
// Fetch classroom's school_id
const { data: classroom } = await supabase
  .from('montree_classrooms')
  .select('school_id')
  .eq('id', classroomId)
  .single();

// Include in insert
await supabase.from('montree_children').insert({
  classroom_id: classroomId,
  school_id: classroom.school_id,  // ← ADD THIS
  name, age, ...
});
```

Files to fix:
- `app/api/montree/children/bulk/route.ts` (line ~302)
- `app/api/montree/onboarding/students/route.ts` (line ~82, already fetches school_id but doesn't use it!)
- `app/api/montree/admin/import/route.ts` (line ~106)

**1B. Add NOT NULL constraint (migration):**
```sql
-- First backfill all existing nulls
UPDATE montree_children c
SET school_id = cl.school_id
FROM montree_classrooms cl
WHERE c.classroom_id = cl.id
AND c.school_id IS NULL;

-- Then add constraint
ALTER TABLE montree_children ALTER COLUMN school_id SET NOT NULL;
```

**1C. Add DB trigger for automatic school_id:**
```sql
CREATE OR REPLACE FUNCTION set_child_school_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NULL AND NEW.classroom_id IS NOT NULL THEN
    SELECT school_id INTO NEW.school_id
    FROM montree_classrooms WHERE id = NEW.classroom_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_set_child_school_id
BEFORE INSERT OR UPDATE ON montree_children
FOR EACH ROW EXECUTE FUNCTION set_child_school_id();
```

### Phase 2: Auth & Security (CRITICAL, 2-3 hours)

**2A. Remove password from sessionStorage:**
Current flow stores plaintext password in sessionStorage — vulnerable to XSS and browser extension attacks.

**Fix:** After successful auth, generate a short-lived session token (JWT with 15min exp). Store token in sessionStorage instead of password. Server validates token on each request.

New flow:
1. Login → POST `/api/montree/super-admin/auth` with password
2. Server validates (timing-safe), returns signed JWT (15min TTL)
3. Client stores JWT in sessionStorage
4. All subsequent requests send JWT in `x-super-admin-token` header
5. Server validates JWT signature + expiry on each request

**2B. Remove password from query parameters:**
`schools/route.ts` line 32 accepts password in query params as fallback. Remove — header only.

**2C. Add rate limiting to DELETE endpoint:**
`schools/route.ts` DELETE has no rate limiting (comment says "super admin controls cleanup"). Add `checkRateLimit(supabase, ip, '/api/montree/super-admin/schools/DELETE', 5, 15)`.

**2D. Fix cascade delete null safety:**
Add empty array guards before `.in()` calls in cascadeDeleteSchool:
```typescript
if (chunk.length === 0) continue;
if (!schoolId) throw new Error('schoolId required for cascade delete');
```

**2E. Add tier validation on PATCH:**
```typescript
const VALID_TIERS = ['trial', 'free', 'basic', 'standard', 'premium'];
if (subscription_tier && !VALID_TIERS.includes(subscription_tier)) {
  return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
}
```

### Phase 3: Count Queries & Performance (HIGH, 1 hour)

**3A. Fix count queries to exclude null school_id:**
```typescript
// Add .not('school_id', 'is', null) to all count queries
const [classroomRes, teacherRes, childrenRes] = await Promise.all([
  supabase.from('montree_classrooms').select('school_id').not('school_id', 'is', null),
  supabase.from('montree_teachers').select('school_id').not('school_id', 'is', null),
  supabase.from('montree_children').select('school_id').not('school_id', 'is', null),
]);
```

**3B. Add pagination to schools endpoint:**
Currently fetches ALL schools. Add `?limit=50&offset=0` support.

**3C. Add exponential backoff to DM polling:**
Replace fixed 30s interval with backoff on failure.

### Phase 4: UX & Features (MEDIUM, 2-3 hours)

**4A. School detail view:**
Add expandable row or modal showing:
- All teachers (name, login_code, role, last_login)
- All classrooms (name, student count)
- All children (name, age, last activity)
- Cost estimate breakdown

**4B. Soft delete/archive before hard delete:**
Add `is_archived` column. Archive first, hard delete after 90 days.

**4C. Fix login-as dev principal issue:**
Don't create fake "dev-admin" principal. Require real principal exists.

**4D. Add "Copy login code" button:**
One-click copy for teacher codes in school table.

### Phase 5: Error Handling & Logging (MEDIUM, 1 hour)

**5A. Sanitize error responses:**
Remove Supabase error details from client responses. Log full errors server-side only.

**5B. Fix batch delete validation:**
Server must return `{ deleted: [...], failed: [...] }`. Client updates UI only for confirmed deletions.

**5C. Add visible DM fetch error state:**
Show indicator when DM polling is failing.

---

## 🔴 CALL TO ACTION #2 — Clean Up Stale Schools

**DO NOT delete Tredoux's two active schools:**
- "Tredoux House" (school_id: c6280fae) — login code V8F8V9, 19 students, Whale Class
- Marina's school (school_id: d0676608 or ee2c50ab) — login code X4RAT5, 1 student

**Delete ALL other schools** that are:
- Test/demo schools with 0 students
- Inactive schools with no activity in 30+ days
- Duplicate/orphan schools from development

**Process:**
1. Query all schools
2. Identify the two active schools by login code (V8F8V9, X4RAT5)
3. Mark everything else for deletion
4. Use cascade delete (already implemented) to clean up
5. Verify only 2 schools remain

**Query to identify candidates:**
```sql
SELECT s.id, s.name, s.created_at,
  (SELECT COUNT(*) FROM montree_children WHERE school_id = s.id) as child_count,
  (SELECT COUNT(*) FROM montree_teachers WHERE school_id = s.id) as teacher_count
FROM montree_schools s
WHERE s.id NOT IN (
  'c6280fae-567c-45ed-ad4d-934eae79aabc',  -- Tredoux House (V8F8V9)
  'd0676608-d765-4bbf-971e-5206f94bed9a',  -- Marina's school (via Bayan classroom)
  'ee2c50ab-579d-4939-bd26-9c76b4c1104b'   -- Marina's home school
)
ORDER BY child_count DESC;
```

⚠️ Confirm with user which Marina school is the active one before deleting the other.

---

## Full Audit Findings (30 issues)

### CRITICAL (7)
1. Password stored in sessionStorage (XSS risk)
2. Client password persistence bypasses timing-safe server checks
3. No rate limiting on schools DELETE endpoint
4. Cascade delete has null safety gaps (empty array .in() behavior)
5. Count queries miss children with null school_id
6. Session timestamp in sessionStorage can be spoofed
7. Batch delete doesn't validate server response before updating client state

### HIGH (9)
8. Password accepted in query parameters (log exposure)
9. No validation on school subscription_tier values
10. login-as endpoint doesn't distinguish "not found" from "DB error"
11. DM polling has no backoff (30s fixed interval, no retry logic)
12. Activity timestamp comparison logic could be cleaner
13. Cost estimation model uses hardcoded prices
14. Error responses leak Supabase schema details
15. Dev principal created with fake UUID breaks audit trail
16. Schools endpoint has no pagination

### MEDIUM (8)
17. Silent DM fetch failures (no error indicator)
18. School name count mismatch not logged in audit
19. Login codes included in search index (minor privacy)
20. Batch delete error details not shown to user
21. No lead status validation
22. Temp passwords use Math.random (not CSPRNG)
23. No UNIQUE constraint on school slugs
24. Classroom count query slightly inefficient

### LOW (6)
25. Missing aria-labels on search input
26. Edit controls auto-close on school update
27. Missing flag emoji fallback for unknown countries
28. Native confirm() dialogs instead of React modals
29. No optimistic updates on school list
30. Inconsistent time abbreviations (m/h/d/mo)

---

## Files Modified This Session

| File | Changes |
|------|---------|
| `components/card-generator/CardPreview.tsx` | Unmount memory leak fix (cleanupRef) |
| `components/montree/super-admin/types.ts` | Added login_codes to School interface |
| `app/api/montree/super-admin/schools/route.ts` | Fetch + include teacher login codes |
| `components/montree/super-admin/SchoolsTab.tsx` | Search by login code + display codes |
| `app/montree/super-admin/page.tsx` | Session persistence via sessionStorage |
| `app/montree/super-admin/marketing/layout.tsx` | Shared session with super-admin |

---

## Deploy

⚠️ NOT YET PUSHED. Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add components/card-generator/CardPreview.tsx components/montree/super-admin/types.ts app/api/montree/super-admin/schools/route.ts components/montree/super-admin/SchoolsTab.tsx app/montree/super-admin/page.tsx app/montree/super-admin/marketing/layout.tsx CLAUDE.md docs/handoffs/HANDOFF_SUPER_ADMIN_10X_AUDIT_MAR22.md
git commit -m "fix: super-admin session persistence + login code search + card generator cleanup"
git push origin main
```
