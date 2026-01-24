// lib/montree/reports/work-definitions.ts
// Rich, parent-friendly definitions for Montessori works
// Session 59 - REAL explanations, not generic copy-paste
//
// Each definition answers: What is my child doing? Why does it matter? What will I see at home?

export interface WorkDefinition {
  developmental_note: string;
  home_extension: string;
}

// Fallback for works not in our definitions
const AREA_FALLBACKS: Record<string, WorkDefinition> = {
  practical_life: {
    developmental_note: "Practical Life activities build the foundation for all learning: concentration, coordination, independence, and a sense of order. Your child is developing real skills for real life.",
    home_extension: "Invite your child to help with everyday tasks at home - they're ready and eager to contribute!",
  },
  sensorial: {
    developmental_note: "Sensorial work trains your child's senses to notice details and differences - skills they'll use for reading, math, and scientific observation.",
    home_extension: "Play sorting and matching games at home - by color, size, texture, or sound.",
  },
  language: {
    developmental_note: "Language activities develop your child's ability to hear sounds in words, recognize letters, and express their thoughts in writing and reading.",
    home_extension: "Read together daily, point out letters on signs, and play 'I Spy' with beginning sounds.",
  },
  mathematics: {
    developmental_note: "Math materials let your child touch and feel numbers before working with symbols. They're building deep understanding, not just memorizing facts.",
    home_extension: "Count everything! Steps, toys, snacks. Use real objects to make numbers meaningful.",
  },
  cultural: {
    developmental_note: "Cultural studies expand your child's understanding of the world - geography, science, art, and music all come alive through hands-on exploration.",
    home_extension: "Explore nature together, look at maps, or cook food from different cultures.",
  },
};

// ============================================
// PRACTICAL LIFE DEFINITIONS
// ============================================

const PRACTICAL_LIFE_DEFINITIONS: Record<string, WorkDefinition> = {
  // ----- TRANSFER ACTIVITIES -----
  pl_spooning: {
    developmental_note: "Your child is spooning beans from one bowl to another. They're learning to move left to right (the same direction they'll read and write), developing control over their hand movements, and mastering the same motion they'll use to feed themselves. Every careful scoop builds concentration and the confidence that comes from 'I can do this myself.'",
    home_extension: "Let your child serve themselves at meals using a spoon - rice, vegetables, anything scoopable!",
  },
  pl_pouring_dry: {
    developmental_note: "Your child is pouring rice or beans from one pitcher to another. They're strengthening their wrist for writing, learning to control movement with precision, and practicing the exact skill they'll use to pour their own cereal. Independence starts with 'I can pour it myself.'",
    home_extension: "Let your child pour their own dry cereal at breakfast. Start with a small pitcher they can handle easily.",
  },
  pl_pouring_water: {
    developmental_note: "Your child is pouring water from pitcher to pitcher. They're learning to judge how fast to tip, when to stop, and how to control flow - all while building the wrist strength needed for writing. When they pour their own drink at home without spilling, this is why.",
    home_extension: "Provide a small pitcher of water at meals and let your child pour their own drinks.",
  },
  pl_tonging: {
    developmental_note: "Your child is using tongs to move objects from one container to another. They're strengthening the same hand muscles they'll use to hold a pencil, building hand-eye coordination, and developing the focus to pick up one thing at a time. Those little hands are getting ready to write.",
    home_extension: "Use kitchen tongs to serve salad or let them pick up ice cubes with tongs for their drink.",
  },
  pl_tweezers: {
    developmental_note: "Your child is using tweezers to pick up small objects. This strengthens the exact three fingers (thumb, index, middle) that hold a pencil. Every tiny bead they pick up is preparing their hand for writing. Plus, the concentration required builds their ability to focus.",
    home_extension: "Try sorting small items like buttons or beads using tweezers - it's great fine motor practice.",
  },
  pl_dropper: {
    developmental_note: "Your child is squeezing a dropper to transfer water one drop at a time. This builds incredible finger strength and control - the same muscles used for writing. Watching them concentrate on just one drop at a time? That's focus training in action.",
    home_extension: "Water plants using a dropper, or do color mixing experiments with food coloring and water.",
  },
  pl_sponging: {
    developmental_note: "Your child is using a sponge to absorb and squeeze water between bowls. They're building hand strength, learning to control pressure, and mastering a skill they'll use to clean up their own spills. Self-sufficiency feels good!",
    home_extension: "Let your child clean up small spills with a sponge - they'll feel proud to handle it themselves.",
  },
  pl_basting: {
    developmental_note: "Your child is using a turkey baster to transfer water. They're learning the squeeze-release coordination that builds hand strength and control. It's also early science - watching cause and effect with every squeeze.",
    home_extension: "Use a baster during bath time to squirt water - it's the same skill in a fun setting.",
  },
  pl_dry_transfer_hand: {
    developmental_note: "Your child is moving objects by hand from one container to another. This seemingly simple activity builds hand-eye coordination, teaches left-to-right movement (preparation for reading), and develops the concentration to complete a task from start to finish.",
    home_extension: "Sort laundry together - socks in one pile, shirts in another. Same skill, real contribution!",
  },
  pl_chopsticks: {
    developmental_note: "Your child is learning to use chopsticks - a challenging skill that requires patience and precision. They're developing fine motor mastery while connecting to cultural traditions. This takes real persistence!",
    home_extension: "Try using chopsticks at home for fun - even picking up cotton balls or pompoms counts as practice.",
  },

  // ----- DRESSING FRAMES -----
  pl_frame_large_buttons: {
    developmental_note: "Your child is buttoning and unbuttoning large buttons. They're developing the finger coordination to dress themselves, building independence, and learning the sequence of steps needed to complete a task. Every button mastered is a step toward 'I can do it myself.'",
    home_extension: "Practice buttoning on their own clothes - start with large buttons on the front of shirts.",
  },
  pl_frame_small_buttons: {
    developmental_note: "Your child is working with smaller buttons now - more challenging! They're refining their fine motor control, building patience for detailed work, and developing the dexterity they'll need for writing and other precise tasks.",
    home_extension: "Look for opportunities to practice small buttons - doll clothes or dress-up costumes work great.",
  },
  pl_frame_zipper: {
    developmental_note: "Your child is learning to zip and unzip. They're mastering the coordination of aligning, holding, and pulling - three things at once! This builds problem-solving skills and the independence to manage their own jacket.",
    home_extension: "Let your child zip their own jacket before going outside - even if it takes extra time at first.",
  },
  pl_frame_snaps: {
    developmental_note: "Your child is snapping and unsnapping fasteners. They're building finger strength, learning the satisfying feeling of things clicking into place, and developing the ability to dress themselves. That 'snap!' sound is the sound of growing independence.",
    home_extension: "Find clothes with snaps for practice - pajamas often have snap closures.",
  },
  pl_frame_velcro: {
    developmental_note: "Your child is working with velcro fasteners. This is often a first dressing skill - building confidence that they CAN manage their own clothes. Success here motivates them to tackle buttons and zippers next.",
    home_extension: "Velcro shoes are great for independence - your child can put on their own shoes!",
  },
  pl_frame_buckles: {
    developmental_note: "Your child is buckling and unbuckling. They're learning to thread, align, and secure - a complex sequence that builds problem-solving skills. Mastering buckles means they can handle their own shoes, belts, and bags.",
    home_extension: "Let your child buckle their own sandals or belt - real practice for real independence.",
  },
  pl_frame_bow_tying: {
    developmental_note: "Your child is learning to tie bows. This is one of the most complex fine motor tasks - it requires both hands doing different things while following a sequence. Patience, persistence, and pride all come together when that bow finally holds.",
    home_extension: "Practice with ribbon or a shoe with long laces. Celebrate when they get it - this is a big milestone!",
  },
  pl_frame_lacing: {
    developmental_note: "Your child is lacing - weaving a lace in and out of holes in sequence. They're building the left-right, up-down patterns their eyes will follow when reading, strengthening fingers for writing, and learning to complete a multi-step task.",
    home_extension: "Lacing cards or even stringing large beads builds the same skills at home.",
  },
  pl_frame_hook_eye: {
    developmental_note: "Your child is working with hook and eye fasteners. These tiny closures require careful alignment and precise finger movements - excellent fine motor development that transfers to many other tasks.",
    home_extension: "Let your child help with any hook-and-eye closures on family clothing.",
  },
  pl_frame_safety_pins: {
    developmental_note: "Your child is learning to work with safety pins - carefully and safely. This requires focus, fine motor precision, and respect for tools. They're learning that they can handle 'grown-up' tasks responsibly.",
    home_extension: "This is an advanced skill - trust the classroom practice before trying at home.",
  },
  pl_braiding: {
    developmental_note: "Your child is learning to braid - weaving three strands in an over-under pattern. This complex activity builds bilateral coordination (both hands working together), pattern recognition, and patience. It's also a practical life skill they'll use for years.",
    home_extension: "Practice braiding with yarn, ribbon, or even bread dough!",
  },

  // ----- CARE OF SELF -----
  pl_hand_washing: {
    developmental_note: "Your child is washing their hands following a specific sequence. They're learning hygiene habits that protect their health, following multi-step directions, and building independence in self-care. Clean hands and a capable attitude.",
    home_extension: "Let your child wash their own hands before meals - give them time to do it properly.",
  },
  pl_face_washing: {
    developmental_note: "Your child is washing their own face. They're developing body awareness, learning self-care routines, and building the confidence to take care of themselves. Looking in the mirror and seeing someone capable.",
    home_extension: "Provide a step stool and washcloth so your child can wash their own face at home.",
  },
  pl_teeth_brushing: {
    developmental_note: "Your child is learning proper teeth brushing technique. They're building healthy habits, following a sequence, and taking responsibility for their own body. Good dental health starts with these early skills.",
    home_extension: "Let your child brush their own teeth first, then you can 'check' for any spots they missed.",
  },
  pl_nose_blowing: {
    developmental_note: "Your child is learning to blow their nose independently. They're mastering an essential self-care skill, building health habits, and developing the confidence to manage their own body. Independence includes the small things.",
    home_extension: "Keep tissues accessible at home so your child can handle this themselves.",
  },
  pl_coughing_sneezing: {
    developmental_note: "Your child is learning to cover coughs and sneezes properly (into their elbow). They're building hygiene habits, showing consideration for others, and learning that their actions affect the people around them.",
    home_extension: "Practice the 'vampire cough' (into the elbow) at home - make it fun!",
  },
  pl_hair_brushing: {
    developmental_note: "Your child is brushing their own hair. They're building arm strength, learning grooming habits, and developing the independence to get themselves ready. Every stroke is a step toward self-sufficiency.",
    home_extension: "Put the brush where your child can reach it and let them do their own hair in the morning.",
  },
  pl_dressing_self: {
    developmental_note: "Your child is learning to dress themselves completely. All those dressing frame skills come together here - buttons, zippers, shoes. This is independence in action. They're becoming capable of getting themselves ready.",
    home_extension: "Allow extra time in the morning so your child can dress themselves without rushing.",
  },

  // ----- CARE OF ENVIRONMENT -----
  pl_table_scrubbing: {
    developmental_note: "Your child is washing a table following a specific sequence. They're moving left to right (preparing for reading), learning to complete a multi-step task, and taking responsibility for their environment. They're learning that they can make things better.",
    home_extension: "Let your child help wipe down the table after meals - they'll feel proud to contribute.",
  },
  pl_sweeping: {
    developmental_note: "Your child is sweeping the floor. They're developing coordination between their two hands, learning to care for shared spaces, and building the understanding that they're a contributing member of the community.",
    home_extension: "A child-sized broom and dustpan let your child help sweep up at home.",
  },
  pl_mopping: {
    developmental_note: "Your child is mopping a section of floor. They're building gross motor skills, learning to complete a physical task from start to finish, and seeing the immediate result of their work - a clean floor!",
    home_extension: "A sponge mop or Swiffer-style mop lets children help with floor cleaning at home.",
  },
  pl_dusting: {
    developmental_note: "Your child is dusting shelves and objects. They're learning to be gentle with materials, developing attention to detail, and taking pride in maintaining a beautiful environment.",
    home_extension: "Give your child a soft cloth and let them dust low shelves or their own belongings.",
  },
  pl_plant_care: {
    developmental_note: "Your child is watering classroom plants. They're learning responsibility for living things, understanding cause and effect over time (water helps plants grow), and developing nurturing skills. Life depends on their care.",
    home_extension: "Give your child a plant of their own to water - watching it grow teaches patience and responsibility.",
  },
  pl_flower_arranging: {
    developmental_note: "Your child is arranging flowers in a vase. They're developing aesthetic sense, making creative choices, and learning to create beauty. This builds confidence in their own artistic judgment.",
    home_extension: "Let your child arrange flowers from the garden or grocery store - their choices matter!",
  },
  pl_polishing_metal: {
    developmental_note: "Your child is polishing metal objects until they shine. They're learning the circular motions used in writing, seeing the direct results of patient effort, and building appreciation for caring for beautiful things.",
    home_extension: "Polish silverware together - your child can see the before and after of their work.",
  },
  pl_polishing_wood: {
    developmental_note: "Your child is polishing wooden objects. They're developing the circular movements needed for writing, learning to care for materials, and seeing how their effort transforms something dull into something beautiful.",
    home_extension: "Let your child help polish wooden furniture - they'll take pride in the results.",
  },
  pl_polishing_glass: {
    developmental_note: "Your child is polishing glass until it's clear. They're learning to be gentle with fragile materials, developing attention to detail, and experiencing the satisfaction of making something sparkle.",
    home_extension: "Let your child help clean mirrors or windows - they can see if they missed any spots.",
  },
  pl_window_washing: {
    developmental_note: "Your child is washing windows with spray and squeegee. They're developing arm strength, learning vertical and horizontal motions, and experiencing the satisfaction of making something clear and clean.",
    home_extension: "A spray bottle and paper towels let your child help with window cleaning at home.",
  },
  pl_dish_washing: {
    developmental_note: "Your child is washing dishes in a basin. They're learning the sequence of wash-rinse-dry, taking responsibility for cleaning up after themselves, and building the life skill of tidiness. Real work with real results.",
    home_extension: "A step stool at the sink and plastic dishes let your child help with dish washing at home.",
  },
  pl_laundry: {
    developmental_note: "Your child is hand washing small cloths. They're learning the sequence of wet-soap-scrub-rinse-wring, building hand strength, and developing responsibility for their belongings.",
    home_extension: "Let your child help wash small items like washcloths in the sink or bathtub.",
  },
  pl_folding_laundry: {
    developmental_note: "Your child is folding cloths and clothes. They're learning to follow steps in order, developing neat habits, and building the organizational skills they'll use for the rest of their life. A folded cloth is a completed task - satisfying!",
    home_extension: "Start with washcloths and napkins - square shapes are easiest to fold.",
  },
  pl_animal_care: {
    developmental_note: "Your child is helping care for classroom animals. They're learning responsibility for living things, developing empathy and nurturing skills, and understanding that their actions matter to others.",
    home_extension: "If you have pets, involve your child in feeding and care routines.",
  },

  // ----- PRELIMINARY EXERCISES -----
  pl_carrying_mat: {
    developmental_note: "Your child is learning to carry, unroll, and roll a work mat properly. This defines their workspace and teaches them to prepare for activities. Setting up and cleaning up are part of every work - building organization and responsibility.",
    home_extension: "Give your child a small placemat or towel as their 'work space' for activities at home.",
  },
  pl_carrying_chair: {
    developmental_note: "Your child is learning to carry a chair safely and quietly. They're building spatial awareness, considering others (no bumping!), and taking care of classroom furniture. Small courtesies that build character.",
    home_extension: "Let your child carry their own chair to the table - remind them to lift, not drag.",
  },
  pl_carrying_tray: {
    developmental_note: "Your child is carrying a tray with objects balanced and stable. They're developing balance, coordination, and the understanding that careful movement keeps things safe. This is early physics - understanding how objects behave.",
    home_extension: "Let your child carry their own plate (unbreakable at first!) to the table.",
  },
  pl_carrying_table: {
    developmental_note: "Your child is working with a partner to carry a table. They're learning teamwork, coordination with another person, and communication. Some jobs take two people working together!",
    home_extension: "Find tasks at home that require teamwork - carrying groceries together, for example.",
  },
  pl_opening_closing_door: {
    developmental_note: "Your child is learning to open and close doors quietly and properly. They're developing awareness of others, learning that their actions affect the environment, and building courtesy habits.",
    home_extension: "Practice 'quiet doors' at home - can they close their bedroom door without a sound?",
  },
  pl_walking_line: {
    developmental_note: "Your child is walking carefully on a line marked on the floor. They're building balance, self-control, and concentration. Walking slowly and precisely requires more control than running - this is body mastery.",
    home_extension: "Use tape on the floor for a walking line at home - can they walk it heel-to-toe?",
  },
  pl_sitting_standing: {
    developmental_note: "Your child is learning the proper way to sit down and stand up at a table. They're developing body control, learning to move without disturbing others, and building habits of grace and courtesy.",
    home_extension: "Practice pushing in chairs at home - it's a simple courtesy that becomes automatic.",
  },
  pl_silence_game: {
    developmental_note: "Your child is practicing being completely silent and still. They're developing self-control, awareness of their body, and the ability to focus. The silence they create is something they can be proud of - it's hard to do!",
    home_extension: "Try a 'silence challenge' at home - who can be quietest longest? Listen for soft sounds.",
  },
  pl_turning_pages: {
    developmental_note: "Your child is learning to turn pages of a book carefully. They're developing fine motor control, care for materials, and the habits of good book handling. Love of reading starts with respect for books.",
    home_extension: "Model careful page turning and let your child turn pages during storytime.",
  },
  pl_folding_cloth: {
    developmental_note: "Your child is folding cloths along lines. They're learning to follow visual guides, developing precision, and preparing for math (folding in half is the beginning of fractions!). Each neat fold is a small accomplishment.",
    home_extension: "Fold napkins together before dinner - your child can handle this responsibility.",
  },

  // ----- FOOD PREPARATION -----
  pl_cutting_soft: {
    developmental_note: "Your child is cutting soft foods like banana with a child-safe knife. They're learning knife safety, developing hand control, and practicing the real skill of preparing their own food. Independence includes feeding yourself.",
    home_extension: "Let your child cut soft fruits for their own snack - banana, strawberries, or kiwi.",
  },
  pl_cutting_hard: {
    developmental_note: "Your child is cutting harder foods like vegetables. They're building hand strength, learning appropriate pressure, and mastering a genuine life skill. When they help in the kitchen at home, this is where it started.",
    home_extension: "Involve your child in meal prep - cutting vegetables is a real contribution to the family.",
  },
  pl_spreading: {
    developmental_note: "Your child is spreading butter, cream cheese, or jam on bread. They're developing the controlled wrist movements used in writing while making their own snack. Practical and delicious!",
    home_extension: "Let your child spread their own peanut butter or cream cheese on toast.",
  },
  pl_peeling: {
    developmental_note: "Your child is peeling hard-boiled eggs or fruits. They're developing fine finger control, learning patience with detailed work, and preparing real food. Peeling is surprisingly complex - celebrate their persistence!",
    home_extension: "Let your child peel their own clementines or hard-boiled eggs for snack.",
  },
  pl_juicing: {
    developmental_note: "Your child is squeezing oranges or lemons to make juice. They're building hand strength, experiencing cause and effect (squeeze = juice!), and enjoying the results of their work - literally.",
    home_extension: "Get a hand juicer and let your child make fresh orange juice for the family.",
  },
  pl_grating: {
    developmental_note: "Your child is grating cheese or vegetables. They're developing hand strength and coordination while learning kitchen safety. The repetitive motion builds focus and the result is something they can eat!",
    home_extension: "Let your child grate cheese for tacos or pasta - use a safe, sturdy grater.",
  },
  pl_making_snack: {
    developmental_note: "Your child is preparing snack for themselves or the class. They're following multi-step sequences, taking responsibility, and contributing to the community. Real work that matters to real people.",
    home_extension: "Let your child prepare a simple snack - crackers with cheese, apple slices with peanut butter.",
  },

  // ----- GRACE AND COURTESY -----
  pl_greeting: {
    developmental_note: "Your child is learning to greet people politely - making eye contact, saying hello, shaking hands. They're building social skills that will serve them their entire life. First impressions start here.",
    home_extension: "Practice greetings at home - when guests come, let your child answer the door and say hello.",
  },
  pl_please_thank_you: {
    developmental_note: "Your child is practicing polite language - please and thank you. These aren't just words - they're the foundation of respectful relationships. Your child is learning that how we speak to people matters.",
    home_extension: "Model please and thank you consistently - children learn politeness by hearing it.",
  },
  pl_interrupting: {
    developmental_note: "Your child is learning how to interrupt politely - placing a hand gently on the arm and waiting. They're building patience and social awareness - knowing that others' conversations matter too.",
    home_extension: "Practice the 'hand on arm and wait' technique at home for polite interruptions.",
  },
  pl_walking_around_work: {
    developmental_note: "Your child is learning to walk around other children's work spaces, not through them. They're developing respect for others' activities and awareness of shared space. Consideration in action.",
    home_extension: "If siblings or parents are working, practice walking around their space, not through it.",
  },
  pl_pushing_chair: {
    developmental_note: "Your child is learning to push in their chair when they leave a table. They're building the habit of leaving spaces ready for the next person - a small act of consideration that becomes automatic.",
    home_extension: "Remind your child to push in their chair after meals - it becomes habit quickly.",
  },
  pl_indoor_voice: {
    developmental_note: "Your child is learning to match their voice volume to the environment. They're developing self-regulation and awareness of how their behavior affects others. Consideration sounds like this.",
    home_extension: "Practice 'indoor voice' vs 'outdoor voice' - children can learn to adjust.",
  },
  pl_waiting_turn: {
    developmental_note: "Your child is learning to wait patiently when someone else is using a material they want. They're building patience, emotional regulation, and the understanding that everyone gets a turn. Delayed gratification is a superpower.",
    home_extension: "Practice taking turns at home - with toys, with conversation, with the TV remote.",
  },
  pl_conflict_resolution: {
    developmental_note: "Your child is learning to solve problems with words - 'I feel... when you... I need...' They're building emotional vocabulary and lifelong conflict resolution skills. Using words instead of actions is a crucial skill.",
    home_extension: "Help your child name their feelings and express needs with words when conflicts arise.",
  },
};

// ============================================
// SENSORIAL DEFINITIONS
// ============================================

const SENSORIAL_DEFINITIONS: Record<string, WorkDefinition> = {
  // ----- VISUAL DISCRIMINATION -----
  se_pink_tower: {
    developmental_note: "Your child is stacking 10 pink cubes from largest to smallest. Their eyes are learning to see small differences in size - the same skill they'll need to tell 'b' from 'd' or '6' from '9'. Their hands feel that bigger means heavier, preparing them to understand that bigger numbers mean more. And when they build it perfectly? Pure pride.",
    home_extension: "Stack containers or boxes from largest to smallest - same concept, kitchen materials!",
  },
  se_brown_stair: {
    developmental_note: "Your child is arranging 10 brown prisms from thickest to thinnest. They're learning to see differences in width - a specific kind of visual discrimination. This precision helps with reading (noticing small differences in letters) and math (understanding 'more' and 'less').",
    home_extension: "Compare objects by thickness at home - which book is thicker? Which marker is fatter?",
  },
  se_red_rods: {
    developmental_note: "Your child is arranging 10 red rods from longest to shortest. They're seeing and feeling differences in length, preparing for measurement concepts, and building the visual skills needed to compare and order. This is pre-math you can hold in your hands.",
    home_extension: "Compare lengths at home - which spoon is longer? Line up toys from shortest to tallest.",
  },
  // Cylinder Blocks (curriculum uses se_cylinder_block_*)
  se_cylinder_block_1: {
    developmental_note: "Your child is fitting cylinders into matching holes in a wooden block. They're developing visual discrimination (seeing small differences), training their hand for the pencil grip (those knobs!), and experiencing self-correction - if a cylinder doesn't fit, they see the error themselves.",
    home_extension: "Nesting cups or containers that stack work the same visual discrimination muscles.",
  },
  se_cylinder_block_2: {
    developmental_note: "Your child is fitting cylinders into matching holes, this time with cylinders varying in a different dimension. They're refining their ability to discriminate size differences while building concentration.",
    home_extension: "Nesting cups or containers that stack work the same visual discrimination muscles.",
  },
  se_cylinder_block_3: {
    developmental_note: "Your child is working with a third variation of cylinders, further refining their visual discrimination. Each block isolates a different quality for comparison.",
    home_extension: "Nesting cups or containers that stack work the same visual discrimination muscles.",
  },
  se_cylinder_block_4: {
    developmental_note: "Your child is working with the fourth cylinder block, completing their exploration of size discrimination. Their eyes have learned to see differences their hands can verify.",
    home_extension: "Nesting cups or containers that stack work the same visual discrimination muscles.",
  },
  se_knobbed_cylinders: {
    developmental_note: "Your child is fitting cylinders into matching holes in a wooden block. They're developing visual discrimination (seeing small differences), training their hand for the pencil grip (those knobs!), and experiencing self-correction - if a cylinder doesn't fit, they see the error themselves.",
    home_extension: "Nesting cups or containers that stack work the same visual discrimination muscles.",
  },
  se_knobless_cylinders: {
    developmental_note: "Your child is working with cylinders without knobs, ordering them by size and building patterns. They're developing more refined visual discrimination and creative thinking as they explore different arrangements.",
    home_extension: "Use different sized coins, buttons, or lids to sort and arrange by size.",
  },
  // Color Box / Color Tablets (curriculum uses se_color_box_*)
  se_color_box_1: {
    developmental_note: "Your child is matching pairs of primary colors - red, blue, yellow. They're learning color names and developing the ability to see and match - a foundation for reading, writing, and visual learning.",
    home_extension: "Play color matching games - sort toys or socks by color.",
  },
  se_color_box_2: {
    developmental_note: "Your child is matching 11 pairs of colors. They're refining their color vocabulary and visual discrimination, learning to see subtle differences that will help with reading, art, and observation.",
    home_extension: "Go on a 'color hunt' at home or outside - find five things that are green!",
  },
  se_color_box_3: {
    developmental_note: "Your child is grading colors from darkest to lightest across 9 shades of each color. They're developing extremely refined visual discrimination - the ability to see tiny differences. This precision transfers to reading, math, and attention to detail.",
    home_extension: "Collect paint chips from a hardware store and grade them from light to dark.",
  },
  // Aliases for alternative names
  se_color_tablets_1: {
    developmental_note: "Your child is matching pairs of primary colors - red, blue, yellow. They're learning color names and developing the ability to see and match - a foundation for reading, writing, and visual learning.",
    home_extension: "Play color matching games - sort toys or socks by color.",
  },
  se_color_tablets_2: {
    developmental_note: "Your child is matching 11 pairs of colors. They're refining their color vocabulary and visual discrimination, learning to see subtle differences that will help with reading, art, and observation.",
    home_extension: "Go on a 'color hunt' at home or outside - find five things that are green!",
  },
  se_color_tablets_3: {
    developmental_note: "Your child is grading colors from darkest to lightest across 9 shades of each color. They're developing extremely refined visual discrimination - the ability to see tiny differences. This precision transfers to reading, math, and attention to detail.",
    home_extension: "Collect paint chips from a hardware store and grade them from light to dark.",
  },
  se_geometric_cabinet: {
    developmental_note: "Your child is exploring shapes - circles, triangles, rectangles, and more. They're learning shape names through touch, developing visual discrimination, and preparing for geometry. When they later learn that a stop sign is an octagon, their hands already knew.",
    home_extension: "Go on a shape hunt around your home - find circles, squares, triangles everywhere!",
  },
  se_constructive_triangles: {
    developmental_note: "Your child is combining triangles to make other shapes - discovering that two triangles make a square! They're learning geometry through their hands and developing the spatial thinking needed for math and problem-solving.",
    home_extension: "Cut paper triangles and experiment with combining them into different shapes.",
  },
  se_binomial_cube: {
    developmental_note: "Your child is assembling a 3D color puzzle. What looks like a simple puzzle is actually an algebraic equation they're experiencing physically. Years from now when they see (a+b)³, their hands will already know the pattern.",
    home_extension: "Building blocks develop similar spatial reasoning - focus on patterns and matching.",
  },
  se_trinomial_cube: {
    developmental_note: "Your child is assembling an even more complex 3D color puzzle. They're developing spatial reasoning, pattern recognition, and persistence - while their hands learn algebra years before their mind will study it.",
    home_extension: "Complex puzzles and 3D building toys develop the same spatial thinking.",
  },

  // ----- TACTILE DISCRIMINATION -----
  se_touch_boards: {
    developmental_note: "Your child is feeling the difference between rough and smooth surfaces. They're developing tactile sensitivity and vocabulary - and preparing their fingertips for the Sandpaper Letters, where they'll learn the alphabet through touch.",
    home_extension: "Explore textures together - what feels rough? Smooth? Bumpy? Soft?",
  },
  se_touch_tablets: {
    developmental_note: "Your child is matching surfaces by touch alone, using only their fingertips. They're refining their sense of touch, developing concentration, and building the light touch needed for writing.",
    home_extension: "Play a blindfold texture game - can you identify fabrics by touch alone?",
  },
  se_fabric_matching: {
    developmental_note: "Your child is matching fabric pairs by touch, often blindfolded. They're developing tactile memory, concentration, and the ability to identify objects through feel alone - a surprisingly useful skill!",
    home_extension: "Match socks by feel alone - a practical game with real laundry!",
  },
  se_thermic_bottles: {
    developmental_note: "Your child is matching bottles by temperature. They're developing the ability to perceive temperature differences, building vocabulary (warm, cool, hot, cold), and refining their sense of touch.",
    home_extension: "Fill containers with warm and cool water - can you match the temperatures?",
  },
  se_baric_tablets: {
    developmental_note: "Your child is ordering wooden tablets by weight, feeling the difference between heavy and light. They're developing their sense of pressure and preparing for math concepts about more and less.",
    home_extension: "Compare weights of objects at home - which is heavier, the apple or the orange?",
  },
  se_mystery_bag: {
    developmental_note: "Your child is identifying objects by touch alone, reaching into a bag without looking. They're building mental pictures from touch information, developing vocabulary, and strengthening the connection between hand and brain.",
    home_extension: "Play 'mystery bag' at home - put small objects in a bag and identify them by touch.",
  },

  // ----- AUDITORY DISCRIMINATION -----
  // Sound Boxes (curriculum uses se_sound_boxes)
  se_sound_boxes: {
    developmental_note: "Your child is matching pairs of cylinders by the sound they make when shaken. They're developing auditory discrimination - the ability to hear differences in sounds. This is essential for distinguishing similar letter sounds when learning to read.",
    home_extension: "Make your own sound shakers with rice, beans, and pasta in containers. Can you match the pairs?",
  },
  se_sound_cylinders: {
    developmental_note: "Your child is matching pairs of cylinders by the sound they make when shaken. They're developing auditory discrimination - the ability to hear differences in sounds. This is essential for distinguishing similar letter sounds when learning to read.",
    home_extension: "Make your own sound shakers with rice, beans, and pasta in containers. Can you match the pairs?",
  },
  se_bells: {
    developmental_note: "Your child is matching bells by pitch or arranging them from lowest to highest. They're developing musical ear training, auditory discrimination, and an appreciation for sound that enhances both music and language learning.",
    home_extension: "Listen for high and low sounds in music or around your home - which is higher?",
  },
  se_silence_game: {
    developmental_note: "Your child is practicing being completely silent and still. They're developing self-control, awareness of their body, and the ability to focus. The silence they create is something they can be proud of.",
    home_extension: "Try a minute of complete silence together - what sounds do you hear?",
  },

  // ----- OLFACTORY & GUSTATORY -----
  se_smelling_bottles: {
    developmental_note: "Your child is matching or identifying scents. They're developing their sense of smell, building vocabulary for describing scents, and making connections between smells and memories or objects.",
    home_extension: "Smell spices together in the kitchen - cinnamon, vanilla, oregano. Can you identify them with eyes closed?",
  },
  se_tasting_bottles: {
    developmental_note: "Your child is identifying tastes - sweet, salty, sour, bitter. They're developing their sense of taste, building vocabulary, and becoming more aware of the foods they eat.",
    home_extension: "Taste test foods together - which is sweet? Salty? Sour? Make it a game!",
  },

  // ----- GEOMETRIC AWARENESS -----
  se_geometric_solids: {
    developmental_note: "Your child is exploring 3D shapes - sphere, cube, cone, cylinder, and more. They're learning shape names through touch, discovering what rolls versus what stacks, and preparing for geometry.",
    home_extension: "Find 3D shapes at home - balls are spheres, boxes are rectangular prisms. Hunt for examples!",
  },
  se_land_water_forms: {
    developmental_note: "Your child is exploring concepts like island, lake, peninsula, and bay using water and clay models. They're learning geography vocabulary through hands-on experience - touch before textbook.",
    home_extension: "Make land/water forms in a sandbox or at the beach. Or use clay and a pan of water at home.",
  },
};

// ============================================
// MATHEMATICS DEFINITIONS
// ============================================

const MATHEMATICS_DEFINITIONS: Record<string, WorkDefinition> = {
  // ----- NUMBERS 1-10 -----
  ma_number_rods: {
    developmental_note: "Your child is arranging rods from 1 to 10, each rod one unit longer than the last. They're feeling that bigger numbers are literally bigger - the 10 rod takes two hands to carry! This physical truth becomes mathematical understanding.",
    home_extension: "Compare lengths at home - use chopsticks, pencils, or straws of different sizes.",
  },
  // Sandpaper Numerals (curriculum uses ma_sandpaper_numerals)
  ma_sandpaper_numerals: {
    developmental_note: "Your child is tracing numbers cut from sandpaper while saying the number name. Their fingers are learning to write numbers while their mind learns what they're called. Touch, sight, and sound - three ways of learning at once.",
    home_extension: "Trace numbers in sand, salt, or flour - the same multi-sensory learning at home.",
  },
  ma_sandpaper_numbers: {
    developmental_note: "Your child is tracing numbers cut from sandpaper while saying the number name. Their fingers are learning to write numbers while their mind learns what they're called. Touch, sight, and sound - three ways of learning at once.",
    home_extension: "Trace numbers in sand, salt, or flour - the same multi-sensory learning at home.",
  },
  // Spindle Box (curriculum uses ma_spindle_box, singular)
  ma_spindle_box: {
    developmental_note: "Your child is placing the right number of spindles (1-9) into numbered compartments - and discovering that the '0' compartment gets nothing. This is often a child's first real understanding of zero: nothing IS the answer.",
    home_extension: "Count objects into bowls or cups - 1, 2, 3... and watch them discover that 0 means none!",
  },
  ma_spindle_boxes: {
    developmental_note: "Your child is placing the right number of spindles (1-9) into numbered compartments - and discovering that the '0' compartment gets nothing. This is often a child's first real understanding of zero: nothing IS the answer.",
    home_extension: "Count objects into bowls or cups - 1, 2, 3... and watch them discover that 0 means none!",
  },
  ma_cards_counters: {
    developmental_note: "Your child is placing counters under number cards, arranging them in pairs. They're connecting written numbers to quantities and discovering odd and even - numbers that pair up perfectly versus numbers with a 'lonely' leftover.",
    home_extension: "Pair up small objects - do you have an even number or is there one left over?",
  },
  ma_number_memory: {
    developmental_note: "Your child is picking a number card, then collecting that many objects from around the room. They're connecting written numerals to real quantities in their environment - math made real and active.",
    home_extension: "Give your child number challenges - 'Bring me 5 blocks' or 'Find 3 blue things.'",
  },
  ma_short_bead_stair: {
    developmental_note: "Your child is working with colored bead bars representing 1-9. They're seeing that each number has its own quantity and color, building a visual foundation for all arithmetic to come.",
    home_extension: "String beads in quantities - 3 red, 5 blue. Counting becomes hands-on.",
  },

  // ----- DECIMAL SYSTEM (GOLDEN BEADS) -----
  ma_golden_beads_intro: {
    developmental_note: "Your child is learning the names and values of unit beads, ten-bars, hundred-squares, and thousand-cubes. They're holding place value in their hands - the thousand cube is literally 1,000 times heavier than a single bead!",
    home_extension: "Notice groups of 10 in everyday life - 10 fingers, 10 crackers, 10 grapes.",
  },
  ma_golden_beads_building: {
    developmental_note: "Your child is creating numbers like 3,456 by gathering 3 thousand-cubes, 4 hundred-squares, 5 ten-bars, and 6 unit beads. They're understanding place value physically before learning it symbolically.",
    home_extension: "Build numbers with money - 1 'dollar' is like a hundred-square made of ten 'dimes.'",
  },
  // Exchange Game (curriculum uses ma_exchange_game, same as Bank Game)
  ma_exchange_game: {
    developmental_note: "Your child is exchanging 10 unit beads for one ten-bar, or 10 tens for one hundred-square. They're discovering WHY we 'carry' in addition - not memorizing a rule, but experiencing the logic. When you trade 10 small things for 1 bigger thing, carrying makes sense.",
    home_extension: "Play 'bank' with dimes and dollars - 10 dimes trade for 1 dollar. Same concept!",
  },
  ma_bank_game: {
    developmental_note: "Your child is exchanging 10 unit beads for one ten-bar, or 10 tens for one hundred-square. They're discovering WHY we 'carry' in addition - not memorizing a rule, but experiencing the logic. When you trade 10 small things for 1 bigger thing, carrying makes sense.",
    home_extension: "Play 'bank' with dimes and dollars - 10 dimes trade for 1 dollar. Same concept!",
  },
  ma_golden_beads_addition: {
    developmental_note: "Your child is adding large numbers by combining bead quantities and making exchanges. They're experiencing addition as putting things together, understanding the process before memorizing procedures.",
    home_extension: "Combine collections - 'You have 23 beads, I have 15. How many do we have together?'",
  },
  ma_golden_beads_subtraction: {
    developmental_note: "Your child is subtracting by taking away bead quantities, sometimes needing to 'borrow' by exchanging a ten-bar for 10 units. They're understanding borrowing physically - it's just an exchange!",
    home_extension: "Share snacks with subtraction - 'You have 15 crackers. If you give me 8, how many are left?'",
  },
  ma_golden_beads_multiplication: {
    developmental_note: "Your child is experiencing multiplication as repeated addition - getting the same quantity multiple times. '3 times 234' means getting 234 beads three times. Multiplication makes sense when you can see it.",
    home_extension: "'I need 3 plates with 4 crackers each. How many crackers is that?' Real multiplication!",
  },
  ma_golden_beads_division: {
    developmental_note: "Your child is dividing by sharing beads equally among bowls. Division is just fair sharing - and any leftovers become the remainder. They understand division because they've done it with their hands.",
    home_extension: "'Can we share these 12 strawberries fairly among 3 people?' That's division!",
  },

  // ----- TEEN AND TEN BOARDS -----
  ma_teen_boards: {
    developmental_note: "Your child is building teen numbers by sliding numeral cards onto a board showing '10.' They see that 13 is '10 and 3' even though we say 'thirteen' - the material shows the truth the words hide.",
    home_extension: "Make teen numbers concrete - '10 crackers plus 3 more makes thirteen!'",
  },
  ma_ten_boards: {
    developmental_note: "Your child is building numbers from 10 to 99, seeing the pattern: 10, 20, 30... and everything in between. They're understanding how our number system builds by tens - the foundation of all arithmetic.",
    home_extension: "Count by 10s together - 10, 20, 30... skip counting is powerful!",
  },

  // ----- LINEAR COUNTING -----
  ma_hundred_chain: {
    developmental_note: "Your child is counting 100 beads, placing arrow markers at each ten. They're experiencing what 100 actually means - touching every single bead. Skip counting by 10s develops naturally.",
    home_extension: "Count to 100 by 10s - use fingers, beans, or steps. Every ten, pause and celebrate!",
  },
  ma_thousand_chain: {
    developmental_note: "Your child is counting 1,000 beads - often over several days! This might seem excessive, but when they finish, they truly understand how big 1,000 is. They've touched every single one.",
    home_extension: "How long would it take to count 1,000 steps? Try it on a long walk!",
  },
  ma_bead_chains: {
    developmental_note: "Your child is counting bead chains that represent squared and cubed numbers - the 4-chain has 16 beads (4×4), the 4-cube chain has 64 beads (4×4×4). They're experiencing multiplication patterns physically.",
    home_extension: "Skip count by different numbers - 2, 4, 6, 8 or 5, 10, 15, 20. Patterns are everywhere!",
  },

  // ----- MEMORIZATION MATERIALS -----
  // Addition Strip Board (curriculum uses ma_addition_strip_board)
  ma_addition_strip_board: {
    developmental_note: "Your child is using colored strips to find sums. To solve 5+3, they place a blue 5-strip and a red 3-strip, and the answer (8) appears. Through repeated use, they discover patterns and memorize facts naturally.",
    home_extension: "Use rulers or measuring tapes to 'add' lengths - 5 inches plus 3 inches equals 8 inches!",
  },
  ma_addition_strip: {
    developmental_note: "Your child is using colored strips to find sums. To solve 5+3, they place a blue 5-strip and a red 3-strip, and the answer (8) appears. Through repeated use, they discover patterns and memorize facts naturally.",
    home_extension: "Use rulers or measuring tapes to 'add' lengths - 5 inches plus 3 inches equals 8 inches!",
  },
  ma_subtraction_strip: {
    developmental_note: "Your child is using strips to solve subtraction problems, seeing subtraction as finding the difference between lengths. The visual patterns help math facts stick.",
    home_extension: "'I have 10 inches of ribbon. If I cut off 4 inches, how much is left?' Measure it!",
  },

  // ----- STAMP GAME -----
  ma_stamp_game: {
    developmental_note: "Your child is doing arithmetic with small wooden tiles marked 1, 10, 100, or 1000. This is the crucial step between concrete beads and abstract numbers - the stamps are all the same size, but your child trusts the written values. They're learning to work with symbols.",
    home_extension: "Use small pieces of paper labeled 1, 10, 100 to 'build' numbers and do simple math.",
  },

  // ----- FRACTIONS -----
  ma_fraction_circles: {
    developmental_note: "Your child is exploring fractions using metal circles divided into pieces - halves, thirds, fourths, and more. They see that 2 halves make a whole, that fourths are smaller than thirds. Fractions make sense when you can hold them.",
    home_extension: "Cut a pizza or pie and talk about halves, quarters, eighths. Fractions are delicious!",
  },
  ma_fraction_operations: {
    developmental_note: "Your child is adding, subtracting, or comparing fractions using the metal insets. They're solving problems like 1/2 + 1/4 by physically combining pieces - understanding before procedure.",
    home_extension: "'We ate half the pizza. Then we ate another quarter. How much is gone?' Use real food!",
  },
};

// ============================================
// LANGUAGE DEFINITIONS
// ============================================

const LANGUAGE_DEFINITIONS: Record<string, WorkDefinition> = {
  // ----- SPOKEN LANGUAGE -----
  // Sound Games (curriculum uses la_sound_games)
  la_sound_games: {
    developmental_note: "Your child is playing sound games: 'I spy something beginning with /m/...' They're learning to hear the individual sounds in words - the essential first step to reading. Before they can connect sounds to letters, they need to hear that words are MADE of sounds.",
    home_extension: "Play I Spy focusing on beginning sounds - 'I spy something that starts with /b/!'",
  },
  la_i_spy: {
    developmental_note: "Your child is playing sound games: 'I spy something beginning with /m/...' They're learning to hear the individual sounds in words - the essential first step to reading. Before they can connect sounds to letters, they need to hear that words are MADE of sounds.",
    home_extension: "Play I Spy focusing on beginning sounds - 'I spy something that starts with /b/!'",
  },
  la_vocabulary_cards: {
    developmental_note: "Your child is learning new words by matching objects to pictures to labels. They're building vocabulary, learning to categorize, and preparing for reading by connecting words to meanings.",
    home_extension: "Name everything! The more words your child hears, the more they'll know.",
  },
  la_story_sequencing: {
    developmental_note: "Your child is putting story cards in order or retelling stories. They're developing narrative understanding, sequencing skills, and comprehension - all essential for reading.",
    home_extension: "After reading a story, ask 'What happened first? Then what? How did it end?'",
  },
  la_classified_cards: {
    developmental_note: "Your child is sorting picture cards into categories (animals, vehicles, foods). They're building vocabulary, learning to categorize and organize, and developing the thinking skills that support reading comprehension.",
    home_extension: "Sort household objects into categories - 'Let's put all the round things together!'",
  },

  // ----- WRITING PREPARATION -----
  la_metal_insets: {
    developmental_note: "Your child is tracing geometric shapes and filling them with careful lines. This builds the hand control needed for writing - lightness of touch, pencil grip, and smooth movement. Every filled shape is practice for letters to come.",
    home_extension: "Draw shapes and color them with careful parallel lines - same skill, same benefit.",
  },
  la_sandpaper_letters: {
    developmental_note: "Your child is tracing letters cut from sandpaper while saying the sound. Their fingers learn the letter shape, their eyes see it, their voice says the sound - three ways of learning at once. When they pick up a pencil, their hand will already know the movements.",
    home_extension: "Trace letters in sand, salt, or shaving cream. Say the sound while tracing!",
  },
  la_sand_tray: {
    developmental_note: "Your child is writing letters in sand with their finger. This no-pressure practice lets them feel the letter shapes without worrying about pencil control. Mistakes disappear with a shake - encouraging fearless practice.",
    home_extension: "Fill a tray with salt or sand for letter practice at home. Shake to erase!",
  },

  // ----- WRITING/ENCODING -----
  la_moveable_alphabet: {
    developmental_note: "Your child is building words by selecting letter tiles - 'CAT' spelled out on a mat. This is writing before their hand can write! They're encoding their ideas into letters, experiencing the power of written language. We celebrate phonetic spelling because it shows they're hearing sounds and finding letters.",
    home_extension: "Make letter tiles from paper or use magnetic letters. Let your child build words!",
  },
  la_chalkboard_writing: {
    developmental_note: "Your child is writing letters and words on a chalkboard. The larger movements are easier than small pencil writing, building confidence and muscle memory before paper and pencil work.",
    home_extension: "Sidewalk chalk or a small chalkboard lets your child write BIG at home.",
  },
  la_paper_pencil: {
    developmental_note: "Your child is writing on paper with a pencil. All the preparation - Metal Insets, Sandpaper Letters, Moveable Alphabet - comes together. They're ready to write their ideas for the world to read.",
    home_extension: "Provide paper and pencils for free writing - journals, notes, stories, lists.",
  },

  // ----- READING/DECODING -----
  la_pink_series: {
    developmental_note: "Your child is reading simple three-letter words: cat, bed, pig, sun. These completely phonetic words build confidence - sound out the letters and you've got the word! Success at this level fuels motivation to read more.",
    home_extension: "Point out simple 3-letter words in books or around the house - 'Can you read CAT?'",
  },
  la_blue_series: {
    developmental_note: "Your child is reading words with consonant blends: stop, crisp, plant. They're tackling more complex sound patterns while still succeeding. Each new challenge mastered builds reading power.",
    home_extension: "Look for blend words on signs and in books - STOP, PLANT, STEP.",
  },
  la_green_series: {
    developmental_note: "Your child is reading words with letter combinations that make special sounds: boat, rain, night. English spelling gets tricky, but systematic introduction makes it manageable. They're cracking the code.",
    home_extension: "Hunt for 'sound team' words - words with 'ea', 'oa', 'ai', 'igh'.",
  },
  la_puzzle_words: {
    developmental_note: "Your child is learning words that don't follow phonetic rules - the, was, said. These common words need to be recognized by sight. Knowing these words makes reading smoother.",
    home_extension: "Practice sight words with flash cards or by spotting them in books.",
  },
  la_phonogram_cards: {
    developmental_note: "Your child is learning letter combinations that make specific sounds: 'sh', 'ch', 'ee', 'oa'. Each phonogram is a tool that unlocks more words. Their reading toolkit is growing.",
    home_extension: "Play 'phonogram hunt' - find words with 'sh' or 'ee' in books and signs.",
  },
  la_reading_classification: {
    developmental_note: "Your child is reading words and matching them to pictures or categories. They're reading for meaning - proving they understand what the words say, not just sounding them out.",
    home_extension: "Label objects around the house - can your child read the labels and match them?",
  },
  la_sentence_reading: {
    developmental_note: "Your child is reading full sentences and showing comprehension through action or matching. They're moving from words to ideas - real reading!",
    home_extension: "Write simple instructions for your child to read and follow - 'Get the red cup.'",
  },
  la_books: {
    developmental_note: "Your child is reading books! All the preparation has led to this - the joy of reading stories independently. This is the explosion into reading that all the earlier work prepared for.",
    home_extension: "Keep lots of books available and let your child choose what to read!",
  },
};

// ============================================
// CULTURAL DEFINITIONS
// ============================================

const CULTURAL_DEFINITIONS: Record<string, WorkDefinition> = {
  // ----- GEOGRAPHY -----
  // Globe (curriculum uses cu_globe_land_water, cu_globe_continents)
  cu_globe_land_water: {
    developmental_note: "Your child is exploring the globe, learning that blue means water and other colors mean land. They're developing awareness of our planet and their place on it.",
    home_extension: "Find your location on a globe or map together. Where do grandparents live?",
  },
  cu_globe_continents: {
    developmental_note: "Your child is learning the names and locations of continents on the globe. They're building a mental map of our world, understanding that Earth is home to many different lands.",
    home_extension: "Find your location on a globe or map together. Where do grandparents live?",
  },
  cu_globe: {
    developmental_note: "Your child is exploring the globe, learning that blue means water and other colors mean land. They're developing awareness of our planet and their place on it.",
    home_extension: "Find your location on a globe or map together. Where do grandparents live?",
  },
  // Puzzle Maps (curriculum uses cu_puzzle_map_world, cu_puzzle_maps_continents)
  cu_puzzle_map_world: {
    developmental_note: "Your child is assembling a world puzzle map, learning the shapes and locations of continents. Geography becomes memorable when you've held each piece in your hand.",
    home_extension: "Do puzzles together - map puzzles are great, but any puzzle builds similar skills.",
  },
  cu_puzzle_maps_continents: {
    developmental_note: "Your child is assembling puzzle maps of individual continents, learning the shapes and names of countries. They're building detailed geographic knowledge.",
    home_extension: "Do puzzles together - map puzzles are great, but any puzzle builds similar skills.",
  },
  cu_puzzle_maps: {
    developmental_note: "Your child is assembling puzzle maps, learning the shapes and names of continents and countries. Geography becomes memorable when you've held each piece in your hand.",
    home_extension: "Do puzzles together - map puzzles are great, but any puzzle builds similar skills.",
  },
  // Land Water Forms (curriculum uses cu_land_water_forms)
  cu_land_water_forms: {
    developmental_note: "Your child is making models of islands, lakes, peninsulas, and bays. They understand these geography terms because they've built them - not just seen pictures.",
    home_extension: "Build land and water forms at the beach or with clay and water at home.",
  },
  cu_land_water: {
    developmental_note: "Your child is making models of islands, lakes, peninsulas, and bays. They understand these geography terms because they've built them - not just seen pictures.",
    home_extension: "Build land and water forms at the beach or with clay and water at home.",
  },
  cu_flags: {
    developmental_note: "Your child is learning about different countries through their flags. Flags make countries real and memorable, building global awareness and curiosity about the world.",
    home_extension: "Point out flags you see and talk about the countries they represent.",
  },
  cu_cultural_folders: {
    developmental_note: "Your child is exploring different cultures through pictures, artifacts, and activities. They're developing respect and curiosity about people around the world.",
    home_extension: "Explore other cultures through food, music, books, and conversations about differences.",
  },

  // ----- SCIENCE -----
  cu_nature_table: {
    developmental_note: "Your child is observing and discussing natural objects - leaves, shells, rocks, pinecones. They're developing observation skills and curiosity about the natural world.",
    home_extension: "Collect nature objects on walks - start your own nature collection at home.",
  },
  cu_life_cycles: {
    developmental_note: "Your child is learning about life cycles - butterfly, frog, plant. They're understanding growth and change, developing scientific thinking about how living things develop.",
    home_extension: "Grow beans in a cup or watch caterpillars become butterflies - life cycles at home!",
  },
  cu_parts_of: {
    developmental_note: "Your child is learning the parts of animals, plants, or other living things through labeled pictures and materials. They're building scientific vocabulary and observation skills.",
    home_extension: "Name body parts, plant parts, animal parts - the more vocabulary, the better!",
  },
  cu_sink_float: {
    developmental_note: "Your child is experimenting with what sinks and what floats. They're learning the scientific method - predict, test, observe - through hands-on discovery.",
    home_extension: "Do sink/float experiments in the bathtub or a basin. Predict first, then test!",
  },
  cu_magnetic: {
    developmental_note: "Your child is discovering which objects magnets attract. They're exploring physical science through experimentation and developing the 'I wonder...' mindset of a scientist.",
    home_extension: "Explore with magnets at home - what sticks? What doesn't? Why do you think?",
  },
  cu_weather: {
    developmental_note: "Your child is tracking and discussing the weather. They're developing observation habits, learning weather vocabulary, and connecting to the natural world around them.",
    home_extension: "Check the weather together each morning - sunny? Cloudy? Rainy? Track it on a calendar.",
  },

  // ----- ART -----
  cu_drawing: {
    developmental_note: "Your child is expressing themselves through drawing. They're developing creativity, fine motor skills, and the confidence to share their ideas visually.",
    home_extension: "Provide paper and art supplies and let your child draw freely - no coloring books needed!",
  },
  cu_painting: {
    developmental_note: "Your child is painting with various materials. They're exploring color, expressing ideas, and developing the freedom to create. Art builds confidence.",
    home_extension: "Set up a painting station at home - even watercolors at the kitchen table work great.",
  },
  cu_cutting: {
    developmental_note: "Your child is practicing cutting with scissors. They're building the hand strength and coordination needed for writing while creating art they're proud of.",
    home_extension: "Provide child-safe scissors and paper for cutting practice - snipping, then shapes.",
  },
  cu_gluing: {
    developmental_note: "Your child is creating collages with paper, glue, and various materials. They're making creative choices, building fine motor skills, and experiencing the satisfaction of making something beautiful.",
    home_extension: "Save materials for collage - magazines, paper scraps, buttons, fabric.",
  },
  cu_clay: {
    developmental_note: "Your child is sculpting with clay or playdough. They're building hand strength, exploring three-dimensional creativity, and enjoying a sensory experience that's good for brain development.",
    home_extension: "Keep playdough available for free play - squeezing and shaping builds hand strength.",
  },

  // ----- MUSIC -----
  cu_singing: {
    developmental_note: "Your child is singing songs. They're developing memory, language rhythm, and the joy of making music together. Songs often teach concepts like counting, seasons, or letter sounds too.",
    home_extension: "Sing together! In the car, at bedtime, while cooking. Songs stick in memory.",
  },
  cu_movement: {
    developmental_note: "Your child is moving their body to music - dancing, marching, freezing. They're developing body awareness, rhythm, and the connection between hearing and movement.",
    home_extension: "Dance together! Freeze dance, follow the leader, or just move to favorite songs.",
  },
  cu_rhythm: {
    developmental_note: "Your child is playing simple percussion instruments. They're exploring rhythm, developing coordination, and experiencing the joy of making music.",
    home_extension: "Make music with pots and spoons, or invest in simple instruments like a tambourine.",
  },
  cu_bells_pitch: {
    developmental_note: "Your child is working with tone bells, learning about high and low sounds. They're developing musical ear training and auditory discrimination.",
    home_extension: "Listen for high and low sounds in music and in your environment.",
  },
};

// ============================================
// MAIN LOOKUP FUNCTION
// ============================================

// Combine all definitions
const ALL_DEFINITIONS: Record<string, WorkDefinition> = {
  ...PRACTICAL_LIFE_DEFINITIONS,
  ...SENSORIAL_DEFINITIONS,
  ...MATHEMATICS_DEFINITIONS,
  ...LANGUAGE_DEFINITIONS,
  ...CULTURAL_DEFINITIONS,
};

/**
 * Get the parent-friendly definition for a work
 * Falls back to area-level description if work not found
 */
export function getWorkDefinition(
  workId: string | null,
  workName: string | null,
  area: string
): WorkDefinition {
  // Try exact work_id match first
  if (workId && ALL_DEFINITIONS[workId]) {
    return ALL_DEFINITIONS[workId];
  }

  // Try matching by work name (normalized)
  if (workName) {
    const normalizedName = workName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Try to find a matching definition
    for (const [key, def] of Object.entries(ALL_DEFINITIONS)) {
      if (key.includes(normalizedName) || normalizedName.includes(key.split('_').slice(1).join('_'))) {
        return def;
      }
    }
  }

  // Fall back to area-level description
  const normalizedArea = area?.toLowerCase().replace(/[^a-z_]/g, '') || 'practical_life';
  return AREA_FALLBACKS[normalizedArea] || AREA_FALLBACKS.practical_life;
}

/**
 * Generate a summary paragraph for the end of a report
 */
export function generateReportSummary(
  childName: string,
  highlights: Array<{ area: string | null; work_name: string | null; status?: string }>,
  areas: string[]
): string {
  if (highlights.length === 0) {
    return `${childName} continues to explore and grow in the Montessori environment. Every day brings new opportunities for discovery and development.`;
  }

  const mastered = highlights.filter(h => h.status === 'mastered');
  const practicing = highlights.filter(h => h.status === 'practicing');
  
  // Build area summary
  const areaNames: Record<string, string> = {
    practical_life: 'Practical Life',
    sensorial: 'Sensorial',
    language: 'Language',
    mathematics: 'Mathematics',
    cultural: 'Cultural',
  };
  
  const areaList = areas
    .map(a => areaNames[a] || a)
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1'); // Replace last comma with 'and'

  let summary = `This week, ${childName} engaged deeply with ${highlights.length} different ${highlights.length === 1 ? 'activity' : 'activities'}`;
  
  if (areas.length > 0) {
    summary += ` across ${areaList}`;
  }
  summary += '.';

  // Add mastery celebration
  if (mastered.length > 0) {
    const masteredNames = mastered
      .map(h => h.work_name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    
    if (mastered.length === 1) {
      summary += ` A highlight was mastering ${masteredNames}!`;
    } else {
      summary += ` Highlights included mastering ${masteredNames}!`;
    }
  }

  // Add practicing note
  if (practicing.length > 0 && mastered.length === 0) {
    summary += ` ${childName} is building skills through repeated practice - this persistence is exactly how deep learning happens.`;
  }

  // Closing encouragement
  summary += ` Every activity builds concentration, coordination, and confidence. Keep watching for these skills to appear at home!`;

  return summary;
}
