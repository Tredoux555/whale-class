# Handoff: Production Deploy + Community Seed Fix — Feb 21, 2026

## What Was Done

### 1. Full Production Deploy (69 files)
Pushed all local changes accumulated since last deploy to `main` via GitHub REST API. Railway auto-deployed.

**Files pushed:** 37 modified + 32 new (community library, onboarding guides, security fixes, aesthetic changes, Guru daily coach, folder cleanup)

**Dockerfile fix (5 iterations):**
- `npm ci` → EBADPLATFORM for ARM64 optional deps (`lightningcss-linux-arm64-gnu`, `@tailwindcss/oxide-linux-arm64-gnu`)
- `npm ci --ignore-optional` → same error (npm 10.x treats as hard error)
- `npm ci --force` → lockfile sync error (package.json updated but lockfile stale)
- `npm install --legacy-peer-deps` → same EBADPLATFORM
- **Final fix:** `rm -f package-lock.json && npm install --force` — deletes ARM64-tainted lockfile, force-installs fresh

### 2. Migrations Confirmed
Migrations 131 (onboarding) and 132 (community works) were already run in production Supabase — all tables exist.

### 3. Seed Route Fix (500 Error)
**Root cause:** `points_of_interest` field in curriculum guide data is a **string** on some works, not an array. Code called `.forEach()` on it → `e.points_of_interest.forEach is not a function`.

**Fix (commit `41bf0c18`):**
- `points_of_interest`: Added `Array.isArray()` check, wraps strings in array
- `common_challenges`: Same fix
- `variations`: Changed from `(work.variations || []).map(...)` to `(Array.isArray(work.variations) ? work.variations : []).map(...)`
- `extensions`: Same fix
- Added detailed error logging (error message + stack trace in response) for admin-only endpoint
- Admin UI (`community/page.tsx`) now displays full error detail + stack, 15s timeout instead of 5s

### 4. Git Push Infrastructure
**Root cause of push failures:** Cowork VM has intermittent TLS handshake drops to `api.github.com`. Not fixable at VM level — the VM's network randomly drops SSL connections mid-handshake.

**Solution:** Created `scripts/push-to-github.py` — reusable push script using GitHub REST API with:
- Automatic retry (5 attempts, exponential backoff)
- Proper SSL context handling
- Handles large files via base64 blob creation
- Single-commit multi-file pushes

**Usage:**
```bash
GITHUB_PAT=xxx python3 scripts/push-to-github.py "commit message" \
  "repo/path/file.ts" "local/path/file.ts" \
  "repo/path/file2.ts" "local/path/file2.ts"
```

**Important pattern:** The GitHub REST API push flow is:
1. GET ref → HEAD SHA
2. GET commit → tree SHA
3. POST blobs (one per file, base64)
4. POST tree (with base_tree + new blobs)
5. POST commit (message + tree + parents)
6. PATCH ref (point main to new commit)

If step 6 fails on TLS but step 5 succeeded, the commit exists on GitHub — just retry step 6.

## Files Created/Modified

| File | What |
|------|------|
| `scripts/push-to-github.py` | **NEW** — Reusable GitHub push script with retry logic |
| `app/api/montree/community/seed/route.ts` | Fixed non-array crash + detailed error logging |
| `app/montree/super-admin/community/page.tsx` | Shows full error detail in admin UI |
| `Dockerfile` | `rm -f package-lock.json && npm install --force` |

## Commits Pushed This Session

| SHA | Message |
|-----|---------|
| `72c6df75` | Full 69-file deploy (community library, guides, security, aesthetic, guru, cleanup) |
| Various | Dockerfile iterations (5 commits fixing npm install) |
| `29a69180` | Add detailed error logging to seed route |
| `f6186281` | Show detailed seed error in admin UI |
| `41bf0c18` | Fix non-array points_of_interest/common_challenges in seed route |

### 5. Curriculum Sequence Ordering
**Problem:** Seeded works displayed in random DB insertion order, not Montessori curriculum sequence.

**Attempted:** Adding `curriculum_sequence` DB column via `pg` (node-postgres) — failed because Railway's IPv6 network can't reach Supabase's direct PostgreSQL endpoint (`ENETUNREACH`).

**Solution:** In-memory sort using the same `loadAllCurriculumWorks()` that powers the classroom system. The API builds a `work_key → sequence` map at module load time, fetches all matching works, sorts them in memory, then paginates. No DB column needed.

**How it works:**
- `loadAllCurriculumWorks()` returns works in curriculum order with `sequence` = `area * 10000 + category * 100 + work`
- API caches the map once (`_sequenceMap` singleton), sorts by it when `sort=curriculum`
- Default sort changed from `newest` to `curriculum` on both API and frontend
- Community-contributed works (no `standard_work_id`) sort to the end

| SHA | Message |
|-----|---------|
| `89f2c69f` | feat: add curriculum sequence ordering to community library |
| `563247f0` | fix: use in-memory curriculum sort instead of DB column |

## Current State

- **Railway:** Deploying commit `563247f0` — in-memory curriculum sort
- **Seed:** 329 works seeded successfully
- **Library:** Defaults to "Curriculum Order" sort — same sequence as classroom
- **Push script:** `scripts/push-to-github.py` working with automatic TLS retry
- **Migrations:** 131 + 132 confirmed in production

## Next Steps

1. Verify curriculum ordering on `/montree/library` after deploy
2. Continue with Priority #1: Cross-pollination security fix for remaining routes
3. Test onboarding guides on mobile (Priority #2)
