# Astra v2 — Marathon Build Handoff

> **For: the next agent picking this up after a fresh session.**
>
> **Read this whole doc before doing anything.** It's the canonical brief —
> assumes you have ZERO prior context for this session's work. Every file
> path is absolute from the repo root. Every commit hash is on `main`.
> Every "already decided" decision below was made deliberately by the
> previous agent + user; don't re-debate them unless something concretely
> breaks.
>
> **User: Tredoux** — Whale Class principal-handover-to-Leu happened
> Session 134. Tredoux operates Whale Class as lead teacher now; Principal
> Leu (login `XVYHHX`) holds the principal cockpit. Both rows live in DB.

---

## 1. Mission

The principal (Leu / future principals) uses **Astra** — a chief-of-staff
AI — to prepare for and execute parent meetings. Astra's defining real-use
case: *"prepare me for a meeting with Yo-yo's mother about his behavioural
issues and K-class readiness."*

**The product gap we're closing:** Astra currently has hard-coded "do say
X / don't say Y" rules and a 9-section dossier structure. She lacks the
**psychological depth** to apply those rules with judgment. The user's
words: *"Guru has the right psychological mind. Can we basically duplicate
guru but give her a principal facing attitude?"*

**Answer: yes.** Same architectural pattern as Mira's knowledge base
(Session 133 Phase C — already proven). Different content domain: adult
interpersonal dynamics + difficult-conversation frameworks, not child
pedagogy.

---

## 2. State of the repo (as of handoff write-time)

### 2a. What's on `main`

| Commit | What | Status |
|---|---|---|
| `7eb91f94` | Astra streams parent-meeting tokens directly (option 1) | ✅ Live |
| `f2fa4c14` | Astra Sonnet swap + quick-brief default + brevity discipline | ✅ Live |
| `07b9c0ad` | Dashboard: student grid bottom-row name clipping fix | ✅ Live |
| `98681b0b` | Monthly Summary feature — 4th sub-tab in Weekly Admin | ✅ Live |
| Session 134 chain (`f631c6da`, `f5e392a8`, `5c5633da`, `2323f109`, `3ef1bdd0`) | Chinese translatability + Astra stability + principal handover + story vault | ✅ Live |

### 2b. What's in the working tree, audit-clean but NOT yet committed

When the previous agent stopped, two changes were staged-ready but **never
made it into a commit**. Phase 0 commits these.

| File | Change | Why |
|---|---|---|
| `app/montree/admin/page.tsx` | `paddingLeft: 8, paddingRight: 8` on the chat scroll container (around line 882) | The avatar pulse halo (box-shadow) was being clipped on the LEFT edge by `overflowY: 'auto'` on the scroll container. Adding symmetric L/R padding gives the glow room to breathe. **Root cause is structural** — overflow containers clip box-shadow that extends outside their bounds. This has been "fixed" 3-4 times before because every prior fix was at the avatar level (size, shape, lineHeight) without addressing the SCROLL CONTAINER clipping. |
| `app/api/ping/route.ts` (NEW) | Lightweight GET/HEAD endpoint, no auth, just `{ ok: true, t: <iso> }` | Keepalive endpoint for a 10-minute cron to keep Railway container warm. Eliminates cold-start on login page (was ~5s, target <800ms). |
| `docs/perf/CRON_SETUP.md` | Added section "2b. Recurring keepalive ping (Session 135 — fixes the slow login page)" | Documents the every-10-min cron + comparison with /api/warm + alternative cron hosts |

### 2c. What's NOT touched yet (Phase 2 builds these)

Nothing — Phase 2 work hasn't started. Knowledge files don't exist yet.

### 2d. Critical DB state

| Migration | Status | Impact if not run |
|---|---|---|
| `migrations/237_meeting_dossiers.sql` | ⏳ **STILL PENDING** Tredoux's Supabase run | Dossiers GENERATE fine but every reopen burns ~$0.05 in Sonnet because there's no cache. UI surfaces a "migration 237 not run" hint when caching is off. **The streaming work this session works regardless of 237** — streaming is per-call, not cache-dependent. |

Don't block on 237. Build assumes it's not run yet; the cache layer gracefully degrades.

---

## 3. The Marathon Plan (4 phases, ~4.5 hours total)

### Phase 0 — Ship pending work (~5 min)

**Goal:** Get glow fix + ping route + cron docs onto main so they're not lost.

**Files** (already edited, just needs `git add` + commit + push):
1. `app/montree/admin/page.tsx` (paddingLeft/Right on scroll container)
2. `app/api/ping/route.ts` (new file)
3. `docs/perf/CRON_SETUP.md` (new section 2b)

**Audit** (already done — verify before committing):
```bash
cd /sessions/affectionate-blissful-davinci/mnt/whale && npx eslint --max-warnings=0 \
  app/montree/admin/page.tsx \
  app/api/ping/route.ts 2>&1 | tail -5
```
Should exit 0.

**Commit message:**
```
Dashboard glow clip + keepalive route + cron docs

- Chat scroll container paddingLeft/Right 8px so Astra avatar's
  box-shadow halo isn't clipped by overflow:auto. Root-causes the
  3-4-time recurring "glow missing on left" issue — every prior fix
  was at the avatar level (size, shape, lineHeight); none addressed
  the scroll container clipping.
- New /api/ping endpoint (HEAD + GET, no auth, no DB, no AI). Cheapest
  possible keepalive — just NextResponse.json. Designed for a 10-min
  cron to keep Railway container warm and eliminate cold-start on the
  login page.
- CRON_SETUP.md section 2b documents the cron (*/10 * * * *), explains
  why /api/ping over /api/warm for keepalive, lists alternative hosts
  (UptimeRobot, GitHub Actions, cron-job.org).
```

**Push pattern:** Always Desktop Commander on the Mac, never sandbox SSH:
```javascript
mcp__Desktop_Commander__start_process({
  command: "cd ~/Desktop/Master\\ Brain/ACTIVE/whale && git push origin main 2>&1",
  timeout_ms: 25000
})
```

**Don't push from sandbox.** SSH push from `/sessions/affectionate-blissful-davinci/mnt/whale` doesn't work reliably; CLAUDE.md is explicit on this.

---

### Phase 1 — Diagnose Astra's strikeout (~45 min)

**Background — what the user reported:** "Astra took the question — *'Astra,
I have a meeting with Yo-yo's parents about his behavioral issues and
viability to graduate and cope in the k-class or lack thereof. Can you
gather all the data on yo-yo and prepare me for a meeting with the mother'*
— and just struck out. No reply and no information in the console logs."

**Most likely culprits** (in order of probability):

1. **Streaming refactor has a bug.** Phase 1's first task is to re-read
   `lib/montree/tracy/tools/prepare_parent_meeting.ts` lines 809-933 (the
   streaming block) carefully. The pattern is:
   ```typescript
   const stream = anthropic.messages.stream({...});
   const streamPromise = (async () => {
     for await (const event of stream) {
       if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
         buffer += event.delta.text;
         drain(false);
       }
     }
     drain(true);
     const finalMessage = await stream.finalMessage();
     // use finalMessage.usage
   })();
   await Promise.race([streamPromise, timeout]);
   ```
   **Potential issues to verify:**
   - Anthropic SDK version may treat `for await` + `finalMessage()` differently than expected. Check `package.json` for `@anthropic-ai/sdk` version. If <0.27, the streaming API may not behave as documented.
   - The `Promise.race` doesn't cancel the stream — if it times out, the stream keeps consuming and the timeout firing doesn't propagate properly. Consider using `stream.controller.abort()` on timeout.
   - The for-await loop might never advance if `content_block_delta` events never arrive (Sonnet not producing tokens). Add a per-chunk watchdog.

2. **Cookie / auth still wrong.** The user might still be on the teacher
   cookie. The principal-agent route has a defensive school_admins fallback
   (Session 86 commit `ca1e13bc`), so a teacher who IS also a principal in
   `montree_school_admins` would still get through. But if their JWT's
   `auth.userId` is the teacher's UUID and that UUID is NOT in
   `montree_school_admins`, they 403. **Check Railway logs for 403s on
   `/api/montree/admin/principal-agent` around the strikeout time.**

3. **First-request cold start + 60s API timeout combined.** API_TIMEOUT_MS
   is 60s for individual calls; the streaming Sonnet call has its own
   timeout (180s). If Railway was cold AND Sonnet took >60s AND something
   bubbled an error wrong, the user sees nothing.

4. **SSE stream killed by proxy.** Cloudflare's default SSE idle timeout
   is 100s. Railway's edge has its own. If no SSE event lands for >60s,
   the connection drops silently from the client's perspective.

**What Phase 1 ships** (instrumentation + UX safety nets, NOT a guess at the fix):

| File | Change | Reasoning |
|---|---|---|
| `app/api/montree/admin/principal-agent/route.ts` | Add `meeting_brief_init` SSE event when prepare_parent_meeting starts | UI shows "Preparing dossier..." immediately. If init fires but no chunks, we know Sonnet stalled. If init never fires, the tool never started. Surgical diagnostic signal. |
| `lib/montree/tracy/tools/prepare_parent_meeting.ts` | Add `[prepare_parent_meeting]` console.log markers at: function-entry, post-cache-check, pre-Sonnet-call, on each section transition, on stream-complete, on timeout, in catch block. | Railway logs will tell us EXACTLY where it died next time. |
| `lib/montree/tracy/tools/prepare_parent_meeting.ts` | Wrap the streaming loop with try/catch that captures Anthropic SDK errors specifically (status code, error type) | Right now `e instanceof Error ? e.message` swallows the structured error. Pull it apart. |
| `lib/montree/tracy/tools/prepare_parent_meeting.ts` | Add per-chunk watchdog: if no `content_block_delta` arrives for 30s, log + fail with explicit "Sonnet stalled" error | Currently the outer 180s timeout is the only guard. A stalled stream silently waits the full window. |
| `app/montree/admin/page.tsx` | UI fallback: if a tool chip has been spinning >15s without any further events, render "Astra is taking longer than usual — still working..." | Users don't think it died silently. |
| `lib/montree/tracy/tools/prepare_parent_meeting.ts` | Verify the executor passes `onMeetingStream` correctly — re-trace `tool-executor.ts:875`. | Last session verified once but the user saw a strikeout post-ship, so verify again. |

**Don't speculate-fix anything in Phase 1 — INSTRUMENT FIRST.** The plumbing
will tell us where it actually fails. If the strikeout repros after Phase 1
ships, the logs will pinpoint it and Phase 1.5 fixes the real bug.

**Files this phase touches:**
- `app/api/montree/admin/principal-agent/route.ts`
- `lib/montree/tracy/tools/prepare_parent_meeting.ts`
- `app/montree/admin/page.tsx`

**Audit gate:** Lint clean, manual trace of the 4 SSE event types (`tool_call`, `tool_progress`, `meeting_brief_init`, `meeting_brief_chunk`, `meeting_brief`, `tool_result`), commit + push.

---

### Phase 2 — Give Astra Guru's psychological mind (~3 hours)

**The architectural mandate:** duplicate Guru's depth, retain Astra's
principal-facing voice + whole-school scope.

#### 2.1 Information to gather first (~30 min reading)

Read these files in full before writing anything:

| File | What to extract |
|---|---|
| `lib/montree/guru/conversational-prompt.ts` | Guru's complete system prompt. Extract: (a) the Maria Montessori philosophy section, (b) the child development frame, (c) the "Maria Montessori in your pocket" voice. These become source material for `01-psychological-foundation.md`. |
| `lib/montree/guru/tool-definitions.ts` | Full tool surface — for context, but NOT for replication. Astra doesn't need write tools (set_focus_work, save_observation, etc.) — principals don't write per-child data, teachers do. |
| `lib/montree/mira/knowledge/loader.ts` | THE template. Mirror this pattern exactly for `lib/montree/tracy/knowledge/loader.ts`. |
| `lib/montree/mira/knowledge/*.md` | Length / depth / format conventions. Each Mira knowledge file is ~500-1500 words, focused topic, declarative prose. Match the format. |
| `lib/montree/tracy/system-prompt.ts` | Current state — where to inject the knowledge summary. Look for the `# BREVITY DISCIPLINE` section added Session 135; the new `# PSYCHOLOGICAL FOUNDATION` block goes RIGHT AFTER it. |
| `lib/montree/tracy/prompts/parent_meeting_prep.ts` | Current dossier-builder prompt. The knowledge bundle gets injected here at the prepare_parent_meeting Sonnet call too. Don't replace the existing rules — augment them. |

**Source material for the knowledge files** (synthesize from training, don't web-fetch unless explicitly needed):

| Source | What it gives | Goes into |
|---|---|---|
| Stone, Patton, Heen — *Difficult Conversations: How to Discuss What Matters Most* (Harvard Negotiation Project) | Three layers framework (what happened / feelings / identity), separating intent from impact, the "and stance" | `02-difficult-conversations.md` |
| Marshall B. Rosenberg — *Nonviolent Communication: A Language of Life* | OFNR framework (Observation, Feeling, Need, Request); the four ways to receive criticism; why validation precedes reframing | `03-nonviolent-communication.md` |
| Madeline Levine — *The Price of Privilege* + *Teach Your Children Well* | Affluent parent anxieties + the "achievement at all costs" trap + over-protection patterns | `04-parent-psychology-patterns.md` |
| Carol Dweck — *Mindset: The New Psychology of Success* | Fixed vs growth mindset; how parents project their own anxieties; the language traps ("you're so smart" vs "you worked hard") | `04-parent-psychology-patterns.md` |
| Wendy Mogel — *The Blessing of a Skinned Knee* | Over-protection patterns; spiritual / psychological frame for letting children struggle productively | `04-parent-psychology-patterns.md` |
| Erin Meyer — *The Culture Map: Breaking Through the Invisible Boundaries of Global Business* | High-context vs low-context cultures, evaluating directness, persuasion styles, disagreement norms. Apply to Chinese vs Anglophone vs European parent dynamics in international Montessori settings. | `05-cultural-communication.md` |
| Miller & Rollnick — *Motivational Interviewing* | OARS framework (Open Questions, Affirmations, Reflections, Summaries); the spirit of MI (partnership, acceptance, compassion, evocation) | `07-de-escalation-toolkit.md` |
| Maria Montessori — *The Absorbent Mind* + *The Discovery of the Child* + *The Montessori Method* | The developmental story arc parents don't see; concentration as the work of the child; sensitive periods; why "free play" isn't free | `06-montessori-parent-anxieties.md` AND `01-psychological-foundation.md` |
| Patterson, Grenny, McMillan, Switzler — *Crucial Conversations* | Safety in dialogue, mutual purpose, contrasting statements, STATE skills | `02-difficult-conversations.md` |

#### 2.2 New file structure (creates 8 new files)

```
lib/montree/tracy/knowledge/
├── INDEX.md                              [~600 words]
│   The map. For Sonnet's benefit + future agents. Names each file,
│   says when Astra should consult it. Top of the loader-returned
│   summary references this index.
├── 01-psychological-foundation.md        [~2000 words]
│   Adapted from Guru's Maria Montessori + child-development prompt.
│   Same essentials but REFRAMED for principal use: "the child you're
│   discussing with the parent sits inside a developmental arc. Your
│   job is to make the parent see the arc when she came in looking for
│   the verdict." Includes: prepared environment, sensitive periods,
│   normalization, concentration as work, the four planes of development
│   (focus on plane 1: 0-6).
├── 02-difficult-conversations.md         [~1500 words]
│   Stone/Patton/Heen three-layer model (what happened / feelings /
│   identity); separating intent from impact; the "and stance" (your
│   reality AND mine); Crucial Conversations safety patterns.
│   Application to parent meetings: why "we're worried" breaks identity
│   safety, why "we've noticed + we're curious" preserves it.
├── 03-nonviolent-communication.md         [~1200 words]
│   Rosenberg OFNR framework. The four ways to receive criticism
│   (blame self / blame other / empathy for self / empathy for other).
│   Why validation must come before reframing. Specific NVC parent
│   conversation examples.
├── 04-parent-psychology-patterns.md       [~1800 words]
│   Five parent archetypes Astra recognises:
│     - EXPECTATION-DRIVEN (most affluent parents; Madeline Levine)
│     - ANXIETY-PROJECTING (Carol Dweck's fixed-mindset transmission)
│     - HANDS-OFF (the "I'm trusting you to handle it" parent)
│     - COMPARISON-TRAPPED (the "but my friend's kid..." trap)
│     - DEFENDED (the "you're saying my child is broken" reaction)
│   Each archetype: how to recognise + triggers to avoid + engagement
│   patterns that work + specific language pairs.
├── 05-cultural-communication.md           [~1500 words]
│   Erin Meyer's Culture Map applied to Chinese vs Anglophone vs
│   European parents in international Montessori settings. Eight
│   dimensions: communicating, evaluating, persuading, leading,
│   deciding, trusting, disagreeing, scheduling.
│   Specific: when "we'll think about it" means "no" vs "yes"; face
│   dynamics with Chinese families; the Confucian authority frame; how
│   to deliver hard observations indirectly without losing precision.
├── 06-montessori-parent-anxieties.md      [~1200 words]
│   Specific to Montessori schools: "is this rigorous enough?", "why
│   does my kid play all day?", "what about academics?", "how will my
│   child cope in conventional K?". The developmental story arc parents
│   don't see. How to make the invisible visible. Specific language
│   for each anxiety.
├── 07-de-escalation-toolkit.md            [~1000 words]
│   Motivational Interviewing OARS (Open Questions, Affirmations,
│   Reflections, Summaries). The 3-second pause. Validation loops.
│   When to stop talking. Specific phrase pairs that de-escalate vs
│   escalate. The "what would help right now?" reset.
└── loader.ts                              [~150 lines TS]
    Reads + caches the markdown files (process-level cache, invalidate
    on file mtime change). Two public functions:
      getTracyKnowledgeSummary() → ~1500-token compressed summary,
        injected into Astra's main system prompt on every turn.
      getTracyKnowledgeFull(topic: TracyKnowledgeTopic) → returns the
        full markdown for one file. Tool-callable via
        consult_tracy_knowledge.
    Mirror Mira's loader.ts at lib/montree/mira/knowledge/loader.ts.
```

Total knowledge content: **~10,200 words**, ~13K tokens.

#### 2.3 Integration changes

| File | Change |
|---|---|
| `lib/montree/tracy/system-prompt.ts` | Add `# PSYCHOLOGICAL FOUNDATION` section AFTER the existing `# BREVITY DISCIPLINE` block. Inject `getTracyKnowledgeSummary()` result. Astra now ALWAYS has the framework loaded — every turn benefits, not just parent meetings. |
| `lib/montree/tracy/tool-definitions.ts` | New `consult_tracy_knowledge` tool with input schema: `{ topic: 'foundation' \| 'frameworks' \| 'nvc' \| 'patterns' \| 'cultural' \| 'montessori_anxieties' \| 'de_escalation' \| 'index' }`. Returns the full file content. |
| `lib/montree/tracy/tool-executor.ts` | Dispatch case for `consult_tracy_knowledge`. No school-scoping needed (knowledge is universal). |
| `lib/montree/tracy/tools/prepare_parent_meeting.ts` | Inject the FULL knowledge bundle (~13K tokens) into the dossier-builder Sonnet's system prompt — between `PARENT_MEETING_PREP_SYSTEM_PROMPT` and `PARENT_MEETING_PREP_WORKED_EXAMPLE`. Current dossier prompt has hard-coded rules; the knowledge files provide the WHY behind those rules so Sonnet can apply them with judgment instead of mechanically. |
| `lib/montree/tracy/prompts/parent_meeting_prep.ts` | Light edits to remove rules that are now redundant with the knowledge base. The hard rules stay (forbidden phrases, structure); the redundancy goes. Add reference: "the PSYCHOLOGICAL FOUNDATION above informs every section below." |
| `lib/montree/tracy/index.ts` | Export the new loader functions. |

#### 2.4 Architectural rules to preserve

- **School-scoping contract**: knowledge files are READ-ONLY content, not per-school. Same content for every principal — that's correct (the psychology doesn't change per school). No schoolId filter needed on the consult_tracy_knowledge tool.
- **Cache compatibility**: dossier cache key (in `dossier_cache.ts`) folds `meeting_purpose` + locale + scope_owner_id. Adding the knowledge bundle to the prompt doesn't change the cache contract. Existing cached dossiers remain valid (they were generated without the knowledge bundle, but the cache hit serves them correctly; new dossiers post-deploy get the richer prompt).
- **Streaming compatibility**: the new system prompt content increases input tokens (~+13K) but doesn't change the streaming flow. Brief + dossier still split via `<<<BRIEF>>>` / `<<<DOSSIER>>>` delimiters.
- **Cost impact**: extra ~$0.04 per parent-meeting (13K input × $3/MTok). Wholesale cost per dossier: ~$0.04 → ~$0.08. Still under $0.10/meeting. Worth it.
- **Voice contract**: Astra stays chief-of-staff. The knowledge informs WHAT she knows, not HOW she sounds. The `# BREVITY DISCIPLINE` block stays in effect — Astra's chat responses default to ≤120 words. Knowledge gets used INSIDE dossier prep + when she explicitly consults a file.
- **i18n**: knowledge files are English-only deliberately. Sonnet handles framework-in-English → response-in-target-language correctly. Adding multilingual knowledge bundles ~triples the work for marginal benefit.
- **Cross-pollination**: no impact (knowledge is universal, not school-scoped).

#### 2.5 Files Phase 2 touches

**New:**
- `lib/montree/tracy/knowledge/INDEX.md`
- `lib/montree/tracy/knowledge/01-psychological-foundation.md`
- `lib/montree/tracy/knowledge/02-difficult-conversations.md`
- `lib/montree/tracy/knowledge/03-nonviolent-communication.md`
- `lib/montree/tracy/knowledge/04-parent-psychology-patterns.md`
- `lib/montree/tracy/knowledge/05-cultural-communication.md`
- `lib/montree/tracy/knowledge/06-montessori-parent-anxieties.md`
- `lib/montree/tracy/knowledge/07-de-escalation-toolkit.md`
- `lib/montree/tracy/knowledge/loader.ts`

**Modified:**
- `lib/montree/tracy/system-prompt.ts`
- `lib/montree/tracy/tool-definitions.ts`
- `lib/montree/tracy/tool-executor.ts`
- `lib/montree/tracy/tools/prepare_parent_meeting.ts`
- `lib/montree/tracy/prompts/parent_meeting_prep.ts`
- `lib/montree/tracy/index.ts`

#### 2.6 Test plan (post-build, pre-commit)

1. `npx eslint --max-warnings=0` across all 6 modified + 1 TS new file (`--max-warnings=0`, exit 0)
2. Verify `getTracyKnowledgeSummary()` returns a non-empty string of expected length (~1500 tokens, ~6000 chars)
3. Verify token count: sum of (system prompt + memory section + knowledge summary) lands under 30K tokens. Anthropic's 200K context window is fine; we're nowhere close.
4. Unit-test the loader: create a tiny test file that calls `getTracyKnowledgeFull('frameworks')` and asserts the returned markdown is non-empty + contains a known section heading.
5. Re-verify the SSE event flow: `tool_call → tool_progress → meeting_brief_init → meeting_brief_chunk* → meeting_brief → tool_result` end-to-end via grep.
6. Verify i18n strict parity (no new keys this phase — knowledge files are English-only deliberately, since they're knowledge not UI strings). `node scripts/check-i18n-completeness.mjs --strict` should still pass at 100% × 12 locales.
7. Verify Astra's existing tool surface still works — grep for all `case 'name':` in tool-executor.ts and confirm dispatch coverage.

---

### Phase 3 — Audit cross-cut + commit + push (~30 min)

**Pattern from this session (well-proven):** 3 consecutive clean audit passes.

**Audit checks:**
1. Lint clean (all touched files, `--max-warnings=0`)
2. i18n strict parity passes (12 locales × current key count, 100%)
3. Cross-pollination: every Supabase query in modified files is school-scoped (grep `from('montree_` and check the next `.eq('school_id'` or equivalent)
4. SSE event types in route match the UI handler types in `app/montree/admin/page.tsx`
5. ConvTurn / MeetingBrief TypeScript interfaces match between server SSE payloads and client state
6. Tool dispatch coverage: every tool name in `tool-definitions.ts` has a matching `case` in `tool-executor.ts`
7. Tool input validation: every tool's `input_schema.required[]` fields are validated in the dispatch case
8. Knowledge loader: cache invalidation on file mtime works (manual file-write test if time permits)

**Commit message structure:**
```
Astra v2: psychological mind via Guru-pattern knowledge base + Phase 1 diagnostic plumbing

The headline change. Astra now has 10,200 words of psychological depth
baked in via 7 markdown files in lib/montree/tracy/knowledge/, mirroring
Mira's knowledge architecture (Session 133). The user's words: "Guru has
the right psychological mind. Can we duplicate Guru but give Astra a
principal facing attitude?" Answer: yes — same loader pattern as Mira,
same depth as Guru, different content domain (adult interpersonal +
difficult conversations, not child pedagogy).

CONTENT DOMAINS (7 knowledge files):
1. Psychological foundation — Maria Montessori + plane-1 developmental
   arc, adapted from Guru's prompt for principal use
2. Difficult conversations — Stone/Patton/Heen three-layer model +
   Crucial Conversations safety patterns
3. Nonviolent communication — Rosenberg OFNR + four ways to receive
   criticism
4. Parent psychology patterns — 5 archetypes (expectation-driven,
   anxiety-projecting, hands-off, comparison-trapped, defended)
5. Cultural communication — Erin Meyer Culture Map applied to
   Chinese / Anglophone / European parent dynamics
6. Montessori parent anxieties — "rigorous enough", "K readiness",
   making the invisible visible
7. De-escalation toolkit — Motivational Interviewing OARS + validation
   loops

ARCHITECTURE:
- lib/montree/tracy/knowledge/loader.ts (mirrors lib/montree/mira/
  knowledge/loader.ts pattern)
- getTracyKnowledgeSummary() injects ~1500-token compact summary into
  Astra's main system prompt on every turn
- getTracyKnowledgeFull(topic) returns one file's content, callable
  via new consult_tracy_knowledge tool
- prepare_parent_meeting Sonnet call gets the FULL knowledge bundle
  (~13K tokens) so dossiers are theory-grounded, not just rule-driven

PHASE 1 DIAGNOSTIC PLUMBING:
- New meeting_brief_init SSE event when prepare_parent_meeting starts
- [prepare_parent_meeting] console.log markers at every phase
- Per-chunk watchdog (30s no-token fail) inside streaming loop
- UI fallback message after 15s of tool spinning without further events
- Structured error capture in the Anthropic SDK try/catch

COST IMPACT: +$0.04 per parent-meeting dossier (13K extra input tokens
× $3/MTok). Wholesale: ~$0.04 → ~$0.08 per dossier. Still under
$0.10/meeting. Worth the depth.

NO REGRESSION TO TRACY VOICE: BREVITY DISCIPLINE block from Session 135
still in force. Astra's chat responses default to ≤120 words. Knowledge
gets used INSIDE dossier prep + when she explicitly consults a file.
```

**Push pattern:** Desktop Commander on the Mac, always.

---

## 4. Things explicitly NOT in scope for this marathon

- **#10 dual-role login** (separate cookies per role, header role-switcher). Half-day on its own. Document as next priority but don't build.
- **Don't replicate Guru's WRITE tools** (set_focus_work, save_observation, save_developmental_insight, etc.). Principals don't typically write per-child observations themselves — teachers do via Guru. Adding write tools to Astra is feature creep; adding the PSYCHOLOGICAL DEPTH is the actual unlock.
- **Don't change Astra's voice/personality contract** — chief-of-staff stays chief-of-staff. The knowledge informs WHAT she knows, not HOW she sounds.
- **Don't change the dossier 9-section structure or the BRIEF format** — those landed Session 135, working as intended.
- **Don't web-fetch source material** unless the user explicitly approves the cost+time. All source material is well within training corpus. Synthesize from there.

---

## 5. Critical context for the agent

### 5.1 Cookie / auth state

The user previously reported Astra 403'ing with "Only principals can use the home agent." Root cause: only ONE auth cookie (`montree-auth`). Logging in as teacher overwrites the principal cookie. The principal-agent route has a defensive school_admins fallback (Session 86 commit `ca1e13bc`) — when JWT role isn't 'principal' but `auth.userId` matches an active row in `montree_school_admins` for the current school, it allows through. **This means:** as long as the same UUID appears in both `montree_teachers` and `montree_school_admins`, the user can access Astra regardless of which cookie is set. **This is NOT the case for Tredoux** — his teacher row has a different UUID than his (former) principal row, which is why he hit 403 when he was on the teacher cookie. **Workaround for testing:** log out fully, log in with principal code (`XVYHHX` for Leu, or whatever the current principal code is).

**Tredoux's current state in DB:**
- `montree_teachers`: id=`26c365b0-...`, name='Tredoux', role='lead_teacher', email=null, login_code='V8F8V9'
- `montree_school_admins`: id=`16eec1c0-bfb5-4edf-a160-059bb41803fb`, name='Principal Leu', email='principal-leu@whale-class.local', login XVYHHX. **This was handed over from Tredoux to Leu in Session 134.**

### 5.2 SSE event sequence (post-Session-135)

```
tool_call           → Astra invoked a tool (chip appears)
tool_progress       → Live status from inside a tool (Guru-style status line)
tool_result         → Tool returned (chip turns green/red)
meeting_brief_chunk → (Session 135 streaming) — each chunk has section + delta
meeting_brief       → (Session 135) final structured brief + dossier — fires
                       at tool completion AFTER chunks; replaces in-progress
                       payload with canonical version; also fires on cache-hits
thinking            → Interim Astra text between tool calls
text                → Final answer chunk
done                → Closing summary (cost_usd, duration_ms)
error               → Fatal error
```

**Phase 1 ADDS:**
```
meeting_brief_init  → (NEW Phase 1) fires when prepare_parent_meeting tool
                       starts. UI shows "Preparing dossier..." Diagnostic
                       signal: if init never fires, the tool never started.
```

### 5.3 BREVITY DISCIPLINE rules (from Session 135)

Astra's responses default to ≤120 words. If she finds herself writing the third paragraph, stop and cut. Specific over rich. ONE number, ONE date, ONE name. If she has ≥250 words of substantive material, call `prepare_parent_meeting` instead of dumping a long-form reply. **Knowledge bundle Phase 2 ships does NOT break this rule** — the knowledge is for Astra's INTERNAL judgment + the dossier-builder Sonnet, not for verbose chat responses.

### 5.4 Audit cycle pattern (proven this session)

1. Make change
2. `npx eslint --max-warnings=0` on touched files
3. If lint clean, continue
4. After major sections, run cross-cut: lint ALL touched files together
5. Pre-commit: re-read each changed file fresh, top to bottom
6. Commit with structured message
7. Push via Desktop Commander
8. Repeat if anything changes

### 5.5 Commit + push contract (from CLAUDE.md)

> **Git Push — ALWAYS use Desktop Commander FIRST:** `mcp__Desktop_Commander__start_process` with command `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main 2>&1` and `timeout_ms: 30000`. Do NOT try Cowork VM SSH keys, GitHub PATs, or `scripts/push-to-github.py` — Desktop Commander on the user's Mac is the only reliable push method.

Same applies to commit:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && \
  git -c user.email=tredoux555@gmail.com -c user.name=Tredoux \
  commit -m "..." 2>&1
```

### 5.6 Critical files cheat-sheet

| File | What it does |
|---|---|
| `lib/ai/anthropic.ts` | `AI_MODEL = 'claude-sonnet-4-6'`, `OPUS_MODEL = 'claude-opus-4-6'`, `HAIKU_MODEL = 'claude-haiku-4-5-20251001'`. Astra uses AI_MODEL (Session 135 swap from Opus). |
| `lib/montree/tracy/system-prompt.ts` | Astra's voice contract. `# BREVITY DISCIPLINE` block + `# Parent-meeting responses` block + (Phase 2 adds) `# PSYCHOLOGICAL FOUNDATION` block. |
| `lib/montree/tracy/tool-definitions.ts` | All Astra tools. Phase 2 adds `consult_tracy_knowledge`. |
| `lib/montree/tracy/tool-executor.ts` | Tool dispatch. Phase 2 adds `consult_tracy_knowledge` case. |
| `lib/montree/tracy/tools/prepare_parent_meeting.ts` | The dossier builder. Phase 1 adds diagnostic logging + per-chunk watchdog. Phase 2 injects the full knowledge bundle into the Sonnet system prompt. |
| `lib/montree/tracy/prompts/parent_meeting_prep.ts` | The dossier-builder Sonnet's system prompt. Has `PARENT_MEETING_PREP_SYSTEM_PROMPT` (rules) + `PARENT_MEETING_PREP_WORKED_EXAMPLE` (Yo-yo anchor). Phase 2 sits BETWEEN these two. |
| `app/api/montree/admin/principal-agent/route.ts` | Astra's SSE route. Phase 1 adds `meeting_brief_init` event emission. |
| `app/montree/admin/page.tsx` | Astra's chat UI. Already has `MeetingBriefCard` (Session 135). Phase 1 adds "preparing..." fallback after 15s. |
| `lib/montree/mira/knowledge/loader.ts` | TEMPLATE for Astra's loader. Read this first. |
| `lib/montree/guru/conversational-prompt.ts` | Source material for Astra's `01-psychological-foundation.md`. |

### 5.7 Environment

- Repo: `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/` (on user's Mac)
- Sandbox mount: `/sessions/affectionate-blissful-davinci/mnt/whale/`
- Production: `https://montree.xyz`
- Railway auto-deploys on push to `main`
- Anthropic SDK: check `package.json` → `@anthropic-ai/sdk` version. Streaming API depends on this.
- ESLint: pre-commit hook fires on `lib/montree/i18n/*` files (i18n strict check). Other files lint via `npx eslint --max-warnings=0`.

### 5.8 The user's frustration history (read this so you know the stakes)

- The glow clip has been "fixed" 3-4 times. Each prior fix was at the avatar level. THIS time the structural root cause (scroll container overflow clipping box-shadow) is being addressed. If THIS doesn't stick, something else is going on (browser viewport, focus ring, etc.) — escalate, don't just patch again.
- Astra struck out completely on the Yo-yo parent-meeting question this morning. Zero reply, zero console logs. **The diagnostic plumbing in Phase 1 is non-negotiable** — if the strikeout repros, you NEED the logs to diagnose. Don't skip Phase 1 to rush Phase 2.
- The user explicitly said "this is becoming quite an epic failure" about Astra. Principal Leu's introduction depends on Astra working. Phase 2 (psychological depth) is the headline feature for that introduction. Get it right.

---

## 6. Execution order (literally what to do)

1. **Read this whole doc**
2. Read `lib/montree/guru/conversational-prompt.ts` in full
3. Read `lib/montree/mira/knowledge/loader.ts` in full
4. Read `lib/montree/mira/knowledge/` markdown files (at least 2) for format
5. Read `lib/montree/tracy/system-prompt.ts` current state
6. Read `lib/montree/tracy/tools/prepare_parent_meeting.ts` (streaming block, lines ~800-933)
7. Read `lib/montree/tracy/prompts/parent_meeting_prep.ts` current prompt structure

**Then execute:**

8. **Phase 0** — commit + push pending (~5 min)
9. **Phase 1** — diagnostic plumbing (~45 min)
   - Verify pre-existing edits to glow + ping are committed
   - Make Phase 1 edits
   - Lint clean
   - Single commit + push
10. **Phase 2** — psychological mind (~3 hours)
    - Create knowledge files in order: INDEX → 01 → 02 → 03 → 04 → 05 → 06 → 07
    - Each file: write content → audit by re-reading → move on
    - Then loader.ts
    - Then system-prompt.ts injection
    - Then tool-definitions.ts + tool-executor.ts
    - Then prepare_parent_meeting.ts injection
    - Then prompts/parent_meeting_prep.ts cleanup
    - Lint clean across all touched files
    - Run knowledge loader smoke test
    - Verify i18n parity (should be unchanged)
    - Single commit + push
11. **Phase 3** — cross-cut audit (~30 min)
    - 3 consecutive clean audit passes
    - Final lint + i18n + cross-pollination check
    - If anything off, fix + re-audit
12. **Done.** Report to user.

---

## 7. Open decisions deferred to the user

None unless something concrete breaks. The plan above resolves every
"option A vs option B" tradeoff with a documented recommendation. If you
encounter a NEW decision mid-build (something I didn't anticipate),
stop, write up the options, ask the user.

---

## 8. Last words for the agent

The user is in marathon mode but tired. Move fast, audit clean, don't
re-debate decisions, ship in coherent commits with thorough messages.
Don't ask permission for things in this plan — execute them. Ask only
if something concrete breaks or a new decision surfaces.

Astra's psychological depth is the headline feature for Principal Leu's
introduction. Get it right.
