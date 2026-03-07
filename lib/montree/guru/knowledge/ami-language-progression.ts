// lib/montree/guru/knowledge/ami-language-progression.ts
// AMI English Language Progression — 43 Works, 5 Categories
// Complete guide based on pure AMI methodology as taught in AMI training centres worldwide.
// Used by the Guru to guide teachers step-by-step through the English language curriculum.

export interface LanguageWork {
  /** Work number (1-43) in the progression */
  number: number;
  name: string;
  category: string;
  /** Recommended age range */
  age: string;
  /** What the child gains from this work */
  purpose: string;
  /** What the child must already be able to do */
  readiness: string;
  /** Key materials needed */
  materials: string[];
  /** Presentation steps (concise) */
  presentation: string[];
  /** Progression levels within this work */
  levels?: string[];
  /** Critical AMI notes */
  amiNotes?: string[];
  /** ESL-specific adaptation note for L1 Chinese learners */
  eslNote?: string;
}

export const LANGUAGE_WORKS: LanguageWork[] = [
  // ═══════════════════════════════════════════
  // CATEGORY 1: ORAL LANGUAGE DEVELOPMENT (8)
  // ═══════════════════════════════════════════
  {
    number: 1,
    name: 'Vocabulary Enrichment',
    category: 'Oral Language Development',
    age: '2.5+ (ongoing)',
    purpose: 'Build a rich spoken word bank of hundreds of precise words',
    readiness: 'Child can speak and understand basic language',
    materials: ['Real objects from all categories', 'Miniature replicas when real objects unavailable'],
    presentation: [
      'Use precise vocabulary in all interactions: "robin" not "bird", "oak" not "tree"',
      'Three-Period Lesson for every new word:',
      '  Period 1 — NAMING: "This is a pomegranate." Hold up, say clearly, let child handle. Repeat 2-3 times.',
      '  Period 2 — RECOGNITION: "Show me the pomegranate." Child identifies from group of 2-3. Longest period.',
      '  Period 3 — RECALL: "What is this?" Only attempt when Period 2 is solid.',
    ],
    amiNotes: [
      'If the child fails Period 3, do NOT correct. Return to Period 1 and try another day.',
      'Use REAL objects whenever possible. A real apple beats a picture of an apple.',
      'Categories: animals (farm/wild/ocean/birds/insects), fruits & vegetables, household objects, transportation, body parts, instruments, professions, buildings, landforms, weather.',
    ],
  },
  {
    number: 2,
    name: 'Classified Cards',
    category: 'Oral Language Development',
    age: '2.5–4',
    purpose: 'Category awareness, naming precision, vocabulary depth',
    readiness: 'Can participate in Three-Period Lesson',
    materials: ['Identical Matching Cards (2 sets of same pictures)', 'Classified Cards with Labels (grouped by category)', 'Definition Cards (picture + label + definition — age 5+)'],
    presentation: [
      'Level 1 — Identical Matching (age 2.5+): Two identical picture sets, child matches pairs.',
      'Level 2 — Classified Cards (age 3+): Cards grouped by category (e.g. 6 fruit cards). Teacher names using Three-Period Lesson.',
      'Level 3 — Definition Cards (age 5+, after reading): Picture, label, and definition paragraph on separate cards. Child matches picture → label → definition.',
    ],
    amiNotes: ['Specific category objects: farm animals (cow, horse, pig, sheep, chicken, duck, goat), wild animals (lion, elephant, giraffe, zebra, tiger, bear), ocean (whale, dolphin, shark, octopus, starfish, turtle), fruits (apple, banana, orange, grape, strawberry, watermelon, pineapple, mango, kiwi, pomegranate), vegetables (carrot, potato, tomato, onion, broccoli, pea, corn, pepper, lettuce, cucumber).'],
  },
  {
    number: 3,
    name: 'Object to Picture Matching',
    category: 'Oral Language Development',
    age: '2.5–3.5',
    purpose: 'Abstraction: child learns a flat 2D image can represent a real 3D thing',
    readiness: 'Can name common objects',
    materials: ['Basket of 10-15 realistic miniature objects', 'Corresponding photograph cards (photos, not cartoons)'],
    presentation: [
      'Lay out 3 picture cards on the mat.',
      'Place matching objects in a small basket beside the mat.',
      'Pick up one object: "This is a cow." Place on picture of cow.',
      'Invite child to match remaining objects.',
      'Gradually increase to 5, then 10 pairs.',
    ],
    amiNotes: ['This abstraction step is critical — the same principle applies later when a written word represents a spoken one.'],
  },
  {
    number: 4,
    name: 'Sound Games (I Spy)',
    category: 'Oral Language Development',
    age: '2.5–4',
    purpose: 'Hear individual phonemes in words — THE SINGLE MOST IMPORTANT oral language work',
    readiness: 'Know 50+ vocabulary words',
    materials: ['Collection of small objects on a mat (3-5 per game initially)', 'Objects should have clear, unambiguous initial sounds'],
    presentation: [
      'Place 3 objects on mat with very different initial sounds (e.g. cat, mop, sun).',
      '"I spy with my little eye something beginning with /k/." Child picks up the cat.',
      'Gradually increase to 5 objects with more similar sounds.',
    ],
    levels: [
      'Level 1 — INITIAL SOUND: "I spy something beginning with /k/." Start with 3 objects, increase to 5.',
      'Level 2 — ENDING SOUND: "I spy something ending with /t/." Harder — English speakers attend to beginnings more.',
      'Level 3 — MIDDLE SOUND: "I spy something with /a/ in the middle." Only CVC words.',
      'Level 4 — BLENDING (oral): Teacher says "/k/…/a/…/t/. What word?" Child blends: "cat!"',
      'Level 5 — SEGMENTING (oral): "Break cat into tiny sounds." Child: "/k/…/a/…/t/." Use Elkonin boxes.',
      'Level 6 — SOUND SORTING: Two boxes, child sorts objects by initial sound.',
    ],
    amiNotes: [
      'ALWAYS use the SOUND, never the letter NAME. Say "/k/" not "see". Say "/s/" not "ess".',
      'Everything downstream depends on this: sandpaper letters, moveable alphabet, reading.',
      'Readiness for Sandpaper Letters: child can identify initial sounds reliably, ending sounds, and begins hearing middle sounds.',
      'Objects by sound: /b/ ball,bus,bear,button,bell; /k/ cat,cup,car,cow,cap; /d/ dog,duck,doll,drum; /f/ fish,fan,fox,fork,fig; /m/ mat,mop,map,mouse,mirror; /s/ sun,sock,soap,star,spoon; /t/ top,tin,tent,tiger,truck.',
    ],
    eslNote: 'For L1 Chinese learners: START with shared Mandarin-English sounds (/m/, /s/, /f/, /n/, /l/, /p/, /t/, /k/). These children already hear these sounds from Mandarin. DEFER difficult sounds (/θ/ th, /ð/ the, /v/, English /r/) until the child is confident with shared sounds. Ending sounds are EXTRA hard — Mandarin has almost no final consonants. Expect "ca" for "cat" and "do" for "dog" — this is L1 transfer, not a hearing problem.',
  },
  {
    number: 5,
    name: 'Rhyming Activities',
    category: 'Oral Language Development',
    age: '3–4',
    purpose: 'Develop phonological awareness of word-ending patterns',
    readiness: 'Can identify initial sounds (Sound Games Level 1)',
    materials: ['Baskets of rhyming miniature object pairs: cat-hat, fox-box, pen-hen, bug-mug, log-frog, fan-pan, star-car, bee-key, boat-coat, ring-king, fish-dish, mouse-house'],
    presentation: [
      'Level 1 — Recognition: "Do cat and hat rhyme?" Child says yes/no.',
      'Level 2 — Matching: From basket of 4-6 objects, child pairs rhyming objects.',
      'Level 3 — Production: "What rhymes with cat?" Child generates: bat, sat, mat, fat, rat...',
    ],
    amiNotes: ['Rhyming teaches word families (-at, -an, -ig) which directly feed into Word Families in Word Study. A child who can rhyme freely has internalised onsets and rimes.'],
  },
  {
    number: 6,
    name: 'Storytelling and Sequencing',
    category: 'Oral Language Development',
    age: '3–5',
    purpose: 'Narrative structure, logical ordering, beginning-middle-end',
    readiness: 'Can hold a conversation and follow a story',
    materials: ['Picture sequencing cards (3-6 per story)', 'Wordless picture books', 'Felt board with story characters'],
    presentation: [
      'Level 1 — Sequencing: Arrange 3-4 pictures in order. Increase to 5-6.',
      'Level 2 — Retelling: After hearing a story, child retells using props.',
      'Level 3 — Creating: Child invents stories. Teacher transcribes dictation (Language Experience).',
    ],
  },
  {
    number: 7,
    name: 'Poems, Songs, and Fingerplays',
    category: 'Oral Language Development',
    age: '2.5+ (ongoing)',
    purpose: 'Rhythmic sensitivity, memory, language patterns that support reading fluency',
    readiness: 'Can participate in group activities',
    materials: ['Fingerplay songs (Itsy Bitsy Spider, Five Little Monkeys)', 'Nursery rhymes', 'Short poems for memorisation'],
    presentation: [
      'Fingerplays: songs with hand motions — kinaesthetic + language combined.',
      'Nursery rhymes: build rhyme awareness naturally.',
      'Poetry recitation: short poems memorised and performed for expressive language.',
    ],
  },
  {
    number: 8,
    name: 'Conversation and Discussion',
    category: 'Oral Language Development',
    age: '3+ (ongoing)',
    purpose: 'Turn-taking, active listening, questioning — the oral foundation for all written language',
    readiness: 'Can speak in sentences',
    materials: ['Circle time structure', 'Discussion prompts', 'Partner conversation practice'],
    presentation: [
      'Circle time sharing: "Tell us about something you did this weekend." Practice turn-taking.',
      'Partner conversations: Two children face each other and discuss a topic.',
      'Group discussions: After a story, discuss what happened, how characters felt.',
    ],
    amiNotes: ['Conversation IS the curriculum — not a warm-up. A child who can hold a conversation has the oral foundation for all written language.'],
  },

  // ═══════════════════════════════════════════
  // CATEGORY 2: WRITING PREPARATION (7)
  // ═══════════════════════════════════════════
  {
    number: 9,
    name: 'Metal Insets',
    category: 'Writing Preparation',
    age: '3–5',
    purpose: 'Pencil control, lightness of touch, muscle memory for letter formation',
    readiness: 'Can hold a pencil and sit at a table',
    materials: ['10 flat metal frames with removable geometric insets', 'Coloured pencils', 'Paper'],
    presentation: [
      '10 shapes: Square, Rectangle, Triangle, Trapezoid, Pentagon, Circle, Oval, Ellipse, Quatrefoil, Curvilinear Triangle.',
      'Sit on child\'s LEFT (so they see your right hand if right-handed).',
      'Hold frame with 3 fingers of non-dominant hand, pressing firmly.',
      'Trace slowly with pencil against edge. Light pressure.',
    ],
    levels: [
      '1. Trace the FRAME (external outline) — one colour.',
      '2. Trace the INSET (internal outline) — different colour.',
      '3. Fill between outlines with parallel horizontal lines (left→right, top→bottom).',
      '4. Fill with vertical lines.',
      '5. Fill with diagonal lines (both directions).',
      '6. Wavy lines.',
      '7. Loops (prepares for cursive).',
      '8. Combine two overlapping insets.',
      '9. Three or more insets.',
      '10. Free creative design.',
    ],
  },
  {
    number: 10,
    name: 'Sandpaper Letters',
    category: 'Writing Preparation',
    age: '3–4 (begin when Sound Games L1-2 are solid)',
    purpose: 'Sound → letter shape connection via 3 senses: touch, sight, hearing',
    readiness: 'Can hear initial and ending sounds (Sound Games Levels 1-2)',
    materials: ['Wooden boards with lowercase sandpaper letters', 'Consonants on PINK boards, vowels on BLUE boards'],
    presentation: [
      'Take 3 letters (1 new, 2 known) to the mat.',
      'Sit to child\'s RIGHT.',
      'Trace new letter with INDEX + MIDDLE fingers together while saying SOUND: "/m/…/m/…/m/." Trace 2-3 times.',
      'Invite child to trace while saying sound together, then alone.',
      'Three-Period Lesson: "This is /m/" → "Show me /m/" → "What is this?"',
    ],
    levels: [
      'Group 1: c, m, a, t — high-frequency, visually distinct, can form words (cat, mat)',
      'Group 2: s, r, i, p — new shapes (sat, sip, rip, pit)',
      'Group 3: b, f, o, g — rounded/tall forms (bog, fog, mop)',
      'Group 4: h, j, u, l — mix of tall/short (hug, jug, hill)',
      'Group 5: d, w, e, n — d introduced AFTER b to avoid b/d confusion (den, pen, wet)',
      'Group 6: k, q, v, x, y, z — low-frequency, introduced last',
    ],
    amiNotes: [
      'ALWAYS trace with INDEX + MIDDLE fingers together (writing grip preview).',
      'NEVER introduce visually similar letters at same time: b/d, p/q, m/n should be in DIFFERENT groups.',
      'Always use the SOUND, never the letter NAME.',
    ],
    eslNote: 'For L1 Chinese learners: These children have EXCELLENT stroke-order discipline from Chinese character writing — leverage this strength. Their fine motor skills for tracing are often superior. The Three-Period Lesson may need a LONGER Period 2 for English-specific sounds (/θ/, /v/, /r/) that don\'t exist in Mandarin. Start Group 1 with sounds shared across both languages.',
  },
  {
    number: 11,
    name: 'Sand Tray Writing',
    category: 'Writing Preparation',
    age: '3.5–4.5',
    purpose: 'Bridge between tracing (following path) and writing (creating path from memory)',
    readiness: 'Can trace sandpaper letters accurately',
    materials: ['Shallow tray of coloured sand', 'Sandpaper letters for reference'],
    presentation: [
      'Child traces sandpaper letter 2-3 times (saying sound each time).',
      'Set sandpaper letter aside (face down).',
      '"Can you write /m/ in the sand?" Child writes from memory.',
      'If incorrect: turn sandpaper letter face up, child traces again, try sand again.',
    ],
    amiNotes: ['The material self-corrects — child compares sand to sandpaper letter. No teacher correction needed.'],
  },
  {
    number: 12,
    name: 'Chalkboard Writing',
    category: 'Writing Preparation',
    age: '3.5–4.5',
    purpose: 'Large letter formation on vertical surface — develops shoulder stability',
    readiness: 'Can write letters in sand from memory',
    materials: ['Chalkboard or whiteboard', 'Chalk or markers'],
    presentation: [
      'Child writes letters BIG on vertical surface.',
      'Vertical surface develops shoulder stability and large motor control.',
      'This comes BEFORE paper because large movements are easier to control than small ones.',
    ],
  },
  {
    number: 13,
    name: 'Moveable Alphabet',
    category: 'Writing Preparation',
    age: '3.5–5',
    purpose: 'First WRITING — encode words by converting sounds into visible symbols without pencil',
    readiness: 'Knows 5-8 sandpaper letter sounds AND can fully segment CVC words orally',
    materials: ['Large wooden box with loose lowercase letters (~155 total)', 'Consonants RED/PINK, vowels BLUE', 'Miniature objects for word-building'],
    presentation: [
      'Place miniature object on mat (e.g. small cat figurine).',
      '"What is this?" "Cat." "Let\'s write cat."',
      '"What\'s the first sound you hear?" "/k/." "Can you find /k/?" Child finds c.',
      '"What\'s the next sound?" "/a/." Child finds a, places next to c.',
      '"What\'s the last sound?" "/t/." Child finds t: c-a-t.',
      '"You wrote cat!" Do NOT ask child to read it back — this is writing, not reading.',
    ],
    levels: [
      '1. Introduction: Teacher demonstrates building 2-3 CVC words with objects.',
      '2. CVC with objects: Child builds words independently. 3-5 objects per session.',
      '3. CVC with pictures: Picture cards replace objects (more abstract).',
      '4. Longer phonetic words: CCVC (frog, stop), CVCC (milk, hand), CCVCC (stamp).',
      '5. Phrases: "a red hat" — introduce spacing between words.',
      '6. Sentences: "the cat sat on the mat" — capital letter, full stop.',
      '7. Stories: Multiple sentences.',
    ],
    amiNotes: [
      'Do NOT correct spelling at this stage. "kat" for "cat" is phonetically correct and shows excellent encoding.',
      'CVC objects by vowel: short-a (cat,hat,mat,bag,pan,fan,van,map,jam), short-e (pen,hen,net,jet,bed,leg,web,gem), short-i (pig,wig,fig,pin,lip,tip,zip,kit), short-o (dog,log,pot,mop,box,fox), short-u (cup,bus,rug,mug,bug,jug,tub,sun,nut).',
    ],
    eslNote: 'For L1 Chinese learners: Expect Mandarin-influenced phonetic spelling — missing final consonants ("ca" for "cat", "do" for "dog") and vowel epenthesis in clusters ("belack" for "black"). This is L1 transfer, NOT a deficit. The child is applying Mandarin syllable structure (mostly CV) to English. Accept it, celebrate the encoding attempt, and the final consonants will develop over time as their English phonological awareness grows.',
  },
  {
    number: 14,
    name: 'Handwriting on Paper',
    category: 'Writing Preparation',
    age: '4–5',
    purpose: 'Formal letter writing with pencil on lined paper',
    readiness: 'Can form letters on chalkboard, build words with Moveable Alphabet',
    materials: ['Primary-ruled paper (top, middle, bottom lines)', 'Pencils'],
    presentation: [
      'Individual letters on lined paper.',
      'Letter groups by formation pattern (c, o, a, d, g, q = "round letters").',
      'Words with finger-width spacing.',
      'Sentences: capital letter, spaces, full stop.',
      'Copywork: copying beautiful passages for handwriting + absorbing good writing.',
    ],
  },
  {
    number: 15,
    name: 'Creative Writing',
    category: 'Writing Preparation',
    age: '4.5+ (once handwriting is comfortable)',
    purpose: 'Original composition and authorship',
    readiness: 'Can write words and sentences legibly',
    materials: ['Paper and pencils', 'Drawing materials', 'Journal'],
    presentation: [
      'Labelling: writing labels for objects in the classroom.',
      'Picture + sentence: draw a picture, write one sentence about it.',
      'Daily journal: draw and write about something each day.',
      'Original stories: multi-sentence with beginning, middle, end.',
      'Research writing: child researches a topic and writes informational piece.',
    ],
  },

  // ═══════════════════════════════════════════
  // CATEGORY 3: READING (11)
  // ═══════════════════════════════════════════
  {
    number: 16,
    name: 'Object Boxes',
    category: 'Reading',
    age: '3.5–4.5',
    purpose: 'First reading — match word labels to 3D objects',
    readiness: 'Can build CVC words with Moveable Alphabet',
    materials: ['Pink Object Box: CVC word labels + miniature objects (cat,dog,cup,pen,hat,bus,mop,rug,pin,fox)', 'Blue Object Box: Blend words (frog,drum,flag,snail,plum,crab)', 'Green Object Box: Phonogram words (ship,chain,queen,teeth,moon)'],
    presentation: [
      'Take out 3 objects, place on mat, name each.',
      'Take out one word label. "Can you read this?" Child sounds out: /k/-/a/-/t/…"cat!"',
      'Child places label next to matching object.',
      'Gradually increase to 5-10 objects per session.',
    ],
    amiNotes: ['Object Boxes come BEFORE Pink/Blue/Green Series because matching label to 3D object is easier than matching to 2D picture. AMI always moves concrete → abstract.'],
    eslNote: 'For L1 Chinese learners: Object Boxes are especially powerful because the 3D object provides a concrete meaning anchor — the child doesn\'t need English vocabulary to understand what the word represents. Start with objects whose names use shared Mandarin-English sounds (mat, sun, mop, fan). The child\'s strong visual memory from Chinese character recognition supports whole-word recognition here.',
  },
  {
    number: 17,
    name: 'Pink Series (CVC Words)',
    category: 'Reading',
    age: '4–5',
    purpose: 'Read simple 3-letter CVC words fluently. Rule: every letter makes exactly one sound.',
    readiness: 'Can match object box labels to objects',
    materials: ['Picture-word matching cards', 'Word lists sorted by family', 'Phrase cards', 'Sentence strips', 'Small booklets (4-8 pages)'],
    presentation: [
      'Level 1 — Picture-word matching: child reads labels, places under pictures.',
      'Level 2 — Word lists: columns by family (-at, -an, -ig words).',
      'Level 3 — Phrases: "a red hat", "the big dog".',
      'Level 4 — Sentences: "The cat sat on the mat."',
      'Level 5 — Booklets: 4-8 pages, one sentence per page with picture. First "books."',
    ],
    eslNote: 'For L1 Chinese learners: CVC final consonants are THE hardest part — Mandarin has almost no final stops (/t/, /d/, /g/, /k/, /p/, /b/). The child may read "ca" for "cat" or "cu" for "cup". This is expected L1 transfer. Give extra time at Level 1 (picture-word matching) to build final consonant awareness. Use objects from Sound Games that emphasize the ending sound. The -at, -an, -ig families work well as entry points.',
  },
  {
    number: 18,
    name: 'Blue Series (Consonant Blends)',
    category: 'Reading',
    age: '4.5–5.5',
    purpose: 'Read words with consonant blends — each letter still makes its own sound',
    readiness: 'Can read Pink Series words fluently',
    materials: ['Blue Series materials (same 5 levels as Pink)'],
    presentation: [
      'Same 5 levels as Pink: picture-word matching → word lists → phrases → sentences → booklets.',
    ],
    levels: [
      'L-blends: bl, cl, fl, gl, pl, sl (black, clap, flag, glad, plan, slim)',
      'R-blends: br, cr, dr, fr, gr, pr, tr (brim, crab, drip, frog, grip, trip)',
      'S-blends: sc, sk, sl, sm, sn, sp, st, sw (scan, skip, spot, stop, swim)',
      'Triple blends: str, spr, scr, spl, squ (strip, spring, scrap, split, squid)',
      'Final blends: -nd, -nk, -nt, -mp, -ft, -lk, -lt, -sk (hand, sink, tent, lamp, milk)',
    ],
    eslNote: 'For L1 Chinese learners: Consonant blends are EXTREMELY difficult — Mandarin has ZERO consonant clusters. Every Mandarin syllable starts with at most one consonant. Children will insert vowels to break clusters ("belack" for "black", "fulag" for "flag"). This is a normal L1 strategy, not a reading error. Start with L-blends and S-blends (closer to Mandarin phonotactics) before R-blends. Final blends (-nd, -nk, -mp) are doubly hard: both a cluster AND in final position.',
  },
  {
    number: 19,
    name: 'Phonogram Introduction',
    category: 'Reading',
    age: '4.5–5.5 (BEFORE Green Series)',
    purpose: 'Learn phonogram sounds in isolation — 2-3 letters make 1 sound',
    readiness: 'Can read Blue Series words fluently',
    materials: ['Double sandpaper letter cards (2-3 letters on one card)', 'Matching objects per phonogram'],
    presentation: [
      'Take out 2-3 double sandpaper phonogram cards.',
      'Trace with two fingers while saying sound: "/sh/…/sh/…/sh/."',
      'Three-Period Lesson: "This says /sh/" → "Show me /sh/" → "What does this say?"',
      'Introduce 2-3 per lesson. Never introduce similar-sounding phonograms together.',
    ],
    levels: [
      '16 Essential Phonograms:',
      'sh (/sh/) — ship, shell, fish, dish, shoe, sheep, shark',
      'ch (/ch/) — chip, cherry, cheese, chain, chicken, chocolate',
      'th (/th/) — this, that, thumb, thimble, thermometer',
      'qu (/kw/) — queen, quick, quilt, quarter',
      'ee (/ee/) — bee, tree, seed, teeth, wheel',
      'oo (/oo/) — moon, spoon, boot, book, hook',
      'ai (/ay/) — rain, train, snail, nail, chain',
      'oa (/oh/) — boat, coat, goat, soap, toad',
      'ar (/ar/) — car, star, jar, barn, scarf',
      'er (/er/) — flower, letter, feather, hammer',
      'or (/or/) — fork, corn, horn, horse',
      'ou (/ow/) — mouse, house, cloud, mouth',
      'oy/oi (/oy/) — toy, coin, soil, boil',
      'ie (/ie/) — pie, tie, cried, dried',
      'ue (/oo/) — blue, clue, true, glue',
      'au/aw (/aw/) — saw, paw, straw, claw',
    ],
  },
  {
    number: 20,
    name: 'Green Series (Phonograms)',
    category: 'Reading',
    age: '5–6',
    purpose: 'Read words containing phonograms — sometimes 2-3 letters make 1 sound',
    readiness: 'Knows 8+ phonogram sounds',
    materials: ['Green Series materials (same 5 levels as Pink/Blue)'],
    presentation: ['Same 5 levels: picture-word matching → word lists by phonogram → mixed lists → sentences → booklets.'],
  },
  {
    number: 21,
    name: 'Puzzle Words (Sight Words)',
    category: 'Reading',
    age: '5–6 (AFTER solid phonetic foundation)',
    purpose: 'Recognise high-frequency words that break phonetic rules',
    readiness: 'Has solid phonetic reading foundation (Pink + Blue + Green)',
    materials: ['Word cards for each set'],
    presentation: [
      '"This one is a puzzle — it doesn\'t follow the rules, you just have to remember it."',
      'Set 1: the, a, is, was, are, were, has, have, do, does, said, says',
      'Set 2: you, your, they, their, come, some, one, once, who, what, where, there',
      'Set 3: could, would, should, through, thought, enough, people, friend, again, many',
    ],
    amiNotes: ['Puzzle Words MUST come AFTER phonetic foundation. If taught too early, child learns "reading = memorising" instead of "reading = decoding."'],
  },
  {
    number: 22,
    name: 'Reading Analysis',
    category: 'Reading',
    age: '5–6',
    purpose: 'Analyse word structure while reading — identify phonograms, blends, patterns',
    readiness: 'Can read Green Series + Puzzle Words',
    materials: ['Colour-coded pencils: green (phonograms), blue (blends), red (puzzle words)'],
    presentation: ['Child reads text and marks: underline phonograms in green, mark blends in blue, circle puzzle words in red.'],
  },
  {
    number: 23,
    name: 'Reading Classification',
    category: 'Reading',
    age: '5–6',
    purpose: 'Read to categorise and comprehend — proves understanding',
    readiness: 'Can read sentences independently',
    materials: ['Word cards', 'Category labels', 'Sentence cards with topics'],
    presentation: ['Child reads word cards and sorts into categories (animals/vehicles/foods). Then reads sentences and sorts by topic.'],
  },
  {
    number: 24,
    name: 'Command Cards (Action Reading)',
    category: 'Reading',
    age: '5–6',
    purpose: 'Read for meaning through action — proves comprehension',
    readiness: 'Can read sentences and follow multi-step instructions',
    materials: ['Command card strips at 3 levels'],
    presentation: [
      'Level 1 — Single commands: "Run." "Hop." "Clap." One-word action cards.',
      'Level 2 — Two-step: "Walk to the door." "Pick up the red ball."',
      'Level 3 — Complex: "Take three steps forward, turn left, and pick up the pencil next to the blue book."',
    ],
    eslNote: 'For L1 Chinese learners: Command Cards are especially powerful for ESL because they prove comprehension through ACTION — the child doesn\'t need to produce English speech, just demonstrate understanding by doing. Start Level 1 with single-word action verbs the child already understands orally (run, hop, sit, clap). The physical response builds confidence. For Level 2-3, keep vocabulary within the child\'s spoken comprehension range — the reading challenge is enough without also testing unknown vocabulary.',
  },
  {
    number: 25,
    name: 'Interpretive Reading',
    category: 'Reading',
    age: '5–7',
    purpose: 'Read with expression and emotion — add meaning, emphasis',
    readiness: 'Can read fluently at sentence level',
    materials: ['Poetry', 'Short stories', 'Reader\'s theatre scripts'],
    presentation: ['Child moves from decoding to performing — poetry, short stories, reader\'s theatre with expression.'],
  },
  {
    number: 26,
    name: 'Silent Reading',
    category: 'Reading',
    age: '6+',
    purpose: 'Independent reading for pleasure — the final destination',
    readiness: 'Can read chapter-length text',
    materials: ['Picture books → early readers → chapter books'],
    presentation: ['Child reads alone, silently, for pleasure. This is where the love of reading lives.'],
  },

  // ═══════════════════════════════════════════
  // CATEGORY 4: GRAMMAR (11)
  // ═══════════════════════════════════════════
  {
    number: 27,
    name: 'Introduction to the Noun',
    category: 'Grammar',
    age: '4.5–5.5',
    purpose: 'Everything has a name — nouns are the foundation of language',
    readiness: 'Can read and write fluently',
    materials: ['Black triangle (pyramid) symbol', 'Farm game with miniature objects + labels'],
    presentation: [
      '"What is this? A chair. A table. A pencil." These are NOUNS.',
      'Black triangle placed above each noun.',
      'Farm Game: miniature farm with animal/object labels, child reads and places.',
    ],
    amiNotes: ['Symbol: Large black triangle (pyramid) — oldest, most stable structure. Nouns are the foundation.'],
  },
  {
    number: 28,
    name: 'Introduction to the Article',
    category: 'Grammar',
    age: '4.5–5.5',
    purpose: 'Small helper words (a, an, the) that change meaning',
    readiness: 'Knows what a noun is',
    materials: ['Small light blue triangle symbol'],
    presentation: ['"Bring me ball." Something wrong! "Bring me A ball." / "Bring me THE ball." Article changes meaning.'],
  },
  {
    number: 29,
    name: 'Introduction to the Adjective',
    category: 'Grammar',
    age: '4.5–5.5',
    purpose: 'Words that describe nouns — The Detective Game',
    readiness: 'Knows nouns and articles',
    materials: ['Dark blue medium triangle symbol', 'Objects of varying attributes'],
    presentation: [
      '"Bring me a pencil." (any pencil) "Bring me the LONG pencil." "Bring me the SHORT RED pencil."',
      'Each adjective gets a dark blue triangle. Multiple adjectives = multiple triangles.',
    ],
  },
  {
    number: 30,
    name: 'Introduction to the Verb',
    category: 'Grammar',
    age: '5–6',
    purpose: 'The action word — the energy of language',
    readiness: 'Knows nouns, articles, adjectives',
    materials: ['Large red circle (sphere) symbol', 'Action verb cards'],
    presentation: ['"Run! Jump! Sit! Spin! Clap!" The verb is ACTION. The Verb Game: child reads verb card, performs action. Replace verbs to see meaning change.'],
  },
  {
    number: 31,
    name: 'Introduction to the Adverb',
    category: 'Grammar',
    age: '5–6',
    purpose: 'Modifies HOW you do the verb',
    readiness: 'Knows verbs',
    materials: ['Small orange circle symbol'],
    presentation: ['"Walk." "Walk SLOWLY." "Walk QUICKLY." "Walk QUIETLY." Adverb modifies how you do the verb.'],
  },
  {
    number: 32,
    name: 'Introduction to the Pronoun',
    category: 'Grammar',
    age: '5–6',
    purpose: 'Replace nouns to avoid repetition',
    readiness: 'Knows nouns well',
    materials: ['Purple tall triangle symbol'],
    presentation: ['"Sarah has a ball. Sarah throws the ball." Too many Sarahs! "She throws it. She catches it." Pronouns replace nouns.'],
  },
  {
    number: 33,
    name: 'Introduction to the Preposition',
    category: 'Grammar',
    age: '5–6',
    purpose: 'Shows position/relationship between things',
    readiness: 'Knows nouns and verbs',
    materials: ['Green crescent (bridge) symbol', 'Preposition command cards'],
    presentation: ['"Put the ball ON the table. UNDER the table. BESIDE the table. IN the box." Preposition Game: child reads cards and acts.'],
  },
  {
    number: 34,
    name: 'Introduction to the Conjunction',
    category: 'Grammar',
    age: '5–6',
    purpose: 'Joins words, phrases, sentences together',
    readiness: 'Knows nouns, verbs, prepositions',
    materials: ['Pink bar (link) symbol'],
    presentation: ['"Bring me the pen. Bring me the pencil." → "Bring me the pen AND the pencil." Then: OR, BUT.'],
  },
  {
    number: 35,
    name: 'Introduction to the Interjection',
    category: 'Grammar',
    age: '5–6',
    purpose: 'Exclamation words expressing emotion',
    readiness: 'Knows other parts of speech',
    materials: ['Gold keyhole symbol'],
    presentation: ['"Oh! Wow! Hooray! Ouch! Yikes!" Words that express emotion, often stand alone or begin a sentence.'],
  },
  {
    number: 36,
    name: 'Grammar Boxes',
    category: 'Grammar',
    age: '5.5–7',
    purpose: 'Practise parts of speech in context — replace words to see how meaning changes',
    readiness: 'Knows all 9 grammar symbols',
    materials: ['8 colour-coded boxes with fill-in sentence cards'],
    presentation: [
      'Box I (Article): "The ___ is on the table." a/an/the',
      'Box II (Adjective): "The ___ dog ran." big/small/happy/tired',
      'Box III (Verb): "The dog ___." ran/slept/ate/jumped',
      'Box IV (Preposition): "The ball is ___ the table." on/under/beside',
      'Box V (Adverb): "She walked ___." slowly/quickly/quietly',
      'Box VI (Pronoun): Replace nouns with pronouns.',
      'Box VII (Conjunction): Join sentences using and/but/or/because.',
      'Box VIII (Complex): Mixed exercises with longer sentences.',
    ],
  },
  {
    number: 37,
    name: 'Sentence Analysis',
    category: 'Grammar',
    age: '6–7+',
    purpose: 'Analyse sentence structure using colour-coded question arrows',
    readiness: 'Can identify parts of speech in sentences',
    materials: ['Colour-coded question arrows: black (who/what), red (predicate), orange (how/when/where)'],
    presentation: [
      'Subject: "WHO?" (black arrow) — "The tall girl ran quickly." → The tall girl.',
      'Predicate: "WHAT DID THEY DO?" (red arrow) → ran quickly.',
      'Direct Object: "WHAT?" (black arrow) — "She kicked the ball." → the ball.',
      'Indirect Object: "TO WHOM?" (black arrow) — "She gave the book to Tom."',
      'Adverbial: "HOW? WHEN? WHERE?" (orange arrows).',
    ],
  },

  // ═══════════════════════════════════════════
  // CATEGORY 5: WORD STUDY (6)
  // ═══════════════════════════════════════════
  {
    number: 38,
    name: 'Word Families',
    category: 'Word Study',
    age: '5–6',
    purpose: 'See rhyming patterns in written form — the written version of oral rhyming',
    readiness: 'Can read CVC words, knows oral rhyming',
    materials: ['Word family cards sorted by ending: -at, -an, -ig, -op, -ug, -in, -ot, -ell'],
    presentation: [
      '-at: bat, cat, fat, hat, mat, pat, rat, sat, brat, chat, flat, splat',
      '-an: ban, can, fan, man, pan, ran, van, bran, clan, plan, span',
      '-ig: big, dig, fig, gig, jig, pig, rig, wig, twig, sprig',
      'Child sorts word cards by family, reads lists, notices patterns.',
    ],
  },
  {
    number: 39,
    name: 'Spelling Rules',
    category: 'Word Study',
    age: '5–7',
    purpose: 'Apply common English spelling patterns through word sorting and discovery',
    readiness: 'Can read and write at Green Series level',
    materials: ['Word cards demonstrating each rule', 'Sorting mats'],
    presentation: [
      'Doubling Rule: hop→hopping (CVC + vowel suffix = double final consonant). Compare: help→helping (no doubling — ends in 2 consonants).',
      'Silent E Rule: Drop e before vowel suffix: make→making. Keep before consonant: hope→hopeful.',
      'Y-to-I Rule: happy→happiness, cry→cried. Exception before -ing: crying.',
      'Plurals: +s (cats), +es after s/sh/ch/x/z (boxes), y→ies (babies), irregular (mice, children).',
    ],
  },
  {
    number: 40,
    name: 'Compound Words',
    category: 'Word Study',
    age: '5–7',
    purpose: 'Build new words from known parts',
    readiness: 'Can read multi-syllable words',
    materials: ['Word cards split in half for matching'],
    presentation: [
      'sun+flower=sunflower, rain+coat=raincoat, cup+board=cupboard, butter+fly=butterfly',
      'tooth+brush, fire+truck, bed+room, foot+ball',
      'Matching game: split word cards, child matches halves to make compound words.',
    ],
  },
  {
    number: 41,
    name: 'Prefixes and Suffixes',
    category: 'Word Study',
    age: '5–7',
    purpose: 'Modify word meanings systematically — word parts that change meaning',
    readiness: 'Knows compound words, basic spelling rules',
    materials: ['Suffix cards', 'Prefix cards', 'Base word cards'],
    presentation: [
      'Suffixes first: -ed (walked), -ing (walking), -s/-es (cats), -er (teacher), -est (tallest), -ly (slowly), -ful (thankful), -less (careless).',
      'Then prefixes: un- (unhappy), re- (redo), pre- (preview), dis- (disagree), mis- (mistake).',
    ],
  },
  {
    number: 42,
    name: 'Synonyms and Antonyms',
    category: 'Word Study',
    age: '6–7',
    purpose: 'Vocabulary depth and nuance',
    readiness: 'Can read independently, knows 500+ words',
    materials: ['Matching cards for synonyms and antonyms'],
    presentation: [
      'Synonyms: big/large, small/tiny, happy/glad, sad/unhappy, fast/quick, start/begin.',
      'Antonyms: hot/cold, big/small, up/down, happy/sad, fast/slow, old/new, light/dark.',
      'Matching card games and word sorts.',
    ],
  },
  {
    number: 43,
    name: 'Homonyms',
    category: 'Word Study',
    age: '6–7',
    purpose: 'Context-dependent word meaning — words that sound same but differ in spelling/meaning',
    readiness: 'Can read paragraphs and understand context',
    materials: ['Sentence cards with context clues', 'Homonym pair cards'],
    presentation: [
      'to/two/too, their/there/they\'re, sea/see, flower/flour, hear/here',
      'right/write, son/sun, no/know, pair/pear/pare',
      'Child reads sentences and determines which spelling fits from context.',
    ],
  },
];

/**
 * The core AMI principle: Sound → Symbol → Word → Sentence → Grammar → Word Study
 * The ear trains before the hand writes, and the hand writes before the eye reads.
 */
export const AMI_LANGUAGE_PRINCIPLES = `
AMI ENGLISH LANGUAGE PROGRESSION — CORE PRINCIPLES

The sequence is: Sound → Symbol → Word → Sentence → Grammar → Word Study.
Every step builds on the one before it. Nothing is skipped. The progression is non-negotiable.

WRITING BEFORE READING (Maria Montessori's Discovery):
- Writing is ENCODING: the child KNOWS the sound "k" and puts down letter c. Known → unknown. Easier.
- Reading is DECODING: the child sees letter c (unknown) and recalls sound "k". Unknown → known. Harder.
- The child BUILDS words (Moveable Alphabet) before READING words. The "explosion into writing" happens before reading.

THE THREE-PERIOD LESSON (used hundreds of times across the entire curriculum):
1. NAMING: "This is a pomegranate." Show, name clearly, let child handle. Repeat 2-3 times.
2. RECOGNITION: "Show me the pomegranate." Child identifies from group. Longest period — repeat over days.
3. RECALL: "What is this?" Child names it. Only attempt when Period 2 is solid.
If child fails Period 3: return to Period 1 without correction. Never let the child feel they failed.

THE 5 CATEGORIES (43 works total):
1. Oral Language Development (8 works, ages 2.5-4): Vocabulary, classified cards, object-picture matching, sound games, rhyming, storytelling, poems/songs, conversation.
2. Writing Preparation (7 works, ages 3-5): Metal insets, sandpaper letters, sand tray, chalkboard, moveable alphabet, handwriting, creative writing.
3. Reading (11 works, ages 3.5-6): Object boxes, Pink/Blue/Green Series, phonograms, puzzle words, reading analysis, classification, command cards, interpretive/silent reading.
4. Grammar (11 works, ages 4.5-7): 9 parts of speech with physical symbols + Grammar Boxes + Sentence Analysis.
5. Word Study (6 works, ages 5-7): Word families, spelling rules, compound words, prefixes/suffixes, synonyms/antonyms, homonyms.

GRAMMAR SYMBOL SYSTEM:
- Noun: Large BLACK triangle (pyramid — foundation)
- Article: Small LIGHT BLUE triangle
- Adjective: Medium DARK BLUE triangle
- Verb: Large RED circle (sphere — energy/movement)
- Adverb: Small ORANGE circle
- Pronoun: Tall PURPLE triangle
- Preposition: GREEN crescent (bridge)
- Conjunction: PINK bar (link)
- Interjection: GOLD keyhole
`;

/**
 * Get language progression context for a specific child based on their current language works.
 * Returns targeted guidance about what they should be working on and what comes next.
 */
export function getLanguageProgressionForChild(
  currentWorks: Array<{ area: string; work_name: string; status?: string }>,
  childAgeMonths?: number,
): string {
  // Filter to language works only
  const languageWorks = currentWorks.filter(w =>
    w.area === 'language' || w.area === 'Language'
  );

  if (languageWorks.length === 0 && (!childAgeMonths || childAgeMonths < 30)) {
    return ''; // Too young or no language context
  }

  // Find which works the child is currently working on
  const currentWorkNames = languageWorks.map(w => w.work_name.toLowerCase());
  const matchedWorks = LANGUAGE_WORKS.filter(lw =>
    currentWorkNames.some(name =>
      name.includes(lw.name.toLowerCase()) || lw.name.toLowerCase().includes(name.toLowerCase())
    )
  );

  if (matchedWorks.length === 0 && languageWorks.length === 0) {
    // No language works — suggest starting point based on age
    if (childAgeMonths && childAgeMonths >= 30) {
      return `\n🔤 LANGUAGE PROGRESSION NOTE: This child has no language works on their shelf yet. Based on age (${Math.floor(childAgeMonths / 12)}y ${childAgeMonths % 12}m), consider starting with Oral Language Development — specifically Vocabulary Enrichment, Classified Cards, and Sound Games (I Spy). Sound Games is the SINGLE MOST IMPORTANT oral language work — everything downstream depends on it.`;
    }
    return '';
  }

  // Build progression context
  const parts: string[] = [];
  parts.push('\n🔤 AMI LANGUAGE PROGRESSION CONTEXT:');

  // Show current works with their position in the sequence
  if (matchedWorks.length > 0) {
    const highestWork = matchedWorks.reduce((a, b) => a.number > b.number ? a : b);
    parts.push(`Current language focus includes Work #${highestWork.number} (${highestWork.name}) in the 43-work AMI sequence.`);

    // What comes next
    const nextWork = LANGUAGE_WORKS.find(w => w.number === highestWork.number + 1);
    if (nextWork) {
      parts.push(`Next in sequence: Work #${nextWork.number} (${nextWork.name}) — ${nextWork.purpose}.`);
      parts.push(`Readiness check: ${nextWork.readiness}.`);
    }
  }

  // Add current work details for guiding
  for (const mw of matchedWorks.slice(0, 3)) {
    parts.push(`\n[${mw.name}] Age: ${mw.age} | Purpose: ${mw.purpose}`);
    if (mw.levels && mw.levels.length > 0) {
      parts.push(`Levels: ${mw.levels.slice(0, 3).join('; ')}`);
    }
    if (mw.amiNotes && mw.amiNotes.length > 0) {
      parts.push(`AMI Note: ${mw.amiNotes[0]}`);
    }
    if (mw.eslNote) {
      parts.push(`ESL Adaptation: ${mw.eslNote}`);
    }
  }

  return parts.join('\n');
}

/**
 * Get detailed guidance for a specific language work by name.
 * Used when the teacher asks about a specific work.
 */
export function getLanguageWorkDetails(workName: string): LanguageWork | null {
  const lower = workName.toLowerCase();
  return LANGUAGE_WORKS.find(w =>
    w.name.toLowerCase().includes(lower) ||
    lower.includes(w.name.toLowerCase())
  ) || null;
}

/**
 * Format the full language progression as a reference for the Guru's system prompt.
 * This is a condensed version — not the full 7000-word document, but enough for expert guidance.
 */
export function formatLanguageProgressionForPrompt(
  currentWorks?: Array<{ area: string; work_name: string; status?: string }>,
  childAgeMonths?: number,
): string {
  let text = AMI_LANGUAGE_PRINCIPLES;

  // Add child-specific context if available
  if (currentWorks) {
    const childContext = getLanguageProgressionForChild(currentWorks, childAgeMonths);
    if (childContext) {
      text += childContext;
    }
  }

  return text;
}
