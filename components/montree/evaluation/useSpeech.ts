'use client';

/**
 * Item narration via the Web Speech API.
 *
 * THE FALLBACK IS THE FEATURE. `speechSynthesis` is missing, muted or voiceless on a
 * meaningful share of school tablets — a locked-down Android kiosk, an iPad with the
 * ringer switch off, a browser that reports zero voices until a user gesture. So this hook
 * reports honestly whether audio is live, and the item screen shows the teacher script
 * card whenever it is not. A check-in must be fully deliverable with audio dead
 * (ARCHITECTURE.md §6-D2); that is a stated requirement, not a degraded mode.
 *
 * iOS also refuses to speak until the page has had a user gesture, hence the explicit
 * "check the sound" gate on the setup screen rather than an autoplay attempt on load.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeechState {
  /** The API exists AND at least one voice resolved. */
  supported: boolean;
  /** The teacher has switched sound on and it has been proven to work. */
  enabled: boolean;
  live: boolean;
  enable: () => Promise<boolean>;
  disable: () => void;
  speak: (text: string, lang?: string) => boolean;
  cancel: () => void;
}

const RATE = 0.85;   // slower than conversational — three-year-olds, unfamiliar wording
const PITCH = 1.0;

function pickVoice(preferred: string): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices() ?? [];
    if (!voices.length) return null;
    const order = [preferred, preferred.split('-')[0], 'en-GB', 'en-US', 'en'];
    for (const tag of order) {
      const hit = voices.find((v) => (v.lang ?? '').replace('_', '-').toLowerCase().startsWith(tag.toLowerCase()));
      if (hit) return hit;
    }
    return voices[0];
  } catch {
    return null;
  }
}

export function useSpeech(defaultLang = 'en-GB'): SpeechState {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const sync = () => {
      const v = pickVoice(defaultLang);
      voiceRef.current = v;
      setSupported(!!v);
    };
    sync();
    try {
      window.speechSynthesis.addEventListener('voiceschanged', sync);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', sync);
    } catch {
      return undefined;
    }
  }, [defaultLang]);

  const speak = useCallback((text: string, lang?: string): boolean => {
    if (!text || !enabled) return false;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang ?? defaultLang;
      if (!voiceRef.current) voiceRef.current = pickVoice(lang ?? defaultLang);
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate = RATE;
      utterance.pitch = PITCH;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }, [enabled, defaultLang]);

  /** The one-time gate. Speaking a short line inside the tap satisfies iOS autoplay policy. */
  const enable = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    try {
      if (!voiceRef.current) voiceRef.current = pickVoice(defaultLang);
      const utterance = new SpeechSynthesisUtterance('Hello, are you ready?');
      utterance.lang = defaultLang;
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate = RATE;
      window.speechSynthesis.speak(utterance);
      setEnabled(true);
      setSupported(true);
      return true;
    } catch {
      setEnabled(false);
      return false;
    }
  }, [defaultLang]);

  const disable = useCallback(() => {
    setEnabled(false);
    try { window.speechSynthesis.cancel(); } catch { /* already gone */ }
  }, []);

  const cancel = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch { /* already gone */ }
  }, []);

  return { supported, enabled, live: supported && enabled, enable, disable, speak, cancel };
}

export default useSpeech;
