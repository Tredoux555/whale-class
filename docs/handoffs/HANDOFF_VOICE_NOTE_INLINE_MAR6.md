# Handoff: Voice Note Inline Relocation + Sonnet Upgrade (Mar 6, 2026)

## Summary

Moved voice note recorder from standalone floating component to inline mic button next to the Save button in each expanded work card's observation textarea. Also upgraded extraction model from Haiku to Sonnet for reliability.

## Changes

### 1. ChildVoiceNote Rewrite — Compact Inline Button
**File:** `components/montree/voice-notes/ChildVoiceNote.tsx` (rewritten, ~230 lines)

**Before:** Standalone 12×12 green circle with status text and accumulated notes list. Floated above focus works section, disconnected from observation flow.

**After:** Compact 7×7 inline button that sits next to the Save button inside the observation textarea. New `onTranscript` callback fills the textarea with the transcribed text so the teacher can see/edit it.

Key changes:
- Removed `VoiceNoteData`, `ExtractionPreview` interfaces (no longer displays note history inline)
- Removed `loadNotes`, `showNotes`, notes list UI
- Added `onTranscript?: (text: string) => void` prop — fills textarea with transcript
- Simplified states: `idle | recording | processing | done | error` (was 6 states, now 5)
- Auto-dismiss status text after 3-4 seconds
- All processing (transcribe → extract → save) still runs, just doesn't render results inline
- **Unmount cleanup:** useEffect cleanup aborts in-flight requests, stops MediaRecorder, releases mic stream

### 2. FocusWorksSection — Mic Button Wired In
**File:** `components/montree/child/FocusWorksSection.tsx` (modified)

- Imported `ChildVoiceNote`
- Added `pb-10` to textarea padding (room for button row)
- Wrapped Save button + mic button in `flex` container at `absolute bottom-2 right-2`
- Mic only shows for teachers (`!isParent`)
- `onTranscript` appends text to existing textarea content (supports multiple recordings)

### 3. Page Cleanup
**File:** `app/montree/dashboard/[childId]/page.tsx` (modified)

- Removed standalone `<ChildVoiceNote>` block (was between WeeklyAdminCard and FocusWorksSection)
- Removed import

### 4. Extraction Model Upgrade — Haiku → Sonnet
**File:** `lib/montree/voice-notes/extraction.ts` (modified)

- Changed `HAIKU_MODEL` → `AI_MODEL` (Sonnet `claude-sonnet-4-20250514`)
- Cost: ~$0.003 → ~$0.05 per note (still negligible)
- Rationale: Rock-solid structured extraction for work matching + status confidence
- Fixed stale "Haiku" references in comments

## Audit (2 issues found, both fixed)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | CRITICAL | `ChildVoiceNote` missing unmount cleanup — mic stays open and fetches continue when work card collapses | Added `useEffect` cleanup: aborts controller, stops MediaRecorder, releases mic stream tracks |
| 2 | MEDIUM | Stale "Haiku" comments in `extraction.ts` (L245, L296) after Sonnet upgrade | Updated to "Sonnet" |

## UX Flow (After)

1. Teacher taps a work → card expands → observation textarea visible
2. Type text directly, OR tap 🎙️ mic button (green, next to 📌 Save)
3. Mic turns red + pulses during recording → tap ⏹ to stop
4. Button shows ⏳ during processing → transcript fills textarea
5. Sonnet extracts work/status/notes → auto-applies if confidence high
6. Status text briefly shows "✓ → Bow Dressing Frame (auto-applied)" then fades
7. Teacher can edit transcript in textarea, then hit Save for manual observation too

## Files Changed (4)

| File | Change |
|------|--------|
| `components/montree/voice-notes/ChildVoiceNote.tsx` | Full rewrite — compact inline button + unmount cleanup |
| `components/montree/child/FocusWorksSection.tsx` | Import + wire mic next to Save |
| `app/montree/dashboard/[childId]/page.tsx` | Remove standalone voice note block |
| `lib/montree/voice-notes/extraction.ts` | Haiku → Sonnet model upgrade + comment fixes |

## Push Command

```bash
git add components/montree/voice-notes/ChildVoiceNote.tsx components/montree/child/FocusWorksSection.tsx app/montree/dashboard/\[childId\]/page.tsx lib/montree/voice-notes/extraction.ts docs/handoffs/HANDOFF_VOICE_NOTE_INLINE_MAR6.md && git commit -m "refactor: move voice note mic inline next to Save + upgrade to Sonnet" && git push origin main
```
