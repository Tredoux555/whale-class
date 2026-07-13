#!/usr/bin/env python3
"""Apply Tredoux's song take picks (Jul 13 2026).

For each pick: keep the picked take renamed to a clean name
(`WNN <Title>.mp3` or `WNN <Title> (sound|word).mp3`), move the other
take(s) of that song to `_takes_not_picked/`.

Usage: python3 apply-take-picks.py [--dry-run]
"""
import json, os, re, shutil, sys, unicodedata

BASE = os.path.expanduser("~/Desktop/English Curriculum 2026")
PICKS = os.path.join(os.path.dirname(__file__), "../../docs/curriculum/SONG_TAKE_PICKS_JUL13.json")
ARCHIVE = os.path.join(BASE, "_takes_not_picked")
DRY = "--dry-run" in sys.argv

# Songs deliberately NOT locked yet
SKIP = {("30", None): "W30 sound song pick missing",  # resolved below if pick exists
        ("31", "the king can sing"): "REWORK pending"}

FILE_RE = re.compile(r"^W(\d{2}) (.+?)(?: \((sound|word) take (\d)\)| \(take (\d)\))\.mp3$")

def norm(s):
    s = unicodedata.normalize("NFKD", s).lower()
    return re.sub(r"[^a-z0-9]", "", s)

def parse_file(name):
    m = FILE_RE.match(name)
    if not m:
        return None
    wk, title, marker, take_a, take_b = m.groups()
    return wk, title, marker, int(take_a or take_b)

picks = json.load(open(PICKS))["picks"]
pickmap = {}  # (week, normtitle, marker) -> take
for wk, title, marker, take in picks:
    pickmap[(wk, norm(title), marker)] = take

# special-case title aliases (pick wording vs file wording)
ALIASES = {("08", norm("Ih-Ih-In")): None}  # resolved by unique-remaining match

os.makedirs(ARCHIVE, exist_ok=True)
report = {"kept": [], "archived": [], "unmatched_files": [], "unmatched_picks": set(pickmap), "skipped": []}

for n in range(1, 59):
    wk = f"{n:02d}"
    folder = os.path.join(BASE, f"Week {wk}")
    if not os.path.isdir(folder):
        continue
    files = [f for f in os.listdir(folder) if f.endswith(".mp3")]
    groups = {}  # (normtitle, marker) -> {take: filename, 'title': display}
    for f in files:
        p = parse_file(f)
        if not p:
            report["unmatched_files"].append(f"{wk}/{f} (name pattern)")
            continue
        _, title, marker, take = p
        g = groups.setdefault((norm(title), marker), {"title": title, "marker": marker, "takes": {}})
        g["takes"][take] = f

    # match picks for this week
    week_picks = {k: v for k, v in pickmap.items() if k[0] == wk}
    matched_groups = set()
    resolved = {}  # groupkey -> take
    for (pwk, ptitle, pmarker), take in week_picks.items():
        # try exact (title, marker), then (title, None-tolerant)
        cands = [gk for gk in groups if gk[0] == ptitle and (gk[1] == pmarker or pmarker is None)]
        if len(cands) == 1:
            resolved[cands[0]] = take
            matched_groups.add(cands[0])
            report["unmatched_picks"].discard((pwk, ptitle, pmarker))

    # unique-remaining pairing (handles Ih-Ih-In vs I-I-In etc.)
    rem_picks = [(k, v) for k, v in week_picks.items() if k in report["unmatched_picks"]]
    rem_groups = [gk for gk in groups if gk not in matched_groups]
    # exclude rework/skip groups from pairing targets
    rem_groups_p = [gk for gk in rem_groups if (wk, gk[0]) not in [("31", norm("The King Can Sing"))]]
    if len(rem_picks) == 1 and len(rem_groups_p) == 1:
        k, v = rem_picks[0]
        resolved[rem_groups_p[0]] = v
        report["unmatched_picks"].discard(k)

    for gk, g in groups.items():
        title, marker = g["title"], g["marker"]
        if (wk, norm(title)) == ("31", norm("The King Can Sing")):
            report["skipped"].append(f"W{wk} {title} — REWORK pending, both takes kept")
            continue
        if gk not in resolved:
            report["skipped"].append(f"W{wk} {title}" + (f" ({marker})" if marker else "") + " — NO PICK, both takes kept")
            continue
        want = resolved[gk]
        if want not in g["takes"]:
            report["skipped"].append(f"W{wk} {title} — picked take {want} NOT FOUND, nothing touched")
            continue
        clean = f"W{wk} {title}" + (f" ({marker})" if marker else "") + ".mp3"
        for take, fname in sorted(g["takes"].items()):
            src = os.path.join(folder, fname)
            if take == want:
                dst = os.path.join(folder, clean)
                report["kept"].append(f"W{wk}: {fname} -> {clean}")
                if not DRY and fname != clean:
                    os.rename(src, dst)
            else:
                dst = os.path.join(ARCHIVE, fname)
                report["archived"].append(f"W{wk}: {fname}")
                if not DRY:
                    shutil.move(src, dst)

print(("DRY RUN — nothing moved\n" if DRY else "APPLIED\n"))
print(f"kept/renamed: {len(report['kept'])}")
print(f"archived:     {len(report['archived'])}")
for s in report["skipped"]:
    print("SKIPPED:", s)
for f in report["unmatched_files"]:
    print("UNMATCHED FILE:", f)
for p in sorted(report["unmatched_picks"]):
    print("UNMATCHED PICK:", p)
