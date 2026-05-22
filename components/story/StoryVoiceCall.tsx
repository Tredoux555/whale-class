'use client';

// components/story/StoryVoiceCall.tsx
//
// Voice-only Agora call for the Story system. Admin (Tredoux) <-> one Story
// user. Deliberately voice-only: no camera, no video tiles, no recording.
//
// Why a fresh component instead of reusing Montree's AgoraVideoCall:
//   - Story has no Montree i18n provider — AgoraVideoCall calls useI18n().
//   - Story calls are voice-only, which sidesteps Montree's whole video
//     render-race machinery (architectural rule #211) — remote audio plays
//     with no DOM mount, so the hard part simply doesn't exist here.
//   - Recording is Montree-appointment-coupled and unwanted for Story.
// The genuinely hard, security-sensitive part — the Agora project, token
// minting, UID derivation — IS reused, server-side, via /api/story/agora-token.
//
// SDK is dynamic-imported on mount so the ~600KB chunk never ships to
// users who don't make calls.

import { useCallback, useEffect, useRef, useState } from 'react';

interface StoryVoiceCallProps {
  callId: string;
  as: 'admin' | 'user';
  authToken: string; // Bearer token sent to /api/story/agora-token
  onClose: () => void;
}

type Phase = 'connecting' | 'ringing' | 'in-call' | 'ended' | 'error';

// Minimal shapes for the lazily-imported SDK — avoids a hard import.
type IAgoraRTCClient = {
  join: (appId: string, channel: string, token: string, uid: number) => Promise<void>;
  leave: () => Promise<void>;
  publish: (tracks: unknown[]) => Promise<void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  remoteUsers: Array<{ uid: number | string }>;
  subscribe: (user: unknown, mediaType: 'audio' | 'video') => Promise<void>;
  renewToken: (token: string) => Promise<void>;
};
type IMicTrack = {
  setEnabled: (b: boolean) => Promise<void>;
  close: () => void;
};

interface TokenData {
  appId: string;
  channel: string;
  uid: number;
  token: string;
  expiresAt: number;
  remoteName: string;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function StoryVoiceCall({ callId, as, authToken, onClose }: StoryVoiceCallProps) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [remoteName, setRemoteName] = useState('');
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicTrack | null>(null);
  const initRef = useRef(false);
  const endedRef = useRef(false);
  const leaveTimerRef = useRef<number | null>(null);

  // ── Fetch a fresh token. Used for the initial join AND token renewal. ──
  const fetchToken = useCallback(async (): Promise<TokenData | null> => {
    const res = await fetch(`/api/story/agora-token?as=${encodeURIComponent(as)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      credentials: 'same-origin',
      body: JSON.stringify({ callId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || `Could not get a call token (${res.status}).`);
    }
    return (await res.json()) as TokenData;
  }, [as, authToken, callId]);

  // ── Tell the server the call is over. Branches by role. ────────────────
  const reportEnded = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      if (as === 'admin') {
        await fetch('/api/story/admin/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ callId, action: 'end' }),
        });
      } else {
        await fetch('/api/story/current-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ callId }),
        });
      }
    } catch {
      // Non-fatal — the call still tears down locally.
    }
  }, [as, authToken, callId]);

  // ── Hang up: report ended, leave the channel, close the surface. ───────
  const hangUp = useCallback(async () => {
    setPhase('ended');
    await reportEnded();
    try {
      micTrackRef.current?.close();
    } catch { /* ignore */ }
    try {
      await clientRef.current?.leave();
    } catch { /* ignore */ }
    onClose();
  }, [reportEnded, onClose]);

  // ── Initialise: token -> SDK -> join -> publish mic. Runs once. ────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const tokenData = await fetchToken();
        if (cancelled || !tokenData) return;
        setRemoteName(tokenData.remoteName || (as === 'admin' ? 'Student' : 'Tredoux'));

        const mod = await import('agora-rtc-sdk-ng');
        if (cancelled) return;
        const AgoraRTC = mod.default as unknown as {
          createClient: (cfg: { mode: 'rtc'; codec: 'vp8' }) => IAgoraRTCClient;
          createMicrophoneAudioTrack: () => Promise<IMicTrack & { play?: () => void }>;
        };

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // Handlers BEFORE join so no early event is missed.
        client.on('user-joined', () => {
          if (cancelled) return;
          setPhase('in-call');
        });

        client.on('user-published', async (...args: unknown[]) => {
          const user = args[0] as { audioTrack?: { play: () => void } };
          const mediaType = args[1] as 'audio' | 'video';
          if (mediaType !== 'audio') return; // voice-only — ignore any video
          try {
            await client.subscribe(user, 'audio');
            user.audioTrack?.play();
            if (!cancelled) setPhase('in-call');
          } catch {
            /* subscribe failure is non-fatal — the other side may retry */
          }
        });

        client.on('user-left', () => {
          if (cancelled) return;
          // The other person hung up. End cleanly. Timer id is kept so the
          // unmount cleanup can cancel it — otherwise hangUp() could fire
          // after the component is gone (double onClose / stale setState).
          setPhase('ended');
          leaveTimerRef.current = window.setTimeout(() => {
            void hangUp();
          }, 1600);
        });

        client.on('token-privilege-will-expire', async () => {
          try {
            const fresh = await fetchToken();
            if (fresh) await client.renewToken(fresh.token);
          } catch {
            /* renewal failure surfaces later as a disconnect */
          }
        });

        // Join the channel.
        await client.join(tokenData.appId, tokenData.channel, tokenData.token, tokenData.uid);
        if (cancelled) return;

        // Publish the microphone.
        const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
        if (cancelled) {
          micTrack.close();
          return;
        }
        micTrackRef.current = micTrack;
        await client.publish([micTrack]);
        if (cancelled) return;

        // If the other side is already here, we're in-call; else ringing.
        setPhase(client.remoteUsers.length > 0 ? 'in-call' : 'ringing');
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Could not start the call.');
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
      if (leaveTimerRef.current !== null) {
        window.clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      try {
        micTrackRef.current?.close();
      } catch { /* ignore */ }
      try {
        void clientRef.current?.leave();
      } catch { /* ignore */ }
    };
    // Mount-once effect (guarded by initRef). It deliberately has empty
    // deps: fetchToken/hangUp close over stable props (callId/as/authToken)
    // and the first-render onClose. Re-running on a callback identity
    // change would tear the live call down via the cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Call duration timer — runs while in-call. ──────────────────────────
  useEffect(() => {
    if (phase !== 'in-call') return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // ── Mute toggle. ───────────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    const track = micTrackRef.current;
    if (!track) return;
    const next = !muted;
    try {
      await track.setEnabled(!next);
      setMuted(next);
    } catch {
      /* ignore — mute just won't toggle */
    }
  }, [muted]);

  const initial = (remoteName || '?').charAt(0).toUpperCase();

  const statusLine =
    phase === 'connecting' ? 'Connecting…'
    : phase === 'ringing' ? (as === 'admin' ? `Calling ${remoteName}…` : 'Connecting…')
    : phase === 'in-call' ? formatDuration(seconds)
    : phase === 'ended' ? 'Call ended'
    : 'Call problem';

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-slate-900 text-white"
         style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Identity + status */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 text-5xl font-bold shadow-2xl">
          {initial}
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold">{remoteName || 'Voice call'}</p>
          <p className="mt-1 text-sm text-slate-300">{statusLine}</p>
        </div>
        {phase === 'ringing' && (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full bg-slate-400"
                style={{ animation: `svc-pulse 1.2s ${i * 0.2}s infinite ease-in-out` }}
              />
            ))}
          </div>
        )}
        {phase === 'error' && (
          <p className="max-w-xs text-center text-sm text-rose-300">{errorMsg}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex w-full items-center justify-center gap-8 pb-12">
        {phase === 'error' || phase === 'ended' ? (
          <button
            onClick={onClose}
            className="rounded-full bg-slate-700 px-8 py-3 font-semibold transition-colors hover:bg-slate-600"
          >
            Close
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition-colors ${
                muted ? 'bg-white text-slate-900' : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              {muted ? '🔇' : '🎙️'}
            </button>
            <button
              onClick={hangUp}
              aria-label="Hang up"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-2xl transition-colors hover:bg-rose-700"
            >
              📞
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes svc-pulse {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1); }
      }`}</style>
    </div>
  );
}
