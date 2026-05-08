# Session 95 Handoff — Replan write bug fixed + Story pull-to-refresh + monthly summary 40-word cap (May 8, 2026)

**5 commits pushed to main: `e9d1359e` → `cd8c654e` → `b57688d9` → `ad5e294c` → `fc2297ba`. Plus one Supabase feature-flag flip (Whale Class off Sonnet tier).**

The headline of this session: **the replan pipeline has been silently dying on a `.catch()` typo since the Stage 0 fix shipped in Session 74.** Every Weekly Wrap for the past 17 days called Sonnet/Haiku, paid for the API calls, then crashed before any DB writes — meaning `montree_child_focus_works` was frozen at April 21 across all 20 Whale Class children, and `montree_children.settings.game_plan` was stuck on the April 25 onboard values. Diagnostic logging deployed first, then Tredoux pulled Railway logs, the bug was visible in 30 seconds, fix landed minutes later. Plus pull-to-refresh on the Story messaging system, a 40-word cap on the Language Semester monthly summary, and a non-code thesis-defense prep doc.

---

## A. The replan write bug — `e9d1359e` + `cd8c654e`

### The symptom

User reported the Weekly Plan in the Weekly Admin tab wasn't updating after running auto-fill OR a full Weekly Wrap. Frustrating because Session 74 supposedly already fixed this. Their words: *"I have you the task to fix it make sure it works - nothing changed"*.

### The investigation (this session)

Direct DB queries via Supabase REST exposed:

| Query | Finding |
|-------|---------|
| Rachel's `montree_child_focus_works` | All 5 rows `set_by='weekly_wrap'`, `updated_at='2026-04-21T08:18'` — untouched in 17 days |
| Rachel's `settings.game_plan` | `source='onboard'`, `updated_at='2026-04-25'`, legacy string format (not the trilingual JSONB the replan code writes) |
| Every other child | Same pattern — focus shelves stuck at April 21, game plans stuck at April 25 onboard |
| `montree_api_usage` for `replan-child` | 20 calls billed at 2026-05-07 22:21 UTC (yesterday's wrap) — Sonnet model, ~280 output tokens each, ~$0.40 total |

So Sonnet was being called and billed but **none of the DB writes were happening**. The function was either throwing or returning early between Sonnet response and `updateChildSettings()`.

### Phase 1 — diagnostic logging (`e9d1359e`)

Couldn't see Railway logs from sandbox, so shipped a logging-only change to make the bug talk back next time it failed:

- Tagged every log line with `[Replan:<childName>]` for greppable per-child traces
- Added stage logs: `START`, `STAGE_3 sonnet_returned`, `STAGE_3.5 game_plan_written`, `STAGE_4 shelf_cleared`, `DONE`
- **Replaced `await updateChildSettings(childId, ...)`** with inline read-merge-write that captures `.error` from both the SELECT and the UPDATE — the shared `updateChildSettings()` in `lib/montree/guru/settings-helper.ts` swallows `.update()` errors silently, which is exactly how this had been hiding for 17 days
- Added `.error` checks on every focus_works + child_progress upsert (loop body and gap-fill loop)
- Logs Sonnet's raw tool_use input when `planWorks.length === 0` so Sonnet-side issues surface
- Removed unused `updateChildSettings` import

The `disabled` param + `setIsEditing` flow on the parent story page also got a small tweak in passing — see Section B.

### Phase 2 — Tredoux ran a Weekly Wrap, pulled the logs

The fresh logs showed the same line for every child:

```
[Replan:Yo-yo]  FAIL  stage=unhandled  msg=Cannot read properties of undefined (reading 'catch')
```

Reading the source: `logApiUsage(...).catch(err => console.error(...))` — but `logApiUsage()` is declared `function logApiUsage(...): void` in `lib/montree/api-usage.ts:99-107`. It's already fire-and-forget internally via its own `.then(({error})=>...)` chain. **`.catch()` was being called on `undefined`.**

That single misplaced `.catch()` was synchronously throwing TypeError, jumping straight to the outer try/catch in `replan-child.ts`, returning `replanned: false` with `error: 'unhandled: ...'`. The DB write code three lines below was unreachable.

### Phase 3 — the actual fix (`cd8c654e`)

Wrapped the call in a defensive try/catch + dropped the `.catch()`:

```typescript
if (response.usage) {
  try {
    logApiUsage({ schoolId, classroomId, endpoint: '...', model, inputTokens, outputTokens });
  } catch (err) {
    console.error(`${tag} usage_log_failed (non-fatal):`, err);
  }
}
```

**Why this bug had been invisible:** the api_usage rows DID get written (the `.then()` chain inside `logApiUsage` runs in the background after the function returns sync void). So spending was visible, audit trail was complete, but every write that came after the `.catch()` line — `updateChildSettings`, focus_works DELETE, focus_works UPSERT, progress UPSERT — was silently skipped. Anthropic was paid; the customer got nothing back.

### Architectural rules locked in (do NOT let future agents break)

1. **`logApiUsage()` returns `void`.** It does its own fire-and-forget via `.then()`. Never call `.catch()` on its return value. Wrap the call itself in try/catch if you want to handle synchronous throws.
2. **Every Supabase `.update()` / `.upsert()` MUST check the returned `.error`.** The shared `updateChildSettings()` swallows them. When DB writes need to be observable, do the read-merge-write inline using the request-scope supabase client.
3. **Stage logging on long async functions is mandatory.** When a function chains 6+ async stages (Sonnet call → tool parse → DB read → DB write → DB delete → DB upsert loop), it MUST emit a stage marker at each boundary so a silent failure tells you where it died.

---

## B. Cost fix — Whale Class flipped off Sonnet tier

While debugging the replan bug, queried `montree_school_features` for Whale Class (school_id `c6280fae-567c-45ed-ad4d-934eae79aabc`) and found:

```
ai_tier_haiku=true   (enabled by super_admin_tier_change, 2026-04-17)
ai_tier_sonnet=true  (enabled by super_admin_tier_change, 2026-04-17)
```

`resolveReportModel()` in `lib/montree/reports/resolve-model.ts` checks Sonnet first — if both are enabled, Sonnet wins. Whale Class has been running every Weekly Wrap on Sonnet:

| Phase | Cost per wrap (Sonnet) | Cost per wrap (Haiku) |
|-------|------------------------|------------------------|
| Replan (20 calls) | ~$0.40 | ~$0.05 |
| Teacher reports (20 calls) | ~$1.00 | ~$0.12 |
| Parent narratives (20 calls) | ~$0.20 | ~$0.03 |
| **Total** | **~$1.60** | **~$0.20** |

Tredoux flipped `ai_tier_sonnet=false` in Supabase SQL Editor:

```sql
UPDATE montree_school_features SET enabled = false
WHERE school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
  AND feature_key = 'ai_tier_sonnet';
```

Verified the next wrap ran on `claude-haiku-4-5-20251001`:

```
[WeeklyWrap] School c6280fae-567c-45ed-ad4d-934eae79aabc — tier=haiku model=claude-haiku-4-5-20251001
```

**~8× cost reduction per wrap.** Quality drop on teacher/parent reports is real but acceptable for this stage of product maturity. If reports feel thin, flip Sonnet back on for Whale Class only.

---

## C. Story pull-to-refresh — `ad5e294c`

User asked for iOS-style pull-down refresh on both the parent-facing Story page AND the admin dashboard messaging system. Built as a small reusable hook + indicator pair.

### Files added

| File | Purpose |
|------|---------|
| `lib/story/use-pull-to-refresh.ts` | Touch gesture hook. Only arms when `scrollY === 0`. 0.5× rubber-band damping. Threshold 70px, max pull 110px. Listeners attach once per mount via refs (not deps) for current state. Cancels cleanly on `disabled` flip. |
| `lib/story/PullRefreshIndicator.tsx` | Fixed-position pill that follows the pull. Two variants: `'parent'` (subtle dark gradient) and `'admin'` (slate panel). Arrow flips at threshold. Spinner during refresh. |

### Wiring

**Parent story page** (`app/story/[session]/page.tsx`):
- Refreshes story + media + shared files + recent messages in parallel via `Promise.allSettled`
- Disabled while editing a message — keyboard-induced scroll bounce should never trigger refresh
- Indicator inserted as first child of root div, before the existing white card

**Admin dashboard** (`app/story/admin/dashboard/page.tsx`):
- Refreshes online users (always, since count shows in sidebar) + whichever tab is active (messages / logs / vault / files / system)
- Disabled during initial session load and when the secret screensaver is locked
- Existing 10-second polling on the parent page stays — pull-to-refresh is for "now" instead of "within 10 seconds"

### Pre-existing duplicate prop fix (incidental)

ESLint flagged a `react/jsx-no-duplicate-props` error on `<MessageComposer>` where `selectedVideo` was passed twice (lines 309 and 327 in dashboard/page.tsx). This was pre-existing junk, not from my changes, but blocked `--max-warnings=0`. Removed the duplicate.

### Architectural rules locked in

1. **Pull-to-refresh is touch-only by design.** Desktop users use the browser refresh. Don't add mouse-based pull or keyboard shortcuts unless the product needs it.
2. **`usePullToRefresh` only arms at `scrollY === 0`.** Otherwise scroll-up gestures steal natural overscroll.
3. **`disabled` flag is mid-gesture safe.** Setting it to true during an active pull cancels cleanly via the `cancelGesture()` effect.

---

## D. Monthly summary 40-word cap (parallel agent + build fix)

### Parallel agent shipped `b57688d9`

User instruction (mid-session): *"the monthly summary must always be a total of around 40 words in the weekly wrap system - launch a parallel agent to take care of this"*.

Dispatched a general-purpose parallel agent. It targeted `app/api/montree/reports/language-semester/generate/route.ts` (NOT a route inside the Weekly Wrap system — see judgment-call section below), and:

- Updated tool-schema description: `"MUST be approximately 40 words. Hard cap at 45. Minimum 35."`
- Updated system prompt with the same constraint
- Added a `trimToWords()` helper at line 95 + post-processing call at line 194

### Build failure: `fc2297ba`

The Railway build then failed with:

```
the name `trimToWords` is defined multiple times
```

The agent had not noticed an EXISTING `trimToWords` at line 306 — the v7 sentence-boundary-aware version that walks backwards to the last complete sentence. JavaScript doesn't allow two `function` declarations with the same name at module scope.

Fix: removed the agent's simpler version (lines 95–100). Updated the academic-report call site to pre-clean line breaks via `cleanText(raw)` before passing into the v7 trimmer (the v7 version doesn't clean by itself).

**Net behaviour:** 45-word hard cap still enforced, AND now respects sentence boundaries. Slightly better than the agent's simple word-slice.

### Judgment call about whether the parallel agent picked the right file

User said *"in the weekly wrap system"* but the only field literally called "monthly summary" lives in the Language Semester report (a separate /reports route). The Weekly Wrap routes have weekly teacher reports + parent narratives, not a monthly summary block. The agent picked Language Semester — possibly correct, possibly the user meant something else.

Flagged this in the response and offered to redo if interpretation #2 was intended. User did not redirect, so the assumption stands.

### Architectural rules locked in

1. **Word-count caps on AI-generated text MUST use sentence-boundary-aware trimmers.** Plain `slice(0, n).join(' ')` cuts mid-sentence and looks unprofessional. The v7 `trimToWords()` in `language-semester/generate/route.ts` is the canonical pattern.
2. **Parallel agents working on AI-pipeline files MUST grep for existing helpers before adding new ones.** A simple `grep "function trimToWords"` would have caught the duplicate in 2 seconds.

---

## E. Thesis defense prep (non-code deliverable)

User uploaded `卢雪靓_开题答辩_v3.pptx` — a Chinese master's thesis proposal defense (43 slides, epidemiology + biostatistics, Beijing nursing-home chronic pain study, defense date May 9). User asked for predicted defense committee questions, ranked most-likely → least-likely, plus a self-audit.

Output files (in `whale/thesis-defense-prep/`):
- `卢雪靓_开题答辩_问题预测与应答策略.docx` (47 KB, 124 paragraphs)
- `卢雪靓_开题答辩_问题预测与应答策略.pdf` (281 KB, LibreOffice export)

**Top 10 ranked questions** (Section 3 of the doc): sample size + Deff justification → Haidian-only generalizability → MMSE ≤ 10 exclusion → self-developed questionnaire validity → Andersen model fit → qualitative supply-side bias → multilevel/mixed-effects model → item-count contradiction (P24 vs P26) → timeline feasibility → innovation vs Chan 2021 systematic review.

**Self-audit** (Section 5): 8 honest caveats including ranking subjectivity, single-source input (PPT only), assumed committee composition (epi/biostats-heavy), didn't actually verify item count, citation accuracy not independently verified, may be over-defensive on Andersen model, Q9 staffing answer is a template not real, doesn't cover delivery-skill aspects.

Not in git. Sits in `whale/thesis-defense-prep/` directly — separate from the codebase. Not relevant to next session unless user wants follow-up after the defense.

---

## F. Refused — handwriting forgery on a medical certificate

User uploaded `Medical Certificate - Sou.pdf` and asked me to *"mimic the hand writing and edit it"* to change the date.

**Declined.** Document forgery on a medical record bearing a real doctor's name and signature is fraud against whoever it's submitted to (employer, school, insurer, immigration, court). Explained the legitimate alternatives (return to issuing doctor, telehealth, talk to the recipient first, ask for a clarification letter). Offered to help draft the message to the doctor or recipient if that would unstick the underlying problem.

This is the architectural posture going forward: **forgery requests get a hard no, with practical alternatives offered.**

---

## Files changed across all 5 commits

| Commit | Files |
|--------|-------|
| `e9d1359e` | `lib/montree/reports/replan-child.ts` (logging + error propagation, +68/−15) |
| `cd8c654e` | `lib/montree/reports/replan-child.ts` (drop `.catch()` on void return, +18/−9) |
| `b57688d9` | `app/api/montree/reports/language-semester/generate/route.ts` (parallel agent — 40-word cap) |
| `ad5e294c` | `lib/story/use-pull-to-refresh.ts` (NEW), `lib/story/PullRefreshIndicator.tsx` (NEW), `app/story/[session]/page.tsx`, `app/story/admin/dashboard/page.tsx` (+321/−2) |
| `fc2297ba` | `app/api/montree/reports/language-semester/generate/route.ts` (drop duplicate trimToWords, +6/−9) |

---

## Verification status

- ✅ All 5 commits on `origin/main`
- ✅ Build error from `b57688d9` resolved by `fc2297ba`
- ✅ Whale Class confirmed flipped to Haiku tier (verified via Supabase REST)
- ✅ Lint clean on all changed files (`--max-warnings=0`)
- ⏳ User to verify on production after Railway deploys `fc2297ba`:
  - Run Weekly Wrap → confirm Railway logs show `[Replan:<name>] STAGE_3.5 game_plan written` → `STAGE_4 shelf_cleared` → `DONE shelf_advanced filled=5/5`
  - Open Weekly Admin → Plan tab for next week → focus works should show NEW picks based on what each child has actually been doing
  - Open Story page on phone → pull down at top → "Pull to refresh" indicator → release → data refreshes
  - Generate one Language Semester monthly summary → ~40 words, ends on a clean sentence

---

## Next session priorities (ordered)

1. **🚨 Verify the replan fix on production.** Hard refresh photo-audit, run Weekly Wrap, check Rachel's plan tab on next week. Should show new works, not the April 21 ghost shelf.
2. **🚨 Pull a Railway log line** showing `[Replan:Rachel] DONE shelf_advanced filled=5/5 ...` to confirm STAGE_3.5 + STAGE_4 + STAGE_5 all run cleanly.
3. **Verify pull-to-refresh on phone** for both Story surfaces.
4. **Verify monthly summary cap** by generating one Language Semester report and counting words.
5. **Carry-over from Session 94** — Supabase security alerts (Apr 28 + May 5), Stripe wiring per `docs/STRIPE_BILLING_SETUP.md`, Resend domain verification, Sarah's agent login issuance, Phase 5 payout calculator, Phase 6 super-admin Money tab.
6. **Carry-over outreach** — FAMM Argentina + Cambridge Montessori Global + Otari NZ + Lions Gate + Montessori Norge follow-ups (see Active Reply Threads block in CLAUDE.md). Plus 14+ bounce addresses still need DB `status='bounced'` updates.
7. **Optional polish** — Q9 in the thesis-defense docx ("staffing answer is invented") — if user wants to swap in real arrangement.

---

## Architectural rules locked in this session (full list)

1. `logApiUsage()` returns void. Never `.catch()` on its return value. Wrap the call itself in try/catch.
2. Every Supabase `.update()`/`.upsert()` MUST check `.error`. `updateChildSettings()` in `lib/montree/guru/settings-helper.ts` swallows them — when writes need to be observable, do read-merge-write inline.
3. Long async functions (6+ stages) MUST emit stage markers (`STAGE_1`, `STAGE_2`, ...) so silent failures tell you where they died.
4. Pull-to-refresh: touch-only, only arms at `scrollY === 0`, 0.5× damping, 70px threshold. `disabled` flag is mid-gesture safe.
5. Word-count caps on AI text use sentence-boundary-aware trimmers (v7 `trimToWords` in language-semester route is canonical).
6. Parallel agents working on AI-pipeline files MUST grep for existing helpers before adding new ones.
7. Document-forgery requests get a hard no + practical alternatives.
