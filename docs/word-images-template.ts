// Sound Games Word Images Registry
// Generated: January 8, 2026
// Replace Supabase URL with your actual bucket URL

const SUPABASE_URL = 'https://your-project.supabase.co/storage/v1/object/public';
const SOUND_OBJECTS_PATH = 'images/sound-objects';

// Helper to build full URL
const img = (word: string) => `${SUPABASE_URL}/${SOUND_OBJECTS_PATH}/sound-${word}.png`;

export const wordImages: Record<string, string> = {
  // Batch 1
  add: img('add'),
  arrow: img('arrow'),
  bin: img('bin'),
  book: img('book'),
  
  // Batch 2
  cake: img('cake'),
  chair: img('chair'),
  cheese: img('cheese'),
  cherry: img('cherry'),
  
  // Batch 3
  chicken: img('chicken'),
  chin: img('chin'),
  chip: img('chip'),
  cow: img('cow'),
  
  // Batch 4
  dig: img('dig'),
  end: img('end'),
  foot: img('foot'),
  girl: img('girl'),
  
  // Batch 5
  green: img('green'),
  heart: img('heart'),
  hop: img('hop'),
  hut: img('hut'),
  
  // Batch 6
  ill: img('ill'),
  in: img('in'),
  itch: img('itch'),
  jeans: img('jeans'),
  
  // Batch 7
  juice: img('juice'),
  jump: img('jump'),
  milk: img('milk'),
  nine: img('nine'),
  
  // Batch 8
  nurse: img('nurse'),
  on: img('on'),
  peg: img('peg'),
  pink: img('pink'),
  
  // Batch 9
  run: img('run'),
  sad: img('sad'),
  sheep: img('sheep'),
  shell: img('shell'),
  
  // Batch 10
  ship: img('ship'),
  shirt: img('shirt'),
  shoe: img('shoe'),
  shop: img('shop'),
  
  // Batch 11
  thick: img('thick'),
  thin: img('thin'),
  think: img('think'),
  throw: img('throw'),
  
  // Batch 12
  tree: img('tree'),
  two: img('two'),
  uncle: img('uncle'),
  under: img('under'),
  
  // Batch 13
  up: img('up'),
  us: img('us'),
  water: img('water'),
  wet: img('wet'),
  
  // Batch 14
  wing: img('wing'),
  yak: img('yak'),
  yam: img('yam'),
  yarn: img('yarn'),
  
  // Batch 15
  yell: img('yell'),
  yellow: img('yellow'),
  'yo-yo': img('yo-yo'),
  zone: img('zone'),
};

// Get image URL for a word, with fallback
export function getWordImage(word: string): string | null {
  const normalizedWord = word.toLowerCase().trim();
  return wordImages[normalizedWord] || null;
}

// Check if word has an image
export function hasWordImage(word: string): boolean {
  return word.toLowerCase().trim() in wordImages;
}

// Get all words that have images
export function getWordsWithImages(): string[] {
  return Object.keys(wordImages);
}

// Total count
export const WORD_IMAGE_COUNT = Object.keys(wordImages).length; // Should be 60
