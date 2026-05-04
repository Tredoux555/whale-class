// app/api/montree/admin/conversations/transcribe/route.ts
//
// Audio in → transcript + 3-paragraph summary out. The route does NOT save
// anything — the client receives the plaintext, encrypts it client-side
// using the principal's vault password (which never leaves the browser),
// then POSTs the ciphertext to /save.
//
// PRIVACY POSTURE:
//   - Audio is streamed to OpenAI Whisper for transcription. By default
//     OpenAI retains audio up to 30 days for abuse monitoring. For Whale
//     Class prototype that's acceptable (Tredoux is the only user and the
//     parent has been told about the recording per the consent banner).
//     For broader rollout we'd want a zero-retention agreement OR
//     self-hosted Whisper.
//   - Audio bytes never touch our DB or storage. They flow request →
//     Whisper → response → discarded.
//   - Transcript flows to Sonnet for the summary. Anthropic's enterprise
//     terms for Claude API specify 30-day retention with no training use.
//     Same posture as the rest of the app's Sonnet calls.
//   - The plaintext returned from this route is the only copy outside
//     the browser. Once the client encrypts and saves it, we have only
//     ciphertext on the server.
//
// AUTH: principal-only, plus Tredoux-userId hard gate. The
// PRINCIPAL_VAULT_ENABLED_FOR set is the prototype kill switch.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';

export const maxDuration = 120; // Whisper + Sonnet on a 30-min meeting.

// Hard prototype gate. Move to a feature flag table when widening rollout.
const PRINCIPAL_VAULT_ENABLED_FOR = new Set<string>([
  '16eec1c0-bfb5-4edf-a160-059bb41803fb', // Tredoux on Whale Class
]);

// Whisper hard limit is 25MB. We keep the same — covers ~60-90 min of voice
// at typical compressed bitrates. Reject anything above that with a clean
// error so the client can advise splitting the recording.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

// The route accepts EITHER multipart/form-data (audio=Blob, optional
// locale, child_name, duration_seconds) OR application/json (transcript,
// locale?, child_name?, duration_seconds?). Branch on Content-Type below.

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }
  if (!PRINCIPAL_VAULT_ENABLED_FOR.has(auth.userId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!anthropic) {
    return NextResponse.json({ error: 'AI compose unavailable.' }, { status: 503 });
  }

  // Tier gate (vault uses Sonnet for the summary — same posture as the
  // principal-agent route).
  const supabase = getSupabase();
  const aiTier = await resolveReportModel(supabase, auth.schoolId);
  if (aiTier.tier === 'free') {
    return NextResponse.json(
      { error: 'Vault transcription requires an active AI tier.' },
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

      // Whisper call
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
          console.error('[conversations/transcribe] Whisper error', r.status, txt);
          return NextResponse.json(
            { error: 'Transcription failed.' },
            { status: 502 }
          );
        }
        const data = await r.json();
        transcript = (data.text || '').trim();
        if (typeof data.language === 'string') {
          // Whisper returns full language names ("english", "chinese") — we
          // store our own locale param (en/zh/etc) on the metadata for the
          // summary prompt; whisper's language is informational.
        }
        if (typeof data.duration === 'number' && durationSeconds === null) {
          durationSeconds = Math.round(data.duration);
        }
      } catch (err) {
        clearTimeout(wt);
        const msg = err instanceof Error ? err.message : 'Whisper failed';
        console.error('[conversations/transcribe] whisper exception', msg);
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
        { error: 'Send multipart/form-data with audio OR application/json with transcript.' },
        { status: 400 }
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'parse error';
    console.error('[conversations/transcribe] body parse', msg);
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!transcript) {
    return NextResponse.json(
      { error: 'No transcript produced — recording may be silent.' },
      { status: 422 }
    );
  }

  // Cap transcript size before sending to Sonnet — keep token costs sane.
  // 30k chars ≈ ~7-8k tokens. Plenty for a 30-min meeting.
  const cappedTranscript = transcript.slice(0, 30_000);

  // Summarise via Sonnet. The summary is in the principal's locale.
  let summary = '';
  try {
    const sysPrompt = `You are summarising a conversation between a Montessori school principal and a parent. The principal will refer back to this summary later. Keep it factual, neutral, and short.

Output exactly 3 short paragraphs separated by blank lines, in this order:
1. WHAT WAS DISCUSSED — the topics that came up, who raised them. 2-3 sentences.
2. WHAT WAS AGREED OR DECIDED — concrete outcomes, commitments, follow-ups by name. 2-3 sentences. If nothing was agreed, say so plainly.
3. THINGS TO WATCH OR FOLLOW UP ON — open questions, things to check on, next steps. 2-3 sentences.

Voice: third-person, neutral, no advocacy ("the parent expressed concern about..." not "I think the parent was right that..."). No medical, legal, or psychological diagnoses. No invented detail — only what's in the transcript.

Output the summary in the principal's language (locale: ${locale}). No headings, no bullets, no preamble. Three paragraphs of plain prose, separated by blank lines.${childName ? ` This conversation was about a child named ${childName}.` : ''}`;

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
    console.error('[conversations/transcribe] summary error', msg);
    // Don't fail the whole call — return the transcript with an empty summary
    // so the principal can still save the recording. The frontend explains.
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
