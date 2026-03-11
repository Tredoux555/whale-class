// lib/montree/phonics/phonics-data.ts
// =====================================================================
// MASTER PHONICS DATA — Single source of truth for ALL phonics tools
// Covers: Initial Words (CMAT), Phase 2 CVC, Blue Series 1 & 2
// =====================================================================

export interface PhonicsWord {
  word: string;
  image: string;          // Emoji fallback (tools support photo replacement)
  miniature: string;      // What to buy for physical Montessori tray
  isNoun: boolean;        // Can be pictured as an object
  customImageUrl?: string; // User-uploaded photo URL (overrides emoji)
}

export interface PhonicsWordGroup {
  id: string;
  label: string;
  description: string;
  words: PhonicsWord[];
}

export interface PhonicsPhase {
  id: string;
  name: string;
  color: string;
  description: string;
  groups: PhonicsWordGroup[];
}

// =====================================================================
// SIGHT WORDS — High-frequency words for sentences & stories
// =====================================================================

export const SIGHT_WORDS = [
  'the', 'a', 'is', 'on', 'in', 'at', 'it', 'and', 'I', 'can',
  'see', 'my', 'to', 'go', 'up', 'we', 'he', 'she', 'big', 'little',
  'put', 'get', 'has', 'his', 'her', 'not', 'but', 'was', 'for', 'are',
  'you', 'do', 'no', 'so', 'said', 'with', 'this', 'that', 'of', 'from',
];

// =====================================================================
// PHASE: INITIAL WORD LIST (CMAT Tray System)
// Progressive letter introduction: c,m,a,t → d,n,e,k → s,r,i,p → h,u,j,l → b,f,o,g → v,w,x,y,z,q
// =====================================================================

export const INITIAL_WORDS: PhonicsPhase = {
  id: 'initial',
  name: 'Initial Words',
  color: '#10b981', // emerald
  description: 'First words — CMAT tray progression. Each tray adds new letter sounds.',
  groups: [
    {
      id: 'tray-1',
      label: 'Tray 1 — c m a t',
      description: 'First 4 sounds: /k/ /m/ /a/ /t/',
      words: [
        { word: 'cat', image: '🐱', miniature: 'plastic cat figurine', isNoun: true },
        { word: 'mat', image: '🧶', miniature: 'small felt mat or coaster', isNoun: true },
      ],
    },
    {
      id: 'tray-2',
      label: 'Tray 1+2 — add d n e k',
      description: 'Add: /d/ /n/ /e/ /k/',
      words: [
        { word: 'can', image: '🥫', miniature: 'miniature tin can', isNoun: true },
        { word: 'men', image: '👨‍👨‍👦', miniature: 'small people figurines', isNoun: true },
        { word: 'net', image: '🥅', miniature: 'small fish net or mesh', isNoun: true },
        { word: 'sad', image: '😢', miniature: 'sad face card or figurine', isNoun: false },
      ],
    },
    {
      id: 'tray-3',
      label: 'Tray 1+2+3 — add s r i p',
      description: 'Add: /s/ /r/ /i/ /p/',
      words: [
        { word: 'sit', image: '🪑', miniature: 'small chair figurine', isNoun: false },
        { word: 'rip', image: '📄', miniature: 'torn paper sample', isNoun: false },
        { word: 'pin', image: '📌', miniature: 'safety pin (capped)', isNoun: true },
        { word: 'map', image: '🗺️', miniature: 'mini folded paper map', isNoun: true },
      ],
    },
    {
      id: 'tray-4',
      label: 'Tray 1+2+3+4 — add h u j l',
      description: 'Add: /h/ /u/ /j/ /l/',
      words: [
        { word: 'hut', image: '🛖', miniature: 'small hut figurine or picture', isNoun: true },
        { word: 'lip', image: '👄', miniature: 'lip picture card', isNoun: true },
        { word: 'run', image: '🏃', miniature: 'running figure', isNoun: false },
        { word: 'hill', image: '⛰️', miniature: 'small mound or picture', isNoun: true },
      ],
    },
    {
      id: 'tray-5',
      label: 'Tray 1+2+3+4+5 — add b f o g',
      description: 'Add: /b/ /f/ /o/ /g/',
      words: [
        { word: 'bog', image: '🌿', miniature: 'picture card of bog/marsh', isNoun: true },
        { word: 'fig', image: '🫒', miniature: 'dried fig or picture', isNoun: true },
        { word: 'bed', image: '🛏️', miniature: 'dollhouse bed', isNoun: true },
        { word: 'fog', image: '🌫️', miniature: 'fog picture card', isNoun: true },
        { word: 'top', image: '🔝', miniature: 'spinning top toy', isNoun: true },
      ],
    },
    {
      id: 'tray-6',
      label: 'All Trays — add v w x y z q',
      description: 'Complete alphabet: /v/ /w/ /x/ /y/ /z/ /kw/',
      words: [
        { word: 'van', image: '🚐', miniature: 'toy van', isNoun: true },
        { word: 'web', image: '🕸️', miniature: 'plastic spider web', isNoun: true },
        { word: 'yam', image: '🍠', miniature: 'small yam or picture', isNoun: true },
        { word: 'zip', image: '🤐', miniature: 'zipper pull or sample', isNoun: true },
      ],
    },
  ],
};

// =====================================================================
// PHASE 2: EXPANDED CVC WORDS
// All common CVC words organized by vowel sound
// =====================================================================

export const PHASE_2_WORDS: PhonicsPhase = {
  id: 'phase2',
  name: 'Phase 2 — CVC Expansion',
  color: '#3b82f6', // blue
  description: 'More CVC words using the full alphabet. Organized by short vowel sound.',
  groups: [
    {
      id: 'short-a',
      label: 'Short A',
      description: 'Words with short /a/ sound (as in "cat")',
      words: [
        { word: 'bat', image: '🦇', miniature: 'plastic bat figurine', isNoun: true },
        { word: 'hat', image: '🎩', miniature: 'doll hat or mini hat', isNoun: true },
        { word: 'rat', image: '🐀', miniature: 'plastic rat figurine', isNoun: true },
        { word: 'pan', image: '🍳', miniature: 'dollhouse pan', isNoun: true },
        { word: 'fan', image: '🪭', miniature: 'small folding fan', isNoun: true },
        { word: 'bag', image: '👜', miniature: 'tiny fabric pouch', isNoun: true },
        { word: 'tag', image: '🏷️', miniature: 'luggage tag', isNoun: true },
        { word: 'rag', image: '🧹', miniature: 'small cloth rag', isNoun: true },
        { word: 'cab', image: '🚕', miniature: 'toy taxi cab', isNoun: true },
        { word: 'dad', image: '👨', miniature: 'man figurine', isNoun: true },
        { word: 'ham', image: '🍖', miniature: 'toy ham or picture', isNoun: true },
        { word: 'jam', image: '🍯', miniature: 'mini jam jar', isNoun: true },
        { word: 'ram', image: '🐏', miniature: 'plastic ram figurine', isNoun: true },
        { word: 'cap', image: '🧢', miniature: 'doll cap', isNoun: true },
        { word: 'gap', image: '🫗', miniature: 'picture card', isNoun: true },
        { word: 'lap', image: '🧎', miniature: 'picture card', isNoun: true },
        { word: 'nap', image: '😴', miniature: 'sleeping figure', isNoun: true },
        { word: 'tap', image: '🚰', miniature: 'miniature faucet', isNoun: true },
        { word: 'wag', image: '🐕‍🦺', miniature: 'wagging dog figurine', isNoun: false },
        { word: 'tax', image: '💰', miniature: 'picture card', isNoun: true },
        { word: 'wax', image: '🕯️', miniature: 'small wax piece or candle', isNoun: true },
      ],
    },
    {
      id: 'short-e',
      label: 'Short E',
      description: 'Words with short /e/ sound (as in "bed")',
      words: [
        { word: 'hen', image: '🐔', miniature: 'plastic hen figurine', isNoun: true },
        { word: 'pen', image: '🖊️', miniature: 'mini pen or real pen', isNoun: true },
        { word: 'ten', image: '🔟', miniature: 'number 10 card', isNoun: true },
        { word: 'den', image: '🏠', miniature: 'picture card of den', isNoun: true },
        { word: 'red', image: '🔴', miniature: 'red object or card', isNoun: false },
        { word: 'leg', image: '🦵', miniature: 'doll leg or toy figure', isNoun: true },
        { word: 'peg', image: '📎', miniature: 'wooden clothespeg', isNoun: true },
        { word: 'keg', image: '🛢️', miniature: 'mini barrel', isNoun: true },
        { word: 'beg', image: '🙏', miniature: 'picture card', isNoun: false },
        { word: 'jet', image: '✈️', miniature: 'toy jet', isNoun: true },
        { word: 'pet', image: '🐾', miniature: 'small pet figurine', isNoun: true },
        { word: 'vet', image: '👩‍⚕️', miniature: 'vet figurine', isNoun: true },
        { word: 'wet', image: '💧', miniature: 'water drop picture', isNoun: false },
        { word: 'gem', image: '💎', miniature: 'plastic gem stone', isNoun: true },
        { word: 'set', image: '🎯', miniature: 'picture card', isNoun: true },
      ],
    },
    {
      id: 'short-i',
      label: 'Short I',
      description: 'Words with short /i/ sound (as in "sit")',
      words: [
        { word: 'pig', image: '🐷', miniature: 'plastic pig figurine', isNoun: true },
        { word: 'dig', image: '⛏️', miniature: 'mini shovel', isNoun: false },
        { word: 'big', image: '🐘', miniature: 'large vs small picture card', isNoun: false },
        { word: 'wig', image: '💇', miniature: 'doll wig or hair piece', isNoun: true },
        { word: 'fig', image: '🫒', miniature: 'dried fig or picture', isNoun: true },
        { word: 'jig', image: '💃', miniature: 'dancing figure', isNoun: true },
        { word: 'bin', image: '🗑️', miniature: 'tiny trash can', isNoun: true },
        { word: 'fin', image: '🦈', miniature: 'plastic shark fin', isNoun: true },
        { word: 'tin', image: '🥫', miniature: 'small tin container', isNoun: true },
        { word: 'win', image: '🏆', miniature: 'mini trophy', isNoun: false },
        { word: 'kid', image: '👦', miniature: 'child figurine', isNoun: true },
        { word: 'lid', image: '🫙', miniature: 'small jar lid', isNoun: true },
        { word: 'hid', image: '🙈', miniature: 'hiding figure picture', isNoun: false },
        { word: 'bit', image: '🍪', miniature: 'bite-sized piece picture', isNoun: true },
        { word: 'fit', image: '💪', miniature: 'picture card', isNoun: false },
        { word: 'hit', image: '🥊', miniature: 'mini boxing glove', isNoun: false },
        { word: 'kit', image: '🧰', miniature: 'small toolkit', isNoun: true },
        { word: 'dip', image: '🫕', miniature: 'dipping picture card', isNoun: true },
        { word: 'hip', image: '🧍', miniature: 'body picture card', isNoun: true },
        { word: 'tip', image: '👆', miniature: 'pointing finger picture', isNoun: true },
        { word: 'six', image: '6️⃣', miniature: 'number 6 card', isNoun: true },
        { word: 'mix', image: '🥄', miniature: 'small mixing spoon', isNoun: false },
      ],
    },
    {
      id: 'short-o',
      label: 'Short O',
      description: 'Words with short /o/ sound (as in "dog")',
      words: [
        { word: 'dog', image: '🐕', miniature: 'plastic dog figurine', isNoun: true },
        { word: 'log', image: '🪵', miniature: 'small wooden dowel', isNoun: true },
        { word: 'hog', image: '🐖', miniature: 'plastic hog figurine', isNoun: true },
        { word: 'jog', image: '🏃', miniature: 'jogging figure', isNoun: false },
        { word: 'cog', image: '⚙️', miniature: 'small gear/cog', isNoun: true },
        { word: 'fox', image: '🦊', miniature: 'plastic fox figurine', isNoun: true },
        { word: 'box', image: '📦', miniature: 'tiny cardboard box', isNoun: true },
        { word: 'pot', image: '🍲', miniature: 'dollhouse pot', isNoun: true },
        { word: 'hot', image: '🔥', miniature: 'flame picture card', isNoun: false },
        { word: 'dot', image: '🔴', miniature: 'dot sticker', isNoun: true },
        { word: 'cot', image: '🛏️', miniature: 'dollhouse cot/bed', isNoun: true },
        { word: 'mop', image: '🧹', miniature: 'mini mop', isNoun: true },
        { word: 'hop', image: '🐸', miniature: 'hopping frog picture', isNoun: false },
        { word: 'pop', image: '🎈', miniature: 'popping balloon picture', isNoun: false },
        { word: 'nod', image: '😊', miniature: 'nodding picture card', isNoun: false },
        { word: 'rod', image: '🎣', miniature: 'small rod or stick', isNoun: true },
        { word: 'pod', image: '🫛', miniature: 'pea pod or picture', isNoun: true },
        { word: 'cod', image: '🐟', miniature: 'fish figurine', isNoun: true },
        { word: 'rob', image: '🦹', miniature: 'picture card', isNoun: false },
        { word: 'job', image: '👷', miniature: 'worker figurine', isNoun: true },
        { word: 'mob', image: '👥', miniature: 'group picture card', isNoun: true },
      ],
    },
    {
      id: 'short-u',
      label: 'Short U',
      description: 'Words with short /u/ sound (as in "hut")',
      words: [
        { word: 'cup', image: '🥤', miniature: 'dollhouse cup or shot glass', isNoun: true },
        { word: 'bug', image: '🐛', miniature: 'plastic bug figurine', isNoun: true },
        { word: 'rug', image: '🧶', miniature: 'small felt square', isNoun: true },
        { word: 'sun', image: '☀️', miniature: 'sun charm or cutout', isNoun: true },
        { word: 'bus', image: '🚌', miniature: 'toy bus', isNoun: true },
        { word: 'nut', image: '🥜', miniature: 'real walnut or acorn', isNoun: true },
        { word: 'mug', image: '☕', miniature: 'miniature mug', isNoun: true },
        { word: 'pug', image: '🐶', miniature: 'pug dog figurine', isNoun: true },
        { word: 'tug', image: '🚢', miniature: 'small tugboat', isNoun: true },
        { word: 'jug', image: '🫗', miniature: 'small ceramic jug', isNoun: true },
        { word: 'dug', image: '⛏️', miniature: 'shovel picture card', isNoun: false },
        { word: 'hug', image: '🤗', miniature: 'hugging figures', isNoun: false },
        { word: 'bun', image: '🍞', miniature: 'toy bun or picture', isNoun: true },
        { word: 'fun', image: '🎉', miniature: 'party picture card', isNoun: true },
        { word: 'gun', image: '🔫', miniature: 'toy water gun', isNoun: true },
        { word: 'nun', image: '👩‍🦲', miniature: 'nun figurine', isNoun: true },
        { word: 'bud', image: '🌱', miniature: 'flower bud picture', isNoun: true },
        { word: 'mud', image: '🟤', miniature: 'mud picture card', isNoun: true },
        { word: 'cub', image: '🐻', miniature: 'bear cub figurine', isNoun: true },
        { word: 'tub', image: '🛁', miniature: 'dollhouse bathtub', isNoun: true },
        { word: 'sub', image: '🚇', miniature: 'toy submarine', isNoun: true },
        { word: 'gum', image: '🫧', miniature: 'bubble gum picture', isNoun: true },
        { word: 'hum', image: '🎵', miniature: 'music note card', isNoun: false },
      ],
    },
  ],
};

// =====================================================================
// BLUE SERIES 1: CONSONANT DIGRAPHS (sh, ch, th, wh)
// ~20 words with easily sourceable objects
// =====================================================================

export const BLUE_SERIES_1: PhonicsPhase = {
  id: 'blue1',
  name: 'Blue Series 1 — Consonant Digraphs',
  color: '#6366f1', // indigo
  description: 'Two letters making one new sound: sh, ch, th, wh. Focus on concrete, picturable words.',
  groups: [
    {
      id: 'sh-words',
      label: 'SH Words',
      description: '/sh/ — lips pushed forward, air flows out',
      words: [
        { word: 'ship', image: '🚢', miniature: 'toy ship', isNoun: true },
        { word: 'shop', image: '🏪', miniature: 'miniature shop or picture', isNoun: true },
        { word: 'shed', image: '🏚️', miniature: 'small shed picture or model', isNoun: true },
        { word: 'shell', image: '🐚', miniature: 'real seashell', isNoun: true },
        { word: 'shin', image: '🦵', miniature: 'body part picture card', isNoun: true },
        { word: 'fish', image: '🐟', miniature: 'plastic fish', isNoun: true },
        { word: 'dish', image: '🍽️', miniature: 'dollhouse dish', isNoun: true },
        { word: 'wish', image: '⭐', miniature: 'wishing star picture', isNoun: true },
      ],
    },
    {
      id: 'ch-words',
      label: 'CH Words',
      description: '/ch/ — tongue touches roof, quick puff of air',
      words: [
        { word: 'chip', image: '🍟', miniature: 'toy chip or picture', isNoun: true },
        { word: 'chop', image: '🪓', miniature: 'small chopping picture', isNoun: false },
        { word: 'chin', image: '😊', miniature: 'face picture pointing to chin', isNoun: true },
        { word: 'chick', image: '🐤', miniature: 'plastic chick figurine', isNoun: true },
        { word: 'chess', image: '♟️', miniature: 'chess piece', isNoun: true },
        { word: 'rich', image: '💰', miniature: 'gold coin or picture', isNoun: false },
      ],
    },
    {
      id: 'th-words',
      label: 'TH Words',
      description: '/th/ — tongue between teeth',
      words: [
        { word: 'thin', image: '📏', miniature: 'thin stick or picture', isNoun: false },
        { word: 'thick', image: '📚', miniature: 'thick book or object', isNoun: false },
        { word: 'thumb', image: '👍', miniature: 'thumb picture card', isNoun: true },
        { word: 'bath', image: '🛁', miniature: 'dollhouse bathtub', isNoun: true },
        { word: 'moth', image: '🦋', miniature: 'plastic moth or picture', isNoun: true },
        { word: 'path', image: '🛤️', miniature: 'path picture card', isNoun: true },
      ],
    },
    {
      id: 'wh-words',
      label: 'WH Words',
      description: '/wh/ — round lips, breathy sound',
      words: [
        { word: 'whip', image: '🏇', miniature: 'toy whip or picture', isNoun: true },
        { word: 'whale', image: '🐋', miniature: 'plastic whale figurine', isNoun: true },
        { word: 'wheel', image: '☸️', miniature: 'small wheel or toy car wheel', isNoun: true },
        { word: 'whisk', image: '🥄', miniature: 'mini whisk', isNoun: true },
      ],
    },
  ],
};

// =====================================================================
// BLUE SERIES 2: VOWEL DIGRAPHS (oa, ee, ai, oo)
// ~20 words with easily sourceable objects
// =====================================================================

export const BLUE_SERIES_2: PhonicsPhase = {
  id: 'blue2',
  name: 'Blue Series 2 — Vowel Digraphs',
  color: '#8b5cf6', // violet
  description: 'Two vowels making one long sound: oa, ee, ai, oo. Concrete, picturable words.',
  groups: [
    {
      id: 'oa-words',
      label: 'OA Words',
      description: '/oa/ — long O sound (boat, coat)',
      words: [
        { word: 'boat', image: '⛵', miniature: 'toy boat', isNoun: true },
        { word: 'coat', image: '🧥', miniature: 'doll coat', isNoun: true },
        { word: 'goat', image: '🐐', miniature: 'plastic goat figurine', isNoun: true },
        { word: 'soap', image: '🧼', miniature: 'mini soap bar', isNoun: true },
        { word: 'toad', image: '🐸', miniature: 'plastic toad figurine', isNoun: true },
        { word: 'road', image: '🛣️', miniature: 'road picture card', isNoun: true },
        { word: 'oak', image: '🌳', miniature: 'small oak leaf or picture', isNoun: true },
        { word: 'toast', image: '🍞', miniature: 'toy toast or picture', isNoun: true },
      ],
    },
    {
      id: 'ee-words',
      label: 'EE Words',
      description: '/ee/ — long E sound (bee, tree)',
      words: [
        { word: 'bee', image: '🐝', miniature: 'plastic bee figurine', isNoun: true },
        { word: 'tree', image: '🌳', miniature: 'miniature tree', isNoun: true },
        { word: 'seed', image: '🌱', miniature: 'real seeds in bag', isNoun: true },
        { word: 'feet', image: '🦶', miniature: 'feet picture card', isNoun: true },
        { word: 'jeep', image: '🚙', miniature: 'toy jeep', isNoun: true },
        { word: 'sheep', image: '🐑', miniature: 'plastic sheep figurine', isNoun: true },
      ],
    },
    {
      id: 'ai-words',
      label: 'AI Words',
      description: '/ai/ — long A sound (rain, nail)',
      words: [
        { word: 'rain', image: '🌧️', miniature: 'rain picture card', isNoun: true },
        { word: 'nail', image: '🔩', miniature: 'real nail (capped)', isNoun: true },
        { word: 'tail', image: '🐕', miniature: 'animal tail picture', isNoun: true },
        { word: 'snail', image: '🐌', miniature: 'plastic snail figurine', isNoun: true },
        { word: 'train', image: '🚂', miniature: 'toy train', isNoun: true },
        { word: 'pail', image: '🪣', miniature: 'small pail/bucket', isNoun: true },
      ],
    },
    {
      id: 'oo-words',
      label: 'OO Words',
      description: '/oo/ — long OO sound (moon, boot)',
      words: [
        { word: 'moon', image: '🌙', miniature: 'moon picture or charm', isNoun: true },
        { word: 'boot', image: '🥾', miniature: 'doll boot', isNoun: true },
        { word: 'book', image: '📖', miniature: 'miniature book', isNoun: true },
        { word: 'hook', image: '🪝', miniature: 'small hook', isNoun: true },
        { word: 'spoon', image: '🥄', miniature: 'small spoon', isNoun: true },
        { word: 'pool', image: '🏊', miniature: 'pool picture card', isNoun: true },
      ],
    },
  ],
};

// =====================================================================
// ALL PHASES — Convenience accessor
// =====================================================================

export const ALL_PHASES: PhonicsPhase[] = [
  INITIAL_WORDS,
  PHASE_2_WORDS,
  BLUE_SERIES_1,
  BLUE_SERIES_2,
];

// =====================================================================
// SENTENCE TEMPLATES — For sentence card generator
// Uses initial words + sight words. {word} placeholders replaced per word.
// =====================================================================

export interface SentenceTemplate {
  pattern: string;       // e.g. "The {word} is on the mat."
  requiredWords: string[]; // words that must exist for this template
  phase: string;         // which phase this belongs to
}

export const SENTENCE_TEMPLATES: SentenceTemplate[] = [
  // Initial word sentences — very simple, 3-5 words
  { pattern: 'The {word} sat.', requiredWords: ['cat', 'dog', 'hen', 'rat', 'pig'], phase: 'initial' },
  { pattern: 'I see a {word}.', requiredWords: ['cat', 'mat', 'can', 'net', 'pin', 'map', 'hut', 'van', 'web', 'fig', 'bed', 'bus'], phase: 'initial' },
  { pattern: 'The {word} is big.', requiredWords: ['cat', 'dog', 'bus', 'van', 'bed', 'hut', 'box', 'pot', 'sun', 'bug'], phase: 'initial' },
  { pattern: 'A {word} can run.', requiredWords: ['cat', 'dog', 'pig', 'hen', 'fox', 'rat', 'bug'], phase: 'initial' },
  { pattern: 'I can see the {word}.', requiredWords: ['cat', 'mat', 'sun', 'bus', 'van', 'bed', 'web', 'fog', 'hill'], phase: 'initial' },
  { pattern: 'The {word} is red.', requiredWords: ['hat', 'bag', 'bus', 'cup', 'rug', 'pan', 'can', 'bed'], phase: 'initial' },
  { pattern: 'Put the {word} on the mat.', requiredWords: ['cat', 'hat', 'cup', 'pen', 'pin', 'bag', 'nut', 'box'], phase: 'initial' },
  { pattern: 'Get the {word} for me.', requiredWords: ['hat', 'bag', 'cup', 'map', 'net', 'pin', 'rug', 'mug', 'pan'], phase: 'initial' },
  // Phase 2 sentences — slightly longer
  { pattern: 'The fat {word} sat on a mat.', requiredWords: ['cat', 'rat', 'hen', 'pig', 'bug'], phase: 'phase2' },
  { pattern: 'A big {word} and a little {word2}.', requiredWords: ['dog', 'cat', 'pig', 'bug', 'hen', 'fox', 'rat'], phase: 'phase2' },
  { pattern: 'The {word} is in the {word2}.', requiredWords: ['cup', 'box', 'bag', 'bin', 'pot', 'pan', 'tin', 'tub', 'jug', 'mug'], phase: 'phase2' },
  { pattern: 'I put the {word} in my bag.', requiredWords: ['hat', 'pen', 'cup', 'nut', 'gem', 'pin', 'map'], phase: 'phase2' },
  { pattern: 'Can you see the {word} on the hill?', requiredWords: ['dog', 'fox', 'hut', 'van', 'bus', 'ram'], phase: 'phase2' },
  // Blue Series 1 sentences
  { pattern: 'The {word} is on the shelf.', requiredWords: ['ship', 'shell', 'dish', 'fish', 'chip', 'whisk', 'wheel'], phase: 'blue1' },
  { pattern: 'I can see a {word} in the shop.', requiredWords: ['fish', 'chip', 'dish', 'shell', 'whisk'], phase: 'blue1' },
  { pattern: 'The {word} is in the bath.', requiredWords: ['fish', 'ship', 'whale', 'duck'], phase: 'blue1' },
  // Blue Series 2 sentences
  { pattern: 'The {word} is in the boat.', requiredWords: ['goat', 'toad', 'sheep', 'snail'], phase: 'blue2' },
  { pattern: 'I see a {word} by the tree.', requiredWords: ['bee', 'snail', 'goat', 'toad', 'sheep'], phase: 'blue2' },
  { pattern: 'The {word} is in the rain.', requiredWords: ['snail', 'toad', 'goat', 'sheep', 'bee'], phase: 'blue2' },
];

// =====================================================================
// SHORT STORIES — For story generator (words + sight words)
// =====================================================================

export interface ShortStory {
  id: string;
  title: string;
  phase: string;
  words: string[];        // Phonics words used
  sightWords: string[];   // Sight words introduced
  pages: StoryPage[];
}

export interface StoryPage {
  text: string;
  sceneEmoji: string;     // Visual scene (emoji fallback)
  sceneDescription: string; // For picture sourcing
}

export const SHORT_STORIES: ShortStory[] = [
  {
    id: 'cat-on-mat',
    title: 'The Cat on the Mat',
    phase: 'initial',
    words: ['cat', 'mat', 'sat', 'hat', 'bat', 'rat'],
    sightWords: ['the', 'on', 'a', 'and', 'see', 'I'],
    pages: [
      { text: 'I see a cat.', sceneEmoji: '🐱', sceneDescription: 'A cat sitting' },
      { text: 'The cat sat on a mat.', sceneEmoji: '🐱🧶', sceneDescription: 'Cat sitting on a mat' },
      { text: 'I see a hat on the mat.', sceneEmoji: '🎩🧶', sceneDescription: 'Hat on a mat' },
      { text: 'The cat sat on the hat!', sceneEmoji: '🐱🎩', sceneDescription: 'Cat sitting on a hat' },
    ],
  },
  {
    id: 'big-red-bus',
    title: 'The Big Red Bus',
    phase: 'initial',
    words: ['bus', 'run', 'sun', 'hill', 'sit', 'map'],
    sightWords: ['the', 'is', 'big', 'up', 'a', 'can', 'I', 'see'],
    pages: [
      { text: 'I see a big bus.', sceneEmoji: '🚌', sceneDescription: 'A big red bus' },
      { text: 'The bus can run up the hill.', sceneEmoji: '🚌⛰️', sceneDescription: 'Bus going up a hill' },
      { text: 'The sun is up.', sceneEmoji: '☀️', sceneDescription: 'Bright sun in sky' },
      { text: 'I sit on the bus.', sceneEmoji: '🧑🚌', sceneDescription: 'Child sitting on bus' },
    ],
  },
  {
    id: 'dog-and-fog',
    title: 'The Dog in the Fog',
    phase: 'initial',
    words: ['dog', 'fog', 'log', 'hut', 'bed', 'run', 'sad'],
    sightWords: ['the', 'in', 'a', 'is', 'to', 'his', 'he', 'and'],
    pages: [
      { text: 'The dog is in the fog.', sceneEmoji: '🐕🌫️', sceneDescription: 'Dog lost in fog' },
      { text: 'He is sad.', sceneEmoji: '🐕😢', sceneDescription: 'Sad dog' },
      { text: 'He can see a hut!', sceneEmoji: '🐕🛖', sceneDescription: 'Dog sees a hut' },
      { text: 'The dog ran to his bed.', sceneEmoji: '🐕🛏️', sceneDescription: 'Dog in his bed, happy' },
    ],
  },
  {
    id: 'hen-and-pen',
    title: 'The Hen and the Pen',
    phase: 'phase2',
    words: ['hen', 'pen', 'net', 'bed', 'red', 'ten', 'pet', 'wet'],
    sightWords: ['the', 'a', 'is', 'in', 'and', 'I', 'my', 'see', 'has', 'she', 'her'],
    pages: [
      { text: 'I have a pet hen.', sceneEmoji: '🐔', sceneDescription: 'A pet hen' },
      { text: 'She has a red pen.', sceneEmoji: '🐔🖊️', sceneDescription: 'Hen with red pen' },
      { text: 'The hen sat in a net.', sceneEmoji: '🐔🥅', sceneDescription: 'Hen in a net' },
      { text: 'I see ten wet hens!', sceneEmoji: '🐔💧🔟', sceneDescription: 'Ten wet hens' },
    ],
  },
  {
    id: 'pig-and-wig',
    title: 'The Pig in a Wig',
    phase: 'phase2',
    words: ['pig', 'wig', 'big', 'jig', 'dig', 'bin', 'tin', 'lid'],
    sightWords: ['the', 'a', 'in', 'is', 'and', 'can', 'with', 'I', 'see'],
    pages: [
      { text: 'I see a big pig.', sceneEmoji: '🐷', sceneDescription: 'A big pig' },
      { text: 'The pig has a wig!', sceneEmoji: '🐷💇', sceneDescription: 'Pig wearing a wig' },
      { text: 'The pig can jig and dig.', sceneEmoji: '🐷💃⛏️', sceneDescription: 'Pig dancing and digging' },
      { text: 'The wig is in the bin!', sceneEmoji: '💇🗑️', sceneDescription: 'Wig in a bin' },
    ],
  },
  {
    id: 'fox-in-box',
    title: 'The Fox in a Box',
    phase: 'phase2',
    words: ['fox', 'box', 'dog', 'log', 'hop', 'top', 'pot', 'hot'],
    sightWords: ['the', 'a', 'in', 'on', 'is', 'and', 'can', 'see', 'I', 'it'],
    pages: [
      { text: 'A fox is in a box.', sceneEmoji: '🦊📦', sceneDescription: 'Fox inside a box' },
      { text: 'The dog sat on the log.', sceneEmoji: '🐕🪵', sceneDescription: 'Dog sitting on log' },
      { text: 'The fox can hop on top!', sceneEmoji: '🦊📦🔝', sceneDescription: 'Fox hopping on top of box' },
      { text: 'It is hot. The fox ran!', sceneEmoji: '🦊🔥🏃', sceneDescription: 'Fox running away' },
    ],
  },
  {
    id: 'ship-and-fish',
    title: 'The Ship and the Fish',
    phase: 'blue1',
    words: ['ship', 'fish', 'shell', 'dish', 'shop', 'chip', 'chin', 'bath'],
    sightWords: ['the', 'a', 'in', 'on', 'is', 'and', 'I', 'can', 'see', 'with'],
    pages: [
      { text: 'I see a big ship.', sceneEmoji: '🚢', sceneDescription: 'A big ship on the sea' },
      { text: 'A fish is in the sea.', sceneEmoji: '🐟🌊', sceneDescription: 'Fish swimming in sea' },
      { text: 'I see a shell on the ship.', sceneEmoji: '🐚🚢', sceneDescription: 'Shell on the deck of ship' },
      { text: 'Fish and chips on a dish!', sceneEmoji: '🐟🍟🍽️', sceneDescription: 'Fish and chips meal' },
    ],
  },
  {
    id: 'goat-in-boat',
    title: 'The Goat in a Boat',
    phase: 'blue2',
    words: ['goat', 'boat', 'coat', 'toad', 'road', 'rain', 'snail', 'tree'],
    sightWords: ['the', 'a', 'in', 'on', 'is', 'and', 'I', 'can', 'see', 'his'],
    pages: [
      { text: 'A goat is in a boat.', sceneEmoji: '🐐⛵', sceneDescription: 'Goat sitting in a small boat' },
      { text: 'The goat has a coat.', sceneEmoji: '🐐🧥', sceneDescription: 'Goat wearing a coat' },
      { text: 'I see a toad on the road.', sceneEmoji: '🐸🛣️', sceneDescription: 'Toad on a road' },
      { text: 'The snail is in the rain!', sceneEmoji: '🐌🌧️', sceneDescription: 'Snail in the rain under a tree' },
    ],
  },
];

// =====================================================================
// COMMAND CARD SENTENCES — Using phonics words
// "Put the cat on the shelf" style
// =====================================================================

export interface CommandSentence {
  text: string;
  level: 1 | 2 | 3;
  phase: string;
  phonicsWords: string[];
}

export const PHONICS_COMMANDS: CommandSentence[] = [
  // Level 1: Single action with phonics noun
  { text: 'Get the cat.', level: 1, phase: 'initial', phonicsWords: ['cat'] },
  { text: 'Get the mat.', level: 1, phase: 'initial', phonicsWords: ['mat'] },
  { text: 'Get the hat.', level: 1, phase: 'initial', phonicsWords: ['hat'] },
  { text: 'Get the cup.', level: 1, phase: 'initial', phonicsWords: ['cup'] },
  { text: 'Get the bag.', level: 1, phase: 'initial', phonicsWords: ['bag'] },
  { text: 'Get the pen.', level: 1, phase: 'initial', phonicsWords: ['pen'] },
  { text: 'Get the map.', level: 1, phase: 'initial', phonicsWords: ['map'] },
  { text: 'Get the pin.', level: 1, phase: 'initial', phonicsWords: ['pin'] },
  { text: 'Get the net.', level: 1, phase: 'initial', phonicsWords: ['net'] },
  { text: 'Get the rug.', level: 1, phase: 'initial', phonicsWords: ['rug'] },
  { text: 'Get the box.', level: 1, phase: 'initial', phonicsWords: ['box'] },
  { text: 'Get the bus.', level: 1, phase: 'initial', phonicsWords: ['bus'] },
  // Level 2: Two-part actions with phonics nouns
  { text: 'Put the cat on the mat.', level: 2, phase: 'initial', phonicsWords: ['cat', 'mat'] },
  { text: 'Put the hat on the bed.', level: 2, phase: 'initial', phonicsWords: ['hat', 'bed'] },
  { text: 'Put the cup on the rug.', level: 2, phase: 'initial', phonicsWords: ['cup', 'rug'] },
  { text: 'Put the pen in the bag.', level: 2, phase: 'initial', phonicsWords: ['pen', 'bag'] },
  { text: 'Put the pin on the map.', level: 2, phase: 'initial', phonicsWords: ['pin', 'map'] },
  { text: 'Put the nut in the cup.', level: 2, phase: 'initial', phonicsWords: ['nut', 'cup'] },
  { text: 'Put the bug on the rug.', level: 2, phase: 'initial', phonicsWords: ['bug', 'rug'] },
  { text: 'Put the box on the mat.', level: 2, phase: 'initial', phonicsWords: ['box', 'mat'] },
  // Phase 2 commands
  { text: 'Get the hat and the bag.', level: 2, phase: 'phase2', phonicsWords: ['hat', 'bag'] },
  { text: 'Put the mug on the rug.', level: 2, phase: 'phase2', phonicsWords: ['mug', 'rug'] },
  { text: 'Get the pot and the pan.', level: 2, phase: 'phase2', phonicsWords: ['pot', 'pan'] },
  { text: 'Put the dog in the box.', level: 2, phase: 'phase2', phonicsWords: ['dog', 'box'] },
  { text: 'Put the pig on the bed.', level: 2, phase: 'phase2', phonicsWords: ['pig', 'bed'] },
  { text: 'Get the bat and the cap.', level: 2, phase: 'phase2', phonicsWords: ['bat', 'cap'] },
  { text: 'Put the hen in the pen.', level: 2, phase: 'phase2', phonicsWords: ['hen', 'pen'] },
  { text: 'Put the fox in the box.', level: 2, phase: 'phase2', phonicsWords: ['fox', 'box'] },
  { text: 'Get the jam and the bun.', level: 2, phase: 'phase2', phonicsWords: ['jam', 'bun'] },
  { text: 'Put the jug on the mat.', level: 2, phase: 'phase2', phonicsWords: ['jug', 'mat'] },
  // Level 3: Multi-step with phonics nouns
  { text: 'Get the cat, put it on the mat, and get the hat.', level: 3, phase: 'phase2', phonicsWords: ['cat', 'mat', 'hat'] },
  { text: 'Get the cup, put it on the rug, and sit on the mat.', level: 3, phase: 'phase2', phonicsWords: ['cup', 'rug', 'mat'] },
  { text: 'Get the pig and the dog, and put them in the box.', level: 3, phase: 'phase2', phonicsWords: ['pig', 'dog', 'box'] },
  { text: 'Put the pen in the bag, and put the bag on the bed.', level: 3, phase: 'phase2', phonicsWords: ['pen', 'bag', 'bed'] },
  // Blue Series 1 commands
  { text: 'Get the ship.', level: 1, phase: 'blue1', phonicsWords: ['ship'] },
  { text: 'Get the shell.', level: 1, phase: 'blue1', phonicsWords: ['shell'] },
  { text: 'Get the fish.', level: 1, phase: 'blue1', phonicsWords: ['fish'] },
  { text: 'Get the dish.', level: 1, phase: 'blue1', phonicsWords: ['dish'] },
  { text: 'Get the whisk.', level: 1, phase: 'blue1', phonicsWords: ['whisk'] },
  { text: 'Put the fish on the dish.', level: 2, phase: 'blue1', phonicsWords: ['fish', 'dish'] },
  { text: 'Put the shell on the shelf.', level: 2, phase: 'blue1', phonicsWords: ['shell'] },
  { text: 'Put the chip in the dish.', level: 2, phase: 'blue1', phonicsWords: ['chip', 'dish'] },
  // Blue Series 2 commands
  { text: 'Get the boat.', level: 1, phase: 'blue2', phonicsWords: ['boat'] },
  { text: 'Get the goat.', level: 1, phase: 'blue2', phonicsWords: ['goat'] },
  { text: 'Get the snail.', level: 1, phase: 'blue2', phonicsWords: ['snail'] },
  { text: 'Get the spoon.', level: 1, phase: 'blue2', phonicsWords: ['spoon'] },
  { text: 'Put the goat in the boat.', level: 2, phase: 'blue2', phonicsWords: ['goat', 'boat'] },
  { text: 'Put the coat on the goat.', level: 2, phase: 'blue2', phonicsWords: ['coat', 'goat'] },
  { text: 'Put the snail on the nail.', level: 2, phase: 'blue2', phonicsWords: ['snail', 'nail'] },
  { text: 'Put the seed in the boot.', level: 2, phase: 'blue2', phonicsWords: ['seed', 'boot'] },
  { text: 'Put the book on the hook.', level: 2, phase: 'blue2', phonicsWords: ['book', 'hook'] },
];

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/** Get all words from a specific phase as flat array */
export function getPhaseWords(phaseId: string): PhonicsWord[] {
  const phase = ALL_PHASES.find(p => p.id === phaseId);
  return phase ? phase.groups.flatMap(g => g.words) : [];
}

/** Get all words across all phases */
export function getAllWords(): PhonicsWord[] {
  return ALL_PHASES.flatMap(p => p.groups.flatMap(g => g.words));
}

/** Get all noun-only words (picturable) from a phase */
export function getPhaseNouns(phaseId: string): PhonicsWord[] {
  return getPhaseWords(phaseId).filter(w => w.isNoun);
}

/** Get words for a specific group */
export function getGroupWords(phaseId: string, groupId: string): PhonicsWord[] {
  const phase = ALL_PHASES.find(p => p.id === phaseId);
  const group = phase?.groups.find(g => g.id === groupId);
  return group?.words || [];
}

/** Get command sentences for a phase and level */
export function getCommands(phaseId: string, level?: 1 | 2 | 3): CommandSentence[] {
  return PHONICS_COMMANDS.filter(c =>
    c.phase === phaseId && (level === undefined || c.level === level)
  );
}

/** Get sentence templates for a phase */
export function getSentenceTemplates(phaseId: string): SentenceTemplate[] {
  return SENTENCE_TEMPLATES.filter(t => t.phase === phaseId);
}

/** Get stories for a phase */
export function getPhaseStories(phaseId: string): ShortStory[] {
  return SHORT_STORIES.filter(s => s.phase === phaseId);
}

/** Get all unique words used across all phases (for dictionary) */
export function getDictionaryWords(): { word: string; image: string; phase: string }[] {
  const seen = new Set<string>();
  const result: { word: string; image: string; phase: string }[] = [];
  for (const phase of ALL_PHASES) {
    for (const group of phase.groups) {
      for (const w of group.words) {
        if (!seen.has(w.word)) {
          seen.add(w.word);
          result.push({ word: w.word, image: w.image, phase: phase.id });
        }
      }
    }
  }
  return result.sort((a, b) => a.word.localeCompare(b.word));
}

/** Counts */
export function getWordCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const phase of ALL_PHASES) {
    counts[phase.id] = phase.groups.flatMap(g => g.words).length;
  }
  counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
  return counts;
}
