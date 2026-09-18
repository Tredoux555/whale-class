# Dark Phonics hub — `/dark-phonics`

montree.xyz's front door. Built 2026-09-17.

A teacher lands, plays a lesson in five seconds with no signup, prints the
classroom set, and talks to us — three tabs on one page. The $5/mo · $30/yr gate
on lessons 4+ is **built and switched off**; turning it on is one env var, not a
rebuild.

---

## Routes

| URL | What it is |
| --- | --- |
| `/dark-phonics` | The hub. `?tab=play\|classroom\|community`, default `play`. |
| `/dark-phonics/l/[n]` | Deep link: the hub on Play with lesson *n* open. Canonical share URL, own OG image. `n` must be one of the 21 shelf lessons or it is a 404. |
| `/dark-phonics/account` | The Teachers' Room (community) account — sign in, sign up, forgot. The individual identity the paywall uses. |
| `/dp` | 302 → `/dark-phonics`, query string intact. The short link for posters, QR codes and video descriptions. |
| `/parents` | **The same hub**, Whale Class door. See "Two mounts" below. |
| `/montree/super-admin/dark-phonics` | Last-30-days funnel, sources and leads. Super-admin password. |

`/dark-phonics` and `/dp` are in `middleware.ts`'s `publicPaths`. Without those
two entries the legacy Supabase gate 302s every anonymous visitor to `/`.

## Two mounts, one component

`/dark-phonics` and `/parents` are the **same** `HubServer` → `DarkPhonicsHub`.
There is no second implementation. `variant` is the only difference:

| | `variant="hub"` (`/dark-phonics`) | `variant="parents"` (`/parents`) |
| --- | --- | --- |
| Hero | shown | **dropped** — these parents were handed the tablet by their child's teacher and already know what this is |
| Wordmark links to | `/montree` | `/` (the Whale Class home) |
| Extra affordance | — | a "Home" back link beside the wordmark |
| `basePath` | `/dark-phonics` | `/parents` |
| Opening a lesson rewrites the URL to `/l/<n>` | yes | **no** |

That last row matters: `/parents` is an installable PWA scoped to that exact
path (`app/parents/layout.tsx` — manifest, apple tags, untouched by this work).
Rewriting the address bar to `/dark-phonics/l/5` would push a home-screen launch
outside its own scope and drop the standalone chrome mid-lesson. The **share
card still hands out the canonical `/dark-phonics/l/<n>` link on both mounts**,
which is right — that link works on either host.

Both mounts use the same `product:dark-phonics` board.

### Does the hub work on teacherpotato.xyz?

Yes, and the host split cannot break it. `middleware.ts` redirects
`/montree*` → montree.xyz on that host, but its `matcher` is
`'/((?!api|_next/static|…).*)'` plus a handful of *named* `/api` groups (whale,
admin, weekly-planning, curriculum-import, students, classroom, onboard, media).
Neither `/api/montree/*` nor `/api/dark-phonics/*` is in it, so **the middleware
never runs for them at all** — which is why `/montree/library/feedback` already
worked on teacherpotato, and why the Community tab does too.

## The three tabs

**Play** — `components/montree/dark-phonics/PlayTab.tsx` mounts
`ParentLedLessons`, the *same* component `/parents` serves. Nothing about the
shelf changed except a handful of **optional** props (controlled `openLesson`,
badge lists, `onLessonOpen` / `onStageDone` / `onLessonDone` / `onLockedLesson`).
Pass none of them and the component renders exactly as it did — which is what
`/parents` and the parent portal do.

**Classroom** — `components/montree/dark-phonics/DarkPhonicsClassroom.tsx`. This
*is* the old body of `app/montree/library/dark-phonics/page.tsx`; that page is
now a four-line mount of it and renders identically. `embedded` drops the two
pieces of library chrome (the "← Library" link and the language toggle, which
the hub header already carries) and stops the panel claiming a screen of its own.

**Community** — `FeedbackBoard` on the new `product:dark-phonics` board scope.
Server-rendered in `HubServer.tsx`, so the discussion is in the HTML.

## The `product:` board scope

`lib/montree/feedback/types.ts` now parses `product:<slug>` alongside `public`
and `school:<uuid>`. A product board is **public in every respect that matters**
— same admin rule (super-admin header or `FEEDBACK_ADMIN_USER_IDS`), same
identity, same write gate. It is *not* a tenancy boundary; it exists so two
products do not share one wall. `board.ts` and `server.ts` look the row up and
never create it, so a typo in a slug is a calm "not set up yet".

## Palette and CSS

The hub's skin is `--dp-*`, declared in one styled-jsx block in
`DarkPhonicsHub.tsx` — the landing's deep-forest values, because this is a page
on montree.xyz. The shelf's `--dpl-*` tokens are imported by **`PlayTab.tsx` and
nothing else**, and the hub loads that module with `next/dynamic`, so the
stylesheet is a separate chunk that never reaches a Classroom-only or
Community-only session. Nothing outside the Play panel reads a `--dpl-*` value.

While a lesson is open the header collapses to a slim rail (`dp-head-slim`) and
`.dp-root-locked` puts `height:100dvh; overflow:hidden` on the root, letting
flex hand the Play panel whatever the header did not take.

**That lock is load-bearing, not tidiness.** `ShelfPlayer`'s own root is
`min-h-[100dvh]`; with a 53px rail above it the document measured 854/800 on
desktop and 897/844 on a phone — two scrollbars, and the bottom of the work off
the screen on a 768px iPad. The lock is written without a hard-coded header
height so it survives the rail growing a safe-area inset. Re-measured after the
fix: `scrollHeight === clientHeight` on both viewports.

---

## Measurement

Two first-party cookies, stamped on first paint by `Pixel.tsx`:

- `dp_aid` — a v4 uuid. A **browser**, not a person. 1 year, SameSite=Lax.
- `dp_utm` — `{source,medium,campaign,content,ref,ts}` JSON, URI-encoded.
  **First touch wins**: an existing cookie is never overwritten. 90 days.

`dpTrack(event, {lesson, stage, props})` fires `navigator.sendBeacon` at
`POST /api/dark-phonics/event`. That route:

- allow-lists the event name (`lib/montree/dark-phonics/events.ts`, 13 names);
- caps the body at 4 KB, the props at 8 keys and each value at 80 chars;
- rate-limits 120 events per 10 minutes per `dp_aid` (per IP when there is none);
- **always answers 204**, valid or not — a beacon cannot read a status code, and
  a prober must not learn which names exist;
- is a silent no-op before migration 360.

`montree_dp_events` holds no email, no name and no IP.

**Meta pixel**: loaded only when `NEXT_PUBLIC_META_PIXEL_ID` is set, only on the
hub, mirroring PageView / ViewContent / Lead / InitiateCheckout / Subscribe.
There is no fallback id and no other third-party script anywhere on this route.

---

## Flipping the paywall on

Everything is already built. The procedure, in order:

1. **Run the migration** if it has not been run: `migrations/360_dark_phonics_hub.sql`
   (Supabase → SQL Editor → Run). `montree_dp_subscriptions` must exist before
   the gate means anything.
2. **Make the prices**, once per Stripe account:
   ```
   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe/create-dark-phonics-prices.mjs
   ```
   It is idempotent (prices are found by lookup key) and prints the two ids.
3. **Add the Stripe webhook endpoint** in the dashboard:
   - URL `https://montree.xyz/api/dark-phonics/webhook`
   - Events `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy its signing secret.
4. **Set the Railway variables** (below), including `DARK_PHONICS_PAYWALL=on`.
5. **Redeploy.** Lessons 4+ now show a lock; 1–3 stay free forever.

**Turning it back off** is `DARK_PHONICS_PAYWALL=off` (or deleting the variable)
and a redeploy. Nothing else has to be undone: with the flag off every lesson is
`full`, no lesson is ever in the locked list, and the unlock panel and the three
Stripe routes are unreachable from the UI. Existing subscription rows are left
alone, so flipping it back on restores everyone's access.

### Where the rule lives

`lib/montree/dark-phonics/access.ts` — and nowhere else.
`DP_FREE_LESSONS = [1,2,3]`, `canPlayLesson()`, `accessFor()`. Both the client
(`DarkPhonicsHub`) and the server (`HubServer.readTier`, `getDarkPhonicsAccess`)
go through it. **It fails open**: if the subscriptions table is unreachable the
answer is `full`, because an outage must never lock a paying teacher out
mid-lesson.

### Why the Stripe wiring is separate

`getPriceIds()` in `lib/montree/stripe.ts` throws when any of the three *school*
prices is missing. Adding two more required variables there would break school
checkout on any deploy that has not set the DP prices. So the DP prices have
their own lazy getter in the checkout route, the DP webhook has its own endpoint
and its own secret, and the two products share only `getStripe()`. **School
billing is untouched.**

---

## Environment variables

| Variable | Needed for | Default if unset |
| --- | --- | --- |
| `DARK_PHONICS_PAYWALL` | The gate. `'on'` turns it on; anything else is off. | off — everybody gets everything |
| `STRIPE_PRICE_DP_MONTH` | $5/month price id | DP checkout answers 503 `not_configured` |
| `STRIPE_PRICE_DP_YEAR` | $30/year price id | same |
| `STRIPE_DP_WEBHOOK_SECRET` | The DP webhook's signature | webhook answers 503 "not configured" |
| `NEXT_PUBLIC_META_PIXEL_ID` | The Meta pixel | **no third-party script loads at all** |
| `NEXT_PUBLIC_DP_INTRO_VIDEO_URL` | The hero's video slot | the lesson-5 cover art |
| `NEXT_PUBLIC_SITE_URL` | Canonical + OG absolute urls | the request host, then `https://montree.xyz` |

Already in the repo and reused as-is: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, `SUPABASE_*`, `MONTREE_COMMUNITY_JWT_SECRET`.

## Data (migration 360)

- `montree_dp_leads` — `email` UNIQUE, `role`, `utm` jsonb, `aid`, `created_at`,
  `welcomed_at`. The API upserts with `ignoreDuplicates`, so a double-submit is a
  200 and the welcome email is sent once.
- `montree_dp_events` — `aid`, `event`, `lesson`, `stage`, `utm`, `props`, `ua`,
  `host`, `created_at`; indexed on `created_at`, `(event, created_at)`, `aid`,
  `lesson`.
- `montree_dp_subscriptions` — PK `community_user_id`, which is what makes every
  webhook write idempotent.
- Widens `montree_fb_boards`' two scope CHECKs to allow `'product'` and seeds
  `('product:dark-phonics','product',NULL,'Dark Phonics community','en')` plus
  five tags.

RLS is enabled with **no policies** on all three new tables — deny-all to the
anon key, the pattern set by 275 and 359. The app reads and writes with the
service-role key.

## Language

The hub's own copy is `lib/montree/dark-phonics/hub-strings.ts`, EN + 中, behind
the same `fb_lang` cookie the feedback board uses. It is deliberately not
`lib/montree/i18n`: that bundle is the school product's, carries eleven locales
and loads through a React context the hub does not mount. The landing page's new
nav/card/footer strings *are* in `lib/montree/i18n` (`landing.nav.darkPhonics`,
`landing.darkPhonics.*`) in every locale file — Chinese written, the other nine
locales carrying the English wording until a human writes them.

## Tests

`tests/dark-phonics-hub/` — access rules with the flag off and on, utm parsing
and cookie shape, event validation and the allow-list, lead validation and the
honeypot, `product:` board-ref parsing, `/dp` preserving the query, and the two
hub string tables staying in step.

Scoped type-check: `npx tsc --noEmit -p tsconfig.hub.json`.

Full pass at build time (2026-09-18): 821 tests green across 12 files
(including the 612-test shelf suite, run against the `ShelfPlayer` callback
edit), `tsc -p tsconfig.hub.json` clean, eslint 0 errors on every touched file.
The four remaining eslint *warnings* live in `DarkPhonicsClassroom.tsx` and are
inherited verbatim from the page it was lifted out of — check
`git show HEAD:app/montree/library/dark-phonics/page.tsx` before "fixing" them.

## Known seam

The Community tab keeps the feedback module's own **light** theme, so it is a
hard light/dark switch under the hub's dark header. That is deliberate: giving
the board a second skin here would fork its look from
`/montree/library/feedback`. It is the one thing a reviewer notices first.
