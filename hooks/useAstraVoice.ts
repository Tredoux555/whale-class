'use client';

// hooks/useAstraVoice.ts
//
// Client hook for a hands-free Astra VOICE session. Mirrors the SDK lifecycle
// of components/montree/appointments/AgoraVideoCall.tsx but audio-only:
//   1. POST /api/montree/admin/voice/token   → principal join token
//   2. dynamic-import agora-rtc-sdk-ng, join the channel, publish the mic
//   3. POST /api/montree/admin/voice/agent   → drop the Astra agent in
//   4. play the agent's TTS audio as it speaks
// stop() reverses it (DELETE the agent, close mic, leave).
//
// The whole thing is inert when the `voice_astra` flag is off — the token
// route returns { enabled:false } and the hook lands in 'disabled'.

import { useCallback, useEffect, useRef, useState } from 'react';

export type AstraVoiceStatus =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'stopping'
  | 'disabled'
  | 'error';

export interface UseAstraVoiceOptions {
  locale?: string; // BCP-47, defaults to the browser language
  principalName?: string;
  schoolName?: string;
}

// Minimal structural types for the lazily-imported SDK (avoid bundling types).
type MicTrack = { setEnabled: (b: boolean) => Promise<void>; close: () => void };
type RemoteUser = {
  audioTrack?: { play: () => void; stop: () => void };
};
type RtcClient = {
  join: (appId: string, channel: string, token: string, uid: number) => Promise<void>;
  leave: () => Promise<void>;
  publish: (tracks: unknown[]) => Promise<void>;
  subscribe: (user: unknown, mediaType: 'audio' | 'video') => Promise<void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};
type AgoraModule = {
  createClient: (cfg: { mode: string; codec: string }) => RtcClient;
  createMicrophoneAudioTrack: () => Promise<MicTrack>;
};

export function useAstraVoice(opts: UseAstraVoiceOptions = {}) {
  const [status, setStatus] = useState<AstraVoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<RtcClient | null>(null);
  const micRef = useRef<MicTrack | null>(null);
  const agentIdRef = useRef<string | null>(null);

  const stop = useCallback(async () => {
    setStatus((s) => (s === 'idle' ? s : 'stopping'));
    // Stop the server-side agent first so it stops talking.
    if (agentIdRef.current) {
      try {
        await fetch(
          `/api/montree/admin/voice/agent?agentId=${encodeURIComponent(agentIdRef.current)}`,
          { method: 'DELETE' }
        );
      } catch {
        /* best-effort */
      }
      agentIdRef.current = null;
    }
    try {
      micRef.current?.close();
    } catch {
      /* ignore */
    }
    micRef.current = null;
    try {
      await clientRef.current?.leave();
    } catch {
      /* ignore */
    }
    clientRef.current = null;
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus('connecting');
    try {
      // 1. Token (also the feature-flag gate).
      const tokenResp = await fetch('/api/montree/admin/voice/token', {
        method: 'POST',
      });
      const tokenData = (await tokenResp.json()) as {
        enabled?: boolean;
        appId?: string;
        channel?: string;
        uid?: number;
        token?: string;
        error?: string;
      };
      if (tokenData.enabled === false) {
        setStatus('disabled');
        return;
      }
      if (!tokenResp.ok || !tokenData.appId || !tokenData.token || !tokenData.channel) {
        throw new Error(tokenData.error || 'Could not start voice (token).');
      }

      // 2. Join + publish mic.
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default as unknown as AgoraModule;
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', (...args: unknown[]) => {
        const user = args[0] as RemoteUser;
        const mediaType = args[1] as 'audio' | 'video';
        void client.subscribe(user, mediaType).then(() => {
          if (mediaType === 'audio') user.audioTrack?.play();
        });
      });

      await client.join(
        tokenData.appId,
        tokenData.channel,
        tokenData.token,
        tokenData.uid ?? 0
      );

      const mic = await AgoraRTC.createMicrophoneAudioTrack();
      micRef.current = mic;
      await client.publish([mic]);

      // 3. Start the Astra agent in the channel.
      const agentResp = await fetch('/api/montree/admin/voice/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: opts.locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US'),
          principalName: opts.principalName,
          schoolName: opts.schoolName,
        }),
      });
      const agentData = (await agentResp.json()) as {
        enabled?: boolean;
        agentId?: string;
        error?: string;
      };
      if (agentData.enabled === false) {
        await stop();
        setStatus('disabled');
        return;
      }
      if (!agentResp.ok || !agentData.agentId) {
        throw new Error(agentData.error || 'Could not start the Astra agent.');
      }
      agentIdRef.current = agentData.agentId;
      setStatus('live');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Voice failed to start.');
      setStatus('error');
      await stop();
    }
  }, [opts.locale, opts.principalName, opts.schoolName, stop]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { status, error, start, stop };
}
