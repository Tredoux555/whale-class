# HANDOFF — All-Areas Reports + Two-Layer Sonnet Sheet Reading (Aug 23, 2026)

Owner: Tredoux (Whale Class, 稻香湖幼儿园 Beijing). Same-day build + audit. Detail lives in
`PLAN_ALL_AREAS_REPORTS_AUG22.md` (architecture), `AUDIT_ALL_AREAS_AUG23.md` (this build's own
review), `DEEP_HEALTH_AUDIT_AUG23.md` (whole-repo security/health sweep run alongside it). This
doc does not repeat their content — it orients the next session and flags what's unresolved.

## 1. TL;DR

Tredoux's English-only paper-scan pipeline now covers all five Montessori areas with a printable
Montree Standard sheet, a two-layer Sonnet reading system (learn any school's layout, then extract
against it), frequency/time/concentration tracking, and visual weekly/monthly period reports per
classroom — plus matching all-areas docx generation and a weekly-wrap timezone fix. Built via many
delegated Sonnet/Opus agent calls, reviewed twice (a build-scoped audit and a whole-repo deep
audit), committed as `df9d50ca1`, and deployed live on Railway (deployment `673d8fac`, verified).
**Migration 337 (critical RLS fix on 7 tables) is now fully verified applied — see Section 5.**
The owner ran the check query himself on August 24, 2026 and confirmed all seven tables show
`rls_enabled = true` and `policy_count = 0`. This handoff is closed out; see Section 9 for the
final post-fix cleanliness sweep.

## 2. What was built (Phases 1-8)

Full spec for every phase is in `PLAN_ALL_AREAS_REPORTS_AUG22.md` Sections 2-10; only orientation here.

**Phase 1 - Schema.** Migration `336_sheet_layouts_and_work_sessions.sql`: `montree_sheet_layouts`
(learned layout profiles), widened `montree_paper_scan_extractions` (frequency/time_bucket/
concentration), `montree_observation_sessions` (the new frequency/time fact table - one row per
child x work x day), `montree_period_reports` (cached aggregator output per classroom x period), and the
`period_reports` feature flag. Applied in production as `montree_observation_sessions` (confirmed
distinct from the pre-existing legacy `montree_work_sessions` from migration 060 - see Section 7).

**Phase 2 - Standard sheet printer.** `MT-STD-1`: one A4 landscape sheet, rows = children, five
area-coloured column groups, tally boxes, time-bubble trio, concentration trio, QR + fiducials for
future machine reading. Generated server-side as printable HTML, no PDF dependency.

**Phase 3 - Layer 1: layout learning.** Teach Montree any school's sheet from 1-3 photos of a
blank/anonymised sheet. Sonnet produces a `SheetLayoutProfile` (structure, legend, reading
instructions, pitfalls) via forced tool use, stored per classroom with draft -> active -> retired
lifecycle (at most one active profile per classroom). Built-in profile ships for MT-STD-1 itself.

**Phase 4 - Layer 2: extraction upgrade.** Extractor moved from Haiku to `AI_MODEL` (Sonnet),
`temperature: 0`, gained `frequency`/`time_bucket`/`concentration`/`detected_template_code` fields,
and takes the active layout profile as prompt injection when one exists. Review UI got matching
tally/bucket/concentration controls.

**Phase 5 - Commit to observation sessions.** Committing a reviewed scan now also writes
`montree_observation_sessions` rows (idempotent on `extraction_id`), and a null-area extraction can
no longer silently default to `practical_life` - it's skipped and flagged instead.

**Phase 6 - Aggregator + dashboard.** `period-aggregator.ts` pulls sessions, progress transitions,
behavioral notes, and photo moments into one `PeriodAggregate` per classroom x week|month, with
graceful fallbacks if any source table is missing or empty. New page
`/montree/dashboard/period-report`: children x 5-area heatmap, per-child bar cards, optional <=20-word
Sonnet lines, print-to-PDF layout.

**Phase 7 - All-areas docx.** Weekly Summary gained a 3x8 grid layout option; Monthly Summary
(previously Language-only by contract) gained an all-areas builder alongside the existing one
(the Language-only doc is unchanged and still producible via `?area=language`). Both have an
engine/areas toggle in the Weekly Admin tab.

**Phase 8 - Weekly-wrap fix.** `weekly-wrap/route.ts` now sources "what changed this week" from
`aggregatePeriod()`'s transitions instead of filtering `montree_child_progress` by `created_at`,
so a work presented long ago and moved to practicing this week is no longer invisible to the
teacher report.

## 3. What was audited and fixed

From `AUDIT_ALL_AREAS_AUG23.md` (this build):
- **Paper-scan commit wrote to non-existent columns** on `montree_behavioral_observations`
  (`content`/`observation_text`/`teacher_id`/`created_at`) - every teacher note on a scanned sheet
  silently failed. Fixed to the real columns (`behavior_description`, `observed_by`, `observed_at`,
  `activity_during`) in `app/api/montree/paper-scan/[scanId]/commit/route.ts`.
- **`aggregatePeriod()` missing `utcOffsetHours`** in three call sites (`weekly-wrap/route.ts`,
  `weekly-admin-docs/monthly-auto-fill/route.ts`, `weekly-auto-fill-aggregator.ts`) - a +8 school
  lost the first 8 hours of Monday and gained the last 8 of Sunday, so period boundaries disagreed
  across features. Fixed by extracting a shared `lib/montree/reports/school-timezone.ts`.
- **Two hardcoded English strings** in new WeeklyAdminTab toggles - i18n'd via new
  `scripts/weekly-admin-engine-i18n.mjs`, 4 keys x 12 locales.

From `DEEP_HEALTH_AUDIT_AUG23.md` (whole-repo, run in parallel, unrelated pre-existing bugs):
- **CRITICAL - live RLS security hole**, verified against production: 7 tables
  (`montree_evaluation_bank_versions/sessions/item_responses/milestone_results`,
  `montree_organizations`, `montree_organization_admins`, `montree_org_invites`) had policies
  created without `TO service_role`, defaulting to `PUBLIC` - anon key holders could
  read **and write** all seven, including an anonymous path to organisation-admin via
  `montree_org_invites`. Fix written to `migrations/337_evaluation_org_rls_lockdown.sql`
  - **see Section 5, not yet confirmed applied**.
- **5 live `ReferenceError` crash bugs**, all fixed: `app/api/montree/parent/appointments/route.ts`
  (undeclared flags in POST - every parent appointment booking 500'd), `app/api/montree/reports/
  generate/route.ts` (undeclared `normalizedLocale` - every `ai_analysis` report 500'd),
  `lib/curriculum/progression.ts` and `lib/youtube/discovery.ts` (`createClient` -> `getSupabase`),
  `app/montree/admin/guru/page.tsx` / `components/montree/super-admin/SuperAdminGuru.tsx` (stream
  flush closure scope bug swallowing the last chunk on error).
- **13 broken schema-read bugs**, all fixed - selects/orders on columns that don't exist,
  silently degrading features to empty because `error` was never checked. Notably:
  `lib/montree/guru/tool-executor.ts` (x4), `lib/montree/admin/guru-executor.ts` (x4, including
  a principal progress summary that reported zeros for every school), `app/api/montree/parent/
  milestones/route.ts` (parents always saw `milestones: []`), `lib/montree/voice-notes/
  weekly-admin.ts` (weekly-admin voice summary always returned nothing), 3 sites reading
  `birthdate` instead of `date_of_birth`. Also fixed the LLM-facing schema maps in
  `lib/montree/admin/guru-prompt.ts` and `lib/montree/super-admin/guru-prompt.ts` that were
  teaching the Gurus wrong column names.
- **Voice-observation commit has the identical broken-columns bug** as the paper-scan one above
  (`app/api/montree/voice-observation/[sessionId]/commit/route.ts`) - **reported, NOT fixed**,
  out of this build's scope.
- **Sonnet drafter token budget** - `draftMonthlyAllAreasParagraphs`/`draftWeeklySummaries` ask
  for a whole classroom (~20 children) in one 4000-token call; truncation falls back gracefully
  but silently per child. Recommended: chunk to ~8 children per call. Not yet done.
- **Language-semester report generation batched** (unrelated route) - was strictly sequential
  and could exceed its own 300s timeout for a full class; now batches of 4.

## 4. Deploy status

- Commit `df9d50ca1` on `main` - includes the full all-areas build and every audit fix except
  migration 337 (a DB-only change, can't be captured in a commit).
- Railway deployment `673d8fac` - **SUCCESS**, verified live.
- Live smoke test passed post-deploy (dashboard route + auth-gated APIs responding as expected).
- Working tree otherwise has pre-existing unrelated untracked/modified files (build artefacts,
  other in-flight docs) - none touched by this build.

## 5. ✅ RESOLVED — verified by owner on August 24, 2026 via SQL query, all 7 tables locked down.

`migrations/337_evaluation_org_rls_lockdown.sql` fixes a **live, verified, remotely exploitable**
RLS hole (anon key can read/write 7 tables, including creating org-invite tokens that grant
organisation-admin). The owner ran the SQL query below himself and confirmed all seven rows show
`rls_enabled = true` and `policy_count = 0` — migration 337 IS applied and verified. Original
check query kept below for reference:

```sql
SELECT c.relname, c.relrowsecurity,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) AS policy_count
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relname IN (
  'montree_evaluation_bank_versions','montree_evaluation_sessions',
  'montree_evaluation_item_responses','montree_evaluation_milestone_results',
  'montree_organizations','montree_organization_admins','montree_org_invites');
```

Confirmed: `rls_enabled = true` and `policy_count = 0` on all seven rows, as run by the owner on
August 24, 2026. (For future reference, had any row shown `policy_count > 0`, the fix would have
been to run the migration immediately, then re-probe with the `curl` command in the migration
file's own trailer — anon key, expect 0 rows on all seven.)

Also worth a quick manual check (Section 5.1 of the deep audit, not fixable via migration): the
`montree-media` storage bucket's upload/delete policies in Supabase -> Storage -> Policies - verify
they carry `TO service_role`, since the same no-`TO`-clause bug pattern caused 337.

## 6. How to use it (teacher-facing)

1. **Print** - Dashboard -> Paper Scan -> "Print sheet" -> A4 landscape -> fill during a work cycle.
2. *(Optional, once per classroom)* **Teach Montree your sheet** - if using your own school's
   sheet instead of MT-STD-1: Paper Scan -> "Teach Montree your sheet" -> upload 1-3 photos of a
   blank/anonymised sheet -> review the profile -> Activate.
3. **Scan** - Paper Scan -> photograph the filled sheet -> wait ~20-40s for Sonnet extraction.
4. **Review** - check name/work/area/tally/time bucket/concentration per row; fix any row flagged
   "needs area" (blocks commit until assigned).
5. **Commit** - approves and writes progress + observation-session rows; the sheet photo is
   deleted at this point (not recoverable).
6. **View period report** - Dashboard -> More -> "Weekly & Monthly Report" -> toggle Week/Month ->
   heatmap + child cards; "Recalculate" if you scanned after opening the page.
7. **Generate weekly/monthly docs** - Reports -> Weekly Admin tab -> set engine toggle to "All areas
   (Sonnet)" (weekly) or "All areas" (monthly) -> Auto-fill -> Save -> Generate.

## 7. Known limitations / next steps

- **Extractor cost** moved from Haiku to Sonnet at `max_tokens: 12000`, ~3-4x per scan - accepted
  in the plan, worth watching over the first real month.
- **One active layout profile per classroom** - teaching a new layout retires the old one; no
  side-by-side comparison.
- **Voice-observation read-side bugs still open**: `guru/tool-executor.ts` and `admin/
  guru-prompt.ts` were fixed for the *paper-scan* observation path in this build's own review, but
  the deep audit found the same broken-columns pattern still live in the **voice-observation
  commit route** - reported, not fixed (Section 3 above).
- **`montree_work_sessions` (legacy, migration 060) decision still pending** - 7 read sites across
  principal briefings, parent-question drafting, the analysis route, and Tracy pattern detection
  read `work_name`/`area`/`teacher_id` columns that don't exist on that table (they're baked into
  a `notes` string prefix instead). The deep audit's recommendation: retire it in favour of the
  new `montree_observation_sessions` (336), which already has these as first-class columns and is
  what the aggregator reads. Not yet decided or actioned.
- **No generated Supabase types** - `lib/supabase-client.ts` is `SupabaseClient<any,...>`, which
  is the root cause behind most of the whole-repo's 737 `tsc` errors and was the reason the 13
  schema-read bugs went undetected for months. Running `supabase gen types typescript` once is
  flagged as the single highest-leverage follow-up engineering task.
- **Menu row visibility**: `period_reports` was enabled for the school before `FEATURE_MENU_MAP`
  existed for it; a teacher with an already-saved menu config won't see the new menu row until the
  flag is toggled off then on in the Feature Switchboard.
- **Sonnet drafter chunking** (weekly/monthly all-areas) not yet implemented - see Section 3.

## 8. File map (new/changed, by phase)

- **336 migration**: `migrations/336_sheet_layouts_and_work_sessions.sql`
- **337 migration (✅ applied & verified Aug 24, 2026)**: `migrations/337_evaluation_org_rls_lockdown.sql`
- **Sheet printer**: `lib/montree/paper-scan/sheet-template.ts`, `app/api/montree/paper-scan/
  sheet/print/route.ts`
- **Layout learning**: `lib/montree/paper-scan/{layout-types,layout-learner,layout-resolver}.ts`,
  `lib/montree/paper-scan/layouts/montree-standard-v1.ts`, `app/api/montree/paper-scan/layouts/
  {route,learn/route,[id]/route}.ts`, `components/montree/paper-scan/LayoutTeacher.tsx`
- **Extractor**: `lib/montree/paper-scan/extractor.ts`, `lib/montree/paper-scan/
  session-writer.ts`, `app/api/montree/paper-scan/[scanId]/{extract,commit}/route.ts`
- **Aggregator + report**: `lib/montree/reports/{period-aggregator,period-types,
  school-timezone}.ts`, `app/api/montree/reports/period/route.ts`,
  `app/montree/dashboard/period-report/page.tsx`, `components/montree/period-report/*`
- **Docx builders**: `lib/montree/weekly-admin/weekly-sentence-builder.ts`,
  `lib/montree/weekly-admin/monthly-summary-builder.ts` (all-areas addition),
  `components/montree/reports/WeeklyAdminTab.tsx`
- **Weekly-wrap fix**: `app/api/montree/reports/weekly-wrap/route.ts`
- **Deep-audit crash fixes**: `app/api/montree/parent/appointments/route.ts`,
  `app/api/montree/reports/generate/route.ts`, `lib/curriculum/progression.ts`,
  `lib/youtube/discovery.ts`, `app/montree/admin/guru/page.tsx`,
  `components/montree/super-admin/SuperAdminGuru.tsx`
- **Deep-audit schema fixes**: `lib/montree/guru/tool-executor.ts`,
  `lib/montree/guru/classroom-context-builder.ts`, `lib/montree/companion/
  {next-step,growth,school-context}.ts`, `lib/montree/admin/{guru-executor,guru-prompt}.ts`,
  `lib/montree/super-admin/guru-prompt.ts`, `lib/montree/voice-notes/weekly-admin.ts`,
  `app/api/montree/{companion/journey,intelligence/daily-brief,parent/milestones}/route.ts`,
  `app/api/montree/photo-identification/{process,sonnet-review}/route.ts`,
  `app/api/montree/super-admin/photo-debug/[mediaId]/route.ts`

## 9. Closing verification (Aug 23/24)

A final cleanliness sweep was run on the real repo (not just a read-only mount) after migration
337 was confirmed:

- **Git**: HEAD `3c4c57ce5` on `main` matches `origin/main` — nothing to push, nothing missing.
- **i18n**: strict check passes 12/12 locales at 100%.
- **Build junk**: no leftover temp files or "DELETE ME" folders from the Aug 22-23 build.
- **Orphaned file noted for awareness**: `PUBLISH_DIRECTOR_PLATFORM.command` at repo root —
  predates this build, an unrelated feature, not touched by it. Left as-is; flagged only so the
  owner knows it's there.

With this, migration 337 is verified applied and the all-areas reports handoff is closed out.
