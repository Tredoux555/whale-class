// /api/montree/invite-principal/route.ts
// A teacher invites their principal to view their classroom for free.
// Creates a montree_school_admins row tied to the same school_id, generates
// a 6-char login code, and emails the principal a warm soft-pitch from
// hello@montree.xyz (or whatever RESEND_FROM_EMAIL is configured to).
//
// The principal logs in with their code at /montree/login-select, lands on
// the Today cockpit, and can browse the teacher's classroom for free. They
// hit gates if they try to add their own classrooms or invite their own
// teachers — that's where the upgrade prompt lives.
//
// Auth: must be a valid teacher session (not a parent / not a principal).
// One principal per email per school is enforced — re-inviting the same
// email regenerates the code and resends the email rather than creating a
// duplicate row.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { legacySha256 } from '@/lib/montree/password';
import { generateSecureCode } from '@/lib/montree/secure-code';
// sendPrincipalInviteEmail import removed: email send is now skipped — see
// the comment near the JSON response below for the rationale.

export const maxDuration = 60; // Email send + DB writes; well under any timeout.

function generateLoginCode(): string {
  // Crypto-safe; avoids I, O, 0, 1 to keep codes unambiguous when shared verbally.
  return generateSecureCode();
}

interface InviteBody {
  name?: string;
  email?: string;
  note?: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'teacher') {
      return NextResponse.json(
        { error: 'Only teachers can invite their principal.' },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as InviteBody;
    const principalName = (body.name || '').trim();
    const principalEmail = (body.email || '').trim().toLowerCase();
    const note = body.note?.trim() || '';

    if (!principalName || principalName.length < 2) {
      return NextResponse.json(
        { error: "Please give your principal's name." },
        { status: 400 }
      );
    }
    if (!principalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(principalEmail)) {
      return NextResponse.json(
        { error: 'Please give a valid email address.' },
        { status: 400 }
      );
    }
    if (note.length > 600) {
      return NextResponse.json(
        { error: 'Note is too long (max 600 characters).' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verify the teacher's school exists. We used to also fetch teacher.name +
    // school.name to embed in the welcome email body — that step is gone now,
    // so we keep just the existence check (cheap school SELECT) for safety.
    const { data: school } = await supabase
      .from('montree_schools')
      .select('id')
      .eq('id', auth.schoolId)
      .maybeSingle();
    if (!school) {
      return NextResponse.json(
        { error: 'Could not load your school.' },
        { status: 500 }
      );
    }

    // Check if a principal already exists for this school+email.
    const { data: existing, error: existingErr } = await supabase
      .from('montree_school_admins')
      .select('id, name, email')
      .eq('school_id', auth.schoolId)
      .eq('email', principalEmail)
      .eq('role', 'principal')
      .maybeSingle();
    if (existingErr) {
      console.error('[invite-principal] existing-row lookup error:', existingErr);
      return NextResponse.json(
        { error: 'Could not check for an existing invitation.' },
        { status: 500 }
      );
    }

    let loginCode: string;
    let principalId: string;

    if (existing) {
      // Re-invite — reuse the same row, regenerate code so the previous email
      // becomes invalid (security hygiene). Update name in case the teacher
      // typed it differently this time.
      // NOTE: montree_school_admins has no login_code column — principals
      // authenticate via password_hash lookup (legacy SHA-256 of the code).
      // We only persist the hash; the plain code is returned in the JSON
      // response and emailed to the principal.
      loginCode = generateLoginCode();
      const codeHash = legacySha256(loginCode);
      const { error: updateErr } = await supabase
        .from('montree_school_admins')
        .update({
          name: principalName,
          password_hash: codeHash,
        })
        .eq('id', existing.id);
      if (updateErr) {
        console.error('[invite-principal] update error:', updateErr);
        return NextResponse.json(
          { error: 'Could not update the existing invitation.' },
          { status: 500 }
        );
      }
      principalId = existing.id;
    } else {
      // New invite. The only UNIQUE on montree_school_admins is (school_id, email),
      // and the existing-row check above already prevents that collision under
      // normal flow. We retry on 23505 anyway in case of a concurrent insert
      // for the same email — the existing-row branch will handle it on the next
      // attempt's caller (rare; we just bail with a clean error here).
      loginCode = generateLoginCode();
      const codeHash = legacySha256(loginCode);
      const { data: inserted, error: insertErr } = await supabase
        .from('montree_school_admins')
        .insert({
          school_id: auth.schoolId,
          email: principalEmail,
          name: principalName,
          password_hash: codeHash,
          role: 'principal',
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        console.error('[invite-principal] insert error:', insertErr);
        // 23505 here means a race on (school_id, email). Surface a friendly message.
        if (insertErr && insertErr.code === '23505') {
          return NextResponse.json(
            { error: 'A principal with that email already exists for your school. Refresh and try again.' },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: 'Could not create the invitation.' },
          { status: 500 }
        );
      }
      principalId = inserted.id;
    }

    // Email send intentionally skipped. The original design tried to send a
    // welcome email via Resend, but Railway's RESEND_API_KEY env var is the
    // recurring blocker (unset / placeholder). The route already returns the
    // plain code in the JSON response and the modal already shows it with a
    // "Copy code" button, so the teacher can share the code by SMS / WhatsApp /
    // verbal hand-off. That's the canonical flow now — when Resend domain
    // verification + API key are sorted on Railway, re-enable the send call.
    //
    // Response keeps an `email` field for backward-compat with any consumer
    // that destructures it; we just always report skipped.

    return NextResponse.json({
      success: true,
      principal: {
        id: principalId!,
        name: principalName,
        email: principalEmail,
        login_code: loginCode!,
      },
      email: { sent: false, skipped: true },
      reused_existing: !!existing,
    });
  } catch (err) {
    console.error('[invite-principal] handler error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
