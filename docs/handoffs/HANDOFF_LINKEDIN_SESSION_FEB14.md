# Handoff: LinkedIn Profile + Video Posts + Git Push (Feb 14, 2026)

## Summary

Continued LinkedIn profile transformation for Montree. Sent 25 connection requests, posted 2 of 3 promo videos with captions, attempted to push commit `549b589` (Social Media Manager) to GitHub. Push failed from both Cowork VM and user's local terminal — repo is 1.8GB and connections keep dropping.

## LinkedIn — Connection Requests (25 sent)

- **1 personalized invite** to Morais Velemo Mabyeka (now 2 personalized invites remaining out of 3/month limit)
- **24 quick connects** via "People you may know" sidebar and modal on profile page
- New account limitations: can't view most search results, limited to suggestion-based connecting
- Company page creation blocked — "You don't have enough connections" (needs accepted connections first)

## LinkedIn — Video Posts (2 of 3)

### Video 1 — Intro (✅ Posted)
- **File:** `Promo Videos/Video 1 - Intro/Final/Montree_Social_Square_V2.mp4` (3.5MB, 1080×1080)
- **Caption:** Building tools for Montessori teachers — feature list + montree.xyz CTA + hashtags
- **Source:** `Promo Videos/Video 1 - Intro/Final/YOUTUBE_SEO_UPLOAD_GUIDE_V2.md`
- User uploaded video manually (LinkedIn CSP blocks programmatic upload)

### Video 2 — Onboarding (✅ Posted)
- **File:** `Promo Videos/Video 2 - Onboarding/Final/Montree_Onboarding_Social_BRANDED.mp4` (7.3MB, 1080×1080)
- **Caption:** "I built Montree because Montessori teachers deserve better tools" — platform features + CTA
- **Source:** `Promo Videos/Video 2 - Onboarding/Final/YOUTUBE_SEO_UPLOAD_GUIDE.md`
- User uploaded video manually

### Video 3 — Tutorial (❌ Deferred)
- **File:** `Promo Videos/Video 3 - Tutorial/Montree_Tutorial_Social_BRANDED.mp4` (70MB)
- User said it's too long, will edit it down before posting

## LinkedIn — Other Actions

- **Banner:** User uploaded Facebook cover photo manually (not the generated LinkedIn banners)
- **Groups:** User said they'd join groups themselves; rate-limited on messaging/group joins (~24hr cooldown)
- **Premium:** User asked about pricing (Career ~R350/mo, Business ~R900/mo, Sales Nav ~R1,500/mo). Checkout had payment errors (520 Cloudflare / NETWORK_ERROR) — likely VPN + DevTools interference
- **Rate limits hit:** Messaging pages and group joining both returned 422 errors

## Git Push — ❌ FAILED (Commit 549b589 NOT on GitHub)

### The Problem
Commit `549b589` ("Add Social Media Manager with AI Guru and database tables") exists locally but has NOT reached GitHub. Railway is still deployed from `333d884` ("feat: Extras leak fix, auto-mastery, AreaBadge uniformity").

### What Was Tried

1. **SSH from Cowork VM** — Permission denied (no SSH key on fresh VM)
2. **Generated new SSH key** on Cowork VM → added to GitHub as "Cowork VM Feb 14"
3. **SSH auth works** — `ssh -T git@github.com` returns "Hi Tredoux555!"
4. **Push fails** — Connection reset by GitHub during data transfer
   - `Connection to github.com closed by remote host`
   - `send-pack: unexpected disconnect while reading sideband packet`
5. **Bare clone to local filesystem** — same result (rules out FUSE mount issues)
6. **HTTPS push** — needs credentials, no credential helper available
7. **Git lock files** — 10 stale `.lock` files in `.git/` from failed pushes; can't delete (FUSE permissions)

### Root Cause
The repo is **1.8GB** (510MB pack file). GitHub closes the SSH connection during the large data transfer. The Cowork VM's network connection can't sustain the transfer.

### Why It Worked Before
Previous Cowork sessions had an SSH key ("Cowork VM", added Feb 11) that worked. Each new Cowork session gets a fresh VM — the old key no longer exists. The push DID work on Feb 11 (commit `333d884` reached GitHub). The repo has grown since then (video files, marketing HTML, etc.), making the transfer larger.

### How to Fix (Options)

**Option A — GitHub Desktop (Recommended):**
1. Download from desktop.github.com
2. Sign in with @Tredoux555
3. Add repo: File → Add Local Repository → `~/Desktop/ACTIVE/whale`
4. Click "Push origin" — uses OAuth HTTPS with better retry logic

**Option B — Push from local terminal with git-lfs or shallow:**
```bash
# From ~/Desktop/ACTIVE/whale on Mac
git push origin main
```
If SSL errors persist with Astrill VPN, try:
- Switch VPN protocol (OpenVPN → WireGuard or vice versa)
- Try pushing with VPN briefly disconnected (GitHub isn't blocked in all networks)

**Option C — Create a GitHub Personal Access Token:**
1. GitHub → Settings → Developer Settings → Personal Access Tokens → Generate
2. Use as password with HTTPS remote:
   ```bash
   git remote set-url origin https://Tredoux555:<TOKEN>@github.com/Tredoux555/whale-class.git
   git push origin main
   ```

## Email Setup — ✅ Complete

Created `tredoux@montree.xyz` email forwarding via Cloudflare Email Routing → `tredoux555@gmail.com`. Intended for new LinkedIn account registration (old account locked due to China location mismatch).

## Facebook Group Posting — Continued

Additional groups posted to during this session:
- Montessori Research Interest Group
- McDaniels International Montessori (Virtual)

Total Facebook groups posted to: **17** (combined reach ~815K+ members)

## SSH Key Added to GitHub

New key "Cowork VM Feb 14" added to GitHub SSH keys. The old "Cowork VM" (Feb 11) key is now stale and can be deleted.

**Current GitHub SSH keys:**
- My Mac (Nov 2025) — user's MacBook
- Cowork VM (Feb 11) — stale, can delete
- Cowork VM Feb 14 — current session (works for auth, push fails due to repo size)

## Bug Fix

`html2canvas` → `html2canvas-pro` in `components/montree/FeedbackButton.tsx` (Tailwind CSS v4 `lab()` color function compatibility)

## Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| Push commit 549b589 to GitHub | **CRITICAL** | Social Media Manager not deployed. Try GitHub Desktop or PAT |
| Post Video 3 (Tutorial) on LinkedIn | Low | User will edit down first |
| Create LinkedIn company page | Medium | Needs accepted connections |
| Join more LinkedIn groups | Low | User doing manually; rate-limited |
| LinkedIn Premium signup | Low | Payment errors, try without DevTools |
| YouTube uploads | Medium | 3 videos ready, not yet uploaded |
| Delete stale "Cowork VM" SSH key | Low | Feb 11 key no longer works |

## Files Created/Modified This Session

**New files:**
- `LINKEDIN_READY_TO_EXECUTE.md` — LinkedIn execution plan
- `LINKEDIN_TRANSFORMATION_PLAN.md` — LinkedIn strategy doc
- `MONTREE_LINKEDIN_SETUP_GUIDE.docx` — LinkedIn setup guide
- `OPUS_LINKEDIN_HANDOFF.md` — LinkedIn handoff from previous session
- `OPUS_LINKEDIN_PROMPT.md` — LinkedIn prompt doc
- `Promo Videos/LinkedIn_Company_Banner.png` — Generated company banner
- `Promo Videos/LinkedIn_Personal_Banner.png` — Generated personal banner
- `Promo Videos/Montree Cover Picture.png` — Facebook cover photo
- `Promo Videos/Montree Logo.jpg` — Montree logo
- `docs/HANDOFF_EMAIL_SETUP.md` — Email forwarding setup
- `docs/HANDOFF_LINKEDIN_TRANSFORMATION.md` — Previous LinkedIn session handoff
- `linkedin_banner_personal.png` — Personal banner variant
- `montree_linkedin_banners_philosophy.md` — Banner design philosophy
- `docs/HANDOFF_LINKEDIN_SESSION_FEB14.md` — This handoff

**Modified:**
- `CLAUDE.md` — (pending update)
- `components/montree/FeedbackButton.tsx` — html2canvas-pro fix
