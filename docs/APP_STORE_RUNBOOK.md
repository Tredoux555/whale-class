# Montree → App Store: Runbook (what's done, what's yours)

**Updated:** Jun 12, 2026, overnight. Branch: `audit-cleanup-jun2026`.
The Montree app is a **thin native wrapper**: the native app loads `https://montree.xyz` in a
webview, so you don't maintain two codebases — the app IS your live site, in an App Store shell
with native camera/mic/push and offline handling.

---

## ✅ DONE tonight (committed to the branch)

1. **In-app account deletion (Apple's #1 auto-rejection, Guideline 5.1.1(v))** — ported from the
   stale `appstore/account-deletion` branch onto current code (the branch was months behind and
   would have deleted recent work if merged). Role-aware: a teacher deletes just their login; a
   homeschool parent or last-principal deletes the whole school (typed-confirmation gated); a
   portal parent deletes their parent account. Wired into Settings (teacher + admin) and a new
   Parent → Account page. Writes an audit row before deleting. **Needs: run the SQL below.**
2. **App icon + splash** — generated from your brand "M" (gold on dark green) into every iOS size.
3. **Permission usage strings** (camera/photos/mic) + **PrivacyInfo.xcprivacy** privacy manifest —
   present in `ios/` and now committed to git so they can't be lost.
4. **Offline fallback** — `MontreeViewController.swift` shows a branded "you're offline" page
   (instead of a white screen) if montree.xyz can't load; auto-retries on reconnect. ⚠️ verify on
   a simulator with Airplane Mode (see step 6).
5. **Android permissions** — camera/mic/media/push added to the manifest (had only INTERNET).
6. **ios/ and android/ are now tracked in git** — all native config persists across rebuilds.
7. **Bundle id** `xyz.montree.app`, display name **Montree**, Capacitor 8 (Swift Package Manager).

## 🟦 RUN THIS SQL FIRST (Supabase SQL editor)
Creates the account-deletion audit table. Without it, account deletion errors.
```sql
CREATE TABLE IF NOT EXISTS montree_account_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  account_kind TEXT NOT NULL,
  account_name TEXT,
  account_email TEXT,
  school_id UUID,
  mode TEXT NOT NULL,
  requested_by UUID,
  reason TEXT NOT NULL DEFAULT '',
  children_count_at_deletion INTEGER NOT NULL DEFAULT 0,
  teachers_count_at_deletion INTEGER NOT NULL DEFAULT 0,
  media_count_at_deletion INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_school ON montree_account_deletion_audit (school_id, deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_account ON montree_account_deletion_audit (account_id, deleted_at DESC);
ALTER TABLE montree_account_deletion_audit ENABLE ROW LEVEL SECURITY;
```
(Also saved at `migrations/250_account_deletion_audit.sql` and `db/RUN_THESE/03_*.sql`.)

---

## 👤 YOUR STEPS — the parts only you can do (no agent can)

These need your Apple ID, your money, and Xcode on your Mac. ~half a day the first time.

### A. One-time setup
1. **Apple Developer Program** — enrol at developer.apple.com ($99/year). Required to upload anything.
2. **Deploy the branch first** — merge `audit-cleanup-jun2026` to main so account-deletion (and the
   other fixes) are LIVE on montree.xyz BEFORE you submit. The app loads the live site, so a
   reviewer tapping "Delete account" hits production. Run the SQL above in the same window.

### B. Build the app in Xcode (network must be stable — the package download flaked overnight)
3. In Terminal: `cd ~/Desktop/Master\ Brain/ACTIVE/whale && bash scripts/build-native.sh ios`
   (this refreshes the wrapper + opens Xcode). Or just open `ios/App/App.xcodeproj`.
4. **Let Swift Package Manager finish** — on first open Xcode downloads the plugin packages
   (camera, filesystem, push, etc.). This needs a stable connection; overnight your Mac's GitHub
   connection was dropping, so if it stalls, just let Xcode retry (File → Packages → Resolve).
5. **Signing:** select the **App** target → Signing & Capabilities → check "Automatically manage
   signing" → pick your Team. Xcode creates the certificate + provisioning profile for you.
6. **Run on a simulator** (▶) to smoke-test: log in, take a photo, then toggle the simulator to
   Airplane Mode and relaunch — confirm the branded **offline page** appears (not a white screen),
   then turn network back on and confirm montree.xyz reloads.

### C. Push notifications (optional but the strongest "more than a website" signal for review)
7. In Signing & Capabilities, add the **Push Notifications** capability. (Wiring a real APNs test
   send is a follow-up; the capability + permission are what review looks for.)

### D. Submit
8. Plug in / select **Any iOS Device**, then **Product → Archive**.
9. In the Organizer that opens → **Distribute App → App Store Connect → Upload**.
10. In **App Store Connect** (appstoreconnect.apple.com), create the app record (bundle id
    `xyz.montree.app`), fill in:
    - **Privacy policy URL:** https://montree.xyz/privacy (page is live).
    - **App Privacy "nutrition label":** declare Contact info (name/email), User content
      (photos/observations/messages/voice/reports), Identifiers (account id) as *collected,
      linked to identity, NOT used for tracking*. Tracking = **No**. (Full answers in
      `docs/handoffs/imported-2026-06/APPLE_PREFLIGHT_CHECKLIST.md`.)
    - **Category:** Education. **Do NOT** enrol in the Kids Category. **Age rating:** 4+.
    - **App Review notes (CRITICAL — instant rejection without it):** the app is 100% behind login,
      so give the reviewer a **working demo account** (a real teacher login on a test school) and
      add: *"This is a B2B tool for schools; children do not log in. Subscriptions are billed to
      schools via Stripe outside the app (no consumer in-app purchase)."*
    - Screenshots: 6.7" iPhone (required) + 12.9" iPad if you list iPad. Take them from the
      simulator running the app.

---

## 🤖 Android (later — needs one install)
The Android project + permissions are ready, but building it needs a **Java JDK** (not installed
on your Mac). When you want Android: `brew install --cask temurin` (JDK) + Android Studio, then
`bash scripts/build-native.sh apk` for a sideloadable APK, or open `android/` in Android Studio
for a Play Store bundle. iOS is the priority; Android can follow.

## Honest status
Everything that can be done without your Apple account + a stable network is done and committed.
The remaining work is inherently yours: enrol, sign, archive, and upload — no tool or agent can do
those for you. Budget half a day for the first submission, mostly waiting on Xcode and filling in
App Store Connect.
