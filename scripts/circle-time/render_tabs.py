#!/usr/bin/env python3
"""render_tabs.py — bake the week-tab strip into every circle-time page.

    python3 scripts/circle-time/render_tabs.py            # rewrite every page
    python3 scripts/circle-time/render_tabs.py --check     # report only, write nothing
    python3 scripts/circle-time/render_tabs.py public/circle-time-week7.html

WHY: the strip used to be built by JavaScript on DOMContentLoaded, so it
flashed in a moment after the rest of the page (visible on every week-to-week
click). This script renders the SAME markup at build time and writes it into
each page's <div id="week-tabs">, plus the strip's <style> into <head>, so the
strip is on screen at first paint. public/circle-time-weeks.js then only
highlights / scrolls it (it renders client-side only if the strip is empty).

SINGLE SOURCE OF TRUTH: the markup and the CSS both come out of
public/circle-time-weeks.js itself — this script shells out to `node` and calls
the manifest's own window.WHALE_WEEK_TABS_HTML(dataWeek) and
window.WHALE_WEEK_TABS_CSS. It never re-implements either.

RUN IT AFTER ANY EDIT TO public/circle-time-weeks.js (new week, built:true, a
renamed route, a date fix) — otherwise the baked strips go stale.

Each page's own week number is read from its data-week attribute; the script
never invents one. Python 3 stdlib + node.
"""

import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
MANIFEST = os.path.join(ROOT, "public", "circle-time-weeks.js")

START = "<!-- week-tabs:start -->"
END = "<!-- week-tabs:end -->"
CSS_START = "<!-- week-tabs-css:start -->"
CSS_END = "<!-- week-tabs-css:end -->"

HOST_RE = re.compile(
    r'(<div id="week-tabs" data-week="(\d+)"\s*>)(.*?)(</div>)', re.S)
CSS_BLOCK_RE = re.compile(
    re.escape(CSS_START) + r".*?" + re.escape(CSS_END), re.S)


def pages():
    pub = os.path.join(ROOT, "public")
    out = []
    for f in sorted(os.listdir(pub)):
        if re.fullmatch(r"circle-time(-week\d+)?\.html", f):
            out.append(os.path.join(pub, f))
    return out


def node_render(weeks):
    """Ask node for {css, tabs:{week: html}} straight out of the manifest."""
    script = """
const fs=require('fs');
global.window={}; global.document={readyState:'complete',
  getElementById:()=>null, addEventListener(){}, createElement:()=>({}),
  head:{appendChild(){}}, documentElement:{style:{setProperty(){}}}};
eval(fs.readFileSync(process.argv[1],'utf8'));
const weeks=JSON.parse(process.argv[2]);
const tabs={};
for (const n of weeks) tabs[n]=window.WHALE_WEEK_TABS_HTML(n);
process.stdout.write(JSON.stringify({css:window.WHALE_WEEK_TABS_CSS,tabs}));
"""
    p = subprocess.run(["node", "-e", script, MANIFEST, json.dumps(weeks)],
                       capture_output=True, text=True)
    if p.returncode != 0:
        sys.stderr.write(p.stderr)
        raise SystemExit("node failed reading %s" % MANIFEST)
    return json.loads(p.stdout)


def render(path, css, tabs_for_week, write=True):
    with open(path, encoding="utf-8") as fh:
        html = fh.read()
    m = HOST_RE.search(html)
    if not m:
        return (os.path.basename(path), "NO week-tabs HOST", False)
    week = int(m.group(2))
    if week not in tabs_for_week:
        return (os.path.basename(path), "week %d not in manifest" % week, False)

    body = START + tabs_for_week[week] + END
    new = html[:m.start(3)] + body + html[m.end(3):]

    css_block = (CSS_START + '<style id="week-tabs-css">' + css
                 + "</style>" + CSS_END)
    if CSS_BLOCK_RE.search(new):
        new = CSS_BLOCK_RE.sub(lambda _: css_block, new, count=1)
    else:
        i = new.find("</head>")
        if i < 0:
            return (os.path.basename(path), "no </head>", False)
        new = new[:i] + css_block + "\n" + new[i:]

    changed = new != html
    if changed and write:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
    return (os.path.basename(path),
            "week %d · %s" % (week, "updated" if changed else "already current"),
            True)


def main(argv):
    args = [a for a in argv if not a.startswith("-")]
    write = "--check" not in argv
    targets = [os.path.abspath(a) for a in args] or pages()

    weeks = []
    for p in targets:
        m = HOST_RE.search(open(p, encoding="utf-8").read())
        if m:
            weeks.append(int(m.group(2)))
    data = node_render(sorted(set(weeks)))

    bad = 0
    for p in targets:
        name, msg, ok = render(p, data["css"], {int(k): v for k, v in
                                                data["tabs"].items()}, write)
        print("%-4s %-28s %s" % ("ok" if ok else "FAIL", name, msg))
        if not ok:
            bad += 1
    print("")
    print("%d page(s), %d problem(s)%s"
          % (len(targets), bad, "  [--check: nothing written]" if not write else ""))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
