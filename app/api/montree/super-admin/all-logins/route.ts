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

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const includeInactive = url.searchParams.get('include_inactive') === '1';

  const supabase = getSupabase();

  // Fan-out the three reads in parallel.
  const [adminsRes, teachersRes, schoolsRes] = await Promise.all([
    (async () => {
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
      return data || [];
    })(),
    (async () => {
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
      return data || [];
    })(),
    (async () => {
      const { data, error } = await supabase
        .from('montree_schools')
        .select('id, name');
      if (error) throw new Error(`schools: ${error.message}`);
      return (data || []) as SchoolRow[];
    })(),
  ]);

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
    for (const c of classrooms || []) classroomMap.set(c.id, c.name);
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

  // Detect hash/code desync for principals so the UI can surface it.
  // We check the password_hash too — if non-bcrypt and not matching
  // legacy SHA256 of the login_code, flag.
  let desyncedPrincipalIds: string[] = [];
  try {
    const { data: hashRows } = await supabase
      .from('montree_school_admins')
      .select('id, login_code, password_hash')
      .in(
        'id',
        principals.map((p) => p.id)
      );
    const crypto = await import('crypto');
    desyncedPrincipalIds = (hashRows || [])
      .filter((r) => {
        if (!r.login_code || !r.password_hash) return false;
        if (r.password_hash.startsWith('$2')) return false; // bcrypt — can't tell from here
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
      desynced_principal_ids: desyncedPrincipalIds,
      counts: {
        principals: principals.length,
        teachers: teachers.length,
        agents: agents.length,
        total: principals.length + teachers.length + agents.length,
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
