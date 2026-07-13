"""Subtitle import (contract V2 §C) — stdlib SRT / VTT parser.

MacWhisper (and most whisper GUIs) export word- or line-level `.srt`/`.vtt`.
When the operator supplies one, we use it as the TIMING source and skip whisper
entirely. A word-per-cue file gives direct word timings; a multi-word cue is
split evenly across its span (each such word flagged ``approx=True`` so the
image scheduler widens its pre-roll, exactly like analyze.py's guessed times).

No dependencies — pure stdlib string parsing. Robust to: a UTF-8 BOM, CRLF line
endings, SRT numeric cue ids, VTT `WEBVTT` headers / `NOTE` / `STYLE` blocks,
multi-line cue text, inline `<...>` tags, and both `HH:MM:SS,mmm` (SRT) and
`HH:MM:SS.mmm` / `MM:SS.mmm` (VTT) timestamps.
"""

import re

# hours optional (VTT allows MM:SS.mmm); comma OR dot before the milliseconds.
_TS = re.compile(r"(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})")
_TAG = re.compile(r"<[^>]*>")


def _parse_ts(token):
    """Parse the first timestamp in ``token`` -> seconds (float), or None."""
    m = _TS.search(token)
    if not m:
        return None
    h = int(m.group(1) or 0)
    mm = int(m.group(2))
    ss = int(m.group(3))
    frac = m.group(4)
    ms = int(frac) * (10 ** (3 - len(frac)))  # '1'->100, '12'->120, '123'->123
    return h * 3600 + mm * 60 + ss + ms / 1000.0


def _has_alnum(tok):
    return any(ch.isalnum() for ch in tok)


def parse_cues(path):
    """Parse an SRT/VTT file into ordered cues ``[{text, start, end}]``.

    Blocks without a ``-->`` timing line (the VTT header, ``NOTE``/``STYLE``
    blocks, a stray numbering line) are skipped. Inline ``<...>`` tags (VTT
    styling / per-word timestamp tags) are stripped from the display text.
    """
    with open(path, "r", encoding="utf-8-sig") as fh:  # utf-8-sig drops any BOM
        raw = fh.read()
    raw = raw.replace("\r\n", "\n").replace("\r", "\n").strip("\n")
    if not raw:
        return []
    cues = []
    for block in re.split(r"\n[ \t]*\n", raw):
        blines = block.split("\n")
        ts_idx = next((i for i, ln in enumerate(blines) if "-->" in ln), None)
        if ts_idx is None:
            continue
        left, _, right = blines[ts_idx].partition("-->")
        start = _parse_ts(left)
        end = _parse_ts(right)
        if start is None or end is None:
            continue
        text = " ".join(ln.strip() for ln in blines[ts_idx + 1:] if ln.strip())
        text = _TAG.sub("", text).strip()
        if not text:
            continue
        cues.append({"text": text, "start": start, "end": end})
    return cues


def cues_to_words(cues):
    """Turn cues into word timings.

    Single-token cue -> that word's timing verbatim. Multi-word cue -> the words
    are distributed evenly across the cue span and flagged ``approx=True``.
    Pure-punctuation tokens (no alphanumerics) are dropped.
    """
    out = []
    for c in cues:
        toks = [t for t in c["text"].split() if _has_alnum(t)]
        if not toks:
            continue
        s, e = float(c["start"]), float(c["end"])
        if len(toks) == 1:
            out.append({"word": toks[0], "start": s, "end": e})
        else:
            span = max(0.0, e - s)
            step = span / len(toks)
            for idx, tok in enumerate(toks):
                out.append({"word": tok, "start": s + idx * step,
                            "end": s + (idx + 1) * step, "approx": True})
    return out


def load_subs_words(path, duration):
    """Parse ``path`` and return time-ordered, clamped word dicts
    ``[{word, start, end, approx?}]`` inside ``[0, duration]``.

    Raises ``ValueError`` if the file yields no usable cues (caller surfaces a
    clean error rather than silently rendering subtitle-free)."""
    cues = parse_cues(path)
    words = cues_to_words(cues)
    clamped = []
    for w in words:
        s = max(0.0, min(float(w["start"]), duration))
        e = max(s, min(float(w["end"]), duration))
        if s >= duration:
            continue
        entry = {"word": w["word"], "start": round(s, 3), "end": round(e, 3)}
        if w.get("approx"):
            entry["approx"] = True
        clamped.append(entry)
    clamped.sort(key=lambda w: (w["start"], w["end"]))
    # W3: drop zero/negative-duration words left by even cue distribution, then
    # clamp any overlapping cue word times so the final list is strictly
    # non-overlapping and monotonic (end_i <= start_{i+1}), order preserved.
    result = []
    for w in clamped:
        if w["end"] <= w["start"]:
            continue  # zero/negative-duration distribution artefact
        if result and w["start"] < result[-1]["end"]:
            result[-1]["end"] = round(w["start"], 3)
            if result[-1]["end"] <= result[-1]["start"]:
                result.pop()  # clamp collapsed the previous word — drop it
        result.append(w)
    clamped = result
    if not clamped:
        raise ValueError("no usable cues parsed from %s" % path)
    return clamped
