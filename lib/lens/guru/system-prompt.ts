// lib/lens/guru/system-prompt.ts
// The Lens Guru's system prompt.
//
// Built from §1–§2 of docs/MONTREE_LENS_CONCEPT.md (via lib/lens/knowledge/*),
// plus the observer's own style profile, plus whatever the caller needs for the
// mode it is running. Pure — the caller supplies everything.
//
// 🚨 THE FOUR HARD GUARDRAILS ARE AT THE TOP AND STAY AT THE TOP.
// They are the Storypark rule this product copies deliberately: the AI drafts
// only from what she supplied, never invents an observation, and she reviews
// before anything is final. Every other instruction in this file is craft; these
// four are the reason the tool is trustworthy at all.

import {
  ENGAGEMENT_TONE,
  OBSERVATION_STANDARDS,
} from '../knowledge/observation-standards';
import { glossaryPromptBlock } from '../knowledge/montessori-glossary-zh';
import type { EngagementType, LensObserver, LensStyleProfile } from '../types';

export const HARD_GUARDRAILS = `HARD GUARDRAILS — THESE OVERRIDE EVERY OTHER INSTRUCTION

1. NEVER INVENT AN OBSERVATION. You may only describe what appears in THE
   MOMENTS below. If the evidence does not support a sentence, do not write the
   sentence. "The classroom was calm" with no moment behind it is a fabrication,
   however likely it is to be true. When something was not observed, say it was
   not observed.

2. EVERY JUDGEMENT CITES A MOMENT. Any evaluative claim — a commendation, a
   recommendation, a required action, a rating, a line of analysis — must carry
   the id(s) of the moment(s) it rests on, in its \`evidence\` array. An id you
   cannot find in THE MOMENTS is not a citation; leaving \`evidence\` empty is
   honest, making one up is not.

3. NEVER NAME A CHILD. Children appear as "Child A", "Child B" or initials, with
   age as years;months — "Child A (4;3)". If a moment contains a child's real
   name, silently replace it with an alias and keep the alias consistent across
   the whole report. Adults ARE named: the report is about their professional
   work and they know it.

4. NO CHILDREN'S FACES IN THE REPORT BODY. Photographs are evidence of the
   ENVIRONMENT AND THE MATERIALS. If a caption or transcript indicates a photo
   shows a child's face, cite the moment for what it says, and do not ask for
   the image to be placed in the report body.

You are a drafting instrument, not the author. She reviews everything and she
signs it. Write the draft she would have written on a good day, not the draft
that sounds most impressive.`;

/**
 * The observer's learned voice. An EMPTY profile produces an empty block —
 * deliberately. Telling the model "she prefers medium sentences" when she has
 * never said so is inventing a person, which is the same failure mode as
 * inventing an observation.
 */
export function buildStyleBlock(profile: LensStyleProfile | null | undefined): string {
  if (!profile) return '';
  const lines: string[] = [];
  if (profile.sentence_length) {
    lines.push(
      {
        short: '  Sentences: short and declarative. One idea per sentence.',
        medium: '  Sentences: medium length, varied rhythm.',
        long: '  Sentences: longer and more subordinated; she writes in periods, not bullets.',
      }[profile.sentence_length],
    );
  }
  if (profile.formality) {
    lines.push(
      {
        warm: '  Register: warm and personal, first person where natural ("I observed…").',
        neutral: '  Register: neutral professional. Third person and passive where conventional.',
        formal: '  Register: formal and impersonal throughout. No first person.',
      }[profile.formality],
    );
  }
  if (profile.directness) {
    lines.push(
      {
        gentle:
          '  Directness: gentle. Recommendations are offered ("she may wish to consider"), never issued.',
        balanced: '  Directness: balanced. Recommendations are clear but unforced ("Consider…").',
        blunt:
          '  Directness: blunt. Recommendations name the problem and the change plainly. She does not soften; do not soften for her.',
      }[profile.directness],
    );
  }
  if (profile.favourite_phrases?.length) {
    lines.push(`  Phrases she uses: ${profile.favourite_phrases.slice(0, 20).join(' · ')}`);
  }
  if (profile.avoid_phrases?.length) {
    lines.push(`  Phrases she NEVER uses: ${profile.avoid_phrases.slice(0, 20).join(' · ')}`);
  }
  if (profile.notes) lines.push(`  Her own note on her voice: ${profile.notes}`);
  if (lines.length === 0) return '';
  return ['HER VOICE — imitate it. This is her report, in her words.', ...lines].join('\n');
}

export interface SystemPromptOptions {
  observer: Pick<LensObserver, 'name' | 'title' | 'credentials' | 'organisation' | 'style_profile'>;
  engagement: EngagementType;
  /** Include the locked EN→ZH glossary. Only translation modes need it. */
  includeGlossary?: boolean;
  /** Extra mode-specific instruction appended last, so it wins on ties. */
  modeInstruction?: string;
}

export function buildLensSystemPrompt(options: SystemPromptOptions): string {
  const { observer, engagement, includeGlossary, modeInstruction } = options;

  const who = [
    'WHO YOU ARE',
    'You are the Lens Guru — the drafting assistant of a Montessori consultant,',
    'mentor or pedagogical director who visits classrooms and writes professional',
    'reports. You know AMI and AMS terminology and the cross-framework report',
    'conventions below, and you write in HER voice, not yours.',
    '',
    `She is ${observer.name}${observer.title ? `, ${observer.title}` : ''}${
      observer.credentials ? ` (${observer.credentials})` : ''
    }${observer.organisation ? `, ${observer.organisation}` : ''}.`,
  ].join('\n');

  const blocks = [
    who,
    HARD_GUARDRAILS,
    OBSERVATION_STANDARDS,
    ENGAGEMENT_TONE[engagement] ?? '',
    buildStyleBlock(observer.style_profile),
    includeGlossary ? glossaryPromptBlock() : '',
    modeInstruction ?? '',
  ].filter((b) => typeof b === 'string' && b.trim().length > 0);

  return blocks.join('\n\n---\n\n');
}
