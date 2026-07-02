#!/usr/bin/env python3
"""Week 2 printable pack — house formats (see build_week01_pack.py provenance).
3-part cards (locations) · sentence match · bingo (6 boards + duplex calling) ·
letter-t worksheet · coloring · matching · dictionary journal ('at' row 1) ·
t / not-t sort labels · THE BIG MAP (drawn SVG, color + colorable, A3).

Usage: python3 build_week02_pack.py "/path/to/Week 02"
"""
import os
import random
import sys

BASE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))

BORDER = "#2D5A27"
INK = "#1f2937"
FONT = "'Comic Sans MS', 'Comic Sans', cursive"

A4W, A4H = 21.0, 29.7
PAD, RAD = 0.5, 0.4
S = 7.5
LABEL_H = max(2.0, round(S * 0.32, 1))
CONTROL_H = S + LABEL_H
COLS = int(A4W // S)
PIC_ROWS = int(A4H // S)
CTRL_ROWS = max(1, int((A4H + 0.001) // CONTROL_H))
LABEL_ROWS = int(A4H // LABEL_H)
FONT_PT = max(12, min(36, round(S * 3.2)))
STRIP_H, STRIP_W = 6.5, A4W
PIC = STRIP_H
SENT_W = STRIP_W - PIC
GAP = PAD * 2
STRIPS_PER_PAGE = int(A4H // STRIP_H)
PICCOLS, PICROWS = int(A4W // PIC), int(A4H // PIC)

# (image, 3-part label, sentence)
WORDS = [
    ("01-park.png", "park", "She's at the park."),
    ("02-school.png", "school", "She's at school."),
    ("03-mall.png", "mall", "She's at the mall."),
    ("04-police.png", "police station", "She's at the police station."),
    ("05-zoo.png", "zoo", "She's at the zoo."),
    ("06-busstop.png", "bus stop", "She's at the bus stop."),
    ("07-supermarket.png", "supermarket", "She's at the supermarket."),
    ("08-home.png", "home", "She's at home."),
]
T_WORDS = [("10-turtle.png", "turtle"), ("11-tiger.png", "tiger"), ("12-tomato.png", "tomato"),
           ("13-taxi.png", "taxi"), ("14-teddy.png", "teddy"), ("15-towel.png", "towel"),
           ("16-toothbrush.png", "toothbrush")]
IMG = {w: i for i, w, _ in WORDS}
IMG.update({w: i for i, w in T_WORDS})
IMG["potato"] = "18-potato.png"

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
.grid-ctrl{{grid-auto-rows:{CONTROL_H}cm;margin-left:{(A4W - S * COLS) / 2}cm;margin-top:0.5cm;}}
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
  padding:0.2cm 0.3cm;border-radius:{RAD}cm;line-height:1.1;}}
.lab.small{{font-size:17pt;}}
.card-lab .lab{{flex:1;height:auto;}}
"""
    def small(n):
        return " small" if len(n) > 9 else ""

    ctrl = [(f"<div class='card card-ctrl'><div class='img'><img src='images/{i}'></div>"
             f"<div class='lab{small(n)}'>{n}</div></div>") for i, n, _ in WORDS]
    pic = [f"<div class='card card-pic'><div class='img'><img src='images/{i}'></div></div>" for i, n, _ in WORDS]
    lab = [f"<div class='card card-lab'><div class='lab{small(n)}'>{n}</div></div>" for i, n, _ in WORDS]
    pages = []
    for cards, cls, per in ((ctrl, "grid-ctrl", COLS * 2), (pic, "grid-pic", COLS * PIC_ROWS),
                            (lab, "grid-lab", COLS * LABEL_ROWS)):
        for i in range(0, len(cards), per):
            pages.append(f"<div class='page'><div class='grid {cls}'>{''.join(cards[i:i + per])}</div></div>")
    write("pack_threepart.html", doc(css, "".join(pages)))


# ============================================================ sentence match
def uniform_strip_font(sentences, base_pt, text_w_cm, text_h_cm):
    iw, ih = (text_w_cm - 0.4) * 28.35, (text_h_cm - 0.3) * 28.35
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


def build_sentence_match():
    sentences = [s for _, _, s in WORDS]
    text_w = STRIP_W - PAD * 2 - GAP - PIC
    fpt = uniform_strip_font(sentences, 72, text_w, STRIP_H - PAD * 2)
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
    controls = [(f"<div class='sc'><div class='txt'>{s}</div>"
                 f"<div class='pimg'><img src='images/{i}'></div></div>") for i, _, s in WORDS]
    pics = [f"<div class='pc'><div class='pci'><img src='images/{i}'></div></div>" for i, _, _ in WORDS]
    sents = [f"<div class='ss'><div class='txt'>{s}</div></div>" for _, _, s in WORDS]
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
    pool = [n for _, n, _ in WORDS] + [n for _, n in T_WORDS] + ["potato"]  # 16
    BW, CW = 0.60, 0.56
    css = f"""
.hdr{{text-align:center;height:18mm;margin:8mm 0 4mm;overflow:hidden;}}
.hdr h2{{font-size:26px;color:{INK};font-family:'Nunito',system-ui,sans-serif;font-weight:700;
  line-height:1.1;white-space:nowrap;}}
.hdr p{{font-size:12px;color:#999;margin-top:3px;line-height:1.2;white-space:nowrap;}}
.bgrid{{display:grid;grid-template-columns:repeat(4,1fr);width:190mm;margin:0 auto;
  background:{BORDER};padding:{BW}cm;gap:{BW}cm;border-radius:{RAD}cm;}}
.bcell{{aspect-ratio:1;display:flex;flex-direction:column;overflow:hidden;background:white;}}
.bcell img{{width:100%;flex:1;object-fit:cover;display:block;min-height:0;}}
.bcell .w{{font-size:12.5pt;font-weight:700;font-family:{FONT};color:{INK};
  padding:2px 0;text-align:center;flex-shrink:0;line-height:1.2;}}
.cgrid{{display:grid;grid-template-columns:repeat(3,1fr);width:190mm;margin:0 auto;gap:0;}}
.ccard{{aspect-ratio:1;background:{BORDER};padding:{CW}cm;border-radius:{RAD}cm;
  display:flex;flex-direction:column;}}
.cin{{background:white;flex:1;display:flex;align-items:center;justify-content:center;
  overflow:hidden;border-radius:{RAD}cm;}}
.cin img{{width:100%;height:100%;object-fit:cover;display:block;}}
.cw{{font-size:26pt;font-weight:700;font-family:{FONT};color:{INK};text-align:center;line-height:1.15;}}
"""
    def bcell(n):
        return (f"<div class='bcell'><img src='images/{IMG[n]}'>"
                f"<div class='w'>{n}</div></div>")

    random.seed(2026)
    pages = []
    for b in range(6):
        picks = random.sample(pool, 16)
        pages.append("<div class='page'>"
                     f"<div class='hdr'><h2>t &middot; BINGO</h2><p>Board #{b + 1} &middot; single-sided &middot; name ____________________</p></div>"
                     f"<div class='bgrid'>{''.join(bcell(n) for n in picks)}</div></div>")

    SPACER = "__SP__"

    def front(n):
        if n == SPACER:
            return "<div class='ccard' style='visibility:hidden'></div>"
        return f"<div class='ccard'><div class='cin'><img src='images/{IMG[n]}'></div></div>"

    def back(n):
        if n == SPACER:
            return "<div class='ccard' style='visibility:hidden'></div>"
        return f"<div class='ccard'><div class='cin'><span class='cw'>{n}</span></div></div>"

    chunks = [pool[0:9], pool[9:16]]
    for pi, items in enumerate(chunks):
        rows = [items[i:i + 3] for i in range(0, len(items), 3)]
        rows = [r + [SPACER] * (3 - len(r)) for r in rows]
        fronts = "".join(front(n) for r in rows for n in r)
        backs = "".join(back(n) for r in rows for n in reversed(r))
        pages.append("<div class='page'>"
                     "<div class='hdr'><h2>t &middot; BINGO &mdash; Calling Cards</h2>"
                     f"<p>Picture Side &middot; Page {pi + 1} of {len(chunks)} &middot; Print duplex, flip on short edge</p></div>"
                     f"<div class='cgrid'>{fronts}</div></div>")
        pages.append("<div class='page'>"
                     "<div class='hdr'><h2>t &middot; BINGO &mdash; Calling Cards</h2>"
                     f"<p>Word Side (mirror-printed for duplex) &middot; Page {pi + 1} of {len(chunks)}</p></div>"
                     f"<div class='cgrid'>{backs}</div></div>")
    write("pack_bingo.html", doc(css, "".join(pages)))


# ===================================================== line-art (SVG shapes)
SHAPES = {
    "turtle": ("<path d='M22 62 C22 36 78 36 78 62 Z'/><line x1='16' y1='62' x2='84' y2='62'/>"
               "<circle cx='88' cy='56' r='7'/><line x1='30' y1='62' x2='27' y2='74'/>"
               "<line x1='44' y1='62' x2='42' y2='76'/><line x1='58' y1='62' x2='58' y2='76'/>"
               "<line x1='70' y1='62' x2='73' y2='74'/><path d='M16 62 L10 56'/>"
               "<path d='M35 48 C40 42 60 42 65 48'/><line x1='50' y1='40' x2='50' y2='62'/>", "0 0 100 84"),
    "tiger": ("<circle cx='50' cy='34' r='19'/><circle cx='35' cy='19' r='6'/><circle cx='65' cy='19' r='6'/>"
              "<circle cx='43' cy='30' r='2'/><circle cx='57' cy='30' r='2'/>"
              "<path d='M46 40 C48 43 52 43 54 40'/><line x1='50' y1='36' x2='50' y2='40'/>"
              "<line x1='47' y1='16' x2='49' y2='23'/><line x1='53' y1='16' x2='51' y2='23'/>"
              "<line x1='31' y1='32' x2='38' y2='33'/><line x1='69' y1='32' x2='62' y2='33'/>"
              "<path d='M35 52 L32 90 L68 90 L65 52'/><line x1='36' y1='62' x2='64' y2='62'/>"
              "<line x1='35' y1='72' x2='65' y2='72'/><path d='M68 70 C80 68 82 56 76 52'/>", "0 0 100 100"),
    "tomato": ("<circle cx='50' cy='62' r='30'/><line x1='50' y1='32' x2='50' y2='22'/>"
               "<path d='M50 34 L38 26'/><path d='M50 34 L62 26'/><path d='M50 34 L44 22'/><path d='M50 34 L56 22'/>",
               "0 0 100 100"),
    "taxi": ("<rect x='12' y='48' width='76' height='18' rx='5'/>"
             "<path d='M28 48 L36 32 L66 32 L74 48'/><line x1='51' y1='32' x2='51' y2='48'/>"
             "<circle cx='30' cy='68' r='8'/><circle cx='70' cy='68' r='8'/>"
             "<rect x='42' y='22' width='18' height='10' rx='2'/>", "0 0 100 84"),
    "teddy": ("<circle cx='50' cy='28' r='14'/><circle cx='38' cy='17' r='6'/><circle cx='62' cy='17' r='6'/>"
              "<circle cx='45' cy='26' r='1.7'/><circle cx='55' cy='26' r='1.7'/>"
              "<ellipse cx='50' cy='33' rx='5' ry='4'/>"
              "<ellipse cx='50' cy='63' rx='18' ry='21'/><ellipse cx='50' cy='66' rx='9' ry='11'/>"
              "<path d='M32 55 C22 58 20 68 26 72'/><path d='M68 55 C78 58 80 68 74 72'/>"
              "<ellipse cx='38' cy='86' rx='8' ry='6'/><ellipse cx='62' cy='86' rx='8' ry='6'/>", "0 0 100 100"),
    "toothbrush": ("<rect x='44' y='28' width='12' height='66' rx='5'/>"
                   "<rect x='42' y='6' width='16' height='24' rx='4'/>"
                   "<line x1='45' y1='11' x2='55' y2='11'/><line x1='45' y1='16' x2='55' y2='16'/>"
                   "<line x1='45' y1='21' x2='55' y2='21'/>", "0 0 100 100"),
    "house": ("<rect x='25' y='50' width='50' height='40'/><path d='M18 52 L50 20 L82 52'/>"
              "<rect x='44' y='66' width='14' height='24'/><rect x='31' y='58' width='10' height='10'/>", "0 0 100 100"),
    "swing": ("<line x1='24' y1='90' x2='40' y2='22'/><line x1='76' y1='90' x2='60' y2='22'/>"
              "<line x1='36' y1='24' x2='64' y2='24'/><line x1='45' y1='24' x2='45' y2='60'/>"
              "<line x1='57' y1='24' x2='57' y2='60'/><rect x='41' y='60' width='20' height='5' rx='2'/>", "0 0 100 100"),
    "school": ("<rect x='18' y='44' width='64' height='44'/><path d='M12 46 L50 18 L88 46'/>"
               "<rect x='43' y='64' width='14' height='24'/><rect x='26' y='52' width='10' height='10'/>"
               "<rect x='64' y='52' width='10' height='10'/><line x1='50' y1='18' x2='50' y2='4'/>"
               "<path d='M50 4 L64 8 L50 12'/>", "0 0 100 100"),
    "zoogate": ("<rect x='18' y='42' width='12' height='48'/><rect x='70' y='42' width='12' height='48'/>"
                "<path d='M18 46 C30 18 70 18 82 46'/><line x1='40' y1='34' x2='40' y2='90'/>"
                "<line x1='50' y1='31' x2='50' y2='90'/><line x1='60' y1='34' x2='60' y2='90'/>", "0 0 100 100"),
    "attiles": ("<rect x='10' y='28' width='36' height='44' rx='5'/><rect x='54' y='28' width='36' height='44' rx='5'/>"
                f"<text x='28' y='60' font-size='30' font-weight='bold' text-anchor='middle' "
                f"fill='{BORDER}' stroke='none' font-family=\"Comic Sans MS\">a</text>"
                f"<text x='72' y='60' font-size='30' font-weight='bold' text-anchor='middle' "
                f"fill='{BORDER}' stroke='none' font-family=\"Comic Sans MS\">t</text>", "0 0 100 100"),
}


def shape_svg(name, width_mm, stroke=2.5):
    inner, vb = SHAPES[name]
    return (f"<svg width='{width_mm}mm' viewBox='{vb}' fill='none' stroke='{BORDER}' "
            f"stroke-width='{stroke}' stroke-linecap='round' stroke-linejoin='round' "
            f"xmlns='http://www.w3.org/2000/svg'>{inner}</svg>")


# ================================================================= worksheet
def svg_letter_t(width_mm, guides=False, band="#d1d5db"):
    """Stroke-band lowercase 't': tall stem (48,14)->(48,78) curving to (62,86), crossbar y=36."""
    g = ""
    if guides:
        g = ("<defs><marker id='ah' viewBox='0 0 10 10' refX='8' refY='5' "
             "markerWidth='4.6' markerHeight='4.6' orient='auto-start-reverse'>"
             f"<path d='M0 0 L10 5 L0 10 z' fill='{BORDER}'/></marker></defs>"
             f"<path d='M48 22 L48 62' fill='none' stroke='{BORDER}' stroke-width='2.6' marker-end='url(#ah)'/>"
             f"<path d='M30 36 L58 36' fill='none' stroke='{BORDER}' stroke-width='2.6' marker-end='url(#ah)'/>"
             f"<circle cx='48' cy='14' r='4.6' fill='{BORDER}'/>"
             f"<text x='58' y='16' font-size='11' font-weight='bold' fill='{BORDER}' font-family='system-ui'>1</text>"
             f"<text x='18' y='40' font-size='11' font-weight='bold' fill='{BORDER}' font-family='system-ui'>2</text>")
    dot = "" if guides else f"<circle cx='48' cy='14' r='4' fill='{BORDER}'/>"
    return (f"<svg width='{width_mm}mm' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>"
            f"<path d='M48 14 L48 74 C48 84 56 87 64 84' fill='none' stroke='{band}' "
            "stroke-width='11' stroke-linecap='round'/>"
            f"<line x1='32' y1='36' x2='66' y2='36' stroke='{band}' stroke-width='11' stroke-linecap='round'/>"
            + g + dot + "</svg>")


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
.trrow svg{{display:block;margin-bottom:-1.5mm;}}
.svgrow{{display:flex;justify-content:space-around;align-items:flex-end;margin-top:5mm;}}
.svgrow .cap{{font-size:13pt;font-family:{FONT};font-weight:700;color:{INK};text-align:center;margin-top:2mm;}}
"""
    row = (svg_letter_t(21, band="#9ca3af")
           + "".join(svg_letter_t(21).replace(
               f"<circle cx='48' cy='14' r='4' fill='{BORDER}'/>", "") for _ in range(5)))
    body = ("<div class='page sheet'>"
            "<div class='top'><div class='aa'>Tt</div><div class='nm'>name ______________________</div></div>"
            "<div class='instr'>Start at the green dot. 1 &mdash; down. 2 &mdash; across.</div>"
            f"<div class='bigletter'>{svg_letter_t(74, guides=True)}</div>"
            "<div class='instr'>Trace.</div>"
            f"<div class='trrow'>{row}</div>"
            f"<div class='trrow'>{row}</div>"
            "<div class='instr'>Color.</div>"
            "<div class='svgrow'>"
            f"<div>{shape_svg('tomato', 34)}<div class='cap'>a tomato</div></div>"
            f"<div>{shape_svg('taxi', 38)}<div class='cap'>a taxi</div></div>"
            f"<div>{shape_svg('turtle', 40)}<div class='cap'>a turtle</div></div>"
            "</div></div>")
    write("pack_worksheet.html", doc(css, body))


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
.star{{display:flex;flex-direction:column;align-items:center;justify-content:center;height:250mm;}}
.star .cap{{font-size:24pt;font-weight:700;font-family:{FONT};color:{INK};margin-top:4mm;}}
"""
    def item(n, cap):
        return f"<div class='citem'>{shape_svg(n, 60)}<div class='cap'>{cap}</div></div>"

    p1 = "".join([item("turtle", "a turtle"), item("tomato", "a tomato"),
                  item("taxi", "a taxi"), item("swing", "the park")])
    p2 = "".join([item("teddy", "a teddy"), item("toothbrush", "a toothbrush"),
                  item("house", "home"), item("school", "school")])
    pages = []
    for cells in (p1, p2):
        pages.append("<div class='page sheet'>"
                     "<div class='top'><div class='aa'>Tt &middot; Color</div>"
                     "<div class='nm'>name ______________________</div></div>"
                     f"<div class='cgrid'>{cells}</div></div>")
    pages.append("<div class='page sheet'><div class='star'>"
                 + shape_svg("tiger", 120, stroke=2.2)
                 + "<div class='cap'>It's a tiger!</div></div></div>")
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
  font-size:23pt;color:{INK};height:38mm;}}
.prow{{display:flex;align-items:center;gap:5mm;height:38mm;}}
.dot{{width:4mm;height:4mm;border-radius:50%;background:{BORDER};flex-shrink:0;}}
"""
    words = ["taxi", "turtle", "teddy", "tomato", "home", "toothbrush"]
    pics = [("toothbrush", 24), ("tomato", 28), ("taxi", 32), ("home", 28), ("turtle", 32), ("teddy", 28)]
    pmap = {"home": "house"}
    wcol = "".join(f"<div class='wrow'>{w}<div class='dot'></div></div>" for w in words)
    pcol = "".join(f"<div class='prow'><div class='dot'></div>{shape_svg(pmap.get(p, p), sz)}</div>"
                   for p, sz in pics)
    body = ("<div class='page sheet'>"
            "<div class='top'><div class='aa'>Tt &middot; Match</div>"
            "<div class='nm'>name ______________________</div></div>"
            "<div class='instr'>Draw a line from the word to the picture.</div>"
            f"<div class='match'><div class='wcol'>{wcol}</div><div class='pcol'>{pcol}</div></div>"
            "</div>")
    write("pack_matching.html", doc(css, body))


# ================================================================ dictionary
def build_dictionary():
    css = f"""
.sheet{{padding:12mm 14mm;}}
.top{{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2mm;}}
.top .aa{{font-size:24pt;font-weight:700;font-family:{FONT};color:{BORDER};}}
.top .t{{font-size:11pt;color:#999;letter-spacing:3px;font-family:system-ui;}}
.top .nm{{font-size:11pt;color:#555;font-family:{FONT};}}
.drow{{display:flex;align-items:center;gap:6mm;height:48mm;border-bottom:0.3mm dashed #e5e7eb;}}
.dpic{{width:36mm;flex-shrink:0;text-align:center;}}
.dpic .cap{{font-size:10.5pt;font-family:{FONT};font-weight:700;color:{INK};margin-top:1mm;}}
.lines{{position:relative;flex:1;height:24mm;}}
.l-top{{position:absolute;left:0;right:0;top:0;border-top:0.35mm solid #d1d5db;}}
.l-mid{{position:absolute;left:0;right:0;top:8mm;border-top:0.35mm dashed #c9c9c9;}}
.l-base{{position:absolute;left:0;right:0;top:16mm;border-top:0.45mm solid #9ca3af;}}
.trace{{position:absolute;left:4mm;top:16mm;transform:translateY(-84%);
  font-family:{FONT};font-weight:700;font-size:15mm;line-height:1;color:#d1d5db;letter-spacing:1mm;}}
"""
    entries = [("attiles", "at", "at"), ("swing", "the park", "park"), ("school", "school", "school"),
               ("zoogate", "the zoo", "zoo"), ("house", "home", "home"),
               ("taxi", "a taxi", "taxi"), ("tiger", "a tiger", "tiger"),
               ("turtle", "a turtle", "turtle"), ("teddy", "a teddy", "teddy")]

    def row(icon, cap, trace):
        return ("<div class='drow'>"
                f"<div class='dpic'>{shape_svg(icon, 28)}<div class='cap'>{cap}</div></div>"
                "<div class='lines'><div class='l-top'></div><div class='l-mid'></div>"
                f"<div class='l-base'></div><div class='trace'>{trace}</div></div>"
                "</div>")

    def header():
        return ("<div class='top'><div class='aa'>Tt</div>"
                "<div class='t'>MY DICTIONARY &middot; WEEK 2</div>"
                "<div class='nm'>name ____________________</div></div>")

    p1 = "".join(row(*e) for e in entries[:5])
    p2 = "".join(row(*e) for e in entries[5:])
    write("pack_dictionary.html", doc(css,
          f"<div class='page sheet'>{header()}{p1}</div><div class='page sheet'>{header()}{p2}</div>"))


# ============================================================== t / not-t sort
def build_sort_labels():
    css = f"""
.sheet{{padding:14mm;display:flex;flex-direction:column;gap:8mm;}}
.instr{{font-size:12pt;color:#666;font-family:{FONT};text-align:center;}}
.lbl{{flex:1;border:1.2mm solid {BORDER};border-radius:6mm;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:4mm;}}
.lbl .big{{font-size:64pt;font-weight:700;font-family:{FONT};color:{BORDER};line-height:1;}}
.lbl .s{{font-size:16pt;font-family:{FONT};font-weight:700;color:{INK};}}
.lbl.no .big{{color:#9ca3af;text-decoration:line-through;text-decoration-color:#e11d48;
  text-decoration-thickness:3mm;}}
"""
    body = ("<div class='page sheet'>"
            "<div class='instr'>Cut the two labels. The sorting game: does it begin with /t/? "
            "Use the t calling cards (YES) + Week 1 cards (NO).</div>"
            "<div class='lbl'><div class='big'>t</div><div class='s'>yes &mdash; it begins with t</div></div>"
            "<div class='lbl no'><div class='big'>t</div><div class='s'>no &mdash; not t</div></div>"
            "</div>")
    write("pack_sortlabels.html", doc(css, body))


# ==================================================================== the map
def build_map():
    """The Big Map — drawn, not generated. A3 landscape, 2 pages: color + colorable."""
    def landmark(kind, P):
        f, st = P["fill"], P["stroke"]
        def c(color):
            return "white" if P["bw"] else color
        if kind == "park":
            return (f"<ellipse cx='55' cy='78' rx='52' ry='14' fill='{c('#bfe3b0')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='18' y='38' width='9' height='40' fill='{c('#a5713f')}' stroke='{st}' stroke-width='2'/>"
                    f"<circle cx='22' cy='28' r='17' fill='{c('#7fbf6a')}' stroke='{st}' stroke-width='2'/>"
                    f"<path d='M62 22 L92 70 L62 70 Z' fill='{c('#f2b54a')}' stroke='{st}' stroke-width='2'/>"
                    f"<line x1='62' y1='22' x2='62' y2='70' stroke='{st}' stroke-width='2'/>")
        if kind == "school":
            return (f"<rect x='8' y='34' width='90' height='48' fill='{c('#f2c94c')}' stroke='{st}' stroke-width='2'/>"
                    f"<path d='M2 36 L53 8 L104 36 Z' fill='{c('#d96a4b')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='44' y='56' width='18' height='26' fill='{c('#8a5a33')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='17' y='44' width='14' height='13' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='75' y='44' width='14' height='13' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<line x1='53' y1='8' x2='53' y2='-8' stroke='{st}' stroke-width='2'/>"
                    f"<path d='M53 -8 L72 -3 L53 2 Z' fill='{c('#e04f4f')}' stroke='{st}' stroke-width='2'/>")
        if kind == "mall":
            return (f"<rect x='2' y='26' width='104' height='56' fill='{c('#b9a7e0')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='40' y='52' width='28' height='30' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<line x1='54' y1='52' x2='54' y2='82' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='10' y='36' width='88' height='9' fill='{c('#8e77c9')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='12' y='54' width='16' height='12' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='80' y='54' width='16' height='12' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>")
        if kind == "police":
            return (f"<rect x='6' y='30' width='96' height='52' fill='{c('#9fb9d8')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='6' y='42' width='96' height='11' fill='{c('#3763a8')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='44' y='58' width='20' height='24' fill='{c('#37517a')}' stroke='{st}' stroke-width='2'/>"
                    f"<path d='M54 12 L58 22 L69 22 L60 29 L64 40 L54 33 L44 40 L48 29 L39 22 L50 22 Z' "
                    f"fill='{c('#f2c94c')}' stroke='{st}' stroke-width='2'/>")
        if kind == "zoo":
            return (f"<rect x='8' y='40' width='13' height='42' fill='{c('#a5713f')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='87' y='40' width='13' height='42' fill='{c('#a5713f')}' stroke='{st}' stroke-width='2'/>"
                    f"<path d='M8 46 C28 14 80 14 100 46' fill='none' stroke='{st}' stroke-width='4'/>"
                    f"<line x1='38' y1='30' x2='38' y2='82' stroke='{st}' stroke-width='2.5'/>"
                    f"<line x1='54' y1='26' x2='54' y2='82' stroke='{st}' stroke-width='2.5'/>"
                    f"<line x1='70' y1='30' x2='70' y2='82' stroke='{st}' stroke-width='2.5'/>"
                    f"<rect x='73' y='34' width='9' height='34' rx='4' fill='{c('#f2c94c')}' stroke='{st}' stroke-width='2' transform='rotate(14 77 51)'/>"
                    f"<ellipse cx='86' cy='30' rx='8' ry='6' fill='{c('#f2c94c')}' stroke='{st}' stroke-width='2'/>"
                    f"<circle cx='80' cy='46' r='2' fill='{st}'/><circle cx='76' cy='56' r='2' fill='{st}'/>")
        if kind == "busstop":
            return (f"<line x1='20' y1='18' x2='20' y2='82' stroke='{st}' stroke-width='3'/>"
                    f"<circle cx='20' cy='14' r='9' fill='{c('#e04f4f')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='34' y='38' width='70' height='34' rx='8' fill='{c('#f2c94c')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='40' y='44' width='13' height='11' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='58' y='44' width='13' height='11' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='76' y='44' width='13' height='11' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<circle cx='50' cy='74' r='7' fill='{c('#555555')}' stroke='{st}' stroke-width='2'/>"
                    f"<circle cx='88' cy='74' r='7' fill='{c('#555555')}' stroke='{st}' stroke-width='2'/>")
        if kind == "supermarket":
            return (f"<rect x='4' y='34' width='100' height='48' fill='{c('#efe3c8')}' stroke='{st}' stroke-width='2'/>"
                    + "".join(
                        f"<path d='M{4 + i * 20} 34 L{14 + i * 20} 22 L{24 + i * 20} 34 Z' "
                        f"fill='{c('#e04f4f') if i % 2 == 0 else c('#f7f4ec')}' stroke='{st}' stroke-width='2'/>"
                        for i in range(5))
                    + f"<rect x='42' y='56' width='24' height='26' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='10' y='56' width='16' height='12' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='82' y='56' width='16' height='12' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>")
        if kind == "home":
            return (f"<rect x='16' y='42' width='76' height='40' fill='{c('#f7e9c8')}' stroke='{st}' stroke-width='2'/>"
                    f"<path d='M8 44 L54 12 L100 44 Z' fill='{c('#d96a4b')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='46' y='58' width='16' height='24' fill='{c('#8a5a33')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='24' y='52' width='12' height='12' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>"
                    f"<rect x='72' y='52' width='12' height='12' fill='{c('#cfe8f7')}' stroke='{st}' stroke-width='2'/>")
        return ""

    def render(bw):
        P = {"bw": bw, "fill": "white", "stroke": "#10331f"}
        bg = "white" if bw else "#e9f4e7"
        road_fill = "white" if bw else "#d8d0bd"
        pad_fill = "white" if bw else "#f2c94c"
        # stations: (kind, label, landmark x, y, pad x, y)
        stations = [
            ("park", "the park", 150, 40, 205, 176),
            ("school", "school", 366, 34, 420, 176),
            ("mall", "the mall", 580, 40, 635, 176),
            ("police", "POLICE2LINE", 716, 246, 690, 301),
            ("zoo", "the zoo", 580, 458, 635, 426),
            ("busstop", "the bus stop", 366, 458, 420, 426),
            ("supermarket", "the supermarket", 150, 458, 205, 426),
            ("home", "home", 18, 246, 150, 301),
        ]
        out = [f"<svg width='420mm' height='297mm' viewBox='0 0 840 594' xmlns='http://www.w3.org/2000/svg'>"
               f"<rect width='840' height='594' fill='{bg}'/>"]
        # the loop road
        out.append(f"<rect x='150' y='176' width='540' height='250' rx='80' fill='none' "
                   f"stroke='{road_fill}' stroke-width='44'/>")
        out.append(f"<rect x='150' y='176' width='540' height='250' rx='80' fill='none' "
                   f"stroke='#10331f' stroke-width='2' opacity='0.5'/>")
        out.append("<rect x='150' y='176' width='540' height='250' rx='80' fill='none' "
                   "stroke='white' stroke-width='3' stroke-dasharray='16 14'/>")
        for kind, label, lx, ly, px, py in stations:
            out.append(f"<circle cx='{px}' cy='{py}' r='17' fill='{pad_fill}' stroke='#10331f' stroke-width='2.5'/>")
            out.append(f"<g transform='translate({lx},{ly})'>{landmark(kind, P)}</g>")
            tx, ty = lx + 54, ly + 108
            if label == "POLICE2LINE":
                out.append(f"<text x='{tx}' y='{ty}' font-size='24' font-weight='bold' text-anchor='middle' "
                           f"fill='#10331f' font-family='Comic Sans MS'>"
                           f"<tspan x='{tx}' dy='0'>the police</tspan>"
                           f"<tspan x='{tx}' dy='26'>station</tspan></text>")
            else:
                out.append(f"<text x='{tx}' y='{ty}' font-size='24' font-weight='bold' text-anchor='middle' "
                           f"fill='#10331f' font-family='Comic Sans MS'>{label}</text>")
        # center title
        out.append("<text x='420' y='296' font-size='30' font-weight='bold' text-anchor='middle' "
                   "fill='#10331f' opacity='0.75' font-family='Comic Sans MS'>Where is Segina?</text>")
        out.append("<text x='420' y='326' font-size='18' text-anchor='middle' "
                   "fill='#10331f' opacity='0.5' font-family='Comic Sans MS'>She's at ...</text>")
        out.append("</svg>")
        return "".join(out)

    css = """
@page{size:420mm 297mm;margin:0;}
.mpage{width:420mm;height:297mm;page-break-after:always;overflow:hidden;}
.mpage:last-child{page-break-after:auto;}
"""
    body = (f"<div class='mpage'>{render(False)}</div>"
            f"<div class='mpage'>{render(True)}</div>")
    write("pack_map.html", doc(css, body))


build_three_part()
build_sentence_match()
build_bingo()
build_worksheet()
build_coloring()
build_matching()
build_dictionary()
build_sort_labels()
build_map()
print("WEEK 2 PACK HTML DONE")
