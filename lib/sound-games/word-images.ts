// lib/sound-games/word-images.ts
// Maps words to their DALL-E generated images in Supabase storage
// Falls back to emoji if image not available

const SUPABASE_URL = 'https://dmfncjjtsoxrnvcdnvjq.supabase.co';

// All DALL-E generated images in Supabase storage
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

// Emoji fallbacks for words without DALL-E images
const EMOJI_FALLBACKS: Record<string, string> = {
  'thick': '📦',
  'thin': '📄',
  'think': '🤔',
  'throw': '🤾',
  'shell': '🐚',
  'shop': '🏪',
  'two': '2️⃣',
  'nine': '9️⃣',
  // Additional fallbacks
  'inch': '📏',
  'infant': '👶',
  'under': '⬇️',
  'utensil': '🍴',
  'up arrow': '⬆️',
};

/**
 * Get the image source for a word
 * Returns Supabase URL if DALL-E image available, otherwise emoji
 */
export function getWordImage(word: string): { type: 'image' | 'emoji'; src: string } {
  const cleanWord = word.toLowerCase().replace(/[^a-z-]/g, '');
  
  if (AVAILABLE_IMAGES.has(cleanWord)) {
    return {
      type: 'image',
      src: `${SUPABASE_URL}/storage/v1/object/public/images/sound-objects/${cleanWord}.png`
    };
  }
  
  // Check emoji fallback
  if (EMOJI_FALLBACKS[cleanWord]) {
    return {
      type: 'emoji',
      src: EMOJI_FALLBACKS[cleanWord]
    };
  }
  
  // Default emoji based on word
  return {
    type: 'emoji',
    src: '❓'
  };
}

/**
 * Check if we have an image for a word
 */
export function hasWordImage(word: string): boolean {
  return AVAILABLE_IMAGES.has(word.toLowerCase().replace(/[^a-z-]/g, ''));
}
