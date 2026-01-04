'use client';

import { useState } from 'react';
import Link from 'next/link';

// ============================================
// TEACHING GUIDE DATA
// ============================================

const ENGLISH_GUIDE = [
  {
    id: 'oral',
    name: 'Oral Language',
    icon: '🗣️',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    ageRange: '2-3 years',
    overview: 'Building vocabulary through immersion. Children need 200-300 words before formal phonics begins.',
    skills: [
      {
        name: '100+ word vocabulary',
        howToTeach: [
          'Use the Three-Period Lesson: Hold object, say word clearly 2-3x ("Apple"), let child touch it',
          'Period 2 (longest): "Show me apple", "Put cup on my hand", "Bring ball to shelf"',
          'Period 3 (only when certain): Point and ask "What is this?"'
        ],
        materials: [
          { name: 'Vocabulary baskets (4-6 real objects per theme)', link: null },
          { name: 'Safari Ltd TOOBS / Schleich animals', link: null },
          { name: '3-Part Cards for vocabulary', link: '/admin/card-generator' }
        ],
        donts: [
          'Using too many words - say "Apple" not "This is a beautiful red apple"',
          'Testing before ready - Period 2 is where learning happens',
          'Correcting mistakes directly - note and re-teach later'
        ],
        readyWhen: 'Child can identify 20+ objects in Period 2 without hesitation',
        eslTip: 'Extend Period 2 significantly for Chinese learners. Accept pointing/nodding as valid responses.'
      },
      {
        name: 'Understands instructions',
        howToTeach: [
          'Start with single-step commands: "Stand up", "Clap hands", "Touch nose"',
          'Progress to two-step: "Pick up the ball AND put it on the shelf"',
          'Make it a game - Simon Says works perfectly'
        ],
        materials: [
          { name: 'Action cards with pictures', link: null },
          { name: 'Circle Time activities', link: '/admin/circle-planner' }
        ],
        donts: [
          'Giving complex multi-step instructions too early',
          'Speaking too fast - slow, clear speech',
          'Expecting verbal response - physical compliance is success'
        ],
        readyWhen: 'Child follows 2-step instructions consistently',
        eslTip: 'Use gestures WITH words initially. Gradually reduce gestures as comprehension grows.'
      },
      {
        name: 'Names common objects',
        howToTeach: [
          'Create themed vocabulary baskets: fruits, animals, vehicles, classroom items',
          'Three-Period Lesson with 3 objects at a time',
          'Label the environment - put word cards on real objects'
        ],
        materials: [
          { name: 'Vocabulary baskets with real objects', link: null },
          { name: 'Vocabulary Flashcards', link: '/admin/vocabulary-flashcards' },
          { name: '3-Part Cards', link: '/admin/card-generator' }
        ],
        donts: [
          'Teaching abstract words before concrete nouns',
          'Mixing too many categories at once',
          'Using inconsistent vocabulary (cup vs mug vs glass)'
        ],
        readyWhen: 'Child spontaneously names objects without prompting',
        eslTip: 'Start with objects that exist in both cultures. Food, animals, body parts are universal.'
      },
      {
        name: 'Participates in songs',
        howToTeach: [
          'Choose action songs: Head Shoulders Knees Toes, Wheels on Bus, If Youre Happy',
          'Model actions enthusiastically - dont expect singing initially',
          'Repeat same songs daily for weeks - repetition builds confidence'
        ],
        materials: [
          { name: 'Song Flashcards from YouTube', link: '/admin/flashcard-maker' },
          { name: 'Circle Time song list', link: '/admin/circle-planner' }
        ],
        donts: [
          'Introducing too many new songs at once',
          'Expecting solo singing - group singing only',
          'Skipping actions - movement aids memory'
        ],
        readyWhen: 'Child does actions and attempts words/phrases from songs',
        eslTip: 'Songs bypass language anxiety. A child who wont speak may sing happily in a group.'
      }
    ]
  },
  {
    id: 'sound',
    name: 'Sound Games',
    icon: '👂',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    ageRange: '3-4 years',
    overview: 'Training the ear to hear individual sounds. NO letters shown - purely auditory.',
    skills: [
      {
        name: 'Beginning sounds',
        howToTeach: [
          'Place 3 familiar objects on tray (mop, sun, fish)',
          'Say: "I spy something that begins with /m/" (use SOUND not letter name)',
          'When child points: "Yes! Mop begins with /m/. /m/-/m/-mop!"'
        ],
        materials: [
          { name: 'I Spy basket with 40+ small objects', link: null },
          { name: 'Objects sorted by initial sound in containers', link: null }
        ],
        donts: [
          'Showing any letters - this stage is purely auditory',
          'Using letter names ("em") instead of sounds (/m/)',
          'Adding "uh" to consonants - say /m/ not "muh"'
        ],
        readyWhen: 'Child identifies beginning sounds of 20+ words instantly',
        eslTip: 'Chinese has different initial sounds. Spend extra time on: TH, V, R, L, consonant blends.'
      },
      {
        name: 'Ending sounds',
        howToTeach: [
          'After mastering beginning sounds (several weeks), progress to endings',
          '"I spy something that ENDS with /t/" (cat, hat, mat)',
          'Then combine: "I spy something that begins with /c/ and ends with /t/"'
        ],
        materials: [
          { name: 'Same I Spy objects, now sorted by ending sound', link: null }
        ],
        donts: [
          'Starting ending sounds before beginning sounds are solid',
          'Using words with blends at endings yet (jump, best)'
        ],
        readyWhen: 'Child identifies ending sounds of CVC words accurately',
        eslTip: 'Chinese words dont end in consonant clusters. This is hard - be patient.'
      },
      {
        name: 'Middle sounds',
        howToTeach: [
          'Use CVC words only: cat, pen, sit, hot, cup',
          '"Listen to the MIDDLE sound: c-AAA-t. What sound is in the middle?"',
          'Stretch the vowel sound dramatically'
        ],
        materials: [
          { name: 'CVC picture cards sorted by vowel sound', link: null }
        ],
        donts: [
          'Using words with digraphs or blends',
          'Rushing - middle sounds are hardest to isolate'
        ],
        readyWhen: 'Child identifies the vowel sound in simple CVC words',
        eslTip: 'Short vowels are tricky. Use hand motions: /a/=jaw drops, /i/=smile, /o/=round lips.'
      },
      {
        name: 'Sound blending',
        howToTeach: [
          'Use "robot talk" or "snail talk" to stretch words: /s/..../u/..../n/',
          'Child guesses the word: "Sun!"',
          'Start with continuous sounds (s, m, f) before stops (t, p, k)'
        ],
        materials: [
          { name: 'Picture cards for blending games', link: null },
          { name: 'Phonics activities', link: '/admin/phonics-planner' }
        ],
        donts: [
          'Pausing too long between sounds - keep it flowing',
          'Starting with stop consonants which are harder to stretch'
        ],
        readyWhen: 'Child blends 3 sounds to form words consistently',
        eslTip: 'Blending is the key to reading. Practice daily with games, not drills.'
      },
      {
        name: 'Sound segmenting',
        howToTeach: [
          'Tap head-tummy-feet for each sound in "cat": /c/-/a/-/t/',
          'Use Elkonin boxes: push a chip into each box per sound',
          'Child says whole word, then breaks it apart'
        ],
        materials: [
          { name: 'Elkonin box mats (2-3-4 connected boxes)', link: null },
          { name: 'Chips or counters', link: null }
        ],
        donts: [
          'Using words with more than 3 sounds initially',
          'Accepting syllables instead of phonemes (ca-t instead of c-a-t)'
        ],
        readyWhen: 'Child segments 3-sound words into individual phonemes',
        eslTip: 'Segmenting prepares for spelling. Make it physical and fun.'
      }
    ]
  },
  {
    id: 'sandpaper',
    name: 'Sandpaper Letters',
    icon: '✋',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    ageRange: '4-5 years',
    overview: 'Connecting sounds to symbols through touch. Multi-sensory learning creates lasting memory.',
    skills: [
      {
        name: 'Traces letters correctly',
        howToTeach: [
          'Hold tile steady with left hand, trace with index+middle fingers of right hand',
          'Say the SOUND while tracing (not letter name): "/s/" not "ess"',
          'Trace 3 times, then child traces while you watch'
        ],
        materials: [
          { name: 'Sandpaper letters (consonants pink, vowels blue)', link: null },
          { name: 'Salt/sand tray for practice after tracing', link: null }
        ],
        donts: [
          'Allowing incorrect tracing direction - creates wrong muscle memory',
          'Teaching letter NAMES instead of SOUNDS',
          'Introducing similar letters together (b/d, m/n)'
        ],
        readyWhen: 'Child traces independently with correct formation',
        eslTip: 'Chinese children are used to careful stroke order. Use this strength!'
      },
      {
        name: 'Says sound after tracing',
        howToTeach: [
          'Always pair: trace AND say sound simultaneously',
          'After tracing, name 2-3 words with that sound: "/s/-/s/-sun, /s/-/s/-sock"',
          'Child traces and generates their own words'
        ],
        materials: [
          { name: 'Small objects starting with each letter sound', link: null }
        ],
        donts: [
          'Separating tracing from sound production',
          'Mispronouncing short vowels - practice: a=apple, e=egg, i=it, o=on, u=up'
        ],
        readyWhen: 'Child automatically says sound while tracing',
        eslTip: 'Focus on sounds not in Chinese: /v/, /θ/ (th), /ð/ (the), /r/ vs /l/.'
      },
      {
        name: 'Knows consonants',
        howToTeach: [
          'Introduce 3 contrasting letters per lesson (different shapes AND sounds)',
          'Good first set: s, m, a (two consonants + one vowel)',
          'Use Three-Period Lesson: name, recognize, recall'
        ],
        materials: [
          { name: 'Full set of lowercase sandpaper letters', link: null }
        ],
        donts: [
          'Teaching all consonants before any vowels',
          'Rushing - solidify 3-4 letters before adding more'
        ],
        readyWhen: 'Child recognizes 15+ consonant sounds reliably',
        eslTip: 'Prioritize high-frequency consonants: s, t, n, r, m, p, b, c, d, f, g, h.'
      },
      {
        name: 'Knows vowels',
        howToTeach: [
          'Introduce vowels on blue cards (consonants are pink)',
          'Teach SHORT vowel sounds first: a (apple), e (egg), i (it), o (octopus), u (umbrella)',
          'Vowels are tricky - spend more time here'
        ],
        materials: [
          { name: 'Vowel sandpaper letters on blue background', link: null },
          { name: 'Vowel sound picture cards', link: null }
        ],
        donts: [
          'Teaching long vowels before short vowels are solid',
          'Confusing short vowel sounds (e and i are very close)'
        ],
        readyWhen: 'Child distinguishes all 5 short vowel sounds',
        eslTip: 'Short vowels dont exist the same way in Chinese. Use mouth position cues.'
      },
      {
        name: 'Knows phonograms (sh, ch, th)',
        howToTeach: [
          'After single letters are solid, introduce digraphs',
          'Use green sandpaper letters for phonograms',
          'Explain: "When these two letters are together, they make ONE new sound"'
        ],
        materials: [
          { name: 'Phonogram sandpaper letters on green', link: null },
          { name: 'Phonogram reference chart', link: null }
        ],
        donts: [
          'Introducing phonograms before single letters are mastered',
          'Teaching too many phonograms at once - 1-2 per week'
        ],
        readyWhen: 'Child recognizes sh, ch, th as single sounds',
        eslTip: 'TH is very hard for Chinese speakers. Tongue between teeth! Practice: the, this, that, there.'
      }
    ]
  },
  {
    id: 'moveable',
    name: 'Moveable Alphabet',
    icon: '🔤',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    ageRange: '4-5 years',
    overview: 'Building words before writing. In Montessori, children WRITE before they READ.',
    skills: [
      {
        name: 'Builds CVC words',
        howToTeach: [
          'Place CVC object (toy cat) on mat. "Lets spell cat."',
          '"What sound does cat start with?" (/c/) - child finds letter',
          '"What sound is next?" (/a/) "Last sound?" (/t/) Point: "c-a-t... cat!"'
        ],
        materials: [
          { name: 'Large moveable alphabet (consonants red, vowels blue)', link: null },
          { name: 'CVC miniature objects (20-30)', link: null },
          { name: 'CVC picture cards', link: null }
        ],
        donts: [
          'Asking child to READ what they just spelled - keep writing and reading separate',
          'Using non-phonetic words (was, said)',
          'Correcting spelling immediately - accept phonetic attempts'
        ],
        readyWhen: 'Child builds CVC words independently with objects',
        eslTip: 'This is where reading clicks. Let them build LOTS of words without pressure to read.'
      },
      {
        name: 'Spells from objects',
        howToTeach: [
          'Start with real 3D objects the child can touch and name',
          'Child says word, segments sounds, finds letters',
          'Build 3-5 words per session, keep it short (10-15 min)'
        ],
        materials: [
          { name: 'CVC object baskets sorted by vowel sound', link: null }
        ],
        donts: [
          'Skipping the object stage - concrete before abstract',
          'Making sessions too long - end on success'
        ],
        readyWhen: 'Child spells object names without help segmenting',
        eslTip: 'Use objects familiar from both cultures - animals, food, household items.'
      },
      {
        name: 'Spells from pictures',
        howToTeach: [
          'Replace objects with picture cards',
          'Child names picture, segments sounds, builds word',
          'Use control cards on back for self-checking'
        ],
        materials: [
          { name: 'CVC picture cards with control', link: null },
          { name: 'Picture cards by vowel family', link: '/admin/material-generator' }
        ],
        donts: [
          'Jumping to pictures before objects are solid',
          'Using pictures of unfamiliar vocabulary'
        ],
        readyWhen: 'Child spells from pictures accurately and quickly',
        eslTip: 'Pictures are more abstract than objects. Make sure vocabulary is known.'
      },
      {
        name: 'Short phrases',
        howToTeach: [
          'After CVC words are solid, add simple phrases',
          '"the fat cat" - show how words combine',
          'Use moveable alphabet to build 2-3 word phrases'
        ],
        materials: [
          { name: 'Phrase cards with CVC words', link: null }
        ],
        donts: [
          'Adding phrases before single words are automatic',
          'Using complex sentence structures yet'
        ],
        readyWhen: 'Child builds simple phrases independently',
        eslTip: 'Articles (the, a, an) dont exist in Chinese. Teach them explicitly.'
      },
      {
        name: 'Simple sentences',
        howToTeach: [
          'Progress to full sentences: "The cat sat on the mat."',
          'Introduce capitals and periods',
          'Child builds, you write on paper for reference'
        ],
        materials: [
          { name: 'Sentence cards with CVC words', link: null },
          { name: 'Capital letter set', link: null }
        ],
        donts: [
          'Rushing to sentences before phrases are comfortable',
          'Forgetting punctuation concepts'
        ],
        readyWhen: 'Child builds complete sentences with capitals and periods',
        eslTip: 'Chinese has no capitals. Explain: "The first word and names get a BIG letter."'
      }
    ]
  },
  {
    id: 'pink',
    name: 'Pink Series (CVC)',
    icon: '📕',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    ageRange: '4-5 years',
    overview: 'Reading simple 3-letter words. The transition from spelling to reading.',
    skills: [
      {
        name: 'Short A words',
        howToTeach: [
          'Object-to-word matching: Place 5-8 objects (cat, hat, map, bag, pan)',
          'Sound out each word card slowly: "/c/..../a/..../t/... cat!"',
          'Child matches remaining word cards to objects'
        ],
        materials: [
          { name: 'Pink Object Box - Short A', link: null },
          { name: 'Pink Series materials', link: '/admin/material-generator' }
        ],
        donts: [
          'Mixing vowel sounds - master one before adding another',
          'Rushing through - extensive time at this level builds fluency'
        ],
        readyWhen: 'Child reads short A words fluently without sounding out',
        eslTip: 'Short A is a good starting vowel - its distinct and easy to hear.'
      },
      {
        name: 'Short E words',
        howToTeach: [
          'Same process: objects (pet, bed, hen, pen, net)',
          'Picture-to-word matching as objects become easy',
          'Word family sorting: -et, -en, -ed'
        ],
        materials: [
          { name: 'Pink Object Box - Short E', link: null },
          { name: 'Short E word lists', link: '/admin/material-generator' }
        ],
        donts: [
          'Confusing short E and short I - they sound similar',
          'Adding short E before short A is solid'
        ],
        readyWhen: 'Child distinguishes and reads short E words accurately',
        eslTip: 'Short E is close to short I. Use minimal pairs: pen/pin, bed/bid.'
      },
      {
        name: 'Short I words',
        howToTeach: [
          'Objects: pig, sit, fin, lip, kit',
          'Focus on the mouth position - smile for short I',
          'Compare to short E frequently'
        ],
        materials: [
          { name: 'Pink Object Box - Short I', link: null }
        ],
        donts: [
          'Blending short E and I words in same lesson initially'
        ],
        readyWhen: 'Child reads short I words and distinguishes from short E',
        eslTip: 'Use mirror to show mouth position difference between E and I.'
      },
      {
        name: 'Short O words',
        howToTeach: [
          'Objects: pot, dog, hot, mop, fox',
          'Round lips for short O - very distinct sound',
          'This is usually an easier vowel'
        ],
        materials: [
          { name: 'Pink Object Box - Short O', link: null }
        ],
        donts: [
          'Confusing short O with short U'
        ],
        readyWhen: 'Child reads short O words fluently',
        eslTip: 'Short O is fairly distinct. Good for building confidence.'
      },
      {
        name: 'Short U words',
        howToTeach: [
          'Objects: cup, sun, bug, nut, mud',
          'Jaw drops slightly, relaxed mouth',
          'Often confused with short O - compare directly'
        ],
        materials: [
          { name: 'Pink Object Box - Short U', link: null }
        ],
        donts: [
          'Rushing to Blue Series before all 5 vowels are solid'
        ],
        readyWhen: 'Child reads all 5 short vowel CVC words accurately',
        eslTip: 'Short U and short O sound similar. Use hand on throat to feel difference.'
      }
    ]
  },
  {
    id: 'blue',
    name: 'Blue Series (Blends)',
    icon: '📘',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    ageRange: '5-6 years',
    overview: 'Reading consonant clusters. Both sounds are heard (unlike digraphs).',
    skills: [
      {
        name: 'Beginning blends (bl, cr, st)',
        howToTeach: [
          'Take letters b and l. "This is /b/. This is /l/. Together: /bl/"',
          'Slide letters together physically while blending sound',
          'Build words: black, blue, blink, blend'
        ],
        materials: [
          { name: 'Blend cards showing individual blends', link: null },
          { name: 'Blue Series materials', link: '/admin/material-generator' }
        ],
        donts: [
          'Starting Blue before Pink is mastered',
          'Teaching too many blends at once - 1-2 per lesson max',
          'Breaking blend apart when reading - teach as unit'
        ],
        readyWhen: 'Child reads beginning blend words without hesitation',
        eslTip: 'Consonant clusters are VERY hard for Chinese speakers. Go slowly. bl-, br-, cl-, cr-, st-'
      },
      {
        name: 'Ending blends (nd, mp, lk)',
        howToTeach: [
          'Same approach but for word endings',
          'Words: hand, sand, camp, lamp, milk, silk',
          'Practice both beginning AND ending blends'
        ],
        materials: [
          { name: 'Blue Object Box - Ending Blends', link: null }
        ],
        donts: [
          'Focusing only on beginning blends',
          'Accepting dropped consonants (han instead of hand)'
        ],
        readyWhen: 'Child pronounces all consonants in ending blends',
        eslTip: 'Chinese has no final consonant clusters. Children may drop sounds. Practice clearly.'
      },
      {
        name: 'CCVC words',
        howToTeach: [
          'Words starting with blend + vowel + consonant',
          'Examples: stop, frog, clap, trip, slim',
          'Use moveable alphabet to build before reading'
        ],
        materials: [
          { name: 'CCVC word cards and objects', link: null }
        ],
        donts: [
          'Mixing CCVC and CVCC in same lesson initially'
        ],
        readyWhen: 'Child reads CCVC words fluently',
        eslTip: 'Build LOTS of CCVC words with moveable alphabet before reading them.'
      },
      {
        name: 'CVCC words',
        howToTeach: [
          'Words ending with consonant cluster',
          'Examples: best, milk, hand, lamp, task',
          'Focus on articulating the final cluster clearly'
        ],
        materials: [
          { name: 'CVCC word cards and objects', link: null }
        ],
        donts: [
          'Letting final consonants disappear in pronunciation'
        ],
        readyWhen: 'Child reads CVCC words with clear final blends',
        eslTip: 'Final blends are hardest. Exaggerate: "mil-K" not "mil". Practice daily.'
      }
    ]
  },
  {
    id: 'green',
    name: 'Green Series (Phonograms)',
    icon: '📗',
    color: '#10B981',
    bgColor: '#ECFDF5',
    ageRange: '5-6 years',
    overview: 'Vowel teams and digraphs. Multiple letters making one sound.',
    skills: [
      {
        name: 'ai/ay words',
        howToTeach: [
          'Introduce with green sandpaper phonogram: "ai says /ā/"',
          'ai usually in middle (rain, train), ay at end (play, day)',
          'Build words with moveable alphabet including phonogram tiles'
        ],
        materials: [
          { name: 'Green Phonogram Box - ai/ay', link: null },
          { name: 'Green Series materials', link: '/admin/material-generator' }
        ],
        donts: [
          'Teaching all long A spellings at once',
          'Forgetting to highlight phonogram in red on word cards'
        ],
        readyWhen: 'Child reads ai/ay words and knows position rule',
        eslTip: 'Long vowels are easier than short for Chinese speakers - more distinct sound.'
      },
      {
        name: 'ee/ea words',
        howToTeach: [
          'Both say /ē/ - "two e\'s say their name"',
          'ee: tree, bee, feet. ea: beach, read, bead',
          'Introduce as "family" - different spellings, same sound'
        ],
        materials: [
          { name: 'Green Phonogram Box - ee/ea', link: null }
        ],
        donts: [
          'Teaching ea before child knows ee is solid'
        ],
        readyWhen: 'Child reads long E words with both spellings',
        eslTip: 'This sound is clear. Good for building confidence with phonograms.'
      },
      {
        name: 'oa/ow words',
        howToTeach: [
          'Both can say /ō/: boat, road vs snow, grow',
          'ow is tricky - can say /ō/ (snow) or /ow/ (cow)',
          'Teach oa first as its consistent'
        ],
        materials: [
          { name: 'Green Phonogram Box - oa/ow', link: null }
        ],
        donts: [
          'Introducing both sounds of ow at once - confusing'
        ],
        readyWhen: 'Child reads oa words fluently, understands ow variation',
        eslTip: 'ow has two sounds - teach separately with lots of examples.'
      },
      {
        name: 'ou/ow words',
        howToTeach: [
          'The /ow/ sound as in "ouch": cloud, house, cow, now',
          'Compare to /ō/ sound ow words (snow vs cow)',
          'Use context and practice'
        ],
        materials: [
          { name: 'Green Phonogram Box - ou/ow (diphthong)', link: null }
        ],
        donts: [
          'Mixing /ō/ ow words and /ow/ ow words in same lesson'
        ],
        readyWhen: 'Child distinguishes ow sounds by context',
        eslTip: 'Diphthongs require mouth movement. Practice: /ow/ = ah-oo glide.'
      },
      {
        name: 'r-controlled vowels',
        howToTeach: [
          'Teach ar first (most consistent): car, star, farm',
          'Then or: corn, horse, for',
          'er/ir/ur together - all say same sound: her, bird, fur'
        ],
        materials: [
          { name: 'Green Phonogram Boxes - R-controlled', link: null }
        ],
        donts: [
          'Teaching er, ir, ur as different sounds - theyre the same',
          'Starting with er/ir/ur before ar and or'
        ],
        readyWhen: 'Child reads r-controlled words accurately',
        eslTip: 'R-controlled vowels are hard. The R changes the vowel completely. Practice ar words extensively.'
      }
    ]
  },
  {
    id: 'grammar',
    name: 'Grammar',
    icon: '📐',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    ageRange: '5-6 years',
    overview: 'Understanding language structure through symbols and movement.',
    skills: [
      {
        name: 'Nouns',
        howToTeach: [
          'Noun Hunt: "Everything has a name. This is cup. Whats its name?"',
          'Write word on slip, show black triangle: "Words that NAME things are NOUNS"',
          'Triangle is solid like a pyramid - stable, foundational'
        ],
        materials: [
          { name: 'Grammar symbol set (black triangle for nouns)', link: null },
          { name: 'Small objects for labeling', link: null }
        ],
        donts: [
          'Starting with abstract nouns - use concrete objects first',
          'Introducing multiple parts of speech at once'
        ],
        readyWhen: 'Child identifies nouns in environment and simple sentences',
        eslTip: 'Nouns work similarly in Chinese. This concept transfers well.'
      },
      {
        name: 'Verbs',
        howToTeach: [
          'Action game: Give red card with action word (jump, clap, run)',
          'Child reads silently, acts it out. Others guess.',
          'Red circle: "ACTION words are VERBS - round like sun, full of energy!"'
        ],
        materials: [
          { name: 'Red verb circles', link: null },
          { name: 'Action word cards', link: null }
        ],
        donts: [
          'Teaching verbs before nouns are solid',
          'Using only physical verbs - include think, see, hear'
        ],
        readyWhen: 'Child identifies action words and uses verb symbol',
        eslTip: 'Chinese verbs dont conjugate. English verb forms will need extra attention later.'
      },
      {
        name: 'Adjectives',
        howToTeach: [
          'Detective Game: Place 3 pencils (red, blue, green). Write "pencil"',
          'Child brings any pencil. "That IS a pencil, but not the one I wanted."',
          'Add "red pencil". Explain: "Red DESCRIBES which pencil - ADJECTIVE"'
        ],
        materials: [
          { name: 'Dark blue triangle for adjectives', link: null },
          { name: 'Sets of objects varying in color/size', link: null }
        ],
        donts: [
          'Introducing adjectives before nouns and verbs',
          'Skipping the "detective" discovery element'
        ],
        readyWhen: 'Child uses adjectives to specify and identifies them in sentences',
        eslTip: 'Chinese adjectives work differently in sentences. Focus on English word order.'
      },
      {
        name: 'Articles',
        howToTeach: [
          'Introduce as "noun helpers" - the, a, an',
          'Use small light blue triangle',
          'Farm Game: "the brown cow" vs "a cow"'
        ],
        materials: [
          { name: 'Light blue small triangle for articles', link: null }
        ],
        donts: [
          'Overexplaining a vs an rules early - focus on usage'
        ],
        readyWhen: 'Child naturally uses articles and identifies them',
        eslTip: 'Chinese has NO articles. This is a major challenge. Extensive practice needed. Use articles in every sentence you model.'
      },
      {
        name: 'Sentence structure',
        howToTeach: [
          'Farm Game with all parts: "The brown cow eats grass."',
          'Child builds sentence with word cards, places symbols above',
          'Introduce subject + verb + object structure'
        ],
        materials: [
          { name: 'Farm game set with animals and word cards', link: null },
          { name: 'Complete grammar symbol set', link: null }
        ],
        donts: [
          'Making it worksheet-based - grammar is hands-on with movement',
          'Forgetting to involve physical action'
        ],
        readyWhen: 'Child labels parts of speech in simple sentences',
        eslTip: 'Chinese word order differs (subject-time-manner-place vs English). Model correct order constantly.'
      }
    ]
  }
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function EnglishGuidePage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);

  const stage = ENGLISH_GUIDE.find(s => s.id === selectedStage);
  const skill = stage && selectedSkill !== null ? stage.skills[selectedSkill] : null;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📖</div>
              <div>
                <h1 className="text-2xl font-bold">English Teaching Guide</h1>
                <p className="text-indigo-100">Montessori Language Journey • How to Teach Each Skill</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Stage Selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Select Stage</h2>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {ENGLISH_GUIDE.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedStage(s.id); setSelectedSkill(null); }}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedStage === s.id
                    ? 'ring-4 ring-offset-2 scale-105'
                    : 'opacity-70 hover:opacity-100 hover:scale-102'
                }`}
                style={{
                  backgroundColor: s.bgColor,
                  ringColor: s.color
                }}
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs font-semibold truncate" style={{ color: s.color }}>
                  {s.name.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stage Overview & Skills */}
        {stage && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <div className="flex items-start gap-4 mb-4 pb-4 border-b" style={{ borderColor: stage.color }}>
              <div className="text-5xl">{stage.icon}</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold" style={{ color: stage.color }}>{stage.name}</h2>
                <p className="text-gray-500">{stage.ageRange}</p>
                <p className="text-gray-700 mt-2">{stage.overview}</p>
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Skills to Teach</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stage.skills.map((sk, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSkill(idx)}
                  className={`p-4 rounded-lg text-left transition-all ${
                    selectedSkill === idx
                      ? 'ring-2 ring-offset-1'
                      : 'hover:bg-gray-50'
                  }`}
                  style={{
                    backgroundColor: selectedSkill === idx ? stage.bgColor : 'transparent',
                    ringColor: stage.color
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white`}
                      style={{ backgroundColor: stage.color }}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-800">{sk.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skill Teaching Guide */}
        {skill && stage && (
          <div className="space-y-4">
            {/* How to Teach */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: stage.color }}>
                <span className="text-2xl">🎯</span> How to Teach: {skill.name}
              </h3>
              <ol className="space-y-3">
                {skill.howToTeach.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: stage.color }}>
                      {idx + 1}
                    </span>
                    <p className="text-gray-700 pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Materials */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-600">
                <span className="text-2xl">📦</span> Materials Needed
              </h3>
              <ul className="space-y-2">
                {skill.materials.map((mat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-amber-500">•</span>
                    {mat.link ? (
                      <Link href={mat.link} className="text-blue-600 hover:underline font-medium">
                        {mat.name} →
                      </Link>
                    ) : (
                      <span className="text-gray-700">{mat.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Don'ts */}
            <div className="bg-red-50 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
                <span className="text-2xl">🚫</span> Common Mistakes to Avoid
              </h3>
              <ul className="space-y-2">
                {skill.donts.map((dont, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">✗</span>
                    <span className="text-red-800">{dont}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ready When */}
            <div className="bg-green-50 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-green-600">
                <span className="text-2xl">✅</span> Ready for Next When...
              </h3>
              <p className="text-green-800 font-medium">{skill.readyWhen}</p>
            </div>

            {/* ESL Tip */}
            <div className="bg-blue-50 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-blue-600">
                <span className="text-2xl">🇨🇳</span> Chinese ESL Tip
              </h3>
              <p className="text-blue-800">{skill.eslTip}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedStage && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">👆</div>
            <h2 className="text-xl font-bold text-gray-700">Select a Stage Above</h2>
            <p className="text-gray-500 mt-2">Click any stage to see the skills and teaching guides</p>
          </div>
        )}
      </main>
    </div>
  );
}
