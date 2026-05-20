'use client';

// components/montree/appointments/AgoraVideoCall.tsx
//
// Embedded Agora video call. Lives inside Montree's UI — no opening
// external apps, no Jitsi-style "powered by". Native Montree styling
// throughout.
//
// SDK LOADING:
//   We dynamic-import 'agora-rtc-sdk-ng' on the first call open so the
//   ~600KB SDK chunk doesn't ship to any user who never makes a call.
//   Subsequent opens reuse the cached module.
//
// AUTH:
//   We hit POST /api/montree/appointments/[id]/agora-token on mount to
//   get a publish-side token. Token TTL is 1h; we refresh on Agora's
//   `token-privilege-will-expire` event (~30s before expiry).
//
// RECORDING:
//   If recording is enabled for this appointment AND the caller is staff,
//   we surface a "Start recording" button. The recording banner is visible
//   to BOTH participants while it's active. Parents cannot start recording
//   — only join an already-recording call. Recording autostops on call end.
//
// PRIVACY POSTURE (banner copy is load-bearing):
//   - "🔴 This meeting is being recorded for the school's records and to
//      help your next teacher walk in prepared." Always visible during
//      recording, both sides.
//   - "Recording will end when you leave." On staff-side stop button.
//
// MOBILE: tested on iOS Safari + Chrome Android via Agora SDK's built-in
// mobile compatibility layer. Permission flow is browser-native.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Circle,
  Square,
  Loader2,
  AlertCircle,
  Signal,
  Clipboard,
  ClipboardCheck,
} from 'lucide-react';
import { agoraLog, copyAgoraLogs, clearAgoraLogs, getAgoraLogs } from '@/lib/montree/appointments/agora/debug-logger';

// Type aliases for the lazily-imported SDK. We avoid hard import to keep
// the chunk out of the bundle until first use.
type IAgoraRTCClient = {
  join: (appId: string, channel: string, token: string, uid: number) => Promise<void>;
  leave: () => Promise<void>;
  publish: (tracks: unknown[]) => Promise<void>;
  unpublish: (tracks?: unknown[]) => Promise<void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler?: (...args: unknown[]) => void) => void;
  remoteUsers: Array<{
    uid: number | string;
    videoTrack?: { play: (el: HTMLElement) => void; stop: () => void };
    audioTrack?: { play: () => void; stop: () => void };
  }>;
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

type AgoraSDK = {
  default: {
    createClient: (cfg: { mode: 'rtc'; codec: 'vp8' | 'h264' }) => IAgoraRTCClient;
    createMicrophoneAudioTrack: () => Promise<IMicTrack>;
    createCameraVideoTrack: () => Promise<ICamTrack>;
    setArea: (cfg: { areaCode: string | string[]; excludedArea?: string }) => void;
  };
};

// 🚨 Region routing. Default GLOBAL is BLOCKED behind the Great Firewall in
// mainland China — both parent + teacher get stuck on `NETWORK_ERROR:
// Network Error` retrying the unilbs (unified load balancer) handshake.
// Schools serving mainland users must set NEXT_PUBLIC_AGORA_AREA=CHINA at
// build time so the SDK reaches Agora's in-China edge instead. Cross-border
// schools can use OVERSEA or leave unset for GLOBAL. Recognised values:
// GLOBAL | CHINA | NORTH_AMERICA | EUROPE | ASIA | JAPAN | INDIA | OVERSEA.
const AGORA_AREA = process.env.NEXT_PUBLIC_AGORA_AREA || 'GLOBAL';
let agoraAreaApplied = false;

let cachedSdk: AgoraSDK | null = null;
async function loadAgoraSdk(): Promise<AgoraSDK> {
  if (cachedSdk) return cachedSdk;
  const mod = (await import('agora-rtc-sdk-ng')) as unknown as AgoraSDK;
  // setArea is static + applies to ALL subsequent createClient() calls.
  // Idempotent: call once on first SDK load. Wrapped in try/catch because
  // an unknown areaCode throws — better to fall back to default GLOBAL
  // than to dead-end the call entirely.
  if (!agoraAreaApplied && AGORA_AREA && AGORA_AREA !== 'GLOBAL') {
    try {
      mod.default.setArea({ areaCode: AGORA_AREA });
      console.log('[Agora] setArea:', AGORA_AREA);
    } catch (err) {
      console.warn('[Agora] setArea failed, falling back to GLOBAL', err);
    }
    agoraAreaApplied = true;
  }
  cachedSdk = mod;
  return mod;
}

// ── Theme (matches Montree's dark forest tokens) ─────────────────────
const T = {
  bg: '#0a1a0f',
  cardBg: 'rgba(8,20,12,0.85)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  emerald: '#34d399',
  gold: '#E8C96A',
  red: '#fca5a5',
  redSolid: '#ef4444',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export interface AgoraVideoCallProps {
  appointmentId: string;
  /** Role of the local user — controls recording button visibility. */
  callerRole: 'parent' | 'teacher' | 'principal';
  /** Display name of the OTHER party (e.g. parent name for staff, staff name for parent). */
  remoteDisplayName: string;
  /** Whether recording was enabled at booking time. Staff-only recording UI gated on this. */
  recordingEnabledForAppointment: boolean;
  /** When the user closes the call (either by tapping End or programmatically). */
  onClose: () => void;
}

type CallState =
  | { phase: 'loading' }
  | { phase: 'permissions' }
  | { phase: 'joining' }
  | { phase: 'in-call' }
  | { phase: 'error'; message: string };

export default function AgoraVideoCall(props: AgoraVideoCallProps) {
  const [state, setState] = useState<CallState>({ phase: 'loading' });
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [remoteUserPresent, setRemoteUserPresent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  // In-flight guard — prevents double-click race against Agora's billing.
  // Server has its own idempotency check; this is the UX-side belt.
  const [recordingRequestInFlight, setRecordingRequestInFlight] = useState(false);

  // 🚨 Session 120 follow-up — captured token data, surfaced in WaitingTile
  // as a visible diagnostic so two devices can compare channel + uid + role.
  const [diagnostic, setDiagnostic] = useState<{ channel: string; uid: number; role: string } | null>(null);

  // ── Connection quality + reconnect UX state ────────────────────────
  // Quality scale per Agora docs:
  //   0=unknown, 1=excellent, 2=good, 3=poor, 4=bad, 5=very bad, 6=down
  // We collapse to 3 buckets for the UI: good / fair / poor.
  const [netQuality, setNetQuality] = useState<'good' | 'fair' | 'poor' | 'unknown'>('unknown');
  // 'connected' is the happy path. 'reconnecting' surfaces the amber toast.
  // 'just-reconnected' briefly shows a green "Back online" pip then fades.
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'just-reconnected' | 'failed'>('connecting');
  // Debug panel reveal — Cmd+Shift+D (or long-press the network indicator)
  const [debugOpen, setDebugOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicTrack | null>(null);
  const camTrackRef = useRef<ICamTrack | null>(null);
  const localVideoElRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoElRef = useRef<HTMLDivElement | null>(null);
  // 🚨 Session 120 — pending remote video track. When user-published fires
  // for a video track, we subscribe + flip remoteUserPresent=true, but the
  // <VideoTile> div doesn't exist yet (the conditional render hasn't run).
  // Stash the track here; a separate effect picks it up once the div mounts.
  //
  // 1-ON-1 LIMITATION: this single-track ref ONLY handles one remote peer.
  // If 3-party calls are ever needed, convert this to a Map<uid, track>
  // and render one VideoTile per remote user. The current Montree appointment
  // model is parent ↔ staff (2-person), so this is intentional.
  const pendingRemoteVideoRef = useRef<{ uid: number | string; track: { play: (el: HTMLElement) => void } } | null>(null);
  // Tick counter that the deferred-play effect watches. Bumping it triggers
  // a re-check of pendingRemoteVideoRef against the now-mounted div.
  const [remoteVideoTick, setRemoteVideoTick] = useState(0);

  // ── Initialize: get token → load SDK → join → publish ──────────────
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        setState({ phase: 'loading' });

        // 1. Get the join token.
        const tokenRes = await fetch(
          `/api/montree/appointments/${props.appointmentId}/agora-token`,
          {
            method: 'POST',
            credentials: 'same-origin',
          }
        );
        if (!tokenRes.ok) {
          const j = await tokenRes.json().catch(() => ({}));
          if (cancelled) return;
          setState({
            phase: 'error',
            message: j?.error || 'Could not get a video token. The call may not be available yet.',
          });
          return;
        }
        const tokenData = (await tokenRes.json()) as {
          appId: string;
          channel: string;
          uid: number;
          token: string;
          expiresAt: number;
        };

        if (cancelled) return;

        // Capture diagnostic so WaitingTile can render it for side-by-side
        // comparison when peers don't see each other.
        setDiagnostic({
          channel: tokenData.channel,
          uid: tokenData.uid,
          role: props.callerRole,
        });

        // 2. Load SDK + create client.
        setState({ phase: 'permissions' });
        const sdk = await loadAgoraSdk();
        if (cancelled) return;
        const client = sdk.default.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // 3. Set up event handlers BEFORE joining so we don't miss
        //    early user-published events.
        //
        // 🚨 Session 120 architectural rule: subscribe synchronously,
        // then stash the resulting track for the deferred-play effect to
        // pick up once the <VideoTile> div mounts. DO NOT play() inline
        // — `remoteVideoElRef.current` is null on the first user-published
        // because setRemoteUserPresent(true) hasn't triggered the
        // re-render yet that mounts the VideoTile. Playing inline silently
        // no-ops (the video render race that kept Session 119 broken).
        client.on('user-joined', (...args: unknown[]) => {
          const user = args[0] as { uid: number };
          agoraLog('info', 'user-joined', { uid: user.uid });
        });

        client.on('user-published', async (...args: unknown[]) => {
          const user = args[0] as { uid: number; videoTrack?: unknown; audioTrack?: unknown };
          const mediaType = args[1] as 'audio' | 'video';
          agoraLog('info', 'user-published', { uid: user.uid, mediaType });
          try {
            await client.subscribe(user, mediaType);
            agoraLog('info', 'subscribe.success', { uid: user.uid, mediaType });
          } catch (subErr) {
            agoraLog('error', 'subscribe.failed', { uid: user.uid, mediaType, message: (subErr as Error).message });
            return;
          }
          // Flip the flag BEFORE attempting any play — this mounts the
          // remote VideoTile via the conditional render at line ~542.
          setRemoteUserPresent(true);
          if (mediaType === 'video' && user.videoTrack) {
            // Stash the track. The deferred-play effect will attach it to
            // the div on next render. If the div is already mounted from
            // a prior remote (rare), the effect still runs because we
            // bump remoteVideoTick.
            pendingRemoteVideoRef.current = {
              uid: user.uid,
              track: user.videoTrack as { play: (el: HTMLElement) => void },
            };
            setRemoteVideoTick((t) => t + 1);
          }
          if (mediaType === 'audio' && user.audioTrack) {
            // Audio doesn't need a DOM mount — fire-and-forget play() works.
            try {
              (user.audioTrack as { play: () => void }).play();
              agoraLog('info', 'audio.play.success', { uid: user.uid });
            } catch (playErr) {
              agoraLog('error', 'audio.play.failed', { uid: user.uid, message: (playErr as Error).message });
            }
          }
        });

        client.on('user-unpublished', (...args: unknown[]) => {
          const user = args[0] as { uid: number };
          const mediaType = args[1] as 'audio' | 'video';
          agoraLog('info', 'user-unpublished', { uid: user.uid, mediaType });
          // Clear the stashed video pointer if this is the user we were
          // about to play. The remote-present flag stays as long as any
          // remote user is in the channel.
          if (mediaType === 'video' && pendingRemoteVideoRef.current?.uid === user.uid) {
            pendingRemoteVideoRef.current = null;
          }
          if (client.remoteUsers.length === 0) setRemoteUserPresent(false);
        });

        client.on('user-left', (...args: unknown[]) => {
          const user = args[0] as { uid: number };
          agoraLog('info', 'user-left', { uid: user.uid });
          if (pendingRemoteVideoRef.current?.uid === user.uid) {
            pendingRemoteVideoRef.current = null;
          }
          if (client.remoteUsers.length === 0) setRemoteUserPresent(false);
        });

        client.on('token-privilege-will-expire', async () => {
          agoraLog('warn', 'token.will-expire', {});
          // Refresh token before Agora kicks us out.
          try {
            const refreshRes = await fetch(
              `/api/montree/appointments/${props.appointmentId}/agora-token`,
              { method: 'POST', credentials: 'same-origin' }
            );
            if (refreshRes.ok) {
              const fresh = (await refreshRes.json()) as { token: string };
              await client.renewToken(fresh.token);
              agoraLog('info', 'token.renew.success', {});
            } else {
              agoraLog('error', 'token.renew.http-fail', { status: refreshRes.status });
            }
          } catch (err) {
            console.error('[agora] token renew failed', err);
            agoraLog('error', 'token.renew.exception', { message: (err as Error).message });
          }
        });

        // ── Connection state — drives the Reconnecting toast ─────────
        client.on('connection-state-change', (...args: unknown[]) => {
          const curState = args[0] as string;
          const prevState = args[1] as string;
          const reason = args[2] as string | undefined;
          agoraLog('info', 'connection.state', { from: prevState, to: curState, reason });

          if (curState === 'RECONNECTING') {
            setConnStatus('reconnecting');
          } else if (curState === 'CONNECTED') {
            // Only show "Back online" pip if we were JUST reconnecting (not on
            // first-time connect — that's covered by the join splash).
            if (prevState === 'RECONNECTING') {
              setConnStatus('just-reconnected');
              window.setTimeout(() => {
                setConnStatus((s) => (s === 'just-reconnected' ? 'connected' : s));
              }, 2400);
            } else {
              setConnStatus('connected');
            }
          } else if (curState === 'DISCONNECTED' || curState === 'FAILED') {
            setConnStatus('failed');
          } else if (curState === 'CONNECTING') {
            setConnStatus('connecting');
          }
        });

        // ── Network quality — drives the small Signal indicator ──────
        client.on('network-quality', (...args: unknown[]) => {
          const stats = args[0] as { uplinkNetworkQuality: number; downlinkNetworkQuality: number };
          // Worse of the two directions dictates what we show.
          const worst = Math.max(stats.uplinkNetworkQuality, stats.downlinkNetworkQuality);
          let bucket: 'good' | 'fair' | 'poor' | 'unknown';
          if (worst === 0) bucket = 'unknown';
          else if (worst <= 2) bucket = 'good';
          else if (worst <= 4) bucket = 'fair';
          else bucket = 'poor';
          // Only re-render + log on bucket changes — quality events fire
          // every ~2s and would spam the buffer otherwise.
          setNetQuality((prev) => {
            if (prev !== bucket) {
              agoraLog('info', 'network.quality', { bucket, raw: { up: stats.uplinkNetworkQuality, down: stats.downlinkNetworkQuality } });
            }
            return bucket;
          });
        });

        // ── Exception channel — Agora SDK errors that don't trigger
        //    connection-state changes still come through here.
        client.on('exception', (...args: unknown[]) => {
          const evt = args[0] as { code: number; msg: string; uid?: number };
          agoraLog('warn', 'sdk.exception', { code: evt.code, msg: evt.msg, uid: evt.uid });
        });

        // 4. Join + publish.
        setState({ phase: 'joining' });
        agoraLog('info', 'join.start', {
          channel: tokenData.channel,
          uid: tokenData.uid,
          appointmentId: props.appointmentId,
          region: AGORA_AREA,
          appId: tokenData.appId.slice(0, 8) + '…', // truncated for log readability
        });
        await client.join(tokenData.appId, tokenData.channel, tokenData.token, tokenData.uid);
        if (cancelled) return;
        agoraLog('info', 'join.success', {});

        // Request cam + mic. Permissions prompt fires here.
        const [mic, cam] = await Promise.all([
          sdk.default.createMicrophoneAudioTrack(),
          sdk.default.createCameraVideoTrack(),
        ]);
        if (cancelled) {
          mic.close();
          cam.close();
          return;
        }
        micTrackRef.current = mic;
        camTrackRef.current = cam;
        agoraLog('info', 'tracks.created', {});

        if (localVideoElRef.current) {
          cam.play(localVideoElRef.current);
        }
        await client.publish([mic, cam]);
        agoraLog('info', 'publish.success', {});

        if (cancelled) return;
        setState({ phase: 'in-call' });
        setConnStatus('connected');
      } catch (err) {
        if (cancelled) return;
        const msg = (err as Error).message || 'Unknown error';
        agoraLog('error', 'init.failed', { message: msg });
        // Permission denied gets a friendlier message.
        if (/Permission|NotAllowed|denied/i.test(msg)) {
          setState({
            phase: 'error',
            message:
              'Camera or microphone access was denied. Tap the camera icon in your browser address bar to grant access, then refresh.',
          });
        } else {
          setState({
            phase: 'error',
            message: `Could not start the video call: ${msg.slice(0, 200)}`,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentional deps: initRef.current guard makes this effect run once per
    // mount. props.callerRole is captured for the diagnostic block but is
    // expected to be stable for the lifetime of the call (it's derived from
    // auth and doesn't change while the component is mounted).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.appointmentId]);

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      const c = clientRef.current;
      const mic = micTrackRef.current;
      const cam = camTrackRef.current;
      void (async () => {
        try {
          if (mic) {
            mic.close();
          }
          if (cam) {
            cam.stop();
            cam.close();
          }
          if (c) {
            await c.leave();
          }
        } catch (err) {
          console.error('[agora] cleanup error', err);
        }
      })();
    };
  }, []);

  // ── Deferred remote-video play ─────────────────────────────────────
  // 🚨 Session 120 — fixes the render race that was Session 119's killer
  // bug. When user-published fires, the handler subscribes + stashes the
  // video track in pendingRemoteVideoRef and flips remoteUserPresent=true.
  // That flip mounts the <VideoTile> with remoteVideoElRef, but the
  // user-published handler's ref-read is too early — the div isn't there
  // yet. This effect runs AFTER the re-render, when the ref is populated,
  // and attaches the pending track to the now-mounted div.
  useEffect(() => {
    if (!remoteUserPresent) return;
    const div = remoteVideoElRef.current;
    if (!div) return;
    const pending = pendingRemoteVideoRef.current;
    if (!pending) return;
    try {
      pending.track.play(div);
      agoraLog('info', 'remote-video.play.success', { uid: pending.uid });
      pendingRemoteVideoRef.current = null;
    } catch (err) {
      agoraLog('error', 'remote-video.play.failed', { uid: pending.uid, message: (err as Error).message });
    }
  }, [remoteUserPresent, remoteVideoTick]);

  // ── Controls ───────────────────────────────────────────────────────
  const handleMicToggle = useCallback(async () => {
    if (!micTrackRef.current) return;
    const next = !micEnabled;
    await micTrackRef.current.setEnabled(next);
    setMicEnabled(next);
  }, [micEnabled]);

  const handleCamToggle = useCallback(async () => {
    if (!camTrackRef.current) return;
    const next = !camEnabled;
    await camTrackRef.current.setEnabled(next);
    setCamEnabled(next);
  }, [camEnabled]);

  const handleEndCall = useCallback(() => {
    // Cleanup happens in the unmount effect; just signal up.
    props.onClose();
  }, [props]);

  // ── Recording ─────────────────────────────────────────────────────
  const canControlRecording = useMemo(
    () =>
      props.recordingEnabledForAppointment &&
      (props.callerRole === 'teacher' || props.callerRole === 'principal'),
    [props.recordingEnabledForAppointment, props.callerRole]
  );

  const handleStartRecording = useCallback(async () => {
    if (recordingRequestInFlight) return; // guard against double-tap
    setRecordingError(null);
    setRecordingRequestInFlight(true);
    try {
      const res = await fetch(
        `/api/montree/appointments/${props.appointmentId}/recording/start`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consent_acknowledged: true }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setRecordingError(j?.error || 'Failed to start recording.');
        return;
      }
      // Server returns the existing row when already running (idempotent
      // double-click guard). Either way we just flip the local flag.
      setIsRecording(true);
    } catch {
      setRecordingError('Network error starting recording.');
    } finally {
      setRecordingRequestInFlight(false);
    }
  }, [props.appointmentId, recordingRequestInFlight]);

  const handleStopRecording = useCallback(async () => {
    if (recordingRequestInFlight) return;
    setRecordingError(null);
    setRecordingRequestInFlight(true);
    try {
      const res = await fetch(
        `/api/montree/appointments/${props.appointmentId}/recording/stop`,
        { method: 'POST', credentials: 'same-origin' }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setRecordingError(j?.error || 'Failed to stop recording.');
        return;
      }
      setIsRecording(false);
    } catch {
      setRecordingError('Network error stopping recording.');
    } finally {
      setRecordingRequestInFlight(false);
    }
  }, [props.appointmentId, recordingRequestInFlight]);

  // ── Keyboard shortcut for the debug panel: Cmd/Ctrl + Shift + D ────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDebugOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────
  if (state.phase === 'error') {
    return (
      <ErrorPanel message={state.message} onClose={handleEndCall} />
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 9999, display: 'flex', flexDirection: 'column', fontFamily: T.sans }}>
      {/* Top bar */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: T.cardBorder, gap: 12 }}>
        <div style={{ fontFamily: T.serif, fontSize: 17, color: T.textPrimary, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Meeting with <span style={{ color: T.emerald, fontWeight: 600 }}>{props.remoteDisplayName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Network quality pill. Long-press / right-click opens debug panel. */}
          <NetworkPill quality={netQuality} onLongPress={() => setDebugOpen((v) => !v)} />
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.45)', color: T.red, fontSize: 12, fontWeight: 600 }}>
              <Circle size={10} fill={T.redSolid} color={T.redSolid} /> Recording
            </div>
          )}
        </div>
      </div>

      {/* Connection-state toast (top-center, non-blocking). */}
      <ConnectionToast status={connStatus} />

      {/* Consent banner — only visible while recording */}
      {isRecording && (
        <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.10)', borderBottom: '1px solid rgba(239,68,68,0.25)', color: T.red, fontSize: 12, textAlign: 'center' }}>
          🔴 This meeting is being recorded for the school&apos;s records and to help your next teacher walk in prepared.
        </div>
      )}

      {/* Video tiles */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: remoteUserPresent ? '1fr 1fr' : '1fr', gap: 8, padding: 16, minHeight: 0 }}>
        <VideoTile
          label="You"
          mountRef={localVideoElRef}
          showPlaceholder={!camEnabled}
        />
        {remoteUserPresent ? (
          <VideoTile
            label={props.remoteDisplayName}
            mountRef={remoteVideoElRef}
            showPlaceholder={false}
          />
        ) : (
          <WaitingTile remoteDisplayName={props.remoteDisplayName} state={state} diagnostic={diagnostic} />
        )}
      </div>

      {/* Bottom control bar */}
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, borderTop: T.cardBorder }}>
        <ControlButton
          icon={micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          label={micEnabled ? 'Mute' : 'Unmute'}
          onClick={handleMicToggle}
          danger={!micEnabled}
        />
        <ControlButton
          icon={camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          label={camEnabled ? 'Stop video' : 'Start video'}
          onClick={handleCamToggle}
          danger={!camEnabled}
        />
        {canControlRecording && (
          isRecording ? (
            <ControlButton
              icon={<Square size={20} fill={T.redSolid} />}
              label={recordingRequestInFlight ? 'Stopping…' : 'Stop recording'}
              onClick={handleStopRecording}
              danger
              disabled={recordingRequestInFlight}
            />
          ) : (
            <ControlButton
              icon={<Circle size={20} color={T.gold} />}
              label={recordingRequestInFlight ? 'Starting…' : 'Record'}
              onClick={handleStartRecording}
              accent
              disabled={recordingRequestInFlight}
            />
          )
        )}
        <ControlButton
          icon={<PhoneOff size={20} />}
          label="Leave"
          onClick={handleEndCall}
          end
        />
      </div>

      {/* Debug panel — toggled via Cmd/Ctrl+Shift+D or long-press the network pill */}
      {debugOpen && (
        <DebugPanel
          appointmentId={props.appointmentId}
          netQuality={netQuality}
          connStatus={connStatus}
          copyState={copyState}
          onCopy={async () => {
            const ok = await copyAgoraLogs();
            if (ok) {
              setCopyState('copied');
              window.setTimeout(() => setCopyState('idle'), 1500);
            }
          }}
          onClear={() => clearAgoraLogs()}
          onClose={() => setDebugOpen(false)}
        />
      )}

      {recordingError && (
        <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.12)', color: T.red, fontSize: 12, textAlign: 'center', borderTop: '1px solid rgba(239,68,68,0.25)' }}>
          {recordingError}
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────

function VideoTile({ label, mountRef, showPlaceholder }: { label: string; mountRef: React.RefObject<HTMLDivElement | null>; showPlaceholder: boolean }) {
  return (
    <div style={{ position: 'relative', background: '#000', borderRadius: 14, overflow: 'hidden', border: T.cardBorder }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      {showPlaceholder && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSecondary, fontSize: 13 }}>
          <VideoOff size={36} strokeWidth={1.5} />
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 8, left: 12, padding: '4px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.55)', color: T.textPrimary, fontSize: 12, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function WaitingTile({
  remoteDisplayName,
  state,
  diagnostic,
}: {
  remoteDisplayName: string;
  state: CallState;
  diagnostic?: { channel: string; uid: number; role: string } | null;
}) {
  let message = `Waiting for ${remoteDisplayName} to join…`;
  if (state.phase === 'loading') message = 'Connecting…';
  else if (state.phase === 'permissions') message = 'Loading video…';
  else if (state.phase === 'joining') message = 'Joining the room…';
  return (
    <div style={{ background: T.cardBg, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: T.textSecondary, fontSize: 14, border: T.cardBorder, padding: 16 }}>
      <Loader2 size={28} strokeWidth={1.75} style={{ animation: 'spin 1.4s linear infinite', color: T.emerald }} />
      <div>{message}</div>
      {/* 🚨 Session 120 follow-up — visible call diagnostic so we can compare
          two devices side-by-side. Channel name + role + UID + region.
          If two devices show DIFFERENT channels, they're in different rooms
          (different appointment_ids). If two devices show DIFFERENT regions,
          they're on disconnected Agora edges (CN vs Global). Either way the
          user can spot the mismatch in one glance. */}
      {diagnostic && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            background: 'rgba(0,0,0,0.30)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 8,
            fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
            fontSize: 10,
            color: T.textMuted,
            lineHeight: 1.6,
            textAlign: 'left',
            minWidth: 240,
          }}
        >
          <div>channel: <span style={{ color: T.emerald }}>…{diagnostic.channel.slice(-12)}</span></div>
          <div>role: <span style={{ color: T.emerald }}>{diagnostic.role}</span></div>
          <div>uid: <span style={{ color: T.emerald }}>{diagnostic.uid}</span></div>
          <div>region: <span style={{ color: T.emerald }}>{AGORA_AREA}</span></div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ControlButton({ icon, label, onClick, danger, accent, end, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; accent?: boolean; end?: boolean; disabled?: boolean }) {
  const bg = end
    ? 'rgba(239,68,68,0.85)'
    : danger
      ? 'rgba(239,68,68,0.18)'
      : accent
        ? 'rgba(232,201,106,0.18)'
        : 'rgba(255,255,255,0.10)';
  const fg = end ? '#fff' : danger ? T.red : accent ? T.gold : T.textPrimary;
  const border = end
    ? 'none'
    : danger
      ? '1px solid rgba(239,68,68,0.45)'
      : accent
        ? '1px solid rgba(232,201,106,0.45)'
        : '1px solid rgba(255,255,255,0.18)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 14px',
        borderRadius: 12,
        background: bg,
        border,
        color: fg,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        fontFamily: T.sans,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ErrorPanel({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: T.sans }}>
      <div style={{ maxWidth: 420, background: T.cardBg, border: T.cardBorder, borderRadius: 14, padding: 24, textAlign: 'center' }}>
        <AlertCircle size={36} color={T.red} strokeWidth={1.5} style={{ marginBottom: 12 }} />
        <div style={{ fontFamily: T.serif, fontSize: 18, color: T.textPrimary, marginBottom: 10 }}>
          Can&apos;t start the call
        </div>
        <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.55, marginBottom: 20 }}>
          {message}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: '10px 20px', borderRadius: 10, background: T.emerald, color: '#0a1a0f', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── NetworkPill ──────────────────────────────────────────────────────
// Small Signal icon + tooltip. Three buckets: good (emerald), fair (gold),
// poor (red). Long-press (mobile) or right-click (desktop) opens the
// debug panel — useful in the field when something feels off.
function NetworkPill({ quality, onLongPress }: { quality: 'good' | 'fair' | 'poor' | 'unknown'; onLongPress: () => void }) {
  const color =
    quality === 'good' ? T.emerald :
    quality === 'fair' ? T.gold :
    quality === 'poor' ? T.red :
    'rgba(255,255,255,0.45)';
  const label =
    quality === 'good' ? 'Strong connection' :
    quality === 'fair' ? 'Connection a bit slow' :
    quality === 'poor' ? 'Connection unstable' :
    'Checking connection…';

  const pressTimer = useRef<number | null>(null);
  const start = () => {
    pressTimer.current = window.setTimeout(() => onLongPress(), 600);
  };
  const cancel = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  return (
    <div
      title={label + ' (long-press for debug)'}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        color,
        fontSize: 11,
        fontWeight: 600,
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      <Signal size={12} strokeWidth={2} />
      <span style={{ textTransform: 'capitalize' }}>
        {quality === 'unknown' ? '—' : quality}
      </span>
    </div>
  );
}

// ── ConnectionToast ──────────────────────────────────────────────────
// Top-center floating banner that shows during RECONNECTING and briefly
// after recovery. Non-blocking. Auto-hides on connected steady state.
function ConnectionToast({ status }: { status: 'connecting' | 'connected' | 'reconnecting' | 'just-reconnected' | 'failed' }) {
  if (status === 'connecting' || status === 'connected') return null;

  const palette =
    status === 'reconnecting' ? { bg: 'rgba(232,201,106,0.18)', border: 'rgba(232,201,106,0.55)', fg: '#E8C96A', text: 'Reconnecting…' } :
    status === 'just-reconnected' ? { bg: 'rgba(52,211,153,0.18)', border: 'rgba(52,211,153,0.55)', fg: '#34d399', text: 'Back online' } :
    { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.55)', fg: '#fca5a5', text: 'Connection lost' };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 70px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        padding: '8px 16px',
        borderRadius: 999,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.fg,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: T.sans,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {status === 'reconnecting' && <Loader2 size={14} style={{ animation: 'spin 1.4s linear infinite' }} />}
      {palette.text}
    </div>
  );
}

// ── DebugPanel ───────────────────────────────────────────────────────
// Slide-up overlay listing the last 500 logged Agora events. Copy-as-JSON
// button so the user can paste the timeline straight back to me when
// debugging future calls.
function DebugPanel({
  appointmentId,
  netQuality,
  connStatus,
  copyState,
  onCopy,
  onClear,
  onClose,
}: {
  appointmentId: string;
  netQuality: 'good' | 'fair' | 'poor' | 'unknown';
  connStatus: 'connecting' | 'connected' | 'reconnecting' | 'just-reconnected' | 'failed';
  copyState: 'idle' | 'copied';
  onCopy: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16, fontFamily: T.sans }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
      />
      <div style={{ position: 'relative', maxWidth: 680, width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column', background: T.cardBg, border: T.cardBorder, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: T.cardBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontFamily: T.serif, fontSize: 15, color: T.textPrimary }}>
            Call debug — <span style={{ color: T.textSecondary, fontFamily: T.sans, fontSize: 11 }}>appt {appointmentId.slice(0, 8)}…</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onCopy}
              style={{ padding: '6px 12px', borderRadius: 8, background: copyState === 'copied' ? 'rgba(52,211,153,0.20)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: copyState === 'copied' ? T.emerald : T.textPrimary, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              aria-label="Copy debug log"
            >
              {copyState === 'copied' ? <ClipboardCheck size={14} /> : <Clipboard size={14} />}
              {copyState === 'copied' ? 'Copied' : 'Copy log'}
            </button>
            <button
              type="button"
              onClick={onClear}
              style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
        <div style={{ padding: '8px 16px', display: 'flex', gap: 12, fontSize: 11, color: T.textSecondary, borderBottom: T.cardBorder, flexWrap: 'wrap' }}>
          <div>Conn: <span style={{ color: T.textPrimary, fontWeight: 600 }}>{connStatus}</span></div>
          <div>Quality: <span style={{ color: T.textPrimary, fontWeight: 600 }}>{netQuality}</span></div>
          <div>Region: <span style={{ color: T.textPrimary, fontWeight: 600 }}>{AGORA_AREA}</span></div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 12, fontFamily: 'ui-monospace, SF Mono, Menlo, monospace', fontSize: 11, lineHeight: 1.55, color: T.textSecondary }}>
          <DebugLogList />
        </div>
      </div>
    </div>
  );
}

function DebugLogList() {
  // Re-read on every render — cheap, the buffer is in-memory and capped at 500.
  // We also rebuild on a 1s tick so the user sees live events while open.
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const entries = getAgoraLogs();
  if (entries.length === 0) {
    return <div style={{ color: T.textSecondary, fontStyle: 'italic' }}>No events yet — join a call to populate.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {entries.slice().reverse().map((e, i) => {
        const color = e.level === 'error' ? '#fca5a5' : e.level === 'warn' ? '#fbbf24' : T.textSecondary;
        const time = new Date(e.ts).toISOString().slice(11, 23);
        return (
          <div key={i} style={{ color }}>
            <span style={{ opacity: 0.55 }}>{time}</span>{' '}
            <span style={{ color: T.textPrimary, fontWeight: 600 }}>{e.event}</span>
            {e.data && Object.keys(e.data).length > 0 && (
              <span> {JSON.stringify(e.data)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
