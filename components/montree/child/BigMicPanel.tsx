'use client';

// components/montree/child/BigMicPanel.tsx
// The big microphone. That's it.
// Sits above the shelf on the child's page. Swipe down for the shelf.
// Talk to it like a living-room smart speaker — it controls everything:
// observations, shelf changes, game plan, progress updates.
// Auto-links observations to photos taken in the last 90s.

import { useState, useRef, useCallback, useEffect } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

interface Props {
  childId: string;
  childName: string;
  onAction?: () => void; // Parent refresh after tool executes
}

type Stage = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'done' | 'error';

export default function BigMicPanel({ childId, childName, onAction }: Props) {
  const { locale } = useI18n();
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

      // Auto-clear response after 8s so panel returns to idle mic.
      // Tracked in a ref so a new recording or unmount cancels it.
      if (autoClearRef.current) clearTimeout(autoClearRef.current);
      autoClearRef.current = setTimeout(() => {
        setStage('idle');
        setResponse('');
        autoClearRef.current = null;
      }, 8000);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[BigMicPanel] Send error:', err);
      setError(locale === 'zh' ? '连接错误' : 'Connection error');
      setStage('error');
    }
  }, [childId, locale, onAction]);

  const startRecording = useCallback(async () => {
    // Cancel any pending auto-clear from a previous response so it
    // doesn't wipe state mid-recording.
    if (autoClearRef.current) {
      clearTimeout(autoClearRef.current);
      autoClearRef.current = null;
    }
    setError('');
    setResponse('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(locale === 'zh' ? '麦克风不可用' : 'Microphone not available');
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
            setError(locale === 'zh' ? '转录失败' : 'Transcription failed');
            setStage('error');
          }
        } catch (err) {
          console.error('[BigMicPanel] Transcription error:', err);
          setError(locale === 'zh' ? '转录失败' : 'Transcription failed');
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
      setError(locale === 'zh' ? '无法访问麦克风' : 'Microphone access denied');
      setStage('error');
    }
  }, [locale, sendToGuru]);

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

  // --- Status text ---
  const statusText = (() => {
    switch (stage) {
      case 'recording': return `${locale === 'zh' ? '正在录音' : 'Listening'}... ${formatTime(recordingTime)}`;
      case 'transcribing': return locale === 'zh' ? '转录中...' : 'Transcribing...';
      case 'thinking': return locale === 'zh' ? '思考中...' : 'Thinking...';
      case 'error': return error;
      default: return locale === 'zh' ? '点击开始' : 'Tap to start';
    }
  })();

  const title = locale === 'zh'
    ? `告诉我 ${childName} 的情况`
    : `Talk to me about ${childName}`;

  const subtitle = locale === 'zh'
    ? '记录观察、更换书架、更新进度 — 说就好了。'
    : 'Record an observation, change the shelf, update progress — just say it.';

  const micBusy = stage === 'transcribing' || stage === 'thinking';
  const micActive = stage === 'recording';

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border-2 border-emerald-200 p-6 shadow-sm">
      <div className="text-center">
        {/* Sprout icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4 text-3xl">
          🌱
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

        {/* Subtitle */}
        <p className="text-sm text-gray-600 mb-6 max-w-xs mx-auto leading-relaxed">
          {subtitle}
        </p>

        {/* Big mic button */}
        <div className="flex items-center justify-center mb-3">
          <button
            onClick={handleMicTap}
            disabled={micBusy}
            className={`
              w-20 h-20 rounded-full shadow-lg flex items-center justify-center transition-all
              ${micActive
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : micBusy
                  ? 'bg-gray-300 cursor-wait'
                  : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95'
              }
              text-white
            `}
            title={micActive ? 'Stop' : 'Talk'}
          >
            {micBusy ? (
              <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : micActive ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8M12 3a3 3 0 00-3 3v5a3 3 0 106 0V6a3 3 0 00-3-3z" />
              </svg>
            )}
          </button>
        </div>

        {/* Status */}
        <p className={`text-sm mb-2 ${stage === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
          {statusText}
        </p>

        {/* Response bubble */}
        {response && (
          <div className="mt-4 text-sm text-gray-700 leading-relaxed px-2 max-w-sm mx-auto">
            {response}
          </div>
        )}

        {/* Type instead */}
        {!showTyping && stage !== 'recording' && !micBusy && !response && (
          <button
            onClick={() => setShowTyping(true)}
            className="text-sm text-emerald-600 hover:text-emerald-700 underline mt-2"
          >
            {locale === 'zh' ? '或输入文字' : 'or type instead'}
          </button>
        )}

        {showTyping && (
          <div className="mt-4 flex gap-2 max-w-sm mx-auto">
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTypedSubmit(); }}
              placeholder={locale === 'zh' ? '输入消息...' : 'Type a message...'}
              autoFocus
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-emerald-200 focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleTypedSubmit}
              disabled={!typedText.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {locale === 'zh' ? '发送' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
