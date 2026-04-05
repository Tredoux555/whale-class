# Handoff: Haiku Test Tab, Weekly Admin Feature Gate, Story Upload Limits (Apr 4, 2026)

## Summary

Three features in one commit, plus a migration.

**Feature A: Haiku Test Tab in Photo Audit**
New diagnostic tab in `/montree/dashboard/photo-audit` that runs Haiku two-pass analysis without Sonnet fallback. Shows Pass 1 ("What AI Sees" — visual description) and Pass 2 (curriculum match result) for each photo. Helps teachers evaluate whether the AI has learned their classroom's works.

**Feature B: Weekly Admin Docs Feature-Gated**
The existing weekly admin documents system (`/montree/dashboard/weekly-admin-docs`) is now gated behind the `weekly_admin_docs` feature flag. Can be toggled per-school from super-admin ⚙️ gear button. Seven touch points gated: dashboard card, page redirect, and 5 API routes (generate, notes GET/POST, auto-fill GET, child weekly-admin GET/POST).

**Feature C: Story Video Upload Limits Increased**
All Story video upload paths increased from 100MB → 300MB max file size and 180s → 300s (5 min) client timeouts. Covers user story page, admin send route, upload-media server route, and admin message hook.

## Commit

- `3b4e1423` — All three features in one push

## Migration

**Migration 161 (`migrations/161_enable_weekly_admin_docs.sql`) — ✅ RUN (Apr 4, 2026):**
Enables `weekly_admin_docs` feature for Whale Class (Tredoux House, school `c6280fae-567c-45ed-ad4d-934eae79aabc`). Run via Supabase JS client upsert on `montree_school_features`.

## Files Changed

### Haiku Test Tab
- `app/api/montree/guru/photo-insight/route.ts` — Added `haiku_only` body param, gated both Sonnet paths (onboarding + fallback), returns `visual_description` and `model_used` in response. Fixed pre-existing `visualDescription` block-scoping bug (hoisted from inner `if` block to function scope).
- `app/montree/dashboard/photo-audit/page.tsx` — New `haiku_test` zone tab with diagnostic UI: Select All/Clear buttons, Pass 1 violet block, Pass 2 match result, model indicator badge, matched/unmatched counts.

### Weekly Admin Feature Gate
- `app/montree/dashboard/page.tsx` — Dashboard card wrapped in `isEnabled('weekly_admin_docs')`
- `app/montree/dashboard/weekly-admin-docs/page.tsx` — Redirect to dashboard if feature disabled
- `app/api/montree/weekly-admin-docs/generate/route.ts` — Server-side feature gate (403)
- `app/api/montree/weekly-admin-docs/notes/route.ts` — GET + POST gated
- `app/api/montree/weekly-admin-docs/auto-fill/route.ts` — GET gated
- `app/api/montree/children/[childId]/weekly-admin/route.ts` — GET + POST gated
- `migrations/161_enable_weekly_admin_docs.sql` — Enable for Whale Class

### Story Upload Limits
- `app/api/story/upload-media/route.ts` — MAX_VIDEO_SIZE 100→300MB
- `app/api/story/admin/send/route.ts` — MEDIA_CONFIG video maxSize 100→300MB
- `app/story/[session]/page.tsx` — Client pre-check 100→300MB, timeout 180→300s
- `app/story/admin/dashboard/hooks/useAdminMessage.ts` — UPLOAD_TIMEOUT_MS 180→300s, pre-check 100→300MB

## Known Issues

- **Story "Load failed" error**: A user reports video uploads failing with "Load failed" — this is Safari's network-level error message, not from our code. The size/timeout increase may help, but root cause could be iOS backgrounding, connection drops, or Railway request body limits. May need chunked uploads as a future fix.
- **Whale Class classroom ID changed**: The classroom ID in CLAUDE.md was `945c846d-...` but the actual ID is now `51e7adb6-cd18-4e03-b707-eceb0a1d2e69` (school `c6280fae-567c-45ed-ad4d-934eae79aabc`). Migration 161 was updated to use the correct ID.

## Bug Fix Detail

**`visualDescription` block-scoping bug** in `photo-insight/route.ts`:
- `let visualDescription = ''` was declared inside an `if (!input)` block (~line 1489), making it block-scoped
- Referenced outside that block at line 2074 (context_snapshot) and 2113 (API response)
- Would have caused undefined reference on the Sonnet-only code path
- Fixed by hoisting declaration to function scope (~line 1214) and changing inner `let` to plain assignment
