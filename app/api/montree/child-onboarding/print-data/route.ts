// app/api/montree/child-onboarding/print-data/route.ts
//
// Everything the printed sheets need, in one call: the classroom's children
// that have a COMMITTED intake, each with a resolved face-photo URL, their
// guardians as display strings, their authorized pickup adults (each with a
// resolved photo URL), and their flag-worthy allergens.
//
// Only committed intakes are printable. A draft is a family still typing; a
// submission the teacher hasn't reviewed must not end up on the classroom door.
//
// Photo URLs go through the Montree media proxy (Cloudflare-cached, works in
// China without a VPN) — the shared print components never build a URL.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { criticalAllergens, displayName, normalizeIntake } from '@/lib/onboarding-core';
import {
  CHILD_ONBOARDING_FEATURE_KEY,
  INTAKE_BUCKET,
} from '@/lib/montree/child-onboarding/types';

export interface PrintChild {
  childId: string;
  childName: string;
  photoUrl: string | null;
  guardians: string[];
  pickupPersons: Array<{ name: string; relation: string; phone: string; photoUrl: string | null }>;
  allergies: string[];
}

function proxy(path: string | undefined | null): string | null {
  const p = (path || '').trim();
  if (!p) return null;
  return getProxyUrl(p, INTAKE_BUCKET);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    if (!(await isFeatureEnabled(supabase, auth.schoolId, CHILD_ONBOARDING_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const classroomId =
      searchParams.get('classroomId') || searchParams.get('classroom_id') || auth.classroomId || '';

    let query = supabase
      .from('montree_child_intake')
      .select('id, child_id, classroom_id, data')
      .eq('school_id', auth.schoolId)
      .eq('status', 'committed');

    if (classroomId) {
      // school_id above is the security boundary; classroomId only narrows.
      query = query.eq('classroom_id', classroomId);
    }

    const { data: rows, error } = await query.limit(500);
    if (error) {
      console.error('[child-onboarding/print-data] fetch failed:', error.message, error.code);
      return NextResponse.json(
        { success: false, error: 'Could not load print data', detail: error.message },
        { status: 500 }
      );
    }

    const list = (rows || []) as Array<{ child_id: string; data: unknown }>;

    // Names come off montree_children so the printed label matches the roster
    // the teacher sees everywhere else; the intake's preferred name is the
    // fallback if the child row somehow has none.
    const childIds = Array.from(new Set(list.map((r) => r.child_id)));
    const rosterById = new Map<string, { name: string; photo_url: string | null }>();
    if (childIds.length > 0) {
      const { data: childRows } = await supabase
        .from('montree_children')
        .select('id, name, photo_url')
        .in('id', childIds)
        .eq('school_id', auth.schoolId)
        .neq('is_active', false);
      for (const c of (childRows || []) as Array<{ id: string; name: string; photo_url: string | null }>) {
        rosterById.set(c.id, { name: c.name, photo_url: c.photo_url });
      }
    }

    const children: PrintChild[] = list
      .filter((r) => rosterById.has(r.child_id))
      .map((r) => {
        const form = normalizeIntake(r.data);
        const roster = rosterById.get(r.child_id) as { name: string; photo_url: string | null };

        // Prefer the intake face photo (it was chosen for this purpose); fall
        // back to whatever avatar the child already has.
        const face = proxy(form.documents.facePhotoPath)
          || (roster.photo_url ? getProxyUrl(roster.photo_url) : null);

        return {
          childId: r.child_id,
          childName: roster.name || displayName(form) || '—',
          photoUrl: face,
          guardians: (form.family.guardians || [])
            .filter((g) => g && g.name?.trim())
            .map((g) => {
              const bits = [g.relation?.trim(), g.phone?.trim()].filter(Boolean).join(' · ');
              return bits ? `${g.name.trim()} (${bits})` : g.name.trim();
            }),
          pickupPersons: (form.pickup.persons || [])
            .filter((p) => p && p.name?.trim())
            .map((p) => ({
              name: p.name.trim(),
              relation: (p.relation || '').trim(),
              phone: (p.phone || '').trim(),
              photoUrl: proxy(p.photoPath),
            })),
          allergies: criticalAllergens(form),
        };
      })
      .sort((a, b) => a.childName.localeCompare(b.childName));

    return NextResponse.json({ success: true, children, classroomId: classroomId || null });
  } catch (error) {
    console.error('[child-onboarding/print-data] error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
