# START HERE — Montree Daily Outreach Sweep (fresh-chat resume file)
_Last updated: 2026-07-22 (Beijing). This is the one-paste entry point. Read it, then run the cycle._

## 0. Connect the folder first
This must be an **on-computer** chat with the montree repo connected:
`Desktop/Master Brain/ACTIVE/montree`. If it isn't, click **Add folder** and pick it.
On-computer is required so Gmail, the CLI, and Chrome all work.

## 1. Read these, in order (the RUNBOOK wins on any conflict)
1. `docs/outreach/MASTER_OUTREACH_RUNBOOK_JUL17.md` — canonical: Templates A/B, FU1/FU2, the
   3-touch law, the 8 IG skeletons, and the daily cycle.
2. `docs/outreach/PARTNERS_TRACKER.md` — Foundation partners + hot leads (carries live demo dates).
3. `docs/outreach/BLACKLIST.md` — do-not-contact. Check before every draft.
4. Newest `docs/outreach/social/SOCIAL_QUEUE_*.md` — where the social run left off.
5. Newest `docs/outreach/campaign-log/*.md` — what the last run did.

## 2. Tools you need
- **Gmail** (`create_draft` / `search_threads`) — drafts only, NEVER auto-send.
- **Desktop Commander** → the CLI (runs on this Mac):
  `cd ~/Desktop/Master\ Brain/ACTIVE/montree && python3 scripts/outreach-status.py {counts|find|set-status|set-social}`
- **Chrome** — the IG/FB tandem (you preload, Tredoux clicks).

## 3. The daily cycle (runbook §4)
1. **Gmail sweep** — replies (draft in Tredoux's voice; polite-decline non-fits) + bounces (flip via CLI).
2. **Follow-ups due** — 7d → FU1, 14d → FU2. 3-touch law: cold + FU1 + FU2, then `dead`. English only.
3. **Cold drafts to fill 50/day** — high-value (Template A) + underprivileged Montessori-only (Template B,
   from `underprivileged/UNDERPRIV_MONTESSORI_ONLY_JUL17.csv`). Dedup EVERY address: `to:FULL-ADDRESS in:sent`.
4. **Social queue** — next ~20 IG (rotate the 8 skeletons, NEVER name the school) + ~30 FB follows →
   write `docs/outreach/social/SOCIAL_QUEUE_<date>.md`.
5. **Status flips** via `scripts/outreach-status.py` (never the browser) + a morning report.

Then Tredoux says **"go"** → supervised send: Gmail batch-send (fix any google.com/url link back to bare
montree.xyz), IG round (≤20–25, check thread history first), FB follows (≤30–40), flips + log.

## 4. Hard rules
- Drafts only. Never auto-send. Stop on any platform pushback.
- Subject always `Montree`, plain text, bare `montree.xyz` link. **No selling, no explaining.**
- Montessori-fit only. Free-for-life offer **FROZEN** (Foundation = Tredoux's hand only).
- Status flips ONLY via the CLI. The DB (`montree_outreach_contacts`) is the one master list; CSVs are archives.

## 5. Where "where we left off" lives
- Pipeline truth: super-admin → 🌍 Global Outreach tab, or `outreach-status.py counts`.
- Partners + demo dates: `PARTNERS_TRACKER.md`.  ·  Social progress: newest `social/SOCIAL_QUEUE_*.md`.
- Each day's log: `campaign-log/YYYY-MM-DD.md`.

## 6. Paste this into a fresh chat to start
> Run today's Montree outreach sweep. The montree repo is connected at Desktop/Master Brain/ACTIVE/montree —
> read docs/outreach/START_HERE_DAILY_SWEEP.md and follow it: Gmail reply/bounce sweep, follow-ups due,
> draft up to 50 cold emails (Template A high-value + Template B underprivileged, dedup each address in Gmail
> first), assemble today's social queue file, flip statuses via the CLI, and give me a morning report.
> Drafts only — don't send anything.
