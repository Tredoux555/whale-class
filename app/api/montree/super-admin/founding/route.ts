import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

// Super-admin control surface for the Founding 100.
// GET  → config (cap/wave/is_closed) + admitted/remaining counts + all rows
//        (each row includes signup_code + redeemed fields).
// PATCH → set_status (admit/decline/reset a row) OR update_config
//        (cap/wave/is_closed) OR generate_code (mint a FND- signup code for an
//        admitted row → the /montree/try?founding= link).

// FND- signup-code charset (migration 286). Excludes I/O/0/1 to avoid confusion
// when a code is read aloud or typed, matching the login-code convention.
const FND_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateFoundingCode(): string {
  let code = 'FND-';
  for (let i = 0; i < 6; i++) {
    code += FND_CHARS[Math.floor(Math.random() * FND_CHARS.length)];
  }
  return code;
}

export async function GET(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();

    const { data: config } = await supabase
      .from('montree_founding_config')
      .select('cap, wave, is_closed')
      .eq('id', 1)
      .maybeSingle();

    const { data: rows } = await supabase
      .from('montree_founding_waitlist')
      .select('id, school_name, contact_name, email, country, student_count, status, admitted_at, created_at, source, signup_code, code_generated_at, redeemed_by_school_id, redeemed_at')
      .order('created_at', { ascending: false })
      .limit(2000);

    const cap = config?.cap ?? 100;
    const admitted = (rows || []).filter((r) => r.status === 'admitted').length;

    return NextResponse.json(
      {
        config: { cap, wave: config?.wave ?? 1, is_closed: config?.is_closed ?? false },
        admitted,
        remaining: Math.max(0, cap - admitted),
        total: (rows || []).length,
        rows: rows || [],
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[super-admin/founding GET] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'set_status') {
      const { id, status } = body;
      if (!id || !['waitlisted', 'admitted', 'declined'].includes(status)) {
        return NextResponse.json({ error: 'Invalid id or status' }, { status: 400 });
      }
      const { error } = await supabase
        .from('montree_founding_waitlist')
        .update({
          status,
          admitted_at: status === 'admitted' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'update_config') {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (Number.isFinite(Number(body.cap))) patch.cap = Math.max(0, Math.round(Number(body.cap)));
      if (Number.isFinite(Number(body.wave))) patch.wave = Math.max(1, Math.round(Number(body.wave)));
      if (typeof body.is_closed === 'boolean') patch.is_closed = body.is_closed;
      const { error } = await supabase
        .from('montree_founding_config')
        .update(patch as never)
        .eq('id', 1);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Mint (or return the existing) FND- signup code for an admitted row.
    // 🚨 Idempotent: re-clicking returns the code already on the row — NEVER
    // rotates it (a rotated code would break a link already shared). Only
    // admitted rows are eligible; a waitlisted/declined row is rejected.
    if (action === 'generate_code') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
      }

      const { data: row, error: rowErr } = await supabase
        .from('montree_founding_waitlist')
        .select('id, status, signup_code, redeemed_at, redeemed_by_school_id')
        .eq('id', id)
        .maybeSingle();
      if (rowErr) throw rowErr;
      if (!row) {
        return NextResponse.json({ error: 'Row not found' }, { status: 404 });
      }
      if (row.status !== 'admitted') {
        return NextResponse.json({ error: 'Only admitted schools can be issued a signup code.' }, { status: 400 });
      }

      // Idempotent — already has a code, return it as-is.
      if (row.signup_code) {
        return NextResponse.json({
          success: true,
          signup_code: row.signup_code,
          redeemed_at: row.redeemed_at ?? null,
          redeemed_by_school_id: row.redeemed_by_school_id ?? null,
        });
      }

      // Generate a unique code. Retry on the rare UNIQUE collision (23505).
      // 🚨 REVIEW FIX (Jul 6): chain .select() so we can tell whether a row was
      // ACTUALLY stamped. Supabase returns { error: null, data: [] } — no error —
      // when the .is('signup_code', null) filter matches 0 rows (a concurrent
      // generate already minted the code). Without inspecting the returned rows
      // we'd hand the caller `candidate`, a code that was never persisted. So we
      // only accept the candidate when the update returned the row.
      let signupCode = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateFoundingCode();
        const { data: updated, error: updErr } = await supabase
          .from('montree_founding_waitlist')
          .update({
            signup_code: candidate,
            code_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', id)
          // Only stamp if it's still code-less — a concurrent generate for the
          // same row won't clobber an already-minted code.
          .is('signup_code', null)
          .select('signup_code');
        if (!updErr) {
          if (updated && updated.length > 0) {
            // We actually stamped the row.
            signupCode = candidate;
          }
          // else: 0 rows matched → the row already has a code (concurrent
          // generate won). Fall through to the re-read below.
          break;
        }
        if (updErr.code !== '23505') throw updErr; // real error, not a collision
        // else: code collided with another row — loop and try a fresh candidate
      }

      if (!signupCode) {
        // Either 5 collisions in a row (astronomically unlikely) OR a concurrent
        // generate won the row first. Re-read to surface whatever code landed.
        const { data: reread } = await supabase
          .from('montree_founding_waitlist')
          .select('signup_code')
          .eq('id', id)
          .maybeSingle();
        if (reread?.signup_code) {
          return NextResponse.json({ success: true, signup_code: reread.signup_code });
        }
        return NextResponse.json({ error: 'Could not generate a code. Try again.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, signup_code: signupCode });
    }

    // One-shot mint (Jul 6 launch): create an ALREADY-ADMITTED row + FND- code
    // in a single action. This matches the real workflow — founding schools
    // apply BY EMAIL, so there is usually no waitlist row to admit first.
    // Tredoux types school name + email → gets a shareable signup link.
    // Duplicate email: if the existing row is admitted + coded, return its code
    // (idempotent); otherwise 409 so we never silently clobber a real applicant.
    if (action === 'create_admitted') {
      const schoolName = String(body.school_name || '').trim().slice(0, 200);
      const email = String(body.email || '').trim().toLowerCase().slice(0, 320);
      const contactName = String(body.contact_name || '').trim().slice(0, 200) || null;
      const country = String(body.country || '').trim().slice(0, 100) || null;
      if (!schoolName || !email || !email.includes('@')) {
        return NextResponse.json({ error: 'School name and a valid email are required.' }, { status: 400 });
      }

      const now = new Date().toISOString();
      // Retry the INSERT on the (astronomically rare) signup_code UNIQUE
      // collision. An email collision (same UNIQUE code 23505) is detected by
      // re-reading the row for that email instead.
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateFoundingCode();
        const { data: inserted, error: insErr } = await supabase
          .from('montree_founding_waitlist')
          .insert({
            school_name: schoolName,
            contact_name: contactName,
            email,
            country,
            status: 'admitted',
            admitted_at: now,
            signup_code: candidate,
            code_generated_at: now,
            source: 'super_admin_manual',
          } as never)
          .select('id, signup_code')
          .maybeSingle();

        if (!insErr && inserted) {
          return NextResponse.json({ success: true, id: inserted.id, signup_code: inserted.signup_code });
        }
        if (insErr?.code === '23505') {
          // Which UNIQUE tripped? If a row already exists for this email,
          // surface it (with its code if admitted+coded). Otherwise it was a
          // signup_code collision — loop and mint a fresh candidate.
          const { data: existing } = await supabase
            .from('montree_founding_waitlist')
            .select('id, status, signup_code, redeemed_at')
            .eq('email', email)
            .maybeSingle();
          if (existing) {
            if (existing.status === 'admitted' && existing.signup_code) {
              return NextResponse.json({
                success: true,
                id: existing.id,
                signup_code: existing.signup_code,
                already_existed: true,
                redeemed_at: existing.redeemed_at ?? null,
              });
            }
            return NextResponse.json(
              { error: `That email already has a ${existing.status} application. Admit it from the list below instead.` },
              { status: 409 }
            );
          }
          continue; // signup_code collision — retry with a new code
        }
        if (insErr) throw insErr;
      }
      return NextResponse.json({ error: 'Could not mint a code. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[super-admin/founding PATCH] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
