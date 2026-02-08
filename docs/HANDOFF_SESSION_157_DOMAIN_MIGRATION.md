# SESSION 157 HANDOFF — Domain Migration + SEO Plan
## Date: February 8, 2026

---

## WHAT WAS DONE

### Domain Migration: teacherpotato.xyz → montree.xyz
Montree now lives at **montree.xyz**. The old domain teacherpotato.xyz continues to serve Whale Class.

**DNS (GoDaddy):**
- A record: `montree.xyz` → `66.33.22.1` (Railway edge)
- CNAME: `www.montree.xyz` → `montree.xyz`
- TXT: `_railway-verify` → verification token (Railway domain verification)

**Railway:**
- Custom domain `montree.xyz` added to whale-class service
- SSL certificate auto-provisioned by Let's Encrypt (valid until May 9, 2026)
- Env var `NEXT_PUBLIC_APP_URL` = `https://montree.xyz`
- Both domains served by same service: www.teacherpotato.xyz + montree.xyz

**Code Changes (commit 337ffda, 25 files):**
- All `teacherpotato.xyz` references → `montree.xyz` across footers, API routes, configs, components
- Email from address → `noreply@montree.xyz` (Resend)
- PWA manifest name → "Montree - Montessori Progress"
- Capacitor config updated

**Routing (next.config.ts):**
- `montree.xyz/` → redirects to `/montree` (Montree landing page)
- `teacherpotato.xyz` → serves Whale Class site directly (no redirect)

**GitHub:**
- Deploy key "Cowork Deploy Key" added (SSH ed25519, read/write access)
- Can be removed if not needed

**Additional:**
- Copy code button added to `/home` signup page (matching `/montree/try` UX)

---

## WHAT'S LIVE NOW

| URL | What it shows |
|-----|---------------|
| `montree.xyz` | Redirects → `/montree` (Montree landing) |
| `montree.xyz/montree` | Montree classroom app landing |
| `montree.xyz/montree/login` | Teacher login |
| `montree.xyz/montree/try` | Instant trial signup |
| `montree.xyz/montree/dashboard` | Teacher dashboard |
| `montree.xyz/montree/parent/login` | Parent login |
| `montree.xyz/home` | Montree Home (homeschool) landing |
| `montree.xyz/home/login` | Montree Home login |
| `www.teacherpotato.xyz` | Whale Class media site |

---

## KNOWN ISSUES

1. **www.montree.xyz SSL mismatch** — Certificate shows `*.up.railway.app` instead of `montree.xyz`. The apex domain works fine. Railway may need a separate custom domain entry for `www.montree.xyz` to get its own cert.
2. **Resend email domain** — `noreply@montree.xyz` won't deliver until montree.xyz is verified in Resend dashboard. Currently sending from the old domain likely still works.
3. **GitHub deploy key** — "Cowork Deploy Key" is still active on the repo. Remove it from github.com/Tredoux555/whale-class/settings/keys if you don't need it.

---

## NEXT PRIORITY: SEO — Get "Montree" to #1 on Google

### Phase 1: Technical SEO Foundation (Session 158)

**Step 1: Google Search Console**
- Navigate to search.google.com/search-console
- Add property: montree.xyz
- Verify via DNS TXT record (add to GoDaddy, same process as Railway verification)
- Submit sitemap URL once created

**Step 2: Create sitemap.xml**
- Create `app/sitemap.ts` using Next.js built-in sitemap generation
- Include all public Montree pages:
  - `/montree` (landing)
  - `/montree/login`
  - `/montree/try`
  - `/montree/parent/login`
  - `/home` (Montree Home landing)
  - `/home/login`
- Exclude authenticated routes (dashboards, admin, etc.)

**Step 3: Create robots.txt**
- Create `app/robots.ts`
- Allow all crawlers on public pages
- Disallow `/admin`, `/api`, dashboard routes
- Reference sitemap URL

**Step 4: Improve meta tags**
- Root layout: title → "Montree - Montessori Classroom Management"
- Add Open Graph tags (og:title, og:description, og:image, og:url)
- Add Twitter card tags
- Add canonical URLs
- Create OG image (1200x630) — can be generated or static

**Step 5: Structured data**
- Add JSON-LD schema.org markup for SoftwareApplication
- Include: name, description, applicationCategory (EducationalApplication), offers, etc.

### Phase 2: Content SEO (Future Sessions)
- Landing page content expansion (what Montree does, features, testimonials)
- Blog or resource pages about Montessori education
- FAQ page
- About page

### Phase 3: Off-page SEO (Ongoing)
- Submit to education app directories
- Get backlinks from Montessori community sites
- Social media presence

---

## CURRENT SEO STATE (Audit Results)

| Component | Status |
|-----------|--------|
| Sitemap | ❌ Missing |
| Robots.txt | ❌ Missing |
| Root meta tags | ⚠️ Generic ("Montree" / "Montessori progress tracking") |
| Open Graph tags | ❌ Missing |
| Twitter cards | ❌ Missing |
| Canonical URLs | ❌ Missing |
| Google Search Console | ❌ Not registered |
| Structured data (JSON-LD) | ❌ Missing |
| Viewport/mobile | ✅ Configured |
| PWA manifests | ✅ Well configured |
| HTTPS | ✅ Working |
| Page speed | ✅ Next.js SSR + caching |

---

## FILES CHANGED THIS SESSION

| File | Change |
|------|--------|
| `next.config.ts` | Root redirect + removed teacherpotato redirects |
| `app/home/page.tsx` | Added copy code button |
| 25 files in commit 337ffda | All teacherpotato.xyz → montree.xyz references |

---

## SQL TO RUN (From Session 155, still pending)
```sql
ALTER TABLE home_families
ADD COLUMN IF NOT EXISTS materials_owned jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS weekly_plans jsonb DEFAULT '{}'::jsonb;

ALTER TABLE home_children
ADD COLUMN IF NOT EXISTS journal_entries jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_home_families_materials ON home_families USING gin(materials_owned);
CREATE INDEX IF NOT EXISTS idx_home_children_journal ON home_children USING gin(journal_entries);
```
