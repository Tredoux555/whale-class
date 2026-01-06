// lib/games/game-data.ts
// Complete game data with audio paths for all words
// Now using MASTER_CVC_WORDS as single source of truth

import { MASTER_CVC_WORDS, toGameFormat, getWordsByVowel } from '@/lib/data/master-words';

// ============================================
// TYPES
// ============================================

export interface LetterData {
  letter: string;
  word: string;
  image: string;
  audioUrl: string;
}

export interface LetterGroup {
  id: string;
  name: string;
  order: number;
  color: string;
  icon: string;
  letters: LetterData[];
  unlockRequirement: string | null;
}

export interface WordData {
  word: string;
  image: string;
  audioUrl: string;
}

export interface SentenceData {
  id: number;
  words: string[];
  image: string;
  audioUrl: string;
}

// ============================================
// LETTER GROUPS - Progressive Unlock System
// ============================================

export const GROUP_VOWELS: LetterGroup = {
  id: 'vowels',
  name: 'Vowels',
  order: 1,
  color: '#ef4444',
  icon: '🔴',
  unlockRequirement: null,
  letters: [
    { letter: 'a', word: 'apple', image: '🍎', audioUrl: '/audio/letters/a.mp3' },
    { letter: 'e', word: 'elephant', image: '🐘', audioUrl: '/audio/letters/e.mp3' },
    { letter: 'i', word: 'igloo', image: '🏠', audioUrl: '/audio/letters/i.mp3' },
    { letter: 'o', word: 'octopus', image: '🐙', audioUrl: '/audio/letters/o.mp3' },
    { letter: 'u', word: 'umbrella', image: '☂️', audioUrl: '/audio/letters/u.mp3' },
  ],
};

export const GROUP_EASY: LetterGroup = {
  id: 'easy',
  name: 'Easy Sounds',
  order: 2,
  color: '#f97316',
  icon: '🟠',
  unlockRequirement: 'vowels',
  letters: [
    { letter: 's', word: 'sun', image: '☀️', audioUrl: '/audio/letters/s.mp3' },
    { letter: 'm', word: 'moon', image: '🌙', audioUrl: '/audio/letters/m.mp3' },
    { letter: 't', word: 'table', image: '🪑', audioUrl: '/audio/letters/t.mp3' },
    { letter: 'p', word: 'pen', image: '🖊️', audioUrl: '/audio/letters/p.mp3' },
    { letter: 'n', word: 'nest', image: '🪺', audioUrl: '/audio/letters/n.mp3' },
  ],
};

export const GROUP_NEXT: LetterGroup = {
  id: 'next',
  name: 'Next Sounds',
  order: 3,
  color: '#eab308',
  icon: '🟡',
  unlockRequirement: 'easy',
  letters: [
    { letter: 'c', word: 'cat', image: '🐱', audioUrl: '/audio/letters/c.mp3' },
    { letter: 'r', word: 'rabbit', image: '🐰', audioUrl: '/audio/letters/r.mp3' },
    { letter: 'd', word: 'dog', image: '🐕', audioUrl: '/audio/letters/d.mp3' },
    { letter: 'g', word: 'goat', image: '🐐', audioUrl: '/audio/letters/g.mp3' },
    { letter: 'b', word: 'ball', image: '⚽', audioUrl: '/audio/letters/b.mp3' },
  ],
};

export const GROUP_MORE: LetterGroup = {
  id: 'more',
  name: 'More Sounds',
  order: 4,
  color: '#22c55e',
  icon: '🟢',
  unlockRequirement: 'next',
  letters: [
    { letter: 'h', word: 'hat', image: '🎩', audioUrl: '/audio/letters/h.mp3' },
    { letter: 'l', word: 'lion', image: '🦁', audioUrl: '/audio/letters/l.mp3' },
    { letter: 'f', word: 'fish', image: '🐟', audioUrl: '/audio/letters/f.mp3' },
    { letter: 'j', word: 'jar', image: '🫙', audioUrl: '/audio/letters/j.mp3' },
    { letter: 'k', word: 'kite', image: '🪁', audioUrl: '/audio/letters/k.mp3' },
  ],
};

export const GROUP_ADVANCED: LetterGroup = {
  id: 'advanced',
  name: 'Advanced',
  order: 5,
  color: '#8b5cf6',
  icon: '🟣',
  unlockRequirement: 'more',
  letters: [
    { letter: 'w', word: 'water', image: '💧', audioUrl: '/audio/letters/w.mp3' },
    { letter: 'v', word: 'van', image: '🚐', audioUrl: '/audio/letters/v.mp3' },
    { letter: 'y', word: 'yellow', image: '💛', audioUrl: '/audio/letters/y.mp3' },
    { letter: 'z', word: 'zebra', image: '🦓', audioUrl: '/audio/letters/z.mp3' },
    { letter: 'x', word: 'box', image: '📦', audioUrl: '/audio/letters/x.mp3' },
    { letter: 'q', word: 'queen', image: '👑', audioUrl: '/audio/letters/q.mp3' },
  ],
};

export const LETTER_GROUPS: LetterGroup[] = [
  GROUP_VOWELS,
  GROUP_EASY,
  GROUP_NEXT,
  GROUP_MORE,
  GROUP_ADVANCED,
];

export const ALL_LETTERS: LetterData[] = LETTER_GROUPS.flatMap(g => g.letters);

// ============================================
// PINK SERIES - CVC Words (6 per vowel)
// Now derived from MASTER_CVC_WORDS
// ============================================

export const PINK_SERIES: Record<string, WordData[]> = {
  'short-a': toGameFormat(getWordsByVowel('a')),
  'short-e': toGameFormat(getWordsByVowel('e')),
  'short-i': toGameFormat(getWordsByVowel('i')),
  'short-o': toGameFormat(getWordsByVowel('o')),
  'short-u': toGameFormat(getWordsByVowel('u')),
};

// Get all pink series words flat
export const ALL_PINK_WORDS: WordData[] = Object.values(PINK_SERIES).flat();

// ============================================
// BLUE SERIES - Blend Words (3 per blend)
// ============================================

export const BLUE_SERIES: Record<string, WordData[]> = {
  'bl': [
    { word: 'black', image: '⬛', audioUrl: '/audio/words/blue/black.mp3' },
    { word: 'block', image: '🧱', audioUrl: '/audio/words/blue/block.mp3' },
    { word: 'blue', image: '🔵', audioUrl: '/audio/words/blue/blue.mp3' },
  ],
  'cl': [
    { word: 'clap', image: '👏', audioUrl: '/audio/words/blue/clap.mp3' },
    { word: 'clock', image: '🕐', audioUrl: '/audio/words/blue/clock.mp3' },
    { word: 'cloud', image: '☁️', audioUrl: '/audio/words/blue/cloud.mp3' },
  ],
  'fl': [
    { word: 'flag', image: '🚩', audioUrl: '/audio/words/blue/flag.mp3' },
    { word: 'flower', image: '🌸', audioUrl: '/audio/words/blue/flower.mp3' },
    { word: 'fly', image: '🪰', audioUrl: '/audio/words/blue/fly.mp3' },
  ],
  'gl': [
    { word: 'glass', image: '🥛', audioUrl: '/audio/words/blue/glass.mp3' },
    { word: 'globe', image: '🌍', audioUrl: '/audio/words/blue/globe.mp3' },
    { word: 'glue', image: '🧴', audioUrl: '/audio/words/blue/glue.mp3' },
  ],
  'pl': [
    { word: 'plant', image: '🌱', audioUrl: '/audio/words/blue/plant.mp3' },
    { word: 'plate', image: '🍽️', audioUrl: '/audio/words/blue/plate.mp3' },
    { word: 'play', image: '🎮', audioUrl: '/audio/words/blue/play.mp3' },
  ],
  'sl': [
    { word: 'sleep', image: '😴', audioUrl: '/audio/words/blue/sleep.mp3' },
    { word: 'slide', image: '🛝', audioUrl: '/audio/words/blue/slide.mp3' },
    { word: 'slow', image: '🐢', audioUrl: '/audio/words/blue/slow.mp3' },
  ],
  'br': [
    { word: 'bread', image: '🍞', audioUrl: '/audio/words/blue/bread.mp3' },
    { word: 'brush', image: '🖌️', audioUrl: '/audio/words/blue/brush.mp3' },
    { word: 'brick', image: '🧱', audioUrl: '/audio/words/blue/brick.mp3' },
  ],
  'cr': [
    { word: 'crab', image: '🦀', audioUrl: '/audio/words/blue/crab.mp3' },
    { word: 'crown', image: '👑', audioUrl: '/audio/words/blue/crown.mp3' },
    { word: 'cry', image: '😢', audioUrl: '/audio/words/blue/cry.mp3' },
  ],
  'dr': [
    { word: 'drum', image: '🥁', audioUrl: '/audio/words/blue/drum.mp3' },
    { word: 'dress', image: '👗', audioUrl: '/audio/words/blue/dress.mp3' },
    { word: 'drink', image: '🧃', audioUrl: '/audio/words/blue/drink.mp3' },
  ],
  'fr': [
    { word: 'frog', image: '🐸', audioUrl: '/audio/words/blue/frog.mp3' },
    { word: 'fruit', image: '🍎', audioUrl: '/audio/words/blue/fruit.mp3' },
    { word: 'friend', image: '🤝', audioUrl: '/audio/words/blue/friend.mp3' },
  ],
  'gr': [
    { word: 'grass', image: '🌿', audioUrl: '/audio/words/blue/grass.mp3' },
    { word: 'green', image: '💚', audioUrl: '/audio/words/blue/green.mp3' },
    { word: 'grapes', image: '🍇', audioUrl: '/audio/words/blue/grapes.mp3' },
  ],
  'tr': [
    { word: 'tree', image: '🌳', audioUrl: '/audio/words/blue/tree.mp3' },
    { word: 'train', image: '🚂', audioUrl: '/audio/words/blue/train.mp3' },
    { word: 'truck', image: '🚚', audioUrl: '/audio/words/blue/truck.mp3' },
  ],
  'st': [
    { word: 'star', image: '⭐', audioUrl: '/audio/words/blue/star.mp3' },
    { word: 'stop', image: '🛑', audioUrl: '/audio/words/blue/stop.mp3' },
    { word: 'stone', image: '🪨', audioUrl: '/audio/words/blue/stone.mp3' },
  ],
  'sp': [
    { word: 'spoon', image: '🥄', audioUrl: '/audio/words/blue/spoon.mp3' },
    { word: 'spider', image: '🕷️', audioUrl: '/audio/words/blue/spider.mp3' },
    { word: 'spin', image: '🌀', audioUrl: '/audio/words/blue/spin.mp3' },
  ],
  'sn': [
    { word: 'snow', image: '❄️', audioUrl: '/audio/words/blue/snow.mp3' },
    { word: 'snail', image: '🐌', audioUrl: '/audio/words/blue/snail.mp3' },
    { word: 'snake', image: '🐍', audioUrl: '/audio/words/blue/snake.mp3' },
  ],
  'sw': [
    { word: 'swim', image: '🏊', audioUrl: '/audio/words/blue/swim.mp3' },
    { word: 'swing', image: '🎠', audioUrl: '/audio/words/blue/swing.mp3' },
    { word: 'sweet', image: '🍬', audioUrl: '/audio/words/blue/sweet.mp3' },
  ],
};

export const ALL_BLUE_WORDS: WordData[] = Object.values(BLUE_SERIES).flat();

// ============================================
// GREEN SERIES - Phonogram Words
// ============================================

export const GREEN_SERIES: Record<string, WordData[]> = {
  'ee': [
    { word: 'bee', image: '🐝', audioUrl: '/audio/words/green/bee.mp3' },
    { word: 'tree', image: '🌳', audioUrl: '/audio/words/green/tree.mp3' },
    { word: 'feet', image: '🦶', audioUrl: '/audio/words/green/feet.mp3' },
  ],
  'ea': [
    { word: 'eat', image: '🍽️', audioUrl: '/audio/words/green/eat.mp3' },
    { word: 'sea', image: '🌊', audioUrl: '/audio/words/green/sea.mp3' },
    { word: 'tea', image: '🍵', audioUrl: '/audio/words/green/tea.mp3' },
  ],
  'ai': [
    { word: 'rain', image: '🌧️', audioUrl: '/audio/words/green/rain.mp3' },
    { word: 'train', image: '🚂', audioUrl: '/audio/words/green/train.mp3' },
    { word: 'mail', image: '📬', audioUrl: '/audio/words/green/mail.mp3' },
  ],
  'ay': [
    { word: 'day', image: '☀️', audioUrl: '/audio/words/green/day.mp3' },
    { word: 'play', image: '🎮', audioUrl: '/audio/words/green/play.mp3' },
    { word: 'say', image: '💬', audioUrl: '/audio/words/green/say.mp3' },
  ],
  'oa': [
    { word: 'boat', image: '⛵', audioUrl: '/audio/words/green/boat.mp3' },
    { word: 'coat', image: '🧥', audioUrl: '/audio/words/green/coat.mp3' },
    { word: 'goat', image: '🐐', audioUrl: '/audio/words/green/goat.mp3' },
  ],
  'oo': [
    { word: 'moon', image: '🌙', audioUrl: '/audio/words/green/moon.mp3' },
    { word: 'spoon', image: '🥄', audioUrl: '/audio/words/green/spoon.mp3' },
    { word: 'zoo', image: '🦁', audioUrl: '/audio/words/green/zoo.mp3' },
  ],
  'sh': [
    { word: 'ship', image: '🚢', audioUrl: '/audio/words/green/ship.mp3' },
    { word: 'shop', image: '🏪', audioUrl: '/audio/words/green/shop.mp3' },
    { word: 'fish', image: '🐟', audioUrl: '/audio/words/green/fish.mp3' },
  ],
  'ch': [
    { word: 'chip', image: '🍟', audioUrl: '/audio/words/green/chip.mp3' },
    { word: 'cheese', image: '🧀', audioUrl: '/audio/words/green/cheese.mp3' },
    { word: 'chair', image: '🪑', audioUrl: '/audio/words/green/chair.mp3' },
  ],
  'th': [
    { word: 'thin', image: '📏', audioUrl: '/audio/words/green/thin.mp3' },
    { word: 'this', image: '👉', audioUrl: '/audio/words/green/this.mp3' },
    { word: 'bath', image: '🛁', audioUrl: '/audio/words/green/bath.mp3' },
  ],
};

export const ALL_GREEN_WORDS: WordData[] = Object.values(GREEN_SERIES).flat();

// ============================================
// SIGHT WORDS
// ============================================

export const SIGHT_WORDS: Record<string, string[]> = {
  'level-1': [
    'the', 'a', 'i', 'to', 'and', 'is', 'it', 'you', 'that', 'he',
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

export const SIGHT_WORDS_WITH_AUDIO: Record<string, { word: string; audioUrl: string }[]> = {
  'level-1': SIGHT_WORDS['level-1'].map(word => ({
    word,
    audioUrl: `/audio/sight-words/${word.toLowerCase()}.mp3`,
  })),
  'level-2': SIGHT_WORDS['level-2'].map(word => ({
    word,
    audioUrl: `/audio/sight-words/${word.toLowerCase()}.mp3`,
  })),
  'level-3': SIGHT_WORDS['level-3'].map(word => ({
    word,
    audioUrl: `/audio/sight-words/${word.toLowerCase()}.mp3`,
  })),
};

// ============================================
// SENTENCES
// ============================================

export const SENTENCES: Record<string, SentenceData[]> = {
  'level-1': [
    { id: 1, words: ['The', 'cat', 'sat'], image: '🐱', audioUrl: '/audio/sentences/sentence-01.mp3' },
    { id: 2, words: ['I', 'see', 'a', 'dog'], image: '🐕', audioUrl: '/audio/sentences/sentence-02.mp3' },
    { id: 3, words: ['The', 'sun', 'is', 'hot'], image: '☀️', audioUrl: '/audio/sentences/sentence-03.mp3' },
    { id: 4, words: ['A', 'big', 'red', 'bus'], image: '🚌', audioUrl: '/audio/sentences/sentence-04.mp3' },
    { id: 5, words: ['I', 'can', 'run'], image: '🏃', audioUrl: '/audio/sentences/sentence-05.mp3' },
  ],
  'level-2': [
    { id: 6, words: ['The', 'frog', 'can', 'hop'], image: '🐸', audioUrl: '/audio/sentences/sentence-06.mp3' },
    { id: 7, words: ['We', 'play', 'in', 'the', 'park'], image: '🏞️', audioUrl: '/audio/sentences/sentence-07.mp3' },
    { id: 8, words: ['She', 'has', 'a', 'red', 'hat'], image: '🎩', audioUrl: '/audio/sentences/sentence-08.mp3' },
    { id: 9, words: ['The', 'fish', 'swims', 'fast'], image: '🐟', audioUrl: '/audio/sentences/sentence-09.mp3' },
    { id: 10, words: ['I', 'like', 'to', 'read', 'books'], image: '📚', audioUrl: '/audio/sentences/sentence-10.mp3' },
  ],
  'level-3': [
    { id: 11, words: ['The', 'train', 'goes', 'down', 'the', 'track'], image: '🚂', audioUrl: '/audio/sentences/sentence-11.mp3' },
    { id: 12, words: ['We', 'eat', 'lunch', 'at', 'noon'], image: '🍱', audioUrl: '/audio/sentences/sentence-12.mp3' },
    { id: 13, words: ['The', 'green', 'frog', 'sits', 'on', 'a', 'log'], image: '🐸', audioUrl: '/audio/sentences/sentence-13.mp3' },
    { id: 14, words: ['My', 'friend', 'and', 'I', 'play', 'games'], image: '🎮', audioUrl: '/audio/sentences/sentence-14.mp3' },
    { id: 15, words: ['The', 'moon', 'shines', 'at', 'night'], image: '🌙', audioUrl: '/audio/sentences/sentence-15.mp3' },
  ],
};

export const ALL_SENTENCES: SentenceData[] = Object.values(SENTENCES).flat();
