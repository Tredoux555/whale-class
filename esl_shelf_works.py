#!/usr/bin/env python3
"""
ESL Shelf Works for Chinese Learners — Printable Montessori Materials
Designed for 3-5 year olds who are L1 Mandarin Chinese, learning English.
Focus: CVC words, initial sounds, matching, and total physical response.

These are ACTUAL shelf works — print, cut, laminate, place on shelf.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

WIDTH, HEIGHT = A4
OUTPUT = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/ESL_Shelf_Works_Chinese_Learners.pdf"

# Colors
PINK = HexColor('#FFE4E1')      # Pink Series color
BLUE = HexColor('#E0E8FF')      # Blue Series color
TEAL = HexColor('#0D3330')      # Montree brand
EMERALD = HexColor('#4ADE80')
WARM_CREAM = HexColor('#FFF8E7')
SOFT_PINK = HexColor('#FFF0F0')
SOFT_BLUE = HexColor('#F0F4FF')
SOFT_GREEN = HexColor('#F0FFF4')
SOFT_YELLOW = HexColor('#FFFBE6')
SOFT_PURPLE = HexColor('#F5F0FF')
CORAL = HexColor('#FF6B6B')
SKY = HexColor('#4ECDC4')

def draw_header(c, title, subtitle, page_color=WARM_CREAM):
    """Draw page header with title"""
    # Background
    c.setFillColor(page_color)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1)
    
    # Header bar
    c.setFillColor(TEAL)
    c.rect(0, HEIGHT - 45*mm, WIDTH, 45*mm, fill=1)
    
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(WIDTH/2, HEIGHT - 22*mm, title)
    
    c.setFont("Helvetica", 12)
    c.drawCentredString(WIDTH/2, HEIGHT - 32*mm, subtitle)
    
    c.setFillColor(EMERALD)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(WIDTH/2, HEIGHT - 40*mm, "MONTREE — ESL Shelf Works for L1 Chinese Learners")

def draw_card_grid(c, cards, cols, rows, card_w, card_h, start_x, start_y, 
                   bg_color=white, border_color=TEAL, font_size=36, show_chinese=False):
    """Draw a grid of cards with text"""
    for i, card in enumerate(cards):
        if i >= cols * rows:
            break
        col = i % cols
        row = i // cols
        x = start_x + col * (card_w + 5*mm)
        y = start_y - row * (card_h + 5*mm)
        
        # Card background
        c.setFillColor(bg_color)
        c.roundRect(x, y, card_w, card_h, 3*mm, fill=1, stroke=0)
        
        # Border
        c.setStrokeColor(border_color)
        c.setLineWidth(1.5)
        c.roundRect(x, y, card_w, card_h, 3*mm, fill=0, stroke=1)
        
        # Text
        text = card if isinstance(card, str) else card[0]
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", font_size)
        c.drawCentredString(x + card_w/2, y + card_h/2 - font_size/3, text)
        
        # Chinese translation (small, below)
        if show_chinese and isinstance(card, tuple) and len(card) > 1:
            c.setFont("Helvetica", 10)
            c.setFillColor(HexColor('#888888'))
            c.drawCentredString(x + card_w/2, y + 4*mm, card[1])


def create_pdf():
    c = canvas.Canvas(OUTPUT, pagesize=A4)
    
    # ══════════════════════════════════════════════
    # COVER PAGE
    # ══════════════════════════════════════════════
    c.setFillColor(TEAL)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1)
    
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(WIDTH/2, HEIGHT - 80*mm, "ESL Shelf Works")
    
    c.setFont("Helvetica", 18)
    c.drawCentredString(WIDTH/2, HEIGHT - 95*mm, "Montessori Language Materials")
    c.drawCentredString(WIDTH/2, HEIGHT - 110*mm, "for L1 Chinese Learners")
    
    c.setFillColor(EMERALD)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(WIDTH/2, HEIGHT - 140*mm, "Print  ·  Cut  ·  Laminate  ·  Place on Shelf")
    
    # Contents
    c.setFillColor(white)
    c.setFont("Helvetica", 13)
    works = [
        "Work 1: Sound Spy Cards — Initial Sound Matching",
        "Work 2: CVC Picture-Word Match Cards",
        "Work 3: Action Command Cards (TPR)",
        "Work 4: Mystery Sound Bags — Sorting Activity",
        "Work 5: Bilingual Object Labels",
        "Work 6: Rhyme Family Sorting Mats",
    ]
    y = HEIGHT - 175*mm
    for w in works:
        c.drawCentredString(WIDTH/2, y, w)
        y -= 12*mm
    
    c.setFillColor(HexColor('#66BB99'))
    c.setFont("Helvetica", 10)
    c.drawCentredString(WIDTH/2, 30*mm, "Designed for ages 3–5  |  CVC / Pink Series level")
    c.drawCentredString(WIDTH/2, 20*mm, "All words use sounds shared between Mandarin and English")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # WORK 1: SOUND SPY CARDS — Initial Sound Matching
    # ══════════════════════════════════════════════
    draw_header(c, "Work 1: Sound Spy Cards", 
                "Match objects to their initial sound  |  Phonemic Awareness", SOFT_PINK)
    
    # Teacher instructions
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 11)
    y_inst = HEIGHT - 55*mm
    c.drawString(20*mm, y_inst, "HOW TO USE:")
    c.setFont("Helvetica", 10)
    instructions = [
        "1. Place 3 sound cards on the mat (e.g. /m/, /s/, /f/).",
        "2. Child picks up an object from the basket.",
        '3. "Listen... mmmop. What sound do you hear first? /m/!"',
        "4. Child places the object below the matching sound card.",
        "5. Start with sounds SHARED between Mandarin and English.",
    ]
    for line in instructions:
        y_inst -= 5*mm
        c.drawString(25*mm, y_inst, line)
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(CORAL)
    y_inst -= 8*mm
    c.drawString(25*mm, y_inst, "ESL NOTE: These 8 sounds exist in BOTH Mandarin AND English.")
    c.setFont("Helvetica", 9)
    y_inst -= 5*mm
    c.setFillColor(TEAL)
    c.drawString(25*mm, y_inst, "Start here — the child already knows these sounds from Chinese!")
    
    # Sound cards — 8 cards, 4 per row, 2 rows
    sounds = ["/m/", "/s/", "/f/", "/n/", "/l/", "/p/", "/t/", "/k/"]
    card_w = 38*mm
    card_h = 38*mm
    start_x = 15*mm
    start_y = HEIGHT - 110*mm
    
    for i, sound in enumerate(sounds):
        col = i % 4
        row = i // 4
        x = start_x + col * (card_w + 8*mm)
        y = start_y - row * (card_h + 8*mm)
        
        # Card
        c.setFillColor(SOFT_PINK)
        c.roundRect(x, y, card_w, card_h, 4*mm, fill=1, stroke=0)
        c.setStrokeColor(CORAL)
        c.setLineWidth(2)
        c.roundRect(x, y, card_w, card_h, 4*mm, fill=0, stroke=1)
        
        # Sound text
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 28)
        c.drawCentredString(x + card_w/2, y + card_h/2 - 4*mm, sound)
    
    # Object suggestions
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 10)
    y_obj = start_y - 2 * (card_h + 8*mm) - 8*mm
    c.drawString(20*mm, y_obj, "SUGGESTED OBJECTS FOR BASKET:")
    c.setFont("Helvetica", 9)
    objects = [
        "/m/ — mat, mop, mouse, mirror, mug",
        "/s/ — sun, sock, star, spoon, snake",
        "/f/ — fish, fan, fork, fig, fox",
        "/n/ — net, nut, nose, nail, nest",
        "/l/ — lip, log, leaf, lamp, lemon",
        "/p/ — pen, pig, pot, pin, pear",
        "/t/ — top, tin, tent, tiger, truck",
        "/k/ — cat, cup, car, cap, key",
    ]
    for line in objects:
        y_obj -= 5*mm
        c.drawString(25*mm, y_obj, line)
    
    # Cut line note
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#999999'))
    c.drawCentredString(WIDTH/2, 15*mm, "✂ Print on card stock  ·  Cut out each sound card  ·  Laminate for durability")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # WORK 2: CVC PICTURE-WORD MATCH CARDS
    # ══════════════════════════════════════════════
    draw_header(c, "Work 2: CVC Picture-Word Match", 
                "Read the word → Match to picture  |  Pink Series Level", SOFT_BLUE)
    
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 11)
    y_inst = HEIGHT - 55*mm
    c.drawString(20*mm, y_inst, "HOW TO USE:")
    c.setFont("Helvetica", 10)
    instructions = [
        "1. Place picture cards face up in a column on the left.",
        "2. Word cards face down in a pile on the right.",
        '3. Child turns over a word card, sounds it out: "/k/-/a/-/t/... cat!"',
        "4. Child places the word card next to the matching picture.",
        "5. Self-correcting: flip picture card to see word on back.",
    ]
    for line in instructions:
        y_inst -= 5*mm
        c.drawString(25*mm, y_inst, line)
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(CORAL)
    y_inst -= 8*mm
    c.drawString(25*mm, y_inst, "ESL NOTE: All words use sounds that exist in Mandarin.")
    c.setFont("Helvetica", 9)
    c.setFillColor(TEAL)
    y_inst -= 5*mm
    c.drawString(25*mm, y_inst, "Final consonants are HARD for Chinese learners — this work builds that skill.")
    
    # Word cards — 4 columns, 4 rows
    words = [
        "cat", "mat", "sun", "mop",
        "cup", "fan", "net", "pig",
        "log", "pin", "pot", "nut",
        "fig", "pen", "top", "lip",
    ]
    
    card_w = 38*mm
    card_h = 22*mm
    start_x = 15*mm
    start_y = HEIGHT - 115*mm
    
    for i, word in enumerate(words):
        col = i % 4
        row = i // 4
        x = start_x + col * (card_w + 8*mm)
        y = start_y - row * (card_h + 6*mm)
        
        # Pink card
        c.setFillColor(PINK)
        c.roundRect(x, y, card_w, card_h, 3*mm, fill=1, stroke=0)
        c.setStrokeColor(HexColor('#D4849A'))
        c.setLineWidth(1.5)
        c.roundRect(x, y, card_w, card_h, 3*mm, fill=0, stroke=1)
        
        # Word
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(x + card_w/2, y + card_h/2 - 4*mm, word)
    
    # Second set — short-vowel families
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 10)
    y_fam = start_y - 4 * (card_h + 6*mm) - 10*mm
    c.drawString(20*mm, y_fam, "WORD FAMILIES (for sorting extension):")
    c.setFont("Helvetica", 9)
    families = [
        "-at family: cat, mat, hat, sat, fat, bat, rat, pat",
        "-an family: fan, man, pan, can, van, ran, tan, dan",
        "-ig family: pig, fig, big, dig, wig, jig",
        "-op family: mop, top, hop, pop, stop, chop",
        "-un family: sun, fun, run, bun, gun, nun",
        "-ot family: pot, hot, lot, dot, not, got, cot",
    ]
    for line in families:
        y_fam -= 5*mm
        c.drawString(25*mm, y_fam, line)
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#999999'))
    c.drawCentredString(WIDTH/2, 15*mm, "✂ Print on card stock  ·  Cut out each word card  ·  Laminate  ·  Store in pink envelope on shelf")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # WORK 3: ACTION COMMAND CARDS (TPR)
    # ══════════════════════════════════════════════
    draw_header(c, "Work 3: Action Command Cards", 
                "Read → Do the action!  |  Total Physical Response", SOFT_GREEN)
    
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 11)
    y_inst = HEIGHT - 55*mm
    c.drawString(20*mm, y_inst, "HOW TO USE:")
    c.setFont("Helvetica", 10)
    instructions = [
        "1. Fan command cards face down on the mat.",
        "2. Child picks one card and reads it silently.",
        "3. Child DOES the action. No speaking required!",
        "4. Teacher/friend guesses: \"You're hopping!\"",
        "5. Perfect for silent period — proves comprehension through action.",
    ]
    for line in instructions:
        y_inst -= 5*mm
        c.drawString(25*mm, y_inst, line)
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(CORAL)
    y_inst -= 8*mm
    c.drawString(25*mm, y_inst, "ESL NOTE: No speech production needed — ideal for silent period.")
    c.setFont("Helvetica", 9)
    c.setFillColor(TEAL)
    y_inst -= 5*mm
    c.drawString(25*mm, y_inst, "The child shows understanding through movement, not words.")
    
    # Level 1 — Single words (LARGE font)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 12)
    y_level = HEIGHT - 110*mm
    c.drawString(20*mm, y_level, "LEVEL 1 — Single Action Words")
    
    level1 = ["run", "hop", "sit", "clap", "nod", "tap", "hug", "spin"]
    card_w = 38*mm
    card_h = 26*mm
    start_x = 15*mm
    
    for i, word in enumerate(level1):
        col = i % 4
        row = i // 4
        x = start_x + col * (card_w + 8*mm)
        y = y_level - 8*mm - row * (card_h + 5*mm)
        
        c.setFillColor(SOFT_GREEN)
        c.roundRect(x, y, card_w, card_h, 3*mm, fill=1, stroke=0)
        c.setStrokeColor(SKY)
        c.setLineWidth(1.5)
        c.roundRect(x, y, card_w, card_h, 3*mm, fill=0, stroke=1)
        
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 26)
        c.drawCentredString(x + card_w/2, y + card_h/2 - 5*mm, word)
    
    # Level 2 — Short phrases
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(TEAL)
    y_level2 = y_level - 8*mm - 2 * (card_h + 5*mm) - 12*mm
    c.drawString(20*mm, y_level2, "LEVEL 2 — Short Phrases")
    
    level2 = [
        "pat the mat", "get a cup", "sit on a log",
        "hop to me", "hug a pal", "tap the tin",
    ]
    card_w2 = 55*mm
    card_h2 = 22*mm
    
    for i, phrase in enumerate(level2):
        col = i % 3
        row = i // 3
        x = 15*mm + col * (card_w2 + 6*mm)
        y = y_level2 - 8*mm - row * (card_h2 + 5*mm)
        
        c.setFillColor(SOFT_GREEN)
        c.roundRect(x, y, card_w2, card_h2, 3*mm, fill=1, stroke=0)
        c.setStrokeColor(SKY)
        c.setLineWidth(1.5)
        c.roundRect(x, y, card_w2, card_h2, 3*mm, fill=0, stroke=1)
        
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(x + card_w2/2, y + card_h2/2 - 3*mm, phrase)
    
    # Level 3 — Chains
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(TEAL)
    y_level3 = y_level2 - 8*mm - 2 * (card_h2 + 5*mm) - 12*mm
    c.drawString(20*mm, y_level3, "LEVEL 3 — Action Chains")
    
    level3 = [
        "hop to the mat and sit",
        "get a cup and a pen",
        "clap, spin, then sit",
        "tap the tin and nod",
    ]
    card_w3 = 85*mm
    card_h3 = 18*mm
    
    for i, chain in enumerate(level3):
        x = 15*mm + (i % 2) * (card_w3 + 6*mm)
        y = y_level3 - 8*mm - (i // 2) * (card_h3 + 5*mm)
        
        c.setFillColor(SOFT_GREEN)
        c.roundRect(x, y, card_w3, card_h3, 3*mm, fill=1, stroke=0)
        c.setStrokeColor(SKY)
        c.setLineWidth(1.5)
        c.roundRect(x, y, card_w3, card_h3, 3*mm, fill=0, stroke=1)
        
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(x + card_w3/2, y + card_h3/2 - 2.5*mm, chain)
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#999999'))
    c.drawCentredString(WIDTH/2, 15*mm, "✂ Print on card stock  ·  Cut out each command card  ·  Laminate  ·  Store in green envelope on shelf")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # WORK 4: MYSTERY SOUND BAGS — Sorting Activity
    # ══════════════════════════════════════════════
    draw_header(c, "Work 4: Mystery Sound Sorting", 
                "Sort objects by initial sound into bags  |  Phonemic Awareness", SOFT_YELLOW)
    
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 11)
    y_inst = HEIGHT - 55*mm
    c.drawString(20*mm, y_inst, "HOW TO USE:")
    c.setFont("Helvetica", 10)
    instructions = [
        "1. Print and cut the sorting mat labels below.",
        "2. Place 2 or 3 labels on the mat (e.g. /m/ and /s/).",
        "3. Put 6-9 small objects in a cloth bag or basket.",
        '4. Child reaches in, pulls out an object: "Mmmmouse... /m/!"',
        "5. Child places object under the matching sound label.",
        '6. Extension: child names other objects: "What else starts with /m/?"',
    ]
    for line in instructions:
        y_inst -= 5*mm
        c.drawString(25*mm, y_inst, line)
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(CORAL)
    y_inst -= 8*mm
    c.drawString(25*mm, y_inst, "ESL NOTE: Use objects the child can NAME in English already.")
    c.setFont("Helvetica", 9)
    c.setFillColor(TEAL)
    y_inst -= 5*mm
    c.drawString(25*mm, y_inst, "The child needs to know the word orally before sorting by sound.")
    
    # Sorting mat labels — big, clear cards
    labels = ["/m/", "/s/", "/f/", "/n/", "/l/", "/p/", "/t/", "/k/"]
    card_w = 42*mm
    card_h = 42*mm
    start_x = 12*mm
    start_y = HEIGHT - 118*mm
    
    for i, label in enumerate(labels):
        col = i % 4
        row = i // 4
        x = start_x + col * (card_w + 6*mm)
        y = start_y - row * (card_h + 6*mm)
        
        # Yellow card
        c.setFillColor(SOFT_YELLOW)
        c.roundRect(x, y, card_w, card_h, 4*mm, fill=1, stroke=0)
        c.setStrokeColor(HexColor('#D4A234'))
        c.setLineWidth(2)
        c.roundRect(x, y, card_w, card_h, 4*mm, fill=0, stroke=1)
        
        # Large sound
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 32)
        c.drawCentredString(x + card_w/2, y + card_h/2 - 5*mm, label)
    
    # Sorting sets
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 10)
    y_sets = start_y - 2 * (card_h + 6*mm) - 10*mm
    c.drawString(20*mm, y_sets, "SUGGESTED SORTING SETS (3 objects per sound):")
    c.setFont("Helvetica", 9)
    sets = [
        "Set A: /m/ vs /s/ — mouse, mat, mug | sun, sock, spoon",
        "Set B: /f/ vs /n/ — fish, fork, fan | nut, nest, net",
        "Set C: /l/ vs /p/ — log, lip, lamp | pen, pig, pot",
        "Set D: /t/ vs /k/ — top, tin, tent | cup, cat, key",
        "Set E: /m/ vs /f/ vs /s/ — mat, mop, mug | fan, fig, fox | sun, sock, star",
    ]
    for line in sets:
        y_sets -= 5*mm
        c.drawString(25*mm, y_sets, line)
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#999999'))
    c.drawCentredString(WIDTH/2, 15*mm, "✂ Print on card stock  ·  Cut out sorting labels  ·  Laminate  ·  Store with cloth bag on shelf")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # WORK 5: BILINGUAL OBJECT LABELS
    # ══════════════════════════════════════════════
    draw_header(c, "Work 5: Bilingual Object Labels", 
                "English word + Chinese character  |  Vocabulary Bridge", SOFT_PURPLE)
    
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 11)
    y_inst = HEIGHT - 55*mm
    c.drawString(20*mm, y_inst, "HOW TO USE:")
    c.setFont("Helvetica", 10)
    instructions = [
        "1. Place miniature objects on the mat (from I Spy basket).",
        "2. Child picks up English label, reads it, places next to object.",
        "3. Then picks up Chinese label, reads it, places next to same object.",
        "4. The child sees both writing systems side by side.",
        "5. Validates the child's L1 — Chinese is a STRENGTH, not a deficit.",
    ]
    for line in instructions:
        y_inst -= 5*mm
        c.drawString(25*mm, y_inst, line)
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(CORAL)
    y_inst -= 8*mm
    c.drawString(25*mm, y_inst, "ESL NOTE: This bridges L1 and L2 — the child's Chinese literacy")
    c.setFont("Helvetica", 9)
    c.setFillColor(TEAL)
    y_inst -= 5*mm
    c.drawString(25*mm, y_inst, "is an asset. Seeing both languages side by side builds confidence.")
    
    # Bilingual label pairs
    pairs = [
        ("cat", "猫"), ("dog", "狗"), ("cup", "杯"),
        ("sun", "太阳"), ("fish", "鱼"), ("pen", "笔"),
        ("hat", "帽子"), ("fan", "扇子"), ("pig", "猪"),
        ("net", "网"), ("nut", "坚果"), ("mop", "拖把"),
    ]
    
    card_w = 50*mm
    card_h = 22*mm
    start_x = 12*mm
    start_y = HEIGHT - 118*mm
    
    for i, (eng, chi) in enumerate(pairs):
        col = i % 3
        row = i // 3
        x = start_x + col * (card_w + 10*mm)
        y = start_y - row * (card_h + 5*mm)
        
        # English card (left half)
        half_w = card_w / 2 - 1*mm
        
        # English side
        c.setFillColor(SOFT_PURPLE)
        c.roundRect(x, y, half_w, card_h, 2*mm, fill=1, stroke=0)
        c.setStrokeColor(HexColor('#9B8FCC'))
        c.setLineWidth(1)
        c.roundRect(x, y, half_w, card_h, 2*mm, fill=0, stroke=1)
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(x + half_w/2, y + card_h/2 - 3*mm, eng)
        
        # Chinese side
        x2 = x + half_w + 2*mm
        c.setFillColor(HexColor('#FFF0F5'))
        c.roundRect(x2, y, half_w, card_h, 2*mm, fill=1, stroke=0)
        c.setStrokeColor(HexColor('#CC8FAA'))
        c.setLineWidth(1)
        c.roundRect(x2, y, half_w, card_h, 2*mm, fill=0, stroke=1)
        c.setFillColor(TEAL)
        c.setFont("Helvetica", 16)
        c.drawCentredString(x2 + half_w/2, y + card_h/2 - 3*mm, chi)
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#999999'))
    c.drawCentredString(WIDTH/2, 15*mm, "✂ Cut English and Chinese labels separately  ·  Laminate  ·  Store in purple bag on shelf")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # WORK 6: RHYME FAMILY SORTING MATS
    # ══════════════════════════════════════════════
    draw_header(c, "Work 6: Rhyme Family Sorting", 
                "Sort words by ending sound  |  Phonological Awareness", SOFT_PINK)
    
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 11)
    y_inst = HEIGHT - 55*mm
    c.drawString(20*mm, y_inst, "HOW TO USE:")
    c.setFont("Helvetica", 10)
    instructions = [
        "1. Place 2-3 rhyme family header cards on the mat.",
        "2. Spread word cards face up below.",
        '3. Child reads each card and sorts: "cat... -at! It goes here."',
        '4. Self-check: words in same column should all rhyme.',
        "5. Extension: child thinks of another word for each family.",
    ]
    for line in instructions:
        y_inst -= 5*mm
        c.drawString(25*mm, y_inst, line)
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(CORAL)
    y_inst -= 8*mm
    c.drawString(25*mm, y_inst, "ESL NOTE: Ending sounds are THE hardest part for Chinese learners.")
    c.setFont("Helvetica", 9)
    c.setFillColor(TEAL)
    y_inst -= 5*mm
    c.drawString(25*mm, y_inst, "This work specifically trains the final consonant awareness they need most.")
    
    # Rhyme family headers
    families_data = [
        ("-at", ["cat", "mat", "hat", "sat", "fat", "bat"]),
        ("-an", ["fan", "man", "pan", "can", "van", "ran"]),
        ("-ig", ["pig", "fig", "big", "dig", "wig", "jig"]),
        ("-op", ["mop", "top", "hop", "pop", "cop", "lot"]),
        ("-un", ["sun", "fun", "run", "bun", "gun", "nun"]),
    ]
    
    col_w = 33*mm
    header_h = 20*mm
    word_h = 16*mm
    start_x = 12*mm
    start_y = HEIGHT - 115*mm
    
    for col_idx, (family, words) in enumerate(families_data):
        x = start_x + col_idx * (col_w + 4*mm)
        
        # Header card
        c.setFillColor(CORAL)
        c.roundRect(x, start_y, col_w, header_h, 3*mm, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(x + col_w/2, start_y + header_h/2 - 3*mm, family)
        
        # Word cards below
        for w_idx, word in enumerate(words):
            y = start_y - (w_idx + 1) * (word_h + 3*mm)
            
            c.setFillColor(PINK)
            c.roundRect(x, y, col_w, word_h, 2*mm, fill=1, stroke=0)
            c.setStrokeColor(HexColor('#D4849A'))
            c.setLineWidth(0.8)
            c.roundRect(x, y, col_w, word_h, 2*mm, fill=0, stroke=1)
            
            c.setFillColor(TEAL)
            c.setFont("Helvetica-Bold", 16)
            c.drawCentredString(x + col_w/2, y + word_h/2 - 3*mm, word)
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#999999'))
    c.drawCentredString(WIDTH/2, 15*mm, "✂ Cut headers and word cards separately  ·  Laminate  ·  Store in pink envelope on shelf")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # TEACHER NOTES PAGE
    # ══════════════════════════════════════════════
    draw_header(c, "Teacher Notes", 
                "ESL Adaptation Guide for Chinese Learners", WARM_CREAM)
    
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 12)
    y = HEIGHT - 58*mm
    
    notes = [
        ("WHY THESE WORKS?", [
            "All 6 works use sounds SHARED between Mandarin and English (/m/, /s/, /f/, /n/, /l/, /p/, /t/, /k/).",
            "This means the child starts from a position of STRENGTH — they already hear and produce these sounds.",
            "We deliberately AVOID /th/, /v/, English /r/, and consonant clusters in early materials.",
        ]),
        ("WHAT TO EXPECT (NORMAL L1 TRANSFER)", [
            "Missing final consonants: 'ca' for 'cat', 'do' for 'dog' — Mandarin has almost no final stops.",
            "Vowel insertion in clusters: 'belack' for 'black' — Mandarin syllables are CV structure.",
            "Tone patterns on English words — the child is applying Mandarin prosody. This fades naturally.",
            "Code-switching (mixing Chinese and English) — this is bilingual COMPETENCE, not confusion.",
            "Silent period (first 0-6 months) — the child understands but won't speak English yet. NORMAL.",
        ]),
        ("WHAT THESE WORKS BUILD", [
            "Work 1 (Sound Spy): Phonemic awareness with shared sounds — builds confidence.",
            "Work 2 (CVC Match): Final consonant awareness — the #1 skill Chinese learners need.",
            "Work 3 (Commands): Comprehension through action — perfect for silent period children.",
            "Work 4 (Sound Sort): Auditory discrimination — leverages Chinese tonal hearing ability.",
            "Work 5 (Bilingual Labels): Validates L1 — shows Chinese literacy as a strength.",
            "Work 6 (Rhyme Sort): Ending sound focus — directly targets the L1 interference gap.",
        ]),
        ("PROGRESSION", [
            "Start with Works 1 + 4 (phonemic awareness — no reading required).",
            "Add Work 3 (commands — reading single words, no speech production needed).",
            "When Sound Games are solid, add Works 2 + 6 (CVC reading + rhyme sorting).",
            "Work 5 (bilingual labels) can be introduced at any time — it's a confidence builder.",
        ]),
    ]
    
    for title, points in notes:
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(TEAL)
        c.drawString(20*mm, y, title)
        y -= 2*mm
        c.setFont("Helvetica", 9)
        for point in points:
            y -= 5*mm
            c.drawString(25*mm, y, "• " + point)
        y -= 7*mm
    
    c.save()
    print(f"✅ PDF created: {OUTPUT}")
    print(f"   Size: {os.path.getsize(OUTPUT) / 1024:.0f} KB")
    print(f"   Pages: 8 (cover + 6 works + teacher notes)")

if __name__ == "__main__":
    create_pdf()
