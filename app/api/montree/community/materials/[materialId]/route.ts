// /api/montree/community/materials/[materialId]
// DELETE — take your own file out of the drop box.
//
// The row is soft-deleted (author-scoped in the query, same posture as posts),
// then the storage object is removed on a best-effort basis: the file
// disappearing from the board is what the teacher asked for, and a storage
// hiccup must not make it look like the delete failed. A leftover object is
// unreferenced and harmless — its row is already gone from every listing.
//
// Next 16: route params arrive as a Promise and must be awaited.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { requireConfirmedUser } from '@/lib/montree/community/auth';
import { isMissingTable, migrationPending, serverError } from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

const BUCKET = 'community-materials';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const { materialId } = await params;
    if (!UUID_RE.test(materialId || '')) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const gate = await requireConfirmedUser(request);
    if ('error' in gate) return gate.error;
    const user = gate.user;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_community_materials')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', materialId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select('id, storage_path');

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('materials.DELETE', error);
    }
    if (!data || data.length === 0) {
      // Not yours, already gone, or never existed — one answer for all three.
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const storagePath = data[0].storage_path as string | null;
    if (storagePath) {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove([storagePath]);
      if (removeError) {
        console.error('[community/materials] storage remove failed (row already hidden):', removeError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError('materials.DELETE', err);
  }
}
