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
  // Consonants - using /audio-new/letters/ folder
  's': '/audio-new/letters/s.mp3',
  'm': '/audio-new/letters/m.mp3',
  'f': '/audio-new/letters/f.mp3',
  'n': '/audio-new/letters/n.mp3',
  'p': '/audio-new/letters/p.mp3',
  't': '/audio-new/letters/t.mp3',
  'k': '/audio-new/letters/k.mp3', // for 'c' sound
  'c': '/audio-new/letters/c.mp3',
  'h': '/audio-new/letters/h.mp3',
  'b': '/audio-new/letters/b.mp3',
  'd': '/audio-new/letters/d.mp3',
  'g': '/audio-new/letters/g.mp3',
  'j': '/audio-new/letters/j.mp3',
  'w': '/audio-new/letters/w.mp3',
  'v': '/audio-new/letters/v.mp3',
  'r': '/audio-new/letters/r.mp3',
  'l': '/audio-new/letters/l.mp3',
  'z': '/audio-new/letters/z.mp3',
  'y': '/audio-new/letters/y.mp3',
  'x': '/audio-new/letters/x.mp3',
  'q': '/audio-new/letters/q.mp3',
  // Digraphs
  'sh': '/audio-new/phonemes/sh.mp3',
  'ch': '/audio-new/phonemes/ch.mp3',
  'th': '/audio-new/phonemes/th.mp3',
  // Short vowels
  'a': '/audio-new/letters/a.mp3',
  'e': '/audio-new/letters/e.mp3',
  'i': '/audio-new/letters/i.mp3',
  'o': '/audio-new/letters/o.mp3',
  'u': '/audio-new/letters/u.mp3',
};

// ============================================
// BEGINNING SOUNDS DATA
// Phase 1: Easy (exist in Mandarin)
// Phase 2: Medium
// Phase 3: Hard (ESL challenge - don't exist in Mandarin)
// ============================================

export const BEGINNING_SOUNDS: SoundGroup[] = [
  // ========== PHASE 1: Easy Sounds ==========
  {
    sound: 's',
    phase: 1,
    words: [
      { word: 'sun', image: '☀️' },
      { word: 'sock', image: '🧦' },
      { word: 'soap', image: '🧼' },
      { word: 'star', image: '⭐' },
      { word: 'snake', image: '🐍' },
      { word: 'spoon', image: '🥄' },
    ],
  },
  {
    sound: 'm',
    phase: 1,
    words: [
      { word: 'mop', image: '🧹' },
      { word: 'moon', image: '🌙' },
      { word: 'mouse', image: '🐭' },
      { word: 'mat', image: '🟫' },
      { word: 'mug', image: '☕' },
      { word: 'milk', image: '🥛' },
    ],
  },
  {
    sound: 'f',
    phase: 1,
    words: [
      { word: 'fan', image: '🪭' },
      { word: 'fish', image: '🐟' },
      { word: 'fork', image: '🍴' },
      { word: 'frog', image: '🐸' },
      { word: 'fox', image: '🦊' },
      { word: 'foot', image: '🦶' },
    ],
  },
  {
    sound: 'n',
    phase: 1,
    words: [
      { word: 'net', image: '🥅' },
      { word: 'nut', image: '🥜' },
      { word: 'nose', image: '👃' },
      { word: 'nest', image: '🪺' },
      { word: 'nine', image: '9️⃣' },
      { word: 'nurse', image: '👩‍⚕️' },
    ],
  },
  {
    sound: 'p',
    phase: 1,
    words: [
      { word: 'pen', image: '🖊️' },
      { word: 'pig', image: '🐷' },
      { word: 'pot', image: '🍯' },
      { word: 'pan', image: '🍳' },
      { word: 'pear', image: '🍐' },
      { word: 'pink', image: '💗' },
    ],
  },
  {
    sound: 't',
    phase: 1,
    words: [
      { word: 'top', image: '🔝' },
      { word: 'tent', image: '⛺' },
      { word: 'tiger', image: '🐯' },
      { word: 'toy', image: '🧸' },
      { word: 'tree', image: '🌳' },
      { word: 'two', image: '2️⃣' },
    ],
  },
  {
    sound: 'c',
    phase: 1,
    words: [
      { word: 'cup', image: '🥤' },
      { word: 'cat', image: '🐱' },
      { word: 'car', image: '🚗' },
      { word: 'cap', image: '🧢' },
      { word: 'cow', image: '🐄' },
      { word: 'cake', image: '🎂' },
    ],
  },
  {
    sound: 'h',
    phase: 1,
    words: [
      { word: 'hat', image: '🎩' },
      { word: 'hen', image: '🐔' },
      { word: 'horse', image: '🐴' },
      { word: 'house', image: '🏠' },
      { word: 'hand', image: '✋' },
      { word: 'heart', image: '❤️' },
    ],
  },

  // ========== PHASE 2: Medium Sounds ==========
  {
    sound: 'b',
    phase: 2,
    words: [
      { word: 'ball', image: '⚽' },
      { word: 'bat', image: '🦇' },
      { word: 'bed', image: '🛏️' },
      { word: 'bus', image: '🚌' },
      { word: 'bug', image: '🐛' },
      { word: 'book', image: '📖' },
    ],
  },
  {
    sound: 'd',
    phase: 2,
    words: [
      { word: 'dog', image: '🐕' },
      { word: 'doll', image: '🪆' },
      { word: 'duck', image: '🦆' },
      { word: 'door', image: '🚪' },
      { word: 'dish', image: '🍽️' },
      { word: 'drum', image: '🥁' },
    ],
  },
  {
    sound: 'g',
    phase: 2,
    words: [
      { word: 'goat', image: '🐐' },
      { word: 'gift', image: '🎁' },
      { word: 'girl', image: '👧' },
      { word: 'grape', image: '🍇' },
      { word: 'green', image: '💚' },
      { word: 'gum', image: '🫧' },
    ],
  },
  {
    sound: 'j',
    phase: 2,
    words: [
      { word: 'jet', image: '✈️' },
      { word: 'jam', image: '🫙' },
      { word: 'jar', image: '🏺' },
      { word: 'jump', image: '🦘' },
      { word: 'jeans', image: '👖' },
      { word: 'juice', image: '🧃' },
    ],
  },
  {
    sound: 'w',
    phase: 2,
    words: [
      { word: 'web', image: '🕸️' },
      { word: 'watch', image: '⌚' },
      { word: 'worm', image: '🪱' },
      { word: 'wolf', image: '🐺' },
      { word: 'water', image: '💧' },
      { word: 'wing', image: '🪽' },
    ],
  },
  {
    sound: 'y',
    phase: 2,
    words: [
      { word: 'yak', image: '🦬' },
      { word: 'yam', image: '🍠' },
      { word: 'yarn', image: '🧶' },
      { word: 'yell', image: '🗣️' },
      { word: 'yellow', image: '💛' },
      { word: 'yo-yo', image: '🪀' },
    ],
  },

  // ========== PHASE 3: Hard Sounds (ESL Focus) ==========
  {
    sound: 'v',
    phase: 3,
    words: [
      { word: 'van', image: '🚐' },
      { word: 'vest', image: '🦺' },
      { word: 'vase', image: '🏺' },
      { word: 'vet', image: '👨‍⚕️' },
      { word: 'vine', image: '🌿' },
      { word: 'violin', image: '🎻' },
    ],
    eslNote: 'Teeth on bottom lip! Different from /w/!',
  },
  {
    sound: 'th',
    phase: 3,
    words: [
      { word: 'thumb', image: '👍' },
      { word: 'three', image: '3️⃣' },
      { word: 'thick', image: '📦' },
      { word: 'thin', image: '📄' },
      { word: 'think', image: '🤔' },
      { word: 'throw', image: '🤾' },
    ],
    eslNote: 'Tongue between teeth! Stick it out!',
  },
  {
    sound: 'r',
    phase: 3,
    words: [
      { word: 'ring', image: '💍' },
      { word: 'rug', image: '🟫' },
      { word: 'rat', image: '🐀' },
      { word: 'rain', image: '🌧️' },
      { word: 'rabbit', image: '🐰' },
      { word: 'red', image: '❤️' },
    ],
    eslNote: 'Tongue curled BACK! Not touching roof! Different from /l/!',
  },
  {
    sound: 'l',
    phase: 3,
    words: [
      { word: 'leg', image: '🦵' },
      { word: 'lamp', image: '💡' },
      { word: 'leaf', image: '🍃' },
      { word: 'log', image: '🪵' },
      { word: 'lip', image: '👄' },
      { word: 'lemon', image: '🍋' },
    ],
    eslNote: 'Tongue touches roof of mouth! Different from /r/!',
  },
  {
    sound: 'z',
    phase: 3,
    words: [
      { word: 'zip', image: '🤐' },
      { word: 'zoo', image: '🦁' },
      { word: 'zebra', image: '🦓' },
      { word: 'zero', image: '0️⃣' },
      { word: 'zigzag', image: '⚡' },
      { word: 'zone', image: '🚧' },
    ],
    eslNote: 'Buzzy /s/ sound! Voice it!',
  },
  {
    sound: 'sh',
    phase: 3,
    words: [
      { word: 'ship', image: '🚢' },
      { word: 'shell', image: '🐚' },
      { word: 'shoe', image: '👟' },
      { word: 'sheep', image: '🐑' },
      { word: 'shirt', image: '👕' },
      { word: 'shop', image: '🏪' },
    ],
    eslNote: 'Lips rounded! Shhhhh!',
  },
  {
    sound: 'ch',
    phase: 3,
    words: [
      { word: 'chair', image: '🪑' },
      { word: 'cheese', image: '🧀' },
      { word: 'chicken', image: '🐔' },
      { word: 'chip', image: '🍟' },
      { word: 'cherry', image: '🍒' },
      { word: 'chin', image: '😊' },
    ],
    eslNote: 'Like /t/ + /sh/ together! Choo choo!',
  },

  // ========== VOWELS (Short Sounds) ==========
  {
    sound: 'a',
    phase: 'vowel',
    words: [
      { word: 'ant', image: '🐜' },
      { word: 'apple', image: '🍎' },
      { word: 'alligator', image: '🐊' },
      { word: 'ax', image: '🪓' },
      { word: 'add', image: '➕' },
      { word: 'arrow', image: '➡️' },
    ],
  },
  {
    sound: 'e',
    phase: 'vowel',
    words: [
      { word: 'egg', image: '🥚' },
      { word: 'elephant', image: '🐘' },
      { word: 'elbow', image: '💪' },
      { word: 'envelope', image: '✉️' },
      { word: 'elf', image: '🧝' },
      { word: 'end', image: '🔚' },
    ],
  },
  {
    sound: 'i',
    phase: 'vowel',
    words: [
      { word: 'igloo', image: '🏠' },
      { word: 'insect', image: '🐛' },
      { word: 'ink', image: '🖋️' },
      { word: 'itch', image: '😖' },
      { word: 'in', image: '📥' },
      { word: 'ill', image: '🤒' },
    ],
  },
  {
    sound: 'o',
    phase: 'vowel',
    words: [
      { word: 'octopus', image: '🐙' },
      { word: 'orange', image: '🍊' },
      { word: 'ostrich', image: '🦩' },
      { word: 'olive', image: '🫒' },
      { word: 'on', image: '🔛' },
      { word: 'ox', image: '🐂' },
    ],
  },
  {
    sound: 'u',
    phase: 'vowel',
    words: [
      { word: 'umbrella', image: '☂️' },
      { word: 'up', image: '⬆️' },
      { word: 'under', image: '⬇️' },
      { word: 'us', image: '👥' },
      { word: 'uncle', image: '👨' },
      { word: 'umpire', image: '🧑‍⚖️' },
    ],
  },
];

// ============================================
// ENDING SOUNDS DATA
// ============================================

export const ENDING_SOUNDS: EndingSoundGroup[] = [
  {
    sound: 't',
    words: [
      { word: 'cat', image: '🐱' },
      { word: 'hat', image: '🎩' },
      { word: 'bat', image: '🦇' },
      { word: 'pot', image: '🍯' },
      { word: 'net', image: '🥅' },
      { word: 'rat', image: '🐀' },
    ],
    note: 'Most common CVC ending',
  },
  {
    sound: 'p',
    words: [
      { word: 'cup', image: '🥤' },
      { word: 'cap', image: '🧢' },
      { word: 'mop', image: '🧹' },
      { word: 'map', image: '🗺️' },
      { word: 'top', image: '🔝' },
      { word: 'hop', image: '🐰' },
    ],
    note: 'Clear stop sound',
  },
  {
    sound: 'n',
    words: [
      { word: 'sun', image: '☀️' },
      { word: 'pan', image: '🍳' },
      { word: 'can', image: '🥫' },
      { word: 'fan', image: '🪭' },
      { word: 'pen', image: '🖊️' },
      { word: 'run', image: '🏃' },
    ],
    note: 'Continuous sound - easy to hear',
  },
  {
    sound: 'g',
    words: [
      { word: 'dog', image: '🐕' },
      { word: 'pig', image: '🐷' },
      { word: 'bag', image: '👜' },
      { word: 'rug', image: '🟫' },
      { word: 'bug', image: '🐛' },
      { word: 'hug', image: '🤗' },
    ],
    note: 'Voiced stop',
  },
  {
    sound: 'd',
    words: [
      { word: 'bed', image: '🛏️' },
      { word: 'red', image: '❤️' },
      { word: 'lid', image: '🫙' },
      { word: 'mud', image: '🟤' },
      { word: 'bud', image: '🌸' },
      { word: 'sad', image: '😢' },
    ],
    note: 'Voiced - harder than /t/',
  },
  {
    sound: 'x',
    words: [
      { word: 'box', image: '📦' },
      { word: 'fox', image: '🦊' },
      { word: 'six', image: '6️⃣' },
      { word: 'wax', image: '🕯️' },
      { word: 'mix', image: '🥣' },
      { word: 'ax', image: '🪓' },
    ],
    note: 'Actually /ks/ blend',
  },
];

// ============================================
// CVC WORDS FOR MIDDLE SOUNDS
// ============================================

export const CVC_WORDS: CVCWord[] = [
  // Short A
  { word: 'cat', image: '🐱', middleSound: 'a', sounds: ['c', 'a', 't'] },
  { word: 'hat', image: '🎩', middleSound: 'a', sounds: ['h', 'a', 't'] },
  { word: 'bat', image: '🦇', middleSound: 'a', sounds: ['b', 'a', 't'] },
  { word: 'mat', image: '🟫', middleSound: 'a', sounds: ['m', 'a', 't'] },
  { word: 'can', image: '🥫', middleSound: 'a', sounds: ['c', 'a', 'n'] },
  { word: 'pan', image: '🍳', middleSound: 'a', sounds: ['p', 'a', 'n'] },
  { word: 'map', image: '🗺️', middleSound: 'a', sounds: ['m', 'a', 'p'] },
  { word: 'bag', image: '👜', middleSound: 'a', sounds: ['b', 'a', 'g'] },

  // Short E
  { word: 'bed', image: '🛏️', middleSound: 'e', sounds: ['b', 'e', 'd'] },
  { word: 'red', image: '❤️', middleSound: 'e', sounds: ['r', 'e', 'd'] },
  { word: 'pen', image: '🖊️', middleSound: 'e', sounds: ['p', 'e', 'n'] },
  { word: 'hen', image: '🐔', middleSound: 'e', sounds: ['h', 'e', 'n'] },
  { word: 'net', image: '🥅', middleSound: 'e', sounds: ['n', 'e', 't'] },
  { word: 'wet', image: '💧', middleSound: 'e', sounds: ['w', 'e', 't'] },
  { word: 'leg', image: '🦵', middleSound: 'e', sounds: ['l', 'e', 'g'] },
  { word: 'peg', image: '📌', middleSound: 'e', sounds: ['p', 'e', 'g'] },

  // Short I
  { word: 'pig', image: '🐷', middleSound: 'i', sounds: ['p', 'i', 'g'] },
  { word: 'wig', image: '💇', middleSound: 'i', sounds: ['w', 'i', 'g'] },
  { word: 'big', image: '🐘', middleSound: 'i', sounds: ['b', 'i', 'g'] },
  { word: 'dig', image: '⛏️', middleSound: 'i', sounds: ['d', 'i', 'g'] },
  { word: 'pin', image: '📍', middleSound: 'i', sounds: ['p', 'i', 'n'] },
  { word: 'bin', image: '🗑️', middleSound: 'i', sounds: ['b', 'i', 'n'] },
  { word: 'sit', image: '🪑', middleSound: 'i', sounds: ['s', 'i', 't'] },
  { word: 'hit', image: '👊', middleSound: 'i', sounds: ['h', 'i', 't'] },

  // Short O
  { word: 'dog', image: '🐕', middleSound: 'o', sounds: ['d', 'o', 'g'] },
  { word: 'log', image: '🪵', middleSound: 'o', sounds: ['l', 'o', 'g'] },
  { word: 'pot', image: '🍯', middleSound: 'o', sounds: ['p', 'o', 't'] },
  { word: 'hot', image: '🔥', middleSound: 'o', sounds: ['h', 'o', 't'] },
  { word: 'mop', image: '🧹', middleSound: 'o', sounds: ['m', 'o', 'p'] },
  { word: 'top', image: '🔝', middleSound: 'o', sounds: ['t', 'o', 'p'] },
  { word: 'box', image: '📦', middleSound: 'o', sounds: ['b', 'o', 'x'] },
  { word: 'fox', image: '🦊', middleSound: 'o', sounds: ['f', 'o', 'x'] },

  // Short U
  { word: 'cup', image: '🥤', middleSound: 'u', sounds: ['c', 'u', 'p'] },
  { word: 'pup', image: '🐕', middleSound: 'u', sounds: ['p', 'u', 'p'] },
  { word: 'bus', image: '🚌', middleSound: 'u', sounds: ['b', 'u', 's'] },
  { word: 'nut', image: '🥜', middleSound: 'u', sounds: ['n', 'u', 't'] },
  { word: 'hut', image: '🛖', middleSound: 'u', sounds: ['h', 'u', 't'] },
  { word: 'bug', image: '🐛', middleSound: 'u', sounds: ['b', 'u', 'g'] },
  { word: 'rug', image: '🟫', middleSound: 'u', sounds: ['r', 'u', 'g'] },
  { word: 'sun', image: '☀️', middleSound: 'u', sounds: ['s', 'u', 'n'] },
];

// ============================================
// VOWEL COLORS (for Middle Sound game)
// No letters shown - just colors!
// ============================================

export const VOWEL_COLORS: Record<string, { color: string; label: string }> = {
  a: { color: '#ef4444', label: 'Red - Apple sound' },    // red
  e: { color: '#3b82f6', label: 'Blue - Egg sound' },     // blue
  i: { color: '#22c55e', label: 'Green - Igloo sound' },  // green
  o: { color: '#eab308', label: 'Yellow - Octopus sound' }, // yellow
  u: { color: '#a855f7', label: 'Purple - Umbrella sound' }, // purple
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getSoundsByPhase(phase: 1 | 2 | 3 | 'vowel'): SoundGroup[] {
  return BEGINNING_SOUNDS.filter(s => s.phase === phase);
}

export function getAllConsonants(): SoundGroup[] {
  return BEGINNING_SOUNDS.filter(s => s.phase !== 'vowel');
}

export function getCVCByVowel(vowel: 'a' | 'e' | 'i' | 'o' | 'u'): CVCWord[] {
  return CVC_WORDS.filter(w => w.middleSound === vowel);
}

export function getRandomWords(
  soundGroup: SoundGroup,
  count: number,
  exclude?: string[]
): SoundWord[] {
  const available = soundGroup.words.filter(
    w => !exclude?.includes(w.word)
  );
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getDistractorWords(
  targetSound: string,
  count: number
): SoundWord[] {
  // Get words from OTHER sounds (not the target)
  const otherSounds = BEGINNING_SOUNDS.filter(s => s.sound !== targetSound);
  const allOtherWords = otherSounds.flatMap(s => s.words);
  const shuffled = [...allOtherWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
