#!/usr/bin/env python3
"""Match ~/Downloads MJ picks to REROLL_RUN_QUEUE_JUL14 items by prompt-prefix in filename."""
import json, os, re, time, sys

REPO = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
DL = "/Users/tredouxwillemse/Downloads"
CUTOFF = time.mktime(time.strptime("2026-07-14 15:30", "%Y-%m-%d %H:%M"))

q = json.load(open(f"{REPO}/docs/curriculum/video-audit/REROLL_RUN_QUEUE_JUL14.json"))
items = []
for e in q:
    prompt = e.get("final_prompt") or e["mj_prompt"]
    items.append({"n": e["n"], "week": e["week"], "filename": e["filename"], "prompt": prompt})

def norm(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return s.strip()

UUID_RE = re.compile(r"_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_\d+(?: \(\d+\))?$")

files = []
for f in os.listdir(DL):
    if not f.lower().endswith(".png"):
        continue
    p = os.path.join(DL, f)
    mt = os.path.getmtime(p)
    if mt < CUTOFF:
        continue
    core = f[:-4]
    core = re.sub(r"^u\d+_", "", core)
    core = UUID_RE.sub("", core)
    files.append({"file": f, "mtime": mt, "core_norm": norm(core)})

files.sort(key=lambda x: x["mtime"])

results = []
for fi in files:
    cands = []
    for it in items:
        pn = norm(it["prompt"])
        L = min(len(fi["core_norm"]), len(pn), 40)
        if L < 15:
            continue
        if pn[:L] == fi["core_norm"][:L]:
            cands.append(it["n"])
    results.append({"file": fi["file"], "mtime": time.strftime("%H:%M:%S", time.localtime(fi["mtime"])), "candidates": cands})

by_item = {it["n"]: [] for it in items}
unmatched = []
for r in results:
    if not r["candidates"]:
        unmatched.append(r)
    else:
        for n in r["candidates"]:
            by_item[n].append(r["file"])

exact, ambiguous, missing = [], [], []
for it in items:
    n = it["n"]
    fs = by_item[n]
    shared = any(len(r["candidates"]) > 1 and n in r["candidates"] for r in results)
    if not fs:
        missing.append(n)
    elif len(fs) == 1 and not shared:
        exact.append((n, fs[0]))
    else:
        ambiguous.append((n, fs))

out = {"exact": [{"n": n, "week": next(i["week"] for i in items if i["n"] == n),
                  "target": next(i["filename"] for i in items if i["n"] == n), "file": f}
                 for n, f in exact],
       "ambiguous": [{"n": n, "week": next(i["week"] for i in items if i["n"] == n),
                      "target": next(i["filename"] for i in items if i["n"] == n), "files": fs}
                     for n, fs in ambiguous],
       "missing": missing,
       "unmatched_files": [r["file"] for r in unmatched],
       "total_files": len(files)}
json.dump(out, open(f"{REPO}/docs/curriculum/video-audit/RECONCILE_MATCH_JUL14.json", "w"), indent=2)
print(f"files considered: {len(files)}")
print(f"EXACT: {len(exact)}  AMBIGUOUS-ITEMS: {len(ambiguous)}  MISSING: {len(missing)}  UNMATCHED FILES: {len(unmatched)}")
print("missing items:", missing)
for n, fs in ambiguous:
    print(f"ambig #{n}:", len(fs), "files")
for r in unmatched:
    print("unmatched:", r["file"])
