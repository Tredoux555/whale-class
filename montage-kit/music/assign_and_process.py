import json, os, subprocess, math
import numpy as np
import librosa

SCRATCH = "/home/claude/work/music-library/scratch"
OUTDIR = "/home/claude/work/music-library"

with open(os.path.join(OUTDIR, "analysis.json")) as f:
    data = json.load(f)

SLOTS = {
    "flagship-felt-piano": 76,
    "warm-acoustic": 84,
    "tender-strings": 72,
    "bright-week": 92,
    "morning-light": 88,
    "naptime": 68,
    "term-end": 70,
    "wildcard-warmth": 80,
}

# assignment: slug -> (source_file, variant_label ["default"/"half"/"orig"/"double"], take_note)
ASSIGN = {
    "flagship-felt-piano": ("Felt Moon Motif.mp3", "orig"),
    "wildcard-warmth": ("Golden Afternoon (1).mp3", "orig"),
    "tender-strings": ("Home Between Us.mp3", "half"),
    "bright-week": ("Picnic Under Magnolia (1).mp3", "orig"),
    "morning-light": ("Morning in Cedar.mp3", "orig"),
    "term-end": ("December Ledger.mp3", "half"),
    # naptime and warm-acoustic intentionally left UNFILLED (rejected candidates)
}

def stability_verdict(pct_dev):
    if pct_dev is None:
        return "UNKNOWN"
    if pct_dev > 15.0:
        return "REJECT"
    if pct_dev <= 8.0:
        return "STEADY"
    return "ACCEPTABLE"

manifest = {"slots": {}, "unassigned": []}

for slug, (fname, variant_label) in ASSIGN.items():
    d = data[fname]
    if variant_label == "default":
        bpm = d["tempo_default"]
        beats = d["beats_default"]
        stab = d["stability_default"]
    else:
        v = d["variants"][variant_label]
        bpm = v["stability"]["median_bpm"] if v["stability"] else v["tempo_estimate"]
        beats = v["beats"]
        stab = v["stability"]

    lead_sil = d["leading_silence_sec"]
    trim_start = max(0.0, lead_sil - 0.3)

    src_path = os.path.join(SCRATCH, fname)
    out_mp3 = os.path.join(OUTDIR, f"{slug}.mp3")

    # single-pass loudnorm with trim of leading silence (keep ~0.3s natural pad)
    cmd = [
        "ffmpeg", "-y", "-i", src_path,
        "-ss", f"{trim_start:.3f}",
        "-af", "loudnorm=I=-18:TP=-2:LRA=11:print_format=summary",
        "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k",
        out_mp3,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    print(f"--- {slug} ({fname}) trim_start={trim_start:.3f}s ---")
    # print loudnorm summary lines
    for line in proc.stderr.splitlines():
        if "Integrated" in line or "True Peak" in line:
            print(" ", line.strip())

    # shift beats by trim_start, drop negatives, clamp to new duration
    new_duration = d["duration_sec"] - trim_start
    beats_arr = np.array(beats)
    shifted = beats_arr - trim_start
    shifted = shifted[(shifted >= 0) & (shifted <= new_duration)]
    beats_list = [round(float(x), 3) for x in shifted]
    downbeats = beats_list[0::4] if beats_list else []

    pct_dev = stab["pct_deviant"] if stab else None
    iqr = stab["iqr_bpm"] if stab else None
    verdict = stability_verdict(pct_dev)

    beat_json = {
        "slug": slug,
        "source_file": fname,
        "bpm": round(float(bpm), 2),
        "beats": beats_list,
        "downbeats": downbeats,
        "duration": round(float(new_duration), 3),
        "stability": {
            "iqr_bpm": round(float(iqr), 2) if iqr is not None else None,
            "pct_deviant": round(float(pct_dev), 2) if pct_dev is not None else None,
        },
    }
    with open(os.path.join(OUTDIR, f"{slug}.beats.json"), "w") as jf:
        json.dump(beat_json, jf, indent=2)

    manifest["slots"][slug] = {
        "target_bpm": SLOTS[slug],
        "source_file": fname,
        "variant_used": variant_label,
        "measured_bpm": round(float(bpm), 2),
        "duration_sec": round(float(new_duration), 3),
        "stability_verdict": verdict,
        "pct_deviant": round(float(pct_dev), 2) if pct_dev is not None else None,
        "iqr_bpm": round(float(iqr), 2) if iqr is not None else None,
        "trim_applied_sec": round(trim_start, 3),
    }

print(json.dumps(manifest, indent=2))
with open(os.path.join(OUTDIR, "manifest_partial.json"), "w") as f:
    json.dump(manifest, f, indent=2)
