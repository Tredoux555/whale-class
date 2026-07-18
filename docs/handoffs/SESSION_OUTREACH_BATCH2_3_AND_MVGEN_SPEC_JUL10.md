# Session Handoff — Jul 10, 2026 (Cowork/Fable directing Sonnet workers)

## Outreach: Batches 2 + 3 drafted, Variant B locked for Batch 4 A/B test

- **New PERMANENT standing rule added to top of CLAUDE.md: model delegation.** Fable directs and writes critical copy; Sonnet does all fetching/sweeping/auditing (preferred over Haiku); Opus builds.
- **Gmail sweep since Batch 1:** one real reply — Wheatley School (eda.varalli@wheatleyschool.com), "not interested at this time" → flipped to dead. 3 known OOO auto-replies (Antioch until Jul 20, Towles until Jul 12, Azalea slow summer). Zero new bounces; Batch 1 deliverability still 100%.
- **NEW MODEL EMAIL approved + locked (Variant A, subject "From one Montessori teacher to another — may I ask your help?")** — supersedes the Batch 1 text; full text in `docs/outreach/GLOBAL_OUTREACH_CONTEXT_REFERENCE.md`. Key addition: the closing reply-hook question ("the one piece of admin you'd most love to never do again") — designed to generate replies, which also trains Gmail deliverability.
- **Batch 2 (25 drafts) + Batch 3 (25 drafts) created in Gmail with Variant A** — 50 drafts total, at the 50/day cap. Records: `docs/outreach/FOUNDING_100_BATCH_2_JUL10.csv` + `docs/outreach/FOUNDING_100_BATCH_3_JUL10.csv`. All 50 dedup-checked (`to:FULL-ADDRESS in:sent`), all flipped to `drafted` via `scripts/outreach-status.py` (26 flips batch 2 incl. Wheatley→dead; 25 flips batch 3; all verified OK — the CLI's known "API returned 500 after successful write" behavior observed, writes verified by re-read).
- **Selection method (now proven):** pool `docs/outreach/Montree_Global_Master_Jul2026.csv` → valid email → exclude social-outreach set (`global-social-merged.csv`) → exclude PRIOR_CONTACT/MX_DEAD flags → exclude prior batches → dedup by email → `random.seed(42)`; `random.sample(pool, 25)`. Batch 2 warning: 3 rows mislabeled by montessoricensus.org (Earth Child = BC Canada, Ray Jacobs = Nigeria, Montessori Academy of London = ON Canada) — kept, noted in the CSV.
- **Variant B (the social-blurb-derived email) locked for Batch 4 (Jul 11)** — A/B test vs Variant A. Full text + protocol in the context reference doc.
- **Social blurb v2 delivered** for FB/IG posting (same text family as Variant B).
- **Tomorrow (Jul 11):** generate Batch 4 (next 25, same algorithm, exclude batches 1-3) using VARIANT B; sweep Gmail for replies/bounces to batches 2-3 (sent Jul 10); follow-ups due Jul 13/16/20 per the 7-day rule; track replies per variant.

---

## 🎬 QUEUED BUILD — AUTOMATED MUSIC VIDEO GENERATOR (mvgen) — Opus build spec, approved by Tredoux Jul 10

**Design principle: AI generates NOTHING at render time; code assembles everything. Cost per video ≈ $0.** v1 = local CLI on the Mac (no hosting; a later optional wrapper could live on a separate private Railway worker — NEVER inside the Montree Next.js app: ffmpeg isn't in the Docker image and renders would block the web process).

### Architecture (3 layers)

1. **ANALYSIS** — `scripts/mvgen/analyze.py`: librosa reads the mp3 → beat grid, downbeats, onset strength, RMS energy sections (verse/chorus boundaries). Word-level lyric timestamps via local whisper (stable-ts preferred; note `OPENAI_API_KEY` deliberately lives on Railway only, so local model is the default). Output: one `timeline.json` per song (beats, sections, words with start/end times).

2. **RENDER** — two interchangeable engines reading `timeline.json`:
   - **Engine A "slideshow"** (build FIRST, 80% of the value): ffmpeg — images directory cut on downbeats with Ken Burns zoompan drift, lyrics burned in as styled ASS karaoke subtitles (word-by-word highlight from the whisper timestamps).
   - **Engine B "canvas"**: HTML/p5.js scene (seeded, deterministic) reading `timeline.json` — animated backgrounds, beat-pulsed glow, word-by-word lyric reveals; rendered via headless Chrome frame capture → ffmpeg mux. This reuses the exact closing-screen recipe from `docs/handoffs/SESSION_PARENT_SAFEAREA_CLOSING_SCREEN_JUL5.md`.

3. **INTERFACE** — `scripts/mvgen/mvgen.py` CLI: `--audio song.mp3 --images dir/ --lyrics optional.txt --theme montree|kids --engine slideshow|canvas --out out.mp4`. Outputs land in `~/Desktop/Music Videos/<song>/` (NOT git). Code lives in `scripts/mvgen/` (committed). Python deps via `pip --break-system-packages` or a venv on the Mac.

### Themes

- **"montree"** = dark forest `#0a1a0f` + gold + Lora italic (brand palette in `MONTREE_BRAND_PALETTE.md`).
- **"kids"** = bright curriculum house style (`#2D5A27` frames, Andika/Comic Sans, per `docs/curriculum/26_WEEK_SOUND_CURRICULUM.md` pack conventions).

### Build order

1. `analyze.py` + Engine A end-to-end on one Week-1 curriculum song (assets in `~/Desktop/English Curriculum 2026/Week 01/`).
2. ASS karaoke styling + both themes.
3. Engine B canvas templates.

**MANDATORY runtime audit (Jun-14 rule):** actually render a full song, watch/verify the mp4 (audio sync, subtitle timing, no black frames) before declaring done.

### Explicitly rejected

- Per-second gen-AI video (Runway/Kling/Veo — kills economics).
- SaaS render APIs (Creatomate/Shotstack — pay for what ffmpeg does free).

### RESUME PROMPT (for a fresh session)

> "Read `docs/handoffs/SESSION_OUTREACH_BATCH2_3_AND_MVGEN_SPEC_JUL10.md` §mvgen and have Opus build phase 1 of the music video generator per the spec. Fable directs, Opus builds, fresh-eyes audit before done."
