// /api/montree/community/posts/[postId]
// DELETE — soft-delete your own message.
//
// 🚨 Authorship is enforced IN THE QUERY (.eq('user_id', user.id)), not by a
// fetch-then-compare: there is no window in which the wrong row can be
// updated, and an attempt on someone else's post simply matches nothing and
// reads back as 404 — which also means it can't be used to probe whether a
// given post id exists.
//
// Next 16: route params arrive as a Promise and must be awaited.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { requireConfirmedUser } from '@/lib/montree/community/auth';
import { isMissingTable, migrationPending, serverError } from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    if (!UUID_RE.test(postId || '')) {
      return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    }

    const gate = await requireConfirmedUser(request);
    if ('error' in gate) return gate.error;
    const user = gate.user;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_community_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('posts.DELETE', error);
    }
    if (!data || data.length === 0) {
      // Not yours, already gone, or never existed — one answer for all three.
      return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError('posts.DELETE', err);
  }
}
