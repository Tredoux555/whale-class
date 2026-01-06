// lib/sound-games/sound-games-data.ts
// Complete data for Sound Games - PURELY AUDITORY (no letters shown)
// All words verified for 3-4 year old familiarity

// ============================================
// TYPES
// ============================================

export interface SoundWord {
  word: string;
  image: string; // emoji or image path
  audioPath?: string; // /audio/words/{word}.mp3
}

export interface SoundGroup {
  sound: string;
  phase: 1 | 2 | 3 | 'vowel';
  words: SoundWord[];
  eslNote?: string;
}

export interface EndingSoundGroup {
  sound: string;
  words: SoundWord[];
  note?: string;
}

export interface CVCWord {
  word: string;
  image: string;
  middleSound: 'a' | 'e' | 'i' | 'o' | 'u';
  sounds: string[]; // e.g., ['c', 'a', 't']
}
// ============================================
// PHONEME AUDIO PATHS
// These need to be recorded - pure sounds only!
// ============================================

export const PHONEME_AUDIO: Record<string, string> = {
  // Consonants
  's': '/audio/phonemes/s.mp3',
  'm': '/audio/phonemes/m.mp3',
  'f': '/audio/phonemes/f.mp3',
  'n': '/audio/phonemes/n.mp3',
  'p': '/audio/phonemes/p.mp3',
  't': '/audio/phonemes/t.mp3',
  'k': '/audio/phonemes/k.mp3',
  'c': '/audio/phonemes/k.mp3',
  'h': '/audio/phonemes/h.mp3',
  'b': '/audio/phonemes/b.mp3',
  'd': '/audio/phonemes/d.mp3',
  'g': '/audio/phonemes/g.mp3',
  'j': '/audio/phonemes/j.mp3',
  'w': '/audio/phonemes/w.mp3',
  'v': '/audio/phonemes/v.mp3',
  'r': '/audio/phonemes/r.mp3',
  'l': '/audio/phonemes/l.mp3',
  'z': '/audio/phonemes/z.mp3',
  'y': '/audio/phonemes/y.mp3',
  'x': '/audio/phonemes/ks.mp3',
  'q': '/audio/phonemes/kw.mp3',
  // Digraphs
  'sh': '/audio/phonemes/sh.mp3',
  'ch': '/audio/phonemes/ch.mp3',
  'th': '/audio/phonemes/th.mp3',
  // Short vowels
  'a': '/audio/phonemes/short-a.mp3',
  'e': '/audio/phonemes/short-e.mp3',
  'i': '/audio/phonemes/short-i.mp3',
  'o': '/audio/phonemes/short-o.mp3',
  'u': '/audio/phonemes/short-u.mp3',
};