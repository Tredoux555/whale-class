#!/usr/bin/env python3
"""Tests for script-schedule mode (shotlist.build_script_schedule + helpers).

Script-schedule mode times vocab images from the lyric SHEET's sections when the
normal anchor pass is too poor to trust (stutter songs). No audio/whisper needed:
we feed synthetic sheets + word-timestamp lists straight into the pure functions.
Run:  python3 test_script_schedule.py

Covers (per the build brief): de-stutter, section parsing + owned images in
order, pin-based section timing, the no-pin proportional fallback, the engage
threshold on both sides, the sections-without-images HOLD rule, schedule_mode
reporting, and the GUARDRAIL that a passing song keeps its certified anchor plan.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shotlist as sl  # noqa: E402

PASS = []
FAIL = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print("  [%s] %s%s" % ("ok  " if cond else "FAIL", name,
                           ("  -- " + detail) if detail else ""))


def words_from(text, wdur=0.30, gap=0.0, approx=False, confirmed=None):
    """space-separated lyric -> word dicts. ``approx`` flags ALL words; a set of
    0-based indices in ``confirmed`` flips those back to non-approx (a pin)."""
    confirmed = confirmed or set()
    out, t = [], 0.5
    for i, tok in enumerate(text.split()):
        w = {"word": tok, "start": round(t, 3), "end": round(t + wdur, 3)}
        if approx and i not in confirmed:
            w["approx"] = True
        out.append(w)
        t += wdur + gap
    return out


DB = [round(x * 0.5, 3) for x in range(1, 120)]  # dense downbeats for tests


# --- de-stutter --------------------------------------------------------------

def test_destutter():
    print("destutter: strip a leading single-letter stutter run")
    check("T-t-turtle! -> turtle!", sl.destutter("T-t-turtle!") == "turtle!")
    check("t-t-taxi… -> taxi…", sl.destutter("t-t-taxi…") == "taxi…")
    check("P-p-potato! -> potato!", sl.destutter("P-p-potato!") == "potato!")
    check("T-t-t! -> '' (pure stutter)", sl.destutter("T-t-t!") == "")
    check("plain 'turtle' unchanged", sl.destutter("turtle") == "turtle")
    check("normalize(destutter('t-t-taxi')) == 'taxi'",
          sl.normalize_token(sl.destutter("t-t-taxi")) == "taxi")
    check("normalize(destutter('T-t-turtle')) == 'turtle'",
          sl.normalize_token(sl.destutter("T-t-turtle")) == "turtle")


# --- section parsing + owned images in order --------------------------------

SHEET = (
    "[Intro — whispered]\n"
    "t… t… t…\n"
    "\n"
    "[Hook 1 — chant]\n"
    "T-t-turtle! It's a turtle!\n"
    "\n"
    "[Hook 2 — chant]\n"
    "T-t-tiger! It's a tiger!\n"
    "\n"
    "[Breakdown — whispered]\n"
    "t-t-taxi… t-t-teddy… t-t-towel…\n"
)
IMAGES = ["turtle.png", "tiger.png", "taxi.png", "teddy.png", "towel.png"]


def test_section_parsing():
    print("section parsing: markers -> sections + de-stuttered content keys")
    secs, lmap = sl.parse_lyric_sections(SHEET)
    labels = [s["label"] for s in secs]
    check("4 sections parsed in order",
          labels == ["Intro — whispered", "Hook 1 — chant",
                     "Hook 2 — chant", "Breakdown — whispered"], str(labels))
    # intro 't… t… t…' de-stutters to nothing (pure stutter) -> no content keys.
    check("intro owns no content keys", secs[0]["content_keys"] == [],
          str(secs[0]["content_keys"]))
    # breakdown stutters de-stutter to the real words.
    check("breakdown content keys are taxi/teddy/towel",
          secs[3]["content_keys"] == ["taxi", "teddy", "towel"],
          str(secs[3]["content_keys"]))
    # line map traces a body line back to its section (used for pins).
    check("line_section maps body lines", isinstance(lmap, dict) and len(lmap) >= 4)


def test_owned_images_in_order():
    print("owned images: each section owns its vocab image, in order")
    secs, _ = sl.parse_lyric_sections(SHEET)
    itok = sl.build_image_tokens(IMAGES)
    owned = [[IMAGES[i] for (i, _w) in sl._owned_images_in_section(
        s["content_keys"], itok)] for s in secs]
    check("intro owns nothing", owned[0] == [], str(owned[0]))
    check("hook1 owns turtle", owned[1] == ["turtle.png"], str(owned[1]))
    check("hook2 owns tiger", owned[2] == ["tiger.png"], str(owned[2]))
    check("breakdown owns taxi, teddy, towel IN ORDER",
          owned[3] == ["taxi.png", "teddy.png", "towel.png"], str(owned[3]))


# --- pin-based section timing ------------------------------------------------

def test_pin_pins_its_section():
    print("pin timing: a confirmed word pins its section to cover its time")
    # All words approx EXCEPT one confirmed 'tiger' inside Hook 2. Its section
    # span must include that timestamp.
    text = "t t t T-t-turtle It's a turtle T-t-tiger It's a tiger t-t-taxi t-t-teddy t-t-towel"
    words = words_from(text, wdur=1.0, approx=True)
    # find the SECOND 'tiger' occurrence index (the confirmed pin) and set a time.
    # words: 0 t,1 t,2 t,3 T-t-turtle,4 It's,5 a,6 turtle,7 T-t-tiger,8 It's,9 a,
    #        10 tiger,11 t-t-taxi,12 t-t-teddy,13 t-t-towel
    for w in words:
        w["approx"] = True
    words[10]["approx"] = False   # confirm 'tiger' (Hook 2)
    words[10]["start"] = 9.0
    words[10]["end"] = 9.6
    secs, lmap = sl.parse_lyric_sections(SHEET)
    pins = sl._pins_by_section(words, SHEET, lmap, len(secs))
    check("the confirmed 'tiger' pins Hook 2 (section 2)",
          pins[2] and abs(pins[2][0] - 9.0) < 1e-6, str(pins))
    check("approx words did NOT become pins",
          all(len(pins[i]) == 0 for i in (0, 1, 3)), str(pins))
    res = sl.build_script_schedule(words, IMAGES, SHEET, DB, duration=20.0,
                                   onsets=[])
    assert res is not None
    _segs, _idx, _cuts, shots = res
    tiger = next(s for s in shots if s["image_name"] == "tiger.png")
    check("tiger's shot span covers its pin time 9.0",
          tiger["start"] <= 9.0 <= tiger["end"],
          "%.2f-%.2f" % (tiger["start"], tiger["end"]))


def test_no_pin_proportional_fallback():
    print("no-pin fallback: boundaries distribute proportionally to weight")
    # No pins at all -> _script_section_bounds is pure proportional by weight.
    pins = [[], [], []]
    weights = [1, 3, 4]           # cum 0,1,4,8 over duration 8 -> b=[0,1,4,8]
    b = sl._script_section_bounds(pins, weights, 8.0)
    check("proportional boundaries match cumulative weights",
          [round(x, 3) for x in b] == [0.0, 1.0, 4.0, 8.0], str(b))
    # equal weights -> equal thirds.
    b2 = sl._script_section_bounds([[], [], []], [1, 1, 1], 9.0)
    check("equal weights -> equal spans",
          [round(x, 3) for x in b2] == [0.0, 3.0, 6.0, 9.0], str(b2))


def test_pin_outlier_filtered():
    print("pin outliers: a single mis-timed pin is filtered (MAD)")
    # A section whose pins cluster at ~34s with one gross 4.2s outlier (the exact
    # W02 whisper mis-alignment) must anchor near 34, not be dragged to 4.2.
    kept = sl._filter_pin_outliers([4.2, 33.72, 34.0, 34.36, 34.68])
    check("4.2s outlier dropped, cluster kept",
          4.2 not in kept and 34.0 in kept, str(kept))
    check("a tight legit cluster is fully kept",
          sl._filter_pin_outliers([40.0, 40.4, 40.8]) == [40.0, 40.4, 40.8])


# --- engage threshold (both sides) ------------------------------------------

def test_engage_threshold():
    print("engage threshold: ratio<0.5 OR approx>60 engages; else not")
    approx_hi = words_from("a b c d e f g h i j", approx=True)   # 100% approx
    clean = words_from("a b c d e f g h i j")                    # 0% approx
    # 1/8 anchored -> ratio 0.125 < 0.5 -> engage.
    eng, dbg = sl.script_should_engage(1, 8, clean)
    check("low anchored ratio engages", eng is True, str(dbg))
    # 5/8 anchored, clean -> ratio 0.625, approx 0 -> DO NOT engage (passing).
    eng2, dbg2 = sl.script_should_engage(5, 8, clean)
    check("high ratio + low approx does NOT engage", eng2 is False, str(dbg2))
    # 8/8 anchored but 100% approx -> engage on the approx side.
    eng3, dbg3 = sl.script_should_engage(8, 8, approx_hi)
    check("high approx engages even at full ratio", eng3 is True, str(dbg3))
    # exactly at the boundary values.
    half_approx = words_from("a b c d e f g h i j",
                             approx=True, confirmed=set(range(4)))  # 60% approx
    eng4, _ = sl.script_should_engage(10, 10, half_approx)
    check("exactly 60% approx does NOT engage (> is strict)", eng4 is False)


# --- sections-without-images HOLD rule --------------------------------------

def test_hold_rule():
    print("hold rule: intro holds first upcoming; mid gap holds previous")
    # Intro owns nothing -> holds the first upcoming image (turtle); a section
    # owning nothing between two owned sections holds the PREVIOUS image.
    sheet = ("[Intro]\nla la\n\n[Hook 1]\nIt's a turtle\n\n"
             "[Bridge]\nna na na\n\n[Hook 2]\nIt's a tiger\n")
    imgs = ["turtle.png", "tiger.png"]
    words = words_from("la la It's a turtle na na na It's a tiger", approx=True)
    res = sl.build_script_schedule(words, imgs, sheet, DB, duration=12.0,
                                   onsets=[])
    assert res is not None
    _s, _i, _c, shots = res
    check("timeline starts at t=0", abs(shots[0]["start"]) < 1e-6)
    check("intro holds the first upcoming image (turtle)",
          shots[0]["image_name"] == "turtle.png", shots[0]["image_name"])
    check("last shot reaches the end",
          abs(shots[-1]["end"] - 12.0) < 1e-6, str(shots[-1]["end"]))
    # the bridge (owns nothing) between turtle and tiger holds turtle -> the
    # turtle shot extends across the bridge until tiger starts (merged).
    names = [s["image_name"] for s in shots]
    check("only owned images ever shown (turtle, tiger)",
          set(names) == {"turtle.png", "tiger.png"}, str(names))
    check("turtle appears before tiger", names.index("turtle.png")
          < names.index("tiger.png"), str(names))
    for a, b in zip(shots, shots[1:]):
        assert abs(a["end"] - b["start"]) < 1e-6, "shots must tile"
    check("shots tile contiguously", True)


# --- schedule_mode reporting -------------------------------------------------

def test_schedule_mode_reporting():
    print("reporting: shot_report carries schedule_mode + section/owned_word")
    words = words_from("t t t It's a turtle It's a tiger t-t-taxi t-t-teddy "
                       "t-t-towel", approx=True)
    res = sl.build_script_schedule(words, IMAGES, SHEET, DB, duration=15.0,
                                   onsets=[])
    assert res is not None
    _s, _i, _c, shots = res
    rep = sl.build_shot_report(shots, IMAGES, words, schedule_mode="script")
    sm = rep["summary"]
    check("summary.schedule_mode == 'script'", sm["schedule_mode"] == "script")
    check("quality_flags names the script engagement",
          any("script-schedule engaged" in f for f in sm["quality_flags"]),
          str(sm["quality_flags"]))
    check("report shots carry section + owned_word",
          all("section" in s and "owned_word" in s for s in rep["shots"]),
          str(rep["shots"][0].keys()))
    # anchor-mode report has NO schedule fields on shots + reports 'anchor'.
    rep_a = sl.build_shot_report(shots, IMAGES, words, schedule_mode="anchor")
    check("anchor-mode summary.schedule_mode == 'anchor'",
          rep_a["summary"]["schedule_mode"] == "anchor")
    check("anchor-mode shots omit the section field",
          "section" not in rep_a["shots"][0])


# --- integration: the W02-shaped stutter song -------------------------------

def test_full_w02_shape():
    print("integration: W02-shaped sheet -> all owned images in verse order")
    words = words_from("t t t T-t-turtle It's a turtle T-t-tiger It's a tiger "
                       "t-t-taxi t-t-teddy t-t-towel", wdur=1.0, approx=True)
    res = sl.build_script_schedule(words, IMAGES, SHEET, DB, duration=20.0,
                                   onsets=[])
    assert res is not None
    _s, _i, _c, shots = res
    order = [s["image_name"] for s in shots]
    check("images appear in verse order",
          order == ["turtle.png", "tiger.png", "taxi.png", "teddy.png",
                    "towel.png"], str(order))
    rep = sl.build_shot_report(shots, IMAGES, words, schedule_mode="script")
    check("100% coverage (every owned image shown)",
          rep["summary"]["coverage_pct"] == 100.0,
          str(rep["summary"]["coverage_pct"]))


# --- GUARDRAIL: a passing song keeps its certified anchor plan --------------

def test_passing_song_plan_unchanged():
    print("GUARDRAIL: a passing song does NOT engage script (anchor stands)")
    # A clean song where every image anchors on its sung word: anchoring is good
    # (ratio 1.0, approx 0), so script must NOT engage and the anchor plan (the
    # certified build_shotlist output) is what render would use — unchanged.
    images = ["cat.png", "dog.png", "sun.png", "hat.png"]
    words = words_from("the cat the dog the sun the hat")
    anchor = sl.build_shotlist(words, images, DB, duration=8.0, onsets=[])
    check("anchor pass produced a plan", anchor is not None)
    anchored_ct = (len({m["image"] for m in anchor[3] if m["anchored"]})
                   if anchor else 0)
    engage, dbg = sl.script_should_engage(anchored_ct, len(images), words)
    check("passing song: script does NOT engage", engage is False, str(dbg))
    # the certified plan is deterministic + identical on re-run (byte-identical).
    anchor2 = sl.build_shotlist(words, images, DB, duration=8.0, onsets=[])
    check("build_shotlist output is unchanged/deterministic",
          anchor == anchor2)
    # sanity: a >=50% anchored song keeps the anchor path even with SOME approx.
    some_approx = words_from("the cat the dog the sun the hat",
                             approx=True, confirmed={1, 3, 5, 7})
    eng2, _ = sl.script_should_engage(4, 4, some_approx)  # 50% approx, ratio 1.0
    check("50% approx + full ratio still does NOT engage", eng2 is False)


# --- ENERGY-PROFILE ALIGNMENT (Jul-15 pt3) ---------------------------------

def _mk_env(values, hop=0.1):
    return {"hop_sec": hop, "values": list(values)}


def _flat_env(dur, level, hop=0.1):
    return _mk_env([level] * int(round(dur / hop)), hop)


def _quiet_then_loud(dur, cut, lo=0.05, hi=0.35, hop=0.1):
    n = int(round(dur / hop))
    vals = [lo if (i * hop) < cut else hi for i in range(n)]
    return _mk_env(vals, hop)


def test_type_section():
    print("energy typing: bracket text -> low / high / neutral")
    check("whispered -> low", sl._type_section("Intro — whispered") == "low")
    check("breakdown -> low", sl._type_section("Breakdown — bass drops") == "low")
    check("kids chant -> high", sl._type_section("Hook 1 — kids chant") == "high")
    check("big final -> high", sl._type_section("Final Hook — big") == "high")
    check("no marker -> neutral", sl._type_section("Part 2") == "neutral")
    check("conflicting markers -> neutral",
          sl._type_section("Loud whisper") == "neutral")


def test_energy_bounds_snaps_to_transition():
    print("energy bounds: a low->high boundary snaps to the energy transition")
    # verse (low) then hook (high); audio is quiet 0-10 then loud 10-20. The
    # boundary should move toward the 10s transition, NOT the proportional 12s.
    env = _quiet_then_loud(20.0, 10.0)
    typed = ["low", "high"]
    b = sl._energy_section_bounds(typed, [[], []], [3, 2], [], env, [], 20.0)
    prop = 20.0 * 3 / 5.0  # 12.0
    check("boundary pulled to the ~10s energy transition",
          abs(b[1] - 10.0) < abs(b[1] - prop) and abs(b[1] - 10.0) <= 1.5,
          "b1=%.2f (prop=%.1f)" % (b[1], prop))


def test_energy_bounds_no_env_falls_back():
    print("energy bounds: no envelope -> proportional (v1 behaviour preserved)")
    b = sl._energy_section_bounds(["high", "high", "high"], [[], [], []],
                                  [1, 1, 1], [], None, [], 9.0)
    check("no env == _script_section_bounds proportional",
          [round(x, 3) for x in b] == [0.0, 3.0, 6.0, 9.0], str(b))


def test_energy_bounds_respects_pins_hard():
    print("energy bounds: confirmed-word pins are HARD constraints")
    # section 1 pinned at 14.0; even though energy might prefer elsewhere, its
    # span must contain 14.0.
    env = _quiet_then_loud(20.0, 6.0)
    typed = ["low", "high", "high"]
    pins = [[], [14.0], []]
    b = sl._energy_section_bounds(typed, pins, [2, 2, 2], [], env, [], 20.0)
    check("pinned section 1 span contains its pin 14.0",
          b[1] <= 14.0 <= b[2], "span=[%.2f,%.2f]" % (b[1], b[2]))


def test_within_section_pin_timing():
    print("image timing: a late-pinned image starts near its pin, not mid-split")
    # Final-hook shape: potato (unpinned) then table (pinned at 40.8) in [37.5,49.7].
    owned = [(0, "potato"), (1, "table")]
    img_pin = {0: None, 1: 40.8}
    placed, dropped = sl._place_section_images(37.5, 49.68, owned, img_pin,
                                               min_hold=1.75, onsets=[])
    check("nothing dropped (both fit)", dropped == [], str(dropped))
    table = next(p for p in placed if p[2] == 1)
    check("table shot starts near its 40.8 pin (not the 43.6 equal-split)",
          abs(table[0] - 40.8) <= 0.6, "table_start=%.2f" % table[0])


def test_min_hold_drops_overflow():
    print("min-hold: an over-crowded section drops trailing overflow images")
    # 3 un-pinned images crammed into a 2.2s span at min_hold 1.75 -> keep 1.
    owned = [(0, "taxi"), (1, "teddy"), (2, "towel")]
    placed, dropped = sl._place_section_images(35.3, 37.5, owned, {}, 1.75, [])
    check("only one image kept in the 2.2s span", len(placed) == 1, str(placed))
    check("teddy + towel dropped (overflow)", set(dropped) == {1, 2}, str(dropped))
    check("the kept shot is the first (taxi)", placed[0][2] == 0)


def test_min_hold_keeps_pinned():
    print("min-hold: a pinned image is never dropped as overflow")
    owned = [(0, "a"), (1, "b"), (2, "c")]
    img_pin = {0: None, 1: 36.2, 2: None}  # b is pinned
    placed, dropped = sl._place_section_images(35.3, 37.5, owned, img_pin, 1.75, [])
    kept = {p[2] for p in placed}
    check("pinned image b (1) survives", 1 in kept, str(kept))


def test_gates_present_and_pass_synthetic():
    print("gates: a clean energy-shaped song passes all numeric gates")
    # 2 clear energy blocks, each a decisive section owning one image.
    sheet = ("[Verse — whispered]\nsoft soft soft\n\n"
             "[Hook — kids chant]\nsun sun sun\n\n"
             "[Bridge — whispered]\nlow low low\n\n"
             "[Hook 2 — big]\nmoon moon moon\n")
    imgs = ["sun.png", "moon.png"]
    # quiet 0-5, loud 5-11, quiet 11-15, loud 15-20
    n = 200
    vals = []
    for i in range(n):
        t = i * 0.1
        vals.append(0.35 if (5 <= t < 11 or 15 <= t) else 0.05)
    env = _mk_env(vals)
    sections = [{"start": 0.0, "end": 5.0, "level": 0},
                {"start": 5.0, "end": 11.0, "level": 2},
                {"start": 11.0, "end": 15.0, "level": 0},
                {"start": 15.0, "end": 20.0, "level": 2}]
    # confirm the two vocab words so sections are pinned onto the loud blocks.
    words = words_from("soft soft soft sun sun sun low low low moon moon moon",
                       wdur=0.5, approx=True)
    words[3]["approx"] = False; words[3]["start"] = 6.0   # sun in loud block 1
    words[9]["approx"] = False; words[9]["start"] = 16.0  # moon in loud block 2
    res = sl.build_script_schedule(words, imgs, sheet, DB, duration=20.0,
                                   onsets=[], sections=sections, rms_env=env,
                                   beats=[round(x * 0.5, 3) for x in range(40)])
    assert res is not None
    _s, _i, _c, shots = res
    rep = sl.build_shot_report(shots, imgs, words, schedule_mode="script")
    g = rep["summary"].get("gates")
    check("gates block present in the report", g is not None)
    check("gates report per-section numbers",
          g and len(g["sections"]) == 4, str(len(g["sections"]) if g else -1))
    check("pins_inside gate passes", g and g["pass"]["pins_inside"] is True)
    check("no_short_shots gate passes", g and g["pass"]["no_short_shots"] is True)
    check("energy_overlap gate passes", g and g["pass"]["energy_overlap"] is True)
    check("all gates pass on the clean synthetic song",
          g and g["pass"]["all"] is True, str(g["pass"]) if g else "no gates")


def test_w02_real_timeline_gates():
    print("regression: the real W02-sound timeline passes ALL numeric gates")
    tl_path = ("/Users/tredouxwillemse/Desktop/Music Videos/"
               "W02 T-T-Turtle/timeline.json")
    img_dir = ("/Users/tredouxwillemse/Desktop/Music Videos/_projects/"
               "w02-sound/images")
    lyr_path = ("/Users/tredouxwillemse/Desktop/Music Videos/"
                "W02 T-T-Turtle/lyrics.txt")
    if not (os.path.exists(tl_path) and os.path.isdir(img_dir)
            and os.path.exists(lyr_path)):
        check("W02 timeline present (skipped if absent)", True,
              "SKIPPED — cached timeline not on this machine")
        return
    import json
    tl = json.load(open(tl_path))
    if "rms_envelope" not in tl:
        check("W02 timeline has rms_envelope (skipped if absent)", True,
              "SKIPPED — timeline predates rms_envelope")
        return
    lyr = open(lyr_path).read()
    images = sorted(os.path.join(img_dir, f) for f in os.listdir(img_dir)
                    if f.lower().endswith(sl.IMAGE_EXTS))
    res = sl.build_script_schedule(
        tl["words"], images, lyr, tl["downbeats"], tl["audio"]["duration"],
        onsets=tl["onsets"], sections=tl.get("sections"),
        rms_env=tl.get("rms_envelope"), beats=tl.get("beats"))
    assert res is not None
    _s, _i, _c, shots = res
    rep = sl.build_shot_report(shots, images, tl["words"],
                              schedule_mode="script")
    g = rep["summary"]["gates"]
    check("W02 energy_overlap gate passes", g["pass"]["energy_overlap"] is True)
    check("W02 boundaries gate passes", g["pass"]["boundaries"] is True)
    check("W02 pins_inside gate passes", g["pass"]["pins_inside"] is True)
    check("W02 no_short_shots gate passes", g["pass"]["no_short_shots"] is True)
    check("W02 ALL gates pass", g["pass"]["all"] is True, str(g["pass"]))
    # the load-bearing within-section fix: table starts near its 40.8 pin.
    table = next((s for s in shots if "table" in s["image_name"]), None)
    check("W02 table shot starts near its 40.8 pin (was ~43.6 in v1)",
          table is not None and abs(table["start"] - 40.8) <= 1.0,
          "table_start=%.2f" % (table["start"] if table else -1))


# --- timing_source flows into the shot report --------------------------------

def test_shot_report_timing_source():
    print("reporting: shot_report.summary carries timing_source")
    words = words_from("t t t It's a turtle It's a tiger t-t-taxi t-t-teddy "
                       "t-t-towel", approx=True)
    res = sl.build_script_schedule(words, IMAGES, SHEET, DB, duration=15.0,
                                   onsets=[])
    assert res is not None
    _s, _i, _c, shots = res
    for src in ("align", "transcribe", "subs", "none"):
        rep = sl.build_shot_report(shots, IMAGES, words,
                                   schedule_mode="script", timing_source=src)
        check("timing_source=%r flows to summary" % src,
              rep["summary"].get("timing_source") == src)
    rep_def = sl.build_shot_report(shots, IMAGES, words, schedule_mode="anchor")
    check("timing_source defaults to 'transcribe' when unset",
          rep_def["summary"].get("timing_source") == "transcribe")


# --- LIVE regression: real forced alignment of the W02-sound audio -----------

def test_w02_real_align_regression():
    print("regression (LIVE): forced-align the real W02-sound 'T-T-Turtle' audio")
    import glob
    import json
    import analyze as az
    base = "/Users/tredouxwillemse/Desktop/Music Videos/W02 T-T-Turtle"
    lyr_path = os.path.join(base, "lyrics.txt")
    tl_path = os.path.join(base, "timeline.json")
    # Audio lives under _projects/w02-sound/audio/, not next to the timeline —
    # take its path (+ duration) from the timeline, glob the dir as a backstop.
    audio_path, dur = None, 60.0
    if os.path.exists(tl_path):
        try:
            a = json.load(open(tl_path)).get("audio", {})
            audio_path = a.get("path")
            dur = float(a.get("duration", 60.0)) or 60.0
        except Exception:  # noqa: BLE001
            audio_path, dur = None, 60.0
    if not (audio_path and os.path.exists(audio_path)):
        cand = sorted(glob.glob(os.path.join(base, "*.mp3")))
        audio_path = cand[0] if cand else None
    if not (os.path.isdir(base) and os.path.exists(lyr_path) and audio_path
            and os.path.exists(audio_path) and az._align_python() is not None
            and os.path.exists(az._ALIGN_WORKER)):
        check("W02 align env present (skipped if absent)", True,
              "SKIPPED — audio/lyrics/align-venv not on this machine")
        return
    lyrics_text = open(lyr_path, encoding="utf-8").read()
    words = az.build_forced_aligned_words(audio_path, lyrics_text, dur)
    check("alignment produced words", bool(words),
          "n=%s" % (len(words) if words else 0))
    if not words:
        return
    approx = sum(1 for w in words if w.get("approx"))
    check("approx count is 0 (alignment never guesses text)", approx == 0,
          "approx=%d" % approx)
    starts = [w["start"] for w in words]
    check("words are monotonic non-decreasing",
          all(starts[i] <= starts[i + 1] for i in range(len(starts) - 1)))
    # "table" is sung repeatedly in the final hook ("...table, table, table!");
    # the FIRST plain-"table" occurrence is the sung pin the v1 fix targeted
    # (~40.8s). Exclude the "T-t-table!" stutter tokens.
    tbl = [w for w in words if w["word"].strip(".,!?").lower() == "table"]
    check("'table' present in aligned output", bool(tbl),
          str([w["word"] for w in words[-6:]]))
    if tbl:
        ts = tbl[0]["start"]
        check("first sung 'table' lands 40.3-41.5s (its pin, ~40.8)",
              40.3 <= ts <= 41.5, "table_start=%.3f" % ts)


def main():
    for t in (test_destutter, test_section_parsing, test_owned_images_in_order,
              test_pin_pins_its_section, test_no_pin_proportional_fallback,
              test_pin_outlier_filtered, test_engage_threshold, test_hold_rule,
              test_schedule_mode_reporting, test_full_w02_shape,
              test_passing_song_plan_unchanged,
              test_type_section, test_energy_bounds_snaps_to_transition,
              test_energy_bounds_no_env_falls_back,
              test_energy_bounds_respects_pins_hard,
              test_within_section_pin_timing, test_min_hold_drops_overflow,
              test_min_hold_keeps_pinned, test_gates_present_and_pass_synthetic,
              test_shot_report_timing_source, test_w02_real_timeline_gates,
              test_w02_real_align_regression):
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
