#!/usr/bin/env python3
"""
Split a single-take letter-sound recording into per-letter clips.

    python3 process_letters.py TAKE.m4a [--outdir DIR] [--noise -38] [--gap 1.6]

Protocol it expects (see record.html):
    "<Letter> for <keyword>."  <beat>  <the sound>   <~3s silence>   ...repeat

The spoken keyword is the whole point: it is a real word, so speech-to-text
reads it reliably where an isolated phoneme is unreadable. Every chunk is
identified by its own label rather than by counting -- which is how the
previous take got jumbled.
"""
import argparse, json, subprocess, sys, re, pathlib, urllib.request, os

KEYWORDS = {
 "a":"apple","b":"ball","c":"cat","d":"dog","e":"egg","f":"fish","g":"goat",
 "h":"hat","i":"igloo","j":"jug","k":"kite","l":"leg","m":"moon","n":"nose",
 "o":"octopus","p":"pig","q":"queen","r":"rat","s":"snake","t":"tiger",
 "u":"umbrella","v":"van","w":"web","x":"box","y":"yellow","z":"zip",
 "ck":"duck","qu":"quilt","sh":"ship","th":"thumb","ch":"chip",
}
KW2L = {v:k for k,v in KEYWORDS.items()}

def sh(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)

def silences(wav, noise, gap):
    r = sh(["ffmpeg","-hide_banner","-i",str(wav),"-af",
            f"silencedetect=noise={noise}dB:d={gap}","-f","null","-"])
    out, ivals, start = r.stderr, [], None
    for m in re.finditer(r"silence_(start|end):\s*(-?[\d.]+)", out):
        if m.group(1)=="start": start=float(m.group(2))
        elif start is not None: ivals.append((start,float(m.group(2)))); start=None
    if start is not None: ivals.append((start, dur(wav)))
    return ivals

def dur(f):
    return float(sh(["ffprobe","-v","error","-show_entries","format=duration",
                     "-of","csv=p=0",str(f)]).stdout.strip())

def chunks_from(sil, total):
    """speech regions = the gaps between detected silences"""
    out, cur = [], 0.0
    for s,e in sil:
        if s-cur > 0.20: out.append((cur,s))
        cur = e
    if total-cur > 0.20: out.append((cur,total))
    return out

def stt(path, key):
    import uuid
    b = path.read_bytes()
    bd = uuid.uuid4().hex
    body = (f"--{bd}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
            f"--{bd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"c.wav\"\r\n"
            f"Content-Type: audio/wav\r\n\r\n").encode() + b + f"\r\n--{bd}--\r\n".encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body,
        headers={"xi-api-key":key,"Content-Type":f"multipart/form-data; boundary={bd}"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.load(r).get("text","")
    except Exception as e:
        return f"<STT FAIL {e}>"

def identify(text):
    """map a spoken label to a letter. keyword first (reliable), then letter name."""
    t = re.sub(r"[^a-z ]"," ", text.lower())
    words = t.split()
    for kw,L in KW2L.items():
        if kw in words: return L, f"keyword '{kw}'"
    # digraph spoken as two letters, e.g. "s h" / "sh"
    for dg in ("sh","th","ch","ck","qu"):
        if dg in words or f"{dg[0]} {dg[1]}" in t: return dg, f"digraph '{dg}'"
    for w in words:
        if len(w)==1 and w.isalpha(): return w, f"letter name '{w}'"
    return None, "unidentified"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input"); ap.add_argument("--outdir", default="letters-processed")
    ap.add_argument("--noise", default="-38"); ap.add_argument("--gap", type=float, default=1.6)
    ap.add_argument("--no-stt", action="store_true")
    a = ap.parse_args()

    src = pathlib.Path(a.input).expanduser()
    if not src.exists(): sys.exit(f"no such file: {src}")
    out = pathlib.Path(a.outdir); (out/"sound").mkdir(parents=True, exist_ok=True)
    (out/"_chunks").mkdir(exist_ok=True)

    key = None
    envf = pathlib.Path(".env.local")
    if envf.exists():
        for l in envf.read_text().splitlines():
            if l.startswith("ELEVENLABS_API_KEY="):
                key = l.split("=",1)[1].strip().strip('"').strip("'")

    wav = out/"_take.wav"
    sh(["ffmpeg","-y","-hide_banner","-i",str(src),"-ac","1","-ar","48000",str(wav)])
    total = dur(wav)
    sil = silences(wav, a.noise, a.gap)
    ch  = chunks_from(sil, total)
    print(f"take: {total:.1f}s | silences: {len(sil)} | speech chunks: {len(ch)}")
    if not ch: sys.exit("no speech found -- try --noise -45 or --gap 1.2")

    rows = []
    for i,(s,e) in enumerate(ch):
        cf = out/"_chunks"/f"{i:02d}.wav"
        sh(["ffmpeg","-y","-hide_banner","-ss",str(s),"-to",str(e),"-i",str(wav),str(cf)])
        label = "" if a.no_stt or not key else stt(cf, key)
        L, how = identify(label) if label else (None,"skipped")
        # Inside the chunk, the SOUND is the last burst after the spoken label.
        # If the label ran straight into the sound with no beat there is no
        # inner silence to cut on -- try progressively more sensitive settings,
        # then FLAG it rather than shipping a clip that still says "A for apple".
        chunk_len = e - s
        inner = silences(cf, a.noise, 0.28)
        if not inner: inner = silences(cf, "-30", 0.15)
        if not inner: inner = silences(cf, "-26", 0.10)
        cs, ce = 0.0, chunk_len
        if inner:
            cs = inner[-1][1]
            if ce - cs < 0.12: cs = inner[-1][0]
        clean = bool(inner) and (ce - cs) < chunk_len * 0.72
        rows.append(dict(i=i, start=round(s,2), end=round(e,2), label=label.strip(),
                         letter=L, how=how, snd_start=round(cs,2), snd_end=round(ce,2),
                         clean=clean))
        flag = "" if clean else "   << LABEL NOT SEPARATED - check this one"
        print(f"  [{i:02d}] {s:7.2f}-{e:7.2f}  {L or '??':>2}  ({how})   {label.strip()[:44]!r}{flag}")

    # write the sound-only clips, normalised
    seen = {}
    for r in rows:
        if not r["letter"]: continue
        cf = out/"_chunks"/f"{r['i']:02d}.wav"
        dst = out/"sound"/f"{r['letter']}.mp3"
        if dst.exists(): seen.setdefault(r["letter"],0); seen[r["letter"]]+=1   # later take wins
        sh(["ffmpeg","-y","-hide_banner","-ss",str(r["snd_start"]),"-to",str(r["snd_end"]),
            "-i",str(cf),"-af","afade=t=in:d=0.012,afade=t=out:st=%.3f:d=0.012,loudnorm=I=-16:TP=-1.5:LRA=11"
              % max(0.0,(r["snd_end"]-r["snd_start"])-0.012),
            "-ar","44100","-ac","1","-b:a","192k",str(dst)])
    got = sorted(p.stem for p in (out/"sound").glob("*.mp3"))
    missing = [k for k in KEYWORDS if k not in got]
    dupes = {k:v for k,v in seen.items() if v}
    (out/"report.json").write_text(json.dumps(dict(rows=rows,got=got,missing=missing),indent=1))
    print(f"\nwrote {len(got)} clips -> {out/'sound'}")
    print("missing:", missing or "none")
    if dupes: print("re-takes (last one kept):", dupes)
    unid = [r["i"] for r in rows if not r["letter"]]
    if unid: print("UNIDENTIFIED chunks (need a human):", unid)
    dirty = [r["letter"] for r in rows if r["letter"] and not r.get("clean")]
    if dirty: print("LABEL-NOT-SEPARATED (clip may still say the keyword):", dirty)

if __name__ == "__main__":
    main()
