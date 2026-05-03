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
import { sendPrincipalInviteEmail } from '@/lib/montree/email';
import { legacySha256 } from '@/lib/montree/password';

export const maxDuration = 60; // Email send + DB writes; well under any timeout.

function generateLoginCode(): string {
  // Avoid I, O, 0, 1 to keep codes unambiguous when shared verbally.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

    // Resolve teacher + school for the email body.
    const [teacherRes, schoolRes] = await Promise.all([
      supabase
        .from('montree_teachers')
        .select('id, name')
        .eq('id', auth.userId)
        .maybeSingle(),
      supabase
        .from('montree_schools')
        .select('id, name')
        .eq('id', auth.schoolId)
        .maybeSingle(),
    ]);
    if (!teacherRes.data || !schoolRes.data) {
      return NextResponse.json(
        { error: 'Could not load your school.' },
        { status: 500 }
      );
    }
    const teacherName = teacherRes.data.name || 'Your teacher';
    const schoolName = schoolRes.data.name || 'their school';

    // Check if a principal already exists for this school+email.
    const { data: existing } = await supabase
      .from('montree_school_admins')
      .select('id, name, email, login_code')
      .eq('school_id', auth.schoolId)
      .eq('email', principalEmail)
      .eq('role', 'principal')
      .maybeSingle();

    let loginCode: string;
    let principalId: string;

    if (existing) {
      // Re-invite — reuse the same row, regenerate code so the previous email
      // becomes invalid (security hygiene). Update name in case the teacher
      // typed it differently this time.
      loginCode = generateLoginCode();
      const codeHash = legacySha256(loginCode);
      const { error: updateErr } = await supabase
        .from('montree_school_admins')
        .update({
          name: principalName,
          login_code: loginCode,
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
      // New invite — find a unique code.
      let attempts = 0;
      while (attempts < 5) {
        loginCode = generateLoginCode();
        const codeHash = legacySha256(loginCode);
        const { data: inserted, error: insertErr } = await supabase
          .from('montree_school_admins')
          .insert({
            school_id: auth.schoolId,
            email: principalEmail,
            name: principalName,
            password_hash: codeHash,
            login_code: loginCode,
            role: 'principal',
          })
          .select('id')
          .single();

        if (!insertErr && inserted) {
          principalId = inserted.id;
          break;
        }
        // Unique-violation on login_code — retry with a fresh code.
        if (insertErr && insertErr.code === '23505') {
          attempts++;
          continue;
        }
        // Anything else — bail.
        console.error('[invite-principal] insert error:', insertErr);
        return NextResponse.json(
          { error: 'Could not create the invitation.' },
          { status: 500 }
        );
      }
      if (attempts >= 5) {
        return NextResponse.json(
          { error: 'Could not generate a unique code. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Send the warm welcome email. Non-blocking from a UX perspective —
    // even if Resend fails, the principal record is created and the teacher
    // can copy the code manually.
    const origin =
      request.headers.get('origin') ||
      `https://${request.headers.get('host') || 'montree.xyz'}`;
    const loginUrl = `${origin}/montree/login-select?code=${encodeURIComponent(loginCode!)}`;

    let emailStatus: { sent: boolean; error?: string } = { sent: false };
    try {
      const result = await sendPrincipalInviteEmail(
        principalEmail,
        principalName,
        teacherName,
        schoolName,
        loginCode!,
        loginUrl,
        note,
      );
      emailStatus = { sent: result.success, error: result.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emailStatus = { sent: false, error: message };
      console.error('[invite-principal] email send threw:', err);
    }

    return NextResponse.json({
      success: true,
      principal: {
        id: principalId!,
        name: principalName,
        email: principalEmail,
        login_code: loginCode!,
      },
      email: emailStatus,
      reused_existing: !!existing,
    });
  } catch (err) {
    console.error('[invite-principal] handler error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
