-- Migration 014: Add Video URLs to Curriculum Works
-- Run in Supabase SQL Editor
-- Date: December 30, 2025

-- ============================================
-- Add video_url column if not exists
-- ============================================

ALTER TABLE curriculum_roadmap 
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_channel TEXT,
ADD COLUMN IF NOT EXISTS chinese_name TEXT;

-- ============================================
-- PRACTICAL LIFE Videos
-- ============================================

UPDATE curriculum_roadmap SET 
  video_url = 'https://youtube.com/playlist?list=PL7n8-uJamB0dL7Mhj0VF2-mLhgCXooLur',
  video_channel = 'My Works Montessori',
  chinese_name = '食物制备'
WHERE name ILIKE '%food preparation%' OR name ILIKE '%food prep%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=qXcRQzwR9Fw',
  video_channel = 'My Works Montessori',
  chinese_name = '剪纸'
WHERE name ILIKE '%cutting%' OR name ILIKE '%scissors%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/braiding-frame-english/',
  video_channel = 'Global Montessori Network',
  chinese_name = '编辫子'
WHERE name ILIKE '%braid%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=3Q7hYrFq9Zc',
  video_channel = 'My Works Montessori',
  chinese_name = '洗桌子'
WHERE name ILIKE '%table wash%' OR name ILIKE '%washing table%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/zipper-frame-english/',
  video_channel = 'Global Montessori Network',
  chinese_name = '拉链衣饰框'
WHERE name ILIKE '%zipper%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/button-frame-english/',
  video_channel = 'Global Montessori Network',
  chinese_name = '扣扣子'
WHERE name ILIKE '%button%' AND name ILIKE '%frame%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=xBnXKlPnMqw',
  video_channel = 'My Works Montessori',
  chinese_name = '插花'
WHERE name ILIKE '%flower arrang%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.infomontessori.com/practical-life/preliminary-exercises-pouring-grains.htm',
  video_channel = 'Info Montessori',
  chinese_name = '倒'
WHERE name ILIKE '%pouring%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=H1NwfB-BQWI',
  video_channel = 'My Works Montessori',
  chinese_name = '舀豆子'
WHERE name ILIKE '%spoon%' OR name ILIKE '%transfer%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=gY5XqpVJU3k',
  video_channel = 'My Works Montessori',
  chinese_name = '叠衣服'
WHERE name ILIKE '%fold%' AND name ILIKE '%cloth%';

-- ============================================
-- SENSORIAL Videos
-- ============================================

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/trinomial-cube-english/',
  video_channel = 'Global Montessori Network',
  chinese_name = '三项式'
WHERE name ILIKE '%trinomial cube%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=ZEZnNFxsnS8',
  video_channel = 'Various',
  chinese_name = '十项式正方形'
WHERE name ILIKE '%trinomial square%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/binomial-cube-english/',
  video_channel = 'Global Montessori Network',
  chinese_name = '二项式'
WHERE name ILIKE '%binomial%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.wonderfulmontessori.com/tasting-bottles',
  video_channel = 'Wonderful World of Montessori',
  chinese_name = '味觉瓶'
WHERE name ILIKE '%taste%' OR name ILIKE '%tasting%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.wonderfulmontessori.com/smelling-bottles-presentation-1',
  video_channel = 'Wonderful World of Montessori',
  chinese_name = '嗅觉瓶'
WHERE name ILIKE '%smell%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.wonderfulmontessori.com/sound-cylinders-pairing',
  video_channel = 'Wonderful World of Montessori',
  chinese_name = '音感钟'
WHERE name ILIKE '%sound cylinder%' OR name ILIKE '%sound box%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/colour-tablets-box-2/',
  video_channel = 'Global Montessori Network',
  chinese_name = '色板二'
WHERE name ILIKE '%color tablet%2%' OR name ILIKE '%colour tablet%2%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/colour-tablets-box-3/',
  video_channel = 'Global Montessori Network',
  chinese_name = '色板三'
WHERE name ILIKE '%color tablet%3%' OR name ILIKE '%colour tablet%3%' OR name ILIKE '%grading%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://montessoriguide.org/video-listing',
  video_channel = 'Montessori Guide',
  chinese_name = '粉红塔'
WHERE name ILIKE '%pink tower%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=YUvP9FHnCjE',
  video_channel = 'My Works Montessori',
  chinese_name = '棕色梯'
WHERE name ILIKE '%brown stair%' OR name ILIKE '%broad stair%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=dCXMlT_BhPY',
  video_channel = 'My Works Montessori',
  chinese_name = '红棒'
WHERE name ILIKE '%red rod%' OR name ILIKE '%long rod%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/geometric-cabinet/',
  video_channel = 'Global Montessori Network',
  chinese_name = '几何图橱'
WHERE name ILIKE '%geometric cabinet%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=kB6_WFB9cHw',
  video_channel = 'My Works Montessori',
  chinese_name = '建构三角形'
WHERE name ILIKE '%constructive triangle%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.wonderfulmontessori.com/thermic-tablets-presentation-1',
  video_channel = 'Wonderful World of Montessori',
  chinese_name = '温觉板'
WHERE name ILIKE '%thermic%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=3FX8GzmJ_Kg',
  video_channel = 'My Works Montessori',
  chinese_name = '圆柱体'
WHERE name ILIKE '%cylinder block%' OR name ILIKE '%knobbed cylinder%';

-- ============================================
-- MATHEMATICS Videos
-- ============================================

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=2HgP7r7J-Lc',
  video_channel = 'My Works Montessori',
  chinese_name = '数棒'
WHERE name ILIKE '%number rod%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.infomontessori.com/mathematics/numbers-through-ten-sandpaper-numerals.htm',
  video_channel = 'Info Montessori',
  chinese_name = '砂纸数字'
WHERE name ILIKE '%sandpaper number%' OR name ILIKE '%sandpaper numeral%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.infomontessori.com/mathematics/numbers-through-ten-spindle-boxes.htm',
  video_channel = 'Info Montessori',
  chinese_name = '纺锤棒箱'
WHERE name ILIKE '%spindle%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=HJg9Xz5GBEI',
  video_channel = 'My Works Montessori',
  chinese_name = '数字与筹码'
WHERE name ILIKE '%cards and counter%' OR name ILIKE '%card%counter%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.infomontessori.com/mathematics/decimal-system-intoduction-to-quantity.htm',
  video_channel = 'Info Montessori',
  chinese_name = '金色珠子'
WHERE name ILIKE '%golden bead%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=7-TjqFqNt5A',
  video_channel = 'My Works Montessori',
  chinese_name = '十几板'
WHERE name ILIKE '%teen board%' OR name ILIKE '%seguin%teen%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=WkOQx-8LnXo',
  video_channel = 'My Works Montessori',
  chinese_name = '十板'
WHERE name ILIKE '%ten board%' OR name ILIKE '%seguin%ten%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=KrLnZ5HTXEM',
  video_channel = 'Sustainable Montessori',
  chinese_name = '加法蛇'
WHERE name ILIKE '%addition snake%' OR name ILIKE '%positive snake%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=5y_R8gVJPHY',
  video_channel = 'Sustainable Montessori',
  chinese_name = '减法蛇'
WHERE name ILIKE '%subtraction snake%' OR name ILIKE '%negative snake%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/elementary/stamp-game-assembly-english/',
  video_channel = 'Global Montessori Network',
  chinese_name = '邮票游戏'
WHERE name ILIKE '%stamp game%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=4J1xPxYc8RM',
  video_channel = 'My Works Montessori',
  chinese_name = '珠链'
WHERE name ILIKE '%bead chain%' OR name ILIKE '%skip counting%';

-- ============================================
-- LANGUAGE Videos
-- ============================================

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/sound-games-english/',
  video_channel = 'Global Montessori Network',
  chinese_name = '首音'
WHERE name ILIKE '%i spy%' OR name ILIKE '%sound game%' OR name ILIKE '%beginning sound%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.infomontessori.com/language/written-language-sandpaper-letters.htm',
  video_channel = 'Info Montessori',
  chinese_name = '砂纸字母'
WHERE name ILIKE '%sandpaper letter%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://theglobalmontessorinetwork.org/resource/primary/moveable-alphabet-english/',
  video_channel = 'Global Montessori Network',
  chinese_name = '活动字母'
WHERE name ILIKE '%moveable alphabet%' OR name ILIKE '%movable alphabet%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=qYVUYKjJD5E',
  video_channel = 'Stella Ling',
  chinese_name = '粉色系列'
WHERE name ILIKE '%pink series%' OR name ILIKE '%cvc%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=L8LGSPnGx6s',
  video_channel = 'Stella Ling',
  chinese_name = '蓝色系列'
WHERE name ILIKE '%blue series%' OR name ILIKE '%blend%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=7pVVTKIGssg',
  video_channel = 'Stella Ling',
  chinese_name = '绿色系列'
WHERE name ILIKE '%green series%' OR name ILIKE '%phonogram%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=Q4K9x5Q5DXE',
  video_channel = 'My Works Montessori',
  chinese_name = '物体盒'
WHERE name ILIKE '%object box%';

-- ============================================
-- CULTURE / SCIENCE Videos
-- ============================================

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.infomontessori.com/cultural-activities/geography-sandpaper-globe.htm',
  video_channel = 'Info Montessori',
  chinese_name = '砂纸地球仪'
WHERE name ILIKE '%sandpaper globe%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.infomontessori.com/cultural-activities/geography-painted-globe.htm',
  video_channel = 'Info Montessori',
  chinese_name = '彩色地球仪'
WHERE name ILIKE '%painted globe%' OR name ILIKE '%color%globe%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=QC_-GqLP8Uw',
  video_channel = 'My Works Montessori',
  chinese_name = '大洲地图'
WHERE name ILIKE '%continent%' OR name ILIKE '%world map%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=ZXEYv46KuPQ',
  video_channel = 'Montessori Live',
  chinese_name = '陆地和水'
WHERE name ILIKE '%land%water%' OR name ILIKE '%land form%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=3pYPkBLPnYg',
  video_channel = 'My Works Montessori',
  chinese_name = '鸟'
WHERE name ILIKE '%bird%' AND (name ILIKE '%part%' OR name ILIKE '%puzzle%');

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=pXKvnMcJNfw',
  video_channel = 'My Works Montessori',
  chinese_name = '鱼'
WHERE name ILIKE '%fish%' AND (name ILIKE '%part%' OR name ILIKE '%puzzle%');

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=EpJVxp9Hhpk',
  video_channel = 'My Works Montessori',
  chinese_name = '青蛙'
WHERE name ILIKE '%frog%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=BNVfL7Jyb-Q',
  video_channel = 'My Works Montessori',
  chinese_name = '蝴蝶'
WHERE name ILIKE '%butterfly%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=YX-_2pL8pBM',
  video_channel = 'My Works Montessori',
  chinese_name = '花'
WHERE name ILIKE '%flower%' AND (name ILIKE '%part%' OR name ILIKE '%puzzle%' OR name ILIKE '%botany%');

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=yZlUGsQdJQE',
  video_channel = 'My Works Montessori',
  chinese_name = '树'
WHERE name ILIKE '%tree%' AND (name ILIKE '%part%' OR name ILIKE '%puzzle%');

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.wonderfulmontessori.com/the-leaf-cabinet',
  video_channel = 'Wonderful World of Montessori',
  chinese_name = '叶形图橱'
WHERE name ILIKE '%leaf%cabinet%' OR name ILIKE '%leaf%shape%';

UPDATE curriculum_roadmap SET 
  video_url = 'https://www.youtube.com/watch?v=gHwWJjKVo_4',
  video_channel = 'My Works Montessori',
  chinese_name = '植物橱'
WHERE name ILIKE '%botany cabinet%';

-- ============================================
-- Verify results
-- ============================================

SELECT 
  name,
  chinese_name,
  video_channel,
  CASE WHEN video_url IS NOT NULL THEN '✅' ELSE '❌' END as has_video
FROM curriculum_roadmap 
WHERE video_url IS NOT NULL
ORDER BY name
LIMIT 50;

-- Count coverage
SELECT 
  COUNT(*) as total_works,
  COUNT(video_url) as with_videos,
  ROUND(COUNT(video_url)::numeric / COUNT(*)::numeric * 100, 1) as coverage_pct
FROM curriculum_roadmap;
