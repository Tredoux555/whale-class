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
import { consultGuru } from './tools/consult_guru';
import { detectPattern } from './tools/detect_pattern';
import { preparePMeeting } from './tools/prepare_parent_meeting';
import {
  writeMemory,
  recallMemories,
  bumpMemoryReference,
  type PrincipalMemoryType,
  type RecallFilters,
} from './memory';
import {
  getTracyKnowledgeFull,
  type TracyKnowledgeTopic,
} from './knowledge/loader';
import { readEncryptedField } from '@/lib/montree/messaging-crypto';

// Session 136 — canonical topics for consult_tracy_knowledge dispatch.
// Kept here (vs imported as a Set from loader) so the validation is
// co-located with the dispatch case and reads at a glance.
const VALID_KNOWLEDGE_TOPICS = new Set<TracyKnowledgeTopic>([
  'index',
  'foundation',
  'frameworks',
  'nvc',
  'patterns',
  'cultural',
  'montessori_anxieties',
  'de_escalation',
]);

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
  /**
   * Principal's user id (= montree_school_admins.id). Required for memory
   * tools (remember_this, recall_memory) so memories are scoped per
   * principal. Multi-principal schools have separate memory streams.
   */
  principalId: string;
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
  /**
   * Session 135 — streaming callback for prepare_parent_meeting. The
   * dossier-builder Sonnet call produces ~3-4K tokens over ~15-25s. With
   * a synchronous call the principal sees nothing for the whole window;
   * with streaming the brief appears word-by-word at ~3-5s and the
   * dossier follows in the background. Section is 'brief' or 'dossier'
   * depending on which side of the <<<DOSSIER>>> delimiter the token
   * landed on. Delimiters themselves are stripped before emission.
   */
  onMeetingStream?: (chunk: { section: 'brief' | 'dossier'; delta: string }) => void;
}

export async function executeTracyTool(
  name: string,
  input: Record<string, unknown>,
  deps: TracyToolDeps
): Promise<TracyToolResult> {
  const {
    supabase,
    anthropic,
    schoolId,
    principalId,
    request,
    locale = 'en',
    onProgress,
    onMeetingStream,
  } = deps;

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

      // ── COMMUNICATION: list_recent_threads ───────────────────────
      case 'list_recent_threads': {
        const threadType = typeof input.thread_type === 'string' ? input.thread_type : null;
        const classroomId = typeof input.classroom_id === 'string' ? input.classroom_id : null;
        const unreadOnly = input.unread_only === true;

        let q = supabase
          .from('montree_message_threads')
          .select('id, thread_type, subject, classroom_id, child_id, last_message_at')
          .eq('school_id', schoolId)
          .is('archived_at', null)
          .order('last_message_at', { ascending: false })
          .limit(20);
        if (threadType) q = q.eq('thread_type', threadType);
        if (classroomId) q = q.eq('classroom_id', classroomId);

        const { data: threads, error: tErr } = await q;
        if (tErr) return { success: false, error: tErr.message };
        if (!threads || threads.length === 0) {
          return {
            success: true,
            data: { threads: [] },
            result_summary: '0 threads',
          };
        }

        const ids = threads.map((t) => t.id);
        // 🚨 Session 121 — pull encryption_version so we decrypt body
        // before Tracy (Opus) sees it. Tracy must never see ciphertext.
        const { data: lastMsgs } = await supabase
          .from('montree_thread_messages')
          .select('thread_id, body, encryption_version, sender_role, sender_name, sent_at')
          .in('thread_id', ids)
          .is('deleted_at', null)
          .order('sent_at', { ascending: false })
          .limit(200);

        const latestByThread = new Map<string, { body: string; sender_name: string; sender_role: string; sent_at: string }>();
        for (const m of (lastMsgs as Array<{
          thread_id: string;
          body: string;
          encryption_version: number | null;
          sender_role: string;
          sender_name: string;
          sent_at: string;
        }> | null) || []) {
          if (!latestByThread.has(m.thread_id)) {
            latestByThread.set(m.thread_id, {
              body: readEncryptedField(m.body, m.encryption_version),
              sender_name: m.sender_name,
              sender_role: m.sender_role,
              sent_at: m.sent_at,
            });
          }
        }

        const enriched = threads.map((t) => {
          const last = latestByThread.get(t.id);
          return {
            id: t.id,
            thread_type: t.thread_type,
            subject: t.subject,
            classroom_id: t.classroom_id,
            child_id: t.child_id,
            last_message_at: t.last_message_at,
            last_snippet: last ? last.body.slice(0, 200) : null,
            last_sender_name: last ? last.sender_name : null,
            last_sender_role: last ? last.sender_role : null,
          };
        });

        // (unread_only is reserved for the future — currently the tool returns
        // the full list and Sonnet decides what's relevant. Keeping the
        // parameter in the schema so we can wire unread tracking later
        // without a tool-definition change.)
        void unreadOnly;
        return {
          success: true,
          data: { threads: enriched },
          result_summary: `${enriched.length} thread(s)`,
        };
      }

      // ── COMMUNICATION: scan_parent_thread ────────────────────────
      case 'scan_parent_thread': {
        const threadId = String(input.thread_id || '').trim();
        if (!threadId) return { success: false, error: 'thread_id required' };

        // The scan endpoint is POST (writes nothing — just runs Opus).
        const scanRes = await fetch(`${origin}/api/montree/admin/tracy/scan-thread`, {
          method: 'POST',
          headers: { cookie: cookieHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: threadId, locale }),
        });
        if (!scanRes.ok) {
          const body = await scanRes.text().catch(() => '');
          return {
            success: false,
            error: `scan-thread returned ${scanRes.status}: ${body.slice(0, 200)}`,
          };
        }
        const scanData = await scanRes.json();
        return {
          success: true,
          data: scanData,
          result_summary: 'thread scanned',
        };
      }

      // ── COMMUNICATION: draft_parent_response ─────────────────────
      case 'draft_parent_response': {
        const threadId = String(input.thread_id || '').trim();
        if (!threadId) return { success: false, error: 'thread_id required' };
        const guidance = typeof input.guidance === 'string' ? input.guidance : undefined;

        const draftRes = await fetch(`${origin}/api/montree/admin/tracy/draft-response`, {
          method: 'POST',
          headers: { cookie: cookieHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: threadId, guidance, locale }),
        });
        if (!draftRes.ok) {
          const body = await draftRes.text().catch(() => '');
          return {
            success: false,
            error: `draft-response returned ${draftRes.status}: ${body.slice(0, 200)}`,
          };
        }
        const draftData = await draftRes.json();
        return {
          success: true,
          data: draftData,
          result_summary: 'draft ready',
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

      // ── MEMORY: remember_this ────────────────────────────────────
      // Tracy decides what's worth remembering across conversations.
      // Validation happens in writeMemory() — invalid input returns
      // ok=false rather than throwing.
      case 'remember_this': {
        if (!principalId) {
          return { success: false, error: 'principalId missing' };
        }
        const memoryType = String(input.memory_type || '').trim();
        const content = String(input.content || '').trim();
        const source =
          typeof input.source === 'string' ? input.source.trim() : undefined;
        const supersedesId =
          typeof input.supersedes_id === 'string'
            ? input.supersedes_id.trim() || null
            : null;
        const relatedChildId =
          typeof input.related_child_id === 'string'
            ? input.related_child_id.trim() || null
            : null;
        const relatedTeacherId =
          typeof input.related_teacher_id === 'string'
            ? input.related_teacher_id.trim() || null
            : null;
        const relatedParentId =
          typeof input.related_parent_id === 'string'
            ? input.related_parent_id.trim() || null
            : null;

        const result = await writeMemory(supabase, schoolId, principalId, {
          memory_type: memoryType as PrincipalMemoryType,
          content,
          source,
          supersedes_id: supersedesId,
          related_child_id: relatedChildId,
          related_teacher_id: relatedTeacherId,
          related_parent_id: relatedParentId,
        });
        if (!result.ok) {
          return { success: false, error: result.error };
        }
        return {
          success: true,
          data: { id: result.id, saved: true },
          result_summary: supersedesId
            ? `memory updated (${memoryType})`
            : `memory saved (${memoryType})`,
        };
      }

      // ── MEMORY: recall_memory ────────────────────────────────────
      // Deeper recall beyond the 30 in the system-prompt header.
      // Bumps reference_count on returned ids fire-and-forget.
      case 'recall_memory': {
        if (!principalId) {
          return { success: false, error: 'principalId missing' };
        }
        const filters: RecallFilters = {};
        if (typeof input.memory_type === 'string') {
          filters.memory_type = input.memory_type.trim() as PrincipalMemoryType;
        }
        if (typeof input.related_child_id === 'string') {
          filters.related_child_id = input.related_child_id.trim();
        }
        if (typeof input.related_teacher_id === 'string') {
          filters.related_teacher_id = input.related_teacher_id.trim();
        }
        if (typeof input.related_parent_id === 'string') {
          filters.related_parent_id = input.related_parent_id.trim();
        }
        if (typeof input.query === 'string') {
          filters.query = input.query.trim();
        }
        const memories = await recallMemories(supabase, principalId, filters, 20);
        // Fire-and-forget reference bump — Tracy doesn't wait. Pass
        // principalId so the bump uses the migration 212 RPC fast path
        // (1 round-trip) instead of the legacy N+1 fallback.
        if (memories.length > 0) {
          void bumpMemoryReference(
            supabase,
            memories.map((m) => m.id),
            principalId
          );
        }
        return {
          success: true,
          data: { memories, count: memories.length },
          result_summary: `${memories.length} memor${
            memories.length === 1 ? 'y' : 'ies'
          }`,
        };
      }

      // ── DOSSIER PREP: consult_guru ───────────────────────────────
      // Session 133 — Tracy → Guru bridge. School-scoped via deps.schoolId,
      // re-verified inside consultGuru() as belt-and-braces.
      case 'consult_guru': {
        const childId = String(input.child_id || '').trim();
        if (!childId) return { success: false, error: 'child_id is required' };
        const keywords = Array.isArray(input.topic_keywords)
          ? (input.topic_keywords as unknown[])
              .map((k) => String(k))
              .filter((k) => k.trim().length > 0)
          : undefined;
        const limitRaw = Number(input.limit);
        const result = await consultGuru(
          {
            childId,
            schoolId,
            topicKeywords: keywords,
            limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
          },
          supabase
        );
        if (!result.ok) {
          return { success: false, error: result.error || 'consult_guru failed' };
        }
        const d = result.data!;
        return {
          success: true,
          data: d,
          result_summary: `${d.analyses.length} of ${d.total_matches} Guru analyses${
            d.keyword_filtered ? ' (keyword-filtered)' : ''
          }`,
        };
      }

      // ── DOSSIER PREP: detect_pattern ─────────────────────────────
      // Strict-phrase matching per the Yo-yo lesson. No AI spend; pure DB scan.
      case 'detect_pattern': {
        const childId = String(input.child_id || '').trim();
        if (!childId) return { success: false, error: 'child_id is required' };
        const themePhrases = Array.isArray(input.theme_phrases)
          ? (input.theme_phrases as unknown[])
              .map((p) => String(p))
              .filter((p) => p.trim().length > 0)
          : [];
        if (themePhrases.length === 0) {
          return {
            success: false,
            error: 'theme_phrases is required (non-empty array)',
          };
        }
        const negativePhrases = Array.isArray(input.negative_phrases)
          ? (input.negative_phrases as unknown[])
              .map((p) => String(p))
              .filter((p) => p.trim().length > 0)
          : undefined;
        const matchMode =
          input.match === 'all' || input.match === 'any'
            ? (input.match as 'all' | 'any')
            : undefined;
        const daysBackRaw = Number(input.days_back);
        const maxQuotesRaw = Number(input.max_quotes);
        const result = await detectPattern(
          {
            childId,
            schoolId,
            themePhrases,
            match: matchMode,
            negativePhrases,
            daysBack: Number.isFinite(daysBackRaw) ? daysBackRaw : undefined,
            maxQuotes: Number.isFinite(maxQuotesRaw) ? maxQuotesRaw : undefined,
          },
          supabase
        );
        if (!result.ok) {
          return { success: false, error: result.error || 'detect_pattern failed' };
        }
        const d = result.data!;
        return {
          success: true,
          data: d,
          result_summary: `${d.event_count} event(s) across ${d.days_scanned} days, ${d.cluster_days.length} cluster day(s)`,
        };
      }

      // ── DOSSIER PREP: prepare_parent_meeting ──────────────────────
      // Session 133 Phase B. Single Sonnet call, ~$0.05 per dossier,
      // cached 24h. School-scoped + per-principal cache ownership.
      case 'prepare_parent_meeting': {
        const childId = String(input.child_id || '').trim();
        if (!childId) return { success: false, error: 'child_id is required' };
        const meetingPurpose = String(input.meeting_purpose || '').trim();
        if (!meetingPurpose) {
          return { success: false, error: 'meeting_purpose is required' };
        }
        const parentContext =
          typeof input.parent_context === 'string'
            ? input.parent_context.trim() || undefined
            : undefined;
        const outputFormat =
          input.output_format === 'html' ||
          input.output_format === 'json' ||
          input.output_format === 'markdown'
            ? (input.output_format as 'markdown' | 'html' | 'json')
            : 'markdown';

        if (!principalId) {
          return { success: false, error: 'principalId missing' };
        }

        const result = await preparePMeeting({
          childId,
          schoolId,
          principalId,
          meetingPurpose,
          parentContext,
          outputFormat,
          locale,
          anthropic,
          supabase,
          // Session 135 — wire the streaming callback so brief/dossier
          // tokens hit the SSE pipe as they land instead of waiting for
          // the full ~25s synchronous response.
          onStream: onMeetingStream,
        });
        if (!result.ok) {
          return { success: false, error: result.error || 'dossier failed' };
        }
        const d = result.data!;
        return {
          success: true,
          data: d,
          result_summary: `${d.child_name} dossier ${d.from_cache ? '(cached)' : `(fresh, ${d.cost_usd?.toFixed(3)} USD)`}`,
        };
      }

      // ── KNOWLEDGE: consult_tracy_knowledge ───────────────────────
      // Session 136 — load one knowledge file in full so Tracy can
      // synthesize a chat reply with framework depth. No school
      // scoping (knowledge is universal — same content for every
      // principal at every school).
      case 'consult_tracy_knowledge': {
        const rawTopic = String(input.topic || 'index').trim() as TracyKnowledgeTopic;
        const topic: TracyKnowledgeTopic = VALID_KNOWLEDGE_TOPICS.has(rawTopic)
          ? rawTopic
          : 'index';
        const content = await getTracyKnowledgeFull(topic);
        return {
          success: true,
          data: { topic, content },
          result_summary: `knowledge file: ${topic}`,
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
