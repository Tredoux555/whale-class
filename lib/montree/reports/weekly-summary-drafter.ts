// lib/montree/reports/weekly-summary-drafter.ts
//
// Sonnet drafts the Weekly Summary text — one English sentence per child
// covering the whole week across areas, plus one Chinese line per active
// area (日常/感官/数学/语言/文化) — grounded ONLY in the aggregate facts
// (period-area-facts.ts). Children are drafted in batches of
// DRAFT_CHUNK_SIZE (audit-fix Aug 23 2026 — one call for a 19-22 child
// classroom overran max_tokens and silently returned nothing usable).
// Forced tool, temperature 0 (house rule,
// extractor.ts:13-15). We ask Sonnet only for the short Chinese PHRASE per
// area and assemble the "标签：phrase" line ourselves, so the label text is
// never something the model could drift on. Falls back to the deterministic
// builders in weekly-summary-all-areas-builder.ts when AI is unavailable or
// the call fails, so the teacher's textarea is never empty.
//
// PLAN_ALL_AREAS_REPORTS_AUG22.md §8, Phase 7b.

import { callSonnetTool, chunkForDrafting } from './sonnet-tool-drafter';
import { AREA_ORDER, type AreaKey, type ChildAggregate } from './period-types';
import { AREA_LABELS_EN, AREA_LABELS_ZH, buildActiveAreaFacts, type PeriodAreaFacts } from './period-area-facts';
import {
  buildFallbackChineseLines,
  buildFallbackWeeklySentence,
} from '@/lib/montree/weekly-admin/weekly-summary-all-areas-builder';

export interface WeeklyDraftResult {
  english: string;
  chinese: string;
}

const TOOL = {
  name: 'draft_weekly_summary',
  description:
    "Draft the Weekly Summary text for each child in a Montessori classroom, grounded ONLY in the aggregate facts supplied for that child. Never invent a work name, session count, or area not listed. One English sentence (or two short ones, 20-40 words total) covering the whole week across the child's listed areas, ending with a brief forward-looking clause. Plus one short Chinese phrase per listed area (5-15 characters, no label, no leading punctuation — the caller adds the area label) describing what the child worked on.",
  input_schema: {
    type: 'object',
    properties: {
      children: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            child_id: { type: 'string' },
            english_sentence: { type: 'string' },
            area_lines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  area: {
                    type: 'string',
                    enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'],
                  },
                  chinese: { type: 'string' },
                },
                required: ['area', 'chinese'],
              },
            },
          },
          required: ['child_id', 'english_sentence', 'area_lines'],
        },
      },
    },
    required: ['children'],
  },
} as const;

function factLine(f: PeriodAreaFacts): string {
  const bits: string[] = [`${AREA_LABELS_EN[f.area]}: ${f.sessions} session(s), ~${f.minutesEst} min`];
  if (f.topWorks.length) bits.push(`works: ${f.topWorks.join(', ')}`);
  if (f.masteredWorks.length) bits.push(`mastered this week: ${f.masteredWorks.join(', ')}`);
  if (f.practicingWorks.length) bits.push(`moved to practicing: ${f.practicingWorks.join(', ')}`);
  if (f.presentedWorks.length) bits.push(`newly presented: ${f.presentedWorks.join(', ')}`);
  if (f.nextWork) bits.push(`recommended next: ${f.nextWork}`);
  return bits.join('; ');
}

/** Assemble "标签：phrase" lines in AREA_ORDER, restricted to areas we actually asked about. */
function assembleChinese(areaLines: Array<{ area: string; chinese: string }>, allowedAreas: Set<AreaKey>): string {
  const out: string[] = [];
  for (const area of AREA_ORDER) {
    if (!allowedAreas.has(area)) continue;
    const row = areaLines.find((l) => l.area === area);
    if (row && typeof row.chinese === 'string' && row.chinese.trim()) {
      out.push(`${AREA_LABELS_ZH[area]}：${row.chinese.trim()}`);
    }
  }
  return out.join('\n');
}

export async function draftWeeklySummaries(
  weekLabel: string,
  classroomName: string,
  children: Array<{ childId: string; child: ChildAggregate }>,
): Promise<Record<string, WeeklyDraftResult>> {
  const out: Record<string, WeeklyDraftResult> = {};
  const factsByChild = new Map<string, PeriodAreaFacts[]>();
  for (const { childId, child } of children) {
    const facts = buildActiveAreaFacts(child);
    factsByChild.set(childId, facts);
    out[childId] = {
      english: buildFallbackWeeklySentence(child),
      chinese: buildFallbackChineseLines(facts),
    };
  }

  const withData = children.filter((c) => (factsByChild.get(c.childId) || []).length > 0);
  if (withData.length === 0) return out;

  // One call per batch, sequentially. callSonnetTool already retries once per
  // call, so each chunk gets its own retry; a chunk that still fails leaves
  // exactly those children on the deterministic fallback seeded above and the
  // remaining chunks are still attempted.
  for (const batch of chunkForDrafting(withData)) {
    const lines = batch
      .map(({ childId, child }) => {
        const facts = factsByChild.get(childId) || [];
        return `- ${child.name} (child_id: ${childId}):\n  ${facts.map(factLine).join('\n  ')}`;
      })
      .join('\n');

    const userText = `Classroom: ${classroomName}. Week: ${weekLabel}.
Draft the Weekly Summary for each child below, grounded ONLY in the facts given. Do not mention an area that is not listed for that child. Keep the English sentence 20-40 words. Chinese area phrases are short (5-15 characters), factual, no punctuation prefix, no area label (the caller adds it).

${lines}

Return an entry for every child_id listed (${batch.length} ${batch.length === 1 ? 'child' : 'children'}), with an area_lines row for every area listed for that child.`;

    const result = await callSonnetTool<{
      children: Array<{ child_id: string; english_sentence: string; area_lines: Array<{ area: string; chinese: string }> }>;
    }>({ tool: TOOL, userText, maxTokens: 4000 });

    if (!result || !Array.isArray(result.children)) continue; // this batch keeps its fallback

    const inBatch = new Set(batch.map((c) => c.childId));
    for (const row of result.children) {
      if (!row || typeof row.child_id !== 'string' || !inBatch.has(row.child_id)) continue;
      const facts = factsByChild.get(row.child_id);
      if (!facts) continue; // unknown child_id — ignore, keep fallback
      const allowed = new Set(facts.map((f) => f.area));
      const english =
        typeof row.english_sentence === 'string' && row.english_sentence.trim()
          ? row.english_sentence.trim()
          : out[row.child_id]?.english || '';
      const chinese = Array.isArray(row.area_lines) ? assembleChinese(row.area_lines, allowed) : '';
      out[row.child_id] = {
        english: english || out[row.child_id]?.english || '',
        chinese: chinese || out[row.child_id]?.chinese || '',
      };
    }
  }
  return out;
}
