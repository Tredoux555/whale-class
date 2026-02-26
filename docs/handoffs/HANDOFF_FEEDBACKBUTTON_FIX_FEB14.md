# Handoff: FeedbackButton Fix (Feb 14, 2026)

## Summary

Fixed the FeedbackButton component (`components/montree/FeedbackButton.tsx`) which was completely broken on mobile — textarea was unresponsive and screenshot capture corrupted the DOM. Required 4 fix attempts across 2 sessions. Final fix deployed as commit `972d426`.

## Problem

Two root causes identified after desktop Chrome audit confirmed everything worked fine on desktop:

1. **`disabled={!selectedType}` on textarea** — The textarea was disabled until a feedback type (bug/idea/help/praise) was selected. On mobile, this made the input appear completely non-functional because users couldn't type at all before selecting a type. This was the "doesn't work even without screenshot" issue.

2. **html2canvas-pro DOM corruption on mobile** — `html2canvas-pro` (upgraded from `html2canvas` for Tailwind CSS v4 `lab()` color compatibility) leaves invisible DOM elements (iframes, fixed-position containers) that block touch events on mobile Safari/Chrome. Desktop mouse events are unaffected.

## Fix Attempts

| Attempt | Commit | Approach | Result |
|---------|--------|----------|--------|
| 1 | `f48449a` | textareaRef, auto-focus, pointer-events cleanup | Still broken |
| 2 | `e257fac` | display:none, aggressive DOM cleanup | Still broken |
| 3 | `28491aa` | Nuclear DOM cleanup, snapshot children, formKey remount | Still broken |
| 4 | `972d426` | **Close form before capture, reopen with fresh DOM, remove disabled** | Partial — send button greyed out |
| 5 | `fec10bb` | **Preserve selectedType + message across close/reopen via refs** | ✅ Working |

## What Changed (Fix 5 — Final)

### 5. Preserve form state across close/reopen cycle
Added `savedTypeRef` and `savedMessageRef` to save `selectedType` and `message` before closing the form for screenshot capture. On reopen, these are restored so the send button isn't greyed out.

**Race condition fixed:** When `setIsOpen(false)` fired, the useEffect's else branch scheduled `setSelectedType(null)` + `setMessage('')` after 300ms. The screenshot capture also waits 300ms, so the cleanup ran *during* capture, wiping the form state. Fix: save state to refs before close, guard the cleanup with `if (!savedTypeRef.current)`, and restore on reopen.

## What Changed (Fix 4)

### 1. Removed `disabled={!selectedType}` from textarea
Textarea is always enabled. Placeholder changes dynamically based on selected type.

### 2. Close-reopen pattern for screenshot capture
Instead of trying to clean up html2canvas DOM leftovers (which proved impossible to do reliably on mobile), the form now:
- Closes entirely before capture (`setIsOpen(false)`)
- Waits 300ms for DOM to unmount
- Hides the floating button
- Captures the clean page
- Stores screenshot in `pendingScreenshotRef`
- Reopens form with `setIsOpen(true)`

### 3. Pending screenshot flow via useRef
`pendingScreenshotRef` replaces the old `formKey` state approach. When `isOpen` transitions to `false`:
- If `pendingScreenshotRef.current` has data → schedule reopen with screenshot after 100ms
- If no pending screenshot → normal close cleanup (clear type, message, screenshot after 300ms)

### 4. Removed `key={formKey}` from form div
No longer force-remounting the entire form. Fresh DOM comes naturally from the close/reopen cycle.

## Key Files

- `components/montree/FeedbackButton.tsx` — The fixed component
- Prior fix: `html2canvas` → `html2canvas-pro` swap (Tailwind v4 `lab()` color compatibility)

## Deployment

- Pushed via GitHub REST API (normal git push blocked by VM network + repo size)
- Railway auto-deploys from main
- Commit: `972d42637d58553462e21aad45c9a6264eee090b`

## Lesson Learned

When dealing with third-party libraries that corrupt the DOM (like html2canvas), it's often better to **avoid the problem entirely** (close the UI before the library runs) rather than trying to clean up after it. Three increasingly aggressive cleanup attempts all failed because html2canvas creates elements in unpredictable ways across different mobile browsers.
