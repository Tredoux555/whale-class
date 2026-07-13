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
import sys

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

# FIX 4 (ending): a video must not fade out on an unmatched filler image — the
# last thing on screen should be a MATCHED (anchored) scene image. If the tail
# after the last anchor is short (<= this), we simply hold the last anchored
# image across it; if it is longer, fillers may cycle through the tail but the
# FINAL shot still holds the last anchored image.
TAIL_HOLD_MAX = 8.0


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


def find_matches(words, images, image_tokens=None):
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
    """
    if image_tokens is None:
        image_tokens = build_image_tokens(images)
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
# Filler picker (unmatched images, cycling; LRU when exhausted)
# ---------------------------------------------------------------------------

class _FillerPicker:
    """Deterministic filler-image chooser.

    Primary pool = the UNMATCHED images (whose keyword is never sung), cycled in
    filename order. When that pool is empty or exhausted for the current run, the
    least-recently-shown image (of the whole set) is reused, avoiding an
    immediate repeat of the last image shown.

    Waiver: when the unmatched pool holds exactly ONE image, that image IS
    returned back-to-back (the anti-repeat guard is skipped) — with a single
    filler there is nothing else to show, so repeating it beats going empty."""

    def __init__(self, n_images, unmatched):
        self.n = n_images
        self.unmatched = list(unmatched)  # image indices, filename order
        self._ptr = 0
        self._last_shown = {}   # img_idx -> shot ordinal it was last shown
        self._shot_ord = 0
        self._last_idx = None

    def _mark(self, idx):
        self._shot_ord += 1
        self._last_shown[idx] = self._shot_ord
        self._last_idx = idx
        return idx

    def pick(self):
        # Prefer an unmatched image not shown yet this cycle.
        if self.unmatched:
            # rotate through the unmatched pool
            for _ in range(len(self.unmatched)):
                idx = self.unmatched[self._ptr % len(self.unmatched)]
                self._ptr += 1
                if idx != self._last_idx or len(self.unmatched) == 1:
                    return self._mark(idx)
        # Fallback: least-recently-shown across ALL images (never seen = oldest).
        best, best_ord = None, None
        for idx in range(self.n):
            if idx == self._last_idx and self.n > 1:
                continue
            ord_ = self._last_shown.get(idx, -1)
            if best is None or ord_ < best_ord:
                best, best_ord = idx, ord_
        if best is None:
            best = 0
        return self._mark(best)


# ---------------------------------------------------------------------------
# Top-level shot list builder
# ---------------------------------------------------------------------------

def build_shotlist(words, images, downbeats, duration, onsets=None,
                   cut_every=2, min_seg_dur=1.8, snap_ms=120, preroll=0.35):
    """Build the lyric-synced shot sequence.

    Returns ``(segs, image_indices, cut_times, shots)`` where:
      - ``segs``           : list of (start, end) covering [0, duration]
      - ``image_indices``  : parallel list of image indices (into ``images``)
      - ``cut_times``      : interior cut boundaries actually used (audit)
      - ``shots``          : parallel list of dicts
                             {start,end,image,image_name,anchored,
                              trigger_word,trigger_time}

    Returns ``None`` when lyric-sync cannot apply (no words, or zero keyword
    matches) — the caller then falls back to the bit-identical cycle path.
    """
    if not words or not images:
        return None

    image_tokens = build_image_tokens(images)
    if not any(image_tokens):
        return None

    clusters = find_matches(words, images, image_tokens)
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

    # Which images are "matched" (their keyword is sung) — the rest are fillers.
    matched_imgs = {c["image"] for c in clusters}
    unmatched = [i for i in range(len(images)) if i not in matched_imgs]
    filler = _FillerPicker(len(images), unmatched)

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

    # --- assemble the full timeline: filler gaps interleaved with anchors ---
    # boundary = (start, end, image_idx, anchored, trigger_word, trig_time,
    #             trigger_phrase, match_score)
    boundaries = []

    def _fill_gap(a, b):
        """Fill [a, b) with filler images cut on the grid (merged by min_seg_dur)."""
        if b - a <= 0.05:
            return
        interior = [g for g in grid if a < g < b]
        # Merge cuts closer than min_seg_dur so filler shots stay watchable.
        pts = [a]
        for g in interior:
            if g - pts[-1] >= min_seg_dur:
                pts.append(g)
        pts.append(b)
        # Absorb a too-short trailing shot into its predecessor.
        if len(pts) >= 3 and pts[-1] - pts[-2] < min_seg_dur:
            pts.pop(-2)
        for i in range(len(pts) - 1):
            s, e = pts[i], pts[i + 1]
            # Defensive: adjacent merge points can end up ~coincident (a grid cut
            # landing right on ``b``); skip so we never emit a zero-length shot.
            if e - s <= 0.05:
                continue
            boundaries.append((s, e, filler.pick(), False, None, None, None, None))

    cursor = 0.0
    for (astart, aend, c) in resolved:
        _fill_gap(cursor, astart)
        boundaries.append((astart, aend, c["image"], True,
                           c["trigger_word"], c["trigger_time"],
                           c.get("trigger_phrase"), c.get("match_score")))
        cursor = aend

    # --- FIX 4: never end on an unmatched filler ---
    dur = round(duration, 3)
    tail = dur - cursor
    if tail > 0.05 and boundaries:
        last_anchor = boundaries[-1]  # the last appended anchor (matched image)
        if tail <= TAIL_HOLD_MAX:
            # Short tail: hold the last anchored image across it (extend). No new
            # filler is introduced, so the last thing on screen is a scene image.
            boundaries[-1] = (last_anchor[0], dur) + last_anchor[2:]
        else:
            # Long tail: fillers may cycle, but reserve a final musical hold of
            # the last anchored image so the video still ENDS on a matched image.
            hold_start = _cut_before(dur - min_seg_dur, grid, preroll=0.0)
            if hold_start <= cursor:
                hold_start = cursor
            _fill_gap(cursor, hold_start)
            boundaries.append((hold_start, dur, last_anchor[2], True,
                               last_anchor[4], last_anchor[5],
                               last_anchor[6], last_anchor[7]))
    elif tail > 0.05:
        # No anchors at all (defensive — build normally returns None earlier).
        _fill_gap(cursor, dur)

    if not boundaries:
        return None

    # --- derive return values ---
    segs, image_indices, shots = [], [], []
    cut_times = []
    for i, (s, e, img, anchored, tw, tt, tp, ms) in enumerate(boundaries):
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
        })
        if i > 0:
            cut_times.append(round(s, 3))
    return segs, image_indices, cut_times, shots


def format_shotlist(shots):
    """Return a human-readable audit table of the shot list (list of lines)."""
    lines = ["shot list: %d shots" % len(shots)]
    for i, s in enumerate(shots):
        if s["anchored"]:
            phrase = s.get("trigger_phrase") or s["trigger_word"]
            tag = ("ANCHOR @%.2fs  phrase=%r (%d tok)"
                   % (s["trigger_time"], phrase, s.get("match_score") or 1))
        else:
            tag = "filler"
        lines.append("  [%02d] %6.2f-%6.2f  %-24s  %s"
                     % (i, s["start"], s["end"], s["image_name"], tag))
    return lines


def build_shot_report(shots, images, words, image_tokens=None):
    """Assemble the machine-verifiable shot report.

    Returns a dict::

        {"shots": [{start,end,image_name,anchored,trigger_word,
                    trigger_phrase,match_score}, ...],
         "summary": {images_total, images_matched, anchored_shots,
                     coverage_pct, images_unused_multi_token[],
                     unused_multi_token_phrase_present[]}}

    ``unused_multi_token_phrase_present`` is the loud-warning subset: multi-token
    images whose full phrase IS sung somewhere in the lyrics yet never made it on
    screen — a real matcher miss, not a legitimate gap-filler.
    """
    if image_tokens is None:
        image_tokens = build_image_tokens(images)
    cw = _content_words(words or [])

    report_shots = []
    shown = set()
    anchored_imgs = set()
    anchored_shots = 0
    for s in shots:
        report_shots.append({
            "start": s["start"], "end": s["end"],
            "image_name": s["image_name"],
            "anchored": s["anchored"],
            "trigger_word": s.get("trigger_word"),
            "trigger_phrase": s.get("trigger_phrase"),
            "match_score": s.get("match_score"),
        })
        shown.add(s["image"])
        if s["anchored"]:
            anchored_shots += 1
            anchored_imgs.add(s["image"])

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
    return {
        "shots": report_shots,
        "summary": {
            "images_total": images_total,
            "images_matched": images_matched,
            "anchored_shots": anchored_shots,
            "coverage_pct": (round(100.0 * images_matched / images_total, 1)
                             if images_total else 0.0),
            "images_unused_multi_token": sorted(unused_multi),
            "unused_multi_token_phrase_present": sorted(unused_multi_phrase),
        },
    }
