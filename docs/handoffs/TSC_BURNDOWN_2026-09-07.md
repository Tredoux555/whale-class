# TypeScript burndown — 2026-09-07

Goal: `npx tsc --noEmit -p tsconfig.json` exits clean so
`typescript.ignoreBuildErrors` can be turned **off** in `next.config.ts`.

Baseline at the start of this run: **714 errors across 197 files**
(`/work/tsc-before.txt`).

Rules followed while fixing:

- Real types, real narrowing, real signatures. No `@ts-ignore`, `@ts-nocheck`,
  `@ts-expect-error`, no blanket `as any`, no loosening `tsconfig` strictness,
  no deleting features to make an error go away.
- Dead code that the types *prove* unreachable is removed rather than typed.
- `npx vitest run` stays green after every batch.

CI: `.github/workflows/typecheck.yml` runs `tsc --noEmit` + `vitest` on every
push and PR to `main`. It is shaped to be a required status check but is not
enforced yet — tick it under Settings → Branches → main when ready.

## Project-boundary fix (not a strictness change)

`montage-kit/`, `montage-worker/` and `potato-worker/` are **standalone Railway
services**: each has its own `package.json`, its own `package-lock.json`, its own
`Dockerfile`, its own `tsconfig.json` and its own `typecheck` script. Their
dependencies (`remotion`, `@remotion/renderer`, `@remotion/bundler`,
`@remotion/cli`) are deliberately *not* in the root `package.json`, so the root
compiler could never resolve them — 36 of the 714 errors were simply the root
project trying to type-check code that is not part of the Next.js app.

They are now listed in the root `tsconfig.json` `exclude` array, next to the
other non-app directories. Each worker still type-checks itself via
`npm run typecheck` inside its own directory.

## Behaviour changes — human review

Every entry below is a fix where making the types correct also changed what the
code *does* at runtime. Each one is a place where the old code was provably
wrong; please sanity-check them against your intent.

<!-- BEHAVIOUR-CHANGES-START -->
- **`lib/montree/admin/guru-executor.ts:1030` (was `applyScopeFilter`, now
  `resolveScopeFilter` + `applyScopeFilter`)** — the old `applyScopeFilter` was
  `async` and returned a `PostgrestFilterBuilder`, which is a *thenable*: the
  async function's promise adopted it, so `await applyScopeFilter(...)` **fired
  the query** and handed back a `PostgrestSingleResponse` instead of a builder.
  Every later `.eq()` / `.order()` / `.limit()` on it threw `TypeError`, so the
  Principal Guru's `query_school_data` and `query_school_stats` tools always
  failed with "Execution error: query.limit is not a function". Resolving the
  scope (async) is now separate from applying it (sync), so both tools actually
  run — and they run school-scoped, as intended.
- **`lib/montree/super-admin-security.ts:83,114` — SECURITY, read this one.**
  `generateTOTPSecret()` did `crypto.randomBytes(20).toString('base32')` and
  `generateTOTPToken()` did `Buffer.from(secret, 'base32')`. **Node's Buffer has
  no `base32` encoding** — both throw `TypeError: Unknown encoding: base32`.
  So `verifyTOTP()` threw on every call, and the super-admin 2FA gate in
  `app/api/montree/super-admin/secure/route.ts:143` could never be passed (the
  throw escapes into the route's error path). RFC 4648 base32 encode/decode is
  now implemented in the file, so TOTP actually computes.
  **Two things to check before trusting this:**
  (a) any `totp_secret` already stored was NOT produced by this code (it could
  never run), so confirm the stored secret is really base32 and really the one
  in the authenticator app;
  (b) the code is a hand-rolled TOTP with a ±1 window and its own comment saying
  "for production, use a proper TOTP library like otpauth or speakeasy" — now
  that it runs at all, that advice is worth taking.

- **`components/montree/guru/PhotoInsightButton.tsx:528`** — the area caption
  rendered `t(\`area.${result.area}\`)`. `result.area` is a free-form string
  from the classifier, and `en.ts` only carries `area.*` keys for six areas, so
  any other value (`english`, for instance) printed the raw key —
  "area.english" — to the teacher. It now goes through
  `getAreaLabel(area, locale)`, the shared map that covers every locale and
  normalises the `math` alias.
- **`components/montree/guru/PhotoInsightButton.tsx:98,604,678`** — three dead
  branches removed, all leftovers of the Teacher OS refactor that split teacher
  status out of insight status. `InsightStatus` is
  `'analyzing' | 'identified' | 'no_match' | 'error'`: `'retrying'` is internal
  and `toPublicStatus()` maps it to `'analyzing'` before it can reach the
  component, and `'confirmed'` / `'rejected'` were removed outright
  (`photo-insight-store.ts:10`). So the "Retrying…" label could never show, the
  `status !== 'confirmed' && status !== 'rejected'` guard was always true, and
  the whole "Teacher confirmed" paragraph could never render. **No visible
  change** — none of those branches was reachable — but the `photoInsight.retrying`
  and `photoInsight.confirmed` strings are now unused.

- **`app/api/montree/guru/route.ts:922`** — the extended-thinking streamer
  listened for `messageStream.on('event', ...)`. The Anthropic SDK has no
  `'event'` event (`MessageStreamEvents` declares `streamEvent`, `text`,
  `thinking`, …), so that handler **never ran once**: no thinking delta was ever
  sent to the client, and the companion `'end'` handler logged
  "No thinking tokens received (thinking may not have been used)" on every
  Sonnet request. It now listens for the SDK's own `'thinking'` event, so the
  Guru's thinking stream reaches the browser for the first time. **If the UI was
  built assuming that channel is always silent, check it renders sensibly.**

- **`components/montree/child/GamePlanCard.tsx:61`** — the card called
  `gamePlan.phases.map(...)` directly. `phases` is optional on `GamePlan`
  because it belongs to the legacy Sonnet plan shape and is absent from the
  compact bilingual (Haiku) plans, so expanding the card on a compact plan threw
  `TypeError: Cannot read properties of undefined (reading 'map')` and took the
  child page's render down with it. `phases` and `weekly_check_questions` are
  now normalised to `[]` once at the top, so a compact plan expands and simply
  shows no phase tabs.

- **`app/api/montree/reports/language-presentation/[childId]/route.ts:417,448,545`**
  — all three handlers guarded with `if (!access.ok) return
  NextResponse.json({ error: access.error }, { status: access.status })`, but
  `verifyChildBelongsToSchool()` returns `{ allowed, classroomId }` — it has no
  `ok`, `error` or `status`. `access.ok` was therefore always `undefined`, so
  **every request to this route short-circuited** and answered
  `{}` with a default 200 instead of running. Now checks `access.allowed` and
  answers 403 on denial, matching the other 82 call sites of that helper. The
  language-presentation report actually runs again.

- **`app/montree/library/tools/phonics-fast/stories/page.tsx:401`** — the Stories
  printable read `story.words` and `story.sightWords`, neither of which
  `PhonicsStory` has ever had (`lib/montree/phonics/phonics-data.ts` stores the
  decodable words per page, as `pages[].keywords`). Those reads were
  `undefined.filter(...)` / `undefined.length`, i.e. a **TypeError on render**,
  so the "Book" and "Cards" print previews crashed as soon as a story was
  selected — which the page does automatically. Both lists are now derived from
  the real data: `storyWords` from every page's `keywords`, `storySightWords` by
  intersecting the story text with `SIGHT_WORDS`. **The word bank and the green
  phonics-word highlighting now actually appear** where before the page blew up.
  Story selection also compared a `story.id` that does not exist (so *nothing*
  ever looked selected); it now compares the story objects themselves, which is
  correct because the list renders the very objects `SHORT_STORIES` holds.
  `StoryPage.sceneEmoji` was added as an optional field — the printable has
  always rendered it and none of the bundled stories set it, so those illustration
  boxes print blank exactly as they did before.

*(`app/api/montree/works/guide/route.ts:202` — the background pre-cache now
wraps the Postgrest builder in `Promise.resolve()` before `.then().catch()`.
`PostgrestBuilder.then()` is **typed** as returning a bare `PromiseLike` with no
`.catch`, but at runtime it returns a real Promise, so this one is a type fix
only: no behaviour change.)*
<!-- BEHAVIOUR-CHANGES-END -->

## Worth a decision, but not changed here

**Stripe is pinned to an API version its SDK no longer describes.**
`lib/montree/billing.ts` asks Stripe for `2024-12-18.acacia`; the installed
`stripe@20` ships types for `2026-01-28.clover` only. Three things genuinely
differ, and each is now bridged in one named, commented place rather than
silenced file-wide:

1. `StripeConfig['apiVersion']` admits only the SDK's newest version.
2. `Subscription.current_period_start` / `_end` moved onto the subscription
   *item* in clover — `acaciaSubscriptionPeriod()` reads whichever is present,
   so it keeps working either way.
3. Invoice `payment_method_types` dropped `'alipay'` in clover.

**Runtime behaviour is unchanged** — the pin, the period dates and the Alipay
invoice rail all behave exactly as before. But point 3 is the one to look at: if
Stripe really has removed Alipay as an invoice payment method in the newer API,
then moving off acacia would break Chinese schools' invoices. That is a billing
decision, not a typing one, which is why nothing here moves the pin.

**Pre-existing `@ts-nocheck` files.** Around twenty super-admin marketing /
photo-audit pages carry `// @ts-nocheck` on line 1 and are therefore not checked
at all. They are not part of this burndown (they already "pass"), but turning
`ignoreBuildErrors` off does not make them safe — it just means nobody is
looking. Worth a follow-up pass. Note that a directive placed *after*
`'use client'` does nothing: `master-campaign/page.tsx` had one and still had 19
errors, which is how it was found.
