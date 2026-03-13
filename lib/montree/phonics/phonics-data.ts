// lib/montree/phonics/phonics-data.ts
// =====================================================================
// MASTER PHONICS DATA — Single source of truth for ALL phonics tools
// Montessori AMI-aligned progression:
//   Pink Series (CVC) → Blue Series (blends + digraphs) → Green Series (phonograms)
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
// =====================================================================

export const PINK_1: PhonicsPhase = {
  id: 'pink1',
  name: 'Pink 1 — CMAT Trays',
  color: '#ec4899', // pink
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
        { word: 'hill', image: '⛰️', miniature: 'small mound or picture', isNoun: true },
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
  color: '#f472b6', // pink-400
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
    },
    {
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
        { word: 'jug', image: '🫗', miniature: 'small ceramic jug', isNoun: true },
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

// =====================================================================
// BLUE SERIES 1: CONSONANT DIGRAPHS (sh, ch, th, wh)
// =====================================================================

export const BLUE_1: PhonicsPhase = {
  id: 'blue1',
  name: 'Blue 1 — Consonant Digraphs',
  color: '#6366f1', // indigo
  description: 'Two letters making one new sound: sh, ch, th, wh.',
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
        { word: 'shin', image: '🩹', miniature: 'body part picture card', isNoun: true },
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
        { word: 'chin', image: '🧔', miniature: 'face picture card', isNoun: true },
        { word: 'chip', image: '🍟', miniature: 'food figurine', isNoun: true },
        { word: 'chop', image: '🪓', miniature: 'axe picture card', isNoun: false },
        { word: 'chat', image: '💬', miniature: 'speech bubble picture', isNoun: false },
        { word: 'check', image: '✓', miniature: 'checkmark card', isNoun: true },
      ],
    },
    {
      id: 'th-words',
      label: 'TH Words',
      description: '/th/ — tongue between teeth',
      words: [
        { word: 'this', image: '👉', miniature: 'pointing picture card', isNoun: false },
        { word: 'that', image: '☝️', miniature: 'pointing picture card', isNoun: false },
        { word: 'them', image: '👥', miniature: 'people figurines', isNoun: false },
        { word: 'thin', image: '📏', miniature: 'thin line card', isNoun: false },
        { word: 'thick', image: '📖', miniature: 'thick book picture', isNoun: false },
      ],
    },
    {
      id: 'wh-words',
      label: 'WH Words',
      description: '/wh/ — air expelled through rounded lips',
      words: [
        { word: 'whip', image: '🪇', miniature: 'toy whip', isNoun: true },
        { word: 'when', image: '🕰️', miniature: 'clock picture card', isNoun: false },
        { word: 'what', image: '❓', miniature: 'question mark card', isNoun: false },
        { word: 'wheel', image: '🎡', miniature: 'toy wheel', isNoun: true },
      ],
    },
  ],
};

// =====================================================================
// BLUE SERIES 2: INITIAL CONSONANT BLENDS
// =====================================================================

export const BLUE_2: PhonicsPhase = {
  id: 'blue2',
  name: 'Blue 2 — Initial Blends',
  color: '#4f46e5', // indigo-600
  description: 'Two consonants blend together: bl, br, cl, cr, dr, fl, fr, gl, gr, pl, pr, sk, sl, sm, sn, sp, st, sw, tr.',
  groups: [
    {
      id: 'bl-words',
      label: 'BL Words',
      description: '/bl/ blend at start',
      words: [
        { word: 'black', image: '⬛', miniature: 'black square card', isNoun: false },
        { word: 'block', image: '🧱', miniature: 'toy block', isNoun: true },
        { word: 'blob', image: '🫧', miniature: 'bubble picture', isNoun: true },
        { word: 'blot', image: '♣️', miniature: 'ink blot picture', isNoun: true },
        { word: 'blab', image: '🗣️', miniature: 'talking picture card', isNoun: false },
      ],
    },
    {
      id: 'br-words',
      label: 'BR Words',
      description: '/br/ blend at start',
      words: [
        { word: 'branch', image: '🪴', miniature: 'tree branch', isNoun: true },
        { word: 'brick', image: '🟫', miniature: 'toy brick', isNoun: true },
        { word: 'bridge', image: '🌉', miniature: 'bridge picture card', isNoun: true },
        { word: 'brush', image: '🖌️', miniature: 'small paintbrush', isNoun: true },
        { word: 'brim', image: '👒', miniature: 'hat brim picture', isNoun: true },
      ],
    },
    {
      id: 'cl-words',
      label: 'CL Words',
      description: '/cl/ blend at start',
      words: [
        { word: 'clap', image: '👏', miniature: 'hands picture card', isNoun: false },
        { word: 'clean', image: '🚿', miniature: 'mini broom', isNoun: false },
        { word: 'clock', image: '🕐', miniature: 'toy clock', isNoun: true },
        { word: 'close', image: '🔐', miniature: 'door picture card', isNoun: false },
        { word: 'cloud', image: '☁️', miniature: 'cloud picture card', isNoun: true },
      ],
    },
    {
      id: 'cr-words',
      label: 'CR Words',
      description: '/cr/ blend at start',
      words: [
        { word: 'crab', image: '🦀', miniature: 'plastic crab figurine', isNoun: true },
        { word: 'crack', image: '🔨', miniature: 'cracking picture', isNoun: true },
        { word: 'craft', image: '🎨', miniature: 'art supplies', isNoun: true },
        { word: 'crash', image: '💥', miniature: 'crash picture card', isNoun: true },
        { word: 'cream', image: '🥛', miniature: 'cream container', isNoun: true },
      ],
    },
    {
      id: 'dr-words',
      label: 'DR Words',
      description: '/dr/ blend at start',
      words: [
        { word: 'drag', image: '🏋️', miniature: 'pulling picture card', isNoun: false },
        { word: 'drip', image: '🩸', miniature: 'water drip picture', isNoun: true },
        { word: 'drop', image: '⬇️', miniature: 'drop picture card', isNoun: true },
        { word: 'drum', image: '🥁', miniature: 'toy drum', isNoun: true },
        { word: 'dress', image: '👗', miniature: 'doll dress', isNoun: true },
      ],
    },
    {
      id: 'fl-words',
      label: 'FL Words',
      description: '/fl/ blend at start',
      words: [
        { word: 'flag', image: '🚩', miniature: 'small flag', isNoun: true },
        { word: 'flash', image: '⚡', miniature: 'lightning card', isNoun: true },
        { word: 'flat', image: '🪲', miniature: 'flat object picture', isNoun: false },
        { word: 'flip', image: '🔄', miniature: 'turning picture card', isNoun: false },
        { word: 'flow', image: '〰️', miniature: 'water flow picture', isNoun: false },
      ],
    },
    {
      id: 'fr-words',
      label: 'FR Words',
      description: '/fr/ blend at start',
      words: [
        { word: 'fresh', image: '🍎', miniature: 'fresh fruit picture', isNoun: false },
        { word: 'frog', image: '🐸', miniature: 'plastic frog figurine', isNoun: true },
        { word: 'frost', image: '🥶', miniature: 'frost picture card', isNoun: true },
        { word: 'fruit', image: '🍊', miniature: 'plastic fruit', isNoun: true },
        { word: 'friend', image: '🤝', miniature: 'hands together picture', isNoun: true },
      ],
    },
    {
      id: 'gl-words',
      label: 'GL Words',
      description: '/gl/ blend at start',
      words: [
        { word: 'glad', image: '😃', miniature: 'happy face picture', isNoun: false },
        { word: 'glass', image: '🥃', miniature: 'small glass cup', isNoun: true },
        { word: 'glove', image: '🧤', miniature: 'small glove', isNoun: true },
        { word: 'glob', image: '🟢', miniature: 'glob/lump picture', isNoun: true },
        { word: 'glue', image: '🧴', miniature: 'small glue bottle', isNoun: true },
      ],
    },
    {
      id: 'gr-words',
      label: 'GR Words',
      description: '/gr/ blend at start',
      words: [
        { word: 'grab', image: '🤲', miniature: 'grabbing hands picture', isNoun: false },
        { word: 'grape', image: '🍇', miniature: 'plastic grape', isNoun: true },
        { word: 'grass', image: '🟩', miniature: 'grass picture card', isNoun: true },
        { word: 'green', image: '💚', miniature: 'green color card', isNoun: false },
        { word: 'grin', image: '😁', miniature: 'smiling face picture', isNoun: false },
        { word: 'grip', image: '🤜', miniature: 'hand grip picture', isNoun: false },
      ],
    },
    {
      id: 'pl-words',
      label: 'PL Words',
      description: '/pl/ blend at start',
      words: [
        { word: 'plan', image: '📋', miniature: 'plan/checklist picture', isNoun: true },
        { word: 'plant', image: '🌻', miniature: 'small potted plant', isNoun: true },
        { word: 'plate', image: '🥘', miniature: 'dollhouse plate', isNoun: true },
        { word: 'plum', image: '🍑', miniature: 'plastic plum', isNoun: true },
        { word: 'plug', image: '🔌', miniature: 'electric plug', isNoun: true },
      ],
    },
    {
      id: 'pr-words',
      label: 'PR Words',
      description: '/pr/ blend at start',
      words: [
        { word: 'press', image: '👇', miniature: 'pressing motion picture', isNoun: false },
        { word: 'price', image: '💰', miniature: 'money picture card', isNoun: true },
        { word: 'prince', image: '👑', miniature: 'crown toy', isNoun: true },
        { word: 'print', image: '🖨️', miniature: 'printing picture', isNoun: true },
        { word: 'proud', image: '🦁', miniature: 'proud pose picture', isNoun: false },
      ],
    },
    {
      id: 'sc-words',
      label: 'SC Words',
      description: '/sk/ sound at start (soft c)',
      words: [
        { word: 'scarf', image: '🧣', miniature: 'doll scarf', isNoun: true },
        { word: 'scale', image: '⚖️', miniature: 'small scale toy', isNoun: true },
        { word: 'scare', image: '👻', miniature: 'ghost picture card', isNoun: false },
        { word: 'scone', image: '🥐', miniature: 'scone picture card', isNoun: true },
      ],
    },
    {
      id: 'sk-words',
      label: 'SK Words',
      description: '/sk/ blend at start',
      words: [
        { word: 'skip', image: '🦘', miniature: 'skipping figure', isNoun: false },
        { word: 'skull', image: '💀', miniature: 'plastic skull', isNoun: true },
        { word: 'skin', image: '🖐️', miniature: 'hand skin picture', isNoun: true },
        { word: 'skirt', image: '🩱', miniature: 'doll skirt', isNoun: true },
        { word: 'sketch', image: '✏️', miniature: 'sketch paper', isNoun: true },
      ],
    },
    {
      id: 'sm-words',
      label: 'SM Words',
      description: '/sm/ blend at start',
      words: [
        { word: 'smell', image: '🌺', miniature: 'nose picture card', isNoun: false },
        { word: 'smile', image: '😊', miniature: 'smiley face figurine', isNoun: true },
        { word: 'smoke', image: '🌋', miniature: 'smoke picture card', isNoun: true },
        { word: 'smooth', image: '🧈', miniature: 'smooth object picture', isNoun: false },
        { word: 'smash', image: '💢', miniature: 'smashing picture card', isNoun: false },
      ],
    },
    {
      id: 'sn-words',
      label: 'SN Words',
      description: '/sn/ blend at start',
      words: [
        { word: 'snag', image: '🪝', miniature: 'small hook', isNoun: true },
        { word: 'snake', image: '🐍', miniature: 'plastic snake figurine', isNoun: true },
        { word: 'snap', image: '🫰', miniature: 'snapping fingers picture', isNoun: false },
        { word: 'snack', image: '🍿', miniature: 'snack picture card', isNoun: true },
        { word: 'snip', image: '🪡', miniature: 'snipping picture card', isNoun: false },
      ],
    },
    {
      id: 'sp-words',
      label: 'SP Words',
      description: '/sp/ blend at start',
      words: [
        { word: 'spin', image: '🌀', miniature: 'spinning top', isNoun: false },
        { word: 'spot', image: '🟣', miniature: 'dot sticker or card', isNoun: true },
        { word: 'spell', image: '🔤', miniature: 'spelling letters picture', isNoun: false },
        { word: 'sponge', image: '🧽', miniature: 'small sponge', isNoun: true },
        { word: 'splash', image: '💦', miniature: 'water splash picture', isNoun: true },
      ],
    },
    {
      id: 'st-words',
      label: 'ST Words',
      description: '/st/ blend at start',
      words: [
        { word: 'stick', image: '🏑', miniature: 'small twig or stick', isNoun: true },
        { word: 'stop', image: '🛑', miniature: 'stop sign toy', isNoun: true },
        { word: 'stamp', image: '📫', miniature: 'stamp or ink pad', isNoun: true },
        { word: 'stone', image: '🪨', miniature: 'small river stone', isNoun: true },
        { word: 'stump', image: '🍄', miniature: 'tree stump picture', isNoun: true },
        { word: 'storm', image: '⛈️', miniature: 'storm picture card', isNoun: true },
      ],
    },
    {
      id: 'sw-words',
      label: 'SW Words',
      description: '/sw/ blend at start',
      words: [
        { word: 'swim', image: '🏊', miniature: 'swimming figure', isNoun: false },
        { word: 'swing', image: '🎪', miniature: 'swing toy', isNoun: true },
        { word: 'swan', image: '🦢', miniature: 'plastic swan figurine', isNoun: true },
        { word: 'sweet', image: '🍬', miniature: 'candy picture card', isNoun: true },
        { word: 'sweep', image: '🪥', miniature: 'sweeping motion picture', isNoun: false },
      ],
    },
    {
      id: 'tr-words',
      label: 'TR Words',
      description: '/tr/ blend at start',
      words: [
        { word: 'truck', image: '🚚', miniature: 'toy truck', isNoun: true },
        { word: 'trap', image: '🪤', miniature: 'small trap picture', isNoun: true },
        { word: 'tram', image: '🚊', miniature: 'toy tram/trolley', isNoun: true },
        { word: 'trot', image: '🐴', miniature: 'horse figurine', isNoun: false },
        { word: 'trim', image: '✂️', miniature: 'small scissors', isNoun: false },
      ],
    },
  ],
};

// =====================================================================
// BLUE SERIES 3: FINAL CONSONANT BLENDS
// =====================================================================

export const BLUE_3: PhonicsPhase = {
  id: 'blue3',
  name: 'Blue 3 — Final Blends',
  color: '#4338ca', // indigo-700
  description: 'Two consonants blend together at the end: consonant clusters in final position.',
  groups: [
    {
      id: 'nd-words',
      label: 'ND Words (Final)',
      description: '/nd/ blend at end',
      words: [
        { word: 'band', image: '🎵', miniature: 'music band picture', isNoun: true },
        { word: 'hand', image: '✋', miniature: 'hand picture card', isNoun: true },
        { word: 'land', image: '🏜️', miniature: 'landscape picture', isNoun: true },
        { word: 'sand', image: '🏖️', miniature: 'sand scoop', isNoun: true },
        { word: 'wind', image: '💨', miniature: 'wind picture card', isNoun: true },
      ],
    },
    {
      id: 'ng-words',
      label: 'NG Words (Final)',
      description: '/ng/ blend at end',
      words: [
        { word: 'bang', image: '🔊', miniature: 'loud sound picture card', isNoun: true },
        { word: 'hang', image: '📍', miniature: 'hanging picture', isNoun: false },
        { word: 'ring', image: '💍', miniature: 'toy ring', isNoun: true },
        { word: 'sing', image: '🎤', miniature: 'microphone toy', isNoun: false },
        { word: 'wing', image: '🪶', miniature: 'feather or wing picture', isNoun: true },
      ],
    },
    {
      id: 'nk-words',
      label: 'NK Words (Final)',
      description: '/nk/ blend at end',
      words: [
        { word: 'bank', image: '🏦', miniature: 'toy bank', isNoun: true },
        { word: 'dank', image: '🌑', miniature: 'damp dark picture card', isNoun: false },
        { word: 'pink', image: '💗', miniature: 'pink color card', isNoun: false },
        { word: 'sink', image: '🪠', miniature: 'miniature sink', isNoun: true },
        { word: 'tank', image: '🏺', miniature: 'toy tank', isNoun: true },
      ],
    },
    {
      id: 'ld-words',
      label: 'LD Words (Final)',
      description: '/ld/ blend at end',
      words: [
        { word: 'cold', image: '🌬️', miniature: 'cold wind picture', isNoun: false },
        { word: 'fold', image: '📄', miniature: 'paper folding picture', isNoun: false },
        { word: 'gold', image: '💛', miniature: 'gold-colored object', isNoun: true },
        { word: 'hold', image: '👐', miniature: 'holding hands picture', isNoun: false },
        { word: 'sold', image: '💲', miniature: 'sold tag picture', isNoun: false },
      ],
    },
    {
      id: 'lf-words',
      label: 'LF Words (Final)',
      description: '/lf/ blend at end',
      words: [
        { word: 'self', image: '🪞', miniature: 'mirror picture', isNoun: true },
        { word: 'half', image: '🥧', miniature: 'divided object picture', isNoun: true },
        { word: 'calf', image: '🐄', miniature: 'cow calf figurine', isNoun: true },
        { word: 'shelf', image: '📚', miniature: 'small shelf', isNoun: true },
      ],
    },
    {
      id: 'lt-words',
      label: 'LT Words (Final)',
      description: '/lt/ blend at end',
      words: [
        { word: 'belt', image: '⛓️', miniature: 'toy belt', isNoun: true },
        { word: 'felt', image: '🧵', miniature: 'felt material sample', isNoun: true },
        { word: 'melt', image: '🫠', miniature: 'melting picture card', isNoun: false },
        { word: 'salt', image: '🧂', miniature: 'salt container', isNoun: true },
      ],
    },
    {
      id: 'mp-words',
      label: 'MP Words (Final)',
      description: '/mp/ blend at end',
      words: [
        { word: 'camp', image: '⛺', miniature: 'toy tent', isNoun: true },
        { word: 'bump', image: '🤕', miniature: 'bump picture card', isNoun: true },
        { word: 'dump', image: '🏗️', miniature: 'dump truck toy', isNoun: true },
        { word: 'hump', image: '🐪', miniature: 'camel figurine', isNoun: true },
        { word: 'jump', image: '⛹️', miniature: 'jumping figure', isNoun: false },
        { word: 'lamp', image: '💡', miniature: 'small toy lamp', isNoun: true },
        { word: 'lump', image: '⭕', miniature: 'lump shape picture', isNoun: true },
        { word: 'pump', image: '⛽', miniature: 'pump picture card', isNoun: true },
      ],
    },
    {
      id: 'ft-words',
      label: 'FT Words (Final)',
      description: '/ft/ blend at end',
      words: [
        { word: 'daft', image: '😄', miniature: 'silly face picture', isNoun: false },
        { word: 'left', image: '👈', miniature: 'left direction arrow', isNoun: false },
        { word: 'lift', image: '⬆️', miniature: 'lifting motion picture', isNoun: false },
        { word: 'raft', image: '🛶', miniature: 'toy raft', isNoun: true },
        { word: 'soft', image: '🧸', miniature: 'soft plush toy', isNoun: false },
      ],
    },
    {
      id: 'ct-words',
      label: 'CT Words (Final)',
      description: '/kt/ blend at end',
      words: [
        { word: 'act', image: '🎭', miniature: 'theater mask toy', isNoun: true },
        { word: 'fact', image: 'ℹ️', miniature: 'fact card picture', isNoun: true },
        { word: 'pact', image: '📜', miniature: 'agreement picture', isNoun: true },
        { word: 'duct', image: '🔧', miniature: 'pipe picture card', isNoun: true },
      ],
    },
    {
      id: 'pt-words',
      label: 'PT Words (Final)',
      description: '/pt/ blend at end',
      words: [
        { word: 'kept', image: '🔒', miniature: 'holding/keeping picture', isNoun: false },
        { word: 'sept', image: '📅', miniature: 'September calendar card', isNoun: true },
        { word: 'swept', image: '🌪️', miniature: 'sweeping motion picture', isNoun: false },
        { word: 'wept', image: '😭', miniature: 'crying face picture', isNoun: false },
      ],
    },
    {
      id: 'st-final-words',
      label: 'ST Words (Final)',
      description: '/st/ blend at end',
      words: [
        { word: 'best', image: '🏆', miniature: 'trophy picture', isNoun: true },
        { word: 'cast', image: '🪃', miniature: 'fishing cast picture', isNoun: false },
        { word: 'fast', image: '🏎️', miniature: 'speed picture card', isNoun: false },
        { word: 'feast', image: '🥗', miniature: 'food picture card', isNoun: true },
        { word: 'first', image: '🥇', miniature: 'first place medal', isNoun: false },
        { word: 'last', image: '⏱️', miniature: 'end picture card', isNoun: false },
        { word: 'mast', image: '🏴‍☠️', miniature: 'boat mast picture', isNoun: true },
        { word: 'most', image: '📈', miniature: 'amount picture card', isNoun: false },
        { word: 'nest', image: '🪹', miniature: 'bird nest picture', isNoun: true },
        { word: 'rest', image: '🛌', miniature: 'sleeping figure', isNoun: false },
        { word: 'test', image: '🖍️', miniature: 'test paper card', isNoun: true },
        { word: 'west', image: '🌅', miniature: 'sunset picture', isNoun: true },
        { word: 'zest', image: '🍋', miniature: 'lemon zest picture card', isNoun: true },
      ],
    },
  ],
};

// =====================================================================
// GREEN SERIES 1: VOWEL TEAMS (Long Vowel Digraphs)
// =====================================================================

export const GREEN_1: PhonicsPhase = {
  id: 'green1',
  name: 'Green 1 — Vowel Teams',
  color: '#16a34a', // green-600
  description: 'Two vowels working together to make one long sound: ai, ay, ee, oa, oo, ow (long O).',
  groups: [
    {
      id: 'ai-words',
      label: 'AI Words',
      description: '/ai/ — long A sound',
      words: [
        { word: 'rain', image: '🌧️', miniature: 'rain drop picture', isNoun: true },
        { word: 'nail', image: '🪛', miniature: 'small nail', isNoun: true },
        { word: 'tail', image: '🐎', miniature: 'fox tail picture', isNoun: true },
        { word: 'pail', image: '🪣', miniature: 'small bucket', isNoun: true },
        { word: 'snail', image: '🐌', miniature: 'plastic snail figurine', isNoun: true },
        { word: 'train', image: '🚂', miniature: 'toy train', isNoun: true },
        { word: 'maid', image: '👩', miniature: 'servant figure', isNoun: true },
        { word: 'braid', image: '👱', miniature: 'braided hair picture', isNoun: true },
        { word: 'mail', image: '📮', miniature: 'mailbox toy', isNoun: true },
      ],
    },
    {
      id: 'ee-words',
      label: 'EE Words',
      description: '/ee/ — long E sound',
      words: [
        { word: 'bee', image: '🐝', miniature: 'plastic bee figurine', isNoun: true },
        { word: 'seed', image: '🌱', miniature: 'real seed in packet', isNoun: true },
        { word: 'feet', image: '🦶', miniature: 'feet picture card', isNoun: true },
        { word: 'sheep', image: '🐑', miniature: 'plastic sheep figurine', isNoun: true },
        { word: 'jeep', image: '🚙', miniature: 'toy jeep', isNoun: true },
        { word: 'tree', image: '🌳', miniature: 'toy tree', isNoun: true },
        { word: 'weed', image: '🪻', miniature: 'weed plant picture', isNoun: true },
        { word: 'reed', image: '🎋', miniature: 'reed plant picture', isNoun: true },
      ],
    },
    {
      id: 'oa-words',
      label: 'OA Words',
      description: '/oa/ — long O sound',
      words: [
        { word: 'boat', image: '⛵', miniature: 'toy boat', isNoun: true },
        { word: 'coat', image: '🧥', miniature: 'doll coat', isNoun: true },
        { word: 'goat', image: '🐐', miniature: 'plastic goat figurine', isNoun: true },
        { word: 'soap', image: '🧼', miniature: 'small soap bar', isNoun: true },
        { word: 'toad', image: '🐢', miniature: 'plastic toad figurine', isNoun: true },
        { word: 'road', image: '🛣️', miniature: 'road picture card', isNoun: true },
        { word: 'toast', image: '🫓', miniature: 'toast picture card', isNoun: true },
        { word: 'coal', image: '⚫', miniature: 'coal piece or picture', isNoun: true },
      ],
    },
    {
      id: 'oo-words',
      label: 'OO Words',
      description: '/oo/ — long OO sound',
      words: [
        { word: 'moon', image: '🌙', miniature: 'moon picture card', isNoun: true },
        { word: 'boot', image: '👢', miniature: 'doll boot', isNoun: true },
        { word: 'pool', image: '🎱', miniature: 'toy pool', isNoun: true },
        { word: 'food', image: '🍌', miniature: 'plastic food', isNoun: true },
        { word: 'spoon', image: '🥄', miniature: 'small spoon', isNoun: true },
        { word: 'hoop', image: '🪀', miniature: 'hula hoop toy', isNoun: true },
        { word: 'room', image: '🏨', miniature: 'room picture card', isNoun: true },
        { word: 'broom', image: '🧹', miniature: 'small broom', isNoun: true },
        { word: 'tooth', image: '🦷', miniature: 'tooth picture card', isNoun: true },
      ],
    },
    {
      id: 'ay-words',
      label: 'AY Words',
      description: '/ay/ — long A sound',
      words: [
        { word: 'hay', image: '🌾', miniature: 'hay picture card', isNoun: true },
        { word: 'play', image: '🎮', miniature: 'toy game', isNoun: false },
        { word: 'day', image: '🌤️', miniature: 'sun picture card', isNoun: true },
        { word: 'tray', image: '🍱', miniature: 'small tray', isNoun: true },
        { word: 'clay', image: '🍶', miniature: 'modeling clay', isNoun: true },
        { word: 'ray', image: '🔆', miniature: 'light ray picture', isNoun: true },
      ],
    },
    {
      id: 'ow-long-words',
      label: 'OW Words (Long O)',
      description: '/ow/ — long O sound',
      words: [
        { word: 'bow', image: '🎀', miniature: 'ribbon bow', isNoun: true },
        { word: 'low', image: '📉', miniature: 'down arrow picture', isNoun: false },
        { word: 'row', image: '⚪⚪⚪', miniature: 'row arrangement picture', isNoun: true },
        { word: 'flow', image: '🔵', miniature: 'river flow picture', isNoun: false },
        { word: 'snow', image: '☃️', miniature: 'snowman picture', isNoun: true },
        { word: 'glow', image: '✨', miniature: 'glowing picture card', isNoun: false },
      ],
    },
  ],
};

// =====================================================================
// GREEN SERIES 2: MAGIC E (Silent E)
// =====================================================================

export const GREEN_2: PhonicsPhase = {
  id: 'green2',
  name: 'Green 2 — Magic E',
  color: '#15803d', // green-700
  description: 'Silent E at the end changes the vowel to say its long sound.',
  groups: [
    {
      id: 'a_e-words',
      label: 'A_E Words',
      description: 'a + silent e = long A',
      words: [
        { word: 'cake', image: '🎂', miniature: 'toy cake or picture', isNoun: true },
        { word: 'lake', image: '🏞️', miniature: 'lake picture card', isNoun: true },
        { word: 'gate', image: '🚪', miniature: 'gate picture card', isNoun: true },
        { word: 'name', image: '✍️', miniature: 'nameplate picture', isNoun: true },
        { word: 'game', image: '🎲', miniature: 'toy game', isNoun: true },
        { word: 'made', image: '🛠️', miniature: 'making picture card', isNoun: false },
        { word: 'tape', image: '📼', miniature: 'tape roll', isNoun: true },
        { word: 'cave', image: '🗻', miniature: 'cave picture card', isNoun: true },
        { word: 'wave', image: '🌊', miniature: 'wave picture card', isNoun: true },
        { word: 'cage', image: '🦜', miniature: 'small toy cage', isNoun: true },
      ],
    },
    {
      id: 'i_e-words',
      label: 'I_E Words',
      description: 'i + silent e = long I',
      words: [
        { word: 'bike', image: '🚲', miniature: 'toy bicycle', isNoun: true },
        { word: 'kite', image: '🪁', miniature: 'toy kite', isNoun: true },
        { word: 'pine', image: '🌲', miniature: 'pine tree picture', isNoun: true },
        { word: 'line', image: '➖', miniature: 'line drawing picture', isNoun: true },
        { word: 'ride', image: '🚴', miniature: 'riding figure', isNoun: false },
        { word: 'hide', image: '🫣', miniature: 'hiding picture', isNoun: false },
        { word: 'time', image: '⏰', miniature: 'toy clock', isNoun: true },
        { word: 'mine', image: '🏔️', miniature: 'mining picture card', isNoun: true },
        { word: 'five', image: '5️⃣', miniature: 'number 5 card', isNoun: true },
        { word: 'hive', image: '🧺', miniature: 'bee hive picture', isNoun: true },
      ],
    },
    {
      id: 'o_e-words',
      label: 'O_E Words',
      description: 'o + silent e = long O',
      words: [
        { word: 'bone', image: '🦴', miniature: 'toy bone', isNoun: true },
        { word: 'home', image: '🏡', miniature: 'toy house', isNoun: true },
        { word: 'cone', image: '🍦', miniature: 'ice cream cone picture', isNoun: true },
        { word: 'rope', image: '🪢', miniature: 'small rope', isNoun: true },
        { word: 'nose', image: '👃', miniature: 'nose picture card', isNoun: true },
        { word: 'hole', image: '🕳️', miniature: 'hole picture card', isNoun: true },
        { word: 'mole', image: '🦡', miniature: 'mole animal picture', isNoun: true },
        { word: 'rose', image: '🌹', miniature: 'plastic rose flower', isNoun: true },
        { word: 'note', image: '🎼', miniature: 'musical note card', isNoun: true },
        { word: 'tone', image: '🔔', miniature: 'tone/sound picture', isNoun: true },
      ],
    },
    {
      id: 'u_e-words',
      label: 'U_E Words',
      description: 'u + silent e = long U',
      words: [
        { word: 'cube', image: '🧊', miniature: 'ice cube or plastic cube', isNoun: true },
        { word: 'tube', image: '🔬', miniature: 'test tube picture', isNoun: true },
        { word: 'flute', image: '🎺', miniature: 'toy flute', isNoun: true },
        { word: 'mule', image: '🫏', miniature: 'mule animal figurine', isNoun: true },
        { word: 'cute', image: '🥰', miniature: 'cute animal picture', isNoun: false },
        { word: 'rule', image: '📐', miniature: 'rule card picture', isNoun: true },
        { word: 'tune', image: '📻', miniature: 'musical note card', isNoun: true },
        { word: 'dune', image: '🐫', miniature: 'sand dune picture', isNoun: true },
        { word: 'prune', image: '🫒', miniature: 'prune picture or toy', isNoun: true },
        { word: 'fuse', image: '🔋', miniature: 'electrical fuse picture', isNoun: true },
      ],
    },
  ],
};

// =====================================================================
// GREEN SERIES 3: R-CONTROLLED VOWELS (AR, OR, ER, IR, UR)
// =====================================================================

export const GREEN_3: PhonicsPhase = {
  id: 'green3',
  name: 'Green 3 — R-Controlled Vowels',
  color: '#166534', // green-800
  description: 'R after a vowel changes its sound: ar, or, er, ir, ur.',
  groups: [
    {
      id: 'ar-words',
      label: 'AR Words',
      description: '/ar/ sound — "ah" modified by R',
      words: [
        { word: 'car', image: '🚗', miniature: 'toy car', isNoun: true },
        { word: 'cart', image: '🛒', miniature: 'toy cart', isNoun: true },
        { word: 'jar', image: '🫙', miniature: 'small jar', isNoun: true },
        { word: 'bar', image: '🍫', miniature: 'chocolate bar picture', isNoun: true },
        { word: 'farm', image: '🚜', miniature: 'farm picture card', isNoun: true },
        { word: 'barn', image: '🐮', miniature: 'barn picture card', isNoun: true },
        { word: 'card', image: '🎴', miniature: 'playing card', isNoun: true },
        { word: 'park', image: '🛝', miniature: 'park picture card', isNoun: true },
        { word: 'arm', image: '💪', miniature: 'arm picture card', isNoun: true },
        { word: 'art', image: '🖼️', miniature: 'art picture card', isNoun: true },
      ],
    },
    {
      id: 'or-words',
      label: 'OR Words',
      description: '/or/ sound — "oh" modified by R',
      words: [
        { word: 'fork', image: '🍴', miniature: 'toy fork or utensil', isNoun: true },
        { word: 'corn', image: '🌽', miniature: 'corn cob or picture', isNoun: true },
        { word: 'horn', image: '📯', miniature: 'toy horn', isNoun: true },
        { word: 'cord', image: '🔗', miniature: 'small cord or string', isNoun: true },
        { word: 'port', image: '⚓', miniature: 'port/harbor picture', isNoun: true },
        { word: 'sort', image: '📊', miniature: 'sorting picture card', isNoun: false },
        { word: 'fort', image: '🏰', miniature: 'toy fort', isNoun: true },
        { word: 'born', image: '👶', miniature: 'baby picture card', isNoun: false },
        { word: 'torn', image: '🗞️', miniature: 'torn paper picture', isNoun: false },
        { word: 'cork', image: '🍾', miniature: 'bottle cork', isNoun: true },
      ],
    },
    {
      id: 'er-ir-ur-words',
      label: 'ER, IR, UR Words',
      description: '/er/ sound — three spellings',
      words: [
        { word: 'fern', image: '🍃', miniature: 'fern plant picture', isNoun: true },
        { word: 'herd', image: '🐃', miniature: 'herd of animals picture', isNoun: true },
        { word: 'bird', image: '🐦', miniature: 'plastic bird figurine', isNoun: true },
        { word: 'girl', image: '👧', miniature: 'girl figurine', isNoun: true },
        { word: 'stir', image: '🍵', miniature: 'stirring picture card', isNoun: false },
        { word: 'fur', image: '🐈', miniature: 'fur material sample', isNoun: true },
        { word: 'burn', image: '🧯', miniature: 'fire/flame picture', isNoun: false },
        { word: 'curl', image: '➰', miniature: 'curly hair picture', isNoun: true },
        { word: 'turn', image: '↩️', miniature: 'turning arrow picture', isNoun: false },
        { word: 'surf', image: '🏄', miniature: 'surfing picture card', isNoun: false },
      ],
    },
  ],
};

// =====================================================================
// ALL PHASES IN ORDER
// =====================================================================

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

// =====================================================================
// COMMAND SENTENCES & STORIES
// =====================================================================

export interface CommandSentence {
  text: string;
  phase: string;
  level: number;
}

export const COMMAND_SENTENCES: CommandSentence[] = [
  // PINK 1
  { text: 'Get the cat.', phase: 'pink1', level: 1 },
  { text: 'Get the mat.', phase: 'pink1', level: 1 },
  { text: 'Get the can.', phase: 'pink1', level: 1 },
  { text: 'Get the net.', phase: 'pink1', level: 1 },
  { text: 'Put the cat on the mat.', phase: 'pink1', level: 2 },
  { text: 'Put the net in the can.', phase: 'pink1', level: 2 },

  // PINK 2
  { text: 'Get the bat.', phase: 'pink2', level: 1 },
  { text: 'Get the hat.', phase: 'pink2', level: 1 },
  { text: 'Get the pig.', phase: 'pink2', level: 1 },
  { text: 'Get the pen.', phase: 'pink2', level: 1 },
  { text: 'Get the dog.', phase: 'pink2', level: 1 },
  { text: 'Get the sun.', phase: 'pink2', level: 1 },
  { text: 'Put the bat on the mat.', phase: 'pink2', level: 2 },
  { text: 'Put the pig in the pen.', phase: 'pink2', level: 2 },
  { text: 'Put the dog on the rug.', phase: 'pink2', level: 2 },
  { text: 'Put the hat in the box.', phase: 'pink2', level: 2 },
  { text: 'Get the hat, the bat, and the cat.', phase: 'pink2', level: 3 },
  { text: 'Put the hat on the cat and the bat on the dog.', phase: 'pink2', level: 3 },

  // BLUE 1
  { text: 'Get the ship.', phase: 'blue1', level: 1 },
  { text: 'Get the fish.', phase: 'blue1', level: 1 },
  { text: 'Get the chin.', phase: 'blue1', level: 1 },
  { text: 'Get the dish.', phase: 'blue1', level: 1 },
  { text: 'Put the fish in the dish.', phase: 'blue1', level: 2 },
  { text: 'Put the ship on the water.', phase: 'blue1', level: 2 },
  { text: 'Get the ship and the fish.', phase: 'blue1', level: 3 },

  // BLUE 2
  { text: 'Get the block.', phase: 'blue2', level: 1 },
  { text: 'Get the flag.', phase: 'blue2', level: 1 },
  { text: 'Get the crab.', phase: 'blue2', level: 1 },
  { text: 'Get the drum.', phase: 'blue2', level: 1 },
  { text: 'Put the block on the table.', phase: 'blue2', level: 2 },
  { text: 'Put the crab on the sand.', phase: 'blue2', level: 2 },
  { text: 'Put the flag by the clock.', phase: 'blue2', level: 2 },
  { text: 'Get the block, the crab, and the flag.', phase: 'blue2', level: 3 },
  { text: 'Get the frog and put it by the drum.', phase: 'blue2', level: 3 },

  // BLUE 3
  { text: 'Get the sand.', phase: 'blue3', level: 1 },
  { text: 'Get the ring.', phase: 'blue3', level: 1 },
  { text: 'Get the nest.', phase: 'blue3', level: 1 },
  { text: 'Put the sand in the bucket.', phase: 'blue3', level: 2 },
  { text: 'Put the ring on the shelf.', phase: 'blue3', level: 2 },
  { text: 'Put the ring on the nest.', phase: 'blue3', level: 2 },
  { text: 'Get the sand, the ring, and the nest.', phase: 'blue3', level: 3 },

  // GREEN 1
  { text: 'Get the boat.', phase: 'green1', level: 1 },
  { text: 'Get the rain.', phase: 'green1', level: 1 },
  { text: 'Get the bee.', phase: 'green1', level: 1 },
  { text: 'Get the moon.', phase: 'green1', level: 1 },
  { text: 'Put the boat on the water.', phase: 'green1', level: 2 },
  { text: 'Put the bee in the tree.', phase: 'green1', level: 2 },
  { text: 'Put the goat by the road.', phase: 'green1', level: 2 },
  { text: 'Get the rain and the snow.', phase: 'green1', level: 3 },
  { text: 'The goat is in the boat by the road.', phase: 'green1', level: 3 },

  // GREEN 2
  { text: 'Get the cake.', phase: 'green2', level: 1 },
  { text: 'Get the bike.', phase: 'green2', level: 1 },
  { text: 'Get the bone.', phase: 'green2', level: 1 },
  { text: 'Get the cube.', phase: 'green2', level: 1 },
  { text: 'Get the kite.', phase: 'green2', level: 1 },
  { text: 'Get the rose.', phase: 'green2', level: 1 },
  { text: 'Put the cake on the plate.', phase: 'green2', level: 2 },
  { text: 'Put the kite on the line.', phase: 'green2', level: 2 },
  { text: 'Put the cone on the bone.', phase: 'green2', level: 2 },
  { text: 'Put the cube in the tube.', phase: 'green2', level: 2 },
  { text: 'Put the rose in the vase.', phase: 'green2', level: 2 },
  { text: 'Ride the bike to the gate.', phase: 'green2', level: 2 },
  { text: 'Get the cake, hide it in the cave, and ride the bike home.', phase: 'green2', level: 3 },
  { text: 'Get the rope and the bone, and put them in the hole.', phase: 'green2', level: 3 },

  // GREEN 3
  { text: 'Get the car.', phase: 'green3', level: 1 },
  { text: 'Get the fork.', phase: 'green3', level: 1 },
  { text: 'Get the fern.', phase: 'green3', level: 1 },
  { text: 'Get the jar.', phase: 'green3', level: 1 },
  { text: 'Get the cork.', phase: 'green3', level: 1 },
  { text: 'Get the card.', phase: 'green3', level: 1 },
  { text: 'Put the car in the park.', phase: 'green3', level: 2 },
  { text: 'Put the fork on the cord.', phase: 'green3', level: 2 },
  { text: 'Put the jar in the barn.', phase: 'green3', level: 2 },
  { text: 'Put the bird on the fern.', phase: 'green3', level: 2 },
  { text: 'Put the card on the art.', phase: 'green3', level: 2 },
  { text: 'Turn the curl with the fur.', phase: 'green3', level: 2 },
  { text: 'Get the fork and the corn, and put them on the cart.', phase: 'green3', level: 3 },
  { text: 'Get the car, park it by the barn, and sort the cards.', phase: 'green3', level: 3 },
];

export interface CommandSentenceTemplate {
  pattern: string;
  phase: string;
  requiredWords: string[];
}

export const COMMAND_SENTENCE_TEMPLATES: CommandSentenceTemplate[] = [
  { pattern: 'Get the {word}.', phase: 'pink2', requiredWords: [] },
  { pattern: 'Put the {word} on the table.', phase: 'pink2', requiredWords: [] },
  { pattern: 'Put the {word} in the box.', phase: 'pink2', requiredWords: [] },
  { pattern: 'The {word} is big.', phase: 'pink2', requiredWords: [] },
  { pattern: 'The {word} is in the box.', phase: 'blue1', requiredWords: [] },
  { pattern: 'Get the {word} and put it on the shelf.', phase: 'blue2', requiredWords: [] },
  { pattern: 'The {word} is on the table.', phase: 'green1', requiredWords: [] },
  { pattern: 'The {word} is nice.', phase: 'green2', requiredWords: [] },
  { pattern: 'I like the {word}.', phase: 'green2', requiredWords: [] },
  { pattern: 'Can you see the {word}?', phase: 'green2', requiredWords: [] },
  { pattern: 'The {word} is mine.', phase: 'green2', requiredWords: [] },
  { pattern: 'The {word} is far.', phase: 'green3', requiredWords: [] },
  { pattern: 'I see a {word}.', phase: 'green3', requiredWords: [] },
  { pattern: 'The {word} is dark.', phase: 'green3', requiredWords: [] },
  { pattern: 'Get the {word} for me.', phase: 'green3', requiredWords: [] },
];

// =====================================================================
// SHORT STORIES
// =====================================================================

export interface StoryPage {
  text: string;
  sceneEmoji: string;
  sceneDescription: string;
}

export interface PhonicsStory {
  id: string;
  title: string;
  phase: string;
  words: string[];
  sightWords: string[];
  pages: StoryPage[];
}

export const PHONICS_STORIES: PhonicsStory[] = [
  {
    id: 'cat-on-mat',
    title: 'The Cat on the Mat',
    phase: 'pink1',
    words: ['cat', 'mat', 'can', 'net'],
    sightWords: ['the', 'is', 'on', 'a'],
    pages: [
      { text: 'The cat is on the mat.', sceneEmoji: '🐱', sceneDescription: 'Cat sitting on a mat' },
      { text: 'The cat can sit.', sceneEmoji: '🪑', sceneDescription: 'Cat in sitting position' },
      { text: 'The net is on the mat.', sceneEmoji: '🥅', sceneDescription: 'Net on a mat' },
      { text: 'The cat is in the net.', sceneEmoji: '🐱', sceneDescription: 'Cat in a net' },
    ],
  },
  {
    id: 'big-red-bus',
    title: 'The Big Red Bus',
    phase: 'pink1',
    words: ['bus', 'red', 'dog', 'cat'],
    sightWords: ['the', 'is', 'in', 'a'],
    pages: [
      { text: 'The bus is big and red.', sceneEmoji: '🚌', sceneDescription: 'Large red bus' },
      { text: 'The cat is in the bus.', sceneEmoji: '🐱', sceneDescription: 'Cat on the bus' },
      { text: 'The dog is in the bus.', sceneEmoji: '🐕', sceneDescription: 'Dog on the bus' },
      { text: 'The bus is full.', sceneEmoji: '🚌', sceneDescription: 'Crowded bus' },
    ],
  },
  {
    id: 'dog-and-fog',
    title: 'The Dog and the Fog',
    phase: 'pink1',
    words: ['dog', 'fog', 'log', 'jog'],
    sightWords: ['the', 'and', 'in'],
    pages: [
      { text: 'The dog is in the fog.', sceneEmoji: '🌫️', sceneDescription: 'Foggy weather with dog' },
      { text: 'The dog can jog.', sceneEmoji: '🐕', sceneDescription: 'Running dog' },
      { text: 'The dog sits on the log.', sceneEmoji: '🪵', sceneDescription: 'Dog on a log' },
      { text: 'The fog is thick.', sceneEmoji: '🌫️', sceneDescription: 'Thick fog' },
    ],
  },
  {
    id: 'hen-and-pen',
    title: 'The Hen and the Pen',
    phase: 'pink2',
    words: ['hen', 'pen', 'den', 'ten'],
    sightWords: ['the', 'in', 'is', 'a'],
    pages: [
      { text: 'The hen is in the pen.', sceneEmoji: '🐔', sceneDescription: 'Hen in a pen' },
      { text: 'The hen has ten eggs.', sceneEmoji: '🥚', sceneDescription: 'Hen with eggs' },
      { text: 'The den is big.', sceneEmoji: '🏠', sceneDescription: 'Animal den' },
      { text: 'The hen sits in the den.', sceneEmoji: '🐔', sceneDescription: 'Hen in den' },
    ],
  },
  {
    id: 'pig-and-wig',
    title: 'The Pig and the Wig',
    phase: 'pink2',
    words: ['pig', 'wig', 'big', 'dig'],
    sightWords: ['the', 'has', 'a'],
    pages: [
      { text: 'The pig has a big wig.', sceneEmoji: '🐷', sceneDescription: 'Pig wearing a wig' },
      { text: 'The pig can dig.', sceneEmoji: '⛏️', sceneDescription: 'Pig digging' },
      { text: 'The wig is big.', sceneEmoji: '💇', sceneDescription: 'Large wig' },
      { text: 'The pig is happy.', sceneEmoji: '😊', sceneDescription: 'Happy pig' },
    ],
  },
  {
    id: 'fox-in-box',
    title: 'The Fox in the Box',
    phase: 'pink2',
    words: ['fox', 'box', 'hot', 'dot'],
    sightWords: ['the', 'in', 'is'],
    pages: [
      { text: 'The fox is in the box.', sceneEmoji: '🦊', sceneDescription: 'Fox in a box' },
      { text: 'The box is hot.', sceneEmoji: '🔥', sceneDescription: 'Hot box with steam' },
      { text: 'The fox has a dot.', sceneEmoji: '🟡', sceneDescription: 'Fox with a dot' },
      { text: 'The box is open.', sceneEmoji: '📦', sceneDescription: 'Open box' },
    ],
  },
  {
    id: 'ship-and-fish',
    title: 'The Ship and the Fish',
    phase: 'blue1',
    words: ['ship', 'fish', 'dish', 'shell'],
    sightWords: ['the', 'and', 'in', 'is'],
    pages: [
      { text: 'The ship is on the water.', sceneEmoji: '🚢', sceneDescription: 'Ship at sea' },
      { text: 'The fish is in the water.', sceneEmoji: '🐟', sceneDescription: 'Fish swimming' },
      { text: 'The shell is in the dish.', sceneEmoji: '🐚', sceneDescription: 'Shell in a dish' },
      { text: 'The fish and the shell.', sceneEmoji: '🐟', sceneDescription: 'Fish and shell together' },
    ],
  },
  {
    id: 'goat-in-boat',
    title: 'The Goat in the Boat',
    phase: 'green1',
    words: ['goat', 'boat', 'coat', 'road'],
    sightWords: ['the', 'in', 'and', 'is'],
    pages: [
      { text: 'The goat is in the boat.', sceneEmoji: '🐐', sceneDescription: 'Goat in a boat' },
      { text: 'The goat has a coat.', sceneEmoji: '🧥', sceneDescription: 'Goat wearing a coat' },
      { text: 'The boat is on the road.', sceneEmoji: '🛣️', sceneDescription: 'Boat on road' },
      { text: 'The goat and the boat.', sceneEmoji: '⛵', sceneDescription: 'Goat and boat' },
    ],
  },
  {
    id: 'bike-ride',
    title: 'The Bike Ride',
    phase: 'green2',
    words: ['bike', 'ride', 'lake', 'gate', 'pine', 'line', 'home', 'wave'],
    sightWords: ['the', 'a', 'to', 'and', 'is', 'my', 'I'],
    pages: [
      { text: 'I ride my bike to the gate.', sceneEmoji: '🚲', sceneDescription: 'Child riding bike to gate' },
      { text: 'I ride and ride to the lake.', sceneEmoji: '🌊', sceneDescription: 'Bike ride to lake' },
      { text: 'The pine trees wave in the line.', sceneEmoji: '🌲', sceneDescription: 'Pine trees by the lake' },
      { text: 'I ride my bike home.', sceneEmoji: '🏠', sceneDescription: 'Riding home' },
    ],
  },
  {
    id: 'the-farm',
    title: 'The Farm',
    phase: 'green3',
    words: ['car', 'farm', 'barn', 'corn', 'fork', 'bird', 'park', 'dark'],
    sightWords: ['the', 'a', 'is', 'in', 'we', 'and', 'it'],
    pages: [
      { text: 'We park the car at the farm.', sceneEmoji: '🚗', sceneDescription: 'Car at a farm' },
      { text: 'The barn is big and dark.', sceneEmoji: '🐮', sceneDescription: 'Big dark barn' },
      { text: 'A bird sits on the corn.', sceneEmoji: '🐦', sceneDescription: 'Bird on corn stalk' },
      { text: 'We eat corn with a fork.', sceneEmoji: '🍽️', sceneDescription: 'Eating corn with fork' },
    ],
  },
  {
    id: 'frog-and-drum',
    title: 'The Frog and the Drum',
    phase: 'blue2',
    words: ['frog', 'drum', 'clock', 'drop', 'flag', 'plum', 'swim', 'brick'],
    sightWords: ['the', 'a', 'on', 'is', 'and', 'it'],
    pages: [
      { text: 'A frog sits on a brick.', sceneEmoji: '🐸', sceneDescription: 'Frog on a brick' },
      { text: 'The clock ticks and ticks.', sceneEmoji: '🕐', sceneDescription: 'Clock ticking' },
      { text: 'The frog drops the plum.', sceneEmoji: '🫐', sceneDescription: 'Frog dropping a plum' },
      { text: 'The frog swims and swims.', sceneEmoji: '🏊', sceneDescription: 'Frog swimming' },
    ],
  },
  {
    id: 'camp-in-sand',
    title: 'The Camp in the Sand',
    phase: 'blue3',
    words: ['camp', 'sand', 'lamp', 'hand', 'nest', 'belt', 'ring', 'wind'],
    sightWords: ['the', 'a', 'in', 'is', 'and', 'we'],
    pages: [
      { text: 'We camp in the sand.', sceneEmoji: '⛺', sceneDescription: 'Camping on sand' },
      { text: 'The lamp is in the camp.', sceneEmoji: '🪔', sceneDescription: 'Lamp in a camp' },
      { text: 'A nest is in the sand.', sceneEmoji: '🪺', sceneDescription: 'Nest in sand' },
      { text: 'The wind blows the sand.', sceneEmoji: '💨', sceneDescription: 'Wind blowing sand' },
    ],
  },
];

// =====================================================================
// HELPER FUNCTIONS — used by generators
// =====================================================================

/** Alias for generators that import SHORT_STORIES */
export const SHORT_STORIES = PHONICS_STORIES;

/** Alias for generators that import PHONICS_COMMANDS */
export const PHONICS_COMMANDS = COMMAND_SENTENCES;

/** Alias for generators that import SENTENCE_TEMPLATES */
export const SENTENCE_TEMPLATES = COMMAND_SENTENCE_TEMPLATES;

/** Type alias for generators that import SentenceTemplate */
export type SentenceTemplate = CommandSentenceTemplate;

/** Type alias for generators that import ShortStory */
export type ShortStory = PhonicsStory;

/** Get all words from a phase as a flat array */
export function getPhaseWords(phaseId: string): PhonicsWord[] {
  const phase = ALL_PHASES.find(p => p.id === phaseId);
  if (!phase) return [];
  return phase.groups.flatMap(g => g.words);
}

/** Get command sentences filtered by phase ID, enriched with phonicsWords for highlighting */
export function getCommands(phaseId: string): (CommandSentence & { phonicsWords: string[] })[] {
  const phase = ALL_PHASES.find(p => p.id === phaseId);
  if (!phase) return [];
  const wordSet = new Set(phase.groups.flatMap(g => g.words.map(w => w.word.toLowerCase())));
  return COMMAND_SENTENCES
    .filter(c => c.phase === phaseId)
    .map(c => ({
      ...c,
      phonicsWords: c.text
        .split(/\b/)
        .map(w => w.trim())
        .filter(w => w.length > 0 && wordSet.has(w.toLowerCase())),
    }));
}

/** Get all unique words sorted alphabetically for dictionary view */
export function getDictionaryWords(): (PhonicsWord & { phase: string })[] {
  const allWords: (PhonicsWord & { phase: string })[] = [];
  const seen = new Set<string>();
  for (const phase of ALL_PHASES) {
    for (const group of phase.groups) {
      for (const word of group.words) {
        if (!seen.has(word.word)) {
          allWords.push({ ...word, phase: phase.id });
          seen.add(word.word);
        }
      }
    }
  }
  return allWords.sort((a, b) => a.word.localeCompare(b.word));
}
