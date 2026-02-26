# SESSION 163 HANDOFF — Domain Isolation Fix
## Date: February 9, 2026

---

## PROBLEM

Visiting `teacherpotato.xyz` was redirecting to `montree.xyz/montree`, making the Whale Class video platform inaccessible and creating an intellectual property issue — two separate products sharing one deployment were not properly separated.

## ROOT CAUSE ANALYSIS

Three layers contributed to the problem:

1. **Browser-cached 301 redirect** — Session 157's domain migration had issued a 301 (permanent) redirect from `teacherpotato.xyz` → `montree.xyz`. Chrome cached this at the profile level and replayed it without ever hitting the server, even after the server-side config changed.

2. **No domain-aware routing** — The Next.js middleware had no concept of which domain a request came from. Both domains served identical content with no isolation.

3. **All metadata branded as Montree** — `app/layout.tsx` had static metadata with Montree branding, meaning even when `teacherpotato.xyz` served the correct page, the title/OG tags/SEO all said "Montree."

---

## WHAT WAS DONE THIS SESSION

### Fix 1: Domain Isolation in Middleware ✅
**File: `middleware.ts`**
- Added hostname detection at the top of the middleware function
- Requests to `/montree` or `/home` on `teacherpotato.xyz` → redirect to `montree.xyz`
- Requests to `/` on `montree.xyz` → redirect to `/montree`
- Added `x-hostname` header forwarding so downstream code can detect the domain

### Fix 2: Domain-Aware Metadata ✅
**File: `app/layout.tsx`**
- Converted static `metadata` export to dynamic `generateMetadata()` function
- `teacherpotato.xyz` → title "Whale Class — Montessori Learning Videos", description about songs/phonics/videos
- `montree.xyz` → title "Montree — Montessori Classroom Management" (existing branding)
- OG tags, Twitter cards, and canonical URLs are domain-specific
- JSON-LD structured data only renders on `montree.xyz`

### Fix 3: Prevent Future 301 Caching ✅
**File: `next.config.ts`**
- Changed the `montree.xyz` root → `/montree` redirect from `statusCode: 301` to `statusCode: 302`
- 302 (temporary) redirects are not aggressively cached by browsers

### Commit
- Hash: `bfe1774`
- Message: "fix: domain isolation — separate teacherpotato.xyz and montree.xyz"
- Pushed to `main`, auto-deployed on Railway

---

## VERIFICATION

### Server-side (confirmed working ✅)
```
curl -sI https://www.teacherpotato.xyz → 200 OK, title "Whale Class — Montessori Learning Videos"
curl -sI https://montree.xyz → 302 → /montree, title "Montree — Montessori Classroom Management"
```

Server returns `cache-control: private, no-cache, no-store, max-age=0, must-revalidate` — no future caching issues.

### Browser-side (action required ⚠️)
Chrome still has the old 301 cached at the profile level. This persists across tabs, windows, and browser restarts.

**To fix:** Clear Chrome browsing data → "Cached images and files" → All time → Clear.

After clearing, both domains will resolve correctly.

---

## DNS ARCHITECTURE

```
teacherpotato.xyz (bare domain)
  A records → 3.33.251.168 / 15.197.225.128 (AWS Global Accelerator — GoDaddy forwarding)
  GoDaddy 301 → http://www.teacherpotato.xyz → https://www.teacherpotato.xyz

www.teacherpotato.xyz
  CNAME → kkcmcz76.up.railway.app (Railway)

montree.xyz
  A record → 66.33.22.1 (Railway edge)
```

---

## RAILWAY CONSTRAINTS

- **Custom domain limit: 2** (plan cap reached)
- Current domains: `www.teacherpotato.xyz` + `montree.xyz`
- Cannot add bare `teacherpotato.xyz` as a third custom domain
- Bare domain relies on GoDaddy forwarding to `www` subdomain

---

## REMAINING ACTION ITEMS

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Clear Chrome cache to flush old 301 | User | ⚠️ Required |
| 2 | Browser-test both domains after cache clear | User | Pending |
| 3 | Consider upgrading Railway plan to add bare `teacherpotato.xyz` as custom domain | User | Optional |
| 4 | Fix bare domain GoDaddy forwarding (currently 301, should be 302 or direct A record) | User (GoDaddy DNS) | Optional |

---

## FILES MODIFIED

| File | Change |
|------|--------|
| `middleware.ts` | Added domain isolation routing + `x-hostname` header |
| `app/layout.tsx` | Static metadata → dynamic `generateMetadata()` with hostname detection |
| `next.config.ts` | 301 → 302 for montree.xyz root redirect |
| `BRAIN.md` | Updated with Session 163 info |

---

## KNOWN ISSUES (Carried Forward)

1. **www.montree.xyz SSL mismatch** — cert shows `*.up.railway.app` not `montree.xyz`
2. **Resend email domain** — `montree.xyz` not verified in Resend
3. **Session 155 SQL pending** — Montree Home columns still need migration
4. **Railway 2-domain limit** — bare `teacherpotato.xyz` can't be added without plan upgrade
