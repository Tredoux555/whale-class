#!/usr/bin/env python3
"""check_week.py — WEEK_BUILD_SPEC §10 verification for one circle-time week.

Usage:
    python3 scripts/circle-time/check_week.py 32
    python3 scripts/circle-time/check_week.py 32 33 34 35 36
    python3 scripts/circle-time/check_week.py --all        # every built week

Run from anywhere; the repo root is found by walking up from this file.
Python 3 standard library only — it must run on Tredoux's Mac with no pip installs.

Numbering: NN is the SHEET week number. Two legacy pages break the
circle-time-week<NN>.html rule and are handled explicitly (see PAGE_FOR_WEEK):
    sheet week 3 -> public/circle-time.html      (+ archive circle-time-week1.html)
    sheet week 4 -> public/circle-time-week2.html
Everything from sheet week 5 on is public/circle-time-week<NN>.html.

Exit code 0 = every check passed, 1 = at least one FAIL, 2 = usage/IO error.
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))

EXPECT_IMG_REFS = 43       # <img src> occurrences pointing at this week's image dir
EXPECT_UNIQUE_IMGS = 37    # unique image files (8 posters + 28 cards + 1 badge)
EXPECT_FALLBACK = 44       # 1 function definition + 43 onerror handlers
EXPECT_PROMPTS = 37
LINES_MIN, LINES_MAX = 900, 1150
PRINT_PACK_PAGES = 18

# ---------------------------------------------------------------- layout ---

def page_for_week(n):
    """Return (page_path, image_dir_token, session_key_number) for sheet week n."""
    if n == 3:
        return "public/circle-time.html", "week1", 2
    if n == 4:
        return "public/circle-time-week2.html", "week2", 3
    return "public/circle-time-week%d.html" % n, "week%d" % n, n


def prompts_for_week(n):
    return "docs/circle-time/mj-prompts-week%d.md" % n

# ---------------------------------------------------------------- report ---

class Report(object):
    def __init__(self, title):
        self.title = title
        self.fails = 0
        self.warns = 0
        print("")
        print("=" * 72)
        print(title)
        print("=" * 72)

    def check(self, ok, label, detail=""):
        tag = "PASS" if ok else "FAIL"
        if not ok:
            self.fails += 1
        print("%-4s  %-46s %s" % (tag, label, detail))

    def warn(self, label, detail=""):
        self.warns += 1
        print("%-4s  %-46s %s" % ("WARN", label, detail))

    def note(self, label, detail=""):
        print("%-4s  %-46s %s" % ("  ..", label, detail))

# ---------------------------------------------------------------- checks ---

def check_week(n):
    rel, imgtok, keyn = page_for_week(n)
    path = os.path.join(ROOT, rel)
    r = Report("Week %d  ->  %s" % (n, rel))

    if not os.path.isfile(path):
        r.check(False, "page exists", rel)
        return r

    with open(path, "r", encoding="utf-8") as fh:
        html = fh.read()
    lines = html.count("\n") + 1
    r.check(True, "page exists", "%d lines" % lines)

    # --- 1. image references -------------------------------------------
    refs = re.findall(r"circle-time-images/%s/([A-Za-z0-9._-]+)" % imgtok, html)
    r.check(len(refs) == EXPECT_IMG_REFS,
            "%d image refs to week dir" % EXPECT_IMG_REFS,
            "found %d" % len(refs))
    uniq = sorted(set(refs))
    r.check(len(uniq) == EXPECT_UNIQUE_IMGS,
            "%d unique image files" % EXPECT_UNIQUE_IMGS,
            "found %d" % len(uniq))

    # --- 2. imgFallback -------------------------------------------------
    # Every <img> must degrade to an emoji so a page can ship before its art.
    # public/circle-time.html + circle-time-week1.html (sheet week 3) predate
    # the pattern; their 37 images are all on disk, so it is a WARN there.
    idir_early = os.path.join(ROOT, "public", "circle-time-images", imgtok)
    art_complete = (os.path.isdir(idir_early) and
                    len([f for f in os.listdir(idir_early) if f.endswith(".jpg")])
                    >= EXPECT_UNIQUE_IMGS)
    nfb = len(re.findall(r"imgFallback", html))
    if nfb >= EXPECT_FALLBACK:
        r.check(True, "imgFallback >= %d" % EXPECT_FALLBACK, "found %d" % nfb)
    elif art_complete:
        r.warn("imgFallback >= %d" % EXPECT_FALLBACK,
               "found %d — legacy page, but all %d images are on disk"
               % (nfb, EXPECT_UNIQUE_IMGS))
    else:
        r.check(False, "imgFallback >= %d" % EXPECT_FALLBACK, "found %d" % nfb)

    # --- 3. only its own week token ------------------------------------
    # Every "week<digits>" token in the file must be this week's.
    toks = sorted(set(int(m) for m in re.findall(r"week(\d+)", html)))
    own = int(imgtok.replace("week", ""))
    stray = [t for t in toks if t != own]
    r.check(not stray, "only its own week token (week%d)" % own,
            "stray: %s" % (stray or "none"))

    # --- 4. every printSection id exists -------------------------------
    called = sorted(set(re.findall(r"printSection\('([^']+)'\)", html)))
    ids = set(re.findall(r'id="([^"]+)"', html))
    missing = [c for c in called if c not in ids]
    r.check(not missing, "all %d printSection ids exist" % len(called),
            "missing: %s" % (missing or "none"))

    # --- 5. structural ids ---------------------------------------------
    need = ["day%d" % i for i in range(1, 9)] + \
           ["sng-chords", "sng-chorus", "sng-verses", "sng-uketips"]
    absent = [i for i in need if i not in ids]
    r.check(not absent, "day1-day8 + sng-* ids present",
            "missing: %s" % (absent or "none"))

    # --- 6. gate --------------------------------------------------------
    keys = sorted(set(re.findall(r"wc_ct(\d+)", html)))
    r.check(keys == [str(keyn)], "sessionStorage key wc_ct%d only" % keyn,
            "found wc_ct%s" % (",".join(keys) or "<none>"))
    r.check("THISDL" in html, "password THISDL present")

    # --- 7. print pack --------------------------------------------------
    btn = re.search(r"Print the whole pack \((\d+) pages\)", html)
    r.check(bool(btn) and int(btn.group(1)) == PRINT_PACK_PAGES,
            "print-pack button says %d pages" % PRINT_PACK_PAGES,
            btn.group(0) if btn else "button not found")

    # --- 8. week navigation --------------------------------------------
    # CURRENT model (since 2026-09-03): a shared week-tab strip rendered from
    # public/circle-time-weeks.js. The older <details id="weekpicker"> "Other
    # weeks" list was deliberately removed from every page — two lists to keep
    # in sync is exactly the bug the strip fixed. See WEEK_BUILD_SPEC §4.
    dw = re.search(r'id="week-tabs"\s+data-week="(\d+)"', html)
    r.check(bool(dw), "week-tabs host present",
            'data-week="%s"' % (dw.group(1) if dw else "?"))
    if dw:
        # data-week uses the MANIFEST number, which for the two legacy pages is
        # the legacy site number (1 and 2), not the sheet number.
        want = {3: 1, 4: 2}.get(n, n)
        r.check(int(dw.group(1)) == want,
                "data-week == %d" % want, dw.group(1))
    r.check("circle-time-weeks.js" in html, "circle-time-weeks.js loaded")
    if 'id="weekpicker"' in html:
        r.warn("legacy weekpicker still present",
               "remove it — the week-tab strip replaced it")

    # --- 9. size --------------------------------------------------------
    r.check(LINES_MIN <= lines <= LINES_MAX,
            "line count in %d-%d" % (LINES_MIN, LINES_MAX), str(lines))

    # --- 10. prompts file ----------------------------------------------
    prel = prompts_for_week(n)
    ppath = os.path.join(ROOT, prel)
    if not os.path.isfile(ppath):
        r.note("prompts file", "%s not present yet (skipped)" % prel)
    else:
        with open(ppath, "r", encoding="utf-8") as fh:
            md = fh.read()
        # Prompt files exist in three hand-written layouts (plain "1. `f.png` -",
        # "**1. `f.png`**" with the prompt on the next line, and "1. **f.png** -").
        # Parse on the filename, not the numbering.
        pngs = re.findall(r"ct-week%d-[a-z0-9-]+\.png" % n, md)
        pset = set(f[:-4] + ".jpg" for f in pngs)
        r.check(len(pset) == EXPECT_PROMPTS,
                "%s: %d prompts" % (os.path.basename(prel), EXPECT_PROMPTS),
                "found %d unique filenames" % len(pset))
        hset = set(uniq)
        only_p = sorted(pset - hset)
        only_h = sorted(hset - pset)
        r.check(not only_p and not only_h,
                "prompt filenames == HTML img srcs",
                ("ok" if not (only_p or only_h)
                 else "prompts-only=%s html-only=%s" % (only_p, only_h)))
        # every prompt must carry the locked flags
        body = [ln for ln in md.split("\n") if "--stylize" in ln or "--ar " in ln]
        flagged = [ln for ln in body if "--raw" in ln and "--stylize 50" in ln
                   and re.search(r"--ar (3:4|1:1)", ln)]
        r.check(len(flagged) >= EXPECT_PROMPTS,
                "prompts carry --raw --stylize 50 --ar",
                "%d/%d prompt lines" % (len(flagged), EXPECT_PROMPTS))

    # --- 11. images on disk (informational) -----------------------------
    idir = os.path.join(ROOT, "public", "circle-time-images", imgtok)
    if os.path.isdir(idir):
        have = set(f for f in os.listdir(idir) if f.endswith(".jpg"))
        gap = sorted(set(uniq) - have)
        if gap:
            r.warn("images on disk", "%d/%d — missing %d" %
                   (len(have & set(uniq)), EXPECT_UNIQUE_IMGS, len(gap)))
        else:
            r.note("images on disk", "%d/%d complete" % (len(have), EXPECT_UNIQUE_IMGS))
    else:
        r.warn("images on disk", "public/circle-time-images/%s/ not created yet "
                                 "(page still renders via imgFallback emoji)" % imgtok)

    # --- 12. guide PDF + routing (informational) ------------------------
    pdf = "public/circle-guide.pdf" if n == 3 else (
          "public/circle-guide-week2.pdf" if n == 4 else
          "public/circle-guide-week%d.pdf" % n)
    if os.path.isfile(os.path.join(ROOT, pdf)):
        kb = os.path.getsize(os.path.join(ROOT, pdf)) // 1024
        r.note("guide PDF", "%s (%d KB)" % (pdf, kb))
    else:
        r.warn("guide PDF", "%s missing" % pdf)

    route = "/teachers" if n == 3 else ("/teachers-next" if n == 4 else "/teachers-w%d" % n)
    try:
        nc = open(os.path.join(ROOT, "next.config.ts"), encoding="utf-8").read()
        mw = open(os.path.join(ROOT, "middleware.ts"), encoding="utf-8").read()
        r.check(("'%s'" % route) in nc, "next.config.ts rewrite", route)
        r.check(("'%s'" % route) in mw, "middleware.ts publicPaths", route)
        pdfroute = "/" + os.path.basename(pdf)
        r.check(("'%s'" % pdfroute) in mw,
                "middleware.ts publicPaths (PDF)", pdfroute)
    except IOError as e:
        r.warn("routing files", str(e))

    return r


def built_weeks():
    out = []
    for n in range(1, 38):
        rel, _, _ = page_for_week(n)
        if os.path.isfile(os.path.join(ROOT, rel)):
            out.append(n)
    return out


def main(argv):
    args = argv[1:]
    if not args:
        print(__doc__)
        return 2
    weeks = built_weeks() if args[0] in ("--all", "-a") else []
    if not weeks:
        try:
            weeks = [int(a) for a in args]
        except ValueError:
            print("usage: check_week.py <NN> [NN ...] | --all")
            return 2

    reports = [check_week(n) for n in weeks]
    print("")
    print("-" * 72)
    bad = 0
    for n, r in zip(weeks, reports):
        state = "FAIL (%d)" % r.fails if r.fails else "PASS"
        if r.warns:
            state += "  +%d warn" % r.warns
        print("week %-3d %s" % (n, state))
        bad += r.fails
    print("-" * 72)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
