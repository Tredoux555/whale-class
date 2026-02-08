# Session 157 — Domain Migration Handoff
# teacherpotato.xyz → montree.xyz (CLEAN CUT)

**Date:** Feb 8, 2026
**Status:** Plan finalized, ready to execute
**Strategy:** Clean cut. No redirects. No bridges. teacherpotato.xyz dies.

---

## Decisions Locked

| Decision | Value |
|----------|-------|
| Primary domain | `montree.xyz` (no www) |
| www handling | `www.montree.xyz` → 301 to `montree.xyz` |
| Old domain | Removed from Railway, left to expire |
| Email FROM | Keep `noreply@teacherpotato.xyz` until Resend configured for new domain |
| Capacitor | Don't touch (abandoned, risks build breakage) |
| GitHub repo | Don't rename (breaks Railway source connection) |

## Test Credentials

- Teacher login page: `/montree/login`
- Teacher credentials: any name / `123`
- Super admin password: `870602`
- Supabase: `dmfncjjtsoxrnvcdnvjq.supabase.co`

## Railway Details

- Project name: **happy-flow**
- Service name: **whale-class**
- Region: EU West (Amsterdam, Netherlands)
- Source: `Tredoux555/whale-class` → `main` branch
- Current domain: `www.teacherpotato.xyz`

---

## Execution Plan (12 Phases)

### Phase 1 — Baseline Test (2 min)
- Load `www.teacherpotato.xyz/montree/login` in browser
- Login with any name / `123`
- Confirm dashboard loads
- **If broken → STOP. Fix first. Migration doesn't start on a broken app.**

### Phase 2 — Railway Recon + Add Domains (5 min)
- Railway → "happy-flow" → "whale-class" → Settings → Networking
- Document every domain currently configured
- Note any `*.up.railway.app` URL
- Add `montree.xyz` as custom domain
- Add `www.montree.xyz` as custom domain
- Record exactly what Railway provides (CNAME target, A record IPs, or both)

### Phase 3 — GoDaddy DNS (5 min)
- GoDaddy → DNS for montree.xyz
- Configure based on what Railway provided in Phase 2:
  - `www` CNAME → Railway's target
  - `@` root → Railway's provided value
- If apex impossible: use GoDaddy forwarding `montree.xyz` → `www.montree.xyz`

### Phase 4 — Wait + Verify (5-30 min)
- Verify DNS via terminal: `dig montree.xyz` and `dig www.montree.xyz`
- Once resolving, load both in browser
- Confirm both serve EXISTING app (teacherpotato branding — expected)
- Confirm SSL active (green lock) on both
- **HARD STOP: Phase 5 does not begin until both domains serve live app with valid SSL**

### Phase 5 — Env Var Recon (3 min)
**Do NOT change anything yet.** Gather information only.
- Railway → "whale-class" → Variables tab
- Document every variable referencing teacherpotato or Railway URL
- Grep codebase for `NEXT_PUBLIC_APP_URL` and any other env var names found
- Determine: does existing code currently read these variables?
  - If YES → env var changes go into Phase 8 alongside code deploy
  - If NO → can set early (but prefer Phase 8 for clean single deploy)

### Phase 6 — Code Changes (15 min)
Grep fresh. Review each match individually. NOT a blind find-replace.

**6a — Server-side API routes (use env var):**
- `app/api/montree/invites/send/route.ts` → `process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz'`
- `app/api/montree/reports/send/route.ts` → KEEP `noreply@teacherpotato.xyz` FROM (Resend not ready)

**6b — Client-side URL fallbacks (use window.location.origin):**
- `app/montree/principal/setup/page.tsx` (2 places) → `window.location.origin`

**6c — UI branding (each file has different text — grep and edit individually):**
- `app/montree/demo/page.tsx`
- `app/montree/principal/setup/page.tsx` (footer)
- `app/montree/principal/register/page.tsx`
- `app/montree/principal/login/page.tsx`
- `app/montree/apply/npo/page.tsx` (2 places)
- `app/montree/apply/reduced-rate/page.tsx` (2 places)
- `app/montree/login-select/page.tsx`
- `app/montree/page.tsx`
- `app/montree/teacher/register/page.tsx`
- `app/home/register/page.tsx`
- `app/home/page.tsx`

**6d — Admin/internal display text:**
- `app/montree/admin/parent-codes/page.tsx` → URL display
- `app/montree/welcome/page.tsx` → support email
- `app/admin/classroom/report/[childId]/page.tsx` → games URL
- `app/admin/users/page.tsx` → login URL instruction
- `app/admin/page.tsx` → footer

**6e — Config cleanup:**
- `next.config.ts` → DELETE entire commented-out redirect block
- `.env.local` → update comment
- `components/classroom/VideoGenerator.tsx` → watermark text
- `site-tester.js` → update references

**Leave alone:** `capacitor.config.json`, `.env.stripe.example`, all `.md` docs

**No redirect logic. No env var changes in this commit.**

### Phase 7 — Supabase Auth (5 min)
- Supabase → Auth → URL Configuration
- Update Site URL to `https://montree.xyz`
- Remove teacherpotato redirect URLs, add montree.xyz equivalents
- Check for `*.up.railway.app` references

### Phase 8 — Set Env Vars + Deploy (5 min)
**Critical: set env var and push code at same time to avoid double deploy.**
- Set `NEXT_PUBLIC_APP_URL=https://montree.xyz` in Railway Variables
- IMMEDIATELY after: `git add -A && git commit -m "feat: rebrand to montree.xyz" && git push`
- This ensures Railway builds once with both changes
- If Railway triggers a deploy from env var change alone: cancel it, let the git push deploy take over
- Wait for green checkmark — "Deployment successful"
- **If build fails → read logs, fix, push again. Do NOT proceed until "Online"**

### Phase 9 — Test on montree.xyz (10 min)
1. `montree.xyz/montree/login` → name + code `123` → dashboard loads
2. Click student → child detail page loads
3. Open Guru → ask test question → AI responds
4. `montree.xyz/montree/try` → create trial → code generated
5. `montree.xyz/montree/super-admin` → `870602` → admin loads
6. `montree.xyz/montree/admin/parent-codes` → URLs say montree.xyz
7. `montree.xyz/home` → landing page loads with montree.xyz branding
8. `montree.xyz/montree/parent` → parent login loads
9. Verify `www.montree.xyz` redirects to `montree.xyz` (or serves correctly)

**If any test fails → `git revert HEAD && git push`. teacherpotato.xyz still active.**

### Phase 10 — Final External Service Sweep (3 min)
- Grep codebase: `grep -rn "teacherpotato" --include="*.ts" --include="*.tsx" --include="*.json"`
- Should only hit non-functional files (capacitor, example env, docs)
- Confirm Supabase auth URLs clean
- Confirm Railway env vars clean

### Phase 11 — Kill teacherpotato.xyz (2 min)
**Only after Phase 9 and 10 pass:**
- Railway → Networking → REMOVE `www.teacherpotato.xyz`
- REMOVE `teacherpotato.xyz` if present
- Confirm only `montree.xyz` + `www.montree.xyz` remain
- Load `montree.xyz/montree/login` → still works
- Verify www redirect still works

### Phase 12 — Update Docs + Memory (5 min)
- Update `brain.json` — new URLs, session work
- Update `BRAIN.md` — production URL, session notes
- Update `CLAUDE.md` — all references
- Update Claude memory via `memory_user_edits` tool
- Commit and push

---

## Rollback

| When | How |
|------|-----|
| Before Phase 11 | `git revert HEAD && git push` — teacherpotato still active |
| After Phase 11 | Re-add teacherpotato in Railway Networking (60s), then revert code |

## Deferred to Next Session

- Resend email domain verification for montree.xyz (SPF, DKIM, DMARC)
- Google Search Console for montree.xyz
- SEO: sitemap.xml + robots.txt
- Delete `capacitor.config.json`
- GitHub repo rename → requires Railway source reconnection

---

## Pre-Migration Audit Results

### Codebase grep (functional code only):

**Server-side (env var fix):**
- `app/api/montree/invites/send/route.ts:49`
- `app/api/montree/reports/send/route.ts:295` (email FROM — defer)

**Client-side (window.location.origin fix):**
- `app/montree/principal/setup/page.tsx:185,195`

**UI branding (string swap):**
- 13 pages listed in Phase 6c above

**Admin text:**
- 5 files listed in Phase 6d above

**Config:**
- `next.config.ts:55-56` (commented redirect — delete)
- `.env.local:1` (comment)
- `capacitor.config.json:2,6` (leave alone)
- `site-tester.js` (update)
- `VideoGenerator.tsx:254` (watermark)

### Git status at handoff:
- All code committed and pushed (`febeec7`)
- Railway deploy successful, service Online
- Zero uncommitted changes
