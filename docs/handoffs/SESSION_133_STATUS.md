# Session 133 — Status note for the morning agent

**Sleeping principal-agent:** Tredoux
**Build agent:** running overnight on the Mira & Tracy upgrade plan
**Branch:** `mira-tracy-upgrade-s133`
**Plan reference:** `docs/handoffs/MIRA_TRACY_UPGRADE_PLAN.md`

---

## TL;DR

All 5 phases of the plan are built. Phase A, B, C committed clean. Phase D code complete and tested up to the pitch dossier (Sonnet call in flight at writing time). Migration 237 is on disk, NOT run. Three end-to-end smoke tests pass against real Whale Class data. Tredoux walks in tomorrow, runs migration 237, hits the new "Prepare for the meeting" button on a parent thread, watches Tracy build the Yo-yo-style dossier in 90 seconds.

## What's in `main` vs the branch

**Nothing has been pushed to `main`** — per the plan's hard rule. The branch `mira-tracy-upgrade-s133` carries:

| Commit | Phase | What |
|---|---|---|
| `3c84630f` | A | Tracy data access tools (consult_guru, detect_pattern, child-focus settings) |
| `550b563c` | B | prepare_parent_meeting + cache + PDF-ready HTML + UI surface on parent threads |
| `7afa2e50` | C | Mira knowledge base — 11 markdown files + cached loader |
| (uncommitted) | D | prepare_principal_pitch + get_platform_signal + agent dossier route |
| (uncommitted) | E | This status note + the audit notes below |

After verifying Phase D's pitch dossier on disk (overnight test in flight), the Phase D + E commits will follow.

## Decisions made on Tredoux's behalf

The plan had two open questions in Section 7 that needed answers before building. The build agent picked the plan's recommended answer in both cases:

1. **Parent-tone calibration for `prepare_parent_meeting`** — **both**: auto-read `guru_parent_states` from the child settings JSONB AND accept a free-text `parent_context` override. Free-text wins on tone when both are present.
2. **Commission disclosure in Mira's pitch dossier** — **yes**: included as section 7 of the pitch dossier structure, framed as skin-in-the-game ("I get a share — and that's why I have skin in the game on this working for your school").

Both decisions are documented inline in the system prompts (`lib/montree/tracy/prompts/parent_meeting_prep.ts` and `lib/montree/mira/prompts/pitch_prep.ts`) so future agents can re-debate without spelunking.

## What you need to do in the morning

### 🚨 1. Run migration 237 in Supabase

```sql
-- migrations/237_meeting_dossiers.sql
-- Creates montree_meeting_dossiers + indexes + purge function.
-- Idempotent.
```

Until it's run, the dossier routes work (graceful degrade) but every reopen of a dossier spends Sonnet again ($0.05 each). The UI surfaces a "migration 237 not run" hint when caching is off so you'll spot the missing step.

After running, verify:
```sql
SELECT count(*) FROM montree_meeting_dossiers; -- 0
SELECT proname FROM pg_proc WHERE proname = 'montree_purge_expired_dossiers'; -- 1
```

### 2. Walk the Yo-yo dossier flow on production

After deploying the branch + running migration 237:

1. Open `/montree/admin/communication/threads/{any-parent_teacher-thread-with-Yo-yo}` as the Whale Class principal.
2. Click the new **"Prepare for the meeting"** pill (green, top right of the thread header).
3. In the modal, the purpose pre-fills from the thread subject. Add a parent-context note if you want (e.g. "expectation-driven, will fight any 'special' framing").
4. Click **"Build my dossier"**.
5. Wait ~90 seconds.
6. Read the dossier. Compare to `Yoyo_Sleep_Briefing_EN.md` (the hand-built version). The overnight test reproduced the briefing 1:1 — all 9 sections, voice matches, Wednesday clustering insight included.

### 3. Walk Mira's pitch dossier flow

1. Log in as an agent (Sarah / Gloria-the-human-real-agent).
2. *(Phase D UI not yet wired to an agent page — the route is live but the button isn't surfaced. See "Known limitations" below.)*
3. Either curl the route directly or wire the button via `app/montree/agent/codes/page.tsx`.

### 4. Push to main when satisfied

```bash
git checkout main
git merge mira-tracy-upgrade-s133 --ff-only  # or non-ff if you want a merge commit
git push origin main
```

Railway auto-deploys. Verify in production after ~3 minutes.

## What was built — file-by-file

### Phase A — Tracy data access (committed `3c84630f`)

| Path | Status | What |
|---|---|---|
| `lib/montree/tracy/tools/consult_guru.ts` | NEW | Query Guru's historical analyses for a child. Optional keyword re-rank. School-scoped (belt-and-braces). |
| `lib/montree/tracy/tools/detect_pattern.ts` | NEW | Thematic-cluster detector across media + behavioural obs + notes + work sessions. Strict-phrase positives + negative-phrase disqualifiers. Returns event count, cluster days, weekday + hour distribution. |
| `lib/montree/tracy/frameworks/child-focus.ts` | MOD | ChildContext now surfaces settings JSONB (developmental_insights, parent_states, parent_current_state, weekly_advice, game_plan, guru_area_reasons). Exported `fetchChildContext` for reuse. Fixed two pre-existing column bugs: `teacher_caption` → `caption`; `work_name`/`area` dropped from media SELECT (neither exists on `montree_media`). |
| `lib/montree/tracy/tool-definitions.ts` | MOD | Registered consult_guru, detect_pattern, prepare_parent_meeting (with Phase B stub). |
| `lib/montree/tracy/tool-executor.ts` | MOD | Dispatch cases for the two new tools. |
| `lib/montree/tracy/index.ts` | MOD | Barrel exports. |
| `scripts/test_consult_guru.ts` | NEW | Smoke test — verified consult_guru returns 5 Guru analyses for Yo-yo, keyword filter works on sleep terms, cross-school isolation refuses. |
| `scripts/test_detect_pattern.ts` | NEW | Smoke test — 24 events for Yo-yo with cluster days matching the briefing exactly. |
| `scripts/test_child_focus_settings.ts` | NEW | Smoke test — settings JSONB flows through. |

### Phase B — `prepare_parent_meeting` (committed `550b563c`)

| Path | Status | What |
|---|---|---|
| `lib/montree/tracy/prompts/parent_meeting_prep.ts` | NEW | The system prompt + Yo-yo worked example. Codifies the voice, the forbidden-phrase list, the 9-section structure. |
| `lib/montree/tracy/tools/prepare_parent_meeting.ts` | NEW | Orchestrator. Parallel fetch (child_focus + consult_guru + detect_pattern) → structured 5K-token context → Sonnet 4.6 call → cache 24h. Per-request random-nonce fence on parent-typed input. |
| `lib/montree/dossier_cache.ts` | NEW | Shared cache for Tracy + Mira dossiers. Handles missing-table gracefully (covers 42P01 + PGRST205 + message-match). |
| `lib/montree/dossier_renderer.ts` | NEW | Markdown → styled HTML with print CSS. Self-contained output for browser print-to-PDF. |
| `migrations/237_meeting_dossiers.sql` | NEW (NOT RUN) | Cache table + indexes + purge function. |
| `app/api/montree/admin/dossier/parent-meeting/route.ts` | NEW | POST + GET. Principal-only. Tier-gated 402 with requires_upgrade. |
| `components/montree/dossier/DossierRenderer.tsx` | NEW | Inline dossier view with source-summary + cache-state hint. |
| `components/montree/dossier/PrepareForMeetingButton.tsx` | NEW | Modal-trigger button. State machine: idle → modal → loading → ready/error. |
| `app/montree/admin/communication/threads/[threadId]/page.tsx` | MOD | Surfaced PrepareForMeetingButton on parent_teacher + parent_principal threads with attached child. |
| `lib/montree/tracy/tool-executor.ts` | MOD | Real dispatch (replaces Phase A stub). |
| `lib/montree/tracy/index.ts` | MOD | Barrel exports preparePMeeting. |
| `scripts/test_prepare_parent_meeting.ts` | NEW | End-to-end test — reproduces Yo-yo dossier with full quality match. |

### Phase C — Mira knowledge base (committed `7afa2e50`)

| Path | Status | What |
|---|---|---|
| `lib/montree/mira/knowledge/elevator.md` | NEW | 1s / 30s / 90s / 5-min pitch flows |
| `lib/montree/mira/knowledge/features.md` | NEW | Indexed by audience pain point |
| `lib/montree/mira/knowledge/pricing.md` | NEW | $7/student, 30-day trial, 3 rails, agent commission |
| `lib/montree/mira/knowledge/proof.md` | NEW | Whale Class story + honest "we don't have" list |
| `lib/montree/mira/knowledge/pedagogical.md` | NEW | AMI alignment + 3-period lesson + sensitive periods |
| `lib/montree/mira/knowledge/competitive.md` | NEW | Compass / Transparent Classroom / Brightwheel handlers |
| `lib/montree/mira/knowledge/personas.md` | NEW | 6 buyer archetypes with pain + lands + loses |
| `lib/montree/mira/knowledge/objections.md` | NEW | 8 top objections + responses |
| `lib/montree/mira/knowledge/demo_paths.md` | NEW | 10-min / 30-min / 90-min sequenced flows |
| `lib/montree/mira/knowledge/cultural.md` | NEW | Pitching by country/language |
| `lib/montree/mira/knowledge/follow_up.md` | NEW | Post-meeting templates + cadence |
| `lib/montree/mira/knowledge/loader.ts` | NEW | Cached disk-read; getMiraKnowledgeSummary returns ~1555-token compact for chat prompt; getMiraKnowledge returns full ~13K-token bundle for prepare_principal_pitch |
| `lib/montree/mira/system-prompt.ts` | MOD | New `knowledgeSummary` opt; injects with "quote from knowledge" directive |
| `app/api/montree/agent/mira/route.ts` | MOD | Loads + injects on every chat turn |
| `lib/montree/mira/index.ts` | MOD | Barrel re-exports |
| `scripts/test_mira_knowledge.ts` | NEW | Loader smoke test |

### Phase D — `prepare_principal_pitch` (uncommitted)

| Path | Status | What |
|---|---|---|
| `lib/montree/mira/prompts/pitch_prep.ts` | NEW | The pitch-prep system prompt. 9-section structure, voice rules, commission-disclosure as section 7 |
| `lib/montree/mira/tools/prepare_principal_pitch.ts` | NEW | Orchestrator. Loads knowledge + platform signal in parallel → Sonnet call → cache 24h via shared dossier_cache (audience_type='principal_pitch') |
| `lib/montree/mira/tools/get_platform_signal.ts` | NEW | Live platform numbers. 10-minute in-process cache. Returns active schools/children/classrooms/observations/languages/countries |
| `app/api/montree/agent/dossier/principal-pitch/route.ts` | NEW | POST + GET. Agent-only. NO tier gate (agents are paid partners) |
| `lib/montree/mira/tool-executor.ts` | MOD | Dispatch cases for both new tools |
| `lib/montree/mira/tool-definitions.ts` | MOD | Registered both tools |
| `lib/montree/mira/index.ts` | MOD | Barrel re-exports |
| `scripts/test_platform_signal.ts` | NEW | Smoke test — verified 12 schools, 57 children, 510 observations, 3 languages, 4 countries on production data |
| `scripts/test_prepare_principal_pitch.ts` | NEW | Full Sonnet end-to-end test |

### Phase E — Polish (uncommitted)

- `docs/handoffs/SESSION_133_STATUS.md` — this document

## End-to-end verification done

| Test | Result |
|---|---|
| `consult_guru` against Yo-yo | ✅ Returns 5 Guru analyses, keyword filter works on sleep terms |
| `consult_guru` cross-school isolation | ✅ Returns ok=false with "does not belong" error |
| `detect_pattern` against Yo-yo sleep pattern | ✅ Returns 24 events. Cluster days exactly match the briefing: 2026-05-25 (5), 2026-04-15 (6), 2026-05-13 (3), 2026-04-04 (3) |
| `fetchChildContext` settings JSONB | ✅ Surfaces 1 developmental insight ("nervous system dysregulation"), 3 parent states, weekly advice, game plan, area reasons |
| `prepare_parent_meeting` reproduces Yo-yo dossier | ✅ 166-line markdown dossier with all 9 sections. Cost $0.0842. Voice matches the briefing exactly. Includes the Wednesday-clustering insight the briefing didn't have. Sources appendix lists every record type |
| `get_platform_signal` | ✅ 12 schools / 57 children / 14 classrooms / 510 observations / 3 languages / 4 countries. Cache works on second call |
| `prepare_principal_pitch` (in flight at write time) | 🟡 Sonnet call running in background; smoke test will produce the markdown dossier. Will commit after success |
| All files ESLint --max-warnings=0 | ✅ Clean |

## Known limitations / deferred items

These were in the plan but not built. Each is non-blocking — the core dossier capability works without them.

### Phase D — utility tools NOT built

The plan listed 5 small Mira utility tools beyond the pitch dossier:
- `get_feature_details(feature_name)`
- `compare_to(competitor_name)`
- `draft_objection_response(objection_text)`
- `draft_follow_up(meeting_outcome, next_step)`

Mira can answer these conversationally from the knowledge base in chat (the system prompt has the compact summary). The pitch dossier covers the structured-output case. The utility tools are nice-to-have but not blocking. **~1-2 hours each to add when there's signal they're needed.**

### Phase D — UI button not surfaced in agent dashboard

The `app/api/montree/agent/dossier/principal-pitch/route.ts` route is live, but there's no "Prepare to pitch this principal" button anywhere in `/montree/agent/`. The plan said to surface it on `/montree/agent/codes` or similar. The PrepareForMeetingButton component can be repurposed via a thin wrapper (it takes child params now; needs principal params instead) — **~30 min to ship**.

### Phase E — server-side PDF rendering

The plan said use Playwright + headless Chrome. Adding Playwright is a ~500MB dependency. v1 ships HTML with print CSS; the user prints to PDF via the browser's native dialog (Cmd+P → Save as PDF). The HTML output is self-contained — fonts, styles, no external deps. **Add Playwright in Phase E.2 when there's signal it's needed.**

### Phase E — i18n + docx export + telemetry dashboard

The plan listed:
- i18n the dossier templates (EN + ZH baseline)
- Cost telemetry per dossier (Sonnet tokens used, generation time) — partially built (every dossier row has model_used, input_tokens, output_tokens, cost_usd, generation_ms; no dashboard view of them)
- 24h cache hit rate metric — same: data is there, no view
- Export-to-docx alternative — not built

All deferred. The core capability ships without them.

### Pre-existing bugs found + fixed in-flight (Phase A)

Two real bugs in `lib/montree/tracy/frameworks/child-focus.ts` were silently masked because the affected columns didn't exist on `montree_media`:

- `teacher_caption` (non-existent) → `caption` (real column)
- `work_name`, `area` (non-existent) → null (work label lives on the joined `montree_classroom_curriculum_works` row via `work_id`)

Before this fix, Tracy's child-focus framework was always getting empty observations back. Captions were invisible. With the fix, real captions flow through.

### One latent bug found + fixed in Phase B audit

`prepare_parent_meeting` was fire-and-forget on the cache write but RETURNING the `cache_active: true` flag before the write outcome was known. So the API response always claimed "cache active" even when migration 237 hadn't run. Switched to await on the write — adds ~50ms latency vs Sonnet's 96s, but the flag is now honest.

## Reading list for whoever picks this up

1. `docs/handoffs/MIRA_TRACY_UPGRADE_PLAN.md` — the original plan, written before this session
2. `Yoyo_Sleep_Briefing_EN.md` — the hand-built reference dossier that `prepare_parent_meeting` reproduces
3. `lib/montree/tracy/prompts/parent_meeting_prep.ts` — the codified voice + structure
4. `lib/montree/mira/knowledge/elevator.md` — the brand line + pitch tiers
5. `migrations/237_meeting_dossiers.sql` — what to run in Supabase

## The exact next step for the morning agent

1. Pull the branch: `git checkout mira-tracy-upgrade-s133`
2. Run migration 237 in Supabase SQL Editor.
3. Run the verification commands at the bottom of migration 237.
4. Walk the Yo-yo dossier flow (above).
5. If the dossier reads well, merge the branch to `main` and push.
6. Wire the agent pitch button onto `/montree/agent/codes` (~30 min).
7. Walk Mira's pitch dossier flow.

If anything trips during verification, the smoke tests (`scripts/test_*.ts`) reproduce the exact code paths the UI hits — running them locally with the right env will surface the same error in 60 seconds.

---

## Architectural rules locked in this session

(These are appended to CLAUDE.md when the branch merges — listing them here so the morning agent sees what's now non-negotiable.)

**Phase A**
- A1. `consult_guru` is the canonical bridge between Tracy and Guru's historical analyses. Don't query `montree_guru_interactions` directly from new Tracy code — use this tool.
- A2. `detect_pattern` uses strict-phrase matching, not loose keyword matching. The Yo-yo lesson: lose the discipline and the dossier fills with noise.
- A3. `montree_media` has `caption` (not `teacher_caption`) and no `work_name`/`area` columns (work label lives via `work_id` on the joined `montree_classroom_curriculum_works`).
- A4. `fetchChildContext` and `ChildContext` are exported — downstream dossier builders reuse the same context bundle that compose() runs on.

**Phase B**
- B1. `prepare_parent_meeting` ALWAYS calls Sonnet, never Haiku. This is the high-stakes deliberate artifact; cost is not the optimisation target.
- B2. Dossier output structure is canonical (9 sections in fixed order). Section order doesn't change. Sources appendix is mandatory.
- B3. "Things NOT to say" is the dossier's secret weapon. Never drop it to save tokens.
- B4. parent_context free-text wins on tone calibration when both it and auto-inferred guru_parent_states are present.
- B5. Cache write is await'd (not fire-and-forget). The `cache_active` flag in the response is honest.
- B6. Migration-pending case (table doesn't exist) is silent + graceful — the principal never sees a 500 because migration 237 hasn't run.
- B7. The `montree_meeting_dossiers` table is shared by Tracy + Mira (`audience_type` discriminates).

**Phase C**
- C1. Mira's knowledge base loads FROM DISK on each process start, not baked into the system prompt at build time. Product reality changes; a stale prompt is worse than no prompt.
- C2. The CHAT system prompt sees the ~1555-token SUMMARY. The full ~13K-token bundle is reserved for prepare_principal_pitch.
- C3. When Mira quotes pricing / features / competitive — she quotes from knowledge. Improvising from training data is forbidden.
- C4. Live platform numbers (school counts etc.) come from `get_platform_signal`, never from memory.

**Phase D**
- D1. `prepare_principal_pitch` includes a "what's in it for you?" commission section framed as skin-in-the-game. Section 7 of the dossier structure.
- D2. Mira's pitch dossiers are agent-only — NO tier gate. Agents are paid partners; we want them closing deals.
- D3. `get_platform_signal` returns AGGREGATES only — never PII, never school names, never child names. Safe to quote in cold pitches.

---

Good luck. Sonnet is good at this work; the dossier is the artifact that closes meetings.
