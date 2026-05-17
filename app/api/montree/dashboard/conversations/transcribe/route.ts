// app/api/montree/dashboard/conversations/transcribe/route.ts
//
// Teacher-side audio → transcript + summary. Mirror of the principal vault
// transcribe route (app/api/montree/admin/conversations/transcribe), but
// scoped to teachers and producing plaintext that the client posts to
// /api/montree/dashboard/conversations to save.
//
// PRIVACY POSTURE — identical to the principal vault:
//   - Audio is streamed to OpenAI Whisper. By default OpenAI retains audio
//     up to 30 days for abuse monitoring. The consent banner in the UI
//     tells the teacher to inform the parent.
//   - Audio bytes never touch our DB or storage. They flow request →
//     Whisper → response → discarded.
//   - Transcript flows to Sonnet for the summary. Anthropic API terms:
//     30-day retention, no training.
//   - The plaintext returned here is what the client persists. Unlike the
//     principal vault, teacher meeting notes are NOT encrypted — same
//     trust model as montree_teacher_notes (visible to the teacher and,
//     via the existing principal observer pattern, the school's principals).
//
// AUTH: teacher-only. Tier-gated — vault transcription requires an active
// AI tier (Sonnet for the summary).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';

export const maxDuration = 120; // Whisper + Sonnet on a 30-min meeting.

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Whisper hard limit.

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher-only route.' }, { status: 403 });
  }

  if (!anthropic) {
    return NextResponse.json({ error: 'AI compose unavailable.' }, { status: 503 });
  }

  const supabase = getSupabase();
  const aiTier = await resolveReportModel(supabase, auth.schoolId);
  if (aiTier.tier === 'free') {
    return NextResponse.json(
      {
        error: 'Meeting note transcription requires an active AI tier.',
        tier: aiTier.tier,
        requires_upgrade: true,
        upgrade_url: '/montree/admin/billing',
        feature: 'meeting_notes_transcribe',
      },
      { status: 402 }
    );
  }

  let transcript = '';
  let locale = 'en';
  let childName: string | null = null;
  let durationSeconds: number | null = null;

  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const audio = form.get('audio') as Blob | null;
      const dur = form.get('duration_seconds');
      if (typeof dur === 'string') {
        const n = parseInt(dur, 10);
        if (Number.isFinite(n) && n >= 0) durationSeconds = n;
      }
      const localeRaw = form.get('locale');
      if (typeof localeRaw === 'string') locale = localeRaw;
      const cn = form.get('child_name');
      if (typeof cn === 'string') childName = cn.trim() || null;

      if (!audio) {
        return NextResponse.json({ error: 'audio file required' }, { status: 400 });
      }
      if (audio.size < 100) {
        return NextResponse.json({ error: 'Audio too short.' }, { status: 400 });
      }
      if (audio.size > MAX_AUDIO_BYTES) {
        return NextResponse.json(
          {
            error: `Audio too large (max ${Math.floor(MAX_AUDIO_BYTES / 1024 / 1024)}MB). Try splitting the recording.`,
          },
          { status: 413 }
        );
      }
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'Transcription service not configured.' },
          { status: 503 }
        );
      }

      const whisperForm = new FormData();
      const audioBuf = await audio.arrayBuffer();
      whisperForm.append(
        'file',
        new Blob([audioBuf], { type: audio.type || 'audio/webm' }),
        'recording.webm'
      );
      whisperForm.append('model', 'whisper-1');
      whisperForm.append('response_format', 'verbose_json');

      const wctrl = new AbortController();
      const wt = setTimeout(() => wctrl.abort(), 90_000);
      try {
        const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: whisperForm,
          signal: wctrl.signal,
        });
        clearTimeout(wt);
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          console.error('[meeting-notes/transcribe] Whisper error', r.status, txt);
          return NextResponse.json(
            { error: 'Transcription failed.' },
            { status: 502 }
          );
        }
        const data = await r.json();
        transcript = (data.text || '').trim();
        if (typeof data.duration === 'number' && durationSeconds === null) {
          durationSeconds = Math.round(data.duration);
        }
      } catch (err) {
        clearTimeout(wt);
        const msg = err instanceof Error ? err.message : 'Whisper failed';
        console.error('[meeting-notes/transcribe] whisper exception', msg);
        return NextResponse.json({ error: 'Transcription failed.' }, { status: 502 });
      }
    } else if (contentType.includes('application/json')) {
      const body = (await request.json()) as {
        transcript?: string;
        locale?: string;
        child_name?: string;
        duration_seconds?: number;
      };
      transcript = (body.transcript || '').trim();
      if (typeof body.locale === 'string') locale = body.locale;
      if (typeof body.child_name === 'string')
        childName = body.child_name.trim() || null;
      if (typeof body.duration_seconds === 'number')
        durationSeconds = Math.round(body.duration_seconds);
    } else {
      return NextResponse.json(
        {
          error:
            'Send multipart/form-data with audio OR application/json with transcript.',
        },
        { status: 400 }
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'parse error';
    console.error('[meeting-notes/transcribe] body parse', msg);
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!transcript) {
    return NextResponse.json(
      { error: 'No transcript produced — recording may be silent.' },
      { status: 422 }
    );
  }

  const cappedTranscript = transcript.slice(0, 30_000);

  // Summary — teacher-voice prompt. Slightly different framing from the
  // principal vault: a Montessori teacher referring back to a parent
  // meeting, with action items the teacher will own.
  let summary = '';
  try {
    const sysPrompt = `You are summarising a conversation between a Montessori classroom teacher and a parent. The teacher will refer back to this summary later. Keep it factual, neutral, and short.

Output exactly 3 short paragraphs separated by blank lines, in this order:
1. WHAT WAS DISCUSSED — the topics that came up, who raised them. 2-3 sentences.
2. WHAT WAS AGREED OR DECIDED — concrete outcomes, commitments by either side, follow-ups. 2-3 sentences. If nothing was agreed, say so plainly.
3. THINGS FOR THE TEACHER TO FOLLOW UP ON — open questions, things to check on, observations to share back, next steps. 2-3 sentences.

Voice: third-person, neutral, no advocacy. No medical, legal, or psychological diagnoses. No invented detail — only what's in the transcript.

Output the summary in the teacher's language (locale: ${locale}). No headings, no bullets, no preamble. Three paragraphs of plain prose, separated by blank lines.${childName ? ` This conversation was about a child named ${childName}.` : ''}`;

    const userPrompt = `TRANSCRIPT (raw — speakers may not be labeled):

${cappedTranscript}`;

    const resp = await anthropic.messages.create(
      {
        model: AI_MODEL,
        max_tokens: 700,
        system: sysPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      },
      { timeout: 60_000 }
    );
    const block = resp.content.find((b) => b.type === 'text');
    if (block && block.type === 'text') {
      summary = block.text.trim();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'summary failed';
    console.error('[meeting-notes/transcribe] summary error', msg);
    summary = '';
  }

  return NextResponse.json({
    transcript,
    summary,
    duration_seconds: durationSeconds,
    locale,
    child_name: childName,
  });
}
