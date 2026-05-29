# Features — indexed by audience pain point

## For the overworked teacher

**Photo-to-observation pipeline.** Teacher snaps a photo. Two-pass AI (Haiku describes, Haiku matches, Sonnet escalates only when needed) identifies which Montessori work is in the frame, attributes it to the child, generates an observation note. Cost ~$0.006 per photo. Teacher confirms or corrects in one tap.

**Photo audit queue.** Anything the AI wasn't sure about lands here. Teacher sees the photo + top-3 candidate works + one-tap confirm or correct. Corrections feed back into the per-classroom visual memory — the system gets sharper with every fix.

**Weekly Wrap.** Friday afternoon, the system writes the teacher report and the parent narrative for each child. Pulls progress, observations, photos, notes. Teacher reviews and sends. What used to take 4 hours takes 20 minutes.

**Guru.** Per-child AMI Montessori AI. Teacher asks "is Austin ready for the moveable alphabet?" and gets a grounded, pedagogical answer drawing on every observation on file plus Maria Montessori's writing. Maria Montessori in your pocket.

**Voice onboarding.** New child? Teacher records a 90-second voice memo. Sonnet builds the child's mental profile (experience level, sensitive periods, family notes, strategies, triggers), seeds the curriculum, drafts the first game plan.

**Bulk import.** Paste students from a spreadsheet, the system creates their records and parent invites.

**Real-time progress tracking.** Every confirmed photo writes a live progress observation. The dashboard reflects what happened today, not what happened on Friday after the wrap.

## For the principal

**Astra (chief of staff).** The principal's AI. Opus-powered. Knows every child, every teacher, every observation, every note. Three modes:
- *Reactive Q&A.* "How is Susan doing?" — Astra unpacks vague into activity + coverage + quality + pattern + verdict.
- *Parent communication.* Astra scans every parent thread, drafts the principal's reply in her voice, surfaces the "Astra drafted" pill so the parent knows it's AI-assisted.
- *Parent meeting prep.* Astra pulls every observation + Guru analysis + behavioural pattern and builds a meeting-prep dossier the principal reads once and walks in prepared.

**Communication hub.** Five tabs (By classroom / All teachers / All parents / Custom groups / Inbox). Principal sees every conversation in the school. Auto-observer on every parent thread for transparency.

**Cockpit (Today page).** Weekly digest, attention list (idle teachers, classrooms without lead, children not observed 8+ days), 4 metric tiles, quick actions.

**Universal Calendar.** Events + appointments + terms. Glowing color dots per category. Tap a day, schedule a video call, the system handles the Agora token.

**Vault.** Private encrypted recordings of parent meetings (audio-free, summary-only). AES-256-GCM, per-principal password, server never sees plaintext.

## For the parent

**Weekly Wrap report.** Lands in their language. Reads like the teacher wrote it. Photos + work names + observations + the principal's signature.

**Live progress.** What their child did this week, this month, this term.

**Direct messaging with teachers and principal.** Threaded, encrypted in transit + at rest.

**Appointment booking + video calls.** Native in-app via Agora.

**Story system.** Per-child media stream with end-of-year highlights.

## For the multi-classroom school

**Classroom Overview.** Per-classroom tabs: Shelf Overview / English Schedule / English Progress / Class Progress. Class Progress shows per-area + per-child confirmed-photo summaries for the week or month.

**Pulse.** Weekly principal report. Who's active, who's quiet, where the school is.

**Activity feed + Reports.** Full audit trail for the principal.

## For the agent (Mira's user)

**Self-service referral codes.** \<FIRSTNAME\>-XXXX format. One per pitch. Locked at the agent's revenue-share %.

**Schools snapshot.** Each referred school's signal: student count, last_active, AI tier, principal logged in, photos this week.

**Earnings dashboard.** Estimates while Stripe billing runs in shadow mode; actuals from `montree_agent_payouts` once Phase 5 ships. Negative net → zero (no clawback).

**Stripe Connect Express.** Agent fills bank + tax once on Stripe's hosted form. Stripe handles 1099-NEC.

**Outreach drafting tools.** Cold pitches + follow-ups in 12 languages. Translation tool. All produced via Mira (me).
