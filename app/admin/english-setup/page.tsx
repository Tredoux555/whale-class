'use client';

import { useState } from 'react';
import Link from 'next/link';

// ============================================
// BRAIN DATA - Audited from /api/brain/works
// 37 Language Works mapped to shelf positions
// ============================================

const BRAIN_DATA = {
  // SHELF 1: PRE-READING
  soundGames: {
    name: 'Sound Games',
    age: '2.5-4 years',
    directAims: ['Isolate beginning sounds', 'Phonemic awareness', 'Listening skills'],
    indirectAims: ['Sandpaper Letter preparation', 'Reading foundation'],
    materials: ['Objects with distinct beginning sounds'],
    description: 'Sound Games (like "I Spy with my little eye something beginning with /m/") develop the ability to isolate sounds in words - a prerequisite for connecting sounds to letters.',
    readiness: ['Speaks clearly', 'Can listen attentively', 'Vocabulary developing'],
  },
  iSpyBeginning: {
    name: 'I Spy - Beginning Sounds',
    age: '3-4.5 years',
    directAims: ['Isolate beginning sounds', 'Phonemic awareness'],
    materials: ['Objects with distinct beginning sounds'],
    description: 'Child learns to hear the first sound in words.',
    // Supplemental word lists (not in brain, but essential for setup)
    sounds: ['m', 's', 'a', 't', 'c', 'r', 'i', 'p', 'n', 'o', 'b', 'f', 'g', 'h', 'j', 'e', 'd', 'u', 'l', 'w', 'k', 'v', 'x', 'q', 'y', 'z'],
  },
  iSpyEnding: {
    name: 'I Spy - Ending Sounds',
    age: '3-4.5 years',
    directAims: ['Isolate ending sounds', 'Complete word awareness'],
    indirectAims: ['Spelling preparation', 'Sound discrimination'],
    materials: ['Objects'],
    description: 'Child learns to hear the last sound in words.',
    readiness: ['Beginning sounds solid'],
  },
  iSpyMiddle: {
    name: 'I Spy - Middle Sounds',
    age: '3.5-5 years',
    directAims: ['Isolate middle sounds', 'Full phonemic analysis'],
    indirectAims: ['Complete decoding preparation', 'Vowel awareness'],
    materials: ['Objects'],
    description: 'Child learns to identify vowel sounds in the middle of words.',
    readiness: ['Ending sounds success'],
  },
  sandpaperLetters: {
    name: 'Sandpaper Letters',
    age: '3-5 years',
    directAims: ['Letter-sound association', 'Letter formation', 'Tactile learning'],
    indirectAims: ['Writing preparation', 'Reading foundation', 'Multi-sensory learning'],
    materials: ['Sandpaper Letters (lowercase on colored boards)'],
    description: 'Sandpaper Letters engage three senses: children see the letter, feel its shape, and say its sound. This multi-sensory approach creates strong memory pathways.',
    readiness: ['Sound Games mastered', 'Metal Insets started', 'Fine motor developing'],
  },
  metalInsets: {
    name: 'Metal Insets',
    age: '3-6 years',
    directAims: ['Hand control', 'Pencil grip'],
    indirectAims: ['Handwriting preparation', 'Design creativity'],
    materials: ['Metal insets (10 shapes)', 'Colored pencils', 'Paper'],
    description: 'Child develops hand control through tracing designs. The 10 shapes are: circle, square, triangle, rectangle, oval, ellipse, quatrefoil, curvilinear triangle, pentagon, trapezoid.',
    readiness: ['Can hold pencil', 'Can trace'],
  },
  
  // SHELF 2: ENCODING
  moveableAlphabet: {
    name: 'Moveable Alphabet',
    age: '3.5-6 years',
    directAims: ['Word building', 'Encoding (spelling)', 'Composition without handwriting'],
    indirectAims: ['Reading preparation', 'Spelling awareness', 'Creative expression'],
    materials: ['Large Moveable Alphabet (wooden letters in box)'],
    description: 'The Moveable Alphabet allows children to compose words and sentences before mastering handwriting. This separates the cognitive task of encoding from the motor task of writing.',
    readiness: ['Knows several sandpaper letters', 'Can segment sounds', 'Interested in words'],
    colors: { vowels: 'Blue', consonants: 'Red' },
  },
  moveableAlphabetCVC: {
    name: 'Moveable Alphabet - CVC Words',
    age: '3.5-5 years',
    directAims: ['Build simple words', 'Encoding'],
    indirectAims: ['Spelling', 'Reading preparation'],
    materials: ['Moveable alphabet'],
    description: 'Child builds simple three-letter words (cat, bed, pig, hot, cup).',
    readiness: ['Can segment sounds'],
  },
  
  // SHELF 2: Object Boxes (Pink Series prep)
  pinkObjectBox: {
    name: 'Pink Series - Objects',
    age: '4-5 years',
    directAims: ['Decode CVC words', 'Connect written words to objects'],
    indirectAims: ['Reading fluency', 'Spelling patterns'],
    materials: ['Pink Series object box with CVC word cards'],
    description: 'Pink Series words are CVC (consonant-vowel-consonant) words with short vowels: cat, bed, lip, hot, bus. Matching words to objects confirms comprehension.',
    readiness: ['Can build CVC words with Moveable Alphabet', 'Knows all letter sounds', 'Interest in reading'],
    wordsByVowel: {
      'Short A': ['cat', 'bat', 'hat', 'mat', 'sat', 'rat', 'can', 'pan', 'man', 'fan', 'cap', 'map', 'tap', 'bag', 'tag'],
      'Short E': ['bed', 'red', 'pen', 'hen', 'ten', 'net', 'wet', 'pet', 'jet', 'leg', 'peg', 'web'],
      'Short I': ['pig', 'big', 'dig', 'wig', 'pin', 'bin', 'fin', 'win', 'sit', 'hit', 'lip', 'tip', 'zip'],
      'Short O': ['dog', 'log', 'fog', 'pot', 'hot', 'cot', 'mop', 'top', 'hop', 'box', 'fox', 'job'],
      'Short U': ['cup', 'pup', 'bus', 'nut', 'hut', 'cut', 'bug', 'rug', 'hug', 'mug', 'sun', 'run', 'fun'],
    },
  },
  
  // SHELF 3: DECODING - Pink Series
  pinkPictureMatch: {
    name: 'Pink Series - Picture Word Match',
    age: '4-5 years',
    directAims: ['Read without objects', 'Visual decoding'],
    indirectAims: ['Reading independence', 'Comprehension'],
    materials: ['Pink series picture cards', 'Word cards'],
    description: 'Child reads words and matches them to pictures.',
    readiness: ['Object match success'],
  },
  pinkLists: {
    name: 'Pink Series - Lists',
    age: '4-5 years',
    directAims: ['Read word lists', 'Fluency building'],
    indirectAims: ['Reading speed', 'Confidence'],
    materials: ['Pink series word lists'],
    description: 'Child reads lists of CVC words organized by word family.',
    readiness: ['Picture match solid'],
    wordLists: {
      '-at family': ['cat', 'bat', 'hat', 'mat', 'sat', 'rat', 'fat', 'pat', 'vat'],
      '-an family': ['can', 'pan', 'man', 'fan', 'ran', 'tan', 'van', 'ban', 'dan'],
      '-ap family': ['cap', 'map', 'tap', 'nap', 'gap', 'lap', 'rap', 'sap', 'zap'],
      '-ag family': ['bag', 'tag', 'rag', 'wag', 'sag', 'lag', 'nag', 'gag'],
      '-ad family': ['bad', 'dad', 'had', 'mad', 'sad', 'lad', 'pad'],
      '-am family': ['ham', 'jam', 'ram', 'yam', 'dam', 'Sam'],
      '-ed family': ['bed', 'red', 'fed', 'led', 'wed', 'Ted'],
      '-en family': ['pen', 'hen', 'ten', 'men', 'den', 'Ben', 'Ken'],
      '-et family': ['pet', 'net', 'wet', 'jet', 'set', 'get', 'let', 'met', 'bet', 'vet'],
      '-eg family': ['leg', 'peg', 'beg', 'keg'],
      '-ig family': ['pig', 'big', 'dig', 'wig', 'jig', 'fig', 'rig'],
      '-in family': ['pin', 'bin', 'fin', 'win', 'tin', 'sin', 'kin', 'din'],
      '-it family': ['sit', 'hit', 'bit', 'fit', 'kit', 'pit', 'lit', 'wit'],
      '-ip family': ['lip', 'tip', 'zip', 'hip', 'dip', 'sip', 'rip', 'nip'],
      '-og family': ['dog', 'log', 'fog', 'hog', 'jog', 'bog', 'cog'],
      '-ot family': ['pot', 'hot', 'cot', 'dot', 'lot', 'got', 'not', 'rot'],
      '-op family': ['mop', 'top', 'hop', 'pop', 'cop', 'bop', 'sop'],
      '-ob family': ['job', 'rob', 'sob', 'mob', 'cob', 'Bob'],
      '-ug family': ['cup', 'pup', 'bug', 'rug', 'hug', 'mug', 'jug', 'tug', 'dug'],
      '-un family': ['sun', 'run', 'fun', 'bun', 'gun', 'nun', 'pun'],
      '-ut family': ['nut', 'hut', 'cut', 'but', 'gut', 'jut', 'rut'],
      '-ud family': ['bud', 'mud', 'dud', 'cud'],
    },
  },
  pinkPhrases: {
    name: 'Pink Series - Phrases',
    age: '4-5 years',
    directAims: ['Read simple phrases', 'Comprehension'],
    indirectAims: ['Sentence preparation', 'Meaning'],
    materials: ['Pink series phrase cards'],
    description: 'Child reads short phrases (2-3 words) using only CVC words.',
    readiness: ['List reading success'],
    phrases: [
      'a fat cat', 'a red bed', 'a big pig', 'a hot pot', 'a fun run',
      'the sad man', 'the wet pet', 'the tan van', 'the top mop', 'the mud hut',
      'a bad dog', 'a bit hot', 'a fat hen', 'a red fox', 'a big bus',
      'on the mat', 'in the bag', 'at the top', 'up the hill', 'to the hut',
      'sit on it', 'run to him', 'get the cup', 'pet the dog', 'hug the pup',
    ],
  },
  pinkSentences: {
    name: 'Pink Series - Sentences',
    age: '4.5-5.5 years',
    directAims: ['Read full sentences', 'Complete thoughts'],
    indirectAims: ['Reading comprehension', 'Book preparation'],
    materials: ['Pink series sentence cards'],
    description: 'Child reads complete sentences using only CVC words and sight words (the, a, is, on, in).',
    readiness: ['Phrase reading solid'],
    sentences: [
      'The cat sat on the mat.',
      'The dog ran in the fog.',
      'The pig is big and fat.',
      'The sun is hot.',
      'A rat hid in the box.',
      'The man had a red hat.',
      'The cup is on the rug.',
      'The hen can peck.',
      'The fox hid in the den.',
      'The pup dug in the mud.',
      'I can sit on the log.',
      'He got a big hug.',
      'She ran to the bus.',
      'The pot is hot, do not tap it.',
      'The cat and dog sat in the sun.',
    ],
  },
  pinkBooks: {
    name: 'Pink Series - Books',
    age: '4.5-5.5 years',
    directAims: ['Read simple books', 'Reading enjoyment'],
    indirectAims: ['Love of reading', 'Independence'],
    materials: ['Pink series readers'],
    description: 'Child reads their first simple books independently.',
    readiness: ['Sentence success'],
  },
  
  // SHELF 3: DECODING - Blue Series
  blueBlends: {
    name: 'Blue Series - Blends',
    age: '4.5-6 years',
    directAims: ['Decode consonant blends', 'Read 4-6 letter words'],
    indirectAims: ['Reading fluency', 'Phonics patterns'],
    materials: ['Blue Series materials with blend words'],
    description: 'Blue Series introduces consonant blends while maintaining short vowel sounds.',
    readiness: ['Pink Series mastered', 'Can read CVC words fluently'],
    blendLists: {
      'bl- words': ['black', 'blank', 'blast', 'bled', 'blend', 'bless', 'blip', 'blob', 'block', 'blot', 'bluff'],
      'cl- words': ['clad', 'clam', 'clamp', 'clan', 'clap', 'clash', 'clasp', 'class', 'click', 'cliff', 'clip', 'clock', 'cloth', 'club', 'clump'],
      'fl- words': ['flag', 'flam', 'flap', 'flash', 'flask', 'flat', 'fled', 'flesh', 'flex', 'flick', 'flip', 'flit', 'flock', 'flop', 'floss', 'fluff'],
      'gl- words': ['glad', 'glam', 'glass', 'glen', 'glob', 'gloss', 'glum'],
      'pl- words': ['plan', 'plank', 'plant', 'plat', 'pled', 'plod', 'plop', 'plot', 'pluck', 'plug', 'plum', 'plump', 'plus'],
      'sl- words': ['slab', 'slack', 'slam', 'slant', 'slap', 'slash', 'slat', 'sled', 'slept', 'slick', 'slid', 'slim', 'slit', 'slob', 'slop', 'slot', 'slug', 'slum', 'slump'],
      'br- words': ['brag', 'bran', 'brand', 'brass', 'brat', 'bred', 'brick', 'brim', 'brisk', 'brit', 'brunt', 'brush'],
      'cr- words': ['crab', 'crack', 'craft', 'cram', 'cramp', 'crest', 'crib', 'crisp', 'crop', 'cross', 'crush', 'crust'],
      'dr- words': ['drab', 'draft', 'drag', 'drank', 'dress', 'drift', 'drill', 'drink', 'drip', 'drop', 'drug', 'drum', 'drunk'],
      'fr- words': ['frog', 'from', 'frost', 'fresh', 'frill', 'fret'],
      'gr- words': ['grab', 'gram', 'grand', 'grant', 'grass', 'grid', 'grill', 'grim', 'grin', 'grip', 'grit', 'grub', 'grump'],
      'pr- words': ['pram', 'prank', 'press', 'prick', 'prim', 'print', 'prod', 'prom', 'prompt', 'prop'],
      'tr- words': ['track', 'tract', 'trap', 'trash', 'trek', 'trend', 'trick', 'trim', 'trip', 'trod', 'trot', 'truck', 'trump', 'trunk', 'trust'],
      'sc- words': ['scab', 'scald', 'scalp', 'scamp', 'scan', 'scant', 'scat', 'scoff', 'scold', 'scout', 'scuff'],
      'sk- words': ['skeleton', 'sketch', 'skid', 'skill', 'skim', 'skin', 'skip', 'skit', 'skull', 'skunk'],
      'sm- words': ['smack', 'small', 'smart', 'smash', 'smell', 'smelt', 'smock', 'smog', 'snack'],
      'sn- words': ['snack', 'snag', 'snap', 'snare', 'sneak', 'sniff', 'snip', 'snob', 'snot', 'snub', 'snug'],
      'sp- words': ['span', 'spar', 'spat', 'spec', 'sped', 'spell', 'spend', 'spent', 'spill', 'spin', 'spit', 'spot', 'spun'],
      'st- words': ['stack', 'staff', 'stag', 'stamp', 'stand', 'stem', 'step', 'stick', 'stiff', 'still', 'stock', 'stomp', 'stop', 'stuck', 'stuff', 'stump', 'stun', 'stung', 'stunk'],
      'sw- words': ['swam', 'swan', 'swap', 'swat', 'swell', 'swept', 'swift', 'swim', 'swing', 'swish', 'swum', 'swung'],
      '-nd words': ['and', 'band', 'hand', 'land', 'sand', 'brand', 'stand', 'bend', 'blend', 'end', 'lend', 'mend', 'send', 'spend', 'tend', 'trend', 'wind', 'bind', 'find', 'kind', 'mind', 'bond', 'fond', 'pond', 'fund'],
      '-nk words': ['bank', 'blank', 'clank', 'crank', 'drank', 'frank', 'plank', 'prank', 'rank', 'sank', 'shrank', 'spank', 'stank', 'tank', 'thank', 'yank', 'blink', 'brink', 'drink', 'ink', 'link', 'mink', 'pink', 'rink', 'shrink', 'sink', 'stink', 'think', 'wink', 'chunk', 'drunk', 'dunk', 'flunk', 'hunk', 'junk', 'plunk', 'shrunk', 'skunk', 'slunk', 'spunk', 'stunk', 'sunk', 'trunk'],
      '-mp words': ['camp', 'champ', 'clamp', 'cramp', 'damp', 'lamp', 'ramp', 'scamp', 'stamp', 'tramp', 'vamp', 'bump', 'dump', 'hump', 'jump', 'lump', 'pump', 'slump', 'stump', 'thump', 'trump'],
      '-st words': ['best', 'chest', 'crest', 'fest', 'guest', 'jest', 'nest', 'pest', 'quest', 'rest', 'test', 'vest', 'west', 'zest', 'fist', 'gist', 'list', 'mist', 'twist', 'wrist', 'cost', 'frost', 'lost', 'most', 'post', 'bust', 'crust', 'dust', 'gust', 'just', 'must', 'rust', 'trust'],
    },
  },
  blueDigraphs: {
    name: 'Blue Series - Digraphs',
    age: '5-6 years',
    directAims: ['Decode digraphs', 'sh, ch, th sounds'],
    indirectAims: ['Phonics patterns', 'Reading expansion'],
    materials: ['Blue series digraph materials'],
    description: 'Two letters make ONE sound. Child learns to read these as single sounds.',
    readiness: ['Blend success'],
    digraphLists: {
      'sh words': ['shack', 'shaft', 'shall', 'sham', 'shank', 'shape', 'shed', 'shell', 'shift', 'shin', 'ship', 'shock', 'shop', 'shot', 'shrub', 'shrug', 'shuck', 'shun', 'shut', 'ash', 'bash', 'cash', 'clash', 'crash', 'dash', 'flash', 'gash', 'gnash', 'hash', 'lash', 'mash', 'rash', 'slash', 'smash', 'splash', 'stash', 'thrash', 'trash', 'dish', 'fish', 'swish', 'wish', 'brush', 'blush', 'crush', 'flush', 'gush', 'hush', 'mush', 'plush', 'rush', 'slush'],
      'ch words': ['chap', 'chat', 'check', 'chess', 'chest', 'chick', 'chill', 'chimp', 'chin', 'chip', 'chomp', 'chop', 'chuck', 'chug', 'chum', 'chunk', 'much', 'such', 'rich', 'which', 'bench', 'bunch', 'clench', 'crunch', 'drench', 'french', 'hunch', 'lunch', 'munch', 'punch', 'ranch', 'stench', 'trench', 'wrench'],
      'th words (voiced)': ['than', 'that', 'the', 'them', 'then', 'this', 'thus', 'with', 'bathe', 'clothe', 'soothe'],
      'th words (unvoiced)': ['thatch', 'theft', 'thick', 'thin', 'thing', 'think', 'thirst', 'thong', 'thrash', 'three', 'thresh', 'thrift', 'thrill', 'throat', 'throb', 'throne', 'throng', 'throw', 'thrust', 'thud', 'thug', 'thumb', 'thump', 'bath', 'math', 'path', 'wrath', 'breath', 'death', 'health', 'stealth', 'wealth', 'filth', 'tilth', 'birth', 'fifth', 'growth', 'moth', 'cloth', 'broth', 'froth', 'sloth', 'truth', 'youth', 'both', 'depth', 'length', 'strength', 'width'],
      'wh words': ['whack', 'whale', 'wharf', 'what', 'wheat', 'wheel', 'whelp', 'when', 'where', 'whet', 'which', 'whiff', 'while', 'whim', 'whine', 'whip', 'whir', 'whisk', 'whisper', 'whit', 'white', 'whiz'],
      'ck words': ['back', 'black', 'clack', 'crack', 'hack', 'jack', 'knack', 'lack', 'pack', 'quack', 'rack', 'sack', 'shack', 'slack', 'smack', 'snack', 'stack', 'tack', 'track', 'whack', 'wrack', 'beck', 'check', 'deck', 'fleck', 'neck', 'peck', 'speck', 'wreck', 'brick', 'chick', 'click', 'flick', 'kick', 'lick', 'nick', 'pick', 'prick', 'quick', 'sick', 'slick', 'stick', 'thick', 'tick', 'trick', 'wick', 'block', 'clock', 'cock', 'dock', 'flock', 'frock', 'knock', 'lock', 'mock', 'rock', 'shock', 'smock', 'sock', 'stock', 'buck', 'chuck', 'cluck', 'duck', 'luck', 'muck', 'pluck', 'puck', 'shuck', 'snuck', 'struck', 'stuck', 'suck', 'truck', 'tuck'],
    },
  },
  blueBooks: {
    name: 'Blue Series - Books',
    age: '5-6 years',
    directAims: ['Read blend/digraph books', 'Fluency'],
    indirectAims: ['Reading confidence', 'Comprehension'],
    materials: ['Blue series readers'],
    description: 'Child reads books containing blends and digraphs.',
    readiness: ['Digraph success'],
  },
  
  // SHELF 3: DECODING - Green Series
  greenPhonograms: {
    name: 'Green Series - Phonograms',
    age: '5-6 years',
    directAims: ['Decode phonograms', 'Read complex words'],
    indirectAims: ['Reading fluency', 'Spelling mastery'],
    materials: ['Green Series materials with phonogram words'],
    description: 'Phonograms are letter combinations that make unique sounds. This is the final key to reading fluency.',
    readiness: ['Blue Series mastered', 'Reads blends fluently'],
    phonogramLists: {
      'ai (long a)': ['aid', 'aim', 'bail', 'braid', 'brain', 'chain', 'claim', 'drain', 'fail', 'faint', 'faith', 'frail', 'gain', 'grain', 'hail', 'jail', 'laid', 'maid', 'mail', 'main', 'nail', 'paid', 'pail', 'pain', 'paint', 'plain', 'praise', 'rain', 'rail', 'raise', 'sail', 'snail', 'sprain', 'stain', 'strain', 'tail', 'trail', 'train', 'waist', 'wait'],
      'ay (long a)': ['bay', 'bray', 'clay', 'day', 'decay', 'delay', 'display', 'fray', 'gay', 'gray', 'hay', 'jay', 'lay', 'may', 'okay', 'pay', 'play', 'pray', 'ray', 'relay', 'repay', 'say', 'slay', 'spray', 'stay', 'stray', 'sway', 'tray', 'way'],
      'ee (long e)': ['bee', 'beef', 'been', 'beet', 'bleed', 'breed', 'breeze', 'cheek', 'cheese', 'creep', 'deed', 'deep', 'fee', 'feed', 'feel', 'feet', 'flee', 'free', 'geese', 'greed', 'green', 'greet', 'heel', 'jeep', 'jeer', 'keen', 'keep', 'knee', 'meek', 'meet', 'need', 'peek', 'peel', 'reed', 'reef', 'seed', 'seek', 'seem', 'seen', 'seep', 'sheep', 'sheet', 'sleek', 'sleep', 'sleet', 'sneeze', 'speed', 'steel', 'steep', 'steed', 'steer', 'street', 'sweep', 'sweet', 'tee', 'teeth', 'tree', 'wee', 'weed', 'week', 'wheel'],
      'ea (long e)': ['beach', 'bead', 'beak', 'beam', 'bean', 'beast', 'beat', 'breach', 'breathe', 'cheap', 'cheat', 'clean', 'clear', 'cream', 'deal', 'dream', 'each', 'ear', 'ease', 'east', 'eat', 'feast', 'fear', 'feat', 'flea', 'gleam', 'grease', 'heap', 'hear', 'heat', 'jeans', 'lead', 'leaf', 'leak', 'lean', 'leap', 'least', 'leave', 'meal', 'mean', 'meat', 'near', 'neat', 'pea', 'peace', 'peach', 'peak', 'peal', 'plead', 'please', 'reach', 'read', 'real', 'ream', 'reap', 'rear', 'reason', 'sea', 'seal', 'seam', 'seat', 'sneak', 'speak', 'spear', 'squeak', 'steal', 'steam', 'stream', 'tea', 'teach', 'teak', 'team', 'tease', 'treat', 'weak', 'weave', 'wheat', 'year', 'yeast', 'zeal'],
      'oa (long o)': ['boat', 'boast', 'cloak', 'coach', 'coal', 'coast', 'coat', 'croak', 'float', 'foam', 'gloat', 'goal', 'goat', 'groan', 'load', 'loaf', 'loan', 'moan', 'moat', 'oak', 'oat', 'poach', 'road', 'roam', 'roast', 'soak', 'soap', 'throat', 'toad', 'toast'],
      'ow (long o)': ['blow', 'bow', 'bowl', 'crow', 'flow', 'glow', 'grow', 'grown', 'know', 'known', 'low', 'mow', 'own', 'row', 'show', 'shown', 'slow', 'snow', 'sow', 'stow', 'throw', 'thrown', 'tow'],
      'oo (long)': ['boo', 'boom', 'boon', 'boot', 'booth', 'brood', 'broom', 'choose', 'cool', 'coop', 'drool', 'droop', 'food', 'fool', 'goof', 'goose', 'groom', 'hoof', 'hoop', 'hoot', 'loom', 'loon', 'loop', 'loose', 'mood', 'moon', 'moose', 'noon', 'ooze', 'pool', 'poof', 'proof', 'root', 'room', 'scoop', 'school', 'scoot', 'shoot', 'smooth', 'snoop', 'snooze', 'soon', 'soot', 'spook', 'spool', 'spoon', 'stool', 'stoop', 'swoop', 'too', 'tool', 'tooth', 'troop', 'zoo', 'zoom'],
      'oo (short)': ['book', 'brook', 'cook', 'crook', 'foot', 'good', 'hood', 'hook', 'look', 'nook', 'shook', 'stood', 'took', 'wood', 'wool'],
      'ar words': ['bar', 'car', 'far', 'jar', 'mar', 'par', 'scar', 'star', 'tar', 'arch', 'ark', 'arm', 'art', 'bark', 'barn', 'card', 'cart', 'carve', 'charge', 'charm', 'chart', 'dark', 'dart', 'farm', 'hard', 'harm', 'harp', 'harsh', 'large', 'lark', 'march', 'mark', 'marsh', 'mart', 'park', 'part', 'scar', 'scarf', 'shark', 'sharp', 'smart', 'spark', 'start', 'stark', 'yard', 'yarn'],
      'or words': ['or', 'for', 'nor', 'born', 'corn', 'cork', 'cord', 'core', 'fork', 'form', 'fort', 'forth', 'horn', 'horse', 'lord', 'more', 'morn', 'north', 'ore', 'porch', 'pork', 'port', 'scorch', 'score', 'scorn', 'short', 'snore', 'snort', 'sore', 'sort', 'sport', 'stork', 'storm', 'store', 'swore', 'thorn', 'torn', 'torch', 'wore', 'worm', 'worn', 'worse', 'worth'],
      'er/ir/ur words': ['her', 'herd', 'jerk', 'nerve', 'perch', 'perk', 'serve', 'stern', 'term', 'verb', 'verse', 'bird', 'birth', 'dirt', 'firm', 'first', 'fir', 'girl', 'gird', 'sir', 'skirt', 'squirm', 'squirt', 'stir', 'swirl', 'third', 'thirst', 'twirl', 'whir', 'blur', 'blurt', 'burn', 'burst', 'church', 'churn', 'curb', 'curd', 'curl', 'curse', 'curve', 'fur', 'hurl', 'hurt', 'lurch', 'lurk', 'nurse', 'purse', 'slur', 'spur', 'spurt', 'surf', 'turn', 'turf', 'urge'],
    },
  },
  greenLongVowels: {
    name: 'Green Series - Long Vowels',
    age: '5-6 years',
    directAims: ['Long vowel patterns', 'Silent e'],
    indirectAims: ['Advanced phonics', 'Spelling patterns'],
    materials: ['Green series long vowel materials'],
    description: 'Silent e makes the vowel say its name. "The e is silent but it makes the vowel SHOUT!"',
    readiness: ['Blue mastery'],
    silentELists: {
      'a-e words': ['ace', 'age', 'ape', 'ate', 'awake', 'bake', 'base', 'blade', 'blame', 'blaze', 'brake', 'brave', 'cage', 'cake', 'came', 'cane', 'cape', 'case', 'cave', 'chase', 'crane', 'crate', 'craze', 'date', 'daze', 'drake', 'drape', 'face', 'fade', 'fake', 'fame', 'fate', 'flame', 'flake', 'frame', 'gale', 'game', 'gate', 'gave', 'gaze', 'grace', 'grade', 'grape', 'grate', 'grave', 'graze', 'haste', 'hate', 'haze', 'jade', 'jake', 'Jane', 'Kate', 'lace', 'lake', 'lame', 'lane', 'late', 'made', 'make', 'male', 'mane', 'mate', 'maze', 'name', 'pace', 'page', 'pale', 'pane', 'paste', 'pave', 'place', 'plane', 'plate', 'race', 'rage', 'rake', 'range', 'rate', 'rave', 'safe', 'sage', 'sake', 'sale', 'same', 'sane', 'save', 'scale', 'scrape', 'shade', 'shake', 'shame', 'shape', 'shave', 'skate', 'snake', 'space', 'spade', 'stage', 'stake', 'stale', 'state', 'stave', 'take', 'tale', 'tame', 'tape', 'taste', 'trace', 'trade', 'vane', 'wade', 'wage', 'wake', 'waste', 'wave'],
      'i-e words': ['bike', 'bile', 'bite', 'bride', 'brine', 'chide', 'chime', 'cite', 'dime', 'dine', 'dire', 'dive', 'drive', 'file', 'fine', 'fire', 'five', 'glide', 'grime', 'gripe', 'hide', 'hike', 'hire', 'hive', 'ice', 'kite', 'knife', 'life', 'like', 'lime', 'line', 'live', 'mice', 'mike', 'mile', 'mime', 'mine', 'mite', 'nice', 'nine', 'pike', 'pile', 'pine', 'pipe', 'price', 'pride', 'prime', 'prize', 'rice', 'ride', 'rife', 'rile', 'rime', 'ripe', 'rise', 'rite', 'shine', 'shire', 'side', 'site', 'size', 'slice', 'slide', 'slime', 'smile', 'snipe', 'spike', 'spine', 'spite', 'splice', 'spice', 'stride', 'strife', 'strike', 'stripe', 'strive', 'swine', 'thrice', 'thrive', 'tide', 'tile', 'time', 'tire', 'tribe', 'trice', 'trite', 'twice', 'twine', 'vice', 'vile', 'vine', 'white', 'wide', 'wife', 'wile', 'wine', 'wipe', 'wire', 'wise', 'write'],
      'o-e words': ['awoke', 'bloke', 'bone', 'bore', 'broke', 'choke', 'chose', 'chrome', 'clone', 'close', 'clove', 'code', 'coke', 'cole', 'come', 'cone', 'cope', 'core', 'cove', 'dome', 'done', 'dope', 'dose', 'dote', 'dove', 'doze', 'drone', 'drove', 'fore', 'froze', 'globe', 'gnome', 'gone', 'gore', 'grove', 'hole', 'home', 'hone', 'hope', 'hose', 'joke', 'lobe', 'lone', 'lore', 'lose', 'mode', 'mole', 'mope', 'more', 'mote', 'node', 'none', 'nose', 'note', 'ode', 'poke', 'pole', 'pone', 'pope', 'pore', 'pose', 'probe', 'prone', 'prose', 'quote', 'robe', 'rode', 'role', 'rope', 'rose', 'rote', 'rove', 'scope', 'score', 'shone', 'shore', 'slope', 'smoke', 'snore', 'sole', 'some', 'sore', 'spoke', 'spore', 'stoke', 'stole', 'stone', 'store', 'stove', 'strobe', 'stroke', 'swore', 'those', 'throne', 'tone', 'tore', 'vote', 'woke', 'woke', 'wore', 'wove', 'wrote', 'yoke', 'zone'],
      'u-e words': ['brute', 'chute', 'crude', 'cube', 'cute', 'dude', 'duke', 'dune', 'dupe', 'fume', 'fuse', 'huge', 'June', 'jute', 'lube', 'lure', 'lute', 'mule', 'muse', 'mute', 'nude', 'prude', 'prune', 'pure', 'rude', 'rule', 'ruse', 'sure', 'tube', 'tune', 'use'],
    },
  },
  greenBooks: {
    name: 'Green Series - Books',
    age: '5.5-6 years',
    directAims: ['Read complex books', 'Reading fluency'],
    indirectAims: ['Independent reading', 'Comprehension'],
    materials: ['Green series readers'],
    description: 'Child reads books with complex phonics patterns - approaching grade-level reading.',
    readiness: ['Phonogram success'],
  },
};

// ============================================
// COMPONENT
// ============================================

export default function EnglishSetupPage() {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const openModal = (key: string) => {
    setSelectedItem({ key, ...BRAIN_DATA[key as keyof typeof BRAIN_DATA] });
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-2">🐋 Tredoux's English Area</h1>
          <p className="text-amber-700 text-lg">Whale Class - 3 Shelf Setup</p>
          <div className="flex justify-center gap-4 md:gap-8 mt-4 text-sm flex-wrap">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">← Progression Flow →</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">Ages 2.5 → 6</span>
            <Link href="/admin/english-guide" className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full hover:bg-amber-300 transition">
              📖 Teaching Guide
            </Link>
          </div>
        </div>

        {/* Three Shelves Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* SHELF 1: Pre-Reading */}
          <div className="bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700 rounded-lg p-4 shadow-xl border-3 border-amber-900">
            <div className="bg-green-600 text-white text-center py-2 rounded-t-lg mb-3 font-bold">
              SHELF 1: PRE-READING
              <div className="text-xs font-normal opacity-90">Ages 2.5-3.5 • "Train the ear"</div>
            </div>
            
            {/* Top Tier: Sound Games */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Top Tier: Sound Games</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('soundGames')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-xs font-medium">Sound Games</div>
                  <div className="text-[10px] text-gray-500">I-Spy intro</div>
                </button>
                <button onClick={() => openModal('iSpyBeginning')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-2xl mb-1">🧺</div>
                  <div className="text-xs font-medium">Beginning</div>
                  <div className="text-[10px] text-gray-500">26 sounds</div>
                </button>
                <button onClick={() => openModal('iSpyEnding')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-2xl mb-1">🧺</div>
                  <div className="text-xs font-medium">Ending</div>
                  <div className="text-[10px] text-gray-500">/-t/, /-n/...</div>
                </button>
              </div>
              <div className="mt-2">
                <button onClick={() => openModal('iSpyMiddle')} className="w-full bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-lg mb-1">🎯</div>
                  <div className="text-xs font-medium">Middle Sounds (Vowels)</div>
                  <div className="text-[10px] text-gray-500">/-a-/, /-e-/, /-i-/, /-o-/, /-u-/</div>
                </button>
              </div>
            </div>
            
            {/* Middle Tier: Sandpaper Letters */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Middle Tier: Sandpaper Letters</div>
              <button onClick={() => openModal('sandpaperLetters')} className="w-full bg-white rounded p-3 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="text-2xl mb-1">✋</div>
                <div className="text-sm font-bold">SANDPAPER LETTERS</div>
                <div className="text-[10px] text-gray-500">26 lowercase on colored boards</div>
                <div className="flex justify-center gap-1 mt-2 flex-wrap">
                  {['a','b','c','d','e'].map(l => (
                    <span key={l} className="w-5 h-5 flex items-center justify-center bg-pink-100 text-pink-700 rounded text-xs font-bold">{l}</span>
                  ))}
                  <span className="text-gray-400 text-xs">... z</span>
                </div>
              </button>
            </div>
            
            {/* Bottom Tier: Metal Insets */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Bottom Tier: Metal Insets</div>
              <button onClick={() => openModal('metalInsets')} className="w-full bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="flex justify-center gap-2 mb-1">
                  <span className="text-lg">🔷</span>
                  <span className="text-lg">📝</span>
                  <span className="text-lg">✏️</span>
                </div>
                <div className="text-xs font-medium">Metal Insets + Paper + Pencils</div>
                <div className="text-[10px] text-gray-500">10 shapes for hand control</div>
              </button>
            </div>
          </div>

          {/* SHELF 2: Encoding */}
          <div className="bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700 rounded-lg p-4 shadow-xl border-3 border-amber-900">
            <div className="bg-blue-600 text-white text-center py-2 rounded-t-lg mb-3 font-bold">
              SHELF 2: ENCODING
              <div className="text-xs font-normal opacity-90">Ages 3.5-4.5 • "Writing before reading"</div>
            </div>
            
            {/* Top Tier: Moveable Alphabet */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Top Tier: Moveable Alphabet</div>
              <button onClick={() => openModal('moveableAlphabet')} className="w-full bg-white rounded p-3 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="text-3xl mb-1">🔤</div>
                <div className="text-sm font-bold">LARGE MOVEABLE ALPHABET</div>
                <div className="flex justify-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded">Blue Vowels</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] rounded">Red Consonants</span>
                </div>
              </button>
            </div>
            
            {/* Middle Tier: Object Boxes (CVC) */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Middle Tier: Object Boxes (Pink Series)</div>
              <button onClick={() => openModal('pinkObjectBox')} className="w-full">
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { v: 'a', ex: 'cat, bat' },
                    { v: 'e', ex: 'bed, pen' },
                    { v: 'i', ex: 'pig, pin' },
                    { v: 'o', ex: 'pot, dog' },
                    { v: 'u', ex: 'cup, bug' },
                  ].map((item) => (
                    <div key={item.v} className="bg-pink-50 border border-pink-200 rounded p-1.5 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                      <div className="text-xs font-bold text-pink-700">{item.v}</div>
                      <div className="text-[9px] text-gray-600">{item.ex}</div>
                    </div>
                  ))}
                </div>
              </button>
            </div>
            
            {/* Bottom Tier: Picture-Word Matching */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Bottom Tier: Picture-Word Matching</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('pinkPictureMatch')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-lg mb-1">🖼️</div>
                  <div className="text-xs font-medium">Picture Cards</div>
                </button>
                <button onClick={() => openModal('moveableAlphabetCVC')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-lg mb-1">📄</div>
                  <div className="text-xs font-medium">Word Cards</div>
                </button>
                <div className="bg-white rounded p-2 text-center shadow">
                  <div className="text-lg mb-1">🧺</div>
                  <div className="text-xs font-medium">Matching Basket</div>
                </div>
              </div>
            </div>
          </div>

          {/* SHELF 3: Decoding */}
          <div className="bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700 rounded-lg p-4 shadow-xl border-3 border-amber-900">
            <div className="bg-purple-600 text-white text-center py-2 rounded-t-lg mb-3 font-bold">
              SHELF 3: DECODING
              <div className="text-xs font-normal opacity-90">Ages 4.5-6 • "Reading emerges"</div>
            </div>
            
            {/* Top Tier: Pink Series Reading */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Top Tier: Pink Series (CVC)</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('pinkLists')} className="bg-pink-100 border border-pink-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-pink-800">Word Lists</div>
                  <div className="text-[10px] text-gray-600">CVC words</div>
                </button>
                <button onClick={() => openModal('pinkPhrases')} className="bg-pink-100 border border-pink-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-pink-800">Phrases</div>
                  <div className="text-[10px] text-gray-600">"a red cat"</div>
                </button>
                <button onClick={() => openModal('pinkSentences')} className="bg-pink-100 border border-pink-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-pink-800">Sentences</div>
                  <div className="text-[10px] text-gray-600">"The cat sat."</div>
                </button>
              </div>
              <button onClick={() => openModal('pinkBooks')} className="mt-2 w-full bg-pink-50 border border-pink-200 rounded p-2 text-center shadow hover:shadow-lg transition-all cursor-pointer">
                <div className="text-xs font-bold text-pink-700">📚 Pink Readers</div>
              </button>
            </div>
            
            {/* Middle Tier: Blue Series */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Middle Tier: Blue Series (Blends)</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('blueBlends')} className="bg-blue-100 border border-blue-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-blue-800">Blends</div>
                  <div className="text-[10px] text-gray-600">bl, cr, st...</div>
                </button>
                <button onClick={() => openModal('blueDigraphs')} className="bg-blue-100 border border-blue-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-blue-800">Digraphs</div>
                  <div className="text-[10px] text-gray-600">sh, ch, th</div>
                </button>
                <button onClick={() => openModal('blueBooks')} className="bg-blue-100 border border-blue-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-blue-800">📘 Readers</div>
                  <div className="text-[10px] text-gray-600">blend books</div>
                </button>
              </div>
            </div>
            
            {/* Bottom Tier: Green Series */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Bottom Tier: Green Series (Phonograms)</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('greenPhonograms')} className="bg-green-100 border border-green-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-green-800">Phonograms</div>
                  <div className="text-[10px] text-gray-600">ai, ee, oa...</div>
                </button>
                <button onClick={() => openModal('greenLongVowels')} className="bg-green-100 border border-green-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-green-800">Long Vowels</div>
                  <div className="text-[10px] text-gray-600">silent e</div>
                </button>
                <button onClick={() => openModal('greenBooks')} className="bg-green-100 border border-green-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-green-800">📗 Readers</div>
                  <div className="text-[10px] text-gray-600">fluent reading</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-amber-900 mb-4 text-center">Quick Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <h3 className="font-bold text-green-800 mb-2">Phase 1 Ready When:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✅ Hears beginning sounds</li>
                <li>✅ Hears ending sounds</li>
                <li>✅ Traces letters correctly</li>
                <li>✅ Knows most letter sounds</li>
              </ul>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <h3 className="font-bold text-blue-800 mb-2">Phase 2 Ready When:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✅ Builds CVC words</li>
                <li>✅ Sounds out built words</li>
                <li>✅ Matches objects to words</li>
                <li>✅ Shows reading interest</li>
              </ul>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
              <h3 className="font-bold text-purple-800 mb-2">Success Looks Like:</h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>🎉 Reads CVC fluently</li>
                <li>🎉 Reads simple sentences</li>
                <li>🎉 Picks up books to read</li>
                <li>🎉 Writes spontaneously</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-amber-700">
          <p className="font-semibold">🐋 Whale Class - Making Readers</p>
          <p className="text-sm">Data from Montessori Brain (37 Language Works)</p>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">{selectedItem.name}</h3>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Age */}
            <div className="mb-4 inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
              Ages {selectedItem.age}
            </div>
            
            {/* Description */}
            {selectedItem.description && (
              <p className="text-gray-600 mb-4">{selectedItem.description}</p>
            )}
            
            {/* Materials */}
            {selectedItem.materials && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📦 Materials Needed:</h4>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                  {selectedItem.materials.map((m: string, i: number) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Direct Aims */}
            {selectedItem.directAims && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🎯 Direct Aims:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.directAims.map((aim: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{aim}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Indirect Aims */}
            {selectedItem.indirectAims && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔄 Indirect Aims:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.indirectAims.map((aim: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{aim}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Readiness Indicators */}
            {selectedItem.readiness && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">✅ Ready When Child:</h4>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                  {selectedItem.readiness.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Word Lists by Vowel (for Pink Object Box) */}
            {selectedItem.wordsByVowel && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📝 CVC Words by Vowel:</h4>
                {Object.entries(selectedItem.wordsByVowel).map(([vowel, words]) => (
                  <div key={vowel} className="mb-3">
                    <div className="text-sm font-medium text-pink-700 mb-1">{vowel}:</div>
                    <div className="flex flex-wrap gap-1">
                      {(words as string[]).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 bg-pink-50 text-pink-700 rounded text-xs">{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Blends (for Blue Series) */}
            {selectedItem.blends && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 Consonant Blends:</h4>
                {Object.entries(selectedItem.blends).map(([category, blends]) => (
                  <div key={category} className="mb-2">
                    <div className="text-sm font-medium text-blue-700 mb-1">{category}:</div>
                    <div className="flex flex-wrap gap-1">
                      {(blends as string[]).map((b, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{b}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Digraphs */}
            {selectedItem.digraphs && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 Digraphs:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.digraphs.map((d: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-mono font-bold">{d}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Phonograms */}
            {selectedItem.phonograms && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 Phonograms:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.phonograms.map((p: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded font-mono font-bold">{p}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Long Vowel Patterns */}
            {selectedItem.patterns && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 Long Vowel Patterns:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.patterns.map((p: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm">{p}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Examples */}
            {selectedItem.examples && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📖 Examples:</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  {selectedItem.examples.map((ex: string, i: number) => (
                    <div key={i} className="text-gray-700 text-sm mb-1">• {ex}</div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sounds list for I-Spy */}
            {selectedItem.sounds && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 All 26 Sounds:</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedItem.sounds.map((s: string, i: number) => (
                    <span key={i} className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded font-bold">{`/${s}/`}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Word Lists by Family (for Pink Lists) */}
            {selectedItem.wordLists && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📝 Word Lists by Family:</h4>
                {Object.entries(selectedItem.wordLists).map(([family, words]) => (
                  <div key={family} className="mb-3">
                    <div className="text-sm font-bold text-pink-700 mb-1">{family}</div>
                    <div className="flex flex-wrap gap-1">
                      {(words as string[]).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 bg-pink-50 text-pink-700 rounded text-xs">{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Phrases (for Pink Phrases) */}
            {selectedItem.phrases && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📝 Phrases to Read:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedItem.phrases.map((phrase: string, i: number) => (
                    <div key={i} className="px-3 py-2 bg-pink-50 text-pink-800 rounded text-sm font-medium">{phrase}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Sentences (for Pink Sentences) */}
            {selectedItem.sentences && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📖 Sentences to Read:</h4>
                <div className="space-y-2">
                  {selectedItem.sentences.map((sentence: string, i: number) => (
                    <div key={i} className="px-3 py-2 bg-pink-50 text-pink-800 rounded text-sm">{sentence}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Blend Word Lists (for Blue Blends) */}
            {selectedItem.blendLists && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📝 Blend Word Lists:</h4>
                {Object.entries(selectedItem.blendLists).map(([blend, words]) => (
                  <div key={blend} className="mb-3">
                    <div className="text-sm font-bold text-blue-700 mb-1">{blend}</div>
                    <div className="flex flex-wrap gap-1">
                      {(words as string[]).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Digraph Word Lists (for Blue Digraphs) */}
            {selectedItem.digraphLists && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📝 Digraph Word Lists:</h4>
                {Object.entries(selectedItem.digraphLists).map(([digraph, words]) => (
                  <div key={digraph} className="mb-3">
                    <div className="text-sm font-bold text-blue-700 mb-1">{digraph}</div>
                    <div className="flex flex-wrap gap-1">
                      {(words as string[]).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Phonogram Word Lists (for Green Phonograms) */}
            {selectedItem.phonogramLists && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📝 Phonogram Word Lists:</h4>
                {Object.entries(selectedItem.phonogramLists).map(([phonogram, words]) => (
                  <div key={phonogram} className="mb-3">
                    <div className="text-sm font-bold text-green-700 mb-1">{phonogram}</div>
                    <div className="flex flex-wrap gap-1">
                      {(words as string[]).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Silent E Word Lists (for Green Long Vowels) */}
            {selectedItem.silentELists && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📝 Silent E Word Lists:</h4>
                {Object.entries(selectedItem.silentELists).map(([pattern, words]) => (
                  <div key={pattern} className="mb-3">
                    <div className="text-sm font-bold text-green-700 mb-1">{pattern}</div>
                    <div className="flex flex-wrap gap-1">
                      {(words as string[]).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedItem(null)}
              className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
