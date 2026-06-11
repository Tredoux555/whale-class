# Apple App Store — Pre-Flight Checklist (Montree)

*Built 2026-06-06 from the current App Store Review Guidelines + a check of your actual code. Goal: zero surprises in review. Status legend: ✅ done · 🔧 fixed today · ⚠️ gap (must do) · 👤 your action in App Store Connect.*

## Headline

The pre-flight found **4 guaranteed-rejection issues**. Two I fixed today in code; two are real builds still needed before submitting. One reassurance: you use your own email/password login, so **Sign in with Apple is not required**.

## Rejection-risk checklist

| Guideline | Requirement | Status | Notes |
|---|---|---|---|
| 5.1.1(v) | In-app account deletion (not just deactivate) | 🔧 **built** | Self-service "Delete account" shipped on branch `appstore/account-deletion` (Settings → Delete account; parent portal → Account). Role-aware, typed confirmation for destructive purges, FK-less audit (mig 247). Needs: apply mig 247 + merge + deploy. |
| 5.1.4 / 1.3 | Privacy policy (mandatory — you handle minors' data) | ⚠️ **GAP** | Draft written (`PRIVACY_POLICY_DRAFT.md`). Needs review → publish at montree.xyz/privacy. |
| 5.1.1 | Camera/photo/mic permission usage strings | 🔧 **fixed** | Added NSCamera/NSPhotoLibrary/NSPhotoLibraryAdd/NSMicrophone usage strings to Info.plist (was empty → would crash + reject). |
| 2024 req | Privacy manifest (`PrivacyInfo.xcprivacy`) | 🔧 **fixed** | Created with tracking=false + standard required-reason API declarations. |
| 4.2 | Minimum functionality (not a "lazy wrapper" / white-screen) | 🔄 in progress | Offline page built (Phase 1); native features (push/camera) need verifying on-device. |
| 2.1 | Reviewers must get past login | ⚠️ **GAP** | App is 100% behind auth. You MUST give Apple a working demo account in App Review notes, or instant rejection. |
| 4.8 / 5.1.1 | Sign in with Apple | ✅ N/A | You use own email/password, no social login — not triggered. |
| 3.1.1 | In-app purchase vs external billing | ⚠️ check | Subscriptions are billed via Stripe to *schools* (B2B). B2B/SaaS sold outside the app is generally allowed, but confirm the app doesn't sell digital subscriptions to consumers in-app. Likely fine; flag for review notes. |

## App Privacy "nutrition label" answers (for App Store Connect)

Declare these data types as **collected**. For each: linked to identity = **Yes** (tied to accounts), used for tracking = **No** (you don't track across other companies' apps).

- **Contact info:** name, email — *App functionality, Account management*
- **User content:** photos, observations, messages, voice recordings, reports — *App functionality*
- **Identifiers:** user/account ID — *App functionality*
- **Sensitive/Children's data:** information about children is provided by schools; declare **photos + user content** honestly. Do **not** declare advertising or third-party tracking (you have none).
- **Diagnostics:** crash/error logs — *App functionality* (once you add error tracking).

Tracking section: **"No, we do not track."** Do not add any advertising SDKs — that would force a different, much worse answer for a kids-adjacent app.

## Categorization & age rating (recommended)

- **Category:** Education (primary). Do **NOT** enroll in the **Kids Category** — that's for apps aimed *at* children and bans all third-party data sharing (including Stripe/AI). Montree is a tool for *adults* (teachers/principals/parents), so it stays out of Kids Category while still needing the children's-data privacy policy.
- **Age rating:** likely **4+** (no objectionable content). Answer the rating questionnaire honestly; you don't collect data *from* kids directly.

## Submission assets you'll need (👤 you, I can help generate)

- App icon (1024, from the SVG master) · screenshots for 6.7" + 6.5" iPhone and 12.9" iPad
- Description, keywords, promo text, support URL, marketing URL
- Privacy policy URL (montree.xyz/privacy)
- App Review notes with: demo login credentials + a one-line "this is a B2B tool for schools; children do not log in."

## Fixed today (on branch `appstore/phase1-native`)

- Info.plist permission strings (camera, photos, microphone)
- `PrivacyInfo.xcprivacy` privacy manifest
- Privacy policy draft

## Still to build before submission (priority order)

1. ~~**In-app account deletion** (5.1.1(v))~~ — ✅ **BUILT** 2026-06-07 on branch `appstore/account-deletion` (adapted the admin parent-delete cascade pattern). Remaining: apply migration 247 in Supabase, merge the branch, deploy. See `HANDOFF_2026-06-07_account_deletion.md`.
2. **Publish the privacy policy** at montree.xyz/privacy (review draft → add a `/privacy` page).
3. **Phase 1 finish:** wire the offline fallback + verify push/camera on a device (needs the toolchain session).
4. **Error tracking** (also needed for the school pilot) so review-time and pilot bugs are visible.

## ⚠️ Heads-up: `ios/` is gitignored

Your native `ios/` project isn't tracked in git. So today's Info.plist + `PrivacyInfo.xcprivacy` edits exist in your working copy (good for the next build) but **aren't committed and would be lost if the native project is regenerated** (`cap add ios`). Before submission, pick one:

1. **Un-ignore + commit `ios/`** (recommended for a Capacitor app with custom native config — permission strings, privacy manifest, push entitlements all need to persist), or
2. **Inject them in `scripts/build-native.sh`** so every regenerate re-applies them.

Same applies to Android (`android/` is likely ignored too — its permission declarations need the same treatment).
