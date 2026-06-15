# Cost-Cut + Marketing Pivot — Jun 14, 2026 (Cowork)

## Why this exists
Tredoux is a solo founder running Montree (Montessori SaaS) **and** building a phonics
system. The marketing-video toolchain (Midjourney → Kaiber → HeyGen → ElevenLabs) was
costing serious money every month and **not** producing the result he wanted — AI video
kept warping logos/screen text, and the cinematic-AI approach is the wrong tool for selling
a software product. Decision: **kill the Frankenstein pipeline, cut/downgrade the subs, and
switch to a lean, near-free marketing approach.**

## The subscription decisions

| Service | For | Verdict | Est. save/mo | Manage / cancel |
|---|---|---|---|---|
| Kaiber | AI video/animation | **CANCEL** | ~$20–25 | kaiber.ai → profile → Manage Subscription |
| HeyGen | AI avatar video | **CANCEL / → Free** | ~$24–89 | app.heygen.com/settings → Subscriptions |
| Colossyan (if active) | AI avatar video | **CANCEL** | ~$28–70 | app.colossyan.com → Workspace → Billing |
| ElevenLabs | AI voiceover | **DOWNGRADE → Free/$5** | up to ~$95 | elevenlabs.io/app/subscription |
| Midjourney | AI image art | **DOWNGRADE → Basic $10 / pause** | ~$20–50 | midjourney.com/account |
| InVideo | AI video | **CONFIRM CANCELLED** (refund dispute) | ~$30+ | ai.invideo.io → settings → billing |
| Claude (Anthropic) | Cowork + Claude | **DOWNGRADE to lowest tier that runs Cowork** (don't full-cancel) | ~$80–180 | claude.ai/settings/billing |
| Railway / Supabase / Stripe / Resend / GitHub | Production infra | **KEEP — load-bearing** | — | — |

**Realistic total recovered: ~$150–400/month.**

> ⚠️ **App Store billing:** several of these may bill through Apple, not the website.
> Those can ONLY be cancelled in iPhone → Settings → [name] → Subscriptions (or Mac App
> Store → Account). Check that list — it shows every Apple-billed sub in one place.

> ⚠️ Gmail connector was erroring during this session, so the receipt auto-inventory
> couldn't run. The list above is from the working context, not a full statement audit.
> Verify against the card statement + Apple Subscriptions for anything forgotten.

## The new lean marketing approach (replaces MJ + Kaiber + HeyGen)
For a software product, what converts is clarity + authenticity, not cinematic AI b-roll:
- **Real screen recordings of the live app** = the hero footage (snap photo → AI writes the
  report). Free. It's the actual magic.
- **Brand cards / kinetic text / end card / lower-thirds** = generated deterministically with
  code (PIL/SVG). Perfect, no warping, free, editable forever. (Already produced:
  `montree/_video_assets/` — laptop scene, wood end card, both end-card orientations,
  product screen.)
- **Voice** = own voice on a phone, or ElevenLabs lowest tier.
- **Human moment** = film self on phone (20s) instead of a HeyGen avatar — more trust with
  Montessori parents.
- **Assembly** = CapCut (free, already installed).

Net stack: **1 paid tool, maybe zero** — down from five.

## Phonics system — does it really need Midjourney?
Most phonics/educational animation (letter formation, mouth shapes, sound drills,
word-building, decodable-reader visuals) can be generated with code — clean, consistent,
free, no credits. Precedent: the mouth-shape SVG diagrams already shipped in the reading
content (`public/whale-reading-content.html` / `language-area-lessons.html`). Keep a cheap
Midjourney tier ONLY if actively producing illustration at volume; otherwise the
"I need an animator + Midjourney" problem largely dissolves.

## ✅ FINAL OUTCOMES — executed Jun 14, 2026
- [x] **Kaiber — CANCELLED** (the credit-burning animation tool, the main frustration)
- [x] **HeyGen — CANCELLED**
- [x] **Claude — DOWNGRADED** (kept lowest tier that still runs Cowork)
- [x] **InVideo** — already cancelled long ago via support (refund dispute still ongoing)
- [x] **Colossyan** — no active subscription (no billing info on file)
- [x] **Midjourney — KEPT** (cheap + actively used for art — Tredoux's call)
- [x] **ElevenLabs — KEPT** (reasonable + useful)
- [x] **Railway / Supabase / Stripe / Resend / GitHub — KEPT** (load-bearing)

Net result: cut Kaiber + HeyGen + Claude tier; kept the two genuinely useful cheap tools
(Midjourney, ElevenLabs). Bleed largely stopped.

## Assets already produced this session (keep)
`montree/_video_assets/`:
- `scene14_laptop_BRANDED.png` — laptop in golden-hour classroom showing the real Montree
  brand screen (rebuilt as a real glossy display: rounded glass, sun reflection, glowing
  gold mark, light spill).
- `scene15_endcard_wood.png` — warm gold-on-wood end card.
- `Montree_EndCard_16x9.png` / `Montree_EndCard_9x16.png` — forest-green end cards.
- `Montree_Product_Screen.png` — dashboard (demo kids, privacy-safe).
