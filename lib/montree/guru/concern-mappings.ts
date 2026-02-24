// lib/montree/guru/concern-mappings.ts
// Maps parent concerns (worries) to Montessori work clusters + home activities
// Used by the Home Guru system to give personalized, worry-based guidance

export interface RelatedWork {
  name: string;       // Exact name from curriculum JSON
  area: string;       // practical_life | sensorial | language | mathematics | cultural
  why: string;        // Plain English — why this work helps with the concern
}

export interface HomeActivity {
  activity: string;   // What to do
  materials: string;  // Household items needed
  why: string;        // How it helps
}

export interface ConcernMapping {
  id: string;
  icon: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  developmentalContext: string;
  relatedWorks: RelatedWork[];
  homeActivities: HomeActivity[];
  redFlags: string[];
  normalRange: string;
}

export const CONCERN_MAPPINGS: ConcernMapping[] = [
  // ─────────────────────────────────────────────
  // 1. SPEECH & LANGUAGE
  // ─────────────────────────────────────────────
  {
    id: 'speech_delay',
    icon: '🗣️',
    title: 'Speech & Talking',
    shortDesc: "My child isn't talking much",
    fullDesc: "Worried about speech development, limited vocabulary, not combining words, or unclear pronunciation.",
    developmentalContext: "Receptive language (understanding) develops before expressive language (speaking). At 2, most children have ~50 words. By 3, they combine 2-3 words. Bilingual children may appear delayed but typically have normal combined vocabulary across languages. There's a wide range of normal.",
    relatedWorks: [
      { name: 'Vocabulary Enrichment', area: 'language', why: 'Builds word knowledge through real objects and experiences — the foundation of all speech' },
      { name: 'Classified Cards (Nomenclature Cards)', area: 'language', why: 'Pairs pictures with words, expanding vocabulary through visual association' },
      { name: 'Object to Picture Matching', area: 'language', why: 'Connects real objects to their images, strengthening word-object associations' },
      { name: 'Sound Games (I Spy)', area: 'language', why: "Trains the ear to notice individual sounds in words — builds phonemic awareness" },
      { name: 'Poems, Songs, and Fingerplays', area: 'language', why: 'Rhythm and repetition build neural pathways for speech production' },
      { name: 'Sound Boxes (Sound Cylinders)', area: 'sensorial', why: 'Sharpens auditory discrimination — hearing tiny differences between sounds' },
      { name: 'Washing Fruits and Vegetables', area: 'practical_life', why: 'Natural opportunity to narrate actions and name foods together' },
    ],
    homeActivities: [
      { activity: 'Object basket with 5 miniature animals — name them, sort them, play with them', materials: 'Small toy animals, basket', why: 'Three-period lesson builds vocabulary through repetition and touch' },
      { activity: 'Narrate everything during daily routines — cooking, dressing, walking', materials: 'Nothing needed', why: 'Children absorb language best from meaningful, contextual conversation' },
      { activity: 'Sing the same 3-4 songs every day', materials: 'Nothing needed', why: 'Repetition builds neural pathways — predictable lyrics let children fill in the gaps' },
      { activity: "Pause and wait when your child wants something — don't anticipate every need", materials: 'Patience', why: 'Creates natural motivation to communicate' },
      { activity: 'Read interactive books — point, ask "where\'s the ___?", make animal sounds', materials: 'Picture books', why: 'Back-and-forth interaction during reading builds conversational skills' },
    ],
    redFlags: [
      'Fewer than 50 words at age 2.5',
      'No two-word combinations by age 2.5',
      "Doesn't respond to their name consistently",
      'No pointing or gesturing by 18 months',
      "Can't follow simple instructions by age 2 (\"get your shoes\")",
      'Losing words they previously had',
    ],
    normalRange: 'At 2: ~50 words, starting to combine two words. At 3: 200-1000 words, short sentences. At 4: mostly understandable to strangers.',
  },

  // ─────────────────────────────────────────────
  // 2. WRITING READINESS
  // ─────────────────────────────────────────────
  {
    id: 'writing_readiness',
    icon: '✏️',
    title: 'Writing Readiness',
    shortDesc: "My child can't hold a pencil",
    fullDesc: "Concerned about pencil grip, hand strength, letter formation, or overall fine motor development for writing.",
    developmentalContext: "Writing readiness begins years before actual writing. The hand must be prepared through hundreds of hours of fine motor work. In Montessori, children often write before they read — but only when their hand is ready. Forcing pencil grip too early creates bad habits.",
    relatedWorks: [
      { name: 'Spooning', area: 'practical_life', why: 'Develops the three-finger grip — the same grip used to hold a pencil' },
      { name: 'Tonging', area: 'practical_life', why: 'Strengthens the small muscles in the hand needed for writing control' },
      { name: 'Tweezers Transfer', area: 'practical_life', why: 'Isolates the pincer grip — fine motor precision training' },
      { name: 'Threading Beads', area: 'practical_life', why: 'Eye-hand coordination and finger dexterity' },
      { name: 'Sewing Cards', area: 'practical_life', why: 'Controlled hand movements that follow a path — pre-writing patterns' },
      { name: 'Cylinder Block 1', area: 'sensorial', why: 'The knobs require the exact three-finger pincer grip used for writing' },
      { name: 'Geometric Cabinet', area: 'sensorial', why: 'Tracing shapes with fingers prepares the hand for letter formation' },
      { name: 'Metal Insets', area: 'language', why: 'Direct writing preparation — tracing and filling shapes builds pencil control' },
      { name: 'Sandpaper Letters', area: 'language', why: 'Tactile letter tracing — the hand learns letter shapes through muscle memory' },
      { name: 'Sand Tray Writing', area: 'language', why: 'Low-pressure writing practice — mistakes disappear with a shake' },
    ],
    homeActivities: [
      { activity: 'Play-dough play — rolling, pinching, squeezing, making snakes and balls', materials: 'Play-dough or salt dough (flour + salt + water)', why: 'Strengthens all the small hand muscles needed for pencil control' },
      { activity: 'Tear paper into small pieces and paste them to make a picture', materials: 'Old newspapers/magazines, glue stick, paper', why: 'Bilateral coordination + finger strength' },
      { activity: 'Pick up small objects with tweezers or chopsticks', materials: 'Kitchen tweezers, pom-poms or dried beans', why: 'Isolates the pincer grip muscles' },
      { activity: 'Draw letters/shapes in a tray of sand or salt', materials: 'Shallow tray, sand or salt', why: 'Practices letter formation with no pressure — mistakes shake away' },
      { activity: 'Trace shapes with finger before ever holding a pencil', materials: 'Cardboard shapes or cookie cutters', why: 'The hand needs to know the shape before the pencil can draw it' },
    ],
    redFlags: [
      'Significant difficulty with self-feeding by age 3',
      'Avoids all fine motor activities consistently',
      'Noticeable hand weakness or tremor',
      'Cannot stack 4+ blocks by age 2',
      'Cannot turn pages of a book by age 2.5',
    ],
    normalRange: 'At 2-3: scribbles with fist grip. At 3-4: starts tripod grip, draws circles. At 4-5: writes some letters, draws recognizable pictures.',
  },

  // ─────────────────────────────────────────────
  // 3. SOCIAL / SHARING
  // ─────────────────────────────────────────────
  {
    id: 'social_sharing',
    icon: '🤝',
    title: 'Sharing & Social Skills',
    shortDesc: "My child won't share",
    fullDesc: "Worried about sharing, taking turns, playing with others, or social interactions with peers.",
    developmentalContext: "True sharing — understanding another person's perspective — doesn't develop until age 4-5. At 2.5-3, parallel play (playing alongside, not with) is completely normal. What looks like selfishness is developmentally appropriate. Forcing sharing can actually backfire.",
    relatedWorks: [
      { name: 'Sharing and Taking Turns', area: 'practical_life', why: 'Practices the exact scripts for turn-taking in a safe, structured way' },
      { name: 'Greetings', area: 'practical_life', why: 'Social scripts reduce anxiety — knowing what to say makes interaction easier' },
      { name: 'Offering and Accepting Help', area: 'practical_life', why: 'Teaches reciprocity — the foundation of sharing' },
      { name: 'Setting the Table', area: 'practical_life', why: 'Serving others builds awareness of other people\'s needs' },
      { name: 'Making a Snack', area: 'practical_life', why: 'Group food preparation is naturally cooperative' },
      { name: 'Conversation and Discussion', area: 'language', why: 'Structured conversation practice — listening and responding' },
      { name: 'Storytelling and Sequencing', area: 'language', why: 'Stories about feelings help children understand others\' emotions' },
    ],
    homeActivities: [
      { activity: 'Model the language: "You\'re using the truck. When you\'re finished, your friend can have a turn"', materials: 'Nothing needed', why: 'Children learn social scripts by hearing them in context, not by being told to share' },
      { activity: 'Turn-taking games — rolling a ball back and forth, simple board games', materials: 'Ball, or any simple game', why: 'Structured turn-taking is easier than spontaneous sharing' },
      { activity: 'Acknowledge feelings: "It\'s hard to wait. You really want that toy."', materials: 'Nothing needed', why: 'Validation makes children feel understood, which reduces possessive behavior' },
      { activity: 'Set up playdates with just ONE other child', materials: 'A friend', why: 'One-on-one is much easier than group sharing — build confidence first' },
      { activity: 'Cook something together — each person has a job', materials: 'Simple recipe ingredients', why: 'Working toward a shared goal teaches cooperation naturally' },
    ],
    redFlags: [
      'No interest in other children at all by age 3',
      'Consistently aggressive toward all peers (not just occasional conflicts)',
      'No pretend play by age 3',
      'Avoids eye contact with adults and children',
      'No response to other children\'s emotions by age 4',
    ],
    normalRange: 'At 2-3: parallel play, possessive of toys. At 3-4: starts associative play, can take turns with help. At 4-5: cooperative play, understands sharing concept.',
  },

  // ─────────────────────────────────────────────
  // 4. MATH READINESS
  // ─────────────────────────────────────────────
  {
    id: 'math_readiness',
    icon: '🔢',
    title: 'Numbers & Math',
    shortDesc: 'My child seems behind in numbers',
    fullDesc: "Worried about counting, number recognition, understanding quantity, or overall math readiness.",
    developmentalContext: "Mathematical thinking starts with the senses, not with numbers. Before a child can understand '3', they need to experience 'more', 'less', 'same', 'bigger', 'smaller' through physical materials. Montessori builds math on a concrete foundation — abstract numbers come last.",
    relatedWorks: [
      { name: 'Pink Tower', area: 'sensorial', why: 'Builds understanding of size relationships — the sensorial foundation of quantity' },
      { name: 'Brown Stair (Broad Stair)', area: 'sensorial', why: 'Discrimination of dimension — understanding "more" and "less" through touch' },
      { name: 'Red Rods (Long Rods)', area: 'sensorial', why: 'Direct preparation for the Number Rods — same lengths, but with quantity' },
      { name: 'Knobless Cylinders', area: 'sensorial', why: 'Seriation — putting things in order, which is the basis of counting' },
      { name: 'Number Rods', area: 'mathematics', why: 'First introduction to quantity 1-10 with physical length' },
      { name: 'Sandpaper Numerals', area: 'mathematics', why: 'Learning to write and recognize number symbols through touch' },
      { name: 'Spindle Boxes', area: 'mathematics', why: 'Introduces zero and reinforces 1:1 counting with loose objects' },
      { name: 'Cards and Counters', area: 'mathematics', why: 'Connects number symbols to quantities and introduces odd/even' },
      { name: 'Setting the Table', area: 'practical_life', why: 'One plate per person = 1:1 correspondence — real-world math' },
    ],
    homeActivities: [
      { activity: 'Count everything naturally — stairs, fruit, toes, cars on the road', materials: 'Nothing needed', why: 'Counting in context makes numbers meaningful, not abstract' },
      { activity: 'Sort objects by size, color, or type', materials: 'Buttons, pasta shapes, toy animals', why: 'Sorting is classification — a pre-math skill more important than counting' },
      { activity: 'Set the table together — one fork for each person', materials: 'Plates, utensils', why: '1:1 correspondence is the foundation of understanding quantity' },
      { activity: 'Build towers and compare — which is taller? shorter? the same?', materials: 'Blocks, boxes, anything stackable', why: 'Size comparison is how children first understand mathematical relationships' },
      { activity: 'Play "give me" games — "Can you give me 3 grapes?"', materials: 'Small food items or toys', why: 'Connecting number words to real quantities' },
    ],
    redFlags: [
      'Cannot count to 3 with objects by age 3.5',
      'No understanding of "more" vs "less" by age 3',
      'Cannot sort by one attribute (color OR size) by age 3',
      'No interest in counting or number games by age 4',
    ],
    normalRange: 'At 2-3: can say some numbers, may not count accurately. At 3-4: counts to 10, understands "more". At 4-5: counts objects accurately to 10+, recognizes some numerals.',
  },

  // ─────────────────────────────────────────────
  // 5. CONCENTRATION / SITTING STILL
  // ─────────────────────────────────────────────
  {
    id: 'concentration',
    icon: '🎯',
    title: 'Focus & Sitting Still',
    shortDesc: "My child can't sit still",
    fullDesc: "Worried about attention span, inability to focus, constant movement, or difficulty completing activities.",
    developmentalContext: "At 2.5, concentration spans of 3-5 minutes on a CHOSEN activity are completely normal. Montessori doesn't expect children to sit still — it builds concentration through the work cycle. Concentration is a RESULT of engaging work, not a prerequisite. The child who can't sit still hasn't found their work yet.",
    relatedWorks: [
      { name: 'Pouring Water', area: 'practical_life', why: 'Deeply satisfying and repeatable — the sound of water is naturally calming' },
      { name: 'Sponging', area: 'practical_life', why: 'Rhythmic, meditative movement that naturally focuses attention' },
      { name: 'Table Scrubbing', area: 'practical_life', why: 'Multi-step process that holds attention through purposeful, visible results' },
      { name: 'Wood Polishing', area: 'practical_life', why: 'The transformation (dull to shiny) is deeply satisfying and motivating' },
      { name: 'Walking on the Line', area: 'practical_life', why: 'Builds body awareness and self-regulation through controlled movement' },
      { name: 'The Silence Game', area: 'practical_life', why: 'Teaches self-regulation and inner calm — powerful concentration builder' },
      { name: 'Pink Tower', area: 'sensorial', why: 'Build, admire, dismantle, repeat — the repetition cycle IS concentration' },
      { name: 'Color Box 1 (Primary Colors)', area: 'sensorial', why: 'Simple matching that gives immediate success — builds confidence to focus longer' },
    ],
    homeActivities: [
      { activity: 'Reduce toys — put out only 4-5 activities on a low shelf, rotate weekly', materials: 'Low shelf or table, fewer toys', why: 'Fewer choices = deeper engagement. Too many options causes scattered attention' },
      { activity: 'When your child is focused on something, do NOT interrupt — not even to praise', materials: 'Self-restraint', why: 'Interrupting concentration (even positively) breaks the flow state children need to develop' },
      { activity: 'Set up a water pouring station — two small jugs and a tray', materials: 'Two small pitchers, tray, towel', why: 'Water work is mesmerizing. Children will repeat it 20+ times, building concentration naturally' },
      { activity: 'Reduce screen time — replace with hands-on activities', materials: 'Nothing needed', why: 'Screens train rapid attention switching — the opposite of the sustained focus you want' },
      { activity: 'Unstructured outdoor time — let them explore without direction', materials: 'Nature', why: 'Nature exploration builds sustained attention without any adult agenda' },
    ],
    redFlags: [
      'Cannot focus on ANY preferred activity for even 1-2 minutes by age 3',
      'Constant, uncontrollable movement that seems involuntary',
      'Extreme difficulty with transitions (meltdowns every time)',
      'Cannot follow a simple 2-step instruction by age 3',
      'Significantly more active/impulsive than same-age peers in ALL settings',
    ],
    normalRange: 'At 2-3: 3-5 minutes on chosen activity. At 3-4: 5-15 minutes. At 4-5: 15-30 minutes on engaging work. These are for CHOSEN activities — forced activities will always be shorter.',
  },

  // ─────────────────────────────────────────────
  // 6. BITING / HITTING
  // ─────────────────────────────────────────────
  {
    id: 'biting_hitting',
    icon: '😤',
    title: 'Biting & Hitting',
    shortDesc: 'My child bites or hits others',
    fullDesc: "Dealing with biting, hitting, pushing, or other physically aggressive behavior toward siblings or peers.",
    developmentalContext: "Biting peaks between 18-30 months. It's almost never true aggression — it's communication frustration (can't find words fast enough), sensory seeking (oral input), overwhelm (too much stimulation), or experimentation (what happens when I do this?). It's one of the most common and most distressing toddler behaviors for parents.",
    relatedWorks: [
      { name: 'Greetings', area: 'practical_life', why: 'Rehearsing social scripts gives children words to use instead of actions' },
      { name: 'Apologizing', area: 'practical_life', why: 'Learning repair after conflict — not as punishment, but as caring for others' },
      { name: 'Saying Excuse Me', area: 'practical_life', why: 'Gives words for frustrating situations like needing to get past someone' },
      { name: 'Cutting Soft Foods', area: 'practical_life', why: 'Appropriate biting/chewing redirects oral seeking behavior' },
      { name: 'Spreading', area: 'practical_life', why: 'Purposeful hand work channels physical energy into productive activity' },
      { name: 'Vocabulary Enrichment', area: 'language', why: 'More words = less frustration = less biting. Language IS the solution' },
      { name: 'Touch Boards', area: 'sensorial', why: 'Meets sensory needs appropriately — heavy tactile input without hurting anyone' },
    ],
    homeActivities: [
      { activity: 'Give language for feelings BEFORE they escalate — "I can see you\'re getting frustrated"', materials: 'Nothing needed', why: 'Children bite when they run out of words. Naming the feeling gives them the word' },
      { activity: 'Offer appropriate things to bite — crunchy carrots, apple slices, chewy foods', materials: 'Crunchy/chewy foods', why: 'If it\'s oral seeking, redirect the need — don\'t suppress it' },
      { activity: 'Keep responses calm and brief: "I won\'t let you bite. Biting hurts."', materials: 'Calm voice', why: 'Big reactions reinforce the behavior. Brief, firm, neutral responses work best' },
      { activity: 'Observe triggers — is it always when tired? hungry? crowded? overstimulated?', materials: 'A notebook', why: 'Most biting has a pattern. Find the pattern, prevent the trigger' },
      { activity: 'Play gentle touch games — stroking arms, "gentle hands" practice', materials: 'Nothing needed', why: 'Teaches appropriate physical contact as a replacement behavior' },
    ],
    redFlags: [
      'Biting/hitting increases after age 3 instead of decreasing',
      'Targets the same child repeatedly',
      'Appears to enjoy causing pain',
      'No remorse or recognition of others\' distress',
      'Biting/hitting happens with no apparent trigger or frustration',
    ],
    normalRange: 'At 1-2: biting/hitting common during frustration. At 2-3: decreasing as language improves. At 3-4: should be rare, with verbal expression replacing physical. At 4+: should be very uncommon.',
  },

  // ─────────────────────────────────────────────
  // 7. READING READINESS
  // ─────────────────────────────────────────────
  {
    id: 'reading_readiness',
    icon: '📖',
    title: 'Reading Readiness',
    shortDesc: 'Is my child ready for reading?',
    fullDesc: "Wondering when reading will happen, whether your child is behind, or how to support reading development without pushing.",
    developmentalContext: "In Montessori, the 'explosion into reading' happens naturally when the foundation is ready — typically between ages 4.5-5.5. Children need three things first: they can hear individual sounds in words (phonemic awareness), they know letter sounds (not names), and they can blend sounds together. Pushing reading before these foundations are solid creates frustration, not readers.",
    relatedWorks: [
      { name: 'Sound Games (I Spy)', area: 'language', why: 'THE foundation — can they hear the first sound in "cat"? This must come before any reading' },
      { name: 'Sandpaper Letters', area: 'language', why: 'Learns letter SOUNDS (not names) through touch — multi-sensory memory' },
      { name: 'Moveable Alphabet', area: 'language', why: 'Building words with letters — writing comes before reading in Montessori' },
      { name: 'Object Boxes (Pink/Blue/Green)', area: 'language', why: 'Matching real objects to written labels — first real reading' },
      { name: 'Pink Series (CVC Words)', area: 'language', why: 'First independent reading — simple three-letter words (cat, dog, sun)' },
      { name: 'Rhyming Activities', area: 'language', why: 'Hearing word patterns trains the ear for reading' },
      { name: 'Geometric Cabinet', area: 'sensorial', why: 'Visual discrimination of shapes prepares pattern recognition for letter shapes' },
      { name: 'Color Box 3 (Color Gradations)', area: 'sensorial', why: 'Fine visual discrimination — noticing small differences (like b vs d)' },
    ],
    homeActivities: [
      { activity: 'Play "I spy" with BEGINNING SOUNDS — "I spy something that starts with /c/" (the sound, not the letter name)', materials: 'Objects around the house', why: 'Phonemic awareness is THE predictor of reading success. Letter names come later' },
      { activity: 'Point out environmental print — stop signs, cereal boxes, their name on their door', materials: 'The world around you', why: 'Shows reading has real-world purpose and meaning' },
      { activity: 'Read together every day — trace words with your finger occasionally', materials: 'Books', why: 'Daily reading builds vocabulary, comprehension, and the desire to read independently' },
      { activity: "Don't push — the explosion into reading happens naturally when the foundation is ready", materials: 'Patience', why: 'Premature pressure creates reading anxiety, not readers. Trust the process' },
      { activity: 'Label objects in the house with written words', materials: 'Index cards, marker', why: 'Surrounds the child with print in meaningful context' },
    ],
    redFlags: [
      "Can't hear rhymes by age 4",
      "Can't identify the first sound in a word by age 4.5",
      'Difficulty remembering letter sounds after repeated exposure',
      'Family history of dyslexia (warrants earlier screening)',
      "Avoids all letter/word activities by age 5",
    ],
    normalRange: 'At 3-4: recognizes own name, knows some letter sounds. At 4-5: blending sounds, reading simple CVC words. At 5-6: reading short sentences. Wide range of normal — some read at 4, others at 7.',
  },

  // ─────────────────────────────────────────────
  // 8. SHYNESS
  // ─────────────────────────────────────────────
  {
    id: 'shyness',
    icon: '🫣',
    title: 'Shyness & Participation',
    shortDesc: "My child won't participate in groups",
    fullDesc: "Concerned about reluctance to join group activities, clinging to parents, not talking to other adults, or seeming withdrawn.",
    developmentalContext: "Temperament is inborn — some children are naturally cautious observers. This is not a problem to fix. In Montessori, observation IS participation. The child watching from the side is learning just as much as the child in the middle. Shyness becomes a concern only when it prevents the child from engaging in activities they want to do.",
    relatedWorks: [
      { name: 'Greetings', area: 'practical_life', why: 'Rehearsing social scripts reduces anxiety — knowing what to say makes interaction easier' },
      { name: 'Introductions', area: 'practical_life', why: 'Practiced, predictable interaction patterns feel safe for cautious children' },
      { name: 'Poems, Songs, and Fingerplays', area: 'language', why: 'Singing together is low-pressure social participation — everyone does it at once' },
      { name: 'Conversation and Discussion', area: 'language', why: 'Small group conversation practice in a safe, structured setting' },
      { name: 'Walking on the Line', area: 'practical_life', why: 'Group activity where everyone does their own thing — social but not interactive' },
      { name: 'Flower Arranging', area: 'practical_life', why: 'Individual, calming work that builds confidence and sense of accomplishment' },
    ],
    homeActivities: [
      { activity: 'Respect the temperament — observation IS participation. Don\'t force them into groups', materials: 'Nothing needed', why: 'Pushing a shy child into the spotlight increases anxiety, not confidence' },
      { activity: 'Prepare them for social situations: "We\'re going to the park. There will be other children. You can watch first."', materials: 'Nothing needed', why: 'Predictability reduces anxiety. Knowing what to expect makes new situations manageable' },
      { activity: 'Don\'t label — say "she likes to watch first" instead of "she\'s shy"', materials: 'Mindful language', why: 'Labels become self-fulfilling prophecies. Descriptions empower, labels limit' },
      { activity: 'Playdates with ONE child at a time', materials: 'A friend', why: 'One-on-one is much less overwhelming than group settings. Build confidence gradually' },
      { activity: 'Role-play social situations at home with stuffed animals', materials: 'Stuffed animals or dolls', why: 'Practice in a safe setting builds confidence for real-world situations' },
    ],
    redFlags: [
      'Complete withdrawal from all social interaction by age 4',
      'Mutism in all settings outside home (selective mutism)',
      'Extreme distress that doesn\'t improve with gentle exposure over months',
      'No interest in watching other children play by age 3',
      'Regression — was social, then withdrew',
    ],
    normalRange: 'At 2-3: clinging to parent in new settings is normal. At 3-4: warming up period then joins. At 4-5: may be quiet but engaged. Some children are naturally introverted — this is temperament, not a problem.',
  },

  // ─────────────────────────────────────────────
  // 9. PICKY EATING
  // ─────────────────────────────────────────────
  {
    id: 'picky_eating',
    icon: '🍽️',
    title: 'Picky Eating',
    shortDesc: "My child won't eat",
    fullDesc: "Frustrated by food refusal, limited diet, mealtime battles, or worry about nutrition.",
    developmentalContext: "Neophobia (fear of new foods) peaks between ages 2-6. It's an evolutionary survival mechanism — toddlers who wandered and ate unknown berries didn't survive. It's also about autonomy — food is one of the few things toddlers can control. Montessori's answer: involve them in preparation. Children who prepare food eat food.",
    relatedWorks: [
      { name: 'Washing Fruits and Vegetables', area: 'practical_life', why: 'Touching, smelling, and handling food IS exposure — even without eating it' },
      { name: 'Cutting Soft Foods', area: 'practical_life', why: 'Preparing food gives ownership — "I made this" is the best motivation to taste it' },
      { name: 'Spreading', area: 'practical_life', why: 'Simple food preparation that gives autonomy and sensory exposure' },
      { name: 'Peeling - Easy Items', area: 'practical_life', why: 'Hands-on food work — the more they touch food, the more comfortable they become' },
      { name: 'Grating', area: 'practical_life', why: 'Multi-sensory food prep — seeing cheese transform from block to shreds is fascinating' },
      { name: 'Making a Snack', area: 'practical_life', why: 'Full food preparation cycle — the child controls the whole process' },
      { name: 'Smelling Bottles', area: 'sensorial', why: 'Expanding sensory comfort zone — accepting new smells prepares for new tastes' },
      { name: 'Tasting Bottles/Cups', area: 'sensorial', why: 'Structured taste exploration in a no-pressure, scientific context' },
    ],
    homeActivities: [
      { activity: 'Involve them in cooking — even just washing vegetables or stirring', materials: 'Whatever you\'re cooking', why: 'Children who help prepare food are significantly more likely to eat it' },
      { activity: 'Serve food family-style — let them serve themselves from shared dishes', materials: 'Serving spoons, small bowls', why: 'Autonomy over their plate reduces power struggles' },
      { activity: 'Offer, don\'t force. "It\'s here when you\'re ready."', materials: 'Nothing needed', why: 'Pressure backfires. Relaxed exposure works. Average is 15-20 exposures before acceptance' },
      { activity: 'Grow something — even herbs on a windowsill', materials: 'Seeds, small pot, soil', why: 'Children who grow food develop a relationship with it beyond "eat this"' },
      { activity: 'Play with food (yes, really) — sort by color, stack, make patterns', materials: 'Various foods', why: 'Comfortable handling precedes comfortable eating. Let them explore with no eating pressure' },
    ],
    redFlags: [
      'Eating fewer than 10 foods total',
      'Losing weight or falling off growth curve',
      'Gagging or vomiting on most textures',
      'Extreme distress around mealtimes consistently',
      'Only accepting one food group (e.g., only carbs)',
    ],
    normalRange: 'At 2-3: food refusal is PEAK normal. At 3-4: still selective but broadening. At 4-6: gradually accepting more variety. Most children grow out of picky eating by school age.',
  },

  // ─────────────────────────────────────────────
  // 10. INDEPENDENCE
  // ─────────────────────────────────────────────
  {
    id: 'independence',
    icon: '💪',
    title: 'Independence',
    shortDesc: "My child won't do things alone",
    fullDesc: "Frustrated that your child wants you to do everything, resists doing things independently, or cries when asked to try.",
    developmentalContext: "\"Help me to do it myself\" — this is THE core Montessori principle. Independence isn't about leaving children alone — it's about preparing the environment so they CAN succeed alone. If a child won't do things independently, the usual reason is the environment isn't set up for their success, or they've been helped too much too soon.",
    relatedWorks: [
      { name: 'Pouring Dry Materials', area: 'practical_life', why: 'Simple, satisfying, repeatable — builds the "I can do it" feeling' },
      { name: 'Pouring Water', area: 'practical_life', why: 'More challenging than dry — mastering this gives enormous confidence' },
      { name: 'Velcro Frame', area: 'practical_life', why: 'First dressing frame — success is almost guaranteed, building independence momentum' },
      { name: 'Large Buttons Frame', area: 'practical_life', why: 'Practicing the exact skill needed to dress themselves' },
      { name: 'Hand Washing', area: 'practical_life', why: 'Complete self-care routine they can own entirely' },
      { name: 'Dressing Oneself', area: 'practical_life', why: 'The ultimate independence milestone — "I got dressed by myself!"' },
      { name: 'Dish Washing', area: 'practical_life', why: 'Real contribution to the household — independence through meaningful work' },
      { name: 'Plant Care', area: 'practical_life', why: 'Responsibility for a living thing — independence with purpose' },
    ],
    homeActivities: [
      { activity: 'Set up the environment: hooks at child height, step stool at sink, snacks in a low drawer', materials: 'Low hooks, step stool, child-accessible storage', why: 'If they can\'t reach it, they can\'t do it independently. The environment is the teacher' },
      { activity: 'Slow down and let them struggle (within reason) — the effort IS the learning', materials: 'Patience', why: 'Every time you do it for them because "it\'s faster," you take away a learning opportunity' },
      { activity: 'Break tasks into steps — demonstrate slowly, one step at a time', materials: 'Nothing needed', why: 'A whole task feels impossible. One step at a time feels achievable' },
      { activity: 'Give them real responsibility — watering a plant, feeding a pet, setting their place at the table', materials: 'Real household items (child-sized if possible)', why: 'Real tasks build real confidence. Pretend tasks build pretend confidence' },
      { activity: 'Let them choose — clothes, snack, activity — even if the choice isn\'t what you\'d pick', materials: 'Options to choose from', why: 'Choice is the foundation of independence. Start small, expand gradually' },
    ],
    redFlags: [
      'Complete refusal to attempt any new task by age 3.5',
      'Extreme anxiety when separated from caregiver beyond age 3',
      'No interest in doing anything themselves by age 3',
      'Skills regression — could do it before, now refuses',
      'Inability to do basic self-care tasks (eating, toileting) independently by age 4',
    ],
    normalRange: 'At 2: wants to do everything themselves (but can\'t yet). At 3: can do many self-care tasks with setup. At 4: mostly independent in routines. At 5: can manage multi-step tasks.',
  },
];

// ─────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────

export function getConcernById(id: string): ConcernMapping | undefined {
  return CONCERN_MAPPINGS.find(c => c.id === id);
}

export function getAllConcerns(): ConcernMapping[] {
  return CONCERN_MAPPINGS;
}

export function getConcernWorkNames(id: string): string[] {
  const concern = getConcernById(id);
  if (!concern) return [];
  return concern.relatedWorks.map(w => w.name);
}
