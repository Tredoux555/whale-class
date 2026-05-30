// app/api/montree/admin/voice/token/route.ts
//
// Mint the principal's publish-side join token for their private Astra voice
// channel. The client uses this to join the Agora RTC channel; the agent is
// started separately via ../agent (POST).
//
// Gated by the `voice_astra` feature flag (OFF by default) and isAgoraConfigured.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features';
import { isAgoraConfigured } from '@/lib/montree/appointments/agora/config';
import { mintPrincipalVoiceToken } from '@/lib/montree/voice-agent/session';

export const maxDuration = 15;

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

  if (!isAgoraConfigured()) {
    return NextResponse.json(
      { enabled: true, error: 'Voice is not configured on this server yet.' },
      { status: 503 }
    );
  }

  const tok = mintPrincipalVoiceToken(auth.schoolId, auth.userId);
  if (!tok) {
    return NextResponse.json(
      { enabled: true, error: 'Could not mint a voice token.' },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      enabled: true,
      appId: tok.appId,
      channel: tok.channel,
      uid: tok.uid,
      token: tok.token,
      expiresAt: tok.expiresAt,
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
