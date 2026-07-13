#!/usr/bin/env python3
"""mvgen daemon — the local render engine for the MV Studio dashboard.

Runs on the Mac, binds 127.0.0.1:8787 ONLY. The Whale admin page
(montree.xyz/admin/mvgen, Chrome) talks to it directly: loopback is a
"potentially trustworthy" origin so Chrome allows the HTTPS→localhost call once
we answer its Private Network Access preflight + normal CORS. A Railway-side
proxy is impossible (its localhost ≠ this Mac) — this daemon IS the bridge.

Stdlib only (http.server, threading, subprocess) — no FastAPI, no new deps.

Security:
  * bind 127.0.0.1 only
  * CORS allow-list (montree.xyz, www, localhost:3000) — disallowed origins get
    NO Access-Control-Allow-Origin header
  * filesystem jails: browse → $HOME; media/delete/library → ~/Desktop/Music Videos
  * renders run as a subprocess (start_new_session=True) so cancel kills the
    whole process group, ffmpeg included

Start:  cd ~/Desktop/Master\\ Brain/ACTIVE/montree && python3 scripts/mvgen/server.py
"""

import json
import os
import queue
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, unquote

HERE = os.path.dirname(os.path.abspath(__file__))
MVGEN_PY = os.path.join(HERE, "mvgen.py")
VERSION = "2.0.0"

HOME = os.path.realpath(os.path.expanduser("~"))
MUSIC_ROOT = os.path.realpath(os.path.expanduser("~/Desktop/Music Videos"))
# Projects live UNDER the music root so rendered project songs still stream via
# the existing media jail; uploads are jailed to this projects root.
PROJECTS_ROOT = os.path.realpath(os.path.join(MUSIC_ROOT, "_projects"))
DEFAULT_BROWSE = os.path.expanduser("~/Desktop")
DEFAULT_MODEL = os.environ.get("MVGEN_MODEL", "base")

ALLOWED_ORIGINS = {
    "https://montree.xyz",
    "https://www.montree.xyz",
    "http://localhost:3000",
}

AUDIO_EXTS = (".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg")
# MUST match engine_slideshow.IMAGE_EXTS — the render engine does not read .gif,
# so counting one here would show "N img" in the picker and then fail the render
# with "no images found". Keep the two lists in lockstep.
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".bmp")
SUBS_EXTS = (".srt", ".vtt", ".json", ".txt")

# Per-kind upload rules (contract V2 §B). Extensions the render/analysis stack
# can actually consume; caps sized to real assets. These are the ONLY writable
# extensions — the raw-body upload endpoint enforces both.
UPLOAD_KINDS = {
    "audio": {"dir": "audio", "exts": (".mp3", ".wav", ".m4a", ".flac"),
              "cap": 200 * 1024 * 1024},
    "image": {"dir": "images", "exts": IMAGE_EXTS, "cap": 30 * 1024 * 1024},
    "subs": {"dir": "subs", "exts": SUBS_EXTS, "cap": 10 * 1024 * 1024},
}

HOST, PORT = "127.0.0.1", 8787

# Shot Planner MJ prompt templates (contract V2 §D). String templates only —
# no AI at plan time; the operator IS the image-generation API.
_MJ_TEMPLATES = {
    "kids": ("a %s, simple bright flat illustration for young children, thick "
             "outlines, friendly, plain white background --ar 16:9"),
    "montree": ("a %s, elegant minimal illustration, deep forest green "
                "background #0a1a0f, gold accents, storybook style --ar 16:9"),
}

# --- job store (in-memory, this-session only) ---------------------------------
_JOBS = OrderedDict()          # job_id -> job dict
_JOBS_LOCK = threading.Lock()
_JOB_QUEUE = queue.Queue()
_MAX_LOG_LINES = 200
_MAX_BODY = 1024 * 1024        # W5: cap request bodies at 1 MB -> 413 on exceed


class _BodyTooLarge(Exception):
    """Raised by _read_body when Content-Length exceeds _MAX_BODY."""


def _log(msg):
    print("[mvgen-daemon] %s" % msg, file=sys.stderr, flush=True)


# ---------------------------------------------------------------------------
# Filesystem helpers (jailing)
# ---------------------------------------------------------------------------

def _within(path, root):
    """True if realpath(path) is root or lives under it."""
    rp = os.path.realpath(os.path.expanduser(path))
    rt = os.path.realpath(root)
    return rp == rt or rp.startswith(rt + os.sep)


def _slug(name):
    return os.path.splitext(os.path.basename(name))[0].strip()


def _count_images(d):
    try:
        n = 0
        for name in os.listdir(d):
            if os.path.splitext(name)[1].lower() in IMAGE_EXTS:
                n += 1
        return n
    except OSError:
        return 0


def _safe_unlink(path):
    try:
        os.remove(path)
    except OSError:
        pass


def _next_image_num(images_dir):
    """Highest leading NN prefix among existing images + 1 (else 1). Used to
    suggest the next free ``NN-word.png`` filename for missing artwork."""
    mx = 0
    if images_dir and os.path.isdir(images_dir):
        try:
            for nm in os.listdir(images_dir):
                m = re.match(r"^\s*(\d+)", nm)
                if m:
                    mx = max(mx, int(m.group(1)))
        except OSError:
            pass
    return mx + 1


def _project_slug(name):
    """Filesystem-safe project slug: keep [A-Za-z0-9._-], collapse the rest to
    '-', trim leading/trailing separators. Empty result -> ''."""
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", (name or "").strip())
    return slug.strip("-._")


def _list_files(d, exts):
    out = []
    try:
        for name in sorted(os.listdir(d)):
            if name.startswith("."):
                continue
            full = os.path.join(d, name)
            if os.path.isfile(full) and \
                    os.path.splitext(name)[1].lower() in exts:
                try:
                    out.append({"name": name, "path": full,
                                "size": os.path.getsize(full)})
                except OSError:
                    pass
    except OSError:
        pass
    return out


def _project_dict(slug):
    """Describe one project (its audio/images/subs contents), or None if the
    slug does not resolve to a directory under the projects root."""
    pdir = os.path.realpath(os.path.join(PROJECTS_ROOT, slug))
    if not _within(pdir, PROJECTS_ROOT) or not os.path.isdir(pdir):
        return None
    images_dir = os.path.join(pdir, "images")
    return {
        "name": slug,
        "slug": slug,
        "dir": pdir,
        "images_dir": images_dir,
        "audio": _list_files(os.path.join(pdir, "audio"), AUDIO_EXTS),
        "images": _list_files(images_dir, IMAGE_EXTS),
        "subs": _list_files(os.path.join(pdir, "subs"), SUBS_EXTS),
        "image_count": _count_images(images_dir),
    }


# ---------------------------------------------------------------------------
# Job runner (single worker)
# ---------------------------------------------------------------------------

def _public_job(job, with_log=False):
    out = {
        "job_id": job["job_id"],
        "song": job["song"],
        "status": job["status"],
        "progress": job["progress"],
        "stage": job["stage"],
        "mode": job.get("mode", "render"),
        "created_at": job["created_at"],
        "out_path": job.get("out_path"),
        "error": job.get("error"),
    }
    if with_log:
        # CRIT-2: log_tail is a STRING (contract + page.tsx type it as string).
        out["log_tail"] = "\n".join(list(job["log_tail"])[-40:])
    return out


def _set(job, **kw):
    with _JOBS_LOCK:
        job.update(kw)


def _read_progress(progress_file):
    """Return (stage, progress) from the last valid JSON line, or None."""
    try:
        with open(progress_file, "r", encoding="utf-8") as fh:
            lines = fh.readlines()
    except OSError:
        return None
    for raw in reversed(lines):
        raw = raw.strip()
        if not raw:
            continue
        try:
            obj = json.loads(raw)
            return obj.get("stage"), float(obj.get("progress", 0))
        except (ValueError, TypeError):
            continue
    return None


# Maps the progress-file `stage` -> job status WHILE the subprocess is running.
# mvgen.py emits stage="done" when its own pipeline finishes writing, but the
# daemon only marks the JOB "done" after the process exits 0 AND the mp4 exists
# (see _run_job's tail). So a "done" stage stays "rendering" here — the UI must
# never flash success before the file is actually on disk.
_STAGE_STATUS = {"analyzing": "analyzing", "rendering": "rendering",
                 "done": "rendering"}


def _run_job(job):
    song = job["song"]
    out_dir = os.path.join(MUSIC_ROOT, song)
    try:
        os.makedirs(out_dir, exist_ok=True)
    except OSError as e:
        _set(job, status="failed", error="cannot create output dir: %s" % e)
        return
    out_path = os.path.join(out_dir, song + ".mp4")
    timeline_path = os.path.join(out_dir, "timeline.json")
    progress_file = os.path.join(out_dir, "progress.jsonl")
    try:
        open(progress_file, "w").close()
    except OSError:
        pass

    mode = job.get("mode", "render")
    cmd = [sys.executable, MVGEN_PY,
           "--audio", job["audio_path"],
           "--model", job["model"],
           "--out", out_path,
           "--progress-file", progress_file]
    if mode == "analyze":
        # Analyze-only: compute + cache the timeline for the Shot Planner, no
        # render. Images are optional here (the plan lists what's missing).
        cmd += ["--analyze-only"]
        if job.get("images_dir"):
            cmd += ["--images", job["images_dir"]]
    else:
        cmd += ["--images", job["images_dir"],
                "--theme", job["theme"],
                "--engine", "slideshow",
                "--cut-every", str(job["cut_every"]),
                "--seed", str(job["seed"]),
                "--pulse", job.get("pulse", "anchor")]
    if job.get("lyrics_text"):
        lyrics_path = os.path.join(out_dir, "lyrics.txt")
        try:
            with open(lyrics_path, "w", encoding="utf-8") as fh:
                fh.write(job["lyrics_text"])
            cmd += ["--lyrics", lyrics_path]
        except OSError as e:
            _log("could not write lyrics.txt (%s) — proceeding without" % e)
    if job.get("subs_path"):
        cmd += ["--subs", job["subs_path"]]

    _set(job, status="analyzing", stage="analyzing", progress=0.0,
         out_path=(None if mode == "analyze" else out_path))
    _log("job %s: %s" % (job["job_id"], " ".join(cmd)))

    try:
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            start_new_session=True, text=True, bufsize=1)
    except Exception as e:  # noqa: BLE001
        _set(job, status="failed", error="failed to launch render: %s" % e)
        return
    _set(job, _proc=proc)  # W3: touch _proc under _JOBS_LOCK

    def drain():
        for line in proc.stdout:
            with _JOBS_LOCK:
                job["log_tail"].append(line.rstrip("\n"))
                if len(job["log_tail"]) > _MAX_LOG_LINES:
                    del job["log_tail"][:-_MAX_LOG_LINES]

    t = threading.Thread(target=drain, daemon=True)
    t.start()

    while proc.poll() is None:
        pr = _read_progress(progress_file)
        if pr:
            stage, progress = pr
            if mode == "analyze":
                # Analyze jobs never render. mvgen emits stage="done" just before
                # exit, which _STAGE_STATUS maps to "rendering" -> the UI would
                # flash "🎬 Rendering". Pin every non-terminal stage to
                # "analyzing" (the JOB is marked done after the process exits).
                mapped = "analyzing"
            else:
                mapped = _STAGE_STATUS.get(stage, job["status"])
            _set(job, stage=stage or job["stage"],
                 progress=round(progress, 1),
                 status=mapped)
        time.sleep(0.3)
    rc = proc.returncode
    t.join(timeout=2)

    with _JOBS_LOCK:  # W3: read _cancelled under the lock
        was_cancelled = job.get("_cancelled")
    if was_cancelled:
        _set(job, status="cancelled", stage="cancelled",
             error="cancelled by user")
        _log("job %s cancelled" % job["job_id"])
        return
    ok_target = timeline_path if mode == "analyze" else out_path
    if rc == 0 and os.path.exists(ok_target):
        _set(job, status="done", stage="done", progress=100.0,
             out_path=(timeline_path if mode == "analyze" else out_path))
        _log("job %s done -> %s" % (job["job_id"], ok_target))
    else:
        with _JOBS_LOCK:
            tail = "\n".join(job["log_tail"][-12:])
        _set(job, status="failed", stage="failed",
             error=tail or ("render exited %s" % rc))
        _log("job %s failed (exit %s)" % (job["job_id"], rc))


def _worker():
    while True:
        job_id = _JOB_QUEUE.get()
        with _JOBS_LOCK:  # W3: read job + _cancelled under one lock
            job = _JOBS.get(job_id)
            cancelled = job.get("_cancelled") if job else False
        if job is None:
            _JOB_QUEUE.task_done()
            continue
        if cancelled:
            _set(job, status="cancelled", stage="cancelled")
            _JOB_QUEUE.task_done()
            continue
        try:
            _run_job(job)
        except Exception as e:  # noqa: BLE001
            _set(job, status="failed", error="worker error: %s" % e)
        finally:
            _JOB_QUEUE.task_done()


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    server_version = "mvgen/" + VERSION
    protocol_version = "HTTP/1.1"

    # ---- low-level response helpers ----
    def _cors(self):
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _err(self, code, msg):
        self._json(code, {"error": msg})

    def log_message(self, fmt, *args):  # quieter default logging
        pass

    # ---- preflight ----
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        # X-Filename carries the upload filename on the raw-body upload endpoint.
        self.send_header("Access-Control-Allow-Headers", "Content-Type, "
                         "X-Filename")
        if self.headers.get("Access-Control-Request-Private-Network") == "true":
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Content-Length", "0")
        self.end_headers()

    # ---- GET ----
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        qs = parse_qs(parsed.query)
        try:
            if path == "/api/health":
                return self._health()
            if path == "/api/browse":
                return self._browse(qs)
            if path == "/api/jobs":
                return self._jobs_list()
            m = re.match(r"^/api/jobs/([^/]+)$", path)
            if m:
                return self._job_get(m.group(1))
            if path == "/api/library":
                return self._library()
            if path == "/api/media":
                return self._media(qs)
            if path == "/api/lyrics":
                return self._lyrics(qs)
            if path == "/api/projects":
                return self._projects_list()
            if path == "/api/plan":
                return self._plan(qs)
            return self._err(404, "not found: %s" % path)
        except Exception as e:  # noqa: BLE001
            return self._err(500, "%s" % e)

    # ---- POST ----
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        qs = parse_qs(parsed.query)
        try:
            # Upload streams a RAW body (not JSON) and is EXEMPT from the 1 MB
            # JSON cap — it enforces its own per-kind caps. Route it BEFORE
            # _read_body so we never buffer a 200 MB audio file into memory.
            if path == "/api/upload":
                return self._upload(qs)
            try:
                body = self._read_body()
            except _BodyTooLarge:
                self.close_connection = True
                return self._err(413, "request body too large (max 1 MB)")
            if path == "/api/jobs":
                return self._jobs_create(body)
            m = re.match(r"^/api/jobs/([^/]+)/cancel$", path)
            if m:
                return self._job_cancel(m.group(1))
            if path == "/api/library/delete":
                return self._library_delete(body)
            if path == "/api/projects":
                return self._projects_create(body)
            return self._err(404, "not found: %s" % path)
        except Exception as e:  # noqa: BLE001
            return self._err(500, "%s" % e)

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        if length > _MAX_BODY:
            raise _BodyTooLarge()
        raw = self.rfile.read(length)
        if not raw:
            return {}
        try:
            return json.loads(raw.decode("utf-8"))
        except ValueError:
            return {}

    # ---- endpoint impls ----
    def _health(self):
        return self._json(200, {
            "ok": True,
            "version": VERSION,
            "ffmpeg": shutil.which("ffmpeg") is not None,
            "default_model": DEFAULT_MODEL,
        })

    def _browse(self, qs):
        raw = (qs.get("path") or [DEFAULT_BROWSE])[0]
        kind = (qs.get("kind") or ["images"])[0]
        path = os.path.realpath(os.path.expanduser(raw))
        if not _within(path, HOME):
            return self._err(403, "path outside home is not browsable")
        if not os.path.isdir(path):
            return self._err(404, "not a directory: %s" % path)
        dirs, files = [], []
        try:
            names = sorted(os.listdir(path))
        except OSError as e:
            return self._err(403, "cannot list: %s" % e)
        for name in names:
            if name.startswith("."):
                continue
            full = os.path.join(path, name)
            if os.path.isdir(full):
                d = {"name": name, "path": full}
                if kind == "images":
                    d["image_count"] = _count_images(full)
                dirs.append(d)
            elif os.path.isfile(full):
                ext = os.path.splitext(name)[1].lower()
                want = (kind == "audio" and ext in AUDIO_EXTS) or \
                       (kind == "images" and ext in IMAGE_EXTS)
                if want:
                    try:
                        files.append({"name": name, "path": full,
                                      "size": os.path.getsize(full)})
                    except OSError:
                        pass
        parent = os.path.dirname(path)
        if path == HOME or not _within(parent, HOME):
            parent = None
        return self._json(200, {"path": path, "parent": parent,
                                "dirs": dirs, "files": files})

    def _jobs_create(self, body):
        mode = (body.get("mode") or "render").strip()
        if mode not in ("render", "analyze"):
            return self._err(400, "mode must be render|analyze")

        audio_path = (body.get("audio_path") or "").strip()
        if not audio_path:
            return self._err(400, "audio_path is required")
        audio_path = os.path.realpath(os.path.expanduser(audio_path))
        if not _within(audio_path, HOME):
            return self._err(403, "inputs must live under your home directory")
        if not os.path.isfile(audio_path):
            return self._err(404, "audio not found: %s" % audio_path)

        # images_dir: required for render, optional for analyze.
        images_dir = (body.get("images_dir") or "").strip()
        if images_dir:
            images_dir = os.path.realpath(os.path.expanduser(images_dir))
            if not _within(images_dir, HOME):
                return self._err(403, "inputs must live under your home dir")
            if not os.path.isdir(images_dir):
                return self._err(404, "images dir not found: %s" % images_dir)
        elif mode == "render":
            return self._err(400, "images_dir is required for a render job")
        else:
            images_dir = None

        # optional subtitle timing source
        subs_path = (body.get("subs_path") or "").strip()
        if subs_path:
            subs_path = os.path.realpath(os.path.expanduser(subs_path))
            if not _within(subs_path, HOME):
                return self._err(403, "subs must live under your home directory")
            if not os.path.isfile(subs_path):
                return self._err(404, "subs file not found: %s" % subs_path)
        else:
            subs_path = None

        theme = body.get("theme") or "kids"
        if theme not in ("kids", "montree"):
            return self._err(400, "theme must be kids|montree")
        cut_every = body.get("cut_every", 2)
        if cut_every not in (1, 2, 4):
            return self._err(400, "cut_every must be 1, 2 or 4")
        pulse = body.get("pulse") or "anchor"
        if pulse not in ("off", "anchor", "beat", "downbeat"):
            return self._err(400, "pulse must be off|anchor|beat|downbeat")
        try:  # NIT: garbage seed -> 400, not a 500
            seed = int(body.get("seed", 42))
        except (TypeError, ValueError):
            return self._err(400, "seed must be an integer")
        model = (body.get("model") or DEFAULT_MODEL).strip() or DEFAULT_MODEL
        lyrics_text = body.get("lyrics_text") or None

        song = _slug(audio_path)
        if not song:
            return self._err(400, "could not derive a song name from the audio")

        job_id = uuid.uuid4().hex[:12]
        job = {
            "job_id": job_id, "song": song, "status": "queued",
            "progress": 0.0, "stage": "queued", "mode": mode,
            "created_at": time.time(),
            "audio_path": audio_path, "images_dir": images_dir,
            "subs_path": subs_path, "pulse": pulse,
            "theme": theme, "cut_every": cut_every, "seed": seed,
            "model": model, "lyrics_text": lyrics_text,
            "out_path": None, "error": None, "log_tail": [],
            "_proc": None, "_cancelled": False,
        }
        # W4: same-song dedup check + insert are ATOMIC (one lock acquisition),
        # else two near-simultaneous requests could both pass a separate check.
        with _JOBS_LOCK:
            active = any(
                j["song"] == song and j["status"] in (
                    "queued", "analyzing", "rendering")
                for j in _JOBS.values())
            if not active:
                _JOBS[job_id] = job
        if active:
            return self._err(409, "a job for '%s' is already running" % song)
        _JOB_QUEUE.put(job_id)
        return self._json(202, {"job_id": job_id})

    def _jobs_list(self):
        with _JOBS_LOCK:
            jobs = [_public_job(j) for j in _JOBS.values()]
        jobs.sort(key=lambda j: j["created_at"], reverse=True)
        return self._json(200, {"jobs": jobs})

    def _job_get(self, job_id):
        with _JOBS_LOCK:
            job = _JOBS.get(job_id)
            pub = _public_job(job, with_log=True) if job else None
        if pub is None:
            return self._err(404, "no such job")
        return self._json(200, pub)

    def _job_cancel(self, job_id):
        # W3: read status, set _cancelled, and grab _proc under one lock; do the
        # (potentially slow) poll/killpg + response OUTSIDE the lock.
        terminal, status, proc = False, None, None
        with _JOBS_LOCK:
            job = _JOBS.get(job_id)
            if job is not None:
                status = job["status"]
                terminal = status in ("done", "failed", "cancelled")
                if not terminal:
                    job["_cancelled"] = True
                proc = job.get("_proc")
        if job is None:
            return self._err(404, "no such job")
        if terminal:
            return self._json(200, {"ok": True, "status": status})
        if proc and proc.poll() is None:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except (ProcessLookupError, PermissionError):
                pass
        else:
            _set(job, status="cancelled", stage="cancelled")
        return self._json(200, {"ok": True, "status": "cancelling"})

    def _library(self):
        videos = []
        if os.path.isdir(MUSIC_ROOT):
            for song in sorted(os.listdir(MUSIC_ROOT)):
                sdir = os.path.join(MUSIC_ROOT, song)
                if not os.path.isdir(sdir):
                    continue
                has_lyrics = os.path.isfile(os.path.join(sdir, "lyrics.txt"))
                for name in sorted(os.listdir(sdir)):
                    if not name.lower().endswith(".mp4"):
                        continue
                    full = os.path.join(sdir, name)
                    try:
                        st = os.stat(full)
                    except OSError:
                        continue
                    videos.append({
                        "name": name, "path": full, "size": st.st_size,
                        "mtime": st.st_mtime, "song": song,
                        "has_lyrics": has_lyrics,
                    })
        videos.sort(key=lambda v: v["mtime"], reverse=True)
        return self._json(200, {"videos": videos})

    def _lyrics(self, qs):
        raw = (qs.get("audio_path") or [""])[0]
        if not raw:
            return self._json(200, {"lyrics_text": None})
        song = _slug(raw)
        lyrics_path = os.path.join(MUSIC_ROOT, song, "lyrics.txt")
        if _within(lyrics_path, MUSIC_ROOT) and os.path.isfile(lyrics_path):
            try:
                with open(lyrics_path, "r", encoding="utf-8") as fh:
                    return self._json(200, {"lyrics_text": fh.read()})
            except OSError:
                pass
        return self._json(200, {"lyrics_text": None})

    # ---- projects + upload (contract V2 §B) ----
    def _projects_list(self):
        projects = []
        if os.path.isdir(PROJECTS_ROOT):
            for name in sorted(os.listdir(PROJECTS_ROOT)):
                if name.startswith("."):
                    continue
                if os.path.isdir(os.path.join(PROJECTS_ROOT, name)):
                    pd = _project_dict(name)
                    if pd:
                        projects.append(pd)
        return self._json(200, {"projects": projects})

    def _projects_create(self, body):
        slug = _project_slug(body.get("name") or "")
        if not slug:
            return self._err(400, "a valid project name is required")
        pdir = os.path.realpath(os.path.join(PROJECTS_ROOT, slug))
        if not _within(pdir, PROJECTS_ROOT):
            return self._err(403, "invalid project name")
        if os.path.isdir(pdir):
            return self._err(409, "project already exists: %s" % slug)
        try:
            for sub in ("audio", "images", "subs"):
                os.makedirs(os.path.join(pdir, sub), exist_ok=True)
        except OSError as e:
            return self._err(500, "could not create project: %s" % e)
        return self._json(201, {"project": _project_dict(slug)})

    @staticmethod
    def _unique_path(dest_dir, fname):
        """Collision-suffix a filename (foo.png -> foo-2.png -> foo-3.png)."""
        base, ext = os.path.splitext(fname)
        cand = os.path.join(dest_dir, fname)
        n = 2
        while os.path.exists(cand):
            cand = os.path.join(dest_dir, "%s-%d%s" % (base, n, ext))
            n += 1
        return cand

    def _upload(self, qs):
        """Streaming raw-body upload into a project's audio/images/subs dir.

        RAW body (not multipart); filename via X-Filename. Per-kind extension
        allow-list + size cap; streamed to a temp file then os.replace. Any
        early rejection closes the connection (unread body would desync the
        keep-alive stream). Jailed to PROJECTS_ROOT."""
        slug = _project_slug((qs.get("project") or [""])[0])
        kind = (qs.get("kind") or [""])[0]
        rule = UPLOAD_KINDS.get(kind)
        if not slug or _project_dict(slug) is None:
            self.close_connection = True
            return self._err(404, "unknown project")
        if rule is None:
            self.close_connection = True
            return self._err(400, "kind must be audio|image|subs")
        # The UI sends encodeURIComponent(file.name): percent-DECODE before
        # basename so "my%20song.png" saves as "my song.png". Decoding first
        # also collapses %2e%2e%2f -> ../, which basename then strips (traversal
        # stays jailed; the _within() check below is the final backstop).
        raw_name = unquote((self.headers.get("X-Filename") or "").strip())
        fname = os.path.basename(raw_name)
        if not fname or fname in (".", ".."):
            self.close_connection = True
            return self._err(400, "a valid X-Filename header is required")
        ext = os.path.splitext(fname)[1].lower()
        if ext not in rule["exts"]:
            self.close_connection = True
            return self._err(415, "unsupported %s extension %r (allowed: %s)"
                             % (kind, ext, ", ".join(rule["exts"])))
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            self.close_connection = True
            return self._err(400, "empty upload (Content-Length required)")
        if length > rule["cap"]:
            self.close_connection = True
            return self._err(413, "file too large: %d bytes (max %d for %s)"
                             % (length, rule["cap"], kind))
        dest_dir = os.path.join(PROJECTS_ROOT, slug, rule["dir"])
        try:
            os.makedirs(dest_dir, exist_ok=True)
        except OSError as e:
            self.close_connection = True
            return self._err(500, "could not open project dir: %s" % e)
        final = self._unique_path(dest_dir, fname)
        if not _within(final, PROJECTS_ROOT):
            self.close_connection = True
            return self._err(403, "upload path escapes the projects root")
        fd, tmp = tempfile.mkstemp(dir=dest_dir, prefix=".upload-")
        written = 0
        try:
            with os.fdopen(fd, "wb") as out:
                remaining = length
                while remaining > 0:
                    chunk = self.rfile.read(min(65536, remaining))
                    if not chunk:
                        break
                    out.write(chunk)
                    written += len(chunk)
                    remaining -= len(chunk)
                    if written > rule["cap"]:
                        raise _BodyTooLarge()
        except _BodyTooLarge:
            _safe_unlink(tmp)
            self.close_connection = True
            return self._err(413, "file exceeded the %s cap" % kind)
        except (BrokenPipeError, ConnectionResetError, OSError) as e:
            _safe_unlink(tmp)
            self.close_connection = True
            return self._err(500, "upload write failed: %s" % e)
        try:
            os.replace(tmp, final)
        except OSError as e:
            _safe_unlink(tmp)
            return self._err(500, "could not save upload: %s" % e)
        return self._json(201, {"saved": {
            "name": os.path.basename(final), "path": final, "size": written}})

    # ---- shot planner (contract V2 §D) ----
    def _plan(self, qs):
        raw_audio = (qs.get("audio_path") or [""])[0]
        raw_images = (qs.get("images_dir") or [""])[0]
        theme = (qs.get("theme") or ["kids"])[0]
        if theme not in ("kids", "montree"):
            theme = "kids"
        if not raw_audio:
            return self._err(400, "audio_path is required")
        song = _slug(raw_audio)
        timeline_path = os.path.join(MUSIC_ROOT, song, "timeline.json")
        if not (_within(timeline_path, MUSIC_ROOT)
                and os.path.isfile(timeline_path)):
            return self._err(404, "no timeline — run an analyze job first")
        try:
            with open(timeline_path, encoding="utf-8") as fh:
                timeline = json.load(fh)
        except (OSError, ValueError) as e:
            return self._err(500, "could not read timeline: %s" % e)

        images = []
        images_dir = None
        if raw_images:
            images_dir = os.path.realpath(os.path.expanduser(raw_images))
            if not _within(images_dir, HOME):
                return self._err(403, "images_dir must live under your home dir")
            if os.path.isdir(images_dir):
                for nm in sorted(os.listdir(images_dir)):
                    if os.path.splitext(nm)[1].lower() in IMAGE_EXTS:
                        images.append(os.path.join(images_dir, nm))

        import shotlist as sl  # reuse the SAME keyword/stopword rules as render
        words = timeline.get("words", [])
        image_tokens = sl.build_image_tokens(images) if images else []
        # Order-aware occurrence matcher (same one the renderer uses) — anchors
        # now reflect the ACTUAL per-occurrence image, not a first-wins token map.
        clusters = (sl.find_matches(words, images, image_tokens)
                    if image_tokens else [])
        covered = sl.build_coverage_set(image_tokens)

        sections = [{"start": s.get("start"), "end": s.get("end"),
                     "label": s.get("label")}
                    for s in timeline.get("sections", [])]
        anchors = [{"word": c["trigger_word"],
                    "phrase": c.get("trigger_phrase"),
                    "time": round(float(c["trigger_time"]), 3),
                    "image": os.path.basename(images[c["image"]])}
                   for c in clusters]
        matched_imgs = {c["image"] for c in clusters}
        fillers = [os.path.basename(images[i]) for i in range(len(images))
                   if i not in matched_imgs]
        missing = self._plan_missing(sl, words, covered, images_dir, theme)
        return self._json(200, {"sections": sections, "anchors": anchors,
                                "missing": missing, "fillers": fillers})

    @staticmethod
    def _plan_missing(sl, words, covered, images_dir, theme):
        """Distinct sung words (>=3 chars, non-stopword) with no matching image,
        ranked by count. Filename/prompt use the normalized noun key.

        ``covered`` is the set of keyword variants ANY image can illustrate
        (coverage only — not which image plays)."""
        agg = OrderedDict()
        for w in words:
            key = sl.normalize_token(w.get("word", ""))
            if (not key or key.isdigit() or len(key) < sl._MIN_TOKEN_LEN
                    or key in sl._STOPWORDS):
                continue
            if key in covered or any(v in covered
                                     for v in sl._plural_variants(key)):
                continue  # an image already covers this word
            t = round(float(w.get("start", 0.0)), 3)
            e = agg.get(key)
            if e is None:
                agg[key] = {"word": w.get("word"), "key": key, "count": 1,
                            "first_time": t}
            else:
                e["count"] += 1
                e["first_time"] = min(e["first_time"], t)
        ranked = sorted(agg.values(),
                        key=lambda d: (-d["count"], d["first_time"]))
        next_num = _next_image_num(images_dir)
        tmpl = _MJ_TEMPLATES.get(theme, _MJ_TEMPLATES["kids"])
        out = []
        for d in ranked:
            out.append({
                "word": d["word"], "count": d["count"],
                "first_time": d["first_time"],
                "suggested_filename": "%02d-%s.png" % (next_num, d["key"]),
                "mj_prompt": tmpl % d["key"],
            })
            next_num += 1
        return out

    def _library_delete(self, body):
        raw = (body.get("path") or "").strip()
        if not raw:
            return self._err(400, "path is required")
        path = os.path.realpath(os.path.expanduser(raw))
        if not _within(path, MUSIC_ROOT):
            return self._err(403, "can only delete under ~/Desktop/Music Videos")
        if not os.path.isfile(path):
            return self._err(404, "not a file: %s" % path)
        try:
            os.remove(path)
        except OSError as e:
            return self._err(500, "delete failed: %s" % e)
        return self._json(200, {"ok": True})

    # ---- media streaming with Range ----
    def _media(self, qs):
        raw = (qs.get("path") or [""])[0]
        if not raw:
            return self._err(400, "path is required")
        path = os.path.realpath(os.path.expanduser(raw))
        if not _within(path, MUSIC_ROOT):
            return self._err(403, "media must live under ~/Desktop/Music Videos")
        if not os.path.isfile(path):
            return self._err(404, "not found")
        try:
            size = os.path.getsize(path)
        except OSError:
            return self._err(404, "not found")

        ctype = "video/mp4"
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        partial = False
        if rng and rng.startswith("bytes="):
            spec = rng[len("bytes="):].split(",")[0]
            s, _, e = spec.partition("-")
            try:
                if s.strip() == "":            # suffix range: bytes=-N
                    n = int(e)
                    start = max(0, size - n)
                    end = size - 1
                else:
                    start = int(s)
                    end = int(e) if e.strip() else size - 1
                end = min(end, size - 1)
                partial = True
            except ValueError:
                partial = False
            if partial and (start > end or start >= size):
                self.send_response(416)
                self._cors()
                self.send_header("Content-Range", "bytes */%d" % size)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return

        length = end - start + 1
        self.send_response(206 if partial else 200)
        self._cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        if partial:
            self.send_header("Content-Range",
                             "bytes %d-%d/%d" % (start, end, size))
        self.end_headers()
        try:
            with open(path, "rb") as fh:
                fh.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = fh.read(min(65536, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass  # client seeked/closed — normal for <video> scrubbing


def main():
    if not os.path.isfile(MVGEN_PY):
        _log("WARNING: mvgen.py not found at %s" % MVGEN_PY)
    worker = threading.Thread(target=_worker, daemon=True)
    worker.start()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    _log("listening on http://%s:%d (music root: %s)" % (HOST, PORT, MUSIC_ROOT))
    _log("allowed origins: %s" % ", ".join(sorted(ALLOWED_ORIGINS)))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        _log("shutting down")
        httpd.shutdown()


if __name__ == "__main__":
    main()
