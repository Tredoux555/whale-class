#!/usr/bin/env python3
"""
Dark Phonics · Talking Shelf · manifest.json and PRINT-GUIDE.html for v1

The Writing Shelf's v2 pack has both, and a teacher who has printed that pack
should not have to learn a second set of habits to print this one. So:

  * manifest.json is the SAME SHAPE as public/dark-phonics-shelf/v2/manifest.json
    — version, set, note, stock, items[], revised — with the per-item keys it
    uses (n, letter, slug, title, tray, file, pages, bytes, paper, duplex,
    laminate, cut, howToPrint) and nothing invented beside them;
  * PRINT-GUIDE.html reuses the v2 guide's <head> and <style> VERBATIM, copied
    out of that file at build time rather than re-typed, so the two guides are
    the same document in two colours of ink. Only the body is new.

The page counts and byte counts in the manifest are READ OFF THE BUILT PDFs, not
typed, so the manifest cannot drift from the pack.

Run:   python3 scripts/curriculum/talking-shelf/build_pack.py
       (after the six T-sheet builders)
Needs: pypdf
"""

import json
from pathlib import Path

from pypdf import PdfReader

import house as H

V2_GUIDE = H.REPO / "public" / "dark-phonics-shelf" / "v2" / "PRINT-GUIDE.html"
WS = "/dark-phonics-shelf/v2"

SET = "Dark Phonics · The Talking Shelf"
REVISED = (
    "2026-09-11 — first cut. Four trays, six printables, built on the Writing "
    "Shelf's own standard: CUT ONCE (cards butt, every line runs the full width or "
    "height of the page with a black triangle at each end at the 5.5 mm "
    "printer-safe margin, content stops 4 mm inside every card edge), printed size "
    "is finished size minus 20 mm wherever a card is mounted, and duplex is SHORT "
    "EDGE. cutmarks.py is IMPORTED from scripts/curriculum/writing-shelf/, not "
    "copied, so the two shelves cut the same way for ever. Two things are still "
    "owed and both print as placeholders that can be reprinted identically: the "
    "eight arrangement photographs (the teacher's own miniatures on her own mat) "
    "and the two puppet drawings."
)

ITEMS = [
    dict(
        n=1, letter="A", slug="frame-cards", tray="1, 2, 3 and 4",
        title="Frame cards ×4 — 100 × 140 mm",
        file="T01-frame-cards.pdf",
        paper="A4 portrait, 300 gsm card", duplex=False, laminate=True,
        cut="Cut along every grey line — two strokes across the sheet and two down it, "
            "edge to edge — for one card of 100 × 140 mm. UNMOUNTED: this card stands "
            "at the back of the tray, it does not go into a stand, so it prints at "
            "finished size. One card a page, and not four: two columns of 100 mm would "
            "put a cut line inside the 5.5 mm printer-safe margin.",
        howToPrint="Print 4 sheets single-sided at 100% on card; laminate, then cut. One frame "
                   "card stands at the back of each of the four trays.",
    ),
    dict(
        n=2, letter="B", slug="arrangement-cards", tray=1,
        title="Arrangement cards ×8 — 80 × 120 mm",
        file="T02-arrangement-cards.pdf",
        paper="A4 portrait, 250 gsm card", duplex="short edge", laminate=True,
        cut="Cut along every grey line — two strokes across, two down, edge to edge — for "
            "four butted cards of 80 × 120 mm. Mounted on a coloured backing card with a "
            "1 cm border they finish at 100 × 140 mm, which is what the card stands take. "
            "The triangles land in the same place on both faces, so front cuts and back "
            "cuts coincide.",
        howToPrint="Print 2 sheets DUPLEX, flip on SHORT EDGE, 100%; print one sheet first and "
                   "hold it to the light — the sentences must be behind their own picture. "
                   "THE FRONTS ARE PLACEHOLDERS until the teacher photographs her own eight "
                   "arrangements; print them anyway, the card works, and reprint when the "
                   "photographs land.",
        note="One dot in the corner = one or two objects, two dots = two, three dots = three "
             "or four. It is a level, not an order.",
    ),
    dict(
        n=3, letter="C", slug="story-cards", tray=2,
        title="Story cards ×3 — 70 × 70 mm",
        file="T03-story-cards.pdf",
        paper="A4 portrait, 250 gsm card", duplex="short edge", laminate=True,
        cut="Cut along every grey line — for four butted squares of 70 × 70 mm, of which "
            "three carry a set and the fourth is blank on purpose. Mounted on a coloured "
            "backing card with a 1 cm border they finish at 90 × 90 mm, which is what the "
            "10 × 10 cm envelopes take — the same card as Writing Shelf sheet 06, so a "
            "story card drops into the same envelope as its pictures.",
        howToPrint="Print 1 sheet DUPLEX, flip on SHORT EDGE, 100%. Set letter on the front, "
                   "the four lines on the back.",
    ),
    dict(
        n=4, letter="D", slug="say-it-cards", tray=3,
        title="Say-it cards ×8 — 80 × 120 mm",
        file="T04-say-it-cards.pdf",
        paper="A4 portrait, 250 gsm card", duplex="short edge", laminate=True,
        cut="Cut along every grey line — four butted cards of 80 × 120 mm a sheet. Mounted "
            "on a coloured backing card with a 1 cm border they finish at 100 × 140 mm.",
        howToPrint="Print 2 sheets DUPLEX, flip on SHORT EDGE, 100%; hold one to the light "
                   "before you commit the rest — the exchange must be behind its own picture. "
                   "Laminate: this is the tray they handle most.",
        note="Every picture is an existing Dark Phonics page, so the child meets a picture he "
             "already knows and spends his attention on the sentence.",
    ),
    dict(
        n=5, letter="E", slug="puppets", tray=3,
        title="Stick puppets ×2 — the cat and the potato",
        file="T05-puppets.pdf",
        paper="A4 portrait, 300 gsm card", duplex=False, laminate=False,
        cut="Cut along every grey line — two strokes across and two down, edge to edge — for "
            "one piece of 100 × 200 mm: 180 mm of puppet with a 20 mm tab at the foot. Tape "
            "a lolly stick behind the tab. Do not cut round the puppet's outline; a puppet "
            "cut to its silhouette loses an ear inside a fortnight.",
        howToPrint="Print 2 sheets single-sided at 100% on card. DO NOT laminate — a laminated "
                   "puppet will not take tape. THE DRAWINGS ARE PLACEHOLDERS: two silhouettes "
                   "stand at the size and in the place the real art will occupy, so the sheet "
                   "reprints identically when the art lands.",
    ),
    dict(
        n=6, letter="F", slug="teacher-card", tray=4,
        title="Teacher card, 2-up A5 — “Tell me about it.”",
        file="T06-teacher-card.pdf",
        paper="A4 landscape, 250 gsm card", duplex=False, laminate=True,
        cut="One cut on the grey centre line, edge to edge, between the two black triangles — "
            "two identical A5 cards. Sheet 09 of the Writing Shelf, exactly.",
        howToPrint="Print 1 sheet single-sided at 100% on card; laminate, then one cut. One card "
                   "on the tray, one in your pocket.",
    ),
]

SHEET_06_NOTE = (
    "Tray 2 needs no new pictures — it needs the Writing Shelf's Tray-6 picture "
    "sequences, sheet 06, PRINTED TWICE. Six envelopes, A A B B C C, because both "
    "children need their own copy of the same set: one tells it, the other lays it "
    "out, and then they open both and compare. Print "
    "<a href=\"%s/06-picture-sequences.pdf\">06-picture-sequences.pdf</a> twice — "
    "3 sheets each, 6 in all, 12 cards a run at 70 × 70 mm, mounted to 90 × 90 — and "
    "do not rebuild it here. It is already made." % WS
)


def measure(item):
    p = H.OUT_DIR / item["file"]
    if not p.exists():
        raise SystemExit("missing %s — run the six T-sheet builders first" % p)
    item = dict(item)
    item["pages"] = len(PdfReader(str(p)).pages)
    item["bytes"] = p.stat().st_size
    return item


def manifest(items):
    sheets = sum(i["pages"] // (2 if i["duplex"] else 1) for i in items)
    sides = sum(i["pages"] for i in items)
    duplex_sides = sum(i["pages"] for i in items if i["duplex"])
    return {
        "version": 1,
        "set": SET,
        "note": (
            "Six printables for the four-tray Talking Shelf, plus one sheet borrowed "
            "whole from the Writing Shelf: 06-picture-sequences.pdf, printed TWICE for "
            "Tray 2. CUT ONCE throughout — cards butt against each other with no "
            "gutters, every cut line runs the full width or the full height of the page "
            "so one stroke of the blade separates the cards on both sides of it, the "
            "lines are light-grey 0.25 mm hairlines that are cut away, and a small black "
            "triangle at the 5.5 mm printer-safe margin marks each end. Card content "
            "stops 4 mm inside every card edge. Printed size is finished size minus "
            "20 mm wherever the card is mounted on a coloured backing card. All "
            "adult-facing text sits outside the cards. The cutting standard is imported "
            "from scripts/curriculum/writing-shelf/cutmarks.py, never copied."
        ),
        "borrowedFromWritingShelf": [{
            "file": "06-picture-sequences.pdf",
            "href": WS + "/06-picture-sequences.pdf",
            "tray": 2,
            "printTimes": 2,
            "why": "Six envelopes, A A B B C C — both children need their own copy of the "
                   "same set, or there is nothing to compare.",
        }],
        "stock": {
            "Printables": {"v1": str(len(items))},
            "Sheets of paper": {"v1": str(sheets)},
            "Printed sides": {"v1": str(sides)},
            "Duplex sides": {"v1": str(duplex_sides)},
            "Laminated items": {"v1": str(sum(1 for i in items if i["laminate"]))},
            "Waiting on art": {"v1": "2"},
        },
        "items": items,
        "artStillOwed": [
            {"where": "phonics-images/satpin-v2/talking-shelf/",
             "files": ["arr-1.png", "arr-2.png", "arr-3.png", "arr-4.png",
                       "arr-5.png", "arr-6.png", "arr-7.png", "arr-8.png"],
             "who": "the teacher, photographing her own miniatures on her own mat",
             "rebuild": "python3 scripts/curriculum/talking-shelf/build_T02_arrangement_cards.py "
                        "--art-dir phonics-images/satpin-v2/talking-shelf"},
            {"where": "phonics-images/satpin-v2/talking-shelf/",
             "files": ["puppet-cat.png", "puppet-potato.png"],
             "who": "Midjourney, in the Dark Phonics pen-and-ink house style",
             "rebuild": "python3 scripts/curriculum/talking-shelf/build_T05_puppets.py "
                        "--art-dir phonics-images/satpin-v2/talking-shelf"},
        ],
        "revised": REVISED,
    }


def e(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def guide(items, man):
    head = V2_GUIDE.read_text(encoding="utf-8").split("</style>")[0] + "</style>"
    head = head.replace("<title>Writing Shelf Printables v2</title>",
                        "<title>Talking Shelf Printables v1</title>")
    rows = []
    for i in items:
        flag = ('<span class="flag">duplex &middot; short edge</span> '
                if i["duplex"] else "")
        fin = flag + ("laminate" if i["laminate"] else "&mdash;")
        rows.append(
            '    <tr><td class="num">%s</td><td>%s</td><td class="pg">%s</td>'
            '<td class="file">%s</td><td class="pg">%d</td><td>%s</td><td>%s</td></tr>'
            % (i["letter"], e(i["title"]), e(i["tray"]), i["file"], i["pages"],
               e(i["paper"]), fin))
    secs = []
    for i in items:
        flag = ('<span class="flag">duplex &middot; short edge</span> '
                if i["duplex"] else "")
        fin = flag + ("laminate" if i["laminate"] else "&mdash;")
        extra = ("<p class=\"body\" style=\"margin-top:1rem\">%s</p>" % e(i["note"])
                 if i.get("note") else "")
        secs.append(
            '<section class="item">\n'
            '  <div class="rail">\n'
            '    <span class="n">%s</span>\n'
            '    <dl class="meta">\n'
            '      <dt>Tray</dt><dd>%s</dd>\n'
            '      <dt>Pages</dt><dd>%d</dd>\n'
            '      <dt>Paper</dt><dd>%s</dd>\n'
            '      <dt>Finish</dt><dd>%s</dd>\n'
            '    </dl>\n'
            '  </div>\n'
            '  <div>\n'
            '    <h3>%s</h3>\n'
            '    <p class="filename"><a href="%s">%s</a></p>\n'
            '    <p class="body">%s</p>%s\n'
            '    <p class="cutline">%s</p>\n'
            '  </div>\n'
            '</section>' % (i["letter"], e(i["tray"]), i["pages"], e(i["paper"]), fin,
                            e(i["title"]), i["file"], i["file"], e(i["howToPrint"]),
                            extra, e(i["cut"])))
    stock = "".join('<div><dt>%s</dt><dd><span class="now">%s</span></dd></div>'
                    % (e(k), e(v["v1"])) for k, v in man["stock"].items())
    tray_rows = [
        (1, "Behind the Screen", "pair; solo entry",
         "A, B · and the second miniature set",
         "Two mats, one screen, eight objects twice over. He tells; she builds; the screen comes down."),
        (2, "Tell It, Order It", "pair; solo entry",
         "A, C · and Writing Shelf 06 printed TWICE",
         "Six envelopes, A A B B C C. He tells the story; she lays her copy in the order she hears."),
        (3, "Puppet Talk", "solo or pair",
         "A, D, E",
         "The cat asks, the potato answers. He turns the card to check — every word is a reader word."),
        (4, "Tell Me About It", "teacher + child — a ROUTINE, not a shelf work",
         "A, F · and the Tray-4 dictation photos, Writing Shelf 03",
         "He picks a photo and tells you about it. You say it back, correct, as if you agree."),
    ]
    trays = "".join(
        '    <tr><td class="num">%d</td><td>%s</td><td>%s</td><td class="file">%s</td><td>%s</td></tr>\n'
        % (n, e(t), e(kind), e(sheets), e(what)) for n, t, kind, sheets, what in tray_rows)
    body = """
<div class="wrap">
<header>
  <p class="eyebrow">Dark Phonics &middot; The Talking Shelf &middot; v1</p>
  <h1>How to print, cut and assemble</h1>
  <p class="standfirst">Six printables for the four-tray Talking Shelf, plus one sheet
  borrowed whole from the Writing Shelf. %d sheets of paper, %d printed sides.</p>
</header>

<div class="rules">
  <h2>Three rules that apply to every sheet</h2>
  <p><b>Print at <span class="fig">100</span>%%.</b> In the print dialog choose <em>Actual size</em>
  or <em>Scale: <span class="fig">100</span>%%</em>, never <em>Fit to page</em>. Every size on
  this shelf is a real size: a story card that is not <span class="fig">70</span>&nbsp;mm
  will not fit the envelope its pictures came in.</p>
  <p><b>Cut once.</b> Cards butt against each other with no gutters, and every grey line
  runs the full width or the full height of the page, so one straight stroke of the blade
  separates the cards on both sides of it. The lines are cut away &mdash; a line
  <em>is</em> the card edge &mdash; and the small black triangles in the margin, at the
  <span class="fig">5.5</span>&nbsp;mm printer-safe margin, are what you sight the blade on.</p>
  <p><b>Printed is not finished.</b> Every card that goes into a card stand or an envelope is
  mounted by hand on a coloured backing card with a <span class="fig">1</span>&nbsp;cm border
  all round, so it finishes <span class="fig">20</span>&nbsp;mm bigger each way: flip cards
  <span class="fig">80</span> &times; <span class="fig">120</span> &rarr;
  <span class="fig">100</span> &times; <span class="fig">140</span>, story cards
  <span class="fig">70</span> &times; <span class="fig">70</span> &rarr;
  <span class="fig">90</span> &times; <span class="fig">90</span>. The frame cards and the
  puppets are not mounted and print at finished size.</p>
</div>

<dl class="stock">%s</dl>

<div class="tablewrap">
<table>
  <caption>The pack</caption>
  <thead><tr><th></th><th>Printable</th><th>Tray</th><th>File</th><th>Pages</th><th>Paper</th><th>Finish</th></tr></thead>
  <tbody>
%s
  </tbody>
</table>
</div>

<div class="tablewrap">
<table>
  <caption>Tray by tray</caption>
  <thead><tr><th>Tray</th><th>Work</th><th>How it is worked</th><th>Sheets</th><th>What happens</th></tr></thead>
  <tbody>
%s  </tbody>
</table>
</div>

<div class="rules" style="margin-bottom:3.5rem">
  <h2>Print sheet 06 twice</h2>
  <p>%s</p>
</div>

%s

<div class="coda">
  <h2>Two things are still owed</h2>
  <p><b>The eight arrangement photographs.</b> They are the teacher's own, of her own
  miniatures on her own mat, because a stock photograph of a different cat on a different
  bed is a different work. Until they land the fronts are a pale-grey placeholder that says
  nothing at all &mdash; no word, no number &mdash; because a card that names its own picture
  does the child's naming for him. Drop <code>arr-1.png</code> &hellip; <code>arr-8.png</code>
  into <code>phonics-images/satpin-v2/talking-shelf/</code> and rebuild with
  <code>--art-dir</code>.</p>
  <p><b>The two puppet drawings.</b> <code>puppet-cat.png</code> and
  <code>puppet-potato.png</code>, same folder, same flag. The sheet prints and cuts today
  with a silhouette standing at the size and in the place the drawing will occupy, so it
  reprints identically later.</p>
  <p>The Writing Shelf pack, which this one sits beside, is at
  <a href="%s/PRINT-GUIDE.html">%s/PRINT-GUIDE.html</a>.</p>
</div>
</div>
""" % (int(man["stock"]["Sheets of paper"]["v1"]),
       int(man["stock"]["Printed sides"]["v1"]),
       stock, "\n".join(rows), trays, SHEET_06_NOTE, "\n\n".join(secs), WS, WS)
    return head + "\n" + body


def build():
    items = [measure(i) for i in ITEMS]
    man = manifest(items)
    (H.OUT_DIR / "manifest.json").write_text(
        json.dumps(man, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (H.OUT_DIR / "PRINT-GUIDE.html").write_text(guide(items, man), encoding="utf-8")
    print("pack -> %s" % H.OUT_DIR)
    print("  manifest.json  %d items · %s sheets · %s printed sides"
          % (len(items), man["stock"]["Sheets of paper"]["v1"],
             man["stock"]["Printed sides"]["v1"]))
    for i in items:
        print("   %s  %-42s %d pp  %6.0f KB" % (i["letter"], i["file"], i["pages"],
                                                i["bytes"] / 1024.0))
    print("  PRINT-GUIDE.html written, head and style copied from the v2 guide")


if __name__ == "__main__":
    build()
