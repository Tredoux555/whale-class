# Demo paths — sequenced flows for 10 / 30 / 90 minutes

The demo is where the conversation goes from "interesting" to "I'll try it." The agent should pick the flow that fits the time and the principal's interest level.

## 10-minute demo — the "what is this" flow

Audience: principal who has 10 minutes between meetings and wants to know if this is worth a follow-up.

1. **Open** (30s) — the brand line: *"A teacher takes a photo. Montree does the rest."*
2. **Show the photo flow** (3 min) — open Whale Class, take a photo of a real Montessori material (carry one with you OR use the screenshot library), demonstrate the two-pass AI identifying the work, the one-tap confirm.
3. **Show a Weekly Wrap** (3 min) — pull up a real parent report (use a sanitised Whale Class one OR a generated one), let her READ a paragraph. The Friday-afternoon-changes story.
4. **Show Astra** (2 min) — ask Astra "what should I tell Yo-yo's mum about his math?" — Astra returns a grounded parent-ready paragraph in under 30 seconds.
5. **Close** (1 min) — "Free month, one classroom, no card. If your teachers' Friday afternoon feels different at the end of it, we keep going."

## 30-minute demo — the "let me actually evaluate" flow

Audience: principal who has shown real interest and wants to evaluate properly.

1. **Open + the magic** (3 min) — brand line, photo-to-observation flow.
2. **The teacher's day** (8 min):
   - Take a photo. Confirm. The observation is written.
   - Walk into the audit queue. Correct one mis-identification. Show how the correction feeds back into visual memory.
   - Open the child page. Show recent observations, mental profile, focus shelf.
   - Voice-record a 60-second mental-profile update. Watch Sonnet build the child's record.
3. **The parent's view** (5 min):
   - Pull up a real Weekly Wrap (in their language if relevant).
   - Show the parent portal — photo gallery, weekly report.
   - Demonstrate the parent ↔ teacher thread.
4. **The principal's cockpit** (8 min):
   - Today page (digest + attention + tiles).
   - Communication hub (5 tabs).
   - Astra: scan a thread + draft a reply + (if time) **prepare a parent-meeting dossier**. The dossier is the killer feature.
5. **Pricing + close** (5 min):
   - Free month, $7/student/month after, one plan.
   - The three payment rails.
   - The agent's commission story (only if she asks).
   - "When would you want to start? I can set you up today."

If the principal asked a hard question during the demo (objection from `objections.md`), close with: *"and the [X] thing you raised — let me follow up with the answer to that tomorrow."* Don't try to answer everything live.

## 90-minute demo — the "deep evaluation with the founding team" flow

Audience: a multi-campus director, an association, a buyer who wants pedagogical and technical confidence before recommending.

1. **Open (5 min)** — the founder's story (a Montessori teacher who built software because the paperwork was eating his teachers). Whale Class as the reference school. Built BY a teacher, not for one.
2. **Live photo-to-observation pipeline (15 min)** — full demo, including:
   - Multi-child group photo via the `montree_media_children` junction.
   - The teacher's correction → visual memory feedback loop.
   - The negative-example accumulation (the moat).
3. **Pedagogical depth (15 min)**:
   - The five-area focus shelf rotating per child.
   - The mental profile (sensitive periods, learning modality, family notes).
   - The English Progression Tracker (Pink/Blue/Green) — full demo of the lesson sequence.
   - Decodable readers (Pink Phase, 15 books).
4. **Astra (15 min)** — full demo:
   - Q&A about a real child.
   - Scan a parent thread end-to-end with sentiment + recommended next move.
   - Draft a reply in the principal's voice from her last 10 messages.
   - **Prepare for a difficult parent meeting** — the dossier flow, with the principal watching every section assemble. This is the moment that closes most evaluations.
5. **Architectural + privacy (10 min)** — for the technically-minded principal:
   - Cross-pollination contract (every query filters by school_id).
   - AES-256-GCM encryption on messages, meeting notes, vault.
   - Cookie-based auth + per-route gating.
   - 12 languages, per-locale curriculum data.
   - The three payment rails + the agent referral system.
6. **Pricing + agent commission (5 min)** — for an association director, this is where the 20% revenue share lands and they start thinking about which affiliate to recommend first.
7. **Q&A (20 min)** — let the principal drive. The most important section.
8. **Close** — propose the first pilot school + the timeline.

## What to bring to a demo

- A laptop with Montree open and you LOGGED IN as a teacher in Whale Class (or whatever demo school you have access to). You demo by USING it.
- A photo to take. A Montessori material on hand is ideal. If not, a print-out of one works for the two-pass AI demo.
- Headphones (for the voice features, if it's a noisy environment).
- A backup of the brand video / pitch deck on your phone for the "screen is cracked" emergency.

## What NOT to do during a demo

- Don't read from a script.
- Don't apologise for anything that isn't there yet (be honest, but move on quickly).
- Don't oversell the AI accuracy. Show the audit queue early; build trust through honesty.
- Don't end the demo without a concrete next step (free month / follow-up call / decision date).
