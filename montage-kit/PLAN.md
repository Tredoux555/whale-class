# Montree Weekly Montage Feature — Research & Build Plan

*Prepared July 22, 2026 · Research: 2 web-research agents + 1 codebase-recon agent (Sonnet) · Synthesis: Fable*

---

## The headline

**Effort: roughly 1–2 weeks of focused build for a v1 that looks properly good, at near-zero running cost.** The reason it's this cheap is that Montree has already solved — by accident — the hardest 80% of what Apple does. Apple's Memories magic is mostly *curation* (deciding which photos deserve to be in the film). In Montree, the Weekly Wrap flow already produces a hand-picked, per-child, AI-identified, teacher-confirmed photo set (`montree_report_media`). All that's left to build is the *presentation layer* — and that part is well-understood, documented technique, not magic.

---

## 1. How Apple actually does it

Apple has published more of this than people realize (machinelearning.apple.com):

**Curation (the hard part — which you get for free):**
- Every photo is scored on-device by a 16M-parameter multi-task network ("ANSA"): scene classification, aesthetics score, and a crucial `isUtility` flag (screenshots/receipts/documents are excluded even if sharp). This is now a public API — Vision's `CalculateImageAestheticsScoresRequest` returns a −1..1 score.
- Faces are clustered (agglomerative clustering on face + upper-body embeddings) into a private on-device "knowledge graph" of people, places, and events — that's what generates themed memories.
- Near-duplicate bursts are deduped; the sharpest/best-composed survives.

**Presentation (the part you're building) — ranked by visual impact per unit of effort:**
1. **Cuts locked to music beats**, not fixed intervals. This single technique is most of the "feels produced, not PowerPoint" effect.
2. **Ken Burns pan/zoom on every photo** — a slow, eased camera move per image instead of a static cut.
3. **One global color "look" applied across the whole film** (Apple's "Memory Looks" are literally just preset LUTs). One filter, applied uniformly, reads as "directed."
4. **Face/saliency-safe crops** — pans never crop a face; titles never sit on one.
5. **Key-photo title card** — best photo + "Emma · Week of July 20."
6. **Pacing variance** (Short/Medium/Long is just a photo-count knob).

None of these require ML at render time. Apple's ML spend is nearly all on curation — which your teachers already do by hand.

---

## 2. Where the processing happens: server-side, in a dedicated Railway worker

I evaluated four locations. The answer is unambiguous:

| Option | Verdict |
|---|---|
| **Dedicated Railway worker service (chosen)** | ✅ Photos already live in Supabase; render is a background batch job, not real-time. ~$2–10/mo compute at 900 videos/month. |
| Inside the existing Next.js container | ❌ A Sunday-night batch of 200 renders would starve web requests. Must be a separate Railway service. |
| On-device (teacher's phone / Capacitor WebView) | ❌ Dead end in 2026: iOS WebCodecs had no audio encoding until Safari 26 (fleet not there yet), and ffmpeg-kit — the native plugin everyone used — was retired Jan 2025 over patent-risk concerns. Also no product reason: this is a weekly batch job. |
| The mvgen Mac daemon | ❌ Your own CLAUDE.md says it: "Railway's localhost is not the Mac." It can't serve a runtime parent-facing feature. But its *logic* (librosa beat detection, Ken Burns, downbeat cuts) is directly portable prior art — you've already proven this exact pipeline works. |

---

## 3. What system: Remotion, self-hosted (with raw ffmpeg as fallback)

**Recommendation: Remotion** (React-based video rendering) in its own Railway service.

Why it wins for Montree specifically:
- **It's free for you.** Remotion's commercial license is $0 for companies with ≤3 employees. You only owe the $100/mo Automators plan when you hire employee #4. (Verified against remotion.dev/docs/license current terms.)
- **It's React.** Compositions are React components with CSS transforms and `interpolate()` easing — this is your stack's home turf. A polished Ken Burns + crossfade + title card is dramatically faster to make *look good* here than hand-tuning ffmpeg `zoompan` filtergraph math (which has a notorious jitter problem requiring an 8000px pre-upscale hack).
- **Beat-sync and face-crops become data, not filter strings.** Beat timestamps and crop rectangles are just props flowing into `<Sequence>` timing — exactly the shape of logic you already write.
- **Highest quality ceiling** of any self-hosted option: real typography, spring animations, SVG — with live preview in Remotion Studio while designing.

Costs/tradeoffs: the render container needs headless Chromium (bigger Docker image, ~2–4GB RAM while rendering; there's a Railway one-click Remotion template). If Chromium-on-Railway proves annoying, **fallback is raw ffmpeg** (`zoompan` + `xfade` + music track) — mature, zero-license, and mvgen already proves the approach; quality ceiling slightly lower and filtergraphs are miserable to maintain.

**Rejected:** hosted APIs (Shotstack ~$174+/mo, Creatomate ~$350+/mo at 200 videos/week — recurring vendor spend scaling with your growth, for output no better than option A). Remotion Lambda on AWS (~$15–20/mo) is a fine later escape hatch if queue depth ever becomes a problem.

**One do-not:** don't use `fluent-ffmpeg` if you go the ffmpeg route — it's abandoned; the maintainer says to shell out to ffmpeg directly.

---

## 4. How it works, end to end

```
Teacher publishes Weekly Wrap
        │  (existing flow — photos already selected in montree_report_media)
        ▼
INSERT into montree_render_jobs (Postgres table = the queue; no Redis needed at this scale)
        │
        ▼
Render worker (new Railway service) polls the table
        │  1. Pull the report's photos from Supabase Storage
        │  2. Auto-hygiene pass: EXIF-rotate, blur check (variance of Laplacian),
        │     perceptual-hash dedupe of near-identical shots     [sharp — already a dep]
        │  3. Pick music track (rotating from a licensed library of 5–10 instrumentals)
        │     → load its PRECOMPUTED beat map (JSON, computed once per track, offline)
        │  4. Render Remotion composition:
        │       title card (child's name, week, key photo)
        │       per-photo Ken Burns with varied pan directions, eased curves
        │       crossfades landing on downbeats
        │       one global warm "classroom" color look
        │       end card (school logo / "Made with Montree")
        │  5. Encode ~30–60s 1080p MP4 (~1–4 min render on 2 vCPU)
        ▼
Upload MP4 to montree-media bucket → serve via existing Cloudflare media proxy
        ▼
Video player embedded at top of /montree/parent/report/[id]
        + existing push notification ("Emma's week is ready 🎬")
```

The **precomputed beat map** trick is the key efficiency insight, borrowed from your own mvgen ("$0/video, zero AI at render time"): since the music library is fixed and licensed up front, run librosa *once per track ever*, store the beat timestamps as JSON, and the render worker just snaps cut points to the grid. No Python, no ML, no audio analysis in the hot path. Render cost becomes pure CPU-minutes: **roughly $2–10/month at 200 videos/week.**

**Music licensing — the sleeper risk.** "Royalty-free" consumer licenses (Pixabay, Mixkit, YouTube Audio Library) are written for a creator publishing their *own* videos — not a SaaS that mechanically embeds tracks into thousands of videos redistributed to third parties (parents). The safe, cheap path: buy 5–10 instrumental tracks outright with an explicit extended/"unlimited end products" commercial license (~$20–50/track one-time, AudioJungle-class marketplaces). Instrumentals only — no vocals — so a parent screen-recording and resharing never triggers a copyright strike. Total: **~$150–300 one-time.**

---

## 5. Build phases & effort

**Phase 0 — Proof (half a day).** Scaffold a Remotion project locally, render one montage from ~12 real (test) photos with a stub beat map. Confirms the look before any infra work. *This is the go/no-go gate.*

**Phase 1 — Render service (2–3 days).** New Railway service: Docker + Node + Chromium deps + `@remotion/renderer`. `montree_render_jobs` table with status/retry columns. Worker loop with per-job timeout, failure capture, EXIF-orientation handling (the classic phone-photo gotcha).

**Phase 2 — The composition (3–4 days; this is where the quality lives).** Title card, Ken Burns with per-photo varied direction and eased curves, beat-snapped crossfades, global color look, end card, duration logic (photo count → Short/Medium film). Buy and beat-map the music library.

**Phase 3 — Integration (2–3 days).** Hook into report publish, upload to `montree-media`, proxy allowlist entry (remember the dark-phonics 502 lesson), player on the parent report page, push notification copy, teacher preview/regenerate button, graceful degradation (report ships fine if render fails — video is enhancement, not dependency).

**Phase 4 — Polish, later, optional.** Face-safe cropping (smartcrop-sharp + @vladmandic/face-api as boost regions feeding pan targets — 1–3 days), auto blur/dupe filtering upstream in Wrap Up, seasonal "looks," per-school music choice.

**Total v1 (Phases 0–3): ~8–11 working days.** Division of labor as you specified: this document is the thinking; **Opus takes Phases 1–3 as the build spec** (each phase is a self-contained brief); **Sonnet handles the grunt work** — beat-mapping the tracks, Docker image wrangling, proxy allowlist, test-photo fixtures.

---

## 6. Risks & honest caveats

- **Render time on Railway is estimated (1–4 min/video on 2 vCPU), not benchmarked.** Phase 0/1 must profile on the real container before committing to a batch window. If it's slow, Remotion Lambda is the escape hatch.
- **Chromium in Docker on Railway** is proven (official template exists) but adds image-size/RAM overhead; if it fights you, the ffmpeg fallback preserves the whole architecture — only step 4 changes.
- **Consent framing:** photos of children compiled into shareable videos deserves a school-level toggle and respect for existing per-child media permissions from day one — this is a checkbox in Phase 3, not an afterthought.
- **Remotion license watch:** free ≤3 employees; $100/mo minimum at 4+. Cheap either way, but put it in the hiring-cost mental model.

---

## Sources (key)

- Apple: [On-Device Scene Analysis](https://machinelearning.apple.com/research/on-device-scene-analysis) · [Recognizing People in Photos](https://machinelearning.apple.com/research/recognizing-people-photos) · [Vision aesthetics API](https://developer.apple.com/documentation/vision/calculateimageaestheticsscoresrequest)
- Google: [Cinematic Photos tech blog](https://research.google/blog/the-technology-behind-cinematic-photos/) · [PAIR on Memories curation](https://medium.com/people-ai-research/a-snapshot-of-ai-powered-reminiscing-in-google-photos-5a05d2f2aa46)
- Technique: [Ken Burns with FFmpeg (jitter fix)](https://mko.re/blog/ken-burns-ffmpeg/) · [kburns-slideshow (beat-synced OSS)](https://github.com/Trekky12/kburns-slideshow) · [Bannerbear Ken Burns recipe](https://www.bannerbear.com/blog/how-to-do-a-ken-burns-style-effect-with-ffmpeg/)
- Remotion: [License FAQ](https://www.remotion.dev/docs/license/faq) · [Company licenses/pricing](https://www.remotion.dev/blog/company-licenses) · [Railway template](https://railway.com/deploy/remotion) · [Lambda cost examples](https://www.remotion.dev/docs/lambda/cost-example)
- Vendor pricing: [Shotstack](https://shotstack.io/pricing/) · [Creatomate](https://creatomate.com/pricing) · [JSON2Video](https://json2video.com/pricing/)
- Client-side dead ends: [ffmpeg-kit retirement](https://tanersener.medium.com/saying-goodbye-to-ffmpegkit-33ae939767e1) · [WebCodecs Safari support](https://caniwebview.com/features/web-feature-webcodecs/)
- Music-for-SaaS licensing: [Bensound SaaS licensing guide](https://blog.bensound.com/licensing-copyright/music-licensing-for-saas-apps/) · [Soundstripe API](https://www.soundstripe.com/api)
