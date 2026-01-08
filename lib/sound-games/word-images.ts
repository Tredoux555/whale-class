// lib/sound-games/word-images.ts
// Maps words to Supabase storage URLs for DALL-E generated images
// Generated: Jan 8, 2026

const SUPABASE_URL = 'https://dmfncjjtsoxrnvcdnvjq.supabase.co';
const BUCKET = 'images';
const FOLDER = 'sound-objects';

// All available images in Supabase storage
const AVAILABLE_IMAGES = new Set([
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

/**
 * Get the Supabase storage URL for a word's image
 * @param word - The word to get image for (lowercase)
 * @returns URL string if image exists, null otherwise
 */
export function getWordImageUrl(word: string): string | null {
  const normalizedWord = word.toLowerCase().trim();
  
  if (!AVAILABLE_IMAGES.has(normalizedWord)) {
    return null;
  }
  
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FOLDER}/${normalizedWord}.png`;
}

/**
 * Check if a word has an image available
 * @param word - The word to check
 */
export function hasWordImage(word: string): boolean {
  return AVAILABLE_IMAGES.has(word.toLowerCase().trim());
}

/**
 * Get all available words with images
 */
export function getAvailableImageWords(): string[] {
  return Array.from(AVAILABLE_IMAGES);
}
