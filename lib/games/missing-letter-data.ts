// lib/games/missing-letter-data.ts
// Missing Letter Game - Level-based CVC word progression

export interface MissingLetterWord {
  word: string;
  missing: number; // Index of missing letter (0, 1, or 2)
  image: string;
  audioUrl: string;
}

export const MISSING_LETTER_WORDS = {
  // Level 1: Short A words (-at family)
  level1: [
    { word: 'cat', missing: 1, image: '🐱', audioUrl: '/audio/words/pink/cat.mp3' },
    { word: 'hat', missing: 0, image: '🎩', audioUrl: '/audio/words/pink/hat.mp3' },
    { word: 'bat', missing: 0, image: '🦇', audioUrl: '/audio/words/pink/bat.mp3' },
    { word: 'rat', missing: 0, image: '🐀', audioUrl: '/audio/words/pink/rat.mp3' },
    { word: 'mat', missing: 0, image: '🧺', audioUrl: '/audio/words/pink/mat.mp3' },
    { word: 'sat', missing: 0, image: '🪑', audioUrl: '/audio/words/pink/sat.mp3' },
    { word: 'can', missing: 1, image: '🥫', audioUrl: '/audio/words/pink/can.mp3' },
    { word: 'man', missing: 0, image: '👨', audioUrl: '/audio/words/pink/man.mp3' },
  ],
  // Level 2: More Short A (-an, -ap family)
  level2: [
    { word: 'pan', missing: 0, image: '🍳', audioUrl: '/audio/words/pink/pan.mp3' },
    { word: 'fan', missing: 0, image: '🌀', audioUrl: '/audio/words/pink/fan.mp3' },
    { word: 'van', missing: 0, image: '🚐', audioUrl: '/audio/words/pink/van.mp3' },
    { word: 'ran', missing: 0, image: '🏃', audioUrl: '/audio/words/pink/ran.mp3' },
    { word: 'cap', missing: 1, image: '🧢', audioUrl: '/audio/words/pink/cap.mp3' },
    { word: 'map', missing: 0, image: '🗺️', audioUrl: '/audio/words/pink/map.mp3' },
    { word: 'tap', missing: 0, image: '🚰', audioUrl: '/audio/words/pink/tap.mp3' },
    { word: 'nap', missing: 0, image: '😴', audioUrl: '/audio/words/pink/nap.mp3' },
  ],
  // Level 3: Short I words (-it, -ig family)
  level3: [
    { word: 'sit', missing: 1, image: '🪑', audioUrl: '/audio/words/pink/sit.mp3' },
    { word: 'hit', missing: 0, image: '👊', audioUrl: '/audio/words/pink/hit.mp3' },
    { word: 'bit', missing: 0, image: '🔢', audioUrl: '/audio/words/pink/bit.mp3' },
    { word: 'fit', missing: 0, image: '✅', audioUrl: '/audio/words/pink/fit.mp3' },
    { word: 'pig', missing: 1, image: '🐷', audioUrl: '/audio/words/pink/pig.mp3' },
    { word: 'big', missing: 0, image: '🔴', audioUrl: '/audio/words/pink/big.mp3' },
    { word: 'dig', missing: 0, image: '⛏️', audioUrl: '/audio/words/pink/dig.mp3' },
    { word: 'wig', missing: 0, image: '👑', audioUrl: '/audio/words/pink/wig.mp3' },
  ],
  // Level 4: More Short I (-in, -ip family)
  level4: [
    { word: 'pin', missing: 1, image: '📌', audioUrl: '/audio/words/pink/pin.mp3' },
    { word: 'bin', missing: 0, image: '🗑️', audioUrl: '/audio/words/pink/bin.mp3' },
    { word: 'fin', missing: 0, image: '🐟', audioUrl: '/audio/words/pink/fin.mp3' },
    { word: 'win', missing: 0, image: '🏆', audioUrl: '/audio/words/pink/win.mp3' },
    { word: 'lip', missing: 1, image: '👄', audioUrl: '/audio/words/pink/lip.mp3' },
    { word: 'dip', missing: 0, image: '🍯', audioUrl: '/audio/words/pink/dip.mp3' },
    { word: 'sip', missing: 0, image: '☕', audioUrl: '/audio/words/pink/sip.mp3' },
    { word: 'tip', missing: 0, image: '💡', audioUrl: '/audio/words/pink/tip.mp3' },
  ],
  // Level 5: Short O words (-ot, -og family)
  level5: [
    { word: 'hot', missing: 1, image: '🔥', audioUrl: '/audio/words/pink/hot.mp3' },
    { word: 'pot', missing: 0, image: '🍲', audioUrl: '/audio/words/pink/pot.mp3' },
    { word: 'dot', missing: 0, image: '⚫', audioUrl: '/audio/words/pink/dot.mp3' },
    { word: 'cot', missing: 0, image: '🛏️', audioUrl: '/audio/words/pink/cot.mp3' },
    { word: 'dog', missing: 1, image: '🐕', audioUrl: '/audio/words/pink/dog.mp3' },
    { word: 'log', missing: 0, image: '🪵', audioUrl: '/audio/words/pink/log.mp3' },
    { word: 'fog', missing: 0, image: '🌫️', audioUrl: '/audio/words/pink/fog.mp3' },
    { word: 'hog', missing: 0, image: '🐷', audioUrl: '/audio/words/pink/hog.mp3' },
  ],
  // Level 6: Short U words (-un, -up, -ug family)
  level6: [
    { word: 'cup', missing: 1, image: '🥤', audioUrl: '/audio/words/pink/cup.mp3' },
    { word: 'pup', missing: 0, image: '🐶', audioUrl: '/audio/words/pink/pup.mp3' },
    { word: 'sun', missing: 1, image: '☀️', audioUrl: '/audio/words/pink/sun.mp3' },
    { word: 'run', missing: 0, image: '🏃', audioUrl: '/audio/words/pink/run.mp3' },
    { word: 'fun', missing: 0, image: '🎉', audioUrl: '/audio/words/pink/fun.mp3' },
    { word: 'bun', missing: 0, image: '🍞', audioUrl: '/audio/words/pink/bun.mp3' },
    { word: 'bug', missing: 1, image: '🐛', audioUrl: '/audio/words/pink/bug.mp3' },
    { word: 'rug', missing: 0, image: '🧶', audioUrl: '/audio/words/pink/rug.mp3' },
  ],
  // Level 7: Short E words (-ed, -en family)
  level7: [
    { word: 'bed', missing: 1, image: '🛏️', audioUrl: '/audio/words/pink/bed.mp3' },
    { word: 'red', missing: 0, image: '🔴', audioUrl: '/audio/words/pink/red.mp3' },
    { word: 'leg', missing: 1, image: '🦵', audioUrl: '/audio/words/pink/leg.mp3' },
    { word: 'peg', missing: 0, image: '📎', audioUrl: '/audio/words/pink/peg.mp3' },
    { word: 'pen', missing: 1, image: '🖊️', audioUrl: '/audio/words/pink/pen.mp3' },
    { word: 'hen', missing: 0, image: '🐔', audioUrl: '/audio/words/pink/hen.mp3' },
    { word: 'ten', missing: 0, image: '🔟', audioUrl: '/audio/words/pink/ten.mp3' },
    { word: 'men', missing: 0, image: '👨', audioUrl: '/audio/words/pink/men.mp3' },
  ],
  // Level 8: Mixed Review
  level8: [
    { word: 'jet', missing: 1, image: '✈️', audioUrl: '/audio/words/pink/jet.mp3' },
    { word: 'net', missing: 0, image: '🥅', audioUrl: '/audio/words/pink/net.mp3' },
    { word: 'wet', missing: 0, image: '💧', audioUrl: '/audio/words/pink/wet.mp3' },
    { word: 'pet', missing: 0, image: '🐕', audioUrl: '/audio/words/pink/pet.mp3' },
    { word: 'box', missing: 1, image: '📦', audioUrl: '/audio/words/pink/box.mp3' },
    { word: 'fox', missing: 0, image: '🦊', audioUrl: '/audio/words/pink/fox.mp3' },
    { word: 'mix', missing: 1, image: '🥄', audioUrl: '/audio/words/pink/mix.mp3' },
    { word: 'six', missing: 0, image: '6️⃣', audioUrl: '/audio/words/pink/six.mp3' },
  ],
};

// Get words for a specific level (1-8)
export function getMissingLetterLevel(level: number): MissingLetterWord[] {
  const key = `level${level}` as keyof typeof MISSING_LETTER_WORDS;
  return MISSING_LETTER_WORDS[key] || MISSING_LETTER_WORDS.level1;
}

// Get all words flattened
export function getAllMissingLetterWords(): MissingLetterWord[] {
  return Object.values(MISSING_LETTER_WORDS).flat();
}





