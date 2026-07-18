#!/usr/bin/env python3
"""curriculum-batch — turn curriculum weeks into mvgen daemon render jobs.

Runs ON THE MAC (stdlib only), alongside the mvgen daemon (server.py on
127.0.0.1:8787). One command takes a week's picked song(s) + keyword-named
images + the spec's lyrics, builds a project folder under
``~/Desktop/Music Videos/_projects/wNN-<role>/``, and submits a render job to
the daemon — the same job shape the MV Studio dashboard POSTs.

Because this runs on the SAME Mac as the daemon, it creates the project folder
on disk directly and references its paths in the ``POST /api/jobs`` body (every
input lives under $HOME, which is all the daemon's job jail requires). It does
NOT use the streaming upload API — that exists for the browser, which has no
filesystem access.

Assets (defaults, override with env vars for testing):
  * songs   : ~/Desktop/English Curriculum 2026/Week NN/songs/
              picked winners named ``WNN <Title>[ (sound|word)].mp3``
  * images  : ~/Desktop/English Curriculum 2026/Week NN/images/
              filenames already keyword-named after sung words (mvgen contract)
  * lyrics  : the spec's songs[].lyrics (ground truth) — written to the project
              folder's lyrics.txt AND sent in the job body.
  * specs   : lib/montree/english-curriculum/spec/week-NN.json (in this repo)

Env overrides (testing / relocation — normal use needs none):
  MVGEN_CURRICULUM_ROOT   default ~/Desktop/English Curriculum 2026
  MVGEN_MUSIC_ROOT        default ~/Desktop/Music Videos  (projects go under _projects/)
  MVGEN_SPEC_DIR          default <repo>/lib/montree/english-curriculum/spec

Usage:
  python3 scripts/mvgen/curriculum-batch.py --week 27
  python3 scripts/mvgen/curriculum-batch.py --week 27 --song sound --theme kids
  python3 scripts/mvgen/curriculum-batch.py --level 2 --dry-run
  python3 scripts/mvgen/curriculum-batch.py --week 27 --wait
"""

import argparse
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(HERE))  # scripts/mvgen -> scripts -> repo

# Reuse the renderer's OWN tokenizer/stopword rules so the per-song image filter
# (FIX 3) agrees exactly with what the shotlist matcher will later anchor on.
sys.path.insert(0, HERE)
import shotlist as sl  # noqa: E402
from align import extract_lyric_words  # noqa: E402

# FIX 3b: optional alias map letting the video pipeline copy curriculum images
# under sung-word names WITHOUT renaming the source files (packs/specs depend on
# the originals). Shape: {"NN": {"original.png": "video-name.png", ...}, ...}.
ALIASES_FILE = os.path.join(HERE, "curriculum-video-aliases.json")

CURRICULUM_ROOT = os.path.expanduser(
    os.environ.get("MVGEN_CURRICULUM_ROOT", "~/Desktop/English Curriculum 2026"))
MUSIC_ROOT = os.path.expanduser(
    os.environ.get("MVGEN_MUSIC_ROOT", "~/Desktop/Music Videos"))
PROJECTS_ROOT = os.path.join(MUSIC_ROOT, "_projects")
SPEC_DIR = os.environ.get(
    "MVGEN_SPEC_DIR",
    os.path.join(REPO_ROOT, "lib", "montree", "english-curriculum", "spec"))

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".bmp")
DEFAULT_DAEMON = "http://127.0.0.1:8787"
DEFAULT_CUT_EVERY = 2  # matches the dashboard + daemon default

# level -> inclusive (first_week, last_week)
LEVEL_WEEKS = {1: (1, 26), 2: (27, 42), 3: (43, 58)}


def _log(msg):
    print(msg, file=sys.stderr, flush=True)


def _norm(s):
    """Lowercase, keep alphanumerics only — for fuzzy title/filename matching."""
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


# ---------------------------------------------------------------------------
# Locating a week's assets on the Mac
# ---------------------------------------------------------------------------

def week_dir(week):
    """Resolve the ``Week NN`` folder, tolerating zero-pad or not. Returns the
    first existing candidate, or the zero-padded path (for the error message)."""
    cands = [os.path.join(CURRICULUM_ROOT, "Week %02d" % week),
             os.path.join(CURRICULUM_ROOT, "Week %d" % week)]
    for c in cands:
        if os.path.isdir(c):
            return c
    return cands[0]


def list_images(images_dir):
    if not os.path.isdir(images_dir):
        return []
    out = []
    for name in sorted(os.listdir(images_dir)):
        if name.startswith("."):
            continue
        if os.path.splitext(name)[1].lower() in IMAGE_EXTS:
            out.append(os.path.join(images_dir, name))
    return out


def find_song_mp3(songs_dir, role, title, n_roles):
    """Find the ONE picked mp3 for a role. Returns (path, None) or (None, why).

    Winners are named ``WNN <Title>[ (sound|word)].mp3`` after take-picking, so
    the ``(role)`` suffix is the primary key. Falls back to a title match, and —
    for a single-song week with a single mp3 — to that lone file."""
    if not os.path.isdir(songs_dir):
        return None, "songs dir not found: %s" % songs_dir
    mp3s = [os.path.join(songs_dir, n) for n in sorted(os.listdir(songs_dir))
            if n.lower().endswith(".mp3") and not n.startswith(".")]
    if not mp3s:
        return None, "no .mp3 files in %s" % songs_dir

    role_tag = "(%s)" % role.lower()
    tagged = [m for m in mp3s if role_tag in os.path.basename(m).lower()]
    if len(tagged) == 1:
        return tagged[0], None
    if len(tagged) > 1:
        byt = [m for m in tagged
               if _norm(title) and _norm(title) in _norm(os.path.basename(m))]
        if len(byt) == 1:
            return byt[0], None
        return None, ("%d mp3s tagged '%s' and title '%s' does not disambiguate"
                      % (len(tagged), role, title))

    # No role-tagged file. A single-song week with a single mp3 is unambiguous.
    if n_roles == 1 and len(mp3s) == 1:
        return mp3s[0], None
    byt = [m for m in mp3s
           if _norm(title) and _norm(title) in _norm(os.path.basename(m))]
    if len(byt) == 1:
        return byt[0], None
    return None, ("no mp3 matches role '%s' / title '%s' (found: %s)"
                  % (role, title, ", ".join(os.path.basename(m) for m in mp3s)))


def load_spec(week):
    path = os.path.join(SPEC_DIR, "week-%02d.json" % week)
    if not os.path.isfile(path):
        return None, "spec not found: %s" % path
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh), None
    except (OSError, ValueError) as e:
        return None, "could not read spec %s: %s" % (path, e)


# ---------------------------------------------------------------------------
# FIX 3 / 3b — per-song image selection + alias layer
# ---------------------------------------------------------------------------

def _is_coloring(name):
    """True for a ``*-coloring.<ext>`` printable — never wanted in a video."""
    stem = os.path.splitext(os.path.basename(name))[0].lower()
    return stem.endswith("-coloring") or stem.endswith("_coloring") \
        or stem.endswith("coloring")


def load_aliases(week):
    """Return the ``{original_name: video_name}`` alias map for ``week`` (or {}).

    Week keys in the JSON may be zero-padded ("04") or not ("4") — both accepted.
    A missing/malformed file degrades to no aliases (never fatal)."""
    if not os.path.isfile(ALIASES_FILE):
        return {}
    try:
        with open(ALIASES_FILE, encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError) as e:
        _log("  WARN could not read %s (%s) — no aliases"
             % (os.path.basename(ALIASES_FILE), e))
        return {}
    for key in ("%02d" % week, "%d" % week, str(week)):
        m = data.get(key)
        if isinstance(m, dict):
            # Keep only string->string entries (ignore the "_comment" doc key).
            return {str(k): str(v) for k, v in m.items()
                    if isinstance(v, str) and not k.startswith("_")}
    return {}


def _lyric_cover(lyrics):
    """Set of content-word keys (+ plural variants) the song actually sings.

    Uses the renderer's own lyric parser (drops [Section] headers) + tokenizer/
    stopword rules, so an image is judged 'in the lyrics' the SAME way the
    shotlist matcher would anchor it."""
    keys = set()
    for w in extract_lyric_words(lyrics or ""):
        # De-stutter the RAW token first so a stutter-chant word ('t-t-taxi' ->
        # 'taxi') is recognised as sung — otherwise its image (taxi.png) is wrongly
        # dropped from the video pool, which is the exact W02 stutter-song miss.
        k = sl.normalize_token(sl.destutter(w["word"]))
        if (k and not k.isdigit() and len(k) >= sl._MIN_TOKEN_LEN
                and k not in sl._STOPWORDS):
            keys.add(k)
    cover = set(keys)
    for k in keys:
        cover |= sl._plural_variants(k)
    return keys, cover


def _image_sung(effective_name, lyric_keys, lyric_cover):
    """True if any token of ``effective_name`` is sung (plural-folded, both
    directions) — mirrors shotlist._tok_match."""
    for t in sl.filename_tokens(effective_name):
        if t in lyric_cover:
            return True
        if sl._plural_variants(t) & lyric_keys:
            return True
    return False


def plan_images(images, lyrics, alias_map, mode):
    """Decide which source images go into the video, and under what name.

    Returns ``(pairs, excluded, note)`` where ``pairs`` = ``[(src_path,
    dest_name), ...]`` (dest_name is the alias when one applies), ``excluded`` =
    the basenames dropped, and ``note`` = an optional loud message.

    Rules (FIX 3): *-coloring.* are ALWAYS excluded from video projects. In
    ``lyrics`` mode only images whose (aliased) name shares a token with the
    song's sung content words are kept; if that leaves < 4, fall back to ALL
    non-coloring images (loud note). ``all`` mode keeps every non-coloring image.
    FIX 3b: the alias name (if any) is what gets copied AND what the lyric filter
    tokenizes; an alias that would collide with another project filename is
    skipped (loud warn) and the original name is used.
    """
    lyric_keys, lyric_cover = _lyric_cover(lyrics)
    originals = {os.path.basename(p) for p in images}

    # Resolve effective (alias-or-original) dest names, guarding collisions.
    claimed = set()
    eff = []  # (src, dest_name)
    for src in images:
        base = os.path.basename(src)
        dest = base
        alias = alias_map.get(base)
        if alias and alias != base:
            # Collision = the alias name already belongs to another source file,
            # or was already claimed by an earlier alias in this project.
            others = originals - {base}
            if alias in others or alias in claimed:
                _log("  WARN alias %r -> %r collides with an existing project "
                     "filename — skipping alias, using %r" % (base, alias, base))
            else:
                dest = alias
        if dest in claimed:
            # Defensive: two originals with the same basename (shouldn't happen).
            _log("  WARN duplicate project filename %r — keeping first" % dest)
            continue
        claimed.add(dest)
        eff.append((src, dest))

    # Drop coloring pages unconditionally.
    non_coloring = [(s, d) for (s, d) in eff if not _is_coloring(d)]
    coloring_excluded = [os.path.basename(s) for (s, d) in eff if _is_coloring(d)]

    note = None
    if mode == "all":
        kept = non_coloring
    else:  # lyrics
        kept = [(s, d) for (s, d) in non_coloring
                if _image_sung(d, lyric_keys, lyric_cover)]
        if len(kept) < 4:
            note = ("lyric filter kept only %d image(s) (< 4) — falling back to "
                    "ALL %d non-coloring images" % (len(kept), len(non_coloring)))
            kept = non_coloring

    kept_dests = {d for (_s, d) in kept}
    excluded = sorted(
        coloring_excluded
        + [d for (_s, d) in non_coloring if d not in kept_dests])
    return kept, excluded, note


# ---------------------------------------------------------------------------
# Project folder + job submission
# ---------------------------------------------------------------------------

def _clear_dir(d):
    """Remove regular files under d (keep the dir). Used to refresh audio/images."""
    if not os.path.isdir(d):
        return
    for name in os.listdir(d):
        full = os.path.join(d, name)
        try:
            if os.path.isfile(full) or os.path.islink(full):
                os.remove(full)
        except OSError:
            pass


def build_project(slug, mp3_path, image_pairs, lyrics):
    """Create/refresh ``_projects/<slug>/{audio,images,subs}`` + lyrics.txt.

    ``image_pairs`` = ``[(src_path, dest_name), ...]`` — each source image is
    copied into the project under ``dest_name`` (the FIX 3b alias when one
    applies, else its original basename).

    Returns ``(audio_dest, images_dir)`` — both absolute, under $HOME."""
    pdir = os.path.join(PROJECTS_ROOT, slug)
    audio_dir = os.path.join(pdir, "audio")
    images_dir = os.path.join(pdir, "images")
    subs_dir = os.path.join(pdir, "subs")
    for d in (audio_dir, images_dir, subs_dir):
        os.makedirs(d, exist_ok=True)

    # Refresh audio + images so a re-run never mixes in stale assets.
    _clear_dir(audio_dir)
    _clear_dir(images_dir)

    audio_dest = os.path.join(audio_dir, os.path.basename(mp3_path))
    shutil.copy2(mp3_path, audio_dest)
    for src, dest_name in image_pairs:
        shutil.copy2(src, os.path.join(images_dir, dest_name))

    if lyrics:
        try:
            with open(os.path.join(pdir, "lyrics.txt"), "w",
                      encoding="utf-8") as fh:
                fh.write(lyrics)
        except OSError as e:
            _log("    WARN could not write lyrics.txt: %s" % e)
    return audio_dest, images_dir


def job_payload(audio_dest, images_dir, lyrics, theme, pulse, schedule="auto"):
    """The exact ``POST /api/jobs`` body — mirrors the dashboard's submitRender."""
    return {
        "audio_path": audio_dest,
        "images_dir": images_dir,
        "lyrics_text": lyrics or None,
        "theme": theme,
        "engine": "slideshow",
        "cut_every": DEFAULT_CUT_EVERY,
        "pulse": pulse,
        "schedule": schedule,
    }


def post_job(daemon, payload):
    """POST a render job. Returns (job_id|None, message)."""
    url = daemon.rstrip("/") + "/api/jobs"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body.get("job_id"), "submitted"
    except urllib.error.HTTPError as e:
        try:
            emsg = json.loads(e.read().decode("utf-8")).get("error", str(e))
        except Exception:  # noqa: BLE001
            emsg = str(e)
        if e.code == 409:
            return None, "already running (%s)" % emsg
        return None, "daemon %d: %s" % (e.code, emsg)
    except urllib.error.URLError as e:
        return None, "daemon unreachable: %s" % e.reason
    except Exception as e:  # noqa: BLE001
        return None, "post failed: %s" % e


def wait_for_job(daemon, job_id, timeout=1800, interval=3.0):
    """Poll a job to a terminal state. Returns ``(status, out_path|None)``."""
    url = daemon.rstrip("/") + "/api/jobs/" + job_id
    deadline = time.time() + timeout
    last = None
    out_path = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                job = json.loads(resp.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            _log("    (poll error: %s)" % e)
            time.sleep(interval)
            continue
        status = job.get("status")
        out_path = job.get("out_path") or out_path
        prog = job.get("progress", 0)
        line = "%s %.0f%%" % (status, prog)
        if line != last:
            _log("    … %s" % line)
            last = line
        if status in ("done", "failed", "cancelled"):
            return status, out_path
        time.sleep(interval)
    return "timeout", out_path


def report_accuracy_line(out_path):
    """Read the shot_report.json beside a finished render and return a one-line
    accuracy summary, or None if no report is present. Loudly flags any
    multi-token image whose full phrase IS sung yet never appeared on screen."""
    if not out_path:
        return None
    rpath = os.path.join(os.path.dirname(out_path), "shot_report.json")
    if not os.path.isfile(rpath):
        return None
    try:
        with open(rpath, encoding="utf-8") as fh:
            rep = json.load(fh)
    except (OSError, ValueError):
        return None
    s = rep.get("summary", {})
    missed = s.get("unused_multi_token_phrase_present", []) or []
    line = ("accuracy: %d/%d images matched · %d anchored · coverage %.0f%%"
            % (s.get("images_matched", 0), s.get("images_total", 0),
               s.get("anchored_shots", 0), s.get("coverage_pct", 0.0)))
    if missed:
        line += ("\n    ⚠️  UNUSED but their phrase IS in the lyrics (matcher "
                 "miss): %s" % ", ".join(missed))
    return line


# ---------------------------------------------------------------------------
# Per-song processing
# ---------------------------------------------------------------------------

def process_song(week, song, wk_dir, theme, pulse, dry_run, daemon, wait,
                 alias_map=None, images_filter="lyrics", schedule="auto"):
    """Plan + (unless dry-run) submit one song. Returns a result dict."""
    role = (song.get("role") or "song").strip()
    title = song.get("title") or ""
    lyrics = song.get("lyrics") or ""
    n_roles = song.get("_n_roles", 1)
    alias_map = alias_map or {}
    slug = "w%02d-%s" % (week, role)
    label = "W%02d %s (%s)" % (week, title, role)

    # Picked mp3s live directly in the Week NN folder (no songs/ subdir);
    # find_song_mp3's .mp3 filter excludes the folder's non-audio files.
    songs_dir = wk_dir
    images_dir_src = os.path.join(wk_dir, "images")

    mp3, why = find_song_mp3(songs_dir, role, title, n_roles)
    images = list_images(images_dir_src)

    problems = []
    if mp3 is None:
        problems.append("mp3: %s" % why)
    if not images:
        problems.append("images: none found in %s" % images_dir_src)

    if problems:
        _log("  SKIP %s — %s" % (label, "; ".join(problems)))
        return {"label": label, "slug": slug, "status": "skipped",
                "reason": "; ".join(problems)}

    # FIX 3 / 3b: per-song image selection (lyric filter + coloring drop) under
    # alias names — so the video only carries images this song actually sings.
    image_pairs, excluded, note = plan_images(
        images, lyrics, alias_map, images_filter)

    _log("  %s" % label)
    _log("    mp3    : %s" % os.path.basename(mp3))
    _log("    images : %d found -> %d kept (%s), %d excluded"
         % (len(images), len(image_pairs), images_filter, len(excluded)))
    aliased = [(os.path.basename(s), d) for (s, d) in image_pairs
               if d != os.path.basename(s)]
    if aliased:
        _log("    aliased: %s"
             % ", ".join("%s->%s" % (o, a) for (o, a) in aliased))
    if excluded:
        _log("    excluded: %s" % ", ".join(excluded))
    if note:
        _log("    ⚠️  %s" % note)
    _log("    lyrics : %d chars" % len(lyrics))
    _log("    project: %s" % os.path.join(PROJECTS_ROOT, slug))

    if not image_pairs:
        _log("  SKIP %s — no usable images after filtering" % label)
        return {"label": label, "slug": slug, "status": "skipped",
                "reason": "no usable images after filtering"}

    if dry_run:
        # Plan-only: show the exact payload without touching the filesystem.
        preview_audio = os.path.join(PROJECTS_ROOT, slug, "audio",
                                     os.path.basename(mp3))
        preview_images = os.path.join(PROJECTS_ROOT, slug, "images")
        payload = job_payload(preview_audio, preview_images, lyrics, theme,
                              pulse, schedule)
        pj = dict(payload)
        pj["lyrics_text"] = "<%d chars>" % len(lyrics) if lyrics else None
        _log("    PAYLOAD: %s" % json.dumps(pj))
        return {"label": label, "slug": slug, "status": "planned"}

    try:
        audio_dest, images_dest = build_project(slug, mp3, image_pairs, lyrics)
    except OSError as e:
        _log("    FAIL building project: %s" % e)
        return {"label": label, "slug": slug, "status": "failed",
                "reason": "project build: %s" % e}

    payload = job_payload(audio_dest, images_dest, lyrics, theme, pulse,
                          schedule)
    job_id, msg = post_job(daemon, payload)
    if job_id is None:
        _log("    -> %s" % msg)
        # 'already running' is not a hard failure of the sweep.
        status = "skipped" if msg.startswith("already running") else "failed"
        return {"label": label, "slug": slug, "status": status, "reason": msg}

    _log("    -> job %s submitted" % job_id)
    result = {"label": label, "slug": slug, "status": "submitted",
              "job_id": job_id}
    if wait:
        final, out_path = wait_for_job(daemon, job_id)
        _log("    -> %s: %s" % (job_id, final))
        result["final"] = final
        if final == "done":
            acc = report_accuracy_line(out_path)
            if acc:
                _log("    %s" % acc)
                result["accuracy"] = acc
        if final not in ("done",):
            result["status"] = "failed" if final in ("failed", "timeout") \
                else result["status"]
    return result


def process_week(week, song_filter, theme, pulse, dry_run, daemon, wait,
                 images_filter="lyrics", schedule="auto"):
    spec, err = load_spec(week)
    if spec is None:
        _log("Week %02d: %s" % (week, err))
        return [{"label": "W%02d" % week, "status": "skipped", "reason": err}]

    songs = spec.get("songs") or []
    if not songs:
        _log("Week %02d: no songs in spec" % week)
        return [{"label": "W%02d" % week, "status": "skipped",
                 "reason": "no songs in spec"}]

    n_roles = len(songs)
    wk_dir = week_dir(week)
    alias_map = load_aliases(week)
    _log("Week %02d — %s  (%s)" % (week, spec.get("sound", "?"), wk_dir))
    if alias_map:
        _log("  aliases: %d for this week" % len(alias_map))
    if not os.path.isdir(wk_dir):
        _log("  (week folder not found — songs will be skipped)")

    results = []
    for song in songs:
        role = (song.get("role") or "song").strip().lower()
        if song_filter != "all" and role != song_filter:
            continue
        song["_n_roles"] = n_roles
        results.append(process_song(week, song, wk_dir, theme, pulse,
                                    dry_run, daemon, wait,
                                    alias_map=alias_map,
                                    images_filter=images_filter,
                                    schedule=schedule))
    if song_filter != "all" and not results:
        _log("  (no '%s' song in week %02d)" % (song_filter, week))
    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv=None):
    p = argparse.ArgumentParser(
        description="Queue curriculum weeks into mvgen render jobs.")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--week", type=int, help="a single week number (1-58)")
    g.add_argument("--level", type=int, choices=[1, 2, 3],
                   help="sweep a whole level (1=W1-26, 2=W27-42, 3=W43-58)")
    p.add_argument("--song", default="all", choices=["sound", "word", "all"],
                   help="which song role to render (default all)")
    p.add_argument("--theme", default="kids", choices=["kids", "montree"],
                   help="render theme (default kids)")
    p.add_argument("--pulse", default="anchor",
                   choices=["off", "anchor", "beat", "downbeat"],
                   help="beat-pulse mode (default anchor — key words only)")
    p.add_argument("--schedule", default="auto",
                   choices=["auto", "script", "anchor"],
                   help="image scheduling: 'auto' (default) uses the anchor pass "
                        "but switches to the lyric-sheet SCRIPT schedule when "
                        "anchoring is poor (stutter songs); 'script' forces it; "
                        "'anchor' forces the certified anchor path.")
    p.add_argument("--images-filter", default="lyrics",
                   choices=["lyrics", "all"],
                   help="'lyrics' (default): only images whose (aliased) name is "
                        "sung go into the video; falls back to all non-coloring "
                        "if < 4 survive. 'all': every non-coloring image. "
                        "*-coloring.* are always excluded (FIX 3).")
    p.add_argument("--dry-run", action="store_true",
                   help="print the plan (assets found, missing flagged, job "
                        "payload) without copying or submitting")
    p.add_argument("--wait", action="store_true",
                   help="poll each submitted job to completion before the next")
    p.add_argument("--daemon", default=DEFAULT_DAEMON,
                   help="mvgen daemon base URL (default %s)" % DEFAULT_DAEMON)
    args = p.parse_args(argv)

    if args.week is not None:
        if not (1 <= args.week <= 58):
            p.error("--week must be 1-58")
        weeks = [args.week]
    else:
        lo, hi = LEVEL_WEEKS[args.level]
        weeks = list(range(lo, hi + 1))

    _log("mvgen curriculum-batch — %d week(s), song=%s theme=%s pulse=%s "
         "schedule=%s images=%s%s"
         % (len(weeks), args.song, args.theme, args.pulse, args.schedule,
            args.images_filter, "  [DRY RUN]" if args.dry_run else ""))
    _log("curriculum root: %s" % CURRICULUM_ROOT)
    _log("projects root  : %s" % PROJECTS_ROOT)
    if not args.dry_run and not os.path.isdir(CURRICULUM_ROOT):
        _log("WARNING: curriculum root does not exist — every week will skip.")

    all_results = []
    for wk in weeks:
        all_results.extend(process_week(wk, args.song, args.theme, args.pulse,
                                        args.dry_run, args.daemon, args.wait,
                                        images_filter=args.images_filter,
                                        schedule=args.schedule))

    # summary
    def _count(st):
        return sum(1 for r in all_results if r.get("status") == st)

    submitted, planned = _count("submitted"), _count("planned")
    skipped, failed = _count("skipped"), _count("failed")
    _log("")
    _log("=== summary: %d submitted · %d planned · %d skipped · %d failed ==="
         % (submitted, planned, skipped, failed))
    for r in all_results:
        if r.get("status") in ("skipped", "failed"):
            _log("  %-8s %-28s %s"
                 % (r["status"].upper(), r.get("label", "?"),
                    r.get("reason", "")))
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        _log("interrupted")
        sys.exit(130)
