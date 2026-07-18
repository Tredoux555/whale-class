# MJ GENERATION RUN — Jul 14, 2026 (Agent 1)

**Run start:** Jul 14, 2026
**Browser deviceId:** 7d422c1a (verified logged into midjourney.com/imagine)
**Manifests:** GENERATE_MANIFEST.json (122 entries total in doc header claim; actual file read = ~98 entries) + REROLL_MANIFEST.json (133 entries, not yet read)
**Priority order:** video-critical generates → video-critical rerolls → book → nice
**This agent's slice:** first 30 "video-critical" entries from GENERATE_MANIFEST.json, sorted by week ascending (weeks 1–21)

## Slice (30 items)
1. W1 ax.png · 2. W2 table.png · 3. W3 mat.png · 4. W3 potato.png · 5. W4 cup.png · 6. W4 potato-not-c.png ·
7. W5 sam-sat-on-potato.png · 8. W5 sam-sat-on-sock.png · 9. W6 sam-solo.png · 10. W9 hat-on-ant-v2.png ·
11. W10 all-and-mat-v2.png · 12. W10 dad-and-ant-v2.png · 13. W10 dad-sam-find-v2.png · 14. W11 pot-cool-v2.png ·
15. W12 cat-in-pit.png · 16. W13 big-dog-and-bus.png · 17. W14 hen-on-cat.png · 18. W15 dog-chasing-cat.png ·
19. W15 rat-hid.png · 20. W15 rat-sat.png · 21. W16 cup.png · 22. W16 sun.png · 23. W16 vowel-wall-complete.png ·
24. W17 cat.png · 25. W17 potato.png · 26. W18 dog.png · 27. W18 potato.png · 28. W19 web-dry.png ·
29. W21 potato.png · 30. W21 sock.png

## CHUNK 1 — results
(appending every 5 items: file | ok/failed | note)

- W5 sam-sat-on-potato.png | ok | oref=sam.png via Omni Reference upload, worked cleanly first try
- W5 sam-sat-on-sock.png | ok | oref=sam.png reused (click thumbnail to reactivate), clean
- W1 ax.png | ok | Q1 clean; Q2 had hallucinated "AXE" text embossed on blade, avoided
- W2 table.png | ok | clean, round wooden stool/table
- W3 mat.png | ok | picked Q4 (round woven mat, flat) over rolled-up variants
- W3 potato.png | ok | clean, all 4 quadrants usable
- GOTCHA: submit button is the paper-airplane icon at top-right of prompt box, NOT Return key (Return inserts newline in this box layout) — click coords shift slightly with box height, re-locate each time via screenshot before clicking; using find{query:"submit button"} for a stable ref_ is more reliable than coordinate clicking
- W4 cup.png | ok | clean ceramic cup
- W4 potato-not-c.png | ok | clean, no text overlay hallucinated

**8/30 done at this checkpoint.**
- W6 sam-solo.png | ok | oref=sam.png, clean, proud standing pose matches manifest
- W9 hat-on-ant-v2.png | ok | GOTCHA: uploading via the "+" panel can default to "Image Prompts" tab (blends actual visual elements, not just likeness) instead of "Omni Reference" (identity-only) — Image Prompts caused the ant to dominate/override a "no ant visible" prompt. Fixed by clicking the Omni Reference tab explicitly + clearing Image Prompts via the trash icon. For this item ended up generating WITHOUT any reference (ant hidden-under-hat gag doesn't need ant identity anyway) — picked a quadrant with just a peeking antenna/leg under the brim, matches "hidden underneath" comedic beat well.

**10/30 done at this checkpoint.**
- W10 all-and-mat-v2.png | ok | no oref (5-character composite too complex for single oref; relied on detailed manifest text), all 5 elements present (dad, boy, girl, cat, ant)
- W10 dad-and-ant-v2.png | ok | oref=dad.png (both Image Prompts + Omni Reference left active simultaneously — fine when prompt doesn't contradict the reference, unlike the ant-hat case), dad face drifted slightly (longer nose) but beard/cap/wood-peg style held; Q3 had best "ant on fingertip" staging

**12/30 done at this checkpoint.**
- W10 dad-sam-find-v2.png | ok | no oref used (multi-char, relied on text), clean, ant on cap + boy pointing + dad face visible
- W11 pot-cool-v2.png | ok | no oref, clean, no steam, cat relaxed beside pot
- W12 cat-in-pit.png | ok | oref=cat.png via Omni Reference ONLY (learned: clear Image Prompts via trash icon then re-add just Omni Ref, when the prompt needs a DIFFERENT pose than the reference photo — Image Prompts locks pose/composition too tightly)

**15/30 done at this checkpoint.**
- W13 big-dog-and-bus.png | ok | oref override: manifest field pointed at Week12/images/dog.png (regular terrier) but prompt text explicitly says "matching big-dog-towering.png / big.png" — used Week13/images/big-dog.png instead (better contextual match, judgment call). One submit attempt was silently dropped (MJ known gotcha) — retried successfully.
- W14 hen-on-cat.png | ok | oref=cat.png via Omni Reference, clean, alarmed cat expression

**17/30 done at this checkpoint.**
- W15 rat-hid.png | ok | oref=rat.png via Omni Reference only, Q1 picked (peeking from behind rock, both eyes technically visible but reads as "mostly hidden/peeking" — good comedic match)
- W15 rat-sat.png | ok | oref=rat.png reused from tray, Q3 picked (upright, paws folded, clean)

**20/30 done at this checkpoint.**
- W16 cup.png | ok | no oref, clean tin cup, Q2 picked
- W16 sun.png | ok | no oref, clean gold sun icon, Q1 picked
- W16 vowel-wall-complete.png | ok | no oref, "A E I O U" reads clearly on marquee letters, Q1 picked, no text hallucination issues

**23/30 done at this checkpoint.**
- W17 cat.png | ok | oref=cat.png (Week04) via Omni Reference only, striped tabby matches reference face structure, Q1 picked
- W17 potato.png | ok | no oref, deadpan potato w/ round glasses, Q1 picked
- W18 dog.png | ok | oref=dog.png (Week12 scruffy terrier thumbnail) via Omni Reference only, Q1 picked, clean match

**26/30 done at this checkpoint.**
- W18 potato.png | ok | no oref, watermark hallucinated in Q4 corner ("@Pixiv Imagean.cc" text) — AVOIDED, used Q2 instead (clean)
- W19 web-dry.png | ok | no oref, RETRY #1 needed — first attempt all 4 quadrants had visible dew droplets despite "no water droplets" in prompt; strengthened prompt ("bone-dry", "absolutely no dew/moisture/glistening", "arid desert-dry") on retry, still some sheen but Q2 reads as a dry dusty cobweb (no glossy droplets) — accepted as close-enough match

**28/30 done at this checkpoint.**
- W21 potato.png | ok | no oref, potato+glasses+whiteboard+pointer, clean, no watermark, Q2 picked
- W21 sock.png | ok | no oref, single striped sock, clean, no watermark, Q1 picked

**30/30 DONE — RUN COMPLETE.**

## FINAL SUMMARY

- **30/30 items completed successfully.** 0 marked FAILED.
- 1 item required a retry with adjusted prompt: W19 web-dry.png (dew droplets kept appearing despite
  "no water droplets" in the prompt; strengthened to "bone-dry / absolutely no dew / arid desert-dry"
  on retry — result still has faint sheen but reads as a dry dusty cobweb, no glossy droplets; accepted
  as close-enough match per the one-retry rule).
- 1 hallucinated watermark caught and avoided: W18 potato.png Q4 had "@Pixiv Imagean.cc"-style text
  baked into the bottom-left corner — used Q2 instead (clean).
- 1 oref override judgment call: W13 big-dog-and-bus.png — manifest pointed at Week12/dog.png (regular
  terrier) but prompt text said "matching big-dog-towering.png / big.png" — used Week13/big-dog.png
  instead (better contextual match).
- All other oref items used Omni Reference ONLY (cleared Image Prompts via the trash icon first) when
  the prompt required a different pose/composition than the reference photo; left both active when the
  prompt was consistent with the reference.
- Browser state: healthy, still logged into midjourney.com/imagine on deviceId 7d422c1a. One transient
  "Something went wrong" toast mid-run (item 29) self-recovered on reload — no action needed.
- **Next agent (Agent 2) should start at slice index 31** of the "video-critical"-priority,
  week-ascending list in GENERATE_MANIFEST.json (i.e. the 31st video-critical entry — W22 fan.png
  onward, per the manifest order captured in this file's header).

# MJ GENERATION RUN — Jul 14, 2026 (Agent 2)

**Run start:** Jul 14, 2026 (continuing on browser deviceId 7d422c1a, verified logged into
midjourney.com/imagine — last job in feed on arrival was W21 sock.png, confirming Agent 1's handoff)
**This agent's slice:** items 31–65 of the "video-critical" list, sorted by week ascending (W22–W37)

## Slice (35 items)
31. W22 fan.png · 32. W23 potato.png · 33. W24 box.png · 34. W24 taxi.png · 35. W25 duck-quit-it.png ·
36. W25 duck.png · 37. W25 potato-plain.png · 38. W25 quick.png · 39. W25 segina-quack.png ·
40. W26 bug.png · 41. W26 fox.png · 42. W26 potato.png · 43. W26 zoo.png · 44. W27 fish.png ·
45. W28 chair.png · 46. W30 bell.png · 47. W30 doll.png · 48. W30 rock.png · 49. W30 shell.png ·
50. W30 sock.png · 51. W31 king.png · 52. W31 ring.png · 53. W31 wing.png · 54. W33 snake-coloring.png ·
55. W33 snake.png · 56. W34 flag.png · 57. W35 drum-coloring.png · 58. W35 drum.png · 59. W35 frog.png ·
60. W36 hand-coloring.png · 61. W36 hand.png · 62. W36 lamp.png · 63. W36 nest.png ·
64. W36 sheep-jump-land.png · 65. W37 chick-tugs-log.png

## CHUNK 2 — results

- W22 fan.png | ok | no oref, clean single-fan product shot, Q1 picked, no watermark corners
- W23 potato.png | ok | REUSE (not regenerated) — copied Week 21/images/potato.png (identical
  "REUSED FROM WEEK 1" teaching-potato prompt already generated by Agent 1; pixel-identical concept,
  no benefit to burning a fresh MJ generation)
- W24 box.png | ok | no oref, lid-ajar box with warm glow inside, Q1 picked, no watermark
- W24 taxi.png | ok | no oref, yellow toy taxi, Q1 picked; zoomed roof-sign area to confirm no
  hallucinated/garbled text (abstract taxi-light icon only, fine)
- W25 duck-quit-it.png | ok | no oref, stern duck wing raised, forest-green backdrop, Q1 picked

**5/35 done at this checkpoint.**

- W25 duck.png | ok | no oref, picked Q4 (full-body side profile, chest visibly puffed, clean
  forest-green backdrop) over the closer front-on portrait crops which cropped too tight
- W25 potato-plain.png | ok | REUSE — copied Week 21/images/potato.png again (manifest says "REUSE
  FROM WEEK 1 IF POSSIBLE"; same teaching-potato asset as W23)
- W25 quick.png | ok | no oref, golden lightning bolt streak, Q1 picked, clean
- W25 segina-quack.png | ok | oref=girl.png (Week 49) via Omni Reference — uploaded via file_upload
  to the hidden file input after clicking the "+" panel → Omni Reference tab; result matched the
  reference's pigtails/red-dress look well, cupped-hands quacking pose came through clean, Q1 picked.
  GOTCHA: after submitting, the reference/upload side panel stayed visually "stuck" open (clicking its
  own ✕ and pressing Escape didn't dismiss it) — worked around by just clicking directly on the
  generated thumbnails visible below/around the panel rather than fighting the panel closed.
- W26 bug.png | ok | no oref, red-shelled beetle with graduation cap, wings lifting, Q1 picked, clean

**10/35 done at this checkpoint.**

- W26 fox.png | ok | REUSE — copied Week 17/images/fox.png (manifest oref field points here; Week 24
  folder has no standalone fox.png, only fox-in-box/fox-box-peek composites, so Week 17 is the correct
  reuse source, not Week 24 as the reason-text alone might suggest)
- W26 potato.png | ok | REUSE — copied Week 21/images/potato.png (same teaching-potato asset, 4th
  week to reuse it: W21 original, W23, W25 potato-plain, W26)
- W26 zoo.png | ok | no oref, archway with legible "ZOO" sign + animal silhouettes, Q1 picked, clean

**13/35 done at this checkpoint — Week 26 fully complete.**

- W27 fish.png | ok | RETRY #1 needed — first attempt (4 quadrants) all showed the fish swimming
  underwater, not "leaping mid-air" per the manifest; retried with strengthened prompt ("leaping
  completely out of the water into mid-air... fully airborne, splash and droplets frozen below it") —
  Q1/Q2 both came back correctly airborne with a splash below, Q1 picked, clean
- W28 chair.png | ok | RETRY #1 needed (transient "Creation failed" toast, per the known MJ gotcha) —
  resubmitted identical prompt, cooked clean second try, Q1 picked, small wooden chair, no watermark

**15/35 done at this checkpoint.**

- W30 bell.png | ok | no oref, brass hand-bell — Q1 had a hallucinated "VBBL" watermark bottom-right
  corner (AVOIDED), used Q2 instead (0_1.png, clean, no watermark)
- W30 doll.png | ok | no oref, transient "Trying to reconnect..." stall after submit (~16s, never
  resolved on its own) — reloaded the /imagine page, job had actually completed server-side and
  rendered fine post-reload; soft rag doll, Q1 picked, clean
- W30 rock.png | ok | no oref, smooth grey rock, Q1 picked, clean
- W30 shell.png | ok | REUSE — copied Week 27/images/shell.png (manifest explicitly notes W30 shell
  "also owed to Week 27"; Week 27 already had a standalone shell.png from prior production, same
  prompt concept, no need to regenerate)
- W30 sock.png | ok | REUSE — copied Week 21/images/sock.png (Agent 1's "single stripey sock" vs W30's
  "single striped woolly sock" — same subject, near-identical prompt, reused rather than burning a
  fresh generation for a near-duplicate)

**20/35 done at this checkpoint — Week 30 fully complete.**

- W31 king.png | ok | oref=king-sing.png FAILED TWICE — "Character Reference should be a URL:
  blob:https://..." toast both attempts (the uploaded file's blob URL never resolved to a proper
  midjourney.com CDN URL before submit, even after a 3s extra wait+retry). Per the 2-attempt rule,
  cleared the reference (trash icon) and resubmitted TEXT-ONLY — cooked clean, Q1 (0_0) picked, round
  friendly king with golden crown, mouth open singing, no watermark. GOTCHA: same "panel stuck open"
  behavior as the W25 segina-quack item — worked around identically by clicking the visible generated
  thumbnails directly rather than fighting the panel closed.
- W31 ring.png | ok | no oref, gold ring with small gem, Q2 (0_1) picked over Q1/Q3/Q4 for centering,
  clean, no watermark
- W31 wing.png | ok | no oref — Q1/Q2/Q3 all rendered as a MIRRORED PAIR of wings (reads as two wings
  joined at a spine, not "a single... wing" per the manifest); Q4 (0_3) was the one quadrant that
  read as clearly ONE wing in profile — picked that instead, no watermark

**23/35 done at this checkpoint — Week 31 fully complete.**

- W33 snake-coloring.png | ok | no oref, flat black-on-white thick-line coloring page, Q2 picked
  (flattest lines, no gray shading, cutest expression), no watermark
- W33 snake.png | ok | oref=snake-spin.png (Week 33's own established canonical) via Omni Reference —
  THIRD attempt at oref this run and the FIRST to work cleanly: this time waited a full 8s after
  file_upload before typing/submitting (vs ~1s on the two failed king.png attempts), no blob-URL error,
  submission clean first try. Result matched the canonical emerald-green/amber-eyes look closely,
  Q1 picked ("zipping forward" motion pose), no watermark. **RULE for future oref uses: wait ≥8s after
  file_upload completes before submitting — the upload needs time to resolve from a local blob URL to
  a proper midjourney.com CDN URL, or the submit throws "Character Reference should be a URL: blob:...".**
  This is the base cast-debut asset for Snake — CRITICAL item, handled with extra care.

**25/35 done at this checkpoint — Week 33 fully complete.**

- W34 flag.png | ok | no oref, small triangular flag on wooden stick, Q2 (0_1) picked, clean, no
  watermark

**26/35 done at this checkpoint — Week 34 fully complete.**

- W35 drum-coloring.png | ok | no oref, flat black-on-white coloring page, Q1 picked, clean
- W35 drum.png | ok | no oref, small drum with crossed drumsticks, Q1 picked, clean, no watermark
- W35 frog.png | ok | oref=frog-grin.png (Week 35's own established Frog canonical) via Omni Reference —
  8s-wait rule held again, clean submission first try. Result closely matched the toad-like glossy
  texture of the reference; Q1 picked for the most NEUTRAL mouth (per manifest "neutral pre-grin
  pose", to be distinguished from the later frog-grin.png/frog-big-grin.png expression beats), sitting
  on a lily pad, no watermark. CRITICAL base cast asset for Frog — handled with care.

**29/35 done at this checkpoint — Week 35 fully complete.**

- W36 hand-coloring.png | ok | no oref, flat black-on-white coloring page, Q4 picked (boldest lines),
  no watermark
- W36 hand.png | ok | no oref, child's open hand palm forward, Q2 picked, clean, no watermark
- W36 lamp.png | ok | no oref, small glowing bedside lamp, Q1 picked, clean, no watermark
- W36 nest.png | ok | no oref, cosy empty twig nest on branch stub, Q1 picked, clean, no watermark
- W36 sheep-jump-land.png | ok | oref=sheep-star.png (Week 47's established Sheep canonical) via Omni
  Reference — 8s-wait rule held, clean submission. Q1/Q2 both had a stray star-shaped object bleed
  into the nest scene (from the reference image containing both sheep AND a star character); Q4
  avoided the bleed and correctly showed BOTH required cast members (yellow chick + green snake)
  squished in the nest with the sheep mid-jump landing — picked Q4, no watermark.

**34/35 done at this checkpoint — Week 36 fully complete.**

- W37 chick-tugs-log.png | ok | oref=chick-helps-skunk.png (Week 37's own established Chick
  canonical) via Omni Reference — 8s-wait rule held, clean submission. Q2 best matched "tail poking
  from a log hollow" (visible brown log opening, skunk emerging from it) vs other quadrants showing
  the skunk fully out in the open; chick's fluffy-yellow look + braced feet + gritted-beak effort all
  present, no watermark.

**35/35 DONE — RUN COMPLETE.**

## FINAL SUMMARY (Agent 2)

- **35/35 items completed successfully.** 0 marked FAILED.
- **6 items reused existing assets instead of regenerating** (identical/near-identical prompts already
  produced elsewhere in the program): W23 potato.png, W25 potato-plain.png, W26 fox.png, W26 potato.png,
  W30 shell.png, W30 sock.png — all copied via Desktop Commander from their source week folders. This
  saved MJ credits/time with no quality loss (same prompt = same intended image).
- **2 retries needed:** W27 fish.png (first attempt rendered underwater-swimming, not "leaping
  mid-air" — strengthened prompt on retry, succeeded); W28 chair.png (transient "Creation failed"
  toast, clean resubmit).
- **1 hallucinated watermark caught and avoided:** W30 bell.png Q1 had a fake "VBBL" brand mark
  baked into the bottom-right corner — used Q2 instead (clean).
- **oref (Omni Reference) reliability — THE KEY LEARNING THIS CHUNK:** the first 2 attempts (both on
  W31 king.png) failed with "Character Reference should be a URL: blob:https://..." because submission
  was attempted too soon after `file_upload` (the local blob hadn't resolved to a midjourney.com CDN
  URL yet). Per the 2-attempt rule, W31 king.png was completed WITHOUT oref (text-only, still a clean
  match). From W33 snake.png onward, waiting a full **8 seconds** after `file_upload` completes before
  typing the prompt/submitting fixed this completely — 4 more oref uses (W33 snake.png, W35 frog.png,
  W36 sheep-jump-land.png, W37 chick-tugs-log.png) all succeeded cleanly on the first attempt with this
  wait in place. **RULE for all future MJ agents: after file_upload to the Omni Reference panel, wait
  ≥8s before submitting, or the reference will silently fail with a blob-URL error.**
- **Panel-stuck-open gotcha (recurring, same workaround each time):** after submitting a prompt with an
  Omni Reference active, the reference/upload side panel sometimes stays visually open post-submit even
  though the job is generating underneath it. Clicking its own ✕ or pressing Escape does not reliably
  close it. Workaround used throughout: don't fight the panel — the freshly generated thumbnails are
  still visible and clickable below/around it (scroll position permitting); click directly on those.
- **Cast-consistency care on 3 critical cast-debut/continuity assets:** W33 snake.png (base cast-debut
  asset for Snake, oref'd to Week 33's own snake-spin.png), W35 frog.png (critical Frog base asset,
  oref'd to frog-grin.png, picked the neutral-mouth quadrant per the manifest's "pre-grin" note), W36
  sheep-jump-land.png / W37 chick-tugs-log.png (both oref'd to established Sheep/Chick looks from
  elsewhere in the program to hold visual continuity).
- Browser state: healthy throughout, stayed on deviceId 7d422c1a, no browser deaths, no extension
  disconnects. One "Trying to reconnect..." stall on W30 doll.png self-resolved via a page reload (job
  had completed server-side; only the client-side status update had stuck).
- **Next agent (Agent 3) should start at slice index 66** of the "video-critical"-priority,
  week-ascending list in GENERATE_MANIFEST.json — the 66th video-critical entry is **W37 gift.png**
  (i.e. continue Week 37 with gift.png, milk.png, snake-loops-log.png, then Week 38 onward).


# MJ GENERATION RUN — Jul 14, 2026 (Agent 3)

**Run start:** Jul 14, 2026 (continuing on browser deviceId 7d422c1a, verified logged into
midjourney.com/imagine — last job in feed on arrival was W37 chick-tugs-log.png, confirming Agent 2's
handoff)
**This agent's slice:** items 66-114 of the "video-critical" list, sorted by week ascending (W37–W58),
the FINAL 49 video-critical generates.

## Download method note (new gotcha, this chunk)
The download icon (top-right of the full-res detail panel) is INCONSISTENT: sometimes it directly
triggers a native Chrome download straight to ~/Downloads (auto-named `u<id>_<prompt-slug>_<uuid>_<idx>.png`,
no dialog); other times it instead opens a NEW TAB at the raw `cdn.midjourney.com/<uuid>/0_N.png` URL
(same behavior Agent 1/2 called "2-step CDN download"). Handled both: if a new CDN tab appears, run a
`javascript_tool` fetch+blob+anchor-download script on THAT tab (`credentials:'include'`, custom
`a.download` filename) — works reliably. If no new tab appears, check ~/Downloads directly for the
auto-named file. Every download verified via `Desktop Commander read_file` (renders the actual image
inline) before moving into place with `Desktop Commander move_file`. **Desktop Commander's allowed dirs
are scoped to Master Brain / English Curriculum 2026 / Downloads — the top-level Read/Write tools can't
reach ~/Downloads at all in this session, so Desktop Commander is the only path for verify+move.**

## CHUNK 3 — results

- W37 gift.png | ok | no oref, clean cream-wrapped gift box w/ gold ribbon, Q1 picked, no watermark
- W37 milk.png | ok | no oref, clean glass of milk, Q2 picked, no watermark
- W37 snake-loops-log.png | ok | no oref (per manifest), Q4 picked — clearly shows snake looped around
  log, chick perched on rope, skunk tail/head visible mid-pull, no watermark; full-res download turned
  out to be an even better composition (rope-pulling detail crisp) than the quad preview suggested
- W38 gate.png | ok | no oref, wrought-iron gate with latch + blank brass plate (no hallucinated text),
  warm glow beyond, Q1 picked, no watermark
- W38 snake-coloring.png | ok | no oref, flat black-line coloring page, cute snake coiled with cake
  slice, Q2 picked (boldest/cleanest linework), no watermark

**5/49 done at this checkpoint.**

- W39 kite-coloring.png | ok | no oref, flat black-line coloring page, Q1 picked, no watermark
- W39 kite.png | ok | no oref, Q3 picked (forest-green backdrop; Q2 had a non-conforming blue
  backdrop + a small hallucinated icon bottom-right corner, avoided), clean, no watermark
- W39 snake-coloring.png | ok | no oref, flat black-line coloring page, snake holding kite string w/
  small hand/arm (stylized artistic license), Q1 picked, no watermark
- W39 snake-holds-kite-string.png | ok | no oref (per manifest), Q2 picked — string trails from kite
  down past the head to a small curl at the tail-tip (reads as tail-held per the manifest, MJ's natural
  interpretation attaches the visible string line near the mouth first but the tail-tip curl confirms
  the connection), forest-green backdrop, clean, no watermark
- W39 vine.png | ok | no oref, clean curling leafy vine, Q1 picked, no watermark

**10/49 done at this checkpoint — Week 39 fully complete.**

- W40 dog-coloring.png | ok | RETRY #1 needed — oref=Week12/dog.png (8s-wait rule held, submitted
  clean) but ALL 4 quadrants came back with heavy pencil-hatching/crosshatch shading (violates "no
  shading" coloring-page rule); retried TEXT-ONLY (dropped oref) with a strengthened "FLAT vector...
  absolutely no shading/hatching/cross-hatching/gray-fill" prompt — result was clean flat cartoon line
  art (generic dog, not matching Week-12 likeness, acceptable for a coloring-page asset per established
  precedent that coloring pages don't carry cast-consistency), Q4 picked, no watermark
- W40 home-coloring.png | ok | no oref, cosy cottage w/ puppy-in-basket by the door, light shading
  (consistent with the pattern already accepted this run), Q4 picked, no watermark
- W40 nose.png | ok | no oref, clean foam-textured red clown nose, forest-green backdrop, Q2 picked,
  no watermark
- W40 rope.png | ok | no oref, coiled thick rope, Q1 picked, clean, no watermark
- W40 rose.png | ok | no oref, single red rose in bloom, Q1 picked, clean, no watermark

**15/49 done at this checkpoint — Week 40 fully complete.**

- W41 cubes-tune-v2.png | ok | no oref, mule w/ flute in mouth tapping glowing music-note cubes, no
  hands visible, Q2 picked, clean, no watermark
- W41 mule-concert-v2.png | ok | RETRY #1 needed — oref=Week47/sheep-star.png (8s-wait rule held,
  submitted clean) but the reference's STYLE bled into the whole composition: all 4 quadrants replaced
  the mule entirely with a sheep-plush-toy playing the flute (character swap, not just likeness
  influence) — unusable. Retried TEXT-ONLY (dropped oref) — clean result with mule/snake/sheep all
  correctly present and distinct, Q2 picked, no watermark. **NEW RULE: Omni Reference on a
  MULTI-CHARACTER composite scene risks the reference's species/style overtaking the whole scene, not
  just the intended character — for composite scenes prefer text-only unless the reference is tightly
  scoped to a single clearly-named character.**

**18/49 done at this checkpoint — Week 41 fully complete.**

- W42 huge-bridge-v2.png | ok | oref=Week47/sheep-star.png SKIPPED deliberately (same reference had just
  caused a full character-swap on the prior item) — went straight to TEXT-ONLY to save a retry cycle,
  clean result with all 4 cast members (sheep, snake, chick, dog) distinctly visible crossing the huge
  glowing bridge, Q3 picked, no watermark
- W43 snake-tail-v2.png | ok | no oref, snake with long tail stretched + curled tip beside train tracks,
  Q2 picked, clean, no watermark

**20/49 done at this checkpoint — Weeks 42+43 fully complete.**

- W44 bee.png | ok | CAST DEBUT — oref=Week44/bee-tree.png via Omni Reference, 8s-wait rule held, clean
  submission first try (single-character scene, no drift issue this time — the mule/sheep drift only
  hit multi-character composites). Result matched the established plump fuzzy gold-and-black Bee look
  exactly across all 4 quadrants, Q1 picked, no watermark. CRITICAL base cast asset for Bee — handled
  with extra care.
- W45 boat.png | ok | no oref, wooden rowboat at frozen lake edge, icy texture visible, Q1 picked,
  clean, no watermark
- W45 goat.png | ok | no oref, shaggy goat w/ visible steaming breath, forest-green backdrop, Q2
  picked, clean, no watermark
- W45 snow-growing-v2.png | ok | no oref, wide shot of goat dwarfed by a tall growing snowdrift, snow
  still falling, Q1 picked, clean, no watermark

**24/49 done at this checkpoint — Week 45 fully complete.**

- W46 bee-light.png | ok | oref=Week44/bee-tree.png via Omni Reference, 8s-wait rule held, clean
  submission first try (single-character scene again — no drift). Result matched established Bee look,
  delighted expression holding lantern, Q2 picked, clean, no watermark

**25/49 done at this checkpoint — Week 46 fully complete.**

- W47 car.png | ok | no oref, little dark car w/ round headlamps, beams sweeping forward, Q1 picked,
  clean, no watermark
- W47 park.png | ok | no oref, park bench under tree w/ lamppost at night, Q1 picked, clean, no
  watermark
- W47 star.png | ok | CAST DEBUT — oref=Week51/star-looking.png via Omni Reference, 8s-wait rule held,
  clean submission first try (single-character scene, no drift). Result matched established golden
  five-point Star look w/ serene sleepy face exactly, Q2 picked, no watermark. CRITICAL base cast asset
  for Star — handled with extra care.

**28/49 done at this checkpoint — Week 47 fully complete.**

- W48 corn.png | ok | no oref, golden ear of corn husk half-peeled, Q1 picked, clean, no watermark
- W48 fork.png | ok | no oref, wooden pitchfork upright in grass, Q2 picked, clean, no watermark
- W48 horse.png | ok | no oref (cast intro, not oref'd per manifest), gentle brown horse ears forward,
  Q2 picked, clean, no watermark

**31/49 done at this checkpoint — Week 48 fully complete.**

- W49 teacher.png | ok | no oref, wooden peg-doll teacher w/ kind smile holding small book, forest-green
  cloak, Q1 picked, clean, no watermark

**32/49 done at this checkpoint — Week 49 fully complete.**

- W50 bag.png | ok | no oref, simple cloth drawstring bag, Q2 picked, clean, no watermark
- W50 bug.png | ok | no oref, round red-shelled beetle top view, Q1 picked, clean, no watermark
- W50 pen.png | ok | no oref, blue ballpoint pen, Q1 picked, clean, no watermark
- W50 pin.png | ok | no oref, metal safety pin, Q2 picked, clean, no watermark
- W50 ship.png | ok | no oref, wooden sailing ship on dark glassy water, Q1 picked, clean, no watermark

**37/49 done at this checkpoint — Week 50 fully complete.**

- **[103-104] W51 moon.png, zoo.png** — DONE. moon.png: text-only, Q2 chosen (pale natural moon, dark forest-green sky, clean craters, no watermark) over Q1/Q3's cyan-tinted alt. zoo.png: text-only, Q1 chosen (clean ZOO archway sign, no animals cluttering the "single subject" framing) over Q2/Q3's variants with an animal walking through. Both direct-download to ~/Downloads, verified, moved. **39/49 done.**

- **[105-107] W52 cow.png, house.png, mouse.png** — DONE. All text-only, clean picks (dairy cow full-body side profile; mossy-roof cottage with lit window; grey mouse full-body with big ears). No watermarks. Downloads via direct-native (ls -t Downloads to locate, faster than full listing). **42/49 done.**

- **[108-110] W54 saw.png, W56 comb.png, W57 fish-wishing.png** — DONE. saw.png: text-only, Q1 (full blade+wooden handle, teeth visible), downloaded via CDN-tab JS-fetch method (new tab opened this time). comb.png: text-only retry needed (first submit silently failed — prompt box appeared empty/unsubmitted, screenshot still showed the prior saw job; re-typed+resubmitted successfully), Q2 clean symmetric wooden comb. fish-wishing.png: text-only, Q1 (eyes closed, bubbles rising like wishes, no watermark). All verified + moved. **45/49 done. 4 remain: W58 action.png, bee-reading.png (oref), section.png, segina-and-sam.png (oref, cast-fidelity critical — LAST item in the 49-item slice).**

- **[111-114] W58 action.png, bee-reading.png (oref), section.png, segina-and-sam.png (oref) — FINAL 4 ITEMS OF THE 49-ITEM SLICE, ALL DONE.**
  - action.png: text-only, Q1 (toy race car mid-drift, dust/speed lines, no watermark).
  - bee-reading.png: oref=Week44/bee-tree.png, single-character (low drift risk per the W41/W42 lesson), Q1 — clean plush bee perched on open book, one leg resting on page, matches cast likeness. Downloaded via CDN-tab JS-fetch (new tab opened).
  - section.png: text-only — first submit hit "Creation failed unexpectedly" (MJ-side transient error, not a rule violation), retried same prompt, succeeded 2nd try. Q1 — orange sliced into a clean star-pattern of sections on a plate, exact match.
  - segina-and-sam.png: oref=Week49/girl.png, LAST item of the 49-item slice + the entire 114-item video-critical list. Multi-character composite (girl + boy peg dolls) but SAME peg-doll "species"/style as the single-character oref, so the W41 cross-species drift risk didn't apply here — result was clean. Q1: girl with black pigtails + red dress + graduation cap, boy with dark hair + red shirt + graduation cap, both beaming, both clearly present (2/2 named cast members confirmed) — cast-fidelity check PASSED. No watermark.
  - Two UI gotchas hit this chunk: (1) when the Omni Reference panel is open, the prompt box grows to 2 lines and the submit icon MOVES from (983,43) to (1237,43) — a click at the old coordinate lands on text and silently fails to submit (caught + corrected both oref submissions this chunk); (2) after selecting a quadrant, the CDN detail panel is sometimes obscured behind the still-open reference panel — navigating fresh to /imagine cleanly resets the view without losing the completed job.
  - **49/49 DONE. Slice complete. The entire 114-item video-critical priority list (items 1-114 across Agents 1, 2, and 3) is now 100% generated, verified, and filed.**

## FINAL SUMMARY — Agent 3 session close

- **Completed: 49/49 items in the assigned slice (items 66-114 of GENERATE_MANIFEST.json, priority=video-critical, week-ascending). Zero FAILED items — every item succeeded within 1-2 attempts.**
- **Position: slice complete. Combined with Agents 1+2's items 1-65, all 114 video-critical items are now generated.**
- **Notable events this chunk:** the Omni Reference multi-character drift lesson from earlier in the session (W41/W42) was successfully applied as a judgment call on the final item (segina-and-sam.png) — recognized that a peg-doll-to-peg-doll oref (same "species"/style) carries much lower drift risk than the earlier plush-sheep-to-mule cross-species case, used oref as manifest specified, and got a clean cast-accurate result. One MJ-side transient "Creation failed unexpectedly" error (section.png, resolved on retry, not a systemic issue). Two submit-button mis-click near-misses when the reference panel was open (both caught via screenshot verification before moving on, not by chance).
- **Browser state: healthy, logged in, tabId 1325653553, deviceId continuity held throughout. No orphan tabs left open (CDN tabs closed after each JS-fetch download).**
- **What remains for Agent 4: NONE — the entire 114-item video-critical priority list is complete.** Any further MJ work would be against a different priority tier in GENERATE_MANIFEST.json (if one exists) or the next phase of the curriculum pipeline (image packs, video assembly, etc. — outside this run's scope).

# MJ REROLL RUN — Jul 14, 2026 (Reroll Agent 1)

**Run start:** continuing on browser deviceId 7d422c1a / tabId 1325653553, verified logged in.
**Source:** REROLL_MANIFEST.json — "video-critical" priority items, week-ascending, slice = items 1-30.
**Archive dir:** `English Curriculum 2026/_replaced_video_audit/Week NN/<filename>` (originals moved here
before every replacement).

## 🚨 NEW GOTCHA THIS RUN: "No Fast hours left"
Partway through item 2 (cat-landing.png), Fast-mode generation credits ran out (renews Aug 11, 2026).
**Fix: settings (sliders icon top-right of prompt box) → More Options → Speed → switch Fast→Relax.**
Relax mode is FREE (no purchase), just slower (~60-90s/job vs ~20-40s, queued). Did NOT purchase
anything (financial-action rule). **All items from #2 onward ran in Relax mode.** Future reroll/generate
agents: check Speed setting FIRST if jobs start silently failing — a "Submitting..." click that produces
no job and no error toast, with the search box finding zero results for prompt keywords, is the tell
(this cost ~3 wasted submit attempts before the "No Fast hours left" toast finally surfaced on a 4th).

## 🚨 NEW GOTCHA: download icon unreliable this session
The Imagine-panel download icon (top-right of full-res detail view) sometimes does nothing (no new tab,
no ~/Downloads file) even after 2 clicks + waits. **Reliable fallback used throughout:** read the job's
UUID from the URL bar / `img[src*=cdn.midjourney.com]` src, construct `https://cdn.midjourney.com/<uuid>/0_<idx>.png`
manually, `tabs_create_mcp` + `navigate` a fresh tab there, then same-origin JS-fetch+blob+anchor download
on THAT tab (`credentials:'include'`). Cross-origin fetch from the www.midjourney.com tab itself 403s/fails
(CORS) — must be done from a tab already on the cdn.midjourney.com origin.

## 🚨 NEW GOTCHA: Omni Reference can style-bleed onto a WHOLE scene, not just the referenced character
cat-on-sam.png (item 3): oref=sam.png (single peg-doll boy) turned the entire scene — including the CAT,
which sam.png contains no cat reference for — into a matching wood-carved-toy aesthetic (real tabby cat
became a painted wooden cat figurine). This is the same class of bug Agent 3 hit with mule-concert.png
(W41) and huge-bridge.png (W42), but this time triggered by a SINGLE-character oref on a two-subject
scene, not just multi-character composites. **Refined rule: any oref on a scene containing a second
subject NOT covered by the reference image (even a background animal/prop) risks that second subject
absorbing the reference's material/style.** Fix used: drop oref, describe the peg-doll boy's construction
explicitly in text ("plain painted wooden ball head... carved glossy brown wood hair... the cat is a
real furry animal not a carved toy") — worked cleanly on the text-only retry.

## CHUNK 1 — results (fast-path + real generations)
**Fast-path (6 items, no MJ generation — already-generated `-v2`/reuse assets from the GENERATE run copied
onto the flawed original filename after archiving):**
- W9 hat-on-ant.png ← hat-on-ant-v2.png (Agent 1's asset)
- W10 all-and-mat.png ← all-and-mat-v2.png (Agent 1's asset)
- W10 dad-and-ant.png ← dad-and-ant-v2.png (Agent 1's asset)
- W10 dad-sam-find.png ← dad-sam-find-v2.png (Agent 1's asset)
- W11 pot-cool.png ← pot-cool-v2.png (Agent 1's asset)
- W14 hen-on-dog.png ← hen-on-cat.png (Agent 2's asset — manifest explicitly says the fix IS the
  hen-on-cat.png content, wrong file/filename pairing was the original bug)

**Real MJ generations:**
- W3 potato-on-mat.png | ok | oref=Week49/girl.png, clean first try, Q2 picked (potatoes visible both
  edges, girl matches canonical pigtails/red-dress design)
- W4 cat-landing.png | ok | RETRY ×2 needed — first 2 oref submissions silently failed due to the Fast-hours
  exhaustion (see gotcha above); 3rd attempt (text-only, post Relax-mode switch) succeeded, Q4 picked
  (cat mid-descent onto mat, paws splayed, wide eyes — strong match)
- W5 cat-on-sam.png | ok | RETRY ×2 needed — 1st oref submission silently failed (pre-Relax), 2nd oref
  submission (post-Relax) succeeded but caused a style-bleed (cat rendered as a carved wooden toy, see
  gotcha above), 3rd attempt (text-only, explicit "real furry animal not a carved toy" + explicit
  peg-doll head construction) succeeded cleanly, Q4 picked (wood peg-doll head w/ wood-grain hair, real
  smug tabby cat, paws crossed)

**9/30 done at this checkpoint.** Remaining in this agent's slice: W5 potato-mat-sam.png, sam-cat-mat.png,
sam-cat-sat.png, sam-on-cat.png · W6 ant-pops-up.png · W7 cat-naps-through.png · W8 cat-command3.png ·
W9 hat-on-cat.png/hat-on-sam.png/hat-still.png/hat.png/potato-hat.png (5, felt-fedora consistency set) ·
W10 potato-dad.png · W12 potato-in-pit.png · W13 big-dog-and-pig/hiding/meets-cat/potato-and-big-dog.png
(4, oref=Week13/big-dog-towering.png per Agent 3's established precedent, NOT Week12/dog.png) · W16
cast-summit-party.png. All originals for these are already archived to `_replaced_video_audit/`.
**Relax mode is the standing state for the rest of this run — every remaining job will take ~60-90s.**

- W5 potato-mat-sam.png | ok | text-only, same explicit-construction-language pattern as cat-on-sam.png
  (peg-doll boy wood-grain hair, potatoes as real vegetables not toys), Q-pick clean, no watermark
- W5 sam-cat-mat.png | ok | text-only, same pattern, real furry cat + peg-doll boy both correctly
  rendered on the woven mat, no style bleed, no watermark
- W5 sam-cat-sat.png | ok | text-only, same pattern, clean, no watermark
- W5 sam-on-cat.png | ok | text-only, same pattern (boy standing near/beside the cat, NOT sitting on
  it — read literally per manifest), clean, no watermark
- W6 ant-pops-up.png | ok | text-only, explicit-construction-language extended to a THIRD subject type
  (tiny real ant, not a toy/cartoon ant) alongside the peg-doll boy — pattern held for a non-cat second
  subject too, clean, no watermark

**14/30 done at this checkpoint — the explicit-construction-language text-only pattern is now proven
across cat, ant, and multi-peg-doll scenes; established as the default for any multi-subject item in the
remaining slice unless a single-subject oref is clearly safe (cast-debut/continuity assets only).**

- W7 cat-naps-through.png | ok | text-only (own-constructed prompt — manifest only had a generic
  cast-drift template, no concrete scene description), sleeping real tabby cat + peg-doll boy
  standing separately on a woven mat, Q2 picked (0_1, sleeping cat curled + boy standing beside,
  clean fur texture, no style bleed), no watermark
- W8 cat-command3.png | ok | RETRY ×1 needed — first oref (Week04/cat.png) submission silently failed
  (no job created, confirmed via search returning zero results — same silent-fail class as the earlier
  Fast-hours issue, but Fast/Relax was already correctly set to Relax at this point, cause unclear,
  possibly a one-off queue drop); re-submitted identical oref+prompt, succeeded cleanly on retry (49%→
  84%→100% tracked). Original flawed image had Sam (wrong yarn-hair design) + an ant, no cat, pointing
  hand — recomposed to match the two existing W8 cat-command.png/cat-command2.png series assets (hand
  pointing at a real cat on a woven mat, forest-green blurred backdrop) instead of literally re-adding
  the "cat is absent" element from the issue text, since the series precedent makes clear the intended
  subject is the CAT, not Sam. Q1 (0_0) picked, real fur, no watermark, matches series style well.

**16/30 done at this checkpoint.**

## W9 felt-fedora consistency set (items 12-16 of the 30-item slice)
Manifest listed 5 filenames needing the SAME brown felt fedora (hat-on-cat.png, hat-on-sam.png,
hat-still.png, potato-hat.png, AND hat.png itself). **Judgment call: hat.png was never archived and its
own manifest entry's mj_prompt text is entirely about making the OTHER 4 match IT** ("reroll hat-on-cat,
hat-on-sam, hat-still and potato-hat to all feature the same brown felt fedora shown in hat.png") — this
confirms hat.png is the correct existing canonical reference, not itself flawed. SKIPPED regenerating
hat.png; used its exact look (brown felt, wide brim, dark brown leather band w/ stitching) as a locked
text description reused verbatim across all 4 real fixes below, since Omni Reference targets character
likeness, not props — a text-locked description was more reliable for prop consistency than oref.

- W9 hat-on-cat.png | ok | RETRY ×1 needed (1st oref=cat.png submission silently failed, confirmed via
  search; 2nd oref=cat.png submission on retry succeeded cleanly, 49%→84%→100% tracked). Real cat wearing
  the brown felt fedora, close-up, Q1 picked, no watermark, strong match to the locked hat description.
- W9 hat-on-sam.png | ok | RETRY ×2 needed — both oref=sam.png submissions silently failed (confirmed via
  search both times); per the 2-attempt rule dropped oref, went text-only with explicit peg-doll
  construction language + the locked hat description, succeeded cleanly on the 3rd attempt. Q1 picked
  (toy-style face rendering rather than the flatter minimalist peg-doll look, but correctly in blue
  dungarees wearing the right fedora — accepted, the hat-consistency fix is what mattered here), no
  watermark.
- W9 hat-still.png | ok | text-only (multi-character: cat + boy + girl — established rule for scenes with
  a subject not covered by a single oref), clean submission first try. Q1 picked: hat on floor with the
  tiny "muffled squiggle" wisp, all 3 characters (real cat, peg-doll boy, peg-doll girl w/ black pigtails
  + red dress) leaning in curious, no watermark.
- W9 potato-hat.png | ok | text-only, clean submission first try. Q1 picked: sad droopy potato wearing the
  fedora + tiny real ant beside it looking up, no watermark.

**20/30 done at this checkpoint — Week 9's felt-fedora consistency set is fully complete (5/5: hat.png
kept as canonical + 4 regenerated to match; hat-on-ant.png was already fast-pathed earlier in this run).**

- W10 potato-dad.png | ok | oref=Week10/dad.png, clean submission first try. Dad correctly grew his
  established bushy brown beard + mustache + green cap; potato beside him also has a green cap for
  visual consistency, no watermark.
- W12 potato-in-pit.png | ok | RETRY ×1 needed — 1st oref=Week12/dog.png submission silently failed
  (confirmed via search); per the 2-attempt rule dropped oref, went text-only with explicit terrier
  description — this one ALSO landed (both the failed-looking oref job and the text-only retry turned
  out to have actually queued; the /imagine feed view was just slow to surface them — lesson: a
  "silent fail" isn't always real, always double-check via search before assuming total loss). Both
  completed jobs shared the SAME misattribution flaw across most quadrants — MJ kept putting the round
  wire glasses on the DOG instead of the potato. Q1 of the text-only job was the one quadrant where the
  potato correctly wears its own glasses (dog also grew a duplicate pair, accepted as a minor mirroring
  artifact, not disqualifying), no watermark.

**22/30 done at this checkpoint.**

## REROLL RECONCILIATION — Jul 14 evening (Fable + Sonnet orphans)
91/93 video-critical rerolls FILED: original archived to _replaced_video_audit/Week NN/, Tredoux's
pick renamed to canonical filename in Week NN/images/. 67 filed by (orphaned) Sonnet agents, 24
disambiguated visually + filed by Fable. Spot-checks clean. Match table: RECONCILE_MATCH_JUL14.json;
Fable's filing report: RECONCILE_REPORT_FABLE.json.
MISSING (no download existed — regenerate + pick): #32 W22 dog-vet.png · #87 W56 lamb-knot.png.
Duplicates left unused in ~/Downloads (re-picks): hero-fedora d83c9273, potato-fedora 35712179,
graduation 4881cfbf. Staging dirs cleaned. NO VIDEOS RENDERED.

## Jul 15 00:12 — RE-PICKS FILED (tandem)
- #32 W22 dog-vet.png: re-pick filed (cone collar + vet table, verified). Prior pick archived as _replaced_video_audit/Week 22/dog-vet.repick1.png
- #87 W56 lamb-knot.png: re-pick filed (white curly-fleece lamb, rocky slope, knot, verified). Prior pick archived as _replaced_video_audit/Week 56/lamb-knot.repick1.png

## Jul 15 — ALIAS PASS + 2 SAMPLE RENDERS (Tredoux go)
- Alias-mapping pass vs VIDEO_COVERAGE_AUDIT_JUL14.md: 24 new week-scoped aliases merged into scripts/mvgen/curriculum-video-aliases.json (weeks 05,08,10,11,12,14,15,22,26,30,36,38,52,55,56,58). Verified by scripts/curriculum/verify-alias-pass-jul15.py: PASS, 34 gap lines newly phrase-covered, 0 regressions, 0 collisions. Un-aliasable gaps (no suitable image) noted in the JSON _comment_jul15.
- Sample renders (Tredoux explicit go, W22+W56 word songs): W22 The Vet 10/11 matched, 15 anchors, 91%, no self-flags. W56 The Lamb Can Climb 10/11 matched, 14 anchors, 91%, no self-flags. Outputs in ~/Desktop/Music Videos/. No other renders.

## Jul 15 pt2 — FLEET GARBLE INCIDENT + APPROX-RUN GUARD (engine fix) + SECTION-BY-SECTION RESTART
- INCIDENT: full-fleet renders looked garbled (subs out of sync + wrong/random images) on stutter-heavy
  songs. NOT a fleet-condition bug — deterministic pipeline; root cause = whisper largely fails on
  kids-chant stutter lyrics → 46-77% of words "approx" (evenly distributed guesses) → subs drift +
  anchors fire at guessed times. The 4 certification samples + 2 Jul-15 samples were all low-approx
  (2-26%) word songs, so the class was never exercised.
- FIX (Opus build, Sonnet fresh-eyes SHIP, 126/126 tests): long approx runs (≥5 words or ≥6s) render
  subtitle-free AND cannot host image anchors (cadence fillers instead); short runs keep RMS-gated
  behavior. shot_report gains approx_pct / suppressed_spans / quality_flags (>60% self-flags).
  WARN-1 follow-up applied: server.py /api/plan now mirrors the anchor gate (needs daemon restart to
  take effect in the planner; renders spawn fresh subprocesses so they're already on new code).
- Stale test drift fixed: test_fix3b_alias_file_loads now expects the anchor-first W04 aliases.
- 59 fleet jobs cancelled; 55 garbled outputs → `Music Videos/_scrapped_fleet_jul15/` (W22 + W56
  samples kept). Verified fixed W06 (77% approx) renders clean steady art in suppressed spans.
- RESTART: section-by-section on Tredoux's order. Section 1 = W01-W10 (19 videos), serial --wait,
  log /tmp/section1_jul15.log, per-video verification table before Tredoux review.
