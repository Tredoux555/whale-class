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
} from 'lucide-react';

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
  };
};

let cachedSdk: AgoraSDK | null = null;
async function loadAgoraSdk(): Promise<AgoraSDK> {
  if (cachedSdk) return cachedSdk;
  const mod = (await import('agora-rtc-sdk-ng')) as unknown as AgoraSDK;
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

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicTrack | null>(null);
  const camTrackRef = useRef<ICamTrack | null>(null);
  const localVideoElRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoElRef = useRef<HTMLDivElement | null>(null);

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

        // 2. Load SDK + create client.
        setState({ phase: 'permissions' });
        const sdk = await loadAgoraSdk();
        if (cancelled) return;
        const client = sdk.default.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // 3. Set up event handlers BEFORE joining so we don't miss
        //    early user-published events.
        client.on('user-published', async (...args: unknown[]) => {
          const user = args[0] as { uid: number; videoTrack?: unknown; audioTrack?: unknown };
          const mediaType = args[1] as 'audio' | 'video';
          await client.subscribe(user, mediaType);
          setRemoteUserPresent(true);
          if (mediaType === 'video' && user.videoTrack && remoteVideoElRef.current) {
            (user.videoTrack as { play: (el: HTMLElement) => void }).play(remoteVideoElRef.current);
          }
          if (mediaType === 'audio' && user.audioTrack) {
            (user.audioTrack as { play: () => void }).play();
          }
        });

        client.on('user-unpublished', () => {
          if (client.remoteUsers.length === 0) setRemoteUserPresent(false);
        });

        client.on('user-left', () => {
          if (client.remoteUsers.length === 0) setRemoteUserPresent(false);
        });

        client.on('token-privilege-will-expire', async () => {
          // Refresh token before Agora kicks us out.
          try {
            const refreshRes = await fetch(
              `/api/montree/appointments/${props.appointmentId}/agora-token`,
              { method: 'POST', credentials: 'same-origin' }
            );
            if (refreshRes.ok) {
              const fresh = (await refreshRes.json()) as { token: string };
              await client.renewToken(fresh.token);
            }
          } catch (err) {
            console.error('[agora] token renew failed', err);
          }
        });

        // 4. Join + publish.
        setState({ phase: 'joining' });
        await client.join(tokenData.appId, tokenData.channel, tokenData.token, tokenData.uid);
        if (cancelled) return;

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

        if (localVideoElRef.current) {
          cam.play(localVideoElRef.current);
        }
        await client.publish([mic, cam]);

        if (cancelled) return;
        setState({ phase: 'in-call' });
      } catch (err) {
        if (cancelled) return;
        const msg = (err as Error).message || 'Unknown error';
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

  // ── Render ─────────────────────────────────────────────────────────
  if (state.phase === 'error') {
    return (
      <ErrorPanel message={state.message} onClose={handleEndCall} />
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, zIndex: 9999, display: 'flex', flexDirection: 'column', fontFamily: T.sans }}>
      {/* Top bar */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: T.cardBorder }}>
        <div style={{ fontFamily: T.serif, fontSize: 17, color: T.textPrimary }}>
          Meeting with <span style={{ color: T.emerald, fontWeight: 600 }}>{props.remoteDisplayName}</span>
        </div>
        {isRecording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.45)', color: T.red, fontSize: 12, fontWeight: 600 }}>
            <Circle size={10} fill={T.redSolid} color={T.redSolid} /> Recording
          </div>
        )}
      </div>

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
          <WaitingTile remoteDisplayName={props.remoteDisplayName} state={state} />
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

function WaitingTile({ remoteDisplayName, state }: { remoteDisplayName: string; state: CallState }) {
  let message = `Waiting for ${remoteDisplayName} to join…`;
  if (state.phase === 'loading') message = 'Connecting…';
  else if (state.phase === 'permissions') message = 'Loading video…';
  else if (state.phase === 'joining') message = 'Joining the room…';
  return (
    <div style={{ background: T.cardBg, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: T.textSecondary, fontSize: 14, border: T.cardBorder }}>
      <Loader2 size={28} strokeWidth={1.75} style={{ animation: 'spin 1.4s linear infinite', color: T.emerald }} />
      {message}
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
