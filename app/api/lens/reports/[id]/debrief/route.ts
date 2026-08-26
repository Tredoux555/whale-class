// GET  /api/lens/reports/[id]/debrief — the question list for the meeting after
//      the report. Returns what is stored; generates it on first ask.
// POST /api/lens/reports/[id]/debrief — regenerate it.
//
// 🚨 THE DEBRIEF IS NOT A SUMMARY OF THE REPORT. It is the GROW-shaped list of
// OPEN questions she asks the guide once the guide has read it — Goal, Reality,
// Options, Will — ending in one testable thing agreed before the next visit. A
// closed question ("don't you think the shelves were untidy?") is a finding
// wearing a question mark, and the whole reason the debrief exists is that the
// guide gets to reach the conclusion herself.
//
// 🚨 IT IS STORED, NOT REGENERATED ON EVERY OPEN. She will have annotated it,
// and a page reload that silently rewrote her meeting notes would be the kind of
// bug that ends trust in the tool. GET generates only when the field is empty.

import { NextRequest, NextResponse } from 'next/server';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import { checkLensRateLimit, clientKey } from '@/lib/lens/auth';
import { lensDb, loadOwnedReport } from '@/lib/lens/db';
import { buildVisitContext } from '@/lib/lens/guru/context-builder';
import { loadReportContext } from '@/lib/lens/guru/load-context';
import { instructionFor } from '@/lib/lens/guru/modes';
import { buildLensSystemPrompt } from '@/lib/lens/guru/system-prompt';
import { readStoredContent } from '@/lib/lens/reports/schema';
import { lensError, notFound, requireObserver } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

type Params = { params: Promise<{ id: string }> };

export interface DebriefQuestion {
  /** GOAL | REALITY | OPTIONS | WILL — the GROW stage. */
  stage: string;
  question: string;
}

const STAGES = ['GOAL', 'REALITY', 'OPTIONS', 'WILL'];

/**
 * Parse the model's numbered list into stage/question pairs.
 *
 * Tolerant on purpose: the value here is the QUESTIONS, and a line whose stage
 * marker we cannot read is still a good question. An unlabelled line is filed
 * under REALITY (the stage with the most questions in every GROW conversation)
 * rather than dropped.
 */
export function parseDebrief(raw: string): DebriefQuestion[] {
  const out: DebriefQuestion[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // "1. (REALITY) What did you…" / "3 — WILL — What will you…" / "- GOAL: …"
    const body = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
    if (!body) continue;
    const stageMatch = body.match(/^[([]?\s*(GOAL|REALITY|OPTIONS|WILL)\s*[)\]]?\s*[-–—:]?\s*/i);
    const stage = stageMatch ? stageMatch[1].toUpperCase() : 'REALITY';
    const question = (stageMatch ? body.slice(stageMatch[0].length) : body).trim();
    // A heading line ("REALITY") carries no question; skip it rather than
    // shipping an empty row.
    if (question.length < 8) continue;
    out.push({ stage: STAGES.includes(stage) ? stage : 'REALITY', question });
  }
  return out.slice(0, 20);
}

async function generate(
  supabase: ReturnType<typeof lensDb>,
  observerId: string,
  reportId: string,
): Promise<{ questions: DebriefQuestion[]; error?: string }> {
  if (!AI_ENABLED || !anthropic) {
    return { questions: [], error: 'The Guru isn’t configured on this deployment.' };
  }
  const owned = await loadOwnedReport(supabase, observerId, reportId);
  if (!owned) return { questions: [], error: 'not_found' };
  const context = await loadReportContext(supabase, observerId, owned.report, owned.visit);
  if (!context) return { questions: [], error: 'not_found' };

  const content = readStoredContent(owned.report);
  if (content.sections.length === 0) {
    return { questions: [], error: 'Draft the report first — the debrief follows it.' };
  }

  const draft = [
    ...content.sections.map((s) => `## ${s.title}\n${s.body_en}`),
    content.commendations.length
      ? `## Commendations\n${content.commendations.map((c) => `- ${c.text_en}`).join('\n')}`
      : '',
    content.recommendations.length
      ? `## Recommendations\n${content.recommendations.map((r) => `- ${r.text_en}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    temperature: 0,
    system: buildLensSystemPrompt({
      observer: context.observer,
      engagement: owned.visit.engagement_type,
      modeInstruction: instructionFor('debrief_questions'),
    }),
    messages: [
      {
        role: 'user',
        content: [
          buildVisitContext(context),
          '',
          '---',
          '',
          'THE REPORT SHE IS ABOUT TO DEBRIEF',
          draft,
          '',
          '---',
          '',
          'Write the debrief questions.',
        ].join('\n'),
      },
    ],
  });

  const block = message.content.find((b) => b.type === 'text');
  const questions = parseDebrief(block && block.type === 'text' ? block.text : '');
  if (questions.length > 0) {
    await supabase.from('lens_reports').update({ debrief: questions }).eq('id', owned.report.id);
  }
  return { questions };
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    const supabase = lensDb();
    const owned = await loadOwnedReport(supabase, session.observerId, id);
    if (!owned) return notFound('That report isn’t yours.');

    const stored = Array.isArray(owned.report.debrief) ? (owned.report.debrief as DebriefQuestion[]) : [];
    if (stored.length > 0) return NextResponse.json({ questions: stored, generated: false });

    if (!checkLensRateLimit(clientKey(request, 'lens-debrief'), 10)) {
      return NextResponse.json({ error: 'Give it a minute.' }, { status: 429 });
    }
    const result = await generate(supabase, session.observerId, id);
    if (result.error === 'not_found') return notFound('That report isn’t yours.');
    if (result.error) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ questions: result.questions, generated: true });
  } catch (error) {
    return lensError('report:debrief', error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  if (!checkLensRateLimit(clientKey(request, 'lens-debrief'), 10)) {
    return NextResponse.json({ error: 'Give it a minute.' }, { status: 429 });
  }

  try {
    const result = await generate(lensDb(), session.observerId, id);
    if (result.error === 'not_found') return notFound('That report isn’t yours.');
    if (result.error) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true, questions: result.questions });
  } catch (error) {
    return lensError('report:debrief:post', error);
  }
}
