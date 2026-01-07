// lib/games/sound-utils.ts
// Audio utilities - ELEVENLABS ONLY - NO SPEECH SYNTHESIS
// Migrated to use pre-recorded audio files

import { GameAudio, AUDIO_PATHS } from '@/lib/games/audio-paths';

// ============================================
// LETTER SOUNDS - Using ElevenLabs pre-recorded audio
// ============================================

const LETTER_SOUNDS: Record<string, string> = {
  'a': 'a', 'b': 'b', 'c': 'c', 'd': 'd', 'e': 'e', 'f': 'f', 'g': 'g',
  'h': 'h', 'i': 'i', 'j': 'j', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n',
  'o': 'o', 'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 't': 't', 'u': 'u',
  'v': 'v', 'w': 'w', 'x': 'x', 'y': 'y', 'z': 'z',
};

const SOUND_EXAMPLE_WORDS: Record<string, string> = {
  'a': 'apple', 'b': 'ball', 'c': 'cat', 'd': 'dog', 'e': 'egg',
  'f': 'fish', 'g': 'goat', 'h': 'hat', 'i': 'insect', 'j': 'jam',
  'k': 'kite', 'l': 'lamp', 'm': 'mop', 'n': 'net', 'o': 'octopus',
  'p': 'pig', 'q': 'queen', 'r': 'rat', 's': 'sun', 't': 'top',
  'u': 'umbrella', 'v': 'van', 'w': 'web', 'x': 'box', 'y': 'yak', 'z': 'zebra',
};

// Word sets for audio lookup
const PINK_WORDS = new Set([
  'cat', 'bat', 'hat', 'rat', 'mat', 'sat', 'fat', 'pat', 'van', 'ran', 'can', 'fan', 'man', 'pan', 'bag', 'tag',
  'bed', 'red', 'fed', 'let', 'met', 'net', 'pet', 'set', 'wet', 'hen', 'pen', 'ten', 'den', 'men',
  'bit', 'fit', 'hit', 'kit', 'lit', 'pit', 'sit', 'big', 'dig', 'fig', 'pig', 'wig', 'bin', 'fin', 'pin', 'dip', 'hip', 'lip', 'tip', 'zip',
  'box', 'fox', 'hot', 'lot', 'not', 'pot', 'rot', 'got', 'dog', 'fog', 'hog', 'jog', 'log', 'cop', 'hop', 'mop', 'top',
  'bug', 'dug', 'hug', 'jug', 'mug', 'rug', 'tug', 'bus', 'cut', 'hut', 'nut', 'put', 'sun', 'cup', 'pup', 'leg', 'peg',
  'map', 'cap', 'nap', 'tap', 'lap', 'gap', 'cot', 'dot', 'ham', 'jam', 'ram', 'yam', 'cab', 'dab', 'jab', 'lab', 'tab',
  'bib', 'rib', 'cob', 'gob', 'job', 'mob', 'rob', 'sob', 'cub', 'hub', 'pub', 'rub', 'sub', 'tub',
  'bud', 'cud', 'mud', 'bad', 'dad', 'had', 'lad', 'mad', 'pad', 'sad', 'wag', 'beg', 'keg', 'gum', 'hum', 'mum', 'sum', 'yum',
  'bun', 'fun', 'gun', 'nun', 'pun', 'run', 'dim', 'him', 'rim', 'vim', 'gym', 'hem', 'cod', 'god', 'mod', 'nod', 'pod', 'rod', 'sod',
  'apple', 'ball', 'egg', 'fish', 'goat', 'kite', 'lamp', 'queen', 'umbrella', 'web', 'yak', 'zebra', 'insect', 'octopus',
]);

const SIGHT_WORDS = new Set([
  'the', 'a', 'is', 'it', 'in', 'on', 'to', 'and', 'he', 'she', 'we', 'me', 'be',
  'my', 'you', 'do', 'no', 'so', 'go', 'of', 'or', 'for', 'are', 'was', 'his', 'her',
  'has', 'had', 'but', 'not', 'can', 'will', 'up', 'down', 'out', 'all', 'said', 'see',
  'look', 'come', 'here', 'there', 'where', 'what', 'when', 'who', 'how', 'this', 'that',
  'with', 'they', 'have', 'from', 'one', 'two', 'three', 'four', 'five',
]);

// ============================================
// LETTER SOUND FUNCTIONS - Using ElevenLabs
// ============================================

/**
 * Speak a letter's SOUND using ElevenLabs pre-recorded audio
 */
export function speakLetterSound(letter: string): void {
  const lowerLetter = letter.toLowerCase();
  GameAudio.playLetterNow(lowerLetter);
}

/**
 * Speak a letter sound followed by an example word
 */
export async function speakLetterWithExample(letter: string): Promise<void> {
  const lowerLetter = letter.toLowerCase();
  
  // Play letter sound
  await GameAudio.playLetter(lowerLetter);
  
  // Wait then play example word
  await new Promise(r => setTimeout(r, 300));
  
  const exampleWord = SOUND_EXAMPLE_WORDS[lowerLetter];
  if (exampleWord) {
    await playWordAudio(exampleWord);
  }
}

/**
 * Legacy function name - redirects to speakLetterSound
 */
export function speakLetter(letter: string): void {
  speakLetterSound(letter);
}

// ============================================
// WORD FUNCTIONS - Using ElevenLabs
// ============================================

/**
 * Play a word using pre-recorded audio
 */
async function playWordAudio(word: string): Promise<void> {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  
  if (SIGHT_WORDS.has(cleanWord)) {
    await GameAudio.playSightWord(cleanWord);
  } else if (PINK_WORDS.has(cleanWord)) {
    await GameAudio.playWord(cleanWord, 'pink');
  } else {
    // Try pink first, fall back silently
    try {
      await GameAudio.playWord(cleanWord, 'pink');
    } catch {
      console.warn(`Word "${cleanWord}" not in audio library`);
    }
  }
}

/**
 * Speak a word clearly using ElevenLabs
 */
export function speakWord(word: string): void {
  playWordAudio(word);
}

/**
 * Sound out a word letter by letter, then say the whole word
 */
export async function soundOutWord(word: string): Promise<void> {
  const letters = word.toLowerCase().split('');
  
  for (const letter of letters) {
    if (letter.match(/[a-z]/)) {
      await GameAudio.playLetter(letter);
      await new Promise(r => setTimeout(r, 400));
    }
  }
  
  // Say the whole word
  await new Promise(r => setTimeout(r, 500));
  await playWordAudio(word);
}

/**
 * Speak a sentence word by word
 */
export async function speakSentence(sentence: string): Promise<void> {
  const words = sentence.toLowerCase().split(/\s+/);
  
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord) {
      await playWordAudio(cleanWord);
      await new Promise(r => setTimeout(r, 300));
    }
  }
}

// ============================================
// GAME FEEDBACK SOUNDS - Using ElevenLabs UI sounds
// ============================================

/**
 * Play correct answer sound
 */
export function playCorrectSound(): void {
  GameAudio.playCorrect();
}

/**
 * Play wrong answer sound
 */
export function playWrongSound(): void {
  GameAudio.playWrong();
}

/**
 * Play click sound
 */
export function playClickSound(): void {
  GameAudio.playUI('click');
}

/**
 * Play celebration sound
 */
export function playCelebrationSound(): void {
  GameAudio.playCelebration();
}

// ============================================
// EXPORTS
// ============================================

export {
  LETTER_SOUNDS,
  SOUND_EXAMPLE_WORDS,
};
