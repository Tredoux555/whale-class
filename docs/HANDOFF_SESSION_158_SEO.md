# SESSION 158 HANDOFF — SEO Foundation Complete + Google Search Console Live
## Date: February 8, 2026

---

## WHAT WAS DONE THIS SESSION

### 1. Google Search Console — Domain Verified ✅
- Added DNS TXT record on GoDaddy: `google-site-verification=95OmIARPuKZzx0lsXGhc52hA-0ie9t9EdClP_lGa7uY`
- Domain property `montree.xyz` verified (auto-verified via domain name provider)
- Sitemap submitted: `https://montree.xyz/sitemap.xml`
- Status: "Couldn't fetch" initially (normal for new properties — resolves within hours)
- Indexing requested for 3 priority pages:
  - `/montree` — ✅ Indexing requested
  - `/home` — ✅ Indexing requested (added to priority crawl queue)
  - `/montree/try` — ✅ Indexing requested

### 2. Sitemap Created ✅
- File: `app/sitemap.ts` (Next.js MetadataRoute.Sitemap)
- 8 public pages with priority weighting:
  - `/montree` → priority 1.0 (landing page)
  - `/montree/try` → priority 0.9 (free trial)
  - `/home` → priority 0.9 (homeschool landing)
  - `/montree/login` → priority 0.7
  - `/montree/parent/login` → priority 0.7
  - `/montree/parent/signup` → priority 0.6
  - `/home/login` → priority 0.6
  - `/home/register` → priority 0.6
- Live at: `https://montree.xyz/sitemap.xml` ✅

### 3. Robots.txt Created ✅
- File: `app/robots.ts` (Next.js MetadataRoute.Robots)
- Allows 8 public paths, disallows 9 protected paths
- References sitemap URL
- Live at: `https://montree.xyz/robots.txt` ✅

### 4. Meta Tags + OG + Twitter Cards ✅
- **Root layout** (`app/layout.tsx`): Full metadata with `metadataBase`, title template, OG, Twitter cards, canonical, robots directives, JSON-LD structured data
- **Montree layout** (`app/montree/layout.tsx`): Enhanced with full OG, Twitter, canonical `/montree`
- **Home layout** (`app/home/layout.tsx`): Rewritten from client → server component for metadata exports. Client nav extracted to `components/home/HomeNav.tsx`
- **Try layout** (`app/montree/try/layout.tsx`): NEW — server layout with correct canonical, OG, Twitter metadata

### 5. OG Image Created ✅
- File: `public/og-image.png`
- 1200×630px, ~107KB
- Dark green gradient with "M" logo and "Montree" branding
- Live at: `https://montree.xyz/og-image.png` ✅

### 6. JSON-LD Structured Data ✅
- Schema.org `SoftwareApplication` type in root layout
- Fields: name, applicationCategory (EducationalApplication), operatingSystem (Web), offers (Free), author

### 7. Middleware Fix ✅
- `middleware.ts` updated to bypass auth for `/sitemap.xml` and `/robots.txt`
- Without this fix, middleware was redirecting SEO routes to login pages

---

## AUDIT FIXES (3 issues found and fixed)

### Fix 1: HTTP 308 → 301 Redirect
- **Problem**: `montree.xyz/` root redirect was returning HTTP 308 (Next.js `permanent: true` default)
- **Fix**: Changed to `statusCode: 301` in `next.config.ts` for SEO gold standard
- **Verified**: `curl -I https://montree.xyz` now returns `301 Moved Permanently`

### Fix 2: Canonical URL Conflict on /montree/try
- **Problem**: `/montree/try` was inheriting canonical URL `/montree` from parent layout, conflicting with sitemap
- **Fix**: Created `app/montree/try/layout.tsx` with explicit `canonical: 'https://montree.xyz/montree/try'`
- **Verified**: Page now serves correct canonical meta tag

### Fix 3: Relative OG Image URLs
- **Problem**: Root layout used relative paths `/og-image.png` while other layouts used absolute
- **Fix**: Standardized all OG image URLs to `https://montree.xyz/og-image.png`
- **Verified**: All layouts now serve consistent absolute OG image URLs

---

## COMMITS (4 total, all pushed to main)

1. `0811c87` — SEO foundation (sitemap, robots, meta tags, OG image, structured data)
2. `befa509` — Fix middleware blocking sitemap.xml/robots.txt
3. `27c3488` — Fix 308→301 redirect + /montree/try canonical
4. `47d4359` — Standardize OG image URLs to absolute paths

---

## FILES MODIFIED/CREATED

| File | Action | Purpose |
|------|--------|---------|
| `app/sitemap.ts` | NEW | 8-page sitemap with priority weighting |
| `app/robots.ts` | NEW | Allow/disallow rules + sitemap reference |
| `app/layout.tsx` | MODIFIED | Full SEO metadata, JSON-LD, absolute OG URLs |
| `app/montree/layout.tsx` | MODIFIED | Enhanced OG, Twitter, canonical |
| `app/home/layout.tsx` | REWRITTEN | Client → server component for metadata |
| `components/home/HomeNav.tsx` | NEW | Extracted client nav from home layout |
| `app/montree/try/layout.tsx` | NEW | Correct canonical + full metadata |
| `public/og-image.png` | NEW | 1200×630 OG image |
| `middleware.ts` | MODIFIED | Bypass auth for SEO routes |
| `next.config.ts` | MODIFIED | `statusCode: 301` for root redirect |

---

## CURRENT SEO STATE (All Green)

| Component | Status |
|-----------|--------|
| Google Search Console | ✅ Verified (montree.xyz domain property) |
| Sitemap | ✅ Live + submitted to GSC |
| Robots.txt | ✅ Live |
| Meta tags | ✅ Rich (title templates, descriptions) |
| Open Graph tags | ✅ All public pages |
| Twitter cards | ✅ summary_large_image on all pages |
| Canonical URLs | ✅ Correct on all pages |
| Structured data (JSON-LD) | ✅ SoftwareApplication |
| OG Image | ✅ 1200×630 branded image |
| HTTPS | ✅ Working |
| 301 Redirect | ✅ Root → /montree |
| Mobile | ✅ Configured |

---

## GOOGLE INDEXING TIMELINE

- Sitemap submitted: Feb 8, 2026
- Manual indexing requested for 3 priority pages
- Expected appearance in Google: **24-72 hours** for new domains
- Full crawl/index: **1-2 weeks**
- Ranking improvements: **2-4 weeks** as Google builds trust

---

## NEXT PRIORITIES

### Phase 2: Content SEO (Immediate Impact)
- Expand `/montree` landing page content (features section, how it works, testimonials)
- Add FAQ page for long-tail keywords
- Add About page for trust signals
- Consider blog/resources about Montessori education

### Phase 3: Off-page SEO (Ongoing)
- Submit to education app directories
- Get backlinks from Montessori community sites/forums
- Social media presence linking back to montree.xyz
- Consider Google Business Profile if applicable

### Optional Technical SEO
- Google Indexing API for instant indexing (requires service account setup)
- Bing Webmaster Tools registration
- Schema.org FAQ markup on landing pages

---

## KNOWN ISSUES (Carried Forward)

1. **www.montree.xyz SSL mismatch** — cert shows `*.up.railway.app` not `montree.xyz`
2. **Resend email domain** — montree.xyz not verified in Resend, noreply@montree.xyz won't deliver
3. **GitHub deploy key** — "Cowork Deploy Key" still active, remove if not needed
4. **Session 155 SQL pending** — Montree Home columns (materials_owned, weekly_plans, journal_entries)

---

## Test Credentials

- Teacher login: `/montree/login` → any name / `123`
- Super admin: `/montree/super-admin` → `870602`
- Supabase: `dmfncjjtsoxrnvcdnvjq.supabase.co`

## Pending SQL (From Session 155)
```sql
ALTER TABLE home_families
ADD COLUMN IF NOT EXISTS materials_owned jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS weekly_plans jsonb DEFAULT '{}'::jsonb;

ALTER TABLE home_children
ADD COLUMN IF NOT EXISTS journal_entries jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_home_families_materials ON home_families USING gin(materials_owned);
CREATE INDEX IF NOT EXISTS idx_home_children_journal ON home_children USING gin(journal_entries);
```
