# Fixes applied — 2026-06-10
Follow-up to `AUDIT_2026-06-10.md`. These are the items I could safely fix in code without a build to test against. Each is surgical and mirrors existing patterns in the codebase. **Nothing here is committed or deployed** — review, then push when you're ready (Railway auto-deploys on push to main).

## Done in code
1. **Leaked production service-role key — removed from repo.** Deleted `scripts/_query_focus_diag.mjs`, `_diag2.mjs`, `_diag3.mjs` (the only 3 files containing the hardcoded key; verified by literal search). **⚠️ This alone is not enough — you must still (a) rotate the service-role key in the Supabase dashboard, and (b) purge it from git history (BFG or `git filter-repo`), because it's already in past commits / on GitHub.**

2. **RLS lockdown for the 3 exposed tables.** New migration `migrations/2026-06-10_rls_lockdown_newer_tables.sql` enables default-deny RLS on `montree_parent_deletion_audit`, `montree_child_learning_state`, `montree_principal_conversations` — mirrors your 2026-06-06 lockdown exactly (service-role bypasses RLS, so app behaviour is unchanged). **Run it in the Supabase SQL editor**, then extend `scripts/probe-rls.mjs` to confirm.

3. **Closed the two open-write IDOR routes.**
   - `principal/register` now logs the principal in (mints token + sets the `montree-auth` cookie) so the follow-on setup call is authenticated.
   - `principal/setup` and `principal/setup-stream` now require a valid session and reject any `schoolId` that isn't the caller's own (was fully open to the internet).
   - `onboarding/students` now requires a session and rejects classrooms outside the caller's school.
   - All four signup entry points (`try/instant` for teacher/principal/homeschool, plus `principal/register`) set the cookie before these pages are reached, so the happy path is unaffected.

4. **Opus AI cost is now metered.** Added `claude-opus-4-6` / `claude-opus-4` price rows to `lib/montree/api-usage.ts` (was missing → Astra's Opus calls silently billed at the Sonnet fallback rate and under-reported in the AI budget + P&L).

5. **Astra `internalGet` now has a 30s timeout.** Its most-used tools (find_children, briefings, photos) could previously hang the SSE response with no error. Added the same AbortController the mutation helpers already had; hoisted `INTERNAL_TIMEOUT_MS` so it's declared once for all three.

6. **The fake "Send to all parents" video button no longer lies.** It used to fake a 2s delay then alert "Videos sent to all parents!" — now it says the feature isn't available yet. (The whole videos/preview page is still non-functional — `/api/montree/videos/generate` doesn't exist — but it no longer claims success.)

## Still needs you (can't be done from code)
- **Rotate the Supabase service-role key** + purge git history (item 1).
- **Run the RLS migration** (item 2) in Supabase.
- **Push + let Railway build** to confirm lint/tsc pass (the Linux sandbox is down and npm can't run on the Mac, so I couldn't build locally — all changes were kept minimal and pattern-matched to existing code to de-risk this).

## Deliberately NOT touched (flagged for a focused session)
- Games hub losing all progress (`/api/games/*` doesn't exist) — needs a new endpoint + table, too invasive to do blind.
- ~25 routes bypassing the hardened Supabase client — mechanical sweep, but wide; do it in one reviewed pass.
- The dead `app/admin/*` / `app/teacher/*` legacy tree (~17 deleted API families) — delete-or-guard decision is yours.
- `checkAiBudget` on the principal-agent route, the two-service-worker conflict, and the remaining hairpin self-fetch in `weekly-planning/upload`.
