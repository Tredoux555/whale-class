#!/usr/bin/env python3
"""Social script-pass: crawl each outreach row's own website homepage and
harvest facebook/instagram/linkedin/x links + incidental mailto emails.
Zero AI. Stdlib only. Resumable (skips schools already in the output CSV).

Input : docs/outreach/Montree_Global_Master_Jul2026.csv
Output: docs/outreach/social/global-script-pass.csv  (import-ready header)
Log   : docs/outreach/social/global-script-pass.log
"""
import csv, os, re, ssl, sys, threading, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs/outreach/Montree_Global_Master_Jul2026.csv")
OUT = os.path.join(ROOT, "docs/outreach/social/global-script-pass.csv")
LOG = os.path.join(ROOT, "docs/outreach/social/global-script-pass.log")
HEADER = ["school_name","country","facebook_url","fb_activity","instagram_url",
          "linkedin_url","x_url","email_found_incidentally","confidence","notes"]
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
lock = threading.Lock()

FB_BAD = re.compile(r"sharer|share\.php|/plugins/|/dialog/|/login|/tr\?|/tr/|/policies|/help|/legal|/privacy|facebook\.com/?$|/hashtag/", re.I)
def clean(u):
    u = u.strip().rstrip('.,;)\'"')
    u = re.sub(r"[?#].*$", "", u).rstrip("/")
    if u.startswith("//"): u = "https:" + u
    return u

def pick(html, pattern, bad=None, post_ok=True):
    for m in re.finditer(pattern, html, re.I):
        u = clean(m.group(0))
        if bad and bad.search(u): continue
        if not post_ok and re.search(r"/(p|reel|posts|status)/", u): continue
        if len(u) > 200: continue
        return u
    return ""

def harvest(html):
    fb = pick(html, r"(?:https?:)?//(?:www\.|m\.|web\.|business\.)?facebook\.com/[A-Za-z0-9.\-_%/]+", FB_BAD)
    ig = pick(html, r"(?:https?:)?//(?:www\.)?instagram\.com/[A-Za-z0-9.\-_%/]+", re.compile(r"/(p|reel|explore|accounts)/", re.I))
    li = pick(html, r"(?:https?:)?//(?:[a-z]{2,3}\.)?linkedin\.com/(?:company|school|in)/[A-Za-z0-9.\-_%]+")
    x  = pick(html, r"(?:https?:)?//(?:www\.)?(?:twitter|x)\.com/[A-Za-z0-9_]+", re.compile(r"/(intent|share|home|search|hashtag)", re.I))
    em = ""
    m = re.search(r"mailto:([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})", html)
    if m and not re.search(r"example\.|sentry|wixpress|@.*\.(png|jpg)", m.group(1), re.I): em = m.group(1).lower()
    return fb, ig, li, x, em

def fetch(url):
    if not re.match(r"https?://", url): url = "https://" + url
    for candidate in (url, url.replace("https://", "http://", 1)):
        try:
            req = urllib.request.Request(candidate, headers=UA)
            with urllib.request.urlopen(req, timeout=12, context=CTX) as r:
                return r.read(600_000).decode("utf-8", "ignore")
        except Exception:
            continue
    return None

def main():
    done = set()
    if os.path.exists(OUT):
        with open(OUT, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f): done.add((row["school_name"], row["country"]))
    else:
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        with open(OUT, "w", newline="", encoding="utf-8") as f:
            csv.writer(f, quoting=csv.QUOTE_ALL).writerow(HEADER)

    with open(SRC, newline="", encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if (r.get("Website") or "").strip()]
    todo = [r for r in rows if (r.get("School","").strip(), r.get("Country","").strip()) not in done]
    log = open(LOG, "a", buffering=1)
    log.write(f"START pending={len(todo)} of websited={len(rows)}\n")
    out = open(OUT, "a", newline="", encoding="utf-8", buffering=1)
    w = csv.writer(out, quoting=csv.QUOTE_ALL)
    stats = {"n": 0, "fb": 0}

    def work(r):
        html = fetch(r["Website"].strip())
        fb = ig = li = x = em = ""
        if html: fb, ig, li, x, em = harvest(html)
        with lock:
            stats["n"] += 1
            if fb: stats["fb"] += 1
            if fb or ig or li or x:
                w.writerow([r.get("School","").strip(), r.get("Country","").strip(), fb, "", ig, li, x, em,
                            "high" if fb else "medium", "script pass: found on school website"])
            if stats["n"] % 100 == 0:
                log.write(f"progress {stats['n']}/{len(todo)} fb_hits={stats['fb']}\n")

    with ThreadPoolExecutor(max_workers=24) as ex:
        list(as_completed([ex.submit(work, r) for r in todo]))
    log.write(f"DONE processed={stats['n']} fb_hits={stats['fb']}\n")
    out.close(); log.close()

if __name__ == "__main__":
    main()
