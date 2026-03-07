// lib/montree/guru/knowledge/esl-chinese-learners.ts
// ESL awareness for L1 Mandarin Chinese children learning English
// Injected into Guru prompts so advice accounts for bilingual acquisition reality.
// This is school-level knowledge — ALL children at Beijing schools are L1 Chinese.

/**
 * Phonological interference map: Mandarin → English
 * Shows which English sounds are hard, which are easy, and why.
 */
export const MANDARIN_PHONOLOGICAL_MAP = {
  // Sounds that DO NOT EXIST in Mandarin — genuinely difficult
  difficult_sounds: [
    { sound: '/θ/ (th as in "think")', why: 'No dental fricative in Mandarin. Children say /s/ or /f/ instead.', example: '"fink" for "think", "free" for "three"' },
    { sound: '/ð/ (th as in "the")', why: 'Voiced dental fricative absent. Children say /d/ or /z/.', example: '"da" for "the", "dis" for "this"' },
    { sound: '/v/', why: 'No /v/ in Mandarin (has /w/ and /f/ but not /v/). Children say /w/ or /f/.', example: '"wery" for "very", "fiolet" for "violet"' },
    { sound: '/ɹ/ (English r)', why: 'Mandarin has a retroflex /ʐ/ that sounds similar but is produced differently. Children may use Mandarin r or /l/.', example: '"led" for "red", confusion between r/l' },
    { sound: 'Final consonant clusters (-nk, -st, -mp, -nd)', why: 'Mandarin syllables are almost always open (CV). Final clusters are genuinely foreign.', example: '"han" for "hand", "mil" for "milk", "sen" for "sent"' },
    { sound: 'Final consonants in general (-t, -d, -g, -k, -p, -b)', why: 'Mandarin only allows /n/ and /ŋ/ as final consonants. Dropping final stops is L1 transfer, NOT laziness.', example: '"ca" for "cat", "do" for "dog", "cu" for "cup"' },
    { sound: 'Initial consonant clusters (bl, cl, fl, gr, str)', why: 'Mandarin has NO consonant clusters at all. Every syllable starts with at most one consonant.', example: '"belack" for "black" (inserting vowel to break cluster)' },
  ],

  // Sounds that ARE shared — leverage these FIRST in Sound Games / Sandpaper Letters
  shared_sounds: [
    { sound: '/m/', note: 'Identical in both languages. Strong starting point.' },
    { sound: '/n/', note: 'Identical. Very reliable.' },
    { sound: '/s/', note: 'Mandarin has /s/. Good early Sound Game sound.' },
    { sound: '/f/', note: 'Mandarin has /f/. Reliable.' },
    { sound: '/l/ (initial)', note: 'Mandarin has /l/. Strong in initial position.' },
    { sound: '/p/', note: 'Mandarin has aspirated /pʰ/ and unaspirated /p/. Close enough.' },
    { sound: '/t/', note: 'Same aspiration pattern as /p/. Initial /t/ is fine.' },
    { sound: '/k/', note: 'Same pattern. Initial /k/ works well.' },
    { sound: '/h/', note: 'Mandarin has /x/ (velar fricative) which is close enough.' },
    { sound: '/ʃ/ (sh)', note: 'Mandarin has /ʂ/ (retroflex). Very close — children hear this.' },
    { sound: '/tʃ/ (ch)', note: 'Mandarin has /tʂ/. Close match.' },
  ],

  // Suprasegmental transfer effects
  prosody_transfer: [
    'Mandarin is a TONE language — children may impose rising/falling tones on English words',
    'English stress timing feels unnatural to Mandarin ears (Mandarin is syllable-timed)',
    'Weak syllables in English ("the", "a", "to") may be given full stress by Chinese learners',
    'Question intonation (rising pitch at end) may conflict with Mandarin tone 2 (also rising)',
  ],
};

/**
 * What L1 Chinese children BRING as strengths (not just deficits).
 * The Guru should highlight these to teachers — they are real advantages.
 */
export const L1_TRANSFER_ADVANTAGES = [
  {
    advantage: 'Superior pitch discrimination',
    explanation: 'Tonal language speakers can distinguish pitch differences that monolingual English speakers cannot. This is a genuine cognitive advantage for music, phonemic awareness, and emotional prosody detection.',
  },
  {
    advantage: 'Strong visual memory for whole-word shapes',
    explanation: 'Chinese character recognition requires memorising thousands of distinct visual patterns. This transfers to whole-word recognition and sight word learning in English.',
  },
  {
    advantage: 'Excellent fine motor control from character writing',
    explanation: 'Chinese stroke order discipline develops precise pencil control earlier than many Western children. Metal Insets and handwriting preparation may progress faster.',
  },
  {
    advantage: 'Natural morphological awareness',
    explanation: 'Chinese characters use radicals (components that carry meaning). Children intuitively understand that word parts carry meaning — this transfers directly to prefix/suffix/compound word understanding.',
  },
  {
    advantage: 'Bilingual cognitive advantages',
    explanation: 'Bilingual children develop stronger executive function (attention control, task switching, working memory). These cognitive benefits persist throughout life.',
  },
  {
    advantage: 'Code-switching competence',
    explanation: 'When a child switches between Mandarin and English mid-sentence, this is NOT confusion — it is a sophisticated linguistic skill showing metalinguistic awareness. Never discourage it.',
  },
];

/**
 * ESL acquisition phases — by MONTHS OF ENGLISH EXPOSURE, not age.
 * A 3-year-old in month 1 of ESL is fundamentally different from a 3-year-old in month 12.
 */
export const ESL_ACQUISITION_PHASES = [
  {
    phase: 'Silent Period',
    months: '0-6 months of English exposure',
    description: 'Child listens intently but produces minimal English. This is NORMAL and PRODUCTIVE — the child is building a massive receptive vocabulary. They are not "behind" or "refusing to speak."',
    observable: [
      'Follows simple English instructions correctly (proving comprehension)',
      'Responds with gestures, pointing, nodding — these are VALID communication',
      'May whisper-practice English sounds when alone',
      'Watches English-speaking peers intently (social learning)',
      'May speak freely in Mandarin but go silent when English is expected',
    ],
    teacher_action: [
      'Do NOT pressure speech production — it will come naturally',
      'Narrate constantly: "I see you are picking up the red block. That is a RED BLOCK."',
      'Accept ANY response form (gesture, single word, Mandarin, drawing)',
      'Continue Sound Games — listening IS participating',
      'Celebrate comprehension: "You found the cup! You heard me!"',
    ],
  },
  {
    phase: 'Early Speech Emergence',
    months: '6-12 months of English exposure',
    description: 'Child begins producing English — formulaic phrases, single words, two-word combinations. Heavy code-switching with Mandarin is expected and healthy.',
    observable: [
      'Uses memorised phrases: "I want", "Teacher, look!", "Can I?"',
      'Labels familiar objects in English',
      'Mixes Mandarin grammar with English words (e.g., word order from Mandarin)',
      'May avoid complex sentences, sticking to safe formulas',
      'Pronunciation reflects Mandarin phonology (expected L1 transfer)',
    ],
    teacher_action: [
      'Model correct English without correcting the child\'s speech',
      'Expand utterances: Child says "red." → Teacher: "Yes, that is a big red ball!"',
      'Sound Games levels 1-3 are perfect for this phase',
      'Begin Sandpaper Letters with shared sounds (/m/, /s/, /f/, /l/)',
      'Object Boxes with familiar, highly visual objects work well',
    ],
  },
  {
    phase: 'Speech Emergence',
    months: '12-24 months of English exposure',
    description: 'Child produces sentences. Mandarin grammar patterns may appear in English (e.g., topic-comment structure, missing articles). This is NORMAL L1 transfer.',
    observable: [
      'Full sentences with some grammatical errors reflecting Mandarin patterns',
      'Missing articles ("I go school" — Mandarin has no articles)',
      'Tense confusion ("Yesterday I go" — Mandarin does not conjugate verbs)',
      'Asking questions with statement word order + rising tone (Mandarin pattern)',
      'Growing confidence in English social interaction',
    ],
    teacher_action: [
      'Pink Series (CVC) should be achievable — focus on final consonants (hardest part)',
      'Moveable Alphabet: expect creative phonetic spelling reflecting Mandarin phonology',
      'Grammar works: noun/article introduction is ESPECIALLY important (Mandarin has no articles)',
      'Read-aloud sessions build English sentence patterns implicitly',
      'Three-Period Lesson works perfectly — the structure supports L2 acquisition',
    ],
  },
  {
    phase: 'Intermediate Fluency',
    months: '24-36+ months of English exposure',
    description: 'Near-age-appropriate English in most social contexts. Academic language still developing. May still struggle with English-specific sounds (/θ/, /v/, clusters).',
    observable: [
      'Participates fully in English classroom activities',
      'May still have accent/pronunciation differences (normal, not a concern)',
      'Written English developing — spelling may reflect pronunciation patterns',
      'Can express complex ideas in English',
      'Some academic vocabulary gaps compared to native English peers',
    ],
    teacher_action: [
      'Blue Series (blends) is the main challenge — consonant clusters genuinely hard',
      'Grammar Boxes provide structured practice that helps L2 patterns become automatic',
      'Creative Writing: celebrate content over form — the IDEAS matter more than perfect grammar',
      'Word Study works are powerful because morphological awareness transfers from Chinese',
      'Continue valuing bilingual identity — Mandarin is an asset, not an obstacle',
    ],
  },
];

/**
 * Common misdiagnoses teachers make with ESL children.
 * The Guru MUST correct these when they come up.
 */
export const ESL_MISDIAGNOSIS_WARNINGS = [
  {
    teacher_concern: 'This child won\'t speak / is very quiet / seems withdrawn',
    likely_reality: 'Silent period (0-6 months ESL). Completely normal. The child is actively processing English. Receptive vocabulary is building. DO NOT refer for speech therapy based on this alone.',
    red_flag_only_if: 'Child is also silent in Mandarin, or has been exposed to English for 12+ months with zero production.',
  },
  {
    teacher_concern: 'This child can\'t hear the difference between sounds',
    likely_reality: 'L1 phonological filter. Mandarin does not distinguish /θ/ from /s/, /v/ from /w/, /l/ from /r/ in the same way. The child\'s ears are trained for Mandarin contrasts. Retrainable with consistent exposure — NOT a hearing or processing issue.',
    red_flag_only_if: 'Child also struggles to hear Mandarin tone distinctions, or there is a family history of hearing loss.',
  },
  {
    teacher_concern: 'This child keeps mixing Chinese and English / can\'t keep languages separate',
    likely_reality: 'Code-switching is a sign of bilingual COMPETENCE, not confusion. The child is using whichever language best expresses their thought. This is linguistically sophisticated.',
    red_flag_only_if: 'Never a red flag. All bilinguals code-switch. Attempting to suppress it harms bilingual development.',
  },
  {
    teacher_concern: 'This child is behind in reading compared to English-speaking peers',
    likely_reality: 'Different L1 literacy timeline. Chinese children may be literate in Chinese characters while still learning English phonics. They are NOT "behind" — they are bilingual. English reading will catch up once phonemic awareness in English is established.',
    red_flag_only_if: 'Child struggles with reading in BOTH languages after 2+ years of dual exposure.',
  },
  {
    teacher_concern: 'This child drops the ends of words / says "ca" for "cat"',
    likely_reality: 'Mandarin syllable structure transfer. Mandarin only allows /n/ and /ŋ/ as final consonants. Dropping final stops (/t/, /d/, /k/, /p/) is a predictable L1 pattern, NOT articulation disorder.',
    red_flag_only_if: 'Child also drops final consonants in Mandarin (which would only be /n/ or /ŋ/).',
  },
  {
    teacher_concern: 'This child adds extra vowels between consonants ("belack" for "black")',
    likely_reality: 'Epenthesis — inserting vowels to break consonant clusters. Mandarin has NO consonant clusters, so the child\'s motor plan inserts a vowel to make the word match Mandarin syllable structure. Trainable with practice — not a speech issue.',
    red_flag_only_if: 'Never a red flag on its own for L1 Chinese speakers.',
  },
];

/**
 * AMI-specific adaptations for L1 Chinese learners.
 * These map directly to works in the 43-work progression.
 */
export const AMI_ESL_ADAPTATIONS: Record<string, string> = {
  'Sound Games': 'FOR L1 CHINESE: Start Sound Games with shared sounds: /m/, /s/, /f/, /l/, /n/, /p/, /t/, /k/. These exist in Mandarin and the child can hear them clearly. Defer /θ/ (th), /ð/ (the), /v/ until the child is confident with shared sounds. /r/ vs /l/ distinction needs extra time — use minimal pairs (red/led, right/light) with exaggerated mouth position. Final sounds (Level 2) are GENUINELY HARD because Mandarin drops final stops — do Level 2 with /n/ and /m/ endings first (these exist in Mandarin), then add /t/, /d/, /k/, /p/ finals.',

  'Sandpaper Letters': 'FOR L1 CHINESE: The child has EXCELLENT fine motor from Chinese character writing — leverage this. Stroke-order discipline transfers directly. Group 1 (c, m, a, t) works well because /m/ and /t/ are Mandarin-shared. When introducing /r/ (Group 5), spend extra time distinguishing from /l/. ADVANTAGE: Chinese children are used to associating symbols with sounds (character → meaning) so the sound-symbol connection of Sandpaper Letters feels natural.',

  'Moveable Alphabet': 'FOR L1 CHINESE: Expect phonetically creative spelling that reflects Mandarin phonology: missing final consonants ("ca" for "cat"), vowel insertions in clusters ("belue" for "blue"), /θ/ written as "s" or "f". These are CORRECT phonological transfer — the child IS encoding what they hear through their Mandarin filter. Do NOT correct as errors. The spellings will self-correct as English phonological awareness develops.',

  'Pink Series': 'FOR L1 CHINESE: CVC words are the first real challenge because final consonants barely exist in Mandarin. Start with words ending in /n/ (pen, can, sun) — this final consonant exists in Mandarin. Then /m/ finals (jam, drum). THEN introduce final stops /t/ (cat, hot), /d/ (bed, red), /p/ (cup, cap), /g/ (dog, pig), /k/ (back). The child needs to HEAR and PRODUCE these finals — it is a genuine motor skill they are building, not just a reading skill.',

  'Blue Series': 'FOR L1 CHINESE: Consonant blends are the HARDEST thing about English for Chinese L1 speakers because Mandarin has ZERO consonant clusters. Start with L-blends (bl, cl, fl) where /l/ is familiar, then S-blends (st, sp, sn), then R-blends (br, cr, tr) last because /r/ itself is still being acquired. Expect epenthesis ("belue" for "blue") — this is normal and will reduce with practice. Triple blends (str, spr) are very advanced for ESL learners.',

  'Three-Period Lesson': 'FOR L1 CHINESE: Period 2 (recognition) may need LONGER than for native English speakers — the child is learning both the concept AND the English word simultaneously. This is double the cognitive load. Be patient. Also: the child may know the concept in Mandarin but not English — always check if the "failure" is a language gap, not a knowledge gap.',

  'Object Boxes': 'FOR L1 CHINESE: Use objects the child knows well and can name in Mandarin first. The abstraction (word label → 3D object) works best when the CONCEPT is familiar even if the English WORD is new. For Pink Object Box, favour words ending in /n/ initially (pen, sun, can) over final stops (cat, dog, cup).',

  'Command Cards': 'FOR L1 CHINESE: Start with single-word action commands using verbs the child KNOWS orally. "Run." "Hop." "Sit." — these are safe CVC words. Multi-word commands should avoid articles initially ("Get cup" before "Get a cup") because articles are the hardest grammatical concept for Mandarin speakers (Mandarin has no articles at all).',
};

/**
 * Build the ESL awareness context block for prompt injection.
 * This is the main export used by conversational-prompt.ts.
 */
export function getESLAwarenessForPrompt(childAgeMonths?: number): string {
  const parts: string[] = [];

  parts.push('🌏 BILINGUAL CLASSROOM CONTEXT — L1 MANDARIN CHINESE CHILDREN');
  parts.push('');
  parts.push('These children speak Mandarin Chinese as their first language and are learning English as a second language. This fundamentally changes how you interpret their behavior, speech, and progress.');
  parts.push('');

  // Core principle
  parts.push('CORE PRINCIPLE: Every "error" has a reason. When a Chinese child says "I go school yesterday" or drops the end of "cat", these are PREDICTABLE L1 transfer patterns, NOT deficits. Your job is to understand WHY and guide accordingly.');
  parts.push('');

  // Phonological awareness
  parts.push('MANDARIN → ENGLISH PHONOLOGY:');
  parts.push('• Sounds these children CAN hear/produce: /m/, /n/, /s/, /f/, /l/, /p/, /t/, /k/, /h/, /sh/, /ch/ — START Sound Games here');
  parts.push('• Sounds that are GENUINELY HARD: /θ/ (th), /ð/ (the), /v/, English /r/, ALL final consonant clusters');
  parts.push('• Final consonants dropped: Mandarin only allows /n/ and /ŋ/ at end of syllable. "ca" for "cat" is L1 transfer.');
  parts.push('• Consonant clusters: Mandarin has ZERO clusters. "belack" for "black" (vowel insertion) is normal.');
  parts.push('• /r/ vs /l/: Mandarin does not distinguish these the same way. Needs targeted practice with minimal pairs.');
  parts.push('');

  // Strengths
  parts.push('L1 STRENGTHS TO LEVERAGE:');
  parts.push('• Pitch discrimination (from tonal language) — superior to monolingual English children');
  parts.push('• Visual memory for whole-word shapes (from Chinese character recognition)');
  parts.push('• Fine motor control (from stroke-order character writing) — Metal Insets may progress fast');
  parts.push('• Morphological awareness (radicals in Chinese = prefixes/suffixes in English)');
  parts.push('• Code-switching is bilingual COMPETENCE, never discourage it');
  parts.push('');

  // Misdiagnosis warnings
  parts.push('⚠️ DO NOT MISDIAGNOSE:');
  parts.push('• "Won\'t speak" → likely Silent Period (normal 0-6 months ESL). NOT speech delay.');
  parts.push('• "Can\'t hear sounds" → L1 phonological filter. Trainable. NOT hearing issue.');
  parts.push('• "Mixing languages" → code-switching = bilingual competence. NEVER discourage.');
  parts.push('• "Behind in reading" → different L1 literacy timeline. May read Chinese already.');
  parts.push('• "Drops word endings" → Mandarin syllable structure. NOT articulation disorder.');
  parts.push('');

  // Grammar patterns
  parts.push('EXPECTED MANDARIN GRAMMAR PATTERNS IN ENGLISH:');
  parts.push('• Missing articles: "I go school" (Mandarin has no articles — a/an/the are the HARDEST thing to learn)');
  parts.push('• No verb conjugation: "Yesterday I go" (Mandarin does not change verb forms for tense)');
  parts.push('• Topic-comment structure: "This book, I like" instead of "I like this book"');
  parts.push('• Question formation: statement + rising tone, instead of English inversion ("You like this?" not "Do you like this?")');
  parts.push('• Plural confusion: "many book" (Mandarin does not mark plural on nouns)');

  return parts.join('\n');
}

/**
 * Get ESL-specific notes for a particular AMI language work.
 * Returns the adaptation note if one exists, or null.
 */
export function getESLNoteForWork(workName: string): string | null {
  // Try exact match first, then partial match
  if (AMI_ESL_ADAPTATIONS[workName]) {
    return AMI_ESL_ADAPTATIONS[workName];
  }
  // Partial match
  const lower = workName.toLowerCase();
  for (const [key, note] of Object.entries(AMI_ESL_ADAPTATIONS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return note;
    }
  }
  return null;
}
