// POST /api/lens/reports/[id]/draft — the Lens Guru writes the report.
//
// One forced tool call returns the whole structured report; everything it
// returns is then rebuilt by lib/lens/reports/schema.ts before it touches the
// database (see that file's header for why validation and not a cast).
//
// 🚨 A DRAFT NEVER OVERWRITES A FINAL REPORT. Status 'final' means she has
// signed it and its recommendations have become action items; regenerating over
// that would silently rewrite a document a school already has. She must reopen
// it first, which bumps the version.
//
// 🚨 A DRAFT NEVER OVERWRITES HER EDITS SILENTLY EITHER. Re-drafting replaces
// the body of every section — that is what "regenerate" means — so the client
// asks before calling this, and `?section=<key>` exists precisely so she can
// regenerate ONE paragraph without losing the eleven she has already fixed.

import { NextRequest, NextResponse } from 'next/server';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import { checkLensRateLimit, clientKey } from '@/lib/lens/auth';
import { lensDb, loadOwnedReport } from '@/lib/lens/db';
import { buildVisitContext, citableMomentIds } from '@/lib/lens/guru/context-builder';
import { briefBlock, buildDraftTool, draftUserPrompt } from '@/lib/lens/guru/draft-tool';
import { loadReportContext } from '@/lib/lens/guru/load-context';
import { buildLensSystemPrompt } from '@/lib/lens/guru/system-prompt';
import {
  readStoredContent,
  templateFor,
  validateReportContent,
  type LensReportContent,
} from '@/lib/lens/reports/schema';
import { lensError, notFound, requireObserver } from '@/lib/lens/route-helpers';
import { STAFF_ROLE_LABELS } from '@/lib/lens/types';

export const dynamic = 'force-dynamic';
// A whole report is a long generation. Railway's default 15s kills it mid-flight
// and returns a 503 that reads as a bug; 300 is what the montage and media
// routes in this repo already use for their long jobs.
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  if (!AI_ENABLED || !anthropic) {
    return NextResponse.json(
      { error: 'Drafting isn’t configured on this deployment (no ANTHROPIC_API_KEY).' },
      { status: 503 },
    );
  }
  const ai = anthropic;

  // Each draft is a real Sonnet call over the whole visit. Six per fifteen
  // minutes is more than a working afternoon needs and stops a stuck client
  // from spending a fortune in a loop.
  if (!checkLensRateLimit(clientKey(request, 'lens-draft'), 6)) {
    return NextResponse.json(
      { error: 'That’s a lot of drafting at once. Give it a minute.' },
      { status: 429 },
    );
  }

  // Which one section to regenerate, if any.
  const onlySection = request.nextUrl.searchParams.get('section');

  try {
    const supabase = lensDb();
    const owned = await loadOwnedReport(supabase, session.observerId, id);
    if (!owned) return notFound('That report isn’t yours.');
    const { report, visit } = owned;

    if (report.status === 'final') {
      return NextResponse.json(
        { error: 'That report is final. Reopen it first if you want to redraft.' },
        { status: 409 },
      );
    }

    const context = await loadReportContext(supabase, session.observerId, report, visit);
    if (!context) return notFound('That report isn’t yours.');

    if (context.moments.length === 0) {
      return NextResponse.json(
        {
          error:
            'There are no moments on this visit yet. The Guru writes only from what you captured — there is nothing to write from.',
        },
        { status: 409 },
      );
    }

    // The template, plus one subsection key per adult in scope.
    const template = templateFor(visit.engagement_type);
    const staffSections = context.staff.map((s) => ({
      key: `adults:${s.id}`,
      name: s.name,
      role: STAFF_ROLE_LABELS[s.role] ?? s.role,
    }));
    const allowedSectionKeys = [
      ...template.filter((s) => s.source === 'model' && s.key !== 'adults').map((s) => s.key),
      // The bare 'adults' key stays legal: a room with no staff recorded still
      // needs somewhere to say the adults were not the subject of this visit.
      'adults',
      ...staffSections.map((s) => s.key),
    ];

    const systemPrompt = buildLensSystemPrompt({
      observer: context.observer,
      engagement: visit.engagement_type,
    });

    const extra = onlySection
      ? `REGENERATE ONE SECTION ONLY: "${onlySection}". Call write_report with a ` +
        'sections array containing exactly that one section, and with empty ' +
        'arrays for commendations, recommendations and next_steps. Everything ' +
        'else in the report is hers and must not be touched.'
      : null;

    const userPrompt = draftUserPrompt({
      context: buildVisitContext(context),
      briefs: briefBlock(template, staffSections),
      engagement: visit.engagement_type,
      extraInstruction: extra,
    });

    const message = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 8192,
      // 🚨 temperature 0. A report is durable per-client state, and this repo's
      // standing rule is that every model call writing durable state is
      // deterministic — a regenerate that re-rolls a different set of findings
      // from the same evidence is not a regenerate, it is a lottery.
      temperature: 0,
      system: systemPrompt,
      tools: [buildDraftTool(visit.engagement_type, allowedSectionKeys)],
      tool_choice: { type: 'tool', name: 'write_report' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUse = message.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      console.error('[lens/draft] no tool_use block:', message.stop_reason);
      return NextResponse.json(
        { error: 'The Guru didn’t return a report. Try again.' },
        { status: 502 },
      );
    }

    const { content: drafted, warnings } = validateReportContent(toolUse.input, {
      allowedSectionKeys,
      allowedMomentIds: citableMomentIds(context.moments),
    });

    // Merge, rather than replace, so a single-section regenerate leaves the rest
    // of her work untouched.
    const existing = readStoredContent(report);
    const merged: LensReportContent = onlySection
      ? {
          ...existing,
          sections: mergeSections(existing.sections, drafted.sections, allowedSectionKeys),
        }
      : {
          sections: drafted.sections,
          ratings: drafted.ratings,
          commendations: drafted.commendations,
          recommendations: drafted.recommendations,
          required_actions: drafted.required_actions,
          next_steps: drafted.next_steps,
        };

    const { error } = await supabase
      .from('lens_reports')
      .update({
        sections: merged.sections,
        ratings: merged.ratings,
        commendations: merged.commendations,
        recommendations: merged.recommendations,
        required_actions: merged.required_actions,
        next_steps: merged.next_steps,
        status: report.status === 'capturing' ? 'drafting' : report.status,
      })
      .eq('id', report.id);
    if (error) throw error;

    // A visit whose first report has been drafted is no longer "capturing".
    if (visit.status === 'capturing') {
      await supabase
        .from('lens_visits')
        .update({ status: 'drafting' })
        .eq('id', visit.id)
        .eq('observer_id', session.observerId);
    }

    return NextResponse.json({
      ok: true,
      content: merged,
      warnings,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    return lensError('reports:draft', error);
  }
}

/** Replace matching sections, keep the rest, and re-sort to template order. */
function mergeSections(
  existing: LensReportContent['sections'],
  fresh: LensReportContent['sections'],
  order: string[],
): LensReportContent['sections'] {
  const byKey = new Map(existing.map((s) => [s.key, s]));
  for (const section of fresh) byKey.set(section.key, section);
  const rank = new Map(order.map((k, i) => [k, i]));
  return [...byKey.values()].sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
}
