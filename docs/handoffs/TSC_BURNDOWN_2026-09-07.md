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
- **`app/montree/library/tools/phonics-fast/dictionary/page.tsx:28`** — called
  `getDictionaryWords()` with no arguments. That function takes
  `(phaseId, cumulative)` and filters `ALL_PHASES` by the id given, so
  `undefined` matched nothing: **the Phonics Dictionary has always rendered
  empty.** Now asks for the last phase cumulatively, which is every word.

- **`app/montree/dashboard/classroom-builder/page.tsx:129`** — the duplicate-name
  skip built its set from `session.classroom.children`, an array no auth route
  attaches. It was always empty, so **pasting the same roster twice created every
  child twice.** The page loads the roster from `/api/montree/children` now.

- **`lib/montree/cache.ts:321` (`compressImage`)** — declared `file: File` but is
  called by `CameraCapture` with `photo.blob`, a bare `Blob`. The canvas callback
  does `file.name.replace(…)`; on a Blob that is `undefined.replace`, thrown
  **inside a callback the function's own try/catch cannot reach**, so the
  returned promise never settled and the camera flow hung after a shot. The
  input is now normalised to a File up front, which leaves every existing path
  and the `Promise<File>` return exactly as they were for File callers.

- **`lib/montree/platform/camera.ts:67`** — passed
  `presentationStyle: 'fullScreen'`. Capacitor's `ImageOptions` spells it
  `'fullscreen'`, so the value was ignored and the native camera used its
  default presentation. Corrected — **the camera sheet may now open full-screen
  where it previously did not.**

- **`components/montree/home/PortalChat.tsx:472`** — cast the Guru's action list
  to `Array<{ success: boolean }>`, dropping the `tool` and `message` fields the
  message bubble renders. Cast widened to the real `ChatMessage['actions']`.

- **`app/api/whale/student/[studentId]/progress-summary/route.ts:199`** — read
  `curriculumModule.curriculum || curriculumModule.default`.
  `lib/montree/curriculum-data.ts` exports neither: the export is `CURRICULUM`.
  Both reads were `undefined`, so the progress summary has always fallen through
  to an **empty curriculum-area list**. Now reads `CURRICULUM` (the surrounding
  try/catch stays — the import is dynamic).

- **`app/api/montree/social-guru/route.ts:16` — an endpoint that has never
  worked, on both sides.** It called `verifySuperAdminPassword(request)`, but
  that helper takes the password STRING and returns `{ valid, error }`. Passing
  the request made `Buffer.write()` throw inside it, the catch returned
  `{ valid: false }`, and `if (authError) return authError` then returned that
  plain object from the route handler *instead of a Response*. Separately, the
  only caller — `app/montree/super-admin/social-manager/guru/page.tsx` — sent no
  credential at all, so even a correct guard would have 401'd. The route now
  uses `verifySuperAdminAuth(request.headers)` like every other super-admin
  route, and the page sends the `x-super-admin-password` header from `sa_pwd`
  the way the other super-admin screens do. **The Social Media Guru screen
  should work now; please confirm the whole flow end to end.**

- **`app/api/montree/reports/generate/route.ts:264`** — the teacher report's
  `sensitive_periods` were passed straight through from the analysis, which
  names that field `period_name` while the report shape expects `name`. Every
  sensitive period in the teacher report has therefore had an **undefined
  name**. Now mapped.

- **Columns read but never SELECTed — three silently-empty features.**
  - `app/api/montree/analysis/route.ts:154` — a "Tier 3.3" perf narrowing cut the
    column list to `work_name, area, status, notes, created_at`, but the payload
    builder still reads `duration_minutes` and `repetition_count`. Both have been
    going into the AI analysis payload as `undefined`. Selected again (the
    columns exist — migration 050 — and the sibling batch-narratives route
    already selects them).
  - `app/api/montree/super-admin/outreach/route.ts:114` — selects
    `status, contact_type, priority, email_status` but tallies `c.email`, so the
    **"with email" counter has always reported 0**. `email` added to the list.
  - `app/api/montree/photo-bank/route.ts:53` — the SEARCH path sorts in JS by
    `created_at`, which was not in `SELECT_COLUMNS`; every row compared as `''`
    so **sort=recent did nothing on searches** (the non-search path sorts in SQL
    and was fine). Column added.

- **Two more auth guards on fields that do not exist.**
  `app/api/montree/tutorial/complete/route.ts:10` checked `authResult.isValid`
  and `app/api/montree/curriculum/batch-translate/route.ts:26` checked
  `auth.authenticated`. `verifySchoolRequest()` returns a `VerifiedRequest` or a
  `NextResponse` and has neither field, so both guards read `undefined` and
  **rejected every caller with 401**. Both now use the `instanceof NextResponse`
  pattern.

- **`checkRateLimit()` called with the wrong arity — SEVEN endpoints answered
  429 (or worse) to every request.** `lib/rate-limiter.ts` exports
  `checkRateLimit(supabase, ip, endpoint, maxAttempts, windowMinutes, …)` and
  returns `{ allowed, retryAfterSeconds }`. Six routes called it as
  `checkRateLimit(key, max, window)` — three arguments — and then treated the
  returned **object** as a boolean. What happened at runtime: `windowMinutes`
  arrived `undefined`, `new Date(Date.now() - undefined)` produced an Invalid
  Date, `.toISOString()` threw, the function's own catch returned
  `{ allowed: true }` (fail-open), and `if (thatObject)` is **always true** — so
  the guard fired on every request. Affected:
  `phonics/images` (POST + DELETE), `phonics/upload`, `phonics/words`
  (POST + PATCH + DELETE), `raz/summary` — all answered **429 Rate limited** to
  every caller; and `montree/onboarding`, which called it with four arguments
  and then `return`ed the result object *as if it were a NextResponse* — so
  **every school signup returned a non-Response** from the route handler.
  All seven now pass the real arguments and check `allowed`, with a `Retry-After`
  header like the other twenty-odd correct call sites. **These features have
  been dead; expect them to start working.**

- **`app/admin/english-procurement/page.tsx:432` — needs content from you.** The
  "Grammar Boxes" tab maps over `grammarBoxSentences`, a constant that has
  **never been defined anywhere in this repo** (checked the whole history), so
  opening that tab threw `ReferenceError: grammarBoxSentences is not defined`
  and blanked the page. It is now defined in `data.ts`, derived from the
  `grammarSymbols` list already in that file: nine boxes, each with its real
  instruction, and an **empty** `sentences` array. The tab renders and says
  "No example sentences written for this box yet." per box. **Writing those
  sentences is curriculum authorship — deliberately left to you rather than
  invented.**

- **`app/api/montree/teacher/earnings/route.ts:10`** — guarded on `auth.ok`, but
  `verifySchoolRequest()` returns either a `VerifiedRequest` or the
  `NextResponse` to send back; there is no `ok` field. `!auth.ok` was therefore
  always true, so **the teacher earnings endpoint answered 401 to everyone**,
  authenticated or not. Now uses the `auth instanceof NextResponse` pattern the
  rest of the API uses.

- **`app/montree/dashboard/photo-audit/page.tsx` — `@ts-nocheck` removed.** This
  file was excluded from type-checking entirely ("will type-check
  incrementally"). With the directive gone it had six errors, all now fixed, and
  two were real:
  - **line 665**: the 60px card thumbnail called
    `getThumbnailUrl(photo.url, photo.thumbnail_path)` — the second parameter is
    a **width in pixels**, so a storage path was being stringified into `?w=`.
    Every one of those thumbnails requested a garbage width. It now matches the
    other call in the same file: `getThumbnailUrl(photo.thumbnail_path, 120)`,
    falling back to the full-size URL when there is no thumbnail.
  - **line 3845**: the "🧠 Ask Sonnet" button called `fetchPhotos()` from inside
    `AuditPhotoCardInner`, a child component where that name does not exist —
    a `ReferenceError` fired immediately *after* a successful enrichment, so the
    toast showed the error instead of "Sonnet analysis ready" and the list never
    refreshed. The card now takes an `onRefreshPhotos` prop wired to the page's
    `fetchPhotos`.
  - Three dead/mis-typed spots were tidied with no behaviour change: a
    `zone === 'pending_review'` check (that value is remapped to `'all'` before
    it can reach the state), the `resolution.work_name` read on the `'other'`
    branch (which deliberately carries no work name, so no progress row is
    written), and the ZONE_TABS annotation.

- **`app/montree/dashboard/[childId]/page.tsx:906,933`** — both passed
  `childName={session?.classroom?.children?.find(...)?.name}`. The session's
  classroom object is `{ id, name, age_group }` and no auth route has ever put
  a `children` array on it, so that lookup was always `undefined`: the
  Weekly-Admin panel showed "Child" and the shelf got no child name at all.
  Both now use `onboardingChildName`, which the page already fetches for this
  child. **The child's real name now appears in those two places.**

- **`app/montree/dashboard/snap/page.tsx:179`** — the per-area progress bar
  showed `config?.label`, and `AREA_CONFIG` entries have `name` / `nameZh` but no
  `label`, so it always fell through to the raw area key ("practical_life").
  Now reads `config?.name`, so the bar is labelled "Practical Life".

- **`.catch()` on a Supabase builder — five fire-and-forget writes that never
  happened.** A `PostgrestFilterBuilder` has a `.then` but **no `.catch` at
  runtime** (verified: `typeof builder.catch === 'undefined'`), so
  `supabase.from(t).insert({...}).catch(handler)` threw
  `TypeError: ....catch is not a function` *synchronously* — before the query
  was ever executed, because a builder only fires when something calls `.then`.
  Each of these is now wrapped in `Promise.resolve(...)`, which makes the chain
  a real Promise: the write actually happens and the handler is reachable.
  - `app/api/montree/guru/dashboard-summary/route.ts:158,206` — neither Guru
    dashboard cache row (end-of-day nudge, proactive suggestion) was ever
    written, and the TypeError was swallowed by the surrounding try/catch and
    misreported as "[Guru Dashboard] AI generation failed".
  - `app/api/montree/guru/end-of-day/route.ts:126` — the end-of-day nudge cache
    row was never written.
  - `app/api/montree/guru/teaching-instructions/route.ts:275` — the teaching
    instruction was generated but never cached, so every request paid for a
    fresh model call.
  - `app/api/montree/super-admin/campaign-manager/route.ts:165` — **the outreach
    audit log row was never written** for any status change.
  - `lib/montree/auto-translate.ts:188` — `logApiUsage()` returns `void`, so
    `.catch()` was being read off `undefined`. The call already fires and logs
    its own failures internally; the dead `.catch` is removed. (API usage WAS
    being recorded — only the bogus handler threw.)

  Two more sites (`super-admin/guru/route.ts:267`,
  `guru/photo-insight/add-custom-work/route.ts:305`) chained `.catch` onto
  `.then(...)`, which *does* return a real Promise — those were type-only fixes,
  no behaviour change.

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

**The command-cards Level 1/2/3 chips match nothing.**
`app/montree/library/tools/phonics-fast/command-cards/page.tsx:71` filters on
`c.level`, but `CommandSentence` had no such field and **none of the bundled
`COMMAND_SENTENCES` sets one** — so picking Level 1, 2 or 3 prints an empty
sheet and only "All Levels" works. `level?: 1 | 2 | 3` is now declared on the
type (with that warning on it) so the page type-checks, but the data still needs
either the levels filled in or the three chips removed. Assigning difficulty
tiers to sentences is curriculum authorship, so it is left to you — same call as
the Grammar Boxes above.

**Pre-existing `@ts-nocheck` files.** Around twenty super-admin marketing /
photo-audit pages carry `// @ts-nocheck` on line 1 and are therefore not checked
at all. They are not part of this burndown (they already "pass"), but turning
`ignoreBuildErrors` off does not make them safe — it just means nobody is
looking. Worth a follow-up pass. Note that a directive placed *after*
`'use client'` does nothing: `master-campaign/page.tsx` had one and still had 19
errors, which is how it was found.
