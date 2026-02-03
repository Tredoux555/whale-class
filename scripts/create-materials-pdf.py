#!/usr/bin/env python3
"""Create Montessori English Materials List PDF"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Output path
OUTPUT_PATH = "public/guides/Montessori-English-Materials-List.pdf"

def create_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a365d')
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Heading1'],
        fontSize=16,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor('#2d3748')
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontSize=13,
        spaceBefore=15,
        spaceAfter=8,
        textColor=colors.HexColor('#4a5568')
    )

    h3_style = ParagraphStyle(
        'H3',
        parent=styles['Heading3'],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=5,
        textColor=colors.HexColor('#718096')
    )

    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=6
    )

    warning_style = ParagraphStyle(
        'Warning',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#c53030'),
        spaceAfter=6
    )

    story = []

    # Title
    story.append(Paragraph("Montessori English - Complete Materials List", title_style))
    story.append(Paragraph("Everything You Need to Create & Buy", styles['Heading2']))
    story.append(Spacer(1, 20))

    # Summary table
    summary_data = [
        ['Category', 'Count'],
        ['Pictures to print', '337 unique'],
        ['3-Part Cards to make', '1,011 cards'],
        ['Miniature objects', '115 (incl. 17 duplicates)'],
        ['Sandpaper letters', '26'],
        ['Phonogram cards', '30'],
    ]
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 20))

    # DUPLICATES WARNING
    story.append(Paragraph("OBJECTS TO BUY TWICE (Used in multiple places)", h1_style))
    story.append(Paragraph("These items are used in BOTH Sound Games AND Word Boxes - buy 2 of each!", warning_style))

    duplicates = "cat, dog, pig, hat, sun, cup, bus, bug, pen, bed, hen, pot, pan, box, bag, fish, frog"
    story.append(Paragraph(f"<b>{duplicates}</b>", normal_style))
    story.append(Paragraph("= 34 objects total (17 items x 2)", normal_style))

    story.append(PageBreak())

    # PINK SERIES PICTURES
    story.append(Paragraph("PINK SERIES PICTURES (69 Total)", h1_style))

    pink_data = [
        ['Short A (15)', 'cat, bat, hat, mat, sat, rat, can, pan, man, fan, cap, map, tap, bag, tag'],
        ['Short E (12)', 'bed, red, pen, hen, ten, net, wet, pet, jet, leg, peg, web'],
        ['Short I (15)', 'pig, big, dig, wig, pin, bin, fin, win, sit, hit, lip, tip, zip, fig, kit'],
        ['Short O (12)', 'dog, log, fog, pot, hot, cot, mop, top, hop, box, fox, job'],
        ['Short U (15)', 'cup, pup, bus, nut, hut, cut, bug, rug, hug, mug, jug, sun, run, fun, bun'],
    ]

    pink_table = Table(pink_data, colWidths=[1.2*inch, 5.3*inch])
    pink_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#fce7f3')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f9a8d4')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(pink_table)
    story.append(Spacer(1, 15))

    # BLUE SERIES PICTURES
    story.append(Paragraph("BLUE SERIES PICTURES (118 Total)", h1_style))

    blue_data = [
        ['L-Blends (18)', 'black, blue, clap, clock, flag, flip, glad, glass, plan, plant, play, plug, plum, slam, sled, sleep, slip, slow'],
        ['R-Blends (24)', 'brick, brush, brown, bread, crab, crib, crop, drum, dress, drip, drop, frog, fresh, free, grab, grass, green, grin, grow, press, print, trip, truck, tree'],
        ['S-Blends (24)', 'skip, skin, skunk, skate, small, smell, smile, smoke, snap, snack, snake, snow, spell, spin, spot, spoon, stand, star, step, stick, stop, stone, swim, swing'],
        ['End Blends (20)', 'hand, sand, band, pond, bank, tank, pink, sink, camp, lamp, stamp, jump, bump, nest, best, list, dust, fast, last, must'],
        ['SH Words (14)', 'ship, shop, shell, shed, shut, fish, dish, wish, wash, brush, crash, splash, push, rush'],
        ['CH Words (14)', 'chat, chip, chop, chin, chest, check, chick, much, such, rich, lunch, bench, catch, match'],
        ['TH Words (10)', 'thin, thick, think, thing, thank, bath, math, path, with, both'],
    ]

    blue_table = Table(blue_data, colWidths=[1.2*inch, 5.3*inch])
    blue_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#dbeafe')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#93c5fd')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(blue_table)

    story.append(PageBreak())

    # GREEN SERIES PICTURES
    story.append(Paragraph("GREEN SERIES PICTURES (150 Total)", h1_style))

    green_data = [
        ['AI Words (14)', 'rain, train, mail, tail, nail, sail, pail, snail, wait, paint, chain, brain, main, pain'],
        ['AY Words (12)', 'day, play, say, way, may, stay, pay, hay, clay, tray, gray, spray'],
        ['EE Words (14)', 'bee, see, tree, free, green, feet, sleep, keep, deep, sheep, wheel, sweet, teeth, need'],
        ['EA Words (15)', 'eat, sea, tea, pea, read, bean, leaf, meat, heat, seat, beach, peach, clean, dream, team'],
        ['OA Words (10)', 'boat, coat, goat, road, toad, soap, toast, float, goal, load'],
        ['OW Words (10)', 'snow, blow, grow, show, slow, know, flow, row, low, throw'],
        ['Long OO (12)', 'moon, spoon, room, zoo, food, cool, pool, school, broom, tooth, boot, hoop'],
        ['Short OO (9)', 'book, look, cook, good, wood, foot, hook, took, stood'],
        ['AR Words (15)', 'car, star, far, jar, bar, card, park, dark, arm, farm, barn, yard, hard, shark, art'],
        ['OR Words (15)', 'corn, horn, born, fork, pork, storm, horse, north, short, more, store, door, floor, sport, fort'],
        ['ER/IR/UR (15)', 'her, bird, girl, first, dirt, shirt, turn, burn, fur, nurse, hurt, church, purple, turtle, fern'],
        ['A-E Silent E (24)', 'make, take, cake, bake, lake, wake, name, game, came, same, late, gate, plate, skate, face, place, race, space, snake, wave, save, gave, cave, shape'],
        ['I-E Silent E (21)', 'like, bike, hike, time, dime, line, fine, mine, nine, five, dive, hide, ride, side, wide, kite, bite, white, smile, fire, wire'],
        ['O-E Silent E (20)', 'home, bone, cone, phone, stone, hope, rope, nose, rose, close, those, hole, pole, note, vote, joke, woke, broke, smoke, stove'],
        ['U-E Silent E (10)', 'use, cute, cube, tube, huge, mule, rule, June, tune, flute'],
    ]

    green_table = Table(green_data, colWidths=[1.3*inch, 5.2*inch])
    green_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#d1fae5')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#6ee7b7')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(green_table)

    story.append(PageBreak())

    # SOUND GAMES OBJECTS
    story.append(Paragraph("SOUND GAMES OBJECTS (75 Total)", h1_style))
    story.append(Paragraph("2-3 miniature objects per beginning sound", normal_style))

    sound_data = [
        ['/a/', 'apple, ant, alligator', '/n/', 'nest, nurse, nail'],
        ['/b/', 'ball, bear, butterfly', '/o/', 'octopus, orange, otter'],
        ['/c/', 'car, cow, carrot', '/p/', 'pig, penguin, pear'],
        ['/d/', 'duck, dinosaur, door', '/q/', 'queen, quilt'],
        ['/e/', 'egg, elephant, elf', '/r/', 'rabbit, ring, robot'],
        ['/f/', 'fish, frog, feather', '/s/', 'sun, snake, seal'],
        ['/g/', 'goat, grapes, guitar', '/t/', 'tiger, table, turtle'],
        ['/h/', 'horse, house, hammer', '/u/', 'umbrella, unicorn'],
        ['/i/', 'igloo, insect, ink', '/v/', 'van, violin, vase'],
        ['/j/', 'jar, jet, jelly', '/w/', 'watch, whale, worm'],
        ['/k/', 'key, kite, kangaroo', '/x/', 'x-ray, xylophone'],
        ['/l/', 'lion, leaf, lamp', '/y/', 'yarn, yak, yo-yo'],
        ['/m/', 'mouse, monkey, moon', '/z/', 'zebra, zipper, zoo'],
    ]

    sound_table = Table(sound_data, colWidths=[0.5*inch, 2.5*inch, 0.5*inch, 2.5*inch])
    sound_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#fef3c7')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#fef3c7')),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(sound_table)
    story.append(Spacer(1, 15))

    # PINK OBJECT BOXES
    story.append(Paragraph("PINK SERIES OBJECT BOXES (40 Total)", h1_style))
    story.append(Paragraph("8 objects per vowel sound box", normal_style))

    box_data = [
        ['Short A Box', 'cat, hat, bat, rat, mat, pan, can, bag'],
        ['Short E Box', 'bed, pen, hen, net, jet, leg, peg, web'],
        ['Short I Box', 'pig, wig, pin, bin, fin, lip, zip, kit'],
        ['Short O Box', 'dog, log, pot, cot, mop, top, box, fox'],
        ['Short U Box', 'cup, pup, bus, nut, bug, rug, mug, jug'],
    ]

    box_table = Table(box_data, colWidths=[1.2*inch, 5.3*inch])
    box_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#fce7f3')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#f9a8d4')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(box_table)

    story.append(PageBreak())

    # 3-PART CARDS
    story.append(Paragraph("3-PART CARDS REQUIREMENTS", h1_style))
    story.append(Paragraph("Each word needs 3 cards: Control (Picture+Word), Picture Only, Label Only", normal_style))

    cards_data = [
        ['Series', 'Words', 'Cards per Word', 'Total Cards', 'Border Color'],
        ['Pink Series', '69', '3', '207', 'PINK'],
        ['Blue Series', '118', '3', '354', 'BLUE'],
        ['Green Series', '150', '3', '450', 'GREEN'],
        ['GRAND TOTAL', '337', '', '1,011', ''],
    ]

    cards_table = Table(cards_data, colWidths=[1.3*inch, 0.8*inch, 1.1*inch, 1*inch, 1*inch])
    cards_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#fce7f3')),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#dbeafe')),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#d1fae5')),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#fef3c7')),
    ]))
    story.append(cards_table)
    story.append(Spacer(1, 15))

    # EQUIPMENT TO BUY
    story.append(Paragraph("EQUIPMENT TO BUY", h1_style))

    equip_data = [
        ['Item', 'Qty', 'Priority'],
        ['Moveable Alphabet (Large)', '1 set', 'Essential'],
        ['Extra vowel sets (a,e,i,o,u)', '3 sets', 'Essential'],
        ['Sandpaper Letters', '26', 'Essential'],
        ['Sand Tray', '1', 'Essential'],
        ['Fine Sand', '1 bag', 'Essential'],
        ['Metal Insets (10 shapes)', '1 set', 'Essential'],
        ['Colored Pencils', '2 sets', 'Essential'],
        ['Small Chalkboards', '5-10', 'Essential'],
        ['Chalk', '1 box', 'Essential'],
        ['Object Boxes (wooden)', '5', 'Essential'],
        ['Storage Baskets', '10-15', 'Helpful'],
        ['Laminator', '1', 'Essential'],
        ['Laminating Pouches', '500', 'Essential'],
        ['Pink Cardstock', '50 sheets', 'For cards'],
        ['Blue Cardstock', '100 sheets', 'For cards'],
        ['Green Cardstock', '150 sheets', 'For cards'],
    ]

    equip_table = Table(equip_data, colWidths=[3*inch, 1*inch, 1*inch])
    equip_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
    ]))
    story.append(equip_table)
    story.append(Spacer(1, 15))

    # QUICK SHOPPING LIST
    story.append(Paragraph("QUICK SHOPPING LIST (Taobao/Amazon)", h1_style))

    shopping_items = [
        "□ Miniature animal set - 50+ pieces",
        "□ Miniature food set - 20+ pieces",
        "□ Miniature household items - 30+ pieces",
        "□ Moveable Alphabet",
        "□ Sandpaper Letters (or make yourself)",
        "□ Sand Tray + Sand",
        "□ Metal Insets (10 shapes)",
        "□ Small chalkboards x 10",
        "□ Wooden boxes x 5 for object sorting",
        "□ Laminator + 500 pouches",
        "□ Cardstock (pink, blue, green, white)",
    ]

    for item in shopping_items:
        story.append(Paragraph(item, normal_style))

    story.append(Spacer(1, 15))
    story.append(Paragraph("<b>Estimated Budget: ¥800-1,500 ($110-210 USD)</b>", normal_style))

    # Build PDF
    doc.build(story)
    print(f"PDF created: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_pdf()
