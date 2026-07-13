"""Audio analysis for mvgen.

Reads an mp3 with librosa and produces ONE timeline.json describing the song:
audio metadata, a phase/tempo-corrected beat grid, downbeats, strong onsets,
RMS-energy sections, and (optionally) word-level lyric timestamps.

Two lyric paths:
  * ``--lyrics`` (quality path): the pasted lyric words are GROUND TRUTH. A local
    whisper pass supplies only *timing*; we Needleman-Wunsch align the transcript
    to the lyric words, windowed-re-transcribe any uncovered regions, and finally
    even-distribute (RMS-gated) whatever whisper never heard. The displayed words
    are always the lyric words. See align.py + ``build_aligned_words``.
  * no lyrics (fallback): plain transcription + the anti-hallucination degenerate
    filter, exactly as phase 1.

No network at render time. Whisper models are local (faster-whisper). Beat-grid
selection defends against librosa half/double-time errors on synth/kids tracks.

Deterministic: same audio in -> same timeline out. Whisper decode is pinned
beam_size=5, temperature=0, condition_on_previous_text=False.
"""

import json
import math
import os
import re
import sys

import numpy as np

from align import (
    align_indices,
    distribute_across_intervals,
    extract_lyric_words,
    normalize,
)
from subs import load_subs_words

HOP = 512  # librosa onset/rms hop; single source of truth for frame<->time


def _log(msg):
    print("[analyze] %s" % msg, file=sys.stderr, flush=True)


# ---------------------------------------------------------------------------
# Beat grid / downbeat / onset / section analysis (librosa)
# ---------------------------------------------------------------------------

def analyze_audio(audio_path):
    """Return ``(info, aux)``.

    ``info`` is the serializable analysis (duration, sr, tempo, beats, downbeats,
    onsets, sections, grid); ``aux`` carries in-memory arrays the aligner reuses
    (active/singing intervals, duration) so we don't re-load the audio.
    """
    import librosa

    _log("loading audio: %s" % audio_path)
    y, sr = librosa.load(audio_path, sr=None, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))
    _log("duration=%.2fs sr=%d" % (duration, sr))

    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)

    def onset_at(t):
        idx = int(round(t * sr / HOP))
        idx = min(max(idx, 0), len(onset_env) - 1)
        return float(onset_env[idx])

    # Base tempo/beat estimate (may be half/double the musical tempo).
    base_tempo, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=sr, hop_length=HOP, trim=False)
    base_tempo = float(np.atleast_1d(base_tempo)[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP)

    # Strong onsets (for cut-snapping).
    onset_frames = librosa.onset.onset_detect(
        onset_envelope=onset_env, sr=sr, hop_length=HOP, backtrack=False)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=HOP)
    onsets = sorted(round(float(t), 3) for t in onset_times)

    # --- beat-grid selection: {T/2, T, 2T} x phase, maximize MEAN onset ---
    grid = _select_beat_grid(onset_at, duration, base_tempo, beat_times)
    beats = [round(float(t), 3) for t in grid["times"]]
    tempo = round(60.0 / grid["period"], 2) if grid["period"] > 0 else base_tempo
    _log("beat grid: base_tempo=%.1f -> chosen factor=%.2f period=%.3fs "
         "(%.1f bpm) phase=%.3fs mean_onset=%.4f | %d beats"
         % (base_tempo, grid["factor"], grid["period"], tempo, grid["phase"],
            grid["score"], len(beats)))

    # --- downbeats: 4/4 phase carrying the most onset energy on the grid ---
    downbeats = _downbeats_from_grid(beats, onset_at)
    _log("%d downbeats (assumed 4/4)" % len(downbeats))

    # --- RMS sections + active/singing intervals ---
    sections, active_intervals = _rms_sections(y, sr, duration)
    _log("%d sections, %d active intervals" % (len(sections),
                                               len(active_intervals)))

    info = {
        "duration": round(duration, 3),
        "sample_rate": int(sr),
        "tempo": tempo,
        "beats": beats,
        "downbeats": [round(float(t), 3) for t in downbeats],
        "onsets": onsets,
        "sections": sections,
        "grid": {
            "base_tempo": round(base_tempo, 2),
            "chosen_factor": grid["factor"],
            "period": round(grid["period"], 4),
            "phase": round(grid["phase"], 4),
            "candidates": grid["candidates"],
        },
    }
    aux = {"active_intervals": active_intervals, "duration": duration}
    return info, aux


def _select_beat_grid(onset_at, duration, base_tempo, beat_times, n_phase=12):
    """Pick the {0.5, 1.0, 2.0}xT grid + phase maximizing MEAN onset strength.

    Kids/synth tracks routinely make librosa lock at half or double the musical
    tempo. We score each candidate grid by the mean onset strength sampled at its
    beat times (a mis-phased or wrong-period grid samples the gaps -> low mean).
    Tie-break: prefer the factor nearest 1.0 within 3% of the top score, so we
    only double/halve when the evidence is real (avoids needless sparse cuts).
    Prints every candidate's metric.
    """
    if len(beat_times) >= 2:
        T = float(np.median(np.diff(beat_times)))
    else:
        T = 60.0 / max(1e-6, base_tempo)
    if T <= 0.05:
        T = 0.5

    candidates = []
    for factor in (0.5, 1.0, 2.0):
        P = T * factor
        if P <= 0.05 or P >= duration:
            continue
        best = None
        for pi in range(n_phase):
            phase = P * pi / n_phase
            times = np.arange(phase, duration, P)
            if len(times) == 0:
                continue
            score = float(np.mean([onset_at(t) for t in times]))
            if best is None or score > best[0]:
                best = (score, phase, times)
        if best is not None:
            candidates.append({
                "factor": factor,
                "period": P,
                "phase": best[1],
                "score": round(best[0], 5),
                "times": best[2],
            })

    if not candidates:  # degenerate: single flat grid
        P = max(0.5, 60.0 / max(1e-6, base_tempo))
        times = np.arange(0.0, duration, P)
        return {"factor": 1.0, "period": P, "phase": 0.0, "score": 0.0,
                "times": times, "candidates": []}

    best_score = max(c["score"] for c in candidates)
    for c in candidates:
        _log("  grid candidate factor=%.2f period=%.3fs (%.1f bpm) "
             "phase=%.3fs mean_onset=%.5f%s"
             % (c["factor"], c["period"], 60.0 / c["period"], c["phase"],
                c["score"], "  <- best raw" if c["score"] == best_score else ""))

    eligible = [c for c in candidates if c["score"] >= best_score * 0.97]
    winner = min(eligible, key=lambda c: abs(math.log(c["factor"])))
    if winner["score"] < best_score:
        _log("  tie-break: chose factor=%.2f (nearest 1.0 within 3%% of best "
             "%.5f)" % (winner["factor"], best_score))
    cand_summary = [{"factor": c["factor"], "bpm": round(60.0 / c["period"], 1),
                     "mean_onset": c["score"]} for c in candidates]
    return {"factor": winner["factor"], "period": winner["period"],
            "phase": winner["phase"], "score": winner["score"],
            "times": winner["times"], "candidates": cand_summary}


def _downbeats_from_grid(beats, onset_at, beats_per_bar=4):
    """Choose the 4/4 phase whose beats sit on the strongest onsets."""
    if not beats:
        return []
    best_phase, best_score = 0, -1.0
    for phase in range(beats_per_bar):
        sel = beats[phase::beats_per_bar]
        if not sel:
            continue
        score = float(np.mean([onset_at(t) for t in sel]))
        if score > best_score:
            best_score, best_phase = score, phase
    return beats[best_phase::beats_per_bar]


def _rms_sections(y, sr, duration, n_levels=3):
    """Segment the song into low/mid/high energy sections AND return the
    active/singing intervals (frames above a low activity floor).

    Returns ``(sections, active_intervals)``.
    """
    import librosa

    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    if rms.size == 0:
        return ([{"start": 0.0, "end": round(duration, 3),
                  "level": 1, "label": "mid", "energy": 0.0}],
                [(0.0, round(duration, 3))])
    win = max(1, int(round(sr / HOP)))  # ~1s smoothing
    kernel = np.ones(win) / win
    smooth = np.convolve(rms, kernel, mode="same")

    lo, hi = float(smooth.min()), float(smooth.max())
    span = (hi - lo) or 1.0
    levels = np.clip(((smooth - lo) / span * n_levels).astype(int),
                     0, n_levels - 1)
    times = librosa.frames_to_time(np.arange(len(levels)), sr=sr,
                                   hop_length=HOP)

    labels = {0: "low", 1: "mid", 2: "high"}
    sections = []
    start_i = 0
    for i in range(1, len(levels) + 1):
        if i == len(levels) or levels[i] != levels[start_i]:
            lvl = int(levels[start_i])
            s = float(times[start_i])
            e = float(times[i]) if i < len(levels) else round(duration, 3)
            seg_energy = float(np.mean(smooth[start_i:i]))
            sections.append({"start": round(s, 3), "end": round(e, 3),
                             "level": lvl, "label": labels.get(lvl, str(lvl)),
                             "energy": round(seg_energy, 5)})
            start_i = i
    merged = []
    for sec in sections:
        if merged and (sec["end"] - sec["start"]) < 2.0:
            merged[-1]["end"] = sec["end"]
        else:
            merged.append(sec)

    # Active intervals: smoothed RMS above 15% of dynamic range = "singing".
    thresh = lo + 0.15 * span
    active_mask = smooth > thresh
    active_intervals = []
    a_start = None
    for i in range(len(active_mask)):
        if active_mask[i] and a_start is None:
            a_start = float(times[i])
        elif not active_mask[i] and a_start is not None:
            active_intervals.append((round(a_start, 3), round(float(times[i]), 3)))
            a_start = None
    if a_start is not None:
        active_intervals.append((round(a_start, 3), round(duration, 3)))
    if not active_intervals:
        active_intervals = [(0.0, round(duration, 3))]
    return merged, active_intervals


# ---------------------------------------------------------------------------
# Whisper transcription
# ---------------------------------------------------------------------------

def _clean(word):
    """Trim whitespace and stray leading punctuation whisper attaches to
    stuttered/short tokens ('-A', '.A.'), keeping internal apostrophes/hyphens
    and any trailing sentence punctuation."""
    w = word.strip()
    while w and w[0] in "-–—.,":
        w = w[1:].lstrip()
    return w.strip()


def _make_transcriber(model_size):
    """Return a ``transcribe(audio, initial_prompt=None) -> [{word,start,end}]``
    closure over a single loaded faster-whisper model (reused for the full pass
    AND every windowed re-transcription), or None if unavailable.

    ``audio`` may be a file path (full pass) or a float32 numpy array at 16 kHz
    (windowed pass) — faster-whisper accepts both.
    """
    try:
        from faster_whisper import WhisperModel
    except Exception as e:  # noqa: BLE001
        _log("faster-whisper unavailable (%s) -> aligned path degrades to "
             "RMS-gated even distribution" % e.__class__.__name__)
        return None
    try:
        _log("faster-whisper: loading model %r (cpu/int8)" % model_size)
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
    except Exception as e:  # noqa: BLE001
        _log("faster-whisper model load failed (%s: %s)" % (
            e.__class__.__name__, e))
        return None

    def transcribe(audio, initial_prompt=None, language="en"):
        segments, _info = model.transcribe(
            audio, language=language, word_timestamps=True,
            initial_prompt=initial_prompt, beam_size=5, temperature=0,
            condition_on_previous_text=False)
        words = []
        for seg in segments:
            for w in (seg.words or []):
                txt = _clean(w.word)
                if txt:
                    words.append({"word": txt, "start": float(w.start),
                                  "end": float(w.end)})
        return words

    return transcribe


def _try_stable_ts(audio_path, model_size, lyrics_text, language):
    try:
        import stable_whisper  # noqa
    except Exception as e:  # noqa: BLE001
        _log("stable-ts not available (%s)" % e.__class__.__name__)
        return None
    try:
        _log("stable-ts: loading model %r" % model_size)
        model = stable_whisper.load_model(model_size)
        result = model.transcribe(
            audio_path, language=language, initial_prompt=lyrics_text,
            temperature=0, beam_size=5, condition_on_previous_text=False,
            verbose=None)
        words = []
        for seg in result.segments:
            for w in seg.words:
                txt = _clean(w.word)
                if txt:
                    words.append({"word": txt, "start": round(float(w.start), 3),
                                  "end": round(float(w.end), 3)})
        _log("stable-ts: %d words" % len(words))
        return words
    except Exception as e:  # noqa: BLE001
        _log("stable-ts failed (%s: %s)" % (e.__class__.__name__, e))
        return None


def transcribe_words(audio_path, model_size="base", lyrics_text=None,
                     language="en"):
    """Plain transcription (no-lyrics fallback path). Empty list on failure."""
    words = _try_stable_ts(audio_path, model_size, lyrics_text, language)
    if words is not None:
        return words
    tr = _make_transcriber(model_size)
    if tr is None:
        _log("no whisper backend -> empty words[] (render without subtitles). "
             "Install: pip install --break-system-packages faster-whisper")
        return []
    words = tr(audio_path, initial_prompt=lyrics_text, language=language)
    _log("faster-whisper: %d words" % len(words))
    return words


# ---------------------------------------------------------------------------
# Degenerate-word filter (anti hallucination — used on transcript, not lyrics)
# ---------------------------------------------------------------------------

def _norm_key(word):
    return re.sub(r"[^a-z0-9]", "", word.lower())


def _collapse_repeats_once(words):
    keys = [_norm_key(w["word"]) for w in words]
    n = len(words)
    out = []
    dropped = 0
    i = 0
    while i < n:
        matched = False
        for L in (4, 3, 2, 1):
            if i + 2 * L <= n and keys[i:i + L] == keys[i + L:i + 2 * L]:
                reps = 2
                j = i + 2 * L
                while j + L <= n and keys[j:j + L] == keys[i:i + L]:
                    reps += 1
                    j += L
                if reps >= 3:
                    out.extend(words[i:i + 2 * L])
                    dropped += (reps - 2) * L
                    i = j
                    matched = True
                    break
        if not matched:
            out.append(words[i])
            i += 1
    return out, dropped


def _filter_degenerate(words, duration):
    if not words:
        return words
    collapsed = words
    n_collapsed = 0
    while True:
        collapsed, d = _collapse_repeats_once(collapsed)
        n_collapsed += d
        if d == 0:
            break
    kept = [w for w in collapsed if (w["end"] - w["start"]) > 0.0]
    n_zero = len(collapsed) - len(kept)
    final = [w for w in kept if w["start"] < duration]
    n_past = len(kept) - len(final)
    if n_collapsed or n_zero or n_past:
        _log("degenerate filter: collapsed %d repeat, dropped %d zero-dur, %d "
             "past-end (%d -> %d words)"
             % (n_collapsed, n_zero, n_past, len(words), len(final)))
    return final


# ---------------------------------------------------------------------------
# Lyrics-as-ground-truth alignment (quality path A)
# ---------------------------------------------------------------------------

_MAX_WINDOWS = 16          # cap on windowed re-transcriptions per song
_MIN_WINDOW_DUR = 0.6      # don't re-transcribe a sliver
_WHISPER_SR = 16000

# FIX 5 (giant alignment blob guard): a single sung word never plausibly spans
# more than this. faster-whisper can emit one "word" covering a whole whispered/
# held intro (W02 had a 20.7s token; W08 an 8s 'Sit,'), which poisons subtitles
# AND leaves the region anchorless while the image scheduler cycles fillers. Any
# aligned word longer than this is DEMOTED: first un-anchored so the existing
# windowed re-transcription can try to time it properly, and — if it still cannot
# be timed — BLANKED (dropped from the output) so that region renders
# subtitle-free and hands the matcher no false anchor, rather than smearing one
# word across many seconds.
#
# WARN-1 (melisma headroom): raised 2.5 -> 4.5. A GENUINE held sung note (a
# melisma — "caaaaat" drawn across ~3.5-4s over a musical phrase) is a real,
# correctly-timed word, NOT a blob. The old 2.5 threshold demoted/blanked it,
# which both lost the subtitle AND — because the dropped span then read as a
# no-timed-word hole between its neighbours — inflated the inter-token gap past
# shotlist.MATCH_TOKEN_GAP, silently truncating a correct phrase (traced:
# "the cat sat[3.5s] in the cap" lost cat-in-cap to a bare cat). 4.5 keeps a
# sung melisma as a real timed word while still catching the actual artefacts
# this guard exists for (the 8s and 20.7s blobs are far above 4.5 — headroom is
# safe). The companion fix is shotlist.MATCH_TOKEN_GAP measuring only true
# inter-word SILENCE, so a surviving melisma's DURATION no longer counts as
# cross-line reach.
_MAX_WORD_SPAN = 4.5


def build_aligned_words(audio_path, lyrics_text, duration, aux, model_size):
    """Ground-truth lyric alignment. Returns ``[{word,start,end}]`` where every
    ``word`` is a lyric token, timed from whisper via DP alignment + windowed
    re-transcription + RMS-gated even-distribution fallback."""
    lyric_words = extract_lyric_words(lyrics_text)
    if not lyric_words:
        _log("lyrics contained no sung tokens -> no subtitles")
        return []
    _log("lyrics ground truth: %d display tokens" % len(lyric_words))

    tr = _make_transcriber(model_size)
    active = aux.get("active_intervals") or [(0.0, duration)]

    # Timed slots parallel to lyric_words; start/end None until resolved.
    timed = [{"word": w["word"], "key": w["key"], "start": None, "end": None,
              "matched": False} for w in lyric_words]

    if tr is None:
        _log("no whisper -> even-distribute all %d lyric words across active "
             "song (RMS-gated)" % len(timed))
        _even_fill(timed, 0, len(timed) - 1, 0.0, duration, active)
        _blank_long_spans(timed)  # FIX 5 backstop even without whisper
        return _finalize(timed, duration)

    # --- Pass 1: full transcript -> DP align ---
    full = _filter_degenerate(tr(audio_path), duration)
    _log("full transcript: %d words (span %.1f-%.1fs)"
         % (len(full), full[0]["start"] if full else 0.0,
            full[-1]["end"] if full else 0.0))
    tkeys = [normalize(w["word"]) for w in full]
    lkeys = [w["key"] for w in timed]
    matched = align_indices(lkeys, tkeys)
    for i, j in enumerate(matched):
        if j is not None:
            timed[i]["start"] = full[j]["start"]
            timed[i]["end"] = full[j]["end"]
            timed[i]["matched"] = True
    raw_m = sum(1 for w in timed if w["matched"])
    dropped = _reject_compressed_matches(timed)
    # NB: sparse-false-anchor rejection is deferred to AFTER Pass 2 (see below).
    # Doing it here would reshape the uncovered runs and thus shift Pass-2 window
    # boundaries elsewhere in the song — the fix must not perturb the front half.
    # FIX 5: un-anchor giant matched spans NOW so Pass 2's windowed
    # re-transcription can try to time them properly (a demoted giant word
    # becomes an uncovered run bounded by its neighbours).
    long_demoted = _demote_long_spans(timed)
    if long_demoted:
        _log("pass-1: demoted %d matched span(s) > %.1fs (giant-blob guard) -> "
             "uncovered for re-transcription" % (long_demoted, _MAX_WORD_SPAN))
    n_matched = sum(1 for w in timed if w["matched"])
    _log("pass-1 alignment: %d matched, %d dropped as compressed/false -> "
         "%d/%d trusted anchors (%.0f%%)"
         % (raw_m, dropped, n_matched, len(timed),
            100.0 * n_matched / len(timed)))

    # --- Pass 2: windowed re-transcription of each uncovered run ---
    y16 = None
    windows_used = 0
    for (gs, ge) in _uncovered_runs(timed):
        t0 = _anchor_before(timed, gs)
        t1 = _anchor_after(timed, ge, duration)
        if t1 <= t0 or windows_used >= _MAX_WINDOWS:
            continue
        if not ((t1 - t0) >= _MIN_WINDOW_DUR and (t1 - t0) < duration * 0.9):
            continue
        if y16 is None:
            y16 = _load_16k(audio_path)
        if y16 is None:
            break
        seg = y16[int(t0 * _WHISPER_SR):int(t1 * _WHISPER_SR)]
        if seg.size < int(_MIN_WINDOW_DUR * _WHISPER_SR):
            continue
        prompt = " ".join(timed[i]["word"] for i in range(gs, ge + 1))
        wtr = tr(seg, initial_prompt=prompt)
        windows_used += 1
        if not wtr:
            continue
        wkeys = [normalize(w["word"]) for w in wtr]
        run_keys = [timed[i]["key"] for i in range(gs, ge + 1)]
        wmatch = align_indices(run_keys, wkeys)
        got = 0
        for r, j in enumerate(wmatch):
            if j is not None:
                idx = gs + r
                timed[idx]["start"] = t0 + wtr[j]["start"]
                timed[idx]["end"] = t0 + wtr[j]["end"]
                timed[idx]["matched"] = True
                got += 1
        if got:
            _log("  window [%.2f,%.2f]s: +%d/%d words"
                 % (t0, t1, got, ge - gs + 1))
    # Window matches can also compress — reject the false ones.
    win_dropped = _reject_compressed_matches(timed)
    # CRIT-1: un-anchor implausibly SPARSE false anchors — a lone common word
    # (whisper decode-loops, then a stray "a"/"it's" false-matches a far-off
    # transcript token) that strands a multi-second blank across an actively-
    # singing span (e.g. right before the 'PO-TA-TO!' climax). Done HERE, after
    # ALL re-transcription, so the definitive fallback (Pass 3 even-fill, which
    # never re-transcribes) stretches the lyric word(s) across the active span
    # instead of leaving the climax blank. Deferring it past Pass 2 also means it
    # cannot reshape earlier windows — the front half stays byte-identical.
    win_sparse = _reject_sparse_anchors(timed, active)
    # FIX 5: a window re-transcription can itself yield a giant span — un-anchor
    # it too (before Pass 3) so it never acts as a bad even-fill boundary.
    win_long = _demote_long_spans(timed)

    # --- Pass 3: RMS-gated even distribution of everything still uncovered ---
    even_runs = 0
    for (gs, ge) in _uncovered_runs(timed):
        t0 = _anchor_before(timed, gs)
        t1 = _anchor_after(timed, ge, duration)
        if t1 <= t0:
            t1 = min(duration, t0 + 0.12 * (ge - gs + 1))
        _even_fill(timed, gs, ge, t0, t1, active)
        even_runs += 1

    # FIX 5 backstop: anything STILL longer than _MAX_WORD_SPAN (a lone word
    # even-spread across a long anchorless region) is blanked -> dropped in
    # _finalize, leaving that region subtitle-free instead of a multi-second
    # smear the matcher would false-anchor on.
    long_blanked = _blank_long_spans(timed)

    _log("gap fill: %d windows re-transcribed (%d compressed + %d sparse + %d "
         "long window matches dropped), %d run(s) even-distributed, %d long "
         "span(s) blanked"
         % (windows_used, win_dropped, win_sparse, win_long, even_runs,
            long_blanked))
    if os.environ.get("MVGEN_DEBUG"):
        for i, w in enumerate(timed):
            _log("  [%02d] m=%d %6s..%6s  %s"
                 % (i, int(w["matched"]),
                    ("%.2f" % w["start"]) if w["start"] is not None else "None",
                    ("%.2f" % w["end"]) if w["end"] is not None else "None",
                    w["word"]))
    return _finalize(timed, duration)


def _uncovered_runs(timed):
    """Return [(start_idx, end_idx), ...] of maximal runs of unmatched words.

    A ``blank`` word (FIX 5 — a demoted giant span that could not be timed) is
    NOT part of an uncovered run: it must stay untimed (dropped later), so it
    breaks runs like a matched word does and is never even-distributed."""
    def _fillable(w):
        return not w["matched"] and not w.get("blank")
    runs = []
    i, n = 0, len(timed)
    while i < n:
        if _fillable(timed[i]):
            j = i
            while j + 1 < n and _fillable(timed[j + 1]):
                j += 1
            runs.append((i, j))
            i = j + 1
        else:
            i += 1
    return runs


def _anchor_before(timed, gs):
    for i in range(gs - 1, -1, -1):
        if timed[i]["matched"] and timed[i]["end"] is not None:
            return float(timed[i]["end"])
    return 0.0


def _anchor_after(timed, ge, duration):
    for i in range(ge + 1, len(timed)):
        if timed[i]["matched"] and timed[i]["start"] is not None:
            return float(timed[i]["start"])
    return float(duration)


_MIN_WORD_SLOT = 0.10  # floor seconds/word; faster is unsingable = false anchor


def _reject_compressed_matches(timed):
    """Demote matched anchors that are temporally impossible.

    Whisper decode-loops on repetitive songs and simply stops producing words
    partway through; the leftover late lyric words (all common tokens like 'a',
    "it's", 'what') then falsely align to the last real transcript tokens,
    compressing dozens of words into a fraction of a second. We walk the matched
    anchors left-to-right (the front of the transcript is the reliable part),
    keep the earliest, and drop any later anchor that leaves < _MIN_WORD_SLOT per
    word for the words between it and the last kept anchor. Dropped anchors fall
    back to windowed re-transcription / RMS-gated even distribution. Returns the
    count dropped."""
    last_i, last_t = None, None
    dropped = 0
    for i, w in enumerate(timed):
        if not w["matched"]:
            continue
        t = w["start"]
        if last_i is not None and (t - last_t) < (i - last_i) * _MIN_WORD_SLOT:
            w["matched"] = False
            w["start"] = None
            w["end"] = None
            dropped += 1
            continue
        last_i, last_t = i, t
    return dropped


_SPARSE_GAP_MIN = 2.5       # s: absolute floor for a suspect sparse gap
_SPARSE_GAP_FACTOR = 3.0    # gap must exceed this x the median inter-anchor gap
_WEAK_KEY_MAXLEN = 3        # anchors on keys this short are weak/un-anchorable
_SPARSE_ACTIVE_FRAC = 0.5   # span must be >= this fraction RMS-active (singing)


def _span_active_fraction(a, b, active):
    """Fraction of [a,b] covered by the RMS active (singing) intervals."""
    if b <= a:
        return 0.0
    covered = 0.0
    for (ia, ib) in active:
        lo, hi = max(ia, a), min(ib, b)
        if hi > lo:
            covered += hi - lo
    return covered / (b - a)


def _reject_sparse_anchors(timed, active):
    """Demote a matched anchor stranded an implausibly LONG time after its
    predecessor while the audio is actively singing across the gap — the
    symmetric partner to _reject_compressed_matches.

    Whisper decode-loops stop mid-song; a late COMMON lyric word ('a', "it's",
    'what') then falsely aligns to a much-later transcript token, opening a
    multi-second blank right where the song is loudest (e.g. before the
    'PO-TA-TO!' climax) — _reject_compressed_matches never fires because the gap
    is too WIDE, not too dense. We compute the median inter-anchor gap and, for
    each consecutive matched-anchor pair whose gap exceeds
    max(_SPARSE_GAP_MIN, factor x median) while its span is majority RMS-active,
    un-anchor the WEAK boundary word (short/common key — a strong distinctive
    anchor is trusted; the front of the transcript is the reliable part, so when
    both are weak we drop the LATER one). Un-anchoring merges the stranded word
    into the following uncovered run, which the existing recovery ladder
    (windowed re-transcription -> RMS-gated even distribution) then re-covers.
    Deterministic. Returns the count un-anchored."""
    # Capture start/end at build time: a later iteration may un-anchor a word
    # (clearing its start to None), so we must NOT re-read the live dict for
    # timing — only for the up-to-date "still matched?" guard.
    anchors = [(w, float(w["start"]),
                float(w["end"]) if w["end"] is not None else float(w["start"]))
               for w in timed if w["matched"] and w["start"] is not None]
    if len(anchors) < 2:
        return 0
    gaps = [c[1] - p[1] for p, c in zip(anchors, anchors[1:])]
    pos = [g for g in gaps if g > 0]
    med = float(np.median(pos)) if pos else 0.0
    threshold = max(_SPARSE_GAP_MIN, _SPARSE_GAP_FACTOR * med)
    dropped = 0
    for (pw, _ps, pe), (cw, cs, _ce) in zip(anchors, anchors[1:]):
        gap = cs - _ps
        if gap < threshold:
            continue
        if not pw["matched"] or not cw["matched"]:
            continue  # a neighbour was already un-anchored this pass
        if _span_active_fraction(pe, cs, active) < _SPARSE_ACTIVE_FRAC:
            continue
        cw_weak = len(cw["key"]) <= _WEAK_KEY_MAXLEN
        pw_weak = len(pw["key"]) <= _WEAK_KEY_MAXLEN
        target = cw if cw_weak else (pw if pw_weak else None)
        if target is None:  # two strong distinctive words genuinely far apart
            continue
        target["matched"] = False
        target["start"] = None
        target["end"] = None
        dropped += 1
    return dropped


def _demote_long_spans(timed):
    """FIX 5, pass 1: un-anchor any MATCHED word spanning > _MAX_WORD_SPAN.

    A giant matched span is a faster-whisper artifact (one 'word' covering a
    whole whispered/held phrase). Demoting it (matched=False, start/end=None)
    merges it back into an uncovered run so the existing windowed
    re-transcription ladder gets a chance to time it properly. Returns the count
    demoted. Runs BEFORE Pass 2 so re-transcription can act."""
    dropped = 0
    for w in timed:
        if not w["matched"] or w["start"] is None or w["end"] is None:
            continue
        if (float(w["end"]) - float(w["start"])) > _MAX_WORD_SPAN:
            w["matched"] = False
            w["start"] = None
            w["end"] = None
            dropped += 1
    return dropped


def _blank_long_spans(timed):
    """FIX 5, final backstop: BLANK any word still spanning > _MAX_WORD_SPAN.

    Runs AFTER all re-transcription + even-distribution. Anything still too long
    (a lone lyric word even-spread across a long anchorless region, or a giant
    match re-transcription could not shorten) is marked ``blank`` and cleared —
    ``_finalize`` then drops it entirely, so the region renders subtitle-free
    (no smear) and the image matcher gets no false multi-second anchor. Returns
    the count blanked."""
    blanked = 0
    for w in timed:
        if w.get("blank"):
            continue
        s, e = w["start"], w["end"]
        if s is None or e is None:
            continue
        if (float(e) - float(s)) > _MAX_WORD_SPAN:
            w["blank"] = True
            w["start"] = None
            w["end"] = None
            blanked += 1
    return blanked


def _even_fill(timed, gs, ge, t0, t1, active):
    """Even-distribute timed[gs..ge] across [t0,t1], restricted to active
    (singing) intervals when any overlap the window; else across the raw span.

    W1: every word placed here is a GUESS (no whisper hit), so it is flagged
    ``approx=True``. Downstream (shotlist) widens the image pre-roll for anchors
    whose trigger time is approximate. Only even-distributed words get the flag.
    """
    words = [timed[k] for k in range(gs, ge + 1)]
    for w in words:
        w["approx"] = True
    local = [(max(a, t0), min(b, t1)) for (a, b) in active
             if min(b, t1) - max(a, t0) > 1e-3]
    if not local or not distribute_across_intervals(words, local):
        # raw even split
        k = len(words)
        step = (t1 - t0) / k if k else 0.0
        for idx, w in enumerate(words):
            w["start"] = t0 + idx * step
            w["end"] = t0 + (idx + 1) * step


def _load_16k(audio_path):
    try:
        import librosa
        y16, _ = librosa.load(audio_path, sr=_WHISPER_SR, mono=True)
        return y16.astype("float32")
    except Exception as e:  # noqa: BLE001
        _log("16k reload for windowing failed (%s) -> even-distribute" % e)
        return None


def _finalize(timed, duration):
    """Coerce every slot to a sane, monotonic, non-overlapping (word,start,end)."""
    out = []
    prev_end = 0.0
    for w in timed:
        # FIX 5: a blanked giant span carries no timing — drop it entirely so the
        # region stays subtitle-free (no smear) and hands the matcher no anchor.
        if w.get("blank"):
            continue
        s = w["start"] if w["start"] is not None else prev_end
        e = w["end"] if w["end"] is not None else s
        s = max(0.0, min(float(s), duration))
        e = max(s, min(float(e), duration))
        if s < prev_end:
            s = prev_end
        if e <= s:
            e = min(duration, s + 0.12)
        entry = {"word": w["word"], "start": round(s, 3), "end": round(e, 3)}
        # W1: carry the approx flag through ONLY when set (optional field — old
        # cached timelines and ass_karaoke, which read word/start/end, unaffected).
        if w.get("approx"):
            entry["approx"] = True
        out.append(entry)
        prev_end = e
    return out


# ---------------------------------------------------------------------------
# Subtitle-derived timing (contract V2 §C) — whisper is NOT called
# ---------------------------------------------------------------------------

def align_lyrics_to_subs(lyrics_text, subs_words, duration, aux):
    """Ground-truth lyric words timed from an imported subtitle file.

    Reuses the SAME alignment + rejection + even-fill ladder as the whisper
    path (``align.py`` + the reject helpers below), but the timing source is the
    parsed sub cues rather than a live transcription — no model is loaded.
    """
    lyric_words = extract_lyric_words(lyrics_text)
    if not lyric_words:
        _log("subs+lyrics: lyrics had no sung tokens -> using subtitle text")
        return [dict(w) for w in subs_words]
    active = aux.get("active_intervals") or [(0.0, duration)]
    timed = [{"word": w["word"], "key": w["key"], "start": None, "end": None,
              "matched": False} for w in lyric_words]
    skeys = [normalize(w["word"]) for w in subs_words]
    lkeys = [w["key"] for w in timed]
    matched = align_indices(lkeys, skeys)
    for i, j in enumerate(matched):
        if j is not None:
            timed[i]["start"] = subs_words[j]["start"]
            timed[i]["end"] = subs_words[j]["end"]
            timed[i]["matched"] = True
            # a lyric word timed from an evenly-split (approx) sub word inherits
            # the guess so the image scheduler widens its pre-roll.
            if subs_words[j].get("approx"):
                timed[i]["approx"] = True
    raw_m = sum(1 for w in timed if w["matched"])
    _reject_compressed_matches(timed)
    _reject_sparse_anchors(timed, active)
    # FIX 5: un-anchor giant matched sub-cue spans before even-fill (no
    # re-transcription is available on the subs path — they will either be
    # even-distributed with their run or, if still too long, blanked below).
    _demote_long_spans(timed)
    for (gs, ge) in _uncovered_runs(timed):
        t0 = _anchor_before(timed, gs)
        t1 = _anchor_after(timed, ge, duration)
        if t1 <= t0:
            t1 = min(duration, t0 + 0.12 * (ge - gs + 1))
        _even_fill(timed, gs, ge, t0, t1, active)
    _blank_long_spans(timed)  # FIX 5 backstop (see build_aligned_words)
    n_final = sum(1 for w in timed if w["matched"])
    _log("subs+lyrics alignment: %d lyric tokens, %d matched to sub words "
         "(%d after rejection), rest even-distributed"
         % (len(timed), raw_m, n_final))
    return _finalize(timed, duration)


# ---------------------------------------------------------------------------
# Top-level
# ---------------------------------------------------------------------------

def _hash_file_bytes(h, path):
    """Fold a file's raw bytes into hash ``h`` in 1 MB streamed chunks.

    Missing/unreadable files contribute nothing (treated as empty) so the
    fingerprint stays stable. Streaming keeps memory flat on multi-MB mp3s."""
    if not (path and os.path.exists(path)):
        return
    try:
        with open(path, "rb") as fh:
            for chunk in iter(lambda: fh.read(1024 * 1024), b""):
                h.update(chunk)
    except OSError:
        pass


def compute_inputs_fingerprint(lyrics_path=None, subs_path=None,
                               model_size="base", audio_path=None):
    """SHA-256 over the alignment inputs that determine the word timing/text.

    A cached timeline.json stores this so a later run can detect that any input
    changed (the duration-only guard cannot). FIX 1: the AUDIO bytes are folded
    in — the curriculum take-pick workflow reuses the SAME canonical mp3 filename
    across regenerated takes, so the out-dir (keyed on filename) and the duration
    can both be identical while the actual audio differs; without the audio in
    the fingerprint a regenerated take silently re-used the previous take's
    timeline. Digest = sha256(lyrics_text + \\x00 + subs BYTES + model + \\x00 +
    AUDIO BYTES). Old timelines whose fingerprint predates the audio fold simply
    mismatch once and re-analyze. Missing/unreadable files are treated as empty.
    """
    import hashlib
    h = hashlib.sha256()
    lyrics_text = ""
    if lyrics_path and os.path.exists(lyrics_path):
        try:
            with open(lyrics_path, "r", encoding="utf-8") as fh:
                lyrics_text = fh.read().strip()
        except OSError:
            lyrics_text = ""
    h.update(lyrics_text.encode("utf-8"))
    h.update(b"\x00")
    _hash_file_bytes(h, subs_path)
    h.update((model_size or "").encode("utf-8"))
    h.update(b"\x00")
    # FIX 1: the audio itself — the load-bearing addition for regenerated takes.
    _hash_file_bytes(h, audio_path)
    return h.hexdigest()


def build_timeline(audio_path, lyrics_path=None, no_lyrics=False,
                   model_size="base", subs_path=None):
    """Analyse audio (+optional lyrics/subs) and return the timeline dict."""
    info, aux = analyze_audio(audio_path)
    dur = info["duration"]

    lyrics_text = None
    if lyrics_path and os.path.exists(lyrics_path):
        with open(lyrics_path, "r", encoding="utf-8") as fh:
            lyrics_text = fh.read().strip() or None

    # Subtitle timing source (MacWhisper etc.): when present, whisper is NEVER
    # called. A malformed file degrades gracefully to the whisper/lyrics path.
    subs_words = None
    if subs_path and os.path.exists(subs_path):
        try:
            subs_words = load_subs_words(subs_path, dur)
            _log("subs: %d word timings from %s (whisper will NOT be called)"
                 % (len(subs_words), os.path.basename(subs_path)))
        except (OSError, ValueError) as e:
            _log("subs parse failed (%s) -> falling back to whisper/lyrics path"
                 % e)
            subs_words = None

    if no_lyrics:
        _log("--no-lyrics: skipping transcription")
        words = []
    elif subs_words is not None:
        if lyrics_text:
            words = align_lyrics_to_subs(lyrics_text, subs_words, dur, aux)
        else:
            _log("subs without lyrics -> subtitle text IS the display text")
            words = subs_words
    elif lyrics_text:
        words = build_aligned_words(audio_path, lyrics_text, dur, aux,
                                    model_size)
    else:
        _log("no lyrics provided -> transcription-only fallback")
        raw = transcribe_words(audio_path, model_size=model_size)
        for w in raw:
            w["start"] = max(0.0, min(w["start"], dur))
            w["end"] = max(w["start"], min(w["end"], dur))
        words = _filter_degenerate(raw, dur)

    return {
        "audio": {
            "path": os.path.abspath(audio_path),
            "filename": os.path.basename(audio_path),
            "duration": info["duration"],
            "sample_rate": info["sample_rate"],
            "tempo": info["tempo"],
        },
        "beats": info["beats"],
        "downbeats": info["downbeats"],
        "onsets": info["onsets"],
        "sections": info["sections"],
        "grid": info["grid"],
        "words": words,
        # Fingerprint of the alignment inputs (lyrics text + subs bytes + model
        # + AUDIO bytes) so a cached timeline is invalidated when ANY of them
        # change — including a regenerated take that kept the mp3 filename+
        # duration (FIX 1). mvgen.py's cache guard recomputes + compares this.
        "inputs_fingerprint": compute_inputs_fingerprint(
            lyrics_path, subs_path, model_size, audio_path=audio_path),
    }


def write_timeline(timeline, out_path):
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(timeline, fh, indent=2)
    _log("wrote %s" % out_path)


def main(argv=None):
    import argparse

    p = argparse.ArgumentParser(
        description="mvgen audio analysis -> timeline.json")
    p.add_argument("--audio", required=True)
    p.add_argument("--lyrics", default=None,
                   help="optional lyrics .txt (ground-truth aligned path)")
    p.add_argument("--subs", default=None,
                   help="optional .srt/.vtt timing source (skips whisper)")
    p.add_argument("--no-lyrics", action="store_true",
                   help="skip whisper; produce empty words[]")
    p.add_argument("--model", default="base",
                   help="whisper model size (tiny/base/small/...) or a path")
    p.add_argument("--out", required=True, help="output timeline.json path")
    args = p.parse_args(argv)

    tl = build_timeline(args.audio, lyrics_path=args.lyrics,
                        no_lyrics=args.no_lyrics, model_size=args.model,
                        subs_path=args.subs)
    write_timeline(tl, args.out)
    print("beats=%d downbeats=%d onsets=%d sections=%d words=%d duration=%.2f"
          % (len(tl["beats"]), len(tl["downbeats"]), len(tl["onsets"]),
             len(tl["sections"]), len(tl["words"]), tl["audio"]["duration"]))


if __name__ == "__main__":
    main()
