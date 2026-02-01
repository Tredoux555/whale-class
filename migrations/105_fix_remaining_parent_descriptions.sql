-- Migration: Fix remaining parent descriptions with flexible work name matching
-- This migration updates parent descriptions in the works table using ILIKE matching
-- with wildcard patterns to handle naming variations
-- Total works to update: 306

BEGIN;

UPDATE works 
SET parent_description = 'Comprehensive guide for Addition Charts (Finger Charts)'
WHERE name ILIKE '%addition%charts%finger%charts%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Addition Snake Game'
WHERE name ILIKE '%addition%snake%game%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Addition Strip Board'
WHERE name ILIKE '%addition%strip%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Animal Care'
WHERE name ILIKE '%animal%care%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Animal Habitats'
WHERE name ILIKE '%animal%habitats%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Animal Life Cycles'
WHERE name ILIKE '%animal%life%cycles%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Animals of the Continents'
WHERE name ILIKE '%animals%continents%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Apologizing'
WHERE name ILIKE '%apologizing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Art Appreciation'
WHERE name ILIKE '%art%appreciation%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Asking for Help Politely'
WHERE name ILIKE '%asking%help%politely%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Association of Quantity and Symbol'
WHERE name ILIKE '%association%quantity%symbol%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Baric Tablets'
WHERE name ILIKE '%baric%tablets%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Basting (Turkey Baster)'
WHERE name ILIKE '%basting%turkey%baster%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Bathing'
WHERE name ILIKE '%bathing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Bead Cabinet'
WHERE name ILIKE '%bead%cabinet%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Binomial Cube'
WHERE name ILIKE '%binomial%cube%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Birthday Celebration'
WHERE name ILIKE '%birthday%celebration%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Blue Series (Blends)'
WHERE name ILIKE '%blue%series%blends%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Botany Experiments'
WHERE name ILIKE '%botany%experiments%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Bow Tying Frame'
WHERE name ILIKE '%bow%tying%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Braiding Frame'
WHERE name ILIKE '%braiding%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Brown Stair (Broad Stair)'
WHERE name ILIKE '%brown%stair%broad%stair%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Buckles Frame'
WHERE name ILIKE '%buckles%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Calendar Work'
WHERE name ILIKE '%calendar%work%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cards and Counters'
WHERE name ILIKE '%cards%counters%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Care of Living Things'
WHERE name ILIKE '%care%living%things%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Carrying a Chair'
WHERE name ILIKE '%carrying%chair%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Carrying a Mat'
WHERE name ILIKE '%carrying%mat%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Carrying a Table'
WHERE name ILIKE '%carrying%table%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Carrying a Tray'
WHERE name ILIKE '%carrying%tray%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Chalkboard Writing'
WHERE name ILIKE '%chalkboard%writing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Checkerboard (Multiplication)'
WHERE name ILIKE '%checkerboard%multiplication%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Chopsticks Transfer'
WHERE name ILIKE '%chopsticks%transfer%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Classified Cards (Nomenclature Cards)'
WHERE name ILIKE '%classified%cards%nomenclature%cards%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Clay and Playdough'
WHERE name ILIKE '%clay%playdough%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Clock Work'
WHERE name ILIKE '%clock%work%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cloth Washing'
WHERE name ILIKE '%cloth%washing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Collage'
WHERE name ILIKE '%collage%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Color Box 1 (Primary Colors)'
WHERE name ILIKE '%color%box%primary%colors%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Color Box 2 (Secondary Colors)'
WHERE name ILIKE '%color%box%secondary%colors%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Color Box 3 (Color Gradations)'
WHERE name ILIKE '%color%box%color%gradations%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Color Mixing'
WHERE name ILIKE '%color%mixing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Colored Bead Stair'
WHERE name ILIKE '%colored%bead%stair%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Command Cards (Action Reading)'
WHERE name ILIKE '%command%cards%action%reading%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Compound Words'
WHERE name ILIKE '%compound%words%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Constructive Triangles - Blue Triangles'
WHERE name ILIKE '%constructive%triangles%blue%triangles%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Constructive Triangles - Large Hexagonal Box'
WHERE name ILIKE '%constructive%triangles%large%hexagonal%box%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Constructive Triangles - Rectangular Box'
WHERE name ILIKE '%constructive%triangles%rectangular%box%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Constructive Triangles - Small Hexagonal Box'
WHERE name ILIKE '%constructive%triangles%small%hexagonal%box%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Constructive Triangles - Triangular Box'
WHERE name ILIKE '%constructive%triangles%triangular%box%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Conversation and Discussion'
WHERE name ILIKE '%conversation%discussion%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cosmic Education and the Great Lessons'
WHERE name ILIKE '%cosmic%education%great%lessons%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Covering Coughs and Sneezes'
WHERE name ILIKE '%covering%coughs%sneezes%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cracking Eggs'
WHERE name ILIKE '%cracking%eggs%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Creative Writing'
WHERE name ILIKE '%creative%writing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cross Stitch'
WHERE name ILIKE '%cross%stitch%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cutting Harder Foods'
WHERE name ILIKE '%cutting%harder%foods%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cutting Soft Foods'
WHERE name ILIKE '%cutting%soft%foods%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cutting/Slicing'
WHERE name ILIKE '%cutting/slicing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cylinder Block 1'
WHERE name ILIKE '%cylinder%block%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cylinder Block 2'
WHERE name ILIKE '%cylinder%block%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cylinder Block 3'
WHERE name ILIKE '%cylinder%block%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cylinder Block 4'
WHERE name ILIKE '%cylinder%block%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Cylinder Blocks Combined'
WHERE name ILIKE '%cylinder%blocks%combined%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Dish Washing'
WHERE name ILIKE '%dish%washing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Division Board'
WHERE name ILIKE '%division%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Division Charts'
WHERE name ILIKE '%division%charts%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Dot Game'
WHERE name ILIKE '%dot%game%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Drawing'
WHERE name ILIKE '%drawing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Dressing Oneself'
WHERE name ILIKE '%dressing%oneself%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Dry Pouring'
WHERE name ILIKE '%dry%pouring%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Dry Transfer - Hands'
WHERE name ILIKE '%dry%transfer%hands%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Dusting'
WHERE name ILIKE '%dusting%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Equivalence Exercises with Golden Beads'
WHERE name ILIKE '%equivalence%exercises%golden%beads%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Exchange Game (Change Game)'
WHERE name ILIKE '%exchange%game%change%game%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Eye Dropper'
WHERE name ILIKE '%eye%dropper%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Eye Dropper Transfer'
WHERE name ILIKE '%eye%dropper%transfer%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Fabric Matching'
WHERE name ILIKE '%fabric%matching%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Face Washing'
WHERE name ILIKE '%face%washing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Five Classes of Vertebrates'
WHERE name ILIKE '%five%classes%vertebrates%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Flags of the World'
WHERE name ILIKE '%flags%world%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Flower Arranging'
WHERE name ILIKE '%flower%arranging%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Flowers and Pollination'
WHERE name ILIKE '%flowers%pollination%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Folding Cloths'
WHERE name ILIKE '%folding%cloths%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Folding Laundry'
WHERE name ILIKE '%folding%laundry%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Formation of Quantity'
WHERE name ILIKE '%formation%quantity%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Formation of Symbol'
WHERE name ILIKE '%formation%symbol%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Fraction Addition'
WHERE name ILIKE '%fraction%addition%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Fraction Division'
WHERE name ILIKE '%fraction%division%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Fraction Insets (Metal or Plastic)'
WHERE name ILIKE '%fraction%insets%metal%plastic%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Fraction Multiplication'
WHERE name ILIKE '%fraction%multiplication%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Fraction Skittles'
WHERE name ILIKE '%fraction%skittles%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Fraction Subtraction'
WHERE name ILIKE '%fraction%subtraction%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Fundamental Needs of Humans'
WHERE name ILIKE '%fundamental%needs%humans%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Geometric Cabinet'
WHERE name ILIKE '%geometric%cabinet%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Geometric Solids'
WHERE name ILIKE '%geometric%solids%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Geometry Nomenclature'
WHERE name ILIKE '%geometry%nomenclature%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Geometry Sticks'
WHERE name ILIKE '%geometry%sticks%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Glass Polishing'
WHERE name ILIKE '%glass%polishing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Globe - Continents'
WHERE name ILIKE '%globe%continents%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Globe - Land and Water'
WHERE name ILIKE '%globe%land%water%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Golden Bead Addition'
WHERE name ILIKE '%golden%bead%addition%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Golden Bead Division'
WHERE name ILIKE '%golden%bead%division%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Golden Bead Multiplication'
WHERE name ILIKE '%golden%bead%multiplication%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Golden Bead Subtraction'
WHERE name ILIKE '%golden%bead%subtraction%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Golden Bead Tray Exercises'
WHERE name ILIKE '%golden%bead%tray%exercises%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Golden Beads: Operations Overview'
WHERE name ILIKE '%golden%beads:%operations%overview%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Grammar Boxes'
WHERE name ILIKE '%grammar%boxes%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Grating'
WHERE name ILIKE '%grating%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Green Series (Phonograms)'
WHERE name ILIKE '%green%series%phonograms%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Greeting'
WHERE name ILIKE '%greeting%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Greetings'
WHERE name ILIKE '%greetings%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Hair Brushing'
WHERE name ILIKE '%hair%brushing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Hair Brushing/Combing'
WHERE name ILIKE '%hair%brushing/combing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Hair Washing'
WHERE name ILIKE '%hair%washing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Hand Washing'
WHERE name ILIKE '%hand%washing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Handwriting on Paper'
WHERE name ILIKE '%handwriting%paper%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Homonyms'
WHERE name ILIKE '%homonyms%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Hook and Eye Frame'
WHERE name ILIKE '%hook%eye%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for How to Interrupt'
WHERE name ILIKE '%how%interrupt%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Hundred Board'
WHERE name ILIKE '%hundred%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Hundred Chain'
WHERE name ILIKE '%hundred%chain%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Hundred and Thousand Cube Understanding'
WHERE name ILIKE '%hundred%thousand%cube%understanding%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Insects and Their Parts'
WHERE name ILIKE '%insects%their%parts%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Interpretive Reading'
WHERE name ILIKE '%interpretive%reading%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Interrupting'
WHERE name ILIKE '%interrupting%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to Area'
WHERE name ILIKE '%introduction%area%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to Golden Beads'
WHERE name ILIKE '%introduction%golden%beads%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to the Adjective'
WHERE name ILIKE '%introduction%adjective%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to the Adverb'
WHERE name ILIKE '%introduction%adverb%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to the Article'
WHERE name ILIKE '%introduction%article%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to the Conjunction'
WHERE name ILIKE '%introduction%conjunction%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to the Interjection'
WHERE name ILIKE '%introduction%interjection%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to the Noun'
WHERE name ILIKE '%introduction%noun%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to the Preposition'
WHERE name ILIKE '%introduction%preposition%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to the Pronoun'
WHERE name ILIKE '%introduction%pronoun%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introduction to the Verb'
WHERE name ILIKE '%introduction%verb%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Introductions'
WHERE name ILIKE '%introductions%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Juicing'
WHERE name ILIKE '%juicing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Knobless Cylinders'
WHERE name ILIKE '%knobless%cylinders%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Lacing Frame'
WHERE name ILIKE '%lacing%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Land and Water Forms'
WHERE name ILIKE '%land%water%forms%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Large Bead Frame'
WHERE name ILIKE '%large%bead%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Large Buttons Frame'
WHERE name ILIKE '%large%buttons%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Large Numeral Cards'
WHERE name ILIKE '%large%numeral%cards%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Laundry'
WHERE name ILIKE '%laundry%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Laundry - Hand Washing'
WHERE name ILIKE '%laundry%hand%washing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Living vs Non-Living'
WHERE name ILIKE '%living%vs%non%living%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Long Bead Chains (Cubes)'
WHERE name ILIKE '%long%bead%chains%cubes%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Magnetic/Non-Magnetic'
WHERE name ILIKE '%magnetic/non%magnetic%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Making a Snack'
WHERE name ILIKE '%making%snack%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Meal Preparation and Serving'
WHERE name ILIKE '%meal%preparation%serving%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Memory Game of Numbers'
WHERE name ILIKE '%memory%game%numbers%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Metal Insets'
WHERE name ILIKE '%metal%insets%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Metal Polishing'
WHERE name ILIKE '%metal%polishing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Money Work'
WHERE name ILIKE '%money%work%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Montessori Bells'
WHERE name ILIKE '%montessori%bells%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Mopping'
WHERE name ILIKE '%mopping%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Moveable Alphabet'
WHERE name ILIKE '%moveable%alphabet%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Movement to Music'
WHERE name ILIKE '%movement%music%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Multiplication Bead Board'
WHERE name ILIKE '%multiplication%bead%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Multiplication Charts'
WHERE name ILIKE '%multiplication%charts%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Music Appreciation'
WHERE name ILIKE '%music%appreciation%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Mystery Bag'
WHERE name ILIKE '%mystery%bag%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Nature Study'
WHERE name ILIKE '%nature%study%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Nose Blowing'
WHERE name ILIKE '%nose%blowing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Number Puzzles and Games'
WHERE name ILIKE '%number%puzzles%games%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Number Rods'
WHERE name ILIKE '%number%rods%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Number Rods with Numerals'
WHERE name ILIKE '%number%rods%numerals%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Object Boxes (Pink/Blue/Green)'
WHERE name ILIKE '%object%boxes%pink/blue/green%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Object to Picture Matching'
WHERE name ILIKE '%object%picture%matching%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Observing Another''s Work'
WHERE name ILIKE '%observing%another's%work%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Offering and Accepting Help'
WHERE name ILIKE '%offering%accepting%help%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Opening and Closing a Book'
WHERE name ILIKE '%opening%closing%book%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Opening and Closing a Door'
WHERE name ILIKE '%opening%closing%door%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Painting'
WHERE name ILIKE '%painting%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Paper Punching'
WHERE name ILIKE '%paper%punching%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Bird'
WHERE name ILIKE '%parts%bird%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Fish'
WHERE name ILIKE '%parts%fish%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Flower'
WHERE name ILIKE '%parts%flower%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Frog'
WHERE name ILIKE '%parts%frog%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Horse'
WHERE name ILIKE '%parts%horse%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Leaf'
WHERE name ILIKE '%parts%leaf%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Plant'
WHERE name ILIKE '%parts%plant%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Root'
WHERE name ILIKE '%parts%root%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Seed'
WHERE name ILIKE '%parts%seed%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Parts of a Turtle'
WHERE name ILIKE '%parts%turtle%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Passage to Abstraction'
WHERE name ILIKE '%passage%abstraction%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Peeling'
WHERE name ILIKE '%peeling%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Peeling - Easy Items'
WHERE name ILIKE '%peeling%easy%items%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Peeling - With Peeler'
WHERE name ILIKE '%peeling%peeler%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Personal Timeline'
WHERE name ILIKE '%personal%timeline%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Phonogram Introduction'
WHERE name ILIKE '%phonogram%introduction%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Pink Series (CVC Words)'
WHERE name ILIKE '%pink%series%cvc%words%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Pink Tower'
WHERE name ILIKE '%pink%tower%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Plant Care'
WHERE name ILIKE '%plant%care%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Plant Life Cycle'
WHERE name ILIKE '%plant%life%cycle%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Plant vs Animal'
WHERE name ILIKE '%plant%vs%animal%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Please and Thank You'
WHERE name ILIKE '%please%thank%you%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Poems, Songs, and Fingerplays'
WHERE name ILIKE '%poems%songs%fingerplays%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Polishing Metal'
WHERE name ILIKE '%polishing%metal%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Polishing Wood'
WHERE name ILIKE '%polishing%wood%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Pouring Dry Materials'
WHERE name ILIKE '%pouring%dry%materials%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Pouring Water'
WHERE name ILIKE '%pouring%water%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Prefixes and Suffixes'
WHERE name ILIKE '%prefixes%suffixes%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Printmaking'
WHERE name ILIKE '%printmaking%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Puzzle Map - World'
WHERE name ILIKE '%puzzle%map%world%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Puzzle Maps - Individual Continents'
WHERE name ILIKE '%puzzle%maps%individual%continents%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Puzzle Words (Sight Words)'
WHERE name ILIKE '%puzzle%words%sight%words%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Racks and Tubes (Long Division)'
WHERE name ILIKE '%racks%tubes%long%division%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Reading Analysis'
WHERE name ILIKE '%reading%analysis%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Reading Classification'
WHERE name ILIKE '%reading%classification%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Red Rods (Long Rods)'
WHERE name ILIKE '%red%rods%long%rods%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Rhyming Activities'
WHERE name ILIKE '%rhyming%activities%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Rhythm Instruments'
WHERE name ILIKE '%rhythm%instruments%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Rocks and Minerals'
WHERE name ILIKE '%rocks%minerals%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Rolling and Unrolling a Mat'
WHERE name ILIKE '%rolling%unrolling%mat%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Running Stitch'
WHERE name ILIKE '%running%stitch%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Safety Pins Frame'
WHERE name ILIKE '%safety%pins%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sand Tray Writing'
WHERE name ILIKE '%sand%tray%writing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sandpaper Letters'
WHERE name ILIKE '%sandpaper%letters%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sandpaper Numerals'
WHERE name ILIKE '%sandpaper%numerals%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Saying Excuse Me'
WHERE name ILIKE '%saying%excuse%me%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Saying Thank You and Please'
WHERE name ILIKE '%saying%thank%you%please%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Scrubbing a Table'
WHERE name ILIKE '%scrubbing%table%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Self-Dressing'
WHERE name ILIKE '%self%dressing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Senses of Animals'
WHERE name ILIKE '%senses%animals%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sentence Analysis'
WHERE name ILIKE '%sentence%analysis%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Setting a Table'
WHERE name ILIKE '%setting%table%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Setting the Table'
WHERE name ILIKE '%setting%table%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sewing Cards'
WHERE name ILIKE '%sewing%cards%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sewing a Button'
WHERE name ILIKE '%sewing%button%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sharing and Taking Turns'
WHERE name ILIKE '%sharing%taking%turns%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Shoe Polishing'
WHERE name ILIKE '%shoe%polishing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Short Bead Chains (Squares)'
WHERE name ILIKE '%short%bead%chains%squares%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Short Bead Stair'
WHERE name ILIKE '%short%bead%stair%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Silent Reading'
WHERE name ILIKE '%silent%reading%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Simple Machines'
WHERE name ILIKE '%simple%machines%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Singing'
WHERE name ILIKE '%singing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sink and Float'
WHERE name ILIKE '%sink%float%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sitting and Standing at a Table'
WHERE name ILIKE '%sitting%standing%table%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Skip Counting'
WHERE name ILIKE '%skip%counting%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Small Bead Frame'
WHERE name ILIKE '%small%bead%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Small Buttons Frame'
WHERE name ILIKE '%small%buttons%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Smelling Bottles'
WHERE name ILIKE '%smelling%bottles%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Snaps Frame'
WHERE name ILIKE '%snaps%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Solar System'
WHERE name ILIKE '%solar%system%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sorting Grains'
WHERE name ILIKE '%sorting%grains%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sorting Objects Stereognostically'
WHERE name ILIKE '%sorting%objects%stereognostically%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sound Boxes (Sound Cylinders)'
WHERE name ILIKE '%sound%boxes%sound%cylinders%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sound Games (I Spy)'
WHERE name ILIKE '%sound%games%spy%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Spelling Rules'
WHERE name ILIKE '%spelling%rules%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Spindle Boxes'
WHERE name ILIKE '%spindle%boxes%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sponging'
WHERE name ILIKE '%sponging%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Spooning'
WHERE name ILIKE '%spooning%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Spreading'
WHERE name ILIKE '%spreading%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Stamp Game'
WHERE name ILIKE '%stamp%game%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for States of Matter'
WHERE name ILIKE '%states%matter%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Storytelling and Sequencing'
WHERE name ILIKE '%storytelling%sequencing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Subtraction Charts'
WHERE name ILIKE '%subtraction%charts%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Subtraction Snake Game'
WHERE name ILIKE '%subtraction%snake%game%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Subtraction Strip Board'
WHERE name ILIKE '%subtraction%strip%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Superimposed Geometric Figures'
WHERE name ILIKE '%superimposed%geometric%figures%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Sweeping'
WHERE name ILIKE '%sweeping%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Synonyms and Antonyms'
WHERE name ILIKE '%synonyms%antonyms%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Table Manners'
WHERE name ILIKE '%table%manners%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Table Scrubbing'
WHERE name ILIKE '%table%scrubbing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Tasting Bottles/Cups'
WHERE name ILIKE '%tasting%bottles/cups%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Teen Board 1 (Seguin Board A)'
WHERE name ILIKE '%teen%board%seguin%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Teen Board 2 (Seguin Board B)'
WHERE name ILIKE '%teen%board%seguin%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Teen Board and Tens Board (Seguin Boards)'
WHERE name ILIKE '%teen%board%tens%board%seguin%boards%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Teeth Brushing'
WHERE name ILIKE '%teeth%brushing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Ten Board 1 (Seguin Board C)'
WHERE name ILIKE '%ten%board%seguin%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Ten Board 2 (Seguin Board D)'
WHERE name ILIKE '%ten%board%seguin%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for The Silence Game'
WHERE name ILIKE '%silence%game%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Thermic Bottles'
WHERE name ILIKE '%thermic%bottles%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Thermic Tablets'
WHERE name ILIKE '%thermic%tablets%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Thousand Chain'
WHERE name ILIKE '%thousand%chain%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Threading Beads'
WHERE name ILIKE '%threading%beads%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Threading a Needle'
WHERE name ILIKE '%threading%needle%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Timeline of Life'
WHERE name ILIKE '%timeline%life%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Tonging'
WHERE name ILIKE '%tonging%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Touch Boards'
WHERE name ILIKE '%touch%boards%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Touch Tablets (Rough and Smooth)'
WHERE name ILIKE '%touch%tablets%rough%smooth%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Trees and Leaves'
WHERE name ILIKE '%trees%leaves%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Trinomial Cube'
WHERE name ILIKE '%trinomial%cube%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Turning Pages of a Book'
WHERE name ILIKE '%turning%pages%book%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Tweezers Transfer'
WHERE name ILIKE '%tweezers%transfer%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Undressing'
WHERE name ILIKE '%undressing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Unit Division Board'
WHERE name ILIKE '%unit%division%board%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Velcro Frame'
WHERE name ILIKE '%velcro%frame%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Vertebrate vs Invertebrate'
WHERE name ILIKE '%vertebrate%vs%invertebrate%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Vocabulary Enrichment'
WHERE name ILIKE '%vocabulary%enrichment%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Walking Around Mats'
WHERE name ILIKE '%walking%around%mats%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Walking Around Someone''s Work'
WHERE name ILIKE '%walking%around%someone's%work%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Walking on the Line'
WHERE name ILIKE '%walking%line%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Washing Fruits and Vegetables'
WHERE name ILIKE '%washing%fruits%vegetables%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Water Cycle'
WHERE name ILIKE '%water%cycle%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Water Pouring'
WHERE name ILIKE '%water%pouring%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Weather Study'
WHERE name ILIKE '%weather%study%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Weather and Seasons'
WHERE name ILIKE '%weather%seasons%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Weaving'
WHERE name ILIKE '%weaving%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Window Washing'
WHERE name ILIKE '%window%washing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Wood Polishing'
WHERE name ILIKE '%wood%polishing%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Word Families'
WHERE name ILIKE '%word%families%'
  AND parent_description IS NULL;

UPDATE works 
SET parent_description = 'Comprehensive guide for Zipper Frame'
WHERE name ILIKE '%zipper%frame%'
  AND parent_description IS NULL;

COMMIT;

-- Summary: Updated work descriptions for 306 unique work names
-- Pattern matching allows for variations in naming conventions between comprehensive guides and database entries
-- Each pattern matches works containing the key words from the comprehensive guide names
