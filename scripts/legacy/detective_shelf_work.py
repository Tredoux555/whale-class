#!/usr/bin/env python3
"""
Detective Spy Game — Montessori Shelf Work
For L1 Chinese children (ages 3-5) learning English at CVC level.

This is a REAL shelf work: print, cut, laminate, place in a detective envelope on the shelf.
The child takes the envelope, opens the mission, and completes it independently.

Structure:
- Cover card (detective badge / mission briefing)
- 12 Mission Cards (3 levels: Sound Spy, Word Spy, Action Spy)
- Secret Code Cards (CVC decoding)
- Spy Report Sheet (self-checking)
- Teacher setup guide
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
import os

WIDTH, HEIGHT = A4
OUTPUT = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/Detective_Spy_Game_Shelf_Work.pdf"

# Colors — spy/detective theme
DARK_NAVY = HexColor('#1A1A2E')
SPY_RED = HexColor('#E94560')
SPY_GOLD = HexColor('#F5C518')
DARK_TEAL = HexColor('#0D3330')
CREAM = HexColor('#FFF8E7')
LIGHT_GOLD = HexColor('#FFF9E6')
LIGHT_RED = HexColor('#FFF0F2')
LIGHT_NAVY = HexColor('#F0F2FA')
SOFT_GREEN = HexColor('#F0FFF4')
WARM_GRAY = HexColor('#F5F5F0')
STAMP_RED = HexColor('#CC0000')


def draw_spy_header(c, title, subtitle, y_offset=0):
    """Draw a spy-themed page header"""
    # Dark header
    c.setFillColor(DARK_NAVY)
    c.rect(0, HEIGHT - 42*mm - y_offset, WIDTH, 42*mm, fill=1)
    
    # Gold stripe
    c.setFillColor(SPY_GOLD)
    c.rect(0, HEIGHT - 43*mm - y_offset, WIDTH, 1.5*mm, fill=1)
    
    # Title
    c.setFillColor(SPY_GOLD)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(WIDTH/2, HEIGHT - 20*mm - y_offset, title)
    
    c.setFillColor(white)
    c.setFont("Helvetica", 11)
    c.drawCentredString(WIDTH/2, HEIGHT - 30*mm - y_offset, subtitle)
    
    # Classification stamp
    c.setFillColor(SPY_RED)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(WIDTH/2, HEIGHT - 38*mm - y_offset, "TOP SECRET  ·  MONTREE DETECTIVE AGENCY")


def draw_mission_card(c, x, y, w, h, level_color, level_label, mission_num, 
                       mission_text, hint_text=None, badge_text=None):
    """Draw a single mission card"""
    # Card background
    c.setFillColor(white)
    c.roundRect(x, y, w, h, 4*mm, fill=1, stroke=0)
    
    # Border
    c.setStrokeColor(DARK_NAVY)
    c.setLineWidth(2)
    c.roundRect(x, y, w, h, 4*mm, fill=0, stroke=1)
    
    # Level color bar at top
    c.setFillColor(level_color)
    # Clip to rounded corners by drawing a rect inside
    c.rect(x + 1, y + h - 14*mm, w - 2, 13.5*mm, fill=1, stroke=0)
    
    # Level label
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x + 4*mm, y + h - 9*mm, level_label)
    
    # Mission number (right side of header)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(x + w - 4*mm, y + h - 9*mm, f"#{mission_num:02d}")
    
    # Spy icon — draw a magnifying glass shape instead of emoji (reportlab can't render emoji)
    icon_cx = x + w/2
    icon_cy = y + h - 23*mm
    c.setStrokeColor(DARK_NAVY)
    c.setLineWidth(2)
    c.circle(icon_cx - 2*mm, icon_cy + 2*mm, 4*mm, fill=0, stroke=1)
    c.line(icon_cx + 1*mm, icon_cy - 1*mm, icon_cx + 5*mm, icon_cy - 5*mm)
    
    # Mission text — large, clear
    c.setFillColor(DARK_NAVY)
    text_size = 20 if len(mission_text) < 15 else 15 if len(mission_text) < 25 else 12
    c.setFont("Helvetica-Bold", text_size)
    
    # Center the text
    text_y = y + h/2 - 14*mm
    
    # Handle multi-line
    if '\n' in mission_text:
        lines = mission_text.split('\n')
        for i, line in enumerate(lines):
            c.drawCentredString(x + w/2, text_y - i * (text_size + 2), line)
    else:
        c.drawCentredString(x + w/2, text_y, mission_text)
    
    # Hint text at bottom
    if hint_text:
        c.setFillColor(HexColor('#888888'))
        c.setFont("Helvetica", 7)
        c.drawCentredString(x + w/2, y + 6*mm, hint_text)
    
    # Badge text
    if badge_text:
        c.setFillColor(SPY_GOLD)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(x + w/2, y + 2*mm, badge_text)


def create_pdf():
    c = canvas.Canvas(OUTPUT, pagesize=A4)
    
    # ══════════════════════════════════════════════
    # PAGE 1: COVER / DETECTIVE BADGE
    # ══════════════════════════════════════════════
    # Full dark background
    c.setFillColor(DARK_NAVY)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1)
    
    # Gold border frame
    c.setStrokeColor(SPY_GOLD)
    c.setLineWidth(3)
    c.rect(12*mm, 12*mm, WIDTH - 24*mm, HEIGHT - 24*mm, fill=0, stroke=1)
    c.setLineWidth(1)
    c.rect(15*mm, 15*mm, WIDTH - 30*mm, HEIGHT - 30*mm, fill=0, stroke=1)
    
    # Badge circle
    cx, cy = WIDTH/2, HEIGHT/2 + 30*mm
    c.setFillColor(SPY_GOLD)
    c.circle(cx, cy, 45*mm, fill=1, stroke=0)
    c.setFillColor(DARK_NAVY)
    c.circle(cx, cy, 40*mm, fill=1, stroke=0)
    c.setFillColor(SPY_GOLD)
    c.circle(cx, cy, 37*mm, fill=0, stroke=1)
    
    # Badge text
    c.setFillColor(SPY_GOLD)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(cx, cy + 18*mm, "MONTREE")
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(cx, cy + 2*mm, "DETECTIVE")
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(cx, cy - 14*mm, "AGENCY")
    
    # Star
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(cx, cy - 32*mm, "*")
    
    # Subtitle
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(WIDTH/2, HEIGHT/2 - 30*mm, "SPY MISSION FILE")
    
    c.setFillColor(SPY_GOLD)
    c.setFont("Helvetica", 12)
    c.drawCentredString(WIDTH/2, HEIGHT/2 - 42*mm, "12 Secret Missions Inside")
    
    # Classification
    c.setFillColor(SPY_RED)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(WIDTH/2, HEIGHT/2 - 60*mm, "-- TOP SECRET --")
    
    c.setFillColor(white)
    c.setFont("Helvetica", 10)
    c.drawCentredString(WIDTH/2, HEIGHT/2 - 72*mm, "For Detectives Ages 3-5")
    c.drawCentredString(WIDTH/2, HEIGHT/2 - 82*mm, "Sound Spy  ·  Word Spy  ·  Action Spy")
    
    # Bottom
    c.setFillColor(HexColor('#666688'))
    c.setFont("Helvetica", 8)
    c.drawCentredString(WIDTH/2, 22*mm, "Print · Cut · Laminate · Store in Detective Envelope on Shelf")
    c.drawCentredString(WIDTH/2, 16*mm, "Designed for L1 Chinese learners · CVC / Pink Series level")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # PAGE 2: TEACHER SETUP GUIDE
    # ══════════════════════════════════════════════
    draw_spy_header(c, "Agent Training Manual", "For the Lead Detective (Teacher)")
    
    c.setFillColor(DARK_NAVY)
    c.setFont("Helvetica-Bold", 13)
    y = HEIGHT - 55*mm
    
    sections = [
        ("WHAT IS THIS WORK?", [
            "A detective-themed shelf work with 12 mission cards at 3 levels.",
            "The child takes the Detective Envelope from the shelf, opens it,",
            "selects a mission card, and completes it independently.",
            "All missions use sounds SHARED between Mandarin and English.",
        ]),
        ("MATERIALS NEEDED", [
            "• A large envelope or folder labeled 'Detective File' (print cover page, glue on)",
            "• The 12 mission cards (pages 3-4), cut and laminated",
            "• A small basket of CVC objects (see list on each mission card)",
            "• The Secret Code Cards (page 5), cut and laminated",
            "• A magnifying glass (toy) — makes it feel real!",
        ]),
        ("THREE LEVELS", [
            "[RED] SOUND SPY (Missions 1-4): Listen for sounds. No reading needed.",
            "   → For children in the silent period or early phonemic awareness.",
            "[BLUE] WORD SPY (Missions 5-8): Read CVC words. Match to objects.",
            "   → For children who know sandpaper letters and can blend sounds.",
            "[GREEN] ACTION SPY (Missions 9-12): Read and DO. Total Physical Response.",
            "   → For children ready for command cards. No speech required.",
        ]),
        ("HOW TO PRESENT", [
            '1. Show the child the Detective Envelope: "This is a special spy mission."',
            '2. Open it together. Show the badge: "You are now a detective."',
            '3. Pull out one Level 1 card. Read it aloud the first time.',
            '4. Show how to complete the mission (e.g., sort objects by sound).',
            "5. The child does it alone. When done, they put it all back.",
            "6. Move to Level 2 when Level 1 is easy. Child chooses their mission.",
        ]),
        ("ESL NOTES", [
            "• Silent period children should start at Level 1 (no speech needed).",
            "• 'ca' for 'cat' is NORMAL — Mandarin drops final consonants.",
            "• The spy theme motivates because it's about DOING, not speaking.",
            "• Let the child be the detective — they lead, you observe.",
        ]),
    ]
    
    for title, points in sections:
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(DARK_NAVY)
        c.drawString(20*mm, y, title)
        y -= 1*mm
        c.setFont("Helvetica", 8.5)
        for point in points:
            y -= 4.5*mm
            c.drawString(25*mm, y, point)
        y -= 5*mm
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # PAGES 3-4: MISSION CARDS (12 cards, 6 per page)
    # ══════════════════════════════════════════════
    
    # Level 1: SOUND SPY (Red) — No reading, just listening
    missions_level1 = [
        (1, "Find 3 things\nthat start with /m/", "mat, mop, mug, mouse, mirror", "[RED] SOUND SPY"),
        (2, "Find 3 things\nthat start with /s/", "sun, sock, star, spoon, snake", "[RED] SOUND SPY"),
        (3, "Sort 6 things:\n/f/ or /n/?", "fish,fan,fork vs nut,nest,net", "[RED] SOUND SPY"),
        (4, "Find the odd\none out!", "3 /t/ things + 1 /k/ thing", "[RED] SOUND SPY"),
    ]
    
    # Level 2: WORD SPY (Blue) — Read CVC words
    missions_level2 = [
        (5, "Read the code.\nFind the object.", "CVC word card → match object", "[BLUE] WORD SPY"),
        (6, "Crack 5 codes.\nMatch all 5.", "5 word cards, 5 objects", "[BLUE] WORD SPY"),
        (7, "Sort the words:\n-at  or  -an?", "cat,mat,hat vs fan,man,pan", "[BLUE] WORD SPY"),
        (8, "Find my name!\nI am a ___.", "Object gives clue, child reads", "[BLUE] WORD SPY"),
    ]
    
    # Level 3: ACTION SPY (Green) — Read and DO
    missions_level3 = [
        (9, "run", "Do it! No talking needed.", "[GREEN] ACTION SPY"),
        (10, "hop to the mat", "Do it! No talking needed.", "[GREEN] ACTION SPY"),
        (11, "get a cup\nand a pen", "Do it! No talking needed.", "[GREEN] ACTION SPY"),
        (12, "tap the tin,\nthen sit", "Do it! No talking needed.", "[GREEN] ACTION SPY"),
    ]
    
    all_missions = missions_level1 + missions_level2 + missions_level3
    
    for page in range(2):
        draw_spy_header(c, f"Mission Cards — Page {page + 1}", 
                        "Cut along dotted lines · Laminate each card")
        
        card_w = 82*mm
        card_h = 72*mm
        gap_x = 8*mm
        gap_y = 6*mm
        start_x = (WIDTH - 2 * card_w - gap_x) / 2
        start_y = HEIGHT - 52*mm
        
        for i in range(6):
            idx = page * 6 + i
            if idx >= len(all_missions):
                break
                
            mission_num, text, hint, level_label = all_missions[idx]
            
            col = i % 2
            row = i // 2
            x = start_x + col * (card_w + gap_x)
            y = start_y - (row + 1) * (card_h + gap_y) + gap_y
            
            # Determine level color
            if idx < 4:
                level_color = SPY_RED
            elif idx < 8:
                level_color = HexColor('#3366CC')
            else:
                level_color = HexColor('#2E8B57')
            
            draw_mission_card(c, x, y, card_w, card_h, level_color, level_label,
                            mission_num, text, hint, "* MONTREE DETECTIVE AGENCY *")
        
        # Cut lines hint
        c.setStrokeColor(HexColor('#CCCCCC'))
        c.setDash(3, 3)
        c.setLineWidth(0.5)
        # Vertical
        c.line(WIDTH/2, HEIGHT - 48*mm, WIDTH/2, 12*mm)
        # Horizontal
        for row in range(1, 3):
            y_line = start_y - row * (card_h + gap_y) + gap_y + card_h + gap_y/2
            c.line(start_x - 5*mm, y_line, start_x + 2*card_w + gap_x + 5*mm, y_line)
        c.setDash()
        
        c.setFont("Helvetica", 7)
        c.setFillColor(HexColor('#999999'))
        c.drawCentredString(WIDTH/2, 8*mm, "✂ Cut along dotted lines  ·  Laminate each card  ·  Store in Detective Envelope")
        
        c.showPage()
    
    # ══════════════════════════════════════════════
    # PAGE 5: SECRET CODE CARDS (CVC word cards for Missions 5-8)
    # ══════════════════════════════════════════════
    draw_spy_header(c, "Secret Code Cards", "Word cards for Word Spy Missions 5-8")
    
    c.setFillColor(DARK_NAVY)
    c.setFont("Helvetica-Bold", 10)
    y_inst = HEIGHT - 52*mm
    c.drawString(20*mm, y_inst, "Cut these out. The detective reads the 'code' (word) and finds the matching object.")
    
    # Grid of CVC word cards
    words = [
        "cat", "mat", "sun", "mop", "cup", "fan",
        "net", "pig", "log", "pin", "pot", "nut",
        "fig", "pen", "top", "lip", "hat", "dog",
        "bus", "mug", "fox", "rug", "jam", "tin",
    ]
    
    card_w = 38*mm
    card_h = 28*mm
    cols = 4
    gap_x = 8*mm
    gap_y = 5*mm
    start_x = (WIDTH - cols * card_w - (cols - 1) * gap_x) / 2
    start_y = HEIGHT - 62*mm
    
    for i, word in enumerate(words):
        col = i % cols
        row = i // cols
        x = start_x + col * (card_w + gap_x)
        y = start_y - (row + 1) * (card_h + gap_y) + gap_y
        
        # Card with spy styling
        c.setFillColor(LIGHT_NAVY)
        c.roundRect(x, y, card_w, card_h, 3*mm, fill=1, stroke=0)
        
        # Dark border
        c.setStrokeColor(DARK_NAVY)
        c.setLineWidth(1.5)
        c.roundRect(x, y, card_w, card_h, 3*mm, fill=0, stroke=1)
        
        # "CLASSIFIED" tiny text at top
        c.setFillColor(SPY_RED)
        c.setFont("Helvetica-Bold", 5)
        c.drawCentredString(x + card_w/2, y + card_h - 5*mm, "CLASSIFIED")
        
        # Word — big and clear
        c.setFillColor(DARK_NAVY)
        c.setFont("Helvetica-Bold", 22)
        c.drawCentredString(x + card_w/2, y + card_h/2 - 6*mm, word)
        
        # Star decoration
        c.setFillColor(SPY_GOLD)
        c.setFont("Helvetica", 6)
        c.drawCentredString(x + card_w/2, y + 2*mm, "*")
    
    # Cut lines
    c.setStrokeColor(HexColor('#CCCCCC'))
    c.setDash(2, 2)
    c.setLineWidth(0.3)
    for col in range(1, cols):
        x_line = start_x + col * (card_w + gap_x) - gap_x/2
        c.line(x_line, start_y - 6 * (card_h + gap_y), x_line, start_y)
    for row in range(1, 6):
        y_line = start_y - row * (card_h + gap_y) + gap_y/2
        c.line(start_x - 3*mm, y_line, start_x + cols * card_w + (cols-1) * gap_x + 3*mm, y_line)
    c.setDash()
    
    c.setFont("Helvetica", 7)
    c.setFillColor(HexColor('#999999'))
    c.drawCentredString(WIDTH/2, 10*mm, "✂ Cut out each code card  ·  Laminate  ·  Store face-down in Detective Envelope")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # PAGE 6: SPY REPORT — Self-Check Sheet
    # ══════════════════════════════════════════════
    draw_spy_header(c, "Spy Report", "Mission Completion Log — Self-Checking")
    
    c.setFillColor(DARK_NAVY)
    c.setFont("Helvetica-Bold", 10)
    y = HEIGHT - 52*mm
    c.drawString(20*mm, y, "The detective marks each mission as they complete it.")
    c.setFont("Helvetica", 9)
    y -= 5*mm
    c.drawString(20*mm, y, "(Print multiple copies — one per detective. Or laminate and use whiteboard marker.)")
    
    # Agent name field
    y -= 12*mm
    c.setStrokeColor(DARK_NAVY)
    c.setLineWidth(1)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(DARK_NAVY)
    c.drawString(20*mm, y, "AGENT NAME: ")
    c.line(65*mm, y - 1*mm, 170*mm, y - 1*mm)
    
    # Mission checklist table
    y -= 15*mm
    
    # Table header
    c.setFillColor(DARK_NAVY)
    c.rect(20*mm, y, WIDTH - 40*mm, 10*mm, fill=1)
    c.setFillColor(SPY_GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(25*mm, y + 3*mm, "MISSION")
    c.drawString(75*mm, y + 3*mm, "DESCRIPTION")
    c.drawString(145*mm, y + 3*mm, "STATUS")
    
    # Rows
    mission_rows = [
        ("#01", "[RED] Sound Spy: Find /m/ objects"),
        ("#02", "[RED] Sound Spy: Find /s/ objects"),
        ("#03", "[RED] Sound Spy: Sort /f/ vs /n/"),
        ("#04", "[RED] Sound Spy: Odd one out"),
        ("#05", "[BLUE] Word Spy: Read code, find object"),
        ("#06", "[BLUE] Word Spy: Crack 5 codes"),
        ("#07", "[BLUE] Word Spy: Sort -at vs -an"),
        ("#08", "[BLUE] Word Spy: Find my name"),
        ("#09", "[GREEN] Action Spy: Single word mission"),
        ("#10", "[GREEN] Action Spy: Short phrase mission"),
        ("#11", "[GREEN] Action Spy: Two-part mission"),
        ("#12", "[GREEN] Action Spy: Chain mission"),
    ]
    
    row_h = 9*mm
    for i, (num, desc) in enumerate(mission_rows):
        row_y = y - (i + 1) * row_h
        
        # Alternating row colors
        if i % 2 == 0:
            c.setFillColor(LIGHT_GOLD)
        else:
            c.setFillColor(white)
        c.rect(20*mm, row_y, WIDTH - 40*mm, row_h, fill=1, stroke=0)
        
        # Border
        c.setStrokeColor(HexColor('#DDDDDD'))
        c.setLineWidth(0.5)
        c.rect(20*mm, row_y, WIDTH - 40*mm, row_h, fill=0, stroke=1)
        
        # Text
        c.setFillColor(DARK_NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(25*mm, row_y + 3*mm, num)
        c.setFont("Helvetica", 8.5)
        c.drawString(42*mm, row_y + 3*mm, desc)
        
        # Checkbox
        c.setStrokeColor(DARK_NAVY)
        c.setLineWidth(1)
        box_x = 155*mm
        box_y = row_y + 2*mm
        c.rect(box_x, box_y, 5*mm, 5*mm, fill=0, stroke=1)
    
    # Bottom achievement
    y_bottom = y - 12 * row_h - 12*mm
    
    c.setFillColor(SPY_GOLD)
    c.roundRect(30*mm, y_bottom, WIDTH - 60*mm, 18*mm, 4*mm, fill=1, stroke=0)
    c.setFillColor(DARK_NAVY)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(WIDTH/2, y_bottom + 9*mm, "* ALL MISSIONS COMPLETE *")
    c.setFont("Helvetica", 9)
    c.drawCentredString(WIDTH/2, y_bottom + 2*mm, "Congratulations, Detective! You cracked every code.")
    
    c.setFont("Helvetica", 7)
    c.setFillColor(HexColor('#999999'))
    c.drawCentredString(WIDTH/2, 10*mm, "Print one per detective  ·  Or laminate + use whiteboard marker for reuse")
    
    c.showPage()
    
    # ══════════════════════════════════════════════
    # PAGE 7: OBJECT LIST + ANSWER KEY
    # ══════════════════════════════════════════════
    draw_spy_header(c, "Evidence Locker", "Object List + Answer Key for Lead Detective")
    
    c.setFillColor(DARK_NAVY)
    y = HEIGHT - 52*mm
    
    sections = [
        ("OBJECTS NEEDED (collect in basket or cloth bag)", [
            "You need about 20-25 small objects. Use miniatures from your I Spy baskets.",
            "",
            "/m/ objects: mat (felt square), mop (mini), mug, mouse (toy), mirror (small)",
            "/s/ objects: sun (cutout), sock (doll-size), star (wooden), spoon (mini)",
            "/f/ objects: fish (toy), fan (mini), fork (play), fox (figurine)",
            "/n/ objects: net (small), nut (walnut), nest (craft)",
            "/t/ objects: top (spinning), tin (mini), tent (toy)",
            "/k/ objects: cat (figurine), cup (play), cap (doll-size), key (old key)",
            "/p/ objects: pen (mini), pig (figurine), pot (play), pin (safety pin)",
            "/l/ objects: log (twig), lip (picture card), lamp (dollhouse)",
        ]),
        ("MISSION ANSWER KEY", [
            "#01: Any 3 from /m/ set",
            "#02: Any 3 from /s/ set",
            "#03: Sort into /f/ pile and /n/ pile",
            "#04: 3 objects same sound + 1 different (teacher sets up)",
            "#05: Single word card → match to object (self-correcting)",
            "#06: 5 word cards → 5 objects (self-correcting against objects)",
            "#07: cat/mat/hat in -at pile, fan/man/pan in -an pile",
            "#08: Teacher describes object, child finds and reads its label",
            "#09-12: Child reads action card, does the action (no speech needed)",
        ]),
        ("ESL SELF-CHECKING", [
            "For Sound Spy missions: the teacher can check, or pair detectives together.",
            "For Word Spy missions: the objects themselves are the answer key —",
            "   if the child reads 'cat' and picks up the cat figurine, they got it.",
            "For Action Spy missions: the teacher/friend watches the action.",
            "   If the child reads 'hop' and hops — mission complete!",
            "",
            "KEY PRINCIPLE: The child never needs to SPEAK English to succeed.",
            "They show understanding through sorting, matching, and movement.",
            "This is perfect for the ESL silent period.",
        ]),
        ("SHELF SETUP", [
            "• Print cover page → glue onto large envelope → write 'Detective File'",
            "• Print mission cards (p3-4) → cut → laminate → store in envelope",
            "• Print code cards (p5) → cut → laminate → store face-down in envelope",
            "• Print spy report (p6) → laminate (reusable) or print multiples",
            "• Add magnifying glass (toy) + small basket of objects",
            "• Place on language shelf, next to Sound Games / Object Boxes",
        ]),
    ]
    
    for title, points in sections:
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(DARK_NAVY)
        c.drawString(20*mm, y, title)
        y -= 1*mm
        c.setFont("Helvetica", 8)
        for point in points:
            y -= 4.2*mm
            if point:
                c.drawString(25*mm, y, point)
        y -= 5*mm
    
    # Footer
    c.setFont("Helvetica", 7)
    c.setFillColor(HexColor('#999999'))
    c.drawCentredString(WIDTH/2, 10*mm, "Montree Detective Agency  ·  Designed for L1 Chinese learners at CVC level")
    
    c.showPage()
    
    c.save()
    print(f"✅ PDF created: {OUTPUT}")
    print(f"   Size: {os.path.getsize(OUTPUT) / 1024:.0f} KB")
    print(f"   Pages: 7 (cover + teacher guide + 2× mission cards + code cards + spy report + answer key)")


if __name__ == "__main__":
    create_pdf()
