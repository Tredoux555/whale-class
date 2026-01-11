// lib/games/vocabulary-data.ts
// Vocabulary Data - FIXED: Uses existing audio from /audio-new/words/pink/
// Words selected based on what audio files actually exist

export interface VocabularyWord {
  word: string;
  image: string;
  audioUrl: string;
  category: string;
}

export interface VocabularyCategory {
  id: string;
  name: string;
  icon: string;
  words: VocabularyWord[];
}

// Helper to get audio path - uses existing pink words audio
const getAudio = (word: string) => `/audio-new/words/pink/${word.toLowerCase()}.mp3`;

export const VOCABULARY_CATEGORIES: VocabularyCategory[] = [
  // Animals - using words we have audio for
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐾',
    words: [
      { word: 'cat', image: '🐱', audioUrl: getAudio('cat'), category: 'animals' },
      { word: 'dog', image: '🐶', audioUrl: getAudio('dog'), category: 'animals' },
      { word: 'pig', image: '🐷', audioUrl: getAudio('pig'), category: 'animals' },
      { word: 'hen', image: '🐔', audioUrl: getAudio('hen'), category: 'animals' },
      { word: 'fox', image: '🦊', audioUrl: getAudio('fox'), category: 'animals' },
      { word: 'bug', image: '🐛', audioUrl: getAudio('bug'), category: 'animals' },
      { word: 'bat', image: '🦇', audioUrl: getAudio('bat'), category: 'animals' },
      { word: 'rat', image: '🐀', audioUrl: getAudio('rat'), category: 'animals' },
      { word: 'cow', image: '🐄', audioUrl: getAudio('cow'), category: 'animals' },
      { word: 'duck', image: '🦆', audioUrl: getAudio('duck'), category: 'animals' },
      { word: 'frog', image: '🐸', audioUrl: getAudio('frog'), category: 'animals' },
      { word: 'fish', image: '🐟', audioUrl: getAudio('fish'), category: 'animals' },
      { word: 'goat', image: '🐐', audioUrl: getAudio('goat'), category: 'animals' },
      { word: 'horse', image: '🐴', audioUrl: getAudio('horse'), category: 'animals' },
      { word: 'sheep', image: '🐑', audioUrl: getAudio('sheep'), category: 'animals' },
    ],
  },

  // Food
  {
    id: 'food',
    name: 'Food',
    icon: '🍎',
    words: [
      { word: 'apple', image: '🍎', audioUrl: getAudio('apple'), category: 'food' },
      { word: 'egg', image: '🥚', audioUrl: getAudio('egg'), category: 'food' },
      { word: 'ham', image: '🍖', audioUrl: getAudio('ham'), category: 'food' },
      { word: 'jam', image: '🍯', audioUrl: getAudio('jam'), category: 'food' },
      { word: 'cake', image: '🎂', audioUrl: getAudio('cake'), category: 'food' },
      { word: 'milk', image: '🥛', audioUrl: getAudio('milk'), category: 'food' },
      { word: 'cheese', image: '🧀', audioUrl: getAudio('cheese'), category: 'food' },
      { word: 'grape', image: '🍇', audioUrl: getAudio('grape'), category: 'food' },
      { word: 'orange', image: '🍊', audioUrl: getAudio('orange'), category: 'food' },
      { word: 'lemon', image: '🍋', audioUrl: getAudio('lemon'), category: 'food' },
      { word: 'pear', image: '🍐', audioUrl: getAudio('pear'), category: 'food' },
      { word: 'cherry', image: '🍒', audioUrl: getAudio('cherry'), category: 'food' },
      { word: 'juice', image: '🧃', audioUrl: getAudio('juice'), category: 'food' },
      { word: 'soup', image: '🍲', audioUrl: getAudio('soup'), category: 'food' },
      { word: 'rice', image: '🍚', audioUrl: getAudio('rice'), category: 'food' },
    ],
  },

  // Body
  {
    id: 'body',
    name: 'Body',
    icon: '🖐️',
    words: [
      { word: 'hand', image: '🖐️', audioUrl: getAudio('hand'), category: 'body' },
      { word: 'foot', image: '🦶', audioUrl: getAudio('foot'), category: 'body' },
      { word: 'leg', image: '🦵', audioUrl: getAudio('leg'), category: 'body' },
      { word: 'nose', image: '👃', audioUrl: getAudio('nose'), category: 'body' },
      { word: 'chin', image: '😊', audioUrl: getAudio('chin'), category: 'body' },
      { word: 'lip', image: '👄', audioUrl: getAudio('lip'), category: 'body' },
      { word: 'hip', image: '🧍', audioUrl: getAudio('hip'), category: 'body' },
    ],
  },

  // Home
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    words: [
      { word: 'bed', image: '🛏️', audioUrl: getAudio('bed'), category: 'home' },
      { word: 'chair', image: '🪑', audioUrl: getAudio('chair'), category: 'home' },
      { word: 'door', image: '🚪', audioUrl: getAudio('door'), category: 'home' },
      { word: 'lamp', image: '💡', audioUrl: getAudio('lamp'), category: 'home' },
      { word: 'cup', image: '☕', audioUrl: getAudio('cup'), category: 'home' },
      { word: 'pot', image: '🍲', audioUrl: getAudio('pot'), category: 'home' },
      { word: 'pan', image: '🍳', audioUrl: getAudio('pan'), category: 'home' },
      { word: 'mop', image: '🧹', audioUrl: getAudio('mop'), category: 'home' },
      { word: 'box', image: '📦', audioUrl: getAudio('box'), category: 'home' },
      { word: 'jar', image: '🫙', audioUrl: getAudio('jar'), category: 'home' },
      { word: 'rug', image: '🟫', audioUrl: getAudio('rug'), category: 'home' },
      { word: 'tub', image: '🛁', audioUrl: getAudio('tub'), category: 'home' },
    ],
  },

  // Nature
  {
    id: 'nature',
    name: 'Nature',
    icon: '🌳',
    words: [
      { word: 'sun', image: '☀️', audioUrl: getAudio('sun'), category: 'nature' },
      { word: 'moon', image: '🌙', audioUrl: getAudio('moon'), category: 'nature' },
      { word: 'star', image: '⭐', audioUrl: getAudio('star'), category: 'nature' },
      { word: 'tree', image: '🌳', audioUrl: getAudio('tree'), category: 'nature' },
      { word: 'leaf', image: '🍃', audioUrl: getAudio('leaf'), category: 'nature' },
      { word: 'rain', image: '🌧️', audioUrl: getAudio('rain'), category: 'nature' },
      { word: 'log', image: '🪵', audioUrl: getAudio('log'), category: 'nature' },
      { word: 'nest', image: '🪺', audioUrl: getAudio('nest'), category: 'nature' },
      { word: 'mud', image: '🟤', audioUrl: getAudio('mud'), category: 'nature' },
      { word: 'hill', image: '⛰️', audioUrl: getAudio('hill'), category: 'nature' },
    ],
  },

  // Colors & Shapes
  {
    id: 'colors-shapes',
    name: 'Colors & Shapes',
    icon: '🎨',
    words: [
      { word: 'red', image: '🔴', audioUrl: getAudio('red'), category: 'colors-shapes' },
      { word: 'pink', image: '💗', audioUrl: getAudio('pink'), category: 'colors-shapes' },
      { word: 'green', image: '🟢', audioUrl: getAudio('green'), category: 'colors-shapes' },
      { word: 'yellow', image: '🟡', audioUrl: getAudio('yellow'), category: 'colors-shapes' },
      { word: 'ball', image: '⚽', audioUrl: getAudio('ball'), category: 'colors-shapes' },
      { word: 'ring', image: '💍', audioUrl: getAudio('ring'), category: 'colors-shapes' },
      { word: 'heart', image: '❤️', audioUrl: getAudio('heart'), category: 'colors-shapes' },
      { word: 'six', image: '6️⃣', audioUrl: getAudio('six'), category: 'colors-shapes' },
      { word: 'nine', image: '9️⃣', audioUrl: getAudio('nine'), category: 'colors-shapes' },
      { word: 'ten', image: '🔟', audioUrl: getAudio('ten'), category: 'colors-shapes' },
      { word: 'two', image: '2️⃣', audioUrl: getAudio('two'), category: 'colors-shapes' },
      { word: 'three', image: '3️⃣', audioUrl: getAudio('three'), category: 'colors-shapes' },
    ],
  },
];

export const ALL_VOCABULARY_WORDS: VocabularyWord[] = VOCABULARY_CATEGORIES.flatMap(c => c.words);

export const getWordsByCategory = (categoryId: string): VocabularyWord[] => {
  return VOCABULARY_CATEGORIES.find(c => c.id === categoryId)?.words || [];
};

export const getCategoryById = (categoryId: string): VocabularyCategory | undefined => {
  return VOCABULARY_CATEGORIES.find(c => c.id === categoryId);
};

export const getRandomWords = (count: number): VocabularyWord[] => {
  const shuffled = [...ALL_VOCABULARY_WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};
