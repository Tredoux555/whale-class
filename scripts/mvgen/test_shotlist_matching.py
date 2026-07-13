#!/usr/bin/env python3
"""Tests for the order-aware image<->lyric matcher (shotlist.find_matches).

No audio needed: we feed synthetic word-timestamp lists + a list of image
filenames straight into the pure matcher. Run:  python3 test_shotlist_matching.py

Covers the flip-gag disambiguation (the original bug), the vet-cast case, the
coloring penalty, hook rotation, and the no-lyrics/zero-match fallback.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shotlist as sl  # noqa: E402


# --- tiny helpers -----------------------------------------------------------

def words_from(text, wdur=0.30, gap=0.0, line_gap_after=None):
    """Turn a space-separated lyric string into word dicts with sane timings.

    ``line_gap_after`` (set of 0-based word indices) inserts a >LINE_GAP silence
    AFTER those words, so we can model separate sung lines."""
    line_gap_after = line_gap_after or set()
    out = []
    t = 0.5
    for i, tok in enumerate(text.split()):
        out.append({"word": tok, "start": round(t, 3), "end": round(t + wdur, 3)})
        t += wdur + gap
        if i in line_gap_after:
            t += 1.5  # > LINE_GAP (0.9)
    return out


def anchors(clusters, images):
    """(image_name, trigger_word, trigger_phrase) per cluster, in order."""
    return [(os.path.basename(images[c["image"]]),
             c["trigger_word"], c.get("trigger_phrase")) for c in clusters]


PASS = []
FAIL = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    mark = "ok  " if cond else "FAIL"
    print("  [%s] %s%s" % (mark, name, ("  -- " + detail) if detail else ""))


# --- W04 flip case ----------------------------------------------------------

def test_w04_flip():
    print("W04 flip / order disambiguation")
    images = [
        "cat.png", "cat-asleep.png", "cat-coloring.png", "cat-on-mat.png",
        "cat-on-mat-silly.png", "mat-on-cat.png", "cat-levitating.png",
        "cat-landing.png", "potato-beside-cat.png",
    ]
    # Real W04 arc (trimmed): double hook, then the flip, then the flip repeats.
    lyric = ("The cat is on the mat The cat is on the mat "
             "The mat is on the cat The mat is on the cat "
             "The cat is on the mat")
    words = words_from(lyric)
    clusters = sl.find_matches(words, images)
    got = anchors(clusters, images)
    print("    anchors:", got)
    names = [g[0] for g in got]

    # 1) The opening hooks pick a cat-on-mat variant, NOT mat-on-cat, NOT asleep.
    hook_names = names[:2]
    check("hook picks cat-on-mat*",
          all(n in ("cat-on-mat.png", "cat-on-mat-silly.png")
              for n in hook_names) and "mat-on-cat.png" not in hook_names
          and "cat-asleep.png" not in hook_names,
          str(hook_names))

    # 2) "the mat is on the cat" picks mat-on-cat (order flips the image).
    check("flip picks mat-on-cat", "mat-on-cat.png" in names,
          "mat-on-cat present")
    # ... and never mistakes a cat-on-mat variant for the flip line.
    flip_idx = names.index("mat-on-cat.png") if "mat-on-cat.png" in names else -1
    check("mat-on-cat is its own anchor (order-correct)", flip_idx >= 2)

    # 3) Repeated hooks rotate between the two cat-on-mat variants.
    cat_on_mat_variants = [n for n in names
                           if n in ("cat-on-mat.png", "cat-on-mat-silly.png")]
    check("repeated hooks rotate cat-on-mat <-> -silly",
          len(set(cat_on_mat_variants)) == 2, str(cat_on_mat_variants))


def test_w04_bare_cat_and_levitating():
    print("W04 bare 'cat', asleep, and levitating gap-filler")
    images = [
        "cat.png", "cat-asleep.png", "cat-coloring.png", "cat-on-mat.png",
        "cat-on-mat-silly.png", "mat-on-cat.png", "cat-levitating.png",
        "cat-landing.png", "potato-beside-cat.png",
    ]
    # "the cat is asleep" -> cat-asleep legitimately matches 2 tokens.
    words = words_from("The cat is asleep", line_gap_after=set())
    clusters = sl.find_matches(words, images)
    got = anchors(clusters, images)
    print("    asleep anchors:", got)
    check("'the cat is asleep' picks cat-asleep",
          got and got[0][0] == "cat-asleep.png", str(got))

    # A bare 'cat' on the FIRST occurrence prefers cat.png (single, 0 leftover)
    # over cat-asleep (which needs 'asleep' to score 2).
    words2 = words_from("Look the cat")
    c2 = sl.find_matches(words2, images)
    g2 = anchors(c2, images)
    print("    bare-cat anchors:", g2)
    check("bare 'cat' (no asleep) -> cat.png, not cat-asleep",
          g2 and g2[0][0] == "cat.png", str(g2))
    check("cat-asleep no longer monopolizes 'cat'",
          not (g2 and g2[0][0] == "cat-asleep.png"))

    # 'levitating'/'landing' are never sung here -> unused multi-token fillers.
    # Build a shot report to confirm they are reported as gaps, not misses.
    shot = sl.build_shotlist(words2, images, downbeats=[0.5, 1.0, 1.5, 2.0],
                             duration=3.0)
    assert shot is not None
    _segs, _idx, _cuts, shots_meta = shot
    rep = sl.build_shot_report(shots_meta, images, words2)
    unused = rep["summary"]["images_unused_multi_token"]
    phrase_present = rep["summary"]["unused_multi_token_phrase_present"]
    print("    unused multi-token:", unused)
    print("    unused w/ phrase in lyrics:", phrase_present)
    check("cat-levitating reported unused (legit gap, phrase not sung)",
          "cat-levitating.png" in unused
          and "cat-levitating.png" not in phrase_present)


# --- W22 vet cast -----------------------------------------------------------

def test_w22_vet():
    print("W22 vet cast (8 *-vet files)")
    images = [
        "ant-vet.png", "bee-vet.png", "cat-vet.png", "dog-vet.png",
        "hen-vet.png", "pig-vet.png", "cow-vet.png", "fox-vet.png",
    ]
    words = words_from("The ant is a vet The dog is a vet",
                       line_gap_after={4})
    clusters = sl.find_matches(words, images)
    got = anchors(clusters, images)
    print("    anchors:", got)
    names = [g[0] for g in got]
    check("'the ant is a vet' -> ant-vet", "ant-vet.png" in names)
    check("'the dog is a vet' -> dog-vet", "dog-vet.png" in names)
    check("only the two named vets anchor (order-correct)",
          set(names) == {"ant-vet.png", "dog-vet.png"}, str(names))


# --- coloring penalty -------------------------------------------------------

def test_coloring_penalty():
    print("coloring penalty (bare noun beats <noun>-coloring)")
    images = ["cat-coloring.png", "cat.png"]  # coloring sorts FIRST on filename
    words = words_from("The cat")
    clusters = sl.find_matches(words, images)
    got = anchors(clusters, images)
    print("    anchors:", got)
    check("bare 'cat' -> cat.png not cat-coloring.png",
          got and got[0][0] == "cat.png", str(got))


# --- CRIT: intervening un-matched word still anchors ------------------------

def test_intervening_word_anchors():
    print("intervening un-matched word anchors (bird repro)")
    # cat-mat spans "cat ... mat"; "bird" sits BETWEEN the two matched tokens
    # but is NOT part of cat-mat's phrase -> it must still anchor bird.png.
    images = ["cat-mat.png", "bird.png"]
    words = words_from("the cat and bird sit on the mat")
    clusters = sl.find_matches(words, images)
    got = anchors(clusters, images)
    print("    anchors:", got)
    names = [g[0] for g in got]
    check("cat-mat matches the cat...mat phrase", "cat-mat.png" in names)
    check("bird STILL anchors (not swallowed by cat-mat span)",
          "bird.png" in names, str(names))
    # cat-mat's phrase must be exactly cat+mat (2 tokens), not bird.
    cm = next((c for c in clusters if os.path.basename(images[c["image"]])
               == "cat-mat.png"), None)
    check("cat-mat phrase is 'cat ... mat' (2 tok, bird not consumed)",
          cm is not None and cm["match_score"] == 2, str(cm))

    # And the full shot list must place bird.png on screen (anchored shot),
    # with the overlap resolved sanely (no crash, monotonic non-negative shots).
    shot = sl.build_shotlist(words, images,
                             downbeats=[0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8],
                             duration=3.2)
    assert shot is not None, "build_shotlist should not fall back here"
    segs, _idx, _cuts, shots_meta = shot
    for (s, e) in segs:
        assert e > s, "every shot must have positive duration (%s,%s)" % (s, e)
    for a, b in zip(segs, segs[1:]):
        assert abs(a[1] - b[0]) < 1e-6, "shots must tile contiguously"
    anchored_names = {m["image_name"] for m in shots_meta if m["anchored"]}
    print("    anchored image names:", anchored_names)
    check("bird.png reaches the screen as an anchored shot",
          "bird.png" in anchored_names, str(anchored_names))


# --- adjacent-token phrase consumes without re-anchoring its own tokens ------

def test_adjacent_phrase_no_self_reanchor():
    print("adjacent-token phrase consumes correctly (no self re-anchor)")
    # "cat mat" adjacent: cat-mat consumes BOTH; a lone mat.png must NOT then
    # re-anchor on the already-consumed 'mat', and cat-mat is the only anchor.
    images = ["cat-mat.png", "mat.png"]
    words = words_from("the cat mat")
    clusters = sl.find_matches(words, images)
    got = anchors(clusters, images)
    print("    anchors:", got)
    names = [g[0] for g in got]
    check("cat-mat anchors the adjacent phrase", names[:1] == ["cat-mat.png"],
          str(names))
    check("consumed 'mat' does NOT re-anchor mat.png",
          "mat.png" not in names, str(names))
    check("exactly one anchor (no phantom re-anchor)", len(names) == 1,
          str(names))
    cm = clusters[0]
    check("phrase consumed both tokens (score 2)", cm["match_score"] == 2,
          str(cm))


# --- no lyrics / zero match fallback ---------------------------------------

def test_fallback():
    print("no-lyrics / zero-match fallback (build_shotlist returns None)")
    images = ["cat.png", "mat-on-cat.png"]
    # No words at all -> None (caller cycles).
    check("no words -> None", sl.build_shotlist([], images, [0.5, 1.0], 2.0)
          is None)
    # Words that match nothing -> None.
    words = words_from("la la la doo doo")
    check("zero keyword matches -> None",
          sl.build_shotlist(words, images, [0.5, 1.0], 2.0) is None)
    # find_matches on non-matching words -> [] (not a crash).
    check("find_matches zero match -> []",
          sl.find_matches(words, images) == [])


def main():
    for t in (test_w04_flip, test_w04_bare_cat_and_levitating, test_w22_vet,
              test_coloring_penalty, test_intervening_word_anchors,
              test_adjacent_phrase_no_self_reanchor, test_fallback):
        t()
        print()
    print("=" * 60)
    print("PASSED %d / %d" % (len(PASS), len(PASS) + len(FAIL)))
    if FAIL:
        print("FAILED:", ", ".join(FAIL))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
