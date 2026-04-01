# Handoff: Photo Audit Fixes + Teacher Notes Privacy — Apr 1, 2026

## Summary

Three production fixes shipped in commit `dd1a2c65`, pushed to `main`, Railway auto-deploying.

## Issues Fixed

### 1. CRITICAL: Confirmed Photos Reverting to Amber on Reload

**Symptom:** Teacher confirms a photo as correct (✓ Correct button), sees green momentarily, but on page reload the photo reverts to amber (unconfirmed).

**Root Cause (2 bugs):**

**Bug A — Race condition in corrections confirm action (`corrections/route.ts`):**
The confirm action deleted old cache rows using `Promise.allSettled([delete1, delete2])` then inserted a new confirmed row. The parallel deletes could complete AFTER the insert, deleting the freshly inserted confirmed row. Or the insert could race ahead and the old rows weren't yet deleted.

**Fix A:** Changed from parallel `Promise.allSettled` to sequential awaits with individual error logging:
```typescript
// Was: Promise.allSettled([delete1, delete2]) — race condition
// Now: Sequential with error logging
const { error: delErr1 } = await supabase
  .from('montree_guru_interactions').delete().eq('question', `photo:${media_id}:${child_id}`);
if (delErr1) console.error('[Corrections] Delete exact-key error (non-fatal):', delErr1.message);
const { error: delErr2 } = await supabase
  .from('montree_guru_interactions').delete().like('question', `photo:${media_id}:${child_id}:%`);
if (delErr2) console.error('[Corrections] Delete like-key error (non-fatal):', delErr2.message);
```

**Bug B — Confidence query returned rows in undefined order (`audit/photos/route.ts`):**
`fetchConfidenceData()` queried `montree_guru_interactions` by cache key but without ORDER BY. When both old (low-confidence) and new (teacher-confirmed, confidence=1.0) rows existed, the first row returned was random — often the old low-confidence one, which classified the photo as amber.

**Fix B:** Added `asked_at` to select and `.order('asked_at', { ascending: false })` so the newest (confirmed) row always comes first. Updated dedup comment to explain why first row wins.

### 2. CRITICAL: 429 Rate Limit Blocking Photo Confirmations

**Symptom:** Teacher trying to confirm photos as correct gets 429 Too Many Requests from `/api/montree/guru/corrections`. Screenshot showed 3 consecutive 429 responses.

**Root Cause:** Rate limit was set to `checkRateLimit(supabase, ip, '/api/montree/guru/corrections', 30, 60)` — 30 requests per 60 MINUTES (not per minute as the comment claimed). A teacher reviewing 30+ photos in an hour would get locked out.

**Fix:** Increased to 200 per hour. Photo confirmations are DB-only operations with zero AI cost — no reason to throttle them aggressively. Updated comment to accurately reflect the limit.

### 3. MEDIUM: Teacher Notes Visible to All Teachers

**Symptom:** Classroom notes created by one teacher were visible to all other teachers in the same classroom.

**Root Cause:** GET handler in `teacher-notes/route.ts` filtered by `classroom_id` but not by `teacher_id`.

**Fix:** Added `.eq('teacher_id', auth.userId)` to the query so each teacher only sees their own notes.

## Files Modified (3)

1. `app/api/montree/guru/corrections/route.ts` — Sequential deletes (was parallel race condition) + rate limit 30→200/hr
2. `app/api/montree/audit/photos/route.ts` — ORDER BY asked_at DESC in confidence query
3. `app/api/montree/teacher-notes/route.ts` — Filter notes by teacher_id

## Also This Session (Reverted — No Net Change)

- **Teacher name editing feature** — Fully implemented (PATCH endpoint, DashboardHeader state+handler+JSX, i18n keys) then cancelled by user ("maybe its best if we leave it like that" since teacher identity is tied to login codes). All frontend changes reverted. PATCH endpoint on `classroom/teachers/route.ts` was also discarded (git checkout). zh.ts i18n keys (`teachers.nameUpdated`, `teachers.editFailed`) reverted.

## Deploy

- **Commit:** `dd1a2c65`
- **Push:** ✅ Pushed to `origin/main`
- **Railway:** Auto-deploying
- **Migrations:** None needed

## Verification

After Railway deploys:
1. Go to photo audit page
2. Confirm a photo as correct (✓ button)
3. Reload page — photo should stay green (not revert to amber)
4. Rapidly confirm 30+ photos — should NOT get 429 errors
5. Create a classroom note — other teachers should NOT see it
