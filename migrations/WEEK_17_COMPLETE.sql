-- Week 17 COMPLETE Assignments Import
-- Run AFTER ADD_MISSING_WORKS.sql
-- Status: 'assigned' (not yet started)

-- =============================================
-- WORK ID REFERENCE
-- =============================================
-- NEW WORKS:
-- Cutting Paper: 44188be3-2edc-4b43-9eb0-6b047c5ed2fc
-- Braiding: 2660dd1c-ef02-4633-b73d-553d7aac7f50
-- Decanomial Square: 3aee0e5e-c404-464b-8156-c874bc915169
-- Linear Counting: a77aa4e5-a42f-4f25-a15f-c850d309fdf7
-- Addition Snake Game: 62d9bd55-6622-4fb0-a4cc-6efdc3fd2151
-- Butterfly Puzzle: 356cc0bf-4295-4efb-a4ea-5376ffbedd48
-- Parts of a Tree: cc5819e7-90d5-4c92-a901-022053b94f7d

-- EXISTING WORKS:
-- Dressing Frame - Zipper: 4620ec7c-7b7e-43cf-ba23-f2701599deb8
-- Constructive Triangles - Triangular Box: e39cd222-7835-4018-b27c-f31704d1e11b
-- Constructive Triangles - Rectangular Box: fb6d950c-a44e-40bf-9e6e-1439c447f754
-- Constructive Triangles - Large Hexagonal Box: f340e84c-fb84-4eb9-9cda-d11401421d31
-- Spindle Box: 16bee8c3-3406-49ab-bc27-11b89556621c
-- Colored Globe: e14df727-b3a4-4ba4-914b-87bffc267d07
-- Smelling Bottles: 9bf47440-9dfb-44ae-b4ae-4c18b44030b7
-- Golden Bead Quantity: f4f00845-dfbc-476b-83b1-65e337dd86f4
-- Frog Puzzle: 2f9d3bdc-7ed3-4da0-a70a-68f5e20bcf95
-- Geometric Cabinet: c2914328-9b71-4811-ae7d-1c7d1b8273cd
-- Continent Puzzle Maps: 0c9f6674-f607-40be-803c-530c57436f34
-- Flower Arranging: bede5d8b-734d-4788-a48d-2baf5e180c3a
-- Binomial Cube: 4c071a12-385c-43e8-8368-2370a60611f8
-- Trinomial Cube: 6a25c5b3-475d-4fe9-964e-0382231fac2f
-- Sandpaper Numerals: 832a84d1-fac7-4435-b8e9-5a61b86d9fb1
-- Folding - Complex: 236541f9-5f59-420e-85d7-26a7a5c2f462
-- Golden Beads Introduction: 82aad86e-4e53-472a-8dea-b6a7621e528c
-- Flower Puzzle: a07b5493-c0fd-4d86-9d70-ddaddea869a2
-- Spooning: db9f34da-bd3d-4b45-8fce-7a0550862389
-- Color Tablets Box 2: 96e4e862-3292-40f4-b56c-7fbb346fa280
-- Color Tablets Box 3: e6b0ba3d-c45f-4918-a3dc-6af4902b8414
-- Thermic Tablets: 965eba68-c1c0-46bc-ae3b-fe5cbfe10b10
-- Long Bead Chains: bfc8f1cf-6969-42c1-acc9-eae8e95b4077
-- Short Bead Chains: 2b4435fa-a107-4043-96e4-d7ac31dc0761
-- Addition Strip Board: 66705588-6d4a-4c3d-bc20-94a68dbcffd0
-- Table Washing: c9132946-0a6f-484f-acb8-100513887115
-- Montessori Bells - Grading: 128fe28b-daf2-46bc-bc62-8555a71554f7
-- Turtle Puzzle: 781a63c4-9460-49ba-b63c-ddca4916d48d
-- Red Rods: 3f41f172-d93c-4df0-8d7d-55034e3dabb3
-- Bird Puzzle: 24326f93-edfd-42c4-b444-84ac51044c34
-- Leaf Shapes: e8292d8c-128a-4e54-954c-a338326243fb
-- Stamp Game: 2036b66e-9d25-47ad-87ca-63ec9a94aab9
-- 45 Layout: (need to look up)
-- Thousand Chain: (need to look up)
-- Cards and Counters: (need to look up)
-- I Spy - Beginning Sounds: b1c09070-c92c-4cab-9077-c189502f2d43

-- =============================================
-- AMY - dd113f0f-e76a-4a73-a9e1-c8cc2f0f20d2
-- 衣饰框-拉链, 建构三角形盒1, 纺锤棒箱, WBW /a/ Box, 彩色地球仪
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('dd113f0f-e76a-4a73-a9e1-c8cc2f0f20d2', '4620ec7c-7b7e-43cf-ba23-f2701599deb8', 'assigned', 'Week 17 - 衣饰框-拉链 (Zipper Frame)', NOW()),
('dd113f0f-e76a-4a73-a9e1-c8cc2f0f20d2', 'e39cd222-7835-4018-b27c-f31704d1e11b', 'assigned', 'Week 17 - 建构三角形盒1 (Constructive Triangles 1)', NOW()),
('dd113f0f-e76a-4a73-a9e1-c8cc2f0f20d2', '16bee8c3-3406-49ab-bc27-11b89556621c', 'assigned', 'Week 17 - 纺锤棒箱 (Spindle Box)', NOW()),
('dd113f0f-e76a-4a73-a9e1-c8cc2f0f20d2', 'e14df727-b3a4-4ba4-914b-87bffc267d07', 'assigned', 'Week 17 - 彩色地球仪 (Colored Globe)', NOW());

-- =============================================
-- RACHEL - 9a771bd2-7ab7-43c0-986b-758280b100fd
-- 十项式正方形P, WBW /a/ Box, 叶形图橱
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('9a771bd2-7ab7-43c0-986b-758280b100fd', '3aee0e5e-c404-464b-8156-c874bc915169', 'assigned', 'Week 17 - 十项式正方形 (Decanomial Square)', NOW()),
('9a771bd2-7ab7-43c0-986b-758280b100fd', 'e8292d8c-128a-4e54-954c-a338326243fb', 'assigned', 'Week 17 - 叶形图橱 (Leaf Shapes)', NOW());

-- =============================================
-- YUEZE - 4a234bb3-ffa0-4db5-95ea-8b43fd2350fc
-- 剪纸, 几何图形卡片配对P, 邮票游戏乘法, WFW /a/ Box, 鸟
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('4a234bb3-ffa0-4db5-95ea-8b43fd2350fc', '44188be3-2edc-4b43-9eb0-6b047c5ed2fc', 'assigned', 'Week 17 - 剪纸 (Cutting Paper)', NOW()),
('4a234bb3-ffa0-4db5-95ea-8b43fd2350fc', 'c2914328-9b71-4811-ae7d-1c7d1b8273cd', 'assigned', 'Week 17 - 几何图形卡片配对 (Geometric Cabinet)', NOW()),
('4a234bb3-ffa0-4db5-95ea-8b43fd2350fc', '2036b66e-9d25-47ad-87ca-63ec9a94aab9', 'assigned', 'Week 17 - 邮票游戏乘法 (Stamp Game)', NOW()),
('4a234bb3-ffa0-4db5-95ea-8b43fd2350fc', '24326f93-edfd-42c4-b444-84ac51044c34', 'assigned', 'Week 17 - 鸟 (Bird Puzzle)', NOW());

-- =============================================
-- LUCKY - 7d0d2c43-b1b5-445e-b923-67504abf173e
-- 编辫子, 三项式EX, Thousand Chain, WFW /a/ Box, 鹰嵌板
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('7d0d2c43-b1b5-445e-b923-67504abf173e', '2660dd1c-ef02-4633-b73d-553d7aac7f50', 'assigned', 'Week 17 - 编辫子 (Braiding)', NOW()),
('7d0d2c43-b1b5-445e-b923-67504abf173e', '6a25c5b3-475d-4fe9-964e-0382231fac2f', 'assigned', 'Week 17 - 三项式EX (Trinomial Cube)', NOW());

-- =============================================
-- AUSTIN - 9af2733c-d915-4f90-ae56-fce106bb8bda
-- 照顾环境, 嗅觉瓶配对, 取量, WBW Beginning Sounds, 青蛙
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('9af2733c-d915-4f90-ae56-fce106bb8bda', '9bf47440-9dfb-44ae-b4ae-4c18b44030b7', 'assigned', 'Week 17 - 嗅觉瓶配对 (Smelling Bottles)', NOW()),
('9af2733c-d915-4f90-ae56-fce106bb8bda', 'f4f00845-dfbc-476b-83b1-65e337dd86f4', 'assigned', 'Week 17 - 取量 (Golden Bead Quantity)', NOW()),
('9af2733c-d915-4f90-ae56-fce106bb8bda', '2f9d3bdc-7ed3-4da0-a70a-68f5e20bcf95', 'assigned', 'Week 17 - 青蛙 (Frog Puzzle)', NOW());

-- =============================================
-- MINGXI - 7675e5ff-3a01-4bd9-a090-36707d4bfedf
-- 切纸练习, 音感钟配对, 数数, WBW /a/ Box, 乌龟嵌板
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('7675e5ff-3a01-4bd9-a090-36707d4bfedf', '44188be3-2edc-4b43-9eb0-6b047c5ed2fc', 'assigned', 'Week 17 - 切纸练习 (Cutting Paper)', NOW()),
('7675e5ff-3a01-4bd9-a090-36707d4bfedf', '128fe28b-daf2-46bc-bc62-8555a71554f7', 'assigned', 'Week 17 - 音感钟配对 (Bells Grading)', NOW()),
('7675e5ff-3a01-4bd9-a090-36707d4bfedf', 'a77aa4e5-a42f-4f25-a15f-c850d309fdf7', 'assigned', 'Week 17 - 数数 (Linear Counting)', NOW()),
('7675e5ff-3a01-4bd9-a090-36707d4bfedf', '781a63c4-9460-49ba-b63c-ddca4916d48d', 'assigned', 'Week 17 - 乌龟嵌板 (Turtle Puzzle)', NOW());

-- =============================================
-- LEO - cf38c5c2-dbcd-4df6-a6f4-1fba3ae039f4
-- 洗桌子, 建构三角形盒4, 取量游戏, WBW 3 part cards, 蝴蝶
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('cf38c5c2-dbcd-4df6-a6f4-1fba3ae039f4', 'c9132946-0a6f-484f-acb8-100513887115', 'assigned', 'Week 17 - 洗桌子 (Table Washing)', NOW()),
('cf38c5c2-dbcd-4df6-a6f4-1fba3ae039f4', 'f340e84c-fb84-4eb9-9cda-d11401421d31', 'assigned', 'Week 17 - 建构三角形盒4 (Constructive Triangles Hex)', NOW()),
('cf38c5c2-dbcd-4df6-a6f4-1fba3ae039f4', 'f4f00845-dfbc-476b-83b1-65e337dd86f4', 'assigned', 'Week 17 - 取量游戏 (Golden Bead Quantity)', NOW()),
('cf38c5c2-dbcd-4df6-a6f4-1fba3ae039f4', '356cc0bf-4295-4efb-a4ea-5376ffbedd48', 'assigned', 'Week 17 - 蝴蝶 (Butterfly Puzzle)', NOW());

-- =============================================
-- JOEY - 0ca1dc44-d5af-4885-bc11-b15bd9f9c249
-- 剪纸练习, 建构三角形盒2, 直线数数, WFW /o/ Box, 大洲地图
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('0ca1dc44-d5af-4885-bc11-b15bd9f9c249', '44188be3-2edc-4b43-9eb0-6b047c5ed2fc', 'assigned', 'Week 17 - 剪纸练习 (Cutting Paper)', NOW()),
('0ca1dc44-d5af-4885-bc11-b15bd9f9c249', 'fb6d950c-a44e-40bf-9e6e-1439c447f754', 'assigned', 'Week 17 - 建构三角形盒2 (Constructive Triangles Rect)', NOW()),
('0ca1dc44-d5af-4885-bc11-b15bd9f9c249', 'a77aa4e5-a42f-4f25-a15f-c850d309fdf7', 'assigned', 'Week 17 - 直线数数 (Linear Counting)', NOW()),
('0ca1dc44-d5af-4885-bc11-b15bd9f9c249', '0c9f6674-f607-40be-803c-530c57436f34', 'assigned', 'Week 17 - 大洲地图 (Continent Maps)', NOW());

-- =============================================
-- ERIC - 21eed3a4-1b6d-4213-895a-99cb079bcf41
-- 切纸, 几何图橱与卡片距离配对, 加法蛇, WFW /i/ Box, 中国地图
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('21eed3a4-1b6d-4213-895a-99cb079bcf41', '44188be3-2edc-4b43-9eb0-6b047c5ed2fc', 'assigned', 'Week 17 - 切纸 (Cutting Paper)', NOW()),
('21eed3a4-1b6d-4213-895a-99cb079bcf41', 'c2914328-9b71-4811-ae7d-1c7d1b8273cd', 'assigned', 'Week 17 - 几何图橱 (Geometric Cabinet)', NOW()),
('21eed3a4-1b6d-4213-895a-99cb079bcf41', '62d9bd55-6622-4fb0-a4cc-6efdc3fd2151', 'assigned', 'Week 17 - 加法蛇 (Addition Snake)', NOW()),
('21eed3a4-1b6d-4213-895a-99cb079bcf41', '0c9f6674-f607-40be-803c-530c57436f34', 'assigned', 'Week 17 - 中国地图 (Continent Maps - China)', NOW());

-- =============================================
-- JIMMY - 0d152e1f-fb04-48a5-a5e7-fd71733d2d46
-- 插花, 温觉板P, 折立方链, WBW /a/ 3 part cards, 树的部位
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('0d152e1f-fb04-48a5-a5e7-fd71733d2d46', 'bede5d8b-734d-4788-a48d-2baf5e180c3a', 'assigned', 'Week 17 - 插花 (Flower Arranging)', NOW()),
('0d152e1f-fb04-48a5-a5e7-fd71733d2d46', '965eba68-c1c0-46bc-ae3b-fe5cbfe10b10', 'assigned', 'Week 17 - 温觉板 (Thermic Tablets)', NOW()),
('0d152e1f-fb04-48a5-a5e7-fd71733d2d46', 'bfc8f1cf-6969-42c1-acc9-eae8e95b4077', 'assigned', 'Week 17 - 折立方链 (Long Bead Chains)', NOW()),
('0d152e1f-fb04-48a5-a5e7-fd71733d2d46', 'cc5819e7-90d5-4c92-a901-022053b94f7d', 'assigned', 'Week 17 - 树的部位 (Parts of a Tree)', NOW());

-- =============================================
-- KEVIN - edf3ca3b-f7a4-40f1-8fad-fe3b07f2908c
-- 拉链衣饰框, 温觉板, 金色珠数量, WBW /a/ Box, 花嵌板
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('edf3ca3b-f7a4-40f1-8fad-fe3b07f2908c', '4620ec7c-7b7e-43cf-ba23-f2701599deb8', 'assigned', 'Week 17 - 拉链衣饰框 (Zipper Frame)', NOW()),
('edf3ca3b-f7a4-40f1-8fad-fe3b07f2908c', '965eba68-c1c0-46bc-ae3b-fe5cbfe10b10', 'assigned', 'Week 17 - 温觉板 (Thermic Tablets)', NOW()),
('edf3ca3b-f7a4-40f1-8fad-fe3b07f2908c', 'f4f00845-dfbc-476b-83b1-65e337dd86f4', 'assigned', 'Week 17 - 金色珠数量 (Golden Bead Quantity)', NOW()),
('edf3ca3b-f7a4-40f1-8fad-fe3b07f2908c', 'a07b5493-c0fd-4d86-9d70-ddaddea869a2', 'assigned', 'Week 17 - 花嵌板 (Flower Puzzle)', NOW());

-- =============================================
-- NIUNIU - 3bd23989-99cb-41dc-ab19-e71559c19751
-- 食物制备, 建构三角形2, 加法手指板1, WBW /e/ Box, 大洲地图
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('3bd23989-99cb-41dc-ab19-e71559c19751', 'fb6d950c-a44e-40bf-9e6e-1439c447f754', 'assigned', 'Week 17 - 建构三角形2 (Constructive Triangles Rect)', NOW()),
('3bd23989-99cb-41dc-ab19-e71559c19751', '66705588-6d4a-4c3d-bc20-94a68dbcffd0', 'assigned', 'Week 17 - 加法手指板1 (Addition Strip Board)', NOW()),
('3bd23989-99cb-41dc-ab19-e71559c19751', '0c9f6674-f607-40be-803c-530c57436f34', 'assigned', 'Week 17 - 大洲地图 (Continent Maps)', NOW());

-- =============================================
-- MAOMAO - fe2cdeba-eeb4-46f9-88c0-05c302d6d525
-- 打蛋器, Colour box 2, Golden Bead 45 layout, Beginning Sounds I spy, 动物分类
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('fe2cdeba-eeb4-46f9-88c0-05c302d6d525', '96e4e862-3292-40f4-b56c-7fbb346fa280', 'assigned', 'Week 17 - Colour box 2 (Color Tablets Box 2)', NOW()),
('fe2cdeba-eeb4-46f9-88c0-05c302d6d525', 'b1c09070-c92c-4cab-9077-c189502f2d43', 'assigned', 'Week 17 - Beginning Sounds I spy', NOW());

-- =============================================
-- HENRY - 08124495-7563-45bb-a344-4f5d4b94ac3f
-- 舀豆子, 色板三排序, 渐层几何, WBW /a/ Box, 动物拼图
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('08124495-7563-45bb-a344-4f5d4b94ac3f', 'db9f34da-bd3d-4b45-8fce-7a0550862389', 'assigned', 'Week 17 - 舀豆子 (Spooning)', NOW()),
('08124495-7563-45bb-a344-4f5d4b94ac3f', 'e6b0ba3d-c45f-4918-a3dc-6af4902b8414', 'assigned', 'Week 17 - 色板三排序 (Color Tablets Box 3)', NOW());

-- =============================================
-- SEGINA - 49919d15-4102-4c09-ab24-efd1af84c91b
-- 舀豆子, 红棒, 直线数数-P, WBW a, 鸟拼图
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('49919d15-4102-4c09-ab24-efd1af84c91b', 'db9f34da-bd3d-4b45-8fce-7a0550862389', 'assigned', 'Week 17 - 舀豆子 (Spooning)', NOW()),
('49919d15-4102-4c09-ab24-efd1af84c91b', '3f41f172-d93c-4df0-8d7d-55034e3dabb3', 'assigned', 'Week 17 - 红棒 (Red Rods)', NOW()),
('49919d15-4102-4c09-ab24-efd1af84c91b', 'a77aa4e5-a42f-4f25-a15f-c850d309fdf7', 'assigned', 'Week 17 - 直线数数 (Linear Counting)', NOW()),
('49919d15-4102-4c09-ab24-efd1af84c91b', '24326f93-edfd-42c4-b444-84ac51044c34', 'assigned', 'Week 17 - 鸟拼图 (Bird Puzzle)', NOW());

-- =============================================
-- GENGERLYN - fa8b59b4-f9c5-46fa-aaaa-fb87ed5aaf50
-- Flower Arranging, Binomial, Numerals and counters, WBW /a/ Box, 蝴蝶
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('fa8b59b4-f9c5-46fa-aaaa-fb87ed5aaf50', 'bede5d8b-734d-4788-a48d-2baf5e180c3a', 'assigned', 'Week 17 - Flower Arranging', NOW()),
('fa8b59b4-f9c5-46fa-aaaa-fb87ed5aaf50', '4c071a12-385c-43e8-8368-2370a60611f8', 'assigned', 'Week 17 - Binomial Cube', NOW()),
('fa8b59b4-f9c5-46fa-aaaa-fb87ed5aaf50', '832a84d1-fac7-4435-b8e9-5a61b86d9fb1', 'assigned', 'Week 17 - Numerals and Counters (Sandpaper Numerals)', NOW()),
('fa8b59b4-f9c5-46fa-aaaa-fb87ed5aaf50', '356cc0bf-4295-4efb-a4ea-5376ffbedd48', 'assigned', 'Week 17 - 蝴蝶 (Butterfly Puzzle)', NOW());

-- =============================================
-- HAYDEN - dc44d97f-1538-4a8e-b9af-d425c5963e7e
-- 叠衣服, 嗅觉瓶, 金色珠子介绍, WFW /a/ Box, 花拼图
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('dc44d97f-1538-4a8e-b9af-d425c5963e7e', '236541f9-5f59-420e-85d7-26a7a5c2f462', 'assigned', 'Week 17 - 叠衣服 (Folding Complex)', NOW()),
('dc44d97f-1538-4a8e-b9af-d425c5963e7e', '9bf47440-9dfb-44ae-b4ae-4c18b44030b7', 'assigned', 'Week 17 - 嗅觉瓶 (Smelling Bottles)', NOW()),
('dc44d97f-1538-4a8e-b9af-d425c5963e7e', '82aad86e-4e53-472a-8dea-b6a7621e528c', 'assigned', 'Week 17 - 金色珠子介绍 (Golden Beads Intro)', NOW()),
('dc44d97f-1538-4a8e-b9af-d425c5963e7e', 'a07b5493-c0fd-4d86-9d70-ddaddea869a2', 'assigned', 'Week 17 - 花拼图 (Flower Puzzle)', NOW());

-- =============================================
-- KAYLA - 6aa6044b-e606-41d1-a91a-663c56ebfd07
-- 编辫子, 嗅觉瓶配对, 数字与筹码-P, WBW /e/ Box, 鸟拼图
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('6aa6044b-e606-41d1-a91a-663c56ebfd07', '2660dd1c-ef02-4633-b73d-553d7aac7f50', 'assigned', 'Week 17 - 编辫子 (Braiding)', NOW()),
('6aa6044b-e606-41d1-a91a-663c56ebfd07', '9bf47440-9dfb-44ae-b4ae-4c18b44030b7', 'assigned', 'Week 17 - 嗅觉瓶配对 (Smelling Bottles)', NOW()),
('6aa6044b-e606-41d1-a91a-663c56ebfd07', '832a84d1-fac7-4435-b8e9-5a61b86d9fb1', 'assigned', 'Week 17 - 数字与筹码 (Cards and Counters - via Sandpaper)', NOW()),
('6aa6044b-e606-41d1-a91a-663c56ebfd07', '24326f93-edfd-42c4-b444-84ac51044c34', 'assigned', 'Week 17 - 鸟拼图 (Bird Puzzle)', NOW());

-- =============================================
-- STELLA - 38fe29b1-3d1c-49ff-824e-3f2aae8fb439
-- 插花, 色板3排序, 取量游戏, WBW 3 part cards, 叶形图橱
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('38fe29b1-3d1c-49ff-824e-3f2aae8fb439', 'bede5d8b-734d-4788-a48d-2baf5e180c3a', 'assigned', 'Week 17 - 插花 (Flower Arranging)', NOW()),
('38fe29b1-3d1c-49ff-824e-3f2aae8fb439', 'e6b0ba3d-c45f-4918-a3dc-6af4902b8414', 'assigned', 'Week 17 - 色板3排序 (Color Tablets Box 3)', NOW()),
('38fe29b1-3d1c-49ff-824e-3f2aae8fb439', 'f4f00845-dfbc-476b-83b1-65e337dd86f4', 'assigned', 'Week 17 - 取量游戏 (Golden Bead Quantity)', NOW()),
('38fe29b1-3d1c-49ff-824e-3f2aae8fb439', 'e8292d8c-128a-4e54-954c-a338326243fb', 'assigned', 'Week 17 - 叶形图橱 (Leaf Shapes)', NOW());

-- =============================================
-- KK - df227fea-aee2-4cbd-a899-49798653f60c
-- 衣饰框--拉链, 十项式正方形, 加法手指板1, WFW /e/ Box, 蝴蝶
-- =============================================
INSERT INTO montree_child_assignments (child_id, work_id, status, notes, assigned_at) VALUES
('df227fea-aee2-4cbd-a899-49798653f60c', '4620ec7c-7b7e-43cf-ba23-f2701599deb8', 'assigned', 'Week 17 - 衣饰框拉链 (Zipper Frame)', NOW()),
('df227fea-aee2-4cbd-a899-49798653f60c', '3aee0e5e-c404-464b-8156-c874bc915169', 'assigned', 'Week 17 - 十项式正方形 (Decanomial Square)', NOW()),
('df227fea-aee2-4cbd-a899-49798653f60c', '66705588-6d4a-4c3d-bc20-94a68dbcffd0', 'assigned', 'Week 17 - 加法手指板1 (Addition Strip Board)', NOW()),
('df227fea-aee2-4cbd-a899-49798653f60c', '356cc0bf-4295-4efb-a4ea-5376ffbedd48', 'assigned', 'Week 17 - 蝴蝶 (Butterfly Puzzle)', NOW());

-- =============================================
-- VERIFICATION
-- =============================================
SELECT 'Week 17 Import Complete!' as status;

SELECT c.name, COUNT(*) as assignments
FROM montree_child_assignments a
JOIN montree_children c ON a.child_id = c.id
WHERE a.notes LIKE '%Week 17%'
GROUP BY c.name
ORDER BY c.name;
