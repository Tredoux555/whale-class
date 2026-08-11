// lib/montree/photo-onboarding/extractor.ts
//
// The model call that reads an uploaded class list into structured students.
//
// Four input shapes reach the SAME tool + prompt, so accuracy doesn't depend
// on which format the school happened to hand the teacher:
//   photo → image content block
//   pdf   → document content block (works on scanned PDFs, which have no text
//           layer at all — that is the whole reason we don't pre-extract)
//   docx  → plain text (mammoth) as a text block
//   xlsx  → tab-separated sheet text as a text block
//
// 🚨 temperature: 0 is a house rule for every durable extraction call, and a
// forced tool_use with a strict schema is how we avoid free-text JSON parsing.
// A roster misread is a child with the wrong birthday for a year — determinism
// is not optional here.

import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import type { ClassListExtraction, ExtractClassListResult } from './types';

const MAX_TOKENS = 8000;
const RETRY_DELAY_MS = 2500;

/** Roster accuracy beats per-call cost — this runs once per class, not per photo. */
const MODEL = AI_MODEL;

export const CLASS_LIST_TOOL = {
  name: 'class_list_extraction',
  description:
    'Record every student found on this class list. Call this exactly once with the complete reading of the document.',
  input_schema: {
    type: 'object' as const,
    properties: {
      document_summary: {
        type: 'string',
        description:
          '2-3 sentences: what kind of document this is, how it is laid out, and how legible it is overall.',
      },
      students: {
        type: 'array',
        description: 'One object per student on the list, in the order they appear.',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                "The student's name exactly as written on the document, including the original script and any misspellings. "
                + 'When one entry carries the same child in two scripts, this is the Latin-script name.',
            },
            alternate_name: {
              type: ['string', 'null'],
              description:
                'When ONE entry carries the same child in two scripts — "Amy 王小美", "王小美 Amy", "Amy (王小美)" — '
                + 'put the Latin-script name in `name` and the other-script name here, each exactly as written. '
                + 'Null when the entry gives a name in one script only. Never invent an alternate name, never '
                + 'translate or transliterate one into existence, and never split a name that is simply two words '
                + 'in the same script ("Zhang Wei", "Mary Anne").',
            },
            date_of_birth: {
              type: ['string', 'null'],
              description:
                'Date of birth normalised to ISO yyyy-mm-dd. Null if the document gives only a partial date, '
                + 'or if day/month order is genuinely ambiguous — put the raw text in notes instead.',
            },
            age: {
              type: ['integer', 'null'],
              description: 'Age in whole years, only if the document states an age.',
            },
            gender: { type: ['string', 'null'], enum: ['boy', 'girl', null] },
            notes: {
              type: ['string', 'null'],
              description:
                'Everything else recorded about this child: parent-interview notes, allergies, a secondary '
                + 'name that is NOT the other-script pairing already captured in alternate_name — a nickname or '
                + 'a former name — as "Also: 李明", an unparseable raw birthday, previous school, anything. '
                + 'Original language.',
            },
          },
          required: ['name', 'alternate_name', 'date_of_birth', 'age', 'gender', 'notes'],
        },
      },
    },
    required: ['document_summary', 'students'],
  },
};

export const CLASS_LIST_PROMPT =
`You are reading a class roster / name list for a Montessori classroom and transcribing it into structured data using the class_list_extraction tool.

The document could be anything a school already has: a photographed handwritten list, a printed register, an admin spreadsheet, a Word document of parent-interview notes. Work out its layout first, then transcribe it.

THE ONE RULE THAT MATTERS: transcribe what is WRITTEN. You are a transcriber, not an interpreter. Never invent a student, never invent a birthday, never "tidy up" a name. A blank is data — leave it null. An invented plausible value is far worse than an admitted gap.

WHO COUNTS AS A STUDENT
- Only children enrolled in the class. Do NOT list teachers, assistants, principals, parents or emergency contacts as students, even when they appear in the same table.
- If you cannot tell whether a row is a child or an adult, include the row and say so in that student's notes.

NAMES
- This school operates in China. Names may be Chinese (张伟), English (Emily), pinyin (Zhang Wei), or a mix. Transcribe exactly as written, in the original script. Never translate or romanise a Chinese name, and never sinicise an English one.
- If ONE entry carries the same child in TWO scripts — "Amy 王小美", "王小美 Amy", "Amy (王小美)", "Amy / 王小美" — split it: the Latin-script name goes in \`name\`, the other-script name goes in \`alternate_name\`, each exactly as written. Do not also copy either of them into notes.
- \`alternate_name\` is ONLY for that pairing. If the entry gives a name in one script only, put it in \`name\` and leave \`alternate_name\` null. Never invent an alternate name, never translate or romanise one into existence, and never split a name that is simply two words in the SAME script ("Zhang Wei", "Mary Anne") across the two fields.
- Any OTHER extra name — a nickname, a former name, a second name written in the same script — still goes in notes as "Also: <other name>".
- Keep nicknames, initials and misspellings exactly as written. Do not normalise them.

BIRTHDAYS — normalise to ISO yyyy-mm-dd. The source may be written any of these ways:
  2019-03-05 · 05/03/2019 · 3/5/2019 · Mar 5 2019 · 5 March 2019 · 2019年3月5日 · 19.03.05
- 2019年3月5日 is unambiguous: 2019-03-05.
- For a bare numeric date where day/month order is genuinely ambiguous (e.g. 03/05/2019), look at the OTHER rows on the same document first: if any row has a value above 12 in one position, that position is the day for the whole document, so read this row the same way. A consistent document is read consistently.
- If it is still ambiguous, OR the year is missing, OR you can only read part of it: set date_of_birth to null and put the raw text verbatim in notes, e.g. "Birthday written as 03/05 (year not given)".
- Never guess a year. Never infer a birthday from an age.

AGE — only fill \`age\` when the document states an age. Do not compute it from the birthday; the system does that.

GENDER — only when the document states it (M/F, 男/女, boy/girl, a gender column). Never infer gender from a name. Otherwise null.

NOTES — this is where the value lives for a Montessori teacher. Everything recorded about the child that is not name/DOB/age/gender goes here, in the language it was written in: parent-interview observations, temperament, allergies, siblings, previous school, start date, anything. Do not summarise or soften it — transcribe it.

If the document contains no students at all, return an empty students array and say so in document_summary. Do not fabricate a roster.

Call class_list_extraction exactly once with your complete reading.`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pull the forced tool_use payload out of a response, or null if it isn't
 * usable. A max_tokens truncation can yield a structurally present but
 * incomplete payload — the students[] check catches that.
 */
function readToolResult(msg: {
  content: Array<{ type: string; name?: string; input?: unknown }>;
}): ClassListExtraction | null {
  const block = (msg?.content || []).find(
    (b) => b.type === 'tool_use' && b.name === CLASS_LIST_TOOL.name
  );
  if (!block || !block.input || typeof block.input !== 'object') return null;
  const input = block.input as Partial<ClassListExtraction>;
  if (!Array.isArray(input.students)) return null;
  return {
    document_summary: typeof input.document_summary === 'string' ? input.document_summary : '',
    students: input.students,
  };
}

export type ExtractorInput =
  | { kind: 'image'; base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }
  | { kind: 'pdf'; base64: string }
  | { kind: 'text'; text: string };

/** Cap the injected text so one upload can't blow the context or the cost. */
const MAX_TEXT_CHARS = 120_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the SDK's content-block union is narrower than the JSON the API accepts
function buildContent(input: ExtractorInput, prompt: string): any[] {
  if (input.kind === 'image') {
    return [
      { type: 'image', source: { type: 'base64', media_type: input.mediaType, data: input.base64 } },
      { type: 'text', text: prompt },
    ];
  }
  if (input.kind === 'pdf') {
    // A document block sends the PDF itself, so a SCANNED list (no text layer)
    // is read visually. Pre-extracting text would silently return nothing.
    return [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.base64 } },
      { type: 'text', text: prompt },
    ];
  }
  const text = input.text.length > MAX_TEXT_CHARS ? input.text.slice(0, MAX_TEXT_CHARS) : input.text;
  return [
    { type: 'text', text: `DOCUMENT CONTENTS:\n\n${text}` },
    { type: 'text', text: prompt },
  ];
}

/**
 * One uploaded class list → one structured reading.
 *
 * Single retry on refusal / truncation / transient API error (429, 5xx,
 * network). Throws on hard failure; the caller records the import as 'failed'
 * and never lets it escape as a 500 crash.
 */
export async function extractClassList(opts: {
  input: ExtractorInput;
  locale?: string;
}): Promise<ExtractClassListResult> {
  if (!anthropic) {
    throw new Error('Anthropic client not configured (ANTHROPIC_API_KEY missing)');
  }

  let prompt = CLASS_LIST_PROMPT;
  if (opts.locale && opts.locale !== 'en') {
    const safeLocale = String(opts.locale).replace(/[^a-zA-Z_-]/g, '').slice(0, 12);
    prompt += `\n\nThe teacher's interface language is "${safeLocale}". The document may be written in that `
      + `language, in English, or in a mix. Transcribe in the language written — never translate.`;
  }

  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = attempt === 1
      ? prompt
      : prompt + '\n\nYOUR PREVIOUS ATTEMPT DID NOT RETURN A USABLE class_list_extraction TOOL CALL. '
        + 'Return the tool call this time, and keep notes concise so the output completes.';

    let msg;
    try {
      msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0, // house rule: every durable extraction call is deterministic
        tools: [CLASS_LIST_TOOL],
        tool_choice: { type: 'tool', name: CLASS_LIST_TOOL.name },
        messages: [{ role: 'user', content: buildContent(opts.input, text) }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the tool schema uses JSON-Schema union types the SDK's narrow Tool type doesn't model
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
      return { result, model: MODEL, usage, stopReason };
    }

    const stopReason = (msg as { stop_reason?: string | null }).stop_reason ?? null;
    lastErr = new Error(
      `model returned no usable tool call (stop_reason: ${stopReason})`
      + (stopReason === 'max_tokens' ? ' — output was truncated at max_tokens' : '')
    );
    if (attempt === 1) continue;
  }

  throw lastErr || new Error('Class list extraction failed');
}
