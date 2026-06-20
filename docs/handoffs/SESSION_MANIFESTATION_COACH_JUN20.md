# Session Handoff — Lyf Coach Manifestation Knowledge Module

*Jun 20, 2026 (Cowork, evening). Canonical handoff for the manifestation module added to the Lyf Coach brain.*

## TL;DR

Built an evidence-based **manifestation / law-of-attraction** framework for the Lyf Coach brain, wired it in, and shipped it to production `main`.

- **1 commit on `main`: `02146434`** — "Coach: add manifestation knowledge module (evidence-based daily practices)". Pushed, Railway auto-deploying.
- **No migrations, no schema changes.** Pure Coach-brain knowledge file + 4 additive wiring edits.
- Master research/comparison doc: `docs/COACH_MANIFESTATION_MASTER.md`.

## What it is

A new framework in the Coach's knowledge base (`lib/story/coach/`) that lets the Coach speak the user's "manifesting / alignment / vibration" language as motivating metaphor while delivering the validated psychology underneath (mental contrasting + implementation intentions, behavioral activation, self-efficacy, attention priming) and always landing on one concrete action. Built from an independent web deep-dive (effect sizes, mechanisms, documented harms) plus an audit of a parallel web-Claude draft.

## 🚨 The architecture lesson (why a JSON module would NOT have worked)

The Coach knowledge base is **not** a big structured JSON. Each framework is a compact house-style `.md` (`# Title — Source`, bold-led principles, ~900 chars) living in `lib/story/coach/knowledge/`. The loader (`knowledge-loader.ts`) consumes them two ways:

1. **Every turn:** `getCoachWisdomSummary()` injects the **first ~520–900 chars** of each file (the `lead()` cap) into the system prompt. So the single most important idea MUST sit at the top of the file.
2. **On demand:** the full file is pulled by the `consult_wisdom` tool when depth is needed.

A parallel web-Claude run produced a large `daily_manifestation_practices` JSON with `selection_logic`/`guardrails` keys — architecturally it could never have parsed into this brain. The correct deliverable was a matching `.md` + loader wiring.

## Files shipped (`02146434`)

| File | Change |
|------|--------|
| `lib/story/coach/knowledge/manifestation.md` | **NEW** — the framework. Opening principle (vision-alone-backfires + WOOP) sized to land inside the every-turn summary; the 8 daily practices + language-translation table + hard guardrails load via `consult_wisdom`. |
| `lib/story/coach/knowledge-loader.ts` | Added `'manifestation'` to the `WisdomTopic` union + `manifestation: 'manifestation.md'` to the `FILES` map + a `## Manifestation …` block in `getCoachWisdomSummary()` weighted at **900** (same as Essentialism/Burnout). |
| `lib/story/coach/system-prompt.ts` | Tool-use trigger: user says "manifest / alignment / vibration / visualise a goal" → `consult_wisdom` topic `manifestation`, always landing on vision + honest obstacle + one if-then action. |
| `docs/COACH_MANIFESTATION_MASTER.md` | **NEW** — human-readable master doc (deep dive + web-Claude comparison + wiring + sources). |

**🚨 Wiring note:** the `consult_wisdom` tool's topic enum is auto-derived (`enum: WISDOM_TOPICS`, where `WISDOM_TOPICS = Object.keys(FILES)`). Adding the key to `FILES` auto-registers it with the tool — **no `tool-definitions.ts` edit needed.**

## The one rule baked in (load-bearing)

Vision alone measurably **backfires** — positive fantasy lowers effort and even systolic blood pressure (you pre-experience the win, so the brain stops pushing); people who fantasise more positively about a goal achieve *less*. The engine is **vision + the honest obstacle + one if-then plan.** Pure visualisation / "it's meant to be" must never stand in for the next real move.

**Hard guardrails (in the file):** never claim thought-without-action delivers; never victim-blame ("you attracted your illness/poverty"); on risky money calls "it's meant to be" never replaces checking the real numbers; cap revision at once to avoid rumination; person-first on genuine distress.

## Evidence anchors

- If-then plans (implementation intentions): **d ≈ 0.65** (Gollwitzer & Sheeran 2006, 94 studies).
- WOOP/MCII: **g ≈ 0.34** (2021 meta-analysis; publication-bias caveat, true effect likely lower).
- Positive-fantasy energy/BP drop: Kappes & Oettingen 2011.
- Self-efficacy built best by **self-caused mastery wins** (Bandura).
- Behavioral activation ≈ CBT / antidepressants (action before motivation).
- **Visualise the doing, not the done** (process imagery > outcome imagery, PETTLEP).
- Honest debunk: the "RAS manifests your life" story is pop-neuroscience — the real construct is the **salience network + goal-driven attentional priming**.

## 🎛 Product decision (Tredoux, locked)

**No new tab for manifestation** — a behaviour shouldn't become furniture. The flow: user asks the Coach ("what exercises help me manifest my goals?") → Coach surfaces the practices → "put it in my daily schedule" → Coach drops them onto the **Planner** via its existing `add_event` tool. Nav stays **three tabs: Planner · Coach · Projects.** The covert messaging door stays buried, untouched, un-named.

**Open nuance:** `add_event` schedules **dated** events, not recurring ones. For a true set-and-forget daily ritual, a small `repeat` option on Planner events is a separate future build (offered, not built).

## Where this lives

Built into the **web Coach brain** (`lib/story/coach/`), the canonical sophisticated coach intelligence. If the native iOS Lyf Coach needs the same module on-device, port `manifestation.md` + the loader wiring there too.

## 🚨 Git/branch note (important)

The `montree` Cowork checkout was on branch **`account-deletion-jun19`** with a large uncommitted in-flight tree (Jun 20 Dark Phonics + the native LyfCoach move). The manifestation work was first committed there as **`dbba2f77`**, then **cherry-picked clean onto `main` via an isolated `/tmp` git worktree** so the dirty branch tree was never touched. The stray `dbba2f77` still sits on `account-deletion-jun19` — harmless, will no-op when that branch is eventually merged/rebased (content already on main). The working checkout was left exactly as found (still on `account-deletion-jun19`).

## Verify / next

- Confirm Railway deploy is green. Couldn't run a full `tsc` from Cowork; the 4 edits are additive (new union member, new map key, new template-literal block, new prompt line) and can't break the build, but worth an eyeball.
- Smoke test in the live Coach: say "what can I do to help manifest my goals?" → expect it to surface WOOP + the practices and offer to drop them on the Planner.
- Optional future: `repeat`-events on the Planner so daily rituals auto-schedule (only if Tredoux wants recurring).
