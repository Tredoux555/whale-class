# SESSION — Jul 5, 2026 (Cowork, evening) — Reports surface split · current-week guard rail · **replan shelf integrity (the big one)** · systemwide health check

**5 commits on main, all pushed via Desktop Commander (HEAD == origin/main, tree clean apart from the 2 pre-existing unrelated files). No migrations. No env vars.**

```
0919cf24  Reports: Teacher Review → Wrap Up (next to Confirm); Parents = Parent Reports only; harden classroomId
5e96f48c  Parents: reorder tabs to Reports · Chats · Codes
a63f4eb2  Reports: current-week guard rail — banner + jump when shown week ends before today (+2 i18n keys ×12)
d61ea911  Replan: deterministic mastery-driven shelf — stop the jack-in-the-box   ← THE BIG ONE
819c297f  Health check: pin temperature:0 on the two remaining game-plan writes
```

Every item: audit thinking → build → audit build → ship. The replan rewrite additionally got an independent fresh-eyes subagent audit before shipping (real classroom data at stake). The session closed with a full systemwide health check (3 parallel deep-audits + mechanical gates).

---

## 1. Reports surface split (`0919cf24`) — **AMENDS the Jul-5 "don't re-add a report tab to photo-audit" rule**

Driven by a live walkthrough: Teacher Review was showing inside the **Parents** tab, which is wrong — the teacher's weekly review belongs next to the daily Confirm loop, not in the parent-facing surface.

- **Wrap Up (photo-audit)** now has a **Teacher Review** tab immediately after Confirm. Implemented by re-activating the dormant `weekly_wrap` `ZONE_TAB` (which was commented out Jul-5) and rendering `<WeeklyWrapTab view="teacher">` — teacher-only review (class summary, guidance, flags, next-week shelf), **no parent send**. Reuses the existing `weeklyWrap.teacherReview` i18n key (no parity churn). Tab is ungated/always-visible (matches "right next to Confirm").
- **Parents › Reports** now renders `<WeeklyWrapTab view="parents">` — parent-report **preview + send only**; the internal Teacher/Parents sub-toggle is gone from there.
- **🚨 THE RULE (amends Jul-5):** `WeeklyWrapTab`'s `view?: 'teacher' | 'parents'` prop is load-bearing. **Teacher Review lives in Wrap Up (`view="teacher"`); parent-report generate+SEND stays in Parents (`view="parents"`).** The Jul-5 "Wrap Up = confirm-only, don't re-add a report tab" rule is refined: the *teacher review VIEW* is in Wrap Up; the *parent-facing send workflow* stays in Parents. Don't collapse them back into one toggled tab.

### classroomId self-heal (same commit)
`WeeklyWrapTab.fetchReports/handleGenerate/handleSendAll` used the raw `classroomId` prop. Parents passes `codes[0]?.classroom_id || ''`, which is `''` before codes load → **silent no-op** (blank "No reports" with no diagnosis; the old "self-heals" comment was a lie).
- **🚨 RULE:** `effectiveClassroomId = classroomId || getSession()?.classroom?.id || ''` is now used everywhere in the tab; `handleGenerate` surfaces a visible error instead of a silent return when it can't resolve a classroom. The picker helpers already resolved session-first; they're unchanged.

## 2. Parents tab reorder (`5e96f48c`)
Pills are now **Reports · Chats · Codes** (was Codes · Reports · Chats). Default landing tab is still `'codes'` — a smart default of "open on Reports for report-managers" was deliberately NOT taken to avoid a broken empty grid for `homeschool_parent` logins (who have `canManageReports=false`). Flip is a one-liner if wanted.

## 3. Current-week guard rail (`a63f4eb2`)

**Root cause of the "report shows last week / today's photos missing" scare = a timezone bug, not a data bug.** `getCurrentMonday()` computes the *local* Monday-midnight then serializes it with `toISOString()` (**UTC**). For users east of UTC (China/Asia — the whole outreach market), local Monday 00:00 = the previous day in UTC, so the week key shifts back one day. On Sundays for UTC+8 the current day is pushed *out* of "this week" (week ends Sat), and the report filter (`captured_at <= week_end`) drops today's photos.

- **Guard rail (client-only, safe):** in Reports/Teacher Review, when the shown `weekEnd < local-today` (`YYYY-MM-DD` from local date parts), a dismissible gold banner appears (`weeklyWrap.laterWeekBanner`) with **Go to this week →** (`weeklyWrap.goToCurrentWeek`). The jump walks the app's *own* week serialization forward until the week contains today, so the target key stays consistent with how reports store/query. Dismissal resets on week change.
- **2 new i18n keys × 12 locales** (en+zh real, English fallback for the other 10 — run `npm run i18n:fill-ui` to fill). Pre-commit strict parity passed.
- **🚨 DEFERRED — the real cure:** the guard rail is the **safety net, not the fix**. The week key still serializes a day early for UTC+8 users, so the *default* week label reads off by a day. The proper fix is a coordinated **timezone-correct week calc across all 8 `getCurrentMonday` sites** (`app/montree/dashboard/weekly-admin-docs/page.tsx`, `guru/weekly-review`, `weekly-review/[childId]` + `/send`, `WeeklyWrapTab`, `BatchNarrativesCard`, `WeeklyWrapCard`, `WeeklyAdminTab`) — ideally routed through `lib/montree/school-time.ts` (rule #228). It shares DB week keys, so it must be done all-at-once + tested, not piecemeal. User chose the guard rail now; deep fix is owed.

## 4. 🚨🚨 Replan shelf integrity (`d61ea911`) — THE BIG ONE

**Symptom:** a brand-new child onboarded with a hand-set starter shelf (Walking on the Line / Pink Tower / Number Rods / Sandpaper Letters / Land & Water Forms, all *presented*) jumped to advanced works (Golden Bead Subtraction / Green Series / Animals of the Continents…) on Weekly Wrap, and re-rolled to a **different random advanced set every regenerate**, with **nothing logged**. "Jumping around like a jack in the box." User: "invalidates the entire app."

**Root cause — `lib/montree/reports/replan-child.ts`, run in Stage 0 of EVERY Weekly Wrap for EVERY child, unconditionally:**
1. **Wiped the entire focus shelf** (`delete().eq('child_id', childId)`).
2. **Refilled from a temperature-1.0 LLM** (the `messages.create` had no `temperature`) whose prompt *mandated* "Forward progression is mandatory… DO NOT pick any work from PREVIOUS WORKS… never 'continue with'." So for a child with nothing mastered, the AI was *ordered* to abandon the starter shelf and pick 5 new works — non-deterministically → a different advanced set each run.
3. **Random gap-fill** (`Math.random()`).

Advancement was driven by the **calendar + dice**, not the child's demonstrated mastery — the opposite of Montessori. The cruel irony: the correct logic already existed in `advance-shelf-after-mastery.ts` (on mastery → next work *in curriculum sequence*, deterministic). The weekly replan was bulldozing it.

**Fix (full rewrite of the replan core, −215 net lines):**
- **Never wipes. Never lets an LLM pick works.** Fully deterministic.
- Per core area: **KEEP** a non-mastered current work (not_started/presented/practicing) untouched; **only a `mastered` slot advances** to the next un-touched work in that area's curriculum `sequence`; an **empty area seeds** the first un-touched work by sequence. Prereqs respected via sequence order. Mirrors `advance-shelf-after-mastery.ts` + `seed-recommended-work.ts` (never downgrades).
- The LLM is now used **only for the warm trilingual nudge text**, at `temperature: 0`, **after** the shelf is already written — so an LLM failure can never disturb the shelf, and the nudge is stable across reruns. Works/direction in `game_plan` come from the deterministic shelf, not the LLM.
- **Audit fixes (from the fresh-eyes subagent):** `statusByWork` keyed by `area::work` so a work_name existing in two areas can't cross-contaminate the KEEP/advance decision (a miss defaults to **KEEP**, never a false advance); stable name tiebreak (`a.seq - b.seq || a.name.localeCompare(b.name)`) so null/duplicate sequences don't vary the pick across reruns.

**🚨 THE MONTESSORI INVARIANT (do NOT weaken):** a work leaves a child's focus shelf ONLY when teacher-confirmed `mastered`. Nothing about a week rolling over — or a report (re)generating — may move, swap, or re-roll a work the child is still working on. Never wipe the shelf. Never let an LLM choose shelf works. The file header documents all this.

**Result:** a child who did nothing → shelf **unchanged** (no jumping). Strictly safer than before for Whale Class's real kids (worst case now is "stays the same," never "scrambled").
**Caveat:** already-scrambled test shelves (e.g. Jill) won't auto-restore — the original starters were overwritten by the buggy runs. Re-onboard a fresh student to verify the fix; it will sit rock-still across wraps.

## 5. Systemwide health check + `819c297f`

Mechanical gates + 3 parallel deep-audits. **Verdict: 🟢 healthy, no critical ship-blockers.**

**Gates green:** tree clean, HEAD==origin, **i18n 12/12 at 100%**, `logApiUsage().catch` replan-killer pattern eliminated (0), the 5 empty `.catch()` all benign client-side.

**Fixed during the check (`819c297f`):** the two sibling non-determinism bugs to the replan fix — the **"refresh plan" button** (`game-plan/refresh/route.ts:199`) and **onboarding** (`onboard/route.ts:933`, which *seeds the starter shelf*) both wrote durable per-child game plans at temperature 1.0. Both pinned to `temperature: 0`.
- **🚨 RULE:** any LLM call that writes durable per-child shelf/plan state MUST be `temperature: 0`. (replan nudge, game-plan/refresh, onboard — all now pinned.)

**Confirmed clean (verified, not just unchecked):** cross-tenant isolation (children/progress/photo-audit/reports/parent/messages/appointments all derive schoolId from JWT + verify ownership — Session-113 work held); tier-gating (every AI report/guidance route funnels through `resolveReportModel` with `free → 402`; the old "6 Sonnet-hardcoded routes" note is resolved); `maxDuration` comprehensive across all ~53 AI routes (the 3 finance flags were false positives — they only read `*_cost_usd` columns).

### Open items from the health check (owed, none blocking)
- **🔧 OPS:** confirm `SUPER_ADMIN_JWT_SECRET` is set in Railway (else super-admin tokens sign with `SUPER_ADMIN_PASSWORD`/`ADMIN_SECRET` fallback — weaker forgery resistance).
- **🟠 correctness (Montree):** `app/api/montree/dashboard/class-progress/route.ts:197` — class-wide `.in('media_id', …)` with no 1000-row pagination → group-photo→child attribution silently truncates on the Class Progress tab in busy classrooms (>1000 media/week). `daily-brief`/`group-lessons` were already paginated; this newer route wasn't.
- **🟡 legacy Whale (low blast radius):** un-escaped `.ilike()` with user input in `app/api/weekly-planning/add-work/route.ts:17` and `app/api/whale/daily-activity/route.ts:152` (2-line escape each).
- **⚪ cosmetic:** dead `lib/montree/reports/ai-generator.ts` with a stale pinned Sonnet string (delete or align); `admin/guru/chat` + `super-admin/guru` use a dated Sonnet pin (`…-20250514`) instead of the `AI_MODEL` alias (drift, both legit Sonnet surfaces, not a tier bypass).

---

## Verify (reopen the PWA first — client-bundle + SW)
1. **Wrap Up** → **Teacher Review** tab sits next to Confirm; Parents › Reports shows only Parent Reports.
2. **Parents** pills read Reports · Chats · Codes.
3. **Guard rail:** on a UTC+8 Sunday the Reports tab default shows the "…is in a later week" banner; **Go to this week →** lands on the week with today's photos.
4. **Replan (the important one):** onboard a **fresh** student → note starter shelf → run Wrap Up / Regenerate All 2–3× → shelf **unchanged**. Then mark one work `mastered` → only that slot advances to the next work in sequence.

## Owed / next
- Deep timezone fix (school-time.ts sweep across the 8 week-calc sites) — the guard rail's real cure.
- Health-check open items above (class-progress pagination + 2 legacy ilike escapes are ~15 min; SUPER_ADMIN_JWT_SECRET is an ops check).
- Full pricing-page two-tier card redesign + re-translate the 2 non-en/zh guard-rail keys (or run `i18n:fill-ui`).
