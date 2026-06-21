# Lyf Coach — Go-To-Market & Promotion Plan

*Written Jun 21, 2026, while it's fresh. Two products, one app, one promise: a coach
no one can ever read. First action is the App Store. Companion: `LYF_COACH_SCRIPTS.md`.
Product seal/architecture: `docs/handoffs/LYF_COACH_FAMILY_THREAT_MODEL.md`.*

---

## 1. The product decision (LOCKED)

**One app, two plans.** Not "less private vs more private" — both share the identical
absolute seal. The Family plan *adds* a consented, connective layer on top.

| | **Lyf Coach (Sealed)** | **Lyf Coach Family** |
|---|---|---|
| Who | One person | Mum + dad + up to 2 kids |
| Core | A private coach/journal/planner no one can ever read — not even us | Everyone gets their own sealed coach + a quiet Family Brain holding the whole family |
| Price | ~$15–20 / mo | ~$50 / mo, whole family (flat, not per-seat) |
| Regulatory | Light (adults-only) → ships first | Gated (COPPA/Apple-kids/child-psych/legal) → follows |

**Brain-agency dial (LOCKED at "gentle default + optional steer"):**
1. **Seal: always.** Every room is sealed by architecture. Non-negotiable, both plans.
2. **Automate from consented/observed signals: yes — as the gentle default.** The Family
   Brain quietly warms each coach's *tone* when the family's under load. Invisible, no one
   named. This is the magic; it stays on.
3. **Captain drives the brain: secondary/opt-in.** A steer, never the steering wheel. The
   brain serves the family's wellbeing, not the captain's will.
4. **Child signals: consent + parent-observation only.** Never mined silently from a
   child's sealed room.

---

## 2. Positioning & promise

**The one line:** *"A coach in your corner that no one can ever read. Not even us."*

**Why it wins:** every other AI companion/journal is a data-harvest in a warm voice. Lyf
Coach inverts it — confidentiality *is* the product. The seal is both the ethic and the
hook. People don't open up to something they suspect is watching; they open up to a room
that's truly theirs.

**Family one-liner:** *"Everyone their own private room. One quiet brain holding the whole
family. Nobody surveilled — everyone held."*

**Brand voice:** warm, plain, honest, unhurried. The lineage of "the magic of Montree" /
"work smarter, not harder" — confident, never hypey. Dark-forest calm, gold accents.

**🚨 Honesty rules (Apple + ethics — do not break):**
- NOT a therapist, NOT medical, NOT a crisis service. It's a coach/companion that, in a
  dark moment, gently points to a real trusted person/helpline. Never claim otherwise.
- Don't say "in the App Store" until it's live (use a waitlist line).
- Must be Tredoux's own face/voice in any founder video.

---

## 3. Audience

- **Tier 1 (Sealed):** privacy-conscious adults; journalers; people in therapy-adjacent
  self-work; people burned by AI-data stories; people who want a planner + a steady voice
  without being a product.
- **Tier 2 (Family):** parents who feel the household's mental load; co-parents who want to
  support each other and their kids without surveilling them; the "I wish we had a family
  therapist on call" crowd at a fraction of the cost.

---

## 4. 🚀 Promotion plan — sequenced (FIRST ACTION = APP STORE)

**Phase 0 — Get on the App Store (do this first, ship the Sealed Individual app).**
1. Finish **Apple Developer enrolment** (resume on the Apple Developer iPhone app, passport,
   $99; SMS to +86 only sends VPN-OFF — see brain). Same account as Montree (shared `xyz.montree` prefix).
2. Confirm the **App-Store hard requirements** on the native Lyf Coach build:
   - in-app **account deletion** (built),
   - **privacy-policy URL** live (`app/lyf-coach/privacy`),
   - a **demo account** in reviewer notes,
   - **NO covert "Messages" door** in the App-Store build (Apple 2.3.1),
   - honest listing copy (no "therapist"/medical claims).
3. **TestFlight** on a real device (Secure Enclave): claim → encrypt/decrypt round-trip →
   Face-ID unlock → coach on-device + explicit cloud opt-in.
4. Ship **Sealed Individual** to the App Store. Adults-only keeps the regulatory surface light.
5. **Monetisation:** StoreKit (iOS IAP — Apple forces it) + PayFast on web. Meter cloud
   prompts (fair-use ~150–200/mo).

**Phase 1 — Soft launch the Sealed plan (proof + privacy brand).**
- Waitlist landing page → "the coach no one can read." Capture emails pre-launch.
- 3 short vertical videos (scripts in `LYF_COACH_SCRIPTS.md`): the hook, the seal explainer,
  the founder promise. Real screen recordings + own voice; no warping AI video (brain lesson).
- Seed where privacy + self-improvement overlap: a Show-HN/Reddit (r/privacy, r/journaling,
  r/selfimprovement) honest founder post; a few thoughtful creators in the journaling/Stoicism/
  ADHD-tools space.
- Price low-friction; first month or generous trial. Let the privacy promise convert.

**Phase 2 — Launch the Family plan (premium upsell) — AFTER the gate.**
- Gate to clear first: COPPA / GDPR-K / UK AADC + verifiable parental consent, Apple kids
  rules, a child-psychologist review of the safeguarding design, a legal review.
- Then the Family narrative carries the campaign: "nobody surveilled, everyone held." Target
  parent communities; lean on the family-therapist-at-a-fraction framing.
- Upsell existing Sealed users into Family; whole-family flat $50 is the anchor.

**Phase 3 — Compounding.**
- Testimonials (anonymised, with permission) about *feeling safe enough to be honest*.
- Content engine: short, calm, useful clips on coping, focus, family rhythm — each ending on
  the seal. Repurpose to TikTok/Reels/Shorts/LinkedIn.
- Referral: a sealed product spreads by trust, not virality — make "tell a friend" gentle.

---

## 5. Channels & assets

- **Owned:** waitlist landing, privacy page, App Store listing + preview video.
- **Lean video pipeline (brain-locked):** real app screen recordings + code-built brand cards
  (no warping), own voice or ElevenLabs-lowest, filmed on phone, assembled in CapCut. 1 paid
  tool max.
- **Social:** vertical-first. Calm > loud. Every clip lands on the seal.
- **Community:** privacy + self-work + parenting forums; honest founder voice, never spammy.

---

## 6. Metrics
- Phase 0: App Store approval; TestFlight crash-free; first paid subs.
- Phase 1: waitlist → install → trial → paid; D7/D30 retention (the real signal a private
  coach is trusted); cloud-prompt usage within fair-use.
- Phase 2: Sealed→Family upsell rate; family-plan retention.

---

## 7. The non-negotiables (marketing must never cross)
- Never imply we can read user rooms "for support." We can't, by architecture — that's the pitch.
- Never claim therapist/medical/crisis capability.
- Never market the child product until the regulatory + psychologist + legal gate is cleared.
- Founder's real face/voice only.
