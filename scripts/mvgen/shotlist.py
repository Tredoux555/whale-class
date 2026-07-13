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
# nearly every line — hijacks the whole shot list). We drop tokens shorter than
# 3 chars AND any of these stopwords (some are 3-4 chars, so length alone is not
# enough). Applied at BOTH the filename-indexing side and when folding plurals.
_STOPWORDS = frozenset({
    "a", "an", "and", "as", "at", "be", "by", "do", "he", "i", "if", "in",
    "is", "it", "its", "my", "no", "of", "on", "or", "so", "the", "to", "up",
    "we", "what", "who", "you",
})
_MIN_TOKEN_LEN = 3

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
    stopword). Pure numeric tokens (a bare "04"), tokens shorter than 3 chars,
    and stopwords are dropped so ubiquitous words like "a"/"the" can't hijack the
    shot list (CRIT-1).
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


def build_keyword_index(images):
    """Map every keyword variant -> image index (first image wins on a clash).

    Returns ``(index, image_tokens)`` where ``index`` is ``{variant_key: img_idx}``
    and ``image_tokens[i]`` is the list of canonical tokens for image ``i``.
    """
    index = {}
    image_tokens = []
    for i, img in enumerate(images):
        toks = filename_tokens(img)
        image_tokens.append(toks)
        for tok in toks:
            for variant in _plural_variants(tok):
                index.setdefault(variant, i)
    return index, image_tokens


# ---------------------------------------------------------------------------
# Anchors (keyword clusters)
# ---------------------------------------------------------------------------

def find_clusters(words, index):
    """Scan the ground-truth lyric words for keyword occurrences.

    Returns an ordered list of cluster dicts:
      ``{image, start, end, trigger_word, trigger_time}``.

    Consecutive mentions of the SAME keyword-image (with only non-keyword words
    such as "It's", "a", "what?" between them) collapse into ONE cluster — the
    image is already showing, so a repeat does not re-anchor. A mention that maps
    to a DIFFERENT image closes the current cluster and opens a new one. That is
    the "different image intervened -> new anchor" rule.
    """
    clusters = []
    cur = None
    for w in words:
        key = normalize_token(w.get("word", ""))
        img = index.get(key)
        if img is None:
            # NOT redundant with the index's own plural expansion: this catches
            # lyric-side plurals whose FOLDED form is the indexed key (e.g. a
            # 'potato.png' indexes {potato, potatos}; the sung word 'potatoes'
            # misses those but folds to 'potato' here). Verified needed.
            for variant in _plural_variants(key):
                if variant in index:
                    img = index[variant]
                    break
        if img is None:
            continue  # non-keyword word never breaks a cluster
        if cur is not None and cur["image"] == img:
            cur["end"] = float(w["end"])  # extend the sung cluster
        else:
            if cur is not None:
                clusters.append(cur)
            cur = {
                "image": img,
                "start": float(w["start"]),
                "end": float(w["end"]),
                "trigger_word": w["word"],
                "trigger_time": float(w["start"]),
                # W1: guessed (even-distributed) trigger times get a wider
                # pre-roll downstream. Flag carried from the trigger word.
                "approx": bool(w.get("approx")),
            }
    if cur is not None:
        clusters.append(cur)
    return clusters


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

    index, _image_tokens = build_keyword_index(images)
    if not index:
        return None

    clusters = find_clusters(words, index)
    if not clusters:
        return None  # no object words sung -> nothing to sync; caller cycles

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
    boundaries = []  # (start, end, image_idx, anchored, trigger_word, trig_time)

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
            boundaries.append((s, e, filler.pick(), False, None, None))

    cursor = 0.0
    for (astart, aend, c) in resolved:
        _fill_gap(cursor, astart)
        boundaries.append((astart, aend, c["image"], True,
                           c["trigger_word"], c["trigger_time"]))
        cursor = aend
    _fill_gap(cursor, round(duration, 3))

    if not boundaries:
        return None

    # --- derive return values ---
    segs, image_indices, shots = [], [], []
    cut_times = []
    for i, (s, e, img, anchored, tw, tt) in enumerate(boundaries):
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
        })
        if i > 0:
            cut_times.append(round(s, 3))
    return segs, image_indices, cut_times, shots


def format_shotlist(shots):
    """Return a human-readable audit table of the shot list (list of lines)."""
    lines = ["shot list: %d shots" % len(shots)]
    for i, s in enumerate(shots):
        if s["anchored"]:
            tag = "ANCHOR word=%r @%.2fs" % (s["trigger_word"], s["trigger_time"])
        else:
            tag = "filler"
        lines.append("  [%02d] %6.2f-%6.2f  %-22s  %s"
                     % (i, s["start"], s["end"], s["image_name"], tag))
    return lines
