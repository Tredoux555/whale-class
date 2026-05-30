// app/api/montree/admin/voice/agent/route.ts
//
// Start (POST) / stop (DELETE) the Astra voice agent in the principal's
// channel via Agora's Conversational AI Engine.
//
// POST body (all optional — names are cosmetic for the spoken prompt; the
// session is always derived from the authenticated principal):
//   { locale?: 'en-US', principalName?: string, schoolName?: string }
//
// SECURITY
//   principal-only, school-scoped (channel derived from auth.schoolId+userId).
//   Gated by `voice_astra`. Agora customer keys live server-side only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features';
import {
  voiceChannelForPrincipal,
  mintPrincipalVoiceToken,
  mintAgentVoiceToken,
} from '@/lib/montree/voice-agent/session';
import { startVoiceAgent, stopVoiceAgent } from '@/lib/montree/voice-agent/agent';
import {
  buildAstraVoicePrompt,
  buildAstraVoiceGreeting,
} from '@/lib/montree/voice-agent/astra-voice-prompt';

export const maxDuration = 30;

const LOCALE_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/;

function cleanName(val: unknown, fallback: string): string {
  const s = String(val ?? '').trim().slice(0, 80);
  return s || fallback;
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only the principal can use Astra voice.' },
      { status: 403 }
    );
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'voice_astra');
  if (!enabled) {
    return NextResponse.json({ enabled: false });
  }

  let body: {
    locale?: unknown;
    principalName?: unknown;
    schoolName?: unknown;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // empty body is fine — defaults apply
  }

  const rawLocale = String(body.locale ?? '').trim();
  const language = LOCALE_RE.test(rawLocale) ? rawLocale : 'en-US';
  const principalName = cleanName(body.principalName, 'Principal');
  const schoolName = cleanName(body.schoolName, 'your school');

  const channel = voiceChannelForPrincipal(auth.schoolId, auth.userId);
  const agentTok = mintAgentVoiceToken(auth.schoolId, auth.userId);
  const principalTok = mintPrincipalVoiceToken(auth.schoolId, auth.userId);
  if (!agentTok || !principalTok) {
    return NextResponse.json(
      { enabled: true, error: 'Voice is not configured on this server yet.' },
      { status: 503 }
    );
  }

  const systemPrompt = buildAstraVoicePrompt({
    principalName,
    schoolName,
    language,
  });
  const greeting = buildAstraVoiceGreeting(principalName);

  let result;
  try {
    result = await startVoiceAgent({
      channel,
      agentUid: agentTok.uid,
      agentToken: agentTok.token,
      principalUid: principalTok.uid,
      systemPrompt,
      greeting,
      language,
      // Enables the tool-capable shim when VOICE_LLM_SHARED_SECRET is set.
      publicOrigin: new URL(request.url).origin,
      schoolId: auth.schoolId,
      principalId: auth.userId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        enabled: true,
        error: err instanceof Error ? err.message : 'voice agent start failed',
      },
      { status: 502 }
    );
  }

  if (!result) {
    return NextResponse.json(
      { enabled: true, error: 'Voice provider keys are not configured.' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    enabled: true,
    agentId: result.agentId,
    status: result.status,
    channel,
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only the principal can use Astra voice.' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const agentId = (url.searchParams.get('agentId') || '').trim();
  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }

  const ok = await stopVoiceAgent(agentId);
  return NextResponse.json({ stopped: ok });
}
