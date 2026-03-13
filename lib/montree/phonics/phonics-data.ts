// lib/montree/phonics/phonics-data.ts
// =====================================================================
// MASTER PHONICS DATA — Single source of truth for ALL phonics tools
// AMI Montessori-aligned progression:
//   Pink Series (CVC) → Blue Series (blends + doubles) → Green Series (phonograms)
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
  'ride', 'like', 'nice', 'far', 'dark',
];

// =====================================================================
// PHASE: PINK 1 (CMAT Tray System)
// Progressive letter introduction: c,m,a,t → d,n,e,k → s,r,i,p → h,u,j,l → b,f,o,g → v,w,x,y,z,q
// ALL CVC (3-letter consonant-vowel-consonant) only
// =====================================================================

export const PINK_1: PhonicsPhase = {
  id: 'pink1',
  name: 'Pink 1 — CMAT Trays',
  color: '#ec4899',
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
        { word: 'rip', image: '📃', miniature: 'torn paper sample', isNoun: false },
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
        { word: 'jug', image: '🫗', miniature: 'small ceramic jug', isNoun: true },
      ],
    },
    {
      id: 'tray-5',
      label: 'Tray 1+2+3+4+5 — add b f o g',
      description: 'Add: /b/ /f/ /o/ /g/',
      words: [
        { word: 'bog', image: '🌿', miniature: 'picture card of bog/marsh', isNoun: true },
        { word: 'fig', image: '🫐', miniature: 'plastic fig or picture', isNoun: true },
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
// PHASE: PINK 2 (Expanded CVC Words)
// All common CVC words organized by vowel sound
// =====================================================================

export const PINK_2: PhonicsPhase = {
  id: 'pink2',
  name: 'Pink 2 — CVC Words',
  color: '#f472b6',
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
        { word: 'rag', image: '🧻', miniature: 'small cloth rag', isNoun: true },
        { word: 'cab', image: '🚕', miniature: 'toy taxi cab', isNoun: true },
        { word: 'dad', image: '👨', miniature: 'man figurine', isNoun: true },
        { word: 'ham', image: '🍖', miniature: 'toy ham or picture', isNoun: true },
        { word: 'jam', image: '🍯', miniature: 'mini jam jar', isNoun: true },
        { word: 'ram', image: '🐏', miniature: 'plastic ram figurine', isNoun: true },
        { word: 'cap', image: '🧢', miniature: 'doll cap', isNoun: true },
        { word: 'gap', image: '⬜', miniature: 'picture card', isNoun: true },
        { word: 'lap', image: '🧎', miniature: 'picture card', isNoun: true },
        { word: 'nap', image: '😴', miniature: 'sleeping figure', isNoun: true },
        { word: 'tap', image: '🚰', miniature: 'miniature faucet', isNoun: true },
        { word: 'tax', image: '💵', miniature: 'picture card', isNoun: true },
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
        { word: 'jig', image: '💃', miniature: 'dancing figure', isNoun: true },
        { word: 'bin', image: '🗑️', miniature: 'tiny trash can', isNoun: true },
        { word: 'fin', image: '🦈', miniature: 'plastic shark fin', isNoun: true },
        { word: 'tin', image: '🪙', miniature: 'small tin container', isNoun: true },
        { word: 'win', image: '🎊', miniature: 'mini trophy', isNoun: false },
        { word: 'kid', image: '👦', miniature: 'child figurine', isNoun: true },
        { word: 'lid', image: '🔳', miniature: 'small jar lid', isNoun: true },
        { word: 'hid', image: '🙈', miniature: 'hiding figure picture', isNoun: false },
        { word: 'bit', image: '🍪', miniature: 'bite-sized piece picture', isNoun: true },
        { word: 'fit', image: '🤸', miniature: 'picture card', isNoun: false },
        { word: 'hit', image: '🥊', miniature: 'mini boxing glove', isNoun: false },
        { word: 'kit', image: '🧰', miniature: 'small toolkit', isNoun: true },
        { word: 'dip', image: '🫕', miniature: 'dipping picture card', isNoun: true },
        { word: 'hip', image: '🧍', miniature: 'body picture card', isNoun: true },
        { word: 'tip', image: '👆', miniature: 'pointing finger picture', isNoun: true },
        { word: 'six', image: '6️⃣', miniature: 'number 6 card', isNoun: true },
        { word: 'mix', image: '🔀', miniature: 'small mixing spoon', isNoun: false },
      ],
    },    {
      id: 'short-o',
      label: 'Short O',
      description: 'Words with short /o/ sound (as in "dog")',
      words: [
        { word: 'dog', image: '🐕', miniature: 'plastic dog figurine', isNoun: true },
        { word: 'log', image: '🪵', miniature: 'small wooden dowel', isNoun: true },
        { word: 'hog', image: '🐖', miniature: 'plastic hog figurine', isNoun: true },
        { word: 'jog', image: '👟', miniature: 'jogging figure', isNoun: false },
        { word: 'cog', image: '⚙️', miniature: 'small gear/cog', isNoun: true },
        { word: 'fox', image: '🦊', miniature: 'plastic fox figurine', isNoun: true },
        { word: 'box', image: '📦', miniature: 'tiny cardboard box', isNoun: true },
        { word: 'pot', image: '🍲', miniature: 'dollhouse pot', isNoun: true },
        { word: 'hot', image: '🔥', miniature: 'flame picture card', isNoun: false },
        { word: 'dot', image: '🟡', miniature: 'dot sticker', isNoun: true },
        { word: 'cot', image: '🛋️', miniature: 'dollhouse cot/bed', isNoun: true },
        { word: 'mop', image: '🪩', miniature: 'mini mop', isNoun: true },
        { word: 'hop', image: '🐇', miniature: 'hopping rabbit picture', isNoun: false },
        { word: 'pop', image: '🎈', miniature: 'popping balloon picture', isNoun: false },
        { word: 'nod', image: '🙂', miniature: 'nodding picture card', isNoun: false },
        { word: 'rod', image: '🎣', miniature: 'small rod or stick', isNoun: true },
        { word: 'pod', image: '🫛', miniature: 'pea pod or picture', isNoun: true },
        { word: 'cod', image: '🎏', miniature: 'fish figurine', isNoun: true },
        { word: 'rob', image: '🦹', miniature: 'picture card', isNoun: false },
        { word: 'job', image: '👷', miniature: 'worker figurine', isNoun: true },
        { word: 'mob', image: '🫂', miniature: 'group picture card', isNoun: true },
      ],
    },
    {
      id: 'short-u',
      label: 'Short U',
      description: 'Words with short /u/ sound (as in "hut")',
      words: [
        { word: 'cup', image: '🥤', miniature: 'dollhouse cup or shot glass', isNoun: true },
        { word: 'bug', image: '🐛', miniature: 'plastic bug figurine', isNoun: true },
        { word: 'rug', image: '🟧', miniature: 'small felt square', isNoun: true },
        { word: 'sun', image: '☀️', miniature: 'sun charm or cutout', isNoun: true },
        { word: 'bus', image: '🚌', miniature: 'toy bus', isNoun: true },
        { word: 'nut', image: '🥜', miniature: 'real walnut or acorn', isNoun: true },
        { word: 'mug', image: '☕', miniature: 'miniature mug', isNoun: true },
        { word: 'pug', image: '🐶', miniature: 'pug dog figurine', isNoun: true },
        { word: 'tug', image: '🛥️', miniature: 'small tugboat', isNoun: true },
        { word: 'dug', image: '🪏', miniature: 'shovel picture card', isNoun: false },
        { word: 'hug', image: '🤗', miniature: 'hugging figures', isNoun: false },
        { word: 'bun', image: '🍞', miniature: 'toy bun or picture', isNoun: true },
        { word: 'fun', image: '🎉', miniature: 'party picture card', isNoun: true },
        { word: 'gun', image: '🔫', miniature: 'toy water gun', isNoun: true },
        { word: 'nun', image: '👩‍🦲', miniature: 'nun figurine', isNoun: true },
        { word: 'bud', image: '🌼', miniature: 'flower bud picture', isNoun: true },
        { word: 'mud', image: '🟤', miniature: 'mud picture card', isNoun: true },
        { word: 'cub', image: '🐻', miniature: 'bear cub figurine', isNoun: true },
        { word: 'tub', image: '🛁', miniature: 'dollhouse bathtub', isNoun: true },
        { word: 'sub', image: '🚇', miniature: 'toy submarine', isNoun: true },
        { word: 'gum', image: '💭', miniature: 'bubble gum picture', isNoun: true },
        { word: 'hum', image: '🎶', miniature: 'music note card', isNoun: false },
      ],
    },
  ],
};

// ============================================================
// BLUE SERIES — 4+ letter words, phonetically regular
// Each letter still makes its own sound. SHORT vowels only.
// NO digraphs, NO phonograms, NO silent-e.
// ============================================================

export const BLUE_1: PhonicsPhase = {
  id: 'blue1',
  name: 'Blue 1 — Initial Consonant Blends',
  description: 'CCVC and CCCVC words with initial consonant blends. Each consonant in the blend makes its own sound.',
  color: '#3B82F6',
  groups: [
    {
      label: 'bl- blends',
      description: 'Words starting with bl-',
      words: [
        { word: 'blob', image: '🫧', miniature: 'blob of clay', isNoun: true },
        { word: 'blot', image: '🖊️', miniature: 'ink blot card', isNoun: true },
        { word: 'blab', image: '🗣️', miniature: 'talking mouth card', isNoun: false },
      ],
    },
    {
      label: 'br- blends',
      description: 'Words starting with br-',
      words: [
        { word: 'brim', image: '🎩', miniature: 'hat with brim', isNoun: true },
        { word: 'brat', image: '😤', miniature: 'child figurine', isNoun: true },
        { word: 'bred', image: '🐕', miniature: 'dog pair figurines', isNoun: false },
        { word: 'brig', image: '⛵', miniature: 'small ship model', isNoun: true },
      ],
    },    {
      label: 'cl- blends',
      description: 'Words starting with cl-',
      words: [
        { word: 'clap', image: '👏', miniature: 'clapping hands card', isNoun: false },
        { word: 'clam', image: '🐚', miniature: 'clam shell', isNoun: true },
        { word: 'clan', image: '👨‍👩‍👧‍👦', miniature: 'family figurines', isNoun: true },
        { word: 'clip', image: '📎', miniature: 'paper clip', isNoun: true },
        { word: 'clod', image: '🪨', miniature: 'dirt clod', isNoun: true },
        { word: 'clog', image: '👞', miniature: 'wooden clog shoe', isNoun: true },
        { word: 'clot', image: '🩸', miniature: 'bandage', isNoun: true },
        { word: 'club', image: '♣️', miniature: 'club card', isNoun: true },
        { word: 'clad', image: '🧥', miniature: 'coat picture card', isNoun: false },
      ],
    },
    {
      label: 'cr- blends',
      description: 'Words starting with cr-',
      words: [
        { word: 'crab', image: '🦀', miniature: 'plastic crab', isNoun: true },
        { word: 'cram', image: '📦', miniature: 'stuffed box picture', isNoun: false },
        { word: 'crib', image: '🛏️', miniature: 'dollhouse crib', isNoun: true },
        { word: 'crop', image: '🌾', miniature: 'wheat bundle', isNoun: true },
        { word: 'crud', image: '🟤', miniature: 'dirt picture card', isNoun: true },
      ],
    },
    {
      label: 'dr- blends',
      description: 'Words starting with dr-',
      words: [
        { word: 'drag', image: '🧳', miniature: 'small suitcase', isNoun: false },
        { word: 'drip', image: '💧', miniature: 'water dropper', isNoun: true },
        { word: 'drop', image: '💦', miniature: 'droplet figurine', isNoun: true },
        { word: 'drum', image: '🥁', miniature: 'miniature drum', isNoun: true },
        { word: 'drab', image: '🟫', miniature: 'brown fabric swatch', isNoun: false },
      ],
    },    {
      label: 'fl- blends',
      description: 'Words starting with fl-',
      words: [
        { word: 'flag', image: '🚩', miniature: 'small flag', isNoun: true },
        { word: 'flat', image: '🫓', miniature: 'flat object card', isNoun: false },
        { word: 'flip', image: '🔄', miniature: 'flip card', isNoun: false },
        { word: 'flab', image: '🫠', miniature: 'squishy ball', isNoun: true },
        { word: 'flan', image: '🍮', miniature: 'flan dessert toy', isNoun: true },
        { word: 'fled', image: '🏃', miniature: 'running figure', isNoun: false },
        { word: 'flit', image: '🦋', miniature: 'butterfly figurine', isNoun: false },
        { word: 'flog', image: '🪵', miniature: 'log picture card', isNoun: false },
        { word: 'flop', image: '🐟', miniature: 'flopping fish', isNoun: false },
        { word: 'flux', image: '🔀', miniature: 'arrows card', isNoun: true },
      ],
    },
    {
      label: 'fr- blends',
      description: 'Words starting with fr-',
      words: [
        { word: 'frog', image: '🐸', miniature: 'plastic frog', isNoun: true },
        { word: 'from', image: '📨', miniature: 'envelope', isNoun: false },
        { word: 'fret', image: '😟', miniature: 'worried face card', isNoun: false },
      ],
    },
    {
      label: 'gl- blends',
      description: 'Words starting with gl-',
      words: [
        { word: 'glad', image: '😊', miniature: 'happy face card', isNoun: false },
        { word: 'glen', image: '🏞️', miniature: 'valley picture card', isNoun: true },
        { word: 'glib', image: '🗣️', miniature: 'talking mouth card', isNoun: false },
        { word: 'glob', image: '🫧', miniature: 'glob of paste', isNoun: true },
        { word: 'glum', image: '😞', miniature: 'sad face card', isNoun: false },
        { word: 'glut', image: '🍽️', miniature: 'overflowing plate card', isNoun: true },
      ],
    },    {
      label: 'gr- blends',
      description: 'Words starting with gr-',
      words: [
        { word: 'grab', image: '✊', miniature: 'grabbing hand card', isNoun: false },
        { word: 'gram', image: '⚖️', miniature: 'small weight', isNoun: true },
        { word: 'grid', image: '📊', miniature: 'grid paper', isNoun: true },
        { word: 'grim', image: '😐', miniature: 'stern face card', isNoun: false },
        { word: 'grin', image: '😁', miniature: 'grinning face card', isNoun: true },
        { word: 'grip', image: '🤝', miniature: 'grip handle', isNoun: true },
        { word: 'grit', image: '🪨', miniature: 'sandpaper piece', isNoun: true },
        { word: 'grub', image: '🐛', miniature: 'grub worm figurine', isNoun: true },
        { word: 'grog', image: '🍺', miniature: 'mug picture card', isNoun: true },
      ],
    },
    {
      label: 'pl- blends',
      description: 'Words starting with pl-',
      words: [
        { word: 'plan', image: '📋', miniature: 'clipboard', isNoun: true },
        { word: 'plod', image: '🚶', miniature: 'walking figure', isNoun: false },
        { word: 'plot', image: '🗺️', miniature: 'map card', isNoun: true },
        { word: 'plop', image: '💦', miniature: 'splash card', isNoun: false },
        { word: 'plug', image: '🔌', miniature: 'small plug', isNoun: true },
        { word: 'plum', image: '🟣', miniature: 'plastic plum', isNoun: true },
        { word: 'plus', image: '➕', miniature: 'plus sign card', isNoun: false },
      ],
    },
    {
      label: 'pr- blends',
      description: 'Words starting with pr-',
      words: [
        { word: 'pram', image: '👶', miniature: 'toy pram', isNoun: true },
        { word: 'prep', image: '📝', miniature: 'preparation card', isNoun: false },
        { word: 'prim', image: '💅', miniature: 'proper person card', isNoun: false },
        { word: 'prod', image: '👉', miniature: 'poking finger card', isNoun: false },
        { word: 'prop', image: '🎭', miniature: 'theater prop', isNoun: true },
      ],
    },    {
      label: 'sc/sk- blends',
      description: 'Words starting with sc- or sk-',
      words: [
        { word: 'scab', image: '🩹', miniature: 'bandage', isNoun: true },
        { word: 'scam', image: '🎭', miniature: 'mask card', isNoun: true },
        { word: 'scan', image: '👀', miniature: 'magnifying glass', isNoun: false },
        { word: 'scat', image: '🐱', miniature: 'running cat card', isNoun: false },
        { word: 'skid', image: '🛷', miniature: 'skid mark card', isNoun: true },
        { word: 'skim', image: '🥛', miniature: 'milk picture', isNoun: false },
        { word: 'skin', image: '✋', miniature: 'hand picture card', isNoun: true },
        { word: 'skip', image: '🤸', miniature: 'skipping figure', isNoun: false },
        { word: 'skit', image: '🎬', miniature: 'stage card', isNoun: true },
        { word: 'slab', image: '🧱', miniature: 'stone slab', isNoun: true },
      ],
    },
    {
      label: 'sl- blends',
      description: 'Words starting with sl-',
      words: [
        { word: 'slam', image: '🚪', miniature: 'door card', isNoun: false },
        { word: 'slap', image: '✋', miniature: 'hand card', isNoun: false },
        { word: 'sled', image: '🛷', miniature: 'toy sled', isNoun: true },
        { word: 'slim', image: '🧍', miniature: 'thin person card', isNoun: false },
        { word: 'slip', image: '🍌', miniature: 'banana peel card', isNoun: false },
        { word: 'slit', image: '✂️', miniature: 'scissors', isNoun: true },
        { word: 'slob', image: '🙁', miniature: 'messy person card', isNoun: true },
        { word: 'slop', image: '🥣', miniature: 'spilling bowl card', isNoun: true },
        { word: 'slot', image: '🎰', miniature: 'coin slot card', isNoun: true },
        { word: 'slug', image: '🐌', miniature: 'slug figurine', isNoun: true },
        { word: 'slum', image: '🏚️', miniature: 'old house card', isNoun: true },
      ],
    },    {
      label: 'sm/sn- blends',
      description: 'Words starting with sm- or sn-',
      words: [
        { word: 'smog', image: '🌫️', miniature: 'fog picture card', isNoun: true },
        { word: 'smug', image: '😏', miniature: 'smirking face card', isNoun: false },
        { word: 'snag', image: '🪝', miniature: 'hook', isNoun: true },
        { word: 'snap', image: '🫰', miniature: 'snapping fingers card', isNoun: false },
        { word: 'snip', image: '✂️', miniature: 'small scissors', isNoun: false },
        { word: 'snob', image: '🧐', miniature: 'monocle card', isNoun: true },
        { word: 'snub', image: '😤', miniature: 'turning away card', isNoun: false },
        { word: 'snug', image: '🧣', miniature: 'scarf', isNoun: false },
      ],
    },
    {
      label: 'sp- blends',
      description: 'Words starting with sp-',
      words: [
        { word: 'span', image: '📏', miniature: 'ruler', isNoun: true },
        { word: 'spit', image: '💦', miniature: 'water drop card', isNoun: false },
        { word: 'spin', image: '🌀', miniature: 'spinning top', isNoun: false },
        { word: 'spot', image: '⭕', miniature: 'dot sticker', isNoun: true },
        { word: 'spud', image: '🥔', miniature: 'plastic potato', isNoun: true },
        { word: 'spun', image: '🧶', miniature: 'yarn ball', isNoun: false },
      ],
    },
    {
      label: 'st- blends',
      description: 'Words starting with st-',
      words: [
        { word: 'stop', image: '🛑', miniature: 'stop sign', isNoun: false },
        { word: 'stem', image: '🌱', miniature: 'plant stem', isNoun: true },
        { word: 'step', image: '👣', miniature: 'footprint card', isNoun: true },
        { word: 'stab', image: '🗡️', miniature: 'sword card', isNoun: false },
        { word: 'stag', image: '🦌', miniature: 'deer figurine', isNoun: true },
        { word: 'stud', image: '📌', miniature: 'metal stud', isNoun: true },
        { word: 'stub', image: '🎫', miniature: 'ticket stub', isNoun: true },
        { word: 'stun', image: '⚡', miniature: 'lightning card', isNoun: false },
      ],
    },    {
      label: 'sw- blends',
      description: 'Words starting with sw-',
      words: [
        { word: 'swim', image: '🏊', miniature: 'swimmer figurine', isNoun: false },
        { word: 'swan', image: '🦢', miniature: 'swan figurine', isNoun: true },
        { word: 'swam', image: '🏊', miniature: 'swimming card', isNoun: false },
        { word: 'swig', image: '🥤', miniature: 'drinking cup', isNoun: true },
        { word: 'swab', image: '🧹', miniature: 'cotton swab', isNoun: true },
        { word: 'swop', image: '🔄', miniature: 'exchange arrows card', isNoun: false },
      ],
    },
    {
      label: 'tr- blends',
      description: 'Words starting with tr-',
      words: [
        { word: 'trap', image: '🪤', miniature: 'mouse trap', isNoun: true },
        { word: 'tram', image: '🚋', miniature: 'toy tram', isNoun: true },
        { word: 'trot', image: '🐴', miniature: 'horse figurine', isNoun: false },
        { word: 'trim', image: '✂️', miniature: 'scissors', isNoun: false },
        { word: 'trip', image: '🧳', miniature: 'suitcase', isNoun: true },
        { word: 'trod', image: '👞', miniature: 'boot print card', isNoun: false },
        { word: 'trig', image: '📐', miniature: 'triangle ruler', isNoun: true },
      ],
    },
  ],
};

export const BLUE_2: PhonicsPhase = {
  id: 'blue2',
  name: 'Blue 2 — Final Consonant Blends',
  description: 'CVCC words ending in consonant blends. Each consonant still makes its own sound. Short vowels only.',
  color: '#2563EB',
  groups: [
    {
      label: '-nd endings',
      description: 'Words ending in -nd',
      words: [
        { word: 'band', image: '🎵', miniature: 'rubber band', isNoun: true },
        { word: 'bend', image: '↩️', miniature: 'bent wire', isNoun: false },
        { word: 'bond', image: '🤝', miniature: 'handshake card', isNoun: true },
        { word: 'fond', image: '❤️', miniature: 'heart card', isNoun: false },
        { word: 'hand', image: '✋', miniature: 'hand model', isNoun: true },
        { word: 'land', image: '🏞️', miniature: 'land picture card', isNoun: true },
        { word: 'lend', image: '🤲', miniature: 'giving hands card', isNoun: false },
        { word: 'mend', image: '🧵', miniature: 'needle and thread', isNoun: false },
        { word: 'pond', image: '🦆', miniature: 'toy duck in water', isNoun: true },
        { word: 'sand', image: '🏖️', miniature: 'sand in jar', isNoun: true },
        { word: 'send', image: '📮', miniature: 'mailbox', isNoun: false },
        { word: 'wand', image: '🪄', miniature: 'magic wand', isNoun: true },
        { word: 'wind', image: '💨', miniature: 'pinwheel', isNoun: true },
      ],
    },
    {
      label: '-nk endings',
      description: 'Words ending in -nk',
      words: [
        { word: 'bank', image: '🏦', miniature: 'piggy bank', isNoun: true },
        { word: 'bunk', image: '🛏️', miniature: 'bunk bed card', isNoun: true },
        { word: 'dunk', image: '🏀', miniature: 'basketball', isNoun: false },
        { word: 'honk', image: '📯', miniature: 'horn', isNoun: false },
        { word: 'hunk', image: '🧱', miniature: 'chunk of wood', isNoun: true },
        { word: 'junk', image: '🗑️', miniature: 'junk pile card', isNoun: true },
        { word: 'link', image: '🔗', miniature: 'chain link', isNoun: true },
        { word: 'mink', image: '🦫', miniature: 'mink figurine', isNoun: true },
        { word: 'pink', image: '💗', miniature: 'pink card', isNoun: false },
        { word: 'rank', image: '🏅', miniature: 'medal', isNoun: true },
        { word: 'rink', image: '⛸️', miniature: 'ice rink card', isNoun: true },
        { word: 'sank', image: '🚢', miniature: 'sinking ship card', isNoun: false },
        { word: 'sink', image: '🚰', miniature: 'dollhouse sink', isNoun: true },
        { word: 'tank', image: '🐠', miniature: 'fish tank card', isNoun: true },
        { word: 'wink', image: '😉', miniature: 'winking face card', isNoun: false },
      ],
    },    {
      label: '-nt endings',
      description: 'Words ending in -nt',
      words: [
        { word: 'bent', image: '↩️', miniature: 'bent nail', isNoun: false },
        { word: 'dent', image: '🔨', miniature: 'dented can', isNoun: true },
        { word: 'hint', image: '💡', miniature: 'lightbulb', isNoun: true },
        { word: 'hunt', image: '🔍', miniature: 'magnifying glass', isNoun: false },
        { word: 'lint', image: '🧹', miniature: 'lint roller', isNoun: true },
        { word: 'mint', image: '🌿', miniature: 'mint leaf', isNoun: true },
        { word: 'pant', image: '🐕', miniature: 'panting dog card', isNoun: false },
        { word: 'punt', image: '🏈', miniature: 'football', isNoun: false },
        { word: 'rent', image: '🏠', miniature: 'house card', isNoun: true },
        { word: 'vent', image: '🌬️', miniature: 'air vent card', isNoun: true },
        { word: 'went', image: '🚶', miniature: 'walking figure', isNoun: false },
      ],
    },
    {
      label: '-mp endings',
      description: 'Words ending in -mp',
      words: [
        { word: 'bump', image: '🤕', miniature: 'bump picture card', isNoun: true },
        { word: 'camp', image: '⛺', miniature: 'tent figurine', isNoun: true },
        { word: 'damp', image: '💧', miniature: 'wet sponge', isNoun: false },
        { word: 'dump', image: '🚚', miniature: 'dump truck', isNoun: true },
        { word: 'hump', image: '🐪', miniature: 'camel figurine', isNoun: true },
        { word: 'jump', image: '🦘', miniature: 'jumping figure', isNoun: false },
        { word: 'lamp', image: '💡', miniature: 'dollhouse lamp', isNoun: true },
        { word: 'limp', image: '🦿', miniature: 'limping figure card', isNoun: false },
        { word: 'lump', image: '🪨', miniature: 'lump of clay', isNoun: true },
        { word: 'pump', image: '⛽', miniature: 'toy pump', isNoun: true },
        { word: 'ramp', image: '📐', miniature: 'small ramp', isNoun: true },
        { word: 'romp', image: '🤸', miniature: 'tumbling figure', isNoun: false },
      ],
    },    {
      label: '-ft/-ct/-pt endings',
      description: 'Words ending in -ft, -ct, or -pt',
      words: [
        { word: 'raft', image: '🛶', miniature: 'toy raft', isNoun: true },
        { word: 'left', image: '⬅️', miniature: 'left arrow card', isNoun: false },
        { word: 'lift', image: '⬆️', miniature: 'up arrow card', isNoun: false },
        { word: 'loft', image: '🏠', miniature: 'attic picture card', isNoun: true },
        { word: 'soft', image: '🧸', miniature: 'soft teddy bear', isNoun: false },
        { word: 'tuft', image: '🌿', miniature: 'tuft of grass', isNoun: true },
        { word: 'fact', image: '📖', miniature: 'book card', isNoun: true },
        { word: 'pact', image: '🤝', miniature: 'handshake card', isNoun: true },
        { word: 'kept', image: '📦', miniature: 'box card', isNoun: false },
        { word: 'wept', image: '😢', miniature: 'crying face card', isNoun: false },
      ],
    },
    {
      label: '-st/-sk endings',
      description: 'Words ending in -st or -sk',
      words: [
        { word: 'best', image: '🏆', miniature: 'trophy', isNoun: false },
        { word: 'bust', image: '🗿', miniature: 'bust statue', isNoun: true },
        { word: 'cost', image: '💰', miniature: 'coin', isNoun: true },
        { word: 'dust', image: '🌫️', miniature: 'dust cloth', isNoun: true },
        { word: 'fast', image: '💨', miniature: 'speed card', isNoun: false },
        { word: 'fist', image: '✊', miniature: 'fist card', isNoun: true },
        { word: 'gust', image: '🌬️', miniature: 'wind card', isNoun: true },
        { word: 'just', image: '⚖️', miniature: 'balance scale', isNoun: false },
        { word: 'last', image: '🏁', miniature: 'finish flag', isNoun: false },
        { word: 'list', image: '📝', miniature: 'list paper', isNoun: true },
        { word: 'lost', image: '❓', miniature: 'question mark card', isNoun: false },
        { word: 'mast', image: '⛵', miniature: 'boat mast card', isNoun: true },
        { word: 'must', image: '❗', miniature: 'exclamation card', isNoun: false },
        { word: 'nest', image: '🪺', miniature: 'bird nest', isNoun: true },
        { word: 'past', image: '⏪', miniature: 'rewind card', isNoun: false },
        { word: 'pest', image: '🐛', miniature: 'bug figurine', isNoun: true },
        { word: 'rest', image: '😴', miniature: 'sleeping figure', isNoun: false },
        { word: 'rust', image: '🟤', miniature: 'rusty nail', isNoun: true },
        { word: 'test', image: '📋', miniature: 'test paper', isNoun: true },
        { word: 'vest', image: '🦺', miniature: 'vest', isNoun: true },
        { word: 'west', image: '🌅', miniature: 'sunset card', isNoun: true },
        { word: 'disk', image: '💾', miniature: 'floppy disk', isNoun: true },
        { word: 'dusk', image: '🌆', miniature: 'dusk picture card', isNoun: true },
        { word: 'husk', image: '🌽', miniature: 'corn husk', isNoun: true },
        { word: 'mask', image: '🎭', miniature: 'small mask', isNoun: true },
        { word: 'musk', image: '🦌', miniature: 'musk deer card', isNoun: true },
        { word: 'risk', image: '⚠️', miniature: 'warning sign card', isNoun: true },
        { word: 'task', image: '📋', miniature: 'task list card', isNoun: true },
        { word: 'tusk', image: '🐘', miniature: 'elephant figurine', isNoun: true },
      ],
    },    {
      label: '-ld/-lf/-lt endings',
      description: 'Words ending in -ld, -lf, or -lt',
      words: [
        { word: 'held', image: '🤲', miniature: 'cupped hands card', isNoun: false },
        { word: 'meld', image: '🔀', miniature: 'merging arrows card', isNoun: false },
        { word: 'weld', image: '🔥', miniature: 'welding spark card', isNoun: false },
        { word: 'golf', image: '⛳', miniature: 'golf ball', isNoun: true },
        { word: 'self', image: '🪞', miniature: 'small mirror', isNoun: true },
        { word: 'belt', image: '👖', miniature: 'small belt', isNoun: true },
        { word: 'bolt', image: '🔩', miniature: 'bolt and nut', isNoun: true },
        { word: 'felt', image: '🧶', miniature: 'felt fabric square', isNoun: true },
        { word: 'jolt', image: '⚡', miniature: 'lightning bolt card', isNoun: true },
        { word: 'malt', image: '🍺', miniature: 'malt grain', isNoun: true },
        { word: 'melt', image: '🫠', miniature: 'melting ice card', isNoun: false },
        { word: 'jilt', image: '💔', miniature: 'broken heart card', isNoun: false },
        { word: 'tilt', image: '↗️', miniature: 'tilted card', isNoun: false },
        { word: 'wilt', image: '🥀', miniature: 'wilting flower', isNoun: false },
      ],
    },
    {
      label: '-ng endings',
      description: 'Words ending in -ng',
      words: [
        { word: 'bang', image: '💥', miniature: 'explosion card', isNoun: true },
        { word: 'bung', image: '🪵', miniature: 'cork bung', isNoun: true },
        { word: 'fang', image: '🦷', miniature: 'fang picture card', isNoun: true },
        { word: 'gang', image: '👥', miniature: 'group figurines', isNoun: true },
        { word: 'gong', image: '🔔', miniature: 'small gong', isNoun: true },
        { word: 'hang', image: '🪝', miniature: 'hook', isNoun: false },
        { word: 'hung', image: '🖼️', miniature: 'hanging picture', isNoun: false },
        { word: 'king', image: '👑', miniature: 'crown', isNoun: true },
        { word: 'long', image: '📏', miniature: 'long ruler', isNoun: false },
        { word: 'lung', image: '🫁', miniature: 'lung picture card', isNoun: true },
        { word: 'ping', image: '🏓', miniature: 'ping pong ball', isNoun: true },
        { word: 'rang', image: '🔔', miniature: 'bell', isNoun: false },
        { word: 'ring', image: '💍', miniature: 'small ring', isNoun: true },
        { word: 'sang', image: '🎤', miniature: 'microphone', isNoun: false },
        { word: 'sing', image: '🎵', miniature: 'music note card', isNoun: false },
        { word: 'song', image: '🎶', miniature: 'song book card', isNoun: true },
        { word: 'wing', image: '🪽', miniature: 'feather', isNoun: true },
      ],
    },
  ],
};

export const BLUE_3: PhonicsPhase = {
  id: 'blue3',
  name: 'Blue 3 — Double Consonants & CK',
  description: 'Words with double consonant endings (ll, ss, ff, zz) and -ck. The doubled letters make one sound but follow the FLOSS/CK spelling rule.',
  color: '#1D4ED8',
  groups: [
    {
      label: '-ll endings',
      description: 'Words ending in double l',
      words: [
        { word: 'bell', image: '🔔', miniature: 'small bell', isNoun: true },
        { word: 'bill', image: '💵', miniature: 'dollar bill', isNoun: true },
        { word: 'bull', image: '🐂', miniature: 'bull figurine', isNoun: true },
        { word: 'doll', image: '🧸', miniature: 'small doll', isNoun: true },
        { word: 'dull', image: '🔘', miniature: 'grey circle card', isNoun: false },
        { word: 'fall', image: '🍂', miniature: 'falling leaf', isNoun: false },
        { word: 'fell', image: '🪓', miniature: 'axe card', isNoun: false },
        { word: 'fill', image: '🥛', miniature: 'full glass', isNoun: false },
        { word: 'full', image: '🫙', miniature: 'full jar', isNoun: false },
        { word: 'gull', image: '🐦', miniature: 'seagull figurine', isNoun: true },
        { word: 'hall', image: '🏛️', miniature: 'hallway card', isNoun: true },
        { word: 'hill', image: '⛰️', miniature: 'hill picture card', isNoun: true },
        { word: 'hull', image: '🚢', miniature: 'boat hull card', isNoun: true },
        { word: 'kill', image: '❌', miniature: 'X mark card', isNoun: false },
        { word: 'mall', image: '🏬', miniature: 'mall picture card', isNoun: true },
        { word: 'mill', image: '🏭', miniature: 'windmill figurine', isNoun: true },
        { word: 'mull', image: '🤔', miniature: 'thinking face card', isNoun: false },
        { word: 'null', image: '⭕', miniature: 'zero card', isNoun: false },
        { word: 'pull', image: '🪢', miniature: 'rope', isNoun: false },
        { word: 'sell', image: '🏷️', miniature: 'price tag', isNoun: false },
        { word: 'tall', image: '📏', miniature: 'tall block', isNoun: false },
        { word: 'tell', image: '🗣️', miniature: 'speaking mouth card', isNoun: false },
        { word: 'till', image: '🕐', miniature: 'clock card', isNoun: false },
        { word: 'wall', image: '🧱', miniature: 'brick', isNoun: true },
        { word: 'well', image: '🪣', miniature: 'well bucket', isNoun: true },
        { word: 'will', image: '📜', miniature: 'scroll card', isNoun: true },
        { word: 'yell', image: '📢', miniature: 'megaphone', isNoun: false },
      ],
    },    {
      label: '-ss endings',
      description: 'Words ending in double s',
      words: [
        { word: 'bass', image: '🐟', miniature: 'fish figurine', isNoun: true },
        { word: 'boss', image: '👔', miniature: 'tie card', isNoun: true },
        { word: 'fuss', image: '😤', miniature: 'fussy face card', isNoun: true },
        { word: 'hiss', image: '🐍', miniature: 'snake figurine', isNoun: false },
        { word: 'kiss', image: '💋', miniature: 'lips card', isNoun: true },
        { word: 'lass', image: '👧', miniature: 'girl figurine', isNoun: true },
        { word: 'less', image: '➖', miniature: 'minus card', isNoun: false },
        { word: 'loss', image: '📉', miniature: 'down arrow card', isNoun: true },
        { word: 'mass', image: '⚖️', miniature: 'scale', isNoun: true },
        { word: 'mess', image: '🗑️', miniature: 'messy desk card', isNoun: true },
        { word: 'miss', image: '🎯', miniature: 'target card', isNoun: false },
        { word: 'moss', image: '🌿', miniature: 'moss picture', isNoun: true },
        { word: 'pass', image: '🎫', miniature: 'bus pass', isNoun: true },
        { word: 'toss', image: '🪃', miniature: 'ball', isNoun: false },
      ],
    },
    {
      label: '-ff/-zz endings',
      description: 'Words ending in double f or double z',
      words: [
        { word: 'buff', image: '💪', miniature: 'muscle card', isNoun: false },
        { word: 'cuff', image: '👔', miniature: 'shirt cuff card', isNoun: true },
        { word: 'huff', image: '💨', miniature: 'blowing face card', isNoun: false },
        { word: 'miff', image: '😠', miniature: 'angry face card', isNoun: false },
        { word: 'off', image: '⭕', miniature: 'off switch card', isNoun: false },
        { word: 'puff', image: '☁️', miniature: 'cotton puff', isNoun: true },
        { word: 'riff', image: '🎸', miniature: 'guitar card', isNoun: true },
        { word: 'stiff', image: '🪵', miniature: 'stiff board', isNoun: false },
        { word: 'stuff', image: '📦', miniature: 'stuffed box', isNoun: true },
        { word: 'buzz', image: '🐝', miniature: 'bee figurine', isNoun: true },
        { word: 'fizz', image: '🥤', miniature: 'fizzy drink card', isNoun: true },
        { word: 'fuzz', image: '🧶', miniature: 'fuzzy ball', isNoun: true },
        { word: 'jazz', image: '🎷', miniature: 'saxophone card', isNoun: true },
      ],
    },    {
      label: '-ck endings',
      description: 'Words ending in -ck (makes /k/ sound)',
      words: [
        { word: 'back', image: '⬅️', miniature: 'back arrow card', isNoun: true },
        { word: 'beck', image: '🏞️', miniature: 'stream card', isNoun: true },
        { word: 'buck', image: '🦌', miniature: 'deer figurine', isNoun: true },
        { word: 'deck', image: '🃏', miniature: 'card deck', isNoun: true },
        { word: 'dock', image: '⚓', miniature: 'boat dock card', isNoun: true },
        { word: 'duck', image: '🦆', miniature: 'rubber duck', isNoun: true },
        { word: 'hack', image: '🪓', miniature: 'axe card', isNoun: false },
        { word: 'kick', image: '🦶', miniature: 'foot card', isNoun: false },
        { word: 'lack', image: '🚫', miniature: 'empty box card', isNoun: true },
        { word: 'lick', image: '👅', miniature: 'tongue card', isNoun: false },
        { word: 'lock', image: '🔒', miniature: 'padlock', isNoun: true },
        { word: 'luck', image: '🍀', miniature: 'four-leaf clover', isNoun: true },
        { word: 'muck', image: '🟤', miniature: 'mud picture card', isNoun: true },
        { word: 'neck', image: '🦒', miniature: 'giraffe figurine', isNoun: true },
        { word: 'nick', image: '✂️', miniature: 'small cut card', isNoun: true },
        { word: 'pack', image: '🎒', miniature: 'backpack', isNoun: true },
        { word: 'peck', image: '🐔', miniature: 'pecking hen', isNoun: false },
        { word: 'pick', image: '⛏️', miniature: 'pick tool', isNoun: false },
        { word: 'puck', image: '🏒', miniature: 'hockey puck', isNoun: true },
        { word: 'rack', image: '🗂️', miniature: 'small rack', isNoun: true },
        { word: 'rock', image: '🪨', miniature: 'small rock', isNoun: true },
        { word: 'sack', image: '🛍️', miniature: 'cloth sack', isNoun: true },
        { word: 'sick', image: '🤒', miniature: 'sick face card', isNoun: false },
        { word: 'sock', image: '🧦', miniature: 'small sock', isNoun: true },
        { word: 'suck', image: '🍭', miniature: 'lollipop', isNoun: false },
        { word: 'tack', image: '📌', miniature: 'thumbtack', isNoun: true },
        { word: 'tick', image: '✅', miniature: 'checkmark card', isNoun: true },
        { word: 'tuck', image: '🛏️', miniature: 'bedding card', isNoun: false },
        { word: 'wick', image: '🕯️', miniature: 'candle wick', isNoun: true },
      ],
    },
  ],
};

// ============================================================
// GREEN SERIES — Phonograms
// Two or more letters combining to make a new/different sound.
// ============================================================

export const GREEN_1: PhonicsPhase = {
  id: 'green1',
  name: 'Green 1 — Consonant Digraphs',
  description: 'Two consonant letters that combine to make one NEW sound: sh, ch, th, wh. These are NOT blends — the letters lose their individual sounds.',
  color: '#22C55E',
  groups: [
    {
      label: 'sh words',
      description: 'The /sh/ sound — "sh" makes a single hushing sound',
      words: [
        { word: 'ship', image: '🚢', miniature: 'toy ship', isNoun: true },
        { word: 'shop', image: '🏪', miniature: 'toy shop front', isNoun: true },
        { word: 'shed', image: '🏚️', miniature: 'small shed model', isNoun: true },
        { word: 'shin', image: '🦵', miniature: 'leg picture card', isNoun: true },
        { word: 'shot', image: '🏀', miniature: 'basketball', isNoun: true },
        { word: 'shag', image: '🧶', miniature: 'shag carpet swatch', isNoun: true },
        { word: 'sham', image: '🎭', miniature: 'mask card', isNoun: true },
        { word: 'shim', image: '📏', miniature: 'thin wedge', isNoun: true },
        { word: 'shut', image: '🚪', miniature: 'closed door card', isNoun: false },
        { word: 'shun', image: '🚫', miniature: 'no entry card', isNoun: false },
        { word: 'fish', image: '🐟', miniature: 'plastic fish', isNoun: true },
        { word: 'dish', image: '🍽️', miniature: 'small dish', isNoun: true },
        { word: 'wish', image: '⭐', miniature: 'star wand', isNoun: true },
        { word: 'gush', image: '💦', miniature: 'water spray card', isNoun: false },
        { word: 'hush', image: '🤫', miniature: 'quiet finger card', isNoun: false },
        { word: 'lush', image: '🌿', miniature: 'green leaf', isNoun: false },
        { word: 'mash', image: '🥔', miniature: 'mashed potato card', isNoun: false },
        { word: 'mesh', image: '🕸️', miniature: 'mesh fabric', isNoun: true },
        { word: 'rash', image: '🔴', miniature: 'red dot card', isNoun: true },
        { word: 'rush', image: '🏃', miniature: 'running figure', isNoun: false },
        { word: 'gash', image: '🩹', miniature: 'bandage', isNoun: true },
        { word: 'bash', image: '💥', miniature: 'smash card', isNoun: false },
        { word: 'cash', image: '💵', miniature: 'paper money', isNoun: true },
        { word: 'lash', image: '👁️', miniature: 'eyelash card', isNoun: true },
        { word: 'mush', image: '🥣', miniature: 'porridge bowl', isNoun: true },
      ],
    },    {
      label: 'ch words',
      description: 'The /ch/ sound — "ch" makes one sound (as in "chop")',
      words: [
        { word: 'chip', image: '🍟', miniature: 'potato chip', isNoun: true },
        { word: 'chop', image: '🪓', miniature: 'chopping block', isNoun: false },
        { word: 'chin', image: '🧔', miniature: 'chin picture card', isNoun: true },
        { word: 'chat', image: '💬', miniature: 'speech bubble card', isNoun: true },
        { word: 'chap', image: '🧑', miniature: 'man figurine', isNoun: true },
        { word: 'chug', image: '🚂', miniature: 'toy train', isNoun: false },
        { word: 'chum', image: '🤝', miniature: 'friends figurines', isNoun: true },
        { word: 'rich', image: '💎', miniature: 'gem', isNoun: false },
        { word: 'much', image: '📦', miniature: 'full box card', isNoun: false },
        { word: 'such', image: '👆', miniature: 'pointing card', isNoun: false },
        { word: 'inch', image: '📏', miniature: 'ruler', isNoun: true },
      ],
    },
    {
      label: 'th words',
      description: 'The /th/ sound — "th" makes one sound (voiced or unvoiced)',
      words: [
        { word: 'thin', image: '🧍', miniature: 'thin stick', isNoun: false },
        { word: 'than', image: '⚖️', miniature: 'comparison card', isNoun: false },
        { word: 'them', image: '👥', miniature: 'group figurines', isNoun: false },
        { word: 'then', image: '➡️', miniature: 'arrow card', isNoun: false },
        { word: 'this', image: '👆', miniature: 'pointing hand card', isNoun: false },
        { word: 'that', image: '👉', miniature: 'pointing card', isNoun: false },
        { word: 'thud', image: '💥', miniature: 'heavy drop card', isNoun: true },
        { word: 'thus', image: '📌', miniature: 'pin card', isNoun: false },
        { word: 'bath', image: '🛁', miniature: 'bathtub', isNoun: true },
        { word: 'math', image: '🔢', miniature: 'number card', isNoun: true },
        { word: 'moth', image: '🦋', miniature: 'moth figurine', isNoun: true },
        { word: 'path', image: '🛤️', miniature: 'path picture card', isNoun: true },
        { word: 'with', image: '🤝', miniature: 'together card', isNoun: false },
      ],
    },
    {
      label: 'wh words',
      description: 'The /wh/ sound — "wh" (in many dialects sounds like /w/)',
      words: [
        { word: 'whip', image: '🏇', miniature: 'small whip', isNoun: true },
        { word: 'whim', image: '💭', miniature: 'thought bubble card', isNoun: true },
        { word: 'when', image: '🕐', miniature: 'clock', isNoun: false },
        { word: 'whet', image: '🔪', miniature: 'sharpening stone', isNoun: false },
        { word: 'whig', image: '🎩', miniature: 'wig on stand', isNoun: true },
        { word: 'whiz', image: '💨', miniature: 'speed card', isNoun: false },
      ],
    },
  ],
};

export const GREEN_2: PhonicsPhase = {
  id: 'green2',
  name: 'Green 2 — Vowel Teams & Silent E',
  description: 'Vowel phonograms (ai, ay, ee, ea, oa, oo, ou, ow, oi, oy, ue, ew, au, aw) and magic/silent E patterns (a_e, i_e, o_e, u_e).',
  color: '#16A34A',
  groups: [
    {
      label: 'Silent E (a_e, i_e, o_e, u_e)',
      description: 'The silent E makes the vowel say its name',
      words: [
        { word: 'cake', image: '🎂', miniature: 'toy cake', isNoun: true },
        { word: 'gate', image: '🚪', miniature: 'small gate', isNoun: true },
        { word: 'lake', image: '🏞️', miniature: 'lake picture card', isNoun: true },
        { word: 'make', image: '🔨', miniature: 'hammer', isNoun: false },
        { word: 'name', image: '📛', miniature: 'name tag', isNoun: true },
        { word: 'tape', image: '📼', miniature: 'roll of tape', isNoun: true },
        { word: 'wave', image: '🌊', miniature: 'wave picture card', isNoun: true },
        { word: 'bite', image: '🍎', miniature: 'bitten apple', isNoun: true },
        { word: 'five', image: '5️⃣', miniature: 'number 5 card', isNoun: true },
        { word: 'hide', image: '🙈', miniature: 'hiding monkey card', isNoun: false },
        { word: 'kite', image: '🪁', miniature: 'toy kite', isNoun: true },
        { word: 'line', image: '📏', miniature: 'straight line card', isNoun: true },
        { word: 'mine', image: '⛏️', miniature: 'mine cart card', isNoun: true },
        { word: 'pine', image: '🌲', miniature: 'pine cone', isNoun: true },
        { word: 'ride', image: '🚲', miniature: 'toy bicycle', isNoun: false },
        { word: 'time', image: '⏰', miniature: 'small clock', isNoun: true },
        { word: 'bone', image: '🦴', miniature: 'dog bone', isNoun: true },
        { word: 'cone', image: '🍦', miniature: 'ice cream cone', isNoun: true },
        { word: 'home', image: '🏠', miniature: 'dollhouse', isNoun: true },
        { word: 'hope', image: '🌈', miniature: 'rainbow card', isNoun: true },
        { word: 'nose', image: '👃', miniature: 'nose card', isNoun: true },
        { word: 'note', image: '📝', miniature: 'sticky note', isNoun: true },
        { word: 'rope', image: '🪢', miniature: 'small rope', isNoun: true },
        { word: 'rose', image: '🌹', miniature: 'plastic rose', isNoun: true },
        { word: 'cube', image: '🧊', miniature: 'wooden cube', isNoun: true },
        { word: 'cute', image: '🥰', miniature: 'cute face card', isNoun: false },
        { word: 'huge', image: '🐘', miniature: 'elephant figurine', isNoun: false },
        { word: 'mule', image: '🫏', miniature: 'mule figurine', isNoun: true },
        { word: 'tune', image: '🎵', miniature: 'music note card', isNoun: true },
        { word: 'tube', image: '🧪', miniature: 'test tube', isNoun: true },
      ],
    },    {
      label: 'ai / ay vowel teams',
      description: 'The long /ā/ sound spelled "ai" (middle) or "ay" (end)',
      words: [
        { word: 'rain', image: '🌧️', miniature: 'rain cloud card', isNoun: true },
        { word: 'tail', image: '🐕', miniature: 'dog tail card', isNoun: true },
        { word: 'mail', image: '📬', miniature: 'letter', isNoun: true },
        { word: 'nail', image: '🔨', miniature: 'small nail', isNoun: true },
        { word: 'pail', image: '🪣', miniature: 'small pail', isNoun: true },
        { word: 'sail', image: '⛵', miniature: 'toy sailboat', isNoun: true },
        { word: 'wait', image: '⏳', miniature: 'hourglass', isNoun: false },
        { word: 'pain', image: '🤕', miniature: 'bandage card', isNoun: true },
        { word: 'bait', image: '🪱', miniature: 'worm card', isNoun: true },
        { word: 'day', image: '☀️', miniature: 'sun card', isNoun: true },
        { word: 'bay', image: '🏖️', miniature: 'bay picture card', isNoun: true },
        { word: 'hay', image: '🌾', miniature: 'hay bundle', isNoun: true },
        { word: 'jay', image: '🐦', miniature: 'blue jay figurine', isNoun: true },
        { word: 'lay', image: '🪹', miniature: 'laying hen card', isNoun: false },
        { word: 'pay', image: '💰', miniature: 'coin', isNoun: false },
        { word: 'play', image: '🎮', miniature: 'toy block', isNoun: false },
        { word: 'ray', image: '☀️', miniature: 'sun ray card', isNoun: true },
        { word: 'say', image: '🗣️', miniature: 'talking card', isNoun: false },
        { word: 'stay', image: '🛑', miniature: 'stop sign', isNoun: false },
        { word: 'way', image: '🛤️', miniature: 'path card', isNoun: true },
      ],
    },
    {
      label: 'ee / ea vowel teams',
      description: 'The long /ē/ sound spelled "ee" or "ea"',
      words: [
        { word: 'bee', image: '🐝', miniature: 'bee figurine', isNoun: true },
        { word: 'fee', image: '💲', miniature: 'price tag', isNoun: true },
        { word: 'free', image: '🕊️', miniature: 'dove figurine', isNoun: false },
        { word: 'seed', image: '🌱', miniature: 'seed packet', isNoun: true },
        { word: 'feed', image: '🍼', miniature: 'feeding bottle', isNoun: false },
        { word: 'feet', image: '🦶', miniature: 'foot prints card', isNoun: true },
        { word: 'keep', image: '🏰', miniature: 'castle keep card', isNoun: false },
        { word: 'peel', image: '🍌', miniature: 'banana peel', isNoun: true },
        { word: 'seen', image: '👁️', miniature: 'eye card', isNoun: false },
        { word: 'tree', image: '🌳', miniature: 'tree figurine', isNoun: true },
        { word: 'week', image: '📅', miniature: 'calendar card', isNoun: true },
        { word: 'bead', image: '📿', miniature: 'bead', isNoun: true },
        { word: 'bean', image: '🫘', miniature: 'dried bean', isNoun: true },
        { word: 'beat', image: '🥁', miniature: 'drum', isNoun: false },
        { word: 'heat', image: '🔥', miniature: 'fire card', isNoun: true },
        { word: 'leaf', image: '🍃', miniature: 'real leaf', isNoun: true },
        { word: 'meal', image: '🍽️', miniature: 'plate and cutlery', isNoun: true },
        { word: 'meat', image: '🥩', miniature: 'meat picture card', isNoun: true },
        { word: 'read', image: '📖', miniature: 'small book', isNoun: false },
        { word: 'seal', image: '🦭', miniature: 'seal figurine', isNoun: true },
        { word: 'team', image: '👥', miniature: 'team picture card', isNoun: true },
        { word: 'peak', image: '⛰️', miniature: 'mountain card', isNoun: true },
      ],
    },    {
      label: 'oa / ow (long o) vowel teams',
      description: 'The long /ō/ sound spelled "oa" or "ow"',
      words: [
        { word: 'boat', image: '⛵', miniature: 'toy boat', isNoun: true },
        { word: 'coat', image: '🧥', miniature: 'doll coat', isNoun: true },
        { word: 'goat', image: '🐐', miniature: 'goat figurine', isNoun: true },
        { word: 'load', image: '📦', miniature: 'loaded box', isNoun: true },
        { word: 'road', image: '🛣️', miniature: 'road picture card', isNoun: true },
        { word: 'soap', image: '🧼', miniature: 'bar of soap', isNoun: true },
        { word: 'toad', image: '🐸', miniature: 'toad figurine', isNoun: true },
        { word: 'oak', image: '🌳', miniature: 'oak leaf', isNoun: true },
        { word: 'bow', image: '🎀', miniature: 'ribbon bow', isNoun: true },
        { word: 'flow', image: '🌊', miniature: 'water flow card', isNoun: true },
        { word: 'grow', image: '🌱', miniature: 'growing plant card', isNoun: false },
        { word: 'low', image: '⬇️', miniature: 'down arrow card', isNoun: false },
        { word: 'mow', image: '🌿', miniature: 'grass card', isNoun: false },
        { word: 'row', image: '🚣', miniature: 'rowing boat card', isNoun: true },
        { word: 'show', image: '🎭', miniature: 'theater mask', isNoun: true },
        { word: 'slow', image: '🐢', miniature: 'turtle figurine', isNoun: false },
        { word: 'snow', image: '❄️', miniature: 'snowflake card', isNoun: true },
      ],
    },
    {
      label: 'oo vowel team',
      description: 'The /oo/ sounds — long (as in "moon") and short (as in "book")',
      words: [
        { word: 'moon', image: '🌙', miniature: 'moon figure', isNoun: true },
        { word: 'food', image: '🍕', miniature: 'food picture card', isNoun: true },
        { word: 'cool', image: '😎', miniature: 'sunglasses', isNoun: false },
        { word: 'pool', image: '🏊', miniature: 'pool picture card', isNoun: true },
        { word: 'room', image: '🚪', miniature: 'room picture card', isNoun: true },
        { word: 'roof', image: '🏠', miniature: 'house roof card', isNoun: true },
        { word: 'soon', image: '⏰', miniature: 'clock card', isNoun: false },
        { word: 'tool', image: '🔧', miniature: 'small wrench', isNoun: true },
        { word: 'zoo', image: '🦁', miniature: 'zoo animal figurine', isNoun: true },
        { word: 'book', image: '📚', miniature: 'small book', isNoun: true },
        { word: 'cook', image: '👨‍🍳', miniature: 'chef hat', isNoun: true },
        { word: 'foot', image: '🦶', miniature: 'foot card', isNoun: true },
        { word: 'good', image: '👍', miniature: 'thumbs up card', isNoun: false },
        { word: 'hook', image: '🪝', miniature: 'small hook', isNoun: true },
        { word: 'look', image: '👀', miniature: 'eyes card', isNoun: false },
        { word: 'wood', image: '🪵', miniature: 'wood block', isNoun: true },
        { word: 'wool', image: '🐑', miniature: 'wool ball', isNoun: true },
      ],
    },    {
      label: 'ou / ow (diphthong) vowel teams',
      description: 'The /ou/ diphthong sound (as in "out" and "cow")',
      words: [
        { word: 'out', image: '🚪', miniature: 'exit sign card', isNoun: false },
        { word: 'loud', image: '📢', miniature: 'megaphone', isNoun: false },
        { word: 'cloud', image: '☁️', miniature: 'cloud card', isNoun: true },
        { word: 'found', image: '🔍', miniature: 'magnifying glass', isNoun: false },
        { word: 'house', image: '🏠', miniature: 'dollhouse', isNoun: true },
        { word: 'mouse', image: '🐭', miniature: 'mouse figurine', isNoun: true },
        { word: 'mouth', image: '👄', miniature: 'mouth card', isNoun: true },
        { word: 'round', image: '⭕', miniature: 'round disc', isNoun: false },
        { word: 'shout', image: '📣', miniature: 'horn', isNoun: false },
        { word: 'sound', image: '🔊', miniature: 'speaker card', isNoun: true },
        { word: 'cow', image: '🐄', miniature: 'cow figurine', isNoun: true },
        { word: 'howl', image: '🐺', miniature: 'wolf figurine', isNoun: false },
        { word: 'brown', image: '🟤', miniature: 'brown card', isNoun: false },
        { word: 'clown', image: '🤡', miniature: 'clown figurine', isNoun: true },
        { word: 'crown', image: '👑', miniature: 'small crown', isNoun: true },
        { word: 'down', image: '⬇️', miniature: 'down arrow card', isNoun: false },
        { word: 'frown', image: '😞', miniature: 'frowning face card', isNoun: true },
        { word: 'gown', image: '👗', miniature: 'doll gown', isNoun: true },
        { word: 'how', image: '❓', miniature: 'question card', isNoun: false },
        { word: 'now', image: '⏰', miniature: 'clock card', isNoun: false },
        { word: 'owl', image: '🦉', miniature: 'owl figurine', isNoun: true },
        { word: 'town', image: '🏘️', miniature: 'town picture card', isNoun: true },
        { word: 'wow', image: '😲', miniature: 'amazed face card', isNoun: false },
      ],
    },
    {
      label: 'oi / oy vowel teams',
      description: 'The /oi/ diphthong sound (as in "oil" and "boy")',
      words: [
        { word: 'boil', image: '🫕', miniature: 'pot card', isNoun: false },
        { word: 'coin', image: '🪙', miniature: 'coin', isNoun: true },
        { word: 'foil', image: '🫙', miniature: 'foil sheet', isNoun: true },
        { word: 'join', image: '🤝', miniature: 'handshake card', isNoun: false },
        { word: 'oil', image: '🛢️', miniature: 'oil bottle', isNoun: true },
        { word: 'soil', image: '🌱', miniature: 'pot of soil', isNoun: true },
        { word: 'coil', image: '🔄', miniature: 'coiled wire', isNoun: true },
        { word: 'point', image: '👆', miniature: 'pointing finger card', isNoun: true },
        { word: 'boy', image: '👦', miniature: 'boy figurine', isNoun: true },
        { word: 'joy', image: '😊', miniature: 'happy face card', isNoun: true },
        { word: 'toy', image: '🧸', miniature: 'small toy', isNoun: true },
        { word: 'enjoy', image: '🎉', miniature: 'party hat', isNoun: false },
        { word: 'royal', image: '👑', miniature: 'crown card', isNoun: false },
      ],
    },    {
      label: 'ue / ew / au / aw vowel teams',
      description: 'Less common vowel teams: /ue/ and /ew/ (long u), /au/ and /aw/ (as in "paw")',
      words: [
        { word: 'blue', image: '🔵', miniature: 'blue card', isNoun: false },
        { word: 'clue', image: '🔍', miniature: 'magnifying glass', isNoun: true },
        { word: 'glue', image: '🧴', miniature: 'glue stick', isNoun: true },
        { word: 'true', image: '✅', miniature: 'check mark card', isNoun: false },
        { word: 'blew', image: '🌬️', miniature: 'wind card', isNoun: false },
        { word: 'chew', image: '🦷', miniature: 'teeth card', isNoun: false },
        { word: 'flew', image: '🦅', miniature: 'bird figurine', isNoun: false },
        { word: 'grew', image: '🌱', miniature: 'plant card', isNoun: false },
        { word: 'knew', image: '💡', miniature: 'lightbulb card', isNoun: false },
        { word: 'new', image: '🆕', miniature: 'new tag', isNoun: false },
        { word: 'drew', image: '✏️', miniature: 'pencil', isNoun: false },
        { word: 'stew', image: '🍲', miniature: 'pot of stew card', isNoun: true },
        { word: 'claw', image: '🦀', miniature: 'crab claw', isNoun: true },
        { word: 'draw', image: '✏️', miniature: 'pencil and paper', isNoun: false },
        { word: 'jaw', image: '🦴', miniature: 'jaw bone card', isNoun: true },
        { word: 'law', image: '⚖️', miniature: 'scales of justice', isNoun: true },
        { word: 'paw', image: '🐾', miniature: 'paw print card', isNoun: true },
        { word: 'raw', image: '🥩', miniature: 'raw meat card', isNoun: false },
        { word: 'saw', image: '🪚', miniature: 'small saw', isNoun: true },
        { word: 'straw', image: '🥤', miniature: 'drinking straw', isNoun: true },
        { word: 'yawn', image: '🥱', miniature: 'yawning face card', isNoun: true },
        { word: 'lawn', image: '🌿', miniature: 'grass patch', isNoun: true },
        { word: 'dawn', image: '🌅', miniature: 'sunrise card', isNoun: true },
        { word: 'fawn', image: '🦌', miniature: 'baby deer figurine', isNoun: true },
      ],
    },
  ],
};

export const GREEN_3: PhonicsPhase = {
  id: 'green3',
  name: 'Green 3 — R-Controlled & Advanced Phonograms',
  description: 'R-controlled vowels (ar, or, er, ir, ur), "igh" phonogram, silent letter pairs (kn, wr), soft c and soft g.',
  color: '#15803D',
  groups: [
    {
      label: 'ar words (bossy r)',
      description: 'The /ar/ sound — "ar" as in "car"',
      words: [
        { word: 'car', image: '🚗', miniature: 'toy car', isNoun: true },
        { word: 'bar', image: '🍫', miniature: 'chocolate bar', isNoun: true },
        { word: 'far', image: '🔭', miniature: 'telescope card', isNoun: false },
        { word: 'jar', image: '🫙', miniature: 'small jar', isNoun: true },
        { word: 'star', image: '⭐', miniature: 'star card', isNoun: true },
        { word: 'arm', image: '💪', miniature: 'arm picture card', isNoun: true },
        { word: 'barn', image: '🏚️', miniature: 'barn figurine', isNoun: true },
        { word: 'cart', image: '🛒', miniature: 'shopping cart', isNoun: true },
        { word: 'card', image: '🃏', miniature: 'playing card', isNoun: true },
        { word: 'dark', image: '🌑', miniature: 'dark circle card', isNoun: false },
        { word: 'farm', image: '🌾', miniature: 'farm picture card', isNoun: true },
        { word: 'hard', image: '🪨', miniature: 'hard rock', isNoun: false },
        { word: 'harp', image: '🎵', miniature: 'harp card', isNoun: true },
        { word: 'mark', image: '✏️', miniature: 'pencil mark card', isNoun: true },
        { word: 'park', image: '🌳', miniature: 'park picture card', isNoun: true },
        { word: 'part', image: '🧩', miniature: 'puzzle piece', isNoun: true },
        { word: 'yard', image: '🏡', miniature: 'house yard card', isNoun: true },
        { word: 'shark', image: '🦈', miniature: 'shark figurine', isNoun: true },
      ],
    },    {
      label: 'or words (bossy r)',
      description: 'The /or/ sound — "or" as in "fork"',
      words: [
        { word: 'for', image: '🎁', miniature: 'gift card', isNoun: false },
        { word: 'or', image: '🔀', miniature: 'choice card', isNoun: false },
        { word: 'born', image: '👶', miniature: 'baby figurine', isNoun: false },
        { word: 'corn', image: '🌽', miniature: 'corn cob', isNoun: true },
        { word: 'cork', image: '🍾', miniature: 'cork', isNoun: true },
        { word: 'fork', image: '🍴', miniature: 'small fork', isNoun: true },
        { word: 'form', image: '📋', miniature: 'form paper', isNoun: true },
        { word: 'horn', image: '📯', miniature: 'small horn', isNoun: true },
        { word: 'lord', image: '👑', miniature: 'crown card', isNoun: true },
        { word: 'port', image: '⚓', miniature: 'anchor', isNoun: true },
        { word: 'sort', image: '📊', miniature: 'sorting card', isNoun: false },
        { word: 'torn', image: '📄', miniature: 'torn paper', isNoun: false },
        { word: 'worn', image: '👟', miniature: 'old shoe', isNoun: false },
        { word: 'storm', image: '⛈️', miniature: 'storm cloud card', isNoun: true },
        { word: 'sport', image: '⚽', miniature: 'ball', isNoun: true },
        { word: 'short', image: '📏', miniature: 'short ruler', isNoun: false },
      ],
    },
    {
      label: 'er / ir / ur words (bossy r)',
      description: 'The /er/ sound — spelled "er", "ir", or "ur" (all sound the same)',
      words: [
        { word: 'her', image: '👩', miniature: 'woman figurine', isNoun: false },
        { word: 'fern', image: '🌿', miniature: 'fern leaf', isNoun: true },
        { word: 'herd', image: '🐄', miniature: 'cow group card', isNoun: true },
        { word: 'term', image: '📅', miniature: 'calendar card', isNoun: true },
        { word: 'verb', image: '📝', miniature: 'action word card', isNoun: true },
        { word: 'bird', image: '🐦', miniature: 'bird figurine', isNoun: true },
        { word: 'dirt', image: '🟤', miniature: 'pot of dirt', isNoun: true },
        { word: 'firm', image: '🏢', miniature: 'building card', isNoun: true },
        { word: 'girl', image: '👧', miniature: 'girl figurine', isNoun: true },
        { word: 'sir', image: '🎩', miniature: 'top hat', isNoun: true },
        { word: 'stir', image: '🥄', miniature: 'stirring spoon', isNoun: false },
        { word: 'burn', image: '🔥', miniature: 'fire card', isNoun: false },
        { word: 'curl', image: '🌀', miniature: 'curl card', isNoun: true },
        { word: 'fur', image: '🐻', miniature: 'fur fabric swatch', isNoun: true },
        { word: 'hurt', image: '🤕', miniature: 'bandage card', isNoun: false },
        { word: 'surf', image: '🏄', miniature: 'surfer card', isNoun: false },
        { word: 'turn', image: '↩️', miniature: 'turn arrow card', isNoun: false },
        { word: 'purse', image: '👛', miniature: 'small purse', isNoun: true },
        { word: 'nurse', image: '👩‍⚕️', miniature: 'nurse figurine', isNoun: true },
      ],
    },    {
      label: 'igh phonogram',
      description: 'The /ī/ sound spelled "igh" (the "gh" is silent)',
      words: [
        { word: 'high', image: '⬆️', miniature: 'tall tower card', isNoun: false },
        { word: 'light', image: '💡', miniature: 'lightbulb', isNoun: true },
        { word: 'might', image: '💪', miniature: 'muscle card', isNoun: true },
        { word: 'night', image: '🌙', miniature: 'moon card', isNoun: true },
        { word: 'right', image: '➡️', miniature: 'right arrow card', isNoun: false },
        { word: 'sight', image: '👁️', miniature: 'eye card', isNoun: true },
        { word: 'tight', image: '🤝', miniature: 'tight grip card', isNoun: false },
        { word: 'bright', image: '☀️', miniature: 'sun card', isNoun: false },
        { word: 'flight', image: '✈️', miniature: 'toy airplane', isNoun: true },
        { word: 'fright', image: '😱', miniature: 'scared face card', isNoun: true },
        { word: 'knight', image: '🗡️', miniature: 'knight figurine', isNoun: true },
      ],
    },
    {
      label: 'Silent letter pairs (kn, wr)',
      description: 'Words where the first letter is silent: kn- and wr-',
      words: [
        { word: 'knit', image: '🧶', miniature: 'knitting needles', isNoun: false },
        { word: 'knob', image: '🚪', miniature: 'door knob', isNoun: true },
        { word: 'knock', image: '👊', miniature: 'knocking fist card', isNoun: false },
        { word: 'knot', image: '🪢', miniature: 'knotted rope', isNoun: true },
        { word: 'know', image: '💡', miniature: 'lightbulb card', isNoun: false },
        { word: 'knee', image: '🦵', miniature: 'knee card', isNoun: true },
        { word: 'knife', image: '🔪', miniature: 'butter knife', isNoun: true },
        { word: 'wrap', image: '🎁', miniature: 'gift wrap', isNoun: false },
        { word: 'wren', image: '🐦', miniature: 'wren bird card', isNoun: true },
        { word: 'wrist', image: '⌚', miniature: 'wristwatch', isNoun: true },
        { word: 'write', image: '✏️', miniature: 'pencil', isNoun: false },
        { word: 'wrong', image: '❌', miniature: 'X mark card', isNoun: false },
      ],
    },
    {
      label: 'Soft c and soft g',
      description: 'C says /s/ before e, i, y. G says /j/ before e, i, y.',
      words: [
        { word: 'cell', image: '🔬', miniature: 'cell picture card', isNoun: true },
        { word: 'cent', image: '🪙', miniature: 'penny', isNoun: true },
        { word: 'city', image: '🏙️', miniature: 'city picture card', isNoun: true },
        { word: 'face', image: '😊', miniature: 'face card', isNoun: true },
        { word: 'ice', image: '🧊', miniature: 'ice cube', isNoun: true },
        { word: 'lace', image: '🧵', miniature: 'lace ribbon', isNoun: true },
        { word: 'mice', image: '🐭', miniature: 'mouse figurines', isNoun: true },
        { word: 'nice', image: '😊', miniature: 'smiley card', isNoun: false },
        { word: 'pace', image: '🚶', miniature: 'walking figure', isNoun: true },
        { word: 'race', image: '🏁', miniature: 'finish flag', isNoun: true },
        { word: 'rice', image: '🍚', miniature: 'rice grains', isNoun: true },
        { word: 'age', image: '🎂', miniature: 'birthday cake card', isNoun: true },
        { word: 'cage', image: '🐦', miniature: 'bird cage card', isNoun: true },
        { word: 'gem', image: '💎', miniature: 'gem stone', isNoun: true },
        { word: 'germ', image: '🦠', miniature: 'germ card', isNoun: true },
        { word: 'giant', image: '🧌', miniature: 'giant figurine', isNoun: true },
        { word: 'giraffe', image: '🦒', miniature: 'giraffe figurine', isNoun: true },
        { word: 'page', image: '📄', miniature: 'book page card', isNoun: true },
        { word: 'stage', image: '🎭', miniature: 'stage card', isNoun: true },
      ],
    },
  ],
};

// ============================================================
// ALL_PHASES — master array in progression order
// ============================================================

export const ALL_PHASES: PhonicsPhase[] = [
  PINK_1,
  PINK_2,
  BLUE_1,
  BLUE_2,
  BLUE_3,
  GREEN_1,
  GREEN_2,
  GREEN_3,
];

// ============================================================
// COMMAND SENTENCES — Action sentences using phonics words
// ============================================================

export const COMMAND_SENTENCES: CommandSentence[] = [
  // Pink level commands
  { sentence: 'Sit on the mat.', phonicsWords: ['sit', 'mat'], phase: 'pink1' },
  { sentence: 'Get the red cup.', phonicsWords: ['get', 'red', 'cup'], phase: 'pink2' },
  { sentence: 'Put the pen in the box.', phonicsWords: ['put', 'pen', 'box'], phase: 'pink2' },
  { sentence: 'Run to the big rug.', phonicsWords: ['run', 'big', 'rug'], phase: 'pink2' },
  { sentence: 'Pat the cat on the bed.', phonicsWords: ['pat', 'cat', 'bed'], phase: 'pink1' },
  { sentence: 'Dip the mop in the tub.', phonicsWords: ['dip', 'mop', 'tub'], phase: 'pink2' },
  { sentence: 'Set the cup on the lid.', phonicsWords: ['set', 'cup', 'lid'], phase: 'pink2' },
  { sentence: 'Hop to the top of the mat.', phonicsWords: ['hop', 'top', 'mat'], phase: 'pink2' },
  { sentence: 'Tap the tin with a pen.', phonicsWords: ['tap', 'tin', 'pen'], phase: 'pink1' },
  // Blue level commands
  { sentence: 'Clap and then stop.', phonicsWords: ['clap', 'stop'], phase: 'blue1' },
  { sentence: 'Grab the drum and tap it.', phonicsWords: ['grab', 'drum', 'tap'], phase: 'blue1' },
  { sentence: 'Skip to the flag and stand.', phonicsWords: ['skip', 'flag', 'stand'], phase: 'blue1' },
  { sentence: 'Step on the rug and jump.', phonicsWords: ['step', 'rug', 'jump'], phase: 'blue2' },
  { sentence: 'Put the plug in the sink.', phonicsWords: ['plug', 'sink'], phase: 'blue3' },
  { sentence: 'Pick the lock with the stick.', phonicsWords: ['pick', 'lock', 'stick'], phase: 'blue3' },
  { sentence: 'Toss the ball and kick it back.', phonicsWords: ['toss', 'ball', 'kick', 'back'], phase: 'blue3' },
  // Green level commands
  { sentence: 'Push the ship to the dish.', phonicsWords: ['push', 'ship', 'dish'], phase: 'green1' },
  { sentence: 'Chop the thin stick in half.', phonicsWords: ['chop', 'thin'], phase: 'green1' },
  { sentence: 'Take the cake to the gate.', phonicsWords: ['take', 'cake', 'gate'], phase: 'green2' },
  { sentence: 'Ride the bike down the line.', phonicsWords: ['ride', 'bike', 'line'], phase: 'green2' },
  { sentence: 'Read the book by the tree.', phonicsWords: ['read', 'book', 'tree'], phase: 'green2' },
  { sentence: 'Turn right at the bright light.', phonicsWords: ['turn', 'right', 'bright', 'light'], phase: 'green3' },
  { sentence: 'Park the car near the barn.', phonicsWords: ['park', 'car', 'barn'], phase: 'green3' },
  { sentence: 'Write your name on the page.', phonicsWords: ['write', 'name', 'page'], phase: 'green3' },
];

// ============================================================
// COMMAND SENTENCE TEMPLATES — Templates for generating commands
// ============================================================

export const COMMAND_SENTENCE_TEMPLATES: CommandSentenceTemplate[] = [
  // Pink templates
  { pattern: 'Get the {word}.', requiredWords: ['get'], phase: 'pink1' },
  { pattern: 'Put the {word} on the {word}.', requiredWords: ['put'], phase: 'pink1' },
  { pattern: 'Sit on the {word}.', requiredWords: ['sit'], phase: 'pink1' },
  { pattern: 'Tap the {word}.', requiredWords: ['tap'], phase: 'pink1' },
  { pattern: 'Run to the {word}.', requiredWords: ['run'], phase: 'pink2' },
  { pattern: 'Hop to the {word}.', requiredWords: ['hop'], phase: 'pink2' },
  { pattern: 'Dip the {word} in the {word}.', requiredWords: ['dip'], phase: 'pink2' },
  { pattern: 'Set the {word} on the {word}.', requiredWords: ['set'], phase: 'pink2' },
  // Blue templates
  { pattern: 'Grab the {word} and {word}.', requiredWords: ['grab'], phase: 'blue1' },
  { pattern: 'Clap and then {word}.', requiredWords: ['clap'], phase: 'blue1' },
  { pattern: 'Step on the {word} and {word}.', requiredWords: ['step'], phase: 'blue1' },
  { pattern: 'Skip to the {word}.', requiredWords: ['skip'], phase: 'blue1' },
  { pattern: 'Jump to the {word} and {word}.', requiredWords: ['jump'], phase: 'blue2' },
  { pattern: 'Stomp on the {word}.', requiredWords: ['stomp'], phase: 'blue2' },
  { pattern: 'Pick the {word} and toss it.', requiredWords: ['pick', 'toss'], phase: 'blue3' },
  { pattern: 'Kick the {word} to the {word}.', requiredWords: ['kick'], phase: 'blue3' },
  // Green templates
  { pattern: 'Push the {word} to the {word}.', requiredWords: ['push'], phase: 'green1' },
  { pattern: 'Chop the {word} with care.', requiredWords: ['chop'], phase: 'green1' },
  { pattern: 'Take the {word} and {word} it.', requiredWords: ['take'], phase: 'green2' },
  { pattern: 'Ride the {word} to the {word}.', requiredWords: ['ride'], phase: 'green2' },
  { pattern: 'Read the {word} by the {word}.', requiredWords: ['read'], phase: 'green2' },
  { pattern: 'Write the {word} on the {word}.', requiredWords: ['write'], phase: 'green3' },
  { pattern: 'Turn the {word} to the right.', requiredWords: ['turn', 'right'], phase: 'green3' },
];

// ============================================================
// PHONICS STORIES — Short decodable stories per phase
// ============================================================

export const PHONICS_STORIES: PhonicsStory[] = [
  {
    title: 'The Cat and the Mat',
    phase: 'pink1',
    pages: [
      { text: 'The cat sat on the mat.', keywords: ['cat', 'sat', 'mat'] },
      { text: 'A man ran to the cat.', keywords: ['man', 'ran', 'cat'] },
      { text: 'The cat got a nap on the mat.', keywords: ['cat', 'got', 'nap', 'mat'] },
    ],
  },
  {
    title: 'The Red Bug',
    phase: 'pink2',
    pages: [
      { text: 'A big red bug sat on a rug.', keywords: ['big', 'red', 'bug', 'sat', 'rug'] },
      { text: 'The bug got in a cup.', keywords: ['bug', 'got', 'cup'] },
      { text: 'A kid let the bug hop out.', keywords: ['kid', 'bug', 'hop'] },
    ],
  },
  {
    title: 'Frog on a Log',
    phase: 'blue1',
    pages: [
      { text: 'A frog sat on a flat log.', keywords: ['frog', 'flat', 'log'] },
      { text: 'A crab slid from a slab.', keywords: ['crab', 'slid', 'slab'] },
      { text: 'The frog and the crab swam in the pond.', keywords: ['frog', 'crab', 'swam', 'pond'] },
    ],
  },
  {
    title: 'The Best Nest',
    phase: 'blue2',
    pages: [
      { text: 'A bird bent a twig for its nest.', keywords: ['bent', 'nest'] },
      { text: 'It sang a song from the best nest.', keywords: ['sang', 'song', 'best', 'nest'] },
      { text: 'The wind and the dust did not fuss the bird.', keywords: ['wind', 'dust', 'fuss'] },
    ],
  },
  {
    title: 'The Duck and the Bell',
    phase: 'blue3',
    pages: [
      { text: 'A duck sat on a rock by the well.', keywords: ['duck', 'rock', 'well'] },
      { text: 'It tossed a pebble and the bell fell.', keywords: ['tossed', 'bell', 'fell'] },
      { text: 'The duck had good luck at the hill.', keywords: ['duck', 'luck', 'hill'] },
    ],
  },  {
    title: 'The Fish Shop',
    phase: 'green1',
    pages: [
      { text: 'Chip went to the fish shop with cash.', keywords: ['chip', 'fish', 'shop', 'cash'] },
      { text: 'He got a fresh dish of fish.', keywords: ['fresh', 'dish', 'fish'] },
      { text: 'Then he sat on a bench to munch.', keywords: ['bench', 'munch'] },
    ],
  },
  {
    title: 'The Boat Ride',
    phase: 'green2',
    pages: [
      { text: 'A goat in a coat got on a boat.', keywords: ['goat', 'coat', 'boat'] },
      { text: 'He ate cake by the lake.', keywords: ['cake', 'lake'] },
      { text: 'A bee flew by the tree and the goat waved.', keywords: ['bee', 'tree', 'goat'] },
    ],
  },
  {
    title: 'The Knight in the Dark',
    phase: 'green3',
    pages: [
      { text: 'A brave knight rode through the dark park.', keywords: ['knight', 'dark', 'park'] },
      { text: 'He saw a bright light near the barn.', keywords: ['bright', 'light', 'barn'] },
      { text: 'He wrote a note about the girl and the bird he found.', keywords: ['wrote', 'note', 'girl', 'bird'] },
    ],
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get all words for a specific phase, flattened from all groups.
 */
export function getPhaseWords(phaseId: string): PhonicsWord[] {
  const phase = ALL_PHASES.find((p) => p.id === phaseId);
  if (!phase) return [];
  return phase.groups.flatMap((g) => g.words);
}

/**
 * Get command sentences for a specific phase (or all phases up to and including it).
 */
export function getCommands(phaseId: string, cumulative = false): CommandSentence[] {
  if (!cumulative) {
    return COMMAND_SENTENCES.filter((c) => c.phase === phaseId);
  }
  const phaseIndex = ALL_PHASES.findIndex((p) => p.id === phaseId);
  if (phaseIndex === -1) return [];
  const validPhases = new Set(ALL_PHASES.slice(0, phaseIndex + 1).map((p) => p.id));
  return COMMAND_SENTENCES.filter((c) => validPhases.has(c.phase));
}

/**
 * Get dictionary words for use in the dictionary generator.
 * Returns words with their phase info for tracking progression.
 */
export function getDictionaryWords(phaseId: string, cumulative = false): Array<PhonicsWord & { phase: string; phaseColor: string }> {
  const phases = cumulative
    ? ALL_PHASES.slice(0, ALL_PHASES.findIndex((p) => p.id === phaseId) + 1)
    : ALL_PHASES.filter((p) => p.id === phaseId);

  return phases.flatMap((phase) =>
    phase.groups.flatMap((group) =>
      group.words.map((word) => ({
        ...word,
        phase: phase.id,
        phaseColor: phase.color,
      }))
    )
  );
}

// ============================================================
// BACKWARD-COMPATIBLE ALIAS EXPORTS
// These maintain compatibility with existing generator pages
// that may reference the old flat phase names.
// ============================================================

/** @deprecated Use PINK_1 */
export const INITIAL_SOUNDS = PINK_1;
/** @deprecated Use PINK_2 */
export const CVC_WORDS = PINK_2;
/** @deprecated Use BLUE_1 */
export const INITIAL_BLENDS = BLUE_1;
/** @deprecated Use BLUE_2 */
export const FINAL_BLENDS = BLUE_2;
/** @deprecated Use GREEN_1 */
export const DIGRAPHS = GREEN_1;
