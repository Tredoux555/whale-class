#!/usr/bin/env python3
"""Week 1 printable pack — HOUSE FORMATS, ported from the Montree generators:

- 3-part cards:   components/card-generator/print-utils.ts (square layout, 7.5cm,
                  colored-frame technique, batched control/picture/label pages)
- Sentence match: print-utils.ts strip layout (21x6.5 control, 14.5x6.5 sentence,
                  6.5x6.5 picture — identical-overlay invariant, uniform batch font)
- Bingo:          public/tools/picture-bingo-generator.html (4x4 boards from the
                  full 16-word pool, uniform-border grid, duplex calling cards
                  with locked 18mm header, short-edge flip)

Defaults locked to the generators: border #2D5A27, Comic Sans MS bold, text #1f2937.
Usage: python3 build_week01_pack.py "/path/to/Week 01"
"""
import os
import random
import sys

BASE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))

BORDER = "#2D5A27"          # CardGenerator default border color
INK = "#1f2937"             # card text color (house)
FONT = "'Comic Sans MS', 'Comic Sans', cursive"
BLUE = "#2456c7"            # Montessori vowel blue

# --- geometry (print-utils.ts constants) ---
A4W, A4H = 21.0, 29.7       # cm
PAD = 0.5                   # WHITE_BORDER_CM — colored frame width
RAD = 0.4                   # CARD_BORDER_RADIUS

# 3-part (square layout, DEFAULT_CARD_SIZE_CM = 7.5)
S = 7.5
LABEL_H = max(2.0, round(S * 0.32, 1))       # 2.4
CONTROL_H = S + LABEL_H                       # 9.9
COLS = int(A4W // S)                          # 2
PIC_ROWS = int(A4H // S)                      # 3
CTRL_ROWS = int(A4H // CONTROL_H)             # 3
LABEL_ROWS = int(A4H // LABEL_H)              # 12
FONT_PT = max(12, min(36, round(S * 3.2)))    # 24

# strip layout (sentence match, cardSizeCm = 6.5)
STRIP_H = 6.5
STRIP_W = A4W                                 # 21 control width
PIC = STRIP_H                                 # 6.5 square
SENT_W = STRIP_W - PIC                        # 14.5
GAP = PAD * 2                                 # 1.0 internal gap in control
STRIPS_PER_PAGE = int(A4H // STRIP_H)         # 4
PICCOLS = int(A4W // PIC)                     # 3
PICROWS = int(A4H // PIC)                     # 4

WORDS = [
    ("01-chair.png", "chair", "a"),
    ("02-table.png", "table", "a"),
    ("03-mat.png", "mat", "a"),
    ("04-cup.png", "cup", "a"),
    ("05-book.png", "book", "a"),
    ("06-pencil.png", "pencil", "a"),
    ("07-apple.png", "apple", "an"),
    ("08-egg.png", "egg", "an"),
    ("10-potato.png", "potato", "a"),
]
SOUND_WORDS = ["ant", "alligator", "astronaut", "ambulance", "anchor", "abacus", "acrobat"]
IMG = {noun: img for img, noun, _ in WORDS}
# Sound-card images auto-attach when dropped in images/ (manifest: 11-ant ... 17-acrobat)
for _i, _n in enumerate(SOUND_WORDS, start=11):
    _f = f"{_i}-{_n}.png"
    if os.path.exists(os.path.join(BASE, "images", _f)):
        IMG[_n] = _f


def sentence_for(noun):
    return "It's a POTATO!" if noun == "potato" else (
        f"It's an {noun}." if noun in ("apple", "egg") else f"It's a {noun}.")


# --- uniform strip font (port of computeUniformStripFontSize, pass 1) ---
def uniform_strip_font(sentences, base_pt, text_w_cm, text_h_cm):
    iw = (text_w_cm - 0.4) * 28.35
    ih = (text_h_cm - 0.3) * 28.35
    CHAR_W, MIN_PT, LH = 0.52, 14, 1.2
    uniform = base_pt
    for s in sentences:
        f = base_pt
        while f >= MIN_PT:
            if len(s) * f * CHAR_W <= iw and f * LH <= ih:
                break
            f -= 1
        uniform = min(uniform, max(MIN_PT, f))
    return uniform


BASE_CSS = """
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:A4;margin:0;}
body{font-family:system-ui,sans-serif;background:white;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{page-break-after:always;width:21cm;height:29.7cm;position:relative;overflow:hidden;}
.page:last-child{page-break-after:auto;}
"""


def doc(css, body):
    return ("<!DOCTYPE html><html><head><meta charset='UTF-8'><style>"
            + BASE_CSS + css + "</style></head><body>" + body + "</body></html>")


def write(name, html):
    with open(os.path.join(BASE, name), "w") as f:
        f.write(html)
    print("wrote", name)


# ==================================================================== 3-part
def build_three_part():
    css = f"""
.grid{{display:grid;grid-template-columns:repeat({COLS},{S}cm);gap:0;}}
.grid-ctrl{{grid-auto-rows:{CONTROL_H}cm;margin-left:{(A4W - S * COLS) / 2}cm;margin-top:{(A4H - CONTROL_H * CTRL_ROWS) / 2}cm;}}
.grid-pic{{grid-auto-rows:{S}cm;margin-left:{(A4W - S * COLS) / 2}cm;margin-top:{(A4H - S * PIC_ROWS) / 2}cm;}}
.grid-lab{{grid-auto-rows:{LABEL_H}cm;margin-left:{(A4W - S * COLS) / 2}cm;margin-top:{(A4H - LABEL_H * LABEL_ROWS) / 2}cm;}}
.card{{background:{BORDER};padding:{PAD}cm;display:flex;flex-direction:column;gap:{PAD}cm;
  border-radius:{RAD}cm;overflow:hidden;}}
.card-ctrl{{height:{CONTROL_H}cm;width:{S}cm;}}
.card-pic{{height:{S}cm;width:{S}cm;}}
.card-lab{{height:{LABEL_H}cm;width:{S}cm;}}
.img{{background:white;flex:1;overflow:hidden;border-radius:{RAD}cm;}}
.img img{{width:100%;height:100%;object-fit:cover;display:block;}}
.lab{{background:white;height:{max(1.4, LABEL_H - 0.6)}cm;display:flex;align-items:center;justify-content:center;
  font-family:{FONT};font-size:{FONT_PT}pt;font-weight:bold;color:{INK};text-align:center;
  padding:0.2cm 0.3cm;border-radius:{RAD}cm;}}
.card-lab .lab{{flex:1;height:auto;}}
"""
    def ctrl(img, noun):
        return (f"<div class='card card-ctrl'><div class='img'><img src='images/{img}'></div>"
                f"<div class='lab'>{noun}</div></div>")

    def pic(img):
        return f"<div class='card card-pic'><div class='img'><img src='images/{img}'></div></div>"

    def lab(noun):
        return f"<div class='card card-lab'><div class='lab'>{noun}</div></div>"

    pages = []
    per = COLS * CTRL_ROWS
    cards = [ctrl(i, n) for i, n, _ in WORDS]
    for i in range(0, len(cards), per):
        pages.append(f"<div class='page'><div class='grid grid-ctrl'>{''.join(cards[i:i + per])}</div></div>")
    per = COLS * PIC_ROWS
    cards = [pic(i) for i, n, _ in WORDS]
    for i in range(0, len(cards), per):
        pages.append(f"<div class='page'><div class='grid grid-pic'>{''.join(cards[i:i + per])}</div></div>")
    per = COLS * LABEL_ROWS
    cards = [lab(n) for i, n, _ in WORDS]
    for i in range(0, len(cards), per):
        pages.append(f"<div class='page'><div class='grid grid-lab'>{''.join(cards[i:i + per])}</div></div>")
    write("pack_threepart.html", doc(css, "".join(pages)))


# ============================================================ sentence match
def build_sentence_match():
    sentences = [sentence_for(n) for _, n, _ in WORDS]
    text_w = STRIP_W - PAD * 2 - GAP - PIC     # 12.5
    text_h = STRIP_H - PAD * 2                 # 5.5
    base = max(28, min(72, round(STRIP_H * 12)))
    fpt = uniform_strip_font(sentences, base, text_w, text_h)

    css = f"""
.gridc{{display:grid;grid-template-columns:{STRIP_W}cm;grid-auto-rows:{STRIP_H}cm;gap:0;
  margin-top:{(A4H - STRIP_H * STRIPS_PER_PAGE) / 2}cm;}}
.grids{{display:grid;grid-template-columns:{SENT_W}cm;grid-auto-rows:{STRIP_H}cm;gap:0;
  margin-left:{(A4W - SENT_W) / 2}cm;margin-top:{(A4H - STRIP_H * STRIPS_PER_PAGE) / 2}cm;}}
.gridp{{display:grid;grid-template-columns:repeat({PICCOLS},{PIC}cm);grid-auto-rows:{PIC}cm;gap:0;
  margin-left:{(A4W - PIC * PICCOLS) / 2}cm;margin-top:{(A4H - PIC * PICROWS) / 2}cm;}}
.sc{{background:{BORDER};width:{STRIP_W}cm;height:{STRIP_H}cm;padding:{PAD}cm;display:flex;
  gap:{GAP}cm;border-radius:{RAD}cm;overflow:hidden;}}
.ss{{background:{BORDER};width:{SENT_W}cm;height:{STRIP_H}cm;padding:{PAD}cm;
  border-radius:{RAD}cm;overflow:hidden;}}
.txt{{flex:1;width:100%;height:100%;background:white;display:flex;align-items:center;justify-content:center;
  padding:0.2cm 0.5cm;font-family:{FONT};font-weight:bold;font-size:{fpt}pt;text-align:center;
  line-height:1.25;color:{INK};border-radius:{RAD}cm;overflow:hidden;}}
.pimg{{width:{PIC - PAD * 2}cm;height:{PIC - PAD * 2}cm;background:white;overflow:hidden;
  flex-shrink:0;border-radius:{RAD}cm;}}
.pimg img{{width:100%;height:100%;object-fit:cover;display:block;}}
.pc{{background:{BORDER};width:{PIC}cm;height:{PIC}cm;padding:{PAD}cm;border-radius:{RAD}cm;overflow:hidden;}}
.pci{{width:100%;height:100%;background:white;overflow:hidden;border-radius:{RAD}cm;}}
.pci img{{width:100%;height:100%;object-fit:cover;display:block;}}
"""
    controls = [
        (f"<div class='sc'><div class='txt'>{sentence_for(n)}</div>"
         f"<div class='pimg'><img src='images/{i}'></div></div>") for i, n, _ in WORDS]
    pics = [f"<div class='pc'><div class='pci'><img src='images/{i}'></div></div>" for i, n, _ in WORDS]
    sents = [f"<div class='ss'><div class='txt'>{sentence_for(n)}</div></div>" for i, n, _ in WORDS]

    pages = []
    for i in range(0, len(controls), STRIPS_PER_PAGE):
        pages.append(f"<div class='page'><div class='gridc'>{''.join(controls[i:i + STRIPS_PER_PAGE])}</div></div>")
    per = PICCOLS * PICROWS
    for i in range(0, len(pics), per):
        pages.append(f"<div class='page'><div class='gridp'>{''.join(pics[i:i + per])}</div></div>")
    for i in range(0, len(sents), STRIPS_PER_PAGE):
        pages.append(f"<div class='page'><div class='grids'>{''.join(sents[i:i + STRIPS_PER_PAGE])}</div></div>")
    write("pack_sentencematch.html", doc(css, "".join(pages)))


# ===================================================================== bingo
def build_bingo():
    pool = [n for _, n, _ in WORDS] + SOUND_WORDS   # exactly 16
    BW = 0.60       # board border width — EXTRA THICK (cut + laminate)
    CW = 0.56       # calling-card border width — 4x thick
    css = f"""
.hdr{{text-align:center;height:18mm;margin:8mm 0 4mm;overflow:hidden;}}
.hdr h2{{font-size:26px;color:{INK};font-family:'Nunito',system-ui,sans-serif;font-weight:700;
  line-height:1.1;white-space:nowrap;}}
.hdr p{{font-size:12px;color:#999;margin-top:3px;line-height:1.2;white-space:nowrap;}}
.bgrid{{display:grid;grid-template-columns:repeat(4,1fr);width:190mm;margin:0 auto;
  background:{BORDER};padding:{BW}cm;gap:{BW}cm;border-radius:{RAD}cm;}}
.bcell{{aspect-ratio:1;display:flex;flex-direction:column;overflow:hidden;background:white;}}
.bcell img{{width:100%;flex:1;object-fit:cover;display:block;min-height:0;}}
.bcell .w{{font-size:14pt;font-weight:700;font-family:{FONT};color:{INK};
  padding:2px 0;text-align:center;flex-shrink:0;line-height:1.2;}}
.bcell .phw{{flex:1;display:flex;align-items:center;justify-content:center;
  font-family:{FONT};font-weight:700;font-size:17pt;color:#9ca3af;}}
.cgrid{{display:grid;grid-template-columns:repeat(3,1fr);width:190mm;margin:0 auto;gap:0;}}
.ccard{{aspect-ratio:1;background:{BORDER};padding:{CW}cm;border-radius:{RAD}cm;
  display:flex;flex-direction:column;}}
.cin{{background:white;flex:1;display:flex;align-items:center;justify-content:center;
  overflow:hidden;border-radius:{RAD}cm;}}
.cin img{{width:100%;height:100%;object-fit:cover;display:block;}}
.cw{{font-size:30pt;font-weight:700;font-family:{FONT};color:{INK};}}
.cphw{{font-size:19pt;font-weight:700;font-family:{FONT};color:#9ca3af;}}
"""
    def bcell(noun):
        if noun in IMG:
            return (f"<div class='bcell'><img src='images/{IMG[noun]}'>"
                    f"<div class='w'>{noun}</div></div>")
        return f"<div class='bcell'><div class='phw'>{noun}</div><div class='w'>{noun}</div></div>"

    random.seed(2026)
    pages = []
    for b in range(6):
        picks = random.sample(pool, 16)      # full pool, shuffled arrangement
        pages.append(
            "<div class='page'>"
            f"<div class='hdr'><h2>a &middot; BINGO</h2><p>Board #{b + 1} &middot; single-sided &middot; name ____________________</p></div>"
            f"<div class='bgrid'>{''.join(bcell(n) for n in picks)}</div></div>")

    # Calling cards — 3x3 per page (bigger, ~63mm), DUPLEX: picture front, word
    # back. Back page = each row col-mirrored (locked geometry, flip SHORT edge).
    # Pages interleaved F1,B1,F2,B2 so a straight duplex print just works.
    SPACER = "__SPACER__"

    def front(noun):
        if noun == SPACER:
            return "<div class='ccard' style='visibility:hidden'></div>"
        inner = (f"<img src='images/{IMG[noun]}'>" if noun in IMG
                 else f"<span class='cphw'>{noun}</span>")
        return f"<div class='ccard'><div class='cin'>{inner}</div></div>"

    def back(noun):
        if noun == SPACER:
            return "<div class='ccard' style='visibility:hidden'></div>"
        return f"<div class='ccard'><div class='cin'><span class='cw'>{noun}</span></div></div>"

    chunks = [pool[0:9], pool[9:16]]
    total = len(chunks)
    for pi, items in enumerate(chunks):
        rows = [items[i:i + 3] for i in range(0, len(items), 3)]
        rows = [r + [SPACER] * (3 - len(r)) for r in rows]           # pad partial rows
        fronts = "".join(front(n) for r in rows for n in r)
        backs = "".join(back(n) for r in rows for n in reversed(r))  # col-mirror per row
        pages.append("<div class='page'>"
                     "<div class='hdr'><h2>a &middot; BINGO &mdash; Calling Cards</h2>"
                     f"<p>Picture Side &middot; Page {pi + 1} of {total} &middot; Print duplex, flip on short edge</p></div>"
                     f"<div class='cgrid'>{fronts}</div></div>")
        pages.append("<div class='page'>"
                     "<div class='hdr'><h2>a &middot; BINGO &mdash; Calling Cards</h2>"
                     f"<p>Word Side (mirror-printed for duplex) &middot; Page {pi + 1} of {total}</p></div>"
                     f"<div class='cgrid'>{backs}</div></div>")
    write("pack_bingo.html", doc(css, "".join(pages)))


# ================================================================ dictionary
# "My Dictionary" journal page — per row: line-art picture (color it) + writing
# lines with the word in traceable gray + open space to write it independently.
# Color + trace + write: three works on one binder page per week.
def build_dictionary():
    css = f"""
.sheet{{padding:12mm 14mm;}}
.top{{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2mm;}}
.top .aa{{font-size:24pt;font-weight:700;font-family:{FONT};color:{BORDER};}}
.top .t{{font-size:11pt;color:#999;letter-spacing:3px;font-family:system-ui;}}
.top .nm{{font-size:11pt;color:#555;font-family:{FONT};}}
.drow{{display:flex;align-items:center;gap:6mm;height:48mm;
  border-bottom:0.3mm dashed #e5e7eb;}}
.dpic{{width:36mm;flex-shrink:0;text-align:center;}}
.dpic .cap{{font-size:10.5pt;font-family:{FONT};font-weight:700;color:{INK};margin-top:1mm;}}
.dpic .an{{color:{BORDER};}}
.lines{{position:relative;flex:1;height:24mm;}}
.l-top{{position:absolute;left:0;right:0;top:0;border-top:0.35mm solid #d1d5db;}}
.l-mid{{position:absolute;left:0;right:0;top:8mm;border-top:0.35mm dashed #c9c9c9;}}
.l-base{{position:absolute;left:0;right:0;top:16mm;border-top:0.45mm solid #9ca3af;}}
.trace{{position:absolute;left:4mm;top:16mm;transform:translateY(-84%);
  font-family:{FONT};font-weight:700;font-size:15mm;line-height:1;color:#d1d5db;
  letter-spacing:1mm;}}
"""
    def row(noun, art):
        a = f"<span class='an'>{art}</span>" if art == "an" else art
        return ("<div class='drow'>"
                f"<div class='dpic'>{shape_svg(noun, 30)}<div class='cap'>{a} {noun}</div></div>"
                "<div class='lines'><div class='l-top'></div><div class='l-mid'></div>"
                f"<div class='l-base'></div><div class='trace'>{noun}</div></div>"
                "</div>")

    def header():
        return ("<div class='top'><div class='aa'>Aa</div>"
                "<div class='t'>MY DICTIONARY &middot; WEEK 1</div>"
                "<div class='nm'>name ____________________</div></div>")

    entries = ART_WORDS + [("potato", "a")]
    p1 = "".join(row(n, a) for n, a in entries[:5])
    p2 = "".join(row(n, a) for n, a in entries[5:])
    body = (f"<div class='page sheet'>{header()}{p1}</div>"
            f"<div class='page sheet'>{header()}{p2}</div>")
    write("pack_dictionary.html", doc(css, body))


# ================================================================= worksheet
# Letter 'a' drawn as SVG stroke bands (not a font glyph) so we can overlay the
# Montessori stroke guides: green start dot, stroke 1 = counterclockwise sweep
# around the bowl, stroke 2 = down the stem. Same geometry stamps the tracing
# rows, so children trace exactly the shape the model shows.
def svg_letter_a(width_mm, guides=False, band="#d1d5db"):
    """Stroke-band lowercase 'a'. bowl: circle (42,63) r25; stem x67, y38-88."""
    g = ""
    if guides:
        g = (
            "<defs><marker id='ah' viewBox='0 0 10 10' refX='8' refY='5' "
            "markerWidth='4.6' markerHeight='4.6' orient='auto-start-reverse'>"
            f"<path d='M0 0 L10 5 L0 10 z' fill='{BORDER}'/></marker></defs>"
            # stroke 1 — CCW sweep around the OUTSIDE of the bowl
            f"<path d='M61.5 35 A34 34 0 1 0 50.8 95.8' fill='none' stroke='{BORDER}' "
            "stroke-width='2.6' marker-end='url(#ah)'/>"
            # stroke 2 — down beside the stem
            f"<path d='M78 42 L78 80' fill='none' stroke='{BORDER}' "
            "stroke-width='2.6' marker-end='url(#ah)'/>"
            # start dot (green = go, Montessori convention)
            f"<circle cx='56.3' cy='42.5' r='4.6' fill='{BORDER}'/>"
            # stroke numbers
            f"<text x='66' y='28' font-size='11' font-weight='bold' fill='{BORDER}' "
            f"font-family='system-ui'>1</text>"
            f"<text x='83' y='36' font-size='11' font-weight='bold' fill='{BORDER}' "
            f"font-family='system-ui'>2</text>"
        )
    dot = "" if guides else f"<circle cx='56.3' cy='42.5' r='4' fill='{BORDER}'/>"
    return (
        f"<svg width='{width_mm}mm' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>"
        f"<circle cx='42' cy='63' r='25' fill='none' stroke='{band}' stroke-width='11'/>"
        f"<line x1='67' y1='38' x2='67' y2='88' stroke='{band}' stroke-width='11' stroke-linecap='round'/>"
        + g + dot + "</svg>"
    )


def build_worksheet():
    css = f"""
.sheet{{padding:12mm;}}
.top{{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4mm;}}
.top .aa{{font-size:26pt;font-weight:700;font-family:{FONT};color:{BORDER};}}
.top .nm{{font-size:12pt;color:#555;font-family:{FONT};}}
.instr{{font-size:12pt;color:#666;font-family:{FONT};margin:3mm 0 1mm;}}
.bigletter{{text-align:center;}}
.trrow{{display:flex;align-items:flex-end;gap:9mm;padding:0 6mm;height:25mm;
  border-top:0.3mm solid #e5e7eb;border-bottom:0.5mm solid #9ca3af;margin-bottom:4mm;}}
.trrow svg{{display:block;margin-bottom:-2.6mm;}}
.svgrow{{display:flex;justify-content:space-around;align-items:flex-end;margin-top:5mm;}}
.svgrow .cap{{font-size:13pt;font-family:{FONT};font-weight:700;color:{INK};text-align:center;margin-top:2mm;}}
.svgrow .an{{color:{BORDER};}}
"""
    def svg(d, w=115, h=115, vb="0 0 100 110"):
        return (f"<svg width='{w}' height='{h}' viewBox='{vb}' fill='none' "
                f"stroke='{BORDER}' stroke-width='2.5'>{d}</svg>")
    apple = svg("<path d='M50 34 C30 22 12 36 14 59 C16 80 32 94 50 92 C68 94 84 80 86 59 C88 36 70 22 50 34 Z'/>"
                "<path d='M50 34 C50 24 54 18 60 14'/>"
                "<path d='M60 20 C70 14 78 18 78 26 C70 30 62 28 60 20 Z'/>")
    egg = svg("<path d='M50 8 C70 8 84 42 84 68 C84 90 69 104 50 104 C31 104 16 90 16 68 C16 42 30 8 50 8 Z'/>")
    cup = svg("<path d='M15 25 L20 90 C20 97 40 101 50 101 C60 101 80 97 80 90 L85 25'/>"
              "<ellipse cx='50' cy='25' rx='35' ry='9'/>"
              "<path d='M85 40 C105 38 108 65 82 71'/>", 125, 115, "0 0 120 110")
    # model stamp (green dot, no arrows — too small) + 5 trace stamps per row
    row = (svg_letter_a(21, guides=False, band="#9ca3af")
           + "".join(svg_letter_a(21, guides=False, band="#d1d5db").replace(
               f"<circle cx='56.3' cy='42.5' r='4' fill='{BORDER}'/>", "") for _ in range(5)))
    body = ("<div class='page sheet'>"
            "<div class='top'><div class='aa'>Aa</div><div class='nm'>name ______________________</div></div>"
            "<div class='instr'>Start at the green dot. 1 &mdash; around. 2 &mdash; down.</div>"
            f"<div class='bigletter'>{svg_letter_a(78, guides=True)}</div>"
            "<div class='instr'>Trace.</div>"
            f"<div class='trrow'>{row}</div>"
            f"<div class='trrow'>{row}</div>"
            "<div class='instr'>Color.</div>"
            "<div class='svgrow'>"
            f"<div>{apple}<div class='cap'><span class='an'>an</span> apple</div></div>"
            f"<div>{egg}<div class='cap'><span class='an'>an</span> egg</div></div>"
            f"<div>{cup}<div class='cap'>a cup</div></div>"
            "</div></div>")
    write("pack_worksheet.html", doc(css, body))


# ===================================================== line-art (coloring/matching)
# Hand-drawn outline shapes, green stroke, fill=none — for coloring + matching.
SHAPES = {
    "apple": ("<path d='M50 32 C30 20 12 34 14 57 C16 78 32 92 50 90 C68 92 84 78 86 57 C88 34 70 20 50 32 Z'/>"
              "<path d='M50 32 C50 22 54 16 60 12'/>"
              "<path d='M60 18 C70 12 78 16 78 24 C70 28 62 26 60 18 Z'/>", "0 0 100 100"),
    "egg": ("<path d='M50 8 C70 8 84 42 84 68 C84 90 69 104 50 104 C31 104 16 90 16 68 C16 42 30 8 50 8 Z'/>",
            "0 0 100 112"),
    "cup": ("<path d='M15 25 L20 90 C20 97 40 101 50 101 C60 101 80 97 80 90 L85 25'/>"
            "<ellipse cx='50' cy='25' rx='35' ry='9'/>"
            "<path d='M85 40 C105 38 108 65 82 71'/>", "0 0 120 112"),
    "chair": ("<line x1='32' y1='10' x2='32' y2='58'/><line x1='68' y1='10' x2='68' y2='58'/>"
              "<line x1='32' y1='16' x2='68' y2='16'/><line x1='32' y1='30' x2='68' y2='30'/>"
              "<rect x='26' y='58' width='48' height='9' rx='3'/>"
              "<line x1='31' y1='67' x2='28' y2='95'/><line x1='69' y1='67' x2='72' y2='95'/>", "0 0 100 100"),
    "table": ("<rect x='10' y='38' width='80' height='9' rx='2'/>"
              "<line x1='18' y1='47' x2='18' y2='88'/><line x1='82' y1='47' x2='82' y2='88'/>"
              "<line x1='18' y1='62' x2='82' y2='62'/>", "0 0 100 100"),
    "mat": ("<circle cx='68' cy='60' r='19'/><circle cx='68' cy='60' r='12'/><circle cx='68' cy='60' r='5'/>"
            "<path d='M68 41 L22 41'/><path d='M68 79 L22 79'/>"
            "<path d='M22 41 C13 41 13 79 22 79'/>", "0 0 100 100"),
    "book": ("<path d='M50 30 C38 20 20 22 12 28 L12 74 C20 68 38 66 50 76 Z'/>"
             "<path d='M50 30 C62 20 80 22 88 28 L88 74 C80 68 62 66 50 76 Z'/>"
             "<line x1='50' y1='30' x2='50' y2='76'/>"
             "<path d='M20 36 C30 32 40 33 45 37'/><path d='M80 36 C70 32 60 33 55 37'/>", "0 0 100 100"),
    "pencil": ("<rect x='10' y='42' width='58' height='18' rx='2'/>"
               "<path d='M68 42 L88 51 L68 60 Z'/><line x1='68' y1='42' x2='68' y2='60'/>"
               "<line x1='10' y1='48' x2='68' y2='48'/><line x1='10' y1='54' x2='68' y2='54'/>"
               "<rect x='4' y='42' width='6' height='18' rx='2'/>", "0 0 100 100"),
    "potato": ("<path d='M32 24 C48 10 70 14 80 30 C90 46 88 66 74 79 C60 92 38 91 26 77 C15 63 17 37 32 24 Z'/>"
               "<circle cx='42' cy='46' r='9'/><circle cx='63' cy='46' r='9'/>"
               "<line x1='51' y1='46' x2='54' y2='46'/>"
               "<path d='M45 66 C50 70 56 70 60 66'/>"
               "<circle cx='33' cy='64' r='1.6'/><circle cx='70' cy='62' r='1.6'/>", "0 0 100 100"),
}


def shape_svg(name, width_mm, stroke=2.5):
    inner, vb = SHAPES[name]
    return (f"<svg width='{width_mm}mm' viewBox='{vb}' fill='none' stroke='{BORDER}' "
            f"stroke-width='{stroke}' stroke-linecap='round' stroke-linejoin='round' "
            f"xmlns='http://www.w3.org/2000/svg'>{inner}</svg>")


ART_WORDS = [("chair", "a"), ("table", "a"), ("mat", "a"), ("cup", "a"),
             ("book", "a"), ("pencil", "a"), ("apple", "an"), ("egg", "an")]


# ============================================================ coloring pages
def build_coloring():
    css = f"""
.sheet{{padding:12mm;}}
.top{{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5mm;}}
.top .aa{{font-size:24pt;font-weight:700;font-family:{FONT};color:{BORDER};}}
.top .nm{{font-size:12pt;color:#555;font-family:{FONT};}}
.cgrid{{display:grid;grid-template-columns:repeat(2,1fr);gap:7mm;}}
.citem{{border:0.4mm dashed #d1d5db;border-radius:3mm;padding:5mm 3mm 3mm;text-align:center;
  display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:118mm;}}
.cap{{font-size:16pt;font-weight:700;font-family:{FONT};color:{INK};margin-top:2mm;}}
.cap .an{{color:{BORDER};}}
.star{{display:flex;flex-direction:column;align-items:center;justify-content:center;height:250mm;}}
.star .cap{{font-size:24pt;}}
"""
    def item(noun, art):
        a = f"<span class='an'>{art}</span>" if art == "an" else art
        return (f"<div class='citem'>{shape_svg(noun, 62)}"
                f"<div class='cap'>{a} {noun}</div></div>")

    pages = []
    for i in range(0, 8, 4):
        cells = "".join(item(n, a) for n, a in ART_WORDS[i:i + 4])
        pages.append("<div class='page sheet'>"
                     "<div class='top'><div class='aa'>Aa &middot; Color</div>"
                     "<div class='nm'>name ______________________</div></div>"
                     f"<div class='cgrid'>{cells}</div></div>")
    # the star gets a full page
    pages.append("<div class='page sheet'><div class='star'>"
                 + shape_svg("potato", 130, stroke=2.2)
                 + "<div class='cap'>It's a POTATO!</div></div></div>")
    write("pack_coloring.html", doc(css, "".join(pages)))


# ========================================================== word-pic matching
def build_matching():
    css = f"""
.sheet{{padding:14mm 16mm;}}
.top{{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2mm;}}
.top .aa{{font-size:24pt;font-weight:700;font-family:{FONT};color:{BORDER};}}
.top .nm{{font-size:12pt;color:#555;font-family:{FONT};}}
.instr{{font-size:12pt;color:#666;font-family:{FONT};margin-bottom:4mm;}}
.match{{display:flex;justify-content:space-between;}}
.wcol,.pcol{{display:flex;flex-direction:column;justify-content:space-between;height:238mm;}}
.wrow{{display:flex;align-items:center;gap:5mm;font-family:{FONT};font-weight:700;
  font-size:24pt;color:{INK};height:38mm;}}
.prow{{display:flex;align-items:center;gap:5mm;height:38mm;}}
.dot{{width:4mm;height:4mm;border-radius:50%;background:{BORDER};flex-shrink:0;}}
"""
    words = ["apple", "cup", "chair", "egg", "pencil", "book"]
    pics = ["pencil", "egg", "book", "apple", "cup", "chair"]   # fixed shuffle
    wcol = "".join(f"<div class='wrow'>{w}<div class='dot'></div></div>" for w in words)
    pcol = "".join(f"<div class='prow'><div class='dot'></div>{shape_svg(p, 30)}</div>" for p in pics)
    body = ("<div class='page sheet'>"
            "<div class='top'><div class='aa'>Aa &middot; Match</div>"
            "<div class='nm'>name ______________________</div></div>"
            "<div class='instr'>Draw a line from the word to the picture.</div>"
            f"<div class='match'><div class='wcol'>{wcol}</div><div class='pcol'>{pcol}</div></div>"
            "</div>")
    write("pack_matching.html", doc(css, body))


# ================================================================ vowel wall
def build_vowel_wall():
    css = f"""
.v{{display:flex;flex-direction:column;align-items:center;justify-content:center;height:29.7cm;}}
.vl{{font-size:170mm;font-weight:700;font-family:{FONT};color:{BLUE};line-height:1;}}
.vc{{font-size:14pt;color:#999;letter-spacing:6px;font-family:system-ui;margin-top:4mm;}}
"""
    pages = "".join(f"<div class='page v'><div class='vl'>{v}</div><div class='vc'>VOWEL</div></div>"
                    for v in "aeiou")
    write("pack_vowelwall.html", doc(css, pages))


build_three_part()
build_sentence_match()
build_bingo()
build_dictionary()
build_worksheet()
build_coloring()
build_matching()
build_vowel_wall()
print("PACK HTML DONE (house formats)")
