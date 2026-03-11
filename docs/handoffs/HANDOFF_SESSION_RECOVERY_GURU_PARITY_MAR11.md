# Handoff: Session Recovery + Guru Parity + PWA Fixes — Mar 11, 2026

## Summary

Two-session effort (continued from previous context that ran out). Fixed three issues:

1. **Session persistence** — iOS PWA users had to log in every time they reopened the app
2. **Guru home parent parity** — Reverted misguided "simplification" that stripped capabilities from home parent Guru
3. **PortalChat greeting** — Removed auto-AI-greeting API call, replaced with static i18n greeting
4. **PWA manifest** — Fixed middleware blocking `.json`/`.webmanifest` files

## Changes

### Session Recovery (6 files: 1 new, 5 modified)

**Root cause:** iOS Safari clears localStorage when PWA isn't properly installed or when memory pressure occurs. The app stored session data only in localStorage — once cleared, user appears logged out even though the httpOnly auth cookie (30-day TTL) is still valid.

**Fix:** Cookie-based session recovery pipeline. When localStorage is empty, the app calls `/api/montree/auth/me` which validates the httpOnly cookie and returns full session data to reconstruct localStorage.

**New file:**
- `app/api/montree/auth/me/route.ts` — GET endpoint. Validates httpOnly `montree-auth` cookie via `verifySchoolRequest()`, fetches teacher + school + classroom data from DB, returns structured session response. Uses `.maybeSingle()` for safety.

**Modified files:**
- `lib/montree/auth.ts` — Added `recoverSession()` async function. Calls `/api/montree/auth/me` with `credentials: 'include'`, constructs `MontreeSession` object, calls `setSession()` to persist to localStorage. Returns null on any failure.
- `app/montree/home/[childId]/page.tsx` — Rewrote auth init. Pattern: `getSession()` → if null → `recoverSession()` → if still null → redirect to login. AbortController cleanup on unmount. Converted children fetch from `.then()` to `await`.
- `app/montree/dashboard/page.tsx` — Added `recoverSession()` import. In the `!session` useEffect branch, tries cookie recovery before redirecting to login.
- `app/montree/login-select/page.tsx` — Added auto-redirect if already authenticated. On mount: checks `getSession()` first, then tries `recoverSession()`, redirects to `/montree/dashboard` if either succeeds. Uses `recoveryDone` ref to prevent double-execution.
- `middleware.ts` — Added `.json` and `.webmanifest` to the static file exclusion regex in the matcher config. Without this, the middleware was intercepting `montree-manifest.json` requests.

### Guru Home Parent Parity (3 files modified)

**Background:** Previous session attempted to fix Guru timeout on detailed messages by stripping capabilities from home parent Guru (6 tools instead of 19, 3 memory instead of 5, no deep psychology, 2 tool rounds instead of 4). This was the wrong approach — the real fix was increasing the per-call timeout from 35s to 50s.

**Reverted changes:**
- `app/api/montree/guru/route.ts` — Removed `HOME_PARENT_TOOLS` import, removed `MAX_TOOL_ROUNDS_HOME` constant, removed `memoryLimit` conditional (was 3 for parents, 5 for teachers → now flat 5), removed `effectiveTools`/`effectiveMaxRounds` conditionals. All users now get full `GURU_TOOLS` (12 tools), `MAX_TOOL_ROUNDS` (4), and 5 conversation memory entries. **Kept** the timeout improvement: `API_TIMEOUT_MS = 50_000` (up from 35s).
- `lib/montree/guru/conversational-prompt.ts` — Reverted psychology gating. Deep psychology reference (13 psychologists, ~1,200 tokens) now injected for ALL Sonnet-tier users, not just teachers. Condition changed from `if (isTeacher && (!guruTier || guruTier === 'sonnet'))` back to `if (!guruTier || guruTier === 'sonnet')`.
- `lib/montree/guru/tool-definitions.ts` — Removed dead code: `HOME_PARENT_TOOL_NAMES` set and `HOME_PARENT_TOOLS` export.

### PortalChat Greeting (1 file modified)

- `components/montree/home/PortalChat.tsx` — Removed dead greeting caching functions (`getCachedGreeting`, `cacheGreeting`, `GREETING_TTL`). Greeting is now fully static using i18n keys (`home.portal.greetingWithName` / `home.portal.greetingDefault`). No API call on mount.

## Audit Results

**Cycle 1:** 1 issue found — dead caching functions in PortalChat.tsx. Fixed.
**Cycle 2:** Zero issues across all 10 modified files. TypeScript compilation not possible (VM disk full) but manual audit confirmed zero import errors, zero dangling references, zero broken logic.

## What's NOT in this push

- PWA icons still needed (green square on home screen). `/public/montree-icons/` directory needs icon.svg + 8 PNG sizes. VM disk was full — needs Mac-side generation.
- `{count}m ago` timestamp bug (Priority #2)
- i18n work names not translating to Chinese (Priority #1)

## Deploy

No new migrations. Push from Mac:

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: session recovery + guru parity + portal greeting fix" && git push origin main
```
