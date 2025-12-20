// lib/games/game-data.ts
// Word and letter data for games (matches Material Generator curriculum)

// ============================================
// LETTERS - Montessori Order
// ============================================

export const VOWELS = [
  { letter: 'a', sound: '/æ/', word: 'apple', image: '🍎' },
  { letter: 'i', sound: '/ɪ/', word: 'igloo', image: '🏠' },
  { letter: 'o', sound: '/ɒ/', word: 'octopus', image: '🐙' },
  { letter: 'e', sound: '/ɛ/', word: 'elephant', image: '🐘' },
  { letter: 'u', sound: '/ʌ/', word: 'umbrella', image: '☂️' },
];

export const CONSONANTS = [
  { letter: 's', sound: '/s/', word: 'sun', image: '☀️' },
  { letter: 'm', sound: '/m/', word: 'moon', image: '🌙' },
  { letter: 't', sound: '/t/', word: 'table', image: '🪑' },
  { letter: 'p', sound: '/p/', word: 'pen', image: '🖊️' },
  { letter: 'n', sound: '/n/', word: 'nest', image: '🪺' },
  { letter: 'c', sound: '/k/', word: 'cat', image: '🐱' },
  { letter: 'r', sound: '/r/', word: 'rabbit', image: '🐰' },
  { letter: 'd', sound: '/d/', word: 'dog', image: '🐕' },
  { letter: 'g', sound: '/g/', word: 'goat', image: '🐐' },
  { letter: 'b', sound: '/b/', word: 'ball', image: '⚽' },
  { letter: 'h', sound: '/h/', word: 'hat', image: '🎩' },
  { letter: 'l', sound: '/l/', word: 'lion', image: '🦁' },
  { letter: 'f', sound: '/f/', word: 'fish', image: '🐟' },
  { letter: 'j', sound: '/dʒ/', word: 'jar', image: '🫙' },
  { letter: 'k', sound: '/k/', word: 'kite', image: '🪁' },
  { letter: 'w', sound: '/w/', word: 'water', image: '💧' },
  { letter: 'v', sound: '/v/', word: 'van', image: '🚐' },
  { letter: 'y', sound: '/j/', word: 'yellow', image: '💛' },
  { letter: 'z', sound: '/z/', word: 'zebra', image: '🦓' },
  { letter: 'x', sound: '/ks/', word: 'box', image: '📦' },
  { letter: 'q', sound: '/kw/', word: 'queen', image: '👑' },
];

export const ALL_LETTERS = [...VOWELS, ...CONSONANTS];

// ============================================
// PINK SERIES - CVC Words with Images
// ============================================

export const PINK_SERIES_WORDS = {
  'short-a': [
    { word: 'cat', image: '🐱' },
    { word: 'hat', image: '🎩' },
    { word: 'bat', image: '🦇' },
    { word: 'rat', image: '🐀' },
    { word: 'mat', image: '🧹' },
    { word: 'can', image: '🥫' },
    { word: 'man', image: '👨' },
    { word: 'pan', image: '🍳' },
    { word: 'fan', image: '🪭' },
    { word: 'van', image: '🚐' },
    { word: 'bag', image: '👜' },
    { word: 'tag', image: '🏷️' },
    { word: 'map', image: '🗺️' },
    { word: 'cap', image: '🧢' },
    { word: 'dad', image: '👨' },
    { word: 'sad', image: '😢' },
    { word: 'jam', image: '🍯' },
    { word: 'ham', image: '🥓' },
  ],
  'short-i': [
    { word: 'sit', image: '🪑' },
    { word: 'hit', image: '👊' },
    { word: 'bit', image: '🦷' },
    { word: 'pig', image: '🐷' },
    { word: 'big', image: '🐘' },
    { word: 'dig', image: '⛏️' },
    { word: 'wig', image: '💇' },
    { word: 'pin', image: '📌' },
    { word: 'bin', image: '🗑️' },
    { word: 'win', image: '🏆' },
    { word: 'fin', image: '🦈' },
    { word: 'tip', image: '💡' },
    { word: 'zip', image: '🤐' },
    { word: 'lip', image: '👄' },
    { word: 'kid', image: '👶' },
    { word: 'lid', image: '🫕' },
    { word: 'six', image: '6️⃣' },
    { word: 'mix', image: '🥣' },
  ],
  'short-o': [
    { word: 'dog', image: '🐕' },
    { word: 'log', image: '🪵' },
    { word: 'fog', image: '🌫️' },
    { word: 'hog', image: '🐗' },
    { word: 'pot', image: '🍲' },
    { word: 'hot', image: '🔥' },
    { word: 'dot', image: '⚫' },
    { word: 'cot', image: '🛏️' },
    { word: 'top', image: '🔝' },
    { word: 'hop', image: '🐰' },
    { word: 'mop', image: '🧹' },
    { word: 'pop', image: '🎈' },
    { word: 'box', image: '📦' },
    { word: 'fox', image: '🦊' },
    { word: 'mom', image: '👩' },
    { word: 'job', image: '💼' },
  ],
  'short-e': [
    { word: 'bed', image: '🛏️' },
    { word: 'red', image: '🔴' },
    { word: 'pet', image: '🐕' },
    { word: 'wet', image: '💧' },
    { word: 'set', image: '🎯' },
    { word: 'get', image: '🤲' },
    { word: 'jet', image: '✈️' },
    { word: 'net', image: '🥅' },
    { word: 'pen', image: '🖊️' },
    { word: 'hen', image: '🐔' },
    { word: 'ten', image: '🔟' },
    { word: 'leg', image: '🦵' },
    { word: 'web', image: '🕸️' },
    { word: 'yes', image: '✅' },
  ],
  'short-u': [
    { word: 'bug', image: '🐛' },
    { word: 'rug', image: '🧶' },
    { word: 'mug', image: '☕' },
    { word: 'hug', image: '🤗' },
    { word: 'jug', image: '🫗' },
    { word: 'bus', image: '🚌' },
    { word: 'cup', image: '🥤' },
    { word: 'pup', image: '🐶' },
    { word: 'sun', image: '☀️' },
    { word: 'run', image: '🏃' },
    { word: 'fun', image: '🎉' },
    { word: 'bun', image: '🍞' },
    { word: 'cut', image: '✂️' },
    { word: 'hut', image: '🛖' },
    { word: 'nut', image: '🥜' },
    { word: 'mud', image: '🟤' },
    { word: 'tub', image: '🛁' },
    { word: 'gum', image: '🫧' },
  ],
};

// ============================================
// BLUE SERIES - Blend Words
// ============================================

export const BLUE_SERIES_WORDS = {
  'bl': [
    { word: 'black', image: '⬛' },
    { word: 'block', image: '🧱' },
    { word: 'blue', image: '🔵' },
  ],
  'cl': [
    { word: 'clap', image: '👏' },
    { word: 'clock', image: '🕐' },
    { word: 'cloud', image: '☁️' },
  ],
  'fl': [
    { word: 'flag', image: '🚩' },
    { word: 'flower', image: '🌸' },
    { word: 'fly', image: '🪰' },
  ],
  'gl': [
    { word: 'glass', image: '🥛' },
    { word: 'globe', image: '🌍' },
    { word: 'glue', image: '🧴' },
  ],
  'pl': [
    { word: 'plant', image: '🌱' },
    { word: 'plate', image: '🍽️' },
    { word: 'play', image: '🎮' },
  ],
  'sl': [
    { word: 'sleep', image: '😴' },
    { word: 'slide', image: '🛝' },
    { word: 'slow', image: '🐢' },
  ],
  'br': [
    { word: 'bread', image: '🍞' },
    { word: 'brush', image: '🖌️' },
    { word: 'brick', image: '🧱' },
  ],
  'cr': [
    { word: 'crab', image: '🦀' },
    { word: 'crown', image: '👑' },
    { word: 'cry', image: '😢' },
  ],
  'dr': [
    { word: 'drum', image: '🥁' },
    { word: 'dress', image: '👗' },
    { word: 'drink', image: '🧃' },
  ],
  'fr': [
    { word: 'frog', image: '🐸' },
    { word: 'fruit', image: '🍎' },
    { word: 'friend', image: '🤝' },
  ],
  'gr': [
    { word: 'grass', image: '🌿' },
    { word: 'green', image: '💚' },
    { word: 'grapes', image: '🍇' },
  ],
  'tr': [
    { word: 'tree', image: '🌳' },
    { word: 'train', image: '🚂' },
    { word: 'truck', image: '🚚' },
  ],
  'st': [
    { word: 'star', image: '⭐' },
    { word: 'stop', image: '🛑' },
    { word: 'stone', image: '🪨' },
  ],
  'sp': [
    { word: 'spoon', image: '🥄' },
    { word: 'spider', image: '🕷️' },
    { word: 'spin', image: '🌀' },
  ],
  'sn': [
    { word: 'snow', image: '❄️' },
    { word: 'snail', image: '🐌' },
    { word: 'snake', image: '🐍' },
  ],
  'sw': [
    { word: 'swim', image: '🏊' },
    { word: 'swing', image: '🎠' },
    { word: 'sweet', image: '🍬' },
  ],
};

// ============================================
// GREEN SERIES - Phonogram Words
// ============================================

export const GREEN_SERIES_WORDS = {
  'ee': [
    { word: 'bee', image: '🐝' },
    { word: 'tree', image: '🌳' },
    { word: 'feet', image: '🦶' },
    { word: 'sleep', image: '😴' },
    { word: 'green', image: '💚' },
  ],
  'ea': [
    { word: 'eat', image: '🍽️' },
    { word: 'sea', image: '🌊' },
    { word: 'tea', image: '🍵' },
    { word: 'leaf', image: '🍃' },
    { word: 'beach', image: '🏖️' },
  ],
  'ai': [
    { word: 'rain', image: '🌧️' },
    { word: 'train', image: '🚂' },
    { word: 'mail', image: '📬' },
    { word: 'tail', image: '🐕' },
    { word: 'snail', image: '🐌' },
  ],
  'ay': [
    { word: 'day', image: '☀️' },
    { word: 'play', image: '🎮' },
    { word: 'say', image: '💬' },
    { word: 'way', image: '➡️' },
    { word: 'tray', image: '🍽️' },
  ],
  'oa': [
    { word: 'boat', image: '⛵' },
    { word: 'coat', image: '🧥' },
    { word: 'goat', image: '🐐' },
    { word: 'road', image: '🛣️' },
    { word: 'soap', image: '🧼' },
  ],
  'oo': [
    { word: 'moon', image: '🌙' },
    { word: 'spoon', image: '🥄' },
    { word: 'book', image: '📚' },
    { word: 'food', image: '🍲' },
    { word: 'zoo', image: '🦁' },
  ],
  'sh': [
    { word: 'ship', image: '🚢' },
    { word: 'shop', image: '🏪' },
    { word: 'fish', image: '🐟' },
    { word: 'shell', image: '🐚' },
    { word: 'shoe', image: '👟' },
  ],
  'ch': [
    { word: 'chip', image: '🍟' },
    { word: 'cheese', image: '🧀' },
    { word: 'chair', image: '🪑' },
    { word: 'lunch', image: '🍱' },
    { word: 'beach', image: '🏖️' },
  ],
  'th': [
    { word: 'thin', image: '📏' },
    { word: 'this', image: '👉' },
    { word: 'bath', image: '🛁' },
    { word: 'teeth', image: '🦷' },
    { word: 'three', image: '3️⃣' },
  ],
};

// ============================================
// SIGHT WORDS
// ============================================

export const SIGHT_WORDS = {
  'level-1': [
    'the', 'a', 'I', 'to', 'and', 'is', 'it', 'you', 'that', 'he',
    'she', 'we', 'my', 'are', 'was', 'for', 'on', 'with', 'at', 'be',
  ],
  'level-2': [
    'have', 'this', 'from', 'by', 'not', 'but', 'what', 'all', 'were', 'when',
    'can', 'said', 'there', 'each', 'which', 'do', 'how', 'if', 'will', 'up',
  ],
  'level-3': [
    'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her',
    'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more',
  ],
};

// ============================================
// SENTENCES
// ============================================

export const SENTENCES = {
  'level-1': [
    { words: ['The', 'cat', 'sat'], image: '🐱' },
    { words: ['I', 'see', 'a', 'dog'], image: '🐕' },
    { words: ['The', 'sun', 'is', 'hot'], image: '☀️' },
    { words: ['A', 'big', 'red', 'bus'], image: '🚌' },
    { words: ['I', 'can', 'run'], image: '🏃' },
  ],
  'level-2': [
    { words: ['The', 'frog', 'can', 'hop'], image: '🐸' },
    { words: ['We', 'play', 'in', 'the', 'park'], image: '🏞️' },
    { words: ['She', 'has', 'a', 'red', 'hat'], image: '🎩' },
    { words: ['The', 'fish', 'swims', 'fast'], image: '🐟' },
    { words: ['I', 'like', 'to', 'read', 'books'], image: '📚' },
  ],
  'level-3': [
    { words: ['The', 'train', 'goes', 'down', 'the', 'track'], image: '🚂' },
    { words: ['We', 'eat', 'lunch', 'at', 'noon'], image: '🍱' },
    { words: ['The', 'green', 'frog', 'sits', 'on', 'a', 'log'], image: '🐸' },
    { words: ['My', 'friend', 'and', 'I', 'play', 'games'], image: '🎮' },
    { words: ['The', 'moon', 'shines', 'at', 'night'], image: '🌙' },
  ],
};

