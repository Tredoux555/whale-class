# Security Phase 6 Complete — Input Sanitisation & CSP Headers

## Date: 2026-02-11

## Summary
Phase 6 addresses XSS (cross-site scripting) vulnerabilities across the application by:
1. Creating a shared HTML escaping utility
2. Sanitizing all user data in document.write/innerHTML contexts (22+ injection points)
3. Adding a Content-Security-Policy header
4. Adding input length limits to 6 API routes

## Files Created (3)
- `lib/sanitize.ts` — `escapeHtml()` and `sanitizeImageUrl()` utilities
- `public/daily-summary.js` — extracted from inline script (CSP compliance)
- `public/video-discovery-demo.js` — extracted from inline script (CSP compliance)

## Files Modified (14)
- `components/card-generator/print-utils.ts` — escape card.label (5 locations) + sanitize image URLs (3 locations)
- `app/admin/label-maker/page.tsx` — escape l.text
- `app/admin/vocabulary-flashcards/page.tsx` — escape card.word + sanitize card.image
- `app/montree/dashboard/vocabulary-flashcards/page.tsx` — escape card.word + sanitize card.image
- `app/admin/circle-planner/page.tsx` — escape plan?.theme in title
- `public/daily-summary.html` — replaced inline script with external .js
- `public/video-discovery-demo.html` — replaced inline script with external .js
- `next.config.ts` — added Content-Security-Policy header
- `app/api/montree/children/route.ts` — name: 200, notes: 5000
- `app/api/montree/feedback/route.ts` — message: 10000, user_name: 200, page_url: 2000
- `app/api/montree/leads/route.ts` — name: 200, school_name: 200, email: 254, message: 10000
- `app/api/montree/media/upload/route.ts` — caption: 1000, tags: 500 each
- `app/api/montree/guru/route.ts` — widened question max from 1000 to 2000
- `app/api/montree/observations/route.ts` — behavior_description: 5000, notes fields: 2000, observed_by: 200

## Plan Files
- `.claude/plans/phase6-plan-v1.md` — Initial plan
- `.claude/plans/phase6-plan-v2.md` — After audit round 1
- `.claude/plans/phase6-plan-v3.md` — Final approved plan (3 rounds of plan→audit→refine)

## CSP Policy Details
```
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
- No `unsafe-eval` — not needed
- Print windows (window.open + document.write) are exempt from CSP
- Public HTML inline scripts were extracted to external .js files for CSP compliance

## sanitizeImageUrl Allowlist
Only these prefixes pass validation:
- `https://dmfncjjtsoxrnvcdnvjq.supabase.co/` (Supabase storage)
- `data:image/png;base64,` (canvas toDataURL)
- `data:image/jpeg;base64,` (JPEG canvas/file reader)
- `/images/` (local)
- `/audio-new/` (local)

SVG data URLs are blocked to prevent XSS via `data:image/svg+xml`.

## What Was Deferred
- Full zod validation on all 199 API routes (too risky without frontend audit — would need Phase 7+)
- No Google Fonts domains in CSP (verified none used in codebase)

## Testing Notes
- TypeScript check passes (no new errors; all errors are pre-existing)
- Build uses `ignoreBuildErrors: true` in next.config.ts
- Test CSP by loading the site and checking browser console for violations
- Test print functionality to verify escaping doesn't break display

## Remaining Phases
- Phase 7: Session management improvements
- Phase 8: Logging & monitoring
- Phase 9: Dependency audit & final review
