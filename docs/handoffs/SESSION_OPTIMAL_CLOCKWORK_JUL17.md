# SESSION — Jul 17–18, 2026 (Cowork/Fable directing Opus+Sonnet) — FULL HEALTH CHECK → OPTIMAL: 5 SHIPPED BUILDS (safe-five · lock+pagination · week-keys · guru+parent-lock · friction+cosmetics)

**Canonical contracts: `PLAN_OPTIMAL_GAPS_JUL17.md` + `PLAN_HOT_PATHS_JUL17.md` +
`PLAN_FRICTION_COSMETICS_JUL17.md` (all committed). This block is the CLAUDE.md session entry —
CLAUDE.md itself was dirty from a concurrent session, so the block lives here; fold it in when
CLAUDE.md is free.** Every build ran the sacred flow: Fable contract → Opus build → Sonnet
adversarial audit → Fable line-by-line diff review → scoped DC push. Fable personally read every
shipped line across all 5 commits.

## The 5 commits (all pushed, Railway auto-deploys)
1. **`4c722972` — Safe five:** apply-shelf invariant fix (upsert was DOWNGRADING advanced
   progress rows to not_started + Sonnet at temp 1.0 picking works — now seedRecommendedWork +
   temp 0) · NEW `lib/montree/secure-code.ts` (crypto randomBytes, rejection-sampled) swapped
   into all 10 credential-code sites (retry paths regenerate; per-site alphabets preserved) ·
   7 `.ilike()` escapes · community/works POST rate-limited 5/15min fail-open · temp:0 pinned
   on all 6 durable-state AI writers (enrich-custom-work, voice custom-work/scan-custom,
   add-custom-work, work-enrichment, voice-notes extraction).
2. **`7d4dfaaa` — Hot-path Phase 1:** NEW `lib/montree/school-lock.ts` — abuse lock now enforced
   on LIVE sessions via `verifySchoolRequest` (60s in-process cache incl. negatives, FAIL-OPEN,
   agent role exempt, 403 code:'school_locked'; super-admin lock/unlock PATCH invalidates).
   Class-progress junction query paginated (.range loop, stable .order, error-bail — never
   silent-partial). 18/18 harness (real compiled modules).
3. **`f05f5dad` — Hot-path Phase 2 (week keys):** NEW `lib/montree/week-key.ts` = THE canonical
   client week-key helper (LOCAL date parts, never toISOString — east-of-UTC devices were
   writing SUNDAY keys). All 5 client producers migrated (WeeklyWrapTab, WeeklyAdminTab,
   weekly-admin-docs, BatchNarrativesCard, WeeklyWrapCard) + weekly-wrap page default. 🚨 AUDIT
   CATCH OF THE DAY: 3 legacy server routes (reports/send, /photos, /preview) wrote SUNDAY-
   anchored keys BY DESIGN (old US convention) — migration would have corrupted their rows.
   All three moved to school-local Monday via `school-time.ts` (`currentWeekStartInTz`);
   photos' week_end==week_start bug fixed. **Migration 298** normalizes historical Sunday rows
   (idempotent NOW that no writer emits Sunday; NOT-EXISTS dup guards; never deletes).
   🚨 RULE: week keys come from week-key.ts (client) / school-time.ts (server) ONLY — never
   hand-roll a getCurrentMonday again. DashboardHeader coupling comment was STALE (no date code
   there).
4. **`a267c340` — Build C:** guru shelf-fill fixed — `MAX_TOOL_ROUNDS` 3→8 (55s wall still
   bounds it), honest partial-completion fallback in BOTH loops (no more false "Done!" at 2/5
   areas), additive TEACHER_SETUP_MODE line forbidding update_progress on starter works,
   set_focus_work routed through canonical seedRecommendedWork. Parent lock gap closed:
   access-code + parent/login mint-paths 403 locked schools (after credential verify — no
   lock oracle). verify-parent-request deliberately untouched (per-request parent enforcement
   = explicit deferral; parent cookies now cap the exposure anyway).
5. **`6fc643fe` — Friction pass (Build D):** NEW hourly cron `api/montree/cron/engagement`
   (x-cron-secret fail-closed) = trial lifecycle emails (d5 warning / expired / d14 winback,
   Fable-authored doctrine-compliant copy, send-once ledger, excludes locked/founding/override/
   comped, owner_email→principal fallback, cap 50) + Friday 14:00–16:59 school-local
   report-ready push (week-keyed ledger, only burns slot when sent>0, locked excluded, cap
   100) · report READ RECEIPTS (`first_opened_at` stamped once on parent view; "Seen {date}"
   on the Parents-tab child cards; 2 i18n keys ×12) · parent session parity — ALL 4 parent
   cookie sites now 10y like teachers (audit caught the 4th: auth/unified QR path).
   **Migration 300** (`300_engagement.sql` — contract said 299 but 299 was taken by another
   session's demo_meetings). i18n note: the 12 locale files carried the concurrent
   founding-sunset session's uncommitted keys — they rode along (additive, harmless).
6. **`588365ab` — Cosmetics pass (Build E):** principal/register + teacher/register (the
   /welcome/[code] cold-email landing!) reskinned pre-Lanternlight-teal → Lanternlight
   (STYLES ONLY — logic byte-identical, independently audited) · decorative gradients/glows
   killed across ~25 files (flat emerald buttons) · ONE overlay elevation token
   `0 8px 32px rgba(0,0,0,0.45)` (DashboardHeader ×4, modals, floats) · gold NEVER glows
   anywhere now (TracyFloat/MiraFloat rings → 1px gold hairline borders) · safe-area gaps
   closed (capture overlay + admin student page) · missed admin student-detail page
   dark-registered · parent portal parity (teal remnants→emerald, hairline 0.18→0.15, rem→px
   radii, weekly-review sticky header). DELIBERATELY untouched: state-encoding glows
   (present-avatar ring, photo-audit selection ring, guide pulses), parent/account (stays
   light per Jul-16 ruling), games, print/paper.

## ⏳ OWED — TREDOUX (in order)
1. **Migration 298** (week keys — run AFTER f05f5dad deployed; SQL in chat).
2. **Migration 300** (engagement tables; SQL in chat).
3. **Railway env `CRON_SECRET`** (any long random string) if not already set.
4. **ONE cron-job.org job:** POST `https://montree.xyz/api/montree/cron/engagement`, hourly,
   header `x-cron-secret: <CRON_SECRET>`.
5. **Device walk** (~10 min): login → capture → confirm → shelf → report preview; report date
   range reads Monday–Sunday; Guru fills a fresh child's shelf 5/5 areas all not_started;
   eyeball the reskinned /montree/principal/register + /montree/teacher/register + the
   dark admin student page; Seen/Not-seen line on Parents tab.
6. DC-delete: `tsconfig.buildD.tmp.json` (gitignored) + the older temp tsconfig/tsbuildinfo
   litter + `scripts/mvgen/__pycache__/`.

## ⏳ Parked (documented, deliberate — none school-affecting)
- founding route Math.random codes → swap to generateSecureCode AFTER the founding-sunset
  session lands (its file was forbidden all day).
- secure-code.ts >256-char-alphabet guard (unreachable today).
- RAZ + meeting-date DAY-key local→UTC serializations (same bug class as week keys, separate
  surfaces — future sweep).
- Per-request parent lock enforcement (login-time closed; 10y parent cookies now make
  per-request worth revisiting — needs school_id in the resolver's select).
- Push i18n (Friday nudge is hardcoded EN).
- Guru streaming path's cut-short flag is structurally always-true where checked (dead "Done!"
  branch there — cosmetic, non-streaming discriminates correctly).
- Weekly-wrap teacher UI `<pre>` error rendering could overflow on long errors (cosmetic).
- parent/account light-vs-dark outlier: flagged to Tredoux, awaiting his call.

## 🚨 Rules earned this session
- A data migration's premise ("X can only come from bug Y") must be checked against EVERY
  live writer — the Sunday-key CRIT was caught only because the auditor traced all writers.
- Concurrent-session discipline: scoped `git add` lists ONLY, never `-A`; check
  `git status --porcelain` per file before editing; never edit CLAUDE.md while another
  session holds it dirty; auditors must NEVER `git stash` on the shared tree.
- Send-once ledgers record ON SUCCESS only, and "success" for push means sent>0 (zero
  registered devices must not burn the slot).
