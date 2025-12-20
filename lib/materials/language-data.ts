// lib/materials/language-data.ts
// Complete Montessori Language curriculum data - ENGLISH ONLY

// ============================================
// ALPHABET - Following Montessori letter order
// ============================================

export const MONTESSORI_LETTER_ORDER = [
  // Group 1: Vowels (taught first)
  { letter: 'a', sound: '/æ/', example: 'apple', isVowel: true },
  { letter: 'i', sound: '/ɪ/', example: 'igloo', isVowel: true },
  { letter: 'o', sound: '/ɒ/', example: 'octopus', isVowel: true },
  { letter: 'e', sound: '/ɛ/', example: 'elephant', isVowel: true },
  { letter: 'u', sound: '/ʌ/', example: 'umbrella', isVowel: true },
  
  // Group 2: Common consonants
  { letter: 's', sound: '/s/', example: 'sun', isVowel: false },
  { letter: 'm', sound: '/m/', example: 'moon', isVowel: false },
  { letter: 't', sound: '/t/', example: 'table', isVowel: false },
  { letter: 'p', sound: '/p/', example: 'pen', isVowel: false },
  { letter: 'n', sound: '/n/', example: 'nest', isVowel: false },
  
  // Group 3: More consonants
  { letter: 'c', sound: '/k/', example: 'cat', isVowel: false },
  { letter: 'r', sound: '/r/', example: 'rabbit', isVowel: false },
  { letter: 'd', sound: '/d/', example: 'dog', isVowel: false },
  { letter: 'g', sound: '/g/', example: 'goat', isVowel: false },
  { letter: 'b', sound: '/b/', example: 'ball', isVowel: false },
  
  // Group 4: Remaining consonants
  { letter: 'h', sound: '/h/', example: 'hat', isVowel: false },
  { letter: 'l', sound: '/l/', example: 'lion', isVowel: false },
  { letter: 'f', sound: '/f/', example: 'fish', isVowel: false },
  { letter: 'j', sound: '/dʒ/', example: 'jar', isVowel: false },
  { letter: 'k', sound: '/k/', example: 'kite', isVowel: false },
  
  // Group 5: Less common consonants
  { letter: 'w', sound: '/w/', example: 'water', isVowel: false },
  { letter: 'v', sound: '/v/', example: 'van', isVowel: false },
  { letter: 'y', sound: '/j/', example: 'yellow', isVowel: false },
  { letter: 'z', sound: '/z/', example: 'zebra', isVowel: false },
  { letter: 'x', sound: '/ks/', example: 'box', isVowel: false },
  { letter: 'q', sound: '/kw/', example: 'queen', isVowel: false },
];

// ============================================
// PINK SERIES - CVC Words (3 letters)
// ============================================

export const PINK_SERIES = {
  'short-a': [
    'cat', 'hat', 'bat', 'rat', 'mat', 'sat', 'pat', 'fat',
    'can', 'man', 'pan', 'fan', 'ran', 'tan', 'van',
    'bag', 'tag', 'wag', 'rag',
    'nap', 'map', 'tap', 'cap', 'lap', 'gap',
    'dad', 'sad', 'bad', 'mad', 'had',
    'jam', 'ham', 'ram', 'yam',
  ],
  
  'short-i': [
    'sit', 'hit', 'bit', 'fit', 'kit', 'pit',
    'pig', 'big', 'dig', 'fig', 'wig', 'jig',
    'pin', 'bin', 'tin', 'win', 'fin',
    'sip', 'tip', 'rip', 'dip', 'hip', 'zip', 'lip',
    'kid', 'lid', 'did', 'hid', 'rid',
    'mix', 'six', 'fix',
  ],
  
  'short-o': [
    'dog', 'log', 'fog', 'hog', 'jog', 'cog',
    'pot', 'hot', 'dot', 'got', 'not', 'lot', 'rot', 'cot',
    'top', 'hop', 'mop', 'pop', 'cop',
    'box', 'fox',
    'mom', 'job', 'rob', 'sob', 'cob',
    'nod', 'rod', 'cod',
  ],
  
  'short-e': [
    'bed', 'red', 'led', 'fed', 'wed',
    'pet', 'wet', 'set', 'get', 'let', 'met', 'jet', 'net', 'vet',
    'pen', 'hen', 'ten', 'men', 'den',
    'leg', 'beg', 'peg', 'keg',
    'yes', 'web',
  ],
  
  'short-u': [
    'bug', 'rug', 'mug', 'hug', 'jug', 'dug', 'tug', 'pug',
    'bus', 'cup', 'pup',
    'sun', 'run', 'fun', 'gun', 'bun', 'nun',
    'but', 'cut', 'hut', 'nut', 'gut', 'rut',
    'mud', 'bud', 'cub', 'sub', 'tub', 'rub', 'hub',
    'gum', 'sum', 'hum',
  ],
};

// ============================================
// BLUE SERIES - CCVC/CVCC Words (blends)
// ============================================

export const BLUE_SERIES = {
  // Initial blends
  'bl-blend': ['black', 'block', 'blend', 'blink', 'blob', 'blot'],
  'cl-blend': ['clap', 'clip', 'clock', 'cloth', 'club', 'clam'],
  'fl-blend': ['flag', 'flat', 'flip', 'flop', 'floss', 'frog'],
  'gl-blend': ['glad', 'glass', 'gloss', 'glob', 'glum'],
  'pl-blend': ['plan', 'plum', 'plug', 'plus', 'plot'],
  'sl-blend': ['slam', 'slap', 'sled', 'slip', 'slot', 'slug'],
  'br-blend': ['brag', 'brass', 'brick', 'bring', 'brush', 'brim'],
  'cr-blend': ['crab', 'crib', 'crop', 'cross', 'crush', 'crust'],
  'dr-blend': ['drag', 'drip', 'drop', 'drum', 'dress', 'drink'],
  'gr-blend': ['grab', 'grass', 'grid', 'grin', 'grip', 'grit'],
  'tr-blend': ['trap', 'tree', 'trick', 'trim', 'trip', 'truck'],
  'st-blend': ['stamp', 'stand', 'star', 'step', 'stick', 'stop', 'stuff'],
  'sp-blend': ['spam', 'spin', 'spot', 'spill', 'spell'],
  'sm-blend': ['small', 'smell', 'smile', 'smog', 'smoke'],
  'sn-blend': ['snap', 'snack', 'sniff', 'snip', 'snow'],
  'sw-blend': ['swim', 'swing', 'switch', 'swam', 'swan'],
  
  // Final blends
  'nd-blend': ['hand', 'band', 'sand', 'land', 'bend', 'send', 'wind', 'pond'],
  'nk-blend': ['bank', 'tank', 'sink', 'pink', 'link', 'think', 'drink'],
  'mp-blend': ['camp', 'lamp', 'jump', 'pump', 'bump', 'dump'],
  'nt-blend': ['ant', 'tent', 'mint', 'hunt', 'bent', 'went'],
};

// ============================================
// GREEN SERIES - Phonograms & Long Vowels
// ============================================

export const GREEN_SERIES = {
  // Long A patterns
  'a-e': ['cake', 'make', 'take', 'bake', 'lake', 'wake', 'name', 'game', 'same', 'came', 'gate', 'late', 'date', 'rate', 'face', 'race', 'place', 'space', 'wave', 'save', 'cave', 'gave'],
  'ai': ['rain', 'train', 'brain', 'main', 'pain', 'tail', 'mail', 'nail', 'sail', 'pail', 'wait', 'paid', 'maid', 'braid'],
  'ay': ['day', 'say', 'may', 'way', 'pay', 'play', 'stay', 'gray', 'tray', 'pray', 'spray', 'today'],
  
  // Long I patterns
  'i-e': ['like', 'bike', 'hike', 'time', 'lime', 'dime', 'line', 'mine', 'fine', 'nine', 'pine', 'vine', 'wine', 'hide', 'ride', 'side', 'wide', 'fire', 'tire', 'wire', 'five', 'hive', 'dive', 'drive'],
  'igh': ['high', 'night', 'light', 'right', 'fight', 'might', 'sight', 'tight', 'flight', 'bright', 'fright'],
  'y-as-i': ['my', 'by', 'fly', 'try', 'cry', 'dry', 'sky', 'shy', 'why'],
  
  // Long O patterns
  'o-e': ['home', 'bone', 'cone', 'tone', 'zone', 'hope', 'rope', 'note', 'vote', 'rose', 'nose', 'hose', 'close', 'those', 'stove', 'drove', 'woke', 'joke', 'poke', 'smoke', 'broke'],
  'oa': ['boat', 'coat', 'goat', 'road', 'toad', 'load', 'soap', 'toast', 'coast', 'float'],
  'ow-long': ['low', 'bow', 'row', 'show', 'know', 'grow', 'flow', 'glow', 'snow', 'slow', 'blow', 'throw', 'yellow', 'window'],
  
  // Long U/OO patterns
  'u-e': ['tube', 'cube', 'cute', 'mute', 'huge', 'rule', 'tune', 'June', 'use', 'fuse'],
  'oo-long': ['moon', 'soon', 'noon', 'spoon', 'room', 'broom', 'bloom', 'food', 'mood', 'cool', 'pool', 'tool', 'school', 'tooth', 'roof', 'boot', 'root', 'zoo'],
  'oo-short': ['book', 'look', 'cook', 'hook', 'took', 'good', 'wood', 'stood', 'foot'],
  'ew': ['new', 'few', 'dew', 'flew', 'grew', 'knew', 'blew', 'chew', 'stew'],
  
  // Long E patterns
  'ee': ['see', 'bee', 'tree', 'free', 'three', 'feet', 'meet', 'keep', 'deep', 'sleep', 'green', 'queen', 'sweet', 'teeth', 'wheel', 'speed', 'need', 'seed', 'feed', 'week'],
  'ea': ['eat', 'sea', 'tea', 'pea', 'read', 'bead', 'lead', 'meat', 'heat', 'seat', 'beat', 'leaf', 'team', 'beam', 'dream', 'cream', 'clean', 'beach', 'teach', 'reach', 'peach', 'each'],
  
  // Digraphs
  'ch': ['chin', 'chop', 'chip', 'chat', 'check', 'chest', 'child', 'chair', 'cheese', 'lunch', 'much', 'such', 'rich', 'which', 'beach', 'reach', 'teach'],
  'sh': ['ship', 'shop', 'shut', 'shed', 'shell', 'shelf', 'shark', 'share', 'shape', 'shine', 'shirt', 'shoe', 'fish', 'dish', 'wish', 'wash', 'push', 'brush', 'crash', 'flash'],
  'th': ['this', 'that', 'them', 'then', 'they', 'think', 'thing', 'thick', 'thin', 'thank', 'three', 'throw', 'bath', 'path', 'math', 'with', 'tooth', 'month'],
  'wh': ['what', 'when', 'where', 'which', 'white', 'while', 'wheel', 'whale', 'whip', 'whisper'],
  'ck': ['back', 'pack', 'black', 'track', 'snack', 'stack', 'neck', 'deck', 'check', 'kick', 'sick', 'pick', 'stick', 'trick', 'quick', 'clock', 'block', 'rock', 'sock', 'lock', 'duck', 'truck', 'luck', 'stuck'],
};

// ============================================
// SIGHT WORDS - Dolch List
// ============================================

export const SIGHT_WORDS = {
  'pre-primer': [
    'a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for',
    'funny', 'go', 'help', 'here', 'I', 'in', 'is', 'it', 'jump', 'little',
    'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said',
    'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you',
  ],
  'primer': [
    'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came',
    'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like',
    'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran',
    'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this',
    'too', 'under', 'want', 'was', 'well', 'went', 'what', 'white', 'who', 'will', 'with', 'yes',
  ],
  'first-grade': [
    'after', 'again', 'an', 'any', 'ask', 'as', 'by', 'could', 'every', 'fly',
    'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
    'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
    'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk', 'were', 'when',
  ],
};

// ============================================
// SENTENCES
// ============================================

export const SENTENCES = {
  'pink-level': [
    'The cat sat.',
    'A fat rat ran.',
    'The dog is big.',
    'I see the sun.',
    'The pig is in mud.',
    'The red hen sat.',
    'I can run and hop.',
    'The bug is on a rug.',
    'A man has a hat.',
    'The pan is hot.',
  ],
  'blue-level': [
    'The frog can jump.',
    'I drink from a cup.',
    'The clock tells time.',
    'We play in the sand.',
    'The truck is black.',
    'I see a pretty flower.',
    'The frog jumps on a log.',
    'The lamp is in the tent.',
    'I smell the fresh grass.',
    'The drum is loud.',
  ],
  'green-level': [
    'I like to play games.',
    'The boat floats on the lake.',
    'We read books at school.',
    'The moon shines at night.',
    'I eat sweet peaches.',
    'The green tree is tall.',
    'My coat keeps me warm.',
    'The train goes fast.',
    'I dream about flying.',
    'The beach has white sand.',
  ],
};

