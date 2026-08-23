// lib/montree/reports/monthly-all-areas-drafter.ts
//
// Sonnet drafts the all-areas Monthly Summary paragraph — forced tool,
// temperature 0 (house rule, extractor.ts: 13-15), grounded ONLY in the
// aggregate facts (period-area-facts.ts). Children are drafted in batches of
// DRAFT_CHUNK_SIZE (audit-fix Aug 23 2026 — one call for a 19-22 child
// classroom overran max_tokens and silently returned nothing usable).
// Falls back to the deterministic builder in
// lib/montree/weekly-admin/monthly-all-areas-builder.ts when AI is
// unavailable or the call fails, so the teacher's textarea is never empty.
//
// PLAN_ALL_AREAS_REPORTS_AUG22.md §8, Phase 7a.

import { callSonnetTool, chunkForDrafting } from './sonnet-tool-drafter';
import { AREA_LABELS_EN, type PeriodAreaFacts } from './period-area-facts';
import { buildFallbackAllAreasParagraph } from '@/lib/montree/weekly-admin/monthly-all-areas-builder';

export interface MonthlyDraftChild {
  childId: string;
  childName: string;
  facts: PeriodAreaFacts[];
}

const TOOL = {
  name: 'draft_monthly_all_areas_summary',
  description:
    'Draft one concise monthly-summary paragraph per child for a Montessori classroom, grounded ONLY in the aggregate facts supplied. One short sentence group per listed area (roughly 40-60 words per area), factual and observational, no invented works, dates, or outcomes. Areas not listed for a child must not be mentioned.',
  input_schema: {
    type: 'object',
    properties: {
      children: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            child_id: { type: 'string' },
            paragraph: {
              type: 'string',
              description:
                'The full monthly-summary paragraph for this child: one sentence group per listed area, concatenated with a space, each starting "In {Area}, ...".',
            },
          },
          required: ['child_id', 'paragraph'],
        },
      },
    },
    required: ['children'],
  },
} as const;

function factLine(f: PeriodAreaFacts): string {
  const bits: string[] = [`${AREA_LABELS_EN[f.area]}: ${f.sessions} session(s), ~${f.minutesEst} min`];
  if (f.topWorks.length) bits.push(`top works: ${f.topWorks.join(', ')}`);
  if (f.masteredWorks.length) bits.push(`mastered this period: ${f.masteredWorks.join(', ')}`);
  if (f.practicingWorks.length) bits.push(`moved to practicing this period: ${f.practicingWorks.join(', ')}`);
  if (f.presentedWorks.length) bits.push(`newly presented this period: ${f.presentedWorks.join(', ')}`);
  if (f.nextWork) bits.push(`recommended next work: ${f.nextWork}`);
  return bits.join('; ');
}

function monthNameFromLabel(monthLabel: string): string {
  return monthLabel.split(' ')[0] || monthLabel;
}

export async function draftMonthlyAllAreasParagraphs(
  monthLabel: string,
  classroomName: string,
  children: MonthlyDraftChild[],
): Promise<Record<string, string>> {
  const monthName = monthNameFromLabel(monthLabel);
  const out: Record<string, string> = {};
  // Seed every child with the deterministic fallback first — a partial or
  // failed AI response still leaves every child with grounded text.
  for (const c of children) {
    out[c.childId] = buildFallbackAllAreasParagraph(c.childName, c.facts, monthName);
  }

  const withData = children.filter((c) => c.facts.length > 0);
  if (withData.length === 0) return out;

  // One call per batch, sequentially. callSonnetTool already retries once per
  // call, so each chunk gets its own retry; a chunk that still fails leaves
  // exactly those children on the deterministic fallback seeded above and the
  // remaining chunks are still attempted.
  for (const batch of chunkForDrafting(withData)) {
    const lines = batch
      .map((c) => `- ${c.childName} (child_id: ${c.childId}):\n  ${c.facts.map(factLine).join('\n  ')}`)
      .join('\n');

    const userText = `Classroom: ${classroomName}. Month: ${monthLabel}.
Draft one monthly-summary paragraph per child below, grounded ONLY in the facts given — never invent a work name, session count, or outcome. Skip any area not listed for that child. Keep each area's sentence group roughly 40-60 words. Plain, factual Montessori-teacher tone — no adjectives like "loves" or "enjoys" unless implied by a mastery. End each child's paragraph with a brief forward-looking clause using their recommended next work, when one is given.

${lines}

Return a paragraph for every child_id listed (${batch.length} ${batch.length === 1 ? 'child' : 'children'}).`;

    const result = await callSonnetTool<{ children: Array<{ child_id: string; paragraph: string }> }>({
      tool: TOOL,
      userText,
      maxTokens: 4000,
    });
    if (!result || !Array.isArray(result.children)) continue; // this batch keeps its fallback

    const inBatch = new Set(batch.map((c) => c.childId));
    for (const row of result.children) {
      if (!row || typeof row.child_id !== 'string' || !inBatch.has(row.child_id)) continue;
      if (typeof row.paragraph === 'string' && row.paragraph.trim()) {
        out[row.child_id] = row.paragraph.trim();
      }
    }
  }
  return out;
}
