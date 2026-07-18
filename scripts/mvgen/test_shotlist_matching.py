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


# --- FIX 2: meaning-bearing short tokens -----------------------------------

def test_fix2_short_tokens():
    print("FIX 2: 2-letter meaning tokens (in/on/up/at/ox) survive")
    # ox.png / up.png must be indexable (were dropped by the old 3-char min).
    check("ox.png -> ['ox']", sl.filename_tokens("ox.png") == ["ox"])
    check("up.png -> ['up']", sl.filename_tokens("up.png") == ["up"])
    check("cat-in-cap.png keeps 'in'",
          sl.filename_tokens("cat-in-cap.png") == ["cat", "in", "cap"])
    # ubiquitous 2-letter function words still stopped.
    check("is/it/the still stopped",
          sl.filename_tokens("it-is-the-cat.png") == ["cat"])
    # 'what' is a TAUGHT question word — kept — so chick-what disambiguates.
    check("chick-what.png keeps 'what'",
          sl.filename_tokens("chick-what.png") == ["chick", "what"])

    # cat-in-can vs cat-on-can flip via the prepositions.
    imgs = ["cat-in-can.png", "cat-on-can.png"]
    ci = sl.find_matches(words_from("the cat in a can"), imgs)
    co = sl.find_matches(words_from("the cat on a can"), imgs)
    check("'cat in a can' -> cat-in-can",
          ci and os.path.basename(imgs[ci[0]["image"]]) == "cat-in-can.png",
          str([os.path.basename(imgs[c["image"]]) for c in ci]))
    check("'cat on a can' -> cat-on-can",
          co and os.path.basename(imgs[co[0]["image"]]) == "cat-on-can.png",
          str([os.path.basename(imgs[c["image"]]) for c in co]))

    # ox in box vs bare box.
    imgs2 = ["ox.png", "box.png", "ox-in-box.png"]
    c2 = sl.find_matches(words_from("the ox in a box"), imgs2)
    n2 = [os.path.basename(imgs2[c["image"]]) for c in c2]
    check("'ox in a box' -> ox-in-box (3-tok beats box)",
          "ox-in-box.png" in n2, str(n2))

    # kite-up on "the kite is up" (up is sung, 'is' dropped).
    imgs3 = ["kite.png", "kite-up.png"]
    c3 = sl.find_matches(words_from("the kite is up"), imgs3)
    n3 = [os.path.basename(imgs3[c["image"]]) for c in c3]
    check("'the kite is up' -> kite-up", "kite-up.png" in n3, str(n3))

    # bare 'cat' still prefers cat.png over a preposition phrase image.
    imgs4 = ["cat.png", "cat-on-mat.png"]
    c4 = sl.find_matches(words_from("look the cat"), imgs4)
    check("bare 'cat' -> cat.png",
          c4 and os.path.basename(imgs4[c4[0]["image"]]) == "cat.png",
          str([os.path.basename(imgs4[c["image"]]) for c in c4]))


# --- FIX 6: each verse's scene image anchors in its OWN verse ---------------

def test_fix6_verse_isolation():
    print("FIX 6: each verse's scene image anchors in its OWN verse")
    # (1) Real-world outcome on a CLEAN timeline (what FIX 5 produces + FIX 2's
    #     'in' token): cat-in-tin anchors verse 2, cat-in-cap verse 3, each a
    #     full 3-token in-verse phrase.
    images = ["cat-command.png", "cat-in-tin.png", "cat-in-cap.png",
              "cat-sits-mat.png", "cat.png"]
    lyric = ("Sit cat sit "
             "The cat sat in a tin "
             "Sit cat sit "
             "The cat sat in a cap "
             "The cat can sit")
    # separate sung lines so the window respects verse boundaries.
    words = words_from(lyric, line_gap_after={2, 8, 11, 17})
    by = {os.path.basename(images[c["image"]]): c
          for c in sl.find_matches(words, images)}
    print("    anchors:", sorted(by))
    check("cat-in-tin anchors (verse 2)", "cat-in-tin.png" in by, str(sorted(by)))
    check("cat-in-cap anchors (verse 3)", "cat-in-cap.png" in by, str(sorted(by)))
    if "cat-in-tin.png" in by:
        check("cat-in-tin is a full cat+in+tin phrase",
              by["cat-in-tin.png"]["match_score"] == 3, str(by["cat-in-tin.png"]))
    if "cat-in-cap.png" in by:
        check("cat-in-cap is a full cat+in+cap phrase",
              by["cat-in-cap.png"]["match_score"] == 3, str(by["cat-in-cap.png"]))
    # tin anchors before cap (own verses, in order).
    if "cat-in-tin.png" in by and "cat-in-cap.png" in by:
        check("tin verse precedes cap verse",
              by["cat-in-tin.png"]["trigger_time"]
              < by["cat-in-cap.png"]["trigger_time"])

    # (2) Load-bearing unit check of the MATCH_TOKEN_GAP cap: a phrase whose
    #     next token is farther than the cap (a cross-line steal on a smeared
    #     timeline) is TRUNCATED, so it scores lower and yields to the closer,
    #     in-verse candidate.
    def cw(pairs):
        return [(k, {"word": k, "start": s, "end": s + 0.2}, i)
                for i, (k, s) in enumerate(pairs)]
    near = cw([("cat", 0.0), ("sat", 0.3), ("in", 0.6), ("cap", 0.9)])
    far = cw([("cat", 0.0), ("sat", 0.3),
              ("in", 0.6 + sl.MATCH_TOKEN_GAP + 1.0),
              ("cap", 0.9 + sl.MATCH_TOKEN_GAP + 1.0)])
    m_near = sl._match_image(["cat", "in", "cap"], near, [0, 1, 2, 3])
    m_far = sl._match_image(["cat", "in", "cap"], far, [0, 1, 2, 3])
    check("close 'in' -> full 3-token match", len(m_near) == 3, str(m_near))
    check("far 'in' (> gap cap) -> phrase truncated to [cat]",
          m_far == [0], str(m_far))


# --- FIX 4 (Jul-15 hold rule): tail is a HELD anchor, never a filler --------
#
# RETIRED behaviour: the old FIX 4 let unmatched fillers cycle through a long
# tail (>8s) and only reserved a final held shot. Under the Jul-15 hold rule an
# image may ONLY be on screen around its own sung word, so unmatched fillers are
# NEVER shown — the last anchored image is simply HELD across the whole tail
# (and the whole intro). The old "long-tail runs fillers in the tail" assertion
# is deliberately gone; the new assertions demand the opposite (no fillers).

def test_fix4_ending():
    print("FIX 4 (hold rule): tail/intro held on the matched image, no fillers")
    images = ["cat.png", "apple.png", "ball.png", "drum.png"]  # only cat sung
    words = words_from("look the cat")  # single anchor early
    downbeats = [round(x * 0.5, 3) for x in range(1, 60)]

    # Short tail: the last (only) anchored image is HELD to the end.
    short = sl.build_shotlist(words, images, downbeats, duration=6.0)
    assert short is not None
    ss, _i, _c, s_shots = short
    check("short-tail last shot is the matched image (cat.png)",
          s_shots[-1]["image_name"] == "cat.png", s_shots[-1]["image_name"])
    check("short-tail last shot reaches the end",
          abs(s_shots[-1]["end"] - 6.0) < 1e-6, str(s_shots[-1]["end"]))

    # Long tail: NO fillers cycle — the matched image is held the whole time.
    long = sl.build_shotlist(words, images, downbeats, duration=20.0)
    assert long is not None
    ls, _i2, _c2, l_shots = long
    names = [s["image_name"] for s in l_shots]
    check("long-tail shows NO unmatched fillers (retired behaviour)",
          not any(n in ("apple.png", "ball.png", "drum.png") for n in names),
          str(names))
    check("long-tail is entirely the matched image (cat.png held)",
          set(names) == {"cat.png"}, str(names))
    check("long-tail final shot is the matched image (cat.png)",
          l_shots[-1]["image_name"] == "cat.png", str(names[-3:]))
    check("long-tail final shot reaches the end",
          abs(l_shots[-1]["end"] - 20.0) < 1e-6, str(l_shots[-1]["end"]))
    check("every long-tail shot is anchored (no filler shots)",
          all(s["anchored"] for s in l_shots), str(names))
    # contiguity preserved + starts at t=0 (intro hold).
    check("timeline starts at t=0 (intro hold)", abs(ls[0][0]) < 1e-6,
          str(ls[0]))
    for a, b in zip(ls, ls[1:]):
        assert abs(a[1] - b[0]) < 1e-6, "long-tail shots must tile"
    check("long-tail shots tile contiguously", True)


# --- WARN-1: a held note (melisma) mid-phrase must not break the phrase ------

def test_warn1_held_note_phrase():
    print("WARN-1: 3.5s held note mid-phrase -> cat-in-cap still wins")
    # The traced regression: "the cat sat[3.5s] in the cap". The held "sat"
    # (a genuine melisma) now SURVIVES as a timed word (analyze._MAX_WORD_SPAN
    # raised to 4.5, side a); side b makes the hop measure summed inter-word
    # SILENCE, so the note's 3.5s DURATION does not inflate the cat->in gap past
    # MATCH_TOKEN_GAP. Before both fixes the phrase truncated to a bare [cat] and
    # cat.png (score 100) beat cat-in-cap (score 96), losing the scene image.
    images = ["cat.png", "cat-in-cap.png"]
    words = [
        {"word": "The", "start": 0.6, "end": 0.9},
        {"word": "cat", "start": 1.0, "end": 1.3},
        {"word": "sat", "start": 1.3, "end": 4.8},   # melisma: 3.5s, held
        {"word": "in",  "start": 4.8, "end": 5.1},
        {"word": "the", "start": 5.1, "end": 5.4},
        {"word": "cap", "start": 5.4, "end": 5.7},
    ]
    clusters = sl.find_matches(words, images)
    got = anchors(clusters, images)
    print("    anchors:", got)
    check("cat-in-cap wins despite the 3.5s held 'sat'",
          got and got[0][0] == "cat-in-cap.png", str(got))
    # It anchors as a real multi-token phrase (cat + in), not a bare cat hook.
    if clusters:
        check("cat-in-cap anchored as a >=2-token phrase (cat...in)",
              clusters[0]["match_score"] >= 2, str(clusters[0]))

    # Direct unit check of the silence metric: a continuously-held note between
    # two matched tokens contributes ~0 silence (kept), whereas the same tokens
    # separated by real silence exceed the cap (split).
    cw_held = sl._content_words(words)  # cat(0), sat(1), in(2), cap(3)
    check("silence(cat..in) across held note is ~0",
          sl._silence_gap(cw_held, 0, 2) < 0.05,
          str(sl._silence_gap(cw_held, 0, 2)))
    silent = [
        {"word": "cat", "start": 0.0, "end": 0.3},
        {"word": "in",  "start": 0.3 + sl.MATCH_TOKEN_GAP + 1.0,
         "end": 0.6 + sl.MATCH_TOKEN_GAP + 1.0},
    ]
    cw_silent = sl._content_words(silent)
    check("silence(cat..in) across real silence exceeds the cap",
          sl._silence_gap(cw_silent, 0, 1) > sl.MATCH_TOKEN_GAP,
          str(sl._silence_gap(cw_silent, 0, 1)))


# --- WARN-2: stopword / meaning-token invariant -----------------------------

def test_warn2_stopwords():
    print("WARN-2: me/us/hi/ok/oh stopped; meaning tokens still tokenize")
    # The five newly-added stopwords must now be dropped as filename tokens.
    for w in ("me", "us", "hi", "ok", "oh"):
        check("'%s' is now a stopword" % w,
              sl.filename_tokens("%s.png" % w) == []
              and w in sl._STOPWORDS, w)
    # Every taught meaning token + 'what' must STILL tokenize (never dropped).
    for w in ("in", "on", "up", "at", "ox", "ax", "go", "what"):
        check("'%s' still tokenizes" % w,
              sl.filename_tokens("%s.png" % w) == [w], w)
    # The whitelist<->stopword invariant the assertion enforces.
    check("_MEANING_TOKENS disjoint from _STOPWORDS",
          not (sl._MEANING_TOKENS & sl._STOPWORDS),
          str(sl._MEANING_TOKENS & sl._STOPWORDS))
    # A stopword in a compound is still dropped, the object kept.
    check("'oh-cat.png' -> ['cat'] ('oh' dropped)",
          sl.filename_tokens("oh-cat.png") == ["cat"])


# --- no lyrics / zero match fallback ---------------------------------------

# --- APPROX-RUN SUPPRESSION: the stutter-song garble guard ------------------

def _aw(word, start, end, approx=True):
    """A timed word dict, ``approx`` by default (an even-distributed guess)."""
    d = {"word": word, "start": round(start, 3), "end": round(end, 3)}
    if approx:
        d["approx"] = True
    return d


def test_approx_run_length_boundary():
    print("approx suppression: run-length boundary (4 kept vs 5 suppressed)")
    # Short spans so ONLY the word-count rule can trip (each ~0.3s, gap 0.1s).
    def run(n):
        return [_aw("w%d" % i, 0.5 + i * 0.4, 0.5 + i * 0.4 + 0.3)
                for i in range(n)]
    sup4, spans4 = sl.compute_approx_suppression(run(4))
    check("4-word approx run NOT suppressed (< 5, short span)",
          sup4 == set() and spans4 == [], "%s / %s" % (sup4, spans4))
    sup5, spans5 = sl.compute_approx_suppression(run(5))
    check("5-word approx run suppressed (count rule)",
          sup5 == {0, 1, 2, 3, 4} and len(spans5) == 1,
          "%s / %s" % (sorted(sup5), spans5))
    # A real (non-approx) word BREAKS the run: two 3-word approx runs around it
    # each stay below threshold even though 6 approx words exist in total.
    mixed = (run(3)
             + [{"word": "real", "start": 2.0, "end": 2.3}]
             + [_aw("x%d" % i, 2.5 + i * 0.4, 2.5 + i * 0.4 + 0.3)
                for i in range(3)])
    supm, spansm = sl.compute_approx_suppression(mixed)
    check("a real word breaks the run -> two 3-runs both kept",
          supm == set() and spansm == [], "%s / %s" % (supm, spansm))


def test_approx_span_boundary():
    print("approx suppression: span boundary (<6s kept vs >=6s suppressed)")
    # Only 3 words (count rule cannot trip) — the SPAN rule is under test.
    below = [_aw("a", 0.0, 0.3), _aw("b", 2.5, 2.8), _aw("c", 5.2, 5.5)]  # 5.5s
    supb, spb = sl.compute_approx_suppression(below)
    check("3-word approx run spanning 5.5s NOT suppressed (< 6s)",
          supb == set() and spb == [], "%s / %s" % (supb, spb))
    at = [_aw("a", 0.0, 0.3), _aw("b", 3.0, 3.3), _aw("c", 5.7, 6.0)]     # 6.0s
    supa, spa = sl.compute_approx_suppression(at)
    check("3-word approx run spanning 6.0s suppressed (span rule)",
          supa == {0, 1, 2} and spa == [[0.0, 6.0]], "%s / %s" % (supa, spa))


def test_approx_anchor_exclusion():
    print("approx suppression: no image anchors on a suppressed word")
    images = ["cat.png", "dog.png"]
    # 5-word approx run (indices 0-4) that INCLUDES the sung 'cat'; then a real,
    # non-approx 'dog' outside the run.
    words = [
        _aw("la", 0.5, 0.8), _aw("cat", 0.9, 1.2), _aw("la", 1.3, 1.6),
        _aw("la", 1.7, 2.0), _aw("la", 2.1, 2.4),
        {"word": "dog", "start": 5.0, "end": 5.3},   # real anchor
    ]
    sup, _spans = sl.compute_approx_suppression(words)
    check("the sung 'cat' (index 1) is inside the suppressed run", 1 in sup)
    clusters = sl.find_matches(words, images, suppressed_idx=sup)
    names = [os.path.basename(images[c["image"]]) for c in clusters]
    print("    gated anchors:", names)
    check("suppressed 'cat' does NOT anchor cat.png", "cat.png" not in names,
          str(names))
    check("real 'dog' still anchors", "dog.png" in names, str(names))
    # Control: WITHOUT the gate, the same 'cat' WOULD anchor -> proves the gate
    # (not some other filter) is what excludes it.
    names_no = [os.path.basename(images[c["image"]])
                for c in sl.find_matches(words, images)]
    check("control: un-gated 'cat' WOULD anchor", "cat.png" in names_no,
          str(names_no))
    # And build_shotlist (which computes suppression internally) agrees.
    downbeats = [round(x * 0.5, 3) for x in range(1, 16)]
    shot = sl.build_shotlist(words, images, downbeats, duration=7.0)
    assert shot is not None
    _s, _i, _c, shots_meta = shot
    anchored = {m["image_name"] for m in shots_meta if m["anchored"]}
    check("build_shotlist gates the suppressed 'cat' too",
          "cat.png" not in anchored and "dog.png" in anchored, str(anchored))


def test_approx_report_fields():
    print("approx suppression: shot_report self-flag fields")
    images = ["cat.png", "dog.png"]
    # 8 approx words (one suppressed run) + 2 real -> 80% approx.
    words = [_aw("x%d" % i, 0.5 + i * 0.5, 0.5 + i * 0.5 + 0.3)
             for i in range(8)]
    words += [{"word": "cat", "start": 6.0, "end": 6.3},
              {"word": "dog", "start": 7.0, "end": 7.3}]
    downbeats = [round(x * 0.5, 3) for x in range(1, 20)]
    shot = sl.build_shotlist(words, images, downbeats, duration=9.0)
    assert shot is not None
    _s, _i, _c, shots_meta = shot
    sm = sl.build_shot_report(shots_meta, images, words)["summary"]
    print("    approx_pct=%s spans=%s flags=%s"
          % (sm["approx_pct"], sm["suppressed_spans"], sm["quality_flags"]))
    check("approx_pct present + correct (8/10 = 80.0)", sm["approx_pct"] == 80.0,
          str(sm["approx_pct"]))
    check("suppressed_spans lists the one long run",
          len(sm["suppressed_spans"]) == 1
          and len(sm["suppressed_spans"][0]) == 2, str(sm["suppressed_spans"]))
    check("quality_flags warns when approx_pct > 60",
          len(sm["quality_flags"]) == 1
          and "approx_pct" in sm["quality_flags"][0], str(sm["quality_flags"]))
    check("subtitle_words drops the suppressed run",
          {w["word"] for w in sl.subtitle_words(words)} == {"cat", "dog"},
          str([w["word"] for w in sl.subtitle_words(words)]))

    # A clean song: zero approx -> empty flags/spans, list returned unchanged.
    clean = [{"word": "cat", "start": 0.5, "end": 0.8},
             {"word": "dog", "start": 1.0, "end": 1.3}]
    shot2 = sl.build_shotlist(clean, images, downbeats, duration=3.0)
    assert shot2 is not None
    _s2, _i2, _c2, meta2 = shot2
    sm2 = sl.build_shot_report(meta2, images, clean)["summary"]
    check("clean song: approx_pct 0.0", sm2["approx_pct"] == 0.0)
    check("clean song: no suppressed spans", sm2["suppressed_spans"] == [])
    check("clean song: no quality flags", sm2["quality_flags"] == [])
    check("subtitle_words leaves a clean list intact",
          sl.subtitle_words(clean) == clean)


# --- Jul-15 HOLD RULE: no fillers; hold neighbours across gaps --------------

def _shot_at(shots, t):
    """The shot on screen at time ``t`` (or None)."""
    for s in shots:
        if s["start"] <= t < s["end"]:
            return s
    return None


def test_hold_unanchored_never_shown():
    print("HOLD: an unanchored image is NEVER shown (no cadence fillers)")
    # cat is sung; apple/ball never are -> they must never reach the screen.
    images = ["cat.png", "apple.png", "ball.png"]
    words = words_from("look the cat and the cat")
    downbeats = [round(x * 0.5, 3) for x in range(1, 40)]
    shot = sl.build_shotlist(words, images, downbeats, duration=8.0)
    assert shot is not None
    _s, _i, _c, shots = shot
    names = {m["image_name"] for m in shots}
    print("    shown:", names)
    check("only the sung image (cat.png) is ever shown",
          names == {"cat.png"}, str(names))
    check("apple.png / ball.png never appear",
          "apple.png" not in names and "ball.png" not in names, str(names))
    check("every emitted shot is anchored (no filler shots)",
          all(m["anchored"] for m in shots), str([m["anchored"] for m in shots]))


def test_hold_intro_first_anchor():
    print("HOLD: the intro holds the FIRST anchor's image from t=0")
    images = ["cat.png"]
    # 'cat' is not sung until 5.0s -> the intro (0..~5s) must hold cat.png.
    words = [{"word": "cat", "start": 5.0, "end": 5.3}]
    downbeats = [round(x * 0.5, 3) for x in range(1, 24)]
    shot = sl.build_shotlist(words, images, downbeats, duration=8.0)
    assert shot is not None
    segs, _i, _c, shots = shot
    check("timeline starts at t=0", abs(segs[0][0]) < 1e-6, str(segs[0]))
    check("the first shot is the first anchor's image (cat.png)",
          shots[0]["image_name"] == "cat.png", shots[0]["image_name"])
    check("the intro shot is anchored (held first word's image)",
          shots[0]["anchored"], str(shots[0]))
    # At t=1.0 (well before the word at 5.0s) cat.png is already on screen.
    at1 = _shot_at(shots, 1.0)
    check("cat.png on screen at t=1.0 (before its word is sung)",
          at1 is not None and at1["image_name"] == "cat.png", str(at1))


def test_hold_gap_previous_anchor():
    print("HOLD: a gap between anchors holds the PREVIOUS anchor's image")
    # cat@1.0, dog@6.0, apple never sung. The 1s..6s gap must hold cat.png, NOT
    # apple.png (the old cadence filler); dog.png appears only near its own word.
    images = ["cat.png", "dog.png", "apple.png"]
    words = [{"word": "cat", "start": 1.0, "end": 1.3},
             {"word": "dog", "start": 6.0, "end": 6.3}]
    downbeats = [round(x * 0.5, 3) for x in range(1, 20)]
    shot = sl.build_shotlist(words, images, downbeats, duration=9.0)
    assert shot is not None
    segs, _i, _c, shots = shot
    names = {m["image_name"] for m in shots}
    print("    shown:", names, "shots:", [(m["start"], m["end"],
          m["image_name"]) for m in shots])
    check("apple.png (unanchored) never appears in the gap", "apple.png" not in names,
          str(names))
    mid = _shot_at(shots, 4.0)  # mid-gap
    check("mid-gap (t=4.0) holds the previous anchor cat.png",
          mid is not None and mid["image_name"] == "cat.png", str(mid))
    check("dog.png anchors (its own word)", "dog.png" in names, str(names))
    # The cat shot ends exactly where the dog shot starts (contiguous hold).
    cat_shot = next(m for m in shots if m["image_name"] == "cat.png")
    dog_shot = next(m for m in shots if m["image_name"] == "dog.png")
    check("cat's hold ends exactly at dog's start (contiguous)",
          abs(cat_shot["end"] - dog_shot["start"]) < 1e-6,
          "%s / %s" % (cat_shot["end"], dog_shot["start"]))
    for a, b in zip(segs, segs[1:]):
        assert abs(a[1] - b[0]) < 1e-6, "shots must tile contiguously"
    check("shots tile contiguously", True)


def test_hold_zero_anchor_fallback():
    print("HOLD: zero anchors -> None (cadence fallback) + quality flag")
    images = ["cat.png", "dog.png"]
    # No keyword ever sung -> build_shotlist returns None so the caller cycles
    # over the whole pool (rule 6 — never a black video).
    words = words_from("la la la doo doo")
    check("zero keyword matches -> build_shotlist None",
          sl.build_shotlist(words, images, [0.5, 1.0, 1.5], 2.0) is None)
    # The engine's cycle path then builds all-unanchored shots; the shot report
    # must carry the 'zero anchors — cadence fallback' quality flag.
    cyc_shots = [
        {"start": 0.0, "end": 2.0, "image": 0, "image_name": "cat.png",
         "anchored": False, "trigger_word": None, "trigger_phrase": None,
         "match_score": None},
        {"start": 2.0, "end": 4.0, "image": 1, "image_name": "dog.png",
         "anchored": False, "trigger_word": None, "trigger_phrase": None,
         "match_score": None},
    ]
    sm = sl.build_shot_report(cyc_shots, images, words)["summary"]
    print("    cadence-fallback summary:", sm["quality_flags"],
          "held=%s" % sm.get("held_gap_seconds"))
    check("zero anchored shots reported", sm["anchored_shots"] == 0)
    check("quality_flags carries the cadence-fallback warning",
          "zero anchors — cadence fallback" in sm["quality_flags"],
          str(sm["quality_flags"]))
    check("cycle-path shots contribute 0 held seconds",
          sm["held_gap_seconds"] == 0.0, str(sm["held_gap_seconds"]))


def test_hold_held_gap_seconds_present():
    print("HOLD: held_gap_seconds is present + measures held art")
    images = ["cat.png", "dog.png", "apple.png"]
    words = [{"word": "cat", "start": 1.0, "end": 1.3},
             {"word": "dog", "start": 6.0, "end": 6.3}]
    downbeats = [round(x * 0.5, 3) for x in range(1, 20)]
    shot = sl.build_shotlist(words, images, downbeats, duration=9.0)
    assert shot is not None
    _s, _i, _c, shots = shot
    # Every anchored shot carries its core window for the held calc.
    check("shots carry core_start/core_end",
          all("core_start" in m and "core_end" in m for m in shots),
          str(shots[0].keys()))
    sm = sl.build_shot_report(shots, images, words)["summary"]
    print("    held_gap_seconds=%s" % sm["held_gap_seconds"])
    check("held_gap_seconds present in summary", "held_gap_seconds" in sm)
    # Big intro (0..~1s) + gap (~1..6s) + tail held -> comfortably positive.
    check("held_gap_seconds > 0 (intro + gap + tail are held)",
          sm["held_gap_seconds"] > 0.0, str(sm["held_gap_seconds"]))
    # Sanity: held can never exceed the video duration.
    check("held_gap_seconds <= duration", sm["held_gap_seconds"] <= 9.0 + 1e-6,
          str(sm["held_gap_seconds"]))


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
              test_adjacent_phrase_no_self_reanchor, test_fix2_short_tokens,
              test_fix6_verse_isolation, test_fix4_ending,
              test_warn1_held_note_phrase, test_warn2_stopwords,
              test_approx_run_length_boundary, test_approx_span_boundary,
              test_approx_anchor_exclusion, test_approx_report_fields,
              test_hold_unanchored_never_shown, test_hold_intro_first_anchor,
              test_hold_gap_previous_anchor, test_hold_zero_anchor_fallback,
              test_hold_held_gap_seconds_present,
              test_fallback):
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
