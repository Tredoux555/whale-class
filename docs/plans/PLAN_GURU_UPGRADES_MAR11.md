# Plan: Guru Upgrades — Fire-and-Forget + Photo + Area Analytics + Work Creation
**Date:** Mar 11, 2026
**Methodology:** Plan → Audit×3 → Build → Audit×3

---

## Overview — 4 Features

### Feature 1: Fire-and-Forget Upload Hardening (RAZ page)
### Feature 2: Guru Photo Input Enhancement (already partially built — needs polish)
### Feature 3: Guru Area Analytics Tool (new `get_weekly_area_summary`)
### Feature 4: Guru Work Creation with Photo (enhance existing `add_curriculum_work`)

---

## Feature 1: Fire-and-Forget Upload Hardening

**Current state:** `uploadPhoto()` in `raz/page.tsx` (line 337) does a single `fetch()` with AbortController. If the network hiccups, the photo is lost forever. No retry, no timeout, no offline queue.

**Gaps identified:**
1. No retry on failure — single network error loses photo
2. No upload timeout — hanging upload blocks the uploadKey forever (never cleaned from `uploading` Set)
3. No persistence — if component unmounts mid-upload, photo is lost
4. Upload abort on unmount is aggressive — could cancel nearly-complete uploads

**Plan:**
- Add 30s timeout per upload (AbortController + setTimeout)
- Add 2-retry with exponential backoff (1s, 3s) on network failures
- Add timeout cleanup: if upload takes >30s, remove from `uploading` Set and show toast
- Keep existing AbortController pattern for intentional cancellation (component unmount)
- NOT adding offline queue (IndexedDB) — too complex for this phase, and RAZ is always used with connectivity

**Files to modify (1):**
- `app/montree/dashboard/raz/page.tsx` — Rewrite `uploadPhoto()` function (~30 lines → ~60 lines)

**Changes:**
```
function uploadPhoto(file, childId, date, photoType, classroomId) {
  const MAX_RETRIES = 2;
  const UPLOAD_TIMEOUT = 30_000; // 30s

  async function attemptUpload(attempt: number): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

    try {
      const res = await fetch('/api/montree/raz/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      // ... existing success handling
    } catch (err) {
      clearTimeout(timeout);
      if (attempt < MAX_RETRIES && err?.name !== 'AbortError') {
        await new Promise(r => setTimeout(r, attempt === 0 ? 1000 : 3000));
        return attemptUpload(attempt + 1);
      }
      throw err;
    }
  }

  attemptUpload(0).catch(err => { /* existing error handling */ }).finally(() => { /* cleanup */ });
}
```

**Risk:** Low. Only touches one function, no API changes.

---

## Feature 2: Guru Photo Input Enhancement

**Current state:** GuruChatThread.tsx (line 304-387) ALREADY has photo upload fully built:
- `handleImageSelect()` — validates file type/size, compresses via `compressImageForChat()`, uploads to `/api/montree/media/upload`
- `pendingImage` state with preview + uploading indicator
- `handleSend()` passes `image_url` in request body
- Server `route.ts` line 104 reads `image_url` and passes as image content block to Anthropic (line 504-509)

**What's missing:** The `📷` button exists but the experience could be better:
1. Camera capture (not just gallery pick) — on mobile, `accept="image/*"` already prompts camera
2. Guru should explicitly acknowledge the photo in its response
3. Need `capture="environment"` attribute for one-tap camera access on mobile

**Plan — MINIMAL changes needed (it already works!):**
- Add `capture="environment"` to the file input for direct camera access
- Add instruction in conversational-prompt.ts telling Guru to reference photos when present
- Verify image_url is passed correctly through to Anthropic API (already confirmed at line 504-509)

**Files to modify (2):**
- `components/montree/guru/GuruChatThread.tsx` — Add `capture="environment"` to file input (1 line)
- `lib/montree/guru/conversational-prompt.ts` — Add photo awareness instruction to TOOL_USE_INSTRUCTIONS

---

## Feature 3: Guru Area Analytics Tool — `get_weekly_area_summary`

**User request:** "How many people visited the English area this week? Who didn't?" and then recommend a game plan with small groups.

**Current state:** `get_daily_activity` already queries `montree_child_progress` by date. But:
- It only looks at a SINGLE date, not a date range (week)
- It doesn't aggregate by area
- It doesn't identify WHO didn't visit an area

**Plan — New tool: `get_weekly_area_summary`**

This tool queries progress records for the past 7 days (or custom range), grouped by area, showing:
- Per-area: how many unique children had activity, list of names
- Per-area: who DIDN'T have any activity (the missing children)
- Total session count per child across all areas

**Tool definition:**
```typescript
{
  name: "get_weekly_area_summary",
  description: "Get a weekly summary of which children visited each Montessori area. Shows per-area activity counts, which children worked in each area, and crucially which children did NOT visit certain areas. Use when teachers ask about area coverage, balance, or who needs to be guided toward an area. Pairs well with group_students for planning small groups.",
  input_schema: {
    type: "object",
    properties: {
      area: {
        type: "string",
        enum: ["practical_life", "sensorial", "mathematics", "language", "cultural", "all"],
        description: "Which area to analyze. Use 'all' for a full overview."
      },
      days: {
        type: "number",
        description: "Number of days to look back. Default 7 (one week), max 30."
      }
    },
    required: []
  }
}
```

**Tool executor logic:**
1. Get classroom_id (from override or child lookup)
2. Get all children in classroom
3. Query `montree_child_progress` for date range (last N days)
4. Also query `montree_sessions` for session-level area tracking (if available)
5. Group by area → list children who had activity
6. Compute complement: children who did NOT visit each area
7. Return compact summary

**Files to modify (2):**
- `lib/montree/guru/tool-definitions.ts` — Add `get_weekly_area_summary` tool definition
- `lib/montree/guru/tool-executor.ts` — Add executor case

**Prompt enhancement:**
- `lib/montree/guru/conversational-prompt.ts` — Add to TOOL_USE_INSTRUCTIONS: "When a teacher asks about area coverage, use get_weekly_area_summary. After analyzing, proactively suggest small groups using group_students."

---

## Feature 4: Guru Work Creation with Photo

**Current state:** `add_curriculum_work` already exists and is FULLY FUNCTIONAL (tool-definitions.ts line 315, tool-executor.ts line 581). It creates custom works with all fields (name, area, description, aims, materials, presentation steps, etc.).

**What's missing for the user's request:**
1. Photo passed to Guru should inform the work creation — when teacher says "add this work, here's what it looks like [photo]", the Guru should use the photo to understand the work AND generate all writeups
2. The `add_curriculum_work` tool doesn't have a `photo_url` field to store a reference image
3. No `parent_description` field in the tool (exists in curriculum JSON but not in tool schema)
4. Need to add `control_of_error` to the tool schema

**Plan:**
- Add `photo_url` field to `add_curriculum_work` tool schema → stored in DB on the work record
- Add `parent_description` field (the parent-facing explanation for reports)
- Add `control_of_error` field
- The photo is already passed to Anthropic as an image content block (Feature 2 confirms this works). So when the teacher sends a photo + "add this work", the Guru SEES the photo via vision, generates all the writeups, and calls `add_curriculum_work` with all the details.
- Update conversational prompt to instruct Guru on this workflow

**Files to modify (3):**
- `lib/montree/guru/tool-definitions.ts` — Add `photo_url`, `parent_description`, `control_of_error` to `add_curriculum_work` schema
- `lib/montree/guru/tool-executor.ts` — Store `photo_url`, `parent_description`, `control_of_error` in DB insert
- `lib/montree/guru/conversational-prompt.ts` — Add work creation workflow instructions

**DB consideration:** `montree_classroom_curriculum_works` table needs `photo_url`, `parent_description`, `control_of_error` columns. Check if they exist, add if missing (migration or alter).

---

## Summary of Files

| Feature | Files Modified | New Files |
|---------|---------------|-----------|
| 1. Fire-and-forget | `raz/page.tsx` | none |
| 2. Photo input | `GuruChatThread.tsx`, `conversational-prompt.ts` | none |
| 3. Area analytics | `tool-definitions.ts`, `tool-executor.ts`, `conversational-prompt.ts` | none |
| 4. Work creation | `tool-definitions.ts`, `tool-executor.ts`, `conversational-prompt.ts` | possibly 1 migration |

**Total: 5 files modified + possibly 1 migration**

---

## Estimated Time
- Feature 1: 15 min
- Feature 2: 10 min
- Feature 3: 30 min (new tool executor logic)
- Feature 4: 20 min (schema additions + executor updates)
- 3×3 Audit: 30 min
- **Total: ~2 hours**

---

## Build Order
1. Feature 1 (standalone, no dependencies)
2. Feature 3 (new tool, no dependencies)
3. Feature 4 (extends existing tool)
4. Feature 2 (tiny change, wraps up photo story)
5. Audit×3 across ALL changes
