# PLAN — CELLPHONELESS CLASSROOMS (Paper Scan · Voice · Glasses)

**Date:** Jul 30, 2026 · **Author:** Fable (director) synthesizing 3 Sonnet web-research sweeps + 1 Sonnet codebase scout
**Status:** RESEARCH COMPLETE — PLAN LOCKED PENDING TREDOUX'S RULINGS (§8). Nothing built. No migrations.
**Trigger:** feedback from a Western school of veteran (50+) Montessori teachers who ban phones in class. They handwrite observations during the work cycle, want to photograph the notes AFTER class, and have the system read, digitize, analyze, and store them — especially "which children spend time in which curriculum area."
**Frame locked by Tredoux (Jul 30):** market = outside China · capture = photos of handwritten notes taken after class (any device — the ban is in-class only) · sheet strategy = Montree-designed printable sheet primary, freeform parsing fallback.

---

## §0 THE VERDICT (read this if you read nothing else)

1. **The feature is buildable to production quality with the stack we already run.** 2025–26 benchmarks (OmniAI, arXiv 2604.16504, multiple independents) converge: frontier LLM vision now matches or beats dedicated OCR **specifically on handwriting and phone photos** — the exact conditions here. The recommended pipeline is **Claude Haiku vision + structured outputs, Sonnet escalation on low confidence, temperature 0** — architecturally identical to the photo-ID pipeline already in production. Blended cost ≈ **$0.004–0.006/sheet** (same as a photo). No new vendor, no new infra.
2. **The accuracy lever is the FORM, not the model.** Structured fields (checkboxes, bubbles, pre-printed vocab, boxed cells) hit 90–95%+; unconstrained prose drops to 70–85%. So the product IS the sheet: a Montree-generated, roster-pre-printed, machine-anchored record sheet that a 50-year-old AMI teacher recognizes on sight.
3. **The killer design insight: the sheet is a two-way interface.** Montree already knows each child's shelf (focus works, statuses). We don't print a blank grid — we print each child's CURRENT WORKS on the sheet. The teacher mostly ticks/fills triangles against pre-printed text and adds shorthand only for surprises. That converts handwriting recognition (hard) into mark detection (easy), and closes the loop: Montree prints what it expects, the teacher annotates reality, Montree reads it back.
4. **Nobody else has this.** Competitor sweep (Transparent Classroom, Montessori Compass, MRX, Obserfy, Brightwheel, Lillio, Famly, Seesaw, ClassDojo): every one requires typing/tapping at a screen; MRX has voice dictation; **zero offer photograph-your-paper-notes digitization** as of Jul 2026. The nearest precedent is Gradescope (scan handwritten exams → AI draft → human review) — a workflow model, not a competitor. This is an honest differentiation claim.
5. **Smart glasses are a Phase-3 bet, not a Phase-1 promise.** Meta's Wearables Device Access Toolkit is still closed preview (publishing not open; requires a paired personal phone by design). The only genuinely open path (Mentra Live, $349, MentraOS SDK, phone-optional, offline-capable) is dev-kit-grade from a small startup. Legal exposure of camera-on-face devices around minors is real (Bartone v. Meta; PA HB 2603 indicator-light bill) and there is NO precedent of teacher-worn camera glasses in classrooms anywhere — we'd be first, with all that implies. Voice-only wearables (Plaud NotePin/Note Pro — real API/webhook path) are the safe hands-free bridge.
6. **Smartpens/e-ink are a dead end for v1** (Livescribe ecosystem dead since 2011; reMarkable has no public automation API; all require per-teacher hardware + behavior change). Photo-of-ordinary-paper asks nothing of the teacher's habit. Skip.
7. **Positioning writes itself.** 26+ US states have bell-to-bell student phone bans (2026–27); teacher phone use is a live cultural fight (49% of principals impose staff phone policies). No law anywhere forces teachers off phones — a school that does it anyway is making a values statement. "Cellphoneless Classrooms" is the right banner: *the prepared adult, present, eyes on children. Write like you always have. The phone comes out once, after class, for ten seconds.*

---

## §1 RESEARCH DIGEST (what the three sweeps established)

### 1a. Handwriting digitization (full findings in session chat, Jul 30)
- **LLM vision ≥ dedicated OCR on handwriting/photos.** Claude-tier CER ~1.3% on benchmark handwriting; Haiku A4 photo ≈ 2,035 visual tokens ≈ $0.002–0.003/sheet input-dominated. Structured outputs (`output_config.format` / strict tool_use, constrained decoding) eliminate JSON parse failures.
- **Dedicated OCR (Textract/Azure/Document AI)**: cheaper per page, stronger on dense typed text, weaker on messy handwriting semantics, cannot make "which child, which work" judgments. Optional future cost-optimization pre-pass only.
- **Open source** (TrOCR ~2.9% CER, PaddleOCR): viable only as self-hosted fallback for a hard on-prem demand.
- **Hallucination is the #1 documented failure mode** — LLMs invent plausible text for illegible scrawl (6–14% hallucination persists on frontier models). Mitigation is structural: per-field confidence enums, "output null rather than guess" instruction, and mandatory human review below threshold — exactly our existing Gate-A pattern.
- **Form design rules that matter** (Remark OMR / Aspose / Gradescope / arXiv consensus): corner fiducial anchors (3–4 solid squares, clear space around); QR in fixed header (classroom+date+template version — routes the photo before spending tokens, rejects stale templates); bubbles/checkboxes for every closed vocabulary; one-letter-per-box only where identity-critical writing is unavoidable; bounded free-text boxes with ≥8–10mm line height (older teachers write big); black on white, no tints; keep marks in central ~90% of page (phone photos clip edges); design for oblique phone photos, not flatbed scans.
- **Privacy:** Anthropic doesn't train on API data by default; ZDR available on the Messages API. Delete-raw-after-parse is the Rocketbook-style posture if wanted.

### 1b. Hardware / glasses (full findings in session chat)
- **Meta Ray-Ban** (Gen 2 $379, Display $799): toolkit in closed Developer Preview, third-party publishing NOT open ("2026" aspirational), and the architecture routes capture through a paired personal phone — it moves the camera off the phone but keeps the phone required. Do not build against it until publishing actually opens.
- **Mentra Live ($349, MentraOS)**: the only device where "photo → our backend, no phone" is a documented intended use; full camera/mic SDK, offline-capable. Startup-grade risk. The right Phase-3 pilot IF we make a glasses bet.
- **Vuzix**: real enterprise SDK, can pair to hubs/tablets — but industrial look, wrong aesthetic for a Montessori classroom.
- **Voice wearables: Plaud Note Pro ($189) / NotePin** — 30–50h battery, device SDK + API + automation surface (most API-forward wearable surveyed); no camera = no bystander-privacy problem. The pragmatic hands-free capture for Phase 2.
- **Legal:** CA Ed Code §51512 (classroom recording needs teacher+principal consent), two-party consent states for audio, PA HB 2603 (tamper-proof recording indicator), Bartone v. Meta (secret recording suit). No verified teacher-worn-camera-glasses deployment anywhere — unclaimed category, first-mover reputational risk. Any device we ever endorse must have a non-disableable recording light.

### 1c. Montessori paper practice + competitors (full findings in session chat)
- **AMI has a formal paper observation system** (O'Shaughnessy manual, taught in AMI refreshers): whole-class daily sheet, shorthand codes — choice `(ic)/(sc)/(dc)`, concentration `(wd)/(WC)/(DC)`, put-away `>(i)/>(g)` — plus a weekly plotting chart of concentration across the work cycle. **The "triangle" mastery symbol** (1 side=presented, 2 sides=practicing, closed=mastered) is near-universal muscle memory across AMI and the commercial-template world.
- **The unit that survives a real 3-hour work cycle is ONE SHEET PER CLASS PER DAY** — teachers circulate with one page, never 20 child folders. One photo per class per day is also the lowest-friction capture ritual and directly answers "who spent time in which area."
- **Real usage data (AMS survey):** observation 84%, checklists 74%, anecdotal records 57%, audio/video LEAST used (45% never) — this audience is paper-native. Design for it.
- **Scan UX:** in-PWA, `jscanify` (OpenCV.js, free, active) for edge-detect/deskew; add a custom glare/blur pre-flight (brightness-variance check); Gradescope's philosophy — AI drafts, human confirms — is the trust model veterans accept.

### 1d. Codebase scout (Sonnet, read-only via Desktop Commander — full report in session chat)
- **No OCR/scan code exists anywhere in the repo — greenfield, zero conflicts.**
- **The architecture to imitate is voice-observation, near-verbatim**: session → per-child extraction rows (`review_status` pending/approved/rejected/edited) → review UI with single+batch approve → commit route upserting `montree_child_progress` (UNIQUE `child_id, work_name`) + `montree_behavioral_observations` → optional delete-source-after-commit privacy step. Files: `app/api/montree/voice-observation/*`, `lib/montree/voice/observation-analyzer.ts`, `lib/montree/voice/student-matcher.ts` (Jaro-Winkler roster fuzzy match — reuse directly).
- **Progress landing**: `lib/montree/progress/advance-on-confirm.ts` ladder or direct upsert like voice-commit; never downgrade; `mastered` teacher-only.
- **Reports**: weekly-wrap reads `montree_child_progress` + confirmed photos; landing parsed statuses in progress is sufficient to surface in reports (verify exact join at build time — open question §8).
- **Landmines** (builder MUST honor): `maxDuration` explicit on any LLM route (Railway kills long routes); `temperature:0` on every durable extraction call (voice-analyzer may be missing it — check/fix in passing); `verifyChildBelongsToSchool` on every child_id route; `.maybeSingle()`; `.ilike()` escaping; i18n 12/12 pre-commit hook; menu = `MENU_ITEM_IDS` + `MENU_REGISTRY` + seed on ALL teacher-creation paths; feature flag + 42703-safe pre-migration degradation; offline queue is per-browser (`purgeForeignEntries`); JPEG validation gate on media upload; migrations pasted in full in chat; **next migration number: 308**.

---

## §2 THE MONTREE RECORD SHEET (the product's heart)

**Name (working):** Montree Record Sheet. **Unit: one sheet per classroom per day** (A4 landscape; classes >~16 children get a 2-page set, roster split alphabetically).

**Generated, not static.** A new "Print record sheets" action produces a PDF per classroom per week (5 dated sheets), pre-filled from live data:
- **Rows = roster** (pre-printed child first names — teachers never write names; the #1 recognition risk deleted).
- **Per child, pre-printed current works** — each child's row carries their focus-shelf works (up to ~4) as small labeled slots, each with an empty triangle ▷ next to it. Teacher marks the triangle (1 side / 2 sides / closed = presented / practicing / mastered) and optionally a tally of time bucket bubbles (<15 · 15–30 · 30+ min). New/unexpected work → one blank shorthand cell per child (write the work name; boxed, generous height).
- **Area time strip per child** — 5 area-colored mini-columns (PL · S · M · L · C) with tally/bubble marks for "spent meaningful time here today." This is the direct answer to the school's headline ask and lands in the existing area analytics.
- **Optional AMI concentration microcode** — tiny circle-one `wd / WC / DC` per child. Never required; instantly familiar to AMI veterans; enriches reports ("deep concentration observed").
- **Free-text strip per child** (1–2 ruled lines, ≥9mm) + a wider "class notes" box at the foot. Parsed best-effort, always human-reviewed.
- **Machine chrome:** 4 corner fiducial squares; QR top-right encoding `{classroom_id, date, template_version, page}`; template version printed in text; all content inside central 90%; black on white; area colors as light bands that survive contrast normalization.
- **House style:** the sheet should be beautiful — Lora/Andika house typography, the gold M, something a veteran pins to a clipboard with pride. It is also a marketing artifact: every sheet left on a shelf is an ad.

**Freeform fallback (Phase 1.5):** "Scan any notes" mode — photograph a personal notebook page; Claude extracts best-effort `{child, work, area, status, note}` rows into the SAME review queue with everything flagged for review. Ships after template mode proves the loop.

---

## §3 PARSE PIPELINE

```
photo (any device, after class)
  → in-PWA scan: jscanify edge-detect/deskew via anchors + blur/glare/anchor pre-flight → retake prompt
  → QR decode client-side: route to classroom+date+template; reject unknown/stale template BEFORE any API spend
  → upload (JPEG, existing media upload pattern; media_type='paper_scan' or sibling table — §8 ruling)
  → extract route (fire-and-forget, maxDuration=120+):
      Pass 1: Haiku vision + strict JSON schema (structured outputs), temperature:0
              — schema mirrors sheet geometry: per child → per work slot → {triangle_state, time_bucket, shorthand_raw, note_raw, confidence enum}
              — instruction: null over guess; per-field confidence
      Roster match: Jaro-Winkler (reuse student-matcher.ts) — though names are pre-printed, shorthand work names + freeform mode still need it
      Work match: area-constrained matcher against montree_works (existing work-matching lib)
      Pass 2 (escalation): Sonnet, only when confidence low / unmatched work / long ambiguous note — same trigger philosophy as photo-ID
  → extraction rows written (montree_paper_scan_extractions), status 'pending'
  → teacher review screen (copy voice-observation review UX): per-child cards, ✓ approve / ✏ edit / ✗ reject, batch-approve high-confidence
  → commit: upsert montree_child_progress (ladder rules, never downgrade) + montree_behavioral_observations for notes
  → analytics + weekly reports pick it up through existing reads
```

**Cost model:** 1 sheet/day/classroom ≈ 22 school days ≈ **~$0.10–0.15/classroom/month** at Haiku rates with 15–20% Sonnet escalation. Rounding error against the existing photo pipeline.

**Accuracy targets (gate to ship):** ≥95% field accuracy on triangles/bubbles/pre-printed-slot association; ≥90% on shorthand work names after matcher; free text = best-effort transcript, always reviewed. Below gate → iterate the sheet, not the model.

---

## §4 DATA MODEL & NEW SURFACE (build-phase blueprint)

- **Tables (migration 308, additive, RLS deny-all house-style):**
  - `montree_paper_scans` — id, school_id, classroom_id, teacher_id, sheet_date, template_version, page, storage_path, status (pending/extracting/review/committed/failed), extraction_error, counts, timestamps. (Session wrapper deliberately thin — one scan = one photo.)
  - `montree_paper_scan_extractions` — scan_id, child_id (matched), child_name_printed, work_name_raw, work_key/work_name (matched), area, triangle_state → proposed_status, time_bucket, concentration_code, note_text, match_confidence, status_confidence, review_status, teacher_final_status, teacher_final_notes, timestamps. Mirrors `voice_observation_extractions`.
- **Feature flag:** `paper_scan` in `montree_feature_definitions`, **default OFF**, enabled per-school (this pilot school + Whale). 42703-safe reads pre-migration.
- **Routes:** `paper-scan/upload`, `paper-scan/[scanId]/extract` (fire-and-forget), `paper-scan/[scanId]/extractions` GET, `extraction/[id]` PATCH (approve/reject/edit/batch), `paper-scan/[scanId]/commit`, `paper-scan/sheets/generate` (the PDF generator). All `verifySchoolRequest` + `verifyChildBelongsToSchool`.
- **Pages:** `dashboard/paper-scan` (scan + review queue) + "Print record sheets" surface (inside the same page; PDF via the existing render-engine muscle). New `MENU_ITEM_IDS` entry + registry + seed paths + ~20 i18n keys × 12 locales.
- **AI tier:** extraction runs Haiku for all paid tiers; Sonnet escalation on Premium (mirror photo-ID gating via `resolveReportModel`) — §8 ruling.
- **Sheet PDF generation:** follow `lib/montree/english-curriculum/render/` builder patterns (pure Node+browser, headless-Chrome PDF) — the house already excels at print artifacts.

---

## §5 PHASES

**PHASE 0 — PAPER PROTOTYPE + ACCURACY HARNESS (the no-glitches insurance; ~zero code).**
1. Fable designs 2–3 candidate sheet layouts (real classroom roster, house style) as PDFs.
2. Tredoux (a working Montessori teacher!) prints and fills them during REAL work cycles — natural handwriting, natural mess. Ideally also one veteran colleague with worse handwriting.
3. Photograph filled sheets badly on purpose too (angle, shadow, glare).
4. Harness script (pattern: `scripts/eval-photo-id.mjs`) runs Claude extraction against hand-labeled ground truth → field-accuracy report per layout.
5. Iterate layout until the gate (§3) passes. **Only then does build start.** Also send the winning sheet to the requesting school for reaction — co-design credibility, zero code risk.

**PHASE 1 — PAPER SCAN (sacred flow build).** Contract doc → Opus builds (PDF generator + scan/extract backend + review UI as parallel chunks) → Sonnet fresh-eyes audit → runtime audit on real sheets → migration 308 pasted in chat → pilot school + Whale flag-on. Phase 1.5: freeform "scan any notes" mode.

**PHASE 2 — VOICE, HANDS-FREE.** Montree already owns the voice-observation pipeline; the gap is capture hardware. Recommend piloting **Plaud NotePin/Note Pro** ($189): teacher records observations by voice during class (audio-only, no camera privacy problem), transcript reaches the existing analyzer via Plaud's API/export path (integration spike required — verify webhook reality vs marketing before promising). Two-party-consent + school policy language shipped with it (§7).

**PHASE 3 — SMART GLASSES (watchlist, not roadmap-promise).** Triggers to re-open: (a) Meta opens third-party publishing on the Wearables toolkit; (b) Mentra (or similar open-SDK vendor) reaches credible scale/support. If a differentiation bet is wanted sooner: 2–3 teacher opt-in pilot on Mentra Live, Montree-built MentraOS capture app, explicit parent consent + visible indicator light. Never before Phase 1 is live and loved.

---

## §6 WHAT WE TELL THE SCHOOL NOW

- Yes — and we're building it around YOUR practice: you handwrite exactly as you always have, on a beautiful sheet that already knows your class. After the children go home, any camera — one photo per class per day — and Montree does the rest, with you approving its reading in two minutes. Your area-time question is answered on the dashboard the same day.
- Phones never come out during the work cycle. Ever. That's the point of the design, and we think you're right about it: the prepared adult is present, eyes on children.
- Hands-free voice notes (a small clip pendant, no camera) are next. Smart glasses: we've researched them deeply, they're not ready or appropriate for classrooms yet — when they are, you'll be first to know.

---

## §7 PRIVACY POSTURE

- Sheet photos contain a full class's named observations — treat as the most sensitive image class in the system. Anthropic API: no training on API data by default; pursue ZDR posture in the school-facing DPA language.
- **Ruling needed (§8):** delete raw sheet photo after commit (voice-observation's posture) vs retain like classroom photos. Recommendation: **delete after commit + short grace window** — strongest story for exactly the school segment this feature courts, and the extractions are the durable record anyway.
- Voice pendant (Phase 2): planned observation windows, announced; never in one-on-one/private conversations; two-party-consent language for US states. Camera glasses (Phase 3): non-disableable indicator light mandatory, per-parent opt-out honored.

---

## §8 OPEN RULINGS FOR TREDOUX (answer inline in chat — nothing builds until these are set)

1. **Raw photo retention:** delete after commit (recommended) or retain in media library?
2. **Sheet unit confirmed?** One sheet per class per day, A4 landscape, roster+shelf pre-printed (recommended) — or do you want a per-child weekly variant offered too?
3. **AI tier gating:** paper-scan extraction Haiku-for-all-tiers with Sonnet escalation Premium-only (recommended, mirrors photo-ID), or Premium-only feature outright?
4. **Teacher-facing name:** "Paper Scan"? "Field Notes"? "The Record Sheet"? (Project banner stays Cellphoneless Classrooms.)
5. **Phase 0 co-design:** do we send draft sheets to the requesting school for feedback before build, or keep it in-house until it's polished?
6. **Phase 2 hardware bet:** order a Plaud NotePin/Note Pro now for an integration spike, or defer until Phase 1 ships?

---

## §9 KEY SOURCES (full lists in the three agent reports, session chat Jul 30)

OmniAI OCR benchmark · arXiv 2604.16504 (handwriting→structured data) · Anthropic structured-outputs + vision + retention docs · Remark OMR form-design guide · O'Shaughnessy AMI observation manual (montessoricentermn.org) · Trillium record-keeping evolution (triangle symbol) · AMS assessment-practices survey · Meta Wearables Device Access Toolkit blog + FAQ · Mentra Live / MentraOS docs · Plaud Note Pro · natlawreview.com smart-glasses privacy · Newsweek 2026 phone-ban map · EdWeek teacher-phone-ban poll · jscanify · Gradescope scanning guides.
