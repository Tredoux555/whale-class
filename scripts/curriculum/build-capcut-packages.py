#!/usr/bin/env python3
"""
Build CapCut-ready packages for all 115 curriculum songs.

For every song (58 weeks x 1-2 songs = 115) this writes to
~/Desktop/Music Videos/_capcut_packages/wNN-role -- Title/:
  - every image for that week (flat, cloned via cp -c)
  - the picked-take mp3 (cloned + renamed to wNN-role.mp3)
  - lyrics.txt (full lyric sheet, section brackets kept)
  - wNN-role.srt (forced-alignment subtitles via stable-ts, line-level cues)

Never modifies/moves any original file -- clone/copy only.

Run with the durable align venv (has stable-ts + whisper):
  ~/mvgen-models/align-venv/bin/python \
    "scripts/curriculum/build-capcut-packages.py" 2>&1 | tee -a /tmp/capcut_packages.log

Model is loaded ONCE and reused across all 115 songs (not subprocess-per-song --
whisper 'base' alignment failures are ordinary Python exceptions, not crashes,
so a per-song try/except gives the same safety at a fraction of the runtime).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time
import traceback

SPECDIR = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/lib/montree/english-curriculum/spec"
WEEKDIR = "/Users/tredouxwillemse/Desktop/English Curriculum 2026"
OUTDIR = "/Users/tredouxwillemse/Desktop/Music Videos/_capcut_packages"
LOGFILE = "/tmp/capcut_packages.log"

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif")


def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOGFILE, "a") as f:
        f.write(line + "\n")


def norm(s):
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def strip_tag(name):
    return re.sub(r"\(\s*(word|sound)\s*\)", "", name, flags=re.I).strip()


def role_tag(name):
    m = re.search(r"\((word|sound)\)", name, flags=re.I)
    return m.group(1).lower() if m else None


def sanitize(name):
    name = name.strip()
    name = re.sub(r'[/:*?"<>|]', "", name)
    name = re.sub(r"\s+", " ", name)
    return name


def clone_copy(src, dst):
    """APFS clonefile copy (near-zero disk cost); falls back to a real copy."""
    if os.path.exists(dst):
        return
    try:
        subprocess.run(["cp", "-c", src, dst], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        shutil.copy2(src, dst)


def find_mp3(wdir, wn, role, title):
    """Match a spec song (role, title) to its picked-take mp3 on disk."""
    prefix = f"W{wn:02d} "
    mp3s = [f for f in os.listdir(wdir) if f.lower().endswith(".mp3")]
    parsed = []
    for f in mp3s:
        base = f[:-4]
        if base.startswith(prefix):
            base = base[len(prefix):]
        parsed.append({
            "file": f,
            "role_tag": role_tag(base),
            "title_norm": norm(strip_tag(base)),
        })
    tnorm = norm(title)
    for p in parsed:
        if p["title_norm"] == tnorm:
            return p["file"]
    cands = [p for p in parsed if p["role_tag"] == role]
    if len(cands) == 1:
        return cands[0]["file"]
    return None


SECTION_RE = re.compile(r"^\s*\[[^\]]*\]\s*$")


def split_lyric_lines(lyrics):
    """Real sung/spoken lines only -- drops blank lines and [Section] headers."""
    lines = lyrics.replace("\r\n", "\n").split("\n")
    out = []
    for ln in lines:
        s = ln.strip()
        if not s or SECTION_RE.match(s):
            continue
        out.append(s)
    return out


def srt_timestamp(t):
    if t < 0:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000:
        ms = 0
        s += 1
        if s == 60:
            s = 0
            m += 1
            if m == 60:
                m = 0
                h += 1
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def flatten_words(align_result_dict):
    words = []
    for seg in align_result_dict.get("segments", []):
        for w in seg.get("words", []):
            if w.get("word", "").strip():
                words.append(w)
    return words


def build_srt(flat_words, lyric_lines, srt_out_path):
    """Group aligned words back into the original lyric-sheet LINES.

    stable-ts aligns the exact text fed to it in order, so word i of the
    flat timeline corresponds to word i of the whitespace-split alignment
    text -- which is the same split() used here per line.
    """
    total_needed = sum(len(ln.split()) for ln in lyric_lines)
    if total_needed == 0:
        raise RuntimeError("no lyric lines to align")
    if len(flat_words) < total_needed * 0.5:
        raise RuntimeError(
            f"word count too low: got {len(flat_words)} need ~{total_needed}"
        )

    idx = 0
    last_end = 0.0
    cues = []
    for line in lyric_lines:
        n = len(line.split())
        if n == 0:
            continue
        chunk = flat_words[idx: idx + n]
        idx += n
        if not chunk:
            start = last_end
            end = last_end + 1.0
        else:
            start = chunk[0]["start"]
            end = chunk[-1]["end"]
            if end <= start:
                end = start + 0.3
        last_end = end
        cues.append((start, end, line))

    with open(srt_out_path, "w") as f:
        for i, (start, end, text) in enumerate(cues, 1):
            f.write(f"{i}\n{srt_timestamp(start)} --> {srt_timestamp(end)}\n{text}\n\n")

    return len(cues), idx, len(flat_words)


def collect_jobs():
    jobs = []
    for wn in range(1, 59):
        specf = os.path.join(SPECDIR, f"week-{wn:02d}.json")
        d = json.load(open(specf))
        wdir = os.path.join(WEEKDIR, f"Week {wn:02d}")
        idir = os.path.join(wdir, "images")
        images = []
        if os.path.isdir(idir):
            images = [
                os.path.join(idir, f)
                for f in sorted(os.listdir(idir))
                if f.lower().endswith(IMAGE_EXTS)
            ]
        for s in d.get("songs", []):
            role = s.get("role")
            title = s.get("title") or ""
            lyrics = s.get("lyrics") or ""
            mp3name = find_mp3(wdir, wn, role, title)
            jobs.append({
                "week": wn,
                "role": role,
                "title": title,
                "lyrics": lyrics,
                "wdir": wdir,
                "images": images,
                "mp3name": mp3name,
            })
    return jobs


def process_job(model, job, idx, total):
    wn, role, title = job["week"], job["role"], job["title"]
    tag = f"[{idx}/{total}] w{wn:02d}-{role}"
    if not job["mp3name"]:
        log(f"{tag} FAIL: no mp3 matched for title={title!r}")
        return "no_mp3"

    folder = sanitize(f"w{wn:02d}-{role} -- {title}")
    pkg_dir = os.path.join(OUTDIR, folder)
    os.makedirs(pkg_dir, exist_ok=True)

    src_mp3 = os.path.join(job["wdir"], job["mp3name"])
    dst_mp3 = os.path.join(pkg_dir, f"w{wn:02d}-{role}.mp3")
    clone_copy(src_mp3, dst_mp3)

    n_img = 0
    for src_img in job["images"]:
        dst_img = os.path.join(pkg_dir, os.path.basename(src_img))
        clone_copy(src_img, dst_img)
        n_img += 1

    lyrics_path = os.path.join(pkg_dir, "lyrics.txt")
    with open(lyrics_path, "w") as f:
        f.write(job["lyrics"])

    lyric_lines = split_lyric_lines(job["lyrics"])
    align_text = " ".join(lyric_lines)
    srt_path = os.path.join(pkg_dir, f"w{wn:02d}-{role}.srt")


    if not align_text.strip():
        log(f"{tag} SKIP align: no lyric lines. images={n_img}")
        return "no_lyrics"

    try:
        t0 = time.time()
        result = model.align(dst_mp3, align_text, language="en")
        d = result.to_dict()
        flat_words = flatten_words(d)
        n_cues, consumed, n_words = build_srt(flat_words, lyric_lines, srt_path)
        dt = time.time() - t0
        log(
            f"{tag} OK images={n_img} cues={n_cues} words={n_words} "
            f"needed={sum(len(l.split()) for l in lyric_lines)} align_s={dt:.1f}"
        )
        return "ok"
    except Exception as e:
        log(f"{tag} ALIGN_FAIL images={n_img} err={e!r}")
        log(traceback.format_exc(limit=3))
        if os.path.exists(srt_path):
            os.remove(srt_path)
        return "align_fail"


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    log("=" * 60)
    log("CapCut package batch starting")

    jobs = collect_jobs()
    total = len(jobs)
    log(f"Collected {total} song jobs (expect 115)")
    missing_mp3 = [j for j in jobs if not j["mp3name"]]
    if missing_mp3:
        for j in missing_mp3:
            log(f"  UNMATCHED MP3: w{j['week']:02d}-{j['role']} {j['title']!r}")

    log("Loading whisper 'base' model (once, reused for all songs)...")
    import stable_whisper
    t0 = time.time()
    model = stable_whisper.load_model("base")
    log(f"Model loaded in {time.time()-t0:.1f}s")

    counts = {}
    for i, job in enumerate(jobs, 1):
        status = process_job(model, job, i, total)
        counts[status] = counts.get(status, 0) + 1

    log("=" * 60)
    log(f"BATCH COMPLETE: {counts}")
    log("=" * 60)


if __name__ == "__main__":
    main()
