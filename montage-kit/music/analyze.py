import librosa
import numpy as np
import json
import os
import glob
import subprocess

SCRATCH = "/home/claude/work/music-library/scratch"
OUT = "/home/claude/work/music-library/analysis.json"

files = sorted(glob.glob(os.path.join(SCRATCH, "*.mp3")))

def get_rms_db(y):
    rms = librosa.feature.rms(y=y)[0]
    rms_mean = np.mean(rms)
    if rms_mean <= 0:
        return -120.0
    return 20 * np.log10(rms_mean)

def leading_trailing_silence(y, sr, top_db=40):
    intervals = librosa.effects.split(y, top_db=top_db)
    if len(intervals) == 0:
        return 0.0, 0.0
    lead = intervals[0][0] / sr
    trail = (len(y) - intervals[-1][1]) / sr
    return lead, trail

def stability_from_beats(beat_times):
    if len(beat_times) < 3:
        return None
    ibi = np.diff(beat_times)  # inter-beat intervals in seconds
    bpm_series = 60.0 / ibi
    median_bpm = float(np.median(bpm_series))
    q1, q3 = np.percentile(bpm_series, [25, 75])
    iqr_bpm = float(q3 - q1)
    deviant = np.abs(bpm_series - median_bpm) / median_bpm > 0.06
    pct_deviant = float(np.mean(deviant) * 100)
    return {
        "median_bpm": median_bpm,
        "iqr_bpm": iqr_bpm,
        "pct_deviant": pct_deviant,
        "n_intervals": len(ibi),
    }

results = {}

for f in files:
    name = os.path.basename(f)
    print(f"Analyzing {name}...")
    y, sr = librosa.load(f, sr=22050, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)

    # global tempo estimate
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, trim=False)
    tempo = float(np.atleast_1d(tempo)[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    stab = stability_from_beats(beat_times)

    # try half/double time variants by re-running beat_track with start_bpm hints
    variants = {}
    for label, hint in [("half", tempo/2), ("double", tempo*2), ("orig", tempo)]:
        try:
            t2, bf2 = librosa.beat.beat_track(y=y, sr=sr, trim=False, start_bpm=hint)
            t2 = float(np.atleast_1d(t2)[0])
            bt2 = librosa.frames_to_time(bf2, sr=sr)
            s2 = stability_from_beats(bt2)
            variants[label] = {
                "start_bpm_hint": hint,
                "tempo_estimate": t2,
                "beats": bt2.tolist(),
                "stability": s2,
            }
        except Exception as e:
            variants[label] = {"error": str(e)}

    lead_sil, trail_sil = leading_trailing_silence(y, sr)
    rms_db = get_rms_db(y)

    results[name] = {
        "duration_sec": float(duration),
        "tempo_default": tempo,
        "beats_default": beat_times.tolist(),
        "stability_default": stab,
        "variants": variants,
        "leading_silence_sec": float(lead_sil),
        "trailing_silence_sec": float(trail_sil),
        "rms_db_proxy": float(rms_db),
    }

with open(OUT, "w") as fh:
    json.dump(results, fh, indent=2)

print("done ->", OUT)
