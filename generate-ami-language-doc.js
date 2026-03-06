#!/usr/bin/env node
// Generate AMI English Language Progression — COMPREHENSIVE GUIDE
// Every work, every object, every step, every word list. Pure AMI methodology.
// Run: node generate-ami-language-doc.js
// Requires: npm install docx

const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  Header, Footer, PageNumber, PageBreak, LevelFormat } = require('docx');

// ===== HELPERS =====
const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function cell(text, width, opts = {}) {
  const runs = Array.isArray(text)
    ? text
    : [new TextRun({ text, size: 22, bold: !!opts.bold, font: 'Cambria', color: opts.textColor || '333333' })];
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    verticalAlign: opts.valign || VerticalAlign.TOP,
    children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: runs })],
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, font: 'Cambria' })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, font: 'Cambria' })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 110 },
    children: [new TextRun({ text, font: 'Cambria' })] });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after || 120, line: 276 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [new TextRun({ text, size: 22, font: 'Cambria', bold: !!opts.bold, italics: !!opts.italic, color: opts.color || '333333' })],
  });
}

function multiRun(runs) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: runs.map(r => new TextRun({ text: r.text, size: r.size || 22, font: 'Cambria', bold: !!r.bold, italics: !!r.italic, color: r.color || '333333' })),
  });
}

function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 60, line: 276 },
    children: Array.isArray(text) ? text.map(r => new TextRun({ text: r.text, size: 22, font: 'Cambria', bold: !!r.bold, italics: !!r.italic, color: r.color || '333333' }))
      : [new TextRun({ text, size: 22, font: 'Cambria', bold: !!opts.bold, italics: !!opts.italic, color: opts.color || '333333' })],
  });
}

let _numInst = 0;
function numbered(text, opts = {}) {
  if (opts.restart) _numInst++;
  return new Paragraph({
    numbering: { reference: 'numbered', level: 0, instance: _numInst },
    spacing: { after: 60, line: 276 },
    children: Array.isArray(text) ? text.map(r => new TextRun({ text: r.text, size: 22, font: 'Cambria', bold: !!r.bold, italics: !!r.italic, color: r.color || '333333' }))
      : [new TextRun({ text, size: 22, font: 'Cambria', bold: !!opts.bold, color: opts.color || '333333' })],
  });
}

function tipBox(title, text) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [new TableRow({ children: [
      new TableCell({
        borders: { top: { style: BorderStyle.SINGLE, size: 1, color: '4CAF50' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: '4CAF50' },
          left: { style: BorderStyle.SINGLE, size: 6, color: '4CAF50' }, right: { style: BorderStyle.SINGLE, size: 1, color: '4CAF50' } },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: 'F1F8E9', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 200, right: 200 },
        children: [new Paragraph({ spacing: { after: 60 }, children: [
          new TextRun({ text: title + ': ', size: 22, font: 'Cambria', bold: true, color: '2E7D32' }),
          new TextRun({ text, size: 22, font: 'Cambria', color: '333333' }),
        ] })],
      }),
    ] })],
  });
}

function amiNote(text) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [new TableRow({ children: [
      new TableCell({
        borders: { top: { style: BorderStyle.SINGLE, size: 1, color: '1565C0' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: '1565C0' },
          left: { style: BorderStyle.SINGLE, size: 6, color: '1565C0' }, right: { style: BorderStyle.SINGLE, size: 1, color: '1565C0' } },
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: 'E3F2FD', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 200, right: 200 },
        children: [new Paragraph({ spacing: { after: 60 }, children: [
          new TextRun({ text: 'AMI Note: ', size: 22, font: 'Cambria', bold: true, color: '1565C0' }),
          new TextRun({ text, size: 22, font: 'Cambria', italics: true, color: '333333' }),
        ] })],
      }),
    ] })],
  });
}

function pb() { return new Paragraph({ children: [new PageBreak()] }); }
function sp() { return para('', { after: 60 }); }

// ===== DOCUMENT =====
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Cambria', size: 22, color: '333333' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Cambria', color: '1a5632' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Cambria', color: '2d7a4f' },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Cambria', color: '555555' },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbered', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'AMI English Language Progression \u2014 Comprehensive Guide', size: 18, font: 'Cambria', color: '999999', italics: true })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Page ', size: 18, font: 'Cambria', color: '999999' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Cambria', color: '999999' })],
      })] }),
    },
    children: [

      // ============================================================
      // TITLE PAGE
      // ============================================================
      sp(), sp(), sp(), sp(), sp(), sp(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [
        new TextRun({ text: 'AMI English Language Progression', size: 56, bold: true, font: 'Cambria', color: '1a5632' }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
        new TextRun({ text: 'The Complete Guide', size: 32, font: 'Cambria', color: '2d7a4f', italics: true }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
        new TextRun({ text: '43 Works \u00B7 5 Categories \u00B7 Every Object \u00B7 Every Word \u00B7 Every Step', size: 22, font: 'Cambria', color: '666666' }),
      ] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: '1a5632', space: 1 } },
        spacing: { after: 300 }, children: [],
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
        new TextRun({ text: 'Based on Pure AMI (Association Montessori Internationale) Methodology', size: 22, font: 'Cambria', color: '888888' }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
        new TextRun({ text: 'As Taught in AMI Training Centres Worldwide', size: 22, font: 'Cambria', color: '888888' }),
      ] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [
        new TextRun({ text: 'Prepared for Montree \u00B7 2026', size: 22, font: 'Cambria', color: 'AAAAAA' }),
      ] }),

      // ============================================================
      // PART I: THE BIG PICTURE
      // ============================================================
      pb(),
      h1('Part I: The Big Picture'),

      h2('How Language Unfolds in AMI'),
      multiRun([
        { text: 'AMI language follows the child\u2019s natural development. The fundamental principle is: ' },
        { text: 'the ear trains before the hand writes, and the hand writes before the eye reads.', bold: true },
      ]),
      para('This is not arbitrary. It follows how children actually learn language: they HEAR it first (from birth), they SPEAK it next (around 12-18 months), they WRITE before they read (because encoding \u2014 putting down a known sound as a symbol \u2014 is easier than decoding \u2014 seeing an unknown symbol and figuring out the sound).'),
      sp(),
      para('The complete sequence:', { bold: true }),
      para('Sound \u2192 Symbol \u2192 Word \u2192 Sentence \u2192 Grammar \u2192 Word Study', { bold: true, color: '1a5632' }),
      sp(),
      para('Every step builds on the one before it. Nothing is skipped. A child who cannot hear individual phonemes in words has no business looking at sandpaper letters. A child who cannot segment "cat" into /k/-/a/-/t/ has no business using the moveable alphabet. The progression is non-negotiable.'),

      sp(),
      h2('The 5 Categories'),
      para('AMI organises the English language curriculum into 5 categories, each with specific works:'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [500, 2400, 700, 6120],
        rows: [
          new TableRow({ children: [
            cell('#', 500, { bold: true, fill: 'E8F5E9', center: true }),
            cell('Category', 2400, { bold: true, fill: 'E8F5E9' }),
            cell('Works', 700, { bold: true, fill: 'E8F5E9', center: true }),
            cell('What It Covers', 6120, { bold: true, fill: 'E8F5E9' }),
          ] }),
          new TableRow({ children: [
            cell('1', 500, { center: true }), cell('Oral Language', 2400, { bold: true }),
            cell('8', 700, { center: true }), cell('Vocabulary enrichment, classified cards, object-to-picture matching, sound games (I Spy), rhyming activities, storytelling/sequencing, poems/songs/fingerplays, conversation/discussion', 6120),
          ] }),
          new TableRow({ children: [
            cell('2', 500, { center: true }), cell('Writing Preparation', 2400, { bold: true }),
            cell('7', 700, { center: true }), cell('Metal insets (10 shapes, 10 exercises), sandpaper letters (6 groups), sand tray, chalkboard, moveable alphabet (~155 letters), handwriting on paper, creative writing', 6120),
          ] }),
          new TableRow({ children: [
            cell('3', 500, { center: true }), cell('Reading', 2400, { bold: true }),
            cell('11', 700, { center: true }), cell('Object boxes, Pink Series (CVC), Blue Series (blends), phonogram introduction (16+ phonograms), Green Series, puzzle words, reading analysis, classification, command cards, interpretive reading, silent reading', 6120),
          ] }),
          new TableRow({ children: [
            cell('4', 500, { center: true }), cell('Grammar', 2400, { bold: true }),
            cell('11', 700, { center: true }), cell('9 parts of speech with physical symbols + games (noun/article/adjective/verb/adverb/pronoun/preposition/conjunction/interjection), Grammar Boxes I\u2013VIII, sentence analysis with question arrows', 6120),
          ] }),
          new TableRow({ children: [
            cell('5', 500, { center: true }), cell('Word Study', 2400, { bold: true }),
            cell('6', 700, { center: true }), cell('Word families (-at, -an, -ig, etc.), spelling rules (doubling, silent E, Y-to-I), compound words, prefixes/suffixes, synonyms/antonyms, homonyms', 6120),
          ] }),
        ],
      }),

      sp(),
      h2('Writing Before Reading \u2014 Maria Montessori\u2019s Discovery'),
      multiRun([
        { text: 'Montessori discovered that children could ' },
        { text: 'write before they could read', bold: true },
        { text: '. This shocked the educational world in 1907. But the logic is simple:' },
      ]),
      bullet([{ text: 'Writing is ENCODING: ', bold: true }, { text: 'The child already KNOWS the sound "k" and puts down the letter c. They go from known \u2192 unknown. This is easier.' }]),
      bullet([{ text: 'Reading is DECODING: ', bold: true }, { text: 'The child sees the letter c (unknown) and must recall the sound "k". They go from unknown \u2192 known. This is harder.' }]),
      sp(),
      para('So the AMI sequence teaches the child to BUILD words (with the moveable alphabet) before asking them to READ words. The "explosion into writing" \u2014 where the child suddenly writes their first word \u2014 typically happens before the child reads their first word.'),

      // ============================================================
      // PART II: ORAL LANGUAGE DEVELOPMENT
      // ============================================================
      pb(),
      h1('Part II: Oral Language Development (Ages 2.5\u20134)'),
      para('Before any letters or writing, the child must develop a rich spoken vocabulary and learn to hear individual sounds within words. This entire stage happens through the EAR \u2014 no written symbols at all. There are 8 works.'),

      // --- 2.1 Vocabulary Enrichment ---
      h2('Work 1: Vocabulary Enrichment'),
      para('Age: 2.5+ (ongoing throughout all levels)', { italic: true, color: '666666' }),
      sp(),
      para('The teacher floods the child with language. Every interaction is a vocabulary lesson. Real objects are named precisely: not "bird" but "robin"; not "tree" but "oak." The child absorbs vocabulary passively at first, then actively uses new words.'),
      sp(),
      h3('The Three-Period Lesson'),
      para('This technique is used HUNDREDS of times across the entire language curriculum. It is the foundational teaching method for naming anything:', { bold: true }),
      sp(),
      numbered([{ text: 'Period 1 \u2014 NAMING (teacher introduces): ', bold: true }, { text: '"This is a pomegranate." Teacher holds up the object, says the name clearly, lets the child handle it. Repeat 2\u20133 times.' }], { restart: true }),
      numbered([{ text: 'Period 2 \u2014 RECOGNITION (teacher tests receptive knowledge): ', bold: true }, { text: '"Show me the pomegranate." "Can you point to the pomegranate?" The child identifies the object from a group of 2\u20133. This is the longest period \u2014 repeat many times over days.' }]),
      numbered([{ text: 'Period 3 \u2014 RECALL (teacher tests expressive knowledge): ', bold: true }, { text: '"What is this?" Teacher holds up the object, child names it. Only attempt this when Period 2 is solid.' }]),
      sp(),
      amiNote('If the child fails Period 3, do NOT correct them. Simply return to Period 1 ("This is a pomegranate") and try again another day. The child should never feel they have failed.'),
      sp(),
      h3('Categories for Vocabulary'),
      bullet('Animals: farm animals, wild animals, ocean creatures, birds, insects, reptiles'),
      bullet('Fruits and vegetables: common and exotic (mango, kiwi, artichoke, pomegranate)'),
      bullet('Household objects: kitchen utensils, tools, furniture, clothing items'),
      bullet('Transportation: land, water, air vehicles'),
      bullet('Body parts: external, then internal organs (heart, lungs, brain)'),
      bullet('Musical instruments, professions, buildings, landforms, weather'),
      sp(),
      tipBox('Tip', 'Use REAL objects whenever possible. A real apple is better than a picture of an apple. A real feather is better than a plastic one. The child learns through sensorial experience first, abstraction second.'),

      // --- 2.2 Classified Cards ---
      h2('Work 2: Classified Cards (Nomenclature Cards)'),
      para('Age: 2.5\u20134', { italic: true, color: '666666' }),
      sp(),
      para('Picture cards sorted by category. Three types:'),
      numbered([{ text: 'Identical Matching Cards: ', bold: true }, { text: 'Two identical sets of pictures. Child matches pairs. (Age 2.5+)' }], { restart: true }),
      numbered([{ text: 'Classified Cards with Labels: ', bold: true }, { text: 'Cards grouped by category (e.g., 6 fruit cards). Teacher names them using Three-Period Lesson. (Age 3+)' }]),
      numbered([{ text: 'Definition Cards: ', bold: true }, { text: 'Picture, label, and definition paragraph on separate cards. Child matches picture \u2192 label \u2192 definition. (Age 5+, after reading)' }]),
      sp(),
      h3('Specific Categories and Objects'),
      bullet([{ text: 'Animals: ', bold: true }, { text: 'cow, horse, pig, sheep, chicken, duck, goat (farm); lion, elephant, giraffe, zebra, tiger, bear (wild); whale, dolphin, shark, octopus, starfish, turtle (ocean)' }]),
      bullet([{ text: 'Fruits: ', bold: true }, { text: 'apple, banana, orange, grape, strawberry, watermelon, pineapple, mango, kiwi, pomegranate, fig, lemon' }]),
      bullet([{ text: 'Vegetables: ', bold: true }, { text: 'carrot, potato, tomato, onion, broccoli, pea, corn, pepper, lettuce, cucumber, pumpkin' }]),
      bullet([{ text: 'Vehicles: ', bold: true }, { text: 'car, bus, truck, bicycle, motorcycle, train, airplane, helicopter, boat, submarine' }]),

      // --- 2.3 Object to Picture Matching ---
      h2('Work 3: Object to Picture Matching'),
      para('Age: 2.5\u20133.5', { italic: true, color: '666666' }),
      sp(),
      para('The child matches real miniature 3D objects to their 2D picture representations. This is a critical abstraction step:'),
      bullet([{ text: 'The child learns that a flat image can represent a real thing. ', bold: true }, { text: 'This same principle applies later when a written word represents a spoken one.' }]),
      sp(),
      h3('Materials'),
      bullet('A basket of miniature objects (10\u201315 realistic miniatures)'),
      bullet('Corresponding picture cards (photographs, not cartoons)'),
      sp(),
      h3('Presentation'),
      numbered('Lay out 3 picture cards on the mat.', { restart: true }),
      numbered('Place the matching objects in a small basket beside the mat.'),
      numbered('Pick up one object. "This is a cow." Place it on the picture of a cow.'),
      numbered('Invite the child to match the remaining objects.'),
      numbered('Gradually increase to 5, then 10 pairs.'),

      // --- 2.4 Sound Games ---
      pb(),
      h2('Work 4: Sound Games (I Spy)'),
      para('Age: 2.5\u20134', { italic: true, color: '666666' }),
      sp(),
      para('This is the SINGLE MOST IMPORTANT oral language work. Everything downstream \u2014 sandpaper letters, moveable alphabet, reading \u2014 depends on the child being able to hear individual sounds (phonemes) within words.', { bold: true }),
      sp(),
      amiNote('Always use the SOUND of the letter, never the letter NAME. Say "/k/" (the sound), not "see" (the name). Say "/s/" not "ess." Say "/m/" not "em." The child is learning to hear sounds, not to recite an alphabet.'),
      sp(),

      h3('Materials for Sound Games'),
      para('A collection of small objects on a mat (or in a basket). Use 3\u20135 objects per game initially. Objects should be familiar to the child and have clear, unambiguous initial sounds.', { bold: true }),
      sp(),
      para('Specific objects organised by initial sound:', { bold: true }),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [1000, 8720],
        rows: [
          new TableRow({ children: [
            cell('Sound', 1000, { bold: true, fill: 'E8F5E9', center: true }),
            cell('Objects (miniatures or real items)', 8720, { bold: true, fill: 'E8F5E9' }),
          ] }),
          ...([
            ['/b/', 'ball, bus, bear, button, bell, boat, bag, book, banana, bat, box, bed, bird, bee, bead'],
            ['/k/', 'cat, cup, car, cow, cap, can, key, kite, comb, coin, cake, candle, cork'],
            ['/d/', 'dog, duck, doll, door, dish, drum, dice, deer, dinosaur, domino'],
            ['/f/', 'fish, fan, fox, fork, fig, feather, frog, flag, flower, fence'],
            ['/g/', 'goat, gum, gate, glass, girl, grapes, gift, ghost, globe'],
            ['/h/', 'hat, hen, horse, house, hammer, hook, heart, hippo, hose'],
            ['/j/', 'jar, jam, jug, jet, jewel, jack (toy), jigsaw piece'],
            ['/l/', 'log, lid, lamp, leaf, lemon, lock, lion, leg, letter, lizard, lip'],
            ['/m/', 'mat, mop, map, mouse, mirror, mug, monkey, moon, marble, mask, mitt'],
            ['/n/', 'nut, net, nail, nose, nest, necklace, notebook, needle'],
            ['/p/', 'pen, pin, pig, pot, peg, pan, pear, plate, plum, pillow, penguin'],
            ['/r/', 'rug, ring, rock, rope, rabbit, rain(coat), ribbon, robot, rose'],
            ['/s/', 'sun, sock, soap, saw, seal, sink, snail, spider, spoon, star, stamp'],
            ['/t/', 'top, tin, tap, tub, tent, tooth, tiger, truck, train, tree, turtle'],
            ['/w/', 'web, wig, worm, watch, wagon, walnut, whale, wing, well'],
            ['/z/', 'zip, zoo, zebra, zigzag, zero'],
          ].map(([sound, objs]) =>
            new TableRow({ children: [
              cell(sound, 1000, { center: true, fill: 'F9FBE7' }),
              cell(objs, 8720),
            ] })
          )),
        ],
      }),

      sp(),
      h3('The 6 Levels of Sound Games'),
      sp(),

      para('LEVEL 1 \u2014 INITIAL SOUND ISOLATION', { bold: true, color: '1a5632' }),
      para('Place 3 objects on the mat (e.g., cat, mop, sun). Say: "I spy with my little eye something beginning with /k/." The child picks up the cat.'),
      numbered('Start with just 3 objects whose initial sounds are very different (/k/, /m/, /s/).', { restart: true }),
      numbered('Gradually increase to 5 objects.'),
      numbered('Progress to objects with more similar sounds (/b/ and /d/, /f/ and /v/).'),
      sp(),

      para('LEVEL 2 \u2014 ENDING SOUND ISOLATION', { bold: true, color: '1a5632' }),
      para('Same objects. "I spy something ending with /t/." Child picks up the cat. This is harder because English speakers attend to beginnings of words more naturally.'),
      sp(),

      para('LEVEL 3 \u2014 MIDDLE (MEDIAL) SOUND', { bold: true, color: '1a5632' }),
      para('"I spy something with /a/ (short a) in the middle." Child picks up cat (c-a-t). Only use CVC words for this level.'),
      sp(),

      para('LEVEL 4 \u2014 BLENDING (ORAL)', { bold: true, color: '1a5632' }),
      para('No objects needed. "Robot talk" \u2014 the teacher says each sound separately: "/k/ \u2026 /a/ \u2026 /t/. What word am I saying?" Child blends and says "cat!" Start with 2-second pauses between sounds, gradually shorten to rapid blending.'),
      sp(),

      para('LEVEL 5 \u2014 SEGMENTING (ORAL)', { bold: true, color: '1a5632' }),
      para('"Can you break \u2018cat\u2019 into its tiny sounds?" Child says "/k/ \u2026 /a/ \u2026 /t/." Use Elkonin boxes (3 squares drawn on paper) with counters \u2014 the child pushes one counter into each box as they say each sound.'),
      sp(),

      para('LEVEL 6 \u2014 SOUND SORTING', { bold: true, color: '1a5632' }),
      para('Two boxes labelled with letters (but the child does not need to read them yet). "Put all the /m/ things here and all the /s/ things here." The child sorts miniature objects by their initial sound.'),
      sp(),

      tipBox('Readiness Checkpoint', 'The child is ready for Sandpaper Letters when they can: (1) identify initial sounds reliably, (2) identify ending sounds, and (3) begin to hear middle sounds. They do NOT need to be fully segmenting \u2014 Levels 4\u20136 can overlap with early Sandpaper Letter work.'),

      // --- 2.5 Rhyming ---
      h2('Work 5: Rhyming Activities'),
      para('Age: 3\u20134', { italic: true, color: '666666' }),
      sp(),
      para('Rhyming develops phonological awareness \u2014 the ability to hear and manipulate the ENDINGS of words. This is different from Sound Games (which isolate individual phonemes). Rhyming teaches the child that words belong to families.', { bold: true }),
      sp(),

      h3('Materials: Rhyming Baskets'),
      para('Small baskets containing pairs of rhyming miniature objects:'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [2400, 2400, 2400, 2520],
        rows: [
          new TableRow({ children: [
            cell('Pair 1', 2400, { bold: true, fill: 'FFF3E0' }),
            cell('Pair 2', 2400, { bold: true, fill: 'FFF3E0' }),
            cell('Pair 3', 2400, { bold: true, fill: 'FFF3E0' }),
            cell('Pair 4', 2520, { bold: true, fill: 'FFF3E0' }),
          ] }),
          new TableRow({ children: [
            cell('cat \u2014 hat', 2400), cell('fox \u2014 box', 2400), cell('pen \u2014 hen', 2400), cell('bug \u2014 mug', 2520),
          ] }),
          new TableRow({ children: [
            cell('log \u2014 frog', 2400), cell('fan \u2014 pan', 2400), cell('star \u2014 car', 2400), cell('nail \u2014 snail', 2520),
          ] }),
          new TableRow({ children: [
            cell('bee \u2014 key', 2400), cell('boat \u2014 coat', 2400), cell('ring \u2014 king', 2400), cell('rock \u2014 sock', 2520),
          ] }),
          new TableRow({ children: [
            cell('fish \u2014 dish', 2400), cell('cake \u2014 snake', 2400), cell('mouse \u2014 house', 2400), cell('bear \u2014 pear', 2520),
          ] }),
        ],
      }),
      sp(),

      h3('3 Levels of Rhyming'),
      numbered([{ text: 'Recognition: ', bold: true }, { text: '"Do these words rhyme? Cat \u2014 hat?" Child says yes or no. Start with obvious pairs, then include non-rhyming pairs as distractors.' }], { restart: true }),
      numbered([{ text: 'Matching: ', bold: true }, { text: '"Find the two that rhyme" from a basket of 4\u20136 objects (2\u20133 rhyming pairs mixed together). Child pairs them.' }]),
      numbered([{ text: 'Production: ', bold: true }, { text: '"What rhymes with cat?" Child generates: bat, sat, mat, fat, rat, hat, flat... This is the hardest level.' }]),
      sp(),
      tipBox('Why Rhyming Matters', 'Rhyming teaches the concept of "word families" \u2014 that -at, -an, -ig, -op, -ug are patterns. This directly feeds into Word Families in Word Study (Part VII). The child who can rhyme freely has internalised onsets and rimes \u2014 the building blocks of phonics.'),

      // --- 2.6 Storytelling ---
      h2('Work 6: Storytelling and Sequencing'),
      para('Age: 3\u20135', { italic: true, color: '666666' }),
      sp(),
      h3('Materials'),
      bullet('Picture sequencing cards (3\u20136 cards per story)'),
      bullet('Wordless picture books'),
      bullet('Felt board with story characters'),
      sp(),
      h3('3 Levels'),
      numbered([{ text: 'Sequencing: ', bold: true }, { text: 'Child arranges 3\u20134 pictures in order (making pancakes: pour batter, cook, flip, eat). Increase to 5\u20136 cards.' }], { restart: true }),
      numbered([{ text: 'Retelling: ', bold: true }, { text: 'After hearing a story, the child retells it using props or pictures. Focus on beginning, middle, end.' }]),
      numbered([{ text: 'Creating: ', bold: true }, { text: 'The child invents original stories. Teacher transcribes while the child dictates. This is "Language Experience" \u2014 the child\u2019s own words become reading material later.' }]),

      // --- 2.7 Poems, Songs ---
      h2('Work 7: Poems, Songs, and Fingerplays'),
      para('Age: 2.5+ (ongoing)', { italic: true, color: '666666' }),
      sp(),
      para('Not just "fun" \u2014 poems and songs develop rhythmic sensitivity, memory, and language patterns that support reading fluency.'),
      bullet([{ text: 'Fingerplays: ', bold: true }, { text: 'Songs with hand motions (Itsy Bitsy Spider, Five Little Monkeys). Kinaesthetic + language.' }]),
      bullet([{ text: 'Nursery rhymes: ', bold: true }, { text: 'Jack and Jill, Humpty Dumpty, Baa Baa Black Sheep \u2014 these build rhyme awareness naturally.' }]),
      bullet([{ text: 'Poetry recitation: ', bold: true }, { text: 'Short poems memorised and performed. Builds expressive language and confidence.' }]),

      // --- 2.8 Conversation ---
      h2('Work 8: Conversation and Discussion'),
      para('Age: 3+ (ongoing)', { italic: true, color: '666666' }),
      sp(),
      para('Structured conversation practice:'),
      bullet([{ text: 'Circle time sharing: ', bold: true }, { text: '"Tell us about something you did this weekend." Turn-taking, active listening.' }]),
      bullet([{ text: 'Partner conversations: ', bold: true }, { text: 'Two children face each other and discuss a topic. Teacher models asking questions.' }]),
      bullet([{ text: 'Group discussions: ', bold: true }, { text: 'After a story or experience, the group discusses what happened, how characters felt, what might happen next.' }]),
      sp(),
      amiNote('The child who can hold a conversation \u2014 taking turns, listening, asking questions, staying on topic \u2014 has the oral foundation for all written language. Conversation is not a warm-up; it IS the curriculum.'),

      // ============================================================
      // PART III: WRITING PREPARATION
      // ============================================================
      pb(),
      h1('Part III: Writing Preparation (Ages 3\u20135)'),
      para('The hand must be prepared before the child writes. AMI has 7 works that build from gross motor to fine motor, from sand to paper. The sequence is precise: Metal Insets \u2192 Sandpaper Letters \u2192 Sand Tray \u2192 Chalkboard \u2192 Moveable Alphabet \u2192 Paper \u2192 Creative Writing.'),

      // --- 3.1 Metal Insets ---
      h2('Work 9: Metal Insets'),
      para('Age: 3\u20135', { italic: true, color: '666666' }),
      sp(),
      para('10 flat metal frames, each containing a removable geometric inset. The child traces the frame, then the inset, then fills in with parallel lines. This builds pencil control, lightness of touch, and the muscle memory needed for letter formation \u2014 without any letters at all.', { bold: true }),
      sp(),

      h3('The 10 Shapes'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [600, 2200, 2200, 600, 2200, 1920],
        rows: [
          new TableRow({ children: [
            cell('#', 600, { bold: true, fill: 'E8F5E9', center: true }),
            cell('Shape', 2200, { bold: true, fill: 'E8F5E9' }),
            cell('Prepares For', 2200, { bold: true, fill: 'E8F5E9' }),
            cell('#', 600, { bold: true, fill: 'E8F5E9', center: true }),
            cell('Shape', 2200, { bold: true, fill: 'E8F5E9' }),
            cell('Prepares For', 1920, { bold: true, fill: 'E8F5E9' }),
          ] }),
          new TableRow({ children: [
            cell('1', 600, { center: true }), cell('Square', 2200), cell('Straight lines', 2200),
            cell('6', 600, { center: true }), cell('Circle', 2200), cell('o, c, e, s', 1920),
          ] }),
          new TableRow({ children: [
            cell('2', 600, { center: true }), cell('Rectangle', 2200), cell('Straight lines', 2200),
            cell('7', 600, { center: true }), cell('Oval', 2200), cell('a, d, g, q', 1920),
          ] }),
          new TableRow({ children: [
            cell('3', 600, { center: true }), cell('Triangle', 2200), cell('Angles, direction', 2200),
            cell('8', 600, { center: true }), cell('Ellipse', 2200), cell('Curved letters', 1920),
          ] }),
          new TableRow({ children: [
            cell('4', 600, { center: true }), cell('Trapezoid', 2200), cell('Angles, slants', 2200),
            cell('9', 600, { center: true }), cell('Quatrefoil', 2200), cell('Complex curves', 1920),
          ] }),
          new TableRow({ children: [
            cell('5', 600, { center: true }), cell('Pentagon', 2200), cell('Pencil lifting', 2200),
            cell('10', 600, { center: true }), cell('Curvilinear Triangle', 2200), cell('s, f, j curves', 1920),
          ] }),
        ],
      }),

      sp(),
      h3('The 10 Exercises (in order)'),
      numbered('Trace the FRAME (external outline) with a coloured pencil. One colour.', { restart: true }),
      numbered('Trace the INSET (internal outline) with a different colour. Two outlines on the paper.'),
      numbered('Fill in between the two outlines with parallel horizontal lines. Left to right, top to bottom.'),
      numbered('Fill with parallel vertical lines.'),
      numbered('Fill with parallel diagonal lines (both directions).'),
      numbered('Fill with wavy lines.'),
      numbered('Fill with loops (prepares for cursive connections).'),
      numbered('Combine two insets on one paper (overlapping shapes, different colours).'),
      numbered('Create designs using three or more overlapping insets.'),
      numbered('Free creative design using any insets, any fills, any colours.'),
      sp(),
      tipBox('Presentation', 'Sit on the child\u2019s LEFT (so they can see your right hand if right-handed). Hold the frame with three fingers of the non-dominant hand, pressing firmly so it doesn\u2019t slip. Trace slowly, keeping the pencil against the edge of the frame. The pencil should rest lightly \u2014 no pressing hard.'),

      // --- 3.2 Sandpaper Letters ---
      pb(),
      h2('Work 10: Sandpaper Letters'),
      para('Age: 3\u20134 (begin when Sound Games Level 1\u20132 are solid)', { italic: true, color: '666666' }),
      sp(),
      para('Wooden boards with lowercase letters cut from sandpaper. The child TRACES the letter with TWO FINGERS while the teacher makes the SOUND. Three senses at once: touch (rough texture), sight (letter shape), hearing (the sound). The brain locks it in from three directions.', { bold: true }),
      sp(),
      h3('Physical Details'),
      bullet([{ text: 'Consonants: ', bold: true }, { text: 'Pink (or red) boards' }]),
      bullet([{ text: 'Vowels: ', bold: true }, { text: 'Blue boards' }]),
      bullet([{ text: 'Letters: ', bold: true }, { text: 'LOWERCASE only. Sandpaper glued on smooth wood.' }]),
      bullet([{ text: 'Tracing: ', bold: true }, { text: 'Always with the INDEX and MIDDLE fingers together (not one finger). This is the writing grip preview.' }]),
      bullet([{ text: 'Teacher position: ', bold: true }, { text: 'Sit to the RIGHT of the child (so your hand doesn\u2019t block their view as you trace).' }]),
      sp(),

      h3('The 6 Introduction Groups'),
      para('Letters are introduced in groups of 2\u20133, chosen so that the shapes and sounds CONTRAST with each other. This prevents confusion:', { bold: true }),
      sp(),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [1000, 1500, 7220],
        rows: [
          new TableRow({ children: [
            cell('Group', 1000, { bold: true, fill: 'FCE4EC', center: true }),
            cell('Letters', 1500, { bold: true, fill: 'FCE4EC', center: true }),
            cell('Why These Together', 7220, { bold: true, fill: 'FCE4EC' }),
          ] }),
          new TableRow({ children: [
            cell('1', 1000, { center: true }), cell('c, m, a, t', 1500, { bold: true, center: true }),
            cell('High-frequency, visually distinct, can form words immediately (cat, mat, at, am)', 7220),
          ] }),
          new TableRow({ children: [
            cell('2', 1000, { center: true }), cell('s, r, i, p', 1500, { bold: true, center: true }),
            cell('New shapes/sounds, expands word-making (sat, sip, rip, pit, trip, mist)', 7220),
          ] }),
          new TableRow({ children: [
            cell('3', 1000, { center: true }), cell('b, f, o, g', 1500, { bold: true, center: true }),
            cell('Adds rounded and tall forms (bog, fog, bit, fig, mop, top)', 7220),
          ] }),
          new TableRow({ children: [
            cell('4', 1000, { center: true }), cell('h, j, u, l', 1500, { bold: true, center: true }),
            cell('Mix of tall/short, straight/curved (hug, jug, log, lip, hill)', 7220),
          ] }),
          new TableRow({ children: [
            cell('5', 1000, { center: true }), cell('d, w, e, n', 1500, { bold: true, center: true }),
            cell('d introduced AFTER b (avoiding b/d confusion), new vowel e (den, pen, hen, wet, net)', 7220),
          ] }),
          new TableRow({ children: [
            cell('6', 1000, { center: true }), cell('k, q, v, x, y, z', 1500, { bold: true, center: true }),
            cell('Low-frequency letters, introduced last (kit, van, box, yes, zip)', 7220),
          ] }),
        ],
      }),

      sp(),
      h3('Presentation (Each New Letter)'),
      numbered('Take 3 letters from the shelf (1 new, 2 known) and carry them to the mat.', { restart: true }),
      numbered('Sit to the child\u2019s RIGHT.'),
      numbered('Pick up the new letter. Trace it with your index + middle fingers together while saying the SOUND: "/m/ \u2026 /m/ \u2026 /m/." Trace 2\u20133 times.'),
      numbered('Invite the child to trace while you make the sound together. Then the child traces and says the sound alone.'),
      numbered('Three-Period Lesson: "This is /m/" \u2192 "Show me /m/" \u2192 "What is this?"'),
      numbered('After success, mix with the 2 known letters for a 3-card Three-Period Lesson.'),
      sp(),
      amiNote('Never introduce letters that look or sound too similar at the same time. b/d, p/q, m/n, f/v should be in DIFFERENT groups, separated by weeks of practice.'),

      // --- 3.3 Sand Tray ---
      h2('Work 11: Sand Tray Writing'),
      para('Age: 3.5\u20144.5', { italic: true, color: '666666' }),
      sp(),
      para('A shallow tray of coloured sand. After learning a sandpaper letter, the child writes the same letter in sand with their finger. Mistakes vanish with a gentle shake. This is the bridge between tracing (following an existing path) and writing (creating a path from memory).'),
      sp(),
      h3('Presentation'),
      numbered('Child traces the sandpaper letter 2\u20133 times (sound each time).', { restart: true }),
      numbered('Set the sandpaper letter aside (face down).'),
      numbered('"Can you write /m/ in the sand?" Child writes from memory.'),
      numbered('If incorrect: turn the sandpaper letter face up, child traces again, try sand again. No correction \u2014 the material self-corrects (compare sand to sandpaper letter).'),

      // --- 3.4 Chalkboard ---
      h2('Work 12: Chalkboard Writing'),
      para('Age: 3.5\u20144.5', { italic: true, color: '666666' }),
      sp(),
      para('Large letter formation on a vertical surface. The child writes letters BIG on a chalkboard (or whiteboard). The vertical surface develops shoulder stability and large motor control. This comes BEFORE paper because large movements are easier to control than small ones.'),

      // --- 3.5 Moveable Alphabet ---
      pb(),
      h2('Work 13: Moveable Alphabet'),
      para('Age: 3.5\u20145 (begin when child knows 5\u20138 sandpaper letter sounds AND can fully segment CVC words)', { italic: true, color: '666666' }),
      sp(),
      para('A large wooden box with compartments of loose lowercase letters. Consonants are RED/PINK, vowels are BLUE. Approximately 155 letters total (multiples of common letters). The child BUILDS words by selecting individual letters and laying them on a mat.', { bold: true }),
      sp(),
      para('This is the child\u2019s FIRST WRITING. They encode words \u2014 converting known sounds into visible symbols \u2014 without needing a pencil.', { bold: true, color: '1a5632' }),
      sp(),

      h3('Readiness Requirements'),
      bullet('Knows at least 5\u20138 sandpaper letter sounds (can trace and say the sound)'),
      bullet('Can segment ALL sounds in a CVC word orally (Sound Games Level 5: "cat" \u2192 /k/-/a/-/t/)'),
      bullet('Has strong pencil grip from Metal Insets (though no pencil used here)'),
      sp(),

      h3('Presentation'),
      numbered('Place a miniature object on the mat (e.g., a small cat figurine).', { restart: true }),
      numbered('"What is this?" "Cat." "Let\u2019s write cat. What\u2019s the first sound you hear?" "/k/." "Can you find /k/?" Child finds c.'),
      numbered('"What\u2019s the next sound?" "/a/." Child finds a. Places it next to c.'),
      numbered('"What\u2019s the last sound?" "/t/." Child finds t. Places it: c-a-t.'),
      numbered('"You wrote cat!" (Do NOT ask the child to read it back yet \u2014 this is writing, not reading.)'),
      sp(),

      h3('Specific CVC Objects by Vowel Sound'),
      para('Use these real miniature objects for moveable alphabet word-building:', { bold: true }),
      sp(),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [1200, 8520],
        rows: [
          new TableRow({ children: [
            cell('Vowel', 1200, { bold: true, fill: 'E3F2FD', center: true }),
            cell('Objects (for building words with Moveable Alphabet)', 8520, { bold: true, fill: 'E3F2FD' }),
          ] }),
          new TableRow({ children: [
            cell('Short a', 1200, { bold: true, center: true }),
            cell('cat, hat, mat, bat, rat, bag, pan, fan, van, can, man, map, cap, tap, jam, ham, ram, cab, pad, wax', 8520),
          ] }),
          new TableRow({ children: [
            cell('Short e', 1200, { bold: true, center: true }),
            cell('pen, hen, ten, net, jet, bed, red, leg, peg, web, gem, vet, pet, wet, men, den, hen, bell, well, egg', 8520),
          ] }),
          new TableRow({ children: [
            cell('Short i', 1200, { bold: true, center: true }),
            cell('pig, wig, fig, dig, pin, bin, fin, tin, lip, hip, tip, zip, kit, sit, bit, hit, fix, mix, six, lid, rib, bib', 8520),
          ] }),
          new TableRow({ children: [
            cell('Short o', 1200, { bold: true, center: true }),
            cell('dog, log, fog, hog, pot, hot, cot, dot, mop, top, hop, pop, box, fox, rob, cob, sob, nod, rod, cod', 8520),
          ] }),
          new TableRow({ children: [
            cell('Short u', 1200, { bold: true, center: true }),
            cell('cup, pup, bus, rug, mug, hug, bug, jug, tub, cub, rub, sub, sun, bun, fun, run, gun, nut, hut, cut, gum', 8520),
          ] }),
        ],
      }),

      sp(),
      h3('7 Levels of Moveable Alphabet Work'),
      numbered([{ text: 'Introduction: ', bold: true }, { text: 'Teacher demonstrates building 2\u20133 CVC words with objects.' }], { restart: true }),
      numbered([{ text: 'CVC with objects: ', bold: true }, { text: 'Child builds words from objects independently. 3\u20135 objects per session.' }]),
      numbered([{ text: 'CVC with pictures: ', bold: true }, { text: 'Picture cards replace objects (more abstract).' }]),
      numbered([{ text: 'Longer phonetic words: ', bold: true }, { text: 'CCVC (frog, stop), CVCC (milk, hand), CCVCC (stamp).' }]),
      numbered([{ text: 'Phrases: ', bold: true }, { text: '"a red hat" "the big dog" \u2014 introduce spacing between words.' }]),
      numbered([{ text: 'Sentences: ', bold: true }, { text: '"the cat sat on the mat" \u2014 capital letter at start, full stop at end.' }]),
      numbered([{ text: 'Stories: ', bold: true }, { text: 'Multiple sentences telling a story. The child as author.' }]),
      sp(),
      amiNote('Do NOT correct spelling at the Moveable Alphabet stage. If a child writes "kat" for "cat," that is phonetically correct and shows excellent encoding. Conventional spelling comes later, through reading exposure.'),

      // --- 3.6 Handwriting ---
      h2('Work 14: Handwriting on Paper'),
      para('Age: 4\u20135', { italic: true, color: '666666' }),
      sp(),
      para('Formal letter writing on lined paper. The child has already formed letters in sand, on chalkboard, and with the Moveable Alphabet. Now they write with a pencil.'),
      numbered([{ text: 'Individual letters: ', bold: true }, { text: 'Single letters on primary-ruled paper (top, middle, bottom lines).' }], { restart: true }),
      numbered([{ text: 'Letter groups: ', bold: true }, { text: 'Letters that share formation patterns (c, o, a, d, g, q = "round letters").' }]),
      numbered([{ text: 'Words with spacing: ', bold: true }, { text: 'CVC words with finger-width spaces between.' }]),
      numbered([{ text: 'Sentences: ', bold: true }, { text: 'Capital letter, spaces, full stop.' }]),
      numbered([{ text: 'Copywork: ', bold: true }, { text: 'Copying poems and beautiful passages \u2014 practising handwriting AND absorbing good writing.' }]),

      // --- 3.7 Creative Writing ---
      h2('Work 15: Creative Writing'),
      para('Age: 4.5+ (once handwriting is comfortable)', { italic: true, color: '666666' }),
      sp(),
      numbered([{ text: 'Labelling: ', bold: true }, { text: 'Writing labels for objects in the classroom.' }], { restart: true }),
      numbered([{ text: 'Picture + sentence: ', bold: true }, { text: 'Draw a picture, write one sentence about it.' }]),
      numbered([{ text: 'Daily journal: ', bold: true }, { text: 'Draw and write about something each day.' }]),
      numbered([{ text: 'Original stories: ', bold: true }, { text: 'Multi-sentence narrative writing with beginning, middle, end.' }]),
      numbered([{ text: 'Research writing: ', bold: true }, { text: 'The child researches a topic (e.g., butterflies) and writes an informational piece.' }]),

      // ============================================================
      // PART IV: READING
      // ============================================================
      pb(),
      h1('Part IV: Reading (Ages 3.5\u20136)'),
      para('Reading has 11 works. The progression is: Object Boxes \u2192 Pink Series (CVC) \u2192 Blue Series (Blends) \u2192 Phonogram Introduction \u2192 Green Series (Phonograms) \u2192 Puzzle Words \u2192 Reading Analysis \u2192 Classification \u2192 Command Cards \u2192 Interpretive Reading \u2192 Silent Reading.'),

      // --- 4.1 Object Boxes ---
      h2('Work 16: Object Boxes'),
      para('Age: 3.5\u20144.5 (first reading work)', { italic: true, color: '666666' }),
      sp(),
      para('The child\u2019s FIRST reading. Small boxes containing miniature objects AND word labels on slips of paper. The child reads the label and matches it to the object. Three colour-coded boxes:', { bold: true }),
      sp(),
      bullet([{ text: 'Pink Object Box: ', bold: true, color: 'C62828' }, { text: 'CVC words only (cat, dog, cup, pen, hat, bus, mop, rug, pin, fox)' }]),
      bullet([{ text: 'Blue Object Box: ', bold: true, color: '1565C0' }, { text: 'Blend words (frog, drum, flag, snail, plum, crab, stamp, trunk)' }]),
      bullet([{ text: 'Green Object Box: ', bold: true, color: '2E7D32' }, { text: 'Phonogram words (ship, chain, queen, teeth, moon, cloud, coin)' }]),
      sp(),
      h3('Presentation'),
      numbered('Take out 3 objects and place them on the mat. Name each one together.', { restart: true }),
      numbered('Take out one word label. "Can you read this?" Child sounds out: /k/-/a/-/t/ \u2026 "cat!"'),
      numbered('Child places the label next to the cat object.'),
      numbered('Repeat for the other 2 labels.'),
      numbered('Gradually increase to 5\u201310 objects per session.'),
      sp(),
      amiNote('Object Boxes come BEFORE the Pink/Blue/Green Series because matching a label to a 3D object is easier than matching to a 2D picture. The object is concrete; the picture is abstract. AMI always moves from concrete to abstract.'),

      // --- 4.2 Pink Series ---
      h2('Work 17: Pink Series (CVC Words)'),
      para('Age: 4\u20145', { italic: true, color: '666666' }),
      sp(),
      para('Complete reading materials for 3-letter consonant-vowel-consonant words. RULE: every letter makes exactly one sound. No tricks, no exceptions.', { bold: true }),
      sp(),
      h3('CVC Word Lists by Vowel'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [1200, 8520],
        rows: [
          new TableRow({ children: [
            cell('Vowel', 1200, { bold: true, fill: 'FCE4EC', center: true }),
            cell('Words', 8520, { bold: true, fill: 'FCE4EC' }),
          ] }),
          new TableRow({ children: [
            cell('-a-', 1200, { bold: true, center: true }),
            cell('bat, cat, fat, hat, mat, pat, rat, sat, vat; bag, gag, lag, nag, rag, tag, wag; ban, can, fan, man, pan, ran, tan, van; bad, dad, had, lad, mad, pad, sad; cab, dab, jab, nab, tab; cap, gap, lap, map, nap, rap, tap, zap; dam, ham, jam, ram, yam; gas, has; wax, tax', 8520),
          ] }),
          new TableRow({ children: [
            cell('-e-', 1200, { bold: true, center: true }),
            cell('bed, fed, led, red, wed; beg, keg, leg, peg; ben, den, hen, men, pen, ten; bet, get, jet, let, met, net, pet, set, vet, wet, yet; gem, hem; web; pep', 8520),
          ] }),
          new TableRow({ children: [
            cell('-i-', 1200, { bold: true, center: true }),
            cell('big, dig, fig, gig, jig, pig, rig, wig; bid, did, hid, kid, lid, rid; bin, din, fin, kin, pin, sin, tin, win; bit, fit, hit, kit, lit, pit, sit, wit; dim, him, rim; dip, hip, lip, nip, rip, sip, tip, zip; bib, rib; fix, mix, six', 8520),
          ] }),
          new TableRow({ children: [
            cell('-o-', 1200, { bold: true, center: true }),
            cell('bog, cog, dog, fog, hog, jog, log, tog; bob, cob, fob, gob, job, mob, nob, rob, sob; cod, god, nod, pod, rod; cop, hop, mop, pop, top; box, fox, pox; cot, dot, got, hot, jot, lot, not, pot, rot; con, don, son, ton, won', 8520),
          ] }),
          new TableRow({ children: [
            cell('-u-', 1200, { bold: true, center: true }),
            cell('bug, dug, hug, jug, mug, pug, rug, tug; bud, cud, dud, mud; bun, fun, gun, nun, pun, run, sun; bus, gus, pus; but, cut, gut, hut, jut, nut, put, rut, tut; cub, hub, nub, pub, rub, sub, tub; cup, pup, sup; gum, hum, rum, sum, yum', 8520),
          ] }),
        ],
      }),
      sp(),
      h3('5 Levels of Pink Series'),
      numbered([{ text: 'Picture-word matching: ', bold: true }, { text: 'Child reads word labels and places them under matching pictures.' }], { restart: true }),
      numbered([{ text: 'Word lists: ', bold: true }, { text: 'Child reads columns of CVC words (sorted by word family: -at words, -an words, etc.).' }]),
      numbered([{ text: 'Phrases: ', bold: true }, { text: '"a red hat" "the big dog" "a hot cup" \u2014 reading 2\u20133 word phrases.' }]),
      numbered([{ text: 'Sentences: ', bold: true }, { text: '"The cat sat on the mat." "A dog bit the rug." Full sentences.' }]),
      numbered([{ text: 'Booklets: ', bold: true }, { text: 'Small stapled booklets (4\u20138 pages) with one sentence per page and a picture. The child\u2019s first "books."' }]),

      // --- 4.3 Blue Series ---
      h2('Work 18: Blue Series (Consonant Blends)'),
      para('Age: 4.5\u20145.5', { italic: true, color: '666666' }),
      sp(),
      para('Words with consonant blends \u2014 two or three consonants together where EACH still makes its own sound. Same rule as Pink: one letter = one sound. Just longer words.', { bold: true }),
      sp(),
      h3('Blend Categories'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [2400, 3660, 3660],
        rows: [
          new TableRow({ children: [
            cell('Type', 2400, { bold: true, fill: 'E3F2FD' }),
            cell('Blends', 3660, { bold: true, fill: 'E3F2FD' }),
            cell('Example Words', 3660, { bold: true, fill: 'E3F2FD' }),
          ] }),
          new TableRow({ children: [
            cell('Initial L-blends', 2400), cell('bl, cl, fl, gl, pl, sl', 3660), cell('black, clap, flag, glad, plan, slim', 3660),
          ] }),
          new TableRow({ children: [
            cell('Initial R-blends', 2400), cell('br, cr, dr, fr, gr, pr, tr', 3660), cell('brim, crab, drip, frog, grip, pram, trip', 3660),
          ] }),
          new TableRow({ children: [
            cell('Initial S-blends', 2400), cell('sc, sk, sl, sm, sn, sp, st, sw', 3660), cell('scan, skip, slam, smog, snap, spot, stop, swim', 3660),
          ] }),
          new TableRow({ children: [
            cell('Triple blends', 2400), cell('str, spr, scr, spl, squ', 3660), cell('strip, spring, scrap, split, squid', 3660),
          ] }),
          new TableRow({ children: [
            cell('Final blends', 2400), cell('-nd, -nk, -nt, -mp, -ft, -lk, -lt, -sk', 3660), cell('hand, sink, tent, lamp, left, milk, felt, desk', 3660),
          ] }),
        ],
      }),
      sp(),
      para('Same 5 levels as Pink Series: picture-word matching \u2192 word lists \u2192 phrases \u2192 sentences \u2192 booklets.'),

      // --- 4.4 Phonogram Introduction ---
      pb(),
      h2('Work 19: Phonogram Introduction (Double Sandpaper Letters)'),
      para('Age: 4.5\u20145.5 (BEFORE Green Series)', { italic: true, color: '666666' }),
      sp(),
      para('Before reading phonogram words, the child must learn the phonogram sounds IN ISOLATION. These are taught with double sandpaper letter cards \u2014 exactly like regular sandpaper letters, but with 2\u20133 letters on one card.', { bold: true }),
      sp(),
      h3('The 16 Essential Phonograms'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [1100, 2100, 3260, 3260],
        rows: [
          new TableRow({ children: [
            cell('Phonogram', 1100, { bold: true, fill: 'E8F5E9', center: true }),
            cell('Sound', 2100, { bold: true, fill: 'E8F5E9' }),
            cell('Example Words', 3260, { bold: true, fill: 'E8F5E9' }),
            cell('Objects for Matching', 3260, { bold: true, fill: 'E8F5E9' }),
          ] }),
          ...([
            ['sh', '/sh/ (lips pursed)', 'ship, shop, fish, dish, shell, shed, shin, shut, ash, bush, wish, gush', 'ship, shell, fish, dish, shoe, sheep, shark'],
            ['ch', '/ch/ (tongue tip)', 'chip, chop, chin, chess, rich, much, such, bench, lunch, church', 'cherry, cheese, chain, chair, chicken, chocolate'],
            ['th', '/th/ (tongue between teeth)', 'this, that, then, them, with, bath, math, path, cloth, thin, thick', 'thumb, thimble, thermometer, thistle'],
            ['qu', '/kw/ (always together)', 'queen, quick, quiz, quit, quilt, quack, quest, squid, square', 'queen figurine, quilt swatch, quarter coin'],
            ['ee', '/ee/ (long e)', 'bee, see, tree, free, feet, keep, seed, need, deep, week, teeth', 'bee, tree, seed, teeth model, wheel'],
            ['oo', '/oo/ (long) or /oo/ (short)', 'moon, spoon, food, boot, cool, pool, book, cook, look, foot, good', 'moon, spoon, boot, book, hook'],
            ['ai', '/ay/ (long a)', 'rain, train, snail, tail, mail, nail, pail, sail, wait, paint', 'train, snail, nail, chain, rain(coat)'],
            ['oa', '/oh/ (long o)', 'boat, coat, goat, road, toad, load, soap, oak, moat, foam', 'boat, coat, goat, soap, toad'],
            ['ar', '/ar/ (r-controlled)', 'car, star, jar, farm, bark, dark, park, card, barn, arm, art', 'car, star, jar, barn model, scarf'],
            ['er', '/er/ (r-controlled)', 'her, fern, term, herd, verb, water, flower, letter, sister', 'flower, letter, feather, hammer'],
            ['or', '/or/ (r-controlled)', 'fork, corn, horn, torn, sort, port, sport, horse, storm, morning', 'fork, corn, horn, horse'],
            ['ou', '/ow/ (diphthong)', 'out, shout, cloud, house, mouse, round, sound, found, ground, mouth', 'mouse, house model, cloud picture'],
            ['oy/oi', '/oy/ (diphthong)', 'boy, toy, joy, coin, oil, soil, boil, point, noise, join', 'toy, coin, soil cup'],
            ['ie', '/ie/ (long i)', 'pie, tie, die, lie, cried, dried, fried, tried', 'pie, tie, dice'],
            ['ue', '/oo/ (long u)', 'blue, clue, true, glue, due, sue, hue, rescue', 'glue stick, blue crayon'],
            ['au/aw', '/aw/ (broad o)', 'saw, paw, jaw, raw, draw, straw, haul, pause, sauce, cause', 'saw, straw, claw model'],
          ].map(([phon, sound, words, objects]) =>
            new TableRow({ children: [
              cell(phon, 1100, { bold: true, center: true }),
              cell(sound, 2100),
              cell(words, 3260),
              cell(objects, 3260),
            ] })
          )),
        ],
      }),

      sp(),
      h3('Presentation (Same as Sandpaper Letters)'),
      numbered('Take out 2\u20133 double sandpaper phonogram cards.', { restart: true }),
      numbered('Trace with two fingers while saying the sound: "/sh/ \u2026 /sh/ \u2026 /sh/."'),
      numbered('Three-Period Lesson: "This says /sh/" \u2192 "Show me /sh/" \u2192 "What does this say?"'),
      numbered('Introduce 2\u20133 phonograms per lesson. Never introduce phonograms that sound similar together (e.g., not /oi/ and /ou/ in the same lesson).'),

      // --- 4.5 Green Series ---
      h2('Work 20: Green Series (Phonogram Words)'),
      para('Age: 5\u20136', { italic: true, color: '666666' }),
      sp(),
      para('Reading words containing phonograms. NEW concept: sometimes 2\u20133 letters combine to make 1 sound. The child must master Pink/Blue (each letter = one sound) before encountering this exception.'),
      sp(),
      para('Same 5 levels as Pink/Blue: picture-word matching \u2192 word lists by phonogram \u2192 mixed phonogram lists \u2192 sentences \u2192 booklets.'),

      // --- 4.6 Puzzle Words ---
      h2('Work 21: Puzzle Words (Sight Words)'),
      para('Age: 5\u20136 (AFTER solid phonetic foundation)', { italic: true, color: '666666' }),
      sp(),
      para('High-frequency words that break phonetic rules. Called "puzzle words" because the child says "this one is a puzzle \u2014 it doesn\u2019t follow the rules, I just have to remember it."', { bold: true }),
      sp(),
      h3('Common Puzzle Words'),
      bullet([{ text: 'Set 1: ', bold: true }, { text: 'the, a, is, was, are, were, has, have, do, does, said, says' }]),
      bullet([{ text: 'Set 2: ', bold: true }, { text: 'you, your, they, their, come, some, one, once, who, what, where, there' }]),
      bullet([{ text: 'Set 3: ', bold: true }, { text: 'could, would, should, through, thought, enough, people, friend, again, many' }]),
      sp(),
      amiNote('Puzzle Words are introduced AFTER the child has a strong phonetic foundation. If taught too early, the child learns "reading = memorising" instead of "reading = decoding." The phonetic system must be established first.'),

      // --- 4.7\u20134.11 Remaining Reading Works ---
      h2('Work 22: Reading Analysis'),
      para('The child analyses words while reading \u2014 identifying phonograms, breaking words into decodable parts, noticing patterns. Using colour-coded pencils: underline phonograms in green, mark blends in blue, circle puzzle words in red.'),

      h2('Work 23: Reading Classification'),
      para('Reading to classify and sort. Child reads word cards and sorts into categories (animals/vehicles/foods), then reads sentences and sorts by topic. Comprehension in action.'),

      h2('Work 24: Command Cards (Action Reading)'),
      para('Age: 5\u20136', { italic: true, color: '666666' }),
      sp(),
      para('The child reads a card and performs the action. This PROVES comprehension \u2014 you cannot do the action if you didn\u2019t understand the words.', { bold: true }),
      sp(),
      h3('3 Levels'),
      numbered([{ text: 'Single commands: ', bold: true }, { text: '"Run." "Hop." "Clap." "Sit." "Spin." One-word action cards.' }], { restart: true }),
      numbered([{ text: 'Two-step commands: ', bold: true }, { text: '"Walk to the door." "Pick up the red ball." "Put the cup on the shelf."' }]),
      numbered([{ text: 'Complex commands: ', bold: true }, { text: '"Take three steps forward, turn left, and pick up the pencil that is next to the blue book."' }]),

      h2('Work 25: Interpretive Reading'),
      para('Reading with expression. Poetry, short stories, reader\u2019s theatre. The child moves from decoding to performing \u2014 adding meaning, emotion, and emphasis to their reading.'),

      h2('Work 26: Silent Reading'),
      para('Independent silent reading. Picture books \u2192 early readers \u2192 chapter books. The final reading destination: the child reads alone, for pleasure, in their head. This is where the love of reading lives.'),

      // ============================================================
      // PART V: GRAMMAR
      // ============================================================
      pb(),
      h1('Part V: Grammar (Ages 4.5\u20137)'),
      para('Grammar in AMI is learned through PHYSICAL EXPERIENCE, not definitions. Every part of speech is introduced through action and movement, and gets a coloured 3D symbol that the child places above words in sentences. There are 11 works.'),

      h2('The Grammar Symbol System'),
      para('Each part of speech has a unique coloured 3D wooden symbol:', { bold: true }),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [1800, 2600, 2660, 2660],
        rows: [
          new TableRow({ children: [
            cell('Part of Speech', 1800, { bold: true, fill: 'F5F5F5' }),
            cell('Symbol', 2600, { bold: true, fill: 'F5F5F5' }),
            cell('Colour', 2660, { bold: true, fill: 'F5F5F5' }),
            cell('Why This Symbol', 2660, { bold: true, fill: 'F5F5F5' }),
          ] }),
          ...([
            ['Noun', 'Large triangle (pyramid)', 'Black', 'Pyramid = oldest, most stable structure. Nouns are the foundation.'],
            ['Article', 'Small triangle', 'Light blue', 'Small because articles are small helper words for nouns.'],
            ['Adjective', 'Medium triangle', 'Dark blue', 'Triangle family \u2014 adjectives describe nouns. Darker than article.'],
            ['Verb', 'Large circle (sphere)', 'Red', 'Circle/sphere = energy, movement. Verbs are the energy of language.'],
            ['Adverb', 'Small circle', 'Orange', 'Small circle \u2014 modifies the verb, like a planet orbiting a sun.'],
            ['Pronoun', 'Tall triangle', 'Purple', 'Stands in FOR a noun. Purple = royal substitute.'],
            ['Preposition', 'Crescent (bridge)', 'Green', 'Bridge shape = connects noun to rest of sentence.'],
            ['Conjunction', 'Bar (link)', 'Pink', 'Bar = links two things together.'],
            ['Interjection', 'Keyhole shape', 'Gold', 'Keyhole = key that opens a sentence with emotion.'],
          ].map(([pos, symbol, colour, why]) =>
            new TableRow({ children: [
              cell(pos, 1800, { bold: true }),
              cell(symbol, 2600),
              cell(colour, 2660),
              cell(why, 2660),
            ] })
          )),
        ],
      }),

      sp(),
      h2('Work 27: The Noun (Introduction to Grammar)'),
      para('The child learns that everything in the room has a name. "What is this? A chair. A table. A pencil." These are NOUNS. The black triangle is placed above each noun. Then: the Farm Game \u2014 a miniature farm with animal/object labels. Child reads labels and places them on the correct items.'),

      h2('Work 28: The Article'),
      para('"Bring me ball." Something is wrong! "Bring me A ball." / "Bring me THE ball." The article changes meaning. Small light blue triangle above a/an/the.'),

      h2('Work 29: The Adjective \u2014 The Detective Game'),
      para('"Bring me a pencil." Child brings any pencil. "Bring me the LONG pencil." "Bring me the SHORT RED pencil." Adjectives give more information. Each adjective gets a dark blue medium triangle. Multiple adjectives = multiple triangles stacking up.', { bold: true }),

      h2('Work 30: The Verb \u2014 Action Commands'),
      para('"Run! Jump! Sit! Spin! Clap!" The verb is the ACTION. Large red circle. The Verb Game: write different verb cards, child performs each one. Replace the verb: "The boy runs" \u2192 "The boy hops" \u2192 "The boy sleeps." The verb changes everything.'),

      h2('Work 31: The Adverb'),
      para('"Walk." "Walk SLOWLY." "Walk QUICKLY." "Walk QUIETLY." The adverb modifies how you do the verb. Small orange circle placed above the adverb.'),

      h2('Work 32: The Pronoun'),
      para('"Sarah has a ball. Sarah throws the ball. Sarah catches the ball." Too many Sarahs! "Sarah has a ball. SHE throws it. SHE catches it." Pronouns replace nouns. Purple tall triangle.'),

      h2('Work 33: The Preposition'),
      para('"Put the ball ON the table. UNDER the table. BESIDE the table. IN the box. BEHIND the chair." Prepositions show position/relationship. Green crescent. The Preposition Game: Command cards with prepositions \u2014 child reads and acts.'),

      h2('Work 34: The Conjunction'),
      para('"Bring me the pen. Bring me the pencil." \u2192 "Bring me the pen AND the pencil." Conjunctions join things. Pink bar. Then: "Bring me the pen OR the pencil." "Bring me the pen BUT not the pencil."'),

      h2('Work 35: The Interjection'),
      para('"Oh! Wow! Hooray! Ouch! Yikes!" Exclamation words that express emotion. Gold keyhole symbol. Often stand alone or begin a sentence.'),

      // --- Grammar Boxes ---
      h2('Work 36: Grammar Boxes (I\u2013VIII)'),
      para('8 colour-coded boxes with fill-in sentence cards. Each box focuses on a different part of speech. The child reads a sentence, identifies the target word, replaces it with alternatives to see how meaning changes.', { bold: true }),
      sp(),
      bullet([{ text: 'Box I (Article): ', bold: true }, { text: '"The ___ is on the table." a/an/the' }]),
      bullet([{ text: 'Box II (Adjective): ', bold: true }, { text: '"The ___ dog ran." big/small/happy/tired/brown/old' }]),
      bullet([{ text: 'Box III (Verb): ', bold: true }, { text: '"The dog ___." ran/slept/ate/jumped/barked/sat' }]),
      bullet([{ text: 'Box IV (Preposition): ', bold: true }, { text: '"The ball is ___ the table." on/under/beside/behind/near' }]),
      bullet([{ text: 'Box V (Adverb): ', bold: true }, { text: '"She walked ___." slowly/quickly/quietly/happily/sadly' }]),
      bullet([{ text: 'Box VI (Pronoun): ', bold: true }, { text: 'Replace nouns with pronouns in sentences.' }]),
      bullet([{ text: 'Box VII (Conjunction): ', bold: true }, { text: 'Join sentences using and/but/or/because/so.' }]),
      bullet([{ text: 'Box VIII (Complex): ', bold: true }, { text: 'Mixed exercises combining multiple parts of speech in longer sentences.' }]),

      // --- Sentence Analysis ---
      h2('Work 37: Sentence Analysis'),
      para('Age: 6\u20137+', { italic: true, color: '666666' }),
      sp(),
      para('The child uses colour-coded question arrows to analyse sentence structure:'),
      bullet([{ text: 'Subject: ', bold: true }, { text: '"WHO?" (black arrow) \u2014 "The tall girl ran quickly." \u2192 Who? The tall girl.' }]),
      bullet([{ text: 'Predicate: ', bold: true }, { text: '"WHAT DID THEY DO?" (red arrow) \u2014 ran quickly.' }]),
      bullet([{ text: 'Direct Object: ', bold: true }, { text: '"WHAT?" (black arrow) \u2014 "She kicked the ball." \u2192 What? The ball.' }]),
      bullet([{ text: 'Indirect Object: ', bold: true }, { text: '"TO WHOM?" (black arrow) \u2014 "She gave the book to Tom." \u2192 To whom? To Tom.' }]),
      bullet([{ text: 'Adverbial: ', bold: true }, { text: '"HOW? WHEN? WHERE?" (orange arrows) \u2014 ran quickly (how?), in the morning (when?), in the park (where?).' }]),

      // ============================================================
      // PART VI: WORD STUDY
      // ============================================================
      pb(),
      h1('Part VI: Word Study (Ages 5\u20137)'),
      para('Word Study builds on the foundation of Rhyming (from Oral Language) and Reading. It teaches the child that English has patterns, rules, and building blocks. 6 works.'),

      h2('Work 38: Word Families'),
      para('Words that share the same ending pattern \u2014 the WRITTEN version of oral rhyming.', { bold: true }),
      sp(),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [1200, 8520],
        rows: [
          new TableRow({ children: [
            cell('Family', 1200, { bold: true, fill: 'E8F5E9', center: true }),
            cell('Words', 8520, { bold: true, fill: 'E8F5E9' }),
          ] }),
          ...([
            ['-at', 'bat, cat, fat, hat, mat, pat, rat, sat, vat, brat, chat, flat, that, splat'],
            ['-an', 'ban, can, fan, man, pan, ran, tan, van, bran, clan, plan, scan, span, than'],
            ['-ig', 'big, dig, fig, gig, jig, pig, rig, wig, twig, sprig'],
            ['-op', 'bop, cop, hop, mop, pop, top, chop, crop, drop, flop, prop, shop, stop'],
            ['-ug', 'bug, dug, hug, jug, mug, pug, rug, tug, drug, plug, slug, snug, shrug'],
            ['-in', 'bin, din, fin, gin, kin, pin, sin, tin, win, chin, grin, shin, skin, spin, thin, twin'],
            ['-ot', 'cot, dot, got, hot, jot, lot, not, pot, rot, blot, knot, plot, shot, slot, spot, trot'],
            ['-ell', 'bell, cell, dell, fell, hell, jell, sell, tell, well, yell, dwell, shell, smell, spell, swell'],
          ].map(([fam, words]) =>
            new TableRow({ children: [
              cell(fam, 1200, { bold: true, center: true }),
              cell(words, 8520),
            ] })
          )),
        ],
      }),

      h2('Work 39: Spelling Rules'),
      para('Common English spelling patterns taught through word sorting and pattern discovery:'),
      bullet([{ text: 'The Doubling Rule: ', bold: true }, { text: 'hop \u2192 hopping (double the consonant before -ing/-ed when the word is CVC). Compare: hop \u2192 hopping vs. help \u2192 helping (no doubling because it ends in 2 consonants).' }]),
      bullet([{ text: 'The Silent E Rule: ', bold: true }, { text: 'Drop the e before a vowel suffix: make \u2192 making, ride \u2192 riding, bake \u2192 baking. Keep it before a consonant suffix: hope \u2192 hopeful.' }]),
      bullet([{ text: 'The Y-to-I Rule: ', bold: true }, { text: 'Change y to i before adding a suffix: happy \u2192 happiness, cry \u2192 cried. Exception: before -ing (crying, not criing).' }]),
      bullet([{ text: 'Plurals: ', bold: true }, { text: 'Most: add -s (cats). After s/sh/ch/x/z: add -es (boxes, bushes). Y after consonant: change y to ies (baby \u2192 babies). Irregular: mouse \u2192 mice, child \u2192 children.' }]),

      h2('Work 40: Compound Words'),
      para('Two words combine to make one: sun + flower = sunflower, rain + coat = raincoat, cup + board = cupboard, butter + fly = butterfly, tooth + brush = toothbrush, fire + truck = firetruck, bed + room = bedroom, foot + ball = football.'),
      para('Matching game: word cards split in half. Child matches halves to make compound words.'),

      h2('Work 41: Prefixes and Suffixes'),
      para('Word parts that change meaning. Suffixes first, then prefixes:', { bold: true }),
      sp(),
      h3('Common Suffixes'),
      bullet([{ text: '-ed (past tense): ', bold: true }, { text: 'walked, jumped, played, wanted, needed' }]),
      bullet([{ text: '-ing (present): ', bold: true }, { text: 'walking, jumping, playing, running, swimming' }]),
      bullet([{ text: '-s/-es (plural): ', bold: true }, { text: 'cats, dogs, boxes, bushes, wishes' }]),
      bullet([{ text: '-er (one who): ', bold: true }, { text: 'teacher, farmer, singer, builder, reader' }]),
      bullet([{ text: '-est (most): ', bold: true }, { text: 'tallest, fastest, biggest, smallest, happiest' }]),
      bullet([{ text: '-ly (how): ', bold: true }, { text: 'slowly, quickly, quietly, happily, sadly' }]),
      bullet([{ text: '-ful (full of): ', bold: true }, { text: 'thankful, beautiful, wonderful, powerful, hopeful' }]),
      bullet([{ text: '-less (without): ', bold: true }, { text: 'careless, homeless, helpless, fearless, endless' }]),
      sp(),
      h3('Common Prefixes'),
      bullet([{ text: 'un- (not): ', bold: true }, { text: 'unhappy, unkind, unfair, unlock, undo, untie' }]),
      bullet([{ text: 're- (again): ', bold: true }, { text: 'redo, rewrite, replay, rebuild, reheat, retell' }]),
      bullet([{ text: 'pre- (before): ', bold: true }, { text: 'preview, preschool, preheat, prefix, prepay' }]),
      bullet([{ text: 'dis- (opposite): ', bold: true }, { text: 'disagree, disappear, dislike, disconnect, discover' }]),
      bullet([{ text: 'mis- (wrong): ', bold: true }, { text: 'mistake, misplace, misread, misspell, misunderstand' }]),

      h2('Work 42: Synonyms and Antonyms'),
      para('Matching card games and word sorts:'),
      bullet([{ text: 'Synonyms: ', bold: true }, { text: 'big/large, small/tiny, happy/glad, sad/unhappy, fast/quick, start/begin, end/finish, talk/speak, pretty/beautiful, shut/close' }]),
      bullet([{ text: 'Antonyms: ', bold: true }, { text: 'hot/cold, big/small, up/down, in/out, on/off, happy/sad, fast/slow, old/new, light/dark, open/close, hard/soft, wet/dry, tall/short' }]),

      h2('Work 43: Homonyms (Homophones)'),
      para('Words that sound the same but differ in spelling and meaning. The child must use CONTEXT to determine which word fits.', { bold: true }),
      sp(),
      bullet([{ text: 'to / two / too: ', bold: true }, { text: '"I went to the shop. I bought two apples. They were too expensive."' }]),
      bullet([{ text: 'their / there / they\u2019re: ', bold: true }, { text: '"Their dog is over there. They\u2019re coming home soon."' }]),
      bullet([{ text: 'sea / see: ', bold: true }, { text: '"I can see the sea from here."' }]),
      bullet([{ text: 'flower / flour: ', bold: true }, { text: '"The flower grows in the garden. The flour is for baking."' }]),
      bullet([{ text: 'hear / here: ', bold: true }, { text: '"Come here and hear the music."' }]),
      bullet([{ text: 'right / write: ', bold: true }, { text: '"Write your name on the right side."' }]),
      bullet([{ text: 'son / sun: ', bold: true }, { text: '"My son likes to sit in the sun."' }]),
      bullet([{ text: 'no / know: ', bold: true }, { text: '"No, I don\u2019t know the answer."' }]),
      bullet([{ text: 'pair / pear / pare: ', bold: true }, { text: '"This pair of shoes is near the pear. Can you pare the apple?"' }]),

      // ============================================================
      // PART VII: THE COMPLETE LOGIC CHAIN
      // ============================================================
      pb(),
      h1('Part VII: The Complete Logic Chain'),
      para('Every step builds on the one before. Here is the full sequence with readiness indicators:'),
      sp(),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [500, 2800, 3210, 3210],
        rows: [
          new TableRow({ children: [
            cell('#', 500, { bold: true, fill: '1a5632', center: true, textColor: 'FFFFFF' }),
            cell('Work', 2800, { bold: true, fill: '1a5632', textColor: 'FFFFFF' }),
            cell('What the Child Gains', 3210, { bold: true, fill: '1a5632', textColor: 'FFFFFF' }),
            cell('Readiness: Child Must Be Able To\u2026', 3210, { bold: true, fill: '1a5632', textColor: 'FFFFFF' }),
          ] }),
          ...([
            ['1', 'Vocabulary Enrichment', 'Rich spoken word bank (100s of words)', 'Speak and understand basic language'],
            ['2', 'Classified Cards', 'Category awareness, naming precision', 'Participate in Three-Period Lesson'],
            ['3', 'Object-Picture Matching', 'Abstraction: 3D \u2192 2D representation', 'Name common objects'],
            ['4', 'Sound Games (I Spy)', 'Hear individual phonemes in words', 'Know 50+ vocabulary words'],
            ['5', 'Rhyming Activities', 'Hear and produce word-ending patterns', 'Identify initial sounds (Sound Games L1)'],
            ['6', 'Storytelling/Sequencing', 'Narrative structure, logical ordering', 'Hold a conversation, follow a story'],
            ['7', 'Poems/Songs/Fingerplays', 'Rhythm awareness, memory, patterns', 'Participate in group activities'],
            ['8', 'Conversation/Discussion', 'Turn-taking, active listening, questions', 'Speak in sentences'],
            ['9', 'Metal Insets', 'Pencil control, lightness of touch', 'Hold a pencil, sit at a table'],
            ['10', 'Sandpaper Letters', 'Sound \u2192 letter shape connection', 'Hear initial + ending sounds (SG L1\u20132)'],
            ['11', 'Sand Tray Writing', 'Letter formation from memory', 'Trace sandpaper letters accurately'],
            ['12', 'Chalkboard Writing', 'Large letter formation, shoulder control', 'Write letters in sand from memory'],
            ['13', 'Moveable Alphabet', 'Encode (build) words from sounds', 'Know 5\u20138 letter sounds + segment CVC words'],
            ['14', 'Handwriting on Paper', 'Formal writing with pencil on lines', 'Form letters on chalkboard, build MA words'],
            ['15', 'Creative Writing', 'Original composition and authorship', 'Write words/sentences legibly'],
            ['16', 'Object Boxes', 'First reading: label \u2192 3D object', 'Build CVC words with Moveable Alphabet'],
            ['17', 'Pink Series (CVC)', 'Read simple 3-letter words fluently', 'Match object box labels to objects'],
            ['18', 'Blue Series (Blends)', 'Read longer phonetic words', 'Read Pink Series words fluently'],
            ['19', 'Phonogram Introduction', 'Learn phonogram sounds in isolation', 'Read Blue Series words fluently'],
            ['20', 'Green Series', 'Read phonogram words', 'Know 8+ phonogram sounds'],
            ['21', 'Puzzle Words', 'Recognise high-frequency exception words', 'Have solid phonetic reading foundation'],
            ['22', 'Reading Analysis', 'Analyse word structure while reading', 'Read Green Series + Puzzle Words'],
            ['23', 'Reading Classification', 'Read to categorise and comprehend', 'Read sentences independently'],
            ['24', 'Command Cards', 'Read for meaning through action', 'Read sentences, follow multi-step instructions'],
            ['25', 'Interpretive Reading', 'Read with expression and emotion', 'Read fluently at sentence level'],
            ['26', 'Silent Reading', 'Independent reading for pleasure', 'Read chapter-length text'],
            ['27\u201335', 'Grammar (9 parts of speech)', 'Understand how language works', 'Read and write fluently'],
            ['36', 'Grammar Boxes I\u2013VIII', 'Practise parts of speech in context', 'Know all 9 grammar symbols'],
            ['37', 'Sentence Analysis', 'Analyse sentence structure', 'Identify parts of speech in sentences'],
            ['38', 'Word Families', 'See rhyming patterns in written form', 'Read CVC words, know oral rhyming'],
            ['39', 'Spelling Rules', 'Apply doubling/silent-E/Y-to-I rules', 'Read and write at Green Series level'],
            ['40', 'Compound Words', 'Build new words from known parts', 'Read multi-syllable words'],
            ['41', 'Prefixes and Suffixes', 'Modify word meanings systematically', 'Know compound words, basic spelling rules'],
            ['42', 'Synonyms and Antonyms', 'Vocabulary depth and nuance', 'Read independently, know 500+ words'],
            ['43', 'Homonyms', 'Context-dependent word meaning', 'Read paragraphs, understand context'],
          ].map(([n, work, gains, readiness]) =>
            new TableRow({ children: [
              cell(n, 500, { center: true, fill: parseInt(n) <= 8 ? 'FFF8E1' : parseInt(n) <= 15 ? 'E3F2FD' : parseInt(n) <= 26 ? 'FCE4EC' : parseInt(n) <= 37 ? 'F3E5F5' : 'E8F5E9' }),
              cell(work, 2800, { bold: true }),
              cell(gains, 3210),
              cell(readiness, 3210),
            ] })
          )),
        ],
      }),

      sp(), sp(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [
        new TextRun({ text: 'Sound \u2192 Symbol \u2192 Word \u2192 Sentence \u2192 Grammar \u2192 Word Study', size: 26, bold: true, font: 'Cambria', color: '1a5632' }),
      ] }),

      sp(),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1a5632', space: 1 } },
        spacing: { after: 200 }, children: [],
      }),
      para('This document covers all 43 works across the 5 categories of the AMI (Association Montessori Internationale) English language curriculum. The sequence, materials, and philosophy are based on the work of Dr. Maria Montessori as preserved and taught through AMI training centres worldwide.', { italic: true, color: '666666' }),
      sp(),
      para('End of Document', { italic: true, color: '999999', bold: true }),

    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = __dirname + '/AMI_English_Language_Progression.docx';
  fs.writeFileSync(outPath, buffer);
  console.log('Created: ' + outPath);
  console.log('Size: ' + (buffer.length / 1024).toFixed(1) + ' KB');
}).catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
