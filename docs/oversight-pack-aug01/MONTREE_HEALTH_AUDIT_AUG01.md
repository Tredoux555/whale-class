# Montree System Health Audit — 1 August 2026

Four Sonnet agents swept the full source (fresh snapshot including today's uncommitted changes): feature-flag system, Paper Scan capture, security/auth, and data integrity. Findings consolidated and ranked by the orchestrator.

---

## ⚠️ P0 — Check this FIRST: possible active data loss in Paper Scan / Voice commits

`app/api/montree/paper-scan/[scanId]/commit/route.ts:109-119` and `app/api/montree/voice-observation/[sessionId]/commit/route.ts:79-89` both upsert `classroom_id` and `work_key` into `montree_child_progress` — **columns that no migration ever added to that table** (081, 111, 155 are the only ones touching it). If prod matches the migration history, every status-carrying commit from these two AI pipelines throws `42703 undefined_column` server-side while the extraction is still marked committed — i.e. the teacher sees "committed," the progress never lands. This exact failure class happened before with `is_focus` (documented in `progress/update/route.ts:137-144`).

**Verify in 2 minutes:** run one Paper Scan commit and check Railway logs, or in Supabase: `select column_name from information_schema.columns where table_name='montree_child_progress';` If the columns are missing → either add them by migration (they're needed anyway — see data section) or strip them from the two payloads today.

---

## Your three reported issues

### 1. "Enabled 74/74 features, teacher menu still shows the bare minimum"

Working as (badly) designed, not a glitch. The teacher "More" menu is **not feature-flag-driven**:

- The menu renders from a **per-teacher saved config** (`montree_teachers.settings.menu`), and every teacher-creation path seeds `MINIMAL_DEFAULT_MENU` (`lib/montree/menu/config.ts:74-82` — exactly the list you saw). When a saved config exists, `DashboardHeader.tsx:785` uses it and ignores flags entirely.
- The only bridge from flags → menus is `lib/montree/features/menu-sync.ts`, which covers **17 of 74** feature keys (the ones with the ⇄ MENU badge). "Enable all" syncs only those 17; the other ~57 flags gate things elsewhere in the app, never the menu.
- The legacy flag-gated menu block (`DashboardHeader.tsx:904-960`) is dead code — and 12 of its `menu_*` keys have **no row in `montree_feature_definitions` at all**, so `isEnabled()` returns false forever.
- Even a successful sync doesn't reach an open tab: the menu is fetched once on mount with no focus-revalidation (unlike the features context) — needs a reload.
- Three items (Uploads, Curriculum Browser, Montage Tracker) are hardcoded unconditionally.

**Fix (in order):** (1) extend `FEATURE_MENU_MAP` to cover every menu item id and make the saved-config branch respect flags (or drop saved-config-outranks-flags); (2) seed definition rows for — or delete — the 12 orphaned `menu_*` keys and the dead branch; (3) add focus/invalidate refetch to the menu fetch in `DashboardHeader.tsx:254-263`; (4) until then, know that "Enable all" can move at most 17 menu items, after a reload.

### 2. New-school signup defaults are NOT minimal

No signup path seeds `montree_school_features` — a fresh school inherits whatever `montree_feature_definitions.default_enabled` says, and that column has accreted `true` across ~30 migrations with no review. **Default-ON today:** daily_reports, parent_portal, games (retired feature, flag still on!), teacher_notes, multi_teacher_mgmt, class_events, bulk_student_import, photo_audit, multi_child_tagging, print_weekly_plan, photo_pipeline_v2, group_lesson_suggester, home_practice_cards, onboarding_copilot.

**Fix:** one migration flipping the ones you want off (pattern exists: migration 280 did exactly this for curriculum_gap_radar). **Better:** signup inserts explicit rows for a curated minimal allowlist, so future migrations can't silently widen new-school scope again.

### 3. "Give Control" — the edit surface already exists, but only for teachers

Give Control (`feature_self_serve`) already unlocks a real, complete switchboard: a "School Features" row appears in the teacher menu (this one IS genuinely flag-driven, `DashboardHeader.tsx:982-984`) opening `dashboard/school-features/page.tsx` — full feature list, server-side 403 when Give Control is off, and each toggle even syncs teacher menus. So after you flipped Give Control, the entry should have appeared in the teacher's menu **after a reload** (same caching gap as #1).

Gaps: **no principal-side surface at all** (natural home: the admin Settings nav), and a conflicting **legacy, ungated** principal page (`admin/features/page.tsx`) that toggles classroom-level flags with no Give Control check and no menu sync — two disconnected control planes. Fix: link the existing school-features page into the principal nav gated on `feature_self_serve`, and retire or gate the legacy page.

### 4. Paper Scan doesn't open the camera

Ranked causes:
1. **Feature flag / migration state (most likely what you hit):** `paper_scan` defaults OFF and migration 308 was still marked NOT RUN in your handoff notes. Flag off → the page renders a disabled screen, no camera anything. Check `GET /api/montree/paper-scan` for `403 feature_disabled` in devtools.
2. **Desktop Chrome behaviour (your test environment):** Paper Scan uses a bare `<input type="file" capture="environment">` — the `capture` hint is mobile-only; desktop browsers silently open a file picker, never the webcam. Not a bug, but it *looks* broken next to Smart Capture, which uses a real camera component.
3. **Structural:** Paper Scan bypasses the app's own proven camera stack (`components/montree/media/CameraCapture.tsx` + `lib/montree/platform/camera.ts` with @capacitor/camera native permissions + getUserMedia web fallback). **Durable fix:** route Paper Scan through that shared component; keep the file input only as a fallback.

---

## Security — still open (top 5 before institutional onboarding)

1. **`/api/media` is fully unauthenticated** and not in the middleware matcher — anyone can upload/delete/flip `parent_visible` on any child's photo by guessing IDs. One-line fix: add `/api/media/:path*` to the matcher. Highest live exposure in the codebase.
2. **`community/works/[id]/inject` has no rate limit** and its only auth is a 6-char login code matched with `.ilike()` — brute-forceable path to injecting curriculum into a real classroom. Add `checkRateLimit` like every other public route.
3. **Super-admin is one shared password** for everything (outreach, leads, backups, agent messaging). Fine for one operator; unacceptable once a second person or institutional support exists. Move to per-admin credentials.
4. **File-size/count caps missing** on weekly-planning upload + curriculum-import (now admin-gated, so DoS/AI-spend risk only, but blast radius grows with 100 schools).
5. **bulk-reply keeps sending after Resend rate-limit errors** — operational/deliverability risk as outreach scales.

Good news: the majority of the prior LEGACY_API_AUDIT criticals are verified fixed (classroom curriculum route, onboard, weekly-planning, demo-request clobber, drip pagination). Teachers-Room open signup was reviewed in depth and is **not** a hole (own JWT audience, deny-all RLS, rate-limited, no cross-tenant reach).

---

## Data integrity — what stands between you and clean institutional data

- **[BLOCKER] Progress is keyed by `work_name` TEXT, not a work ID.** Rename a work → history orphaned; "Pink Tower"/"pink tower"/Chinese name → separate rows; cross-school joins are string-matching. 
- **[BLOCKER] The P0 commit-route bug above.**
- **[RISK] No canonical curriculum:** every classroom owns an independent copy with its own sequence numbers (by design, migration 099). 60% in classroom A is not comparable to 60% in classroom B. Cross-school "progress vs the established curriculum" has no join path today.
- **[RISK] 15+ independent write paths** to `montree_child_progress` with divergent semantics — some rank-gated never-downgrade, some unconditional overwrite (voice commit can downgrade mastered→presented), some raw inserts that can duplicate (onboarding, admin imports).
- **[RISK] No event history** — the table stores current state only. Trend lines ("is this school accelerating?") are not derivable from the schema today.
- **[RISK] Timezones:** `session_date`/`sheet_date` are server-UTC days; no school timezone stored anywhere. Week rollups will be systematically off for schools east of UTC (i.e. China).
- **[RISK] Child transfers misattribute history:** progress rows don't persist school/classroom at write time, so a mid-year transfer retroactively moves all history to the new school's rollup.
- **[RISK] Two migration trees** (`supabase/migrations/` stale at 100, `migrations/` live at 310) and migration run-state tracked only in CLAUDE.md prose — no ledger. Multi-environment institutional work will drift.

### Minimum data cleanup before the institutional layer (ordered)
1. Fix/verify the P0 commit-route columns (may be dropping data today).
2. Canonical global curriculum table (stable `work_id`, global sequence) + `work_id` FK on progress; backfill with the existing Jaro-Winkler matcher; `work_name` becomes display-only.
3. One rank-gated `writeProgress()` primitive; all 15+ writers call it; direct upserts deleted.
4. Persist `school_id`+`classroom_id` on progress rows at write time (transfer-safe rollups).
5. Store IANA timezone per school; compute local dates from it.
6. Quarantine the stale `supabase/migrations/` tree; adopt a migration ledger.
7. Add append-only `montree_progress_events` at the same chokepoint (enables all trend reporting).
