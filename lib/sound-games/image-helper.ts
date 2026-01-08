// lib/sound-games/image-helper.ts
// Helper to get DALL-E generated images from Supabase

const SUPABASE_URL = 'https://dmfncjjtsoxrnvcdnvjq.supabase.co';

// All words that have DALL-E generated images in Supabase
const GENERATED_IMAGES = new Set([
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
 * Get the image URL for a word
 * Returns Supabase URL if DALL-E image exists, otherwise returns emoji
 */
export function getWordImageUrl(word: string): string {
  const cleanWord = word.toLowerCase().trim();
  if (GENERATED_IMAGES.has(cleanWord)) {
    return `${SUPABASE_URL}/storage/v1/object/public/images/sound-objects/${cleanWord}.png`;
  }
  // Return empty string if no image - component should handle fallback
  return '';
}

/**
 * Check if a word has a DALL-E generated image
 */
export function hasGeneratedImage(word: string): boolean {
  return GENERATED_IMAGES.has(word.toLowerCase().trim());
}

/**
 * Get all generated image words
 */
export function getGeneratedImageWords(): string[] {
  return Array.from(GENERATED_IMAGES);
}
