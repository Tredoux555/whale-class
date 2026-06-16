# Montree Home Companion — architecture plan

**Date:** 2026-06-16 · **Status:** DESIGN (pre-build). Carte-blanche design grounded in the
two deep-dive maps of the existing Montree code.

## 1. The vision (Tredoux's words, distilled)
A **new AI helper** — a *blend of Guru (Montessori pedagogy) and Coach (warm, knows-you,
anti-overwhelm)* — for **home use with one child, or two siblings treated as individuals,
never as a class.** The child develops **work by work, step by step**, and the **no-experience
parent is hand-held every single step** as if they were a trained Montessori guide. Entry point:
a **single photo of what the child is interested in**, and the helper takes them from there.
*"This is maybe the most important thing."*

## 2. What it is NOT
- Not Guru (Guru is a classroom manager — many children, teacher-facing, whole-class tools).
- Not a dashboard the parent has to interpret. The parent should never face a menu of options.
- Not a curriculum dump. One next step at a time, always.

## 3. The helper's identity (the blend)
- **Guru DNA:** Montessori expertise; the skill graph (prerequisites → next work, mastery
  indicators, age ranges); how to present each work; observation literacy; "follow the child."
- **Coach DNA:** warmth + memory ("I know your child *and* you"); anti-overwhelm (THE one next
  thing, never a menu — Essentialism / The ONE Thing); encouragement; a therapist's ear for the
  parent's anxiety ("she won't sit still, I feel like I'm failing" → reassure, reframe, one tiny step).
- **The fusion:** an expert who never overwhelms, always gives the single next concrete move, reads
  the child through the parent's eyes, and carries the parent's fear of "doing it wrong."

Name: **Ivy** (Tredoux's choice, 2026-06-16). Stored as `COMPANION_NAME` — rename is one line.

> **CONVERGED VISION (updated 2026-06-16, Tredoux):** Ivy is not just a home educator — she is the
> family's ONE companion, wearing three hats: (1) **life coach for the parent** (plan their life +
> wellbeing — the Coach pattern for parents); (2) **Montessori educator for the child** (the photo →
> step-by-step loop below); (3) **family manager** (children's routines, the parent's calendar, kids'
> wellbeing). And she is **transparently wired to Guru** — she can see the child's school side
> (progress, teacher observations) so home + school are one honest picture. The parent has ONE
> relationship; it quietly talks to the school. (The §10 "future 360° Coach" is now the active spine.)

## 4. The core loop — THE STEP (get this exactly right)
Each child is on a **journey of one work at a time**. The atomic unit is a **Step**:

1. **Choose the next step** — engine = skill graph + the child's progress + profile + the latest
   photo-interest signal → exactly ONE work.
2. **Present it, hand-held** — the helper gives the parent a guided **Step Card**:
   - *Why this, now* (plain-parent language — the developmental purpose)
   - *What you need* (household items wherever possible)
   - *Set it up* (the prepared environment, simply)
   - *Show it* (the presentation — slow, few words; what to do with your hands)
   - *Say / don't say* (Montessori restraint: don't quiz, don't correct, let them repeat)
   - *What "yes" looks like* and *what "not yet" looks like* (so the parent can read the child)
3. **Parent does it, reports back** — a photo and/or one sentence ("she loved it" / "she wandered off").
4. **Helper observes + responds** — celebrates; reads the signal (mastered / practicing / not ready);
   records progress + an observation; reassures the parent.
5. **Reveal the next single step** — re-present, go deeper, or advance. Loop.

**Invariant: never more than one live step at a time.** The parent always knows exactly the next
thing and nothing more. (Anti-overwhelm = Coach; follow-the-child sequencing = Guru.)

## 5. Photo-first entry
Onboarding = *"Snap a photo of what [child] is into right now."* A **vision intake reads INTEREST**
(not "which curriculum work is this") → infers an area / sensitive-period signal → the helper warmly
names what it sees → seeds the **first Step**. From one photo, the journey begins.
*(Distinct from the existing two-pass pipeline, which identifies a known curriculum work.)*

## 6. Architecture — reuse first
**Reuse as-is:**
- Account/container: existing **homeschool model** (`plan_type='homeschool'`, "My Home" classroom,
  `role='homeschool_parent'`, migration 126). Each child = `montree_children`. Two siblings = two
  children, two journeys, a toggle. No class abstractions surfaced.
- Per-child state: `montree_child_progress` (work statuses), `montree_children.settings` JSONB
  (profile, journey, developmental_insights), `montree_behavioral_observations`.
- Sequencer: **`lib/montree/skill-graph.ts`** (prerequisites/successors/mastery/age) — the engine
  for "step by step, work by work."
- Action tools: Guru's `executeTool` (`set_focus_work`, `update_progress`, `save_observation`).
- Presentation source: curriculum `guide_content` / `parent_description` / `why_it_matters` /
  `direct_aims` per work; home-practice-card infra is adjacent.
- Brain pattern: the **Coach** (`lib/story/coach/*`) — system prompt + per-subject memory +
  consolidation + SSE — is the proven template for this helper's brain.

**Build new:**
- `lib/montree/companion/` — the helper's brain: system prompt (the blend), tool set, SSE route.
- **Next-step engine** — given progress + skill graph + profile → THE one next work + reasoning.
- **Guided presentation generator** — turns a work into the parent Step Card (§4.2).
- **Vision interest-intake** — single photo → interest signal → first Step.
- Per-child **companion memory** — start in `settings.companion` JSONB (promote to a table later);
  mirror of `story_coach_memory`, scoped per child.
- **Journey state** in `settings.journey` — `{ current_step, history[], stage }`. No migration to start.
- **UI** — a guided-journey surface (the Step Card is the centerpiece) under `/montree/home`,
  reusing `PortalChat` for the conversational layer + a new `StepCard`.

## 7. Two siblings, treated as individuals
The home "classroom" is just a container. The UX is **per-child journeys** with a simple toggle —
no class overview, no grouping, no aggregation. Each child has their own Step, shelf, memory,
observations. The helper is always invoked for ONE child.

## 8. Build phases
- **Phase 1 — the heart:** companion brain + next-step engine + guided-presentation generator +
  per-child SSE chat/step route. (The most important thing.)
- **Phase 2:** photo-interest vision intake + photo-first onboarding.
- **Phase 3:** the guided-journey UI (the Step Card loop).
- **Phase 4:** per-child companion memory + a weekly "how [child] is growing" (strengths + where to
  support, parent-friendly).
- **Phase 5:** two-sibling toggle, voice, gentle "ready for the next step?" reminders.

## 9. Decisions (locked — carte blanche)
- **A. Name (working): "Sprout."** Most on-brand with Montree (the logo *is* a sprout); warm and
  parent-friendly; reads as the gentle hand that helps the child grow. Stored as a single constant
  (`COMPANION_NAME`) so a rename is one line. Alternatives if Tredoux prefers: Ivy, Willow, Rowan.
- **B. Age scope: start 3–6** (where the curriculum + skill graph already live). Toddler 0–3 is a
  later track (needs its own curriculum + developmental framework — separate effort). `montree_children`
  already stores age/dob to gate this.
- **C. Build now.** Phase 1 starts immediately.

## 10. FUTURE (the next step after Home) — Premium: the 360° Coach
*Noted per Tredoux, 2026-06-16. Build the Home program first; this comes next.*

Bundle the **Coach** (the Sanctuary's warm life-coach brain) into a **premium Montree tier, for
parents** — but pointed at the **student**, not the parent. The Coach keeps a continuous eye on the
child by fusing **two streams**:
- **School:** what the teacher feeds in via Guru — progress, observations, photos, weekly wraps.
- **Home:** what the Home Companion (this build) captures — steps done, interests, struggles, wins.

→ one **comprehensive 360° developmental outlook** on the child: strengths, where they need support,
emerging sensitive periods, continuity between school and home. It supports the parent the way the
Sanctuary Coach supports Tredoux, and can surface what matters back to the teacher.

Why it's the natural next step: it requires BOTH the school Guru data (exists) AND the home stream
(this build creates it). The Coach brain pattern + per-subject memory already exist (`lib/story/coach/*`).
The home program is the missing half; once it's feeding data, the 360° Coach becomes possible.
