// GET  /api/montree/intelligence/evidence-overview  — Classroom-level evidence summary
//
// Returns per-child evidence snapshot: how many works have strong/moderate/weak evidence,
// which works are ready for mastery confirmation, and overall classroom evidence health.
//
// Data sources:
//   montree_children — classroom roster
//   montree_child_progress — evidence columns (migration 155)
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

interface WorkEvidence {
  work_name: string;
  area: string;
  status: string;
  evidence_photo_count: number;
  evidence_photo_days: number;
  mastery_confirmed_at: string | null;
  evidence_strength: 'none' | 'weak' | 'moderate' | 'strong';
}

interface ChildEvidenceSummary {
  id: string;
  name: string;
  strong: number;
  moderate: number;
  weak: number;
  confirmed: number;
  total_active: number;
  ready_works: Array<{ work_name: string; area: string; evidence_photo_count: number; evidence_photo_days: number }>;
}

function getEvidenceStrength(photoCount: number, photoDays: number): 'none' | 'weak' | 'moderate' | 'strong' {
  if (photoCount === 0) return 'none';
  if (photoCount >= 3 && photoDays >= 3) return 'strong';
  if (photoCount >= 2 || photoDays >= 2) return 'moderate';
  return 'weak';
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    // Fetch children in this classroom
    const { data: children, error: childrenErr } = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', auth.classroomId)
      .eq('school_id', auth.schoolId)
      .order('name');

    if (childrenErr) {
      console.error('[EvidenceOverview] Children fetch error:', childrenErr);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    if (!children || children.length === 0) {
      return NextResponse.json({
        children: [],
        classroom_totals: { strong: 0, moderate: 0, weak: 0, confirmed: 0, ready: 0 },
      });
    }

    // Fetch all active progress records for classroom children
    const childIds = children.map((c: { id: string }) => c.id);
    const { data: progress, error: progressErr } = await supabase
      .from('montree_child_progress')
      .select('child_id, work_name, area, status, evidence_photo_count, evidence_photo_days, mastery_confirmed_at')
      .in('child_id', childIds)
      .in('status', ['presented', 'practicing', 'mastered'])
      .limit(5000);

    if (progressErr) {
      console.error('[EvidenceOverview] Progress fetch error:', progressErr);
      return NextResponse.json({ error: 'Failed to load progress data' }, { status: 500 });
    }

    // Group progress by child
    const progressByChild = new Map<string, WorkEvidence[]>();
    if (progress) {
      for (const p of progress) {
        const existing = progressByChild.get(p.child_id) || [];
        existing.push({
          work_name: p.work_name,
          area: p.area,
          status: p.status,
          evidence_photo_count: p.evidence_photo_count || 0,
          evidence_photo_days: p.evidence_photo_days || 0,
          mastery_confirmed_at: p.mastery_confirmed_at,
          evidence_strength: getEvidenceStrength(p.evidence_photo_count || 0, p.evidence_photo_days || 0),
        });
        progressByChild.set(p.child_id, existing);
      }
    }

    // Build per-child summaries
    let totalStrong = 0;
    let totalModerate = 0;
    let totalWeak = 0;
    let totalConfirmed = 0;
    let totalReady = 0;

    const childSummaries: ChildEvidenceSummary[] = children.map((c: { id: string; name: string }) => {
      const works = progressByChild.get(c.id) || [];
      let strong = 0;
      let moderate = 0;
      let weak = 0;
      let confirmed = 0;
      const readyWorks: Array<{ work_name: string; area: string; evidence_photo_count: number; evidence_photo_days: number }> = [];

      for (const w of works) {
        if (w.mastery_confirmed_at) {
          confirmed++;
        }
        if (w.evidence_strength === 'strong') {
          strong++;
          // "Ready" = strong evidence + not yet mastered confirmed
          if (!(w.status === 'mastered' && w.mastery_confirmed_at)) {
            readyWorks.push({
              work_name: w.work_name,
              area: w.area,
              evidence_photo_count: w.evidence_photo_count,
              evidence_photo_days: w.evidence_photo_days,
            });
          }
        } else if (w.evidence_strength === 'moderate') {
          moderate++;
        } else if (w.evidence_strength === 'weak') {
          weak++;
        }
      }

      totalStrong += strong;
      totalModerate += moderate;
      totalWeak += weak;
      totalConfirmed += confirmed;
      totalReady += readyWorks.length;

      return {
        id: c.id,
        name: c.name,
        strong,
        moderate,
        weak,
        confirmed,
        total_active: works.length,
        ready_works: readyWorks,
      };
    });

    // Sort: children with ready works first, then by strong evidence count
    childSummaries.sort((a, b) => {
      if (a.ready_works.length !== b.ready_works.length) return b.ready_works.length - a.ready_works.length;
      if (a.strong !== b.strong) return b.strong - a.strong;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      children: childSummaries,
      classroom_totals: {
        strong: totalStrong,
        moderate: totalModerate,
        weak: totalWeak,
        confirmed: totalConfirmed,
        ready: totalReady,
      },
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[EvidenceOverview] GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
