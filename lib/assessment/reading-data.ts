// lib/assessment/reading-data.ts
// Reading test data - CVC words and Pink Series sentences

// ============================================
// CVC WORDS FOR READING TEST
// Selected from Pink Series - common, decodable words
// ============================================

export const CVC_WORDS_FOR_READING = [
  // Short A
  'cat', 'hat', 'bat', 'mat', 'sat',
  'can', 'man', 'pan', 'fan', 'ran',
  'bag', 'tag', 'nap', 'map', 'cap',
  'dad', 'sad', 'bad', 'jam', 'ham',
  
  // Short I  
  'sit', 'hit', 'bit', 'fit', 'pit',
  'pig', 'big', 'dig', 'wig', 'pin',
  'bin', 'tin', 'win', 'sip', 'tip',
  'rip', 'dip', 'hip', 'zip', 'lip',
  
  // Short O
  'dog', 'log', 'fog', 'hog', 'jog',
  'pot', 'hot', 'dot', 'got', 'not',
  'top', 'hop', 'mop', 'pop', 'box',
  'fox', 'mom', 'job', 'rob', 'cob',
  
  // Short E
  'bed', 'red', 'led', 'fed', 'pet',
  'wet', 'set', 'get', 'let', 'met',
  'jet', 'net', 'vet', 'pen', 'hen',
  'ten', 'men', 'den', 'leg', 'peg',
  
  // Short U
  'bug', 'rug', 'mug', 'hug', 'jug',
  'dug', 'tug', 'pug', 'bus', 'cup',
  'pup', 'sun', 'run', 'fun', 'bun',
  'but', 'cut', 'hut', 'nut', 'mud',
];

// ============================================
// PINK SERIES SENTENCES
// Simple CVC-based sentences for reading test
// ============================================

export const PINK_SENTENCES = [
  {
    id: 1,
    text: 'The cat sat.',
    audioPath: '/audio-new/sentences/sentence_01.mp3',
    words: ['the', 'cat', 'sat']
  },
  {
    id: 2,
    text: 'A fat rat ran.',
    audioPath: '/audio-new/sentences/sentence_02.mp3',
    words: ['a', 'fat', 'rat', 'ran']
  },
  {
    id: 3,
    text: 'The dog is big.',
    audioPath: '/audio-new/sentences/sentence_03.mp3',
    words: ['the', 'dog', 'is', 'big']
  },
  {
    id: 4,
    text: 'I see the sun.',
    audioPath: '/audio-new/sentences/sentence_04.mp3',
    words: ['i', 'see', 'the', 'sun']
  },
  {
    id: 5,
    text: 'The pig is in mud.',
    audioPath: '/audio-new/sentences/sentence_05.mp3',
    words: ['the', 'pig', 'is', 'in', 'mud']
  },
  {
    id: 6,
    text: 'The red hen sat.',
    audioPath: '/audio-new/sentences/sentence_06.mp3',
    words: ['the', 'red', 'hen', 'sat']
  },
  {
    id: 7,
    text: 'I can run and hop.',
    audioPath: '/audio-new/sentences/sentence_07.mp3',
    words: ['i', 'can', 'run', 'and', 'hop']
  },
  {
    id: 8,
    text: 'The bug is on a rug.',
    audioPath: '/audio-new/sentences/sentence_08.mp3',
    words: ['the', 'bug', 'is', 'on', 'a', 'rug']
  },
  {
    id: 9,
    text: 'A man has a hat.',
    audioPath: '/audio-new/sentences/sentence_09.mp3',
    words: ['a', 'man', 'has', 'a', 'hat']
  },
  {
    id: 10,
    text: 'The pan is hot.',
    audioPath: '/audio-new/sentences/sentence_10.mp3',
    words: ['the', 'pan', 'is', 'hot']
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get random CVC words for reading test
 */
export function getRandomCVCWords(count: number): string[] {
  const shuffled = [...CVC_WORDS_FOR_READING].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get random sentences for reading test
 */
export function getRandomSentences(count: number): typeof PINK_SENTENCES {
  const shuffled = [...PINK_SENTENCES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get word audio path
 */
export function getWordAudioPath(word: string): string {
  return `/audio-new/words/${word.toLowerCase()}.mp3`;
}
