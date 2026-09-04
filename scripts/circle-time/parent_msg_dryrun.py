import re, sys, html

ROOT = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/public"

def extract_day(section_html, n):
    out = {}
    m = re.search(r'<h2>Day \d+ · (.*?)</h2>', section_html)
    out['subtitle'] = html.unescape(re.sub('<[^>]+>', '', m.group(1))) if m else None
    m = re.search(r"Today's words:\s*<b>(.*?)</b>", section_html)
    if m:
        words = re.sub('<[^>]+>', '', m.group(1))
        words = html.unescape(words)
        words = [w.strip() for w in re.split(r'·|,', words) if w.strip()]
        out['words'] = words
    else:
        out['words'] = []
    # find all Everyone-quoted lines, take the last one (closing chant)
    quotes = re.findall(r'<span class="who">Everyone</span>(.*?)</div>', section_html, re.S)
    closing = None
    if quotes:
        raw = quotes[-1]
        raw = re.sub(r'<span class="g">.*?</span>', '', raw, flags=re.S)
        raw = re.sub('<[^>]+>', '', raw)
        raw = html.unescape(raw).strip()
        raw = raw.strip('“”"')
        closing = raw
    out['closing'] = closing
    return out

def get_sections(html_text):
    days = {}
    for n in range(1, 6):
        m = re.search(r'<section class="day" id="day%d"[^>]*>(.*?)</section>' % n, html_text, re.S)
        if m:
            days[n] = extract_day(m.group(1), n)
    return days

for wk in [1, 2, 5, 11, 20, 25, 30, 36]:
    path = f"{ROOT}/circle-time-week{wk}.html"
    try:
        with open(path, encoding='utf-8') as f:
            txt = f.read()
    except FileNotFoundError:
        print(f"week {wk}: MISSING FILE")
        continue
    days = get_sections(txt)
    print(f"===== WEEK {wk} ({len(days)} days found) =====")
    for n, d in days.items():
        print(f"  Day {n}: subtitle={d['subtitle']!r} words={d['words']} closing={d['closing']!r}")
