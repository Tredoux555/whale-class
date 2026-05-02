# Session 80 — Voice Onboarding Hardening + Live Transcription + Landing Page i18n + Picker Brand Pass (May 2, 2026)

**🚨 CONTEXT FOR NEXT SESSION:** The user lost users on the first outreach wave because of poor onboarding. The whole point of this session was to fix that. Before any outreach restarts, the entire onboarding flow needs to feel premium and bulletproof. Voice onboarding is the entry point — it has to land.

## What got shipped (14 commits)

| Commit | What |
|---|---|
| `2fa0e97c` | Lock child identity in a ref so `pending` resets don't bump the user back to idle silently |
| `0d790809` | Centre layout + visible error states + diagnostic logging |
| `52530c4b` | Aggressive logging around onboard fetch |
| `e68b0ebe` | On-screen debug panel — full URL, status, body, JS error |
| `735fc08d` | Real-time transcription (Web Speech API) + new prompts + body shape mirrors TellGuruCard |
| `6f98cba1` | Keep transcript visible during processing — no more vanishing screen |
| `ce3a943b` | Dedicated 'Processing' screen with pulsing Montree logo |
| `2d59f5fa` | Belt-and-suspenders hardening: loadPending run-once, watchdog (90s), every silent path closed |
| `e6da5d2b` | Landing page i18n + "Get my code → Let's go" |
| `c2878660` | Review screen: chips for game_plan.works (later replaced by full shelf) |
| `3a4783ee` | Three fixes: real seeded shelf in review + remove No-evidence strip + Add custom work on shelf |
| `4d0a0ccc` | WorkWheelPicker rebrand: hot pink button → emerald + agent-style Add custom work |
| `b044ac5f` | `/onboard` returns MAX 5 focus works (one per area) — same logic as the dashboard |
| `4ac971f7` | New structured prompts: age + time + enjoys + struggles + per-area focus (5 areas indented) |

## Voice onboarding — current state

### Architecture
- Page: `app/montree/dashboard/voice-onboarding/page.tsx` — single state-machine page
- Trigger: `app/montree/dashboard/page.tsx` redirects on dashboard load if any pending children + `tell_guru_onboarding` enabled + role is teacher
- Status route: `app/api/montree/onboarding/voice/status` — returns pending children for the classroom
- Pipeline: `/api/montree/voice-notes/transcribe` (Whisper backup) → `/api/montree/children/[childId]/onboard` (Sonnet profile + game plan + curriculum seeding) → `/api/montree/onboarding/voice/scan-custom` (unmatched works) → `/api/montree/onboarding/voice/custom-work` (inline add)

### Stages
1. **`loading`** — fetch pending list once
2. **`welcome`** — Tredoux-authored opening script + "I'm ready" CTA
3. **`recording`** — child name + 5-prompt list + mic + live transcript appearing in real time via Web Speech API
4. **`transcribing` / `processing`** — Montree logo with pulsing emerald glow, "Processing" + "Putting it all together for {name}…"
5. **`review`** — summary paragraph + 5-work shelf (one per area, same logic as dashboard) + inline amber cards for unmatched works with "Add to curriculum" button
6. **`debug_error`** — when ANYTHING fails, full debug panel on screen showing step + URL + HTTP status + server response + JS error

### Real-time transcription
- Browser-native Web Speech API runs in parallel with MediaRecorder
- Words appear live in a green-bordered panel below the mic as the teacher speaks
- Auto-restarts on silence pauses (continuous: true)
- Locale-aware (en-US, zh-CN, es-ES, de-DE, fr-FR, etc.)
- If live transcript ≥ 40 chars → skip Whisper, send live transcript to Sonnet (faster, free)
- Else fall back to Whisper (Firefox / accent issues / etc.)

### Defensive hardening (after the 503 saga)
After 7+ rounds of debugging the same "user gets bumped back to idle silently" bug, the actual root cause was found: `currentChild` (computed as `pending[currentIndex]`) was becoming undefined mid-flow when something reset `pending`, and my code did `if (!currentChild) { setStage('idle'); return; }` SILENTLY. The 503 in the console was a red herring (likely SW intercepting an unrelated prefetch).

The hardening:
- **`recordingChildRef`** — child identity locked at recording-start time, used throughout the pipeline. State resets don't break it.
- **`classroomIdRef`** — same defensive pattern for classroom_id.
- **`hasLoadedRef`** — `loadPending` fires AT MOST ONCE per mount. React strict mode double-invoke guarded.
- **90s watchdog** — if pipeline hangs after stop, route to debug_error with explanatory message.
- **Every `setStage('idle')`** replaced with `setStage('debug_error')` in error paths so failures are always visible.
- **Cleanup useEffect** clears watchdog on unmount.

After commit `2d59f5fa` there is **no code path that bounces the user to idle without either a visible errorMsg banner or the full debug panel**.

### Onboarding prompts (final structure — commit `4ac971f7`)
- How old they are
- How long they've been in the classroom
- What they enjoy doing
- What they struggle with
- What they're focusing on right now in each area:
  - Practical Life
  - Sensorial
  - Mathematics
  - Language
  - Cultural

The 5 areas render as indented sub-items so it reads as one mental task ("walk me through each area") rather than 9 separate questions. Drives much richer extracted data because the teacher is explicitly nudged to think about every area.

### Review screen — what it shows now
- Title: "Here's what I heard about {name}"
- Summary paragraph (Sonnet's structured profile summary)
- **Starting shelf** — exactly 5 works (one per area), same source of truth as the dashboard's "This Week's Focus". Renders as work rows with `Practicing`/`Presented` badges, matching the dashboard layout.
- **Unmatched works** (only if any) — agent-styled amber cards: "I noticed a few works that aren't in your curriculum yet —" then `"{name}"` per work with the AI's inferred area, plus a "Add to curriculum" button per row that flips to "✓ Added" in place
- "That's right" / "Try again" buttons

The shelf comes from the seeded `montree_child_progress` rows, filtered through the dashboard's focus-picker logic server-side in `/onboard` (`is_focus → practicing → presented → not_started → completed`, ONE per area, max 5). Same logic, same data, same UX as the dashboard.

## Landing page i18n (commit `e6da5d2b`)

Full landing page (`app/montree/page.tsx`) now translatable in 12 languages:
- `useI18n()` hook wired
- `LanguageToggle` component added to the nav alongside Library / For teachers / Log in
- 21 new keys under `landing.*` namespace covering nav, hero (label + title + subtitle + CTA + fineprint), three stakeholder blocks (teacher / parents / principal), closing CTA
- All 12 locales translated to 100% parity via the existing fill script

Plus: trial signup CTA "Get my code →" → "Let's go →" across all 12 locales.

End-to-end localised: a Spanish-speaking teacher discovers `montree.xyz`, picks ES from the nav, reads the entire site in Spanish, hits "Pruébalo gratis durante 30 días", fills the trial form, hits "¡Vamos! →", gets onboarded in Spanish.

## Dashboard child page

- **"No evidence" strip removed globally** — `EvidenceStrengthBadge.tsx` returns null when strength === 'none' regardless of compact mode. Cluttery on fresh shelves; absence of badge = implicit no-evidence.
- **"Add custom work" affordance** added back on `WorkWheelPicker` — was a tiny `white/30` text link before, now a proper amber pill with gold border + badge + Sonnet enrichment via `/api/montree/onboarding/voice/custom-work` (the same route the voice onboarding catch uses). Identical agent-style flow in both surfaces.

## WorkWheelPicker brand pass (PARTIAL — commit `4d0a0ccc`)

**Done:**
- Primary CTA button (Add Work / Select) → brand emerald gradient (`#34d399 → #1D6B48`) with glow shadow. Same look every area.
- Selection highlight in the wheel → emerald-tinted (was area-coloured).
- Empty-state Add first work button → emerald gradient.
- "Add custom work" → agent-style amber pill matching voice-onboarding catch.

**Outstanding (next session):**
- Status dots in wheel rows still use stock blue (`#3b82f6` for practicing) and stock orange (`#f59e0b` for presented). Should be brand emerald + brand gold respectively.
- The small area icon at the top of the wheel still uses solid `areaConfig.color` (e.g. hot pink for Practical Life). Needs softening — keep as area identifier but render in a more brand-aligned way (maybe emerald-tinted with the area letter).
- `WorkPickerModal.tsx` (a separate, alternate picker) is still entirely light-theme — `bg-white`, `from-emerald-500 to-teal-600` gradient header, `text-gray-800`. If that picker is ever opened it'll look completely broken next to the rest of the app. Needs a full dark-forest rebuild.

## Marketing artifacts (in `docs/marketing/`)

- `04_montree_voice.png` (1080×1920) — voice onboarding card
- `05_montree_landing.png` (1080×1920) — English landing card
- `05_montree_landing_zh.png` (1080×1920) — Chinese landing card

All built from `outputs/build_cards.py` and `outputs/build_landing_zh.py`. Brand `#123428` background with cinematic emerald glow. Lora serif headline, brand gold + emerald accent. Phone-mockup aesthetic dropped after user feedback in favour of full-bleed clean compositions.

## Three video phrase translations the user requested

- "The problem" → **难题**
- "The solution" → **答案**
- "Tend to the Child, not the Observation" → **关注孩子，而非记录**

## What's NOT shipped / outstanding

### Critical (block outreach restart)
1. **End-to-end test of the new 5-prompt structure** with a real classroom. The prompts shipped (`4ac971f7`) but I haven't seen a teacher walk through them. The data quality of extracted profiles depends on whether teachers actually answer all 5 sections.
2. **Whale Class Migration 175** — `default_enabled = true` for `tell_guru_onboarding`. May or may not be run in Supabase; verify with:
   ```sql
   SELECT feature_key, default_enabled FROM montree_feature_definitions
   WHERE feature_key = 'tell_guru_onboarding';
   ```
3. **WorkPickerModal full rebuild** in dark forest theme — light-theme white background is jarring next to the rest of the app.

### Should-do (polish before outreach)
4. **Status dots in WorkWheelPicker** — change blue practicing dot to emerald, orange presented dot to gold.
5. **Top area icon in WorkWheelPicker** — soften from solid area color to emerald-tinted with letter.
6. **Welcome script tone review** — eyeball zh/ja/ko/uk versions of `voiceOnboarding.welcome.body` and `voiceOnboarding.welcome.takeBreak` for warmth. Haiku is reliable for short functional copy but can come back literal-but-flat for longer warm passages.
7. **Free-tier gate decision** — voice onboarding currently works for all tiers including Free. Cost is ~$1/classroom. If we want Free schools blocked, gate `/onboard` and `/scan-custom` via `resolveReportModel()` 402.

### Carry-over from previous sessions
8. **FAMM Argentina follow-up** — past Apr 28 deadline.
9. **3 hot lead Gmail drafts** — Copenhagen, Paint Pots UK, Ardtona House UK.
10. **Welcome Тамі in Ukrainian** — first organic Ukrainian signup.
11. **Resend domain verification** — montree.xyz in Resend.
12. **TYPE B sweep across components** (Session 78 carry-over) — replace `locale === 'zh' ? work.x_zh : work.x` with `getLocalizedField()` everywhere.

## Architectural rules locked in this session

- **The welcome script is canonical.** Tredoux-authored. Do not "improve" it. Lock the wording.
- **No length cap during recording.** Summary-back depends on rambling.
- **Mic-only during recording → clean Processing screen on stop → review.** Three distinct states. Transcript vanishes between recording and review (replaced by the Montree logo "Processing" screen).
- **Status dots / chrome / CTAs use brand emerald.** Per-area colors only on the small area icon (identifier data).
- **`recordingChildRef` is the canonical source of truth for which child the pipeline is processing.** React state can be reset; the ref cannot.
- **Every `setStage('idle')` in error paths is a bug.** Use `setStage('debug_error')` so failures are always visible.
- **`/onboard` route is canonical for profile extraction.** Returns `summary`, `experience_level`, `game_plan`, and `seeded_shelf` (max 5 focus works). Do not duplicate this logic.
- **The seeded_shelf computation in `/onboard` mirrors the focus-picker logic in `app/montree/dashboard/[childId]/page.tsx fetchAssignments`.** If that logic ever changes, both must change together.

## Cost analysis

Per classroom of 20 onboarded:
- ~20 Whisper calls (only when live transcript was insufficient — typically 0 if Web Speech API works)
- ~20 Sonnet onboard calls × ~$0.04 each = ~$0.80
- ~20 Haiku scan-custom calls × ~$0.001 each = ~$0.02
- A handful of Sonnet custom-work calls if needed × ~$0.05 each

**Total: $1–$1.50 per classroom onboarded.** Trivial.

## Files touched (this session — commits 2fa0e97c through 4ac971f7)

```
app/api/montree/children/[childId]/onboard/route.ts
app/api/montree/onboarding/voice/custom-work/route.ts (existed, unchanged)
app/api/montree/onboarding/voice/scan-custom/route.ts (existed, unchanged)
app/api/montree/onboarding/voice/status/route.ts (existed, unchanged)
app/montree/dashboard/voice-onboarding/page.tsx (heavily modified)
app/montree/dashboard/page.tsx (trigger effect)
app/montree/dashboard/[childId]/page.tsx (WorkPickerModal classroomId prop)
app/montree/page.tsx (i18n + LanguageToggle)
components/montree/EvidenceStrengthBadge.tsx (hide on none)
components/montree/WorkWheelPicker.tsx (brand pass)
components/montree/child/WorkPickerModal.tsx (custom work option)
lib/montree/i18n/en.ts + 11 other locales
docs/marketing/04_montree_voice.png + 05_montree_landing.png + 05_montree_landing_zh.png
outputs/build_cards.py + build_landing_zh.py
```

## Honest note for next session

I made multiple wrong-turn fixes this session, especially around the 503 ghost. Specifically:
- Tried to fix the 503 by simplifying the body shape (didn't help — wasn't the cause)
- Tried to fix it by adding more logging (helped diagnose but didn't fix)
- Tried by hardening individual silent paths (correct but didn't address root)
- Eventually delegated to a parallel agent who identified the actual bug: `currentChild` becoming undefined mid-flow.

The user noticed and pushed back on this multiple times. Lesson: when a bug survives 3+ "fix" attempts, stop iterating and do a systematic trace of the actual code path, or delegate to a fresh investigator.

The other lesson: I shipped two iterations of the review screen (chips of `game_plan.works`, then full seeded shelf with all `presented`/`practicing` rows) before getting to the actually-correct one (5-focus-per-area selection mirroring the dashboard). The dashboard's focus-picker logic in `fetchAssignments` was the source of truth I should have read first. **For the next session: when something on screen X "should match" something on screen Y, read screen Y's code BEFORE building screen X.**
