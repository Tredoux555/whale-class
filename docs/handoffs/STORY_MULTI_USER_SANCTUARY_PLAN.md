# Handoff — Multi-User Sanctuary + Shared Emergency Board

**Date:** 2026-06-16
**Author of this handoff:** Cowork session (pre chat-clear)
**Status:** PLAN ONLY — no code written yet. Scope confirmed against live code + DB.

---

## 1. What Tredoux wants (the goal, in his words)

Repurpose the **Story system** from its old single-pair use into a small, private family/inner-circle platform with two distinct capabilities:

1. **One shared "emergency" message board** — a common room that Tredoux, his dad **Temba**, his wife **Bayan**, and (likely) **Gloria** can all post to and read. It's the "when all else fails" channel. His son also gets a simple emergency line into it.
2. **A private Sanctuary for each person** — their own **Coach** (the therapist/life-coach AI, currently "Joe") and **Planner**, fully isolated from everyone else's. *"Everyone should have a coach. That's the core purpose."*

> Tredoux will provide the personal details / profile material for each person (Temba, Bayan, Gloria) in a later session. Build the structure now; fill the profiles when he supplies them.

**Later (deferred, not v1):** redesign the chat UI into a nicer chatroom / personal-messaging experience (per-pair DMs, etc.). For now the messaging is just the shared emergency board.

---

## 2. The people

| Person | Relationship | Notes |
|---|---|---|
| Tredoux | owner / super-user | Existing Sanctuary owner. Admin who creates the others. |
| Temba | his dad | New. Own Coach + Planner. Profile TBD. |
| Bayan | his wife | New. Own Coach + Planner — coach works "incredibly well as a therapist," she'd benefit. Profile TBD. |
| Gloria | work colleague (Montree agent) | Possible/likely. Own Coach + Planner if she works with him. Profile TBD. |
| (Son) | his son | Only needs access to the **shared emergency board**, not a full Sanctuary (confirm). |

---

## 3. What exists today (confirmed against the code — this is the starting reality)

### The Story system lives at `/story/*`, two layers:
- **User-facing messaging:** `/story/[session]` — the people who log in via `story_users` (bcrypt). Auth route: `app/api/story/auth/route.ts`. Successful logins → `story_login_logs`; failed → `montree_super_admin_audit` (`action='login_failed'`). JWT, 24h TTL, httpOnly cookie `story-auth`.
- **Sanctuary (personal platform):** route group `app/story/admin/(personal)/` — **Planner · Coach · Projects**. Gated behind the **single** Story admin login (`story_admin_users`, currently Tredoux = "J"). Admin auth: `app/api/story/admin/auth/route.ts`.

### The messaging data (the part being repurposed as the emergency board):
- `story_message_history` — text + media messages. **Ephemeral mode is ON** (`STORY_EPHEMERAL=true`): only the newest 3 text messages survive; older ones hard-deleted on every write (`lib/story/ephemeral.ts`).
- Media (photo/video/audio/file) has a **separate 24h TTL** (`lib/story/media-retention.ts`).
- `secret_stories` — the old weekly "hidden note."
- Web push infra exists: `story_push_subscriptions` + `/api/story/push/*` (migrations 228/229, VAPID keys set in Railway).
- 🚨 **As of this session, `story_message_history` and `secret_stories` are both empty** (cleared / rolled off — the old conversation is gone).

### The Sanctuary internals (the part being cloned per-person):
- **Migrations:** `257_story_personal_platform.sql`, `258_story_plan_events.sql`, `259_story_coach_log.sql` — all RUN.
- **Tables (ALL SINGLE-TENANT — no owner/user column on any of them):**
  - `story_diary_entries` (encrypted body/title, plaintext date+mood for the calendar)
  - `story_projects` (encrypted)
  - `story_coach_memory` (encrypted; supersede-on-update; mirror of montree_principal_memory)
  - `story_plan_days` (encrypted)
  - `story_plan_events` (planner timed events — migration 258)
  - `story_coach_log` (encrypted conversation archive — migration 259)
  - `story_messages_secret` (hashed phrase for the hidden Messages door)
- **The Coach ("Joe", Sonnet):** `lib/story/coach/` — `system-prompt.ts`, `profile.ts`, `memory.ts`, `consolidation.ts`, `tool-definitions.ts`, `tool-executor.ts`, `recent-thread.ts`, `personal-data.ts`, `knowledge-loader.ts`, plus `use-coach-chat.ts` / `use-voice-record.ts` / `coach-chat-context.tsx`. SSE route: `app/api/story/coach/route.ts`. Voice: `app/api/story/coach/transcribe/route.ts`.
- **Profile:** `lib/story/coach/profile.ts` loads a **hardcoded** `lib/story/coach/about-tredoux.md`, cached for process lifetime. **One profile, one person.**
- **Knowledge base (shared, generic — reusable for everyone):** 15 framework files in `lib/story/coach/knowledge/` (atomic-habits, burnout, deep-work, essentialism, four-thousand-weeks, frankl, gtd, indistractable, mindset, narcissistic-dynamics, one-thing, seven-habits, sleep, stoicism, war-of-art).
- **Encryption:** `lib/story/diary-crypto.ts` — AES-256-GCM (`gcm:iv:tag:ct`), server-held key `STORY_DIARY_KEY` (falls back to a key derived from `STORY_JWT_SECRET` if unset). **Server-readable by design — NOT end-to-end.** A raw DB leak is useless without the key; isolation between people must therefore be enforced at the **row/owner level**, not by crypto.
- **RLS:** every personal table is RLS-enabled with no policies (default-deny); the app reads them **only** server-side via the service-role key. The browser anon key gets zero access.

### 🚨 The load-bearing conclusion
The Sanctuary was built for **exactly one person**. There is no concept of a second user anywhere — not in the tables, not in the profile loader, not in the auth gate. Supporting Temba/Bayan/Gloria is a **multi-tenancy build**, not a configuration change.

---

## 4. Architecture decision

**Go multi-tenant in ONE app (owner-scoped tables). Do NOT clone the app per person.**

Why not separate instances: the **shared emergency board is a hard requirement** — separate Supabase projects/deployments per person would put everyone in different databases and make a common board painful. One system, many owners, is the right shape because the shared board forces it anyway.

Core model:
- One **accounts** concept where each person is BOTH (a) a participant on the shared emergency board AND (b) the owner of a private Sanctuary.
- Every Sanctuary table gets an **`owner_id`** column; every read/write is scoped to the logged-in owner.
- Each person gets their **own coach profile** (`about-<name>.md` or a DB profile row) loaded by owner.
- The shared board is the one place data is intentionally common to all members.

---

## 5. Phased build plan (with honest effort)

This is a **medium build — roughly 2–4 focused sessions**, dominated by the isolation work in Phase 2.

### Phase 1 — Identity, accounts & user creation (~1 session)
- Decide the identity model (see Open Question A). Recommended: a single `story_accounts` table (or extend `story_users`) where each row = one person with: username, password_hash, display_name, `is_super` (Tredoux = true), `has_sanctuary` (son could be false), `profile_key` (which about-*.md to load), created_at.
- Admin-only **"create user" flow** so Tredoux can add Temba / Bayan / Gloria / son (set username + temporary password + whether they get a Sanctuary). This is the "scope for creating new users" he asked for.
- Login routing: after auth, the app knows WHO you are → serves YOUR Sanctuary + the shared board.

### Phase 2 — Multi-tenancy retrofit of the Sanctuary (~1–2 sessions, the bulk + the risk)
- **Migration:** add `owner_id uuid NOT NULL` (FK to the accounts table) to all 7 personal tables: `story_diary_entries`, `story_projects`, `story_coach_memory`, `story_plan_days`, `story_plan_events`, `story_coach_log`, `story_messages_secret`. Backfill existing rows → Tredoux's id. Add `(owner_id, …)` indexes; make existing unique indexes per-owner (e.g. plan_days unique on `(owner_id, plan_date)`).
- **Retrofit every query** in `lib/story/coach/*` and the personal API routes + page data fetches to STAMP `owner_id` on write and FILTER by `owner_id` on read. Touch points: coach route, memory.ts, consolidation.ts, personal-data.ts, recent-thread.ts, tool-executor.ts, planner routes, projects routes, diary routes.
- **Per-user profile:** change `profile.ts` from the hardcoded path + lifetime cache to a **per-owner load** (cache keyed by owner). Author `about-temba.md`, `about-bayan.md`, `about-gloria.md` from the material Tredoux provides. Keep the shared 15-framework knowledge base for everyone (optionally allow per-person emphasis).
- **🚨 ISOLATION AUDIT (mandatory):** grep every Sanctuary query and confirm `owner_id` is present on it. A single missed filter = one person reading another's therapy/diary. This is the highest-stakes part of the whole build — treat it like the cross-tenant audits in the Montree codebase. Add an automated test that User B can never read User A's rows.

### Phase 3 — Shared emergency message board (~0.5–1 session)
- Repurpose `story_message_history` into a **shared room** all members can post to and read (sender = account, visible to all members). Confirm Open Question B (one shared room vs pairwise).
- **🚨 Turn OFF ephemeral for the board** (`STORY_EPHEMERAL=false` in Railway) — emergency messages must NOT auto-delete after 3 messages / 24h. An emergency note from his son vanishing is the opposite of what's wanted. Decide a sane retention (probably "keep, or long TTL").
- **Wire push notifications** for the board (infra already exists: `story_push_subscriptions`, VAPID set). "Emergency" implies the recipient should be alerted. Strongly recommended.
- Son's access = membership in this board only, no Sanctuary (if confirmed).

### Phase 4 — Profiles & coach tuning (quick, gated on Tredoux's input)
- Drop in each person's `about-*.md` once Tredoux supplies details. Bayan's coach leans therapeutic; Temba's to his context; Gloria's toward work/professional coaching + the Montree context.

### Phase 5 — UI redesign (DEFERRED, separate effort)
- Chatroom / personal-messaging interface (per-pair DMs, nicer thread UI). Explicitly out of scope for v1.

---

## 6. Open questions for Tredoux (he asked "any questions?")

- **A. Identity model:** one unified accounts table for everyone (recommended), or keep the existing split between `story_users` (messaging) and `story_admin_users` (Sanctuary)? Unifying is cleaner now that everyone is both.
- **B. Shared board shape:** ONE common room everyone sees (sounds like the intent), or pairwise (each person ↔ Tredoux only)? v1 recommendation: one shared room.
- **C. Retention on the emergency board:** confirm we turn ephemeral OFF and keep messages (recommended for an emergency channel). Any retention limit at all?
- **D. Push alerts:** enable push notifications for the board? (Recommended — it's an emergency line.)
- **E. Does the son get only the board, no Sanctuary?** Assumed yes.
- **F. The disguise:** the current Story system hides behind a Montree front + a hidden long-press door. Keep that covert layer for any of these users, or give the family a plain, honest login? For family, plain is simpler — confirm.
- **G. Encryption key:** keep the single server-held `STORY_DIARY_KEY` for everyone (fine given isolation is row-level, and the model is already server-readable not E2E)? Or per-person keys (more work, marginal benefit since server reads it anyway for the Coach).
- **H. Who can create users?** Only Tredoux (super-user). Assumed yes.

---

## 7. Quick wins available immediately (independent of the big build)
- The old conversation is already wiped; `story_message_history` + `secret_stories` are empty.
- To stop auto-deletion ahead of the board work: in Railway → service → Variables → set `STORY_EPHEMERAL=false` (or delete it) → redeploy. (Can't be done from the codebase; it's an env var.)
- The son emergency-line use needs almost nothing once the board exists — it's just board membership.

---

## 8. Context for why this is happening (one line, so a fresh session understands)
The old single-pair use of the messaging system has ended (the other party stopped using it; verified via login logs that her account works and she simply isn't logging in — not a technical lockout). Tredoux is keeping the platform and turning it into family/inner-circle infrastructure: a shared emergency board + a private Coach/Planner for each person.

---

## 9. First moves for the next session
1. Get Tredoux's answers to Open Questions A–H (especially A, B, C).
2. Collect his profile material for Temba, Bayan, (Gloria).
3. Start **Phase 1** (accounts + admin "create user" flow), then **Phase 2** (owner columns + query retrofit + isolation audit). Build Phase 2 carefully — it's the privacy-critical core.
