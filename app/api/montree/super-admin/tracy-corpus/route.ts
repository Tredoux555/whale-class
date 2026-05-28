// app/api/montree/super-admin/tracy-corpus/route.ts
//
// Ultimate Tracy Phase E — super-admin view of Tracy's corpus.
//
// Returns per-school stats: total entries, by-type breakdown, most
// referenced, never-referenced (>30 days old, candidates for pruning),
// recently superseded.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const maxDuration = 30;

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

interface CorpusRow {
  id: string;
  school_id: string;
  insight_type: string;
  insight_text: string;
  confidence: number;
  reference_count: number;
  last_referenced_at: string | null;
  created_at: string;
  superseded_at: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request.headers);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error || 'forbidden' },
      { status: 403 }
    );
  }

  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('montree_tracy_corpus')
      .select(
        'id, school_id, insight_type, insight_text, confidence, reference_count, last_referenced_at, created_at, superseded_at'
      )
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      if (isMigrationMissing(error)) {
        return NextResponse.json({
          migration_pending: true,
          by_school: [],
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data as CorpusRow[]) ?? [];

    // Bucket by school.
    const bySchool: Map<string, CorpusRow[]> = new Map();
    for (const r of rows) {
      if (!bySchool.has(r.school_id)) bySchool.set(r.school_id, []);
      bySchool.get(r.school_id)!.push(r);
    }

    // Pull school names.
    const schoolIds = Array.from(bySchool.keys());
    let schoolNames = new Map<string, string>();
    if (schoolIds.length > 0) {
      const { data: schoolRows } = await supabase
        .from('montree_schools')
        .select('id, name')
        .in('id', schoolIds);
      schoolNames = new Map(
        ((schoolRows as Array<{ id: string; name: string }>) ?? []).map(
          (s) => [s.id, s.name]
        )
      );
    }

    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const by_school = Array.from(bySchool.entries()).map(([schoolId, entries]) => {
      const active = entries.filter((e) => !e.superseded_at);
      const superseded = entries.filter((e) => !!e.superseded_at);
      const byType: Record<string, number> = {};
      for (const e of active) {
        byType[e.insight_type] = (byType[e.insight_type] ?? 0) + 1;
      }
      const mostReferenced = [...active]
        .sort((a, b) => b.reference_count - a.reference_count)
        .slice(0, 5)
        .map((e) => ({
          id: e.id,
          insight_text: e.insight_text.slice(0, 140),
          reference_count: e.reference_count,
        }));
      const neverReferenced = active.filter(
        (e) =>
          e.reference_count === 0 &&
          new Date(e.created_at).getTime() < thirtyDaysAgoMs
      );

      return {
        school_id: schoolId,
        school_name: schoolNames.get(schoolId) ?? '(unknown)',
        total_active: active.length,
        total_superseded: superseded.length,
        by_type: byType,
        most_referenced: mostReferenced,
        never_referenced_count: neverReferenced.length,
      };
    });

    by_school.sort((a, b) => b.total_active - a.total_active);

    return NextResponse.json(
      { by_school },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    if (isMigrationMissing(err)) {
      return NextResponse.json({ migration_pending: true, by_school: [] });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}
