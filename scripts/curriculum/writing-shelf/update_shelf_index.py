#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · the INDEX, RECOMPUTED

manifest.json's page counts, byte sizes and stock block and PRINT-GUIDE.html's
stock strip were hand-typed, which is why they drifted from the PDFs more than
once.  Nothing here is typed: every `pages` is read off the finished PDF, every
`bytes` is its size on disk, and the six stock figures are DERIVED from the
items by the same arithmetic the summary has always implied —

    Printables      one a listed item, less the 01b A3 alternative
    Printed sides   the sum of every item's pages
    Duplex sides    the same sum over the duplex items
    Sheets of paper simplex sides + half the duplex sides
    Risky duplex    duplex jobs of more than one sheet (pages > 2)
    Laminated       items with any laminate instruction at all

The PROSE for a new sheet lives in NEW_ITEMS below and is written once; the
numbers in it are never written at all.  Run this after any build in
public/dark-phonics-shelf/v2/ and it is idempotent.

Run:   python3 scripts/curriculum/writing-shelf/update_shelf_index.py
"""

import json
import re
import sys
from pathlib import Path

import pikepdf

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
V2 = REPO / "public" / "dark-phonics-shelf" / "v2"
MANIFEST = V2 / "manifest.json"
GUIDE = V2 / "PRINT-GUIDE.html"

E = "&#8212;"        # em dash
N = "&#160;"         # nbsp
X = "&#215;"         # multiplication sign
RA = "&#8594;"       # right arrow


# --------------------------------------------------------------- new items --
NEW_ITEMS = [
    {
        "n": 25, "letter": "X", "slug": "digraph-work", "tray": 5,
        "title": "Digraph work mats ×5 + control ×5 + tabs — "
                 "the sound is a GAP one tab wide",
        "file": "25-digraph-mats.pdf",
        "files": ["25-digraph-mats.pdf", "25-digraph-mats-control.pdf",
                  "25-digraph-tabs.pdf"],
        "paper": "Mats and control: A4 landscape, plain 100–120 gsm paper. "
                 "Tabs: A4 portrait, 250 gsm card",
        "duplex": False, "laminate": "the tab sheet only",
        "cut": "The MATS AND THE CONTROL ARE NEVER CUT and never laminated — "
               "there is no cut line on either of them, the tabs are laid on "
               "them and lifted off them all day, and a laminated mat slides "
               "under a child's hand. The TAB SHEET cuts once, sheet L's "
               "standard exactly: one full-width grey hairline at every strip "
               "boundary frees the strip above and the strip below at one "
               "stroke, and every vertical inside a strip is a 2 mm tick at a "
               "tab edge. Every tab comes off 28 mm tall.",
        "howToPrint": "Print the five mats and the five control pages SINGLE-"
                      "SIDED at 100%, A4 LANDSCAPE, on plain paper — one "
                      "group a page, in order. Print the five tab pages single-"
                      "sided at 100%, A4 PORTRAIT, onto 250 gsm card, laminate "
                      "them and cut. Check the 100% before cutting the lot: a "
                      "cut tab laid in its gap on the mat must fill the gap "
                      "exactly, and that fit is the whole control of error.",
        "note": "THE SOUND IS A HOLE IN THE WORD. The mat prints the "
                "photograph and the letters that are NOT the digraph, and "
                "leaves a gap exactly one tab wide where the digraph belongs; "
                "he finds the tab in the green tin and drops it in. Nothing is "
                "written on the mat, ever. THE GAP IS build_12.card_w() AND "
                "NOTHING ELSE — the tin's own measured width, the word's "
                "ink plus the 7.0 mm word space to the nearest tenth of a "
                "millimetre — called, not copied, so a tab cut off this "
                "sheet drops into this sheet's hole because both numbers came "
                "out of one function. The charcoal fragments either side sit "
                "in the same butted-slot run, so the word reads as the row of "
                "cards it is about to become. THREE COLUMNS, SIX ROWS, "
                "EIGHTEEN CELLS on A4 landscape: 9 mm margins, a 22 mm "
                "photograph at the left of every cell, 6 mm of paper to a 1.2 "
                "mm start tick 28 mm tall with the green #2F7D4F rule 9 mm up "
                "it — sheet L's card height and sheet L's baseline — "
                "a 59.667 mm writing band and 8 mm to the next column. THE "
                "CONTROL IS THE SAME MAT with the digraph printed in place, in "
                "green, in the very slot the gap left. FIVE GROUPS: sh ch th "
                "ee, wh ck ng ea, oo and ow, oi oy and ir ur er and igh, ie "
                "and ue ew and oe. Long and short oo are ONE sound on paper: "
                "the tab is `oo` either way and two keys would print two "
                "identical tabs. A WORD IS ON A MAT ONLY IF THERE IS REAL ART "
                "FOR IT, one object on a plain ground, and a group whose pool "
                "is thin comes out a SHORT PAGE with empty trailing cells "
                "rather than an invented picture — the build report names "
                "every word the gate turned away, split into the ones with no "
                "artwork anywhere and the ones whose artwork fails the house "
                "rule, and that list is the artwork commission. THE TAB COUNT "
                "IS A SUM OVER EVERY MAT IN THE SET, sheet Y's included: a "
                "blend word that also carries a digraph (spoon, snow, tree, "
                "clock) leaves both gaps, and the green tab can only come from "
                "here. Builders scripts/curriculum/writing-shelf/"
                "build_25_digraph_work.py.",
    },
    {
        "n": 26, "letter": "Y", "slug": "blend-work", "tray": 5,
        "title": "Blend work mats ×5 + control ×5 + tabs — the "
                 "same material in blue",
        "file": "26-blend-mats.pdf",
        "files": ["26-blend-mats.pdf", "26-blend-mats-control.pdf",
                  "26-blend-tabs.pdf"],
        "paper": "Mats and control: A4 landscape, plain 100–120 gsm paper. "
                 "Tabs: A4 portrait, 250 gsm card",
        "duplex": False, "laminate": "the tab sheet only",
        "cut": "Sheet X's rule exactly: the mats and the control are never cut "
               "and never laminated; the tab sheet cuts once, one full-width "
               "hairline a strip boundary and a 2 mm tick at every tab edge.",
        "howToPrint": "Sheet X's instruction exactly, in blue. Five mats and "
                      "five control pages single-sided at 100% on A4 LANDSCAPE "
                      "plain paper; five tab pages single-sided at 100% on A4 "
                      "PORTRAIT 250 gsm card, laminated and cut. Keep the blue "
                      "tabs in their own tin: the anchor words want a green tab "
                      "from sheet X's tin as well, and a child sorting one tin "
                      "into two colours is a child not working.",
        "note": "THE SAME MATERIAL IN A SECOND COLOUR, AND IT IS THE SAME CODE. "
                "Sheet X is the engine and this is a CONFIG — five groups "
                "of blends, a blue #2F5FA6 rule and blue tabs, and not one line "
                "of geometry, art preparation, gap arithmetic, cutting or "
                "checking of its own. A second copy of the builder would drift "
                "within a month and a child would meet two materials that felt "
                "different. FIVE GROUPS: st sp sn sm, sl sw sk sc, bl cl fl gl "
                "pl, br cr dr fr gr tr pr, and the FINAL blends nd nt mp lk st "
                "ft lt. A final blend only ever matches at the END of a word, "
                "so `stamp` on the final-blend mat leaves its mp open and "
                "prints its st, which is that group's whole point. THE ANCHOR "
                "WORDS CARRY A BLEND AND A DIGRAPH — spoon, snow, broom, "
                "tree, truck, clock, brick, crown, flower, glue — and on "
                "those the DIGRAPH GAP IS LEFT TOO: he fills the blue gap out "
                "of this tin and the green gap out of SHEET X'S tin, and the "
                "caption on every one of these mats says so, because a gap he "
                "has no tab for is a dead end. 26-blend-tabs.pdf therefore "
                "prints the BLUE tabs only; the green ones are counted into "
                "25-digraph-tabs.pdf, which is where they come from, and "
                "nothing is printed twice. Art gate, short pages and the "
                "reported skip list are sheet X's. Builder "
                "scripts/curriculum/writing-shelf/build_26_blend_work.py, which "
                "is thirty lines and a config.",
    },
    {
        "n": 27, "letter": "Z", "slug": "sound-book", "tray": 5,
        "title": "My Sound Book — A5 booklet, one page a sound, in mat "
                 "order",
        "file": "27-sound-book-print.pdf",
        "files": ["27-sound-book-print.pdf"],
        "paper": "A4 landscape, plain 120–160 gsm paper",
        "duplex": "short edge", "laminate": False,
        "cut": "No cutting at all. Print the A4 landscape sheets, NEST them "
               "(sheet 1 outermost), fold the nested stack once on the centre "
               "line — the two short black ticks at the head and foot of "
               "sheet 1 mark it — and staple twice through the fold, about "
               "40 mm either side of the middle. Sheet O's fold and staple "
               "exactly.",
        "howToPrint": "Print DUPLEX, flip on SHORT EDGE, 100% in colour, A4 "
                      "landscape on 120–160 gsm paper — heavier than "
                      "a reader because he writes on both sides of it. Do NOT "
                      "laminate. Hold sheet 1 up to the light before folding: "
                      "the centre ticks at head and foot should sit over one "
                      "another on both faces. One book per child, and write his "
                      "name on the cover plate before he opens it. "
                      "27-sound-book-reading.pdf ships beside it as the A5 "
                      "reading order, for proofing only — it is not "
                      "printed and is in no count.",
        "note": "THE BOOK THE MATS FILL UP. Sheets X and Y are laid out, "
                "tabbed and put away again, and nothing of that work survives "
                "the morning. This is where it survives: ONE PAGE A SOUND, in "
                "mat order, and on it the very words that sound's mat carries "
                "— the same photograph at 18 mm instead of 22 — each "
                "beside a three-line rule for him to WRITE the word on. Under "
                "the pictures the rules run on free to the 22 mm foot, because "
                "the sound does not stop at the mat. IT IS SHEET O'S BOOK: the "
                "page machinery is imported, not re-made — the same "
                "three-line school rule (dotted headline, dashed midline, solid "
                "baseline, x-height 6.6 mm, pitch 21 mm), the same fore-edge "
                "tab, the same folio, the same A5 logical page on 148.5 "
                "× 210 at a 14 mm margin, and the same saddle imposition "
                "onto A4 landscape. THE FORE EDGE IS TWO BLOCKS, NOT THREE: "
                "sheet O halves its edge into three reading tiers, this book "
                "has two of its own — GREEN on the top half for every "
                "digraph page, BLUE on the bottom half for every blend page, "
                "the same 2.2 mm tab 7 mm off the trim, alternating with verso "
                "and recto so it always lands away from the fold. Closed, the "
                "book shows two solid blocks and a thumb finds its half. THE "
                "SOUND IS TOP LEFT AND IS THE ONLY COLOUR ON THE PAGE, set in "
                "Comic Neue at the writing x-height of 6.6 mm — the size "
                "he will write it — in its tier's colour, and a family of "
                "spellings prints the family: `ir ur er`, `oi oy`, `ue ew`. "
                "FIVE PICTURES AT MOST: seven rules fit a page and a page of "
                "seven pictures has nowhere to go, so a sound's first five mat "
                "words take the top five rules and the last two are free. The "
                "page count is a multiple of four or it does not fold, and the "
                "sounds are derived from sheets X and Y's own plans, so a word "
                "that leaves a mat leaves this book in the same build. Builder "
                "scripts/curriculum/writing-shelf/build_27_sound_book.py.",
    },
]


# ----------------------------------------------------------------- numbers --
def pdf_pages(path):
    with pikepdf.open(path) as doc:
        return len(doc.pages)


def refresh(items):
    """Every page count and byte size, read off the finished PDFs."""
    for it in items:
        files = it.get("files") or [it["file"]]
        pages, size = 0, 0
        for name in files:
            p = V2 / name
            if not p.exists():
                raise SystemExit("missing %s" % p)
            pages += pdf_pages(p)
            size += p.stat().st_size
        it["pages"], it["bytes"] = pages, size
    return items


def counted(items):
    return [i for i in items if str(i["n"]) != "1b"]


def stock(items):
    c = counted(items)
    sides = sum(i["pages"] for i in c)
    dup = sum(i["pages"] for i in c if i.get("duplex"))
    sheets = (sides - dup) + dup // 2
    risky = len([i for i in c if i.get("duplex") and i["pages"] > 2])
    lam = len([i for i in items if i.get("laminate")])
    return dict(printables=len(c), sheets=sheets, sides=sides, duplex=dup,
                risky=risky, laminate=lam)


# ---------------------------------------------------------------- manifest --
def update_manifest():
    d = json.loads(MANIFEST.read_text())
    by_n = {str(i["n"]): i for i in d["items"]}
    for new in NEW_ITEMS:
        key = str(new["n"])
        if key in by_n:
            by_n[key].update({k: v for k, v in new.items()})
        else:
            d["items"].append(dict(new))
    d["items"].sort(key=lambda i: (float(str(i["n"]).replace("b", ".5"))))
    refresh(d["items"])
    s = stock(d["items"])
    old = d["stock"]
    for key, val in (("Printables", s["printables"]),
                     ("Sheets of paper", s["sheets"]),
                     ("Printed sides", s["sides"]),
                     ("Duplex sides", s["duplex"]),
                     ("Risky duplex jobs", s["risky"]),
                     ("Laminated items", s["laminate"])):
        old[key]["v2"] = str(val)
    d["note"] = re.sub(r"^\w+[- ]?\w* printables",
                       "%d printables" % s["printables"], d["note"])
    MANIFEST.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    return d, s


# ------------------------------------------------------------- print guide --
INDEX_ROW = ('    <tr><td class="num">%s</td><td>%s</td><td class="pg">5</td>'
             '<td class="file">%s</td><td class="pg">%d</td><td>%s</td>'
             '<td><span class="flag">%s</span> %s</td></tr>')

GUIDE_ROWS = {
    25: ("<b>Digraph work mats</b> " + X + "<span class=\"fig\">5</span>, "
         "control " + X + "<span class=\"fig\">5</span> and the tabs " + E +
         " the sound is a <b>gap one tab wide</b>",
         "25-digraph-mats.pdf + -control + -tabs",
         "A4 landscape plain paper; tabs A4 portrait, <span class=\"fig\">250"
         "</span> gsm card",
         "mats never cut, never laminate", "tabs cut once, laminate"),
    26: ("<b>Blend work mats</b> " + X + "<span class=\"fig\">5</span>, control "
         + X + "<span class=\"fig\">5</span> and the tabs " + E + " the same "
         "material in <b>blue</b>",
         "26-blend-mats.pdf + -control + -tabs",
         "A4 landscape plain paper; tabs A4 portrait, <span class=\"fig\">250"
         "</span> gsm card",
         "mats never cut, never laminate", "tabs cut once, laminate"),
    27: ("<b>My Sound Book</b> " + E + " A5 booklet, <b>one page a sound</b>, "
         "in mat order",
         "27-sound-book-print.pdf",
         "A4 landscape, <span class=\"fig\">120</span>" + E.replace(
             "&#8212;", "&#8211;") + "<span class=\"fig\">160</span> gsm paper",
         "duplex short edge, fold and staple", "never laminate"),
}

SECTION = '''
<section class="item">
  <div class="rail">
    <span class="n">%(letter)s</span>
    <dl class="meta">
      <dt>Tray</dt><dd>5</dd>
      <dt>Pages</dt><dd>%(pages)d</dd>
      <dt>Paper</dt><dd>%(paper)s</dd>
      <dt>Duplex</dt><dd>%(duplex)s</dd>
      <dt>Finish</dt><dd>%(finish)s</dd>
    </dl>
  </div>
  <div>
    <h3>%(head)s</h3>
    <p class="filename">%(files)s</p>
    <p class="body">%(note)s</p>
    <p class="cutline"><b>%(cuthead)s</b> %(cut)s</p>
  </div>
</section>
'''

SECTION_HEADS = {
    25: ("Digraph work mats, the control and the tabs",
         "Never cut a mat; cut the tab sheet once."),
    26: ("Blend work mats, the control and the tabs",
         "Never cut a mat; cut the tab sheet once."),
    27: ("My Sound Book " + E + " one page a sound",
         "Duplex short edge, nest, fold, staple."),
}


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace("—", E).replace("–", "&#8211;")
            .replace("×", X).replace("→", RA))


def update_guide(d, s):
    h = GUIDE.read_text()
    dl = ('<dl class="stock">'
          + "".join('<div><dt>%s</dt><dd><span class="was">%s</span>'
                    '<span class="now">%s</span></dd></div>'
                    % (k, d["stock"][k]["v1"], d["stock"][k]["v2"])
                    for k in ("Printables", "Sheets of paper", "Printed sides",
                              "Duplex sides", "Risky duplex jobs",
                              "Laminated items"))
          + "</dl>")
    h = re.sub(r'<dl class="stock">.*?</dl>', dl, h, flags=re.S)

    rows = []
    for it in NEW_ITEMS:
        item = next(i for i in d["items"] if i["n"] == it["n"])
        title, files, paper, flag, fin = GUIDE_ROWS[it["n"]]
        rows.append(INDEX_ROW % (it["letter"], title, files, item["pages"],
                                 paper, flag, fin))
    block = "\n".join(rows) + "\n"
    # idempotent: drop any rows this script wrote before, then re-insert
    h = re.sub(r'    <tr><td class="num">[XYZ]</td>.*?</tr>\n', "", h, flags=re.S)
    h = re.sub(r'(    <tr><td class="num">W</td>.*?</tr>\n)',
               lambda m: m.group(1) + block, h, count=1, flags=re.S)

    secs = []
    for it in NEW_ITEMS:
        item = next(i for i in d["items"] if i["n"] == it["n"])
        head, cuthead = SECTION_HEADS[it["n"]]
        secs.append(SECTION % dict(
            letter=it["letter"], pages=item["pages"], paper=esc(it["paper"]),
            duplex=("Yes " + E + " flip on the SHORT edge"
                    if it["duplex"] else "No " + E + " single-sided"),
            finish=esc(str(it["laminate"]) if it["laminate"] else
                       "never laminate"),
            head=head, files=esc(", ".join(it.get("files") or [it["file"]])),
            note=esc(it["note"]), cuthead=cuthead, cut=esc(it["cut"])))
    new = "".join(secs)
    if 'class="n">X<' not in h:
        h = h.replace('<div class="coda">', new + '\n<div class="coda">', 1)
    else:
        h = re.sub(r'\n<section class="item">\s*<div class="rail">\s*'
                   r'<span class="n">[XYZ]</span>.*?</section>\n', "", h,
                   flags=re.S)
        h = h.replace('<div class="coda">', new + '\n<div class="coda">', 1)
    GUIDE.write_text(h)


def main():
    d, s = update_manifest()
    update_guide(d, s)
    print("manifest: %d items · printables %d · sheets %d · sides %d · "
          "duplex %d · risky %d · laminated %d"
          % (len(d["items"]), s["printables"], s["sheets"], s["sides"],
             s["duplex"], s["risky"], s["laminate"]))
    for it in NEW_ITEMS:
        item = next(i for i in d["items"] if i["n"] == it["n"])
        print("  %2s %-18s %2d pages  %8d bytes  %s"
              % (it["letter"], it["slug"], item["pages"], item["bytes"],
                 ", ".join(it.get("files") or [it["file"]])))
    print("  ->", MANIFEST)
    print("  ->", GUIDE)


if __name__ == "__main__":
    main()
