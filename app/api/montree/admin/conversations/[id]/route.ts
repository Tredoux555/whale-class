// app/api/montree/admin/conversations/[id]/route.ts
//
// Single-conversation read + delete. Read returns the encrypted blob; the
// principal decrypts it client-side with their vault password. Server still
// can't see plaintext.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const maxDuration = 30;

const PRINCIPAL_VAULT_ENABLED_FOR = new Set<string>([
  '16eec1c0-bfb5-4edf-a160-059bb41803fb', // Tredoux on Whale Class
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }
  if (!PRINCIPAL_VAULT_ENABLED_FOR.has(auth.userId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_principal_vault')
    .select(
      'id, principal_id, school_id, salt_b64, iv_b64, ciphertext_b64, pbkdf2_iterations, cipher_version, recorded_at, duration_seconds, created_at, updated_at'
    )
    .eq('id', id)
    .eq('principal_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();

  if (error) {
    console.error('[conversations/[id] GET] error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ conversation: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }
  if (!PRINCIPAL_VAULT_ENABLED_FOR.has(auth.userId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('montree_principal_vault')
    .delete()
    .eq('id', id)
    .eq('principal_id', auth.userId)
    .eq('school_id', auth.schoolId);

  if (error) {
    console.error('[conversations/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
