/**
 * Montessori Glossary — Chinese Translation
 *
 * Standard Montessori terminology in English and Chinese for consistent translation
 * across all teacher guides, parent descriptions, and Guru interactions.
 *
 * Usage in translations: Pass `getGlossaryPromptSection()` to Sonnet system prompt
 * to ensure consistent Montessori terminology across all Chinese content.
 */

export const MONTESSORI_GLOSSARY_ZH: Record<string, string> = {
  // === AREAS ===
  'Practical Life': '日常生活',
  'Sensorial': '感官',
  'Mathematics': '数学',
  'Language': '语言',
  'Cultural': '文化',

  // === PRACTICAL LIFE MATERIALS ===
  'Dressing Frames': '穿衣框',
  'Pouring': '倒水',
  'Spooning': '舀',
  'Tonging': '夹',
  'Tweezing': '用镊子夹',
  'Cutting': '剪',
  'Folding': '折叠',
  'Polishing': '擦亮',
  'Sweeping': '扫地',
  'Table Washing': '擦桌子',
  'Hand Washing': '洗手',
  'Flower Arranging': '插花',

  // === SENSORIAL MATERIALS ===
  'Pink Tower': '粉红塔',
  'Brown Stair': '棕色梯',
  'Red Rods': '红棒',
  'Color Tablets': '色板',
  'Sound Cylinders': '音筒',
  'Mystery Bag': '神秘袋',
  'Cylinder Blocks': '圆柱体组',
  'Knobless Cylinders': '彩色圆柱体',
  'Binomial Cube': '二项式',
  'Trinomial Cube': '三项式',
  'Geometric Cabinet': '几何图形橱',
  'Metal Insets': '金属嵌板',

  // === LANGUAGE MATERIALS ===
  'Moveable Alphabet': '活动字母',
  'Sandpaper Letters': '砂纸字母',
  'Grammar Boxes': '语法盒',
  'Phonogram Tiles': '音素卡片',
  'Phonogram Work': '音素工作',
  'Phonogram Intro': '音素介绍',
  'Vowel & Consonant': '元音与辅音',
  'Object Box': '物体盒',
  'I Spy Game': '我是间谍游戏',
  'Command Cards': '指令卡',

  // === MATHEMATICS MATERIALS ===
  'Golden Beads': '金珠',
  'Golden Beads Material': '金珠教具',
  'Number Rods': '数棒',
  'Numeral & Quantity': '数字与数量',
  'Hundred Board': '百数板',
  'Bead Frame': '串珠架',
  'Bead Chains': '串珠链',
  'Stamp Game': '邮票游戏',
  'Addition Strip Board': '加法条板',
  'Subtraction Strip Board': '减法条板',
  'Multiplication Board': '乘法板',
  'Division Board': '除法板',
  'Constructive Triangles': '构成三角形',

  // === CULTURAL STUDIES MATERIALS ===
  'World Map': '世界地图',
  'Continent Map': '大陆地图',
  'Country Map': '国家地图',
  'Puzzle Map': '拼图地图',
  'Biome Cards': '生物群落卡片',
  'Plant Parts': '植物部分',
  'Life Cycle': '生命周期',
  'Rock & Mineral': '岩石与矿物',
  'Fossil Cards': '化石卡片',
  'Human Body': '人体',
  'Anatomy Charts': '解剖图表',
  'Timeline': '时间线',
  'Historical Cards': '历史卡片',

  // === PEDAGOGICAL CONCEPTS ===
  'Presentation': '展示',
  'Sensitive Period': '敏感期',
  'Normalization': '正常化',
  'Prepared Environment': '预备环境',
  'Control of Error': '错误控制',
  'Points of Interest': '兴趣点',
  'Direct Aim': '直接目的',
  'Indirect Aim': '间接目的',
  'Concentration': '专注力',
  'Order': '秩序',
  'Independence': '独立性',
  'Liberty': '自由',
  'Child-Centered': '以儿童为中心',
  'Auto-Education': '自我教育',
  'Follow the Child': '跟随儿童',

  // === DEVELOPMENTAL STAGES (Montessori Age Groups) ===
  'Infancy': '婴幼期',
  'Toddler': '幼儿期',
  'Early Childhood': '早期儿童期',
  'Lower Elementary': '低年级小学',
  'Upper Elementary': '高年级小学',
  'Adolescent': '青少年期',
  'Adult': '成人期',

  // === LEARNING PROCESSES ===
  'Absorbent Mind': '吸收心智',
  'Conscious Repetition': '有意识的重复',
  'Grace and Courtesy': '优雅与礼仪',
  'Practical Life': '日常生活教育',
  'Sensorial Development': '感官发展',
  'Reading': '阅读',
  'Writing': '书写',
  'Mathematics': '数学',
  'Cultural Exploration': '文化探索',

  // === CLASSROOM ELEMENTS ===
  'Shelf': '架子',
  'Work Rug': '工作毯',
  'Basket': '篮子',
  'Tray': '托盘',
  'Control of Error': '错误控制',
  'Prepared Material': '预备教具',
  'Mixed Age': '混龄',
  'Three Hour Cycle': '三小时周期',

  // === TEACHER TERMINOLOGY ===
  'Observation': '观察',
  'Record': '记录',
  'Progress': '进度',
  'Master': '掌握',
  'Practicing': '练习',
  'Presented': '已展示',
  'Focus Work': '焦点工作',
  'Shelf Work': '架上工作',
  'Lesson': '课程',
  'Guide': '引导师',
  'Casa': '儿童之家',
  'Primary': '初级班',
  'Elementary': '小学班',
};

/**
 * Format the glossary for injection into Sonnet translation prompts
 *
 * @returns A formatted string suitable for inclusion in system prompts
 * @example
 * const systemPrompt = `Use these Montessori terms:\n${getGlossaryPromptSection()}`;
 */
export function getGlossaryPromptSection(): string {
  const entries = Object.entries(MONTESSORI_GLOSSARY_ZH)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([english, chinese]) => `- ${english} = ${chinese}`)
    .join('\n');

  return `Use these established Montessori terms in Chinese (do NOT translate differently):\n${entries}`;
}

/**
 * Get a Chinese translation for a Montessori term
 * Returns undefined if term is not in glossary
 *
 * @param englishTerm The English Montessori term
 * @returns The Chinese translation, or undefined if not found
 */
export function getChineseMontesorriTerm(englishTerm: string): string | undefined {
  return MONTESSORI_GLOSSARY_ZH[englishTerm];
}

/**
 * Check if a term exists in the glossary
 *
 * @param englishTerm The English term to check
 * @returns true if the term has a Chinese translation in the glossary
 */
export function hasChineseTranslation(englishTerm: string): boolean {
  return englishTerm in MONTESSORI_GLOSSARY_ZH;
}

/**
 * Get all terms in a specific category
 * Useful for batch translation of all materials in an area
 *
 * @param area The Montessori area ('Practical Life', 'Sensorial', 'Mathematics', 'Language', 'Cultural')
 * @returns Array of [english, chinese] pairs for terms in that area
 */
export function getTermsByArea(area: 'Practical Life' | 'Sensorial' | 'Mathematics' | 'Language' | 'Cultural'): Array<[string, string]> {
  // Category markers for identifying terms
  const categoryMarkers: Record<string, string[]> = {
    'Practical Life': ['Dressing Frames', 'Pouring', 'Spooning', 'Tonging', 'Tweezing', 'Cutting', 'Folding', 'Polishing', 'Sweeping', 'Table Washing', 'Hand Washing', 'Flower Arranging'],
    'Sensorial': ['Pink Tower', 'Brown Stair', 'Red Rods', 'Color Tablets', 'Sound Cylinders', 'Mystery Bag', 'Cylinder Blocks', 'Knobless Cylinders', 'Binomial Cube', 'Trinomial Cube', 'Geometric Cabinet', 'Metal Insets'],
    'Mathematics': ['Golden Beads', 'Number Rods', 'Numeral & Quantity', 'Hundred Board', 'Bead Frame', 'Bead Chains', 'Stamp Game', 'Addition Strip Board', 'Subtraction Strip Board', 'Multiplication Board', 'Division Board', 'Constructive Triangles'],
    'Language': ['Moveable Alphabet', 'Sandpaper Letters', 'Grammar Boxes', 'Phonogram Tiles', 'Phonogram Work', 'Phonogram Intro', 'Vowel & Consonant', 'Object Box', 'I Spy Game', 'Command Cards'],
    'Cultural': ['World Map', 'Continent Map', 'Country Map', 'Puzzle Map', 'Biome Cards', 'Plant Parts', 'Life Cycle', 'Rock & Mineral', 'Fossil Cards', 'Human Body', 'Anatomy Charts', 'Timeline', 'Historical Cards'],
  };

  const terms = categoryMarkers[area] || [];
  return terms
    .map(term => [term, MONTESSORI_GLOSSARY_ZH[term]] as [string, string])
    .filter(([, chinese]) => chinese !== undefined);
}
