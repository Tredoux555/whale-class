'use client';

// hooks/useAstraVoice.ts
//
// Browser-native hands-free Astra. NO Agora. The whole voice loop runs in the
// browser + reuses the SAME text brain the cockpit already uses:
//   1. listen — Web Speech API (SpeechRecognition) transcribes the mic
//   2. think  — POST the transcript to /api/montree/admin/principal-agent
//               (the existing SSE brain) and accumulate the spoken reply
//   3. speak  — OpenAI TTS via /api/montree/tts (nova voice); falls back to
//               the browser's built-in speechSynthesis if TTS is unavailable
//   4. loop   — after Astra finishes speaking, listen again until stop()
//
// Why not Agora: the Agora ConvoAI pipeline (ASR->LLM->TTS) ran on Agora's
// servers and was an opaque black box — every failure (missing keys, missing
// anthropic-version header, silent agent) lived where we couldn't see it. This
// keeps every step in code we control and reuses the brain that already works.
//
// Browser support: SpeechRecognition is available in Chrome, Edge and Safari
// (webkit-prefixed). Firefox has no support -> status 'unsupported'.

import { useCallback, useEffect, useRef, useState } from 'react';

export type AstraVoiceStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'unsupported'
  | 'error';

export interface UseAstraVoiceOptions {
  locale?: string; // BCP-47; defaults to the browser language
  principalName?: string;
  schoolName?: string;
}

// ── Minimal structural types for the Web Speech API (avoid `any`) ──────────
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const MAX_HISTORY_TURNS = 8;

export function useAstraVoice(opts: UseAstraVoiceOptions = {}) {
  const [status, setStatus] = useState<AstraVoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // `active` is the user-intent flag — true between start() and stop(). The
  // conversational loop only continues while this is true.
  const activeRef = useRef(false);
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const convIdRef = useRef<string>('');
  const localeRef = useRef<string>(opts.locale || '');
  // startListening is defined after the turn handler; hold it in a ref so the
  // handler can re-arm listening without a declaration-order cycle.
  const startListeningRef = useRef<() => void>(() => {});

  useEffect(() => {
    localeRef.current =
      opts.locale ||
      (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  }, [opts.locale]);

  const stopAudio = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        if (a.src && a.src.startsWith('blob:')) URL.revokeObjectURL(a.src);
        a.src = '';
      } catch {
        /* ignore */
      }
    }
    audioRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {
        /* ignore */
      }
      abortRef.current = null;
    }
    const rec = recognitionRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    }
    recognitionRef.current = null;
    stopAudio();
    setStatus('idle');
  }, [stopAudio]);

  // Speak `text`: try OpenAI TTS (nova); on any failure fall back to the
  // browser's built-in speechSynthesis so Astra still talks. Resolves when
  // playback finishes (or immediately on hard failure).
  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        const fallback = () => {
          if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            resolve();
            return;
          }
          try {
            const u = new SpeechSynthesisUtterance(text.slice(0, 4096));
            u.lang = localeRef.current || 'en-US';
            u.onend = () => resolve();
            u.onerror = () => resolve();
            window.speechSynthesis.speak(u);
          } catch {
            resolve();
          }
        };

        fetch('/api/montree/tts', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.slice(0, 4096) }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error(`tts ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => {
              if (url.startsWith('blob:')) URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => {
              if (url.startsWith('blob:')) URL.revokeObjectURL(url);
              fallback();
            };
            await audio.play();
          })
          .catch(() => fallback());
      }),
    []
  );

  // Send a transcript to the existing principal-agent brain and accumulate the
  // spoken (text) reply from its SSE stream.
  const askBrain = useCallback(async (question: string): Promise<string> => {
    const controller = new AbortController();
    abortRef.current = controller;

    const history = historyRef.current.slice(-MAX_HISTORY_TURNS);
    const res = await fetch('/api/montree/admin/principal-agent', {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        conversation_id: convIdRef.current,
        history,
        locale: localeRef.current || 'en-US',
      }),
    });

    if (res.status === 402) {
      const p = await res.json().catch(() => ({}));
      throw new Error(p?.error || 'Astra voice needs an active plan.');
    }
    if (!res.ok || !res.body) {
      const p = await res.json().catch(() => ({}));
      throw new Error(p?.error || 'Astra could not respond just now.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nlIdx;
      while ((nlIdx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 2);
        if (!raw.startsWith('data:')) continue;
        const json = raw.slice(5).trim();
        if (!json) continue;
        let evt: Record<string, unknown>;
        try {
          evt = JSON.parse(json);
        } catch {
          continue;
        }
        if (evt.type === 'text') {
          finalText += String(evt.text || '');
        } else if (evt.type === 'error') {
          throw new Error(String(evt.error || 'Astra hit an error.'));
        }
      }
    }
    return finalText.trim();
  }, []);

  // One full turn: think -> speak -> relisten. Captures the heard transcript.
  const handleTranscript = useCallback(
    async (transcript: string) => {
      const q = transcript.trim();
      if (!q) {
        if (activeRef.current) startListeningRef.current();
        return;
      }
      historyRef.current.push({ role: 'user', content: q });
      setStatus('thinking');
      try {
        const reply = await askBrain(q);
        if (!activeRef.current) return; // stopped mid-think
        const spoken = reply || 'Okay.';
        historyRef.current.push({ role: 'assistant', content: spoken });
        setStatus('speaking');
        await speak(spoken);
        if (!activeRef.current) return; // stopped mid-speech
        startListeningRef.current(); // continue the conversation
      } catch (err) {
        if (!activeRef.current) return; // aborted by stop()
        setError(err instanceof Error ? err.message : 'Astra hit a problem.');
        setStatus('error');
        activeRef.current = false;
      }
    },
    [askBrain, speak]
  );

  // Begin a single listen cycle. SpeechRecognition fires onresult with the
  // final transcript, then onend; onerror covers denied mic / no speech.
  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('Voice input isn’t supported in this browser. Try Chrome or Safari.');
      setStatus('unsupported');
      activeRef.current = false;
      return;
    }
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = localeRef.current || 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    let gotResult = '';
    rec.onresult = (e: SpeechRecognitionEventLike) => {
      const results = e.results;
      let text = '';
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r && r[0]) text += r[0].transcript;
      }
      gotResult = text;
    };
    rec.onerror = (e: SpeechRecognitionErrorEventLike) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // benign
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone access was blocked. Allow the mic and try again.');
        setStatus('error');
        activeRef.current = false;
        return;
      }
      setError('Voice input error: ' + e.error);
      setStatus('error');
      activeRef.current = false;
    };
    rec.onend = () => {
      recognitionRef.current = null;
      if (!activeRef.current) return;
      if (gotResult.trim()) {
        void handleTranscript(gotResult);
      } else {
        // Heard nothing — end cleanly so the mic doesn't spin. Tap to talk again.
        activeRef.current = false;
        setStatus('idle');
      }
    };

    try {
      rec.start();
      setStatus('listening');
    } catch {
      // start() throws if called too rapidly back-to-back; retry once shortly.
      setTimeout(() => {
        if (!activeRef.current) return;
        try {
          rec.start();
          setStatus('listening');
        } catch {
          setError('Could not start the microphone.');
          setStatus('error');
          activeRef.current = false;
        }
      }, 250);
    }
  }, [handleTranscript]);

  // Keep the ref in sync so handleTranscript can re-arm listening.
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const start = useCallback(() => {
    setError(null);
    if (!getRecognitionCtor()) {
      setError('Voice input isn’t supported in this browser. Try Chrome or Safari.');
      setStatus('unsupported');
      return;
    }
    convIdRef.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : 'voice-' + Date.now().toString(36);
    historyRef.current = [];
    activeRef.current = true;
    startListening();
  }, [startListening]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { status, error, start, stop };
}
