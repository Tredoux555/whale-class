# Letter-sound audio pipeline

Turns one continuous voice recording of the 26 letter sounds (plus `ck qu sh th ch`)
into per-letter clips for the Dark Phonics lesson player and the `dark-phonics` bucket.

## Why this exists

The previous take was recorded as "all 26 sounds separated by silence" and the clips
ended up **mismatched** — the file named `a.mp3` did not contain the /a/ sound. With a
bare phoneme there is nothing in the audio identifying which letter it is, so the only
thing mapping clip to letter is *counting chunks*. One stray breath or one plosive too
quiet for the silence detector shifts every letter after it by one, silently.

The fix is in the recording protocol, not the code: **speak a label before each sound.**

    "A for apple."  <beat>  "aaaaa"   <~3s silence>   ...

The keyword is a real word, so speech-to-text reads it reliably where an isolated
phoneme is unreadable (Scribe returns things like `[beatbox sound]` for a bare /q/).
Each clip is then identified by its own label rather than by position — so the take can
be recorded out of order, and a fluffed letter can simply be redone later in the take.

`RECORDING-SCRIPT.html` is the read-off-the-screen sheet. Open it in a browser.

## Usage

    python3 process_letters.py TAKE.m4a --outdir letters-processed
    python3 finish_letters.py letters-processed
    open letters-processed/qc.html

`process_letters.py`
  - splits the take on silence (`--noise -38 --gap 1.6` are tunable; try `--noise -45`
    or `--gap 1.2` if it finds no chunks)
  - identifies each chunk by keyword via ElevenLabs speech-to-text
  - cuts the label off, keeping only the final burst — the sound itself
  - de-clicks (12ms fades) and loudness-normalises to EBU R128 (-16 LUFS)
  - writes `sound/<letter>.mp3` + `report.json`

`finish_letters.py`
  - converts every clip to the ElevenLabs voice via speech-to-speech, preserving the
    speaker's exact pronunciation and timing — the teacher's phonetics, one voice
  - builds `qc.html`: each letter, both voices, and the transcript that identified it

## Known failure mode — read this

If the label runs straight into the sound with **no beat between them**, there is no
inner silence to cut on and the clip ships still saying "A for apple". The script tries
three progressively more sensitive detection passes and then flags the clip
`LABEL NOT SEPARATED` rather than shipping it quietly. Always check `qc.html` before
publishing; anything flagged needs a human ear.

Keywords are in `KEYWORDS` at the top of `process_letters.py`. `q` uses "queen" and `qu`
uses "quilt" deliberately — sharing a keyword would make those two clips ambiguous.

Requires `ffmpeg`/`ffprobe` and `ELEVENLABS_API_KEY` in `.env.local`.
