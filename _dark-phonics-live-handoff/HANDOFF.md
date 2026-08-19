# Dark Phonics Live — scaffold handoff

Built tonight against `/home/claude/dark-phonics-live-CONTRACT.md`, then corrected
against your live repo once the desktop bridge came up. Everything below reflects
the corrected state, not the original agent output — where the three builders
guessed wrong about your schema, I read the real files and fixed it.

## What changed after live verification

- **Migration renumbered 224 → 334.** The scout's migration-number guess was
  stale; `333_pss_photo_attribution.sql` is the real latest. Confirm with
  `ls migrations/ | tail` before applying — more may have landed since.
- **`montree_feature_definitions` insert columns fixed.** Real shape (from
  `327_work_rhythm_feature.sql`): `(feature_key, name, description, icon,
  category, is_premium, default_enabled)`. The original insert was missing
  `name`, `icon`, `is_premium` and would have failed outright.
- **FKs added for real.** `montree_class_credits_ledger.parent_id` →
  `montree_parents(id)`, `.child_id` → `montree_children(id)`, both confirmed
  by reading `migrations/216_appointments.sql` directly (that's what
  `montree_appointments.parent_id`/`.child_id` reference too).
- **Booking route rewritten.** The original had three real bugs:
  1. `resolveAppointmentsParent` takes a Supabase client, not the request —
     fixed everywhere (book route, whiteboard-token route, recap route).
  2. Child-ownership was checked via a `montree_children.parent_id` column
     that doesn't exist — parents link to children through the
     `montree_parent_children` junction table, and `resolveAppointmentsParent`
     already returns `childIds`, so the check is now a plain array `.includes`.
  3. The insert used `status: 'pending_credit'` and `appointment_type:
     'dark_phonics_live'` — neither is real. `status` is CHECK-constrained to
     `pending|confirmed|cancelled|completed|no_show`; `appointment_type`
     doesn't exist as a column at all. Fixed to reuse `'pending'` (with an
     honest comment about the semantic overlap this creates) and to drop
     `appointment_type` entirely.
  4. The insert was also missing `ical_token` (required — the Agora channel
     name derives from it) and a `montree_appointment_hosts` row (every
     appointment needs one; there was none). Both copied from the real
     `app/api/montree/parent/appointments/route.ts` insert shape.
- **The credit-spend race is closed for real**, not just documented: the
  schema slice's `spend_credit_for_booking()` Postgres function (advisory
  lock + check + insert in one transaction) is now what `ledger.ts` actually
  calls, not a comment describing a future swap.

## Audit pass (2026-08-19, after the build above)

Ran an independent, adversarial audit against the actual files in your repo
(not my working copies). It found two real blockers and five smaller issues.
Both blockers and three of the smaller ones are already fixed in the files
you now have; two are left as genuine open decisions (below).

**Fixed:**
- **Whiteboard token leak (blocker).** `mintWhiteboardToken()` was returning
  the raw `AGORA_WHITEBOARD_SDK_TOKEN` — the org-wide master secret — straight
  to every parent/teacher's browser on every class join. Rewrote it to call
  the real Agora REST endpoint (`POST /v5/tokens/rooms/{uuid}`) and mint a
  room-and-role-scoped token instead. The route now `await`s it (it's async
  now — don't remove that `await` if you touch this file).
- **New tables shipped with RLS unset (blocker).** `montree_class_credits_ledger`,
  `montree_class_packages`, `montree_class_recaps` had zero RLS statements,
  reopening exactly the anon-REST-API gap your three prior lockdown migrations
  (275, 2026-06-06, 2026-06-10) exist to close. Migration now enables RLS on
  all three with no policies — service-role (BYPASSRLS) keeps working
  unchanged, anon/authenticated get default-deny, matching your established
  pattern exactly.
- **Lesson content adapter was wrong.** Fixed after reading the real
  `RawLesson` type directly: `decodable` is a word list, not a book — the
  adapter was silently dropping that content for almost every lesson. Also,
  `RAW.n` runs 5–53 (the curriculum's own numbering) while everything
  display-facing (recap `lesson_number`, `DARK_PHONICS_LESSON_COUNT`) uses
  1–49 — the adapter now converts (`displayNumber + 4`) internally so every
  other caller can keep thinking in 1–49. Scene shape also changed (no more
  fabricated `letter-card`/`tracing`/`decodable-page` — now `hero` (video or
  picture), `word-chips`, `decodable-words`, `heart-words`, `book-cover`,
  matching what's actually in the bucket). `Stage.tsx` and both classroom
  pages' demo data were updated to match — tracing is now a teacher-toggled
  UI step, not a scene, since there's no real tracing image asset (tracing
  happens on paper via the video call, matching how the market actually does
  remote phonics writing practice).
- **`dark_phonics_live` added to `FeatureKey`** in `lib/montree/features/types.ts`
  (a real repo file, small additive edit) — it was missing from the union,
  silently defeating the type-safety net elsewhere in the codebase.
- **`whiteboard.ts` now uses the shared `getSupabase()`** instead of its own
  ad-hoc client, so it doesn't lose the repo's documented retry/timeout
  protection for Railway↔Supabase hangs.

**Still open — genuine product/engineering decisions, not oversights:**
- **No double-submit protection on booking.** A double-click or retried POST
  creates two separate appointments and burns two credits — the atomic RPC
  only protects a *retry against the same appointment*, not two distinct
  ones. Cheap fix later (client-side disable-on-submit, or a request
  idempotency key); not done here.
- **`dark_phonics_live` is silently coupled to the pre-existing `appointments`
  flag** (`resolveAppointmentsParent()` checks it internally, before this
  route's own flag). A school needs both ON. Worth a decision before step 7
  below — probably fine for your solo-school case, but know it's there.

**Still genuinely unverified (couldn't check from here):**
- **`AgoraVideoCall`'s real prop names.** Assumed `{ appointmentId, role }`.
  Open the component before wiring `VideoRail`'s `teacherSlot`/`studentSlot`.
- **`DARK_PHONICS_LIVE_TEACHER_ID`** must be your real `montree_teachers.id`
  row — not created by this migration. Look it up once (`SELECT id FROM
  montree_teachers WHERE ...`) and set it as an env var.
- **The `montree_parents` table's own column list** — confirmed it's the
  right FK target, didn't read its full schema (wasn't needed for this slice).

## New env vars this scaffold needs

| Var | Purpose |
|---|---|
| `AGORA_WHITEBOARD_APP_IDENTIFIER` | Whiteboard product "App Identifier", from Agora Console (separate product from RTC — you'll need to provision it) |
| `AGORA_WHITEBOARD_SDK_TOKEN` | Server-only Whiteboard SDK token |
| `AGORA_WHITEBOARD_REGION` | Optional, defaults `cn-hz` |
| `DARK_PHONICS_LIVE_TEACHER_ID` | Your `montree_teachers.id` — the solo teacher every DPL booking assigns as host |

`AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` (RTC) are unchanged and reused as-is.

## Deliberately deferred (per the contract, not forgotten)

Multi-teacher scheduling, real Stripe/credits purchase checkout, dice/spinner/
timer functionality, availability/double-booking checks on the new booking
route (no slot-conflict guard yet — fine for a solo teacher hand-managing a
calendar this week, not fine at scale), XHS/WeChat marketing automation.

## File manifest

```
migrations/334_dark_phonics_live.sql          feature flag + credits ledger + recaps table + whiteboard column
lib/montree/credits/ledger.ts                 credits data-access (balance, grant, spend, reverse, no-show)
lib/montree/agora/whiteboard.ts                Agora Whiteboard room + token minting
lib/montree/dark-phonics/live-lesson.ts        RAW lesson → whiteboard scenes adapter
app/api/montree/dark-phonics-live/book/route.ts        credits-aware booking
app/api/montree/appointments/[id]/whiteboard-token/route.ts
app/api/montree/appointments/[id]/recap/route.ts
app/montree/dashboard/live/[appointmentId]/page.tsx     teacher classroom
app/montree/parent/live/[appointmentId]/page.tsx        parent classroom
components/montree/dark-phonics-live/*.tsx    Midnight Studio UI (Chrome, Stage, VideoRail, StarJar, Toolbar, ParentRecapCard)
styles/dark-phonics-live-tokens.css           Midnight Studio design tokens
```

## Suggested order for this week

1. Run `334_dark_phonics_live.sql` against a dev/staging DB first — check the
   feature-flag insert and both new tables land clean.
2. Look up your `montree_teachers.id` and set `DARK_PHONICS_LIVE_TEACHER_ID`.
3. Provision Agora Whiteboard credentials in the Agora Console; set the three
   `AGORA_WHITEBOARD_*` env vars.
4. Open `AgoraVideoCall.tsx` and confirm its prop names match what `VideoRail`
   expects; wire it in.
5. Wire real data-fetching into the two `live/[appointmentId]/page.tsx`
   Server Components (currently demo placeholder data).
6. Grant yourself a test credit via `grantCredits()`, book a class through
   `/api/montree/dark-phonics-live/book`, join from both sides, End Class,
   check the recap renders.
7. Turn `dark_phonics_live` on for your own school row and do a real dry run.
