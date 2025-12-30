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
}

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
        presentation: [
          'Select basket with 5-6 related objects (e.g., kitchen items)',
          'Invite child to mat',
          'Remove objects one at a time',
          'Three-Period Lesson with 2-3 objects at a time',
          'Always choose objects with contrasting characteristics',
          'Replace objects in basket when finished'
        ],
        materials: [
          {
            name: 'Miniature Object Sets - Animals',
            nameZh: '仿真动物模型',
            search1688: '仿真动物模型 迷你 儿童认知 农场',
            altSearch: '蒙氏语言区 动物小物件',
            specs: 'Realistic miniatures 3-6cm, farm/wild/ocean sets',
            price: '¥40-100 per set',
            essential: true
          },
          {
            name: 'Miniature Object Sets - Fruits & Vegetables',
            nameZh: '仿真水果蔬菜',
            search1688: '仿真水果蔬菜 迷你 过家家',
            specs: 'Realistic miniatures 2-4cm',
            price: '¥30-60',
            essential: true
          },
          {
            name: 'Miniature Object Sets - Vehicles',
            nameZh: '合金车模型',
            search1688: '合金车模型 迷你 认知',
            specs: 'Various vehicle types 3-5cm',
            price: '¥40-80',
            essential: true
          },
          {
            name: 'Miniature Object Sets - Tools',
            nameZh: '迷你工具模型',
            search1688: '迷你工具模型 过家家 认知',
            specs: 'Household/garden tools',
            price: '¥30-50',
            essential: false
          },
          {
            name: 'Miniature Object Sets - Furniture',
            nameZh: '迷你家具模型',
            search1688: '迷你家具模型 娃娃屋',
            specs: 'Household furniture items',
            price: '¥40-80',
            essential: false
          },
          {
            name: 'Sorting/Storage Baskets',
            nameZh: '收纳篮',
            search1688: '藤编收纳篮 小号 幼儿园',
            altSearch: '木质分类篮 蒙氏',
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
        presentation: [
          'FIRST: Single object - "I spy with my little eye something that begins with /f/" (holding fork)',
          'Use phonetic SOUNDS not letter names: /f/ not "eff", /s/ not "ess"',
          'Make success inevitable at first',
          'TWO objects: Place two objects with different starting sounds',
          'Child selects correct one',
          'THREE+ objects: Gradually increase to 5-6 objects',
          'Add descriptive clues: "I spy something you eat that starts with /b/"'
        ],
        materials: [
          {
            name: 'Initial Sound Objects - Complete Set',
            nameZh: '首音小物件全套',
            search1688: '蒙氏语言区字母首音小物件套装',
            altSearch: '蒙氏英文字母小物件 26字母',
            specs: '130+ miniature objects, 4-6 per letter sound, realistic, 1-4cm',
            price: '¥150-300',
            essential: true
          },
          {
            name: 'Sound Sorting Mat',
            nameZh: '分类垫',
            search1688: '蒙氏工作毯 小号',
            specs: 'Small work mat for sorting',
            price: '¥15-30',
            essential: false
          }
        ],
        controlOfError: 'Teacher; object names are phonetically clear',
        pointOfInterest: 'The game format; finding the object',
        extensions: ['Child gives clues to teacher', 'Playing with peers', 'Environmental sounds']
      },
      {
        id: 'i_spy_level2',
        name: 'I Spy Level 2 - Ending Sounds',
        age: '3-4.5 years',
        directAim: 'Train the ear to isolate ending sounds',
        indirectAims: ['Complete phonemic awareness', 'Preparation for spelling'],
        prerequisites: 'Mastery of beginning sounds (8/10 correct)',
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
        presentation: [
          'Select 3 letters: 2 consonants + 1 vowel with contrasting shapes/sounds',
          'Traditional first group: c, m, a, t (allows word building: cat, mat, at)',
          'Sit beside child (same orientation)',
          'Trace letter with index and middle fingers in writing direction',
          'Say SOUND while tracing: "/k/" not "see"',
          'Three-Period Lesson:',
          'Period 1: "This says /k/" (trace), "This says /a/" (trace)',
          'Period 2: "Trace the one that says /k/" (multiple requests with movement)',
          'Period 3: "What does this say?" (only when success assured)',
          'Child practices tracing independently'
        ],
        materials: [
          {
            name: 'Sandpaper Letters - Lowercase Cursive',
            nameZh: '砂纸字母-小写草书',
            search1688: '蒙氏砂纸字母 小写 草书 专业版',
            altSearch: '蒙台梭利 砂字母板 红蓝',
            specs: 'Cursive script, Pink consonants/Blue vowels, Standard 16×12cm, fine-grit sandpaper on HDF',
            price: '¥50-120',
            essential: true
          },
          {
            name: 'Sandpaper Letters - Tall Letters',
            nameZh: '砂纸字母-高字母',
            search1688: '蒙氏砂纸字母 大号',
            specs: 'For b,d,f,h,k,l,t: 19×14cm boards',
            price: 'Usually included in set',
            essential: true
          },
          {
            name: 'Sandpaper Letters - Wide Letters',
            nameZh: '砂纸字母-宽字母',
            search1688: '蒙氏砂纸字母 大号',
            specs: 'For m,w: 19×12cm boards',
            price: 'Usually included in set',
            essential: true
          },
          {
            name: 'Sandpaper Letter Storage Box',
            nameZh: '砂纸字母收纳盒',
            search1688: '蒙氏砂纸字母收纳盒 木质 26格',
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
        presentation: [
          'ORIENTATION:',
          '- Show alphabet box layout',
          '- Vowels in one section (blue), consonants in another (pink)',
          '- Practice finding specific letters',
          '',
          'FIRST WORD BUILDING:',
          '- Place object on mat (e.g., cat)',
          '- "Let\'s build the word cat"',
          '- "What\'s the first sound?" /k/',
          '- "Find the letter that makes /k/"',
          '- Child finds "c", places on mat',
          '- "What\'s the next sound?" /a/',
          '- Child finds "a", places after "c"',
          '- Continue until word complete',
          '- "You wrote cat!"',
          '',
          'KEY: Child is WRITING, not reading'
        ],
        materials: [
          {
            name: 'Large Moveable Alphabet',
            nameZh: '大号活动字母箱',
            search1688: '蒙氏活动字母箱 英文 大号 专业版',
            altSearch: '蒙台梭利 活动字母 红蓝',
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
      }
    ]
  },

  // =========================================================================
  // 9. GRAMMAR
  // =========================================================================
  {
    id: 'grammar',
    name: 'Grammar & Sentence Analysis',
    icon: '🔺',
    sequence: 9,
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
  const [viewMode, setViewMode] = useState<'sequence' | 'shopping'>('sequence');
  const [essentialOnly, setEssentialOnly] = useState(false);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-indigo-200 hover:text-white text-sm mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold">AMI English Language Album</h1>
          <p className="text-indigo-200 mt-1">Complete Montessori literacy curriculum for ages 3-6</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">{curriculumData.length} Categories</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">{totalWorks} Works</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">{allMaterials.length} Materials</span>
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
              viewMode === 'sequence' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📚 Curriculum Sequence
          </button>
          <button
            onClick={() => { setViewMode('shopping'); setSelectedCategory(null); setSelectedWork(null); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'shopping' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🛒 Shopping List ({filteredMaterials.length})
          </button>
          {viewMode === 'shopping' && (
            <label className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={essentialOnly}
                onChange={(e) => setEssentialOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Essential only ({essentialCount})</span>
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
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-bold">Complete Materials List</h2>
              <p className="text-sm text-gray-600">Click any search term to copy for 1688.com</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Material</th>
                    <th className="text-left p-3 font-medium">1688 Search Term</th>
                    <th className="text-left p-3 font-medium">Specifications</th>
                    <th className="text-left p-3 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((mat, i) => (
                    <tr key={i} className={`border-b hover:bg-gray-50 ${mat.essential ? 'bg-green-50/50' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-start gap-2">
                          {mat.essential && <span className="text-green-600 text-xs">★</span>}
                          <div>
                            <div className="font-medium">{mat.name}</div>
                            <div className="text-gray-500 text-xs">{mat.categoryIcon} {mat.categoryName}</div>
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
                      <td className="p-3 text-gray-600 text-xs">{mat.specs}</td>
                      <td className="p-3 font-medium text-green-700">{mat.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SEQUENCE VIEW - Categories */}
        {viewMode === 'sequence' && !selectedCategory && (
          <div className="space-y-4">
            {/* AMI Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-amber-800 mb-1">⚠️ Important AMI Note</h3>
              <p className="text-amber-700 text-sm">
                The Pink/Blue/Green color-coded reading series is NOT official AMI - it was developed by Margaret Homfray and Phoebe Child for English. 
                Authentic AMI uses the Muriel Dwyer approach with cursive script. This guide includes both for practicality, following the sequence used in most English-speaking Montessori schools.
              </p>
            </div>

            {/* Category Cards */}
            {curriculumData.map((category) => (
              <div
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition border-l-4 border-indigo-500"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{category.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">
                        Step {category.sequence}
                      </span>
                      <h2 className="text-xl font-bold">{category.name}</h2>
                    </div>
                    <p className="text-gray-600">{category.description}</p>
                    {category.amiNotes && (
                      <p className="text-amber-600 text-sm mt-2 italic">{category.amiNotes}</p>
                    )}
                    <div className="mt-3 text-sm text-gray-500">
                      {category.works.length} work{category.works.length > 1 ? 's' : ''} • Click to expand
                    </div>
                  </div>
                  <div className="text-gray-400 text-2xl">›</div>
                </div>
              </div>
            ))}

            {/* Grammar Symbols Reference */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
              <h2 className="text-xl font-bold mb-4">🔺 Grammar Symbols Quick Reference</h2>
              <div className="grid md:grid-cols-3 gap-3">
                {grammarSymbols.map((sym) => (
                  <div key={sym.part} className="border rounded-lg p-3">
                    <div className="font-bold text-lg">{sym.part}</div>
                    <div className="text-gray-600 text-sm">{sym.shape}</div>
                    <div className="text-gray-600 text-sm font-medium" style={{color: sym.color.toLowerCase().includes('black') ? '#333' : sym.color.toLowerCase().includes('blue') ? '#3b82f6' : sym.color.toLowerCase().includes('red') ? '#ef4444' : sym.color.toLowerCase().includes('orange') ? '#f97316' : sym.color.toLowerCase().includes('green') ? '#22c55e' : sym.color.toLowerCase().includes('purple') ? '#a855f7' : sym.color.toLowerCase().includes('pink') ? '#ec4899' : sym.color.toLowerCase().includes('gold') ? '#eab308' : '#666'}}>
                      {sym.color}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">{sym.meaning}</div>
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
              className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1"
            >
              ← Back to sequence
            </button>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{selectedCategoryData?.icon}</span>
                <div>
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                    Step {selectedCategoryData?.sequence}
                  </span>
                  <h1 className="text-2xl font-bold">{selectedCategoryData?.name}</h1>
                </div>
              </div>
              <p className="text-gray-600">{selectedCategoryData?.description}</p>
              {selectedCategoryData?.amiNotes && (
                <p className="text-amber-600 text-sm mt-2 bg-amber-50 p-3 rounded-lg">{selectedCategoryData.amiNotes}</p>
              )}
            </div>

            <div className="space-y-3">
              {selectedCategoryData?.works.map((work, index) => (
                <div
                  key={work.id}
                  onClick={() => setSelectedWork(work.id)}
                  className="bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-indigo-100 text-indigo-700 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{work.name}</h3>
                      <p className="text-gray-500 text-sm">Age: {work.age}</p>
                      <p className="text-gray-600 mt-1">{work.directAim}</p>
                      <div className="mt-2 text-sm text-gray-500">
                        {work.materials.length} material{work.materials.length > 1 ? 's' : ''} • Click for full details
                      </div>
                    </div>
                    <div className="text-gray-400 text-xl">›</div>
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
              className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1"
            >
              ← Back to {selectedCategoryData?.name}
            </button>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                    <h3 className="font-bold text-gray-800 mb-2">Direct Aim</h3>
                    <p className="text-gray-600">{selectedWorkData.directAim}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">Indirect Aims</h3>
                    <ul className="text-gray-600 space-y-1">
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
                <div className="bg-amber-50 rounded-lg p-4">
                  <h3 className="font-bold text-amber-800 mb-1">Prerequisites</h3>
                  <p className="text-amber-700">{selectedWorkData.prerequisites}</p>
                </div>

                {/* Presentation */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3">Presentation</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {selectedWorkData.presentation.map((step, i) => (
                      <div key={i} className={`${step.startsWith('GROUP') || step.startsWith('STAGE') || step.startsWith('PRESENTATION') || step.includes(':') && step.split(':')[0].length < 20 && step.split(':')[0] === step.split(':')[0].toUpperCase() ? 'font-bold text-indigo-700 mt-3' : 'text-gray-700'} ${step === '' ? 'h-2' : ''}`}>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-3">Materials & 1688 Search Terms</h3>
                  <div className="space-y-4">
                    {selectedWorkData.materials.filter(m => m.price !== '—' && m.search1688 !== '同上').map((mat, i) => (
                      <div key={i} className={`border rounded-lg p-4 ${mat.essential ? 'border-green-300 bg-green-50/50' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-bold flex items-center gap-2">
                              {mat.name}
                              {mat.essential && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Essential</span>}
                            </div>
                            <div className="text-gray-500 text-sm">{mat.nameZh}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{mat.price}</div>
                          </div>
                        </div>
                        <div className="text-gray-600 text-sm mb-3">{mat.specs}</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(mat.search1688); }}
                          className="w-full text-left bg-white border rounded-lg p-3 hover:bg-indigo-50 transition"
                        >
                          <div className="text-indigo-600 font-medium">{mat.search1688}</div>
                          {mat.altSearch && (
                            <div className="text-gray-400 text-sm mt-1">Alternative: {mat.altSearch}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-2">
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
                    <h3 className="font-bold text-gray-800 mb-2">Control of Error</h3>
                    <p className="text-gray-600">{selectedWorkData.controlOfError}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 mb-2">Point of Interest</h3>
                    <p className="text-gray-600">{selectedWorkData.pointOfInterest}</p>
                  </div>
                </div>

                {/* Extensions */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Extensions</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorkData.extensions.map((ext, i) => (
                      <span key={i} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                        {ext}
                      </span>
                    ))}
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
