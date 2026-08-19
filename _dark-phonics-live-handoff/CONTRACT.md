# Dark Phonics Live — Build Contract

Scaffold for a live 1-on-1 online phonics classroom, built as a new surface inside the
existing Montree codebase (Next.js, Supabase, Agora). Skin: **Midnight Studio**
(near-black chrome, violet #8B5CF6 / lime #C8FF3D accents, Space Grotesk + Inter,
light cream stage for the courseware itself).

## Defaults locked in (stated, not re-asked)
- Format: 1-on-1, 25-minute classes.
- Teacher: solo (Tredoux only) at launch. No multi-teacher roles yet.
- Lesson canvas: Agora Interactive Whiteboard (Fastboard), loaded with Dark Phonics assets.
- Payments: parent pays via WeChat/Alipay QR outside the platform; staff (Tredoux) grants
  class credits manually; bookings burn credits. Stripe untouched, added later if needed.

## What already exists (reuse, do not rebuild)
- Agora RTC: `lib/montree/appointments/agora/{config,token-builder,recording}.ts`,
  route `app/api/montree/appointments/[id]/agora-token/route.ts`,
  component `components/montree/appointments/AgoraVideoCall.tsx`.
- Appointments: `montree_appointments` (+ `montree_appointment_hosts`,
  `montree_availability_rules/blackouts`), routes under `app/api/montree/appointments/`.
- Auth: teacher cookie `montree-auth` via `verifySchoolRequest`
  (`lib/montree/verify-request.ts`); parent cookie `montree_parent_session` via
  `access-code` route + `lib/montree/server-auth.ts`.
- Feature flags: two-table model (`montree_feature_definitions` /
  `montree_school_features`), helper `isFeatureEnabled()` in
  `lib/montree/features/server.ts`, default OFF, idempotent migration inserts.
- Referral codes: `lib/montree/referral/code-gen.ts` pattern (`<NAME>-XXXX`).
- Dark Phonics content: `RAW` lesson array in
  `app/montree/library/dark-phonics/page.tsx` (49 lessons, fields
  `n, sound, title, catchphrase, words, books, reader, decodable, heartWords`),
  served via `mediaProxyUrl(path) → /api/montree/media/proxy/${path}?bucket=dark-phonics`.

## What's new (this scaffold builds it)
1. **Feature flag**: `dark_phonics_live` (default OFF), migration idempotent insert.
2. **Credits ledger** — new tables:
   - `montree_class_packages` (catalog: name, credits, price_rmb, active)
   - `montree_class_credits_ledger` (parent_id, child_id, delta, reason
     `'manual_grant'|'class_booked'|'class_no_show'|'class_cancelled_late'|'refund'`,
     appointment_id nullable, created_by, created_at) — append-only, balance = SUM(delta).
   - Booking a class inserts appointment + a `-1` ledger row in one transaction;
     cancelling ≥24h before start reverses it; no-show/late-cancel does not.
3. **Whiteboard room** — `lib/montree/agora/whiteboard.ts` mints an Agora Whiteboard
   (Fastboard) room token per appointment, same deterministic-channel pattern as
   `token-builder.ts`. Route: `app/api/montree/appointments/[id]/whiteboard-token/route.ts`,
   same auth/flag-gate shape as the existing `agora-token` route.
4. **Lesson-to-board adapter** — `lib/montree/dark-phonics/live-lesson.ts`: given a
   lesson `n`, resolve the ordered set of board scenes (letter card, word chips,
   tracing strip, decodable page) from the existing `RAW` array + `mediaProxyUrl`,
   no content duplication.
5. **Classroom UI** (Midnight Studio skin, tokens from the approved mockup):
   - `app/montree/dashboard/live/[appointmentId]/page.tsx` (teacher)
   - `app/montree/parent/live/[appointmentId]/page.tsx` (parent, view + limited annotate)
   - `components/montree/dark-phonics-live/{ClassroomChrome,Stage,VideoRail,
     StarJar,Toolbar}.tsx` — chrome + rail + reward widget wrapping
     `AgoraVideoCall` (video) and the whiteboard iframe/SDK (canvas). Do not
     reimplement video; compose the existing component.
6. **Parent recap card** — generated server-side right after class end
   (`app/api/montree/appointments/[id]/recap/route.ts`): pulls lesson taught,
   words drilled, star count, teacher note, progress `n/49`, renders the shareable
   card (`app/montree/parent/recap/[appointmentId]/page.tsx`, same visual tokens
   as the mockup's recap section) with a static share-image export path for later.
7. **Booking-with-credits** — extend the parent appointment booking route to check
   ledger balance before insert, reject with a clear "buy more classes" state if 0.

## Non-goals for this scaffold (explicitly deferred)
- Multi-teacher scheduling, Stripe/credits purchase checkout automation, dice/spinner/
  timer toolbar functionality (icons present, wiring stubbed), XHS/WeChat marketing
  automation, real Agora Whiteboard org credentials (env var placeholders only).

## File-safety rule for builders
Write only under new paths listed above, or additive changes to: `middleware.ts`
(static passthrough list only), `lib/montree/features/server.ts` (flag key only,
if a registry array exists), and one new migration file. No edits to
`AgoraVideoCall.tsx`, billing, or auth internals.
