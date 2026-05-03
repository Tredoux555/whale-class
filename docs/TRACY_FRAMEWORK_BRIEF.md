# Tracy Framework Brief

**Status:** THEORIZE FIRST. Do not write code in the next session that picks this up. The first session is research + plan only. Build comes after.

**Method:** Use the 3×3×3×3×3 cycle (Session 58 / Session 82 canonical method):
1. **3× RESEARCH** — audit existing patterns, count data, classify
2. **3× PLAN** — design architecture, write plan doc, assess risks
3. **3× INVESTIGATE** — deep-read every target file, verify the plan fits, map exact line numbers
4. **3× BUILD** — implement with audit cycles between rounds
5. **3× AUDIT** — fix cycle until 3 consecutive clean audits

**Don't enter Phase 4 (BUILD) until Phases 1–3 are complete and have been written down.**

---

## What Tracy is

**Tracy is the principal's chief-of-staff AI.** Distinct from Guru.

| | Guru | Tracy |
|---|---|---|
| **Who it serves** | Teachers, parents, principals (per-child) | Principal only |
| **Mental model** | Maria Montessori in your pocket — about ONE child | Trusted deputy who knows the WHOLE building |
| **Data scope** | One child's profile + photos + notes + curriculum | Every child, every teacher, every note, every observation, every parent signal — and can CALL Guru when child-pedagogical depth is needed |
| **Voice** | Pedagogical, warm, observant | Operational, warm, decisive — chief-of-staff |
| **Push or pull?** | Mostly pull (teacher asks, Guru answers) | **Pull only.** Never pushes. Never delivers new problems the principal didn't ask about. |
| **Output ends with** | Insight | An action she can take |

**Critical: Tracy can call Guru as a tool.** When a question requires child-pedagogical depth (e.g., "Emily's mom is asking about her math"), Tracy invokes Guru as one of its tools. The principal never sees Guru directly through Tracy's surface — she sees Tracy's synthesised answer in her chief-of-staff's voice.

---

## What the principal actually wants from Tracy

Captured from the May 3 conversation between user and agent. The principal:

- **Doesn't want a daily briefing.** Has enough to deal with outside Montree. The last thing she wants is Montree adding new problems to her plate every Monday.
- **Doesn't care about individual children at the pedagogical level.** That's the teacher's job, not hers.
- **Cares about the business.** Parent retention. Teacher accountability. School reputation. Money.
- **Wants competence on demand.** When a parent stops her, when she has a quiet five minutes, when she's worried about a teacher — she opens Tracy and asks. The answer needs to be the answer a thoughtful chief-of-staff would give.
- **Categories of questions she actually asks:**
  - **Teachers (her core job):** *"How is Susan doing in the classroom?"* — vague on purpose. Tracy unpacks: activity, coverage, quality, pattern, verdict.
  - **Parent-trigger child synthesis:** *"Emily's mom is asking about her math — what do I say?"* — Tracy pulls the child's data, the relevant teacher note, stitches an honest, defensible, parent-ready answer.
  - **Parent relationships:** *"What's the latest with Emma's family?"* — Tracy reports on engagement, last touchpoint, retention risk.
  - **Business state:** rare, but *"is everything OK in the school right now?"* — Tracy answers honestly and ends with what she should DO if anything.

---

## What the home page is

A clean surface. Her name, the date, an input box. *"Ask anything."* That's it.

No briefing. No celebrate list. No quiet signal. No proactive content of any kind. The entire product value lives in what happens when she ASKS.

---

## Phase 1 — RESEARCH (3 rounds, before any plan)

### Round 1: existing capability audit
- Read `app/api/montree/admin/principal-agent/route.ts` — current 5 tools, current Sonnet pattern, current logging.
- Read `lib/montree/admin/guru-tools.ts` + `guru-executor.ts` + `guru-prompt.ts` — the 12-tool Principal Admin Guru that already exists. Map what overlaps with what Tracy will need.
- Read `lib/montree/guru/conversational-prompt.ts` + `guru/brain.ts` + `guru/tool-definitions.ts` — Teacher Guru. Understand its tool surface and how it could be wrapped as a sub-tool by Tracy.
- Read `app/montree/admin/page.tsx` — current agent home page, the surface Tracy will live on.

Output: a section in the plan doc that lists what we already have, what we'll reuse, what we'll wrap.

### Round 2: data audit
For each question category Tracy needs to answer, audit the data:

- **Teacher questions:** Do we have `last_login_at` on `montree_teachers`? `confirmed_by` on `montree_media`? `teacher_id` on `montree_work_sessions`? What's the quality of teacher notes — do they have substance or are they "good day" boilerplate? (Pull a sample.)
- **Parent questions:** Do we track when a parent opens a report? When they last logged in? Do we have any "parent signal" data at all, or is it all child-side? **This is likely the biggest gap.** Document exactly what's missing.
- **Cross-classroom questions:** Can we query "which children haven't been observed this week across the entire school"? Performance — does this scale to 200-child schools?

Output: a section in the plan doc titled "Data Gaps" listing every missing piece, ordered by how often it's needed for Tracy's question categories.

### Round 3: prompt + voice audit
Read three places where Sonnet is currently asked to be in a specific voice for a specific user role:
- `app/api/montree/admin/parent-question/route.ts` — principal-as-parent-translator
- `app/api/montree/admin/child-briefing/[childId]/route.ts` — chief-of-staff briefing
- `app/api/montree/admin/principal-agent/route.ts` — current ask-anything system prompt

Map: what works in each prompt? What doesn't translate to Tracy? What new rules does Tracy need (chief-of-staff voice, never push problems, always end with action)?

Output: a draft system prompt for Tracy at the bottom of the plan doc.

---

## Phase 2 — PLAN (3 rounds, after research is done)

Write `docs/TRACY_FRAMEWORK_PLAN.md` (a separate doc — this brief is just the scoping). Sections:

### 1. Tool surface
List every tool Tracy needs. For each tool: name, description, input schema, output shape, which existing thing it wraps (if any), risk notes. Aim for 8–12 tools, no more. Each tool should answer a question category, not a granular data fetch.

Likely tools (to be validated in research):
- `get_teacher_summary(teacher_id)` — activity + coverage + quality + pattern + verdict
- `list_teachers_overview()` — all teachers, lightly summarised
- `get_classroom_state(classroom_id)` — pulse of one classroom
- `find_children_by_name(query)` — already exists
- `get_child_state(child_id)` — wraps existing child-briefing, but lighter (Tracy's version)
- `ask_guru_about_child(child_id, question)` — wraps Guru as a sub-tool. **Critical and new.** Returns Guru's answer pre-digested.
- `get_parent_state(parent_id)` — only buildable after parent data model is added
- `find_parent_by_child(child_id)` — same caveat
- `school_pulse()` — answers "is everything OK right now"

### 2. Data model additions
Document the parent-as-first-class-entity addition. Schema. Migration outline. Backfill plan if needed.

### 3. System prompt
Final Tracy prompt. Includes the chief-of-staff voice, the no-push rule, the always-end-with-action rule, the honesty rules from Sonnet routes already shipped.

### 4. Home page UX
Spec the empty state. Spec what conversation history persistence looks like. Spec the input affordance and CTAs.

### 5. Logging
Tracy uses the existing `montree_principal_agent_log` table. Document any new fields (e.g., did Tracy invoke Guru as a sub-tool? log it).

### 6. Trust + correction model
When Tracy is wrong, how does the principal say so? Does Tracy learn from corrections (like Guru's brain)? Or is each conversation isolated?

### 7. Cost ceiling
Estimate per-question cost. Tool-use loop. Sub-tool calls (Tracy → Guru is two AI calls). Cache strategy. Realistic monthly cost per principal.

### 8. Risks + open questions
What might break? What's underspecified? What requires Chen's input before we can finalize?

---

## Phase 3 — INVESTIGATE (3 rounds, after plan is written)

Deep-read every file the plan touches. Map exact line numbers. Verify the plan fits. Find anything the plan missed. This is the safety net before writing any code.

---

## Phase 4 — BUILD (3 rounds, only after Investigate is clean)

Don't enter this phase from the same session that did the Plan. Open a new context. The Build phase will produce code and audit cycles.

---

## Phase 5 — AUDIT (3 rounds, after build)

Fresh-eye audit pattern (Session 82 canonical). Don't ship until 3 consecutive clean audits.

---

## What NOT to do in the next session

- Don't write any new API routes
- Don't write any new database migrations
- Don't change `principal-agent/route.ts` even if it's tempting
- Don't pick a "Tracy avatar" or design polish — these come last
- Don't overengineer the parent data model speculatively. Talk to Chen first if possible to learn which parent signals she actually wants Tracy to track.

## What SUCCESS for the next session looks like

A `docs/TRACY_FRAMEWORK_PLAN.md` document, somewhere between 800 and 2,000 words, with all 8 plan sections filled in, and a "Ready to Investigate" checklist at the bottom. Three audit passes on the plan doc itself (yes, you can audit a doc — fresh-eye agent reads it and looks for holes).

---

## Decisions already made (don't re-debate)

- The AI is named **Tracy.**
- Tracy is **distinct from Guru** — different surface, different voice, different scope.
- Tracy can **call Guru as a sub-tool.**
- The home page has **no proactive content.**
- The home page lives at `/montree/admin` (current agent surface — Tracy replaces the current principal-agent prompt + tools, doesn't replace the route).
- Logging continues to land in `montree_principal_agent_log` (migration 184).
- Whatever rebrand happens to the existing `/montree/admin/guru` sidebar item ("Ask Guru" — the Principal Admin Guru) is a separate question from Tracy. Either rename it Tracy too, or keep it as the principal's per-child Guru wrapper. Decide in the plan, don't decide now.
