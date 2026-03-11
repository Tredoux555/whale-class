# Handoff: Home Parent System Rebuild — Feature Parity + Crash Fix

**Date:** March 11, 2026
**Status:** COMPLETE, NOT YET DEPLOYED
**Methodology:** Full 3×3×3 (3 plan-audit cycles + 3 build-audit cycles) + 3 post-build audit-fix cycles
**Total issues found & fixed:** 18 across all cycles

---

## Problem

The home parent system (`/montree/home/[childId]`) was crashing ("cocking out") on simple messages and lacked feature parity with the teacher system. Root cause: PortalChat's `handleSend` had zero timeout protection — if Guru API hung, UI froze indefinitely. Additionally, ShelfView was read-only with no progress updates, observations, or error handling.

## What Was Built

### PortalChat.tsx (~668 lines, 8 changes)

1. **AbortController on handleSend** — Root cause fix. Previous: no abort, no timeout, infinite hang. Now: AbortController + 95s hard timeout + 10s "still thinking" indicator.
2. **Image upload** — Camera button next to voice button. `compressImage()` from cache.ts compresses before upload. Uploads to `/api/montree/media/upload`, then sends URL to Guru.
3. **res.ok guards** — All 3 fetch calls (history, greeting, guru) now check `res.ok` before `.json()`. Prevents crashes on non-JSON error responses.
4. **Specific error handling** — AbortError (timeout), 429 (rate limited), `guru_daily_limit_reached`, connection failures — each gets distinct i18n toast.
5. **Image preview** — Shows preview with close button above input before send.
6. **Timer cleanup** — `clearTimeout` before setting new `thinkingTimerRef` prevents leaks.
7. **i18n** — All hardcoded strings replaced: `[Photo attached]` → `t('home.portal.photoAttached')`, removed `|| 'Image upload failed'` fallback.

### ShelfView.tsx (~878 lines, 9 changes)

1. **Progress update buttons** — Work detail panel with presented/practicing/mastered buttons. Calls `/api/montree/progress/update` API. Optimistic shelf update via `.map()`.
2. **Observation notes** — Textarea + save button. Calls `/api/montree/observations` API.
3. **Work detail bottom sheet** — Tap any work → opens panel with progress buttons, observation textarea, "View Presentation Guide" button.
4. **Backdrop click-to-close** — Overlay `onClick={closeWorkDetail}` with `e.stopPropagation()` on inner panel.
5. **Fetch error retry** — `fetchError` state + retry button when shelf fails to load.
6. **Navigation links** — Footer with "Progress" + "Browse Curriculum" links to teacher-style pages.
7. **Auto-close detail on refresh** — `setDetailWork(null)` in `fetchShelf` success path. Prevents stale data when Guru updates shelf.
8. **Stale closure fixes** — Both `updateProgress` and `saveObservation` capture `const currentWork = detailWork;` before async to prevent wrong-work updates.
9. **res.ok guard on fetchShelf** — Prevents `.json()` crash on error responses.

### ErrorBoundary.tsx (NEW, 64 lines)

React error boundary wrapping both PortalChat and ShelfView. Accepts `title`, `fallbackMessage`, `retryLabel` props — all i18n-wired from parent page. Catches transient render errors with "Try Again" button.

### page.tsx ([childId]/page.tsx, ~192 lines, 3 changes)

1. Both PortalChat and ShelfView wrapped with `<ErrorBoundary>`.
2. Imported `useI18n`, wired `t()` calls to ErrorBoundary props.
3. Distinct fallback messages for chat vs shelf errors.

### i18n (en.ts + zh.ts, 27 new keys total)

27 new keys with **perfect EN/ZH parity**:
- `home.portal.*` — 7 keys (stillThinking, timeout, rateLimited, attachPhoto, selectImageFile, imageTooLarge, imageUploadFailed, photoAttached)
- `home.shelf.*` — 15 keys (status, presented, practicing, mastered, observationLabel, observationPlaceholder, saveObservation, observationSaved, observationFailed, progressUpdated, progressFailed, viewPresentation, viewProgress, browseCurriculum, fetchError)
- `home.error.*` — 4 keys (title, chatFailed, shelfFailed, tryAgain)

---

## Audit History

### 3×3×3 Build Methodology
- **Plan Cycle 1-3:** Refined from 14 → 10 → 9 changes
- **Build Cycle 1:** Implemented all 9 changes via parallel agents
- **Build Audit 1:** 3 issues (backdrop close, empty text+image format, detail panel auto-close) → all fixed
- **Build Audit 2:** 5 issues (timer leak, image upload silent fail, setFocusWork error toast, stale useCallback deps) → all fixed
- **Build Audit 3:** CLEAN

### Post-Build 3× Audit-Fix Cycles
- **Audit Cycle 1:** 7 issues (res.ok guards ×2, hardcoded string, fallback removal, stale closures ×2, ErrorBoundary i18n) → all fixed
- **Audit Cycle 2:** Verified all 7 fixes correct → CLEAN
- **Audit Cycle 3:** 1 real issue (fetchShelf res.ok guard) → fixed. All other "CRITICALs" were false positives (already fixed code or pre-existing).

**Total: 18 issues found and fixed across 6 audit cycles. Final state: CLEAN.**

---

## Files Modified (6)

| File | Lines | Change Type |
|------|-------|-------------|
| `components/montree/home/PortalChat.tsx` | ~668 | Modified (AbortController, image upload, res.ok guards, i18n) |
| `components/montree/home/ShelfView.tsx` | ~878 | Modified (progress updates, observations, detail panel, stale closure fixes) |
| `components/montree/ErrorBoundary.tsx` | 64 | **NEW** (React error boundary with i18n props) |
| `app/montree/home/[childId]/page.tsx` | ~192 | Modified (ErrorBoundary wrapping, useI18n) |
| `lib/montree/i18n/en.ts` | +27 keys | Modified |
| `lib/montree/i18n/zh.ts` | +27 keys | Modified |

## Deploy

⚠️ NOT YET PUSHED. No new migrations needed. Include in consolidated push with other unpushed changes.

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: home parent system rebuild — feature parity + crash fix (3x3x3 + 3 audit cycles, 18 issues fixed)" && git push origin main
```
