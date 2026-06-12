# Orphan Tables Report — 77 production tables referenced by nothing

**Date:** 2026-06-12 (burn item T2-5, Part B)
**Source:** `~/Desktop/AUDIT-2026-06/FUNCTIONALITY-whale-db-crosscheck.md` (Jun-11 live export: 240 tables; 77 with no `.from('…')` anywhere in app/, lib/, scripts/, jobs/, montree/, components/, hooks/, middleware).
**Scope:** read-only analysis. **NO DROP statements anywhere in this report — recommendations only.** Nothing has been run against production.

**Method honesty:** I have no DB access from this session. Classification is by table name, migration history (`migrations/`), and code grep — including greps the original audit could not do (constant-based `.from(TABLE)` references and RPC function bodies). Where I could not verify, the table is classified "investigate" and says so.

**Archive mechanics (when Tredoux acts on this):** the recommended archive action is `ALTER TABLE x RENAME TO zzz_archive_x;` — reversible, keeps the data, and any code we missed fails loudly (42P01) instead of silently reading stale data. After a rename batch, reload the PostgREST schema cache (`NOTIFY pgrst, 'reload schema';` or Supabase dashboard → API → reload). Do NOT rename anything in the "keep" list below.

---

## 0. NOT actually orphans — KEEP (audit false positives, verified tonight)

The audit's grep only caught literal `.from('name')`. These 7 are alive through constants, RPC bodies, or scripts:

| Table | Why it's alive | Evidence |
|---|---|---|
| `montree_principal_conversations` | Referenced via `const TABLE = '…'` | `app/api/montree/admin/astra-thread/route.ts:26`; created by `migrations/246_principal_conversations.sql` (recent, deliberate) |
| `montree_curriculum_translations` | Read by the `apply_global_translations` RPC; written by seed script | `lib/montree/curriculum/apply-global-translations.ts`, `scripts/seed-global-translations.mjs:139` (REST upsert) |
| `montree_outreach_log_archive` | Destination of the `archive_old_outreach_log` RPC | `app/api/montree/super-admin/outreach-log-retention/route.ts:88` |
| `montree_weekly_pulse_locks` | Read/written by `acquire_pulse_lock` / `complete_pulse_lock` RPCs (called from pulse routes) | functions in `migrations/155_teacher_os_foundation.sql`; cleanup fn in `152_automation_foundation.sql:51` |
| `montree_work_accuracy` | Written by `update_work_accuracy` RPC | flagged † in the crosscheck itself |
| `montree_work_translations` | Written by `apply_global_translations` RPC | flagged † in the crosscheck itself |
| `video_search_logs` | Written by `log_video_search` RPC | flagged in the crosscheck itself |

**Recommendation: KEEP all 7. Do not rename, do not archive.**

That leaves **70 candidates**, grouped below per the audit's families.

---

## (a) Legacy / pre-Montree whale-class era — 47 tables

### a1. Whale-school / parent-portal v1 (20)
`attendance, classroom_children, classroom_photos, daily_reports, families, parent_access_codes, parent_messages, parent_phone_codes, parent_sessions, parent_signups, password_reset_requests, report_share_tokens, school_curriculum, school_invites, school_users, simple_teachers, teacher_children, teacher_notes, teacher_resources, work_progress`

The original whale-class school system, fully superseded by `montree_*` (e.g. `attendance` → `montree_attendance_view`, `families`/`parent_*` → `montree_parents`/`montree_parent_children`, `simple_teachers` → `montree_teachers`). The 2026-06-10 RLS lockdown phase 3 already treated several of these as legacy with sensitive contents (teacher password hashes, parent session/access codes, share tokens).

**Recommendation: ARCHIVE (zzz_ rename), but EXPORT FIRST** the four that plausibly hold irreplaceable historical records from the real whale class: `daily_reports`, `teacher_notes`, `families`, `attendance`. The credential/token tables (`parent_access_codes`, `parent_sessions`, `parent_phone_codes`, `password_reset_requests`, `report_share_tokens`) are an active security liability while they exist — archive them first.

### a2. Home / homeschool experiment (10)
`home_activity_log, home_child_progress, home_children, home_curriculum, home_curriculum_master, home_families, home_master_curriculum, home_progress, home_sessions, montree_homeschool_parents`

Abandoned homeschool product experiment; no migration after the experiment era touches them, no code path remains.

**Recommendation: ARCHIVE.** Check row counts first; if `home_children`/`home_families` are non-empty, export (real user data).

### a3. Legacy games / missions experiment (17)
`game_curriculum_mapping, game_progress, game_sessions, letter_match_progress, letter_sounds_progress, letter_tracing_progress, mission_sessions, mission_streaks, mission_weekly_calibrations, mission_wins, montessori_games, sentence_builder_progress, sentence_match_progress, student_game_progress, word_builder_progress, work_games, work_unlocks`

Per-game progress tables from the v1 games. Directly superseded **this week**: `migrations/252_game_progress.sql` (staged, `db/RUN_THESE/05`) creates the single consolidated `montree_game_progress` event table that the 9 current games write to. The old per-game tables were never written by the current code (the audit found the old save routes 404'd — so most of these are likely near-empty anyway).

**Recommendation: ARCHIVE.** Lowest-risk group of all. Note `game_sessions` appears in the RLS lockdown's legacy list — already known-dead.

---

## (b) Superseded by newer tables / explicit snapshots — 14 tables

### b1. Explicit `*_backup` snapshots (3)
`child_curriculum_position_backup, child_work_completion_backup, curriculum_roadmap_backup`

One-off safety copies made before some past migration. Their live counterparts (`child_curriculum_position`, `child_work_completion`, `curriculum_roadmap`) are all still referenced.

**Recommendation: KEEP for now → ARCHIVE after a date check.** If the snapshot predates the last successful migration of its parent table by more than a couple of months, rename it. They already function as archives; the rename just makes that explicit.

### b2. Curriculum-metadata graveyard (11)
`sensitive_periods, skill_categories, skills, work_cross_benefits, work_name_translations, work_prerequisites, work_sensitive_periods, english_progress, activity_themes, assessment_results, assessment_sessions`

Hand-curated Montessori domain metadata (sensitive periods, skill taxonomies, work prerequisite graphs, cross-benefits) from the pre-Montree curriculum engine. Superseded by `montree_classroom_curriculum_works` + `montree_curriculum_translations` + the curriculum JSON in-repo. Careful: `work_translations` (no `name_`) IS alive — only `work_name_translations` is dead.

**Recommendation: KEEP (data worth exporting).** This is curated content, not user data — expensive to recreate, cheap to store. Export `work_prerequisites`, `work_sensitive_periods`, `work_cross_benefits`, `sensitive_periods`, `skills` to JSON in the repo before any archive pass; they could seed future Montree curriculum-intelligence features. `assessment_results`/`assessment_sessions`/`english_progress` may hold real child data → export then archive.

---

## (c) Story system — 0 tables

**None of the 77 orphans are story tables.** Every `story_*` table in production is referenced by the secret-story app (and the story nuke route works off its own `STORY_TABLES` list in `app/api/story/admin/system-controls/nuke/route.ts`). The story system is fully live from the DB's point of view. Nothing to do here — this bucket is empty by evidence, not by omission.

---

## (d) Unknown / investigate — 9 tables

| Table | What I could determine | Recommendation |
|---|---|---|
| `montree_attendance` | Created by `migrations/152_automation_foundation.sql`. No code reads or writes it; the live attendance route uses `montree_attendance_view` + `montree_attendance_override` (migration 155). The `montree_attendance_summary` VIEW selects from it, so renaming the table breaks that view. | **INVESTIGATE**: if row count is 0, archive table + summary view together; if non-zero, keep (historical attendance) |
| `montree_attendance_summary` | A VIEW over `montree_attendance` (152), not a real table — the export apparently included views. | Follows whatever `montree_attendance` gets |
| `montree_consent_log` | Consent/legal audit trail. Possibly superseded by `migrations/243_parent_consent_flags.sql`, but consent records typically carry retention obligations. | **KEEP** (legal). Never archive consent evidence on a name-grep alone |
| `montree_import_logs` | Import audit log, writer unknown — possibly an RPC or a since-deleted route. | **INVESTIGATE** (check RPC bodies + row recency), then archive |
| `montree_parent_access` | Predecessor of `montree_parent_children` / parent access-code flow by name. | **INVESTIGATE** row count → archive |
| `social_accounts`, `social_content_library`, `social_post_log` | Social-posting experiment; no code, no jobs reference them. Conceivably written by an external tool/automation outside this repo. | **INVESTIGATE** (confirm no external writer — check last-row timestamps), then archive |
| `child_badges` | Gamification experiment; no writer found anywhere, not even RPC-named. | **ARCHIVE** after a row-count glance |

---

## Caveats before ANY archive pass (from the audit + tonight's greps)

1. **Dynamic table names:** the school-delete cascade (`app/api/montree/super-admin/schools/route.ts:709+`) and the story nuke route loop over hardcoded table lists. I checked both tonight — **no table recommended for archive above appears in either list** (the cascade lists only live `montree_*` tables plus the curriculum-import trio, which don't exist in prod yet anyway).
2. **RPC bodies:** the 24 RPCs called from code were the source of all 7 false positives in section 0. Before archiving anything in section (d), run `select proname, prosrc from pg_proc where pronamespace = 'public'::regnamespace` and grep the bodies for the table names.
3. **Views:** at least one "table" in the export (`montree_attendance_summary`) is a view. Renaming a base table does not break FKs or views referentially (Postgres tracks OIDs) but DOES break anything that queries by name through PostgREST.
4. **Other projects:** anything another deployment writes to (the `social_*` trio is the main suspect) must be confirmed by last-write timestamps, not by this repo's grep.

## Headline summary

- **Keep (alive or legally/strategically valuable):** 7 false positives (sec 0) + `montree_consent_log` + the 11-table curriculum-metadata set pending export + 3 backups pending date check ≈ **22 tables**.
- **Archive with confidence after row-count/export check:** games/missions (17), home experiment (10), whale-school v1 (20), `child_badges` ≈ **48 tables**.
- **Investigate first:** `montree_attendance`(+view), `montree_import_logs`, `montree_parent_access`, `social_*` (3) ≈ **7 tables**.
- Suggested order: credential/token tables first (security), then games/missions (zero risk), then home, then whale-school v1 after exports.
