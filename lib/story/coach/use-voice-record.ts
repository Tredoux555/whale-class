'use client';

// Voice → text for the Coach. Tap to record, tap to stop; we send the clip to
// /api/story/coach/transcribe (Whisper) and hand back the text. Used by the
// Coach page + float so Tredoux can just speak to it.

import { useCallback, useRef, useState } from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { coachLoginPath } from '@/lib/story/login-path';

export function useVoiceRecord(onText: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Mic not supported here.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 100) { setTranscribing(false); return; }
        setTranscribing(true);
        try {
          const token = getStoryAdminToken();
          if (!token) { window.location.href = coachLoginPath(); return; }
          const form = new FormData();
          form.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/story/coach/transcribe', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError((data as { error?: string })?.error || 'Could not transcribe.');
          } else {
            const text = (data as { text?: string }).text?.trim();
            if (text) onText(text);
            else setError("Didn't catch that — try again.");
          }
        } catch {
          setError('Transcription failed.');
        } finally {
          setTranscribing(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setError('Mic permission denied.');
      stopTracks();
    }
  }, [onText]);

  const stop = useCallback(() => {
    setRecording(false);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const toggle = useCallback(() => {
    if (recording) stop();
    else void start();
  }, [recording, start, stop]);

  return { recording, transcribing, error, toggle };
}
