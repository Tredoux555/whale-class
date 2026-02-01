-- ============================================
-- Migration 104: Backfill Parent Descriptions
-- ============================================
-- Updates ALL existing classroom curriculum works
-- with parent-friendly descriptions
-- Total works: 309
-- Date: 2026-02-01
-- ============================================

BEGIN;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to carry and handle materials with care. This foundational skill develops balance, coordination, and respect for classroom materials. It''s one of the first lessons in the Montessori environment and sets the tone for how your child will interact with all future work.',
  why_it_matters = 'Carrying a mat is the bridge between home life and school life. It teaches a child how to move purposefully in a shared environment, how to respect materials, and how to prepare their own workspace. This activity indirectly prepares the child for all future floor work and develops the coordination and awareness needed for success in more complex practical life activities.'
WHERE LOWER(name) = LOWER('Carrying a Mat');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to carry furniture with care and control. This activity develops physical strength, balance, and awareness of movement. It teaches your child to be conscious of their impact on the shared environment and to move with intentionality and respect.',
  why_it_matters = 'Carrying a chair develops essential practical skills for classroom independence. It teaches children how to manage their physical environment, move with control, and be aware of others. These skills are foundational to creating a peaceful, orderly classroom where children can concentrate.'
WHERE LOWER(name) = LOWER('Carrying a Chair');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to carry a tray carefully with two hands, walking slowly and deliberately to keep the tray balanced and level. This simple task requires tremendous concentration, coordination, and body control as your child synchronizes their movements with their eyes and hands.',
  why_it_matters = 'Carrying a tray develops gross motor coordination, balance, and concentration. These foundational skills prepare children for controlling their movements in all future activities, from writing to sports to daily self-care.'
WHERE LOWER(name) = LOWER('Carrying a Tray');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to carry and manage larger furniture. This activity develops physical strength, body awareness, and practical problem-solving skills. It helps your child understand how to safely manipulate their environment and builds confidence in handling increasingly complex tasks.',
  why_it_matters = 'Carrying a table is a progression in the practical life curriculum that builds on earlier skills. It teaches children how to work with larger, heavier objects safely, develops full-body strength and coordination, and prepares them for greater independence in managing their classroom environment.'
WHERE LOWER(name) = LOWER('Carrying a Table');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to open and close doors carefully and with awareness of others. This practical skill develops body control, coordination, and social awareness. It teaches your child to move through spaces respectfully and mindfully.',
  why_it_matters = 'Opening and closing a door is a fundamental practical life skill that teaches children to interact with their environment with care and awareness. It develops physical control, coordination, and an understanding of how to move through shared spaces respectfully. This skill is essential for classroom independence and safety.'
WHERE LOWER(name) = LOWER('Opening and Closing a Door');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is walking slowly and carefully along a line on the floor, developing the ability to control their body in space with intention and precision. This requires focus, balance, and the coordination of their entire body working as one integrated unit.',
  why_it_matters = 'Walking on the line develops balance, gross motor control, and concentration. The ability to move with intention and control is foundational to all physical development and builds confidence in the child''s ability to master their own body.'
WHERE LOWER(name) = LOWER('Walking on the Line');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning proper table etiquette and body awareness while sitting. This fundamental skill develops good posture, coordination, and classroom norms. It prepares your child for extended periods of work at a table, including eating, writing, and other focused activities.',
  why_it_matters = 'Learning to sit and stand properly at a table introduces children to classroom behavior expectations and develops the body awareness and posture needed for future academic work. It establishes habits of orderliness, respect for shared spaces, and physical control that support a calm, focused learning environment.'
WHERE LOWER(name) = LOWER('Sitting and Standing at a Table');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to sit quietly and listen. The Silence Game develops concentration, self-control, and an appreciation for quiet and calm. It''s a powerful tool for helping children slow down, become aware of their inner world, and build the foundation for focused learning.',
  why_it_matters = 'The Silence Game is a unique Montessori activity that develops self-control, concentration, and inner awareness. It teaches children to manage their own behavior and create peace within themselves. This skill is essential for success in the classroom and life, providing a tool for self-regulation that children can use throughout their lives.'
WHERE LOWER(name) = LOWER('The Silence Game');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to handle books with care and respect. This activity develops fine motor control and an appreciation for reading materials. It introduces your child to the joy of looking at beautiful pictures and the care that books deserve.',
  why_it_matters = 'Turning pages is a foundational skill that prepares children for reading and respects books as precious materials. It develops fine motor control and care for the environment while fostering a love of books and reading. This early positive experience with books is crucial for developing literacy and a lifelong appreciation for reading.'
WHERE LOWER(name) = LOWER('Turning Pages of a Book');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to fold fabric squares along stitched guide lines, folding precisely and carefully. Each fold requires hand-eye coordination, fine motor control, and the ability to follow a pattern - the same skills needed for writing, drawing, and complex problem-solving.',
  why_it_matters = 'Folding develops fine motor skills, hand-eye coordination, and sequential thinking. Children learn that precision and care matter, and that complex tasks can be broken down into manageable steps. This preparation for geometry and mathematical thinking happens through their hands.'
WHERE LOWER(name) = LOWER('Folding Cloths');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is developing fine motor skills through this simple but powerful activity. Transferring objects by hand helps build the small muscle control needed for writing and other precise tasks. It also develops concentration and the ability to focus on a repetitive activity.',
  why_it_matters = 'Dry transfer with hands is one of the foundational practical life activities that develops the refined pincer grasp essential for writing. It builds hand strength, coordination, and concentration through engaging, repetitive work that children find naturally satisfying. This activity is the stepping stone to more complex hand work activities.'
WHERE LOWER(name) = LOWER('Dry Transfer - Hands');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is carefully spooning beans or other small objects from one bowl to another, learning to control the spoon with steady hands and focused attention. This activity isolates one precise movement, allowing your child to build control and develop the muscle memory needed for eating and other fine motor tasks.',
  why_it_matters = 'Spooning develops hand-eye coordination, fine motor control, and concentration. The precision required prepares children for eating independently, writing, and all activities requiring controlled hand movements. Repetition builds confidence and mastery.'
WHERE LOWER(name) = LOWER('Spooning');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using tongs to pick up and transfer small objects from one container to another, practicing the pinching motion and hand control needed for many daily tasks. This activity builds grip strength and the refined finger movements that are essential for writing.',
  why_it_matters = 'Tonging develops the tripod grip and finger strength necessary for holding a pencil. The crossing of the body''s midline as the child moves objects strengthens neural pathways that support coordination, and the concentration required builds focus for future academic work.'
WHERE LOWER(name) = LOWER('Tonging');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is developing more advanced fine motor control through tweezers transfer. This challenging activity requires precision, patience, and concentration. It significantly strengthens the hand muscles and coordination needed for writing and other detailed work.',
  why_it_matters = 'Tweezers transfer is a more advanced transfer activity that builds on foundational hand transfer skills. It develops precise finger control, hand strength, and coordination essential for writing. This activity also introduces children to using tools for fine motor work and builds their ability to focus on challenging tasks with persistence.'
WHERE LOWER(name) = LOWER('Tweezers Transfer');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use chopsticks to transfer objects. This advanced activity develops bilateral coordination (using both hands together) and fine motor control. It''s also an introduction to using tools in different cultures and for different purposes, including eating.',
  why_it_matters = 'Chopsticks transfer is a sophisticated fine motor activity that develops bilateral coordination and control with a two-part tool. It teaches children how objects can work together and prepares them for using utensils and tools. This activity also introduces cultural diversity and practical life skills used in many cultures worldwide.'
WHERE LOWER(name) = LOWER('Chopsticks Transfer');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is pouring lentils, beans, or rice from one container to another, learning to control the flow and aim with their hands and eyes working together. This requires intense concentration and the coordination of multiple movements happening simultaneously.',
  why_it_matters = 'Dry pouring develops hand-eye coordination, control, and refinement of movement. Children learn cause and effect (tilt the pitcher, materials flow) and build the fine motor control needed for writing, eating, and countless daily life skills. The sensory feedback from pouring materials helps children develop spatial awareness.'
WHERE LOWER(name) = LOWER('Pouring Dry Materials');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is carefully pouring water from one pitcher to another, developing precision, control, and concentration as they manage the flow of liquid. This seemingly simple activity demands that your child coordinate their eyes, hands, and body while controlling the rate of pouring - true mastery of self.',
  why_it_matters = 'Water pouring develops fine motor control, hand-eye coordination, and independence. The experience of observing cause and effect (pouring action creates water transfer), combined with the repetition and concentration required, builds both practical skills and the inner discipline needed for all future learning.'
WHERE LOWER(name) = LOWER('Pouring Water');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to control water and absorptive materials through squeezing and transferring. This water-based activity develops hand strength, coordination, and understanding of cause and effect. It''s a foundational skill for future practical life activities involving water.',
  why_it_matters = 'Sponging is a transfer activity that introduces children to water control and the properties of absorbent materials. It develops the hand strength and coordination needed for squeezing, which is essential for many practical life tasks. This activity also provides sensory exploration and builds confidence in handling liquids, preparing children for more complex water activities.'
WHERE LOWER(name) = LOWER('Sponging');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using a baster to draw up water and transfer it from one container to another, developing the precise squeezing and releasing movements needed for fine motor control. This activity builds grip strength and the refined finger movements essential for writing and other precise tasks.',
  why_it_matters = 'Basting develops hand strength, fine motor control, and concentration through the specific movements of squeezing and releasing. The coordination required strengthens the exact muscles and neural pathways children will later use for writing, while the focus needed builds the concentration muscles for all academic work.'
WHERE LOWER(name) = LOWER('Basting (Turkey Baster)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Eye dropper work develops the precise hand control your child needs for writing. Through hundreds of small, focused repetitions, the hand learns to work with delicate instruments. This quiet activity builds concentration and calm.',
  why_it_matters = 'The eyedropper is a foundational transfer tool developing the pincer grasp. It builds the fine motor control essential for writing, drawing, and future academic work. The meditative quality fosters deep concentration.'
WHERE LOWER(name) = LOWER('Eye Dropper');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use velcro fasteners through a simple, engaging frame. This is the easiest dressing frame and introduces the concept of fastening clothing. It develops hand strength and coordination needed for self-dressing.',
  why_it_matters = 'The Velcro Frame is the first dressing frame, chosen because velcro is the easiest fastener for young children to manage. It introduces the concept of fastening and unfastening clothing through a simple, sensory-rich activity that develops the hand strength and coordination essential for self-dressing and clothing independence.'
WHERE LOWER(name) = LOWER('Velcro Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use snap fasteners. This requires more finger strength than velcro but less precision than buttons. Snaps help develop the hand strength and coordination your child will need for many types of clothing.',
  why_it_matters = 'The Snaps Frame is a progression from velcro that introduces a fastener requiring more strength and precision. Snaps are found on many clothing items and learning to manipulate them is essential for dressing independence. This activity builds hand strength and problem-solving skills as children figure out the alignment needed for snaps to work properly.'
WHERE LOWER(name) = LOWER('Snaps Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to button and unbutton clothing, an important step toward dressing independence. This activity requires fine motor control and hand coordination. Your child will eventually apply this skill to buttoning their own clothes.',
  why_it_matters = 'Large buttons frame is a critical dressing frame that introduces buttoning, one of the most common clothing fasteners. Learning to button and unbutton develops hand-eye coordination and bilateral control essential for many practical life tasks. This skill is foundational for independence in self-dressing.'
WHERE LOWER(name) = LOWER('Large Buttons Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is mastering smaller button fastening. This advanced dressing frame requires refined finger control and patience. Completing this activity shows significant progress in fine motor development and persistence.',
  why_it_matters = 'Small buttons frame is an advanced dressing activity that challenges children to apply their buttoning skills with greater precision. It develops the refined finger control needed for complex clothing fasteners and prepares children for complete independence in dressing. Success with small buttons builds significant confidence and self-esteem.'
WHERE LOWER(name) = LOWER('Small Buttons Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use zippers, a more complex fastener than buttons or snaps. Zippers require smooth, coordinated pulling and understanding of directionality. This is an important skill for independence with many types of clothing.',
  why_it_matters = 'Zipper frame introduces children to mechanical fastening systems that are more sophisticated than simple buttons or snaps. Learning to manipulate zippers develops smooth, coordinated hand movements and understanding of directional concepts (up/down). This prepares children for independence with jackets, coats, and other zip-up clothing.'
WHERE LOWER(name) = LOWER('Zipper Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use hook and eye fasteners, a more advanced closure found on some clothing. This requires precise alignment and gentle manipulation. Successfully mastering hooks and eyes shows significant development in fine motor control.',
  why_it_matters = 'Hook and eye frame is an advanced dressing activity that teaches children to work with complementary-shaped fastening components. It develops the precision and gentle touch needed for delicate fasteners and introduces understanding of how different shapes can work together. This skill enhances independence with a variety of clothing types.'
WHERE LOWER(name) = LOWER('Hook and Eye Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use buckles, practical fasteners found on many items children encounter daily. This activity develops hand coordination and understanding of how to secure straps. It helps prepare your child for independence with bags, backpacks, and other buckled items.',
  why_it_matters = 'Buckles frame teaches children to manage practical fastening systems they''ll encounter in daily life. Buckles require coordination of two hands and understanding of tension and security. This skill prepares children for independence with a variety of practical items and reinforces that different fasteners require different techniques.'
WHERE LOWER(name) = LOWER('Buckles Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use safety pins with proper care and respect. Safety pins require understanding of how safety mechanisms work and respect for sharp objects. This is an important lesson in tool use and responsibility, taught with careful supervision.',
  why_it_matters = 'Safety pins frame teaches children about responsibility, safety, and careful tool use. It introduces the concept that tools have safety features designed to protect us, and that proper handling is important. Learning to respect and correctly use safety pins prepares children for responsible handling of tools throughout life and develops the dexterity needed for small mechanical operations.'
WHERE LOWER(name) = LOWER('Safety Pins Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to lace, a fundamental skill for tying shoes. Lacing develops hand coordination and understanding of sequential patterns. It''s a stepping stone to the more complex skill of bow tying.',
  why_it_matters = 'Lacing frame introduces children to threading techniques and sequential patterns essential for shoe lacing and other practical applications. It develops hand-eye coordination and understanding that patterns serve a functional purpose. Mastering lacing is the foundation for bow tying and eventual independence with shoe fastening.'
WHERE LOWER(name) = LOWER('Lacing Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to tie bows, one of the most practical and important self-dressing skills. Bow tying requires coordination of both hands and understanding of sequential steps. Successfully tying bows shows significant progress toward complete dressing independence.',
  why_it_matters = 'Bow tying frame is the culmination of the Montessori dressing frames progression. It teaches children to tie their own shoes and fasteners, a fundamental life skill. This complex motor activity requires both hands working together in a precise sequence, building bilateral coordination and motor planning essential for future success in writing and other fine motor activities. Achieving independence with bow tying represents a major milestone in self-care.'
WHERE LOWER(name) = LOWER('Bow Tying Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Shoe polishing teaches your child that caring for belongings reflects self-respect. The repetitive, orderly sequence builds deep concentration and responsibility. Each time your child polishes shoes, they''re learning that effort produces visible results.',
  why_it_matters = 'This work combines fine motor development, cognitive sequencing, and emotional investment in self-care. It bridges the gap between personal hygiene and environmental responsibility, showing children that they can make real, visible improvements in their world.'
WHERE LOWER(name) = LOWER('Shoe Polishing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The braiding frame is complex work that teaches rhythm and coordination. Children often need weeks of practice before the pattern becomes automatic. This slow mastery builds confidence and prepares the hands for braiding real hair.',
  why_it_matters = 'This work develops bilateral coordination (both hands working together) and abstract thinking (following a repeating pattern without constant visual reference). The meditative quality of repetitive braiding builds deep concentration and calm.'
WHERE LOWER(name) = LOWER('Braiding Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning proper hand washing, a fundamental hygiene habit. Hand washing prevents illness and builds independence in personal care. This skill will serve your child throughout their entire life.',
  why_it_matters = 'Hand washing is a foundational self-care activity essential for health and hygiene. It teaches children responsibility for their own cleanliness and prevention of illness. Learning proper hand washing technique establishes healthy habits that children maintain throughout life and demonstrates that individual actions contribute to community health and wellness.'
WHERE LOWER(name) = LOWER('Hand Washing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is independently washing their face using a basin, soap, water, and towel, learning to care for their own body with intention and responsibility. This self-care activity builds independence, self-awareness, and the confidence that comes from mastering essential life skills.',
  why_it_matters = 'Face washing develops independence, fine motor skills, and self-care responsibility. When children learn to care for themselves, they develop a sense of competence and dignity. This foundation of independence grows into responsibility for their environment and community, and builds emotional well-being.'
WHERE LOWER(name) = LOWER('Face Washing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning proper teeth brushing, an important health habit. This daily routine teaches responsibility for health and establishes lifetime dental hygiene practices. Regular teeth brushing prevents decay and builds confidence in personal care.',
  why_it_matters = 'Teeth brushing is a critical self-care activity that develops responsibility for health and establishes lifelong dental hygiene habits. Learning proper technique ensures that teeth are cleaned thoroughly and effectively. This activity teaches children that consistent daily care maintains health and prevents problems, a concept applicable to all areas of self-care and life.'
WHERE LOWER(name) = LOWER('Teeth Brushing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to manage nasal congestion, an important health skill. Nose blowing is a normal, necessary bodily function, and learning to do it properly teaches independence and hygiene. Maria Montessori noted that children were grateful to learn this skill.',
  why_it_matters = 'Nose blowing is a significant self-care skill that normalizes bodily functions and builds independence. Learning to manage nasal congestion teaches children that health needs are normal and manageable. This activity also reinforces the connection between caring for health and overall wellbeing, demonstrating that competence in self-care builds confidence and self-esteem.'
WHERE LOWER(name) = LOWER('Nose Blowing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Teaching children to cover coughs and sneezes is foundational health education. This simple habit, repeated thousands of times, becomes automatic and protects entire communities. It also teaches children that small individual actions have real effects on others.',
  why_it_matters = 'This work develops both physical reflexes and social awareness. Children learn that their actions directly impact others'' health and wellbeing—a powerful lesson in community responsibility that extends far beyond hygiene.'
WHERE LOWER(name) = LOWER('Covering Coughs and Sneezes');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to brush or comb their own hair independently, practicing fine motor control and hand-eye coordination while building a routine of personal care. This activity builds responsibility, self-awareness, and the routine structure that gives children a sense of order and calm.',
  why_it_matters = 'Hair care develops fine motor skills, hand-eye coordination, and the ability to create and follow daily routines. The sense of order and routine that comes from regular self-care activities provides children with emotional security and confidence in their ability to manage their own needs.'
WHERE LOWER(name) = LOWER('Hair Brushing/Combing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Hair washing is essential self-care that children can learn gradually. Early experiences should be positive and gentle, building confidence. As children grow, they take increasing independence until eventually they manage this completely alone.',
  why_it_matters = 'This work teaches children that caring for themselves is normal, enjoyable, and something they can control. It builds independence, body awareness, and establishes healthy hygiene habits that will serve them throughout life.'
WHERE LOWER(name) = LOWER('Hair Washing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Dressing oneself is a cornerstone of independence. While it takes time and many repetitions, children eventually master this skill completely. Each time your child dresses themselves, they''re building competence and confidence in their ability to care for their own body.',
  why_it_matters = 'This work bridges practical care with emotional development. As children dress themselves independently, they internalize a powerful message: ''I am capable. I can take care of myself.'' This self-trust becomes the foundation for all future learning and independence.'
WHERE LOWER(name) = LOWER('Dressing Oneself');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to dust, a practical care of environment activity. Dusting develops gentle, careful handling of objects and teaches that regular care maintains cleanliness and beauty. This activity shows your child''s ability to contribute to a beautiful, well-maintained environment.',
  why_it_matters = 'Dusting is a practical care of environment activity that develops fine motor control and gentleness with objects. It teaches that regular care maintains cleanliness and extends object life. This activity demonstrates that careful, gentle attention to environment details creates beauty and order, and builds habits of care that extend to all possessions and spaces.'
WHERE LOWER(name) = LOWER('Dusting');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to sweep, a practical care of environment skill. Sweeping develops arm strength and teaches systematic floor cleaning. This activity demonstrates that your child can contribute meaningfully to maintaining a clean environment.',
  why_it_matters = 'Sweeping is a practical care of environment activity that develops arm and body strength while teaching responsibility for maintaining cleanliness. It provides immediate visual feedback as debris is gathered and removed, building satisfaction in completing a visible task. This activity demonstrates that individual effort maintains a clean, pleasant environment for everyone.'
WHERE LOWER(name) = LOWER('Sweeping');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to care for their environment by mopping a floor, developing responsibility for the space around them. This activity combines gross motor movements, coordination, and the satisfaction of seeing a direct result from their own effort and care.',
  why_it_matters = 'Mopping develops gross motor coordination, responsibility, and respect for the environment. When children care for their surroundings, they develop a sense of community and belonging. The visible results of their work build confidence and intrinsic motivation - they are contributing something valuable.'
WHERE LOWER(name) = LOWER('Mopping');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Table scrubbing is meaningful environmental care that children can understand immediately: the table was dirty, now it''s clean, and they made that happen. The rhythmic, meditative quality builds concentration while contributing genuinely to community.',
  why_it_matters = 'This work directly connects children''s actions to visible environmental improvement. It teaches that their work matters, that they can improve their surroundings through effort and care, and that this contributes to a beautiful, pleasant community for everyone.'
WHERE LOWER(name) = LOWER('Table Scrubbing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to clean windows, a practical care of environment skill. Window washing develops arm strength and demonstrates dramatically how cleanliness improves the environment. This activity shows your child''s ability to create brightness and clarity in their surroundings.',
  why_it_matters = 'Window washing is a practical care of environment activity with visually immediate results that build satisfaction and motivation. It develops arm strength through the repetitive motions needed for effective cleaning. This activity demonstrates that regular care transforms spaces and allows light and views to shine through, teaching that cleanliness improves both the function and beauty of environments.'
WHERE LOWER(name) = LOWER('Window Washing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Wood polishing teaches children that natural materials deserve care and attention. The visible transformation from dull to lustrous is highly motivating, and the meditative quality of the work builds deep concentration and calm.',
  why_it_matters = 'This work combines fine motor development with environmental stewardship. Children learn that their careful, thoughtful actions can enhance beauty and preserve materials. The meditative, repetitive quality builds concentration while creating genuine value for the community.'
WHERE LOWER(name) = LOWER('Wood Polishing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Metal polishing is satisfying work because the results are visible and dramatic. Children see their effort directly transform a dull object into a gleaming one. This work teaches that care and attention restore beauty and preserve valuable items.',
  why_it_matters = 'This work develops persistence and attention to detail while building pride in contribution. The dramatic transformation from tarnished to shining teaches children that sustained effort produces visible results—a profound lesson about the value of work and care.'
WHERE LOWER(name) = LOWER('Metal Polishing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Glass polishing teaches children that clear surfaces make environments feel bright and open. The work is straightforward—even young children understand ''dirty'' and ''clean''—making it deeply satisfying. The clarity that emerges is rewarding motivation.',
  why_it_matters = 'This work combines practical care with visual satisfaction. Children see immediate results of their effort, understanding that their work directly improves the environment''s functionality and beauty. It teaches attention to detail and the value of thorough work.'
WHERE LOWER(name) = LOWER('Glass Polishing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is watering plants, observing their growth, and learning the cycles of nature while taking responsibility for another living thing. This activity teaches cause and effect, patience, and the connection between care and growth - lessons that extend far beyond gardening.',
  why_it_matters = 'Plant care develops responsibility, observation skills, and understanding of natural cycles. Children learn that growth takes time, that care matters, and that they can influence the world around them. This builds both scientific thinking and emotional connection to living things.'
WHERE LOWER(name) = LOWER('Plant Care');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is arranging flowers in a vase, developing fine motor skills and an eye for beauty and order. This creative activity teaches respect for natural materials, an appreciation for aesthetics, and the joy of creating something beautiful to share with others.',
  why_it_matters = 'Flower arranging develops fine motor skills, creativity, aesthetic appreciation, and the ability to care for beautiful things. When children learn to create beauty, they develop confidence in their own creative abilities and learn that beauty and order matter. This activity also naturally leads to grace and courtesy when flowers are given as gifts.'
WHERE LOWER(name) = LOWER('Flower Arranging');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Classroom animals teach children that other living beings depend on them. This work builds genuine responsibility—not an abstract concept, but real, daily care with visible consequences. Children develop empathy and understand that their actions directly affect another creature''s wellbeing.',
  why_it_matters = 'Animal care is among the most important practical life works because it connects children to life itself. It teaches empathy, responsibility, and the understanding that all living things deserve respect and care. These lessons transfer directly to all future relationships and ethical development.'
WHERE LOWER(name) = LOWER('Animal Care');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to wash dishes, a practical care of environment skill. This activity develops hand strength, responsibility, and the understanding that everyone contributes to keeping the environment clean and orderly. Dish washing teaches independence and the satisfaction of meaningful work.',
  why_it_matters = 'Dish washing is a fundamental care of environment activity that teaches practical skills needed for managing daily life. It develops muscular strength through scrubbing motions, builds responsibility and independence, and demonstrates that individual efforts contribute to a clean, orderly environment. This activity also provides a sense of accomplishment and the understanding that everyone can contribute meaningfully to the care of their community.'
WHERE LOWER(name) = LOWER('Dish Washing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Hand washing laundry connects children to the work that keeps clothing clean. This real, necessary work teaches that effort produces results. Many children find the water and scrubbing satisfying and meditative.',
  why_it_matters = 'This work teaches practical life skills while building arm strength, concentration, and understanding of care. Children learn that clothes don''t clean themselves—their care keeps things comfortable and hygienic. It''s foundational to independence.'
WHERE LOWER(name) = LOWER('Laundry - Hand Washing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Folding laundry teaches organization and care. While it might seem simple, the precision required—aligning corners, creating straight lines, consistent size—develops fine motor skills and spatial awareness. It''s also deeply satisfying to create order from disorder.',
  why_it_matters = 'This work combines practical care with mathematical thinking (geometry, sequencing). Children learn that organized systems make life easier and more beautiful. The meditative quality of repetitive folding builds concentration and calm.'
WHERE LOWER(name) = LOWER('Folding Laundry');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Greetings are the foundation of courtesy. A warm, genuine greeting sets the tone for positive relationships. Children who learn to greet genuinely develop stronger social connections and greater confidence in social situations.',
  why_it_matters = 'Greetings teach children that other people matter and that they have power to affect others'' emotions positively. This simple skill builds the foundation for all future relationships and community participation.'
WHERE LOWER(name) = LOWER('Greetings');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Learning to introduce people is a valuable social skill. Children who can comfortably introduce others gain confidence and become bridges in their communities. This skill serves them throughout life in school, work, and social settings.',
  why_it_matters = 'Introductions teach children that they have power to create connections. Understanding how to facilitate relationships builds social confidence and generosity of spirit—they''re giving the gift of connection to others.'
WHERE LOWER(name) = LOWER('Introductions');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning, through repeated modeling and gentle practice, the words and the deeper meaning behind saying please and thank you. These grace and courtesy lessons teach children that words carry power - they can show respect, build connections, and smooth over misunderstandings between people.',
  why_it_matters = 'Grace and courtesy lessons build social-emotional skills and respect for others. Children learn that how we speak matters, that gratitude is important, and that kind words and respectful behavior build community. These foundational lessons create the basis for positive relationships throughout life.'
WHERE LOWER(name) = LOWER('Please and Thank You');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Teaching ''excuse me'' teaches children that other people''s space, time, and attention matter. This simple phrase, used consistently, shows respect and generally gets positive responses. It''s a building block for successful social interaction.',
  why_it_matters = 'This work teaches children to balance their own needs with respect for others. They learn that politeness is powerful—people are more willing to help and accommodate polite requests. This directly impacts their ability to navigate social and professional situations throughout life.'
WHERE LOWER(name) = LOWER('Saying Excuse Me');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Learning to interrupt respectfully teaches children to balance their needs with respect for others. It''s a crucial skill for school and life—knowing how to ask for help appropriately increases their success and confidence.',
  why_it_matters = 'This work teaches children that their needs matter AND that others'' time matters. They learn to advocate for themselves while respecting others—a balance essential for healthy relationships and social success throughout life.'
WHERE LOWER(name) = LOWER('How to Interrupt');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Learning to offer and accept help graciously teaches children that interdependence is healthy. They learn that community means supporting each other, and that receiving help is an opportunity to learn gratitude. This builds strong relationships throughout life.',
  why_it_matters = 'This work teaches that people are interconnected and that we help each other. It normalizes receiving help (preventing shame or resistance to assistance) while teaching the joy of giving help. It builds a foundation for healthy relationships and community.'
WHERE LOWER(name) = LOWER('Offering and Accepting Help');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Teaching children to apologize sincerely teaches them that mistakes can be repaired. They learn that acknowledging harm and making amends strengthens relationships rather than weakening them. This is crucial for healthy relationships throughout life.',
  why_it_matters = 'This work teaches that accountability and sincerity matter. Children learn that mistakes are part of being human, and that how you respond to mistakes defines your character. This builds emotional maturity, resilience, and the capacity for genuine relationships.'
WHERE LOWER(name) = LOWER('Apologizing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning table manners, skills that demonstrate respect and create pleasant mealtimes. Proper table etiquette shows consideration for others and builds confidence in social dining situations. These practical skills will serve your child throughout their entire life.',
  why_it_matters = 'Table manners is a fundamental grace and courtesy lesson that teaches children to eat respectfully and considerately. Learning proper mealtime behavior demonstrates respect for food, others, and the meal itself. These skills create pleasant mealtimes, build confidence in social eating situations, and teach children that courtesy and consideration enhance everyone''s enjoyment of meals and community.'
WHERE LOWER(name) = LOWER('Table Manners');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Setting a beautiful table teaches children that creating a welcoming, organized space matters. It''s a tangible way they contribute to family meals, and it teaches respect for gathering together. Many families have traditions around table-setting and meals.',
  why_it_matters = 'This work combines practical skill with aesthetic awareness and hospitality. Children learn that their actions create the environment for community gathering. Setting a table is a small act of care that makes everyone''s experience more pleasant and respectful.'
WHERE LOWER(name) = LOWER('Setting the Table');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Teaching children to observe respectfully teaches them to value others'' processes and concentration. It''s a quiet form of respect that shows genuine interest without intrusion. This skill supports both the observer and the observed.',
  why_it_matters = 'This work teaches that being present and attentive is a form of respect and kindness. Children learn that they can support others'' learning through quiet, genuine appreciation—without needing to do anything or say much. It builds the foundation for respectful, contemplative presence.'
WHERE LOWER(name) = LOWER('Observing Another''s Work');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Teaching children to walk around others'' work teaches spatial awareness and respect. It shows them that their actions impact others and that shared spaces require consideration. This develops the foundation for respectful community participation.',
  why_it_matters = 'This work teaches that awareness matters. As children develop the habit of observing, considering, and moving mindfully, they naturally become more respectful and less destructive. It builds the foundation for grace, consideration, and community responsibility.'
WHERE LOWER(name) = LOWER('Walking Around Someone''s Work');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Teaching children to share and take turns teaches patience and fairness. In a classroom with limited materials, this is essential. Children learn that waiting isn''t punishment—it''s how fair communities work. This builds empathy and community responsibility.',
  why_it_matters = 'This work teaches fundamental social and emotional skills: patience, empathy, fairness, and delayed gratification. Children learn that they''re part of a community where everyone''s needs matter, including their own. This builds the foundation for healthy relationships and social participation throughout life.'
WHERE LOWER(name) = LOWER('Sharing and Taking Turns');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Washing fruits and vegetables teaches children that food requires care and preparation. They learn that clean food is important for health and safety. The tactile exploration of produce builds connection to food sources.',
  why_it_matters = 'This work teaches practical life skills while building respect for food and awareness of food safety. Children learn that their careful preparation contributes to family health and wellbeing. It''s a foundational skill for lifelong eating and cooking.'
WHERE LOWER(name) = LOWER('Washing Fruits and Vegetables');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to spread, a practical food preparation skill. Spreading develops fine motor control and builds independence in preparing simple foods. This activity teaches your child that they can prepare their own snacks and meals.',
  why_it_matters = 'Spreading is a fundamental food preparation activity that develops fine motor control and builds confidence in the kitchen. It teaches children to work with precision and care, and demonstrates that they can independently prepare simple, nutritious foods. This activity also builds appreciation for food preparation and independence in meeting their own nutritional needs.'
WHERE LOWER(name) = LOWER('Spreading');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Peeling easy fruits is a perfect stepping stone to more complex food preparation. Children gain confidence and hand strength while learning practical nutrition skills. It''s easy enough to feel successful while challenging enough to be satisfying.',
  why_it_matters = 'This work builds practical independence. As children learn to peel and prepare their own food, they develop confidence in their ability to care for themselves. It''s a tangible skill that translates directly to home and self-sufficiency.'
WHERE LOWER(name) = LOWER('Peeling - Easy Items');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Using a vegetable peeler is a more advanced skill that teaches tool handling and food preparation. Once mastered, it opens the door to independent food preparation at home. The confidence gained is substantial.',
  why_it_matters = 'This work teaches responsible tool use and builds toward greater independence in the kitchen. Children learn that they can handle real tools safely and competently. It''s a bridge to more complex food preparation and cooking.'
WHERE LOWER(name) = LOWER('Peeling - With Peeler');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using a child-safe knife to cut soft foods like banana, melon, or strawberry, developing confidence and independence in the kitchen. Starting with foods that require minimal effort builds success and confidence before progressing to more challenging materials.',
  why_it_matters = 'Cutting soft foods develops fine motor skills, hand strength, and confidence in the kitchen. Beginning with success builds motivation and self-trust. The progression of knife skills teaches children that we learn by starting simple and building gradually - a lesson that applies to all learning.'
WHERE LOWER(name) = LOWER('Cutting Soft Foods');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is now using appropriate knives to cut vegetables like cucumber, carrot, or apple, building upon earlier knife skills with more challenging materials. This progression develops stronger fine motor control, problem-solving (how much pressure do I need?), and growing independence in meal preparation.',
  why_it_matters = 'Cutting harder foods develops refined fine motor control, grip strength, and the confidence that comes from mastering progressively more challenging skills. Children learn that effort and practice lead to mastery, building resilience and the growth mindset that supports learning in all areas.'
WHERE LOWER(name) = LOWER('Cutting Harder Foods');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to grate food, an important food preparation skill. Grating develops hand strength and teaches safe tool use. This activity demonstrates that different tools transform food in different ways, building confidence in the kitchen.',
  why_it_matters = 'Grating is a practical food preparation activity that teaches children to use a multi-surfaced grater safely and effectively. It develops arm strength through controlled grating motions and provides immediate visual feedback as food is transformed into smaller pieces. This activity builds confidence with kitchen tools and demonstrates that food can be prepared in many different forms through various techniques.'
WHERE LOWER(name) = LOWER('Grating');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to juice citrus fruits, a practical food preparation skill. Juicing develops arm strength and teaches the value of fresh, natural foods. This activity builds independence and appreciation for nutritious beverages prepared from whole fruits.',
  why_it_matters = 'Juicing is a practical food preparation activity that demonstrates how natural foods can be processed into different forms. It develops arm strength through pressing and teaches children the source of common beverages. This activity builds appreciation for fresh, whole foods and demonstrates that healthy nutrition comes from natural ingredients that children can prepare themselves.'
WHERE LOWER(name) = LOWER('Juicing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Cracking eggs teaches children that they can work with delicate, breakable items carefully. It''s a foundational cooking skill that builds confidence. Most importantly, it teaches that hands-on work with real materials is satisfying and empowering.',
  why_it_matters = 'This work builds confidence in kitchen skills and independence in food preparation. Children learn that they can handle delicate items successfully, and that practical kitchen work is within their capability. It''s empowering and teaches self-sufficiency.'
WHERE LOWER(name) = LOWER('Cracking Eggs');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to prepare snacks independently. Simple snack preparation builds confidence, teaches food safety, and demonstrates that your child can meet their own nutritional needs. This practical skill supports independence and healthy eating habits.',
  why_it_matters = 'Making a snack teaches children that they can independently prepare food and meet their own needs. It demonstrates food safety and hygiene while building confidence in kitchen skills. This activity fosters independence and teaches that children''s contributions to food preparation are valued and important. Learning to prepare simple snacks builds a foundation for all future cooking skills and promotes healthy eating habits and independence in nutrition.'
WHERE LOWER(name) = LOWER('Making a Snack');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Threading beads is calming, meditative work that builds fine motor skills and focus. The beauty of creating something wearable or displayable is highly motivating. Many children want to repeat this work many times.',
  why_it_matters = 'This work develops concentration, fine motor control, and the foundation for more advanced sewing skills. The meditative quality makes it calming and therapeutic. It builds the hand strength and coordination needed for writing and other precise work.'
WHERE LOWER(name) = LOWER('Threading Beads');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Sewing cards are a wonderful bridge between threading beads and real sewing. They teach needle control and stitching skills in a forgiving format. The meditative quality and visible progress build both focus and pride.',
  why_it_matters = 'This work develops the fine motor skills, hand strength, and concentration needed for real sewing. It builds confidence in handling sewing tools and creates the foundation for textile work. The meditative quality makes it calming while being productive and skill-building.'
WHERE LOWER(name) = LOWER('Sewing Cards');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Paper punching is a satisfying, safe introduction to using hand tools. The immediate visual result and the rhythmic nature make it appealing to children. It builds hand strength and tool confidence.',
  why_it_matters = 'This work develops hand strength, tool handling skills, and confidence. The satisfying, immediate results build motivation and pride. It''s a wonderful transition to more advanced handwork like sewing and crafting.'
WHERE LOWER(name) = LOWER('Paper Punching');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning the running stitch, the foundational sewing technique. Running stitch develops hand-eye coordination and provides satisfaction through creating visible, functional stitches. This skill opens the door to sewing projects and practical clothing repair.',
  why_it_matters = 'Running stitch is the most fundamental sewing technique that teaches children how thread creates strong, durable seams. It develops hand-eye coordination, rhythm, and the ability to create consistent, functional stitches. Learning running stitch builds confidence in sewing and demonstrates that with practice and focus, children can create beautiful, functional items. This skill is essential for all future sewing work and provides a foundation for understanding how fabrics are constructed and repaired.'
WHERE LOWER(name) = LOWER('Running Stitch');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Cross-stitch is an advanced handwork skill that teaches precision, pattern following, and patience. The finished work is often beautiful enough to display or gift, which builds tremendous pride. It''s therapeutic and focuses the mind powerfully.',
  why_it_matters = 'This work develops the highest level of fine motor control, concentration, and precision. It teaches that complex, beautiful things take sustained effort and focus. The meditative quality of repetitive cross-stitching is calming and therapeutic, while the finished product is deeply satisfying.'
WHERE LOWER(name) = LOWER('Cross Stitch');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to sew buttons, a practical skill that repairs and maintains clothing. Sewing buttons builds confidence in solving real problems and demonstrates that children can care for their belongings independently. This skill teaches that small efforts extend the life of items and contribute to family well-being.',
  why_it_matters = 'Sewing a button is a practical, real-world sewing application that teaches children valuable repair skills. It demonstrates that their sewing abilities can solve actual problems and that repair is often simpler than replacement. This activity builds practical independence, confidence, and understanding that small skills contribute to self-sufficiency and environmental responsibility through caring for and extending the life of possessions.'
WHERE LOWER(name) = LOWER('Sewing a Button');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Weaving is creating cloth from scratch—a profound, meditative experience. Children understand viscerally how fabric is made. The finished weaving is tangible proof of their work and can be worn, displayed, or gifted. It builds tremendous pride and accomplishment.',
  why_it_matters = 'This work teaches that beautiful, functional things are created through repetitive, focused work. The meditative rhythm of weaving builds concentration and calm. Understanding how fabric is made creates respect for textiles and appreciation for craftsmanship. The creation of something truly useful and beautiful is deeply satisfying and empowering.'
WHERE LOWER(name) = LOWER('Weaving');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use an eye dropper with precision and control. This fine motor activity develops finger strength and dexterity, and introduces your child to managing small quantities of liquid. It''s a foundation for future scientific observation and careful measurement.',
  why_it_matters = 'Eye dropper transfer is a sophisticated transfer activity that develops fine motor control and precision with tools. It teaches children to manage very small amounts of liquid, a skill essential for cooking, art, science, and other practical activities. The activity also builds confidence with tools and introduces concepts of measurement and volume.'
WHERE LOWER(name) = LOWER('Eye Dropper Transfer');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to brush their own hair, an important grooming skill. Hair brushing develops independence in personal care and self-awareness through mirror observation. This activity teaches your child to care for their appearance as an act of self-respect.',
  why_it_matters = 'Hair brushing is a practical self-care activity that develops independence and self-awareness. Using a mirror builds self-concept and awareness of personal appearance. This activity teaches children that grooming and personal care are forms of self-respect and that maintaining a neat appearance is within their control. The daily habit of hair care supports overall hygiene and wellbeing.'
WHERE LOWER(name) = LOWER('Hair Brushing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to polish metal, a care of environment activity. Polishing develops hand strength and arm control while creating visible, satisfying results. This activity teaches your child that effort and care maintain beauty and order in the environment.',
  why_it_matters = 'Polishing metal is a practical care of environment activity that develops muscular strength and provides immediate visual feedback showing the effect of effort and care. Children experience the satisfaction of transforming a dull object into a shiny one through their own work. This activity builds concentration, demonstrates the value of maintenance, and develops an appreciation for beautiful, orderly environments.'
WHERE LOWER(name) = LOWER('Polishing Metal');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to polish wood, a care of environment activity that teaches respect for natural materials. Wood polishing develops fine motor control and an appreciation for maintaining beauty. This activity shows your child that their efforts directly contribute to keeping the environment beautiful and protected.',
  why_it_matters = 'Wood polishing is a practical care of environment activity that teaches children to respect and care for natural materials. It develops fine motor control through smooth, directional motions and builds appreciation for the beauty of wood grain and finish. This activity demonstrates that objects properly maintained remain beautiful and functional, and that care and attention extend the life and beauty of materials. Learning to work with natural materials builds a foundation for environmental awareness and respect.'
WHERE LOWER(name) = LOWER('Polishing Wood');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to wash cloths, a practical care of environment skill. Cloth washing develops hand and arm strength and teaches responsibility for keeping materials clean. This activity demonstrates that effort and care maintain the cleanliness of materials we use daily.',
  why_it_matters = 'Cloth washing is a practical care of environment activity that teaches children to maintain materials and develop independence in cleaning tasks. It develops muscular strength through rubbing and wringing, provides immediate visual feedback as dirt leaves the cloth, and builds understanding that individual effort maintains a clean environment. This activity also connects to historical practices and teaches respect for materials and resources.'
WHERE LOWER(name) = LOWER('Cloth Washing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to scrub and clean a table, an important care of environment activity. Table scrubbing develops physical strength and teaches responsibility for maintaining the classroom. This meaningful work demonstrates that your child''s efforts directly contribute to a clean, pleasant environment.',
  why_it_matters = 'Table scrubbing is a fundamental care of environment activity that teaches practical skills and builds responsibility for shared spaces. It develops arm and hand strength through repetitive motions, provides clear visual feedback showing the results of effort, and builds confidence through completing a meaningful task. This activity demonstrates that systematic, thorough work maintains a clean, pleasant environment for everyone.'
WHERE LOWER(name) = LOWER('Scrubbing a Table');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to peel fruits and vegetables, a foundational food preparation skill. Peeling develops hand strength and coordination while teaching practical meal preparation. This activity builds independence and the satisfaction of contributing to family meals.',
  why_it_matters = 'Peeling is a fundamental food preparation activity that develops fine motor control and practical independence. It teaches children that they can participate in preparing their own food and contributes to the development of healthy eating habits. This activity also demonstrates the connection between raw ingredients and prepared food, and builds confidence in handling food safely.'
WHERE LOWER(name) = LOWER('Peeling');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to cut and slice food safely. Cutting develops hand strength, coordination, and respect for tools. This activity builds confidence and independence in food preparation while establishing safe habits with sharp implements.',
  why_it_matters = 'Cutting and slicing is a practical food preparation activity that teaches children to use sharp tools safely and develop control and focus. Learning proper cutting technique builds confidence with increasingly complex tools and demonstrates that careful attention and safe habits allow for successful use of potentially dangerous items. This activity is foundational for all future cooking and kitchen work.'
WHERE LOWER(name) = LOWER('Cutting/Slicing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to greet others with respect and warmth. Greeting teaches social skills and builds confidence in interactions. This foundational courtesy skill helps your child develop positive relationships throughout their life.',
  why_it_matters = 'Greeting is a fundamental grace and courtesy lesson that teaches children to interact respectfully with others. Learning to greet with eye contact, smile, and warm tone builds confidence in social situations and demonstrates that courtesy creates positive connections. This skill is foundational for all future social and professional interactions.'
WHERE LOWER(name) = LOWER('Greeting');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning not to interrupt, a crucial social skill. Learning to wait patiently and respect others'' focus shows maturity and builds respectful relationships. This lesson teaches your child that consideration for others'' needs is important.',
  why_it_matters = 'Learning not to interrupt is a fundamental grace and courtesy lesson that teaches children to respect others'' time and focus. It develops impulse control and builds empathy by helping children understand how interruptions affect others. This skill is essential for successful collaboration, learning, and all future relationships.'
WHERE LOWER(name) = LOWER('Interrupting');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to respect others'' workspace by walking carefully around mats. This lesson teaches awareness of others and builds a respectful classroom community. Walking around mats shows your child that everyone''s work deserves respect and focus.',
  why_it_matters = 'Walking around mats is a fundamental grace and courtesy lesson that teaches children to respect others'' space and concentration. It develops awareness of others'' needs and builds a peaceful, orderly environment where everyone can focus. This skill demonstrates that individual actions affect the community and that respectful behavior creates a positive environment for everyone.'
WHERE LOWER(name) = LOWER('Walking Around Mats');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to thread a needle, the first step toward sewing independence. Threading develops fine motor precision and patience. This practical skill opens the door to sewing projects and repairs that your child can eventually do independently.',
  why_it_matters = 'Threading a needle is the foundational sewing skill that teaches children how thread and needle work together. It develops the fine motor precision and patience necessary for all future sewing work. Learning to thread successfully builds confidence and demonstrates that challenging tasks become easier with practice and persistence. This skill is essential preparation for all sewing activities.'
WHERE LOWER(name) = LOWER('Threading a Needle');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to roll and unroll a mat, a key foundation skill for floor work. This activity develops coordination and introduces the concept of sequence and order. It''s one of the first practical life activities a child learns in the Montessori classroom.',
  why_it_matters = 'Rolling and unrolling a mat teaches children about sequence, order, and caring for materials. It develops gross and fine motor control while building the foundation for all floor work activities. This activity is traditionally one of the first practical life lessons, setting the tone for how children interact with materials and spaces throughout their Montessori journey.'
WHERE LOWER(name) = LOWER('Rolling and Unrolling a Mat');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to open and close books carefully. This foundational skill teaches respect for reading materials and prepares your child for all future learning. Proper book handling ensures books last and demonstrates care for the tools of learning.',
  why_it_matters = 'Opening and closing a book properly teaches children to respect reading materials from the very beginning. It develops gentle hand control and fosters a positive relationship with books. This skill demonstrates that reading and learning are valued activities worth careful, respectful handling. Early respect for books often leads to a lifelong love of reading and learning.'
WHERE LOWER(name) = LOWER('Opening and Closing a Book');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is developing independence in dressing, a crucial self-care skill. Learning to dress independently builds confidence, self-esteem, and practical life skills. This activity demonstrates that your child is capable of caring for themselves.',
  why_it_matters = 'Self-dressing is a fundamental independence skill that teaches children to manage their own bodies and prepare for daily activities. It develops body awareness, sequencing skills, and problem-solving while building self-esteem and confidence. Learning to dress independently is a major milestone that demonstrates growing competence and self-reliance.'
WHERE LOWER(name) = LOWER('Self-Dressing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to pour dry materials with control. Dry pouring develops hand-eye coordination and precision before introducing the complexity of liquid pouring. This foundational activity teaches control and prepares your child for cooking and other practical tasks.',
  why_it_matters = 'Dry pouring is an essential preliminary transfer activity that teaches children precise, controlled hand movements. It develops hand-eye coordination and demonstrates cause and effect with gravity. Learning to pour without spilling builds confidence and establishes the foundation for all future pouring activities, including wet pouring and cooking.'
WHERE LOWER(name) = LOWER('Dry Pouring');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to pour water with precise control. Water pouring is more challenging than dry pouring and requires focus and coordination. This activity develops the motor skills essential for cooking, food preparation, and other practical life activities.',
  why_it_matters = 'Water pouring is a sophisticated transfer activity that teaches children to control liquids, which are more challenging than solids. It develops the precise motor control and hand-eye coordination needed for cooking and other practical kitchen tasks. Successfully pouring water builds confidence and demonstrates that mastery comes through practice and focused effort.'
WHERE LOWER(name) = LOWER('Water Pouring');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to undress independently and manage their clothing. Undressing teaches organization, self-care, and independence. This practical life skill develops responsibility for personal belongings.',
  why_it_matters = 'Undressing is a fundamental self-care skill that builds independence and organization. Learning to remove clothing and properly place it develops responsibility for belongings and introduces laundry concepts. This activity teaches that managing one''s clothing is an important part of self-care and home management.'
WHERE LOWER(name) = LOWER('Undressing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to bathe, an essential daily hygiene activity. Bathing teaches cleanliness, safety, and independence while building comfort with water. This practical life skill supports health and wellness.',
  why_it_matters = 'Bathing is a fundamental self-care activity that teaches children to maintain personal hygiene and develop independence in daily routines. Learning proper bathing techniques, combined with water safety, creates healthy habits that protect children''s wellbeing. This activity also builds confidence in managing self-care tasks independently while developing an understanding that regular cleanliness supports health and comfort.'
WHERE LOWER(name) = LOWER('Bathing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to prepare and serve meals, practical skills that contribute to family life. Meal preparation and serving develop independence, responsibility, and an understanding that feeding the family is a shared responsibility.',
  why_it_matters = 'Meal preparation and serving teaches children practical independence and builds understanding of their role in family and community. Learning to set a table, serve food, and clear dishes demonstrates that each person contributes meaningfully to shared meals. This activity builds responsibility, confidence, and understanding that meals are important times for connection and nourishment.'
WHERE LOWER(name) = LOWER('Meal Preparation and Serving');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to say please and thank you, fundamental courtesy words that show respect and gratitude. These simple words open doors and create positive relationships. Teaching your child these words is teaching valuable lessons about respect and appreciation.',
  why_it_matters = 'Learning to say please and thank you teaches children to express gratitude and make respectful requests. These foundational courtesy words demonstrate that appreciation and respect create positive interactions. Learning to use these words genuinely builds empathy and understanding that courtesy affects how others respond to us, creating a foundation for all positive relationships.'
WHERE LOWER(name) = LOWER('Saying Thank You and Please');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to care for living things, developing responsibility and empathy. Caring for plants and animals teaches that we depend on nature and that our actions affect other living beings. This activity builds a foundation for environmental awareness and respect.',
  why_it_matters = 'Caring for living things teaches children responsibility, observation, and empathy. It develops understanding that all living things have needs and that we play a role in meeting those needs. This activity connects children to nature and builds awareness of their role in the ecosystem, fostering environmental consciousness and a sense of stewardship that lasts a lifetime.'
WHERE LOWER(name) = LOWER('Care of Living Things');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to set a table, a practical skill that prepares welcoming meals. Table setting teaches organization, care, and the importance of preparation. This activity shows your child''s ability to contribute meaningfully to family meals.',
  why_it_matters = 'Setting a table teaches children about order, organization, and the care that goes into preparing spaces for shared meals. It demonstrates that preparation and attention to detail create welcoming environments. This activity builds pride in contributing to family life and shows that small gestures of care and organization demonstrate respect and hospitality.'
WHERE LOWER(name) = LOWER('Setting a Table');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to ask for help politely. This important social skill teaches that asking for help is acceptable and builds strong relationships. Teaching your child to seek help when needed fosters confidence and community connections.',
  why_it_matters = 'Learning to ask for help appropriately teaches children that seeking assistance is a sign of wisdom, not weakness. It builds communication skills and demonstrates that communities are built on mutual support and interdependence. This lesson creates confidence in asking for what is needed and fosters relationships based on trust, respect, and reciprocal support.'
WHERE LOWER(name) = LOWER('Asking for Help Politely');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning laundry management, a critical self-care and household skill. Laundry teaches responsibility for clothing and contributes meaningfully to family functioning. This practical skill builds independence and demonstrates the child''s ability to manage significant household tasks.',
  why_it_matters = 'Laundry is a comprehensive practical life activity that teaches children complete responsibility for clothing care from dirty to clean to storage. It develops independence and demonstrates that children can manage substantial household tasks. This activity builds pride in contributing to family functioning and creates habits of responsibility and cleanliness that support independence throughout life. Learning laundry skills shows that children are capable of managing complex, multi-step tasks essential to daily living.'
WHERE LOWER(name) = LOWER('Laundry');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to distinguish between cylinders that vary in thickness while keeping height the same. By removing and replacing each cylinder in its correct hole, they''re developing a keen eye for subtle differences in size. This foundational exercise teaches them to notice fine details they''ll need for reading, writing, and math.',
  why_it_matters = 'Refining visual discrimination builds the perceptual skills needed for distinguishing letters and numbers. The self-correcting material also teaches persistence and problem-solving—when a cylinder doesn''t fit, your child learns to look more carefully and try again.'
WHERE LOWER(name) = LOWER('Cylinder Block 1');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Now your child is working with cylinders that vary in both thickness and height, making the task more challenging than Block 1. They''re learning to notice two changing dimensions at once while maintaining the same concentration and care. This builds their ability to perceive complex relationships between size and proportion.',
  why_it_matters = 'This material develops more advanced visual discrimination and prepares them for understanding relationships between different variables—skills essential for higher math, geometry, and scientific thinking.'
WHERE LOWER(name) = LOWER('Cylinder Block 2');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with cylinders where diameter decreases while height increases—dimensions moving in opposite directions. This is one of the most challenging cylinder blocks because the visual relationships are more complex. It stretches their analytical thinking as they learn to track multiple changing attributes.',
  why_it_matters = 'This block develops sophisticated spatial reasoning and the ability to think about relationships in multiple ways at once. These higher-order thinking skills form the foundation for algebra and abstract mathematical reasoning.'
WHERE LOWER(name) = LOWER('Cylinder Block 3');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is now focusing on height alone, as all cylinders have the same diameter. They''re learning to grade from tallest to shortest with precision. This final progression simplifies back to one variable, helping them consolidate all they''ve learned and master the concept of linear measurement.',
  why_it_matters = 'Mastering this block completes the journey through dimension perception and reinforces the concept of seriation—arranging objects in order—which is crucial for understanding sequences, patterns, and mathematical ordering.'
WHERE LOWER(name) = LOWER('Cylinder Block 4');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'When a child has mastered individual Cylinder Blocks, they''re ready for a bigger challenge: mixing cylinders from multiple blocks together. This teaches them to notice finer details and think more carefully about sizes and shapes. It''s like a puzzle where they have to figure out which block each cylinder belongs to based on its unique size. This helps develop problem-solving skills and the ability to focus deeply on complex tasks.',
  why_it_matters = 'Combining Cylinder Blocks represents a natural progression in visual discrimination development. It prepares children for more abstract geometric thinking and mathematical concepts. The challenge of distinguishing fine differences builds neural pathways for detailed observation and logical analysis. This work also demonstrates the Montessori principle of progressive complexity—building skills in manageable steps toward increasingly sophisticated understanding.'
WHERE LOWER(name) = LOWER('Cylinder Blocks Combined');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is building a tower with ten beautiful pink cubes, each slightly smaller than the last. This seemingly simple activity is actually training their eyes to notice tiny differences in size—a skill that will later help them distinguish between letters like ''b'' and ''d'' or understand that three is bigger than two.',
  why_it_matters = 'The Pink Tower develops visual discrimination, concentration, and fine motor control. It also introduces mathematical concepts of dimension, sequence, and grading, while building the fundamental spatial awareness they''ll need for geometry and measurement throughout their education.'
WHERE LOWER(name) = LOWER('Pink Tower');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with ten rectangular wooden blocks that gradually change in thickness. Unlike the pink cubes, these blocks vary in width and depth, not height, teaching the concept of ''thick'' and ''thin.'' They''re learning to grade and order based on a different dimension, expanding their understanding of how objects can differ.',
  why_it_matters = 'The Brown Stair, often used alongside the Pink Tower to create patterns and designs, refines visual discrimination for different attributes and builds spatial reasoning. It also develops the fine motor control needed for writing and the mathematical thinking required for understanding proportion.'
WHERE LOWER(name) = LOWER('Brown Stair (Broad Stair)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about length by handling rods that range from 10 centimeters to one meter. By holding them at both ends and comparing them, they develop a physical, bodily sense of ''long'' and ''short.'' This material makes the abstract concept of linear measurement concrete and tangible.',
  why_it_matters = 'The Red Rods develop the child''s understanding of length and linear measurement, introduce the concept of the meter, and build strength and coordination. This material also serves as indirect preparation for understanding number and creating a foundation for mathematical learning.'
WHERE LOWER(name) = LOWER('Red Rods (Long Rods)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with colored cylinders (red, blue, yellow, and green sets) without handles, making them more challenging to manipulate than knobbed cylinders. They must use a refined pincer grip to remove and replace each cylinder, which requires both strength and precision. These cylinders can also be mixed together for more complex matching and organizing activities.',
  why_it_matters = 'The Knobless Cylinders develop refined fine motor skills, as children must use greater dexterity to handle them. They also strengthen visual discrimination and introduce the concept of comparing and grading across multiple attributes—skills that prepare children for more advanced sensorial work and academic learning.'
WHERE LOWER(name) = LOWER('Knobless Cylinders');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring the three primary colors—red, blue, and yellow—through a pairing activity where they match identical color tablets. This simple introduction to color helps them learn color names and notice how colors are different from one another. It''s their first step into understanding the visual world through organized categories.',
  why_it_matters = 'Color Box 1 develops visual discrimination of the most sharply contrasting colors and builds vocabulary. It also teaches the concept of matching and categorization—foundational skills for organizing information and understanding how things can be grouped and compared.'
WHERE LOWER(name) = LOWER('Color Box 1 (Primary Colors)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is now exploring a wider range of colors, including the secondary colors (orange, green, and purple) along with neutrals like white, black, gray, and brown. Through pairing activities, they''re learning to match and name a full spectrum of colors, deepening their visual discrimination and color vocabulary.',
  why_it_matters = 'Color Box 2 expands your child''s color knowledge and discrimination skills while introducing secondary colors formed by mixing primaries—an indirect introduction to the science of color mixing. This work also strengthens their ability to organize information into larger, more complex categories.'
WHERE LOWER(name) = LOWER('Color Box 2 (Secondary Colors)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with nine colors, each presented in seven different shades from light to dark. Rather than matching pairs, they''re now grading each color from lightest to darkest. This more complex work requires careful observation and teaches them to notice subtle differences within a single color family.',
  why_it_matters = 'Color Box 3 develops the most refined visual discrimination of color, introducing concepts of shade and gradation. It builds concentration and patience, as the task requires careful attention to minute differences. This material also introduces mathematical thinking about ranking, ordering, and relationships.'
WHERE LOWER(name) = LOWER('Color Box 3 (Color Gradations)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering two-dimensional shapes through a beautiful wooden cabinet containing circles, triangles, rectangles, squares, and many other geometric forms. By removing the wooden insets and tracing or replacing them, they''re learning to recognize and name basic geometric shapes. This tactile exploration helps make abstract geometry concrete and real.',
  why_it_matters = 'The Geometric Cabinet introduces the vocabulary and visual recognition of geometric shapes, which are the building blocks of all geometry and design. It develops fine motor skills, visual discrimination, and spatial awareness. This work also prepares children for understanding geometry, architecture, art, and the mathematical forms that are everywhere in their world.'
WHERE LOWER(name) = LOWER('Geometric Cabinet');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is holding and exploring three-dimensional shapes like spheres, cubes, rectangular prisms, cylinders, cones, and pyramids. By touching and manipulating these solid forms, they''re developing an understanding of how shapes exist in space with volume and dimension. This work bridges the gap between flat shapes and the three-dimensional world around them.',
  why_it_matters = 'Geometric Solids develop spatial awareness and three-dimensional thinking, which is essential for understanding geometry, engineering, architecture, and physics. Holding these shapes builds the tactile sense and helps children understand that shapes have properties beyond their appearance.'
WHERE LOWER(name) = LOWER('Geometric Solids');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a set of triangles in a rectangular box that can be combined and rearranged to form different rectangles and other shapes. Through hands-on exploration, they''re discovering how smaller shapes fit together to create larger ones. This is mathematical thinking in action, as they learn about parts and wholes.',
  why_it_matters = 'This material develops spatial reasoning and introduces concepts of composition and decomposition—understanding that shapes can be broken apart and reassembled. These are foundational concepts for geometry, fractions, and later algebra.'
WHERE LOWER(name) = LOWER('Constructive Triangles - Rectangular Box');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with triangles that fit together to form a large equilateral triangle. This set teaches them how different types of triangles (equilateral, isosceles, and right triangles) can be combined to create the same larger shape in multiple ways. It''s a beautiful exploration of geometric relationships and mathematical flexibility.',
  why_it_matters = 'This material develops understanding of triangle relationships, geometric composition, and the concept of equivalence—that different combinations can create the same result. These concepts are foundational for later learning in geometry, fractions, and algebra.'
WHERE LOWER(name) = LOWER('Constructive Triangles - Triangular Box');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Large Hexagonal Box of Constructive Triangles shows children something magical: two simple shapes can combine to make something completely different! By fitting triangles together, children discover that all sorts of shapes (squares, rectangles, hexagons) are actually made of triangles. This hands-on exploration prepares them for geometry while developing spatial thinking. The black lines on the triangles guide them—when lines match up perfectly, they know the pieces fit together correctly.',
  why_it_matters = 'Constructive Triangles bridge sensorial learning and formal geometry. They make abstract geometric concepts concrete and discoverable. Children learn that geometric shapes have relationships and rules, but through exploration rather than instruction. This material also develops the mental rotation skills needed for later mathematics, engineering, and spatial reasoning. The Large Hexagonal Box specifically introduces more complex polygon relationships, deepening geometric understanding.'
WHERE LOWER(name) = LOWER('Constructive Triangles - Large Hexagonal Box');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Small Hexagonal Box teaches something amazing: six small triangles fit together perfectly to make a hexagon. This helps children understand fractions and how parts relate to wholes. Working with smaller pieces also requires more careful attention and fine motor control. The different colored triangles make it fun to create colorful patterns while learning about shapes and their relationships. This is beautiful sensorial learning that naturally leads to mathematical thinking.',
  why_it_matters = 'The Small Hexagonal Box represents a progression in geometric complexity. It introduces the concept of fractions concretely—children see and feel that six triangles equal one hexagon. It also develops visual discrimination at a finer level and strengthens the fine motor precision needed for writing and detailed work. The relationship between this box and the Large Hexagonal Box naturally develops comparative thinking and mathematical reasoning.'
WHERE LOWER(name) = LOWER('Constructive Triangles - Small Hexagonal Box');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring a set of blue triangles of various sizes and types that can be combined to create different geometric shapes and patterns. Through experimentation and discovery, they''re learning about how triangles relate to one another and how they can be used to build more complex shapes. This work encourages creative mathematical thinking.',
  why_it_matters = 'The Blue Triangles develop spatial reasoning, geometric understanding, and creativity. They also build problem-solving skills as children discover different ways to combine shapes, and they introduce the concept of different geometric solutions to the same problem.'
WHERE LOWER(name) = LOWER('Constructive Triangles - Blue Triangles');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is assembling a wooden cube made of eight colored blocks and rectangular prisms. The cube is beautiful but also mathematically elegant—it''s a concrete representation of the algebraic formula (a+b)³. By fitting the pieces together like a puzzle, your child is experiencing the pattern of mathematical expansion in their hands and eyes, though they may not yet know the algebra behind it.',
  why_it_matters = 'The Binomial Cube is an indirect introduction to algebra and the concept of mathematical patterns. It develops spatial reasoning, problem-solving, and visual perception. The self-correcting nature of the material (the pieces only fit together one way when assembled correctly) teaches your child to verify their work and think logically about spatial relationships.'
WHERE LOWER(name) = LOWER('Binomial Cube');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a more complex version of the Binomial Cube, assembling a cube from 27 pieces in various colors and sizes. This material represents the algebraic formula (a+b+c)³. Just like the Binomial Cube, it''s a hands-on way to experience complex mathematical patterns through puzzle-solving and spatial arrangement.',
  why_it_matters = 'The Trinomial Cube develops even more sophisticated spatial reasoning and introduces children to how patterns can become more complex. It builds concentration, fine motor skills, and the ability to hold multiple elements in mind simultaneously—all essential for advanced mathematical thinking and problem-solving.'
WHERE LOWER(name) = LOWER('Trinomial Cube');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Superimposed Geometric Figures help children see how sizes are related. By arranging shapes from smallest to largest, children develop an understanding of gradation—how things change smoothly from one size to another. When they stack shapes so they nest inside each other, it shows how the same shape can be many different sizes while staying the same shape. This builds visual thinking and prepares for later learning about scale, proportion, and even fractions.',
  why_it_matters = 'This material develops the visual discrimination skills foundational to mathematical and scientific thinking. Understanding gradation and scale is essential for understanding mathematics, reading graphs, and interpreting visual information. The work also bridges sensorial learning and mathematics, introducing concepts like proportion and relationships between measurements. It cultivates aesthetic appreciation and the ability to perceive subtle differences, both valuable in art, design, and careful observation.'
WHERE LOWER(name) = LOWER('Superimposed Geometric Figures');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring different textures by feeling boards with smooth, rough, bumpy, and other textured surfaces. They''re learning to discriminate between textures through touch, building vocabulary like ''smooth,'' ''rough,'' ''bumpy,'' and ''soft.'' This direct sensory exploration helps them understand and describe the tactile world around them.',
  why_it_matters = 'Touch Boards refine the tactile sense and help children develop the ability to discriminate and name different textures. This sensory work builds concentration, vocabulary, and an awareness of how we learn through our sense of touch—essential for developing all the sensory awareness that supports learning.'
WHERE LOWER(name) = LOWER('Touch Boards');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with pairs of tablets with different textures—some smooth, some rough. They feel each tablet and match the pairs with the same texture, a pairing activity that refines their ability to distinguish between textured surfaces. This material helps them learn the vocabulary of texture and develop sensitive fingertips.',
  why_it_matters = 'Touch Tablets develop the tactile sense through matching and discrimination. They build fine motor control in the fingertips, refine sensory perception, and introduce the concept of categorization through the sense of touch. This work also builds the vocabulary and awareness needed for later learning in science and other subjects.'
WHERE LOWER(name) = LOWER('Touch Tablets (Rough and Smooth)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Fabric Matching teaches children to really notice how things feel. By touching different fabrics and finding ones that feel the same, children develop their sense of touch. When they wear a blindfold, it helps them pay even more attention to how things feel because they can''t rely on looking. This activity isolates the tactile sense and helps children become more aware of the textures all around them—in their clothes, toys, and home.',
  why_it_matters = 'The tactile sense is often underdeveloped in modern childhoods despite being fundamental to learning. Fabric Matching isolates and refines this sense, building neural pathways for tactile discrimination. This work also develops concentration and shows children that their hands can ''see'' without eyes. It lays groundwork for stereognostic activities and builds confidence in non-visual sensory perception. The refinement of touch supports later writing development and fine motor skill.'
WHERE LOWER(name) = LOWER('Fabric Matching');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Sorting Grains helps children learn to identify things just by touching them, without looking. This is a special kind of sense called the stereognostic sense—it''s the ability to recognize objects through touch alone. By sorting different objects and grains with their eyes closed, children develop this important sense. It teaches them to pay close attention to how things feel in their hands and builds confidence in their ability to ''see'' with their fingers. This activity is like a sensory game that helps children understand their world more deeply.',
  why_it_matters = 'The stereognostic sense is foundational to sensory development and learning. It integrates touch, proprioception, and memory to recognize objects without vision. This sense is crucial for tasks like getting dressed, eating, writing, and navigating the world. Sorting Grains isolates and strengthens this sense through progressive challenges. The three-tray progression respects the child''s developmental readiness and builds competence systematically. This work also demonstrates that Montessori materials can be simple and natural while providing profound learning.'
WHERE LOWER(name) = LOWER('Sorting Grains');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is lifting and feeling tablets made from different materials of varying weights. They''re learning to perceive weight differences through their hands and fingers—some tablets are heavier, some lighter. Through matching and grading activities, they''re discovering the concept of weight and building awareness of how objects can differ in how heavy they feel.',
  why_it_matters = 'Baric Tablets develop the sense of weight (baric sense), which is the only Montessori sensorial material that isolates this specific sense. They build fine motor control, concentration, and an understanding of weight as a measurable property. This work also introduces measurement concepts and prepares children for later learning about mass, density, and physics.'
WHERE LOWER(name) = LOWER('Baric Tablets');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is feeling tablets made from different materials like wood, metal, and glass that conduct heat differently. When touched to their cheek or fingers, the tiles feel different temperatures. Through this exploration, they''re learning to perceive and discriminate between temperatures—feeling which materials are cooler and which retain warmth longer.',
  why_it_matters = 'Thermic Tablets develop the sense of temperature perception and build awareness of how different materials conduct heat. This material introduces scientific concepts about heat transfer and material properties in a direct, hands-on way, while also refining sensory discrimination and building vocabulary.'
WHERE LOWER(name) = LOWER('Thermic Tablets');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is holding glass or metal bottles filled with water at different temperatures—some warm, some cool, some room temperature. By holding and matching pairs of bottles with the same temperature, they''re learning to discriminate between subtle temperature differences. This material makes the abstract concept of temperature very concrete and tangible.',
  why_it_matters = 'Thermic Bottles refine the sense of temperature and introduce children to the concept of degrees of warmth and coolness. They develop fine motor control in the fingertips, concentration, and sensory awareness. This work also provides indirect preparation for understanding temperature scales and thermodynamics in later learning.'
WHERE LOWER(name) = LOWER('Thermic Bottles');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is shaking pairs of wooden cylinders that make matching sounds—some ring like bells, some sound like drums, some rattle. Their task is to listen carefully and match the cylinders with identical sounds. This auditory exploration develops their ability to discriminate between different pitches and tones.',
  why_it_matters = 'Sound Boxes develop auditory discrimination and listening skills, which are foundational for language development, music appreciation, and communication. The concentration required to carefully match sounds also builds focus and attention. This material introduces the scientific concept of sound and vibration in an engaging, playful way.'
WHERE LOWER(name) = LOWER('Sound Boxes (Sound Cylinders)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering musical bells that create a chromatic scale from low to high notes. By striking the bells with a small hammer and listening to the different pitches, they''re exploring the world of music and sound. Some bells match in pairs (for pairing activities), and children can also arrange them in order from lowest to highest note.',
  why_it_matters = 'Montessori Bells introduce your child to music, pitch discrimination, and the joy of creating sound. They develop auditory discrimination, fine motor skills, and an appreciation for music. This material also provides indirect preparation for learning to play instruments and understanding music theory, while building concentration and rhythm awareness.'
WHERE LOWER(name) = LOWER('Montessori Bells');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is smelling pairs of small bottles containing different scents—some sweet, some spicy, some fresh. Their task is to match the bottles with identical scents by opening them and inhaling carefully. This olfactory exploration helps them learn to recognize and name different smells in the world around them.',
  why_it_matters = 'Smelling Bottles refine the sense of smell and build olfactory discrimination. They develop vocabulary for describing scents and deepen sensory awareness. This material also supports the development of memory (as smells are powerfully connected to memory) and encourages careful, deliberate sensory exploration.'
WHERE LOWER(name) = LOWER('Smelling Bottles');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring different tastes—sweet, salty, sour, bitter—through small cups or bottles with different flavored solutions. By tasting carefully and matching similar flavors, they''re learning to distinguish between taste sensations. This gustation activity helps them understand the diversity of flavors in food and nature.',
  why_it_matters = 'Tasting Bottles/Cups refine the sense of taste and build awareness of the four basic tastes: sweet, salty, sour, and bitter. They develop sensory vocabulary and discrimination skills. This material also encourages careful tasting and teaches appreciation for flavor, supporting healthy eating habits and culinary awareness.'
WHERE LOWER(name) = LOWER('Tasting Bottles/Cups');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is placing their hand into a special bag and feeling objects hidden from sight. Without looking, they must identify what the object is based solely on touch—is it rough or smooth? Hard or soft? Large or small? This stereognostic exploration develops their ability to identify objects through touch alone, just like finding keys in a pocket.',
  why_it_matters = 'The Mystery Bag develops the stereognostic sense—the ability to identify objects through touch without visual input. It refines tactile discrimination, concentration, and spatial awareness. This material also builds practical life skills (like finding objects in pockets or bags) and develops the refined sensory perception that supports all learning.'
WHERE LOWER(name) = LOWER('Mystery Bag');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'When children feel objects in a bag without looking, they''re developing their stereognostic sense—the ability to recognize things by touch alone. This is a fun game that builds real sensory skill. As children carefully feel each object, they''re learning to use their hands to ''see'' and identify things. This kind of sensory development is important for all kinds of learning and helps children feel more confident in their ability to understand the world around them.',
  why_it_matters = 'The stereognostic sense is a sophisticated sensory ability that integrates touch, proprioception, and sensory memory. It underlies practical life skills (getting dressed, eating, writing) and academic learning (reading tactile materials, performing manipulative tasks). Sorting Objects Stereognostically develops this sense through playful exploration. The variety of objects and the need to distinguish between similar items build fine tactile discrimination. This work also demonstrates the Montessori principle that learning is most effective when joyful and intrinsically motivating—children love mystery bag activities, making them ideal for sensory development.'
WHERE LOWER(name) = LOWER('Sorting Objects Stereognostically');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to associate quantities with numbers using beautiful colored rods of increasing length. By lining up the rods from shortest to longest and counting the segments, they''re developing a concrete, visual understanding of how numbers grow in sequence. These tactile rods help children grasp that numbers aren''t just symbols—they represent real quantities that can be compared and ordered.',
  why_it_matters = 'Number rods lay the essential groundwork for all future math by helping children internalize the concept of numerical sequence and magnitude. This sensory-based understanding prevents later struggles with number sense and makes abstract math feel natural and logical.'
WHERE LOWER(name) = LOWER('Number Rods');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is tracing numerals 0-9 made of sandpaper on smooth boards, engaging their sense of touch to learn how each number is formed and written. By feeling the shape of each numeral with their fingers, they''re creating a deep, muscle-memory connection between the symbol and the written form—preparing their hands for writing while their mind absorbs the visual patterns.',
  why_it_matters = 'This tactile learning method activates multiple sensory pathways, making number recognition stick longer and making handwriting practice feel natural rather than forced. Children who learn numerals this way rarely reverse or confuse numbers later in their academic journey.'
WHERE LOWER(name) = LOWER('Sandpaper Numerals');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Number Rods with Numerals introduce your child to the connection between quantity and written numbers. It''s the first Montessori material that helps children see that the written numeral ''5'' means a specific, countable quantity. The rods'' increasing length creates a visual representation of numerical progression, making abstract numbers concrete and meaningful.',
  why_it_matters = 'This work is foundational for all future math learning. It bridges sensorial understanding of quantity with abstract numeral representation, establishing the cognitive framework needed for the decimal system, place value, and all arithmetic operations.'
WHERE LOWER(name) = LOWER('Number Rods with Numerals');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Spindle Boxes help your child develop a muscular impression of numbers 0-9. By physically placing spindles into compartments and bundling them, your child''s hands and mind work together to understand quantity. The built-in error correction teaches independence—if spindles remain at the end, your child can find and fix the mistake themselves.',
  why_it_matters = 'This work solidifies number concept understanding and introduces the crucial concept of zero. It transitions from abstract numeral recognition to active engagement with quantity, preparing children for the decimal system and arithmetic operations where zero plays an essential role.'
WHERE LOWER(name) = LOWER('Spindle Boxes');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is placing small red counters next to number cards to practice matching quantities with their symbols. For the card showing ''5,'' they place five counters. This simple-but-powerful activity builds accurate counting skills, refines fine motor control as they handle tiny counters, and helps them see concrete relationships between the numeral and what it represents.',
  why_it_matters = 'Counting with concrete objects, followed by visual symbols, builds the foundation for all mathematical thinking. This work develops the one-to-one correspondence that makes future math concepts like skip counting and multiplication intuitive rather than rote.'
WHERE LOWER(name) = LOWER('Cards and Counters');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is playing a concentration-style game where they remember numbers and then count out matching quantities of objects to place beside them. They might draw a card with ''7'' written on it, place it in their memory, then walk across the room to collect seven counters and bring them back to match their number. This combines memory, movement, and precise counting.',
  why_it_matters = 'This work builds concentration, working memory, and number confidence in a playful context. The combination of physical movement, memory challenge, and mathematical accuracy helps children develop the sustained attention and mental flexibility that supports all learning.'
WHERE LOWER(name) = LOWER('Memory Game of Numbers');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Number Puzzles make learning to match quantities with numerals fun and engaging. The self-correcting nature means your child can work independently, discovering when pieces don''t fit and trying again. This builds problem-solving skills and confidence without needing an adult to say ''that''s wrong.''',
  why_it_matters = 'This work reinforces foundational number concepts in an engaging format. It''s particularly valuable as an extension activity after introducing Number Rods and Spindle Boxes, allowing children to apply their learning in a playful, puzzle-based context that maintains their motivation and interest.'
WHERE LOWER(name) = LOWER('Number Puzzles and Games');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Short Bead Stair is your child''s first Montessori math material. Through colorful beads and increasing lengths, your child develops a sensorial understanding of numbers 1-9. The visual progression of the stair creates a tangible representation of how numbers grow, providing a foundation for all future mathematical learning.',
  why_it_matters = 'This material is essential because it bridges the sensorial learning your child has been doing with the Pink Tower and Red Rods with abstract number understanding. The bead stair makes quantity visible and tangible, allowing children to internalize number relationships that will later support all arithmetic operations and the decimal system.'
WHERE LOWER(name) = LOWER('Short Bead Stair');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is being introduced to the foundation of our entire number system using beautiful golden beads. A single bead represents ''one,'' a bar of ten beads represents ''ten,'' a square of 100 beads represents ''hundred,'' and a cube of 1,000 beads represents ''thousand.'' By holding and observing these different quantities, they''re experiencing place value in a tangible, visual way that makes abstract decimal concepts concrete.',
  why_it_matters = 'This introduction to the decimal system creates a powerful mental foundation that makes all future math—from addition with regrouping to multi-digit multiplication—feel logical and manageable. Children who understand place value deeply rarely struggle with ''carrying'' or ''borrowing'' in later years.'
WHERE LOWER(name) = LOWER('Introduction to Golden Beads');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Golden Bead Tray Exercises introduce your child to the decimal system using materials they can hold and count. By physically handling beads representing units, tens, hundreds, and thousands, your child develops a concrete understanding of how our number system is organized. This hands-on approach makes abstract place value concepts tangible and meaningful.',
  why_it_matters = 'This is the cornerstone of Montessori mathematics. The golden beads make the base-10 system visible and manipulable, allowing children to truly understand (not just memorize) how our decimal number system works. All subsequent arithmetic operations and advanced math concepts build on this foundation.'
WHERE LOWER(name) = LOWER('Golden Bead Tray Exercises');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Large Numeral Cards help your child connect the golden bead quantities they already understand with written numbers. After handling beads representing one, ten, one hundred, and one thousand, your child learns how to write these numbers using symbols. This bridges the gap between concrete materials and abstract math.',
  why_it_matters = 'This work solidifies place value understanding by connecting concrete quantity (golden beads) with abstract representation (written numerals). This bridge is essential for understanding expanded notation, reading large numbers, and performing operations across place values.'
WHERE LOWER(name) = LOWER('Large Numeral Cards');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Formation of Quantity asks your child to listen to a number and gather the correct beads to represent it. This activity deepens understanding of place value by requiring your child to decompose numbers into their component parts—ones, tens, hundreds, and thousands. It''s the bridge between understanding place value theory and using it in real math.',
  why_it_matters = 'This work transitions children from passive understanding (observing and naming quantities) to active mathematical thinking (composing and decomposing numbers). This active engagement is crucial for developing flexible number sense and preparing for arithmetic operations where place value decomposition is essential.'
WHERE LOWER(name) = LOWER('Formation of Quantity');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Formation of Symbol teaches your child to write numbers that represent specific quantities of beads. After gathering beads for two hundred thirty-four, your child learns to write ''234''. This connects the abstract written number to the concrete quantity they''ve physically organized, making mathematical notation meaningful.',
  why_it_matters = 'This work is crucial for developing true place value understanding. Many children learn to ''read'' numerals without understanding they represent specific quantities in specific positions. By connecting writing numerals to physical bead quantities, children develop deep comprehension of how our positional notation system works—essential for all future mathematics.'
WHERE LOWER(name) = LOWER('Formation of Symbol');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Association of Quantity and Symbol combines all your child''s place value learning. By working with gathered beads alongside numeral cards, your child sees that the same quantity can be shown in different ways—physical beads, individual number cards, and written numerals. This flexibility in representation is foundational for all advanced mathematical thinking.',
  why_it_matters = 'This consolidation work solidifies place value understanding by showing that quantity and symbol are inseparable. Children who truly understand that 324 is the same as 3 hundreds, 2 tens, and 4 units—and can represent this multiple ways—have developed deep, flexible mathematical thinking that supports all future learning. Without this understanding, arithmetic operations become rote memorization rather than logical thinking.'
WHERE LOWER(name) = LOWER('Association of Quantity and Symbol');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Exchange Game teaches your child that our number system is organized around groups of ten. When your child has gathered ten unit beads, they trade them for one ten bar from the ''bank.'' This simple action—exchanging ten ones for one ten—is the key concept behind carrying in addition and borrowing in subtraction. Playing this game repeatedly builds deep understanding of how regrouping works.',
  why_it_matters = 'This work is essential for understanding regrouping in all arithmetic operations. Children who physically exchange beads and see that the value remains the same understand carrying in addition not as a mysterious rule to follow, but as a logical consequence of place value organization. This conceptual understanding prevents arithmetic from becoming rote procedure.'
WHERE LOWER(name) = LOWER('Exchange Game (Change Game)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering addition by physically combining beautiful golden beads. They might place a bead bar (10) and a single bead (1) together, then exchange them for a unit bar and a single unit to see that 11 is the result. They''re experiencing the magic of ''exchange''—the moment when 10 units combine into 1 ten—which is the heart of regrouping.',
  why_it_matters = 'This concrete experience with addition and the concept of ''carrying'' creates an intuitive understanding that prevents the confusion many children face with standard algorithms later. Children who learn this way rarely treat regrouping as a mysterious rule—they understand why it''s necessary.'
WHERE LOWER(name) = LOWER('Golden Bead Addition');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning subtraction by physically taking away golden beads from a larger quantity and discovering what remains. If they start with a golden bead square (100), bead bars (tens), and unit beads, and remove a specified amount, they see directly what''s left—and sometimes they need to ''exchange'' a larger unit for smaller ones to complete the subtraction, just like ''borrowing'' in real math.',
  why_it_matters = 'Hands-on subtraction with concrete materials makes ''borrowing'' feel logical and necessary rather than arbitrary. Children develop strong number sense and rarely have the math anxiety that comes from memorizing rules they don''t understand.'
WHERE LOWER(name) = LOWER('Golden Bead Subtraction');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Golden Bead Multiplication shows your child that multiplication means ''making groups of.'' When your child makes three separate groups of twenty-four and then combines them, they physically see that 3 × 24 = 72. The exchanges that happen when combining the groups—trading ten units for a ten bar—show why larger numbers result. This concrete understanding prevents multiplication from being a mysterious procedure and makes the numbers meaningful.',
  why_it_matters = 'This work is foundational for all multiplication understanding. Children who have physically made groups of items and combined them understand multiplication conceptually, not just procedurally. This understanding prepares them for the Multiplication Board (memorization), Bead Board (efficiency), and eventually abstract multiplication algorithms.'
WHERE LOWER(name) = LOWER('Golden Bead Multiplication');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Golden Bead Division shows your child that division means sharing fairly. When your child divides forty-eight beads equally among four people, getting twelve for each person, they physically understand what 48 ÷ 4 = 12 means. This concrete foundation prevents division from becoming a confusing, abstract procedure and builds real understanding of fair sharing and equal groups.',
  why_it_matters = 'This work is foundational for all division understanding. Children who have physically divided quantities into equal groups understand division conceptually, not just as a procedure to memorize. This understanding supports the Division Board (memorization), long division algorithms, and later algebraic thinking about equal groups and fair distribution.'
WHERE LOWER(name) = LOWER('Golden Bead Division');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring the teen numbers (11-19) using the Teen Board, which shows how each teen is made up of one ten and some units. They''ll slide unit cards (1-9) over a printed ''10'' to create the teens, and pair these with golden bead bars to see that ''thirteen'' is really ''10 and 3.'' This work makes the logic of teen numbers visible and concrete.',
  why_it_matters = 'Understanding that teen numbers are ''ten and some units'' (rather than arbitrary names) prevents confusion that many children encounter. This logical foundation makes counting, skip counting, and mental math strategies much more accessible.'
WHERE LOWER(name) = LOWER('Teen Board 1 (Seguin Board A)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is deepening their understanding of the teens by working more independently with the Teen Board. They''re practicing number formation, recognition, and the relationship between quantities and symbols, building fluency with the teen numbers so they can move forward confidently to the tens and beyond.',
  why_it_matters = 'Solid mastery of teen numbers removes a major stumbling block in early math. Children who are confident with numbers 11-19 find the transition to tens (20-99) natural and manageable.'
WHERE LOWER(name) = LOWER('Teen Board 2 (Seguin Board B)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is now exploring numbers 10-99 using the Ten Board, where they learn that ''thirty-five'' is made of three tens and five units. By placing unit cards under a tens frame and using golden bead bars, they discover the place value pattern that explains all numbers through 99. This work bridges from learning individual numbers to understanding the structure of the entire decimal system.',
  why_it_matters = 'Understanding that ''ten, twenty, thirty, forty'' all follow the same pattern (one ten, two tens, three tens, four tens) creates a mental framework that makes the entire number system logical and learnable. This prevents rote memorization and builds real number sense.'
WHERE LOWER(name) = LOWER('Ten Board 1 (Seguin Board C)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is continuing to solidify their understanding of numbers through 99, working with increasing independence and fluency. They''re internalizing that every number in this range is simply some number of tens plus some number of units, making the entire system feel consistent and predictable.',
  why_it_matters = 'Mastery of numbers 1-99 is foundational for all future mathematics. Children who truly understand the pattern of tens are ready to understand hundreds, thousands, and beyond, and they''re equipped with mental math strategies that will serve them for life.'
WHERE LOWER(name) = LOWER('Ten Board 2 (Seguin Board D)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Hundred Board helps your child understand number order 1-100 and discover patterns. Placing tiles reveals that tens organize in columns and ones repeat in rows—visual patterns that build deep place value understanding.',
  why_it_matters = 'Number sequence and patterns are foundational for mental math and place value operations. The Hundred Board makes abstract relationships visible, allowing children to discover patterns—more powerful than being told.'
WHERE LOWER(name) = LOWER('Hundred Board');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring a long, beautiful chain of 100 beads—connected in groups of ten to form a visible, tangible representation of 100. As they count along the chain, placing labels at each ten, they see 100 as both a single large quantity and as ten groups of ten. They might even loop the chain into a square shape and compare it to the 100-bead square from the Golden Beads, discovering that different physical forms can represent the same quantity.',
  why_it_matters = 'The Hundred Chain makes the concept of 100 tangible and memorable. Children who have physically handled and counted through 100 have a concrete mental image that makes ''hundred'' feel real, not abstract. This concrete foundation supports place value understanding and prepares them for multiplication.'
WHERE LOWER(name) = LOWER('Hundred Chain');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Thousand Chain is an extraordinary, memorable Montessori experience. Your child counts one thousand beads, one by one, discovering through their own counting how long a thousand really is. When the chain is then folded into the shape of the thousand cube, children experience a remarkable ''aha'' moment—the same quantity can be stretched out in a line or packed compactly. This sensorial understanding of magnitude deeply impacts how children think about large numbers.',
  why_it_matters = 'Many children have heard the word ''thousand'' but have no sense of its actual magnitude. The Thousand Chain provides a visceral, kinesthetic understanding of what one thousand looks like, feels like, and takes to count. This concrete understanding prevents ''thousand'' from being just a word and makes it a real, comprehensible quantity. This experience has lasting impact on number sense development.'
WHERE LOWER(name) = LOWER('Thousand Chain');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Short Bead Chains make squaring numbers concrete and beautiful. Your child counts and folds a chain of beads, discovering that when a chain of four beads folds into a square, it shows visually what ''2 squared'' means. With chains through ten, your child develops deep understanding that squaring numbers creates perfect squares with specific growth patterns.',
  why_it_matters = 'Understanding squaring through physical manipulation prevents it from becoming an abstract, meaningless operation. Children who have folded chains and seen how 2×2 = 4, 3×3 = 9, 4×4 = 16, and so on visually understand perfect squares. This foundation supports geometry, algebraic thinking, and advanced mathematics where squaring is essential.'
WHERE LOWER(name) = LOWER('Short Bead Chains (Squares)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Long Bead Chains make cubing a tangible, visual experience. Your child counts eight beads, then watches as the chain folds into a tiny 2×2×2 cube. When they fold a chain of 27 beads into a 3×3×3 cube, the dramatic size difference shows how fast numbers grow when cubed. This concrete experience of cubing prevents it from being an abstract, meaningless operation and builds deep understanding of volume.',
  why_it_matters = 'Cubing is often left abstract in traditional math education. By allowing children to count and fold actual chains representing 2³, 3³, 4³, and beyond, children develop intuitive understanding of how volume grows exponentially. This foundation supports later geometry, physics, and any field involving three-dimensional thinking.'
WHERE LOWER(name) = LOWER('Long Bead Chains (Cubes)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Bead Cabinet is a comprehensive math resource that shows your child all the bead chains, squares, and cubes organized together. By working with materials from the cabinet over time, your child sees how counting by ones (linear), counting by threes to get nine (three squared), and folding eight beads into a cube all relate to the same mathematical progression. This holistic view builds mathematical thinking that sees relationships across concepts.',
  why_it_matters = 'The Bead Cabinet provides a complete visual and tactile representation of how linear counting, squaring, and cubing relate to each other. Children who work with this cabinet develop sophisticated understanding of exponential relationships and can see how mathematics is organized hierarchically. This integrated understanding prevents learning math as disconnected topics and instead reveals the deep relationships within mathematics.'
WHERE LOWER(name) = LOWER('Bead Cabinet');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Addition Snake Game helps your child move from counting on fingers to remembering addition facts. By building ''snakes'' of colored beads and exchanging them for single bars, your child discovers that 7 + 3 always equals 10, and 6 + 4 also equals 10. These discoveries about ''bonds of ten'' become building blocks for mental math and eventually automatic recall of addition facts.',
  why_it_matters = 'This work bridges concrete addition (counting golden beads) and abstract memorization (recall of facts). Without this bridge, many children either become dependent on counting fingers or memorize facts without understanding. The Snake Game allows children to discover patterns (bonds of ten), leading naturally to memorization based on understanding rather than rote repetition.'
WHERE LOWER(name) = LOWER('Addition Snake Game');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Subtraction Snake Game helps your child learn that subtraction is the opposite of addition. When your child takes away three from eight and discovers five remains, they''re learning that 8 - 3 = 5 is the same relationship as 5 + 3 = 8. This understanding makes subtraction meaningful, not just a separate skill to memorize.',
  why_it_matters = 'Many children learn addition and subtraction as entirely separate operations. The Snake Game explicitly connects them, showing children that every subtraction fact is paired with an addition fact. This understanding prevents learning from becoming rote and builds the flexible, relational thinking that characterizes mathematical maturity.'
WHERE LOWER(name) = LOWER('Subtraction Snake Game');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is beginning to work with addition more abstractly using a board with numbered strips. They place a numbered strip in a column, then figure out how many more units are needed to reach a target number by placing additional strips next to it. This activity helps them see all possible addition combinations and recognize patterns, like how adding 5 + 4 produces the same result as 4 + 5 (the commutative property).',
  why_it_matters = 'Strip board work bridges the gap from concrete golden bead operations to abstract memorization of addition facts. Children develop fluency with addition combinations while beginning to see the logic and patterns that make math systematic rather than random.'
WHERE LOWER(name) = LOWER('Addition Strip Board');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Addition Charts help your child move from Snake Game activities to memorizing addition facts. Using the finger method to find where numbers intersect on the chart, your child learns facts efficiently and can self-check using a control chart. The visual patterns in the chart help memory—like seeing that all the tens form a diagonal line. This bridges concrete bead work and abstract memorization.',
  why_it_matters = 'Charts provide a bridge between concrete manipulatives and abstract memorization. Without this bridge, some children either remain dependent on counting or memorize facts without pattern recognition. Charts build both automaticity and number sense through visible patterns, creating a more robust mathematical foundation than rote memorization alone.'
WHERE LOWER(name) = LOWER('Addition Charts (Finger Charts)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing subtraction by working with strips to understand ''taking away.'' They see a strip representing the total amount, place another strip beneath it to represent the amount being removed, and the space between shows the answer. This visual, hands-on approach shows why ''borrowing'' is necessary when the amount being subtracted is larger than what''s available in a particular place value.',
  why_it_matters = 'Strip board work makes the sometimes-confusing concept of ''borrowing'' in subtraction visual and logical. Children develop subtraction fluency and are no longer guessing—they understand the ''why'' behind the process.'
WHERE LOWER(name) = LOWER('Subtraction Strip Board');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Subtraction Charts help your child memorize subtraction facts using the same visual, efficient method as Addition Charts. By placing fingers on the chart to find where numbers intersect, your child learns facts while discovering the inverse relationship to addition. The patterns visible in the chart—like all the ''subtract from ten'' facts—help memory and build deeper understanding.',
  why_it_matters = 'Without explicit chart work, many children learn subtraction as a separate operation from addition, missing the profound relationship between them. Subtraction Charts make this connection clear through their structure and format, building a more integrated, flexible understanding of arithmetic operations.'
WHERE LOWER(name) = LOWER('Subtraction Charts');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Multiplication Bead Board makes multiplication concrete and efficient. When your child places beads to show ''three groups of four'' and then counts them as ''four, eight, twelve,'' they''re learning that 3 × 4 = 12. The board bridges the concrete bead work and abstract fact memorization, building automaticity with understanding rather than rote memorization alone.',
  why_it_matters = 'Without the board, many children memorize multiplication facts without understanding what multiplication means. The Bead Board shows multiplication as ''groups of,'' preventing the operation from being abstract or meaningless. This concrete-to-abstract progression creates robust, transferable understanding of multiplication.'
WHERE LOWER(name) = LOWER('Multiplication Bead Board');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Multiplication Charts help move from bead board to memorizing facts efficiently. The finger-sliding method finds products while patterns (like ×5 ending in 5 or 0) make memorization logical rather than rote.',
  why_it_matters = 'Charts bridge concrete and abstract learning. Without them, children either remain material-dependent or memorize without understanding. Charts build automaticity while maintaining connection to skip-counting and grouping concepts that give multiplication meaning.'
WHERE LOWER(name) = LOWER('Multiplication Charts');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'This work teaches children that division is about sharing things equally. Your child uses beads and skittles to physically show what happens when we divide numbers. For example, 12 beads shared among 3 skittles means each skittle gets 4 beads. This hands-on approach helps children understand division before learning the symbols.',
  why_it_matters = 'Division is a fundamental operation that appears throughout mathematics and life. Understanding it concretely prevents mechanical, symbol-based confusion. This work also develops social-emotional skills around fairness and equal distribution that extend beyond mathematics.'
WHERE LOWER(name) = LOWER('Unit Division Board');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Division Charts help memorize division facts using the inverse relationship to multiplication. When your child finds 12÷3=4 on the chart, they verify by multiplying 3×4=12. This explicit connection prevents division from seeming like an isolated operation.',
  why_it_matters = 'Understanding division as inverse multiplication is critical for all division work. Charts make this relationship explicit and visible, building integrated understanding of all four operations rather than isolated skill compartments.'
WHERE LOWER(name) = LOWER('Division Charts');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using small colored ''stamps'' (or tiles) to represent place values: green for ones, blue for tens, red for hundreds, and green again for thousands. Unlike the golden beads where each physical piece is a separate unit, stamps are more abstract—a single stamp represents an entire group. They''re learning to perform addition, subtraction, and even multiplication by arranging and exchanging these stamps, moving toward abstract mathematical thinking.',
  why_it_matters = 'The Stamp Game is a critical bridge between concrete golden bead work and abstract math. Children learn that symbols and representations can stand for quantities, building the abstract thinking necessary for higher mathematics. Many children experience a ''light bulb moment'' with the Stamp Game where math suddenly feels organized and powerful.'
WHERE LOWER(name) = LOWER('Stamp Game');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with an even more abstract material—dots marked on a grid—to solve addition, subtraction, and multiplication problems. They create dots in columns representing each place value and use exchange rules to find answers. The Dot Game is the gateway to working with numbers without any concrete materials, as children learn to visualize quantities through symbols alone.',
  why_it_matters = 'The progression from golden beads (completely concrete), to stamps (semi-concrete), to dots (nearly abstract) is crucial for developing the abstract mathematical thinking that will serve children throughout their academic careers. Children who make this journey gradually rarely develop math anxiety.'
WHERE LOWER(name) = LOWER('Dot Game');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using a wooden frame with beads on wires to practice addition and subtraction with increasing abstraction. Each wire holds ten beads in a specific color representing ones, tens, hundreds, and thousands. By sliding beads across the frame to represent numbers and perform operations, they''re moving toward complete abstraction while still having a visual tool to support their thinking.',
  why_it_matters = 'The bead frames mark the critical transition from concrete to abstract mathematical thinking. Children learn that mathematical operations can be performed mentally with only a simple visual reference, building confidence for pencil-and-paper computation and mental math strategies.'
WHERE LOWER(name) = LOWER('Small Bead Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using a larger frame with seven wires that extends all the way to the millions place, allowing them to practice operations with much larger numbers. By sliding beads representing ones, tens, hundreds, thousands, ten-thousands, hundred-thousands, and millions, they''re seeing that the same operational principles apply to all numbers, no matter how large.',
  why_it_matters = 'The Large Bead Frame helps children understand that mathematical patterns are consistent across place values. This insight is powerfully empowering—it shows children that they can handle any number by applying the same logic they''ve learned, building mathematical confidence that extends far beyond elementary school.'
WHERE LOWER(name) = LOWER('Large Bead Frame');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Checkerboard shows children how multiplication works with bigger numbers. Instead of just memorizing facts, they physically build the answer using beads arranged in colored columns. When multiplying 23 × 3, they see that 20 × 3 and 3 × 3 must be added together. This visual system helps children understand why multiplication algorithms work the way they do.',
  why_it_matters = 'The Checkerboard bridges concrete understanding and symbolic mathematics. It prevents children from mechanically following procedures without understanding. By seeing the geometric representation of multiplication (length × width), children develop deeper number sense and are prepared for algebra, area concepts, and more complex mathematics.'
WHERE LOWER(name) = LOWER('Checkerboard (Multiplication)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'This work teaches long division using colorful beads arranged in tubes and racks. Instead of memorizing division steps, children physically distribute beads into equal groups. When dividing 364 by 7, they physically create 7 groups and distribute beads until each group has the same amount. When one bead isn''t enough to give everyone more, they exchange it for 10 smaller beads. This shows why the long division algorithm works.',
  why_it_matters = 'Division is one of the most challenging operations for children to understand. By working with concrete materials first, children build a real understanding of the process before moving to pencil-and-paper algorithms. This prevents confusion and builds confidence. The exchange system introduces the concept of ''regrouping,'' which is essential for understanding decimals, fractions, and higher mathematics.'
WHERE LOWER(name) = LOWER('Racks and Tubes (Long Division)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring fractions using beautiful circular puzzles where each frame is divided into pieces representing different fractions: one whole, two halves, three thirds, four fourths, and so on up to ten tenths. By fitting the fraction pieces together and observing how they fill the whole, they discover that fractions are logical divisions of a whole, and that different fractions can represent the same amount (like two halves equals one whole).',
  why_it_matters = 'Introducing fractions as concrete, visual puzzles prevents the confusion that plagues many children when they later encounter fractions on paper. Children who understand the sensory, spatial relationship between fractions and wholes develop flexible thinking about division and proportion that supports advanced mathematics.'
WHERE LOWER(name) = LOWER('Fraction Insets (Metal or Plastic)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Fraction addition is taught using colorful pieces called fraction circles. These pieces are different sizes representing different fractions. Children physically place 1/3 and 1/3 together and see they make 2/3. When fractions are different sizes, they learn to ''match'' them first (finding equivalent fractions) before adding. This hands-on approach makes abstract fraction concepts concrete and understandable.',
  why_it_matters = 'Many children struggle with fractions because they lack a concrete foundation. This work builds that foundation through manipulation. Understanding fraction addition concretely prevents mechanical errors later. It also develops flexibility in thinking about numbers—the understanding that 1/2 and 2/4 are the same value is crucial for higher mathematics including algebra and calculus.'
WHERE LOWER(name) = LOWER('Fraction Addition');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Fraction subtraction uses the same colored pieces as fraction addition. Children physically take away fractional parts to show subtraction. When subtracting 2/3 - 1/3, they remove one third and see two thirds remain. When pieces don''t match (like 3/4 - 1/8), they first convert pieces to the same size before subtracting. This concrete approach prevents confusion about denominators and makes subtraction intuitive.',
  why_it_matters = 'Subtraction is often the most confusing operation with fractions. By building concrete understanding first, children develop genuine comprehension rather than memorizing rules. Understanding that subtraction and addition are inverse operations—that 2/3 - 1/3 = 1/3 means 1/3 + 1/3 = 2/3—is a crucial step in mathematical thinking that extends to all mathematics.'
WHERE LOWER(name) = LOWER('Fraction Subtraction');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Fraction multiplication is introduced by taking a fraction multiple times. If we have 1/4 and take it 3 times, we get 3/4. We can also find ''a fraction of a fraction''—like finding 1/2 of 1/4 to get 1/8. Children use visual materials to see what happens instead of memorizing rules. This builds intuition for why the multiplication procedures work.',
  why_it_matters = 'Fraction multiplication is counterintuitive for many children because it doesn''t always make quantities bigger. By building concrete understanding through manipulation, children develop the flexibility in thinking necessary for higher mathematics. Understanding that 1/2 × 1/2 = 1/4 (a smaller result) is crucial for understanding scaling, ratios, and eventually calculus.'
WHERE LOWER(name) = LOWER('Fraction Multiplication');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Fraction division is taught through sharing and grouping activities. When dividing 1/2 by 1/4, children ask ''How many quarter pieces fit in a half piece?'' Using fraction circles, they can physically count: 2 quarter-pieces fit in 1/2. This visual approach helps children understand division deeply rather than just following a rule about ''flip and multiply.''',
  why_it_matters = 'Division of fractions is where many children abandon conceptual understanding and resort to memorization. By building concrete understanding first, children develop genuine comprehension of why the algorithm works. This understanding supports not just fractions but also proportional reasoning, scaling, and eventually calculus—all areas where this intuition is invaluable.'
WHERE LOWER(name) = LOWER('Fraction Division');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Fraction Skittles introduce your child to fractions through beautiful, manipulable materials. By holding and combining fraction pieces, your child discovers that two halves make a whole, and that three fourths are the same amount as six eighths. This concrete, sensorial exploration makes fractions meaningful rather than mysterious.',
  why_it_matters = 'Fractions are often taught abstractly, causing widespread confusion and math anxiety. The Skittles allow children to develop intuitive understanding through physical exploration. This foundation—understanding what fractions are and how they relate—is essential for all later fraction work, decimals, and percentages.'
WHERE LOWER(name) = LOWER('Fraction Skittles');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Geometry Sticks are wooden sticks that children use to build geometric shapes on a cork board. They start by learning about straight and curved lines, then move to angles. By rotating one stick around another, they see how angles open wider or closer. They build triangles, squares, and other shapes, and learn the geometric vocabulary that describes them. This hands-on work makes abstract geometry concepts concrete and understandable.',
  why_it_matters = 'Geometry is often taught abstractly, but children learn it best through construction and manipulation. Building geometric figures helps children understand not just what shapes look like, but why they''re classified the way they are. This solid foundation in geometry supports not just mathematics but also art, architecture, engineering, and science. The vocabulary built here is essential for all higher geometry.'
WHERE LOWER(name) = LOWER('Geometry Sticks');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Geometry Nomenclature cards teach the vocabulary of shapes. Starting with basic ideas like point and line, children learn the names of different angles, types of triangles, and shapes like pentagons and hexagons. They use cards combined with actual geometric materials to see what each term means. This builds accurate vocabulary and helps children think and talk about geometry precisely.',
  why_it_matters = 'Mathematical language is precise and important. Learning correct geometric terminology early prevents confusion later. Understanding the classification systems (how triangles are classified by sides vs. by angles, how all squares are rectangles but not all rectangles are squares) develops logical thinking that extends far beyond geometry into all areas of mathematics and science.'
WHERE LOWER(name) = LOWER('Geometry Nomenclature');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Area is introduced by physically filling flat shapes with small unit squares. A 3 by 4 rectangle holds 12 unit squares, so its area is 12 square units. Children eventually notice they can multiply the dimensions (3 × 4) instead of counting every square. Through this discovery, the area formula becomes intuitive rather than arbitrary. Later, they learn to measure odd-shaped areas by breaking them into rectangles.',
  why_it_matters = 'Understanding area concretely prevents the formula from being just a procedure children memorize and forget. By building understanding through manipulation, children develop intuition about space and measurement that supports geometry, algebra, and practical life skills. Understanding that area = length × width is a gateway concept to multiplication of larger numbers, algebraic thinking, and eventually calculus.'
WHERE LOWER(name) = LOWER('Introduction to Area');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Clock work teaches children to tell time using a clock face. Starting with simple ''on the hour'' times, children learn to read more complex times. They move from an adult pointing out ''3 o''clock'' to reading times like ''quarter past 2.'' Clocks in the classroom, schedules with times, and frequent practice help children internalize how clocks work and connect time to their daily routine.',
  why_it_matters = 'Understanding how to tell time is essential for independence in daily life. Beyond practical importance, clock work develops measurement skills, number sense (counting by fives), and the ability to coordinate multiple pieces of information (hour hand position + minute hand position = time). The understanding that systems have rules and operate in predictable ways extends to all mathematical thinking.'
WHERE LOWER(name) = LOWER('Clock Work');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Money work teaches children to recognize coins and understand their value. They learn that 5 pennies equal 1 nickel, that 10 dimes equal 1 dollar, and so on. By using play money in shopping simulations, they practice counting, making change, and solving real-world math problems. This work makes abstract arithmetic meaningful because it''s connected to something children understand: having money to spend and making purchases.',
  why_it_matters = 'Money is ubiquitous in children''s lives. By making it the context for mathematical learning, we build motivation and relevance. Understanding the relationships between coins and bills reinforces the decimal system (10 pennies = 1 dime = 10% of a dollar). The practical skills of counting, making change, and performing operations with money are immediately applicable to children''s lives and support the development of financial literacy.'
WHERE LOWER(name) = LOWER('Money Work');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Calendar work is a daily ritual in the classroom. Each morning, the child marks the date, identifies the day of the week, and notes the weather. Over time, children learn the sequence of days and months, understand that time passes in measurable units, and recognize patterns in the calendar. They see that July always has 31 days, that Mondays repeat every week, and that seasonal changes come at predictable times. This builds both mathematical understanding and awareness of time''s passage.',
  why_it_matters = 'The calendar is perhaps the most important work for building time awareness in young children. Understanding how time is organized (days into weeks, weeks into months, months into years) is essential for practical life and historical understanding. The pattern recognition built through calendar work (every month has a certain number of days, every year has 12 months) develops logical thinking that extends throughout mathematics. Most importantly, making time concrete and visible prevents the anxiety many children feel about abstract time concepts.'
WHERE LOWER(name) = LOWER('Calendar Work');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Division Board shows your child that division means sharing fairly. When your child distributes twelve beads equally among three skittles, getting four beads per skittle, they understand that 12 ÷ 3 = 4. The board bridges concrete division work (golden beads) and abstract fact memorization, building understanding not just memorization.',
  why_it_matters = 'Division is often taught as the most abstract operation. The Division Board makes it concrete, showing what division really means—fair distribution or equal grouping. Children who understand division conceptually through boards are better equipped to handle remainders, interpret remainders in context, and understand division in higher mathematics.'
WHERE LOWER(name) = LOWER('Division Board');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Skip counting teaches your child to count in patterns—by 2s, 3s, 4s, and so on. This is the foundation for understanding multiplication. When your child can count by fives (five, ten, fifteen, twenty...), they''re essentially learning the times-five facts. Skip counting makes multiplication''s pattern and logic obvious rather than abstract.',
  why_it_matters = 'Skip counting is one of the most important bridges between concrete arithmetic and abstract number sense. Children who develop fluency with skip counting understand multiplication deeply, can work more efficiently with numbers, and develop mathematical thinking that recognizes and uses patterns. This foundation supports all higher mathematics.'
WHERE LOWER(name) = LOWER('Skip Counting');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Passage to Abstraction is the bridge from hands-on math materials to standard pencil-and-paper algorithms. Your child learns that the algorithm we write—the steps we follow to add, subtract, multiply, or divide on paper—is exactly what their hands were doing with beads and materials. Once this connection is clear, algorithms make sense rather than seeming like arbitrary rules to memorize.',
  why_it_matters = 'This is perhaps the most critical material for preventing math from becoming meaningless rote procedure. Children who understand that algorithms represent concrete operations understand not just how to follow steps, but why those steps work. This deep understanding supports all future mathematics and prevents the common experience of being able to ''do math'' but not understanding what you''re doing.'
WHERE LOWER(name) = LOWER('Passage to Abstraction');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Teen and Tens Boards help your child understand composition and naming of numbers 11-99. Building 13 with one ten and three units, then seeing numeral ''13,'' connects composition to name and symbol.',
  why_it_matters = 'Teen numbers have irregular naming that confuses many. These Seguin Boards make structure explicit through concrete materials. Solid tens understanding prepares for all multi-digit arithmetic and mental math strategies.'
WHERE LOWER(name) = LOWER('Teen Board and Tens Board (Seguin Boards)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Colored Bead Stair teaches numbers through beautiful, unique colors that appear throughout your child''s future math work. This color system becomes a powerful memory aid for understanding complex place value concepts.',
  why_it_matters = 'The Montessori color-coding system is purposeful and consistent. Early color-number association builds a sensorial foundation that makes later multi-digit work intuitive.'
WHERE LOWER(name) = LOWER('Colored Bead Stair');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'When your child holds ten ten-bars and then sees them as one hundred square, they understand that value can look completely different but remain the same. This principle—that quantities can be reorganized without changing value—is foundational to all mathematics.',
  why_it_matters = 'Understanding place value relationships concretely prevents children from treating operations mechanically. Children who truly grasp that 10 tens equal 1 hundred understand carrying and borrowing, not as arbitrary rules, but as logical reorganization of value.'
WHERE LOWER(name) = LOWER('Hundred and Thousand Cube Understanding');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'This work shows your child that three hundred twenty-four can be shown as 324 (written), or as 3 hundreds + 2 tens + 4 units (organized), or as 32 tens + 4 units (reorganized). All are exactly the same amount, just organized differently. This flexible thinking is crucial for mental math and understanding why arithmetic algorithms work.',
  why_it_matters = 'Rigid thinking about quantity (only recognizing ''three hundred twenty-four'' one way) limits mathematical flexibility. Children who understand that the same quantity can be reorganized in multiple valid ways develop the flexible thinking that enables efficient mental math strategies and deeper algebraic understanding.'
WHERE LOWER(name) = LOWER('Equivalence Exercises with Golden Beads');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Golden Beads support all four operations—addition, subtraction, multiplication, and division. By using the same materials for different operations, your child sees how they''re all related. This integrated view prevents operations from seeming like separate, disconnected skills.',
  why_it_matters = 'Many children learn operations in isolation, never understanding how they relate. Seeing addition, subtraction, multiplication, and division all supported by the same golden beads and place value principles builds integrated mathematical thinking that supports higher-level mathematics. Children understand not just how to operate, but why operations make sense together.'
WHERE LOWER(name) = LOWER('Golden Beads: Operations Overview');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Vocabulary Enrichment is the foundation of Montessori language development. Through daily exposure to new words in meaningful contexts, children learn the names of objects in their environment, the qualities that describe them, and the actions they perform. This work happens naturally throughout the classroom as the teacher introduces materials, during snack conversations, and through games and storytelling. By learning both everyday and scientific vocabulary, children develop a rich, precise way of expressing their thoughts and observations.',
  why_it_matters = 'Rich vocabulary is the cornerstone of literacy development. Children with extensive vocabulary find reading easier and develop stronger comprehension skills. Vocabulary enrichment also supports cognitive development by helping children organize their understanding of the world into clear categories. This work directly prepares children for reading, writing, and all future academic learning.'
WHERE LOWER(name) = LOWER('Vocabulary Enrichment');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Classified Cards, also called nomenclature cards or 3-part cards, are a beloved Montessori language tool. Children learn the names of objects through beautiful illustrated cards presented in three stages: first seeing the picture with its label, then recognizing the picture without the label, and finally recalling the name when shown the picture alone. This systematic approach builds vocabulary with precision and allows children to work independently at their own pace. The cards cover diverse topics from basic household items to scientific categories like insects and plants.',
  why_it_matters = 'Nomenclature cards bridge the gap between oral language and reading. By systematically learning to match pictures to names, children develop visual discrimination skills essential for reading. The structured three-part lesson format respects children''s learning pace and builds confidence. This work is particularly valuable because it''s self-correcting and allows children to practice independently, supporting the Montessori principle of self-directed learning.'
WHERE LOWER(name) = LOWER('Classified Cards (Nomenclature Cards)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Object to Picture Matching is one of the first Montessori language works. Children learn to recognize that a real object and its photograph represent the same thing—a crucial pre-reading skill. Starting with very familiar items, children pick up a real object, examine it, and find its matching picture. This work develops visual discrimination and vocabulary while teaching the abstract concept that a 2-D image can represent a 3-D object. It''s a natural precursor to reading, where letters and words are symbols that represent sounds and meanings.',
  why_it_matters = 'This work is foundational for literacy development. Reading requires understanding that symbols (letters and words) represent real things and ideas. Object to picture matching teaches this abstract concept concretely. It also supports visual discrimination skills needed for letter recognition, builds vocabulary through direct experience, and develops classification and logical thinking skills essential for all learning.'
WHERE LOWER(name) = LOWER('Object to Picture Matching');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is playing listening games to discover the individual sounds hidden in words. Using objects around the classroom, the teacher asks ''I spy something that starts with /s/'' and your child listens carefully to isolate that beginning sound. This playful auditory work awakens your child''s awareness of phonemic sounds—the building blocks of both reading and writing.',
  why_it_matters = 'Phonemic awareness is the foundation for literacy. Learning to hear and isolate individual sounds helps children crack the code of how spoken language maps to written letters, making later reading instruction far more meaningful.'
WHERE LOWER(name) = LOWER('Sound Games (I Spy)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Rhyming Activities are a joyful introduction to the sound patterns of language. Children listen to familiar nursery rhymes and poems, play with rhyming objects, and sing songs where words rhyme. Through these playful activities, children develop sensitivity to the final sounds of words—a critical skill for learning to read phonetically. Rhyming is both delightful and educational; the musicality and predictability of rhyming text makes language memorable and builds the phonemic awareness necessary for reading.',
  why_it_matters = 'Rhyming is one of the most important precursors to reading success. Children who develop strong rhyming skills and phonemic awareness learn to read more easily and with better comprehension. Rhyming teaches children to break words into sound components and recognize patterns—foundational skills for decoding words, spelling, and understanding how language works. The playful, multisensory nature of rhyming activities makes learning effortless for children.'
WHERE LOWER(name) = LOWER('Rhyming Activities');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Storytelling and Sequencing helps children understand that stories have structure: a beginning, middle, and end. Using picture cards showing the steps of a simple story, children learn to recognize the order of events and develop the ability to retell stories with expression. This work develops both comprehension and narrative skills—children learn to think about how events connect logically and to tell stories with clarity. As children become skilled, they create original stories, supporting imagination and creative thinking.',
  why_it_matters = 'Strong narrative skills are essential for reading comprehension and academic success. Understanding story sequence and structure helps children follow complex texts, make predictions, and understand cause-and-effect relationships. Storytelling builds vocabulary, develops verbal fluency, and supports executive functioning as children learn to organize events logically. This work also fosters imagination and creativity while building the language skills children need for all future learning.'
WHERE LOWER(name) = LOWER('Storytelling and Sequencing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Poems, Songs, and Fingerplays are woven throughout the Montessori day. Children hear poetry and songs recited by teachers during circle time, transitions, and quiet moments. These literary experiences expose children to the beauty and musicality of language while teaching new vocabulary and sound patterns. Fingerplays coordinate movement with language, creating a multisensory experience that supports memory and engagement. Through repetition, children memorize poems and songs, building confidence in their ability to express themselves. Poetry fosters a lifelong love of language and literature.',
  why_it_matters = 'Poetry and music accelerate brain development, particularly in areas responsible for language, sound processing, and reading. Rhyming, rhythm, and repetition in poems and songs build phonemic awareness—the foundation of reading. Memorizing poetry strengthens memory and concentration. The emotional resonance of poetry and music supports social-emotional development. Perhaps most importantly, sharing poems and songs creates a joyful association with language, fostering the love of reading and learning that lasts a lifetime.'
WHERE LOWER(name) = LOWER('Poems, Songs, and Fingerplays');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Conversation and Discussion are central to Montessori language development. Every day, children engage in meaningful conversations with teachers and peers—during morning greetings, snack time, circle discussions, and spontaneous moments. Teachers model respectful listening and clear communication, while children learn to share ideas, ask questions, and respond to others with kindness. Grace and Courtesy lessons explicitly teach social skills like turn-taking and respectful disagreement. Through these authentic daily conversations, children develop confidence, expand vocabulary, and build the communication skills essential for academic and social success.',
  why_it_matters = 'Conversation is the most natural and powerful teacher of language. Children who engage in rich, frequent conversations with responsive adults develop larger vocabularies, stronger comprehension, and greater reading success. Discussion develops critical thinking, builds community, and supports social-emotional development. Feeling heard and valued during conversations boosts confidence and motivation. These daily interactions create a foundation for lifelong communication skills and a sense of belonging.'
WHERE LOWER(name) = LOWER('Conversation and Discussion');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is strengthening their hand through beautiful geometric tracing and drawing work. By carefully outlining metal frame shapes with colored pencils and creating intricate designs, they''re building the fine motor control, hand strength, and pencil grip needed for fluent writing. The precise movements required teach the exact pencil strokes that form letters.',
  why_it_matters = 'The Metal Insets are the direct preparation for handwriting. This work develops not just the muscles needed for writing, but also hand-eye coordination and the ability to stay within lines—all essential skills for confident, controlled written expression.'
WHERE LOWER(name) = LOWER('Metal Insets');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Sandpaper Letters are the iconic Montessori material for writing preparation. Each letter is made of rough sandpaper mounted on a smooth colored card—vowels on blue, consonants on pink. Children trace the letter shape with their finger while hearing the letter sound, engaging vision, touch, and hearing simultaneously. This multisensory approach helps children internalize letter shapes and their corresponding sounds. Through repeated tracing, children develop the muscle memory necessary for writing. The tactile feedback of the sandpaper helps children understand when they''re tracing correctly.',
  why_it_matters = 'Sandpaper Letters combine sensorial learning with phonetic instruction—classic Montessori integration of senses with academics. The tactile-kinesthetic approach appeals to young learners who learn best through touch and movement. Tracing sandpaper letters builds the fine motor control and hand strength necessary for writing while establishing sound-symbol connections essential for reading. By the time children move to writing on paper, the letter formation is already internalized, making the transition smooth and confident.'
WHERE LOWER(name) = LOWER('Sandpaper Letters');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using their fingers to trace letters in sand, creating a multisensory experience that connects sight, touch, and movement. After seeing a letter shape card, they reproduce it in the sand tray using a wooden stylus or their finger. This tactile feedback helps cement letter formation before pencil is ever picked up.',
  why_it_matters = 'Sand tray work engages multiple senses simultaneously, which strengthens memory and muscle memory for letter shapes. The erasable medium removes pressure and encourages repeated practice—perfect for developing the motor patterns that lead to automatic letter writing.'
WHERE LOWER(name) = LOWER('Sand Tray Writing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Chalkboard Writing bridges the gap between sandpaper letters and paper writing. Children practice writing on erasable chalkboards, where mistakes can easily disappear. This low-pressure environment encourages experimentation and builds confidence. Without the permanence of pencil on paper, children feel free to attempt letters, try new words, and risk making mistakes. Through playful chalkboard practice, children develop muscle memory, pencil grip, and letter formation—all essential for successful paper writing. The emphasis remains on the joy of creating and expressing ideas, not on perfection.',
  why_it_matters = 'The transition from sandpaper letters to paper writing is significant. Chalkboard work provides a crucial intermediate step that maintains the tactile, low-pressure environment while building real writing skills. The impermanence of chalk writing helps children approach writing as playful exploration rather than high-stakes performance. Research shows that children who experience playful, low-pressure writing activities develop stronger writing skills and greater willingness to take risks in writing than children pushed to ''correct'' writing too early.'
WHERE LOWER(name) = LOWER('Chalkboard Writing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is building words by selecting individual letter tiles and arranging them on a mat. With vowels in blue and consonants in red, they sound out a word they hear and choose letters to represent each sound. This ingenious material allows children to express their thoughts in writing before their hand is ready for pencil work. Watch as your child ''writes'' sentences and stories—they''re becoming an author!',
  why_it_matters = 'The Moveable Alphabet bridges the gap between knowing letter sounds and actual writing, allowing children to compose words, sentences, and even stories. This early success with encoding builds confidence and a genuine love of writing—often before traditional handwriting instruction.'
WHERE LOWER(name) = LOWER('Moveable Alphabet');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Handwriting on Paper is the culmination of the writing preparation sequence. After mastering sandpaper letters and chalkboard writing, children are ready to write with pencil on paper. Using special Montessori writing paper with guidelines to support letter formation, children write letters, then simple words and sentences. The focus is on legibility and purposeful communication rather than speed or perfection. Children practice writing in meaningful contexts—labeling items in the classroom, creating stories, writing messages to friends. Through this real-world writing, children develop both the mechanics of handwriting and the motivation to communicate through the written word.',
  why_it_matters = 'Proper handwriting instruction built on careful preparation prevents lifelong writing difficulties. Children who experience the Montessori writing progression develop confident, legible handwriting without tension or frustration. The progression from tactile (sandpaper) to temporary (chalkboard) to permanent (paper) respects children''s developmental needs and cognitive ability to handle permanence. Most importantly, this sequence connects writing to meaningful communication, ensuring children view writing as a tool for expression rather than a chore.'
WHERE LOWER(name) = LOWER('Handwriting on Paper');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Creative Writing is about encouraging children to express themselves through the written word. Beginning in early childhood, children are invited to write their own stories, messages, and ideas. Teachers celebrate invention and expression while gently supporting skill development. As children write, they naturally encounter questions: How do I spell this? Can I use this word? This authentic need drives learning more effectively than isolated spelling or grammar lessons. The Montessori approach trusts that children will develop conventional writing skills through purposeful, meaningful writing experiences.',
  why_it_matters = 'Children who write regularly, creatively, and with support develop strong writing skills and lifelong writing habits. Creative writing supports emotional development, allowing children to process experiences and express feelings. It develops imagination, creativity, and problem-solving skills. Children who view themselves as capable writers in early childhood maintain that positive identity and confidence throughout their academic careers. Perhaps most importantly, creative writing is joyful—when writing is about expressing ideas rather than following rules, children engage with enthusiasm and develop a love of the written word.'
WHERE LOWER(name) = LOWER('Creative Writing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is matching real objects to word cards, learning to recognize words through multiple exposures. These beautifully presented boxes contain miniature objects paired with phonetic word cards. By finding the matching word for each object, your child connects concrete items to their written symbols—building reading skills through hands-on exploration.',
  why_it_matters = 'The Object Boxes build reading fluency through pattern recognition and repeated exposure to phonetic words. This multi-sensory approach helps children internalize word recognition and solidifies the connection between meaning, sound, and symbol.'
WHERE LOWER(name) = LOWER('Object Boxes (Pink/Blue/Green)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering the joy of reading simple three-letter words using the consonant-vowel-consonant pattern—words like cat, dog, and sit. These foundational words follow phonetic rules perfectly, allowing your child to apply their letter-sound knowledge immediately. By reading, tracing, and spelling CVC words, they''re experiencing their first real reading success.',
  why_it_matters = 'The Pink Series builds early reading confidence by providing completely decodable words. This success with phonetic patterns gives children the foundation and motivation to become readers, and the predictable structure helps them apply learned letter sounds.'
WHERE LOWER(name) = LOWER('Pink Series (CVC Words)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is now tackling consonant blends—those tricky beginning and ending sounds like ''bl'' and ''st'' where two consonants work together. The Blue Series introduces longer, slightly more complex words while maintaining the short vowel sounds they''ve mastered. Your child delights in discovering words like ''flag,'' ''stop,'' and ''brush.''',
  why_it_matters = 'Consonant blends are the next natural step in phonetic reading. Understanding that letter combinations can work together to make new sounds expands your child''s decoding strategies and pushes reading into more sophisticated words.'
WHERE LOWER(name) = LOWER('Blue Series (Blends)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Phonogram Introduction teaches children that certain pairs of letters consistently make a single sound. After mastering individual letter sounds, children learn that ''ch'' always makes the ''chhhh'' sound, ''th'' makes the ''thhhh'' sound, and so on. Using Three Period Lessons and picture boxes containing only words with that phonogram, children systematically build knowledge of these sound patterns. Understanding phonograms is transformative—suddenly, children can read many more words. A child who knows individual letters plus phonograms can decode far more complex text than one who relies on single letters alone.',
  why_it_matters = 'English spelling is complex but has underlying patterns. Phonograms represent one of those patterns—consistent letter combinations that produce predictable sounds. Teaching phonograms explicitly bridges the gap between simple CVC words and more complex text. Research shows that children who understand letter patterns and phonogram combinations become more fluent, confident readers. Phonogram knowledge also supports spelling, as children learn to recognize and reproduce these patterns. Most importantly, phonograms help children understand that reading is decipherable through pattern recognition—an essential insight for reading growth.'
WHERE LOWER(name) = LOWER('Phonogram Introduction');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is diving into the trickier aspects of English—digraphs like ''ch'' and ''sh,'' silent letters, and vowel teams that don''t follow the usual rules. The Green Series introduces phonograms: special letter combinations that sound different from what you''d expect. It''s here that your child learns why English is wonderfully quirky!',
  why_it_matters = 'Phonograms and digraphs unlock a huge range of vocabulary beyond purely phonetic words. Understanding these special sound combinations allows children to read the majority of English words, preparing them for fluent, independent reading.'
WHERE LOWER(name) = LOWER('Green Series (Phonograms)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning the ''puzzle words''—those tricky high-frequency words that can''t be sounded out phonetically, like ''the,'' ''said,'' and ''where.'' These words are so important in reading that they must be memorized. Your child learns these through playful matching games and repeated exposure, building reading speed and fluency.',
  why_it_matters = 'Sight words are essential for reading fluency. Since these common words appear constantly in texts, learning to recognize them instantly without sounding them out dramatically increases reading speed and comprehension.'
WHERE LOWER(name) = LOWER('Puzzle Words (Sight Words)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Reading Analysis teaches children to look beneath the surface of sentences to understand how they''re constructed. Using colorful Analysis Charts where parts of speech are marked with specific colors and shapes, children discover the function of each word in a sentence. They learn that ''the cat'' contains an article and a noun; that ''sits'' is the action verb; that ''on the mat'' shows where the action happens. This grammatical understanding deepens reading comprehension and supports writing. Children see that sentences follow logical patterns, making even complex text decipherable.',
  why_it_matters = 'Grammar isn''t about following arbitrary rules—it''s about understanding how language conveys meaning. Reading Analysis gives children tools to decode not just words but the relationships between words. This metalinguistic awareness—thinking about language itself—supports reading comprehension, writing quality, and language learning generally. Children who understand sentence structure can tackle more complex texts with confidence. The Montessori approach to grammar is particularly effective because it makes the abstract structure of language concrete and visual.'
WHERE LOWER(name) = LOWER('Reading Analysis');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Reading Classification organizes words into meaningful groups. Children sort words by category: animals, actions, describing words, or many other possibilities. This work helps children see relationships between words and recognize patterns in language. For example, understanding that ''cat,'' ''dog,'' and ''bird'' are all animals helps children predict meaning and remember vocabulary. Classification supports both reading and spelling, as children notice that words in the same category often follow similar patterns. This organized approach to vocabulary builds a stronger, more interconnected understanding of language.',
  why_it_matters = 'Words aren''t learned in isolation; they''re learned as part of networks and categories. Classification work makes these networks visible and organized. Research on vocabulary acquisition shows that organizing words by meaning, function, or pattern supports learning and retention far better than memorization. Classification supports reading comprehension (knowing word categories helps predict meaning from context) and spelling (recognizing phonetic or structural patterns). Perhaps most importantly, it teaches children to think about language analytically—an essential skill for advanced literacy.'
WHERE LOWER(name) = LOWER('Reading Classification');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Command Cards make reading active and joyful. Children read a word or short sentence card and then perform the action it describes: sit, hop, clap, spin. The physical action serves as both motivation and comprehension check—if the child can do the action, they understood the reading. This work combines literacy with movement and is particularly engaging for kinesthetic learners. As children become fluent with single-word commands, they progress to short sentences and eventually to following written instructions for recipes or crafts. Command Cards teach that reading is about understanding meaning and taking action, not just decoding words.',
  why_it_matters = 'Command Cards bridge the gap between decoding and comprehension. Many children can call out words without understanding meaning; Command Cards require true comprehension. The immediate physical feedback (doing the action) confirms understanding. The integration of movement with reading activates multiple pathways in the brain, supporting memory and engagement. Most importantly, Command Cards demonstrate that reading has purpose—you read to understand and do something with that understanding. This realization transforms reading from a skill exercise to a meaningful tool.'
WHERE LOWER(name) = LOWER('Command Cards (Action Reading)');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Interpretive Reading is reading for meaning, not just decoding. After learning to read words and follow simple instructions, children begin to read for deeper understanding: What is the author trying to communicate? How do I feel about what I read? What does it mean? Children discuss stories, act them out, draw responses, and create their own interpretations. The focus shifts from ''Can you read this word?'' to ''What does this story mean?'' This is reading for real—reading for pleasure, meaning, and connection. Interpretive reading develops critical thinking and builds a lifelong love of literature.',
  why_it_matters = 'Reading with only surface comprehension is incomplete literacy. True reading means understanding and interpreting meaning. Interpretive reading develops the higher-order thinking skills essential for academic and lifelong success. Acting out stories and discussing meaning develops empathy—understanding others'' perspectives and emotions. When children see reading as a path to deeper understanding of the world and human experience, they become motivated readers. The emotional connection to stories, fostered through interpretation and dramatization, creates lifelong readers who read for pleasure and growth.'
WHERE LOWER(name) = LOWER('Interpretive Reading');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Silent Reading is independent, quiet reading time where children choose books they want to read and read for pleasure. In a peaceful, beautiful classroom space, children read books they select, discovering stories they love. Teachers observe, gently guide book selection, and model reading alongside children. The focus is on building a love of reading, not on testing comprehension or meeting standards. Children discover that reading is pleasurable and meaningful. Over time, silent reading builds fluency, expands vocabulary, and creates the foundation for lifelong learning. Even early readers and children with fewer words can enjoy books through pictures and teacher reading aloud.',
  why_it_matters = 'Silent reading time is essential for developing fluent readers and lifelong love of reading. Research clearly shows that children who engage in frequent, pleasurable reading develop stronger reading skills, larger vocabularies, and better comprehension than children who read less. Voluntary reading—reading of one''s own choice—is particularly powerful for motivation and sustained engagement. Perhaps most importantly, silent reading creates an association between reading and pleasure, building the intrinsic motivation that sustains readers throughout life. Children who love reading succeed academically across all subjects.'
WHERE LOWER(name) = LOWER('Silent Reading');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is beginning to understand grammar through a beautiful black pyramid symbol representing nouns. A noun is a ''naming word''—the solid, concrete name of a person, place, or thing. Your child explores the classroom finding nouns (desk, book, teacher) and discovers that nouns are the foundation of language. The concrete symbol and hands-on exploration make this concept tangible.',
  why_it_matters = 'Understanding nouns is the foundation for all grammar learning. By recognizing nouns, children begin to see how language is structured, preparing them for deeper comprehension of sentence construction and meaningful writing.'
WHERE LOWER(name) = LOWER('Introduction to the Noun');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering articles—the small words ''a,'' ''an,'' and ''the'' that introduce nouns. Using concrete materials and a light blue triangle symbol, they explore how articles work with nouns to give us more specific information. This subtle but powerful work helps children understand how words work together to create meaning.',
  why_it_matters = 'Articles are essential for precise communication. Understanding how they function helps children appreciate how small words carry significant meaning, and prepares them for more complex grammar study.'
WHERE LOWER(name) = LOWER('Introduction to the Article');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring descriptive words that tell us what something is like. Using a dark blue triangle symbol and concrete materials (objects that differ by color, size, or texture), your child discovers how adjectives modify nouns. They might write ''the big red ball'' and learn that adjectives add richness and specificity to writing.',
  why_it_matters = 'Adjectives bring language to life. Learning to recognize and use descriptive words helps children write more vivid, engaging sentences and deepens their ability to understand and express ideas with precision.'
WHERE LOWER(name) = LOWER('Introduction to the Adjective');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering the energy of language through verbs—action words represented by a red circle, just like the vital sun! They delight in acting out verbs like ''skip,'' ''wiggle,'' and ''jump'' while classmates guess the action. This kinesthetic, joyful introduction helps children understand that verbs bring sentences to life with movement and energy.',
  why_it_matters = 'Verbs are the heart of meaningful sentences. Understanding action and state-of-being verbs helps children compose sentences with purpose and energy, and deepens their comprehension of what makes a complete thought.'
WHERE LOWER(name) = LOWER('Introduction to the Verb');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning how adverbs modify verbs, making actions more interesting and specific. Using an orange circle symbol, they explore how ''skip quickly'' is different from ''skip slowly.'' By performing the same action in different ways based on adverb instructions, your child experiences directly how these words change the quality of an action.',
  why_it_matters = 'Adverbs expand children''s ability to express how, when, and where actions happen. This work prepares them to write with greater nuance and helps them understand the layers of meaning in the sentences they read.'
WHERE LOWER(name) = LOWER('Introduction to the Adverb');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering pronouns—words that stand in for nouns, like ''he,'' ''she,'' ''they,'' and ''I.'' Using a purple triangle symbol, they explore how pronouns replace names to avoid repetition. This concept becomes concrete when they record sentences and swap pronouns in place of repeated nouns, seeing how language becomes more elegant.',
  why_it_matters = 'Pronouns are essential for writing flow and clarity. Understanding how pronouns replace nouns helps children write more sophisticated sentences and comprehend how language maintains meaning while varying word choice.'
WHERE LOWER(name) = LOWER('Introduction to the Pronoun');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring relationships between objects using prepositions—words that show location and connection, like ''in,'' ''under,'' ''beside,'' and ''between.'' With a green symbol and hands-on materials (like beads and boxes), they physically place objects in different positions and discover how prepositions describe these spatial relationships.',
  why_it_matters = 'Prepositions are crucial for expressing relationships and giving directions. This work helps children understand how spatial and logical relationships are expressed in language, preparing them for clear writing and reading comprehension.'
WHERE LOWER(name) = LOWER('Introduction to the Preposition');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering conjunctions—the connecting words like ''and,'' ''but,'' and ''or'' represented by a pink rectangle or ribbon symbol. By exploring how conjunctions tie ideas together (like a ribbon connecting two objects), they understand how these words link words and ideas to create more interesting, complex sentences.',
  why_it_matters = 'Conjunctions are the glue that holds more sophisticated sentences together. Understanding how to use connectives helps children move beyond simple, choppy sentences and begin composing complex thoughts with nuance and flow.'
WHERE LOWER(name) = LOWER('Introduction to the Conjunction');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering interjections—those expressive one-word exclamations like ''Wow!'' ''Yikes!'' and ''Stop!'' represented by a gold exclamation point symbol. These words burst with emotion and stand alone as complete units. Your child explores the feelings behind interjections, understanding how they add personality and emotion to writing.',
  why_it_matters = 'Interjections bring authentic emotion and voice to writing. Understanding how to use these powerful words helps children write with genuine expression and personality, making their writing more engaging and true to their voice.'
WHERE LOWER(name) = LOWER('Introduction to the Interjection');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is building actual sentences using color-coded cards for each part of speech. The Grammar Boxes contain compartments filled with articles (tan), nouns (black), adjectives (brown), verbs (red), prepositions (green), adverbs (orange), pronouns (purple), and conjunctions (pink). Your child selects a sentence card and builds it by finding the appropriate words, then acts it out to truly understand the meaning.',
  why_it_matters = 'Grammar Boxes transform abstract grammar into concrete, kinesthetic learning. By building sentences with their hands and performing them with their bodies, children internalize how grammar works and develop a deep, intuitive understanding of sentence structure.'
WHERE LOWER(name) = LOWER('Grammar Boxes');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is breaking down sentences into their component parts, discovering how subjects, predicates, verbs, and objects work together to create meaning. Using color-coded arrows and symbols, they analyze sentences from books, their own writing, or teacher-created examples, asking questions to identify each grammatical role.',
  why_it_matters = 'Sentence analysis develops reading comprehension and writing clarity. By understanding how sentences are structured, children can read more critically, troubleshoot their own writing, and compose increasingly sophisticated sentences with purpose and correctness.'
WHERE LOWER(name) = LOWER('Sentence Analysis');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering patterns in words by exploring word families—groups of words with similar sounds and structures, like ''cat, sat, bat, mat'' or ''make, bake, take, shake.'' By recognizing these patterns, your child learns to decode new words more efficiently and builds phonemic awareness through exploring words that rhyme and share patterns.',
  why_it_matters = 'Word families are an efficient way to decode and spell words. By understanding phonetic patterns, children can apply knowledge of one word to unlock the reading of many related words, dramatically accelerating vocabulary development and reading fluency.'
WHERE LOWER(name) = LOWER('Word Families');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Spelling Rules teach that English spelling, while complex, follows underlying patterns. Rather than requiring children to memorize each word, teaching rules and patterns gives them tools to spell unfamiliar words. Children learn that hopping doubles the p, that dropping the final e occurs before adding -ing, that changing y to i happens before adding -ly. These patterns, seen across many words, help children spell more independently. While English contains exceptions, knowing the rules gets you 84% of the way—enough to support confident, independent spelling.',
  why_it_matters = 'Teaching spelling rules explicitly supports spelling accuracy and writing fluency. Children who understand spelling patterns become more confident writers, less likely to avoid writing complex words. Pattern-based spelling instruction is more effective than memorization because it''s generalizable—once a child knows the doubling rule, they can apply it to numerous words, not just those memorized. Spelling competence also supports reading, as recognizing spelling patterns helps children decode unfamiliar words.'
WHERE LOWER(name) = LOWER('Spelling Rules');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is delighted to discover that two separate words can combine to create a brand new word with its own unique meaning! Words like ''sunflower'' (sun + flower), ''sometimes'' (some + times), and ''butterfly'' (butter + fly) fascinate children as they break compounds into parts and create their own new combinations. This work reveals the logic—and sometimes the beautiful illogic—of English.',
  why_it_matters = 'Understanding compound words expands vocabulary and develops word analysis skills. Children learn that knowing smaller words helps unlock larger ones, and the creativity of combining words captures their interest in how language works.'
WHERE LOWER(name) = LOWER('Compound Words');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Prefixes and Suffixes are word parts that modify meaning. Prefixes (un-, re-, pre-) attach to the beginning of words; suffixes (-ful, -less, -ing, -ly) attach to the end. Teaching these word elements explicitly empowers children to decode unfamiliar words. Learning that ''un-'' means not helps children understand that unkind means not kind, unhappy means not happy. Learning that ''-ful'' means full of helps them understand that careful means full of care. By recognizing these parts in new words, children can decode them independently and expand vocabulary significantly.',
  why_it_matters = 'Prefixes and suffixes are powerful tools for word learning and reading fluency. A child who knows common affixes can decode hundreds of words they''ve never seen before. Etymology and morphological awareness (understanding word structure) directly supports reading comprehension and vocabulary growth. Research shows that explicit instruction in affixes significantly improves reading comprehension and spelling. Perhaps most importantly, understanding affixes teaches children that language is systematic—words are built from parts that follow rules, not random collections of letters.'
WHERE LOWER(name) = LOWER('Prefixes and Suffixes');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Synonyms are words with similar meanings; antonyms are words with opposite meanings. Children learn that ''big'' and ''large'' are synonyms—similar but not identical. They learn that ''big'' and ''small'' are antonyms—opposite meanings. Understanding these relationships helps children understand texts (using context and word relationships to infer meaning), expand vocabulary, and vary word choices in writing. Rather than always using the same word (happy, happy, happy), children learn alternatives (joyful, delighted, glad) that add sophistication and precision. This work is playful and visual, often involving sorting, categorizing, and building connections between words.',
  why_it_matters = 'Understanding word relationships is central to vocabulary growth and reading comprehension. When children understand that words have synonyms and antonyms, they recognize larger patterns in language. In reading, knowing an antonym can help infer meaning: ''The opposite of cloudy is clear, so clearing up means getting clearer.'' In writing, choosing among synonyms helps express subtle meanings and add variety. Most importantly, working with synonyms and antonyms teaches children to think about language analytically—to see words not as isolated items but as parts of an interconnected system. This metalinguistic awareness supports all future language learning.'
WHERE LOWER(name) = LOWER('Synonyms and Antonyms');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring the playful complexity of English by discovering homonyms—words that are spelled the same but have different meanings (like ''bat: the animal'' vs. ''bat: the sports equipment''), and homophones—words that sound the same but are spelled differently (like ''there/their/they''re''). Using matching cards and definition work, your child discovers why context matters so much in reading.',
  why_it_matters = 'Understanding homonyms and homophones develops reading comprehension and spelling accuracy. This work helps children understand that multiple words can sound or look alike but carry completely different meanings, making them more careful readers and writers.'
WHERE LOWER(name) = LOWER('Homonyms');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring our beautiful planet Earth using a tactile globe where the land feels rough like sandpaper and the water is smooth to the touch. Through this sensory experience, children develop an intuitive understanding that Earth is a sphere with both land and water. This is often a child''s first magical moment of realizing that we live on a spinning globe surrounded by oceans!',
  why_it_matters = 'This foundational work plants seeds of wonder about our world and builds the very first geography concepts. Children develop environmental awareness and begin to see themselves as part of a larger, interconnected planet.'
WHERE LOWER(name) = LOWER('Globe - Land and Water');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Building on the land and water concept, your child now explores a globe where each of the seven continents is shown in its own beautiful color. Through this work, children learn that Earth is divided into distinct continental regions, each with its own identity and characteristics. They discover the names and locations of these massive land masses while developing an understanding of how our world is organized geographically.',
  why_it_matters = 'This work expands children''s sense of the world beyond their immediate community. It builds geography knowledge and global awareness, fostering curiosity about the different people, cultures, and environments that exist across our planet.'
WHERE LOWER(name) = LOWER('Globe - Continents');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is piecing together a wooden puzzle of the entire world, with each country or continent as a removable piece. As they carefully fit each piece into place, they''re developing fine motor skills while absorbing knowledge of world geography. The hands-on nature of this work makes geography tangible—children can hold, feel, and spatially understand how countries relate to one another.',
  why_it_matters = 'Puzzle maps transform geography from abstract concepts into concrete understanding. Children develop problem-solving skills, spatial reasoning, and a deeper awareness of how our world is organized politically and geographically.'
WHERE LOWER(name) = LOWER('Puzzle Map - World');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'After exploring the world map, your child now zooms in to explore individual continents through their own puzzles. Each continent''s puzzle shows countries or regions, allowing children to understand the diversity within each land mass. This layered approach deepens their geographic knowledge and helps them see how regions fit together like pieces of a larger story.',
  why_it_matters = 'This work develops sophisticated spatial reasoning and helps children understand that geography is hierarchical—that countries belong to continents, which belong to the world. It nurtures a sense of how human cultures are organized across space.'
WHERE LOWER(name) = LOWER('Puzzle Maps - Individual Continents');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering the beautiful flags of countries around the world, learning to recognize and name them. Whether matching flags to countries on a map, grouping them by continent, or simply observing the colors and patterns, this work opens a window into global diversity. Flags become symbols that help children connect to the world beyond their home.',
  why_it_matters = 'Flags are powerful cultural symbols that help children develop international awareness and cultural appreciation. This work fosters curiosity about different countries and encourages children to see our world as rich with diverse peoples and traditions.'
WHERE LOWER(name) = LOWER('Flags of the World');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Land and Water Forms teaches children to recognize eight major geographic formations through hands-on water work. By creating each form using water-filled trays, children develop spatial understanding and vocabulary for describing Earth''s diverse landscape.',
  why_it_matters = 'Understanding land and water forms is foundational to geography and map reading. This work develops spatial reasoning and helps children read atlases and globes. The sensorial experience of water work makes abstract geographic concepts concrete.'
WHERE LOWER(name) = LOWER('Land and Water Forms');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Solar System work introduces young astronomers to our cosmic neighborhood. Children learn the names and order of planets orbiting our sun, building foundation knowledge for later elementary studies in physics and astronomy. This work connects directly to Montessori''s cosmic education philosophy, helping children understand their place in the universe.',
  why_it_matters = 'Understanding our solar system provides context for Earth sciences, geography, and physics. It fosters scientific curiosity and wonder while developing essential vocabulary. This work supports children''s natural interest in the cosmos and prepares them for more abstract astronomical concepts in the elementary years.'
WHERE LOWER(name) = LOWER('Solar System');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Calendar Work is foundational time awareness in the Montessori primary classroom. Through daily calendar practice, children learn the structure of our time system—days, weeks, months, and seasons. This work helps children develop temporal consciousness and understand how time organizes their world.',
  why_it_matters = 'Time awareness is essential for all learning. Understanding calendar structure provides scaffolding for clock reading, understanding history, and planning. This work connects abstract temporal concepts to children''s lived experiences, making time tangible and meaningful.'
WHERE LOWER(name) = LOWER('Calendar Work');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Montessori Birthday Celebration is a beautiful tradition that combines cosmic education with personal celebration. The birthday child walks around the sun for each year of their life, helping them understand Earth''s orbit in a concrete, embodied way. Parents share memories and photos from each year, creating a meaningful recognition of the child''s growth and place in their community.',
  why_it_matters = 'This ceremony is transformative for children''s understanding of time, growth, and their significance in the world. It connects cosmic movements to personal experience, making abstract concepts concrete. The celebration reinforces community values and helps children develop positive self-image and temporal awareness.'
WHERE LOWER(name) = LOWER('Birthday Celebration');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is creating a timeline of their own life, arranging photos, drawings, or written markers of important moments from birth to now. This work helps children understand the passage of time in a deeply personal way—they can see how much they''ve grown and changed. It''s often a child''s first introduction to the concept that time moves forward and that their life has a story worth recording.',
  why_it_matters = 'Personal timelines help children develop an understanding of time and sequence while building self-awareness and confidence. This work is the stepping stone toward understanding larger historical timelines and developing a sense of their place in history.'
WHERE LOWER(name) = LOWER('Personal Timeline');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Clock Work teaches children to read time on analog and digital clocks. Beginning with simple on-the-hour readings, children progress through 30-minute, 15-minute, 5-minute, and finally individual-minute increments. This work is foundational for independence and scheduling in later years.',
  why_it_matters = 'Being able to tell time is essential for independence, punctuality, and participation in community life. This work develops mathematical concepts (fractions, skip counting) while building practical life skills. Understanding time prepares children for elementary schedules and activities.'
WHERE LOWER(name) = LOWER('Clock Work');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring an enormous timeline showing the history of life on Earth—from the earliest microorganisms billions of years ago to human beings today. Using color-coded strips representing different geological eras, children marvel at the vastness of time and the incredible journey of life. This panoramic view of Earth''s history often fills children with awe and wonder about our planet''s story.',
  why_it_matters = 'The Timeline of Life builds scientific understanding while cultivating deep wonder about our planet. Children begin to grasp concepts of evolution, the interconnectedness of all living things, and their own small but important place in Earth''s long and beautiful history.'
WHERE LOWER(name) = LOWER('Timeline of Life');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning that all human beings, across all cultures and throughout history, have the same basic needs: food, shelter, clothing, and community. Through exploring charts and activities, they discover how different cultures fulfill these needs in wonderfully different ways. This work helps children recognize their own humanity in others and develop empathy and understanding across cultures.',
  why_it_matters = 'This work builds cultural sensitivity and global citizenship. Children learn to appreciate diversity while recognizing our common humanity. It plants seeds of respect for different ways of living and encourages children to think critically about how societies organize themselves.'
WHERE LOWER(name) = LOWER('Fundamental Needs of Humans');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Living vs. Non-Living is the foundational classification work in Montessori botany. Through hands-on exploration of real objects from nature, children learn to identify characteristics that distinguish living things from non-living objects. This work develops observational skills and respect for nature while preparing for more detailed biological studies.',
  why_it_matters = 'This fundamental classification establishes the basis for all future biological learning. Understanding what makes something alive is essential for studying plants, animals, and ecosystems. This work fosters respect and care for living things and encourages scientific observation.'
WHERE LOWER(name) = LOWER('Living vs Non-Living');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Plant vs. Animal teaches children the fundamental differences between two major kingdoms of living things. Through observation and classification work, children learn that plants are rooted producers of their own food, while animals are mobile consumers who must eat. This distinction is essential for understanding ecosystems and biodiversity.',
  why_it_matters = 'Understanding the plant-animal distinction is foundational for all biological studies. This classification forms the basis for understanding food chains, ecosystems, and interdependence in nature. The work develops critical thinking and scientific observation skills.'
WHERE LOWER(name) = LOWER('Plant vs Animal');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering the different parts that make up a plant—roots, stem, leaves, and flower—using beautiful wooden puzzles where each part separates out. By touching and naming these parts, children develop botanical vocabulary and understanding. They begin to see plants not as simple pretty things, but as complex living organisms with different structures that work together.',
  why_it_matters = 'This foundational botany work builds scientific observation skills and nurtures curiosity about the natural world. Children develop an appreciation for plants'' complexity and begin to understand how living things are organized and interconnected.'
WHERE LOWER(name) = LOWER('Parts of a Plant');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Going deeper into botany, your child is exploring the specific parts of a flower—petals, pistil, stamen, and more—often using a puzzle or examining a real flower up close with a magnifying glass. This hands-on exploration reveals the delicate intricacy of flowers and helps children understand that each part has a purpose in the flower''s life cycle.',
  why_it_matters = 'This work develops detailed observational skills and botanical knowledge while fostering respect for the complexity of nature. Children begin to understand reproduction and pollination concepts, building a foundation for later biology learning.'
WHERE LOWER(name) = LOWER('Parts of a Flower');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is examining the intricate structure of leaves—the petiole, veins, midrib, and lamina—using puzzles and sometimes magnifying glasses to observe real leaves. They discover that leaves are beautifully designed structures with specific parts that work together to help the plant survive. This micro-level exploration reveals the hidden complexity in something children see every day.',
  why_it_matters = 'This work develops careful observation and scientific thinking. Children learn to see the world with curiosity and wonder, discovering that even tiny things have sophisticated design and purpose. It builds the foundation for understanding photosynthesis and plant biology.'
WHERE LOWER(name) = LOWER('Parts of a Leaf');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Parts of a Root teaches children the structure and function of plant roots through hands-on observation. By growing seeds in water and observing roots develop, children see that roots grow downward and absorb nutrients. This work connects abstract botanical concepts to concrete observation.',
  why_it_matters = 'Understanding roots is essential for plant care and plant biology. Observing root growth helps children understand that plants are living, growing organisms with specific needs. This work develops scientific observation skills and fosters care for plants.'
WHERE LOWER(name) = LOWER('Parts of a Root');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Parts of a Seed introduces children to seed structure through careful dissection work. By opening seeds and observing the tiny plant waiting inside, along with its stored food and protective coat, children understand how seeds work. This concrete exploration prepares them for planting and growing seeds.',
  why_it_matters = 'Understanding seed structure is foundational for plant biology and reproduction. This work develops careful observation, fine motor control, and wonder at nature''s design. Dissecting seeds creates emotional connection to plants and motivation for growing them.'
WHERE LOWER(name) = LOWER('Parts of a Seed');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring how plants grow from seeds, through sprouting and growth, to flowering and producing new seeds—often by actually planting seeds and observing them grow! Through this hands-on experience, children witness the miracle of life unfolding. They develop patience and learn about the patience and care required to nurture living things.',
  why_it_matters = 'The Plant Life Cycle work builds scientific understanding of growth and reproduction while cultivating responsibility and connection to nature. Children develop patience and learn that life unfolds in stages—a concept that applies far beyond plants.'
WHERE LOWER(name) = LOWER('Plant Life Cycle');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Botany Experiments engages children in the scientific method through plant observation and simple experimentation. By planting seeds, testing different conditions, and recording observations, children discover what plants need to grow. This hands-on science work builds scientific thinking and responsibility.',
  why_it_matters = 'Hands-on experimentation is core to Montessori science. This work develops scientific method skills, observation abilities, and understanding of plant biology. The direct experience of growing plants fosters responsibility and emotional connection to nature while teaching critical thinking.'
WHERE LOWER(name) = LOWER('Botany Experiments');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Vertebrate vs. Invertebrate is a foundational animal classification lesson. By understanding that vertebrates have backbones and invertebrates don''t, children can organize vast animal diversity. This work prepares for studying the five classes of vertebrates and various invertebrate groups.',
  why_it_matters = 'This classification system provides essential scaffolding for biological organization. Understanding the vertebrate-invertebrate distinction helps children comprehend animal diversity and adapt their learning. The work develops classification thinking used in all sciences.'
WHERE LOWER(name) = LOWER('Vertebrate vs Invertebrate');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Five Classes of Vertebrates teaches children an essential classification system for organizing animal diversity. By learning that vertebrates are divided into fish, amphibians, reptiles, birds, and mammals—each with distinct characteristics—children can understand and discuss animals more precisely.',
  why_it_matters = 'This classification system is fundamental to zoological thinking. Understanding the five classes provides scaffolding for deeper animal studies and helps children organize vast diversity. The work develops scientific classification and observation skills used throughout biology.'
WHERE LOWER(name) = LOWER('Five Classes of Vertebrates');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Parts of a Fish introduces children to fish anatomy and adaptations. Through observation of real fish or detailed diagrams, children learn external parts and their functions. This work helps children understand how fish are perfectly designed for their aquatic environment.',
  why_it_matters = 'Understanding fish anatomy prepares for studying aquatic life, fish behavior, and marine ecosystems. This work develops observation skills and helps children appreciate the design of living creatures adapted to specific environments.'
WHERE LOWER(name) = LOWER('Parts of a Fish');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Parts of a Frog teaches children about amphibian anatomy and adaptations. By studying frog parts and understanding how they function in water and on land, children learn about organisms adapted to two environments. This work prepares for studying amphibian life cycles and metamorphosis.',
  why_it_matters = 'Understanding frog anatomy introduces amphibian biology and life cycle concepts. This work develops observation skills and fosters appreciation for creatures adapted to specific environmental niches. The connection to tadpole metamorphosis is particularly fascinating for children.'
WHERE LOWER(name) = LOWER('Parts of a Frog');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Parts of a Turtle teaches children about reptile anatomy and protective adaptations. By studying the turtle''s shell structure and other body parts, children understand how the shell provides protection while maintaining mobility. This work prepares for studying reptile diversity.',
  why_it_matters = 'Understanding turtle anatomy introduces children to reptiles and defensive adaptations. The shell is a fascinating evolutionary innovation that children find engaging. This work develops observation skills and appreciation for different animal strategies.'
WHERE LOWER(name) = LOWER('Parts of a Turtle');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Parts of a Bird introduces children to avian anatomy and the adaptations that enable flight. By studying feathers, wings, and skeletal features, children understand how birds are uniquely designed for life in the air. This work prepares for studying bird diversity, behavior, and migration.',
  why_it_matters = 'Understanding bird anatomy unlocks appreciation for the remarkable evolution of flight. This work develops observation skills and fosters wonder at nature''s engineering. Birds are accessible to observe, making this work particularly engaging for children.'
WHERE LOWER(name) = LOWER('Parts of a Bird');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Parts of a Horse teaches children about mammalian anatomy through study of a familiar and beloved animal. By learning horse parts and understanding how they work together for running, jumping, and grazing, children appreciate mammalian adaptations. This work prepares for studying mammals broadly.',
  why_it_matters = 'Horses are iconic animals that engage children''s imagination. Understanding horse anatomy develops observation skills and appreciation for specialized adaptations. The work connects to mammals generally and introduces skeletal and muscular systems.'
WHERE LOWER(name) = LOWER('Parts of a Horse');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning where different animals live—exploring that penguins live in icy polar regions, that certain animals thrive in forests, while others live in deserts or oceans. Through sorting, matching, and exploring activities, children develop an understanding of how animals are suited to their environments and how geography shapes life. They begin to see the interconnectedness of animals and their habitats.',
  why_it_matters = 'This zoology work builds environmental awareness and respect for biodiversity. Children develop understanding that animals depend on specific habitats and that protecting ecosystems is important for all living creatures.'
WHERE LOWER(name) = LOWER('Animal Habitats');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Animals of the Continents teaches children where different animals live around the world. By learning which animals are native to each continent and understanding how they''ve adapted to their environment''s climate, children develop global awareness and appreciation for biodiversity.',
  why_it_matters = 'This work integrates geography and zoology, showing how animals and their environments are interconnected. It fosters global perspective and appreciation for biodiversity. The work prepares for understanding ecosystems, adaptation, and conservation.'
WHERE LOWER(name) = LOWER('Animals of the Continents');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Animal Life Cycles teaches children how different animals are born, grow, reproduce, and eventually die. By studying specific examples like tadpole-to-frog transformation and caterpillar-to-butterfly metamorphosis, children appreciate the diversity of life strategies. This work connects to Montessori''s cosmic education.',
  why_it_matters = 'Understanding life cycles is fundamental to biology and ecology. This work develops observation skills and respect for living things. The cycles connect to seasons, weather, and environmental changes, integrating multiple curriculum areas.'
WHERE LOWER(name) = LOWER('Animal Life Cycles');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is experimenting with objects in water, making predictions about which will sink and which will float, then testing their hypotheses. This classic science exploration teaches children about density and buoyancy through hands-on discovery. The simple act of dropping things in water becomes a scientific investigation that builds critical thinking skills.',
  why_it_matters = 'Sink and Float introduces the scientific method—observing, predicting, testing, and learning from results. This work builds confidence in children''s ability to explore and understand the physical world through their own observations and reasoning.'
WHERE LOWER(name) = LOWER('Sink and Float');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is testing various objects with a magnet, discovering which ones are attracted to the magnet and which ones are not. This exploration introduces the invisible force of magnetism in a tangible way. Children develop vocabulary (magnetic, non-magnetic) and begin to understand that the world operates according to natural laws we can discover through observation.',
  why_it_matters = 'This work develops scientific observation skills and introduces the concept of invisible forces that govern our world. It builds wonder about how nature works and confidence in children''s ability to explore and understand physical phenomena.'
WHERE LOWER(name) = LOWER('Magnetic/Non-Magnetic');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering that matter can exist in three states—solid, liquid, and gas—and learning the properties of each. Through hands-on exploration, they observe that solids have a definite shape, liquids take the shape of their container, and gases spread throughout their space. They might observe water boiling into steam or freeze colored water into ice, watching matter transform.',
  why_it_matters = 'States of Matter builds foundational chemistry understanding while revealing how everyday substances transform. Children develop scientific vocabulary and learn to observe the world with curiosity, discovering that matter is constantly changing in ways we can understand and predict.'
WHERE LOWER(name) = LOWER('States of Matter');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring how colors combine and create new colors—mixing red and yellow to make orange, or blue and yellow to make green. Whether using water droppers, paints, or colored ice, children experiment with cause and effect while developing artistic sensibility. This work opens creative possibilities while teaching color theory in a playful, hands-on way.',
  why_it_matters = 'Color Mixing builds both artistic confidence and scientific understanding. Children develop observation skills, learn about cause and effect, and gain the joy of creative discovery. It nurtures an appreciation for color and encourages artistic expression.'
WHERE LOWER(name) = LOWER('Color Mixing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Simple Machines introduces children to engineering fundamentals through study of six basic machines: lever, wheel and axle, pulley, ramp, wedge, and screw. By identifying these machines in daily life and manipulating examples, children understand how machines reduce the effort needed for work.',
  why_it_matters = 'Understanding simple machines provides foundation for physics and engineering. This work develops problem-solving thinking and helps children appreciate design. Recognizing simple machines everywhere fosters scientific observation and critical thinking about how things work.'
WHERE LOWER(name) = LOWER('Simple Machines');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Nature Study is central to Montessori education—children develop observational skills and love of nature through regular outdoor exploration. By keeping observation journals, using tools like magnifying glasses, and visiting the same places through seasons, children notice patterns and develop scientific thinking.',
  why_it_matters = 'Nature study is foundational to Montessori''s cosmic education. Direct observation of nature develops sensory refinement and scientific thinking. This work fosters environmental consciousness and responsibility that shapes children''s values and future choices.'
WHERE LOWER(name) = LOWER('Nature Study');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'In this work, children become real meteorologists, learning to observe and understand the weather that touches their daily lives. They use actual weather instruments and scientific methods to gather data, building both practical skills and scientific thinking. By connecting weather to cultural practices, geography, and natural cycles, children develop a deeper understanding of how the environment shapes human life across the planet.',
  why_it_matters = 'Weather study develops scientific observation skills while connecting children to the natural world. It builds understanding of cause-and-effect relationships, introduces measurement and data collection, and fosters environmental awareness. Through weather study, children recognize patterns in nature and understand the interconnections between climate, geography, and culture.'
WHERE LOWER(name) = LOWER('Weather Study');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Drawing in the Montessori classroom is much more than art class. It''s a tool for learning to truly see the world. Children spend time carefully observing real objects, then practice representing what they see with pencil and paper. The focus is on the observational process, not on making a perfect picture. Through this work, children develop the patience to look deeply, the coordination to control their pencils precisely, and the confidence to capture their observations on paper.',
  why_it_matters = 'Drawing develops observational skills that enhance learning across all subjects. It builds fine motor control, hand-eye coordination, and visual discrimination. Drawing teaches patience, focus, and the value of sustained effort. It connects children to the artistic tradition and helps them understand how artists see and represent the world.'
WHERE LOWER(name) = LOWER('Drawing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Painting in Montessori is about process and discovery, not about creating perfect pictures. Children learn to use brushes and paints skillfully, to understand how colors behave in water, and to express themselves through color and mark-making. They explore color relationships, develop fine motor skills, and build confidence in their creative abilities. The focus is on enjoying the medium, not achieving a specific product.',
  why_it_matters = 'Painting develops fine motor skills, color perception, and creative expression. It builds patience and sustained focus as children spend extended time with materials. Through painting, children learn about color theory and visual composition. It provides an emotional outlet for expression and builds confidence in artistic endeavors.'
WHERE LOWER(name) = LOWER('Painting');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Collage invites children to explore the visual world through cutting, selecting, and combining materials. They develop practical skills with scissors and glues while making creative decisions about color, texture, and composition. Children learn by doing—discovering how materials work together, what appeals to their eye, and how to plan and execute their own artistic vision. The beauty of collage is that there''s no ''wrong'' way to arrange materials.',
  why_it_matters = 'Collage develops fine motor skills, visual discrimination, and creative decision-making. It builds understanding of composition, color relationships, and texture. Collage activities are accessible to children of all abilities and encourage diverse artistic expression. They provide tactile, visual, and creative engagement that builds confidence in artistic pursuits.'
WHERE LOWER(name) = LOWER('Collage');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Clay and playdough work engages children''s senses through hands-on manipulation. It''s both relaxing and challenging—children feel the resistance and responsiveness of the material as they squeeze, roll, and shape it. This work builds hand strength and coordination while providing a sensory outlet for stress and emotion. The focus is on the pleasure of working with material, not on creating a ''masterpiece.''',
  why_it_matters = 'Clay and playdough work develops fine and gross motor strength and coordination through repetitive, satisfying manipulation. It provides sensory engagement that aids emotional regulation and stress relief. This tactile work builds understanding of three-dimensional form and teaches how to plan and execute simple sculptures. It''s foundational to more advanced art and craft skills.'
WHERE LOWER(name) = LOWER('Clay and Playdough');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Printmaking is like a magic trick for children. They discover that pressing an object into paint creates an image—and they can repeat it again and again, creating patterns and designs. This work teaches both fine motor control and artistic composition. Children explore color relationships, pattern development, and the satisfaction of creating multiple copies of their designs. It connects to real-world printing found in textiles, wallpaper, and books.',
  why_it_matters = 'Printmaking develops understanding of how marks and images are created and transferred. It builds fine motor control and teaches planning and precision. Printmaking introduces children to an art form used across cultures and history. It provides a different approach to image-making than drawing or painting, expanding artistic vocabulary and confidence.'
WHERE LOWER(name) = LOWER('Printmaking');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is experiencing beautiful works of art from around the world—perhaps viewing famous paintings, sculptures, or art from different cultures. Rather than learning to create art a certain way, children are encouraged to look, observe, and respond to what they see. This develops aesthetic sensibility and helps children understand that art is a universal language of human expression.',
  why_it_matters = 'Art Appreciation develops cultural awareness and aesthetic sensitivity. Children learn that there are many ways to express beauty and meaning through art, fostering respect for diverse creative expressions and nurturing their own artistic sensitivity.'
WHERE LOWER(name) = LOWER('Art Appreciation');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is singing—folk songs from around the world, simple melodies that express joy and emotion. Whether it''s a lullaby from Japan, a work song, or a celebration tune, singing is a joyful exploration of music and culture. Children develop listening skills, learn new vocabulary, and experience music as a natural form of human expression that transcends language.',
  why_it_matters = 'Singing builds joy, confidence, and cultural connection. Children learn that every culture has music, and that singing together creates community. This work develops the understanding that music is a fundamental human experience that expresses emotion, culture, and connection.'
WHERE LOWER(name) = LOWER('Singing');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'In rhythm instruments work, children explore how sounds are made and discover the joy of making music together. They learn to listen carefully to distinguish different instrument sounds, develop proper technique for playing, and participate in group music-making. The focus is on the pleasure of sound, the skill of listening, and the satisfaction of playing along with music and other musicians.',
  why_it_matters = 'Learning rhythm instruments develops auditory discrimination and listening skills that support all music and language learning. It builds fine and gross motor control through proper playing technique. Group instrument playing develops social skills and the ability to listen to others while contributing your own part. Music-making builds confidence and provides emotional expression.'
WHERE LOWER(name) = LOWER('Rhythm Instruments');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Movement to music combines listening, physical development, and joy. Children hear music from around the world and respond with their whole bodies—skipping, swaying, spinning, dancing according to what the music inspires. It''s not about learning specific choreography, but about the freedom to express themselves through movement while building coordination, balance, and listening skills. It''s pure fun combined with physical and musical development.',
  why_it_matters = 'Movement to music develops gross motor skills, balance, and coordination essential for physical development. It builds auditory perception and listening skills, teaching children to hear and respond to musical elements. Music and movement combination provides emotional expression and stress relief. It introduces children to diverse cultural musical traditions and builds appreciation for worldwide music diversity.'
WHERE LOWER(name) = LOWER('Movement to Music');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Montessori bells are one of the most beautiful and sophisticated materials in the classroom. Children develop listening skills refined enough to hear the smallest differences in pitch, learning to match, grade, and eventually play melodies with exquisite sensitivity. This material connects sensory auditory experience directly to music reading and notation. Through bells, children understand that music has structure and order—the musical scale—and gain confidence and joy in musical expression.',
  why_it_matters = 'The Montessori bells develop auditory discrimination essential for music learning and language development. They introduce the concept of the musical scale and pitch relationships—foundational to all music education. Bells connect sensory experience directly to symbolic notation, bridging concrete and abstract understanding. This material provides a bridge from pure sensory exploration to formal music literacy, building both listening skills and musical confidence.'
WHERE LOWER(name) = LOWER('Montessori Bells');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is listening to and learning about music from around the world—classical masterpieces, folk traditions, rhythmic patterns from different cultures. Through listening, moving, and discussing music, children develop appreciation for the diversity of musical expression. They discover that music tells stories and carries the traditions of people everywhere.',
  why_it_matters = 'Music Appreciation builds cultural awareness and emotional development. Children learn that music is a universal human language that connects us to each other and to our shared humanity. This work nurtures sensitivity, imagination, and a lifelong love of music.'
WHERE LOWER(name) = LOWER('Music Appreciation');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Weather and Seasons teaches children to observe and track weather patterns throughout the year. By maintaining a weather chart, learning cloud types, and observing seasonal transitions, children develop meteorological awareness and understand how weather affects all life on Earth.',
  why_it_matters = 'Weather awareness connects children to their environment and influences daily life. Understanding seasons and weather patterns prepares for climate studies and fosters environmental consciousness. This work develops careful observation and helps children predict and prepare for weather.'
WHERE LOWER(name) = LOWER('Weather and Seasons');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Water Cycle teaches children how water moves continuously through Earth''s systems via evaporation, condensation, and precipitation. Through observation and simple experiments, children understand that the water cycle is essential to all life and is driven by the sun''s energy.',
  why_it_matters = 'Understanding the water cycle is foundational to studying weather, climate, and ecosystems. This work connects abstract atmospheric processes to concrete observation. The work develops systems thinking and appreciation for Earth''s interdependence.'
WHERE LOWER(name) = LOWER('Water Cycle');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Insects and Their Parts teaches children to observe and understand insect anatomy through magnifying glass exploration. By learning that all insects have six legs, antennae, and three body parts, children can identify and classify insects they encounter.',
  why_it_matters = 'Insects are fascinating and the most diverse animals. Understanding their structure prepares for studying their diversity, life cycles, and ecological importance. This work develops careful observation and helps children overcome fear or disgust toward insects.'
WHERE LOWER(name) = LOWER('Insects and Their Parts');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Rocks and Minerals teaches children to observe and classify the building materials of our planet. By collecting, examining, and testing rocks and minerals, children learn about Earth''s composition and the processes that form different rock types.',
  why_it_matters = 'Understanding rocks and minerals is foundational to geology and earth science. This work develops careful observation and classification skills. Children gain appreciation for the physical world and understand that rocks tell the story of Earth''s history.'
WHERE LOWER(name) = LOWER('Rocks and Minerals');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Trees and Leaves teaches children to observe and identify trees through leaf study. By learning leaf shapes, venation patterns, and margin types, children can identify trees in their environment and appreciate botanical diversity.',
  why_it_matters = 'Understanding leaves develops close observation skills and helps children recognize the trees around them. Creating a leaf collection book is engaging and builds a useful reference. This work fosters appreciation for trees and plant diversity.'
WHERE LOWER(name) = LOWER('Trees and Leaves');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Flowers and Pollination teaches children about plant reproduction through flower dissection and observation. By studying flower parts and understanding how pollinators carry pollen, children appreciate flowers'' role in reproduction and food production.',
  why_it_matters = 'Understanding flowers develops appreciation for plant biology and the importance of pollinators. This work shows how flowers are specially designed to attract specific pollinators, demonstrating nature''s intricate relationships. The knowledge prepares for studying seeds and fruit.'
WHERE LOWER(name) = LOWER('Flowers and Pollination');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Senses of Animals teaches children to understand how different animals perceive their world through specialized sensory abilities. By exploring examples like echolocation in bats, heat sensing in snakes, and electroreception in sharks, children appreciate the diversity of animal adaptations.',
  why_it_matters = 'Understanding animal senses develops appreciation for how evolution has created remarkable diversity. This work builds empathy for animals and helps children understand why animals behave as they do. Sensory study connects biology to behavior and ecology.'
WHERE LOWER(name) = LOWER('Senses of Animals');

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Cosmic Education and the Great Lessons introduce children to the Montessori framework that connects all knowledge. Through five powerful stories—the coming of the universe, life, humanity, writing, and numbers—children develop a cosmic perspective that inspires wonder and responsibility.',
  why_it_matters = 'Cosmic education is transformative. By understanding that everything is connected and that they are part of a vast cosmos, children develop a profound sense of purpose and responsibility. This philosophical framework elevates all other learning and creates meaning beyond individual subjects.'
WHERE LOWER(name) = LOWER('Cosmic Education and the Great Lessons');

COMMIT;

-- Verify
SELECT
  COUNT(*) as total,
  COUNT(parent_description) as with_parent_desc,
  COUNT(why_it_matters) as with_why_matters
FROM montree_classroom_curriculum_works;
