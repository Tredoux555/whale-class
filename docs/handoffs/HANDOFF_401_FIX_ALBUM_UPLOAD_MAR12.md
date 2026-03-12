# Handoff: 401 Fix (Students Disappeared) + Smart Capture Album Upload

**Date:** March 12, 2026
**Status:** COMPLETE, NOT YET DEPLOYED
**Migration:** None required for these fixes

---

## Summary

Two fixes addressing critical user-facing issues:

1. **All students disappeared from dashboard** — 401 errors on children API caused by expired httpOnly cookie while localStorage session persisted (zombie session)
2. **Smart Capture camera-only** — No ability to upload from photo album/library, only opened camera

---

## Fix 1: Zombie Session / 401 on Children API

### Root Cause

The httpOnly `montree-auth` cookie had a 7-day TTL for teachers/principals, but the localStorage session (`montree_session`) persists forever. After 7 days:

- Dashboard renders from localStorage (shows classroom name, UI shell)
- API calls fail with 401 (cookie expired, `verifyMontreeToken()` returns null)
- `useMontreeData` hook throws `Error('401')` → children array never populated
- Result: "Tap to add your first student" with 401 console errors

### Fix (2 files)

**`lib/montree/server-auth.ts`** — Extended cookie TTL to 30 days for ALL roles:
```typescript
// BEFORE: role === 'homeschool_parent' ? 30 days : 7 days
const maxAge = 30 * 24 * 60 * 60;  // 30 days for all roles
```

**`app/montree/dashboard/page.tsx`** — Added 401 detection that clears stale localStorage and redirects to login:
```typescript
if (childrenError === '401') {
  localStorage.removeItem('montree_session');
  router.push('/montree/login');
}
```

### Why This Works

- Cookie now lasts 30 days (matches parent cookie TTL) — prevents most zombie sessions
- If cookie DOES expire, dashboard detects 401 → clears stale localStorage → redirects to login → user gets fresh cookie on login
- Session recovery pipeline (built Mar 11, not yet deployed) will also handle this once pushed

### User Action Required

Current production users with expired cookies need to **log out and log back in** (or clear cookies) to get a new cookie. Once the session recovery code from Mar 11 is deployed, this will be automatic.

---

## Fix 2: Smart Capture Album Upload

### Root Cause

`CameraCapture.tsx` only used `navigator.mediaDevices.getUserMedia()` — which exclusively opens the camera. No file input existed for selecting photos from the album/library.

### Fix (3 files)

**`components/montree/media/CameraCapture.tsx`** — 3 changes:
1. Added `albumInputRef` + `handleAlbumSelect` callback with `compressImage()` preprocessing
2. Added hidden `<input type="file" accept="image/*">` (no `capture` attribute = allows album on mobile)
3. Added album button (gallery icon) in camera controls, left side, photo mode only

Key implementation details:
- `accept="image/*"` WITHOUT `capture` attribute → iOS/Android show "Choose Photo or Take Photo" picker
- `compressImage()` from `lib/montree/cache.ts` reduces large phone photos before upload
- Creates proper `CapturedPhoto` object with dimensions from `Image()` load
- Error handling: console.error + user-facing toast via `setError()`
- Input value reset after selection to allow re-selecting same file

**`lib/montree/i18n/en.ts`** — Added: `'camera.album': 'Choose from Album'`
**`lib/montree/i18n/zh.ts`** — Added: `'camera.album': '从相册选择'`

---

## Files Modified (5 total)

| File | Changes |
|------|---------|
| `lib/montree/server-auth.ts` | Cookie TTL 7d→30d for all roles |
| `app/montree/dashboard/page.tsx` | 401 detection → clear localStorage → redirect to login |
| `components/montree/media/CameraCapture.tsx` | Album file input + button + handleAlbumSelect with compression |
| `lib/montree/i18n/en.ts` | 1 new key (`camera.album`) |
| `lib/montree/i18n/zh.ts` | 1 new key (`camera.album`) — perfect EN/ZH parity |

---

## Audit Results

1 audit cycle, 0 issues found across all 5 files. Checks verified:
- Auth chain: cookie → verifyMontreeToken → 401 path correct
- Error string matching: `'401'` matches `throw new Error('401')` in cache.ts
- Import paths: compressImage, CapturedPhoto all verified
- i18n: EN/ZH parity confirmed
- No TypeScript errors, no missing dependencies

---

## Deploy

⚠️ NOT YET PUSHED. Include in consolidated push with all Mar 8–12 changes.
No new migrations required for these fixes.
