'use client';

/**
 * Dark Phonics — the platform's voice.
 *
 * v2 (2026-08-29): LAURA first. Every utterance asks /api/montree/phonics-tts
 * — ElevenLabs' Laura (the voice settled on in the voice audition), cached
 * permanently in the dark-phonics bucket, so the closed phonics vocabulary
 * converges to a one-time-cost audio bank. The browser's Web Speech API is
 * kept as the silent fallback (offline, route down, key missing) so a class
 * NEVER loses audio entirely.
 *
 * The component contract is unchanged: same six functions as v1. Components
 * never know which voice spoke.
 *
 * PHONEMES: TTS engines read single letters as letter NAMES ("s" → "ess"),
 * which a phonics class must never do. `speakPhoneme()` maps each grapheme to
 * a pronounceable respelling ("s" → "sss") — Laura reads these convincingly;
 * the teacher's own voice remains the model, this is the button the child can
 * press forever.
 *
 * All functions are safe anywhere: on the server, or in a browser without
 * audio, they just do nothing.
 */

/* ------------------------------------------------------------- laura ------ */

let currentAudio: HTMLAudioElement | null = null;

/** Characters the TTS route accepts — everything else is dropped client-side. */
const SAFE_RE = /[^a-zA-Z0-9 ,.!?'’…-]/g;

function sanitize(text: string): string {
  return text.replace(/\s+/g, ' ').replace(SAFE_RE, '').trim().slice(0, 300);
}

function stopAll(): void {
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

/** Play the cached Laura recording; on ANY failure, hand off to Web Speech. */
function laura(text: string, opts: { slow?: boolean; fallbackRate: number; fallbackPitch?: number }): void {
  if (typeof window === 'undefined') return;
  const clean = sanitize(text);
  if (!clean) {
    // Text entirely outside Laura's charset (a story scribed in Chinese, say):
    // never go silent — let Web Speech attempt the ORIGINAL text.
    if (text.trim()) {
      stopAll();
      utter(text.trim(), opts.fallbackRate, opts.fallbackPitch ?? 1);
    }
    return;
  }
  stopAll();
  try {
    const url = `/api/montree/phonics-tts?text=${encodeURIComponent(clean)}${opts.slow ? '&slow=1' : ''}`;
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onerror = () => {
      if (currentAudio === audio) utter(clean, opts.fallbackRate, opts.fallbackPitch ?? 1);
    };
    void audio.play().catch(() => {
      if (currentAudio === audio) utter(clean, opts.fallbackRate, opts.fallbackPitch ?? 1);
    });
  } catch {
    utter(clean, opts.fallbackRate, opts.fallbackPitch ?? 1);
  }
}

/* --------------------------------------------- web speech (fallback) ------ */

const hasSpeech = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** Prefer a local en-US voice; fall back to any English one, else the default. */
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
    window.speechSynthesis.cancel(); // one thing at a time — a class, not a choir
    window.speechSynthesis.speak(u);
  } catch {
    /* audio is a bonus, never a blocker */
  }
}

/* -------------------------------------------------------- public API ------ */

/** The word at natural talking speed. */
export function speakWord(word: string): void {
  laura(word, { fallbackRate: 0.85 });
}

/** The word stretched out — the "say it slowly like a snail" voice. */
export function speakSlow(word: string): void {
  laura(word, { slow: true, fallbackRate: 0.5, fallbackPitch: 0.95 });
}

/**
 * Grapheme → pronounceable phoneme respelling. Continuants stretch ("sss");
 * stops stay clipped ("tuh"). Covers every sound in the 49-lesson sequence.
 */
const PHONEME_RESPELL: Record<string, string> = {
  s: 'sss', a: 'ah', t: 'tuh', p: 'puh', i: 'ih', n: 'nnn',
  m: 'mmm', d: 'duh', g: 'guh', o: 'oh', c: 'kuh', k: 'kuh',
  e: 'eh', u: 'uh', r: 'rrr', h: 'hhh', b: 'buh', f: 'fff',
  l: 'lll', j: 'juh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh',
  z: 'zzz', q: 'kwuh', qu: 'kwuh',
  sh: 'shh', ch: 'chuh', th: 'thh', ck: 'kuh', ng: 'ung',
  ee: 'eee', oo: 'ooo', ai: 'ay', oa: 'ohh', ay: 'ay',
};

/** One grapheme's SOUND (never its letter name). */
export function speakPhoneme(grapheme: string): void {
  const g = grapheme.toLowerCase();
  laura(PHONEME_RESPELL[g] ?? g, { fallbackRate: 0.7 });
}

/** The word segmented: "c … a … t — cat". */
export function speakSegmented(graphemes: string[], word: string): void {
  if (graphemes.length === 0) return;
  const parts = graphemes.map((g) => PHONEME_RESPELL[g.toLowerCase()] ?? g).join(', ');
  laura(`${parts}. ${word}!`, { fallbackRate: 0.6 });
}

/** A short instruction sentence (dictation prompts, stories read back). */
export function speakSentence(sentence: string): void {
  laura(sentence, { fallbackRate: 0.8 });
}

export function stopSpeech(): void {
  stopAll();
}
