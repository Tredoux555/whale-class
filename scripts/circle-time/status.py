#!/usr/bin/env python3
"""status.py — current-state table for every circle-time week of 2026-27.

    python3 scripts/circle-time/status.py            # markdown table (default)
    python3 scripts/circle-time/status.py --plain    # aligned text
    python3 scripts/circle-time/status.py --next     # just what to build next

Scans public/, docs/circle-time/, next.config.ts and middleware.ts and prints
the table that docs/circle-time/HANDOFF-year-build.md carries, so the handoff
can be regenerated instead of hand-edited. Python 3 stdlib only.

WEEK NUMBERS ARE THE PRINCIPAL'S SHEET NUMBERS (1-37), taken from
docs/circle-time/2026-2027_全年中文课程计划_全年已填.xlsx, sheet 工作表1 / English.
The SHEET table below is transcribed from that file (col C = week + dates,
col D = theme) so this script needs no xlsx reader.
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))

# n, dates as the principal wrote them, theme as the principal wrote it
SHEET = [
    (1,  None,          "Welcome Back"),
    (2,  None,          "Classroom Rules"),
    (3,  "Aug31-Sep 4", "I'm special / I like myself"),
    (4,  "Sep 7-11",    "My Body"),
    (5,  "Sep 14-18",   "My 5 senses"),
    (6,  "Sep 21-24",   "My Feeling"),
    (7,  "Oct 5-9",     "Five food groups"),
    (8,  "Oct 12-16",   "Healthy food"),
    (9,  "Oct 19-23",   "Healthy Life / habits"),
    (10, "Oct 26-30",   "Halloween Week / Dress-up Party"),
    (11, "Nov 2-6",     "People around me (family and friends)"),
    (12, "Nov 9-13",    "The cycle of animals"),
    (13, "Nov 16-20",   "The cycle of plants"),
    (14, "Nov 23-27",   "Thanksgiving day"),
    (15, "Nov 30-Dec 4","Community Helpers-1"),
    (16, "Dec 7-11",    "Community Helpers-2"),
    (17, "Dec 14-18",   "Christmas"),
    (18, "Jan 4-8",     "Winter is coming"),
    (19, "Jan 11-15",   "Weather"),
    (20, "Jan 18-22",   "Beijing"),
    (21, "Jan 25-29",   "China"),
    (22, "Feb 22-26",   "Chinese New Year"),
    (23, "Mar 1-5",     "The Seven Continents"),
    (24, "Mar 9-13",    "Exploring the Five Oceans"),
    (25, "Mar 16-20",   "One continent - AFRICA"),
    (26, "Mar 22-26",   "One country - SOUTH AFRICA"),
    (27, "Mar 29-Apr 2","The Earth"),
    (28, "Apr 7-10",    "Landforms (4-day Qingming week)"),
    (29, "Apr 12-16",   "Animal habitats"),
    (30, "Apr 19-23",   "Earth Day"),
    (31, "Apr 26-30",   "Green Energy"),
    (32, "May 10-14",   "Big Bang and the Universe"),
    (33, "May 17-21",   "Solar System"),
    (34, "May 24-28",   "Space Exploration"),
    (35, "May 31-Jun 4","Dinosaurs and Fossils (1)"),
    (36, "Jun 7-11",    "Dinosaurs and Fossils (2) + May review"),
    (37, "Jun 14-18",   "Graduation"),
]

# Holiday gaps in the sheet (weeks that simply are not taught)
GAPS = {
    (6, 7):   "Oct 1-7 国庆 National Day holiday",
    (17, 18): "winter holiday",
    (21, 22): "Chinese New Year holiday (Feb 1-19)",
    (31, 32): "May 1-7 Labour Day holiday",
}

# The two legacy pages: sheet week -> (page, image dir, wc_ct key, guide pdf, route)
LEGACY = {
    3: ("public/circle-time.html", "week1", 2,
        "public/circle-guide.pdf", "/teachers"),
    4: ("public/circle-time-week2.html", "week2", 3,
        "public/circle-guide-week2.pdf", "/teachers-next"),
}


# Sheet weeks 1-2 are the August Back-to-School weeks; they have no circle-time
# page and never will. NOTE THE NAME COLLISION: public/circle-time-week1.html
# and circle-time-week2.html are the LEGACY files for sheet weeks 3 and 4, not
# for sheet weeks 1 and 2. Never build a page under those two filenames.
NEVER_BUILT = {1, 2}


def layout(n):
    if n in NEVER_BUILT:
        return (None, None, None, None, None)
    if n in LEGACY:
        return LEGACY[n]
    return ("public/circle-time-week%d.html" % n, "week%d" % n, n,
            "public/circle-guide-week%d.pdf" % n, "/teachers-w%d" % n)


def read(rel):
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
            return fh.read()
    except IOError:
        return ""


def decoded_weeks():
    md = read("docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md")
    return set(int(m) for m in re.findall(r"^## WEEK (\d+) ", md, re.M))


def scan():
    dec = decoded_weeks()
    nc = read("next.config.ts")
    mw = read("middleware.ts")
    rows = []
    for n, dates, theme in SHEET:
        page, imgtok, key, pdf, route = layout(n)
        if page is None:
            rows.append(dict(n=n, dates="(not taught)", theme=theme,
                             plan="n/a", page="n/a", pdf="n/a", prompts="n/a",
                             images="n/a", url="n/a", key="n/a"))
            continue

        plan = "decoded" if n in dec else ("principal (page built)"
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

        rows.append(dict(n=n, dates=dates or "(not taught)", theme=theme,
                         plan=plan, page=pg, pdf=pdf_s, prompts=pr,
                         images=im, url=url, key="wc_ct%d" % key))
    return rows


HEAD = ["Wk", "Dates", "Theme", "Plan", "Page", "PDF", "Prompts", "Images", "URL"]
KEYS = ["n", "dates", "theme", "plan", "page", "pdf", "prompts", "images", "url"]


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
                print("| | | _%s — no circle time_ | | | | | | |" % g)
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
    rows = [r for r in rows if r["page"] != "n/a"]
    built = [r["n"] for r in rows if r["page"] != "-"]
    noplan = [r["n"] for r in rows if r["plan"] == "MISSING"]
    art = [r["n"] for r in rows if r["page"] != "-" and r["images"] != "37/37"]
    print("")
    print("built pages      : %s" % (built or "none"))
    print("no plan yet      : %s" % (noplan or "none"))
    print("built, no art    : %s" % (art or "none"))
    todo = [r["n"] for r in rows if r["page"] == "-" and r["dates"] != "(not taught)"]
    print("still to build   : %s" % (todo or "none"))
    print("")
    print("next up          : %s" % (todo[:5] or "none"))


def main(argv):
    rows = scan()
    if "--next" in argv:
        todo = [r for r in rows if r["page"] == "-" and r["dates"] != "(not taught)"]
        for r in todo[:5]:
            print("week %-3d %-14s %s  [plan: %s]" %
                  (r["n"], r["dates"], r["theme"], r["plan"]))
        return 0
    emit(rows, markdown="--plain" not in argv)
    summary(rows)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
