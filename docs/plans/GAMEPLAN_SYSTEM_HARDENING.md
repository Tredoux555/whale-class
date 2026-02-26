# 🐋 WHALE SYSTEM HARDENING GAMEPLAN
## Post-Audit Fix & Improvement Implementation
### Created: 2026-01-23

---

## EXECUTIVE SUMMARY

The audit revealed a solid foundation with one critical gap: **parent descriptions exist in the database but aren't displayed to parents**. This gameplan systematically addresses all issues in priority order.

**Total Estimated Time: 4-6 hours**

---

## PHASE 1: CRITICAL - Wire Parent Descriptions to UI
**Priority: 🔴 HIGH | Time: 2 hours**

### 1.1 Update Database Query Layer
**File:** `/lib/queries/parent-queries.ts` (create if needed)

```typescript
// Add function to fetch work with parent description
export async function getWorkWithParentInfo(workId: string) {
  const { data } = await supabase
    .from('montree_classroom_curriculum_works')
    .select(`
      id, work_key, name, name_chinese,
      parent_description, why_it_matters, home_connection,
      area_id, category_key, category_name
    `)
    .eq('id', workId)
    .single();
  return data;
}
```

### 1.2 Update InProgressWorks Component
**File:** `/components/parent/InProgressWorks.tsx`

Changes needed:
- Add `parent_description`, `why_it_matters`, `home_connection` to interface
- Add expandable card to show full description on tap
- Add "Try at Home" button showing home_connection

### 1.3 Update MilestonesPanel Component
**File:** `/components/parent/MilestonesPanel.tsx`

Changes needed:
- Show `why_it_matters` as achievement context
- Display `parent_description` in milestone detail view

### 1.4 Update RecommendationsPanel Component
**File:** `/components/parent/RecommendationsPanel.tsx`

Changes needed:
- Show `parent_description` for recommended works
- Add `why_it_matters` as motivation text

### 1.5 Create WorkDetailModal Component
**File:** `/components/parent/WorkDetailModal.tsx` (new)

```typescript
// Modal showing full work info for parents:
// - Work name (English + Chinese)
// - Parent-friendly description
// - Why it matters
// - Home connection activities
// - Progress visualization
// - Related games link
```

---

## PHASE 2: MEDIUM - Clean Up Custom Works
**Priority: 🟡 MEDIUM | Time: 1 hour**

### 2.1 Audit Custom Works
```sql
-- Get list of all custom works needing attention
SELECT work_key, name, 
  CASE WHEN name_chinese IS NULL THEN 'NEEDS_CHINESE' ELSE 'OK' END as chinese_status,
  CASE WHEN description IS NULL THEN 'NEEDS_DESC' ELSE 'OK' END as desc_status
FROM montree_school_curriculum_works
WHERE work_key LIKE 'custom_%'
ORDER BY name;
```

### 2.2 Decision Point
**Option A:** Write descriptions for 48 custom works (1-2 hours)
**Option B:** Mark non-essential custom works as inactive
**Option C:** Delete custom works not being used in assignments

Recommended: **Option B** - Soft-disable unused custom works, keep only those with active child assignments.

### 2.3 Implementation
```sql
-- Deactivate custom works with no assignments
UPDATE montree_school_curriculum_works
SET is_active = false
WHERE work_key LIKE 'custom_%'
AND id NOT IN (
  SELECT DISTINCT work_id FROM montree_child_assignments
);

-- Same for classroom level
UPDATE montree_classroom_curriculum_works
SET is_active = false
WHERE work_key LIKE 'custom_%'
AND id NOT IN (
  SELECT DISTINCT work_id FROM montree_child_assignments
);
```

---

## PHASE 3: LOW - Database Cleanup
**Priority: 🟢 LOW | Time: 30 mins**

### 3.1 Deprecate Legacy montessori_works Table
```sql
-- Check if anything references it
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'montessori_works';
```

### 3.2 Add Missing Indexes
```sql
-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_school_works_active 
ON montree_school_curriculum_works(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_classroom_works_active 
ON montree_classroom_curriculum_works(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_assignments_child_status 
ON montree_child_assignments(child_id, status);
```

### 3.3 Add Data Validation Constraints
```sql
-- Ensure parent descriptions maintain quality
ALTER TABLE montree_school_curriculum_works
ADD CONSTRAINT chk_parent_desc_length 
CHECK (parent_description IS NULL OR LENGTH(parent_description) BETWEEN 20 AND 300);

ALTER TABLE montree_classroom_curriculum_works
ADD CONSTRAINT chk_parent_desc_length 
CHECK (parent_description IS NULL OR LENGTH(parent_description) BETWEEN 20 AND 300);
```

---

## PHASE 4: IMPROVEMENTS - Enhanced Parent Experience
**Priority: 🔵 ENHANCEMENT | Time: 2 hours**

### 4.1 Add Parent Description Search
**File:** `/app/api/works/search/route.ts`

Allow parents to search works by description keywords.

### 4.2 Add "Home Activities" Page
**File:** `/app/parent/[token]/home-activities/page.tsx`

Aggregate all `home_connection` tips for child's current/mastered works into a single printable page.

### 4.3 Add Weekly Email Content
**File:** `/lib/email/weekly-report.ts`

Include top 3 `home_connection` activities in weekly parent emails.

### 4.4 Create Parent Glossary
**File:** `/app/parent/[token]/glossary/page.tsx`

Alphabetical list of all works with `parent_description` for reference.

---

## PHASE 5: ROBUSTNESS - Error Handling & Monitoring
**Priority: 🔵 ENHANCEMENT | Time: 1 hour**

### 5.1 Add Data Validation on Import
**File:** `/scripts/validate-curriculum.ts`

```typescript
// Pre-import validation script
- Check all work_keys are unique
- Verify parent_description length (20-200 chars)
- Ensure why_it_matters is populated
- Validate home_connection exists
- Check for orphaned references
```

### 5.2 Add Health Check Endpoint
**File:** `/app/api/health/curriculum/route.ts`

```typescript
// Returns curriculum health metrics
{
  total_works: 316,
  works_with_descriptions: 268,
  orphaned_assignments: 0,
  active_children: 20,
  coverage_percentage: 100
}
```

### 5.3 Add Admin Dashboard Warning
**File:** `/components/admin/CurriculumHealth.tsx`

Show warnings if:
- Works missing parent descriptions
- Orphaned assignments detected
- Custom works without translations

---

## IMPLEMENTATION ORDER

```
DAY 1 (Today):
├── Phase 1.1: Update query layer (30 min)
├── Phase 1.2: Update InProgressWorks (45 min)
├── Phase 1.5: Create WorkDetailModal (45 min)
└── Test parent portal displays descriptions

DAY 2 (If needed):
├── Phase 1.3: Update MilestonesPanel (30 min)
├── Phase 1.4: Update RecommendationsPanel (30 min)
├── Phase 2: Clean up custom works (30 min)
└── Phase 3: Database cleanup (30 min)

FUTURE (Post-launch):
├── Phase 4: Enhanced parent features
└── Phase 5: Monitoring & robustness
```

---

## SUCCESS CRITERIA

| Metric | Target | Verification |
|--------|--------|--------------|
| Parent descriptions visible | 100% of core works | Manual test parent portal |
| InProgressWorks shows descriptions | All cards expandable | Visual verification |
| WorkDetailModal functional | Opens on tap | E2E test |
| No console errors | 0 errors | Browser dev tools |
| Page load time | <2 seconds | Lighthouse audit |
| Mobile responsive | All breakpoints | Device testing |

---

## ROLLBACK PLAN

All changes are additive (new columns, new components). If issues arise:
1. Revert component changes via git
2. Database columns can remain (unused = no impact)
3. No data will be lost

---

## FILES TO MODIFY/CREATE

### Modify:
- `/components/parent/InProgressWorks.tsx`
- `/components/parent/MilestonesPanel.tsx`
- `/components/parent/RecommendationsPanel.tsx`
- `/app/parent/[token]/page.tsx` (add modal)

### Create:
- `/components/parent/WorkDetailModal.tsx`
- `/lib/queries/parent-queries.ts`
- `/scripts/validate-curriculum.ts`
- `/app/api/health/curriculum/route.ts`

### SQL Migrations:
- `/supabase/migrations/061_custom_works_cleanup.sql`
- `/supabase/migrations/062_performance_indexes.sql`

---

## READY TO EXECUTE?

Reply "GO" to start Phase 1 implementation.
