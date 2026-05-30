'use client';

// components/story/StoryVoiceCall.tsx
//
// Story call surface — VOICE or VIDEO. The mode comes from the story_calls
// row (returned by /api/story/agora-token); the admin picks it when placing
// the call. Voice mode publishes only the mic; video mode also publishes the
// camera and renders local + remote video tiles.
//
// Why a fresh component instead of reusing Montree's AgoraVideoCall:
//   - Story has no Montree i18n provider — AgoraVideoCall calls useI18n().
//   - Recording is Montree-appointment-coupled and unwanted for Story.
// The hard, security-sensitive part — the Agora project, token minting, UID
// derivation — IS reused, server-side, via /api/story/agora-token.
//
// Remote-video render race (Montree architectural rule #211): when
// `user-published` fires for a video track the remote tile div isn't mounted
// yet. We stash the track and a `videoTick` bump; a separate effect plays it
// once the div exists.
//
// SDK is dynamic-imported on mount so the ~600KB chunk never ships to users
// who don't make calls.

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
type ICamTrack = {
  setEnabled: (b: boolean) => Promise<void>;
  play: (el: HTMLElement) => void;
  stop: () => void;
  close: () => void;
};
type IRemoteVideoTrack = { play: (el: HTMLElement) => void; stop: () => void };

interface TokenData {
  appId: string;
  channel: string;
  uid: number;
  token: string;
  expiresAt: number;
  mode: 'voice' | 'video';
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
  const [isVideo, setIsVideo] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [remotePresent, setRemotePresent] = useState(false);
  const [videoTick, setVideoTick] = useState(0);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicTrack | null>(null);
  const camTrackRef = useRef<ICamTrack | null>(null);
  const localVideoElRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoElRef = useRef<HTMLDivElement | null>(null);
  const pendingRemoteTrackRef = useRef<IRemoteVideoTrack | null>(null);
  const localPlayedRef = useRef(false);
  const initRef = useRef(false);
  const endedRef = useRef(false);
  const leaveTimerRef = useRef<number | null>(null);

  // ── Fetch a fresh token. Used for the initial join AND token renewal. ──
  const fetchToken = useCallback(async (): Promise<TokenData | null> => {
    // authToken may be empty for a user who arrived via a push notification
    // (fresh window, no sessionStorage). credentials:'same-origin' carries
    // the story-auth cookie, which the server accepts as the fallback.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(`/api/story/agora-token?as=${encodeURIComponent(as)}`, {
      method: 'POST',
      headers,
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      if (as === 'admin') {
        await fetch('/api/story/admin/call', {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          body: JSON.stringify({ callId, action: 'end' }),
        });
      } else {
        await fetch('/api/story/current-call', {
          method: 'POST',
          headers,
          credentials: 'same-origin',
          body: JSON.stringify({ callId }),
        });
      }
    } catch {
      // Non-fatal — the call still tears down locally.
    }
  }, [as, authToken, callId]);

  // ── Hang up: report ended, stop tracks, leave the channel, close. ──────
  const hangUp = useCallback(async () => {
    setPhase('ended');
    await reportEnded();
    try { micTrackRef.current?.close(); } catch { /* ignore */ }
    try { camTrackRef.current?.close(); } catch { /* ignore */ }
    try { await clientRef.current?.leave(); } catch { /* ignore */ }
    onClose();
  }, [reportEnded, onClose]);

  // ── Initialise: token -> SDK -> join -> publish. Runs once. ────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const tokenData = await fetchToken();
        if (cancelled || !tokenData) return;
        const videoMode = tokenData.mode === 'video';
        setIsVideo(videoMode);
        // Belt-and-braces: the in-call name is ALWAYS a facade. Anything that
        // isn't already 'J'/'P' is coerced to the role-based facade so a real
        // identity can never surface, even from a stale/edge-case payload.
        const rn = tokenData.remoteName;
        setRemoteName(rn === 'J' || rn === 'P' ? rn : as === 'admin' ? 'P' : 'J');

        const mod = await import('agora-rtc-sdk-ng');
        if (cancelled) return;
        const AgoraRTC = mod.default as unknown as {
          createClient: (cfg: { mode: 'rtc'; codec: 'vp8' }) => IAgoraRTCClient;
          createMicrophoneAudioTrack: () => Promise<IMicTrack>;
          createCameraVideoTrack: () => Promise<ICamTrack>;
        };

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // Handlers BEFORE join so no early event is missed.
        client.on('user-joined', () => {
          if (cancelled) return;
          setRemotePresent(true);
          setPhase('in-call');
        });

        client.on('user-published', async (...args: unknown[]) => {
          const user = args[0] as {
            audioTrack?: { play: () => void };
            videoTrack?: IRemoteVideoTrack;
          };
          const mediaType = args[1] as 'audio' | 'video';
          try {
            await client.subscribe(user, mediaType);
          } catch {
            return; // subscribe failure is non-fatal — the peer may retry
          }
          if (mediaType === 'audio') {
            // Audio needs no DOM mount — fire-and-forget play() works.
            try { user.audioTrack?.play(); } catch { /* autoplay edge */ }
          } else if (mediaType === 'video' && user.videoTrack) {
            // Stash — the remote tile div may not be mounted yet (race fix).
            pendingRemoteTrackRef.current = user.videoTrack;
            setVideoTick((t) => t + 1);
          }
          if (!cancelled) {
            setRemotePresent(true);
            setPhase('in-call');
          }
        });

        client.on('user-left', () => {
          if (cancelled) return;
          // The other person hung up. End cleanly. Timer id is kept so the
          // unmount cleanup can cancel it — otherwise hangUp() could fire
          // after the component is gone.
          setRemotePresent(false);
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

        // Publish the microphone first — audio works even if the camera fails.
        const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
        if (cancelled) { micTrack.close(); return; }
        micTrackRef.current = micTrack;
        await client.publish([micTrack]);
        if (cancelled) return;

        // Video mode — also publish the camera. Best-effort: a denied or
        // missing camera degrades the call to audio rather than failing it.
        if (videoMode) {
          try {
            const camTrack = await AgoraRTC.createCameraVideoTrack();
            if (cancelled) { camTrack.close(); return; }
            camTrackRef.current = camTrack;
            await client.publish([camTrack]);
            setVideoTick((t) => t + 1); // trigger local self-view play
          } catch (camErr) {
            console.warn('[story-call] camera unavailable — audio only:', camErr);
            setCameraOff(true);
          }
        }
        if (cancelled) return;

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
      try { micTrackRef.current?.close(); } catch { /* ignore */ }
      try { camTrackRef.current?.close(); } catch { /* ignore */ }
      try { void clientRef.current?.leave(); } catch { /* ignore */ }
    };
    // Mount-once effect (guarded by initRef). Deliberately empty deps:
    // fetchToken/hangUp close over stable props. Re-running on a callback
    // identity change would tear the live call down via the cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Play video tracks once their tile divs are mounted (race fix). ─────
  useEffect(() => {
    if (camTrackRef.current && localVideoElRef.current && !localPlayedRef.current) {
      try {
        camTrackRef.current.play(localVideoElRef.current);
        localPlayedRef.current = true;
      } catch { /* ignore */ }
    }
    if (pendingRemoteTrackRef.current && remoteVideoElRef.current) {
      try {
        pendingRemoteTrackRef.current.play(remoteVideoElRef.current);
      } catch { /* ignore */ }
      pendingRemoteTrackRef.current = null;
    }
  }, [isVideo, remotePresent, videoTick]);

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
    } catch { /* ignore — mute just won't toggle */ }
  }, [muted]);

  // ── Camera toggle (video mode). ────────────────────────────────────────
  const toggleCamera = useCallback(async () => {
    const track = camTrackRef.current;
    if (!track) return;
    const next = !cameraOff;
    try {
      await track.setEnabled(!next);
      setCameraOff(next);
    } catch { /* ignore */ }
  }, [cameraOff]);

  const initial = (remoteName || '?').charAt(0).toUpperCase();
  const statusLine =
    phase === 'connecting' ? 'Connecting…'
    : phase === 'ringing' ? (as === 'admin' ? `Calling ${remoteName}…` : 'Connecting…')
    : phase === 'in-call' ? formatDuration(seconds)
    : phase === 'ended' ? 'Call ended'
    : 'Call problem';

  // Shared control buttons (mute, camera in video mode, hang up).
  const controlButtons = (
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
      {isVideo && (
        <button
          onClick={toggleCamera}
          aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition-colors ${
            cameraOff ? 'bg-white text-slate-900' : 'bg-slate-700 text-white hover:bg-slate-600'
          }`}
        >
          {cameraOff ? '📷' : '📹'}
        </button>
      )}
      <button
        onClick={hangUp}
        aria-label="Hang up"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-2xl transition-colors hover:bg-rose-700"
      >
        📞
      </button>
    </>
  );

  const safeArea = {
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  };

  // ── Error / ended / connecting — shared centered layout. ───────────────
  if (phase === 'error' || phase === 'ended' || phase === 'connecting') {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-slate-900 px-6 text-white"
        style={safeArea}
      >
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 text-4xl font-bold shadow-2xl">
          {initial}
        </div>
        <p className="text-xl font-semibold">{remoteName || 'Story call'}</p>
        <p className="text-sm text-slate-300">{statusLine}</p>
        {phase === 'error' && errorMsg && (
          <p className="max-w-xs text-center text-sm text-rose-300">{errorMsg}</p>
        )}
        {(phase === 'error' || phase === 'ended') && (
          <button
            onClick={onClose}
            className="mt-2 rounded-full bg-slate-700 px-8 py-3 font-semibold transition-colors hover:bg-slate-600"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  // ── Video layout (ringing / in-call). ──────────────────────────────────
  if (isVideo) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 text-white" style={safeArea}>
        {/* Remote video, or a waiting placeholder */}
        {remotePresent ? (
          <div ref={remoteVideoElRef} className="absolute inset-0 bg-black" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 text-4xl font-bold shadow-2xl">
              {initial}
            </div>
            <p className="text-xl font-semibold">{remoteName}</p>
            <p className="text-sm text-slate-300">{statusLine}</p>
          </div>
        )}

        {/* Local self-view (picture-in-picture) */}
        <div className="absolute right-4 top-4 h-40 w-28 overflow-hidden rounded-xl border border-white/20 bg-slate-800 shadow-lg">
          <div ref={localVideoElRef} className="h-full w-full" />
          {cameraOff && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
              Camera off
            </div>
          )}
        </div>

        {/* Name + timer pill when connected */}
        {remotePresent && (
          <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1.5 text-sm font-medium">
            {remoteName} · {statusLine}
          </div>
        )}

        {/* Controls */}
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-center gap-6 pb-12"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 3rem)' }}
        >
          {controlButtons}
        </div>
      </div>
    );
  }

  // ── Voice layout (ringing / in-call). ──────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-slate-900 text-white"
      style={safeArea}
    >
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
      </div>

      <div className="flex w-full items-center justify-center gap-8 pb-12">
        {controlButtons}
      </div>

      <style>{`@keyframes svc-pulse {
        0%, 100% { opacity: 0.3; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1); }
      }`}</style>
    </div>
  );
}
