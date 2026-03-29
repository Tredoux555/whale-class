// GET  /api/montree/intelligence/daily-brief  — Teacher's daily action summary
//
// Single consolidated endpoint that pulls key metrics from all 6 Teacher OS features:
//   1. Attendance  (present/absent today)
//   2. Stale Works (works not updated 7+ days)
//   3. Conference Notes (drafts needing action)
//   4. Evidence (works ready for mastery confirmation)
//   5. Pulse (last generation time)
//   6. Skill Intelligence (V3 cross-area attention flags)
//
// All queries run in parallel for speed. Returns a compact action-oriented summary.
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

interface SkillIntelligenceFlag {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  childName?: string;
  childId?: string;
}

interface DailyBriefResponse {
  date: string;
  attendance: {
    total: number;
    present: number;
    absent: number;
    needs_override: number; // absent but no manual override yet
  };
  stale_works: {
    total: number;
    attention: number;  // 21+ days
    stale: number;      // 14-20 days
    cooling: number;    // 7-13 days
  };
  conference_notes: {
    drafts: number;
    shared: number;
    old_drafts: number; // drafts > 7 days old without sharing
  };
  evidence: {
    ready_for_mastery: number;
    strong: number;
    moderate: number;
    weak: number;
    confirmed: number;
  };
  pulse: {
    last_generated_at: string | null;
    hours_since_last: number | null;
  };
  skill_intelligence: {
    total_flags: number;
    high_flags: number;
    flags: SkillIntelligenceFlag[];
  };
  action_items: ActionItem[];
}

interface ActionItem {
  type: 'attendance' | 'stale_works' | 'conference_notes' | 'evidence' | 'pulse' | 'skill_intelligence';
  priority: 'high' | 'medium' | 'low';
  message: string;
  count: number;
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Fetch all children in classroom first (needed for attendance)
    const { data: children, error: childrenErr } = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', auth.classroomId)
      .eq('school_id', auth.schoolId);

    if (childrenErr) {
      console.error('[DailyBrief] Children fetch error:', childrenErr);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    if (!children || children.length === 0) {
      return NextResponse.json({
        date: today,
        attendance: { total: 0, present: 0, absent: 0, needs_override: 0 },
        stale_works: { total: 0, attention: 0, stale: 0, cooling: 0 },
        conference_notes: { drafts: 0, shared: 0, old_drafts: 0 },
        evidence: { ready_for_mastery: 0, strong: 0, moderate: 0, weak: 0, confirmed: 0 },
        pulse: { last_generated_at: null, hours_since_last: null },
        skill_intelligence: { total_flags: 0, high_flags: 0, flags: [] },
        action_items: [],
      });
    }

    const childIds = children.map((c: { id: string }) => c.id);

    // Run ALL 5 queries in parallel
    const [attendanceResult, staleResult, notesResult, evidenceResult, pulseResult, skillResult] = await Promise.allSettled([
      // 1. Attendance — photos today + manual overrides
      (async () => {
        const [photosRes, overridesRes] = await Promise.all([
          supabase
            .from('montree_media')
            .select('child_id')
            .in('child_id', childIds)
            .gte('created_at', `${today}T00:00:00`)
            .lt('created_at', `${today}T23:59:59.999`),
          supabase
            .from('montree_attendance_override')
            .select('child_id')
            .in('child_id', childIds)
            .eq('date', today),
        ]);
        const photoChildIds = new Set((photosRes.data || []).map((p: { child_id: string }) => p.child_id));
        const overrideChildIds = new Set((overridesRes.data || []).map((o: { child_id: string }) => o.child_id));
        const presentIds = new Set([...photoChildIds, ...overrideChildIds]);
        const absentIds = childIds.filter(id => !presentIds.has(id));
        const needsOverride = absentIds.filter(id => !overrideChildIds.has(id)).length;
        return {
          total: children.length,
          present: presentIds.size,
          absent: absentIds.length,
          needs_override: needsOverride,
        };
      })(),

      // 2. Stale Works — from the SQL view
      (async () => {
        const { data, error } = await supabase
          .from('montree_stale_works_view')
          .select('child_id, work_name, days_stale')
          .in('child_id', childIds);
        if (error) throw error;

        // Exclude dismissed works
        const { data: dismissals } = await supabase
          .from('montree_stale_work_dismissals')
          .select('child_id, work_name')
          .in('child_id', childIds);
        const dismissedKeys = new Set(
          (dismissals || []).map((d: { child_id: string; work_name: string }) => `${d.child_id}:${d.work_name}`)
        );

        const works = (data || []).filter((w: { child_id: string; work_name: string; days_stale: number }) => {
          return !dismissedKeys.has(`${w.child_id}:${w.work_name}`);
        });

        let attention = 0, stale = 0, cooling = 0;
        for (const w of works) {
          if (w.days_stale >= 21) attention++;
          else if (w.days_stale >= 14) stale++;
          else cooling++;
        }
        return { total: works.length, attention, stale, cooling };
      })(),

      // 3. Conference Notes — drafts vs shared
      (async () => {
        const { data, error } = await supabase
          .from('montree_conference_notes')
          .select('status, created_at, shared_at')
          .in('child_id', childIds);
        if (error) throw error;

        let drafts = 0, shared = 0, oldDrafts = 0;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        for (const n of (data || [])) {
          if (n.status === 'draft') {
            drafts++;
            if (n.created_at < sevenDaysAgo) oldDrafts++;
          } else if (n.status === 'shared') {
            shared++;
          }
        }
        return { drafts, shared, old_drafts: oldDrafts };
      })(),

      // 4. Evidence — aggregate from child progress
      (async () => {
        const { data, error } = await supabase
          .from('montree_child_progress')
          .select('evidence_photo_count, evidence_photo_days, mastery_confirmed_at, status')
          .in('child_id', childIds)
          .in('status', ['presented', 'practicing', 'mastered']);
        if (error) throw error;

        let strong = 0, moderate = 0, weak = 0, confirmed = 0, ready = 0;
        for (const p of (data || [])) {
          const count = p.evidence_photo_count || 0;
          const days = p.evidence_photo_days || 0;
          if (p.mastery_confirmed_at) confirmed++;
          if (count >= 3 && days >= 3) {
            strong++;
            if (!(p.status === 'mastered' && p.mastery_confirmed_at)) ready++;
          } else if (count >= 2 || days >= 2) {
            moderate++;
          } else if (count > 0) {
            weak++;
          }
        }
        return { ready_for_mastery: ready, strong, moderate, weak, confirmed };
      })(),

      // 5. Pulse — last generation time
      (async () => {
        const { data, error } = await supabase
          .from('montree_pulse_lock')
          .select('completed_at')
          .eq('classroom_id', auth.classroomId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        const lastAt = data?.[0]?.completed_at || null;
        let hoursSince: number | null = null;
        if (lastAt) {
          hoursSince = Math.round((Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60));
        }
        return { last_generated_at: lastAt, hours_since_last: hoursSince };
      })(),

      // 6. Skill Intelligence — V3 cross-area attention flags
      (async () => {
        try {
          const { generateClassroomAttentionFlags } = await import('@/lib/montree/guru/skill-graph');
          // Fetch progress + observations for all children in parallel
          const [progressRes, obsRes] = await Promise.all([
            supabase
              .from('montree_child_progress')
              .select('child_id, work_key, work_name, area, status, updated_at')
              .in('child_id', childIds)
              .in('status', ['presented', 'practicing', 'mastered']),
            supabase
              .from('montree_behavioral_observations')
              .select('child_id, observation')
              .in('child_id', childIds)
              .order('created_at', { ascending: false })
              .limit(500),
          ]);

          if (progressRes.error) throw progressRes.error;

          // Build ChildDataForFlags[] from children + progress + observations
          const childMap = new Map<string, { name: string; progress: typeof progressRes.data; observations: string[] }>();
          for (const child of children) {
            childMap.set(child.id, { name: child.name, progress: [], observations: [] });
          }
          for (const p of (progressRes.data || [])) {
            const entry = childMap.get(p.child_id);
            if (entry) entry.progress.push(p);
          }
          for (const o of (obsRes.data || [])) {
            const entry = childMap.get(o.child_id);
            if (entry && o.observation) entry.observations.push(o.observation);
          }

          const childrenData = Array.from(childMap.entries()).map(([id, data]) => ({
            childId: id,
            childName: data.name,
            progress: data.progress.map(p => ({
              work_key: p.work_key || '',
              work_name: p.work_name || '',
              area: p.area || '',
              status: p.status || '',
              updated_at: p.updated_at || undefined,
            })),
            observations: data.observations,
          }));

          const flags = generateClassroomAttentionFlags(childrenData, 5);
          const highFlags = flags.filter(f => f.severity === 'high').length;
          return {
            total_flags: flags.length,
            high_flags: highFlags,
            flags: flags.map(f => ({
              type: f.type,
              severity: f.severity,
              message: f.message,
              childName: f.childName,
              childId: f.childId,
            })),
          };
        } catch (err) {
          console.error('[DailyBrief] Skill intelligence error (non-fatal):', err);
          return { total_flags: 0, high_flags: 0, flags: [] };
        }
      })(),
    ]);

    // Extract results with graceful degradation + error logging
    const queryResults = [
      { name: 'attendance', result: attendanceResult },
      { name: 'stale_works', result: staleResult },
      { name: 'conference_notes', result: notesResult },
      { name: 'evidence', result: evidenceResult },
      { name: 'pulse', result: pulseResult },
      { name: 'skill_intelligence', result: skillResult },
    ];
    for (const { name, result } of queryResults) {
      if (result.status === 'rejected') {
        console.error(`[DailyBrief] ${name} query failed:`, result.reason);
      }
    }

    const attendance = attendanceResult.status === 'fulfilled'
      ? attendanceResult.value
      : { total: children.length, present: 0, absent: children.length, needs_override: children.length };

    const staleWorks = staleResult.status === 'fulfilled'
      ? staleResult.value
      : { total: 0, attention: 0, stale: 0, cooling: 0 };

    const conferenceNotes = notesResult.status === 'fulfilled'
      ? notesResult.value
      : { drafts: 0, shared: 0, old_drafts: 0 };

    const evidence = evidenceResult.status === 'fulfilled'
      ? evidenceResult.value
      : { ready_for_mastery: 0, strong: 0, moderate: 0, weak: 0, confirmed: 0 };

    const pulse = pulseResult.status === 'fulfilled'
      ? pulseResult.value
      : { last_generated_at: null, hours_since_last: null };

    const skillIntelligence = skillResult.status === 'fulfilled'
      ? skillResult.value
      : { total_flags: 0, high_flags: 0, flags: [] };

    // Build action items (priority-sorted)
    const actionItems: ActionItem[] = [];

    // Attendance is NOT an action item — it's normal to not have logged everyone yet.
    // The present/total stat is still shown in the expanded view.

    if (staleWorks.attention > 0) {
      actionItems.push({
        type: 'stale_works',
        priority: 'medium',
        message: `${staleWorks.attention} works to revisit (21+ days)`,
        count: staleWorks.attention,
      });
    } else if (staleWorks.total > 0) {
      actionItems.push({
        type: 'stale_works',
        priority: 'low',
        message: `${staleWorks.total} works cooling off`,
        count: staleWorks.total,
      });
    }

    if (conferenceNotes.old_drafts > 0) {
      actionItems.push({
        type: 'conference_notes',
        priority: 'medium',
        message: `${conferenceNotes.old_drafts} draft notes older than 7 days`,
        count: conferenceNotes.old_drafts,
      });
    } else if (conferenceNotes.drafts > 0) {
      actionItems.push({
        type: 'conference_notes',
        priority: 'low',
        message: `${conferenceNotes.drafts} draft notes pending`,
        count: conferenceNotes.drafts,
      });
    }

    if (evidence.ready_for_mastery > 0) {
      actionItems.push({
        type: 'evidence',
        priority: 'medium',
        message: `${evidence.ready_for_mastery} works ready for mastery confirmation`,
        count: evidence.ready_for_mastery,
      });
    }

    if (pulse.hours_since_last === null || pulse.hours_since_last >= 168) {
      actionItems.push({
        type: 'pulse',
        priority: pulse.hours_since_last === null ? 'low' : 'medium',
        message: pulse.hours_since_last === null ? 'No classroom pulse generated yet' : 'Classroom pulse is over a week old',
        count: 1,
      });
    }

    if (skillIntelligence.high_flags > 0) {
      actionItems.push({
        type: 'skill_intelligence',
        priority: 'high',
        message: `${skillIntelligence.high_flags} skill insight${skillIntelligence.high_flags > 1 ? 's' : ''} need attention`,
        count: skillIntelligence.high_flags,
      });
    } else if (skillIntelligence.total_flags > 0) {
      actionItems.push({
        type: 'skill_intelligence',
        priority: 'medium',
        message: `${skillIntelligence.total_flags} skill insight${skillIntelligence.total_flags > 1 ? 's' : ''} available`,
        count: skillIntelligence.total_flags,
      });
    }

    // Sort: high → medium → low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const response: DailyBriefResponse = {
      date: today,
      attendance,
      stale_works: staleWorks,
      conference_notes: conferenceNotes,
      evidence,
      pulse,
      skill_intelligence: skillIntelligence,
      action_items: actionItems,
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    });
  } catch (err) {
    console.error('[DailyBrief] GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
