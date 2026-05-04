// lib/montree/tracy/tool-executor.ts
//
// Tracy's tool dispatch. Called from the principal-agent SSE route inside the
// Sonnet tool-use loop. Returns { success, data?, error?, result_summary? }.
//
// SCHOOL-SCOPING CONTRACT (load-bearing — see Session 84 architectural rules):
//   - For tools that wrap internal API endpoints, we forward the principal's
//     cookie. Each inner endpoint MUST re-verify school_id via
//     verifySchoolRequest + verifyChildBelongsToSchool. The trust boundary is
//     the inner endpoint, not this dispatcher.
//   - For tools that do direct Supabase queries (list_classrooms,
//     list_teachers, unpack_teacher), every query MUST filter by the
//     schoolId passed to this dispatcher. No exceptions.
//
// COST DISCIPLINE:
//   unpack_teacher is the only tool that calls Haiku (for note quality
//   scoring). Cap the cost contribution per call at ~$0.005. Other tools
//   are pure Supabase reads or wraps of existing internal endpoints.

import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Anthropic from '@anthropic-ai/sdk';
import { unpackTeacher } from './frameworks/unpack-teacher';

export interface TracyToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  result_summary?: string;
}

export interface TracyToolDeps {
  supabase: SupabaseClient;
  anthropic: Anthropic | null;
  schoolId: string;
  request: NextRequest;
}

export async function executeTracyTool(
  name: string,
  input: Record<string, unknown>,
  deps: TracyToolDeps
): Promise<TracyToolResult> {
  const { supabase, anthropic, schoolId, request } = deps;
  const cookieHeader = request.headers.get('cookie') || '';
  const origin = request.nextUrl.origin;

  const internalGet = async (path: string) => {
    const res = await fetch(`${origin}${path}`, {
      headers: { cookie: cookieHeader },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false as const, status: res.status, body };
    }
    const data = await res.json();
    return { ok: true as const, status: res.status, data };
  };
  const internalPost = async (path: string, body: unknown) => {
    const res = await fetch(`${origin}${path}`, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false as const, status: res.status, body: text };
    }
    const data = await res.json();
    return { ok: true as const, status: res.status, data };
  };

  try {
    switch (name) {
      // ── FRAMEWORK TOOL: unpack_teacher ─────────────────────────────
      case 'unpack_teacher': {
        const teacherId = String(input.teacher_id || '').trim();
        if (!teacherId) {
          return { success: false, error: 'teacher_id is required' };
        }
        const windowDays = Number(input.window_days);
        const result = await unpackTeacher(
          {
            teacherId,
            schoolId,
            windowDays: Number.isFinite(windowDays) ? windowDays : undefined,
          },
          supabase,
          anthropic
        );
        if (!result.ok) {
          return { success: false, error: result.error || 'unpack failed' };
        }
        const d = result.data!;
        return {
          success: true,
          data: d,
          result_summary: `${d.teacher.name}: ${d.verdict.label} (${d.coverage.coverage_pct}% coverage, ${d.activity.notes_written} notes)`,
        };
      }

      // ── PRIMITIVES (carried over from prior principal-agent) ───────
      case 'find_children_by_name': {
        const query = String(input.query || '').trim();
        if (!query) return { success: false, error: 'query is required' };
        const result = await internalGet(
          `/api/montree/admin/students/search?q=${encodeURIComponent(query)}`
        );
        if (!result.ok) {
          return {
            success: false,
            error: `students/search returned ${result.status}`,
          };
        }
        const data = result.data as { students?: unknown[] } | undefined;
        const students = Array.isArray(data?.students)
          ? data!.students!.slice(0, 10)
          : [];
        return {
          success: true,
          data: { matches: students },
          result_summary: `${students.length} match(es)`,
        };
      }

      case 'get_child_briefing': {
        const childId = String(input.child_id || '').trim();
        if (!childId) return { success: false, error: 'child_id is required' };
        const result = await internalGet(
          `/api/montree/admin/child-briefing/${encodeURIComponent(childId)}`
        );
        if (!result.ok) {
          return {
            success: false,
            error: `child-briefing returned ${result.status}`,
          };
        }
        const data = result.data as
          | { child?: { name?: string }; briefing?: string }
          | undefined;
        return {
          success: true,
          data: result.data,
          result_summary: `briefing for ${data?.child?.name || childId}`,
        };
      }

      case 'answer_about_child': {
        const childId = String(input.child_id || '').trim();
        const question = String(input.question || '').trim();
        if (!childId || !question) {
          return {
            success: false,
            error: 'child_id and question are required',
          };
        }
        const result = await internalPost(
          '/api/montree/admin/parent-question',
          { child_id: childId, question }
        );
        if (!result.ok) {
          return {
            success: false,
            error: `parent-question returned ${result.status}`,
          };
        }
        const data = result.data as
          | { answer?: string; child_name?: string }
          | undefined;
        return {
          success: true,
          data: result.data,
          result_summary: `answered for ${data?.child_name || childId}`,
        };
      }

      case 'list_classrooms_with_summary': {
        const { data: classrooms, error: cErr } = await supabase
          .from('montree_classrooms')
          .select('id, name')
          .eq('school_id', schoolId)
          .eq('is_active', true);
        if (cErr) return { success: false, error: cErr.message };
        if (!classrooms || classrooms.length === 0) {
          return {
            success: true,
            data: { classrooms: [] },
            result_summary: '0 classrooms',
          };
        }

        const classroomIds = classrooms.map((c) => c.id);
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        const { data: children } = await supabase
          .from('montree_children')
          .select('id, classroom_id')
          .in('classroom_id', classroomIds)
          .eq('is_active', true);
        const childrenByClassroom = new Map<string, string[]>();
        for (const c of children || []) {
          const list = childrenByClassroom.get(c.classroom_id) || [];
          list.push(c.id);
          childrenByClassroom.set(c.classroom_id, list);
        }

        const { data: teachers } = await supabase
          .from('montree_teachers')
          .select('classroom_id, name, created_at')
          .in('classroom_id', classroomIds)
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        const leadByClassroom = new Map<string, string>();
        for (const t of teachers || []) {
          if (!leadByClassroom.has(t.classroom_id)) {
            leadByClassroom.set(t.classroom_id, t.name);
          }
        }

        const allChildIds = (children || []).map((c) => c.id);
        const observedSet = new Set<string>();
        if (allChildIds.length) {
          const { data: photos } = await supabase
            .from('montree_media')
            .select('child_id')
            .in('child_id', allChildIds)
            .eq('teacher_confirmed', true)
            .gte('captured_at', sevenDaysAgo);
          for (const p of photos || []) observedSet.add(p.child_id);
        }

        const summary = classrooms.map((c) => {
          const ids = childrenByClassroom.get(c.id) || [];
          const observed = ids.filter((id) => observedSet.has(id)).length;
          return {
            id: c.id,
            name: c.name,
            child_count: ids.length,
            lead_teacher: leadByClassroom.get(c.id) || null,
            children_observed_this_week: observed,
          };
        });

        return {
          success: true,
          data: { classrooms: summary },
          result_summary: `${summary.length} classroom(s)`,
        };
      }

      case 'list_teachers_with_summary': {
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        const { data: teachers, error: tErr } = await supabase
          .from('montree_teachers')
          .select('id, name, classroom_id, last_login_at')
          .eq('school_id', schoolId)
          .eq('is_active', true);
        if (tErr) return { success: false, error: tErr.message };
        if (!teachers || teachers.length === 0) {
          return {
            success: true,
            data: { teachers: [] },
            result_summary: '0 teachers',
          };
        }

        const classroomIds = Array.from(
          new Set(teachers.map((t) => t.classroom_id).filter(Boolean))
        );
        const classroomNameById = new Map<string, string>();
        if (classroomIds.length) {
          const { data: classrooms } = await supabase
            .from('montree_classrooms')
            .select('id, name')
            .in('id', classroomIds);
          for (const c of classrooms || [])
            classroomNameById.set(c.id, c.name);
        }

        // 7-day photo confirmation count per teacher (best-effort — confirmed_by
        // may not exist on older deployments; fall back to 0 silently).
        const photoCountByTeacher = new Map<string, number>();
        try {
          const { data: photos } = await supabase
            .from('montree_media')
            .select('confirmed_by')
            .eq('school_id', schoolId)
            .eq('teacher_confirmed', true)
            .gte('captured_at', sevenDaysAgo);
          for (const p of photos || []) {
            const tid = (p as { confirmed_by?: string }).confirmed_by;
            if (tid) {
              photoCountByTeacher.set(
                tid,
                (photoCountByTeacher.get(tid) || 0) + 1
              );
            }
          }
        } catch {
          // Non-fatal — column may not exist on older deployments.
        }

        const summary = teachers.map((t) => ({
          id: t.id,
          name: t.name,
          classroom: t.classroom_id
            ? classroomNameById.get(t.classroom_id) || null
            : null,
          last_login_at: t.last_login_at,
          photos_confirmed_7d: photoCountByTeacher.get(t.id) || 0,
        }));

        return {
          success: true,
          data: { teachers: summary },
          result_summary: `${summary.length} teacher(s)`,
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Tool execution failed',
    };
  }
}
