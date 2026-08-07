// DELETE /api/potato/photos/[id] — remove a bad shot.
// Teacher only, and only for a photo belonging to her own class. The junction
// rows cascade; the storage object is removed best-effort (an orphaned object
// costs pennies, a 500 costs the teacher her afternoon).

import { NextRequest, NextResponse } from 'next/server';
import { verifyPotatoTeacher, UUID_RE } from '@/lib/potato/auth';
import { potatoDb, loadClass, isSetupPending, POTATO_BUCKET } from '@/lib/potato/db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifyPotatoTeacher(request);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid photo id' }, { status: 400 });
  }

  try {
    const supabase = potatoDb();

    // 🚨 Deactivating a class is the only revocation lever for a 10-year
    // teacher cookie — re-check it here too, not just on the routes that
    // happen to load the class for other reasons.
    const klass = await loadClass(supabase, session.classId);
    if (!klass) return NextResponse.json({ error: 'Class not found' }, { status: 404 });

    // 🚨 Ownership before deletion: the class comes from the cookie, never the
    // request, and the row must match both.
    const { data: photo, error: findError } = await supabase
      .from('tp_photos')
      .select('id, storage_path, class_id')
      .eq('id', id)
      .eq('class_id', session.classId)
      .maybeSingle();
    if (findError) throw findError;
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    const { error: deleteError } = await supabase
      .from('tp_photos')
      .delete()
      .eq('id', photo.id)
      .eq('class_id', session.classId);
    if (deleteError) throw deleteError;

    if (photo.storage_path) {
      const { error: removeError } = await supabase.storage
        .from(POTATO_BUCKET)
        .remove([photo.storage_path]);
      if (removeError) {
        console.error('[potato/photos/delete] storage remove failed (row already gone):', removeError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isSetupPending(error)) {
      return NextResponse.json({ error: 'setup_pending' }, { status: 503 });
    }
    console.error('[potato/photos/delete] error:', error);
    return NextResponse.json({ error: 'Could not delete that photo.' }, { status: 500 });
  }
}
