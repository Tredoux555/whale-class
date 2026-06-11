# Handoff — New-class voice onboarding failure (2026-06-09)

Pushed to `main` (commit `19a62fbc`), Railway auto-deploying. A user reported they couldn't set up a new class via voice onboarding.

## What was actually happening

A **brand-new trialing school** ("Home", created today, `subscription_status: trialing`, 1 child "Marina") tried voice onboarding. The console showed transcription succeeded (Whisper), then `POST /api/montree/children/…/onboard` → **HTTP 402**, and the panel showed a confusing **"WATCHDOG — pipeline hung."**

Root cause, two layers:
1. **Trial = no AI.** `resolveReportModel` only granted AI if the school had an `ai_tier_haiku`/`ai_tier_sonnet` feature flag. A new trial has neither, so it resolved to `free` → the onboard route's AI gate returned **402**. So a trial was **paywalled out of its own first onboarding** — the worst moment for it.
2. **The UI masked the real reason.** The 90s watchdog was only cleared on success/throw, so the 402 error path leaked it; 90s later it fired and overwrote the real "402 / needs upgrade" with a generic "pipeline hung."

## The fix (your call: give trials Haiku)

- **`lib/montree/reports/resolve-model.ts`** — added a **Haiku floor** for `subscription_status` `trialing` or `active`: a trial now gets Haiku even without an explicit flag. This unblocks all the AI features a trial is *meant* to demo (voice onboarding, reports, guru). Onboard already calls the AI with `aiTier.model`, so it runs on cheap Haiku (~$0.10/class/week). Trials that expire (status → past_due/canceled) drop back to free automatically.
- **`app/montree/dashboard/voice-onboarding/page.tsx`** — clear the watchdog on **every** terminal path (was leaking on all error branches → false "pipeline hung"); and on a 402/`requires_upgrade`, show a clean **"Voice setup needs an AI plan — Upgrade / Set up by hand"** screen instead of a raw debug dump. (The "Set up by hand" button drops them to the dashboard to add children manually — no AI.)

## Audited
- TypeScript: **0 new errors** in both files.
- Verified every referenced style/var exists; watchdog now cleared in all 6 terminal branches + helper.
- Traced end-to-end: trialing → Haiku → onboard gate passes → `anthropic.messages.create({ model: aiTier.model })` runs on Haiku. Residual genuinely-free schools get the clean upgrade screen, no hang.
- Diff reviewed (66 insertions, 1 deletion).

## Note
The reported user ("Home" school) will now succeed on retry once deployed. No DB change needed — the floor is computed from `subscription_status`.
