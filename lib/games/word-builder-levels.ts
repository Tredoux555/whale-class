// Word Builder Levels - Montessori Reading Series
// Organized by Pink (CVC), Blue (Blends), Green (Phonograms)

export interface WordData {
  word: string;
  image: string; // emoji
  audioUrl: string;
}

export interface WordBuilderLevel {
  id: string;
  name: string;
  description: string;
  series: 'pink' | 'blue' | 'green';
  icon: string; // emoji
  words: WordData[];
}

// =============================================================================
// PINK SERIES - CVC Words (Consonant-Vowel-Consonant)
// Organized by vowel sound - Foundation of phonics instruction
// =============================================================================

export const PINK_LEVELS: WordBuilderLevel[] = [
  {
    id: 'pink-a',
    name: 'Short A',
    description: 'cat, bat, hat...',
    series: 'pink',
    icon: '🐱',
    words: [
      { word: 'cat', image: '🐱', audioUrl: '/audio/words/pink/cat.mp3' },
      { word: 'bat', image: '🦇', audioUrl: '/audio/words/pink/bat.mp3' },
      { word: 'hat', image: '🎩', audioUrl: '/audio/words/pink/hat.mp3' },
      { word: 'mat', image: '🧹', audioUrl: '/audio/words/pink/mat.mp3' },
      { word: 'rat', image: '🐀', audioUrl: '/audio/words/pink/rat.mp3' },
      { word: 'sat', image: '🪑', audioUrl: '/audio/words/pink/sat.mp3' },
      { word: 'bag', image: '👜', audioUrl: '/audio/words/pink/bag.mp3' },
      { word: 'tag', image: '🏷️', audioUrl: '/audio/words/pink/tag.mp3' },
      { word: 'map', image: '🗺️', audioUrl: '/audio/words/pink/map.mp3' },
      { word: 'cap', image: '🧢', audioUrl: '/audio/words/pink/cap.mp3' },
    ],
  },
  {
    id: 'pink-e',
    name: 'Short E',
    description: 'bed, red, pen...',
    series: 'pink',
    icon: '🛏️',
    words: [
      { word: 'bed', image: '🛏️', audioUrl: '/audio/words/pink/bed.mp3' },
      { word: 'red', image: '🔴', audioUrl: '/audio/words/pink/red.mp3' },
      { word: 'pen', image: '🖊️', audioUrl: '/audio/words/pink/pen.mp3' },
      { word: 'ten', image: '🔟', audioUrl: '/audio/words/pink/ten.mp3' },
      { word: 'hen', image: '🐔', audioUrl: '/audio/words/pink/hen.mp3' },
      { word: 'net', image: '🥅', audioUrl: '/audio/words/pink/net.mp3' },
      { word: 'wet', image: '💧', audioUrl: '/audio/words/pink/wet.mp3' },
      { word: 'jet', image: '✈️', audioUrl: '/audio/words/pink/jet.mp3' },
      { word: 'leg', image: '🦵', audioUrl: '/audio/words/pink/leg.mp3' },
      { word: 'beg', image: '🙏', audioUrl: '/audio/words/pink/beg.mp3' },
    ],
  },
  {
    id: 'pink-i',
    name: 'Short I',
    description: 'pig, big, sit...',
    series: 'pink',
    icon: '🐷',
    words: [
      { word: 'pig', image: '🐷', audioUrl: '/audio/words/pink/pig.mp3' },
      { word: 'big', image: '🐘', audioUrl: '/audio/words/pink/big.mp3' },
      { word: 'dig', image: '⛏️', audioUrl: '/audio/words/pink/dig.mp3' },
      { word: 'wig', image: '💇', audioUrl: '/audio/words/pink/wig.mp3' },
      { word: 'sit', image: '🪑', audioUrl: '/audio/words/pink/sit.mp3' },
      { word: 'hit', image: '👊', audioUrl: '/audio/words/pink/hit.mp3' },
      { word: 'bit', image: '🦷', audioUrl: '/audio/words/pink/bit.mp3' },
      { word: 'pin', image: '📌', audioUrl: '/audio/words/pink/pin.mp3' },
      { word: 'bin', image: '🗑️', audioUrl: '/audio/words/pink/bin.mp3' },
      { word: 'fin', image: '🦈', audioUrl: '/audio/words/pink/fin.mp3' },
    ],
  },
  {
    id: 'pink-o',
    name: 'Short O',
    description: 'dog, log, hot...',
    series: 'pink',
    icon: '🐕',
    words: [
      { word: 'dog', image: '🐕', audioUrl: '/audio/words/pink/dog.mp3' },
      { word: 'log', image: '🪵', audioUrl: '/audio/words/pink/log.mp3' },
      { word: 'fog', image: '🌫️', audioUrl: '/audio/words/pink/fog.mp3' },
      { word: 'hog', image: '🐗', audioUrl: '/audio/words/pink/hog.mp3' },
      { word: 'hot', image: '🔥', audioUrl: '/audio/words/pink/hot.mp3' },
      { word: 'pot', image: '🍲', audioUrl: '/audio/words/pink/pot.mp3' },
      { word: 'dot', image: '⚫', audioUrl: '/audio/words/pink/dot.mp3' },
      { word: 'cot', image: '🛏️', audioUrl: '/audio/words/pink/cot.mp3' },
      { word: 'mop', image: '🧹', audioUrl: '/audio/words/pink/mop.mp3' },
      { word: 'top', image: '🔝', audioUrl: '/audio/words/pink/top.mp3' },
    ],
  },
  {
    id: 'pink-u',
    name: 'Short U',
    description: 'bug, hug, sun...',
    series: 'pink',
    icon: '🐛',
    words: [
      { word: 'bug', image: '🐛', audioUrl: '/audio/words/pink/bug.mp3' },
      { word: 'hug', image: '🤗', audioUrl: '/audio/words/pink/hug.mp3' },
      { word: 'mug', image: '☕', audioUrl: '/audio/words/pink/mug.mp3' },
      { word: 'rug', image: '🧶', audioUrl: '/audio/words/pink/rug.mp3' },
      { word: 'tug', image: '🚤', audioUrl: '/audio/words/pink/tug.mp3' },
      { word: 'sun', image: '☀️', audioUrl: '/audio/words/pink/sun.mp3' },
      { word: 'run', image: '🏃', audioUrl: '/audio/words/pink/run.mp3' },
      { word: 'fun', image: '🎉', audioUrl: '/audio/words/pink/fun.mp3' },
      { word: 'cup', image: '🥤', audioUrl: '/audio/words/pink/cup.mp3' },
      { word: 'pup', image: '🐶', audioUrl: '/audio/words/pink/pup.mp3' },
    ],
  },
];

// =============================================================================
// BLUE SERIES - Consonant Blends
// Two consonants that blend together while keeping individual sounds
// =============================================================================

export const BLUE_LEVELS: WordBuilderLevel[] = [
  {
    id: 'blue-l-blends',
    name: 'L-Blends',
    description: 'bl, cl, fl, gl, pl, sl',
    series: 'blue',
    icon: '🔵',
    words: [
      { word: 'black', image: '⬛', audioUrl: '/audio/words/blue/black.mp3' },
      { word: 'blue', image: '🔵', audioUrl: '/audio/words/blue/blue.mp3' },
      { word: 'clap', image: '👏', audioUrl: '/audio/words/blue/clap.mp3' },
      { word: 'clock', image: '🕐', audioUrl: '/audio/words/blue/clock.mp3' },
      { word: 'flag', image: '🚩', audioUrl: '/audio/words/blue/flag.mp3' },
      { word: 'flower', image: '🌸', audioUrl: '/audio/words/blue/flower.mp3' },
      { word: 'glass', image: '🥛', audioUrl: '/audio/words/blue/glass.mp3' },
      { word: 'globe', image: '🌍', audioUrl: '/audio/words/blue/globe.mp3' },
      { word: 'plane', image: '✈️', audioUrl: '/audio/words/blue/plane.mp3' },
      { word: 'plate', image: '🍽️', audioUrl: '/audio/words/blue/plate.mp3' },
      { word: 'sleep', image: '😴', audioUrl: '/audio/words/blue/sleep.mp3' },
      { word: 'slide', image: '🛝', audioUrl: '/audio/words/blue/slide.mp3' },
    ],
  },
  {
    id: 'blue-r-blends',
    name: 'R-Blends',
    description: 'br, cr, dr, fr, gr, pr, tr',
    series: 'blue',
    icon: '🟤',
    words: [
      { word: 'bread', image: '🍞', audioUrl: '/audio/words/blue/bread.mp3' },
      { word: 'brown', image: '🟫', audioUrl: '/audio/words/blue/brown.mp3' },
      { word: 'crab', image: '🦀', audioUrl: '/audio/words/blue/crab.mp3' },
      { word: 'crown', image: '👑', audioUrl: '/audio/words/blue/crown.mp3' },
      { word: 'dress', image: '👗', audioUrl: '/audio/words/blue/dress.mp3' },
      { word: 'drum', image: '🥁', audioUrl: '/audio/words/blue/drum.mp3' },
      { word: 'frog', image: '🐸', audioUrl: '/audio/words/blue/frog.mp3' },
      { word: 'fruit', image: '🍎', audioUrl: '/audio/words/blue/fruit.mp3' },
      { word: 'grass', image: '🌿', audioUrl: '/audio/words/blue/grass.mp3' },
      { word: 'green', image: '🟢', audioUrl: '/audio/words/blue/green.mp3' },
      { word: 'train', image: '🚂', audioUrl: '/audio/words/blue/train.mp3' },
      { word: 'tree', image: '🌳', audioUrl: '/audio/words/blue/tree.mp3' },
    ],
  },
  {
    id: 'blue-s-blends',
    name: 'S-Blends',
    description: 'sc, sk, sm, sn, sp, st, sw',
    series: 'blue',
    icon: '⭐',
    words: [
      { word: 'scan', image: '📱', audioUrl: '/audio/words/blue/scan.mp3' },
      { word: 'skip', image: '🦘', audioUrl: '/audio/words/blue/skip.mp3' },
      { word: 'smell', image: '👃', audioUrl: '/audio/words/blue/smell.mp3' },
      { word: 'smile', image: '😊', audioUrl: '/audio/words/blue/smile.mp3' },
      { word: 'snake', image: '🐍', audioUrl: '/audio/words/blue/snake.mp3' },
      { word: 'snow', image: '❄️', audioUrl: '/audio/words/blue/snow.mp3' },
      { word: 'spoon', image: '🥄', audioUrl: '/audio/words/blue/spoon.mp3' },
      { word: 'star', image: '⭐', audioUrl: '/audio/words/blue/star.mp3' },
      { word: 'stop', image: '🛑', audioUrl: '/audio/words/blue/stop.mp3' },
      { word: 'swim', image: '🏊', audioUrl: '/audio/words/blue/swim.mp3' },
      { word: 'swing', image: '🎠', audioUrl: '/audio/words/blue/swing.mp3' },
    ],
  },
  {
    id: 'blue-end-blends',
    name: 'Ending Blends',
    description: 'nd, nt, mp, nk, lk',
    series: 'blue',
    icon: '🔚',
    words: [
      { word: 'hand', image: '✋', audioUrl: '/audio/words/blue/hand.mp3' },
      { word: 'sand', image: '🏖️', audioUrl: '/audio/words/blue/sand.mp3' },
      { word: 'pond', image: '💧', audioUrl: '/audio/words/blue/pond.mp3' },
      { word: 'ant', image: '🐜', audioUrl: '/audio/words/blue/ant.mp3' },
      { word: 'tent', image: '⛺', audioUrl: '/audio/words/blue/tent.mp3' },
      { word: 'plant', image: '🌱', audioUrl: '/audio/words/blue/plant.mp3' },
      { word: 'lamp', image: '💡', audioUrl: '/audio/words/blue/lamp.mp3' },
      { word: 'jump', image: '🦘', audioUrl: '/audio/words/blue/jump.mp3' },
      { word: 'stamp', image: '📮', audioUrl: '/audio/words/blue/stamp.mp3' },
      { word: 'pink', image: '💗', audioUrl: '/audio/words/blue/pink.mp3' },
      { word: 'sink', image: '🚰', audioUrl: '/audio/words/blue/sink.mp3' },
      { word: 'milk', image: '🥛', audioUrl: '/audio/words/blue/milk.mp3' },
    ],
  },
];

// =============================================================================
// GREEN SERIES - Phonograms (vowel teams, digraphs, r-controlled vowels)
// More complex sound patterns
// =============================================================================

export const GREEN_LEVELS: WordBuilderLevel[] = [
  {
    id: 'green-ee-ea',
    name: 'Long E',
    description: 'ee & ea sounds',
    series: 'green',
    icon: '🐝',
    words: [
      { word: 'bee', image: '🐝', audioUrl: '/audio/words/green/bee.mp3' },
      { word: 'tree', image: '🌳', audioUrl: '/audio/words/green/tree.mp3' },
      { word: 'feet', image: '🦶', audioUrl: '/audio/words/green/feet.mp3' },
      { word: 'see', image: '👀', audioUrl: '/audio/words/green/see.mp3' },
      { word: 'seed', image: '🌱', audioUrl: '/audio/words/green/seed.mp3' },
      { word: 'eat', image: '🍽️', audioUrl: '/audio/words/green/eat.mp3' },
      { word: 'sea', image: '🌊', audioUrl: '/audio/words/green/sea.mp3' },
      { word: 'tea', image: '🍵', audioUrl: '/audio/words/green/tea.mp3' },
      { word: 'read', image: '📖', audioUrl: '/audio/words/green/read.mp3' },
      { word: 'leaf', image: '🍃', audioUrl: '/audio/words/green/leaf.mp3' },
    ],
  },
  {
    id: 'green-ai-ay',
    name: 'Long A',
    description: 'ai & ay sounds',
    series: 'green',
    icon: '🌧️',
    words: [
      { word: 'rain', image: '🌧️', audioUrl: '/audio/words/green/rain.mp3' },
      { word: 'train', image: '🚂', audioUrl: '/audio/words/green/train.mp3' },
      { word: 'mail', image: '📬', audioUrl: '/audio/words/green/mail.mp3' },
      { word: 'tail', image: '🦊', audioUrl: '/audio/words/green/tail.mp3' },
      { word: 'sail', image: '⛵', audioUrl: '/audio/words/green/sail.mp3' },
      { word: 'day', image: '☀️', audioUrl: '/audio/words/green/day.mp3' },
      { word: 'play', image: '🎮', audioUrl: '/audio/words/green/play.mp3' },
      { word: 'say', image: '💬', audioUrl: '/audio/words/green/say.mp3' },
      { word: 'way', image: '➡️', audioUrl: '/audio/words/green/way.mp3' },
      { word: 'hay', image: '🌾', audioUrl: '/audio/words/green/hay.mp3' },
    ],
  },
  {
    id: 'green-oa-oo',
    name: 'Long O & OO',
    description: 'oa & oo sounds',
    series: 'green',
    icon: '⛵',
    words: [
      { word: 'boat', image: '⛵', audioUrl: '/audio/words/green/boat.mp3' },
      { word: 'coat', image: '🧥', audioUrl: '/audio/words/green/coat.mp3' },
      { word: 'goat', image: '🐐', audioUrl: '/audio/words/green/goat.mp3' },
      { word: 'road', image: '🛤️', audioUrl: '/audio/words/green/road.mp3' },
      { word: 'toad', image: '🐸', audioUrl: '/audio/words/green/toad.mp3' },
      { word: 'moon', image: '🌙', audioUrl: '/audio/words/green/moon.mp3' },
      { word: 'spoon', image: '🥄', audioUrl: '/audio/words/green/spoon.mp3' },
      { word: 'zoo', image: '🦁', audioUrl: '/audio/words/green/zoo.mp3' },
      { word: 'food', image: '🍔', audioUrl: '/audio/words/green/food.mp3' },
      { word: 'pool', image: '🏊', audioUrl: '/audio/words/green/pool.mp3' },
    ],
  },
  {
    id: 'green-digraphs',
    name: 'Digraphs',
    description: 'sh, ch, th sounds',
    series: 'green',
    icon: '🚢',
    words: [
      { word: 'ship', image: '🚢', audioUrl: '/audio/words/green/ship.mp3' },
      { word: 'shop', image: '🏪', audioUrl: '/audio/words/green/shop.mp3' },
      { word: 'fish', image: '🐟', audioUrl: '/audio/words/green/fish.mp3' },
      { word: 'wish', image: '⭐', audioUrl: '/audio/words/green/wish.mp3' },
      { word: 'chip', image: '🍟', audioUrl: '/audio/words/green/chip.mp3' },
      { word: 'cheese', image: '🧀', audioUrl: '/audio/words/green/cheese.mp3' },
      { word: 'chair', image: '🪑', audioUrl: '/audio/words/green/chair.mp3' },
      { word: 'chin', image: '😊', audioUrl: '/audio/words/green/chin.mp3' },
      { word: 'thin', image: '📏', audioUrl: '/audio/words/green/thin.mp3' },
      { word: 'bath', image: '🛁', audioUrl: '/audio/words/green/bath.mp3' },
      { word: 'math', image: '🔢', audioUrl: '/audio/words/green/math.mp3' },
      { word: 'that', image: '👉', audioUrl: '/audio/words/green/that.mp3' },
    ],
  },
  {
    id: 'green-r-controlled',
    name: 'R-Controlled',
    description: 'ar, or, er, ir, ur',
    series: 'green',
    icon: '⭐',
    words: [
      { word: 'car', image: '🚗', audioUrl: '/audio/words/green/car.mp3' },
      { word: 'star', image: '⭐', audioUrl: '/audio/words/green/star.mp3' },
      { word: 'farm', image: '🚜', audioUrl: '/audio/words/green/farm.mp3' },
      { word: 'corn', image: '🌽', audioUrl: '/audio/words/green/corn.mp3' },
      { word: 'horse', image: '🐴', audioUrl: '/audio/words/green/horse.mp3' },
      { word: 'fork', image: '🍴', audioUrl: '/audio/words/green/fork.mp3' },
      { word: 'bird', image: '🐦', audioUrl: '/audio/words/green/bird.mp3' },
      { word: 'girl', image: '👧', audioUrl: '/audio/words/green/girl.mp3' },
      { word: 'turtle', image: '🐢', audioUrl: '/audio/words/green/turtle.mp3' },
      { word: 'water', image: '💧', audioUrl: '/audio/words/green/water.mp3' },
      { word: 'fern', image: '🌿', audioUrl: '/audio/words/green/fern.mp3' },
      { word: 'nurse', image: '👩‍⚕️', audioUrl: '/audio/words/green/nurse.mp3' },
    ],
  },
  {
    id: 'green-diphthongs',
    name: 'Diphthongs',
    description: 'ou & ow sounds',
    series: 'green',
    icon: '☁️',
    words: [
      { word: 'cloud', image: '☁️', audioUrl: '/audio/words/green/cloud.mp3' },
      { word: 'house', image: '🏠', audioUrl: '/audio/words/green/house.mp3' },
      { word: 'mouse', image: '🐭', audioUrl: '/audio/words/green/mouse.mp3' },
      { word: 'out', image: '👉', audioUrl: '/audio/words/green/out.mp3' },
      { word: 'loud', image: '📢', audioUrl: '/audio/words/green/loud.mp3' },
      { word: 'cow', image: '🐄', audioUrl: '/audio/words/green/cow.mp3' },
      { word: 'owl', image: '🦉', audioUrl: '/audio/words/green/owl.mp3' },
      { word: 'brown', image: '🟤', audioUrl: '/audio/words/green/brown.mp3' },
      { word: 'down', image: '⬇️', audioUrl: '/audio/words/green/down.mp3' },
      { word: 'town', image: '🏘️', audioUrl: '/audio/words/green/town.mp3' },
    ],
  },
];

// =============================================================================
// COMBINED EXPORTS & UTILITY FUNCTIONS
// =============================================================================

export const ALL_LEVELS: WordBuilderLevel[] = [
  ...PINK_LEVELS,
  ...BLUE_LEVELS,
  ...GREEN_LEVELS,
];

/**
 * Get a specific level by its ID
 */
export const getLevelById = (id: string): WordBuilderLevel | undefined => {
  return ALL_LEVELS.find((level) => level.id === id);
};

/**
 * Get all levels for a specific series
 */
export const getLevelsBySeries = (
  series: 'pink' | 'blue' | 'green'
): WordBuilderLevel[] => {
  return ALL_LEVELS.filter((level) => level.series === series);
};

/**
 * Get all words across all levels
 */
export const getAllWords = (): WordData[] => {
  return ALL_LEVELS.flatMap((level) => level.words);
};

/**
 * Get total word count
 */
export const getTotalWordCount = (): number => {
  return getAllWords().length;
};

/**
 * Get word count for a series
 */
export const getSeriesWordCount = (series: 'pink' | 'blue' | 'green'): number => {
  return getLevelsBySeries(series).reduce(
    (total, level) => total + level.words.length,
    0
  );
};

/**
 * Series metadata for display
 */
export const SERIES_INFO = {
  pink: {
    name: 'Pink Series',
    subtitle: 'CVC Words',
    description: 'Consonant-Vowel-Consonant patterns - the foundation of reading',
    color: 'pink',
    icon: '🩷',
  },
  blue: {
    name: 'Blue Series',
    subtitle: 'Blends',
    description: 'Consonant blends at the beginning and end of words',
    color: 'blue',
    icon: '🔵',
  },
  green: {
    name: 'Green Series',
    subtitle: 'Phonograms',
    description: 'Vowel teams, digraphs, and r-controlled vowels',
    color: 'green',
    icon: '🟢',
  },
} as const;
