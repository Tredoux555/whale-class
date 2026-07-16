// app/api/montree/onboarding-copilot/ask-public/route.ts
//
// POST — anonymous Haiku Q&A for the first-touch funnel (/try, /login-select,
// pre-auth). No auth: a visitor hasn't got a session yet. This is the most
// fragile funnel moment, so it must never 402 / 500 — every failure path
// returns a warm generic answer, HTTP 200.
//
// Guards (contract §2):
//   - IP rate limit 6 / 15min (reuses the demo-request limiter, fail-open).
//   - question ≤ 400 chars.
//   - honeypot field `website` — if filled, a bot; return the generic answer,
//     never call the model.
//   - HAIKU_MODEL, max_tokens 300, default temperature.
//   - Grounding = STATIC English funnel map (never invent UI; answer in the
//     user's language; ≤100 words; warm).
//   - No DB reads. No logApiUsage (schoolId is non-nullable in the helper's
//     type + there is no school yet) — token counts go to console instead.
//
// Middleware note: /api/montree/* is NOT gated by middleware's legacy /api
// allow-list, so this route is publicly reachable without a middleware edit
// (verified — landmine §7). The rate limit + tiny max_tokens are the cost wall.
//
// Contract: docs/handoffs/PLAN_FUNNEL_CEREMONY_JUL16.md §2.

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import { anthropic, HAIKU_MODEL } from '@/lib/ai/anthropic';

// A warm, safe fallback whenever we can't (or won't) call the model. Kept short.
const GENERIC_ANSWER =
  'Setting up takes a couple of minutes: name your school, save the login key it gives you, open your classrooms, then hand each teacher their 6-letter key so they can log in from their phones. Pick the gold “Principal” door to begin.';

// Static English map of the funnel — what each screen asks for and the key
// facts. Server-only; Haiku answers in the visitor's language per the voice
// rules. This is the wall that keeps the model from inventing screens/buttons.
const FUNNEL_MAP = `THE MONTREE SETUP FUNNEL (what each screen is):
1. Welcome / choose your door: three cards — Teacher, Principal/School Owner (the gold one), Parent. Setting up a school and inviting teachers = Principal. A teacher joining an existing school just needs the 6-letter key their principal gives them — they don't sign up here.
2. Name your school: your name, the school (or classroom) name, and an OPTIONAL email. The email is only used to recover the login key if it's ever lost. Nothing here is shown to parents; all of it can be changed later.
3. Founding (a short ceremony): Montree creates the school and stocks every classroom's shelves with the full Montessori curriculum automatically. About ten seconds.
4. Your key: a permanent 6-letter login code shown once. Save it somewhere safe; if lost, administration (or the recovery email) can restore access. This code is how you log in at montree.xyz.
5. Open your classrooms: name the rooms you run; each arrives with its shelves already stocked. You can add more later.
6. Add your teachers: one or more per classroom. Each teacher gets their own 6-letter key.
7. The handoff: copy each teacher their key (group chat is easiest) — they open montree.xyz on their phone and enter it to log in. Montree is made for the teacher's pocket.

KEY FACTS: the login code is a permanent login, not a one-time code. Email is optional and only for recovery. It's best to set the school up from a computer; teachers join from their phones. Classrooms come pre-stocked with curriculum. Teachers each receive a 6-letter key.`;

function buildSystem(screen: string): string {
  const persona =
    'You are Astra, the calm, warm front-office guide for Montree, a Montessori classroom platform. You are helping a brand-new visitor set up.';
  const voice =
    'Voice: warm, plain, at most 100 words, one thing at a time, no bullet-spam, no exclamation marks except genuine warmth. Answer in the same language the visitor writes in.';
  const rule =
    'Only reference screens, buttons and steps that appear in the funnel map above. If asked about something outside setup, answer briefly and gently steer back. Never invent UI or features.';
  const where =
    screen && screen.trim()
      ? `\n\nThe visitor is currently on the "${screen}" step of the funnel.`
      : '';
  return `${persona}\n\n${voice}\n\n${FUNNEL_MAP}${where}\n\n${rule}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();

    // 1. Rate limit (fail-open — a rate-limit-table outage must not block the
    //    funnel; the tiny max_tokens cap is the real cost wall).
    const ip = getClientIP(req.headers);
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      ip,
      '/api/montree/onboarding-copilot/ask-public',
      6,
      15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a moment.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));

    // 2. Honeypot — a hidden field real users never fill. If a bot filled it,
    //    return the generic answer without spending a model call.
    if (typeof body?.website === 'string' && body.website.trim()) {
      return NextResponse.json({ answer: GENERIC_ANSWER });
    }

    let question = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
    if (question.length > 400) question = question.slice(0, 400);
    const screen = typeof body?.screen === 'string' ? body.screen.slice(0, 40) : '';

    // 3. No key configured → graceful generic answer, never a 5xx.
    if (!anthropic) return NextResponse.json({ answer: GENERIC_ANSWER });

    const message = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 300,
      system: buildSystem(screen),
      messages: [{ role: 'user', content: question }],
    });

    const answer =
      message.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('')
        .trim() || GENERIC_ANSWER;

    // 4. No school yet → logApiUsage requires a schoolId; log token counts to
    //    the console instead of crashing (contract §2).
    try {
      console.log('[copilot-ask-public]', {
        in: message.usage?.input_tokens || 0,
        out: message.usage?.output_tokens || 0,
      });
    } catch {
      /* logging must never break the response */
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error('[copilot/ask-public] error:', err);
    // Even on an unexpected failure the visitor gets a helpful answer, not a 500.
    return NextResponse.json({ answer: GENERIC_ANSWER });
  }
}
