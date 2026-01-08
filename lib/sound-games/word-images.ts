// lib/sound-games/word-images.ts
// Maps words to Supabase storage URLs for DALL-E generated images
// Updated: Jan 8, 2026 - Added 60 new Sound Games images

const SUPABASE_URL = 'https://dmfncjjtsoxrnvcdnvjq.supabase.co';
const BUCKET = 'images';
const FOLDER = 'sound-objects';

// Original images (filename matches word)
const ORIGINAL_IMAGES = new Set([
  'alligator', 'anchor', 'ant', 'apple', 'astronaut', 'ax',
  'bag', 'ball', 'bat', 'bed', 'bib', 'big', 'box', 'bud', 'bug', 'bus',
  'cab', 'can', 'cap', 'car', 'cat', 'crab', 'cub', 'cup',
  'dish', 'dog', 'doll', 'door', 'drum', 'duck',
  'egg', 'elbow', 'elephant', 'elf', 'engine', 'envelope',
  'fan', 'feather', 'fish', 'fork', 'fox', 'frog',
  'gift', 'glass', 'goat', 'gold', 'grape', 'guitar', 'gum',
  'ham', 'hammer', 'hand', 'hat', 'hen', 'hit', 'horse', 'hot', 'house', 'hug',
  'igloo', 'iguana', 'ink', 'insect',
  'jam', 'jar', 'jeep', 'jet', 'jug',
  'key',
  'lamp', 'leaf', 'leg', 'lemon', 'lid', 'lip', 'log',
  'map', 'mat', 'mix', 'moon', 'mop', 'mouse', 'mud', 'mug',
  'nail', 'necklace', 'nest', 'net', 'nose', 'nut',
  'octopus', 'olive', 'orange', 'ostrich', 'otter', 'ox',
  'pan', 'pear', 'pen', 'pet', 'pig', 'pin', 'pot', 'pup',
  'rabbit', 'rain', 'rat', 'red', 'ring', 'rocket', 'rug',
  'sit', 'six', 'snake', 'soap', 'sock', 'spoon', 'star', 'sun', 'swim',
  'tape', 'tent', 'thimble', 'thorn', 'three', 'thumb', 'tiger', 'tooth', 'top', 'toy', 'tub',
  'umbrella', 'umpire', 'unicorn',
  'van', 'vase', 'vest', 'vet', 'vine', 'violin',
  'wagon', 'watch', 'wax', 'web', 'wig', 'wolf', 'worm',
  'zebra', 'zero', 'zigzag', 'zip', 'zipper', 'zoo'
]);

// New Sound Games images (filename is sound-{word}.png)
const SOUND_IMAGES = new Set([
  'add', 'arrow', 'bin', 'book', 'cake', 'chair', 'cheese', 'cherry',
  'chicken', 'chin', 'chip', 'cow', 'dig', 'end', 'foot', 'girl',
  'green', 'heart', 'hop', 'hut', 'ill', 'in', 'itch', 'jeans',
  'juice', 'jump', 'milk', 'nine', 'nurse', 'on', 'peg', 'pink',
  'run', 'sad', 'sheep', 'shell', 'ship', 'shirt', 'shoe', 'shop',
  'thick', 'thin', 'think', 'throw', 'tree', 'two', 'uncle', 'under',
  'up', 'us', 'water', 'wet', 'wing', 'yak', 'yam', 'yarn',
  'yell', 'yellow', 'yo-yo', 'zone'
]);

/**
 * Get the Supabase storage URL for a word's image
 * @param word - The word to get image for (lowercase)
 * @returns URL string if image exists, null otherwise
 */
export function getWordImageUrl(word: string): string | null {
  const normalizedWord = word.toLowerCase().trim();
  
  // Check new sound images first (sound-{word}.png format)
  if (SOUND_IMAGES.has(normalizedWord)) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FOLDER}/sound-${normalizedWord}.png`;
  }
  
  // Check original images ({word}.png format)
  if (ORIGINAL_IMAGES.has(normalizedWord)) {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FOLDER}/${normalizedWord}.png`;
  }
  
  return null;
}

/**
 * Check if a word has an image available
 * @param word - The word to check
 */
export function hasWordImage(word: string): boolean {
  const normalizedWord = word.toLowerCase().trim();
  return SOUND_IMAGES.has(normalizedWord) || ORIGINAL_IMAGES.has(normalizedWord);
}

/**
 * Get all available words with images
 */
export function getAvailableImageWords(): string[] {
  return [...Array.from(ORIGINAL_IMAGES), ...Array.from(SOUND_IMAGES)];
}

/**
 * Get count of all available images
 */
export function getImageCount(): { original: number; sound: number; total: number } {
  return {
    original: ORIGINAL_IMAGES.size,
    sound: SOUND_IMAGES.size,
    total: ORIGINAL_IMAGES.size + SOUND_IMAGES.size
  };
}
