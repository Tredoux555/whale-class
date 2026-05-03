# Session 79 — Smart Voice Onboarding Orchestrator (May 1, 2026)

**Commits:**
- `70a680cd` — orchestrator + routes + i18n (19 files, 2,084 insertions, 3 deletions)
- `081757a9` — Migration 175: flip `tell_guru_onboarding` default to enabled (post-build fix)

Both pushed to main; Railway redeploys automatically.

## Live test result + post-build fix (read this first)

User tested by opening a brand-new school on production immediately after the deploy. **The trigger did NOT fire** — the dashboard loaded normally with empty shelves and the voice onboarding orchestrator never appeared.

**Root cause:** Migration 171 (originally introducing the `tell_guru_onboarding` feature) set `default_enabled = false`. Migration 174 enabled it specifically for Whale Class. The new school had no override row in `montree_school_features`, so the resolution path `classroom_override > school_override > default_enabled` returned `false` and my trigger correctly bailed at the `if (!isEnabled('tell_guru_onboarding')) return;` line.

**Fix shipped (commit `081757a9`):** Migration 175 flips the default to true:

```sql
UPDATE montree_feature_definitions
SET default_enabled = true
WHERE feature_key = 'tell_guru_onboarding';
```

**Migration 175 must be run manually in Supabase SQL Editor** — it's a one-line UPDATE. After running it, every new school gets the feature on by default. Existing schools without an explicit override also flip to enabled. Whale Class's explicit `enabled = true` override (migration 174) remains authoritative — no behavior change there.

**For the school the user already has open right now:** since Migration 175 hasn't been run yet, run this directly in Supabase as the immediate unblocker (replace the school_id with the new school's ID — find it via `SELECT s.id FROM montree_schools s JOIN montree_classrooms c ON c.school_id = s.id WHERE c.name = 'Chen5'`):

```sql
INSERT INTO montree_school_features (school_id, feature_key, enabled)
VALUES ('<NEW_SCHOOL_ID>', 'tell_guru_onboarding', true)
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
```

Refresh the dashboard, the redirect to `/montree/dashboard/voice-onboarding` should fire.

## What this session built

A new full-classroom voice onboarding flow that takes a teacher through every un-onboarded child, one at a time, via voice. Replaces the friction of clicking into each child individually and triggering the per-child `TellGuruCard` one at a time. Once a teacher imports their classroom (whether bulk import or otherwise), they get a single continuous flow that covers every child.

The flow respects the existing `tell_guru_onboarding` feature flag. `TellGuruCard` is left in place as the per-child fallback for one-off later additions.

## The user-facing flow

1. **Trigger:** Two paths.
   - **Bulk import success:** the existing `onImported` callback now calls `router.replace('/montree/dashboard/voice-onboarding')` if the feature flag is enabled.
   - **Dashboard load:** new effect fetches `/api/montree/onboarding/voice/status`. If any pending children exist AND `tell_guru_onboarding` is enabled AND the user is a teacher (not parent/principal), redirect.
   - **Escape hatch:** `?skipOnboarding=1` query param on the dashboard URL bypasses the redirect once.

2. **Welcome screen** (locale-aware):
   - Title: *"Before anything else"*
   - Body: full warm script (the user-authored version — locked, do not rewrite)
   - Take-a-break note: *"Feel free to take a break at any time. I know it's a lot. Just be sure to finish up your current student first — the system saves automatically so you won't lose anything."*
   - Duration hint: *"This usually takes 30–45 minutes for a full classroom."*
   - Single CTA: *"I'm ready"*

3. **Per-child recording screen:**
   - Child name big and central, photo (or initial fallback) above
   - Mic button (emerald, glowing)
   - Prompt list visible below mic: strengths, what they enjoy, what they avoid, current focus per area, specific works
   - Stop button: red, pulsing
   - Timer: mm:ss, no length cap
   - Adaptive encouragement (changes at 15s and 60s)
   - Small grey "Skip {name} for now" link at the bottom

4. **Pipeline (server-side):**
   - Whisper transcribes (existing `/api/montree/voice-notes/transcribe`)
   - Sonnet extracts structured profile (existing `/api/montree/children/[childId]/onboard`) — now respects locale for the summary text
   - Haiku scans for off-curriculum mentions (new `/api/montree/onboarding/voice/scan-custom`) with fuzzy/semantic matching against curriculum + area context

5. **Review screen:** summary rendered as prose; game plan nudge shown in a glowing emerald panel if generated. Two buttons: *"That's right"* and *"Try again"*. Try again discards and re-records (the profile already saved gets overwritten by next confirm — upsert is idempotent).

6. **Custom-work catch:** for each unmatched work, an agent-styled panel:
   - *"I noticed you mentioned 'rainbow stacking blocks'"*
   - *"That's not in the standard curriculum. Can I help you add it so next time we know exactly what we're doing?"*
   - Area selector (5 pill buttons)
   - Add or skip
   - On add: Sonnet generates description/parent_description/why_it_matters/materials, work is inserted, `translateAllLocales` fires, the work is logged to `montree_global_works_staging`

7. **Transition:** brief 1.2s "Next: {name}" pause, then back to recording for the next child.

8. **Completion:** *"Your classroom is alive."* + CTA *"Open my classroom"* → redirects back to `/montree/dashboard`.

## What's already there that we reused

The existing infrastructure was so complete that this build is mostly an orchestrator on top, not a from-scratch system. Specifically:

| Reused | Path |
|--------|------|
| Whisper transcription | `app/api/montree/voice-notes/transcribe/route.ts` (5MB cap unchanged) |
| Sonnet profile extraction + curriculum seeding + game plan | `app/api/montree/children/[childId]/onboard/route.ts` |
| Mental profile schema | `montree_child_mental_profiles` (idempotent upsert keyed on child_id) |
| Custom work translation | `translateAllLocales()` in `lib/montree/insert-curriculum-work.ts` |
| Locale-agnostic AI prompts | `getAILanguageInstruction()` in `lib/montree/i18n/locale-config.ts` |
| Per-child onboarding card (now fallback) | `components/montree/onboarding/TellGuruCard.tsx` |

No new database tables. No new migrations. Presence/absence of a row in `montree_child_mental_profiles` is the source of truth for "this child has been onboarded."

## File-by-file change list

### Created (5 files)

**`app/montree/dashboard/voice-onboarding/page.tsx`** (~640 lines)
The orchestrator page. Single file with state machine + sub-component for the custom-work catch. Stages: `loading` → `welcome` → `idle` → `recording` → `transcribing` → `processing` → `review` → `custom_work_catch` → `custom_work_adding` → `transition` → `complete` (or `error_permission`). Inline styles using the dark forest aesthetic from Session 75. Keyframes for spinner + pulse defined in a top-level `<style jsx global>` block.

**`app/api/montree/onboarding/voice/status/route.ts`**
GET. Returns `{ pending: ChildSummary[], completed_count, total, classroom_id }`. Joins `montree_children` to `montree_child_mental_profiles` to find children without a profile in the teacher's classroom.

**`app/api/montree/onboarding/voice/scan-custom/route.ts`**
POST. Takes `{ transcript, classroom_id }`, fetches the classroom's curriculum names per area, calls Haiku via `tool_use` with `identify_unmatched_works` schema. Filters confidence ≥ 0.6, valid area, name length 3–60. Returns `{ unmatched: [{ work_name, area, teacher_phrase, confidence }] }`. Soft-fails to empty array on any error so the onboarding flow never breaks.

**`app/api/montree/onboarding/voice/custom-work/route.ts`**
POST. Takes `{ name, area, classroom_id, teacher_phrase }`. Validates classroom belongs to school, deduplicates by case-insensitive name match, calls Sonnet via `tool_use` with `fill_custom_work` schema to generate description/parent_description/why_it_matters/materials. Inserts into `montree_classroom_curriculum_works` with `is_custom: true, source: 'voice_onboarding'`. Fires `translateAllLocales()` (fire-and-forget) for new-locale propagation and inserts into `montree_global_works_staging` (fire-and-forget).

### Modified (4 files)

**`app/api/montree/children/[childId]/onboard/route.ts`**
Two-line change at the prompt assembly. The `summary` field in the Sonnet `save_child_profile` tool was always returning English regardless of teacher's locale. Now uses `getAILanguageInstruction(locale)` to instruct Sonnet to write the summary in the teacher's language (other structured fields stay in English since they're stored values, not user-facing text).

**`app/montree/dashboard/page.tsx`**
Added one effect (the trigger redirect) and modified the `onImported` callback to redirect to voice-onboarding after successful bulk import. The trigger respects `tell_guru_onboarding` feature flag, role (teacher only), and the `?skipOnboarding=1` escape hatch.

**`lib/montree/i18n/en.ts`**
Added 44 new keys under `voiceOnboarding.*` namespace covering welcome script, recording prompts, review labels, custom-work agent-styled copy, completion screen, and error states.

**`scripts/fill-missing-i18n-keys.mjs`**
Closing-marker regex previously matched only `};`. Every locale file actually ends with `} as const;`, so the script silently failed to write after successfully translating. Patched the regex to also match `} as const;`. Side benefit: every future fill run now works correctly.

### Modified (i18n — 11 files)

**`lib/montree/i18n/{zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts`**
44 new `voiceOnboarding.*` keys per locale, populated via the patched fill script using Haiku translation. Verified by `npm run i18n:check:strict`: all 12 locales at 100% parity (3,782 keys each).

The welcome script (`voiceOnboarding.welcome.body` and `voiceOnboarding.welcome.takeBreak`) was Haiku-translated. Worth eyeballing the zh/ja/ko/uk versions for tone/warmth — Haiku is reliable for short functional copy but can come back literal-but-flat for longer warm passages.

## Known issues and gaps

### Whale Class feature flag — verify

The user attempted to disable `tell_guru_onboarding` for Whale Class via:
```sql
UPDATE montree_school_features
SET enabled = false
WHERE school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
  AND feature_key = 'tell_guru_onboarding';
```
Result: **0 rows updated**. The flag may be set at classroom level (`montree_classroom_features`) rather than school level. To disable at classroom level:
```sql
UPDATE montree_classroom_features
SET enabled = false
WHERE classroom_id = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69'
  AND feature_key = 'tell_guru_onboarding';
```
Or check both tables to find where the flag actually lives:
```sql
SELECT 'school' AS scope, school_id::text AS id, enabled FROM montree_school_features
  WHERE feature_key = 'tell_guru_onboarding'
    AND school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
UNION ALL
SELECT 'classroom' AS scope, classroom_id::text AS id, enabled FROM montree_classroom_features
  WHERE feature_key = 'tell_guru_onboarding'
    AND classroom_id = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';
```

If the flag is currently enabled for Whale Class, the new orchestrator WILL fire on next dashboard load for any of the 20 students still missing a mental profile. Need to verify and disable before next session opens Whale Class.

### Free-tier gating not added

The existing `/onboard` route doesn't gate by tier (just like the existing TellGuruCard pattern). Voice onboarding therefore works for all tiers including Free. Per-classroom cost is roughly $1 (Whisper + Sonnet). If we want Free-tier schools blocked, add `resolveReportModel()` check at the top of `/onboard` (and possibly `/scan-custom`) returning 402 for `tier === 'free'`. One small follow-up session.

### 5MB transcribe cap

The existing voice-notes transcribe route caps at 5MB ≈ 5 minutes of webm/opus voice. I left this unchanged. For very verbose teachers this might cut off, but in practice 5 min per child is plenty. If problems surface, bump to 25MB (Whisper's max) — one-line change in `app/api/montree/voice-notes/transcribe/route.ts`.

### Whisper accuracy on Montessori vocabulary — soft mitigation only

Whisper has trouble with terms like "Sandpaper Letters," "Metal Insets," "Brown Stair." The mitigation in this build is the Sonnet fuzzy-matching step in `/scan-custom` — so "Punctuation" still matches "Pink Tower" if the surrounding area context is Sensorial. We did NOT add a Whisper `prompt` parameter with curriculum vocabulary hints (would require modifying the shared voice-notes route to accept classroom curriculum context). If misrecognition becomes a complaint, this is the next quality lift — half-day add.

## Verification status

- ✅ All four new routes lint clean (0 errors)
- ✅ All modified routes lint clean (0 new errors; pre-existing warnings only)
- ✅ All 12 locales at 100% i18n parity (3,782 keys each, verified by `npm run i18n:check:strict`)
- ✅ Pushed to `origin/main` as commit `70a680cd`
- ⏳ Railway auto-deploy triggered
- ⏳ End-to-end test on a fresh test classroom — user to perform

## Test plan for next session

1. **Verify Whale Class flag.** Run the diagnostic SQL above. Disable `tell_guru_onboarding` if it's enabled.
2. **Create a test classroom.** Use a different school or create a fresh one. Bulk-import 3 ghost students.
3. **End-to-end test:** record audio for one ghost student, ramble for 60–90 seconds about their fake strengths/weaknesses/interests/works (mention a fake work like "rainbow stacking blocks" deliberately).
4. **Verify wow moments:**
   - Welcome screen renders with the warm script in the right locale.
   - Mic-only during recording (no shelf visible).
   - Summary returns sensibly within 5–10s and reads back what you said clearly.
   - Custom-work catch fires for "rainbow stacking blocks" with the agent-styled prompt.
   - After confirm, next student appears automatically.
5. **Verify completion:** finish all 3 students. Confirm "Your classroom is alive" screen, redirect to dashboard, populated shelves.
6. **Verify resume:** mid-flow on student 2, close tab. Reopen `/montree/dashboard`. Should land on student 2 (or student 3 if 2 was confirmed before close).
7. **Verify skip:** skip a student. Verify they stay on the dashboard but appear again on next dashboard load (since profile still missing).

## Architectural rules for future sessions

- **The welcome script is canonical.** Do not let agents "improve" the wording. Tredoux authored it — it's the brand voice.
- **No length cap during recording.** If a future change adds a cap "for cost reasons," push back. The summary-back is the wow moment and depends on the teacher being able to ramble.
- **Mic-only during recording.** If a future change adds shelf preview during recording, push back. The shelf reveal at completion is part of the hook.
- **`/onboard` route is canonical for profile extraction.** Do not duplicate this logic. The orchestrator calls into it.
- **Custom-work agent uses Sonnet, not Haiku.** Personality matters in that exchange.
- **Skip = no profile written = re-appears next session.** This is intentional. The only way to truly finish onboarding is confirm or use TellGuruCard later.
- **Closing the tab loses nothing.** Pending list is recomputed from DB on every dashboard load. Don't try to add session storage or "save draft" features unless explicitly requested.

## Cost analysis

Per classroom of 20 students:
- ~20 Whisper calls × ~3 min average × $0.006/min = ~$0.36
- ~20 Sonnet onboard calls × ~$0.04 each = ~$0.80
- ~20 Haiku scan-custom calls × ~$0.001 each = ~$0.02
- A handful of Sonnet custom-work creations × ~$0.05 each = ~$0.10–$0.30

**Realistic total: $1–$1.50 per classroom onboarded.** Trivial.

## Files touched (full list)

```
A   app/api/montree/onboarding/voice/custom-work/route.ts
A   app/api/montree/onboarding/voice/scan-custom/route.ts
A   app/api/montree/onboarding/voice/status/route.ts
A   app/montree/dashboard/voice-onboarding/page.tsx
M   app/api/montree/children/[childId]/onboard/route.ts
M   app/montree/dashboard/page.tsx
M   lib/montree/i18n/en.ts
M   lib/montree/i18n/zh.ts
M   lib/montree/i18n/es.ts
M   lib/montree/i18n/de.ts
M   lib/montree/i18n/fr.ts
M   lib/montree/i18n/pt.ts
M   lib/montree/i18n/nl.ts
M   lib/montree/i18n/it.ts
M   lib/montree/i18n/ja.ts
M   lib/montree/i18n/ko.ts
M   lib/montree/i18n/uk.ts
M   lib/montree/i18n/ru.ts
M   scripts/fill-missing-i18n-keys.mjs
```
