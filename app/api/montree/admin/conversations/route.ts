// app/api/montree/admin/conversations/route.ts
//
// CRUD for the principal vault. Handles GET (list) and POST (save encrypted
// blob). The dynamic [id] sibling route handles GET-one + DELETE.
//
// The server only ever sees ciphertext + crypto parameters. The plaintext
// (summary, transcript, child_name, etc.) is encrypted client-side using a
// key derived from the principal's vault password via WebCrypto PBKDF2.
//
// Same Tredoux-only gate as /transcribe.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const maxDuration = 30;

// 🚨 Session 114 — PRINCIPAL_VAULT_ENABLED_FOR allow-list dropped.
// Every authenticated principal has access. Each principal sets their own
// vault password on first use; per-record salt + PBKDF2 means the records
// of one principal cannot be decrypted by another. The principal_id +
// school_id filters on every query enforce cross-school scoping.

// Reasonable upper bound on a single record. ~10 hours of meeting at typical
// summary+transcript token sizes is well under this. Anything larger is suspect.
const MAX_CIPHERTEXT_BYTES = 2 * 1024 * 1024;

// ── GET — list the principal's conversations (newest first) ──────────────
export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_principal_vault')
    .select(
      'id, principal_id, school_id, salt_b64, iv_b64, ciphertext_b64, pbkdf2_iterations, cipher_version, recorded_at, duration_seconds, created_at'
    )
    .eq('principal_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .order('recorded_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[conversations GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to load conversations.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversations: data || [] });
}

// ── POST — save a new encrypted conversation ─────────────────────────────
//
// Body: {
//   salt_b64: string,
//   iv_b64: string,
//   ciphertext_b64: string,
//   pbkdf2_iterations?: number,    // default 600000
//   cipher_version?: number,       // default 1
//   recorded_at?: string ISO,      // default now
//   duration_seconds?: number,
// }
export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }

  let body: {
    salt_b64?: string;
    iv_b64?: string;
    ciphertext_b64?: string;
    pbkdf2_iterations?: number;
    cipher_version?: number;
    recorded_at?: string;
    duration_seconds?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const salt = (body.salt_b64 || '').trim();
  const iv = (body.iv_b64 || '').trim();
  const cipher = (body.ciphertext_b64 || '').trim();
  if (!salt || !iv || !cipher) {
    return NextResponse.json(
      { error: 'salt_b64, iv_b64, and ciphertext_b64 are all required.' },
      { status: 400 }
    );
  }

  // Sanity-check base64 shapes (length-wise) before insert.
  // 16-byte salt → 24 chars b64 (with padding). 12-byte iv → 16 chars b64.
  if (!/^[A-Za-z0-9+/=]+$/.test(salt) || !/^[A-Za-z0-9+/=]+$/.test(iv) || !/^[A-Za-z0-9+/=]+$/.test(cipher)) {
    return NextResponse.json(
      { error: 'Crypto fields must be base64.' },
      { status: 400 }
    );
  }
  if (salt.length < 20 || salt.length > 64) {
    return NextResponse.json({ error: 'salt_b64 length unexpected.' }, { status: 400 });
  }
  if (iv.length < 12 || iv.length > 32) {
    return NextResponse.json({ error: 'iv_b64 length unexpected.' }, { status: 400 });
  }
  if (cipher.length > MAX_CIPHERTEXT_BYTES) {
    return NextResponse.json(
      { error: 'Ciphertext too large (max ~2MB encoded).' },
      { status: 413 }
    );
  }

  const iterations = Number.isFinite(body.pbkdf2_iterations)
    ? body.pbkdf2_iterations!
    : 600_000;
  if (iterations < 100_000 || iterations > 5_000_000) {
    return NextResponse.json(
      { error: 'pbkdf2_iterations out of safe range (100k–5M).' },
      { status: 400 }
    );
  }
  const cipherVersion = Number.isFinite(body.cipher_version) ? body.cipher_version! : 1;

  const recordedAt = body.recorded_at || new Date().toISOString();
  const duration =
    Number.isFinite(body.duration_seconds) && body.duration_seconds! >= 0
      ? Math.round(body.duration_seconds!)
      : null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_principal_vault')
    .insert({
      principal_id: auth.userId,
      school_id: auth.schoolId,
      salt_b64: salt,
      iv_b64: iv,
      ciphertext_b64: cipher,
      pbkdf2_iterations: iterations,
      cipher_version: cipherVersion,
      recorded_at: recordedAt,
      duration_seconds: duration,
    })
    .select('id, recorded_at, duration_seconds, created_at')
    .single();

  if (error || !data) {
    console.error('[conversations POST] insert error:', error);
    return NextResponse.json(
      { error: 'Failed to save conversation.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversation: data });
}
