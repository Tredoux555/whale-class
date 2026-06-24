// app/api/story/coach/documents/route.ts
//
// Browser-callable BATCH SAVE for the coach document store. This is the only
// client-facing write into story_coach_documents — distinct from the coach's
// save_document TOOL (AI-invoked). It powers the "Save to my documents" drop
// zone, which is a SEPARATE surface from the composer's context-attach (those
// two intents never share a path).
//
// Space-scoped + service-role, like every coach store: the space is sourced
// ONLY from the verified token (never the client body), so one account can
// never write into another's. Refused in e2e (sealed) spaces — documents are
// server-readable, which would break the seal.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import { selectAdminUserForAuth } from '@/lib/sanctuary-e2e/server-auth';
import { saveDocument } from '@/lib/story/coach/documents';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// One drop can hold a folder of files — generous, but bounded so a runaway
// batch can't hammer the DB in a single request.
const MAX_ITEMS = 50;

interface IncomingItem {
  title?: unknown;
  content?: unknown;
  doc_type?: unknown;
  tags?: unknown;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const admin = await verifyAdminToken(auth);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const space = await getAdminSpace(auth);
  if (!space) return NextResponse.json({ error: 'No space on this session.' }, { status: 401 });

  const supabase = getSupabase();

  // Documents are server-readable; an e2e (sealed, device-encrypted) space must
  // not persist them here — mirror the save_document tool's refusal.
  const isE2e = (await selectAdminUserForAuth(supabase, admin))?.e2e === true;
  if (isE2e) {
    return NextResponse.json({ error: 'Documents aren’t available in an end-to-end private space.' }, { status: 403 });
  }

  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? (body.items as IncomingItem[]) : null;
  if (!items || !items.length) {
    return NextResponse.json({ error: 'No documents to save.' }, { status: 400 });
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Too many at once — ${MAX_ITEMS} max per save.` }, { status: 400 });
  }

  const results: { title: string; ok: boolean; id?: string; error?: string }[] = [];
  for (const it of items) {
    const title = typeof it.title === 'string' ? it.title : '';
    const content = typeof it.content === 'string' ? it.content : '';
    const doc_type = typeof it.doc_type === 'string' ? it.doc_type : undefined;
    const tags = Array.isArray(it.tags)
      ? it.tags.map((t) => (typeof t === 'string' ? t : '')).filter(Boolean)
      : [];

    if (!title.trim() || !content.trim()) {
      results.push({ title: title || '(untitled)', ok: false, error: 'title and content are required' });
      continue;
    }
    const res = await saveDocument(supabase, space, { title, content, doc_type, tags });
    results.push(res.ok
      ? { title, ok: true, id: res.id }
      : { title, ok: false, error: res.error });
  }

  const saved = results.filter((r) => r.ok).length;
  const failed = results.length - saved;
  return NextResponse.json({ saved, failed, results });
}
