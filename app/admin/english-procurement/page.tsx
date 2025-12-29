'use client';

import { useState } from 'react';
import Link from 'next/link';

// Type definitions
interface Material {
  item: string;
  qty: string;
  source: 'BUY' | 'MAKE';
  search1688?: string;
  searchAlt?: string;
  price?: string;
  generator?: string;
  priority?: string;
}

interface Work {
  id: string;
  name: string;
  sequence: number;
  materials: Material[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  works: Work[];
}

// Import procurement data (we'll add this inline for simplicity)
const procurementData: { categories: Category[] } = {
  categories: [
    {
      id: 'oral_language',
      name: 'Oral Language Development',
      icon: '🗣️',
      color: 'from-pink-500 to-rose-500',
      works: [
        { id: 'la_enrichment_vocabulary', name: 'Vocabulary Enrichment', sequence: 1, materials: [
          { item: 'Miniature Real Objects Set', qty: '50+ items', source: 'BUY', search1688: '蒙特梭利语言区实物教具套装', searchAlt: '早教认知仿真模型套装', price: '¥80-150' },
          { item: 'Vocabulary Picture Cards', qty: '200+ cards', source: 'MAKE', generator: '/admin/card-generator' },
          { item: 'Picture Vocabulary Books', qty: '10-15 books', source: 'BUY', search1688: '幼儿英语认知绘本套装', price: '¥50-100' }
        ]},
        { id: 'la_classified_cards', name: 'Classified Cards', sequence: 2, materials: [
          { item: 'Wooden Card Storage Boxes', qty: '5 boxes', source: 'BUY', search1688: '蒙氏教具木质卡片收纳盒', price: '¥25-50/ea' },
          { item: 'Animal/Plant/Vehicle Cards', qty: '180+ cards', source: 'MAKE', generator: '/admin/card-generator' }
        ]},
        { id: 'la_object_picture_matching', name: 'Object to Picture Matching', sequence: 3, materials: [
          { item: 'Miniature Object Set', qty: '30-50 objects', source: 'BUY', search1688: '蒙氏语言区迷你仿真模型套装', price: '¥60-120' },
          { item: 'Wooden Presentation Trays', qty: '3 trays', source: 'BUY', search1688: '蒙氏教具木质托盘', price: '¥15-30/ea' },
          { item: 'Matching Picture Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/card-generator' }
        ]},
        { id: 'la_sound_games', name: 'Sound Games (I Spy)', sequence: 4, materials: [
          { item: 'Initial Sound Objects (26 letters)', qty: '130+ objects', source: 'BUY', search1688: '蒙氏语言区字母首音小物件套装', price: '¥150-300', priority: 'ESSENTIAL' },
          { item: 'Sound Sorting Baskets', qty: '10 baskets', source: 'BUY', search1688: '蒙氏教具藤编小篮子', price: '¥30-60' },
          { item: 'Letter Sound Cards', qty: '26 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_rhyming', name: 'Rhyming Activities', sequence: 5, materials: [
          { item: 'Rhyming Object Pairs', qty: '20 pairs', source: 'BUY', search1688: '蒙氏押韵配对小物件', price: '¥50-100' },
          { item: 'Rhyming Picture Cards', qty: '60 cards', source: 'MAKE', generator: '/admin/card-generator' }
        ]},
        { id: 'la_storytelling', name: 'Storytelling & Sequencing', sequence: 6, materials: [
          { item: 'Story Sequence Cards', qty: '10 sets', source: 'BUY', search1688: '儿童故事排序卡片', price: '¥40-80' },
          { item: 'Story Props/Puppets', qty: '1 set', source: 'BUY', search1688: '幼儿园故事手偶套装', price: '¥50-100' },
          { item: 'Felt Story Board', qty: '1 board', source: 'BUY', search1688: '毛毡故事板幼儿园', price: '¥30-60' }
        ]},
        { id: 'la_poems_songs', name: 'Poems, Songs, Fingerplays', sequence: 7, materials: [
          { item: 'Song/Poem Chart Stand', qty: '1 stand', source: 'BUY', search1688: '幼儿园歌曲展示架', price: '¥50-100' },
          { item: 'Poetry & Fingerplay Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/card-generator' }
        ]},
        { id: 'la_conversation', name: 'Conversation & Discussion', sequence: 8, materials: [
          { item: 'Discussion Prompt Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/card-generator' },
          { item: 'Sharing Basket', qty: '1 basket', source: 'BUY', search1688: '幼儿园分享物品篮', price: '¥20-40' }
        ]}
      ]
    },
    {
      id: 'writing_prep',
      name: 'Writing Preparation',
      icon: '✏️',
      color: 'from-blue-500 to-indigo-500',
      works: [
        { id: 'la_metal_insets', name: 'Metal Insets', sequence: 1, materials: [
          { item: 'Metal Insets Set (10 shapes)', qty: '1 set', source: 'BUY', search1688: '蒙特梭利金属嵌板10件套', price: '¥150-300', priority: 'ESSENTIAL' },
          { item: 'Metal Inset Stand', qty: '1 stand', source: 'BUY', search1688: '蒙氏金属嵌板架子', price: '¥50-100' },
          { item: 'Colored Pencils', qty: '2 sets', source: 'BUY', search1688: '儿童三角杆彩色铅笔', price: '¥30-60' },
          { item: 'Inset Paper (14x14cm)', qty: '500 sheets', source: 'BUY', search1688: '蒙氏金属嵌板专用纸', price: '¥20-40' }
        ]},
        { id: 'la_sandpaper_letters', name: 'Sandpaper Letters', sequence: 2, materials: [
          { item: 'Sandpaper Letters Lowercase (26)', qty: '1 set', source: 'BUY', search1688: '蒙特梭利砂纸字母小写26个', price: '¥80-150', priority: 'ESSENTIAL' },
          { item: 'Sandpaper Letters Storage Box', qty: '1 box', source: 'BUY', search1688: '蒙氏砂纸字母收纳盒', price: '¥30-50' },
          { item: 'Sand Tray', qty: '1 tray', source: 'BUY', search1688: '蒙氏沙盘写字盘', price: '¥40-80' }
        ]},
        { id: 'la_sand_tray', name: 'Sand Tray Writing', sequence: 3, materials: [
          { item: 'Wooden Sand Tray (large)', qty: '1 tray', source: 'BUY', search1688: '蒙特梭利木质沙盘大号', price: '¥50-100' },
          { item: 'Colored Sand (fine)', qty: '2kg', source: 'BUY', search1688: '彩色细沙幼儿园', price: '¥20-40' }
        ]},
        { id: 'la_chalkboard', name: 'Chalkboard Writing', sequence: 4, materials: [
          { item: 'Individual Chalkboards', qty: '6-8 boards', source: 'BUY', search1688: '儿童小黑板木质', price: '¥10-20/ea' },
          { item: 'Dustless Chalk', qty: '2 boxes', source: 'BUY', search1688: '无尘粉笔彩色', price: '¥15-30' },
          { item: 'Chalkboard Erasers', qty: '6-8', source: 'BUY', search1688: '小黑板擦迷你', price: '¥10-20' }
        ]},
        { id: 'la_moveable_alphabet', name: 'Moveable Alphabet', sequence: 5, materials: [
          { item: 'Large Moveable Alphabet', qty: '1 set', source: 'BUY', search1688: '蒙特梭利活动字母大号木质', price: '¥120-250', priority: 'ESSENTIAL' },
          { item: 'Moveable Alphabet Box', qty: '1 box', source: 'BUY', search1688: '蒙氏活动字母收纳盒', price: '¥50-100' },
          { item: 'Small Moveable Alphabet', qty: '1 set', source: 'BUY', search1688: '蒙氏活动字母小号', price: '¥80-150' }
        ]},
        { id: 'la_handwriting', name: 'Handwriting on Paper', sequence: 6, materials: [
          { item: 'Lined Handwriting Paper', qty: '500 sheets', source: 'BUY', search1688: '蒙氏书写纸四线三格', price: '¥30-50' },
          { item: 'Beginner Pencils (thick)', qty: '12', source: 'BUY', search1688: '儿童三角杆粗铅笔', price: '¥20-40' },
          { item: 'Letter Formation Cards', qty: '26 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_creative_writing', name: 'Creative Writing', sequence: 7, materials: [
          { item: 'Blank Writing Journals', qty: '10', source: 'BUY', search1688: '幼儿园图画日记本', price: '¥30-50' },
          { item: 'Writing Prompt Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/card-generator' }
        ]}
      ]
    },
    {
      id: 'reading',
      name: 'Reading',
      icon: '📖',
      color: 'from-green-500 to-emerald-500',
      works: [
        { id: 'la_object_boxes', name: 'Object Boxes (Pink/Blue/Green)', sequence: 1, materials: [
          { item: 'Pink Object Box with CVC Miniatures', qty: '1 set', source: 'BUY', search1688: '蒙氏粉色系列物品盒CVC', price: '¥80-150', priority: 'ESSENTIAL' },
          { item: 'Blue Object Box with Blend Miniatures', qty: '1 set', source: 'BUY', search1688: '蒙氏蓝色系列物品盒', price: '¥80-150', priority: 'ESSENTIAL' },
          { item: 'Green Object Box with Phonogram Miniatures', qty: '1 set', source: 'BUY', search1688: '蒙氏绿色系列物品盒', price: '¥80-150', priority: 'ESSENTIAL' },
          { item: 'Word Labels', qty: '100+ labels', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_pink_series', name: 'Pink Series (CVC Words)', sequence: 2, materials: [
          { item: 'Pink Series Complete Set', qty: '1 set', source: 'BUY', search1688: '蒙特梭利粉色系列全套', price: '¥100-200', priority: 'ESSENTIAL' },
          { item: 'Pink Picture-Word Cards', qty: '200+ cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Pink Booklets/Readers', qty: '10', source: 'BUY', search1688: '蒙氏粉色系列阅读小书', price: '¥40-80' },
          { item: 'Pink Series Storage Box', qty: '1 box', source: 'BUY', search1688: '蒙氏语言区卡片收纳盒粉色', price: '¥30-60' }
        ]},
        { id: 'la_blue_series', name: 'Blue Series (Blends)', sequence: 3, materials: [
          { item: 'Blue Series Complete Set', qty: '1 set', source: 'BUY', search1688: '蒙特梭利蓝色系列全套', price: '¥100-200', priority: 'ESSENTIAL' },
          { item: 'Blue Picture-Word Cards', qty: '200+ cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Blue Booklets/Readers', qty: '10', source: 'BUY', search1688: '蒙氏蓝色系列阅读小书', price: '¥40-80' },
          { item: 'Blue Series Storage Box', qty: '1 box', source: 'BUY', search1688: '蒙氏语言区卡片收纳盒蓝色', price: '¥30-60' }
        ]},
        { id: 'la_phonograms', name: 'Phonogram Introduction', sequence: 4, materials: [
          { item: 'Sandpaper Phonograms Set', qty: '1 set (40+)', source: 'BUY', search1688: '蒙特梭利砂纸音素卡', price: '¥60-120', priority: 'ESSENTIAL' },
          { item: 'Phonogram Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_green_series', name: 'Green Series (Phonograms)', sequence: 5, materials: [
          { item: 'Green Series Complete Set', qty: '1 set', source: 'BUY', search1688: '蒙特梭利绿色系列全套', price: '¥120-250', priority: 'ESSENTIAL' },
          { item: 'Green Picture-Word Cards', qty: '300+ cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Green Booklets/Readers', qty: '15', source: 'BUY', search1688: '蒙氏绿色系列阅读小书', price: '¥50-100' },
          { item: 'Green Series Storage Boxes', qty: '2-3', source: 'BUY', search1688: '蒙氏语言区卡片收纳盒绿色', price: '¥30-60/ea' }
        ]},
        { id: 'la_sight_words', name: 'Puzzle Words (Sight Words)', sequence: 6, materials: [
          { item: 'Sight Word Cards (Dolch)', qty: '220 cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Sight Word Booklets', qty: '10', source: 'BUY', search1688: '儿童英语高频词小书', price: '¥40-80' },
          { item: 'Sight Word Storage Box', qty: '1 box', source: 'BUY', search1688: '蒙氏卡片收纳盒', price: '¥25-50' }
        ]},
        { id: 'la_command_cards', name: 'Command Cards', sequence: 7, materials: [
          { item: 'Simple/Complex Command Cards', qty: '90 cards', source: 'MAKE', generator: '/admin/card-generator' },
          { item: 'Command Card Box', qty: '1 box', source: 'BUY', search1688: '蒙氏卡片盒木质', price: '¥20-40' }
        ]},
        { id: 'la_silent_reading', name: 'Silent Reading', sequence: 8, materials: [
          { item: 'Leveled Readers Set', qty: '50+ books', source: 'BUY', search1688: '儿童英语分级阅读绘本', price: '¥150-300', priority: 'ESSENTIAL' },
          { item: 'Book Corner Shelf', qty: '1 shelf', source: 'BUY', search1688: '幼儿园绘本架木质', price: '¥100-200' },
          { item: 'Reading Cushions', qty: '4-6', source: 'BUY', search1688: '儿童阅读坐垫', price: '¥50-100' }
        ]}
      ]
    },
    {
      id: 'grammar',
      name: 'Grammar',
      icon: '📝',
      color: 'from-purple-500 to-violet-500',
      works: [
        { id: 'la_noun', name: 'Introduction to the Noun', sequence: 1, materials: [
          { item: 'Noun Symbol (Black Triangle)', qty: '10', source: 'BUY', search1688: '蒙特梭利语法符号名词黑色三角', price: '¥30-60' },
          { item: 'Noun Lesson Objects', qty: '30+', source: 'BUY', search1688: '蒙氏语言区名词小物件', price: '¥50-100' },
          { item: 'Noun Labels/Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_article', name: 'Introduction to the Article', sequence: 2, materials: [
          { item: 'Article Symbol (Light Blue Triangle)', qty: '10', source: 'BUY', search1688: '蒙特梭利语法符号冠词浅蓝三角', price: '¥20-40' },
          { item: 'Article Cards (a, an, the)', qty: '30 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_adjective', name: 'Introduction to the Adjective', sequence: 3, materials: [
          { item: 'Adjective Symbol (Dark Blue Triangle)', qty: '10', source: 'BUY', search1688: '蒙特梭利语法符号形容词深蓝三角', price: '¥25-50' },
          { item: 'Detective Adjective Game', qty: '1 set', source: 'BUY', search1688: '蒙氏形容词侦探游戏', price: '¥40-80' },
          { item: 'Adjective Cards', qty: '100 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_verb', name: 'Introduction to the Verb', sequence: 4, materials: [
          { item: 'Verb Symbol (Red Circle)', qty: '10', source: 'BUY', search1688: '蒙特梭利语法符号动词红色圆形', price: '¥25-50' },
          { item: 'Action Verb Cards', qty: '100 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_adverb', name: 'Introduction to the Adverb', sequence: 5, materials: [
          { item: 'Adverb Symbol (Orange Circle)', qty: '10', source: 'BUY', search1688: '蒙特梭利语法符号副词橙色小圆', price: '¥20-40' },
          { item: 'Adverb Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_pronoun', name: 'Introduction to the Pronoun', sequence: 6, materials: [
          { item: 'Pronoun Symbol (Purple Triangle)', qty: '10', source: 'BUY', search1688: '蒙特梭利语法符号代词紫色三角', price: '¥20-40' },
          { item: 'Pronoun Cards', qty: '30 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_preposition', name: 'Introduction to the Preposition', sequence: 7, materials: [
          { item: 'Preposition Symbol (Green Crescent)', qty: '10', source: 'BUY', search1688: '蒙特梭利语法符号介词绿色月牙', price: '¥20-40' },
          { item: 'Preposition Cards', qty: '30 cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Preposition Game Objects', qty: '1 set', source: 'BUY', search1688: '蒙氏介词游戏教具', price: '¥30-60' }
        ]},
        { id: 'la_conjunction', name: 'Introduction to the Conjunction', sequence: 8, materials: [
          { item: 'Conjunction Symbol (Pink Rectangle)', qty: '10', source: 'BUY', search1688: '蒙特梭利语法符号连词粉色长方形', price: '¥20-40' },
          { item: 'Conjunction Cards', qty: '20 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_interjection', name: 'Introduction to the Interjection', sequence: 9, materials: [
          { item: 'Interjection Symbol (Gold Keyhole)', qty: '10', source: 'BUY', search1688: '蒙特梭利语法符号感叹词金色', price: '¥20-40' },
          { item: 'Interjection Cards', qty: '20 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_grammar_boxes', name: 'Grammar Boxes (I-VIII)', sequence: 10, materials: [
          { item: 'Grammar Boxes Complete Set', qty: '1 set (8)', source: 'BUY', search1688: '蒙特梭利语法盒全套8个', price: '¥200-400', priority: 'ESSENTIAL' },
          { item: 'Grammar Box Filling Cards', qty: '200+ cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_sentence_analysis', name: 'Sentence Analysis', sequence: 11, materials: [
          { item: 'Sentence Analysis Charts', qty: '1 set', source: 'BUY', search1688: '蒙特梭利句子分析图表', price: '¥80-150' },
          { item: 'Question Arrows Set', qty: '1 set', source: 'BUY', search1688: '蒙氏句子分析箭头', price: '¥40-80' },
          { item: 'Sentence Analysis Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]}
      ]
    },
    {
      id: 'word_study',
      name: 'Word Study',
      icon: '🔤',
      color: 'from-orange-500 to-amber-500',
      works: [
        { id: 'la_word_families', name: 'Word Families', sequence: 1, materials: [
          { item: 'Word Family Cards', qty: '200+ cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Word Family Charts', qty: '20 charts', source: 'MAKE', generator: '/admin/card-generator' },
          { item: 'Word Family Storage Box', qty: '1 box', source: 'BUY', search1688: '蒙氏卡片分类盒', price: '¥25-50' }
        ]},
        { id: 'la_spelling_rules', name: 'Spelling Rules', sequence: 2, materials: [
          { item: 'Spelling Rule Charts', qty: '10 charts', source: 'MAKE', generator: '/admin/card-generator' },
          { item: 'Word Sorting Materials', qty: '100+ cards', source: 'MAKE', generator: '/admin/material-generator' }
        ]},
        { id: 'la_compound_words', name: 'Compound Words', sequence: 3, materials: [
          { item: 'Compound Word Cards', qty: '100 cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Compound Word Matching Game', qty: '1 set', source: 'MAKE', generator: '/admin/card-generator' }
        ]},
        { id: 'la_prefixes_suffixes', name: 'Prefixes and Suffixes', sequence: 4, materials: [
          { item: 'Prefix Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Suffix Cards', qty: '50 cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Root Word Cards', qty: '100 cards', source: 'MAKE', generator: '/admin/material-generator' },
          { item: 'Word Building Tray', qty: '2 trays', source: 'BUY', search1688: '蒙氏拼词托盘', price: '¥30-60' }
        ]},
        { id: 'la_synonyms_antonyms', name: 'Synonyms and Antonyms', sequence: 5, materials: [
          { item: 'Synonym Matching Cards', qty: '50 pairs', source: 'MAKE', generator: '/admin/card-generator' },
          { item: 'Antonym Matching Cards', qty: '50 pairs', source: 'MAKE', generator: '/admin/card-generator' },
          { item: 'Synonym/Antonym Game', qty: '1 set', source: 'BUY', search1688: '儿童英语近义词反义词卡片', price: '¥30-60' }
        ]},
        { id: 'la_homonyms', name: 'Homonyms', sequence: 6, materials: [
          { item: 'Homophone Cards with Pictures', qty: '60 cards', source: 'MAKE', generator: '/admin/card-generator' },
          { item: 'Multiple Meaning Cards', qty: '40 cards', source: 'MAKE', generator: '/admin/card-generator' },
          { item: 'Homonym Storage Box', qty: '1 box', source: 'BUY', search1688: '蒙氏卡片收纳盒', price: '¥20-40' }
        ]}
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
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}

// Material row component
function MaterialRow({ material, index }: { material: Material; index: number }) {
  return (
    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-4 py-3 text-sm">
        <span className="font-medium">{material.item}</span>
        {material.priority === 'ESSENTIAL' && (
          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            ESSENTIAL
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{material.qty}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 text-xs font-bold rounded ${
          material.source === 'BUY' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {material.source}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {material.source === 'BUY' && material.search1688 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <code className="bg-yellow-50 px-2 py-1 rounded text-xs border border-yellow-200">
                {material.search1688}
              </code>
              <CopyButton text={material.search1688} />
            </div>
            {material.searchAlt && (
              <div className="flex items-center gap-2">
                <code className="bg-gray-50 px-2 py-1 rounded text-xs border border-gray-200 text-gray-600">
                  {material.searchAlt}
                </code>
                <CopyButton text={material.searchAlt} />
              </div>
            )}
          </div>
        ) : material.generator ? (
          <Link 
            href={material.generator}
            className="text-blue-600 hover:underline text-sm"
          >
            → Use Generator
          </Link>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {material.price || '-'}
      </td>
    </tr>
  );
}

// Work card component
function WorkCard({ work, categoryColor }: { work: Work; categoryColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const buyCount = work.materials.filter(m => m.source === 'BUY').length;
  const makeCount = work.materials.filter(m => m.source === 'MAKE').length;
  
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full bg-gradient-to-r ${categoryColor} text-white flex items-center justify-center text-sm font-bold`}>
            {work.sequence}
          </span>
          <span className="font-medium text-gray-800">{work.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
              {buyCount} BUY
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
              {makeCount} MAKE
            </span>
          </div>
          <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      
      {expanded && (
        <div className="border-t">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Item</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Qty</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Source</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">1688 Search Term</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Est. Price</th>
              </tr>
            </thead>
            <tbody>
              {work.materials.map((material, idx) => (
                <MaterialRow key={idx} material={material} index={idx} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// Main page component
export default function EnglishProcurementPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'MAKE'>('ALL');
  
  // Calculate totals
  const totals = procurementData.categories.reduce((acc, cat) => {
    cat.works.forEach(work => {
      work.materials.forEach(mat => {
        if (mat.source === 'BUY') acc.buy++;
        else acc.make++;
        acc.total++;
      });
    });
    return acc;
  }, { buy: 0, make: 0, total: 0 });
  
  // Get all BUY items for shopping list
  const allBuyItems = procurementData.categories.flatMap(cat => 
    cat.works.flatMap(work => 
      work.materials
        .filter(m => m.source === 'BUY' && m.search1688)
        .map(m => ({
          ...m,
          workName: work.name,
          categoryName: cat.name
        }))
    )
  );
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-pink-200 hover:text-white text-sm mb-2 inline-block">
                ← Back to Admin
              </Link>
              <h1 className="text-3xl font-bold">🏫 English Area Procurement</h1>
              <p className="text-pink-100 mt-2">Complete AMI Language Shelf Setup Guide</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{totals.total}</div>
              <div className="text-pink-200 text-sm">Total Items</div>
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
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            {(['ALL', 'BUY', 'MAKE'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f 
                    ? 'bg-pink-600 text-white' 
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
        {/* Quick Shopping List */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🛒 Quick Shopping List (1688 Search Terms)</h2>
          <p className="text-gray-600 text-sm mb-4">Click to copy any search term, then paste into 1688.com</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(allBuyItems.map(i => i.search1688))].slice(0, 20).map((term, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1">
                <span className="text-sm">{term}</span>
                <CopyButton text={term || ''} />
              </div>
            ))}
          </div>
          {allBuyItems.length > 20 && (
            <p className="text-gray-500 text-sm mt-3">+ {allBuyItems.length - 20} more items below...</p>
          )}
        </div>
        
        {/* Categories */}
        <div className="space-y-8">
          {procurementData.categories.map(category => (
            <div key={category.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className={`w-full px-6 py-4 bg-gradient-to-r ${category.color} text-white flex items-center justify-between`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{category.icon}</span>
                  <div className="text-left">
                    <h2 className="text-xl font-bold">{category.name}</h2>
                    <p className="text-white/80 text-sm">{category.works.length} works</p>
                  </div>
                </div>
                <span className="text-2xl">{expandedCategory === category.id ? '▲' : '▼'}</span>
              </button>
              
              {expandedCategory === category.id && (
                <div className="p-4 space-y-3">
                  {category.works.map(work => {
                    const filteredWork = filter === 'ALL' ? work : {
                      ...work,
                      materials: work.materials.filter(m => m.source === filter)
                    };
                    if (filteredWork.materials.length === 0) return null;
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
      </div>
    </div>
  );
}
