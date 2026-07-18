"""Lyric-synced image scheduling (the shot list).

Tredoux's complaint: "the pictures still don't line up at all with the song" —
the cup must be on screen when *cup* is sung. This module turns the ground-truth
lyric words (word-level timestamps in timeline.json) plus the beat grid into an
ordered list of shots ``(image, start, end)`` where every OBJECT image is on
screen exactly when its word is sung, and the cuts stay musical (beat-snapped).

No AI at render time. Pure, deterministic, stdlib only.

Design (as directed):
  1. Keyword index from image FILENAMES ("04-cup.png" -> "cup"; multi-token
     names index every token; naive plural folding so cup/cups/cupes match).
  2. Anchors = keyword occurrences in the lyric words. Consecutive repeats of the
     SAME keyword (while its image is already showing) collapse into ONE anchor
     (a "cluster"); a later mention after a DIFFERENT image intervened is a new
     anchor.
  3. Each anchor's shot STARTS on the beat-grid cut immediately BEFORE the word
     (with a >=0.35s pre-roll so the image is comfortably up when the word lands)
     and HOLDS across the keyword's sung cluster. Gaps with no anchor (intro /
     instrumental / unmatched stretches) are filled with the UNMATCHED images,
     cycling on the normal ``--cut-every`` cadence; if they run out, the
     least-recently-shown image is reused. Every cut is beat/onset-snapped.

The beat-grid primitives (``snap_to_onset`` / ``build_cut_grid`` /
``build_segments``) live here so engine_slideshow (the cycle path) and this
module (the lyric path) share ONE copy of the snapping logic.
"""

import os
import re
import statistics
import sys

# Script-schedule mode reuses the SAME lyric parser as analyze.py's aligner
# (align.py is stdlib-only — no circular import; it never imports shotlist).
from align import extract_lyric_words

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".bmp")

# Tokens too short or too common to be a meaningful "sung object". A filename
# like ``a-cat.png`` must index "cat", NOT "a" (else the word "a" — sung on
# nearly every line — hijacks the whole shot list).
#
# FIX 2 (meaning-bearing short tokens): this is a PREPOSITION-teaching curriculum
# — in/on/up/at ARE the taught words, and images are named ``ox.png`` / ``up.png``
# / ``cat-in-cap.png``. The old 3-char minimum silently made ``ox``/``up`` (and
# the ``in``/``on`` inside ``cat-in-cap``) unmatchable, so the min is now 2 and
# the stopword set is the sole gate. To keep ubiquitous connectives (is/it/the/a…)
# from hijacking the shot list, the stopword set is EXPANDED to the common
# 2-letter function words — EXCEPT a small MEANING whitelist of 2-letter words
# that ARE sung objects/prepositions this curriculum teaches. Every whitelist
# word is kept on BOTH sides (filename token AND lyric content word).
#   * ``_MEANING_TOKENS`` (KEPT as tokens): in on up at ox ax go. This constant
#     is the DECLARED whitelist; the actual keep-behaviour comes from these words
#     simply being ABSENT from ``_STOPWORDS``. The two are tied by a runtime
#     assertion below (``_MEANING_TOKENS`` and ``_STOPWORDS`` must stay disjoint)
#     so the invariant can never silently drift.
#   * 'what' is a TAUGHT question word (W8 oralWords) and disambiguates
#     ``chick-what.png`` from ``chick.png`` — so it is NOT a stopword (it is >2
#     chars, so it never needed the meaning-whitelist to survive).
#   * still stopped: the/a/is/and/who + the connectives below (incl. the WARN-2
#     additions me/us/hi/ok/oh — pronouns/interjections, never a sung OBJECT).
_MEANING_TOKENS = frozenset({"in", "on", "up", "at", "ox", "ax", "go"})
_STOPWORDS = frozenset({
    # articles / conjunctions / ubiquitous connectives (never a sung object)
    "a", "an", "and", "as", "the", "to", "or", "no", "so", "of",
    # pronouns / auxiliaries
    "i", "he", "we", "my", "you", "its", "who",
    # 2-letter function words that would otherwise hijack the list
    "is", "it", "be", "by", "do", "if", "am",
    # WARN-2: more pronouns / interjections the expansion comment claimed but
    # never actually included — none are sung objects.
    "me", "us", "hi", "ok", "oh",
    # NB: NOT stopped -> in on up at ox ax go (meaning) + what (taught word)
})

# WARN-2: enforce the whitelist<->stopword invariant. ``_MEANING_TOKENS`` is
# otherwise documentation-only; this assertion makes it load-bearing — if any
# taught preposition/object ever leaks into ``_STOPWORDS`` (silently making
# ``ox``/``up``/``in`` unmatchable again), import fails loudly instead.
assert not (_MEANING_TOKENS & _STOPWORDS), (
    "meaning tokens leaked into stopwords: %r" % (_MEANING_TOKENS & _STOPWORDS))
# 2 so ``ox``/``up``/``in``/``on`` survive; the stopword set does the real work.
_MIN_TOKEN_LEN = 2

# Pre-roll (seconds) widened for anchors whose trigger word was placed by
# analyze.py's even-distribution fallback (``approx: true``) — a guessed time is
# not exact, so give the image extra lead-in so it is up before the sung word.
APPROX_PREROLL = 1.0

# ---------------------------------------------------------------------------
# Approx-run suppression (the stutter-song garble guard)
# ---------------------------------------------------------------------------
#
# When whisper transcription largely fails on a stutter-heavy kids song, the
# aligner (analyze.py) falls back to EVENLY DISTRIBUTING the lyric words across
# the active song and flags every guessed word ``approx: true``. A long RUN of
# consecutive approx words is a multi-second smear: its karaoke subtitle timings
# have drifted seconds off the actual singing, and its words false-anchor images
# at the wrong moments. Same philosophy as analyze._MAX_WORD_SPAN's blob guard
# and the certified-W02 whispered-intro precedent: a blank beat is CORRECT; a
# wrong subtitle (or a wrongly-timed image) is a DEFECT. So a long-enough approx
# run renders SUBTITLE-FREE and hands the matcher no anchor (its span fills with
# cadence fillers, which read as intentional); SHORT approx runs keep the current
# RMS-gated behaviour (a 26%-approx song was certified flawless).
#
# A run trips suppression when it holds >= _APPROX_RUN_MIN_WORDS consecutive
# approx words OR spans >= _APPROX_RUN_MIN_SEC seconds (either is enough).
_APPROX_RUN_MIN_WORDS = 5
_APPROX_RUN_MIN_SEC = 6.0
# A song built mostly from guesses is triaged for a human: append a warning to
# the shot report's ``quality_flags`` when the approx share exceeds this percent.
_APPROX_QUALITY_FLAG_PCT = 60.0


def compute_approx_suppression(words):
    """Find maximal runs of consecutive ``approx`` words long enough to suppress.

    Returns ``(suppressed_idx, spans)``:
      - ``suppressed_idx`` : set of indices INTO ``words`` that fall inside a
        suppressed run — used both to drop those words from subtitles AND to
        forbid anchoring an image on them.
      - ``spans``          : ordered ``[[start, end], ...]`` seconds each
        suppressed run covers (for the shot report's self-flagging).

    A run trips when it holds >= ``_APPROX_RUN_MIN_WORDS`` consecutive approx
    words OR spans >= ``_APPROX_RUN_MIN_SEC`` seconds. Shorter runs are left
    untouched (RMS-gated distribution reads fine there). A timeline with no
    approx words yields ``(set(), [])`` — fully backward-compatible."""
    suppressed = set()
    spans = []
    words = words or []
    n = len(words)
    i = 0
    while i < n:
        if not words[i].get("approx"):
            i += 1
            continue
        j = i
        while j < n and words[j].get("approx"):
            j += 1
        first = words[i]
        last = words[j - 1]
        start = float(first.get("start", 0.0) or 0.0)
        end = float(last.get("end", last.get("start", start)) or start)
        length = j - i
        if length >= _APPROX_RUN_MIN_WORDS or (end - start) >= _APPROX_RUN_MIN_SEC:
            suppressed.update(range(i, j))
            spans.append([round(start, 3), round(end, 3)])
        i = j
    return suppressed, spans


def subtitle_words(words):
    """Words to burn as subtitles: the timeline minus any suppressed approx run.

    A long even-distributed (approx) run is a multi-second smear whose karaoke
    timing has drifted off the singing, so per the blob-guard philosophy those
    words render SUBTITLE-FREE (a blank beat beats a wrong subtitle). Short
    approx runs are kept verbatim. Backward-compatible: a timeline with no approx
    words is returned unchanged (a shallow copy)."""
    suppressed, _spans = compute_approx_suppression(words or [])
    if not suppressed:
        return list(words or [])
    return [w for i, w in enumerate(words or []) if i not in suppressed]


def _log(msg):
    """Emit an audit line to stderr (mirrors engine_slideshow's prefix style)."""
    print("[shotlist] %s" % msg, file=sys.stderr, flush=True)


# ---------------------------------------------------------------------------
# Beat-grid primitives (shared with engine_slideshow's cycle path)
# ---------------------------------------------------------------------------

def snap_to_onset(t, onsets, snap_ms=120):
    """Snap cut time ``t`` to the nearest strong onset within ±snap_ms; else t.

    (Moved verbatim from engine_slideshow so both the cycle and lyric paths use
    the same beat/onset snapping — cuts must stay musical.)"""
    if not onsets:
        return t
    tol = snap_ms / 1000.0
    best, best_d = t, tol + 1.0
    for o in onsets:
        d = abs(o - t)
        if d < best_d:
            best_d, best = d, o
        elif o > t and d > best_d:
            break  # onsets sorted; we've passed the minimum
    return best if best_d <= tol else t


def build_cut_grid(downbeats, duration, onsets=None, cut_every=2, snap_ms=120):
    """Return the ordered, de-duplicated list of beat-snapped candidate cut
    points in ``(0, duration)``.

    This is the musical grid EVERY cut (anchor start or filler) must land on:
    every ``cut_every``-th downbeat, each snapped to the nearest strong onset.
    No ``min_seg_dur`` merging here — that is a per-path cosmetic concern applied
    when the grid is turned into shots.
    """
    onsets = onsets or []
    cut_every = max(1, int(cut_every))
    grid = []
    last = None
    for d in downbeats[::cut_every]:
        snapped = round(snap_to_onset(d, onsets, snap_ms), 3)
        if 0.0 < snapped < duration and (last is None or snapped > last):
            grid.append(snapped)
            last = snapped
    return grid


def build_segments(downbeats, duration, onsets=None, cut_every=2,
                   min_seg_dur=1.8, snap_ms=120):
    """Turn downbeats into shot boundaries cut ON the beat (the CYCLE path).

    ``cut_every`` selects every Nth downbeat as a cut point (1/2/4 bars). Each
    cut is snapped to the nearest strong onset within ±``snap_ms``. Downbeats
    closer together than ``min_seg_dur`` are merged so shots stay watchable.
    Returns ``(segments, cut_times)`` — ``segments`` are (start,end) pairs
    covering [0,duration], ``cut_times`` the interior boundaries used (for the
    beat-alignment audit).

    Behaviour is UNCHANGED from the original in engine_slideshow — the lyric
    path branches away before this is reached, so the cycle fallback stays
    bit-identical.
    """
    cut_every = max(1, int(cut_every))
    grid = build_cut_grid(downbeats, duration, onsets=onsets,
                          cut_every=cut_every, snap_ms=snap_ms)

    bounds = [0.0]
    cut_times = []
    for snapped in grid:
        if (snapped - bounds[-1]) >= min_seg_dur:
            bounds.append(snapped)
            cut_times.append(snapped)
    if duration - bounds[-1] < min_seg_dur and len(bounds) > 1:
        bounds[-1] = round(duration, 3)
        if cut_times:
            cut_times.pop()  # the last interior cut was absorbed into the tail
    else:
        bounds.append(round(duration, 3))
    bounds[-1] = round(duration, 3)
    segs = [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1)]
    segs = [s for s in segs if s[1] - s[0] > 0.05]
    return segs, cut_times


# ---------------------------------------------------------------------------
# Keyword index from filenames
# ---------------------------------------------------------------------------

def normalize_token(word):
    """Lowercase, strip every non-alphanumeric char. 'PO-TA-TO!' -> 'potato'."""
    return re.sub(r"[^a-z0-9]", "", word.lower())


def _plural_variants(key):
    """Return the set of keys a token should match, folding naive plurals.

    A lyric word 'cups' should hit the 'cup' image; 'boxes' should hit 'box'.
    We generate both directions so matching is symmetric regardless of whether
    the singular or plural is on the filename vs in the lyric."""
    if not key:
        return set()
    v = {key}
    if key.endswith("es") and len(key) > 3:
        v.add(key[:-2])
    if key.endswith("s") and len(key) > 2:
        v.add(key[:-1])
    v.add(key + "s")
    if key.endswith(("s", "x", "z", "ch", "sh")):
        v.add(key + "es")
    # Never let plural folding manufacture a stopword variant (e.g. 'a' -> 'as')
    # — that would resurrect exactly the tokens CRIT-1's filter exists to drop.
    return {x for x in v if x not in _STOPWORDS}


def filename_tokens(path):
    """Extract the keyword tokens from an image filename.

    Strips a leading numeric prefix + separators + the extension, then splits on
    non-alphanumeric separators. "04-cup.png" -> ['cup']; "14-ambulance.png" ->
    ['ambulance']; "a_red_apple.png" -> ['red', 'apple'] ('a' dropped as a
    stopword); "cat-in-cap.png" -> ['cat', 'in', 'cap'] ('in' is a taught
    preposition, kept — FIX 2). Pure numeric tokens (a bare "04"), tokens shorter
    than ``_MIN_TOKEN_LEN`` (2) chars, and stopwords are dropped so ubiquitous
    words like "a"/"the" can't hijack the shot list (CRIT-1).
    """
    base = os.path.splitext(os.path.basename(path))[0]
    # Drop a leading ordering prefix like "04-" / "04_" / "04 ".
    base = re.sub(r"^\s*\d+\s*[-_. ]+", "", base)
    toks = []
    for raw in re.split(r"[^A-Za-z0-9]+", base):
        key = normalize_token(raw)
        if (key and not key.isdigit() and len(key) >= _MIN_TOKEN_LEN
                and key not in _STOPWORDS):
            toks.append(key)
    return toks


def build_image_tokens(images):
    """Ordered token list per image (parallel to ``images``).

    ``mat-on-cat.png`` -> ['mat','cat']; ``cat-on-mat.png`` -> ['cat','mat'];
    ``sheep-sees-bee.png`` -> ['sheep','sees','bee']. Order is PRESERVED (it is
    what disambiguates the flip gag) and stopwords are already stripped by
    ``filename_tokens``."""
    return [filename_tokens(p) for p in images]


def build_coverage_set(image_tokens):
    """Set of every keyword variant any image can illustrate (coverage only).

    Used to answer "is this sung word covered by SOME image?" without deciding
    which one — the Shot Planner's missing-word gap list."""
    covered = set()
    for toks in image_tokens:
        for tok in toks:
            covered |= _plural_variants(tok)
    return covered


# ---------------------------------------------------------------------------
# Occurrence-based matcher (order-aware; no permanent token ownership)
# ---------------------------------------------------------------------------
#
# Scoring (numeric, best wins):
#   score = matched_tokens*W_MATCH - unmatched_file_tokens*W_LEFTOVER - recency
# W_MATCH dominates so a longer phrase ALWAYS beats a shorter one (full
# [mat,cat] > bare [cat]); the small leftover penalty makes ``cat.png`` [cat]
# beat ``cat-coloring.png`` [cat,coloring] on a bare "cat"; recency is a tiny
# term that only ever flips genuine near-ties, so repeated hooks rotate between
# equal candidates (cat-on-mat <-> cat-on-mat-silly) instead of always picking
# the same file. recency can never overturn a real +1-token match (W_MATCH is
# two orders of magnitude larger than the max recency penalty).
W_MATCH = 100.0        # per matched token (longest phrase wins)
W_LEFTOVER = 2.0       # penalty per file token NOT matched in the window
REC_STEP = 2.5         # recency penalty step
REC_SPAN = 3           # anchors over which the recency penalty decays to 0

# Forward window over the SUNG words that a filename phrase may span.
WINDOW_WORDS = 8       # at most this many content words ahead
WINDOW_SEC = 4.0       # ... or this many seconds, whichever comes first
LINE_GAP = 0.9         # a silent gap longer than this ends the lyric line

# FIX 6 (cross-line phrase steal): two CONSECUTIVE matched tokens of one image
# phrase must not be farther apart in time than this. A scene phrase like
# ``cat-in-cap`` = "the cat sat in a cap" is sung inside ONE line, so its matched
# tokens (cat … in … cap) are seconds apart at most. On a smeared timeline an
# early hook 'cat' could otherwise reach ~3.6s forward and greedily pair with the
# NEXT verse's 'in', stealing it (so ``cat-in-tin`` then loses its own 'in' and
# never anchors). Capping the per-hop gap makes each verse's scene image anchor
# from its OWN verse. Set above a musical line's internal span, below a
# cross-verse reach. (WINDOW_SEC still bounds the window; this bounds the hop.)
#
# WARN-1: the hop measure is the summed inter-word SILENCE between the two
# matched tokens (``_silence_gap``), NOT raw wall-clock. A genuine held note
# (melisma) sung continuously between two matched words fills that span with
# audio, so it contributes ~0 silence and the phrase stays together; a real
# cross-verse reach is separated by actual silence (line gaps / dropped-word
# holes) and still trips the cap. This is what keeps ``cat-in-cap`` alive across
# a 3.5s held "sat" (which _MAX_WORD_SPAN=4.5 now lets survive as a real word)
# while ``cat-in-tin`` vs the next verse's ``in`` still splits correctly.
MATCH_TOKEN_GAP = 2.5

# NOTE (Jul-15 hold rewrite): the FIX-4 tail-fill constant TAIL_HOLD_MAX was
# removed. Under the new hold rule (below) an image is only ever on screen
# around its own sung word, so the last anchored image is ALWAYS held to the
# video end — the tail is never a filler and needs no length threshold.


def _tok_match(lyric_key, file_tok):
    """True if a sung word key matches a filename token (naive plural folding,
    both directions)."""
    if lyric_key == file_tok:
        return True
    return (lyric_key in _plural_variants(file_tok)
            or file_tok in _plural_variants(lyric_key))


def _content_words(words):
    """Ordered list of ``(key, word_dict, orig_index)`` for content lyric words
    (>=``_MIN_TOKEN_LEN`` chars, non-stopword, non-numeric) — the words an image
    can illustrate. Ubiquitous words like 'the'/'a'/'is' are dropped here so they
    can never anchor a shot, exactly as the filename tokenizer drops them; the
    taught prepositions 'in'/'on'/'up'/'at' are KEPT (FIX 2) so ``cat-in-cap``
    can match the sung 'in'."""
    out = []
    for i, w in enumerate(words):
        key = normalize_token(w.get("word", ""))
        if (key and not key.isdigit() and len(key) >= _MIN_TOKEN_LEN
                and key not in _STOPWORDS):
            out.append((key, w, i))
    return out


def _window_indices(cw, j, consumed=None):
    """Indices ``[j..k]`` of ``cw`` forming the forward match window from j.

    Stops at WINDOW_WORDS content words, WINDOW_SEC seconds, or a LINE_GAP
    silence between consecutive sung words (a lyric-line boundary) — so a
    filename phrase is only matched WITHIN one sung line.

    ``consumed`` (a set of content-word indices already claimed by an earlier
    phrase) is excluded from the returned window so a matched word can never be
    reused as a subsequence member of a later phrase (no double-anchoring). The
    span/line-gap arithmetic still uses the RAW consecutive words (consumed ones
    included) so the window boundary is unaffected by what was matched — only
    which words are eligible changes. ``j`` (win[0]) is assumed non-consumed."""
    consumed = consumed or frozenset()
    idxs = [j]
    j_start = float(cw[j][1].get("start", 0.0) or 0.0)
    last = min(len(cw), j + WINDOW_WORDS)
    for k in range(j + 1, last):
        wk = cw[k][1]
        wk_start = float(wk.get("start", 0.0) or 0.0)
        if wk_start - j_start > WINDOW_SEC:
            break
        prev = cw[k - 1][1]
        prev_end = float(prev.get("end", prev.get("start", 0.0)) or 0.0)
        if wk_start - prev_end > LINE_GAP:
            break
        if k in consumed:
            continue  # already claimed — cannot re-anchor / re-match it
        idxs.append(k)
    return idxs


def _silence_gap(cw, a, b):
    """Summed inter-word SILENCE (seconds) between content-word indices ``a`` < ``b``.

    Walks every consecutive content-word pair in ``cw[a..b]`` and adds only the
    POSITIVE gap ``next.start - prev.end`` (audio-free silence) between them —
    each word's own DURATION is excluded. So a single note held continuously
    from ``a`` to ``b`` (a melisma) contributes ~0, while a genuine cross-verse
    reach (real silence, or a dropped-word hole that reads as a long inter-word
    gap) accumulates. This is the WARN-1 hop measure: it decouples "how far
    apart in the lyric" from "how long a word was drawn out". Overlapping or
    negative gaps clamp to 0. ``a >= b`` yields 0.0."""
    total = 0.0
    for m in range(a + 1, b + 1):
        prev = cw[m - 1][1]
        cur = cw[m][1]
        prev_end = float(prev.get("end", prev.get("start", 0.0)) or 0.0)
        cur_start = float(cur.get("start", 0.0) or 0.0)
        g = cur_start - prev_end
        if g > 0.0:
            total += g
    return total


def _match_image(tokens, cw, win):
    """Match an image's ordered tokens against the window as a subsequence.

    The image's FIRST token must match the window's FIRST content word (``win[0]``
    — the position we are anchoring at); the remaining tokens must then appear IN
    ORDER among the later window words. Returns the list of matched content
    indices (length >= 1) or ``None`` if the image does not start here."""
    if not tokens:
        return None
    if not _tok_match(cw[win[0]][0], tokens[0]):
        return None
    matched = [win[0]]
    ti = 1
    wi = 1
    while ti < len(tokens) and wi < len(win):
        ci = win[wi]
        if _tok_match(cw[ci][0], tokens[ti]):
            # FIX 6 / WARN-1: reject a hop to a token too far in time from the
            # previously matched one — that is a cross-line steal, not the same
            # sung phrase. The distance is the summed inter-word SILENCE between
            # the two matched tokens (``_silence_gap``), NOT raw wall-clock, so a
            # long HELD note (melisma) sung continuously in between fills its span
            # with audio and does not count as reach — only genuine silence /
            # dropped-word holes do. Words are time-ordered, so once the silence
            # sum exceeds the cap every later hop only grows: stop extending (the
            # phrase truncates to what it has matched so far, which then scores
            # lower and yields to the closer, in-verse candidate).
            if _silence_gap(cw, matched[-1], ci) > MATCH_TOKEN_GAP:
                break
            matched.append(ci)
            ti += 1
        wi += 1
    return matched


def _recency_penalty(img_idx, last_used, anchor_ord):
    """Small penalty for an image used in the last ``REC_SPAN`` anchors, decaying
    to 0. Only ever flips genuine near-ties (rotating repeated hooks)."""
    if img_idx not in last_used:
        return 0.0
    gap = anchor_ord - last_used[img_idx]  # >=1 (used at an earlier anchor)
    return REC_STEP * max(0.0, (REC_SPAN + 1 - gap))


def find_matches(words, images, image_tokens=None, suppressed_idx=None):
    """Order-aware, per-occurrence image matcher (replaces the token-index).

    Walks the ground-truth lyric CONTENT words left to right. At each position it
    considers every image whose first token matches the sung word there, matches
    the rest of the image's tokens as an ordered subsequence within a forward
    window, scores the candidates (longest phrase wins; small leftover + recency
    tiebreaks), and anchors the winner. Consumed phrase words are skipped so
    "the cat is on the mat" yields ONE cat-on-mat shot (not cat + mat), and "the
    mat is on the cat" yields mat-on-cat — the flip is disambiguated by token
    ORDER, not by whichever filename sorts first.

    Returns an ordered list of cluster dicts, shape-compatible with the old
    token-index matcher's output plus two additive fields::

        {image, start, end, trigger_word, trigger_time, approx,
         trigger_phrase, match_score}

    Consecutive positions that resolve to the SAME image extend one cluster
    (no re-anchor), mirroring the old collapse rule.

    CRIT fix: only the WINNING phrase's matched indices are consumed — NOT the
    whole [first..last] span. Content words that fell between two matched tokens
    but were not themselves part of the winning phrase stay eligible and can
    anchor a different image. Repro: images [cat-mat, bird] over "the cat and
    bird sit on the mat" -> cat-mat consumes {cat, mat}; the un-consumed "bird"
    in the middle still anchors bird.png. A ``consumed`` set (content-word
    indices) is threaded through the window builder so a matched word can never
    double-anchor.

    ``suppressed_idx`` (indices INTO ``words`` — see ``compute_approx_suppression``)
    are words inside a long even-distributed (approx) run whose timing is a
    multi-second smear. An image must NEVER anchor on such a word: its trigger
    time is a guess, so it would fire the image at the wrong moment. When the
    content word at a position is suppressed it is skipped as an anchor point
    (its span is left for cadence fillers, which read as intentional). Default
    ``None`` -> no suppression, fully backward-compatible.
    """
    if image_tokens is None:
        image_tokens = build_image_tokens(images)
    suppressed_idx = suppressed_idx or frozenset()
    cw = _content_words(words)
    if not cw or not image_tokens:
        return []

    clusters = []
    cur = None
    last_used = {}     # img_idx -> anchor ordinal it last anchored at
    anchor_ord = 0     # ordinal the NEXT new anchor will receive
    consumed = set()   # content-word indices already claimed by a phrase
    j = 0
    n = len(cw)
    while j < n:
        if j in consumed:
            # Already claimed by an earlier phrase — never re-anchor it.
            j += 1
            continue
        if cw[j][2] in suppressed_idx:
            # This content word lives inside a suppressed approx run (a smeared
            # guess) — never anchor an image on it. Its span is filled by cadence
            # fillers downstream, exactly like an intro/instrumental gap.
            j += 1
            continue
        win = _window_indices(cw, j, consumed)
        best = None            # (score, -img_idx)
        best_img = None
        best_matched = None
        for img_idx, toks in enumerate(image_tokens):
            matched = _match_image(toks, cw, win)
            if not matched:
                continue
            leftover = len(toks) - len(matched)
            rec = _recency_penalty(img_idx, last_used, anchor_ord)
            score = len(matched) * W_MATCH - leftover * W_LEFTOVER - rec
            key = (score, -img_idx)  # higher score, then lower filename index
            if best is None or key > best:
                best, best_img, best_matched = key, img_idx, matched
        if best_img is None:
            # No image starts here — a non-keyword word never breaks a cluster.
            j += 1
            continue
        first_ci = best_matched[0]
        last_ci = best_matched[-1]
        fw = cw[first_ci][1]
        ew = cw[last_ci][1]
        phrase = " ".join(cw[ci][1].get("word", "") for ci in best_matched)
        if cur is not None and cur["image"] == best_img:
            # Same image still on screen -> extend its hold, do not re-anchor.
            cur["end"] = float(ew.get("end", ew.get("start", cur["end"])))
        else:
            if cur is not None:
                clusters.append(cur)
            cur = {
                "image": best_img,
                "start": float(fw.get("start", 0.0) or 0.0),
                "end": float(ew.get("end", ew.get("start", 0.0)) or 0.0),
                "trigger_word": fw.get("word", ""),
                "trigger_time": float(fw.get("start", 0.0) or 0.0),
                # W1: guessed (even-distributed) trigger times get a wider
                # pre-roll downstream. Flag carried from the trigger word.
                "approx": bool(fw.get("approx")),
                "trigger_phrase": phrase,
                "match_score": len(best_matched),
            }
            last_used[best_img] = anchor_ord
            anchor_ord += 1
        # Consume ONLY the words this phrase actually matched (not the whole
        # span) so un-matched intervening words remain eligible to anchor.
        consumed.update(best_matched)
        # Resume from the smallest position > first_ci not yet consumed. Matched
        # tokens deeper in the span stay skipped (they're in ``consumed``); the
        # bird in "cat ... bird ... mat" is reached here.
        j = first_ci + 1
        while j < n and j in consumed:
            j += 1
    if cur is not None:
        clusters.append(cur)
    return clusters


def _phrase_in_content(tokens, cw):
    """True if the image's full ordered token phrase appears as a subsequence
    anywhere in the content words (used to flag genuinely-missed multi-token
    images for the loud batch warning)."""
    if not tokens:
        return False
    ti = 0
    for (key, _w, _i) in cw:
        if _tok_match(key, tokens[ti]):
            ti += 1
            if ti == len(tokens):
                return True
    return False


# ---------------------------------------------------------------------------
# Grid helpers
# ---------------------------------------------------------------------------

def _cut_before(t, grid, preroll=0.35):
    """Largest grid cut <= ``t``; if it is < ``preroll`` before ``t`` (the image
    would barely be up when the word lands), step to the previous grid cut so the
    image is comfortably established. Returns 0.0 if no grid cut precedes ``t``."""
    prev = 0.0
    prev2 = 0.0
    for g in grid:
        if g <= t:
            prev2 = prev
            prev = g
        else:
            break
    if prev <= 0.0:
        return 0.0
    if (t - prev) < preroll:
        return prev2  # too tight — back off one grid cut (may be 0.0)
    return prev


def _cut_at_or_after(t, grid, duration):
    """Smallest grid cut >= ``t``; ``duration`` if none."""
    for g in grid:
        if g >= t:
            return g
    return round(duration, 3)


# ---------------------------------------------------------------------------
# SCRIPT-SCHEDULE MODE (the stutter-song image scheduler)
# ---------------------------------------------------------------------------
#
# These are self-authored phonics songs whose lyric SHEETS carry section markers
# ([Intro — whispered], [Hook 1 — kids chant], …) and each section features known
# vocab words in known order. Whisper cannot transcribe stutter-chant sections
# (W02 "T-T-Turtle": 80.8% approx, 1/5 images anchored), but the SCRIPT is ground
# truth — we only need section TIMING from the audio, not word recognition.
#
# Script-schedule mode: (1) parse the sheet into sections + each section's owned
# vocab images (in first-appearance order); (2) TIME the sections across the song
# using whisper-CONFIRMED words as calibration pins (proportional fallback where
# there are none); (3) show each section's owned images across its span; sections
# owning no image HOLD a neighbour. It engages automatically only when the normal
# anchor pass is poor (see ``script_should_engage``); a passing song is untouched.
#
# Nothing here modifies the certified anchor matcher (``find_matches`` /
# ``build_shotlist``) or the aliases — it is an additive, parallel scheduler.


def destutter(raw):
    """Strip a leading single-letter stutter run from a raw lyric token.

    Whisper stutter-chant tokens normalize to nonsense: ``normalize_token`` turns
    'T-t-turtle' into 'ttturtle' (never matches the 'turtle' image), which is the
    root cause of the W02 miss. This strips the leading ``<letter>-<letter>-…``
    run so the real word survives::

        'T-t-turtle!' -> 'turtle!'   't-t-taxi…'  -> 'taxi…'
        'P-p-potato!' -> 'potato!'   'T-t-t!'     -> ''     (pure stutter)
        'turtle'      -> 'turtle'    "It's"       -> "It's" (unchanged)

    A pure stutter with no tail word (e.g. 'T-t-t!') returns '' (no meaning). Used
    ONLY by the script-schedule sheet parser and the curriculum image-selection
    lyric filter — NEVER by the certified anchor matcher / subtitle path."""
    if not raw:
        return raw
    parts = re.split(r"[-\s.]+", raw.strip())
    i = 0
    while i < len(parts):
        k = normalize_token(parts[i])
        if len(k) == 1 and k.isalpha():
            i += 1
        else:
            break
    tail = parts[i:]
    if not tail:
        return ""  # pure stutter, no sung word
    return " ".join(tail)


def parse_lyric_sections(lyrics_text):
    """Parse a lyric sheet into ordered sections + a body-line -> section map.

    Returns ``(sections, line_section)`` where ``sections`` is a list of
    ``{"label": str, "content_keys": [de-stuttered content keys in order]}`` and
    ``line_section`` maps each BODY line index (0-based into ``splitlines``) to
    its section index. A ``[...]`` line opens a section (label = bracket text);
    body lines until the next ``[...]`` are its body. Body-line tokens are
    de-stuttered, normalized, and filtered (drop stopwords / <2 chars / digits)
    to content keys. Text before the first header becomes an implicit leading
    section (label ''). The line map uses the SAME enumeration as
    ``extract_lyric_words`` so timeline words can be traced back to sections."""
    sections = []
    line_section = {}
    cur = -1
    for i, raw in enumerate((lyrics_text or "").splitlines()):
        line = raw.strip()
        if not line:
            continue
        if line.startswith("["):
            sections.append({"label": line.strip("[]").strip(),
                             "content_keys": []})
            cur = len(sections) - 1
            continue
        if cur < 0:
            sections.append({"label": "", "content_keys": []})
            cur = len(sections) - 1
        line_section[i] = cur
        for tok in line.split():
            key = normalize_token(destutter(tok))
            if (key and not key.isdigit() and len(key) >= _MIN_TOKEN_LEN
                    and key not in _STOPWORDS):
                sections[cur]["content_keys"].append(key)
    return sections, line_section


def _match_subseq_tokens(image_toks, keys, start, consumed):
    """Match ``image_toks`` against ``keys`` as an ordered subsequence anchored at
    ``keys[start]`` (whole-section window, no timing). ``image_toks[0]`` must
    equal ``keys[start]``; remaining tokens appear in order among later,
    un-consumed keys. Returns matched key indices (len >= 1) or None."""
    if not image_toks or not _tok_match(keys[start], image_toks[0]):
        return None
    matched = [start]
    ti, wi, n = 1, start + 1, len(keys)
    while ti < len(image_toks) and wi < n:
        if wi not in consumed and _tok_match(keys[wi], image_toks[ti]):
            matched.append(wi)
            ti += 1
        wi += 1
    return matched


def _owned_images_in_section(content_keys, image_tokens):
    """Ordered list of ``(image_index, first_key)`` a section owns.

    Greedy longest-phrase subsequence walk over the section's content keys (the
    SAME first-token + subsequence + longest-phrase-wins logic the anchor matcher
    uses, minus timing): at each un-consumed position pick the highest-scoring
    image whose first token matches, consume its matched keys, record it in
    first-appearance order. An image is owned at most ONCE per section (a hook
    that sings 'turtle' twice yields one turtle shot)."""
    owned = []
    owned_set = set()
    consumed = set()
    j, n = 0, len(content_keys)
    while j < n:
        if j in consumed:
            j += 1
            continue
        best = None
        best_img = None
        best_matched = None
        for img_idx, toks in enumerate(image_tokens):
            if not toks:
                continue
            matched = _match_subseq_tokens(toks, content_keys, j, consumed)
            if not matched:
                continue
            leftover = len(toks) - len(matched)
            score = len(matched) * W_MATCH - leftover * W_LEFTOVER
            key = (score, -img_idx)
            if best is None or key > best:
                best, best_img, best_matched = key, img_idx, matched
        if best_img is None:
            j += 1
            continue
        consumed.update(best_matched)
        if best_img not in owned_set:
            owned.append((best_img, content_keys[best_matched[0]]))
            owned_set.add(best_img)
        j = best_matched[0] + 1
        while j < n and j in consumed:
            j += 1
    return owned


def _pins_by_section(words, lyrics_text, line_section, n_sections):
    """Per-section calibration pins = confirmed (non-approx) word start times.

    The timeline words ARE the sheet's lyric tokens in order (the aligner keeps
    them 1:1, only ever DROPPING a blanked span), so a deterministic in-order
    two-pointer walk maps each timeline word to its sheet token — and thence its
    section — far more robustly than a global NW alignment, which on these highly
    repetitive stutter lyrics ('t… t… t…', four 'What begins with T?' hooks) has
    many equal-score alignments and can misfile an early confirmed word into a
    late section. Each timeline word consumes the NEXT sheet token with a matching
    key. Only NON-approx (whisper-confirmed) words become pins — approx words are
    even-distributed guesses whose timing is a smear.

    NB: whisper can still MIS-time a confirmed word on a stutter song (it heard a
    't' at 4.2s and the DP aligned it to a late 'T!'), so a section's pins may
    hold an out-of-place outlier. ``_script_section_bounds`` therefore anchors on
    the MEDIAN pin per section (outlier-resistant), not the min/max. Returns a
    list (length ``n_sections``) of sorted pin-time lists."""
    pins = [[] for _ in range(n_sections)]
    sheet = extract_lyric_words(lyrics_text or "")
    if not sheet or not words:
        return pins
    sheet_keys = [t["key"] for t in sheet]
    sheet_sec = [line_section.get(t["line"], 0) for t in sheet]
    si, n = 0, len(sheet)
    for w in words:
        key = normalize_token(w.get("word", ""))
        if not key:
            continue
        j = si
        while j < n and sheet_keys[j] != key:
            j += 1
        if j >= n:
            continue  # no positional match ahead (shouldn't happen) -> skip
        si = j + 1
        if w.get("approx"):
            continue
        sec = sheet_sec[j]
        if 0 <= sec < n_sections:
            pins[sec].append(float(w.get("start", 0.0) or 0.0))
    for p in pins:
        p.sort()
    return pins


def _filter_pin_outliers(pins):
    """Drop within-section outlier pins (whisper mis-timings) via a MAD test.

    A stutter song makes whisper mis-align the odd confirmed word (a 't' heard at
    4.2s aligned to a late 'T!'), so a section's pin list can hold a gross
    outlier. With >= 3 pins we keep only those within ``max(3*MAD, 2s)`` of the
    median (the 2 s floor stops a tight, legitimate cluster being over-pruned).
    With < 3 pins there is nothing to test against, so they are returned as-is."""
    if len(pins) < 3:
        return list(pins)
    m = statistics.median(pins)
    mad = statistics.median(sorted(abs(p - m) for p in pins))
    tol = max(3.0 * mad, 2.0)
    kept = [p for p in pins if abs(p - m) <= tol]
    return kept or [m]


def _script_section_bounds(pins_by_section, weights, duration):
    """Time the sections: return boundaries ``b[0..S]`` with ``b[0]=0`` and
    ``b[S]=duration`` (section i spans ``[b[i], b[i+1]]``).

    Priority (per the brief): (a) CALIBRATION PINS — outlier-filtered per section
    (``_filter_pin_outliers``); an interior boundary between two pinned sections
    is the midpoint of the earlier's last pin and the later's first pin (so both
    cover their pins); (b) unpinned boundaries interpolate PROPORTIONALLY to each
    section's weight (content-token count — the active-audio-length fallback)
    between the nearest known boundaries; then a one-sided clamp guarantees every
    pinned section still covers its own (filtered) pins; finally boundaries are
    made monotonic and clamped to ``[0, duration]``."""
    S = len(weights)
    dur = float(duration)
    if S == 0:
        return [0.0, dur]
    fp = [_filter_pin_outliers(p) for p in pins_by_section]
    b = [None] * (S + 1)
    b[0], b[S] = 0.0, dur
    # (a) midpoint rule where BOTH neighbours have pins.
    for k in range(1, S):
        left = max(fp[k - 1]) if fp[k - 1] else None
        right = min(fp[k]) if fp[k] else None
        if left is not None and right is not None:
            b[k] = 0.5 * (left + right)
    # (b) proportional fill of the remaining None boundaries by weight.
    cw = [0.0]
    for w in weights:
        cw.append(cw[-1] + max(1e-6, float(w)))
    k = 1
    while k < S:
        if b[k] is not None:
            k += 1
            continue
        j = k
        while j < S and b[j] is None:
            j += 1  # b[j] is known (interior) or b[S] (=dur)
        lo, hi = k - 1, j
        t_lo, t_hi = b[lo], b[hi]
        span_w = cw[hi] - cw[lo]
        for kk in range(k, j):
            frac = ((cw[kk] - cw[lo]) / span_w if span_w > 0
                    else (kk - lo) / float(hi - lo))
            b[kk] = t_lo + (t_hi - t_lo) * frac
        k = j
    # one-sided pin clamp: each pinned section must still cover its filtered pins.
    for i in range(S):
        p = fp[i]
        if not p:
            continue
        if b[i] > min(p):
            b[i] = min(p)
        if b[i + 1] < max(p):
            b[i + 1] = max(p)
    # monotonic + clamp to [0, duration]; endpoints fixed.
    for k in range(1, S + 1):
        if b[k] < b[k - 1]:
            b[k] = b[k - 1]
        if b[k] > dur:
            b[k] = dur
    b[0], b[S] = 0.0, dur
    return b


def _snap_increasing(times, onsets, snap_ms=120):
    """GENTLY snap each INTERIOR time to the nearest strong onset within
    ±``snap_ms`` (via ``snap_to_onset``), keeping the sequence strictly
    increasing; endpoints (times[0], times[-1]) are fixed.

    Uses the onset snap (not the coarse ``cut_every`` bar grid) so a section
    boundary lands ON a musical onset without being yanked seconds away to the
    next bar line — the shots stay where the pins/weights placed them. A snap that
    would collapse into the previous boundary falls back to the raw time."""
    if len(times) <= 2 or not onsets:
        return list(times)
    out = [times[0]]
    for k in range(1, len(times) - 1):
        snapped = snap_to_onset(times[k], onsets, snap_ms)
        if snapped <= out[-1] + 0.02:
            snapped = times[k]
        if snapped <= out[-1] + 0.02:
            snapped = out[-1] + 0.02
        out.append(snapped)
    out.append(times[-1])
    for k in range(1, len(out)):
        if out[k] <= out[k - 1]:
            out[k] = out[k - 1] + 0.02
    out[-1] = times[-1]
    return out


def script_should_engage(anchored_image_count, image_pool_size, words):
    """Decide whether to REPLACE the anchor plan with the script schedule.

    Engages when the normal anchor pass covered too few images
    (``anchored/pool < 0.5``) OR whisper largely failed (``approx_pct > 60``) —
    exactly the stutter-song signature. Returns ``(engage_bool, debug_dict)``.
    A song that passes the normal bar returns False (its certified plan stands)."""
    total = len(words or [])
    approx = sum(1 for w in (words or []) if w.get("approx"))
    approx_pct = (100.0 * approx / total) if total else 0.0
    ratio = (float(anchored_image_count) / image_pool_size
             if image_pool_size else 0.0)
    engage = (ratio < 0.5) or (approx_pct > 60.0)
    return engage, {"anchored": anchored_image_count,
                    "pool": image_pool_size,
                    "anchored_ratio": round(ratio, 3),
                    "approx_pct": round(approx_pct, 1)}


# ---------------------------------------------------------------------------
# ENERGY-PROFILE SECTION ALIGNMENT (Jul-15 pt3 — replaces v1 proportional timing)
# ---------------------------------------------------------------------------
#
# v1 timed the lyric-sheet sections by splitting the song PROPORTIONALLY to each
# section's content-token count between the sparse confirmed-word pins. Tredoux
# rejected it on W02 T-T-Turtle: the image ORDER was right but the section TIMING
# was guessed, so images drifted off the real verses/hooks. The fix: the lyric
# sheet's bracket text ENCODES ENERGY — a whispered verse/breakdown is LOW RMS, a
# kids-chant hook / big final is HIGH RMS. We type each section quiet/loud from
# its bracket, then DP-align the typed section sequence to the audio's own energy
# profile (the fine RMS envelope + its novelty/change points), with the
# confirmed-word pins as HARD constraints. Where the audio energy is decisive
# (clear quiet valley / loud peak) the alignment snaps sections onto it; where it
# is flat (consecutive same-typed hooks) a proportional prior + novelty-point
# snapping place the boundaries. Individual images inside a section are then timed
# from their OWN confirmed-word pins (not an equal split), and a MINIMUM-HOLD rule
# drops trailing overflow so no image ever flashes.

# Bracket-text -> energy type. A section is LOW when its label carries a quiet
# marker (and no loud one), HIGH when it carries a loud marker (and no quiet one),
# else NEUTRAL (unknown — the DP is indifferent, the gate exempts it).
_SECTION_LOW_WORDS = frozenset({
    "whisper", "whispered", "rap", "verse", "breakdown", "bridge", "spoken",
    "soft", "softly", "quiet", "quietly", "intro", "outro", "hush", "hushed",
    "calm", "gentle", "mellow", "low"})
_SECTION_HIGH_WORDS = frozenset({
    "chant", "chanted", "hook", "chorus", "big", "loud", "loudly", "drop",
    "belt", "belted", "shout", "shouted", "anthem", "climax", "final", "full",
    "high", "power", "powerful", "explode", "explosive"})

# Gate thresholds (written into the shot report; iterated on W02/W06-sound).
_GATE_ENERGY_OVERLAP_PCT = 60.0   # decisive section must match its type >= this
_GATE_BOUNDARY_TOL_SEC = 1.0      # non-pin boundary within this of a novelty pt
_GATE_MATCH_HYST = 0.85           # RMS >= hyst*median counts as loud-match;
                                  # RMS <= (2-hyst)*median counts as quiet-match
_ENERGY_PRIOR_W = 0.06            # proportional-prior penalty per second of drift
_SCRIPT_MIN_HOLD_BEATS = 2        # no script shot shorter than this many beats
_IMAGE_PIN_PREROLL = 0.25         # start a pinned image slightly before its word

# Set by ``build_script_schedule`` each call (reset to None), read by
# ``build_shot_report`` so the per-section numeric gates land in the shot report
# without threading a 5th return value through the certified caller/tests. Renders
# spawn a fresh subprocess so this module global is per-render (no cross-talk).
_LAST_SCRIPT_GATES = None


def _type_section(label):
    """'low' / 'high' / 'neutral' from a section's bracket label text."""
    toks = set(re.split(r"[^a-z]+", (label or "").lower()))
    lo = bool(toks & _SECTION_LOW_WORDS)
    hi = bool(toks & _SECTION_HIGH_WORDS)
    if lo and not hi:
        return "low"
    if hi and not lo:
        return "high"
    return "neutral"  # both markers (ambiguous) or none -> DP-indifferent


def _env_series(rms_env):
    """(hop_sec, values[]) from a timeline ``rms_envelope`` (safe fallback)."""
    if not rms_env:
        return 0.1, []
    hop = float(rms_env.get("hop_sec", 0.1) or 0.1)
    return hop, list(rms_env.get("values") or [])


def _env_median(values):
    if not values:
        return 0.0
    return float(statistics.median(values))


def _env_at(hop, values, t):
    if not values:
        return 0.0
    i = int(t / hop) if hop > 0 else 0
    return values[min(max(i, 0), len(values) - 1)]


def _match_seconds(a, b, hop, values, median, typ):
    """Seconds in [a,b] whose envelope value MATCHES ``typ`` (with hysteresis).

    high: value >= hyst*median ; low: value <= (2-hyst)*median ; neutral: 0.
    Integrated over the envelope's bin grid."""
    if b <= a or not values or typ == "neutral":
        return 0.0
    hi_th = _GATE_MATCH_HYST * median
    lo_th = (2.0 - _GATE_MATCH_HYST) * median
    match = 0.0
    i0 = int(a / hop)
    i1 = int(b / hop)
    for i in range(max(0, i0), min(len(values) - 1, i1) + 1):
        blo, bhi = i * hop, (i + 1) * hop
        lo, hi = max(a, blo), min(b, bhi)
        if hi <= lo:
            continue
        v = values[i]
        ok = (v >= hi_th) if typ == "high" else (v <= lo_th)
        if ok:
            match += hi - lo
    return match


def _match_fraction(a, b, hop, values, median, typ):
    dur = b - a
    if dur <= 1e-6 or typ == "neutral":
        return 0.0
    return _match_seconds(a, b, hop, values, median, typ) / dur


def _mean_env(a, b, hop, values):
    """Mean envelope value over [a,b]."""
    if b <= a or not values:
        return 0.0
    i0 = int(a / hop)
    i1 = int(b / hop)
    lo, hi = max(0, i0), min(len(values) - 1, i1)
    if hi < lo:
        return values[min(max(i0, 0), len(values) - 1)]
    seg = values[lo:hi + 1]
    return float(sum(seg) / len(seg))


def _novelty_points(sections, hop, values, dur):
    """Structural energy-change points used BOTH as DP boundary candidates and as
    the gate's 'novelty / RMS-change point' reference.

    Union of: (a) the coarse RMS ``sections`` boundaries (level changes); (b) deep
    envelope valleys (local minima below the median — natural phrase breaks); and
    (c) large-delta rise/drop points (where a ~1s-lookahead energy change exceeds
    half the dynamic range). All strictly inside (0, dur), de-duplicated, sorted."""
    pts = set()
    for s in sections or []:
        for key in ("start", "end"):
            t = round(float(s.get(key, 0.0) or 0.0), 3)
            if 0.05 < t < dur - 0.05:
                pts.add(t)
    if values:
        median = _env_median(values)
        vmax = max(values)
        vmin = min(values)
        span = (vmax - vmin) or 1.0
        n = len(values)
        look = max(1, int(round(1.0 / hop)))  # ~1s lookahead
        for i in range(1, n - 1):
            t = round(i * hop + hop / 2.0, 3)
            if not (0.05 < t < dur - 0.05):
                continue
            # deep valley
            if (values[i] <= values[i - 1] and values[i] < values[i + 1]
                    and values[i] < median):
                pts.add(t)
            # big rise/drop over ~1s
            j = min(n - 1, i + look)
            if abs(values[j] - values[i]) > 0.5 * span:
                pts.add(t)
    return sorted(pts)


def _loud_regions(sections, hop, values, dur):
    """The 'top-half-RMS regions': merged intervals where the envelope exceeds the
    median. Reported in the gate so the overlap numbers are auditable."""
    if not values:
        return []
    median = _env_median(values)
    regions = []
    cur = None
    for i, v in enumerate(values):
        t0, t1 = i * hop, min(dur, (i + 1) * hop)
        if v > median:
            if cur is None:
                cur = [t0, t1]
            else:
                cur[1] = t1
        else:
            if cur is not None:
                regions.append((round(cur[0], 3), round(cur[1], 3)))
                cur = None
    if cur is not None:
        regions.append((round(cur[0], 3), round(min(dur, cur[1]), 3)))
    return regions


def _energy_fill_run(lo, hi, t_lo, t_hi, typed, fp, cw, cands, hop, values,
                     median):
    """DP-place the free section boundaries ``b[lo+1 .. hi-1]`` in (t_lo, t_hi).

    Sections ``lo .. hi-1`` span the run. Each boundary is chosen from the
    structural candidate points ``cands`` to MAXIMISE the sum of per-section
    energy match-fractions (high sections want loud spans, low sections want
    quiet spans, neutral sections are indifferent) minus a small proportional
    prior that pulls each boundary toward its content-weight position (so runs of
    same-typed sections, where energy is flat, still split sensibly). Pin clamps
    are HARD: a pinned section's span must contain its (filtered) pins. Falls back
    to the proportional positions when there are too few candidate points.

    Returns ``{boundary_index: time}`` for the free boundaries only."""
    K = hi - lo - 1
    if K <= 0:
        return {}
    span_w = cw[hi] - cw[lo]
    ideal = {}
    for m in range(lo + 1, hi):
        frac = ((cw[m] - cw[lo]) / span_w) if span_w > 0 else (m - lo) / float(hi - lo)
        ideal[m] = t_lo + (t_hi - t_lo) * frac
    P = [p for p in cands if t_lo + 1e-6 < p < t_hi - 1e-6]
    if len(P) < K:
        return {m: ideal[m] for m in range(lo + 1, hi)}

    def sec_score(m, x, y):
        if y <= x:
            return None
        p = fp[m]
        if p and (x > min(p) + 1e-6 or y < max(p) - 1e-6):
            return None  # pin-clamp infeasible
        return _match_fraction(x, y, hop, values, median, typed[m])

    def prior(m, val):
        return _ENERGY_PRIOR_W * abs(val - ideal[m])

    pos = [t_lo] + P + [t_hi]
    N = len(pos)
    NEG = float("-inf")
    dp = [[(NEG, None) for _ in range(N)] for _ in range(K)]
    # free f=0 -> boundary lo+1 ; section lo spans [pos0, pos[pi]]
    for pi in range(1, N - 1):
        s0 = sec_score(lo, pos[0], pos[pi])
        if s0 is None:
            continue
        dp[0][pi] = (s0 - prior(lo + 1, pos[pi]), 0)
    for f in range(1, K):
        bidx = lo + 1 + f
        sec_left = lo + f
        for pi in range(1, N - 1):
            best = (NEG, None)
            for pj in range(1, pi):
                if dp[f - 1][pj][0] == NEG:
                    continue
                s = sec_score(sec_left, pos[pj], pos[pi])
                if s is None:
                    continue
                cand = dp[f - 1][pj][0] + s - prior(bidx, pos[pi])
                if cand > best[0]:
                    best = (cand, pj)
            dp[f][pi] = best
    # close: last free = hi-1 ; final section hi-1 spans [pos[pi], t_hi]
    best = (NEG, None)
    for pi in range(1, N - 1):
        if dp[K - 1][pi][0] == NEG:
            continue
        s = sec_score(hi - 1, pos[pi], pos[-1])
        if s is None:
            continue
        tot = dp[K - 1][pi][0] + s
        if tot > best[0]:
            best = (tot, pi)
    if best[1] is None:
        return {m: ideal[m] for m in range(lo + 1, hi)}
    result = {}
    pi = best[1]
    for f in range(K - 1, -1, -1):
        result[lo + 1 + f] = pos[pi]
        pi = dp[f][pi][1]
    return result


def _energy_section_bounds(typed, pins_by_section, weights, sections, rms_env,
                           onsets, duration):
    """Time the sections by ENERGY-PROFILE DP alignment.

    Same output contract as ``_script_section_bounds`` (boundaries ``b[0..S]``,
    ``b[0]=0``, ``b[S]=duration``). Confirmed-word pins are hard constraints:
    where BOTH neighbours are pinned the boundary is the pin midpoint (as before);
    otherwise the free boundaries in each unknown run are DP-placed on the audio's
    energy profile. Falls back to proportional (``_script_section_bounds``) when
    no envelope is available."""
    S = len(typed)
    dur = float(duration)
    if S == 0:
        return [0.0, dur]
    hop, values = _env_series(rms_env)
    if not values:
        return _script_section_bounds(pins_by_section, weights, dur)
    median = _env_median(values)
    fp = [_filter_pin_outliers(p) for p in pins_by_section]
    b = [None] * (S + 1)
    b[0], b[S] = 0.0, dur
    # (a) both-neighbour-pinned midpoints (unchanged from v1).
    for k in range(1, S):
        left = max(fp[k - 1]) if fp[k - 1] else None
        right = min(fp[k]) if fp[k] else None
        if left is not None and right is not None:
            b[k] = 0.5 * (left + right)
    # (b) energy-DP fill of each unknown boundary run.
    cw = [0.0]
    for w in weights:
        cw.append(cw[-1] + max(1e-6, float(w)))
    novelty = _novelty_points(sections, hop, values, dur)
    cands = sorted(set([round(x, 3) for x in novelty]
                       + [round(o, 3) for o in (onsets or [])]))
    k = 1
    while k < S:
        if b[k] is not None:
            k += 1
            continue
        j = k
        while j < S and b[j] is None:
            j += 1
        lo, hi = k - 1, j
        placed = _energy_fill_run(lo, hi, b[lo], b[hi], typed, fp, cw, cands,
                                  hop, values, median)
        for idx, val in placed.items():
            b[idx] = val
        k = j
    # one-sided pin clamp (each pinned section still covers its own pins).
    for i in range(S):
        p = fp[i]
        if not p:
            continue
        if b[i] > min(p):
            b[i] = min(p)
        if b[i + 1] < max(p):
            b[i + 1] = max(p)
    # monotonic + clamp to [0, duration]; endpoints fixed.
    for k in range(1, S + 1):
        if b[k] < b[k - 1]:
            b[k] = b[k - 1]
        if b[k] > dur:
            b[k] = dur
    b[0], b[S] = 0.0, dur
    return b


def _confirmed_by_section(words, lyrics_text, line_section, n_sections):
    """Per-section list of ``(key, time)`` for whisper-CONFIRMED (non-approx)
    words — the same in-order two-pointer walk as ``_pins_by_section`` but keeping
    each pin's KEY so individual images can be timed from their own sung word."""
    out = [[] for _ in range(n_sections)]
    sheet = extract_lyric_words(lyrics_text or "")
    if not sheet or not words:
        return out
    sheet_keys = [t["key"] for t in sheet]
    sheet_sec = [line_section.get(t["line"], 0) for t in sheet]
    si, n = 0, len(sheet)
    for w in words:
        key = normalize_token(w.get("word", ""))
        if not key:
            continue
        j = si
        while j < n and sheet_keys[j] != key:
            j += 1
        if j >= n:
            continue
        si = j + 1
        if w.get("approx"):
            continue
        sec = sheet_sec[j]
        if 0 <= sec < n_sections:
            out[sec].append((key, float(w.get("start", 0.0) or 0.0)))
    return out


def _image_pin(owned_key, confirmed_pairs):
    """Median confirmed time of any confirmed word whose key matches the owned
    image's anchor key (naive plural folding), or ``None`` if the image's own
    word was never whisper-confirmed in its section."""
    hits = [t for (k, t) in confirmed_pairs if _tok_match(k, owned_key)]
    if not hits:
        return None
    return statistics.median(sorted(hits))


def _place_section_images(s0, s1, owned, img_pin, min_hold, onsets, snap_ms=120):
    """Split section span [s0,s1] across its owned images using each image's OWN
    confirmed-word pin (equal-split only for un-pinned runs), then enforce the
    MINIMUM-HOLD rule: drop trailing overflow (prefer un-pinned) so no shot is
    shorter than ``min_hold`` — unless a single image alone occupies a span that
    is itself shorter than min_hold (unavoidable; that image is kept).

    Returns ``(placed, dropped)`` where ``placed`` is an ordered list of
    ``(start, end, img_idx, key)`` and ``dropped`` is the list of dropped image
    indices (logged as ``dropped_short_hold``)."""
    dropped = []
    kept = list(owned)  # [(img_idx, key), ...]
    if not kept:
        return [], dropped

    def anchors_for(lst):
        n = len(lst)
        a = [None] * n
        for i, (img, _key) in enumerate(lst):
            p = img_pin.get(img)
            if p is not None:
                a[i] = min(max(float(p), s0), s1)
        known = ([(-1, s0)] + [(i, a[i]) for i in range(n) if a[i] is not None]
                 + [(n, s1)])
        for (i0, t0), (i1, t1) in zip(known, known[1:]):
            gap = i1 - i0
            for kk in range(i0 + 1, i1):
                a[kk] = t0 + (t1 - t0) * ((kk - i0) / gap)
        for i in range(1, n):
            if a[i] <= a[i - 1]:
                a[i] = a[i - 1] + 1e-3
        return a

    # DROP loop: while a shot would be shorter than min_hold and is droppable
    # (un-pinned), drop the shortest such image. Never drop a pinned image.
    while len(kept) > 1:
        a = anchors_for(kept)
        bnds = [s0] + [a[i] for i in range(1, len(kept))] + [s1]
        durs = [bnds[i + 1] - bnds[i] for i in range(len(kept))]
        worst = None
        for i, d in enumerate(durs):
            if d < min_hold - 1e-6 and img_pin.get(kept[i][0]) is None:
                if worst is None or d < worst[1]:
                    worst = (i, d)
        if worst is None:
            break
        dropped.append(kept[worst[0]][0])
        kept.pop(worst[0])

    a = anchors_for(kept)
    # interior boundaries = the LATER image's anchor, backed off by a small
    # pre-roll so a pinned image is up as its word lands; snapped to onsets.
    raw = [s0]
    for i in range(1, len(kept)):
        raw.append(max(s0, a[i] - _IMAGE_PIN_PREROLL))
    raw.append(s1)
    raw = _snap_increasing(raw, onsets, snap_ms=snap_ms)
    placed = []
    for i, (img, key) in enumerate(kept):
        placed.append((round(raw[i], 3), round(raw[i + 1], 3), img, key))
    return placed, dropped


def compute_script_gates(shots, sections_lyric, typed, bounds, pins_by_section,
                         dropped_by_section, rms_sections, rms_env, onsets,
                         min_hold):
    """Numeric acceptance gates for an energy-aligned script schedule, embedded
    in the shot report so the render is verifiable WITHOUT watching it.

    Per typed section it reports the energy overlap with its type, the audio class
    actually measured, whether each boundary sits on a novelty point (or is
    pin-driven), and pin containment. The section is GATED on energy only when it
    is 'decisive' (bracket type agrees with the measured audio class) — a
    kids-chant hook that the recording keeps moderate (a build) is reported but
    exempt (its correctness comes from order + pins + boundary placement, not
    energy). Also flags short shots (min-hold violations)."""
    hop, values = _env_series(rms_env)
    median = _env_median(values)
    novelty = _novelty_points(rms_sections, hop, values, bounds[-1] if bounds else 0.0)
    S = len(typed)

    def near_novelty(t):
        return any(abs(t - p) <= _GATE_BOUNDARY_TOL_SEC for p in novelty)

    pinned_boundary = set()  # boundary indices set by a both-pinned midpoint
    fp = [_filter_pin_outliers(p) for p in pins_by_section]
    for k in range(1, S):
        if fp[k - 1] and fp[k]:
            pinned_boundary.add(k)

    sec_reports = []
    energy_pass = True
    boundary_pass = True
    pins_pass = True
    for i in range(S):
        x, y = bounds[i], bounds[i + 1]
        typ = typed[i]
        overlap = round(100.0 * _match_fraction(x, y, hop, values, median, typ), 1)
        mean_e = _mean_env(x, y, hop, values)
        measured = ("high" if mean_e > median else "low")
        decisive = (typ in ("high", "low") and typ == measured)
        gated = decisive
        if gated and overlap < _GATE_ENERGY_OVERLAP_PCT:
            energy_pass = False
        # left boundary (i) is interior when 0 < i < S
        b_ok = True
        b_src = None
        b_dist = None
        if 0 < i < S:
            if i in pinned_boundary:
                b_src = "pin"
            elif fp[i] or (i - 1 >= 0 and fp[i - 1]):
                # one-sided pin clamp touched this boundary
                b_src = "pin"
            else:
                b_src = "novelty"
                b_dist = round(min((abs(bounds[i] - p) for p in novelty),
                                   default=999.0), 3)
                b_ok = near_novelty(bounds[i])
                if not b_ok:
                    boundary_pass = False
        # pin containment
        p = fp[i]
        p_inside = True
        if p:
            p_inside = (x - 1e-3 <= min(p) and max(p) <= y + 1e-3)
            if not p_inside:
                pins_pass = False
        sec_reports.append({
            "index": i,
            "label": sections_lyric[i]["label"] if i < len(sections_lyric) else "",
            "type": typ,
            "measured_class": measured,
            "decisive": decisive,
            "gated_on_energy": gated,
            "span": [round(x, 3), round(y, 3)],
            "energy_overlap_pct": overlap,
            "mean_energy": round(mean_e, 4),
            "left_boundary": round(x, 3),
            "left_boundary_source": b_src,
            "left_boundary_novelty_dist": b_dist,
            "left_boundary_ok": b_ok,
            "pins": [round(t, 2) for t in p],
            "pins_inside": p_inside,
            "dropped_short_hold": dropped_by_section.get(i, []),
        })

    # short-shot check: every emitted shot >= min_hold, unless it is the sole
    # shot of a section whose span is itself shorter than min_hold (unavoidable).
    span_by_section = {i: (bounds[i + 1] - bounds[i]) for i in range(S)}
    shots_per_section = {}
    for s in shots:
        shots_per_section.setdefault(s.get("section"), 0)
        shots_per_section[s.get("section")] += 1
    short_shots = []
    no_short = True
    for s in shots:
        dur_s = s["end"] - s["start"]
        if dur_s < min_hold - 1e-6:
            lbl = s.get("section")
            # find section index by label match (labels are unique enough here)
            idxs = [i for i in range(S)
                    if (sections_lyric[i]["label"] if i < len(sections_lyric)
                        else "") == lbl]
            sole_unavoidable = any(
                span_by_section.get(i, 0.0) < min_hold - 1e-6
                and shots_per_section.get(lbl, 0) <= 1 for i in idxs)
            if not sole_unavoidable:
                no_short = False
                short_shots.append({"image": s["image_name"],
                                    "dur": round(dur_s, 3),
                                    "section": lbl})

    all_pass = energy_pass and boundary_pass and pins_pass and no_short
    return {
        "energy_median": round(median, 5),
        "min_hold_sec": round(min_hold, 3),
        "loud_regions": _loud_regions(rms_sections, hop, values,
                                      bounds[-1] if bounds else 0.0),
        "novelty_points": [round(p, 2) for p in novelty],
        "thresholds": {
            "energy_overlap_pct": _GATE_ENERGY_OVERLAP_PCT,
            "boundary_tol_sec": _GATE_BOUNDARY_TOL_SEC,
            "match_hysteresis": _GATE_MATCH_HYST,
            "min_hold_sec": round(min_hold, 3),
        },
        "sections": sec_reports,
        "short_shots": short_shots,
        "pass": {
            "energy_overlap": energy_pass,
            "boundaries": boundary_pass,
            "pins_inside": pins_pass,
            "no_short_shots": no_short,
            "all": all_pass,
        },
    }


def build_script_schedule(words, images, lyrics_text, downbeats, duration,
                          onsets=None, cut_every=2, min_seg_dur=1.8,
                          snap_ms=120, sections=None, rms_env=None, beats=None):
    """Build the shot sequence from the lyric SHEET's sections (script mode).

    Returns ``(segs, image_indices, cut_times, shots)`` in the SAME shape as
    ``build_shotlist`` (each shot additionally carries ``section`` + ``owned_word``
    and, like the anchor path, ``core_start``/``core_end``). Returns ``None`` when
    script scheduling cannot apply (no lyrics/sections/images, or no section owns
    any image) — the caller then falls back to the anchor / cycle path.

    Steps (Jul-15 pt3 energy alignment): parse sections -> owned images per
    section (first-appearance order) -> TYPE each section quiet/loud from its
    bracket -> ENERGY-DP-align the section boundaries to the audio's RMS profile
    (``rms_env``) with confirmed-word pins as hard constraints (proportional
    fallback when no envelope) -> beat-snap boundaries -> within each section time
    its owned images from their OWN confirmed-word pins (equal-split fallback) and
    enforce MINIMUM-HOLD (drop trailing overflow, logged) -> sections owning
    nothing HOLD a neighbour -> tail holds to the end. Consecutive same-image
    shots merge into one continuous held shot. Per-section numeric gates are
    computed and stashed in ``_LAST_SCRIPT_GATES`` for the shot report."""
    global _LAST_SCRIPT_GATES
    _LAST_SCRIPT_GATES = None
    if not images or not lyrics_text:
        return None
    sections_lyric, line_section = parse_lyric_sections(lyrics_text)
    if not sections_lyric:
        return None
    image_tokens = build_image_tokens(images)
    if not any(image_tokens):
        return None
    owned_per = [_owned_images_in_section(s["content_keys"], image_tokens)
                 for s in sections_lyric]
    if not any(owned_per):
        return None  # nothing the sheet can schedule -> caller falls back

    dur = round(float(duration), 3)
    words = words or []
    onsets = onsets or []
    n_sec = len(sections_lyric)
    typed = [_type_section(s["label"]) for s in sections_lyric]
    pins = _pins_by_section(words, lyrics_text, line_section, n_sec)
    confirmed = _confirmed_by_section(words, lyrics_text, line_section, n_sec)
    weights = [max(1, len(s["content_keys"])) for s in sections_lyric]

    # ENERGY-PROFILE section boundaries (falls back to proportional when no env).
    bounds = _energy_section_bounds(typed, pins, weights, sections or [],
                                    rms_env, onsets, dur)
    bounds = _snap_increasing(bounds, onsets, snap_ms=snap_ms)

    # minimum hold = _SCRIPT_MIN_HOLD_BEATS beats of the beat grid. Prefer the
    # timeline ``beats``; else estimate a beat as a quarter of the downbeat bar.
    if beats and len(beats) >= 2:
        beat_iv = statistics.median([b - a for a, b in zip(beats, beats[1:])])
    elif downbeats and len(downbeats) >= 2:
        beat_iv = statistics.median(
            [b - a for a, b in zip(downbeats, downbeats[1:])]) / 4.0
    else:
        beat_iv = 0.5
    min_hold = max(0.2, _SCRIPT_MIN_HOLD_BEATS * float(beat_iv))

    # --- per-section shot sub-ranges (image or None=hold) with pin timing ---
    raw = []  # [start, end, image_idx|None, label, owned_word|None]
    dropped_by_section = {}
    for i, sec in enumerate(sections_lyric):
        s0, s1 = bounds[i], bounds[i + 1]
        if s1 - s0 <= 0.05:
            continue
        owned = owned_per[i]
        if not owned:
            raw.append([s0, s1, None, sec["label"], None])
            continue
        img_pin = {img: _image_pin(key, confirmed[i]) for (img, key) in owned}
        placed, dropped = _place_section_images(
            s0, s1, owned, img_pin, min_hold, onsets, snap_ms=snap_ms)
        if dropped:
            dropped_by_section[i] = [os.path.basename(images[d]) for d in dropped]
        for (a, e, img, word) in placed:
            if e - a <= 0.01:
                continue  # collapsed by snapping — drop the sliver
            raw.append([a, e, img, sec["label"], word])
    if not raw:
        return None

    # --- resolve HOLD images: previous real image, else first upcoming ---
    first_real = next((r[2] for r in raw if r[2] is not None), None)
    if first_real is None:
        return None
    last = None
    for r in raw:
        if r[2] is None:
            r[2] = last if last is not None else first_real
        else:
            last = r[2]

    # --- merge consecutive same-image shots (continuous held art, no restart) ---
    merged = []
    for (s, e, img, label, word) in raw:
        if merged and merged[-1]["image"] == img:
            prev = merged[-1]
            prev["end"] = e
            if prev["owned_word"] is None and word is not None:
                prev["owned_word"] = word
                prev["section"] = label
                prev["core_start"] = s
                prev["core_end"] = e
            elif word is not None:
                prev["core_end"] = e  # extend the owned window
        else:
            merged.append({
                "start": s, "end": e, "image": img, "section": label,
                "owned_word": word,
                "core_start": s,
                "core_end": e if word is not None else s,
            })

    # --- contiguity: cover [0, duration] exactly + tile ---
    merged[0]["start"] = 0.0
    merged[-1]["end"] = dur
    for a, b in zip(merged, merged[1:]):
        b["start"] = a["end"]

    segs, image_indices, cut_times, shots = [], [], [], []
    for i, mrec in enumerate(merged):
        s = round(mrec["start"], 3)
        e = round(mrec["end"], 3)
        segs.append((s, e))
        image_indices.append(mrec["image"])
        word = mrec["owned_word"]
        shots.append({
            "start": s, "end": e, "image": mrec["image"],
            "image_name": os.path.basename(images[mrec["image"]]),
            "anchored": True,
            "trigger_word": word,
            "trigger_time": s if word is not None else None,
            "trigger_phrase": word,
            "match_score": 1 if word is not None else None,
            "core_start": round(mrec["core_start"], 3),
            "core_end": round(mrec["core_end"], 3),
            # script-schedule additive fields (for the shot report).
            "section": mrec["section"],
            "owned_word": word,
        })
        if i > 0:
            cut_times.append(s)

    # --- numeric acceptance gates (stashed for the shot report) ---
    try:
        _LAST_SCRIPT_GATES = compute_script_gates(
            shots, sections_lyric, typed, bounds, pins, dropped_by_section,
            sections or [], rms_env, onsets, min_hold)
    except Exception as _e:  # noqa: BLE001 — gates never fail a render
        _log("script gates: could not compute (%s)" % _e)
        _LAST_SCRIPT_GATES = None
    return segs, image_indices, cut_times, shots


# ---------------------------------------------------------------------------
# Top-level shot list builder
# ---------------------------------------------------------------------------

def build_shotlist(words, images, downbeats, duration, onsets=None,
                   cut_every=2, min_seg_dur=1.8, snap_ms=120, preroll=0.35):
    """Build the lyric-synced shot sequence.

    THE HOLD RULE (Jul-15, replaces cadence-cycling of leftover images):
    these are PHONICS TEACHING videos — the image IS the meaning of the sung
    word, so a wrong image over a sung word is pedagogically harmful (worse than
    a repeat, worse than a blank). Therefore an image may ONLY be on screen when
    its word was just sung, is being sung, or is about to be sung:

      1. Images that did NOT earn an anchor are NEVER shown — no cadence rotation
         of leftovers (they remain in the pool only as potential anchors).
      2. The gap between two anchored shots HOLDS the previous anchored image
         until the next anchor's (unchanged, beat-snapped) shot starts.
      3. The intro gap (before the first anchor) HOLDS the FIRST anchor's image
         from t=0 — kids seeing the upcoming word early is good pedagogy and can
         never be a WRONG pairing.
      4. The last anchored image HOLDS to the video end (the tail rule — now
         trivially an anchored image, since fillers no longer exist).

    Ken Burns + the beat pulse keep motion alive on held shots (the render
    applies both per shot regardless of hold length).

    Returns ``(segs, image_indices, cut_times, shots)`` where:
      - ``segs``           : list of (start, end) covering [0, duration]
      - ``image_indices``  : parallel list of image indices (into ``images``)
      - ``cut_times``      : interior cut boundaries actually used (audit)
      - ``shots``          : parallel list of dicts
                             {start,end,image,image_name,anchored,
                              trigger_word,trigger_time,trigger_phrase,
                              match_score,core_start,core_end}
                             Every emitted shot is ``anchored`` (holds reuse the
                             anchored image). ``core_start``/``core_end`` record
                             the anchor's OWN beat-snapped window (for the shot
                             report's ``held_gap_seconds`` measure).

    Returns ``None`` when lyric-sync cannot apply (no words, or zero keyword
    matches). The caller then falls back to the bit-identical cycle path — the
    old cadence behavior over the WHOLE image pool (rule 6: never a black video).
    """
    if not words or not images:
        return None

    image_tokens = build_image_tokens(images)
    if not any(image_tokens):
        return None

    # Gate anchors off any word inside a long approx (even-distributed) run —
    # those trigger times are smeared guesses and would fire images at the wrong
    # moment. Short approx runs stay anchorable.
    suppressed_idx, _spans = compute_approx_suppression(words)
    clusters = find_matches(words, images, image_tokens,
                            suppressed_idx=suppressed_idx)
    if not clusters:
        return None  # no object words sung -> nothing to sync; caller cycles

    # find_matches already emits clusters in trigger-time order, but a phrase
    # whose span brackets a shorter intervening anchor (e.g. cat-mat over
    # "cat ... bird ... mat") produces OVERLAPPING windows. Sort by trigger_time
    # (stable) so the resolve loop's monotonic clamping + min-shot-duration
    # merging always sees anchors in chronological order and resolves the tight
    # overlaps sanely.
    clusters = sorted(clusters, key=lambda c: c["trigger_time"])

    grid = build_cut_grid(downbeats, duration, onsets=onsets,
                          cut_every=cut_every, snap_ms=snap_ms)

    # Images whose keyword is sung earn anchors; every OTHER image is never shown
    # (the hold rule — no cadence fillers). Nothing needs to be tracked for them.

    # --- resolve each cluster to a beat-snapped [astart, aend) window ---
    # ``resolved`` entries are mutable [astart, aend, cluster] so CRIT-2 can
    # shrink a PREVIOUS anchor's hold when two triggers land near-simultaneously.
    resolved = []
    prev_end = 0.0
    for c in clusters:
        trig = c["trigger_time"]
        # W1: widen the pre-roll for anchors whose trigger time was guessed.
        eff_preroll = APPROX_PREROLL if c.get("approx") else preroll
        ideal_astart = _cut_before(c["start"], grid, preroll=eff_preroll)
        astart = ideal_astart
        # Keep windows monotonic & non-overlapping with the previous anchor.
        if astart < prev_end:
            if prev_end <= trig:
                # Safe clamp: the image is still up by the time the word is sung.
                astart = prev_end
            else:
                # CRIT-2: clamping to prev_end would start THIS image AFTER its
                # own word is already sung. Shrink the previous anchor instead.
                prev = resolved[-1]
                prev_trig = prev[2]["trigger_time"]
                if ideal_astart > prev_trig:
                    # Reconcilable: end the previous anchor at this anchor's
                    # pre-roll start. The previous word is still covered up to
                    # (and past) its own trigger, so it never loses its moment.
                    prev[1] = ideal_astart
                    astart = ideal_astart
                else:
                    # Irreconcilable on this grid (the two triggers are closer
                    # than a single cut can separate): prefer covering the LATER
                    # word from its trigger onward; the earlier word's hold is
                    # trimmed. Surfaced in the audit output.
                    astart = trig
                    if prev[1] > trig:
                        prev[1] = trig
                    _log("WARN compressed anchor: %r@%.2fs and %r@%.2fs are "
                         "closer than the cut grid -> covering %r from its "
                         "trigger; %r's hold trimmed"
                         % (prev[2]["trigger_word"], prev_trig,
                            c["trigger_word"], trig,
                            c["trigger_word"], prev[2]["trigger_word"]))
                prev_end = prev[1]
        aend = _cut_at_or_after(c["end"], grid, duration)
        if aend <= astart:
            # Degenerate (very short single mention): take the next grid cut, or
            # a small musical hold.
            nxt = _cut_at_or_after(astart + 0.01, grid, duration)
            aend = nxt if nxt > astart else min(duration, astart + min_seg_dur)
        resolved.append([astart, aend, c])
        prev_end = aend

    # --- assemble the timeline as CONTIGUOUS anchor HOLDS (no fillers) ---
    #
    # Each anchored image is held from where the previous shot ended (t=0 for the
    # FIRST anchor — the intro hold, rule 3) until the NEXT anchor's (unchanged,
    # beat-snapped) shot starts; the LAST anchor holds to the video end (rule 4).
    # No unmatched/cadence filler is ever emitted (rule 1). ``core_start`` /
    # ``core_end`` carry the anchor's OWN beat-snapped window (its [astart,aend])
    # so the shot report can measure how much of the video is held art
    # (``held_gap_seconds``).
    #
    # boundary = (start, end, image_idx, anchored, trigger_word, trig_time,
    #             trigger_phrase, match_score, core_start, core_end)
    dur = round(duration, 3)
    starts = [r[0] for r in resolved]
    boundaries = []
    cursor = 0.0
    for i, (astart, aend, c) in enumerate(resolved):
        # Hold this image until the NEXT anchor's own start, or the video end for
        # the last anchor (the tail hold).
        hold_end = starts[i + 1] if i + 1 < len(resolved) else dur
        if hold_end <= cursor + 0.05:
            # Two triggers closer than a single grid cut (already WARNed in the
            # resolve loop above) -> this image cannot get its own hold; its word
            # is covered by the neighbouring anchor. Skip the zero-length shot.
            continue
        boundaries.append((cursor, hold_end, c["image"], True,
                           c["trigger_word"], c["trigger_time"],
                           c.get("trigger_phrase"), c.get("match_score"),
                           astart, aend))
        cursor = hold_end

    if not boundaries:
        return None

    # Safety: the final shot must reach the video end (tail rule). A trailing
    # degenerate skip could leave a sliver — extend the last held shot to cover.
    if boundaries[-1][1] < dur - 0.05:
        last = boundaries[-1]
        boundaries[-1] = (last[0], dur) + last[2:]

    # --- derive return values ---
    segs, image_indices, shots = [], [], []
    cut_times = []
    for i, (s, e, img, anchored, tw, tt, tp, ms, cs, ce) in enumerate(boundaries):
        segs.append((round(s, 3), round(e, 3)))
        image_indices.append(img)
        shots.append({
            "start": round(s, 3),
            "end": round(e, 3),
            "image": img,
            "image_name": os.path.basename(images[img]),
            "anchored": anchored,
            "trigger_word": tw,
            "trigger_time": round(tt, 3) if tt is not None else None,
            # Additive (backward-compatible) fields for the shot report + audit.
            "trigger_phrase": tp,
            "match_score": ms,
            # The anchor's OWN beat-snapped window (held_gap_seconds measure).
            "core_start": round(cs, 3),
            "core_end": round(ce, 3),
        })
        if i > 0:
            cut_times.append(round(s, 3))
    return segs, image_indices, cut_times, shots


def format_shotlist(shots):
    """Return a human-readable audit table of the shot list (list of lines)."""
    lines = ["shot list: %d shots" % len(shots)]
    for i, s in enumerate(shots):
        tt = s.get("trigger_time")
        if s["anchored"] and tt is not None:
            phrase = s.get("trigger_phrase") or s["trigger_word"]
            tag = ("ANCHOR @%.2fs  phrase=%r (%d tok)"
                   % (tt, phrase, s.get("match_score") or 1))
        elif s["anchored"]:
            # script-schedule held shot (image on screen around its section, no
            # single trigger time) — surface the section label if present.
            tag = "HELD  section=%r" % (s.get("section") or "")
        else:
            tag = "filler"
        lines.append("  [%02d] %6.2f-%6.2f  %-24s  %s"
                     % (i, s["start"], s["end"], s["image_name"], tag))
    return lines


def build_shot_report(shots, images, words, image_tokens=None,
                      schedule_mode="anchor", timing_source="transcribe"):
    """Assemble the machine-verifiable shot report.

    Returns a dict::

        {"shots": [{start,end,image_name,anchored,trigger_word,
                    trigger_phrase,match_score}, ...],
         "summary": {schedule_mode, timing_source, images_total, images_matched,
                     anchored_shots, coverage_pct, held_gap_seconds,
                     images_unused_multi_token[],
                     unused_multi_token_phrase_present[],
                     approx_pct, suppressed_spans[], quality_flags[]}}

    ``timing_source`` records which tier timed the words: "align" (stable-ts
    forced alignment — the primary lyrics path), "transcribe" (whisper), "subs"
    (imported cues), or "none".

    ``unused_multi_token_phrase_present`` is the loud-warning subset: multi-token
    images whose full phrase IS sung somewhere in the lyrics yet never made it on
    screen — a real matcher miss. (Under the Jul-15 hold rule unanchored images
    are never shown, so unanchored shots simply do not appear in ``shots``.)

    ``held_gap_seconds`` (Jul-15) : total seconds of the video covered by a HELD
    anchored image (the intro hold, inter-anchor gaps, and the tail) rather than
    by the anchor's own beat-snapped word window — i.e. how much of the video is
    held art. Computed per shot as ``shot_duration - core_window_duration``
    (using the additive ``core_start``/``core_end`` fields ``build_shotlist``
    stamps on each shot); cycle-path shots carry no core window and contribute 0.
    ``images_matched``/``images_total`` semantics are unchanged.

    Self-flagging (the stutter-song garble triage):
      - ``approx_pct``       : share (0-100) of timeline words placed by the
        even-distribution guess (``approx``) rather than a whisper hit — the
        single best signal that transcription failed on this song.
      - ``suppressed_spans`` : ``[[start,end], ...]`` seconds rendered
        subtitle-free / anchor-free because they were long approx runs.
      - ``quality_flags``    : human-readable warnings for a batch sweep to
        triage; a song with ``approx_pct`` > ``_APPROX_QUALITY_FLAG_PCT`` gets
        one, and a song with ZERO anchored shots (rule 6 — cadence fallback over
        the whole pool) gets a ``"zero anchors — cadence fallback"`` flag.
    """
    if image_tokens is None:
        image_tokens = build_image_tokens(images)
    words = words or []
    cw = _content_words(words)

    report_shots = []
    shown = set()
    anchored_imgs = set()
    anchored_shots = 0
    held_gap_seconds = 0.0
    for s in shots:
        rs = {
            "start": s["start"], "end": s["end"],
            "image_name": s["image_name"],
            "anchored": s["anchored"],
            "trigger_word": s.get("trigger_word"),
            "trigger_phrase": s.get("trigger_phrase"),
            "match_score": s.get("match_score"),
        }
        # script-schedule shots carry their section label + owned word so the
        # report shows WHICH lyric-sheet section timed each image.
        if schedule_mode == "script":
            rs["section"] = s.get("section")
            rs["owned_word"] = s.get("owned_word")
        report_shots.append(rs)
        shown.add(s["image"])
        if s["anchored"]:
            anchored_shots += 1
            anchored_imgs.add(s["image"])
        # Held time = how much longer this image is on screen than its own
        # beat-snapped word window. Cycle-path shots carry no core window (no
        # holds happen there) and contribute nothing.
        cs = s.get("core_start")
        ce = s.get("core_end")
        if cs is not None and ce is not None:
            shot_dur = s["end"] - s["start"]
            core_dur = max(0.0, ce - cs)
            held_gap_seconds += max(0.0, shot_dur - core_dur)

    unused_multi = []
    unused_multi_phrase = []
    for i, toks in enumerate(image_tokens):
        if len(toks) >= 2 and i not in shown:
            name = os.path.basename(images[i])
            unused_multi.append(name)
            if _phrase_in_content(toks, cw):
                unused_multi_phrase.append(name)

    images_total = len(images)
    images_matched = len(anchored_imgs)

    # --- self-flagging: approx share + suppressed spans + quality flags ---
    total_words = len(words)
    approx_words = sum(1 for w in words if w.get("approx"))
    approx_pct = (round(100.0 * approx_words / total_words, 1)
                  if total_words else 0.0)
    _suppressed, suppressed_spans = compute_approx_suppression(words)
    quality_flags = []
    if approx_pct > _APPROX_QUALITY_FLAG_PCT:
        quality_flags.append(
            "approx_pct %.1f%% > %.0f%% — whisper largely failed on this song; "
            "long approx runs rendered subtitle-free/anchor-free; review timing "
            "and image sync" % (approx_pct, _APPROX_QUALITY_FLAG_PCT))
    # Rule 6: a song with ZERO anchored shots fell back to cadence cycling over
    # the whole image pool (build_shotlist returned None -> the engine's cycle
    # path). Surface it so a batch sweep can triage the pathological case.
    if anchored_shots == 0:
        quality_flags.append("zero anchors — cadence fallback")
    # Script-schedule engaged: the whisper warning (if any) stays, and we append
    # a note that images were timed from the lyric sheet, not from anchoring.
    if schedule_mode == "script":
        quality_flags.append(
            "script-schedule engaged — images timed from lyric-sheet sections")

    summary = {
        "schedule_mode": schedule_mode,
        # Which timing tier produced the word timings for this render:
        # "align" (stable-ts forced alignment — the primary lyrics path),
        # "transcribe" (whisper transcription + NW-align fallback), "subs" (an
        # imported .srt/.vtt), or "none" (no words). Defaults to "transcribe"
        # for older timelines that predate the field.
        "timing_source": timing_source,
        "images_total": images_total,
        "images_matched": images_matched,
        "anchored_shots": anchored_shots,
        "coverage_pct": (round(100.0 * images_matched / images_total, 1)
                         if images_total else 0.0),
        "held_gap_seconds": round(held_gap_seconds, 3),
        "images_unused_multi_token": sorted(unused_multi),
        "unused_multi_token_phrase_present": sorted(unused_multi_phrase),
        "approx_pct": approx_pct,
        "suppressed_spans": suppressed_spans,
        "quality_flags": quality_flags,
    }
    # Energy-alignment numeric gates (script mode): stashed by
    # ``build_script_schedule`` on the same render. Surface pass/fail in
    # quality_flags so a glance at the summary shows whether the gates held.
    if schedule_mode == "script" and _LAST_SCRIPT_GATES is not None:
        summary["gates"] = _LAST_SCRIPT_GATES
        gp = _LAST_SCRIPT_GATES.get("pass", {})
        if not gp.get("all", False):
            failed = [k for k in ("energy_overlap", "boundaries", "pins_inside",
                                  "no_short_shots") if not gp.get(k, True)]
            quality_flags.append("energy gates FAILED: " + ", ".join(failed))
        else:
            quality_flags.append("energy gates PASS (all)")

    return {"shots": report_shots, "summary": summary}
