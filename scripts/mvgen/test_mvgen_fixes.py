#!/usr/bin/env python3
"""Tests for the mvgen accuracy fixes that live OUTSIDE the shotlist matcher:

  FIX 1  — audio bytes folded into the timeline cache fingerprint (analyze.py)
  FIX 5  — giant alignment-blob guard: demote/blank word spans > _MAX_WORD_SPAN
           (analyze.py) + the subs-path end-to-end drop
  FIX 3  — per-song image selection (lyric filter + coloring drop)
  FIX 3b — the image-name alias layer + collision guard (curriculum-batch.py)

No audio / whisper / network needed. Run:  python3 test_mvgen_fixes.py
"""

import importlib.util
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import analyze as az  # noqa: E402

# curriculum-batch.py has a hyphen -> load it by path.
_spec = importlib.util.spec_from_file_location(
    "curriculum_batch", os.path.join(HERE, "curriculum-batch.py"))
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)


PASS = []
FAIL = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print("  [%s] %s%s" % ("ok  " if cond else "FAIL", name,
                           ("  -- " + detail) if detail else ""))


# --- FIX 1: audio bytes in the cache fingerprint ----------------------------

def test_fix1_fingerprint():
    print("FIX 1: audio bytes are part of the cache fingerprint")
    d = tempfile.mkdtemp()
    lyr = os.path.join(d, "lyrics.txt")
    open(lyr, "w").write("the cat sat on the mat")
    a1 = os.path.join(d, "take1.mp3")
    open(a1, "wb").write(b"TAKE-ONE-AUDIO" * 5000)
    a2 = os.path.join(d, "take2.mp3")   # DIFFERENT bytes, could share name/duration
    open(a2, "wb").write(b"TAKE-TWO-AUDIO" * 5000)

    fp1 = az.compute_inputs_fingerprint(lyr, None, "base", audio_path=a1)
    fp2 = az.compute_inputs_fingerprint(lyr, None, "base", audio_path=a2)
    fp1b = az.compute_inputs_fingerprint(lyr, None, "base", audio_path=a1)

    check("same lyrics + DIFFERENT audio -> different fingerprint", fp1 != fp2)
    check("deterministic (same inputs -> same fingerprint)", fp1 == fp1b)
    check("audio actually contributes (with vs without audio differ)",
          az.compute_inputs_fingerprint(lyr, None, "base") != fp1)
    # changing lyrics still flips it (regression of the original behaviour).
    open(lyr, "w").write("a different lyric")
    check("changed lyrics still flips the fingerprint",
          az.compute_inputs_fingerprint(lyr, None, "base", audio_path=a1) != fp1)
    # missing audio path is stable (treated as empty).
    check("missing audio path is stable",
          az.compute_inputs_fingerprint(lyr, None, "base", audio_path="/nope")
          == az.compute_inputs_fingerprint(lyr, None, "base", audio_path="/x"))


# --- FIX 5: giant alignment-blob guard --------------------------------------

def _W(word, s, e, matched=True, approx=False):
    d = {"word": word, "key": word, "start": s, "end": e, "matched": matched}
    if approx:
        d["approx"] = True
    return d


def test_fix5_helpers():
    print("FIX 5: giant-span demote / blank / finalize-drop")
    # demote un-anchors a matched giant span for re-transcription.
    timed = [_W("intro", 2.0, 22.7), _W("cat", 23.0, 23.4)]
    n = az._demote_long_spans(timed)
    check("demote_long_spans demoted the 20.7s span", n == 1)
    check("demoted word is now uncovered (matched=False, start=None)",
          timed[0]["matched"] is False and timed[0]["start"] is None)
    check("normal word untouched", timed[1]["matched"] is True)

    # blank marks + clears anything still too long (e.g. even-fill smear).
    timed2 = [_W("held", 5.0, 26.0, approx=True), _W("go", 26.5, 26.8)]
    b = az._blank_long_spans(timed2)
    check("blank_long_spans blanked the 21s span", b == 1)
    check("blanked word: blank flag set + timing cleared",
          timed2[0].get("blank") and timed2[0]["start"] is None)
    check("short word not blanked", not timed2[1].get("blank"))

    # finalize drops blank words entirely (subtitle-free region).
    out = az._finalize(timed2, 30.0)
    check("finalize drops the blanked word", [w["word"] for w in out] == ["go"])

    # uncovered_runs treats a blank word as a run boundary (never even-filled).
    timed3 = [_W("a", 0.0, 0.3, matched=False),
              _W("blk", 0.4, 0.5, matched=False),
              _W("b", 0.6, 0.9, matched=False)]
    timed3[1]["blank"] = True
    check("uncovered_runs splits around a blank word",
          az._uncovered_runs(timed3) == [(0, 0), (2, 2)])


def test_warn1_melisma_survives():
    print("WARN-1: a genuine 3.5-4s held note survives the blob guard")
    # side (a): _MAX_WORD_SPAN raised 2.5 -> 4.5 so a real melisma (a sung note
    # drawn across a musical phrase) is NOT demoted/blanked, while the actual
    # artefacts (8s / 20.7s blobs) still are.
    check("_MAX_WORD_SPAN raised to 4.5", az._MAX_WORD_SPAN == 4.5,
          str(az._MAX_WORD_SPAN))

    # A 3.5s held note is NOT demoted (survives Pass-1 as a timed anchor).
    held = [_W("caaat", 1.3, 4.8), _W("in", 4.8, 5.1)]   # 3.5s melisma
    check("3.5s held note NOT demoted", az._demote_long_spans(held) == 0)
    check("held note still anchored (matched, timed)",
          held[0]["matched"] is True and held[0]["start"] == 1.3)

    # A 4.0s held note also survives; an 8s blob is still demoted.
    survive4 = [_W("sooo", 2.0, 6.0)]                    # 4.0s
    check("4.0s held note NOT demoted", az._demote_long_spans(survive4) == 0)
    blob8 = [_W("sit", 2.0, 10.0)]                       # 8s artefact
    check("8s blob still demoted", az._demote_long_spans(blob8) == 1)

    # ...and the final blank backstop leaves the melisma alone but clears a blob.
    survive4b = [_W("sooo", 2.0, 6.0)]
    check("4.0s held note NOT blanked", az._blank_long_spans(survive4b) == 0)
    blob8b = [_W("sit", 2.0, 10.0)]
    check("8s blob still blanked", az._blank_long_spans(blob8b) == 1)


def test_fix5_subs_end_to_end():
    print("FIX 5: subs path drops a giant cue word end-to-end (no whisper)")
    # Lyric words align to sub-cue timings; the 'giant' cue spans 5->27s and must
    # be BLANKED (dropped) rather than smeared across the whole region.
    lyrics = "hello world giant finish"
    subs_words = [
        {"word": "hello", "start": 0.5, "end": 1.0},
        {"word": "world", "start": 1.2, "end": 1.8},
        {"word": "giant", "start": 5.0, "end": 27.0},   # 22s blob
        {"word": "finish", "start": 28.0, "end": 28.6},
    ]
    aux = {"active_intervals": [(0.0, 30.0)], "duration": 30.0}
    out = az.align_lyrics_to_subs(lyrics, subs_words, 30.0, aux)
    words = [w["word"] for w in out]
    print("    out words:", words)
    check("giant blob word dropped from output", "giant" not in words)
    check("normal words survive",
          all(w in words for w in ("hello", "world", "finish")), str(words))
    check("no surviving word exceeds _MAX_WORD_SPAN",
          all(w["end"] - w["start"] <= az._MAX_WORD_SPAN + 1e-6 for w in out),
          str([(w["word"], round(w["end"] - w["start"], 2)) for w in out]))


# --- FIX 3 / 3b: image selection + alias layer ------------------------------

def _paths(names):
    return ["/src/" + n for n in names]


def test_fix3_lyric_filter():
    print("FIX 3: lyric filter keeps only sung images, drops coloring")
    # 4 sung images (cat/mat/sun/potato) so the < 4 fallback does NOT fire and
    # the lyric filter genuinely excludes the un-sung tiger/turtle.
    imgs = _paths(["cat.png", "mat.png", "sun.png", "tiger.png", "turtle.png",
                   "tiger-coloring.png", "potato.png"])
    lyrics = ("[Hook]\nThe cat sat on the mat\nThe sun is up\n"
              "The cat is on the mat\n(potato!)")
    pairs, excluded, note = cb.plan_images(imgs, lyrics, {}, "lyrics")
    kept = {d for (_s, d) in pairs}
    check("no < 4 fallback fired (lyric filter is authoritative)", note is None,
          str(note))
    check("sung images kept (cat, mat, sun, potato)",
          {"cat.png", "mat.png", "sun.png", "potato.png"} <= kept,
          str(sorted(kept)))
    check("un-sung images excluded (tiger, turtle)",
          "tiger.png" not in kept and "turtle.png" not in kept)
    check("coloring always excluded", "tiger-coloring.png" not in kept)
    check("coloring listed in excluded", "tiger-coloring.png" in excluded)


def test_fix3_fallback_under_four():
    print("FIX 3: < 4 lyric matches -> fall back to ALL non-coloring")
    imgs = _paths(["cat.png", "dog.png", "bird.png", "fish.png",
                   "cat-coloring.png"])
    lyrics = "the cat and the cat"  # only 'cat' sung -> 1 match (< 4)
    pairs, excluded, note = cb.plan_images(imgs, lyrics, {}, "lyrics")
    kept = {d for (_s, d) in pairs}
    check("fallback kept all NON-coloring images",
          kept == {"cat.png", "dog.png", "bird.png", "fish.png"}, str(sorted(kept)))
    check("coloring still excluded in fallback", "cat-coloring.png" not in kept)
    check("loud fallback note emitted", bool(note), str(note))


def test_fix3_all_mode():
    print("FIX 3: --images-filter all keeps every non-coloring image")
    imgs = _paths(["cat.png", "xyz.png", "abc-coloring.png"])
    pairs, excluded, note = cb.plan_images(imgs, "unrelated words", {}, "all")
    kept = {d for (_s, d) in pairs}
    check("all-mode keeps non-coloring regardless of lyrics",
          kept == {"cat.png", "xyz.png"}, str(sorted(kept)))
    check("all-mode still drops coloring", "abc-coloring.png" not in kept)


def test_fix3b_alias_layer():
    print("FIX 3b: alias layer copies under video names + filters on them")
    # cat-levitating is NOT sung, but its alias cat-up-levitating IS (via 'up').
    imgs = _paths(["cat.png", "cat-levitating.png", "cat-landing.png",
                   "mat-coloring.png"])
    alias = {"cat-levitating.png": "cat-up-levitating.png",
             "cat-landing.png": "cat-down-landing.png"}
    lyrics = "the cat is up on the mat then the cat is down"
    pairs, excluded, note = cb.plan_images(imgs, lyrics, alias, "lyrics")
    dests = {d for (_s, d) in pairs}
    srcmap = {os.path.basename(s): d for (s, d) in pairs}
    check("alias applied: cat-levitating -> cat-up-levitating",
          srcmap.get("cat-levitating.png") == "cat-up-levitating.png",
          str(srcmap))
    check("aliased image kept because its VIDEO name is sung ('up')",
          "cat-up-levitating.png" in dests, str(sorted(dests)))
    check("second alias applied (down)",
          "cat-down-landing.png" in dests, str(sorted(dests)))
    check("coloring still dropped", "mat-coloring.png" not in dests)


def test_fix3b_alias_collision():
    print("FIX 3b: an alias colliding with an existing filename is skipped")
    # alias target 'cat-up-levitating.png' already exists as a real source file.
    imgs = _paths(["cat-levitating.png", "cat-up-levitating.png"])
    alias = {"cat-levitating.png": "cat-up-levitating.png"}
    pairs, _e, _n = cb.plan_images(imgs, "cat up up up on the mat", alias, "all")
    dests = sorted(d for (_s, d) in pairs)
    check("collision -> alias skipped, both originals kept",
          dests == ["cat-levitating.png", "cat-up-levitating.png"], str(dests))


def test_fix3b_alias_file_loads():
    print("FIX 3b: the shipped alias file loads with the W04 starter entry")
    am = cb.load_aliases(4)
    check("W04 alias: cat-levitating -> cat-up-levitating",
          am.get("cat-levitating.png") == "cat-up-levitating.png", str(am))
    check("W04 alias: cat-landing -> cat-down-landing",
          am.get("cat-landing.png") == "cat-down-landing.png", str(am))
    check("_comment doc key is NOT treated as an alias",
          "_comment" not in am)
    check("zero-pad and plain week keys both resolve",
          cb.load_aliases(4) == am)
    check("a week with no aliases -> {}", cb.load_aliases(99) == {})


def main():
    for t in (test_fix1_fingerprint, test_fix5_helpers,
              test_warn1_melisma_survives,
              test_fix5_subs_end_to_end, test_fix3_lyric_filter,
              test_fix3_fallback_under_four, test_fix3_all_mode,
              test_fix3b_alias_layer, test_fix3b_alias_collision,
              test_fix3b_alias_file_loads):
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
