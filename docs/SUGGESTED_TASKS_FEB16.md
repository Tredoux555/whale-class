# Suggested Tasks — Feb 16, 2026

## 🚨 CRITICAL (Do Immediately)

### 1. Deploy Location Tracking Feature
**Status:** Code complete, audited, fixes applied — just needs deployment

**What's ready:**
- ✅ Code written and tested
- ✅ Audit completed (5 issues found, all fixed)
- ✅ Migration file created (128_school_location_tracking.sql)
- ✅ Changes staged in git

**Why you don't see it:** Code not pushed to GitHub → Railway hasn't deployed

**Steps:**
```bash
# A) Quick commit + push
git commit -m "feat: location tracking with audit fixes (HTTP→HTTPS, RFC1918, IPv6)"
git push origin main  # (Turn off Astrill VPN first)

# B) Run migration on Supabase
# https://supabase.com/dashboard/project/dmfncjjtsoxrnvcdnvjq/editor
# Paste contents of migrations/128_school_location_tracking.sql

# C) Verify on live site
# - Create test trial at montree.xyz/montree/try
# - Check super-admin panel → Schools tab → Location column
```

**Impact:** High visibility feature (flag emoji + city/country for every school)

---

### 2. Run Pending Montree Home Migrations
**Status:** Code deployed (Phase 1-4 all live), but migrations NOT run

**Missing migrations:**
- `migrations/126_homeschool_tables.sql` — Homeschool parent support
- `migrations/127_guru_freemium.sql` — Guru subscription columns

**Why it matters:**
- Homeschool parent signups will work (uses `montree_teachers` table)
- But Guru freemium might fail (columns missing: `guru_plan`, `guru_prompts_used`, etc.)

**Steps:**
```sql
-- Connect to Supabase SQL Editor
-- Run 126 first, then 127

-- Verify:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'montree_teachers'
AND column_name LIKE 'guru_%';
```

**Impact:** Medium (Guru paywall won't work until migration run)

---

### 3. Delete Dead Homeschool Auth Route
**Status:** File exists but unused (created in initial push, superseded by Phase 1 design)

**File:** `app/api/montree/auth/homeschool/route.ts`

**Why delete:**
- FUSE-locked in VM (can't delete from Cowork)
- Confusing for future developers
- Dead code bloat

**Steps:**
```bash
# From Mac terminal:
cd ~/Desktop/ACTIVE/whale
rm app/api/montree/auth/homeschool/route.ts
git add -A
git commit -m "chore: remove dead homeschool auth route (superseded by unified teacher auth)"
git push origin main
```

**Impact:** Low (cleanup only)

---

## 🔧 HIGH PRIORITY (Do This Week)

### 4. Fix Three-Issue Child Week View
**Status:** Code complete, needs migration + push

**What's ready:**
- ✅ Code written (19 files changed, 3 created)
- ✅ Migration created (124_child_extras_table.sql)
- ✅ Handoff doc complete

**Needs:**
- Run migration 124 on Supabase
- Push code to GitHub

**Impact:** High (fixes UX bugs teachers are experiencing)

---

### 5. Set Stripe Environment Variables
**Status:** Needed for Guru paid subscriptions (when ready to launch)

**Missing env vars on Railway:**
- `STRIPE_PRICE_GURU_MONTHLY` — Price ID for $5/month per child subscription
- `STRIPE_WEBHOOK_SECRET_GURU` — Webhook signing secret for Guru endpoint

**Steps:**
1. Create Stripe product: "Montree Guru Subscription"
2. Create price: $5/month, per-child quantity billing
3. Copy Price ID (starts with `price_`)
4. Create webhook endpoint: `/api/montree/guru/webhook`
5. Copy webhook signing secret (starts with `whsec_`)
6. Set both on Railway

**When:** Before promoting Guru subscriptions to parents

---

### 6. Add Search Functionality
**Status:** Mentioned in handoff as "scope TBD"

**Potential scopes:**
- **Option A:** Search children by name (dashboard search bar)
- **Option B:** Search works in curriculum (already has WorkSearchBar component!)
- **Option C:** Search schools in super-admin panel
- **Option D:** Global search across all entities

**Recommendation:** Start with Option A (search children by name) — most requested by teachers

**Impact:** Medium-High (teachers with 30+ students need this)

---

### 7. Update Guru Knowledge Base
**Status:** User mentioned "3 new books to add"

**What:** Add new Montessori knowledge to Guru advisor context

**Files to update:**
- `lib/montree/guru/knowledge-retrieval.ts` — Main knowledge base
- Possibly add new files in `lib/montree/guru/knowledge/`

**When:** User will provide book content

---

## 📊 MEDIUM PRIORITY (Next Week)

### 8. Test Guru Freemium Flow End-to-End
**Status:** Code deployed, migrations pending

**Test checklist:**
- [ ] Homeschool parent signup works
- [ ] Gets 3 free Guru prompts
- [ ] Paywall appears after 3 prompts used
- [ ] Checkout flow creates Stripe session
- [ ] Webhook updates `guru_plan` on subscription
- [ ] Paid users get unlimited prompts
- [ ] Homeschool-specific prompt addendum works

---

### 9. Backfill Location Data for Existing Schools (Optional)
**Status:** New schools will get location automatically

**Problem:** Existing trial schools show "Unknown" in Location column

**Options:**
- **A) Accept data loss** (analytics only, not critical)
- **B) Backfill from Railway logs** (if IP logs available)
- **C) Let old schools stay "Unknown"** (recommended)

**Recommendation:** Option C — not worth the effort

---

### 10. Build Out Social Media Manager Tool
**Status:** Guru (AI advisor) complete, 4 modules pending

**Complete:**
- ✅ Social Media Guru (chat interface with 900+ lines of knowledge)

**Pending placeholders:**
- Content Vault — Upload/manage videos with metadata
- Credentials Vault — AES-256-GCM encrypted password storage
- Post Tracker — Manual logging with platform/URL/caption
- Content Calendar — Drag-and-drop monthly calendar

**Impact:** Medium (nice-to-have for social media management)

---

## 🎨 LOW PRIORITY (Nice to Have)

### 11. Location Analytics Dashboard
**Status:** Data will be collected after migration 128

**Ideas:**
- Map view of school locations (requires mapping library)
- "Signups by Country" bar chart
- Timezone distribution pie chart
- Export to CSV with location data

---

### 12. Parent Invite Code Security Upgrade
**Status:** Explicitly deferred in Phase 9 audit

**Current:** Invite codes stored as plaintext in `montree_parent_invites`

**Why deferred:** Low priority (codes expire, limited blast radius)

**When:** If security audit requires it later

---

### 13. Nonce-Based CSP Headers
**Status:** Explicitly deferred in Phase 9 audit

**Current:** Using `'unsafe-inline'` for scripts/styles (required by Next.js)

**Better:** Nonce-based CSP with Next.js middleware

**Why deferred:** Complex, requires Next.js config changes

**Impact:** Low (current setup is acceptable for most apps)

---

### 14. Centralized Logging Service
**Status:** Phase 8 added console.warn logging, but no aggregation

**Current:** Logs scattered in Railway console

**Better:** Send to external service (Sentry, LogRocket, Datadog, etc.)

**When:** After product-market fit (adds $50-200/month cost)

---

### 15. Reseed Language Curriculum
**Status:** DB only has 18/43 language works

**Why:** Initial seed was incomplete

**Impact:** Low (teachers can add custom works for now)

**When:** Next curriculum expansion session

---

### 16. Clean Up Git Artifacts
**Status:** Old branches, stale SSH keys, Mac backup repos

**What to delete:**
- Stale GitHub SSH key: "Cowork VM" (Feb 11)
- Mac repos: `whale-clean/`, `whale-old/`, `whale-class-mirror.git/`, `~/Desktop/whale-backup-feb15/`

**Impact:** Zero (cleanup only)

---

## 📋 SYSTEMATIC IMPROVEMENTS

### 17. Migrate to Clean Montree Repo (Future)
**Status:** `github.com/Tredoux555/montree` created as clean alternative

**Why:**
- whale-class has 600MB+ .git directory (bloated)
- montree repo is 68MB clean copy
- Better for Cowork VM (faster clones)

**When:** After verifying whale-class is stable for 2+ weeks

**Steps:**
1. Point Railway to montree repo
2. Deploy and verify
3. Archive whale-class as read-only
4. Update CLAUDE.md references

---

### 18. Fix Remaining TypeScript `any` Types
**Status:** Phase 6 cleanup reduced 23→2 trivial

**Remaining:**
- Settings page (1 trivial `any`)
- Test script (1 trivial `any`)

**Impact:** Zero (these are truly trivial)

---

### 19. Remove Hardcoded x-school-id Headers
**Status:** Harmless legacy, cookie-auth checked first

**Files:** ~11 frontend files still send `x-school-id` header

**Why safe:** `verifySchoolRequest()` reads cookie first, header is fallback

**When:** Next time touching those files

---

### 20. Link PWA Manifest
**Status:** Manifest exists but not linked in HTML

**File:** `public/manifest.json`

**Why:** Progressive Web App support (install to home screen)

**Impact:** Low (nice feature for teachers on tablets)

---

## 🧪 TESTING GAPS

### 21. Test Email Sending
**Status:** Resend API key set, but not tested

**What to test:**
- Parent invite emails
- Password reset emails
- Welcome emails
- Report emails

---

### 22. Load Test Guru API
**Status:** No stress testing done

**Test:** 10 concurrent Guru requests → verify no rate limit errors

---

### 23. Test Password Policy Enforcement
**Status:** Phase 5 added policy, but manual testing incomplete

**Test checklist:**
- [ ] Reject 7-char passwords
- [ ] Require uppercase + lowercase + number
- [ ] Show helpful error messages
- [ ] Block common passwords (from list)

---

## 📊 Priority Matrix

| Task | Priority | Effort | Impact | Blocker? |
|------|----------|--------|--------|----------|
| 1. Deploy location tracking | 🔴 Critical | 15 min | High | No |
| 2. Run Montree Home migrations | 🔴 Critical | 5 min | High | No |
| 3. Delete dead auth route | 🟡 High | 2 min | Low | No |
| 4. Fix three-issue child view | 🟡 High | 10 min | High | No |
| 5. Set Stripe env vars | 🟡 High | 15 min | High | Yes (when launching paid) |
| 6. Add search functionality | 🟡 High | 4 hours | High | No |
| 7. Update Guru knowledge | 🟡 High | 2 hours | Medium | Yes (user provides books) |
| 8. Test Guru freemium | 🟢 Medium | 1 hour | High | Migration 127 |
| 9. Backfill location data | 🟢 Medium | N/A | Low | Optional |
| 10. Build social manager | 🟢 Medium | 8 hours | Medium | No |
| 11-23. Other tasks | ⚪ Low | Varies | Low | No |

---

## 🎯 Recommended This Week

**Day 1 (Today):**
1. ✅ Deploy location tracking (15 min)
2. ✅ Run migrations 126+127+128 (10 min)
3. ✅ Delete dead auth route (2 min)
4. ✅ Push three-issue fix + run migration 124 (10 min)

**Day 2:**
5. Design search bar UX (mockup/wireframe)
6. Implement child name search (4 hours)

**Day 3:**
7. Test Guru freemium end-to-end (1 hour)
8. Create Stripe products (when ready to launch paid)

**Day 4-5:**
9. Add 3 new books to Guru knowledge base (when user provides)

---

## 💡 Strategic Suggestions

### Focus on Core Product Polish
You've built a TON of features. Consider pausing new features and focusing on:
- **User onboarding:** Make first 5 minutes magical
- **Performance:** Optimize slow pages (child week view is 1,115 lines!)
- **Testing:** End-to-end test all critical flows
- **Documentation:** User-facing help docs (not just technical handoffs)

### Social Media ROI
17 Facebook group posts (~815K reach) is HUGE. Consider:
- Tracking conversion funnel: Post view → Site visit → Trial signup
- A/B test different video thumbnails
- Follow up in groups with "success stories" posts (with permission)

### Guru Monetization
Guru freemium is well-designed ($5/child/month). Consider:
- Free tier should convert ~10-20% to paid (industry standard)
- Track metrics: prompts used, upgrade clicks, checkout abandonment
- A/B test paywall messaging (features vs. pain points)

### Teacher Retention
With 90-day trials, focus on what makes teachers stick:
- Weekly check-in emails ("You recorded 15 works this week!")
- Highlight underused features (Guru advisor, reports, games)
- Capture feedback before trial expires (exit survey)

---

**Last Updated:** Feb 16, 2026, 5:30 PM
**Priority Review:** Weekly (adjust based on user feedback + Railway analytics)
