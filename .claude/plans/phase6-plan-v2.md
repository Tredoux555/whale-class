# Phase 6 Plan v2 — Input Sanitisation & CSP Headers

## Changes from v1
- **CORRECTED**: 5 card.label locations in print-utils.ts (not 4)
- **ADDED**: Image URL validation (prevent javascript:/data: URL injection)
- **ADDED**: Proper handling for printContent in circle-planner (sanitize at source, not output)
- **ADDED**: CSP connect-src for googleapis.com (YouTube API)
- **DESCOPED**: Zod validation on 6 routes → moved to "quick wins" basic length/type checks only. Full zod migration is too risky without frontend audit.

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

/** Validate that a URL is a safe image source (HTTPS only, allowlisted domains) */
export function sanitizeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const ALLOWED_PREFIXES = [
    'https://dmfncjjtsoxrnvcdnvjq.supabase.co/',
    'data:image/',
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

5 locations to fix — escape `card.label` in all alt attributes and text content:
- Line 27: `alt="${escapeHtml(card.label)}"` (control card img)
- Line 29: `${escapeHtml(card.label)}` (control card label div)
- Line 36: `alt="${escapeHtml(card.label)}"` (picture card img)
- Line 43: `${escapeHtml(card.label)}` (label-only card text)
- Line 461: `alt="${escapeHtml(card.label)}"` (large card img)

Also sanitize image URLs: `src="${sanitizeImageUrl(card.croppedImage)}"` at all img tags.

---

## Fix 3: Sanitize label-maker (5 min)

**File**: `app/admin/label-maker/page.tsx`
- Line 216: `${escapeHtml(l.text)}` in label div

---

## Fix 4: Sanitize vocabulary flashcards — both copies (10 min)

**File 1**: `app/admin/vocabulary-flashcards/page.tsx`
- Line 406: `alt="${escapeHtml(card.word)}"` and `${escapeHtml(card.word.toLowerCase())}`

**File 2**: `app/montree/dashboard/vocabulary-flashcards/page.tsx`
- Line 403: Same treatment

Also sanitize `card.image` URLs with `sanitizeImageUrl()`.

---

## Fix 5: Fix circle-planner printContent (10 min)

**File**: `app/admin/circle-planner/page.tsx`

**Problem**: `printContent = printRef.current.innerHTML` is full React-rendered HTML. Can't escape it (breaks formatting). Instead:

- Line 35: Escape `plan?.theme` in `<title>`: `<title>Week ${selectedWeek} - ${escapeHtml(plan?.theme || '')}</title>`
- Line 43: `printContent` stays as-is (React-rendered, user data is already escaped by React's JSX)
- React already escapes `{plan?.theme}` in JSX, so the printRef.current.innerHTML is safe as long as no dangerouslySetInnerHTML is used inside the ref

**Verify**: Read the circle-planner component to confirm no dangerouslySetInnerHTML inside the print ref.

---

## Fix 6: Sanitize public HTML demo pages (15 min)

**File 1**: `public/daily-summary.html`
- Add inline `escapeHtml()` function (can't import from lib/)
- Escape `p.child?.name`, `p.notes`, `err.message` before innerHTML insertion
- Escape `c.child?.name`, `c.child?.avatar_emoji` in any template strings

**File 2**: `public/video-discovery-demo.html`
- Add inline `escapeHtml()` function
- Escape `message` param in `showStatus()`
- Escape API response data before inserting into DOM

---

## Fix 7: Add Content-Security-Policy header (10 min)

**File**: `next.config.ts` — add to existing headers array:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https://dmfncjjtsoxrnvcdnvjq.supabase.co;
  font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;
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
- media-src for audio files in `/public/audio-new/`

---

## Fix 8: Basic input length limits on unvalidated routes (20 min)

Instead of full zod (risky without frontend audit), add simple length checks to the highest-risk data mutation routes:

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
5. `/api/montree/guru` — question: 2000
6. `/api/montree/observations` — limit params: max 100, days: max 365

---

## Implementation Order

1. Fix 1 — sanitize.ts utility (dependency for everything)
2. Fix 2 — print-utils.ts (highest XSS risk, most injection points)
3. Fix 3 — label-maker
4. Fix 4 — vocabulary flashcards (both files)
5. Fix 5 — circle-planner
6. Fix 6 — public HTML pages
7. Fix 7 — CSP header
8. Fix 8 — input length limits

**Estimated total: ~1.5 hours**

## Files Created (1)
- `lib/sanitize.ts`

## Files Modified (~12)
- `next.config.ts` (CSP header)
- `components/card-generator/print-utils.ts`
- `app/admin/label-maker/page.tsx`
- `app/admin/circle-planner/page.tsx`
- `app/admin/vocabulary-flashcards/page.tsx`
- `app/montree/dashboard/vocabulary-flashcards/page.tsx`
- `public/daily-summary.html`
- `public/video-discovery-demo.html`
- ~6 API routes (length limits)
