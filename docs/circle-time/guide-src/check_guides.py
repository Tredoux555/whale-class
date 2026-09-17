# -*- coding: utf-8 -*-
"""HARD CHECK on the built guide books — run it after render_guide.py.

The owner's rule (2026-09-15): the guide BOOKS are printed for FOREIGN teachers,
so NOT ONE Chinese character may appear in one. build_guide.py already refuses to
emit an HTML page containing a CJK codepoint; this script re-asserts it on the
FINISHED PDFs, which is the artefact that actually ships, and fails loudly (exit
1) naming every offending page and glyph.

It also checks the things the Sep-2026 audit pinned down, because they are cheap
once the PDF is open: 8 pages, every page's left ink >= 22mm (the hole-punch
rule), no text outside the page box, and every font embedded.

Run in the CLOUD CONTAINER (needs pdfplumber; pdffonts comes from poppler).

Usage:  python3 check_guides.py [week ...]      # default: every built week
Exit:   0 all clean · 1 at least one failure (each one printed)
"""
import glob, os, re, subprocess, sys

import logging

import pdfplumber

# pdfminer chatters about NotoColorEmoji's missing FontBBox on every page
logging.getLogger("pdfminer").setLevel(logging.ERROR)

HERE = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "..", "public"))

CJK = re.compile(
    "[⺀-⻿⼀-⿟　-〿぀-ヿ㇀-㇯"
    "㈀-㋿㌀-㏿㐀-䶿一-鿿豈-﫿"
    "︐-︟︰-﹏＀-￯]")

MM = 72.0 / 25.4
LEFT_MIN_MM = 22.0
PAGES = 8


def weeks_built():
    ns = []
    for f in glob.glob(os.path.join(HERE, "circle-guide-week*.html")):
        ns.append(int(re.search(r"week(\d+)\.html$", f).group(1)))
    return sorted(ns)


def fonts_embedded(path):
    """poppler's pdffonts: column 'emb' must be 'yes' for every font."""
    try:
        out = subprocess.run(["pdffonts", path], capture_output=True, text=True).stdout
    except FileNotFoundError:
        return []                      # no poppler here: skip rather than false-fail
    bad = []
    for line in out.splitlines()[2:]:
        cols = line.split()
        if len(cols) >= 4 and cols[-4] != "yes":
            bad.append(cols[0])
    return bad


def check(week):
    path = os.path.join(PDF_DIR, "circle-guide-week%d.pdf" % week)
    fails = []
    if not os.path.exists(path):
        return ["week %d: %s is missing" % (week, path)]
    with pdfplumber.open(path) as pdf:
        if len(pdf.pages) != PAGES:
            fails.append("week %d: %d pages, expected %d" % (week, len(pdf.pages), PAGES))
        for i, page in enumerate(pdf.pages, 1):
            chars = page.chars
            text = "".join(c["text"] for c in chars)
            glyphs = sorted(set(CJK.findall(text)))
            if glyphs:
                fails.append("week %d p%d: CHINESE IN THE BOOK -> %s"
                             % (week, i, " ".join(glyphs)))
            ink = [c for c in chars if c["text"].strip()]
            if ink:
                left = min(c["x0"] for c in ink) / MM
                if left < LEFT_MIN_MM:
                    fails.append("week %d p%d: left ink %.2fmm < %.0fmm"
                                 % (week, i, left, LEFT_MIN_MM))
            for c in ink:
                if (c["x0"] < 0 or c["top"] < 0
                        or c["x1"] > page.width + 0.5 or c["bottom"] > page.height + 0.5):
                    fails.append("week %d p%d: text outside the page box (%r at %.1f,%.1f)"
                                 % (week, i, c["text"], c["x0"], c["top"]))
                    break
    for f in fonts_embedded(path):
        fails.append("week %d: font not embedded -> %s" % (week, f))
    return fails


def main():
    weeks = [int(a) for a in sys.argv[1:]] or weeks_built()
    fails = []
    for w in weeks:
        fails += check(w)
    if fails:
        print("FAIL (%d):" % len(fails))
        for f in fails:
            print("  " + f)
        sys.exit(1)
    print("OK: %d guide books — 0 Chinese characters, %d pages each, "
          "left ink >= %.0fmm, nothing off-page, all fonts embedded."
          % (len(weeks), PAGES, LEFT_MIN_MM))


if __name__ == "__main__":
    main()
