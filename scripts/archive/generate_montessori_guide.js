const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageBreak, TableOfContents } = require('docx');
const fs = require('fs');
const path = require('path');

// Helper function to create a border style
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

// Helper function for section headings
function createSectionHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true })],
    spacing: { before: 240, after: 120 }
  });
}

// Helper function for subsection headings
function createSubHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true })],
    spacing: { before: 180, after: 100 }
  });
}

// Helper function for regular text
function createParagraph(text) {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { line: 360, after: 120 }
  });
}

// Helper function for bold text
function createBoldParagraph(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true })],
    spacing: { after: 100 }
  });
}

// Helper function for bullet list items
function createBulletItem(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun(text)],
    spacing: { after: 80 }
  });
}

// Title Page
function createTitlePage() {
  const paragraphs = [
    new Paragraph({ children: [new TextRun("")], spacing: { after: 400 } }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 400 } }),
    new Paragraph({
      children: [new TextRun({ text: "Montessori Language Making Guide", bold: true, size: 56 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: "Complete Curriculum for 43 Language Works", italic: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 600 } }),
    new Paragraph({
      children: [new TextRun({ text: "A comprehensive guide to implementing the Montessori Language curriculum", italic: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 600 } }),
    new Paragraph({
      children: [new TextRun("Montree Montessori Curriculum")],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 1200 } }),
    new Paragraph({
      children: [new TextRun(`Generated: ${new Date().toLocaleDateString()}`)],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    })
  ];

  return paragraphs;
}

// Content sections
function createOralLanguageSection() {
  const paragraphs = [
    createSectionHeading("CATEGORY 1: Oral Language Development"),
    createParagraph("8 foundational works for developing listening, speaking, and language comprehension skills."),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    // Work 1: Vocabulary Enrichment
    createSubHeading("Work 1: Vocabulary Enrichment"),
    createBoldParagraph("Description:"),
    createParagraph("Building vocabulary through conversation and objects. The child learns new words through real objects, pictures, and guided conversation. This work develops expressive and receptive language skills."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 2.5-3 years (Level I)"),
    createBulletItem("Ages 3-4 years (Level II - expanded vocabulary)"),
    createBulletItem("Ages 4-5 years (Level III - abstract concepts)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Real objects from classroom (toys, fruits, tools)"),
    createBulletItem("Picture cards (5x7\" card stock)"),
    createBulletItem("Vocabulary list organized by themes"),
    createBoldParagraph("Detailed Content - Object Categories:"),
    createBulletItem("Fruits: apple, banana, orange, grape, strawberry, pear, watermelon, peach, mango, pineapple, lemon, lime, kiwi, blueberry, raspberry"),
    createBulletItem("Vegetables: carrot, broccoli, celery, corn, pea, bean, potato, tomato, cucumber, lettuce, spinach, bell pepper"),
    createBulletItem("Kitchen Items: cup, plate, bowl, spoon, fork, knife, pot, pan, pot lid, cutting board, spatula, whisk, measuring cup"),
    createBulletItem("Animals: dog, cat, bird, fish, turtle, rabbit, mouse, snake, lion, elephant, bear, cow, horse, pig, sheep, goat"),
    createBulletItem("Clothing: shirt, pants, dress, shoes, socks, hat, coat, gloves, scarf, mittens, sweater, jacket, belt, tie, socks"),
    createBulletItem("Body Parts: head, arm, leg, hand, foot, eye, ear, nose, mouth, teeth, hair, chin, cheek, shoulder, knee"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Gather objects and present one at a time using real objects first"),
    createBulletItem("Use Three-Period Lesson format: 'This is an apple.' 'Show me the apple.' 'What is this?'"),
    createBulletItem("Expand to conversations about properties: color, size, taste, texture"),
    createBulletItem("Encourage child to use words in sentences"),
    createBulletItem("Introduce pictures paired with real objects"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 2: Classified Cards
    createSubHeading("Work 2: Classified Cards (Nomenclature Cards)"),
    createBoldParagraph("Description:"),
    createParagraph("Picture cards organized by category for systematic vocabulary building. These cards provide visual representations of words grouped by topic, supporting the child's vocabulary development."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I - basic categories)"),
    createBulletItem("Ages 4-5 years (Level II - expanded categories)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print 4x4\" picture cards on glossy card stock"),
    createBulletItem("Laminate with 3-mil pouches"),
    createBulletItem("Cut and store in labeled boxes by category"),
    createBoldParagraph("Detailed Content - Categories and Items:"),
    createBulletItem("Farm Animals: cow, pig, horse, sheep, goat, hen, duck, rooster, turkey, donkey, mule, llama"),
    createBulletItem("Wild Animals: lion, tiger, zebra, giraffe, elephant, hippopotamus, rhinoceros, cheetah, wildebeest, antelope"),
    createBulletItem("Vehicles: car, bus, truck, train, airplane, boat, motorcycle, helicopter, bicycle, wagon, ambulance, fire truck"),
    createBulletItem("Clothing: shirt, pants, dress, shoes, socks, hat, coat, gloves, scarf, mittens, sweater, jacket"),
    createBulletItem("Body Parts: head, arm, leg, hand, foot, eye, ear, nose, mouth, teeth, hair, chin, cheek, shoulder"),
    createBulletItem("Kitchen Items: cup, plate, bowl, spoon, fork, knife, pot, pan, pot lid, cutting board, spatula"),
    createBulletItem("Insects: ant, bee, butterfly, caterpillar, ladybug, grasshopper, spider, dragonfly, firefly, cricket"),
    createBulletItem("Furniture: table, chair, bed, sofa, desk, cabinet, shelf, lamp, dresser, nightstand, bookcase"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Introduce one category at a time"),
    createBulletItem("Lay out 6-8 cards initially, then expand"),
    createBulletItem("Use Three-Period Lesson: 'This is a cow.' 'Show me the cow.' 'What is this?'"),
    createBulletItem("Sort cards into categories as control of error"),
    createBulletItem("Progress to matching object to picture"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 3: Object to Picture Matching
    createSubHeading("Work 3: Object to Picture Matching"),
    createBoldParagraph("Description:"),
    createParagraph("Matching real objects to their picture representations. This work develops visual discrimination and strengthens vocabulary through multi-sensory engagement."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 2.5-3 years (Level I - basic matching)"),
    createBulletItem("Ages 3-4 years (Level II - expanded objects)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("10-12 small objects (blocks, animals, toys)"),
    createBulletItem("Print corresponding 3x3\" picture cards on card stock"),
    createBulletItem("Laminate cards"),
    createBulletItem("Create a basket or box for storage"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Place objects and pictures on a prepared mat"),
    createBulletItem("Model placing one object next to its matching picture"),
    createBulletItem("Encourage child to continue matching independently"),
    createBulletItem("Discuss each match when complete: 'You matched the red block to the red block picture.'"),
    createBulletItem("Progress to more complex objects and pictures"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 4: Sound Games
    createSubHeading("Work 4: Sound Games (I Spy)"),
    createBoldParagraph("Description:"),
    createParagraph("Phonemic awareness activities isolating sounds in words. Through playful games, children develop the ability to hear and discriminate individual sounds within words."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I - initial sounds)"),
    createBulletItem("Ages 4-5 years (Level II - medial sounds)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Collect 10-12 objects for each sound"),
    createBulletItem("Picture cards of objects"),
    createBulletItem("Feely bag for objects"),
    createBoldParagraph("Detailed Content - Objects by Sound:"),
    createBulletItem("A: apple, alligator, ant, anchor, acorn, apricot"),
    createBulletItem("B: ball, bear, bus, boat, bell, banana"),
    createBulletItem("C: cat, cup, car, cow, crab, carrot"),
    createBulletItem("D: dog, door, duck, drum, doll, donut"),
    createBulletItem("F: fish, flower, frog, fan, fork, feather"),
    createBulletItem("G: goat, gate, girl, gun, goggles, garden"),
    createBulletItem("H: hat, house, hand, heart, hippo, hammer"),
    createBulletItem("J: jar, jump, jelly, jacket, jet, jigsaw"),
    createBulletItem("M: mouse, money, milk, monkey, mitten, moon"),
    createBulletItem("N: nest, nose, necklace, nail, napkin, net"),
    createBulletItem("P: pig, pig, parrot, pencil, pig, puppy"),
    createBulletItem("R: rabbit, ring, rose, rooster, rope, river"),
    createBulletItem("S: sun, snake, sock, six, seal, star"),
    createBulletItem("T: turtle, table, telephone, tiger, tie, teapot"),
    createBulletItem("W: watch, window, whale, wagon, water, web"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Play 'I Spy' game: 'I spy with my little eye something that starts with /s/.'"),
    createBulletItem("Child listens and identifies the object or picture"),
    createBulletItem("Reverse roles - child plays 'I Spy' and teacher guesses"),
    createBulletItem("Use feely bag variation - child feels and names object by sound"),
    createBulletItem("Progress to initial, medial, and final sounds"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 5: Rhyming Activities
    createSubHeading("Work 5: Rhyming Activities"),
    createBoldParagraph("Description:"),
    createParagraph("Recognizing and producing rhymes. Children develop phonological awareness by identifying rhyming patterns and creating rhyming pairs."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I - simple rhymes)"),
    createBulletItem("Ages 4-5 years (Level II - extended rhyming)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print rhyming picture cards (3x3\" on card stock)"),
    createBulletItem("Laminate and cut"),
    createBulletItem("Create word cards for rhyming pairs"),
    createBoldParagraph("Detailed Content - Rhyming Pairs:"),
    createBulletItem("cat/hat, cat/mat, cat/bat, cat/sat"),
    createBulletItem("dog/log, dog/fog, dog/hog"),
    createBulletItem("sun/run, sun/fun, sun/gun"),
    createBulletItem("bee/tree, bee/see, bee/free, bee/me"),
    createBulletItem("book/look, book/cook, book/hook"),
    createBulletItem("mouse/house, mouse/louse"),
    createBulletItem("ball/call, ball/fall, ball/tall, ball/wall"),
    createBulletItem("rain/pain, rain/train, rain/main, rain/chain"),
    createBulletItem("sea/tea, sea/see, sea/free, sea/three"),
    createBulletItem("go/know, go/show, go/flow"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Start with familiar nursery rhymes"),
    createBulletItem("Recite rhyme and emphasize rhyming words"),
    createBulletItem("Ask child to identify rhyming pairs"),
    createBulletItem("Sing rhyming songs together"),
    createBulletItem("Encourage child to create new rhymes"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 6: Storytelling and Sequencing
    createSubHeading("Work 6: Storytelling and Sequencing"),
    createBoldParagraph("Description:"),
    createParagraph("Oral storytelling and story sequencing activities. Children develop narrative skills and comprehension of sequence and causality."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I - simple sequences)"),
    createBulletItem("Ages 4-5 years (Level II - complex narratives)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print sequence cards (4x4\" on card stock)"),
    createBulletItem("Laminate cards"),
    createBulletItem("Story pictures showing beginning, middle, end"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Read stories with expression and pauses"),
    createBulletItem("Ask comprehension questions throughout"),
    createBulletItem("Show sequence cards and arrange in order"),
    createBulletItem("Ask child to retell the story in order"),
    createBulletItem("Use props to act out stories"),
    createBulletItem("Encourage child to create original stories"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 7: Poems, Songs, and Fingerplays
    createSubHeading("Work 7: Poems, Songs, and Fingerplays"),
    createBoldParagraph("Description:"),
    createParagraph("Memorizing and performing poems and songs. This work develops rhythm, rhyme awareness, memory, and joyful language use."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 2.5-3 years (Level I - simple fingerplays)"),
    createBulletItem("Ages 3-4 years (Level II - short songs)"),
    createBulletItem("Ages 4-5 years (Level III - longer poems)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print poem/song cards (5x7\" on card stock)"),
    createBulletItem("Laminate for durability"),
    createBulletItem("Create action cards for fingerplays"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Perform fingerplays with exaggerated motions"),
    createBulletItem("Sing songs multiple times"),
    createBulletItem("Invite child to join in gradually"),
    createBulletItem("Repeat throughout the day"),
    createBulletItem("Modify to match child interests"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 8: Conversation and Discussion
    createSubHeading("Work 8: Conversation and Discussion"),
    createBoldParagraph("Description:"),
    createParagraph("Structured conversation practice. Children develop pragmatic language skills, turn-taking, and the ability to engage in meaningful dialogue."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I - simple conversations)"),
    createBulletItem("Ages 4-5 years (Level II - complex discussions)"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Have one-on-one conversations daily"),
    createBulletItem("Ask open-ended questions: 'Tell me about...' or 'What do you think about...'"),
    createBulletItem("Listen actively and respond with genuine interest"),
    createBulletItem("Model correct language patterns"),
    createBulletItem("Encourage peer conversations"),
    createBulletItem("Use discussion circles for group conversations"),
  ];

  return paragraphs;
}

function createWritingPreparationSection() {
  const paragraphs = [
    new Paragraph({ children: [new PageBreak()] }),
    createSectionHeading("CATEGORY 2: Writing Preparation"),
    createParagraph("7 works developing fine motor control, pencil grip, and letter formation readiness."),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    // Work 1: Metal Insets
    createSubHeading("Work 1: Metal Insets"),
    createBoldParagraph("Description:"),
    createParagraph("Geometric frames for developing pencil control. The child traces geometric shapes to develop hand-eye coordination, pencil control, and fine motor skills."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I)"),
    createBulletItem("Ages 4-5 years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Metal Inset set (10 geometric shapes): circle, oval, triangle, square, rectangle, pentagon, hexagon, trapezoid, diamond, star"),
    createBulletItem("Colored pencil set (6-8 colors)"),
    createBulletItem("Inset paper pads (unlined white paper)"),
    createBulletItem("Metal inset storage box"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Place one metal inset in frame"),
    createBulletItem("Demonstrate holding pencil with three-finger grip"),
    createBulletItem("Trace shape slowly and deliberately"),
    createBulletItem("Lift pencil and trace around the inset frame"),
    createBulletItem("Fill in shapes with colored pencils (not required but encouraged)"),
    createBulletItem("Progress to combining shapes and creating designs"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 2: Sandpaper Letters
    createSubHeading("Work 2: Sandpaper Letters"),
    createBoldParagraph("Description:"),
    createParagraph("Tactile letters for learning letter sounds and formation. Capital letters mounted on sandpaper provide tactile and visual learning of letter shapes and phonetic sounds."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 2.5-3 years (Level I - first group)"),
    createBulletItem("Ages 3-4 years (Level II - second/third groups)"),
    createBulletItem("Ages 4-5 years (Level III - all groups)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print or cut large capital letters (4\" tall) from sandpaper sheets"),
    createBulletItem("Mount on wooden boards (5\" x 7\") or cardstock (painted in two colors)"),
    createBulletItem("Organize into 6 groups for sequential learning:"),
    createBulletItem("Group 1 (Red/Pink): c, m, a, t"),
    createBulletItem("Group 2 (Red/Pink): s, r, i, p"),
    createBulletItem("Group 3 (Blue): b, f, o, g"),
    createBulletItem("Group 4 (Blue): h, j, u, l"),
    createBulletItem("Group 5 (Blue): d, w, e, n"),
    createBulletItem("Group 6 (Blue): k, q, v, x, y, z"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Three-Period Lesson format"),
    createBulletItem("Period 1: 'This is /c/. Listen: /c/. This is the sound we use to start the word cat.'"),
    createBulletItem("Period 2: 'Touch the /c/ and tell me the sound.'"),
    createBulletItem("Period 3: 'Show me the /c/. What sound is this?'"),
    createBulletItem("Child traces letter with fingertips (index and middle fingers) while saying sound"),
    createBulletItem("Connect to objects and pictures starting with sound"),
    createBulletItem("Introduce 4 letters at a time (follow color groups)"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 3: Sand Tray Writing
    createSubHeading("Work 3: Sand Tray Writing"),
    createBoldParagraph("Description:"),
    createParagraph("Writing letters in sand before paper. The child uses a finger or stylus to form letters in sand, providing immediate sensory feedback and control of error."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I)"),
    createBulletItem("Ages 4-5 years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Wooden sand tray (approximately 12\" x 18\")"),
    createBulletItem("Fine sand or kinetic sand"),
    createBulletItem("Stylus or wooden stick"),
    createBulletItem("Sand tray liner or wax paper"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Model forming a letter slowly in the sand"),
    createBulletItem("Smooth sand with flat hand to erase"),
    createBulletItem("Invite child to trace same letter"),
    createBulletItem("Progress to words and simple sentences"),
    createBulletItem("Child can form letters multiple times with immediate feedback"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 4: Chalkboard Writing
    createSubHeading("Work 4: Chalkboard Writing"),
    createBoldParagraph("Description:"),
    createParagraph("Large letter formation on chalkboard. The child practices letter formation on a chalkboard with large arm movements before transitioning to pencil and paper."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I)"),
    createBulletItem("Ages 4-5 years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Large chalkboard (24\" x 36\" or larger)"),
    createBulletItem("Chalk in multiple colors"),
    createBulletItem("Chalk erasers"),
    createBulletItem("Storage for chalk"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Model forming letters with large arm movements"),
    createBulletItem("Demonstrate correct directionality and formation"),
    createBulletItem("Encourage child to trace over your letter"),
    createBulletItem("Child practices forming letters independently"),
    createBulletItem("Use different colored chalk for variety"),
    createBulletItem("Erase frequently to avoid visual clutter"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 5: Moveable Alphabet
    createSubHeading("Work 5: Moveable Alphabet"),
    createBoldParagraph("Description:"),
    createParagraph("Wooden or plastic letters for word building. This material bridges the gap between phonetic awareness and actual writing, allowing the child to build words without hand fatigue."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I - single sounds)"),
    createBulletItem("Ages 4-5 years (Level II - word building)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Wooden or plastic lowercase letters (1\" tall)"),
    createBulletItem("Blue consonants and red vowels (color-coded)"),
    createBulletItem("Multiple copies of common letters (2-3 extra e, a, o, t, r, s, n, l)"),
    createBulletItem("Wooden box divided into compartments for each letter"),
    createBulletItem("Word building cards (optional)"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Sound the word: /c/ /a/ /t/"),
    createBulletItem("Child places letters in order as sounds are made"),
    createBulletItem("Read the word together: 'cat'"),
    createBulletItem("Blend sounds smoothly: 'caaattt'"),
    createBulletItem("Progress from CVC words to blends and digraphs"),
    createBulletItem("Child can build and rebuild words independently"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 6: Handwriting on Paper
    createSubHeading("Work 6: Handwriting on Paper"),
    createBoldParagraph("Description:"),
    createParagraph("Formal handwriting practice on lined paper. The child applies learned letter formation to pencil and paper with structured guides."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 4-5 years (Level I - single letters)"),
    createBulletItem("Ages 5-6 years (Level II - words)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Handwriting paper pads (wide lines for young learners)"),
    createBulletItem("Pencils (HB or primary size)"),
    createBulletItem("Pencil grips (if needed)"),
    createBulletItem("Pencil sharpeners"),
    createBulletItem("Handwriting practice sheets with models"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Model correct pencil grip and posture"),
    createBulletItem("Child traces dotted letter models"),
    createBulletItem("Progress to copying letters independently"),
    createBulletItem("Then write words"),
    createBulletItem("Handwriting should be a joyful activity, not forced"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 7: Creative Writing
    createSubHeading("Work 7: Creative Writing"),
    createBoldParagraph("Description:"),
    createParagraph("Original writing and composition. The child expresses ideas in writing, developing voice, creativity, and written expression."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 4-5 years (Level I - labels and simple sentences)"),
    createBulletItem("Ages 5-6 years (Level II - stories)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Writing paper (lined and unlined)"),
    createBulletItem("Colored pencils and crayons"),
    createBulletItem("Writing journals or notebooks"),
    createBulletItem("Picture prompts for inspiration"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Provide quiet writing time daily"),
    createBulletItem("Ask open-ended prompts: 'Tell me a story.'"),
    createBulletItem("Accept phonetic spelling and invented spellings"),
    createBulletItem("Transcribe child's writing if needed"),
    createBulletItem("Display and celebrate child's writing"),
    createBulletItem("Encourage illustrating written work"),
  ];

  return paragraphs;
}

function createReadingSection() {
  const paragraphs = [
    new Paragraph({ children: [new PageBreak()] }),
    createSectionHeading("CATEGORY 3: Reading"),
    createParagraph("11 works progressing from concrete objects to abstract concepts in systematic reading development."),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    // Work 1: Object Boxes
    createSubHeading("Work 1: Object Boxes (Pink/Blue/Green)"),
    createBoldParagraph("Description:"),
    createParagraph("Boxes with miniature objects and word labels. The child matches objects to their word labels, developing initial reading skills with concrete context."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 3-4 years (Level I)"),
    createBulletItem("Ages 4-5 years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Three wooden or sturdy cardboard boxes (color-coded: pink, blue, green)"),
    createBulletItem("Miniature objects corresponding to CVC words (plastic or small wooden items)"),
    createBulletItem("Print and laminate word labels (2\" tall, printed on matching colored paper)"),
    createBulletItem("Objects: cat, bat, rat, hat, dog, log, pig, wig, fish, dish, bird, worm"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Present pink box first (single consonant words)"),
    createBulletItem("Child selects object from basket"),
    createBulletItem("Shows corresponding word label"),
    createBulletItem("Places label and object together"),
    createBulletItem("Child reads label and identifies object"),
    createBulletItem("Progress to blue box (beginning blends) then green box (ending blends)"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 2: Pink Series
    createSubHeading("Work 2: Pink Series (CVC Words)"),
    createBoldParagraph("Description:"),
    createParagraph("Complete reading series for 3-letter phonetic words. This systematic series introduces reading through regular, phonetic three-letter words."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 4-5 years (Level I)"),
    createBulletItem("Ages 5-6 years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print word cards (3\" tall) on light pink card stock"),
    createBulletItem("Laminate for durability"),
    createBulletItem("Organize into word families or by difficulty"),
    createBulletItem("Create corresponding picture cards"),
    createBoldParagraph("Detailed Content - Pink Series Words (complete word list):"),
    createBulletItem("a_t: bat, cat, fat, hat, mat, pat, rat, sat, vat, tat"),
    createBulletItem("a_n: ban, can, fan, man, pan, ran, tan, van, wan"),
    createBulletItem("a_p: cap, gap, lap, map, nap, rap, sap, tap, yap, zap"),
    createBulletItem("i_g: big, dig, fig, gig, jig, pig, rig, wig, zig"),
    createBulletItem("o_p: hop, mop, pop, sop, top"),
    createBulletItem("u_p: cup, pup, sup"),
    createBulletItem("u_s: bus, cus"),
    createBulletItem("u_n: bun, dun, fun, gun, nun, pun, run, sun"),
    createBulletItem("u_g: bug, dug, hug, jug, mug, pug, rug, tug"),
    createBulletItem("u_d: bud, cud, dud, mud, sud, thud"),
    createBulletItem("u_t: but, cut, gut, hut, jut, nut, put, rut, tut"),
    createBulletItem("e_d: bed, fed, led, red, ted, wed"),
    createBulletItem("e_n: ben, den, fen, hen, ken, men, pen, ten, yen, zen"),
    createBulletItem("e_t: bet, get, jet, let, met, net, pet, set, vet, wet, yet"),
    createBulletItem("i_t: bit, fit, hit, kit, lit, pit, sit, wit, zit"),
    createBulletItem("i_n: bin, din, fin, gin, kin, pin, sin, tin, win"),
    createBulletItem("i_p: dip, hip, lip, nip, pip, rip, sip, tip, zip"),
    createBulletItem("o_t: cot, dot, got, hot, jot, lot, not, pot, rot, tot"),
    createBulletItem("o_g: bog, cog, dog, fog, hog, jog, log"),
    createBulletItem("o_x: box, cox, fox, lox, pox, sox"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Present one word at a time on card"),
    createBulletItem("Child reads silently first"),
    createBulletItem("Then reads aloud"),
    createBulletItem("Match picture to word for confirmation"),
    createBulletItem("Progress through families systematically"),
    createBulletItem("Create sentences with known words"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 3: Blue Series
    createSubHeading("Work 3: Blue Series (Blends)"),
    createBoldParagraph("Description:"),
    createParagraph("Reading series for words with consonant blends. This extends phonetic reading to words with blends at the beginning or end."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print word cards on light blue card stock"),
    createBulletItem("Laminate for durability"),
    createBulletItem("Create corresponding picture cards"),
    createBoldParagraph("Detailed Content - Blue Series Words:"),
    createBulletItem("st: stop, step, stem, stick, stab, star, stun, stag, stub, stir"),
    createBulletItem("fr: frog, from, front, fresh, free, fright, frill, freeze, fry"),
    createBulletItem("fl: flag, flat, flip, flow, flap, flock, fling, flash, flee, float"),
    createBulletItem("cl: clap, clip, clam, clog, club, clue, clown, clock, cloth"),
    createBulletItem("cr: crab, crib, crop, cram, crash, crazy, crow, cream, creep"),
    createBulletItem("dr: drum, drip, drop, draw, drag, drab, drip, dress, drift"),
    createBulletItem("sm: small, smog, smash, smell, smile, smoke"),
    createBulletItem("sw: swim, twin, trip, trap, tray, tree, try, twig, twine"),
    createBulletItem("sl: sled, slam, slim, slap, slip, slob, slow, slug, slum"),
    createBulletItem("sn: snap, snip, snug, snore, snake, snow"),
    createBulletItem("sp: spot, spin, spit, spill, spider, spoke, spring, splash"),
    createBulletItem("sk: skip, skin, skate, skull, sky, skid"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Review individual letter sounds first"),
    createBulletItem("Introduce blend as unit: /st/ sounds like 'sss' 'ttt' together"),
    createBulletItem("Present word card and model reading"),
    createBulletItem("Child reads and matches to picture"),
    createBulletItem("Use in simple sentences"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 4: Phonogram Introduction
    createSubHeading("Work 4: Phonogram Introduction"),
    createBoldParagraph("Description:"),
    createParagraph("Introduction to letter combinations. Letter combinations (digraphs and phonograms) represent single sounds despite multiple letters."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print phonogram cards with visual highlights (3\" x 5\" cards)"),
    createBulletItem("Laminate for durability"),
    createBulletItem("Picture cards for words containing phonograms"),
    createBoldParagraph("Detailed Content - Phonograms:"),
    createBulletItem("Consonant Digraphs: ch, sh, th, wh, ng, nk, ck, ph, gh"),
    createBulletItem("Vowel Digraphs: ee, oo, ai, ay, ea, ar, er, ir, or, ur"),
    createBulletItem("Silent e: make, safe, bike, hope, cute, home, rate, game"),
    createBulletItem("Other Phonograms: ow (bow/cow), ou (our/house), oi (oil/coin), oy (boy/toy), aw (saw/paw)"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Introduce one phonogram at a time"),
    createBulletItem("Explain that these letters together make one sound"),
    createBulletItem("Provide multiple word examples"),
    createBulletItem("Use Three-Period Lesson format"),
    createBulletItem("Practice blending with phonograms"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 5: Green Series
    createSubHeading("Work 5: Green Series (Phonograms)"),
    createBoldParagraph("Description:"),
    createParagraph("Reading series for words with phonograms. Building on phonogram introduction, this series presents words containing phonographic elements."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print word cards on light green card stock"),
    createBulletItem("Laminate for durability"),
    createBulletItem("Create corresponding picture cards"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Present word with highlighted phonogram"),
    createBulletItem("Identify the phonogram first: 'This says /sh/'"),
    createBulletItem("Then blend remaining letters"),
    createBulletItem("Match to picture and read in context"),
    createBulletItem("Create sentences with new words"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 6: Puzzle Words
    createSubHeading("Work 6: Puzzle Words (Sight Words)"),
    createBoldParagraph("Description:"),
    createParagraph("High-frequency words that don't follow phonetic rules. These essential words must be learned by sight since they don't follow phonetic patterns."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 4-5 years (Level I)"),
    createBulletItem("Ages 5-6 years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print word cards on varied colored card stock"),
    createBulletItem("Laminate for durability"),
    createBulletItem("Create picture cards (if applicable)"),
    createBoldParagraph("Detailed Content - Sight Words (Essential Set):"),
    createBulletItem("a, the, and, to, of, is, in, it, I, you"),
    createBulletItem("he, she, we, they, are, was, be, been, have, has"),
    createBulletItem("do, does, go, goes, make, made, said, see, say, come"),
    createBulletItem("get, give, good, great, know, like, little, live, look, may"),
    createBulletItem("me, more, my, no, not, now, old, one, only, our"),
    createBulletItem("out, own, put, same, so, some, such, take, than, that"),
    createBulletItem("the, their, them, then, there, these, they, this, those, through"),
    createBulletItem("to, two, up, use, very, want, water, way, were, what"),
    createBulletItem("when, where, which, who, will, with, work, world, would, write"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Present one word at a time"),
    createBulletItem("Explain that this word is 'tricky' and doesn't follow phonetic rules"),
    createBulletItem("Repeat word multiple times for memory"),
    createBulletItem("Use word in simple sentence"),
    createBulletItem("Create sentence cards using sight words and phonetic words"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 7: Reading Analysis
    createSubHeading("Work 7: Reading Analysis"),
    createBoldParagraph("Description:"),
    createParagraph("Analyzing words while reading. Developing awareness of word structure and patterns while reading."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("While reading, point out interesting words"),
    createBulletItem("Ask: 'What sounds do you hear?' 'What letters make that sound?'"),
    createBulletItem("Discuss word families and patterns"),
    createBulletItem("Identify new words with known phonograms"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 8: Reading Classification
    createSubHeading("Work 8: Reading Classification"),
    createBoldParagraph("Description:"),
    createParagraph("Reading and classifying words and concepts. Building vocabulary and conceptual understanding through categorization."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Category label cards (action words, animals, colors, etc.)"),
    createBulletItem("Word cards to sort into categories"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Provide category label"),
    createBulletItem("Child reads word cards"),
    createBulletItem("Sorts words into appropriate categories"),
    createBulletItem("Discuss why each word belongs in its category"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 9: Command Cards
    createSubHeading("Work 9: Command Cards (Action Reading)"),
    createBoldParagraph("Description:"),
    createParagraph("Reading commands and performing actions. The child reads action words and demonstrates understanding through physical response."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 4-5 years (Level I)"),
    createBulletItem("Ages 5-6 years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print command cards (3\" x 5\" on card stock)"),
    createBulletItem("Laminate for durability"),
    createBoldParagraph("Detailed Content - Command Words:"),
    createBulletItem("Simple Actions: run, hop, sit, walk, jump, skip, clap, wave, stand, stop, nod, spin"),
    createBulletItem("Progressive Actions: dance, march, crawl, stretch, bend, wiggle, freeze, balance, turn, roll"),
    createBulletItem("Two-Part Commands: run and jump, hop and clap, sit and wave, stand and stretch"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Present command card to child"),
    createBulletItem("Child reads command silently"),
    createBulletItem("Child performs action"),
    createBulletItem("Teacher observes and validates understanding"),
    createBulletItem("Progress to more complex commands"),
    createBulletItem("Multiple children can perform same command together"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 10: Interpretive Reading
    createSubHeading("Work 10: Interpretive Reading"),
    createBoldParagraph("Description:"),
    createParagraph("Reading with expression and interpretation. Bringing meaning and emotion to reading through expressive voice and understanding."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Model reading with expression and emotion"),
    createBulletItem("Use different voices for characters"),
    createBulletItem("Discuss how punctuation changes expression"),
    createBulletItem("Invite child to read with expression"),
    createBulletItem("Ask about character feelings and motivations"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    // Work 11: Silent Reading
    createSubHeading("Work 11: Silent Reading"),
    createBoldParagraph("Description:"),
    createParagraph("Independent silent reading practice. Developing fluency and comprehension through sustained, independent reading."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Leveled reader books (easy to complex)"),
    createBulletItem("Genre variety: fiction, nonfiction, poetry"),
    createBulletItem("Comprehension question cards (optional)"),
    createBoldParagraph("AMS Presentation Instructions:"),
    createBulletItem("Provide quiet reading time daily"),
    createBulletItem("Offer variety of book choices"),
    createBulletItem("Allow child to choose reading level"),
    createBulletItem("Later, discuss what was read"),
    createBulletItem("Celebrate reading progress regularly"),
  ];

  return paragraphs;
}

function createGrammarSection() {
  const paragraphs = [
    new Paragraph({ children: [new PageBreak()] }),
    createSectionHeading("CATEGORY 4: Grammar"),
    createParagraph("11 works introducing parts of speech and sentence structure through physical symbols and analysis."),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Work 1: Introduction to the Noun"),
    createBoldParagraph("Description:"),
    createParagraph("Understanding nouns as naming words. Nouns represent persons, places, things, or ideas. Symbolized by a black triangle."),
    createBoldParagraph("Symbol: Black triangle (large equilateral)"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Gather objects: apple, block, cat, doll, etc."),
    createBulletItem("'These are nouns. Nouns are the names of things.'"),
    createBulletItem("Point to each object: 'This is a noun. It's called a [name].'"),
    createBulletItem("Repeat with different objects and categories"),
    createBulletItem("Introduce abstract nouns: happiness, friendship, courage"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 2: Introduction to the Article"),
    createBoldParagraph("Description:"),
    createParagraph("Understanding articles (a, an, the). These small words modify nouns. Symbolized by a small light blue triangle."),
    createBoldParagraph("Symbol: Small light blue triangle"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Present sentences: 'The cat is sleeping.' 'A dog is running.'"),
    createBulletItem("'The, a, and an are articles. They go with nouns.'"),
    createBulletItem("Show article symbol (small blue triangle)"),
    createBulletItem("Demonstrate article placement before nouns"),
    createBulletItem("Three-Period Lesson for articles"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 3: Introduction to the Adjective"),
    createBoldParagraph("Description:"),
    createParagraph("Understanding adjectives as describing words. Adjectives describe nouns. Symbolized by a medium dark blue triangle."),
    createBoldParagraph("Symbol: Medium dark blue triangle"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Present objects: red apple, big block, soft cat"),
    createBulletItem("'Red, big, and soft are adjectives. They describe nouns.'"),
    createBulletItem("Point out adjectives in sentences"),
    createBulletItem("Ask: 'What word describes the noun?'"),
    createBulletItem("Demonstrate adjective placement before nouns"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 4: Introduction to the Verb"),
    createBoldParagraph("Description:"),
    createParagraph("Understanding verbs as action words. Verbs represent actions, states of being, or processes. Symbolized by a large red circle."),
    createBoldParagraph("Symbol: Large red circle"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Perform actions: run, jump, sit, stand"),
    createBulletItem("'Run, jump, sit, and stand are verbs. They are action words.'"),
    createBulletItem("Ask child to perform actions as you name them"),
    createBulletItem("Reverse: child performs and you name the verb"),
    createBulletItem("Present sentences and identify verbs"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 5: Introduction to the Adverb"),
    createBoldParagraph("Description:"),
    createParagraph("Understanding adverbs as describing words for verbs. Adverbs modify verbs, adjectives, or other adverbs. Symbolized by a small orange circle."),
    createBoldParagraph("Symbol: Small orange circle"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Perform actions differently: run quickly, walk slowly, jump happily"),
    createBulletItem("'Quickly, slowly, and happily are adverbs. They describe how we do things.'"),
    createBulletItem("Ask child to perform actions with different adverbs"),
    createBulletItem("Discuss how adverbs change the meaning of actions"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 6: Introduction to the Pronoun"),
    createBoldParagraph("Description:"),
    createParagraph("Understanding pronouns as substitute words for nouns. Pronouns replace nouns to avoid repetition. Symbolized by a purple triangle."),
    createBoldParagraph("Symbol: Purple triangle"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("'I, you, he, she, it, we, they are pronouns.'"),
    createBulletItem("Show sentences: 'Maria is playing. She is happy.'"),
    createBulletItem("'She is a pronoun. It replaces the noun Maria.'"),
    createBulletItem("Demonstrate how pronouns avoid noun repetition"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 7: Introduction to the Preposition"),
    createBoldParagraph("Description:"),
    createParagraph("Understanding prepositions showing relationships between words. Prepositions show position, direction, and time. Symbolized by a green crescent."),
    createBoldParagraph("Symbol: Green crescent"),
    createBoldParagraph("Common Prepositions:"),
    createBulletItem("in, on, under, between, beside, behind, above, below, near, far, before, after, during, at"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Demonstrate prepositions with objects: 'The block is in the box.'"),
    createBulletItem("Show various positions and name the preposition"),
    createBulletItem("Ask child to place objects according to prepositions"),
    createBulletItem("Present sentences and identify prepositions"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 8: Introduction to the Conjunction"),
    createBoldParagraph("Description:"),
    createParagraph("Understanding conjunctions as connecting words. Conjunctions join words or sentences. Symbolized by a pink rectangle."),
    createBoldParagraph("Symbol: Pink rectangle"),
    createBoldParagraph("Common Conjunctions:"),
    createBulletItem("and, but, or, because, so, if, when, while, since, unless"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Present sentences: 'Dogs and cats are animals.'"),
    createBulletItem("'And is a conjunction. It joins words together.'"),
    createBulletItem("Show how conjunctions connect ideas"),
    createBulletItem("Create sentences using different conjunctions"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 9: Introduction to the Interjection"),
    createBoldParagraph("Description:"),
    createParagraph("Understanding interjections as exclamatory words. Interjections express emotion or surprise. Symbolized by a gold keyhole."),
    createBoldParagraph("Symbol: Gold keyhole shape"),
    createBoldParagraph("Common Interjections:"),
    createBulletItem("oh, ah, wow, ouch, hooray, yay, hey, alas, bravo"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("'Oh, ah, and wow are interjections. They show feelings.'"),
    createBulletItem("Present sentences with interjections"),
    createBulletItem("Discuss emotion expressed"),
    createBulletItem("Demonstrate with physical expression"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 10: Grammar Boxes"),
    createBoldParagraph("Description:"),
    createParagraph("Sentence analysis with fill-in activities. Progressive boxes with sentences where child fills in missing words of different parts of speech."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I - Box I & II)"),
    createBulletItem("Ages 6+ years (Level II - Boxes III-VIII)"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Begin with Box I (simple nouns)"),
    createBulletItem("Child reads sentence with blank"),
    createBulletItem("Child selects appropriate noun word card"),
    createBulletItem("Places word in sentence"),
    createBulletItem("Reads complete sentence"),
    createBulletItem("Progress through boxes in sequence"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 11: Sentence Analysis"),
    createBoldParagraph("Description:"),
    createParagraph("Advanced sentence structure analysis. Diagramming sentences and understanding complex relationships between words."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 6+ years (Level I)"),
    createBulletItem("Ages 7+ years (Level II)"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Read complete sentence aloud"),
    createBulletItem("Identify subject (who) and predicate (what they do)"),
    createBulletItem("Identify each part of speech"),
    createBulletItem("Arrange sentence parts and symbols on mat"),
    createBulletItem("Discuss relationships between parts"),
    createBulletItem("Progress to complex sentences"),
  ];

  return paragraphs;
}

function createWordStudySection() {
  const paragraphs = [
    new Paragraph({ children: [new PageBreak()] }),
    createSectionHeading("CATEGORY 5: Word Study"),
    createParagraph("6 works exploring patterns, origins, and relationships between words."),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Work 1: Word Families"),
    createBoldParagraph("Description:"),
    createParagraph("Words sharing same ending pattern. Also called word families or rimes, these groups share a common vowel-final consonant pattern."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 4-5 years (Level I - basic families)"),
    createBulletItem("Ages 5-6 years (Level II - extended families)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print word cards organized by family"),
    createBulletItem("Highlight common ending in each family"),
    createBulletItem("Create word family charts"),
    createBoldParagraph("Detailed Content - Word Families:"),
    createBulletItem("-at family: bat, cat, fat, hat, mat, pat, rat, sat, that, chat, flat, spat"),
    createBulletItem("-an family: ban, can, fan, man, pan, ran, tan, van, clan, plan, scan, span"),
    createBulletItem("-ap family: cap, gap, lap, map, nap, rap, sap, tap, trap, slap, snap, wrap"),
    createBulletItem("-ig family: big, dig, fig, gig, jig, pig, rig, wig, sprig, twig"),
    createBulletItem("-op family: hop, mop, pop, sop, top, crop, drop, flop, plop, shop, stop"),
    createBulletItem("-it family: bit, fit, hit, kit, lit, pit, sit, wit, grit, knit, skit, split"),
    createBulletItem("-ot family: cot, dot, got, hot, jot, lot, not, pot, rot, plot, knot, shot, spot"),
    createBulletItem("-un family: bun, dun, fun, gun, nun, pun, run, sun, shun, spun, stun"),
    createBulletItem("-ug family: bug, dug, hug, jug, mug, pug, rug, tug, chug, drug, plug, slug"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Present family words with highlighted ending"),
    createBulletItem("Read and emphasize common sound"),
    createBulletItem("Child reads all words in family"),
    createBulletItem("Discuss how changing first letter(s) changes the word"),
    createBulletItem("Create sentences using family words"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 2: Spelling Rules"),
    createBoldParagraph("Description:"),
    createParagraph("Common spelling patterns and rules that govern English spelling."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("Common Rules:"),
    createBulletItem("Silent e: makes vowel long (make, hope, cute, time, rope)"),
    createBulletItem("Doubling: before adding -ing to short vowel words (run→running, cut→cutting, sit→sitting)"),
    createBulletItem("Y to I: change y to i before adding -es or -ed (happy→happies, cry→cried)"),
    createBulletItem("CVC doubling: short vowel words double final consonant (hop→hopped, plan→planned)"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Introduce one rule at a time"),
    createBulletItem("Provide multiple examples"),
    createBulletItem("Practice applying rule to new words"),
    createBulletItem("Create word cards showing before/after rule application"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 3: Compound Words"),
    createBoldParagraph("Description:"),
    createParagraph("Words made of two smaller words. Understanding that two words can combine to create a new word with new meaning."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 4-5 years (Level I)"),
    createBulletItem("Ages 5-6 years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print word cards for compound word parts"),
    createBulletItem("Create cards for whole compound words"),
    createBulletItem("Matching activity materials"),
    createBoldParagraph("Examples:"),
    createBulletItem("Compound Words: airplane, airport, backpack, baseball, bedroom, butterfly, cannot, daylight, doorbell, downtown"),
    createBulletItem("More: earthquake, everybody, football, goldfish, grandmother, grandfather, hamburger, homework, hotdog, lifetime"),
    createBulletItem("Advanced: moonlight, notebook, outside, pancake, playground, rainbow, sailboat, scarecrow, seashell, snowflake, something, sunflower, sunshine, toothbrush, watermelon, without"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Present compound word visually separated: base ball → baseball"),
    createBulletItem("'This is two words put together: ball and base make baseball.'"),
    createBulletItem("Discuss meaning changes from original words"),
    createBulletItem("Match compound word to its two parts"),
    createBulletItem("Create new compounds (silly and real)"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 4: Prefixes and Suffixes"),
    createBoldParagraph("Description:"),
    createParagraph("Word parts that change meaning (prefixes) or add meaning (suffixes)."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("Common Prefixes:"),
    createBulletItem("un-: unhappy, unlock, undo, unsafe, uncommon, unfair, unclear, unwell"),
    createBulletItem("re-: redo, rerun, reread, rearrange, replay, rewind, return, rebuild"),
    createBulletItem("pre-: preview, preheat, precook, preschool, pretest"),
    createBulletItem("dis-: dishonest, dislike, discolor, discover"),
    createBoldParagraph("Common Suffixes:"),
    createBulletItem("-ed: wanted, played, jumped, closed, dressed, looked, marked, packed"),
    createBulletItem("-ing: running, jumping, playing, looking, sitting, eating, dancing, singing"),
    createBulletItem("-s/-es: cats, dogs, boxes, dishes, glasses, wishes, buses, churches"),
    createBulletItem("-er: runner, player, teacher, worker, singer, dancer, maker"),
    createBulletItem("-est: fastest, slowest, biggest, smallest, prettiest, happiest"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Introduce prefix or suffix with meaning"),
    createBulletItem("Show how prefix/suffix changes word meaning"),
    createBulletItem("Build words by adding prefix/suffix to base words"),
    createBulletItem("Create word lists showing prefix/suffix patterns"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 5: Synonyms and Antonyms"),
    createBoldParagraph("Description:"),
    createParagraph("Words with similar meanings (synonyms) and opposite meanings (antonyms). Understanding relationships between words."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print word cards for matching activities"),
    createBulletItem("Create synonym and antonym cards"),
    createBoldParagraph("Examples - Synonyms:"),
    createBulletItem("happy/glad, sad/unhappy, big/large, small/tiny, fast/quick, slow/sluggish"),
    createBulletItem("beautiful/pretty, ugly/hideous, cold/freezing, hot/scorching, dirty/filthy"),
    createBulletItem("smart/intelligent, dumb/foolish, angry/furious, scared/frightened, tired/exhausted"),
    createBoldParagraph("Examples - Antonyms:"),
    createBulletItem("hot/cold, big/small, happy/sad, fast/slow, day/night, light/dark"),
    createBulletItem("clean/dirty, stop/go, inside/outside, up/down, in/out, over/under"),
    createBulletItem("front/back, right/left, full/empty, old/new, wet/dry, good/bad"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Introduce synonyms first (similar meanings)"),
    createBulletItem("Provide pairs and demonstrate similarity"),
    createBulletItem("Child matches synonym pairs"),
    createBulletItem("Discuss how words are similar but not identical"),
    createBulletItem("Then introduce antonyms (opposite meanings)"),
    createBulletItem("Match antonym pairs"),
    createBulletItem("Create sentences using synonyms and antonyms"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Work 6: Homonyms"),
    createBoldParagraph("Description:"),
    createParagraph("Words that sound the same but differ in meaning and spelling (homophones) or same spelling with different meanings (homographs)."),
    createBoldParagraph("Levels:"),
    createBulletItem("Ages 5-6 years (Level I)"),
    createBulletItem("Ages 6+ years (Level II)"),
    createBoldParagraph("Materials to Make:"),
    createBulletItem("Print word cards with homophones"),
    createBulletItem("Create picture cards showing different meanings"),
    createBulletItem("Sentence cards using each homonym correctly"),
    createBoldParagraph("Homophones (sound the same, different meaning/spelling):"),
    createBulletItem("to/too/two: 'I go to school.' 'That's too hot.' 'I have two books.'"),
    createBulletItem("their/there/they're: 'That's their house.' 'Put it there.' 'They're coming.'"),
    createBulletItem("here/hear: 'Come here.' 'I can hear you.'"),
    createBulletItem("meet/meat: 'Nice to meet you.' 'I eat meat.'"),
    createBulletItem("for/four: 'This is for you.' 'I have four toys.'"),
    createBulletItem("be/bee: 'I want to be happy.' 'A bee makes honey.'"),
    createBulletItem("no/know: 'I said no.' 'Do you know?'"),
    createBulletItem("road/rode: 'We drove down the road.' 'She rode a bike.'"),
    createBulletItem("write/right: 'I write stories.' 'That's the right answer.'"),
    createBulletItem("sun/son: 'The sun is bright.' 'He is my son.'"),
    createBoldParagraph("AMS Presentation:"),
    createBulletItem("Introduce homophone pair"),
    createBulletItem("Explain they sound the same but mean different things"),
    createBulletItem("Show pictures for each meaning"),
    createBulletItem("Present sentences using each homophone correctly"),
    createBulletItem("Child reads and identifies which homophone is used"),
    createBulletItem("Create sentences using different homophones"),
  ];

  return paragraphs;
}

function createSuppliesList() {
  const paragraphs = [
    new Paragraph({ children: [new PageBreak()] }),
    createSectionHeading("Master Shopping and Supplies List"),
    createParagraph("Complete inventory of materials needed for all 43 Language works."),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Paper and Card Stock"),
    createBulletItem("White card stock (8.5\" x 11\") - 500 sheets"),
    createBulletItem("Pink card stock (8.5\" x 11\") - 250 sheets"),
    createBulletItem("Blue card stock (8.5\" x 11\") - 250 sheets"),
    createBulletItem("Green card stock (8.5\" x 11\") - 250 sheets"),
    createBulletItem("Glossy photo paper (4\" x 6\") - 100 sheets"),
    createBulletItem("Unlined white paper - 1000 sheets"),
    createBulletItem("Writing paper with lines (1\" spacing) - 500 sheets"),
    createBulletItem("Newsprint or practice paper - 500 sheets"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Lamination and Binding"),
    createBulletItem("Laminating pouches (3-mil) 8.5\" x 11\" - 500 count"),
    createBulletItem("Laminating pouches (3-mil) 4\" x 6\" - 250 count"),
    createBulletItem("Laminating pouches (5-mil) for durability - 100 count"),
    createBulletItem("Laminator machine (hot)"),
    createBulletItem("Laminating trimmer or rotary cutter"),
    createBulletItem("Brads, rings, or binding for notebooks"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Writing and Coloring Tools"),
    createBulletItem("Colored pencil set (24 colors) - 5 boxes"),
    createBulletItem("Colored pencil set (12 colors) - 10 boxes"),
    createBulletItem("Pencil sharpener (electric or manual)"),
    createBulletItem("Pencil grips (ergonomic) - 24 pack"),
    createBulletItem("HB pencils (primary size) - 72 count"),
    createBulletItem("Chalk (assorted colors) - 48 sticks"),
    createBulletItem("Whiteboard markers (assorted) - 24 pack"),
    createBulletItem("Crayons (24 colors) - 5 boxes"),
    createBulletItem("Markers (fine-tip) - 24 pack"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Writing Surfaces and Tools"),
    createBulletItem("Chalkboard (large, 24\" x 36\" or larger) - 1"),
    createBulletItem("Easel stand for chalkboard"),
    createBulletItem("Whiteboard (24\" x 36\") - 1 or 2"),
    createBulletItem("Sand tray (12\" x 18\" wooden) - 1 or 2"),
    createBulletItem("Fine sand or kinetic sand (5-10 lb bags) - 2"),
    createBulletItem("Sand tray liners or wax paper"),
    createBulletItem("Stylus or wooden sticks for sand writing"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Montessori-Specific Materials"),
    createSubHeading("Metal Insets"),
    createBulletItem("Metal Inset set with 10 geometric shapes and frames - 1 set"),
    createBulletItem("Metal inset paper pad (100 sheets)"),
    createBulletItem("Metal inset storage box with lids"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Sandpaper Letters"),
    createBulletItem("Sandpaper sheets (assorted grits) - 25 pack"),
    createBulletItem("Wooden boards (5\" x 7\") or mounting cardstock"),
    createBulletItem("Wood stain or paint (red, blue, natural) - 3 bottles"),
    createBulletItem("Sandpaper letter set (pre-made, alternative) - 1 set"),
    createBulletItem("Letter storage box"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Moveable Alphabet"),
    createBulletItem("Wooden or plastic lowercase letter set (blue consonants, red vowels) - 2 sets"),
    createBulletItem("Letter storage box with compartments (26+ compartments)"),
    createBulletItem("Word building cards or mat"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Miniature Objects and Picture Cards"),
    createBulletItem("Miniature object set (animals, household, foods) - 3-5 sets"),
    createBulletItem("Plastic toy animals (farm, wild, domestic) - 2 sets"),
    createBulletItem("Plastic toy vehicles (cars, trucks, airplanes) - 1 set"),
    createBulletItem("Picture card sets (Montessori-style classified cards) - 5-8 sets"),
    createBulletItem("Photography or images for custom cards"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Storage and Organization"),
    createBulletItem("Wooden boxes (various sizes) for card storage - 15-20"),
    createBulletItem("Baskets (wicker or canvas) - 10-15"),
    createBulletItem("Storage shelving units - 2-3"),
    createBulletItem("Clear plastic containers with lids (various sizes) - 20"),
    createBulletItem("Dividers and compartments"),
    createBulletItem("Labels and label maker"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createSubHeading("Optional Enhancements"),
    createBulletItem("Poster board (assorted colors) - 25 pack"),
    createBulletItem("Clipboards - 5"),
    createBulletItem("Index cards (assorted sizes) - 1000 count"),
    createBulletItem("Sticky notes (assorted colors) - 5 pads"),
    createBulletItem("Document sleeves (letter size) - 50 pack"),
    createBulletItem("Ring binders (1-3 inch) - 10"),
    createBulletItem("Brass fasteners/brads - box of 100"),
    createBulletItem("Scotch tape, masking tape, painter's tape"),
    createBulletItem("Glue stick and liquid glue"),
    createBulletItem("Stapler, staples, hole punch"),
    createBulletItem("Scissors (child-safe and adult) - multiple"),
    createBulletItem("Ruler and measuring tape"),
    createBulletItem("Eraser (pencil and whiteboard) - 5 of each"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Storage and Organization by Category"),
    createBoldParagraph("Oral Language:"),
    createBulletItem("Baskets for objects and picture cards"),
    createBulletItem("Storage boxes for Classified Cards (one per category)"),
    createBulletItem("Feely bags (cloth pouches for Sound Games)"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createBoldParagraph("Writing Preparation:"),
    createBulletItem("Metal Inset storage box"),
    createBulletItem("Sandpaper Letter storage box with dividers"),
    createBulletItem("Sand tray with liner"),
    createBulletItem("Wooden or metal chalkboard with storage for chalk/erasers"),
    createBulletItem("Moveable Alphabet storage with labeled compartments"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createBoldParagraph("Reading:"),
    createBulletItem("Separate boxes for Pink, Blue, Green series"),
    createBulletItem("Object Box set (labeled: Pink, Blue, Green)"),
    createBulletItem("Shelf for leveled reader books"),
    createBulletItem("Storage for Command Cards and Puzzle Words"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createBoldParagraph("Grammar:"),
    createBulletItem("Grammar symbol sets (purchase or create with cardstock and paint)"),
    createBulletItem("Storage for Grammar Boxes I-VIII"),
    createBulletItem("Sentence analysis mats"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } }),

    createBoldParagraph("Word Study:"),
    createBulletItem("Word Family card storage boxes"),
    createBulletItem("Prefix/Suffix card storage"),
    createBulletItem("Synonym/Antonym card set boxes"),
    createBulletItem("Homonym card storage"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createSubHeading("Estimated Budget Breakdown"),
    createBoldParagraph("Paper and Card Stock:"),
    createBulletItem("Estimated cost: $75-100"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 100 } }),

    createBoldParagraph("Lamination:"),
    createBulletItem("Estimated cost: $150-200 (includes machine and pouches)"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 100 } }),

    createBoldParagraph("Writing Tools:"),
    createBulletItem("Estimated cost: $100-150"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 100 } }),

    createBoldParagraph("Montessori-Specific Materials:"),
    createBulletItem("Estimated cost: $300-500"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 100 } }),

    createBoldParagraph("Miniature Objects and Pictures:"),
    createBulletItem("Estimated cost: $150-250"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 100 } }),

    createBoldParagraph("Storage and Organization:"),
    createBulletItem("Estimated cost: $200-300"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 100 } }),

    createBoldParagraph("Optional Enhancements:"),
    createBulletItem("Estimated cost: $100-150"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 100 } }),

    createBoldParagraph("TOTAL ESTIMATED COST: $1,075 - $1,650"),
    new Paragraph({ children: [new TextRun("")], spacing: { after: 200 } }),

    createParagraph("Note: This estimate is for complete implementation of all 43 Language works. Costs can be reduced by:"),
    createBulletItem("Starting with select works and expanding gradually"),
    createBulletItem("Creating your own materials instead of purchasing pre-made sets"),
    createBulletItem("Using materials you already have (household items, pictures from magazines)"),
    createBulletItem("Purchasing used Montessori materials from online marketplaces"),
  ];

  return paragraphs;
}

// Combine all sections
async function generateDocument() {
  const sections = {
    properties: {
      page: {
        size: {
          width: 12240,  // US Letter
          height: 15840
        },
        margin: {
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440
        }
      }
    },
    children: [
      ...createTitlePage(),
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        children: [new TextRun({ text: "Table of Contents", bold: true, size: 32 })],
        spacing: { after: 200 }
      }),
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
      ...createOralLanguageSection(),
      ...createWritingPreparationSection(),
      ...createReadingSection(),
      ...createGrammarSection(),
      ...createWordStudySection(),
      ...createSuppliesList(),
    ]
  };

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: "bullet",
              text: "•",
              alignment: "left",
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 }
                }
              }
            }
          ]
        }
      ]
    },
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 24 }
        }
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 }
        }
      ]
    },
    sections: [sections]
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    console.error("Error packing document:", error);
    throw error;
  }
}

// Main execution
generateDocument().then(buffer => {
  const file1 = "/sessions/tender-awesome-hypatia/mnt/whale/Montessori_Language_Making_Guide.docx";
  const file2 = "/sessions/tender-awesome-hypatia/mnt/whale/public/guides/Montessori_Language_Making_Guide.docx";

  fs.writeFileSync(file1, buffer);
  console.log(`✓ Document created: ${file1}`);
  console.log(`  Size: ${buffer.length} bytes`);

  // Verify it's a valid ZIP file (docx is a ZIP)
  const header = buffer.slice(0, 4).toString('hex');
  console.log(`  ZIP header: ${header} (should be 504b0304 for valid docx)`);

  // Try to create the second location too
  try {
    fs.mkdirSync("/sessions/tender-awesome-hypatia/mnt/whale/public/guides", { recursive: true });
    fs.writeFileSync(file2, buffer);
    console.log(`✓ Document copied to: ${file2}`);
  } catch (err) {
    console.error(`Note: Could not write to second location: ${err.message}`);
  }
}).catch(error => {
  console.error("Error generating document:", error);
  process.exit(1);
});
