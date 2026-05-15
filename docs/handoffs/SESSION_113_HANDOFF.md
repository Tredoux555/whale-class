# Session 113 — Brand Credibility Build + Offline-First Reality Check

**Session window:** Friday May 15 2026 → overnight Saturday May 16 2026
**Lead:** Desktop Claude (Opus 4.7), running in Cowork mode with direct codebase access
**Collaborator:** "Browser Claude" (Tredoux's parallel session for live verification of montree.xyz, HK Companies Registry, Google Search Console, LinkedIn setup walkthrough)
**Commits pushed to `origin/main`:** 7 (ba179bfb → 2363e5a1)

---

## Headline

Started the day building Montree's corporate credibility surface — `/montree/about` page with brand-aligned visual treatment + Schema.org Organization JSON-LD. Migrated the existing M-monogram favicon from a single-size 16x16 to a multi-size .ico (16/32/48) so Google's SERP will actually display the M next to search results. Wrote the LinkedIn company About copy and the Cloudflare Email Routing walkthrough.

Mid-session pivoted to a strategic conversation about turning Montree into a "real" native app on app stores. Honest scoping produced a Capacitor-not-React-Native recommendation, plus the realization that offline-first matters more than the app-store wrap for the actual school-WiFi-drops pain.

User asked for a weekend build plan, then went to bed asking me to "see how much you can do on auto run." Overnight: shipped the og-image redesign, then ran a deep investigation of the offline + Capacitor state in the codebase. **Significant discovery: most of "Phase A" from the weekend plan is already built and shipped.**

---

## Commits this session

| SHA | Subject | Files |
|---|---|---|
| `ba179bfb` | favicon: multi-size .ico (16/32/48) + brand logo asset for JSON-LD | 3 |
| `db545515` | about: /montree/about page with Organization JSON-LD + brand UI | 1 |
| `8030ffc8` | docs: weekend build plan — offline-first phases A/B/C + open quick wins | 1 |
| `5879fa7a` | sitemap: add /montree/about (priority 0.8, monthly) | 1 |
| `b8be72fe` | docs: LinkedIn About copy + Cloudflare Email Routing walkthrough | 2 |
| `bcfa1eed` | og-image: rebrand to dark forest + Lora gold M monogram | 2 |
| `2363e5a1` | docs: investigation findings — offline + Capacitor state is further along than plan assumed | 2 |

---

## A. Brand credibility shipped — `/montree/about` + favicon + og-image

### A1. Favicon multi-size (commit `ba179bfb`)

`public/favicon.ico` was 486 bytes / 16x16 only. Google's SERP favicon guidance recommends multi-size with at least 48x48. Regenerated from `public/Montree Logo - M.png` (1024x1024 brand asset) using Pillow's ICO writer with sizes `[(16,16), (32,32), (48,48)]`. Verified post-write via `IcoImageFile.ico.sizes()` — all three sizes embedded. New file is 3.8 KB.

Also created two new clean-URL logo assets:
- `public/logo-1024.png` (167 KB) — clean URL for the Organization JSON-LD logo field. Replaces the spaces-in-filename `Montree Logo - M.png`.
- `public/logo-512.png` (60 KB) — smaller variant for any future surface.

Other icon files (`favicon-32x32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) were already correctly rendered with the Lora gold M on dark forest — verified via dominant-color analysis showing 3.0-3.4% of pixels in brand-gold range, consistent with the M character at 119pt in a 192px square. They were created during Session 87/100 brand-kit work.

### A2. `/montree/about` page (commit `db545515`)

New file `app/montree/about/page.tsx` — 383 lines. Server component (no `'use client'`) so Next.js Metadata API works. Visual aesthetic mirrors the `/montree` landing page (dark-forest gradient, Lora serif headings, gold accent on labels and the M monogram).

Three sections per the locked v2 copy:

1. **Overview** — what Montree is, multi-tenant model
2. **Built by a practicing Montessori teacher** — founder story (the differentiator)
3. **Company** — formal facts as a `<dl>` (legal name, jurisdiction, BRN 80261361, founded 23 April 2026, registered office, website, contact)

SEO + metadata:
- `<title>About Montree — Montessori School Management Platform</title>`
- Meta description ~152 chars
- Canonical: `https://montree.xyz/montree/about`
- Open Graph + Twitter card metadata (images: wired post-og-image-rebrand in commit `bcfa1eed`)

Schema.org Organization JSON-LD inline with all polish items applied per Browser Claude review:

- `name`: "Montree Limited"
- `legalName`: "Montree Limited" (entity-graph trading-name vs legal-entity disambiguation)
- `alternateName`: "Montree"
- `logo`: `https://montree.xyz/logo-1024.png`
- `foundingDate`: "2026-04-23"
- `addressLocality`: "Hong Kong" (`addressRegion` dropped — HK has no separate regions)
- `addressCountry`: "HK"
- `email`: "hello@montree.xyz"
- `identifier`: BRN 80261361 as a Schema.org PropertyValue

Browser Claude verified production after deploy: page renders, JSON-LD validates in Google Rich Results Test (2 valid items — Organization + the existing root SoftwareApplication — every field parsed including BRN PropertyValue), favicon multi-size confirmed, all assets return 200.

### A3. Sitemap (commit `5879fa7a`)

Browser Claude flagged that `montree.xyz/sitemap.xml` (already 5 URLs) didn't yet include `/montree/about`. Audit found the sitemap is generated by `app/sitemap.ts` (Next.js App Router dynamic sitemap convention — NOT next-sitemap, NOT a static `/public/sitemap.xml`). Added `/montree/about` entry with priority 0.8, monthly change frequency.

Important architectural note: `next-sitemap` package is NOT installed. Future agents should NOT install it — it would conflict with the existing dynamic sitemap. All sitemap edits go in `app/sitemap.ts`.

### A4. og-image rebrand (commit `bcfa1eed`)

Existing `public/og-image.png` was off-brand teal sans-serif M (predated the dark-forest gold-M brand). Replaced with 1200x630 PNG matching the favicon palette exactly:

- Dark forest base `#0a261a` with subtle radial emerald glow upper-right (matches `/montree` landing page background)
- Lora gold M monogram in rounded square (mini favicon style, 220x220, gold border)
- "Montree" wordmark in Lora 96pt gold
- "Montessori School Management" tagline in Poppins 34pt white
- "montree.xyz" subtle gold bottom-right

Rendered via Pillow + Lora-Variable + Poppins-Light TTF fonts (already installed in the sandbox). 52 KB. Wired `images:` into both the openGraph and twitter metadata blocks on `/montree/about` (was deliberately omitted in the initial About page commit because the existing og-image was off-brand). Root `app/layout.tsx` already references `og-image.png` for the homepage — picks up the new image automatically.

Cloudflare cache may need purge for the new image to appear in social share cards immediately. Otherwise propagates within ~24h.

---

## B. Companion docs written

| Path | Purpose | Lines |
|---|---|---|
| `docs/marketing/linkedin-company-about.md` | LinkedIn company page About section copy (~1788 chars), tagline (96 chars), other LinkedIn fields to populate | 75 |
| `docs/operations/CLOUDFLARE_EMAIL_ROUTING.md` | 5-min walkthrough to make `hello@montree.xyz` actually receive mail. Accounts for Browser Claude's discovery that DNS is already wired | 110 |
| `docs/handoffs/WEEKEND_BUILD_PLAN.md` | Original forward-looking plan for Saturday/Sunday build (now banner-flagged with scope-revision notice) | 539 + 22 |
| `docs/handoffs/EXISTING_OFFLINE_AND_CAPACITOR_STATE.md` | Investigation findings — what's actually in the codebase before tomorrow's build | 235 |

---

## C. Strategic conversation — "should we ship to app stores?"

User asked about turning Montree into a downloadable app, framed around two concerns: (1) school WiFi drops mid-morning, app needs to keep working, (2) being on app stores feels more legitimate / trustable.

Honest scoping produced this recommendation:

| Path | Time (solo) | Code reuse | Verdict |
|---|---|---|---|
| Better PWA + offline photo queue | 2-3 weeks | 100% | Highest pain-per-hour |
| Capacitor wrap, Android only | 1-2 weeks | ~95% | Cheap trust signal |
| Capacitor both stores + native camera + push | 8-12 weeks | ~85% | When revenue justifies |
| React Native rewrite | 6-8 months | ~30% | Burns runway |
| Native Swift + Kotlin | 12+ months | 0-20% | Don't |

Then the user pinned me down: "will the app actually operate if WiFi drops?" Honest answer was no — even with the photo queue I scoped, only photo capture would work offline. The rest of the app (loading rosters, marking work as practiced, identifying photos via Haiku, etc.) would still require network. True offline-first across the whole app is a 3-6 month build regardless of native vs web. Capacitor doesn't solve it; it just provides a better runtime to build it in.

The strategic conclusion (locked in): **build offline-first on the existing PWA first. Defer the app-store wrap until evidence schools are losing deals over its absence.**

---

## D. Investigation findings — offline + Capacitor state is much further along than the weekend plan assumed

After the user went to bed, ran a deep audit of what's actually in the codebase. Key findings (full detail in `docs/handoffs/EXISTING_OFFLINE_AND_CAPACITOR_STATE.md`):

### D1. The offline photo queue is ALREADY BUILT and SHIPPED

`lib/montree/offline/*` — production-hardened queue system:

- `queue-store.ts` (11.5 KB) — IndexedDB layer with atomic blob+entry transactions, content-hash dedup, single-pass stats
- `sync-manager.ts` (21.7 KB) — sync engine with 3 concurrent uploads, 90s timeout, exponential backoff, auth 401 handling, aggressive cleanup on quota exceeded
- `sync-triggers.ts` — registers visibility/online/Capacitor App.appStateChange/Capacitor Network.networkStatusChange triggers, periodic cleanup, initial sync on mount
- `types.ts` — full type system with multi-tenant awareness (school_id, classroom_id), `permanent_failure` status, upload progress with bytes/sec ETA

Code comments call out:
```
HARDENED after 10x health check audit (Mar 18, 2026):
  CRITICAL-001 through CRITICAL-005, HIGH-001, MED-002 fixes
```

Wired into the live app at three call sites (verified via grep):
- `app/montree/dashboard/capture/page.tsx` — calls `enqueuePhoto()` + `syncQueue()` on photo capture
- `app/montree/dashboard/layout.tsx:23` — calls `registerSyncTriggers()` on mount
- `app/montree/dashboard/photo-audit/page.tsx` — imports from `lib/montree/offline`

14 i18n keys exist under `offline.*` namespace in `lib/montree/i18n/en.ts` (lines 934-947 + 3407): `offline.photo`, `offline.uploading`, `offline.waitingToUpload`, `offline.syncNow`, `offline.failedToUpload`, `offline.retryAll`, `offline.retry`, `offline.photoSaved`, `offline.photosSynced`, `offline.queueFull`, `offline.offline`, `offline.backOnline`, `offline.uploaded`, `offline.failedShort`, `offline.title`.

**This means the original "Phase A" from the weekend build plan is essentially done.** The marginal work is UI surfacing — there's currently no PendingPhotosPill in the DashboardHeader and no global OfflineIndicator. The system is invisible to teachers.

### D2. Capacitor is fully scaffolded for iOS + Android

`capacitor.config.ts` at repo root with thin-webview architecture:
```typescript
{
  appId: 'xyz.montree.app',
  appName: 'Montree',
  server: { url: 'https://montree.xyz', cleartext: false },
  // ...
}
```

Folder state:
- `ios/App/App.xcodeproj` exists
- `ios/App/CapApp-SPM` (Swift Package Manager workspace)
- `android/app/build/` exists (gradle has been run)
- `scripts/build-native.sh` is the canonical build pipeline
- `lib/montree/platform.ts` exports `isNative()`, `getPlatform()`, `hasNativeCamera()`, `hasNativeFilesystem()`

Capacitor plugins installed: `@capacitor/{core,cli,ios,android,app,camera,filesystem,network,preferences,push-notifications,splash-screen}` plus `@capacitor-community/sqlite` and `@capgo/capacitor-updater`.

**Whether the apps are deployed to Google Play / App Store is unknown.** This is the single biggest open question for tomorrow morning. If yes — Tredoux's "make it a real app" question is partially answered. If no — ask why the previous deployment attempt was paused.

### D3. Older orphan: `lib/media/*`

Predecessor offline system from "Session 54" (Feb 2026). Files date Feb 15. DB name `whale-media`. No multi-tenant awareness. **Zero imports from `app/` or `components/` confirmed via grep.**

Status: dead code. Recommendation: delete in tomorrow's session. Reduces tech debt and prevents future agents from being confused which system is canonical.

---

## E. Final task queue state

```
✓ #1   Render M monogram into favicon + icon suite
✓ #2   Implement /montree/about page with v2 copy + Organization JSON-LD
✓ #3   Draft LinkedIn company page About section
✓ #4   Cloudflare Email Routing walkthrough for hello@montree.xyz
✓ #5   Audit existing sitemap setup
✓ #6   Redesign og-image.png to match brand
✓ #7   Phase A — Offline photo capture queue (CLOSED — already built, see D1)
  #8   Phase B — Persistent read cache + offline navigation (genuinely pending, ~4-6h)
  #9   Phase C — Full offline edit queue (SCOPING ONLY this weekend)
  #10  UI surfaces for the existing offline photo queue (NEW — ~4-6h, highest leverage)
  #11  Delete orphan lib/media/* offline system (NEW — ~30 min)
  #12  Verify Capacitor app store deployment status (NEW — ask Tredoux)
```

---

## F. Architectural rules locked in this session

1. **The Schema.org Organization JSON-LD on `/montree/about` is canonical.** All future schema additions (Knowledge Panel signals, sameAs, additionalProperty) extend this object, not create duplicates.
2. **`name`, `legalName`, `alternateName` all live on Organization schema for entity-graph disambiguation.** Trading name (`name`/`alternateName: "Montree"`) is distinct from legal entity (`legalName: "Montree Limited"`). Don't collapse them.
3. **Hong Kong addresses use `addressLocality: "Hong Kong"` and OMIT `addressRegion`.** HK has no separate regions; including a region field is incorrect.
4. **The sitemap lives at `app/sitemap.ts` (Next.js App Router dynamic).** Do NOT install `next-sitemap` — it would conflict. All URL additions go in this file.
5. **`favicon.ico` is multi-size (16/32/48 minimum) per Google's SERP recommendation.** Single-size .ico files may be downgraded in display.
6. **`/public/logo-1024.png` is the canonical Organization JSON-LD logo URL.** Clean URL (no spaces). Replaces the legacy `Montree Logo - M.png`.
7. **`/public/og-image.png` is brand-aligned dark-forest + Lora gold M.** Off-brand colors (teal, mint) are not allowed on this asset.
8. **The `lib/montree/offline/*` system is the canonical offline photo queue.** `lib/media/*` is deprecated — to be deleted. Don't add new code that imports from `lib/media/*`.
9. **`registerSyncTriggers()` is called once in `app/montree/dashboard/layout.tsx`.** Don't re-register elsewhere — the function is idempotent but multiple registrations would double-fire sync triggers.
10. **`isNative()` from `lib/montree/platform.ts` is the canonical Capacitor detection.** Don't sniff the user agent. Use this helper for any code path that needs to branch web vs native.

---

## G. Open questions for Tredoux to answer in the morning

1. **Are the Capacitor iOS/Android apps deployed to app stores currently? If not, what stopped the previous attempt?** This single answer reshapes the rest of the weekend's priorities. (Tasks #10 vs #12.)
2. **Is there any visible UI surface today showing teachers how many photos are pending upload?** If yes, point me to it and skip task #10. If no, build it.
3. **`lib/media/*` — anything still depending on it I should know about before deleting?** My grep showed zero imports. Verifying with you before `rm -rf`.
4. **Phase C urgency — is the "edit data offline" gap actually losing deals, or is it theoretical?** Helps prioritize Phase C scoping depth Sunday.

---

## H. Production verification checklist (after Railway has fully deployed all 7 commits)

1. Hard-refresh `https://montree.xyz/favicon.ico`. File should be ~3.8 KB. Multi-size .ico contains 16+32+48.
2. `https://montree.xyz/logo-1024.png` returns 200, renders the Lora gold M on dark forest at 1024x1024.
3. `https://montree.xyz/montree/about` renders the new page with three sections, BRN 80261361 visible in the Company facts block, dark-forest aesthetic.
4. View source on `/montree/about` and confirm: title tag matches, meta description ~152 chars, canonical link, JSON-LD with `legalName`, `logo`, `foundingDate`, BRN identifier.
5. `https://montree.xyz/og-image.png` returns 200, renders the new brand-aligned dark-forest gold-M version (NOT the old teal sans-serif).
6. `https://montree.xyz/sitemap.xml` includes `/montree/about` (6 URLs total now).
7. Run the rendered JSON-LD through Google's Rich Results Test (https://search.google.com/test/rich-results) — should validate Organization with no errors.
8. Open `/montree/about` in incognito mobile Safari. Confirm meta + OG tags render via "Share" → preview card shows brand-aligned og-image.

---

## I. Carry-overs from prior sessions still pending

These came over from Session 112's handoff and are NOT addressed in this session — surfacing here so they don't get lost:

1. **"Correct" button modal regression on photo audit** — needs clarification which card type triggers it
2. **"Other" category build** for photos not in curriculum
3. **Stripe webhook event subscription** (Step 1 post-migration operational walkthrough)
4. **Railway crons** for `generate-alipay-invoices` + `dunning-alipay`
5. **HK banker email** re Wallex + Alipay/WeChat payouts
6. **Haiku i18n batch** for 10 non-zh locales

---

## J. Suggested first action when you wake up

1. Read `docs/handoffs/EXISTING_OFFLINE_AND_CAPACITOR_STATE.md` (235 lines, ~5 min)
2. Read this doc top-to-bottom (~3 min)
3. Answer the four questions in section G above (5 min)
4. Decide which tracks to run this weekend. My recommendation:
   - **Track A (highest leverage):** Build the UI surfaces for the existing offline queue (task #10). 4-6h. Turns invisible engineering into a visible product feature with marketing screenshot value.
   - **Track B:** Persistent read cache (task #8). 4-6h. The genuine "Phase B" from the original weekend plan still applies.
   - **Track C:** Phase C scoping doc (task #9). 2-3h Sunday afternoon. No code, just architecture for the future 3-4 week sprint.
   - **Skip if uncertain:** Capacitor app-store deployment (task #12). Operational, may need Apple/Google account setup, doesn't conflict with A/B/C — pursue later.

---

## K. CLAUDE.md status

**`CLAUDE.md` was NOT updated this session.** The canonical project pattern is to add a Session N entry to the top of the RECENT STATUS section after each session, but I prioritized shipping the work + the handoff doc above the journal entry. **This is a real gap.**

Recommended morning action: either ask the next session to draft the CLAUDE.md insertion based on this handoff doc, or do it manually. The pattern from Session 112's entry would be: add a new `## RECENT STATUS (May 15-16, 2026)` section above the existing May 14 section, with a `### 🏛 Session 113 — Brand credibility build + offline state investigation` entry pointing at this handoff for full detail.

Estimated effort: ~30 min focused, including reading this handoff and condensing it appropriately for the CLAUDE.md format.

---

End of Session 113 handoff. Ship well tomorrow.
