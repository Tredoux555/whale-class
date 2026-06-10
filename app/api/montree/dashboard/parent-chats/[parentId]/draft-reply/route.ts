// app/api/montree/dashboard/parent-chats/[parentId]/draft-reply/route.ts
//
// ✨ Parent Q&A loop (Jun 10, 2026) — Guru-assisted reply drafting for the
// teacher. The teacher taps "Draft with Guru" in a parent chat and gets a
// warm, parent-facing reply grounded in the child's REAL data:
//   - if the parent asked a question, it answers that question;
//   - otherwise it drafts a brief proactive update.
// The teacher reviews + edits + sends (this route NEVER sends — it only
// returns draft text into the composer). Tier-gated (free → 402). Drafts
// always with Haiku for cost discipline.
//
// CROSS-POLLINATION: parent row school_id MUST equal caller.schoolId, and the
// grounded child MUST belong to the caller's school (verifyChildBelongsToSchool).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { anthropic, AI_ENABLED, HAIKU_MODEL } from '@/lib/ai/anthropic';
import { getAILanguageInstruction } from '@/lib/montree/i18n/locale-config';
import { getLocaleFromRequest } from '@/lib/montree/i18n/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUESTION_LEN = 1500;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> },
) {
  try {
    const { parentId } = await params;
    if (!UUID_RE.test(parentId)) {
      return NextResponse.json({ error: 'Invalid parent id' }, { status: 400 });
    }

    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== 'teacher' && auth.role !== 'principal') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getSupabase();
    const body = await request.json().catch(() => ({}));
    const childId: string | undefined = body?.child_id;
    const question: string = typeof body?.question === 'string' ? body.question.slice(0, MAX_QUESTION_LEN) : '';

    if (!childId || !UUID_RE.test(childId)) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Cross-pollination: parent must be in caller's school.
    const { data: parentRow } = await supabase
      .from('montree_parents')
      .select('id, name, school_id')
      .eq('id', parentId)
      .maybeSingle<{ id: string; name: string | null; school_id: string }>();
    if (!parentRow) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }
    if (parentRow.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Parent not in your school' }, { status: 403 });
    }

    // Cross-pollination: grounded child must belong to caller's school.
    // verifyChildBelongsToSchool(childId, schoolId) returns { allowed }.
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Child not in your school' }, { status: 403 });
    }

    // Tier gate (free → no AI draft). Draft always with Haiku.
    const aiTier = await resolveReportModel(supabase, auth.schoolId);
    if (aiTier.tier === 'free' || !AI_ENABLED || !anthropic) {
      return NextResponse.json(
        { error: 'AI drafting requires an active AI tier', requires_upgrade: true, upgrade_url: '/montree/admin/billing', feature: 'parent_qa' },
        { status: 402 },
      );
    }

    // Grounding: child name + current focus work (+ curriculum description).
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id')
      .eq('id', childId)
      .maybeSingle<{ id: string; name: string; classroom_id: string }>();
    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const { data: focusRows } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', childId)
      .in('status', ['practicing', 'presented'])
      .order('updated_at', { ascending: false })
      .limit(4);
    const focusList = (focusRows || []) as Array<{ work_name: string; area: string | null; status: string }>;
    const focusSummary = focusList.length
      ? focusList.map(f => `- ${f.work_name}${f.area ? ` (${f.area})` : ''} — ${f.status}`).join('\n')
      : '(no current focus works recorded)';

    // Optional richer grounding from the curriculum on the top focus work.
    let workContext = '';
    if (focusList[0]?.work_name) {
      const { data: workRow } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('name, parent_description, why_it_matters')
        .eq('classroom_id', child.classroom_id)
        .ilike('name', focusList[0].work_name)
        .maybeSingle<{ name: string; parent_description: string | null; why_it_matters: string | null }>();
      if (workRow) {
        workContext = [workRow.parent_description, workRow.why_it_matters].filter(Boolean).join(' ');
      }
    }

    const locale = getLocaleFromRequest(request.url);
    const langInstruction = getAILanguageInstruction(locale);

    const system =
      'You are helping a Montessori teacher write a warm, honest reply to a parent about their child. ' +
      'Write as the teacher (first person, "I"), to the parent ("you", "your child"). ' +
      'Rules: 60-130 words, plain warm language, no Montessori jargon. ' +
      'Ground every claim in the provided focus-work data — NEVER invent observations, grades, dates, or incidents. ' +
      'No medical, diagnostic, or developmental claims about the child. ' +
      'If the parent asks something the data does not cover, say honestly that you\'ll observe and follow up rather than guessing. ' +
      'If there is no question, write a brief, specific, encouraging update about what the child is currently working on. ' +
      'No greeting line is required (the teacher may add one) and no sign-off. Just the message body.' +
      (langInstruction ? `\n${langInstruction}` : '');

    const userMsg =
      `Child's first name: ${child.name}\n` +
      `What ${child.name} is currently working on:\n${focusSummary}\n` +
      (workContext ? `\nAbout the main work: ${workContext}\n` : '') +
      (question
        ? `\nThe parent asked / said:\n"${question}"\n\nDraft the teacher's reply now.`
        : `\nThe parent hasn't asked anything specific. Draft a brief, warm proactive update now.`);

    let reply = '';
    try {
      const resp = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 500,
        system,
        messages: [{ role: 'user', content: userMsg }],
      });
      const block = resp.content.find((b) => b.type === 'text');
      reply = block && 'text' in block ? block.text.trim() : '';
    } catch (err) {
      console.error('[ParentQA draft] generation failed:', err);
      return NextResponse.json({ error: 'Draft failed — please try again' }, { status: 502 });
    }
    if (!reply) {
      return NextResponse.json({ error: 'Draft came back empty — please try again' }, { status: 502 });
    }

    return NextResponse.json(
      { success: true, draft: reply },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[ParentQA draft] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
