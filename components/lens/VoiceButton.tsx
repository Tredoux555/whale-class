// components/lens/VoiceButton.tsx
// Hold to whisper. Release to transcribe.
//
// 🚨 HOLD-TO-RECORD, NOT TAP-TO-TOGGLE, AND THIS IS NOT A PREFERENCE.
// She is standing at the back of a silent classroom. A toggle that is still
// recording because she did not notice the second tap will capture the guide's
// next five minutes and a conversation nobody consented to. A held button
// cannot run on without her: releasing her thumb is the only state.
//
// 🚨 THE AUDIO IS NEVER STORED, ANYWHERE. It goes from MediaRecorder straight
// to /api/lens/transcribe (which forwards it to Whisper and drops it) and the
// blob is released. The moment row carries the TRANSCRIPT, which she can edit.
// Keeping a recording of a real classroom would be a different privacy promise
// than the one this product makes.
//
// 🚨 THE MICROPHONE TRACK IS STOPPED ON EVERY RELEASE. A live track leaves the
// browser's recording indicator on, which in a classroom is both alarming and
// a fair thing for a school to object to.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceState = 'idle' | 'recording' | 'transcribing';

export function VoiceButton({
  onTranscript,
  onError,
  disabled,
}: {
  /** Called with the transcribed text. Empty audio never reaches it. */
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  // A component that unmounts mid-recording (she navigates away) must not leave
  // the microphone open.
  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    if (disabled || state !== 'idle') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onError('This browser can’t record audio. Use the note button instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      // No mimeType is requested: Safari and Chrome disagree about what they
      // support, and Whisper accepts whatever either of them produces. Asking
      // for one and getting it wrong throws before recording starts.
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const mimeType = chunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        cleanup();
        // A tap rather than a hold — nothing was said.
        if (blob.size < 2000) {
          setState('idle');
          setSeconds(0);
          return;
        }
        setState('transcribing');
        try {
          // The filename extension must match the actual container Safari or
          // Chrome produced (Safari records audio/mp4, Chrome audio/webm) —
          // Whisper's format detection leans on it, and a mismatched extension
          // is exactly the "recorded fine, transcribed as garbage" bug that is
          // invisible until someone tests on an iPhone. Mirrors the mapping
          // components/montree/voice/VoiceDictate.tsx already uses.
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          const form = new FormData();
          form.append('audio', blob, `note.${ext}`);
          const response = await fetch('/api/lens/transcribe', {
            method: 'POST',
            body: form,
            credentials: 'same-origin',
          });
          if (!response.ok) {
            let message = 'Transcription failed.';
            try {
              const payload = (await response.json()) as { error?: string };
              if (payload?.error) message = payload.error;
            } catch {
              /* not JSON */
            }
            throw new Error(message);
          }
          const payload = (await response.json()) as { text?: string };
          if (payload.text) onTranscript(payload.text);
          else onError('I couldn’t hear anything in that.');
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Transcription failed.');
        } finally {
          setState('idle');
          setSeconds(0);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setState('recording');
      setSeconds(0);
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      cleanup();
      onError('I couldn’t reach the microphone. Check the permission and try again.');
    }
  }, [cleanup, disabled, onError, onTranscript, state]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop(); // onstop does the rest
  }, []);

  const recording = state === 'recording';
  const label = recording
    ? `Recording ${seconds}s — release to save`
    : state === 'transcribing'
      ? 'Transcribing…'
      : 'Hold to talk';

  return (
    <button
      type="button"
      disabled={disabled || state === 'transcribing'}
      aria-label={label}
      className={`ln-tap flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border text-[13px] font-semibold transition select-none ${
        recording
          ? 'border-forest-danger bg-[rgba(248,113,113,0.18)] text-forest-danger'
          : 'border-[rgba(52,211,153,0.28)] bg-[rgba(8,20,12,0.55)] text-forest-text'
      } disabled:opacity-50`}
      // Pointer events cover mouse, touch and pen in one pair of handlers, and
      // pointerleave/pointercancel are what stop a recording that ran off the
      // edge of the button — without them a thumb that slides away leaves the
      // microphone live.
      onPointerDown={(e) => {
        e.preventDefault();
        start();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden className="text-2xl leading-none">
        {recording ? '●' : '🎙'}
      </span>
      <span className="px-1 text-center leading-tight">{label}</span>
    </button>
  );
}
