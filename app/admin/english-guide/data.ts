// ============================================
// TEACHING GUIDE DATA
// ============================================

export const ENGLISH_GUIDE = [
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
          { name: 'Vocabulary baskets (4-6 real objects per theme)', link: null, tip: 'Use small wicker baskets from Daiso/Miniso. Label each basket. Start with: Animals, Food, Classroom, Home.' },
          { name: 'Safari Ltd TOOBS / Schleich animals', link: null, tip: 'Taobao search: 仿真动物模型. Get farm animals first, then wild animals, then ocean.' },
          { name: '3-Part Cards for vocabulary', link: '/admin/card-generator', tip: 'Print matching cards for objects you have. Use for Period 2 practice at home.' }
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
          { name: 'Action cards with pictures', link: null, tip: 'Make simple cards: stick figure doing action + word. Laminate for durability. 20 cards is enough.' },
          { name: 'Circle Time activities', link: '/admin/circle-planner', tip: 'Use Simon Says daily. Start with body parts: touch head, clap hands, stamp feet.' }
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
          { name: 'Vocabulary baskets with real objects', link: null, tip: 'Real > toy. Use actual spoon, cup, sock. Children learn better from authentic items.' },
          { name: 'Vocabulary Flashcards', link: '/admin/vocabulary-flashcards', tip: 'Use real photos, not cartoons. Match flashcard to actual object in basket.' },
          { name: '3-Part Cards', link: '/admin/card-generator', tip: 'Print on cardstock 200gsm+. Cut precisely. Store in small envelopes by category.' }
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
          { name: 'Song Flashcards from YouTube', link: '/admin/flashcard-maker', tip: 'Screenshot key moments from Super Simple Songs. Print A5 size for circle time.' },
          { name: 'Circle Time song list', link: '/admin/circle-planner', tip: 'Start with 5 songs only. Add one new song per week. Repetition is key.' }
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
          { name: 'I Spy basket with 40+ small objects', link: null, tip: 'Collect miniatures: eraser, clip, coin, shell, rock, button, key, ring. Taobao: 微型小物件. Sort by initial sound into ziplock bags.' },
          { name: 'Objects sorted by initial sound in containers', link: null, tip: 'Use small containers or bags. Label with the SOUND not letter. Start with: /s/, /m/, /a/, /t/, /p/.' }
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
          { name: 'Same I Spy objects, now sorted by ending sound', link: null, tip: 'Re-sort your existing objects by END sound. Group: things ending in /t/, /p/, /n/, etc.' }
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
          { name: 'CVC picture cards sorted by vowel sound', link: null, tip: 'Make 5 piles: short-a words, short-e, short-i, short-o, short-u. Use real photos or simple drawings.' }
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
          { name: 'Picture cards for blending games', link: null, tip: 'Print CVC word pictures. Show picture face-down, say sounds slowly, child guesses before reveal.' },
          { name: 'Phonics activities', link: '/admin/phonics-planner', tip: 'Daily 5-min blending practice. Use puppet to speak in "robot voice" - children love it.' }
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
          { name: 'Elkonin box mats (2-3-4 connected boxes)', link: null, tip: 'Print on A4, laminate. Draw 3 connected boxes. Child pushes chip into each box per sound.' },
          { name: 'Chips or counters', link: null, tip: 'Use anything: buttons, coins, pom-poms, small erasers. Get 10-20 identical items per child.' }
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
          { name: 'Sandpaper letters (consonants pink, vowels blue)', link: null, tip: 'Taobao: 砂纸字母. DIY: cut sandpaper, glue to painted wood tiles 10x12cm. Pink for consonants, blue for vowels.' },
          { name: 'Salt/sand tray for practice after tracing', link: null, tip: 'Shallow wooden tray with 1cm fine sand or salt. Child traces letter in sand after sandpaper. Shake to erase.' }
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
          { name: 'Small objects starting with each letter sound', link: null, tip: 'One small object per letter sound. Store in compartment box. /s/=sun, /m/=monkey, /a/=apple, etc.' }
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
          { name: 'Full set of lowercase sandpaper letters', link: null, tip: 'Buy complete set or DIY. Teaching order: s,m,a,t → p,i,n → c,o,d → b,f,g → h,j,k,l → r,u,v,w → x,y,z,q.' }
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
          { name: 'Vowel sandpaper letters on blue background', link: null, tip: 'Make vowels stand out - blue tiles are essential. Larger size helps distinguish from consonants.' },
          { name: 'Vowel sound picture cards', link: null, tip: 'Key pictures: a=apple, e=egg, i=igloo, o=octopus, u=umbrella. Same picture every time for consistency.' }
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
          { name: 'Phonogram sandpaper letters on green', link: null, tip: 'Green tiles for digraphs. Start with: sh, ch, th, ck. Both letters on ONE tile - they make ONE sound.' },
          { name: 'Phonogram reference chart', link: null, tip: 'Wall chart showing all phonograms with key picture. Child can reference during word building.' }
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
          { name: 'Large moveable alphabet (consonants red, vowels blue)', link: null, tip: 'Taobao: 蒙氏字母. Get LARGE size 5cm+ letters. Multiple sets of vowels needed - you use a,e,i,o,u constantly.' },
          { name: 'CVC miniature objects (20-30)', link: null, tip: 'Tiny objects for each CVC word: cat, dog, pen, cup, etc. Dollar store miniatures work great.' },
          { name: 'CVC picture cards', link: null, tip: 'Real photos on cards. Use after objects. Keep word on back for control of error.' }
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
          { name: 'CVC object baskets sorted by vowel sound', link: null, tip: '5 baskets labeled: short-a, short-e, etc. Each basket has 5-8 tiny objects with that vowel sound.' }
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
          { name: 'CVC picture cards with control', link: null, tip: 'Picture on front, word on back. Child builds word, flips to check. Self-correcting builds independence.' },
          { name: 'Picture cards by vowel family', link: '/admin/material-generator', tip: 'Generate cards grouped by vowel. Start with short-a family: cat, hat, bat, map, etc.' }
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
          { name: 'Phrase cards with CVC words', link: null, tip: 'Simple 2-3 word phrases: "the cat", "a red hat", "big dog". All decodable words only.' }
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
          { name: 'Sentence cards with CVC words', link: null, tip: 'Full sentences using only CVC words: "The cat sat on the mat." Keep sight words minimal (the, on, is).' },
          { name: 'Capital letter set', link: null, tip: 'Separate capitals in same red/blue colors. Teach: sentence start + names get capitals.' }
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
          { name: 'Pink Object Box - Short A', link: null, tip: 'Small box with 8+ miniatures for short-a: cat, hat, bat, rat, map, bag, van, pan, can, jam.' },
          { name: 'Pink Series materials', link: '/admin/material-generator', tip: 'Print: object cards, word cards, picture-word matching. Laminate everything - these get heavy use.' }
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
          { name: 'Pink Object Box - Short E', link: null, tip: 'Short-e miniatures: bed, pen, hen, jet, net, web, leg, peg, egg (toy), red (object).' },
          { name: 'Short E word lists', link: '/admin/material-generator', tip: 'Word families: -et (pet, wet, jet), -en (pen, hen, ten), -ed (bed, red, led).' }
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
          { name: 'Pink Object Box - Short I', link: null, tip: 'Short-i miniatures: pig, wig, bib, pin, bin, fin, lip, zip, kit, sit (figure). -ig, -in, -ip families.' }
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
          { name: 'Pink Object Box - Short O', link: null, tip: 'Short-o miniatures: dog, log, frog, pot, cot, dot, mop, top, hop, fox, box, sock. Most distinct vowel.' }
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
          { name: 'Pink Object Box - Short U', link: null, tip: 'Short-u miniatures: cup, mug, jug, bug, rug, tub, bus, sun, bun, nut, hut. Tricky vowel - practice more.' }
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
          { name: 'Blend cards showing individual blends', link: null, tip: 'Cards with blend + key picture: bl-black, br-brown, cl-clap, cr-crab, st-stop, etc. 15-20 blends total.' },
          { name: 'Blue Series materials', link: '/admin/material-generator', tip: 'Same format as Pink: objects → pictures → word cards. Now with 4-letter words.' }
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
          { name: 'Blue Object Box - Ending Blends', link: null, tip: 'Miniatures for: -nd (hand, sand), -mp (lamp, camp), -lk (milk, silk), -nt (ant, tent), -nk (sink, pink).' }
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
          { name: 'CCVC word cards and objects', link: null, tip: 'Objects: frog, crab, drum, flag, plum, step, clip, sled. Word starts with blend: CCVC pattern.' }
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
          { name: 'CVCC word cards and objects', link: null, tip: 'Objects: hand, lamp, belt, desk, milk, nest, tent, gift. Word ends with blend: CVCC pattern.' }
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
          { name: 'Green Phonogram Box - ai/ay', link: null, tip: 'Objects/pictures: rain, train, snail, tail (ai) + play, day, hay, tray (ay). Rule: ai middle, ay end.' },
          { name: 'Green Series materials', link: '/admin/material-generator', tip: 'Phonogram highlighted in green on word cards. Same progression: objects → pictures → words.' }
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
          { name: 'Green Phonogram Box - ee/ea', link: null, tip: 'Objects: tree, bee, feet, sheep (ee) + beach, leaf, bead, seal (ea). Both say long E sound.' }
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
          { name: 'Green Phonogram Box - oa/ow', link: null, tip: 'For long O sound: boat, goat, coat, road (oa) + snow, bow, grow, slow (ow). Start with oa - more consistent.' }
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
          { name: 'Green Phonogram Box - ou/ow (diphthong)', link: null, tip: 'For "ow" as in ouch: cloud, house, mouse (ou) + cow, owl, brown, crown (ow). Different from long O!' }
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
          { name: 'Green Phonogram Boxes - R-controlled', link: null, tip: '3 boxes: ar (car, star, farm), or (corn, fork, horse), er-ir-ur (her, bird, fur - same sound!). Bossy R changes vowel.' }
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
          { name: 'Grammar symbol set (black triangle for nouns)', link: null, tip: 'Buy Montessori grammar symbols set on Taobao (蒙氏语法符号). Or DIY: cut colored cardstock - black triangle 5cm.' },
          { name: 'Small objects for labeling', link: null, tip: 'Use objects from your vocabulary baskets. Child writes label, places black triangle above.' }
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
          { name: 'Red verb circles', link: null, tip: 'Cut red circles 5cm diameter. Or use red poker chips/counters. Need 10-20 for sentence work.' },
          { name: 'Action word cards', link: null, tip: 'Write verbs on cards: run, jump, clap, sit, eat, drink, wash, sleep. Use lowercase. 20+ cards.' }
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
          { name: 'Dark blue triangle for adjectives', link: null, tip: 'Medium dark blue triangle, smaller than noun triangle. Represents how adjectives "depend on" nouns.' },
          { name: 'Sets of objects varying in color/size', link: null, tip: 'Get 3 pencils (red/blue/green), 3 balls (big/small/medium), 3 cups (tall/short/wide). For detective game.' }
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
          { name: 'Light blue small triangle for articles', link: null, tip: 'Smallest triangle, light blue. Represents articles as tiny helpers that go with nouns.' }
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
          { name: 'Farm game set with animals and word cards', link: null, tip: 'Taobao: Montessori Farm Game (蒙氏农场游戏). Or DIY: toy farm animals + handwritten command cards.' },
          { name: 'Complete grammar symbol set', link: null, tip: 'Full set: black triangle (noun), red circle (verb), blue triangles (adj/article), orange crescent (prep). Buy or DIY from cardstock.' }
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
// FIRST 100 WORDS - VOCABULARY PROGRESSION
// ============================================

export const VOCABULARY_PROGRESSION = [
  {
    phase: 1,
    title: 'Body & Classroom',
    weeks: 'Weeks 1-3',
    icon: '🏫',
    color: '#3B82F6',
    why: 'Concrete, touchable, always available. Point to real things.',
    words: [
      { word: 'leg', type: 'CVC', series: 'pink' },
      { word: 'arm', type: 'CVC', series: 'pink' },
      { word: 'lip', type: 'CVC', series: 'pink' },
      { word: 'hand', type: 'blend', series: 'blue' },
      { word: 'head', type: 'CVC', series: 'pink' },
      { word: 'nose', type: 'silent-e', series: 'green' },
      { word: 'pen', type: 'CVC', series: 'pink' },
      { word: 'bag', type: 'CVC', series: 'pink' },
      { word: 'box', type: 'CVC', series: 'pink' },
      { word: 'mat', type: 'CVC', series: 'pink' },
      { word: 'rug', type: 'CVC', series: 'pink' },
      { word: 'bin', type: 'CVC', series: 'pink' },
      { word: 'lid', type: 'CVC', series: 'pink' },
      { word: 'cup', type: 'CVC', series: 'pink' },
      { word: 'desk', type: 'blend', series: 'blue' },
    ]
  },
  {
    phase: 2,
    title: 'Animals',
    weeks: 'Weeks 3-5',
    icon: '🐾',
    color: '#10B981',
    why: 'High engagement! Children LOVE animals. Most are CVC words.',
    words: [
      { word: 'cat', type: 'CVC', series: 'pink' },
      { word: 'dog', type: 'CVC', series: 'pink' },
      { word: 'pig', type: 'CVC', series: 'pink' },
      { word: 'hen', type: 'CVC', series: 'pink' },
      { word: 'fox', type: 'CVC', series: 'pink' },
      { word: 'rat', type: 'CVC', series: 'pink' },
      { word: 'bat', type: 'CVC', series: 'pink' },
      { word: 'bug', type: 'CVC', series: 'pink' },
      { word: 'ant', type: 'blend', series: 'blue' },
      { word: 'bee', type: 'phonogram', series: 'green' },
      { word: 'cow', type: 'phonogram', series: 'green' },
      { word: 'duck', type: 'CVC+ck', series: 'pink' },
      { word: 'fish', type: 'digraph', series: 'pink' },
      { word: 'frog', type: 'blend', series: 'blue' },
      { word: 'bird', type: 'r-control', series: 'green' },
    ]
  },
  {
    phase: 3,
    title: 'Food & Kitchen',
    weeks: 'Weeks 5-7',
    icon: '🍎',
    color: '#F59E0B',
    why: 'Daily relevance - snack time, lunch, cooking activities.',
    words: [
      { word: 'pot', type: 'CVC', series: 'pink' },
      { word: 'pan', type: 'CVC', series: 'pink' },
      { word: 'jam', type: 'CVC', series: 'pink' },
      { word: 'ham', type: 'CVC', series: 'pink' },
      { word: 'egg', type: 'CVC', series: 'pink' },
      { word: 'nut', type: 'CVC', series: 'pink' },
      { word: 'bun', type: 'CVC', series: 'pink' },
      { word: 'mug', type: 'CVC', series: 'pink' },
      { word: 'jug', type: 'CVC', series: 'pink' },
      { word: 'milk', type: 'blend', series: 'blue' },
      { word: 'corn', type: 'r-control', series: 'green' },
      { word: 'pea', type: 'phonogram', series: 'green' },
      { word: 'rice', type: 'silent-e', series: 'green' },
      { word: 'fish', type: 'digraph', series: 'pink' },
      { word: 'cake', type: 'silent-e', series: 'green' },
    ]
  },
  {
    phase: 4,
    title: 'Home & Clothing',
    weeks: 'Weeks 7-9',
    icon: '🏠',
    color: '#8B5CF6',
    why: 'Personal connection - items they use every day.',
    words: [
      { word: 'bed', type: 'CVC', series: 'pink' },
      { word: 'cot', type: 'CVC', series: 'pink' },
      { word: 'tub', type: 'CVC', series: 'pink' },
      { word: 'tap', type: 'CVC', series: 'pink' },
      { word: 'mop', type: 'CVC', series: 'pink' },
      { word: 'fan', type: 'CVC', series: 'pink' },
      { word: 'hat', type: 'CVC', series: 'pink' },
      { word: 'cap', type: 'CVC', series: 'pink' },
      { word: 'sock', type: 'CVC+ck', series: 'pink' },
      { word: 'vest', type: 'blend', series: 'blue' },
      { word: 'belt', type: 'blend', series: 'blue' },
      { word: 'lamp', type: 'blend', series: 'blue' },
      { word: 'door', type: 'r-control', series: 'green' },
      { word: 'coat', type: 'phonogram', series: 'green' },
      { word: 'shoe', type: 'phonogram', series: 'green' },
    ]
  },
  {
    phase: 5,
    title: 'Actions & Verbs',
    weeks: 'Weeks 9-11',
    icon: '🏃',
    color: '#EF4444',
    why: 'Movement words for games, songs, and grammar prep.',
    words: [
      { word: 'run', type: 'CVC', series: 'pink' },
      { word: 'hop', type: 'CVC', series: 'pink' },
      { word: 'sit', type: 'CVC', series: 'pink' },
      { word: 'cut', type: 'CVC', series: 'pink' },
      { word: 'dig', type: 'CVC', series: 'pink' },
      { word: 'hug', type: 'CVC', series: 'pink' },
      { word: 'mix', type: 'CVC', series: 'pink' },
      { word: 'nap', type: 'CVC', series: 'pink' },
      { word: 'tap', type: 'CVC', series: 'pink' },
      { word: 'clap', type: 'blend', series: 'blue' },
      { word: 'jump', type: 'blend', series: 'blue' },
      { word: 'skip', type: 'blend', series: 'blue' },
      { word: 'kick', type: 'CVC+ck', series: 'pink' },
      { word: 'wash', type: 'digraph', series: 'pink' },
      { word: 'eat', type: 'phonogram', series: 'green' },
    ]
  },
  {
    phase: 6,
    title: 'Colors, Numbers & Position',
    weeks: 'Weeks 11-13',
    icon: '🎨',
    color: '#EC4899',
    why: 'Essential descriptors. Prepare for adjectives and prepositions.',
    words: [
      { word: 'red', type: 'CVC', series: 'pink' },
      { word: 'big', type: 'CVC', series: 'pink' },
      { word: 'hot', type: 'CVC', series: 'pink' },
      { word: 'wet', type: 'CVC', series: 'pink' },
      { word: 'one', type: 'sight', series: 'sight' },
      { word: 'two', type: 'sight', series: 'sight' },
      { word: 'up', type: 'CVC', series: 'pink' },
      { word: 'in', type: 'CVC', series: 'pink' },
      { word: 'on', type: 'CVC', series: 'pink' },
      { word: 'top', type: 'CVC', series: 'pink' },
      { word: 'blue', type: 'phonogram', series: 'green' },
      { word: 'green', type: 'phonogram', series: 'green' },
      { word: 'pink', type: 'blend', series: 'blue' },
      { word: 'black', type: 'blend', series: 'blue' },
      { word: 'three', type: 'phonogram', series: 'green' },
    ]
  }
];

// ============================================
// VOCABULARY BASKETS SHOPPING GUIDE
// ============================================

export const VOCABULARY_BASKETS = [
  {
    name: 'Animals Basket',
    icon: '🐾',
    color: '#10B981',
    budget: '¥50-80',
    whereToBuy: 'Taobao: Safari Ltd TOOBS, or local toy store',
    taobaoLink: 'https://s.taobao.com/search?q=仿真动物模型套装+农场动物',
    taobaoSearch: '仿真动物模型套装 农场动物',
    items: [
      'cat (plastic figurine)',
      'dog',
      'pig',
      'hen/chicken',
      'cow',
      'duck',
      'frog',
      'fish',
      'bird',
      'ant (or bug set)',
    ],
    tip: 'Safari Ltd TOOBS are perfect - realistic, durable, and right size for little hands. Search: Safari TOOBS 动物'
  },
  {
    name: 'Kitchen Basket',
    icon: '🍳',
    color: '#F59E0B',
    budget: '¥30-50',
    whereToBuy: 'Daiso/Miniso toy section, or real mini items',
    taobaoLink: 'https://s.taobao.com/search?q=迷你厨房餐具套装+过家家',
    taobaoSearch: '迷你厨房餐具套装 过家家',
    items: [
      'pot (mini)',
      'pan',
      'cup',
      'mug',
      'jug',
      'egg (plastic)',
      'spoon',
      'fork',
      'bowl',
      'lid',
    ],
    tip: 'Real miniature items work better than toys. Stainless steel 25-piece set ¥48 is excellent quality.'
  },
  {
    name: 'Classroom Basket',
    icon: '✏️',
    color: '#3B82F6',
    budget: '¥20-40',
    whereToBuy: 'Mini stationery sets on Taobao',
    taobaoLink: 'https://s.taobao.com/search?q=迷你文具套装+玩具',
    taobaoSearch: '迷你文具套装 玩具',
    items: [
      'pen',
      'pencil',
      'bag (small pouch)',
      'box',
      'book (mini)',
      'mat (coaster size)',
      'pin',
      'clip',
      'tape',
      'ruler',
    ],
    tip: 'Best value: 迷你学习课桌椅微缩仿真文具套装 ¥6.71 (5000+ sold) - complete mini desk set!'
  },
  {
    name: 'Clothing Basket',
    icon: '👕',
    color: '#8B5CF6',
    budget: '¥30-60',
    whereToBuy: 'Doll clothes section on Taobao',
    taobaoLink: 'https://s.taobao.com/search?q=娃娃衣服配件+ob11',
    taobaoSearch: '娃娃衣服配件 ob11',
    items: [
      'hat (doll size)',
      'cap',
      'sock (baby)',
      'vest',
      'belt (doll)',
      'shoe (doll)',
      'coat (doll)',
      'dress (doll)',
      'pants (doll)',
      'shirt (doll)',
    ],
    tip: 'OB11 doll clothes are perfect size. Mix and match from ¥1.50-3.50 per piece.'
  },
  {
    name: 'Home Items Basket',
    icon: '🏠',
    color: '#EC4899',
    budget: '¥40-70',
    whereToBuy: 'Dollhouse furniture sets on Taobao',
    taobaoLink: 'https://s.taobao.com/search?q=迷你家具套装+娃娃屋',
    taobaoSearch: '迷你家具套装 娃娃屋',
    items: [
      'bed (dollhouse)',
      'tub/bath',
      'lamp',
      'fan (mini)',
      'door (from craft store)',
      'rug (felt square)',
      'chair',
      'table',
      'sofa',
      'clock',
    ],
    tip: 'Best value: 日式迷你家居餐桌椅子书柜微缩场景 ¥1.58 (1000+ sold) - amazing quality!'
  },
  {
    name: 'Food Basket',
    icon: '🍎',
    color: '#EF4444',
    budget: '¥40-60',
    whereToBuy: 'Wooden play food sets on Taobao',
    taobaoLink: 'https://s.taobao.com/search?q=木制过家家食物+蔬菜水果',
    taobaoSearch: '木制过家家食物 蔬菜水果',
    items: [
      'apple',
      'egg (wooden)',
      'bun/bread',
      'fish',
      'ham/meat',
      'corn',
      'nut (real walnuts work!)',
      'cake',
      'pie',
      'jam jar (mini)',
    ],
    tip: 'Best value: 过家家切切乐宝宝切水果木质磁力 ¥26.20 (2000+ sold) - magnetic wooden food!'
  }
];

// ============================================
// SOUND OBJECTS - I SPY MATERIALS
// ============================================

// ESL Teaching Order: Start with sounds that exist in Chinese, progress to harder sounds
export const ESL_SOUND_ORDER = {
  phase1_easy: ['s', 'm', 'f', 'n', 'p', 't', 'k', 'h'],  // Exist in Mandarin
  phase2_medium: ['b', 'd', 'g', 'j', 'w', 'y'],           // Need practice
  phase3_hard: ['v', 'th', 'r', 'l', 'z', 'sh', 'ch'],    // Don't exist in Mandarin - teach last
  vowels: ['a', 'e', 'i', 'o', 'u']                        // Short vowels
};

// Beginning Sound Objects - 6 per sound (practical for sourcing)
export const BEGINNING_SOUND_OBJECTS = [
  // Phase 1: Easy sounds (exist in Mandarin)
  { sound: 's', phase: 1, objects: ['sun', 'sock', 'soap', 'spoon', 'star', 'snake'], taobao: '迷你太阳/袜子' },
  { sound: 'm', phase: 1, objects: ['mop', 'moon', 'mouse', 'map', 'mug', 'mat'], taobao: '迷你拖把/月亮' },
  { sound: 'f', phase: 1, objects: ['fan', 'fish', 'fork', 'frog', 'fox', 'feather'], taobao: '迷你风扇/鱼' },
  { sound: 'n', phase: 1, objects: ['net', 'nut', 'nail', 'nest', 'nose', 'necklace'], taobao: '迷你网/坚果' },
  { sound: 'p', phase: 1, objects: ['pen', 'pig', 'pot', 'pin', 'pear', 'pan'], taobao: '迷你笔/猪' },
  { sound: 't', phase: 1, objects: ['top', 'tent', 'tiger', 'tape', 'tooth', 'toy'], taobao: '迷你帐篷/老虎' },
  { sound: 'k', phase: 1, objects: ['cup', 'cat', 'car', 'cap', 'can', 'key'], taobao: '迷你杯子/猫' },
  { sound: 'h', phase: 1, objects: ['hat', 'hen', 'horse', 'house', 'hammer', 'hand'], taobao: '迷你帽子/马' },
  // Phase 2: Medium difficulty
  { sound: 'b', phase: 2, objects: ['ball', 'bat', 'bed', 'bus', 'bug', 'box'], taobao: '迷你球/床' },
  { sound: 'd', phase: 2, objects: ['dog', 'doll', 'duck', 'door', 'drum', 'dish'], taobao: '迷你狗/鸭' },
  { sound: 'g', phase: 2, objects: ['goat', 'gift', 'glass', 'grape', 'guitar', 'gold'], taobao: '迷你山羊/礼物' },
  { sound: 'j', phase: 2, objects: ['jet', 'jam', 'jug', 'jar', 'jeep', 'jump rope'], taobao: '迷你飞机/果酱' },
  { sound: 'w', phase: 2, objects: ['wig', 'web', 'watch', 'worm', 'wagon', 'wolf'], taobao: '迷你假发/手表' },
  // Phase 3: Hard sounds (don't exist in Mandarin)
  { sound: 'v', phase: 3, objects: ['van', 'vest', 'vase', 'violin', 'vine', 'vet'], taobao: '迷你货车/花瓶', eslNote: 'Teeth on lip! Chinese speakers say /w/' },
  { sound: 'r', phase: 3, objects: ['ring', 'rug', 'rat', 'rain', 'rabbit', 'rocket'], taobao: '迷你戒指/兔子', eslNote: 'Tongue curled back, NOT /l/' },
  { sound: 'l', phase: 3, objects: ['leg', 'lamp', 'lid', 'log', 'leaf', 'lemon'], taobao: '迷你台灯/叶子', eslNote: 'Tongue touches roof' },
  { sound: 'z', phase: 3, objects: ['zip', 'zoo', 'zebra', 'zero', 'zigzag', 'zipper'], taobao: '迷你拉链/斑马', eslNote: 'Voice the /s/ sound' },
  // Vowels (short sounds)
  { sound: 'a', phase: 'vowel', objects: ['ant', 'apple', 'ax', 'alligator', 'astronaut', 'anchor'], taobao: '迷你蚂蚁/苹果', keyPicture: '🍎 apple' },
  { sound: 'e', phase: 'vowel', objects: ['egg', 'elf', 'elephant', 'elbow', 'envelope', 'engine'], taobao: '迷你鸡蛋/大象', keyPicture: '🥚 egg' },
  { sound: 'i', phase: 'vowel', objects: ['igloo', 'insect', 'ink', 'iguana', 'inch', 'infant'], taobao: '迷你冰屋/昆虫', keyPicture: '🏠 igloo' },
  { sound: 'o', phase: 'vowel', objects: ['octopus', 'ox', 'olive', 'otter', 'ostrich', 'orange'], taobao: '迷你章鱼/橙子', keyPicture: '🐙 octopus' },
  { sound: 'u', phase: 'vowel', objects: ['umbrella', 'umpire', 'unicorn', 'up arrow', 'under', 'utensil'], taobao: '迷你雨伞', keyPicture: '☂️ umbrella' },
];

// Ending Sound Objects - 5 per sound
export const ENDING_SOUND_OBJECTS = [
  { sound: 't', objects: ['cat', 'hat', 'bat', 'pot', 'net'], note: 'Most common CVC ending' },
  { sound: 'p', objects: ['cup', 'cap', 'mop', 'map', 'top'], note: 'Clear stop sound' },
  { sound: 'n', objects: ['sun', 'pan', 'can', 'fan', 'pen'], note: 'Continuous - easy to hear' },
  { sound: 'g', objects: ['dog', 'pig', 'bag', 'rug', 'bug'], note: 'Voiced stop' },
  { sound: 'd', objects: ['bed', 'red', 'lid', 'mud', 'bud'], note: 'Voiced - harder than /t/' },
  { sound: 'x', objects: ['box', 'fox', 'six', 'wax', 'mix'], note: 'Actually /ks/ blend' },
  { sound: 'm', objects: ['ham', 'jam', 'gum', 'drum', 'swim'], note: 'Nasal - lips together' },
  { sound: 'b', objects: ['crab', 'web', 'tub', 'cab', 'cub'], note: 'Voiced stop' },
];

// CVC Objects by Vowel - 6 words per vowel for middle sound work
// ALIGNED with master-words.ts and game data
export const CVC_BY_VOWEL = [
  {
    vowel: 'a',
    keyPicture: '🍎',
    mouthPosition: 'Jaw drops open',
    words: ['cat', 'hat', 'bat', 'map', 'pan', 'bag'],
    objects: ['cat', 'hat', 'bat', 'map', 'pan', 'bag']
  },
  {
    vowel: 'e',
    keyPicture: '🥚',
    mouthPosition: 'Smile slightly, tongue mid-front',
    words: ['bed', 'pen', 'hen', 'net', 'leg', 'web'],
    objects: ['bed', 'pen', 'hen', 'net', 'leg model', 'web']
  },
  {
    vowel: 'i',
    keyPicture: '🏠',
    mouthPosition: 'Big smile, tongue high',
    words: ['pig', 'pin', 'bin', 'lip', 'wig', 'fin'],
    objects: ['pig', 'pin', 'bin', 'lip model', 'wig', 'fin']
  },
  {
    vowel: 'o',
    keyPicture: '🐙',
    mouthPosition: 'Round lips, tongue low-back',
    words: ['dog', 'pot', 'mop', 'box', 'fox', 'log'],
    objects: ['dog', 'pot', 'mop', 'box', 'fox', 'log']
  },
  {
    vowel: 'u',
    keyPicture: '☂️',
    mouthPosition: 'Relaxed, jaw slightly dropped',
    words: ['cup', 'bug', 'rug', 'sun', 'bus', 'nut'],
    objects: ['cup', 'bug', 'rug', 'sun', 'bus', 'nut']
  },
];

// Shopping summary for sound objects
export const SOUND_OBJECTS_SHOPPING = {
  totalObjects: '~100 miniatures',
  estimatedBudget: '¥200-300',
  taobaoSearches: [
    '仿真小动物模型套装 (realistic mini animal set)',
    '迷你家具配件 (mini furniture accessories)',
    '过家家小物件 (pretend play small items)',
    '微型仿真食物 (miniature realistic food)',
    '蒙氏教具语言区 (Montessori language materials)'
  ],
  recommendedSets: [
    'Safari Ltd TOOBS - Animals, insects (¥40-60 each)',
    'Dollhouse accessories set (¥30-50)',
    'Wooden play food set (¥40-60)',
    'Miniature school supplies (¥20-30)'
  ],
  eslWarning: 'Chinese words don\'t end in consonants (except /n/ and /ng/). Children will naturally DROP final sounds. Practice ending sounds extensively!'
};

// ============================================
// COMPLETE I-SPY WORD LISTS (Expandable)
// ============================================

export const ISPY_COMPLETE = {
  phase1_easy: [
    { sound: '/s/', words: ['sun ☀️', 'sock 🧦', 'soap 🧼', 'star ⭐', 'snake 🐍', 'spoon 🥄', 'sponge', 'scissors ✂️', 'seal', 'sand'], note: 'Exists in Mandarin - START HERE' },
    { sound: '/m/', words: ['mouse 🐭', 'mop', 'moon 🌙', 'mat', 'mug', 'milk 🥛', 'map', 'magnet', 'monkey 🐒', 'mirror'], note: 'Exists in Mandarin' },
    { sound: '/f/', words: ['fish 🐟', 'fan', 'fork 🍴', 'frog 🐸', 'fox 🦊', 'feather 🪶', 'foot 🦶', 'finger', 'flag 🚩', 'flower 🌸'], note: 'Exists in Mandarin' },
    { sound: '/n/', words: ['net', 'nut 🥜', 'nail', 'nest 🪺', 'nose 👃', 'necklace', 'nine 9️⃣', 'notebook 📓', 'napkin', 'nurse'], note: 'Exists in Mandarin' },
    { sound: '/p/', words: ['pen 🖊️', 'pig 🐷', 'pot', 'pin', 'pear 🍐', 'pan', 'pencil ✏️', 'piano 🎹', 'pizza 🍕', 'panda 🐼'], note: 'Exists in Mandarin' },
    { sound: '/t/', words: ['top', 'tent ⛺', 'tiger 🐯', 'tape', 'tooth 🦷', 'toy', 'table', 'tree 🌳', 'train 🚂', 'truck 🚚'], note: 'Exists in Mandarin' },
    { sound: '/c/ or /k/', words: ['cup ☕', 'cat 🐱', 'car 🚗', 'cap 🧢', 'can', 'key 🔑', 'king 👑', 'kite 🪁', 'cake 🎂', 'carrot 🥕'], note: 'Exists in Mandarin' },
    { sound: '/h/', words: ['hat 🎩', 'hen 🐔', 'horse 🐴', 'house 🏠', 'hammer 🔨', 'hand ✋', 'heart ❤️', 'hippo 🦛', 'hot dog 🌭', 'helicopter 🚁'], note: 'Exists in Mandarin' },
  ],
  phase2_medium: [
    { sound: '/b/', words: ['ball ⚽', 'bat 🦇', 'bed 🛏️', 'bus 🚌', 'bug 🐛', 'box 📦', 'book 📖', 'boat ⛵', 'bird 🐦', 'banana 🍌'], note: 'Voiced - practice aspiration' },
    { sound: '/d/', words: ['dog 🐕', 'doll', 'duck 🦆', 'door 🚪', 'drum 🥁', 'dish', 'desk', 'deer 🦌', 'dragon 🐲', 'dress 👗'], note: 'Voiced - harder than /t/' },
    { sound: '/g/', words: ['goat 🐐', 'gift 🎁', 'glass', 'grape 🍇', 'guitar 🎸', 'gold', 'game 🎮', 'girl 👧', 'gorilla 🦍', 'grass'], note: 'Voiced stop' },
    { sound: '/j/', words: ['jet ✈️', 'jam', 'jug', 'jar', 'jeep 🚙', 'juice 🧃', 'jacket', 'jellyfish 🪼', 'jeans 👖', 'jewel 💎'], note: 'Affricate sound' },
    { sound: '/w/', words: ['wig', 'web 🕸️', 'watch ⌚', 'worm 🪱', 'wagon', 'wolf 🐺', 'water 💧', 'window', 'whale 🌳', 'watermelon 🍉'], note: 'Lips rounded' },
    { sound: '/y/', words: ['yak', 'yarn 🧶', 'yawn', 'yogurt', 'yo-yo 🪀', 'yell', 'yellow 💛', 'yes', 'yam', 'yacht'], note: 'Tongue high' },
  ],
  phase3_hard: [
    { sound: '/v/', words: ['van 🚐', 'vest', 'vase', 'violin 🎻', 'vine 🌿', 'vet', 'volcano 🌋', 'vegetable 🥬', 'vacuum', 'video 📹'], eslNote: '⚠️ HARD: Teeth bite bottom lip, feel buzz. Chinese speakers say /w/ instead!' },
    { sound: '/th/', words: ['thumb 👍', 'thorn', 'three 3️⃣', 'thread', 'thunder ⛈️', 'thermometer', 'thick', 'thin', 'think 💭', 'thank'], eslNote: '⚠️ HARD: Tongue between teeth, blow air. Chinese speakers say /s/ or /f/ instead!' },
    { sound: '/r/', words: ['ring 💍', 'rug', 'rat 🐀', 'rain 🌧️', 'rabbit 🐰', 'rocket 🚀', 'robot 🤖', 'rainbow 🌈', 'rose 🌹', 'river'], eslNote: '⚠️ HARD: Tongue curls BACK, doesn\'t touch. Different from Mandarin r!' },
    { sound: '/l/', words: ['leg 🦵', 'lamp 💡', 'lid', 'log', 'leaf 🍃', 'lemon 🍋', 'lion 🦁', 'ladder', 'lock 🔒', 'lollipop 🍭'], eslNote: '⚠️ HARD: Tongue touches roof. Practice /l/ vs /r/ minimal pairs!' },
    { sound: '/z/', words: ['zip', 'zoo 🦓', 'zebra 🦓', 'zero 0️⃣', 'zigzag', 'zipper', 'zucchini', 'zone', 'zoom', 'zombie 🧟'], eslNote: 'Voice the /s/ sound' },
    { sound: '/sh/', words: ['ship 🚢', 'shell 🐚', 'sheep 🐑', 'shoe 👟', 'shark 🦈', 'shirt 👕', 'shower 🚿', 'shop', 'shadow', 'shampoo'], eslNote: 'Lips rounded, tongue back' },
    { sound: '/ch/', words: ['chair 🪑', 'cheese 🧀', 'cherry 🍒', 'chicken 🐔', 'chips', 'chocolate 🍫', 'church ⛪', 'chest', 'chin', 'chick 🐤'], eslNote: 'Stop + fricative' },
  ],
  vowels: [
    { sound: '/a/ (short)', words: ['apple 🍎', 'ant 🐜', 'ax', 'alligator 🐊', 'astronaut 👨‍🚀', 'anchor ⚓', 'ambulance 🚑', 'arrow ➡️', 'avocado 🥑', 'angel 👼'], keyPic: '🍎 apple', mouthTip: 'Jaw drops open wide' },
    { sound: '/e/ (short)', words: ['egg 🥚', 'elf 🧝', 'elephant 🐘', 'elbow', 'envelope ✉️', 'engine', 'elevator', 'exit 🚪', 'exercise', 'eskimo'], keyPic: '🥚 egg', mouthTip: 'Smile slightly, tongue mid' },
    { sound: '/i/ (short)', words: ['igloo', 'insect 🐛', 'ink', 'iguana 🦎', 'inch', 'infant 👶', 'invitation', 'instrument 🎺', 'indian', 'index'], keyPic: '🏠 igloo', mouthTip: 'Big smile, tongue high' },
    { sound: '/o/ (short)', words: ['octopus 🐙', 'ox 🐂', 'olive', 'otter 🦦', 'ostrich', 'orange 🍊', 'office', 'omelette', 'opera', 'opposum'], keyPic: '🐙 octopus', mouthTip: 'Round lips, tongue low-back' },
    { sound: '/u/ (short)', words: ['umbrella ☂️', 'umpire', 'unicorn 🦄', 'up ⬆️', 'under', 'undo', 'uncle', 'uniform', 'unusual', 'utensil'], keyPic: '☂️ umbrella', mouthTip: 'Relaxed, jaw slightly dropped' },
  ]
};

// ============================================
// COMPLETE MOVEABLE ALPHABET PROGRESSIONS
// ============================================

export const MOVEABLE_ALPHABET_COMPLETE = [
  {
    stage: 1,
    vowel: 'Short /a/',
    color: '#EF4444',
    words: ['cat', 'mat', 'sat', 'hat', 'bat', 'rat', 'pan', 'can', 'man', 'fan', 'map', 'bag', 'tag', 'wag', 'jam', 'ham', 'dad', 'sad', 'cap', 'tap'],
    phrases: ['a fat cat', 'a sad dad', 'the tan van', 'a bad rat'],
    objects: ['cat', 'hat', 'bat', 'pan', 'can', 'map', 'bag', 'jam', 'cap', 'fan']
  },
  {
    stage: 2,
    vowel: 'Short /e/',
    color: '#F59E0B',
    words: ['bed', 'red', 'pen', 'hen', 'men', 'ten', 'net', 'wet', 'pet', 'jet', 'leg', 'peg', 'web', 'bell', 'shell'],
    phrases: ['a red bed', 'the wet pet', 'ten men', 'a jet set'],
    objects: ['bed', 'pen', 'hen', 'net', 'jet', 'leg', 'web']
  },
  {
    stage: 3,
    vowel: 'Short /i/',
    color: '#10B981',
    words: ['pig', 'big', 'dig', 'wig', 'pin', 'bin', 'fin', 'win', 'sit', 'hit', 'bit', 'kit', 'lip', 'tip', 'sip', 'zip', 'bib', 'rib'],
    phrases: ['a big pig', 'the tin bin', 'a sip and a zip', 'sit and hit'],
    objects: ['pig', 'wig', 'pin', 'bin', 'fin', 'lip', 'bib']
  },
  {
    stage: 4,
    vowel: 'Short /o/',
    color: '#3B82F6',
    words: ['dog', 'log', 'fog', 'hog', 'pot', 'hot', 'cot', 'dot', 'mop', 'top', 'hop', 'pop', 'box', 'fox', 'sock', 'rock'],
    phrases: ['a hot pot', 'the dog on the log', 'a fox in a box', 'hop on top'],
    objects: ['dog', 'log', 'pot', 'mop', 'top', 'box', 'fox', 'sock']
  },
  {
    stage: 5,
    vowel: 'Short /u/',
    color: '#8B5CF6',
    words: ['cup', 'pup', 'bus', 'nut', 'hut', 'cut', 'bug', 'rug', 'hug', 'mug', 'jug', 'tug', 'sun', 'run', 'fun', 'bun', 'mud', 'bud'],
    phrases: ['a fun run', 'the pup in mud', 'a bug on a rug', 'hug the cup'],
    objects: ['cup', 'bus', 'nut', 'bug', 'rug', 'mug', 'jug', 'sun', 'bun']
  }
];

// ============================================
// PINK SERIES OBJECT BOXES
// ============================================

export const PINK_BOXES = [
  { vowel: 'a', objects: ['cat', 'bat', 'rat', 'hat', 'map', 'pan', 'can', 'bag', 'tag', 'fan'], color: '#EF4444' },
  { vowel: 'e', objects: ['bed', 'pen', 'hen', 'net', 'jet', 'leg', 'web', 'bell'], color: '#F59E0B' },
  { vowel: 'i', objects: ['pig', 'pin', 'bin', 'fin', 'lip', 'kit', 'rib', 'lid'], color: '#10B981' },
  { vowel: 'o', objects: ['dog', 'log', 'pot', 'mop', 'box', 'fox', 'dot', 'top'], color: '#3B82F6' },
  { vowel: 'u', objects: ['cup', 'bus', 'nut', 'bug', 'rug', 'sun', 'jug', 'bun'], color: '#8B5CF6' }
];
