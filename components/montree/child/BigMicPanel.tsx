'use client';

// components/montree/child/BigMicPanel.tsx
// The big microphone. That's it.
// Sits above the shelf on the child's page. Swipe down for the shelf.
// Talk to it like a living-room smart speaker — it controls everything:
// observations, shelf changes, game plan, progress updates.
// Auto-links observations to photos taken in the last 90s.
// Dark forest visual treatment — all wiring intact

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2, Sprout, Send } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

interface Props {
  childId: string;
  childName: string;
  onAction?: () => void;
}

type Stage = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'done' | 'error';

const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.20)',
  cardRadius: 22,
  blur: 'blur(20px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.45)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: 'rgba(52,211,153,0.20)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function BigMicPanel({ childId, childName, onAction }: Props) {
  const { locale, t } = useI18n();
  const [stage, setStage] = useState<Stage>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [typedText, setTypedText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoClearRef.current) clearTimeout(autoClearRef.current);
      if (onActionTimerRef.current) clearTimeout(onActionTimerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const sendToGuru = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setStage('thinking');
    setResponse('');
    setError('');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let hadAction = false;
    let acc = '';

    try {
      const res = await fetch(`/api/montree/children/${childId}/guru`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history: [], locale }),
        signal: controller.signal,
        credentials: 'include',
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text' && data.content) {
              acc += data.content;
              setResponse(acc);
            } else if (data.type === 'action' && data.success) {
              hadAction = true;
            } else if (data.type === 'error') {
              setError(data.message || 'Something went wrong');
            }
          } catch { /* skip */ }
        }
      }

      setStage('done');
      if (hadAction && onAction) {
        if (onActionTimerRef.current) clearTimeout(onActionTimerRef.current);
        onActionTimerRef.current = setTimeout(() => onAction(), 300);
      }

      if (autoClearRef.current) clearTimeout(autoClearRef.current);
      autoClearRef.current = setTimeout(() => {
        setStage('idle');
        setResponse('');
        autoClearRef.current = null;
      }, 8000);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[BigMicPanel] Send error:', err);
      setError(t('bigMic.connectionError'));
      setStage('error');
    }
  }, [childId, locale, onAction, t]);

  const startRecording = useCallback(async () => {
    if (autoClearRef.current) {
      clearTimeout(autoClearRef.current);
      autoClearRef.current = null;
    }
    setError('');
    setResponse('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t('bigMic.micNotAvailable'));
        setStage('error');
        return;
      }

      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Mic timeout')), 10_000)
        ),
      ]);
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (chunks.length === 0) { setStage('idle'); return; }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) { setStage('idle'); return; }

        setStage('transcribing');
        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          const res = await montreeApi('/api/montree/guru/transcribe', {
            method: 'POST',
            body: formData,
            timeout: 15000,
          });
          if (res.ok) {
            const data = await res.json();
            const transcript = (data.text || data.transcript || '').trim();
            if (transcript) {
              await sendToGuru(transcript);
            } else {
              setStage('idle');
            }
          } else {
            setError(t('bigMic.transcriptionFailed'));
            setStage('error');
          }
        } catch (err) {
          console.error('[BigMicPanel] Transcription error:', err);
          setError(t('bigMic.transcriptionFailed'));
          setStage('error');
        }
      };

      recorder.start(1000);
      setStage('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('[BigMicPanel] Mic error:', err);
      setError(t('bigMic.micAccessDenied'));
      setStage('error');
    }
  }, [sendToGuru, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
  }, []);

  const handleMicTap = () => {
    if (stage === 'recording') stopRecording();
    else if (stage === 'idle' || stage === 'done' || stage === 'error') startRecording();
  };

  const handleTypedSubmit = async () => {
    const text = typedText.trim();
    if (!text) return;
    setTypedText('');
    setShowTyping(false);
    await sendToGuru(text);
  };

  const statusText = (() => {
    switch (stage) {
      case 'recording': return `${t('bigMic.listening')}... ${formatTime(recordingTime)}`;
      case 'transcribing': return t('bigMic.transcribing');
      case 'thinking': return t('bigMic.thinking');
      case 'error': return error;
      default: return t('bigMic.tapToStart');
    }
  })();

  const title = t('bigMic.title', { name: childName });
  const subtitle = t('bigMic.subtitle');

  const micBusy = stage === 'transcribing' || stage === 'thinking';
  const micActive = stage === 'recording';

  // Mic button visual state
  let micBg: string;
  let micBorder: string;
  let micColor: string;
  let micShadow: string;
  if (micActive) {
    micBg = T.redSoft;
    micBorder = T.redBorder;
    micColor = T.red;
    micShadow = '0 8px 24px rgba(239,68,68,0.40)';
  } else if (micBusy) {
    micBg = 'rgba(255,255,255,0.08)';
    micBorder = 'rgba(255,255,255,0.16)';
    micColor = T.textMuted;
    micShadow = 'none';
  } else {
    micBg = 'linear-gradient(135deg, #34d399, #059669)';
    micBorder = 'rgba(52,211,153,0.55)';
    micColor = '#06281a';
    micShadow = '0 12px 32px rgba(16,185,129,0.40)';
  }

  return (
    <div style={{
      borderRadius: T.cardRadius,
      background: 'linear-gradient(135deg, rgba(52,211,153,0.10), rgba(255,255,255,0.04) 60%, rgba(52,211,153,0.08))',
      border: `1px solid ${T.cardBorder}`,
      padding: 24,
      backdropFilter: T.blur,
      WebkitBackdropFilter: T.blur,
      boxShadow: '0 12px 32px rgba(0,0,0,0.30)',
      fontFamily: T.sans,
      color: T.textPrimary,
      backgroundImage: 'radial-gradient(ellipse 480px 240px at 50% -10%, rgba(52,211,153,0.18), transparent 60%)',
    }}>
      <div style={{ textAlign: 'center' }}>
        {/* Sprout */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: T.emeraldStrong,
          border: '1px solid rgba(52,211,153,0.35)',
          color: T.emerald,
          marginBottom: 16,
        }}>
          <Sprout size={26} strokeWidth={1.75} />
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 6px',
          fontFamily: T.serif,
          fontSize: 22,
          fontWeight: 500,
          color: T.textPrimary,
          letterSpacing: -0.4,
        }}>
          {title}
        </h3>

        {/* Subtitle */}
        <p style={{
          margin: '0 auto 22px',
          maxWidth: 340,
          fontFamily: T.sans,
          fontSize: 13,
          color: T.textSecondary,
          lineHeight: 1.55,
        }}>
          {subtitle}
        </p>

        {/* Big mic */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <button
            onClick={handleMicTap}
            disabled={micBusy}
            title={micActive ? 'Stop' : 'Talk'}
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: micBg,
              border: `1px solid ${micBorder}`,
              color: micColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: micBusy ? 'wait' : 'pointer',
              boxShadow: micShadow,
              transition: 'all 160ms ease',
              animation: micActive ? 'bmp-pulse 1.4s ease-in-out infinite' : 'none',
            }}
          >
            {micBusy ? (
              <Loader2 size={32} strokeWidth={2} style={{ animation: 'bmp-spin 0.9s linear infinite' }} />
            ) : micActive ? (
              <Square size={28} strokeWidth={2} fill="currentColor" />
            ) : (
              <Mic size={36} strokeWidth={1.75} />
            )}
            <style>{`
              @keyframes bmp-pulse {
                0%, 100% { box-shadow: 0 8px 24px rgba(239,68,68,0.40); }
                50% { box-shadow: 0 8px 36px rgba(239,68,68,0.65); }
              }
              @keyframes bmp-spin { to { transform: rotate(360deg); } }
            `}</style>
          </button>
        </div>

        {/* Status */}
        <p style={{
          margin: '0 0 8px',
          fontFamily: T.sans,
          fontSize: 13,
          color: stage === 'error' ? T.red : T.textMuted,
        }}>
          {statusText}
        </p>

        {/* Response */}
        {response && (
          <div style={{
            margin: '14px auto 0',
            maxWidth: 380,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            fontFamily: T.sans,
            fontSize: 13,
            lineHeight: 1.55,
            color: T.textSecondary,
          }}>
            {response}
          </div>
        )}

        {/* Type instead */}
        {!showTyping && stage !== 'recording' && !micBusy && !response && (
          <button
            onClick={() => setShowTyping(true)}
            style={{
              marginTop: 8,
              background: 'transparent',
              border: 'none',
              color: T.emerald,
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {t('bigMic.orTypeInstead')}
          </button>
        )}

        {showTyping && (
          <div style={{
            marginTop: 16,
            display: 'flex',
            gap: 8,
            maxWidth: 380,
            margin: '16px auto 0',
          }}>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTypedSubmit(); }}
              placeholder={t('bigMic.typeMessage')}
              autoFocus
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 12,
                background: T.inputBg,
                border: `1px solid ${T.inputBorder}`,
                color: T.textPrimary,
                fontFamily: T.sans,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={handleTypedSubmit}
              disabled={!typedText.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, #34d399, #10b981)',
                border: '1px solid rgba(52,211,153,0.55)',
                color: '#06281a',
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 700,
                cursor: !typedText.trim() ? 'not-allowed' : 'pointer',
                opacity: !typedText.trim() ? 0.5 : 1,
                boxShadow: !typedText.trim() ? 'none' : '0 4px 14px rgba(16,185,129,0.30)',
              }}
            >
              <Send size={13} strokeWidth={2} />
              {t('bigMic.send')}
            </button>
          </div>
        )}
      </div>
      <style>{`input::placeholder { color: rgba(255,255,255,0.30); }`}</style>
    </div>
  );
}
