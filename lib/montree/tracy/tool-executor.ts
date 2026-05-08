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
import { AI_MODEL } from '@/lib/ai/anthropic';
import { unpackTeacher } from './frameworks/unpack-teacher';
import { childFocus } from './frameworks/child-focus';

export interface TracyToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  result_summary?: string;
}

/**
 * Per-tool progress event emitted by framework tools (child_focus,
 * unpack_teacher) so the principal sees what Tracy is doing in real time.
 * The route serializes this onto the SSE channel as a `tool_progress` event;
 * the client formats it via `tracy.progress.<phase>` i18n keys with `vars`
 * interpolated.
 */
export interface TracyToolProgress {
  tool: string;
  phase: string;
  vars?: Record<string, string>;
}

export interface TracyToolDeps {
  supabase: SupabaseClient;
  anthropic: Anthropic | null;
  schoolId: string;
  request: NextRequest;
  /**
   * Locale of the principal's UI. Forwarded to framework tools so their
   * Sonnet compose steps respond in the right language. 'en' if omitted.
   */
  locale?: string;
  /**
   * Optional progress callback. The route wires this to an SSE emitter so
   * the client can render Guru-style live status under each tool chip.
   * Tools may call this 0+ times during execution. Errors thrown by the
   * callback are caught and logged — never propagated to the caller.
   */
  onProgress?: (evt: TracyToolProgress) => void;
}

export async function executeTracyTool(
  name: string,
  input: Record<string, unknown>,
  deps: TracyToolDeps
): Promise<TracyToolResult> {
  const { supabase, anthropic, schoolId, request, locale = 'en', onProgress } = deps;

  // Safe progress emitter — wraps the consumer's callback so a buggy listener
  // can't crash a tool mid-flight.
  const emitProgress = (tool: string, phase: string, vars?: Record<string, string>) => {
    if (!onProgress) return;
    try {
      onProgress({ tool, phase, vars });
    } catch (e) {
      console.warn('[tracy/tool-executor] onProgress threw:', e);
    }
  };
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
  // (internalPost removed — no current Tracy tool POSTs to internal endpoints.
  // Re-add when an action tool needs to mutate via an internal route.)

  try {
    switch (name) {
      // ── FRAMEWORK TOOL: child_focus ────────────────────────────────
      case 'child_focus': {
        const question = String(input.question || '').trim();
        if (!question) {
          return { success: false, error: 'question is required' };
        }
        const result = await childFocus(
          { question, schoolId, locale },
          supabase,
          anthropic,
          AI_MODEL,
          (evt) => emitProgress('child_focus', evt.phase, evt.vars)
        );
        if (!result.ok) {
          return {
            success: false,
            error: result.error || 'child_focus failed',
          };
        }
        const d = result.data!;
        let summary = '';
        if (d.resolution === 'found' && d.child) {
          summary = `${d.child.name}: ${d.answer?.sparse ? 'sparse data' : 'answer composed'}`;
        } else if (d.resolution === 'not_found') {
          summary = `no child matching "${d.not_found_query || ''}"`;
        } else if (d.resolution === 'ambiguous') {
          summary = `${d.candidates?.length || 0} possible matches`;
        }
        return {
          success: true,
          data: d,
          result_summary: summary,
        };
      }

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

      // (answer_about_child removed — subsumed by child_focus, which handles
      // resolution + context + composition in one call. The
      // /api/montree/admin/parent-question route still exists and is used by
      // the deep-link child page; Tracy just doesn't call it via tool anymore.)

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

      // ── ACTION TOOL: draft_teacher_welcome_messages ──────────────
      case 'draft_teacher_welcome_messages': {
        const rawScope = String(input.scope || 'all').trim();
        const scope: 'all' | 'classroom' | 'teacher' =
          rawScope === 'classroom' || rawScope === 'teacher' ? rawScope : 'all';
        const classroomId = String(input.classroom_id || '').trim();
        const teacherId = String(input.teacher_id || '').trim();

        // Resolve school + principal name for the message template.
        const [schoolRes, principalRes] = await Promise.all([
          supabase
            .from('montree_schools')
            .select('name')
            .eq('id', schoolId)
            .maybeSingle(),
          supabase
            .from('montree_school_admins')
            .select('name')
            .eq('school_id', schoolId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);
        const schoolName = schoolRes.data?.name || 'our school';
        const principalFirstName =
          (principalRes.data?.name || '').split(' ')[0] || '';
        const signOff = principalFirstName ? `— ${principalFirstName}` : '';

        // Pull the teacher list, scoped tightly to this school.
        let teachersQuery = supabase
          .from('montree_teachers')
          .select('id, name, email, login_code, classroom_id')
          .eq('school_id', schoolId)
          .eq('is_active', true);
        if (scope === 'classroom' && classroomId) {
          teachersQuery = teachersQuery.eq('classroom_id', classroomId);
        } else if (scope === 'teacher' && teacherId) {
          teachersQuery = teachersQuery.eq('id', teacherId);
        }
        const { data: teachers, error: teachersErr } = await teachersQuery;
        if (teachersErr) {
          return { success: false, error: teachersErr.message };
        }
        if (!teachers || teachers.length === 0) {
          return {
            success: true,
            data: {
              drafts: [],
              count: 0,
              note: 'No active teachers found for the selected scope.',
            },
            result_summary: 'no teachers',
          };
        }

        // Look up classroom names so we can mention "(Bunny Class)" in the body.
        const classroomIds = Array.from(
          new Set(
            teachers
              .map((t) => t.classroom_id)
              .filter((id): id is string => Boolean(id))
          )
        );
        const classroomNameById = new Map<string, string>();
        if (classroomIds.length) {
          const { data: classrooms } = await supabase
            .from('montree_classrooms')
            .select('id, name')
            .in('id', classroomIds);
          for (const c of classrooms || []) {
            classroomNameById.set(c.id, c.name);
          }
        }

        const drafts = teachers
          .filter((t) => t.login_code)
          .map((t) => {
            const firstName = (t.name || '').split(' ')[0] || 'there';
            const classroomName = t.classroom_id
              ? classroomNameById.get(t.classroom_id) || null
              : null;
            const classroomFragment = classroomName
              ? ` (${classroomName})`
              : '';
            // Keep this template in lockstep with sendEmailToTeacher() in
            // app/montree/admin/classrooms/[classroomId]/page.tsx. Both paths
            // produce the same welcome — feels like one product whether the
            // principal sends from the classroom row or asks Tracy to draft.
            const messageText =
              `Hi ${firstName},\n\n` +
              `Welcome to ${schoolName}'s classroom system. Your login code for Montree is ${t.login_code}.\n\n` +
              `Go to montree.xyz, type the code, and you'll land on your classroom${classroomFragment}. Tip: once you're in, save the page to your home screen so it works like an app — on iPhone tap the share icon then "Add to Home Screen", on Android tap the menu then "Install app" or "Add to Home Screen".\n\n` +
              `Once you're in, ask Guru — the AI assistant inside the app — anything you need. Adding students, your first photos, how Montree works. Guru's there for you.\n\n` +
              `Let me know if you get stuck.\n\n` +
              `${signOff}`.trim();
            return {
              teacher_id: t.id,
              teacher_name: t.name,
              teacher_email: t.email,
              classroom_name: classroomName,
              login_code: t.login_code,
              message_text: messageText,
            };
          });

        const skippedNoCode = teachers.length - drafts.length;
        return {
          success: true,
          data: {
            drafts,
            count: drafts.length,
            school_name: schoolName,
            scope,
            ...(skippedNoCode > 0
              ? {
                  warning: `${skippedNoCode} teacher(s) had no login_code — skipped.`,
                }
              : {}),
          },
          result_summary: `drafted ${drafts.length}${
            skippedNoCode ? ` (${skippedNoCode} skipped, no code)` : ''
          }`,
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
