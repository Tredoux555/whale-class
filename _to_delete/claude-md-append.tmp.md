## Montree Phonics (renamed from Dark Phonics — Jul 28, 2026)

Full handoff: `docs/curriculum/montree-phonics/HANDOFF_MONTREE_PHONICS_Jul28.md`

- **Rename**: product is now "Montree Phonics" (was "Dark Phonics") on all
  new user-facing surfaces (letter cards, page copy). The Supabase bucket
  stays named `dark-phonics` — infra name only, do not rename it.
- **Song uploads**: SATPIN page song slots are real drop-zones now, backed
  by `app/api/montree/satpin-media/route.ts`. `GET` → `{songs: {slug:
  publicUrl}}`. `POST` multipart `{slug, file}` → stored to
  `dark-phonics` bucket at `satpin-songs/<slug>-<timestamp>.<ext>` (flat
  layout, latest timestamp wins, older copies best-effort deleted). Rate
  limit 10/15min per IP, 25MB cap, audio-only, slug allow-list = the 27
  series slugs. Legacy `public/satpin-materials/<slug>/song.mp3` still
  plays but an uploaded song wins.
- **Decodable ledger** (`app/montree/library/satpin/page.tsx`): each week
  block (weeks 3–27, plus the ck sound-only block) shows cumulative
  decodable words (new = red chip, earlier = muted, newest-first) and a
  heart-words chain. Weeks 1–2 show "none yet · sounds only". **Books are
  source of truth** — word lists come from
  `scripts/curriculum/flashcards/books_def.py` (weeks 3–6) and
  `scripts/curriculum/dark-phonics-readers/book07.py`–`book27.py` (weeks
  7–27). If a book's word list changes, update the page's
  `decodable`/`heartWords` manifest fields to match or the ledger drifts.
- **Book decodable-closing field**: `build_booklets.py`'s `page_words`
  (sound-mode branch) now takes an optional `decodable` field alongside
  the existing `heart` field — any initial-sound book script can add a
  "YOU CAN NOW READ: ..." + heart-word closing section this way. Used in
  `bookP.py` for the s-a-t-p gate (`at · sat · pat · tap · sap · spat`,
  heart word `a`).
- **Letter cards**: 27 cards (s a t p i n m d g o c k ck e u r h b f l j v
  w x y z qu), 1920×1080 PNG, "Inked Hush" style — cream bg, house-red
  `#c62828` monumental lowercase letter, Lora-Italic "X says /x/" aside,
  tracked MONTREE PHONICS masthead, red printer's dot, `WEEK N` foot.
  Generator: `make_cards.py`, using fonts from
  `/root/.claude/skills/canvas-design/canvas-fonts/` (same folder
  `build_booklets.py` uses — available in Cowork cloud sessions). Fixed
  baselines across the series, only the letter/week number change.
  Uploaded to bucket at `dark-phonics/letter-cards/letter-card-NN-<slug>.png`;
  full zip (PNGs + generator + design notes) at
  `phonics-images/satpin-v2/letter-cards.zip`. These are the standard
  opening shot of every phonics song video.
- **mvgen forced-alignment (critical)**: word-sync quality depends on the
  stable-ts align venv at `~/mvgen-models/align-venv/bin/python` (or
  `$MVGEN_ALIGN_PYTHON` / `$MVGEN_ALIGN_VENV`). If missing, `analyze.py`
  silently falls back to whisper-transcription timing and the video can
  end up badly out of sync (first letter-P render: only 62/196 words got
  real timings). **Always check the log for `FORCED-ALIGN: <N> aligned
  words`** before shipping — `FORCED-ALIGN: align venv python not found ->
  transcription fallback` means don't ship it.
  Setup recipe, in this exact order (torch/torchaudio must be installed as
  a matched pair *before* stable-ts, or plain `pip install stable-ts`
  drags in torch 2.13.0+cpu against a stale torchaudio 2.11.0 and breaks
  torchaudio's `.so` import):
  ```
  pip install librosa soundfile faster-whisper --break-system-packages
  python3 -m venv /root/mvgen-models/align-venv
  /root/mvgen-models/align-venv/bin/pip install torch==2.11.0 torchaudio==2.11.0 \
    --index-url https://download.pytorch.org/whl/cpu
  /root/mvgen-models/align-venv/bin/pip install stable-ts
  ```
  `align_worker.py` must sit next to `analyze.py` in `scripts/mvgen`.
- **Image/card conventions for song videos**: lyrics `.txt` = ground truth,
  sung lines only, no section tags. Images named after the sung keyword
  (`05-pig.png` on screen when "pig" is sung) — filename-to-lyric matching
  depends on this. Opening letter card is named `00-<phoneme>.png` (e.g.
  `00-puh.png` for P) so it anchors the opening phoneme sound and holds
  through the intro until the beat drops — reuse this pattern for all 26
  remaining letter videos.
- **Letter-P video shipped**: `letter-p-pig-pen-pencil-v3.mp4` in bucket at
  `dark-phonics/videos/` (public), 196/196 force-aligned. Out-of-sync v1
  and old-masthead v2 deleted from bucket.
  `dark-phonics/videos/lesson-08.mp4` (unrelated original lesson video,
  not the song) was deliberately left untouched.
- **Deploy status**: satpin page, satpin-media API route, and rebuilt
  letter-P PDFs are working-tree-only on the Mac as of Jul 28 — NOT
  committed or deployed. Decodable ledger, song uploads, and the P-song
  slot are invisible on montree.xyz until commit + push + deploy.
- **Next up**: with the align-venv recipe and naming conventions proven on
  letter P, the remaining 26 letter videos are a batch production run
  (song + lyrics + keyword images + `00-<phoneme>.png` letter card per
  letter), not R&D.
- Harmless leftover: `tsconfig.satpin-check.tmp.json` in repo root
  (scoped typecheck, device bridge couldn't delete it) — delete anytime.
