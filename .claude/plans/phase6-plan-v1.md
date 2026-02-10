# Phase 6 Plan v1 — Input Sanitisation & CSP Headers

## Audit Findings Summary

### HIGH — XSS Vectors (5 document.write + 3 innerHTML)
1. `components/card-generator/print-utils.ts` — Card labels injected unsanitized into document.write HTML (lines 27, 36, 43, 461)
2. `app/admin/label-maker/page.tsx` — Label text injected via `${l.text}` (line 216)
3. `app/admin/circle-planner/page.tsx` — Plan theme injected into `<title>` + `${printContent}` into body (lines 35, 43)
4. `app/admin/vocabulary-flashcards/page.tsx` — `${card.word}` injected (line 406)
5. `app/montree/dashboard/vocabulary-flashcards/page.tsx` — `${card.word}` injected (line 403)
6. `public/video-discovery-demo.html` — innerHTML with API response data (lines 202, 255)
7. `public/daily-summary.html` — innerHTML with child names, error messages (lines 66, 77-106)

### HIGH — No CSP Header
- Phase 4 added X-Frame-Options, HSTS, etc. in `next.config.ts` but CSP was deferred
- No `unsafe-eval` needed (no eval/new Function found)
- `unsafe-inline` needed for styles (heavy React inline style usage)
- External domains needed: Supabase storage (images), YouTube API (connect-src)

### MEDIUM — No Input Validation Library
- 199 API routes use manual validation or none
- No zod/joi — adding full validation to all 199 routes is out of scope for one phase
- Focus on the highest-risk routes (auth routes already improved in Phase 5)

---

## Phase 6 Scope

### Fix 1: Create HTML escaping utility (5 min)
Create `lib/sanitize.ts`:
```typescript
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

### Fix 2: Sanitize all 5 document.write print components (30 min)
Apply `escapeHtml()` to all user-controlled data in document.write templates:
1. `components/card-generator/print-utils.ts` — escape `card.label` in 4 locations
2. `app/admin/label-maker/page.tsx` — escape `l.text`
3. `app/admin/circle-planner/page.tsx` — escape `plan?.theme` and sanitize `printContent`
4. `app/admin/vocabulary-flashcards/page.tsx` — escape `card.word`
5. `app/montree/dashboard/vocabulary-flashcards/page.tsx` — escape `card.word`

### Fix 3: Sanitize innerHTML in public demo pages (15 min)
Replace innerHTML with textContent where possible, or escape data:
1. `public/video-discovery-demo.html` — escape API response data
2. `public/daily-summary.html` — escape child names, error messages

### Fix 4: Add Content-Security-Policy header (20 min)
Add CSP to `next.config.ts` headers:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://dmfncjjtsoxrnvcdnvjq.supabase.co;
  font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;
  connect-src 'self' https://dmfncjjtsoxrnvcdnvjq.supabase.co https://www.googleapis.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### Fix 5: Add zod validation to highest-risk API routes (45 min)
Install zod, create validation schemas for the most dangerous routes:
- `/api/montree/children` (child data mutations)
- `/api/montree/feedback` (user input)
- `/api/montree/leads` (user input)
- `/api/montree/media/upload` (file upload)
- `/api/montree/guru` (AI prompt injection risk)
- `/api/montree/observations` (child observation data)

### Fix 6: Add input length limits to remaining unvalidated routes (15 min)
For routes not getting full zod schemas, add basic length limits:
- All string inputs: max 1000 chars (unless justified)
- Email fields: max 254 chars
- Name fields: max 100 chars
- Message/notes fields: max 5000 chars

---

## Implementation Order
1. Fix 1 (escapeHtml utility) — dependency for Fix 2
2. Fix 2 (document.write sanitization) — highest XSS risk
3. Fix 3 (innerHTML sanitization) — medium XSS risk
4. Fix 4 (CSP header) — defense in depth
5. Fix 5 (zod on high-risk routes) — input validation
6. Fix 6 (length limits) — basic protection

**Estimated total: ~2.5 hours**

## Files Created
- `lib/sanitize.ts`

## Files Modified
- `next.config.ts` (CSP header)
- 5 print component files (escapeHtml)
- 2 public HTML files (innerHTML fixes)
- ~6 API routes (zod validation)
- ~10 API routes (length limits)
