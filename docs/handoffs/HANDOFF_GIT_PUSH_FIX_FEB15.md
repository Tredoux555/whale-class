# Git Push Fix + Repo Cleanup — Handoff (Feb 15, 2026)

**Commit:** `8aa587ba` (pushed via GitHub REST API from Cowork VM)
**Status:** ✅ Push complete. Repo cleaned. Production live at montree.xyz.

---

## Problem

Git push from Cowork VM was broken — repo was 600MB+ due to Montessori Documents (PDFs, PPTX files) in the working tree and history. SSH connections to GitHub dropped every time during the large pack transfer (`SSL_ERROR_SYSCALL` / `unexpected disconnect while reading sideband packet`).

## What Was Done

### 1. SSH Key Setup
- Generated new ed25519 SSH key in VM: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKToPnKMry+9saktEV0p5aQj81JqwfkqR8gF0iCjOz2j cowork-vm-feb15`
- Added to GitHub as "Cowork VM Feb 15" via Chrome automation
- SSH auth works (`ssh -T git@github.com` succeeds)
- Git push still fails due to repo size (600MB pack)

### 2. GitHub PAT Created
- Fine-grained token: `cowork-push-feb15`
- Scope: whale-class repo only, Contents read/write + Metadata read-only
- Expires: March 17, 2026
- Used for REST API push (bypasses git protocol size limits)

### 3. Repo Cleanup via REST API
- Removed 67 files from `Montessori Documents/` directory on remote
- Updated `.gitignore` to block `Montessori Documents/` and `generated-images/`
- All Montree Home code (phases 1-4) confirmed present on remote (was pushed from Mac Desktop earlier)

### 4. Production Verified
- montree.xyz is live
- "Parent at Home" option visible on try page
- All key files confirmed on remote: teacher auth, guru checkout, curriculum browser, migrations, prompt builder

## Key Files

| File | What |
|------|------|
| `.gitignore` | Updated — blocks Montessori Documents/, generated-images/ |
| `push-api.py` | REST API push script (in Cowork VM session, not in repo) |
| `push-v2.py` | Improved version with SSL retry + batching |

## GitHub State

- **SSH keys on account:** "My Mac" (Nov 2025), "Cowork VM" (Feb 11, stale), "Cowork VM Feb 14", "Cowork VM Feb 15" (current)
- **PATs:** `cowork-push-feb14` (active, expires Feb 14 2027), `cowork-push-feb15` (active, expires Mar 17 2026), `jeffyb-push-mac-2025-10` (expired)
- **Remote HEAD:** `8aa587ba` — "deploy: Montree Home (all 4 phases) + cleanup"

## Git Push Method (for future sessions)

**Normal `git push` STILL WON'T WORK** from the Cowork VM if the repo is large. Use the GitHub REST API method:

1. Read PAT from file (or create new one via Chrome)
2. Get remote tree via API
3. Diff local files against remote
4. Upload changed files as blobs
5. Create new tree → commit → update ref

Push scripts: `push-api.py` or `push-v2.py` (saved in Cowork VM session directory, not committed to repo).

## Next Steps

1. **Guru knowledge update** — 3 new books to add to the Guru's knowledge base
2. **Search bar** — Add search functionality (location TBD)
3. **Run migrations** — `migrations/126_homeschool_tables.sql` + `migrations/127_guru_freemium.sql` still not run against Supabase
4. Clean up stale SSH keys on GitHub ("Cowork VM" Feb 11 can be deleted)
