# Session 84 Handoff — May 3, 2026

**16 commits pushed to main this session.** A bug-fix sprint that turned into a product redesign that turned into a second product pivot. Headline: **the principal home page is now an "ask anything about your school" agent** with built-in product-signal logging that drives "what to build next" decisions from real principal questions. Everything earlier today (invite-principal fix, ghost 503, focus-pick instant) shipped clean and was confirmed working in production by the user.

---

## Commits (oldest first)

| # | Commit | What |
|---|---|---|
| 1 | `39c6f3f5` | Fix invite-principal 500 — stop writing nonexistent `login_code` column on `montree_school_admins` |
| 2 | `c04fc376` | Fix ghost 503 console noise — narrow SW fetch handler, stop fabricating fake 503 responses on Next.js prefetch failures, bump cache to v4 |
| 3 | `663d7d85` | Speed up progress GET — parallelize curriculum SELECT, drop redundant child query (saves 250-500ms) |
| 4 | `a7be3f8a` | Audit catch — remove dead Step 2 principal lookup in `auth/unified` (same nonexistent column bug) |
| 5 | `5cdc0134` | Audit catch — harden SW precache against single-URL install failures (Promise.allSettled per URL) |
| 6 | `0ffa7625` | Skip principal invite email entirely; modal copy "Code created" + "Get their code" + "Share with X" |
| 7 | `8928d3a5` | Make focus-pick instant when picking a work for an empty area (optimistic update was using `prev.map` only — appended new entry when no existing focus for area) |
| 8 | `5aa7eab4` | Principal home redesign V1 — search-first home + AI child briefing page + parent-question helper (replaces cockpit) |
| 9 | `86ab61bc` | Audit catch — XML fence on parent-question to block prompt injection + date-format guards on both Sonnet routes |
| 10 | `8f9909c7` | Audit catch — harden parent-question fence regex against whitespace variants (`< parent_question >`) |
| 11 | `940ee854` | Audit catch — replace fixed fence delimiter with per-request 24-char random nonce (defeats every fence-escape attack class) |
| 12 | `368de01a` | **Principal home pivot V2 — "ask anything" agent.** New principal-agent API (SSE + Sonnet tool-use loop, 5 read-only tools, 90s timeout) + agent chat UI + super-admin questions log + migration 184 (`montree_principal_agent_log` table) |
| 13 | `0397209e` | Audit catch — sanitize history array (strip non-text blocks to block forged tool round-trips), assert cost model matches Sonnet pricing, document school-scoping contract for inner endpoints |
| 14 | `9c39f63e` | Park social-analytics setup guide in super-admin (`/montree/super-admin/social-setup`) — checkbox-tracked Meta Developer App walkthrough, persists progress in localStorage |

---

## Major moves explained

### A. Three pre-existing bugs fixed (verified in production by user)

**Invite-principal 500** (`39c6f3f5`): The route was inserting a `login_code` column into `montree_school_admins` that doesn't exist on that table (only `montree_teachers` has it, per migration 091). Postgres returned 42703, the route's retry loop only caught 23505, so it surfaced as "Could not create the invitation" 500. Removed all writes/reads of `login_code` from the route — principals authenticate via `password_hash` lookup (legacy SHA-256 of the code) which the principal/login route already does correctly. The audit pass found the SAME bug pattern in `auth/unified/route.ts` `tryPrincipalLogin` Step 2, fixed in `a7be3f8a`. Confirmed working by user (saw codes `8TXYGF` and `B4DFBE` in modal screenshots).

**Ghost 503 console noise** (`c04fc376`): User reported persistent 503 console errors on dashboard pages despite the page rendering fine. Diagnosed via Railway runtime logs — every API call had a `[req]` log line (Session 83's diagnostic) but ZERO `[req]` for the page document, meaning the request never reached Node. Source: `public/montree-sw.js` was calling `event.respondWith()` on EVERY same-origin GET (including Next.js RSC prefetches it had no business handling), and any fetch failure was being converted to a fabricated `new Response('Offline', { status: 503 })`. Narrowed the fetch handler to ONLY intercept cacheable static assets + top-level navigations. Pre-cached `/montree/offline` (was listed but never actually added). Asset failures now re-throw `TypeError` instead of synthesizing 503. Bumped cache to `montree-v4`. Confirmed working — user saw clean v3→v4 transition in console.

**Slow progress GET** (`663d7d85`): User reported "the works get updated eventually but take a long time." Session 83 already fixed the WRITE path; the READ path the dashboard polls had two sequential queries AFTER the parallel batch — a redundant `SELECT child.classroom_id` and a serial `SELECT entire classroom_curriculum_works`. Hoisted classroomId out of `verifyChildBelongsToSchool`'s try block, added the curriculum SELECT to the `Promise.allSettled` queryPromises array, dropped the redundant child query. Saves ~250-500ms per progress fetch.

### B. Two UX tweaks shipped in same flow

**Skip email for principal invite** (`0ffa7625`): Resend `RESEND_API_KEY` env var on Railway is the recurring blocker (still placeholder `re_123` per Session 83 carry-over). Rather than chase the env, removed the email send entirely from invite-principal route. Modal headline `"Invitation sent"` → `"Code created"`, body rewritten to "Share this code with [name]" + Copy button (no more "we tried but failed" framing), CTA `"Send invitation"` → `"Get their code"`. Backend response keeps the `email` field as `{ sent: false, skipped: true }` for backward compat.

**Focus-pick instant on empty area** (`8928d3a5`): User reported add-work was still not instant after the server-side speed fix. Found a real client-side bug: `handleWheelPickerSelect` in `useWorkOperations` was using `prev.map(...)` to update the focus work for an area, which only TRANSFORMS existing entries. If the area had no focus work yet (e.g., Math empty), the new pick disappeared into local state until the next `fetchAssignments` refresh. Fix: check `prev.some(w => area === w.area)` — if exists, replace; if not, append. Revert path also fixed for the new-entry case (filter by `work_name` if no `oldFocusWork`).

### C. Principal home redesigned twice in one session

**V1 (search-first)** at `5aa7eab4` — built around the user's pitch: "tired principal opens phone, parent stops her in corridor, she needs to find a child fast." Hero + viewer banner + huge search bar over full school roster + recently-viewed children. Tap → `/montree/admin/child/[childId]` page with photo + name + AI-synthesised briefing prose + "What did the parent ask?" textarea that returns a Sonnet-grounded answer in the principal's voice. Two new APIs: `/api/montree/admin/child-briefing/[childId]` (GET, full context bundle → 200-300 word briefing, cached 30 min, soft-fails empty state) and `/api/montree/admin/parent-question` (POST, same context, takes a question, returns answer with strict no-invent rules).

**V2 (agent-chat)** at `368de01a` — same-day pivot. User's reframe: the principal isn't searching for a child first; she's talking to an assistant that knows her whole school. AND we should be logging her questions to learn what to build next. Built a new `/api/montree/admin/principal-agent` route (POST, SSE-streamed, Sonnet tool-use loop max 5 rounds, 90s timeout) with five read-only tools:
- `find_children_by_name` — wraps existing `/admin/students/search`
- `get_child_briefing` — wraps the V1 child-briefing route
- `answer_about_child` — wraps the V1 parent-question route
- `list_classrooms_with_summary` — direct Supabase query: classroom + lead teacher + child count + 7d observed count
- `list_teachers_with_summary` — direct Supabase: teacher + classroom + last_login + 7d photo confirmation count

Migration 184 (`montree_principal_agent_log`) captures every Q→A: school_id, principal_id, conversation_id, question, answer, tools_called JSONB array, model, tokens, cost_usd, duration_ms, error. New super-admin page `/montree/super-admin/principal-questions` with sign-in + filters (school, date range) + per-school summary chips + expandable rows showing full answer + tools called + costs. New home page `/montree/admin/page.tsx` (replaces V1) — chat thread persists in localStorage per `conversation_id`, streams events live (tool chips with in-flight/success/failure states, italic "thinking" between tool calls, serif final answers), suggestions block when empty, "New conversation" button.

The V1 child-briefing page at `/montree/admin/child/[childId]` is preserved as a deep-link destination. The agent can recommend the principal go there for richer context.

### D. Audit cycle catches (this is where most of the value was)

The fresh-eye audit pattern caught five real ship-blockers across the day that I'd have missed otherwise:

1. **Login_code bug had a second instance** (`a7be3f8a`) — `auth/unified/route.ts` had the same nonexistent-column query in `tryPrincipalLogin` Step 2. Silently broken (Step 1 SHA-256 caught everything) but worth removing while the fix was in flight.
2. **SW precache fragility** (`5cdc0134`) — `cache.addAll` rejects entire SW install if any URL 404s. Single transient deploy 404 would break offline support for everyone. Switched to per-URL `cache.add` wrapped in `Promise.allSettled`.
3. **Parent-question prompt injection** (`86ab61bc` → `8f9909c7` → `940ee854`) — three audit rounds tightening the same fence:
   - Round 1: XML-style `<parent_question>` fence with case-insensitive strip — would block crude `</parent_question>` injection
   - Round 2: hardened regex against whitespace variants like `< parent_question >`
   - Round 3: ditched fixed delimiters entirely, switched to per-request 24-char random nonce. The user can't see, predict, or replay the nonce — every fence-escape attack class is impossible by construction. **🚨 architectural rule locked in: when accepting user-typed input that becomes part of a Sonnet prompt, always use a per-request crypto-random fence delimiter, not a fixed XML tag.**
4. **Principal-agent history forgery** (`0397209e`) — the agent route was accepting a `history` array from the client and appending it directly to conversation messages. A malicious or compromised client could send tool_use / tool_result blocks in history to forge tool round-trips and trick the agent into "remembering" results it never produced. Added `sanitizeHistory()` that strips every entry to `{ role: 'user'|'assistant', content: string }`, dropping non-text blocks, capping each turn at 4000 chars.
5. **Cost-model drift** (`0397209e`) — cost constants hardcoded for Sonnet 4.6 with no runtime check. If `AI_MODEL` ever drifts upstream the cost_usd in the log silently goes wrong. Added `assertSupportedCostModel()` — soft assertion (logs `console.error` loudly but doesn't throw) so the agent keeps working but the failure is caught early in Railway logs.

### E. Lead drafts (3 created, 2 deliberately skipped)

User asked for follow-up drafts on five hot leads. Did the mandatory `to:DOMAIN in:sent` dedup checks per CLAUDE.md Session 46/50 rule — found CLAUDE.md state was partially stale.

**Drafted (live in Gmail):**
- **Ardtona House** (`vheavey@ardtonahouseschool.ie`, draft `r-5830285817063155658`) — gentle nudge on the free pilot offer Tredoux already extended Apr 22
- **FAMM Argentina** (`marisa@fundacionmontessori.org`, draft `r922107526285003389`) — follow-up referencing Spanish-now-live + new principal feature
- **Тамі** (`kiverova_tamila@ukr.net`, draft `r-3855980242246939057`) — Ukrainian welcome with apology for imperfect Ukrainian + invitation to reply in any language. (Replaced earlier draft `r-2146774950542977299` per user request.)

**Skipped:**
- **Paint Pots** (`paintpotsmontessori@outlook.com`) — Apr 30 send BOUNCED ("Address not found"). Re-sending pointless. **Action needed from user**: find a working email (likely on `paintpotsmontessori.co.uk` website).
- **Copenhagen** (`info@montessori-cph.dk`) — CLAUDE.md lists this as a hot lead but Gmail has zero history with that address. Either CLAUDE.md is wrong or the message was deleted. **Action needed**: confirm the email or forward me their original reply.

### F. Social-analytics setup parked (`9c39f63e`)

User asked for help building a social-media analytics dashboard inside Whale (Meta Graph API → Supabase tables → admin route at `/admin/social-insights` → cron + dashboard). Started Phase 1 Step 1 (Meta Developer App + access tokens — full numbered walkthrough in chat) but user said "this is too much for me right now. can you put it in super admin for me to pick up later?" So I parked the guide as `/montree/super-admin/social-setup` with super-admin auth gate, six parts × 24 numbered steps, per-step checkboxes that persist in localStorage, progress bar, reset button. When all checked, "Ready for Step 2" CTA appears with the exact phrase to ping the agent with to resume.

---

## Files changed today

**Migrations:**
- `migrations/184_principal_agent_log.sql` — NEW. Run in Supabase.

**API routes:**
- `app/api/montree/invite-principal/route.ts` — REWRITE. login_code removed; email send removed; existing-row error surfacing; 23505 surfacing as 409
- `app/api/montree/auth/unified/route.ts` — Step 2 principal lookup deleted
- `app/api/montree/progress/route.ts` — classroomId hoisted; curriculum SELECT moved into parallel batch
- `app/api/montree/admin/child-briefing/[childId]/route.ts` — NEW (V1 redesign)
- `app/api/montree/admin/parent-question/route.ts` — NEW (V1 redesign), then 3 rounds of injection hardening, ending at per-request nonce fence
- `app/api/montree/admin/principal-agent/route.ts` — NEW (V2 pivot). SSE, tool-use loop, 5 tools, sanitized history, cost-model assertion, school-scoping contract documented
- `app/api/montree/super-admin/principal-questions/route.ts` — NEW. GET, super-admin auth, filterable

**Front-end pages:**
- `app/montree/admin/page.tsx` — REWRITTEN TWICE. Final state is the agent-chat home (V2). Search-first V1 lived for one commit (`5aa7eab4`).
- `app/montree/admin/child/[childId]/page.tsx` — NEW. Briefing + parent-question helper. Now functions as deep-link destination from agent.
- `app/montree/super-admin/principal-questions/page.tsx` — NEW. Question log viewer.
- `app/montree/super-admin/social-setup/page.tsx` — NEW. Meta Developer App walkthrough with checkbox progress.

**Hooks / lib:**
- `hooks/useWorkOperations.ts` — `handleWheelPickerSelect` optimistic update fixed for empty-area case + revert path

**Service worker:**
- `public/montree-sw.js` — fetch handler narrowed; OFFLINE_URL pre-cached; per-URL `cache.add` with `Promise.allSettled`; bumped to `montree-v4`

**Components:**
- `components/montree/InvitePrincipalModal.tsx` — `Invitation sent` → `Code created`; copy rewritten; yellow email-failure block removed; CTA renamed; emailSent/emailError fields dropped from state

---

## 🚨 Architectural rules locked in this session (do NOT let future agents break these)

1. **`montree_school_admins` has NO `login_code` column.** Principals authenticate via `password_hash` lookup. Never write `login_code` to this table. If you ever genuinely need it, ship a migration first then re-enable.

2. **Service worker MUST stay narrow-intercept.** Only call `event.respondWith()` for cacheable static assets + navigation requests. NEVER intercept everything-and-fabricate-503 again. The pattern lives in `public/montree-sw.js` `isCacheable()` + the early-return for non-cacheable, non-navigation requests.

3. **SW precache MUST tolerate single-URL failures.** Use `Promise.allSettled` over per-URL `cache.add`. Never use `cache.addAll` for offline-critical assets — one bad URL kills offline support for everyone.

4. **Per-request random nonce fences for user-typed input → Sonnet prompt.** Fixed XML delimiters like `<parent_question>` are vulnerable to whitespace variants, newline-split tag names, unicode lookalikes, etc. Use `crypto.randomBytes(N).toString('hex')` per request and tell Sonnet via system prompt that the fence is session-unique. Pattern is canonical in `app/api/montree/admin/parent-question/route.ts`.

5. **Sanitize client-supplied history before appending to conversation.** A client's `history` array can contain forged `tool_use` / `tool_result` blocks. Always strip down to `{ role, content: string }` and drop everything else. Pattern is canonical in `app/api/montree/admin/principal-agent/route.ts` `sanitizeHistory()`.

6. **Cost-model assertion when logging cost_usd.** Hardcoded pricing constants need a runtime check that the actual model matches `COST_MODEL`. Soft assertion (console.error) is enough — don't throw — but catch drift early.

7. **Tool-using agent that calls internal endpoints MUST forward auth cookie + each inner endpoint MUST re-verify school_id.** This is the security model for `principal-agent`. If you add a new tool calling a new internal endpoint, that endpoint MUST `verifySchoolRequest` + `verifyChildBelongsToSchool` independently. The agent does not do its own scoping for tool inputs that flow to inner routes.

8. **Optimistic UI updates for "select" operations must handle the empty-collection case.** If you're using `prev.map(...)` to update an entry, also check whether the entry exists; if not, append. The empty-area focus pick bug came from this exact omission.

9. **Honesty rules in Sonnet prompts: only quote dates verbatim from context (YYYY-MM-DD), no medical claims, no future promises, fall back to "I'd like to check with [teacher]" when context doesn't cover the question.** This pattern is canonical across child-briefing, parent-question, and principal-agent system prompts.

---

## Migration to run

🚨 **`migrations/184_principal_agent_log.sql`** must be run in Supabase SQL Editor before the principal-agent's logging works. Until run, the agent will function but rows silently fail to insert (insert errors are caught in fire-and-forget IIFEs and only logged to console). Bug surfaces only as "no rows in super-admin/principal-questions view".

---

## Carry-overs from prior sessions (still open)

- 🚨 **`RESEND_API_KEY` env var on Railway** — placeholder `re_123`. Until fixed, NO emails leave the system. Principal invite has been engineered around it (email step removed entirely), but other flows (parent reports, etc.) are still affected.
- **Verify principal redesign on production** — V2 agent-chat home has had ZERO human testing on real Whale Class data. First open could surface something the audit didn't catch.
- **Stripe upgrade flow** — `personal_classroom` → `school` plan transition is still manual (super-admin updates `plan_type`). Self-serve checkout deferred.
- **Resend `montree.xyz` domain verification** — still pending.
- **Setup-stream resilience** — `/api/montree/principal/setup-stream` not idempotent against 503 mid-stream.
- **Inner-content polish on 8 V3 admin pages** — `bg-white/10` cards still need replacing with canonical glass tokens.
- **Cockpit translation pass** — about 50 hardcoded English strings.

---

## Lead state corrections needed in CLAUDE.md

While doing dedup checks for the lead drafts, found these mismatches:

- **Ardtona House**: CLAUDE.md says `info@ardtonahouse.co.uk` and "Do you offer a free trial?" → reality is `vheavey@ardtonahouseschool.ie` (Valerie, .ie not .co.uk), her actual reply was "school is very small, not interested", Tredoux already offered free Apr 22.
- **Paint Pots Montessori**: CLAUDE.md lists as hot lead → reality: Apr 30 send BOUNCED. Address dead.
- **Montessori Copenhagen**: CLAUDE.md says `info@montessori-cph.dk` → no Gmail history with that address. Either email is wrong or message deleted.

---

## 🚨 Late-session product reframe — TRACY

After shipping the V2 agent home, user pushed back on the proactive dashboard mockup with sharper product clarity than I'd had. The real position from the principal-as-archetype:

- The principal **does NOT want a daily briefing or any proactive content.** She has enough to deal with outside Montree. The last thing she wants is the system adding new problems to her plate every Monday.
- The principal **does NOT care about individual children pedagogically.** That's the teacher's job.
- The principal **cares about the BUSINESS** — parent retention, teacher accountability, school reputation, money.
- She wants **competence on demand.** Reactive only. Open the app, ask, get a real answer. Close it.

This is the opposite of what I'd designed in my own dashboard mockup ("Pay attention to / Worth celebrating / Quiet signal" briefing). My version was useful for a developer who wants to see what the data CAN do; her version is useful for a tired principal who has 100 other things to think about.

### Naming decision locked in: TRACY

The principal's AI is named **Astra**. Distinct from Guru:

| | Guru | Astra |
|---|---|---|
| Who it serves | Teachers, parents, principals (per-child context) | Principal only |
| Mental model | Maria Montessori in your pocket | Trusted chief-of-staff who knows the whole building |
| Scope | One child's profile + photos + notes + curriculum | Every child, every teacher, every note, every observation, every parent signal — and can CALL Guru when child-pedagogical depth is needed |
| Voice | Pedagogical, observant, warm | Operational, decisive, warm — chief-of-staff |
| Push or pull? | Mostly pull | **Pull only.** Never pushes. Never delivers new problems she didn't ask about. |
| Output ends with | Insight | An action she can take |

**Astra can call Guru as a sub-tool** when the question requires child-pedagogical depth (e.g., "Emily's mom is asking about her math" needs Astra to pull the child's data, but Guru's voice/lens to interpret the math-resistance angle). The principal never sees Guru directly through Astra's surface — she sees Astra's synthesised answer in the chief-of-staff voice.

### Question categories Astra must answer well

From the conversation:

**Teachers (her core job):** *"How is Susan doing in the classroom?"* — vague on purpose. Astra unpacks into:
- Activity (47 photos confirmed, 12 notes written, last login)
- Coverage (14 of 18 children observed; 4 missed and named: Aiden, Sofia, Marco, Liam)
- Quality (notes have substance, not "good day" boilerplate)
- Pattern (heaviest on Math, light on Language and Cultural)
- Verdict ("She's pulling her weight. The four she's missed are the ones to flag.")

**Parent-trigger child synthesis:** *"Emily's mom is asking about her math — what do I say?"* — Astra:
- Pulls Emily's math state (focus works, mastered, recent observations)
- Surfaces the relevant teacher note (one from two weeks ago: "Emily resistant to math today, wanted to do collage instead")
- Drafts a parent-ready answer the principal can read aloud or paraphrase, woven INTO her voice — not handed to her as raw data

**Parent relationships:** *"What's the latest with Emma's family?"* — needs new parent-as-first-class-entity data model. **Currently the biggest data gap.** We track children, not the parent relationship.

**Business state:** rare but high-stakes — *"is everything OK in the school right now?"*

### Theorize-first directive

🚨 **Astra is theorize-first. The next session does NOT build code.** This is critical.

The next session opens `docs/TRACY_FRAMEWORK_BRIEF.md` and runs the 3×3×3×3×3 method (Session 82 canonical) but **only Phases 1–3** (RESEARCH × 3, PLAN × 3, INVESTIGATE × 3). Output is `docs/TRACY_FRAMEWORK_PLAN.md` with all 8 plan sections filled in:

1. Tool surface
2. Data model additions (parent-as-first-class)
3. System prompt
4. Home page UX
5. Logging
6. Trust + correction model
7. Cost ceiling
8. Risks + open questions

Build comes after the plan + investigate + audit cycles are complete.

### Decisions already locked (do not re-debate)

1. AI is named **Astra**.
2. Astra is **distinct from Guru**.
3. Astra can **call Guru as a sub-tool**.
4. Home page has **no proactive content**.
5. Astra lives on existing `/montree/admin` route — replaces principal-agent prompt + tools, doesn't replace the route.
6. Logging continues to `montree_principal_agent_log` (migration 184).
7. Whether to rename `/montree/admin/guru` sidebar item — decide in the plan, not now.

### What NOT to do in next session

- Do not write any new API routes
- Do not write any new database migrations
- Do not change `principal-agent/route.ts`
- Do not pick a "Astra avatar" or design polish
- Do not overengineer the parent data model speculatively. Talk to Chen first if possible.

---

## Next session priorities

1. **🚨 Run migration 184** in Supabase SQL Editor — required for principal-agent logging.
2. **🚨 TRACY THEORIZE PHASE.** Open `docs/TRACY_FRAMEWORK_BRIEF.md`. Run RESEARCH × 3 → PLAN × 3 → INVESTIGATE × 3. Produce `docs/TRACY_FRAMEWORK_PLAN.md`. Audit the plan with a fresh-eye agent. **Do not write code.**
3. **Verify V2 principal-agent on production** (current state, before Astra lands) — open `/montree/admin`, ask 5-10 questions across the full tool surface. Watch the super-admin questions log fill in. Validates plumbing before Astra reframes the brain.
4. **Send the 3 hot lead drafts in Gmail** — Ardtona, FAMM, Тамі. All passed dedup checks, ready to send.
5. **Update CLAUDE.md lead state** — Paint Pots BOUNCED, Ardtona email correction, Copenhagen email verification needed.
6. **Resolve the Resend block** — set `RESEND_API_KEY` on Railway with a real key + verify `montree.xyz` domain.
7. **Wait for user prompt to resume social setup** — phrase: "Ready for Step 2 of social setup". Then walk through Supabase tables + Railway env vars.
8. **Inner-content polish** on the 8 admin pages from Session 83.
9. **Stripe upgrade flow** — self-serve `personal_classroom` → `school` transition.
