# PLAN — OPTIMAL-GAPS CLOSE-OUT (Jul 17, 2026) — BINDING CONTRACT

**Author: Fable (director). Builder: Opus. Auditor: Sonnet. Final gate: Fable reads the full diff
before push.** Context: Fable's Jul-17 full health check found the system 🟢 healthy with one real
bug + four below-standard spots. Demos and live trials are imminent — this build is deliberately
scoped to the FIVE zero-blast-radius fixes ONLY. The two risky items (lock-check in
verifySchoolRequest, the 8-site timezone week-calc fix) are EXPLICITLY DEFERRED until after the
trials. Do not touch them.

## 🚨 GROUND RULES (violating any of these fails the build)

1. **Touch ONLY the files named in items A–E.** No drive-by refactors, no formatting sweeps, no
   "while I'm here" fixes. If you believe something else is broken, REPORT it, don't fix it.
2. **The Founding-Sunset build is in flight in this working tree (separate session).** FORBIDDEN
   files: `app/montree/page.tsx`, `app/pricing/page.tsx`, `components/montree/FoundingHundred.tsx`,
   `components/montree/super-admin/FoundingTab.tsx`, `app/montree/super-admin/page.tsx`, all 12
   `lib/montree/i18n/*.ts` locale files, `app/api/montree/super-admin/outreach/route.ts`, and
   `app/api/montree/super-admin/founding/route.ts`.
3. **Before editing ANY file, check `git status --porcelain -- <file>`. If it shows as modified
   (M), SKIP it and report the skip.** Another session owns that dirt. (Exception: none.)
4. **No new dependencies. No migrations. No i18n keys.** Every fix here is server-side logic.
5. Per-file gate: **eslint 0 errors on every touched file** (pre-existing warnings tolerated,
   no new warnings).
6. NEVER weaken: HAIKU_TRUST_CONFIDENCE, the 0.90 Gate-A bar, the Montessori shelf invariant,
   any rate limit, any auth check.

## Item A — apply-shelf shelf-invariant fix (THE bug)

File: `app/api/montree/weekly-review/[childId]/apply-shelf/route.ts`

A1. Add `temperature: 0` to the `anthropic.messages.create` call (~line 75). This call's output
    drives durable per-child shelf state — the Jul-5 rule applies.

A2. Replace the `montree_child_progress` **upsert** block (~lines 139–152, the one with
    `onConflict: 'child_id,work_name'` and `status: 'not_started'`) with a call to the canonical
    seeder:

    ```ts
    import { seedRecommendedWork } from '@/lib/montree/progress/seed-recommended-work';
    // ...
    await seedRecommendedWork({ supabase, childId, workName, area: rec.area });
    ```

    Signature verified by Fable: `seedRecommendedWork({ supabase, childId, workName, area })` —
    inserts `not_started` ONLY if no row exists; an existing presented/practicing/mastered row is
    left completely alone. This closes the downgrade bug (the upsert was resetting advanced rows
    to `not_started`).

A3. Do NOT touch: the `montree_child_focus_works` upsert (teacher-initiated slot set — intended),
    the guru-reasoning settings write, the validation/skip logic, the response shape. The
    `applied[]` entries keep reporting `status: 'not_started'` (display-only; fine).

## Item B — crypto-safe credential codes

B1. NEW helper `lib/montree/secure-code.ts`:

    ```ts
    import { randomBytes } from 'crypto';
    const DEFAULT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    export function generateSecureCode(length = 6, alphabet = DEFAULT_ALPHABET): string { ... }
    ```

    Use rejection sampling (discard bytes ≥ the largest multiple of alphabet.length) so there is
    NO modulo bias. Pure, synchronous, no deps.

B2. Swap `Math.random()`-based code generation for `generateSecureCode()` ONLY where the value is
    a **credential**: login codes, signup/invite codes, access codes, referral codes. Candidate
    files (VERIFY each call site before swapping — if the Math.random is a ref id, filename,
    cache-buster, or jitter, LEAVE IT):

    - `app/api/montree/admin/teachers/route.ts` (6-char login code — confirmed by Fable)
    - `app/api/montree/classroom/teachers/route.ts`
    - `app/api/montree/invite-principal/route.ts`
    - `app/api/montree/super-admin/principals/route.ts`
    - `app/api/montree/teacher/register/route.ts`
    - `app/api/montree/try/instant/route.ts`
    - `app/api/montree/super-admin/agent-applications/[id]/accept/route.ts`
    - `app/api/montree/onboarding/route.ts`
    - `app/api/montree/principal/setup/route.ts` + `setup-stream/route.ts`

    Preserve each site's exact alphabet + length (most use the no-0/O/1/I 32-char set, 6 chars).
    If a site's alphabet differs, pass it as the parameter — do NOT normalize alphabets.

B3. `app/api/montree/super-admin/founding/route.ts` is FORBIDDEN this round (rule 2). Report it
    as a known remaining Math.random credential site for the next session.

## Item C — `.ilike()` escape sweep

Apply the house escape to the user/db-supplied term before interpolation into `.ilike()`:
`term.replace(/[%_\\]/g, '\\$&')`. Escape the SEARCH TERM only, never the surrounding `%` wildcards.

Files (all 10; skip any that rule 3 flags dirty):
- `app/api/montree/visitors/route.ts`
- `app/api/montree/dashboard/parent-chats/[parentId]/draft-reply/route.ts`
- `app/api/montree/super-admin/health/route.ts`
- `app/api/montree/parent/home-practice/route.ts`
- `app/api/weekly-planning/add-work/route.ts`
- `app/api/whale/daily-activity/route.ts`
- `lib/montree/guru/post-conversation-processor.ts`
- `lib/montree/calendar/resolve-scope.ts`
- `lib/montree/admin/guru-executor.ts`
- `lib/montree/voice/observation-analyzer.ts`

If a site's ilike argument is a hardcoded constant (no external input), leave it and note it.

## Item D — rate-limit public community-works submission

File: `app/api/montree/community/works/route.ts` — POST handler only (GET untouched).
Add `checkRateLimit` from `@/lib/rate-limiter` at the top of POST: 5 submissions / 15 min per IP,
FAIL-OPEN (a limiter outage must not break submission), 429 with `retryAfterSeconds` on limit.
Mirror the pattern in `app/api/montree/onboarding-copilot/ask-public/route.ts` exactly.

## Item E — temperature pins on durable-state writers

For each file below: READ it, and pin `temperature: 0` ONLY on model calls whose output is
**persisted to DB rows** (works, visual memory, structured extractions). If a call only produces
conversational/display text, leave it untouched and note why. Expected: most of these get the pin.

- `lib/montree/photo-identification/enrich-custom-work.ts` (writes visual memory — sibling of the
  corrections enrichment that was pinned Jul 5)
- `app/api/montree/onboarding/voice/custom-work/route.ts`
- `app/api/montree/onboarding/voice/scan-custom/route.ts`
- `app/api/montree/guru/photo-insight/add-custom-work/route.ts`
- `lib/montree/guru/work-enrichment.ts`
- `lib/montree/voice-notes/extraction.ts`

## Deliverables

1. The diff (all touched files), `git diff --stat` summary.
2. Per-item completion table: done / skipped-dirty / left-with-reason.
3. eslint results per touched file.
4. The B3 + any skip reports.
5. NO commit — Fable reviews the raw diff first, then commits+pushes scoped via Desktop Commander.

## Deferred (do NOT build, listed so nobody "helpfully" adds them)

- locked_at check in verifySchoolRequest (hot-path — post-trials, own contract)
- 8-site getCurrentMonday timezone fix (own session + device verification)
- class-progress 1000-row pagination, guru shelf-fill early-stop (post-trials)
