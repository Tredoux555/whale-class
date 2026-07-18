#!/usr/bin/env python3
"""Verify the Jul-15 alias-mapping pass against the coverage audit's own matcher.

For each week touched by PROPOSED aliases, recompute per-line phrase coverage
(audit semantics: full ordered token sequence contiguous within a line) twice:
  BEFORE = current alias map applied (curriculum-video-aliases.json)
  AFTER  = current + PROPOSED applied
Report newly phrase-covered lines, regressions (lines losing phrase coverage),
and name collisions. Exit 1 on regression/collision.
"""
import importlib.util, json, os, sys

REPO = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
AUDIT = os.path.join(REPO, "scripts/curriculum/audit-video-coverage.py")
ALIAS_JSON = os.path.join(REPO, "scripts/mvgen/curriculum-video-aliases.json")

spec_ = importlib.util.spec_from_file_location("audit", AUDIT)
audit = importlib.util.module_from_spec(spec_)
spec_.loader.exec_module(audit)

PROPOSED = {
    "05": {"sam-cat-mat.png": "cat-sat-on-mat.png"},
    "08": {
        "cat-in-tin.png": "sat-in-a-tin.png",
        "cat-in-cap.png": "sat-in-a-cap.png",
        "cat-proud-mat.png": "sat-on-the-mat.png",
        "potato-cat-sit.png": "potato-sat-on-mat.png",
    },
    "10": {"all-and-mat-v2.png": "all-on-the-mat.png"},
    "11": {"on-celebrate.png": "on-can-read.png"},
    "12": {"dog-digging-deep.png": "what-in-the-pit.png"},
    "14": {
        "hens-in-pen.png": "in-the-pen.png",
        "hens-on-man.png": "on-the-man.png",
        "hen-on-cat.png": "on-the-cat.png",
    },
    "15": {"potato-and-rat-in-bag.png": "in-the-bag-potato.png"},
    "22": {"vacuum.png": "motor-on.png"},
    "26": {"graduation-cast.png": "where-is-sejeena.png"},
    "30": {"chick-eyes-bell.png": "miss-off.png"},
    "36": {"chick-went-up.png": "went-up.png"},
    "38": {"snake-going-in.png": "in-went-the-snake.png"},
    "52": {
        "owl-town.png": "down-in-the-town.png",
        "owl-sees-cow.png": "what-in-the-town.png",
        "owl-cow-shout.png": "out-and-about.png",
        "owl-proud.png": "up-can-fly.png",
    },
    "55": {"fly-flies.png": "up-high.png"},
    "56": {
        "lamb-climbs-free.png": "up-on-the-rocks.png",
        "wren-cant-climb.png": "up-up-top.png",
    },
    "58": {
        "potato-reveal.png": "last-leaf-on-the-tree.png",
        "tree-question.png": "what-is-on-the-tree.png",
        "graduation-cast-full.png": "where-is-sejeena.png",
    },
}

with open(ALIAS_JSON) as f:
    CURRENT = {k: v for k, v in json.load(f).items() if not k.startswith("_")}


def week_alias_map(n, include_proposed):
    m = {}
    for src in (CURRENT, PROPOSED if include_proposed else {}):
        for key in (f"{n:02d}", str(n)):
            if key in src:
                for a, b in src[key].items():
                    if a.startswith("_"):
                        continue
                    m[a] = b
    return m


def load_images_aliased(n, amap):
    imgs = audit.load_week_images(n)
    out, names = [], set()
    collisions = []
    for im in imgs:
        fn = amap.get(im["filename"], im["filename"])
        if fn in names:
            collisions.append(fn)
        names.add(fn)
        toks = audit.image_basename_tokens(fn)
        out.append({"filename": fn, "tokens": toks, "norm_set": set(toks)})
    return out, collisions


def coverage_lines(n, images):
    """Return {(role, line_idx, line_text): phrase_bool} for every sung line."""
    spec = audit.load_spec(n)
    res = {}
    for song in spec.get("songs", []):
        role, title, lyrics = song.get("role"), song.get("title"), song.get("lyrics", "")
        for i, line in enumerate(audit.split_lyric_lines(lyrics)):
            raw_toks, _ = audit.tokenize_line_raw_and_norm(line)
            if not raw_toks:
                continue
            phrase = any(audit.phrase_match(im["tokens"], raw_toks) for im in images)
            res[(role, i, line)] = phrase
    return res


fail = False
weeks = sorted({int(k) for k in PROPOSED})
for n in weeks:
    before_imgs, col_b = load_images_aliased(n, week_alias_map(n, False))
    after_imgs, col_a = load_images_aliased(n, week_alias_map(n, True))
    if col_a:
        print(f"W{n:02d} ❌ NAME COLLISIONS: {col_a}")
        fail = True
    b = coverage_lines(n, before_imgs)
    a = coverage_lines(n, after_imgs)
    gained = [k for k in a if a[k] and not b.get(k)]
    lost = [k for k in a if not a[k] and b.get(k)]
    print(f"W{n:02d}: +{len(gained)} newly phrase-covered, -{len(lost)} regressions")
    for role, i, line in gained:
        print(f"   + [{role}] {line}")
    for role, i, line in lost:
        print(f"   - REGRESSION [{role}] {line}")
        fail = True

print("\nRESULT:", "FAIL" if fail else "PASS")
sys.exit(1 if fail else 0)
