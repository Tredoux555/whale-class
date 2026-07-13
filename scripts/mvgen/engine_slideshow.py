"""Engine A: 'slideshow'.

Assembles a music video with ffmpeg (no AI at render time):
  - images cut on DOWNBEATS from timeline.json
  - each shot gets a Ken Burns zoompan drift (deterministic per index)
  - optional coloured frame border (kids theme)
  - lyrics burned in as ASS karaoke subtitles (word-by-word highlight)

Everything is one ffmpeg filter_complex so the render is a single deterministic
process. Source images are pre-scaled once to the working canvas to keep memory
bounded and zoompan smooth.
"""

import os
import shutil
import subprocess
import sys
import tempfile
import threading

from ass_karaoke import build_ass
# Beat-grid snapping + segmentation live in shotlist so the cycle path (here)
# and the lyric-sync path share ONE copy of the snap logic (no duplication).
from shotlist import build_segments, build_shotlist, format_shotlist


def _log(msg):
    print("[slideshow] %s" % msg, file=sys.stderr, flush=True)


def _ff_escape(value):
    """Escape a value for use inside an ffmpeg filter_complex option.

    ffmpeg parses filtergraph option values specially; a literal path passed to
    ass=filename=/fontsdir= must escape the filtergraph metacharacters or a temp
    dir containing ':' '[' ',' etc. would corrupt the graph. Backslash first,
    then the rest (per ffmpeg "Notes on filtergraph escaping")."""
    s = value.replace("\\", "\\\\")
    for ch in (":", "'", "[", "]", ","):
        s = s.replace(ch, "\\" + ch)
    return s


IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".bmp")
# Pre-scale canvas: larger than output so zoompan has room to pan/zoom without
# upscaling blur.
PREP_W = 2400
PREP_H = 1350


def _run(cmd, desc):
    """Run a subprocess, raise with stderr on failure."""
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", "replace")
        raise RuntimeError(
            "%s failed (exit %d)\ncmd: %s\n--- ffmpeg stderr (tail) ---\n%s"
            % (desc, proc.returncode, " ".join(cmd), "\n".join(
                err.strip().splitlines()[-25:]))
        )
    return proc


def _run_ffmpeg_progress(cmd, duration, progress_cb, desc):
    """Run ffmpeg, parsing ``-progress pipe:1`` for encode progress.

    Reads ``out_time_us``/``out_time_ms`` key=value lines on stdout and calls
    ``progress_cb(frac)`` (0..1). stderr is drained in a thread and surfaced on
    failure (Jun-14 rule: diagnosable errors)."""
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
    err_lines = []

    def drain_err():
        for raw in proc.stderr:
            err_lines.append(raw.decode("utf-8", "replace"))

    t = threading.Thread(target=drain_err, daemon=True)
    t.start()
    try:
        for raw in proc.stdout:
            line = raw.decode("utf-8", "replace").strip()
            if not progress_cb or duration <= 0:
                continue
            us = None
            if line.startswith("out_time_us=") or line.startswith("out_time_ms="):
                val = line.split("=", 1)[1]
                # ffmpeg's out_time_ms is actually microseconds in most builds;
                # both keys report the same unit here, so treat as microseconds.
                try:
                    us = int(val)
                except ValueError:
                    us = None
            if us is not None:
                try:
                    progress_cb(min(1.0, max(0.0, (us / 1e6) / duration)))
                except Exception:  # noqa: BLE001
                    pass
    finally:
        proc.stdout.close()
    proc.wait()
    t.join(timeout=2)
    if proc.returncode != 0:
        err = "".join(err_lines)
        raise RuntimeError(
            "%s failed (exit %d)\n--- ffmpeg stderr (tail) ---\n%s"
            % (desc, proc.returncode, "\n".join(err.strip().splitlines()[-25:])))
    if progress_cb:
        try:
            progress_cb(1.0)
        except Exception:  # noqa: BLE001
            pass


def _audit_cuts(cut_times, beats):
    """Log every interior cut's distance to the nearest beat (audit aid)."""
    if not cut_times:
        _log("cut audit: no interior cuts (single shot)")
        return
    if not beats:
        _log("cut audit: %d cuts (no beat grid to compare)" % len(cut_times))
        return
    worst = 0.0
    for c in cut_times:
        d = min(abs(c - b) for b in beats)
        worst = max(worst, d)
    _log("cut audit: %d cuts, max distance to nearest beat = %.0f ms"
         % (len(cut_times), worst * 1000.0))


def list_images(images_dir):
    files = []
    for name in sorted(os.listdir(images_dir)):
        if os.path.splitext(name)[1].lower() in IMAGE_EXTS:
            files.append(os.path.join(images_dir, name))
    if not files:
        raise ValueError("no images found in %s" % images_dir)
    return files


def _prescale_images(images, work_dir):
    """Cover-crop each unique image to PREP_WxPREP_H once. Returns list of paths."""
    prepped = []
    for i, img in enumerate(images):
        out = os.path.join(work_dir, "prep_%03d.png" % i)
        vf = ("scale=%d:%d:force_original_aspect_ratio=increase,"
              "crop=%d:%d,setsar=1" % (PREP_W, PREP_H, PREP_W, PREP_H))
        _run(["ffmpeg", "-y", "-loglevel", "error", "-i", img,
              "-vf", vf, "-frames:v", "1", out], "prescale image %d" % i)
        prepped.append(out)
    return prepped


# --- beat pulse (contract V2 §A) --------------------------------------------
# A "camera hit": on each beat the zoom punches up instantly then decays fast,
# so the image lands ON the beat like a professional cut. The z expression is
# Ken Burns drift + Σ A·exp(-(t-tb)/τ) over the shot's beats (t = shot-relative
# time = on/fps). Attack is instant (gated at t>=tb); decay τ=0.12s.
PULSE_TAU = 0.12          # decay time constant (s)
PULSE_AMP_BEAT = 0.035    # plain beat
PULSE_AMP_DOWNBEAT = 0.06  # downbeat (bar line)
PULSE_AMP_ANCHOR = 0.09   # the sung word's image "punches" as the word lands
PULSE_MAX_TERMS = 24      # ffmpeg-expression safety cap per shot
PULSE_Z_MAX = 1.5         # never let the total zoom exceed this


def _pf(v):
    """Compact fixed-point format for an ffmpeg-expression literal."""
    return ("%.3f" % float(v)).rstrip("0").rstrip(".") or "0"


def _kenburns_filter(idx, frames, out_w, out_h, fps, pulses=None):
    """Deterministic Ken Burns expression for one shot.

    All shots zoom IN slowly (zoom-out in zoompan is glitchy); pan direction
    rotates by index so consecutive shots feel different. iw/ih here are the
    pre-scaled input dims (PREP_W x PREP_H); output window is out_w x out_h.

    ``pulses`` (optional) is a list of ``(shot_relative_time, amplitude)`` beat
    pulses to superimpose on the drift. When falsy the z expression is BYTE-
    IDENTICAL to the pre-pulse engine, so ``--pulse off`` never regresses v5.

    NB: the zoompan ``z`` expression is evaluated per OUTPUT frame — ``on`` is
    the frame index WITHIN this shot, so shot time = on/fps. Beat times must
    therefore already be converted to shot-relative seconds by the caller.
    """
    d = max(1, int(frames))
    # slow zoom from 1.04 -> up to ~1.18 over the shot
    drift = "min(1.04+0.0007*on,1.18)"
    if pulses:
        # each term: 0 before the beat, A*exp(-(t-tb)/tau) after (instant attack,
        # fast decay). gated by gte() so it never blows up pre-beat.
        terms = []
        for (tr, amp) in pulses:
            trs = _pf(tr)
            terms.append("if(gte(on/%d,%s),%s*exp(-(on/%d-%s)/%s),0)"
                         % (fps, trs, _pf(amp), fps, trs, _pf(PULSE_TAU)))
        # clamp the total so overlapping pulses can never over-zoom; drift keeps
        # z>=1.04 so the >=1.0 floor is automatic.
        z = "min(%s,%s+%s)" % (_pf(PULSE_Z_MAX), drift, "+".join(terms))
    else:
        z = drift
    # horizontal / vertical pan room at current zoom
    xr = "(iw-iw/zoom)"
    yr = "(ih-ih/zoom)"
    mode = idx % 4
    if mode == 0:      # pan left -> right, vertically centred
        x = "%s*on/%d" % (xr, d)
        y = "%s/2" % yr
    elif mode == 1:    # pan right -> left
        x = "%s*(1-on/%d)" % (xr, d)
        y = "%s/2" % yr
    elif mode == 2:    # pan top -> bottom, horizontally centred
        x = "%s/2" % xr
        y = "%s*on/%d" % (yr, d)
    else:              # pan bottom -> top
        x = "%s/2" % xr
        y = "%s*(1-on/%d)" % (yr, d)
    return ("zoompan=z='%s':x='%s':y='%s':d=%d:s=%dx%d:fps=%d"
            % (z, x, y, d, out_w, out_h, fps))


def _build_pulse_plan(segs, shots_meta, beats, downbeats, mode):
    """Per-shot list of ``(shot_relative_time, amplitude)`` beat pulses.

    ``mode`` is one of:
      - ``"anchor"``   — ONLY the sung key-word anchor punches; NO beat/downbeat
                         terms at all. The camera hits exactly on the vocabulary
                         word and nothing else (the calm default).
      - ``"downbeat"`` — downbeats + anchors (only the bar lines pulse).
      - ``"beat"``     — plain beats + downbeats + anchors (every beat pulses).
    Returns a list parallel to ``segs``.

    Downbeats are a subset of the beat grid, so a beat that is also a downbeat
    is classified once (downbeat amplitude — never double-counted). Anchored
    shots add a punch at the sung word's trigger time. When a shot exceeds
    ``PULSE_MAX_TERMS`` the plain beats are dropped first (anchors + downbeats
    are always kept) to bound the ffmpeg expression length.

    In ``"anchor"`` mode a shot with no anchored word yields an EMPTY per-shot
    list; the whole plan can be all-empty (no lyrics / no filename matches) and
    ``_kenburns_filter`` renders pure drift for it — anchor mode never fails a
    render for lack of anchors (the fallback-ladder principle).
    """
    db = set(round(float(t), 3) for t in downbeats)
    plan = []
    for i, (s, e) in enumerate(segs):
        terms = []  # (abs_time, amplitude, kind)
        if shots_meta is not None:
            sm = shots_meta[i]
            tt = sm.get("trigger_time")
            if sm.get("anchored") and tt is not None and s <= float(tt) < e:
                terms.append((float(tt), PULSE_AMP_ANCHOR, "anchor"))
        # "anchor" mode adds NOTHING from the beat grid — anchors only.
        if mode != "anchor":
            for b in beats:
                b = float(b)
                if b < s or b >= e:
                    continue
                if round(b, 3) in db:
                    terms.append((b, PULSE_AMP_DOWNBEAT, "down"))
                elif mode == "beat":
                    terms.append((b, PULSE_AMP_BEAT, "beat"))
        if len(terms) > PULSE_MAX_TERMS:
            keep = [t for t in terms if t[2] != "beat"]
            rest = [t for t in terms if t[2] == "beat"]
            room = max(0, PULSE_MAX_TERMS - len(keep))
            terms = keep + rest[:room]
        rel = sorted((round(t0 - s, 3), amp) for (t0, amp, _k) in terms)
        plan.append(rel)
    return plan


def render(timeline, images_dir, theme, out_path, video_w, video_h, fps,
           work_dir=None, seed=42, min_seg_dur=1.8, crf=20, preset="medium",
           cut_every=2, progress_cb=None, image_sync="lyrics", pulse="anchor"):
    """Render the full video. Returns out_path.

    Runs synchronously (the caller may wrap it in nohup for long songs).
    ``progress_cb(frac)`` (0..1) is called as ffmpeg encodes, if provided.

    ``image_sync`` selects the image scheduling:
      - ``"lyrics"`` (default): object images are anchored to the moment their
        word is sung (see shotlist.py). Auto-falls-back to cycling when there
        are no lyric words or no keyword matches.
      - ``"cycle"``: the original content-blind beat-cycling path.

    ``pulse`` selects the beat-pulse zoom effect (contract V2 §A):
      - ``"anchor"`` (default): punch ONLY on the sung key-word landings — the
        image punches as its word is sung, nothing else. If a render has zero
        anchored shots (no lyrics / no filename matches) this degrades to pure
        drift and never fails.
      - ``"beat"``: punch on every beat, downbeat, and anchor word.
      - ``"downbeat"``: punch only on downbeats + anchor words (calmer).
      - ``"off"``: pure Ken Burns drift — z expression byte-identical to v5.
    If the pulsed ffmpeg expression destabilizes (ffmpeg 4.4 quirk), the render
    is retried with progressively fewer pulse terms rather than failing.
    """
    import random
    random.seed(seed)

    duration = float(timeline["audio"]["duration"])
    audio_path = timeline["audio"]["path"]
    downbeats = timeline.get("downbeats", [])
    onsets = timeline.get("onsets", [])
    beats = timeline.get("beats", [])
    words = timeline.get("words", [])

    owns_work_dir = work_dir is None
    if owns_work_dir:
        work_dir = tempfile.mkdtemp(prefix="mvgen_")
    _log("work_dir=%s" % work_dir)

    try:
        images = list_images(images_dir)
        _log("%d source images" % len(images))
        prepped = _prescale_images(images, work_dir)

        shot = None
        if image_sync == "lyrics" and words:
            shot = build_shotlist(
                words, images, downbeats, duration, onsets=onsets,
                cut_every=cut_every, min_seg_dur=min_seg_dur)
            if shot is None:
                _log("image-sync=lyrics: no keyword matches -> cycle fallback")
        elif image_sync == "lyrics":
            _log("image-sync=lyrics: no lyric words -> cycle fallback")

        shots_meta = None
        if shot is not None:
            segs, img_indices, cut_times, shots_meta = shot
            seg_images = [prepped[i] for i in img_indices]
            n_anchor = sum(1 for s in shots_meta if s["anchored"])
            _log("%d shots (image-sync=lyrics, %d anchored, cut_every=%d)"
                 % (len(segs), n_anchor, cut_every))
            for line in format_shotlist(shots_meta):
                _log(line)
        else:
            # --- CYCLE PATH (bit-identical to the original) ---
            segs, cut_times = build_segments(
                downbeats, duration, onsets=onsets, cut_every=cut_every,
                min_seg_dur=min_seg_dur)
            _log("%d shots (image-sync=cycle, cut_every=%d, min_seg_dur=%.2fs)"
                 % (len(segs), cut_every, min_seg_dur))
            # Assign a prepped image to each shot, cycling if fewer images than
            # shots (handles the 1-image case too).
            seg_images = [prepped[i % len(prepped)] for i in range(len(segs))]

        _audit_cuts(cut_times, beats)

        # --- build filter_complex (inputs, border, ASS are constant across a
        #     pulse-reduction retry; only the per-shot zoom expression changes) ---
        inputs = []
        for img in seg_images:
            inputs += ["-i", img]
        audio_idx = len(seg_images)
        inputs += ["-i", audio_path]

        # Constant tail appended after concat: optional border + ASS karaoke.
        cur = "[vcat]"
        tail = ""
        ft = int(theme.get("frame_thickness", 0) or 0)
        if ft > 0:
            fc = theme["frame_color"].lstrip("#")
            tail += (";%sdrawbox=x=0:y=0:w=%d:h=%d:color=0x%s@1:t=%d[vframe]"
                     % (cur, video_w, video_h, fc, ft))
            cur = "[vframe]"
        ass_path = os.path.join(work_dir, "subs.ass")
        fontsdir = _prepare_fonts(theme, work_dir)
        if words:
            ass_doc = build_ass(words, theme, video_w, video_h)
            with open(ass_path, "w", encoding="utf-8") as fh:
                fh.write(ass_doc)
            ass_opt = "ass=filename=%s" % _ff_escape(ass_path)
            if fontsdir:
                ass_opt += ":fontsdir=%s" % _ff_escape(fontsdir)
            tail += ";%s%s[vout]" % (cur, ass_opt)
        else:
            _log("no words in timeline -> rendering without subtitles")
            tail += ";%snull[vout]" % cur

        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)

        # Pulse-reduction ladder: the requested level first, then progressively
        # fewer terms, ending at "off". A pulsed expression that destabilizes
        # ffmpeg 4.4 falls back rather than failing the render (contract §A).
        if pulse == "off":
            ladder = ["off"]
        elif pulse == "anchor":
            # Anchor mode already has the fewest terms; fall straight to off.
            ladder = ["anchor", "off"]
        elif pulse == "downbeat":
            ladder = ["downbeat", "off"]
        else:  # "beat"
            ladder = ["beat", "downbeat", "off"]

        def _build_graph(level):
            plan = (None if level == "off"
                    else _build_pulse_plan(segs, shots_meta, beats, downbeats,
                                           level))
            chains, labels = [], []
            for i, (s, e) in enumerate(segs):
                frames = max(1, int(round((e - s) * fps)))
                pl = plan[i] if plan else None
                kb = _kenburns_filter(i, frames, video_w, video_h, fps, pl)
                chains.append("[%d:v]%s,format=yuv420p[v%d]" % (i, kb, i))
                labels.append("[v%d]" % i)
            g = ";".join(chains)
            g += (";" + "".join(labels)
                  + "concat=n=%d:v=1:a=0[vcat]" % len(segs))
            return g + tail

        n_pulse = sum(len(p) for p in (
            [] if pulse == "off"
            else _build_pulse_plan(segs, shots_meta, beats, downbeats,
                                   ladder[0])))
        _log("pulse=%s (%d total pulse terms across %d shots)"
             % (pulse, n_pulse, len(segs)))

        for li, level in enumerate(ladder):
            graph = _build_graph(level)
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-nostats",
                   "-progress", "pipe:1"]
            cmd += inputs
            cmd += [
                "-filter_complex", graph,
                "-map", "[vout]",
                "-map", "%d:a" % audio_idx,
                "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
                "-pix_fmt", "yuv420p",
                "-r", str(fps),
                "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                "-movflags", "+faststart",
                out_path,
            ]
            if level != pulse:
                _log("pulse: retrying with reduced pulses -> %r" % level)
            _log("rendering -> %s" % out_path)
            try:
                _run_ffmpeg_progress(cmd, duration, progress_cb,
                                     "ffmpeg render")
            except RuntimeError as e:
                if li + 1 < len(ladder):
                    _log("ffmpeg render failed at pulse=%r (%s) -> falling back"
                         % (level, str(e).splitlines()[0]))
                    continue
                raise
            _log("done: %s" % out_path)
            return out_path
    finally:
        if owns_work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)


def _prepare_fonts(theme, work_dir):
    """Copy the theme font file into a fontsdir if one is given. Returns the
    fontsdir path, or None to fall back to system fontconfig."""
    font_file = theme.get("font_file")
    if font_file and os.path.exists(font_file):
        fonts_dir = os.path.join(work_dir, "fonts")
        os.makedirs(fonts_dir, exist_ok=True)
        shutil.copy(font_file, fonts_dir)
        # Copy every sibling of the same family (e.g. Lora-Italic +
        # Lora-Regular + Lora-BoldItalic, or Andika-Bold + Andika-Regular) so
        # libass can resolve the exact italic/bold style the theme asks for.
        base_dir = os.path.dirname(font_file)
        family = (theme.get("font") or "").lower()
        for name in sorted(os.listdir(base_dir)):
            low = name.lower()
            if low.endswith(".ttf") and low.startswith(family):
                cand = os.path.join(base_dir, name)
                if os.path.abspath(cand) != os.path.abspath(font_file):
                    shutil.copy(cand, fonts_dir)
        _log("embedding fonts from %s (family=%r)" % (fonts_dir, theme.get("font")))
        return fonts_dir
    if font_file:
        _log("font_file %s missing -> falling back to system font" % font_file)
    return None
