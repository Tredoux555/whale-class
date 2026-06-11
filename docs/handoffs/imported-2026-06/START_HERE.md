# Montree — Start Here (single source of truth)

*Updated 2026-06-06. If you only read one file, read this. Everything else is detail.*

## The one path (there is no fork)

The pilot and the app-store launch need the **same** work. So it's one ordered list:

1. ✅ **Security hardening** — done & live (the big win: closed a real data leak).
2. ✅ **Privacy policy** — published at montree.xyz/privacy (live this deploy).
3. ⬜ **In-app account deletion** — *next build.* Apple-mandatory + lets pilot parents revoke. Pure code, no accounts needed.
4. ⬜ **Error tracking + basic logging** — makes the pilot measurable; survives review & real use. Pure code.
5. ⬜ **Run the pilot** — one friendly school, 1–2 classrooms, on web + TestFlight/Play-closed, with a real consent step. Fix what breaks.
6. ⬜ **Public store launch** — armed with proof + a clean privacy story.

You don't have to choose anything. I work down this list.

## Done today (all live on `main` unless noted)

- Closed the anon-key data leak (RLS lockdown) — verified.
- Cut the 365-day login token to 30 days.
- Confirmed the public admin password is dead in code.
- Added CI guards (tenant-scoping, TS-error budget) + first tests.
- Published the privacy policy page.
- App Store pre-flight: found 4 guaranteed-rejection issues; fixed the two iOS ones (permission strings, privacy manifest) on branch `appstore/phase1-native`; built the brand icon/splash + offline screen.

## What's left, in order

| # | Item | Who | Blocked by |
|---|------|-----|-----------|
| 3 | In-app account deletion | me | nothing — building next |
| 4 | Error tracking + usage logging | me | nothing |
| — | Delete `NEXT_PUBLIC_ADMIN_PASSWORD` + strengthen super-admin password | you | Railway access (~5 min) |
| — | Apple + Google developer accounts | you | your ID + card |
| — | Install Android Studio + JDK | you | — |
| 5 | Pilot (recruit 1 school) | you + me | items 3–4 |
| 6 | Store submission | you + me | accounts, toolchain, items 3–4 |

## Where everything lives (the detail docs)

- **This file** — the plan. Start here.
- `APPLE_PREFLIGHT_CHECKLIST.md` — every Apple guideline mapped to your code; submission assets.
- `PRIVACY_POLICY_DRAFT.md` — source text (now also live at montree.xyz/privacy).
- `APP_STORE_ROADMAP.md` — the full phased app-store plan + effort estimate.
- `HARDENING_STATUS_2026-06-06.md` — security work detail + your Railway to-dos.
- `MORNING_REPORT_2026-06-06.md` + `OVERNIGHT_BUILD_PLAN.md` — earlier security session records.

## Branches

- `main` — all security + privacy work, deployed.
- `appstore/phase1-native` — native shell (icon, splash, offline, iOS preflight fixes). Not merged; native-only, doesn't affect the web app.
