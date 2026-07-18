#!/usr/bin/env python3
"""mvgen — automated music video generator (phase 1 CLI).

Design principle (non-negotiable): AI generates NOTHING at render time; code
assembles everything with ffmpeg. Cost per video ~= $0. Deterministic output.

Usage:
    python3 mvgen.py --audio song.mp3 --images dir/ [--lyrics words.txt] \\
        --theme montree|kids --engine slideshow [--out out.mp4]

If --out is omitted the video lands in ~/Desktop/Music Videos/<song>/<song>.mp4.
timeline.json is written next to the output and reused on re-runs (delete it or
pass --reanalyze to force fresh analysis).
"""

import argparse
import json
import os
import sys

# Ensure sibling modules import whether run as a script or module.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import themes as themes_mod  # noqa: E402
from analyze import (  # noqa: E402
    build_timeline,
    compute_inputs_fingerprint,
    write_timeline,
)


def _log(msg):
    print("[mvgen] %s" % msg, file=sys.stderr, flush=True)


class _Progress:
    """Append JSON lines ``{"stage": str, "progress": 0-100}`` to a file for the
    daemon to tail. No-op when no path is given (plain CLI use)."""

    def __init__(self, path):
        self.path = path
        if path:
            try:
                open(path, "w").close()  # truncate on start
            except OSError:
                self.path = None

    def emit(self, stage, progress):
        if not self.path:
            return
        try:
            with open(self.path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps({"stage": stage,
                                     "progress": round(float(progress), 1)}) + "\n")
        except OSError:
            pass


def _slug(name):
    base = os.path.splitext(os.path.basename(name))[0]
    return base.strip()


def _default_out(audio_path):
    song = _slug(audio_path)
    root = os.path.expanduser("~/Desktop/Music Videos")
    return os.path.join(root, song, song + ".mp4")


# Preferred static .ttf(s) for each theme, most-specific (matches the theme's
# italic/bold intent) first. Whichever is found first wins; siblings are copied
# alongside it by the engine so libass can pick the exact style.
_THEME_FONT_FILES = {
    "montree": ("Lora-Italic.ttf", "Lora-Regular.ttf"),
    "kids": ("Andika-Bold.ttf", "Andika-Regular.ttf"),
}

_BUNDLED_FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")


def _probe_duration(audio_path):
    """Return audio duration in seconds via ffprobe, or None if unavailable."""
    import subprocess
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if out.returncode == 0:
            return float(out.stdout.decode("utf-8", "replace").strip())
    except Exception:  # noqa: BLE001
        pass
    return None


def _resolve_font_file(theme_name, theme, images_dir, audio_path):
    """Resolve EVERY theme's font to a real .ttf and set theme['font_file'].

    Search order: (1) the bundled scripts/mvgen/fonts/ dir, (2) the assets dirs
    near the images/audio (lets a project ship its own Andika), (3) system
    fontconfig by name (font_file stays None -> libass resolves 'Lora'/'Andika'
    itself). Bundling first means the montree theme's Lora renders identically
    everywhere instead of silently substituting a system serif."""
    wanted = _THEME_FONT_FILES.get(theme_name, ())
    if not wanted:
        return
    search_dirs = [_BUNDLED_FONTS]
    for base in (images_dir, os.path.dirname(images_dir),
                 os.path.dirname(os.path.abspath(audio_path))):
        if base:
            search_dirs.append(base)
    for d in search_dirs:
        for name in wanted:
            cand = os.path.join(d, name)
            if os.path.exists(cand):
                theme["font_file"] = cand
                _log("%s theme font: %s" % (theme_name, cand))
                return
    _log("%s font not found in bundle/assets -> system fontconfig by name (%r)"
         % (theme_name, theme.get("font")))


def main(argv=None):
    p = argparse.ArgumentParser(
        description="Automated music video generator (phase 1).")
    p.add_argument("--audio", required=True, help="input .mp3")
    p.add_argument("--images", default=None,
                   help="directory of images (required unless --analyze-only)")
    p.add_argument("--lyrics", default=None,
                   help="optional lyrics .txt (ground-truth aligned words)")
    p.add_argument("--subs", default=None,
                   help="optional .srt/.vtt subtitle file (MacWhisper etc.) — "
                        "used as the timing source; whisper is NOT called. With "
                        "--lyrics the lyric words stay the display text.")
    p.add_argument("--no-lyrics", action="store_true",
                   help="skip transcription; render without subtitles")
    p.add_argument("--analyze-only", action="store_true",
                   help="write timeline.json (+ lyrics.txt) and exit before "
                        "rendering (feeds the Shot Planner)")
    p.add_argument("--theme", default=themes_mod.DEFAULT_THEME,
                   choices=list(themes_mod.THEMES.keys()))
    p.add_argument("--engine", default="slideshow",
                   choices=["slideshow", "canvas"])
    p.add_argument("--out", default=None, help="output .mp4 path")
    p.add_argument("--model", default="base",
                   help="whisper model size (tiny/base/small/...)")
    p.add_argument("--seed", type=int, default=42,
                   help="deterministic seed for any randomness")
    p.add_argument("--min-seg-dur", type=float, default=1.8,
                   help="minimum shot length in seconds")
    p.add_argument("--reanalyze", action="store_true",
                   help="force fresh analysis even if timeline.json exists")
    p.add_argument("--crf", type=int, default=20, help="x264 CRF quality")
    p.add_argument("--preset", default="medium", help="x264 preset")
    p.add_argument("--cut-every", type=int, default=2, choices=[1, 2, 4],
                   help="cut on every Nth downbeat (1/2/4 bars; default 2)")
    p.add_argument("--pulse", default="anchor",
                   choices=["off", "anchor", "beat", "downbeat"],
                   help="beat-pulse zoom: 'anchor' (only the sung key word's "
                        "image punches; default), 'downbeat' (downbeats+anchors "
                        "only), 'beat' (every beat/downbeat/anchor), 'off'")
    p.add_argument("--image-sync", default="lyrics",
                   choices=["lyrics", "cycle"],
                   help="'lyrics' (default): anchor each object image to the "
                        "moment its word is sung (needs lyrics; auto-falls-back "
                        "to cycle if no words/matches). 'cycle': content-blind "
                        "beat-cycling (the original behaviour).")
    p.add_argument("--schedule", default="auto",
                   choices=["auto", "script", "anchor"],
                   help="image scheduling strategy: 'auto' (default) uses the "
                        "certified anchor pass, but REPLACES it with the "
                        "lyric-sheet SCRIPT schedule when anchoring is poor "
                        "(few images anchored or whisper largely failed — "
                        "stutter songs); 'script' forces the sheet schedule; "
                        "'anchor' forces the certified anchor path.")
    p.add_argument("--progress-file", default=None,
                   help="append JSON-line progress {stage,progress} here "
                        "(for the daemon)")
    args = p.parse_args(argv)

    prog = _Progress(args.progress_file)
    prog.emit("analyzing", 0)

    # --- validate inputs ---
    if not os.path.exists(args.audio):
        p.error("audio not found: %s" % args.audio)
    if not args.analyze_only:
        if not args.images:
            p.error("--images is required (unless --analyze-only)")
        if not os.path.isdir(args.images):
            p.error("images dir not found: %s" % args.images)
    if args.subs and not os.path.exists(args.subs):
        p.error("subs file not found: %s" % args.subs)

    if not args.analyze_only and args.engine == "canvas":
        print("engine 'canvas' not built yet (phase 3). Use --engine slideshow.",
              file=sys.stderr)
        return 2

    out_path = args.out or _default_out(args.audio)
    out_dir = os.path.dirname(os.path.abspath(out_path))
    os.makedirs(out_dir, exist_ok=True)
    timeline_path = os.path.join(out_dir, "timeline.json")

    # --- analysis (cached) ---
    # An analyze-only run always re-analyzes: it exists to (re)compute the plan
    # for the CURRENT lyrics/subs, and the duration-only cache guard cannot
    # detect a lyrics/subs change.
    use_cache = (os.path.exists(timeline_path) and not args.reanalyze
                 and not args.analyze_only)
    if use_cache:
        with open(timeline_path, encoding="utf-8") as fh:
            cached = json.load(fh)
        # Guard against a stale cache from a different mp3: compare the stored
        # duration to the real audio duration and re-analyze on mismatch.
        cached_dur = cached.get("audio", {}).get("duration")
        actual_dur = _probe_duration(os.path.abspath(args.audio))
        if (cached_dur is not None and actual_dur is not None
                and abs(float(cached_dur) - actual_dur) > 0.5):
            _log("cached timeline duration %.2fs != audio %.2fs (>0.5s) -> "
                 "re-analyzing" % (float(cached_dur), actual_dur))
            use_cache = False
        # Guard against changed lyrics/subs/AUDIO: fingerprint the alignment
        # inputs. The duration guard above can't see a lyrics/subs edit, and
        # (FIX 1) can't see a regenerated take that kept the same filename +
        # duration — the audio bytes are now part of the fingerprint.
        if use_cache:
            current_fp = compute_inputs_fingerprint(
                args.lyrics, args.subs, args.model,
                audio_path=os.path.abspath(args.audio))
            cached_fp = cached.get("inputs_fingerprint")
            if cached_fp is None:
                # Old cache lacking the field entirely: re-analyze so it gets the
                # new (audio-inclusive) fingerprint — a stale-take reuse is worse
                # than one re-analysis.
                print("[mvgen] no input fingerprint on cache -> re-analyzing")
                use_cache = False
            elif cached_fp != current_fp:
                print("[mvgen] inputs changed (lyrics/subs/audio) -> "
                      "re-analyzing")
                use_cache = False
    if use_cache:
        _log("reusing existing %s (pass --reanalyze to refresh)" % timeline_path)
        timeline = cached
        # Keep the absolute audio path current.
        timeline.setdefault("audio", {})["path"] = os.path.abspath(args.audio)
    else:
        _log("analyzing audio ...")
        prog.emit("analyzing", 10)
        timeline = build_timeline(
            os.path.abspath(args.audio),
            lyrics_path=args.lyrics,
            no_lyrics=args.no_lyrics,
            model_size=args.model,
            subs_path=args.subs,
        )
        write_timeline(timeline, timeline_path)
    prog.emit("analyzing", 40)

    grid = timeline.get("grid") or {}
    if grid:
        cands = ", ".join(
            "%.2fx=%.4f" % (c["factor"], c["mean_onset"])
            for c in grid.get("candidates", []))
        print("grid: base=%.1fbpm chosen=%.2fx period=%.3fs phase=%.3fs | "
              "candidates[mean_onset]: %s"
              % (grid.get("base_tempo", 0), grid.get("chosen_factor", 1),
                 grid.get("period", 0), grid.get("phase", 0), cands or "n/a"))

    print("timeline: beats=%d downbeats=%d onsets=%d sections=%d words=%d "
          "duration=%.2f"
          % (len(timeline["beats"]), len(timeline["downbeats"]),
             len(timeline.get("onsets", [])), len(timeline["sections"]),
             len(timeline["words"]), timeline["audio"]["duration"]))

    # --- analyze-only: persist lyrics.txt beside the timeline, then stop ---
    if args.analyze_only:
        if args.lyrics and os.path.exists(args.lyrics):
            lyrics_out = os.path.join(out_dir, "lyrics.txt")
            try:
                if os.path.abspath(args.lyrics) != os.path.abspath(lyrics_out):
                    with open(args.lyrics, "r", encoding="utf-8") as src, \
                            open(lyrics_out, "w", encoding="utf-8") as dst:
                        dst.write(src.read())
            except OSError as e:
                _log("could not persist lyrics.txt (%s)" % e)
        prog.emit("done", 100)
        print("OK (analyze-only): %s" % timeline_path)
        return 0

    # --- theme ---
    theme = themes_mod.get_theme(args.theme)
    _resolve_font_file(args.theme, theme, args.images, args.audio)

    # --- render ---
    prog.emit("rendering", 40)

    def _on_render(frac):
        prog.emit("rendering", 40.0 + 60.0 * frac)

    # Script-schedule mode needs the RAW lyric sheet (section markers included);
    # the timeline only carries the flattened, section-stripped words.
    lyrics_text = None
    if args.lyrics and os.path.exists(args.lyrics):
        try:
            with open(args.lyrics, "r", encoding="utf-8") as fh:
                lyrics_text = fh.read()
        except OSError as e:
            _log("could not read lyrics for script-schedule (%s)" % e)

    from engine_slideshow import render
    render(
        timeline=timeline,
        images_dir=args.images,
        theme=theme,
        out_path=out_path,
        video_w=themes_mod.VIDEO_W,
        video_h=themes_mod.VIDEO_H,
        fps=themes_mod.FPS,
        seed=args.seed,
        min_seg_dur=args.min_seg_dur,
        crf=args.crf,
        preset=args.preset,
        cut_every=args.cut_every,
        progress_cb=_on_render,
        image_sync=args.image_sync,
        pulse=args.pulse,
        schedule=args.schedule,
        lyrics_text=lyrics_text,
    )
    prog.emit("done", 100)
    print("OK: %s" % out_path)
    return 0


if __name__ == "__main__":
    # Clean one-line errors to stderr; no raw traceback for the operator.
    # (SystemExit from argparse and KeyboardInterrupt are BaseExceptions and
    # deliberately pass through / handled separately.)
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("mvgen: interrupted", file=sys.stderr)
        sys.exit(130)
    except Exception as exc:  # noqa: BLE001
        print("mvgen: error: %s" % exc, file=sys.stderr)
        sys.exit(1)
