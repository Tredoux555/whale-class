const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak } = require('docx');
const fs = require('fs');

const AMBER = 'F59E0B';
const LIGHT_AMBER = 'FEF3C7';
const GRAY = '6B7280';
const border = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 36, color: AMBER })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 28, color: '92400E' })] });
}
function h3(text) {
  return new Paragraph({ spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 24, color: '78350F' })] });
}
function p(text) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 22 })] });
}
function pBold(label, text) {
  return new Paragraph({ spacing: { after: 80 },
    children: [
      new TextRun({ text: label, bold: true, font: 'Arial', size: 22 }),
      new TextRun({ text, font: 'Arial', size: 22 }),
    ] });
}
function wordBlock(text) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text, font: 'Courier New', size: 21, color: '374151' })] });
}
function divider() {
  return new Paragraph({ spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: AMBER, space: 8 } },
    children: [] });
}
function makeCell(text, opts = {}) {
  const { bold, header, width } = opts;
  return new TableCell({
    borders, width: width ? { size: width, type: WidthType.DXA } : undefined,
    margins: cellMargins,
    shading: header ? { fill: LIGHT_AMBER, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: text || '\u2014', font: 'Arial', size: 20, bold: bold || header })] })],
  });
}

const threadData = [
  ['ant','Pink (CVC)','',''],['arm','','','Green3 (ar)'],['bat','Pink2','',''],['bell','','Blue3 (-ll)',''],
  ['bird','','','Green3 (ir)'],['boat','','','Green2 (oa)'],['bus','Pink2','',''],['cake','','','Green2 (a_e)'],
  ['car','','','Green3 (ar)'],['cat','Pink1','',''],['clam','','Blue1 (cl-)',''],['cup','Pink2','',''],
  ['dawn','','','Green2 (aw)'],['dish','','','Green1 (-sh)'],['dog','Pink2','',''],['drum','','Blue1 (dr-)',''],
  ['duck','','Blue3 (-ck)',''],['fan','Pink2','',''],['fish','','','Green1 (sh)'],['fist','','Blue2 (-st)',''],
  ['fork','','','Green3 (or)'],['frog','','Blue1 (fr-)',''],['girl','','','Green3 (ir)'],['goat','','','Green2 (oa)'],
  ['gong','','Blue2 (-ng)',''],['grip','','Blue1 (gr-)',''],['gum','Pink2','',''],['hand','','Blue2 (-nd)',''],
  ['hat','Pink2','',''],['hill','','Blue3 (-ll)',''],['hook','','','Green2 (oo)'],['horn','','','Green3 (or)'],
  ['ice','','','Green3'],['inch','','','Green1 (ch)'],['ink','','Blue2 (-nk)',''],['jar','','','Green3 (ar)'],
  ['jaw','','','Green2 (aw)'],['jazz','','Blue3 (-zz)',''],['jet','Pink2','',''],['jug','Pink1','',''],
  ['king','','Blue2 (-ng)',''],['kiss','','Blue3 (-ss)',''],['kit','Pink2','',''],['kite','','','Green2 (i_e)'],
  ['knife','','','Green3 (kn-)'],['lamp','','Blue2 (-mp)',''],['leaf','','','Green2 (ea)'],['leg','Pink2','',''],
  ['light','','','Green3 (igh)'],['lock','','Blue3 (-ck)',''],['map','Pink1','',''],['mast','','Blue2 (-st)',''],
  ['mill','','Blue3 (-ll)',''],['moon','','','Green2 (oo)'],['moth','','','Green1 (th)'],['nail','','','Green2 (ai)'],
  ['neck','','Blue3 (-ck)',''],['nest','','Blue2 (-st)',''],['net','Pink1','',''],['nurse','','','Green3 (ur)'],
  ['oak','','','Green2 (oa)'],['oil','','','Green2 (oi)'],['owl','','','Green2 (ow)'],['park','','','Green3 (ar)'],
  ['path','','','Green1 (th)'],['pig','Pink2','',''],['plug','','Blue1 (pl-)',''],['pump','','Blue2 (-mp)',''],
  ['rain','','','Green2 (ai)'],['ramp','','Blue2 (-mp)',''],['rat','Pink2','',''],['ring','','Blue2 (-ng)',''],
  ['rock','','Blue3 (-ck)',''],['sand','','Blue2 (-nd)',''],['ship','','','Green1 (sh)'],['sled','','Blue1 (sl-)',''],
  ['star','','','Green3 (ar)'],['sun','Pink2','',''],['tack','','Blue3 (-ck)',''],['tank','','Blue2 (-nk)',''],
  ['top','Pink1','',''],['tram','','Blue1 (tr-)',''],['tree','','','Green2 (ee)'],['van','Pink1','',''],
  ['vest','','Blue2 (-st)',''],['vet','Pink2','',''],['vine','','','Green2 (i_e)'],['wall','','Blue3 (-ll)',''],
  ['wand','','Blue2 (-nd)',''],['wave','','','Green2 (a_e)'],['web','Pink1','',''],['whip','','','Green1 (wh)'],
  ['yam','Pink1','',''],['yard','','','Green3 (ar)'],['yawn','','','Green2 (aw)'],['zip','Pink1','',''],
  ['zoo','','','Green2 (oo)'],
];
const shopping = [
  ['A','plastic apple, plastic ant, arm picture card, toy ax, plastic avocado'],
  ['B','plastic bat, toy bus, small bell, toy boat, bird figurine'],
  ['C','plastic cat, dollhouse cup, clam shell, toy cake, toy car'],
  ['D','plastic dog, miniature drum, rubber duck, small dish, sunrise card'],
  ['E','wooden egg, elephant figurine, elbow picture card, real envelope, eraser'],
  ['F','small folding fan, plastic frog, fist card, plastic fish, small fork'],
  ['G','bubble gum picture, grip handle, small gong, goat figurine, girl figurine'],
  ['H','doll hat, hand model, hill picture card, small hook, small horn'],
  ['I','model igloo, plastic insect, ruler (inch), ice cube, ink bottle'],
  ['J','small ceramic jug, toy jet, saxophone card, jaw bone card, small jar'],
  ['K','small toolkit, crown (king), lips card (kiss), toy kite, butter knife'],
  ['L','doll leg, dollhouse lamp, padlock, real leaf, lightbulb'],
  ['M','mini map, boat mast card, windmill figurine, moth figurine, moon figure'],
  ['N','small fish net, bird nest, giraffe figurine (neck), small nail, nurse figurine'],
  ['O','octopus figurine, plastic orange, owl figurine, oil bottle, oak leaf'],
  ['P','plastic pig, small plug, toy pump, path picture card, park picture card'],
  ['Q','queen figurine, small quilt, quarter coin, quail figurine, quiz card'],
  ['R','plastic rat, small ramp, small rock, rain cloud card, small ring'],
  ['S','sun charm, toy sled, sand in jar, toy ship, star card'],
  ['T','spinning top, toy tram, fish tank card, thumbtack, tree figurine'],
  ['U','mini umbrella, unicorn figurine, sea urchin model, kitchen utensil, doll uniform'],
  ['V','toy van, vet figurine, vest, vine picture card, model volcano'],
  ['W','plastic spider web, magic wand, brick (wall), small whip, wave picture card'],
  ['X','toy xylophone, x-ray picture card, plastic fox'],
  ['Y','small yam, yawning face card, house yard card, mini yogurt cup, egg yolk picture'],
  ['Z','zipper pull, zoo animal figurine, zebra figurine, real zipper, plastic zucchini'],
];
const colW = [1800, 2520, 2520, 2520];
const tableW = colW.reduce((a,b) => a+b, 0);

const threadTable = new Table({
  width: { size: tableW, type: WidthType.DXA },
  columnWidths: colW,
  rows: [
    new TableRow({ children: [
      makeCell('Word', { header: true, width: colW[0] }),
      makeCell('\u2192 Pink', { header: true, width: colW[1] }),
      makeCell('\u2192 Blue', { header: true, width: colW[2] }),
      makeCell('\u2192 Green', { header: true, width: colW[3] }),
    ]}),
    ...threadData.map(([w, pk, bl, gr]) => new TableRow({ children: [
      makeCell(w, { bold: true, width: colW[0] }),
      makeCell(pk, { width: colW[1] }),
      makeCell(bl, { width: colW[2] }),
      makeCell(gr, { width: colW[3] }),
    ]})),
  ],
});

const shopColW = [800, 8560];
const shopW = shopColW.reduce((a,b) => a+b, 0);
const shopTable = new Table({
  width: { size: shopW, type: WidthType.DXA },
  columnWidths: shopColW,
  rows: [
    new TableRow({ children: [
      makeCell('Letter', { header: true, width: shopColW[0] }),
      makeCell('Miniatures Needed', { header: true, width: shopColW[1] }),
    ]}),
    ...shopping.map(([letter, items]) => new TableRow({ children: [
      makeCell(letter, { bold: true, width: shopColW[0] }),
      makeCell(items, { width: shopColW[1] }),
    ]})),
  ],
});
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children: [
      // TITLE
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: 'Fast Phonics', font: 'Arial', size: 52, bold: true, color: AMBER })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
        children: [new TextRun({ text: 'Word Lists', font: 'Arial', size: 40, bold: true, color: '78350F' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 },
        children: [new TextRun({ text: 'Copy-paste word lists organized by generator destination', font: 'Arial', size: 24, color: GRAY, italics: true })] }),
      p('These are organized by where each word LIVES in the system. Copy-paste into the relevant generator.'),
      divider(),

      // SECTION 1: BEGINNING SOUNDS
      h1('Beginning Sounds (128 words)'),
      p('Already in phonics-data.ts as the BEGINNING_SOUNDS phase. These are the vocabulary words organized A\u2013Z. The generator will read them from phonics-data.ts automatically.'),
      divider(),

      // SECTION 2: PINK DICTIONARY
      h1('Pink Dictionary Words'),
      p('These are all Beginning Sound words that reappear in Pink Series (CVC). The child already knows these words from vocabulary work \u2014 now they decode them.'),
      pBold('23 words ', '\u2014 all CVC, all with matching pictures in Beginning Sounds:'),
      wordBlock('bat, bus, cat, cup, dog, fan, gum, hat, jug, jet, kit, leg, map, net, pig, rat, sun, top, van, vet, web, yam, zip'),
      h2('Organized by Vowel (for Pink Box sorting)'),
      pBold('Short A: ', 'bat, cat, fan, hat, map, rat, van, yam'),
      pBold('Short E: ', 'jet, leg, net, vet, web'),
      pBold('Short I: ', 'kit, pig, zip'),
      pBold('Short O: ', 'dog, top'),
      pBold('Short U: ', 'bus, cup, gum, jug, sun'),
      divider(),

      // SECTION 3: BLUE DICTIONARY
      h1('Blue Dictionary Words'),
      p('These are all Beginning Sound words that reappear in Blue Series (blends, final blends, doubles/-ck).'),
      h2('Blue 1 \u2014 Initial Blends (7 words)'),
      wordBlock('clam, drum, frog, grip, plug, sled, tram'),
      p('Child already knows these from Beginning Sounds \u2014 now decodes the blend.'),
      h2('Blue 2 \u2014 Final Blends (15 words)'),
      wordBlock('dawn, fist, gong, hand, king, lamp, mast, nest, pump, ramp, ring, sand, tank, vest, wand'),
      h2('Blue 3 \u2014 Doubles & -ck (11 words)'),
      wordBlock('bell, duck, hill, jazz, kiss, lock, mill, neck, rock, tack, wall'),
      h3('All Blue words combined (33 words)'),
      wordBlock('bell, clam, dawn, drum, duck, fist, frog, gong, grip, hand, hill, jazz, king, kiss, lamp, lock, mast, mill, neck, plug, pump, ramp, ring, rock, sand, sled, tank, tack, tram, vest, wall, wand'),
      divider(),

      // SECTION 4: GREEN DICTIONARY
      h1('Green Dictionary Words'),
      p('These are all Beginning Sound words that reappear in Green Series (digraphs, vowel teams, r-controlled, etc.).'),
      h2('Green 1 \u2014 Consonant Digraphs: sh, ch, th, wh (7 words)'),
      wordBlock('dish, fish, inch, moth, path, ship, whip'),
      h2('Green 2 \u2014 Vowel Teams & Silent E (18 words)'),
      wordBlock('boat, cake, dawn, goat, hook, jaw, kite, leaf, moon, nail, oak, oil, owl, rain, tree, wave, yawn, zoo'),
      h2('Green 3 \u2014 R-Controlled & Advanced (14 words)'),
      wordBlock('arm, bird, car, fork, girl, horn, ice, jar, knife, light, nurse, park, star, yard'),      h3('All Green words combined (39 words)'),
      wordBlock('arm, bird, boat, cake, car, dawn, dish, fish, fork, girl, goat, hook, horn, ice, inch, jar, jaw, kite, knife, leaf, light, moon, moth, nail, nurse, oak, oil, owl, park, path, rain, ship, star, tree, wave, whip, yard, yawn, zoo'),
      divider(),

      // SECTION 5: BEGINNING SOUNDS ONLY
      h1('Beginning Sounds Only'),
      p('These words exist only in Beginning Sounds \u2014 pure vocabulary builders for letters with limited English phonics patterns.'),
      wordBlock('apple, avocado, ax, ant, egg, elephant, elbow, envelope, eraser, fox, igloo, insect, octopus, orange, quarter, queen, quail, quilt, quiz, umbrella, unicorn, urchin, uniform, utensil, vine, volcano, xylophone, x-ray, yogurt, yolk, zebra, zipper, zucchini'),
      p('33 words. These establish beginning sounds for difficult letters (A, E, I, O, Q, U, V, X, Y, Z).'),
      divider(),

      // SECTION 6: FULL LIST
      h1('Full Beginning Sounds List (all 128)'),
      p('Alphabetical by letter, 5 words per line:'),
      wordBlock('ant, apple, arm, avocado, ax'),
      wordBlock('bat, bell, bird, boat, bus'),
      wordBlock('cake, car, cat, clam, cup'),
      wordBlock('dawn, dish, dog, drum, duck'),
      wordBlock('egg, elbow, elephant, envelope, eraser'),
      wordBlock('fan, fish, fist, fork, frog'),
      wordBlock('girl, goat, gong, grip, gum'),
      wordBlock('hand, hat, hill, hook, horn'),
      wordBlock('ice, igloo, inch, ink, insect'),
      wordBlock('jar, jaw, jazz, jet, jug'),
      wordBlock('king, kiss, kit, kite, knife'),
      wordBlock('lamp, leaf, leg, light, lock'),
      wordBlock('map, mast, mill, moon, moth'),
      wordBlock('nail, neck, nest, net, nurse'),
      wordBlock('oak, octopus, oil, orange, owl'),
      wordBlock('park, path, pig, plug, pump'),      wordBlock('quail, quarter, queen, quilt, quiz'),
      wordBlock('rain, ramp, rat, ring, rock'),
      wordBlock('sand, ship, sled, star, sun'),
      wordBlock('tack, tank, top, tram, tree'),
      wordBlock('umbrella, unicorn, urchin, uniform, utensil'),
      wordBlock('van, vest, vet, vine, volcano'),
      wordBlock('wall, wand, wave, web, whip'),
      wordBlock('fox, x-ray, xylophone'),
      wordBlock('yard, yam, yawn, yogurt, yolk'),
      wordBlock('zebra, zip, zipper, zoo, zucchini'),

      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 7: SHOPPING LIST
      h1('Shopping List \u2014 Beginning Sounds Miniatures'),
      p('What to buy for the physical Beginning Sounds object boxes (26 compartments, A\u2013Z):'),
      shopTable,

      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 8: THREAD-THROUGH TABLE
      h1('Thread-Through Summary'),
      p('95 words that appear in Beginning Sounds AND reappear in at least one later phonics phase. This is the backbone of picture consistency \u2014 the SAME image follows the child from vocabulary to decoding.'),
      threadTable,
    ],
  }],
});

const outPath = '/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/docs/FAST_PHONICS_WORD_LISTS.docx';
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('Done! Wrote ' + buf.length + ' bytes to ' + outPath);
}).catch(err => { console.error('Error:', err); process.exit(1); });