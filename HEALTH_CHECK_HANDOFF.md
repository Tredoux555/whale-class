# Montree Health Check — Handoff Document

**Created:** Apr 20, 2026 (Session 42)
**Purpose:** Items remaining from the health check that weren't safe to do in the overnight sweep. Split into two sections: (A) items needing deep CLAUDE.md context (future Opus session), and (B) mechanical sweeps for a fresh model.

---

## Completed in Session 42 (7 commits, all on main)

| # | Item | Commit | Summary |
|---|------|--------|---------|
| 1 | Multi-tenancy leak in features route | `ac493c91` | Added session ownership check for non-super-admin callers |
| 2 | .single() crashes on registration | `ac493c91` | Swapped to .maybeSingle() on 3 existence-check queries |
| 4 | PhotoDetailView fetch elimination | `ac493c91` | Replaced fetch with inline getProxyUrl() |
| 5 | Gallery batch URL fetch | `0030e7b2` | Replaced imageUrls state with cropUrlOverrides + getPhotoUrl() helper |
| 6 | Cache-Control on media/url | `18dbab39` | Added Cache-Control: public, max-age=3600, immutable |
| 7 | Delete orphaned tmp scripts | `18dbab39` | Removed 9 tmp_batch files (345 lines) |
| 9 | Extract shared slugify() | `b0e89a34` | Created lib/slugify.ts, both consumers now import it |
| 14 | Media route school_id scope | `1e0d29dc` | Standard query path now always scopes to auth.schoolId |
| 17 | WeeklyAdminTab feature flag | `7acc2af5` | Added isEnabled('weekly_admin_docs') guard |

**Skipped (health check was wrong):**
- #8 — All deps (dagre, reactflow, html2canvas-pro, docx, jspdf) ARE used
- #20 — Rate limiter IS pruned (line 42 evicts on size > 1000)

---

## A. Items Needing Full Context (Future Opus Session)

### #3 — Remove @ts-nocheck from photo-audit/tell-ai/route.ts
**File:** `app/api/montree/photo-audit/tell-ai/route.ts`
Remove pragma, run `npx tsc --noEmit`, fix each error with reference to curriculum schema.

### #10 — Migrate Photo Audit .like() to indexed lookup
**File:** `app/api/montree/audit/photos/route.ts:313-331`
Pre-compute a `name_lower` column and query with `.in()` or add trigram index. Requires Supabase migration.

### #11 — Enable logApiUsage in photo-insight + 4 other files
**File:** `app/api/montree/guru/photo-insight/route.ts` (line 18 import commented out)
Module exists (`lib/montree/api-usage.ts`), DB table exists (migration 142), other routes use it. Wire up `response.usage.input_tokens` / `output_tokens` at 3 call sites (~lines 1575, 1655, 1861). Also commented out in: `guru/route.ts:16`, `guru/corrections/route.ts:8`, `tts/route.ts:9`, `guru/work-enrichment.ts:7`.

### #12 — Add three missing database indexes
```sql
CREATE INDEX CONCURRENTLY idx_montree_media_child_captured 
  ON montree_media(child_id, captured_at DESC);
CREATE INDEX CONCURRENTLY idx_montree_child_progress_child_updated 
  ON montree_child_progress(child_id, updated_at DESC);
CREATE INDEX CONCURRENTLY idx_montree_weekly_reports_school_child_week 
  ON montree_weekly_reports(school_id, child_id, week_start);
```

### #13 — Fix N+1 in principal setup curriculum seed
**File:** `app/api/montree/principal/setup-stream/route.ts:320-330`
Batch curriculum works into one `.insert(worksArray)` call instead of one-at-a-time loop.

### #15 — Split 2378-line guru/photo-insight/route.ts
Three units: Pass 1 (describe), Pass 2 (match), Pass 3 (discriminator) → `lib/montree/photo-identification/*.ts`. Needs knowledge of self-learning loop (Session 6), Gate A/B telemetry (Session 7), sonnet_draft caching.

### #16 — Unify WeeklyAdminTab parity
Extract shared `useWeeklyAdminData()` hook from `components/montree/reports/WeeklyAdminTab.tsx` and `app/montree/dashboard/weekly-admin-docs/page.tsx`. Session 31 caught a parity bug already.

### #18 — Drop name_chinese column
Migrate all UI reads from `name_chinese` → `name_zh`, then drop column. Session 14 context.

### #19 — Fix DELETE race condition
**File:** `app/api/montree/children/[childId]/route.ts:160-270`
Needs Postgres function with `pg_advisory_xact_lock`. Low real-world risk but clean fix.

---

## B. Mechanical Sweeps — Copy-Paste Handoff for Fresh AI

Copy everything below this line into a new Opus or Sonnet session:

---

**Project:** Montree — Next.js 16 app at `~/Desktop/Master Brain/ACTIVE/whale`
**Git:** SSH remote `git@github.com:Tredoux555/whale-class.git`, push via Desktop Commander only
**Task:** Three mechanical code quality sweeps. Each is independent. Commit after each.
**Rules:** Don't touch logic. Don't rename variables. Don't refactor. Only fix the specific pattern described. Run `npx tsc --noEmit` after each file to verify no new type errors.

### Sweep 1: Replace `: any` / `as any` with correct types (~157 instances)

**Find them:** `grep -rn ': any\|as any' app/montree/ --include='*.ts' --include='*.tsx' | grep -v node_modules`

**Priority (highest risk):**
- `app/api/montree/guru/webhook/route.ts` lines ~54, ~88 — Stripe types are well-maintained (`Stripe.Event`, `Stripe.Checkout.Session`)
- All files under `app/api/montree/` (API routes handle user data)

**How to fix each:**
1. Read surrounding code to understand the actual type
2. Replace `as any` with correct assertion or remove
3. Replace `: any` with correct annotation
4. If genuinely unknown, use `unknown` with a type guard
5. Run `npx tsc --noEmit` after each file
6. If correct type needs an uninstalled package or major refactoring, leave a `// TODO: type this properly` comment and skip

### Sweep 2: Remove @ts-nocheck directives (~15 files)

**Find them:** `grep -rn '@ts-nocheck' app/montree/ --include='*.ts' --include='*.tsx'`
**EXCEPTION:** Do NOT touch `app/api/montree/photo-audit/tell-ai/route.ts` — needs deep context.
**Concentrated in:** super-admin/marketing/ pages

**How to fix each:**
1. Remove the `// @ts-nocheck` line
2. Run `npx tsc --noEmit` to see errors
3. Fix each type error
4. If >10 complex errors in one file, skip it and note in commit message

### Sweep 3: Structured logging in photo-insight (74 console.logs)

**File:** `app/api/montree/guru/photo-insight/route.ts`

Replace unstructured logs with JSON-structured format:

```typescript
// Before:
console.log(`[PhotoInsight] Pass 1 DESCRIBE: "${visualDescription.slice(0, 120)}..."`);

// After:
console.log(JSON.stringify({ level: 'info', service: 'photo-insight', stage: 'pass1_describe', preview: visualDescription.slice(0, 120) }));
```

**Rules:**
- `level`: 'info' for success paths, 'warn' for warnings, 'error' for errors
- `service`: always 'photo-insight'
- `stage`: descriptive snake_case (pass1_describe, pass2_match, pass3_sonnet, rate_limit, etc.)
- Include relevant IDs where available: mediaId, childId, workName
- Keep `console.error` for actual errors, change info/debug to `console.log`
- Don't change any logic — only the log format

**Commit each sweep separately.** Push via Desktop Commander:
```
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main 2>&1
```
with `timeout_ms: 30000`.
