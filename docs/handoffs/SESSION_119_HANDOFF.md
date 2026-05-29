# Session 119 — Comprehensive Handoff

**Session window:** May 19, 2026 evening → May 20, 2026 ~07:00 China time
**Theme:** Overnight automated build — knocking out Tredoux's task queue while he slept, surviving a Railway edge outage mid-stream, capping with the English Progress Tracker.

**Headline:** 7 commits shipped. 8 distinct features. ~3,000 lines added. All audit-clean (multiple rounds, fresh-eye agent on the big ones). One Railway edge outage weathered without code damage.

---

## 🚨 Read this first

### Migration to run before the English Tracker works

```sql
-- Paste this in Supabase SQL Editor:
-- /Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/migrations/225_child_english_progress.sql
```

Until run, the English Progress tab shows a "Run migration 225" banner instead of crashing. Fail-graceful.

### Production state

✅ `montree.xyz` is up. Railway recovered from the May 19 22:22 UTC edge outage around ~05:00 UTC May 20.
✅ All 7 Session 119 commits pushed to `origin/main`. Railway auto-deployed throughout.
✅ Final commit on `main`: `28cfdf24`.

---

## Final commit chain (in order)

| SHA | What | Audit rounds |
|---|---|---|
| `cd33058a` | Session 119 main ship — English schedule dynamic rolling + 6 ship items | 3 |
| `0cd58151` | Agora video call CSP `:*` port wildcard fix | 2 |
| `1d84a8d4` | Parent Manager rename + WeChat-style parent chats v1 | 3 |
| `3886cf67` | Parent chat audit fix (per-parent stream order DESC+limit) | 1 follow-up |
| `03d695b2` | Parent chat schema fix (`created_at` → `sent_at`, `deleted_at` filter) | 1 follow-up |
| `05dce8be` | Clickable video-call invite cards + instant call + voice option | 3 |
| `28cfdf24` | English Progress Tracker (Phases 1 + 2 + 3) | 3 |

All commits use Desktop Commander `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main` per the canonical push pattern (CLAUDE.md rule).

---

## What shipped, in order of impact

### 1. Agora video call CSP fix (commit `0cd58151`)

**The single highest-leverage one-line change of the session.** Tredoux's iPhone+Mac call log showed:
- `Connecting to 'wss://X.edge.agora.io:4714/' violates the following Content Security Policy directive`
- `AgoraRTCError WS_ABORT: LEAVE` on first device
- `SERVER_ERROR` disconnect 20s after the second device's retry joined via port-443 fallback

**Root cause:** Per CSP spec, a host-source with no explicit port matches only the scheme's default port (443 for wss/https). Agora's SDK first probes non-standard ports (4710, 4714, etc.) — those got CSP-blocked. The SDK falls back to port 443 successfully, but burns 5-7s per retry per device. With two devices doing this dance, they rarely converged in the join window. The SERVER_ERROR 20s later is the cascade of a ghost session from the failed first attempt.

**Fix:** appended `:*` to every Agora-related connect-src host source in `next.config.ts`. CSP spec says `:*` is the explicit any-port wildcard. The recommended Agora CSP per their official docs uses exactly this pattern.

```ts
"connect-src 'self' ... https://*.agora.io:* wss://*.agora.io:* https://*.sd-rtn.com:* wss://*.sd-rtn.com:* https://*.agoraio.cn:* wss://*.agoraio.cn:*"
```

Verified independently: token-builder is sound (UID deterministic per role+identityId), channel naming is deterministic, no other code change needed.

### 2. Parent Manager + WeChat-style parent chats (commits `1d84a8d4` + `3886cf67` + `03d695b2`)

**Rename** "Invite parents" → "Parent Manager" in the More menu.

**New WeChat-style chat surface** at `/montree/dashboard/parent-chats` — one row per parent (not per thread, which is how the existing `/montree/dashboard/messages` works). Collapses every thread shared with that parent into a single row showing last snippet + time + unread badge + child context. Tap → per-parent flat chronological stream across all threads.

**Implementation:**
- NEW `/api/montree/dashboard/parent-chats` (GET list) + `/[parentId]` (GET stream + POST send)
- NEW `/montree/dashboard/parent-chats/page.tsx` (list view with search)
- NEW `/montree/dashboard/parent-chats/[parentId]/page.tsx` (stream view + send composer)
- Chat icon added to Parent Manager page (top-right of title)

**Architecturally:** uses the EXISTING `montree_message_threads` + `montree_thread_messages` schema. No parallel data model. Principal-observer transparency (Session 97) keeps working. Astra drafting indicator keeps working. Send goes to most-recently-active shared thread, or creates a fresh parent_teacher thread (no child anchor) when none exists.

**Audit catches fixed:** schema column is `sent_at` not `created_at` (would have silently returned 0 messages). `deleted_at IS NULL` filter added. Order DESC + limit (not ASC + limit — would have truncated newest messages).

### 3. Clickable video-call invite cards + instant call (commit `05dce8be`)

Tredoux's user-flow ask: *"I click on the message that contains the invite to the video call. It takes me to the chat but I want the link here for the actual video call so I can just go in."*

**Closes that loop:**
- Magic-prefix convention `[[VCALL:<appointmentId>]] <caption>` marks a message as a video-call invite. Old clients see the caption as plain text — degrades gracefully, no migration.
- `postVideoCallInvite()` helper finds/creates the parent_teacher thread + inserts the magic message. Re-uses `createThreadWithParticipants` so Session 97 principal-observer transparency works automatically.
- Rich card renderer in three chat surfaces: parent-chats stream, legacy teacher messages thread, parent messages thread. Gold-bordered card with "Video call" header + caption + emerald "Join now" pill.
- Dedicated Join pages at `/montree/dashboard/calls/[id]` (teacher/principal) and `/montree/parent/calls/[id]` (parent). Both pre-flight `/agora-token` then mount AgoraVideoCall fullscreen.
- Instant-call endpoint `/api/montree/dashboard/parent-chats/[parentId]/instant-call` — creates an Agora appointment for RIGHT NOW (status=confirmed, 30min, child anchor from parent's first linked child), attaches caller as primary host, posts the invite, returns join_url for the host to redirect to.
- Voice + Video call buttons in the parent-chats stream header. `?audio=1` query param threads through (voice button currently joins with video — AgoraVideoCall `audioOnly` prop wiring deferred).

**Audit catch fixed:** auto-post for SCHEDULED appointments moved from creation (status=pending, would 409 on Join tap) to parent-side accept flow (status=confirmed). Instant calls still post on create because they skip pending.

### 4. Mobile dashboard header overlap fix (in `cd33058a`)

Yesterday's Messages icon brought the right cluster to 5 elements (LanguageToggle + Camera + Messages + Mic + More). On iPhone width that crammed into the teacher pill on the left.

**Single `@media (max-width: 640px)` block** in DashboardHeader.tsx: hides inline Messages icon (kept in More menu — same destination), tightens cluster gap 8 → 4, IconBtn padding 10 → 6, teacher pill text cap 100 → 56. Desktop unchanged.

### 5. More menu reorganized (in `cd33058a`)

- "Classroom Overview" pinned to the TOP of the menu (was buried in the gated extras section). Always visible.
- Help (InboxButton) row hidden — "no function" per Tredoux. Kept in code (JSX comment block) for hide-don't-delete.

### 6. Appointments page accordions hidden (in `cd33058a`)

"Open every week on…" and "Time away" accordions hidden via single `SHOW_LEGACY_ACCORDIONS=false` constant. Hide-don't-delete per CLAUDE.md rule #56.

### 7. Super-admin Referrals actions wrap (in `cd33058a`)

Actions cell had `whitespace-nowrap` which cropped the 8+ action buttons in narrower viewports. Tredoux couldn't see the 🔓 "Log in as agent" button even though it was rendered. Switched to `flex flex-wrap justify-end` so they stack onto a second row when needed.

### 8. Agent default revenue share % unblock (in `cd33058a`)

Brand-new agents got `agent_default_share_pct = NULL`, hitting "Self-service code generation is currently disabled" until Tredoux remembered to PATCH it.

- `super-admin/agents/[id]/login/route.ts`: `DEFAULT_AGENT_SHARE_PCT = 20` constant + conditional default in the POST update payload. Operator override still wins.
- `super-admin/agent-applications/[id]/accept/route.ts`: same default in the Accept-application flow.
- SQL backfill for existing NULL agents:
  ```sql
  UPDATE montree_teachers
  SET agent_default_share_pct = 20
  WHERE is_agent = true AND agent_default_share_pct IS NULL;
  ```

### 9. English Progress Tracker (commit `28cfdf24`)

Built during the Railway outage; pushed after recovery. The most substantive feature of the session.

**Phase 1 — Data + position display:**
- `migrations/225_child_english_progress.sql` — table, indexes, updated_at trigger.
- `lib/montree/english-sequence/lesson-map.ts` — canonical 128-lesson catalog (53 Pink + 30 Blue + 45 Green). Helpers: `getLesson`, `getPhaseFor`, `getPhaseProgress`, `sanitizeMastered`.
- `/api/montree/dashboard/english-progress` route — GET (class roll-call) + PATCH (advance/set/reset with optimistic UI feedback).
- Classroom Overview gets a 3rd tab. Per-child cards show phase color dot + lesson number + label + phase progress bars + overall multicolor strip + Advance ▸ + ⚙ inline picker.

**Phase 2 — Photo-audit auto-advance:**
- `client-helper.ts` — `offerEnglishAdvance({childId, childName, area})` fires sonner toast with "Advance +1" button after Language confirms. Per-child 12s dedup window so batch confirms don't spam.
- Wired into 4 of 5 photo-audit confirm sites (handleConfirm, attachToExistingWork, handleResolvePhoto, handleFix). Batch confirm skipped (would spam).

**Phase 3 — Class heatmap:**
- `ClassEnglishHeatmap` component above per-child cards. Horizontal strip showing every child as phase-colored dot on 1→128 axis. Phase-tinted gradient background. Dots stack vertically on lesson collisions. Hover/tap shows name + lesson. Footer summary: per-phase counts + class average lesson.

---

## Architectural rules locked in this session

(Continuing the numbering from CLAUDE.md's standing list — these are now load-bearing for future agents.)

1. **CSP host-source patterns MUST include `:*` for any third-party WebRTC SDK** (Agora, Twilio, LiveKit). Default-port-only matching is a silent gatekeeper.
2. **`[[VCALL:<appointmentId>]] <caption>` is the canonical magic-prefix for video-call invite messages.** Renderers detect via `parseVideoCallInvite()`. Old clients degrade gracefully (show caption as plain text).
3. **`montree_thread_messages` time column is `sent_at` (NOT `created_at`).** Always filter `deleted_at IS NULL` for chat reads.
4. **Auto-post invite cards fire on status `pending→confirmed` for scheduled calls**, on creation for instant calls. Never on bare creation of a `pending` appointment — would 409 on Join.
5. **`montree_child_english_progress.current_lesson` is the SOLE source of truth for "what lesson is this child on now."** `mastered_lessons` is derived stats.
6. **App-code invariant: `mastered_lessons ⊇ [1..current_lesson - 1]`.** Enforced by `sanitizeMastered()` in `lesson-map.ts`. All write paths must call it.
7. **`LESSONS` const in `lesson-map.ts` is FROZEN.** Renumbering would invalidate every existing child's position. Future additions append-only with explicit approval.
8. **The English Progress tab degrades gracefully when migration 225 hasn't run** (Postgres 42P01 → `migration_pending: true` in response, UI shows banner). Never crash on missing schema.
9. **`offerEnglishAdvance` has a per-child 12s dedup window.** Burst-confirms in a busy classroom don't spam toasts.
10. **WeChat-style parent chats use the EXISTING thread schema** — no parallel data model. One row per parent, threads collapsed. Send goes to most-recently-active shared thread.
11. **New agents default to 20% revenue share when `agent_default_share_pct` is NULL.** Operator override wins. Never downgrades an already-set %.
12. **Mobile header right-cluster: hide inline Messages icon on ≤640px** (kept in More menu for one-tap reach).
13. **`SHOW_LEGACY_ACCORDIONS = false` in AppointmentsCalendar** — flip to true to restore the "Open every week" + "Time away" sections. Hide-don't-delete.

---

## Production verification checklist (next session, after Railway settles)

1. **Run migration 225** in Supabase SQL Editor.
2. **Run the agent backfill SQL** above for existing NULL-pct agents.
3. **Verify Agora video call** — open `/montree/dashboard/parent-chats` → pick a parent → tap Video. Both devices should join cleanly within a few seconds (no more CSP retry storm).
4. **Verify Parent Manager rename** — More menu → "Parent Manager" (was "Invite parents").
5. **Verify WeChat-style chat** — Parent Manager → "Parent Chats" pill → list shows one row per parent. Tap a row → flat stream.
6. **Verify clickable video invite** — book a scheduled appointment → parent accepts → check the parent_teacher chat: should show a gold-bordered "Video call" card with "Join now" pill. Tap → straight into call (no calendar bounce).
7. **Verify instant call** — Parent Manager → Parent Chats → tap a parent → tap 📹 Video. Host redirected to call. Parent sees invite card in their chat.
8. **Verify mobile header** — open Whale Class dashboard on iPhone. No overlap, no overflow.
9. **Verify Classroom Overview** — More menu first item is "Classroom Overview". Open it. Three tabs: Shelf, English Schedule, English Progress.
10. **Verify English Progress tab** — class heatmap at top + per-child cards below. Pick Amy → tap ⚙ → set lesson 14 → see phase color flip to Pink + lesson label "/b/". Tap ▸ → advance to 15. Tap a Language photo confirm in /photo-audit → toast offers "Advance +1" for that child.
11. **Verify super-admin Agents tab** — 🔓 "Log in as agent" button is now visible alongside the other action buttons (no more cropping).
12. **Verify agent self-service** — log in as an agent (Gloria has GLORIA-3KD5 if seeded) → `/montree/agent/codes` → "Generate code" works (no more "self-service disabled" wall).

---

## Deferred items (intentional — flagged for future sessions)

### English Tracker follow-ups

- **Phase 2.5 — wire auto-advance into the 5 component-level confirm surfaces**: PhotoInsightPopup, PhotoInsightButton ×2, TeachGuruWorkModal ×2, PhotoEditModal, TellAiSheet. Each has different local-var shapes; needs careful per-surface read. Lower confirm volume than photo-audit. ~30-45 min focused work.
- **Lesson → curriculum work mapping** in `lesson-map.ts`: a `lessonToWorks: Record<number, string[]>` table. Then Phase 2's helper can gate the auto-advance prompt to only fire when the confirmed work is actually mapped to the child's current lesson. Sharper UX; Phase 2 v1 fires on any Language confirm which is acceptable.
- **Per-child Mandarin transfer notes** — when a teacher repeatedly corrects "sa → sat" for one kid, surface a hint "Lesson 7 needs revisit — child is dropping final /t/." Compounds the moat. Requires extending the brain.ts visual memory or a new `montree_child_mandarin_transfer` table.

### Video call follow-ups

- **AgoraVideoCall `audioOnly` prop** — voice button currently joins with video. Need ~30 lines: thread `audioOnly` from join page → AgoraVideoCall props → skip `createCameraVideoTrack` when true. Then the existing `?audio=1` query param actually does what it promises.
- **Principal-observer "this isn't your call" hint** on chat cards — observers can tap Join and get a friendly error, not a crash. Cosmetic only.
- **Race-on-double-confirm** in english-progress PATCH — currently logs a console.warn diagnostic; could escalate to a conditional UPDATE filtered on `current_lesson = previousValue` for true atomicity.

### Carry-overs from earlier CLAUDE.md call-to-action

- **Stage A Agora activation** (Session 117 carry-over) — migration 223 + flag flip + 2-device end-to-end test per `docs/handoffs/AGORA_STAGE_A_QUICKSTART.md`. ~5 min Tredoux time. Now even MORE valuable post-CSP-fix since calls actually work.
- **Appointments i18n sweep** — appointments + new calendar surface English-only. ~30 new keys × 12 locales via Haiku batch.
- **Mira → Astra super-admin scope** (Session 108 Phase 4.8).
- **Outreach follow-ups** — FAMM Argentina, Cambridge Montessori Global, Otari NZ, Lions Gate, Montessori Norge.

---

## About the Railway outage (May 19 22:22 UTC)

Railway posted "Partial outage on edge network · Major Outage" mid-session. Both `montree.xyz` AND `backboard.railway.com` (their own login backend) were dropping requests with "unconditional drop overload" — Envoy proxy load-shedding. Total downtime ~1.5 hours. No code damage; service recovered on its own. First incident of this scale in the project's recorded history.

**Decision:** Don't switch to Vercel reactively. Architecture would need rework (Vercel Pro caps function duration at 60s; Montree has 120s AI routes). Recommended approach: build a "warm spare" Vercel staging deployment as insurance, executable in 10 min via DNS swap if Railway has another major incident in the next 30 days. Otherwise stay on Railway.

---

## File index (every file touched this session, alphabetical)

**Created:**
- `app/api/montree/dashboard/english-missing/route.ts`
- `app/api/montree/dashboard/english-progress/route.ts`
- `app/api/montree/dashboard/parent-chats/route.ts`
- `app/api/montree/dashboard/parent-chats/[parentId]/route.ts`
- `app/api/montree/dashboard/parent-chats/[parentId]/instant-call/route.ts`
- `app/montree/dashboard/calls/[appointmentId]/page.tsx`
- `app/montree/dashboard/parent-chats/page.tsx`
- `app/montree/dashboard/parent-chats/[parentId]/page.tsx`
- `app/montree/parent/calls/[appointmentId]/page.tsx`
- `lib/montree/english-sequence/client-helper.ts`
- `lib/montree/english-sequence/lesson-map.ts`
- `lib/montree/messaging/video-call-invite.ts`
- `migrations/225_child_english_progress.sql`
- `docs/handoffs/SESSION_119_HANDOFF.md` (this file)

**Modified:**
- `app/api/montree/appointments/route.ts`
- `app/api/montree/dashboard/english-schedule/route.ts`
- `app/api/montree/parent/appointments/[id]/route.ts`
- `app/api/montree/super-admin/agent-applications/[id]/accept/route.ts`
- `app/api/montree/super-admin/agents/[id]/login/route.ts`
- `app/montree/dashboard/classroom-overview/page.tsx`
- `app/montree/dashboard/messages/[threadId]/page.tsx`
- `app/montree/dashboard/parent-codes/page.tsx`
- `app/montree/dashboard/photo-audit/page.tsx`
- `app/montree/parent/messages/[threadId]/page.tsx`
- `components/montree/DashboardHeader.tsx`
- `components/montree/appointments/AppointmentsCalendar.tsx`
- `components/montree/guru/PhotoInsightButton.tsx`
- `components/montree/guru/PhotoInsightPopup.tsx`
- `components/montree/guru/TeachGuruWorkModal.tsx`
- `components/montree/media/PhotoEditModal.tsx`
- `components/montree/photo-audit/TellAiSheet.tsx`
- `components/montree/super-admin/ReferralsTab.tsx`
- `lib/montree/cache.ts`
- `lib/montree/i18n/*.ts` (all 12 locales)
- `next.config.ts`

---

## Resume prompt for Session 120

> "Resume Session 120 cold. Check `docs/handoffs/SESSION_119_HANDOFF.md` for the prior session's full state. First action: confirm migration 225 has been run, then walk steps 1–12 of the production verification checklist. After that, prioritize: (a) AgoraVideoCall audioOnly prop wiring (so the voice-call button actually does voice), (b) lesson-to-work mapping in lesson-map.ts (so Phase 2's auto-advance prompt fires only when relevant), (c) Phase 2.5 wiring to the 5 component-level confirm surfaces. Beyond that: Stage A Agora activation (migration 223 + 2-device test), then appointments i18n sweep."
