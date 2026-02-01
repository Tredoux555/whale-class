-- Fix all 100 missing parent descriptions
-- Exact name matches for database works
BEGIN;

-- Math works
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the 45 Layout, arranging number cards and golden beads to represent all numbers from 1-9 in the ones, tens, hundreds, and thousands places. This beautiful visual display shows how our number system works and helps children understand place value through hands-on manipulation.',
  why_it_matters = 'The 45 Layout provides a comprehensive visual representation of the decimal system. Children see how the same digits (1-9) appear in each place value column, building deep understanding of how our number system is organized and how numbers grow.'
WHERE name = '45 Layout';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Addition Charts help your child move from concrete bead work to memorizing addition facts. Using the finger method to find where numbers intersect on the chart, your child learns facts efficiently and can self-check using a control chart.',
  why_it_matters = 'Charts provide a bridge between concrete manipulatives and abstract memorization. The visual patterns help memory and build both automaticity and number sense.'
WHERE name = 'Addition Charts';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is extending their addition work with the strip board, exploring more complex combinations and discovering patterns in addition facts.',
  why_it_matters = 'Extension work builds fluency with addition facts while reinforcing the commutative property and preparing for memorization.'
WHERE name = 'Addition Strip Board - Extension 1';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about adjectives - the words that describe nouns. Using objects and symbols, they discover how adjectives add detail and richness to language.',
  why_it_matters = 'Understanding adjectives expands vocabulary and helps children express themselves more precisely. This grammar work builds the foundation for descriptive writing.'
WHERE name = 'Adjective Introduction';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about articles (a, an, the) - the small words that come before nouns. This seemingly simple concept helps children understand how we specify things in language.',
  why_it_matters = 'Articles are fundamental to English grammar. Understanding when to use "a" versus "the" helps children speak and write more precisely.'
WHERE name = 'Article Introduction';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning the social skill of asking to join others in play or work. This grace and courtesy lesson teaches respectful ways to enter group activities.',
  why_it_matters = 'Knowing how to ask to join builds social confidence and teaches children to respect others'' activities while expressing their own desires appropriately.'
WHERE name = 'Asking to Join';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a puzzle that shows the parts of a bird. By removing and replacing the pieces, they learn vocabulary like beak, wing, tail, and feathers while developing fine motor skills.',
  why_it_matters = 'Puzzle work develops fine motor control while teaching scientific vocabulary. Children learn that animals have specific parts with specific functions.'
WHERE name = 'Bird Puzzle';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is reading simple books with short vowel words they have mastered. These phonetic readers build reading confidence and fluency.',
  why_it_matters = 'Reading success builds confidence. Blue series books provide practice with phonetic patterns children know, establishing reading as enjoyable and achievable.'
WHERE name = 'Blue Series - Books';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning digraphs - two letters that make one sound (like sh, ch, th). This expands their ability to decode more complex words.',
  why_it_matters = 'Digraphs unlock hundreds of common English words. Mastering these combinations is essential for reading fluency.'
WHERE name = 'Blue Series - Digraphs';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The braiding frame teaches rhythm and coordination. Children often need weeks of practice before the pattern becomes automatic, building confidence and preparing hands for braiding real hair.',
  why_it_matters = 'Braiding develops bilateral coordination and abstract thinking. The meditative quality builds deep concentration and calm.'
WHERE name = 'Braiding';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a puzzle showing butterfly parts and life stages. This work teaches scientific vocabulary while developing fine motor skills.',
  why_it_matters = 'The butterfly puzzle introduces metamorphosis concepts and builds vocabulary about insect anatomy in a hands-on way.'
WHERE name = 'Butterfly Puzzle';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is matching picture cards with word cards, building vocabulary through visual association. This work develops reading skills while expanding knowledge.',
  why_it_matters = 'Classified cards build vocabulary systematically while reinforcing reading skills. Children learn to categorize and organize information.'
WHERE name = 'Classified Cards - Vocabulary';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to clear their place after eating - scraping plates, stacking dishes, and wiping surfaces. This practical skill develops independence and responsibility.',
  why_it_matters = 'Clearing table teaches sequence, responsibility, and care for the shared environment. Children learn they contribute meaningfully to their community.'
WHERE name = 'Clearing Table';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is matching pairs of colored tablets, developing visual discrimination of color. Box 2 introduces more subtle color differences than Box 1.',
  why_it_matters = 'Color discrimination refines visual perception and builds vocabulary. This precise color matching prepares children for art, science, and everyday visual discrimination.'
WHERE name = 'Color Tablets Box 2';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is grading colors from lightest to darkest, working with multiple shades of each color. This develops sophisticated visual discrimination.',
  why_it_matters = 'Grading colors develops the ability to perceive subtle differences - a skill used in art, design, and scientific observation.'
WHERE name = 'Color Tablets Box 3';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with colored bead bars representing numbers 1-9. Each quantity has its own color, helping children associate numbers with quantities in a memorable way.',
  why_it_matters = 'Colored bead bars make abstract numbers concrete and colorful. The consistent color coding builds automatic number recognition and supports all future math work.'
WHERE name = 'Colored Bead Bars';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring the Colored Globe, which shows land and water in contrasting colors. This simple globe introduces the concept of Earth as a sphere with continents and oceans.',
  why_it_matters = 'The Colored Globe provides the first impression of Earth''s geography. Children begin to understand they live on a planet with land and water masses.'
WHERE name = 'Colored Globe';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning peaceful ways to resolve disagreements. This grace and courtesy work teaches problem-solving and communication skills.',
  why_it_matters = 'Conflict resolution skills serve children throughout life. Learning to express feelings and find solutions builds emotional intelligence and social competence.'
WHERE name = 'Conflict Resolution';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring Continent Boxes filled with artifacts, pictures, and objects from each continent. This hands-on cultural exploration brings geography to life.',
  why_it_matters = 'Continent Boxes make distant places tangible and real. Children develop curiosity about world cultures and understand human diversity.'
WHERE name = 'Continent Boxes';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning the shapes of continents through wooden puzzle maps. By removing and replacing pieces, they develop geographic knowledge and fine motor skills.',
  why_it_matters = 'Puzzle maps create a muscular memory of geographic shapes. Children internalize the arrangement of continents, building lasting geographic knowledge.'
WHERE name = 'Continent Puzzle Maps';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to cut paper with scissors, developing hand strength and coordination. This practical skill prepares hands for writing and builds concentration.',
  why_it_matters = 'Cutting develops the small muscles needed for writing while teaching control and precision. The satisfaction of creating something builds confidence.'
WHERE name = 'Cutting Paper';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning the days of the week in sequence. This temporal awareness helps children understand time and anticipate events.',
  why_it_matters = 'Understanding days of the week gives children a framework for time. They can anticipate special days and understand the rhythm of weekly life.'
WHERE name = 'Days of the Week';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'The Decanomial Square is a beautiful arrangement of colored bead squares showing all multiplication facts from 1×1 to 10×10. Children build it, see patterns, and discover relationships.',
  why_it_matters = 'The Decanomial provides a visual, tactile experience of the multiplication table. Children see patterns and relationships that make memorization meaningful.'
WHERE name = 'Decanomial Square';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing bow tying on a wooden frame. This challenging skill develops fine motor coordination and prepares children to tie their own shoes.',
  why_it_matters = 'Bow tying is a complex skill that develops bilateral coordination and persistence. Mastering it brings tremendous independence and pride.'
WHERE name = 'Dressing Frame - Bow Tying';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing buckling and unbuckling on a wooden frame. This skill develops fine motor coordination and prepares for dressing independence.',
  why_it_matters = 'Buckle work develops finger strength and coordination while building the independence needed for managing clothing and accessories.'
WHERE name = 'Dressing Frame - Buckles';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing lacing on a wooden frame. This challenging work develops fine motor skills and hand-eye coordination.',
  why_it_matters = 'Lacing develops the pincer grip and bilateral coordination needed for writing, while building patience and concentration.'
WHERE name = 'Dressing Frame - Lacing';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing buttoning small buttons on a wooden frame. This precise work develops fine motor control needed for dressing independently.',
  why_it_matters = 'Small button work refines the pincer grip and builds finger dexterity essential for writing and self-care.'
WHERE name = 'Dressing Frame - Small Buttons';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing snapping fasteners on a wooden frame. This simple closure builds finger strength and dressing independence.',
  why_it_matters = 'Snap frames develop finger strength and coordination while providing early success with dressing skills.'
WHERE name = 'Dressing Frame - Snaps';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing with velcro closures on a wooden frame. This is often the first dressing frame, building confidence before more challenging fasteners.',
  why_it_matters = 'Velcro frames introduce the concept of fastening while building confidence. Children experience success and develop interest in dressing skills.'
WHERE name = 'Dressing Frame - Velcro';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing zipping on a wooden frame. This common fastener requires coordination of both hands working together.',
  why_it_matters = 'Zipper work develops bilateral coordination and prepares children for independence with jackets and bags.'
WHERE name = 'Dressing Frame - Zipper';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to transfer liquids using droppers and pipettes. This precise work develops hand strength and control while teaching concentration.',
  why_it_matters = 'Dropper work develops the hand muscles needed for writing while teaching precision and control. It introduces scientific tools in a practical way.'
WHERE name = 'Droppers and Pipettes';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to pour dry materials with control between equal-sized containers. This foundational activity teaches precision and prepares for more complex pouring.',
  why_it_matters = 'Dry pouring teaches controlled hand movements and demonstrates cause and effect. It builds the foundation for all future pouring activities.'
WHERE name = 'Dry Pouring - Equal Vessels';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to politely excuse themselves when needing to leave a group or pass by others. This social skill shows respect for others.',
  why_it_matters = 'Learning to excuse oneself teaches children to be aware of others and navigate social situations with grace and consideration.'
WHERE name = 'Excusing Self';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a puzzle showing the parts of a fish. By removing and replacing pieces, they learn vocabulary like fins, gills, and scales.',
  why_it_matters = 'Fish puzzle work teaches scientific vocabulary while developing fine motor skills. Children learn that different animals have different adaptations.'
WHERE name = 'Fish Puzzle';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about the five groups of animals with backbones: fish, amphibians, reptiles, birds, and mammals. Classification helps organize knowledge about the animal kingdom.',
  why_it_matters = 'Understanding vertebrate classification provides a framework for learning about animals. Children begin to see patterns and relationships in the natural world.'
WHERE name = 'Five Vertebrate Classes';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is discovering the flags of countries around the world, learning to recognize them and connect them to places on the map.',
  why_it_matters = 'Flags are cultural symbols that help children develop international awareness and curiosity about the diverse peoples of our world.'
WHERE name = 'Flags';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a puzzle showing the parts of a flower. By removing and replacing pieces, they learn vocabulary like petals, stem, and pistil.',
  why_it_matters = 'Flower puzzle work teaches botanical vocabulary while developing fine motor skills. Children learn that plants have parts with specific functions.'
WHERE name = 'Flower Puzzle';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning complex folding patterns, creating intricate designs from paper. This precise work develops concentration and geometric thinking.',
  why_it_matters = 'Complex folding develops spatial reasoning and precision while building persistence. Children learn that careful steps lead to beautiful results.'
WHERE name = 'Folding - Complex';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning basic paper folding techniques - halves, quarters, and simple shapes. This foundational work develops precision and prepares for more complex folding.',
  why_it_matters = 'Simple folding teaches children to follow sequences, work precisely, and develop the hand control needed for writing and crafts.'
WHERE name = 'Folding - Simple';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about exchanging in our number system - how 10 units become 1 ten, 10 tens become 1 hundred. This fundamental concept underlies all arithmetic.',
  why_it_matters = 'Understanding exchange is essential for addition, subtraction, and all operations. Children see why we "carry" and "borrow" in arithmetic.'
WHERE name = 'Formation of Numbers - Exchange';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a puzzle showing the parts and life cycle of a frog. This work teaches scientific vocabulary and the concept of metamorphosis.',
  why_it_matters = 'Frog puzzles introduce amphibian anatomy and the fascinating process of metamorphosis from tadpole to adult frog.'
WHERE name = 'Frog Puzzle';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring circles of different sizes in the Geometric Cabinet. By tracing and matching, they develop understanding of this fundamental shape.',
  why_it_matters = 'Work with circles develops visual discrimination and prepares children for geometry, art, and recognizing circular forms everywhere.'
WHERE name = 'Geometric Cabinet - Circles Drawer';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring curved shapes like ellipses and ovals in the Geometric Cabinet. These shapes bridge circles and other forms.',
  why_it_matters = 'Curvilinear shapes develop visual discrimination and show children the variety of geometric forms in our world.'
WHERE name = 'Geometric Cabinet - Curvilinear Drawer';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring polygons - shapes with many sides - in the Geometric Cabinet. They learn vocabulary like pentagon, hexagon, and octagon.',
  why_it_matters = 'Polygon work builds geometric vocabulary and helps children see these shapes in architecture, nature, and design.'
WHERE name = 'Geometric Cabinet - Polygons Drawer';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring rectangles and squares in the Geometric Cabinet. By handling different sizes, they understand these fundamental shapes.',
  why_it_matters = 'Rectangle work develops visual discrimination and helps children recognize these common shapes in their environment.'
WHERE name = 'Geometric Cabinet - Rectangles Drawer';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring different types of triangles in the Geometric Cabinet. They learn that triangles can be different sizes and shapes while sharing three sides.',
  why_it_matters = 'Triangle work develops geometric understanding and prepares children for later geometry while building visual discrimination.'
WHERE name = 'Geometric Cabinet - Triangles Drawer';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to associate golden bead quantities with their number cards. They match unit beads, ten bars, hundred squares, and thousand cubes with corresponding numerals.',
  why_it_matters = 'Association work connects concrete quantities with abstract symbols, building the essential understanding that numbers represent real amounts.'
WHERE name = 'Golden Bead Association';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring golden beads - single unit beads, ten-bars, hundred-squares, and thousand-cubes. This hands-on material makes the decimal system tangible and real.',
  why_it_matters = 'Golden Bead work provides the concrete foundation for understanding place value. Children can see and feel that 10 units make a ten, 10 tens make a hundred.'
WHERE name = 'Golden Bead Quantity';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is reading simple books featuring long vowel sounds and common word patterns. These phonetic readers build fluency and confidence.',
  why_it_matters = 'Green series books provide practice with more complex phonetic patterns, building reading stamina and confidence.'
WHERE name = 'Green Series - Books';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning long vowel sounds - when vowels say their names (like the "a" in cake). This expands their decoding ability significantly.',
  why_it_matters = 'Long vowels unlock thousands of English words. Understanding silent-e and vowel team patterns is essential for reading fluency.'
WHERE name = 'Green Series - Long Vowels';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to comb hair - their own or a doll''s. This practical self-care skill develops fine motor control and personal grooming habits.',
  why_it_matters = 'Hair combing develops self-care independence and fine motor skills while teaching children to take pride in their appearance.'
WHERE name = 'Hair Combing';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a puzzle showing the parts of a horse. By removing and replacing pieces, they learn vocabulary about mammal anatomy.',
  why_it_matters = 'Horse puzzle work teaches scientific vocabulary while developing fine motor skills and interest in animals.'
WHERE name = 'Horse Puzzle';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is playing sound games to identify beginning sounds in words. "I spy something that begins with mmm..." This develops phonemic awareness.',
  why_it_matters = 'I Spy games develop the crucial skill of hearing individual sounds in words - the foundation for reading and spelling.'
WHERE name = 'I Spy - Beginning Sounds';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is playing sound games to identify ending sounds in words. This extends phonemic awareness to the final position in words.',
  why_it_matters = 'Hearing ending sounds completes phonemic awareness and prepares children for spelling and decoding words.'
WHERE name = 'I Spy - Ending Sounds';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is playing sound games to identify middle sounds in words. This challenging skill completes phonemic awareness.',
  why_it_matters = 'Middle sounds are hardest to hear but essential for spelling. This work completes the foundation for literacy.'
WHERE name = 'I Spy - Middle Sounds';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to introduce others politely. This grace and courtesy skill teaches children to help people connect.',
  why_it_matters = 'Introduction skills build social confidence and teach children to facilitate connections between people.'
WHERE name = 'Introducing Others';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to introduce themselves politely - making eye contact, speaking clearly, and sharing their name.',
  why_it_matters = 'Self-introduction is a fundamental social skill that builds confidence and prepares children for many social situations.'
WHERE name = 'Introducing Self';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Knobbed Cylinders, fitting cylinders into matching holes. Block 2 varies in both diameter and height.',
  why_it_matters = 'Knobbed Cylinders develop visual discrimination and fine motor control while teaching children to observe subtle differences.'
WHERE name = 'Knobbed Cylinders Block 2';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Knobbed Cylinders, fitting cylinders into matching holes. Block 3 varies inversely - as height increases, diameter decreases.',
  why_it_matters = 'This challenging variation develops sophisticated visual discrimination and prepares children for understanding inverse relationships.'
WHERE name = 'Knobbed Cylinders Block 3';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Knobbed Cylinders, fitting cylinders into matching holes. Block 4 varies only in diameter.',
  why_it_matters = 'Working with diameter variations refines visual discrimination and prepares children for measuring and comparing sizes.'
WHERE name = 'Knobbed Cylinders Block 4';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is combining all four Knobbed Cylinder blocks, finding homes for 40 cylinders. This challenging work develops concentration and discrimination.',
  why_it_matters = 'Combined cylinder work requires sophisticated discrimination and sustained concentration, preparing children for complex academic tasks.'
WHERE name = 'Knobbed Cylinders Combined';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with large number cards showing 1-9000. By combining cards (laying smaller values on top of larger), they build multi-digit numbers.',
  why_it_matters = 'Large number cards show how our number system works - how 1000, 400, 30, and 5 combine to make 1,435. This builds place value understanding.'
WHERE name = 'Large Number Cards';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a puzzle showing the parts of a leaf. By removing and replacing pieces, they learn vocabulary about plant structures.',
  why_it_matters = 'Leaf puzzle work teaches botanical vocabulary while developing fine motor skills and interest in plants.'
WHERE name = 'Leaf Puzzle';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to identify and name different leaf shapes - oval, heart-shaped, palmate, and more. This develops observation skills and botanical vocabulary.',
  why_it_matters = 'Learning leaf shapes develops careful observation and helps children identify trees and plants in their environment.'
WHERE name = 'Leaf Shapes';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is studying life cycles of various organisms - butterflies, frogs, plants. They learn that living things change and grow through stages.',
  why_it_matters = 'Life cycle studies develop understanding of change, growth, and the interconnection of life stages. Children see that all living things have patterns of development.'
WHERE name = 'Life Cycle Studies';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is counting long chains of beads, learning to count into the hundreds and thousands. This meditative work builds number sense and concentration.',
  why_it_matters = 'Linear counting develops number sequence knowledge and concentration while making large numbers tangible and real.'
WHERE name = 'Linear Counting';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is sorting objects and pictures into living and non-living categories. This fundamental classification helps organize understanding of the world.',
  why_it_matters = 'Distinguishing living from non-living is a foundational scientific concept. Children learn that living things grow, need food, and reproduce.'
WHERE name = 'Living and Non-Living';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Long Bead Chains make cubing tangible. Your child counts and folds chains representing 2³, 3³, 4³ and beyond, seeing how numbers grow when cubed.',
  why_it_matters = 'Cubing becomes concrete when children physically fold chains into cubes. This builds intuitive understanding of volume and exponential growth.'
WHERE name = 'Long Bead Chains';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is sorting objects by whether they are attracted to magnets. This hands-on exploration introduces magnetic properties in a concrete way.',
  why_it_matters = 'Magnetic exploration teaches scientific classification while developing curiosity about physical properties of materials.'
WHERE name = 'Magnetic and Non-Magnetic';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to polish mirrors, developing careful circular movements and attention to results. This practical skill teaches thoroughness and care.',
  why_it_matters = 'Mirror polishing develops fine motor control and teaches children to observe results and work toward a standard of completion.'
WHERE name = 'Mirror Polishing';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is arranging bells in order from lowest to highest pitch, developing auditory discrimination and musical awareness.',
  why_it_matters = 'Grading bells develops the ear for musical pitch and prepares children for understanding musical scales and relationships.'
WHERE name = 'Montessori Bells - Grading';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is matching pairs of bells that make the same pitch, developing careful listening and pitch discrimination.',
  why_it_matters = 'Bell matching develops auditory discrimination and concentration while introducing children to the world of musical pitch.'
WHERE name = 'Montessori Bells - Matching';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning the months of the year in sequence and connecting them to seasons and events. This temporal awareness helps children understand longer time cycles.',
  why_it_matters = 'Understanding months gives children a framework for the year. They can anticipate holidays, seasons, and events.'
WHERE name = 'Months of the Year';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is building words by arranging letter tiles, sounding out words and choosing letters to represent each sound. This allows writing before the hand is ready for pencils.',
  why_it_matters = 'The Moveable Alphabet bridges knowing letter sounds and actual writing. Children compose words and stories before their hands can write them.'
WHERE name = 'Moveable Alphabet - CVC Words';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using the Moveable Alphabet to write freely - their own thoughts, stories, and ideas. This liberates writing from handwriting constraints.',
  why_it_matters = 'Free writing with the alphabet builds confidence and creativity. Children become authors before they master handwriting.'
WHERE name = 'Moveable Alphabet - Free Writing';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is being introduced to the Moveable Alphabet - learning how to select letters, arrange them, and build simple words.',
  why_it_matters = 'Introduction to the alphabet opens the door to writing. Children learn they can encode their thoughts using letter symbols.'
WHERE name = 'Moveable Alphabet - Introduction';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is spelling the names of objects using the Moveable Alphabet. Small objects provide concrete things to label with letters.',
  why_it_matters = 'Object labeling connects abstract spelling to concrete items, making word-building meaningful and memorable.'
WHERE name = 'Moveable Alphabet - Objects';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is spelling words shown in pictures using the Moveable Alphabet. Pictures provide visual prompts for word building.',
  why_it_matters = 'Picture spelling develops encoding skills while building vocabulary and connecting images to written words.'
WHERE name = 'Moveable Alphabet - Pictures';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about nouns - the words that name people, places, and things. Using objects and symbols, they discover this fundamental part of speech.',
  why_it_matters = 'Understanding nouns is the foundation of grammar. Children begin to see language as organized and logical, not arbitrary.'
WHERE name = 'Noun Introduction';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using number rods to discover addition. By combining rods, they see that 3 + 2 = 5 in a concrete, visual way.',
  why_it_matters = 'Rod addition makes the concept tangible. Children see quantities combining and understand what addition means before working with symbols.'
WHERE name = 'Number Rods Addition';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is matching number rods with their corresponding numeral cards. This connects quantities with symbols.',
  why_it_matters = 'Association work builds the crucial link between concrete quantities and abstract numerals, making numbers meaningful.'
WHERE name = 'Number Rods and Cards';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is extending their number rod work, exploring additional relationships and patterns with these colored rods.',
  why_it_matters = 'Extension work deepens understanding of number relationships and builds fluency with quantity concepts.'
WHERE name = 'Number Rods Extension 1';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is using number rods to discover subtraction. By finding the difference between rods, they understand what subtraction means.',
  why_it_matters = 'Rod subtraction makes taking away concrete and visual. Children understand subtraction as finding differences before working abstractly.'
WHERE name = 'Number Rods Subtraction';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to offer help to others graciously. This grace and courtesy skill teaches children to be aware of others'' needs.',
  why_it_matters = 'Offering help builds empathy and community. Children learn to notice when others need assistance and respond kindly.'
WHERE name = 'Offering Help';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is playing language games that develop vocabulary, grammar, and oral expression. These games make language learning playful and engaging.',
  why_it_matters = 'Oral language games build the foundation for literacy. Strong verbal skills prepare children for reading and writing.'
WHERE name = 'Oral Language Games';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is writing on lined paper, applying the handwriting skills developed through sandpaper letters and metal insets.',
  why_it_matters = 'Paper writing is the culmination of handwriting preparation. Children apply their skills to produce real written work.'
WHERE name = 'Paper Writing';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning the parts of a tree - roots, trunk, branches, leaves. This develops botanical vocabulary and understanding of plant structures.',
  why_it_matters = 'Understanding tree parts helps children see trees as living systems with structures that serve specific functions.'
WHERE name = 'Parts of a Tree';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is reading simple books with three-letter short vowel words (CVC words). These first phonetic readers build reading confidence.',
  why_it_matters = 'Pink series books provide successful reading experiences. Children feel the joy of reading real books independently.'
WHERE name = 'Pink Series - Books';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is reading and writing lists of three-letter words, building fluency with CVC patterns.',
  why_it_matters = 'List work builds reading speed and confidence while reinforcing phonetic patterns through repetition.'
WHERE name = 'Pink Series - Lists';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is reading simple phrases combining words they know. This bridges single words and sentence reading.',
  why_it_matters = 'Phrase reading develops fluency and shows children that words combine to express ideas.'
WHERE name = 'Pink Series - Phrases';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is matching picture cards with word cards, connecting images with their written names.',
  why_it_matters = 'Picture-word matching builds sight vocabulary while reinforcing phonetic decoding in meaningful context.'
WHERE name = 'Pink Series - Picture Word Match';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is reading simple sentences using words they know. This exciting step shows that reading communicates complete ideas.',
  why_it_matters = 'Sentence reading is when reading becomes real communication. Children experience the purpose and joy of literacy.'
WHERE name = 'Pink Series - Sentences';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is sorting objects and pictures into plant and animal categories. This fundamental classification organizes understanding of living things.',
  why_it_matters = 'Plant/animal sorting teaches basic biological classification. Children learn that living things belong to different kingdoms with different characteristics.'
WHERE name = 'Plant and Animal Sorting';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is dusting plant leaves, caring for living things while developing gentle handling skills.',
  why_it_matters = 'Plant care develops responsibility and teaches that living things need care. Children learn gentleness and attention to detail.'
WHERE name = 'Plant Care - Dusting Leaves';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is watering plants, learning about plant needs while taking responsibility for living things.',
  why_it_matters = 'Watering teaches cause and effect, responsibility, and care for living things. Children see the results of their care.'
WHERE name = 'Plant Care - Watering';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is planting seeds and caring for growing plants. This hands-on work teaches life cycles and responsibility.',
  why_it_matters = 'Planting connects children to nature''s cycles. They experience the wonder of growth and learn patience and care.'
WHERE name = 'Planting Activities';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to push in their chair after standing. This simple courtesy maintains order and safety in the classroom.',
  why_it_matters = 'Pushing in chairs teaches children to be aware of shared spaces and consider others who walk through the classroom.'
WHERE name = 'Pushing in Chair';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to put on their coat independently - an important self-care skill that builds confidence and practical independence.',
  why_it_matters = 'Dressing independence is fundamental to self-care. Children feel capable and proud when they can manage their own clothing.'
WHERE name = 'Putting on Coat';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is feeling boards that alternate smooth and rough textures, developing tactile sensitivity and vocabulary.',
  why_it_matters = 'Rough and smooth boards refine the sense of touch and build vocabulary for describing textures in the environment.'
WHERE name = 'Rough and Smooth Boards';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is grading tablets from roughest to smoothest, developing fine discrimination of texture differences.',
  why_it_matters = 'Gradation work develops sophisticated tactile discrimination. Children learn to perceive subtle differences through focused attention.'
WHERE name = 'Rough Gradation Tablets';

COMMIT;

-- Verification query
SELECT COUNT(*) as total,
       COUNT(parent_description) as with_parent,
       COUNT(why_it_matters) as with_why
FROM montree_classroom_curriculum_works;
