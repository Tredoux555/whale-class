// /api/montree/parent/home-practice/route.ts
//
// ✨ Home Practice Cards (Jun 10, 2026) — a tiny weekly "try this at home"
// activity for the parent, matched to the work their child is currently
// focused on.
//
//   "This week [child] has been exploring the Pink Tower — building order and
//    coordination. At home, try: line up your shoes from biggest to smallest
//    together before going out. Let them lead. 5 minutes, lots of praise."
//
// One Haiku call per child per week, cached in montree_home_practice_cards.
// Tier-gated (free schools get nothing) + feature-flagged. Parent-auth +
// child-ownership enforced via resolveAuthorizedParent. GET-only, idempotent
// within a week.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';
import { getLocaleFromRequest } from '@/lib/montree/i18n/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Monday (UTC) of the week containing `d`, as YYYY-MM-DD.
function weekStartMonday(d = new Date()): string {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = dt.getUTCDay(); // 0 Sun..6 Sat
  const delta = dow === 0 ? -6 : 1 - dow; // back to Monday
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const parent = await resolveAuthorizedParent(supabase);
    if (!parent) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id') || parent.childId;
    // Ownership: requested child MUST be in the parent's authorized set.
    if (!parent.authorizedChildIds.includes(childId)) {
      return NextResponse.json({ success: false, error: 'Not authorized for this child' }, { status: 403 });
    }

    const weekStart = weekStartMonday();

    // 1. Cache hit?
    const { data: cached } = await supabase
      .from('montree_home_practice_cards')
      .select('activity_md, grounded_on_work')
      .eq('child_id', childId)
      .eq('week_start', weekStart)
      .maybeSingle();
    if (cached) {
      return NextResponse.json(
        { success: true, available: true, activity: cached.activity_md, work: cached.grounded_on_work },
        { headers: { 'Cache-Control': 'private, max-age=300' } }
      );
    }

    // 2. Resolve child → classroom → school (for tier + flag + grounding).
    //    school_id is taken FROM the owned child row (never from user input),
    //    so there's no cross-school escalation — the ownership check above is
    //    the trust boundary.
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id, school_id')
      .eq('id', childId)
      .maybeSingle<{ id: string; name: string; classroom_id: string; school_id: string }>();
    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }
    const { school_id: schoolId, classroom_id: classroomId, name: childName } = child;

    // 3. Feature flag + tier gate (cost control).
    const flagOn = await isFeatureEnabled(supabase, schoolId, 'home_practice_cards');
    if (!flagOn) {
      return NextResponse.json({ success: true, available: false }, { headers: { 'Cache-Control': 'private, max-age=300' } });
    }
    // resolveReportModel is the FREE/PAID gate only. The activity itself is
    // always generated with Haiku — it's a tiny 80-word card and the dry-run
    // proved Haiku quality is excellent here; no reason to spend Sonnet.
    const aiTier = await resolveReportModel(supabase, schoolId);
    if (aiTier.tier === 'free' || !AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: true, available: false }, { headers: { 'Cache-Control': 'private, max-age=300' } });
    }

    // 4. Current focus work = most-recent practicing/presented progress row.
    const { data: progressRows } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', childId)
      .in('status', ['practicing', 'presented'])
      .order('updated_at', { ascending: false })
      .limit(1);
    const focus = (progressRows || [])[0] as { work_name: string; area: string | null } | undefined;
    if (!focus?.work_name) {
      // Nothing to ground on this week — hide-when-empty.
      return NextResponse.json({ success: true, available: false }, { headers: { 'Cache-Control': 'private, max-age=300' } });
    }

    // 5. Enrich grounding from the classroom curriculum (description + aims).
    const { data: workRow } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, description, parent_description, why_it_matters, direct_aims')
      .eq('classroom_id', classroomId)
      .ilike('name', String(focus.work_name).replace(/[%_\\]/g, '\\$&'))
      .maybeSingle();
    const aims = Array.isArray((workRow as { direct_aims?: unknown })?.direct_aims)
      ? ((workRow as { direct_aims: unknown[] }).direct_aims).map(String).join(', ')
      : '';
    const grounding = [
      `Work: ${focus.work_name}`,
      (workRow as { parent_description?: string })?.parent_description || (workRow as { description?: string })?.description || '',
      (workRow as { why_it_matters?: string })?.why_it_matters ? `Why it matters: ${(workRow as { why_it_matters: string }).why_it_matters}` : '',
      aims ? `It develops: ${aims}` : '',
    ].filter(Boolean).join('\n');

    const locale = getLocaleFromRequest(request.url);
    const langInstruction = getAILanguageInstruction(locale);

    // 6. Generate (Haiku — model from the tier resolver; never hardcode).
    const system =
      'You write a single warm "try this at home" activity for a Montessori parent. ' +
      'Rules: 70-110 words, one flowing paragraph. One concrete activity using ONLY things in a normal home (no special materials, no printing, no screens). ' +
      'It should gently reinforce the SKILL the child\'s current work develops — never name Montessori jargon, never instruct the parent to "teach". ' +
      'Warm, encouraging, second person ("your child", "you"). End with one short reassurance that following the child\'s lead is enough. ' +
      'No headings, no lists, no markdown — just the short paragraph. Do NOT invent facts about the child.' +
      (langInstruction ? `\n${langInstruction}` : '');

    let activity = '';
    try {
      const resp = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 400,
        system,
        messages: [{
          role: 'user',
          content:
            `Child's first name: ${childName}\n` +
            `This week's focus:\n${grounding}\n\n` +
            `Write the at-home activity now.`,
        }],
      });
      const block = resp.content.find((b) => b.type === 'text');
      activity = block && 'text' in block ? block.text.trim() : '';
    } catch (err) {
      console.error('[HomePractice] generation failed:', err);
      return NextResponse.json({ success: true, available: false });
    }
    if (!activity) {
      return NextResponse.json({ success: true, available: false });
    }

    // 7. Cache (race-safe: another request may have written first → ignore conflict).
    await supabase
      .from('montree_home_practice_cards')
      .upsert(
        {
          child_id: childId,
          school_id: schoolId,
          week_start: weekStart,
          grounded_on_work: focus.work_name,
          activity_md: activity,
          model: HAIKU_MODEL,
        },
        { onConflict: 'child_id,week_start', ignoreDuplicates: true }
      );

    return NextResponse.json(
      { success: true, available: true, activity, work: focus.work_name },
      { headers: { 'Cache-Control': 'private, max-age=300' } }
    );
  } catch (error) {
    console.error('[HomePractice] error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
