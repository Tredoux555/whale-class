# Session 133 — Final Status

**Branch:** `mira-tracy-upgrade-s133` — 8 commits, NOT pushed to main (per the plan's hard rule).
**Started:** night of May 27/28, 2026 (Tredoux asleep, autonomous overnight build per `MIRA_TRACY_UPGRADE_PLAN.md`).
**Closed:** May 28, 2026 morning, with Tredoux's eyes on findings + final fixes shipped together.

---

## TL;DR

Full Mira + Tracy dossier capability shipped end-to-end. Tracy's `prepare_parent_meeting` reproduces the hand-built Yo-yo briefing 1:1 against real Whale Class data ($0.08 / 96s). Mira's `prepare_principal_pitch` produces a Mandarin Beijing-principal pitch with all 9 sections including commission disclosure ($0.11 / 94s). Mira's knowledge base (11 markdown files, ~52KB) loads on every chat turn.

Plus three drive-by wins surfaced from the user's day:
- A real production login bug (your principal code `XVYHHX` was failing with 401) — diagnosed as hash/code desync from migration 194, fixed with SQL + a route-hardening Step 2 lookup.
- A new `/montree/super-admin/all-logins` page — every login code in the system on one neat surface (principals + teachers + agents + **parents**), with one-tap copy, role filter, search, and inline hash-desync warnings.
- Migration 237 PG-bug surfaced + fixed (partial-index `WHERE expires_at > NOW()` was rejected because NOW() isn't IMMUTABLE — switched to plain b-tree).

Eight audit-fix cycles. Two CRITICAL findings closed mid-flight (cache cross-tenant leak; principal login hash-desync). Zero net regressions vs. main.

---

## 🚨 SQL to run in Supabase (in order)

### 1. Migration 237 — dossier cache table

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS montree_meeting_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('principal', 'agent')),
  school_id UUID,
  audience_type TEXT NOT NULL CHECK (audience_type IN ('parent_meeting', 'principal_pitch')),
  audience_ref TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  meeting_purpose TEXT NOT NULL,
  parent_context TEXT,
  output_format TEXT NOT NULL DEFAULT 'markdown' CHECK (output_format IN ('markdown', 'html', 'json')),
  payload_text TEXT NOT NULL,
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 4),
  generation_ms INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

DROP INDEX IF EXISTS idx_meeting_dossiers_cache_lookup;
CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_cache_lookup
  ON montree_meeting_dossiers (cache_key, expires_at);

CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_owner_recent
  ON montree_meeting_dossiers (owner_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_dossiers_audience_recent
  ON montree_meeting_dossiers (audience_type, audience_ref, generated_at DESC);

CREATE OR REPLACE FUNCTION montree_purge_expired_dossiers()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM montree_meeting_dossiers WHERE expires_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION montree_purge_expired_dossiers() TO anon, authenticated, service_role;

COMMIT;
```

### 2. Principal hash-desync realignments (TWO rows currently desynced)

```sql
-- Tredoux's row (Whale Class principal) — login: XVYHHX
UPDATE montree_school_admins
SET password_hash = 'fe3eb5469e2863a04a4b63d2432368f1f436101128afea1a55599eea1968448f',
    updated_at = NOW()
WHERE id = '16eec1c0-bfb5-4edf-a160-059bb41803fb'
  AND login_code = 'XVYHHX';

-- Phillip Ahn — login: RGCCQR
UPDATE montree_school_admins
SET password_hash = '485c0d2fbf7e9b72812ef00e820c5258602e41547fd8248cd58e6cac6592b642',
    updated_at = NOW()
WHERE id = '7e73ab78-f5db-474b-b27a-ede3615d10d4'
  AND login_code = 'RGCCQR';
```

### 3. Verify clean after running

```sql
-- Every active principal — should all show synced=true OR is_bcrypt=true
SELECT id, name, login_code,
       encode(sha256(login_code::bytea), 'hex') = password_hash AS synced,
       password_hash LIKE '$2%' AS is_bcrypt
FROM montree_school_admins
WHERE login_code IS NOT NULL AND role = 'principal' AND is_active = true
ORDER BY name;

-- Dossier table + function exist
SELECT count(*) FROM montree_meeting_dossiers;  -- 0
SELECT proname FROM pg_proc WHERE proname = 'montree_purge_expired_dossiers';  -- 1 row
```

---

## Branch contents (8 commits)

```
788e72e8  Audit-fix wave 2: parents + 4 high-impact bug fixes on all-logins + login
5b773b79  Fix principal login + add super-admin all-logins page
cdfc9fbf  Audit-fix wave: critical cache cross-tenant leak + 4 high-impact bugs
4b963640  Grand audit fix: TypeScript correctness on the parent thread + dossier button
07b8596f  Phase D+E: Mira prepare_principal_pitch + platform signal + status note
7afa2e50  Phase C: Mira knowledge base — 11 markdown files + cached loader
550b563c  Phase B: Tracy prepare_parent_meeting (dossier builder) + cache + UI
3c84630f  Phase A: Tracy data access tools (consult_guru, detect_pattern, child-focus settings)
```

---

## What ships in each commit

### Phase A — Tracy data access (`3c84630f`)

| File | Status | What |
|---|---|---|
| `lib/montree/tracy/tools/consult_guru.ts` | NEW | Query `montree_guru_interactions` for a child. Optional keyword re-rank. School-scoped re-verification. |
| `lib/montree/tracy/tools/detect_pattern.ts` | NEW | Thematic-cluster detector. Strict-phrase positives + `negative_phrases` disqualifiers (the Yo-yo "resting hands" lesson). Returns event count, cluster days, weekday + hour distribution, representative quotes. |
| `lib/montree/tracy/frameworks/child-focus.ts` | MOD | ChildContext now surfaces settings JSONB (developmental_insights, parent_states, parent_current_state, weekly_advice, game_plan, guru_area_reasons). Exported `fetchChildContext` + `ChildContext`. Fixed 2 pre-existing column bugs: `teacher_caption` → `caption`; dropped `work_name`/`area` from media SELECT (don't exist on `montree_media`). |
| `lib/montree/tracy/tool-definitions.ts` | MOD | Registered `consult_guru`, `detect_pattern`, `prepare_parent_meeting` (Phase B stub). |
| `lib/montree/tracy/tool-executor.ts` | MOD | Dispatch cases for the two new tools. |
| `lib/montree/tracy/index.ts` | MOD | Barrel exports. |
| `scripts/test_consult_guru.ts` | NEW | Verified 5 Yo-yo Guru analyses, keyword filter works, cross-school refuses. |
| `scripts/test_detect_pattern.ts` | NEW | Reproduces briefing's 24 events with cluster days. |
| `scripts/test_child_focus_settings.ts` | NEW | Settings JSONB flows through. |

### Phase B — `prepare_parent_meeting` (`550b563c`)

| File | Status | What |
|---|---|---|
| `lib/montree/tracy/prompts/parent_meeting_prep.ts` | NEW | System prompt + Yo-yo worked example. Codifies voice + forbidden-phrase list + 9-section structure. |
| `lib/montree/tracy/tools/prepare_parent_meeting.ts` | NEW | Orchestrator. Parallel `fetchChildContext` + `consultGuru` + `detectPattern` → structured 5K-token context → Sonnet 4.6 call → cache 24h. Per-request random-nonce fence on parent-typed input. |
| `lib/montree/dossier_cache.ts` | NEW | Shared cache for Tracy + Mira dossiers. Handles missing-table gracefully (42P01 + PGRST205 + message-match). |
| `lib/montree/dossier_renderer.ts` | NEW | Markdown → styled HTML with print CSS. Self-contained output for browser print-to-PDF. |
| `migrations/237_meeting_dossiers.sql` | NEW (pending run) | Cache table + indexes + purge function. **Patched in commit `788e72e8`** to drop the partial-index `WHERE NOW()` clause. |
| `app/api/montree/admin/dossier/parent-meeting/route.ts` | NEW | POST + GET. Principal-only. Tier-gated 402 with `requires_upgrade`. |
| `components/montree/dossier/DossierRenderer.tsx` | NEW | Inline dossier view with source-summary + cache-state hint. |
| `components/montree/dossier/PrepareForMeetingButton.tsx` | NEW | Modal-trigger button. State machine: idle → modal → loading → ready/error. |
| `app/montree/admin/communication/threads/[threadId]/page.tsx` | MOD | Surfaced PrepareForMeetingButton on parent_teacher + parent_principal threads with attached child. |
| `lib/montree/tracy/tool-executor.ts` | MOD | Real dispatch (replaces Phase A stub). |
| `lib/montree/tracy/index.ts` | MOD | Barrel exports `preparePMeeting`. |
| `scripts/test_prepare_parent_meeting.ts` | NEW | End-to-end test — reproduces Yo-yo dossier with full quality match. |

### Phase C — Mira knowledge base (`7afa2e50`)

| File | Status | What |
|---|---|---|
| `lib/montree/mira/knowledge/elevator.md` | NEW | 1s / 30s / 90s / 5-min pitch flows |
| `lib/montree/mira/knowledge/features.md` | NEW | Indexed by audience pain point |
| `lib/montree/mira/knowledge/pricing.md` | NEW | $7/student, 30-day trial, 3 payment rails, agent commission |
| `lib/montree/mira/knowledge/proof.md` | NEW | Whale Class story + honest "we don't have" list |
| `lib/montree/mira/knowledge/pedagogical.md` | NEW | AMI alignment, 3-period lesson, sensitive periods, English Progression Tracker |
| `lib/montree/mira/knowledge/competitive.md` | NEW | Compass / Transparent Classroom / Brightwheel handlers |
| `lib/montree/mira/knowledge/personas.md` | NEW | 6 buyer archetypes |
| `lib/montree/mira/knowledge/objections.md` | NEW | 8 top objections + responses |
| `lib/montree/mira/knowledge/demo_paths.md` | NEW | 10-min / 30-min / 90-min sequenced demos |
| `lib/montree/mira/knowledge/cultural.md` | NEW | Pitching by country / language |
| `lib/montree/mira/knowledge/follow_up.md` | NEW | Post-meeting templates + cadence rules |
| `lib/montree/mira/knowledge/loader.ts` | NEW | Disk-cached loader. `getMiraKnowledgeSummary()` → ~1555-token compact for chat; `getMiraKnowledge()` → full ~13K-token bundle for pitch dossier. |
| `lib/montree/mira/system-prompt.ts` | MOD | `knowledgeSummary` opt + "quote from knowledge" directive |
| `app/api/montree/agent/mira/route.ts` | MOD | Loads + injects on every chat turn |
| `lib/montree/mira/index.ts` | MOD | Barrel exports |
| `scripts/test_mira_knowledge.ts` | NEW | Loader smoke test |

### Phase D + E — `prepare_principal_pitch` + status note (`07b8596f`)

| File | Status | What |
|---|---|---|
| `lib/montree/mira/prompts/pitch_prep.ts` | NEW | Pitch-prep system prompt with 9-section structure. Commission-disclosure as Section 7. |
| `lib/montree/mira/tools/prepare_principal_pitch.ts` | NEW | Orchestrator. Parallel `getMiraKnowledge` + `getPlatformSignal` → Sonnet 4.6 call → cache 24h via shared dossier_cache (`audience_type='principal_pitch'`). |
| `lib/montree/mira/tools/get_platform_signal.ts` | NEW | Live platform numbers (active schools, children, classrooms, observations, languages, countries). 10-minute in-process cache. |
| `app/api/montree/agent/dossier/principal-pitch/route.ts` | NEW | POST + GET. Agent-only. NO tier gate. |
| `lib/montree/mira/tool-executor.ts` | MOD | Dispatch for both new tools |
| `lib/montree/mira/tool-definitions.ts` | MOD | Both tools registered |
| `lib/montree/mira/index.ts` | MOD | Barrel re-exports |
| `scripts/test_platform_signal.ts` | NEW | Verified 12 schools / 57 children / 510 observations / 3 languages / 4 countries |
| `scripts/test_prepare_principal_pitch.ts` | NEW | Beijing-principal pitch in Mandarin |
| `docs/handoffs/SESSION_133_STATUS.md` | NEW | This document (initial draft) |

### Grand audit fix (`4b963640`)

3 TypeScript errors caught by `npx tsc --noEmit -p .`:
- `[threadId]/page.tsx` passed `child.id` but `child` state type was `{ name: string; photo_url?: string }` (no `id`) — switched to `thread.child_id`.
- `PrepareForMeetingButton.tsx` was calling `montreeApi<DossierResponse>(...)` but `montreeApi` isn't generic — returns `Promise<Response>`. Added `.json()` unwrap + clean non-2xx error path.

### Audit-fix wave 1 — CRITICAL + 4 high (`cdfc9fbf`)

Three parallel audits (security / architecture / correctness) ran on Phases A–E. Verifier pass came back ALL 6 VERIFIED after fixes.

| Finding | Severity | Fix |
|---|---|---|
| Cache cross-tenant leak (Tracy + Mira) — cache lookup ran before ownership check, so passing another tenant's child_id / audience_ref returned their cached dossier | CRITICAL | `makeDossierCacheKey` now requires `scope_owner_id` (Tracy: schoolId, Mira: agentId). Tracy cache-HIT path also re-verifies the child belongs to the school. |
| Migration 237 partial-index `WHERE NOW()` rejected with PG 42P17 | Real bug | Dropped the WHERE; plain b-tree on (cache_key, expires_at). |
| `loader.ts` `cachedPromise` permanent rejection on throw | Real bug | Wrapped in try/finally. |
| `makeDossierCacheKey` extras values not normalized | Real bug | Trim + lowercase every extras value before hashing. |
| Tracy cache-hit returned `child_name='(cached)'` lie | Real bug | Fast school-scoped child lookup on cache-hit path. |
| `detect_pattern` whitespace-only positives matched every record under `match='all'` | Real bug | Explicit refusal if positives reduces to empty after trim. |

### Login fix + all-logins page (`5b773b79`)

User reported `XVYHHX` returning 401 from `/api/montree/auth/unified`. Diagnosed:
- Migration 194 (Session 98, May 10) added `login_code` column to `montree_school_admins` — reversed the Session 84 "no login_code" rule.
- Unified login route's `tryPrincipalLogin` was never updated; only checked `password_hash`.
- A prior code-reset path wrote `login_code='XVYHHX'` but didn't realign `password_hash`.

Fix:
- Extended `tryPrincipalLogin` with Step 2 lookup by `login_code` ILIKE column, WITH hash-verification gate (refuses with loud-log on desync rather than silently authenticating).
- New `/montree/super-admin/all-logins` page + API surface every login code (principals + teachers + agents) with one-tap copy, search, role filter, hash-desync warning.

### Audit-fix wave 2 + parents (`788e72e8`)

Three more audits on the login + all-logins commit. Security CLEAN. Correctness + UX with gaps.

| Finding | Fix |
|---|---|
| PARENTS missing from all-logins (UX gap vs. user's brief) | Added `montree_parent_invites` to the API + a new "Parent invites" section on the page with child / classroom / school context + usage count + expired/exhausted warnings |
| ILIKE duplicate-row crash on Step 2 principal lookup (`maybeSingle()` would throw on 2 rows because ILIKE is case-insensitive but the partial UNIQUE index is case-sensitive) | Switched to `.order('created_at', { ascending: true }).limit(1)` + index access; older row wins on collision |
| Empty-string `password_hash` slipped past Step 2 guard (silently auth'd) | Explicit `typeof + length > 0` check |
| `desynced_principal_ids` false-positive on bcrypt + malformed hashes | Tightened to `/^[a-f0-9]{64}$/i` — only flag rows whose stored hash LOOKS like legacy SHA256 and mismatches |
| Copy-timer race on spam-click flickered "Copied" state | Clear timer BEFORE setting state + new timer |
| Multiple `Property does not exist on type 'never'` TS errors from Supabase `.select()` returns | Cast each result to a typed row shape (12 sites) — `(data ?? []) as unknown as RowType[]` |

---

## What lives at each new URL

| URL | Owner | What |
|---|---|---|
| `/montree/admin/communication/threads/[id]` | Principal | New gold pill "📋 Prepare for the meeting" on every parent_teacher + parent_principal thread with an attached child. |
| `/montree/super-admin/all-logins` | Tredoux | Every login code in the system — principals + teachers + agents + parents. One-tap copy. Search. Role filter. Include-inactive toggle. Inline hash-desync warning. |
| `/api/montree/admin/dossier/parent-meeting` | Principal | POST + GET. Principal-only. Tier-gated. Returns dossier markdown / HTML / JSON. |
| `/api/montree/agent/dossier/principal-pitch` | Agent | POST + GET. Agent-only. No tier gate. Returns pitch dossier markdown / HTML / JSON. |
| `/api/montree/super-admin/all-logins` | Super-admin | GET. Returns all login codes grouped by role with hash-desync detection. `Cache-Control: private, no-store`. |

---

## End-to-end verification (matches what I ran live)

| Test | Result |
|---|---|
| `consult_guru` for Yo-yo | ✅ 5 analyses, sleep-keyword filter works, cross-school isolation refuses |
| `detect_pattern` for Yo-yo sleep | ✅ 24 events; cluster days match briefing exactly (2026-05-25 ×5, 2026-04-15 ×6, 2026-05-13 ×3, 2026-04-04 ×3) |
| `fetchChildContext` settings JSONB | ✅ Surfaces nervous-system-dysregulation insight, parent state, weekly advice, game plan |
| `prepare_parent_meeting` reproduces Yo-yo dossier | ✅ 166 lines, all 9 sections, $0.0842, 96s, Wednesday-clustering insight included |
| `get_platform_signal` | ✅ 12 schools / 57 children / 510 observations / 3 languages / 4 countries; 10-min cache |
| `prepare_principal_pitch` Beijing principal in Mandarin | ✅ 165 lines, 9 sections incl. commission disclosure, $0.1068, 94s |
| Principal login `tryPrincipalLogin` Step 2 path | ✅ Hash-verify gate prevents silent auth on desync |
| Cache cross-tenant isolation (Tracy schoolId, Mira agentId) | ✅ Verified via grep + audit pass |
| Migration 237 idempotency | ✅ DROP INDEX IF EXISTS before CREATE; CREATE TABLE IF NOT EXISTS throughout |
| Hash-desync scan on production | Found 2 desynced principals — SQL above realigns both |
| All-logins page surfaces parents + principals + teachers + agents | ✅ All 4 sections + 5-role filter + copy-on-tap |
| ESLint `--max-warnings=0` on every changed file | ✅ Clean |
| `npx tsc --noEmit -p .` clean on Session-133 surface | ✅ Clean (11 pre-existing errors on `auth/unified/route.ts` lines 77–103 are also on `main` — not introduced) |

---

## Architectural rules locked in this session

**Phase A**
- A1. `consult_guru` is the canonical bridge between Tracy and Guru's historical analyses. Don't query `montree_guru_interactions` directly from new Tracy code.
- A2. `detect_pattern` uses strict-phrase matching, not loose keyword matching.
- A3. `montree_media` has `caption` (not `teacher_caption`) and no `work_name`/`area` columns (work label lives via `work_id` on the joined `montree_classroom_curriculum_works`).
- A4. `fetchChildContext` + `ChildContext` are exported — downstream dossier builders reuse the same context bundle.

**Phase B**
- B1. `prepare_parent_meeting` ALWAYS calls Sonnet, never Haiku. High-stakes deliberate artifact.
- B2. Dossier output is canonical 9-section structure. Section order doesn't change. Sources appendix mandatory.
- B3. "Things NOT to say" is the dossier's secret weapon. Never drop to save tokens.
- B4. parent_context free-text wins on tone calibration when both it AND auto-inferred guru_parent_states are present.
- B5. Cache write is await'd. The `cache_active` flag in the response is honest.
- B6. Migration-pending case (table missing) is silent + graceful.
- B7. `montree_meeting_dossiers` is shared by Tracy + Mira; `audience_type` discriminates.

**Phase C**
- C1. Mira's knowledge base loads FROM DISK on each process start, not baked into the system prompt at build time.
- C2. The CHAT system prompt sees the ~1555-token SUMMARY. The full bundle is reserved for `prepare_principal_pitch`.
- C3. When Mira quotes pricing / features / competitive — she quotes from knowledge. Improvising from training data is forbidden.
- C4. Live platform numbers come from `get_platform_signal`, never from memory.

**Phase D**
- D1. `prepare_principal_pitch` includes a "what's in it for you?" commission section, framed as skin-in-the-game.
- D2. Mira's pitch dossiers are agent-only — NO tier gate.
- D3. `get_platform_signal` returns AGGREGATES only. No PII.

**Audit-fix wave 1 (`cdfc9fbf`)**
- AF1. `makeDossierCacheKey` REQUIRES `scope_owner_id` — TypeScript enforces it. Tracy passes schoolId; Mira passes agentId. Without it, the cache becomes a cross-tenant leak.
- AF2. Partial-index predicates cannot contain `NOW()` or any other STABLE function. Use plain b-tree + WHERE-at-query-time.
- AF3. Promise caches that capture `cachedPromise = await loadOnce()` need try/finally to clear on throw, otherwise a single rejection poisons every future caller.

**Login fix + all-logins (`5b773b79` + `788e72e8`)**
- L1. `tryPrincipalLogin` walks three steps: SHA256-by-password_hash → login_code-column ILIKE (with hash verification gate) → bcrypt scan. Step 2 NEVER silently authenticates when a password_hash exists but doesn't verify — loud-log and refuse.
- L2. ILIKE-against-a-partial-UNIQUE column requires `.limit(1)` not `.maybeSingle()` (case-insensitive ILIKE can match >1 case-sensitive UNIQUE row).
- L3. Every super-admin route returning plaintext credentials in bulk MUST set `Cache-Control: private, no-store`.
- L4. Hash-desync detection only flags rows whose stored hash IS legacy-shape (64-char hex) and mismatches. Bcrypt rows and malformed hashes are excluded.
- L5. Plaintext-credential pages use `crypto` for sha256 comparison — fine on Node runtime; routes that need it MUST pin runtime away from Edge.
- L6. `/montree/super-admin/all-logins` is the canonical place to see every login code. Don't reinvent. Parent invites are first-class members of this view alongside principals + teachers + agents.

---

## Pending work / known limitations (not blocking, flagged)

### Code-side
- "Fix this row" button next to hash-desync warning — would call an existing principal-reset endpoint + realign in one click. ~30 min.
- Group-by-school toggle on all-logins (currently role-first). Cheap add when school count grows past ~5.
- 5 small Mira utility tools (`get_feature_details`, `compare_to`, `draft_objection_response`, `draft_follow_up`, `get_pricing_breakdown`) — Mira can answer these conversationally from the knowledge base in chat; structured-output case covered by the pitch dossier. Defer until signal demands them.
- Agent-side "Prepare to pitch this principal" button surfaced in agent dashboard. Route is live; UI is a ~30-min add.
- Server-side PDF via Playwright. v1 ships HTML with print CSS + Cmd+P. Add Playwright in Phase E.2 when needed.
- i18n of dossier UI labels (system prompts already respect locale via `languageDirective`).
- Telemetry dashboard for dossier cost / cache-hit metrics. Data is recorded per-row; no view yet.

### Naming inconsistencies flagged by architecture audit (cosmetic)
- New Session 133 files use `snake_case.ts`; rest of codebase uses kebab-case. Worth a sweep before merge if you care.
- `preparePMeeting` vs `preparePitch` function-name asymmetry — tool names are `prepare_parent_meeting` + `prepare_principal_pitch`. Recommend renaming to `prepareParentMeeting` + `preparePrincipalPitch` for symmetry.

### Pre-existing issues NOT introduced this session
- 7 TS errors on `app/api/montree/agent/mira/route.ts` lines 170/199/421/443 — same exact errors on `main`, just at slightly different line numbers because Session 133 added imports.
- 11 TS errors on `app/api/montree/auth/unified/route.ts` lines 77–103 — also pre-existing on `main`. The Step 2 lookup I added is at lines 480+, not affected.

---

## What you wake up to (this morning's next steps)

1. **🚨 Run the 4 SQL blocks** in Section "SQL to run in Supabase" above. Migration 237 + 2 hash realignments + the verify query.
2. **Hard-refresh** any open Montree tabs after Railway redeploys (the Service Worker has been bumped to v8 in a recent commit on main; the branch hasn't bumped it again).
3. **Test the Yo-yo dossier flow** — login as Whale Class principal → open any parent_teacher thread → click the new "📋 Prepare for the meeting" pill → wait ~90s → read.
4. **Test `/montree/super-admin/all-logins`** — login as super-admin → click the gold "🔑 All logins" button in the header → see all 4 sections; tap any code to copy.
5. **Decide:** merge branch to `main` (`git checkout main && git merge --ff-only mira-tracy-upgrade-s133 && git push`), or keep it on the branch while you walk one more verification pass.

---

## Reading list for whoever picks this up

1. `docs/handoffs/MIRA_TRACY_UPGRADE_PLAN.md` — the original plan
2. `Yoyo_Sleep_Briefing_EN.md` — the hand-built reference dossier the build reproduces
3. `lib/montree/tracy/prompts/parent_meeting_prep.ts` — codified voice + structure
4. `lib/montree/mira/knowledge/elevator.md` — brand tagline + pitch tiers
5. `migrations/237_meeting_dossiers.sql` — what runs in Supabase
6. This file

Good luck.
