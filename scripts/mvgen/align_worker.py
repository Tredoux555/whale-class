#!/usr/bin/env python3
"""Forced-alignment worker — runs in the dedicated align venv (torch + stable-ts).

WHY A SEPARATE PROCESS.  ``analyze.py`` runs in the daemon's Homebrew Python
(faster-whisper + librosa, NO torch).  Forced alignment needs
``stable_whisper`` + ``openai-whisper`` + ``torch``, which live in an isolated
venv (default ``~/mvgen-models/align-venv``) so the heavy dependency never
touches the daemon environment.  ``analyze.py`` shells out to THIS script with
that venv's interpreter and reads the result back as JSON.

CONTRACT.  ``stable_whisper.align(audio, text, language)`` performs DTW over the
model's cross-attention to time the PROVIDED lyric text — the text is never
guessed/transcribed.  Lyrics stay TEXT ground truth; alignment supplies timing
only.  Deterministic (no sampling).

Usage:
    python align_worker.py <audio> <lyrics_file> <model_size> <language> <out_json>

On success: writes ``{"words": [{"word","start","end"}, ...], "n": N}`` to
``out_json`` and exits 0.  On ANY failure it exits non-zero with a diagnostic on
stderr; ``analyze.py`` then falls back to the faster-whisper transcription tier.

Stdlib + stable_whisper ONLY — must NOT import analyze.py/align.py/subs.py
(those need librosa/faster-whisper, absent from the align venv).
"""
import json
import sys


def _clean(word):
    """Mirror of ``analyze._clean``: trim whitespace + stray leading punctuation
    whisper attaches to stuttered/short tokens ('-A', '.A.'), keeping internal
    apostrophes/hyphens and trailing sentence punctuation."""
    w = (word or "").strip()
    while w and w[0] in "-–—.,":
        w = w[1:].lstrip()
    return w.strip()


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) < 5:
        sys.stderr.write("align_worker: expected 5 args "
                         "(audio lyrics_file model language out_json)\n")
        return 2
    audio, lyrics_file, model_size, language, out_json = argv[:5]

    with open(lyrics_file, encoding="utf-8") as fh:
        text = fh.read()
    if not text.strip():
        sys.stderr.write("align_worker: empty lyrics text\n")
        return 3

    import stable_whisper  # heavy — imported after the arg check

    model = stable_whisper.load_model(model_size)
    # align() times the given text; it does not transcribe. failure_threshold
    # left at the library default so a genuinely unalignable run raises rather
    # than emitting garbage timings (analyze.py then falls back).
    result = model.align(audio, text, language=language)

    words = []
    for seg in result.segments:
        for w in (seg.words or []):
            txt = _clean(w.word)
            if not txt:
                continue
            words.append({
                "word": txt,
                "start": round(float(w.start), 3),
                "end": round(float(w.end), 3),
            })

    with open(out_json, "w", encoding="utf-8") as fh:
        json.dump({"words": words, "n": len(words)}, fh)
    sys.stderr.write("align_worker: %d words (model=%s)\n"
                     % (len(words), model_size))
    return 0


if __name__ == "__main__":
    sys.exit(main())
