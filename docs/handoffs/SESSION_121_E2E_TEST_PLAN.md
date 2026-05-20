# Session 121 — End-to-End Test Plan

**Start here.** This is the canonical "walk through every feature from scratch" plan after Session 120's video-call breakthrough. Test each step as you go. Mark items as you pass them.

## Pre-flight (do once before starting)

- [ ] **Two distinct browsers / profiles ready.** Rule #223 — testing in the same Chrome profile produces the UID-collision bug class. Use Chrome profile A + Chrome profile B, OR Chrome + Safari, OR normal + incognito.
- [ ] **Production URL confirmed.** `https://montree.xyz` is the canonical entry. Hard-refresh both browsers (Cmd+Shift+R) so neither holds stale bundles.
- [ ] **Clear stale sessions** in both browsers (DevTools → Application → Clear site data) so the test starts cleanly.

## Step 1 — Agent Application Funnel

Goal: a prospective agent applies via the public landing.

- [ ] **Browser A** (acting as new agent): visit `https://montree.xyz/montree/become-an-agent`
  - Verify the landing page renders: hero, earnings table (20/60/120 student tiers showing $336–$2016/yr), 4-step "How it works", 5-rule lockbox, application form
- [ ] Fill in the application form (use test name + email like `agent-test-<date>@gmail.com`)
- [ ] Submit. Expect: success state with "— Montree" sign-off

**Verify under the hood:**
- [ ] Open super-admin (`/montree/super-admin`) — the agent application alert banner should show this new application at the top of the page
- [ ] Tap **Accept** on the application → ReferralsTab opens pre-filled with name + email
- [ ] Click **Issue Code** → reveal-once gold banner shows the 6-char code and the share URL
- [ ] Copy the share URL — you'll use it for Step 3

**Architectural rules being tested:** #53 (agent_application contact_type), #54 (PATCH gate refuses non-application rows).

## Step 2 — Agent Login + Dashboard

Goal: the agent uses their issued code to log in and see their dashboard.

- [ ] In **Browser A**, log out / clear cookies. Go to `https://montree.xyz/montree/login-select`
- [ ] Enter the 6-char agent code from Step 1
- [ ] Expect: redirect to `/montree/agent/dashboard`
  - Verify: greeting, Stripe Connect banner (because they haven't set up payouts yet), 3-tile earnings summary
- [ ] Visit `/montree/agent/codes` — click "Generate code" with a `pitch_label` like "Test School A"
  - Verify: reveal-once gold banner shows the new referral code (e.g. `AGENT-XXXX`)
- [ ] **Click "Mira" in the nav** — Mira's first-meeting greeting fires
  - Try: "Draft a cold email to Test School A in English"
  - Expect: Haiku-drafted pitch in chat. Tested as Architectural rule #178-182.

## Step 3 — School Signup via Referral

Goal: a school principal signs up using the agent's referral code.

- [ ] Copy the share URL from Step 1 (or the referral code from Step 2). Open in **Browser B** (incognito profile).
  - URL shape: `https://montree.xyz/montree/try?ref=AGENT-XXXX`
- [ ] Verify gold "Referral code: AGENT-XXXX" banner shows on every step until success
- [ ] Pick **Principal** role (gold CTA — should be primary because `?ref=` is present per Session 117 polish)
- [ ] Fill in school name, principal email, language. Click "Let's go"
- [ ] Expect: school created, redirected to `/montree/admin` (Tracy's dashboard)
  - Principal's code IS the referral code itself (Session 90 Phase 2: code becomes the principal's login)

**Verify under the hood:**
- [ ] Back in super-admin Referrals → the agent's row shows the new school under "Referred Schools"
- [ ] The school row in super-admin Schools tab shows `🤝 Agent · <name>` chip with revenue share %

## Step 4 — Principal Onboards Classroom + Teachers

Goal: the principal sets up their classroom and invites a teacher.

In **Browser B** (as principal):
- [ ] Visit `/montree/admin/classrooms` → "Add classroom" → name it
- [ ] Inside the classroom drill-down, add a teacher (name + role)
- [ ] Tap the green "Copy code" button → reveal-once teacher code
- [ ] Tap "Send" → mailto opens with the welcome message template
- [ ] Verify Tracy float pops up on every cockpit page

**Test Tracy:**
- [ ] Click Tracy float → ask "Who's my newest teacher?"
- [ ] Expect: child_focus or list_classrooms tool fires, returns the teacher you just added

## Step 5 — Teacher Logs In + Onboards Children

Goal: teacher logs in with their code, bulk-imports class roster.

- [ ] In **Browser A** (sign out of agent first), enter the teacher's code on login-select
- [ ] Expect: lands on `/montree/dashboard`
- [ ] Tap "Bulk import" → paste 2-3 student names like:
  ```
  Test Kid 1, 2020-05-15
  Test Kid 2, 2019-12-01
  Test Kid 3, 2020-03-10
  ```
- [ ] Expect: redirect to `/montree/dashboard/voice-onboarding` (per Session 79)
- [ ] **OR** tap "Just start with photos" path (Session 81 two-path choice)
- [ ] Verify students appear in the grid

## Step 6 — Curriculum + Focus Works

- [ ] Tap into a child → land on `/montree/dashboard/[childId]`
- [ ] Verify focus work picker — pick one work per area
- [ ] Tap a focus work → Quick Guide modal opens with curriculum content
- [ ] Switch language toggle to Chinese → curriculum renders in Chinese (per Session 78 — verify name + description switch)

## Step 7 — Photo Capture + AI Identification

- [ ] Tap a focus work → "Capture" or use Smart Capture from the dashboard
- [ ] Take/upload a photo of any Montessori-looking material
- [ ] Wait ~5s for Haiku two-pass identification
- [ ] **Photo audit**: navigate to `/montree/dashboard/photo-audit`
  - Verify the photo appears with AI guess + confidence chips
  - Try ✓ Correct → photo flips to confirmed
  - Try "Wrong" → ThisIsSheet picker opens with curriculum search
  - Try "Save as Other" → photo saves with `sonnet_draft.is_other=true`

## Step 8 — Parent Invite + Parent Portal

Goal: invite a parent for a child, log in as parent, see Weekly Wrap.

In **Browser A** (teacher):
- [ ] Tap More → "Parent Manager" (Session 119 rename)
- [ ] Generate parent code for one of the test kids
- [ ] Copy the parent code + share URL

In **Browser B** (sign out of principal, sign in as parent):
- [ ] Use the parent code on login-select
- [ ] Expect: lands on `/montree/parent/dashboard`
- [ ] Verify: parent dashboard shows the child name, photos strip (if any photos confirmed), upcoming events
- [ ] **Pending appointment banner** should NOT show (no invites yet — Session 120 banner only appears when there are pending invites)

## Step 9 — Messaging (WeChat-style)

Goal: test the bidirectional messaging.

**As parent (Browser B):**
- [ ] Tap "Messages" → land on `/montree/parent/messages`
- [ ] Tap + → compose to the teacher (child + recipient picker)
- [ ] Send a test message

**As teacher (Browser A):**
- [ ] Tap Messages icon → land on `/montree/dashboard/parent-chats` (Session 120 redirect)
- [ ] Verify: WeChat-style list shows the parent's name as the row title, last message snippet
- [ ] Tap into the parent's row → land on the full chat stream
- [ ] Reply
- [ ] Verify the reply appears on parent side immediately

## Step 10 — Appointments (the new Session 120 system)

Goal: book an appointment from chat, accept on dashboard, render the [[APPT:]] card.

**As teacher (Browser A) in parent-chats stream:**
- [ ] Tap the 📅 calendar button next to Send
- [ ] QuickSetAppointmentModal opens (parent + child locked from thread context)
- [ ] Pick: Video call, tomorrow 3pm, 30 min
- [ ] Tap "Send invitation"
- [ ] Verify: success state + chat refreshes to show the [[APPT:invite]] card inline

**As parent (Browser B):**
- [ ] Go to `/montree/parent/dashboard`
- [ ] **Pending appointment banner** should appear at the top — gold border, Accept / Decline buttons
- [ ] OR navigate to the chat → see the [[APPT:invite]] card with Accept/Decline
- [ ] Tap **Accept** → card updates inline, [[APPT:confirmed]] card posts into the thread

**As teacher (Browser A):**
- [ ] Refresh `/montree/dashboard` → pending appointment banner should be GONE (resolved)
- [ ] Open the chat → see the [[APPT:confirmed]] card with "Confirmed for tomorrow 3pm"

## Step 11 — Video Call (the Session 120 working flow)

Goal: tap Join on the [[APPT:confirmed]] card and have both sides see each other.

**Pre-req:** the appointment time must be within ±2h of now (Session 120 rule). For this test, EDIT the appointment time directly in Supabase to `now() + 5 min` OR re-create the appointment for "5 minutes from now" so the Join button is enabled.

- [ ] As teacher (Browser A): tap **Join now** on the [[APPT:confirmed]] card
- [ ] As parent (Browser B): tap **Join now** on the [[APPT:confirmed]] card
- [ ] Both grant camera + mic permissions
- [ ] **Verify both sides see each other's video** (the Session 120 fix)
- [ ] Verify WaitingTile diagnostic block shows DIFFERENT UIDs on the two devices (architectural rule #221)

If video doesn't work: screenshot the WaitingTile diagnostic block on both devices BEFORE one peer joins, then compare the channel + UID + region. Should be same channel, same region, DIFFERENT UID.

## Step 12 — Meeting Notes (in-person recording)

Goal: test the Whisper → Sonnet flow for in-person meetings.

**Pre-req:** Migration 214 must be run in Supabase for teacher meeting notes; migration 215 for principal meeting notes.

**As teacher (Browser A):**
- [ ] Visit `/montree/dashboard/conversations` (link in More menu — labelled "Meeting Notes")
- [ ] Consent banner appears: "Tell the parent" reminder
- [ ] Tap Record → speak 30s of test audio (e.g. summarize a fake meeting)
- [ ] Tap Stop → Whisper transcribes + Sonnet writes 3-paragraph summary
- [ ] **Verify audio is NOT persisted** (DevTools Network tab — no upload to Supabase Storage; only Whisper + Sonnet API calls)
- [ ] Optionally link to a child + add notes → Save
- [ ] Verify it appears in the list

**As principal (Browser B):**
- [ ] Same flow at `/montree/admin/meeting-notes`

## Step 13 — Principal Vault (encrypted)

Goal: test the E2E encrypted recording flow.

**Pre-req:** Migration 185 already RUN (Session 87).

- [ ] As principal: visit `/montree/admin/conversations`
- [ ] First time: set a vault password (the lock icon)
- [ ] Record a 30s test → Whisper + Sonnet → encrypt with vault password
- [ ] Lock + reopen → enter password → decrypt → see summary
- [ ] **Try a wrong password** → expect the `DECRYPT_FAILURE_SENTINEL` message ("Could not decrypt") not a crash

## Step 14 — Agora Cloud Recording (BLOCKED — operational setup needed)

This is Stage B. Requires:
- Credit card on Agora account
- Cloud Recording feature enabled in Agora Console
- Env vars `AGORA_CUSTOMER_KEY` + `AGORA_CUSTOMER_SECRET` in Railway
- Supabase Storage bucket `meeting-recordings` created
- Migration 223 run in Supabase
- `video_recording` feature flag flipped on for school
- Per-appointment `recording_enabled = true` toggle (no UI exists yet — would need a small build)

**Skip for this session. Queue for a focused operational session when ready.**

## Step 15 — Stripe Billing (verify trial state)

- [ ] As principal: visit `/montree/admin/billing`
- [ ] Verify: status pill shows "Trialing" or similar
- [ ] Trial-expiring banner should NOT show yet (banner only shows in last 14 days of trial)

## Architectural rules to KEEP in mind as you test

- **#221** — Agora `/agora-token` MUST receive `?as=` hint
- **#222** — `/dashboard/messages` redirects to `/parent-chats`
- **#223** — Two-device testing uses two browsers / profiles
- All Session 120 rules #211-220 (APPT magic prefix, fire-and-forget, video render race, etc.)

## When things break

1. **Hard refresh first** (Cmd+Shift+R). Service worker may be holding stale bundles.
2. **Check the WaitingTile diagnostic** on video calls — channel + UID + region visible.
3. **Pull Railway logs** for `[agora-token]` entries — they include appointmentId, callerRole, callerId, channel, uid, asHint.
4. **If a test fails, stop and post:** which step failed + screenshot + relevant console log. Don't try to work around — diagnose first.
