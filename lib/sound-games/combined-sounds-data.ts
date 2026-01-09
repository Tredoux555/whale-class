// Combined I Spy Sound Game Data
// Words with clear beginning AND ending consonant sounds for phonics education

export interface CombinedSoundWord {
  word: string;
  image: string; // emoji
  beginSound: string; // e.g., 'c', 'b', 's'
  endSound: string; // e.g., 't', 'g', 'n'
  audioUrl: string;
}

export interface CombinedSoundRound {
  targetWord: CombinedSoundWord;
  distractors: CombinedSoundWord[]; // 3 wrong options
}

// WORD BANK - 35+ CVC words with clear consonant sounds
export const COMBINED_SOUND_WORDS: CombinedSoundWord[] = [
  // Animals
  { word: 'cat', image: '🐱', beginSound: 'c', endSound: 't', audioUrl: '/audio/sounds/cat.mp3' },
  { word: 'dog', image: '🐕', beginSound: 'd', endSound: 'g', audioUrl: '/audio/sounds/dog.mp3' },
  { word: 'pig', image: '🐷', beginSound: 'p', endSound: 'g', audioUrl: '/audio/sounds/pig.mp3' },
  { word: 'bug', image: '🐛', beginSound: 'b', endSound: 'g', audioUrl: '/audio/sounds/bug.mp3' },
  { word: 'fox', image: '🦊', beginSound: 'f', endSound: 'x', audioUrl: '/audio/sounds/fox.mp3' },
  { word: 'bat', image: '🦇', beginSound: 'b', endSound: 't', audioUrl: '/audio/sounds/bat.mp3' },
  { word: 'rat', image: '🐀', beginSound: 'r', endSound: 't', audioUrl: '/audio/sounds/rat.mp3' },
  { word: 'hen', image: '🐔', beginSound: 'h', endSound: 'n', audioUrl: '/audio/sounds/hen.mp3' },
  { word: 'cub', image: '🐻', beginSound: 'c', endSound: 'b', audioUrl: '/audio/sounds/cub.mp3' },
  { word: 'ram', image: '🐏', beginSound: 'r', endSound: 'm', audioUrl: '/audio/sounds/ram.mp3' },
  { word: 'leg', image: '🦵', beginSound: 'l', endSound: 'g', audioUrl: '/audio/sounds/leg.mp3' },
  
  // Objects & Things
  { word: 'bus', image: '🚌', beginSound: 'b', endSound: 's', audioUrl: '/audio/sounds/bus.mp3' },
  { word: 'sun', image: '☀️', beginSound: 's', endSound: 'n', audioUrl: '/audio/sounds/sun.mp3' },
  { word: 'pen', image: '🖊️', beginSound: 'p', endSound: 'n', audioUrl: '/audio/sounds/pen.mp3' },
  { word: 'cup', image: '☕', beginSound: 'c', endSound: 'p', audioUrl: '/audio/sounds/cup.mp3' },
  { word: 'hat', image: '🎩', beginSound: 'h', endSound: 't', audioUrl: '/audio/sounds/hat.mp3' },
  { word: 'bed', image: '🛏️', beginSound: 'b', endSound: 'd', audioUrl: '/audio/sounds/bed.mp3' },
  { word: 'map', image: '🗺️', beginSound: 'm', endSound: 'p', audioUrl: '/audio/sounds/map.mp3' },
  { word: 'box', image: '📦', beginSound: 'b', endSound: 'x', audioUrl: '/audio/sounds/box.mp3' },
  { word: 'net', image: '🥅', beginSound: 'n', endSound: 't', audioUrl: '/audio/sounds/net.mp3' },
  { word: 'jam', image: '🍯', beginSound: 'j', endSound: 'm', audioUrl: '/audio/sounds/jam.mp3' },
  { word: 'van', image: '🚐', beginSound: 'v', endSound: 'n', audioUrl: '/audio/sounds/van.mp3' },
  { word: 'web', image: '🕸️', beginSound: 'w', endSound: 'b', audioUrl: '/audio/sounds/web.mp3' },
  { word: 'jet', image: '✈️', beginSound: 'j', endSound: 't', audioUrl: '/audio/sounds/jet.mp3' },
  { word: 'fan', image: '🪭', beginSound: 'f', endSound: 'n', audioUrl: '/audio/sounds/fan.mp3' },
  { word: 'can', image: '🥫', beginSound: 'c', endSound: 'n', audioUrl: '/audio/sounds/can.mp3' },
  { word: 'pan', image: '🍳', beginSound: 'p', endSound: 'n', audioUrl: '/audio/sounds/pan.mp3' },
  { word: 'mud', image: '🟫', beginSound: 'm', endSound: 'd', audioUrl: '/audio/sounds/mud.mp3' },
  { word: 'bib', image: '👶', beginSound: 'b', endSound: 'b', audioUrl: '/audio/sounds/bib.mp3' },
  { word: 'rug', image: '🧶', beginSound: 'r', endSound: 'g', audioUrl: '/audio/sounds/rug.mp3' },
  { word: 'hug', image: '🤗', beginSound: 'h', endSound: 'g', audioUrl: '/audio/sounds/hug.mp3' },
  { word: 'mop', image: '🧹', beginSound: 'm', endSound: 'p', audioUrl: '/audio/sounds/mop.mp3' },
  { word: 'top', image: '🔝', beginSound: 't', endSound: 'p', audioUrl: '/audio/sounds/top.mp3' },
  { word: 'pot', image: '🍲', beginSound: 'p', endSound: 't', audioUrl: '/audio/sounds/pot.mp3' },
  { word: 'jug', image: '🫖', beginSound: 'j', endSound: 'g', audioUrl: '/audio/sounds/jug.mp3' },
  { word: 'tub', image: '🛁', beginSound: 't', endSound: 'b', audioUrl: '/audio/sounds/tub.mp3' },
  { word: 'pin', image: '📍', beginSound: 'p', endSound: 'n', audioUrl: '/audio/sounds/pin.mp3' },
  { word: 'log', image: '🪵', beginSound: 'l', endSound: 'g', audioUrl: '/audio/sounds/log.mp3' },
  { word: 'gum', image: '🫧', beginSound: 'g', endSound: 'm', audioUrl: '/audio/sounds/gum.mp3' },
  { word: 'bun', image: '🍞', beginSound: 'b', endSound: 'n', audioUrl: '/audio/sounds/bun.mp3' },
  { word: 'zip', image: '🤐', beginSound: 'z', endSound: 'p', audioUrl: '/audio/sounds/zip.mp3' },
  { word: 'six', image: '6️⃣', beginSound: 's', endSound: 'x', audioUrl: '/audio/sounds/six.mp3' },
  { word: 'wig', image: '💇', beginSound: 'w', endSound: 'g', audioUrl: '/audio/sounds/wig.mp3' },
  { word: 'cod', image: '🐟', beginSound: 'c', endSound: 'd', audioUrl: '/audio/sounds/cod.mp3' },
  { word: 'sob', image: '😢', beginSound: 's', endSound: 'b', audioUrl: '/audio/sounds/sob.mp3' },
];

// Generate rounds with smart distractor selection
export const generateRound = (usedWords: Set<string>): CombinedSoundRound | null => {
  // Find unused target word
  const available = COMBINED_SOUND_WORDS.filter(w => !usedWords.has(w.word));
  if (available.length < 4) return null;
  
  const target = available[Math.floor(Math.random() * available.length)];
  
  // Select distractors with varying difficulty
  // Prefer words that share exactly one sound (harder) mixed with words that share neither
  const sharesBeginOnly = COMBINED_SOUND_WORDS.filter(w => 
    w.word !== target.word && 
    w.beginSound === target.beginSound && 
    w.endSound !== target.endSound
  );
  
  const sharesEndOnly = COMBINED_SOUND_WORDS.filter(w => 
    w.word !== target.word && 
    w.beginSound !== target.beginSound && 
    w.endSound === target.endSound
  );
  
  const sharesNeither = COMBINED_SOUND_WORDS.filter(w => 
    w.word !== target.word && 
    w.beginSound !== target.beginSound && 
    w.endSound !== target.endSound
  );
  
  // Build distractors: try to get 1 that shares begin, 1 that shares end, 1 that shares neither
  const distractors: CombinedSoundWord[] = [];
  
  if (sharesBeginOnly.length > 0) {
    distractors.push(sharesBeginOnly[Math.floor(Math.random() * sharesBeginOnly.length)]);
  }
  if (sharesEndOnly.length > 0 && distractors.length < 3) {
    const available = sharesEndOnly.filter(w => !distractors.some(d => d.word === w.word));
    if (available.length > 0) {
      distractors.push(available[Math.floor(Math.random() * available.length)]);
    }
  }
  
  // Fill remaining slots with words that share neither
  while (distractors.length < 3 && sharesNeither.length > 0) {
    const available = sharesNeither.filter(w => !distractors.some(d => d.word === w.word));
    if (available.length === 0) break;
    distractors.push(available[Math.floor(Math.random() * available.length)]);
  }
  
  // If still not enough, use any remaining words
  if (distractors.length < 3) {
    const remaining = COMBINED_SOUND_WORDS.filter(w => 
      w.word !== target.word && 
      !distractors.some(d => d.word === w.word) &&
      !(w.beginSound === target.beginSound && w.endSound === target.endSound)
    );
    while (distractors.length < 3 && remaining.length > 0) {
      const idx = Math.floor(Math.random() * remaining.length);
      distractors.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }
  
  if (distractors.length < 3) return null;
  
  return { targetWord: target, distractors };
};

// Get phonetic pronunciation for display
export const getPhonetic = (sound: string): string => {
  const phonetics: Record<string, string> = {
    'b': '/b/',
    'c': '/k/',
    'd': '/d/',
    'f': '/f/',
    'g': '/g/',
    'h': '/h/',
    'j': '/j/',
    'l': '/l/',
    'm': '/m/',
    'n': '/n/',
    'p': '/p/',
    'r': '/r/',
    's': '/s/',
    't': '/t/',
    'v': '/v/',
    'w': '/w/',
    'x': '/ks/',
    'z': '/z/',
  };
  return phonetics[sound] || `/${sound}/`;
};

// Shuffle helper for randomizing options
export const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
