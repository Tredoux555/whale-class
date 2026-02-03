# WHALE HANDOFF - February 3, 2026
## Session 139: Parent Reports 500 Error - Schema Mismatch Fix

---

## 📍 WHERE WE LEFT OFF

**Parent reports were showing 500 error despite teacher sending report.**

### What Was Fixed This Session

#### Bug: Parent Reports 500 Error ✅

**Root Cause (DEEP):**
The `send/route.ts` was trying to insert columns that **DON'T EXIST** in the database!

| Column Code Tried to Insert | Exists in Schema? |
|----------------------------|-------------------|
| `week_number` | ❌ NO |
| `report_year` | ❌ NO |
| `is_published` | ❌ NO |
| `published_at` | ❌ NO |

The actual table schema (from migration 050) only has:
- `week_start`, `week_end` (dates)
- `status` ('draft', 'pending_review', 'approved', 'sent')
- `content` (JSONB)
- `generated_at`, `sent_at` (timestamps)

**Fixes Applied:**

1. **`/api/montree/reports/send/route.ts`** - Rewrote to use actual schema:
   - Uses `week_start`/`week_end` instead of `week_number`/`report_year`
   - Sets `status: 'sent'` instead of `is_published: true`
   - Correct `onConflict: 'child_id,week_start,report_type'` to match actual UNIQUE constraint

2. **`/api/montree/parent/reports/route.ts`** - Fixed query filter:
   - Old: `.or('is_published.eq.true,status.eq.sent')` - referenced non-existent column
   - New: `.or('status.eq.sent,generated_at.not.is.null')` - works for both old and new reports

---

## 🚀 IMMEDIATE TODO

**Deploy the fixes:**
```bash
cd ~/Desktop/ACTIVE/whale && git add . && git commit -m "Fix: Parent reports 500 error - schema column mismatch" && git push origin main
```

**Then test:**
1. Teacher: Go to KK → Reports tab → Send a new report
2. Parent: Log in → Should now see the report!

---

## 📁 FILES CHANGED THIS SESSION

| File | Change |
|------|--------|
| `app/api/montree/reports/send/route.ts` | Fixed to use actual DB schema columns |
| `app/api/montree/parent/reports/route.ts` | Fixed query to find existing reports |

---

## 🔍 TECHNICAL DETAILS

### Send Route Fix
```typescript
// BEFORE - Using non-existent columns
.upsert({
  week_number: weekNumber,    // ❌ Column doesn't exist!
  report_year: reportYear,    // ❌ Column doesn't exist!
  is_published: true,         // ❌ Column doesn't exist!
  published_at: now,          // ❌ Column doesn't exist!
}, { onConflict: 'child_id,week_number,report_year' })  // ❌ Wrong constraint

// AFTER - Using actual schema
.upsert({
  week_start: weekStartStr,   // ✅ Exists
  week_end: weekEndStr,       // ✅ Exists
  report_type: 'parent',      // ✅ Exists
  status: 'sent',             // ✅ Exists (valid enum value)
  content: reportContent,     // ✅ Exists
  generated_at: now,          // ✅ Exists
  sent_at: now,               // ✅ Exists
}, { onConflict: 'child_id,week_start,report_type' })  // ✅ Matches actual UNIQUE
```

### Parent Query Fix
```typescript
// BEFORE - Referenced non-existent column
.or('is_published.eq.true,status.eq.sent')

// AFTER - Works for old AND new reports
.or('status.eq.sent,generated_at.not.is.null')
```

---

## 🗃️ ACTUAL DATABASE SCHEMA

From `migrations/050_weekly_reports_media_system.sql`:

```sql
CREATE TABLE montree_weekly_reports (
  id UUID PRIMARY KEY,
  school_id UUID NOT NULL,
  classroom_id UUID,
  child_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_type TEXT NOT NULL,  -- 'teacher' or 'parent'
  status TEXT DEFAULT 'draft', -- 'draft', 'pending_review', 'approved', 'sent'
  content JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(child_id, week_start, report_type)  -- ⚠️ This is the actual constraint!
);
```

---

## 🎉 GURU WORKS!

Confirmed working from the user's screenshot - Guru is giving helpful advice for Leo!

---

## 🔗 URLS

| System | URL |
|--------|-----|
| Whale Production | https://www.teacherpotato.xyz/montree |
| Teacher Dashboard | https://www.teacherpotato.xyz/montree/dashboard |
| Parent Portal | https://www.teacherpotato.xyz/montree/parent |

---

*Updated: February 3, 2026*
*Session: 139*
