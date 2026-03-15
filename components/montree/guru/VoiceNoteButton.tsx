'use client';

import { useState, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/montree/i18n';

interface VoiceNoteButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceNoteButton({ onTranscription, disabled }: VoiceNoteButtonProps) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer webm/opus, fall back to whatever's available
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });

        if (blob.size < 100) {
          setError(t('voice.recordingTooShort'));
          return;
        }

        // Transcribe
        setTranscribing(true);
        try {
          const formData = new FormData();
          const ext = (recorder.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
          formData.append('audio', blob, `recording.${ext}`);

          const res = await fetch('/api/montree/guru/transcribe', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);

          const data = await res.json();
          if (data.success && data.text) {
            onTranscription(data.text);
          } else {
            setError(data.error || t('voice.transcriptionFailed'));
          }
        } catch {
          setError(t('voice.failedToTranscribe'));
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError(t('voice.microphoneAccessDenied'));
      } else {
        setError(t('voice.couldNotAccessMicrophone'));
      }
    }
  }, [onTranscription, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  const handleClick = () => {
    if (disabled || transcribing) return;
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={disabled || transcribing}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          recording
            ? 'bg-red-500 animate-pulse shadow-lg shadow-red-200'
            : transcribing
            ? 'bg-gray-300 cursor-wait'
            : 'bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300'
        } disabled:opacity-50`}
        title={recording ? t('voice.tapToStop') : transcribing ? t('voice.transcribing') : t('voice.tapToSpeak')}
        aria-label={recording ? t('voice.stopRecording') : t('voice.startRecording')}
      >
        {recording ? (
          <span className="text-white text-lg">⏹</span>
        ) : transcribing ? (
          <span className="animate-spin text-gray-500 text-sm">⏳</span>
        ) : (
          <span className="text-emerald-700 text-lg">🎤</span>
        )}
      </button>

      {recording && (
        <span className="text-xs text-red-500 font-medium animate-pulse">
          {t('voice.listening')}
        </span>
      )}

      {transcribing && (
        <span className="text-xs text-gray-500">
          {t('voice.transcribing')}
        </span>
      )}

      {error && (
        <span className="text-xs text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
