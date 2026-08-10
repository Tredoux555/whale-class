// app/api/montree/photo-onboarding/[importId]/commit/route.ts
//
// Apply the teacher's REVIEWED decisions. This is the only route in the
// feature that touches montree_children.
//
// The client sends back one object per entry carrying the final action AND the
// final field values, because the review screen lets the teacher edit any of
// them inline. Teacher-reviewed values always win over what the model read.
//
//   create  → insert a new child
//   update  → patch the matched child; notes APPEND, never overwrite
//   archive → is_active = false (soft archive; every record is retained)
//   skip    → nothing
//
// Partial failure is surfaced, never swallowed: `failed` in the response is the
// count of rows that were meant to apply and errored.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { ageFromDob } from '@/lib/montree/photo-onboarding/reconcile';
import {
  CHILD_NOTES_MAX,
  NOTES_APPEND_SEPARATOR,
  PHOTO_ONBOARDING_FEATURE_KEY,
  type RosterCommitEntryInput,
  type RosterEntryAction,
  type RosterImportEntryRow,
} from '@/lib/montree/photo-onboarding/types';

/** Creating 30 children + patching 20 more is several round-trips. */
export const maxDuration = 120;

const NAME_MAX = 200;
const VALID_ACTIONS: RosterEntryAction[] = ['create', 'update', 'archive', 'skip'];

function cleanName(value: unknown, fallback: string | null): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  const name = raw || (fallback || '').trim();
  return name ? name.slice(0, NAME_MAX) : null;
}

function cleanDob(value: unknown, fallback: string | null): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  const candidate = raw || fallback || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  const d = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== candidate) return null;
  return candidate;
}

function cleanNotes(value: unknown, fallback: string | null): string | null {
  const raw = typeof value === 'string' ? value.trim() : '';
  const notes = raw || (fallback || '').trim();
  return notes ? notes.slice(0, CHILD_NOTES_MAX) : null;
}

function cleanGender(value: unknown, fallback: string | null): string | null {
  const candidate = typeof value === 'string' ? value : fallback;
  return candidate === 'boy' || candidate === 'girl' ? candidate : null;
}

function cleanAge(value: unknown, fallback: number | null, dob: string | null): number | null {
  const fromDob = ageFromDob(dob);
  if (fromDob !== null) return fromDob; // a real birthday always beats a typed age
  const n = typeof value === 'number' ? value : fallback;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n);
}

/**
 * Append imported notes to whatever the child already has.
 *
 * 🚨 APPEND, NEVER OVERWRITE. A child's notes are months of a teacher's own
 * observations; an import that replaced them would destroy the record. If the
 * incoming text is already present we return the existing notes unchanged, so
 * re-running an import doesn't stack duplicates.
 */
export function mergeNotes(existing: string | null, incoming: string | null): string | null {
  const add = (incoming || '').trim();
  const have = (existing || '').trim();
  if (!add) return existing ?? null;
  if (!have) return add.slice(0, CHILD_NOTES_MAX);
  if (have.includes(add)) return existing ?? null;

  const merged = `${have}${NOTES_APPEND_SEPARATOR}${add}`;
  if (merged.length <= CHILD_NOTES_MAX) return merged;
  // Over the cap: keep the existing record intact and truncate the addition.
  const room = CHILD_NOTES_MAX - have.length - NOTES_APPEND_SEPARATOR.length - 1;
  if (room <= 0) return have.slice(0, CHILD_NOTES_MAX);
  return `${have}${NOTES_APPEND_SEPARATOR}${add.slice(0, room)}…`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;

    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    if (!(await isFeatureEnabled(supabase, auth.schoolId, PHOTO_ONBOARDING_FEATURE_KEY))) {
      return NextResponse.json({ success: false, error: 'feature_disabled' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray((body as { entries?: unknown }).entries)) {
      return NextResponse.json({ success: false, error: 'entries array required' }, { status: 400 });
    }
    const inputs = (body as { entries: RosterCommitEntryInput[] }).entries;

    // ----- Import + ownership -----
    const { data: importRow } = await supabase
      .from('montree_roster_imports')
      .select('id, school_id, classroom_id, status')
      .eq('id', importId)
      .maybeSingle();

    if (!importRow) {
      return NextResponse.json({ success: false, error: 'Import not found' }, { status: 404 });
    }
    if (importRow.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    if (importRow.status === 'committed') {
      return NextResponse.json({ success: false, error: 'already_committed' }, { status: 409 });
    }
    if (importRow.status !== 'review') {
      return NextResponse.json(
        { success: false, error: `Import is ${importRow.status}, not ready to apply` },
        { status: 400 }
      );
    }

    // 🚨 SECURITY: re-verify the classroom against the authenticated school.
    // The import row carries a classroom_id written at upload time; we never
    // trust a stored id to still be ours without checking.
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', importRow.classroom_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroom) {
      console.error('[SECURITY] Roster commit into a foreign classroom blocked:', {
        importId, classroomId: importRow.classroom_id, authSchool: auth.schoolId, userId: auth.userId,
      });
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // ----- The stored proposals (server-side truth for anything not edited) --
    const { data: storedRows } = await supabase
      .from('montree_roster_import_entries')
      .select('*')
      .eq('import_id', importId);

    const stored = new Map<string, RosterImportEntryRow>();
    for (const r of (storedRows || []) as RosterImportEntryRow[]) stored.set(r.id, r);

    // ----- Resolve each reviewed row against its stored proposal ------------
    type Resolved = {
      entry: RosterImportEntryRow;
      action: RosterEntryAction;
      name: string | null;
      dob: string | null;
      age: number | null;
      gender: string | null;
      notes: string | null;
    };

    const resolved: Resolved[] = [];
    let skipped = 0;

    for (const input of inputs) {
      if (!input || typeof input.id !== 'string') continue;
      const entry = stored.get(input.id);
      if (!entry) continue; // an id not belonging to this import is ignored, not trusted

      const action = VALID_ACTIONS.includes(input.action as RosterEntryAction)
        ? (input.action as RosterEntryAction)
        : entry.suggested_action;

      if (action === 'skip') { skipped++; continue; }

      const dob = cleanDob(input.date_of_birth, entry.date_of_birth);
      const name = cleanName(input.name, entry.name_raw);

      if ((action === 'create' || action === 'update') && !name) {
        return NextResponse.json(
          { success: false, error: 'Every student you are creating or updating needs a name' },
          { status: 400 }
        );
      }
      if ((action === 'update' || action === 'archive') && !entry.matched_child_id) {
        // Nothing to point at — treat as a skip rather than inventing a target.
        skipped++;
        continue;
      }

      resolved.push({
        entry,
        action,
        name,
        dob,
        age: cleanAge(input.age, entry.age, dob),
        gender: cleanGender(input.gender, entry.gender),
        notes: cleanNotes(input.notes, entry.notes),
      });
    }

    // Every child we are about to touch must belong to THIS classroom. One
    // query beats a per-row verifyChildBelongsToSchool round-trip and is
    // strictly stricter (classroom, not just school).
    const targetIds = Array.from(new Set(
      resolved
        .filter((r) => r.action === 'update' || r.action === 'archive')
        .map((r) => r.entry.matched_child_id)
        .filter((id): id is string => !!id)
    ));

    const existingById = new Map<string, { id: string; name: string; notes: string | null }>();
    if (targetIds.length > 0) {
      const { data: childRows } = await supabase
        .from('montree_children')
        .select('id, name, notes')
        .in('id', targetIds)
        .eq('classroom_id', importRow.classroom_id)
        .eq('school_id', auth.schoolId);
      for (const c of (childRows || []) as Array<{ id: string; name: string; notes: string | null }>) {
        existingById.set(c.id, c);
      }
    }

    let created = 0;
    let updated = 0;
    let archived = 0;
    let failed = 0;

    // ----- CREATE (one batch insert) ---------------------------------------
    const toCreate = resolved.filter((r) => r.action === 'create');
    if (toCreate.length > 0) {
      const rows = toCreate.map((r) => ({
        id: crypto.randomUUID(),
        classroom_id: importRow.classroom_id,
        school_id: auth.schoolId,
        name: r.name as string,
        age: r.age,
        date_of_birth: r.dob,
        notes: r.notes,
        enrolled_at: new Date().toISOString().split('T')[0],
        ...(r.gender ? { settings: { gender: r.gender } } : {}),
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('montree_children')
        .insert(rows)
        .select('id');

      if (insertError) {
        console.error('[PhotoOnboarding] Create failed:', insertError.message, insertError.code);
        failed += rows.length;
      } else {
        created = (inserted || []).length;
        if (created < rows.length) failed += rows.length - created;
      }
    }

    // ----- UPDATE (per row — notes must merge against current DB state) -----
    for (const r of resolved.filter((x) => x.action === 'update')) {
      const childId = r.entry.matched_child_id as string;
      const current = existingById.get(childId);
      if (!current) { failed++; continue; }

      const patch: Record<string, unknown> = {};
      if (r.name && r.name !== current.name) patch.name = r.name;
      if (r.dob) patch.date_of_birth = r.dob;
      if (r.age !== null) patch.age = r.age;

      const mergedNotes = mergeNotes(current.notes, r.notes);
      if (mergedNotes !== current.notes) patch.notes = mergedNotes;

      if (Object.keys(patch).length === 0) { updated++; continue; } // nothing to change is success

      const { error: updateError } = await supabase
        .from('montree_children')
        .update(patch)
        .eq('id', childId)
        .eq('school_id', auth.schoolId);

      if (updateError) {
        console.error('[PhotoOnboarding] Update failed for', childId, updateError.message);
        failed++;
      } else {
        updated++;
      }
    }

    // ----- ARCHIVE (soft; data retained) -----------------------------------
    const toArchive = resolved
      .filter((r) => r.action === 'archive')
      .map((r) => r.entry.matched_child_id as string)
      .filter((id) => existingById.has(id));

    failed += resolved.filter((r) => r.action === 'archive').length - toArchive.length;

    if (toArchive.length > 0) {
      const { data: archivedRows, error: archiveError } = await supabase
        .from('montree_children')
        .update({ is_active: false })
        .in('id', toArchive)
        .eq('school_id', auth.schoolId)
        .select('id');

      if (archiveError) {
        console.error('[PhotoOnboarding] Archive failed:', archiveError.message);
        failed += toArchive.length;
      } else {
        archived = (archivedRows || []).length;
        if (archived < toArchive.length) failed += toArchive.length - archived;

        // Archiving a child removes them from every teacher-facing list —
        // sensitive enough to leave a trail, same posture as child_delete.
        logAudit(supabase, {
          adminIdentifier: auth.userId || 'unknown',
          action: 'child_archive',
          resourceType: 'child',
          resourceId: importRow.classroom_id,
          resourceDetails: {
            via: 'photo_onboarding',
            import_id: importId,
            classroom_id: importRow.classroom_id,
            child_ids: toArchive,
            names: resolved
              .filter((r) => r.action === 'archive')
              .map((r) => r.entry.name_raw),
          },
          ipAddress: getClientIP(request.headers),
          userAgent: getUserAgent(request.headers),
          isSensitive: true,
        }).catch((err) => console.error('[PhotoOnboarding] Audit log failed:', err));
      }
    }

    await supabase
      .from('montree_roster_imports')
      .update({ status: 'committed', committed_at: new Date().toISOString() })
      .eq('id', importId);

    return NextResponse.json({
      success: true,
      created,
      updated,
      archived,
      skipped,
      failed,
    });
  } catch (error) {
    console.error('[PhotoOnboarding] Commit error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
