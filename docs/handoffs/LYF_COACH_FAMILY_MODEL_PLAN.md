# Lyf Coach — Family Model — Build Plan & Brainstorm (QUEUED)

*Queued Jun 20, 2026 (eve) for the next session. Tredoux wants to build the family model on both fronts in one session — the model takes priority. Read this first, then `lib/story/coach/system-prompt.ts` + the `about-<space>.md` files to see the existing multi-space substrate.*

> **Privacy note on this doc:** the concept is motivated by Tredoux's own family. The sensitive specifics stay in conversation, not in a committed file — recording a child's private disclosures in a git repo would betray the exact principle this system exists to protect. This doc holds the architecture and decisions only.

---

## The two products

- **Product A — Lyf Coach (individual).** Exists today. One person, one absolutely-private coach.
- **Product B — Lyf Coach Family.** New. A family (concept: **mum + dad + up to 2 kids**) where each person gets their own private coach, plus a **one-way parent → child's-coach context link.**
- **Tredoux's private family system = Product B, dogfooded on his own family, built FIRST.** It's the priority and the proving ground; the App Store version follows.
- **Open packaging decision:** two App Store listings vs. one app with a "Family" plan/tier. *Recommendation: one app + a Family plan* (less duplication, simpler review, shared codebase). "Two products" can be two marketing faces of one app + tier. Decide at session start.

---

## 🔒 Locked principles (from the Jun 20 conversation — do NOT relitigate)

1. **The child's coach conversation is sealed by architecture** — never readable by the parent or the operator. Absolute. **Even self-harm content never surfaces to a parent.** Confidentiality is the *engine*, not a feature: the instant a child suspects a parent can read the room, the room is dead and the whole system is broken. This is the load-bearing decision.
2. **Parent → child's-coach is a WRITE-ONLY context channel.** The parent feeds in *real-world observations* and *"help him build this skill"* requests. The coach uses them as background. It **never** reflects the child's words back to the parent, and the link is **never** a backdoor to the sealed conversation.
3. **The coach is the child's ally inside the sealed room.** On dark/dangerous disclosures (suicidal thoughts, self-harm, abuse) it does not go quiet *and* does not report upward — it gently helps *the child* carry it toward a safe trusted adult, in the child's own time, within the conversation. Absolute privacy *from the parent* ≠ the coach being inert. The two are not in tension.
4. **Transparency to the child, in kid-language.** "No one can ever read what you say here — not even your dad. He can tell me things he notices to help me help you, but he can never see your words." The *seal being explained* is what earns the trust.
5. **Co-parenting safe.** Context feeds shape the child's **skills** ("how to handle it when a parent does X"), they do **not** narrate the conflict to the child or put the child in the middle, or expose one parent's view of another.

**Real-world template this mirrors:** a good child therapist. Takes a briefing from a parent about what's happening at home; keeps the child's sessions sacred. We're building that in software.

---

## What already exists (the substrate — big head start)

- **The web Coach (`lib/story/coach/`) is ALREADY multi-space.** Same warm protective brain for everyone, but the *person* is driven by `displayName` + a per-space profile brief (`about-<space>.md`). Per-person family coaches already exist. So "each family member has their own private coach" is **done** — the new work is the **link**, the **child-appropriate persona**, the **safeguarding module**, and the **productized family-account model.**
- **E2E crypto already exists** (the Sanctuary/Lyf Coach native layer: device-keyed, Secure Enclave key wrap; web side server-readable-but-obscured). The *seal mechanism* is already built. The family model must **preserve it** and add the one-way channel **without ever creating a read path** into the child's conversation.

---

## Architecture to build

1. **Family graph / linking.** Roles: `parent`, `child`. A parent sets up and controls a child account (minors → parental consent at creation). Family creation + link/invite flow + role assignment.
2. **One-way context channel.** Data model e.g. `coach_context_note { author_space (parent), target_space (child), observation_text, optional skill_tag, created_at }`. The child's coach loads these as **background context** (system-prompt injection or a `read_parent_context` tool). **Strictly parent → child-coach. No read-back. A store separate from the sealed conversation.**
3. **Seal preservation (the threat model).** The context channel and the sealed conversation are *architecturally separate*. Linking grants *write-to-context*, never *read-to-conversation*. Write this threat model down and defend it — it's the whole product.
4. **Child coach persona + prime directive.** NOT the adult productivity/overcommitment brain. Child prime directive = **emotional safety, healthy coping skills, self-worth, age-appropriate problem-solving, naming feelings, gentle dichotomy-of-control.** Grounded in child developmental psychology. Warmer, simpler, age-calibrated voice. New `about`-style framing + a trimmed/age-appropriate knowledge subset.
5. **Safeguarding-in-the-room module** (same shape as the manifestation module just shipped: a `.md` knowledge file + a system-prompt behavior trigger, scoped to child accounts). On self-harm / suicidal / abuse disclosure → respond with care, steer toward a trusted adult, surface age-appropriate resources, **never escalate to the parent.** Likely needs a child-psychologist review before the public version ships.
6. **Parent surface (what the parent CAN see).** ONLY their own submitted context + the ability to add/manage it + maybe "skills I've asked the coach to help with." **Never** anything derived from the child's private data. Minimal by design.

---

## My advice / brainstorm

- **Build order:** Phase 1 — the private one-way link in the web Coach (his family; highest priority, lowest risk) → Phase 2 — child persona + safeguarding module → Phase 3 — family account/linking model → Phase 4 — App Store packaging + regulatory groundwork.
- **Honest scope for "one session":** a fully COPPA-compliant, App-Store-shippable, child-facing, mental-health-adjacent product is **not** a one-session build. One session *can* realistically deliver: the **private family link working end-to-end** + the **child coach persona** + the **safeguarding module** + the **family-model scaffolding.** The App Store version's regulatory + safety review is a **gate, not a code task** — set that expectation so tomorrow lands as a win, not a shortfall.
- **Packaging:** one app + a Family plan (recommend). Family plan = higher subscription tier covering up to 2 parents + 2 kids. Numbers later.
- **🚨 The regulatory + safety gate (most important advice).** A public child-facing product where a kid might disclose suicidal ideation carries real ethical and legal weight. Before the App Store version ships: (a) COPPA / GDPR-K / UK Age-Appropriate Design Code review + **verifiable parental consent**; (b) Apple's rules for apps directed at children / the Kids Category; (c) ideally a **child-psychologist review of the safeguarding design**; (d) a **legal review.** The **private family version (his own kids) is lower stakes and can move fast.** Do not ship the public child product naively — this is the one place to be slow and careful.

---

## Open questions to answer at session start (so we don't stall)

1. Private system = the web Coach multi-space (`lib/story/coach/`)? Confirm, and which space is the child.
2. Does the child see that parent-context exists at all, or is it fully invisible (the coach just "happens" to help)? *Recommend: child told in general terms a parent can contribute context; never the verbatim.*
3. Product B family composition — fixed (2 parents + 2 kids) or flexible?
4. Two listings vs one app + Family tier? *(Recommend one app.)*
5. How is "child" status set — age, parent-designated? (Drives persona + safeguarding + COPPA path.)
6. Native iOS vs web for the shippable family product?

---

## Resume prompt for tomorrow

> "Let's build the Lyf Coach family model — start with Phase 1 (the private one-way parent → child-coach context link in the web Coach), per `docs/handoffs/LYF_COACH_FAMILY_MODEL_PLAN.md`."
