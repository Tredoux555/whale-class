// lib/lens/guru/draft-tool.ts
// The tool schema that makes the draft structured, and the prompt that goes
// with it.
//
// 🚨 TOOL USE, NOT "RETURN JSON". Asking a model for JSON in prose gets JSON
// most of the time and a markdown code fence, an apology, or a trailing comma
// the rest of the time — and a report generation that fails one time in twenty
// is a feature she stops trusting. A forced tool call gets a validated object
// from the API itself. lib/lens/reports/schema.ts still re-validates everything
// that comes back, because a schema-shaped object can still contain a section
// key we do not know or a moment id that does not exist.

import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { RATING_DOMAINS, RATING_LEVELS, type EngagementType } from '../types';
import { templateFor, type SectionTemplate } from '../reports/schema';

const listItemSchema = {
  type: 'object' as const,
  properties: {
    text_en: { type: 'string', description: 'The item, in English. One sentence or two.' },
    evidence: {
      type: 'array',
      items: { type: 'string' },
      description:
        'The moment ids this rests on, copied EXACTLY from the square brackets in THE MOMENTS. Empty is honest when there is no evidence; an invented id is not.',
    },
    priority: {
      type: 'integer',
      description: '1 is highest. Only for recommendations and required actions.',
    },
    owner: { type: 'string', description: 'Who does it. Only if the visit established one.' },
    due: {
      type: 'string',
      description:
        'YYYY-MM-DD only. Omit entirely rather than guessing — "end of term" is not a date and will be discarded.',
    },
  },
  required: ['text_en', 'evidence'],
};

/**
 * Build the tool for one engagement type. `sectionKeys` includes the per-staff
 * subsection keys the caller minted (`adults:<uuid>`), so the model is told the
 * exact set of keys that will survive validation.
 */
export function buildDraftTool(engagement: EngagementType, sectionKeys: string[]): Tool {
  const properties: Record<string, unknown> = {
    sections: {
      type: 'array',
      description: 'The narrative sections, in template order.',
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            enum: sectionKeys,
            description: 'MUST be one of these exact keys. Anything else is discarded.',
          },
          title: { type: 'string' },
          body_en: { type: 'string', description: 'The section prose, in English.' },
          evidence: {
            type: 'array',
            items: { type: 'string' },
            description: 'Moment ids this section draws on, copied exactly.',
          },
        },
        required: ['key', 'body_en', 'evidence'],
      },
    },
    ratings: {
      type: 'object',
      description:
        'The 4-level scale per domain. OMIT a domain you did not observe enough of to rate — a guessed rating is worse than a missing one.',
      properties: Object.fromEntries(
        RATING_DOMAINS.map((d) => [d, { type: 'string', enum: [...RATING_LEVELS] }]),
      ),
    },
    commendations: { type: 'array', items: listItemSchema },
    recommendations: { type: 'array', items: listItemSchema },
    next_steps: { type: 'array', items: listItemSchema },
  };

  if (engagement === 'consultation') {
    properties.required_actions = {
      type: 'array',
      items: listItemSchema,
      description:
        'COMPLIANCE-CRITICAL ONLY. Ratios, safety, a legal or affiliation requirement. An ordinary improvement is a recommendation; putting it here devalues the instrument. Usually empty.',
    };
  }

  return {
    name: 'write_report',
    description:
      'Write the observation report from the captured moments. Every section and every list item cites the moments it rests on.',
    input_schema: {
      type: 'object',
      properties,
      required: ['sections', 'commendations', 'recommendations', 'next_steps'],
    },
  } as Tool;
}

/** The per-section briefs, rendered for the user message. */
export function briefBlock(template: SectionTemplate[], staffSections: { key: string; name: string; role: string }[]): string {
  const lines: string[] = ['THE SECTIONS TO WRITE'];
  for (const section of template) {
    if (section.source === 'system') continue;
    if (section.key === 'adults' && staffSections.length > 0) {
      lines.push(`  ${section.key} — ${section.brief}`);
      lines.push(
        '    Write ONE section per adult using these exact keys instead of the bare "adults" key:',
      );
      for (const s of staffSections) {
        lines.push(`      ${s.key}  →  ${s.name} (${s.role})`);
      }
      continue;
    }
    lines.push(`  ${section.key} — ${section.brief}`);
  }
  return lines.join('\n');
}

export function draftUserPrompt(options: {
  context: string;
  briefs: string;
  engagement: EngagementType;
  extraInstruction?: string | null;
}): string {
  return [
    options.context,
    '',
    '---',
    '',
    options.briefs,
    '',
    '---',
    '',
    'Now call write_report.',
    '',
    'Before you do, read THE MOMENTS again and hold three things in mind:',
    '  • Write ONLY what the moments support. Where a section has no evidence,',
    '    say in that section that it was not observed, and leave its evidence',
    '    array empty. A short honest report beats a full invented one.',
    '  • Copy moment ids EXACTLY as they appear in the square brackets. An id',
    '    that does not match one of them is silently discarded, and the claim',
    '    it was attached to becomes an uncited judgement in her review queue.',
    '  • Evidence, then analysis, then judgement — in that order and in',
    '    separate sentences. This is the thing that makes it a report.',
    options.extraInstruction ? `\n${options.extraInstruction}` : '',
  ].join('\n');
}

export function templateForEngagement(engagement: EngagementType) {
  return templateFor(engagement);
}
