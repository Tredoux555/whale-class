# SESSION — Jun 24, 2026 (Cowork, PM) — Lyf Coach: build-state handoff + signup confirm-flow + coach UX + document upload

**5 commits on `main`, all pushed + Railway auto-deploying:**
```
ca6d4761  Lyf Coach: build-state handoff + signup confirm-flow + coach UX
0fadba03  Lyf Coach verify-pending: 'you're in' celebration on confirm
e9f96024  Lyf Coach verify-pending: terminal welcome, never opens the coach
98a29cfd  Owner Sanctuary coach: copy button + Save & end session (parity)
b8be066c  Coach: document + multi-photo upload on both coach surfaces
```

**🚨 ONE migration pending Tredoux's Supabase run:** `migrations/273_story_coach_build_state.sql`. Until run, `save_build_state` soft-fails gracefully (no breakage — reads return null/[], session-surfacing `.catch(()=>null)`). Everything else is live immediately. No other migration this session.

**Env:** `unpdf` added to package.json (Railway installs on deploy via the Dockerfile `rm package-lock.json && npm install --force`). `STORY_DIARY_KEY` already configured (build-state encryption derives from `STORY_JWT_SECRET` if unset). No new env vars required.

---

## 1. Build-state session handoff (the headline)

**Problem:** the coach saved product decisions/memories but never a recoverable build sequence, so the next session started blind.

**Solution — a dedicated store, NOT memory/diary/projects.** Rationale (locked): `story_coach_memory` is "semantic, not episodic" with a 1000-char cap; diary is append-only; projects feed the WIP model. A build handoff is operational + overwritten + read at session start — its own store.

- **`migrations/273_story_coach_build_state.sql`** — mirrors `story_coach_memory`: `space` default 'tredoux', `doc_enc` + `state_enc` (AES-256-GCM via diary-crypto), supersede pair (`superseded_at`/`superseded_by`), `story_personal_touch_updated_at()` trigger, RLS enabled+forced (service-role only), partial indexes (active per-space, per-project).
- **`lib/story/coach/build-state.ts`** — `renderBuildStateDoc` (deterministic canonical doc so save == read-back), `writeBuildState` (encrypt + supersede the active row for the SAME project, case-insensitive, matched in JS — no `ilike`), `loadCurrentBuildState`, `listActiveBuildProjects`, `formatBuildStateForPrompt`. Reads never throw (null/[] on error).
- **Tools** (`tool-definitions.ts` + `tool-executor.ts`): `save_build_state` (7 captures: project, ordered build_list w/ status, current_step, confirmed[], next_action, blockers[]) + `read_build_state`. Adult-only (not in `CHILD_TOOL_NAMES`). E2E spaces refused (`deps.isE2e`) — no server-readable build text for sealed rooms.
- **Session-start surfacing** (`app/api/story/coach/route.ts`): `isSessionStart = clientHistory.length === 0`; when start + adult + non-e2e + non-reflect + a state exists, inject a `# Where we left off` section (read-back + confirm instruction) into the system prompt — only on the first turn (no per-turn token cost).
- **System prompt**: trigger-phrase intent map ("save our build state / pick this up tomorrow / I'm done for today / wrap up / end session"), exact confirmation line, and the per-turn build-state section render.
- **Composer button**: "✓ Save & end session" on both coach pages → sends `Save our build state and end the session.` (model synthesises the state from the conversation; the client can't).

## 2. Signup confirm-flow — fully reworked

**Root causes found via DB + code (not guessed):**
- Resend **rotated** the verify token, so older confirmation emails dead-ended (`verify=invalid`).
- All verify failures dumped the user on the **login** screen.

**Fixes:**
- **Token reuse** (`verify-status` POST): reuse the existing valid token within TTL; only mint new if absent/expired → every email in the thread shares one working link.
- **Failures → verify-pending** (`verify` route): all 6 failure bounces now go to `/lyf-coach/verify-pending?verify=…` (with a gentle notice), never `/lyf-coach/login`.
- **verify-pending is a passive auto-advancer**: polls + re-checks on tab focus/visibility (beats background-tab throttling). The manual "I've confirmed" button was removed — **one path: click the email link.**
- **Terminal celebration**: when verified is detected **while waiting** (poll/focus transition), the tab becomes a "Congratulations — you're in" screen (first-100 / 1000-prompts line when `founder`, welcome copy, "you can close this window") — it NEVER navigates to `/coach`, so no second coach tab. Already-verified on first load → straight to `/coach` (returning user). `founder` comes from `verify-status` GET (`welcome_bonus_period` set) — stable, not the one-shot banner flag. Best-effort welcome-stamp so the in-app banner doesn't repeat.

The valid-link success path (`/coach?verified=1` → app-layout cookie→session bridge → welcome banner) was already correct (Fix 1 from the earlier Jun 24 session) — verified, no change.

## 3. Operator signup ping reports confirmation-email outcome

`signup/route.ts`'s two fire-and-forget blocks merged into one: the verify step resolves a status that NEVER throws, then the operator ping ALWAYS fires carrying it. `sendCoachVerificationEmail` now returns a result; `sendSignupNotificationEmail` renders a **Confirmation email:** row (✅ sent / 🚨 SEND FAILED / NOT SENT — key missing / token persist failed / etc.). A silent confirmation-send failure can no longer hide behind a successful ping.

## 4. Coach UX

- **Exact HH:MM** added to the coach's time label (`app/api/story/coach/route.ts` todayLabel) — caller's tz, alongside the existing date + part-of-day. Best-effort, falls back to the phrase.
- **Copy button** (`components/story/personal/CopyButton.tsx`) on every finished coach reply — copies raw `message.text` (markdown), gesture-safe clipboard + textarea fallback, check-for-2s. Always-visible-subtle. On BOTH coaches.
- **Save & end session** button on BOTH coaches (see §1).

## 5. Document + multi-photo upload (BOTH coach surfaces)

Rebuild of the parked `coach_uploads.patch` on current code (the patch was stale — pages had diverged — so rebuilt, not `git apply`).
- **`package.json`**: `unpdf` dep.
- **NEW `app/api/story/coach/extract-document/route.ts`**: PDF (unpdf, serverless pdf.js), DOCX (mammoth), text/csv decode. `verifyAdminToken` (covers owner + public accounts). 10MB cap, 200k-char cap, graceful per-kind errors, normalize (strip NUL/BOM, CRLF, collapse blanks). Audio's sibling — transient, never persisted.
- **`app/api/story/coach/route.ts`**: accepts `images[]` (≤5) + `document_text`/`document_name`; builds a multi-block turn (doc context FIRST, then prompt, then image blocks). Backward-compatible — legacy single `image` still works (so the floating companion is unaffected).
- **`lib/story/coach/coach-chat-context.tsx`**: sends `images[]`/`document`, normalises legacy `image`, carries `images`/`docName` previews on the user bubble.
- **Both pages** (`lyf-coach/(app)/coach/page.tsx` + `story/admin/(personal)/coach/page.tsx`): 📎 multi-photo (up to 5, removable thumbnails) + 📄 document button, attachment tray, doc-reading spinner, multi-image + doc-chip bubble render, `canSend` gating.

---

## 🚨 Architectural rules locked in this session

1. **Build-state lives in `story_coach_build_state`** — never reuse a `story_coach_memory` type (semantic-only, 1000-char cap), the diary (append-only), or projects (WIP model). One ACTIVE state per project (supersede-on-save), encrypted, surfaced at session start only.
2. **`save_build_state`/`read_build_state` are adult-only and refused for E2E spaces** (`deps.isE2e`) — no server-readable build text for sealed rooms.
3. **Verify token is REUSED on resend** (within TTL), not rotated — every confirmation email in a thread must work.
4. **Verify failures land on `verify-pending`, never `login`.**
5. **verify-pending NEVER navigates to `/coach`** — the email link is the single path in; the waiting tab becomes a terminal closeable welcome. (Prevents the duplicate-coach-tab problem.)
6. **`founder` signal = `welcome_bonus_period` set**, read via `verify-status` GET (stable), not the one-shot `first_login_shown` flag.
7. **Operator signup ping always fires AND reports the confirmation-email outcome** — the verify step resolves a never-throwing status; the ping carries it.
8. **Coach document/image upload is backward-compatible** — the route accepts `images[]`+`document` AND legacy singular `image`; the floating companion keeps working untouched.
9. **🚨 TWO coach page files drift** (`app/lyf-coach/(app)/coach/page.tsx` + `app/story/admin/(personal)/coach/page.tsx`). Every coach UI feature must be added to BOTH. Long-term fix: extract a shared `<CoachConversation>` component (offered, not built).

---

## Verification status

- ✅ All 5 commits on `origin/main`; LOCAL == REMOTE == `b8be066c`; zero uncommitted tracked changes.
- ✅ `eslint --max-warnings=0` clean on all 16 touched TS/TSX files.
- ✅ DB-confirmed diagnosis for the confirm-flow (tredoux112 + tredoux555 rows); migrations 270/271/272 confirmed present.
- ⏳ Tredoux to run migration 273 in Supabase.
- ⏳ End-to-end test after Railway settles (checklist below).

## Test checklist (after Railway deploy)

1. **Build-state** (needs migration 273): in the coach, click **Save & end session** → coach saves + reads back the handoff with the confirmation line. New conversation → it opens with "Where we left off."
2. **Confirm flow**: fresh signup → click the email link → land in `/coach` with welcome; leave a second verify-pending tab open → it flips to the **celebration** (founder line), closeable, no second coach. Click an OLD email link → verify-pending with "that link was invalid — resend," not login.
3. **Operator ping**: next signup's "New Lyf Coach signup" email shows **Confirmation email: ✅ sent**.
4. **Coach UX**: copy icon under a reply pastes clean text; exact time if you ask "what time is it for me?".
5. **Uploads** (BOTH coaches): 📎 attach up to 5 photos (removable) + 📄 attach a PDF/Word/text/CSV → send → coach reads them.

## Carry-overs / notes

- **`coach_uploads.patch`** at repo root is now effectively applied (rebuilt) — a redundant untracked file; safe to delete whenever.
- Other pre-existing untracked files left untouched: `social/`, `MONTREE_BRAND_PALETTE.md`, `lyf-coach-privacy-policy.md`, `lyf-coach-trust-copy.md`.
- **Recommended next:** extract a shared coach-conversation component to kill the two-page drift permanently.
