# Montree Marketing Video Campaign — Handoff

Active workstream. This is the **video marketing** campaign — distinct from the
email "Campaign Manager / Outreach Protocol" in CLAUDE.md (that's school email
outreach; this is social-media video).

---

## What it is

A 13-video marketing campaign for Montree: **1 front-page hero + 12 feature
videos**, rolled out across TikTok, Instagram Reels, YouTube Shorts and
LinkedIn.

---

## Decisions locked (do NOT re-debate)

- **Tool:** Colossyan Creator (app.colossyan.com). Replaced HeyGen.
- **Production:** a browser-Claude (Claude in Chrome) drives Colossyan, one
  video at a time, from the scripts doc.
- **Format:** talking-head — one avatar speaking, clean consistent background,
  on-screen text for key lines. **No B-roll** (no app footage exists; talking-
  head is what Colossyan does best).
- **Avatar/voice:** the default Colossyan avatar + "GB - Riley" voice. Same for
  all 13 — consistency is the brand.
- **Voice/tone:** brand/presenter, direct "you" address. NOT founder "I" voice.
- **Length:** hero ~65s, 16:9. Feature videos ~22-26s, 9:16 vertical.
- **Trial offer in copy:** 7 days free, AI covered by Montree.
- **No AI agent in super-admin** — decided not worth the API cost for a solo
  operator (the super-admin Guru was already retired). The Campaign Command
  Center is a plain tool, not an AI.
- **Algorithm research:** TikTok/Reels/Shorts all reward completion rate +
  shares; never cross-post the same file — each platform suppresses recycled
  video, so export natively per platform.

---

## What's built (committed + pushed to main)

- **Campaign Command Center** — super-admin "📣 Campaign" tab. The video-rollout
  war room: next-up push card, progress bar, status pipeline, list + calendar
  views. Files: `migrations/231_campaign_command_center.sql`,
  `app/api/montree/super-admin/campaign/route.ts`,
  `components/montree/super-admin/CampaignTab.tsx`,
  `app/montree/super-admin/page.tsx`. Commit `846982e1`.
- 🚨 **Migration 231 — PENDING the user's Supabase run.** Until run, the
  Campaign tab shows a "run migration 231" banner. The migration creates
  `montree_campaign_items` AND seeds all 13 videos.

---

## The scripts

- **All 13 scripts:** `Montree_Campaign_Video_Scripts.md` (repo root) —
  Colossyan-ready, talking-head format. Each video = a narration block
  (one paragraph = one Colossyan scene) + an on-screen-text table.
- **Section 2 of that doc = the standing browser-Claude brief.**
- Front-page *text* (separate artifact, not the video): `Montree_Intro_Script.md`.

---

## Status

- **Hero (Video 1):** script APPROVED. Web-Claude handover ready. NOT yet built
  in Colossyan.
- **Videos 2-13:** scripted, ready. Not built.
- Colossyan account is on a **free trial** — generating/exporting may be gated.
  Web-Claude is instructed never to sign up or enter payment; it reports back
  if blocked.

---

## How to make a video

Hand the browser-Claude: **section 2 of `Montree_Campaign_Video_Scripts.md`
(the brief) + the target video's section.** That's a complete handover — it
builds the video in Colossyan.

---

## Next steps

1. Run `migrations/231_campaign_command_center.sql` in Supabase.
2. Build the hero in Colossyan via web-Claude. Check it; confirm whether the
   trial blocks export (decides if a paid Colossyan plan is needed).
3. Build videos 2-13, one at a time, down the list.
4. **Phase 4** — agent campaign tool: mirror the Command Center on the agents
   page so agents run their own promotion.
5. **Phase 5** — Mira wiring: Mira coaches agents on the rollout (sequencing,
   native-export reminders, posting windows).
6. Rollout cadence (~1 video per platform per week) tracked in the Command
   Center's scheduled-date field + calendar view.

---

## Housekeeping

- `AGORA_SUSPENSION_HANDOFF.md` is untracked in the repo — not part of this
  work; the user should commit or delete it.
- A stale `.git/index.lock` has appeared more than once — clear it before
  commits (`rm -f .git/index.lock`).
