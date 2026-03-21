# Handoff: Photo Sort Order Fix + China CDN Plan

**Date:** Mar 21, 2026 (late session)
**Status:** Sort fix applied locally, needs push. CDN plan documented.

---

## Issues Reported

1. **Photos load slowly in China without VPN** — teachers in China wait 5-15+ seconds per image
2. **New photos sometimes appear at bottom instead of top** — inconsistent gallery ordering
3. **Album photo uploads not showing** — already fixed in earlier session (double compression removal), confirmed deployed

---

## Fix 1: Photo Sort Order (2 files modified)

**Root cause:** When photos were queued offline and synced later, `captured_at` could be null or identical across multiple photos. The sort used `captured_at` only — photos with null `captured_at` fell to the bottom, and photos with identical timestamps had unpredictable order.

**Fix:** Added `created_at` as a robust fallback and tiebreaker in both server and client sorts.

### `app/api/montree/media/route.ts` (line 85-93)
- Combined direct+group media sort now uses `captured_at || created_at`
- Tiebreaker: when `captured_at` is identical, sorts by `created_at` (DB insert order)
- Ensures newest photos always appear first regardless of how they were queued

### `app/montree/dashboard/[childId]/gallery/page.tsx` (line 211-218)
- Client-side sort matches server logic
- Uses `Date.getTime()` for numeric comparison (more robust than string compare)
- Same `created_at` tiebreaker

---

## Fix 2: Slow Photo Loading in China — CDN Plan

### Why It's Slow

Supabase project `dmfncjjtsoxrnvcdnvjq.supabase.co` is hosted in a US/EU region. Signed URLs point directly to the Supabase origin server. China's Great Firewall throttles connections to foreign cloud services → 5-15+ seconds per image.

**Important:** The Guru AI advisor works fine without VPN. Anthropic API calls happen server-to-server (Railway → Anthropic) and never touch the Great Firewall. Only image loading is affected.

### Solution: Cloudflare Image Proxy (Recommended)

Since `montree.xyz` is already on Cloudflare (accessible in China), proxy image requests through a Next.js API route. Cloudflare caches the response at edge nodes globally (including Asia-Pacific).

**Step 1 — Make Supabase bucket public** (Supabase Dashboard):
- Storage → `montree-media` → Settings → Toggle "Public" ON
- This allows server-side fetching without signed URLs

**Step 2 — Create image proxy route** (`app/api/montree/media/proxy/[...path]/route.ts`):
```typescript
// Proxies image requests through Cloudflare edge cache
// Browser → montree.xyz/api/montree/media/proxy/path/to/photo.jpg → Supabase
// Cloudflare caches at edge → subsequent requests served from Asia-Pacific POP
export async function GET(request, { params }) {
  const path = params.path.join('/');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/storage/v1/object/public/montree-media/${path}`);
  const blob = await res.blob();
  return new Response(blob, {
    headers: {
      'Content-Type': res.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 24hr cache
    }
  });
}
```

**Step 3 — Update URL generation** (`app/api/montree/media/urls/route.ts`):
- Instead of signed URLs, return proxy URLs: `/api/montree/media/proxy/${storagePath}`
- These go through Cloudflare → cached at edge → fast in China

### Expected Improvement
- First load: ~2-3s (Cloudflare fetches from Supabase origin, caches)
- Subsequent loads: <500ms (served from Cloudflare Asia-Pacific edge)
- No VPN required

### Alternative: Supabase CDN Transform URLs
Supabase Pro plan includes image transformations served via their CDN. If already on Pro, use:
```
${supabaseUrl}/storage/v1/render/image/public/montree-media/${path}?width=800&quality=75
```
This uses Supabase's own CDN which may have better Asia coverage than the raw storage endpoint.

---

## Album Upload Fix (Already Applied)

The earlier session's fix (removing double compression in `CameraCapture.tsx` + adding 15s timeout) was already in the codebase and has been pushed. No additional code changes needed.

---

## Deploy

All code changes are in local files. Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add -A
git commit -m "fix: photo sort order (newest first) + China CDN documentation"
git push origin main
```

**Post-push action items:**
1. ⚠️ Go to Supabase Dashboard → Storage → `montree-media` → make bucket Public
2. Build the Cloudflare image proxy route (see Step 2 above)
3. Update URL generation to use proxy URLs instead of signed URLs

---

## Files Modified (This Session)

1. `app/api/montree/media/route.ts` — Sort fix: `captured_at || created_at` with tiebreaker
2. `app/montree/dashboard/[childId]/gallery/page.tsx` — Client-side sort fix matching server logic
