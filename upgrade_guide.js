const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, UnorderedList, AlignmentType, VerticalAlign, BorderStyle, ShadingType, PageBreak, HeadingLevel, convertInchesToTwip } = require('docx');
const fs = require('fs');
const path = require('path');

// Helper function to create a heading
function createHeading(text, level = 1) {
  const fontSizes = { 1: 28, 2: 24, 3: 20 };
  return new Paragraph({
    text: text,
    heading: HeadingLevel[`HEADING_${level}`],
    style: `Heading${level}`,
    bold: true,
    spacing: { before: 400, after: 200 },
    alignment: AlignmentType.LEFT,
    run: {
      font: 'Arial',
      size: fontSizes[level] * 2
    }
  });
}

// Helper function for body text
function createParagraph(text, options = {}) {
  return new Paragraph({
    text: text,
    font: 'Arial',
    size: 22,
    spacing: options.spacing || { line: 360 },
    alignment: options.alignment || AlignmentType.LEFT,
    indent: options.indent || { left: 0 },
    ...options
  });
}

// Helper to create section heading (e.g., Work Number and Name)
function createSectionHeader(workNum, workName) {
  return [
    new Paragraph({
      text: `WORK ${workNum}: ${workName}`,
      bold: true,
      font: 'Arial',
      size: 24,
      spacing: { before: 400, after: 200 },
      border: {
        bottom: {
          color: '000000',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 12
        }
      }
    })
  ];
}

// Helper to create subsection
function createSubsection(title) {
  return new Paragraph({
    text: title,
    bold: true,
    font: 'Arial',
    size: 22,
    spacing: { before: 200, after: 100 },
    indent: { left: 400 }
  });
}

// Helper for bullet points
function createBulletPoint(text, level = 0) {
  return new Paragraph({
    text: text,
    font: 'Arial',
    size: 22,
    bullet: {
      level: level
    },
    spacing: { line: 360 },
    indent: { left: 720 + (level * 720), hanging: 360 }
  });
}

// AMS Presentation sections for all 43 works
const presentationSteps = {
  1: `Invite the child to a lesson. Carry the basket of objects to a mat or table. Use the Three-Period Lesson: Period 1 (Naming): Take out 3 objects. Point to each: "This is a mango. This is a pineapple. This is a lemon." Period 2 (Recognition): "Can you show me the mango? Can you point to the pineapple? Put the lemon on the mat." Period 3 (Recall): Point to each object: "What is this?" Introduce only 3 new items per lesson. Review previously learned items before introducing new ones. Speak slowly and clearly. Allow the child to handle each object. If the child cannot recall in Period 3, return to Period 1 without correction — simply re-name the object.`,
  
  2: `Invite the child. Bring one category set to the table. Lay out the control cards (picture + label) in a column on the left. Name each card using the Three-Period Lesson for any unfamiliar items. Give the child the picture-only cards. Ask them to match each picture card next to its control card. Once matched, give label cards. Child places each label under the matching picture. Control of Error: Child compares their arrangement to the control cards. For Level 4 (independent): Child works with picture cards and label cards only, then checks with control cards.`,
  
  3: `Place basket of miniature objects on the table. Lay picture cards face-up in a row. Pick up one object: "This is a cow." Place it on the matching picture card. Invite the child to continue matching remaining objects to pictures. Once complete, review by pointing to each pair and naming. Extension: Remove picture cards. Child names objects from memory.`,
  
  4: `Place 3-4 objects on the mat whose names begin with different sounds. "I spy with my little eye something beginning with /mmm/." (Use the SOUND, not the letter name.) Child identifies the object (e.g., mouse). Progress: Start with 3 objects with very different initial sounds. Gradually increase to 5-6 objects with similar sounds. Level 3 (Ending Sounds): "I spy something ending with /t/." Level 4 (Middle Sounds): "I spy something with /a/ in the middle." (e.g., cat) Level 5 (Sound Boxes): Child independently sorts objects into boxes by initial sound. CRITICAL: Always use phonetic sounds (/s/ not "ess", /m/ not "em").`,
  
  5: `Lay out 5-6 picture cards on the mat. Hold up one card: "This is a cat. Cat... hat! These words rhyme — they sound the same at the end." Place cat and hat together. "Can you find two more that rhyme?" Level 2: Lay out mixed cards. Child matches all rhyming pairs independently. Level 3: Say a word. Child generates rhyming words orally: "What rhymes with dog?" (log, fog, hog...)`,
  
  6: `Lay sequence cards face-up on the mat in random order. "These pictures tell a story, but they're mixed up. Let's put them in order." Model with the first card: "What happens first? We dig a hole." Child arranges remaining cards in order. "Now tell me the story." Child narrates the sequence. Control of Error: Numbers on the back of cards for self-checking.`,
  
  7: `Gather children in circle time. Display the poem/song card. Recite or sing the whole piece once through with expression. Repeat line by line — children echo each line. Add hand motions for fingerplays, demonstrating each movement. Repeat daily until children can perform independently. Extension: Child selects a poem card and performs for the group.`,
  
  8: `Circle time. Child draws a prompt card from the basket. Read the prompt aloud (or child reads if able). Model a response first: "My favourite food is pasta because it's warm and I can eat it with cheese." Child responds. Other children listen without interrupting. Teach turn-taking: "When someone is speaking, we listen with our ears and our eyes." Level 2: Partner conversations — two children face each other with a prompt card.`,
  
  9: `Invite child to choose one metal inset from the stand. Demonstrate: Place frame on paper. Hold frame firmly with non-dominant hand. With dominant hand, trace inside the frame with a colored pencil, keeping pencil against the metal edge. Remove frame. Place inset piece inside the traced outline. Trace around the inset with a different color. Remove inset. Fill the shape with horizontal lines from left to right, staying inside the outline. Show the child: lines should be close together, touching both edges, with even pressure. Progress through levels: horizontal → vertical → diagonal → curved → two-color overlay → free design.`,
  
  10: `Bring 3 sandpaper letters to the table (2 consonants, 1 vowel from the same group). Three-Period Lesson with tactile component: Period 1: Trace the letter with index and middle fingers while saying the SOUND (not name): "This says /m/." Trace 2-3 times. Invite child to trace and repeat the sound. Period 2: "Show me /m/. Trace /s/ for me. Can you find /a/?" Period 3: Point to each: "What does this say?" Always trace in correct formation direction (as the letter would be written). Fingers must be on the sandpaper — the tactile memory is essential. Introduce groups in order: c,m,a,t → s,r,i,p → b,f,o,g → h,j,u,l → d,w,e,n → k,q,v,x,y,z`,
  
  11: `Place sand tray on table. Child selects a sandpaper letter. Child traces the sandpaper letter while saying the sound. "Now write it in the sand." Child forms the letter in the sand using index finger. If incorrect, gently shake the tray to smooth the sand and try again. The sand tray is self-correcting — the child can always start fresh.`,
  
  12: `Place letter formation card on the chalk ledge. Demonstrate: Write the letter large on the chalkboard following the directional arrows. Say the sound while writing. Child practices writing the letter large. Erase and repeat. Progress to writing words once individual letters are mastered.`,
  
  13: `Place moveable alphabet box on mat. Place an object (e.g., miniature cat) beside it. "What is this? Cat. Let's build 'cat.' What sound do you hear first? /c/." Child finds the 'c'. "What do you hear next? /a/." Child finds the 'a'. "What do you hear last? /t/." Child finds the 't'. Child reads back: "/c/ /a/ /t/ — cat!" Do NOT correct spelling at this stage — the goal is encoding sounds to symbols. Progress: objects → pictures → phrases → sentences → stories.`,
  
  14: `Show child the lined paper. Point to each line: "This green line is the ground. Letters sit here. This dotted line is the middle. Short letters reach here. This top line is the sky. Tall letters reach here." Demonstrate writing one letter on the lines. Child practices with letter formation card as reference. Focus on proper pencil grip (tripod grip), posture, and paper position.`,
  
  15: `Level 1 (Labeling): Child draws a picture, then writes the name underneath using moveable alphabet or pencil. Level 2: Provide picture prompt card. "Tell me about this picture." After discussion: "Now write one sentence about it." Level 3: "Today we'll write in our journal. Write about something that happened today." Accept inventive spelling. Focus on the joy of writing, not correctness.`,
  
  16: `Start with Pink Box. Place objects on mat. Place word labels face-down in a pile. Child picks up a label, reads it aloud: "cat." Finds the matching miniature object and places label beside it. Continue until all labels are matched. Control of Error: Control card inside the box lid showing all correct matches. Blue Box: Same process but with blend words (frog, drum, crab...). Green Box: Same process with phonogram words (sheep, whale, chain...).`,
  
  17: `Level 1: Lay out 5 picture cards. Give child matching word cards. Child reads each word and places it under the correct picture. Level 2: Give child a word list card. Child reads each word aloud, running finger under the word left to right. Level 3: Give child a phrase strip. Child reads the whole phrase, then matches to a picture if available. Level 4: Child reads sentence strips aloud. Discuss meaning. Level 5: Child reads the booklet independently, then narrates what happened. Key: If the child struggles with a word, say "Sound it out. What's the first sound?" Guide them to blend sounds.`,
  
  18: `Same progression as Pink Series. For blends, demonstrate: "This word is 'frog.' Listen: /fr/ /o/ /g/. The /f/ and /r/ blend together." Have child practice blending the first two consonants before adding the vowel. Use the same 5 levels: picture-word matching → word lists → phrases → sentences → booklets.`,
  
  19: `Use sandpaper phonogram boards with Three-Period Lesson: Period 1: Trace 'sh' while saying the sound /sh/: "These two letters together say /sh/." Period 2: "Show me /sh/. Find /ch/." Period 3: "What does this say?" Introduce 2-3 new phonograms per lesson. After introducing a phonogram, show 3 words containing it: "ship, shop, fish — they all have /sh/."`,
  
  20: `Same progression as Pink and Blue Series, now with phonogram words. Level 1: Picture-word matching with phonogram words (rain, sheep, boat...). When child encounters a phonogram in a word: "You know /sh/. This word has /sh/ in it. Sound it out." Progress through all 6 levels with green-bordered materials.`,
  
  21: `"Some words are tricky — they don't sound the way they look. We call them puzzle words." Introduce 3 puzzle words per lesson using Three-Period Lesson. Period 1: Show card "the" — "This word says 'the.'" Trace with finger while saying it. Period 2: "Show me 'the'. Find 'was'. Point to 'said'." Period 3: "What does this word say?" Practice in context: Find puzzle words in sentence strips and booklets.`,
  
  22: `Give child a word card (e.g., "sheep"). "Can you find the phonogram in this word?" Child identifies 'sh' or 'ee'. Child underlines or circles the phonogram with a dry-erase marker (if card is laminated). Extension: Sort word cards by phonogram type.`,
  
  23: `Lay out category header cards (e.g., "Animals" / "Food" / "Toys"). Give child word cards. "Read each word and place it under the right heading." Child reads independently and sorts. Discuss any items they're unsure about. Control of Error: Answer key card.`,
  
  24: `"I have special cards. When you read one, you must DO what it says." Child draws a card, reads it silently, then performs the action. Other children guess what the card said (fun group activity). Progress: simple one-word commands → two-step → multi-step complex commands.`,
  
  25: `Model reading with expression: "Listen to how I read this poem." Read with varied tone, pace, emphasis. "Now you try. Make it sound like the words feel." Reader's Theater: Assign roles. Children read their parts with expression.`,
  
  26: `"Choose a book from the shelf. Find a comfortable spot. Read with your eyes, not your voice." After reading, child completes reading log or tells you about the book. Build up silent reading time gradually: 5 minutes → 10 → 15 → 20.`,
  
  27: `"Everything in this room has a name. This is a 'cup.' This is a 'chair.' Words that name things are called NOUNS." Place a black triangle above each noun label: "The black triangle is the symbol for a noun." Naming Game: Place labels on classroom objects. Child reads and places each label. Common vs Proper: "A 'dog' is any dog — that's a common noun. 'Rex' is a specific dog — that's a proper noun. Proper nouns get a capital letter." Singular/Plural: "One cat, two cats. One child, two children." Match singular and plural cards.`,
  
  28: `After the noun lesson: "The noun needs a little word before it. 'A cup.' 'The chair.' These little words are called articles." Place the small light blue triangle before the black triangle. Give child noun cards. "Put 'a' or 'the' before each noun." "A or An? We say 'an' before a vowel sound: 'an apple,' 'an egg.' We say 'a' before a consonant sound: 'a cat,' 'a book.'"`,
  
  29: `Detective Adjective Game: Place 3 similar objects (e.g., 3 different pencils). "Bring me the pencil." Child hesitates. "Which pencil? Bring me the LONG pencil." Now child can identify it. "The word 'long' describes the pencil. It's called an ADJECTIVE. Adjectives tell us WHICH ONE or WHAT KIND." Place the dark blue triangle between the article and noun: article — adjective — noun. Practice: Give adjective cards and noun cards. Child builds phrases: "the red ball," "a big dog."`,
  
  30: `"Watch me." Stand up and walk. "What did I do? I walked. 'Walk' is a VERB. Verbs are action words." The verb symbol is a large red circle — "The verb gives energy to the sentence, like a ball rolling." Command Game: Give child verb cards. They read and perform each action: run, jump, clap, spin. Verb Tenses: "Yesterday I walked. Today I walk. Tomorrow I will walk." Match past/present/future cards.`,
  
  31: `After verb lesson: "Walk." Child walks. "Now walk SLOWLY." Child changes. "Now walk QUICKLY." "The word 'slowly' tells us HOW you walked. It adds to the verb. It's called an ADVERB." Small orange circle is the adverb symbol — it modifies the verb circle. Activity cards: Child reads and performs "Jump HIGH," "Sing QUIETLY," "Run FAST."`,
  
  32: `Write "The boy ran. The boy jumped. The boy sat." Read aloud. "That's a lot of 'the boy!' We can use a shorter word: 'He ran. He jumped. He sat.'" "'He' is a PRONOUN. It takes the place of a noun." Purple triangle symbol — it replaces the noun's black triangle. Substitution cards: Child reads the noun sentence, then replaces with the correct pronoun.`,
  
  33: `Place a ball and a box on the table. "Put the ball IN the box. Put the ball ON the box. Put the ball UNDER the box." "In, on, under — these words tell us WHERE. They're called PREPOSITIONS." Green crescent symbol. Game cards: Child reads a card ("Put the pencil BEHIND the book") and performs the action.`,
  
  34: `Write two sentences: "I like cake." "I like pie." "We can join them: 'I like cake AND pie.'" "'And' connects the words. It's called a CONJUNCTION." Pink rectangle symbol. Practice: Give pairs of sentences. Child combines them using and, but, or.`,
  
  35: `Act surprised: "Oh! I dropped my pencil!" Write "Oh!" on a card. "Words like 'Oh!' and 'Wow!' show feelings. They're called INTERJECTIONS." Gold keyhole symbol. Match interjection cards to emotion/situation pictures.`,
  
  36: `Select a grammar box (e.g., Box II — Adjective). Read the sentence card aloud. "This sentence has a blank. Which word fits?" Child selects from word cards. Place grammar symbols above each word in the completed sentence. Child works through all cards in the box, self-checking with answer key.`,
  
  37: `Write a sentence on a strip: "The dog ran." "Who ran? THE DOG. That's the SUBJECT — who or what the sentence is about." Place red arrow above. "What did the dog do? RAN. That's the PREDICATE — what the subject does." Place black arrow above. Progress: Add direct object ("The dog ate the bone" — "What did the dog eat?"), indirect object, adverbial extensions.`,
  
  38: `Lay out the family header card (e.g., "-at"). "These words all end the same way: cat, bat, hat, mat. They're in the -at family." Give word cards. Child reads and sorts under correct family header. Extension: "Can you think of another word in the -at family?" Child generates new words.`,
  
  39: `Present the rule card. Read and explain with examples. Doubling Rule: "Run → running. We double the 'n' before adding -ing. Watch: hop → hopping." Give word pairs. Child matches root word to its changed form. Sort words: "Does this word follow the doubling rule, the silent e rule, or the y-to-i rule?"`,
  
  40: `"Some big words are made of two small words stuck together. Sun + flower = sunflower." Lay out word halves. Child matches pairs to build compound words. Read each compound word. "What two words make 'butterfly'? Butter + fly!" Extension: Child illustrates compound words (draw the two parts + the whole).`,
  
  41: `"We can change a word by adding something to the beginning or end." Prefix: "Happy. Now add 'un-': UNhappy. The meaning changed — it means NOT happy." Suffix: "Walk. Add '-ed': walked. Now it happened in the past." Child builds words by placing prefix/suffix cards next to root word cards.`,
  
  42: `Antonyms: "Hot and cold are OPPOSITES. We call opposite words antonyms." Lay out word cards. Child matches opposite pairs. Synonyms: "Big and large mean the SAME THING. Words with similar meanings are synonyms." Child matches synonym pairs. Self-check with symbols on card backs.`,
  
  43: `Show two picture cards: sea (ocean) and see (eyes). "These words SOUND the same but mean different things and are spelled differently." "Sea — S-E-A — the ocean. See — S-E-E — to look with your eyes." Child matches homophone pairs with their pictures. Multiple meanings: Show "bat" card. "A bat can be an animal that flies OR something you hit a ball with." Match to both picture cards.`
};

// Work data - consolidated information
const works = [
  {
    num: 1, name: 'Vocabulary Enrichment', category: 'ORAL LANGUAGE DEVELOPMENT',
    what: 'A collection of real or miniature objects organized by theme, used to build child\'s vocabulary through sensory exploration and naming.',
    contents: '12-15 miniature objects per set (animals, fruits, household items, tools, etc.). Objects should be small enough for child to handle comfortably.',
    making: 'Select miniature objects from Safari Ltd TOOB sets or AliExpress. Organize into themed baskets or trays. Label each basket with a theme card. Store in clearly labeled baskets.',
    storage: 'Small baskets or trays, labeled by theme'
  },
  {
    num: 2, name: 'Classified Cards (Nomenclature Cards)', category: 'ORAL LANGUAGE DEVELOPMENT',
    what: 'Three-part picture cards showing real images, labels, and labels that match pictures. Used for vocabulary expansion and reading preparation.',
    contents: 'Sets of 9-12 cards per category. Each card shows: picture only, picture + label, label only. Categories: animals, fruits, vegetables, household items, tools, clothing, vehicles.',
    making: 'Print images from stock photos or drawings on white cardstock. Laminate. Print labels separately. Create 3 versions: picture only, picture+label, label only. Organize sets by category.',
    storage: 'Envelopes or boxes labeled by category'
  },
  {
    num: 3, name: 'Object to Picture Matching', category: 'ORAL LANGUAGE DEVELOPMENT',
    what: 'Miniature objects matched with corresponding picture cards. Develops visual discrimination and vocabulary.',
    contents: '8-10 miniature objects, corresponding picture cards on white cardstock.',
    making: 'Select miniature objects. Take clear photos or print images of each. Mount images on white cardstock. Laminate cards. Organize objects in basket.',
    storage: 'Basket for objects, box for cards'
  },
  {
    num: 4, name: 'Sound Games (I Spy)', category: 'ORAL LANGUAGE DEVELOPMENT',
    what: 'Objects for oral phonemic awareness practice. Child identifies objects by initial, final, or medial sounds.',
    contents: '20-30 objects with various initial sounds: /s/, /m/, /p/, /t/, /b/, /d/, /c/, /f/, /h/, /n/, /r/, /l/, /w/, /y/, /g/, etc.',
    making: 'Collect or create miniature objects covering wide range of initial sounds. Label cards with sound symbols. Store by sound group.',
    storage: 'Boxes organized by initial sound'
  },
  {
    num: 5, name: 'Rhyming Activities', category: 'ORAL LANGUAGE DEVELOPMENT',
    what: 'Picture cards with rhyming words. Develops phonological awareness and listening skills.',
    contents: 'Pairs and groups of 4-6 rhyming picture cards. Rhyme families: -at, -og, -un, -et, -ot, -an, -en, -ig, -op, -ug, etc.',
    making: 'Find or draw images of rhyming words. Print on white cardstock, mount if needed. Laminate. Optional: Put rhyme family label on back for self-checking.',
    storage: 'Boxes labeled by rhyme family'
  },
  {
    num: 6, name: 'Storytelling and Sequencing', category: 'ORAL LANGUAGE DEVELOPMENT',
    what: 'Picture cards in sequence forming a complete story. Develops narrative skills and logical ordering.',
    contents: '4-6 sequential picture cards per story. 3-5 different story sequences: e.g., planting a seed, building a house, baking a cake, getting dressed, washing hands.',
    making: 'Draw or print sequential images. Mount on cardstock. Number on back for self-checking. Laminate. Store each sequence in envelope.',
    storage: 'Envelopes labeled by story'
  },
  {
    num: 7, name: 'Poems, Songs, and Fingerplays', category: 'ORAL LANGUAGE DEVELOPMENT',
    what: 'Printed poems, songs, and fingerplay instructions. For group circle time or individual learning.',
    contents: '15-20 poems and songs appropriate for ages 3-6. Include traditional nursery rhymes, action poems, seasonal verses.',
    making: 'Type each poem on white cardstock with clear, large font (at least 18pt). Add simple illustrations or clip art if desired. Laminate for durability.',
    storage: 'Basket or file box with divider tabs'
  },
  {
    num: 8, name: 'Conversation and Discussion', category: 'ORAL LANGUAGE DEVELOPMENT',
    what: 'Prompt cards for conversations. Encourages verbal expression and listening skills.',
    contents: '20-30 prompt cards with open-ended questions and discussion starters: "Tell me about...", "What if...?", "Have you ever...?"',
    making: 'Write prompts on white cardstock (one per card) in 16-18pt font. Laminate. Include illustrations if desired.',
    storage: 'Basket or box for cards'
  },
  {
    num: 9, name: 'Metal Insets', category: 'WRITING PREPARATION',
    what: 'Set of metal frames with matching inset pieces in various geometric shapes. Essential for fine motor and pre-writing control development. RECOMMEND PURCHASING, NOT MAKING.',
    contents: '10 metal frames with shapes: circle, square, triangle, rectangle, oval, star, hexagon, cross, diamond, and semicircle. Each with matching inset and knobs.',
    making: 'PURCHASE from AliExpress or specialist supplier: search "蒙特梭利金属嵌板" (~$30-50 USD). NOT RECOMMENDED TO FABRICATE.',
    storage: 'Metal inset stand with labeled slots'
  },
  {
    num: 10, name: 'Sandpaper Letters', category: 'WRITING PREPARATION',
    what: 'Letters traced onto sandpaper, mounted on wooden or cardstock blocks. Child traces with fingers to develop tactile letter recognition and correct formation direction.',
    contents: '26 letters (lowercase preferred initially). Letters: a-z. Mount on pink blocks for consonants, blue for vowels.',
    making: 'Print letters in large font (at least 4"), trace onto sandpaper P220. Mount on wooden blocks or thick cardstock with strong glue. Ensure proper letter formation direction.',
    storage: 'Wooden stand or box with 26 labeled compartments'
  },
  {
    num: 11, name: 'Sand Tray Writing', category: 'WRITING PREPARATION',
    what: 'Tray filled with fine sand for letter tracing. Self-correcting: child can erase and try again by shaking the tray.',
    contents: 'One wooden or plastic tray (minimum 12"x16") filled with fine, smooth sand. Optional: add colored sand for visual appeal.',
    making: 'Use shallow wooden tray or purchase plastic sand tray. Fill with fine sand (kinetic sand or play sand, sifted). Add white sand or colored sand for contrast if desired.',
    storage: 'Place on low shelf accessible to children'
  },
  {
    num: 12, name: 'Chalkboard Writing', category: 'WRITING PREPARATION',
    what: 'Small chalkboard with chalk and letter formation guides. For large-motor writing practice.',
    contents: 'One chalkboard (30x40cm minimum), white and colored chalk, eraser, letter formation reference cards.',
    making: 'Use purchased small chalkboard. Create letter formation cards with arrows showing proper direction and size. Laminate for durability.',
    storage: 'Place on easel or mounted on wall at child\'s eye level'
  },
  {
    num: 13, name: 'Moveable Alphabet', category: 'WRITING PREPARATION',
    what: 'Individual letter tiles (consonants in blue, vowels in red) that child arranges to spell words. RECOMMEND PURCHASING.',
    contents: 'Uppercase and lowercase letters. Consonants: multiple copies in blue. Vowels: multiple copies in red. Wood or plastic tiles.',
    making: 'PURCHASE from AliExpress: search "蒙特梭利活动字母" (~$15-25 USD). NOT RECOMMENDED TO FABRICATE.',
    storage: 'Wooden box with separate compartments for consonants and vowels'
  },
  {
    num: 14, name: 'Handwriting on Paper', category: 'WRITING PREPARATION',
    what: 'Lined paper with guide lines for proper letter size and placement. Includes reference cards for letter formation.',
    contents: 'Montessori-ruled paper (red baseline, green middle line, top line for tall letters). Letter formation reference cards.',
    making: 'Purchase Montessori-ruled paper or create template: 1/2" green line (ground), 1/4" above green (middle), 1/4" above middle (top). Print template. Laminate sample page for reference.',
    storage: 'Pad of paper in child\'s writing area'
  },
  {
    num: 15, name: 'Creative Writing', category: 'WRITING PREPARATION',
    what: 'Picture prompts and blank paper for child to compose original sentences and stories.',
    contents: '10-15 picture prompt cards. Blank white paper or writing journals.',
    making: 'Print or draw picture prompts on cardstock. Laminate. Provide blank A4 paper or create simple blank journals (folded white paper, stapled).',
    storage: 'Box for picture prompts, journals or paper stack'
  },
  {
    num: 16, name: 'Object Boxes (Pink/Blue/Green)', category: 'READING',
    what: 'Three progressive word/object matching sets. Pink: CVC words. Blue: blend words. Green: phonogram words. Critical reading foundation materials.',
    contents: 'Pink Box: 8 miniature objects (cat, bat, hat, mat, rat, sit, big, dog) with matching word cards. Blue Box: 8 objects with blend words (frog, drum, crab, flag, play, slip, snail, spot). Green Box: 8 objects with phonogram words (sheep, whale, chain, train, boat, moon, ring, clown).',
    making: 'Collect or create miniature objects. Print word labels on white cardstock. Laminate. Create control card showing correct matches, place inside box lid.',
    storage: 'Three labeled boxes'
  },
  {
    num: 17, name: 'Pink Series (CVC Words)', category: 'READING',
    what: 'Progressive reading cards and booklets with consonant-vowel-consonant (CVC) words. Foundation for initial reading.',
    contents: 'Level 1: Picture + word cards (10 words). Level 2: Word lists (15 words). Level 3: Phrase strips (10 phrases). Level 4: Sentence strips (8 sentences). Level 5: Little booklet (8-16 pages).',
    making: 'Create word lists with words: cat, bat, hat, mat, rat, sit, big, dog, bus, cup, etc. Print on white cardstock. For Level 5, create 8-16 page booklet with simple CVC story (one word per page with picture).',
    storage: 'Boxes or envelopes labeled by level'
  },
  {
    num: 18, name: 'Blue Series (Blends)', category: 'READING',
    what: 'Reading materials with consonant blend words (br, cr, dr, fr, gr, pr, tr, bl, cl, fl, gl, pl, sl, sc, sk, sm, sn, sp, st, sw).',
    contents: 'Level 1-5 as Pink Series, but with blend words: frog, drum, crab, flag, play, slip, snail, spot, block, clock, flower, glue, please, slide, step, swim, snap, sport, star, swing, etc.',
    making: 'Follow same format as Pink Series but with blend words. Create booklet about blends (e.g., "Frog and Flag" story).',
    storage: 'Boxes or envelopes labeled by level'
  },
  {
    num: 19, name: 'Phonogram Introduction', category: 'READING',
    what: 'Sandpaper phonogram boards showing letter pairs that make single sounds (sh, ch, th, ng, ck, etc.).',
    contents: 'Sandpaper phonogram pairs on cards/boards: sh, ch, th, ng, ck, wh, ph, gh, ea, ee, oa, etc.',
    making: 'Print letter pairs in large font onto sandpaper sheets. Mount on cardstock or wooden blocks. Laminate for durability. Create with different colored backgrounds (e.g., green for digraphs).',
    storage: 'Box with compartments organized by phonogram type'
  },
  {
    num: 20, name: 'Green Series (Phonograms)', category: 'READING',
    what: 'Reading materials using words with phonograms (sh, ch, th, etc.). Built on child\'s knowledge of phonogram sounds.',
    contents: 'Level 1-5 as Pink/Blue Series, but with phonogram words: sheep, whale, chain, rain, boat, moon, ring, clown, ship, chin, think, ring, back, when, phone, etc.',
    making: 'Follow same format as Pink and Blue Series with phonogram words. Create booklet about phonograms (e.g., "Sheep and Whale" story).',
    storage: 'Boxes or envelopes labeled by level'
  },
  {
    num: 21, name: 'Puzzle Words (Sight Words)', category: 'READING',
    what: 'Irregular/sight words (the, was, said, have, where, etc.) that don\'t follow phonetic rules. Must be memorized.',
    contents: '20-25 puzzle word cards: the, a, an, was, is, are, have, has, said, one, two, some, come, from, where, there, their, they, would, could, should, etc.',
    making: 'Print puzzle words on white cardstock (18pt+ font). Add simple illustrations or symbols to aid memory. Laminate.',
    storage: 'Box labeled "Puzzle Words"'
  },
  {
    num: 22, name: 'Reading Analysis', category: 'READING',
    what: 'Word cards for child to identify and mark phonograms within words using dry-erase markers.',
    contents: '15-20 word cards containing phonograms for child to identify and circle/underline.',
    making: 'Print words on white cardstock that contain phonograms learned (sheep, rain, chain, etc.). Laminate with glossy finish for dry-erase use.',
    storage: 'Box with words, dry-erase markers, eraser'
  },
  {
    num: 23, name: 'Reading Classification', category: 'READING',
    what: 'Header cards and word cards for child to classify words by category while reading.',
    contents: 'Header cards: Animals, Food, Clothing, Toys, Tools, etc. 8-10 word cards per category.',
    making: 'Create category headers on cardstock. Print word cards. Laminate all. Include answer key.',
    storage: 'Box organized by category headers'
  },
  {
    num: 24, name: 'Command Cards (Action Reading)', category: 'READING',
    what: 'Laminated cards with action commands for child to read and perform. Combines reading with physical response.',
    contents: '15-20 command cards: "Jump high", "Touch your nose", "Sit down", "Walk slowly", "Run fast", "Hop on one foot", "Spin around", "Clap your hands", etc.',
    making: 'Write commands on white cardstock in large print (14-16pt). Laminate. Progress from one-word (Run) to complex (Hop on one foot three times).',
    storage: 'Box or basket for command cards'
  },
  {
    num: 25, name: 'Interpretive Reading', category: 'READING',
    what: 'Stories and poems for expressive reading practice. Child develops fluency, expression, and comprehension.',
    contents: '5-8 short stories or poems (50-100 words each). Multiple copies for group reading.',
    making: 'Select or write short stories with emotion/expression potential. Print on white cardstock or booklet form. Add illustrations if desired.',
    storage: 'Folder or box for stories'
  },
  {
    num: 26, name: 'Silent Reading', category: 'READING',
    what: 'Collection of appropriate books for independent silent reading practice. Builds reading stamina and comprehension.',
    contents: '15-25 picture books and early readers at child\'s level. Include: CVC stories, blend stories, phonogram stories, sight word books.',
    making: 'Curate collection of published children\'s books appropriate for emerging readers. Create reading logs (simple checklist with book titles).',
    storage: 'Shelf accessible to children, organized by level'
  },
  {
    num: 27, name: 'Introduction to the Noun', category: 'GRAMMAR',
    what: 'Materials introducing the concept of nouns (words that name people, places, things). Includes grammar symbol (black triangle).',
    contents: '20-30 picture cards (nouns), black triangle symbols, sentence label cards.',
    making: 'Print 20-30 picture cards of nouns on white cardstock. Create or print black triangle symbol cards. Create label cards: "Noun", "Common Noun", "Proper Noun".',
    storage: 'Box with picture cards, symbol cards, labels'
  },
  {
    num: 28, name: 'Introduction to the Article', category: 'GRAMMAR',
    what: 'Materials introducing articles (a, an, the). Shows relationship between articles and nouns. Uses light blue triangle symbol.',
    contents: 'Article cards (a, an, the), noun picture cards, light blue triangle symbols.',
    making: 'Print "a", "an", "the" on separate white cardstock cards. Create light blue triangles. Create sample sentences with articles.',
    storage: 'Box with article cards, symbols, noun cards'
  },
  {
    num: 29, name: 'Introduction to the Adjective', category: 'GRAMMAR',
    what: 'Materials introducing adjectives (descriptive words). Shows how adjectives modify nouns. Uses dark blue triangle symbol.',
    contents: 'Adjective cards, noun cards, dark blue triangles, sentence building materials.',
    making: 'Create adjective cards (big, small, red, blue, happy, sad, etc.) on white cardstock. Create dark blue triangles. Create materials for "Detective Adjective" game.',
    storage: 'Box with adjective cards, noun cards, symbols'
  },
  {
    num: 30, name: 'Introduction to the Verb', category: 'GRAMMAR',
    what: 'Materials introducing verbs (action words). Shows verbs as the energy of sentences. Uses red circle symbol.',
    contents: 'Verb cards, red circles, action picture cards, command cards.',
    making: 'Create verb cards (run, jump, sit, write, eat, sleep, etc.) on white cardstock. Create large red circles. Make action picture cards.',
    storage: 'Box with verb cards, circles, action pictures'
  },
  {
    num: 31, name: 'Introduction to the Adverb', category: 'GRAMMAR',
    what: 'Materials introducing adverbs (words that modify verbs). Uses small orange circle symbol.',
    contents: 'Adverb cards, small orange circles, verb cards, sentence materials.',
    making: 'Create adverb cards (slowly, quickly, quietly, loudly, carefully, happily, etc.) on white cardstock. Create small orange circles. Match adverbs to verbs.',
    storage: 'Box with adverb cards, circles, verb cards'
  },
  {
    num: 32, name: 'Introduction to the Pronoun', category: 'GRAMMAR',
    what: 'Materials introducing pronouns (words replacing nouns). Uses purple triangle symbol.',
    contents: 'Pronoun cards (I, you, he, she, it, we, they), purple triangles, noun + pronoun substitution materials.',
    making: 'Create pronoun cards on white cardstock. Create purple triangles. Create substitution exercises (e.g., "The boy ran" → "He ran").',
    storage: 'Box with pronoun cards, triangles, exercises'
  },
  {
    num: 33, name: 'Introduction to the Preposition', category: 'GRAMMAR',
    what: 'Materials introducing prepositions (position/relationship words). Uses green crescent symbol.',
    contents: 'Preposition cards (in, on, under, over, beside, behind, etc.), green crescents, action cards.',
    making: 'Create preposition cards on white cardstock. Create green crescents. Make action cards with prepositions (e.g., "Put pencil IN the box").',
    storage: 'Box with preposition cards, crescents, action cards'
  },
  {
    num: 34, name: 'Introduction to the Conjunction', category: 'GRAMMAR',
    what: 'Materials introducing conjunctions (connecting words). Uses pink rectangle symbol.',
    contents: 'Conjunction cards (and, but, or, because, when, etc.), pink rectangles, sentence combination materials.',
    making: 'Create conjunction cards on white cardstock. Create pink rectangles. Make paired sentences for child to combine with conjunctions.',
    storage: 'Box with conjunction cards, rectangles, sentence pairs'
  },
  {
    num: 35, name: 'Introduction to the Interjection', category: 'GRAMMAR',
    what: 'Materials introducing interjections (feeling/emotion words). Uses gold keyhole symbol.',
    contents: 'Interjection cards (Oh!, Wow!, Ouch!, Yay!, Help!, etc.), gold keyholes, emotion/situation picture cards.',
    making: 'Create interjection cards on white cardstock. Create gold keyhole symbols. Create picture cards showing emotion-appropriate situations.',
    storage: 'Box with interjection cards, keyholes, picture cards'
  },
  {
    num: 36, name: 'Grammar Boxes', category: 'GRAMMAR',
    what: 'Progressive grammar exercises. Sentence cards with blanks that child fills with appropriate words. Self-checking with answer keys.',
    contents: '6-8 Grammar Boxes (each focusing on different grammar concept). Each box: 10-15 sentence cards with blanks, word card options, answer key.',
    making: 'Create sentence cards with blanks. Provide multiple word options. Create answer key. Number cards for self-checking system.',
    storage: '6-8 labeled grammar boxes'
  },
  {
    num: 37, name: 'Sentence Analysis', category: 'GRAMMAR',
    what: 'Materials for analyzing sentence components (subject, predicate, object). Includes arrow symbols and color-coding.',
    contents: 'Sentence strips, red arrows (subject), black arrows (predicate), component label cards.',
    making: 'Write sentences on white cardstock strips. Create arrows. Create labels: Subject, Predicate, Object, etc. Color-code if desired.',
    storage: 'Box with sentence strips, arrows, labels'
  },
  {
    num: 38, name: 'Word Families', category: 'WORD STUDY',
    what: 'Word cards organized by word families/rhyme families. Shows patterns in spelling and sounds.',
    contents: '10-12 word family sets. Each family: header card (-at, -og, -un, etc.) + 6-8 word cards.',
    making: 'Create header cards for word families. Create word cards for each family. Laminate. Include answer key showing all words.',
    storage: 'Box with family headers and word cards, organized by family'
  },
  {
    num: 39, name: 'Spelling Rules', category: 'WORD STUDY',
    what: 'Materials demonstrating spelling rules (doubling rule, silent e rule, y-to-i rule, etc.).',
    contents: 'Rule explanation cards, word pairs showing before/after (run → running, hope → hoping, etc.).',
    making: 'Create rule cards explaining each rule. Create word pair cards showing application of rules. Laminate.',
    storage: 'Box organized by rule type'
  },
  {
    num: 40, name: 'Compound Words', category: 'WORD STUDY',
    what: 'Materials showing how two words combine to make compound words. Includes picture representations.',
    contents: '15-20 compound word pairs. Word parts on separate cards, completed compound word cards, picture cards.',
    making: 'Create cards for word parts (sun, flower, base, ball, etc.). Create complete compound cards. Add pictures showing meaning of compound words.',
    storage: 'Box with word part cards and compound cards'
  },
  {
    num: 41, name: 'Prefixes and Suffixes', category: 'WORD STUDY',
    what: 'Materials showing how prefixes and suffixes modify word meanings. Includes cards for building words.',
    contents: 'Root word cards, prefix cards (un-, re-, pre-, dis-), suffix cards (-ed, -ing, -er, -est, -ly).',
    making: 'Create root word cards. Create prefix and suffix cards. Child combines to make new words and learns meaning changes.',
    storage: 'Box with root words, prefixes, suffixes'
  },
  {
    num: 42, name: 'Synonyms and Antonyms', category: 'WORD STUDY',
    what: 'Word cards showing synonyms (similar meanings) and antonyms (opposite meanings).',
    contents: '10-15 synonym pairs, 10-15 antonym pairs on separate cards.',
    making: 'Create word cards for synonyms and antonyms. Laminate. Create answer key showing correct pairs.',
    storage: 'Box with cards organized by type (synonyms vs. antonyms)'
  },
  {
    num: 43, name: 'Homonyms', category: 'WORD STUDY',
    what: 'Picture and word cards showing homophones (same sound, different spelling) and homographs (same spelling, different meaning).',
    contents: 'Homophone pairs: sea/see, to/two/too, their/there, etc. Homograph cards showing multiple meanings.',
    making: 'Create picture cards for homophones showing two meanings. Create cards explaining homophones. Laminate.',
    storage: 'Box with homophone pictures and explanation cards'
  }
];

console.log('Creating comprehensive Montessori Language Making Guide with AMS Presentation Instructions...');
console.log('Building document sections...');

// Build document sections
let sections = [];

// Title page
sections.push(
  new Paragraph({
    text: 'MONTESSORI LANGUAGE MAKING GUIDE',
    bold: true,
    font: 'Arial',
    size: 48,
    spacing: { before: 800, after: 400 },
    alignment: AlignmentType.CENTER
  }),
  new Paragraph({
    text: 'Complete Instructions for Making 43 Language Works',
    font: 'Arial',
    size: 28,
    spacing: { after: 200 },
    alignment: AlignmentType.CENTER
  }),
  new Paragraph({
    text: 'WITH AMS PRESENTATION GUIDELINES',
    bold: true,
    font: 'Arial',
    size: 24,
    spacing: { after: 600 },
    alignment: AlignmentType.CENTER,
    border: {
      top: {
        color: '000000',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 12
      }
    }
  }),
  new Paragraph({
    text: 'American Montessori Society Standard Presentation Instructions',
    italic: true,
    font: 'Arial',
    size: 20,
    spacing: { after: 800 },
    alignment: AlignmentType.CENTER
  }),
  new PageBreak()
);

// Table of Contents
sections.push(
  createHeading('TABLE OF CONTENTS', 1),
  new Paragraph({
    text: 'Master Shopping List....................................................................................4',
    font: 'Arial',
    size: 22,
    spacing: { line: 360 }
  }),
  new Paragraph({
    text: 'Category 1: Oral Language Development (Works 1-8).....................10',
    font: 'Arial',
    size: 22,
    spacing: { line: 360 }
  }),
  new Paragraph({
    text: 'Category 2: Writing Preparation (Works 9-15)................................28',
    font: 'Arial',
    size: 22,
    spacing: { line: 360 }
  }),
  new Paragraph({
    text: 'Category 3: Reading (Works 16-26)...................................................46',
    font: 'Arial',
    size: 22,
    spacing: { line: 360 }
  }),
  new Paragraph({
    text: 'Category 4: Grammar (Works 27-37)..................................................74',
    font: 'Arial',
    size: 22,
    spacing: { line: 360 }
  }),
  new Paragraph({
    text: 'Category 5: Word Study (Works 38-43)..............................................102',
    font: 'Arial',
    size: 22,
    spacing: { line: 360, after: 600 }
  }),
  new PageBreak()
);

// Shopping List section
sections.push(
  createHeading('MASTER SHOPPING LIST', 1),
  createSubsection('PAPER & CARD'),
  createBulletPoint('White cardstock 250gsm — 10 packs of 100 sheets'),
  createBulletPoint('Pink cardstock A4 — 2 packs of 50'),
  createBulletPoint('Blue cardstock A4 — 2 packs of 50'),
  createBulletPoint('Green cardstock A4 — 2 packs of 50'),
  createBulletPoint('Red cardstock A4 — 1 pack of 50'),
  createBulletPoint('Black cardstock A4 — 1 pack of 50'),
  createBulletPoint('Light blue cardstock A4 — 1 pack of 25'),
  createBulletPoint('Purple cardstock A4 — 1 pack of 25'),
  createBulletPoint('Orange cardstock A4 — 1 pack of 25'),
  createBulletPoint('Gold/yellow cardstock A4 — 1 pack of 25'),
  createBulletPoint('A5 booklet paper — 2 packs of 100'),
  createSubsection('LAMINATING'),
  createBulletPoint('Laminating pouches A4 125 micron — 5 boxes of 100'),
  createSubsection('WRITING MATERIALS'),
  createBulletPoint('Colored pencils quality set of 24'),
  createBulletPoint('HB pencils — box of 12'),
  createBulletPoint('Chalk white + colored'),
  createBulletPoint('Erasers — pack of 6'),
  createBulletPoint('Dry-erase markers — pack of 4'),
  createSubsection('CRAFT MATERIALS'),
  createBulletPoint('Fine sandpaper P220 — 5 sheets'),
  createBulletPoint('PVA glue'),
  createBulletPoint('Strong craft glue'),
  createBulletPoint('Ruler'),
  createBulletPoint('Elastic bands — pack of 100'),
  createSubsection('CONTAINERS & STORAGE'),
  createBulletPoint('Small baskets/trays — 30'),
  createBulletPoint('Drawstring bags — 26'),
  createBulletPoint('Wooden trays — 10'),
  createBulletPoint('Small boxes — 10'),
  createBulletPoint('Large envelopes — 10'),
  createSubsection('MINIATURE OBJECTS'),
  createBulletPoint('Safari Ltd TOOB sets: Farm, Wild Animals, Ocean Life, Insects, Transport (5 tubes)'),
  createBulletPoint('AliExpress miniature object sets (search "蒙特梭利迷你物品")'),
  createBulletPoint('Dollar store miniatures: household items, food items, tools'),
  createSubsection('SPECIALTY ITEMS (PURCHASE, DO NOT MAKE)'),
  createBulletPoint('Metal Inset set with 10 shapes (~$30-50 AliExpress "蒙特梭利金属嵌板")'),
  createBulletPoint('Moveable Alphabet set blue consonants/red vowels (~$15-25 AliExpress "蒙特梭利活动字母")'),
  createBulletPoint('Sand tray with colored sand'),
  createBulletPoint('Small chalkboard 30x40cm'),
  createBulletPoint('Felt board + felt pieces'),
  createSubsection('PRINTING'),
  createBulletPoint('Extra ink cartridges (black + color)'),
  createBulletPoint('Montessori font: Sassoon Primary, Century Gothic, or Andika (free)'),
  new Paragraph({ text: '', spacing: { after: 400 } }),
  new PageBreak()
);

console.log('Adding work details for all 43 works...');

// Add each work with complete information including AMS presentation
for (let work of works) {
  // Section header with work number and name
  sections.push(...createSectionHeader(work.num, work.name));
  
  // Category label
  sections.push(createParagraph(`Category: ${work.category}`, { spacing: { before: 100, after: 200 } }));
  
  // What It Is
  sections.push(createSubsection('WHAT IT IS'));
  sections.push(createParagraph(work.what));
  
  // Contents
  sections.push(createSubsection('EXACT CONTENTS'));
  sections.push(createParagraph(work.contents));
  
  // How to Make It
  sections.push(createSubsection('HOW TO MAKE IT'));
  sections.push(createParagraph(work.making));
  
  // AMS PRESENTATION (NEW SECTION - with distinct formatting)
  sections.push(new Paragraph({
    text: 'AMS PRESENTATION INSTRUCTIONS',
    bold: true,
    font: 'Arial',
    size: 22,
    spacing: { before: 300, after: 150 },
    indent: { left: 400 },
    shading: {
      type: ShadingType.CLEAR,
      color: 'F0F0F0'
    },
    border: {
      left: {
        color: '1F4E78',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 24
      }
    }
  }));
  
  sections.push(new Paragraph({
    text: presentationSteps[work.num],
    font: 'Arial',
    size: 22,
    spacing: { line: 400, after: 200 },
    indent: { left: 800 },
    alignment: AlignmentType.LEFT
  }));
  
  // Storage
  sections.push(createSubsection('STORAGE'));
  sections.push(createParagraph(work.storage, { spacing: { after: 400 } }));
  
  // Page break between works (except last one)
  if (work.num < 43) {
    sections.push(new PageBreak());
  }
}

console.log('Creating final document...');

// Create the document
const doc = new Document({
  sections: [{
    properties: {
      page: {
        pageWidth: 11906,
        pageHeight: 16838
      }
    },
    children: sections
  }]
});

// Write to file
const outputPath = '/Users/tredouxwillemse/Desktop/ACTIVE/whale/Montessori_Language_Making_Guide.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document created successfully: ${outputPath}`);
  
  // Copy to public/guides
  const publicPath = '/Users/tredouxwillemse/Desktop/ACTIVE/whale/public/guides/Montessori_Language_Making_Guide.docx';
  try {
    // Create directory if it doesn't exist
    const publicDir = '/Users/tredouxwillemse/Desktop/ACTIVE/whale/public/guides';
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.copyFileSync(outputPath, publicPath);
    console.log(`File copied to: ${publicPath}`);
  } catch (err) {
    console.log(`Note: Could not copy to public folder - ${err.message}`);
  }
  
  console.log('\n✓ COMPLETE: Montessori Language Making Guide upgraded successfully!');
  console.log(`Total works documented: 43`);
  console.log(`All works include: What It Is, Exact Contents, How to Make It, AMS Presentation Instructions, Storage`);
});
