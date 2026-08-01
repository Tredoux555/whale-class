// /api/montree/community/materials/[materialId]/download
// Public download hop: count it, then redirect to the bucket's public URL.
//
// Going through our own origin (rather than linking the bucket URL directly)
// buys the download counter and keeps the storage layout an implementation
// detail the page never has to know. The bytes still come straight from
// Supabase's CDN — we never proxy the file itself.
//
// Next 16: route params arrive as a Promise and must be awaited.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { isMissingTable, migrationPending, rateLimited, serverError } from '@/lib/montree/community/http';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const { materialId } = await params;
    if (!UUID_RE.test(materialId || '')) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const supabase = getSupabase();
    const ip = getClientIP(request.headers);

    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/community/materials/download',
      60,
      15
    );
    if (!allowed) return rateLimited(retryAfterSeconds);

    const { data: material, error } = await supabase
      .from('montree_community_materials')
      .select('id, public_url, filename')
      .eq('id', materialId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return migrationPending();
      return serverError('materials.download', error);
    }
    if (!material?.public_url) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    // Atomic counter, fire-and-forget. 🚨 A Supabase .rpc() builder has no
    // .catch() — the second then() argument is the rejection handler. A
    // counter that fails must never block a download.
    supabase
      .rpc('montree_community_material_download', { p_id: materialId })
      .then(
        ({ error: rpcError }: { error: unknown }) => {
          if (rpcError) console.error('[community/download] counter failed:', rpcError);
        },
        (rpcErr: unknown) => console.error('[community/download] counter threw:', rpcErr)
      );

    // `?download=<name>` is what actually makes Supabase send
    // Content-Disposition: attachment — a cross-origin anchor's `download`
    // attribute is ignored by the browser (same trick as the letter cards).
    const target = new URL(material.public_url as string);
    target.searchParams.set('download', (material.filename as string) || 'file');

    return NextResponse.redirect(target.toString(), 302);
  } catch (err) {
    return serverError('materials.download', err);
  }
}
