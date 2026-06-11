# Handoff — Social Posting Drills (2026-06-07)

Pushed to `main` (commit `4db00978`), Railway auto-deploying. Content-only; no code/DB changes.

## The two drills (both live, both cross-linked)

| Drill | URL | Covers | Platforms |
|---|---|---|---|
| **Montree explainer videos** | montree.xyz/playbook.html | 11 videos: main-explainer, smart-capture, weekly-reports, guru, astra, curriculum, communication, voice-onboarding, appointments, library, multilingual (the set on /montree/explainer) | **6** — IG, FB, TikTok, X, **LinkedIn**, YouTube |
| **Phonics songs** | montree.xyz/playbook-phonics.html | 49 Dark Phonics sound-songs (per-song title table from the catch phrases) | **5** — YouTube, TikTok, IG, FB, **LinkedIn** |

Each page has a banner at the top pointing to the other, so WebClaude lands on either and routes by what you say.

## What changed today

- **LinkedIn locked into both drills.** It was already in the explainer drill (Step A + all 8 original videos); now it's also on the 3 new explainer videos, and **added to the phonics drill** (5th upload tab + an educator-framed hashtag bank — "a phonics song your class will actually sing back").
- **3 explainer videos added** that weren't in the drill before — main-explainer, smart-capture, weekly-reports — each with caption + hashtags for all 6 platforms and YouTube title/description/tags, matching the explainer-page framing.
- **Single-source guarantee:** the explainer drill is generated from one markdown source into all three surfaces — `docs/MONTREE_SOCIAL_PLAYBOOK.md` (committed), `components/montree/super-admin/playbook.json` (the 🎬 super-admin Playbook tab), and `public/playbook.html` (what WebClaude reads). They are byte-identical in content, so they can't drift.

## Audit (all green)

docs md == playbook.json == playbook.html content · LinkedIn in both Step A lists + every explainer video · 0 `[SIGNUP]` placeholders (all CTAs → https://montree.xyz, 69 of them) · cross-links both ways · 49-song phonics table intact · both pages well-formed.

## How to use

In WebClaude: *"We're posting Montree explainer videos — astra. You know the drill."* (or *"phonics songs — lesson 8"*). It reads the right page, opens the upload tabs (incl. LinkedIn), fills title + hashtags + SEO, and stops at each review screen. You drop the video in and hit Post. For phonics you write the description; WebClaude does title/hashtags/tags.

## ⚠️ Still pending (you asked for this — not done yet)

**Persistent claude.ai Project** so a bare "you know the drill" works without pasting a URL each session. You chose "set up a Project via the browser." I haven't done that yet — it touches your claude.ai account and you were mid-posting, so I left your browser alone. Say the word and I'll set up a "Montree Social" Project (or claude.ai custom instructions) that auto-points every chat at the playbooks. Until then, open each WebClaude session with: *"Read montree.xyz/playbook.html (or /playbook-phonics.html) and follow it."*
