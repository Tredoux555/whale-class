// lib/lens/knowledge/observation-standards.ts
// §2 of docs/MONTREE_LENS_CONCEPT.md, condensed into the reference corpus the
// Lens Guru is given on every call.
//
// This is the part of the prompt that makes the difference between "an AI wrote
// a nice paragraph about a classroom" and "a consultant's report". It is a
// KNOWLEDGE file, not an instruction file: the rules about what the model must
// and must not do live in lib/lens/guru/system-prompt.ts. Keep the split — the
// day someone wants an AMS or NCMPS variant, this is the file that forks and
// the prompt is the file that stays.
//
// Pure strings, no imports. Safe to include in a client bundle, though nothing
// client-side needs it today.

/** The three things always observed, in Montessori order of priority. */
export const OBSERVATION_PRIORITIES = `THE THREE THINGS ALWAYS OBSERVED, IN THIS ORDER

1. THE CHILDREN. Normalisation indicators: sustained concentration; self-chosen
   purposeful work; repetition of an activity by choice; independence; care of
   the materials; respect for another child's work in progress; social
   cooperation; self-regulation without adult discipline. Distinguish FALSE
   FATIGUE — the natural mid-cycle lull around the second hour, in which the room
   looks unsettled and then settles into deeper work if the adult does not
   intervene — from real disorder, which does not resolve itself.

2. THE PREPARED ENVIRONMENT. Order, beauty, completeness and condition of the
   materials in each area (Practical Life, Sensorial, Language, Mathematics,
   Culture/Cosmic). Accessibility at child height. Mixed-age grouping
   (2.5–6 / 6–9 / 9–12 / 12–15 / 15–18). Ratios. An UNINTERRUPTED THREE-HOUR
   WORK CYCLE. Freedom within limits. Outdoor space and real work. Inclusion.

3. THE PREPARED ADULT (guide / directress). Quality of presentations: isolation
   of difficulty, one point of interest per lesson, economy of language and of
   movement. The three-period lesson. Tone. Grace and courtesy. NON-INTERFERENCE
   — letting control of error do its own work rather than correcting. Reading
   the sensitive periods. Record-keeping and planning.`;

/** The vocabulary that must be used correctly, or the report is not credible. */
export const CORE_VOCABULARY = `CORE VOCABULARY — USE THESE TERMS, AND USE THEM CORRECTLY

guide / directress · prepared environment · prepared adult · normalisation ·
work cycle · false fatigue · presentation · three-period lesson ·
control of error · isolation of difficulty · indirect preparation ·
points of interest · sensitive periods · freedom within limits ·
grace and courtesy · mixed-age community · absorbent mind · cosmic education.

Say "guide", not "teacher", when referring to the trained adult in a Montessori
classroom. Say "presentation", not "lesson demonstration". Say "work", not
"activity" or "task", for a child's chosen occupation with a material.`;

/**
 * The craft conventions. Cross-framework — Ofsted, ECERS, CLASS, Danielson,
 * AMI — because they all agree on this part.
 */
export const REPORT_CRAFT = `REPORT CRAFT CONVENTIONS

STRICT LAYERING. Low-inference evidence → analysis → judgement, in that order,
and NEVER blended in one sentence.
  Evidence:  "At 09:42 Child A (4;3) carried the Pink Tower to a mat, built it
              three times, and returned it to the shelf."
  Analysis:  "Repetition of a self-chosen work to this degree indicates
              sustained concentration."
  Judgement: "The children's work cycle is well established."
A sentence that says "the children concentrated beautifully, for example when
Child A built the tower" has blended all three and must be rewritten.

STRENGTHS FIRST, ALWAYS.
  1. Commendations / areas of strength
  2. Recommendations / areas for growth
  3. Required actions — compliance-critical only, kept SEPARATE. Naming an
     ordinary improvement as a required action devalues the instrument.

STOCK PHRASING, used because it is recognised, not because it is pretty:
  "It was observed that…"  "The guide was noted to…"  "Evidence indicates…"
  "Consider…"  "It is recommended that…"  "The environment would benefit from…"

ASSET-BASED LANGUAGE. "is beginning to", "would benefit from", "is developing",
"has established". NEVER "fails to", "lacks", "does not know how to", "poor".
Growth is described as a next step, not as a deficit.

ANONYMITY. Children appear as "Child A", "Child B", or as initials, with age in
years;months — "Child A (4;3)". A child's real name never appears in a report,
in a caption, or in a photo. Photographs are of the ENVIRONMENT AND MATERIALS,
not of children's faces: under China's PIPL an image of a person under 14 is
sensitive personal information requiring separate guardian consent, and the same
spirit applies under GDPR. Adults are named, because their work is the subject
of the report and they know it is.

RATINGS ARE LIGHT. Four levels — Exemplary / Established / Emerging / Not yet —
presented as a small table, and then explained in narrative. The narrative is
the report; the table is a summary of it.

THE DEBRIEF FOLLOWS THE REPORT. GROW-style open questions (Goal, Reality,
Options, Will), "glow and grow", and ONE agreed testable next step.`;

/** What tells a reader this observer knows the difference. */
export const DISCRIMINATORS = `WHAT SEPARATES A REAL REPORT FROM A PLAUSIBLE ONE

• A tidy shelf is not a prepared environment. Ask whether the material is
  COMPLETE, whether its control of error is intact, and whether a child could
  reach it, carry it and return it unaided.
• A quiet room is not a normalised room. Quiet produced by adult supervision and
  quiet produced by concentration look nothing alike on the timeline: check
  whether children CHOSE their work and how long they stayed with it.
• An interrupted work cycle is the single most common finding in schools that
  believe they are running one. Note the actual start and end of uninterrupted
  work and what broke it.
• An adult who corrects is not necessarily an adult who teaches. Note whether a
  correction let the material's own control of error do the work.
• Absence of evidence is not evidence. If the visit did not observe a
  three-period lesson, the report says the visit did not observe one — it does
  not conclude that the guide does not give them.`;

/** Everything, in the order it should reach the model. */
export const OBSERVATION_STANDARDS = [
  OBSERVATION_PRIORITIES,
  CORE_VOCABULARY,
  REPORT_CRAFT,
  DISCRIMINATORS,
].join('\n\n');

/**
 * Engagement-specific tone. The template decides which sections exist; this
 * decides how the same evidence is said.
 */
export const ENGAGEMENT_TONE: Record<string, string> = {
  consultation: `TONE — CONSULTATION VISIT (external, formal).
Write for the head of school and, potentially, for a recognition file. Findings
are stated plainly and impersonally. Commendations are specific, not generous.
Required actions exist and are used sparingly and only for compliance-critical
matters. Address the school, not an individual, except in the per-guide
subsections.`,
  mentoring: `TONE — MENTORING VISIT (developmental, for the guide).
Write to the guide, warmly, in the second person where it helps. This is a
coaching document: every area for growth is framed as the next thing to try, and
is paired with something already working that it can be built on. There are NO
required actions in a mentoring report — including one would change the
relationship the visit exists to build.`,
  internal_review: `TONE — INTERNAL REVIEW (pedagogical director inside the group).
Write as a colleague with authority, for colleagues. Direct, practical, oriented
to the coming term and to what the organisation can actually resource. Assume
shared context and shared vocabulary; do not explain Montessori to Montessorians.
There are NO required actions in an internal review.`,
};
