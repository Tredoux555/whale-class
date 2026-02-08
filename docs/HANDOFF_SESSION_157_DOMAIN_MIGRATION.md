# SESSION 157 HANDOFF — Domain Migration Complete + SEO Plan
## Date: February 8, 2026

---

## WHAT WAS DONE THIS SESSION

### Domain Migration: teacherpotato.xyz → montree.xyz ✅ COMPLETE
- A record: `montree.xyz` → `66.33.22.1` (Railway edge)
- CNAME: `www.montree.xyz` → `montree.xyz`
- TXT: `_railway-verify` verification record added on GoDaddy
- Railway custom domain `montree.xyz` added, SSL provisioned
- Env var `NEXT_PUBLIC_APP_URL` = `https://montree.xyz`
- 25 files updated (all teacherpotato.xyz → montree.xyz references)
- `montree.xyz/` redirects to `/montree` (Montree landing page)
- `teacherpotato.xyz` serves Whale Class site (no redirect)
- Copy code button added to `/home` signup page
- GitHub deploy key "Cowork Deploy Key" added for SSH push

---

## NEXT PRIORITY: SEO — Get "Montree" to #1 on Google

### Current SEO State (Audited)

| Component | Status |
|-----------|--------|
| Google Search Console | ❌ Not registered |
| Sitemap | ❌ Missing |
| Robots.txt | ❌ Missing |
| Root meta tags | ⚠️ Generic ("Montree" / "Montessori progress tracking") |
| Open Graph tags | ❌ Missing |
| Twitter cards | ❌ Missing |
| Canonical URLs | ❌ Missing |
| Structured data (JSON-LD) | ❌ Missing |
| HTTPS | ✅ Working |
| PWA manifests | ✅ Well configured |
| Viewport/mobile | ✅ Configured |
| Page speed | ✅ Next.js SSR + caching |

---

### Phase 1: Technical SEO Foundation (Session 158)

**Step 1: Google Search Console Registration**
- Navigate to search.google.com/search-console
- Add property: montree.xyz (domain verification)
- Google will give a TXT record value
- Add TXT record to GoDaddy DNS (same process as Railway verification — we've done this twice already)
- Wait for DNS propagation, verify ownership
- Submit sitemap URL once created

**Step 2: Create sitemap.xml**
- Create `app/sitemap.ts` using Next.js built-in sitemap generation
- Pages to include:
  - `/montree` (landing page — highest priority)
  - `/montree/login` (teacher login)
  - `/montree/try` (trial signup)
  - `/montree/parent/login` (parent login)
  - `/home` (Montree Home landing)
  - `/home/login` (Home login)
- Pages to EXCLUDE:
  - All `/montree/dashboard/*` routes (authenticated)
  - All `/admin/*` routes
  - All `/api/*` routes
  - All `/montree/parent/dashboard/*` routes (authenticated)
  - All `/home/dashboard/*` routes (authenticated)

**Step 3: Create robots.txt**
- Create `app/robots.ts` using Next.js built-in robots generation
- Allow: `/montree`, `/home`, `/montree/try`, `/montree/login`, `/montree/parent/login`, `/home/login`
- Disallow: `/admin`, `/api`, `/montree/dashboard`, `/montree/parent/dashboard`, `/home/dashboard`, `/montree/super-admin`
- Sitemap: `https://montree.xyz/sitemap.xml`

**Step 4: Improve Meta Tags**
- Root layout (`app/layout.tsx`):
  - Title: "Montree - Montessori Classroom Management"
  - Description: "Track children's Montessori progress, manage classrooms, and share reports with parents. Built for Montessori teachers and schools."
- Montree layout (`app/montree/layout.tsx`):
  - Title template: "%s | Montree"
  - Description: "Montessori classroom management platform for teachers and schools"
- Add Open Graph tags:
  - og:title, og:description, og:image, og:url, og:type, og:site_name
- Add Twitter card tags:
  - twitter:card (summary_large_image), twitter:title, twitter:description, twitter:image
- Add canonical URL: `https://montree.xyz`

**Step 5: Create OG Image**
- Create a 1200x630 pixel Open Graph image
- Options: static image in `/public/og-image.png` or dynamic generation via `app/opengraph-image.tsx`
- Should show: Montree logo, tagline, clean design matching the green brand
- This is what shows when someone shares montree.xyz on social media, Slack, WhatsApp etc.

**Step 6: Add JSON-LD Structured Data**
- Add to root layout or montree layout
- Schema.org type: `SoftwareApplication`
- Fields: name, description, applicationCategory (EducationalApplication), operatingSystem (Web), offers, url
- This helps Google understand what Montree is and show rich results

**Step 7: Submit Sitemap**
- Back in Google Search Console, submit `https://montree.xyz/sitemap.xml`
- Request indexing for key pages: `/montree`, `/montree/try`, `/home`

---

### Phase 2: Content SEO (Future Sessions)
- Expand landing page content (features section, how it works, testimonials)
- Add a blog or resource pages about Montessori education
- Create FAQ page
- Create About page
- These give Google more content to index and rank

### Phase 3: Off-page SEO (Ongoing)
- Submit to education app directories
- Get backlinks from Montessori community sites / forums
- Social media presence (links back to montree.xyz)
- Domain age builds trust over time

---

## Test Credentials

- Teacher login: `/montree/login` → any name / `123`
- Super admin: `/montree/super-admin` → `870602`
- Supabase: `dmfncjjtsoxrnvcdnvjq.supabase.co`

## Live URLs

| URL | What |
|-----|------|
| `montree.xyz` | → redirects to `/montree` |
| `montree.xyz/montree` | Montree classroom landing |
| `montree.xyz/montree/try` | Trial signup |
| `montree.xyz/montree/login` | Teacher login |
| `montree.xyz/montree/dashboard` | Teacher dashboard |
| `montree.xyz/montree/parent/login` | Parent login |
| `montree.xyz/home` | Montree Home (homeschool) landing |
| `www.teacherpotato.xyz` | Whale Class media site |

## Known Issues

1. **www.montree.xyz SSL mismatch** — cert shows `*.up.railway.app` not `montree.xyz`
2. **Resend email domain** — montree.xyz not verified in Resend, noreply@montree.xyz won't deliver yet
3. **GitHub deploy key** — "Cowork Deploy Key" still active, remove if not needed
4. **Session 155 SQL pending** — Montree Home columns (materials_owned, weekly_plans, journal_entries)

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
