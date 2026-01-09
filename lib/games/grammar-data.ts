// Grammar Symbols Game - Data File
// Montessori grammar symbols for children ages 4-6

export type GrammarType = 'noun' | 'verb' | 'adjective' | 'article';

export interface GrammarWord {
  word: string;
  type: GrammarType;
}

export interface GrammarSentence {
  id: number;
  words: GrammarWord[];
  level: 1 | 2 | 3;
}

// GRAMMAR SYMBOL COLORS (Montessori standard)
export const GRAMMAR_SYMBOLS: Record<GrammarType, { symbol: string; color: string; name: string; childName: string }> = {
  noun: { symbol: '▲', color: '#000000', name: 'Noun', childName: 'Naming Word' },
  verb: { symbol: '●', color: '#EF4444', name: 'Verb', childName: 'Action Word' },
  adjective: { symbol: '▲', color: '#3B82F6', name: 'Adjective', childName: 'Describing Word' },
  article: { symbol: '▲', color: '#93C5FD', name: 'Article', childName: 'Little Word' },
};

export const GRAMMAR_SENTENCES: GrammarSentence[] = [
  // ============================================
  // LEVEL 1: Simple sentences (3-4 words)
  // Focus: Identifying NOUNS only
  // ============================================
  {
    id: 1,
    level: 1,
    words: [
      { word: 'The', type: 'article' },
      { word: 'cat', type: 'noun' },
      { word: 'sat', type: 'verb' },
    ],
  },
  {
    id: 2,
    level: 1,
    words: [
      { word: 'A', type: 'article' },
      { word: 'dog', type: 'noun' },
      { word: 'ran', type: 'verb' },
    ],
  },
  {
    id: 3,
    level: 1,
    words: [
      { word: 'The', type: 'article' },
      { word: 'bird', type: 'noun' },
      { word: 'sings', type: 'verb' },
    ],
  },
  {
    id: 4,
    level: 1,
    words: [
      { word: 'A', type: 'article' },
      { word: 'fish', type: 'noun' },
      { word: 'swims', type: 'verb' },
    ],
  },
  {
    id: 5,
    level: 1,
    words: [
      { word: 'The', type: 'article' },
      { word: 'sun', type: 'noun' },
      { word: 'shines', type: 'verb' },
    ],
  },
  {
    id: 6,
    level: 1,
    words: [
      { word: 'A', type: 'article' },
      { word: 'frog', type: 'noun' },
      { word: 'hops', type: 'verb' },
    ],
  },
  {
    id: 7,
    level: 1,
    words: [
      { word: 'The', type: 'article' },
      { word: 'ball', type: 'noun' },
      { word: 'rolls', type: 'verb' },
    ],
  },
  {
    id: 8,
    level: 1,
    words: [
      { word: 'A', type: 'article' },
      { word: 'bee', type: 'noun' },
      { word: 'buzzes', type: 'verb' },
    ],
  },

  // ============================================
  // LEVEL 2: Medium sentences (4-5 words)
  // Focus: Identifying NOUNS + VERBS
  // Introduces adjectives in context
  // ============================================
  {
    id: 9,
    level: 2,
    words: [
      { word: 'The', type: 'article' },
      { word: 'big', type: 'adjective' },
      { word: 'dog', type: 'noun' },
      { word: 'jumps', type: 'verb' },
    ],
  },
  {
    id: 10,
    level: 2,
    words: [
      { word: 'A', type: 'article' },
      { word: 'small', type: 'adjective' },
      { word: 'cat', type: 'noun' },
      { word: 'sleeps', type: 'verb' },
    ],
  },
  {
    id: 11,
    level: 2,
    words: [
      { word: 'The', type: 'article' },
      { word: 'red', type: 'adjective' },
      { word: 'bird', type: 'noun' },
      { word: 'flies', type: 'verb' },
    ],
  },
  {
    id: 12,
    level: 2,
    words: [
      { word: 'A', type: 'article' },
      { word: 'happy', type: 'adjective' },
      { word: 'boy', type: 'noun' },
      { word: 'runs', type: 'verb' },
    ],
  },
  {
    id: 13,
    level: 2,
    words: [
      { word: 'The', type: 'article' },
      { word: 'tall', type: 'adjective' },
      { word: 'tree', type: 'noun' },
      { word: 'grows', type: 'verb' },
    ],
  },
  {
    id: 14,
    level: 2,
    words: [
      { word: 'A', type: 'article' },
      { word: 'blue', type: 'adjective' },
      { word: 'fish', type: 'noun' },
      { word: 'swims', type: 'verb' },
    ],
  },
  {
    id: 15,
    level: 2,
    words: [
      { word: 'The', type: 'article' },
      { word: 'soft', type: 'adjective' },
      { word: 'bunny', type: 'noun' },
      { word: 'hops', type: 'verb' },
    ],
  },
  {
    id: 16,
    level: 2,
    words: [
      { word: 'A', type: 'article' },
      { word: 'loud', type: 'adjective' },
      { word: 'drum', type: 'noun' },
      { word: 'bangs', type: 'verb' },
    ],
  },

  // ============================================
  // LEVEL 3: Complex sentences (5-6 words)
  // Focus: ALL grammar types
  // ============================================
  {
    id: 17,
    level: 3,
    words: [
      { word: 'The', type: 'article' },
      { word: 'big', type: 'adjective' },
      { word: 'brown', type: 'adjective' },
      { word: 'dog', type: 'noun' },
      { word: 'barks', type: 'verb' },
    ],
  },
  {
    id: 18,
    level: 3,
    words: [
      { word: 'A', type: 'article' },
      { word: 'small', type: 'adjective' },
      { word: 'girl', type: 'noun' },
      { word: 'eats', type: 'verb' },
      { word: 'cake', type: 'noun' },
    ],
  },
  {
    id: 19,
    level: 3,
    words: [
      { word: 'The', type: 'article' },
      { word: 'happy', type: 'adjective' },
      { word: 'cat', type: 'noun' },
      { word: 'chases', type: 'verb' },
      { word: 'a', type: 'article' },
      { word: 'mouse', type: 'noun' },
    ],
  },
  {
    id: 20,
    level: 3,
    words: [
      { word: 'A', type: 'article' },
      { word: 'fast', type: 'adjective' },
      { word: 'red', type: 'adjective' },
      { word: 'car', type: 'noun' },
      { word: 'zooms', type: 'verb' },
    ],
  },
  {
    id: 21,
    level: 3,
    words: [
      { word: 'The', type: 'article' },
      { word: 'tiny', type: 'adjective' },
      { word: 'ant', type: 'noun' },
      { word: 'carries', type: 'verb' },
      { word: 'a', type: 'article' },
      { word: 'leaf', type: 'noun' },
    ],
  },
  {
    id: 22,
    level: 3,
    words: [
      { word: 'A', type: 'article' },
      { word: 'pretty', type: 'adjective' },
      { word: 'flower', type: 'noun' },
      { word: 'blooms', type: 'verb' },
    ],
  },
  {
    id: 23,
    level: 3,
    words: [
      { word: 'The', type: 'article' },
      { word: 'old', type: 'adjective' },
      { word: 'man', type: 'noun' },
      { word: 'reads', type: 'verb' },
      { word: 'a', type: 'article' },
      { word: 'book', type: 'noun' },
    ],
  },
  {
    id: 24,
    level: 3,
    words: [
      { word: 'A', type: 'article' },
      { word: 'cold', type: 'adjective' },
      { word: 'wind', type: 'noun' },
      { word: 'blows', type: 'verb' },
    ],
  },
];

// Helper function to get sentences by level
export const getSentencesByLevel = (level: 1 | 2 | 3): GrammarSentence[] => {
  return GRAMMAR_SENTENCES.filter((s) => s.level === level);
};

// Helper function to get unique grammar types in a sentence
export const getTypesInSentence = (sentence: GrammarSentence): GrammarType[] => {
  const types = new Set<GrammarType>();
  sentence.words.forEach((w) => types.add(w.type));
  return Array.from(types);
};

// Helper function to get indices of words matching a type
export const getWordIndicesByType = (sentence: GrammarSentence, type: GrammarType): number[] => {
  return sentence.words
    .map((w, i) => (w.type === type ? i : -1))
    .filter((i) => i !== -1);
};

// Level descriptions for UI
export const LEVEL_INFO = {
  1: {
    title: 'Level 1',
    subtitle: 'Find the Naming Words',
    description: 'Tap all the NOUNS (naming words)',
    targetTypes: ['noun'] as GrammarType[],
    icon: '🐱',
  },
  2: {
    title: 'Level 2',
    subtitle: 'Find Naming & Action Words',
    description: 'Tap the NOUNS and VERBS',
    targetTypes: ['noun', 'verb'] as GrammarType[],
    icon: '🐕',
  },
  3: {
    title: 'Level 3',
    subtitle: 'Find All Word Types',
    description: 'Tap all the grammar symbols',
    targetTypes: ['noun', 'verb', 'adjective', 'article'] as GrammarType[],
    icon: '🦁',
  },
};
