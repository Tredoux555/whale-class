#!/usr/bin/env node
/**
 * Create Montessori English Materials List DOCX
 */

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
         AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel,
         PageBreak, LevelFormat } from 'docx';
import { writeFileSync } from 'fs';

const OUTPUT_PATH = 'public/guides/Montessori-English-Materials-List.docx';

// Colors
const PINK = 'FCE7F3';
const BLUE = 'DBEAFE';
const GREEN = 'D1FAE5';
const YELLOW = 'FEF3C7';
const GRAY = '4A5568';
const LIGHT_GRAY = 'F7FAFC';

// Border style
const border = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
const borders = { top: border, bottom: border, left: border, right: border };

// Helper to create table cell
function cell(text, options = {}) {
    const { bold = false, fill = 'FFFFFF', width = 2000, fontSize = 18 } = options;
    return new TableCell({
        borders,
        width: { size: width, type: WidthType.DXA },
        shading: { fill, type: ShadingType.CLEAR },
        margins: { top: 50, bottom: 50, left: 80, right: 80 },
        children: [new Paragraph({
            children: [new TextRun({ text, bold, size: fontSize })]
        })]
    });
}

// Helper to create header cell
function headerCell(text, width = 2000) {
    return cell(text, { bold: true, fill: GRAY, width });
}

async function createDocx() {
    const doc = new Document({
        numbering: {
            config: [{
                reference: 'checklist',
                levels: [{
                    level: 0,
                    format: LevelFormat.BULLET,
                    text: '☐',
                    alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } }
                }]
            }]
        },
        styles: {
            default: { document: { run: { font: 'Arial', size: 22 } } },
            paragraphStyles: [
                { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                  run: { size: 32, bold: true, color: '1A365D' },
                  paragraph: { spacing: { before: 300, after: 150 } } },
                { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                  run: { size: 26, bold: true, color: '2D3748' },
                  paragraph: { spacing: { before: 200, after: 100 } } },
            ]
        },
        sections: [{
            properties: {
                page: {
                    size: { width: 12240, height: 15840 },
                    margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
                }
            },
            children: [
                // TITLE
                new Paragraph({
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Montessori English - Complete Materials List', bold: true, size: 40 })]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Everything You Need to Create & Buy', size: 24, italics: true })]
                }),
                new Paragraph({ children: [] }),

                // SUMMARY TABLE
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [
                            cell('Category', { bold: true, fill: GRAY, width: 4000 }),
                            cell('Count', { bold: true, fill: GRAY, width: 3000 }),
                        ]}),
                        new TableRow({ children: [cell('Pictures to print', { width: 4000 }), cell('337 unique', { width: 3000 })]}),
                        new TableRow({ children: [cell('3-Part Cards to make', { width: 4000, fill: LIGHT_GRAY }), cell('1,011 cards', { width: 3000, fill: LIGHT_GRAY })]}),
                        new TableRow({ children: [cell('Miniature objects', { width: 4000 }), cell('115 (incl. 17 duplicates)', { width: 3000 })]}),
                        new TableRow({ children: [cell('Sandpaper letters', { width: 4000, fill: LIGHT_GRAY }), cell('26', { width: 3000, fill: LIGHT_GRAY })]}),
                        new TableRow({ children: [cell('Phonogram cards', { width: 4000 }), cell('30', { width: 3000 })]}),
                    ]
                }),
                new Paragraph({ children: [] }),

                // DUPLICATES WARNING
                new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('⚠️ OBJECTS TO BUY TWICE')] }),
                new Paragraph({ children: [new TextRun({ text: 'These items are used in BOTH Sound Games AND Word Boxes - buy 2 of each!', color: 'C53030' })] }),
                new Paragraph({ children: [new TextRun({ text: 'cat, dog, pig, hat, sun, cup, bus, bug, pen, bed, hen, pot, pan, box, bag, fish, frog', bold: true })] }),
                new Paragraph({ children: [new TextRun('= 34 objects total (17 items × 2)')] }),

                new Paragraph({ children: [new PageBreak()] }),

                // PINK SERIES
                new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('PINK SERIES PICTURES (69 Total)')] }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [cell('Short A (15)', { bold: true, fill: PINK, width: 2000, fontSize: 16 }), cell('cat, bat, hat, mat, sat, rat, can, pan, man, fan, cap, map, tap, bag, tag', { width: 8000, fontSize: 16 })]}),
                        new TableRow({ children: [cell('Short E (12)', { bold: true, fill: PINK, width: 2000, fontSize: 16 }), cell('bed, red, pen, hen, ten, net, wet, pet, jet, leg, peg, web', { width: 8000, fontSize: 16 })]}),
                        new TableRow({ children: [cell('Short I (15)', { bold: true, fill: PINK, width: 2000, fontSize: 16 }), cell('pig, big, dig, wig, pin, bin, fin, win, sit, hit, lip, tip, zip, fig, kit', { width: 8000, fontSize: 16 })]}),
                        new TableRow({ children: [cell('Short O (12)', { bold: true, fill: PINK, width: 2000, fontSize: 16 }), cell('dog, log, fog, pot, hot, cot, mop, top, hop, box, fox, job', { width: 8000, fontSize: 16 })]}),
                        new TableRow({ children: [cell('Short U (15)', { bold: true, fill: PINK, width: 2000, fontSize: 16 }), cell('cup, pup, bus, nut, hut, cut, bug, rug, hug, mug, jug, sun, run, fun, bun', { width: 8000, fontSize: 16 })]}),
                    ]
                }),
                new Paragraph({ children: [] }),

                // BLUE SERIES
                new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('BLUE SERIES PICTURES (118 Total)')] }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [cell('L-Blends (18)', { bold: true, fill: BLUE, width: 2000, fontSize: 14 }), cell('black, blue, clap, clock, flag, flip, glad, glass, plan, plant, play, plug, plum, slam, sled, sleep, slip, slow', { width: 8000, fontSize: 14 })]}),
                        new TableRow({ children: [cell('R-Blends (24)', { bold: true, fill: BLUE, width: 2000, fontSize: 14 }), cell('brick, brush, brown, bread, crab, crib, crop, drum, dress, drip, drop, frog, fresh, free, grab, grass, green, grin, grow, press, print, trip, truck, tree', { width: 8000, fontSize: 14 })]}),
                        new TableRow({ children: [cell('S-Blends (24)', { bold: true, fill: BLUE, width: 2000, fontSize: 14 }), cell('skip, skin, skunk, skate, small, smell, smile, smoke, snap, snack, snake, snow, spell, spin, spot, spoon, stand, star, step, stick, stop, stone, swim, swing', { width: 8000, fontSize: 14 })]}),
                        new TableRow({ children: [cell('End Blends (20)', { bold: true, fill: BLUE, width: 2000, fontSize: 14 }), cell('hand, sand, band, pond, bank, tank, pink, sink, camp, lamp, stamp, jump, bump, nest, best, list, dust, fast, last, must', { width: 8000, fontSize: 14 })]}),
                        new TableRow({ children: [cell('SH Words (14)', { bold: true, fill: BLUE, width: 2000, fontSize: 14 }), cell('ship, shop, shell, shed, shut, fish, dish, wish, wash, brush, crash, splash, push, rush', { width: 8000, fontSize: 14 })]}),
                        new TableRow({ children: [cell('CH Words (14)', { bold: true, fill: BLUE, width: 2000, fontSize: 14 }), cell('chat, chip, chop, chin, chest, check, chick, much, such, rich, lunch, bench, catch, match', { width: 8000, fontSize: 14 })]}),
                        new TableRow({ children: [cell('TH Words (10)', { bold: true, fill: BLUE, width: 2000, fontSize: 14 }), cell('thin, thick, think, thing, thank, bath, math, path, with, both', { width: 8000, fontSize: 14 })]}),
                    ]
                }),

                new Paragraph({ children: [new PageBreak()] }),

                // GREEN SERIES
                new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('GREEN SERIES PICTURES (150 Total)')] }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [cell('AI Words (14)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('rain, train, mail, tail, nail, sail, pail, snail, wait, paint, chain, brain, main, pain', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('AY Words (12)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('day, play, say, way, may, stay, pay, hay, clay, tray, gray, spray', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('EE Words (14)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('bee, see, tree, free, green, feet, sleep, keep, deep, sheep, wheel, sweet, teeth, need', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('EA Words (15)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('eat, sea, tea, pea, read, bean, leaf, meat, heat, seat, beach, peach, clean, dream, team', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('OA Words (10)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('boat, coat, goat, road, toad, soap, toast, float, goal, load', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('OW Words (10)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('snow, blow, grow, show, slow, know, flow, row, low, throw', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('Long OO (12)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('moon, spoon, room, zoo, food, cool, pool, school, broom, tooth, boot, hoop', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('Short OO (9)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('book, look, cook, good, wood, foot, hook, took, stood', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('AR Words (15)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('car, star, far, jar, bar, card, park, dark, arm, farm, barn, yard, hard, shark, art', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('OR Words (15)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('corn, horn, born, fork, pork, storm, horse, north, short, more, store, door, floor, sport, fort', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('ER/IR/UR (15)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('her, bird, girl, first, dirt, shirt, turn, burn, fur, nurse, hurt, church, purple, turtle, fern', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('A-E Silent E (24)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('make, take, cake, bake, lake, wake, name, game, came, same, late, gate, plate, skate, face, place, race, space, snake, wave, save, gave, cave, shape', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('I-E Silent E (21)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('like, bike, hike, time, dime, line, fine, mine, nine, five, dive, hide, ride, side, wide, kite, bite, white, smile, fire, wire', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('O-E Silent E (20)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('home, bone, cone, phone, stone, hope, rope, nose, rose, close, those, hole, pole, note, vote, joke, woke, broke, smoke, stove', { width: 7800, fontSize: 14 })]}),
                        new TableRow({ children: [cell('U-E Silent E (10)', { bold: true, fill: GREEN, width: 2200, fontSize: 14 }), cell('use, cute, cube, tube, huge, mule, rule, June, tune, flute', { width: 7800, fontSize: 14 })]}),
                    ]
                }),

                new Paragraph({ children: [new PageBreak()] }),

                // SOUND GAMES OBJECTS
                new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('SOUND GAMES OBJECTS (75 Total)')] }),
                new Paragraph({ children: [new TextRun('2-3 miniature objects per beginning sound')] }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [cell('/a/', { bold: true, fill: YELLOW, width: 800 }), cell('apple, ant, alligator', { width: 4100 }), cell('/n/', { bold: true, fill: YELLOW, width: 800 }), cell('nest, nurse, nail', { width: 4100 })]}),
                        new TableRow({ children: [cell('/b/', { bold: true, fill: YELLOW, width: 800 }), cell('ball, bear, butterfly', { width: 4100 }), cell('/o/', { bold: true, fill: YELLOW, width: 800 }), cell('octopus, orange, otter', { width: 4100 })]}),
                        new TableRow({ children: [cell('/c/', { bold: true, fill: YELLOW, width: 800 }), cell('car, cow, carrot', { width: 4100 }), cell('/p/', { bold: true, fill: YELLOW, width: 800 }), cell('pig, penguin, pear', { width: 4100 })]}),
                        new TableRow({ children: [cell('/d/', { bold: true, fill: YELLOW, width: 800 }), cell('duck, dinosaur, door', { width: 4100 }), cell('/q/', { bold: true, fill: YELLOW, width: 800 }), cell('queen, quilt', { width: 4100 })]}),
                        new TableRow({ children: [cell('/e/', { bold: true, fill: YELLOW, width: 800 }), cell('egg, elephant, elf', { width: 4100 }), cell('/r/', { bold: true, fill: YELLOW, width: 800 }), cell('rabbit, ring, robot', { width: 4100 })]}),
                        new TableRow({ children: [cell('/f/', { bold: true, fill: YELLOW, width: 800 }), cell('fish, frog, feather', { width: 4100 }), cell('/s/', { bold: true, fill: YELLOW, width: 800 }), cell('sun, snake, seal', { width: 4100 })]}),
                        new TableRow({ children: [cell('/g/', { bold: true, fill: YELLOW, width: 800 }), cell('goat, grapes, guitar', { width: 4100 }), cell('/t/', { bold: true, fill: YELLOW, width: 800 }), cell('tiger, table, turtle', { width: 4100 })]}),
                        new TableRow({ children: [cell('/h/', { bold: true, fill: YELLOW, width: 800 }), cell('horse, house, hammer', { width: 4100 }), cell('/u/', { bold: true, fill: YELLOW, width: 800 }), cell('umbrella, unicorn', { width: 4100 })]}),
                        new TableRow({ children: [cell('/i/', { bold: true, fill: YELLOW, width: 800 }), cell('igloo, insect, ink', { width: 4100 }), cell('/v/', { bold: true, fill: YELLOW, width: 800 }), cell('van, violin, vase', { width: 4100 })]}),
                        new TableRow({ children: [cell('/j/', { bold: true, fill: YELLOW, width: 800 }), cell('jar, jet, jelly', { width: 4100 }), cell('/w/', { bold: true, fill: YELLOW, width: 800 }), cell('watch, whale, worm', { width: 4100 })]}),
                        new TableRow({ children: [cell('/k/', { bold: true, fill: YELLOW, width: 800 }), cell('key, kite, kangaroo', { width: 4100 }), cell('/x/', { bold: true, fill: YELLOW, width: 800 }), cell('x-ray, xylophone', { width: 4100 })]}),
                        new TableRow({ children: [cell('/l/', { bold: true, fill: YELLOW, width: 800 }), cell('lion, leaf, lamp', { width: 4100 }), cell('/y/', { bold: true, fill: YELLOW, width: 800 }), cell('yarn, yak, yo-yo', { width: 4100 })]}),
                        new TableRow({ children: [cell('/m/', { bold: true, fill: YELLOW, width: 800 }), cell('mouse, monkey, moon', { width: 4100 }), cell('/z/', { bold: true, fill: YELLOW, width: 800 }), cell('zebra, zipper, zoo', { width: 4100 })]}),
                    ]
                }),
                new Paragraph({ children: [] }),

                // PINK OBJECT BOXES
                new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('PINK SERIES OBJECT BOXES (40 Total)')] }),
                new Paragraph({ children: [new TextRun('8 objects per vowel sound box')] }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [cell('Short A Box', { bold: true, fill: PINK, width: 2000 }), cell('cat, hat, bat, rat, mat, pan, can, bag', { width: 8000 })]}),
                        new TableRow({ children: [cell('Short E Box', { bold: true, fill: PINK, width: 2000 }), cell('bed, pen, hen, net, jet, leg, peg, web', { width: 8000 })]}),
                        new TableRow({ children: [cell('Short I Box', { bold: true, fill: PINK, width: 2000 }), cell('pig, wig, pin, bin, fin, lip, zip, kit', { width: 8000 })]}),
                        new TableRow({ children: [cell('Short O Box', { bold: true, fill: PINK, width: 2000 }), cell('dog, log, pot, cot, mop, top, box, fox', { width: 8000 })]}),
                        new TableRow({ children: [cell('Short U Box', { bold: true, fill: PINK, width: 2000 }), cell('cup, pup, bus, nut, bug, rug, mug, jug', { width: 8000 })]}),
                    ]
                }),

                new Paragraph({ children: [new PageBreak()] }),

                // 3-PART CARDS
                new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('3-PART CARDS REQUIREMENTS')] }),
                new Paragraph({ children: [new TextRun('Each word needs 3 cards: Control (Picture+Word), Picture Only, Label Only')] }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [cell('Series', { bold: true, fill: GRAY, width: 2000 }), cell('Words', { bold: true, fill: GRAY, width: 1500 }), cell('× 3', { bold: true, fill: GRAY, width: 1000 }), cell('Total', { bold: true, fill: GRAY, width: 1500 }), cell('Color', { bold: true, fill: GRAY, width: 1500 })]}),
                        new TableRow({ children: [cell('Pink Series', { fill: PINK, width: 2000 }), cell('69', { width: 1500 }), cell('3', { width: 1000 }), cell('207', { width: 1500 }), cell('PINK', { fill: PINK, width: 1500 })]}),
                        new TableRow({ children: [cell('Blue Series', { fill: BLUE, width: 2000 }), cell('118', { width: 1500 }), cell('3', { width: 1000 }), cell('354', { width: 1500 }), cell('BLUE', { fill: BLUE, width: 1500 })]}),
                        new TableRow({ children: [cell('Green Series', { fill: GREEN, width: 2000 }), cell('150', { width: 1500 }), cell('3', { width: 1000 }), cell('450', { width: 1500 }), cell('GREEN', { fill: GREEN, width: 1500 })]}),
                        new TableRow({ children: [cell('TOTAL', { bold: true, fill: YELLOW, width: 2000 }), cell('337', { bold: true, fill: YELLOW, width: 1500 }), cell('', { fill: YELLOW, width: 1000 }), cell('1,011', { bold: true, fill: YELLOW, width: 1500 }), cell('', { fill: YELLOW, width: 1500 })]}),
                    ]
                }),
                new Paragraph({ children: [] }),

                // EQUIPMENT
                new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('EQUIPMENT TO BUY')] }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [cell('Item', { bold: true, fill: GRAY, width: 5000 }), cell('Qty', { bold: true, fill: GRAY, width: 1500 }), cell('Priority', { bold: true, fill: GRAY, width: 1500 })]}),
                        new TableRow({ children: [cell('Moveable Alphabet (Large)', { width: 5000 }), cell('1 set', { width: 1500 }), cell('Essential', { width: 1500 })]}),
                        new TableRow({ children: [cell('Extra vowel sets (a,e,i,o,u)', { width: 5000, fill: LIGHT_GRAY }), cell('3 sets', { width: 1500, fill: LIGHT_GRAY }), cell('Essential', { width: 1500, fill: LIGHT_GRAY })]}),
                        new TableRow({ children: [cell('Sandpaper Letters', { width: 5000 }), cell('26', { width: 1500 }), cell('Essential', { width: 1500 })]}),
                        new TableRow({ children: [cell('Sand Tray + Fine Sand', { width: 5000, fill: LIGHT_GRAY }), cell('1', { width: 1500, fill: LIGHT_GRAY }), cell('Essential', { width: 1500, fill: LIGHT_GRAY })]}),
                        new TableRow({ children: [cell('Metal Insets (10 shapes)', { width: 5000 }), cell('1 set', { width: 1500 }), cell('Essential', { width: 1500 })]}),
                        new TableRow({ children: [cell('Colored Pencils', { width: 5000, fill: LIGHT_GRAY }), cell('2 sets', { width: 1500, fill: LIGHT_GRAY }), cell('Essential', { width: 1500, fill: LIGHT_GRAY })]}),
                        new TableRow({ children: [cell('Small Chalkboards', { width: 5000 }), cell('5-10', { width: 1500 }), cell('Essential', { width: 1500 })]}),
                        new TableRow({ children: [cell('Object Boxes (wooden)', { width: 5000, fill: LIGHT_GRAY }), cell('5', { width: 1500, fill: LIGHT_GRAY }), cell('Essential', { width: 1500, fill: LIGHT_GRAY })]}),
                        new TableRow({ children: [cell('Storage Baskets', { width: 5000 }), cell('10-15', { width: 1500 }), cell('Helpful', { width: 1500 })]}),
                        new TableRow({ children: [cell('Laminator + Pouches (500)', { width: 5000, fill: LIGHT_GRAY }), cell('1', { width: 1500, fill: LIGHT_GRAY }), cell('Essential', { width: 1500, fill: LIGHT_GRAY })]}),
                        new TableRow({ children: [cell('Pink/Blue/Green Cardstock', { width: 5000 }), cell('300 sheets', { width: 1500 }), cell('For cards', { width: 1500 })]}),
                    ]
                }),
                new Paragraph({ children: [] }),

                // SHOPPING LIST
                new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('QUICK SHOPPING LIST')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Miniature animal set - 50+ pieces')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Miniature food set - 20+ pieces')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Miniature household items - 30+ pieces')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Moveable Alphabet')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Sandpaper Letters (or make yourself)')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Sand Tray + Sand')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Metal Insets (10 shapes)')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Small chalkboards × 10')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Wooden boxes × 5 for object sorting')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Laminator + 500 pouches')] }),
                new Paragraph({ numbering: { reference: 'checklist', level: 0 }, children: [new TextRun('Cardstock (pink, blue, green, white)')] }),
                new Paragraph({ children: [] }),
                new Paragraph({ children: [new TextRun({ text: 'Estimated Budget: ¥800-1,500 ($110-210 USD)', bold: true, size: 24 })] }),
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    writeFileSync(OUTPUT_PATH, buffer);
    console.log(`DOCX created: ${OUTPUT_PATH}`);
}

createDocx().catch(console.error);
