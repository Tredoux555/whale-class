// /api/montree/super-admin/all-logins/route.ts
//
// Session 133 — single source of truth for "show me every login code in
// the system, neatly." Super-admin only.
//
// Returns every active row that has a login_code, grouped by role:
//   - principals (montree_school_admins with login_code)
//   - teachers (montree_teachers where is_agent=false, with login_code)
//   - agents (montree_teachers where is_agent=true, with login_code)
//
// Each row includes the school it belongs to so the UI can group by school
// AND by role. Inactive rows (is_active=false / agent_suspended_at IS NOT
// NULL) are EXCLUDED unless ?include_inactive=1.
//
// IMPORTANT: this is the only place plain login codes are surfaced in bulk.
// Cross-pollination doesn't apply (super-admin sees the whole platform by
// design) but auth gate is mandatory — this is the highest-value data
// exfiltration target in the codebase.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface SchoolRow {
  id: string;
  name: string;
}

interface PrincipalLogin {
  kind: 'principal';
  id: string;
  name: string | null;
  email: string | null;
  login_code: string;
  school_id: string;
  school_name: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface TeacherLogin {
  kind: 'teacher';
  id: string;
  name: string | null;
  email: string | null;
  login_code: string;
  school_id: string | null;
  school_name: string | null;
  classroom_id: string | null;
  classroom_name: string | null;
  role: string | null; // 'lead_teacher' | 'teacher' | 'assistant'
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface AgentLogin {
  kind: 'agent';
  id: string;
  name: string | null;
  email: string | null;
  login_code: string;
  agent_default_share_pct: number | null;
  agent_login_set_at: string | null;
  agent_login_last_used_at: string | null;
  agent_suspended_at: string | null;
  created_at: string;
}

interface ParentInviteLogin {
  kind: 'parent_invite';
  id: string;
  invite_code: string;
  parent_email: string | null;
  child_id: string;
  child_name: string | null;
  classroom_id: string | null;
  classroom_name: string | null;
  school_id: string | null;
  school_name: string | null;
  is_active: boolean;
  is_reusable: boolean;
  use_count: number;
  max_uses: number | null;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const includeInactive = url.searchParams.get('include_inactive') === '1';

  const supabase = getSupabase();

  // Row shapes TS needs help inferring through Promise.all + IIFE.
  type AdminRow = {
    id: string;
    name: string | null;
    email: string | null;
    login_code: string | null;
    school_id: string;
    role: string;
    is_active: boolean | null;
    last_login: string | null;
    created_at: string;
  };
  type TeacherRow = {
    id: string;
    name: string | null;
    email: string | null;
    login_code: string | null;
    school_id: string | null;
    classroom_id: string | null;
    role: string | null;
    is_active: boolean | null;
    is_agent: boolean | null;
    agent_default_share_pct: number | null;
    agent_login_set_at: string | null;
    agent_login_last_used_at: string | null;
    agent_suspended_at: string | null;
    last_login_at: string | null;
    created_at: string;
  };
  type ParentInviteRow = {
    id: string;
    invite_code: string | null;
    parent_email: string | null;
    child_id: string;
    is_active: boolean | null;
    is_reusable: boolean | null;
    use_count: number | null;
    max_uses: number | null;
    expires_at: string | null;
    last_used_at: string | null;
    created_at: string;
  };

  // Fan-out the four reads in parallel. Cast on destructure — Promise.all
  // can't always infer the per-IIFE return types cleanly when each is
  // built off the Supabase client's polymorphic return shape.
  const [adminsRes, teachersRes, schoolsRes, invitesRes] = (await Promise.all([
    (async (): Promise<AdminRow[]> => {
      let q = supabase
        .from('montree_school_admins')
        .select(
          'id, name, email, login_code, school_id, role, is_active, last_login, created_at'
        )
        .eq('role', 'principal')
        .not('login_code', 'is', null);
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw new Error(`school_admins: ${error.message}`);
      return ((data ?? []) as unknown) as AdminRow[];
    })(),
    (async (): Promise<TeacherRow[]> => {
      // Teachers + agents are both in montree_teachers; is_agent splits them.
      let q = supabase
        .from('montree_teachers')
        .select(
          'id, name, email, login_code, school_id, classroom_id, role, is_active, is_agent, agent_default_share_pct, agent_login_set_at, agent_login_last_used_at, agent_suspended_at, last_login_at, created_at'
        )
        .not('login_code', 'is', null);
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw new Error(`teachers: ${error.message}`);
      return ((data ?? []) as unknown) as TeacherRow[];
    })(),
    (async (): Promise<SchoolRow[]> => {
      const { data, error } = await supabase
        .from('montree_schools')
        .select('id, name');
      if (error) throw new Error(`schools: ${error.message}`);
      return ((data ?? []) as unknown) as SchoolRow[];
    })(),
    (async (): Promise<ParentInviteRow[]> => {
      // Parent invites — surface every invite_code so super-admin can resend
      // / re-share / debug stuck parent logins. Filter by is_active by default.
      let q = supabase
        .from('montree_parent_invites')
        .select(
          'id, invite_code, parent_email, child_id, is_active, is_reusable, use_count, max_uses, expires_at, last_used_at, created_at'
        )
        .not('invite_code', 'is', null);
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw new Error(`parent_invites: ${error.message}`);
      return ((data ?? []) as unknown) as ParentInviteRow[];
    })(),
  ])) as [AdminRow[], TeacherRow[], SchoolRow[], ParentInviteRow[]];

  const schoolMap = new Map<string, string>();
  for (const s of schoolsRes) schoolMap.set(s.id, s.name);

  // Look up classroom names for the teachers we surface.
  const classroomIds = Array.from(
    new Set(
      teachersRes
        .map((t) => t.classroom_id)
        .filter((id): id is string => typeof id === 'string')
    )
  );
  const classroomMap = new Map<string, string>();
  if (classroomIds.length > 0) {
    const { data: classrooms } = await supabase
      .from('montree_classrooms')
      .select('id, name')
      .in('id', classroomIds);
    const classroomRows = ((classrooms ?? []) as unknown) as Array<{
      id: string;
      name: string;
    }>;
    for (const c of classroomRows) classroomMap.set(c.id, c.name);
  }

  const principals: PrincipalLogin[] = adminsRes
    .filter((p) => typeof p.login_code === 'string' && p.login_code.length > 0)
    .map((p) => ({
      kind: 'principal',
      id: p.id,
      name: p.name ?? null,
      email: p.email ?? null,
      login_code: p.login_code as string,
      school_id: p.school_id,
      school_name: schoolMap.get(p.school_id) ?? null,
      is_active: !!p.is_active,
      last_login: p.last_login ?? null,
      created_at: p.created_at,
    }));

  const teachers: TeacherLogin[] = [];
  const agents: AgentLogin[] = [];
  for (const t of teachersRes) {
    if (typeof t.login_code !== 'string' || t.login_code.length === 0) continue;
    if (t.is_agent) {
      agents.push({
        kind: 'agent',
        id: t.id,
        name: t.name ?? null,
        email: t.email ?? null,
        login_code: t.login_code,
        agent_default_share_pct: t.agent_default_share_pct ?? null,
        agent_login_set_at: t.agent_login_set_at ?? null,
        agent_login_last_used_at: t.agent_login_last_used_at ?? null,
        agent_suspended_at: t.agent_suspended_at ?? null,
        created_at: t.created_at,
      });
    } else {
      teachers.push({
        kind: 'teacher',
        id: t.id,
        name: t.name ?? null,
        email: t.email ?? null,
        login_code: t.login_code,
        school_id: t.school_id ?? null,
        school_name: t.school_id ? schoolMap.get(t.school_id) ?? null : null,
        classroom_id: t.classroom_id ?? null,
        classroom_name: t.classroom_id
          ? classroomMap.get(t.classroom_id) ?? null
          : null,
        role: t.role ?? null,
        is_active: !!t.is_active,
        last_login_at: t.last_login_at ?? null,
        created_at: t.created_at,
      });
    }
  }

  // Look up child names + their classroom/school for the parent invites.
  const inviteChildIds = Array.from(
    new Set(
      invitesRes
        .map((i) => i.child_id)
        .filter((id): id is string => typeof id === 'string')
    )
  );
  const childInfoMap = new Map<
    string,
    { name: string; classroom_id: string | null }
  >();
  if (inviteChildIds.length > 0) {
    const { data: children } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id')
      .in('id', inviteChildIds);
    const childRows = ((children ?? []) as unknown) as Array<{
      id: string;
      name: string;
      classroom_id: string | null;
    }>;
    for (const c of childRows) {
      childInfoMap.set(c.id, {
        name: c.name,
        classroom_id: c.classroom_id ?? null,
      });
    }
  }

  // We also need classroom→school for invite rows whose classroom wasn't
  // already loaded for the teachers.
  const inviteClassroomIds = Array.from(
    new Set(
      Array.from(childInfoMap.values())
        .map((c) => c.classroom_id)
        .filter((id): id is string => typeof id === 'string')
        .filter((id) => !classroomMap.has(id))
    )
  );
  const classroomSchoolMap = new Map<string, string | null>();
  if (inviteClassroomIds.length > 0) {
    const { data: extraClassrooms } = await supabase
      .from('montree_classrooms')
      .select('id, name, school_id')
      .in('id', inviteClassroomIds);
    const extraRows = ((extraClassrooms ?? []) as unknown) as Array<{
      id: string;
      name: string;
      school_id: string | null;
    }>;
    for (const c of extraRows) {
      classroomMap.set(c.id, c.name);
      classroomSchoolMap.set(c.id, c.school_id ?? null);
    }
  }
  // For classrooms already in classroomMap (loaded via teachers), we need
  // their school_id too. Look those up in one shot if missing.
  const teacherClassroomIds = Array.from(classroomMap.keys()).filter(
    (id) => !classroomSchoolMap.has(id)
  );
  if (teacherClassroomIds.length > 0) {
    const { data: teacherClassrooms } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .in('id', teacherClassroomIds);
    const teacherClassroomRows = ((teacherClassrooms ?? []) as unknown) as Array<{
      id: string;
      school_id: string | null;
    }>;
    for (const c of teacherClassroomRows) {
      classroomSchoolMap.set(c.id, c.school_id ?? null);
    }
  }

  const parentInvites: ParentInviteLogin[] = invitesRes
    .filter(
      (i): i is ParentInviteRow & { invite_code: string } =>
        typeof i.invite_code === 'string' && i.invite_code.length > 0
    )
    .map((i): ParentInviteLogin => {
      const child = childInfoMap.get(i.child_id);
      const classroomId = child?.classroom_id ?? null;
      const classroomName = classroomId
        ? classroomMap.get(classroomId) ?? null
        : null;
      const schoolId = classroomId
        ? classroomSchoolMap.get(classroomId) ?? null
        : null;
      return {
        kind: 'parent_invite',
        id: i.id,
        invite_code: i.invite_code,
        parent_email: i.parent_email ?? null,
        child_id: i.child_id,
        child_name: child?.name ?? null,
        classroom_id: classroomId,
        classroom_name: classroomName,
        school_id: schoolId,
        school_name: schoolId ? schoolMap.get(schoolId) ?? null : null,
        is_active: !!i.is_active,
        is_reusable: !!i.is_reusable,
        use_count: typeof i.use_count === 'number' ? i.use_count : 0,
        max_uses: typeof i.max_uses === 'number' ? i.max_uses : null,
        expires_at: i.expires_at ?? null,
        last_used_at: i.last_used_at ?? null,
        created_at: i.created_at,
      };
    });

  // Detect hash/code desync for principals so the UI can surface it.
  // Audit fix: only flag rows where password_hash IS legacy-shape (64-char
  // hex) and mismatches. Bcrypt rows ($2-prefixed) and any other shape
  // are excluded — flagging them would tell the operator to "fix" a
  // password that's actually valid via bcrypt verify.
  let desyncedPrincipalIds: string[] = [];
  try {
    const { data: hashRows } = await supabase
      .from('montree_school_admins')
      .select('id, login_code, password_hash')
      .in(
        'id',
        principals.map((p) => p.id)
      );
    const hashRowsTyped = ((hashRows ?? []) as unknown) as Array<{
      id: string;
      login_code: string | null;
      password_hash: string | null;
    }>;
    const crypto = await import('crypto');
    const LEGACY_SHA256_RE = /^[a-f0-9]{64}$/i;
    desyncedPrincipalIds = hashRowsTyped
      .filter((r) => {
        if (!r.login_code || !r.password_hash) return false;
        if (r.password_hash.startsWith('$2')) return false;
        // Only flag if the stored hash LOOKS like legacy SHA256 — anything
        // else (empty string, malformed) is its own problem, not a "desync".
        if (!LEGACY_SHA256_RE.test(r.password_hash)) return false;
        const sha = crypto.createHash('sha256').update(r.login_code).digest('hex');
        return sha !== r.password_hash;
      })
      .map((r) => r.id);
  } catch (e) {
    console.warn('[all-logins] desync check failed:', e);
  }

  return NextResponse.json(
    {
      principals,
      teachers,
      agents,
      parent_invites: parentInvites,
      desynced_principal_ids: desyncedPrincipalIds,
      counts: {
        principals: principals.length,
        teachers: teachers.length,
        agents: agents.length,
        parent_invites: parentInvites.length,
        total:
          principals.length +
          teachers.length +
          agents.length +
          parentInvites.length,
      },
      generated_at: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        // This payload contains plaintext login codes. Never let a proxy
        // cache it.
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
