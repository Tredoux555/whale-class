# SESSION HANDOFF — Jul 8, 2026 (evening) — Referral QR Cards + Universal Founding 100 Link + Founder↔Super-Admin Messaging

**Orchestration: Cowork/Fable directing only, Opus building, Sonnet scouting/running (Tredoux's cardinal rule this session: Fable does no grunt work). Every build fresh-eyes audited before push — 2 Opus builds, 2 Opus audits, both audits came back zero-fix.**
**Commits: `c6989d40` → `4dcd4f1a` → `17b1a407` (18 files, +2644/−17), all pushed to `main` via Desktop Commander (HEAD == origin/main). Migrations 291 + 292 ⏳ PENDING Tredoux's Supabase run — exact SQL in §4 below. Pre-existing working-tree dirt (`docs/MONTREE_SOCIAL_PLAYBOOK.md`, `.diag.mjs`, `social/`, etc.) untouched.**

## 1. What shipped

### Commit `c6989d40` — Partner referral QR share card
FoundingTab.tsx gained a "Generate QR code" button next to Copy on the mint-result referral link row.
- **Architecture:** a DESIGNER-MADE static template PNG (`public/brand/referral-card-template.png`, 1080×1920, "Lanternlight" design — deep forest `#0A1A0F`, layered warm-gold radial glow behind the M tile, "Welcome to Montree" Lora-italic headline, empty cream `#F5EDD8` QR card, "THE MAGIC OF MONTREE" footer) + client-side canvas compositing.
- **Compositing:** canvas draws the template full-bleed → stamps a QR code (`qrcode` npm package, 456px square at `(312, 912)`, error-correction level H, dark `#0A1A0F` modules on `#F5EDD8`) → draws a letter-spaced gold code caption at `(540, 1495)` via a `drawSpacedText` helper → downloads `montree-referral-<CODE>.png`.
- **🚨 RULE — to change the card's look, redesign the template PNG** (regenerate via a designer/canvas-design pass) — **do NOT reintroduce procedural gradient drawing in code.** That approach was built FIRST this session, rejected TWICE by Tredoux as "dull," and fully replaced by the template. The earlier procedural iterations were deleted from the working tree.
- QR scannability machine-verified (cv2 decode round-trip on the rendered PNG).

### Commit `4dcd4f1a` — Per-row QR buttons on the waitlist
- `generateReferralQr` generalized into `generateQrCard(link, code, key)` + a **keyed** `qrStatusMap` (functional `setState`, each row's generating/done/error status and revert timer is independent of every other row's).
- "Generate QR code" button added next to the existing 📋 Copy-link button on **every** founding waitlist row where `r.signup_code && !r.redeemed_at` — QR encodes the full signup URL, caption/filename use `signup_code`.
- Mint-result button's key renamed to the literal `'mint-result'` so it doesn't collide with the per-row keys.

### Commit `17b1a407` — THE BIG ONE: Universal Founding 100 link + founder messaging (18 files, +2644)

**A. Universal link — the friction-killer Tredoux asked for** ("one link I can post in Facebook groups and under my father-story emails, no per-recipient minting"):
- **Migration 291** (`migrations/291_universal_founding_code.sql`) — adds `universal_signup_code` + `universal_code_created_at` to `montree_founding_config`. Additive, idempotent, 42703-safe on both ends (see §4).
- **`resolveFoundingCode` in `try/instant/route.ts`** checks the universal code FIRST (case-insensitive), reads `cap` + `is_closed` + a live admitted count off the config row:
  - **Cap/closed** → returns `{ context: null, universalFull: true }` → the caller falls through to the normal referral/7-day-trial path AND stamps `founding_full: true` on the response so the client can tell the user gracefully. **An old Facebook post linking the universal code can never produce a dead 400** — it just quietly becomes a normal signup once the cohort is full.
  - **Valid + open** → grants `founding_3_life` (founding_member, `billing_override_usd=3`, 30-day Premium/Sonnet trial — same grant shape as a single-use FND- code) AND inserts an **admitted** `montree_founding_waitlist` row (`source='universal_link'`, `redeemed_*` stamped, `signup_code=NULL`) — this is how the cap burns down automatically without any manual admit, and every universal-link redeemer shows up in the Founding tab list like any other admit.
  - A `23505` duplicate-email collision on the waitlist insert is swallowed (grant still applies to the school; the row insert is skipped, logged non-fatal) — **a duplicate audit row can never fail a signup.**
  - **Non-transactional by design:** the cap check and the waitlist insert are two separate calls, so a genuine simultaneous burst of redemptions could overshoot the cap by a couple of seats. Accepted risk (a manual admit can already overshoot the same way) — do not "fix" this into a transaction wrapper without discussing the added latency/complexity first.
  - Founding-beats-referral (an existing rule) applies identically to the universal code — a `?ref=` param present alongside a universal-link redemption is ignored.
- **Super-admin route (`founding/route.ts`)** — new PATCH action `get_or_create_universal_code`: idempotent (returns the existing code if the config row already has one), mints a fresh `FND-F100-XXXX` on first call (collision-checked against every waitlist `signup_code`, not just other universal codes), 42703-safe (clear "run migration 291 first" message pre-migration). GET now also returns `universal_signup_code`.
- **FoundingTab.tsx** — new 🌍 "Universal Founding 100 link" card mounted at the VERY TOP of the tab (above the partner-mint card and the waitlist table) — Create-link / Copy / Generate QR-code (reuses the same Lanternlight template + compositor from `c6989d40`).

**B. Founder ↔ super-admin messaging** ("these guys are my babies" — Tredoux wants a direct line from founding-member principals to him):
- **Migration 292** (`migrations/292_founding_messaging.sql`) — extends the `montree_message_threads.thread_type` CHECK constraint (drop+recreate, mirrors how migrations 197/204 did it) to add `'principal_super_admin'`, preserving every prior value including `'agent_super_admin'` from 204. Adds a partial index on `(thread_type, last_message_at DESC) WHERE thread_type='principal_super_admin'` for the super-admin inbox query. `created_by_role`/`participant_role`/`sender_role` already permit `'principal'` and `'super_admin'` from migrations 190/204 — **only the thread_type CHECK needed to change.** `school_id` stays mandatorily populated for this thread type (unlike `agent_super_admin`, which may be NULL) — a founding thread is always the principal's own school, so migration 204's gated NULL-school CHECK is satisfied untouched.
- **This REUSES the existing messaging tables wholesale** — `montree_message_threads` / `montree_message_thread_participants` / `montree_thread_messages` — exactly like the pre-existing agent↔super-admin rail. No parallel DM infrastructure.
- **New `lib/montree/agent-super-admin-messaging/principal-access.ts`** — `resolveMessagingPrincipal(request, supabase)`: verifies JWT role === `'principal'`, then verifies `montree_schools.founding_member === true` on the caller's own school (else a friendly 403 — "The direct line to Tredoux is a Founding member benefit."), resolves a display name off `montree_school_admins`. **Enforced on every principal-side route** — non-founding principals get no channel at all, not even a read-only one.
- **Principal-side routes** (`app/api/montree/principal/messages-tredoux/threads/route.ts` + `[threadId]/route.ts` + `[threadId]/messages/route.ts`) — faithful structural copies of the pre-existing agent↔super-admin trio. IDOR-proof: every thread lookup verifies the calling principal is an actual participant AND the thread's `thread_type === 'principal_super_admin'` before returning anything. Message bodies go through the existing `messaging-crypto` encryption helper, keyed with the principal's real `school_id`. Pre-migration (292 not yet run), a thread-creation POST hits the CHECK constraint and returns a clean `503 { error: 'messaging migration pending' }` — never a raw Postgres 500.
- **Super-admin routes** (`app/api/montree/super-admin/founding-messages/threads/route.ts` + `[threadId]/route.ts`) — `verifySuperAdminAuth`-gated, hydrate each thread with the school name + principal name, compute per-thread unread counts, and use the same sentinel super-admin identity (`00000000-0000-0000-0000-000000000000`, role `super_admin`) as the existing agent-inbox pattern for outgoing replies.
- **UI:**
  - `app/montree/admin/messages-tredoux/page.tsx` + `[threadId]/page.tsx` — the principal-side "Message Tredoux" screen (dark-forest themed, matches the rest of the admin cockpit).
  - `app/montree/admin/layout.tsx` — new nav item "Message Tredoux", gated on `founding_member` (this required exposing `founding_member` on the `auth/me` school select, a 1-line change to that route).
  - `components/montree/super-admin/FoundingInbox.tsx` — a collapsible "💬 Founder messages" inbox mounted inside FoundingTab, listing every `principal_super_admin` thread across all founding schools with unread counts and a reply composer.
  - `app/montree/super-admin/page.tsx` — a red unread-count badge on the 🚀 Founding 100 tab itself, mirroring the existing Feedback-tab badge pattern (failure-tolerant fetch — a broken badge query never blocks the tab from rendering).
- `last_message_at` is bumped by the pre-existing migration-190 trigger — **no manual bump was added; do not add one.**

## 2. Design rulings (do not re-litigate)

- **QR card visuals = template PNG, not code.** Any future look change is a design pass on `public/brand/referral-card-template.png`, then the same compositor draws over it. Procedural canvas gradients were tried and explicitly rejected.
- **Universal link degrades to a normal trial, never a dead link.** `founding_full: true` is the contract the client checks — don't replace it with a hard error.
- **Universal-link redemptions are audited exactly like manual admits** (an admitted waitlist row per redemption) so the Founding tab list and the cap counter never lie about where a seat came from.
- **Founder messaging is a Founding-member-only benefit, gated at the access-resolver layer, not just hidden in the UI.** A non-founding principal hitting the API directly gets 403, not just a missing nav link.
- **`school_id` is always populated on `principal_super_admin` threads** — resist the urge to special-case a NULL-school variant "for consistency" with `agent_super_admin`; the two thread types have genuinely different invariants.

## 3. First-partner-session addendum (context, not new work)

This session directly follows the Partner Program mint tool session (`docs/handoffs/SESSION_PARTNER_MINT_TOOL_JUL8.md`, commit `337033ec`, migration 290 RUN, first partner Tatenda minted live). The QR card feature exists because Tatenda's referral link needed a shareable branded artifact, not just a raw URL — that's the throughline from that session into this one.

## 4. ⏳ PENDING — migrations Tredoux must run in Supabase (site is safe pre-run; both are 42703-safe on the code side)

**Migration 291 — paste into the Supabase SQL editor:**
```sql
BEGIN;

ALTER TABLE montree_founding_config
  ADD COLUMN IF NOT EXISTS universal_signup_code    TEXT,
  ADD COLUMN IF NOT EXISTS universal_code_created_at TIMESTAMPTZ;

COMMIT;
```

**Migration 292 — paste into the Supabase SQL editor:**
```sql
BEGIN;

ALTER TABLE montree_message_threads
  DROP CONSTRAINT IF EXISTS montree_message_threads_thread_type_check;

ALTER TABLE montree_message_threads
  ADD CONSTRAINT montree_message_threads_thread_type_check
  CHECK (thread_type IN (
    'parent_teacher', 'parent_principal', 'internal', 'broadcast', 'group',
    'agent_principal', 'agent_super_admin', 'principal_super_admin'
  ));

CREATE INDEX IF NOT EXISTS idx_threads_principal_super_admin_inbox
  ON montree_message_threads(thread_type, last_message_at DESC)
  WHERE thread_type = 'principal_super_admin';

COMMIT;
```

Until both run: the 🌍 Universal Founding 100 card's "Create link" button returns a clear "run migration 291 first" message instead of minting; "Message Tredoux" thread-creation returns a clean 503 instead of a raw Postgres error. Nothing else on the site is affected.

## 5. ⏳ Verify after both migrations run (runtime audit — do not skip, per the standing CLAUDE.md rule)

1. **Universal link end-to-end:** super-admin → 🚀 Founding 100 → 🌍 card → Create link → Copy the URL → open it in a private/incognito window → sign up a throwaway test school → confirm (a) the school lands on Premium/Sonnet with `billing_override_usd=3`, (b) a new admitted waitlist row appears with `source='universal_link'`, (c) the admitted counter on the card increments.
2. **Cap-closed fallback:** temporarily set `is_closed=true` (or drop `cap` below the current admitted count) on the config row, redeem the same universal link again → confirm it falls through to a normal 7-day trial and the UI surfaces `founding_full` gracefully (no 400).
3. **Founder messaging round-trip:** log in as a founding-member principal → confirm "Message Tredoux" appears in the nav (and does NOT appear for a non-founding principal) → send a message → confirm it appears in super-admin → 🚀 Founding 100 → 💬 Founder messages with a red unread badge on the tab → reply from super-admin → confirm the principal sees the reply and the badge clears.
4. **Per-row QR buttons** (deployed in `4dcd4f1a`, not yet device-verified) — open the Founding tab waitlist, generate a QR for two different rows back-to-back, confirm each row's button state (generating/done) is independent and both downloaded PNGs decode to the correct distinct signup links.
5. **Template redesign path** — if Tredoux wants a different look, the fix is a new `public/brand/referral-card-template.png`, not a code change. Confirm this is still true before touching FoundingTab.tsx for cosmetic requests.

## 6. Resume prompt (paste to start next session)

```
Read docs/handoffs/SESSION_QR_UNIVERSAL_LINK_FOUNDER_MSG_JUL8.md FIRST.
1. Confirm with Tredoux whether migrations 291 + 292 have been run in Supabase (SQL is in §4 of the handoff — paste directly in chat per the standing "everything runs from the chat" rule, never tell him to open a file).
2. If run: walk the §5 verify checklist live (universal link signup e2e, cap-closed fallback, founder messaging round-trip, per-row QR buttons on device).
3. If Tredoux wants to actually POST the universal link publicly (Facebook groups / under the father-story cold emails), mint it via the 🌍 card first and confirm the cap number he wants live before it goes out — a wrong cap value posted publicly is hard to walk back.
4. Fold this into the standing outreach routine: the universal link is now a candidate CTA for the disadvantaged-wave emails and FB posts — check with Tredoux whether to start using it instead of / alongside per-school FND- links.
5. Continue the campaign-manager daily routine (Gmail sweep, drafts, status flips via scripts/outreach-status.py) per the standing CLAUDE.md orders — this session did not touch campaign/outreach data.
Orchestration reminder: Fable directs only, Sonnet scouts/runs, Opus builds, everything fresh-eyes audited before push.
```
