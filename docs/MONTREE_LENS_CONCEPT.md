# Montree Lens — Concept & Plan (v0.1, 2026-08-25)

Working name: **Montree Lens** (alternatives: Montree Observe, Owl). A standalone PWA inside the montree repo, Potato-Snaps style, for Montessori consultants, mentors and pedagogical directors who visit classrooms, observe, and write professional reports — without a classroom of their own in Montree.

Status: research complete; repo integration verified against the repo on 2026-08-25.

---

## 1. Who she is (the persona, in industry terms)

There is no single global title. The accepted ones, by body:

| Body | Title for the person | What they produce |
|---|---|---|
| AMI (Association Montessori Internationale) | **AMI Consultant** (school consultation / Recognition visit) | *Level report* + *individual teacher reports*: observations → recommendations → noted requirements |
| AMS | **Visiting team member** (accreditation) | Team report against 9-domain Standards & Criteria |
| NCMPS (public-sector Montessori, US) | **Assessor / Rater** (DERS, Essential Elements Rubric) | Rubric scores, 4-level scale |
| Schools / networks (incl. China groups) | **Pedagogical Director / Coordinator, Montessori Coach, Mentor** (教务总监 / 督导) | Coaching-cycle reports, action plans |
| Montessori Foundation / IMC | **Consultant** | Narrative report + debrief |

For the app we call the role **Observer** (observer / consultant / mentor), and she calls herself whatever she likes on the report letterhead. Each report carries an **engagement type**: *Consultation visit* (external, formal), *Mentoring visit* (developmental, for the guide), *Internal review* (pedagogical director inside a group). The engagement type sets tone and which sections appear.

## 2. What the international standard looks like (research summary)

Three things are always observed, in this order of Montessori priority:

1. **The children** — normalisation indicators: sustained concentration, self-chosen purposeful work, repetition, independence, care of materials, respect for others' work, social cooperation, self-regulation without adult discipline; recognising *false fatigue* vs. real disorder.
2. **The prepared environment** — order, beauty, completeness and condition of materials per area (Practical Life, Sensorial, Language, Mathematics, Culture/Cosmic), accessibility (child height), mixed-age grouping (2.5–6 / 6–9 / 9–12 / 12–15 / 15–18), ratios, an **uninterrupted three-hour work cycle**, freedom within limits, outdoor/real work, inclusion.
3. **The prepared adult (guide/directress)** — quality of presentations (isolation of difficulty, one point per lesson, economy of language and movement), three-period lesson, tone, grace and courtesy, non-interference (letting *control of error* work), reading sensitive periods, record-keeping and planning.

Core vocabulary the AI must use correctly: *guide/directress, prepared environment, prepared adult, normalisation, work cycle, false fatigue, presentation, three-period lesson, control of error, isolation of difficulty, indirect preparation, points of interest, sensitive periods, freedom within limits, grace and courtesy, mixed-age community, absorbent mind, cosmic education.*

**Report craft conventions (cross-framework — Ofsted, ECERS, CLASS, Danielson, AMI):**
- Strict layering: **low-inference evidence** (timestamped, verbatim quotes, "Child A (4;3)") → **analysis** → **judgement/recommendation**. Evidence is never blended with judgement in the same sentence.
- Strengths first: *Commendations / Areas of strength* → *Recommendations / Areas for growth* → *Required actions* (compliance-critical, separate).
- Stock phrasing: "It was observed that…", "The guide was noted to…", "Evidence indicates…", "Consider…", "It is recommended that…".
- Asset-based language: "is beginning to", "would benefit from", never "fails to / lacks".
- Children anonymised (initials or Child A/B; age as years;months). Photos are of the **environment and materials, not children's faces** — under China's PIPL, images of under-14s are *sensitive personal information* requiring separate guardian consent; same spirit under GDPR.
- Rating scales, where used, are light: 4-level (**Exemplary / Established / Emerging / Not yet**, or NCMPS's Exemplary / Satisfactory / Needs Improvement / Unsatisfactory) presented as a small table, then narrative.
- Debrief follows the report: GROW-style open questions, "glow and grow", one agreed testable next step.

**Market gap:** Storypark, Famly, Lillio, Brightwheel, Tapestry, Educa do AI-assisted *learning stories for parents*. Transparent Classroom hosts NCMPS rubrics for *classroom guides*. Nothing purpose-built exists for the *visiting observer → structured multi-classroom report → action plan → follow-up visit* workflow. The Storypark guardrail is the one to copy: **AI drafts only from what she supplied, never invents observations, and she must review before it's final.**

## 3. Product concept

**One line:** She walks in, taps *New Visit*, snaps the shelves, talks her notes as she goes, and walks out with a draft AMI-style report in English and Chinese that sounds like her.

**Three loops:**

1. **Capture (in the classroom, silent, thumb-only).** Timestamped stream of *moments*: a photo, a voice note (transcribed on-device or server-side), a quick chip (area: Practical Life… / subject: child, environment, adult / rating pip). Absolutely no typing required. Works offline; syncs later.
2. **Compose (afternoon, over tea).** The AI (her own "Lens Guru") organises moments into the report skeleton, asks her the 3–5 questions it needs ("You mentioned the guide interrupted three times — was that during a presentation?"), drafts each section, she edits inline, voice-dictates changes, regenerates paragraphs, sets the engagement type and ratings. She can also just bounce ideas: "Is this normal for week two of term?"
3. **Deliver & follow up.** Branded PDF (her letterhead, school logo), bilingual, photo appendix; a **debrief script** for the teacher meeting; recommendations become **action items** with due dates that pre-populate the next visit to the same classroom ("Last time you recommended X — check progress").

### Data model (her world, not Montree's classroom world)

```
observer_profile   (name, title, credentials, letterhead, signature, default language(s), voice/style preferences, phrase bank)
school             (name, city, contact, logo, age bands offered, affiliation AMI/AMS/none, notes)
classroom          (school_id, name, level: Nido/Toddler/Casa/Lower El/Upper El/Adolescent, age range, child count, ratio, room notes)
staff              (classroom_id, name, role: Lead guide / Assistant / Trainee, training: AMI/AMS/other + level, years, notes)
visit              (school_id, date, engagement_type, purpose, start/end, classrooms[] , status: capturing→drafting→review→final)
moment             (visit_id, classroom_id, ts, kind: photo|voice|text|chip, media_url, transcript, area, subject, staff_id?, child_alias?, rating?)
report             (visit_id, classroom_id|null for level report, template, language(s), sections JSON, ratings JSON, version, pdf_url)
action_item        (report_id, text, owner, due, status; surfaces at next visit)
```

### Report template (AMI default, engagement-type aware)

1. Cover: school, classroom, level, date, observer, engagement type, confidentiality line
2. Context: children present/enrolled, age range, staff & training, time observed, work cycle window
3. Summary (one paragraph, strengths-led)
4. The Children — normalisation & work cycle (evidence → analysis)
5. The Prepared Environment — by area, with photo evidence
6. The Prepared Adult(s) — one subsection per staff member (becomes the *individual teacher report* when split out)
7. Commendations
8. Recommendations (prioritised; each tied to evidence)
9. Required actions (only for consultation/compliance engagements)
10. Ratings table (optional, 4-level, per domain)
11. Agreed next steps & follow-up date
12. Appendix: photo log with captions, observation timeline

Chinese version: full translation of the same structure, Montessori terms rendered with the standard Chinese equivalents (蒙台梭利, 正常化, 有准备的环境, 工作周期, 三段式教学法, 错误控制…), generated as a second document or side-by-side toggle.

### The Lens Guru (her helper)

Same chat mechanics as the Montree Guru, different system prompt and memory:
- Knows AMI/AMS terminology and report conventions (§2 baked into the prompt + a small reference corpus).
- Knows **her**: style profile learned from her edits (sentence length, formality, favourite phrasings, how blunt she wants recommendations), stored in `observer_profile`.
- Knows the **visit**: has all moments in context, can answer "what did I say about the maths shelf?"
- Modes: *Draft section*, *Tighten*, *Make kinder / firmer*, *Translate*, *Write debrief questions*, *Sanity-check* ("anything I claimed without evidence?"), *Brainstorm*.
- Hard guardrails: never fabricate observations; flag any judgement without a linked moment; never name a child; refuse to include child faces in the report body.

## 4. Fit with the montree repo (verified 2026-08-25)

**Potato Snaps pattern to copy.** Potato lives at `app/potato` + `app/potato-app` (PWA shell), APIs under `app/api/potato/*` (auth, photos/upload, children, intake, montages), its own tables prefixed `tp_` (`tp_classes`, `tp_photos`, `tp_children`, `tp_parent_codes`, `tp_scenes`, `tp_montage_jobs`; migrations 319–321, 335), its own auth (`lib/potato/auth.ts`: 6-char class code → `potato_teacher` cookie, no Supabase user needed), its own icons/manifests in `public/potato*`, a domain rule in `middleware.ts` (line ~171: `/potato*` served only on teacherpotato.xyz), and a separate Railway worker (`potato-worker/`, Remotion) for heavy jobs.

**Lens does the same:** `app/lens` + `app/lens-app`, `app/api/lens/*`, tables prefixed `lens_` (§3 data model), `public/lens*` manifest/icons, its own middleware host rule (decide: montree.xyz/lens or a `lens.` subdomain), lightweight auth (email magic link or invite code → `lens_observer` cookie — she is one user; codes are enough for v1). No worker needed for v1: transcription and PDF are request-time.

**Reuse directly:**
- Voice → text: `app/api/montree/guru/transcribe/route.ts` (OpenAI Whisper, rate-limited per user). There is already a full *voice observation* pipeline — `migrations/135_voice_observations.sql` (`voice_observation_sessions / _extractions / _audio_chunks`) — chunked audio + AI extraction. Lens's `moment` capture should lift this design (chunked upload survives flaky classroom Wi-Fi).
- Photo path: `app/api/potato/photos/upload` (client compression → Supabase storage → row).
- Guru: `app/api/montree/guru/stream` + `lib/montree/guru/{prompt-builder,context-builder,conversational-prompt,tool-definitions,tool-executor,knowledge-retriever}.ts`. Anthropic Claude via `ANTHROPIC_API_KEY`. Lens Guru = new `lib/lens/guru/` with its own prompt-builder and a `lens_visit` context-builder, reusing the streaming route shape and the knowledge retriever. Existing knowledge files (`lib/montree/guru/knowledge/ami-language-progression.ts`, `sensitive-periods.ts`, `psychology-foundations.ts`, `esl-chinese-learners.ts`) are reusable; add `observation-standards.ts` (§2 of this doc) and `montessori-glossary-zh.ts`.
- PDF: `lib/montree/reports/pdf-generator.ts` (pdfkit) is the closest existing report generator; `jspdf` also in deps. Lens report PDF = new template in the same style.
- Brand: `MONTREE_BRAND_PALETTE.md`; deploy on the existing Railway service (no new service for v1).

Multi-tenant from day one but single-user in practice: `observer_profile` per auth identity; everything she creates is hers. "People like her" later just sign up.

## 5. Build phases (Opus builds, Sonnet researches/tests)

**Phase 0 — Recon & scaffold (½ day).** Repo recon brief; scaffold route group, manifest, middleware rule, migrations, auth gate, empty screens. Document in PROJECT_CONTEXT / CLAUDE.md per repo convention.

**Phase 1 — Capture MVP (2–3 days).** Schools/classrooms/staff CRUD; New Visit; capture screen (photo, hold-to-talk voice, chips, timestamp); offline queue + sync; moment list. She can use this in a real classroom at the end of Phase 1 even before AI exists.

**Phase 2 — Compose (3–4 days).** Lens Guru with report drafting; template engine; inline editing with regenerate-per-paragraph; ratings; English + Chinese; style profile capture from her edits.

**Phase 3 — Deliver (2 days).** PDF with letterhead, photo appendix; share link; debrief script; action items and next-visit recall.

**Phase 4 — Polish for "people like her" (later).** Template variants (AMS rubric, custom school rubric), team sharing, pricing.

Each phase ends with a real-world test with her and a written eval set (5 sample visits with expected report qualities) that Sonnet runs as regression.

## 6. Open questions for her (5 minutes of her time)

1. Does she currently write reports? If so, one sample = the single most valuable input for the style profile and template.
2. Who receives them (owner / head / the guide) and in which language, by default?
3. Does she rate, or do her clients expect ratings?
4. Is there a formal follow-up visit cycle (e.g. termly)?
5. What does she record now (phone notes? paper?) and what does she wish she'd captured last time?

## 7. Risks

- **Fabrication** in AI drafts: mitigated by evidence-linking every claim to a moment and a "show me the moment" hover in review.
- **Child privacy / PIPL**: app default is environment photos; face-blur or a "no children in frame" nudge on capture; children never named in data.
- **Voice in a silent classroom**: hold-to-whisper works; also offer chips + emoji-free quick tags so she can capture without speaking.
- **Chinese quality**: Montessori Chinese terminology must be locked in a glossary, not left to the model.

## Sources (research briefs on file)
AMI/USA Recognitions & Consultations; AMI Montessori Program Evaluation; AMS School Accreditation Standards & Criteria (2022); NCMPS Tools, DERS, Essential Elements Rubric v5; Montessori Rating Scales; Teachstone CLASS Support for Montessori Environments (2026); Ofsted EIF; ECERS-3 guide; Danielson low-inference notes (WeTeachNYC, Principal Center); ACECQA A&R; Storypark AI fact sheet; PIPL overviews. Full URL list held in the session research briefs.
