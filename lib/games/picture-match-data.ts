// lib/games/picture-match-data.ts
// Picture Match Game - Level-based CVC word progression

import { WordData } from './game-data';

export const PICTURE_MATCH_SETS = {
  // Level 1: -at family
  level1: [
    { word: 'cat', image: '🐱', audioUrl: '/audio/words/pink/cat.mp3' },
    { word: 'hat', image: '🎩', audioUrl: '/audio/words/pink/hat.mp3' },
    { word: 'bat', image: '🦇', audioUrl: '/audio/words/pink/bat.mp3' },
    { word: 'rat', image: '🐀', audioUrl: '/audio/words/pink/rat.mp3' },
    { word: 'mat', image: '🧺', audioUrl: '/audio/words/pink/mat.mp3' },
    { word: 'sat', image: '🪑', audioUrl: '/audio/words/pink/sat.mp3' },
    { word: 'fat', image: '🐷', audioUrl: '/audio/words/pink/fat.mp3' },
    { word: 'pat', image: '👋', audioUrl: '/audio/words/pink/pat.mp3' },
  ],
  // Level 2: -an family
  level2: [
    { word: 'can', image: '🥫', audioUrl: '/audio/words/pink/can.mp3' },
    { word: 'man', image: '👨', audioUrl: '/audio/words/pink/man.mp3' },
    { word: 'pan', image: '🍳', audioUrl: '/audio/words/pink/pan.mp3' },
    { word: 'fan', image: '🌀', audioUrl: '/audio/words/pink/fan.mp3' },
    { word: 'van', image: '🚐', audioUrl: '/audio/words/pink/van.mp3' },
    { word: 'ran', image: '🏃', audioUrl: '/audio/words/pink/ran.mp3' },
    { word: 'tan', image: '🧴', audioUrl: '/audio/words/pink/tan.mp3' },
    { word: 'ban', image: '🚫', audioUrl: '/audio/words/pink/ban.mp3' },
  ],
  // Level 3: -ig family
  level3: [
    { word: 'pig', image: '🐷', audioUrl: '/audio/words/pink/pig.mp3' },
    { word: 'big', image: '🔴', audioUrl: '/audio/words/pink/big.mp3' },
    { word: 'dig', image: '⛏️', audioUrl: '/audio/words/pink/dig.mp3' },
    { word: 'wig', image: '👑', audioUrl: '/audio/words/pink/wig.mp3' },
    { word: 'fig', image: '🫒', audioUrl: '/audio/words/pink/fig.mp3' },
    { word: 'jig', image: '💃', audioUrl: '/audio/words/pink/jig.mp3' },
    { word: 'rig', image: '🚛', audioUrl: '/audio/words/pink/rig.mp3' },
    { word: 'gig', image: '🎸', audioUrl: '/audio/words/pink/gig.mp3' },
  ],
  // Level 4: -it family
  level4: [
    { word: 'sit', image: '🪑', audioUrl: '/audio/words/pink/sit.mp3' },
    { word: 'hit', image: '👊', audioUrl: '/audio/words/pink/hit.mp3' },
    { word: 'bit', image: '🔢', audioUrl: '/audio/words/pink/bit.mp3' },
    { word: 'fit', image: '✅', audioUrl: '/audio/words/pink/fit.mp3' },
    { word: 'pit', image: '🕳️', audioUrl: '/audio/words/pink/pit.mp3' },
    { word: 'kit', image: '🧰', audioUrl: '/audio/words/pink/kit.mp3' },
    { word: 'lit', image: '💡', audioUrl: '/audio/words/pink/lit.mp3' },
    { word: 'wit', image: '🧠', audioUrl: '/audio/words/pink/wit.mp3' },
  ],
  // Level 5: -ot/-og family
  level5: [
    { word: 'hot', image: '🔥', audioUrl: '/audio/words/pink/hot.mp3' },
    { word: 'pot', image: '🍲', audioUrl: '/audio/words/pink/pot.mp3' },
    { word: 'dot', image: '⚫', audioUrl: '/audio/words/pink/dot.mp3' },
    { word: 'cot', image: '🛏️', audioUrl: '/audio/words/pink/cot.mp3' },
    { word: 'dog', image: '🐕', audioUrl: '/audio/words/pink/dog.mp3' },
    { word: 'log', image: '🪵', audioUrl: '/audio/words/pink/log.mp3' },
    { word: 'fog', image: '🌫️', audioUrl: '/audio/words/pink/fog.mp3' },
    { word: 'hog', image: '🐷', audioUrl: '/audio/words/pink/hog.mp3' },
  ],
  // Level 6: -un/-up family
  level6: [
    { word: 'sun', image: '☀️', audioUrl: '/audio/words/pink/sun.mp3' },
    { word: 'run', image: '🏃', audioUrl: '/audio/words/pink/run.mp3' },
    { word: 'fun', image: '🎉', audioUrl: '/audio/words/pink/fun.mp3' },
    { word: 'bun', image: '🍞', audioUrl: '/audio/words/pink/bun.mp3' },
    { word: 'cup', image: '🥤', audioUrl: '/audio/words/pink/cup.mp3' },
    { word: 'pup', image: '🐶', audioUrl: '/audio/words/pink/pup.mp3' },
    { word: 'up', image: '⬆️', audioUrl: '/audio/words/pink/up.mp3' },
    { word: 'nut', image: '🥜', audioUrl: '/audio/words/pink/nut.mp3' },
  ],
  // Level 7: -ed/-en family
  level7: [
    { word: 'bed', image: '🛏️', audioUrl: '/audio/words/pink/bed.mp3' },
    { word: 'red', image: '🔴', audioUrl: '/audio/words/pink/red.mp3' },
    { word: 'led', image: '💡', audioUrl: '/audio/words/pink/led.mp3' },
    { word: 'wed', image: '💒', audioUrl: '/audio/words/pink/wed.mp3' },
    { word: 'pen', image: '🖊️', audioUrl: '/audio/words/pink/pen.mp3' },
    { word: 'hen', image: '🐔', audioUrl: '/audio/words/pink/hen.mp3' },
    { word: 'ten', image: '🔟', audioUrl: '/audio/words/pink/ten.mp3' },
    { word: 'men', image: '👨', audioUrl: '/audio/words/pink/men.mp3' },
  ],
  // Level 8: Mixed CVC
  level8: [
    { word: 'box', image: '📦', audioUrl: '/audio/words/pink/box.mp3' },
    { word: 'fox', image: '🦊', audioUrl: '/audio/words/pink/fox.mp3' },
    { word: 'mix', image: '🥄', audioUrl: '/audio/words/pink/mix.mp3' },
    { word: 'six', image: '6️⃣', audioUrl: '/audio/words/pink/six.mp3' },
    { word: 'jet', image: '✈️', audioUrl: '/audio/words/pink/jet.mp3' },
    { word: 'net', image: '🥅', audioUrl: '/audio/words/pink/net.mp3' },
    { word: 'wet', image: '💧', audioUrl: '/audio/words/pink/wet.mp3' },
    { word: 'pet', image: '🐕', audioUrl: '/audio/words/pink/pet.mp3' },
  ],
};

export function getPictureMatchLevel(level: number): WordData[] {
  const key = `level${level}` as keyof typeof PICTURE_MATCH_SETS;
  return PICTURE_MATCH_SETS[key] || PICTURE_MATCH_SETS.level1;
}




