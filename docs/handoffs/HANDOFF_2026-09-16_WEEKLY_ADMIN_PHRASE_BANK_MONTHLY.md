# Handoff — Weekly Admin phrase bank, Beijing week anchor, Monthly Summary tab (2026-09-16)

Commits: `96b428bcd`, `9f9dcf7fc`.

## A. Never "No observations" — the phrase bank (`96b428bcd`)

Owner's rule: a weekly summary must NEVER read "No observations were recorded
this week." `lib/montree/tracking/phrase-bank.ts` is the deliberate, approved
exception — on a quiet week it writes two warm, age-banded, observational
phrases from two different developmental domains, EN + 中文 side by side.
Pure and deterministic: seeded by `hash(childId|week)`, so the same
child+week always gets the same phrases, never the same phrase two weeks
running. Auto-fill only fills empty boxes — a teacher's own text is never
overwritten.

To age-band the phrase, `Child` in the tracking layer now carries a `dob`
('YYYY-MM-DD', from `montree_children.date_of_birth`), threaded through
`persistence.ts` and the weekly-admin routes. A child with no DOB on file
falls back to the `unknown`/general 3–6 pool.

If `date_of_birth` isn't there yet (Postgres `42703`, undefined column), the
query retries without it rather than failing — DOB is best-effort, never a
hard dependency. No migration was needed.

## B. Week control: explicit Mon–Fri header, Beijing-anchored week (`9f9dcf7fc`)

The Weekly Admin header now reads "Mon 14 Sep – Fri 18 Sep 2026" instead of a
bare date. `currentWeekStart` is now anchored to `Asia/Shanghai` on BOTH
client and server (`lib/montree/week-key.ts`) — the notes route's old "+8h"
UTC-offset hack is gone, replaced by real timezone-aware week math. The
engine's own window is unchanged: it still computes Mon–Sun internally; only
the display and the anchor moved. The page now reads/writes `?week`, `?tab`
and `?month` URL params, and there's a "This week" button to jump back to
today's week.

## C. Monthly Summary tab, ledger-based, English only (`9f9dcf7fc`)

The Monthly tab is now live on `app/montree/dashboard/weekly-admin-docs/page.tsx`
— the page teachers actually open. Correction: that page never rendered
`WeeklyAdminTab.tsx`'s Monthly tab at all; the old Monthly tab only ever
existed inside `WeeklyAdminTab`, mounted on the Photo Audit page. So this is
a new, standalone `MonthlySummaryPanel.tsx`, not a fix — the old one is
untouched.

`monthlyLanguageSummary()` (`lib/montree/tracking/monthly-summary.ts`) builds
one professional Montessori sentence per child straight from the tracking
ledger (rule 3's source of truth, not photos): Language-area work only,
status at the start of the month vs. the end, top 3 works by
frequency/recency/label, ≤ 35 English words. A child with no Language work
that month gets a SPEAKING-domain phrase from the phrase bank rather than
"no observations." **PURE ENGLISH by explicit owner instruction (2026-09-16)
— no Chinese anywhere in this tab.** Auto-fill fills empty boxes only, and
saves `english_text` into `montree_weekly_admin_notes` with
`doc_type='monthly'`. No schema migration was required.

## Owner rules to carry forward

- Never write "No observations" — quiet periods get an honest, generic, warm
  phrase instead, never invented progress or a work that wasn't done.
- Monthly Summary = one professional Montessori sentence on the child's
  English/Language focus and progress, grounded strictly in recorded work
  status transitions.
- Monthly Summary is English only — no Chinese without a new instruction.

## Open items / caveats

- No-DOB children get the general/unknown 3–6 pool; owner should backfill DOBs.
- New UI labels (week header, "This week" button, Monthly tab) are English-only.
- Phrase bank's no-repeat check replays ~O(weeks since 2024) per call — fine
  now, revisit if it shows up in profiling.
- Monthly Summary `.docx` export is English only, matching the tab.
- Not yet verified by the owner against real Whale Class data after deploy.

## Tests

199/199 passing across 15 files at push time. Re-run with:

```
npm run test
# or targeted:
npx vitest run tests/tracking/phrase-bank.test.ts tests/tracking/phrase-bank.samples.test.ts
npx vitest run tests/tracking/monthly-summary.test.ts tests/week-key.test.ts
```
