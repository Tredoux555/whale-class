// lib/montree/tracy/frameworks/note-quality.ts
//
// Score teacher observation notes on substance using Haiku.
//
// 1 = "good day" / "she's doing well" boilerplate, no real observation
// 5 = specific, observable, named work, clear pattern, useful for the parent
//
// Cost: ~$0.001 per call (Haiku, ~600 input + 100 output tokens for 8 notes).
// Used by unpack_teacher to characterise teacher note QUALITY layer.
//
// Falls back gracefully to []  if anthropic is null or the call fails — the
// caller has a word-count heuristic for the no-Haiku path.

import type Anthropic from '@anthropic-ai/sdk';
import { HAIKU_MODEL } from '@/lib/ai/anthropic';

const SCORE_TIMEOUT_MS = 15_000;

export async function scoreNoteQuality(
  notes: string[],
  anthropic: Anthropic | null
): Promise<number[]> {
  if (!anthropic || notes.length === 0) return [];

  // Build a numbered list. Cap each note's text to 400 chars to keep the
  // prompt compact and bound Haiku cost regardless of note length.
  const numbered = notes
    .map((text, i) => {
      const trimmed = text.length > 400 ? text.slice(0, 400) + '…' : text;
      return `${i + 1}. ${trimmed}`;
    })
    .join('\n\n');

  const systemPrompt = `You score Montessori teacher observation notes on a 1–5 scale for SUBSTANCE.

1 = boilerplate. "Good day", "she's well", "happy". No specific observation. No actionable detail.
2 = vaguely positive but unspecific. "She enjoyed maths today." No work named, no behaviour described.
3 = specific. Names a work or area, describes ONE concrete observation. ("Worked on Pink Tower for 20 minutes, careful with placement.")
4 = substantive. Names work + describes a pattern, choice, or quality of attention. Useful evidence for a parent conversation.
5 = pedagogical insight. Names work + behaviour + interpretation that shows the teacher is reading the child developmentally.

Output only a JSON array of integers, one per note, in order. No prose. No explanation. Example for 3 notes: [3, 1, 4]`;

  const userPrompt = `Score these ${notes.length} note(s):\n\n${numbered}`;

  // Track the timeout so we can clear it on success and avoid keeping the
  // event loop alive past function return (serverless cold-suspend issue +
  // memory churn under load).
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error('note-quality scoring timeout')),
          SCORE_TIMEOUT_MS
        );
      }),
    ]);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    // Extract first text block from Haiku response
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return [];
    const raw = block.text.trim();

    // Parse JSON array. Be defensive — Haiku occasionally wraps in code fences
    // or adds a leading "Here are the scores:" line.
    const match = raw.match(/\[[^\]]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    // Coerce + clamp to 1–5. Truncate or pad to expected length.
    const scores: number[] = [];
    for (let i = 0; i < notes.length; i++) {
      const v = parsed[i];
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) {
        scores.push(Math.max(1, Math.min(5, Math.round(n))));
      } else {
        scores.push(2); // safe middle-low default for unparseable
      }
    }
    return scores;
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    console.error('[tracy/note-quality] scoring failed:', err);
    return [];
  }
}
