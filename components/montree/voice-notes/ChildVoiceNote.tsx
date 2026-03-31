'use client';

// components/montree/voice-notes/ChildVoiceNote.tsx
// Compact inline mic button — sits next to Save in the observation textarea
// NON-BLOCKING: Record → stop → immediately return to idle → process in background
// Teacher can navigate, record more notes, or do anything else while processing happens.
// Uses BackgroundTaskStore for lifecycle tracking + BackgroundTaskBanner for status display.

import { useState, useRef, useCallback, useEffect } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import {
  addTask,
  getTaskSignal,
  updateTaskLabel,
  completeTask,
  failTask,
  deliverTranscript,
} from '@/lib/montree/background-task-store';

interface Props {
  childId: string;
  childName?: string;
  /** Callback to set the textarea content with the transcript */
  onTranscript?: (text: string) => void;
  /** Called after extraction + save completes */
  onNoteCreated?: () => void;
}

type MicState = 'idle' | 'recording';

export default function ChildVoiceNote({ childId, childName, onTranscript, onNoteCreated }: Props) {
  const { t } = useI18n();

  // Only two states now: idle or recording. Processing happens in background.
  const [state, setState] = useState<MicState>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount: stop recording only (background tasks survive navigation)
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Fire-and-forget background processing: transcribe → extract → save
  const processInBackground = useCallback((blob: Blob) => {
    // Register task in background store — returns immediately
    const taskId = addTask({
      type: 'voice_note',
      label: t('bgTask.transcribing'),
      childId,
      childName,
      onTranscript: onTranscript ?? null,
      onComplete: onNoteCreated ?? null,
    });

    const signal = getTaskSignal(taskId);

    // Async processing — NOT awaited
    (async () => {
      try {
        // Step 1: Transcribe via Whisper
        const transcribeForm = new FormData();
        transcribeForm.append('audio', blob, 'recording.webm');

        const transcribeRes = await fetch('/api/montree/voice-notes/transcribe', {
          method: 'POST',
          body: transcribeForm,
          signal,
        });

        if (!transcribeRes.ok) {
          let errorMessage = t('voiceNotes.transcribeError');
          try {
            const errorData = await transcribeRes.json();
            if (errorData.code === 'MISSING_API_KEY') {
              errorMessage = t('voiceNotes.notConfigured');
            }
          } catch { /* ignore parse error */ }
          throw new Error(errorMessage);
        }

        const transcribeData = await transcribeRes.json();
        const transcript = transcribeData.transcript;

        if (!transcript || transcript.length < 3) {
          failTask(taskId, t('voiceNotes.noSpeech'));
          return;
        }

        // Deliver transcript to textarea via callback (stored in task)
        deliverTranscript(taskId, transcript);

        // Step 2: Extract + save via voice notes API
        updateTaskLabel(taskId, t('bgTask.extracting'));

        const { montreeApi } = await import('@/lib/montree/api');
        const extractRes = await montreeApi('/api/montree/voice-notes', {
          method: 'POST',
          body: JSON.stringify({
            child_id: childId,
            transcript,
            audio_duration: transcribeData.duration_seconds || 0,
            language: transcribeData.language || 'auto',
          }),
          signal,
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
          } catch { /* ignore parse error */ }
          throw new Error(errorMessage);
        }

        const extractData = await extractRes.json();

        if (extractData.success) {
          const ext = extractData.extraction;
          const appliedText = extractData.auto_applied ? ` (${t('voiceNotes.autoApplied')})` : '';
          const workText = ext?.work_name ? `${ext.work_name}${appliedText}` : '';
          completeTask(taskId, {
            message: workText ? `✓ ${workText}` : `✓ ${t('bgTask.voiceNoteComplete')}`,
          });
        } else {
          throw new Error(extractData.error || t('voiceNotes.processingError'));
        }
      } catch (err) {
        if (signal?.aborted) return; // Task was cancelled — don't mark failed
        console.error('[voice-note] Background process error:', err);
        const errorMsg = err instanceof Error ? err.message : t('bgTask.voiceNoteFailed');
        failTask(taskId, errorMsg);
      }
    })();
  }, [childId, childName, onTranscript, onNoteCreated, t]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // CRITICAL: navigator.mediaDevices is undefined on HTTP pages or unsupported browsers
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const chunks = chunksRef.current;
        chunksRef.current = [];

        if (chunks.length === 0) return;

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) return; // Too short — silent discard

        // Fire-and-forget: process in background, return mic to idle immediately
        processInBackground(blob);
      };

      recorder.start(1000);
      setState('recording');
    } catch {
      // Silent fail — mic permission denied or unavailable
    }
  }, [processInBackground]);

  // Stop recording → triggers onstop → fires processInBackground → returns to idle
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setState('idle'); // Return to idle IMMEDIATELY — no waiting
  }, []);

  // Toggle
  const handleToggle = useCallback(() => {
    if (state === 'recording') {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  // Compact inline button — sits next to Save
  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center justify-center w-7 h-7 rounded-lg transition-all text-xs
        ${state === 'recording' ? 'bg-red-500 animate-pulse shadow-sm shadow-red-500/30' : ''}
        ${state === 'idle' ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-90' : ''}
      `}
      aria-label={state === 'recording' ? t('voiceNotes.stopRecording') : t('voiceNotes.startRecording')}
      title={state === 'recording' ? t('voiceNotes.stopRecording') : t('voiceNotes.startRecording')}
    >
      {state === 'recording' ? (
        <span className="text-white">⏹</span>
      ) : (
        <span className="text-white">🎙️</span>
      )}
    </button>
  );
}
