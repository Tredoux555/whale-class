# Session 118 Handoff — May 19, 2026

**8 commits pushed to main: `78a61ec2` → `5b0f026c`.** Continuation of Session 117 work plus a focused burn list the user assigned mid-session covering parent portal UX, welcome-message PWA tip, teacher messages search, photo audit Correct regression, photo pipeline v2 deep audit + 4-fix bundle, and an Others tab in ThisIsSheet.

## 🚨 OPERATIONAL — ONE THING ONLY

**Run `migrations/224_photo_pipeline_v2_flag.sql` in Supabase SQL Editor.**

Until run, the photo pipeline v2 fixes stay fail-closed-OFF (the very thing the user complained about — Untagged surge, worksheet over-match, missing top-3 chips, recently-corrected-work bias — keeps happening). Once run, all four fixes activate for every school by default. Per-school rollback is one SQL statement if quality drops further:

```sql
UPDATE montree_school_features SET enabled = false
WHERE school_id = '<school_id>' AND feature_key = 'photo_pipeline_v2';
```

No other migrations pending from this session.

## Commit log (chronological)

| # | SHA | What |
|---|---|---|
| 1 | `78a61ec2` | Agora video calls: network quality pill + reconnecting toast + debug logger (carry-over from Session 117's late work) |
| 2 | `7069820f` | Parent portal: Montree home anchor + upcoming-meeting card in thread |
| 3 | `9d1997a8` | Parent welcome message: "Save to Home Screen" PWA install tip |
| 4 | `bc8022c4` | Teacher messages: searchable parent-thread filter |
| 5 | `5bd7da45` | Photo audit Correct: don't open picker when curriculum match exists |
| 6 | `b65648b0` | **Photo pipeline v2: 4-fix bundle behind one feature flag** |
| 7 | `7a4ddc03` | ThisIsSheet: Others tab with three sub-categories |
| 8 | `5b0f026c` | Audit fix: teacher messages search input fontSize 15 → 16 (iOS Safari zoom-on-focus) |

## What shipped, by ship

### 1. Agora UX — network pill + reconnecting toast + debug logger (`78a61ec2`)

438 insertions, 7 deletions across 2 files. Carries over the work that was in flight at the end of Session 117 when the prior context compacted.

- NEW `lib/montree/appointments/agora/debug-logger.ts` — 500-entry ring buffer, console mirror, `copyAgoraLogs()` clipboard helper with `execCommand` fallback for older browsers.
- `AgoraVideoCall.tsx` subscribes to `connection-state-change`, `network-quality`, `exception`. Top-bar Signal pill (good/fair/poor on emerald/gold/red). Top-center toast (Reconnecting / Back online / Connection lost). 12 `agoraLog()` instrumentation points across join, token refresh, tracks, publish, errors, connection state, network quality. Debug panel reachable via `Cmd/Ctrl+Shift+D` or long-press the network pill — Copy / Clear / Close buttons, 1-second live refresh of the timeline.

**Audit:** 3 passes clean. Drops the require() lazy import (legacy ESLint anti-pattern) in favor of static `getAgoraLogs` import.

### 2. Parent portal Montree home anchor + upcoming-meeting card (`7069820f`)

230 insertions / 33 deletions across 5 files. Universal home affordance + a real bridge from message-booking notifications to the appointment Join button.

- **API extension** — `GET /api/montree/parent/messages/threads/[threadId]` now returns `appointments` array tied to this thread (parent-scoped via `thread_id + school_id + parent_id` — three-filter cross-pollination contract preserved).
- **Thread detail page** — pins an "Upcoming meeting" card at top when this thread has a non-cancelled appointment within the next 7 days OR ended within the last 2 hours. State-backed clock ticks once a minute so the Join window opens reactively while the parent has the thread open.
- **Universal Montree home link** — sprout logo + wordmark top-left on every parent page (messages list, thread detail, appointments, report). Tap → `/montree/parent/dashboard`. No more clicking "Back, Back, Back".
- Dropped the stale "Back to report" mid-bar on messages list.

### 3. Parent welcome message PWA install tip (`9d1997a8`)

10 insertions / 5 deletions in `app/montree/dashboard/parent-codes/page.tsx`. Brings the parent-invite welcome in lockstep with the teacher welcome (Tracy's `draft_teacher_welcome_messages` + admin classroom Send button, which already had this). Adds the line:

> Tip: once you're in, save the page to your home screen so it works like an app — on iPhone tap the share icon then "Add to Home Screen", on Android tap the menu then "Install app" or "Add to Home Screen". You won't have to log in again.

**Risk noted in audit:** message is now ~450 chars across 4 lines. WhatsApp fits cleanly (4096-char limit); SMS would fragment into 3 segments. WhatsApp is the primary channel for parent invites so this is acceptable.

### 4. Teacher messages searchable parent-thread filter (`bc8022c4`)

91 insertions / 3 deletions in `app/montree/dashboard/messages/page.tsx`. New search input above the thread list. Filters by subject, last snippet, OR any participant name (parent, principal, other teacher). Three-state UI:

- `threads.length === 0` — empty state ("No conversations yet, tap + to start")
- `filteredThreads.length === 0 && searchQuery` — no-matches card (`No conversation matches "X"`)
- `filteredThreads.length > 0` — filtered list

Matches the "Jump to student" affordance pattern from the dashboard header. Lets teachers jump straight to a parent thread when the list grows.

**Audit catch:** Initially shipped at `fontSize: 15` which triggers iOS Safari zoom-on-focus. Fixed to 16px in commit `5b0f026c` after the audit pass.

### 5. Photo audit Correct: don't open picker when curriculum match exists (`5bd7da45`)

51 insertions / 17 deletions in `app/montree/dashboard/photo-audit/page.tsx`. Regression fix.

**The bug:** Tapping `✓ Correct` on a `haiku_drafted` card would open the "This is..." picker the moment the AI `proposed_name` didn't exactly match a curriculum work name. Teachers tapping Correct expect a one-tap commit, not a modal interrogation. The picker should be the rare true-fallback, not the default.

**The fix:** Three-tier fallback chain in `handleConfirmHaikuDraft`:

1. `proposed_name` exact / substring match (existing behavior)
2. `closest_existing_match.work_name` (Sonnet drafts populate this when the proposed name is novel but the AI knows a curriculum sibling)
3. `top_candidates[0].workName` (V2 fuzzy matcher's best — Session 105 feature)
4. THEN open picker if all three failed

Picker now opens only when the AI truly has no resolvable match. Logs `[HaikuConfirm] No resolution found, opening picker` on the fallback so we can audit how often it triggers.

### 6. Photo pipeline v2 — 4-fix bundle behind one feature flag (`b65648b0`)

164 insertions / 19 deletions across 5 files. **The big one.**

User reported four coordinated regressions in the photo identification pipeline:
- Many "Untagged" cards (child name with no work label)
- Grossly mismatched works (children doing different things ID'd as the same)
- Bias toward whatever the children just did OR what the teacher most recently corrected
- Top-3 candidates feature appeared lost

A general-purpose subagent was dispatched to do a deep-read of the pipeline (two-pass.ts, context-loader.ts, sonnet-draft.ts, work-matching.ts, process/route.ts, corrections/route.ts, recent CLAUDE.md sessions). It produced a structured diagnosis identifying four real regressions from recent commits — and the user got an honest report listing each one with file:line evidence.

**The four fixes, all behind `photo_pipeline_v2` feature flag:**

**A — `is_curriculum_work=false` gated behind confidence ≥ 0.80**
- `app/api/montree/photo-identification/process/route.ts:444`
- Session 113 V2 commit `da701b07` added `is_curriculum_work: false` as Haiku's escape hatch for non-curriculum photos. Combined with Pass 1 being aggressively narrowed in commit `8198c23b`, Haiku started routing too many photos to Other when its own confidence was low. Now requires `ident.confidence >= 0.80` before routing to Other. Below that, the photo falls through to normal `haiku_drafted` so the teacher sees chips and can confirm.
- Constant: `IS_CURRICULUM_WORK_FALSE_CONFIDENCE_FLOOR = 0.80`

**B — Visual memory injection budget reduced 50KB/100 → 20KB/40**
- `lib/montree/photo-identification/context-loader.ts:204-211`
- Apr 30 commit raised the cap to give larger classrooms more headroom, but the result was drowning Haiku attention in moat context. ~40KB+ of "looks like X but is actually Y" text fraying its focus. v2 budget: 20K chars / 40 entries / minimum floor 15.
- v1 budget (50K/100/30) preserved as the `useV2: false` fallback.

**C — `top_candidates` carried through to sonnet_drafted writes**
- `app/api/montree/photo-identification/process/route.ts:683`
- Auto-Sonnet path (`sonnet_drafted` outcome, fires when haiku confidence < 0.70) was overwriting the `haiku_drafted` draft's `top_candidates` with nothing. Chips disappeared on sonnet_drafted cards. Now preserved: `draftWithCandidates = photoPipelineV2 && ident?.topCandidates ? { ...sonnetResult.draft, top_candidates: ident.topCandidates } : sonnetResult.draft`.
- Extended `SonnetDraft` type with optional `top_candidates?: Array<{ workName, workKey, area, score }>`.

**D — Age-decay weighting on visual memory ordering**
- `lib/montree/photo-identification/context-loader.ts:131-157`
- Old order: `description_confidence DESC, updated_at DESC`. Recently-corrected works topped every prompt — exactly the bias the user described.
- New (v2 only): `weighted_score = description_confidence * exp(-days_since_update / 90)`. A 30-day-old high-confidence entry beats a 1-day-old medium-confidence one.
- Widened the SELECT to include `updated_at` so the JS sort can compute days-old.

**Migration 224** inserts `photo_pipeline_v2` into `montree_feature_definitions` with `default_enabled = TRUE`. After it runs, the bundle activates for every school. Per-school rollback is one SQL statement.

**Wiring:** `isFeatureEnabled(supabase, auth.schoolId, 'photo_pipeline_v2')` resolves in parallel with the other Promise.all queries; `loadIdentificationContext` is now called sequentially AFTER the flag resolves (net latency cost: <50ms). The flag value threads into the loader as `useV2: photoPipelineV2`.

**Trade-off accepted:** moving `loadIdentificationContext` out of the parallel Promise.all costs ~50-100ms per photo. Documented inline. Acceptable given the quality wins.

### 7. ThisIsSheet Others tab (`7a4ddc03`)

195 insertions / 38 deletions across 2 files. UX redesign of the work picker.

**Before:** the picker had a single search bar for curriculum, with a small "Save as Other" pill at the bottom as an afterthought. Photos genuinely not part of the curriculum (snack time, art, group photos, behavior moments) got a single bucket with no taxonomy.

**After:** Two-tab strip above the search bar:
- **📚 Curriculum** (default) — the classic AI-guess + search + add-new flow, unchanged
- **📌 Others** — three explicit sub-category cards:
  - 👀 Behavioral observation (amber)
  - 🌳 Outdoor play (emerald)
  - 🎉 Special event (purple)

Tap any card and the photo is saved with `sonnet_draft.is_other = true` + `sonnet_draft.other_category = '<category>'`. Same flow as the legacy Save-as-Other but the category narrows what kind of moment it is for future report grouping.

**Type extensions:**
- `Resolution` union widened with `{ type: 'other'; category?: OtherCategory; note?: string }`
- New exported type `OtherCategory = 'behavioral_observation' | 'outdoor_play' | 'special_event'`
- Server route `/api/montree/photo-audit/resolve` whitelist-validates the category before persisting

**Legacy bottom pill removed** — the Others tab replaces it explicitly. `handleSaveAsOther(category?)` signature preserved for back-compat (no callers were passing the old way, but the param is optional so a no-arg call would still work).

No migration needed — `other_category` lives in JSONB on `montree_media.sonnet_draft`.

### 8. Audit fix: iOS fontSize 15 → 16 (`5b0f026c`)

3 insertions / 2 deletions in `app/montree/dashboard/messages/page.tsx`. Caught by the 3-pass audit on the prior commits.

iOS Safari zooms in on focus for any input below 16px. The 15px shipped in commit `bc8022c4` would have triggered zoom on every focus and made selection flaky on iPhone/iPad. Architectural rule from Session 95+: customer-facing inputs MUST be ≥16px.

## Architectural rules locked in this session

1. **`is_curriculum_work=false` routing requires `confidence >= 0.80`** (when `photo_pipeline_v2` ON). Below that, fall through to `haiku_drafted` so the teacher sees chips + can confirm. Stops the silent Untagged surge.

2. **Visual memory v2 budget = 20KB chars, 40 entries hard ceiling, 15 entry minimum floor.** v1 budget (50KB/100/30) retained as the `useV2: false` fallback so flag flip restores prior behavior exactly.

3. **Visual memory v2 ordering = age-decay weighted.** `weighted_score = description_confidence * exp(-days_since_update / 90)`. Kills recently-corrected-work bias.

4. **`SonnetDraft.top_candidates` is optional but always written when `photo_pipeline_v2` ON.** Chips render uniformly across haiku_matched / haiku_drafted / sonnet_drafted cards.

5. **`handleConfirmHaikuDraft` uses three-tier resolution** before opening the picker: `proposed_name` → `closest_existing_match.work_name` → `top_candidates[0].workName` → picker. Picker is the rare fallback, not the default.

6. **Customer-facing inputs MUST be `fontSize >= 16`** (Session 95 rule, reinforced this session after the bc8022c4 regression caught in audit).

7. **Parent portal Montree home anchor is universal.** Every parent surface (messages list, thread detail, appointments, report) has a tappable sprout + wordmark top-left → `/montree/parent/dashboard`. New parent pages MUST include it.

8. **Welcome messages on every invite surface include the "Save to Home Screen" PWA install tip.** Three surfaces in lockstep: Tracy's `draft_teacher_welcome_messages`, classroom-page Send-mailto, parent-codes `buildWelcomeMessage`. Update all three together.

9. **`other_category` JSONB whitelist is the canonical Others taxonomy.** Three values: `'behavioral_observation' | 'outdoor_play' | 'special_event'`. Server-side validation on `/api/montree/photo-audit/resolve`. Don't add new categories without thinking through report-grouping implications.

10. **`photo_pipeline_v2` is the canonical kill-switch for the entire 4-fix bundle.** Don't split fixes A/B/C/D into separate flags — they were diagnosed together as a coordinated regression and must roll back together to give the user a clear "this set of changes" decision.

## Verification on production (after Railway settles + migration 224 runs)

10-step checklist. Walk through after Railway redeploys `5b0f026c`:

1. **Parent portal Montree home link** — open `/montree/parent/messages` → top-left shows sprout + "Montree" → tap → lands on dashboard. Repeat on thread detail, appointments, report.
2. **Upcoming meeting card** — open a thread that has a meeting booked within 7 days. Card pinned at top with date/time. If meeting is within 15 min, "Join" pill turns bright emerald. Tap → lands on `/montree/parent/appointments`.
3. **Parent welcome message PWA tip** — open `/montree/dashboard/parent-codes` as teacher → tap "Welcome message" Copy button → paste in any text field → confirm the home-screen install paragraph appears.
4. **Teacher messages search** — open `/montree/dashboard/messages` → search bar above thread list → type a parent name → list filters → clear with X → list restores. Verify on iPhone Safari that focus doesn't zoom.
5. **Photo audit Correct one-tap** — find any haiku_drafted card (Stamp Game, CVC Puzzle, etc.) → tap `✓ Correct` → expect immediate confirm + photo vanishes. NO picker modal.
6. **Photo pipeline v2 activation** — verify migration 224 ran via `SELECT default_enabled FROM montree_feature_definitions WHERE feature_key = 'photo_pipeline_v2';` → expect TRUE.
7. **Photo pipeline v2 effect (24-48h observation)** — capture 20-30 new photos over a day. Watch the Untagged count vs. before. Watch for top-3 chips appearing on sonnet_drafted cards. Watch for less worksheet-over-match.
8. **Others tab in ThisIsSheet** — open the picker on any photo → expect two tabs at top (Curriculum / Others) → tap Others → expect 3 sub-category cards (Behavioral / Outdoor / Special Event) → tap one → photo disappears from queue. Check DB: `SELECT sonnet_draft FROM montree_media WHERE id = '<media_id>'` → expect `is_other: true, other_category: 'behavioral_observation' | ...`.
9. **Agora call quality pill** — start a video call → top-right shows Signal icon with "good/fair/poor" pill. Reconnect during a VPN flap → toast appears top-center.
10. **Agora debug panel** — `Cmd/Ctrl+Shift+D` opens the slide-up panel mid-call. Copy log → paste back to me if any quality issues surface.

## Rollback paths

| If this breaks | Rollback |
|---|---|
| Photo pipeline v2 hurts more than it helps for a school | `UPDATE montree_school_features SET enabled=false WHERE school_id='X' AND feature_key='photo_pipeline_v2';` |
| Parent portal home link layout breaks at narrow viewports | Revert commit `7069820f` (only affects 5 files, no DB) |
| Teacher messages search input regression | Revert `bc8022c4` (1 file) |
| Photo audit Correct fix introduces new picker-not-opening bug | Revert `5bd7da45` (1 file). Picker bug stays bad but at least the modal flow works. |
| Others tab confuses teachers | Revert `7a4ddc03` (2 files). Legacy Save-as-Other pill comes back. |

## Carry-overs (not in scope for this session)

1. **Stage A Agora activation** — migration 223 + flag flip + 2-device end-to-end test (per `docs/handoffs/AGORA_STAGE_A_QUICKSTART.md`). User to handle ~5 min in Supabase.
2. **Appointments i18n sweep** — appointments + new calendar surface English-only. ~30 new keys × 12 locales via Haiku batch. Half-day focused work.
3. **Mira → Tracy super-admin scope** (Session 108 Phase 4.8) — separate `/montree/super-admin/tracy` route.
4. **Agent default revenue share % unblock** — discussed mid-session, not implemented. ~10 min change to default agents to 20% instead of disabling self-service code generation when `agent_default_share_pct IS NULL`.
5. **Whale-Class admin SPA broken links** (Session 113 V2 carry-over).
6. **Photo bank improvements** (multi-session carry-over).
7. **Carry-over outreach** — FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge.

## Files changed across the 8 commits

```
app/api/montree/parent/messages/threads/[threadId]/route.ts  (7069820f)
app/montree/parent/messages/[threadId]/page.tsx              (7069820f)
app/montree/parent/messages/page.tsx                         (7069820f)
app/montree/parent/appointments/page.tsx                     (7069820f)
app/montree/parent/report/[reportId]/page.tsx                (7069820f)
app/montree/dashboard/parent-codes/page.tsx                  (9d1997a8)
app/montree/dashboard/messages/page.tsx                      (bc8022c4, 5b0f026c)
app/montree/dashboard/photo-audit/page.tsx                   (5bd7da45)
migrations/224_photo_pipeline_v2_flag.sql                    (b65648b0, NEW)
lib/montree/features/types.ts                                (b65648b0)
lib/montree/photo-identification/context-loader.ts           (b65648b0)
lib/montree/photo-identification/sonnet-draft.ts             (b65648b0)
app/api/montree/photo-identification/process/route.ts        (b65648b0)
components/montree/photo-audit/ThisIsSheet.tsx               (7a4ddc03)
app/api/montree/photo-audit/resolve/route.ts                 (7a4ddc03)
components/montree/appointments/AgoraVideoCall.tsx           (78a61ec2)
lib/montree/appointments/agora/debug-logger.ts               (78a61ec2, NEW)
```

15 unique files changed, 2 new files. All commits lint-clean (`--max-warnings=0` exit 0), TS-clean on changed files. Three audit rounds run on this session's work; the iOS fontSize bug was caught by audit and fixed in `5b0f026c` before final ship.
