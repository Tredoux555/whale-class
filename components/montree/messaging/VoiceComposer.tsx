// components/montree/messaging/VoiceComposer.tsx
// Voice-note recorder for messaging thread composers.
//
// Flow:
//   1. User taps mic → record via MediaRecorder
//   2. User taps stop → upload audio to /api/montree/messages/upload-voice
//   3. Transcribe via /api/montree/voice-notes/transcribe (Whisper)
//   4. Call onReady({ audioUrl, transcript, durationSeconds, filename })
//
// The parent component then POSTs the message with body=transcript,
// media_url=audioUrl, media_type='audio'. Principal sees it via the
// existing observer rule — no extra wiring.
//
// Used by:
//   app/montree/parent/messages/[threadId]/page.tsx
//   app/montree/admin/communication/threads/[threadId]/page.tsx
//   app/montree/dashboard/messages/[threadId]/page.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, X } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

export interface VoiceReady {
  audioUrl: string;          // proxy URL stored in media_url
  transcript: string;         // Whisper text → stored in body
  durationSeconds: number;
  filename: string;
}

interface Props {
  /** Called after upload + transcribe finish. Parent then POSTs the message. */
  onReady: (data: VoiceReady) => void;
  /** Disable the mic while a send is in flight. */
  disabled?: boolean;
  /** Optional: hex emerald accent color (defaults match dark forest theme). */
  accent?: string;
}

type Stage = 'idle' | 'recording' | 'processing' | 'error';

export default function VoiceComposer({ onReady, disabled, accent = '#34d399' }: Props) {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount: stop any active stream/recorder/timer.
      if (timerRef.current) window.clearInterval(timerRef.current);
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      // Prefer webm/opus where supported (Chrome, Edge, Android); Safari emits mp4.
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => handleStopped(mr.mimeType || 'audio/webm');
      mr.start();
      setStage('recording');
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error('[VoiceComposer] mic permission denied', err);
      setError(t('msg.micDenied'));
      setStage('error');
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
  }

  function cancelRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setStage('idle');
    setSeconds(0);
  }

  async function handleStopped(mimeType: string) {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const audioBlob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];

    // Sanity check — < 0.5s of audio is almost certainly an accidental tap.
    if (audioBlob.size < 5_000) {
      setStage('idle');
      setSeconds(0);
      return;
    }

    setStage('processing');

    try {
      // 1. Upload to private voice-obs bucket
      const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
      const filename = `voice-${Date.now()}.${ext}`;
      const uploadForm = new FormData();
      uploadForm.append('audio', audioBlob, filename);
      const upRes = await fetch('/api/montree/messages/upload-voice', {
        method: 'POST',
        credentials: 'include',
        body: uploadForm,
      });
      if (!upRes.ok) {
        const errData = await upRes.json().catch(() => ({}));
        throw new Error(errData?.error || `Upload failed (${upRes.status})`);
      }
      const upData = await upRes.json();

      // 2. Transcribe via Whisper (audio bytes sent again; cheaper than
      //    re-fetching from storage on the server)
      const transcribeForm = new FormData();
      transcribeForm.append('audio', audioBlob, filename);
      const txRes = await fetch('/api/montree/voice-notes/transcribe', {
        method: 'POST',
        credentials: 'include',
        body: transcribeForm,
      });
      let transcript = '';
      let durationSeconds = seconds;
      if (txRes.ok) {
        const txData = await txRes.json();
        transcript = (txData?.transcript || '').trim();
        if (txData?.duration_seconds) durationSeconds = txData.duration_seconds;
      } else {
        // Transcription failure shouldn't block sending — send with a
        // placeholder transcript so the parent/principal can still listen.
        console.warn('[VoiceComposer] transcription failed, sending without text');
        transcript = t('msg.transcriptUnavailable');
      }

      onReady({
        audioUrl: upData.url,
        transcript: transcript || t('msg.voiceMessage'),
        durationSeconds,
        filename,
      });

      setStage('idle');
      setSeconds(0);
    } catch (err) {
      console.error('[VoiceComposer] process failed', err);
      setError(err instanceof Error ? err.message : t('msg.couldNotSendVoice'));
      setStage('error');
    }
  }

  // ---- Render ----

  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');

  if (stage === 'idle' || stage === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          title={t('msg.recordVoiceNote')}
          aria-label={t('msg.recordVoiceNote')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(52,211,153,0.10)',
            border: '1px solid rgba(52,211,153,0.35)',
            color: accent,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.4 : 1,
            flexShrink: 0,
          }}
        >
          <Mic size={18} />
        </button>
        {stage === 'error' && error && (
          <span style={{ fontSize: 12, color: '#fda4af' }}>{error}</span>
        )}
      </div>
    );
  }

  if (stage === 'recording') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={stopRecording}
          title={t('msg.stopAndSend')}
          aria-label={t('msg.stopRecording')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ef4444',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            flexShrink: 0,
            animation: 'voicepulse 1.4s ease-in-out infinite',
          }}
        >
          <Square size={16} fill="#fff" />
        </button>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums', minWidth: 42 }}>
          {mins}:{secs}
        </span>
        <button
          type="button"
          onClick={cancelRecording}
          title={t('common.cancel')}
          aria-label={t('msg.cancelRecording')}
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
        <style jsx>{`
          @keyframes voicepulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
            50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
          }
        `}</style>
      </div>
    );
  }

  // processing
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
      <Loader2 size={18} className="animate-spin" />
      <span>{t('msg.transcribing')}</span>
    </div>
  );
}
