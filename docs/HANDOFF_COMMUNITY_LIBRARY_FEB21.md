# Handoff: Community Montessori Works Library (Feb 21, 2026)

## What Was Built

A public, community-driven Montessori works library where teachers browse, share, and inject works into their Montree classrooms. No login required to browse — teachers use their 6-char code to "Send to Classroom".

## Architecture

- **Public pages** (`/montree/library/*`): Browse, detail view, upload form — no auth required
- **API routes** (`/api/montree/community/*`): works CRUD, inject, AI guide generation, backup, seed
- **Admin panel** (`/montree/super-admin/community`): Moderation (approve/reject/flag), AI guide generation, backup, seed
- **Database**: `montree_community_works` + `montree_community_backups` tables (migration 132)
- **Storage**: Photos/videos/PDFs in Supabase Storage `montree-media` bucket under `community/` prefix

## Files Created (14 new)

### Database
- `migrations/132_community_works.sql` — Main table (30+ columns), backups table, 7 indexes, `updated_at` trigger

### API Routes (7)
- `app/api/montree/community/works/route.ts` — GET (browse with filters/pagination) + POST (create via FormData)
- `app/api/montree/community/works/[id]/route.ts` — GET (detail) + PATCH (admin edit) + DELETE (admin delete with storage cleanup)
- `app/api/montree/community/works/[id]/inject/route.ts` — POST: Teacher code → auto-seed areas → duplicate check → insert into classroom curriculum
- `app/api/montree/community/works/[id]/guide/route.ts` — POST: Admin-triggered AI guide generation (Claude Haiku)
- `app/api/montree/community/backup/route.ts` — POST: Daily JSON backup to Supabase Storage, keeps last 30
- `app/api/montree/community/seed/route.ts` — POST: Pre-seed 329 standard curriculum works from static JSON

### UI Pages (5)
- `app/montree/library/page.tsx` — Public browse with area tabs, search, sort, pagination, inject modal
- `app/montree/library/[workId]/page.tsx` — Work detail with photo gallery, lightbox, AI guide display, inject modal
- `app/montree/library/upload/page.tsx` — Upload form (contributor info, work details, photos/videos/PDFs)
- `app/montree/library/layout.tsx` — Simple pass-through layout
- `app/montree/super-admin/community/page.tsx` — Admin moderation panel (password-gated)

### Modified (1)
- `app/montree/super-admin/page.tsx` — Added Community Library link button

## Security Audit (2 Full Passes)

### Audit 1 — 10 issues found and fixed:
1. **CRITICAL**: `verifySuperAdminPassword()` returns `{ valid, error }` not boolean — was truthy-always-pass in 4 routes → fixed to `.valid`
2. **CRITICAL**: `increment_view_counts` RPC didn't exist (browse API) → replaced with direct updates
3. **HIGH**: Search SQL injection via `.or()` interpolation → sanitized special chars + 100-char cap
4. **HIGH**: Admin bypass via `?admin=true` query param on detail GET → requires `x-admin-password` header
5. **HIGH**: Non-approved works browsable via `?status=pending` without auth → requires admin password
6. **HIGH**: `detailed_description` unbounded → 10,000 char server-side validation
7. **MEDIUM**: Variations/extensions stored as `{ description: v }` objects but rendered as strings → type-aware rendering
8. **MEDIUM**: No `updated_at` trigger → added PostgreSQL trigger to migration
9. **LOW**: Unnecessary `areaKeyMap` in seed → removed
10. **LOW**: Admin panel not sending password header on fetch → fixed

### Audit 2 — 4 additional issues found and fixed:
1. **HIGH**: `age` filter interpolated into `.or()` — same injection vector as search → validate against `VALID_AGES` whitelist
2. **HIGH**: No file size validation on server POST → added 10MB photo / 50MB video / 20MB PDF limits
3. **MEDIUM**: File extensions from user filenames not sanitized → `sanitizeExt()` strips to alphanumeric, max 5 chars; PDF filenames also sanitized
4. **MEDIUM**: Backup `select('*')` hits Supabase 1000-row default limit → paginated fetch loop

### Accepted Low-Risk Items:
- View/inject count race conditions (tolerated for non-critical stats)
- 24 UPDATE queries per browse for view counts (fire-and-forget, non-blocking)
- No rate limiting on inject endpoint (limited risk — worst case adds unwanted works)
- Admin page shows UI shell before password validation (API validates server-side)

## Key Patterns

### "Send to Classroom" (inject) Flow:
1. Public user enters 6-char teacher code (case-insensitive via `.ilike()`)
2. Find teacher → get classroom_id
3. Auto-seed all 5 curriculum areas if classroom has none
4. Check for duplicate by title match
5. Insert with `work_key: 'community_${communityWork.id}'`, `is_custom: true`
6. Increment inject_count on community work

### Seed Flow:
- Loads all 329 works from `loadAllCurriculumWorks()` (static JSON)
- Skips existing by `standard_work_id` match
- Batched inserts of 50
- Auto-approved with `contributor_name: 'Montree Standard Curriculum'`
- Variations/extensions mapped to `{ description: v }` object format

### Auth Pattern:
- Browse/detail: Public (no auth for approved works)
- Non-approved status queries: Require `x-admin-password` header
- Create (upload): Public (new works go to `pending` status)
- Admin actions (PATCH/DELETE/guide/backup/seed): Require `x-admin-password` header → `verifySuperAdminPassword().valid`

## Deploy Steps

1. **Run migration 132:**
   ```bash
   psql $DATABASE_URL -f migrations/132_community_works.sql
   ```

2. **Push to main** for Railway deploy

3. **Seed the library** from admin panel:
   - Go to `/montree/super-admin/community`
   - Enter super admin password
   - Click "Seed 329 Works"

4. **Verify:**
   - Browse at `/montree/library` — should show 329 works
   - Test search, area filter, age filter
   - Test "Send to Classroom" with a real teacher code
   - Test upload form → check it appears as "pending" in admin
   - Test admin approve/reject/flag
   - Test AI guide generation on one work

## What's NOT Done

- No download tracking (download_count exists but no endpoint increments it yet — PDFs open in browser tab)
- No contributor profile pages
- No commenting/rating system
- No "Report this work" public flag button
- No email notifications to contributors when work is approved/rejected
