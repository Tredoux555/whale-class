'use client';

/**
 * Dark Phonics — the platform's voice. v3: CURATED FILES FIRST.
 *
 * The lesson from the classroom (Aug 29 2026): ElevenLabs is unreliable on
 * very short clips — single phonemes and CVC words glitch no matter the
 * recipe, and a glitching voice is classroom-fatal for young learners. So
 * short audio is NEVER generated live any more:
 *
 *   words     → the approved Laura bank (public/audio/laura/words/<word>.mp3
 *               — the audition clips + recipe-D fills; swap any file to
 *               replace a voice, no code change)
 *   slow      → the SAME approved clip, played at 0.62× with pitch
 *               preserved — zero generation, deterministic, warm
 *   phonemes  → the letter-sound files the sound games have always used
 *               (public/audio-new/letters + phonemes — classroom-proven)
 *   segmented → the phoneme clips in sequence, then the word clip
 *   sentences → the TTS route (long text is where ElevenLabs is reliable),
 *               permanently cached in the bucket
 *
 * Web Speech remains the final fallback everywhere so audio never dies.
 * The component contract is unchanged: same six functions since v1.
 */

import { lauraWordUrl } from '@/lib/montree/dark-phonics/audio-bank';
import { PHONEME_AUDIO } from '@/lib/sound-games/sound-games-data';

/* --------------------------------------------------------- playback core -- */

let currentAudio: HTMLAudioElement | null = null;
/** Bumps on every new utterance; running sequences check it and stop. */
let playToken = 0;

function stopAll(): void {
  playToken += 1;
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = '';
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  }
}

/** Play one file; resolves true when it finished, false on any failure. */
function playFile(url: string, rate = 1): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(url);
      if (rate !== 1) {
        audio.playbackRate = rate;
        // Keep Laura's pitch when slowed — supported everywhere modern.
        try {
          (audio as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
        } catch {
          /* noop */
        }
      }
      currentAudio = audio;
      audio.onended = () => resolve(true);
      audio.onerror = () => resolve(false);
      void audio.play().catch(() => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

/** Play files in order; abandons silently if a new utterance started. */
async function playSequence(urls: string[], gapMs: number, rate = 1): Promise<boolean> {
  const token = playToken;
  for (const url of urls) {
    if (playToken !== token) return true; // superseded, not failed
    const ok = await playFile(url, rate);
    if (!ok) return false;
    if (gapMs > 0) await new Promise((r) => setTimeout(r, gapMs));
  }
  return true;
}

/* ------------------------------------------------------------- tts route -- */

const SAFE_RE = /[^a-zA-Z0-9 ,.!?'’…-]/g;

function sanitize(text: string): string {
  return text.replace(/\s+/g, ' ').replace(SAFE_RE, '').trim().slice(0, 300);
}

/** The cached-Laura route — used ONLY for sentence-length text now. */
function routeUrl(text: string, slow?: boolean): string {
  return `/api/montree/phonics-tts?text=${encodeURIComponent(text)}${slow ? '&slow=1' : ''}`;
}

/* --------------------------------------------- web speech (last resort) --- */

const hasSpeech = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

function pickVoice(): SpeechSynthesisVoice | null {
  if (!hasSpeech()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang === 'en-US' && /google|samantha|natural|enhanced/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  );
}

function utter(text: string, rate: number, pitch = 1): void {
  if (!hasSpeech() || !text) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-US';
    u.rate = rate;
    u.pitch = pitch;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* audio is a bonus, never a blocker */
  }
}

/* ---------------------------------------------------------- phoneme map --- */

/** Grapheme → the sound-game audio file. Normalises spellings the games
 *  don't key ('c'/'ck' share /k/, 'qu' shares /q/'s file). */
function phonemeUrl(grapheme: string): string | null {
  const g = grapheme.toLowerCase();
  const key = g === 'ck' ? 'k' : g === 'qu' ? 'q' : g;
  return PHONEME_AUDIO[key] ?? null;
}

/** Respellings for the Web Speech fallback only. */
const PHONEME_RESPELL: Record<string, string> = {
  s: 'sss', a: 'ah', t: 'tuh', p: 'puh', i: 'ih', n: 'nnn',
  m: 'mmm', d: 'duh', g: 'guh', o: 'oh', c: 'kuh', k: 'kuh',
  e: 'eh', u: 'uh', r: 'rrr', h: 'hhh', b: 'buh', f: 'fff',
  l: 'lll', j: 'juh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh',
  z: 'zzz', q: 'kwuh', qu: 'kwuh',
  sh: 'shh', ch: 'chuh', th: 'thh', ck: 'kuh', ng: 'ung',
  ee: 'eee', oo: 'ooo', ai: 'ay', oa: 'ohh', ay: 'ay',
};

/* -------------------------------------------------------- public API ------ */

/** The word — always the approved bank clip when one exists. */
export function speakWord(word: string): void {
  if (typeof window === 'undefined') return;
  stopAll();
  const url = lauraWordUrl(word);
  if (url) {
    void playFile(url).then((ok) => {
      if (!ok) utter(word, 0.85);
    });
    return;
  }
  // Not in the bank (rare) — the cached route, then Web Speech.
  void playFile(routeUrl(sanitize(word))).then((ok) => {
    if (!ok) utter(word, 0.85);
  });
}

/** Snail voice: the SAME approved clip, slowed with pitch preserved. */
export function speakSlow(word: string): void {
  if (typeof window === 'undefined') return;
  stopAll();
  const url = lauraWordUrl(word);
  if (url) {
    void playFile(url, 0.62).then((ok) => {
      if (!ok) utter(word, 0.5, 0.95);
    });
    return;
  }
  void playFile(routeUrl(sanitize(word), true)).then((ok) => {
    if (!ok) utter(word, 0.5, 0.95);
  });
}

/** One grapheme's SOUND — the classroom-proven letter-sound files. */
export function speakPhoneme(grapheme: string): void {
  if (typeof window === 'undefined') return;
  stopAll();
  const url = phonemeUrl(grapheme);
  if (url) {
    void playFile(url).then((ok) => {
      if (!ok) utter(PHONEME_RESPELL[grapheme.toLowerCase()] ?? grapheme, 0.7);
    });
    return;
  }
  utter(PHONEME_RESPELL[grapheme.toLowerCase()] ?? grapheme, 0.7);
}

/** The word segmented: each sound file in turn, then the word clip. */
export function speakSegmented(graphemes: string[], word: string): void {
  if (typeof window === 'undefined' || graphemes.length === 0) return;
  stopAll();
  const soundUrls = graphemes.map(phonemeUrl);
  const wordUrl = lauraWordUrl(word);
  if (soundUrls.every((u): u is string => u !== null)) {
    const urls = wordUrl ? [...soundUrls, wordUrl] : soundUrls;
    void playSequence(urls, 220).then((ok) => {
      if (!ok) fallbackSegmented(graphemes, word);
    });
    return;
  }
  fallbackSegmented(graphemes, word);
}

function fallbackSegmented(graphemes: string[], word: string): void {
  const parts = graphemes.map((g) => PHONEME_RESPELL[g.toLowerCase()] ?? g).join(', ');
  utter(`${parts}. ${word}!`, 0.6);
}

/** A sentence — long enough for the cached TTS route to be reliable. */
export function speakSentence(sentence: string): void {
  if (typeof window === 'undefined') return;
  stopAll();
  const clean = sanitize(sentence);
  if (!clean) {
    if (sentence.trim()) utter(sentence.trim(), 0.8);
    return;
  }
  void playFile(routeUrl(clean)).then((ok) => {
    if (!ok) utter(clean, 0.8);
  });
}

export function stopSpeech(): void {
  stopAll();
}
