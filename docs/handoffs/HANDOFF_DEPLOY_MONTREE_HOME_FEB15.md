# Montree Home Deploy — Handoff (Feb 15, 2026)

**Commit:** `d04eb483` (pushed via GitHub REST API)
**Status:** ✅ Code pushed to GitHub main. Railway auto-deploy triggered.

---

## What Was Pushed

30 files — all 4 phases of Montree Home + FeedbackButton fix + migrations + handoff docs:

### Modified Files (17)
- `app/api/montree/auth/teacher/route.ts` — Handles homeschool parent role in auth
- `app/api/montree/guru/route.ts` — Freemium gate (3 free prompts for homeschool parents)
- `app/api/montree/try/instant/route.ts` — "I'm a parent" signup option
- `app/montree/dashboard/[childId]/page.tsx` — Child vs student labels
- `app/montree/dashboard/curriculum/page.tsx` — Browse Guide button
- `app/montree/dashboard/guru/page.tsx` — Paywall modal, trial counter, checkout flow
- `app/montree/dashboard/page.tsx` — Homeschool dashboard trimming
- `app/montree/dashboard/students/page.tsx` — Child vs student labels, hide Labels button
- `app/montree/login/page.tsx` — Unified login (handles both roles)
- `app/montree/onboarding/page.tsx` — "Enter My Home", "Add Your Children" for parents
- `app/montree/try/page.tsx` — Third signup option ("I'm a parent")
- `lib/montree/auth.ts` — `isHomeschoolParent()` helper
- `lib/montree/guru/prompt-builder.ts` — Homeschool addendum for Guru system prompt
- `lib/montree/server-auth.ts` — 30-day JWT TTL for homeschool parents
- `lib/montree/types.ts` — Extended AREA_CONFIG
- `lib/montree/verify-request.ts` — Role in auth verification
- `components/montree/FeedbackButton.tsx` — Mobile fix (close-reopen pattern)

### New Files (13)
- `app/api/montree/auth/homeschool/route.ts` — Dead file (created early, never called, delete later)
- `app/api/montree/guru/checkout/route.ts` — Stripe Checkout session creation
- `app/api/montree/guru/status/route.ts` — Guru access level checker
- `app/api/montree/guru/webhook/route.ts` — Stripe webhook handler
- `app/montree/dashboard/curriculum/browse/page.tsx` — Read-only curriculum browser (515 lines)
- `migrations/126_homeschool_tables.sql` — Homeschool parent DB support
- `migrations/127_guru_freemium.sql` — Guru freemium columns on montree_teachers
- `docs/HANDOFF_MONTREE_HOME_PHASE1.md`
- `docs/HANDOFF_MONTREE_HOME_PHASE2.md`
- `docs/HANDOFF_MONTREE_HOME_PHASE4.md`
- `docs/HANDOFF_FEEDBACKBUTTON_FIX_FEB14.md`
- `.gitignore` — Blocks video files
- `CLAUDE.md` — Updated brain

---

## Repo Cleanup Attempted

### Problem
Repo was 1.8GB due to large video/document files committed to git history (Promo Videos, Montessori Documents, public/videos). This caused `git push` to time out every time.

### What Was Done
1. Installed BFG Repo Cleaner on Mac (`brew install bfg`)
2. Backed up all uncommitted Montree Home files to `~/Desktop/whale-backup-feb15/`
3. Deleted large files from working tree (Promo Videos/, Montessori Documents/, public/videos/)
4. Cloned bare mirror, ran `bfg --strip-blobs-bigger-than 5M`, ran `git gc --aggressive`
5. Force pushed cleaned mirror to GitHub (SSH, "Everything up-to-date")
6. Re-cloned locally from mirror, restored Montree Home files

### What Didn't Work
- Normal `git push` from Mac kept failing with `LibreSSL SSL_ERROR_SYSCALL` — connection drops mid-transfer
- This happened on both HTTPS and SSH, even after increasing `http.postBuffer` to 1GB
- Root cause: macOS LibreSSL has a known bug with large transfers, especially on IPv6 networks

### What Did Work
- **GitHub REST API push from Cowork VM** — sends files one at a time as individual HTTP requests, each ~few KB, with automatic retries. All 30 files pushed successfully as commit `d04eb483`.

### Permanent Fix for Mac Git Push (Partially Applied)
1. ✅ `brew install git` — Homebrew git (v2.53.0, uses OpenSSL) now active at `/opt/homebrew/bin/git`
2. ⚠️ `sudo networksetup -setv6off Wi-Fi` — Password failed, needs retry
3. Test with: `git push origin main` after IPv6 is disabled

### Mac Local State
- `~/Desktop/ACTIVE/whale-clean/` — Fresh git init with clean history (no video blobs), 60MB .git
- `~/Desktop/ACTIVE/whale-old/` — Original repo (1.8GB .git), can be deleted
- `~/Desktop/ACTIVE/whale-class-mirror.git/` — BFG-cleaned bare mirror, can be deleted
- `~/Desktop/whale-backup-feb15/` — Backup of Montree Home files, can be deleted after verifying deploy
- `~/Desktop/ACTIVE/whale/` — Cloned from mirror, has Montree Home files restored. This is the working repo.

---

## Still Needed

1. **Run DB migrations** against Supabase:
   - `migrations/126_homeschool_tables.sql`
   - `migrations/127_guru_freemium.sql`

2. **Set Stripe env vars on Railway** (when ready for paid Guru):
   - `GURU_FREEMIUM_ENABLED=true`
   - `STRIPE_PRICE_GURU_MONTHLY`
   - `STRIPE_WEBHOOK_SECRET_GURU`

3. **Delete dead file:** `app/api/montree/auth/homeschool/route.ts`

4. **Clean up Mac directories:**
   ```bash
   rm -rf ~/Desktop/ACTIVE/whale-old
   rm -rf ~/Desktop/ACTIVE/whale-class-mirror.git
   rm -rf ~/Desktop/whale-backup-feb15
   ```

5. **Retry IPv6 disable** (fixes Mac git push permanently):
   ```bash
   sudo networksetup -setv6off Wi-Fi
   ```
