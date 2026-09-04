import re

ROOT = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/public"
TAIL_ANCHOR = "document.getElementById('pw').addEventListener('keydown',function(e){if(e.key==='Enter')go()});\n  })();\n</script>\n<script src=\"/circle-time-weeks.js\" defer></script>"
CSS_ANCHOR = ".tip{font-size:.92rem; color:var(--ink-soft); margin:8px 0 0}"

bad = []
for wk in range(1, 37):
    path = f"{ROOT}/circle-time-week{wk}.html"
    try:
        with open(path, encoding='utf-8') as f:
            txt = f.read()
    except FileNotFoundError:
        bad.append((wk, "MISSING FILE"))
        continue
    issues = []
    nsec = len(re.findall(r'<section class="day" id="day\d"', txt))
    if nsec != 8:
        issues.append(f"section count={nsec}")
    nwords = len(re.findall(r"Today's words:", txt))
    if nwords != 5:
        issues.append(f"words-lines={nwords}")
    if TAIL_ANCHOR not in txt:
        issues.append("TAIL_ANCHOR missing")
    if CSS_ANCHOR not in txt:
        issues.append("CSS_ANCHOR missing")
    for n in range(1, 6):
        m = re.search(r'<section class="day" id="day%d"[^>]*>(.*?)</section>' % n, txt, re.S)
        if not m:
            issues.append(f"day{n} section not found")
    if issues:
        bad.append((wk, "; ".join(issues)))

if bad:
    print(f"{len(bad)} weeks with issues:")
    for wk, msg in bad:
        print(f"  week {wk}: {msg}")
else:
    print("ALL 36 WEEKS CLEAN")
