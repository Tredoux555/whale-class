// app/api/montree/onboarding-copilot/ask/route.ts
//
// POST — Haiku Q&A scoped to the user's CURRENT onboarding step.
//
// Model policy (contract §0.5): HAIKU_MODEL ALWAYS, all tiers incl. free.
// Onboarding help must never 402 — this is the most fragile funnel moment.
// Budget-metered like every AI route; conversational → default temperature.
//
// 🚨 The grounding journey map below is a SERVER-ONLY prompt copy (English).
//    It is NOT the i18n source (journeys.ts stays key-only per contract §6.2).
//    Haiku answers in the user's locale per the voice rules; this map only
//    tells the model which screens/buttons actually exist so it can never
//    invent UI.
//
// Contract: docs/handoffs/PLAN_ONBOARDING_COPILOT_JUL16.md §3.

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { checkAiBudget, logApiUsage } from '@/lib/montree/api-usage';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';
import {
  deriveJourney,
  type DerivedJourney,
  type CopilotState,
  type JourneyId,
} from '@/lib/montree/onboarding-copilot/journeys';
import {
  loadCopilotState,
  loadCopilotProgress,
  journeyForRole,
  type CopilotRole,
} from '@/lib/montree/onboarding-copilot/state-loader';

// ── Server-only grounding copy (English), keyed journey+stepId. Mirrors the
//    §4 flow so Haiku only ever references real screens + click-paths. ──────
const GROUNDING: Record<JourneyId, Record<string, { title: string; instructions: string }>> = {
  principal: {
    classroom: {
      title: 'Open your first classroom',
      instructions:
        'Click Classrooms in the sidebar, then click the dashed "+ Add Classroom" tile, give it a name and pick a colour. Tip: it\'s quicker to set the school up from a computer, and let teachers join from their phones.',
    },
    teacher: {
      title: 'Give the classroom its teacher',
      instructions:
        'Click Classrooms, click into the classroom, then in Teaching team click "Add a teacher" and type their name. Montree creates a 6-letter login code shown on their row.',
    },
    handover: {
      title: 'Hand over the key',
      instructions:
        'Open the classroom, find the teacher\'s row in Teaching team, tap Copy next to their code (or Send for a ready-written message), and send it to them however you talk. They log in at montree.xyz on their phone with just that code — Montree is made for the teacher\'s pocket.',
    },
    students: {
      title: 'The children arrive',
      instructions:
        'The teacher adds their own class from their device. If the principal prefers, they can enter the class list themselves under the classroom\'s Advanced setup.',
    },
    first_photo: {
      title: 'The first photo',
      instructions:
        'The teacher takes one photo of a child working with the camera button in their app; the material is recognised and the observation logged automatically.',
    },
    first_report: {
      title: 'The loop closes',
      instructions:
        'At week\'s end the teacher sends each family a personal report from Parents → Reports on their device. It ticks here when the first one goes out.',
    },
  },
  teacher: {
    students: {
      title: 'Bring in your class',
      instructions:
        'Tap the big import card on the dashboard (or ☰ More → Students), type or paste the class list one child per row, and tap Save.',
    },
    voice_intro: {
      title: 'Tell me about them',
      instructions:
        'Right after adding students, tap "Tell me about them" on screen, then speak naturally about each child — I build their profile and starter shelf. A few now, the rest whenever.',
    },
    first_photo: {
      title: 'Catch one moment',
      instructions:
        'Tap the camera at the top of the screen, photograph one child at any work, tap the child\'s face to tag them, then Save.',
    },
    confirm: {
      title: 'Check my work',
      instructions:
        'Open ☰ More → Wrap Up, and on the Confirm tab look at my guess under each photo. Tap the check if it is right, or fix me and I remember.',
    },
    parents: {
      title: 'Invite a family',
      instructions:
        'Open ☰ More → Parents, and on the Codes tab tap Generate next to a child, then tap Welcome message to copy a ready-to-send note with their code.',
    },
    report: {
      title: 'Send your first report',
      instructions:
        'Open ☰ More → Parents, then the Reports tab, tap Preview on a child to read what I wrote, and tap Send when happy.',
    },
  },
};

function buildAskSystemPrompt(
  journey: JourneyId,
  derived: DerivedJourney,
  state: CopilotState,
  locale: string
): string {
  const persona =
    journey === 'principal'
      ? "You are Astra, the principal's calm chief of staff at their Montessori school."
      : "You are Guru, the teacher's warm Montessori mentor.";

  const voice = [
    'Voice: warm, plain, at most 120 words, one thing at a time, never bullet-spam,',
    'no exclamation marks except genuine celebration.',
    `Answer in the user's language (locale code: ${locale}).`,
  ].join(' ');

  const map = derived.steps
    .map((s, i) => {
      const status = s.done || s.skipped ? 'DONE' : s.current ? 'CURRENT STEP' : 'not yet';
      const g = GROUNDING[journey][s.id];
      const title = g?.title ?? s.id;
      const instructions = g?.instructions ?? '';
      return `${i + 1}. [${status}] ${title}\n   Where: ${s.route}\n   How: ${instructions}`;
    })
    .join('\n');

  const numbers = [
    `Live numbers for this school: classrooms ${state.classrooms},`,
    `teachers ${state.teachers}, teachers logged in ${state.teachers_logged_in},`,
    `students ${state.students}, child profiles set up ${state.profiles_onboarded},`,
    `photos ${state.photos}, photos confirmed ${state.photos_confirmed},`,
    `parent codes generated ${state.parent_codes}, reports sent ${state.reports_sent}.`,
  ].join(' ');

  const rule =
    'Only reference screens, buttons and click-paths that appear in the journey map above. ' +
    'If asked about anything outside onboarding, answer briefly and steer back to the current step. ' +
    'Never invent UI.';

  return `${persona}\n\n${voice}\n\nONBOARDING JOURNEY MAP:\n${map}\n\n${numbers}\n\n${rule}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const journey = journeyForRole(auth.role);
    if (!journey) return NextResponse.json({ error: 'unavailable' }, { status: 403 });

    const supabase = getSupabase();

    // 1. Flag gate (same as state route).
    const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'onboarding_copilot');
    if (!enabled) return NextResponse.json({ error: 'unavailable' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    let question = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
    if (question.length > 500) question = question.slice(0, 500);
    const locale = typeof body?.locale === 'string' && body.locale ? body.locale : 'en';

    // 2. Budget (never 402 — a hard-limit school gets a coded fallback instead
    //    of an AI answer; the client shows copilot.card.askError).
    const budget = await checkAiBudget(auth.schoolId);
    if (budget.blocked) return NextResponse.json({ error: 'budget' }, { status: 429 });

    if (!anthropic) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

    // 3. Recompute state server-side + derive the journey.
    const role = auth.role as CopilotRole;
    const state = await loadCopilotState(supabase, {
      schoolId: auth.schoolId,
      classroomId: auth.classroomId,
      role,
    });
    const progress = await loadCopilotProgress(supabase, {
      userId: auth.userId,
      role,
      journey,
    });
    const derived = deriveJourney(journey, state, progress.progress_step_keys);
    const systemPrompt = buildAskSystemPrompt(journey, derived, state, locale);

    // 4. Haiku, non-streaming, default temperature, tight token cap.
    const message = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    });

    const answer = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();

    // 5. Meter it (fire-and-forget inside logApiUsage).
    logApiUsage({
      schoolId: auth.schoolId,
      classroomId: auth.classroomId || null,
      teacherId: auth.role === 'principal' ? null : auth.userId,
      endpoint: '/api/montree/onboarding-copilot/ask',
      model: HAIKU_MODEL,
      inputTokens: message.usage?.input_tokens || 0,
      outputTokens: message.usage?.output_tokens || 0,
    });

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('[copilot/ask] error:', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
