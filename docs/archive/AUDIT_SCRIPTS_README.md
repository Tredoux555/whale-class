# Montree Data Integrity Audit - Scripts & Documentation

## Overview

This folder contains a complete data integrity audit of the Montree application, focusing on Leo (child_id: 310743a4-51cf-4f8f-9920-9a087adb084f).

**Audit Date:** February 1, 2026  
**Key Finding:** 4 duplicate records for "Small Buttons Frame" in `montree_child_progress` table

---

## Documentation Files

### 1. **AUDIT_SUMMARY.txt** (START HERE)
Quick reference guide with:
- Critical findings overview
- Duplicate details
- Root cause summary
- Action items checklist
- Next steps

**Read time:** 5 minutes  
**Best for:** Quick understanding of the issues

---

### 2. **MONTREE_DATA_INTEGRITY_AUDIT_REPORT.md** (DETAILED)
Comprehensive audit report with:
- Executive summary
- Detailed findings with data tables
- Root cause analysis with code examples
- Database schema issues
- Step-by-step recommendations
- Data quality metrics
- Testing plan
- Files involved

**Read time:** 20 minutes  
**Best for:** Development team planning fixes

---

### 3. **MONTREE_AUDIT_CLEANUP.sql** (EXECUTABLE)
SQL cleanup script with:
- Verification queries (STEP 1)
- Add UNIQUE constraint (STEP 2)
- Delete duplicates (STEP 3)
- Verify cleanup (STEP 4)
- Check for other duplicates (STEP 5)
- Final verification (STEP 6)
- Bonus orphaned media check

**How to use:**
1. Run STEP 1 to verify duplicates exist
2. Run STEP 2 to add constraint
3. Run STEP 3 to delete old duplicates
4. Run STEPS 4-6 to verify success

**SQL EDITOR:** Run in Supabase SQL editor or psql

---

## Audit Scripts

### 4. **audit-montree.js** (BASIC)
First audit script that discovered the issue.

**Usage:**
```bash
cd /Users/tredouxwillemse/Desktop/ACTIVE/whale
node audit-montree.js
```

**Output:**
- Duplicate work names
- All work inventory
- Cross-reference checks

---

### 5. **audit-complete.js** (STANDARD)
Comprehensive audit with media and session checking.

**Usage:**
```bash
node audit-complete.js
```

**Checks:**
- `montree_child_progress` for duplicates
- `child_work_media` for missing records
- `montree_work_sessions` for missing records
- Cross-reference analysis
- Data integrity summary

---

### 6. **audit-detailed.js** (DETAILED ANALYSIS)
Deep-dive analysis of duplicates with root cause detection.

**Usage:**
```bash
node audit-detailed.js
```

**Analyzes:**
- Duplicate timeline (creation order)
- Status progression logic
- Root cause hypothesis
- Complete database summary
- Recommendations for fixes

---

### 7. **check-tables.js** (TROUBLESHOOTING)
Simple table existence checker.

**Usage:**
```bash
node check-tables.js
```

**Purpose:** Verify which montree-related tables exist in database

---

## Running the Audit

### Prerequisites
- Node.js 22.x or higher
- `.env.local` file with Supabase credentials (already in place)
- Network access to Supabase

### Quick Audit (5 minutes)
```bash
node audit-montree.js
```

### Full Audit (10 minutes)
```bash
node audit-complete.js
```

### Deep Analysis (10 minutes)
```bash
node audit-detailed.js
```

---

## Key Findings Summary

| Issue | Severity | Details |
|-------|----------|---------|
| Duplicate Records | MEDIUM | 4 records for "Small Buttons Frame" (1 work) |
| API Bug | HIGH | Using `.insert()` instead of `.upsert()` |
| Missing Constraint | HIGH | No UNIQUE(child_id, work_name) constraint |
| No Media | LOW | Photos/videos not being captured |
| No Sessions | LOW | Practice tracking not implemented |

---

## Root Cause

**File:** `/app/api/montree/children/route.ts` (lines 100-115)

**Problem:** API calls `.insert()` to create progress records, even when the record already exists. This creates duplicates instead of updating the existing record.

**Fix:** Use `.upsert()` with `onConflict: 'child_id,work_name'` to update existing records instead of creating duplicates.

---

## Cleanup Steps

1. **Add constraint** to prevent future duplicates
2. **Delete 3 old records** for "Small Buttons Frame"
3. **Update API code** to use UPSERT logic
4. **Deploy** the fix
5. **Verify** no new duplicates appear

All SQL is provided in `MONTREE_AUDIT_CLEANUP.sql`

---

## Files Affected

### Code
- `/app/api/montree/children/route.ts` - API that creates/updates progress

### Schema
- `/supabase/migrations/081_montree_progress.sql` - Table definition

### Related Tables
- `montree_child_progress` - Progress tracking (AFFECTED)
- `child_work_media` - Media storage (EMPTY)
- `montree_work_sessions` - Session tracking (EMPTY)

---

## Architecture

### How Progress Currently Works (BUGGY)
```
1. User selects work "Small Buttons Frame"
2. API calls INSERT → creates record #1
3. User changes status to "mastered"
4. API calls INSERT again → creates record #2 (duplicate!)
5. Process repeats for other statuses → more duplicates
```

### How It Should Work (FIXED)
```
1. User selects work "Small Buttons Frame"
2. API calls UPSERT → creates record if not exists
3. User changes status to "mastered"
4. API calls UPSERT → updates existing record
5. Single record reflects current status
```

---

## Recommendations

### IMMEDIATE (Do today)
- [ ] Run cleanup SQL
- [ ] Fix API code to use UPSERT
- [ ] Add UNIQUE constraint

### SHORT-TERM (Do this week)
- [ ] Audit all children for similar duplicates
- [ ] Deploy fixed code
- [ ] Add tests to prevent regression

### MEDIUM-TERM (Do this month)
- [ ] Implement media capture
- [ ] Implement session tracking
- [ ] Add data validation

---

## Testing

After cleanup and fixes:

1. **Manual test:** Change work status in UI, verify only 1 record in database
2. **Load test:** Create progress records rapidly, verify no duplicates
3. **Regression test:** Check other children's data is not affected
4. **API test:** Call endpoints multiple times, verify idempotence

---

## Questions?

### What tables are affected?
- `montree_child_progress` - HAS DUPLICATES
- `child_work_media` - Empty (not affected)
- `montree_work_sessions` - Empty (not affected)

### Is data lost?
No. All duplicate records are kept except the old ones will be deleted.

### Will this affect other children?
No. Cleanup is specific to Leo. Other children should be audited separately.

### What about production data?
Same fix applies. Run on production after testing in staging.

---

## Files in This Audit Package

```
/Users/tredouxwillemse/Desktop/ACTIVE/whale/
├── AUDIT_SUMMARY.txt                              (this folder)
├── AUDIT_SCRIPTS_README.md                        (you are here)
├── MONTREE_DATA_INTEGRITY_AUDIT_REPORT.md         (detailed findings)
├── MONTREE_AUDIT_CLEANUP.sql                      (cleanup SQL)
├── audit-montree.js                               (basic audit script)
├── audit-complete.js                              (standard audit script)
├── audit-detailed.js                              (detailed audit script)
└── check-tables.js                                (table checker script)
```

---

## Summary

**Audit Status:** ✅ COMPLETE  
**Issues Found:** ✅ IDENTIFIED  
**Root Cause:** ✅ FOUND  
**Solution:** ✅ PROVIDED  
**Cleanup Plan:** ✅ READY  
**Next Step:** Execute MONTREE_AUDIT_CLEANUP.sql

---

*Generated: 2026-02-01 by Montree Data Integrity Audit*
