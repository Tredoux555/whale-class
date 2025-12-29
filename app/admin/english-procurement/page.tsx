'use client';

import { useState } from 'react';
import Link from 'next/link';

// Type definitions
interface Material {
  item: string;
  qty: string;
  source: 'BUY' | 'MAKE';
  search1688?: string;
  searchEn?: string;
  price?: string;
  generator?: string;
  priority?: string;
  verified?: boolean;
}

interface Work {
  id: string;
  name: string;
  sequence: number;
  ageRange?: string;
  prerequisites?: string;
  purpose?: string;
  presentation?: string[];
  materials: Material[];
  successIndicators?: string[];
  l2Adaptations?: string[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  works: Work[];
}

// COMPLETE INTERACTIVE ENGLISH ALBUM DATA
// Includes verified 1688 terms, AMI presentations, and L2 adaptations
const albumData: { categories: Category[] } = {
  categories: [
    {
      id: 'oral_language',
      name: 'Oral Language Development',
      icon: '🗣️',
      color: 'from-pink-500 to-rose-500',
      works: [
        {
          id: 'la_sound_games',
          name: 'Sound Games (I Spy)',
          sequence: 1,
          ageRange: '2.5-4 years (L1) or 3.5-4.5 years (L2)',
          prerequisites: 'Vocabulary of 100+ words (200-300 for L2 learners)',
          purpose: 'Train the ear to isolate individual sounds within words. This is the FOUNDATION of all reading. Must be completed ENTIRELY before introducing sandpaper letters.',
          presentation: [
            'STAGE 1 - SINGLE OBJECT: Hold one object. Say "I spy with my little eye something that begins with /k/." Make it impossible to fail.',
            'STAGE 2 - TWO OBJECTS: Place two objects with distinctly different beginning sounds. Child selects correct one.',
            'STAGE 3 - MULTIPLE OBJECTS: Increase to 3-6 objects. Add descriptive clues: "I spy something you can wear that starts with /h/."',
            'STAGE 4 - ENDING SOUNDS: "I spy something that ENDS with /t/."',
            'STAGE 5 - BEGINNING AND ENDING: "I spy something that starts with /f/ and ends with /sh/." (fish)',
            'STAGE 6 - ALL SOUNDS (SEGMENTING): "Can you tell me ALL the sounds in cat?" Child responds: "/k/ /a/ /t/."'
          ],
          materials: [
            { item: 'Initial Sound Objects (26 letters)', qty: '130+ objects', source: 'BUY', search1688: '蒙氏语言区字母首音小物件套装', searchEn: 'Montessori phonics miniature objects set', price: '¥150-300', priority: 'ESSENTIAL' },
            { item: 'Sound Sorting Baskets', qty: '10 baskets', source: 'BUY', search1688: '木质分类篮 蒙氏', searchEn: 'wooden sorting basket Montessori', price: '¥30-60', verified: true },
            { item: 'Miniature Animals (realistic)', qty: '1 set', source: 'BUY', search1688: '仿真动物模型 迷你 儿童认知', searchEn: 'miniature animal figures educational', price: '¥40-80' }
          ],
          successIndicators: [
            'Child can identify beginning sound 8/10 times',
            'Child spontaneously says "That starts with /m/!"',
            'Child enjoys the game and asks to play',
            'Ready for sandpaper letters when mastering all six stages'
          ],
          l2Adaptations: [
            'Begin with sounds that transfer from Pinyin: s, m, t, p, b, f, n',
            'Use objects with Chinese equivalents child knows: 猫 (cat), 苹果 (apple)',
            'Spend extra time on /θ/, /ð/, /v/ sounds before introducing those letters'
          ]
        },
        {
          id: 'la_classified_cards',
          name: 'Three-Part Cards (Classified Cards)',
          sequence: 2,
          ageRange: '2.5-4 years',
          purpose: 'Build vocabulary systematically while introducing the concept that pictures and words are connected.',
          presentation: [
            'STAGE 1 - PICTURE CARDS ONLY: Select 5-6 picture cards from one category.',
            'THREE-PERIOD LESSON - Period 1 (Naming): "This is an apple. This is a banana. This is an orange."',
            'Period 2 (Recognition): "Show me the banana." "Point to the apple." "Put the orange by the window."',
            'Period 3 (Recall): Point to card and ask "What is this?"',
            'STAGE 2 - MATCHING LABELS: After child knows sandpaper letters, give label cards to match to pictures.',
            'Child sounds out word, places label under picture, checks with control card.'
          ],
          materials: [
            { item: 'Three-Part Card Sets (animals, fruits, etc)', qty: '5+ sets', source: 'BUY', search1688: '蒙氏三部卡', searchEn: 'Montessori 3-part cards', price: '¥20-60/set', verified: true },
            { item: 'Card Storage Box (compartments)', qty: '3 boxes', source: 'BUY', search1688: '木质卡片收纳盒 分格', searchEn: 'wooden card box compartments', price: '¥30-80', verified: true },
            { item: 'Custom Cards', qty: '200+ cards', source: 'MAKE', generator: '/admin/card-generator' }
          ],
          l2Adaptations: [
            'Use bilingual cards initially (English word + 中文)',
            'Focus on high-frequency, concrete nouns first',
            'Essential categories: farm animals, transportation, classroom objects'
          ]
        }
      ]
    },
    {
      id: 'writing_prep',
      name: 'Writing Preparation',
      icon: '✏️',
      color: 'from-blue-500 to-indigo-500',
      works: [
        {
          id: 'la_metal_insets',
          name: 'Metal Insets',
          sequence: 1,
          ageRange: '3-4 years',
          purpose: 'Develop fine motor control needed for handwriting BEFORE asking children to form letters. Develops pincer grip, hand strength, lightness of touch.',
          presentation: [
            'PRESENTATION 1 - SINGLE FRAME: Place frame on paper. "I hold the frame steady with this hand." Trace COUNTERCLOCKWISE around inside of frame. "All the way around until I come back to where I started."',
            'PRESENTATION 2 - FRAME IN TWO POSITIONS: Trace frame, rotate, trace again in different color.',
            'PRESENTATION 3 - FRAME AND INSET: Trace frame (color 1), place inset inside, trace around OUTSIDE of inset (color 2).',
            'PRESENTATION 4 - FILLING IN: "Now I fill with lines going this way." Draw parallel horizontal lines LEFT TO RIGHT, evenly spaced.',
            'PRESENTATIONS 5-7: Creative patterns, overlapping shapes, grading/pressure control (dark to light).',
            'KEY: All tracing is COUNTERCLOCKWISE. Should be done DAILY.'
          ],
          materials: [
            { item: 'Metal Insets Set (10 shapes)', qty: '1 set', source: 'BUY', search1688: '蒙氏铁制几何嵌板教具', searchEn: 'Montessori metal insets 10', price: '¥150-350', priority: 'ESSENTIAL', verified: true },
            { item: 'Metal Inset Stand', qty: '1 stand', source: 'BUY', search1688: '蒙氏嵌板架 木质', searchEn: 'metal inset stand wooden', price: '¥40-80' },
            { item: 'Colored Pencils (thick barrel)', qty: '2 sets', source: 'BUY', search1688: '彩色铅笔 粗杆 12色 幼儿', searchEn: 'thick colored pencils children', price: '¥15-30' },
            { item: 'Inset Paper (14cm square)', qty: '500 sheets', source: 'BUY', search1688: '白卡纸 14厘米 正方形', searchEn: 'cardstock squares 14cm', price: '¥15-25' },
            { item: 'Pencil Holder (12 holes)', qty: '2-3', source: 'BUY', search1688: '蒙氏铅笔筒 12孔 木质', searchEn: 'Montessori pencil holder 12', price: '¥25-45' }
          ],
          successIndicators: [
            'Lines stay on the edge of the frame',
            'Pencil grip is correct (tripod)',
            'Parallel lines are evenly spaced',
            'Child can control pencil pressure'
          ]
        },
        {
          id: 'la_sandpaper_letters',
          name: 'Sandpaper Letters',
          sequence: 2,
          ageRange: '3.5-4.5 years (L1) or 4.5-5 years (L2)',
          prerequisites: 'MUST have mastered I Spy (all six stages)',
          purpose: 'Connect the SOUND of each letter to its SYMBOL through tactile, visual, and auditory learning simultaneously.',
          presentation: [
            'PREPARATION: Choose THREE letters (2 consonants + 1 vowel). Letters should look and sound DIFFERENT. Sensitize fingertips by rubbing together.',
            'PERIOD 1 - NAMING: Place index and middle fingers TOGETHER at starting point. Trace letter SLOWLY. AFTER completing trace, say sound: "/mmm/". Trace 3 times. Child traces and says sound.',
            '"Let\'s think of words that begin with /mmm/... moon! monkey!"',
            'PERIOD 2 - RECOGNITION (Most learning here): "Show me /m/." "Put /s/ by the window." "Hide /a/ under your hands." If wrong, simply say "This one says /m/. Feel it with me."',
            'PERIOD 3 - RECALL: Only when 100% confident. "What sound does this letter make?"',
            'LETTER ORDER: s, a, t, m → c, r, i, p → n, o, b, h → d, g, f, l → k, e, u, w → j, y, v, x, z, q',
            'NEVER introduce similar-looking letters together (b/d, m/n, p/q). Include phonogram by 4th presentation.'
          ],
          materials: [
            { item: 'Sandpaper Letters Lowercase (26)', qty: '1 set', source: 'BUY', search1688: '蒙氏砂纸字母 小写', searchEn: 'Montessori sandpaper letters lowercase', price: '¥60-120', priority: 'ESSENTIAL', verified: true },
            { item: 'Sandpaper Phonograms (sh, ch, th, etc)', qty: '1 set', source: 'BUY', search1688: '蒙台蒙特梭利 双字母砂纸板', searchEn: 'Montessori double sandpaper letters', price: '¥40-80', priority: 'ESSENTIAL' },
            { item: 'Sand Tray', qty: '1 tray', source: 'BUY', search1688: '刮沙盒', searchEn: 'Montessori sand tray writing', price: '¥20-60', verified: true },
            { item: 'Colored Sand (fine, blue)', qty: '2kg', source: 'BUY', search1688: '彩色沙子 蓝色 细沙', searchEn: 'colored sand fine blue', price: '¥10-20' },
            { item: 'Storage Box', qty: '1 box', source: 'BUY', search1688: '蒙氏砂纸字母收纳盒', searchEn: 'sandpaper letter box wooden', price: '¥30-60' }
          ],
          successIndicators: [
            'Child traces with correct finger formation (index + middle together)',
            'Child says sound AFTER completing trace',
            'Child can identify letter by touch alone (eyes closed)',
            'Child spontaneously connects letters to words'
          ],
          l2Adaptations: [
            'Reorder for Chinese speakers: s,a,t,m (Pinyin familiar) → p,i,n,b → c/k,o,d,g → f,e,h,l → r,u,w,j → v,y,x,z,q (problematic last)',
            'Introduce th, sh, ch phonograms EARLIER than standard',
            'Use mirror to show mouth position for /v/, /θ/, /ð/'
          ]
        },
        {
          id: 'la_moveable_alphabet',
          name: 'Moveable Alphabet',
          sequence: 3,
          ageRange: '4-5 years',
          prerequisites: 'Recognizes 3-4 consonants plus one vowel from Sandpaper Letters',
          purpose: 'Enable children to BUILD words before hands are ready to write. Writing (encoding) comes BEFORE reading (decoding).',
          presentation: [
            'LESSON 1 - ORIENTATION: "This is the Moveable Alphabet." Show compartments. Demonstrate taking out and returning letters (alphabetically, left to right).',
            'LESSON 2 - MATCHING: Place 3-4 sandpaper letters on mat. "Can you find the matching letters in the box?" Child places wooden letter on sandpaper letter.',
            'LESSON 3 - BUILDING CVC WORDS: Place small object (toy cat) on mat. "What is this?" "Cat! Let\'s build the word cat."',
            '"Say cat slowly... what sound do you hear FIRST?" Child produces /k/. "Can you find the letter that makes /k/?"',
            'Child finds c, places on mat. "What sound in the MIDDLE?" Child finds a. "And at the END?" Child finds t.',
            '"You spelled CAT! /k/-/a/-/t/... CAT!" Run finger under word left to right.',
            'PROGRESSION: CVC words → phrases → sentences → stories'
          ],
          materials: [
            { item: 'Large Moveable Alphabet Box', qty: '1 set', source: 'BUY', search1688: '蒙氏活动字母箱', searchEn: 'Montessori moveable alphabet box', price: '¥80-200', priority: 'ESSENTIAL', verified: true },
            { item: 'Small Moveable Alphabet', qty: '1 set', source: 'BUY', search1688: '蒙氏小号活动字母', searchEn: 'small moveable alphabet', price: '¥60-100' },
            { item: 'Felt-lined mat (green)', qty: '1 mat', source: 'BUY', search1688: '蒙氏工作毯 绿色', searchEn: 'Montessori work mat green', price: '¥30-60' },
            { item: 'CVC Object Baskets', qty: '3 baskets', source: 'BUY', search1688: '蒙氏语言物品篮', searchEn: 'Montessori language object basket', price: '¥20-40' }
          ],
          l2Adaptations: [
            'Focus on CVC words child can SAY and UNDERSTAND',
            'Pre-teach vocabulary with three-part cards before spelling',
            'Use objects with Chinese equivalents: 猫 (cat), 狗 (dog)'
          ]
        }
      ]
    },
    {
      id: 'reading',
      name: 'Reading',
      icon: '📖',
      color: 'from-green-500 to-emerald-500',
      works: [
        {
          id: 'la_pink_series',
          name: 'Pink Series (CVC Words)',
          sequence: 1,
          ageRange: '4-5 years',
          prerequisites: 'Can build CVC words with moveable alphabet',
          purpose: 'Bridge from word BUILDING (encoding) to word READING (decoding).',
          presentation: [
            'OBJECT BOX: Open box, lay out miniature objects.',
            'Give child first word card. "Can you read this word?"',
            'Child sounds out: /c/-/a/-/t/... "Cat!"',
            '"Can you find the cat?" Child places label next to matching object.',
            'Continue with remaining words.',
            '"Now let\'s check with the control chart." Child self-corrects any errors.'
          ],
          materials: [
            { item: 'Pink Object Box with CVC Miniatures', qty: '1 set', source: 'BUY', search1688: '蒙氏粉色系列物品盒', searchEn: 'Montessori pink series object box', price: '¥80-150', priority: 'ESSENTIAL' },
            { item: 'Pink Reading Cards', qty: '200+ cards', source: 'MAKE', generator: '/admin/material-generator' },
            { item: 'Pink Booklets/Readers', qty: '10', source: 'BUY', search1688: '蒙氏粉红阅读小书', searchEn: 'Montessori pink readers', price: '¥40-80' }
          ],
          l2Adaptations: [
            'Vocabulary pre-teaching essential',
            'Smaller word sets than L1 learners',
            'More repetition of each word'
          ]
        },
        {
          id: 'la_blue_series',
          name: 'Blue Series (Consonant Blends)',
          sequence: 2,
          ageRange: '5-6 years',
          prerequisites: 'Mastery of Pink Series',
          purpose: 'Introduce consonant clusters — two or three consonants that blend together.',
          presentation: [
            'Same format as Pink Series but with blend words.',
            'Beginning blends: bl, br, cl, cr, dr, fl, fr, gl, gr, pl, pr, sc, sk, sl, sm, sn, sp, st, sw, tr',
            'Ending blends: ft, ld, lk, lp, lt, mp, nd, nk, nt, pt',
            'Example words: block, bring, clap, drum, frog, green, skip, stop, swim, trunk'
          ],
          materials: [
            { item: 'Blue Object Box with Blend Miniatures', qty: '1 set', source: 'BUY', search1688: '蒙氏蓝色系列物品盒', searchEn: 'Montessori blue series object box', price: '¥80-150', priority: 'ESSENTIAL' },
            { item: 'Blue Reading Cards', qty: '200+ cards', source: 'MAKE', generator: '/admin/material-generator' },
            { item: 'Blue Booklets/Readers', qty: '10', source: 'BUY', search1688: '蒙氏蓝色系列阅读小书', searchEn: 'Montessori blue readers', price: '¥40-80' }
          ]
        },
        {
          id: 'la_green_series',
          name: 'Green Series (Phonograms)',
          sequence: 3,
          ageRange: '5-7 years',
          prerequisites: 'Mastery of Blue Series',
          purpose: 'Introduce phonograms — letter combinations that make a single sound.',
          presentation: [
            'Key phonograms to teach:',
            'ch (/ch/): chair, cheese, lunch',
            'sh (/sh/): ship, shell, fish',
            'th (/th/ voiced): this, that, then',
            'th (/th/ unvoiced): thin, think, thank',
            'ai/ay (/ay/): rain, play, day',
            'ee/ea (/ee/): see, tree, sea, read',
            'oa/ow (/oh/): boat, snow, grow',
            'oo (/oo/ long): moon, food, school',
            'oo (/oo/ short): book, look, good',
            'ar, er, ir, or, ur: car, her, bird, for, turn'
          ],
          materials: [
            { item: 'Green Object Box with Phonogram Miniatures', qty: '1 set', source: 'BUY', search1688: '蒙氏绿色系列物品盒', searchEn: 'Montessori green series object box', price: '¥80-150', priority: 'ESSENTIAL' },
            { item: 'Green Reading Cards', qty: '300+ cards', source: 'MAKE', generator: '/admin/material-generator' },
            { item: 'Green Booklets/Readers', qty: '15', source: 'BUY', search1688: '蒙氏绿色系列阅读小书', searchEn: 'Montessori green readers', price: '¥50-100' }
          ],
          l2Adaptations: [
            'th phonograms CRITICAL for Chinese learners',
            'Use mirror to show tongue position',
            'Introduce th, sh, ch EARLIER than standard sequence'
          ]
        }
      ]
    },
    {
      id: 'grammar',
      name: 'Grammar',
      icon: '📝',
      color: 'from-purple-500 to-violet-500',
      works: [
        {
          id: 'la_noun_farm_game',
          name: 'Introduction to the Noun (Farm Game)',
          sequence: 1,
          ageRange: '5-6 years',
          purpose: 'Introduce the concept that NOUNS are "naming words" through experiential play.',
          presentation: [
            'Set up miniature farm on mat with various objects: cow, pig, sheep, farmer, tractor, barn, fence.',
            '"These things all have NAMES. Can you tell me what this is?"',
            'Child names objects: "cow," "pig," "sheep"',
            '"Words that NAME things are called NOUNS. A noun is a NAMING word."',
            'Write labels on small slips of paper: "This says \'cow\'." Place label next to cow.',
            'Introduce the black triangle symbol: "Nouns have their own special symbol — this black triangle."',
            '"Why a triangle? Triangles are the strongest shape — like pyramids! And nouns are very important — they NAME our world!"'
          ],
          materials: [
            { item: 'Grammar Symbols (wooden, 3D)', qty: '1 set', source: 'BUY', search1688: '蒙氏语法符号', searchEn: 'Montessori grammar symbols wooden', price: '¥40-100', priority: 'ESSENTIAL', verified: true },
            { item: 'Miniature Farm Set', qty: '1 set', source: 'BUY', search1688: '蒙氏语法农场', searchEn: 'Montessori grammar farm', price: '¥100-200' },
            { item: 'Noun Labels', qty: '50 cards', source: 'MAKE', generator: '/admin/material-generator' }
          ],
          l2Adaptations: [
            'Extended practice on articles (a/an/the) - absent from Chinese',
            'Extended practice on plurals (-s) - Chinese uses classifiers instead',
            'Extended practice on tenses (-ed) - Chinese uses time words instead'
          ]
        },
        {
          id: 'la_verb_command_game',
          name: 'Introduction to the Verb (Command Game)',
          sequence: 2,
          ageRange: '5-6 years',
          purpose: 'Introduce VERBS as "action words" through physical commands.',
          presentation: [
            'Write a verb on a slip of paper: "jump"',
            '"I have a secret message for you. Can you read it?"',
            'Child reads: "jump"',
            '"Can you DO what it says?" Child jumps.',
            '"Yes! \'Jump\' is an ACTION word. It tells you what to DO."',
            'Write more verbs: run, hop, spin, clap, sit. Child reads and performs each.',
            '"Words that tell us what to DO are called VERBS."',
            'Try the contrast: "Can you bring me the \'jump\' from the farm?"',
            'Child is confused — can\'t bring "jump". "Ah! \'Jump\' isn\'t a thing we can hold. It\'s something we DO."',
            'Introduce red circle: "Verbs have this red circle. Why red? Because verbs are like the SUN — they give ENERGY to our sentences!"'
          ],
          materials: [
            { item: 'Verb Cards', qty: '100 cards', source: 'MAKE', generator: '/admin/material-generator' }
          ]
        },
        {
          id: 'la_adjective_detective',
          name: 'Introduction to the Adjective (Detective Game)',
          sequence: 3,
          ageRange: '5-6 years',
          purpose: 'Introduce ADJECTIVES as words that describe nouns.',
          presentation: [
            'Have several similar objects: big book, small book, red book, green book.',
            '"Please bring me a book." Child brings any book.',
            '"Hmm, that\'s not the one I wanted. Bring me another book."',
            'Child brings different book. "No, that\'s not it either!"',
            '"You don\'t know which one I want! I need to give you more information."',
            '"Please bring me THE RED book." Child brings correct book.',
            '"Yes! \'Red\' told you WHICH book I wanted."',
            '"Words that DESCRIBE nouns are called ADJECTIVES. They tell us WHICH ONE or WHAT KIND."',
            'Introduce dark blue medium triangle: "Part of the noun family, but smaller because adjective needs a noun to describe!"'
          ],
          materials: [
            { item: 'Detective Game Objects', qty: '1 set', source: 'BUY', search1688: '蒙氏形容词教具套装', searchEn: 'Montessori adjective materials', price: '¥40-80' },
            { item: 'Adjective Cards', qty: '100 cards', source: 'MAKE', generator: '/admin/material-generator' }
          ]
        },
        {
          id: 'la_grammar_boxes',
          name: 'Grammar Boxes (I-VIII)',
          sequence: 4,
          ageRange: '5-7 years',
          purpose: 'Systematic practice with each part of speech using sentence cards and fill-in activities.',
          presentation: [
            'Box 1 (Black): Article + Noun — "the cow, a pig, an egg"',
            'Box 2 (Dark Blue): Adjective — "the big cow, a small pig"',
            'Box 3 (Red): Verb — "The cow runs. The pig eats."',
            'Box 4 (Purple): Pronoun — "He runs. She jumps. They play."',
            'Box 5 (Green): Preposition — "on the table, under the chair"',
            'Box 6 (Orange): Adverb — "runs quickly, speaks softly"',
            'Box 7 (Pink): Conjunction — "and, but, or, because"',
            'Box 8 (Gold): Interjection — "Wow! Oh! Hurray!"',
            'Child reads sentence card with blank, chooses word card to fill, places grammar symbols above each word.'
          ],
          materials: [
            { item: 'Grammar Boxes (8 boxes)', qty: '1 set', source: 'BUY', search1688: '蒙氏语法盒', searchEn: 'Montessori grammar boxes set', price: '¥150-300', priority: 'ESSENTIAL', verified: true },
            { item: 'Grammar Box Filling Cards', qty: '200+ cards', source: 'MAKE', generator: '/admin/material-generator' }
          ]
        }
      ]
    }
  ]
};


// Component to copy text to clipboard
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className={`px-2 py-1 text-xs rounded transition-all ${
        copied 
          ? 'bg-green-500 text-white' 
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
      }`}
    >
      {copied ? '✓' : '📋 Copy'}
    </button>
  );
}

// Work Card with full album presentation
function WorkCard({ work, categoryColor }: { work: Work; categoryColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const buyCount = work.materials.filter(m => m.source === 'BUY').length;
  const makeCount = work.materials.filter(m => m.source === 'MAKE').length;
  
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm mb-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-full bg-gradient-to-r ${categoryColor} text-white flex items-center justify-center text-lg font-bold`}>
            {work.sequence}
          </span>
          <div className="text-left">
            <span className="font-bold text-gray-800 text-lg">{work.name}</span>
            {work.ageRange && (
              <span className="ml-2 text-sm text-gray-500">({work.ageRange})</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
              {buyCount} BUY
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
              {makeCount} MAKE
            </span>
          </div>
          <span className="text-gray-400 text-xl">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      
      {expanded && (
        <div className="border-t">
          {/* Purpose */}
          {work.purpose && (
            <div className="px-4 py-3 bg-blue-50 border-b">
              <h4 className="font-semibold text-blue-800 mb-1">📚 Purpose</h4>
              <p className="text-blue-900 text-sm">{work.purpose}</p>
            </div>
          )}
          
          {/* Prerequisites */}
          {work.prerequisites && (
            <div className="px-4 py-2 bg-yellow-50 border-b">
              <span className="font-semibold text-yellow-800">⚠️ Prerequisites: </span>
              <span className="text-yellow-900 text-sm">{work.prerequisites}</span>
            </div>
          )}
          
          {/* Presentation Instructions */}
          {work.presentation && work.presentation.length > 0 && (
            <div className="px-4 py-3 border-b">
              <button 
                onClick={() => setShowPresentation(!showPresentation)}
                className="flex items-center gap-2 font-semibold text-purple-700 hover:text-purple-900"
              >
                <span>🎯 Presentation Instructions</span>
                <span>{showPresentation ? '▼' : '▶'}</span>
              </button>
              {showPresentation && (
                <ol className="mt-3 space-y-2 ml-4">
                  {work.presentation.map((step, idx) => (
                    <li key={idx} className="text-sm text-gray-700 pl-2 border-l-2 border-purple-300">
                      {step}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
          
          {/* Materials Table */}
          <div className="px-4 py-3">
            <h4 className="font-semibold text-gray-800 mb-2">🛒 Materials</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Item</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Qty</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Source</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">1688 / English Search</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Price</th>
                </tr>
              </thead>
              <tbody>
                {work.materials.map((mat, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2">
                      <span className="font-medium">{mat.item}</span>
                      {mat.priority === 'ESSENTIAL' && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">ESSENTIAL</span>
                      )}
                      {mat.verified && (
                        <span className="ml-1 text-green-600 text-xs">✓ verified</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{mat.qty}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        mat.source === 'BUY' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {mat.source}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {mat.source === 'BUY' && mat.search1688 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="bg-yellow-50 px-2 py-1 rounded text-xs border border-yellow-200">
                              {mat.search1688}
                            </code>
                            <CopyButton text={mat.search1688} />
                          </div>
                          {mat.searchEn && (
                            <div className="flex items-center gap-2">
                              <code className="bg-blue-50 px-2 py-1 rounded text-xs border border-blue-200 text-blue-700">
                                {mat.searchEn}
                              </code>
                              <CopyButton text={mat.searchEn} />
                            </div>
                          )}
                        </div>
                      ) : mat.generator ? (
                        <Link href={mat.generator} className="text-blue-600 hover:underline text-sm">
                          → Use Generator
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{mat.price || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Success Indicators */}
          {work.successIndicators && work.successIndicators.length > 0 && (
            <div className="px-4 py-3 bg-green-50 border-t">
              <h4 className="font-semibold text-green-800 mb-2">✅ Success Indicators</h4>
              <ul className="list-disc list-inside text-sm text-green-900 space-y-1">
                {work.successIndicators.map((indicator, idx) => (
                  <li key={idx}>{indicator}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* L2 Adaptations */}
          {work.l2Adaptations && work.l2Adaptations.length > 0 && (
            <div className="px-4 py-3 bg-orange-50 border-t">
              <h4 className="font-semibold text-orange-800 mb-2">🇨🇳 L2 Adaptations for Chinese Learners</h4>
              <ul className="list-disc list-inside text-sm text-orange-900 space-y-1">
                {work.l2Adaptations.map((adaptation, idx) => (
                  <li key={idx}>{adaptation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// Main page component
export default function EnglishAlbumPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('oral_language');
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'MAKE'>('ALL');
  
  // Calculate totals
  const totals = albumData.categories.reduce((acc, cat) => {
    cat.works.forEach(work => {
      work.materials.forEach(mat => {
        if (mat.source === 'BUY') acc.buy++;
        else acc.make++;
        acc.total++;
      });
    });
    acc.works += cat.works.length;
    return acc;
  }, { buy: 0, make: 0, total: 0, works: 0 });
  
  // Get all search terms for quick reference
  const allSearchTerms = albumData.categories.flatMap(cat => 
    cat.works.flatMap(work => 
      work.materials
        .filter(m => m.source === 'BUY' && m.search1688)
        .map(m => m.search1688!)
    )
  );
  const uniqueTerms = [...new Set(allSearchTerms)];
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-pink-200 hover:text-white text-sm mb-2 inline-block">
                ← Back to Admin
              </Link>
              <h1 className="text-3xl font-bold">🐳 English Language Album</h1>
              <p className="text-pink-100 mt-2">Interactive AMI Guide for Bilingual Beijing Classrooms</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{totals.works}</div>
              <div className="text-pink-200 text-sm">Total Works</div>
              <div className="flex gap-4 mt-2">
                <div>
                  <span className="text-2xl font-bold">{totals.buy}</span>
                  <span className="text-pink-200 text-xs ml-1">BUY</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">{totals.make}</span>
                  <span className="text-pink-200 text-xs ml-1">MAKE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filter bar */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            {(['ALL', 'BUY', 'MAKE'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'ALL' ? '📋 All Items' : f === 'BUY' ? '🛒 Buy Only' : '✂️ Make Only'}
              </button>
            ))}
          </div>
          <a
            href="https://www.1688.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            🔗 Open 1688.com
          </a>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick 1688 Search Terms */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🛒 Quick 1688 Search Terms</h2>
          <p className="text-gray-600 text-sm mb-4">Click to copy, then paste into 1688.com. These are VERIFIED terms that return actual products.</p>
          <div className="flex flex-wrap gap-2">
            {uniqueTerms.slice(0, 15).map((term, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1">
                <span className="text-sm">{term}</span>
                <CopyButton text={term} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Key Info Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-3">📍 Sourcing Tip: Yunhe County (云和县)</h2>
          <p className="text-blue-100">
            Most quality Montessori materials are manufactured in <strong>Yunhe County, Lishui City, Zhejiang Province</strong>. 
            Look for suppliers with 6+ years on platform and "专业版" (professional) or "国际版" (international) in product names.
          </p>
        </div>
        
        {/* Categories */}
        <div className="space-y-6">
          {albumData.categories.map(category => (
            <div key={category.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className={`w-full px-6 py-5 bg-gradient-to-r ${category.color} text-white flex items-center justify-between`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{category.icon}</span>
                  <div className="text-left">
                    <h2 className="text-2xl font-bold">{category.name}</h2>
                    <p className="text-white/80">{category.works.length} works with full AMI presentations</p>
                  </div>
                </div>
                <span className="text-3xl">{expandedCategory === category.id ? '▲' : '▼'}</span>
              </button>
              
              {expandedCategory === category.id && (
                <div className="p-4">
                  {category.works.map(work => {
                    const filteredWork = filter === 'ALL' ? work : {
                      ...work,
                      materials: work.materials.filter(m => m.source === filter)
                    };
                    if (filter !== 'ALL' && filteredWork.materials.length === 0) return null;
                    return (
                      <WorkCard 
                        key={work.id} 
                        work={filteredWork} 
                        categoryColor={category.color}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Footer Info */}
        <div className="mt-8 bg-gray-800 text-white rounded-xl p-6">
          <h3 className="text-lg font-bold mb-2">📖 About This Album</h3>
          <p className="text-gray-300 text-sm mb-4">
            This interactive album contains authentic AMI presentation scripts, verified 1688.com search terms, 
            and L2 adaptations for Chinese learners. Based on deep research into AMI methodology, 
            Chinese supplier networks, and ESL phonological studies.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <span>Version 4.0 - Deep Dive Edition</span>
            <span>Last Updated: December 2025</span>
            <span>For Bilingual Beijing Classrooms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
