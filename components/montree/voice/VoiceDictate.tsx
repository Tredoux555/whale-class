'use client';

/**
 * VoiceDictate — one-tap voice capture for any text field.
 *
 * Spec (two taps total):
 *   Tap 1  → start listening (mic bubble pulses red)
 *   Tap 2  → immediately returns to idle and shows a brief "Saved ✓" pulse.
 *            Transcription happens silently in the background; when it lands
 *            the text is appended to the field via onAppend(text).
 *            If transcription fails, onError(msg) is called (caller typically shows a toast).
 *
 * Drop-in usage next to any <textarea> or <input>:
 *   <VoiceDictate onAppend={(t) => setValue(v => (v ? v + ' ' : '') + t)} />
 *
 * Deliberately no "Transcribing…" visible state — it would break the two-tap feel.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface VoiceDictateProps {
  onAppend: (text: string) => void;
  onError?: (message: string) => void;
  onSaved?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

const TRANSCRIBE_ENDPOINT = '/api/montree/voice-notes/transcribe';
const FALLBACK_ENDPOINT = '/api/montree/guru/transcribe';

export default function VoiceDictate({
  onAppend,
  onError,
  onSaved,
  disabled,
  size = 'md',
  className = '',
  title,
}: VoiceDictateProps) {
  const [recording, setRecording] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      // Unmount: force-stop any active stream + clear timers.
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      try {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      } catch { /* noop */ }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const transcribeInBackground = useCallback(async (blob: Blob, mimeType: string) => {
    if (blob.size < 100) return; // nothing captured

    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const form = new FormData();
    form.append('audio', blob, `dictation.${ext}`);

    // Try primary endpoint (auto language, voice-notes/transcribe). Fall back to guru/transcribe.
    const attempt = async (url: string) => {
      const res = await fetch(url, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = (data && (data.transcript || data.text)) as string | undefined;
      if (!text || !text.trim()) throw new Error('Empty transcript');
      return text.trim();
    };

    try {
      let text: string;
      try {
        text = await attempt(TRANSCRIBE_ENDPOINT);
      } catch {
        text = await attempt(FALLBACK_ENDPOINT);
      }
      onAppend(text);
    } catch (err) {
      console.error('[VoiceDictate] transcription failed:', err);
      onError?.('Transcription failed. Try again.');
    }
  }, [onAppend, onError]);

  const startRecording = useCallback(async () => {
    if (disabled || recording) return;
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
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        // Release mic immediately.
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        // Fire-and-forget transcription. The button is already back to idle at this point.
        void transcribeInBackground(blob, finalMime);
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        onError?.('Microphone access denied.');
      } else {
        onError?.('Could not access microphone.');
      }
    }
  }, [disabled, recording, transcribeInBackground, onError]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === 'recording') {
      try { rec.stop(); } catch { /* noop */ }
    }
    setRecording(false);
    // "Saved ✓" flash — appears immediately on tap-stop regardless of transcription state.
    setSavedFlash(true);
    onSaved?.();
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setSavedFlash(false), 1500);
  }, [onSaved]);

  const handleClick = () => {
    if (disabled) return;
    if (recording) stopRecording();
    else void startRecording();
  };

  const dims = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`${dims} rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
          recording
            ? 'bg-red-500 animate-pulse shadow-lg shadow-red-200 text-white'
            : 'bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-700'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
        title={title || (recording ? 'Tap to save' : 'Tap to speak')}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
      >
        {recording ? <span>⏹</span> : <span>🎤</span>}
      </button>

      {recording && (
        <span className="text-xs text-red-500 font-medium animate-pulse select-none">
          Listening…
        </span>
      )}

      {savedFlash && !recording && (
        <span className="text-xs text-emerald-600 font-medium select-none">
          ✓ Saved
        </span>
      )}
    </div>
  );
}
