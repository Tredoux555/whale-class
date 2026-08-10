// app/api/montree/child-onboarding/route.ts
//
// Teacher / principal list view of the family intakes.
//
// GET ?classroomId=&status=  → every intake for the school (or one classroom),
// with the child's name joined in, sorted submitted-first.
//
// Read-only. Nothing here touches montree_children — that is the commit route.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import type { IntakeStatus } from '@/lib/onboarding-core';
import {
  CHILD_ONBOARDING_FEATURE_KEY,
  STATUS_SORT_WEIGHT,
  type ChildIntakeListItem,
} from '@/lib/montree/child-onboarding/types';

const VALID_STATUSES: IntakeStatus[] = ['draft', 'submitted', 'committed'];

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    if (!(await isFeatureEnabled(supabase, auth.schoolId, CHILD_ONBOARDING_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroomId') || searchParams.get('classroom_id') || '';
    const statusFilter = searchParams.get('status') || '';

    let query = supabase
      .from('montree_child_intake')
      .select('id, child_id, classroom_id, status, submitted_at, committed_at, updated_at')
      .eq('school_id', auth.schoolId);

    if (classroomId) {
      // 🚨 A client-supplied classroomId is only ever a NARROWING filter here —
      // school_id above is the boundary, so a foreign id can only return nothing.
      query = query.eq('classroom_id', classroomId);
    }
    if (statusFilter && (VALID_STATUSES as string[]).includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data: rows, error } = await query.limit(500);
    if (error) {
      console.error('[child-onboarding] list failed:', error.message, error.code);
      return NextResponse.json(
        { success: false, error: 'Could not load intakes', detail: error.message },
        { status: 500 }
      );
    }

    const list = (rows || []) as Array<{
      id: string;
      child_id: string;
      classroom_id: string;
      status: IntakeStatus;
      submitted_at: string | null;
      committed_at: string | null;
      updated_at: string;
    }>;

    // Join child names in one batch.
    const childIds = Array.from(new Set(list.map((r) => r.child_id)));
    const nameById = new Map<string, string>();
    if (childIds.length > 0) {
      const { data: childRows } = await supabase
        .from('montree_children')
        .select('id, name')
        .in('id', childIds)
        .eq('school_id', auth.schoolId);
      for (const c of (childRows || []) as Array<{ id: string; name: string }>) {
        nameById.set(c.id, c.name);
      }
    }

    const items: ChildIntakeListItem[] = list
      .map((r) => ({
        id: r.id,
        child_id: r.child_id,
        child_name: nameById.get(r.child_id) || '—',
        classroom_id: r.classroom_id,
        status: r.status,
        submitted_at: r.submitted_at,
        committed_at: r.committed_at,
        updated_at: r.updated_at,
      }))
      .sort((a, b) => {
        const w = STATUS_SORT_WEIGHT[a.status] - STATUS_SORT_WEIGHT[b.status];
        if (w !== 0) return w;
        return (b.updated_at || '').localeCompare(a.updated_at || '');
      });

    return NextResponse.json({
      success: true,
      items,
      counts: {
        submitted: items.filter((i) => i.status === 'submitted').length,
        draft: items.filter((i) => i.status === 'draft').length,
        committed: items.filter((i) => i.status === 'committed').length,
      },
    });
  } catch (error) {
    console.error('[child-onboarding] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
