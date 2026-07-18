#!/usr/bin/env python3
"""File the 23 disambiguated reroll picks: archive original, copy download into place."""
import os, shutil, json

BASE = "/Users/tredouxwillemse/Desktop/English Curriculum 2026"
DL = "/Users/tredouxwillemse/Downloads"

# n: (week, target_filename, unique uuid fragment of the download file)
ASSIGN = {
    15: (9,  "hat.png",                "d2ca1ddd"),
    16: (9,  "potato-hat.png",         "c539d281"),
    23: (13, "big-dog-and-pig.png",    "1907705a"),
    24: (13, "big-dog-hiding.png",     "2653c527"),
    25: (13, "big-dog-meets-cat.png",  "4ca13b11"),
    26: (13, "potato-and-big-dog.png", "c0829623"),
    28: (14, "hens-on-man.png",        "bf301f22"),
    29: (14, "man-chasing-hens.png",   "41d83950"),
    30: (16, "cast-summit-party.png",  "3d247f2c"),
    31: (16, "muddy-cast.png",         "1f9a4858"),
    39: (26, "graduation-cast.png",    "091011e9"),
    42: (30, "sheep-got-bell.png",     "9e26828c"),
    51: (34, "sheep-on-sled.png",      "4ea95777"),
    60: (49, "bird-better.png",        "79270aa6"),
    63: (49, "segina-help.png",        "fd3f5090"),
    65: (50, "sheep-on-seat.png",      "1eeb4cd9"),
    66: (50, "sheep-on-ship.png",      "58e9e5b7"),
    67: (50, "sheep-sees-ship.png",    "2c6b99bb"),
    79: (55, "fly-cant-fly.png",       "95aa987b"),
    81: (55, "fly-happy.png",          "82307688"),
    82: (55, "fly-sad.png",            "b15e787b"),
    83: (55, "fly-shy.png",            "67616338"),
    85: (56, "lamb-climb.png",         "c5d34ec4"),
    88: (56, "lamb.png",               "e6a95279"),
}

dl_files = os.listdir(DL)
report = []
for n, (wk, target, frag) in sorted(ASSIGN.items()):
    src_matches = [f for f in dl_files if frag in f and f.lower().endswith(".png")]
    if len(src_matches) != 1:
        report.append({"n": n, "target": target, "error": f"download match count {len(src_matches)}"})
        continue
    src = os.path.join(DL, src_matches[0])
    tdir = os.path.join(BASE, f"Week {wk:02d}", "images")
    adir = os.path.join(BASE, "_replaced_video_audit", f"Week {wk:02d}")
    tgt = os.path.join(tdir, target)
    os.makedirs(adir, exist_ok=True)
    archived = False
    if os.path.exists(tgt):
        apath = os.path.join(adir, target)
        if not os.path.exists(apath):
            shutil.move(tgt, apath)
            archived = True
        else:
            shutil.move(tgt, apath + ".dup")
            archived = "dup-suffix"
    shutil.copy2(src, tgt)
    ok = os.path.exists(tgt) and os.path.getsize(tgt) > 100_000
    report.append({"n": n, "target": f"Week {wk:02d}/{target}", "picked": src_matches[0][:70],
                   "archived": archived, "filed": ok})

out = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/docs/curriculum/video-audit/RECONCILE_REPORT_FABLE.json"
json.dump({"assignments": report, "missing_downloads": [32, 87]}, open(out, "w"), indent=2)

# clean up staging dirs
for d in ("_reconcile_staging_jul14", "_reconcile_staging_jul14_D"):
    p = os.path.join(BASE, d)
    if os.path.isdir(p):
        shutil.rmtree(p)

errs = [r for r in report if not r.get("filed")]
print(f"filed OK: {sum(1 for r in report if r.get('filed'))}/24")
for r in errs:
    print("PROBLEM:", r)
print("staging cleaned")
