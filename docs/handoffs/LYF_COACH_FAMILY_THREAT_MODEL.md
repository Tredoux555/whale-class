# Lyf Coach — Family Model — Threat Model & Build Record

*Built Jun 21, 2026. The architecture + safety record for the family model. The
canonical plan is `LYF_COACH_FAMILY_MODEL_PLAN.md`; this is the seal threat model,
what shipped, and the regulatory gate. Sensitive family specifics stay in
conversation, never in this file.*

---

## The one load-bearing principle

**A person's coach conversation is sealed by architecture — never readable by a
parent, a partner, the family captain, the Family Brain, or the operator.** This
holds for the child AND for the adult partner. Confidentiality is the *engine*,
not a feature: the moment anyone can read the room, the room is dead.

Everything below exists to let a family be *held* without anyone being
*surveilled*. The test is architectural, not felt: there must be **no code path**
from one person to a word another person said to their coach.

---

## The two channels (and the wall between them)

There are exactly two ways context moves, and neither is a read path into a
sealed conversation.

### 1. Captain → loved-one context (write-only)
- A family captain (a parent) writes observations + "skills to gently build" INTO
  a loved one's coach. Stored in **`story_coach_context_notes`** (encrypted).
- Permission graph: **`story_coach_context_links`** (`author_space → target_space`,
  `link_kind` = `to_child` | `to_partner`).
- The captain reads back **only the notes they authored**
  (`listContextNotesForAuthor` filters `author_space = caller`). There is no
  endpoint that returns a target's diary, coach memory, or coach log to a captain.
- **Child vs partner — the only behavioural difference** (in the prompt, not the
  data): a **child's** coach uses the notes as quiet background (the child-
  therapist model — never quoted back, never "your dad told me"). A **partner's**
  (adult) coach is **transparent** — it may acknowledge a loved one shared
  something, works in service of *her*, and never as covert correction, never
  taking the captain's side, never overriding her autonomy.

### 2. Individual coaches → Family Brain → pattern interruption
- Each coach may emit an **abstracted, consented signal** — a structured
  `{signal_type, intensity, domain}` flag in **`story_coach_family_signals`**.
  **No free text. No words. No detail.** It is NOT derived from the sealed room by
  the operator: the coach emits it as a deliberate act, and **a child's signal is
  refused unless `consented = true`** (the child's coach asked and the child said
  yes). Enforced in `emitFamilySignal` AND the tool executor.
- The **Family Brain** (`runFamilyBrain`) reads ONLY: those structured signals +
  the captain's OWN context notes (parent-authored, not anyone's room). It detects
  converging family patterns and writes **abstracted tonal nudges**
  (`story_coach_family_nudges`) to each member's coach — a reframe of *how to coach
  the recipient* ("lead with extra warmth about household load this week"), which
  **never names or describes another member** (validated by `nudgeLeaks`, rejected
  if it does).
- A parent may query the brain ("what are you seeing in our family?") → a
  **family-level observation, never attributed** to a person; archived encrypted
  in `story_coach_family_brain_log`.

### The wall
`story_coach_log`, `story_diary_entries`, `story_coach_memory`, `story_plan_*`
(the sealed rooms) are **never read** by any family/family-brain function.
`lib/story/coach/family.ts` and `family-brain.ts` touch only the context-link,
context-note, signal, nudge, and brain-log tables. Do not add a helper there that
reads a sealed table on someone else's behalf.

---

## How a child's struggle reaches the family — WITHOUT surveillance

Worked example (Riddick says "mum is piling things on and it makes me cry"):
1. His coach (his ally) holds it IN the room — validates, helps him cope, and (if
   it would help) helps *him* find words to tell a trusted adult himself. Sealed.
2. His words **never leave**. The operator never derives "withdrawn" from his
   conversation and routes it out. That silent path is the seal-break we
   deliberately did NOT build.
3. The family layer learns about the child's state only from: (a) what a **parent
   observed** and shared (the captain channel), or (b) a **wordless flag the child
   consented to send** ("want me to tell the family helper things feel heavy,
   without saying what?" → only on his yes).
4. The Family Brain nudges the **adults** (who hold the levers) toward a gentler
   household rhythm — framed as shared care, never "your son is upset with you".

Nobody surveilled; everyone held — **by architecture**, not by feel.

---

## Access ladder (designed; age-gate logic to be enforced as the public product lands)
- **Child (< 16):** individual coach only. **No Family Brain access** — no query,
  no read. (Their coach may receive a quiet tonal nudge; the child never sees it
  or the brain.) Enforced now: the brain query route is `role === 'parent'` only.
- **Parent:** individual coach + Family Brain query.
- **At 16:** child gains read access to *their own* Family Brain observations.
  (`birthdate` column added in migration 267; the 16-gate UI is future work.)
- **At 18:** full profile ownership transfers to the individual — everything the
  system held becomes theirs. (Future build; flagged here so it isn't forgotten.)

---

## What shipped (Jun 21, 2026)
- **Migrations (pending Tredoux's Supabase run, in order):**
  - `266_coach_family_context.sql` — `role` on `story_admin_users`;
    `story_coach_context_links` (+ `link_kind`); `story_coach_context_notes`.
    Seeds Tredoux's family: tredoux+bayan = parent, riddick = child; links
    tredoux→riddick (to_child), bayan→riddick (to_child), tredoux→bayan (to_partner).
  - `267_coach_family_brain.sql` — `story_coach_family_signals`,
    `story_coach_family_nudges`, `story_coach_family_brain_log`; `birthdate` on
    `story_admin_users`.
  - Both additive + idempotent + RLS-forced (service-role only). Until run, every
    new surface degrades gracefully (tolerant of the missing schema).
- **Code:** `lib/story/coach/family.ts` (context channel), `family-brain.ts`
  (signals/detect/nudge/query), child coach persona + `child-safeguarding.md` +
  `child_safeguarding` knowledge topic, `emit_family_signal` tool (consent-gated)
  + `CHILD_COACH_TOOLS`, coach-route audience branching + parent-context + nudge
  injection + Family Brain refresh, day/time fix (caller timezone end-to-end),
  Family panel (`/story/admin/family`) + parent Family-Brain query, nav gate.

---

## 🚨 The regulatory + safety gate (PUBLIC App Store product only)
The **private family version (Tredoux's own kids) is lower stakes and can move
fast.** A **public** child-facing, mental-health-adjacent product where a child
might disclose suicidal ideation must NOT ship naively. Before the App Store
version ships:
1. **COPPA / GDPR-K / UK Age-Appropriate Design Code** review + **verifiable
   parental consent** at child-account creation.
2. **Apple's rules for apps directed at children / the Kids Category.**
3. **A child-psychologist review** of the safeguarding design + the child persona.
4. **A legal review.**
5. Keep the covert "Messages" door OUT of any App-Store build (Apple 2.3.1).

These are a gate, not a code task. The seal architecture above is the precondition
that makes the rest defensible.

---

## Invariants for future agents (do not break)
1. No family/family-brain function reads `story_coach_log` / `story_diary_entries`
   / `story_coach_memory` / `story_plan_*`. Ever.
2. A child signal requires `consented = true`. Never mine a child silently.
3. A safeguarding disclosure (self-harm/abuse) NEVER becomes a family signal and
   NEVER escalates to a parent/operator — it stays in the room; the coach steers
   the child toward a trusted adult themselves.
4. Family Brain nudges are abstracted and validated to contain no other member's
   identifier (`nudgeLeaks`). Signals carry no free text.
5. The parent query returns family-LEVEL observations only — never attributed.
6. Children never access the Family Brain (query route is parent-only).
7. The captain's read path is their OWN context notes only.

## Independent audit (Jun 21, 2026) — 8/8 PASS, 2 sub-seal resilience notes
A read-only adversarial audit (8 attack classes: cross-space reads, identity
spoofing, child-consent bypass, nudge identity-leak, child→brain access, brain
reading sealed tables, safeguarding leak, SQL-injection) found **no seal break**.
Two non-confidentiality notes to revisit, NOT blockers:
- **N1 — `getFamilyRole` fails open to 'adult'** on a transient DB error. A real
  child could, during a blip, get the adult coach (losing the child persona +
  safeguarding framing) — but still scoped to their own space (no seal breach),
  and the brain/context endpoints still 403 ('adult' ≠ 'parent'). Self-heals next
  turn. Consider a retry or a conservative path if child-protection resilience
  matters more later.
- **N2 — cross-family mixing relies on `family_key` correctness**, not an authz
  check. Impossible in the single-family seed; signals/nudges are content-free
  abstractions so even a mis-join leaks no words. Add a real families table +
  membership authz before multi-family / App Store.
