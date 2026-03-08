#!/usr/bin/env python3
"""
10 Detective/Spy Games for Eric (4.5yo)
Secret agent framing, targeting CVC/CVCE/blends.
10-15 min each, with materials, setup, extensions.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor

OUTPUT = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/Eric_Detective_Spy_Games.pdf"
PAGE_W, PAGE_H = A4
M = 0.6 * inch  # margin

DARK = HexColor('#0D3330')
ACCENT = HexColor('#1A5C54')
GOLD = HexColor('#D4A017')
LIGHT_BG = HexColor('#F8F6F0')
GREY = HexColor('#666666')

GAMES = [
    {
        "num": 1,
        "title": "Operation Sound Sweep",
        "target": "CVC initial sounds",
        "time": "10 min",
        "framing": "Agent Eric, HQ has hidden 10 objects around the room. Your mission: find all objects that begin with the secret sound. Today's classified sound is /k/.",
        "materials": [
            "10 miniature objects (5 starting with target sound, 5 decoys)",
            "Evidence bag (small basket or ziplock)",
            "Mission briefing card with target sound",
            "Agent badge (laminated name card)",
        ],
        "setup": [
            "Hide 10 objects around the room — 5 begin with target sound, 5 are decoys.",
            "Hand Eric the mission briefing card face-down. He reads the target sound.",
            "Set timer for 5 minutes. Agent must collect ONLY target-sound objects.",
        ],
        "how_to_play": [
            "Eric reads the mission card: 'Find all objects beginning with /k/.'",
            "He searches the room, placing matches in his evidence bag.",
            "After collection, he lays out evidence and names each object aloud.",
            "Teacher checks: correct items stay, decoys returned. Count hits vs misses.",
        ],
        "extension": "Double Agent mode: Eric hides objects for a partner. He writes the mission card himself using Moveable Alphabet.",
        "words": "cap, cup, car, cat, key (targets) + pen, hat, mop, dog, sun (decoys)",
    },
    {
        "num": 2,
        "title": "The Decoder Ring",
        "target": "CVC blending",
        "time": "12 min",
        "framing": "Agent Eric, we've intercepted a coded message. Each word is broken into its secret sounds. You must decode them to reveal the hidden instruction.",
        "materials": [
            "5-8 'coded message' strips (sounds separated: /k/ /a/ /t/)",
            "Decoder ring (cardboard circle with alphabet — optional prop)",
            "Pencil for writing decoded words",
            "Mission completion stamp or sticker",
        ],
        "setup": [
            "Write 5-8 CVC words with sounds separated by dots: k . a . t",
            "Place strips in an envelope marked 'CLASSIFIED'.",
            "Last strip should be a command: 'h.o.p  t.o  th.e  d.o.r' (Hop to the door).",
        ],
        "how_to_play": [
            "Eric opens the classified envelope and pulls out one strip at a time.",
            "He sounds out each segment, blends them: /k/./a/./t/ = 'cat!'",
            "He writes the decoded word next to the code.",
            "Final strip is a secret command — he reads it and DOES the action.",
        ],
        "extension": "Eric creates coded messages for classmates. Graduated difficulty: add CCVC codes (f.r.o.g) and CVCC codes (m.i.l.k).",
        "words": "cat, dog, run, hop, sit, big, red, cup (decode) + final command",
    },
    {
        "num": 3,
        "title": "Spy Binoculars",
        "target": "CVC word families (-at, -an, -ig)",
        "time": "10 min",
        "framing": "Agent Eric, use your spy binoculars to scan the room. You'll find word family agents hiding everywhere. Report back which family each agent belongs to.",
        "materials": [
            "Cardboard tube binoculars (two toilet rolls taped together)",
            "15 word cards taped around the room at eye level",
            "3 'family file' envelopes labelled: -at family, -an family, -ig family",
            "Spy notebook (small pad) and pencil",
        ],
        "setup": [
            "Tape 15 word cards around room: 5x -at (cat, bat, hat, mat, rat), 5x -an (can, fan, man, pan, van), 5x -ig (big, dig, fig, pig, wig).",
            "Place 3 family file envelopes on a table.",
            "Hand Eric binoculars and spy notebook.",
        ],
        "how_to_play": [
            "Eric scans with binoculars, spots a word card, reads it aloud.",
            "He writes the word in his spy notebook.",
            "He decides which family it belongs to and files it in the correct envelope.",
            "Mission complete when all 15 agents are filed correctly.",
        ],
        "extension": "Eric adds NEW words to each family from memory (e.g., 'sat' for -at). Can he find 3 more for each family?",
        "words": "cat, bat, hat, mat, rat / can, fan, man, pan, van / big, dig, fig, pig, wig",
    },
    {
        "num": 4,
        "title": "The Invisible Ink Caper",
        "target": "CVC medial vowels",
        "time": "12 min",
        "framing": "Agent Eric, a villain has stolen all the middle sounds from these words! Only you can restore them. Use your detective magnifying glass to figure out the missing vowel.",
        "materials": [
            "10 word cards with middle letter missing: c_t, d_g, p_n, etc.",
            "5 vowel tiles (a, e, i, o, u) in red/blue",
            "Magnifying glass (real or cardboard cutout)",
            "Corresponding miniature objects for self-checking",
        ],
        "setup": [
            "Write 10 CVC words with blank middle vowel on cards.",
            "Place matching miniature objects in a 'clue box'.",
            "Lay out 5 vowel tiles as the 'restoration kit'.",
        ],
        "how_to_play": [
            "Eric picks up a card: c_t. He looks at the clue object (miniature cat).",
            "He says the word aloud: 'cat!' What's the middle sound? '/a/!'",
            "He places the 'a' tile in the blank space.",
            "Self-check: flip card over to see complete word.",
        ],
        "extension": "Eric makes his own missing-vowel puzzles for a friend using Moveable Alphabet letters.",
        "words": "c_t(cat), d_g(dog), p_n(pen), h_t(hat), b_s(bus), p_g(pig), m_p(mop), c_p(cup), b_d(bed), s_n(sun)",
    },
    {
        "num": 5,
        "title": "Operation Blend Force",
        "target": "Consonant blends (bl, cl, fl, gr, st, tr)",
        "time": "12 min",
        "framing": "Agent Eric, elite Blend Force agents always travel in pairs. Your mission: match each blend pair to their target word and complete the operation.",
        "materials": [
            "12 blend cards: bl, cl, fl, gr, st, tr (two sets)",
            "12 word-ending cards: _ock, _ap, _ag, _een, _op, _ip, _ack, _am, _at, _in, _ar, _uck",
            "Agent pairing mat (simple grid drawn on paper)",
            "Mission checklist",
        ],
        "setup": [
            "Lay blend cards in a column on the left.",
            "Scatter word-ending cards face-down on the right.",
            "Eric must pair blends with endings to make real words.",
        ],
        "how_to_play": [
            "Eric picks a blend card (e.g., 'bl') and a word-ending card (e.g., '_ock').",
            "He blends them: 'bl + ock = block!' Is that a real word? Yes!",
            "If it's a real word, he places the pair on the agent mat. If not, ending goes back.",
            "Mission complete when 6+ real words are formed.",
        ],
        "extension": "Triple Agent mode: introduce triple blends (str, spr, scr). Eric builds 'strip', 'spring', 'scrap'.",
        "words": "block, clap, flag, green, stop, trip, black, clam, flat, grin, star, truck",
    },
    {
        "num": 6,
        "title": "The Secret Safe",
        "target": "CVC reading for meaning",
        "time": "10 min",
        "framing": "Agent Eric, the vault contains a treasure but it's locked with a combination. To crack the safe, you must read each clue card and follow the instructions EXACTLY.",
        "materials": [
            "Small lockbox or container with a treat/sticker inside",
            "6 sequential clue cards (CVC sentences leading to next clue)",
            "Hiding spots around room for each clue",
        ],
        "setup": [
            "Hide 6 clue cards around the room in sequence.",
            "Card 1 is handed directly to Eric. Each leads to the next.",
            "Final card reveals the 'combination' (a word to say aloud to open the safe).",
        ],
        "how_to_play": [
            "Eric reads Card 1: 'Go to the red mat and look under it.'",
            "Under the mat he finds Card 2: 'Run to the big box. Open the lid.'",
            "Inside the box: Card 3... and so on through 6 clues.",
            "Final card: 'The code is: MAGNIFICENT. Say it to your teacher.'",
        ],
        "extension": "Eric writes the clue cards for the NEXT agent's mission (another child). He becomes the mission designer.",
        "words": "CVC sentences: 'Go to the red mat.' 'Run to the big box.' 'Hop on one leg to the cup.'",
    },
    {
        "num": 7,
        "title": "Agent Phonogram",
        "target": "sh, ch, th digraphs",
        "time": "12 min",
        "framing": "Agent Eric, the Phonogram Division needs your help. Three elite digraph teams (SH, CH, TH) have lost their agents. Sort each word agent back to the correct team.",
        "materials": [
            "3 team folders labelled: SH Team, CH Team, TH Team",
            "15 word cards (5 per digraph): ship, shop, shell, fish, dish / chip, chin, chest, chain, rich / thin, thick, this, bath, math",
            "Digraph sandpaper letters for reference",
        ],
        "setup": [
            "Spread 15 word cards face-up on the table.",
            "Place 3 team folders in a row.",
            "Optional: digraph sandpaper letters next to folders for reference.",
        ],
        "how_to_play": [
            "Eric picks up a word card, reads it aloud: 'ship!'",
            "He identifies the digraph: 'sh — that's SH Team!'",
            "He files it in the SH folder.",
            "Continue until all 15 agents are sorted. Self-check by reading each folder's contents.",
        ],
        "extension": "Eric finds classroom objects that belong to each team (shoe = SH, chair = CH, thermometer = TH).",
        "words": "ship, shop, shell, fish, dish / chip, chin, chest, chain, rich / thin, thick, this, bath, math",
    },
    {
        "num": 8,
        "title": "The Word Bomb Defusal",
        "target": "CVC/CCVC segmenting",
        "time": "10 min",
        "framing": "Agent Eric, a word bomb is about to go off! The only way to defuse it is to break each word into its exact sounds. Get all the sounds right and the bomb is safe!",
        "materials": [
            "10 'bomb' cards (folded cards with word on inside)",
            "Elkonin sound boxes (3-4 boxes drawn on paper strips)",
            "Counters or tokens (one per sound)",
            "Timer (optional — adds excitement)",
        ],
        "setup": [
            "Fold 10 cards with a word hidden inside each one.",
            "Prepare Elkonin box strips (3-box and 4-box versions).",
            "Set out counters.",
        ],
        "how_to_play": [
            "Eric opens a bomb card: 'frog'",
            "He takes a 4-box strip and pushes one counter per sound: /f/ /r/ /o/ /g/",
            "He counts: '4 sounds!' If correct, bomb defused!",
            "If wrong number of sounds, he tries again. Teacher can give the word slowly.",
        ],
        "extension": "Reverse mode: teacher pushes counters silently, Eric must guess the word from the number of sounds + initial sound clue.",
        "words": "cat(3), dog(3), frog(4), stop(4), big(3), trip(4), ship(3), clap(4), pen(3), drum(4)",
    },
    {
        "num": 9,
        "title": "Undercover Rhyme Agent",
        "target": "Rhyming / word families",
        "time": "10 min",
        "framing": "Agent Eric, you're going undercover in Rhyme City. Your cover identity: you must find your rhyming partner. Every agent has a match — find yours before time runs out!",
        "materials": [
            "20 word cards (10 rhyming pairs)",
            "Agent ID badges (optional — clip cards to shirt)",
            "Rhyme City mat (paper with 'city' drawn on it)",
            "Timer set to 5 minutes",
        ],
        "setup": [
            "Spread 20 cards face-up on the Rhyme City mat.",
            "Eric must find all 10 rhyming pairs.",
            "Start the timer.",
        ],
        "how_to_play": [
            "Eric picks up a card: 'cat'. He scans for its rhyming partner.",
            "He finds 'hat' — 'cat, hat — they rhyme!' Places pair together.",
            "Continue until all 10 pairs are matched.",
            "Bonus: for each pair, Eric says ONE more rhyming word (bat, mat, sat...).",
        ],
        "extension": "Eric creates an 'impossible rhyme' — a word with no common rhyme partner (e.g., 'orange'). Can his friends find one?",
        "words": "cat-hat, dog-log, pen-hen, bug-mug, fox-box, pin-bin, cup-pup, bed-red, sun-fun, top-hop",
    },
    {
        "num": 10,
        "title": "The Grand Finale: Operation Bingo Commander",
        "target": "Reading fluency + leadership prep",
        "time": "15 min",
        "framing": "Agent Eric, this is it — your FINAL MISSION before you become a Bingo Commander next week. Prove you can read every word on the master list with confidence and authority.",
        "materials": [
            "Master word list (30 CVC words from Bingo game)",
            "Commander voice practice cards (5 sentences to read LOUDLY)",
            "Star sticker chart (earn stars for fluent reads)",
            "Commander badge (to wear next week during Bingo)",
        ],
        "setup": [
            "Lay out the 30 Bingo word cards in 6 rows of 5.",
            "Prepare 5 'commander voice' sentence cards.",
            "Have star stickers ready.",
        ],
        "how_to_play": [
            "Round 1 — Speed Read: Eric reads all 30 words. Star for each row read without hesitation.",
            "Round 2 — Commander Voice: Eric reads 5 sentences in his 'big, clear commander voice'.",
            "Round 3 — Mock Bingo: Teacher plays Bingo, Eric is the CALLER. He draws a card, reads it loud and clear.",
            "When he can call all words confidently: award Commander badge for next week!",
        ],
        "extension": "NEXT WEEK: Eric runs the actual Bingo game as Commander. He reads calling cards, checks winners, and manages the game.",
        "words": "All 30 CVC Bingo words + 5 sentences: 'The next word is...' 'Does anyone have...?' 'Check your card!' 'We have a winner!' 'New round!'",
    },
]


def draw_game_page(c, game):
    """Draw a single game on one page."""
    y = PAGE_H - M
    
    # Header bar
    c.setFillColor(DARK)
    c.rect(0, PAGE_H - 50, PAGE_W, 50, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(M, PAGE_H - 20, f"MISSION {game['num']} of 10")
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(M, PAGE_H - 42, game["title"])
    
    # Target + Time badges (right side of header)
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(PAGE_W - M, PAGE_H - 18, f"TARGET: {game['target']}")
    c.setFillColor(HexColor('#AAAAAA'))
    c.setFont("Helvetica", 8)
    c.drawRightString(PAGE_W - M, PAGE_H - 32, f"TIME: {game['time']}")
    
    y = PAGE_H - 70
    
    # Mission briefing (framing)
    c.setFillColor(LIGHT_BG)
    c.roundRect(M, y - 50, PAGE_W - 2*M, 50, 4, fill=1, stroke=0)
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M + 8, y - 10, "MISSION BRIEFING")
    c.setFillColor(black)
    c.setFont("Helvetica-Oblique", 9)
    # Word wrap the framing text
    framing = game["framing"]
    lines = wrap_text(framing, 85)
    ty = y - 24
    for line in lines[:3]:
        c.drawString(M + 8, ty, line)
        ty -= 12
    y -= 62
    
    # Two-column layout: Materials (left) + Setup (right)
    col_w = (PAGE_W - 2*M - 20) / 2
    
    # Materials
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M, y, "MATERIALS NEEDED")
    y -= 14
    c.setFillColor(black)
    c.setFont("Helvetica", 8.5)
    for mat in game["materials"]:
        c.drawString(M + 8, y, f"• {mat}")
        y -= 12
    
    # Setup (right column, same y start)
    setup_y = y + 14 + 12 * len(game["materials"])
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M + col_w + 20, setup_y, "SETUP")
    setup_y -= 14
    c.setFillColor(black)
    c.setFont("Helvetica", 8.5)
    for i, step in enumerate(game["setup"]):
        lines = wrap_text(step, 42)
        for line in lines:
            c.drawString(M + col_w + 28, setup_y, f"{i+1}. {line}" if line == lines[0] else f"   {line}")
            setup_y -= 12
    
    y = min(y, setup_y) - 10
    
    # How to play
    c.setFillColor(DARK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(M, y, "HOW TO PLAY")
    y -= 4
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.5)
    c.line(M, y, M + 80, y)
    y -= 14
    
    c.setFillColor(black)
    c.setFont("Helvetica", 9)
    for i, step in enumerate(game["how_to_play"]):
        lines = wrap_text(step, 80)
        for line in lines:
            prefix = f"{i+1}. " if line == lines[0] else "   "
            c.drawString(M + 8, y, f"{prefix}{line}")
            y -= 13
        y -= 2
    
    y -= 6
    
    # Words used
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(M, y, "WORD LIST")
    y -= 12
    c.setFillColor(GREY)
    c.setFont("Helvetica", 8)
    word_lines = wrap_text(game["words"], 90)
    for line in word_lines:
        c.drawString(M + 8, y, line)
        y -= 11
    
    y -= 8
    
    # Extension
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(M, y, "EXTENSION ACTIVITY")
    y -= 12
    c.setFillColor(black)
    c.setFont("Helvetica", 8.5)
    ext_lines = wrap_text(game["extension"], 85)
    for line in ext_lines:
        c.drawString(M + 8, y, line)
        y -= 11


def wrap_text(text, max_chars):
    """Simple word-wrap."""
    words = text.split()
    lines = []
    current = ""
    for w in words:
        if len(current) + len(w) + 1 <= max_chars:
            current = f"{current} {w}" if current else w
        else:
            if current:
                lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


def create_spy_games_pdf():
    c = canvas.Canvas(OUTPUT, pagesize=A4)
    
    # Cover page
    c.setFillColor(DARK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    
    # Gold accent bar
    c.setFillColor(GOLD)
    c.rect(0, PAGE_H/2 + 40, PAGE_W, 4, fill=1, stroke=0)
    c.rect(0, PAGE_H/2 - 120, PAGE_W, 4, fill=1, stroke=0)
    
    c.setFillColor(GOLD)
    c.setFont("Helvetica", 12)
    c.drawCentredString(PAGE_W/2, PAGE_H/2 + 60, "CLASSIFIED  •  FOR AGENT ERIC ONLY")
    
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(PAGE_W/2, PAGE_H/2 + 10, "DETECTIVE &")
    c.drawCentredString(PAGE_W/2, PAGE_H/2 - 28, "SPY GAMES")
    
    c.setFillColor(GOLD)
    c.setFont("Helvetica", 11)
    c.drawCentredString(PAGE_W/2, PAGE_H/2 - 60, "10 Missions  •  CVC / CVCE / Blends  •  Age 4.5")
    
    c.setFillColor(HexColor('#88AA88'))
    c.setFont("Helvetica", 9)
    c.drawCentredString(PAGE_W/2, PAGE_H/2 - 90, "Sophisticated framing. Simple phonetic targets.")
    c.drawCentredString(PAGE_W/2, PAGE_H/2 - 104, "Each mission: 10-15 minutes. Materials list included.")
    
    c.setFillColor(HexColor('#555555'))
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(PAGE_W/2, 60, "Final Mission: Operation Bingo Commander — prepares Eric to RUN bingo next week")
    
    c.showPage()
    
    # Game pages
    for game in GAMES:
        draw_game_page(c, game)
        c.showPage()
    
    c.save()
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    create_spy_games_pdf()
