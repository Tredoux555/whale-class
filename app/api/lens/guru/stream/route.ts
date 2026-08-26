// POST /api/lens/guru/stream — the Lens Guru, streaming, in one of eight modes.
//
// Body: { visitId, reportId?, mode, message?, text?, sectionKey? }
//
// Reuses the Anthropic streaming shape from app/api/montree/guru/stream
// (ai.messages.stream, an SSE ReadableStream of {type:'text'} frames and a
// final {type:'done'}) so the client parser is the same one this repo already
// knows how to write. Differences, all deliberate:
//
//   • No tier gate. Lens is a single-observer product with no school billing
//     record to resolve; Montree's free/starter/premium ladder has nothing to
//     say about it.
//   • No interaction row is written. montree_guru_interactions is scoped to a
//     Montree child and Lens has none — and a consultant's private thinking
//     about a client's classroom is not something to log by default.
//   • The mode decides the instruction, the token budget and whether the locked
//     glossary is loaded (lib/lens/guru/modes.ts). Every mode runs on the SAME
//     system prompt with the SAME hard guardrails: "make it kinder" that quietly
//     dropped the citation rule would be a different product.

import { NextRequest, NextResponse } from 'next/server';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import { checkLensRateLimit, clientKey } from '@/lib/lens/auth';
import { lensDb, loadOwnedReport, loadOwnedVisit } from '@/lib/lens/db';
import { buildVisitContext } from '@/lib/lens/guru/context-builder';
import { loadReportContext } from '@/lib/lens/guru/load-context';
import { instructionFor, isGuruMode, maxTokensFor, needsGlossary } from '@/lib/lens/guru/modes';
import { buildLensSystemPrompt } from '@/lib/lens/guru/system-prompt';
import { readStoredContent, sectionTitle } from '@/lib/lens/reports/schema';
import { requireObserver, text } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function sse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;

  if (!AI_ENABLED || !anthropic) {
    return NextResponse.json(
      { error: 'The Guru isn’t configured on this deployment (no ANTHROPIC_API_KEY).' },
      { status: 503 },
    );
  }
  const ai = anthropic;

  if (!checkLensRateLimit(clientKey(request, 'lens-guru'), 40)) {
    return NextResponse.json({ error: 'Give it a minute.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const mode = body.mode;
  if (!isGuruMode(mode)) {
    return NextResponse.json({ error: 'That isn’t a mode I know.' }, { status: 400 });
  }
  const visitId = text(body.visitId, 64);
  if (!visitId) return NextResponse.json({ error: 'Which visit?' }, { status: 400 });
  const reportId = text(body.reportId, 64);
  const userMessage = text(body.message, 8000);
  const suppliedText = text(body.text, 30000);
  const sectionKey = text(body.sectionKey, 120);

  try {
    const supabase = lensDb();
    const visit = await loadOwnedVisit(supabase, session.observerId, visitId);
    if (!visit) return NextResponse.json({ error: 'That visit isn’t yours.' }, { status: 404 });

    // A report is optional — brainstorm mode is scoped to the visit alone. When
    // one IS named it must belong to this visit, or the context would be built
    // from somebody else's room.
    let reportContext = null;
    if (reportId) {
      const owned = await loadOwnedReport(supabase, session.observerId, reportId);
      if (!owned || owned.report.visit_id !== visit.id) {
        return NextResponse.json({ error: 'That report isn’t on this visit.' }, { status: 404 });
      }
      reportContext = await loadReportContext(supabase, session.observerId, owned.report, visit);
    }

    // Without a report we still need the visit's own context; build it from the
    // level report's scope (everything), by loading it through the same path.
    if (!reportContext) {
      const { data } = await supabase
        .from('lens_reports')
        .select('*')
        .eq('visit_id', visit.id)
        .is('classroom_id', null)
        .maybeSingle();
      if (data) {
        reportContext = await loadReportContext(supabase, session.observerId, data, visit);
      }
    }
    if (!reportContext) {
      return NextResponse.json({ error: 'That visit has no report to work from.' }, { status: 409 });
    }

    const systemPrompt = buildLensSystemPrompt({
      observer: reportContext.observer,
      engagement: visit.engagement_type,
      includeGlossary: needsGlossary(mode),
      modeInstruction: instructionFor(mode),
    });

    // What the model is asked to work ON, which differs by mode: the whole
    // report for a sanity check or a debrief, one section's text for tighten /
    // kinder / firmer / translate, and nothing but the question for brainstorm.
    const parts: string[] = [buildVisitContext(reportContext)];

    if (mode === 'sanity_check' || mode === 'debrief_questions') {
      parts.push('', '---', '', 'THE DRAFT AS IT STANDS', renderDraft(reportContext.report));
    } else if (suppliedText) {
      parts.push(
        '',
        '---',
        '',
        sectionKey ? `THE TEXT (section "${sectionTitle(sectionKey)}")` : 'THE TEXT',
        suppliedText,
      );
    }
    if (userMessage) {
      parts.push('', '---', '', 'SHE SAYS', userMessage);
    }

    const stream = new ReadableStream({
      async start(controller) {
        let full = '';
        try {
          const messageStream = ai.messages.stream({
            model: AI_MODEL,
            max_tokens: maxTokensFor(mode),
            // Brainstorm is a conversation and a little warmth helps; every
            // other mode either writes or audits durable report text and must
            // be deterministic, per this repo's standing temperature rule.
            temperature: mode === 'brainstorm' ? 0.4 : 0,
            system: systemPrompt,
            messages: [{ role: 'user', content: parts.join('\n') }],
          });

          messageStream.on('text', (chunk) => {
            full += chunk;
            controller.enqueue(sse({ type: 'text', content: chunk }));
          });

          await messageStream.finalMessage();
          controller.enqueue(sse({ type: 'done', mode, length: full.length }));
          controller.close();
        } catch (err) {
          console.error('[lens/guru/stream] error:', err);
          // The frame carries a REASON, not just "error": a stream that dies
          // silently is the bug this repo's runtime-audit rule exists for.
          controller.enqueue(
            sse({
              type: 'error',
              message: err instanceof Error ? err.message : 'The Guru stopped mid-sentence.',
            }),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[lens/guru/stream] setup error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

/** The current draft, flattened, for the modes that audit the whole thing. */
function renderDraft(report: Parameters<typeof readStoredContent>[0]): string {
  const content = readStoredContent(report);
  const lines: string[] = [];
  for (const section of content.sections) {
    lines.push(`## ${section.title} [${section.key}]`);
    lines.push(section.body_en);
    lines.push(
      section.evidence.length ? `EVIDENCE: ${section.evidence.join(', ')}` : 'EVIDENCE: (none cited)',
    );
    lines.push('');
  }
  for (const key of ['commendations', 'recommendations', 'required_actions', 'next_steps'] as const) {
    const items = content[key];
    if (items.length === 0) continue;
    lines.push(`## ${key}`);
    for (const item of items) {
      lines.push(
        `- ${item.text_en}  [${item.evidence.length ? item.evidence.join(', ') : 'no evidence cited'}]`,
      );
    }
    lines.push('');
  }
  const ratings = Object.entries(content.ratings);
  if (ratings.length > 0) {
    lines.push('## ratings');
    for (const [domain, level] of ratings) lines.push(`- ${domain}: ${level}`);
  }
  return lines.join('\n') || '(nothing drafted yet)';
}
