# Session 130 Handoff — Splash page refresh + corner autoplay video + name removal + HeyGen script (May 27, 2026)

## TL;DR

**6 commits shipped to `main`.** The splash page (`/montree`) got a full brand refresh, the founder's name was scrubbed off the public surface, and an autoplay corner video was bolted onto the hero with a self-contained EN/中文 toggle. Plus a parallel agent produced a ready-to-paste HeyGen explainer script.

Three design pivots in one session — landed on the final design after each was tried and validated against real-user feedback:
1. Inline click-to-play video section under the hero (commit `9f36ce6c` + `1439fda3`)
2. Same inline section + a "Watch the intro" pill that opened a lightbox modal (built but never shipped — superseded mid-session)
3. **Corner autoplay video in the hero with EN/中文 toggle overlaid on the player** (commit `85b0ee7e` + `e6d7bfa0` — final state)

**No migrations.** Pure frontend + asset + i18n work.

**Headline product change:** the splash page now sells Montree from the corner of the hero in 45 seconds, autoplaying muted the moment a visitor lands. The brand tagline "the AI Montessori classroom revolution" replaces "The magic of Montree." at the top of the hero. "Work smarter not harder" replaces "Change your life" as the gold kicker beneath the Try it CTA. The About page is fully de-personalized — Schema.org founder Person field gone, the visible "Tredoux Willemse, currently teaching a PreK 4 class in Beijing" line replaced with "a practicing AMS-certified Montessori educator" generic.

---

## Commits shipped this session

| SHA | Subject | Files | Notes |
|---|---|---|---|
| `9f36ce6c` | Splash refresh + name removal + locale-aware splash video plumbing | 14 code | Hero rewrite, About page scrub, SPLASH_VIDEO_BY_LOCALE map keyed on i18n locale, .gitignore carve-out. Lightbox + Watch-the-intro built and shipped. |
| `1439fda3` | Splash video assets: en MP4 (20 MB, 65s) + poster | 2 binary | Asset split into its own commit to survive flaky SSH push. |
| `98ea90ce` | Splash video: enable zh locale in SPLASH_VIDEO_BY_LOCALE | 1 code | Uncommented the zh entry once the user uploaded the Chinese MP4. |
| `f2f805de` | Splash video assets: Chinese (zh) 1080p (39 MB, 55s) + poster | 2 binary | Asset push retried after one network drop. |
| `85b0ee7e` | Splash: corner autoplay video in hero + self-contained EN/中文 toggle | 1 code | Full pivot: ripped out the click-to-play inline section, the Watch-the-intro pill, the lightbox modal, the locale-tied SPLASH_VIDEO_BY_LOCALE. Replaced with corner autoplay + local useState toggle. |
| `e6d7bfa0` | Splash en video: 65s/20MB long version → 45s/13MB short version | 2 binary | User uploaded a tighter cut better suited to autoplay-on-page-load. Asset replaced in place. Push needed three retries — SSH on 13 MB pack file was unstable. |

---

## What changed, file by section

### A. Hero rewrite (commit `9f36ce6c`)

`app/montree/page.tsx` — the centered hero stack went from:

```
The magic of Montree.
Try it
Change your life
```

to:

```
Montree
the AI Montessori classroom revolution
Try it
Work smarter not harder
```

The h1 now carries just the brand word, with a smaller italic Lora-serif tagline immediately beneath. Spacing tuned so the brand name leads visually and the tagline reads as a punctuation flourish rather than a description.

i18n: 3 keys touched across all 12 locales (`landing.hero.title` → "Montree", `landing.hero.tagline` → "the AI Montessori classroom revolution" new key, `landing.hero.kicker` → "Work smarter not harder"). Real per-locale translations on the tagline + kicker. The title stays "Montree" untranslated everywhere (it's a brand mark, matching the wordmark in the nav).

Strict completeness check: 5,035 / 5,035 keys per locale = 100% × 12.

### B. About page name removal (commit `9f36ce6c`)

`app/montree/about/page.tsx`:
- Visible copy: `Tredoux Willemse, an AMS-certified Montessori Young Learner Specialist currently teaching a PreK 4 class in Beijing` → `a practicing AMS-certified Montessori educator`. Drops the name AND the school-identifying detail (Beijing + PreK 4 — that's how schools could have cross-referenced the founder to a specific classroom).
- Schema.org JSON-LD: removed the `founder: { '@type': 'Person', name: 'Tredoux Willemse', ... }` field entirely. Google's entity graph now sees Montree Limited as the operator with no named human attached.
- `metadata.description` + OpenGraph + Twitter card descriptions: `Built by a practicing AMS-certified Montessori teacher` → `Built by a practicing Montessori educator`.
- Montree Limited / HK SAR / BR 80261361 / address / founded date / contact email all kept.

Grep verified: zero "Tredoux" or "Willemse" remain on `app/montree/page.tsx` or `app/montree/about/page.tsx`.

### C. Splash video — three iterations, final state in `85b0ee7e`

**Iteration 1 (`9f36ce6c` + `1439fda3`):** Click-to-play inline video section between the hero and the Teacher/Parents/Principal editorial blocks. 20 MB 65s EN MP4 + 73 KB poster auto-extracted at t=2s. Native browser controls, `preload="metadata"` so only the headers download until press play. `SPLASH_VIDEO_BY_LOCALE` map keyed on the page-wide i18n locale.

**Iteration 2 (built but never shipped as the final state):** added a `<button className="m-pill-ghost">` "▶ Watch the intro" next to the Try it CTA, plus a full-screen lightbox modal that opened on click (autoplay-with-sound + ESC + backdrop-click close + body scroll lock). Shipped in `85b0ee7e`... then immediately ripped out in the same commit when the user pivoted.

**Iteration 3 (FINAL — commit `85b0ee7e`):** the click-to-play pattern was wrong for the actual user goal — "people landing on the page want to know what Montree is before anything else." Pivoted to:

- **Corner autoplay video** in the hero, `position: absolute; top: 32px; left: 32px`. Hero now has `position: relative` so the corner anchors to it. Width: `clamp(260px, 28vw, 360px)`.
- **Autoplay muted loop playsInline**, `preload="auto"`. Visible from first paint, runs ambient in the corner.
- **Self-contained EN / 中文 toggle** overlaid on the video frame's bottom-right. Local `useState<'en' | 'zh'>('en')` — INDEPENDENT of the page-wide LanguageToggle in the nav. A French principal browsing the site shouldn't be forced into the English video, and we don't want the EN video to vanish the moment someone clicks 中文 on the UI toggle.
- **`key={src}` on the `<video>`** so React rebuilds the player when the user flips EN ↔ 中文 — without it the old buffer + playhead point at the previous locale's MP4 and the new src never loads.
- **Mobile (≤640px):** corner video drops to `position: static` and flows into normal layout above the centered text. Sized to `min(280px, 75vw)` so it doesn't dominate the small viewport.

**Iteration 3b (`e6d7bfa0`):** user uploaded a tighter 45s/13MB short version of the EN video, better suited to autoplay-on-load (less buffer wait, less awkward looping). Replaced in place at `/public/montree-splash-video.mp4`. Poster regenerated.

### D. 2 ms flash bug — root cause + fix

User reported: "the video flashes for about two milli seconds and then cuts out." Diagnosed as the `IntersectionObserver` reveal pattern racing the `<video>`'s first paint.

Pattern in `addReveal()`:
1. React paints the section at default `opacity: 1`.
2. Ref callback fires post-commit, sets `opacity: 0` + `transition: 0.7s`.
3. IntersectionObserver fires when in viewport, sets `opacity: 1` with transition.

For sections below the fold (editorial blocks, closing, bottom quote) this is invisible. For the inline video section that sat right under the hero — on tall monitors, immediately visible — the paint at opacity 1 → snap to 0 → fade to 1 was visible as a flash.

**Fix:** the corner video container in the final design deliberately does NOT use `ref={addReveal}`. Static `opacity: 1` from CSS default, visible from first paint. Reveal animation is preserved for the hero text stack, editorial blocks, closing CTA, and bottom quote — they continue to fade in cleanly because they're either below the fold or part of a slower-loading text block.

### E. `.gitignore` narrow carve-out (commit `9f36ce6c`)

Global `*.mp4` block in `.gitignore` (line 50) was blocking the splash video. The video-manager pattern elsewhere in the codebase routes videos through Supabase Storage, but for a marketing splash video shipping in the deploy itself is simpler.

Added a one-line negation after the `*.mp4` block:

```
# Splash page marketing videos — narrow carve-out from the *.mp4 block above.
# Per-locale brand statements shown on /montree (the public landing). Kept
# in git so they ship with the deploy, instead of routing through Supabase
# Storage like the Whale Class videos. Each file is ~20 MB; only the splash-
# video pattern is allowed. Don't widen this glob.
!public/montree-splash-video*.mp4
```

Covers `montree-splash-video.mp4` (en) and `montree-splash-video-zh.mp4` (zh). Add more locales by dropping `montree-splash-video-<locale>.mp4` into `/public/`.

### F. HeyGen explainer script (delivered via parallel agent — not in git)

User asked for a long-form HeyGen explainer + promo script to be written in parallel while the splash work continued. Delivered ~750 words / ~5 minutes spoken, walking through all 12 major features (the photo→observation flip, Weekly Wrap reports, Tracy, Guru, the growing brain, 12-language localisation, library tools, parent portal, principal cockpit, voice onboarding, pricing). Both brand phrases worked in ("the AI Montessori classroom revolution" at top + close, "work smarter, not harder" near the end). Founder name NOT mentioned (just "a practicing AMS-certified Montessori educator"). Ready-to-paste prose with no scene markers.

Script paste-target: HeyGen Builder → Script to Video → 8 credits per render.

The script is in the final assistant message of this conversation, not saved to a file. If a future session wants it persisted, copy from the chat transcript.

---

## Architectural rules locked in this session

**Rule #248: Splash brand video lives at `/public/montree-splash-video.mp4` (en) and `/public/montree-splash-video-zh.mp4` (zh).** Narrow carve-out from the global `*.mp4` gitignore block. Each new locale adds ~13–40 MB to the repo — pause and evaluate before widening past 2–3 locales.

**Rule #249: Per-locale splash video poster is auto-extracted at t=2s** via `ffmpeg -ss 2 -i <video>.mp4 -frames:v 1 -q:v 3 <poster>.jpg`. Stored at `/public/montree-splash-video<-locale>-poster.jpg`. Required so the `<video>` element has something to show before metadata loads.

**Rule #250: The splash video EN/中文 toggle is INDEPENDENT of the page-wide LanguageToggle.** Local `useState<'en' | 'zh'>('en')` in `MontreeLanding`. Indexing into `SPLASH_VIDEOS` constant. EN/中文 only because that's all we currently have content for — adding French/Japanese/etc. requires uploading another MP4 + adding a key to `SPLASH_VIDEOS`. The page-wide LanguageToggle continues to drive UI strings across 12 locales independently.

**Rule #251: The hero's corner video MUST NOT use `ref={addReveal}`.** The JS-set opacity pulse races the `<video>` element's first paint and produces the 2 ms flash. Static `opacity: 1` from CSS default is the canonical reliable pattern for any element that mounts a `<video>` above the fold. Other above-the-fold elements without `<video>` content can keep the reveal pattern without issue.

**Rule #252: `<video>` element on a locale-switch surface MUST use `key={src}` so React unmounts + remounts on src change.** Without it the player keeps the old buffer + playhead position and the new src never loads. Same pattern applies to any future per-locale media element.

**Rule #253: Browser autoplay requires `muted` attribute set.** Adding it means users who want sound have to interact — which won't happen on an ambient corner clip with no audio control. Accept the trade-off: corner videos are silent by design. If audio matters, build a lightbox/modal that plays with sound on user gesture.

**Rule #254: About page Schema.org JSON-LD MUST NOT include a named `founder` Person field.** Tying Montree Limited to a specific named individual on a public surface (with the Schema.org graph being machine-readable) lets schools cross-reference the founder to a specific classroom. The platform is operated by Montree Limited; the human behind it doesn't need a public byline.

**Rule #255: SSH push of pack files containing 20+ MB binary assets is unreliable on the current network.** Three times this session a push containing the splash MP4 dropped mid-stream with `send-pack: unexpected disconnect`. Mitigation: split commits so code changes ship first (small pack, definitely succeeds) and asset commits come second (larger pack, may need 1–3 retries). Retry with `GIT_SSH_COMMAND='ssh -o ServerAliveInterval=15 -o ServerAliveCountMax=10'` if it keeps failing.

---

## Migrations

**None this session.** All work was frontend + asset + i18n.

Migration 233 from Session 128 (`school_terms_and_timezone`) confirmed live in production per Session 129's Web-Claude tests. No carry-over pending here.

---

## Next-session priorities (ordered)

1. **🚨 Verify on production after Railway settles.** Open `montree.xyz`, expect:
   - Corner video autoplaying muted on page load (visible top-left of hero, under nav)
   - EN / 中文 toggle pills on the bottom-right of the video — click 中文 → video swaps to the 1080p Chinese cut
   - Hero text stays centered ("Montree" / italic tagline / "Try it" / "Work smarter not harder" kicker)
   - Page-wide LanguageToggle in nav does NOT affect the video (independent)
   - Mobile (test on iPhone 390px): video drops above the centered text, doesn't overflow
   - No 2 ms flash on the video (the reveal-race fix)
   - About page (`/montree/about`) shows "a practicing AMS-certified Montessori educator", no mention of founder name or Beijing or PreK 4

2. **HeyGen video render** — paste the script from the prior assistant message into HeyGen Builder → Script to Video. 8 credits. The user has the "GB - Riley" voice setup elsewhere in the project. After render, drop the MP4 into `/public/montree-explainer.mp4` and wire it into the splash page... OR just use it as a marketing asset on YouTube / TikTok / LinkedIn. Product call.

3. **Decide on more locale variants of the splash video.** Each adds 15–40 MB to the repo. Worth it for top-of-funnel locales (French / Japanese / Korean) where Montessori adoption is strong; not worth it for trailing locales (Ukrainian / Russian) until there's signal.

4. **Optional: corner video tap-to-unmute affordance.** Current state is silent-by-design. If user feedback says "let me hear it," add a small mute/unmute toggle next to the EN/中文 pills.

5. **Carry-overs from Session 129** (untouched this session):
   - Class Progress body i18n batch (~20 keys × 12 locales)
   - Mobile eyes-on test on iPhone 390px for the Classroom Overview 4-tab strip
   - Optional deeper Calendar consolidation (recurring availability + time-away inside Universal Calendar)
   - System-wide tz sweep (rule #228)
   - Parent-portal Calendar nav link
   - Multi-school parent picker
   - Rate-limit `/api/montree/calendar`

---

## File index

| Path | Status | Lines |
|---|---|---|
| `app/montree/page.tsx` | MOD | +158 / −87 net across 6 commits (final state: corner video + EN/中文 toggle + locale-agnostic constants) |
| `app/montree/about/page.tsx` | MOD | Founder Person field removed from JSON-LD; visible name + Beijing/PreK4 line replaced with generic phrasing; metadata + OG + Twitter descriptions de-personalized |
| `.gitignore` | MOD | +6 lines (carve-out for `public/montree-splash-video*.mp4`) |
| `lib/montree/i18n/en.ts` | MOD | `landing.hero.title` → "Montree", `landing.hero.tagline` NEW key, `landing.hero.kicker` → "Work smarter not harder" |
| `lib/montree/i18n/{zh,es,de,fr,pt,nl,it,ja,ko,uk,ru}.ts` | MOD × 11 | Same 3 keys translated per-locale (real translations, not English fallback) |
| `public/montree-splash-video.mp4` | NEW (replaced mid-session) | 13 MB H.264/AAC, 720p, 45s — short version |
| `public/montree-splash-video-poster.jpg` | NEW (regenerated mid-session) | 73 KB, t=2s frame |
| `public/montree-splash-video-zh.mp4` | NEW | 39 MB H.264/AAC, 1080p, 55s — Chinese version |
| `public/montree-splash-video-zh-poster.jpg` | NEW | 128 KB, t=2s frame |
| `docs/handoffs/SESSION_130_HANDOFF.md` | NEW (this doc) | Session ledger |

---

## Verification status (final)

- ✅ All 6 commits on `origin/main`. Railway auto-deploys triggered throughout.
- ✅ Lint clean (`--max-warnings=0`) on every changed code file.
- ✅ TypeScript clean — `tsc --noEmit -p .` reports zero `app/montree/page.tsx` errors.
- ✅ i18n strict parity 12/12 locales at 100% (5,035 keys each).
- ✅ Grep for stale refs (`SPLASH_VIDEO_BY_LOCALE`, `lightboxOpen`, `m-pill-ghost`, `m-lightbox`, `m-splash-video`, `watchIntro`): zero hits in `app/montree/page.tsx`.
- ✅ Grep for `Tredoux|Willemse` on `app/montree/page.tsx` + `app/montree/about/page.tsx`: zero hits.
- ✅ CSS class names ↔ JSX consumers cross-verified: every class defined has a use; every JSX class has a definition.
- ✅ All imports used (useState + useRef + useEffect + Link + useI18n + LanguageToggle + MontreeLogo).
- ✅ HeyGen script delivered (~750 words, paste-ready).
- ⏳ Production eyes-on verification on `montree.xyz` (Railway redeploy ~1–3 min after final push).
- ⏳ Mobile eyes-on at true 390px (Tredoux's iPhone).

---

**End of Session 130.**
