#!/usr/bin/env python3
"""
AMI Command Cards for Eric (4.5yo)
RECALIBRATED — foundation gaps means CVC-level reading.
Level 1: Single action words (1 word)
Level 2: Simple 2-3 word phrases (verb + object)
Sophisticated SPOKEN vocab in teacher notes, but READING stays simple.
3"x5" cards, large clear sans-serif.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor

CARD_W = 3.2 * inch
CARD_H = 2.2 * inch
PAGE_W, PAGE_H = A4
MARGIN = 0.4 * inch

DARK_TEAL = HexColor('#0D3330')
GOLD = HexColor('#D4A017')

CAT_COLORS = {
    "Body": HexColor('#E53E3E'),
    "Hands": HexColor('#3182CE'),
    "Objects": HexColor('#38A169'),
    "Challenge": HexColor('#D69E2E'),
}

# ═══════════════════════════════════════════
# 20 COMMAND CARDS — RECALIBRATED FOR 4.5yo WITH GAPS
# Level 1 (cards 1-8): Single CVC/simple action words
# Level 2 (cards 9-16): verb + simple object (2-3 words)
# Level 3 (cards 17-20): Short phrase (4-5 words max)
# ALL words are phonetically decodable or high-frequency sight words
# ═══════════════════════════════════════════

COMMANDS = [
    # ── LEVEL 1: SINGLE ACTION WORDS (8 cards) ──
    {"text": "Run.", "level": 1, "cat": "Body", "note": "CVC verb"},
    {"text": "Hop.", "level": 1, "cat": "Body", "note": "CVC verb"},
    {"text": "Sit.", "level": 1, "cat": "Body", "note": "CVC verb"},
    {"text": "Clap.", "level": 1, "cat": "Hands", "note": "CCVC blend"},
    {"text": "Stop.", "level": 1, "cat": "Body", "note": "CCVC blend"},
    {"text": "Spin.", "level": 1, "cat": "Body", "note": "CCVC blend"},
    {"text": "Nod.", "level": 1, "cat": "Body", "note": "CVC verb"},
    {"text": "Tap.", "level": 1, "cat": "Hands", "note": "CVC verb"},

    # ── LEVEL 2: VERB + OBJECT (8 cards) ──
    {"text": "Clap ten.", "level": 2, "cat": "Hands", "note": "blend + CVC"},
    {"text": "Hop to me.", "level": 2, "cat": "Body", "note": "CVC + sight words"},
    {"text": "Get a cup.", "level": 2, "cat": "Objects", "note": "CVC + CVC"},
    {"text": "Pat the mat.", "level": 2, "cat": "Hands", "note": "CVC -at family"},
    {"text": "Run and sit.", "level": 2, "cat": "Body", "note": "two CVC actions"},
    {"text": "Pick up a pen.", "level": 2, "cat": "Objects", "note": "CVC objects"},
    {"text": "Find a red cup.", "level": 2, "cat": "Objects", "note": "CVC + colour"},
    {"text": "Stand on one leg.", "level": 2, "cat": "Body", "note": "blend + CVC"},

    # ── LEVEL 3: SHORT PHRASES (4 cards) ──
    {"text": "Hop to the big mat.", "level": 3, "cat": "Body", "note": "CVC chain"},
    {"text": "Get a pen and a cup.", "level": 3, "cat": "Objects", "note": "two CVC objects"},
    {"text": "Clap, then stop, then sit.", "level": 3, "cat": "Challenge", "note": "3-step sequence"},
    {"text": "Run to the door and clap.", "level": 3, "cat": "Challenge", "note": "2-step + blend"},
]


def draw_card(c, x, y, card, idx):
    """Draw one command card."""
    # White card with border
    c.setFillColor(white)
    c.setStrokeColor(HexColor('#CCCCCC'))
    c.setLineWidth(0.5)
    c.roundRect(x, y, CARD_W, CARD_H, 6, fill=1, stroke=1)

    # Category colour stripe (left)
    color = CAT_COLORS.get(card["cat"], DARK_TEAL)
    c.setFillColor(color)
    c.roundRect(x, y, 8, CARD_H, 6, fill=1, stroke=0)
    c.rect(x + 4, y, 4, CARD_H, fill=1, stroke=0)

    # Card number + level (top corners)
    c.setFillColor(HexColor('#AAAAAA'))
    c.setFont("Helvetica", 8)
    c.drawString(x + 14, y + CARD_H - 14, f"#{idx+1}")
    dots = "●" * card["level"] + "○" * (3 - card["level"])
    c.drawRightString(x + CARD_W - 8, y + CARD_H - 14, f"L{card['level']} {dots}")

    # Category (small, below number)
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(x + 14, y + CARD_H - 26, card["cat"].upper())

    # ── THE COMMAND — big, clear, centred ──
    c.setFillColor(black)
    text = card["text"]

    if card["level"] == 1:
        # Single word: HUGE
        c.setFont("Helvetica-Bold", 36)
        c.drawCentredString(x + CARD_W / 2, y + CARD_H / 2 - 16, text)
    elif card["level"] == 2:
        # 2-3 words: large
        c.setFont("Helvetica-Bold", 22)
        c.drawCentredString(x + CARD_W / 2, y + CARD_H / 2 - 12, text)
    else:
        # 4-5 words: medium, possibly two lines
        c.setFont("Helvetica-Bold", 17)
        if len(text) > 24:
            # Split into two lines at a natural break
            words = text.split()
            mid = len(words) // 2
            line1 = " ".join(words[:mid])
            line2 = " ".join(words[mid:])
            c.drawCentredString(x + CARD_W / 2, y + CARD_H / 2 - 2, line1)
            c.drawCentredString(x + CARD_W / 2, y + CARD_H / 2 - 22, line2)
        else:
            c.drawCentredString(x + CARD_W / 2, y + CARD_H / 2 - 12, text)

    # Phonetic note (tiny, bottom)
    c.setFillColor(HexColor('#BBBBBB'))
    c.setFont("Helvetica", 6)
    c.drawString(x + 14, y + 5, card["note"])


def create_pdf(output):
    c = canvas.Canvas(output, pagesize=A4)

    cols, rows = 2, 4
    gap_x, gap_y = 0.2 * inch, 0.2 * inch
    total_w = cols * CARD_W + (cols - 1) * gap_x
    start_x = (PAGE_W - total_w) / 2
    cards_per_page = cols * rows

    for page_start in range(0, len(COMMANDS), cards_per_page):
        if page_start > 0:
            c.showPage()

        # Header on first page
        if page_start == 0:
            c.setFillColor(DARK_TEAL)
            c.setFont("Helvetica-Bold", 15)
            c.drawCentredString(PAGE_W / 2, PAGE_H - 28, "AMI Command Cards — Eric")
            c.setFillColor(HexColor('#777777'))
            c.setFont("Helvetica", 8)
            c.drawCentredString(PAGE_W / 2, PAGE_H - 42,
                "20 Cards  •  CVC / Blends  •  Level 1 → 3 Progression  •  Age 4.5")

            # Legend
            lx = MARGIN + 10
            c.setFont("Helvetica", 7)
            for cat, col in CAT_COLORS.items():
                c.setFillColor(col)
                c.circle(lx, PAGE_H - 56, 3, fill=1, stroke=0)
                c.setFillColor(HexColor('#555555'))
                c.drawString(lx + 6, PAGE_H - 59, cat)
                lx += 90
            top_y = PAGE_H - 74
        else:
            top_y = PAGE_H - MARGIN

        page_cards = COMMANDS[page_start:page_start + cards_per_page]
        for i, card in enumerate(page_cards):
            col = i % cols
            row = i // cols
            x = start_x + col * (CARD_W + gap_x)
            y = top_y - CARD_H - row * (CARD_H + gap_y)
            draw_card(c, x, y, card, page_start + i)

    # ── TEACHER NOTES PAGE ──
    c.showPage()
    c.setFillColor(DARK_TEAL)
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 35, "Teacher Notes")

    y = PAGE_H - 65
    notes = [
        ("Why These Are Simpler", [
            "Eric is 4.5 with strong SPOKEN English but phonetic foundation gaps.",
            "His reading level is CVC / early blends — NOT sentence-level yet.",
            "These cards match what his EYES can decode, not what his MOUTH can say.",
            "Level 1 = single CVC words. Level 2 = 2-3 word phrases. Level 3 = short chains.",
        ]),
        ("How to Use", [
            "Start with Level 1 cards ONLY. These should feel EASY — that's the point.",
            "Eric reads the word, does the action. That's it. Reading → action = comprehension.",
            "When Level 1 is instant (no sounding out), move to Level 2.",
            "Level 3 only when Level 2 is fluent. Never rush — confidence beats coverage.",
        ]),
        ("The Oral Bridge", [
            "After each card, USE the sophisticated word orally: 'You hopped! That was MAGNIFICENT.'",
            "Eric hears 'magnificent' while doing a simple reading task — oral strength reinforced.",
            "This is the bridge: simple decoding + rich oral vocabulary = rapid growth.",
        ]),
        ("Bingo Commander — Next Week", [
            "Eric MUST run the Bingo game next week — his success point to build from.",
            "These Command Cards are warm-up. By next week, reading single words = automatic.",
            "Bingo calling cards are single CVC words — exactly what Level 1 trains.",
            "He'll read confidently because he's already done it 20+ times this week.",
        ]),
    ]

    for title, points in notes:
        c.setFillColor(DARK_TEAL)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(MARGIN + 10, y, title)
        y -= 16
        c.setFillColor(black)
        c.setFont("Helvetica", 9)
        for p in points:
            c.drawString(MARGIN + 22, y, f"• {p}")
            y -= 13
        y -= 8

    c.save()
    print(f"Created: {output}")


if __name__ == "__main__":
    out = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/Eric_AMI_Command_Cards.pdf"
    create_pdf(out)
