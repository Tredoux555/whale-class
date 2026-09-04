import re
ROOT = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/public"
bad = []
total_pmsg = 0
for wk in range(1, 37):
    path = f"{ROOT}/circle-time-week{wk}.html"
    with open(path, encoding='utf-8') as f:
        txt = f.read()
    nsec_open = len(re.findall(r'<section class="day"', txt))
    nsec_close = len(re.findall(r'</section>', txt))
    npmsg = len(re.findall(r'<div class="pmsg">', txt))
    ncopybtn = len(re.findall(r'class="copy-btn"', txt))
    has_css = '.pmsg{' in txt
    has_js = 'fallbackCopyPM' in txt
    total_pmsg += npmsg
    issues = []
    if nsec_open != 8: issues.append(f"open sections={nsec_open}")
    if nsec_close != 8: issues.append(f"close sections={nsec_close}")
    if npmsg != ncopybtn: issues.append(f"pmsg={npmsg} vs copybtn={ncopybtn}")
    if not has_css: issues.append("no CSS")
    if not has_js: issues.append("no JS")
    if npmsg not in (4, 5): issues.append(f"unexpected pmsg count={npmsg}")
    if issues:
        bad.append((wk, "; ".join(issues)))
if bad:
    print(f"{len(bad)} weeks with issues:")
    for wk, msg in bad: print(f"  week {wk}: {msg}")
else:
    print(f"ALL 36 WEEKS STRUCTURALLY CLEAN. Total pmsg boxes: {total_pmsg}")
