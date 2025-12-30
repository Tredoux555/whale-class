-- Migration 013: Chinese-English Work Name Mapping
-- Run in Supabase SQL Editor
-- Date: December 30, 2025

-- ============================================
-- Create mapping table for auto-translation
-- ============================================

CREATE TABLE IF NOT EXISTS work_name_translations (
  id SERIAL PRIMARY KEY,
  chinese_name TEXT NOT NULL,
  english_name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('practical_life', 'sensorial', 'math', 'language', 'culture')),
  curriculum_work_id TEXT REFERENCES curriculum_roadmap(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chinese_name)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_work_translations_chinese ON work_name_translations(chinese_name);
CREATE INDEX IF NOT EXISTS idx_work_translations_english ON work_name_translations(english_name);

-- ============================================
-- Seed with Week 17 works + common variations
-- ============================================

INSERT INTO work_name_translations (chinese_name, english_name, area) VALUES
-- PRACTICAL LIFE
('食物制备', 'Food Preparation', 'practical_life'),
('切', 'Cutting', 'practical_life'),
('剪纸', 'Cutting with Scissors', 'practical_life'),
('编辫子', 'Braiding Frame', 'practical_life'),
('照顾环境', 'Care of Environment', 'practical_life'),
('洗桌子', 'Table Washing', 'practical_life'),
('拉链衣饰框', 'Zipper Dressing Frame', 'practical_life'),
('衣饰框', 'Dressing Frame', 'practical_life'),
('扣扣子', 'Button Frame', 'practical_life'),
('插花', 'Flower Arranging', 'practical_life'),
('倒', 'Pouring', 'practical_life'),
('倒水', 'Pouring Water', 'practical_life'),
('倒豆子', 'Pouring Beans', 'practical_life'),
('舀豆子', 'Spooning Beans', 'practical_life'),
('叠衣服', 'Folding Clothes', 'practical_life'),
('擦桌子', 'Wiping Table', 'practical_life'),
('洗手', 'Hand Washing', 'practical_life'),
('系鞋带', 'Tying Shoes', 'practical_life'),

-- SENSORIAL
('三项式', 'Trinomial Cube', 'sensorial'),
('十项式正方形', 'Trinomial Square', 'sensorial'),
('二项式', 'Binomial Cube', 'sensorial'),
('味觉瓶', 'Taste Bottles', 'sensorial'),
('嗅觉瓶', 'Smell Bottles', 'sensorial'),
('音感钟', 'Sound Cylinders', 'sensorial'),
('色板二', 'Color Tablets Box 2', 'sensorial'),
('色板三', 'Color Tablets Box 3', 'sensorial'),
('色板一', 'Color Tablets Box 1', 'sensorial'),
('粉红塔', 'Pink Tower', 'sensorial'),
('棕色梯', 'Brown Stair', 'sensorial'),
('红棒', 'Red Rods', 'sensorial'),
('几何图橱', 'Geometric Cabinet', 'sensorial'),
('建构三角形', 'Constructive Triangles', 'sensorial'),
('温觉板', 'Thermic Tablets', 'sensorial'),
('圆柱体', 'Cylinder Blocks', 'sensorial'),
('触觉板', 'Touch Boards', 'sensorial'),
('重量板', 'Baric Tablets', 'sensorial'),
('神秘袋', 'Mystery Bag', 'sensorial'),
('几何立体', 'Geometric Solids', 'sensorial'),

-- MATHEMATICS
('数棒', 'Number Rods', 'math'),
('砂纸数字', 'Sandpaper Numbers', 'math'),
('纺锤棒箱', 'Spindle Boxes', 'math'),
('数字与筹码', 'Cards and Counters', 'math'),
('金色珠子', 'Golden Beads', 'math'),
('金色珠子介绍', 'Golden Beads Introduction', 'math'),
('直线数数', 'Linear Counting', 'math'),
('十几板', 'Teen Board', 'math'),
('十板', 'Ten Board', 'math'),
('加法蛇', 'Addition Snake Game', 'math'),
('减法蛇', 'Subtraction Snake Game', 'math'),
('邮票游戏', 'Stamp Game', 'math'),
('邮票游戏乘法', 'Stamp Game Multiplication', 'math'),
('邮票游戏除法', 'Stamp Game Division', 'math'),
('加法手指板', 'Addition Finger Charts', 'math'),
('珠链', 'Bead Chains', 'math'),
('百珠链', 'Hundred Bead Chain', 'math'),
('千珠链', 'Thousand Bead Chain', 'math'),
('点卡', 'Dot Game', 'math'),
('乘法板', 'Multiplication Board', 'math'),
('除法板', 'Division Board', 'math'),

-- LANGUAGE
('砂纸字母', 'Sandpaper Letters', 'language'),
('活动字母', 'Moveable Alphabet', 'language'),
('粉色系列', 'Pink Series', 'language'),
('蓝色系列', 'Blue Series', 'language'),
('绿色系列', 'Green Series', 'language'),
('物体盒', 'Object Boxes', 'language'),
('三段卡', 'Three Part Cards', 'language'),
('词汇卡', 'Vocabulary Cards', 'language'),
('首音', 'Beginning Sounds', 'language'),
('尾音', 'Ending Sounds', 'language'),
('中间音', 'Middle Sounds', 'language'),
('拼读', 'Phonics', 'language'),
('阅读', 'Reading', 'language'),

-- CULTURE / SCIENCE
('砂纸地球仪', 'Sandpaper Globe', 'culture'),
('彩色地球仪', 'Painted Globe', 'culture'),
('大洲地图', 'Continent Map', 'culture'),
('中国地图', 'China Map', 'culture'),
('陆地和水', 'Land and Water Forms', 'culture'),
('鸟', 'Parts of Bird', 'culture'),
('鸟的部位', 'Parts of Bird', 'culture'),
('鱼', 'Parts of Fish', 'culture'),
('鱼的部位', 'Parts of Fish', 'culture'),
('青蛙', 'Parts of Frog', 'culture'),
('乌龟', 'Parts of Turtle', 'culture'),
('蝴蝶', 'Parts of Butterfly', 'culture'),
('花', 'Parts of Flower', 'culture'),
('花的部位', 'Parts of Flower', 'culture'),
('树', 'Parts of Tree', 'culture'),
('树的部位', 'Parts of Tree', 'culture'),
('叶形图橱', 'Leaf Cabinet', 'culture'),
('植物橱', 'Botany Cabinet', 'culture'),
('动物', 'Animals', 'culture'),
('植物', 'Plants', 'culture'),
('时间线', 'Timeline', 'culture'),
('日历', 'Calendar Work', 'culture'),
('季节', 'Seasons', 'culture'),
('天气', 'Weather', 'culture')

ON CONFLICT (chinese_name) DO UPDATE SET
  english_name = EXCLUDED.english_name,
  area = EXCLUDED.area;

-- Verify
SELECT area, COUNT(*) as count FROM work_name_translations GROUP BY area ORDER BY area;
