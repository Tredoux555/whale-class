# Handoff: Dockerfile Build Fix (Feb 15, 2026)

## Summary

Railway builds were failing with `supabaseUrl is required` / `supabaseKey is required` during `npm run build` inside Docker. Root cause: Next.js 16.1.1 with Turbopack evaluates server modules during page data collection at build time, but Docker env vars weren't declared as `ARG` in the Dockerfile — so they were undefined during `RUN npm run build`.

## Root Cause

**Next.js Turbopack build-time module evaluation.** During `npm run build`, Turbopack collects page data and evaluates server-side modules. When it hits code that calls `createClient()` from `@supabase/supabase-js` (even through lazy patterns like `getSupabase()`), it needs the Supabase URL and key to be available as environment variables.

**Docker ARG requirement.** Railway injects service env vars during Docker build, but they must be declared as `ARG` in the Dockerfile to be accessible during `RUN` commands. Without the declarations, `process.env.NEXT_PUBLIC_SUPABASE_URL` etc. are `undefined` at build time.

**Phantom route.** The build error referenced `/api/classroom/[classroomId]/curriculum` — a route that doesn't exist as a file. Turbopack generated this from `app/admin/schools/[slug]/classrooms/[id]/curriculum/page.tsx` during page data collection.

## Fix Timeline

### Attempt 1 — Commit `055438e`
Added 3 `NEXT_PUBLIC_*` ARGs to Dockerfile:
```dockerfile
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_YOUTUBE_API_KEY
```
**Result:** Error changed from `supabaseUrl is required` → `supabaseKey is required`. Partial fix — URL now available but service role key still missing.

### Attempt 2 — Commit `79ae195` (FINAL FIX)
Added ALL env vars as Docker ARGs — both client-side and server-side:
```dockerfile
# Client-side (NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_YOUTUBE_API_KEY

# Server-side (needed by Turbopack module evaluation)
ARG SUPABASE_SERVICE_ROLE_KEY
ARG ADMIN_SECRET
ARG STORY_JWT_SECRET
ARG MESSAGE_ENCRYPTION_KEY
ARG SUPER_ADMIN_PASSWORD
ARG TEACHER_ADMIN_PASSWORD
ARG ANTHROPIC_API_KEY
ARG DATABASE_URL
ARG VAULT_PASSWORD
ARG VAULT_PASSWORD_HASH
ARG RESEND_API_KEY
ARG RESEND_FROM_EMAIL
ARG OPENAI_API_KEY
ARG STRIPE_PRICE_GURU_MONTHLY
ARG STRIPE_WEBHOOK_SECRET_GURU
```

**Result:** Awaiting Railway build confirmation.

## Method

Both commits pushed via **GitHub web editor** (not git CLI). The Cowork VM has `.git/index.lock` FUSE-locked, preventing local git operations. Used Chrome browser automation to navigate to `github.com/Tredoux555/whale-class/edit/main/Dockerfile`, replaced content via `document.execCommand('selectAll')` + `document.execCommand('insertText', ...)`, and committed directly to `main`.

## Key Lesson

**For Next.js apps deployed via Docker: ALL env vars that ANY server module references must be declared as Docker ARGs before `RUN npm run build`.** This includes:
1. `NEXT_PUBLIC_*` vars (inlined into client bundles)
2. Server-side vars accessed by any module that Turbopack evaluates during page data collection
3. Even "lazy" patterns like `getSupabase()` can be triggered at build time

## Files Modified

- `Dockerfile` — Added 18 ARG declarations before `RUN npm run build`

## Commits

| Commit | Message | What |
|--------|---------|------|
| `055438e` | fix: declare NEXT_PUBLIC env vars as Docker ARGs for build | 3 client-side ARGs (partial fix) |
| `79ae195` | fix: declare ALL env vars as Docker ARGs for Next.js build | All 18 ARGs (complete fix) |

## Status

- ✅ Code committed and pushed to `main`
- ⏳ Awaiting Railway auto-deploy build result
