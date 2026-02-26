// app/api/montree/guru/dashboard-summary/route.ts
// Single endpoint that returns all dashboard guru data in one call.
// Replaces 4 separate auto-firing calls: end-of-day, suggestions, weekly-review status, daily-plan status.
// Uses Haiku for any AI generation. All sections independently cached.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { analyzeChildProgress } from '@/lib/montree/guru/progress-analyzer';

interface DashboardSummary {
  endOfDay: { nudge: string | null };
  suggestion: { text: string | null; type: string };
  weeklyReview: { available: boolean; review: string | null };
}

function getISOWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const week = Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ success: false, error: 'child_id is required' }, { status: 400 });
    }

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Fetch child info once (shared across all sections)
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, age, classroom_id')
      .eq('id', childId)
      .single();

    const childName = child?.name?.split(' ')[0] || 'Your child';
    const childAge = child?.age || 4;
    const classroomId = child?.classroom_id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const isoWeek = getISOWeek();

    // Run all checks in parallel — DB queries only, no AI yet
    const [todayProgressResult, cachedEndOfDay, cachedSuggestion, cachedWeeklyReview, progressAnalysis] = await Promise.all([
      // 1. Today's progress (for end-of-day)
      supabase
        .from('montree_child_progress')
        .select('work_name, area, status, updated_at')
        .eq('child_id', childId)
        .gte('updated_at', todayISO)
        .order('updated_at', { ascending: false }),

      // 2. Cached end-of-day nudge
      supabase
        .from('montree_guru_interactions')
        .select('response_insight')
        .eq('child_id', childId)
        .eq('question_type', 'end_of_day')
        .gte('asked_at', todayISO)
        .limit(1)
        .single(),

      // 3. Cached suggestion (this week)
      supabase
        .from('montree_guru_interactions')
        .select('response_insight, context_snapshot')
        .eq('child_id', childId)
        .eq('question_type', 'proactive_suggestion')
        .gte('asked_at', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString())
        .limit(1)
        .single(),

      // 4. Cached weekly review
      supabase
        .from('montree_guru_interactions')
        .select('response_insight')
        .eq('child_id', childId)
        .eq('question_type', 'weekly_review')
        .eq('question', isoWeek)
        .limit(1)
        .single(),

      // 5. Progress analysis (for suggestions)
      analyzeChildProgress(supabase, childId),
    ]);

    const todayProgress = todayProgressResult.data || [];

    // Build summary — use cached data where available, generate only what's needed
    const summary: DashboardSummary = {
      endOfDay: { nudge: null },
      suggestion: { text: null, type: 'none' },
      weeklyReview: { available: false, review: null },
    };

    // --- END OF DAY ---
    if (cachedEndOfDay.data?.response_insight) {
      summary.endOfDay.nudge = cachedEndOfDay.data.response_insight;
    } else if (todayProgress.length > 0 && AI_ENABLED && anthropic) {
      // Generate end-of-day nudge
      try {
        const progressSummary = todayProgress.map(p =>
          `${p.work_name} (${p.area}) — ${p.status}`
        ).join('\n');

        const message = await anthropic.messages.create({
          model: HAIKU_MODEL,
          max_tokens: 300,
          system: `You are a warm, encouraging Montessori guide for homeschool parents. Write a brief end-of-day summary in EXACTLY 3 sentences:
1. What went well today (reference specific works)
2. What to try tomorrow (one gentle suggestion)
3. One encouragement for the parent

Keep it warm, specific, and under 80 words total. Use the child's name. Do NOT use headers or bullet points — just 3 flowing sentences.`,
          messages: [{
            role: 'user',
            content: `Child: ${childName}\n\nToday's progress:\n${progressSummary}\n\nWrite 3 sentences.`,
          }],
        });

        const nudgeText = message.content
          .filter(block => block.type === 'text')
          .map(block => (block as { type: 'text'; text: string }).text)
          .join('');

        summary.endOfDay.nudge = nudgeText;

        // Cache (fire-and-forget)
        supabase.from('montree_guru_interactions').insert({
          child_id: childId,
          classroom_id: classroomId,
          question: `End-of-day nudge for ${todayProgress.length} activities`,
          question_type: 'end_of_day',
          response_insight: nudgeText,
          model_used: HAIKU_MODEL,
          context_snapshot: { child_name: childName, progress_count: todayProgress.length },
        }).catch(err => console.error('[Guru Dashboard] Cache insert failed:', err));
      } catch (error) {
        // Non-critical — continue without nudge
        console.error('[Guru Dashboard] AI generation failed:', error);
      }
    }

    // --- SUGGESTIONS ---
    if (cachedSuggestion.data?.response_insight) {
      summary.suggestion.text = cachedSuggestion.data.response_insight;
      summary.suggestion.type = (cachedSuggestion.data.context_snapshot as Record<string, unknown>)?.suggestion_type as string || 'stale';
    } else if ((progressAnalysis.staleWorks.length > 0 || !progressAnalysis.hasActivity) && AI_ENABLED && anthropic) {
      try {
        const suggestionType = progressAnalysis.staleWorks.length > 0 ? 'stale' : 'inactive';
        let prompt: string;

        if (suggestionType === 'stale') {
          const staleList = progressAnalysis.staleWorks.slice(0, 5).map(w =>
            `${w.work_name} (${w.area}) — ${w.status} for ${w.days_stale} days`
          ).join('\n');
          prompt = `Child: ${childName}, age ${childAge}\n\nStale works (2+ weeks same status):\n${staleList}\n\nWrite 3-4 warm sentences: name the pattern, suggest ONE thing to try, reassure plateaus are normal. No headers or bullets.`;
        } else {
          prompt = `Child: ${childName}, age ${childAge}\nNo activities logged in ${progressAnalysis.daysInactive} days.\n\nWrite 3-4 warm, non-judgmental sentences: acknowledge absence gently, suggest 2-3 quick 5-minute activities, end with encouragement. No headers or bullets.`;
        }

        const message = await anthropic.messages.create({
          model: HAIKU_MODEL,
          max_tokens: 300,
          system: 'You are a warm Montessori guide for homeschool parents. Be encouraging, specific, and never guilt-tripping. Keep responses under 100 words.',
          messages: [{ role: 'user', content: prompt }],
        });

        const suggestionText = message.content
          .filter(block => block.type === 'text')
          .map(block => (block as { type: 'text'; text: string }).text)
          .join('');

        summary.suggestion = { text: suggestionText, type: suggestionType };

        // Cache (fire-and-forget)
        supabase.from('montree_guru_interactions').insert({
          child_id: childId,
          classroom_id: classroomId,
          question: `Proactive suggestion (${suggestionType})`,
          question_type: 'proactive_suggestion',
          response_insight: suggestionText,
          model_used: HAIKU_MODEL,
          context_snapshot: { child_name: childName, suggestion_type: suggestionType, iso_week: isoWeek },
        }).catch(err => console.error('[Guru Dashboard] Cache insert failed:', err));
      } catch (error) {
        // Non-critical
        console.error('[Guru Dashboard] AI generation failed:', error);
      }
    }

    // --- WEEKLY REVIEW ---
    if (cachedWeeklyReview.data?.response_insight) {
      summary.weeklyReview = { available: true, review: cachedWeeklyReview.data.response_insight };
    }
    // Don't auto-generate weekly review — it's expensive and only useful on tap

    return NextResponse.json({ success: true, ...summary });

  } catch (error) {
    console.error('[Guru Dashboard Summary] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load dashboard' }, { status: 500 });
  }
}
