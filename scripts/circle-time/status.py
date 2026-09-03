#!/usr/bin/env python3
"""status.py — current-state table for every circle-time week of 2026-27.

    python3 scripts/circle-time/status.py            # markdown table (default)
    python3 scripts/circle-time/status.py --plain    # aligned text
    python3 scripts/circle-time/status.py --next     # just what to build next

Scans public/, docs/circle-time/, next.config.ts and middleware.ts and prints
the table that docs/circle-time/HANDOFF-year-build.md carries, so the handoff
can be regenerated instead of hand-edited. Python 3 stdlib only.

WEEK NUMBERS ARE SITE WEEKS (1-36) — taught weeks counted from Sep 1 2026, the
numbering shown on the pages. The week list is NOT hardcoded here: it is parsed
straight out of public/circle-time-weeks.js, the one registration point. The
authority behind that manifest is docs/circle-time/YEAR_CALENDAR_2026-27.md.

The old "sheet = site + 2" offset is DEAD (the printed plan merges two weeks,
drops three and adds four), so there is no sheet column any more and the
decoded doc is looked up by SITE number: "## WEEK <site> ".
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))

MANIFEST = "public/circle-time-weeks.js"


def read(rel):
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
            return fh.read()
    except IOError:
        return ""


def manifest_weeks():
    """[(n, dates, theme, route, built, note)] parsed from the manifest."""
    js = read(MANIFEST)
    body = re.search(r"var WEEKS = \[(.*?)\n  \];", js, re.S)
    if not body:
        sys.exit("status.py: could not find the WEEKS array in " + MANIFEST)
    out = []
    for line in body.group(1).splitlines():
        line = line.strip().rstrip(",")
        if not line.startswith("{"):
            continue
        # JS object literal with bare keys -> quote them, then json.loads
        obj = re.sub(r"([{,]\s*)([A-Za-z_]\w*):", r'\1"\2":', line)
        d = json.loads(obj)
        out.append((d["n"], d.get("dates", ""), d.get("full", ""),
                    d.get("route"), bool(d.get("built")), d.get("note")))
    return out


# Weeks 1 and 2 shipped before the /teachers-w<N> convention and keep their
# historical routes (carried in the manifest). public/circle-time.html +
# public/circle-guide.pdf are the LIVE COPY of whichever week is current (the
# Sunday swap), not a week's own files, so they are not scanned here.


def layout(n, route):
    """(page, image-dir token, wc_ct key number, guide pdf, route) for week n."""
    return ("public/circle-time-week%d.html" % n, "week%d" % n, n,
            "public/circle-guide-week%d.pdf" % n,
            route or "/teachers-w%d" % n)


def decoded_weeks():
    """SITE week numbers that have a plan in the decoded doc."""
    md = read("docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md")
    return set(int(m) for m in re.findall(r"^## WEEK (\d+) ", md, re.M))


def scan():
    dec = decoded_weeks()
    nc = read("next.config.ts")
    mw = read("middleware.ts")
    rows = []
    for n, dates, theme, route, _built, note in manifest_weeks():
        page, imgtok, key, pdf, route = layout(n, route)

        plan = "decoded" if n in dec else (
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
                         note=note or ""))
    return rows


HEAD = ["Wk", "Dates", "Theme", "Plan", "Page", "PDF", "Prompts", "Images", "URL"]
KEYS = ["n", "dates", "theme", "plan", "page", "pdf", "prompts", "images", "url"]


def emit(rows, markdown=True):
    if markdown:
        print("| " + " | ".join(HEAD) + " |")
        print("|" + "|".join(["---"] * len(HEAD)) + "|")
        for r in rows:
            print("| " + " | ".join(str(r[k]) for k in KEYS) + " |")
            if r["note"]:
                print("| | | _%s_ | | | | | | |" % r["note"])
    else:
        w = [max(len(HEAD[i]), max(len(str(r[KEYS[i]])) for r in rows))
             for i in range(len(HEAD))]
        print("  ".join(HEAD[i].ljust(w[i]) for i in range(len(HEAD))))
        print("  ".join("-" * w[i] for i in range(len(HEAD))))
        for r in rows:
            print("  ".join(str(r[KEYS[i]]).ljust(w[i]) for i in range(len(HEAD))))
            if r["note"]:
                print("   -- %s --" % r["note"])


def summary(rows):
    built = [r["n"] for r in rows if r["page"] != "-"]
    noplan = [r["n"] for r in rows if r["plan"] == "MISSING"]
    art = [r["n"] for r in rows if r["page"] != "-" and r["images"] != "37/37"]
    todo = [r["n"] for r in rows if r["page"] == "-"]
    unwired = [r["n"] for r in rows if "NOT WIRED" in r["url"]]
    print("")
    print("week numbering   : SITE weeks 1-%d (docs/circle-time/YEAR_CALENDAR_2026-27.md)"
          % (rows[-1]["n"] if rows else 0))
    print("built pages      : %s" % (built or "none"))
    print("no plan yet      : %s" % (noplan or "none"))
    print("built, no art    : %s" % (art or "none"))
    print("built, NOT WIRED : %s" % (unwired or "none"))
    print("still to build   : %s" % (todo or "none"))
    print("")
    print("next up          : %s" % (todo[:5] or "none"))


def main(argv):
    rows = scan()
    if "--next" in argv:
        todo = [r for r in rows if r["page"] == "-"]
        for r in todo[:5]:
            print("week %-3d %-14s %s  [plan: %s]" %
                  (r["n"], r["dates"], r["theme"], r["plan"]))
        return 0
    emit(rows, markdown="--plain" not in argv)
    summary(rows)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
