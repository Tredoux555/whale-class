# Handoff: Story Mobile Video Fix + Guru Thinking Display (Apr 4, 2026)

## Session Summary

Two features shipped in this session:

### 1. Story Mobile Video Uploads Fixed (commit `6bcd3f46`)

**Problem:** Videos sent from mobile devices were failing silently or timing out.

**5 root causes found via 3x3x3 audit:**

| # | Root Cause | Fix |
|---|-----------|-----|
| 1 | Admin send route `maxDuration: 60` — too short for mobile video uploads | Bumped to 300s |
| 2 | User upload route `maxDuration: 120` — also too short | Bumped to 300s |
| 3 | No AbortController on admin video fetch — infinite hang on stall | Added 180s timeout with clear error message |
| 4 | Missing iOS MIME types (`video/3gpp`, `video/3gpp2`, `video/x-m4v`) | Added to both routes + extension fallback |
| 5 | Unsafe `res.json()` — server returns HTML on 502/504, crashes parse | `safeJson()` wrapper on all fetch responses |

**Additional improvements:**
- Client-side upload timeout bumped from 90s → 180s on user Story page
- Extension-based fallback detection in admin route (mobile browsers sometimes send empty MIME)
- MessageComposer accept attribute updated with `.m4v`, `.3gp`
- Timeout errors now say "Upload timed out — try a smaller file or use WiFi" instead of generic "Connection error"

**Files changed (5):**
- `app/api/story/admin/send/route.ts`
- `app/api/story/upload-media/route.ts`
- `app/story/admin/dashboard/hooks/useAdminMessage.ts`
- `app/story/[session]/page.tsx`
- `app/story/admin/dashboard/components/MessageComposer.tsx`

### 2. Guru Progressive Thinking Display (commit `06f4d337`)

**Problem:** User wanted to see the Guru "thinking" instead of static dots.

**Fix:** Added `thinkingPhase` state (0→1→2) with progressive timers:
- Phase 0 (immediate): "Thinking..."
- Phase 1 (after 3s): "Building context..."
- Phase 2 (after 8s): "Generating response..."

Indicator disappears once first SSE streaming token arrives (`isStreaming` flag).

**Files changed (3):**
- `components/montree/guru/GuruChatThread.tsx` — thinkingPhase state, timers, progressive JSX
- `lib/montree/i18n/en.ts` — `guru.thinkingContext`, `guru.thinkingGenerating`
- `lib/montree/i18n/zh.ts` — Same keys in Chinese

## Pending Migrations (MUST RUN)

These migrations were created in the previous session and have NOT been run yet:

```sql
-- Migration 158: Paperwork tracker
ALTER TABLE montree_children ADD COLUMN IF NOT EXISTS paperwork_current_week integer NOT NULL DEFAULT 1;

-- Migration 159: Photo audit permanent confirm
ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS teacher_confirmed boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_montree_media_teacher_confirmed ON montree_media (teacher_confirmed) WHERE teacher_confirmed = false;
```

## Previous Session Work (also pushed, same day)

- **Photo audit "Correct" permanence** — `teacher_confirmed` boolean on `montree_media` (commit `e53a8299`)
- **Paperwork Tracker panel** — new intelligence panel on teacher dashboard (commit `101896b8`)
- **Circle Time Cards merged** — separate tab removed, now inline "Calling Card Size" dropdown (commit `b68a7c4c`)
- **Guru streaming UI** — real-time text instead of three dots (commit `ea207a6b`)
- **Guru model string** — updated from `claude-sonnet-4-20250514` to `claude-sonnet-4-6` (commit `e53a8299`)
- **Guru error messages** — now show actual API error text instead of generic "Failed to get response"

## Known Issues

- **Guru functionality** depends on `ANTHROPIC_API_KEY` being valid on Railway. Model string is now `claude-sonnet-4-6`. If Guru still fails, check the key.
- **Paperwork Tracker + Photo Audit permanent confirm** won't work until migrations 158+159 are run.
