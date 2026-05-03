// app/api/montree/admin/child-briefing/[childId]/route.ts
//
// "30-second briefing on this child" for principals.
//
// Loads everything the system knows about one child (mental profile, focus
// works, mastered works, recent confirmed photos with sonnet descriptions,
// teacher notes, recent corrections) and asks Sonnet to synthesise a single
// warm, professional briefing the principal can read in 30 seconds and walk
// into a parent conversation already informed.
//
// This is the SOLO data source for /montree/admin/child/[childId]. It
// returns BOTH the structured header data (for chrome) AND the synthesised
// briefing paragraphs (for the body).
//
// Tier-gated via resolveReportModel — free tier cannot use this feature.
// Cached at the response layer for 30 minutes (briefings refresh slowly;
// the principal asking the same parent's question 30 min apart is fine).
//
// GET /api/montree/admin/child-briefing/{childId}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { anthropic } from '@/lib/ai/anthropic';

export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ childId: string }>;
}

interface BriefingResponse {
  child: {
    id: string;
    name: string;
    age: number | null;
    photo_url: string | null;
    classroom_name: string;
    classroom_id: string;
    teacher_name: string | null;
  };
  briefing: string;          // The synthesised briefing (markdown-ish, plain prose)
  generated_at: string;      // ISO timestamp
  data_age_days: number;     // How recent the underlying observations are
  has_data: boolean;         // false when there's nothing meaningful to brief on
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'principal') {
      return NextResponse.json(
        { error: 'Only principals can request a briefing.' },
        { status: 403 }
      );
    }

    const { childId } = await context.params;
    if (!childId) {
      return NextResponse.json({ error: 'childId required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Security — child must belong to principal's school
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Tier gate
    const aiTier = await resolveReportModel(supabase, auth.schoolId);
    if (aiTier.tier === 'free' || !aiTier.model || !anthropic) {
      return NextResponse.json(
        {
          error: 'AI briefings require an active AI tier.',
          tier: aiTier.tier,
        },
        { status: 402 }
      );
    }

    // Pull everything in parallel — keep this snappy.
    const [
      childRes,
      classroomRes,
      profileRes,
      progressRes,
      focusRes,
      photosRes,
      notesRes,
    ] = await Promise.allSettled([
      // 1. Child basics
      supabase
        .from('montree_children')
        .select('id, name, age, photo_url, classroom_id, date_of_birth')
        .eq('id', childId)
        .maybeSingle(),
      // 2. Classroom + lead teacher (we'll backfill teacher name below)
      access.classroomId
        ? supabase
            .from('montree_classrooms')
            .select('id, name')
            .eq('id', access.classroomId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      // 3. Mental profile
      supabase
        .from('montree_child_mental_profiles')
        .select('*')
        .eq('child_id', childId)
        .maybeSingle(),
      // 4. All progress rows (sorted recent-first)
      supabase
        .from('montree_child_progress')
        .select('work_name, area, status, updated_at, mastered_at')
        .eq('child_id', childId)
        .order('updated_at', { ascending: false })
        .limit(80),
      // 5. Focus works per area (current shelf)
      supabase
        .from('montree_child_focus_works')
        .select('area, work_name')
        .eq('child_id', childId),
      // 6. Last 10 teacher-confirmed photos with sonnet descriptions
      supabase
        .from('montree_media')
        .select('captured_at, sonnet_draft, work_name, area, teacher_caption')
        .eq('child_id', childId)
        .eq('teacher_confirmed', true)
        .order('captured_at', { ascending: false })
        .limit(10),
      // 7. Last 15 teacher session notes
      supabase
        .from('montree_work_sessions')
        .select('observed_at, work_name, area, notes')
        .eq('child_id', childId)
        .not('notes', 'is', null)
        .order('observed_at', { ascending: false })
        .limit(15),
    ]);

    // Unpack child basics — required, bail if missing
    if (childRes.status !== 'fulfilled' || !childRes.value.data) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    const child = childRes.value.data;

    const classroomName =
      classroomRes.status === 'fulfilled' && classroomRes.value.data
        ? classroomRes.value.data.name
        : 'Unknown classroom';

    // Best-effort lead teacher lookup (one extra query, only if classroom present)
    let teacherName: string | null = null;
    if (access.classroomId) {
      const { data: teacher } = await supabase
        .from('montree_teachers')
        .select('name')
        .eq('classroom_id', access.classroomId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      teacherName = teacher?.name || null;
    }

    // Compute age from DOB if `age` column is empty (most schools use DOB)
    let computedAge: number | null = child.age || null;
    if (!computedAge && child.date_of_birth) {
      const dob = new Date(child.date_of_birth);
      if (!isNaN(dob.getTime())) {
        const ageMs = Date.now() - dob.getTime();
        computedAge = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
      }
    }

    const profile =
      profileRes.status === 'fulfilled' ? profileRes.value.data : null;
    const progress =
      progressRes.status === 'fulfilled'
        ? progressRes.value.data || []
        : [];
    const focusWorks =
      focusRes.status === 'fulfilled' ? focusRes.value.data || [] : [];
    const photos =
      photosRes.status === 'fulfilled' ? photosRes.value.data || [] : [];
    const notes =
      notesRes.status === 'fulfilled' ? notesRes.value.data || [] : [];

    // Aggregate the most recent activity timestamp across all sources
    const latestTimestamps: number[] = [
      ...progress.map((p: { updated_at?: string }) =>
        p.updated_at ? new Date(p.updated_at).getTime() : 0
      ),
      ...photos.map((p: { captured_at?: string }) =>
        p.captured_at ? new Date(p.captured_at).getTime() : 0
      ),
      ...notes.map((n: { observed_at?: string }) =>
        n.observed_at ? new Date(n.observed_at).getTime() : 0
      ),
    ].filter((t) => t > 0);
    const latestTs = latestTimestamps.length ? Math.max(...latestTimestamps) : 0;
    const dataAgeDays = latestTs
      ? Math.floor((Date.now() - latestTs) / (24 * 60 * 60 * 1000))
      : 999;
    const hasData =
      progress.length > 0 ||
      photos.length > 0 ||
      notes.length > 0 ||
      !!profile;

    // ── Compose the prompt ──────────────────────────────────────────────
    // Keep this PROSE not JSON. Sonnet writes much better prose when fed prose.
    const sections: string[] = [];

    sections.push(`CHILD: ${child.name}, age ${computedAge ?? 'unknown'}`);
    sections.push(`CLASSROOM: ${classroomName}${teacherName ? ` (lead teacher: ${teacherName})` : ''}`);

    if (profile) {
      const traits: string[] = [];
      if (profile.temperament_activity_level)
        traits.push(`activity level: ${profile.temperament_activity_level}`);
      if (profile.temperament_persistence)
        traits.push(`persistence: ${profile.temperament_persistence}`);
      if (profile.temperament_initial_reaction)
        traits.push(
          `initial reaction to new things: ${profile.temperament_initial_reaction}`
        );
      if (profile.temperament_intensity)
        traits.push(`emotional intensity: ${profile.temperament_intensity}`);
      if (profile.temperament_sensory_threshold)
        traits.push(
          `sensory threshold: ${profile.temperament_sensory_threshold}`
        );
      if (traits.length) {
        sections.push(`TEMPERAMENT: ${traits.join('; ')}`);
      }

      if (profile.baseline_focus_minutes) {
        sections.push(
          `FOCUS: typically settles for around ${profile.baseline_focus_minutes} minutes${
            profile.optimal_time_of_day ? `, best ${profile.optimal_time_of_day}` : ''
          }`
        );
      }

      if (
        profile.successful_strategies &&
        Array.isArray(profile.successful_strategies) &&
        profile.successful_strategies.length
      ) {
        sections.push(
          `WHAT WORKS: ${profile.successful_strategies.slice(0, 5).join('; ')}`
        );
      }
      if (
        profile.challenging_triggers &&
        Array.isArray(profile.challenging_triggers) &&
        profile.challenging_triggers.length
      ) {
        sections.push(
          `WATCH FOR: ${profile.challenging_triggers.slice(0, 5).join('; ')}`
        );
      }
      if (profile.family_notes) {
        sections.push(`FAMILY CONTEXT: ${profile.family_notes}`);
      }
      if (profile.special_considerations) {
        sections.push(`SPECIAL: ${profile.special_considerations}`);
      }
    }

    // Current focus works (one per area)
    if (focusWorks.length) {
      const focusList = focusWorks
        .map(
          (f: { area: string; work_name: string }) =>
            `${f.area}: ${f.work_name}`
        )
        .join('; ');
      sections.push(`CURRENT FOCUS WORKS: ${focusList}`);
    }

    // Recently mastered (last 5)
    const mastered = progress
      .filter(
        (p: { status?: string }) =>
          p.status === 'mastered' || p.status === 'completed'
      )
      .slice(0, 5);
    if (mastered.length) {
      const masteredList = mastered
        .map(
          (m: { work_name: string; mastered_at?: string; updated_at?: string }) =>
            `${m.work_name}${m.mastered_at ? ` (${m.mastered_at.slice(0, 10)})` : ''}`
        )
        .join('; ');
      sections.push(`RECENTLY MASTERED: ${masteredList}`);
    }

    // Currently practicing (last 5)
    const practicing = progress
      .filter((p: { status?: string }) => p.status === 'practicing')
      .slice(0, 5);
    if (practicing.length) {
      sections.push(
        `CURRENTLY PRACTICING: ${practicing.map((p: { work_name: string }) => p.work_name).join('; ')}`
      );
    }

    // Recent confirmed photos with sonnet descriptions
    if (photos.length) {
      const photoLines = photos.slice(0, 8).map((p: {
        captured_at?: string;
        sonnet_draft?: { visual_description?: string } | null;
        work_name?: string;
        area?: string;
        teacher_caption?: string;
      }) => {
        const date = p.captured_at ? p.captured_at.slice(0, 10) : 'unknown';
        const desc =
          (p.sonnet_draft && p.sonnet_draft.visual_description) ||
          p.teacher_caption ||
          p.work_name ||
          'observation';
        return `  • ${date}: ${desc.slice(0, 200)}`;
      });
      sections.push(`RECENT MOMENTS (teacher-confirmed photos):\n${photoLines.join('\n')}`);
    }

    // Recent teacher notes
    if (notes.length) {
      const noteLines = notes.slice(0, 10).map((n: {
        observed_at?: string;
        work_name?: string;
        notes?: string;
      }) => {
        const date = n.observed_at ? n.observed_at.slice(0, 10) : 'unknown';
        return `  • ${date} (${n.work_name || 'general'}): ${(n.notes || '').slice(0, 250)}`;
      });
      sections.push(`TEACHER NOTES (recent):\n${noteLines.join('\n')}`);
    }

    if (!hasData) {
      // No data — return a clean empty briefing instead of asking AI to invent
      const response: BriefingResponse = {
        child: {
          id: child.id,
          name: child.name,
          age: computedAge,
          photo_url: child.photo_url || null,
          classroom_name: classroomName,
          classroom_id: child.classroom_id,
          teacher_name: teacherName,
        },
        briefing:
          `${child.name} is in ${classroomName}${teacherName ? ` with ${teacherName}` : ''}, but we don't have observations to draw on yet. ` +
          `When the teacher starts capturing moments and adding notes, this briefing will fill in with what ${child.name} is working on, what's been mastered recently, and what to watch for.`,
        generated_at: new Date().toISOString(),
        data_age_days: dataAgeDays,
        has_data: false,
      };
      const r = NextResponse.json(response);
      r.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=900');
      return r;
    }

    const userContent = sections.join('\n\n');

    const systemPrompt = `You are briefing a Montessori principal so she can walk into a conversation with a parent and speak about their child with confidence.

Write 3-4 short paragraphs (200-300 words total). Plain professional prose, no headings, no bullet points, no jargon. The voice is warm, observant, and grounded in evidence. Refer to the child by their first name throughout.

Cover, in this order:
1) Who this child is right now — temperament, learning style, what catches their attention. Use the temperament data to paint a quick portrait.
2) What they're working on this week — current focus works and what they're practicing. Mention specific work names.
3) Recent moments worth knowing about — pull from teacher notes and confirmed observations. Quote dates if helpful ("on Tuesday her teacher noticed…"). Keep it specific and concrete.
4) What to watch for or build on next — pull from "what works", "watch for", and the trajectory of their progress.

Rules:
- Never invent observations, work names, dates, or teacher comments. Use only what's in the data below.
- If a category is empty, just skip it — don't say "we don't have data on this."
- No medical claims. No diagnostic language.
- No "the child" or "this student" — always the first name.
- End with a forward-looking sentence the principal could repeat to a parent verbatim.

Output ONLY the briefing prose. No preamble, no sign-off.`;

    const message = await anthropic.messages.create({
      model: aiTier.model,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const briefing = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim();

    const response: BriefingResponse = {
      child: {
        id: child.id,
        name: child.name,
        age: computedAge,
        photo_url: child.photo_url || null,
        classroom_name: classroomName,
        classroom_id: child.classroom_id,
        teacher_name: teacherName,
      },
      briefing,
      generated_at: new Date().toISOString(),
      data_age_days: dataAgeDays,
      has_data: true,
    };

    const r = NextResponse.json(response);
    // 30 min cache — briefings update slowly; the principal asking the same
    // parent question twice within 30 min should get the same briefing.
    r.headers.set('Cache-Control', 'private, max-age=1800, stale-while-revalidate=3600');
    return r;
  } catch (error) {
    console.error('[child-briefing] error:', error);
    return NextResponse.json(
      { error: 'Could not generate briefing.' },
      { status: 500 }
    );
  }
}
