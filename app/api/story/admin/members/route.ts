// app/api/story/admin/members/route.ts
//
// Owner-only member management for the multi-space sanctuary.
//
//   GET   → list every sanctuary member (username, space, created_at, last_login).
//   POST  → create a new member: a story_admin_users row with its own `space`.
//           That single row IS a new, fully-sealed sanctuary (migration 261 scopes
//           all personal data by `space`) + a future board member.
//
// Strictly gated to the OWNER (Tredoux). A member can never create or see others.
// Identity + authority come ONLY from the verified admin token, never the client.
//
// NOTE: this is DISTINCT from /api/story/admin/users, which lists story_users (the
// kid-facing viewers used for calls). Sanctuary members live in story_admin_users.
//
// The per-person Coach brief (about-<space>.md) is a committed file, so it can't be
// authored here — a brand-new space simply has no brief yet and the Coach runs its
// gentle first-session intake until Tredoux adds one.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, isOwner } from '@/lib/story-db';

export const dynamic = 'force-dynamic';

const USERNAME_RE = /^[A-Za-z0-9_]{2,30}$/;
const SPACE_RE = /^[a-z0-9_-]{2,30}$/;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!(await verifyAdminToken(auth))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isOwner(auth))) {
    return NextResponse.json({ error: 'Only the owner can manage members.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_admin_users')
    .select('username, space, created_at, last_login')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[admin/members] list error:', error.message);
    return NextResponse.json({ error: 'Could not load members' }, { status: 500 });
  }
  return NextResponse.json({ members: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!(await verifyAdminToken(auth))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isOwner(auth))) {
    return NextResponse.json({ error: 'Only the owner can create members.' }, { status: 403 });
  }

  let body: { username?: string; password?: string; space?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  // Default the space label to the lowercased username if not given.
  const rawSpace = typeof body.space === 'string' && body.space.trim()
    ? body.space.trim()
    : username;
  const space = rawSpace.toLowerCase();

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: 'Username must be 2–30 letters, numbers or underscores.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (!SPACE_RE.test(space)) {
    return NextResponse.json({ error: 'Space label must be 2–30 lowercase letters, numbers, _ or -.' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Space must be UNIQUE — two members sharing a space would see each other's
  // sanctuary. This is the isolation guarantee, enforced before insert.
  const { data: spaceClash, error: spaceErr } = await supabase
    .from('story_admin_users')
    .select('username')
    .eq('space', space)
    .limit(1);
  if (spaceErr) {
    console.error('[admin/members] space check error:', spaceErr.message);
    return NextResponse.json({ error: 'Could not create member' }, { status: 500 });
  }
  if (spaceClash && spaceClash.length > 0) {
    return NextResponse.json({ error: `Space "${space}" is already taken.` }, { status: 409 });
  }

  const bcrypt = await import('bcryptjs');
  const password_hash = await bcrypt.hash(password, 10);

  const { error: insErr } = await supabase
    .from('story_admin_users')
    .insert({ username, password_hash, space });
  if (insErr) {
    // 23505 = unique violation on username.
    if ((insErr as { code?: string }).code === '23505') {
      return NextResponse.json({ error: `Username "${username}" is already taken.` }, { status: 409 });
    }
    console.error('[admin/members] insert error:', insErr.message);
    return NextResponse.json({ error: 'Could not create member', detail: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username, space });
}
