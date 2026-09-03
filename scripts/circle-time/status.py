#!/usr/bin/env python3
"""status.py — current-state table for every circle-time week of 2026-27.

    python3 scripts/circle-time/status.py            # markdown table (default)
    python3 scripts/circle-time/status.py --plain    # aligned text
    python3 scripts/circle-time/status.py --next     # just what to build next

Scans public/, docs/circle-time/, next.config.ts and middleware.ts and prints
the table that docs/circle-time/HANDOFF-year-build.md carries, so the handoff
can be regenerated instead of hand-edited. Python 3 stdlib only.

WEEK NUMBERS ARE SITE WEEKS (1-35) — taught weeks counted from Sep 1 2026, the
numbering shown on the pages and in public/circle-time-weeks.js. The
principal's xlsx (2026-2027_全年中文课程计划_全年已填.xlsx, sheets 工作表1 /
English) and the decoded doc use SHEET numbers: **sheet = site + 2**. The SITE
table below is transcribed from her file, so this script needs no xlsx reader,
and SHEET_OFFSET is how it finds "## WEEK <sheet>" in the decoded doc.
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))

# Her sheet weeks 1-2 (August "Welcome Back" / "Classroom Rules") are not taught
# as circle time and have no site week at all — site week 1 is her sheet week 3.
SHEET_OFFSET = 2

# site week n, dates as the principal wrote them, theme as she wrote it
SITE = [
    (1,  "Sep 1-5",      "I'm special / I like myself"),
    (2,  "Sep 8-12",     "My Body"),
    (3,  "Sep 14-18",    "My 5 senses"),
    (4,  "Sep 21-24",    "My Feeling"),
    (5,  "Oct 5-9",      "Five food groups"),
    (6,  "Oct 12-16",    "Healthy food"),
    (7,  "Oct 19-23",    "Healthy Life / habits"),
    (8,  "Oct 26-30",    "Halloween Week / Dress-up Party"),
    (9,  "Nov 2-6",      "People around me (family and friends)"),
    (10, "Nov 9-13",     "The cycle of animals"),
    (11, "Nov 16-20",    "The cycle of plants"),
    (12, "Nov 23-27",    "Thanksgiving day"),
    (13, "Nov 30-Dec 4", "Community Helpers-1"),
    (14, "Dec 7-11",     "Community Helpers-2"),
    (15, "Dec 14-18",    "Christmas"),
    (16, "Jan 4-8",      "Winter is coming"),
    (17, "Jan 11-15",    "Weather"),
    (18, "Jan 18-22",    "Beijing"),
    (19, "Jan 25-29",    "China"),
    (20, "Feb 22-26",    "Chinese New Year"),
    (21, "Mar 1-5",      "The Seven Continents"),
    (22, "Mar 9-13",     "Exploring the Five Oceans"),
    (23, "Mar 16-20",    "One continent - AFRICA"),
    (24, "Mar 22-26",    "One country - SOUTH AFRICA"),
    (25, "Mar 29-Apr 2", "The Earth"),
    (26, "Apr 7-10",     "Landforms (4-day Qingming week)"),
    (27, "Apr 12-16",    "Animal habitats"),
    (28, "Apr 19-23",    "Earth Day"),
    (29, "Apr 26-30",    "Green Energy"),
    (30, "May 10-14",    "Big Bang and the Universe"),
    (31, "May 17-21",    "Solar System"),
    (32, "May 24-28",    "Space Exploration"),
    (33, "May 31-Jun 4", "Dinosaurs and Fossils (1)"),
    (34, "Jun 7-11",     "Dinosaurs and Fossils (2) + May review"),
    (35, "Jun 14-18",    "Graduation"),
]

# Holiday gaps — weeks that simply are not taught (site numbering)
GAPS = {
    (4, 5):   "Oct 1-7 国庆 National Day holiday",
    (15, 16): "winter holiday",
    (19, 20): "Chinese New Year holiday (Feb 1-19)",
    (29, 30): "May 1-7 Labour Day holiday",
}

# Weeks 1 and 2 shipped before the /teachers-w<N> convention and keep their
# historical routes. public/circle-time.html + public/circle-guide.pdf are the
# LIVE COPY of whichever week is current (the Sunday swap), not a week's own
# files, so they are not scanned here.
LEGACY_ROUTE = {1: "/teachers-week1", 2: "/teachers-next"}


def layout(n):
    """(page, image-dir token, wc_ct key number, guide pdf, route) for site week n."""
    return ("public/circle-time-week%d.html" % n, "week%d" % n, n,
            "public/circle-guide-week%d.pdf" % n,
            LEGACY_ROUTE.get(n, "/teachers-w%d" % n))


def read(rel):
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
            return fh.read()
    except IOError:
        return ""


def decoded_weeks():
    """Sheet week numbers that have a plan in the decoded doc."""
    md = read("docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md")
    return set(int(m) for m in re.findall(r"^## WEEK (\d+) ", md, re.M))


def scan():
    dec = decoded_weeks()
    nc = read("next.config.ts")
    mw = read("middleware.ts")
    rows = []
    for n, dates, theme in SITE:
        page, imgtok, key, pdf, route = layout(n)

        plan = "decoded" if (n + SHEET_OFFSET) in dec else (
            "principal (page built)"
            if os.path.isfile(os.path.join(ROOT, page)) else "MISSING")

        if os.path.isfile(os.path.join(ROOT, page)):
            lines = sum(1 for _ in open(os.path.join(ROOT, page), encoding="utf-8"))
            pg = "built (%d ln)" % lines
        else:
            pg = "-"

        pdf_s = "yes" if os.path.isfile(os.path.join(ROOT, pdf)) else "-"

        prompts = "docs/circle-time/mj-prompts-week%d.md" % n
        pr = "yes" if os.path.isfile(os.path.join(ROOT, prompts)) else "-"

        idir = os.path.join(ROOT, "public", "circle-time-images", imgtok)
        if os.path.isdir(idir):
            k = len([f for f in os.listdir(idir) if f.endswith(".jpg")])
            im = "%d/37" % k
        else:
            im = "0/37"

        if os.path.isfile(os.path.join(ROOT, page)):
            wired = (("'%s'" % route) in nc) and (("'%s'" % route) in mw)
            url = route + ("" if wired else "  (NOT WIRED)")
        else:
            url = "-"

        rows.append(dict(n=n, dates=dates, theme=theme,
                         plan=plan, page=pg, pdf=pdf_s, prompts=pr,
                         images=im, url=url, key="wc_ct%d" % key,
                         sheet=n + SHEET_OFFSET))
    return rows


HEAD = ["Wk", "Sheet", "Dates", "Theme", "Plan", "Page", "PDF", "Prompts", "Images", "URL"]
KEYS = ["n", "sheet", "dates", "theme", "plan", "page", "pdf", "prompts", "images", "url"]


def emit(rows, markdown=True):
    def gap_line(n):
        for (a, b), why in GAPS.items():
            if n == b:
                return why
        return None

    if markdown:
        print("| " + " | ".join(HEAD) + " |")
        print("|" + "|".join(["---"] * len(HEAD)) + "|")
        for r in rows:
            g = gap_line(r["n"])
            if g:
                print("| | | | _%s — no circle time_ | | | | | | |" % g)
            print("| " + " | ".join(str(r[k]) for k in KEYS) + " |")
    else:
        w = [max(len(HEAD[i]), max(len(str(r[KEYS[i]])) for r in rows))
             for i in range(len(HEAD))]
        print("  ".join(HEAD[i].ljust(w[i]) for i in range(len(HEAD))))
        print("  ".join("-" * w[i] for i in range(len(HEAD))))
        for r in rows:
            g = gap_line(r["n"])
            if g:
                print("   -- %s --" % g)
            print("  ".join(str(r[KEYS[i]]).ljust(w[i]) for i in range(len(HEAD))))


def summary(rows):
    built = [r["n"] for r in rows if r["page"] != "-"]
    noplan = [r["n"] for r in rows if r["plan"] == "MISSING"]
    art = [r["n"] for r in rows if r["page"] != "-" and r["images"] != "37/37"]
    todo = [r["n"] for r in rows if r["page"] == "-"]
    print("")
    print("week numbering   : SITE weeks (sheet = site + %d)" % SHEET_OFFSET)
    print("built pages      : %s" % (built or "none"))
    print("no plan yet      : %s" % (noplan or "none"))
    print("built, no art    : %s" % (art or "none"))
    print("still to build   : %s" % (todo or "none"))
    print("")
    print("next up          : %s" % (todo[:5] or "none"))


def main(argv):
    rows = scan()
    if "--next" in argv:
        todo = [r for r in rows if r["page"] == "-"]
        for r in todo[:5]:
            print("week %-3d (sheet %-2d) %-14s %s  [plan: %s]" %
                  (r["n"], r["sheet"], r["dates"], r["theme"], r["plan"]))
        return 0
    emit(rows, markdown="--plain" not in argv)
    summary(rows)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
