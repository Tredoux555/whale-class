# DEEP HEALTH AUDIT — whole system
**Date:** Aug 23, 2026 · **Scope:** the entire Montree codebase (2,280 `.ts/.tsx`, 714 API routes, 531 under `app/api/montree/**`), not just the all-areas-reports build audited earlier today in `AUDIT_ALL_AREAS_AUG23.md`.

Working tree only — **nothing was committed**. Every fix below is sitting uncommitted next to the all-areas build's own uncommitted changes.

---

## 0. Read this first

One finding is live, remotely exploitable, and was **verified against production**, not inferred from the repo:

> **Six tables are readable AND writable by anyone on the internet holding the public
> `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the key that ships in every browser bundle.**
> One of them (`montree_org_invites`) is an anonymous privilege-escalation path to
> organisation admin. Another two hold real children's milestone assessment data.

Fix: run `migrations/337_evaluation_org_rls_lockdown.sql` (written by this audit, **not** applied).
It is seven `DROP POLICY` + seven `ENABLE ROW LEVEL SECURITY` statements, idempotent, transactional.
Nothing in the app touches those tables with anything but the service-role key, so it cannot break anything.

---

## 1. Scorecard

| Check | Result |
|---|---|
| Hardcoded secrets in tracked files | **Clean.** No live key of any provider shape in any tracked `.ts/.tsx/.js/.mjs/.json/.yml/.sql`. `.env` / `.env.local` are gitignored and have never been committed (`git log --all -- .env` is empty). Only `.env.example` / `.env.stripe.example` are tracked, and they carry `REPLACE_WITH_YOUR_KEY` placeholders. |
| Service-role key leaking into the client bundle | **Clean.** `SUPABASE_SERVICE_ROLE_KEY` appears only in API routes, `lib/*`, `scripts/*` and the two workers. The three `'use client'` files that import `lib/supabase-client` import `createSupabaseClient` / `createBrowserClient`, which read only `NEXT_PUBLIC_*`. Next inlines only `NEXT_PUBLIC_*`, so the service key is never emitted. |
| `NEXT_PUBLIC_` misuse | **Clean.** Seven vars in use; the only alarming name, `NEXT_PUBLIC_ADMIN_PASSWORD`, survives solely as a comment at `app/montree/super-admin/page.tsx:515` describing the Phase-5 fix that removed it. No `'870602'` literal anywhere in source. |
| Unauthenticated API routes | **Clean.** Of 531 `app/api/montree/**` routes, 182 lack `verifySchoolRequest`; all 182 use one of eleven other auth resolvers (`resolveAuthorizedParent`, `openRoute`, `verifySuperAdminAuth`, `resolveMessagingAgent/Parent/SuperAdmin`, `resolveAppointmentsParent`, `resolveEventsParent`, `resolveDplParent`, `requireConfirmedUser`, `resolveCalendarScope`, worker/cron shared secrets). Every route without any of them was read individually and is deliberately public. Details in §5. |
| Cron auth | **Clean and fail-closed.** All six cron routes require `x-cron-secret === CRON_SECRET`. The two that spend money or send mail (`photo-sweep`, `engagement`) have **no** super-admin fallback, by explicit design comment. |
| Stripe webhooks | **Clean.** All four verify `stripe-signature` via `constructEvent` against a per-surface secret. Not modified — billing was out of scope by instruction. |
| SQL / PostgREST filter injection | **Clean.** 22 template-literal `.or()` sites; every user-reachable one is validated or escaped (`community/works` age allowlist, `photo-bank` ILIKE + brace escaping, `global-outreach` sanitised + super-admin only). The rest interpolate UUIDs and ISO dates from verified sessions. |
| XSS | **Clean.** 47 `dangerouslySetInnerHTML` sites; all but four inject CSS built from constants. The four that render content — `DossierRenderer`, `StimulusSvg`, `principal-questions`, `DocumentPaper` — feed from `escapeHtml`-based renderers, an internal item bank, string literals, and constant CSS respectively. The two Markdown components explicitly build React elements instead. |
| **RLS posture** | **ONE CRITICAL, VERIFIED LIVE.** See §2.1. |
| `npx next build` | Not runnable here (device VM is Linux-arm64, `node_modules` was installed on darwin-arm64). Assessed statically instead — see §4. |
| Whole-project `tsc --noEmit` | **737 unique errors** across three scoped passes (down from **784** before this audit's fixes — **−47, zero new**). Nine were live `ReferenceError` bugs, now fixed. See §4. |
| Test suite | **438 / 438 passing, 32 suites.** Run in an isolated cloud container against this audit's edited `lib/` + `app/`. |
| `npm run i18n:check:strict` | **12/12 locales pass**, 6103 keys each. |

---

## 2. CRITICAL

### 2.1 Anonymous read + write on six tables — anon can become an organisation admin

**Verified against production `dmfncjjtsoxrnvcdnvjq.supabase.co` on 2026-08-23**, using only the public anon key from `.env.local` (the same key that ships to every visitor's browser). Read-only `HEAD … Prefer: count=exact` probes, no rows extracted, no writes attempted:

| Table | anon HTTP | rows returned to anon |
|---|---|---|
| `montree_evaluation_item_responses` | 200 | **32** |
| `montree_evaluation_milestone_results` | 200 | **56** |
| `montree_evaluation_sessions` | 200 | **2** |
| `montree_evaluation_bank_versions` | 200 | 1 |
| `montree_organizations` | 200 | **3** |
| `montree_organization_admins` | 200 | **3** |
| `montree_org_invites` | 200 | **8** |

For contrast, every other core table probed returns **0 rows** to anon — RLS on, zero policies, exactly the house posture: `montree_children`, `montree_media`, `montree_parents`, `montree_teachers`, `montree_schools`, `montree_weekly_reports`, `montree_behavioral_observations`, `montree_child_progress`, `montree_work_sessions`, `montree_observation_sessions`, `montree_period_reports`, `montree_sheet_layouts`, `montree_paper_scan_extractions`, `voice_observation_sessions`, `montree_parent_invites`, `montree_appointments`, `montree_events`, `montree_dm`, `montree_feedback`, `montree_leads`, `montree_visitors`, `montree_super_admin_audit`, `montree_api_usage`, `tp_children`, `tp_photos`, `montree_community_posts/materials`, `montree_school_features`, `montree_referral_codes`, `montree_guru_interactions`, `montree_montage_jobs`, `montree_push_nudges`, `montree_founding_waitlist`. **The lockdown is real and working — these seven are the exception.**

**Cause.** Migrations 314 (Milestones) and 315 (Organizations) both write:

```sql
CREATE POLICY "Service role all on …" ON … FOR ALL USING (true) WITH CHECK (true);
```

Despite the name there is **no `TO service_role` clause**. A policy created without `TO` defaults to role `PUBLIC`, which includes `anon`. This is the identical failure mode `migrations/313_curriculum_rls_lockdown.sql` documents at length and fixed for the two curriculum tables — but 314 and 315 landed *after* the 275/276/277 linter sweep, so nothing caught them.

**Why this is worse than a leak.** The policies are `FOR ALL … WITH CHECK (true)`, so `anon` can **INSERT, UPDATE and DELETE** these rows, not merely read them. And `hashInviteToken()` (`lib/montree/org/invite-tokens.ts:64`) is an unsalted, unpeppered SHA-256. So an anonymous caller can:

1. `POST /rest/v1/montree_org_invites` with `token_hash = sha256("anything-they-pick")`, `invite_type = 'organization'`, `expires_at` in the future;
2. open `/montree/org/join/anything-they-pick` — `app/api/montree/org/invites/validate/route.ts:54-56` looks the invite up by that hash **alone**;
3. register themselves as an **ORGANIZATION admin**.

They can equally `INSERT` straight into `montree_organization_admins`, or `DELETE` a real child's `montree_evaluation_milestone_results`.

**Fixed?** No — this needs a DB change, which the sandbox cannot make. **Written, not applied:** `migrations/337_evaluation_org_rls_lockdown.sql`. Seven `DROP POLICY IF EXISTS` + seven `ENABLE ROW LEVEL SECURITY`, `BEGIN`/`COMMIT`, idempotent, with the production evidence, a `pg_policies` verification query and a re-probe `curl` in the trailer. Safe because RLS is already enabled on all seven tables (dropping the policies leaves zero policies = deny-all for anon), the service-role key bypasses RLS entirely, and no client-side or anon query targets any of these tables anywhere in the codebase — the evaluation routes all enter through `lib/montree/evaluation/route-helpers.ts` `openRoute()` and the org routes through server-side org auth.

**→ Run it today.** Then re-probe with the `curl` in the file's trailer; all seven must return 0 rows.

---

## 3. HIGH

### 3.1 Five live `ReferenceError` crashes shipped to production — all now fixed

`next.config.ts:21-23` sets `typescript.ignoreBuildErrors: true`, so `next build` never sees a type error. Among the 784 whole-project errors, **37 were `TS2304 "Cannot find name"`** — and `TS2304` is not a type nit, it is *an identifier that does not exist at runtime*. Every one was a real crash:

| Where | What happened in production | Fix |
|---|---|---|
| `app/api/montree/parent/appointments/route.ts:363` | `POST` referenced `agoraEnabledFlag` / `videoCallsEnabledFlag` / `recordingEnabledFlag` — all three are `const`s local to the **GET** handler's body. A comment above them even claimed they were "a single source of truth across both verbs". **Every parent appointment booking threw `ReferenceError` and returned 500.** | The three flags are now resolved inside `POST` with the same `isFeatureEnabled` calls GET makes. |
| `app/api/montree/reports/generate/route.ts:394-477` | `generateAIAnalysisReport()` used `normalizedLocale` twenty times; it was never declared anywhere in the file — the leftover of an unfinished refactor (`isValidLocale` was imported *for it* and then left unused). **Requesting the `ai_analysis` report type 500'd every time.** | `const normalizedLocale: Locale = isValidLocale(locale) ? locale : 'en';` — using the import that was already sitting there. Also cleared a downstream `TS7053`. |
| `lib/curriculum/progression.ts` ×4 | Imports `getSupabase`, calls `createClient()`. Imported by three live Whale routes (`curriculum`, `daily-activity`, `video-watches`). | `createClient()` → `getSupabase()`. |
| `lib/youtube/discovery.ts` ×5 | Same bug. No importers — dead code, fixed for consistency. | `createClient()` → `getSupabase()`. |
| `app/montree/admin/guru/page.tsx:498` and `components/montree/super-admin/SuperAdminGuru.tsx:512` | `processLine` was declared **inside** the `while (true)` stream-read loop, but the post-loop "flush remaining buffer" call sits outside it. Whenever a stream ended on a partial trailing `data:` line, the flush threw, the outer `catch` swallowed it, and the user saw a bogus "Connection error" with the last chunk lost. | The closure is hoisted above the loop (it only closes over `assistantContent` / `thinkingContent` / `toolCalls`, all declared just above, so in-loop behaviour is byte-identical). |
| `components/montree/child/GamePlanCard.tsx:27-29` | A bare `export … from` re-export does not bind the names in the module's own scope, so the `LocalizedString` annotations resolved to nothing. Type-only, no runtime effect. | Added the matching `import type`; the re-export stays so `FocusWorksSection` keeps working. |

### 3.2 Broken schema reads — thirteen sites, all now fixed

Every one of these selected or ordered by a column that **does not exist**. PostgREST rejects the *whole* select with `42703`, and each call site does `const { data } = await …` without checking `error` — so the feature degrades to empty and *nothing is logged*. That is why they survived so long.

`montree_behavioral_observations` (110 + 154 + 176) is `behavior_description` (NOT NULL) / `observed_by` / `observed_at` / `activity_during` / `antecedent` / `behavior_function` / …. It has **no** `observation`, `observation_text`, `area`, `observation_type`, `teacher_id` or `created_at`.

| File | Was | Now |
|---|---|---|
| `lib/montree/guru/tool-executor.ts` ×4 (806, 1786, 1911, 2009) | `select('observation')` · `order('created_at')` | `select('behavior_description')` · `order('observed_at')`, consumers remapped |
| `lib/montree/companion/next-step.ts:68` | `select('observation')` · `order('created_at')` | ditto (+ the row type) |
| `lib/montree/guru/classroom-context-builder.ts:84` | `select('child_id, observation, created_at')` | `select('child_id, behavior_description, observed_at')` |
| `lib/montree/companion/growth.ts:35` | `order('created_at')` | `order('observed_at')` |
| `lib/montree/companion/school-context.ts:46` | `order('created_at')` | `order('observed_at')` |
| `app/api/montree/companion/journey/route.ts:52` | `order('created_at')`, event date from `o.created_at` | `observed_at` throughout |
| `app/api/montree/intelligence/daily-brief/route.ts:271` | `select('child_id, observation')` · `order('created_at')` | `behavior_description` · `observed_at` |
| `lib/montree/admin/guru-executor.ts:594` | `select('id, observation_text, area, created_at, observation_type')` | the real ABC columns |
| `lib/montree/admin/guru-executor.ts:592` | `montree_child_progress.select('work_id, status, mastery_confidence, updated_at, is_extra')` — **three of five columns don't exist** | `'work_key, work_name, area, status, updated_at'` |
| `lib/montree/admin/guru-executor.ts:595` | `montree_weekly_reports.select('id, created_at, locale, areas_completed')` — `locale` and `areas_completed` exist in no migration | `'id, created_at, week_start, week_end, report_type, status'` |
| `lib/montree/admin/guru-executor.ts:734` | `montree_child_progress.select('child_id, status, work_id')` then resolved area through `montree_works`. **The principal-guru progress summary reported zeros for every school.** | `select('child_id, status, area')` and filter directly — the table carries `area`, so the `montree_works` hop was both unnecessary and broken |
| `app/api/montree/parent/milestones/route.ts:35` | `select('… mastery_date, work:work_id ( name, name_chinese, area_id )')` — no `work_id` column, therefore no such relationship, and the stamp is `mastered_at`. **Every parent saw `milestones: []`, always.** | flat `select('id, status, work_name, work_name_chinese, area, mastered_at, created_at, updated_at')`, transform rewritten |
| `lib/montree/voice-notes/weekly-admin.ts:250` | `montree_children.select('id, name, first_name')` — no `first_name`. Select failed → `childrenData` null → `children.length === 0` → **the function returned `null`, so the weekly-admin voice summary silently produced nothing for every classroom.** | `select('id, name, nickname')`, mapped to the existing `first_name` field (`nickname` is the real preferred-name column and is what the transcript name-matcher wants) |
| `app/api/montree/photo-identification/process/route.ts:265`, `…/sonnet-review/route.ts:90`, `…/super-admin/photo-debug/[mediaId]/route.ts:57` | `montree_children.select('… birthdate')` — the column is `date_of_birth` (nothing writes `birthdate`; 70 sites write `date_of_birth`). **Child age context was silently lost from photo identification.** | `date_of_birth` at all three, with the consumers renamed |

Also fixed: the two LLM-facing schema maps that teach the Principal and Super-Admin Gurus which columns to query (`lib/montree/admin/guru-prompt.ts:22`, `lib/montree/super-admin/guru-prompt.ts:20-21`) listed `observation_text, area, observation_type` for observations, `work_id, mastery_confidence, is_extra` for progress, `locale, content_summary, areas_completed` for weekly reports, and `school_id, tokens_input, tokens_output, created_at` for guru interactions — **none of which exist**. Every Guru query built from those maps failed. All four entries replaced with the real column sets.

### 3.3 `montree_work_sessions` — seven broken reads (**REPORTED, not fixed**)

`app/api/montree/sessions/route.ts:50-52` states it outright:

> `// Note: work_name, area, teacher_id, status columns do NOT exist in the table`

Confirmed: migration 060 defines only `id, child_id, work_id, assignment_id, session_type, duration_minutes, notes, media_urls, observed_at, created_at`, and a codebase-wide grep finds **zero writes** to `work_name`, `area` or `teacher_id` on this table. Yet seven places read them:

- `app/api/montree/admin/activity/route.ts:128` — `teacher_id`
- `app/api/montree/admin/child-briefing/[childId]/route.ts:143` — `work_name, area`
- `app/api/montree/admin/parent-question/route.ts:125` — `work_name, area`
- `app/api/montree/analysis/route.ts:168` — `work_name, area`
- `app/api/montree/progress/route.ts:140` — `work_name, area, teacher_id`
- `lib/montree/tracy/frameworks/child-focus.ts:502` — `work_name, area`
- `lib/montree/tracy/tools/detect_pattern.ts:191` — `work_name, area`

So the work-sessions feed is dead in principal briefings, parent-question drafting, the analysis route, Tracy pattern detection and the progress API. **Not fixed** because the right answer is a product decision, not a mechanical edit. The insert bakes the data into `notes` as `[work_name] (area) …`, so the three options are: (a) parse that prefix back out at each read; (b) add the three columns by migration and backfill from `notes`; (c) retire this table in favour of `montree_observation_sessions` (migration 336), which already carries `work_name` and `area` as first-class columns and is what the new period aggregator reads. **(c) is almost certainly right** — 336 was built for exactly this shape.

Related, same file: `app/api/montree/admin/activity/route.ts:116` reads `montree_child_progress.teacher_id`, which also does not exist. The principal's teacher-activity dashboard is therefore counting only photos and observations, and `students_without_activity` over-reports. There is no teacher-attribution column on `montree_child_progress` at all — `mastery_confirmed_by` (155) is the nearest thing and only fires on confirmation. Also a decision, not a fix.

### 3.4 Error results are discarded almost everywhere

The root cause behind §3.2 and §3.3: the dominant idiom is `const { data } = await supabase…`, dropping `error` on the floor. A dropped column, a renamed table or an unrun migration then presents as *an empty feature*, never as an alert. Three of the bugs above had been live for months.

**Recommendation:** a lint rule (or a thin `sb()` wrapper) that forces `error` to be read and `console.error`'d. Roughly a day's work and it converts this entire bug class into a log line. Where this audit touched a query, it added the `if (…Err) console.error(…)` line.

---

## 4. Build health — the honest numbers

**`next build` cannot break on types.** `next.config.ts:21-23`:

```ts
typescript: { ignoreBuildErrors: true },
```

So none of the errors below can fail the Railway Docker build. That is also precisely why five `ReferenceError`s (§3.1) reached a real school.

**Whole-project `tsc --noEmit` does not finish in the sandbox's 45 s ceiling**, so it was run as three scoped passes over `tsconfig.json` and de-duplicated:

| Pass | Errors |
|---|---|
| `app/api/**/*.ts` | 493 |
| `app/**/*.tsx` + `components/**` | 222 |
| `lib/**` + `hooks/**` + `middleware.ts` + `next.config.ts` | 140 |
| **Unique across all three** | **737** (was **784** before this audit) |

The "~37" in this morning's audit was the count for *that build's changed files only*. The whole-project figure is **737**, and it has been quietly accumulating behind `ignoreBuildErrors`.

Top offenders after this audit's fixes:

| File | before → after |
|---|---|
| `app/api/montree/reports/preview/route.ts` | 31 → 31 |
| `app/api/montree/reports/generate/route.ts` | 23 → **4** |
| `app/montree/super-admin/marketing/master-campaign/page.tsx` | 19 → 19 |
| `app/api/montree/works/route.ts` | 19 → 19 |
| `lib/montree/admin/guru-executor.ts` | 18 → 18 |
| `lib/montree/curriculum-loader.ts` | 17 → 17 |
| `app/api/story/projects/route.ts` | 17 → 17 |
| `components/montree/reports/BatchReportsCard.tsx` | 16 → 16 |
| `app/api/montree/parent/appointments/route.ts` | 10 → **3** |
| `components/montree/child/GamePlanCard.tsx` | 11 → **8** |

By code: `TS2339` 251 · `TS2345` 142 · `TS2322` 63 · `TS18046` 50 · `TS2304` **37 → 0** · `TS7006` 35.

**The overwhelming majority are cosmetic**, and they have one root cause, documented in `lib/supabase-client.ts:9-21`: there are no generated Supabase types, so the client is `SupabaseClient<any, 'public', any>` and postgrest-js collapses row types to `GenericStringError` / `{}`. `TS2339 Property 'x' does not exist on type 'GenericStringError'` and the `PostgrestQueryBuilder` / `PostgrestFilterBuilder` mismatches are all that. **Running `supabase gen types typescript` once would erase several hundred of the 737** — and, more importantly, would have caught most of §3.2's schema drift at author time.

**Zero new errors were introduced.** Every file this audit touched has the same or fewer errors than before; the four files whose counts moved all moved down. One genuinely useful type fix went in along the way: `agora_video_calls` and `video_recording` were read by `isFeatureEnabled()` at six call sites but were never members of `FeatureKey`, so every one of those calls was a `TS2345`. Both are now in the union (`lib/montree/features/types.ts`) — type-only, no runtime registry to keep in step.

**Tests: 438 / 438 passing, 32 suites, 11 s.** `vitest` cannot run on the device VM (`node_modules` holds `@rollup/rollup-darwin-arm64`; the VM is linux-arm64, and `npm install` was off-limits), so `tests/` + `lib/` + the routes they import were tarred, staged into an isolated cloud container, given a clean dependency install, and run there against **this audit's edited sources**. Suites: `admin-auth` 14, `auth-tokens` 9, `delete-account-route` 8, `game-progress-validators` 17, `monthly-all-areas-builder` 6, `paper-scan-sheet` 10, `paper-scan-session-writer` 15, `parent-emails` 9, `period-area-facts` 7, `photo-gate-a` 11, `rate-limiter` 11, `sanctuary-crypto` 14, `sanctuary-content-store` 8, `sanctuary-e2e` 3, `system-controls-stepup` 10, `vault-range` 18, `vault-unlock-keying` 4, `weekly-summary-all-areas-builder` 13, + 14 more.

**i18n:** `npm run i18n:check:strict` → 12/12 locales, 6103 keys each.

---

## 5. MEDIUM

### 5.1 `montree-media` is a public bucket with anon INSERT and DELETE storage policies (**REPORTED**)
`supabase/migrations/092_montree_media.sql:81-100` creates the bucket `public = true` and then:

```sql
CREATE POLICY "Public read montree-media"        ON storage.objects FOR SELECT USING (bucket_id = 'montree-media');
CREATE POLICY "Authenticated upload montree-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'montree-media');
CREATE POLICY "Authenticated delete montree-media" ON storage.objects FOR DELETE USING (bucket_id = 'montree-media');
```

Despite the names, neither write policy has a `TO` clause — same `PUBLIC`-by-default trap as §2.1. If these are still live, anyone with the anon key can upload arbitrary files into, and **delete any object from**, the bucket that holds children's photos, paper-scan sheets and montages. Not probed (any check is a write). **Verify in the Supabase dashboard → Storage → Policies before anything else in this section.**

The bucket being public at all is a standing design decision: child photos are protected only by unguessable UUID paths, and `/api/montree/media/proxy` serves them with `Access-Control-Allow-Origin: *` and a 7-day CDN cache. The newer buckets get this right — `potato-snaps` (318) is `public = false` and streams through `/api/potato/media/proxy`, which checks the caller's cookie against the class in the path before fetching a byte. **`montree-media` should move to that model.** Path traversal and bucket escape are correctly blocked in the proxy; this is about the bucket, not the route.

### 5.2 Language-semester report generation timed out for a full class — **FIXED**
`app/api/montree/reports/language-semester/generate/route.ts` looped over up to 30 children strictly sequentially, one Sonnet call each, all awaited end to end. At ~10-20 s per child that is 200-400 s against the file's own `maxDuration = 300`, so a full class run timed out and **the teacher lost every report in the batch**. Now processed in ordered batches of 4: within a batch the model calls overlap, batches still run one after another so we never open 30 concurrent calls. Per-child `try`/`catch` isolation and output ordering are both unchanged.

### 5.3 Super-admin print routes accept `?token=` in the query string (**REPORTED**)
`app/api/montree/super-admin/schools/[id]/issue-manual-invoice/route.ts:56-77` and `…/finance/export/print/route.ts` fall back to a `?token=` query param because `window.open()` cannot set headers. Documented and deliberate, and both re-verify the token through `verifySuperAdminAuth`. But a super-admin JWT in a URL lands in Railway access logs, browser history and any `Referer`. Prefer a short-lived single-use print token, or a `POST`-then-redirect. **Untouched — these are billing routes.**

### 5.4 Repo hygiene
22 tracked files under `_to_delete/` — including four source tarballs (`montree-src-stage.tgz`, `montree_changes.tgz`, `_stage_src.tgz`, `_stage_src2.tgz`) and stale git lock files. No secrets in any of them (checked). Just bloat in every clone and every Docker build context. All five leftovers listed in this morning's audit §7 are already gone, and `tsconfig.scoped.json` is blank as expected.

---

## 6. LOW

1. **`lib/supabase-client.ts` is not marked `server-only`.** `getSupabase()` (service role) and `createSupabaseClient()` (anon) live in the same module, and three client components import the anon one. No leak today — Next inlines only `NEXT_PUBLIC_*` — but a future import of `getSupabase` from a client component would fail at runtime rather than at build. Splitting the file, or adding `import 'server-only'` to a server half, makes that a compile error.
2. **CSRF: a missing `Origin` header is treated as same-origin** (`middleware.ts:368`). Mitigated in practice — the auth cookie is `httpOnly` + `SameSite=lax`, which already blocks cross-site `POST`s.
3. **`/api/montree/leaderboard`** is fully public and returns agent display names with per-school active-child counts. Presumably intended; noting it because it is aggregate business data on an unauthenticated route.
4. **Cron and super-admin secret comparisons use `===`,** not a constant-time compare. Timing attacks over HTTP against a high-entropy secret are not practical; noted only because `invite-tokens.ts` already does constant-time comparison and the codebase otherwise holds that line.
5. **`app/montree/super-admin/principal-questions/page.tsx:513`** uses `dangerouslySetInnerHTML` for a label that is always a string literal (`"School ID (optional)"`, `"&nbsp;"`, …). Safe today, gratuitous, one refactor away from not being safe.
6. **`app/api/montree/photo-bank/route.ts:87`** escapes `% _ \` for ILIKE but leaves commas, which are the `.or()` list separator. Worst case is a wider result set from a table already filtered to `is_public AND is_approved` — no cross-table reach. Same shape at `guru/route.ts:1474` (`historyLocale`), where the query is already `.eq('child_id', …)`-scoped.
7. **Sonnet drafter token budget** (carried forward from this morning's audit §5.2, unchanged): `draftMonthlyAllAreasParagraphs` / `draftWeeklySummaries` ask for a whole classroom in one 4000-token call. 20 children × ~200 words truncates. Failure is graceful but silent. Chunk to ~8 children per call — the same treatment §5.2 just applied next door.

---

## 7. Per-area status

| Area | Status |
|---|---|
| Secrets / env hygiene | ✅ Clean |
| API route authentication | ✅ Clean — 531 routes, eleven auth resolvers, every public route deliberate |
| Super-admin gating | ✅ Clean (`verifySuperAdminAuth` / `verifySuperAdminPassword` / `resolveMessagingSuperAdmin`) |
| Cron / webhook secrets | ✅ Clean, fail-closed |
| SQL / filter injection | ✅ Clean |
| XSS | ✅ Clean |
| **Database RLS** | 🔴 **One live anon read+write hole — migration 337 written, NOT applied** |
| Storage buckets | 🟠 `montree-media` public + unclaused write policies — **verify in the dashboard** |
| Schema ↔ query agreement | 🟡 13 breaks fixed; `montree_work_sessions` cluster (7 sites) reported |
| Error handling discipline | 🟡 `error` discarded codebase-wide — the reason schema drift is invisible |
| Type safety | 🟡 737 errors, ~all from the untyped Supabase client; `gen types` is the lever |
| Production build | ✅ Cannot break on types (`ignoreBuildErrors`) — which is also the §3.1 root cause |
| Tests | ✅ 438/438 |
| i18n | ✅ 12/12, 6103 keys |
| Billing / Stripe | ⚪ Read only, unmodified by instruction. Signature verification confirmed on all four webhooks. |

---

## 8. Everything this audit changed

**New file (not applied):**
- `migrations/337_evaluation_org_rls_lockdown.sql` — §2.1

**Fixed — runtime crashes (§3.1):**
- `app/api/montree/parent/appointments/route.ts` · `app/api/montree/reports/generate/route.ts` · `lib/curriculum/progression.ts` · `lib/youtube/discovery.ts` · `app/montree/admin/guru/page.tsx` · `components/montree/super-admin/SuperAdminGuru.tsx` · `components/montree/child/GamePlanCard.tsx`

**Fixed — broken schema reads (§3.2):**
- `lib/montree/guru/tool-executor.ts` · `lib/montree/guru/classroom-context-builder.ts` · `lib/montree/companion/{next-step,growth,school-context}.ts` · `lib/montree/admin/guru-executor.ts` · `lib/montree/admin/guru-prompt.ts` · `lib/montree/super-admin/guru-prompt.ts` · `lib/montree/voice-notes/weekly-admin.ts` · `app/api/montree/companion/journey/route.ts` · `app/api/montree/intelligence/daily-brief/route.ts` · `app/api/montree/parent/milestones/route.ts` · `app/api/montree/photo-identification/{process,sonnet-review}/route.ts` · `app/api/montree/super-admin/photo-debug/[mediaId]/route.ts`

**Fixed — operational (§5.2) and types:**
- `app/api/montree/reports/language-semester/generate/route.ts` — batched, timeout risk removed
- `lib/montree/features/types.ts` — `agora_video_calls` + `video_recording` added to `FeatureKey`

Every changed file carries an `audit-fix (Aug 23 2026)` comment stating what was wrong and why the replacement is right. Scoped `tsc` over all 22 confirms **zero new errors** and −47 overall.

**One file to delete by hand** (the sandbox cannot remove files, only blank them):

```
rm tsconfig.audit-chunk.json    # blanked to {} by this audit, as per the tsconfig.scoped.json convention
```


---

## 9. Recommended next actions, in order

1. **Run `migrations/337_evaluation_org_rls_lockdown.sql` today**, then re-probe with the `curl` in its trailer. Until then, `montree_org_invites` is an open door to organisation admin. *(minutes)*
2. **Check the `montree-media` storage policies** in Supabase → Storage → Policies (§5.1). If `"Authenticated upload/delete montree-media"` are still there without a `TO` clause, add `TO service_role` or drop them — anyone with the public key can currently delete children's photos. *(minutes)*
3. **Adopt one rule for new migrations:** never `CREATE POLICY … USING (true)` without `TO service_role` — better still, create no policy at all and rely on RLS-enabled + zero policies + the service-role bypass, which is what 313 / 318 / 336 already do. This exact bug has now been found and fixed three times (277, 313, 337). *(a line in `CLAUDE.md`)*
4. **Run `supabase gen types typescript` and wire the result into `lib/supabase-client.ts`.** It will erase several hundred of the 737 type errors *and* turn §3.2's entire bug class — thirteen silently-empty features — into compile errors. This is the single highest-leverage engineering task on the list. *(half a day)*
5. **Decide the `montree_work_sessions` question (§3.3)** — most likely retire it in favour of `montree_observation_sessions` (336), which already has `work_name` and `area` as real columns. Seven read sites across principal briefings, parent-question drafting, Tracy and the progress API are currently returning nothing. *(a session)*

Runner-up, worth queuing right behind: the `error`-discarding idiom (§3.4). A lint rule turns silent schema drift into a log line and would have caught every §3.2 bug the day it landed.
