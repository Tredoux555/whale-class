// lib/data/master-words.ts
// MASTER WORD LIST - Single source of truth for all games and English Guide
// 6 words per vowel - aligned with I Spy baskets and physical Montessori materials

export interface MasterWord {
  word: string;
  image: string;
  audioUrl: string;
  miniature: string; // What to buy for physical basket
}

export interface VowelGroup {
  vowel: string;
  keyPicture: string;
  mouthPosition: string;
  color: string;
  words: MasterWord[];
}

// ============================================
// PINK SERIES - CVC WORDS (6 per vowel)
// ============================================

export const MASTER_CVC_WORDS: VowelGroup[] = [
  {
    vowel: 'a',
    keyPicture: '🍎',
    mouthPosition: 'Jaw drops open',
    color: '#ef4444',
    words: [
      { word: 'cat', image: '🐱', audioUrl: '/audio/words/pink/cat.mp3', miniature: 'plastic cat figurine' },
      { word: 'hat', image: '🎩', audioUrl: '/audio/words/pink/hat.mp3', miniature: 'doll hat or mini hat' },
      { word: 'bat', image: '🦇', audioUrl: '/audio/words/pink/bat.mp3', miniature: 'plastic bat or toy bat' },
      { word: 'map', image: '🗺️', audioUrl: '/audio/words/pink/map.mp3', miniature: 'mini folded paper map' },
      { word: 'pan', image: '🍳', audioUrl: '/audio/words/pink/pan.mp3', miniature: 'dollhouse pan' },
      { word: 'bag', image: '👜', audioUrl: '/audio/words/pink/bag.mp3', miniature: 'tiny fabric pouch' },
    ]
  },
  {
    vowel: 'e',
    keyPicture: '🥚',
    mouthPosition: 'Smile slightly, tongue mid-front',
    color: '#22c55e',
    words: [
      { word: 'bed', image: '🛏️', audioUrl: '/audio/words/pink/bed.mp3', miniature: 'dollhouse bed' },
      { word: 'pen', image: '🖊️', audioUrl: '/audio/words/pink/pen.mp3', miniature: 'mini pen or real pen' },
      { word: 'hen', image: '🐔', audioUrl: '/audio/words/pink/hen.mp3', miniature: 'plastic hen figurine' },
      { word: 'net', image: '🥅', audioUrl: '/audio/words/pink/net.mp3', miniature: 'small fish net or mesh' },
      { word: 'leg', image: '🦵', audioUrl: '/audio/words/pink/leg.mp3', miniature: 'doll leg or toy figure' },
      { word: 'web', image: '🕸️', audioUrl: '/audio/words/pink/web.mp3', miniature: 'plastic spider web' },
    ]
  },
  {
    vowel: 'i',
    keyPicture: '🏠',
    mouthPosition: 'Big smile, tongue high',
    color: '#f97316',
    words: [
      { word: 'pig', image: '🐷', audioUrl: '/audio/words/pink/pig.mp3', miniature: 'plastic pig figurine' },
      { word: 'pin', image: '📌', audioUrl: '/audio/words/pink/pin.mp3', miniature: 'safety pin (cap it)' },
      { word: 'bin', image: '🗑️', audioUrl: '/audio/words/pink/bin.mp3', miniature: 'tiny trash can' },
      { word: 'lip', image: '👄', audioUrl: '/audio/words/pink/lip.mp3', miniature: 'lip charm or picture' },
      { word: 'wig', image: '💇', audioUrl: '/audio/words/pink/wig.mp3', miniature: 'doll wig or hair piece' },
      { word: 'fin', image: '🦈', audioUrl: '/audio/words/pink/fin.mp3', miniature: 'plastic shark or fish' },
    ]
  },
  {
    vowel: 'o',
    keyPicture: '🐙',
    mouthPosition: 'Round lips, tongue low-back',
    color: '#3b82f6',
    words: [
      { word: 'dog', image: '🐕', audioUrl: '/audio/words/pink/dog.mp3', miniature: 'plastic dog figurine' },
      { word: 'pot', image: '🍲', audioUrl: '/audio/words/pink/pot.mp3', miniature: 'dollhouse pot' },
      { word: 'mop', image: '🧹', audioUrl: '/audio/words/pink/mop.mp3', miniature: 'mini mop or make one' },
      { word: 'box', image: '📦', audioUrl: '/audio/words/pink/box.mp3', miniature: 'tiny cardboard box' },
      { word: 'fox', image: '🦊', audioUrl: '/audio/words/pink/fox.mp3', miniature: 'plastic fox figurine' },
      { word: 'log', image: '🪵', audioUrl: '/audio/words/pink/log.mp3', miniature: 'small wooden dowel' },
    ]
  },
  {
    vowel: 'u',
    keyPicture: '☂️',
    mouthPosition: 'Relaxed, jaw slightly dropped',
    color: '#8b5cf6',
    words: [
      { word: 'cup', image: '🥤', audioUrl: '/audio/words/pink/cup.mp3', miniature: 'dollhouse cup or shot glass' },
      { word: 'bug', image: '🐛', audioUrl: '/audio/words/pink/bug.mp3', miniature: 'plastic bug figurine' },
      { word: 'rug', image: '🧶', audioUrl: '/audio/words/pink/rug.mp3', miniature: 'small felt square' },
      { word: 'sun', image: '☀️', audioUrl: '/audio/words/pink/sun.mp3', miniature: 'sun charm or cutout' },
      { word: 'bus', image: '🚌', audioUrl: '/audio/words/pink/bus.mp3', miniature: 'toy bus' },
      { word: 'nut', image: '🥜', audioUrl: '/audio/words/pink/nut.mp3', miniature: 'real walnut or acorn' },
    ]
  },
];

// ============================================
// BEGINNING SOUND OBJECTS (6 per sound)
// For I Spy games - NO letters shown, purely auditory
// ============================================

export interface SoundGroup {
  sound: string;
  phase: number | 'vowel';
  objects: string[];
  taobao: string;
  eslNote?: string;
}

export const BEGINNING_SOUND_OBJECTS: SoundGroup[] = [
  // Phase 1: Easy sounds (exist in Mandarin)
  { sound: 's', phase: 1, objects: ['sun', 'sock', 'soap', 'spoon', 'star', 'snake'], taobao: '迷你太阳/袜子' },
  { sound: 'm', phase: 1, objects: ['mop', 'moon', 'mouse', 'map', 'mug', 'mat'], taobao: '迷你拖把/月亮' },
  { sound: 'f', phase: 1, objects: ['fan', 'fish', 'fork', 'frog', 'fox', 'feather'], taobao: '迷你风扇/鱼' },
  { sound: 'n', phase: 1, objects: ['net', 'nut', 'nail', 'nest', 'nose', 'necklace'], taobao: '迷你网/坚果' },
  { sound: 'p', phase: 1, objects: ['pen', 'pig', 'pot', 'pin', 'pear', 'pan'], taobao: '迷你笔/猪' },
  { sound: 't', phase: 1, objects: ['top', 'tent', 'tiger', 'tape', 'tooth', 'toy'], taobao: '迷你帐篷/老虎' },
  { sound: 'k', phase: 1, objects: ['cup', 'cat', 'car', 'cap', 'can', 'key'], taobao: '迷你杯子/猫' },
  { sound: 'h', phase: 1, objects: ['hat', 'hen', 'horse', 'house', 'hammer', 'hand'], taobao: '迷你帽子/马' },
  // Phase 2: Medium difficulty
  { sound: 'b', phase: 2, objects: ['ball', 'bat', 'bed', 'bus', 'bug', 'box'], taobao: '迷你球/床' },
  { sound: 'd', phase: 2, objects: ['dog', 'doll', 'duck', 'door', 'drum', 'dish'], taobao: '迷你狗/鸭' },
  { sound: 'g', phase: 2, objects: ['goat', 'gift', 'glass', 'grape', 'guitar', 'gold'], taobao: '迷你山羊/礼物' },
  { sound: 'j', phase: 2, objects: ['jet', 'jam', 'jug', 'jar', 'jeep', 'jump rope'], taobao: '迷你飞机/果酱' },
  { sound: 'w', phase: 2, objects: ['wig', 'web', 'watch', 'worm', 'wagon', 'wolf'], taobao: '迷你假发/手表' },
  // Phase 3: Hard sounds (don't exist in Mandarin)
  { sound: 'v', phase: 3, objects: ['van', 'vest', 'vase', 'violin', 'vine', 'vet'], taobao: '迷你货车/花瓶', eslNote: 'Teeth on lip! Chinese speakers say /w/' },
  { sound: 'r', phase: 3, objects: ['ring', 'rug', 'rat', 'rain', 'rabbit', 'rocket'], taobao: '迷你戒指/兔子', eslNote: 'Tongue curled back, NOT /l/' },
  { sound: 'l', phase: 3, objects: ['leg', 'lamp', 'lid', 'log', 'leaf', 'lemon'], taobao: '迷你台灯/叶子', eslNote: 'Tongue touches roof' },
  { sound: 'z', phase: 3, objects: ['zip', 'zoo', 'zebra', 'zero', 'zigzag', 'zipper'], taobao: '迷你拉链/斑马', eslNote: 'Voice the /s/ sound' },
  // Vowels
  { sound: 'a', phase: 'vowel', objects: ['ant', 'apple', 'ax', 'alligator', 'astronaut', 'anchor'], taobao: '迷你蚂蚁/苹果' },
  { sound: 'e', phase: 'vowel', objects: ['egg', 'elf', 'elephant', 'elbow', 'envelope', 'engine'], taobao: '迷你鸡蛋/大象' },
  { sound: 'i', phase: 'vowel', objects: ['igloo', 'insect', 'ink', 'iguana', 'inch', 'infant'], taobao: '迷你冰屋/昆虫' },
  { sound: 'o', phase: 'vowel', objects: ['octopus', 'ox', 'olive', 'otter', 'ostrich', 'orange'], taobao: '迷你章鱼/橙子' },
  { sound: 'u', phase: 'vowel', objects: ['umbrella', 'umpire', 'unicorn', 'up arrow', 'under', 'utensil'], taobao: '迷你雨伞' },
];

// ============================================
// ENDING SOUND OBJECTS (5 per sound)
// ============================================

export const ENDING_SOUND_OBJECTS = [
  { sound: 't', objects: ['cat', 'hat', 'bat', 'pot', 'net'], note: 'Most common CVC ending' },
  { sound: 'p', objects: ['cup', 'cap', 'mop', 'map', 'top'], note: 'Clear stop sound' },
  { sound: 'n', objects: ['sun', 'pan', 'can', 'fan', 'pen'], note: 'Continuous - easy to hear' },
  { sound: 'g', objects: ['dog', 'pig', 'bag', 'rug', 'bug'], note: 'Voiced stop' },
  { sound: 'd', objects: ['bed', 'red', 'lid', 'mud', 'bud'], note: 'Voiced - harder than /t/' },
  { sound: 'x', objects: ['box', 'fox', 'six', 'wax', 'mix'], note: 'Actually /ks/ blend' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get all CVC words as flat array (for games)
export function getAllCVCWords(): MasterWord[] {
  return MASTER_CVC_WORDS.flatMap(group => group.words);
}

// Get words by vowel
export function getWordsByVowel(vowel: string): MasterWord[] {
  const group = MASTER_CVC_WORDS.find(g => g.vowel === vowel);
  return group?.words || [];
}

// Get vowel group data
export function getVowelGroup(vowel: string): VowelGroup | undefined {
  return MASTER_CVC_WORDS.find(g => g.vowel === vowel);
}

// Convert to game format (for backwards compatibility)
export function toGameFormat(words: MasterWord[]): { word: string; image: string; audioUrl: string }[] {
  return words.map(w => ({
    word: w.word,
    image: w.image,
    audioUrl: w.audioUrl,
  }));
}

// ============================================
// SHOPPING SUMMARY
// ============================================

export const SHOPPING_SUMMARY = {
  totalCVCWords: 30,
  wordsPerVowel: 6,
  estimatedBudget: '¥150-200 for CVC miniatures',
  taobaoSearches: [
    '仿真小动物模型套装 (realistic mini animal set) - covers cat, dog, pig, hen, fox, bug',
    '迷你家具配件 (mini furniture accessories) - covers bed, pot, pan, cup, box',
    '过家家小物件 (pretend play small items) - covers mop, bag, wig, net',
  ],
  basketOrganization: [
    { vowel: 'a', color: 'Red basket', items: 'cat, hat, bat, map, pan, bag' },
    { vowel: 'e', color: 'Green basket', items: 'bed, pen, hen, net, leg, web' },
    { vowel: 'i', color: 'Orange basket', items: 'pig, pin, bin, lip, wig, fin' },
    { vowel: 'o', color: 'Blue basket', items: 'dog, pot, mop, box, fox, log' },
    { vowel: 'u', color: 'Purple basket', items: 'cup, bug, rug, sun, bus, nut' },
  ],
};
