'use client';

import { useState } from 'react';
import Link from 'next/link';

// =============================================================================
// AMI ENGLISH LANGUAGE CURRICULUM - COMPLETE FOR AGES 3-6
// Based on authentic AMI standards, Muriel Dwyer approach
// =============================================================================

interface Material {
  name: string;
  nameZh: string;
  search1688: string;
  altSearch?: string;
  specs: string;
  price: string;
  essential: boolean;
}

interface Work {
  id: string;
  name: string;
  age: string;
  directAim: string;
  indirectAims: string[];
  prerequisites: string;
  presentation: string[];
  materials: Material[];
  controlOfError: string;
  pointOfInterest: string;
  extensions: string[];
  notes?: string;
  videoUrl?: string;
  videoSearchTerm?: string; // YouTube search term instead of direct link
  beginnerGuide?: {
    whatIsThis: string;
    whyItMatters: string;
    beforeYouStart: string[];
    exactScript: string[];
    commonMistakes: string[];
    successIndicators: string[];
    sessionLength: string;
    frequency: string;
  };
}

// Extension detail information for expandable extension cards
interface ExtensionDetail {
  name: string;
  what: string;
  howTo: string;
  materials?: string;
  readiness: string;
}

const extensionDetails: Record<string, ExtensionDetail> = {
  // Oral Language Extensions
  'Label matching after learning to read': {
    name: 'Label Matching',
    what: 'Child reads labels and places them on corresponding objects around the classroom.',
    howTo: 'Prepare laminated word labels for classroom objects. Child takes a basket of labels, reads each one, walks to find the object, places label on or near it. Self-correcting: object and label must match.',
    materials: 'Laminated word labels (same font as reading materials), small basket to carry labels',
    readiness: 'Child can read CVC words and some sight words fluently'
  },
  'Creating own labels': {
    name: 'Creating Own Labels',
    what: 'Child writes their own labels for objects using Moveable Alphabet or pencil.',
    howTo: 'Child chooses an object, sounds out the word, builds it with Moveable Alphabet or writes on paper strip. Teacher helps with spelling if needed. Child places their label on the object.',
    materials: 'Paper strips, pencil, or Moveable Alphabet',
    readiness: 'Child can build simple words with Moveable Alphabet'
  },
  'Sorting objects by category': {
    name: 'Sorting by Category',
    what: 'Child groups objects from mixed basket into categories (animals, foods, tools, etc.).',
    howTo: 'Present mixed basket of objects from multiple categories. Child sorts onto mat creating distinct groups. Discuss why items belong together. Add category labels for readers.',
    materials: 'Mixed object basket, sorting mat, category labels',
    readiness: 'Child knows names of objects and understands grouping concept'
  },
  'Adding more objects to categories': {
    name: 'Expanding Categories',
    what: 'Find additional objects that belong in established categories.',
    howTo: 'After mastering initial category, child searches classroom or brings items from home that fit the category. Discuss what makes something belong (or not).',
    materials: 'Existing category baskets, new objects to add',
    readiness: 'Child understands classification principles'
  },
  'Child teaches younger child': {
    name: 'Peer Teaching',
    what: 'Older child presents the Three-Period Lesson to a younger child.',
    howTo: 'Observe older child demonstrating mastery. Invite them to "help" a younger friend learn. Guide gently but let older child lead. Validates learning and builds confidence.',
    materials: 'Same materials used for original presentation',
    readiness: 'Child has fully mastered the material and shows patience'
  },
  'Story dictation': {
    name: 'Story Dictation',
    what: 'Child tells a story while adult writes it down, then child illustrates.',
    howTo: 'Invite child to tell a story. Write exactly what they say (their words, their grammar). Read it back. Child illustrates. Bind into book. Powerful bridge to writing.',
    materials: 'Paper, pencil, colored pencils, stapler for binding',
    readiness: 'Child can form simple sentences verbally'
  },
  'Matching card to card': {
    name: 'Card Matching',
    what: 'Match identical picture cards without the control card present.',
    howTo: 'Use two identical sets of picture cards. Lay out one set. Child matches second set by finding pairs. Builds visual discrimination.',
    materials: 'Two identical sets of picture cards',
    readiness: 'Child has mastered basic three-part card work'
  },
  'Memory game with cards': {
    name: 'Memory/Concentration Game',
    what: 'Classic memory game using nomenclature cards turned face-down.',
    howTo: 'Place cards face-down in grid. Child turns over two at a time seeking matches. Say the name of each card turned. Builds memory, vocabulary reinforcement.',
    materials: 'Matching pairs of picture cards',
    readiness: 'Child knows all vocabulary in the set'
  },
  'Child makes own cards': {
    name: 'Child-Made Cards',
    what: 'Child creates their own three-part card set from drawings or cut pictures.',
    howTo: 'Child draws or cuts pictures, creates labels (with Moveable Alphabet or writing). Mount on cardstock. Laminate if possible. Child has ownership of their creation.',
    materials: 'Paper, scissors, glue, magazines for cutting, laminating sheets (optional)',
    readiness: 'Child can write or build words, has fine motor control for cutting'
  },
  'Classify objects as living/non-living': {
    name: 'Living/Non-Living Sort',
    what: 'Sort objects or pictures into living and non-living categories.',
    howTo: 'Introduce concept: "Living things grow, need food, breathe." Sort pictures or miniatures. Discuss edge cases (seeds, wood). Great science-language connection.',
    materials: 'Mixed pictures or objects of living/non-living things, sorting mat',
    readiness: 'Child understands that things can be grouped by characteristics'
  },
  'Research projects on animals/plants': {
    name: 'Research Projects',
    what: 'Child investigates a topic of interest and creates a report or presentation.',
    howTo: 'Child chooses topic (favorite animal, plant, etc.). Use books, pictures, observation. Child creates booklet with drawings and dictated/written facts. Share with class.',
    materials: 'Reference books, paper for booklet, drawing materials',
    readiness: 'Child shows sustained interest in a topic, can dictate or write simple sentences'
  },
  // Sound Games Extensions
  'Ending sounds': {
    name: 'Ending Sound I Spy',
    what: 'Identify the ENDING sound of words instead of beginning.',
    howTo: '"I spy something that ends with /t/." Progress after solid beginning sound mastery. More challenging as ending sounds are less prominent in speech.',
    materials: 'Same objects used for beginning sounds',
    readiness: 'Child consistently identifies beginning sounds'
  },
  'Middle sounds': {
    name: 'Middle Sound I Spy',
    what: 'Identify the MIDDLE (vowel) sound of CVC words.',
    howTo: '"I spy something with /a/ in the middle." Most challenging level. Focus on short vowels. Essential preparation for reading.',
    materials: 'CVC objects only (cat, pig, cup, etc.)',
    readiness: 'Child identifies both beginning and ending sounds easily'
  },
  'Full segmentation': {
    name: 'Full Segmentation',
    what: 'Child breaks word into ALL individual sounds.',
    howTo: '"What sounds do you hear in CAT?" Child says "/c/ - /a/ - /t/" while tapping or using counters. This is phonemic awareness at its highest level.',
    materials: 'Objects, counters or tapping surface',
    readiness: 'Child identifies beginning, middle, and ending sounds separately'
  },
  'Rhyming games': {
    name: 'Rhyming Games',
    what: 'Identify words that rhyme (sound the same at the end).',
    howTo: 'Present pairs: "Do CAT and BAT rhyme?" Progress to "What rhymes with CAT?" Use objects, pictures, or just words. Songs and books with rhymes help.',
    materials: 'Rhyming object pairs, rhyming picture cards, rhyming books',
    readiness: 'Child has been exposed to rhyming books/songs, ready around age 3.5+'
  },
  // Sandpaper Letter Extensions
  'Capital letters': {
    name: 'Capital Sandpaper Letters',
    what: 'Introduce uppercase letters after lowercase mastery.',
    howTo: 'Same Three-Period Lesson approach. Connect to lowercase: "This is the capital A. It makes the same sound /a/ as lowercase a."',
    materials: 'Capital sandpaper letter set',
    readiness: 'Child knows all lowercase letters and sounds'
  },
  'Phonogram sandpaper letters': {
    name: 'Phonogram Letters',
    what: 'Introduce letter combinations that make special sounds (sh, ch, th, etc.).',
    howTo: 'Present on GREEN boards to distinguish from single letters. "These two letters together say /sh/." Same tracing technique.',
    materials: 'Phonogram sandpaper letters (usually green)',
    readiness: 'Child knows all single letter sounds, beginning to read'
  },
  'Eyes closed tracing': {
    name: 'Eyes Closed Tracing',
    what: 'Trace sandpaper letters with eyes closed to strengthen muscle memory.',
    howTo: 'Child traces while looking, says sound. Then closes eyes and traces again, relying on touch and muscle memory. Builds strong tactile connection.',
    materials: 'Sandpaper letters',
    readiness: 'Child knows the letter well, seeks challenge'
  },
  'Mystery bag with letters': {
    name: 'Mystery Letter Bag',
    what: 'Identify letters by touch alone in a mystery bag.',
    howTo: 'Place 3-5 known letters in fabric bag. Child reaches in, feels letter without looking, says the sound. Pulls out to verify.',
    materials: 'Fabric bag, sandpaper letters',
    readiness: 'Child knows several letters confidently'
  },
  // Metal Inset Extensions
  'Combine two shapes': {
    name: 'Combined Shape Designs',
    what: 'Trace two or more insets overlapping to create complex designs.',
    howTo: 'Trace first shape, then position second overlapping. Different colored pencils for each. Fill sections with different patterns. Creates beautiful complex artwork.',
    materials: 'Metal insets, colored pencils, paper',
    readiness: 'Child has mastered single shape filling'
  },
  'Create patterns and designs': {
    name: 'Pattern Designs',
    what: 'Fill shapes with varied patterns: zigzags, waves, spirals, dots.',
    howTo: 'After mastering horizontal lines, introduce new filling patterns. Demonstrate one new pattern at a time. Child experiments with creating their own patterns.',
    materials: 'Metal insets, colored pencils, paper',
    readiness: 'Child fills shapes with consistent horizontal lines'
  },
  'Gradation of color': {
    name: 'Color Gradation',
    what: 'Fill shape with color that gradually shifts from dark to light.',
    howTo: 'Use one colored pencil, press hard at top (dark), gradually lighter pressure moving down. Or use color family: dark blue → blue → light blue.',
    materials: 'Metal insets, colored pencils (same color family), paper',
    readiness: 'Child has good pencil control and understands light/dark'
  },
  'Fill with curved lines': {
    name: 'Curved Line Filling',
    what: 'Fill shapes with curved or wavy lines instead of straight.',
    howTo: 'Demonstrate smooth curved lines following the shape contour. Or free-form waves. Builds flexibility in hand movement.',
    materials: 'Metal insets, colored pencils, paper',
    readiness: 'Child has mastered straight line filling'
  },
  // Moveable Alphabet Extensions
  'Build from pictures': {
    name: 'Picture Word Building',
    what: 'Build words from picture cards without the object present.',
    howTo: 'Present picture card. Child says word, segments sounds, builds with Moveable Alphabet. More abstract than objects - can\'t hold/manipulate picture.',
    materials: 'Picture cards, Moveable Alphabet',
    readiness: 'Child can build words with objects present'
  },
  'Build phrases': {
    name: 'Phrase Building',
    what: 'Build two or more words together forming a phrase.',
    howTo: '"a fat cat" - child builds three words with spaces between. Introduces word spacing concept. Use phrase cards for reading back.',
    materials: 'Moveable Alphabet, phrase cards or objects',
    readiness: 'Child can build individual words fluently'
  },
  'Build sentences': {
    name: 'Sentence Building',
    what: 'Build complete sentences with capital letter and punctuation.',
    howTo: 'Introduce capital letter at beginning, period at end. "The cat sat." Progress to longer sentences. Child can write own stories.',
    materials: 'Moveable Alphabet (including capitals and punctuation)',
    readiness: 'Child builds phrases easily, ready for full sentences'
  },
  'Build with phonograms': {
    name: 'Phonogram Word Building',
    what: 'Build words containing phonograms (sh, ch, ee, ai, etc.).',
    howTo: 'Use words with known phonograms. Some alphabets have phonogram tiles; otherwise use two letters together. Bridge to Green Series reading.',
    materials: 'Moveable Alphabet, phonogram objects/pictures',
    readiness: 'Child knows phonogram sounds from sandpaper letters'
  },
  // Reading Extensions
  'Object to word matching': {
    name: 'Object-Word Matching',
    what: 'Match word cards to corresponding objects.',
    howTo: 'Lay out objects. Child reads each word card, places with matching object. Self-checking through the match.',
    materials: 'Objects, word cards with pink/blue/green border to match series',
    readiness: 'Child is decoding at that series level'
  },
  'Picture to word matching': {
    name: 'Picture-Word Matching',
    what: 'Match word cards to picture cards.',
    howTo: 'Lay out pictures. Child reads word cards, matches to pictures. More abstract than objects. Can be self-correcting with control card.',
    materials: 'Picture cards, word cards',
    readiness: 'Child can decode words at that level'
  },
  'Word list reading': {
    name: 'Word Lists',
    what: 'Read lists of words organized by pattern.',
    howTo: 'Lists organized by word family or phonogram. Child reads down the list, noticing patterns. Builds fluency through repetition.',
    materials: 'Printed word lists (teacher-made or commercial)',
    readiness: 'Child can decode the pattern type'
  },
  'Booklet reading': {
    name: 'Phonetic Readers',
    what: 'Read simple booklets using controlled vocabulary.',
    howTo: 'Small booklets with only decodable words (plus sight words). Child reads independently. Discuss story. Build reading confidence.',
    materials: 'Phonetic readers at Pink/Blue/Green level',
    readiness: 'Child can decode words at that level, wants to "read a book"'
  },
  'Sentence strips': {
    name: 'Sentence Strip Reading',
    what: 'Read sentences and match to pictures or perform actions.',
    howTo: 'Present sentence strip. Child reads, then matches to picture or performs the action described. "The cat is on the mat."',
    materials: 'Sentence strips, matching pictures or real objects',
    readiness: 'Child can read phrases fluently'
  },
  'Command cards': {
    name: 'Action Commands',
    what: 'Read action sentences and perform them.',
    howTo: 'Child reads card silently, performs action (hop, sit, get the book). Other children guess the word/phrase. Kinesthetic reading practice.',
    materials: 'Command cards (red-coded for verbs)',
    readiness: 'Child can read sentences, enjoys movement activities'
  },
  'Dictation': {
    name: 'Spelling Dictation',
    what: 'Teacher says word, child writes/builds it.',
    howTo: 'Teacher says word clearly. Child segments sounds mentally, writes or builds with Moveable Alphabet. Reversal of reading process - encoding.',
    materials: 'Paper and pencil, or Moveable Alphabet',
    readiness: 'Child is reading at that level, ready to practice spelling'
  },
  // Grammar Extensions
  'Add more nouns': {
    name: 'Noun Expansion',
    what: 'Find more nouns in environment, pictures, or text.',
    howTo: 'After basic introduction, hunt for nouns everywhere. "How many nouns can you find on this shelf?" Place black triangle above each noun in a sentence.',
    materials: 'Environment, texts, grammar symbols',
    readiness: 'Child understands noun concept'
  },
  'Noun hunt in classroom': {
    name: 'Classroom Noun Hunt',
    what: 'Walk around classroom labeling nouns with black triangles.',
    howTo: 'Child carries bag of paper triangles or sticky notes. Labels everything that is a noun. Count how many nouns in the room!',
    materials: 'Paper triangles or sticky notes, classroom',
    readiness: 'Child can identify nouns reliably'
  },
  'Add more verbs': {
    name: 'Verb Expansion',
    what: 'Generate and act out many different verbs.',
    howTo: '"How many action words can you think of?" List them, act them out, use in sentences. Read verb cards and perform actions.',
    materials: 'Paper for listing, command cards, grammar symbols',
    readiness: 'Child understands verb concept'
  },
  'Verb charades': {
    name: 'Verb Charades',
    what: 'Act out verbs for others to guess.',
    howTo: 'Child picks verb card, acts it out silently. Others guess the verb. Fun way to internalize that verbs are ACTION words.',
    materials: 'Verb cards',
    readiness: 'Child knows many verbs, enjoys dramatic play'
  },
  'Add more adjectives': {
    name: 'Adjective Expansion',
    what: 'Generate many adjectives to describe a single noun.',
    howTo: 'Pick an object. "How many describing words for this ball?" Big, red, bouncy, round, rubber... List them all. See how specific we can be.',
    materials: 'Various objects, paper for listing',
    readiness: 'Child understands adjective concept'
  },
  'Describe objects in detail': {
    name: 'Detailed Description',
    what: 'Use multiple adjectives to describe one object precisely.',
    howTo: 'Challenge: describe object using 5+ adjectives. Try to make description unique enough that others know exactly which object you mean.',
    materials: 'Collection of similar objects, grammar symbols',
    readiness: 'Child knows many adjectives'
  },
  'Write sentences with article-adjective-noun': {
    name: 'Sentence Pattern Practice',
    what: 'Write sentences following specific grammar patterns.',
    howTo: 'Give pattern: Article + Adjective + Noun + Verb. Child constructs: "The big dog runs." Use grammar symbols to check.',
    materials: 'Paper, grammar symbols for checking',
    readiness: 'Child knows basic parts of speech, can write simple words'
  },
  // Generic Extensions
  'Increase vocabulary': {
    name: 'Vocabulary Expansion',
    what: 'Add more challenging or specific words to the activity.',
    howTo: 'After mastering basic vocabulary, introduce specialized terms, synonyms, or less common words. Building rich vocabulary is ongoing.',
    materials: 'Additional word cards, objects, or pictures',
    readiness: 'Child has mastered basic vocabulary, shows interest in more'
  },
  'Sentence building': {
    name: 'Simple Sentence Building',
    what: 'Construct simple sentences using the vocabulary.',
    howTo: 'Use known vocabulary words in sentence context. "The ___ is ___." Fill in blanks orally, then with word cards or Moveable Alphabet.',
    materials: 'Vocabulary from activity, sentence frames, Moveable Alphabet',
    readiness: 'Child knows vocabulary well, speaks in sentences'
  },
  'Creative writing': {
    name: 'Creative Writing',
    what: 'Child writes own stories using learned vocabulary and patterns.',
    howTo: 'Provide starting prompt or let child choose topic. Write independently using invented spelling or with adult support. Illustrate work.',
    materials: 'Paper, pencils, colored pencils for illustration',
    readiness: 'Child can write or build many words, has stories to tell'
  },
  'Word building': {
    name: 'Word Building',
    what: 'Build words with Moveable Alphabet.',
    howTo: 'Child sounds out words and selects letters to build them. The foundation of encoding (spelling). Use objects or pictures as prompts.',
    materials: 'Moveable Alphabet, objects or pictures',
    readiness: 'Child knows letter sounds'
  }
};

interface Category {
  id: string;
  name: string;
  icon: string;
  sequence: number;
  description: string;
  amiNotes?: string;
  works: Work[];
}

// =============================================================================
// COMPLETE CURRICULUM DATA
// =============================================================================

// =============================================================================
// REFERENCE DATA: INITIAL SOUND OBJECTS (A-Z)
// Complete list of miniature objects for Sound Games and Object Boxes
// =============================================================================
const initialSoundObjects: Record<string, string[]> = {
  a: ['apple', 'alligator', 'ant', 'astronaut', 'avocado', 'anchor', 'acorn', 'ambulance', 'angel', 'arrow'],
  b: ['ball', 'bear', 'bus', 'banana', 'bee', 'bird', 'boat', 'button', 'butterfly', 'book', 'bed', 'bat'],
  c: ['cat', 'car', 'cup', 'cow', 'cake', 'candle', 'carrot', 'camel', 'corn', 'cookie', 'crab', 'cap'],
  d: ['dog', 'duck', 'doll', 'door', 'dinosaur', 'deer', 'drum', 'dolphin', 'domino', 'donut', 'dragon'],
  e: ['egg', 'elephant', 'elf', 'elbow', 'envelope', 'engine', 'eagle', 'ear', 'eraser', 'emerald'],
  f: ['fish', 'frog', 'fan', 'fork', 'fox', 'feather', 'finger', 'flag', 'flower', 'fruit', 'fence', 'fire'],
  g: ['goat', 'guitar', 'grape', 'gift', 'girl', 'gorilla', 'ghost', 'glove', 'grass', 'gum', 'game'],
  h: ['hat', 'horse', 'house', 'hammer', 'heart', 'hand', 'hippo', 'helicopter', 'horn', 'hose', 'hen'],
  i: ['igloo', 'iguana', 'insect', 'ice cream', 'inch', 'infant', 'ink', 'ivy', 'iron', 'island'],
  j: ['jar', 'jet', 'jug', 'jam', 'jacket', 'jellyfish', 'jump rope', 'jeep', 'juice', 'jeans', 'jewel'],
  k: ['key', 'kite', 'king', 'kangaroo', 'kitten', 'kettle', 'kick', 'koala', 'kitchen', 'knife', 'knee'],
  l: ['lion', 'lamp', 'leaf', 'lemon', 'ladder', 'lizard', 'lock', 'log', 'lobster', 'leg', 'lips', 'lime'],
  m: ['mouse', 'moon', 'monkey', 'map', 'mitten', 'mushroom', 'milk', 'mop', 'mask', 'mug', 'man', 'mat'],
  n: ['nut', 'nest', 'nurse', 'nail', 'necklace', 'nose', 'net', 'needle', 'notebook', 'nine', 'napkin'],
  o: ['octopus', 'orange', 'owl', 'otter', 'olive', 'ox', 'ostrich', 'onion', 'opera', 'orbit', 'oven'],
  p: ['pig', 'pen', 'pan', 'pizza', 'pear', 'penguin', 'pumpkin', 'purse', 'piano', 'parrot', 'pot', 'pin'],
  q: ['queen', 'quilt', 'question mark', 'quarter', 'quail', 'quiver'],
  r: ['rabbit', 'ring', 'rocket', 'rainbow', 'robot', 'rose', 'rug', 'rain', 'rope', 'rat', 'rock', 'ruler'],
  s: ['sun', 'star', 'snake', 'sock', 'strawberry', 'spider', 'seal', 'scissors', 'soap', 'spoon', 'ship'],
  t: ['tiger', 'tree', 'turtle', 'table', 'tent', 'tooth', 'train', 'truck', 'tomato', 'top', 'tie', 'toad'],
  u: ['umbrella', 'unicorn', 'umpire', 'underwear', 'uniform', 'utensils'],
  v: ['van', 'violin', 'vase', 'vest', 'vacuum', 'vegetable', 'volcano', 'vulture', 'vine', 'village'],
  w: ['watch', 'whale', 'wagon', 'watermelon', 'web', 'wolf', 'worm', 'window', 'wig', 'well', 'wing'],
  x: ['x-ray', 'xylophone', 'fox (ending)', 'box (ending)', 'six (ending)', 'mix (ending)'],
  y: ['yo-yo', 'yarn', 'yak', 'yacht', 'yam', 'yogurt', 'yolk'],
  z: ['zebra', 'zipper', 'zoo', 'zero', 'zucchini', 'zigzag', 'zone']
};

// =============================================================================
// REFERENCE DATA: CVC WORD LISTS BY FAMILY
// Complete word families for Pink Series
// =============================================================================
const cvcWordFamilies: Record<string, string[]> = {
  // Short A families
  '-at': ['bat', 'cat', 'fat', 'hat', 'mat', 'pat', 'rat', 'sat', 'vat', 'brat', 'chat', 'flat', 'that', 'scat'],
  '-an': ['ban', 'can', 'dan', 'fan', 'man', 'pan', 'ran', 'tan', 'van', 'bran', 'clan', 'plan', 'scan', 'than'],
  '-ap': ['cap', 'gap', 'lap', 'map', 'nap', 'rap', 'sap', 'tap', 'zap', 'chap', 'clap', 'flap', 'slap', 'snap', 'trap', 'wrap'],
  '-ad': ['bad', 'dad', 'had', 'lad', 'mad', 'pad', 'sad', 'tad', 'brad', 'chad', 'glad'],
  '-ag': ['bag', 'gag', 'hag', 'lag', 'nag', 'rag', 'sag', 'tag', 'wag', 'brag', 'drag', 'flag', 'shag', 'snag', 'stag'],
  '-am': ['bam', 'dam', 'ham', 'jam', 'ram', 'yam', 'clam', 'cram', 'gram', 'scam', 'sham', 'slam', 'spam', 'swam', 'tram'],
  '-ab': ['cab', 'dab', 'gab', 'jab', 'lab', 'nab', 'tab', 'crab', 'grab', 'scab', 'stab'],
  '-ack': ['back', 'hack', 'jack', 'lack', 'pack', 'rack', 'sack', 'tack', 'black', 'crack', 'knack', 'shack', 'slack', 'smack', 'snack', 'stack', 'track', 'whack'],
  '-ash': ['bash', 'cash', 'dash', 'gash', 'hash', 'lash', 'mash', 'rash', 'clash', 'crash', 'flash', 'slash', 'smash', 'stash', 'trash'],
  '-ang': ['bang', 'fang', 'gang', 'hang', 'rang', 'sang', 'clang', 'slang'],
  '-ank': ['bank', 'dank', 'rank', 'sank', 'tank', 'yank', 'blank', 'clank', 'crank', 'drank', 'frank', 'plank', 'prank', 'shank', 'spank', 'stank', 'thank'],

  // Short E families
  '-et': ['bet', 'get', 'jet', 'let', 'met', 'net', 'pet', 'set', 'vet', 'wet', 'yet', 'fret'],
  '-en': ['ben', 'den', 'hen', 'ken', 'men', 'pen', 'ten', 'yen', 'glen', 'then', 'when', 'wren'],
  '-ed': ['bed', 'fed', 'led', 'red', 'wed', 'bled', 'bred', 'fled', 'shed', 'shred', 'sled', 'sped'],
  '-eg': ['beg', 'keg', 'leg', 'peg'],
  '-ell': ['bell', 'cell', 'dell', 'fell', 'hell', 'jell', 'sell', 'tell', 'well', 'yell', 'dwell', 'shell', 'smell', 'spell', 'swell'],
  '-eck': ['beck', 'deck', 'neck', 'peck', 'check', 'fleck', 'speck', 'wreck'],
  '-est': ['best', 'fest', 'jest', 'nest', 'pest', 'rest', 'test', 'vest', 'west', 'zest', 'blest', 'chest', 'crest', 'quest'],
  '-ent': ['bent', 'dent', 'gent', 'lent', 'rent', 'sent', 'tent', 'vent', 'went', 'scent', 'spent'],
  '-end': ['bend', 'fend', 'lend', 'mend', 'rend', 'send', 'tend', 'vend', 'wend', 'blend', 'spend', 'trend'],

  // Short I families
  '-it': ['bit', 'fit', 'hit', 'kit', 'lit', 'pit', 'sit', 'wit', 'grit', 'knit', 'quit', 'skit', 'slit', 'spit', 'split', 'twit'],
  '-in': ['bin', 'din', 'fin', 'gin', 'kin', 'pin', 'sin', 'tin', 'win', 'chin', 'grin', 'shin', 'skin', 'spin', 'thin', 'twin'],
  '-ig': ['big', 'dig', 'fig', 'gig', 'jig', 'pig', 'rig', 'wig', 'brig', 'grig', 'prig', 'sprig', 'swig', 'twig'],
  '-ip': ['dip', 'hip', 'lip', 'nip', 'rip', 'sip', 'tip', 'zip', 'chip', 'clip', 'drip', 'flip', 'grip', 'ship', 'skip', 'slip', 'snip', 'strip', 'trip', 'whip'],
  '-id': ['bid', 'did', 'hid', 'kid', 'lid', 'rid', 'grid', 'skid', 'slid', 'squid'],
  '-ill': ['bill', 'dill', 'fill', 'gill', 'hill', 'ill', 'kill', 'mill', 'pill', 'sill', 'till', 'will', 'chill', 'drill', 'frill', 'grill', 'quill', 'skill', 'spill', 'still', 'thrill', 'trill'],
  '-ick': ['dick', 'kick', 'lick', 'nick', 'pick', 'quick', 'rick', 'sick', 'tick', 'wick', 'brick', 'chick', 'click', 'flick', 'prick', 'slick', 'stick', 'thick', 'trick'],
  '-ing': ['bing', 'ding', 'king', 'ping', 'ring', 'sing', 'wing', 'zing', 'bring', 'cling', 'fling', 'sling', 'sting', 'string', 'swing', 'thing', 'wring'],
  '-ink': ['ink', 'kink', 'link', 'mink', 'pink', 'rink', 'sink', 'wink', 'blink', 'brink', 'clink', 'drink', 'shrink', 'slink', 'stink', 'think'],

  // Short O families
  '-ot': ['cot', 'dot', 'got', 'hot', 'jot', 'lot', 'not', 'pot', 'rot', 'tot', 'blot', 'clot', 'knot', 'plot', 'shot', 'slot', 'spot', 'trot'],
  '-op': ['bop', 'cop', 'hop', 'mop', 'pop', 'sop', 'top', 'chop', 'crop', 'drop', 'flop', 'plop', 'prop', 'shop', 'slop', 'stop'],
  '-og': ['bog', 'cog', 'dog', 'fog', 'hog', 'jog', 'log', 'blog', 'clog', 'flog', 'frog', 'grog', 'slog', 'smog'],
  '-ob': ['bob', 'cob', 'gob', 'job', 'mob', 'rob', 'sob', 'blob', 'glob', 'knob', 'slob', 'snob', 'throb'],
  '-ock': ['cock', 'dock', 'hock', 'knock', 'lock', 'mock', 'rock', 'sock', 'block', 'clock', 'crock', 'flock', 'frock', 'shock', 'smock', 'stock'],
  '-ong': ['bong', 'dong', 'gong', 'long', 'pong', 'song', 'tong', 'prong', 'strong', 'thong', 'wrong'],

  // Short U families
  '-ut': ['but', 'cut', 'gut', 'hut', 'jut', 'nut', 'put', 'rut', 'tut', 'glut', 'shut', 'slut', 'smut', 'strut'],
  '-un': ['bun', 'dun', 'fun', 'gun', 'nun', 'pun', 'run', 'sun', 'shun', 'spun', 'stun'],
  '-ug': ['bug', 'dug', 'hug', 'jug', 'lug', 'mug', 'pug', 'rug', 'tug', 'chug', 'drug', 'plug', 'slug', 'smug', 'snug', 'thug'],
  '-up': ['cup', 'pup', 'sup'],
  '-ub': ['cub', 'dub', 'hub', 'nub', 'pub', 'rub', 'sub', 'tub', 'club', 'grub', 'scrub', 'shrub', 'snub', 'stub'],
  '-uck': ['buck', 'duck', 'luck', 'muck', 'puck', 'suck', 'tuck', 'yuck', 'chuck', 'cluck', 'pluck', 'shuck', 'stuck', 'struck', 'truck'],
  '-ump': ['bump', 'dump', 'hump', 'jump', 'lump', 'pump', 'rump', 'sump', 'chump', 'clump', 'grump', 'plump', 'slump', 'stump', 'thump', 'trump'],
  '-unk': ['bunk', 'dunk', 'funk', 'gunk', 'hunk', 'junk', 'punk', 'sunk', 'chunk', 'drunk', 'flunk', 'plunk', 'shrunk', 'skunk', 'slunk', 'spunk', 'stunk', 'trunk'],
  '-ung': ['bung', 'dung', 'hung', 'lung', 'rung', 'sung', 'clung', 'flung', 'slung', 'sprung', 'stung', 'strung', 'swung', 'wrung', 'young'],
  '-uss': ['buss', 'fuss', 'muss', 'puss', 'plus', 'truss']
};

// =============================================================================
// REFERENCE DATA: COMPLETE PHONOGRAM LIST
// All English phonograms with example words
// =============================================================================
const phonogramData: Record<string, { sound: string; position: string; examples: string[] }> = {
  // Consonant Digraphs
  'sh': { sound: '/sh/', position: 'beginning or end', examples: ['ship', 'shop', 'shell', 'fish', 'dish', 'wish', 'wash', 'brush', 'crash', 'splash'] },
  'ch': { sound: '/ch/', position: 'beginning or end', examples: ['chip', 'chop', 'chin', 'chair', 'cheese', 'rich', 'much', 'such', 'each', 'beach', 'teach', 'lunch'] },
  'th': { sound: '/th/ (voiced or unvoiced)', position: 'beginning or end', examples: ['this', 'that', 'the', 'them', 'then', 'thin', 'thick', 'thing', 'thank', 'think', 'three', 'with', 'bath', 'math', 'path'] },
  'wh': { sound: '/wh/ or /w/', position: 'beginning', examples: ['what', 'when', 'where', 'which', 'white', 'whale', 'wheel', 'wheat', 'whisper', 'whistle'] },
  'ck': { sound: '/k/', position: 'end (after short vowel)', examples: ['back', 'deck', 'kick', 'lock', 'duck', 'black', 'stick', 'truck', 'clock', 'brick'] },
  'ng': { sound: '/ng/', position: 'end', examples: ['ring', 'sing', 'song', 'long', 'king', 'thing', 'bring', 'spring', 'strong', 'young'] },
  'nk': { sound: '/nk/', position: 'end', examples: ['bank', 'sink', 'think', 'drink', 'trunk', 'blank', 'skunk', 'shrink'] },
  'ph': { sound: '/f/', position: 'beginning or end', examples: ['phone', 'photo', 'phrase', 'phantom', 'dolphin', 'elephant', 'alphabet', 'graph', 'paragraph'] },
  'gh': { sound: '/f/ or silent', position: 'end', examples: ['laugh', 'cough', 'enough', 'rough', 'tough', 'night', 'light', 'right', 'high', 'sigh'] },
  'kn': { sound: '/n/ (k silent)', position: 'beginning', examples: ['knee', 'knife', 'knit', 'knock', 'knot', 'know', 'knight', 'knob', 'kneel', 'knack'] },
  'wr': { sound: '/r/ (w silent)', position: 'beginning', examples: ['write', 'wrong', 'wrap', 'wrist', 'wreck', 'wrench', 'wrestle', 'wrinkle', 'wring', 'wrote'] },
  'gn': { sound: '/n/ (g silent)', position: 'beginning or end', examples: ['gnat', 'gnaw', 'gnome', 'sign', 'design', 'resign', 'foreign', 'reign'] },
  'mb': { sound: '/m/ (b silent)', position: 'end', examples: ['lamb', 'comb', 'bomb', 'climb', 'thumb', 'dumb', 'numb', 'crumb', 'limb', 'tomb'] },
  'tch': { sound: '/ch/', position: 'end (after short vowel)', examples: ['catch', 'match', 'watch', 'fetch', 'sketch', 'stitch', 'switch', 'witch', 'pitch', 'batch'] },
  'dge': { sound: '/j/', position: 'end (after short vowel)', examples: ['badge', 'edge', 'bridge', 'fridge', 'ridge', 'judge', 'fudge', 'budge', 'ledge', 'hedge'] },

  // Vowel Digraphs - Long A
  'ai': { sound: '/ā/ (long a)', position: 'middle', examples: ['rain', 'train', 'brain', 'chain', 'pain', 'main', 'tail', 'sail', 'nail', 'pail', 'wait', 'bait'] },
  'ay': { sound: '/ā/ (long a)', position: 'end', examples: ['day', 'play', 'say', 'way', 'may', 'stay', 'gray', 'pray', 'spray', 'tray', 'birthday', 'today'] },
  'a_e': { sound: '/ā/ (long a)', position: 'split', examples: ['make', 'cake', 'lake', 'take', 'bake', 'wake', 'game', 'name', 'came', 'same', 'safe', 'cave', 'gave', 'save', 'wave', 'brave'] },
  'eigh': { sound: '/ā/ (long a)', position: 'middle', examples: ['eight', 'weigh', 'sleigh', 'neighbor', 'freight', 'weight'] },
  'ey': { sound: '/ā/ or /ē/', position: 'end', examples: ['they', 'grey', 'prey', 'hey', 'obey', 'survey'] },

  // Vowel Digraphs - Long E
  'ee': { sound: '/ē/ (long e)', position: 'middle or end', examples: ['feet', 'tree', 'see', 'bee', 'free', 'green', 'sleep', 'keep', 'deep', 'week', 'need', 'feed', 'speed', 'three'] },
  'ea': { sound: '/ē/ (long e) usually', position: 'middle', examples: ['sea', 'read', 'eat', 'team', 'beach', 'cream', 'dream', 'clean', 'mean', 'bean', 'leaf', 'weak', 'speak', 'treat'] },
  'e_e': { sound: '/ē/ (long e)', position: 'split', examples: ['these', 'theme', 'gene', 'scene', 'extreme', 'complete', 'compete'] },
  'ie': { sound: '/ē/ (long e)', position: 'middle', examples: ['field', 'chief', 'thief', 'piece', 'niece', 'brief', 'belief', 'relief', 'achieve'] },

  // Vowel Digraphs - Long I
  'i_e': { sound: '/ī/ (long i)', position: 'split', examples: ['like', 'bike', 'time', 'five', 'nine', 'line', 'mine', 'hide', 'ride', 'side', 'wide', 'smile', 'white', 'write', 'drive'] },
  'igh': { sound: '/ī/ (long i)', position: 'middle', examples: ['high', 'light', 'night', 'right', 'bright', 'flight', 'fright', 'might', 'sight', 'tight', 'thigh', 'sigh'] },
  'y': { sound: '/ī/ (long i) at end', position: 'end', examples: ['my', 'by', 'fly', 'sky', 'try', 'cry', 'dry', 'fry', 'why', 'shy', 'spy', 'sly'] },
  'ie_long_i': { sound: '/ī/ (long i)', position: 'end', examples: ['pie', 'tie', 'lie', 'die', 'vie'] },

  // Vowel Digraphs - Long O
  'oa': { sound: '/ō/ (long o)', position: 'middle', examples: ['boat', 'coat', 'road', 'soap', 'toast', 'float', 'goat', 'load', 'roast', 'coach', 'foam', 'groan'] },
  'ow': { sound: '/ō/ (long o)', position: 'middle or end', examples: ['snow', 'grow', 'show', 'blow', 'flow', 'glow', 'know', 'throw', 'slow', 'yellow', 'window', 'follow', 'elbow', 'rainbow'] },
  'o_e': { sound: '/ō/ (long o)', position: 'split', examples: ['home', 'bone', 'cone', 'hole', 'note', 'hope', 'rope', 'rose', 'nose', 'stone', 'phone', 'stove', 'drove', 'woke', 'joke', 'smoke'] },
  'oe': { sound: '/ō/ (long o)', position: 'middle or end', examples: ['toe', 'hoe', 'doe', 'foe', 'goes', 'poem'] },

  // Vowel Digraphs - Long U
  'u_e': { sound: '/ū/ (long u)', position: 'split', examples: ['cute', 'huge', 'use', 'cube', 'tube', 'June', 'rule', 'mule', 'flute', 'prune', 'fuse', 'fume', 'mute'] },
  'ue': { sound: '/ū/ (long u)', position: 'end', examples: ['blue', 'clue', 'glue', 'true', 'due', 'sue', 'rescue', 'continue', 'value', 'argue', 'statue'] },
  'ew': { sound: '/ū/ (long u)', position: 'middle or end', examples: ['new', 'few', 'dew', 'drew', 'flew', 'grew', 'blew', 'chew', 'crew', 'stew', 'threw', 'jewel', 'news'] },

  // R-Controlled Vowels
  'ar': { sound: '/ar/', position: 'any', examples: ['car', 'star', 'far', 'bar', 'card', 'yard', 'farm', 'barn', 'park', 'dark', 'smart', 'start', 'chart', 'shark'] },
  'or': { sound: '/or/', position: 'any', examples: ['for', 'or', 'corn', 'horn', 'fork', 'pork', 'storm', 'north', 'short', 'sport', 'horse', 'more', 'store', 'score', 'before'] },
  'er': { sound: '/er/', position: 'any', examples: ['her', 'fern', 'after', 'sister', 'water', 'butter', 'letter', 'better', 'pepper', 'tiger', 'never', 'ever', 'under', 'over'] },
  'ir': { sound: '/er/', position: 'any', examples: ['bird', 'girl', 'first', 'third', 'shirt', 'stir', 'dirt', 'skirt', 'twirl', 'swirl', 'circle', 'birthday'] },
  'ur': { sound: '/er/', position: 'any', examples: ['fur', 'turn', 'burn', 'hurt', 'purple', 'turtle', 'nurse', 'purse', 'curb', 'church', 'burst', 'return', 'disturb'] },
  'ear': { sound: '/ēr/ or /er/', position: 'any', examples: ['ear', 'hear', 'near', 'dear', 'fear', 'year', 'clear', 'earth', 'learn', 'early', 'search', 'pearl'] },
  'air': { sound: '/âr/', position: 'any', examples: ['air', 'hair', 'pair', 'fair', 'chair', 'stair', 'repair', 'airplane'] },
  'are': { sound: '/âr/', position: 'end', examples: ['care', 'share', 'rare', 'bare', 'dare', 'fare', 'hare', 'mare', 'scare', 'spare', 'square', 'stare', 'prepare', 'compare'] },

  // Diphthongs
  'oo': { sound: '/o͞o/ or /o͝o/', position: 'middle', examples: ['moon', 'food', 'cool', 'room', 'tooth', 'pool', 'school', 'spoon', 'book', 'look', 'cook', 'good', 'wood', 'foot', 'hook', 'brook', 'stood'] },
  'ou': { sound: '/ou/', position: 'middle', examples: ['out', 'house', 'mouse', 'cloud', 'sound', 'found', 'round', 'ground', 'pound', 'count', 'about', 'south', 'mouth', 'loud', 'proud', 'couch'] },
  'ow_diphthong': { sound: '/ou/', position: 'middle or end', examples: ['cow', 'how', 'now', 'down', 'brown', 'town', 'crown', 'frown', 'clown', 'drown', 'flower', 'power', 'tower', 'shower', 'vowel', 'towel', 'owl', 'howl', 'growl'] },
  'oi': { sound: '/oi/', position: 'middle', examples: ['oil', 'coin', 'join', 'point', 'voice', 'choice', 'noise', 'moist', 'boil', 'soil', 'foil', 'spoil', 'avoid'] },
  'oy': { sound: '/oi/', position: 'end', examples: ['boy', 'toy', 'joy', 'enjoy', 'royal', 'loyal', 'voyage', 'annoy', 'destroy', 'employ'] },
  'aw': { sound: '/ô/', position: 'middle or end', examples: ['saw', 'paw', 'law', 'jaw', 'raw', 'claw', 'draw', 'straw', 'crawl', 'yawn', 'dawn', 'lawn', 'fawn', 'hawk', 'awful'] },
  'au': { sound: '/ô/', position: 'middle', examples: ['auto', 'fault', 'haul', 'haunt', 'laundry', 'sauce', 'cause', 'pause', 'because', 'applause', 'daughter', 'caught', 'taught'] },

  // Other Common Patterns
  'tion': { sound: '/shun/', position: 'end', examples: ['action', 'nation', 'station', 'vacation', 'education', 'information', 'question', 'attention', 'direction', 'collection', 'addition', 'subtraction'] },
  'sion': { sound: '/shun/ or /zhun/', position: 'end', examples: ['mission', 'session', 'passion', 'vision', 'decision', 'television', 'conclusion', 'confusion', 'explosion'] },
  'ture': { sound: '/cher/', position: 'end', examples: ['picture', 'nature', 'future', 'creature', 'culture', 'capture', 'mixture', 'furniture', 'adventure', 'temperature'] },
  'ous': { sound: '/us/', position: 'end', examples: ['famous', 'nervous', 'serious', 'curious', 'delicious', 'enormous', 'dangerous', 'mysterious', 'tremendous', 'marvelous'] },
  'ough': { sound: 'varies', position: 'end', examples: ['through (oo)', 'though (ō)', 'thought (ô)', 'rough (uf)', 'cough (of)', 'bough (ou)', 'enough (uf)', 'dough (ō)'] },
  'ful': { sound: '/ful/', position: 'end (suffix)', examples: ['helpful', 'careful', 'joyful', 'beautiful', 'wonderful', 'powerful', 'thankful', 'colorful', 'peaceful'] },
  'less': { sound: '/les/', position: 'end (suffix)', examples: ['helpless', 'careless', 'fearless', 'homeless', 'hopeless', 'endless', 'useless', 'harmless', 'countless'] },
  'able': { sound: '/əbəl/', position: 'end (suffix)', examples: ['able', 'table', 'stable', 'comfortable', 'available', 'reasonable', 'enjoyable', 'valuable'] },
  'ible': { sound: '/əbəl/', position: 'end (suffix)', examples: ['possible', 'visible', 'terrible', 'horrible', 'responsible', 'incredible', 'flexible'] }
};

// =============================================================================
// REFERENCE DATA: GRAMMAR BOX SENTENCES
// Example sentences for each of the 9 Grammar Boxes
// =============================================================================
const grammarBoxSentences: Record<string, { instruction: string; sentences: string[] }> = {
  'Box 1 - Article': {
    instruction: 'Fill in with: the, a, an',
    sentences: [
      '___ dog ran fast.',
      '___ apple is red.',
      '___ sun is bright.',
      'I see ___ elephant.',
      '___ cat sat on ___ mat.',
      'She ate ___ orange.',
      'He found ___ egg.',
      '___ umbrella is blue.',
      'We saw ___ lion at ___ zoo.',
      'I want ___ book from ___ library.'
    ]
  },
  'Box 2 - Adjective': {
    instruction: 'Fill in with a describing word',
    sentences: [
      'The ___ dog barked.',
      'I ate a ___ apple.',
      'She wore a ___ dress.',
      'The ___ bird sang.',
      'He has ___ eyes.',
      'We saw a ___ mountain.',
      'The ___ flower bloomed.',
      'I like the ___ cat.',
      'She found a ___ shell.',
      'The ___ boy ran fast.'
    ]
  },
  'Box 3 - Noun': {
    instruction: 'Fill in with a naming word (person, place, thing)',
    sentences: [
      'The ___ is sleeping.',
      'I see a ___.',
      'The ___ is on the table.',
      'My ___ is kind.',
      'The ___ flew away.',
      'I put the ___ in the box.',
      'The ___ is very tall.',
      'She gave me a ___.',
      'The ___ swims in water.',
      'We went to the ___.'
    ]
  },
  'Box 4 - Verb': {
    instruction: 'Fill in with an action word',
    sentences: [
      'The dog ___.',
      'I ___ to school.',
      'She ___ a book.',
      'The bird ___ in the sky.',
      'He ___ the ball.',
      'We ___ our dinner.',
      'The cat ___ the mouse.',
      'They ___ in the pool.',
      'I ___ my shoes.',
      'She ___ the door.'
    ]
  },
  'Box 5 - Preposition': {
    instruction: 'Fill in with a position word (on, in, under, beside, behind, etc.)',
    sentences: [
      'The cat sat ___ the box.',
      'The book is ___ the table.',
      'She hid ___ the tree.',
      'The bird flew ___ the house.',
      'He put it ___ the drawer.',
      'The dog ran ___ the yard.',
      'She stood ___ her mom.',
      'The ball rolled ___ the fence.',
      'We walked ___ the bridge.',
      'The fish swam ___ the water.'
    ]
  },
  'Box 6 - Adverb': {
    instruction: 'Fill in with a word that tells how',
    sentences: [
      'She walked ___.',
      'The turtle moved ___.',
      'He spoke ___.',
      'The bird sang ___.',
      'She danced ___.',
      'The car drove ___.',
      'He ate ___.',
      'She wrote ___.',
      'The dog ran ___.',
      'They worked ___.'
    ]
  },
  'Box 7 - Pronoun': {
    instruction: 'Fill in with: I, you, he, she, it, we, they',
    sentences: [
      '___ am happy.',
      '___ is my friend.',
      '___ are playing.',
      '___ like to read.',
      '___ is a beautiful day.',
      '___ went to the store.',
      '___ can do it.',
      '___ are kind people.',
      '___ was very tired.',
      '___ will help you.'
    ]
  },
  'Box 8 - Conjunction': {
    instruction: 'Fill in with: and, or, but, so, because',
    sentences: [
      'I like cats ___ dogs.',
      'Do you want tea ___ coffee?',
      'She tried hard ___ she won.',
      'I was hungry ___ I ate lunch.',
      'He ran fast ___ he was late.',
      'We can go now ___ later.',
      'It was raining ___ I took an umbrella.',
      'She is smart ___ kind.',
      'I wanted to go ___ I was sick.',
      'Read a book ___ play a game.'
    ]
  },
  'Box 9 - Interjection': {
    instruction: 'Fill in with: Oh, Wow, Ouch, Yay, Hooray, Oops, Shh, Hey, Ah, Ugh',
    sentences: [
      '___! That hurt!',
      '___! What a beautiful sunset!',
      '___! I forgot my homework.',
      '___! We won the game!',
      '___! Be quiet please.',
      '___! Look at that!',
      '___! I did it!',
      '___! That was hard work.',
      '___! I understand now.',
      '___! It\'s cold outside!'
    ]
  }
};

// =============================================================================
// REFERENCE DATA: DETAILED SHELF ORGANIZATION
// Comprehensive guide with tiers, quantities, and specifications
// 🟢 Essential | 🔵 Complete | 🟣 Premium
// =============================================================================

interface ShelfItemDetail {
  name: string;
  tier: 'essential' | 'complete' | 'premium';
  what: string;
  quantity: string;
  size: string;
  container: string;
  contents?: string[];
  tips: string;
  price: string;
}

interface ShelfItem {
  name: string;
  details: ShelfItemDetail[];
}

interface ShelfData {
  shelf: string;
  position: string;
  items: ShelfItem[];
  notes: string;
}

const detailedShelfOrganization: ShelfData[] = [
  {
    shelf: 'Shelf 1: Oral Language',
    position: 'Top left of language area',
    notes: 'Foundation of all language work. Start here with youngest children (2.5+). Builds vocabulary needed before reading.',
    items: [
      {
        name: 'Vocabulary baskets (categorized)',
        details: [
          {
            name: 'Vocabulary Baskets',
            tier: 'essential',
            what: 'Small baskets with miniature realistic objects grouped by theme. Used for Three-Period Lessons to build spoken vocabulary.',
            quantity: '8-10 baskets on shelf (15 total for rotation)',
            size: 'Baskets: 20-22cm diameter × 8-10cm height. Objects: 2-4cm each.',
            container: 'Natural wicker or bamboo baskets, low-sided for child access',
            contents: [
              '🐄 Farm Animals: cow, pig, horse, sheep, chicken, duck, goat, rooster',
              '🦁 Wild Animals: lion, elephant, giraffe, zebra, hippo, tiger, monkey',
              '🐠 Ocean Life: whale, dolphin, shark, octopus, starfish, crab, turtle',
              '🚗 Transportation: car, truck, bus, airplane, train, boat, bicycle',
              '🍎 Fruits: apple, banana, orange, grapes, strawberry, pear, lemon',
              '🥕 Vegetables: carrot, tomato, broccoli, potato, corn, pepper',
              '🔧 Tools: hammer, screwdriver, wrench, pliers, saw',
              '🏠 Household: spoon, fork, cup, plate, key, lamp, brush'
            ],
            tips: 'Start with Safari Ltd TOOB tubes (~¥80 each, 10-12 figures). Begin with 3-4 objects per basket for young children, increase to 6-8 for older. Rotate themes monthly.',
            price: '¥400-600 for 8 baskets + 80 objects'
          },
          {
            name: 'Vocabulary Baskets',
            tier: 'complete',
            what: 'Extended collection with 20-25 themed baskets covering curriculum areas: animals by continent, botany, geography, community helpers.',
            quantity: '12 baskets on shelf (25 total for rotation)',
            size: 'Mix of small (20cm) and medium (25cm) baskets',
            container: 'Matching natural wicker set with fabric liners',
            contents: [
              'All Essential themes PLUS:',
              '🌍 Animals by Continent sets (7 sets)',
              '🌸 Botany: flowers, trees, leaves',
              '👨‍🚒 Community Helpers: firefighter, doctor, teacher, chef',
              '🎵 Musical Instruments: drum, guitar, trumpet, violin, flute',
              '🦋 Insects: butterfly, bee, ladybug, ant, dragonfly, caterpillar'
            ],
            tips: 'Use Schleich figures for exceptional realism. Label baskets with picture + word. Include matching 3-part cards for each basket.',
            price: '¥1,000-1,500 for 25 baskets + 150 objects'
          },
          {
            name: 'Vocabulary Baskets',
            tier: 'premium',
            what: 'Comprehensive museum-quality collection with seasonal rotation system, custom storage cabinet, and complete curriculum coverage.',
            quantity: '15+ baskets on shelf (30+ total)',
            size: 'Graduated sizes in matching set',
            container: 'Custom wooden cabinet with labeled compartments',
            contents: [
              'All Complete themes PLUS:',
              '🎄 Seasonal sets (4 seasons)',
              '🎃 Holiday-themed sets',
              '🔬 Science: magnets, simple machines, weather',
              '🎨 Art tools and materials',
              '🌿 Extended botany: parts of plants, life cycles'
            ],
            tips: 'Schleich or CollectA for all animals. Include real items where possible (shells, seeds, rocks). Photo documentation of each basket for inventory.',
            price: '¥2,500-4,000 for premium setup'
          }
        ]
      },
      {
        name: 'Three-part card sets (in boxes)',
        details: [
          {
            name: 'Three-Part Cards',
            tier: 'essential',
            what: 'Nomenclature cards with 3 parts: Control card (picture + label), Picture card, Label card. Child matches picture to control, then reads label to match.',
            quantity: '15-20 complete sets',
            size: 'Control: 9.5×12.7cm, Picture: 9.5×10.2cm, Label: 9.5×2.5cm',
            container: 'Felt pouches (color-coded by subject) or small wooden boxes',
            contents: [
              '🏠 Household items (spoon, cup, chair, bed)',
              '👕 Clothing (shirt, pants, shoes, hat)',
              '🍽️ Foods (bread, milk, egg, apple)',
              '👨‍👩‍👧 Family members (mother, father, baby)',
              '🐕 Pets (dog, cat, fish, bird)'
            ],
            tips: 'Use REAL photographs, not clip art. Print on 80lb cardstock (216gsm), laminate with 5-mil. Start with 4-6 cards per set for beginners.',
            price: '¥150-300 (DIY) or ¥400-600 (purchased sets)'
          },
          {
            name: 'Three-Part Cards',
            tier: 'complete',
            what: 'Professional quality sets covering full curriculum with matching objects for concrete-to-abstract progression.',
            quantity: '25-30 sets with rotation system',
            size: 'Standard Nienhuis dimensions',
            container: 'Wooden boxes with sliding lids, labeled',
            contents: [
              'All Essential sets PLUS:',
              '🌍 Continents and countries',
              '🚂 Transportation by type',
              '👨‍⚕️ Community helpers',
              '🌸 Botany nomenclature',
              '🦴 Zoology nomenclature'
            ],
            tips: 'Store control cards separately (in envelope behind box). Include corresponding miniature object where possible.',
            price: '¥800-1,200'
          },
          {
            name: 'Three-Part Cards',
            tier: 'premium',
            what: 'Complete Nienhuis-quality collection with custom cabinet, extension activities, and bilingual options.',
            quantity: '40+ sets',
            size: 'Museum-quality printing',
            container: 'Dedicated card cabinet with 40+ compartments',
            contents: [
              'Complete curriculum coverage',
              'Bilingual sets (English/Chinese)',
              'Extension definition cards',
              'Sentence strips for each set'
            ],
            tips: 'Professional printing on 300gsm with matte lamination. Include answer booklets for independent work.',
            price: '¥2,000-3,500'
          }
        ]
      },
      {
        name: 'Parts-of cards',
        details: [
          {
            name: 'Parts-of Cards',
            tier: 'essential',
            what: 'Cards showing whole item with ONE part highlighted in red, others grayed. Teaches anatomical vocabulary for botany and zoology.',
            quantity: '5 essential sets',
            size: 'Same as 3-part cards: 9.5×12.7cm',
            container: 'Felt pouches, stored with matching puzzle if available',
            contents: [
              '🌳 Parts of a Tree: trunk, branches, roots, leaves, crown',
              '🍃 Parts of a Leaf: blade, petiole, veins, margin, midrib',
              '🌸 Parts of a Flower: petals, sepals, stamen, pistil, stem',
              '🐦 Parts of a Bird: beak, wings, tail, feet, feathers',
              '🐟 Parts of a Fish: fins, gills, scales, tail, eye'
            ],
            tips: 'Use with 3D wooden puzzles (tree puzzle, leaf puzzle, flower puzzle) for concrete experience first.',
            price: '¥200-400'
          },
          {
            name: 'Parts-of Cards',
            tier: 'complete',
            what: 'Extended collection covering full primary botany and zoology curriculum.',
            quantity: '12 sets',
            size: 'Standard dimensions',
            container: 'Organized by subject (Botany/Zoology folders)',
            contents: [
              'All Essential PLUS:',
              '🌱 Parts of a Root, Seed, Fruit',
              '🐴 Parts of a Horse (with wooden puzzle)',
              '🐢 Parts of a Turtle',
              '🐸 Parts of a Frog (life cycle)',
              '🦋 Parts of an Insect'
            ],
            tips: 'Pair with real specimens where possible (real leaves, shells, feathers). Add definition cards for older children.',
            price: '¥500-900'
          },
          {
            name: 'Parts-of Cards',
            tier: 'premium',
            what: 'Complete AMI collection with wooden puzzles, specimens, and extension materials.',
            quantity: '20+ sets',
            size: 'Premium printing',
            container: 'Dedicated puzzle cabinet + card storage',
            contents: [
              'All Complete sets PLUS matching wooden puzzles',
              'Microscope work extensions',
              'Life cycle materials',
              'Definition and function cards'
            ],
            tips: 'Nienhuis wooden puzzles are the gold standard. Include magnifying glasses for specimen examination.',
            price: '¥2,000-4,000 (including puzzles)'
          }
        ]
      },
      {
        name: 'Classified pictures',
        details: [
          {
            name: 'Classified Pictures',
            tier: 'essential',
            what: 'Picture collections for sorting and classification. Simpler than 3-part cards - just images for grouping activities.',
            quantity: '10 categories, 8-10 pictures each',
            size: '7.5×10cm cards',
            container: 'File folders, color-coded by category',
            contents: [
              'Foods by type (fruits, vegetables, grains, dairy, protein)',
              'Animals by habitat (farm, ocean, jungle, forest)',
              'Transport by medium (land, water, air)'
            ],
            tips: 'Use for sorting on mat. Progress to classification charts. Great for younger children before 3-part cards.',
            price: '¥100-200'
          },
          {
            name: 'Classified Pictures',
            tier: 'complete',
            what: 'Comprehensive classification system with sorting charts and extension activities.',
            quantity: '20 categories, 10-12 pictures each',
            size: 'Standard card size with sorting mats',
            container: 'Basket system with labeled compartments',
            contents: [
              'Living/Non-living',
              'Animal kingdoms (vertebrates, invertebrates)',
              'Plant types',
              'Materials (wood, metal, glass, plastic)'
            ],
            tips: 'Include blank sorting charts and classification trees. Add real objects to match.',
            price: '¥300-500'
          }
        ]
      },
      {
        name: 'Definition cards',
        details: [
          {
            name: 'Definition Cards',
            tier: 'complete',
            what: 'Advanced vocabulary cards with child-friendly definitions. For fluent readers (5-6 years).',
            quantity: '10-15 sets',
            size: 'Definition card: 9.5×7.5cm',
            container: 'With corresponding 3-part card sets',
            contents: [
              'Geometry shape definitions',
              'Land and water form definitions',
              'Botany term definitions',
              'Grammar term definitions'
            ],
            tips: 'Keep definitions brief (1-2 sentences). Include "definition with word blank" for matching activity.',
            price: '¥200-400'
          }
        ]
      }
    ]
  },
  {
    shelf: 'Shelf 2: Sound Games & Sandpaper Letters',
    position: 'Below oral language',
    notes: 'Phonemic awareness foundation. CRITICAL: All sound work happens WITHOUT written letters first. Child must hear sounds before seeing symbols.',
    items: [
      {
        name: 'Initial sound objects basket',
        details: [
          {
            name: 'Initial Sound Objects',
            tier: 'essential',
            what: 'Miniature objects for I Spy games. Train the ear to isolate beginning sounds in words - the foundation of reading.',
            quantity: '78 objects minimum (3 per letter)',
            size: 'Objects 1-4cm each (most 2-3cm)',
            container: 'Divided compartment box (23+ sections) or individual pouches',
            contents: [
              'A: alligator, apple, ant',
              'B: bear, bus, banana',
              'C: cat, car, cup',
              'D: dog, duck, dinosaur',
              'E: elephant, egg, elf',
              'F: fish, frog, fork',
              'G: goat, grapes, guitar',
              'H: hat, horse, hammer',
              'I: igloo, iguana, insect',
              'J: jet, jar, jellyfish',
              'K: key, kite, kangaroo',
              'L: lion, leaf, lemon',
              'M: mouse, moon, mop',
              'N: nest, nut, nail',
              'O: octopus, orange, otter',
              'P: pig, pen, pizza',
              'Q: queen, quilt',
              'R: rabbit, ring, robot',
              'S: sun, snake, star',
              'T: tiger, tree, turtle',
              'U: umbrella, unicorn',
              'V: van, violin, vase',
              'W: whale, watch, wagon',
              'X: (use for ending: fox, box)',
              'Y: yo-yo, yarn, yak',
              'Z: zebra, zipper, zero'
            ],
            tips: 'Say SOUNDS not letter names: "/b/" not "bee". Start with single object, add more as child progresses. Safari TOOB tubes are perfect source.',
            price: '¥300-500'
          },
          {
            name: 'Initial Sound Objects',
            tier: 'complete',
            what: 'Extended collection with 4-5 objects per sound, including digraphs (sh, ch, th, wh).',
            quantity: '110+ objects plus digraph sets',
            size: '1-4cm each',
            container: 'Large compartment box or basket system with letter labels',
            contents: [
              '4-5 objects per letter',
              'PLUS Digraphs:',
              'SH: shark, sheep, shell, ship, shoe',
              'CH: chair, cheese, cherry, chicken',
              'TH: thimble, thread, thumb',
              'WH: whale, wheel, whistle'
            ],
            tips: 'Include picture cards matching each object. Add rhyming object sets for extension.',
            price: '¥600-900'
          },
          {
            name: 'Initial Sound Objects',
            tier: 'premium',
            what: 'Comprehensive collection with 5+ objects per sound, all digraphs, sorting trays, and matching nomenclature.',
            quantity: '150+ objects',
            size: 'Premium quality figures',
            container: 'Custom wooden sorting cabinet with 30+ compartments',
            contents: [
              '5+ objects per letter (Schleich/CollectA quality)',
              'Complete digraph collection',
              'Picture matching cards',
              'Sorting trays and mats'
            ],
            tips: 'Include sound sorting mats. Add ending sound objects for extension. Document with photo inventory.',
            price: '¥1,200-2,000'
          }
        ]
      },
      {
        name: 'CVC object sets',
        details: [
          {
            name: 'CVC Object Sets',
            tier: 'essential',
            what: 'Miniature objects for 3-letter phonetic words (Consonant-Vowel-Consonant). Used with Moveable Alphabet for first word building.',
            quantity: '40 objects (8 per vowel sound)',
            size: '2-4cm each',
            container: '5 PINK containers (one per short vowel)',
            contents: [
              '🔴 Short A: cat, bat, hat, can, fan, map, bag, cap',
              '🔴 Short E: bed, hen, net, pen, jet, web, leg, peg',
              '🔴 Short I: pig, pin, wig, bib, lid, fig, kit, fin',
              '🔴 Short O: dog, box, pot, mop, fox, top, log, cob',
              '🔴 Short U: bug, mug, cup, bus, tub, jug, sun, nut'
            ],
            tips: 'Organize by vowel sound, NOT word family. Child builds word with Moveable Alphabet, then checks with object. Pink containers match "Pink Series".',
            price: '¥200-400'
          },
          {
            name: 'CVC Object Sets',
            tier: 'complete',
            what: 'Extended CVC collection with matching word cards and picture cards for full Pink Series progression.',
            quantity: '60 objects + matching cards',
            size: 'Objects + 6×2.5cm word labels',
            container: 'Pink boxes with word cards in envelope',
            contents: [
              '10-12 objects per vowel',
              'Matching word cards (pink border)',
              'Picture cards for reading without objects',
              'Control lists for self-checking'
            ],
            tips: 'Progress: Object → Build word → Object + word card → Picture + word card → Word card only',
            price: '¥400-700'
          }
        ]
      },
      {
        name: 'Sandpaper letter box (lowercase)',
        details: [
          {
            name: 'Sandpaper Letters - Lowercase',
            tier: 'essential',
            what: 'Textured letters on colored boards. Child traces while saying SOUND (not name). Connects sound to written symbol through touch.',
            quantity: '1 complete set (26 letters)',
            size: 'Boards: 15.9×12cm or 19×14cm. Fine-grit sandpaper.',
            container: 'Compartmentalized wooden box',
            contents: [
              'Pink/Red boards: 21 consonants',
              'Blue boards: 5 vowels (a, e, i, o, u)',
              'Lowercase CURSIVE (AMI standard) or Print'
            ],
            tips: 'CURSIVE is traditional AMI - one continuous stroke aids muscle memory. Say SOUND while tracing: "/s/" not "ess". Use Two-finger tracing (index + middle).',
            price: '¥120-350'
          },
          {
            name: 'Sandpaper Letters - Lowercase',
            tier: 'complete',
            what: 'Quality set with consistent sandpaper texture, plus capital letters.',
            quantity: '1 lowercase + 1 capital set',
            size: 'Standard Nienhuis dimensions',
            container: 'Matching wooden boxes',
            contents: [
              '26 lowercase letters',
              '26 capital letters',
              'Color-coded: consonants/vowels'
            ],
            tips: 'Introduce capitals AFTER lowercase mastery. Use Three-Period Lesson for introduction.',
            price: '¥400-700'
          },
          {
            name: 'Sandpaper Letters - Lowercase',
            tier: 'premium',
            what: 'Nienhuis quality with digraph boards and double sets for busy classrooms.',
            quantity: '2 lowercase + capitals + digraphs',
            size: 'Nienhuis standard',
            container: 'Premium wooden storage',
            contents: [
              '2 complete lowercase sets',
              '1 capital set',
              'Green digraph boards: sh, ch, th, wh, ck, ng, qu'
            ],
            tips: 'Double set allows two children to work simultaneously. Digraphs on GREEN boards for visual distinction.',
            price: '¥800-1,500'
          }
        ]
      },
      {
        name: 'Sand tray with tools',
        details: [
          {
            name: 'Sand Tray',
            tier: 'essential',
            what: 'Shallow tray with fine sand for practicing letter formation. Bridges sandpaper letters to chalkboard to paper writing.',
            quantity: '2-3 trays for 20 children',
            size: 'Tray: 26×16cm (small) or 30×20cm (standard). Depth: 3-4cm.',
            container: 'Wooden tray with low sides',
            contents: [
              'Wooden tray',
              'Fine white sand (1-2kg)',
              'Wooden stylus (14cm)',
              'Scraper/smoother (20-27cm) for erasing'
            ],
            tips: 'Child traces sandpaper letter, then writes in sand. Finger is primary tool - stylus for refinement. Salt or cornmeal work as sand alternatives.',
            price: '¥150-300'
          },
          {
            name: 'Sand Tray',
            tier: 'complete',
            what: 'Multiple trays with lids for dust-free storage, colored sand options.',
            quantity: '4-5 trays',
            size: 'Medium: 30×20cm',
            container: 'Trays with fitted lids',
            contents: [
              'Multiple trays for simultaneous use',
              'White sand + colored options',
              'Tools for each tray',
              'Spray bottle for moisture'
            ],
            tips: 'Lids essential for storage. Different colored sand for visual interest and seasonal rotation.',
            price: '¥400-600'
          }
        ]
      }
    ]
  },
  {
    shelf: 'Shelf 3: Metal Insets',
    position: 'Dedicated writing preparation area',
    notes: 'Develops pencil control, proper grip, and continuous strokes through design work. The PRIMARY handwriting preparation. Daily practice recommended.',
    items: [
      {
        name: 'Metal Insets with stands',
        details: [
          {
            name: 'Metal Insets - Complete Set',
            tier: 'essential',
            what: '10 geometric shapes for tracing and filling. Develops hand control needed for handwriting without letter formation pressure.',
            quantity: '1 complete set',
            size: 'Frames and insets: 14×14cm exactly',
            container: '2 sloping wooden stands (75×16×3.5cm each)',
            contents: [
              'STRAIGHT-SIDED (5): Square, Rectangle, Triangle, Pentagon, Trapezoid',
              'CURVED (5): Circle, Oval, Ellipse, Quatrefoil, Curvilinear Triangle',
              'Colors: BLUE insets with knob, PINK/RED frames'
            ],
            tips: 'Start with circle (easiest). Trace INSIDE of frame first, then double outline. Fill with horizontal LEFT-TO-RIGHT lines (reading direction practice).',
            price: '¥350-600'
          },
          {
            name: 'Metal Insets - Complete Set',
            tier: 'complete',
            what: 'Professional quality insets with dedicated storage and ample supplies.',
            quantity: '1-2 complete sets',
            size: 'Standard 14×14cm',
            container: 'Stands + dedicated shelf space',
            contents: [
              'Complete 10-shape set',
              '2 wooden stands',
              'Paper cabinet nearby',
              'Pencil organizers'
            ],
            tips: 'Second set allows more children to work. Display completed work to inspire. Show progression of designs.',
            price: '¥600-1,000'
          },
          {
            name: 'Metal Insets - Complete Set',
            tier: 'premium',
            what: 'Nienhuis quality with frame cabinet and extensive supplies.',
            quantity: '2-3 sets',
            size: 'Nienhuis standard',
            container: 'Floor frame cabinet (72×23×76cm)',
            contents: [
              '2+ complete sets',
              'Frame cabinet holding all materials',
              'Extensive paper supply',
              'Full colored pencil system'
            ],
            tips: 'Frame cabinet is beautiful and practical - holds everything. Worth the investment for proper classroom.',
            price: '¥1,500-3,000'
          }
        ]
      },
      {
        name: 'Inset paper box (14×14cm)',
        details: [
          {
            name: 'Metal Inset Paper',
            tier: 'essential',
            what: 'Paper cut to EXACT frame size. Must be 14×14cm to match frames precisely.',
            quantity: '500-750 sheets/month for 20 children',
            size: '14×14cm EXACTLY (5.5×5.5 inches)',
            container: 'Wooden paper box or tray',
            contents: [
              'White paper (primary)',
              '3-4 colors for variety',
              '20lb bond weight'
            ],
            tips: 'Paper MUST match frame size exactly - this IS the control of error. Pre-cut or use paper cutter. Children go through lots of paper - stock up!',
            price: '¥80-150/month'
          },
          {
            name: 'Metal Inset Paper',
            tier: 'complete',
            what: 'Full color range with organized storage system.',
            quantity: '1,000-1,500 sheets/month',
            size: '14×14cm',
            container: 'Multi-compartment paper box',
            contents: [
              'White + 5 colors',
              'Organized by color',
              'Consistent 20lb weight'
            ],
            tips: 'Color paper makes beautiful designs. Rotate colors monthly for variety. Save paper by demonstrating technique well.',
            price: '¥150-250/month'
          }
        ]
      },
      {
        name: 'Colored pencil holders (11 colors)',
        details: [
          {
            name: 'Colored Pencils - System',
            tier: 'essential',
            what: 'Triangular colored pencils organized by color in individual holders. One color per holder.',
            quantity: '11 colors × 12 pencils = 132 minimum',
            size: 'Pencils: 3-sided grip, 3.8mm lead',
            container: '11 individual wooden holders (one per color)',
            contents: [
              'Standard 11 colors: red, orange, yellow, light green, dark green, light blue, dark blue, purple, pink, brown, black',
              'Triangular grip for proper hold',
              'Thick lead for beginners'
            ],
            tips: 'Triangular pencils teach tripod grip naturally. Sharpen daily - dull pencils frustrate children. Brands: Lyra Groove, Staedtler Noris Junior.',
            price: '¥200-400 for pencils + holders'
          }
        ]
      }
    ]
  },
  {
    shelf: 'Shelf 4: Moveable Alphabet & Word Building',
    position: 'Central language area',
    notes: 'The BREAKTHROUGH material! Child WRITES (encodes) before READING (decodes). Moveable letters allow expression without fine motor demands of pencil.',
    items: [
      {
        name: 'Large Moveable Alphabet box',
        details: [
          {
            name: 'Large Moveable Alphabet (LMA)',
            tier: 'essential',
            what: 'Box of loose letters for building words. Child selects letters for sounds heard - first writing! Red/pink consonants, blue vowels.',
            quantity: '2 sets for 20 children',
            size: 'Short letters: 5cm tall. Tall letters (b,d,f,h,k,l,t): 8.5-9cm. Box: 58-61×25-35×8cm',
            container: 'Compartmentalized wooden box with letter guide on bottom',
            contents: [
              'VOWELS: 10-15 of each (a, e, i, o, u) = 50-75 blue',
              'CONSONANTS: 5-10 of each (21 letters) = 105-210 pink',
              'High-frequency: extra n, r, s, t (10+ each)',
              'Total: ~155-285 letters per set'
            ],
            tips: 'Child builds words on mat below box. Start with CVC objects: "Build the word CAT". Progress: Objects → Pictures → Word lists → Sentences. NOT for reading - for WRITING.',
            price: '¥300-600 per set'
          },
          {
            name: 'Large Moveable Alphabet (LMA)',
            tier: 'complete',
            what: 'Quality wooden or plastic sets with ample quantities for active classroom.',
            quantity: '3 sets',
            size: 'Standard dimensions',
            container: 'Matching wooden boxes',
            contents: [
              'Vowels: 15 each',
              'Consonants: 8-10 each',
              'Extra common letters'
            ],
            tips: 'Multiple sets allow simultaneous work. Check daily that letters are sorted correctly - children mix them up!',
            price: '¥800-1,500 for 3 sets'
          },
          {
            name: 'Large Moveable Alphabet (LMA)',
            tier: 'premium',
            what: 'Nienhuis quality with maximum letter quantities and perfect consistency.',
            quantity: '4 sets',
            size: 'Nienhuis: thick durable plastic',
            container: 'Premium boxes with silk-screened guides',
            contents: [
              'Vowels: 15 each',
              'Consonants: 10 each',
              'Perfectly consistent sizing'
            ],
            tips: 'Nienhuis letters last decades. Worth investment for proper classroom. Thick plastic resists breaking.',
            price: '¥1,800-3,000 for 4 sets'
          }
        ]
      },
      {
        name: 'Pink/Blue/Green object boxes',
        details: [
          {
            name: 'Pink Series Materials',
            tier: 'essential',
            what: 'Complete CVC (3-letter word) reading system. Pink = phonetic 3-letter words. Objects → Pictures → Word cards → Booklets.',
            quantity: '1 complete Pink Series set',
            size: 'Objects: 2-4cm. Cards: 7.5×10cm. Booklets: 14×11cm.',
            container: 'Pink-colored boxes/containers',
            contents: [
              'OBJECT BOX: 30-50 CVC objects with word labels',
              'PICTURE CARDS: 48-60 pictures with matching word cards',
              'WORD LISTS: Short A, Short E, Short I, Short O, Short U',
              'PHRASE CARDS: "a fat cat", "the red hen"',
              'BOOKLETS: 24 mini-readers (one per word family)',
              'SIGHT WORDS: the, a, an, is, in, on, at, it, I, and, to'
            ],
            tips: 'Progression: Build words with LMA + objects → Read word labels → Read phrases → Read booklets. Pink = CVC only, no exceptions!',
            price: '¥400-800'
          },
          {
            name: 'Blue Series Materials',
            tier: 'essential',
            what: 'Consonant blends (4+ letter words). Blue = beginning and ending blends like bl-, cr-, -nd, -nk.',
            quantity: '1 complete Blue Series set',
            size: 'Same as Pink',
            container: 'Blue-colored boxes/containers',
            contents: [
              'BEGINNING BLENDS: bl, cl, fl, gl, pl, sl, br, cr, dr, fr, gr, pr, tr, sc, sk, sm, sn, sp, st, sw',
              'ENDING BLENDS: -nd, -nk, -nt, -mp, -ft, -lt, -ck, -ff, -ll, -ss',
              'Object box with blend words',
              'Picture cards + word cards',
              'Booklets: 10 mini-readers'
            ],
            tips: 'Master Pink before Blue. Introduce double consonants (ff, ll, ss) first, then L-blends, R-blends, S-blends.',
            price: '¥400-800'
          },
          {
            name: 'Green Series Materials',
            tier: 'complete',
            what: 'Phonograms (letter combinations making special sounds). Green = ai, ee, oa, sh, ch, th, etc.',
            quantity: '1 complete Green Series set',
            size: 'Same as Pink/Blue',
            container: 'Green-colored boxes/containers',
            contents: [
              'CONSONANT DIGRAPHS: sh, ch, th, wh, ck, ng',
              'LONG VOWELS: a_e, ai, ay, ee, ea, i_e, ie, o_e, oa, ow, u_e, ue',
              'R-CONTROLLED: ar, er, ir, or, ur',
              'OTHER: oo, ou, oi, oy, au, aw',
              '36 phonogram booklets (one per phonogram)'
            ],
            tips: 'Phonogram highlighted in RED within words. Start with consonant digraphs, then silent-e patterns, then vowel teams.',
            price: '¥600-1,200'
          }
        ]
      }
    ]
  },
  {
    shelf: 'Shelf 5: Grammar',
    position: 'Language area extension',
    notes: 'Grammar introduced in final Primary year (5-6) to fluent readers. Focus is SENSORIAL exploration through games - NOT formal workbooks.',
    items: [
      {
        name: '3D grammar symbols (on tray)',
        details: [
          {
            name: '3D Grammar Symbols',
            tier: 'complete',
            what: 'Large solid wooden shapes representing parts of speech. For introduction and impressionistic lesson.',
            quantity: '1 set on display tray',
            size: '8.5×8.5cm base, varying heights',
            container: 'Wooden tray with stands',
            contents: [
              '⚫ NOUN: Large black triangle',
              '🔵 ARTICLE: Small light blue triangle',
              '🔷 ADJECTIVE: Medium dark blue triangle',
              '🔴 VERB: Red circle',
              '🟠 ADVERB: Small orange circle',
              '🟢 PREPOSITION: Green crescent',
              '🟣 PRONOUN: Purple isosceles triangle',
              '💗 CONJUNCTION: Pink rectangle',
              '💛 INTERJECTION: Gold keyhole'
            ],
            tips: 'Use for impressionistic introduction. Tell "story" of each part of speech. Progress to 2D flat symbols for daily work.',
            price: '¥400-800'
          }
        ]
      },
      {
        name: '2D grammar symbols box',
        details: [
          {
            name: '2D Grammar Symbols',
            tier: 'essential',
            what: 'Flat symbols for daily work - labeling words in sentences, grammar games, sentence analysis.',
            quantity: '2-3 sets for classroom use',
            size: 'Large triangle: 4-5cm base. Circle: 4.5cm diameter.',
            container: '10-15 compartment wooden box',
            contents: [
              '10 of each symbol per set',
              'Same shapes/colors as 3D',
              'Flat for table work'
            ],
            tips: 'Children place symbols above each word in sentence. Start with noun + verb only. Add article, adjective gradually.',
            price: '¥150-400'
          }
        ]
      },
      {
        name: 'Grammar Farm materials',
        details: [
          {
            name: 'Grammar Farm (Miniature Environment)',
            tier: 'complete',
            what: 'Miniature farm with labels for Function of Words activities. Most engaging way to introduce grammar.',
            quantity: '1 farm setup',
            size: 'Barn ~30cm. Animals 5-10cm.',
            container: 'Farm + labeled basket of word cards',
            contents: [
              'Wooden barn or farm set',
              'Farm animals (5-8): cow, horse, pig, sheep, chicken, duck',
              'Farmer figure',
              'Fencing, trees, accessories',
              'BLACK noun labels for all items',
              'RED verb command cards',
              'BLUE adjective cards'
            ],
            tips: 'The farm makes grammar come alive! Child labels all nouns black, reads verb commands ("The pig walks"), adds adjectives ("the big pig").',
            price: '¥300-600'
          }
        ]
      },
      {
        name: 'Command cards',
        details: [
          {
            name: 'Command Cards (Verb Cards)',
            tier: 'essential',
            what: 'Action word cards that child reads and performs. Experiential introduction to verbs.',
            quantity: '20-30 cards per level',
            size: '9×3cm, RED color coding',
            container: 'Small basket or card box',
            contents: [
              'PINK LEVEL: sit, run, hop, skip, jump, stand',
              'BLUE LEVEL: walk quickly, hop twice, stand near the door',
              'GREEN LEVEL: Walk to the window and wave.'
            ],
            tips: 'RED cards = action! Child reads silently, does action, class guesses word. Fun and active way to learn verbs.',
            price: '¥50-150'
          }
        ]
      },
      {
        name: 'Detective Adjective Game',
        details: [
          {
            name: 'Detective Adjective Game',
            tier: 'complete',
            what: '63 triangles in 3 colors (red, yellow, blue), 3 types (equilateral, isosceles, scalene), 3 sizes. Demonstrates how adjectives narrow down choices.',
            quantity: '1 set',
            size: 'Triangles vary. Box: 25×17cm.',
            container: 'Wooden box with compartments',
            contents: [
              '21 red triangles (7 each type × 3 sizes)',
              '21 yellow triangles',
              '21 blue triangles',
              'Cards: "Give me a triangle" → "Give me a blue triangle" → "Give me a small blue triangle"'
            ],
            tips: 'Shows WHY we need adjectives - to be specific! Detective must narrow down from 63 to 1 using adjectives.',
            price: '¥100-250'
          }
        ]
      }
    ]
  }
];

// =============================================================================
// REFERENCE DATA: ASSESSMENT CHECKLIST
// Progress tracking through the language curriculum
// =============================================================================
const assessmentChecklist = {
  'Oral Language': [
    { skill: 'Participates in Three-Period Lessons', indicators: 'Names objects correctly, responds to "show me", recalls names independently' },
    { skill: 'Uses classified vocabulary', indicators: 'Knows 10+ categories with 5+ items each' },
    { skill: 'Matches three-part cards', indicators: 'Independently matches picture to control, later label to picture' },
    { skill: 'Identifies parts-of nomenclature', indicators: 'Labels parts of leaf, flower, bird correctly' },
    { skill: 'Retells stories in sequence', indicators: 'Tells story with beginning, middle, end' }
  ],
  'Phonemic Awareness': [
    { skill: 'I Spy Level 1 - Beginning sounds', indicators: 'Identifies beginning sounds 8/10 times' },
    { skill: 'I Spy Level 2 - Ending sounds', indicators: 'Identifies ending sounds accurately' },
    { skill: 'I Spy Level 3 - Middle sounds', indicators: 'Identifies vowel sounds in CVC words' },
    { skill: 'I Spy Level 4 - Full segmenting', indicators: 'Segments any 3-4 sound word into individual phonemes' },
    { skill: 'Blending', indicators: 'Blends individual sounds into words' }
  ],
  'Sandpaper Letters': [
    { skill: 'Traces letters correctly', indicators: 'Uses correct finger position and direction' },
    { skill: 'Associates sounds with symbols', indicators: 'Says sound while tracing, not letter name' },
    { skill: 'Knows Groups 1-3', indicators: 'c, m, a, t, s, r, i, p, b, f, o, g' },
    { skill: 'Knows Groups 4-7', indicators: 'Remaining letters including q, x, z' },
    { skill: 'Knows phonograms', indicators: 'Recognizes sh, ch, th, and common vowel digraphs' },
    { skill: 'Knows capitals', indicators: 'Associates capitals with lowercase' }
  ],
  'Writing Preparation': [
    { skill: 'Uses sand tray', indicators: 'Forms letters in sand matching sandpaper model' },
    { skill: 'Uses chalkboard', indicators: 'Writes letters with proper formation on vertical surface' },
    { skill: 'Metal Insets 1-3', indicators: 'Traces, fills with horizontal and vertical lines' },
    { skill: 'Metal Insets 4-7', indicators: 'Creates designs, uses gradation, combines shapes' },
    { skill: 'Proper pencil grip', indicators: 'Holds pencil with tripod grip consistently' }
  ],
  'Moveable Alphabet': [
    { skill: 'Builds CVC words', indicators: 'Segments sounds and selects correct letters' },
    { skill: 'Builds from pictures', indicators: 'Builds words without object present' },
    { skill: 'Builds phrases', indicators: 'Uses spacing between words' },
    { skill: 'Builds sentences', indicators: 'Uses capital at beginning, period at end' },
    { skill: 'Uses phonograms', indicators: 'Incorporates digraphs and blends correctly' }
  ],
  'Reading': [
    { skill: 'Reads Pink Series', indicators: 'Decodes CVC words fluently' },
    { skill: 'Reads Blue Series', indicators: 'Decodes words with consonant blends' },
    { skill: 'Reads Green Series', indicators: 'Decodes words with phonograms' },
    { skill: 'Knows sight words', indicators: 'Recognizes 50+ high-frequency words automatically' },
    { skill: 'Reads sentences fluently', indicators: 'Reads with expression and comprehension' },
    { skill: 'Independent reading', indicators: 'Chooses and reads books independently' }
  ],
  'Handwriting': [
    { skill: 'Writes letters on paper', indicators: 'Forms letters correctly on lined paper' },
    { skill: 'Writes words', indicators: 'Spaces letters within words appropriately' },
    { skill: 'Writes sentences', indicators: 'Uses capitals and punctuation' },
    { skill: 'Writes creatively', indicators: 'Expresses original ideas in writing' },
    { skill: 'Copies accurately', indicators: 'Copies text with correct spelling and punctuation' }
  ],
  'Word Study': [
    { skill: 'Identifies compound words', indicators: 'Recognizes and creates compound words' },
    { skill: 'Uses contractions', indicators: 'Reads and writes common contractions' },
    { skill: 'Understands prefixes', indicators: 'Knows un-, re-, pre- change meaning' },
    { skill: 'Understands suffixes', indicators: 'Knows -ed, -ing, -er, -est, -ly, -ful, -less' },
    { skill: 'Identifies synonyms/antonyms', indicators: 'Matches words with similar/opposite meanings' },
    { skill: 'Distinguishes homophones', indicators: 'Uses correct spelling for sound-alike words in context' }
  ],
  'Grammar': [
    { skill: 'Identifies nouns', indicators: 'Points out naming words, uses black triangle' },
    { skill: 'Identifies verbs', indicators: 'Points out action words, uses red circle' },
    { skill: 'Identifies adjectives', indicators: 'Points out describing words, uses dark blue triangle' },
    { skill: 'Uses all 9 grammar symbols', indicators: 'Correctly labels all parts of speech in sentences' },
    { skill: 'Analyzes simple sentences', indicators: 'Identifies subject and predicate' },
    { skill: 'Uses correct verb tense', indicators: 'Distinguishes past, present, future' },
    { skill: 'Forms plurals correctly', indicators: 'Applies spelling rules for plurals' }
  ]
};

const curriculumData: Category[] = [
  // =========================================================================
  // 1. ORAL LANGUAGE FOUNDATION
  // =========================================================================
  {
    id: 'oral_language',
    name: 'Oral Language Foundation',
    icon: '🗣️',
    sequence: 1,
    description: 'Vocabulary enrichment through real objects → pictures → words. The foundation for ALL literacy. Continues throughout the 3-6 program.',
    amiNotes: 'Begin immediately upon entry. The Three-Period Lesson is the methodology for all vocabulary introduction.',
    works: [
      {
        id: 'naming_environment',
        name: 'Naming Objects in the Environment',
        age: '2.5+ years',
        directAim: 'Build vocabulary through real objects in the classroom',
        indirectAims: ['Language development', 'Classification skills', 'Connection to environment'],
        prerequisites: 'None - entry point',
        videoSearchTerm: 'Montessori naming objects environment three period lesson',
        presentation: [
          'Walk with child through environment',
          'Name objects clearly: "This is a chair"',
          'Use Three-Period Lesson for new vocabulary',
          'Period 1 (Naming): "This is..."',
          'Period 2 (Recognition): "Show me..." / "Point to..."',
          'Period 3 (Recall): "What is this?"'
        ],
        materials: [
          {
            name: 'Environment Labels',
            nameZh: '环境标签卡',
            search1688: '蒙氏环境标签 教室物品',
            specs: 'Laminated cards with classroom object names',
            price: '¥20-40',
            essential: false
          }
        ],
        controlOfError: 'The objects themselves - they are self-evident',
        pointOfInterest: 'Discovering names for familiar things',
        extensions: ['Label matching after learning to read', 'Creating own labels']
      },
      {
        id: 'vocabulary_baskets',
        name: 'Vocabulary Baskets (Object Baskets)',
        age: '2.5-4 years',
        directAim: 'Build vocabulary through classified real objects',
        indirectAims: ['Classification', 'Language enrichment', 'Preparation for reading'],
        prerequisites: 'Basic classroom orientation',
        videoSearchTerm: 'Montessori three period lesson vocabulary objects demonstration',
        beginnerGuide: {
          whatIsThis: 'Baskets containing 5-8 real miniature objects from one category (farm animals, fruits, vehicles). You teach the names using the Three-Period Lesson - a specific teaching technique that introduces vocabulary in three stages: naming, recognition, and recall.',
          whyItMatters: 'Children learn vocabulary best through handling REAL objects, not flashcards. The Three-Period Lesson is the foundation technique for teaching ANY vocabulary in Montessori - you\'ll use it for everything from object names to letter sounds to grammar symbols. Master this first!',
          beforeYouStart: [
            'Basket contains 5-8 REALISTIC miniatures from ONE category',
            'Objects have SIMPLE, CLEAR names (use "cow" not "bovine")',
            'You know all the object names yourself (including correct terms)',
            'Start with objects the child has some experience with',
            'Mat or clear workspace ready'
          ],
          exactScript: [
            '[Bring basket to mat. Sit beside child. Remove 3 objects with contrasting names.]',
            '',
            'PERIOD 1 — NAMING (brief):',
            '[Pick up first object, examine it, then offer to child]',
            'YOU: "This is a cow."',
            '[Child holds and explores object. Repeat for other 2 objects.]',
            'YOU: "This is a pig."',
            'YOU: "This is a horse."',
            '',
            'PERIOD 2 — RECOGNITION (longest - 80% of lesson!):',
            'YOU: "Show me the cow."',
            'YOU: "Can you point to the horse?"',
            'YOU: "Put the pig on the mat."',
            'YOU: "Hand me the cow."',
            'YOU: "Put the horse next to the pig."',
            'YOU: "Can you find the cow with your eyes closed?"',
            '[Mix objects, vary requests, add movement, make it FUN - do 10+ requests]',
            '',
            'PERIOD 3 — RECALL (brief, only when confident):',
            '[Point to an object]',
            'YOU: "What is this?"',
            'CHILD: "Cow!"',
            'YOU: "Yes, it\'s a cow!"',
            '[If wrong: DON\'T correct. Say "Let me show you" and return to Period 1]'
          ],
          commonMistakes: [
            'Rushing through Period 2 - this should be the LONGEST part (80% of lesson)',
            'Testing too early (Period 3) before child is ready',
            'Correcting mistakes directly - instead, return to Period 1 and reteach',
            'Using too many objects at once - start with just 2-3',
            'Choosing similar-sounding names (cat/cap, bear/pear)',
            'Not letting child handle and explore the objects',
            'Skipping Period 2 variations (movement, eyes closed, placement)'
          ],
          successIndicators: [
            'Child correctly responds to 8/10 Period 2 requests',
            'Child looks eager and engaged (not frustrated)',
            'Child can name objects correctly in Period 3',
            'Child starts using new vocabulary naturally in conversation',
            'Child asks for "more words" or wants to see new baskets'
          ],
          sessionLength: '5-10 minutes (ages 2-3), 10-15 minutes (ages 3-4+)',
          frequency: 'Daily with new baskets weekly'
        },
        presentation: [
          'THE THREE-PERIOD LESSON (Use for ALL vocabulary teaching):',
          '',
          'PERIOD 1 — NAMING ("This is..."):',
          'Pick up object, show and name: "This is a cow"',
          'Let child hold and explore',
          'Repeat for 2-3 objects',
          '',
          'PERIOD 2 — RECOGNITION ("Show me...") — LONGEST PHASE:',
          '"Show me the cow"',
          '"Point to the horse"',
          '"Put the pig on the mat"',
          '"Hand me the cow"',
          'Add movement: "Put the horse on the shelf"',
          'Do MANY variations - this is where learning happens!',
          '',
          'PERIOD 3 — RECALL ("What is this?"):',
          'Point to object: "What is this?"',
          'Only do this when SUCCESS is guaranteed',
          'If child is wrong, don\'t correct - return to Period 1',
          '',
          'KEY POINTS:',
          '• Period 2 should be 80% of the lesson',
          '• Never correct directly - just reteach',
          '• 2-3 NEW objects at a time, max 6 in review',
          '• Use PRECISE vocabulary (Dalmatian, not doggy)'
        ],
        materials: [
          {
            name: 'Miniature Object Sets - Animals',
            nameZh: '仿真动物模型',
            search1688: '仿真动物模型 迷你 儿童认知 农场海洋',
            altSearch: 'Safari TOOB 动物模型 微缩',
            specs: 'Realistic miniatures 3-6cm, farm/wild/ocean sets',
            price: '¥40-100 per set',
            essential: true
          },
          {
            name: 'Miniature Object Sets - Fruits & Vegetables',
            nameZh: '仿真水果蔬菜',
            search1688: '仿真水果蔬菜 迷你 过家家 认知',
            specs: 'Realistic miniatures 2-4cm',
            price: '¥30-60',
            essential: true
          },
          {
            name: 'Miniature Object Sets - Vehicles',
            nameZh: '合金车模型',
            search1688: '合金车模型 迷你 儿童认知玩具',
            specs: 'Various vehicle types 3-5cm',
            price: '¥40-80',
            essential: true
          },
          {
            name: 'Miniature Object Sets - Tools',
            nameZh: '迷你工具模型',
            search1688: '迷你工具模型 过家家 儿童认知',
            specs: 'Household/garden tools',
            price: '¥30-50',
            essential: false
          },
          {
            name: 'Miniature Object Sets - Furniture',
            nameZh: '迷你家具模型',
            search1688: '迷你家具模型 娃娃屋 仿真',
            specs: 'Household furniture items',
            price: '¥40-80',
            essential: false
          },
          {
            name: 'Sorting/Storage Baskets',
            nameZh: '收纳篮',
            search1688: '藤编收纳篮 小号 幼儿园',
            altSearch: '木质分类盒 桌面收纳',
            specs: 'Natural wicker or wood, 10-15cm diameter',
            price: '¥10-25 each',
            essential: true
          }
        ],
        controlOfError: 'Teacher guidance; objects are self-evident',
        pointOfInterest: 'The miniature objects themselves',
        extensions: ['Sorting by attribute', 'Matching objects to pictures', 'Matching objects to labels']
      },
      {
        id: 'three_part_cards',
        name: 'Three-Part Cards (Nomenclature Cards)',
        age: '3-6 years',
        directAim: 'Bridge from concrete objects to abstract pictures and words',
        indirectAims: ['Preparation for reading', 'Classification', 'Vocabulary enrichment'],
        prerequisites: 'Vocabulary baskets with same category; later: sandpaper letters',
        videoSearchTerm: 'Montessori three part cards nomenclature presentation how to use',
        presentation: [
          'STAGE 1 - Control Cards Only:',
          'Select 5-6 control cards from one category',
          'Three-Period Lesson with pictures',
          'STAGE 2 - Picture Matching:',
          'Lay out control cards, give picture cards to match',
          'STAGE 3 - Label Matching (after sandpaper letters):',
          'Child sounds out label, places under picture',
          'Checks with control card'
        ],
        materials: [
          {
            name: 'Three-Part Card Sets - Animals',
            nameZh: '三部卡-动物',
            search1688: '蒙氏三部卡 动物 专业版',
            altSearch: '蒙台梭利 三段卡 动物认知',
            specs: 'Control 9.5×10.8cm, Picture 9.5×7.6cm, Label 9.5×3.2cm, laminated',
            price: '¥25-50 per set',
            essential: true
          },
          {
            name: 'Three-Part Card Sets - Plants',
            nameZh: '三部卡-植物',
            search1688: '蒙氏三部卡 植物 花卉',
            specs: 'Flowers, trees, parts of plant',
            price: '¥25-50 per set',
            essential: true
          },
          {
            name: 'Three-Part Card Sets - Body Parts',
            nameZh: '三部卡-身体部位',
            search1688: '蒙氏三部卡 人体 身体部位',
            specs: 'Human body parts',
            price: '¥25-50 per set',
            essential: true
          },
          {
            name: 'Three-Part Card Sets - Geography',
            nameZh: '三部卡-地理',
            search1688: '蒙氏三部卡 地理 地貌',
            specs: 'Landforms, continents',
            price: '¥25-50 per set',
            essential: false
          },
          {
            name: 'Card Storage Box',
            nameZh: '卡片收纳盒',
            search1688: '木质卡片收纳盒 多格 蒙氏',
            specs: 'Compartmentalized wood box, holds 10+ sets',
            price: '¥50-100',
            essential: true
          }
        ],
        controlOfError: 'Control card for self-checking',
        pointOfInterest: 'Matching pictures; later, reading the labels',
        extensions: ['Creating own card sets', 'Definition cards', 'Parts of cards (tree: trunk, branch, leaf)']
      },
      {
        id: 'storytelling',
        name: 'Storytelling & Conversation',
        age: '2.5-6 years',
        directAim: 'Develop oral expression and listening skills',
        indirectAims: ['Sequencing', 'Comprehension', 'Social skills', 'Preparation for writing'],
        prerequisites: 'None',
        videoSearchTerm: 'Montessori storytelling oral language preschool read aloud',
        presentation: [
          'Read quality literature daily',
          'Ask open-ended questions about stories',
          'Encourage children to retell stories',
          'Use story sequence cards',
          'Model rich vocabulary and complete sentences'
        ],
        materials: [
          {
            name: 'Story Sequence Cards',
            nameZh: '故事排序卡',
            search1688: '故事排序卡 儿童逻辑 幼儿园',
            specs: '4-8 card sequences showing story progression',
            price: '¥30-60',
            essential: false
          },
          {
            name: 'Quality Picture Books',
            nameZh: '绘本',
            search1688: '英文绘本 幼儿园 经典',
            specs: 'Rich vocabulary, quality illustrations',
            price: '¥20-50 each',
            essential: true
          }
        ],
        controlOfError: 'Meaning - does the story make sense',
        pointOfInterest: 'The story itself; expressing ideas',
        extensions: ['Child dictates own stories', 'Story writing after reading']
      },
      {
        id: 'poetry_rhymes',
        name: 'Poetry, Songs & Rhymes',
        age: '2.5-6 years',
        directAim: 'Develop phonological awareness through rhythm and rhyme',
        indirectAims: ['Memory', 'Phonemic awareness', 'Cultural enrichment', 'Joy in language'],
        prerequisites: 'None',
        videoSearchTerm: 'Montessori nursery rhymes phonological awareness preschool songs',
        presentation: [
          'Recite poems and nursery rhymes daily',
          'Emphasize rhyming words',
          'Clap syllables',
          'Sing songs with actions',
          'Children memorize and recite favorites'
        ],
        materials: [
          {
            name: 'Poetry Cards',
            nameZh: '诗歌卡',
            search1688: '英文儿歌卡片 幼儿园',
            specs: 'Illustrated poem/rhyme cards',
            price: '¥20-40',
            essential: false
          }
        ],
        controlOfError: 'The rhythm and rhyme patterns',
        pointOfInterest: 'The musicality of language',
        extensions: ['Identifying rhymes', 'Creating own rhymes', 'Poetry recitation']
      },
      {
        id: 'parts_of_cards',
        name: 'Parts-of Cards (Nomenclature)',
        age: '3.5-6 years',
        directAim: 'Learn specialized vocabulary for parts of objects in nature',
        indirectAims: ['Scientific vocabulary', 'Classification', 'Reading enrichment'],
        prerequisites: 'Three-Part Cards; some reading ability',
        videoSearchTerm: 'Montessori parts of nomenclature cards botany flower leaf',
        presentation: [
          'BOTANY PARTS-OF:',
          '- Parts of a Leaf: blade, petiole, veins, margin, apex, base',
          '- Parts of a Flower: petal, sepal, stamen, pistil, stem',
          '- Parts of a Tree: trunk, branches, roots, crown, bark',
          '- Parts of a Seed: seed coat, embryo, cotyledon',
          '',
          'ZOOLOGY PARTS-OF:',
          '- Parts of a Bird: beak, wing, feather, talon, tail',
          '- Parts of a Fish: fin, scales, gills, tail',
          '- Parts of an Insect: head, thorax, abdomen, antenna, wings',
          '- Parts of a Horse: mane, hoof, muzzle, withers',
          '',
          'Use control chart showing all parts labeled',
          'Child matches labels to parts'
        ],
        materials: [
          {
            name: 'Parts of Leaf Cards',
            nameZh: '叶子部位卡',
            search1688: '蒙氏植物部位卡 叶子 英文',
            altSearch: '蒙氏植物学三部卡',
            specs: 'Large control chart + individual part labels',
            price: '¥30-60',
            essential: true
          },
          {
            name: 'Parts of Flower Cards',
            nameZh: '花朵部位卡',
            search1688: '蒙氏植物部位卡 花 英文',
            specs: 'Flower anatomy with labels',
            price: '¥30-60',
            essential: true
          },
          {
            name: 'Parts of Tree Cards',
            nameZh: '树木部位卡',
            search1688: '蒙氏植物部位卡 树 英文',
            specs: 'Tree anatomy with labels',
            price: '¥30-60',
            essential: false
          },
          {
            name: 'Parts of Bird Cards',
            nameZh: '鸟类部位卡',
            search1688: '蒙氏动物部位卡 鸟 英文',
            altSearch: '蒙氏动物学三部卡',
            specs: 'Bird anatomy with labels',
            price: '¥30-60',
            essential: true
          },
          {
            name: 'Parts of Fish Cards',
            nameZh: '鱼类部位卡',
            search1688: '蒙氏动物部位卡 鱼 英文',
            specs: 'Fish anatomy with labels',
            price: '¥30-60',
            essential: true
          },
          {
            name: 'Parts of Insect Cards',
            nameZh: '昆虫部位卡',
            search1688: '蒙氏动物部位卡 昆虫 英文',
            specs: 'Insect anatomy with labels',
            price: '¥30-60',
            essential: false
          },
          {
            name: 'Botany Cabinet Cards',
            nameZh: '植物学橱卡片',
            search1688: '蒙氏植物学橱 叶形卡片',
            specs: 'Leaf shape classification cards',
            price: '¥40-80',
            essential: false
          }
        ],
        controlOfError: 'Control chart with all parts labeled',
        pointOfInterest: 'Discovering the specialized names',
        extensions: ['Examining real specimens', 'Drawing and labeling', 'Creating own parts-of cards']
      },
      {
        id: 'definition_cards',
        name: 'Definition Cards',
        age: '5-6 years',
        directAim: 'Learn to match terms with their definitions',
        indirectAims: ['Reading comprehension', 'Vocabulary depth', 'Study skills'],
        prerequisites: 'Reading sentences; Three-Part Cards mastery',
        videoSearchTerm: 'Montessori definition cards vocabulary matching reading',
        presentation: [
          'Term cards + Definition cards + Control cards',
          'Child reads term, finds matching definition',
          'Self-checks with control card',
          '',
          'Example - Geometry:',
          'Term: "triangle" / Definition: "a shape with three sides and three angles"',
          '',
          'Categories: Geometry shapes, Land/water forms, Animal classifications'
        ],
        materials: [
          {
            name: 'Definition Cards - Geometry',
            nameZh: '定义卡-几何',
            search1688: '蒙氏定义卡 几何 英文',
            specs: 'Shape terms with definitions',
            price: '¥30-50',
            essential: false
          },
          {
            name: 'Definition Cards - Geography',
            nameZh: '定义卡-地理',
            search1688: '蒙氏定义卡 地理 英文',
            specs: 'Landform and water form definitions',
            price: '¥30-50',
            essential: false
          }
        ],
        controlOfError: 'Control cards for self-checking',
        pointOfInterest: 'Reading for meaning; matching concepts',
        extensions: ['Creating definitions', 'Dictionary use', 'Research']
      },
      {
        id: 'classified_pictures',
        name: 'Classified Pictures',
        age: '2.5-6 years',
        directAim: 'Expand vocabulary through classified picture collections',
        indirectAims: ['Visual discrimination', 'Classification', 'Reading preparation'],
        prerequisites: 'Vocabulary baskets',
        videoSearchTerm: 'Montessori classified pictures sorting vocabulary language',
        presentation: [
          'Large collection of classified pictures:',
          '',
          'LIVING THINGS:',
          '- Mammals, Birds, Fish, Reptiles, Amphibians, Insects',
          '- Trees, Flowers, Vegetables, Fruits',
          '',
          'NON-LIVING THINGS:',
          '- Vehicles, Tools, Furniture, Clothing',
          '- Buildings, Musical instruments',
          '',
          'Use for sorting, vocabulary, later reading'
        ],
        materials: [
          {
            name: 'Classified Picture Cards - Animals',
            nameZh: '分类图卡-动物',
            search1688: '蒙氏分类图卡 动物 真实照片',
            altSearch: '认知卡片 动物 真实图片',
            specs: 'Realistic photos, 7×7cm, categorized',
            price: '¥40-80 per set',
            essential: true
          },
          {
            name: 'Classified Picture Cards - Plants',
            nameZh: '分类图卡-植物',
            search1688: '蒙氏分类图卡 植物 真实照片',
            specs: 'Fruits, vegetables, flowers, trees',
            price: '¥40-80 per set',
            essential: true
          },
          {
            name: 'Classified Picture Cards - Objects',
            nameZh: '分类图卡-物品',
            search1688: '蒙氏分类图卡 日常用品',
            specs: 'Vehicles, tools, household items',
            price: '¥40-80 per set',
            essential: false
          }
        ],
        controlOfError: 'Classification logic; teacher',
        pointOfInterest: 'Discovering categories and relationships',
        extensions: ['Sorting activities', 'Label matching', 'Creating categories']
      },
      {
        id: 'action_command_cards',
        name: 'Action Command Cards',
        age: '4-5.5 years',
        directAim: 'Read and perform action commands',
        indirectAims: ['Reading comprehension', 'Following directions', 'Verb vocabulary'],
        prerequisites: 'Reading CVC words; Pink series',
        videoSearchTerm: 'Montessori action command cards reading comprehension verbs',
        presentation: [
          'Single action cards: "sit" "hop" "clap"',
          'Child reads card, performs action',
          'Progress to multi-step: "hop to the door"',
          'Progress to complex: "pick up the red pen and put it on the shelf"'
        ],
        materials: [
          {
            name: 'Action Command Cards - Simple',
            nameZh: '动作指令卡-简单',
            search1688: '蒙氏动作指令卡 英文 简单',
            specs: 'Single verb commands',
            price: '¥20-40',
            essential: true
          },
          {
            name: 'Action Command Cards - Complex',
            nameZh: '动作指令卡-复杂',
            search1688: '蒙氏指令卡 英文 多步骤',
            specs: 'Multi-step commands',
            price: '¥20-40',
            essential: false
          }
        ],
        controlOfError: 'Action either done correctly or not',
        pointOfInterest: 'Reading leads to action',
        extensions: ['Writing own commands', 'Command games with peers']
      }
    ]
  },

  // =========================================================================
  // 2. SOUND GAMES (I SPY) - PHONEMIC AWARENESS
  // =========================================================================
  {
    id: 'sound_games',
    name: 'Sound Games (I Spy)',
    icon: '👂',
    sequence: 2,
    description: 'Develop complete phonemic awareness BEFORE introducing any written symbols. This is the critical foundation - rushing past this causes reading difficulties later.',
    amiNotes: 'ALL sound game work occurs WITHOUT reference to sandpaper letters or written symbols. Child must complete all 4 levels before Moveable Alphabet.',
    works: [
      {
        id: 'i_spy_level1',
        name: 'I Spy Level 1 - Beginning Sounds',
        age: '2.5-4 years',
        directAim: 'Train the ear to isolate beginning sounds in words',
        indirectAims: ['Phonemic awareness', 'Concentration', 'Vocabulary'],
        prerequisites: 'Vocabulary of 100+ words',
        videoSearchTerm: 'Montessori I Spy sound game beginning sounds presentation',
        beginnerGuide: {
          whatIsThis: 'A listening game that teaches children to hear individual sounds in words. You hold objects and ask "I spy something that begins with /s/" (the SOUND, not the letter name). Child finds the object. This is NOT about letters yet - just training the ear.',
          whyItMatters: 'Phonemic awareness (hearing sounds in words) is the #1 predictor of reading success. Children who skip this struggle with reading later. This game builds the mental skill of breaking words into sounds - essential for both reading AND spelling.',
          beforeYouStart: [
            'Child knows names of at least 100 objects (basic vocabulary)',
            'You can make PURE letter sounds without adding "uh" (say /s/ not "suh", /t/ not "tuh")',
            'You have 3-5 objects ready with DIFFERENT beginning sounds',
            'Objects have simple, unambiguous names (use "cat" not "kitty")',
            'Room is quiet with no distractions'
          ],
          exactScript: [
            '[Hold ONE object in your hand - make this first attempt impossible to fail]',
            'YOU: "Let\'s play a game! I spy with my little eye something that begins with... /k/" (hold cup visibly)',
            'CHILD: "Cup!"',
            'YOU: "Yes! Cup begins with /k/! K-k-k-cup!"',
            '',
            '[Now place TWO objects on mat - cup and ball]',
            'YOU: "I spy with my little eye something that begins with /b/"',
            'CHILD: (points to ball)',
            'YOU: "That\'s right! Ball begins with /b/!"',
            '',
            '[Gradually add more objects - up to 5-6]',
            'YOU: "I spy something that begins with /m/"',
            '[If child struggles, add clues: "I spy something you drink from that begins with /m/"]'
          ],
          commonMistakes: [
            'Using letter NAMES instead of SOUNDS - say /s/ not "ess", /f/ not "eff"',
            'Adding "uh" to consonants - say /t/ not "tuh", /b/ not "buh"',
            'Starting with too many objects - begin with just ONE, then two',
            'Correcting the child directly - if wrong, just try again with easier setup',
            'Using objects with ambiguous names (rabbit/bunny, car/automobile)',
            'Rushing to test before teaching - Period 2 (recognition) should be longest'
          ],
          successIndicators: [
            'Child correctly identifies objects 8/10 times with 3+ objects',
            'Child starts spontaneously identifying sounds: "Ball starts with /b/!"',
            'Child wants to give YOU clues (role reversal)',
            'Child notices beginning sounds in daily life without prompting'
          ],
          sessionLength: '5-10 minutes (stop before child loses interest)',
          frequency: 'Daily for 4-8 weeks until mastery'
        },
        presentation: [
          'GOLDEN RULE: Use SOUNDS not letter names. /s/ not "ess", /f/ not "eff"',
          '',
          'STAGE 1 — ONE OBJECT (Guaranteed Success):',
          'Hold single object in your hand',
          'Say: "I spy with my little eye something that begins with /k/" (holding cup)',
          'Child can only give one answer - success is guaranteed',
          '',
          'STAGE 2 — TWO OBJECTS:',
          'Place two objects with VERY different sounds (cup, ball)',
          'Give same "I spy" prompt',
          'Child must now discriminate between two options',
          '',
          'STAGE 3 — MULTIPLE OBJECTS:',
          'Gradually increase to 3, then 4, then 5-6 objects',
          'Add descriptive clues if needed: "I spy something you eat that starts with /b/"',
          '',
          'TIPS:',
          '• Keep consonants CRISP - no "uh" at end (say /t/ not "tuh")',
          '• Continuant sounds (s, m, f, l, n, z) can be stretched: "sssss"',
          '• Stop sounds (b, d, g, k, p, t) must stay short',
          '• Never correct directly - just make it easier and try again'
        ],
        materials: [
          {
            name: 'Initial Sound Objects - Complete Set',
            nameZh: '蒙台梭利首音小物件全套',
            search1688: '迷你仿真小物件 儿童认知 微缩模型 塑料小玩具',
            altSearch: 'Safari TOOB 仿真动物模型 微缩',
            specs: '130+ miniature objects, 4-6 per letter sound, realistic, 1-4cm',
            price: '¥150-300',
            essential: true
          },
          {
            name: 'Sound Sorting Mat',
            nameZh: '分类垫',
            search1688: '毛毡垫 工作垫 桌垫 纯色',
            specs: 'Small work mat for sorting',
            price: '¥15-30',
            essential: false
          }
        ],
        controlOfError: 'Teacher; object names are phonetically clear',
        pointOfInterest: 'The game format; finding the object',
        extensions: ['Ending sounds', 'Middle sounds', 'Full segmentation']
      },
      {
        id: 'i_spy_level2',
        name: 'I Spy Level 2 - Ending Sounds',
        age: '3-4.5 years',
        directAim: 'Train the ear to isolate ending sounds',
        indirectAims: ['Complete phonemic awareness', 'Preparation for spelling'],
        prerequisites: 'Mastery of beginning sounds (8/10 correct)',
        videoSearchTerm: 'Montessori I Spy game ending sounds phonemic awareness',
        presentation: [
          '"I spy something that ENDS with /t/" (cat)',
          'Use same objects as beginning sounds',
          'Start with very distinct ending sounds',
          'Progress to similar endings for discrimination',
          'Combine: "...starts with /c/ and ends with /t/"'
        ],
        materials: [
          {
            name: 'Same objects as Level 1',
            nameZh: '同上',
            search1688: '蒙氏语言区字母首音小物件套装',
            specs: 'No additional purchase needed',
            price: '—',
            essential: false
          }
        ],
        controlOfError: 'Teacher guidance',
        pointOfInterest: 'The challenge of listening to the end',
        extensions: ['Rhyming games (same ending sounds)', 'Beginning AND ending in one game']
      },
      {
        id: 'i_spy_level3',
        name: 'I Spy Level 3 - Middle Sounds',
        age: '3.5-5 years',
        directAim: 'Train the ear to isolate middle/vowel sounds',
        indirectAims: ['Complete phonemic awareness', 'Vowel discrimination'],
        prerequisites: 'Mastery of beginning AND ending sounds',
        videoSearchTerm: 'Montessori I Spy middle sounds vowels phonemic awareness',
        presentation: [
          'Middle sounds are HARDEST - introduce last',
          '"I spy something with /a/ in the middle" (cat, hat, mat)',
          'Start with short vowel sounds in CVC words',
          'Use objects with same consonants but different vowels: cat, cot, cut'
        ],
        materials: [
          {
            name: 'CVC Object Sets (vowel focus)',
            nameZh: 'CVC物件组',
            search1688: '蒙氏语言区 CVC 小物件',
            specs: 'Objects grouped by middle vowel sound',
            price: '¥50-100',
            essential: true
          }
        ],
        controlOfError: 'Teacher; clear pronunciation',
        pointOfInterest: 'Discriminating similar-sounding words',
        extensions: ['Sorting by middle sound', 'Vowel sound games']
      },
      {
        id: 'i_spy_level4',
        name: 'I Spy Level 4 - Full Segmenting',
        age: '4-5 years',
        directAim: 'Segment ALL individual sounds in words',
        indirectAims: ['Direct preparation for Moveable Alphabet', 'Spelling foundation'],
        prerequisites: 'Mastery of Levels 1-3',
        videoSearchTerm: 'Montessori sound segmentation phonemic awareness word sounds',
        presentation: [
          '"Tell me ALL the sounds in cat"',
          'Child responds: "/k/ - /a/ - /t/"',
          'Start with 3-sound CVC words',
          'Present sounds in order: beginning → ending → middle',
          'Progress to 4-sound words (CCVC, CVCC)',
          '⭐ READY FOR MOVEABLE ALPHABET when child can segment any 3-4 sound word'
        ],
        materials: [
          {
            name: 'Segmenting Objects',
            nameZh: '分音节物件',
            search1688: '蒙氏语言区 CVC 小物件',
            specs: 'Clear 3-4 sound word objects: dog, cat, frog, lamp',
            price: '¥50-80',
            essential: true
          }
        ],
        controlOfError: 'Teacher models correct segmentation',
        pointOfInterest: 'Breaking words into individual sounds',
        extensions: ['Blending sounds back into words', 'Longer words', 'Transition to Moveable Alphabet'],
        notes: '⚠️ This level MUST be mastered before introducing Moveable Alphabet. Rushing causes reading difficulties.'
      }
    ]
  },

  // =========================================================================
  // 3. SANDPAPER LETTERS
  // =========================================================================
  {
    id: 'sandpaper_letters',
    name: 'Sandpaper Letters',
    icon: '✋',
    sequence: 3,
    description: 'Connect sounds (already known from Sound Games) to written symbols through tactile experience. Cursive lowercase on colored boards.',
    amiNotes: 'AMI uses CURSIVE script. Pink boards = consonants, Blue boards = vowels, Green boards = phonograms. Always teach SOUNDS not letter names.',
    works: [
      {
        id: 'sandpaper_intro',
        name: 'Sandpaper Letters - Introduction',
        age: '3-4 years',
        directAim: 'Associate phonetic sounds with written symbols through touch',
        indirectAims: ['Preparation for writing', 'Left-to-right movement', 'Muscular memory of letter forms'],
        prerequisites: 'Sound Games Level 1 (beginning sounds)',
        videoSearchTerm: 'Montessori sandpaper letters presentation three period lesson',
        beginnerGuide: {
          whatIsThis: 'Tactile letters made of sandpaper mounted on colored boards. Child traces the letter shape while you say the SOUND (not name). Pink boards = consonants, blue boards = vowels. The rough texture creates muscle memory of letter forms before the child ever holds a pencil.',
          whyItMatters: 'This connects the sounds children already know (from I Spy) to written symbols. The tactile tracing builds motor memory so writing becomes automatic. AMI research shows children who learn letters this way have better handwriting and spelling than those who just see letters.',
          beforeYouStart: [
            'Child can play I Spy with beginning sounds (8/10 correct)',
            'You know the SOUNDS each letter makes (not letter names!)',
            'You\'ve practiced the correct tracing direction for each letter',
            'You have 3 letters ready: 2 consonants + 1 vowel (start with c, m, a or s, a, t)',
            'Letters chosen have DIFFERENT shapes and sounds (never b/d or m/n together)'
          ],
          exactScript: [
            '[Sit BESIDE child on their dominant-hand side. Stack 3 letters face-down.]',
            '',
            'PERIOD 1 - NAMING:',
            '[Pick up first letter (c). Run your index + middle fingers lightly over surface.]',
            'YOU: "This letter says /k/" [trace letter correctly while saying sound]',
            'YOU: "/k/" [trace again] "/k/" [trace again]',
            'YOU: "Now you try. Trace it and say /k/"',
            'CHILD: [traces] "/k/"',
            '[Repeat for second and third letters: m → /m/, a → /a/]',
            '',
            'PERIOD 2 - RECOGNITION (longest part!):',
            'YOU: "Show me the one that says /m/"',
            'YOU: "Can you trace /k/?"',
            'YOU: "Put /a/ on the mat"',
            'YOU: "Hand me /m/"',
            '[Make it playful - shuffle letters, add movement, do 8-10 requests]',
            '',
            'PERIOD 3 - RECALL:',
            '[Only do this when you\'re SURE child will succeed]',
            'YOU: [Point to letter] "What does this say?"',
            'CHILD: "/m/"',
            'YOU: "Yes! /m/!"',
            '[If wrong, don\'t correct - just say "Let me show you again" and return to Period 1]'
          ],
          commonMistakes: [
            'Saying letter NAMES instead of SOUNDS - say /k/ not "see", /s/ not "ess"',
            'Using wrong tracing direction - practice beforehand! (most start at top)',
            'Using one finger - always use index AND middle finger together',
            'Rushing through Period 2 - this should be the LONGEST part',
            'Testing before teaching (Period 3 too early)',
            'Introducing similar letters together (b/d, p/q, m/n)',
            'Correcting mistakes directly - instead, make it easier and reteach'
          ],
          successIndicators: [
            'Child traces letters correctly without guidance',
            'Child says sound automatically while tracing',
            'Child starts noticing letters in environment: "That says /s/!"',
            'Child asks for new letters',
            'Child can do Period 3 consistently for a group of 3 letters'
          ],
          sessionLength: '10-15 minutes',
          frequency: 'Daily - introduce 2-3 new letters per week'
        },
        presentation: [
          'SETUP:',
          'Sit beside child (same orientation for correct letter view)',
          'Select 3 letters: 2 consonants + 1 vowel',
          'First group: c, m, a, t (allows building: cat, mat, at)',
          '',
          'HOW TO TRACE:',
          'Use index AND middle fingers together',
          'Trace in the direction you would WRITE the letter',
          'Say the SOUND (not name) after each trace',
          '',
          'THREE-PERIOD LESSON:',
          'Period 1 (Naming): "This says /k/" [trace 3 times, child traces]',
          'Period 2 (Recognition): "Show me /k/", "Trace /m/", "Hand me /a/"',
          'Period 3 (Recall): "What does this say?" [only when confident of success]',
          '',
          'KEY POINTS:',
          '• SOUNDS not letter names (/k/ not "see")',
          '• Period 2 should be LONGEST - lots of playful requests',
          '• Never correct directly - just reteach if needed',
          '• 3 letters at a time, contrasting shapes/sounds'
        ],
        materials: [
          {
            name: 'Sandpaper Letters - Lowercase Cursive',
            nameZh: '砂纸字母-小写草书',
            search1688: '蒙氏砂纸字母板 英文 小写 26个',
            altSearch: '蒙台梭利 砂字母板 粉蓝',
            specs: 'Cursive script, Pink consonants/Blue vowels, Standard 16×12cm, fine-grit sandpaper on HDF',
            price: '¥50-120',
            essential: true
          },
          {
            name: 'Sandpaper Letters - Tall Letters',
            nameZh: '砂纸字母-高字母',
            search1688: '蒙氏砂纸字母 26个全套',
            specs: 'For b,d,f,h,k,l,t: 19×14cm boards',
            price: 'Usually included in set',
            essential: true
          },
          {
            name: 'Sandpaper Letters - Wide Letters',
            nameZh: '砂纸字母-宽字母',
            search1688: '蒙氏砂纸字母 26个全套',
            specs: 'For m,w: 19×12cm boards',
            price: 'Usually included in set',
            essential: true
          },
          {
            name: 'Sandpaper Letter Storage Box',
            nameZh: '砂纸字母收纳盒',
            search1688: '蒙氏砂纸字母收纳盒 木质',
            specs: 'Compartmentalized wood box with dividers',
            price: '¥40-80',
            essential: true
          }
        ],
        controlOfError: 'Tactile - sandpaper feels different from smooth board; direction arrows on back',
        pointOfInterest: 'The rough texture; connecting sound to symbol',
        extensions: ['Eyes closed tracing', 'Writing in sand tray', 'Finding letters in environment']
      },
      {
        id: 'sandpaper_groups',
        name: 'Sandpaper Letter Groups (Full Sequence)',
        age: '3-4.5 years',
        directAim: 'Learn all 26 letter-sound correspondences in optimal sequence',
        indirectAims: ['Enable early word building', 'Systematic progression'],
        prerequisites: 'First group mastered (c, m, a, t)',
        videoSearchTerm: 'Montessori sandpaper letters sequence order which letters first',
        presentation: [
          'Traditional AMI letter groupings for English:',
          'GROUP 1: c, m, a, t → builds: cat, mat, at, am',
          'GROUP 2: s, r, i, p → builds: sit, rip, sip, pit, tip, strip',
          'GROUP 3: b, f, o, g → builds: bog, fog, big, fig',
          'GROUP 4: h, j, u, l → builds: hug, jug, hull, lull',
          'GROUP 5: d, w, e, n → builds: den, wed,wen, end',
          'GROUP 6: k, q, v, x → builds: (fewer words, often with previous letters)',
          'GROUP 7: y, z → builds: (complete alphabet)',
          'Always include vowels in each group for word building',
          'Introduce 2-3 letters at a time, not whole groups at once'
        ],
        materials: [
          {
            name: 'Same sandpaper letter set',
            nameZh: '同上',
            search1688: '蒙氏砂纸字母 小写 专业版',
            specs: 'Complete 26-letter set',
            price: '—',
            essential: false
          }
        ],
        controlOfError: 'Tactile feedback; teacher guidance',
        pointOfInterest: 'Building words with known letters',
        extensions: ['Word building with Moveable Alphabet', 'Letter hunts in books']
      },
      {
        id: 'sandpaper_capitals',
        name: 'Sandpaper Letters - Capitals',
        age: '4.5-6 years',
        directAim: 'Learn capital letter forms for names and sentence beginnings',
        indirectAims: ['Reading printed text', 'Proper noun recognition'],
        prerequisites: 'Most lowercase letters mastered; reading CVC words',
        videoSearchTerm: 'Montessori capital letters uppercase sandpaper introduction',
        presentation: [
          'Introduce when child asks or needs capitals for names',
          'Pair with lowercase: "This also says /b/, we use it at the start of names"',
          'Focus on child\'s name and classmates\' names first',
          'Same tracing technique as lowercase'
        ],
        materials: [
          {
            name: 'Sandpaper Letters - Capitals',
            nameZh: '砂纸字母-大写',
            search1688: '蒙氏砂纸字母 大写 专业版',
            altSearch: '蒙台梭利 大写砂字母板',
            specs: 'Print capitals, green boards, 16×12cm',
            price: '¥50-100',
            essential: false
          }
        ],
        controlOfError: 'Tactile; visual comparison with lowercase',
        pointOfInterest: 'Recognizing capitals in environment',
        extensions: ['Matching capitals to lowercase', 'Writing own name']
      },
      {
        id: 'sandpaper_phonograms',
        name: 'Sandpaper Letters - Phonograms/Digraphs',
        age: '4.5-5.5 years',
        directAim: 'Learn that some sounds require two or more letters',
        indirectAims: ['Reading complex words', 'Spelling patterns'],
        prerequisites: 'Most single letters mastered; reading CVC words; encounter phonograms in reading',
        videoSearchTerm: 'Montessori sandpaper phonograms digraphs sh ch th double letters',
        presentation: [
          'Introduce when child encounters phonograms in reading',
          'Present as ONE sound: "These two letters together say /sh/"',
          'Same tracing technique',
          'Common phonograms to introduce:',
          'CONSONANT DIGRAPHS: sh, ch, th, wh, ck, ng',
          'VOWEL DIGRAPHS: ai, ay, ee, ea, ie, oa, oo, ou, ow, oy, oi',
          'R-CONTROLLED: ar, er, ir, or, ur'
        ],
        materials: [
          {
            name: 'Phonogram Sandpaper Letters',
            nameZh: '双字母砂纸板',
            search1688: '蒙台蒙特梭利 双字母砂纸板 绿色',
            altSearch: '蒙氏砂纸字母 音组 digraph',
            specs: 'Green boards, 15-20 phonograms, same sandpaper texture',
            price: '¥40-80',
            essential: true
          },
          {
            name: 'Phonogram Storage Box',
            nameZh: '音组收纳盒',
            search1688: '蒙氏砂纸字母收纳盒 小号',
            specs: 'Smaller compartmentalized box',
            price: '¥30-50',
            essential: false
          }
        ],
        controlOfError: 'Tactile feedback',
        pointOfInterest: 'Two letters making one sound',
        extensions: ['Phonogram word building', 'Sorting words by phonogram']
      }
    ]
  },

  // =========================================================================
  // 4. SAND TRAY & WRITING PREPARATION
  // =========================================================================
  {
    id: 'sand_tray',
    name: 'Sand Tray & Writing Preparation',
    icon: '🏖️',
    sequence: 4,
    description: 'Practice letter formation with kinesthetic feedback. No permanence allows experimentation without fear of mistakes.',
    works: [
      {
        id: 'sand_tray_writing',
        name: 'Sand Tray Writing',
        age: '3.5-5 years',
        directAim: 'Practice letter formation with immediate tactile feedback',
        indirectAims: ['Preparation for writing on paper', 'Letter form memory', 'Fine motor control'],
        prerequisites: 'Introduction to sandpaper letters',
        videoSearchTerm: 'Montessori sand tray letter writing practice presentation',
        presentation: [
          'Child traces sandpaper letter first',
          'Immediately writes same letter in sand using finger or stylus',
          'Sand provides resistance and tactile feedback',
          'Use smoother to erase and try again',
          'No right or wrong - allows free experimentation',
          'Progress: single letters → letter combinations → words'
        ],
        materials: [
          {
            name: 'Sand Tray Complete Set',
            nameZh: '书写沙盘套装',
            search1688: '刮沙盒 蒙氏 书写练习 木质',
            altSearch: '蒙氏沙盘 写字练习',
            specs: 'Wood tray ~25×20cm, wooden stylus 14cm, wooden smoother 20-27cm',
            price: '¥40-80',
            essential: true
          },
          {
            name: 'Fine Writing Sand',
            nameZh: '书写细沙',
            search1688: '彩色沙子 白色 细沙 500克',
            altSearch: '细沙 儿童玩具 无尘',
            specs: 'Fine white or colored sand, 1-2kg, dust-free',
            price: '¥15-30',
            essential: true
          }
        ],
        controlOfError: 'Visual comparison with sandpaper letter; feel of sand',
        pointOfInterest: 'Sensory experience; immediate erasing',
        extensions: ['Writing words', 'Writing with eyes closed', 'Pattern making']
      },
      {
        id: 'chalkboard_writing',
        name: 'Chalkboard Writing',
        age: '4-5 years',
        directAim: 'Practice letter formation on vertical surface',
        indirectAims: ['Arm strength', 'Larger movements before fine motor', 'Easy correction'],
        prerequisites: 'Sand tray work; several sandpaper letters known',
        videoSearchTerm: 'Montessori chalkboard writing letters preschool handwriting',
        presentation: [
          'Start with LARGE letters using whole arm movement',
          'Trace sandpaper letter, write on chalkboard',
          'Easy to erase and try again',
          'Progress from single letters to words',
          'Vertical surface develops proper muscle groups'
        ],
        materials: [
          {
            name: 'Individual Chalkboard',
            nameZh: '小黑板',
            search1688: '儿童小黑板 木框 双面',
            specs: 'A4 or larger, framed, double-sided',
            price: '¥20-50',
            essential: true
          },
          {
            name: 'Chalk - Thick',
            nameZh: '粗粉笔',
            search1688: '粗粉笔 幼儿 无尘',
            specs: 'Large diameter for proper grip, dust-free',
            price: '¥10-20',
            essential: true
          },
          {
            name: 'Chalkboard Eraser',
            nameZh: '黑板擦',
            search1688: '黑板擦 小号',
            specs: 'Child-sized',
            price: '¥5-10',
            essential: true
          }
        ],
        controlOfError: 'Visual; easy to erase',
        pointOfInterest: 'Writing "for real"; erasing',
        extensions: ['Writing words', 'Messages to others', 'Chalk drawings with letters']
      }
    ]
  },

  // =========================================================================
  // 5. METAL INSETS - WRITING PREPARATION
  // =========================================================================
  {
    id: 'metal_insets',
    name: 'Metal Insets',
    icon: '📐',
    sequence: 5,
    description: 'Develop pencil control, proper grip, and continuous strokes through design work. The 10 shapes and 10+ presentations directly prepare the hand for handwriting.',
    amiNotes: 'This is the PRIMARY handwriting preparation. Daily practice recommended. Not about creating pretty pictures - about developing hand control.',
    works: [
      {
        id: 'metal_insets_intro',
        name: 'Metal Insets - Introduction & Presentations 1-3',
        age: '3.5-4.5 years',
        directAim: 'Develop pencil control through tracing and filling shapes',
        indirectAims: ['Proper pencil grip', 'Lightness of touch', 'Continuous strokes', 'Left-to-right movement'],
        prerequisites: 'Fine motor readiness; ability to hold pencil',
        videoSearchTerm: 'Montessori metal insets presentation tracing filling shapes',
        presentation: [
          'PRESENTATION 1 - Frame Outline & Horizontal Lines:',
          '- Select frame, place on paper',
          '- Hold frame firmly with non-dominant hand',
          '- Trace inside edge with colored pencil',
          '- Remove frame, fill shape with horizontal lines (left to right)',
          '- Lines should be close together, not touching',
          '',
          'PRESENTATION 2 - Vertical Lines:',
          '- Trace frame as before',
          '- Fill shape with vertical lines (top to bottom)',
          '',
          'PRESENTATION 3 - Double Outline:',
          '- Trace frame (first color)',
          '- Place INSET inside outline, trace around (second color)',
          '- Creates double outline'
        ],
        materials: [
          {
            name: 'Metal Insets - Complete 10 Shapes',
            nameZh: '金属嵌板全套',
            search1688: '蒙氏铁制几何嵌板教具 专业版 全套',
            altSearch: '蒙台梭利 金属嵌板 10件套',
            specs: 'Pink frames 14×14cm, Blue insets. 10 shapes: square, rectangle, equilateral triangle, pentagon, trapezoid, circle, oval, ellipse, curvilinear triangle, quatrefoil',
            price: '¥150-350',
            essential: true
          },
          {
            name: 'Metal Inset Stand',
            nameZh: '嵌板架',
            search1688: '蒙氏嵌板架 木质 专业版',
            specs: '65cm×16cm, holds 5 shapes per stand, 2 needed for full set',
            price: '¥40-80 each',
            essential: true
          },
          {
            name: 'Metal Inset Paper',
            nameZh: '嵌板纸',
            search1688: '白卡纸 14厘米 正方形 500张',
            altSearch: '蒙氏嵌板纸 彩色 14cm',
            specs: '14×14cm exactly (matches frame), 20lb bond, white and 4-5 colors',
            price: '¥20-50 per 500',
            essential: true
          },
          {
            name: 'Triangular Colored Pencils',
            nameZh: '三角彩色铅笔',
            search1688: '彩色铅笔 粗杆 三角 12色 幼儿',
            altSearch: '三角铅笔 3.8mm 粗芯',
            specs: '3-sided grip, 3.8mm lead diameter, 11 standard colors',
            price: '¥30-60',
            essential: true
          },
          {
            name: 'Pencil Holders - 11 Colors',
            nameZh: '彩色铅笔筒套装',
            search1688: '蒙氏铅笔筒 12孔 木质 彩色',
            altSearch: '木质笔筒 彩色 幼儿园',
            specs: '11 colored holders, 12 pencils per holder',
            price: '¥60-120 set',
            essential: true
          },
          {
            name: 'Paper Holder/Box',
            nameZh: '嵌板纸盒',
            search1688: '蒙氏嵌板纸盒 木质',
            specs: 'Holds 14×14cm paper',
            price: '¥30-50',
            essential: false
          }
        ],
        controlOfError: 'Visual - staying within lines, line quality and spacing',
        pointOfInterest: 'Creating colorful designs; the smooth metal',
        extensions: ['Presentations 4-10', 'Design combinations', 'Color gradients']
      },
      {
        id: 'metal_insets_advanced',
        name: 'Metal Insets - Presentations 4-10',
        age: '4-6 years',
        directAim: 'Refine pencil control with increasingly complex designs',
        indirectAims: ['Creativity', 'Patience', 'Aesthetic sense', 'Pressure control'],
        prerequisites: 'Presentations 1-3 mastered',
        videoSearchTerm: 'Montessori metal insets advanced designs patterns overlay',
        presentation: [
          'PRESENTATION 4 - Different Inset in Frame:',
          '- Trace frame with one shape',
          '- Place DIFFERENT inset inside, trace around',
          '- Creates interesting design',
          '',
          'PRESENTATION 5 - Zigzag Lines:',
          '- Fill shape with zigzag pattern instead of straight lines',
          '',
          'PRESENTATION 6 - Wavy Lines:',
          '- Fill shape with continuous wavy/curved lines',
          '',
          'PRESENTATION 7 - Pressure Gradation:',
          '- Create shading from light to dark pressure',
          '- Develops fine control',
          '',
          'PRESENTATION 8 - Superimposition:',
          '- Overlap multiple shapes',
          '- Use different colors for each',
          '',
          'PRESENTATION 9 - Complex Designs:',
          '- Create symmetrical patterns',
          '- Combine multiple techniques',
          '',
          'PRESENTATION 10 - Artistic Freedom:',
          '- Child creates original designs',
          '- May combine all techniques learned'
        ],
        materials: [
          {
            name: 'Same materials as above',
            nameZh: '同上',
            search1688: '蒙氏铁制几何嵌板教具',
            specs: 'No additional materials needed',
            price: '—',
            essential: false
          }
        ],
        controlOfError: 'Visual quality of work',
        pointOfInterest: 'Creating increasingly beautiful designs',
        extensions: ['Card making', 'Gift decorations', 'Border designs']
      }
    ]
  },

  // =========================================================================
  // 6. MOVEABLE ALPHABET
  // =========================================================================
  {
    id: 'moveable_alphabet',
    name: 'Moveable Alphabet',
    icon: '🔤',
    sequence: 6,
    description: 'Writing before reading! Child builds words by selecting letters for sounds heard, WITHOUT the fine motor demand of pencil writing. This is the KEY breakthrough.',
    amiNotes: 'AMI principle: Children WRITE (encode) before they READ (decode). The Moveable Alphabet enables written expression before fine motor readiness.',
    works: [
      {
        id: 'moveable_intro',
        name: 'Large Moveable Alphabet - Introduction',
        age: '4-4.5 years',
        directAim: 'Compose words by selecting letters representing sounds heard',
        indirectAims: ['Preparation for reading', 'Spelling patterns', 'Left-to-right sequence'],
        prerequisites: 'Sound Games Level 4 (full segmenting); Most sandpaper letters known',
        videoSearchTerm: 'Montessori moveable alphabet first presentation word building',
        beginnerGuide: {
          whatIsThis: 'A box of loose letters (pink consonants, blue vowels) that children use to BUILD words without needing to write. Child hears a word, breaks it into sounds, finds the letter for each sound, and arranges them into a word. This is WRITING without a pencil!',
          whyItMatters: 'Children can express ideas in writing YEARS before they can physically write with a pencil. The Moveable Alphabet removes the fine motor barrier. AMI principle: children WRITE (encode) before they READ (decode). This is often when children suddenly "explode" into reading because they understand that letters represent sounds.',
          beforeYouStart: [
            'Child can segment CVC words into sounds ("cat" → /k/ - /a/ - /t/)',
            'Child knows at least 12-15 letter sounds from sandpaper letters',
            'Child knows at least 2 vowels (a, o or a, i)',
            'You have 3-5 small CVC objects ready (cat, dog, pig, cup, hat)',
            'Objects have SIMPLE phonetic spellings (no silent letters)',
            'Work mat is large enough for alphabet box + word building space'
          ],
          exactScript: [
            'FIRST SESSION - ORIENTATION ONLY:',
            '[Bring alphabet box to mat. This first session is JUST exploring the box.]',
            'YOU: "Today I have something special. You\'re ready for the moveable alphabet!"',
            'YOU: "Watch how I carry it - hands in the middle so it doesn\'t tip."',
            'YOU: "Can you find the letter that says /m/?"',
            'CHILD: [finds m]',
            'YOU: "Great! Now put it back. See how we scan left to right to find its spot?"',
            '[Let child practice finding and returning letters. That\'s the WHOLE first session.]',
            '',
            'SECOND SESSION - FIRST WORD:',
            '[Place ONE object on mat - a small cat figure]',
            'YOU: "This is a cat. We\'re going to BUILD the word cat."',
            'YOU: "What\'s the FIRST sound you hear? C-c-cat?"',
            'CHILD: "/k/"',
            'YOU: "Find the letter that says /k/."',
            'CHILD: [finds c, places on mat]',
            'YOU: "What\'s the NEXT sound? Ca-a-at?"',
            'CHILD: "/a/"',
            'CHILD: [finds a, places to the RIGHT of c]',
            'YOU: "What\'s the LAST sound? Cat-t-t?"',
            'CHILD: "/t/"',
            'CHILD: [finds t, places after a]',
            'YOU: "You WROTE cat! Let\'s build another!"',
            '',
            '[NEVER ask child to READ what they wrote - that\'s a different skill]'
          ],
          commonMistakes: [
            'Asking child to READ what they built - this is WRITING, not reading!',
            'Correcting spelling - phonetic spelling is developmentally appropriate',
            'Dictating words - prompt with questions, let child segment sounds',
            'Starting with words that have tricky spellings (knife, phone)',
            'Moving too fast - orientation session should be separate from word building',
            'Not letting child choose which words to build (after initial presentation)',
            'Rushing to sentences before child is fluent with single words'
          ],
          successIndicators: [
            'Child can segment a word and find letters independently',
            'Child builds words enthusiastically without frustration',
            'Child starts building words without being asked',
            'Child wants to build their own chosen words',
            'Child builds 4-6 words in one session',
            'Child may spontaneously start READING the words they built'
          ],
          sessionLength: '10-20 minutes',
          frequency: '2-3 times per week, or daily if child is eager'
        },
        presentation: [
          'SESSION 1 — ORIENTATION (Box exploration only):',
          'Show alphabet box layout',
          'Blue vowels in one section, pink consonants in another',
          'Practice: "Find the letter that says /m/"',
          'Practice returning letters to correct spots',
          '',
          'SESSION 2+ — WORD BUILDING:',
          '',
          'STEP 1: Place object on mat (e.g., toy cat)',
          '"Let\'s build the word CAT"',
          '',
          'STEP 2: Segment the first sound',
          '"What\'s the FIRST sound?" (stretch: c-c-cat)',
          'Child says /k/',
          'Child finds "c", places on mat',
          '',
          'STEP 3: Continue with remaining sounds',
          '"What\'s the NEXT sound?" (stretch: ca-a-at)',
          'Child finds and places each letter LEFT TO RIGHT',
          '',
          'STEP 4: Celebrate!',
          '"You WROTE cat!"',
          '',
          'KEY PRINCIPLES:',
          '• This is WRITING, never ask child to read it back',
          '• Phonetic spelling is correct (e.g., "kat" is fine)',
          '• Let child choose words after initial presentation',
          '• Objects → Pictures → Own ideas'
        ],
        materials: [
          {
            name: 'Large Moveable Alphabet',
            nameZh: '大号活动字母箱',
            search1688: '蒙氏活动字母箱 木质 英文 26字母',
            altSearch: '蒙台梭利 活动字母盒 粉蓝',
            specs: 'Cursive lowercase, Pink consonants (10 of each), Blue vowels (15 of each), 2-layer beechwood box with lid',
            price: '¥100-250',
            essential: true
          }
        ],
        controlOfError: 'Teacher initially; later, word cards with pictures',
        pointOfInterest: 'Creating words; seeing thoughts become visible',
        extensions: ['Multiple words', 'Phrases', 'Sentences', 'Stories']
      },
      {
        id: 'moveable_progression',
        name: 'Moveable Alphabet - Word Building Progression',
        age: '4-5.5 years',
        directAim: 'Progress from objects to pictures to word lists to sentences',
        indirectAims: ['Automatic letter selection', 'Spelling internalization'],
        prerequisites: 'Building CVC words with objects',
        videoSearchTerm: 'Montessori moveable alphabet word building sentences progression',
        presentation: [
          'STAGE 1 - Objects:',
          '- Build words for miniature objects',
          '- Self-correcting: object is the control',
          '',
          'STAGE 2 - Picture Cards:',
          '- Build words for pictures',
          '- No object present',
          '',
          'STAGE 3 - Word Lists:',
          '- Build words from spoken or written lists',
          '',
          'STAGE 4 - Phrases:',
          '- "the red cat"',
          '- Introduce spacing between words',
          '',
          'STAGE 5 - Sentences:',
          '- Complete thoughts',
          '- Capital letter awareness',
          '',
          'STAGE 6 - Stories:',
          '- Multiple sentences',
          '- Child\'s own ideas'
        ],
        materials: [
          {
            name: 'Word Building Object Box',
            nameZh: 'CVC物件盒',
            search1688: '蒙氏语言区 CVC 小物件盒',
            specs: 'Clear 3-letter word objects with labels for checking',
            price: '¥60-120',
            essential: true
          },
          {
            name: 'Word Building Picture Cards',
            nameZh: 'CVC图片卡',
            search1688: '蒙氏CVC单词卡 图片',
            specs: 'Pictures of CVC words',
            price: '¥30-60',
            essential: true
          }
        ],
        controlOfError: 'Picture cards with word on back; teacher',
        pointOfInterest: 'Expressing own thoughts in writing',
        extensions: ['Phonogram words', 'Blue series words', 'Green series words']
      },
      {
        id: 'small_moveable',
        name: 'Small Moveable Alphabet',
        age: '5-6 years',
        directAim: 'Build longer words and texts; work with phonograms',
        indirectAims: ['Transition to paper writing', 'More complex spelling'],
        prerequisites: 'Fluent with Large Moveable Alphabet; phonograms introduced',
        videoSearchTerm: 'Montessori small moveable alphabet phonograms writing',
        presentation: [
          'Introduced when child needs:',
          '- More letters for longer words',
          '- Smaller size for more text',
          '- Phonogram letters',
          '',
          'Often includes:',
          '- Double letters (small alphabet may have only 5 of each)',
          '- Phonogram combinations'
        ],
        materials: [
          {
            name: 'Small Moveable Alphabet',
            nameZh: '小号活动字母',
            search1688: '蒙氏小号活动字母 英文',
            altSearch: '蒙台梭利 活动字母 小号',
            specs: 'Smaller cursive letters, usually in print also available',
            price: '¥60-120',
            essential: false
          }
        ],
        controlOfError: 'Teacher; dictionary for older children',
        pointOfInterest: 'Writing longer texts',
        extensions: ['Story writing', 'Letter writing', 'Transition to pencil writing']
      }
    ]
  },

  // =========================================================================
  // 7. OBJECT BOXES & READING
  // =========================================================================
  {
    id: 'reading_series',
    name: 'Object Boxes & Reading Progression',
    icon: '📦',
    sequence: 7,
    description: 'Transition from writing (encoding) to reading (decoding). Pink Series (CVC) → Blue Series (blends) → Green Series (phonograms).',
    amiNotes: 'Note: The Pink/Blue/Green color system was developed by Homfray & Child, not Maria Montessori. AMI uses Muriel Dwyer approach. However, the color system is practical and widely used.',
    works: [
      {
        id: 'pink_objects',
        name: 'Pink Series - Object Boxes',
        age: '4-5 years',
        directAim: 'Read simple CVC words by matching to objects',
        indirectAims: ['Decoding skills', 'Reading confidence'],
        prerequisites: 'Building CVC words with Moveable Alphabet',
        videoSearchTerm: 'Montessori pink series object box CVC reading presentation',
        presentation: [
          'Place objects on mat (e.g., cat, dog, pig)',
          'Give child word labels to read',
          'Child sounds out: /k/-/a/-/t/ = "cat!"',
          'Places label next to correct object',
          'Self-correcting: object and word match'
        ],
        materials: [
          {
            name: 'Pink Object Box - Complete',
            nameZh: '粉色系列物件盒',
            search1688: '蒙氏语言区 粉色系列 CVC物件 全套',
            altSearch: '蒙氏CVC小物件 带标签',
            specs: '26+ miniature objects (one or more per letter), word labels, control cards',
            price: '¥100-200',
            essential: true
          }
        ],
        controlOfError: 'Object-word correspondence; control cards',
        pointOfInterest: 'Reading real words; matching',
        extensions: ['Pink picture cards', 'Pink word lists']
      },
      {
        id: 'pink_pictures',
        name: 'Pink Series - Picture & Word Cards',
        age: '4-5 years',
        directAim: 'Read CVC words without object support',
        indirectAims: ['Reading independence', 'Decoding fluency'],
        prerequisites: 'Pink object boxes',
        videoSearchTerm: 'Montessori pink series picture word cards matching reading',
        presentation: [
          'Lay out picture cards',
          'Give word cards to read and match',
          'OR: Lay out word cards, match picture cards',
          'Self-check with control cards (picture + word together)'
        ],
        materials: [
          {
            name: 'Pink Picture Word Cards',
            nameZh: '粉色图文配对卡',
            search1688: '蒙氏三部卡 CVC 粉色系列',
            altSearch: '蒙氏CVC配对卡 图片单词',
            specs: 'Picture cards ~7×7cm, Word cards ~7×3cm, laminated',
            price: '¥40-80',
            essential: true
          }
        ],
        controlOfError: 'Control cards for self-checking',
        pointOfInterest: 'Reading independently',
        extensions: ['Sorting by vowel sound', 'Sorting by word family']
      },
      {
        id: 'pink_lists',
        name: 'Pink Series - Word Lists & Booklets',
        age: '4.5-5 years',
        directAim: 'Read CVC words fluently without picture support',
        indirectAims: ['Reading fluency', 'Decoding automaticity'],
        prerequisites: 'Pink picture word cards',
        videoSearchTerm: 'Montessori pink series word lists booklets phrases sentences',
        presentation: [
          'WORD LISTS:',
          '- Lists of CVC words organized by pattern',
          '- Child reads down the list',
          '',
          'PHRASE CARDS:',
          '- Simple phrases: "a red hat", "the big dog"',
          '',
          'SENTENCE CARDS:',
          '- Simple sentences with CVC words',
          '- Often commands: "Get the red pen"',
          '',
          'BOOKLETS:',
          '- Simple stories using CVC words',
          '- 4-8 pages, one sentence per page'
        ],
        materials: [
          {
            name: 'Pink Word Lists',
            nameZh: '粉色词表卡',
            search1688: '蒙氏粉色词表 CVC',
            specs: 'Lists organized by pattern: -at, -an, -ap, -ig, etc.',
            price: '¥20-40',
            essential: true
          },
          {
            name: 'Pink Phrase Cards',
            nameZh: '粉色短语卡',
            search1688: '蒙氏粉色短语卡 英文',
            specs: '2-3 word phrases',
            price: '¥20-40',
            essential: true
          },
          {
            name: 'Pink Sentence Cards',
            nameZh: '粉色句子卡',
            search1688: '蒙氏粉色句子卡 CVC',
            specs: 'Simple command sentences',
            price: '¥20-40',
            essential: true
          },
          {
            name: 'Pink Reading Booklets',
            nameZh: '粉色阅读小书',
            search1688: '蒙氏阅读小书 粉色 CVC 英文',
            altSearch: '蒙氏phonics小书 初级',
            specs: 'Simple decodable readers, 4-8 pages',
            price: '¥30-60 set',
            essential: true
          }
        ],
        controlOfError: 'Meaning - sentences make sense or don\'t',
        pointOfInterest: 'Reading "real" books',
        extensions: ['Child writes own lists/booklets', 'Blue series']
      },
      {
        id: 'blue_series',
        name: 'Blue Series - Consonant Blends',
        age: '4.5-5.5 years',
        directAim: 'Read 4+ letter words with consonant blends',
        indirectAims: ['Blend recognition', 'More complex decoding'],
        prerequisites: 'Pink series fluency',
        presentation: [
          'Same progression as Pink but with blends:',
          'CCVC words: frog, crab, stem, plan',
          'CVCC words: lamp, bend, milk, tent',
          'CCVCC words: stamp, blend, print',
          '',
          'Blue Object Box → Blue Picture Cards → Blue Word Lists → Blue Booklets',
          '',
          'Still SHORT VOWELS only'
        ],
        materials: [
          {
            name: 'Blue Object Box',
            nameZh: '蓝色系列物件盒',
            search1688: '蒙氏语言区 蓝色系列 辅音组合物件',
            specs: 'Objects for blend words with labels',
            price: '¥80-150',
            essential: true
          },
          {
            name: 'Blue Picture Word Cards',
            nameZh: '蓝色图文卡',
            search1688: '蒙氏三部卡 蓝色系列 辅音组合',
            specs: 'Picture/word cards for blend words',
            price: '¥40-80',
            essential: true
          },
          {
            name: 'Blue Word Lists & Booklets',
            nameZh: '蓝色词表小书',
            search1688: '蒙氏蓝色阅读材料 英文',
            specs: 'Lists and readers with blend words',
            price: '¥40-80',
            essential: true
          }
        ],
        controlOfError: 'Picture matching; meaning',
        pointOfInterest: 'Reading longer words',
        extensions: ['Blend sorting', 'Blend bingo', 'Green series']
      },
      {
        id: 'green_series',
        name: 'Green Series - Phonograms',
        age: '5-6 years',
        directAim: 'Read words with digraphs and complex vowel patterns',
        indirectAims: ['Phonogram pattern recognition', 'Spelling patterns'],
        prerequisites: 'Blue series; Phonogram sandpaper letters',
        presentation: [
          'Organized by phonogram pattern:',
          '',
          'CONSONANT DIGRAPHS:',
          'sh words: ship, shop, fish, wish',
          'ch words: chip, chop, rich, much',
          'th words: this, that, with, math',
          '',
          'VOWEL DIGRAPHS:',
          'ai/ay words: rain, play, say',
          'ee/ea words: feet, read, sea',
          'oa/ow words: boat, road, snow',
          'oo words: book, moon, food',
          '',
          'R-CONTROLLED:',
          'ar words: car, star, farm',
          'or words: for, corn, born'
        ],
        materials: [
          {
            name: 'Green Phonogram Cards - Complete',
            nameZh: '绿色音组卡全套',
            search1688: '蒙氏语言区 绿色系列 音组 全套',
            altSearch: '蒙氏phonogram卡片 digraph',
            specs: 'Cards organized by phonogram, picture + word',
            price: '¥100-200 full set',
            essential: true
          },
          {
            name: 'Phonogram Booklets',
            nameZh: '音组阅读小书',
            search1688: '蒙氏phonics小书 音组 英文',
            specs: 'Readers organized by phonogram',
            price: '¥50-100',
            essential: true
          },
          {
            name: 'Word Family Folders',
            nameZh: '词族文件夹',
            search1688: '蒙氏词族卡 word family',
            specs: 'Words grouped by pattern: -ight, -ough, etc.',
            price: '¥40-80',
            essential: false
          }
        ],
        controlOfError: 'Pattern organization; meaning',
        pointOfInterest: 'Unlocking complex words',
        extensions: ['Sorting by pattern', 'Spelling rules', 'Independent reading']
      },
      {
        id: 'sight_words',
        name: 'Puzzle Words (Sight Words)',
        age: '5-6 years',
        directAim: 'Learn high-frequency words that don\'t follow phonetic rules',
        indirectAims: ['Reading fluency', 'Automaticity with common words'],
        prerequisites: 'Reading CVC words; understands concept of "puzzle" words',
        presentation: [
          'Introduce as "puzzle words" - words that don\'t follow rules',
          'Examples: the, was, said, come, have, are, you',
          'Teach 3-5 at a time using Three-Period Lesson',
          'Practice in context of sentences',
          'Build personal sight word dictionary'
        ],
        materials: [
          {
            name: 'Sight Word Cards',
            nameZh: '高频词卡',
            search1688: '高频词卡 英文 sight words 幼儿',
            altSearch: 'Dolch词卡 英文',
            specs: 'High-frequency words, organized by level',
            price: '¥30-60',
            essential: true
          },
          {
            name: 'Sight Word Sentences',
            nameZh: '高频词句子卡',
            search1688: '蒙氏高频词句子 英文',
            specs: 'Sentences using sight words',
            price: '¥20-40',
            essential: false
          }
        ],
        controlOfError: 'Recognition; use in reading',
        pointOfInterest: 'These "rule-breakers" are everywhere!',
        extensions: ['Personal word bank', 'Sight word games', 'Reading fluency']
      },
      {
        id: 'word_families',
        name: 'Word Families (Phonogram Patterns)',
        age: '4.5-6 years',
        directAim: 'Recognize and read words with common patterns',
        indirectAims: ['Spelling patterns', 'Decoding efficiency', 'Word attack skills'],
        prerequisites: 'Pink series; introduction to phonograms',
        presentation: [
          'SHORT VOWEL FAMILIES:',
          '-at: cat, hat, mat, sat, bat, rat, flat',
          '-an: can, man, pan, ran, tan, van, plan',
          '-ap: cap, map, tap, nap, clap, snap',
          '-ig: big, dig, pig, wig, twig',
          '-in: bin, fin, pin, win, thin, spin',
          '-it: bit, fit, hit, sit, spit, split',
          '-op: cop, hop, mop, top, stop, drop',
          '-ot: cot, dot, got, hot, not, spot',
          '-ug: bug, dug, hug, mug, rug, plug',
          '-un: bun, fun, run, sun, spun, stun',
          '',
          'LONG VOWEL FAMILIES:',
          '-ake: bake, cake, lake, make, wake, snake',
          '-ame: came, game, name, same, flame',
          '-ate: date, gate, late, plate, skate',
          '-ine: fine, line, mine, nine, shine',
          '-ice: dice, mice, nice, rice, twice',
          '-oke: joke, poke, woke, broke, smoke',
          '-one: bone, cone, tone, phone, stone',
          '',
          'Sort word cards by family',
          'Read lists, then mixed practice'
        ],
        materials: [
          {
            name: 'Word Family Cards - Short Vowels',
            nameZh: '词族卡-短元音',
            search1688: '蒙氏词族卡 word family 短元音',
            altSearch: '英文词族卡 CVC word family',
            specs: 'Cards for -at, -an, -ig, -op, -ug families',
            price: '¥40-80',
            essential: true
          },
          {
            name: 'Word Family Cards - Long Vowels',
            nameZh: '词族卡-长元音',
            search1688: '蒙氏词族卡 word family 长元音',
            altSearch: '英文词族卡 CVCe silent e',
            specs: 'Cards for -ake, -ine, -oke families',
            price: '¥40-80',
            essential: true
          },
          {
            name: 'Word Family Sorting Mats',
            nameZh: '词族分类垫',
            search1688: '蒙氏分类垫 word family',
            specs: 'Mats for sorting word cards by family',
            price: '¥20-40',
            essential: false
          }
        ],
        controlOfError: 'Pattern consistency; rhyming',
        pointOfInterest: 'Discovering patterns in words',
        extensions: ['Creating rhymes', 'Word family bingo', 'Speed reading']
      },
      {
        id: 'phonogram_detail_consonant',
        name: 'Consonant Digraph Reading',
        age: '5-6 years',
        directAim: 'Read words with consonant digraphs fluently',
        indirectAims: ['Spelling consonant digraphs', 'Decoding complex words'],
        prerequisites: 'Phonogram sandpaper letters; Green series introduction',
        presentation: [
          'SH - /sh/ sound:',
          'Beginning: ship, shop, shell, sheep, shark, shirt',
          'Ending: fish, dish, wish, wash, bush, push',
          '',
          'CH - /ch/ sound:',
          'Beginning: chip, chop, chin, chair, cheese, cherry',
          'Ending: rich, much, such, each, beach, teach',
          '',
          'TH - two sounds:',
          'Voiced /th/: this, that, the, them, there, then',
          'Unvoiced /th/: thin, thick, thing, thank, think, three',
          '',
          'WH - /wh/ sound:',
          'what, when, where, which, white, whale, wheel',
          '',
          'CK - /k/ sound (after short vowels):',
          'back, deck, kick, lock, duck, black, stick',
          '',
          'NG - /ng/ sound:',
          'Ending: ring, sing, song, long, king, thing',
          '',
          'Sort words by digraph, read in context'
        ],
        materials: [
          {
            name: 'SH Digraph Cards',
            nameZh: 'SH音组卡',
            search1688: '蒙氏音组卡 sh 英文',
            altSearch: '蒙氏phonics sh digraph',
            specs: 'Picture + word cards for sh words',
            price: '¥25-40',
            essential: true
          },
          {
            name: 'CH Digraph Cards',
            nameZh: 'CH音组卡',
            search1688: '蒙氏音组卡 ch 英文',
            specs: 'Picture + word cards for ch words',
            price: '¥25-40',
            essential: true
          },
          {
            name: 'TH Digraph Cards',
            nameZh: 'TH音组卡',
            search1688: '蒙氏音组卡 th 英文',
            specs: 'Picture + word cards for th words',
            price: '¥25-40',
            essential: true
          },
          {
            name: 'Consonant Digraph Booklets',
            nameZh: '辅音音组小书',
            search1688: '蒙氏phonics小书 digraph sh ch th',
            specs: 'Decodable readers featuring digraphs',
            price: '¥40-80',
            essential: true
          }
        ],
        controlOfError: 'Picture matching; meaning',
        pointOfInterest: 'Two letters making one sound',
        extensions: ['Digraph hunts in books', 'Spelling practice', 'Writing with digraphs']
      },
      {
        id: 'phonogram_detail_vowel',
        name: 'Vowel Team Reading',
        age: '5-6 years',
        directAim: 'Read words with vowel teams/digraphs',
        indirectAims: ['Long vowel spelling patterns', 'Advanced decoding'],
        prerequisites: 'Consonant digraphs; short vowel fluency',
        presentation: [
          'AI / AY - long a:',
          'ai (middle): rain, train, brain, chain, paint',
          'ay (end): day, play, say, way, stay, gray',
          '',
          'EE / EA - long e:',
          'ee: feet, tree, see, bee, green, sleep',
          'ea: sea, read, eat, team, beach, cream',
          '',
          'OA / OW - long o:',
          'oa: boat, coat, road, soap, toast, float',
          'ow (long o): snow, grow, show, blow, yellow',
          '',
          'OO - two sounds:',
          'Long /oo/: moon, food, cool, room, tooth',
          'Short /oo/: book, look, cook, good, wood',
          '',
          'OU / OW - /ou/ sound:',
          'ou: out, house, mouse, cloud, sound',
          'ow: cow, how, now, down, brown, town',
          '',
          'OI / OY - /oi/ sound:',
          'oi: oil, coin, join, point, voice',
          'oy: boy, toy, joy, enjoy, royal'
        ],
        materials: [
          {
            name: 'AI/AY Vowel Team Cards',
            nameZh: 'AI/AY元音组卡',
            search1688: '蒙氏音组卡 ai ay 英文',
            specs: 'Picture + word cards',
            price: '¥25-40',
            essential: true
          },
          {
            name: 'EE/EA Vowel Team Cards',
            nameZh: 'EE/EA元音组卡',
            search1688: '蒙氏音组卡 ee ea 英文',
            specs: 'Picture + word cards',
            price: '¥25-40',
            essential: true
          },
          {
            name: 'OA/OW Vowel Team Cards',
            nameZh: 'OA/OW元音组卡',
            search1688: '蒙氏音组卡 oa ow 英文',
            specs: 'Picture + word cards',
            price: '¥25-40',
            essential: true
          },
          {
            name: 'OO/OU Vowel Team Cards',
            nameZh: 'OO/OU元音组卡',
            search1688: '蒙氏音组卡 oo ou 英文',
            specs: 'Picture + word cards',
            price: '¥25-40',
            essential: true
          },
          {
            name: 'Vowel Team Booklets',
            nameZh: '元音组小书',
            search1688: '蒙氏phonics小书 vowel team',
            altSearch: '英文phonics阅读 长元音',
            specs: 'Decodable readers by vowel team',
            price: '¥50-100',
            essential: true
          }
        ],
        controlOfError: 'Picture matching; sound consistency',
        pointOfInterest: 'Unlocking long vowel sounds',
        extensions: ['Sorting by pattern', 'Spelling rules', 'Writing practice']
      },
      {
        id: 'r_controlled_vowels',
        name: 'R-Controlled Vowel Reading',
        age: '5-6 years',
        directAim: 'Read words where R changes the vowel sound',
        indirectAims: ['Understanding vowel modification', 'Spelling r-controlled words'],
        prerequisites: 'Short and long vowel patterns',
        presentation: [
          'AR - /ar/ sound:',
          'car, star, far, bar, card, yard, farm, barn, park',
          '',
          'OR - /or/ sound:',
          'for, or, corn, horn, fork, pork, storm, north, short',
          '',
          'ER, IR, UR - same /er/ sound:',
          'er: her, fern, after, sister, water',
          'ir: bird, girl, first, third, shirt, stir',
          'ur: fur, turn, burn, hurt, purple, turtle',
          '',
          'Bossy R - R changes the vowel sound',
          'Sort words by r-controlled pattern'
        ],
        materials: [
          {
            name: 'AR Words Cards',
            nameZh: 'AR词卡',
            search1688: '蒙氏音组卡 ar 英文',
            specs: 'Picture + word cards for ar words',
            price: '¥25-40',
            essential: true
          },
          {
            name: 'OR Words Cards',
            nameZh: 'OR词卡',
            search1688: '蒙氏音组卡 or 英文',
            specs: 'Picture + word cards for or words',
            price: '¥25-40',
            essential: true
          },
          {
            name: 'ER/IR/UR Words Cards',
            nameZh: 'ER/IR/UR词卡',
            search1688: '蒙氏音组卡 er ir ur 英文',
            specs: 'Picture + word cards showing same sound',
            price: '¥30-50',
            essential: true
          },
          {
            name: 'R-Controlled Booklets',
            nameZh: 'R控制元音小书',
            search1688: '蒙氏phonics小书 bossy r',
            specs: 'Readers featuring r-controlled words',
            price: '¥40-60',
            essential: true
          }
        ],
        controlOfError: 'Pattern consistency',
        pointOfInterest: 'R is "bossy" - changes vowel sounds',
        extensions: ['Bossy R rules', 'Spelling patterns', 'Writing practice']
      },
      {
        id: 'silent_e',
        name: 'Silent E (Magic E) Reading',
        age: '5-6 years',
        directAim: 'Read CVCe words where silent e makes vowel say its name',
        indirectAims: ['Spelling rule: silent e', 'Long vowel patterns'],
        prerequisites: 'CVC words fluent; understand short/long vowel difference',
        presentation: [
          'Magic E Rule: Silent e at end makes vowel say its name',
          '',
          'A_E words: make, cake, lake, take, game, name, came, made, safe, cave',
          'I_E words: like, bike, time, five, nine, line, mine, hide, ride, smile',
          'O_E words: home, bone, cone, hole, note, hope, rope, rose, nose, stone',
          'U_E words: cute, huge, use, cube, tube, June, rule, mule',
          '',
          'Compare CVC to CVCe:',
          'cap → cape, tap → tape, kit → kite, bit → bite',
          'hop → hope, not → note, cub → cube, tub → tube',
          '',
          'Sort word pairs showing transformation'
        ],
        materials: [
          {
            name: 'Silent E Word Cards',
            nameZh: '魔法E词卡',
            search1688: '蒙氏phonics magic e 英文',
            altSearch: '蒙氏CVCe单词卡 silent e',
            specs: 'Word cards with CVCe pattern',
            price: '¥40-60',
            essential: true
          },
          {
            name: 'CVC to CVCe Comparison Cards',
            nameZh: 'CVC变CVCe对比卡',
            search1688: '蒙氏phonics CVC CVCe 对比',
            specs: 'Paired cards: cap/cape, hop/hope',
            price: '¥30-50',
            essential: true
          },
          {
            name: 'Silent E Booklets',
            nameZh: '魔法E小书',
            search1688: '蒙氏phonics小书 magic e silent e',
            specs: 'Readers featuring CVCe words',
            price: '¥40-60',
            essential: true
          }
        ],
        controlOfError: 'Pattern consistency; word pairs',
        pointOfInterest: 'Magic e transforms words!',
        extensions: ['Word transformation games', 'Spelling practice', 'Silent e hunt']
      },
      {
        id: 'interpretive_reading',
        name: 'Interpretive Reading',
        age: '5-6 years',
        directAim: 'Read with meaning, expression, and comprehension',
        indirectAims: ['Fluency', 'Comprehension', 'Expression'],
        prerequisites: 'Decoding fluency across series',
        presentation: [
          'Command cards requiring interpretation:',
          '"Walk slowly to the door, then skip back quickly"',
          'Child must understand meaning to perform action',
          '',
          'Questions requiring inference:',
          'Read passage, answer comprehension questions',
          '',
          'Expression practice:',
          'Read dialogue with appropriate voices',
          'Read with punctuation awareness'
        ],
        materials: [
          {
            name: 'Interpretive Command Cards',
            nameZh: '理解性指令卡',
            search1688: '蒙氏阅读理解卡 英文',
            specs: 'Multi-step commands requiring comprehension',
            price: '¥30-50',
            essential: true
          },
          {
            name: 'Reading Comprehension Cards',
            nameZh: '阅读理解卡',
            search1688: '蒙氏阅读理解 问答卡 英文',
            specs: 'Short passages with questions',
            price: '¥40-60',
            essential: true
          }
        ],
        controlOfError: 'Action/answer correctness',
        pointOfInterest: 'Reading leads to understanding and action',
        extensions: ['Readers theater', 'Story discussion', 'Question generation']
      },
      {
        id: 'total_reading',
        name: 'Total Reading',
        age: '5-6 years',
        directAim: 'Independent reading of varied texts for meaning',
        indirectAims: ['Reading stamina', 'Comprehension', 'Love of reading'],
        prerequisites: 'All phonetic series; sight words; interpretive reading',
        presentation: [
          'Provide varied reading materials:',
          '- Decodable books at independent level',
          '- Picture books (paired reading)',
          '- Non-fiction texts',
          '- Child\'s own writing',
          '',
          'Daily independent reading time',
          'Book discussions and sharing',
          'Reading log/journal'
        ],
        materials: [
          {
            name: 'Leveled Readers Set',
            nameZh: '分级阅读套装',
            search1688: '英文分级阅读 幼儿园 套装',
            altSearch: 'Oxford Reading Tree 英文原版',
            specs: 'Progressive difficulty readers',
            price: '¥100-300 set',
            essential: true
          },
          {
            name: 'Reading Corner Books',
            nameZh: '阅读角图书',
            search1688: '英文绘本 幼儿园 套装',
            specs: 'Quality picture books for shared reading',
            price: '¥200-500 collection',
            essential: true
          },
          {
            name: 'Reading Log',
            nameZh: '阅读记录本',
            search1688: '阅读记录本 儿童',
            specs: 'Simple log for tracking reading',
            price: '¥10-20',
            essential: false
          }
        ],
        controlOfError: 'Comprehension; enjoyment',
        pointOfInterest: 'Reading for pleasure and information',
        extensions: ['Book recommendations', 'Author studies', 'Genre exploration']
      }
    ]
  },

  // =========================================================================
  // 8. HANDWRITING
  // =========================================================================
  {
    id: 'handwriting',
    name: 'Handwriting',
    icon: '✍️',
    sequence: 8,
    description: 'Transition from Moveable Alphabet to pencil and paper writing. Prepared by Metal Insets, Sand Tray, and Chalkboard work.',
    works: [
      {
        id: 'paper_letters',
        name: 'Writing Letters on Paper',
        age: '4.5-5.5 years',
        directAim: 'Transfer letter formation to paper with pencil',
        indirectAims: ['Fine motor control', 'Proper letter formation', 'Writing independence'],
        prerequisites: 'Metal Insets (presentations 1-5); Sand tray; Chalkboard writing; Most sandpaper letters',
        presentation: [
          'Trace sandpaper letter',
          'Write letter on lined paper',
          'Start with letters child knows well',
          'Emphasize proper formation (starting point, direction)',
          'Use lined paper with clear guides'
        ],
        materials: [
          {
            name: 'Lined Writing Paper',
            nameZh: '英文书写纸',
            search1688: '英文书写纸 四线三格 幼儿',
            altSearch: '蒙氏书写纸 英文 初学',
            specs: 'Four-line paper, large spacing for beginners',
            price: '¥15-30 per pad',
            essential: true
          },
          {
            name: 'Primary Pencils',
            nameZh: '初学铅笔',
            search1688: '三角铅笔 HB 粗杆 幼儿',
            specs: 'Triangular, thick for proper grip',
            price: '¥15-30',
            essential: true
          }
        ],
        controlOfError: 'Visual comparison with sandpaper letter',
        pointOfInterest: 'Making "real" letters',
        extensions: ['Words', 'Sentences', 'Copy work']
      },
      {
        id: 'creative_writing',
        name: 'Creative Writing',
        age: '5-6 years',
        directAim: 'Express original thoughts in written form',
        indirectAims: ['Communication', 'Self-expression', 'Organization of ideas'],
        prerequisites: 'Writing letters and words; reading sentences',
        presentation: [
          'Begin with Moveable Alphabet stories',
          'Progress to writing own words with pencil',
          'Support spelling attempts - encourage phonetic spelling',
          'Value content over correctness initially',
          'Provide meaningful purposes: letters, journals, stories'
        ],
        materials: [
          {
            name: 'Writing Journals',
            nameZh: '写作本',
            search1688: '英文作文本 四线三格 幼儿园',
            specs: 'Blank or lightly lined for creative work',
            price: '¥10-20',
            essential: true
          },
          {
            name: 'Story Paper',
            nameZh: '故事纸',
            search1688: '儿童故事纸 上图下文',
            specs: 'Drawing space at top, lines below',
            price: '¥15-30',
            essential: false
          }
        ],
        controlOfError: 'Meaning; communication success',
        pointOfInterest: 'Sharing own ideas',
        extensions: ['Book making', 'Letter writing', 'Poetry']
      },
      {
        id: 'copy_work',
        name: 'Copy Work',
        age: '5-6 years',
        directAim: 'Develop handwriting fluency through copying quality text',
        indirectAims: ['Spelling internalization', 'Punctuation awareness', 'Sentence structure'],
        prerequisites: 'Letter formation; reading sentences',
        presentation: [
          'Provide quality text for copying:',
          '- Poems and rhymes',
          '- Inspirational quotes',
          '- Nature observations',
          '- Song lyrics',
          '',
          'Child reads text first',
          'Copies carefully with attention to:',
          '- Letter formation',
          '- Spacing between words',
          '- Punctuation',
          '- Capital letters'
        ],
        materials: [
          {
            name: 'Copy Work Cards',
            nameZh: '抄写卡',
            search1688: '英文抄写卡 儿童 名言',
            specs: 'Quality text for copying in cursive or print',
            price: '¥20-40',
            essential: true
          },
          {
            name: 'Copy Work Notebook',
            nameZh: '抄写本',
            search1688: '英文抄写本 四线三格',
            specs: 'Lined notebook for copy work',
            price: '¥10-20',
            essential: true
          }
        ],
        controlOfError: 'Visual comparison with original',
        pointOfInterest: 'Beautiful handwriting; quality content',
        extensions: ['Longer passages', 'Favorite poems', 'Book excerpts']
      },
      {
        id: 'dictation',
        name: 'Dictation',
        age: '5.5-6 years',
        directAim: 'Write words and sentences from auditory input',
        indirectAims: ['Spelling', 'Listening skills', 'Sound-symbol connection'],
        prerequisites: 'Copy work; phonetic spelling; sight words',
        presentation: [
          'Start with single phonetic words',
          'Progress to phrases',
          'Progress to sentences',
          '',
          'Process:',
          '1. Say word/sentence clearly',
          '2. Child repeats to confirm hearing',
          '3. Child writes',
          '4. Check together',
          '',
          'Accept phonetic spelling initially',
          'Gradually expect conventional spelling for learned patterns'
        ],
        materials: [
          {
            name: 'Dictation Word Lists',
            nameZh: '听写词表',
            search1688: '英文听写词表 phonics',
            specs: 'Graded word lists for dictation',
            price: '¥15-30',
            essential: true
          },
          {
            name: 'Dictation Notebook',
            nameZh: '听写本',
            search1688: '英文听写本 幼儿',
            specs: 'Lined notebook for dictation',
            price: '¥10-20',
            essential: true
          }
        ],
        controlOfError: 'Comparison with correct spelling',
        pointOfInterest: 'Writing what is heard',
        extensions: ['Story dictation', 'Parent letters', 'Research notes']
      },
      {
        id: 'book_making',
        name: 'Book Making',
        age: '5-6 years',
        directAim: 'Create personal books combining writing and illustration',
        indirectAims: ['Story structure', 'Publishing process', 'Pride in work'],
        prerequisites: 'Creative writing; illustration skills',
        presentation: [
          'Types of books children can make:',
          '- "All About Me" books',
          '- Nature observation journals',
          '- Story books',
          '- How-to books',
          '- ABC/counting books',
          '',
          'Process:',
          '1. Plan story/content',
          '2. Draft text',
          '3. Create illustrations',
          '4. Assemble pages',
          '5. Create cover',
          '6. Share with class/family'
        ],
        materials: [
          {
            name: 'Blank Books',
            nameZh: '空白书',
            search1688: '空白绘本 DIY 儿童',
            altSearch: '手工书 空白页 儿童',
            specs: 'Pre-bound blank books, various sizes',
            price: '¥10-25 each',
            essential: true
          },
          {
            name: 'Book Making Supplies',
            nameZh: '制书工具',
            search1688: '儿童手工书工具 装订',
            specs: 'Paper, stapler, cover materials',
            price: '¥30-60',
            essential: false
          }
        ],
        controlOfError: 'Communication of meaning',
        pointOfInterest: 'Being a real author',
        extensions: ['Author visits', 'Class library', 'Book gifts']
      }
    ]
  },

  // =========================================================================
  // 9. WORD STUDY
  // =========================================================================
  {
    id: 'word_study',
    name: 'Word Study',
    icon: '🔍',
    sequence: 9,
    description: 'Explore how words are built, related, and modified. Compound words, contractions, prefixes, suffixes, synonyms, antonyms, and homonyms.',
    amiNotes: 'Word study begins when child is reading fluently and notices patterns in words. Presented through discovery and sorting activities.',
    works: [
      {
        id: 'compound_words',
        name: 'Compound Words',
        age: '5-6 years',
        directAim: 'Understand that two words can combine to make a new word',
        indirectAims: ['Vocabulary expansion', 'Word analysis', 'Spelling'],
        prerequisites: 'Reading fluency; understanding word meaning',
        presentation: [
          'Show two words combining:',
          'sun + flower = sunflower',
          'rain + bow = rainbow',
          'cup + cake = cupcake',
          '',
          'COMPOUND WORD EXAMPLES:',
          'airplane, backpack, baseball, bathroom, bedroom',
          'birthday, butterfly, classroom, cowboy, cupcake',
          'doghouse, doorbell, downtown, dragonfly, earring',
          'fireman, football, goldfish, grandma, grasshopper',
          'haircut, homework, hotdog, inside, ladybug',
          'moonlight, notebook, outside, pancake, playground',
          'rainbow, sailboat, seashell, snowman, starfish',
          'sunflower, toothbrush, waterfall, weekend, without',
          '',
          'Activities:',
          '- Match word halves',
          '- Picture + word matching',
          '- Create compound word equations'
        ],
        materials: [
          {
            name: 'Compound Word Cards',
            nameZh: '复合词卡',
            search1688: '蒙氏复合词卡 英文 compound',
            altSearch: '英文复合词配对卡',
            specs: 'Word halves for matching, pictures',
            price: '¥40-60',
            essential: true
          },
          {
            name: 'Compound Word Pictures',
            nameZh: '复合词图片',
            search1688: '复合词图片卡 英文',
            specs: 'Pictures of compound words',
            price: '¥30-50',
            essential: false
          }
        ],
        controlOfError: 'Meaning - combined word makes sense',
        pointOfInterest: 'Word math! Two words make one',
        extensions: ['Finding compounds in reading', 'Creating new compounds', 'Compound word hunt']
      },
      {
        id: 'contractions',
        name: 'Contractions',
        age: '5-6 years',
        directAim: 'Understand that contractions shorten two words into one',
        indirectAims: ['Reading fluency', 'Writing conventions', 'Apostrophe use'],
        prerequisites: 'Reading fluently; understanding the component words',
        presentation: [
          'Show how words combine with apostrophe:',
          'I + am = I\'m',
          'you + are = you\'re',
          'it + is = it\'s',
          '',
          'CONTRACTION FAMILIES:',
          '',
          'NOT contractions:',
          'is not = isn\'t, are not = aren\'t, was not = wasn\'t',
          'do not = don\'t, does not = doesn\'t, did not = didn\'t',
          'can not = can\'t, will not = won\'t, would not = wouldn\'t',
          'should not = shouldn\'t, could not = couldn\'t, have not = haven\'t',
          '',
          'IS/ARE/AM contractions:',
          'I am = I\'m, you are = you\'re, he is = he\'s',
          'she is = she\'s, it is = it\'s, we are = we\'re',
          'they are = they\'re, that is = that\'s, what is = what\'s',
          '',
          'WILL/WOULD contractions:',
          'I will = I\'ll, you will = you\'ll, he will = he\'ll',
          'I would = I\'d, you would = you\'d, we would = we\'d',
          '',
          'HAVE/HAS contractions:',
          'I have = I\'ve, you have = you\'ve, we have = we\'ve',
          'he has = he\'s, she has = she\'s'
        ],
        materials: [
          {
            name: 'Contraction Cards',
            nameZh: '缩写词卡',
            search1688: '蒙氏缩写词卡 英文 contraction',
            altSearch: '英文缩写配对卡',
            specs: 'Two words → contraction matching cards',
            price: '¥30-50',
            essential: true
          },
          {
            name: 'Contraction Chart',
            nameZh: '缩写词表',
            search1688: '英文缩写词表 海报',
            specs: 'Reference chart showing common contractions',
            price: '¥15-30',
            essential: false
          }
        ],
        controlOfError: 'Meaning equivalence',
        pointOfInterest: 'Shortcut words! Apostrophe replaces letters',
        extensions: ['Finding contractions in text', 'Expanding contractions', 'Writing with contractions']
      },
      {
        id: 'prefixes',
        name: 'Prefixes',
        age: '5.5-6 years',
        directAim: 'Understand that prefixes added to beginning change word meaning',
        indirectAims: ['Vocabulary expansion', 'Word analysis', 'Reading comprehension'],
        prerequisites: 'Reading fluency; base word recognition',
        presentation: [
          'PREFIX = word part added to BEGINNING',
          '',
          'UN- (not, opposite):',
          'happy → unhappy, kind → unkind, do → undo',
          'fair → unfair, lock → unlock, tie → untie',
          '',
          'RE- (again):',
          'do → redo, read → reread, write → rewrite',
          'play → replay, build → rebuild, make → remake',
          '',
          'PRE- (before):',
          'school → preschool, heat → preheat, view → preview',
          '',
          'DIS- (not, opposite):',
          'like → dislike, agree → disagree, appear → disappear',
          '',
          'MIS- (wrongly):',
          'spell → misspell, lead → mislead, behave → misbehave',
          '',
          'Activities:',
          '- Sort words by prefix',
          '- Build words with prefix cards',
          '- Find prefix words in reading'
        ],
        materials: [
          {
            name: 'Prefix Cards',
            nameZh: '前缀卡',
            search1688: '蒙氏前缀卡 英文 prefix',
            altSearch: '英文前缀后缀卡片',
            specs: 'Prefix + base word combination cards',
            price: '¥40-60',
            essential: true
          },
          {
            name: 'Prefix Reference Chart',
            nameZh: '前缀参考表',
            search1688: '英文前缀表 海报',
            specs: 'Wall chart showing common prefixes',
            price: '¥15-30',
            essential: false
          }
        ],
        controlOfError: 'Meaning change; dictionary',
        pointOfInterest: 'Small parts change big meanings!',
        extensions: ['Prefix hunt', 'Creating new words', 'Suffix connection']
      },
      {
        id: 'suffixes',
        name: 'Suffixes',
        age: '5.5-6 years',
        directAim: 'Understand that suffixes added to ending change word meaning or type',
        indirectAims: ['Vocabulary expansion', 'Grammar connections', 'Spelling patterns'],
        prerequisites: 'Reading fluency; prefix work',
        presentation: [
          'SUFFIX = word part added to END',
          '',
          '-ED (past tense):',
          'walk → walked, jump → jumped, play → played',
          '',
          '-ING (ongoing action):',
          'walk → walking, jump → jumping, play → playing',
          '',
          '-ER (one who / comparison):',
          'teach → teacher, farm → farmer, fast → faster',
          '',
          '-EST (most):',
          'fast → fastest, tall → tallest, big → biggest',
          '',
          '-LY (how/manner):',
          'slow → slowly, quick → quickly, quiet → quietly',
          '',
          '-FUL (full of):',
          'help → helpful, care → careful, joy → joyful',
          '',
          '-LESS (without):',
          'help → helpless, care → careless, fear → fearless',
          '',
          'SPELLING CHANGES:',
          '- Double consonant: hop → hopping, big → bigger',
          '- Drop e: make → making, hope → hoped',
          '- Y to i: happy → happily, carry → carried'
        ],
        materials: [
          {
            name: 'Suffix Cards',
            nameZh: '后缀卡',
            search1688: '蒙氏后缀卡 英文 suffix',
            altSearch: '英文前缀后缀卡片',
            specs: 'Base word + suffix combination cards',
            price: '¥40-60',
            essential: true
          },
          {
            name: 'Suffix Reference Chart',
            nameZh: '后缀参考表',
            search1688: '英文后缀表 海报',
            specs: 'Wall chart showing common suffixes',
            price: '¥15-30',
            essential: false
          }
        ],
        controlOfError: 'Meaning/function change; spelling rules',
        pointOfInterest: 'Endings change how words work!',
        extensions: ['Suffix sorting', 'Spelling rule practice', 'Grammar connections']
      },
      {
        id: 'synonyms',
        name: 'Synonyms',
        age: '5-6 years',
        directAim: 'Understand that different words can have similar meanings',
        indirectAims: ['Vocabulary expansion', 'Writing variety', 'Precise expression'],
        prerequisites: 'Strong vocabulary base; reading fluency',
        presentation: [
          'SYNONYMS = words with SIMILAR meanings',
          '',
          'COMMON SYNONYM PAIRS:',
          'big - large, little - small, happy - glad',
          'sad - unhappy, fast - quick, slow - sluggish',
          'pretty - beautiful, ugly - hideous, nice - kind',
          'mean - cruel, smart - clever, silly - foolish',
          'begin - start, end - finish, look - see',
          'talk - speak, walk - stroll, run - sprint',
          'like - enjoy, hate - despise, want - desire',
          'good - excellent, bad - terrible, old - ancient',
          '',
          'Activities:',
          '- Match synonym pairs',
          '- Find synonyms in thesaurus',
          '- Replace words in sentences'
        ],
        materials: [
          {
            name: 'Synonym Cards',
            nameZh: '同义词卡',
            search1688: '蒙氏同义词卡 英文 synonym',
            altSearch: '英文同义词配对卡',
            specs: 'Matching cards for synonym pairs',
            price: '¥30-50',
            essential: true
          },
          {
            name: 'Children\'s Thesaurus',
            nameZh: '儿童同义词典',
            search1688: '儿童同义词典 英文',
            specs: 'Simple thesaurus for children',
            price: '¥50-100',
            essential: false
          }
        ],
        controlOfError: 'Meaning similarity; thesaurus',
        pointOfInterest: 'Many ways to say the same thing!',
        extensions: ['Sentence variety', 'Writing improvement', 'Word games']
      },
      {
        id: 'antonyms',
        name: 'Antonyms',
        age: '5-6 years',
        directAim: 'Understand that some words have opposite meanings',
        indirectAims: ['Vocabulary expansion', 'Logical thinking', 'Word relationships'],
        prerequisites: 'Strong vocabulary base; synonym work',
        presentation: [
          'ANTONYMS = words with OPPOSITE meanings',
          '',
          'COMMON ANTONYM PAIRS:',
          'big - small, tall - short, long - short',
          'hot - cold, wet - dry, fast - slow',
          'happy - sad, good - bad, nice - mean',
          'up - down, in - out, on - off',
          'open - close, start - stop, come - go',
          'day - night, light - dark, sun - moon',
          'boy - girl, man - woman, old - young',
          'yes - no, true - false, right - wrong',
          'hard - soft, loud - quiet, rough - smooth',
          'full - empty, heavy - light, thick - thin',
          '',
          'Activities:',
          '- Match opposite pairs',
          '- Opposite word hunt',
          '- Complete the opposite sentences'
        ],
        materials: [
          {
            name: 'Antonym Cards',
            nameZh: '反义词卡',
            search1688: '蒙氏反义词卡 英文 antonym',
            altSearch: '英文反义词配对卡',
            specs: 'Matching cards for antonym pairs',
            price: '¥30-50',
            essential: true
          },
          {
            name: 'Antonym Pictures',
            nameZh: '反义词图片',
            search1688: '反义词图片卡 英文',
            specs: 'Picture pairs showing opposites',
            price: '¥30-50',
            essential: false
          }
        ],
        controlOfError: 'Clear opposition in meaning',
        pointOfInterest: 'Words can be opposites!',
        extensions: ['Antonym stories', 'Comparison writing', 'Word games']
      },
      {
        id: 'homonyms',
        name: 'Homonyms (Homophones & Homographs)',
        age: '5.5-6 years',
        directAim: 'Understand that some words sound same but have different meanings/spellings',
        indirectAims: ['Spelling awareness', 'Context clues', 'Careful reading'],
        prerequisites: 'Reading fluency; spelling awareness',
        presentation: [
          'HOMOPHONES = sound same, spelled differently:',
          'to - too - two, there - their - they\'re',
          'here - hear, see - sea, be - bee',
          'know - no, write - right, read - red',
          'blue - blew, new - knew, ate - eight',
          'sun - son, one - won, flour - flower',
          'dear - deer, bear - bare, hair - hare',
          'tail - tale, sale - sail, pail - pale',
          'meet - meat, week - weak, break - brake',
          '',
          'HOMOGRAPHS = spelled same, different meanings:',
          'bat (animal) - bat (baseball)',
          'can (able) - can (container)',
          'fly (insect) - fly (to soar)',
          'left (direction) - left (departed)',
          'ring (jewelry) - ring (sound)',
          '',
          'Activities:',
          '- Sort homophones with pictures',
          '- Use in sentences to show meaning',
          '- Homophone riddles'
        ],
        materials: [
          {
            name: 'Homophone Cards',
            nameZh: '同音词卡',
            search1688: '蒙氏同音词卡 英文 homophone',
            altSearch: '英文同音异形词卡',
            specs: 'Cards with homophones and pictures',
            price: '¥40-60',
            essential: true
          },
          {
            name: 'Homophone Sentences',
            nameZh: '同音词句子卡',
            search1688: '英文同音词句子练习',
            specs: 'Fill-in sentences for homophones',
            price: '¥20-40',
            essential: false
          }
        ],
        controlOfError: 'Context and meaning',
        pointOfInterest: 'Tricky words that sound the same!',
        extensions: ['Homophone hunt', 'Writing practice', 'Spelling focus']
      }
    ]
  },

  // =========================================================================
  // 10. GRAMMAR
  // =========================================================================
  {
    id: 'grammar',
    name: 'Grammar & Sentence Analysis',
    icon: '🔺',
    sequence: 10,
    description: 'Parts of speech through games and symbols. Experience before terminology. The 9 grammar symbols represent the parts of speech.',
    amiNotes: 'Grammar is taught experientially through games and action, not through worksheets. Each part of speech is introduced through a specific game before symbols are given.',
    works: [
      {
        id: 'function_noun',
        name: 'Function of Words - Noun',
        age: '4.5-5 years',
        directAim: 'Experience that nouns are naming words for people, places, things',
        indirectAims: ['Grammar awareness', 'Sentence structure'],
        prerequisites: 'Reading simple sentences',
        presentation: [
          'THE NOUN GAME:',
          '"I\'m going to write a word. Read it and bring me what it says."',
          'Write: "pencil" on slip, child reads, brings pencil',
          'Continue with multiple objects',
          '"These words NAME things. We call them NOUNS."',
          'Introduce symbol: Large BLACK TRIANGLE',
          'Why triangle? Pyramid = ancient, solid, stable matter',
          'Why black? Carbon = basis of matter'
        ],
        materials: [
          {
            name: 'Grammar Symbol - Noun (3D)',
            nameZh: '立体语法符号-名词',
            search1688: '蒙氏立体语法符号 木质 全套',
            specs: 'Large black equilateral triangle, painted beechwood',
            price: '¥80-150 full set',
            essential: true
          },
          {
            name: 'Grammar Symbols (2D)',
            nameZh: '平面语法符号',
            search1688: '蒙氏平面语法符号盒 专业版',
            specs: 'Paper cutouts, 100 of each symbol',
            price: '¥40-80',
            essential: true
          },
          {
            name: 'Grammar Symbol Box',
            nameZh: '语法符号收纳盒',
            search1688: '蒙氏语法符号盒 木质',
            specs: 'Compartments for all symbols',
            price: '¥40-80',
            essential: true
          }
        ],
        controlOfError: 'Can you bring it? (Physical verification)',
        pointOfInterest: 'The movement; discovery that words name things',
        extensions: ['Noun hunt', 'Sorting common/proper nouns', 'Article introduction']
      },
      {
        id: 'function_article',
        name: 'Function of Words - Article',
        age: '4.5-5 years',
        directAim: 'Experience that articles announce nouns',
        indirectAims: ['Grammar precision', 'Reading fluency'],
        prerequisites: 'Noun game',
        presentation: [
          '"Bring me pencil" (no article) - child may bring any pencil',
          '"Bring me THE pencil" - which one?',
          '"Bring me A pencil" - any will do',
          'Articles tell us WHICH noun',
          'Symbol: Small LIGHT BLUE triangle (announces the noun)'
        ],
        materials: [
          {
            name: 'Grammar Symbol - Article',
            nameZh: '语法符号-冠词',
            search1688: '蒙氏平面语法符号盒',
            specs: 'Small light blue equilateral triangle',
            price: 'Included in set',
            essential: true
          }
        ],
        controlOfError: 'Meaning - which pencil?',
        pointOfInterest: 'The precision articles provide',
        extensions: ['A vs AN', 'THE for specific', 'Reading practice']
      },
      {
        id: 'function_adjective',
        name: 'Function of Words - Adjective',
        age: '4.5-5.5 years',
        directAim: 'Experience that adjectives describe nouns',
        indirectAims: ['Descriptive language', 'Precision in expression'],
        prerequisites: 'Noun and article games',
        presentation: [
          'Set out multiple similar objects (several pencils)',
          '"Bring me the pencil" - which one?',
          '"Bring me the RED pencil" - now clear!',
          '"Bring me the LONG RED pencil" - even more specific',
          'Adjectives DESCRIBE nouns',
          'Symbol: Medium DARK BLUE triangle (same family as noun)'
        ],
        materials: [
          {
            name: 'Grammar Symbol - Adjective',
            nameZh: '语法符号-形容词',
            search1688: '蒙氏平面语法符号盒',
            specs: 'Medium dark blue equilateral triangle',
            price: 'Included in set',
            essential: true
          },
          {
            name: 'Adjective Command Cards',
            nameZh: '形容词指令卡',
            search1688: '蒙氏语法指令卡 英文',
            specs: 'Cards with adjective-noun phrases',
            price: '¥30-60',
            essential: false
          }
        ],
        controlOfError: 'Can you find the right one?',
        pointOfInterest: 'Using description to specify',
        extensions: ['Adjective hunts', 'Describing game', 'Comparative/superlative']
      },
      {
        id: 'function_verb',
        name: 'Function of Words - Verb',
        age: '5-5.5 years',
        directAim: 'Experience that verbs are action/doing words',
        indirectAims: ['Sentence structure', 'Action vocabulary'],
        prerequisites: 'Noun family games',
        presentation: [
          'Write action word on slip: "jump"',
          'Child reads and DOES the action',
          'Continue: walk, hop, spin, clap, sit, stand',
          'Verbs tell us WHAT TO DO',
          'Symbol: Large RED CIRCLE',
          'Why circle? Sun = energy, life',
          'Why red? Energy, vitality'
        ],
        materials: [
          {
            name: 'Grammar Symbol - Verb',
            nameZh: '语法符号-动词',
            search1688: '蒙氏立体语法符号 动词 红色圆',
            specs: 'Large red sphere (3D) or circle (2D)',
            price: 'Included in set',
            essential: true
          },
          {
            name: 'Verb Command Cards',
            nameZh: '动词指令卡',
            search1688: '蒙氏动词指令卡 英文',
            specs: 'Action word cards',
            price: '¥20-40',
            essential: true
          }
        ],
        controlOfError: 'Can you do it?',
        pointOfInterest: 'The movement and action',
        extensions: ['Verb + adverb', 'Tense introduction', 'Verb phrases']
      },
      {
        id: 'function_adverb',
        name: 'Function of Words - Adverb',
        age: '5-5.5 years',
        directAim: 'Experience that adverbs modify verbs',
        indirectAims: ['Precision in expression', 'Grammar relationships'],
        prerequisites: 'Verb game',
        presentation: [
          '"Walk" - child walks normally',
          '"Walk SLOWLY" - child walks slowly',
          '"Walk QUICKLY" - child walks quickly',
          '"Walk QUIETLY" - child tiptoes',
          'Adverbs tell us HOW',
          'Symbol: Small ORANGE circle (modifies verb, same family)'
        ],
        materials: [
          {
            name: 'Grammar Symbol - Adverb',
            nameZh: '语法符号-副词',
            search1688: '蒙氏平面语法符号盒',
            specs: 'Small orange circle',
            price: 'Included in set',
            essential: true
          }
        ],
        controlOfError: 'Visible difference in action',
        pointOfInterest: 'Changing HOW action is done',
        extensions: ['Adverbs of place', 'Adverbs of time', 'Comparative adverbs']
      },
      {
        id: 'function_others',
        name: 'Function of Words - Remaining Parts of Speech',
        age: '5.5-6 years',
        directAim: 'Complete understanding of all 9 parts of speech',
        indirectAims: ['Complete grammar foundation', 'Sentence analysis preparation'],
        prerequisites: 'Noun family and verb family games',
        presentation: [
          'PREPOSITION:',
          'Put pencil ON table, UNDER table, BESIDE cup',
          'Shows position/relationship',
          'Symbol: GREEN crescent/bridge',
          '',
          'PRONOUN:',
          '"Mary is kind. She is kind." - what replaced Mary?',
          'Stands for nouns',
          'Symbol: PURPLE tall triangle',
          '',
          'CONJUNCTION:',
          'Physically connect ribbon: "cat AND dog"',
          'Connects words/phrases',
          'Symbol: PINK rectangle/ribbon',
          '',
          'INTERJECTION:',
          '"Oh!" "Wow!" "Ouch!"',
          'Expresses emotion',
          'Symbol: GOLD keyhole'
        ],
        materials: [
          {
            name: 'Complete Grammar Symbol Set',
            nameZh: '语法符号全套',
            search1688: '蒙氏语法符号 全套 9种 专业版',
            specs: 'All 9 parts of speech, 3D and 2D',
            price: '¥150-300',
            essential: true
          },
          {
            name: 'Grammar Command Card Sets',
            nameZh: '语法指令卡全套',
            search1688: '蒙氏语法指令卡 英文 全套',
            specs: 'Cards for all parts of speech games',
            price: '¥80-150',
            essential: true
          }
        ],
        controlOfError: 'Meaning and function',
        pointOfInterest: 'Discovering how language works',
        extensions: ['Sentence analysis', 'Grammar boxes']
      },
      {
        id: 'sentence_analysis',
        name: 'Sentence Analysis',
        age: '5.5-6 years',
        directAim: 'Analyze sentence structure - subject, predicate, objects',
        indirectAims: ['Reading comprehension', 'Writing structure'],
        prerequisites: 'All Function of Words games; Grammar symbols',
        presentation: [
          'Simple sentence: "The dog runs."',
          'WHO runs? The dog (SUBJECT)',
          'What does the dog do? runs (PREDICATE)',
          '',
          'Use reading analysis charts:',
          'Black circle/arrow for subject/object',
          'Red circle for predicate',
          '',
          'Progress to:',
          'Direct objects: "The dog eats food"',
          'Indirect objects: "The boy gives the girl a flower"'
        ],
        materials: [
          {
            name: 'Sentence Analysis Charts',
            nameZh: '句子分析图',
            search1688: '蒙氏句子分析图 英文',
            altSearch: '蒙氏reading analysis chart',
            specs: 'Charts with arrows, circles, question prompts',
            price: '¥60-120',
            essential: true
          },
          {
            name: 'Sentence Strips',
            nameZh: '句子条',
            search1688: '蒙氏句子分析材料 英文',
            specs: 'Prepared sentences with control cards',
            price: '¥40-80',
            essential: true
          },
          {
            name: 'Grammar Boxes (9 boxes)',
            nameZh: '语法盒',
            search1688: '蒙氏语法盒 英文 全套',
            specs: '9 compartmentalized boxes for sentence work',
            price: '¥200-400',
            essential: false
          }
        ],
        controlOfError: 'Question system; control cards',
        pointOfInterest: 'Discovering sentence patterns',
        extensions: ['Complex sentences', 'Clause analysis', 'Elementary grammar']
      },
      {
        id: 'logical_adjective',
        name: 'Logical Adjective Game',
        age: '5-6 years',
        directAim: 'Understand logical vs illogical adjective use',
        indirectAims: ['Critical thinking', 'Vocabulary precision', 'Comprehension'],
        prerequisites: 'Adjective function game',
        presentation: [
          'Present sentences with logical adjectives:',
          '"The tall man" ✓',
          '"The sweet candy" ✓',
          '',
          'Present sentences with illogical adjectives:',
          '"The loud pencil" ✗',
          '"The wet fire" ✗',
          '',
          'Children identify which make sense',
          'Discuss why some combinations are illogical',
          'Sort sentences into logical/illogical'
        ],
        materials: [
          {
            name: 'Logical Adjective Cards',
            nameZh: '逻辑形容词卡',
            search1688: '蒙氏语法游戏卡 形容词 英文',
            specs: 'Sentence cards for logical/illogical sorting',
            price: '¥25-40',
            essential: false
          }
        ],
        controlOfError: 'Logic and meaning',
        pointOfInterest: 'Some combinations are silly!',
        extensions: ['Creating silly sentences', 'Writing sensible descriptions']
      },
      {
        id: 'detective_adjective',
        name: 'Detective Adjective Game',
        age: '5-6 years',
        directAim: 'Use adjectives precisely to identify specific objects',
        indirectAims: ['Descriptive precision', 'Vocabulary expansion', 'Observation skills'],
        prerequisites: 'Logical adjective game',
        presentation: [
          'Place several similar objects on table',
          '(e.g., 5 different pencils)',
          '',
          'Child must find ONE specific pencil using adjectives',
          '"Find the pencil" - which one?',
          '"Find the long pencil" - still several',
          '"Find the long, red pencil" - narrowing down',
          '"Find the long, red, sharp pencil" - found it!',
          '',
          'Children play as "detective" and "describer"'
        ],
        materials: [
          {
            name: 'Detective Game Objects',
            nameZh: '侦探游戏物件',
            search1688: '蒙氏形容词游戏物件',
            specs: 'Sets of similar objects with varying attributes',
            price: '¥30-50',
            essential: false
          }
        ],
        controlOfError: 'Correct object identification',
        pointOfInterest: 'Being a word detective!',
        extensions: ['I Spy with adjectives', 'Written descriptions', 'Mystery descriptions']
      },
      {
        id: 'verb_tense',
        name: 'Verb Tenses',
        age: '5.5-6 years',
        directAim: 'Understand verbs change form to show time',
        indirectAims: ['Time concepts', 'Writing conventions', 'Grammar foundations'],
        prerequisites: 'Verb function game; reading fluently',
        presentation: [
          'PAST - PRESENT - FUTURE:',
          '',
          'Yesterday I walked. (past)',
          'Today I walk. (present)',
          'Tomorrow I will walk. (future)',
          '',
          'REGULAR PAST TENSE (-ed):',
          'walk → walked, jump → jumped, play → played',
          '',
          'IRREGULAR PAST TENSE:',
          'go → went, see → saw, eat → ate',
          'run → ran, come → came, make → made',
          'say → said, take → took, give → gave',
          '',
          'Use timeline visual: past | present | future',
          'Sort verb cards by tense'
        ],
        materials: [
          {
            name: 'Verb Tense Cards',
            nameZh: '动词时态卡',
            search1688: '蒙氏动词时态卡 英文 过去现在将来',
            altSearch: '英文动词变形卡',
            specs: 'Cards showing tense changes',
            price: '¥40-60',
            essential: true
          },
          {
            name: 'Verb Tense Timeline',
            nameZh: '时态时间线',
            search1688: '英文时态时间线 教具',
            specs: 'Visual timeline for sorting',
            price: '¥20-40',
            essential: false
          },
          {
            name: 'Irregular Verb Cards',
            nameZh: '不规则动词卡',
            search1688: '英文不规则动词卡 过去式',
            specs: 'Common irregular verb pairs',
            price: '¥30-50',
            essential: true
          }
        ],
        controlOfError: 'Timeline logic; verb charts',
        pointOfInterest: 'Words change to show time!',
        extensions: ['Irregular verb practice', 'Story writing with tenses', 'Tense sort games']
      },
      {
        id: 'grammar_boxes_detail',
        name: 'Grammar Filling Boxes (9 Boxes)',
        age: '5.5-6 years',
        directAim: 'Practice each part of speech through sentence analysis',
        indirectAims: ['Grammar internalization', 'Sentence structure', 'Writing preparation'],
        prerequisites: 'All function of words games; grammar symbols',
        presentation: [
          'Each box focuses on ONE part of speech:',
          '',
          'BOX 1 - ARTICLE: the, a, an',
          'Fill in: ___ dog ran. (The/A)',
          '',
          'BOX 2 - ADJECTIVE: describing words',
          'Fill in: The ___ cat slept. (big, small, orange)',
          '',
          'BOX 3 - NOUN: naming words',
          'Fill in: The big ___ ran. (dog, cat, boy)',
          '',
          'BOX 4 - VERB: action words',
          'Fill in: The dog ___. (ran, jumped, ate)',
          '',
          'BOX 5 - PREPOSITION: position words',
          'Fill in: The cat sat ___ the box. (on, in, under)',
          '',
          'BOX 6 - ADVERB: how words',
          'Fill in: She walked ___. (slowly, quickly, quietly)',
          '',
          'BOX 7 - PRONOUN: replacement words',
          'Fill in: ___ ran fast. (He, She, They)',
          '',
          'BOX 8 - CONJUNCTION: connecting words',
          'Fill in: cats ___ dogs (and, or, but)',
          '',
          'BOX 9 - INTERJECTION: exclamation words',
          'Fill in: ___! That hurts! (Ouch, Wow, Oh)'
        ],
        materials: [
          {
            name: 'Grammar Filling Boxes - Complete',
            nameZh: '语法填空盒全套',
            search1688: '蒙氏语法盒 英文 9盒 全套',
            altSearch: '蒙台梭利 grammar box 英文',
            specs: '9 boxes with sentence cards and word cards',
            price: '¥200-400',
            essential: true
          },
          {
            name: 'Grammar Box Refill Cards',
            nameZh: '语法盒补充卡',
            search1688: '蒙氏语法盒补充卡 英文',
            specs: 'Additional sentence cards for each box',
            price: '¥40-80',
            essential: false
          }
        ],
        controlOfError: 'Meaning; grammar logic',
        pointOfInterest: 'Building correct sentences',
        extensions: ['Creating own fill-in sentences', 'Writing with varied parts of speech']
      },
      {
        id: 'plural_nouns',
        name: 'Plural Nouns',
        age: '5-6 years',
        directAim: 'Understand singular and plural noun forms',
        indirectAims: ['Spelling patterns', 'Grammar accuracy', 'Writing conventions'],
        prerequisites: 'Noun function game',
        presentation: [
          'REGULAR PLURALS - add S:',
          'cat → cats, dog → dogs, book → books',
          '',
          'ADD -ES (s, x, z, ch, sh endings):',
          'bus → buses, box → boxes, dish → dishes',
          'church → churches, buzz → buzzes',
          '',
          'Y → IES (consonant + y):',
          'baby → babies, city → cities, fly → flies',
          'BUT: boy → boys, key → keys (vowel + y)',
          '',
          'F/FE → VES:',
          'leaf → leaves, knife → knives, wife → wives',
          '',
          'IRREGULAR:',
          'child → children, man → men, woman → women',
          'foot → feet, tooth → teeth, mouse → mice',
          'fish → fish, sheep → sheep, deer → deer'
        ],
        materials: [
          {
            name: 'Singular/Plural Cards',
            nameZh: '单复数卡',
            search1688: '蒙氏单复数卡 英文 名词',
            altSearch: '英文名词单复数配对卡',
            specs: 'Matching cards for singular/plural pairs',
            price: '¥40-60',
            essential: true
          },
          {
            name: 'Plural Rules Chart',
            nameZh: '复数规则表',
            search1688: '英文复数规则表 海报',
            specs: 'Reference chart for plural spelling rules',
            price: '¥15-30',
            essential: false
          }
        ],
        controlOfError: 'Pattern rules; dictionary',
        pointOfInterest: 'One vs many changes words!',
        extensions: ['Sorting by pattern', 'Irregular plural practice', 'Writing plurals']
      },
      {
        id: 'possessive_nouns',
        name: 'Possessive Nouns',
        age: '5.5-6 years',
        directAim: 'Understand apostrophe shows ownership',
        indirectAims: ['Punctuation', 'Writing conventions', 'Grammar accuracy'],
        prerequisites: 'Noun function; reading apostrophes',
        presentation: [
          'SINGULAR POSSESSIVE - add \'s:',
          'the dog\'s bone, Mary\'s book, the cat\'s tail',
          '',
          'PLURAL POSSESSIVE (regular plurals) - add \':',
          'the dogs\' bones, the girls\' books',
          '',
          'PLURAL POSSESSIVE (irregular plurals) - add \'s:',
          'the children\'s toys, the men\'s hats, the mice\'s cheese',
          '',
          'Show meaning:',
          '"The bone belongs to the dog" = "the dog\'s bone"'
        ],
        materials: [
          {
            name: 'Possessive Noun Cards',
            nameZh: '所有格名词卡',
            search1688: '蒙氏所有格卡 英文',
            altSearch: '英文所有格练习卡',
            specs: 'Cards practicing possessive forms',
            price: '¥30-50',
            essential: true
          }
        ],
        controlOfError: 'Meaning check - who owns what?',
        pointOfInterest: 'Apostrophe shows belonging!',
        extensions: ['Possessive in writing', 'Contraction vs possessive distinction']
      }
    ]
  }
];

// Grammar symbol reference data
const grammarSymbols = [
  { part: 'Noun', shape: 'Large equilateral triangle', color: 'Black', meaning: 'Pyramid: ancient, solid, stable matter; carbon = basis of all matter' },
  { part: 'Article', shape: 'Small equilateral triangle', color: 'Light Blue', meaning: 'Announces/introduces the noun' },
  { part: 'Adjective', shape: 'Medium equilateral triangle', color: 'Dark Blue', meaning: 'Describes noun (same triangle family)' },
  { part: 'Verb', shape: 'Large circle', color: 'Red', meaning: 'Sun: energy, life force, action' },
  { part: 'Adverb', shape: 'Small circle', color: 'Orange', meaning: 'Modifies verb (same circle family)' },
  { part: 'Preposition', shape: 'Crescent/bridge', color: 'Green', meaning: 'Bridge showing relationship between words' },
  { part: 'Pronoun', shape: 'Tall isosceles triangle', color: 'Purple', meaning: 'Stands in place of noun (different triangle shape)' },
  { part: 'Conjunction', shape: 'Rectangle/ribbon', color: 'Pink', meaning: 'Connects/ties words and phrases together' },
  { part: 'Interjection', shape: 'Keyhole/exclamation', color: 'Gold', meaning: 'Key that unlocks emotion' }
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function EnglishProcurementPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'sequence' | 'shopping' | 'objects' | 'words' | 'phonograms' | 'grammar' | 'shelves' | 'checklist'>('sequence');
  const [essentialOnly, setEssentialOnly] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedPhonogramType, setSelectedPhonogramType] = useState<string>('all');
  const [expandedShelfItem, setExpandedShelfItem] = useState<string | null>(null);
  const [expandedExtension, setExpandedExtension] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTerm(text);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  // Collect all materials
  const allMaterials = curriculumData.flatMap(cat =>
    cat.works.flatMap(work =>
      work.materials.map(mat => ({
        ...mat,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        workName: work.name,
        categoryId: cat.id
      }))
    )
  ).filter((mat, index, self) =>
    mat.price !== '—' && 
    mat.search1688 !== '同上' &&
    index === self.findIndex(m => m.search1688 === mat.search1688)
  );

  const filteredMaterials = essentialOnly 
    ? allMaterials.filter(m => m.essential)
    : allMaterials;

  const selectedCategoryData = curriculumData.find(c => c.id === selectedCategory);
  const selectedWorkData = selectedCategoryData?.works.find(w => w.id === selectedWork);

  // Calculate totals
  const totalWorks = curriculumData.reduce((sum, cat) => sum + cat.works.length, 0);
  const essentialCount = allMaterials.filter(m => m.essential).length;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-indigo-200 hover:text-white text-sm mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold">AMI English Language Album</h1>
          <p className="text-indigo-200 mt-1">Complete Montessori literacy curriculum for ages 3-6</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="bg-slate-800/20 px-3 py-1 rounded-full">{curriculumData.length} Categories</span>
            <span className="bg-slate-800/20 px-3 py-1 rounded-full">{totalWorks} Works</span>
            <span className="bg-slate-800/20 px-3 py-1 rounded-full">{allMaterials.length} Materials</span>
            <span className="bg-green-400/30 px-3 py-1 rounded-full">{essentialCount} Essential</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* View Toggle */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setViewMode('sequence'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'sequence' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            📚 Curriculum Sequence
          </button>
          <button
            onClick={() => { setViewMode('shopping'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'shopping' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            🛒 Shopping List ({filteredMaterials.length})
          </button>
          <button
            onClick={() => { setViewMode('objects'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'objects' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            🔤 Objects A-Z
          </button>
          <button
            onClick={() => { setViewMode('words'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'words' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            📝 Word Families
          </button>
          <button
            onClick={() => { setViewMode('phonograms'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'phonograms' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            🔊 Phonograms
          </button>
          <button
            onClick={() => { setViewMode('grammar'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'grammar' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-gray-200 hover:bg-slate-600'
            }`}
          >
            📋 Grammar Boxes
          </button>
          <button
            onClick={() => { setViewMode('shelves'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'shelves' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            🗄️ Shelf Layout
          </button>
          <button
            onClick={() => { setViewMode('checklist'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'checklist' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-gray-200 hover:bg-slate-600'
            }`}
          >
            ✅ Assessment
          </button>
          {viewMode === 'shopping' && (
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={essentialOnly}
                onChange={(e) => setEssentialOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-200">Essential only ({essentialCount})</span>
            </label>
          )}
          <a
            href="https://www.1688.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition ml-auto"
          >
            🔗 Open 1688.com
          </a>
        </div>

        {/* SHOPPING LIST VIEW */}
        {viewMode === 'shopping' && (
          <div className="bg-slate-800 rounded-xl shadow-sm">
            <div className="p-4 border-b border-slate-600 bg-slate-700">
              <h2 className="font-bold">Complete Materials List</h2>
              <p className="text-sm text-gray-300">Click any search term to copy for 1688.com</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Material</th>
                    <th className="text-left p-3 font-medium">1688 Search Term</th>
                    <th className="text-left p-3 font-medium">Specifications</th>
                    <th className="text-left p-3 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((mat, i) => (
                    <tr key={i} className={`border-b hover:bg-slate-700 ${mat.essential ? 'bg-green-50/50' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-start gap-2">
                          {mat.essential && <span className="text-green-600 text-xs">★</span>}
                          <div>
                            <div className="font-medium">{mat.name}</div>
                            <div className="text-gray-400 text-xs">{mat.categoryIcon} {mat.categoryName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => copyToClipboard(mat.search1688)}
                          className="text-left hover:bg-indigo-50 p-2 rounded transition w-full"
                        >
                          <div className="font-medium text-indigo-600">{mat.search1688}</div>
                          {mat.altSearch && (
                            <div className="text-gray-400 text-xs mt-1">Alt: {mat.altSearch}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {copiedTerm === mat.search1688 ? '✓ Copied!' : 'Click to copy'}
                          </div>
                        </button>
                      </td>
                      <td className="p-3 text-gray-300 text-xs">{mat.specs}</td>
                      <td className="p-3 font-medium text-green-700">{mat.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OBJECTS A-Z VIEW */}
        {viewMode === 'objects' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Initial Sound Objects (A-Z)</h2>
            <p className="text-gray-300 mb-6">Complete list of miniature objects for Sound Games and Object Boxes. Click a letter to see objects.</p>
            
            {/* Letter selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.keys(initialSoundObjects).map(letter => (
                <button
                  key={letter}
                  onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                  className={`w-10 h-10 rounded-lg font-bold transition ${
                    selectedLetter === letter 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                  }`}
                >
                  {letter.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => setSelectedLetter('all')}
                className={`px-4 h-10 rounded-lg font-medium transition ${
                  selectedLetter === 'all' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                }`}
              >
                Show All
              </button>
            </div>

            {/* Objects display */}
            {selectedLetter === 'all' ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(initialSoundObjects).map(([letter, objects]) => (
                  <div key={letter} className="border border-slate-600 rounded-lg p-4">
                    <div className="font-bold text-2xl text-indigo-600 mb-2">{letter.toUpperCase()}</div>
                    <div className="flex flex-wrap gap-1">
                      {objects.map((obj, i) => (
                        <span key={i} className="bg-slate-600 px-2 py-1 rounded text-sm">{obj}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedLetter ? (
              <div className="border border-slate-600 rounded-lg p-6">
                <div className="font-bold text-4xl text-indigo-600 mb-4">{selectedLetter.toUpperCase()}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {initialSoundObjects[selectedLetter]?.map((obj, i) => (
                    <div key={i} className="bg-slate-700 border border-slate-600 rounded-lg p-3 text-center">
                      <div className="font-medium">{obj}</div>
                      <div className="text-xs text-gray-400">/{selectedLetter}/ sound</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">
                Click a letter above to see objects for that sound
              </div>
            )}
          </div>
        )}

        {/* WORD FAMILIES VIEW */}
        {viewMode === 'words' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Complete Word Family Lists</h2>
            <p className="text-gray-300 mb-6">All CVC word families organized by vowel sound. Use for Pink Series materials and word family cards.</p>
            
            {/* Vowel tabs */}
            <div className="flex gap-2 mb-6 border-b pb-2">
              {['Short A', 'Short E', 'Short I', 'Short O', 'Short U'].map(vowel => (
                <button
                  key={vowel}
                  onClick={() => setSelectedLetter(vowel)}
                  className={`px-4 py-2 rounded-t-lg font-medium transition ${
                    selectedLetter === vowel 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                  }`}
                >
                  {vowel}
                </button>
              ))}
            </div>

            {/* Word families grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(cvcWordFamilies)
                .filter(([family]) => {
                  if (!selectedLetter) return true;
                  const vowelMap: Record<string, string[]> = {
                    'Short A': ['-at', '-an', '-ap', '-ad', '-ag', '-am', '-ab', '-ack', '-ash', '-ang', '-ank'],
                    'Short E': ['-et', '-en', '-ed', '-eg', '-ell', '-eck', '-est', '-ent', '-end'],
                    'Short I': ['-it', '-in', '-ig', '-ip', '-id', '-ill', '-ick', '-ing', '-ink'],
                    'Short O': ['-ot', '-op', '-og', '-ob', '-ock', '-ong'],
                    'Short U': ['-ut', '-un', '-ug', '-up', '-ub', '-uck', '-ump', '-unk', '-ung', '-uss']
                  };
                  return vowelMap[selectedLetter]?.includes(family);
                })
                .map(([family, words]) => (
                  <div key={family} className="border border-slate-600 rounded-lg p-4">
                    <div className="font-bold text-lg text-indigo-600 mb-2">{family}</div>
                    <div className="flex flex-wrap gap-1">
                      {words.map((word, i) => (
                        <span key={i} className="bg-pink-50 text-pink-700 px-2 py-1 rounded text-sm">{word}</span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">{words.length} words</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* PHONOGRAMS VIEW */}
        {viewMode === 'phonograms' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Complete Phonogram Reference</h2>
            <p className="text-gray-300 mb-6">All English phonograms with sounds, positions, and example words.</p>
            
            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', label: 'All' },
                { id: 'consonant', label: 'Consonant Digraphs' },
                { id: 'long-a', label: 'Long A' },
                { id: 'long-e', label: 'Long E' },
                { id: 'long-i', label: 'Long I' },
                { id: 'long-o', label: 'Long O' },
                { id: 'long-u', label: 'Long U' },
                { id: 'r-controlled', label: 'R-Controlled' },
                { id: 'diphthong', label: 'Diphthongs' },
                { id: 'other', label: 'Other Patterns' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedPhonogramType(tab.id)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    selectedPhonogramType === tab.id 
                      ? 'bg-green-600 text-white' 
                      : 'bg-slate-600 text-gray-200 hover:bg-slate-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Phonograms grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(phonogramData)
                .filter(([phonogram]) => {
                  if (selectedPhonogramType === 'all') return true;
                  const categories: Record<string, string[]> = {
                    'consonant': ['sh', 'ch', 'th', 'wh', 'ck', 'ng', 'nk', 'ph', 'gh', 'kn', 'wr', 'gn', 'mb', 'tch', 'dge'],
                    'long-a': ['ai', 'ay', 'a_e', 'eigh', 'ey'],
                    'long-e': ['ee', 'ea', 'e_e', 'ie'],
                    'long-i': ['i_e', 'igh', 'y', 'ie'],
                    'long-o': ['oa', 'ow', 'o_e', 'oe'],
                    'long-u': ['u_e', 'ue', 'ew'],
                    'r-controlled': ['ar', 'or', 'er', 'ir', 'ur', 'ear', 'air', 'are'],
                    'diphthong': ['oo', 'ou', 'ow', 'oi', 'oy', 'aw', 'au'],
                    'other': ['tion', 'sion', 'ture', 'ous', 'ough', 'ful', 'less', 'able', 'ible']
                  };
                  return categories[selectedPhonogramType]?.includes(phonogram);
                })
                .map(([phonogram, data]) => (
                  <div key={phonogram} className="border border-slate-600 rounded-lg p-4 bg-green-50/30">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-green-600 text-white px-3 py-1 rounded-lg font-bold text-lg">{phonogram}</span>
                      <span className="text-gray-300">{data.sound}</span>
                    </div>
                    <div className="text-sm text-gray-400 mb-2">Position: {data.position}</div>
                    <div className="flex flex-wrap gap-1">
                      {data.examples.map((word, i) => (
                        <span key={i} className="bg-slate-800 border px-2 py-1 rounded text-sm">{word}</span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* GRAMMAR BOXES VIEW */}
        {viewMode === 'grammar' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Grammar Box Sentences</h2>
            <p className="text-gray-300 mb-6">Example sentences for each of the 9 Grammar Filling Boxes. Print these for classroom use.</p>
            
            <div className="space-y-6">
              {Object.entries(grammarBoxSentences).map(([box, data]) => (
                <div key={box} className="border border-slate-600 rounded-lg overflow-hidden">
                  <div className="bg-indigo-50 px-4 py-3 border-b">
                    <h3 className="font-bold text-indigo-800">{box}</h3>
                    <p className="text-sm text-indigo-600">{data.instruction}</p>
                  </div>
                  <div className="p-4 grid md:grid-cols-2 gap-2">
                    {data.sentences.map((sentence, i) => (
                      <div key={i} className="bg-slate-700 p-2 rounded text-sm font-mono">
                        {i + 1}. {sentence}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHELF LAYOUT VIEW */}
        {viewMode === 'shelves' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-600">
              <h2 className="text-2xl font-bold mb-2">🗄️ Complete Shelf Setup Guide</h2>
              <p className="text-gray-300 mb-4">Click any item for detailed specifications. Three tiers help you prioritize your budget.</p>
              
              {/* Tier Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-400 font-medium">Essential</span>
                  <span className="text-gray-400">- Minimum viable, budget-friendly</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                  <span className="text-blue-400 font-medium">Complete</span>
                  <span className="text-gray-400">- Professional AMI standard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-500"></span>
                  <span className="text-purple-400 font-medium">Premium</span>
                  <span className="text-gray-400">- Comprehensive, beautiful</span>
                </div>
              </div>
            </div>

            {/* Shelves */}
            {detailedShelfOrganization.map((shelf, shelfIndex) => (
              <div key={shelfIndex} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-600">
                {/* Shelf Header */}
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-5 py-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl text-white">{shelf.shelf}</h3>
                    <span className="text-amber-100 text-sm bg-amber-800/50 px-3 py-1 rounded-full">{shelf.position}</span>
                  </div>
                </div>
                
                {/* Shelf Note */}
                <div className="bg-blue-900/30 border-b border-blue-500/30 px-5 py-3">
                  <p className="text-blue-200 text-sm">💡 {shelf.notes}</p>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-700">
                  {shelf.items.map((item, itemIndex) => {
                    const itemKey = `${shelfIndex}-${itemIndex}`;
                    const isExpanded = expandedShelfItem === itemKey;
                    
                    return (
                      <div key={itemIndex} className="bg-slate-800">
                        {/* Item Header - Clickable */}
                        <button
                          onClick={() => setExpandedShelfItem(isExpanded ? null : itemKey)}
                          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-700/50 transition text-left"
                        >
                          <span className="font-medium text-gray-100">{item.name}</span>
                          <div className="flex items-center gap-3">
                            {/* Tier indicators */}
                            <div className="flex gap-1">
                              {item.details.some(d => d.tier === 'essential') && (
                                <span className="w-3 h-3 rounded-full bg-emerald-500" title="Essential"></span>
                              )}
                              {item.details.some(d => d.tier === 'complete') && (
                                <span className="w-3 h-3 rounded-full bg-blue-500" title="Complete"></span>
                              )}
                              {item.details.some(d => d.tier === 'premium') && (
                                <span className="w-3 h-3 rounded-full bg-purple-500" title="Premium"></span>
                              )}
                            </div>
                            <span className={`text-xl transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-5 pb-5 space-y-4">
                            {item.details.map((detail, detailIndex) => {
                              const tierColors = {
                                essential: { bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', badge: 'bg-emerald-500', text: 'text-emerald-300' },
                                complete: { bg: 'bg-blue-900/30', border: 'border-blue-500/40', badge: 'bg-blue-500', text: 'text-blue-300' },
                                premium: { bg: 'bg-purple-900/30', border: 'border-purple-500/40', badge: 'bg-purple-500', text: 'text-purple-300' }
                              };
                              const colors = tierColors[detail.tier];

                              return (
                                <div key={detailIndex} className={`rounded-lg p-5 ${colors.bg} border ${colors.border}`}>
                                  {/* Tier Badge */}
                                  <div className="flex items-center gap-2 mb-4">
                                    <span className={`${colors.badge} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>
                                      {detail.tier === 'essential' ? '🟢 Essential' : detail.tier === 'complete' ? '🔵 Complete' : '🟣 Premium'}
                                    </span>
                                    <span className={`${colors.text} font-medium`}>{detail.price}</span>
                                  </div>

                                  {/* What */}
                                  <div className="mb-4">
                                    <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">What is this?</h5>
                                    <p className="text-gray-200">{detail.what}</p>
                                  </div>

                                  {/* Grid of specs */}
                                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                      <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">📦 How Many?</h5>
                                      <p className="text-gray-200 text-sm">{detail.quantity}</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3">
                                      <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">📐 Size</h5>
                                      <p className="text-gray-200 text-sm">{detail.size}</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-lg p-3 md:col-span-2">
                                      <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">📁 Container / Storage</h5>
                                      <p className="text-gray-200 text-sm">{detail.container}</p>
                                    </div>
                                  </div>

                                  {/* Contents if available */}
                                  {detail.contents && detail.contents.length > 0 && (
                                    <div className="mb-4">
                                      <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-2">📋 What to Include</h5>
                                      <div className="bg-slate-800/50 rounded-lg p-3">
                                        <ul className="space-y-1">
                                          {detail.contents.map((content, i) => (
                                            <li key={i} className="text-gray-200 text-sm">{content}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}

                                  {/* Tips */}
                                  <div className="bg-amber-900/40 border border-amber-500/30 rounded-lg p-3">
                                    <h5 className="text-xs uppercase tracking-wide text-amber-400 mb-1">💡 Practical Tips</h5>
                                    <p className="text-amber-200/90 text-sm">{detail.tips}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Budget Summary */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-600">
              <h3 className="text-xl font-bold mb-4">💰 Budget Summary (20 Children)</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-emerald-900/30 border border-emerald-500/40 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500"></span>
                    <span className="font-bold text-emerald-400">Essential Tier</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">¥5,500 - ¥10,000</div>
                  <div className="text-emerald-300 text-sm">Minimum viable classroom setup</div>
                  <ul className="text-gray-300 text-sm mt-3 space-y-1">
                    <li>• Basic vocabulary baskets</li>
                    <li>• 1 set sandpaper letters</li>
                    <li>• 2 moveable alphabets</li>
                    <li>• 1 Pink/Blue/Green series</li>
                  </ul>
                </div>
                <div className="bg-blue-900/30 border border-blue-500/40 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                    <span className="font-bold text-blue-400">Complete Tier</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">¥17,000 - ¥30,000</div>
                  <div className="text-blue-300 text-sm">Professional AMI standard</div>
                  <ul className="text-gray-300 text-sm mt-3 space-y-1">
                    <li>• Full vocabulary collection</li>
                    <li>• Quality card materials</li>
                    <li>• 3 moveable alphabets</li>
                    <li>• Grammar materials</li>
                  </ul>
                </div>
                <div className="bg-purple-900/30 border border-purple-500/40 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-4 h-4 rounded-full bg-purple-500"></span>
                    <span className="font-bold text-purple-400">Premium Tier</span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">¥40,000 - ¥80,000</div>
                  <div className="text-purple-300 text-sm">Comprehensive, museum quality</div>
                  <ul className="text-gray-300 text-sm mt-3 space-y-1">
                    <li>• Nienhuis materials</li>
                    <li>• Custom wooden storage</li>
                    <li>• 4+ moveable alphabets</li>
                    <li>• Complete everything</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASSESSMENT CHECKLIST VIEW */}
        {viewMode === 'checklist' && (
          <div className="bg-slate-800 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Assessment Checklist</h2>
            <p className="text-gray-300 mb-6">Track child progress through the language curriculum. Print and use for individual student records.</p>
            
            <div className="space-y-6">
              {Object.entries(assessmentChecklist).map(([category, skills]) => (
                <div key={category} className="border border-slate-600 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 px-4 py-3 border-b">
                    <h3 className="font-bold text-purple-800">{category}</h3>
                  </div>
                  <div className="divide-y">
                    {skills.map((skill, i) => (
                      <div key={i} className="p-3 flex gap-4">
                        <input type="checkbox" className="mt-1 h-5 w-5 rounded" />
                        <div className="flex-1">
                          <div className="font-medium">{skill.skill}</div>
                          <div className="text-sm text-gray-400">{skill.indicators}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-slate-600 rounded-lg text-sm text-gray-300">
              <strong>Note:</strong> This checklist is interactive for preview purposes. For classroom use, print this page or export to create permanent student records.
            </div>
          </div>
        )}

        {/* SEQUENCE VIEW - Categories */}
        {viewMode === 'sequence' && !selectedCategory && (
          <div className="space-y-4">
            {/* AMI Note */}
            <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-amber-300 mb-1">⚠️ Important AMI Note</h3>
              <p className="text-amber-200/80 text-sm">
                The Pink/Blue/Green color-coded reading series is NOT official AMI - it was developed by Margaret Homfray and Phoebe Child for English. 
                Authentic AMI uses the Muriel Dwyer approach with cursive script. This guide includes both for practicality, following the sequence used in most English-speaking Montessori schools.
              </p>
            </div>

            {/* Category Cards */}
            {curriculumData.map((category) => (
              <div
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 cursor-pointer hover:from-slate-600 hover:to-slate-700 transition-all duration-200 border border-slate-600 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{category.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2 py-0.5 rounded border border-indigo-500/30">
                        Step {category.sequence}
                      </span>
                      <h2 className="text-xl font-bold text-white">{category.name}</h2>
                    </div>
                    <p className="text-slate-300">{category.description}</p>
                    {category.amiNotes && (
                      <p className="text-amber-400 text-sm mt-2 italic">{category.amiNotes}</p>
                    )}
                    <div className="mt-3 text-sm text-slate-400">
                      {category.works.length} work{category.works.length > 1 ? 's' : ''} • Click to expand
                    </div>
                  </div>
                  <div className="text-indigo-400 text-2xl">›</div>
                </div>
              </div>
            ))}

            {/* Grammar Symbols Reference */}
            <div className="bg-slate-800 rounded-xl shadow-sm p-6 mt-8">
              <h2 className="text-xl font-bold mb-4">🔺 Grammar Symbols Quick Reference</h2>
              <div className="grid md:grid-cols-3 gap-3">
                {grammarSymbols.map((sym) => (
                  <div key={sym.part} className="border border-slate-600 rounded-lg p-3">
                    <div className="font-bold text-lg">{sym.part}</div>
                    <div className="text-gray-300 text-sm">{sym.shape}</div>
                    <div className="text-gray-300 text-sm font-medium" style={{color: sym.color.toLowerCase().includes('black') ? '#333' : sym.color.toLowerCase().includes('blue') ? '#3b82f6' : sym.color.toLowerCase().includes('red') ? '#ef4444' : sym.color.toLowerCase().includes('orange') ? '#f97316' : sym.color.toLowerCase().includes('green') ? '#22c55e' : sym.color.toLowerCase().includes('purple') ? '#a855f7' : sym.color.toLowerCase().includes('pink') ? '#ec4899' : sym.color.toLowerCase().includes('gold') ? '#eab308' : '#666'}}>
                      {sym.color}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">{sym.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SEQUENCE VIEW - Category Detail (Works List) */}
        {viewMode === 'sequence' && selectedCategory && !selectedWork && (
          <div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-indigo-400 hover:text-indigo-300 mb-4 flex items-center gap-1"
            >
              ← Back to sequence
            </button>

            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 mb-6 border border-slate-600">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{selectedCategoryData?.icon}</span>
                <div>
                  <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2 py-1 rounded border border-indigo-500/30">
                    Step {selectedCategoryData?.sequence}
                  </span>
                  <h1 className="text-2xl font-bold text-white">{selectedCategoryData?.name}</h1>
                </div>
              </div>
              <p className="text-slate-300">{selectedCategoryData?.description}</p>
              {selectedCategoryData?.amiNotes && (
                <p className="text-amber-400 text-sm mt-2 bg-amber-900/30 p-3 rounded-lg border border-amber-500/30">{selectedCategoryData.amiNotes}</p>
              )}
            </div>

            <div className="space-y-3">
              {selectedCategoryData?.works.map((work, index) => (
                <div
                  key={work.id}
                  onClick={() => setSelectedWork(work.id)}
                  className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 cursor-pointer hover:from-slate-600 hover:to-slate-700 transition-all duration-200 border border-slate-600 hover:border-indigo-500"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-500/20 text-indigo-300 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm border border-indigo-500/30">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white">{work.name}</h3>
                      <p className="text-slate-400 text-sm">Age: {work.age}</p>
                      <p className="text-slate-300 mt-1">{work.directAim}</p>
                      <div className="mt-2 text-sm text-slate-400">
                        {work.materials.length} material{work.materials.length > 1 ? 's' : ''} • Click for full details
                      </div>
                    </div>
                    <div className="text-indigo-400 text-xl">›</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEQUENCE VIEW - Work Detail */}
        {viewMode === 'sequence' && selectedWork && selectedWorkData && (
          <div>
            <button
              onClick={() => setSelectedWork(null)}
              className="text-indigo-400 hover:text-indigo-300 mb-4 flex items-center gap-1"
            >
              ← Back to {selectedCategoryData?.name}
            </button>

            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl overflow-hidden border border-slate-600">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4">
                <div className="text-indigo-200 text-sm">{selectedCategoryData?.icon} {selectedCategoryData?.name}</div>
                <h1 className="text-2xl font-bold">{selectedWorkData.name}</h1>
                <div className="text-indigo-200">Age: {selectedWorkData.age}</div>
              </div>

              <div className="p-6 space-y-6">
                {/* Aims */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-gray-100 mb-2">Direct Aim</h3>
                    <p className="text-gray-300">{selectedWorkData.directAim}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-100 mb-2">Indirect Aims</h3>
                    <ul className="text-gray-300 space-y-1">
                      {selectedWorkData.indirectAims.map((aim, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-400">•</span>
                          {aim}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Prerequisites */}
                <div className="bg-amber-900/30 border border-amber-500/40 rounded-lg p-4">
                  <h3 className="font-bold text-amber-300 mb-1">Prerequisites</h3>
                  <p className="text-amber-100">{selectedWorkData.prerequisites}</p>
                </div>

                {/* Video Tutorial */}
                {(selectedWorkData.videoUrl || selectedWorkData.videoSearchTerm) && (
                  <div className="bg-rose-900/30 border border-rose-500/40 rounded-lg p-4">
                    <h3 className="font-bold text-rose-300 mb-2">📺 Video Tutorial</h3>
                    <a 
                      href={selectedWorkData.videoSearchTerm 
                        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedWorkData.videoSearchTerm)}`
                        : selectedWorkData.videoUrl
                      } 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-rose-300 hover:text-rose-100 underline flex items-center gap-2"
                    >
                      {selectedWorkData.videoSearchTerm 
                        ? `Search YouTube: "${selectedWorkData.videoSearchTerm}" →`
                        : 'Watch presentation on YouTube →'
                      }
                    </a>
                  </div>
                )}

                {/* Presentation */}
                <div>
                  <h3 className="font-bold text-gray-100 mb-3">Presentation Steps</h3>
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                    {selectedWorkData.presentation.map((step, i) => (
                      <div key={i} className={`${step.startsWith('GROUP') || step.startsWith('STAGE') || step.startsWith('PRESENTATION') || step.startsWith('PERIOD') || step.startsWith('LEVEL') || (step.includes(':') && step.split(':')[0].length < 20 && step.split(':')[0] === step.split(':')[0].toUpperCase()) ? 'font-bold text-cyan-400 mt-4 text-lg' : 'text-gray-200 pl-4'} ${step === '' ? 'h-2' : ''}`}>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Beginner's Guide - The Dummies Guide Section */}
                {selectedWorkData.beginnerGuide && (
                  <div className="bg-gradient-to-br from-violet-900/40 to-indigo-900/40 border border-violet-500/30 rounded-xl p-6">
                    <h3 className="font-bold text-xl text-violet-300 mb-4 flex items-center gap-2">
                      📖 Complete Beginner's Guide
                      <span className="text-xs bg-violet-600 text-violet-100 px-2 py-1 rounded">For Non-Montessori Teachers</span>
                    </h3>
                    
                    {/* What is this? */}
                    <div className="mb-5">
                      <h4 className="font-semibold text-violet-200 mb-2">What is this activity?</h4>
                      <p className="text-gray-200 leading-relaxed">{selectedWorkData.beginnerGuide.whatIsThis}</p>
                    </div>

                    {/* Why it matters */}
                    <div className="mb-5 bg-violet-800/30 rounded-lg p-4">
                      <h4 className="font-semibold text-violet-200 mb-2">Why does it matter?</h4>
                      <p className="text-gray-200 leading-relaxed">{selectedWorkData.beginnerGuide.whyItMatters}</p>
                    </div>

                    {/* Before you start */}
                    <div className="mb-5">
                      <h4 className="font-semibold text-violet-200 mb-2">Before you start, make sure:</h4>
                      <ul className="space-y-2">
                        {selectedWorkData.beginnerGuide.beforeYouStart.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-200">
                            <span className="text-emerald-400 mt-1">✓</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Exact Script */}
                    <div className="mb-5 bg-slate-800/80 rounded-lg p-4 border border-slate-600">
                      <h4 className="font-semibold text-cyan-300 mb-3">📝 Exact Script (Say This Word-for-Word)</h4>
                      <div className="space-y-3 font-mono text-sm">
                        {selectedWorkData.beginnerGuide.exactScript.map((line, i) => (
                          <div key={i} className={`${line.startsWith('YOU:') ? 'text-cyan-300 pl-0' : line.startsWith('CHILD:') ? 'text-pink-300 pl-4' : line.startsWith('[') ? 'text-gray-500 italic pl-0' : 'text-gray-300 pl-4'}`}>
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Common Mistakes */}
                    <div className="mb-5 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                      <h4 className="font-semibold text-red-300 mb-2">❌ Common Mistakes to Avoid</h4>
                      <ul className="space-y-2">
                        {selectedWorkData.beginnerGuide.commonMistakes.map((mistake, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-200">
                            <span className="text-red-400">•</span>
                            {mistake}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Success Indicators */}
                    <div className="mb-5 bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                      <h4 className="font-semibold text-emerald-300 mb-2">✅ You know it's working when:</h4>
                      <ul className="space-y-2">
                        {selectedWorkData.beginnerGuide.successIndicators.map((indicator, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-200">
                            <span className="text-emerald-400">•</span>
                            {indicator}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Timing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 uppercase tracking-wide">Session Length</div>
                        <div className="text-lg font-semibold text-gray-100">{selectedWorkData.beginnerGuide.sessionLength}</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-400 uppercase tracking-wide">How Often</div>
                        <div className="text-lg font-semibold text-gray-100">{selectedWorkData.beginnerGuide.frequency}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Materials */}
                <div>
                  <h3 className="font-bold text-gray-100 mb-3">Materials & 1688 Search Terms</h3>
                  <div className="space-y-4">
                    {selectedWorkData.materials.filter(m => m.price !== '—' && m.search1688 !== '同上').map((mat, i) => (
                      <div key={i} className={`border rounded-lg p-4 ${mat.essential ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-slate-600 bg-slate-700'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-bold text-gray-100 flex items-center gap-2">
                              {mat.name}
                              {mat.essential && <span className="text-xs bg-emerald-600 text-emerald-100 px-2 py-0.5 rounded">Essential</span>}
                            </div>
                            <div className="text-gray-400 text-sm">{mat.nameZh}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-400">{mat.price}</div>
                          </div>
                        </div>
                        <div className="text-gray-300 text-sm mb-3">{mat.specs}</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(mat.search1688); }}
                          className="w-full text-left bg-slate-800 border border-slate-600 rounded-lg p-3 hover:bg-slate-600 transition"
                        >
                          <div className="text-cyan-400 font-medium">{mat.search1688}</div>
                          {mat.altSearch && (
                            <div className="text-gray-400 text-sm mt-1">Alternative: {mat.altSearch}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            {copiedTerm === mat.search1688 ? '✓ Copied to clipboard!' : 'Click to copy for 1688.com'}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Control & Point of Interest */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-gray-100 mb-2">Control of Error</h3>
                    <p className="text-gray-300">{selectedWorkData.controlOfError}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-100 mb-2">Point of Interest</h3>
                    <p className="text-gray-300">{selectedWorkData.pointOfInterest}</p>
                  </div>
                </div>

                {/* Extensions */}
                <div>
                  <h3 className="font-bold text-gray-100 mb-3">Extensions</h3>
                  <p className="text-gray-400 text-sm mb-3">Click any extension to learn how to present it:</p>
                  <div className="space-y-2">
                    {selectedWorkData.extensions.map((ext, i) => {
                      const detail = extensionDetails[ext];
                      const isExpanded = expandedExtension === ext;
                      
                      return (
                        <div key={i} className="border border-slate-600 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedExtension(isExpanded ? null : ext)}
                            className={`w-full px-4 py-3 flex items-center justify-between transition text-left ${
                              isExpanded 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 text-gray-100'
                            }`}
                          >
                            <span className="font-medium">{ext}</span>
                            <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                          </button>
                          
                          {isExpanded && detail && (
                            <div className="bg-slate-800 p-4 space-y-4 border-t border-slate-600">
                              {/* What */}
                              <div>
                                <h5 className="text-xs uppercase tracking-wide text-indigo-400 mb-1">What is this extension?</h5>
                                <p className="text-gray-200">{detail.what}</p>
                              </div>
                              
                              {/* How To */}
                              <div>
                                <h5 className="text-xs uppercase tracking-wide text-indigo-400 mb-1">How to present it</h5>
                                <p className="text-gray-200">{detail.howTo}</p>
                              </div>
                              
                              {/* Materials */}
                              {detail.materials && (
                                <div>
                                  <h5 className="text-xs uppercase tracking-wide text-indigo-400 mb-1">Materials needed</h5>
                                  <p className="text-gray-300 bg-slate-700 px-3 py-2 rounded">{detail.materials}</p>
                                </div>
                              )}
                              
                              {/* Readiness */}
                              <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3">
                                <h5 className="text-xs uppercase tracking-wide text-emerald-400 mb-1">✓ Child is ready when...</h5>
                                <p className="text-emerald-200">{detail.readiness}</p>
                              </div>
                            </div>
                          )}
                          
                          {isExpanded && !detail && (
                            <div className="bg-slate-800 p-4 border-t border-slate-600">
                              <p className="text-gray-400 italic">Details for this extension coming soon. Use the main activity presentation as a guide.</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                {selectedWorkData.notes && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{selectedWorkData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
