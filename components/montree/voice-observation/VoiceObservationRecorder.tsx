// components/montree/voice-observation/VoiceObservationRecorder.tsx
// Recording UI — MediaRecorder with 60s chunked uploads, pause/resume, language select
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface Props {
  state: 'idle' | 'recording' | 'paused';
  onStart: (language: string) => void;
  onPause: () => void;
  onEnd: (durationSeconds: number) => void;
  sessionId: string | null;
}

const CHUNK_INTERVAL_MS = 60_000; // 60 seconds

export default function VoiceObservationRecorder({ state, onStart, onPause, onEnd, sessionId }: Props) {
  const { t } = useI18n();
  const [language, setLanguage] = useState('auto');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [chunksUploaded, setChunksUploaded] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const pendingUploadRef = useRef<Promise<void> | null>(null);
  const [stopping, setStopping] = useState(false);

  // Timer
  useEffect(() => {
    if (state === 'recording') {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const raw = Date.now() - startTimeRef.current - pausedDurationRef.current;
        setElapsedSeconds(Math.floor(raw / 1000));
      }, 500);
    } else if (state === 'paused') {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Tab visibility warning
  useEffect(() => {
    const handler = () => {
      if (document.hidden && (state === 'recording' || state === 'paused')) {
        setTabHidden(true);
      } else {
        setTabHidden(false);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [state]);

  // Upload a chunk — returns a promise so handleStop can wait for the final upload
  const uploadChunk = useCallback(async (blob: Blob) => {
    if (!sessionId || blob.size < 100) return;
    setUploading(true);
    const uploadPromise = (async () => {
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'chunk.webm');
        const resp = await fetch(`/api/montree/voice-observation/${sessionId}/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!resp.ok) {
          toast.error(t('voiceObs.errorUpload') || 'Upload failed');
          return;
        }
        const data = await resp.json();
        if (data.success) {
          setChunksUploaded(prev => prev + 1);
        } else {
          toast.error(data.error || 'Upload failed');
        }
      } catch {
        toast.error(t('voiceObs.errorUpload') || 'Failed to upload audio chunk');
      } finally {
        setUploading(false);
      }
    })();
    // Track the last upload promise so handleStop can await it
    pendingUploadRef.current = uploadPromise;
    return uploadPromise;
  }, [sessionId, t]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          uploadChunk(e.data);
        }
      };

      recorder.start();
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      setElapsedSeconds(0);
      setChunksUploaded(0);

      // Request data every 60 seconds
      chunkTimerRef.current = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
      }, CHUNK_INTERVAL_MS);

      onStart(language);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  }, [language, onStart, uploadChunk]);

  // Pause — track pause duration so timer is accurate
  const handlePause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      pauseStartRef.current = Date.now();
    } else if (recorder && recorder.state === 'paused') {
      // Accumulate pause duration before resuming
      if (pauseStartRef.current > 0) {
        pausedDurationRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = 0;
      }
      recorder.resume();
    }
    onPause();
  }, [onPause]);

  // Stop — waits for final chunk upload before signaling end to parent
  const handleStop = useCallback(async () => {
    setStopping(true);
    const recorder = mediaRecorderRef.current;

    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
    }

    if (recorder && recorder.state !== 'inactive') {
      // recorder.stop() triggers one last ondataavailable with remaining data
      recorder.stop();
    }

    // Wait for the final chunk upload to complete (triggered by ondataavailable above)
    // Give a small delay for the ondataavailable event to fire and uploadChunk to start
    await new Promise(resolve => setTimeout(resolve, 200));
    if (pendingUploadRef.current) {
      try { await pendingUploadRef.current; } catch { /* ignore */ }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setStopping(false);
    onEnd(elapsedSeconds);
  }, [elapsedSeconds, onEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Format time
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // IDLE state — start button + language selector
  if (state === 'idle') {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-6">🎤</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t('voiceObs.startSession') || 'Start Voice Observation'}
        </h2>
        <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
          Record your work cycle. AI will identify students, match works, and propose progress updates.
        </p>

        {/* Language selector */}
        <div className="mb-6">
          <label className="text-xs text-gray-500 block mb-2">Language</label>
          <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
            {[
              { val: 'auto', label: t('voiceObs.languageAuto') || 'Auto' },
              { val: 'en', label: t('voiceObs.languageEnglish') || 'English' },
              { val: 'zh', label: t('voiceObs.languageChinese') || '中文' },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setLanguage(opt.val)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  language === opt.val ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startRecording}
          className="px-8 py-3 bg-red-500 text-white rounded-full text-lg font-semibold hover:bg-red-600 transition shadow-lg"
        >
          ● {t('voiceObs.startSession') || 'Start Recording'}
        </button>
      </div>
    );
  }

  // RECORDING / PAUSED state
  return (
    <div className="text-center py-8">
      {/* Tab switch warning */}
      {tabHidden && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 mb-4">
          {t('voiceObs.tabSwitchWarning') || 'Recording continues in background — keep this tab open for best results.'}
        </div>
      )}

      {/* Recording indicator */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
        state === 'recording'
          ? 'bg-red-100 text-red-700'
          : 'bg-amber-100 text-amber-700'
      }`}>
        <span className={`w-3 h-3 rounded-full ${
          state === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
        }`} />
        {state === 'recording'
          ? (t('voiceObs.recording') || 'Recording')
          : (t('voiceObs.paused') || 'Paused')
        }
      </div>

      {/* Timer */}
      <div className="text-5xl font-mono font-bold text-gray-900 mb-2">
        {formatTime(elapsedSeconds)}
      </div>

      {/* Chunk counter */}
      <div className="text-sm text-gray-500 mb-8">
        {chunksUploaded} chunks uploaded {uploading && '(uploading...)'}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handlePause}
          className={`px-6 py-3 rounded-full font-medium transition ${
            state === 'paused'
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {state === 'paused'
            ? (t('voiceObs.resumeSession') || '▶ Resume')
            : (t('voiceObs.pauseSession') || '⏸ Pause')
          }
        </button>
        <button
          onClick={handleStop}
          disabled={stopping}
          className="px-6 py-3 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-900 transition disabled:opacity-50"
        >
          {stopping
            ? (t('voiceObs.finishing') || '⏳ Finishing...')
            : (t('voiceObs.finishSession') || '⏹ Finish')
          }
        </button>
      </div>
    </div>
  );
}
