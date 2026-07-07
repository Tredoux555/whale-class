#!/usr/bin/env python3
"""Merge all social-discovery CSVs into one import-ready file.
Keeps only rows with at least one social URL. Dedupes by (school_name,country),
preferring rows that carry a facebook_url."""
import csv, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "docs/outreach/social")
OUT = os.path.join(D, "global-social-merged.csv")
HEADER = ["school_name","country","facebook_url","fb_activity","instagram_url",
          "linkedin_url","x_url","email_found_incidentally","confidence","notes"]

best = {}
files = sorted(glob.glob(os.path.join(D, "disadvantaged-facebook-*.csv"))) + \
        sorted(glob.glob(os.path.join(D, "global-noweb-*.csv"))) + \
        [os.path.join(D, "global-script-pass.csv")]
for path in files:
    if not os.path.exists(path): continue
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            row = {h: (r.get(h) or "").strip() for h in HEADER}
            if not (row["facebook_url"] or row["instagram_url"] or row["linkedin_url"] or row["x_url"]):
                continue
            key = (row["school_name"].lower(), row["country"].lower())
            if key not in best or (row["facebook_url"] and not best[key]["facebook_url"]):
                best[key] = row

tmp = OUT + ".tmp"
with open(tmp, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, quoting=csv.QUOTE_ALL)
    w.writerow(HEADER)
    for row in best.values():
        w.writerow([row[h] for h in HEADER])
os.replace(tmp, OUT)
fb = sum(1 for r in best.values() if r["facebook_url"])
print(f"merged files={len(files)} rows={len(best)} with_facebook={fb}")
