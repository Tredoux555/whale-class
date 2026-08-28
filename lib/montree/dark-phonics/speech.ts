'use client';

/**
 * Dark Phonics Live — Web Speech API helper (v1 audio for the Writing Shelf).
 *
 * Product decision (Writing Shelf digitisation, 2026-08-27): audio starts as
 * browser TTS — zero files, works on both classroom surfaces immediately —
 * and is swappable later for recorded/generated MP3s without touching the
 * components (they only ever call these four functions).
 *
 * PHONEMES: TTS engines read single letters as letter NAMES ("s" → "ess"),
 * which is exactly what a phonics class must never do. `speakPhoneme()` maps
 * each grapheme to a pronounceable respelling ("s" → "sss", "a" → "ah") — an
 * approximation, but a serviceable one; the teacher's own voice over the call
 * remains the model, this is the button the child can press forever.
 *
 * All functions are safe to call anywhere: on the server, or in a browser
 * without speechSynthesis, they just do nothing.
 */

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

/** The word at natural talking speed. */
export function speakWord(word: string): void {
  utter(word, 0.85);
}

/** The word stretched out — the "say it slowly like a snail" voice. */
export function speakSlow(word: string): void {
  utter(word, 0.5, 0.95);
}

/**
 * Grapheme → pronounceable phoneme respelling. Continuants stretch ("sss");
 * stops stay clipped ("t"). Covers every sound in the 49-lesson sequence.
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
  utter(PHONEME_RESPELL[g] ?? g, 0.7);
}

/** The word segmented: "c … a … t — cat". */
export function speakSegmented(graphemes: string[], word: string): void {
  if (!hasSpeech() || graphemes.length === 0) return;
  const parts = graphemes.map((g) => PHONEME_RESPELL[g.toLowerCase()] ?? g).join(', ');
  utter(`${parts}. ${word}!`, 0.6);
}

/** A short instruction sentence (dictation prompts etc.). */
export function speakSentence(sentence: string): void {
  utter(sentence, 0.8);
}

export function stopSpeech(): void {
  if (!hasSpeech()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}
