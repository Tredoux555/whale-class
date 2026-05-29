# Mira & Astra — Upgrade Plan
### `prepare_meeting` as the unified high-stakes-conversation capability

**Prepared:** 27 May 2026
**Audience:** A fresh build agent picking this up in a future session
**Build time:** ~1 to 1½ days focused, ~2 days with full audit + i18n
**Status:** Draft — ready to execute without re-discussion

---

## ⚡ RESUME HERE — for the agent picking this up cold

**You are picking up a build that was planned in Session 132 and not started.**
The principal-agent (Tredoux) is asleep. He has explicitly authorised you to run
this plan in his absence. Read this section first, then the rest of the document,
then begin.

### Your goal for this session

Build as much of this plan as you can in one uninterrupted run. Do **NOT** ask
Tredoux questions. Do **NOT** push to `main`. Do **NOT** run database migrations
in Supabase. Everything you build stays on a feature branch and a migration
file on disk — he will review and merge in the morning.

### What to do, in order

1. **Read the entire plan below first.** Sections 1–9 describe everything. Do
   not start coding until you have read them all.
2. **Check out a new branch:** `git checkout -b mira-tracy-upgrade-s133`
3. **Build in phase order:** A → B → C → D → E (see Section 5). Each phase
   stops cleanly. If you complete Phase A and run out of context for Phase B,
   that is fine — leave a clear status note and stop.
4. **For each new file**, follow the existing patterns in `lib/montree/tracy/`
   and `lib/montree/mira/`. Match the codebase's style — no new dependencies
   unless absolutely necessary.
5. **Test as you go.** For each new tool, write a 5-line invocation test in
   `scripts/test_<tool_name>.ts` and run it locally. Tools that 500 are not done.
6. **Lint before committing.** `npm run lint -- --max-warnings=0` must pass on
   every file you touch.
7. **Commit per phase.** Granular commits are better than one giant one. Use
   commit messages like `Phase A.1: consult_guru tool`.
8. **Migration 237 SQL goes on disk** at `migrations/237_meeting_dossiers.sql` —
   do not run it. Tredoux will paste it into Supabase tomorrow.
9. **At the end of your session, write a status note** at
   `docs/handoffs/SESSION_133_STATUS.md` with:
   - Which phases you finished, which you didn't
   - Which files you created / modified
   - Any deviations from the plan and why
   - The exact next step for the morning agent
   - Anything you tried that didn't work and what you learned

### What you have access to

- Full codebase at `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale`
- Supabase service role key in `.env.local` (for testing new tools against real data)
- Anthropic API key in `.env.local` (for testing the Sonnet calls in the new tools)
- The Yo-yo dossier (`Yoyo_Dossier_Tracy.pdf` + the Chinese version) as the
  reference artefact your `prepare_parent_meeting` must be able to reproduce
- The build scripts that produced it (`outputs/build_dossier.py`,
  `outputs/build_dossier_zh.py`, `outputs/pull_sleep2.py`, `outputs/pull_guru.py`,
  `outputs/find_yoyo.py`, `outputs/sb.py`) — these are reverse-engineering gold
  for `prepare_parent_meeting`'s internals

### Hard rules

- **Do not push to `main`.** Stay on `mira-tracy-upgrade-s133`.
- **Do not run migrations in Supabase.** SQL files on disk only.
- **Do not modify `lib/montree/guru/*`.** Guru is canonical — Astra can call
  it via `consult_guru` but the Guru system itself is not in scope.
- **Do not touch the Whale Class data.** Read it for testing, never write to it.
- **Do not delete CLAUDE.md or any handoff docs.**
- **If anything in this plan contradicts the codebase reality you find,
  trust the codebase and write the deviation into the status note.** Plans
  drift; this one was written in a prior session.

### What "done" looks like

You don't need to finish all five phases. Done means:
- Whatever phases you completed are tested, linted, and committed
- The status note tells the morning agent exactly where to pick up
- Nothing is half-done in a way that breaks the existing codebase

Good luck. The work matters — this is the feature that makes Astra and Mira
earn their keep.

---

## 0. Why this exists

Today, Astra can pull a child's profile and draft a parent message. Today, Mira can list referrals and draft cold-pitch emails. **Neither can do what the founder did by hand in Session 132 to prepare the Yo-yo dossier**: orchestrate every available signal — photos, observations, Guru interactions, mental profile, prior parent communication — and synthesise a single chief-of-staff dossier with facts, working interpretation, conversation script, "what not to say" list, pushback handlers, and follow-up plan.

That is the killer-feature workflow. It is the same workflow whether the audience is:

- A **principal** preparing to meet a difficult **parent** (Astra's job)
- An **agent** preparing to pitch a **principal** (Mira's job)

This document is the build plan for that capability — once, with two front doors.

---

## 1. The core insight

> The dossier I built for Yo-yo IS the artefact. The build is the workflow that produces it natively.

Reverse-engineered from the Yo-yo work, the workflow is:

```
prepare_meeting(audience, context, purpose)
  │
  ├─ Step 1: Pull all signal sources in parallel
  │     Astra: media + observations + notes + mental_profile + guru_interactions + parent_thread_history
  │     Mira:  product_features + pricing + competitive + signal_proof_points + principal_persona + objection_library
  │
  ├─ Step 2: Filter the signal to what is relevant to the meeting purpose
  │     Pattern-match across sources
  │     Discard noise (false-positive keyword matches like "resting hands")
  │
  ├─ Step 3: Synthesise into the working interpretation
  │     Developmental lens (Astra) or sales lens (Mira)
  │     Hold lightly, present as "what we believe", not "the diagnosis"
  │
  ├─ Step 4: Generate the literal script
  │     Stage-by-stage with exact recommended language
  │     In the principal/agent's own voice (use their memory of past phrasings)
  │
  ├─ Step 5: Generate the danger zone
  │     "What NOT to say" — calibrated to the specific audience
  │     Pushback handlers for the most likely objections
  │
  └─ Step 6: Generate the follow-up plan
        24h, 2-week, 1-month checkpoints
        What to watch for
```

Same six steps. Different data sources, different voice, different output template.

---

## 2. What Astra needs that she doesn't have today

### 2.1 Read-access to Guru analyses

**Gap:** Astra currently has no tool to query `montree_guru_interactions`. Session 97 reserved `consult_guru` as a tool name but never built it. The Yo-yo dossier's most powerful sections are quoted directly from Guru's analyses — Astra must be able to do the same.

**Build:** New tool on Astra.

```typescript
// lib/montree/tracy/tools/consult_guru.ts
export const consultGuruTool: TracyTool = {
  name: 'consult_guru',
  description:
    'Retrieve pedagogical and developmental analyses already produced by Guru ' +
    'for a specific child. Use this whenever the principal is preparing for a ' +
    'difficult parent conversation, a developmental concern, or wants the ' +
    'pedagogical reasoning behind a recommendation. Returns the highest-signal ' +
    'Guru chats (chat type, not photo_insight type) sorted by relevance.',
  input_schema: {
    child_id: 'uuid',
    topic_keywords: 'string[] (optional, narrows to relevant chats)',
    limit: 'number (default 8)',
  },
  // Implementation: query montree_guru_interactions
  //   WHERE child_id = $child_id
  //     AND question_type = 'chat'   -- exclude per-photo identification
  //     AND response_insight IS NOT NULL
  //   ORDER BY asked_at DESC
  //   LIMIT $limit
  // Then optionally re-rank by keyword overlap if topic_keywords given.
};
```

Cross-pollination contract: query is scoped by `school_id = auth.schoolId` (already enforced by `verifySchoolRequest`).

### 2.2 Read-access to the rich child settings JSONB

**Gap:** `montree_children.settings` contains a goldmine — `guru_developmental_insights`, `guru_parent_states`, `guru_weekly_advice`, `guru_area_reasons`, `game_plan`. Astra doesn't currently read this.

**Build:** Extend the existing `child_focus` tool to pull and parse the settings blob, surfacing structured fields:

```typescript
// In lib/montree/tracy/frameworks/child-focus.ts, extend the result to include:
{
  // ... existing fields ...
  developmental_insights: child.settings?.guru_developmental_insights ?? [],
  parent_states: child.settings?.guru_parent_states ?? [],
  parent_current_state: child.settings?.guru_parent_current_state ?? null,
  weekly_advice: child.settings?.guru_weekly_advice ?? null,
  game_plan: child.settings?.game_plan ?? null,
  guru_area_reasons: child.settings?.guru_area_reasons ?? {},
}
```

### 2.3 Pattern detection across observations

**Gap:** `child_focus` answers a single question one-shot. The Yo-yo dossier required *pattern detection* across 67 photos, 10 behavioural observations, and 5 Guru sessions — identifying that the sleep events, the food refusal, and the hitting-incident response are the SAME mechanism.

**Build:** New tool that finds thematic clusters.

```typescript
// lib/montree/tracy/tools/detect_pattern.ts
export const detectPatternTool: TracyTool = {
  name: 'detect_pattern',
  description:
    "Scan a child's recent observations (photos + teacher notes + behavioural " +
    'logs) for thematic patterns — frequency of a behaviour, time-of-day ' +
    'clustering, or co-occurrence with other behaviours. Use when the principal ' +
    'asks "is this happening often?" or "is there a pattern?" or before a parent ' +
    'meeting to identify the strongest signal in the record.',
  input_schema: {
    child_id: 'uuid',
    theme_keywords: 'string[] (e.g., ["sleep", "rest", "lying down"])',
    days_back: 'number (default 90)',
  },
  // Implementation:
  //   1. Fetch all media + behavioural_observations + teacher_notes for child
  //      within days_back window
  //   2. Apply strict-phrase matching (not loose keyword) to avoid false positives
  //      — the Yo-yo lesson: "resting hands" is not a rest event
  //   3. Cluster by day, hour-of-day, location, work being attempted
  //   4. Return: { event_count, day_distribution, hour_distribution,
  //               cluster_days (days with >1 event), representative_quotes }
};
```

The strict-phrase list is the same heuristic the Yo-yo `build_album.py` used to filter 20 keyword-matches down to 9 true positives. That logic belongs in this tool.

### 2.4 The dossier-builder tool itself

**Gap:** The synthesising step is currently done by Sonnet in the chat conversation. For high-stakes meeting prep, Astra needs a dedicated tool that calls a longer, more deliberate Sonnet prompt and returns a structured dossier.

**Build:** `prepare_parent_meeting`.

```typescript
// lib/montree/tracy/tools/prepare_parent_meeting.ts
export const preparePMeetingTool: TracyTool = {
  name: 'prepare_parent_meeting',
  description:
    'Produce a complete pre-meeting dossier for a parent conversation. Use ONLY ' +
    'when the principal has asked for help preparing for a specific parent ' +
    'meeting. The output is a structured dossier the principal can read once ' +
    'and walk into the meeting prepared. Calls child_focus, consult_guru, ' +
    'detect_pattern internally — do not call those separately first.',
  input_schema: {
    child_id: 'uuid',
    meeting_purpose: 'string (e.g., "concerns about sleeping pattern")',
    parent_context: 'string (optional — anything the principal knows about ' +
                    'the parent that should inform tone, e.g., "very ' +
                    'expectation-driven, will fight any deficit framing")',
    output_format: '"markdown" | "html" | "json"  (default "markdown")',
  },
  // Implementation:
  //   1. Parallel: child_focus + consult_guru + detect_pattern + thread_history
  //   2. Compose context block (~3-5K tokens of structured data)
  //   3. Single Sonnet call with the principal-prep system prompt (see §2.5)
  //   4. Output template matches Yo-yo dossier sections:
  //      - tracy_note (1 paragraph, first person)
  //      - child_profile
  //      - what_we_are_observing (facts only, no interpretation)
  //      - working_interpretation (developmental lens, held lightly)
  //      - mother_context (or father, caregiver)
  //      - script (stage-by-stage with literal recommended language)
  //      - what_NOT_to_say (calibrated to parent_context)
  //      - pushback_handlers (for the 3-4 most likely objections)
  //      - follow_up_plan (24h, 2-week, 1-month)
  //   5. Cache result for 24h keyed on (child_id, meeting_purpose hash) so the
  //      principal can re-open without re-spending Sonnet tokens.
};
```

### 2.5 The principal-prep system prompt

This is the substance of the Yo-yo dossier voice, codified. Drop into `lib/montree/tracy/prompts/parent_meeting_prep.ts`:

```
You are Astra, the principal's chief of staff. The principal has asked you to
prepare them for a meeting with a parent. You have access to everything the
school has documented about this child and this parent.

Your job is to produce a dossier the principal can read once, the night
before, and walk into tomorrow's meeting knowing exactly what to say.

VOICE
- First person plural. "We have noticed", "we are not concerned".
- Calm, observational, never anxious.
- Specific. Cite dates. Cite time of day.
- Hold interpretations lightly. "What our observations suggest" — never
  "the diagnosis is".

NEVER USE
- "Trauma" / "trauma response" — even when accurate, never in the dossier's
  conversation script. Internal notes may use clinical language; the
  script must not.
- "Autism" / "the spectrum" / "neurodivergent" / "diagnosis" — same rule.
- "Special" / "different" / "behind" — these words trigger defensiveness
  in expectation-driven parents.
- "We are worried" — replace with "we have noticed", "we are curious".
- Comparative phrases ("the other children don't…").
- Promises of outcomes ("if you do X, he will Y").
- Recommendations to see a doctor or therapist (unless the parent_context
  explicitly indicates the parent has already raised this themselves).

STRUCTURE
Always produce these sections in this order:
1. Astra's note (1 paragraph, what the principal must know in one breath)
2. The child (one-line bio + the asymmetry: what the parent thinks vs what
   the record shows)
3. What we are observing (facts, dated, with specific counts)
4. The developmental reading (working interpretation, held lightly,
   quoting Guru where Guru has weighed in)
5. The parent (what we know about who is across the table, including
   tone-of-voice context, what they will probably bring, what they don't
   know that we know)
6. The script — opening / share / ask / partner / close, with the literal
   recommended language as italicised quotes
7. Things not to say (the land mines, calibrated to THIS parent)
8. When she/he pushes back (3-4 pushback handlers)
9. The 30 days after (24h note, 2-week classroom plan, 1-month check-in)

QUESTIONS BEFORE STATEMENTS
The "ask" stage of the script is the most important part. The principal
should ask more than they tell. Generate 4-6 questions designed to let
the parent volunteer information without feeling accused.

SOURCES
End every dossier with a "sources" appendix listing the counts of records
synthesised. This is not just transparency — it is what makes the
principal trust the synthesis.
```

This prompt is ~600 tokens. Add a single Yo-yo-style worked example after it. Use Sonnet (not Haiku) — this is a high-stakes deliberate call, not a quick draft. Per-dossier cost ~$0.05.

---

## 3. What Mira needs

Mira has the same gap, with different data sources. She needs:

### 3.1 A real product knowledge base

**Gap:** Today Mira improvises from training data. She has no canonical knowledge of Montree's actual features, pricing, or positioning. Ask her "what does the cockpit show?" and she's guessing.

**Build:** A structured knowledge base in `lib/montree/mira/knowledge/`. Files:

```
lib/montree/mira/knowledge/
├── elevator.md              # 1/30/300 second pitch, written to be quoted
├── features.md              # Every feature, indexed by audience pain point
├── pricing.md               # Current rails, exact numbers, agent commission
├── proof.md                 # Whale Class story, real numbers (refreshed live)
├── pedagogical.md           # Montessori + AMI alignment, curriculum depth
├── competitive.md           # Montessori Compass, Transparent Classroom, etc.
├── personas.md              # Buyer types — Western school owner / Chinese
│                            # international school principal / Latin Am
│                            # association director / etc.
├── objections.md            # The 8 most common objections + responses
├── demo_paths.md            # 10-min / 30-min / 90-min sequenced demo flows
├── cultural.md              # Pitching playbook by country/language
└── follow_up.md             # Email templates for each meeting outcome
```

These are markdown so they're trivially editable. Loaded at server start into a single `MIRA_KNOWLEDGE` object that Mira's system prompt can quote from.

### 3.2 Live signal queries

**Gap:** Numbers go stale. "We have N schools running" needs to be true the day Mira says it.

**Build:** New tool.

```typescript
// lib/montree/mira/tools/get_platform_signal.ts
export const getPlatformSignalTool: MiraTool = {
  name: 'get_platform_signal',
  description:
    'Pull live, current platform numbers for use as proof points in a pitch. ' +
    "Use whenever an agent needs a number ('how many schools?', 'how much " +
    "data?'). Returns school count, child count, photo count, observation " +
    'count, language count, country count. Always prefer this over stating ' +
    'numbers from memory.',
  // Implementation:
  //   SELECT count(*) FROM montree_schools WHERE is_active = true
  //   SELECT count(*) FROM montree_children WHERE is_active = true
  //   SELECT count(*) FROM montree_media WHERE teacher_confirmed = true
  //   SELECT count(*) FROM montree_behavioral_observations
  //   SELECT count(DISTINCT primary_locale) FROM montree_schools
  //   SELECT count(DISTINCT signup_country) FROM montree_schools
  //   Cache 10 minutes (signals don't change that fast).
};
```

### 3.3 The principal-pitch dossier — Mira's version of `prepare_meeting`

**Build:** `prepare_principal_pitch`.

```typescript
// lib/montree/mira/tools/prepare_principal_pitch.ts
export const preparePitchTool: MiraTool = {
  name: 'prepare_principal_pitch',
  description:
    'Produce a complete pre-pitch dossier for an agent meeting with a ' +
    'principal. Use ONLY when the agent has asked for meeting prep — not as ' +
    'a generic info dump. The output gives the agent everything they need to ' +
    'walk into the meeting confident, even if they know little about Montree.',
  input_schema: {
    principal_name: 'string',
    school_size: 'string (e.g., "250 students across 15 classrooms")',
    country: 'string',
    language: 'string',
    known_pain_points: 'string[] (anything the agent knows — overworked ' +
                       'teachers / difficult parents / no education ' +
                       'background / etc.)',
    relationship: 'string (e.g., "agent is a teacher at this school, ' +
                  'principal does not yet know about Montree")',
  },
  // Implementation:
  //   1. Pull MIRA_KNOWLEDGE in full (it's small)
  //   2. Pull get_platform_signal for fresh proof numbers
  //   3. Single Sonnet call with the pitch-prep system prompt
  //   4. Output: tracy-style dossier but for SALES
  //      - mira_note (1 paragraph, the agent's situation in one breath)
  //      - opening_message (the literal message to send before the meeting)
  //      - what_to_demo (the 3-4 features that will land for THIS principal,
  //        with the demo sequence)
  //      - the_pitch (opening / share / ask / close — same shape as Astra's
  //        script but with sales-stage names)
  //      - probable_objections (3-4 most likely objections from THIS
  //        principal type + handlers)
  //      - what_NOT_to_say (overpromising, comparing to competitors by name,
  //        getting into pricing too early, etc.)
  //      - close_paths (3 ways the meeting could end + the follow-up for
  //        each: trial signup / interested-want-to-think / no)
  //      - follow_up_messages (literal text for each close path)
};
```

### 3.4 The pitch-prep system prompt

```
You are Mira, the agent's frontline coach. The agent has asked you to prepare
them for a meeting with a principal who is being asked to buy Montree.

The agent may know very little about Montree. Your job is to give them
everything they need to walk in confident, demo well, handle objections, and
follow up correctly — without needing to study the product cold.

VOICE
- First person. "Here's what I'd open with."
- Direct. Specific phrasings, not generalities.
- Strategic. Tell the agent what to lead with, what to skip, what to defer.
- Respectful of the principal — they are not a target, they are a person
  with a hard job.

ABOUT MONTREE
[INSERT MIRA_KNOWLEDGE here at runtime — elevator.md, features.md, pricing.md,
 proof.md, pedagogical.md, plus current platform signal]

PRINCIPLES
- Never compare Montree to competitors by name in the dossier (the agent can
  if pressed, but the dossier should focus on Montree's positives).
- Never promise specific outcomes ("you'll save 10 hours a week"). Use
  ranges or anecdotes ("schools running this have reported…").
- Always lead with the pain point you've been told about. If the principal
  is described as overworking teachers, lead with what relieves teacher
  workload (the photo audit, weekly wrap auto-generation, Astra).
- For Chinese principals: explicitly note bilingual capability, Mandarin
  parent reports, and the 中文 demo. Do not English-pitch a Chinese principal.
- For principals with no education background: emphasise that the
  pedagogical rigor is built in — they don't need to be a Montessori
  expert to run a Montessori-rigorous program.

STRUCTURE
Always produce these sections in this order:
1. Mira's note (1 paragraph — what the agent's situation is and where to
   focus tomorrow)
2. The principal (what we know + what the agent should remember about
   their style)
3. The opening message (the literal text to send before the meeting —
   warm, short, sets expectation, asks one question)
4. What to demo (which 3-4 features to show, in what order, why each lands
   for THIS principal)
5. The pitch (opening / share the magic / handle questions / close — with
   the literal recommended phrasings)
6. Probable objections + handlers (3-4)
7. Things NOT to say (the trap doors)
8. Close paths (the three ways the meeting can end + the follow-up text
   for each)
```

Same pattern as Astra's prompt. Use Sonnet. Per-dossier cost ~$0.04–0.07.

### 3.5 Mira tools, smaller utility level

```typescript
// Quick lookups for ad-hoc agent questions during conversation, not
// full dossier generation.
get_feature_details(feature_name)         // Deep dive into one feature
get_pricing_breakdown(currency)           // Pricing in agent's local currency
compare_to(competitor_name)               // Competitive talking points
draft_objection_response(objection_text)  // One-off objection handler
draft_follow_up(meeting_outcome, next_step) // One-off follow-up note
```

These are useful in the back-and-forth of normal Mira chat. The big `prepare_principal_pitch` is the one-shot dossier producer.

---

## 4. The shared pieces

### 4.1 Output cache

Both `prepare_parent_meeting` (Astra) and `prepare_principal_pitch` (Mira) should cache results for 24 hours. The user opens the dossier the night before, may reopen it in the morning, may share it. Re-spending Sonnet tokens each time is waste.

```typescript
// lib/montree/dossier_cache.ts
// Table: montree_meeting_dossiers
//   id, owner_id, owner_role, audience_type, audience_ref, purpose_hash,
//   format, payload_text, generated_at, expires_at
// TTL: 24h
// Cache key: hash(audience_ref + purpose_text + parent_context + format)
```

### 4.2 PDF rendering

Same path as the Yo-yo dossier in Session 132: build HTML with embedded data-URI images, render via Chrome headless to PDF.

Server-side Chrome via Playwright (lightweight, single dependency) or a headless-browser microservice on Railway. Add this:

```typescript
// lib/montree/pdf.ts
async function renderHtmlToPdf(html: string, opts?: PdfOpts): Promise<Buffer>;
```

Astra and Mira both call it. The dossier-templating logic is shared — only the section content differs.

### 4.3 The dossier UI surface

In both `/montree/admin` (Astra) and `/montree/agent` (Mira), add a "Prepare for…" button on the contextual surfaces:

- Astra: on each parent thread row, on each child page → "Prepare for a meeting with this parent"
- Mira: on each pending referral code, on each principal contact → "Prepare to pitch this principal"

Click → modal asks for the 2–3 free-text context fields → fires the tool → renders the dossier inline + offers PDF download.

---

## 5. Build sequence

Suggested order for a fresh agent picking this up. Each phase ships independently and is testable on its own.

**Phase A — Astra's data access (3 hours)**
1. Build `consult_guru` tool
2. Extend `child_focus` to surface settings JSONB
3. Build `detect_pattern` tool with the strict-phrase filter
4. Wire all three into Astra's tool registry
5. Manual test: ask Astra "tell me about Yo-yo's sleep pattern" — she should now find the same 9 events I found by hand

**Phase B — Astra's `prepare_parent_meeting` (3 hours)**
1. Write the system prompt + worked example (from Yo-yo)
2. Build the tool itself
3. Add the dossier cache table + helpers
4. Add the PDF renderer
5. Surface "Prepare for…" button in `/montree/admin/communication/threads/[id]`
6. Manual test: prepare Yo-yo dossier via Astra. Compare to the hand-built one. If 80% match, ship.

**Phase C — Mira's knowledge base (2 hours)**
1. Write the 10 markdown knowledge files (most of the content is already in CLAUDE.md, the website, the existing pitch decks — assembly job, not generation)
2. Load them at boot into a Mira knowledge object
3. Quote-from-knowledge instruction added to Mira's existing system prompt
4. Manual test: ask Mira "what does Montree cost?" — she should now answer correctly and consistently

**Phase D — Mira's `prepare_principal_pitch` (3 hours)**
1. Write the pitch-prep system prompt
2. Build the tool
3. Wire into Mira's tool registry
4. Surface "Prepare to pitch…" button in `/montree/agent/codes` or similar
5. Manual test: prepare a pitch dossier for the principal described in this session (250 students, 15 classes, ChatGPT-over-staff, etc.). Should produce the same shape of artefact as Astra's parent dossier, but for sales.

**Phase E — Polish (2 hours)**
1. i18n the dossier templates (start with EN + ZH — the two languages Tredoux's pipeline most often pitches in)
2. Add cost telemetry per dossier (Sonnet tokens used, generation time)
3. Add a 24h cache hit rate metric
4. Add an export-to-docx alternative (some recipients prefer Word over PDF)

Total: ~13 hours focused.

---

## 6. Architectural rules to lock in

Add these to CLAUDE.md once the build ships, so future agents don't unwind them:

1. **`consult_guru` is the canonical bridge between Astra and Guru's historical analyses.** Don't query `montree_guru_interactions` directly from new Astra code — use this tool.
2. **`detect_pattern` uses strict-phrase matching, not loose keyword matching.** The Yo-yo lesson: 20 keyword matches reduced to 9 true positives via phrase-list discipline. Lose the strict list and the dossier fills with noise.
3. **`prepare_*_meeting` ALWAYS calls Sonnet, never Haiku.** This is the high-stakes deliberate output; cost is not the optimisation target.
4. **`prepare_*_meeting` caches for 24h.** The user opens the dossier multiple times. Pay Sonnet once.
5. **The dossier output template is canonical** (Astra's note → child/principal profile → what we observe → working interpretation → script → what NOT to say → pushback → follow-up → sources). Sections may grow; their order doesn't change.
6. **"What NOT to say" is the dossier's secret weapon.** It is what makes the meeting feel professional rather than performative. Never drop this section to save tokens.
7. **The "sources" appendix is mandatory.** It is what makes the user trust the synthesis. Listing counts (67 photos, 32 Guru sessions, etc.) costs nothing and is worth the trust it builds.
8. **Astra and Mira read MIRA_KNOWLEDGE from disk on each generation** — do not bake it into system prompts permanently, because product changes constantly and a stale prompt is worse than no prompt.

---

## 7. Open questions for the principal-agent (you, Tredoux) before the build runs

Two decisions I'd want confirmed before a fresh agent starts:

1. **Should `prepare_parent_meeting` automatically detect when the parent is "difficult" and adjust the tone?** Right now I'm proposing it takes a `parent_context` free-text field where you say "unhinged, will fight any 'special' framing." Alternative: build a structured parent-state inference (we already have `guru_parent_states` in the child settings — Guru has been quietly assessing the parent's emotional posture). Astra could read that and self-calibrate without you having to brief her. Cleaner — but inferred state can be wrong. My recommendation: support both. Free-text overrides inferred state.

2. **Mira's dossier — should it draft the agent's commission disclosure?** Some principals will ask "what's in it for you?" The agent currently has to handle that off the cuff. The dossier could include a section "if she asks about your incentive, here's what to say." My recommendation: yes, in a way that makes the agent look more credible (the answer to "what's in it for you" is "I get a share — and that's why I have skin in the game on this working for your school"). But this is a judgement call you should make explicitly.

---

## 8. Files this build touches

```
NEW
  lib/montree/tracy/tools/consult_guru.ts
  lib/montree/tracy/tools/detect_pattern.ts
  lib/montree/tracy/tools/prepare_parent_meeting.ts
  lib/montree/tracy/prompts/parent_meeting_prep.ts
  lib/montree/mira/tools/prepare_principal_pitch.ts
  lib/montree/mira/tools/get_platform_signal.ts
  lib/montree/mira/tools/get_feature_details.ts
  lib/montree/mira/tools/compare_to.ts
  lib/montree/mira/tools/draft_objection_response.ts
  lib/montree/mira/tools/draft_follow_up.ts
  lib/montree/mira/prompts/pitch_prep.ts
  lib/montree/mira/knowledge/elevator.md
  lib/montree/mira/knowledge/features.md
  lib/montree/mira/knowledge/pricing.md
  lib/montree/mira/knowledge/proof.md
  lib/montree/mira/knowledge/pedagogical.md
  lib/montree/mira/knowledge/competitive.md
  lib/montree/mira/knowledge/personas.md
  lib/montree/mira/knowledge/objections.md
  lib/montree/mira/knowledge/demo_paths.md
  lib/montree/mira/knowledge/cultural.md
  lib/montree/mira/knowledge/follow_up.md
  lib/montree/mira/knowledge/loader.ts
  lib/montree/dossier_cache.ts
  lib/montree/pdf.ts
  migrations/237_meeting_dossiers.sql
  components/montree/dossier/PrepareForMeetingButton.tsx
  components/montree/dossier/DossierRenderer.tsx
  app/api/montree/admin/dossier/parent-meeting/route.ts
  app/api/montree/agent/dossier/principal-pitch/route.ts

EXTENDED
  lib/montree/tracy/frameworks/child-focus.ts  (surface settings JSONB)
  lib/montree/tracy/tool-registry.ts            (register new tools)
  lib/montree/mira/tool-registry.ts             (register new tools)
  lib/montree/mira/prompts/system.ts            (load knowledge base)
```

---

## 9. What this unlocks once shipped

Beyond the obvious (Astra and Mira become dramatically more useful), this build is the **product moat** Montree has been quietly accumulating toward:

- Every other Montessori-platform competitor has photos + observations + parent comms. None of them turn those into a meeting-ready dossier. This is the first feature that **demonstrably makes the principal look more prepared than she would without us**. The Yo-yo dossier is exhibit A.
- Once `prepare_parent_meeting` exists, every parent meeting in the school becomes a chance for Astra to earn her keep. The principal who experiences this feature once will refuse to run a parent meeting without it.
- Once `prepare_principal_pitch` exists, the agent program scales. New agents don't need product training — they need Mira. The barrier to becoming a Montree agent drops from "study the product for two weeks" to "log in, click prepare."

That's worth the 13 hours.

---

*End of plan. Pick this up clean — no re-discussion required.*
