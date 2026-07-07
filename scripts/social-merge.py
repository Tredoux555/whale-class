#!/usr/bin/env python3
"""Merge all social-discovery CSVs into one import-ready file.
Keeps only rows with at least one social URL. Dedupes by (school_name,country),
preferring rows that carry a facebook_url.

FINAL OVERRIDE LAYER: verify-medium-*.csv contains ONLY problem rows from a
verification pass over medium-confidence facebook URLs, applied AFTER the
normal merge, keyed on the same (school_name,country) normalization:
  - notes starting "VERIFY-FIX: was <old url>"  -> replace facebook_url with
    the corrected URL in this row + append this row's notes to the merged
    row's notes.
  - blank facebook_url + notes starting "VERIFY-FAIL: <reason>" -> blank out
    the merged row's facebook_url (previously-merged URL is wrong/unverifiable)
    + append the VERIFY-FAIL note to its notes.
This layer runs LAST and is NOT subject to the generic "non-empty wins"
dedupe logic above (that logic would otherwise let a blank VERIFY-FAIL
facebook_url lose to the existing non-empty one and never blank it out)."""
import csv, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "docs/outreach/social")
OUT = os.path.join(D, "global-social-merged.csv")
HEADER = ["school_name","country","facebook_url","fb_activity","instagram_url",
          "linkedin_url","x_url","email_found_incidentally","confidence","notes"]

def norm_key(row):
    return (row["school_name"].lower(), row["country"].lower())

best = {}
files = sorted(glob.glob(os.path.join(D, "disadvantaged-facebook-*.csv"))) + \
        sorted(glob.glob(os.path.join(D, "global-noweb-*.csv"))) + \
        sorted(glob.glob(os.path.join(D, "global-leftover-*.csv"))) + \
        [os.path.join(D, "global-script-pass.csv")]
for path in files:
    if not os.path.exists(path): continue
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            row = {h: (r.get(h) or "").strip() for h in HEADER}
            if not (row["facebook_url"] or row["instagram_url"] or row["linkedin_url"] or row["x_url"]):
                continue
            key = norm_key(row)
            if key not in best or (row["facebook_url"] and not best[key]["facebook_url"]):
                best[key] = row

# --- FINAL OVERRIDE LAYER: verify-medium-*.csv ---
verify_files = sorted(glob.glob(os.path.join(D, "verify-medium-*.csv")))
fix_count = 0
fail_count = 0
unmatched = []
for path in verify_files:
    if not os.path.exists(path): continue
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            row = {h: (r.get(h) or "").strip() for h in HEADER}
            notes = row["notes"]
            key = norm_key(row)
            target = best.get(key)
            if target is None:
                unmatched.append(row["school_name"])
                continue
            if notes.startswith("VERIFY-FIX"):
                target["facebook_url"] = row["facebook_url"]
                target["notes"] = (target["notes"] + " | " + notes).strip(" |")
                fix_count += 1
            elif notes.startswith("VERIFY-FAIL"):
                target["facebook_url"] = ""
                target["notes"] = (target["notes"] + " | " + notes).strip(" |")
                fail_count += 1

tmp = OUT + ".tmp"
with open(tmp, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, quoting=csv.QUOTE_ALL)
    w.writerow(HEADER)
    for row in best.values():
        w.writerow([row[h] for h in HEADER])
os.replace(tmp, OUT)
fb = sum(1 for r in best.values() if r["facebook_url"])
print(f"merged files={len(files)} rows={len(best)} with_facebook={fb}")
print(f"verify_files={len(verify_files)} verify_fix_applied={fix_count} verify_fail_blanked={fail_count} verify_unmatched={len(unmatched)}")
if unmatched:
    print("unmatched verify rows:")
    for name in unmatched:
        print(f"  - {name}")
