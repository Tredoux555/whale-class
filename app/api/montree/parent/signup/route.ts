// app/api/montree/parent/signup/route.ts
// Session 116: Parent signup with invite code
// Session 118: Added welcome email
// Session 125: Fixed to hash passwords with bcrypt

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { sendWelcomeEmail } from '@/lib/montree/email';
import { hashPassword } from '@/lib/montree/password';
import { validatePassword } from '@/lib/password-policy';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(req.headers);
    const userAgent = getUserAgent(req.headers);

    // Rate limiting (3 attempts per IP per 15 min for registration)
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/parent/signup', 3, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const { invite_code, name, email, password } = await req.json();

    if (!invite_code || !name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Password does not meet requirements: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }
    
    // 1. Find and validate invite code
    //    🚨 Session 113 V2 Parent audit F-6.2 — also select use_count +
    //    max_uses + is_reusable so the signup path can respect the same
    //    reusability semantics as access-code login.
    const { data: invite, error: inviteError } = await supabase
      .from('montree_parent_invites')
      .select(`
        id, child_id, used_by, expires_at, is_active,
        is_reusable, use_count, max_uses,
        montree_children!inner ( id, name, classroom_id,
          montree_classrooms!inner ( id, name, school_id,
            montree_schools!inner ( id, name )
          )
        )
      `)
      .eq('invite_code', invite_code.toUpperCase())
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
    }

    // 🚨 Session 113 V2 Parent audit F-6.2 — invite-reuse semantics. Match
    // the access-code login behaviour so a "family invite" (is_reusable=true,
    // max_uses>1) gives both parents full accounts, not just one.
    const isReusable = !!(invite as { is_reusable?: boolean }).is_reusable;
    const useCount = Number((invite as { use_count?: number }).use_count ?? 0);
    const maxUses = (invite as { max_uses?: number | null }).max_uses ?? null;

    if (!isReusable && invite.used_by) {
      // Single-use invite already consumed.
      return NextResponse.json({ error: 'Invite code already used' }, { status: 400 });
    }
    if (isReusable && maxUses !== null && useCount >= maxUses) {
      return NextResponse.json(
        { error: 'Invite code has reached its maximum number of uses' },
        { status: 400 }
      );
    }

    if (!invite.is_active) {
      return NextResponse.json({ error: 'Invite code is no longer active' }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 400 });
    }

    const child = invite.montree_children as Record<string, unknown>;
    const classroom = child.montree_classrooms;
    const school = classroom.montree_schools;

    // 2. Check if parent email already exists for this school
    const { data: existingParent } = await supabase
      .from('montree_parents')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('school_id', school.id)
      .single();

    if (existingParent) {
      return NextResponse.json({ error: 'Email already registered. Please login instead.' }, { status: 400 });
    }

    // 3. Create parent account with hashed password
    const password_hash = await hashPassword(password);

    const { data: newParent, error: parentError } = await supabase
      .from('montree_parents')
      .insert({
        school_id: school.id,
        email: email.toLowerCase(),
        password_hash,
        name: name.trim()
      })
      .select('id, name, email')
      .single();

    if (parentError || !newParent) {
      console.error('Parent creation failed:', parentError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // 4. 🚨 Session 113 V2 Parent audit F-6.1 — link parent to child FIRST
    // (before marking the invite consumed). If the link insert fails, roll
    // back the parent account so the user can retry instead of being stuck
    // with a working email+password but an empty children list.
    const { error: linkError } = await supabase
      .from('montree_parent_children')
      .insert({
        parent_id: newParent.id,
        child_id: invite.child_id,
        relationship: 'parent'
      });

    if (linkError) {
      console.error('Parent-child link failed; rolling back parent account', linkError);
      // Roll back the parent insert so the email isn't permanently consumed.
      await supabase
        .from('montree_parents')
        .delete()
        .eq('id', newParent.id);
      return NextResponse.json(
        { error: 'Could not link your account to your child. Please try again.' },
        { status: 500 }
      );
    }

    // 5. Mark invite as used / increment use_count.
    //    🚨 Session 113 V2 Parent audit F-6.2 — respect is_reusable + max_uses.
    //    Non-reusable invites: mark used_by + used_at + is_active=false on
    //      first signup (existing behaviour).
    //    Reusable invites: increment use_count + set last_used_at. Only
    //      flip is_active=false when use_count would reach max_uses.
    const now = new Date().toISOString();
    if (isReusable) {
      const newUseCount = useCount + 1;
      const exhausted = maxUses !== null && newUseCount >= maxUses;
      await supabase
        .from('montree_parent_invites')
        .update({
          use_count: newUseCount,
          last_used_at: now,
          ...(exhausted ? { is_active: false } : {}),
        })
        .eq('id', invite.id);
    } else {
      await supabase
        .from('montree_parent_invites')
        .update({
          used_by: newParent.id,
          used_at: now,
          use_count: useCount + 1,
          last_used_at: now,
          is_active: false,
        })
        .eq('id', invite.id);
    }
    
    // 6. Send welcome email (non-blocking)
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/montree/parent/dashboard`;
    sendWelcomeEmail(newParent.email, newParent.name, child.name, dashboardUrl)
      .catch(err => console.error('Welcome email failed:', err));
    
    // 7. Return session data
    return NextResponse.json({
      success: true,
      session: {
        parent: {
          id: newParent.id,
          name: newParent.name,
          email: newParent.email
        },
        school: {
          id: school.id,
          name: school.name
        },
        children: [{
          id: child.id,
          name: child.name,
          classroom_name: classroom.name
        }],
        loginAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Parent signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
