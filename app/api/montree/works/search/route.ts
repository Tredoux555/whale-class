import { NextRequest, NextResponse } from 'next/server';

// Static Montessori curriculum - embedded directly
const CURRICULUM = {
  practical_life: {
    name: 'Practical Life',
    icon: '🧹',
    color: '#ec4899',
    works: [
      { id: 'pl-1', name: 'Carrying a Mat', chineseName: '搬运地毯', description: 'Learning to carry and unroll a work mat', ageRange: '2.5-4' },
      { id: 'pl-2', name: 'Carrying a Chair', chineseName: '搬椅子', description: 'Proper way to lift and carry a chair', ageRange: '2.5-4' },
      { id: 'pl-3', name: 'Pouring (Dry)', chineseName: '倒干物', description: 'Pouring beans or rice between containers', ageRange: '2.5-3.5' },
      { id: 'pl-4', name: 'Pouring (Water)', chineseName: '倒水', description: 'Pouring water between pitchers', ageRange: '3-4' },
      { id: 'pl-5', name: 'Spooning', chineseName: '舀勺', description: 'Transferring with a spoon', ageRange: '2.5-3.5' },
      { id: 'pl-6', name: 'Tonging', chineseName: '夹取', description: 'Using tongs to transfer objects', ageRange: '3-4' },
      { id: 'pl-7', name: 'Tweezing', chineseName: '镊子夹取', description: 'Using tweezers for fine motor work', ageRange: '3.5-5' },
      { id: 'pl-8', name: 'Cutting Practice', chineseName: '剪纸练习', description: 'Learning to use scissors properly', ageRange: '3-5' },
      { id: 'pl-9', name: 'Folding Cloths', chineseName: '折叠布料', description: 'Folding napkins and cloths', ageRange: '2.5-4' },
      { id: 'pl-10', name: 'Buttoning Frame', chineseName: '扣纽扣框架', description: 'Dressing frame with buttons', ageRange: '3-4.5' },
      { id: 'pl-11', name: 'Zipping Frame', chineseName: '拉链框架', description: 'Dressing frame with zipper', ageRange: '3-4.5' },
      { id: 'pl-12', name: 'Snapping Frame', chineseName: '按扣框架', description: 'Dressing frame with snaps', ageRange: '3-4' },
      { id: 'pl-13', name: 'Bow Tying Frame', chineseName: '蝴蝶结框架', description: 'Learning to tie bows', ageRange: '4-6' },
      { id: 'pl-14', name: 'Hand Washing', chineseName: '洗手', description: 'Complete hand washing sequence', ageRange: '2.5-4' },
      { id: 'pl-15', name: 'Table Washing', chineseName: '擦桌子', description: 'Washing and drying a table', ageRange: '3-5' },
      { id: 'pl-16', name: 'Dish Washing', chineseName: '洗碗', description: 'Washing dishes properly', ageRange: '3.5-5' },
      { id: 'pl-17', name: 'Plant Care', chineseName: '照顾植物', description: 'Watering and caring for plants', ageRange: '3-5' },
      { id: 'pl-18', name: 'Flower Arranging', chineseName: '插花', description: 'Simple flower arrangement', ageRange: '3.5-5' },
      { id: 'pl-19', name: 'Sweeping', chineseName: '扫地', description: 'Using broom and dustpan', ageRange: '3-5' },
      { id: 'pl-20', name: 'Polishing', chineseName: '擦亮', description: 'Polishing wood, metal, or shoes', ageRange: '3.5-5' },
    ]
  },
  sensorial: {
    name: 'Sensorial',
    icon: '👁️',
    color: '#f59e0b',
    works: [
      { id: 'se-1', name: 'Cylinder Blocks', chineseName: '圆柱体插座', description: 'Four blocks with cylinders of varying dimensions', ageRange: '2.5-4' },
      { id: 'se-2', name: 'Pink Tower', chineseName: '粉红塔', description: 'Ten pink cubes in graduated sizes', ageRange: '2.5-4' },
      { id: 'se-3', name: 'Brown Stair', chineseName: '棕色梯', description: 'Ten brown prisms varying in width and height', ageRange: '2.5-4' },
      { id: 'se-4', name: 'Red Rods', chineseName: '红棒', description: 'Ten red rods varying in length', ageRange: '3-4.5' },
      { id: 'se-5', name: 'Color Tablets Box 1', chineseName: '色板盒1', description: 'Primary colors matching', ageRange: '2.5-3.5' },
      { id: 'se-6', name: 'Color Tablets Box 2', chineseName: '色板盒2', description: 'Secondary colors matching', ageRange: '3-4' },
      { id: 'se-7', name: 'Color Tablets Box 3', chineseName: '色板盒3', description: 'Color grading exercises', ageRange: '3.5-5' },
      { id: 'se-8', name: 'Geometric Solids', chineseName: '几何立体', description: 'Three-dimensional geometric forms', ageRange: '3-5' },
      { id: 'se-9', name: 'Geometric Cabinet', chineseName: '几何图形柜', description: 'Plane geometric shapes', ageRange: '3-5' },
      { id: 'se-10', name: 'Constructive Triangles 1', chineseName: '构成三角形1', description: 'Triangular box', ageRange: '3.5-5' },
      { id: 'se-11', name: 'Constructive Triangles 2', chineseName: '构成三角形2', description: 'Large hexagonal box', ageRange: '4-5.5' },
      { id: 'se-12', name: 'Constructive Triangles 3', chineseName: '构成三角形3', description: 'Small hexagonal box', ageRange: '4-5.5' },
      { id: 'se-13', name: 'Binomial Cube', chineseName: '二项式', description: 'Algebraic formula in cube form', ageRange: '3.5-5' },
      { id: 'se-14', name: 'Trinomial Cube', chineseName: '三项式', description: 'Advanced algebraic cube', ageRange: '4-6' },
      { id: 'se-15', name: 'Sound Cylinders', chineseName: '听觉筒', description: 'Matching sounds', ageRange: '3-5' },
      { id: 'se-16', name: 'Touch Tablets', chineseName: '触觉板', description: 'Rough and smooth discrimination', ageRange: '3-5' },
      { id: 'se-17', name: 'Fabric Matching', chineseName: '布料配对', description: 'Matching fabric textures', ageRange: '3-5' },
      { id: 'se-18', name: 'Baric Tablets', chineseName: '重量板', description: 'Weight discrimination', ageRange: '4-6' },
      { id: 'se-19', name: 'Thermic Bottles', chineseName: '温觉瓶', description: 'Temperature discrimination', ageRange: '4-6' },
      { id: 'se-20', name: 'Smelling Bottles', chineseName: '嗅觉瓶', description: 'Scent matching', ageRange: '3.5-5' },
    ]
  },
  math: {
    name: 'Math',
    icon: '🔢',
    color: '#3b82f6',
    works: [
      { id: 'ma-1', name: 'Number Rods', chineseName: '数棒', description: 'Introduction to quantities 1-10', ageRange: '3.5-4.5' },
      { id: 'ma-2', name: 'Sandpaper Numbers', chineseName: '砂纸数字', description: 'Tactile number symbols 0-9', ageRange: '3.5-4.5' },
      { id: 'ma-3', name: 'Spindle Boxes', chineseName: '纺锤棒箱', description: 'Concept of zero and quantities', ageRange: '4-5' },
      { id: 'ma-4', name: 'Cards and Counters', chineseName: '数字与筹码', description: 'Odd and even numbers', ageRange: '4-5' },
      { id: 'ma-5', name: 'Golden Beads', chineseName: '金色串珠', description: 'Decimal system introduction', ageRange: '4-5.5' },
      { id: 'ma-6', name: 'Teen Boards', chineseName: '十几板', description: 'Numbers 11-19', ageRange: '4-5' },
      { id: 'ma-7', name: 'Ten Boards', chineseName: '几十板', description: 'Numbers 10-99', ageRange: '4.5-5.5' },
      { id: 'ma-8', name: 'Hundred Board', chineseName: '百数板', description: 'Numbers 1-100', ageRange: '4.5-6' },
      { id: 'ma-9', name: 'Bead Chains', chineseName: '串珠链', description: 'Skip counting and squares', ageRange: '4.5-6' },
      { id: 'ma-10', name: 'Addition Strip Board', chineseName: '加法板', description: 'Memorization of addition facts', ageRange: '4.5-6' },
      { id: 'ma-11', name: 'Subtraction Strip Board', chineseName: '减法板', description: 'Memorization of subtraction', ageRange: '5-6' },
      { id: 'ma-12', name: 'Multiplication Board', chineseName: '乘法板', description: 'Multiplication facts', ageRange: '5-6' },
      { id: 'ma-13', name: 'Division Board', chineseName: '除法板', description: 'Division facts', ageRange: '5-6' },
      { id: 'ma-14', name: 'Stamp Game', chineseName: '邮票游戏', description: 'All four operations', ageRange: '5-6' },
      { id: 'ma-15', name: 'Dot Game', chineseName: '点的游戏', description: 'Abstract addition', ageRange: '5.5-6' },
      { id: 'ma-16', name: 'Small Bead Frame', chineseName: '小算盘', description: 'Place value calculations', ageRange: '5-6' },
      { id: 'ma-17', name: 'Large Bead Frame', chineseName: '大算盘', description: 'Large number operations', ageRange: '5.5-6' },
      { id: 'ma-18', name: 'Fractions', chineseName: '分数', description: 'Introduction to fractions', ageRange: '5-6' },
      { id: 'ma-19', name: 'Clock', chineseName: '时钟', description: 'Telling time', ageRange: '5-6' },
      { id: 'ma-20', name: 'Money', chineseName: '钱币', description: 'Counting money', ageRange: '5-6' },
    ]
  },
  language: {
    name: 'Language',
    icon: '📖',
    color: '#22c55e',
    works: [
      { id: 'la-1', name: 'Sandpaper Letters', chineseName: '砂纸字母', description: 'Tactile letter learning', ageRange: '2.5-4' },
      { id: 'la-2', name: 'Moveable Alphabet', chineseName: '活动字母', description: 'Building words', ageRange: '3.5-5' },
      { id: 'la-3', name: 'Metal Insets', chineseName: '金属嵌板', description: 'Writing preparation', ageRange: '3-5' },
      { id: 'la-4', name: 'Object Boxes', chineseName: '实物盒', description: 'Sound matching with objects', ageRange: '3-4.5' },
      { id: 'la-5', name: 'Picture Cards', chineseName: '图片卡', description: 'Vocabulary building', ageRange: '3-5' },
      { id: 'la-6', name: 'Rhyming', chineseName: '押韵', description: 'Phonemic awareness', ageRange: '3.5-5' },
      { id: 'la-7', name: 'I Spy', chineseName: '我发现', description: 'Beginning sounds game', ageRange: '3-4.5' },
      { id: 'la-8', name: 'Pink Series', chineseName: '粉红系列', description: 'CVC word reading', ageRange: '4-5' },
      { id: 'la-9', name: 'Blue Series', chineseName: '蓝色系列', description: 'Consonant blends', ageRange: '4.5-5.5' },
      { id: 'la-10', name: 'Green Series', chineseName: '绿色系列', description: 'Phonograms', ageRange: '5-6' },
      { id: 'la-11', name: 'Sight Words', chineseName: '常见词', description: 'High frequency words', ageRange: '4.5-6' },
      { id: 'la-12', name: 'Sentence Building', chineseName: '造句', description: 'Combining words into sentences', ageRange: '5-6' },
      { id: 'la-13', name: 'Grammar Boxes', chineseName: '语法盒', description: 'Parts of speech', ageRange: '5-6' },
      { id: 'la-14', name: 'Reading Classification', chineseName: '阅读分类', description: 'Reading comprehension', ageRange: '5-6' },
      { id: 'la-15', name: 'Story Writing', chineseName: '故事写作', description: 'Creative writing', ageRange: '5-6' },
      { id: 'la-16', name: 'Chinese Characters', chineseName: '汉字', description: 'Chinese character introduction', ageRange: '3.5-6' },
      { id: 'la-17', name: 'Pinyin', chineseName: '拼音', description: 'Chinese phonetic system', ageRange: '4-6' },
      { id: 'la-18', name: 'Chinese Reading', chineseName: '中文阅读', description: 'Chinese picture books', ageRange: '4-6' },
      { id: 'la-19', name: 'Calligraphy', chineseName: '书法', description: 'Chinese brush writing', ageRange: '5-6' },
      { id: 'la-20', name: 'Poetry', chineseName: '诗歌', description: 'Chinese poems and rhymes', ageRange: '4-6' },
    ]
  },
  cultural: {
    name: 'Cultural',
    icon: '🌍',
    color: '#8b5cf6',
    works: [
      { id: 'cu-1', name: 'Globe - Land & Water', chineseName: '地球仪-陆地与水', description: 'Introduction to Earth', ageRange: '3-4.5' },
      { id: 'cu-2', name: 'Globe - Continents', chineseName: '地球仪-大洲', description: 'Continent colors', ageRange: '3.5-5' },
      { id: 'cu-3', name: 'Puzzle Map - World', chineseName: '世界拼图', description: 'Continents puzzle', ageRange: '3.5-5' },
      { id: 'cu-4', name: 'Puzzle Map - Asia', chineseName: '亚洲拼图', description: 'Countries of Asia', ageRange: '4-6' },
      { id: 'cu-5', name: 'Land & Water Forms', chineseName: '陆地与水域形态', description: 'Geographic features', ageRange: '4-5.5' },
      { id: 'cu-6', name: 'Flags', chineseName: '国旗', description: 'World flags', ageRange: '4-6' },
      { id: 'cu-7', name: 'Living/Non-Living', chineseName: '有生命/无生命', description: 'Classification', ageRange: '3-4.5' },
      { id: 'cu-8', name: 'Animals - Classification', chineseName: '动物分类', description: 'Vertebrates/invertebrates', ageRange: '3.5-5' },
      { id: 'cu-9', name: 'Animals - Habitats', chineseName: '动物栖息地', description: 'Where animals live', ageRange: '4-5.5' },
      { id: 'cu-10', name: 'Plants - Parts', chineseName: '植物部分', description: 'Root, stem, leaf, flower', ageRange: '3.5-5' },
      { id: 'cu-11', name: 'Plants - Life Cycle', chineseName: '植物生命周期', description: 'Seed to plant', ageRange: '4-5.5' },
      { id: 'cu-12', name: 'Solar System', chineseName: '太阳系', description: 'Planets and sun', ageRange: '4.5-6' },
      { id: 'cu-13', name: 'Seasons', chineseName: '季节', description: 'Four seasons', ageRange: '3.5-5' },
      { id: 'cu-14', name: 'Weather', chineseName: '天气', description: 'Weather observation', ageRange: '3-5' },
      { id: 'cu-15', name: 'Calendar', chineseName: '日历', description: 'Days, weeks, months', ageRange: '4-6' },
      { id: 'cu-16', name: 'History Timeline', chineseName: '历史时间线', description: 'Personal timeline', ageRange: '4.5-6' },
      { id: 'cu-17', name: 'Chinese Culture', chineseName: '中国文化', description: 'Traditions and customs', ageRange: '3.5-6' },
      { id: 'cu-18', name: 'Chinese Festivals', chineseName: '中国节日', description: 'Major celebrations', ageRange: '3.5-6' },
      { id: 'cu-19', name: 'Art Appreciation', chineseName: '艺术欣赏', description: 'Famous artists and works', ageRange: '4-6' },
      { id: 'cu-20', name: 'Music', chineseName: '音乐', description: 'Instruments and rhythm', ageRange: '3-6' },
    ]
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const areaFilter = searchParams.get('area');
    const searchQuery = searchParams.get('q')?.toLowerCase() || '';

    // Build flat list of all works
    let allWorks: any[] = [];
    let sequence = 1;

    for (const [areaKey, areaData] of Object.entries(CURRICULUM)) {
      for (const work of areaData.works) {
        allWorks.push({
          id: work.id,
          name: work.name,
          chinese_name: work.chineseName,
          description: work.description,
          age_range: work.ageRange,
          sequence: sequence++,
          area: {
            area_key: areaKey,
            name: areaData.name,
            color: areaData.color,
            icon: areaData.icon
          },
          status: 'not_started'
        });
      }
    }

    // Filter by area if specified
    if (areaFilter && areaFilter !== 'all') {
      allWorks = allWorks.filter(w => w.area.area_key === areaFilter);
    }

    // Filter by search query
    if (searchQuery) {
      allWorks = allWorks.filter(w => 
        w.name.toLowerCase().includes(searchQuery) ||
        w.chinese_name?.toLowerCase().includes(searchQuery) ||
        w.description?.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      works: allWorks,
      total: allWorks.length,
      version: 'v101-static'
    });

  } catch (error) {
    console.error('Works search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch works', details: String(error) },
      { status: 500 }
    );
  }
}
