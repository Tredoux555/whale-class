"""Lyric ↔ transcript alignment (stdlib only — no torch, no stable-ts).

Quality fix A: the DISPLAYED words are ALWAYS the provided lyric words; whisper
supplies *timing* only. This module holds the pure, deterministic pieces:

  - ``normalize``            : punctuation/case-insensitive matching key
  - ``extract_lyric_words`` : parse the pasted lyric block into ordered tokens
                              (strips [Section] headers, keeps sung tokens)
  - ``needleman_wunsch``    : global DP alignment of two key sequences
  - ``align_indices``       : lyric-index -> matched transcript-index (or None)
  - ``distribute_across_intervals`` / ``pos_in_intervals`` : even-timing fallback
    gated by caller-supplied "active" (RMS) intervals

The audio-touching parts (windowed re-transcription, RMS activity) live in
analyze.py, which already has librosa + the whisper model loaded.
"""

import re


# ---------------------------------------------------------------------------
# Normalization + lyric parsing
# ---------------------------------------------------------------------------

def normalize(word):
    """Lowercase and strip every non-alphanumeric char.

    'PO-TA-TO!' -> 'potato', "It's" -> 'its', 'a…' -> 'a', '(what?)' -> 'what'.
    Hyphenated single-token spellings collapse to the word whisper would emit.
    """
    return re.sub(r"[^a-z0-9]", "", word.lower())


def extract_lyric_words(text):
    """Parse a pasted lyric block into an ordered list of display tokens.

    Returns ``[{"word": raw_token, "key": norm_key, "line": line_index}, ...]``.

    Rules (deterministic):
      - a line that is a section tag (starts with '[' after trimming) is skipped
        entirely — e.g. ``[Intro — whispered]``, ``[Hook 1 — kids chant]``.
      - every other non-empty line is whitespace-split into tokens.
      - tokens whose normalized key is empty (pure punctuation like '—') are
        dropped: they carry no sung syllable and would only pollute alignment.
      - the raw token is preserved verbatim for display (keeps '!', '…', case).
    """
    words = []
    for line_idx, raw_line in enumerate(text.splitlines()):
        line = raw_line.strip()
        if not line or line.startswith("["):
            continue
        for tok in line.split():
            key = normalize(tok)
            if not key:
                continue
            words.append({"word": tok, "key": key, "line": line_idx})
    return words


# ---------------------------------------------------------------------------
# Needleman-Wunsch global alignment
# ---------------------------------------------------------------------------

def needleman_wunsch(a_keys, b_keys, match=2, mismatch=-1, gap=-1):
    """Global DP alignment of two token-key sequences.

    Returns the traceback as a list of ``(i, j)`` pairs where ``i`` indexes
    ``a_keys`` (or None for a gap) and ``j`` indexes ``b_keys`` (or None). Order
    is preserved — this is what stops a repeated lyric line ("It's a mat…") from
    stealing timing from a *different* repetition elsewhere in the song.
    """
    n, m = len(a_keys), len(b_keys)
    # dp[i][j] = best score aligning a[:i] with b[:j]
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        dp[i][0] = i * gap
    for j in range(1, m + 1):
        dp[0][j] = j * gap
    for i in range(1, n + 1):
        ai = a_keys[i - 1]
        row, prev = dp[i], dp[i - 1]
        for j in range(1, m + 1):
            s = match if ai == b_keys[j - 1] else mismatch
            diag = prev[j - 1] + s
            up = prev[j] + gap
            left = row[j - 1] + gap
            row[j] = diag if (diag >= up and diag >= left) else (
                up if up >= left else left)

    # traceback (prefer diagonal on ties for a compact, in-order alignment)
    i, j = n, m
    out = []
    while i > 0 and j > 0:
        s = match if a_keys[i - 1] == b_keys[j - 1] else mismatch
        if dp[i][j] == dp[i - 1][j - 1] + s:
            out.append((i - 1, j - 1))
            i -= 1
            j -= 1
        elif dp[i][j] == dp[i - 1][j] + gap:
            out.append((i - 1, None))
            i -= 1
        else:
            out.append((None, j - 1))
            j -= 1
    while i > 0:
        out.append((i - 1, None))
        i -= 1
    while j > 0:
        out.append((None, j - 1))
        j -= 1
    out.reverse()
    return out


def align_indices(a_keys, b_keys, **kw):
    """Return ``matched`` where ``matched[i]`` is the transcript index aligned to
    lyric word ``i`` **only when their keys are equal**, else None. Mismatched
    diagonal pairs (substitutions) are treated as unmatched — timing must come
    from a genuine word hit, not a coincidental alignment slot."""
    matched = [None] * len(a_keys)
    for (i, j) in needleman_wunsch(a_keys, b_keys, **kw):
        if i is not None and j is not None and a_keys[i] == b_keys[j]:
            matched[i] = j
    return matched


# ---------------------------------------------------------------------------
# Even-distribution fallback (gated by caller-supplied active intervals)
# ---------------------------------------------------------------------------

def pos_in_intervals(cum, intervals):
    """Map a cumulative offset ``cum`` (seconds, measured along the concatenated
    active intervals) back to an absolute time. Clamps to the interval ends."""
    if not intervals:
        return 0.0
    remaining = cum
    for (a, b) in intervals:
        span = b - a
        if remaining <= span:
            return a + max(0.0, remaining)
        remaining -= span
    return intervals[-1][1]


def distribute_across_intervals(words, intervals):
    """Spread ``words`` evenly along the concatenation of ``intervals`` (each a
    ``(start, end)`` pair of active/singing time). Mutates each word's
    start/end in place. Returns True on success, False if there is no active
    span to place them in (caller then falls back to the raw window)."""
    total = sum(max(0.0, b - a) for (a, b) in intervals)
    k = len(words)
    if k == 0:
        return True
    if total <= 1e-6 or not intervals:
        return False
    step = total / k
    for idx, w in enumerate(words):
        w["start"] = pos_in_intervals(idx * step, intervals)
        w["end"] = pos_in_intervals((idx + 1) * step, intervals)
    return True
