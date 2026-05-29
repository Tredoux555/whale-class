# Session 87 Handoff — May 4, 2026 (evening)

A long focused session. Six commits to `main`, one Supabase migration run, the Montree Brand Kit consolidated into a portable Word doc, and Astra went from a placeholder gold-circle to her real Canva-designed T monogram avatar.

This session was the second block on May 4 — Session 86 (morning) shipped Astra multilingual + the dashboard empty-state race fix + QR domain isolation + the JWT mis-stamp fix. This session sat on top of that and pushed the principal portal further: live play-by-play status streaming, the encrypted parent-meeting Vault, super-admin principal management, per-song Share buttons on the public page.

## Commits shipped (all on `origin/main`)

| Commit | Title |
|--------|-------|
| `445ec181` | Whale-class audio rendering + super-admin principal management 👤 modal |
| `59041e63` | Astra: live play-by-play progress events under each tool chip |
| `d097c22d` | Principal Vault prototype — encrypted parent-meeting recordings (Tredoux-only) |
| `fc7d7ac2` | Per-song Share button + QR modal on whale-class pages |
| `adfbfd63` | Astra avatar via /tracy-avatar.png + drop Ask Guru from principal sidebar |
| `ac4c24b6` | Add Astra T monogram avatar asset |

Also done outside git:
- **Migration 185** (`montree_principal_vault`) run in Supabase SQL Editor — verified by user with the 12-column information_schema check.
- **Tredoux's principal code reset to `ZNGLJT`** (the prior code's plaintext was unrecoverable; new SHA-256 hash written directly to `montree_school_admins.password_hash`). Login at `/montree/login-select` → "I have a code" → `ZNGLJT`.
- **Brand Kit Word doc generated** at `whale/Montree_Brand_Kit.docx` — portable reference for the Canva setup.
- Astra in Chinese verified working end-to-end on production (screenshot confirmed).

---

## A. Whale-class audio rendering + super-admin 👤 — `445ec181`

### Audio rendering fix on `app/whale-class/page.tsx`

User reported a QR code pointing at `https://teacherpotato.xyz/whale-class#song-end-of-year-performance-song` was scanning to a card that wouldn't play right. Investigation found two assets in `videos.json` with overlapping titles:

- `End of year Performance` (mp4 video, uploaded Apr 28) — slug `end-of-year-performance`
- `End of year Performance Song` (**mp3 audio** with `mediaType: 'audio'`, uploaded May 4) — slug `end-of-year-performance-song`

The QR was matching the audio entry. The whale-class page was rendering everything inside a `<video>` element regardless of `mediaType`. Most mobile browsers won't render an `mp3` inside a `<video>` cleanly — black box or "format not supported".

Fix: extended the `Song` interface with `mediaType?: 'video' | 'audio'`. Both the highlighted "Now Playing" card and the grid card now branch:

- `mediaType === 'audio'` → renders an `<audio>` element on a soft purple-pink-indigo gradient backdrop with a 🎵 icon centered above
- otherwise → keeps the existing `<video>` aspect-video black background

The data drift between the two assets is a separate user-side issue (rename one, or regen the QR for the video) — that's not a code fix.

### Super-admin principal management — `app/api/montree/super-admin/principals/route.ts` + `components/montree/super-admin/PrincipalsModal.tsx`

Until this commit, the only paths to add/reset/manage a principal were (a) the teacher-side `/api/montree/invite-principal` flow gated to teacher session, or (b) hand-editing `montree_school_admins` via SQL. Super-admin had no UI surface for principals at all.

New API surface, all super-admin-token gated:
- **GET** `?school_id=X` — list principals for a school (returns metadata, no password_hash)
- **POST** — create principal, returns plain code ONCE in JSON response (SHA-256 hash stored in `password_hash`); collisions on `(school_id, email)` regenerate the code on the existing row, matching the invite-principal semantics
- **PATCH** — `{ principal_id, action: 'reset_code' | 'deactivate' | 'activate' }`
- **DELETE** `?id=X` — hard delete

New modal component dynamic-imported from `SchoolsTab.tsx` (same pattern as the existing features modal). Lists per-school principals with last-login + activation state + "Never logged in" chip. Reveal-once banner shows the new 6-char code with copy button after a create or reset — the only time the plaintext is visible.

SchoolsTab gained a 👤 button in the per-row action column between `⚙️` and `Login →`. Hover title "Manage principals".

### Architectural rules locked in (Session 84 confirmed):
- **`montree_school_admins` has NO `login_code` column.** Principals authenticate via SHA-256 hash of the 6-char code stored in `password_hash`. Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (excludes I/O/0/1).
- **UNIQUE on `(school_id, email)`.** Re-using an email regenerates the code on the same row.
- **Plain code is returned in JSON exactly once.** Never re-fetchable from the server.

---

## B. Astra live play-by-play progress events — `59041e63`

Until this commit, the principal saw a single soft `…` while Astra was working. Session 85's architecture collapsed the chained-tool flow into one server-side `child_focus` tool that runs parse → resolve → fetch → compose entirely server-side. Cheaper and more reliable, but opaque from the client's perspective. A 1-3s delay with no visibility looked like a freeze.

This commit emits structured progress events from inside framework tools, which the client renders as an italic dim status line under Astra's avatar.

### Architecture (server stays language-agnostic)

- **`lib/montree/tracy/frameworks/child-focus.ts`** — `childFocus()` accepts an optional `onProgress?: ChildFocusProgressFn` parameter and emits events at each phase boundary: `parsing → lookingUp` (or `lookingUpName` if a name was extracted) `→ fetchingContext → composing`. Each event has a `phase` string and an optional `vars` map for interpolation. Errors thrown by the listener are swallowed in a try/catch — the orchestrator never crashes from a buggy consumer.
- **`lib/montree/tracy/tool-executor.ts`** — `TracyToolDeps` gains `onProgress?: (TracyToolProgress) => void`. The executor wraps the consumer's callback in a try/catch via a local `emitProgress(tool, phase, vars)` helper before forwarding to framework tools.
- **`app/api/montree/admin/principal-agent/route.ts`** — wires `onProgress` into a closure that emits a new SSE event type `tool_progress` with `{ type, tool, phase, vars }`. Documented in the route header alongside the existing event types.
- **`app/montree/admin/page.tsx`** — `handleEvent` catches `tool_progress` and stores the latest as `turn.progress = { phase, vars }`. The `AssistantBubble` renders the formatted message via `t('tracy.progress.<phase>', vars)`. On unknown phase the fallback is the existing thinking-dots, so a future server emitting an unknown phase doesn't render `tracy.progress.foo` raw.

### i18n

8 new `tracy.progress.*` keys added to `en.ts` (parsing/lookingUp/lookingUpName/fetchingContext/composing + unpacking/countingNotes/scoringNotes reserved for `unpack_teacher` when it gets the same treatment). All 11 non-English locales filled via `node scripts/fill-missing-i18n-keys.mjs` — strict completeness check passes (3864 keys × 12 locales).

The Chinese translations look right:
- `'tracy.progress.parsing'`: `'正在阅读问题…'`
- `'tracy.progress.lookingUpName'`: `'正在查找 {name}…'`
- `'tracy.progress.fetchingContext'`: `'正在获取 {name} 的最近观察记录…'`
- `'tracy.progress.composing'`: `'正在组织答案…'`

### Architectural rules

1. **Framework tools that have non-trivial latency MUST emit progress events.** The principal's perception of "is it working?" depends on these. Pattern is canonical in `child-focus.ts` and ready to extend to `unpack_teacher`.
2. **Server emits structured `{ phase, vars }` events.** Server stays language-agnostic; client formats via i18n keys.
3. **`tool_progress` is fire-and-forget.** Listeners that throw must not crash the tool. Both `childFocus` and `executeTracyTool` wrap the callback in try/catch.

### Deferred

- `unpack_teacher` framework tool doesn't emit progress yet — the `tracy.progress.unpacking/countingNotes/scoringNotes` keys are pre-translated and ready. ~15 min follow-up.

---

## C. Principal Vault prototype — `d097c22d`

Voice-record a parent meeting → Whisper transcription → Sonnet 3-paragraph summary → AES-256-GCM encryption with PBKDF2-derived key from the principal's vault password → save under principal profile. Full client-side end-to-end encryption: the server stores only ciphertext + per-record salt + iv.

**This is a private prototype.** Both the route handlers AND the sidebar entry are gated to a hardcoded principal_id allow-list (`PRINCIPAL_VAULT_ENABLED_FOR` / `VAULT_ENABLED_PRINCIPAL_IDS`). Until that's removed, nobody else sees this feature exists. Tredoux's principal_id is `16eec1c0-bfb5-4edf-a160-059bb41803fb`.

### Files added

| File | Purpose |
|------|---------|
| `migrations/185_principal_vault.sql` | `montree_principal_vault` table — 12 columns, indexed on `(principal_id, recorded_at DESC)`, FK cascades from school + principal |
| `app/api/montree/admin/conversations/transcribe/route.ts` | POST audio (multipart) OR raw transcript (json), returns plaintext summary + transcript. Audio flows through Whisper, never stored. Sonnet generates the 3-paragraph summary in the principal's locale. NEVER saves anything — the route is stateless. |
| `app/api/montree/admin/conversations/route.ts` | GET list (encrypted blobs + metadata only) + POST save. POST validates base64 shape, salt/iv length bounds, iteration count (100k–5M), ciphertext size (≤2 MB encoded). |
| `app/api/montree/admin/conversations/[id]/route.ts` | GET one + DELETE. UUID format enforced before the DB hit. |
| `lib/montree/vault-crypto.ts` | WebCrypto helpers: `encryptRecord()`, `decryptRecord()`, `verifyPasswordAgainstRecord()`. PBKDF2-SHA256 600k iterations, AES-GCM 256, 16-byte salt, 12-byte IV per record. AES-GCM auth-tag failure on decrypt = wrong password (no separate password-check blob needed — throws `'WRONG_PASSWORD'`). |
| `app/montree/admin/conversations/page.tsx` | Full UI: list / new / detail views, first-setup gate, unlock gate, recording with `MediaRecorder`, metadata editor, encrypt-and-save flow, decrypt-on-open, delete. Vault password lives in component memory only — never localStorage. Cleared on lock, refresh, or page navigation away. |
| `app/montree/admin/layout.tsx` | Sidebar shows "Conversations" entry with 🔒 icon between Settings and (now-removed) Ask Guru, but only when the logged-in `principal_id` is in `VAULT_ENABLED_PRINCIPAL_IDS`. Server enforces the same allow-list. |

### Schema

```sql
montree_principal_vault (
  id uuid PK,
  principal_id uuid NOT NULL FK montree_school_admins.id ON DELETE CASCADE,
  school_id uuid NOT NULL FK montree_schools.id ON DELETE CASCADE,
  salt_b64 text NOT NULL,        -- 16 bytes, base64
  iv_b64 text NOT NULL,          -- 12 bytes, base64
  ciphertext_b64 text NOT NULL,  -- variable, base64
  pbkdf2_iterations int NOT NULL DEFAULT 600000,
  cipher_version smallint NOT NULL DEFAULT 1,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds int NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

The plain `summary`, `transcript`, `child_id`, `child_name`, `notes`, `meeting_date` are NEVER stored on this table — they live INSIDE the encrypted ciphertext as a JSON blob. The server cannot decrypt.

### Privacy / consent posture

- **Audio bytes:** request → OpenAI Whisper → response → discarded. By default OpenAI retains audio up to 30 days for abuse monitoring. For the Whale Class prototype this is acceptable (Tredoux is the only user and the parent has been told about the recording per the consent banner). For broader rollout we'd want a zero-retention agreement OR self-hosted Whisper.
- **Transcript:** flows to Anthropic for the summary under the existing Claude API contract (30d retention, no training).
- **The encrypted vault blob is the only persistent copy.** The server cannot decrypt it. If the principal forgets her password the data is unrecoverable.
- **Consent banner** (gold strip on the New Conversation sheet): *"Before you record: Tell the parent. Recording someone without telling them is illegal in many places, and even where it's legal it's the wrong way to start a relationship. Use this for your own clarity, not as evidence. The recording stays encrypted under a password only you know."*

### Architectural rules locked in

1. **Server NEVER sees the plaintext.** All encryption + decryption happens client-side via WebCrypto. The server is a dumb encrypted-blob bucket with auth.
2. **Vault password is in-memory only.** Component state, never localStorage. Refresh = relock. Reload after writing a record requires re-entering the password.
3. **First save asks for password twice (matched).** Subsequent saves run the typed password through `verifyPasswordAgainstRecord()` against the most recent existing record before treating it as unlocked.
4. **AES-GCM auth-tag failure on decrypt is the wrong-password signal.** No separate password-check blob is stored.
5. **Cipher version is on every record.** Bump if scheme ever changes; `decryptRecord()` rejects unknown versions cleanly.
6. **Both server + client gate on the principal_id allow-list.** Don't widen one without widening the other.

### Verification status

- ✅ Migration 185 run in Supabase, all 12 columns confirmed
- ✅ Code shipped to Railway
- ⏳ End-to-end test recording (Whisper → Sonnet → encrypt → save → reload → decrypt → display) — user to perform next session

---

## D. Per-song Share button + QR modal — `fc7d7ac2`

Replaces the manual `/admin/qr-generator` typing flow for the per-song use case. Eliminates the entire class of slug-typo bugs that produced the "wrong song plays when QR is scanned" incident this morning — the share URL is generated from the same `lib/slugify.ts` the public page uses, so the link and the page card cannot desync.

### `components/ShareSongModal.tsx` (new, reusable)

- Generates a QR code client-side via the existing `qrcode` lib (already in `package.json` from the QR generator)
- Shows the canonical URL with a Copy button (clipboard API + `execCommand` fallback)
- Download QR PNG button
- Native share button (`navigator.share`) when supported — iOS/Android open the OS share sheet directly
- Closes on Escape, click-outside, or × button
- Generated URL: `https://teacherpotato.xyz/whale-class#song-{slug}` regardless of which page launched it. The `/whale-class` page already has the deep-link highlighted-card UX, plus the audio rendering from this morning.

### Wired into both production listings

- **`app/page.tsx`** (root teacherpotato.xyz, blue/indigo theme): added a Share button next to Download in the card footer.
- **`app/whale-class/page.tsx`** (purple/lilac theme with QR-deep-link UX): Share pill in the highlighted card's bottom strip; small share icon next to the week label in the grid cards.

Both modals are dynamic-imported (`ssr: false`) so the qrcode library only ships on first share open — zero impact on initial page load.

### Architectural rule locked in

- **Share URLs MUST be derived from `lib/slugify.ts`.** Hardcoded slugs in QR generators or comms drift over time. Any new "share this thing" feature in the codebase should reuse this component or follow the same slug-from-canonical-source pattern.

---

## E. Astra avatar wiring + drop Ask Guru — `adfbfd63` + `ac4c24b6`

Two pieces.

### Avatar wiring (`adfbfd63`)

The `TracyAvatar` component in `app/montree/admin/page.tsx` was a CSS-rendered gold-circle T placeholder. Now it renders `<img src="/tracy-avatar.png" />` with `onError` → fallback to the original CSS T. Rounded-square corners (border-radius ≈ 22% of size) preserve the design's composition — the T's stem and leaf grow out of the bottom edge of the square; a circle crop would clip them. No border ring; the design's gold-on-dark-green reads as a self-contained card against the dark forest UI.

`useState(false)` for `imgFailed` so the swap to the fallback is reactive — the next render uses the CSS T after a single onError fire.

### Avatar asset (`ac4c24b6`)

User saved the Canva-designed PNG to `whale/public/tracy-avatar.png` directly via Finder (after we figured out that pasting images inline in chat doesn't put them on disk — the chat sees them as multimodal context, not files). 1024×1024 PNG, 71 KB, valid 8-bit RGB.

### Drop Ask Guru from principal sidebar (also in `adfbfd63`)

Astra IS the principal's chief-of-staff AI surface. Guru is the per-child Maria Montessori in your pocket for teachers, and Astra can call it as a sub-tool when child-pedagogical depth is needed. The principal didn't need a separate Guru chat surface — it just added noise to the sidebar.

Removed the `Sparkles` import + the `'Ask Guru'` NAV entry. Simplified the `activeNav` logic in the layout — now just appends `Conversations` to the base `NAV` if the principal is on the vault allow-list, no more juggling Guru-at-the-end.

**Sidebar order after this commit:**
- Today / Classrooms / People / Pulse / Settings (+ 🔒 Conversations for vault-enabled principals)

The teacher-side `/montree/dashboard/guru` route is untouched. Teachers still have Guru.

### Architectural rules

- **Astra is the principal's only AI chat surface.** Guru calls happen via `consult_guru` tool from inside Astra (Session 85 carry-over, not yet implemented).
- **Astra avatar is `/public/tracy-avatar.png` with CSS-T fallback.** Never break the fallback path — the page must look correct in both states.

---

## F. Brand Kit consolidation (no commit, doc only)

Generated `whale/Montree_Brand_Kit.docx` (13.6 KB Word doc, validated clean) consolidating the canonical Montree brand assets for Canva setup:

- Tagline (*"The magic of Montree."*)
- 11-color palette with hex codes, named colors, and usage notes — each row has a real swatch cell rendered in the actual hex color
- Fonts (Lora display, Inter body, SF Mono / Menlo for monospace)
- Logo asset table (Wordmark / M Monogram / T Monogram with use cases)
- Sprout-mark canonical description
- Voice & tone do/don't table
- Canonical phrases ("The magic of Montree.", "Tend to the child, not the observation.", "A teacher takes a photo. Montree does the rest.")
- Photography guidance
- Step-by-step in Canva
- Brand Voice prompt (boxed) for Canva's AI brand voice setup

Doc lives at `whale/Montree_Brand_Kit.docx`. Not committed to git (it's a deliverable for the Canva setup task, not source). User can regenerate via `node /tmp/build-brand-kit.js` if needed (script is in the session outputs).

---

## Architectural rules locked in across this session (consolidated, do NOT break)

1. **`montree_school_admins` has NO `login_code` column.** SHA-256 of 6-char codes only, stored in `password_hash`.
2. **`(school_id, email)` is UNIQUE on `montree_school_admins`** — re-inviting same email regenerates the code on the same row.
3. **Plaintext principal codes are returned in JSON exactly once on create or reset.** Server can never recompute them.
4. **Whale-class page renders `<audio>` for `mediaType==='audio'` rows, `<video>` otherwise.** Don't regress this.
5. **Astra framework tools (`child_focus`, `unpack_teacher`) accept an optional `onProgress` callback.** Errors in the listener are caught — the orchestrator never crashes from a buggy consumer.
6. **Astra emits structured `{ phase, vars }` progress events.** Server stays language-agnostic; client formats via `tracy.progress.<phase>` i18n keys.
7. **Principal Vault is end-to-end encrypted.** PBKDF2-SHA256 600k iterations + AES-256-GCM, plain text never sent to server, password never persisted.
8. **Vault gates: server (`PRINCIPAL_VAULT_ENABLED_FOR`) + client (`VAULT_ENABLED_PRINCIPAL_IDS`).** Both must include any principal_id for the feature to surface.
9. **AES-GCM auth-tag failure on decrypt = wrong password.** No separate password-check blob.
10. **Share URLs derive from `lib/slugify.ts`** — a single canonical source for slugs across the app.
11. **Astra avatar = `/tracy-avatar.png` with CSS-T fallback via `onError`.** Both render paths must look correct.
12. **Principal sidebar order:** Today / Classrooms / People / Pulse / Settings (+ 🔒 Conversations for vault principals). No Ask Guru.

---

## Verification status

| Item | Status |
|------|--------|
| Migration 185 run | ✅ Confirmed via 12-column information_schema query |
| Astra in Chinese | ✅ User screenshot of full Chinese response with action line |
| Astra avatar PNG on disk | ✅ 1024×1024 PNG at `whale/public/tracy-avatar.png` |
| Principal code reset | ✅ Tredoux logged in successfully with `ZNGLJT` |
| Audio rendering on whale-class | ⏳ Code shipped, not user-tested |
| Super-admin 👤 modal | ⏳ Code shipped, not user-tested |
| Astra play-by-play SSE | ⏳ Code shipped, not user-tested (next test in any locale will surface it) |
| Vault end-to-end | ⏳ Migration ready, code shipped, NOT tested |
| Per-song Share button | ⏳ Code shipped, not user-tested |

---

## Deferred to next session

### High-priority verification
1. **Vault end-to-end test.** Open `/montree/admin` as principal → tap **Conversations** → set vault password → record 30-sec dummy → Encrypt & save → reload → re-enter password → tap row → verify decrypted summary + transcript display. The full pipeline (mic permission → Whisper → Sonnet → AES-GCM encrypt → DB → AES-GCM decrypt → render) is unverified.
2. **Verify Astra play-by-play in production.** Ask Astra a child question; expect to see the rolling status line under her avatar (parsing → looking up → fetching → composing) before the answer streams in.
3. **Verify per-song Share button.** Open `/` (teacherpotato root) → click Share on a card → confirm QR + URL + native share work; then `/whale-class` → same.
4. **Verify super-admin 👤 modal.** Click 👤 on Chen9 row → list/add/reset/deactivate flows.

### Other open work
5. **Super-admin simplification** (proposed, not built). Multi-session refactor: 5-tab structure (Schools / Principals / Money / Outreach / Astra Insights), archive 18 dead marketing sub-pages and the `social-manager/` subtree, retire the colored tile ribbon. Worth a fresh head.
6. **Astra `→ ` vs `—` action-line marker.** Astra is using em-dash where the system prompt asked for arrow; cosmetic, but worth a one-line check on `buildTracySystemPrompt`. `splitActionLine` already handles arrow; em-dash is rendering as styled body text.
7. **`unpack_teacher` progress events.** Three i18n keys are already pre-translated. ~15 min follow-up.
8. **Avatar polish** (optional). User noted the T could be tighter to the canvas edges and the sprout slightly larger for better legibility at smaller sizes. Future iteration.

### Carry-overs (still pending from prior sessions)
- Send the 3 hot lead Gmail drafts (Ardtona, FAMM, Тамі) — still pending
- Update CLAUDE.md lead state — Paint Pots BOUNCED, Ardtona email correction (`vheavey@ardtonahouseschool.ie`), Copenhagen verification
- Resend `RESEND_API_KEY` env var on Railway is still placeholder

---

## File-by-file change list

```
A migrations/185_principal_vault.sql
A app/api/montree/super-admin/principals/route.ts
A components/montree/super-admin/PrincipalsModal.tsx
M components/montree/super-admin/SchoolsTab.tsx
M app/whale-class/page.tsx
A app/api/montree/admin/conversations/route.ts
A app/api/montree/admin/conversations/[id]/route.ts
A app/api/montree/admin/conversations/transcribe/route.ts
A lib/montree/vault-crypto.ts
A app/montree/admin/conversations/page.tsx
M app/montree/admin/layout.tsx
M app/montree/admin/page.tsx
A components/ShareSongModal.tsx
M app/page.tsx
M lib/montree/i18n/en.ts (8 new tracy.progress.* keys)
M lib/montree/i18n/{zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts (8 keys each, Haiku-translated)
M lib/montree/tracy/frameworks/child-focus.ts
M lib/montree/tracy/tool-executor.ts
M app/api/montree/admin/principal-agent/route.ts
A public/tracy-avatar.png
A whale/Montree_Brand_Kit.docx (deliverable, not committed)
```

---

## Test plan for next session

1. **Hard refresh `/montree/admin`** (Cmd+Shift+R) to clear any cached bundle. Confirm:
   - Sidebar reads: Today / Classrooms / People / Pulse / Settings / 🔒 Conversations
   - Astra's avatar is the gold-T-on-dark-green PNG (not the CSS circle)
   - Asking a child question shows the live status line ("正在阅读问题…" → "正在查找 X…" → "正在获取…") before the answer

2. **Vault end-to-end** — full flow on `/montree/admin/conversations`:
   - Set vault password (twice, matched, ≥8 chars)
   - + New conversation → grant mic → record 10-30 sec → Stop
   - Verify audio playback before transcribe
   - Transcribe & summarize → expect 3-paragraph Sonnet output
   - Edit summary if needed, optional child name + notes
   - Encrypt & save → returns to list
   - Tap the row → if vault is unlocked, instant decrypt + display
   - Refresh page → unlock prompt → enter password → decrypt + display
   - Wrong password → "Wrong password — try again" (no destructive side-effect)

3. **Super-admin 👤** — Click on Chen9 row → modal opens → see 1 principal listed → click 🔑 Reset code → confirm → green banner with new 6-char code → Copy → close modal.

4. **Per-song Share** — Open root teacherpotato → click Share on any card → QR renders → copy URL → paste somewhere → confirm format `https://teacherpotato.xyz/whale-class#song-X`. Scan the QR on a phone → lands on the right card.

5. **Audio rendering** — On `/whale-class`, find an `mediaType==='audio'` entry (e.g., "End of year Performance Song"). Verify renders as `<audio>` controls on a purple-pink-indigo gradient with 🎵 icon, NOT a black `<video>` box.
