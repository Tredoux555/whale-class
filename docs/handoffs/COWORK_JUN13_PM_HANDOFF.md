# Cowork Session Handoff — Jun 13, 2026 (PM)

Quick-pickup doc for the afternoon/evening Cowork session. Two halves:
**(1) what was done + what's still open**, and **(2) the Montree marketing-video
production guide** (Midjourney images → Kaiber animation) to tackle tomorrow.

---

## PART 1 — Session summary

### ✅ Story vault mobile fix — SHIPPED to production
The `fix/story-vault-mobile-jun13` branch was **merged to `main` (fast-forward,
`3a5623fe → 5764c3a1`) and pushed** — Railway auto-deploys. This carried the
**entire 25-commit overnight burn**, so the `MORNING_RUNBOOK_JUN13.md` merge
step (#1) is now DONE.

Root cause of "vault media won't show on phone": the fix existed but was never
deployed. Production was still serving the old code where vault **videos**
downloaded the whole encrypted file and AES-decrypted it into the iOS webview
before the first frame (WKWebView stalled), and **images** pulled full-res
originals through the throttled decrypt proxy. The branch fixes both:
- Videos stream via **Range/206** (seekable, native iOS playback). Plain/large
  videos use a 1h signed URL; existing encrypted videos stream via the
  decrypt-proxy `download/[id]` route (now reads `?at=`/`?vt=` query tokens so a
  bare `<video src>` can authenticate).
- Images get a small **~480px JPEG thumbnail** in the grid (`/vault/thumbnail/[id]`);
  full-res only loads when the viewer opens.

### ✅ Migrations run (by Tredoux, Supabase whale-class) — runbook SQL step (#2) DONE
- **256** — `vault_files.thumbnail_path` (REQUIRED for the vault fix; without it
  the list query 500s → empty grid on every device).
- **254** — `montree_campaign_items` (unblocks Campaign Command Center, was 503ing).
- **255** — `montree_push_outbox` + `montree_parents.notification_prefs`.
- **249** — `montree_home_practice_cards` + `home_practice_cards` feature flag.

### ✅ Also now live (rode the same merge)
`/support` page + games "Who's playing?" child-picker (Apple-review blockers),
story security hardening (rate-limiter fail-closed + bcrypt step-up on
destructive admin controls), splash/dashboard perf pass, push notifications
(APNs HTTP/2 reuse + durable outbox + parent prefs), tsc 5,250→743, tests 9→143.

### ✅ Loom uninstalled from the Mac
App moved to Trash; leftover support files removed from `~/Library/`:
Application Support/Loom, Caches/com.loom.desktop + loom-updater,
Preferences/com.loom.desktop.plist, HTTPStorages/com.loom.desktop, Logs/Loom.
No Loom LaunchAgent present.

### ✅ Marketing assets drafted
- HeyGen script finalized + tightened to **4774 chars** (under HeyGen's 5000 cap).
  Final version pasted in chat; clean, natural, no stage directions.
- Video scene guide → see **Part 2** below.

---

## PART 1b — Still OPEN (next actions)

1. **Verify the vault on a phone** once Railway finishes deploying: unlock vault →
   photos load fast in grid + open full-res; tap a video → it streams/plays
   instead of hanging.
2. **Loom login item** — the only Loom remnant left. System Settings → General →
   Login Items → remove any Loom row. Harmless (app is gone) but tidy. The
   System-Settings access prompt timed out during the session, so it wasn't done.
3. **Cloudflare Error 1034 (intermittent)** — flip `montree.xyz` + `www` to
   **DNS only** (grey cloud). 2 min, VPN on. Steps in `docs/DNS_ERROR_1034_FIX.md`.
4. **Apple review** (review is LIVE): verify demo codes on a real device
   (principal **WYXMN9** / teacher **BAM4S9**), **extend the demo trial past
   Jun 19** (`trial_ends_at`) or the reviewer hits expiry, recapture the 2 weak
   screenshots, confirm `support@montree.xyz` receives mail.
5. **Railway env confirm** (no NEW var needed by this merge, but the hardening
   assumes they exist): `VAULT_PASSWORD`, `VAULT_PASSWORD_HASH`, `STORY_NUKE_CODE`,
   `STORY_JWT_SECRET`, `MONTREE_JWT_SECRET`.
6. **Separate repos, untouched:** `jeffy-mvp` (`security-fixes-jun13`, needs env +
   review) and Guardian Connect (`flutter-catchup-jun12`). See `MORNING_RUNBOOK_JUN13.md`.

---

## PART 2 — Montree Marketing Video: Midjourney → Kaiber

The plan: generate each scene as a still in **Midjourney**, then animate it in
**Kaiber**. This is b-roll to run under the HeyGen voiceover (the final script).

### Two decisions to make first
- **Aspect ratio:** prompts use `--ar 16:9` (landscape). For Reels / TikTok /
  Shorts, change every `--ar 16:9` to `--ar 9:16`, and set Kaiber's canvas to 9:16.
- **Character consistency:** generate your "teacher" once, then reuse that image
  with Midjourney's `--cref <image-url>` on every later teacher scene so it's the
  same person throughout.

### Midjourney notes
- Each prompt ends with the **same style signature** so the whole film looks like
  one piece — keep it identical across scenes.
- Midjourney can't spell, so no scene asks for readable words/UI text. Add real
  text/logos later in your editor.
- Generate a few variations per scene and upscale the best before taking it to Kaiber.

**Style signature (append to every prompt):**
`cinematic, warm natural light, shallow depth of field, photorealistic, subtle film grain, muted earthy palette of warm wood tones, sage green and soft gold, calm and human --ar 16:9 --style raw`

### Kaiber notes (how to read each "Kaiber:" line)
Use Kaiber's **image-to-video / Motion** flow: upload the Midjourney still as the
starting image, paste the **motion prompt**, then set the controls. (Exact labels
shift between Kaiber versions — map these to whatever your version calls them.)
- **Camera** — the move (zoom in/out, pan L/R, tilt, slow push). Keep it gentle.
- **Motion strength** — how much movement. LOW–MEDIUM for these photoreal shots.
- **Evolve / Transform strength** — how much the image is allowed to morph. Keep
  **LOW** so faces/objects stay stable and don't melt. (Higher only on the
  morph/dissolve scenes that *want* transformation — noted per scene.)
- **Duration** — 4–6s each is plenty; you'll trim to the VO in editing.
- Render, and if a face/hand distorts, lower motion/evolve and re-run.

---

### Scene 1 — "With every step in technological development… wow."
**MJ:** A person's face lit by the soft glow of a screen just out of frame, eyes wide with genuine wonder and a faint smile, dark room, light reflecting in their eyes, intimate close-up, [style signature]
**Kaiber:** Camera = slow push-in. Motion LOW, evolve LOW. Motion prompt: "eyes widen slightly, faint smile grows, light flickers gently on the face." 5s.

### Scene 2 — "Remember the iPod? CDs? Stiffies and floppy disks."
**MJ:** A flat-lay of vintage technology relics on weathered wood — a classic white music player, a stack of CDs catching rainbow light, 3.5-inch floppy disks — soft window light, nostalgic still life, a thin layer of dust, [style signature]
**Kaiber:** Camera = slow top-down drift (slight pan). Motion LOW, evolve LOW. Prompt: "dust motes float through the light beam, faint rainbow shimmer moves across the CDs." 5s.

### Scene 3 — "That is what Montree is to Montessori."
**MJ:** A warm sunlit Montessori classroom, a young child fully absorbed kneeling on a small mat working with natural wooden learning materials, soft morning light through tall windows, ordered wooden shelves behind, documentary feel, [style signature]
**Kaiber:** Camera = static / very slow push. Motion LOW, evolve LOW. Prompt: "the child's hands gently move a wooden piece into place, dust and light shift softly." 5s.

### Scene 4 — "Before, we wrote things on paper — the floppies."
**MJ:** Close-up of a teacher's hands writing observation notes with a pen on a paper clipboard form, stacks of handwritten records beside, warm desk-lamp light, slightly old-fashioned mood, [style signature]
**Kaiber:** Camera = static. Motion LOW, evolve LOW. Prompt: "the pen hand writes a line across the page, paper edges flutter faintly." 4s.

### Scene 5 — "The digital programs — those are the CDs."
**MJ:** A laptop open on a classroom desk showing a soft glowing abstract data dashboard with charts and grids, no legible text, cool screen glow mixing with warm room light, over-the-shoulder angle, [style signature]
**Kaiber:** Camera = slow push toward the screen. Motion LOW–MEDIUM, evolve LOW. Prompt: "charts on the screen subtly animate and shift, ambient glow pulses." 4s.

### Scene 6 — "And now, AI is here."
**MJ:** A softly glowing network of warm golden light threads and nodes drifting gently above a wooden Montessori classroom, ethereal intelligent presence, dreamlike, no text, [style signature]
**Kaiber:** Camera = slow drift up. Motion MEDIUM, evolve LOW–MEDIUM. Prompt: "the light threads pulse and weave together, soft particles rise." 5s.

### Scene 7 — "I fail to understand how a picture can replace an observation."
**MJ:** A person looking doubtful and skeptical at a glowing screen out of frame, slight frown, soft side light, intimate close-up, [style signature]
**Kaiber:** Camera = very slow push. Motion LOW, evolve LOW. Prompt: "a small skeptical frown, a slow blink, light flickers on the face." 4s.

### Scene 8 — "Just like I doubted an iPod would replace a Walkman."
**MJ:** A vintage cassette Walkman and a classic white music player side by side on a clean surface, soft studio light, nostalgic product still life, [style signature]
**Kaiber:** Camera = slow pan across the two. Motion LOW, evolve LOW. Prompt: "gentle glint of light travels across both devices." 4s.

### Scene 9 — "Just take a picture, and the system does the rest."
**MJ:** Over-the-shoulder view of a teacher holding up a smartphone to photograph a child working with wooden materials on a mat, the phone framing the scene, warm classroom light, candid documentary moment, [style signature]
**Kaiber:** Camera = static with tiny handheld sway. Motion LOW–MEDIUM, evolve LOW. Prompt: "a brief camera-shutter flash on the phone screen, the phone steadies." 4s.

### Scene 10 — "The AI recognises the work and where it fits in the child's progress."
**MJ:** Close-up of a smartphone screen in a hand showing a softly glowing abstract progress visualization — a growing tree of light with gold nodes lighting up in sequence, no legible text, warm blurred classroom behind, [style signature]
**Kaiber:** Camera = slow push to screen. Motion MEDIUM, evolve LOW. Prompt: "nodes on the tree light up one after another, branches gently grow." 5s.

### Scene 11 — "As if Maria herself were observing that one child."
**MJ:** A single child working at a low table, beside them a translucent ghostlike figure of an early-1900s female educator in a long period dress quietly observing with warm attention, dreamlike double-exposure feel, soft golden light, respectful and gentle, [style signature]
**Kaiber:** Camera = static / barely-there push. Motion LOW, evolve LOW (keep the figure stable). Prompt: "the translucent figure shifts almost imperceptibly, the child keeps working." 5s.

### Scene 12 — "You tap the microphone and talk softly into the phone."
**MJ:** Close-up of a teacher holding a phone near their mouth speaking softly, a glowing warm-light microphone icon on the screen, soft sound-wave ripples emanating, quiet intimate classroom moment, [style signature]
**Kaiber:** Camera = static. Motion LOW–MEDIUM, evolve LOW. Prompt: "sound-wave ripples pulse outward gently from the mic icon as the person speaks." 4s.

### Scene 13 — "A parents' meeting. Difficult child, unrealistic expectations."
**MJ:** A teacher seated across a wooden desk from two tense parents in a quiet meeting room, slightly strained body language, parents leaning in expectantly, soft window light, emotionally charged but restrained, [style signature]
**Kaiber:** Camera = slow push toward the teacher. Motion LOW, evolve LOW. Prompt: "small tense shifts in posture, a slow breath." 5s.

### Scene 14 — "You open the Guru — your personal AI helper."
**MJ:** Over-the-shoulder of a teacher at an open laptop during a meeting, the screen casting a calm warm golden glow on their face, quiet reassurance, blurred parents across the table, [style signature]
**Kaiber:** Camera = slow push. Motion LOW, evolve LOW. Prompt: "the warm glow gently breathes brighter, the teacher's shoulders relax." 5s.

### Scene 15 — "Trained on child and developmental psychology too."
**MJ:** A stack of worn psychology and child-development books on a desk dissolving at the edges into drifting motes of golden light that rise into a soft glow, knowledge becoming intelligence, no legible text on spines, [style signature]
**Kaiber:** Camera = slow push. Motion MEDIUM, evolve MEDIUM (this one *wants* transformation). Prompt: "the book edges dissolve into rising particles of warm light." 5s.

### Scene 16 — "The parents smiled, maybe for the first time."
**MJ:** Two parents across a desk breaking into genuine relieved smiles, warm and soft, a teacher's out-of-focus shoulder in foreground, emotional release, golden afternoon light, [style signature]
**Kaiber:** Camera = static / tiny push. Motion LOW, evolve LOW. Prompt: "their expressions soften from neutral into warm genuine smiles." 5s.

### Scene 17 — "So I grew the system. I'm now a developer."
**MJ:** A teacher sitting at night before two monitors glowing with soft abstract lines of code, a wooden classroom dimly visible behind, focused and quietly proud, warm desk lamp, no legible text, [style signature]
**Kaiber:** Camera = slow push. Motion LOW–MEDIUM, evolve LOW. Prompt: "code lines scroll softly up the monitors, the person types." 5s.

### Scene 18 — "Would have cost over a million dollars and a team of coders."
**MJ:** A single person at a small desk with a laptop, behind them a vast translucent ghostly blueprint of an enormous complex system filling the room, scale contrast of one against the immense, awe, cool blueprint glow against warm desk light, [style signature]
**Kaiber:** Camera = slow pull-back to reveal scale. Motion MEDIUM, evolve LOW–MEDIUM. Prompt: "the giant blueprint slowly assembles and rotates behind the small figure." 5s.

### Scene 19 — "A full school management system — 80 to 90 percent less work."
**MJ:** A principal's desk: one side chaotic with towering paper stacks and sticky notes, the other side calm, clean and ordered with a single glowing tablet, transformation from overwhelm to calm, soft office light, [style signature]
**Kaiber:** Camera = slow pan left→right (chaos to calm). Motion MEDIUM, evolve MEDIUM. Prompt: "paper stacks dissolve and clear away, revealing the calm ordered desk." 5s.

### Scene 20 — "Weekly updates — written for a few cents, better than I could."
**MJ:** A parent at home reading a warm beautifully written report on their phone, soft genuine smile, cozy domestic evening light, a child playing softly in the blurred background, [style signature]
**Kaiber:** Camera = slow push. Motion LOW, evolve LOW. Prompt: "the parent's thumb scrolls the phone, their smile grows." 4s.

### Scene 21 — "15 hours a week just to write reports? Not possible."
**MJ:** An exhausted teacher at a desk late at night surrounded by a large wall clock and an endless pile of paperwork, heavy tired mood, single warm lamp in darkness, [style signature]
**Kaiber:** Camera = slow push to the clock. Motion MEDIUM, evolve LOW. Prompt: "the clock hands spin quickly forward, the paper pile subtly grows." 4s.

### Scene 22 — "Like the cellphone wasn't possible in the age of the landline."
**MJ:** An old rotary landline telephone on a table gently dissolving and transforming into a sleek modern smartphone, particles of light bridging the two, evolution in one frame, soft studio light, [style signature]
**Kaiber:** Camera = static / slow push. Motion MEDIUM, evolve HIGH (this scene is the morph). Prompt: "the rotary phone morphs and dissolves into a modern smartphone." 5s.

### Scene 23 — "Montree is the new standard." (closing hero)
**MJ:** A confident content teacher standing in a sunlit Montessori classroom at golden hour holding a phone, looking toward bright open windows, a single small green sprout growing in warm light in the foreground, hopeful and clean, hero shot, [style signature]
**Kaiber:** Camera = slow push toward the windows. Motion LOW–MEDIUM, evolve LOW. Prompt: "light blooms warmer, the sprout's leaves drift gently." 6s. (Add the "Montree — the new standard / Montree.xyz" text over this shot in your editor.)

---

### Final script reference (for the VO, 4774 chars — fits HeyGen)
The finalized HeyGen script is in the chat history of this session. If re-pasting:
it opens "With every step in technological development, we're like — wow…" and
closes "Montree — the new standard. Montree.xyz." Keep the dashes/ellipses — HeyGen
reads them as natural pauses.
