// lib/montree/guru/knowledge/sensitive-periods.ts
// Montessori sensitive period windows with age ranges, peak windows,
// observable behaviors, and curriculum alignment.
// Used to proactively alert parents when their child is in an active sensitive period.

export interface SensitivePeriod {
  name: string;
  /** Age range in months [start, end] */
  range: [number, number];
  /** Peak intensity window in months [start, end] */
  peak: [number, number];
  /** Observable behaviors parents might notice */
  behaviors: string[];
  /** What this sensitive period means developmentally */
  description: string;
  /** Montessori areas and works that channel this period */
  curriculumAlignment: string[];
  /** Home activities that don't require Montessori materials */
  homeActivities: string[];
}

export const SENSITIVE_PERIODS: Record<string, SensitivePeriod> = {
  order: {
    name: 'Order',
    range: [12, 42],
    peak: [18, 30],
    behaviors: [
      'Insists on routines and rituals (same cup, same seat, same bedtime sequence)',
      'Gets upset when things are out of place or routine changes',
      'Loves to line things up, sort, categorize',
      'Wants to put things "back where they belong"',
      'Melts down when plans change unexpectedly',
    ],
    description: 'The child is constructing an internal map of how the world works. Order isn\'t rigidity — it\'s the foundation for logical thinking, trust, and emotional security. This is why Montessori environments are meticulously ordered.',
    curriculumAlignment: [
      'Practical Life: All sorting and sequencing works',
      'Sensorial: Grading exercises (Pink Tower, Brown Stair, Red Rods)',
      'Practical Life: Table setting, food preparation (sequential steps)',
      'Any work with a clear beginning, middle, and end',
    ],
    homeActivities: [
      'Keep a consistent daily rhythm (not rigid schedule, but predictable flow)',
      'Let them help sort laundry, silverware, groceries',
      'Give everything a "home" — baskets, shelves, labeled spots',
      'Narrate transitions: "First we eat, then we brush teeth, then stories"',
    ],
  },
  language: {
    name: 'Language',
    range: [0, 72],
    peak: [24, 48],
    behaviors: [
      'Vocabulary explosion — learning multiple new words daily',
      'Loves being read to, asks for stories repeatedly',
      'Babbles constantly, narrates activities, asks "why?" incessantly',
      'Fascinated by letters, sounds, written words on signs',
      'Makes up stories, has imaginary conversations',
      'Corrects adult grammar or pronunciation',
    ],
    description: 'The absorbent mind is wired for language acquisition. A child in this period can effortlessly absorb vocabulary, grammar, and even multiple languages simultaneously. This window narrows significantly after age 6.',
    curriculumAlignment: [
      'Language: Sandpaper Letters, Moveable Alphabet, Metal Insets',
      'Language: Sound games (I Spy), rhyming, alliteration',
      'Language: Object boxes, classified cards, nomenclature cards',
      'Language: Storytelling, poetry, song',
      'Cultural: Geography nomenclature, science vocabulary',
    ],
    homeActivities: [
      'Read aloud daily — quality children\'s literature, not just sight words',
      'Name everything: "This is a spatula. Spa-tu-la."',
      'Play sound games during walks: "I spy something beginning with /s/"',
      'Let them "write" with finger in sand, shaving cream, salt trays',
      'Expose to rich vocabulary — don\'t simplify language for children',
    ],
  },
  movement: {
    name: 'Refined Movement',
    range: [12, 48],
    peak: [18, 36],
    behaviors: [
      'Wants to climb everything, jump, run, balance',
      'Practices the same physical skill over and over (pouring, opening/closing)',
      'Fascinated by small precise movements (turning knobs, threading, pinching)',
      'Gets frustrated when body can\'t do what mind wants',
      'Loves "real" activities — sweeping, scrubbing, carrying heavy things',
    ],
    description: 'The child is refining both gross motor (whole body) and fine motor (hands and fingers) control. Movement isn\'t separate from cognitive development — it IS cognitive development. The hand is the instrument of the mind.',
    curriculumAlignment: [
      'Practical Life: Pouring (wet and dry), transferring, spooning, tonging',
      'Practical Life: Buttoning, zipping, snapping, lacing frames',
      'Sensorial: Cylinder blocks (pincer grip), knobbed puzzles',
      'Practical Life: Scrubbing, sweeping, polishing (whole-body coordination)',
      'Art: Cutting with scissors, painting, clay work',
    ],
    homeActivities: [
      'Pouring water between cups (start with dry rice)',
      'Threading large beads or pasta onto string',
      'Playdough and clay for hand strength',
      'Real kitchen tasks: stirring, spreading, scooping',
      'Outdoor climbing, balancing on curbs, carrying heavy objects',
    ],
  },
  sensory: {
    name: 'Sensory Exploration',
    range: [0, 60],
    peak: [18, 36],
    behaviors: [
      'Touches everything, puts things in mouth (younger)',
      'Fascinated by textures, sounds, colors, smells',
      'Loves water play, sand play, messy activities',
      'Notices tiny details adults miss (a crack in the sidewalk, a leaf pattern)',
      'Strong reactions to sensory experiences (loves or hates certain textures/sounds)',
    ],
    description: 'The child is building a sensory vocabulary — the foundation for all abstract thinking. Math concepts (more/less, big/small) begin as sensory experiences. A child who has deeply explored "rough" and "smooth" can later understand gradation, comparison, and measurement.',
    curriculumAlignment: [
      'Sensorial: All grading materials (Pink Tower, Brown Stair, Color Tablets)',
      'Sensorial: Touch boards, fabric matching, thermic tablets',
      'Sensorial: Sound cylinders, bells, silence game',
      'Sensorial: Smelling bottles, tasting activities',
      'Practical Life: Food preparation (multi-sensory)',
    ],
    homeActivities: [
      'Sensory bins (rice, beans, water, sand with scoops and cups)',
      'Texture walks — collect leaves, stones, bark and compare',
      'Cooking together — smell spices, feel dough, taste ingredients',
      'Barefoot outdoor time on different surfaces',
      'Mystery bag games — identify objects by touch alone',
    ],
  },
  small_objects: {
    name: 'Small Objects',
    range: [12, 42],
    peak: [18, 30],
    behaviors: [
      'Fascinated by tiny things — ants, crumbs, buttons, pebbles',
      'Picks up the smallest items from the floor',
      'Collects tiny treasures (rocks, shells, beads)',
      'Points at small details in pictures and books',
      'Wants to hold and examine everything small',
    ],
    description: 'This drives refinement of the pincer grip and visual discrimination — prerequisites for writing and reading. The child isn\'t being "picky" — they\'re developing the fine motor control and visual attention needed for academic work later.',
    curriculumAlignment: [
      'Practical Life: Transferring with tweezers, tongs, droppers',
      'Sensorial: Cylinder blocks (precise pincer grip)',
      'Language: Sandpaper letters (tracing small shapes)',
      'Mathematics: Spindle Box, Cards & Counters (small objects to count)',
      'Practical Life: Treasure baskets with tiny interesting objects',
    ],
    homeActivities: [
      'Sorting small objects (buttons, beads, dried pasta shapes)',
      'Nature collection walks — tiny flowers, pebbles, seeds',
      'Tweezers and small bowls for transfer games',
      'Threading small beads onto string',
      'Magnifying glass exploration of insects, leaves, textures',
    ],
  },
  grace_courtesy: {
    name: 'Grace & Courtesy',
    range: [30, 72],
    peak: [36, 54],
    behaviors: [
      'Fascinated by social rules and manners ("You forgot to say please!")',
      'Wants to help, serve, take care of others',
      'Practices greetings, "excuse me", thank you rituals',
      'Gets upset when social rules are broken (by siblings or adults)',
      'Imitates adult social interactions',
    ],
    description: 'The child is constructing their social self — learning how to participate in community. This isn\'t about enforcing manners but about the child\'s genuine interest in social grace. They WANT to belong and contribute.',
    curriculumAlignment: [
      'Practical Life: Grace & Courtesy lessons (greeting, interrupting, serving food)',
      'Practical Life: Table setting, hosting, care of environment',
      'Cultural: Geography (other cultures and customs)',
      'Practical Life: Conflict resolution role-play',
    ],
    homeActivities: [
      'Model greetings, introductions, and polite requests',
      'Let them serve food to family members',
      'Practice phone conversations, door greetings',
      'Role-play social situations ("What would you do if...")',
      'Give real responsibility in hosting (setting table, greeting guests)',
    ],
  },
  writing: {
    name: 'Writing',
    range: [36, 54],
    peak: [42, 48],
    behaviors: [
      'Draws lines, circles, patterns spontaneously',
      'Asks how to write letters or their name',
      'Traces shapes with fingers on surfaces',
      'Makes lists of squiggles pretending to write',
      '"Explosion into writing" — sudden ability after preparation',
    ],
    description: 'In Montessori, writing comes BEFORE reading. The hand has been prepared through Practical Life and Sensorial work. When the sensitive period peaks, writing emerges almost spontaneously — the famous "explosion into writing."',
    curriculumAlignment: [
      'Language: Metal Insets (pencil control, pattern making)',
      'Language: Sandpaper Letters (letter formation + phonics simultaneously)',
      'Language: Moveable Alphabet (composing words before pencil control is perfect)',
      'Practical Life: All fine motor work (preparation for writing)',
      'Sensorial: Geometric shapes (spatial awareness for letter formation)',
    ],
    homeActivities: [
      'Sand tray for tracing letters (fill a baking tray with salt or sand)',
      'Chalk on pavement (large-scale letter practice)',
      'Playdough letter forming',
      'Metal Insets equivalent: trace shapes and fill with parallel lines',
      'Let them "write" shopping lists, letters to family, signs for their room',
    ],
  },
  reading: {
    name: 'Reading',
    range: [48, 66],
    peak: [54, 60],
    behaviors: [
      'Sounds out words on signs, packaging, books',
      'Recognizes familiar words ("That says STOP!")',
      'Asks "What does that say?" constantly',
      'Follows along while being read to',
      'Starts reading simple words or sentences independently',
    ],
    description: 'Reading typically follows writing in Montessori. The child has internalized letter sounds through Sandpaper Letters, composed words with the Moveable Alphabet, and now begins to decode — reading emerges as the natural next step, not as a forced skill.',
    curriculumAlignment: [
      'Language: Phonetic object boxes (CVC words)',
      'Language: Pink/Blue/Green series reading cards',
      'Language: Sentence strips, story cards',
      'Language: Grammar materials (farm game, noun/verb introduction)',
      'Cultural: Classified reading cards in all areas',
    ],
    homeActivities: [
      'Label objects around the house (DOOR, TABLE, CUP)',
      'Sound out words together during walks ("What sound does STOP start with?")',
      'Read simple books together — let them try words they can',
      'Word building with magnetic letters on the fridge',
      'Short daily reading time (10 minutes of focused phonics, not forced)',
    ],
  },
};

export interface ActiveSensitivePeriod {
  key: string;
  period: SensitivePeriod;
  status: 'active' | 'peak' | 'waning';
}

/**
 * Returns all sensitive periods that are active for a given age in months.
 * Each period has a status: 'peak' (in the peak window), 'active' (in range but not peak),
 * or 'waning' (in the final 20% of the range).
 */
export function getActiveSensitivePeriods(ageMonths: number): ActiveSensitivePeriod[] {
  const active: ActiveSensitivePeriod[] = [];

  for (const [key, period] of Object.entries(SENSITIVE_PERIODS)) {
    const [rangeStart, rangeEnd] = period.range;
    const [peakStart, peakEnd] = period.peak;

    if (ageMonths < rangeStart || ageMonths > rangeEnd) continue;

    let status: 'active' | 'peak' | 'waning';
    if (ageMonths >= peakStart && ageMonths <= peakEnd) {
      status = 'peak';
    } else if (ageMonths > peakEnd) {
      // Past peak — in waning phase
      status = 'waning';
    } else {
      status = 'active';
    }

    active.push({ key, period, status });
  }

  // Sort: peak first, then active, then waning
  const statusOrder = { peak: 0, active: 1, waning: 2 };
  active.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return active;
}

/**
 * Build a formatted string of active sensitive periods for injection into the Guru prompt.
 * Only includes peak and active periods (waning are mentioned briefly).
 */
export function formatSensitivePeriodsForPrompt(ageMonths: number): string {
  const periods = getActiveSensitivePeriods(ageMonths);
  if (periods.length === 0) return '';

  const ageYears = Math.floor(ageMonths / 12);
  const ageRemMonths = ageMonths % 12;

  let text = `\nACTIVE SENSITIVE PERIODS (child is ${ageYears}y ${ageRemMonths}m):\n`;
  text += 'Proactively mention these when relevant — parents are often unaware of sensitive period windows.\n\n';

  // Only inject peak and active periods into prompt — waning adds token bloat with minimal value
  for (const { period, status } of periods) {
    if (status === 'peak') {
      text += `${period.name} — AT PEAK: ${period.description}\n`;
      text += `   Signs: ${period.behaviors.slice(0, 3).join('; ')}\n`;
      text += `   Channel with: ${period.curriculumAlignment.slice(0, 2).join('; ')}\n`;
      text += `   At home: ${period.homeActivities.slice(0, 2).join('; ')}\n\n`;
    } else if (status === 'active') {
      text += `${period.name} — Active: ${period.behaviors[0]}. Channel with: ${period.curriculumAlignment[0]}\n\n`;
    }
    // Skip waning periods — saves ~100 tokens per waning period, minimal guidance value
  }

  return text;
}
