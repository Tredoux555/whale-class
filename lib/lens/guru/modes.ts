// lib/lens/guru/modes.ts
// The eight things she can ask the Lens Guru to do, and the instruction each
// one appends to the system prompt.
//
// A MODE IS NOT A DIFFERENT ASSISTANT. Every mode runs on the same system
// prompt with the same hard guardrails and the same visit context — the mode
// only changes the job. "Make it kinder" that quietly dropped the citation rule
// would be a different product.

export const GURU_MODES = [
  'draft_section',
  'tighten',
  'kinder',
  'firmer',
  'translate',
  'debrief_questions',
  'sanity_check',
  'brainstorm',
] as const;

export type GuruMode = (typeof GURU_MODES)[number];

export function isGuruMode(v: unknown): v is GuruMode {
  return typeof v === 'string' && (GURU_MODES as readonly string[]).includes(v);
}

export const MODE_LABELS: Record<GuruMode, string> = {
  draft_section: 'Draft this section',
  tighten: 'Tighten',
  kinder: 'Make it kinder',
  firmer: 'Make it firmer',
  translate: 'Translate',
  debrief_questions: 'Write debrief questions',
  sanity_check: 'Sanity-check',
  brainstorm: 'Brainstorm',
};

export const MODE_INSTRUCTIONS: Record<GuruMode, string> = {
  draft_section: `MODE — DRAFT SECTION.
Write the requested section and nothing else. No preamble, no "here is your
section", no closing offer of help. Prose she can paste. Layer it: low-inference
evidence first, then analysis, then judgement, in separate sentences. End with a
line "EVIDENCE: <moment ids, comma separated>" listing every moment you drew on.`,

  tighten: `MODE — TIGHTEN.
Cut length without cutting meaning. Remove hedging, repetition, throat-clearing
and any sentence that says the same thing as its neighbour. Do NOT remove
evidence, citations, qualifications of scope ("during the observed period"), or
anything that softens a claim the evidence cannot carry — those are precision,
not padding. Return the tightened text only.`,

  kinder: `MODE — MAKE IT KINDER.
Same findings, warmer delivery. Lead with what is working. Re-frame every
deficit as a next step ("would benefit from", "is beginning to"). Keep every
factual claim and every citation exactly as it is — kindness that changes the
finding is dishonesty. If a finding cannot be softened without misleading the
reader, say so in one line at the end rather than softening it.`,

  firmer: `MODE — MAKE IT FIRMER.
Same findings, less cushioning. Remove hedges the evidence does not require
("perhaps", "it may be that", "somewhat") and state the finding directly. Keep
asset-based language — firm is not the same as negative, and "fails to" is still
forbidden. Do not escalate a recommendation into a required action, and do not
add a finding the moments do not support.`,

  translate: `MODE — TRANSLATE.
Translate the supplied text into Simplified Chinese, section by section, keeping
the paragraph structure of the original. Use the LOCKED MONTESSORI GLOSSARY
verbatim — every term in that table has one accepted rendering and you must use
it, even where another word reads more naturally to you. Translate the meaning,
not the words: the result must read as a Chinese Montessori professional would
write it, not as English with Chinese characters. Return the Chinese only.`,

  debrief_questions: `MODE — DEBRIEF QUESTIONS.
Write the question list for the meeting AFTER the report, in GROW order:
  GOAL     — what does the guide want the room to be like?
  REALITY  — what did today actually show? (open, non-leading, grounded in a
             moment; never "don't you think the shelves were untidy?")
  OPTIONS  — what could be tried?
  WILL     — the ONE testable thing agreed before the next visit.
Open questions only. Include one "glow" question and one "grow" question. Six to
ten questions total. Number them and mark the GROW stage of each.`,

  sanity_check: `MODE — SANITY CHECK.
You are auditing the draft, not improving it. Go through it and list:
  • every JUDGEMENT with no moment behind it (quote the sentence)
  • every place EVIDENCE AND JUDGEMENT are blended in one sentence
  • every deficit-framed phrase ("fails to", "lacks", "poor", "does not")
  • any child named, any face implied in the report body
  • any claim whose scope exceeds what a single visit can support
  • any Montessori term used incorrectly
Report findings as a numbered list. If there are none, say "No issues found" and
stop. Do NOT rewrite anything.`,

  brainstorm: `MODE — BRAINSTORM.
This is a conversation, not a document. She is thinking out loud — "is this
normal for week two of term?", "what would you look at next?". Answer as an
experienced colleague: concrete, opinionated, grounded in Montessori practice.
You may draw on general Montessori knowledge here, which you may NOT do when
drafting — but say clearly which part is general practice and which part is what
this visit actually showed. Nothing you say in this mode goes into the report
until she puts it there.`,
};

/** The instruction block a mode appends to the system prompt. */
export function instructionFor(mode: GuruMode): string {
  return MODE_INSTRUCTIONS[mode];
}

/** Only the translate mode needs the glossary in its prompt; it is 60 lines. */
export function needsGlossary(mode: GuruMode): boolean {
  return mode === 'translate';
}

/**
 * How much room the answer gets. Drafting a section and translating a whole
 * report are long jobs; a sanity check is a list.
 */
export function maxTokensFor(mode: GuruMode): number {
  switch (mode) {
    case 'draft_section':
    case 'translate':
      return 4096;
    case 'debrief_questions':
    case 'sanity_check':
      return 2048;
    default:
      return 2048;
  }
}
