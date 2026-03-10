'use client';

// components/montree/voice-notes/ChildVoiceNote.tsx
// Compact inline mic button — sits next to Save in the observation textarea
// Tap mic → record → stop → Whisper transcribe → Sonnet extract → auto-update progress
// Transcript fills the textarea so teacher can edit before saving

import { useState, useRef, useCallback, useEffect } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface Props {
  childId: string;
  /** Callback to set the textarea content with the transcript */
  onTranscript?: (text: string) => void;
  /** Called after extraction + save completes */
  onNoteCreated?: () => void;
}

type MicState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

export default function ChildVoiceNote({ childId, onTranscript, onNoteCreated }: Props) {
  const { t } = useI18n();

  const [state, setState] = useState<MicState>('idle');
  const [statusText, setStatusText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount: stop recording + abort in-flight requests
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Process: transcribe → extract → save
  const processRecording = useCallback(async () => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) {
      setState('idle');
      return;
    }

    const blob = new Blob(chunks, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
    if (blob.size < 100) {
      setStatusText(t('voiceNotes.tooShort'));
      setState('error');
      setTimeout(() => setState('idle'), 3000);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Step 1: Transcribe via Whisper
      setState('processing');
      setStatusText(t('voiceNotes.transcribing'));

      const transcribeForm = new FormData();
      transcribeForm.append('audio', blob, 'recording.webm');

      const transcribeRes = await fetch('/api/montree/voice-notes/transcribe', {
        method: 'POST',
        body: transcribeForm,
        signal: controller.signal,
      });

      if (!transcribeRes.ok) {
        let errorMessage = t('voiceNotes.transcribeError');
        try {
          const errorData = await transcribeRes.json();
          if (errorData.code === 'MISSING_API_KEY') {
            errorMessage = t('voiceNotes.notConfigured');
          } else if (errorData.code === 'TIMEOUT') {
            errorMessage = t('voiceNotes.transcribeError');
          }
        } catch {}
        throw new Error(errorMessage);
      }

      const transcribeData = await transcribeRes.json();
      const transcript = transcribeData.transcript;

      if (!transcript || transcript.length < 3) {
        setStatusText(t('voiceNotes.noSpeech'));
        setState('error');
        setTimeout(() => setState('idle'), 3000);
        return;
      }

      // Fill the textarea with the transcript so teacher can see/edit
      onTranscript?.(transcript);

      // Step 2: Extract + save via voice notes API
      setStatusText(t('voiceNotes.extracting'));

      const extractRes = await montreeApi('/api/montree/voice-notes', {
        method: 'POST',
        body: JSON.stringify({
          child_id: childId,
          transcript,
          audio_duration: transcribeData.duration_seconds || 0,
          language: transcribeData.language || 'auto',
        }),
        signal: controller.signal,
      });

      if (!extractRes.ok) {
        let errorMessage = t('voiceNotes.processingError');
        try {
          const errorData = await extractRes.json();
          if (errorData.code === 'EXTRACTION_FAILED') {
            errorMessage = t('voiceNotes.analyzeError');
          } else if (errorData.code === 'TABLE_NOT_FOUND') {
            errorMessage = t('voiceNotes.notConfigured');
          } else if (errorData.code === 'DB_ERROR') {
            errorMessage = t('voiceNotes.saveError');
          }
        } catch {}
        throw new Error(errorMessage);
      }

      const extractData = await extractRes.json();

      if (extractData.success) {
        const ext = extractData.extraction;
        const appliedText = extractData.auto_applied ? ` (${t('voiceNotes.autoApplied')})` : '';
        const workText = ext?.work_name ? `→ ${ext.work_name}` : '';
        setStatusText(`✓ ${workText}${appliedText}`);
        setState('done');
        onNoteCreated?.();
        setTimeout(() => {
          setState('idle');
          setStatusText('');
        }, 4000);
      } else {
        throw new Error(extractData.error || 'Unknown error');
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('[voice-note] Process error:', err);
      const errorMsg = err instanceof Error ? err.message : t('voiceNotes.processingError');
      setStatusText(errorMsg);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [childId, onTranscript, onNoteCreated, t]);

  // Start recording
  const startRecording = useCallback(async () => {
    setStatusText('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        processRecording();
      };

      recorder.start(1000);
      setState('recording');
    } catch {
      setStatusText(t('voiceNotes.micError'));
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [processRecording, t]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Toggle
  const handleToggle = useCallback(() => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle' || state === 'error' || state === 'done') {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  const isProcessing = state === 'processing';

  // Compact inline button — sits next to Save
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={handleToggle}
        disabled={isProcessing}
        className={`
          flex items-center justify-center w-7 h-7 rounded-lg transition-all text-xs
          ${state === 'recording' ? 'bg-red-500 animate-pulse shadow-sm shadow-red-500/30' : ''}
          ${isProcessing ? 'bg-gray-300 cursor-wait' : ''}
          ${state === 'idle' || state === 'done' ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-90' : ''}
          ${state === 'error' ? 'bg-red-400 hover:bg-red-500 active:scale-90' : ''}
        `}
        aria-label={state === 'recording' ? t('voiceNotes.stopRecording') : t('voiceNotes.startRecording')}
        title={state === 'recording' ? t('voiceNotes.stopRecording') : t('voiceNotes.startRecording')}
      >
        {state === 'recording' ? (
          <span className="text-white">⏹</span>
        ) : isProcessing ? (
          <span className="text-white animate-spin">⏳</span>
        ) : (
          <span className="text-white">🎙️</span>
        )}
      </button>

      {/* Inline status text — shows during/after processing */}
      {statusText && (
        <span className={`text-[10px] max-w-[140px] truncate ${
          state === 'error' ? 'text-red-500' :
          state === 'done' ? 'text-emerald-600' :
          'text-gray-500'
        }`}>
          {statusText}
        </span>
      )}
    </div>
  );
}
