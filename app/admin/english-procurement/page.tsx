'use client';

import { useState } from 'react';
import Link from 'next/link';

// AMI Language Curriculum - Complete Sequence for Ages 3-6
// Based on authentic AMI standards and Muriel Dwyer approach

interface Material {
  name: string;
  nameZh: string;
  search1688: string;
  specs: string;
  price: string;
}

interface Work {
  id: string;
  name: string;
  age: string;
  purpose: string;
  prerequisites: string;
  presentation: string[];
  materials: Material[];
  controlOfError: string;
  successIndicators: string[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  sequence: number;
  description: string;
  works: Work[];
}

const curriculumData: Category[] = [
  {
    id: 'oral_language',
    name: 'Oral Language Foundation',
    icon: '🗣️',
    sequence: 1,
    description: 'Vocabulary development through real objects, then pictures, then words. Foundation for all literacy.',
    works: [
      {
        id: 'vocabulary_baskets',
        name: 'Vocabulary Baskets',
        age: '2.5-4 years',
        purpose: 'Build vocabulary through classified real objects. Move from concrete to abstract.',
        prerequisites: 'None - entry point',
        presentation: [
          'Select basket with 5-6 related objects (e.g., fruits, animals)',
          'Three-Period Lesson: "This is an apple" (naming)',
          '"Show me the banana" (recognition - spend most time here)',
          '"What is this?" (recall - only when success assured)',
          'Introduce 2-3 items at a time with contrasting characteristics'
        ],
        materials: [
          {
            name: 'Vocabulary Object Sets',
            nameZh: '认知小物件套装',
            search1688: '蒙氏语言区 认知小物件 分类',
            specs: '10+ categories, realistic miniatures 2-5cm',
            price: '¥80-200'
          },
          {
            name: 'Sorting Baskets',
            nameZh: '分类收纳篮',
            search1688: '木质分类篮 蒙氏 幼儿园',
            specs: 'Natural wood or wicker, 10-15cm diameter',
            price: '¥15-40 each'
          }
        ],
        controlOfError: 'Teacher guidance; objects are self-evident',
        successIndicators: [
          'Child names objects without prompting',
          'Child categorizes objects independently',
          'Child uses words in conversation'
        ]
      },
      {
        id: 'three_part_cards',
        name: 'Three-Part Cards (Classified Cards)',
        age: '3-5 years',
        purpose: 'Bridge from concrete objects to abstract words. Pictures connect real world to symbols.',
        prerequisites: 'Vocabulary baskets with same category',
        presentation: [
          'Start with control cards only (picture + label combined)',
          'Three-Period Lesson with pictures as with objects',
          'Later: match separate picture cards to control cards',
          'After sandpaper letters: match label cards to pictures',
          'Child sounds out word, matches, checks with control'
        ],
        materials: [
          {
            name: 'Three-Part Card Sets',
            nameZh: '蒙氏三部卡',
            search1688: '蒙氏三部卡 语言区 专业版',
            specs: 'Control: 9.5×10.8cm, Picture: 9.5×7.6cm, Label: 9.5×3.2cm',
            price: '¥20-60 per set'
          },
          {
            name: 'Card Storage Box',
            nameZh: '卡片收纳盒',
            search1688: '木质卡片收纳盒 分格 蒙氏',
            specs: 'Compartmentalized wood box',
            price: '¥30-80'
          }
        ],
        controlOfError: 'Control card for self-checking',
        successIndicators: [
          'Child matches all pictures correctly',
          'Child reads labels independently',
          'Child creates own card sets'
        ]
      }
    ]
  },
  {
    id: 'sound_games',
    name: 'Sound Games (I Spy)',
    icon: '👂',
    sequence: 2,
    description: 'Develop phonemic awareness BEFORE any written symbols. Critical foundation - must complete all 4 levels.',
    works: [
      {
        id: 'i_spy_beginning',
        name: 'I Spy - Beginning Sounds',
        age: '2.5-4 years',
        purpose: 'Train ear to isolate beginning sounds in words. First step to phonemic awareness.',
        prerequisites: 'Vocabulary of 100+ words',
        presentation: [
          'Start with ONE obvious object: "I spy something that starts with /f/" (fork)',
          'Use phonetic SOUNDS not letter names (/f/ not "eff")',
          'Progress to 2-3 objects on mat',
          'Make success inevitable at first',
          'Gradually increase difficulty with similar starting sounds'
        ],
        materials: [
          {
            name: 'Initial Sound Objects',
            nameZh: '首音小物件套装',
            search1688: '蒙氏语言区字母首音小物件套装',
            specs: '130+ miniature objects, 4-5 per letter sound',
            price: '¥150-300'
          },
          {
            name: 'Sound Sorting Trays',
            nameZh: '分类托盘',
            search1688: '木质分类托盘 蒙氏教具',
            specs: '3-6 compartments, natural wood',
            price: '¥25-50'
          }
        ],
        controlOfError: 'Teacher; object names are phonetically clear',
        successIndicators: [
          'Child identifies beginning sound 8/10 times',
          'Child spontaneously says "That starts with /m/!"',
          'Child asks to play the game'
        ]
      },
      {
        id: 'i_spy_ending',
        name: 'I Spy - Ending Sounds',
        age: '3-4.5 years',
        purpose: 'Extend phonemic awareness to ending sounds.',
        prerequisites: 'Mastery of beginning sounds',
        presentation: [
          '"I spy something that ENDS with /t/" (cat)',
          'Use same objects as beginning sounds practice',
          'Progress to identifying both: "starts with /c/ and ends with /t/"'
        ],
        materials: [
          {
            name: 'Same objects as Beginning Sounds',
            nameZh: '同上',
            search1688: '蒙氏语言区字母首音小物件套装',
            specs: 'Same set - no additional purchase needed',
            price: '—'
          }
        ],
        controlOfError: 'Teacher guidance',
        successIndicators: [
          'Child identifies ending sounds accurately',
          'Child can do beginning AND ending in one game'
        ]
      },
      {
        id: 'i_spy_segmenting',
        name: 'I Spy - Full Segmenting',
        age: '3.5-5 years',
        purpose: 'Segment ALL sounds in words. Final step before Moveable Alphabet.',
        prerequisites: 'Mastery of beginning and ending sounds',
        presentation: [
          '"Tell me ALL the sounds in cat" → Child: "/k/ /a/ /t/"',
          'Start with 3-sound CVC words',
          'Present sounds in order: beginning → ending → middle',
          'Progress to 4+ sound words',
          'READY FOR MOVEABLE ALPHABET when mastered'
        ],
        materials: [
          {
            name: 'CVC Object Set',
            nameZh: 'CVC词汇物件',
            search1688: '蒙氏语言区 CVC 小物件',
            specs: 'Objects with clear 3-sound names: cat, dog, sun, pig',
            price: '¥50-100'
          }
        ],
        controlOfError: 'Teacher; clear pronunciation',
        successIndicators: [
          'Child segments any 3-sound word correctly',
          'Child segments 4+ sound words',
          'Child is ready for Moveable Alphabet'
        ]
      }
    ]
  },
  {
    id: 'sandpaper_letters',
    name: 'Sandpaper Letters',
    icon: '✋',
    sequence: 3,
    description: 'Connect sounds to written symbols through touch. Cursive lowercase. Pink=consonants, Blue=vowels, Green=phonograms.',
    works: [
      {
        id: 'sandpaper_letters_single',
        name: 'Sandpaper Letters - Single Letters',
        age: '3-4.5 years',
        purpose: 'Associate phonetic sounds with written symbols through tactile experience.',
        prerequisites: 'Sound Games Level 1 (beginning sounds)',
        presentation: [
          'Present 3 letters: 2 consonants + 1 vowel (contrasting shapes)',
          'Traditional first group: c, m, a, t (allows immediate word building)',
          'Trace with index and middle fingers in writing direction',
          'Say the SOUND (not name) while tracing: "/k/" not "see"',
          'Three-Period Lesson with tracing',
          'Child traces independently after lesson'
        ],
        materials: [
          {
            name: 'Sandpaper Letters - Lowercase',
            nameZh: '砂纸字母板',
            search1688: '蒙氏砂纸字母 小写 专业版',
            specs: 'Cursive, Pink consonants/Blue vowels, 16×12cm standard, fine-grit sandpaper',
            price: '¥40-100'
          },
          {
            name: 'Sandpaper Letters Box',
            nameZh: '砂纸字母收纳盒',
            search1688: '蒙氏砂纸字母收纳盒 木质',
            specs: 'Compartmentalized wood storage',
            price: '¥30-60'
          }
        ],
        controlOfError: 'Tactile - sandpaper feels different from smooth board',
        successIndicators: [
          'Child traces correctly without guidance',
          'Child says sound while tracing',
          'Child recognizes letters in environment'
        ]
      },
      {
        id: 'sandpaper_phonograms',
        name: 'Sandpaper Letters - Phonograms',
        age: '4-5.5 years',
        purpose: 'Introduce digraphs and phonograms as single sounds.',
        prerequisites: 'Most single letters mastered',
        presentation: [
          'Present phonograms as ONE sound: "This says /sh/"',
          'Same technique as single letters',
          'Common phonograms: sh, ch, th, ar, or, oa, ie, ai, ee, oo, ou'
        ],
        materials: [
          {
            name: 'Phonogram Sandpaper Letters',
            nameZh: '双字母砂纸板',
            search1688: '蒙台蒙特梭利 双字母砂纸板 绿色',
            specs: 'Green boards, 15+ phonograms',
            price: '¥30-60'
          }
        ],
        controlOfError: 'Tactile feedback',
        successIndicators: [
          'Child recognizes phonograms as single sounds',
          'Child uses phonograms in word building'
        ]
      }
    ]
  },
  {
    id: 'sand_tray',
    name: 'Sand Tray Writing',
    icon: '🏖️',
    sequence: 4,
    description: 'Practice letter formation with immediate tactile feedback. No permanence allows free experimentation.',
    works: [
      {
        id: 'sand_tray_writing',
        name: 'Sand Tray',
        age: '3.5-5 years',
        purpose: 'Practice letter formation with kinesthetic feedback. Allows self-correction without permanence.',
        prerequisites: 'Sandpaper letters introduction',
        presentation: [
          'Child traces sandpaper letter first',
          'Immediately writes same letter in sand',
          'Use wooden stylus or finger',
          'Smooth sand with wooden smoother to try again',
          'No right/wrong - encourages experimentation'
        ],
        materials: [
          {
            name: 'Sand Tray with Tools',
            nameZh: '书写沙盘套装',
            search1688: '刮沙盒 蒙氏 书写练习',
            specs: 'Wood tray, stylus 14cm, smoother 27cm',
            price: '¥40-80'
          },
          {
            name: 'Fine Sand',
            nameZh: '细沙',
            search1688: '彩色沙子 白色 细沙 儿童',
            specs: 'Fine white sand, 1-2kg',
            price: '¥15-30'
          }
        ],
        controlOfError: 'Visual - child compares to sandpaper letter',
        successIndicators: [
          'Child forms letters correctly',
          'Child self-corrects without prompting',
          'Child writes letters from memory'
        ]
      }
    ]
  },
  {
    id: 'metal_insets',
    name: 'Metal Insets',
    icon: '📐',
    sequence: 5,
    description: 'Prepare hand for writing through design work. 10 shapes, 10 presentations. Daily practice recommended.',
    works: [
      {
        id: 'metal_insets_work',
        name: 'Metal Insets - Complete Set',
        age: '3.5-6 years',
        purpose: 'Develop pencil control, proper grip, continuous strokes. Direct preparation for handwriting.',
        prerequisites: 'Fine motor readiness',
        presentation: [
          '1. Trace frame only, fill with horizontal lines',
          '2. Trace frame, add vertical lines inside',
          '3. Trace both frame AND inset (double outline)',
          '4. Use frame with DIFFERENT inset shape',
          '5. Fill shapes with zigzag lines',
          '6. Fill shapes with wavy lines',
          '7. Shading/gradation (light to dark pressure)',
          '8. Superimpose multiple shapes',
          '9. Creative designs combining shapes',
          '10. Complex artistic designs'
        ],
        materials: [
          {
            name: 'Metal Insets - 10 Shapes',
            nameZh: '金属嵌板',
            search1688: '蒙氏铁制几何嵌板教具 专业版',
            specs: 'Pink frames, blue insets, 14×14cm each. Shapes: square, rectangle, triangle, pentagon, trapezoid, circle, oval, ellipse, curvilinear triangle, quatrefoil',
            price: '¥150-350'
          },
          {
            name: 'Metal Inset Stand',
            nameZh: '嵌板架',
            search1688: '蒙氏嵌板架 木质',
            specs: '65cm × 16cm, holds 5 shapes per stand',
            price: '¥40-80'
          },
          {
            name: 'Inset Paper',
            nameZh: '嵌板纸',
            search1688: '白卡纸 14厘米 正方形',
            specs: '14×14cm, 20lb bond, white/colors',
            price: '¥20-50 per 500'
          },
          {
            name: 'Triangular Colored Pencils',
            nameZh: '三角彩色铅笔',
            search1688: '彩色铅笔 粗杆 12色 幼儿 三角',
            specs: '3-sided grip, 3.8mm lead, 11 colors',
            price: '¥30-60'
          },
          {
            name: 'Pencil Holders',
            nameZh: '铅笔筒',
            search1688: '蒙氏铅笔筒 12孔 木质',
            specs: '11 colors, 12 pencils per holder',
            price: '¥40-80 set'
          }
        ],
        controlOfError: 'Visual - staying within lines, line quality',
        successIndicators: [
          'Child maintains proper pencil grip',
          'Lines are smooth and continuous',
          'Child completes all 10 presentations',
          'Child creates complex original designs'
        ]
      }
    ]
  },
  {
    id: 'moveable_alphabet',
    name: 'Moveable Alphabet',
    icon: '🔤',
    sequence: 6,
    description: 'Writing before reading. Child builds words from sounds WITHOUT fine motor demand of pencil.',
    works: [
      {
        id: 'moveable_alphabet_work',
        name: 'Large Moveable Alphabet',
        age: '4-5.5 years',
        purpose: 'Compose words by selecting letters for sounds heard. Writing (encoding) before reading (decoding).',
        prerequisites: 'Sound Games Level 4 (full segmenting) + Most sandpaper letters',
        presentation: [
          'Orientation: familiarize with box layout',
          'Build words for CVC objects: "Build cat" (child segments: /k/-/a/-/t/)',
          'Child selects each letter from box',
          'Arrange left to right on mat',
          'Progress: Objects → Pictures → Word lists → Phrases → Sentences'
        ],
        materials: [
          {
            name: 'Large Moveable Alphabet',
            nameZh: '大号活动字母箱',
            search1688: '蒙氏活动字母箱 英文 专业版',
            specs: 'Cursive, pink consonants (10 each), blue vowels (15 each), 2-layer wood box',
            price: '¥100-250'
          },
          {
            name: 'Small Moveable Alphabet',
            nameZh: '小号活动字母',
            search1688: '蒙氏小号活动字母 英文',
            specs: 'For phonogram work, black/red, smaller size',
            price: '¥60-120'
          }
        ],
        controlOfError: 'Teacher initially; later picture cards with words on back',
        successIndicators: [
          'Child builds 3-letter words independently',
          'Child builds words from pictures without objects',
          'Child builds phrases and sentences',
          'Child begins to READ words built'
        ]
      }
    ]
  },
  {
    id: 'object_boxes',
    name: 'Object Boxes & Reading',
    icon: '📦',
    sequence: 7,
    description: 'Transition from writing to reading. Pink (CVC) → Blue (blends) → Green (phonograms).',
    works: [
      {
        id: 'pink_series',
        name: 'Pink Series (CVC Words)',
        age: '4-5 years',
        purpose: 'First reading - simple 3-letter phonetic words with short vowels.',
        prerequisites: 'Moveable Alphabet - building CVC words',
        presentation: [
          'Pink Object Box: Match miniature objects to word labels',
          'Pink Picture Cards: Match pictures to word cards',
          'Pink Word Lists: Read lists of CVC words',
          'Pink Booklets: Simple sentences',
          'Pink Phrase Cards: 2-3 word phrases'
        ],
        materials: [
          {
            name: 'Pink Object Box',
            nameZh: 'CVC词汇盒',
            search1688: '蒙氏语言区 粉色系列 CVC物件',
            specs: '26+ miniature objects with word labels',
            price: '¥80-150'
          },
          {
            name: 'Pink Picture Word Cards',
            nameZh: '粉色图文卡',
            search1688: '蒙氏三部卡 CVC 粉色系列',
            specs: '3×3 inch cards, picture + word',
            price: '¥30-60'
          },
          {
            name: 'Pink Booklets',
            nameZh: '粉色阅读小书',
            search1688: '蒙氏阅读小书 粉色 CVC',
            specs: 'Simple sentence readers',
            price: '¥20-40'
          }
        ],
        controlOfError: 'Picture or object for self-checking',
        successIndicators: [
          'Child reads CVC words fluently',
          'Child matches all objects/pictures correctly',
          'Child reads pink booklets independently'
        ]
      },
      {
        id: 'blue_series',
        name: 'Blue Series (Consonant Blends)',
        age: '4.5-5.5 years',
        purpose: '4+ letter words with consonant blends. Still short vowels.',
        prerequisites: 'Pink Series mastery',
        presentation: [
          'Same progression as Pink but with blends',
          'CCVC: frog, crab, stamp',
          'CVCC: lamp, bend, milk',
          'Blue Object Box → Pictures → Lists → Booklets'
        ],
        materials: [
          {
            name: 'Blue Object Box',
            nameZh: '蓝色系列物件盒',
            search1688: '蒙氏语言区 蓝色系列 辅音组合',
            specs: 'Objects for blend words',
            price: '¥80-150'
          },
          {
            name: 'Blue Picture Word Cards',
            nameZh: '蓝色图文卡',
            search1688: '蒙氏三部卡 蓝色系列 辅音',
            specs: 'Cards for blend words',
            price: '¥30-60'
          }
        ],
        controlOfError: 'Self-checking with pictures',
        successIndicators: [
          'Child reads blend words fluently',
          'Child identifies blends in new words'
        ]
      },
      {
        id: 'green_series',
        name: 'Green Series (Phonograms)',
        age: '5-6 years',
        purpose: 'Words with digraphs and complex vowel patterns.',
        prerequisites: 'Blue Series + Phonogram sandpaper letters',
        presentation: [
          'Organized by phonogram pattern',
          'sh words, ch words, th words',
          'Long vowel patterns: ai, ee, oa, ie',
          'Word family folders: -ight, -ough, etc.'
        ],
        materials: [
          {
            name: 'Green Phonogram Cards',
            nameZh: '绿色音组卡',
            search1688: '蒙氏语言区 绿色系列 音组',
            specs: 'Cards organized by phonogram',
            price: '¥40-80 per set'
          },
          {
            name: 'Phonogram Word Lists',
            nameZh: '音组词表',
            search1688: '蒙氏音组词表 绿色系列',
            specs: 'Lists organized by pattern',
            price: '¥20-40'
          }
        ],
        controlOfError: 'Word family organization',
        successIndicators: [
          'Child reads phonogram words',
          'Child identifies patterns in new words',
          'Child reads complex sentences'
        ]
      }
    ]
  },
  {
    id: 'grammar',
    name: 'Grammar Symbols',
    icon: '🔺',
    sequence: 8,
    description: 'Parts of speech through movement and symbols. Experiential introduction before analysis.',
    works: [
      {
        id: 'function_of_words',
        name: 'Function of Words Games',
        age: '4.5-5.5 years',
        purpose: 'Experience parts of speech through action BEFORE symbols.',
        prerequisites: 'Reading simple sentences',
        presentation: [
          'NOUN: "Bring me the pencil" game (black triangle)',
          'ARTICLE: "Bring me A pencil" vs "THE pencil"',
          'ADJECTIVE: "Bring me the RED pencil"',
          'VERB: Act out action words (red circle)',
          'ADVERB: "Walk slowly" / "Walk quickly"',
          'All start as movement games before cards'
        ],
        materials: [
          {
            name: '3D Grammar Symbols',
            nameZh: '立体语法符号',
            search1688: '蒙氏立体语法符号 木质',
            specs: '10 painted wood shapes, beechwood tray 47×21×11cm',
            price: '¥80-150'
          },
          {
            name: '2D Grammar Symbols',
            nameZh: '平面语法符号',
            search1688: '蒙氏平面语法符号盒 专业版',
            specs: 'Glossy paper cutouts, 100 per type',
            price: '¥40-80'
          },
          {
            name: 'Grammar Command Cards',
            nameZh: '语法指令卡',
            search1688: '蒙氏语法指令卡 英文',
            specs: 'Cards for grammar games',
            price: '¥30-60'
          }
        ],
        controlOfError: 'Meaning - commands make sense or don\'t',
        successIndicators: [
          'Child identifies nouns, verbs, adjectives in sentences',
          'Child uses correct symbols',
          'Child creates own sentences and labels parts'
        ]
      },
      {
        id: 'sentence_analysis',
        name: 'Sentence Analysis',
        age: '5-6 years',
        purpose: 'Analyze sentence structure - subject, predicate, objects.',
        prerequisites: 'Function of Words games',
        presentation: [
          'Identify subject and predicate',
          'Use analysis chart with arrows',
          'Questions: "Who/What?" for subject, "What doing?" for predicate',
          'Progress to direct and indirect objects'
        ],
        materials: [
          {
            name: 'Sentence Analysis Chart',
            nameZh: '句子分析图',
            search1688: '蒙氏句子分析图 英文',
            specs: 'Chart with arrows and circles',
            price: '¥40-80'
          },
          {
            name: 'Grammar Boxes',
            nameZh: '语法盒',
            search1688: '蒙氏语法盒 英文 全套',
            specs: '9 boxes for sentence work',
            price: '¥150-300'
          }
        ],
        controlOfError: 'Meaning verification',
        successIndicators: [
          'Child identifies subject and predicate',
          'Child uses analysis chart independently',
          'Child analyzes complex sentences'
        ]
      }
    ]
  }
];

// Grammar symbol reference
const grammarSymbols = [
  { part: 'Noun', shape: 'Large triangle', color: 'Black', meaning: 'Pyramid - solid, stable' },
  { part: 'Article', shape: 'Small triangle', color: 'Light blue', meaning: 'Announces the noun' },
  { part: 'Adjective', shape: 'Medium triangle', color: 'Dark blue', meaning: 'Describes noun' },
  { part: 'Verb', shape: 'Large circle', color: 'Red', meaning: 'Sun - energy, action' },
  { part: 'Adverb', shape: 'Small circle', color: 'Orange', meaning: 'Modifies verb' },
  { part: 'Preposition', shape: 'Crescent', color: 'Green', meaning: 'Shows relationship' },
  { part: 'Pronoun', shape: 'Tall triangle', color: 'Purple', meaning: 'Stands for noun' },
  { part: 'Conjunction', shape: 'Rectangle', color: 'Pink', meaning: 'Connects' },
  { part: 'Interjection', shape: 'Keyhole', color: 'Gold', meaning: 'Emotion' }
];

export default function EnglishProcurementPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);
  const [showAllMaterials, setShowAllMaterials] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTerm(text);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  // Collect all materials for shopping list view
  const allMaterials = curriculumData.flatMap(cat =>
    cat.works.flatMap(work =>
      work.materials.map(mat => ({
        ...mat,
        category: cat.name,
        work: work.name
      }))
    )
  ).filter((mat, index, self) =>
    index === self.findIndex(m => m.search1688 === mat.search1688)
  );

  const selectedCategoryData = selectedCategory
    ? curriculumData.find(c => c.id === selectedCategory)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/admin" className="text-indigo-200 hover:text-white text-sm mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold">AMI English Language Album</h1>
          <p className="text-indigo-200 mt-1">Complete curriculum for ages 3-6 with 1688 sourcing</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setSelectedCategory(null); setShowAllMaterials(false); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              !selectedCategory && !showAllMaterials
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📚 Full Sequence
          </button>
          <button
            onClick={() => { setSelectedCategory(null); setShowAllMaterials(true); }}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              showAllMaterials
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🛒 Shopping List ({allMaterials.length} items)
          </button>
        </div>

        {/* Shopping List View */}
        {showAllMaterials && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Complete Materials List</h2>
            <p className="text-gray-600 mb-6">Click any Chinese term to copy for 1688.com search</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Material</th>
                    <th className="text-left p-3">1688 Search Term</th>
                    <th className="text-left p-3">Specs</th>
                    <th className="text-left p-3">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {allMaterials.map((mat, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{mat.name}</div>
                        <div className="text-gray-500 text-xs">{mat.category}</div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => copyToClipboard(mat.search1688)}
                          className="text-left hover:bg-indigo-50 p-2 rounded transition group"
                        >
                          <div className="font-medium text-indigo-600">{mat.search1688}</div>
                          <div className="text-gray-500 text-xs">{mat.nameZh}</div>
                          <span className="text-xs text-gray-400 group-hover:text-indigo-500">
                            {copiedTerm === mat.search1688 ? '✓ Copied!' : 'Click to copy'}
                          </span>
                        </button>
                      </td>
                      <td className="p-3 text-gray-600">{mat.specs}</td>
                      <td className="p-3 font-medium">{mat.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sequence View */}
        {!showAllMaterials && !selectedCategory && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-yellow-800">⚠️ AMI Note</h3>
              <p className="text-yellow-700 text-sm">
                The Pink/Blue/Green color system is NOT official AMI - it was created by Homfray & Child for English. 
                Authentic AMI uses the Muriel Dwyer approach with cursive script. This guide includes both for practicality.
              </p>
            </div>

            {curriculumData.map((category) => (
              <div
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="bg-white rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-md transition border-l-4 border-indigo-500"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{category.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                        Step {category.sequence}
                      </span>
                      <h2 className="text-xl font-bold">{category.name}</h2>
                    </div>
                    <p className="text-gray-600 mt-1">{category.description}</p>
                    <div className="mt-3 text-sm text-gray-500">
                      {category.works.length} work{category.works.length > 1 ? 's' : ''} • 
                      Click to see presentations & materials
                    </div>
                  </div>
                  <div className="text-gray-400">→</div>
                </div>
              </div>
            ))}

            {/* Grammar Symbols Reference */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
              <h2 className="text-xl font-bold mb-4">🔺 Grammar Symbols Reference</h2>
              <div className="grid grid-cols-3 gap-3">
                {grammarSymbols.map((sym) => (
                  <div key={sym.part} className="border rounded-lg p-3 text-sm">
                    <div className="font-bold">{sym.part}</div>
                    <div className="text-gray-600">{sym.shape} • {sym.color}</div>
                    <div className="text-gray-500 text-xs">{sym.meaning}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Detail View */}
        {selectedCategoryData && !showAllMaterials && (
          <div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1"
            >
              ← Back to sequence
            </button>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{selectedCategoryData.icon}</span>
                <div>
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                    Step {selectedCategoryData.sequence}
                  </span>
                  <h1 className="text-2xl font-bold">{selectedCategoryData.name}</h1>
                </div>
              </div>
              <p className="text-gray-600">{selectedCategoryData.description}</p>
            </div>

            <div className="space-y-6">
              {selectedCategoryData.works.map((work) => (
                <div key={work.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <h2 className="text-lg font-bold">{work.name}</h2>
                    <div className="text-sm text-gray-500">Age: {work.age}</div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Purpose & Prerequisites */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-bold text-gray-700 mb-1">Purpose</h3>
                        <p className="text-gray-600">{work.purpose}</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-700 mb-1">Prerequisites</h3>
                        <p className="text-gray-600">{work.prerequisites}</p>
                      </div>
                    </div>

                    {/* Presentation */}
                    <div>
                      <h3 className="font-bold text-gray-700 mb-2">Presentation</h3>
                      <ol className="list-decimal list-inside space-y-1 text-gray-600">
                        {work.presentation.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Materials */}
                    <div>
                      <h3 className="font-bold text-gray-700 mb-2">Materials & 1688 Search Terms</h3>
                      <div className="space-y-3">
                        {work.materials.map((mat, i) => (
                          <div key={i} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{mat.name}</div>
                                <div className="text-sm text-gray-500">{mat.specs}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-green-600">{mat.price}</div>
                              </div>
                            </div>
                            {mat.search1688 !== '同上' && mat.price !== '—' && (
                              <button
                                onClick={() => copyToClipboard(mat.search1688)}
                                className="mt-2 w-full text-left bg-white border rounded-lg p-2 hover:bg-indigo-50 transition"
                              >
                                <div className="text-indigo-600 font-medium">{mat.search1688}</div>
                                <div className="text-xs text-gray-400">
                                  {copiedTerm === mat.search1688 ? '✓ Copied!' : 'Click to copy for 1688.com'}
                                </div>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Success Indicators */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-bold text-gray-700 mb-1">Control of Error</h3>
                        <p className="text-gray-600">{work.controlOfError}</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-700 mb-1">Success Indicators</h3>
                        <ul className="list-disc list-inside text-gray-600">
                          {work.successIndicators.map((ind, i) => (
                            <li key={i}>{ind}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
