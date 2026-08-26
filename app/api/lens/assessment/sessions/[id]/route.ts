// GET /api/lens/assessment/sessions/[id]
//
// Everything the results screen and the paper-entry screen need in one round
// trip: the session, its school and room, and — once it is finished — one banded
// result per milestone with the bank's own wording attached.
//
// 🚨 `possibleMatches` IS A LIST OF MAYBES, NOT A HISTORY. Earlier check-ins
// filed under the same typed name at the same school are returned here so the
// results screen can offer them — clearly labelled unconfirmed, each carrying the
// reasons it may not be like-for-like even if it is the same child. Nothing in
// this route differences them, and nothing downstream may until a person has
// confirmed that specific pair. See lib/lens/assessment/session-facts.ts.
//
// 🚨 A SESSION THAT ISN'T HERS IS A 404, NOT A 403. loadOwnedSession filters by
// observer_id in the query, so this route cannot distinguish "no such session"
// from "somebody else's session" — which is the point. A 403 would confirm that
// a guessed id is real.

import { NextResponse, type NextRequest } from 'next/server';
import { getBankIndex } from '@/lib/montree/evaluation/bank';
import { bankText } from '@/components/montree/evaluation/localized';
import { lensError, notFound } from '@/lib/lens/route-helpers';
import {
  loadOwnedSession, openAssessmentRoute, isAssessmentSetupPending, setupPending,
} from '@/lib/lens/assessment/bridge';
import type { LensAssessmentResultView } from '@/lib/lens/assessment/types';
import { readSessionFacts } from '@/lib/lens/assessment/session-facts';
import { LensAssessmentServiceError, listPossibleAliasMatches } from '@/lib/lens/assessment/session-service';
import { loadOwnedSchool } from '@/lib/lens/db';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const opened = await openAssessmentRoute(request);
  if ('response' in opened) return opened.response;
  const { ctx } = opened;
  const { id } = await params;

  try {
    const session = await loadOwnedSession(ctx.supabase, ctx.observerId, id);
    if (!session) return notFound('That check-in isn’t yours.');

    const [school, resultRows] = await Promise.all([
      loadOwnedSchool(ctx.supabase, ctx.observerId, session.school_id),
      ctx.supabase
        .from('lens_assessment_milestone_results')
        .select('milestone_id, strand_id, domain_id, track, expectation, band_final, band_source, coverage')
        .eq('session_id', session.id)
        .eq('observer_id', ctx.observerId)
        .limit(1000),
    ]);

    if (resultRows.error) throw resultRows.error;

    let classroom: { id: string; name: string } | null = null;
    if (session.classroom_id) {
      const { data } = await ctx.supabase
        .from('lens_classrooms')
        .select('id, name, school_id')
        .eq('id', session.classroom_id)
        .maybeSingle();
      const room = data as { id: string; name: string; school_id: string } | null;
      // Re-prove the room still belongs to the school this session names, rather
      // than trusting the stored id — the row is ON DELETE SET NULL, not frozen.
      if (room && room.school_id === session.school_id) {
        classroom = { id: room.id, name: room.name };
      }
    }

    // The bank is the only place milestone wording lives. Joining it in HERE
    // rather than in the browser keeps the 3.5 MB file server-side and means the
    // results page renders sentences, not ids.
    const index = getBankIndex();
    const results: LensAssessmentResultView[] = ((resultRows.data ?? []) as unknown as Array<Record<string, string | number | null>>)
      .map((r) => {
        const milestoneId = String(r.milestone_id);
        const milestone = index.milestoneById.get(milestoneId);
        const strand = index.strandById.get(String(r.strand_id));
        const domain = index.domainById.get(String(r.domain_id));
        return {
          milestone_id: milestoneId,
          domain_id: String(r.domain_id),
          domain_name: bankText(domain?.name, 'en') || String(r.domain_id),
          strand_id: String(r.strand_id),
          strand_name: bankText(strand?.name, 'en') || String(r.strand_id),
          statement: bankText(milestone?.statement, 'en') || milestoneId,
          track: r.track as LensAssessmentResultView['track'],
          expectation: r.expectation as LensAssessmentResultView['expectation'],
          band_final: r.band_final as LensAssessmentResultView['band_final'],
          band_source: r.band_source as LensAssessmentResultView['band_source'],
          coverage: r.coverage === null || r.coverage === undefined ? null : Number(r.coverage),
        };
      })
      .sort((a, b) =>
        a.domain_name.localeCompare(b.domain_name) ||
        a.strand_name.localeCompare(b.strand_name) ||
        a.milestone_id.localeCompare(b.milestone_id));

    const facts = readSessionFacts(session.summary_json);
    const possibleMatches = await listPossibleAliasMatches(ctx.supabase, {
      observerId: ctx.observerId,
      schoolId: session.school_id,
      childAlias: session.child_alias,
      ageBand: session.age_band,
      formCode: session.form_code,
      excludeSessionId: session.id,
    });

    return NextResponse.json({
      session,
      school: school ? { id: school.id, name: school.name } : null,
      classroom,
      results,
      summary: session.summary_json ?? null,
      coRated: facts.coRated,
      coRater: facts.coRater,
      possibleMatches,
      possibleMatchesNote:
        'Unconfirmed. Matched only on an identical name at the same school — Lens keeps no roster, so '
        + 'these may be a different child. Nothing is compared until you confirm they are the same person.',
    });
  } catch (error) {
    if (error instanceof LensAssessmentServiceError) {
      return error.setupPending ? setupPending(error.message) : lensError(error.message, error.cause);
    }
    if (isAssessmentSetupPending(error)) return setupPending();
    return lensError('assessment:session:get', error);
  }
}
