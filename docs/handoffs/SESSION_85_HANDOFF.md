# Session 85 Handoff — Tracy: Build → 5 Audits → Frontend → Restructure

**Date:** May 4, 2026
**Branch:** `main` — all 7 commits pushed to `origin/main`
**Theme:** Tracy went from architectural brief to shipped, audited five times, frontend ported, then completely re-architected when the canonical use case proved fragile. Signal: by the end of the session the architecture is meaningfully more reliable than what shipped first.

---

## Commits this session (oldest first)

| Hash | Subject | Net |
|------|---------|-----|
| `bc018674` | Tracy phase 1: chief-of-staff brain + unpack_teacher framework tool | +1,214 / −416 |
| `a693674a` | Tracy audit fixes: 3 bugs caught in self-audit pass | +55 / −16 |
| `7c7a02e5` | Tracy second audit: 3 more bugs + lint clean | +103 / −8 |
| `a2779360` | Tracy audit #3: 3 more bugs (prompt contradiction, coverage inflation, fence) | +30 / −5 |
| `4f17a3cc` | Tracy audit #4: 1 minor bug — find_children_by_name field name | +1 / −1 |
| `7ac24885` | Tracy frontend: port the chief-of-staff surface | +348 / −438 |
| `e4c59894` | Tracy child_focus: single-tool architecture for the canonical use case | +783 / −65 |

**10 real bugs caught and fixed across 5 audit passes**, then a full re-architecture when the user pushed back on the canonical use case ("tell me about Austin's English progress") proving fragile under the chained-tool architecture.

---

## What Tracy is now

The principal opens `/montree/admin`. Sees a quiet greeting:

> **Hi [Name].**
> How can I help you?

Asks anything. Tracy answers in a chief-of-staff voice that always ends with one concrete next action. That's the entire surface.

Under the hood, she has Sonnet's reasoning, two server-side framework tools (`child_focus` and `unpack_teacher`), four primitives, the same logging-to-`montree_principal_agent_log` machinery from Session 84, and the same auth/streaming/cost-model assertion patterns.

The two framework tools are the value:

- **`child_focus(question)`** — single-tool answer for ANY child question. Haiku parses the question (extracts name, area, focus). Direct Supabase resolves the child + fetches all context in parallel. Sonnet composes a grounded, parent-ready answer. One tool call, one failure surface.
- **`unpack_teacher(teacher_id)`** — the "how is Susan?" answer. Server-side activity → coverage → quality → pattern → verdict analysis with deterministic verdict labels and Haiku-scored note quality.

---

## Architectural rules locked in this session

These are non-negotiable going forward. Future agents will break these at their peril.

1. **Action rule** — every SUBSTANTIVE Tracy response ends with ONE concrete next action. Pure acknowledgments ("Thanks", "OK") are exempt.
2. **Reactive only** — Tracy never volunteers adjacent problems. Principal sets the agenda; Tracy serves it.
3. **Honesty** — Tracy only quotes dates verbatim from tool output (ISO YYYY-MM-DD). Never invents observations, names, classrooms, parents.
4. **Don't lead with pedagogy** — Tracy uses developmental knowledge as substrate, not as the lead. Pedagogical lectures are not her voice.
5. **School-scoping contract** — every direct Supabase query in a framework tool filters by `schoolId`. Internal-endpoint wraps re-verify via cookie forwarding. Never trust the agent loop alone.
6. **No internal HTTP for child questions** — the canonical use case (answer about a specific child) is end-to-end inside `child_focus` via direct Supabase. No HTTP hops, no auth re-verification, no chained-tool fragility.
7. **Per-request random-nonce fences for ANY user-input → AI prompt boundary** — Session 84 canonical pattern. Applied to `note-quality.ts`, the parse step in `child-focus.ts`, AND the compose step in `child-focus.ts`. Three fenced surfaces in Tracy alone.
8. **Heuristic fallbacks for every AI step** — `parseQuestion()` in child-focus has a regex-based fallback if Haiku fails. `composeAnswer()` returns a defensive sentence if Sonnet fails. `scoreNoteQuality()` returns `[]` if Haiku fails (caller has word-count fallback). No path throws unhandled.
9. **`montree_children` has `school_id`, `enrolled_at`, `is_active`** — confirmed via migrations 113, 126, 143. All three columns are load-bearing for Tracy's queries.
10. **`montree_teacher_notes.teacher_id` IS reliable** — per migration 148 line 18. The strongest per-teacher attribution signal. `montree_media.confirmed_by` is best-effort and not used for attribution.
11. **`unpack_teacher` quality layer treats `'no_notes'` as NEUTRAL** — only `'thin'` notes count against the verdict. A teacher who photographs well + children progressing but doesn't write notes shouldn't be penalised.
12. **Brand-new children (enrolled <21d) are skipped from stalled-detection** — they couldn't be "stalled 3 weeks" by definition.
13. **Off-roster notes don't inflate coverage_pct** — `evidenceNoteChildIds` is filtered to children IN the teacher's roster. A teacher writing notes about kids in another classroom doesn't count toward HER coverage.
14. **Empty roster returns `verdict.label: 'no_data'`** — not `soft_week` with nonsense reasons. Honest output.

---

## File-by-file changes

### NEW: `lib/montree/tracy/`

```
lib/montree/tracy/
  index.ts                        # Barrel exports
  system-prompt.ts                # Tracy's persona, voice, action rule, honesty rules
  tool-definitions.ts             # 6 tools: child_focus + unpack_teacher (framework) + 4 primitives
  tool-executor.ts                # Dispatcher with school-scoping contract
  frameworks/
    child-focus.ts                # NEW canonical answer surface (this session)
    unpack-teacher.ts             # Activity → coverage → quality → pattern → verdict
    note-quality.ts               # Haiku-scored note substance (1-5)
```

### MODIFIED: `app/api/montree/admin/principal-agent/route.ts`

Imports from `lib/montree/tracy/` instead of having an inline system prompt + tool definitions + executor. Same SSE/auth/streaming/cost-model machinery from Session 84. Today's date is now passed into Tracy's system prompt builder (so she knows what day it is when she answers).

### REWRITTEN: `app/montree/admin/page.tsx`

Same SSE/streaming/auth/persistence machinery. Visual treatment ported from the friendly mockup we agreed on:
- Strips the school-name hero, the verbose "ask me anything about your school..." subtitle, the "Try one of these" suggestions block
- Empty state: gold T avatar + "Hi [Name]." + "How can I help you?"
- Tool chips hidden — Tracy's mechanism is invisible to the principal
- Closing "I'd …" action line parsed out of Tracy's text via `splitActionLine()`, rendered distinctly with warm gold dash + 18px breathing room
- Send button reduced to single emerald circle with arrow icon
- Pending state is just `…` (italic dots) — no Sparkles, no labels

The CSS-rendered T avatar is a placeholder. When the Canva-exported monogram lands, swap to `<img src="/tracy-avatar.png" />` — one-line change in the `TracyAvatar` component.

---

## Bugs caught across the audit cycles

### Audit #1 (commit `a693674a`)

1. **Phantom `consult_guru` tool** — system prompt referenced a tool 5 times that didn't exist in `TRACY_TOOLS`. Sonnet would either ignore inconsistently or hallucinate the call. Removed all references.
2. **`qualityOk` excluded `'no_notes'`** — penalised teachers with great photos + progressing children but no notes. Changed to `qualityOk = qualityLabel !== 'thin'`.
3. **Stalled detection treated brand-new children as 21d stalled** — children with no progress rows OR enrolled <21d ago were flagged. Now uses `enrolled_at` from `montree_children` schema.

### Audit #2 (commit `7c7a02e5`)

1. **Phantom `find_teacher_by_name`** — same bug class as `consult_guru`. The `unpack_teacher` description told Sonnet to "use find_teacher_by_name first if you only have a name." That tool doesn't exist. Removed reference, directed to `list_teachers_with_summary` instead.
2. **Empty-roster verdict was nonsense** — a teacher with no classroom or empty classroom got "Coverage at 0% — 0 children without evidence" as `soft_week`. Added `'no_data'` verdict label, early-return for empty roster, honest reasons.
3. **`setTimeout` leak in `Promise.race`** — `note-quality.ts` set up a 15s timeout but never cleared it on success. Standard Node anti-pattern. Now stored in `timeoutHandle` and cleared on both success and error paths.

### Audit #3 (commit `a2779360`)

1. **Prompt contradiction** — "Every response ends with ONE concrete next action" (non-negotiable) directly contradicted "Conversational/acknowledgment — no action line for pure acknowledgments." Sonnet had to pick which to violate. Rewritten to "Every SUBSTANTIVE response ends with..." with explicit carve-out.
2. **Off-roster notes inflated coverage** — a teacher's notes about children outside her roster were inflating `childrenWithEvidence.size` past `rosterIds.length`, producing `coverage_pct` values like 150%. Filtered `evidenceNoteChildIds` to children IN the roster.
3. **Missing prompt-injection fence on note-quality** — violated CLAUDE.md Session 84 architectural rule. Teacher-typed note text flowed into Haiku unfenced. Added per-request random-nonce fences. Low blast radius (1-5 score output) but consistency matters.

### Audit #4 (commit `4f17a3cc`)

1. **`find_children_by_name` description claimed wrong field name** — said response includes `classroom` but actual API returns `classroom_name`. Sonnet would still parse the JSON correctly but description was misleading. Fixed.

### Audit #5 (no commits)

Came back clean. Convergence pattern across 5 audits: 3 → 3 → 3 → 1 → 0 real bugs found per pass.

---

## The architectural restructure (commit `e4c59894`)

After 5 audit passes the BACKEND was solid. But the user tested production and the canonical use case ("tell me about Austin's English progress") tripped — likely because of Railway deploy lag, but the user correctly identified that the architecture was too fragile regardless. If a chained-tool path can fail 5% of the time, the product fails 5% of the time on its core question.

### Old path for "how is Austin doing?"

```
Sonnet (Tracy) decides find_children_by_name
  → internal HTTP fetch /api/montree/admin/students/search
    → auth re-verification
    → returns matches
  ← Sonnet processes result, decides answer_about_child
    → internal HTTP fetch /api/montree/admin/parent-question
      → auth re-verification
      → Sonnet inside that route composes answer
    ← Sonnet relays final answer
```

4 Sonnet rounds. 2 internal HTTP hops. 2 auth re-verifications. ~$0.05 per question. Multiple failure points.

### New path

```
Sonnet (Tracy) decides child_focus(question)
  → server-side, single tool:
    Step 1 (Haiku): parse question → { name, area, focus }
    Step 2 (direct DB): resolve child by ilike search
    Step 3 (direct DB, parallel): fetch progress + observations + notes + profile
    Step 4 (Sonnet): compose grounded answer
  ← returns { resolution, child?, candidates?, answer? }
Sonnet (Tracy) relays the answer.text
```

3 Sonnet + 1 Haiku. Zero internal HTTP. Zero auth re-verification. ~$0.028 per question (~50% cheaper). Three explicit failure modes (`found` / `not_found` / `ambiguous`) each returning useful prose for Tracy to relay.

### Why this matters

The old path failed silently when ANY hop returned non-200. Auth could fail in Railway-edge during deploy churn, or if `confirmed_by` column lookups returned unexpected shape, or if cookie forwarding hit an edge. The new path's only failure is "the AI calls failed" — and even then there are heuristic fallbacks (regex parse, defensive compose response).

### What was removed

- `answer_about_child` tool (subsumed by `child_focus`)
- The `internalPost('/api/montree/admin/parent-question', ...)` path inside the executor for that tool
- Tracy's three-bullet child-question section in the system prompt (now ONE canonical instruction)

### What was kept

- `find_children_by_name` (now SECONDARY — only when the principal explicitly wants a list of name matches)
- `get_child_briefing` (now SECONDARY — only when she wants an extensive deep-dive)
- The `/api/montree/admin/parent-question` route itself (still used by the deep-link child page at `/montree/admin/child/[childId]`)

---

## Tracy's voice: design conversations this session

The user pushed twice on Tracy's surface to make it feel friendlier and more personified:

**First mockup feedback:** "I want it simpler and more friendly — does she really need to know the date, the day and the school's name?" Stripped to just `Hi [Name].` + greeting + input.

**Second mockup feedback:** Greeting wording. "What's on your mind?" → "How can I help you?" The simplest, most timeless version. A real person asking, not a service bot.

**Avatar direction:**
- Started with three options: illustrated portrait, botanical symbol, monogram with leaf
- Tested portraits in Canva (Watercolour style) — generic AI woman, rejected
- Tested monograms in Canva (Ink print style) — gold T's on dark forest green, looked good
- Settled on T monogram in elegant serif, no leaf (cleaner) — the "leaf doesn't fit on the M but does on the T" call from Tredoux led to MIXED treatment
- Tracy's `T` ended up clean. Montree's `M` exploration started but didn't finalize.
- Final asset is still pending Tredoux's chosen Canva export. The CSS-rendered T placeholder works for now.

**Cost reasoning Tredoux explicitly accepted:**

> "sonnet → haiku → haiku → sonnet, but there's only one principal running this so..."

At ~$0.028 per question and 20-30 questions/day per principal, that's $15-25/month per principal. Versus the human chief-of-staff alternative.

---

## What's still pending (in priority order)

### Carry-overs from Session 84 (still unresolved)

1. **🚨 Run migration 184 in Supabase** — `montree_principal_agent_log` table. Until run, every Tracy interaction's logging silently fails. Fire-and-forget catches the error in `console.error` but no rows accrue, which means Tredoux can't see what principals are asking via the super-admin questions log.
2. **TRACY THEORIZE phase** — was deferred per Session 84 brief. We instead built directly. The brief at `docs/TRACY_FRAMEWORK_BRIEF.md` is now historical reference, not a pending action.
3. **Resend `RESEND_API_KEY` env var on Railway** — still placeholder. Affects principal invite emails (Session 83), unrelated to Tracy.

### New (introduced this session)

1. **Drop the real Canva-exported T monogram into `/public/tracy-avatar.png`** — `TracyAvatar` component swap is one-line: change the CSS placeholder to `<img>`. Tredoux has the Canva project saved with several monogram options.
2. **Voice input for Tracy** — biggest UX win remaining. Whisper integration shipped elsewhere in the app (`/api/montree/voice-notes/transcribe` per CLAUDE.md Sessions 79-80). Mic button next to the send button, hold-to-speak or tap-toggle. Half a day's work.
3. **First-run onboarding** — when a principal opens Tracy for the first time, she introduces herself once: *"Hi, I'm Tracy. I'm here to help you run the school — ask me anything about your teachers, children, or parents."* Then steps back to the clean home forever after.
4. **System prompt nudge for closing-action variety** — Tracy currently closes substantive responses with "I'd send Susan a 2-line thank-you note for the Jimmy observation" (slightly mechanical). Want more variety: "Worth a check-in with Lucky tomorrow", "Leave it — nothing here needs you yet", "I'd reply to Emily's mum with this paragraph as written." Range and warmth.
5. **Family data model — Phase 3 of original plan** — the largest novel-capability unlock. New tables: `montree_families`, `montree_family_members`, `montree_family_interactions`. Then build `family_context` framework tool. Without this, Tracy can't answer "what's the latest with Emma's family?" — every parent interaction looks new.
6. **`consult_guru` Tracy → Guru bridge** — when a question goes pedagogically deep on a single child, Tracy currently answers from her own training. A consult_guru tool would let her hand off to Guru properly. Documented as future in `tool-definitions.ts` comments.

### Deferred / known limitations

- `lastUpdates` query in `unpack-teacher.ts` has no `.limit()` — fine at Whale Class (20 children) scale, will need a Postgres RPC at 200+ child schools.
- Pre-existing 401 on `/api/montree/auth/me` — `recoverSession()` in `lib/montree/auth.ts:94` expects teacher session shape. Principals 401 silently. Not a regression. Worth eventually fixing but not blocking.
- `montree_media.confirmed_by` is best-effort — not all rows have it populated. Photo-attribution by classroom-as-proxy is the workaround in `unpack_teacher`. Acceptable.
- A teacher who inherits a stagnant classroom could trigger `'concerning'` from children stalled before her arrival. Real edge case, unfixable without a `teacher_assigned_at` column.

---

## Production verification checklist (next session)

After Railway has fully redeployed `e4c59894`:

1. Hard refresh `/montree/admin` (Cmd+Shift+R)
2. Confirm empty state: gold T avatar + "Hi [Name]." + "How can I help you?"
3. Try **"How is Austin doing?"** → expect Tracy to call `child_focus` once, return grounded prose about Austin
4. Try **"Tell me about Austin's English progress"** → expect prose specifically about Austin's language area
5. Try **"What should I tell Emily's mum about her math?"** → expect parent-ready paragraph
6. Try **"How is Frodo doing?"** (a name that doesn't exist in your school) → expect honest "I couldn't find a child by that name" response, NOT a system error
7. Try **"How is Susan doing?"** (substituting a real teacher's name) → expect Tracy to call `unpack_teacher`, return chief-of-staff assessment with closing action
8. Verify the closing "I'd …" line renders distinctly with the warm gold dash treatment
9. Open the super-admin questions log at `/montree/super-admin/principal-questions` and verify rows are appearing (this requires migration 184 to be run first — if not, log is empty)

---

## Architectural state at end of session

```
Tracy (lib/montree/tracy/)
├── system-prompt.ts          [STABLE — 5 audit cycles done]
├── tool-definitions.ts       [STABLE — 6 tools, 2 framework + 4 primitives]
├── tool-executor.ts          [STABLE — school-scoping contract preserved]
├── index.ts                  [STABLE — barrel]
└── frameworks/
    ├── child-focus.ts        [NEW — canonical child-question answer surface]
    ├── unpack-teacher.ts     [STABLE — chief-of-staff teacher analysis]
    └── note-quality.ts       [STABLE — Haiku-scored note substance]

Route (/api/montree/admin/principal-agent/route.ts)
└── Imports Tracy module. SSE/auth/streaming/cost-model from Session 84.

Frontend (/app/montree/admin/page.tsx)
└── Friendly mockup ported. Gold T avatar (CSS placeholder).
    Closing action line parsed and styled distinctly.

Logging
└── montree_principal_agent_log (migration 184 — STILL PENDING).
    Until run, principal questions silently fail to log.

Cost
└── ~$0.028 per Tracy question on the canonical path.
    ~$15-25/month per active principal at 20-30 questions/day.
```

---

## How to pick up next session

1. **Verify production works** — run the 9-step verification checklist above. If anything trips, send screenshot.
2. **Pick the next polish item** — voice input is the biggest UX win, family data model is the biggest capability unlock. Either is a half-day. Tredoux to choose based on what he wants to feel next.
3. **If avatar export is ready**, drop the PNG into `/public/tracy-avatar.png` and swap `TracyAvatar` to `<img>`. Five-minute change. Want this before any user demos.
4. **Run migration 184** in Supabase before any real principal usage — the questions log is the entire feedback loop for what to build next, and it's currently dark.

---

🤖 Generated with Claude Code
