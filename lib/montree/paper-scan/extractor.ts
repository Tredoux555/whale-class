// lib/montree/paper-scan/extractor.ts
//
// The vision call that reads a photographed handwritten record sheet into
// structured data.
//
// The tool schema + prompt below are PORTED VERBATIM (adapted only for the
// works reading aid) from the smoke-tested extraction harness
// `extract-sheet.mjs` v0.1.1, which scored 100% on the test sheet. Changing
// the wording is changing the accuracy — re-run the harness before you touch
// a sentence here.
//
// 🚨 temperature: 0 is a house rule for every durable extraction call. Do not
// remove it; a non-deterministic transcription of a teacher's handwriting is
// worse than no transcription.
//
// MODEL: AI_MODEL (Sonnet) since Aug 2026 — Haiku could not hold the sheet's
// legend and the page at the same time once frequency / time bucket /
// concentration joined the schema, and Layer 1 layout profiles (layout-types.ts)
// are written for a reader that can follow them. ~3-4x the per-scan cost of
// Haiku on ~40 scans a month per classroom: accepted, see the plan's §11.2.

import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import type { SheetLayoutProfile } from './layout-types';
import type {
  ExtractSheetResult,
  PaperScanRosterEntry,
  PaperScanWorkEntry,
  SheetExtraction,
} from './types';

const AREA_ENUM = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
const STATUS_ENUM = ['presented', 'practicing', 'mastered'] as const;
const BUCKET_ENUM = ['short', 'medium', 'long'] as const;
const CONCENTRATION_ENUM = ['wd', 'wc', 'dc'] as const;

// Sonnet writes longer notes than Haiku did and the entries carry three more
// fields each; 12k keeps a 20-child sheet inside one response. Truncation is
// still retried once below.
const MAX_TOKENS = 12000;
const RETRY_DELAY_MS = 2500;

/** Ordered so the prompt's works block always reads in curriculum order. */
const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

export const EXTRACTION_TOOL = {
  name: 'record_sheet_extraction',
  description:
    'Record everything transcribed from this classroom record sheet. Call this exactly once with the complete reading of the page.',
  input_schema: {
    type: 'object' as const,
    properties: {
      sheet_summary: {
        type: 'string',
        description: '2-3 sentences: what kind of document this is, and how legible it is overall.',
      },
      format_description: {
        type: 'string',
        description:
          "The sheet's layout system described precisely: columns and their verbatim headers, row structure, "
          + 'every symbol and shorthand code observed and what it appears to mean, any pre-printed vs handwritten distinction.',
      },
      sheet_date: { type: ['string', 'null'], description: 'Date written on the sheet, exactly as written.' },
      class_or_group_name: { type: ['string', 'null'] },
      teacher_name: { type: ['string', 'null'] },
      children: {
        type: 'array',
        description: 'One object per child appearing on the sheet, in the order they appear.',
        items: {
          type: 'object',
          properties: {
            child_name_raw: { type: 'string', description: 'The name exactly as written, including misspellings.' },
            name_legibility: { type: 'string', enum: ['clear', 'partial', 'guess'] },
            entries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  work_name_raw: { type: ['string', 'null'], description: 'Work/material name exactly as written.' },
                  area: { type: ['string', 'null'], enum: [...AREA_ENUM, null] },
                  status: { type: ['string', 'null'], enum: [...STATUS_ENUM, null] },
                  frequency: {
                    type: ['integer', 'null'],
                    description:
                      'Number of tally strokes / ticks / repeated marks for this work on this sheet — how many times the child chose it. '
                      + 'null if the sheet has no tally for it (an empty tally box is null, not 0).',
                  },
                  time_bucket: {
                    type: ['string', 'null'],
                    enum: [...BUCKET_ENUM, null],
                    description:
                      'Rough time: short = under 15 minutes, medium = 15-30, long = 30+. Read it from a filled time bubble '
                      + '(\u25CB<15 / \u25CB15-30 / \u25CB30+), a written range, or an equivalent mark. null when nothing is marked.',
                  },
                  concentration: {
                    type: ['string', 'null'],
                    enum: [...CONCENTRATION_ENUM, null],
                    description:
                      'AMI concentration code: wd = working distracted, WC = working concentrated, DC = deep concentration. '
                      + 'Lower-case the code. null when the sheet carries none.',
                  },
                  time_minutes: {
                    type: ['integer', 'null'],
                    description:
                      'EXACT minutes only — a written number of minutes or a clock range you can subtract ("9:15-9:40" = 25). '
                      + 'Never convert a bucket bubble or a tally into minutes; leave this null and use time_bucket / frequency.',
                  },
                  note: { type: ['string', 'null'], description: 'Any note attached to this entry, original language.' },
                  field_confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                },
                required: [
                  'work_name_raw', 'area', 'status', 'frequency', 'time_bucket', 'concentration',
                  'time_minutes', 'note', 'field_confidence',
                ],
              },
            },
            general_note: { type: ['string', 'null'], description: 'A note about this child not tied to one work.' },
          },
          required: ['child_name_raw', 'name_legibility', 'entries', 'general_note'],
        },
      },
      unattributed_notes: {
        type: 'array',
        description: 'Observations on the page not clearly tied to any one child.',
        items: { type: 'string' },
      },
      illegible_regions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Where on the sheet, e.g. "row 4, notes column".' },
            best_guess: { type: ['string', 'null'] },
          },
          required: ['location', 'best_guess'],
        },
      },
      overall_confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      detected_template_code: {
        type: ['string', 'null'],
        description:
          'A printed template/QR code on the page, e.g. "MT-STD-1" (it may be followed by "|classroom|date|page"). '
          + 'Report the code exactly as printed, or null when the page carries none.',
      },
      layout_match: {
        type: 'string',
        enum: ['matches', 'partial', 'mismatch', 'no_profile'],
        description:
          'Only meaningful when a KNOWN SHEET LAYOUT block was supplied: matches / partial / mismatch. '
          + 'Use no_profile when no layout was described to you.',
      },
    },
    required: [
      'sheet_summary', 'format_description', 'sheet_date', 'class_or_group_name', 'teacher_name',
      'children', 'unattributed_notes', 'illegible_regions', 'overall_confidence',
      'detected_template_code', 'layout_match',
    ],
  },
};

/**
 * Strip control characters from roster/works names before they enter the
 * prompt — same defence context-loader.ts applies to DB-sourced work names.
 */
function sanitizeForPrompt(input: string, maxLen: number = 120): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[\n\r\t`<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function buildWorksBlock(works: PaperScanWorkEntry[]): string {
  const byArea = new Map<string, string[]>();
  for (const w of works) {
    const name = sanitizeForPrompt(w.name);
    if (!name) continue;
    const area = w.area_key && AREA_LABELS[w.area_key] ? w.area_key : 'other';
    const list = byArea.get(area) || [];
    if (!list.includes(name)) list.push(name);
    byArea.set(area, list);
  }

  const orderedAreas = [...Object.keys(AREA_LABELS), 'other'];
  const sections: string[] = [];
  for (const area of orderedAreas) {
    const names = byArea.get(area);
    if (!names || names.length === 0) continue;
    const label = AREA_LABELS[area] || 'Other';
    sections.push(`${label}: ${names.join(', ')}`);
  }
  return sections.join('\n');
}

/**
 * Render an active layout profile into the prompt block that overrides the
 * generic legend paragraphs. Pure — exported for tests.
 *
 * The profile is machine-written (Layer 1) or teacher-edited, so it is treated
 * as data, not instructions: it is serialised as JSON inside a labelled block
 * and the instruction that surrounds it is ours, not the profile's.
 */
export function buildLayoutBlock(layout: SheetLayoutProfile | null | undefined): string {
  if (!layout || typeof layout !== 'object') return '';

  const body = {
    sheet_name: layout.sheet_name,
    orientation: layout.orientation,
    language: layout.language,
    unit: layout.unit,
    header: layout.header,
    structure: layout.structure,
    legend: layout.legend,
    machine_marks: layout.machine_marks ?? null,
  };

  const instructions = typeof layout.reading_instructions === 'string' ? layout.reading_instructions.trim() : '';
  const pitfalls = Array.isArray(layout.pitfalls) ? layout.pitfalls.filter((p) => typeof p === 'string' && p.trim()) : [];

  return [
    '',
    'KNOWN SHEET LAYOUT — this classroom has already taught Montree how its sheet works. Use it to locate every field and to decode every mark. Where it speaks, it OVERRIDES the generic legend above (status marks, time buckets, tallies, concentration codes, area abbreviations). Where it is silent, fall back to the generic rules. If the page in front of you clearly is not this sheet, say so in format_description, set layout_match to "mismatch", and read the page on its own terms.',
    '',
    JSON.stringify(body, null, 0),
    '',
    instructions ? `READING INSTRUCTIONS FOR THIS SHEET:\n${instructions}` : '',
    pitfalls.length > 0 ? `KNOWN PITFALLS ON THIS SHEET:\n- ${pitfalls.join('\n- ')}` : '',
    '',
    'Set layout_match to "matches" when the page follows this layout, "partial" when it mostly does, "mismatch" when it does not.',
  ].filter(Boolean).join('\n');
}

/**
 * Build the extraction prompt. Roster and works are READING AIDS with
 * identical trust rules: they help decode handwriting, they never license
 * inventing an entry that is not on the page.
 */
export function buildSheetExtractionPrompt(opts: {
  roster: PaperScanRosterEntry[];
  works: PaperScanWorkEntry[];
  locale?: string;
  /** Layer 1 profile for this classroom's sheet, when one is active. */
  layout?: SheetLayoutProfile | null;
}): string {
  const parts: string[] = [];

  parts.push(
`You are reading a photograph of a Montessori teacher's handwritten classroom record sheet and transcribing it into structured data using the record_sheet_extraction tool.

Teachers design these sheets themselves, so the layout is arbitrary — a grid, a journal page, a checklist, a page torn from a notebook. Read the page on its own terms: work out its system first, then transcribe it.

THE ONE RULE THAT MATTERS: transcribe what is WRITTEN. You are a transcriber, not an interpreter and not a helper. Never invent, complete, correct or "improve" anything on the page. A blank is data — leave it null. Inventing a plausible work name for an illegible scrawl is the single worst failure you can produce here, far worse than admitting you cannot read it.

HOW TO HANDLE UNCERTAINTY
- If a field is unreadable, set it to null and add an entry to illegible_regions with location and, if you have one, a best_guess.
- If a field is readable but you are not sure, transcribe it and set field_confidence to medium or low. Use high only when you genuinely can read it cleanly.
- If a child's name is hard to read, still transcribe your best reading into child_name_raw and set name_legibility to 'partial' or 'guess'. Never drop a child.
- Never translate. Notes stay in the language they were written in.
- Child names go in exactly as written, including misspellings, nicknames and initials. Do not normalise or correct them.

STATUS MARKS — only assign a status when the sheet's own marks or words support it. If the sheet says nothing about status, status is null.
- Triangle convention (near universal in Montessori): one side drawn = presented; two sides = practicing; closed/filled triangle = mastered.
- Letter codes: P = presented, W (or Pr) = working/practicing, M = mastered.
- Tick conventions: a single tick usually means presented; repeated ticks or a circled/highlighted tick often mean practicing or mastered — only read this when the sheet has a legend or the pattern is unambiguous. Otherwise leave status null and put what you saw in the note.
- If the sheet uses a symbol system you cannot decode with confidence, describe it in format_description, put the raw mark in the note, and leave status null.

AMI CONCENTRATION CODES — wd = working distracted, WC = working concentrated, DC = deep concentration. Also (ic)/(sc)/(dc) for choice. These are NOT statuses. Put the code in the entry's concentration field (lower-cased: wd / wc / dc); do not copy it into the note as well. A code that sits beside a child rather than a work applies to every entry of that child on this sheet.

CURRICULUM AREAS — map to one of: practical_life, sensorial, mathematics, language, cultural. Recognise the usual abbreviations: PL / P.L. / Practical = practical_life; Sens / S = sensorial; Math / M / Maths = mathematics; Lang / L = language; Cult / C / Culture / Geography / Botany / Zoology / History / Science = cultural. If the area is neither written nor obvious from the work name, leave it null — do not infer aggressively.

TIME AND REPETITION — three separate fields, never mixed:
- time_bucket: a marked bucket bubble or its equivalent — "<15" / "under 15" = short, "15-30" = medium, "30+" / "45" / "an hour" = long. A written range also fills this (e.g. "20-30" = medium). null when nothing on the page says how long.
- frequency: how many tally strokes / ticks / repeated marks sit against that work — the number of times the child chose it. A crossed group of five counts 5. An empty tally box is null, NOT 0.
- time_minutes: EXACT minutes only — a written number of minutes, or a clock range you can subtract ("9:15-9:40" = 25). Never derive minutes from a bucket bubble or a tally; leave it null and let time_bucket / frequency carry the reading.
Anything genuinely ambiguous stays null with what you saw recorded in the note.

TEMPLATE CODE — if the page carries a printed or QR-encoded template code (e.g. "MT-STD-1|<classroom>|<date>|1/2"), report the code part in detected_template_code.

FORMAT_DESCRIPTION — be precise and concrete here. Quote column headers verbatim, list every symbol and code you saw with your reading of it, and say what is pre-printed versus handwritten. This field is used to design future record sheets, so detail is valuable.

Anything on the page that is clearly an observation but not tied to a specific child (a footer note, a margin comment about the class) goes in unattributed_notes.

Call record_sheet_extraction exactly once with your complete reading.`
  );

  // Layer 1 profile (see layout-learner.ts). It goes BEFORE the reading aids so
  // the model has the page's own system in hand before it meets the vocabulary,
  // and it explicitly overrides the generic legend paragraphs above.
  const layoutBlock = buildLayoutBlock(opts.layout);
  if (layoutBlock) parts.push(layoutBlock);

  const rosterNames = opts.roster
    .map((c) => sanitizeForPrompt(c.name))
    .filter(Boolean);
  if (rosterNames.length > 0) {
    // Reading aid only — matching happens deterministically afterwards.
    parts.push(
      `\nCLASS ROSTER (reading aid only — these are the children who may appear on this sheet. ` +
      `Use it to read difficult handwriting, but STILL transcribe each name exactly as written on the page, ` +
      `not as spelled here. Do NOT add a child who is not on the sheet):\n${rosterNames.join(', ')}`
    );
  }

  const worksBlock = buildWorksBlock(opts.works);
  if (worksBlock) {
    // Same trust rules as the roster: decode handwriting, never invent.
    parts.push(
      `\nCLASSROOM WORKS (reading aid only — the materials this classroom actually has, grouped by area. ` +
      `Use it to read difficult handwriting and abbreviations, but STILL transcribe each work exactly as ` +
      `written on the page, not as spelled here. Do NOT add a work that is not on the sheet, and do NOT ` +
      `substitute a listed work for something you cannot read — leave it null):\n${worksBlock}`
    );
  }

  if (opts.locale && opts.locale !== 'en') {
    parts.push(
      `\nThe teacher's interface language is "${sanitizeForPrompt(opts.locale, 12)}". The sheet may be ` +
      `written in that language, in English, or in a mix. Transcribe in the language written — never translate.`
    );
  }

  return parts.join('\n');
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pull the forced tool_use payload out of a response, or null if it isn't
 * there / is unusable. A max_tokens truncation can yield a structurally
 * present but incomplete payload — the children[] check catches that.
 */
function readToolResult(msg: {
  content: Array<{ type: string; name?: string; input?: unknown }>;
}): SheetExtraction | null {
  const block = (msg?.content || []).find(
    (b) => b.type === 'tool_use' && b.name === EXTRACTION_TOOL.name
  );
  if (!block || !block.input || typeof block.input !== 'object') return null;
  const input = block.input as Partial<SheetExtraction>;
  if (!Array.isArray(input.children)) return null;
  return input as SheetExtraction;
}

/**
 * One sheet → one structured reading.
 *
 * Single retry on refusal / truncation / transient API error (429, 5xx,
 * network) — ported from the harness. Throws on hard failure; the caller
 * records the scan as 'failed' and never lets it escape as a 500 crash.
 */
export async function extractSheet(opts: {
  imageBase64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  roster: PaperScanRosterEntry[];
  works: PaperScanWorkEntry[];
  locale?: string;
  /** Layer 1: the classroom's active sheet layout profile, when it has one. */
  layout?: SheetLayoutProfile | null;
}): Promise<ExtractSheetResult> {
  if (!anthropic) {
    throw new Error('Anthropic client not configured (ANTHROPIC_API_KEY missing)');
  }

  const prompt = buildSheetExtractionPrompt({
    roster: opts.roster,
    works: opts.works,
    locale: opts.locale,
    layout: opts.layout ?? null,
  });

  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = attempt === 1
      ? prompt
      : prompt + '\n\nYOUR PREVIOUS ATTEMPT DID NOT RETURN A USABLE record_sheet_extraction TOOL CALL. '
        + 'Return the tool call this time, and keep notes concise so the output completes.';

    let msg;
    try {
      msg = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0, // house rule: every durable extraction call is deterministic
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: 'tool', name: EXTRACTION_TOOL.name },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: opts.mediaType, data: opts.imageBase64 } },
            { type: 'text', text },
          ],
        }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the ported tool schema uses JSON-Schema union types the SDK's narrow Tool type doesn't model
      } as any);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const status = (err as { status?: number; response?: { status?: number } })?.status
        ?? (err as { response?: { status?: number } })?.response?.status;
      const transient = status === 429 || (typeof status === 'number' && status >= 500 && status < 600) || !status;
      if (attempt === 1 && transient) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw new Error(`API error${status ? ` (${status})` : ''}: ${lastErr.message}`);
    }

    const result = readToolResult(msg as unknown as { content: Array<{ type: string; name?: string; input?: unknown }> });
    if (result) {
      const usage = (msg as { usage?: { input_tokens?: number; output_tokens?: number } }).usage || null;
      const stopReason = (msg as { stop_reason?: string | null }).stop_reason ?? null;
      return { result, model: AI_MODEL, usage, stopReason };
    }

    const stopReason = (msg as { stop_reason?: string | null }).stop_reason ?? null;
    lastErr = new Error(
      `model returned no usable tool call (stop_reason: ${stopReason})` +
      (stopReason === 'max_tokens' ? ' — output was truncated at max_tokens' : '')
    );
    if (attempt === 1) continue;
  }

  throw lastErr || new Error('Sheet extraction failed');
}
