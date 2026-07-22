#!/usr/bin/env python3
"""Offline synthesis of a gentle felt-piano instrumental bed for the Montree
weekly montage. 76 BPM, F major, I-V-vi-IV. No percussion, no vocals.
Outputs music.wav + beats.json."""
import json
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
BPM = 76.0
BEAT = 60.0 / BPM            # 0.789474 s
BAR = 4 * BEAT               # 3.157895 s
DURATION = 50.7              # seconds (video is ~50.53s; music covers it)
rng = np.random.default_rng(76)

N = int(DURATION * SR)
buf = np.zeros(N, dtype=np.float64)

# ---- note frequencies (equal temperament) ----
def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)

# named notes -> midi
NOTE = {
    'Bb2': 46, 'C3': 48, 'D3': 50, 'F3': 53, 'A3': 57, 'Bb3': 58,
    'C4': 60, 'D4': 62, 'E4': 64, 'F4': 65, 'G4': 67, 'A4': 69,
    'Bb4': 70, 'C5': 72, 'D5': 74, 'E5': 76, 'F5': 77,
}

def add(sig, start_s):
    """mix sig into buf at start_s seconds."""
    i = int(start_s * SR)
    if i < 0:
        sig = sig[-i:]
        i = 0
    if i >= N or len(sig) == 0:
        return
    j = min(N, i + len(sig))
    buf[i:j] += sig[:j - i]

def lowpass(sig, cutoff):
    sos = butter(4, cutoff / (SR / 2), btype='low', output='sos')
    return sosfilt(sos, sig)

# ---- felt piano pluck: sine + soft harmonics, fast attack, long exp decay ----
def pluck(freq, dur, vel):
    n = int(dur * SR)
    t = np.arange(n) / SR
    # harmonic stack (felt piano: strong fundamental, gentle upper partials)
    partials = [(1.0, 1.00), (2.0, 0.28), (3.0, 0.12), (4.0, 0.05)]
    tone = np.zeros(n)
    for h, amp in partials:
        # very slight detune per partial for warmth
        tone += amp * np.sin(2 * np.pi * freq * h * t + rng.uniform(0, 2 * np.pi))
    # envelope: 8ms raised-cosine attack, exponential decay
    env = np.exp(-t / (dur * 0.34))
    a = int(0.008 * SR)
    env[:a] *= 0.5 * (1 - np.cos(np.linspace(0, np.pi, a)))
    sig = tone * env * vel
    # felt = mellow; roll off highs
    sig = lowpass(sig, 2600)
    return sig

# ---- warm pad: sustained triad, slow attack/release, heavily filtered ----
def pad(freqs, dur, vel):
    n = int(dur * SR)
    t = np.arange(n) / SR
    tone = np.zeros(n)
    for f in freqs:
        tone += np.sin(2 * np.pi * f * t)
        tone += 0.35 * np.sin(2 * np.pi * f * 2 * t)  # soft octave shimmer
    tone /= len(freqs)
    env = np.ones(n)
    at = int(0.45 * SR); rl = int(0.9 * SR)
    env[:at] = np.linspace(0, 1, at) ** 1.5
    env[-rl:] = np.linspace(1, 0, rl) ** 1.5
    sig = tone * env * vel
    sig = lowpass(sig, 750)   # dark, warm
    return sig

# ---- progression ----
CHORDS = [
    ('F',  ['F3', 'A3', 'C4'], 'Bb2' if False else 'F3'),   # I
    ('C',  ['C4', 'E4', 'G4'], 'C3'),                        # V
    ('Dm', ['D4', 'F4', 'A4'], 'D3'),                        # vi
    ('Bb', ['Bb3', 'D4', 'F4'], 'Bb2'),                      # IV
]
# bass note per chord (low octave)
BASS = {'F': 'F3', 'C': 'C3', 'Dm': 'D3', 'Bb': 'Bb2'}

# melody line over the 4-bar loop, one note per beat (chord tones, stepwise)
MELODY = [
    ['A4', 'C5', 'A4', 'G4'],   # F
    ['G4', 'E4', 'G4', 'C5'],   # C
    ['A4', 'F4', 'A4', 'D5'],   # Dm
    ['D5', 'F4', 'A4', 'F4'],   # Bb
]

n_bars = int(np.ceil(DURATION / BAR)) + 1
for b in range(n_bars):
    bar_start = b * BAR
    if bar_start > DURATION:
        break
    chord_name, triad, _ = CHORDS[b % 4]
    triad_f = [midi(NOTE[x]) for x in triad]
    mel = MELODY[b % 4]

    # pad chord for the whole bar (dark, quiet)
    add(pad(triad_f, BAR + 0.3, 0.11), bar_start)

    # bass root on beat 1 and 3
    bf = midi(NOTE[BASS[chord_name]]) / 2  # one octave down for depth
    add(pluck(bf, BEAT * 2.2, 0.16), bar_start + 0.0)
    add(pluck(bf, BEAT * 2.0, 0.12), bar_start + 2 * BEAT)

    # melody plucks, one per beat, with human timing + velocity variation
    for beat in range(4):
        note = mel[beat]
        f = midi(NOTE[note])
        vel = rng.uniform(0.62, 0.92)
        jitter = rng.uniform(-0.012, 0.012)
        dur = BEAT * rng.uniform(1.7, 2.3)
        add(pluck(f, dur, vel), bar_start + beat * BEAT + jitter)
        # occasional gentle eighth-note ornament (grace) a third above, softer
        if rng.random() < 0.30 and beat < 3:
            gf = midi(NOTE[note] + rng.choice([3, 4]))
            add(pluck(gf, BEAT * 1.0, vel * 0.4),
                bar_start + (beat + 0.5) * BEAT + jitter)

    # occasional held chord bloom on downbeat of some bars
    if b % 4 == 0:
        for f in [midi(NOTE[x]) for x in triad]:
            add(pluck(f * 1.0, BEAT * 3.0, 0.22 + rng.uniform(-0.03, 0.03)),
                bar_start)

# ---- light reverb: a few attenuated early reflections + short tail ----
def reverb(sig):
    out = sig.copy()
    for delay_ms, gain in [(23, 0.28), (47, 0.20), (79, 0.13), (150, 0.09)]:
        d = int(delay_ms / 1000 * SR)
        tail = np.zeros(len(sig))
        tail[d:] = sig[:-d] * gain
        out += tail
    # a smeared longer tail
    d = int(0.22 * SR)
    tail = np.zeros(len(sig))
    tail[d:] = lowpass(sig[:-d], 3000) * 0.10
    out += tail
    return out

buf = reverb(buf)

# gentle global low-pass so nothing is brittle
buf = lowpass(buf, 6500)

# ---- normalize to a comfortable headroom, then fades ----
peak = np.max(np.abs(buf))
buf = buf / peak * 0.72   # leaves headroom; peak ~ -2.85 dBFS before fades

t = np.arange(N) / SR
# fade in 1.8s
fin = int(1.8 * SR)
buf[:fin] *= np.linspace(0, 1, fin) ** 1.4
# fade out 3.0s
fout = int(3.0 * SR)
buf[-fout:] *= np.linspace(1, 0, fout) ** 1.6

# final safety limiter (soft) — ensure peak < -1 dBFS
peak = np.max(np.abs(buf))
target = 10 ** (-1.5 / 20)   # -1.5 dBFS
if peak > target:
    buf = buf / peak * target

# write 16-bit WAV
from scipy.io import wavfile
wavfile.write('music.wav', SR, (buf * 32767).astype(np.int16))

# ---- beats.json ----
beats = []
downbeats = []
b = 0
while b * BEAT <= DURATION:
    ts = round(b * BEAT, 4)
    beats.append(ts)
    if b % 4 == 0:
        downbeats.append(ts)
    b += 1
with open('beats.json', 'w') as f:
    json.dump({'bpm': BPM, 'beat': round(BEAT, 6), 'bar': round(BAR, 6),
               'duration': DURATION, 'beats': beats, 'downbeats': downbeats},
              f, indent=1)

pk = np.max(np.abs(buf))
print(f'peak dBFS = {20*np.log10(pk):.2f}')
print(f'beats={len(beats)} downbeats={len(downbeats)} dur={DURATION}s')
