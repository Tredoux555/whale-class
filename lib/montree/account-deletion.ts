// lib/montree/account-deletion.ts
//
// Self-service account deletion for Montree (Apple App Store Guideline
// 5.1.1(v): apps that support account creation must support in-app account
// deletion that actually deletes the account + initiates data deletion).
//
// Role-aware by design — deleting an account means different things per role:
//
//   teacher / agent            -> 'personal': remove only this login. The
//                                 school + children are tenant-owned and stay.
//   homeschool_parent          -> 'school_purge': they are the sole owner /
//                                 data controller, so their whole tenant goes.
//   principal (sole member)    -> 'school_purge': last person in the school.
//   principal (others remain)  -> 'personal': remove just them; the school
//                                 keeps running (UI warns to assign another
//                                 principal first).
//
// A 'school_purge' is irreversible and gated behind typed confirmation of the
// school name, enforced server-side (the client value is never trusted).
//
// Every deletion writes an audit row (montree_account_deletion_audit, mig 247)
// BEFORE the destructive cascade so the record survives it.

import { getSupabase } from '@/lib/supabase-client';

export type AccountRole = 'teacher' | 'principal' | 'homeschool_parent' | 'agent';
export type DeletionMode = 'personal' | 'school_purge';

export interface TeacherAccountRow {
  id: string;
  school_id: string;
  name: string | null;
  email: string | null;
  role: AccountRole;
}

export interface DeletionPreview {
  role: AccountRole;
  mode: DeletionMode;
  schoolId: string;
  schoolName: string;
  accountName: string;
  counts: { children: number; teachers: number; media: number };
  requiresConfirmation: boolean;     // true for school_purge
  confirmationPhrase: string | null; // the exact text the user must type
  blocked: boolean;
  blockedReason: string | null;
  summary: string;                   // human sentence for the UI
}

export interface DeletionResult {
  deleted: true;
  mode: DeletionMode;
  counts: { children: number; teachers: number; media: number };
}

// Error subclass so routes can map to a clean HTTP status.
export class AccountDeletionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AccountDeletionError';
    this.status = status;
  }
}

type Supa = ReturnType<typeof getSupabase>;

async function loadTeacher(supabase: Supa, teacherId: string): Promise<TeacherAccountRow> {
  const { data, error } = await supabase
    .from('montree_teachers')
    .select('id, school_id, name, email, role')
    .eq('id', teacherId)
    .maybeSingle();
  if (error) throw new AccountDeletionError(error.message, 500);
  if (!data) throw new AccountDeletionError('account not found', 404);
  const row = data as { id: string; school_id: string; name: string | null; email: string | null; role: string | null };
  return { ...row, role: (row.role as AccountRole) || 'teacher' };
}

async function countRows(supabase: Supa, table: string, schoolId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId);
    return count ?? 0;
  } catch {
    return 0; // table/column may not exist on older DBs — non-fatal for a snapshot
  }
}

// Active human members of a school (excludes 'agent' shells, whose school_id
// is an inert placeholder). Used to decide principal -> personal vs purge.
async function countSchoolMembers(supabase: Supa, schoolId: string, excludeId: string): Promise<number> {
  const { count } = await supabase
    .from('montree_teachers')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .in('role', ['teacher', 'principal', 'homeschool_parent'])
    .neq('id', excludeId);
  return count ?? 0;
}

async function getSchoolName(supabase: Supa, schoolId: string): Promise<string> {
  const { data } = await supabase
    .from('montree_schools')
    .select('name')
    .eq('id', schoolId)
    .maybeSingle();
  return (data as { name?: string } | null)?.name || 'your school';
}

// Agents with payout history are blocked from self-delete: agent_payouts FK is
// ON DELETE RESTRICT (financial records must be retained). They contact support.
async function agentHasPayouts(supabase: Supa, agentId: string): Promise<boolean> {
  try {
    const { count } = await supabase
      .from('montree_agent_payouts')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId);
    return (count ?? 0) > 0;
  } catch {
    return false; // table missing on older DBs — nothing to block on
  }
}

/**
 * Build the deletion preview for a logged-in teacher/principal/homeschool/agent.
 * Pure read — no mutation. The route returns this so the UI can show an
 * accurate, role-correct confirmation screen.
 */
export async function previewAccountDeletion(auth: { userId: string }): Promise<DeletionPreview> {
  const supabase = getSupabase();
  const t = await loadTeacher(supabase, auth.userId);
  const schoolName = await getSchoolName(supabase, t.school_id);
  const accountName = t.name || t.email || 'your account';

  // Decide mode.
  let mode: DeletionMode;
  if (t.role === 'homeschool_parent') {
    mode = 'school_purge';
  } else if (t.role === 'principal') {
    const others = await countSchoolMembers(supabase, t.school_id, t.id);
    mode = others === 0 ? 'school_purge' : 'personal';
  } else {
    mode = 'personal'; // teacher, agent
  }

  // Agent payout block.
  if (t.role === 'agent' && (await agentHasPayouts(supabase, t.id))) {
    return {
      role: t.role, mode: 'personal', schoolId: t.school_id, schoolName, accountName,
      counts: { children: 0, teachers: 0, media: 0 },
      requiresConfirmation: false, confirmationPhrase: null,
      blocked: true,
      blockedReason:
        'Your partner account has payout records that must be retained. Contact support to close it.',
      summary: 'Account deletion is unavailable while payout records exist.',
    };
  }

  const counts =
    mode === 'school_purge'
      ? {
          children: await countRows(supabase, 'montree_children', t.school_id),
          teachers: await countRows(supabase, 'montree_teachers', t.school_id),
          media: await countRows(supabase, 'montree_media', t.school_id),
        }
      : { children: 0, teachers: 0, media: 0 };

  const summary =
    mode === 'school_purge'
      ? `This permanently deletes “${schoolName}” and everything in it: ${counts.children} child record(s), ${counts.media} media item(s) — the photo and video files themselves, not just the records — and all teacher logins. This cannot be undone.`
      : `This permanently deletes your personal login (“${accountName}”). The school and its children are kept.`;

  return {
    role: t.role, mode, schoolId: t.school_id, schoolName, accountName, counts,
    requiresConfirmation: mode === 'school_purge',
    confirmationPhrase: mode === 'school_purge' ? schoolName : null,
    blocked: false, blockedReason: null, summary,
  };
}

// Null the nullable "authored-by" pointers that have NO ON DELETE clause
// (default NO ACTION) and would otherwise block deleting a teacher row.
// Each is wrapped — a missing table on an older DB is non-fatal.
async function detachAuthoredRefs(supabase: Supa, teacherId: string): Promise<void> {
  // PromiseLike, not Promise: a PostgrestFilterBuilder is a thenable that only
  // fires when awaited — which is exactly what the loop below does.
  const ops: Array<PromiseLike<unknown>> = [
    supabase.from('montree_phonics_words').update({ created_by: null } as never).eq('created_by', teacherId),
    supabase.from('montree_phonics_images').update({ created_by: null } as never).eq('created_by', teacherId),
    supabase.from('montree_custom_curriculum').update({ created_by: null } as never).eq('created_by', teacherId),
    supabase.from('montree_work_imports').update({ confirmed_by: null } as never).eq('confirmed_by', teacherId),
    supabase.from('montree_curriculum_imports').update({ created_by: null } as never).eq('created_by', teacherId),
    supabase.from('montree_weekly_admin_notes').update({ updated_by: null } as never).eq('updated_by', teacherId),
  ];
  for (const op of ops) {
    try { await op; } catch { /* table/column absent on this DB — skip */ }
  }
}

async function writeAudit(
  supabase: Supa,
  row: {
    account_id: string; account_kind: AccountRole | 'parent'; account_name: string | null;
    account_email: string | null; school_id: string; mode: DeletionMode;
    reason: string; counts: { children: number; teachers: number; media: number };
  }
): Promise<void> {
  try {
    await supabase.from('montree_account_deletion_audit').insert({
      account_id: row.account_id,
      account_kind: row.account_kind,
      account_name: row.account_name,
      account_email: row.account_email,
      school_id: row.school_id,
      mode: row.mode,
      requested_by: row.account_id, // self-service
      reason: row.reason,
      children_count_at_deletion: row.counts.children,
      teachers_count_at_deletion: row.counts.teachers,
      media_count_at_deletion: row.counts.media,
    } as never);
  } catch (err) {
    // Non-fatal: proceed with deletion but log loudly so the gap is visible.
    console.warn('[account-deletion] audit insert failed (proceeding):',
      err instanceof Error ? err.message : 'unknown');
  }
}

// ── Storage purge ────────────────────────────────────────────────────────────
// The 44 ON DELETE CASCADE FKs take care of every ROW. They do not touch a
// single BYTE in Supabase Storage — those objects live outside Postgres and
// nothing references them once their row is gone. Before this, a school purge
// left every photo and video of every child sitting in the `montree-media`
// bucket indefinitely: orphaned, unreferenced, and still there. For an
// Apple-5.1.1(v) "initiate deletion of the user's data" promise about children's
// photographs, that is the part that actually matters.
//
// So the paths are collected FIRST (while the rows still exist to name them) and
// the objects removed, then the cascade runs.
//
// Contract: deleting the ACCOUNT is the promise. A storage failure is logged
// loudly with counts and does NOT abort — a half-deleted account would be worse
// than a few leaked objects, and a retry has no row left to work from.

const MEDIA_BUCKET = 'montree-media';
/** Supabase storage remove() takes a list; 100 keeps each request small. */
const REMOVE_BATCH = 100;
/** Rows per page when listing paths. A big school can hold thousands of media rows. */
const PATH_PAGE = 1000;

/**
 * Strip a stored value down to a bucket-relative storage path.
 *
 * montree_children.photo_url holds a FULL public URL with a cache-bust query
 * (see app/api/montree/children/[childId]/photo/route.ts), while montree_media
 * columns hold bare paths. Both shapes arrive here; anything that is neither is
 * returned as null so a stray external URL is never handed to remove().
 */
function toStoragePath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  let path = value.trim();
  const publicMatch = path.match(
    /\/storage\/v1\/(?:object|render\/image)\/(?:public|sign)\/([^/]+)\/(.+)$/,
  );
  if (publicMatch) {
    if (publicMatch[1] !== MEDIA_BUCKET) return null; // a different bucket — not ours to delete
    path = publicMatch[2];
  } else if (/^https?:\/\//i.test(path)) {
    return null; // an absolute URL we do not recognise
  }
  path = path.split('?')[0].split('#')[0];
  path = path.replace(/^\/+/, '');
  return path || null;
}

/** Every montree-media object belonging to this school, deduplicated. */
async function collectSchoolStoragePaths(supabase: Supa, schoolId: string): Promise<string[]> {
  const paths = new Set<string>();

  // 1. montree_media — the child-work photos and videos.
  //    playback_path is the transcoded MP4 added by migration 354; thumbnail_path
  //    by migration 050. Both are separate objects from storage_path.
  try {
    for (let page = 0; ; page++) {
      const from = page * PATH_PAGE;
      const { data, error } = await supabase
        .from('montree_media')
        .select('storage_path, thumbnail_path, playback_path')
        .eq('school_id', schoolId)
        .range(from, from + PATH_PAGE - 1);
      if (error) {
        console.error('[account-deletion] media path listing failed:', error.message);
        break;
      }
      const rows = (data || []) as Array<Record<string, unknown>>;
      for (const row of rows) {
        for (const key of ['storage_path', 'thumbnail_path', 'playback_path']) {
          const p = toStoragePath(row[key]);
          if (p) paths.add(p);
        }
      }
      if (rows.length < PATH_PAGE) break;
    }
  } catch (e) {
    console.error('[account-deletion] media path listing threw:', e);
  }

  // 2. Child profile photos. montree_children has no school_id — it reaches the
  //    school through its classroom, the same join verify-child-access uses.
  try {
    for (let page = 0; ; page++) {
      const from = page * PATH_PAGE;
      const { data, error } = await supabase
        .from('montree_children')
        .select('photo_url, montree_classrooms!inner(school_id)')
        .eq('montree_classrooms.school_id', schoolId)
        .range(from, from + PATH_PAGE - 1);
      if (error) {
        console.error('[account-deletion] child photo listing failed:', error.message);
        break;
      }
      const rows = (data || []) as Array<Record<string, unknown>>;
      for (const row of rows) {
        const p = toStoragePath(row.photo_url);
        if (p) paths.add(p);
      }
      if (rows.length < PATH_PAGE) break;
    }
  } catch (e) {
    console.error('[account-deletion] child photo listing threw:', e);
  }

  return Array.from(paths);
}

/**
 * Remove the school's storage objects. Never throws — see the contract above.
 * Returns counts so the caller (and the logs) can see what actually happened.
 */
async function purgeSchoolStorage(
  supabase: Supa,
  schoolId: string,
): Promise<{ attempted: number; removed: number; failed: number }> {
  const paths = await collectSchoolStoragePaths(supabase, schoolId);
  if (paths.length === 0) return { attempted: 0, removed: 0, failed: 0 };

  let removed = 0;
  let failed = 0;

  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH);
    try {
      const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(batch);
      if (error) {
        failed += batch.length;
        console.error(
          `[account-deletion] storage remove failed for ${batch.length} object(s) ` +
            `(school ${schoolId}): ${error.message}`,
        );
      } else {
        removed += batch.length;
      }
    } catch (e) {
      failed += batch.length;
      console.error(
        `[account-deletion] storage remove threw for ${batch.length} object(s) ` +
          `(school ${schoolId}):`,
        e,
      );
    }
  }

  const line =
    `[account-deletion] storage purge for school ${schoolId}: ` +
    `${removed}/${paths.length} object(s) removed, ${failed} failed.`;
  if (failed > 0) console.error(line + ' Orphaned objects remain — clean up by hand.');
  else console.log(line);

  return { attempted: paths.length, removed, failed };
}

/**
 * Execute the deletion. Re-derives the preview server-side (never trusts the
 * client's mode), enforces typed confirmation for purges, writes the audit
 * row, then performs the role-correct cascade.
 */
export async function executeAccountDeletion(
  auth: { userId: string },
  opts: { confirmText?: string; reason?: string }
): Promise<DeletionResult> {
  const supabase = getSupabase();
  const preview = await previewAccountDeletion(auth);
  if (preview.blocked) {
    throw new AccountDeletionError(preview.blockedReason || 'Deletion unavailable', 409);
  }

  if (preview.requiresConfirmation) {
    const typed = (opts.confirmText || '').trim();
    if (typed !== (preview.confirmationPhrase || '').trim()) {
      throw new AccountDeletionError(
        'Confirmation text does not match the school name.', 400);
    }
  }

  const t = await loadTeacher(supabase, auth.userId);
  const reason = String(opts.reason || '').trim().slice(0, 500);
  await writeAudit(supabase, {
    account_id: t.id, account_kind: t.role, account_name: t.name,
    account_email: t.email, school_id: t.school_id, mode: preview.mode,
    reason, counts: preview.counts,
  });

  if (preview.mode === 'school_purge') {
    // 🚨 STORAGE FIRST, while the rows that name the objects still exist. The
    // cascade below deletes montree_media and montree_children outright; after
    // it runs there is nothing left to tell us which objects in the bucket
    // belonged to this school. Failures here are logged, never fatal — see the
    // contract on purgeSchoolStorage.
    await purgeSchoolStorage(supabase, t.school_id);

    // Deleting the school row cascades (44 ON DELETE CASCADE FKs) to
    // classrooms, children, media, teachers, observations, progress, etc.
    const { error } = await supabase.from('montree_schools').delete().eq('id', t.school_id);
    if (error) {
      throw new AccountDeletionError(
        `Could not delete the school. ${error.message}. If this persists, contact support.`,
        500);
    }
  } else {
    // 'personal' deliberately purges NO storage: the photos and videos are
    // tenant-owned (the school keeps running without this one login), so
    // deleting them would destroy other people's data. Only a school_purge,
    // where the tenant itself is going, touches the bucket.
    await detachAuthoredRefs(supabase, t.id);
    const { error } = await supabase
      .from('montree_teachers').delete().eq('id', t.id).eq('school_id', t.school_id);
    if (error) {
      throw new AccountDeletionError(`Could not delete your account. ${error.message}`, 500);
    }
  }

  return { deleted: true, mode: preview.mode, counts: preview.counts };
}

// ── Parent (portal) self-deletion ────────────────────────────────────
// Parents authenticate via access-code and get a provisioned montree_parents
// row (Session 117). Deleting it removes the parent account + their link to
// the child (cascade: montree_parent_children, _profiles, _meetings). The
// CHILD record stays — it is owned by the school, not the parent.

export interface ParentDeletionPreview {
  childName: string;
  summary: string;
  requiresConfirmation: boolean;
}

export async function previewParentDeletion(parentId: string): Promise<ParentDeletionPreview> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('montree_parents')
    .select('id, name')
    .eq('id', parentId)
    .maybeSingle();
  const name = (data as { name?: string } | null)?.name || 'your child';
  return {
    childName: name,
    summary:
      "This permanently deletes your parent account and removes your access. " +
      "Your child's learning records stay with the school. This cannot be undone.",
    requiresConfirmation: false,
  };
}

export async function executeParentDeletion(
  parentId: string,
  reason = ''
): Promise<{ deleted: true }> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('montree_parents')
    .select('id, school_id, name, email')
    .eq('id', parentId)
    .maybeSingle();
  if (!data) throw new AccountDeletionError('parent account not found', 404);
  const p = data as { id: string; school_id: string; name: string | null; email: string | null };

  await writeAudit(supabase, {
    account_id: p.id, account_kind: 'parent', account_name: p.name,
    account_email: p.email, school_id: p.school_id, mode: 'personal',
    reason: String(reason || '').trim().slice(0, 500),
    counts: { children: 0, teachers: 0, media: 0 },
  });

  const { error } = await supabase.from('montree_parents').delete().eq('id', p.id);
  if (error) throw new AccountDeletionError(`Could not delete your account. ${error.message}`, 500);
  return { deleted: true };
}
