# Phase 6 Plan v3 — Input Sanitisation & CSP Headers

## Changes from v2
- **CORRECTED**: `data:image/` prefix too permissive → restrict to `data:image/png;base64,` (blocks SVG XSS)
- **CORRECTED**: Removed `fonts.googleapis.com` and `fonts.gstatic.com` from CSP (no Google Fonts actually used in codebase)
- **ADDED**: Extract inline `<script>` blocks from public HTML files to external `.js` files (required for `script-src 'self'`)
- **CLARIFIED**: Print windows (opened via `window.open()` + `document.write()`) are NOT subject to CSP — no server response headers are sent for dynamically written documents
- All line numbers re-verified against actual source code

---

## Fix 1: Create sanitization utility (5 min)

**Create** `lib/sanitize.ts`:
```typescript
/** Escape HTML special characters to prevent XSS in template strings */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Validate that a URL is a safe image source */
export function sanitizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const ALLOWED_PREFIXES = [
    'https://dmfncjjtsoxrnvcdnvjq.supabase.co/',
    'data:image/png;base64,',   // Canvas exports only — blocks SVG XSS
    'data:image/jpeg;base64,',  // JPEG canvas exports
    '/images/',
    '/audio-new/',
  ];
  if (ALLOWED_PREFIXES.some(prefix => url.startsWith(prefix))) return url;
  return ''; // reject unknown sources
}
```

---

## Fix 2: Sanitize print-utils.ts (15 min)

**File**: `components/card-generator/print-utils.ts`

5 locations — escape `card.label` in all alt attributes and text content:
- Line 27: `alt="${escapeHtml(card.label)}"` (control card img)
- Line 29: `${escapeHtml(card.label)}` (control card label div)
- Line 36: `alt="${escapeHtml(card.label)}"` (picture card img)
- Line 43: `${escapeHtml(card.label)}` (label-only card text)
- Line 461: `alt="${escapeHtml(card.label)}"` (large card img)

Also sanitize image URLs: `src="${sanitizeImageUrl(card.croppedImage)}"` at all img tags (lines 27, 36, 461).

Import at top: `import { escapeHtml, sanitizeImageUrl } from '@/lib/sanitize';`

---

## Fix 3: Sanitize label-maker (5 min)

**File**: `app/admin/label-maker/page.tsx`
- Line 216: `${escapeHtml(l.text)}` in label div

Import at top: `import { escapeHtml } from '@/lib/sanitize';`

---

## Fix 4: Sanitize vocabulary flashcards — both copies (10 min)

**File 1**: `app/admin/vocabulary-flashcards/page.tsx`
- Line 406: `alt="${escapeHtml(card.word)}"` and `${escapeHtml(card.word.toLowerCase())}`
- Also: `src="${sanitizeImageUrl(card.image)}"`

**File 2**: `app/montree/dashboard/vocabulary-flashcards/page.tsx`
- Line 403: Same treatment

Import in both files: `import { escapeHtml, sanitizeImageUrl } from '@/lib/sanitize';`

---

## Fix 5: Fix circle-planner printContent (5 min)

**File**: `app/admin/circle-planner/page.tsx`

- Line 35: Escape `plan?.theme` in `<title>`: `<title>Week ${selectedWeek} - ${escapeHtml(plan?.theme || '')}</title>`
- Line 43: `printContent` stays as-is — it's from `printRef.current.innerHTML` which is React-rendered (React auto-escapes JSX expressions). VERIFIED: no `dangerouslySetInnerHTML` inside the print ref.

Import at top: `import { escapeHtml } from '@/lib/sanitize';`

**Note**: Print windows opened via `window.open()` + `document.write()` do NOT receive CSP headers — the browser doesn't make an HTTP request for dynamically-written content. So the inline `<script>` in print windows for `window.print()` is fine.

---

## Fix 6: Sanitize public HTML demo pages (20 min)

### Fix 6a: public/daily-summary.html

**Step 1**: Extract inline `<script>` block (lines 48-141) to `public/daily-summary.js`
**Step 2**: Replace `<script>...</script>` with `<script src="/daily-summary.js"></script>`
**Step 3**: Add inline `escapeHtml()` function at top of the new .js file (can't import from lib/)
**Step 4**: Escape all user data before innerHTML insertion:
- Line 66: `err.message` in error display
- Line 103: `p.photo_url` in img src
- Line 105: `p.child?.name`, `p.child?.avatar_emoji`
- Line 106: `p.notes`
- Line 122: `c.child?.name`, `c.child?.avatar_emoji`
- Line 123: `c.activity?.name`

### Fix 6b: public/video-discovery-demo.html

**Step 1**: Extract inline `<script>` block (lines 197-324) to `public/video-discovery-demo.js`
**Step 2**: Replace `<script>...</script>` with `<script src="/video-discovery-demo.js"></script>`
**Step 3**: Add `escapeHtml()` function at top of the new .js file
**Step 4**: Escape all user/API data before innerHTML insertion:
- Line 202: `message` param in `showStatus()`
- Lines 214-249: API response data (`totalWorks`, `videosFound`, `coveragePercent`, stats fields)

---

## Fix 7: Add Content-Security-Policy header (10 min)

**File**: `next.config.ts` — add to existing headers array:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://dmfncjjtsoxrnvcdnvjq.supabase.co;
  font-src 'self';
  connect-src 'self' https://dmfncjjtsoxrnvcdnvjq.supabase.co https://www.googleapis.com;
  media-src 'self' https://dmfncjjtsoxrnvcdnvjq.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

Notes:
- `unsafe-inline` for styles only (React inline styles everywhere)
- No `unsafe-eval` needed (no eval/new Function in codebase)
- `blob:` for img-src (canvas/download patterns)
- `data:` for img-src (canvas toDataURL outputs referenced in image tags elsewhere)
- media-src for audio files (defensive — may be used in future)
- Removed `fonts.googleapis.com` / `fonts.gstatic.com` — no Google Fonts imports found in codebase
- Print windows are exempt (no HTTP response = no CSP header)
- Public HTML files will work because Fix 6 extracts inline scripts to external .js files

---

## Fix 8: Basic input length limits on unvalidated routes (20 min)

**Pattern** (add near top of each handler):
```typescript
if (name && name.length > 200) {
  return NextResponse.json({ error: 'Name too long' }, { status: 400 });
}
if (message && message.length > 10000) {
  return NextResponse.json({ error: 'Message too long' }, { status: 400 });
}
```

**Routes**:
1. `/api/montree/children` — name: 200, notes: 5000
2. `/api/montree/feedback` — message: 10000
3. `/api/montree/leads` — name: 200, school_name: 200, email: 254, message: 10000
4. `/api/montree/media/upload` — caption: 1000, tags: 500 each
5. `/api/montree/guru` — question: 2000 (already has 5-1000 char validation; widen to 2000 max)
6. `/api/montree/observations` — behavior_description: 5000, notes fields: 2000 each

---

## Implementation Order

1. Fix 1 — sanitize.ts utility (dependency for everything)
2. Fix 2 — print-utils.ts (highest XSS risk, most injection points)
3. Fix 3 — label-maker
4. Fix 4 — vocabulary flashcards (both files)
5. Fix 5 — circle-planner
6. Fix 6 — public HTML pages (extract scripts + escape data)
7. Fix 7 — CSP header
8. Fix 8 — input length limits

**Estimated total: ~1.5 hours**

## Files Created (3)
- `lib/sanitize.ts`
- `public/daily-summary.js` (extracted from inline script)
- `public/video-discovery-demo.js` (extracted from inline script)

## Files Modified (~12)
- `next.config.ts` (CSP header)
- `components/card-generator/print-utils.ts`
- `app/admin/label-maker/page.tsx`
- `app/admin/circle-planner/page.tsx`
- `app/admin/vocabulary-flashcards/page.tsx`
- `app/montree/dashboard/vocabulary-flashcards/page.tsx`
- `public/daily-summary.html` (script extraction + escaping)
- `public/video-discovery-demo.html` (script extraction + escaping)
- ~6 API routes (length limits)
